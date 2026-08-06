'use client';

import { useEffect } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Widget interface crashed:', error);
  }, [error]);

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-background p-4 text-center">
      <div className="flex flex-col items-center max-w-sm p-6 rounded-2xl bg-white border border-slate-200 shadow-sm">
        <div className="h-12 w-12 rounded-full bg-red-50 flex items-center justify-center mb-4 border border-red-100">
          <AlertCircle className="h-6 w-6 text-red-500" />
        </div>
        <h2 className="text-lg font-semibold text-slate-900 mb-2">Widget Error</h2>
        <p className="text-slate-500 mb-6 text-xs leading-relaxed">
          The chat widget encountered an error.
        </p>
        <Button 
          onClick={() => reset()}
          className="w-full bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg h-10 text-xs font-medium flex items-center justify-center gap-2"
        >
          <RefreshCw className="h-3 w-3" />
          Reload Widget
        </Button>
      </div>
    </div>
  );
}
