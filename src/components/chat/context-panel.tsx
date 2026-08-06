'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Link as LinkIcon, Database } from 'lucide-react';
import { SourceCitation } from '@/types';

export function ContextPanel({ sources }: { sources: SourceCitation[] }) {
  if (!sources || sources.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-500">
        <Database className="h-10 w-10 mb-4 opacity-20" />
        <p className="text-sm font-medium">No active context.</p>
        <p className="text-xs mt-1 opacity-60">Sources and citations will appear here when you ask a question.</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background/50 backdrop-blur-md">
      <div className="p-4 border-b border-white/5 flex items-center justify-between glass sticky top-0 z-10">
        <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          Retrieved Context
        </h3>
        <span className="text-xs text-slate-500">{sources.length} sources</span>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        <AnimatePresence>
          {sources.map((source, idx) => (
            <motion.div
              key={`${source.document_id}-${idx}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05, duration: 0.3 }}
              className="p-3 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-all hover:bg-white/10 shadow-sm group"
            >
              <div className="flex items-start gap-2 mb-2">
                <LinkIcon className="h-3 w-3 text-primary mt-0.5 shrink-0" />
                <h4 className="text-xs font-semibold text-slate-200 truncate group-hover:text-primary transition-colors" title={source.document_name}>
                  {source.document_name}
                </h4>
                {source.similarity && (
                  <span className="ml-auto text-[10px] font-mono text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded shadow-[0_0_8px_rgba(52,211,153,0.1)]">
                    {(source.similarity * 100).toFixed(0)}% match
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 line-clamp-5 leading-relaxed">
                "{source.content}"
              </p>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
