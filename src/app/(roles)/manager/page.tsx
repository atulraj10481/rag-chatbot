import { redirect } from 'next/navigation';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import ChatInterface from '@/components/chat/chat-interface';
import { Shield } from 'lucide-react';

export default async function ManagerPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const adminClient = createAdminClient();
  const { data: profile } = await adminClient
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'manager' && profile?.role !== 'admin') {
    redirect('/employee');
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="mb-4 shrink-0 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Manager Portal</h2>
          <p className="text-muted-foreground">You have elevated access to {profile?.department_id} department documents.</p>
        </div>
        <div className="bg-amber-500/10 text-amber-500 border border-amber-500/20 px-3 py-1.5 rounded-lg flex items-center gap-2 text-sm font-medium">
          <Shield size={16} />
          Elevated RBAC Active
        </div>
      </div>

      <div className="flex-1 bg-card border rounded-xl overflow-hidden relative border-amber-500/20 shadow-[0_0_20px_rgba(245,158,11,0.05)]">
        <ChatInterface />
      </div>
    </div>
  );
}
