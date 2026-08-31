import { redirect } from 'next/navigation';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { ShieldAlert, Activity, User, FileText, Calendar, Clock, Terminal } from 'lucide-react';
import { AuditLog } from '@/types';

export default async function AuditTrailPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const adminClient = createAdminClient();
  const { data: profile } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    if (profile?.role === 'manager') redirect('/manager');
    redirect('/employee');
  }

  // Fetch recent audit logs
  const { data: auditLogs } = await adminClient
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  const logs: AuditLog[] = auditLogs || [];

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'USER_CREATED':
        return <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 rounded-full px-2.5 py-0.5">USER CREATED</span>;
      case 'USER_UPDATED':
        return <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-400 bg-sky-400/10 border border-sky-400/20 rounded-full px-2.5 py-0.5">USER UPDATED</span>;
      case 'USER_DELETED':
        return <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-400 bg-red-400/10 border border-red-400/20 rounded-full px-2.5 py-0.5">USER DELETED</span>;
      case 'DOC_INGESTED':
        return <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-400 bg-purple-400/10 border border-purple-400/20 rounded-full px-2.5 py-0.5">DOC INGESTED</span>;
      case 'DOC_DELETED':
        return <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-full px-2.5 py-0.5">DOC DELETED</span>;
      default:
        return <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 bg-white/5 border border-white/10 rounded-full px-2.5 py-0.5">{action}</span>;
    }
  };

  return (
    <div className="space-y-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-red-400 bg-red-400/10 px-2.5 py-0.5 rounded-full border border-red-400/20">
              Compliance & Security
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Administrative Audit Trail</h1>
          <p className="text-sm text-slate-400 mt-1">
            Immutable system activity log recording all user provisioning, role assignments, department changes, and document actions.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400 bg-white/5 px-3.5 py-2 rounded-xl border border-white/10">
          <Activity className="h-4 w-4 text-emerald-400 animate-pulse" />
          <span>Live Audit Stream Active</span>
        </div>
      </div>

      {/* Logs Table Card */}
      <div className="rounded-2xl bg-white/3 border border-white/8 overflow-hidden shadow-xl backdrop-blur-xl">
        <div className="p-5 border-b border-white/5 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-red-400" />
            Security & Mutation Events
          </h2>
          <span className="text-xs text-slate-400 bg-white/5 px-3 py-1 rounded-full border border-white/10">
            {logs.length} Total Events Logged
          </span>
        </div>

        {logs.length === 0 ? (
          <div className="p-16 text-center text-slate-500">
            <Activity className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium text-slate-400">No administrative events recorded yet.</p>
            <p className="text-xs text-slate-600 mt-1">Actions like creating users, modifying departments, or deleting records will appear here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-white/5 bg-white/2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="px-6 py-3.5">Timestamp</th>
                  <th className="px-6 py-3.5">Event Type</th>
                  <th className="px-6 py-3.5">Admin Actor</th>
                  <th className="px-6 py-3.5">Target Resource</th>
                  <th className="px-6 py-3.5">Event Metadata</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-white/3 transition-colors">
                    <td className="px-6 py-4 text-xs font-mono text-slate-400 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-slate-500" />
                        {new Date(log.created_at).toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getActionBadge(log.action)}
                    </td>
                    <td className="px-6 py-4 text-xs font-mono text-slate-300">
                      <div className="flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-indigo-400" />
                        {log.actor_email || 'System'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs font-medium text-slate-200">
                      {log.target_resource || '—'}
                    </td>
                    <td className="px-6 py-4 text-xs">
                      {log.details && Object.keys(log.details).length > 0 ? (
                        <pre className="p-2 rounded-lg bg-black/40 border border-white/5 font-mono text-[11px] text-slate-400 max-w-xs truncate overflow-hidden">
                          {JSON.stringify(log.details)}
                        </pre>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
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
