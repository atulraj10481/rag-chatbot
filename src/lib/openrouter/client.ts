export async function openRouterStream(
  model: string,
  messages: { role: string; content: string }[],
  onChunk: (chunkText: string) => void
): Promise<{ fullText: string; tokensUsed?: number }> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is missing in environment variables');
  }

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      'X-Title': 'RAG Chatbot',
    },
    body: JSON.stringify({
      model: model,
      messages: messages,
      stream: true,
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenRouter completion API error (${response.status}): ${errText}`);
  }

  if (!response.body) {
    throw new Error('ReadableStream not supported by browser/server response');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let fullText = '';
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || ''; // keep incomplete trailing chunk in buffer

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith(':')) continue;

      if (trimmed === 'data: [DONE]') {
        break;
      }

      if (trimmed.startsWith('data: ')) {
        try {
          const json = JSON.parse(trimmed.slice(6));
          const deltaContent = json.choices?.[0]?.delta?.content;
          if (deltaContent) {
            fullText += deltaContent;
            onChunk(deltaContent);
          }
        } catch {
          // Ignore JSON parse errors for SSE framing
        }
      }
    }
  }

  return { fullText };
}
