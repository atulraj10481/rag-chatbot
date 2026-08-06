import { executeRAGWorkflow } from '@/lib/rag/graph';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const { message, sessionId, visitorId, history } = await req.json();

    if (!message || typeof message !== 'string') {
      return new Response(JSON.stringify({ error: 'Message text is required' }), { status: 400 });
    }

    const currentVisitorId = visitorId || 'anonymous_visitor';
    const supabase = await createClient();

    // Get or create session
    let activeSessionId = sessionId;
    if (!activeSessionId) {
      const { data: session } = await supabase
        .from('chat_sessions')
        .insert({
          visitor_id: currentVisitorId,
          source: 'standalone',
        })
        .select('id')
        .single();
      if (session) {
        activeSessionId = session.id;
      }
    }

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        // Send initial metadata event with sessionId
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'session', sessionId: activeSessionId })}\n\n`)
        );

        try {
          await executeRAGWorkflow(
            {
              query: message,
              sessionId: activeSessionId,
              visitorId: currentVisitorId,
              history,
            },
            (textChunk) => {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: 'text', content: textChunk })}\n\n`)
              );
            },
            (sources, model) => {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: 'sources', sources, model })}\n\n`)
              );
            }
          );

          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (err: any) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'error', error: err.message })}\n\n`)
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
      },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || 'Server error' }), { status: 500 });
  }
}
