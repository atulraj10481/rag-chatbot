import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { deleteFromR2 } from '@/lib/r2/client';

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get document metadata to check R2 key
    const { data: doc } = await supabase
      .from('documents')
      .select('name, department_id, r2_key')
      .eq('id', id)
      .single();

    if (doc?.r2_key) {
      await deleteFromR2(doc.r2_key);
    }

    // Delete document record (cascade deletes document_chunks)
    const { error } = await supabase
      .from('documents')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log audit event
    const { createAdminClient } = await import('@/lib/supabase/server');
    const adminClient = createAdminClient();
    await adminClient.from('audit_logs').insert({
      actor_id: user.id,
      actor_email: user.email,
      action: 'DOC_DELETED',
      target_resource: `doc: ${doc?.name || id}`,
      details: {
        docId: id,
        name: doc?.name,
        department: doc?.department_id,
      },
    });

    return NextResponse.json({ success: true, id });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
