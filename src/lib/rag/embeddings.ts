/**
 * Embedding generation via OpenRouter API
 * Uses model: openai/text-embedding-3-small (1536 dimensions)
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is not configured');
  }

  // OpenRouter OpenAI-compatible embeddings endpoint
  const response = await fetch('https://openrouter.ai/api/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      'X-Title': 'RAG Chatbot',
    },
    body: JSON.stringify({
      model: 'openai/text-embedding-3-small',
      input: texts,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter embeddings error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  // Returns array of embedding objects sorted by index
  return data.data.map((item: { embedding: number[] }) => item.embedding);
}

export async function generateSingleEmbedding(text: string): Promise<number[]> {
  const embeddings = await generateEmbeddings([text]);
  return embeddings[0];
}
