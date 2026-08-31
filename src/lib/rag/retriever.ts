import { createClient } from '@/lib/supabase/server';
import { generateSingleEmbedding } from './embeddings';
import { DocumentChunk, SourceCitation } from '@/types';

export async function retrieveChunks(
  query: string,
  matchThreshold: number = 0.5,
  matchCount: number = 5,
  precomputedEmbedding?: number[],
  userDepts: string[] = ['general'],
  userRole: string = 'employee'
): Promise<{ chunks: DocumentChunk[]; citations: SourceCitation[] }> {
  const supabase = await createClient();

  // 1. Generate query embedding via OpenRouter (or use precomputed)
  const queryEmbedding = precomputedEmbedding || await generateSingleEmbedding(query);

  // Guarantee userDepts is an array
  const safeDepts = Array.isArray(userDepts) ? userDepts : [userDepts || 'general'];

  // 2. Call RBAC-aware match function in Supabase pgvector
  const { data: matchedData, error } = await supabase.rpc('match_chunks_rbac', {
    query_embedding: queryEmbedding,
    match_threshold: matchThreshold,
    match_count: matchCount,
    user_depts: safeDepts,
    user_role: userRole
  });

  if (error) {
    console.error('RBAC retrieval RPC error:', error);
    return { chunks: [], citations: [] };
  }

  if (!matchedData || matchedData.length === 0) {
    return { chunks: [], citations: [] };
  }

  // 3. Fetch document names for citations
  const docIds = Array.from(new Set(matchedData.map((item: any) => item.document_id))) as string[];
  const { data: docs } = await supabase
    .from('documents')
    .select('id, name')
    .in('id', docIds);

  const docMap = new Map<string, string>();
  docs?.forEach(d => docMap.set(d.id, d.name));

  const chunks: DocumentChunk[] = matchedData.map((item: any) => ({
    id: item.id,
    document_id: item.document_id,
    content: item.content,
    department_id: item.department_id,
    minimum_role: item.minimum_role,
    metadata: item.metadata || {},
    similarity: item.similarity,
  }));

  const citations: SourceCitation[] = matchedData.map((item: any) => ({
    document_id: item.document_id,
    document_name: docMap.get(item.document_id) || 'Document',
    content: item.content,
    page_num: item.metadata?.page_num,
    similarity: item.similarity,
  }));

  return { chunks, citations };
}
