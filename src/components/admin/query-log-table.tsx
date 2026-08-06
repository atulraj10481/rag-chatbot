'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { QueryLog } from '@/types';
import { RefreshCw, Search } from 'lucide-react';

const STATUS_FILTERS = ['all', 'success', 'unanswered', 'error'] as const;

export default function QueryLogTable() {
  const [logs, setLogs] = useState<QueryLog[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/queries?status=${filter}`);
      const data = await res.json();
      if (res.ok) {
        setLogs(data.logs || []);
      } else {
        toast.error(data.error || 'Failed to fetch logs');
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const filteredLogs = logs.filter((log) =>
    log.query.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <span className="text-[11px] font-medium text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 rounded-full px-2.5 py-0.5">Success</span>;
      case 'unanswered':
        return <span className="text-[11px] font-medium text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-full px-2.5 py-0.5">Unanswered</span>;
      case 'error':
        return <span className="text-[11px] font-medium text-red-400 bg-red-400/10 border border-red-400/20 rounded-full px-2.5 py-0.5">Error</span>;
      default:
        return <span className="text-[11px] font-medium text-slate-400 bg-white/5 border border-white/10 rounded-full px-2.5 py-0.5">{status}</span>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row justify-between gap-3">
        <div className="flex gap-1.5">
          {STATUS_FILTERS.map((st) => (
            <button
              key={st}
              onClick={() => setFilter(st)}
              className={`capitalize text-xs px-3 py-1.5 rounded-lg font-medium transition-all duration-200 ${
                filter === st
                  ? 'bg-white/10 text-white border border-white/20 shadow-sm'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-white/5 border border-transparent'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
        <div className="relative max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
          <Input
            placeholder="Filter queries…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs bg-white/5 border-white/10 text-slate-300 placeholder:text-slate-600 rounded-lg focus:border-indigo-500/40"
          />
        </div>
      </div>

      {/* Table Card */}
      <div className="rounded-2xl bg-white/3 border border-white/8 overflow-hidden">
        {loading ? (
          <div className="text-center py-16 text-slate-500 text-sm">
            <div className="inline-block h-5 w-5 rounded-full border-2 border-slate-700 border-t-slate-400 animate-spin mb-3" />
            <p>Loading query logs…</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-16 text-slate-600 text-sm">No query logs found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/5">
                  {['Question', 'Answer Snippet', 'Model', 'Similarity', 'Latency', 'Status', 'Time'].map((h) => (
                    <th key={h} className="px-5 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-white/3 transition-colors">
                    <td className="px-5 py-3.5 font-medium text-slate-200 max-w-[200px] truncate text-sm" title={log.query}>
                      {log.query}
                    </td>
                    <td className="px-5 py-3.5 max-w-[220px] truncate text-xs text-slate-500" title={log.answer || ''}>
                      {log.answer || log.error_message || <span className="text-slate-700">N/A</span>}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-[11px] text-indigo-400">
                      {log.model?.split('/')[1] || log.model || 'auto'}
                    </td>
                    <td className="px-5 py-3.5 text-xs font-mono text-emerald-400">
                      {log.top_similarity ? `${Math.round(log.top_similarity * 100)}%` : <span className="text-slate-700">0%</span>}
                    </td>
                    <td className="px-5 py-3.5 text-xs font-mono text-slate-400">
                      {log.latency_ms || 0}<span className="text-slate-600 ml-0.5">ms</span>
                    </td>
                    <td className="px-5 py-3.5">{getStatusBadge(log.status)}</td>
                    <td className="px-5 py-3.5 text-[11px] font-mono text-slate-600">
                      {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
