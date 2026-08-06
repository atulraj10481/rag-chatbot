'use client';

import { useSearchParams } from 'next/navigation';
import ChatInterface from '@/components/chat/chat-interface';
import { Suspense } from 'react';

function WidgetContent() {
  const searchParams = useSearchParams();
  const title = searchParams.get('title') || 'Assistant';
  const primaryColor = searchParams.get('primaryColor') || '#3b82f6';

  return (
    <div className="h-screen w-full bg-white flex flex-col font-sans">
      {/* Widget Header */}
      <header
        className="px-4 py-3 text-white flex items-center justify-between shadow-sm shrink-0"
        style={{ backgroundColor: primaryColor }}
      >
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-semibold text-sm tracking-tight">{title}</span>
        </div>
      </header>

      {/* Embedded Chat Interface */}
      <main className="flex-1 p-2 overflow-hidden flex flex-col">
        <ChatInterface />
      </main>
    </div>
  );
}

export default function WidgetPage() {
  return (
    <Suspense fallback={<div className="p-4 text-xs text-slate-400">Loading widget...</div>}>
      <WidgetContent />
    </Suspense>
  );
}
