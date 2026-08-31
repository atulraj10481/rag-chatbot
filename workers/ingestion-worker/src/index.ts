import { createClient } from '@supabase/supabase-js';

export interface Env {
  DOCUMENT_BUCKET: R2Bucket;
  AI: any; // Cloudflare Workers AI binding
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}

interface QueueMessage {
  documentId: string;
  r2Key: string;
  departmentId: string;
  minimumRole: string;
}

export default {
  // Queue consumer handler
  async queue(batch: MessageBatch<QueueMessage>, env: Env, ctx: ExecutionContext): Promise<void> {
    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

    for (const message of batch.messages) {
      try {
        console.log(`Processing document: ${message.body.documentId}`);
        
        // 1. Fetch file from R2
        const object = await env.DOCUMENT_BUCKET.get(message.body.r2Key);
        if (!object) {
          throw new Error(`R2 object not found: ${message.body.r2Key}`);
        }
        const fileContent = await object.text(); // Assuming text files for this example

        // 2. Semantic Chunking (Simplified fixed-size with overlap for now)
        const chunks = chunkText(fileContent, 1000, 200);

        // 3. Generate Embeddings & Insert into partitioned Supabase table
        for (let i = 0; i < chunks.length; i++) {
          const textChunk = chunks[i];
          
          // Generate embedding using Cloudflare Workers AI (bge-base-en-v1.5)
          const response = await env.AI.run('@cf/baai/bge-base-en-v1.5', {
            text: [textChunk]
          });
          
          const embedding = response.data[0];

          // Insert into partitioned table
          const { error } = await supabase
            .from('document_chunks')
            .insert({
              document_id: message.body.documentId,
              department_id: message.body.departmentId,
              content: textChunk,
              embedding: embedding,
              minimum_role: message.body.minimumRole,
              metadata: { chunk_index: i, total_chunks: chunks.length }
            });

          if (error) throw error;
        }

        // 4. Update document status
        await supabase
          .from('documents')
          .update({ status: 'ready', chunk_count: chunks.length })
          .eq('id', message.body.documentId);

        message.ack();
      } catch (error) {
        console.error(`Error processing message:`, error);
        
        // Mark as failed in Supabase
        await supabase
          .from('documents')
          .update({ status: 'error', error_message: (error as Error).message })
          .eq('id', message.body.documentId);
          
        message.retry();
      }
    }
  },
};

// Simple overlapping chunker
function chunkText(text: string, chunkSize: number, overlap: number): string[] {
  const chunks: string[] = [];
  let i = 0;
  while (i < text.length) {
    chunks.push(text.slice(i, i + chunkSize));
    i += chunkSize - overlap;
  }
  return chunks;
}
