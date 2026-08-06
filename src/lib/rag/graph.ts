import { createClient } from '@/lib/supabase/server';
import { retrieveChunks } from './retriever';
import { selectModel } from './model-router';
import { openRouterStream } from '@/lib/openrouter/client';
import { SourceCitation } from '@/types';
import { generateSingleEmbedding } from './embeddings';

export interface RAGInput {
  query: string;
  sessionId?: string;
  visitorId: string;
  history?: { role: string; content: string }[];
}

export async function executeRAGWorkflow(
  input: RAGInput,
  onChunk: (chunkText: string) => void,
  onSourcesReady?: (sources: SourceCitation[], model: string) => void
): Promise<{ answer: string; model: string; sources: SourceCitation[] }> {
  const startTime = Date.now();
  const supabase = await createClient();

  // Sanitize the user query to prevent basic prompt injection
  const sanitizedQuery = input.query.replace(/[\u0000-\u001F\u007F-\u009F]/g, "").trim();

  // 1. Generate Embedding for Caching & Retrieval
  const queryEmbedding = await generateSingleEmbedding(sanitizedQuery);
  const crypto = require('crypto');
  const queryHash = crypto.createHash('sha256').update(sanitizedQuery.toLowerCase()).digest('hex');

  // 2. Semantic Cache Lookup (Hit threshold > 0.95 similarity)
  const { data: cacheHit } = await supabase.rpc('match_cache', {
    query_embedding: queryEmbedding,
    match_threshold: 0.95
  });

  if (cacheHit && cacheHit.length > 0) {
    const cache = cacheHit[0];
    onChunk(cache.answer);
    if (onSourcesReady) {
      onSourcesReady(cache.sources || [], cache.model + ' (cached)');
    }

    // Update hit count asynchronously
    supabase.from('query_cache')
      .select('hit_count')
      .eq('id', cache.id)
      .single()
      .then(({ data }) => {
        if (data) {
          supabase.from('query_cache').update({ hit_count: data.hit_count + 1 }).eq('id', cache.id).then();
        }
      });

    return { answer: cache.answer, model: cache.model + ' (cached)', sources: cache.sources || [] };
  }

  // 3. Retrieve relevant vector chunks (Hybrid Search)
  const { chunks, citations } = await retrieveChunks(sanitizedQuery, 0.5, 5, queryEmbedding);

  // 4. Select optimal OpenRouter model
  const selectedModel = selectModel(sanitizedQuery, chunks);

  if (onSourcesReady) {
    onSourcesReady(citations, selectedModel);
  }

  let finalAnswer = '';

  // 5. Fallback if no relevant documents retrieved
  if (chunks.length === 0) {
    finalAnswer = "I don't have enough information in the provided company documents to answer your question accurately.";
    onChunk(finalAnswer);

    await supabase.from('query_logs').insert({
      session_id: input.sessionId,
      query: sanitizedQuery,
      answer: finalAnswer,
      model: selectedModel,
      sources_count: 0,
      status: 'unanswered',
      latency_ms: Date.now() - startTime,
    });

    return { answer: finalAnswer, model: selectedModel, sources: [] };
  }

  // 6. Construct context prompt with traceable claims constraints
  const contextText = chunks
    .map((c, i) => `[Document Chunk ${i + 1}] (${c.metadata?.section_title || 'General'})\n${c.content}`)
    .join('\n\n---\n\n');

  const systemPrompt = `You are a strict company assistant. You must answer questions using ONLY the facts present in the provided context documentation below.
If the answer cannot be found in the context, explicitly state "I don't have enough information to answer that."
Every single factual claim MUST be followed by a citation using the format [Source: {doc_name}]. Do not invent or hallucinate information.

Context Documentation:
${contextText}`;

  const messages = [
    { role: 'system', content: systemPrompt },
    ...(input.history || []).slice(-4), // Include last 4 conversation turns
    { role: 'user', content: `User Request: ${sanitizedQuery}` },
  ];

  // 7. Stream response via OpenRouter
  try {
    await openRouterStream(selectedModel, messages, (text) => {
      finalAnswer += text;
      onChunk(text);
    });

    const latencyMs = Date.now() - startTime;

    // 8. Cache the newly generated answer
    await supabase.from('query_cache').insert({
      query_hash: queryHash,
      query: sanitizedQuery,
      answer: finalAnswer,
      model: selectedModel,
      sources: citations,
      embedding: queryEmbedding
    });

    // 9. Log query log with tracing
    const { data: logEntry } = await supabase.from('query_logs').insert({
      session_id: input.sessionId,
      query: sanitizedQuery,
      answer: finalAnswer,
      model: selectedModel,
      sources_count: citations.length,
      top_similarity: citations[0]?.similarity || 0,
      hybrid_ranks: citations.map(c => ({ doc: c.document_name, score: c.similarity })),
      status: 'success',
      latency_ms: latencyMs,
    }).select('id').single();

    if (input.sessionId) {
      await supabase.from('chat_messages').insert([
        { session_id: input.sessionId, role: 'user', content: sanitizedQuery },
        {
          session_id: input.sessionId,
          role: 'assistant',
          content: finalAnswer,
          model: selectedModel,
          sources: citations,
          latency_ms: latencyMs,
        },
      ]);
    }

    // 10. Asynchronous Hallucination Detection
    // We run this without awaiting to not block the user response
    if (logEntry) {
      runHallucinationCheck(logEntry.id, finalAnswer, contextText);
    }

    return { answer: finalAnswer, model: selectedModel, sources: citations };
  } catch (err: any) {
    console.error('RAG Execution Error:', err);

    await supabase.from('query_logs').insert({
      session_id: input.sessionId,
      query: sanitizedQuery || input.query,
      error_message: err.message,
      status: 'error',
      latency_ms: Date.now() - startTime,
    });

    throw err;
  }
}

// Background task to test for hallucination and log score
async function runHallucinationCheck(logId: string, answer: string, context: string) {
  try {
    const supabase = await createClient();
    const prompt = `Evaluate the following answer against the provided context. 
If the answer contains claims NOT present in the context, output 1.0 (hallucinated).
If the answer is completely supported by the context, output 0.0 (grounded).
Output ONLY a float number.

Context:
${context}

Answer:
${answer}`;

    let scoreText = '';
    await openRouterStream('google/gemini-2.5-flash', [{ role: 'user', content: prompt }], (text) => {
      scoreText += text;
    });

    const score = parseFloat(scoreText.trim());
    if (!isNaN(score)) {
      await supabase.from('query_logs').update({ hallucination_score: score }).eq('id', logId);
    }
  } catch (e: any) {
    if (e?.message?.includes('402')) {
      // Silently ignore out of credits for background checks
      return;
    }
    console.error('Hallucination check failed:', e);
  }
}
