import { createClient } from 'redis';
import { generateSingleEmbedding } from './embeddings';

// Redis connection setup
const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

let isConnected = false;
redisClient.on('error', err => console.log('Redis Client Error', err));

async function ensureConnection() {
  if (!isConnected) {
    await redisClient.connect();
    isConnected = true;
  }
}

/**
 * Searches the Redis Semantic Cache for a highly similar previous query.
 * Expects Redis to be configured with RediSearch and Vector Search capabilities.
 */
export async function checkSemanticCache(query: string, threshold = 0.95): Promise<{ answer: string, sources: any[] } | null> {
  await ensureConnection();
  
  // Generate embedding for the new query
  const queryEmbedding = await generateSingleEmbedding(query);
  
  // Convert embedding array to a Buffer (assuming Float32) for Redis Vector Search
  const float32Array = new Float32Array(queryEmbedding);
  const buffer = Buffer.from(float32Array.buffer);

  try {
    // Perform vector search on the 'idx:queries' index
    // KNN 1 means we just want the absolute closest match
    const result = await redisClient.ft.search(
      'idx:queries',
      '*=>[KNN 1 @embedding $BLOB AS score]',
      {
        PARAMS: { BLOB: buffer },
        SORTBY: 'score',
        RETURN: ['answer', 'sources', 'score'],
        DIALECT: 2
      }
    );

    if (result.total > 0) {
      const topMatch = result.documents[0].value;
      const score = Number(topMatch.score);
      
      // In Redis vector search (cosine distance), 0 is perfect match. 
      // Similarity = 1 - distance.
      const similarity = 1 - score;
      
      if (similarity >= threshold) {
        console.log(`[Cache Hit] Similarity: ${similarity.toFixed(4)}`);
        return {
          answer: topMatch.answer as string,
          sources: JSON.parse(topMatch.sources as string || '[]')
        };
      }
    }
  } catch (err) {
    console.error('Semantic Cache Check Error:', err);
  }
  
  return null;
}

/**
 * Stores a successfully generated answer into the Redis Semantic Cache.
 */
export async function setSemanticCache(query: string, answer: string, sources: any[]) {
  await ensureConnection();
  const queryEmbedding = await generateSingleEmbedding(query);
  
  const float32Array = new Float32Array(queryEmbedding);
  const buffer = Buffer.from(float32Array.buffer);

  const hashId = `query:${Date.now()}`;
  
  try {
    await redisClient.hSet(hashId, {
      query: query,
      answer: answer,
      sources: JSON.stringify(sources),
      embedding: buffer
    });
    
    // Set expiry for 30 days to keep cache fresh
    await redisClient.expire(hashId, 60 * 60 * 24 * 30);
  } catch (err) {
    console.error('Semantic Cache Set Error:', err);
  }
}
