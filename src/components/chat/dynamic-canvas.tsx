'use client';

import { useState } from 'react';
import { BarChart, Table, X } from 'lucide-react';

interface DynamicCanvasProps {
  type: 'table' | 'chart' | 'markdown';
  data: any;
  title: string;
}

export function DynamicCanvas({ type, data, title }: DynamicCanvasProps) {
  const [isOpen, setIsOpen] = useState(false);

  // If the agent determines the response is complex data (e.g., comparing 4 health plans),
  // instead of rendering raw markdown, it passes it to this canvas component which acts like Claude Artifacts.

  return (
    <div className="my-4">
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-3 p-4 bg-muted/20 border border-border/50 rounded-lg hover:bg-muted/40 transition-all w-full text-left"
      >
        <div className="p-2 bg-primary/10 text-primary rounded-md">
          {type === 'chart' ? <BarChart size={20} /> : <Table size={20} />}
        </div>
        <div>
          <h4 className="font-medium text-sm text-foreground">View Generated {type === 'chart' ? 'Chart' : 'Table'}</h4>
          <p className="text-xs text-muted-foreground">{title}</p>
        </div>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 md:p-8">
          <div className="bg-card w-full max-w-5xl h-full max-h-[80vh] rounded-xl shadow-2xl border border-border flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border/50 bg-muted/10">
              <div className="flex items-center gap-2">
                {type === 'chart' ? <BarChart size={18} className="text-primary" /> : <Table size={18} className="text-primary" />}
                <h3 className="font-semibold">{title}</h3>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-muted rounded-md transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Canvas Body (Mock Rendering) */}
            <div className="p-6 overflow-y-auto flex-1 bg-muted/5">
              {type === 'table' ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left border-collapse">
                    <thead className="bg-muted text-muted-foreground">
                      <tr>
                        {data.headers?.map((h: string, i: number) => (
                          <th key={i} className="px-4 py-3 border-b border-border font-medium">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.rows?.map((row: any[], i: number) => (
                        <tr key={i} className="border-b border-border/50 hover:bg-muted/30">
                          {row.map((cell: any, j: number) => (
                            <td key={j} className="px-4 py-3">{cell}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground italic">
                  [Chart Rendering Component would go here (e.g. Recharts or Chart.js)]
                </div>
              )}
            </div>
            
          </div>
        </div>
      )}
    </div>
  );
}
