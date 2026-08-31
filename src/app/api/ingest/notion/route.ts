import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { fetchAndProcessNotionPage } from '@/lib/ingestion/notion';
import { generateEmbeddings } from '@/lib/rag/embeddings';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { pageId, department_id, minimum_role } = body || {};
    const departmentId = (department_id as string) || 'general';
    const minimumRole = (minimum_role as string) || 'employee';

    if (!pageId) {
      return NextResponse.json({ error: 'pageId is required' }, { status: 400 });
    }

    // Get active Notion connection
    const { data: notionConn, error: connError } = await supabase
      .from('notion_connections')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (connError || !notionConn) {
      return NextResponse.json({ error: 'No active Notion connection found. Connect Notion first.' }, { status: 400 });
    }

    // 1. Fetch & parse page
    const { title, chunks } = await fetchAndProcessNotionPage(notionConn.access_token, pageId);

    const rawText = chunks.map(c => c.content).join('');
    const crypto = require('crypto');
    const fileHash = crypto.createHash('sha256').update(rawText).digest('hex');

    const { data: existingDoc } = await supabase
      .from('documents')
      .select('id')
      .eq('hash', fileHash)
      .maybeSingle();

    if (existingDoc) {
      return NextResponse.json({ error: 'This exact Notion page content has already been ingested' }, { status: 409 });
    }

    const sourceUrl = `https://notion.so/${pageId.replace(/-/g, '')}`;

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
        source_type: 'notion',
        source_url: sourceUrl,
        status: 'processing',
        version,
        hash: fileHash,
        trust_score: 0.9, // Internal documentation gets high trust score
        department_id: departmentId,
        minimum_role: minimumRole,
      })
      .select()
      .single();

    if (docError || !doc) {
      return NextResponse.json({ error: `Failed to create document record: ${docError?.message}` }, { status: 500 });
    }

    try {
      // 3. Batch generate embeddings via OpenRouter
      const chunkTexts = chunks.map(c => c.content);
      const embeddings = await generateEmbeddings(chunkTexts);

      // 4. Prepare vector records
      const chunkRecords = chunks.map((chunk, idx) => ({
        document_id: doc.id,
        department_id: departmentId,
        minimum_role: minimumRole,
        content: chunk.content,
        embedding: embeddings[idx],
        metadata: chunk.metadata,
      }));

      // 5. Store vector chunks in pgvector
      const { createAdminClient } = await import('@/lib/supabase/server');
      const adminClient = createAdminClient();
      const { error: chunkError } = await adminClient
        .from('document_chunks')
        .insert(chunkRecords);

      if (chunkError) {
        throw new Error(`Failed to store vector chunks: ${chunkError.message}`);
      }

      // 6. Update document status
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
          sourceType: 'notion',
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
          chunk_count: chunks.length,
        },
      });
    } catch (err: any) {
      await supabase
        .from('documents')
        .update({
          status: 'error',
          error_message: err.message || 'Notion sync failed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', doc.id);

      return NextResponse.json({ error: err.message || 'Notion processing error' }, { status: 500 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
