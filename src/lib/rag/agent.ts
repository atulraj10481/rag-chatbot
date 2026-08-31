import { StateGraph, END } from '@langchain/langgraph';
import { checkSemanticCache, setSemanticCache } from './redis-cache';
import { retrieveChunks } from './retriever';
import { rerankChunks } from './reranker';
import { openRouterStream } from '@/lib/openrouter/client';

// Define the state for the LangGraph execution
export interface AgentState {
  query: string;
  departmentId: string;
  role: string;
  history: any[];
  isCacheHit: boolean;
  intent: 'rag' | 'chit_chat' | 'clarification';
  retrievedChunks: any[];
  rerankedChunks: any[];
  answer: string;
  sources: any[];
  usedModel: string;
}

// 1. Semantic Cache Node
const checkCacheNode = async (state: AgentState): Promise<Partial<AgentState>> => {
  const cacheHit = await checkSemanticCache(state.query);
  if (cacheHit) {
    return { 
      isCacheHit: true, 
      answer: cacheHit.answer, 
      sources: cacheHit.sources, 
      usedModel: 'cached_redis_response' 
    };
  }
  return { isCacheHit: false };
};

// 2. Intent Classifier Node (Fast, cheap model)
const intentClassificationNode = async (state: AgentState): Promise<Partial<AgentState>> => {
  // Mocking the LLM call for intent detection for brevity
  // In production, this calls a cheap model like Haiku
  const lowerQuery = state.query.toLowerCase();
  
  let intent: 'rag' | 'chit_chat' | 'clarification' = 'rag';
  if (lowerQuery.includes('hello') || lowerQuery.includes('hi')) {
    intent = 'chit_chat';
  } else if (state.query.length < 5) {
    intent = 'clarification';
  }
  
  return { intent };
};

// 3. Retrieval & Reranking Node
const retrievalNode = async (state: AgentState): Promise<Partial<AgentState>> => {
  // Step 1: Hybrid Search (BM25 + pgvector) limited to department partitions
  // Since retrieveChunks uses `hybrid_search` RPC, we assume it's updated to pass dept/role
  const { chunks } = await retrieveChunks(state.query, 0.5, 20); // Get top 20
  
  // Step 2: Cross-Encoder Reranking
  const rerankedChunks = await rerankChunks(state.query, chunks, 5); // Narrow down to Top 5 high-precision
  
  return { retrievedChunks: chunks, rerankedChunks };
};

// 4. Generation Node (Complex model)
const generationNode = async (state: AgentState): Promise<Partial<AgentState>> => {
  if (state.intent === 'chit_chat') {
    return { answer: "Hello! I am your enterprise assistant. How can I help you with company documentation today?", sources: [] };
  }
  if (state.intent === 'clarification') {
    return { answer: "Could you please provide a bit more detail about what you're looking for?", sources: [] };
  }

  // LLM Cascading: We know it's a complex RAG query, use GPT-4o or Sonnet
  const model = "anthropic/claude-3.5-sonnet"; // Heavy lifter
  
  const context = state.rerankedChunks.map(c => `[Source ID: ${c.document_id}]\n${c.content}`).join('\n\n---\n\n');
  
  const prompt = `Answer the user based ONLY on this context:\n${context}\n\nQuery: ${state.query}`;
  
  let answer = "";
  // Wait for full answer for this synchronous node (streaming would be handled differently via LangGraph event streams)
  await openRouterStream(model, [{role: 'user', content: prompt}], (text) => {
    answer += text;
  });

  // Extract sources
  const sources = state.rerankedChunks.map(c => ({
    document_id: c.document_id,
    content: c.content,
    similarity: c.similarity
  }));

  // Cache the new result
  await setSemanticCache(state.query, answer, sources);

  return { answer, sources, usedModel: model };
};

// Define the Graph Workflow
const workflow = new StateGraph<AgentState>({
  channels: {
    query: { value: (x, y) => y ?? x, default: () => '' },
    departmentId: { value: (x, y) => y ?? x, default: () => '' },
    role: { value: (x, y) => y ?? x, default: () => '' },
    history: { value: (x, y) => y ?? x, default: () => [] },
    isCacheHit: { value: (x, y) => y ?? x, default: () => false },
    intent: { value: (x, y) => y ?? x, default: () => 'rag' },
    retrievedChunks: { value: (x, y) => y ?? x, default: () => [] },
    rerankedChunks: { value: (x, y) => y ?? x, default: () => [] },
    answer: { value: (x, y) => y ?? x, default: () => '' },
    sources: { value: (x, y) => y ?? x, default: () => [] },
    usedModel: { value: (x, y) => y ?? x, default: () => '' }
  }
});

// Add nodes
workflow.addNode("check_cache", checkCacheNode);
workflow.addNode("intent_classifier", intentClassificationNode);
workflow.addNode("retrieve_rerank", retrievalNode);
workflow.addNode("generate", generationNode);

// Define edges and routing
workflow.setEntryPoint("check_cache");

workflow.addConditionalEdges(
  "check_cache",
  (state) => state.isCacheHit ? "end" : "continue",
  {
    "end": END,
    "continue": "intent_classifier"
  }
);

workflow.addEdge("intent_classifier", "retrieve_rerank");
workflow.addEdge("retrieve_rerank", "generate");
workflow.addEdge("generate", END);

// Compile the graph
export const RAGAgent = workflow.compile();
