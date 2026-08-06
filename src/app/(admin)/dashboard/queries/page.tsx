import QueryLogTable from '@/components/admin/query-log-table';
import { Database } from 'lucide-react';

export default function QueriesPage() {
  return (
    <div className="space-y-8 max-w-6xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Query Logs & Monitoring</h1>
          <p className="text-sm text-slate-500 mt-1">
            Monitor real-time visitor questions, answers, and unanswered queries with low vector scores.
          </p>
        </div>
        <span className="text-xs font-medium text-purple-400 bg-purple-400/10 border border-purple-400/20 rounded-full px-3 py-1.5 flex items-center gap-1.5">
          <Database className="h-3 w-3" />
          Phase 5 · Monitoring
        </span>
      </div>

      <QueryLogTable />
    </div>
  );
}
