# Data Models

> Single-tenant schema (no `org_id`). Each customer deployment is completely isolated. All tables use Row Level Security (RLS) with admin-only policies.

---

## Database: Supabase PostgreSQL + pgvector

### 1. `documents` — Source Documents

Stores metadata about uploaded/scraped documents. Original files live in Cloudflare R2.

```sql
create table documents (
  id uuid primary key default gen_random_uuid(),
  name text not null,                    -- Display name (e.g., "Employee Handbook.pdf")
  source_type text not null,             -- 'pdf' | 'notion' | 'url'
  source_url text,                       -- Original URL (for notion/url) or R2 key (for pdf)
  r2_key text,                           -- Cloudflare R2 object key (for PDFs)
  page_count int,                        -- Number of pages (PDFs)
  status text not null default 'pending',-- 'pending' | 'processing' | 'ready' | 'error'
  error_message text,                    -- If processing failed
  chunk_count int default 0,             -- Number of chunks generated
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Index for filtering by source type
create index idx_documents_source_type on documents(source_type);
create index idx_documents_status on documents(status);
```

**RLS Policy:**
```sql
alter table documents enable row level security;
create policy "Admin full access" on documents
  for all using (auth.role() = 'authenticated');
```

---

### 2. `document_chunks` — Vector Embeddings

Stores text chunks with their vector embeddings for semantic search.

```sql
-- Enable pgvector extension
create extension if not exists vector with schema extensions;

-- Create chunks table
create table document_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  content text not null,                 -- The text chunk
  embedding extensions.vector(1536),     -- OpenAI text-embedding-3-small
  metadata jsonb not null default '{}',  -- { page_num, section_title, chunk_index, total_chunks }
  created_at timestamptz default now()
);

-- HNSW index for fast approximate nearest neighbor search
create index idx_document_chunks_embedding
  on document_chunks
  using hnsw (embedding vector_cosine_ops)
  with (ef_construction = 64, m = 16);

-- Index for document lookup
create index idx_document_chunks_document_id on document_chunks(document_id);
```

**RLS Policy:**
```sql
alter table document_chunks enable row level security;
create policy "Admin full access" on document_chunks
  for all using (auth.role() = 'authenticated');
create policy "Public read for chat" on document_chunks
  for select using (true);  -- Needed for RAG retrieval (called server-side)
```

**Match Function (Semantic Search):**
```sql
create or replace function match_chunks(
  query_embedding extensions.vector(1536),
  match_threshold float,
  match_count int
)
returns table (
  id uuid,
  document_id uuid,
  content text,
  metadata jsonb,
  similarity float
)
language sql stable
as $$
  select
    document_chunks.id,
    document_chunks.document_id,
    document_chunks.content,
    document_chunks.metadata,
    1 - (document_chunks.embedding <=> query_embedding) as similarity
  from document_chunks
  where 1 - (document_chunks.embedding <=> query_embedding) > match_threshold
  order by similarity desc
  limit match_count;
$$;
```

---

### 3. `chat_sessions` — Conversation Threads

Groups messages into conversation threads.

```sql
create table chat_sessions (
  id uuid primary key default gen_random_uuid(),
  visitor_id text not null,              -- Anonymous visitor fingerprint (no auth required)
  visitor_name text,                     -- Optional name capture
  visitor_email text,                    -- Optional email capture
  source text default 'standalone',      -- 'standalone' | 'widget' | 'api'
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_chat_sessions_visitor_id on chat_sessions(visitor_id);
create index idx_chat_sessions_created_at on chat_sessions(created_at);
```

**RLS Policy:**
```sql
alter table chat_sessions enable row level security;
-- Public can create/read their own sessions (by visitor_id)
create policy "Public session access" on chat_sessions
  for all using (visitor_id = current_setting('app.current_visitor_id', true));
-- Admin can see all
create policy "Admin full access" on chat_sessions
  for all using (auth.role() = 'authenticated');
```

---

### 4. `chat_messages` — Individual Messages

Stores all messages (user + assistant) with retrieval metadata.

```sql
create table chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references chat_sessions(id) on delete cascade,
  role text not null,                    -- 'user' | 'assistant' | 'system'
  content text not null,
  model text,                            -- Which model generated the response (e.g., 'anthropic/claude-sonnet-4')
  sources jsonb,                         -- Array of cited chunks: [{doc_id, doc_name, content, page_num, similarity}]
  retrieval_chunks jsonb,                -- All retrieved chunks (for debugging)
  tokens_used int,                       -- Total tokens (input + output)
  latency_ms int,                        -- Response generation time
  created_at timestamptz default now()
);

create index idx_chat_messages_session_id on chat_messages(session_id);
create index idx_chat_messages_created_at on chat_messages(created_at);
```

**RLS Policy:**
```sql
alter table chat_messages enable row level security;
create policy "Public message access" on chat_messages
  for select using (
    session_id in (
      select id from chat_sessions 
      where visitor_id = current_setting('app.current_visitor_id', true)
    )
  );
create policy "Admin full access" on chat_messages
  for all using (auth.role() = 'authenticated');
```

---

### 5. `query_logs` — Analytics & Monitoring

Aggregated view for admin dashboard analytics.

