import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { FileText, MessageSquare, AlertTriangle, Database, ArrowRight, Zap, CheckCircle2 } from 'lucide-react';

export default async function DashboardOverviewPage() {
  const supabase = await createClient();

  const [{ count: docsCount }, { count: queryCount }, { count: unansweredCount }, { count: cacheCount }] = await Promise.all([
    supabase.from('documents').select('*', { count: 'exact', head: true }).eq('archived', false),
    supabase.from('query_logs').select('*', { count: 'exact', head: true }),
    supabase.from('query_logs').select('*', { count: 'exact', head: true }).eq('status', 'unanswered'),
    supabase.from('query_cache').select('*', { count: 'exact', head: true }),
  ]);

  const { data: recentQueries } = await supabase
    .from('query_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  const stats = [
    {
      label: 'Knowledge Documents',
      value: docsCount ?? 0,
      sub: 'Active, non-archived sources',
      icon: FileText,
      color: 'from-indigo-500/20 to-indigo-500/5',
      iconColor: 'text-indigo-400',
      glow: 'shadow-indigo-500/10',
    },
    {
      label: 'Total User Queries',
      value: queryCount ?? 0,
      sub: 'All logged interactions',
      icon: MessageSquare,
      color: 'from-emerald-500/20 to-emerald-500/5',
      iconColor: 'text-emerald-400',
      glow: 'shadow-emerald-500/10',
    },
    {
      label: 'Unanswered Queries',
      value: unansweredCount ?? 0,
      sub: 'Low-similarity or no-match queries',
      icon: AlertTriangle,
      color: 'from-amber-500/20 to-amber-500/5',
      iconColor: 'text-amber-400',
      glow: 'shadow-amber-500/10',
    },
    {
      label: 'Cached Answers',
      value: cacheCount ?? 0,
      sub: 'Semantic cache hits available',
      icon: Database,
      color: 'from-purple-500/20 to-purple-500/5',
      iconColor: 'text-purple-400',
      glow: 'shadow-purple-500/10',
    },
  ];

  return (
    <div className="space-y-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Dashboard Overview</h1>
          <p className="text-sm text-slate-500 mt-1">
            Monitor your RAG pipeline health, usage, and knowledge base.
          </p>
        </div>
        <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 rounded-full px-3 py-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
          Live
        </span>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className={`rounded-2xl bg-gradient-to-b ${stat.color} border border-white/8 p-5 shadow-lg ${stat.glow} hover:border-white/15 transition-all duration-300 group`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`h-9 w-9 rounded-xl bg-white/5 flex items-center justify-center border border-white/8 group-hover:bg-white/10 transition-colors ${stat.iconColor}`}>
                <stat.icon className="h-4 w-4" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-white tracking-tight">{stat.value}</div>
            <div className="text-xs font-semibold text-slate-300 mt-1">{stat.label}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">{stat.sub}</div>
          </div>
        ))}
      </div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* Recent Queries — spans 3 cols */}
        <div className="lg:col-span-3 rounded-2xl bg-white/3 border border-white/8 overflow-hidden">
          <div className="p-5 border-b border-white/5 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-slate-500" />
              Recent Queries
            </h2>
            <Link href="/dashboard/queries" className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1 transition-colors">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="p-3 space-y-1">
            {!recentQueries || recentQueries.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-8">No recent queries recorded.</p>
            ) : (
              recentQueries.map((q) => (
                <div key={q.id} className="p-3 rounded-xl hover:bg-white/5 transition-colors cursor-default">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-xs font-medium text-slate-300 line-clamp-1 flex-1">{q.query}</p>
                    <span className={`text-[10px] shrink-0 font-medium px-2 py-0.5 rounded-full ${
                      q.status === 'success'
                        ? 'text-emerald-400 bg-emerald-400/10'
                        : q.status === 'error'
                          ? 'text-red-400 bg-red-400/10'
                          : 'text-amber-400 bg-amber-400/10'
                    }`}>
                      {q.status}
                    </span>
                  </div>
                  {q.answer && (
                    <p className="text-[11px] text-slate-600 mt-1 line-clamp-2">{q.answer}</p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Actions — spans 2 cols */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-2xl bg-white/3 border border-white/8 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <Zap className="h-4 w-4 text-slate-500" />
              Quick Actions
            </h2>
            <div className="space-y-2">
              {[
                { label: 'Manage Documents', sub: 'Ingest PDFs, URLs & Notion', href: '/dashboard/documents', icon: FileText, color: 'text-indigo-400' },
                { label: 'Preview Chatbot', sub: 'Test the live widget now', href: '/chat', icon: MessageSquare, color: 'text-emerald-400' },
                { label: 'View Settings', sub: 'Embed script & white-label', href: '/dashboard/settings', icon: CheckCircle2, color: 'text-purple-400' },
              ].map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/8 transition-all group"
                >
                  <div className={`h-8 w-8 rounded-lg bg-white/5 flex items-center justify-center ${action.color} shrink-0`}>
                    <action.icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-slate-300 group-hover:text-white transition-colors">{action.label}</div>
                    <div className="text-[10px] text-slate-600">{action.sub}</div>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-slate-600 group-hover:text-slate-400 transition-colors shrink-0" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
