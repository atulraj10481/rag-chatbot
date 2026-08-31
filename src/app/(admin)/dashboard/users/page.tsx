import { redirect } from 'next/navigation';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { CreateUserModal } from '@/components/admin/CreateUserModal';
import { EditUserModal } from '@/components/admin/EditUserModal';
import { Users, Shield, Building2, UserCheck, ShieldCheck, Briefcase, Sparkles } from 'lucide-react';
import Link from 'next/link';

export default async function DashboardUsersPage() {
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

  // Fetch all user profiles with latest first
  const { data: allProfiles } = await adminClient
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  const profiles = allProfiles || [];
  const adminCount = profiles.filter((p) => p.role === 'admin').length;
  const managerCount = profiles.filter((p) => p.role === 'manager').length;
  const employeeCount = profiles.filter((p) => p.role === 'employee').length;

  const departmentCounts = new Set(profiles.map((p) => p.department_id)).size;

  return (
    <div className="space-y-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400 bg-indigo-400/10 px-2.5 py-0.5 rounded-full border border-indigo-400/20">
              Access Control & RBAC
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">User Management</h1>
          <p className="text-sm text-slate-400 mt-1">
            Provision employee & manager accounts, assign mandatory department partitions, and manage credentials.
          </p>
        </div>
        <CreateUserModal />
      </div>

      {/* Quick Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl bg-gradient-to-b from-indigo-500/20 to-indigo-500/5 border border-white/8 p-5 shadow-lg shadow-indigo-500/10">
          <div className="flex items-center justify-between mb-3">
            <div className="h-9 w-9 rounded-xl bg-white/5 flex items-center justify-center border border-white/8 text-indigo-400">
              <Users className="h-4 w-4" />
            </div>
            <span className="text-xs text-slate-400 font-medium">All Staff</span>
          </div>
          <div className="text-3xl font-extrabold text-white tracking-tight">{profiles.length}</div>
          <div className="text-xs font-semibold text-slate-300 mt-1">Total Users</div>
        </div>

        <div className="rounded-2xl bg-gradient-to-b from-red-500/20 to-red-500/5 border border-white/8 p-5 shadow-lg shadow-red-500/10">
          <div className="flex items-center justify-between mb-3">
            <div className="h-9 w-9 rounded-xl bg-white/5 flex items-center justify-center border border-white/8 text-red-400">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <span className="text-xs text-red-400/80 font-medium">Level 3 Access</span>
          </div>
          <div className="text-3xl font-extrabold text-white tracking-tight">{adminCount}</div>
          <div className="text-xs font-semibold text-slate-300 mt-1">Administrators</div>
        </div>

        <div className="rounded-2xl bg-gradient-to-b from-amber-500/20 to-amber-500/5 border border-white/8 p-5 shadow-lg shadow-amber-500/10">
          <div className="flex items-center justify-between mb-3">
            <div className="h-9 w-9 rounded-xl bg-white/5 flex items-center justify-center border border-white/8 text-amber-400">
              <Briefcase className="h-4 w-4" />
            </div>
            <span className="text-xs text-amber-400/80 font-medium">Level 2 Access</span>
          </div>
          <div className="text-3xl font-extrabold text-white tracking-tight">{managerCount}</div>
          <div className="text-xs font-semibold text-slate-300 mt-1">Managers</div>
        </div>

        <div className="rounded-2xl bg-gradient-to-b from-emerald-500/20 to-emerald-500/5 border border-white/8 p-5 shadow-lg shadow-emerald-500/10">
          <div className="flex items-center justify-between mb-3">
            <div className="h-9 w-9 rounded-xl bg-white/5 flex items-center justify-center border border-white/8 text-emerald-400">
              <Building2 className="h-4 w-4" />
            </div>
            <span className="text-xs text-emerald-400/80 font-medium">Partitions</span>
          </div>
          <div className="text-3xl font-extrabold text-white tracking-tight">{departmentCounts}</div>
          <div className="text-xs font-semibold text-slate-300 mt-1">Active Departments</div>
        </div>
      </div>

      {/* Users Table Card */}
      <div className="rounded-2xl bg-white/3 border border-white/8 overflow-hidden shadow-xl backdrop-blur-xl">
        <div className="p-5 border-b border-white/5 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <Users className="h-4 w-4 text-slate-400" />
              Company Staff Directory
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Click the edit icon on any profile to reassign role, change department, or reset password.</p>
          </div>
          <span className="text-xs text-slate-400 bg-white/5 px-3 py-1 rounded-full border border-white/10">
            {profiles.length} Active Records
          </span>
        </div>

        {/* Table Header */}
        <div className="grid grid-cols-12 gap-4 px-6 py-3 font-semibold border-b border-white/5 bg-white/2 text-xs text-slate-400 uppercase tracking-wider">
          <div className="col-span-4">User Account</div>
          <div className="col-span-3">Role & Clearance</div>
          <div className="col-span-3">Department Partition</div>
          <div className="col-span-2 text-right">Actions</div>
        </div>

        {/* Table Rows */}
        <div className="divide-y divide-white/5">
          {profiles.map((p) => {
            const isSelf = p.id === user.id;
            return (
              <div
                key={p.id}
                className="grid grid-cols-12 gap-4 px-6 py-4 items-center text-sm hover:bg-white/4 transition-colors duration-150 group"
              >
                {/* User Email & Avatar */}
                <div className="col-span-4 flex items-center gap-3 min-w-0">
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 border
                    ${p.role === 'admin' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                      p.role === 'manager' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                      'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'}`}>
                    {(p.email?.[0] || 'U').toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium text-slate-200 truncate flex items-center gap-2">
                      {p.email || `ID: ${p.id.slice(0, 8)}`}
                      {isSelf && (
                        <span className="text-[10px] text-indigo-400 bg-indigo-500/10 px-1.5 py-0.2 rounded border border-indigo-500/20">
                          You
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 truncate font-mono">
                      {p.id.slice(0, 18)}...
                    </div>
                  </div>
                </div>

                {/* Role Badge */}
                <div className="col-span-3">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold capitalize border
                    ${p.role === 'admin' ? 'bg-red-500/10 text-red-400 border-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.1)]' : 
                      p.role === 'manager' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.1)]' : 
                      'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_10px_rgba(52,211,153,0.1)]'}`}>
                    {p.role === 'admin' ? <ShieldCheck size={13} /> : p.role === 'manager' ? <Briefcase size={13} /> : <UserCheck size={13} />}
                    {p.role}
                  </span>
                </div>

                {/* Department Partitions */}
                <div className="col-span-3 flex flex-wrap items-center gap-1.5">
                  {(p.departments && p.departments.length > 0 ? p.departments : [p.department_id || 'general']).map((dept: string) => (
                    <span
                      key={dept}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-xs text-slate-300 capitalize font-medium"
                    >
                      <Building2 size={10} className="text-indigo-400" />
                      {dept}
                    </span>
                  ))}
                </div>

                {/* Action Trigger */}
                <div className="col-span-2 flex items-center justify-end gap-1">
                  <EditUserModal user={p} />
                </div>
              </div>
            );
          })}

          {profiles.length === 0 && (
            <div className="p-12 text-center text-slate-500">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No user accounts found in database.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
