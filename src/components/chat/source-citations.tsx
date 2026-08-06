'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SourceCitation } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FileText, X } from 'lucide-react';

interface SourceCitationsProps {
  sources?: SourceCitation[];
}

export default function SourceCitations({ sources }: SourceCitationsProps) {
  const [selectedSource, setSelectedSource] = useState<SourceCitation | null>(null);

  if (!sources || sources.length === 0) return null;

  return (
    <div className="mt-2 pt-2 border-t border-white/8">
      <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-2">
        Sources · {sources.length}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {sources.map((src, idx) => (
          <motion.button
            key={idx}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.05 }}
            onClick={() => setSelectedSource(src)}
            className="flex items-center gap-1.5 text-[11px] font-medium bg-white/5 hover:bg-indigo-500/15 text-slate-400 hover:text-indigo-300 border border-white/10 hover:border-indigo-500/30 rounded-full px-2.5 py-1 transition-all duration-200 cursor-pointer shadow-sm"
          >
            <FileText className="h-2.5 w-2.5" />
            {src.document_name}
            {src.page_num ? ` · p.${src.page_num}` : ''}
            {src.similarity && (
              <span className="ml-1 text-[9px] font-mono text-emerald-400 opacity-70">
                {Math.round(src.similarity * 100)}%
              </span>
            )}
          </motion.button>
        ))}
      </div>

      <AnimatePresence>
        {selectedSource && (
          <Dialog open={Boolean(selectedSource)} onOpenChange={() => setSelectedSource(null)}>
            <DialogContent className="max-w-lg bg-[#161616] border-white/10 text-white shadow-2xl rounded-2xl">
              <DialogHeader>
                <DialogTitle className="text-sm font-semibold flex items-center gap-2 text-slate-100">
                  <FileText className="h-4 w-4 text-indigo-400" />
                  {selectedSource.document_name}
                  {selectedSource.similarity && (
                    <span className="ml-auto text-[10px] font-mono text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full">
                      {Math.round(selectedSource.similarity * 100)}% match
                    </span>
                  )}
                </DialogTitle>
              </DialogHeader>
              <div className="mt-3 text-xs bg-white/4 border border-white/8 p-4 rounded-xl text-slate-300 leading-relaxed font-mono whitespace-pre-wrap max-h-72 overflow-y-auto">
                {selectedSource.content}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>
    </div>
  );
}
