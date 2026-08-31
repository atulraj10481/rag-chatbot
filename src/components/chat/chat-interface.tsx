'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useChat } from '@/hooks/use-chat';
import MessageList from './message-list';
import SuggestedQuestions from './suggested-questions';
import { ContextPanel } from './context-panel';
import { ArrowUp, Sparkles, SidebarOpen, SidebarClose } from 'lucide-react';
import { SourceCitation } from '@/types';
import { cn } from '@/lib/utils';

interface ChatInterfaceProps {
  department?: string;
}

export default function ChatInterface({ department }: ChatInterfaceProps = {}) {
  const { messages, loading, sendMessage } = useChat(department);
  const [input, setInput] = useState('');
  const [panelOpen, setPanelOpen] = useState(true);
  const [activeSources, setActiveSources] = useState<SourceCitation[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-grow textarea (Claude-style)
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 200)}px`;
  }, [input]);

  // When a new assistant message with sources arrives, update the context panel
  useEffect(() => {
    const lastAssistant = [...messages].reverse().find(m => m.role === 'assistant');
    if (lastAssistant?.sources && lastAssistant.sources.length > 0) {
      setActiveSources(lastAssistant.sources);
    }
  }, [messages]);

  const handleSubmit = useCallback((e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || loading) return;
    const text = input;
    setInput('');
    sendMessage(text);
    textareaRef.current?.focus();
  }, [input, loading, sendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="flex w-full h-full overflow-hidden">

      {/* ── LEFT: Chat Area ─────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 h-full">

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <AnimatePresence mode="wait">
            {isEmpty ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col items-center justify-center h-full text-center gap-6 max-w-xl mx-auto"
              >
                <div className="relative">
                  <motion.div
                    className="h-16 w-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-2xl shadow-indigo-500/30"
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    <Sparkles className="h-7 w-7 text-white" />
                  </motion.div>
                  <motion.span
                    className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-emerald-400 border-2 border-background shadow-[0_0_10px_rgba(52,211,153,0.8)]"
                    animate={{ scale: [1, 1.3, 1], opacity: [1, 0.7, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                </div>

                <div className="space-y-2">
                  <h2 className="text-2xl font-bold text-white tracking-tight">
                    Ask your Company Assistant
                  </h2>
                  <p className="text-sm text-slate-400 max-w-sm leading-relaxed">
                    Get instant, cited answers from your internal docs, PDFs, and Notion pages.
                  </p>
                </div>

                <SuggestedQuestions onSelect={(q) => sendMessage(q)} />
              </motion.div>
            ) : (
              <motion.div
                key="messages"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="max-w-3xl mx-auto"
              >
                <MessageList messages={messages} loading={loading} />
                <div ref={messagesEndRef} className="h-4" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Input Dock ───────────────────────────────────── */}
        <div className="px-6 pb-6 pt-2 shrink-0">
          <motion.div
            className={cn(
              'max-w-3xl mx-auto rounded-2xl border shadow-2xl transition-all duration-300',
              'bg-white/5 backdrop-blur-xl border-white/10',
              input.trim() ? 'shadow-indigo-500/10 border-indigo-500/20' : ''
            )}
            animate={{ scale: 1 }}
            transition={{ duration: 0.2 }}
          >
            <form onSubmit={handleSubmit} className="flex items-end gap-3 p-3">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask a question about company documentation…"
                rows={1}
                className="flex-1 resize-none bg-transparent text-sm text-slate-200 placeholder:text-slate-600 outline-none leading-relaxed max-h-[200px] min-h-[24px] overflow-y-auto py-1.5 px-1 custom-scrollbar"
                disabled={loading}
              />
              <motion.button
                type="submit"
                disabled={!input.trim() || loading}
                className={cn(
                  'h-9 w-9 shrink-0 flex items-center justify-center rounded-xl transition-all duration-200',
                  input.trim() && !loading
                    ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50'
                    : 'bg-white/5 text-slate-600 cursor-not-allowed'
                )}
                whileTap={input.trim() ? { scale: 0.9 } : {}}
              >
                {loading ? (
                  <motion.div
                    className="h-4 w-4 rounded-full border-2 border-indigo-300 border-t-transparent"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                  />
                ) : (
                  <ArrowUp className="h-4 w-4" />
                )}
              </motion.button>
            </form>
            <div className="px-4 pb-2 flex items-center justify-between">
              <span className="text-[10px] text-slate-600">
                {loading ? 'Generating response…' : 'Press Enter to send · Shift+Enter for new line'}
              </span>
              <button
                type="button"
                onClick={() => setPanelOpen(!panelOpen)}
                className="flex items-center gap-1.5 text-[10px] text-slate-600 hover:text-slate-400 transition-colors"
              >
                {panelOpen ? <SidebarClose className="h-3 w-3" /> : <SidebarOpen className="h-3 w-3" />}
                {panelOpen ? 'Hide context' : 'Show context'}
              </button>
            </div>
          </motion.div>
        </div>
      </div>

      {/* ── RIGHT: Context Panel (animated open/close) ────── */}
      <AnimatePresence>
        {panelOpen && (
          <motion.aside
            key="context-panel"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 340, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="border-l border-white/5 overflow-hidden h-full shrink-0"
          >
            <div className="w-[340px] h-full overflow-y-auto">
              <ContextPanel sources={activeSources} />
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
}
