export function assessComplexity(query: string, retrievedChunks: any[]): number {
  const queryLength = query.length;
  const isSimpleGreeting = /^(hi|hello|hey|greetings|who are you|what can you do)/i.test(query.trim());
  if (isSimpleGreeting) return 0.1;

  let score = 0.4; // baseline

  if (queryLength > 150) score += 0.2;
  if (retrievedChunks.length >= 4) score += 0.2;
  if (/compare|difference|explain|how does|why|code|step-by-step/i.test(query)) score += 0.2;

  return Math.min(score, 1.0);
}

export function selectModel(query: string, retrievedChunks: any[], preference: string = 'auto'): string {
  if (preference === 'cheap') return 'google/gemini-2.0-flash-001:floor';
  if (preference === 'standard') return 'meta-llama/llama-4-scout';
  if (preference === 'premium') return 'anthropic/claude-sonnet-4';

  // Auto dynamic routing based on query complexity score
  const score = assessComplexity(query, retrievedChunks);

  if (score < 0.3) {
    return 'google/gemini-2.0-flash-001:floor';
  } else if (score < 0.7) {
    return 'meta-llama/llama-4-scout';
  } else {
    return 'anthropic/claude-sonnet-4';
  }
}
