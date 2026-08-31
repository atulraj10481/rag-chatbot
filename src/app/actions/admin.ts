'use server';

import { createAdminClient, createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

// Helper to record administrative audit events
async function logAuditEvent(
  actorId: string | undefined,
  actorEmail: string | undefined,
  action: string,
  targetResource: string,
  details: Record<string, any>
) {
  try {
    const adminClient = createAdminClient();
    await adminClient.from('audit_logs').insert({
      actor_id: actorId,
      actor_email: actorEmail,
      action,
      target_resource: targetResource,
      details,
    });
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
}

export async function createUserAction(formData: FormData) {
  try {
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const role = formData.get('role') as string;
    
    // Parse multiple departments
    const departmentsRaw = formData.get('departments') as string;
    let departments: string[] = ['general'];
    if (departmentsRaw) {
      try {
        departments = JSON.parse(departmentsRaw);
      } catch {
        departments = [departmentsRaw];
      }
    }
    if (departments.length === 0) departments = ['general'];

    if (!email || !password || !role) {
      return { error: 'Email, Password, and Role are required.' };
    }

    // 1. Verify the current user is an Admin
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Unauthorized.' };

    const adminClient = createAdminClient();
    const { data: profile } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return { error: 'Forbidden: Only administrators can create users.' };
    }

    // 2. Create the user using the Admin Client
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm the email
    });

    if (authError) {
      return { error: authError.message };
    }

    if (!authData.user) {
      return { error: 'Failed to create user.' };
    }

    // 3. Create or update their profile with role and departments
    const { error: profileError } = await adminClient
      .from('profiles')
      .upsert({ 
        id: authData.user.id,
        email: email,
        role: role, 
        department_id: departments[0] || 'general',
        departments: departments,
      });

    if (profileError) {
      return { error: `User created in Auth, but profile update failed: ${profileError.message}` };
    }

    // 4. Log Audit Event
    await logAuditEvent(user.id, user.email, 'USER_CREATED', `user: ${email}`, {
      userId: authData.user.id,
      role,
      departments,
    });

    revalidatePath('/dashboard/users');
    revalidatePath('/dashboard/audit');
    return { success: true, message: 'User created successfully!' };
  } catch (error: any) {
    return { error: error.message || 'An unexpected error occurred.' };
  }
}

export async function updateUserAction(formData: FormData) {
  try {
    const userId = formData.get('userId') as string;
    const role = formData.get('role') as string;
    const password = formData.get('password') as string;

    // Parse multiple departments
    const departmentsRaw = formData.get('departments') as string;
    let departments: string[] = ['general'];
    if (departmentsRaw) {
      try {
        departments = JSON.parse(departmentsRaw);
      } catch {
        departments = [departmentsRaw];
      }
    }
    if (departments.length === 0) departments = ['general'];

    if (!userId || !role) {
      return { error: 'User ID and Role are required.' };
    }

    // 1. Verify acting user is Admin
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Unauthorized.' };

    const adminClient = createAdminClient();
    const { data: profile } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return { error: 'Forbidden: Only administrators can update users.' };
    }

    // 2. Fetch old user profile for audit trail diff
    const { data: oldProfile } = await adminClient
      .from('profiles')
      .select('email, role, departments, department_id')
      .eq('id', userId)
      .single();

    // 3. Update profiles table
    const { error: profileError } = await adminClient
      .from('profiles')
      .update({ 
        role, 
        department_id: departments[0] || 'general',
        departments: departments,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (profileError) {
      return { error: `Profile update failed: ${profileError.message}` };
    }

    // 4. Optional password reset
    let passwordReset = false;
    if (password && password.trim().length >= 6) {
      const { error: authError } = await adminClient.auth.admin.updateUserById(userId, {
        password: password.trim(),
      });
      if (authError) {
        return { error: `Profile updated, but password reset failed: ${authError.message}` };
      }
      passwordReset = true;
    }

    // 5. Log Audit Event
    await logAuditEvent(user.id, user.email, 'USER_UPDATED', `user: ${oldProfile?.email || userId}`, {
      userId,
      previousRole: oldProfile?.role,
      newRole: role,
      previousDepartments: oldProfile?.departments || [oldProfile?.department_id],
      newDepartments: departments,
      passwordReset,
    });

    revalidatePath('/dashboard/users');
    revalidatePath('/dashboard/audit');
    return { success: true, message: 'User updated successfully!' };
  } catch (error: any) {
    return { error: error.message || 'An unexpected error occurred.' };
  }
}

export async function deleteUserAction(userId: string) {
  try {
    if (!userId) return { error: 'User ID is required.' };

    // 1. Verify acting user is Admin
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Unauthorized.' };

    if (user.id === userId) {
      return { error: 'You cannot delete your own Administrator account.' };
    }

    const adminClient = createAdminClient();
    const { data: profile } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return { error: 'Forbidden: Only administrators can delete users.' };
    }

    // Fetch user email for audit log
    const { data: userProfile } = await adminClient
      .from('profiles')
      .select('email, role, departments')
      .eq('id', userId)
      .single();

    // 2. Delete user from auth (cascades to profiles)
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);
    if (deleteError) {
      return { error: deleteError.message };
    }

    // Also explicitly delete profile just in case cascade is disabled
    await adminClient.from('profiles').delete().eq('id', userId);

    // 3. Log Audit Event
    await logAuditEvent(user.id, user.email, 'USER_DELETED', `user: ${userProfile?.email || userId}`, {
      userId,
      role: userProfile?.role,
      departments: userProfile?.departments,
    });

    revalidatePath('/dashboard/users');
    revalidatePath('/dashboard/audit');
    return { success: true, message: 'User deleted successfully!' };
  } catch (error: any) {
    return { error: error.message || 'An unexpected error occurred.' };
  }
}
