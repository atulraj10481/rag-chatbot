'use client';

import { useState } from 'react';
import { SourceCitation } from '@/types';
import { FileText, ChevronDown, ChevronUp } from 'lucide-react';

export function Citations({ sources }: { sources: SourceCitation[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (!sources || sources.length === 0) return null;

  return (
    <div className="mt-4 pt-4 border-t border-border/50">
      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
        Sources Cited
      </h4>
      <div className="flex flex-col gap-2">
        {sources.map((source, index) => (
          <div key={`${source.document_id}-${index}`} className="bg-muted/30 rounded-md border border-border/50 overflow-hidden">
            <button
              onClick={() => setExpandedId(expandedId === source.document_id ? null : source.document_id)}
              className="w-full flex items-center justify-between p-3 text-sm hover:bg-muted/50 transition-colors text-left"
            >
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-blue-500" />
                <span className="font-medium text-foreground">
                  [{index + 1}] {source.document_name}
                </span>
                <span className="text-xs text-muted-foreground ml-2">
                  (Relevance: {(source.similarity * 100).toFixed(1)}%)
                </span>
              </div>
              {expandedId === source.document_id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            
            {expandedId === source.document_id && (
              <div className="p-3 bg-muted/20 border-t border-border/50 text-sm text-foreground/80 leading-relaxed font-mono whitespace-pre-wrap">
                {source.content}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
