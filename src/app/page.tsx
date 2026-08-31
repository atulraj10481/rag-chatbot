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
        <div className="flex justify-center pt-2">
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-8 py-3.5 text-sm font-semibold text-white shadow-xl shadow-indigo-500/25 hover:bg-indigo-500 hover:shadow-indigo-500/40 transition-all duration-200"
          >
            Sign In to Portal →
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
