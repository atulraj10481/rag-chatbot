'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { ChatMessage } from '@/types';
import SourceCitations from './source-citations';
import { Cpu, User } from 'lucide-react';

interface MessageListProps {
  messages: ChatMessage[];
  loading: boolean;
}

// Typing indicator component
function TypingIndicator() {
  return (
    <div className="flex items-end gap-1 h-5 px-1">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-slate-400"
          animate={{ y: [0, -5, 0], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' }}
        />
      ))}
    </div>
  );
}

export default function MessageList({ messages, loading }: MessageListProps) {
  return (
    <div className="space-y-6">
      <AnimatePresence initial={false}>
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          const isEmpty = !msg.content && !isUser;

          return (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {/* Avatar */}
              <div className={`shrink-0 h-8 w-8 rounded-lg flex items-center justify-center shadow-md ${
                isUser
                  ? 'bg-gradient-to-br from-indigo-500 to-purple-600 shadow-indigo-500/20'
                  : 'bg-white/10 border border-white/10 shadow-black/20'
              }`}>
                {isUser
                  ? <User className="h-4 w-4 text-white" />
                  : <Cpu className="h-4 w-4 text-slate-300" />
                }
              </div>

              {/* Bubble */}
              <div className={`max-w-[82%] flex flex-col gap-1 ${isUser ? 'items-end' : 'items-start'}`}>
                {/* Model badge for assistant */}
                {!isUser && msg.model && (
                  <div className="flex items-center gap-2 px-1 pb-1">
                    <span className="text-[10px] font-mono text-slate-500">
                      {msg.model.replace(' (cached)', '')}
                    </span>
                    {msg.model.includes('(cached)') && (
                      <span className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-full px-1.5 py-0.5 uppercase tracking-wider">
                        ⚡ Cached
                      </span>
                    )}
                  </div>
                )}

                <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                  isUser
                    ? 'bg-gradient-to-br from-indigo-600 to-purple-700 text-white rounded-tr-sm shadow-indigo-900/40'
                    : 'bg-white/5 border border-white/8 text-slate-200 rounded-tl-sm backdrop-blur-sm'
                }`}>
                  {isEmpty && loading ? (
                    <TypingIndicator />
                  ) : (
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  )}
                </div>

                {!isUser && msg.sources && msg.sources.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    transition={{ delay: 0.2, duration: 0.3 }}
                    className="w-full"
                  >
                    <SourceCitations sources={msg.sources} />
                  </motion.div>
                )}
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
