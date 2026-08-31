'use server';

import { createClient, createAdminClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export async function loginAction(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { error: 'Email and password are required.' };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message };
  }

  const adminClient = createAdminClient();
  let { data: profile } = await adminClient
    .from('profiles')
    .select('role, department_id')
    .eq('id', data.user.id)
    .single();

  // If user has no profile row yet in the database:
  if (!profile) {
    const { count } = await adminClient.from('profiles').select('*', { count: 'exact', head: true });
    const newRole = count === 0 ? 'admin' : 'employee';
    const newDept = count === 0 ? 'admin' : 'general';

    await adminClient.from('profiles').insert({
      id: data.user.id,
      email: email,
      role: newRole,
      department_id: newDept,
      departments: [newDept]
    });

    profile = { role: newRole, department_id: newDept };
  }

  if (profile.role === 'admin') {
    redirect('/dashboard');
  } else if (profile.role === 'manager') {
    redirect('/manager');
  } else {
    redirect('/employee');
  }
}

export async function updatePasswordAction(formData: FormData) {
  try {
    const password = formData.get('password') as string;

    if (!password) {
      return { error: 'Password is required.' };
    }
    
    if (password.length < 6) {
      return { error: 'Password must be at least 6 characters long.' };
    }

    const supabase = await createClient();
    
    // update the user's password in Supabase Auth
    const { error } = await supabase.auth.updateUser({
      password: password
    });

    if (error) {
      return { error: error.message };
    }

    return { success: true, message: 'Password updated successfully!' };
  } catch (error: any) {
    return { error: error.message || 'An unexpected error occurred.' };
  }
}
