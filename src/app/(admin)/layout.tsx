import Link from "next/link";
import { ReactNode } from "react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Sidebar } from "@/components/admin/sidebar";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

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
        <header className="h-16 w-full flex items-center justify-end px-8 border-b border-white/5 glass sticky top-0 z-30">
          {user && (
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-slate-400">{user.email}</span>
              <form action={handleSignOut}>
                <Button type="submit" variant="ghost" size="sm" className="text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-full px-4 transition-colors">
                  Sign Out
                </Button>
              </form>
            </div>
          )}
        </header>

        {/* Main Content Area */}
        <div className="p-8 relative z-10">
          {children}
        </div>
      </main>
    </div>
  );
}
