import { redirect } from 'next/navigation';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { ChangePasswordModal } from '@/components/auth/ChangePasswordModal';
import { LogoutButton } from '@/components/auth/LogoutButton';

export default async function RolesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch their role from the profiles table using elevated adminClient
  const adminClient = createAdminClient();
  let { data: profile } = await adminClient
    .from('profiles')
    .select('role, department_id, departments')
    .eq('id', user.id)
    .single();

  if (!profile) {
    // If somehow they don't have a profile yet, auto-create a fallback profile
    const { data: newProfile } = await adminClient
      .from('profiles')
      .upsert({
        id: user.id,
        email: user.email,
        role: 'employee',
        department_id: 'general',
        departments: ['general']
      })
      .select('role, department_id, departments')
      .single();
    profile = newProfile;
  }

  if (!profile) {
    return <div>Access Denied. No RBAC profile found.</div>;
  }

  const assignedDepts = profile.departments && profile.departments.length > 0 
    ? profile.departments 
    : [profile.department_id || 'general'];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Universal Roles Header */}
      <header className="border-b px-6 py-4 flex items-center justify-between bg-card shrink-0">
        <h1 className="font-bold text-lg">Enterprise Portal</h1>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
            <span className="capitalize border px-2.5 py-1 rounded-lg bg-muted/30 font-semibold text-white">
              Role: {profile.role}
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-400">Depts:</span>
              {assignedDepts.map((d: string) => (
                <span key={d} className="capitalize border px-2 py-0.5 rounded-md bg-indigo-500/10 border-indigo-500/20 text-indigo-300 text-xs font-medium">
                  {d}
                </span>
              ))}
            </div>
          </div>
          <div className="w-px h-6 bg-border mx-2"></div>
          <div className="flex items-center gap-2">
            <ChangePasswordModal />
            <LogoutButton />
          </div>
        </div>
      </header>
      
      <main className="p-6 flex-1 overflow-auto flex flex-col relative">
        {children}
      </main>
    </div>
  );
}
