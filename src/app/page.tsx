import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-6 text-center">
      <div className="max-w-xl space-y-6">
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl text-slate-900">
          RAG Chatbot over Company Docs
        </h1>
        <p className="text-lg text-slate-600">
          Deploy-per-customer single-tenant RAG chatbot service.
        </p>
        <div className="flex justify-center gap-4">
          <Link
            href="/chat"
            className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow hover:bg-blue-500"
          >
            Go to Chat
          </Link>
          <Link
            href="/dashboard"
            className="rounded-lg bg-white border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            Admin Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
