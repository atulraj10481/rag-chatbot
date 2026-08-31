import { ReactNode } from "react";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Sidebar } from "@/components/admin/sidebar";
import { ChangePasswordModal } from "@/components/auth/ChangePasswordModal";
import { ShieldCheck } from "lucide-react";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Strict RBAC Verification for Admin Portal
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

  const handleSignOut = async () => {
    'use server';
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect('/login');
  };

  return (
    <div className="flex min-h-screen w-full bg-background relative selection:bg-primary/30">
      <Sidebar />
      
      <main className="flex-1 ml-64 min-h-screen flex flex-col relative z-0 overflow-x-hidden">
        {/* Subtle background glow effect */}
        <div className="fixed top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none" />
        <div className="fixed bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-500/10 blur-[120px] pointer-events-none" />
        
        {/* Top Header */}
        <header className="h-16 w-full flex items-center justify-between px-8 border-b border-white/5 glass sticky top-0 z-30">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.1)]">
              <ShieldCheck size={13} />
              Administrator Clearance
            </span>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-xs font-medium text-slate-400 font-mono">{user.email}</span>
            <div className="w-px h-4 bg-white/10" />
            <ChangePasswordModal />
            <form action={handleSignOut}>
              <Button type="submit" variant="ghost" size="sm" className="text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg px-3 transition-colors h-8">
                Sign Out
              </Button>
            </form>
          </div>
        </header>

        {/* Main Content Area */}
        <div className="p-8 relative z-10">
          {children}
        </div>
      </main>
    </div>
  );
}
