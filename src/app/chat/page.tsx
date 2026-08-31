import { redirect } from 'next/navigation';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export default async function StandaloneChatPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Redirect to role-appropriate portal
  const adminClient = createAdminClient();
  const { data: profile } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role === 'admin') {
    redirect('/dashboard');
  } else if (profile?.role === 'manager') {
    redirect('/manager');
  } else {
    redirect('/employee');
  }
}
