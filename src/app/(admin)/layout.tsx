import Link from "next/link";
import { ReactNode } from "react";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen w-full bg-slate-50 text-slate-900">
      <aside className="w-64 flex flex-col border-r bg-white">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold tracking-tight">RAG Chatbot</h2>
          <p className="text-sm text-slate-500">Admin Dashboard</p>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <Link href="/dashboard" className="block px-3 py-2 text-sm font-medium rounded-md hover:bg-slate-100">Overview</Link>
          <Link href="/dashboard/documents" className="block px-3 py-2 text-sm font-medium rounded-md hover:bg-slate-100">Documents</Link>
          <Link href="/dashboard/queries" className="block px-3 py-2 text-sm font-medium rounded-md hover:bg-slate-100">Query Logs</Link>
          <Link href="/dashboard/settings" className="block px-3 py-2 text-sm font-medium rounded-md hover:bg-slate-100">Settings</Link>
        </nav>
      </aside>
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