```sql
create table query_logs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references chat_sessions(id),
  query text not null,                   -- The user's question
  answer text,                           -- Generated answer (null if failed)
  model text,                            -- Model used
  sources_count int default 0,           -- Number of sources cited
  top_similarity float,                  -- Similarity score of top retrieved chunk
  status text not null default 'success',-- 'success' | 'no_results' | 'error' | 'unanswered'
  error_message text,
  tokens_input int,
  tokens_output int,
  cost_estimate float,                   -- Estimated cost in USD
  latency_ms int,
  created_at timestamptz default now()
);

create index idx_query_logs_created_at on query_logs(created_at);
create index idx_query_logs_status on query_logs(status);
create index idx_query_logs_top_similarity on query_logs(top_similarity);
```

**RLS Policy:**
```sql
alter table query_logs enable row level security;
create policy "Admin full access" on query_logs
  for all using (auth.role() = 'authenticated');
```

---

### 6. `settings` — White-label Configuration

Per-deployment configuration (no multi-tenant needed).

```sql
create table settings (
  id int primary key default 1,          -- Singleton table (only row 1)
  chatbot_name text default 'Company Assistant',
  welcome_message text default 'Hi! How can I help you today?',
  primary_color text default '#3b82f6',  -- Hex color
  logo_url text,                         -- R2 public URL
  favicon_url text,
  suggested_questions text[] default '{}', -- Array of suggested starter questions
  model_preference text default 'auto',  -- 'auto' | 'cheap' | 'standard' | 'premium'
  similarity_threshold float default 0.7,-- Min similarity for retrieval
  max_chunks int default 5,              -- Top-k chunks to retrieve
  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  constraint single_row check (id = 1)
);

-- Insert default row
insert into settings (id) values (1) on conflict do nothing;
```

**RLS Policy:**
```sql
alter table settings enable row level security;
-- Public can read settings (needed for widget theming)
create policy "Public read" on settings for select using (true);
create policy "Admin write" on settings 
  for all using (auth.role() = 'authenticated');
```

---

### 7. `notion_connections` — Notion OAuth Tokens

Stores Notion integration tokens for syncing.

```sql
create table notion_connections (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null unique,     -- Notion workspace ID
  workspace_name text,
  access_token text not null,            -- Encrypted OAuth token
  bot_id text,
  synced_pages uuid[] default '{}',      -- Array of synced Notion page IDs
  last_synced_at timestamptz,
  created_at timestamptz default now()
);
```

**RLS Policy:**
```sql
alter table notion_connections enable row level security;
create policy "Admin full access" on notion_connections
  for all using (auth.role() = 'authenticated');
```

---

## TypeScript Types

```typescript
// types/index.ts

export interface Document {
  id: string;
  name: string;
  source_type: 'pdf' | 'notion' | 'url';
  source_url?: string;
  r2_key?: string;
  page_count?: number;
  status: 'pending' | 'processing' | 'ready' | 'error';
  error_message?: string;
  chunk_count: number;
  created_at: string;
  updated_at: string;
}

export interface DocumentChunk {
  id: string;
  document_id: string;
  content: string;
  metadata: {
    page_num?: number;
    section_title?: string;
    chunk_index: number;
    total_chunks: number;
  };
  similarity?: number;  // Only present in search results
}

export interface ChatSession {
  id: string;
  visitor_id: string;
  visitor_name?: string;
  visitor_email?: string;
  source: 'standalone' | 'widget' | 'api';
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  model?: string;
  sources?: SourceCitation[];
  retrieval_chunks?: DocumentChunk[];
  tokens_used?: number;
  latency_ms?: number;
  created_at: string;
}

export interface SourceCitation {
  document_id: string;
  document_name: string;
  content: string;
  page_num?: number;
  similarity: number;
}

export interface QueryLog {
  id: string;
  session_id?: string;
  query: string;
  answer?: string;
  model?: string;
  sources_count: number;
  top_similarity?: number;
  status: 'success' | 'no_results' | 'error' | 'unanswered';
  error_message?: string;
  tokens_input?: number;
  tokens_output?: number;
  cost_estimate?: number;
  latency_ms?: number;
  created_at: string;
}

export interface Settings {
  id: number;
  chatbot_name: string;
  welcome_message: string;
  primary_color: string;
  logo_url?: string;
  favicon_url?: string;
  suggested_questions: string[];
  model_preference: 'auto' | 'cheap' | 'standard' | 'premium';
  similarity_threshold: number;
  max_chunks: number;
  created_at: string;
  updated_at: string;
}

export interface NotionConnection {
  id: string;
  workspace_id: string;
  workspace_name?: string;
  access_token: string;
  bot_id?: string;
  synced_pages: string[];
  last_synced_at?: string;
  created_at: string;
}
```

---

## Cloudflare R2 Object Structure

```
r2-bucket/
├── documents/
│   ├── {document_id}/
│   │   └── original.pdf           -- Original uploaded PDF
│   └── ...
├── logos/
│   └── {settings_id}/logo.png     -- White-label logo
└── exports/
    └── query-logs-{date}.csv      -- Admin export
```

**R2 CORS Configuration:**
```json
{
  "CORSRules": [
    {
      "AllowedOrigins": ["*"],
      "AllowedMethods": ["GET", "HEAD"],
      "AllowedHeaders": ["*"],
      "MaxAgeSeconds": 3600
    }
  ]
}
```

---

## Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# OpenRouter
OPENROUTER_API_KEY=sk-or-v1-...

# Cloudflare R2
R2_ENDPOINT=https://xxxx.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=rag-chatbot-docs
R2_PUBLIC_URL=https://pub-xxxx.r2.dev

# Notion (for OAuth)
NOTION_CLIENT_ID=...
NOTION_CLIENT_SECRET=...
NOTION_REDIRECT_URI=https://your-app.vercel.app/api/auth/notion/callback

# App
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```
