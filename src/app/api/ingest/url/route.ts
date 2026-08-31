import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { scrapeAndProcessURL } from '@/lib/ingestion/url';
import { generateEmbeddings } from '@/lib/rag/embeddings';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { url, department_id, minimum_role } = body || {};
    const departmentId = (department_id as string) || 'general';
    const minimumRole = (minimum_role as string) || 'employee';

    if (!url || typeof url !== 'string' || !url.startsWith('http')) {
      return NextResponse.json({ error: 'Valid URL is required' }, { status: 400 });
    }

    // 1. Scrape URL
    const { title, chunks } = await scrapeAndProcessURL(url);

    const rawText = chunks.map(c => c.content).join('');
    const crypto = require('crypto');
    const fileHash = crypto.createHash('sha256').update(rawText).digest('hex');

    const { data: existingDoc } = await supabase
      .from('documents')
      .select('id')
      .eq('hash', fileHash)
      .maybeSingle();

    if (existingDoc) {
      return NextResponse.json({ error: 'This exact URL content has already been ingested' }, { status: 409 });
    }

    const sourceUrl = url;

    const { data: previousDocs } = await supabase
      .from('documents')
      .select('version')
      .eq('source_url', sourceUrl)
      .order('version', { ascending: false })
      .limit(1);

    const version = previousDocs && previousDocs.length > 0 ? previousDocs[0].version + 1 : 1;

    if (version > 1) {
      await supabase
        .from('documents')
        .update({ archived: true })
        .eq('source_url', sourceUrl);
    }

    // 2. Create document record
    const { data: doc, error: docError } = await supabase
      .from('documents')
      .insert({
        name: title,
        source_type: 'url',
        source_url: sourceUrl,
        status: 'processing',
        version,
        hash: fileHash,
        trust_score: 0.8, // URLs are slightly lower trust than uploaded PDFs
        department_id: departmentId,
        minimum_role: minimumRole,
      })
      .select()
      .single();

    if (docError || !doc) {
      return NextResponse.json({ error: `Failed to create document record: ${docError?.message}` }, { status: 500 });
    }

    try {
      // 3. Batch generate embeddings
      const chunkTexts = chunks.map(c => c.content);
      const embeddings = await generateEmbeddings(chunkTexts);

      // 4. Prepare chunk records
      const chunkRecords = chunks.map((chunk, idx) => ({
        document_id: doc.id,
        department_id: departmentId,
        minimum_role: minimumRole,
        content: chunk.content,
        embedding: embeddings[idx],
        metadata: chunk.metadata,
      }));

      // 5. Store vector chunks
      const { createAdminClient } = await import('@/lib/supabase/server');
      const adminClient = createAdminClient();
      const { error: chunkError } = await adminClient
        .from('document_chunks')
        .insert(chunkRecords);

      if (chunkError) {
        throw new Error(`Failed to store vector chunks: ${chunkError.message}`);
      }

      // 6. Mark document as ready
      await supabase
        .from('documents')
        .update({
          status: 'ready',
          chunk_count: chunks.length,
          updated_at: new Date().toISOString(),
        })
        .eq('id', doc.id);

      // Log audit event
      await adminClient.from('audit_logs').insert({
        actor_id: user.id,
        actor_email: user.email,
        action: 'DOC_INGESTED',
        target_resource: `doc: ${title}`,
        details: {
          docId: doc.id,
          sourceType: 'url',
          department: departmentId,
          minimumRole,
          chunksCount: chunks.length,
        },
      });

      return NextResponse.json({
        success: true,
        document: {
          id: doc.id,
          name: title,
          source_url: url,
          chunk_count: chunks.length,
        },
      });
    } catch (err: any) {
      await supabase
        .from('documents')
        .update({
          status: 'error',
          error_message: err.message || 'Processing failed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', doc.id);

      return NextResponse.json({ error: err.message || 'Failed to process URL' }, { status: 500 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
