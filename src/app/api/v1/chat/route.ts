import { NextResponse } from 'next/server';
import { executeRAGWorkflow } from '@/lib/rag/graph';

export const runtime = 'nodejs';

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-visitor-id',
  };
}

// Simple in-memory rate limiter (resets on serverless cold start).
// For distributed production rate limiting, swap this with @vercel/kv or Upstash Redis.
const rateLimitMap = new Map<string, { count: number; expires: number }>();
const RATE_LIMIT = 30; // max requests
const WINDOW_MS = 60 * 1000; // 1 minute

function checkRateLimit(ipOrId: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ipOrId);
  if (!record || record.expires < now) {
    rateLimitMap.set(ipOrId, { count: 1, expires: now + WINDOW_MS });
    return true;
  }
  if (record.count >= RATE_LIMIT) {
    return false;
  }
  record.count += 1;
  return true;
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(),
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages, stream } = body;

    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    const visitorId = req.headers.get('x-visitor-id') || 'headless_api_user';
    
    // Rate Limit check (using IP or visitor ID)
    if (!checkRateLimit(ip !== 'unknown' ? ip : visitorId)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429, headers: corsHeaders() }
      );
    }

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'messages array is required' },
        { status: 400, headers: corsHeaders() }
      );
    }

    const lastUserMessage = [...messages].reverse().find((m: any) => m.role === 'user');
    if (!lastUserMessage?.content) {
      return NextResponse.json(
        { error: 'No user message content found' },
        { status: 400, headers: corsHeaders() }
      );
    }

    const historyTurns = messages.slice(0, -1).map((m: any) => ({
      role: m.role,
      content: m.content,
    }));

    if (stream) {
      const encoder = new TextEncoder();
      const responseStream = new ReadableStream({
        async start(controller) {
          try {
            const { model } = await executeRAGWorkflow(
              {
                query: lastUserMessage.content,
                visitorId,
                history: historyTurns,
              },
              (textChunk) => {
                const sseChunk = {
                  id: `chatcmpl-${Date.now()}`,
                  object: 'chat.completion.chunk',
                  created: Math.floor(Date.now() / 1000),
                  model: 'rag-chatbot-v1',
                  choices: [
                    {
                      index: 0,
                      delta: { content: textChunk },
                      finish_reason: null,
                    },
                  ],
                };
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(sseChunk)}\n\n`));
              }
            );

            // Send finish chunk
            const finishChunk = {
              id: `chatcmpl-${Date.now()}`,
              object: 'chat.completion.chunk',
              created: Math.floor(Date.now() / 1000),
              model: model || 'rag-chatbot-v1',
              choices: [
                {
                  index: 0,
                  delta: {},
                  finish_reason: 'stop',
                },
              ],
            };
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(finishChunk)}\n\n`));
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
          } catch (err: any) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ error: err.message })}\n\n`)
            );
            controller.close();
          }
        },
      });

      return new Response(responseStream, {
        headers: {
          ...corsHeaders(),
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
        },
      });
    } else {
      // Non-streaming response
      let fullAnswer = '';
      const { model, sources } = await executeRAGWorkflow(
        {
          query: lastUserMessage.content,
          visitorId,
          history: historyTurns,
        },
        (chunk) => {
          fullAnswer += chunk;
        }
      );

      return NextResponse.json(
        {
          id: `chatcmpl-${Date.now()}`,
          object: 'chat.completion',
          created: Math.floor(Date.now() / 1000),
          model: model || 'rag-chatbot-v1',
          choices: [
            {
              index: 0,
              message: {
                role: 'assistant',
                content: fullAnswer,
              },
              finish_reason: 'stop',
            },
          ],
          sources: sources,
        },
        { headers: corsHeaders() }
      );
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Server error' },
      { status: 500, headers: corsHeaders() }
    );
  }
}
