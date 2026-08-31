import { redirect } from 'next/navigation';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import ChatInterface from '@/components/chat/chat-interface';

export default async function EmployeePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const adminClient = createAdminClient();
  const { data: profile } = await adminClient
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="mb-4 shrink-0">
        <h2 className="text-2xl font-bold tracking-tight">Employee Portal</h2>
        <p className="text-muted-foreground">Ask questions about your {profile?.department_id} department documents.</p>
      </div>

      <div className="flex-1 bg-card border rounded-xl overflow-hidden relative">
        <ChatInterface />
      </div>
    </div>
  );
}
