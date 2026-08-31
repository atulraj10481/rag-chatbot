import { createClient, createAdminClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { 
  FileText, 
  MessageSquare, 
  AlertTriangle, 
  Database, 
  ArrowRight, 
  Zap, 
  CheckCircle2, 
  Users, 
  Layers, 
  ShieldCheck,
  Server
} from 'lucide-react';

const DEPARTMENTS = [
  { id: 'general', name: 'General & Global', color: 'from-blue-500/20 to-blue-500/5', border: 'border-blue-500/20', text: 'text-blue-400' },
  { id: 'marketing', name: 'Marketing', color: 'from-pink-500/20 to-pink-500/5', border: 'border-pink-500/20', text: 'text-pink-400' },
  { id: 'finance', name: 'Finance & Accounts', color: 'from-emerald-500/20 to-emerald-500/5', border: 'border-emerald-500/20', text: 'text-emerald-400' },
  { id: 'sales', name: 'Sales & Revenue', color: 'from-amber-500/20 to-amber-500/5', border: 'border-amber-500/20', text: 'text-amber-400' },
  { id: 'operations', name: 'Operations', color: 'from-cyan-500/20 to-cyan-500/5', border: 'border-cyan-500/20', text: 'text-cyan-400' },
  { id: 'hr', name: 'Human Resources', color: 'from-purple-500/20 to-purple-500/5', border: 'border-purple-500/20', text: 'text-purple-400' },
  { id: 'tech', name: 'Engineering & Tech', color: 'from-indigo-500/20 to-indigo-500/5', border: 'border-indigo-500/20', text: 'text-indigo-400' },
  { id: 'admin', name: 'Admin Restricted', color: 'from-red-500/20 to-red-500/5', border: 'border-red-500/20', text: 'text-red-400' },
];

export default async function DashboardOverviewPage() {
  const supabase = await createClient();
  const adminClient = createAdminClient();

  const [
    { count: docsCount }, 
    { count: queryCount }, 
    { count: unansweredCount }, 
    { count: cacheCount },
    { count: usersCount }
  ] = await Promise.all([
    supabase.from('documents').select('*', { count: 'exact', head: true }).eq('archived', false),
    supabase.from('query_logs').select('*', { count: 'exact', head: true }),
    supabase.from('query_logs').select('*', { count: 'exact', head: true }).eq('status', 'unanswered'),
    supabase.from('query_cache').select('*', { count: 'exact', head: true }),
    adminClient.from('profiles').select('*', { count: 'exact', head: true }),
  ]);

  const { data: recentQueries } = await supabase
    .from('query_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  const stats = [
    {
      label: 'Knowledge Sources',
      value: docsCount ?? 0,
      sub: 'Active ingested documents',
      icon: FileText,
      color: 'from-indigo-500/20 to-indigo-500/5',
      iconColor: 'text-indigo-400',
      glow: 'shadow-indigo-500/10',
    },
    {
      label: 'Active Staff & Users',
      value: usersCount ?? 0,
      sub: 'RBAC allocated profiles',
      icon: Users,
      color: 'from-cyan-500/20 to-cyan-500/5',
      iconColor: 'text-cyan-400',
      glow: 'shadow-cyan-500/10',
      href: '/dashboard/users',
    },
    {
      label: 'Total Queries',
      value: queryCount ?? 0,
      sub: 'Logged assistant conversations',
      icon: MessageSquare,
      color: 'from-emerald-500/20 to-emerald-500/5',
      iconColor: 'text-emerald-400',
      glow: 'shadow-emerald-500/10',
    },
    {
      label: 'Cached Responses',
      value: cacheCount ?? 0,
      sub: 'Sub-50ms vector cache hits',
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
          <p className="text-sm text-slate-400 mt-1">
            Enterprise RAG pipeline health, storage partitioning, and staff intelligence hub.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 rounded-full px-3 py-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
            HNSW Partitions Healthy
          </span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className={`rounded-2xl bg-gradient-to-b ${stat.color} border border-white/8 p-5 shadow-lg ${stat.glow} hover:border-white/15 transition-all duration-300 group relative`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`h-9 w-9 rounded-xl bg-white/5 flex items-center justify-center border border-white/8 group-hover:bg-white/10 transition-colors ${stat.iconColor}`}>
                <stat.icon className="h-4 w-4" />
              </div>
              {stat.href && (
                <Link href={stat.href} className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-0.5">
                  Manage &rarr;
                </Link>
              )}
            </div>
            <div className="text-3xl font-extrabold text-white tracking-tight">{stat.value}</div>
            <div className="text-xs font-semibold text-slate-300 mt-1">{stat.label}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">{stat.sub}</div>
          </div>
        ))}
      </div>

      {/* Enterprise Partitions Health Grid */}
      <div className="rounded-2xl bg-white/3 border border-white/8 p-6 space-y-4 shadow-xl backdrop-blur-xl">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <Layers className="h-4 w-4 text-indigo-400" />
              Enterprise Department Partition Architecture (PostgreSQL List-Partitioning)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Vector chunks are physically isolated across 8 dedicated tables with independent HNSW vector indexes.
            </p>
          </div>
          <span className="text-xs font-mono text-slate-400 bg-white/5 px-2.5 py-1 rounded-md border border-white/10">
            8 / 8 Active Partitions
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          {DEPARTMENTS.map((dept) => (
            <div
              key={dept.id}
              className={`rounded-xl bg-gradient-to-b ${dept.color} border ${dept.border} p-3.5 flex flex-col justify-between`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs font-bold ${dept.text}`}>{dept.name}</span>
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
              </div>
              <div className="text-[10px] text-slate-400 font-mono flex items-center justify-between">
                <span>chunks_{dept.id}</span>
                <span className="text-emerald-400 font-medium">HNSW ON</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* Recent Queries — spans 3 cols */}
        <div className="lg:col-span-3 rounded-2xl bg-white/3 border border-white/8 overflow-hidden shadow-xl">
          <div className="p-5 border-b border-white/5 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-slate-400" />
              Recent Query Logs
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
                        ? 'text-emerald-400 bg-emerald-400/10 border border-emerald-400/20'
                        : q.status === 'error'
                          ? 'text-red-400 bg-red-400/10 border border-red-400/20'
                          : 'text-amber-400 bg-amber-400/10 border border-amber-400/20'
                    }`}>
                      {q.status}
                    </span>
                  </div>
                  {q.answer && (
                    <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">{q.answer}</p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Actions — spans 2 cols */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-2xl bg-white/3 border border-white/8 p-5 space-y-4 shadow-xl">
            <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <Zap className="h-4 w-4 text-slate-400" />
              Quick Actions
            </h2>
            <div className="space-y-2">
              {[
                { label: 'Staff & Role Management', sub: 'Provision accounts & assign depts', href: '/dashboard/users', icon: Users, color: 'text-cyan-400' },
                { label: 'Manage Knowledge Docs', sub: 'Ingest PDFs, URLs & Notion', href: '/dashboard/documents', icon: FileText, color: 'text-indigo-400' },
                { label: 'Live Assistant Preview', sub: 'Test standalone chat & citations', href: '/chat', icon: MessageSquare, color: 'text-emerald-400' },
                { label: 'Widget & System Settings', sub: 'Embed script & white-label', href: '/dashboard/settings', icon: CheckCircle2, color: 'text-purple-400' },
              ].map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/8 transition-all group"
                >
                  <div className={`h-8 w-8 rounded-lg bg-white/5 flex items-center justify-center ${action.color} shrink-0 border border-white/5`}>
                    <action.icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-slate-300 group-hover:text-white transition-colors">{action.label}</div>
                    <div className="text-[10px] text-slate-500">{action.sub}</div>
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
