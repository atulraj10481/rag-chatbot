import { DocumentChunk } from '@/types';

/**
 * Calls a Cloudflare Worker exposed via a REST API to perform Cross-Encoder Reranking
 * using the BGE-Reranker model.
 */
export async function rerankChunks(query: string, chunks: DocumentChunk[], topK: number = 5): Promise<DocumentChunk[]> {
  if (chunks.length === 0) return [];
  
  const CLOUDFLARE_AI_URL = process.env.CLOUDFLARE_RERANKER_URL;
  const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;

  if (!CLOUDFLARE_AI_URL || !CLOUDFLARE_API_TOKEN) {
    console.warn("Cloudflare Reranker credentials missing, falling back to base vector similarity.");
    return chunks.slice(0, topK);
  }

  try {
    // Format input for the BGE-reranker model: pairs of [query, text]
    const pairs = chunks.map(chunk => ({
      query: query,
      text: chunk.content
    }));

    const response = await fetch(CLOUDFLARE_AI_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ pairs })
    });

    if (!response.ok) {
      throw new Error(`Reranker API returned ${response.status}`);
    }

    const data = await response.json();
    
    // Combine chunks with their new rerank scores
    const rerankedChunks = chunks.map((chunk, index) => ({
      ...chunk,
      similarity: data.scores[index] // Replace pgvector score with cross-encoder score
    }));

    // Sort by new score descending and take topK
    return rerankedChunks
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);

  } catch (error) {
    console.error('Reranker Error:', error);
    // Fallback to original order
    return chunks.slice(0, topK);
  }
}
