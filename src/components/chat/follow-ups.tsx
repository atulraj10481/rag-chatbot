'use client';

import { ArrowRight } from 'lucide-react';

export function SmartFollowUps({ questions, onSelect }: { questions: string[], onSelect: (q: string) => void }) {
  if (!questions || questions.length === 0) return null;

  return (
    <div className="mt-6 flex flex-col gap-2 animate-in fade-in slide-in-from-bottom-2 duration-500 delay-300 fill-mode-both">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
        Suggested Follow-ups
      </p>
      <div className="flex flex-wrap gap-2">
        {questions.map((q, idx) => (
          <button
            key={idx}
            onClick={() => onSelect(q)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-muted/30 hover:bg-muted/60 border border-border rounded-full text-foreground/80 transition-colors text-left group"
          >
            <span>{q}</span>
            <ArrowRight size={14} className="text-muted-foreground group-hover:text-primary transition-colors" />
          </button>
        ))}
      </div>
    </div>
  );
}
