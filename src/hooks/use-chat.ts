'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChatMessage, SourceCitation } from '@/types';
import { v4 as uuidv4 } from 'uuid';

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [visitorId, setVisitorId] = useState('');
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);

  useEffect(() => {
    let storedVisitorId = localStorage.getItem('rag_visitor_id');
    if (!storedVisitorId) {
      storedVisitorId = `visitor_${uuidv4().slice(0, 8)}`;
      localStorage.setItem('rag_visitor_id', storedVisitorId);
    }
    setVisitorId(storedVisitorId);
  }, []);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || loading) return;

      const userMsg: ChatMessage = {
        id: uuidv4(),
        session_id: sessionId || '',
        role: 'user',
        content,
        created_at: new Date().toISOString(),
      };

      const assistantMsgId = uuidv4();
      const initialAssistantMsg: ChatMessage = {
        id: assistantMsgId,
        session_id: sessionId || '',
        role: 'assistant',
        content: '',
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMsg, initialAssistantMsg]);
      setLoading(true);

      try {
        const historyTurns = messages.map((m) => ({
          role: m.role,
          content: m.content,
        }));

        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: content,
            sessionId,
            visitorId,
            history: historyTurns,
          }),
        });

        if (!response.ok) {
          throw new Error(`Chat API error (${response.status})`);
        }

        if (!response.body) return;

        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed === 'data: [DONE]') continue;

            if (trimmed.startsWith('data: ')) {
              try {
                const event = JSON.parse(trimmed.slice(6));

                if (event.type === 'session' && event.sessionId) {
                  setSessionId(event.sessionId);
                } else if (event.type === 'sources') {
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === assistantMsgId
                        ? { ...msg, sources: event.sources as SourceCitation[], model: event.model }
                        : msg
                    )
                  );
                } else if (event.type === 'text') {
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === assistantMsgId
                        ? { ...msg, content: msg.content + event.content }
                        : msg
                    )
                  );
                }
              } catch {
                // Ignore SSE parse errors
              }
            }
          }
        }
      } catch (err: any) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMsgId
              ? { ...msg, content: `Error: ${err.message || 'Failed to generate response'}` }
              : msg
          )
        );
      } finally {
        setLoading(false);
      }
    },
    [loading, messages, sessionId, visitorId]
  );

  return {
    messages,
    loading,
    sessionId,
    sendMessage,
  };
}
