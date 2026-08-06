import ChatInterface from '@/components/chat/chat-interface';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Lock } from 'lucide-react';

export default async function StandaloneChatPage() {
  const supabase = await createClient();
  const { data: settings } = await supabase.from('settings').select('is_public_chat_enabled').eq('id', 1).single();

  if (settings && settings.is_public_chat_enabled === false) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-[#0a0a0a] p-6 text-center">
        <div className="flex flex-col items-center max-w-md p-8 rounded-3xl bg-white/5 border border-white/10 shadow-2xl backdrop-blur-xl">
          <div className="h-16 w-16 rounded-full bg-slate-800 flex items-center justify-center mb-6 border border-white/10">
            <Lock className="h-8 w-8 text-slate-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Private Mode</h2>
          <p className="text-slate-400 mb-8 text-sm leading-relaxed">
            The public chat interface is currently disabled by the administrator. The chatbot can only be accessed via the embedded widget.
          </p>
          <Link 
            href="/dashboard"
            className="w-full bg-white text-black hover:bg-slate-200 rounded-xl h-12 font-medium flex items-center justify-center transition-colors"
          >
            Go to Admin Portal
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen h-screen bg-background flex flex-col overflow-hidden text-foreground selection:bg-primary/30 relative">
      {/* Background ambient glow */}
      <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-500/10 blur-[120px] pointer-events-none" />

      {/* Top Brand Header */}
      <header className="h-14 border-b border-white/5 glass px-6 flex items-center justify-between shrink-0 relative z-30">
        <div className="flex items-center gap-3">
          <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center shadow-[0_0_15px_rgba(255,255,255,0.1)]">
            <span className="text-primary-foreground font-bold tracking-tighter text-xs">R</span>
          </div>
          <span className="font-semibold text-sm tracking-tight text-white">Company Assistant</span>
        </div>
        <Link href="/dashboard" className="text-xs font-medium text-slate-400 hover:text-white transition-colors">
          Admin Portal →
        </Link>
      </header>

      {/* Main Chat Interface (handles split layout internally) */}
      <main className="flex-1 flex overflow-hidden relative z-20">
        <ChatInterface />
      </main>
    </div>
  );
}
