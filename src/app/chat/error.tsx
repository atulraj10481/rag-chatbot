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
    console.error('Chat interface crashed:', error);
  }, [error]);

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-[#0a0a0a] p-6 text-center">
      <div className="flex flex-col items-center max-w-md p-8 rounded-3xl bg-white/5 border border-white/10 shadow-2xl backdrop-blur-xl">
        <div className="h-16 w-16 rounded-full bg-red-500/20 flex items-center justify-center mb-6 border border-red-500/30">
          <AlertCircle className="h-8 w-8 text-red-400" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Chat Unavailable</h2>
        <p className="text-slate-400 mb-8 text-sm leading-relaxed">
          The chat interface encountered an unexpected error. This usually happens if the connection is lost or the server is temporarily unavailable.
        </p>
        <Button 
          onClick={() => reset()}
          className="w-full bg-white text-black hover:bg-slate-200 rounded-xl h-12 font-medium flex items-center justify-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Reload Chat
        </Button>
      </div>
    </div>
  );
}
