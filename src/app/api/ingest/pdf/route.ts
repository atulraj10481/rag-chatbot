import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { processPDF } from '@/lib/ingestion/pdf';
import { generateEmbeddings } from '@/lib/rag/embeddings';
import { uploadToR2 } from '@/lib/r2/client';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const departmentId = (formData.get('department_id') as string) || 'general';
    const minimumRole = (formData.get('minimum_role') as string) || 'employee';

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json({ error: 'File must be a PDF' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 1. Calculate Hash to prevent exact duplicates
    const crypto = require('crypto');
    const fileHash = crypto.createHash('sha256').update(buffer).digest('hex');
    
    const { data: existingDoc } = await supabase
      .from('documents')
      .select('id')
      .eq('hash', fileHash)
      .maybeSingle();

    if (existingDoc) {
      return NextResponse.json({ error: 'This exact document has already been ingested' }, { status: 409 });
    }

    // 2. Determine version and archive older ones
    const { data: previousDocs } = await supabase
      .from('documents')
      .select('version')
      .eq('name', file.name)
      .eq('source_type', 'pdf')
      .order('version', { ascending: false })
      .limit(1);

    const version = previousDocs && previousDocs.length > 0 ? previousDocs[0].version + 1 : 1;

    if (version > 1) {
      await supabase
        .from('documents')
        .update({ archived: true })
        .eq('name', file.name)
        .eq('source_type', 'pdf');
    }

    // 3. Create document record in pending state with department and minimum_role
    const { data: doc, error: docError } = await supabase
      .from('documents')
      .insert({
        name: file.name,
        source_type: 'pdf',
        status: 'processing',
        version,
        hash: fileHash,
        trust_score: 1.0, // High trust for explicitly uploaded PDFs
        department_id: departmentId,
        minimum_role: minimumRole,
      })
      .select()
      .single();

    if (docError || !doc) {
      return NextResponse.json({ error: `Failed to create document record: ${docError?.message}` }, { status: 500 });
    }

    // Async process PDF contents
    try {
      // 1. Upload to R2 (optional)
      const r2Key = `documents/${doc.id}/original.pdf`;
      await uploadToR2(r2Key, buffer, 'application/pdf');

      // 2. Parse text and split chunks
      const { pageCount, chunks } = await processPDF(buffer);

      if (chunks.length === 0) {
        throw new Error('PDF contains no extractable text');
      }

      // 3. Batch generate embeddings
      const chunkTexts = chunks.map(c => c.content);
      const embeddings = await generateEmbeddings(chunkTexts);

      // 4. Prepare chunk records with partition department_id
      const chunkRecords = chunks.map((chunk, idx) => ({
        document_id: doc.id,
        department_id: departmentId,
        minimum_role: minimumRole,
        content: chunk.content,
        embedding: embeddings[idx],
        metadata: {
          ...chunk.metadata,
          page_num: chunk.metadata.page_num || 1,
        },
      }));

      // 5. Store vector chunks in pgvector using adminClient for reliable partition inserts
      const { createAdminClient } = await import('@/lib/supabase/server');
      const adminClient = createAdminClient();
      const { error: chunkError } = await adminClient
        .from('document_chunks')
        .insert(chunkRecords);

      if (chunkError) {
        throw new Error(`Failed to store vector chunks: ${chunkError.message}`);
      }

      // 6. Update document status to ready
      await supabase
        .from('documents')
        .update({
          status: 'ready',
          r2_key: r2Key,
          page_count: pageCount,
          chunk_count: chunks.length,
          updated_at: new Date().toISOString(),
        })
        .eq('id', doc.id);

      // Log audit event
      await adminClient.from('audit_logs').insert({
        actor_id: user.id,
        actor_email: user.email,
        action: 'DOC_INGESTED',
        target_resource: `doc: ${file.name}`,
        details: {
          docId: doc.id,
          sourceType: 'pdf',
          department: departmentId,
          minimumRole,
          chunksCount: chunks.length,
        },
      });

      return NextResponse.json({
        success: true,
        document: {
          id: doc.id,
          name: file.name,
          chunk_count: chunks.length,
          page_count: pageCount,
        },
      });
    } catch (err: any) {
      console.error('PDF ingestion pipeline error:', err);

      await supabase
        .from('documents')
        .update({
          status: 'error',
          error_message: err.message || 'Processing failed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', doc.id);

      return NextResponse.json({ error: err.message || 'Failed to process PDF' }, { status: 500 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
