import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
      <div className="max-w-xl space-y-6 relative z-10">
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl text-white">
          RAG Chatbot over Company Docs
        </h1>
        <p className="text-lg text-slate-400">
          Deploy-per-customer single-tenant RAG chatbot service.
        </p>
        <div className="flex justify-center gap-4">
          <Link
            href="/chat"
            className="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow hover:bg-indigo-500 transition-colors"
          >
            Go to Chat
          </Link>
          <Link
            href="/dashboard"
            className="rounded-xl bg-white/5 border border-white/10 px-6 py-3 text-sm font-semibold text-slate-300 shadow-sm hover:bg-white/10 hover:text-white transition-colors backdrop-blur-md"
          >
            Admin Dashboard
          </Link>
        </div>
      </div>
      
      {/* Background styling for dark theme */}
      <div className="absolute inset-0 bg-[#0a0a0a] -z-10" />
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-transparent to-purple-500/10 -z-10" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[500px] bg-indigo-500/20 blur-[120px] rounded-full opacity-50 -z-10 pointer-events-none" />
    </div>
  );
}
