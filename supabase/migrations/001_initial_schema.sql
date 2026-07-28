-- Enable pgvector extension
create extension if not exists vector with schema extensions;

-- 1. documents table
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

create index idx_documents_source_type on documents(source_type);
create index idx_documents_status on documents(status);

alter table documents enable row level security;
create policy "Admin full access" on documents
  for all using (auth.role() = 'authenticated');

-- 2. document_chunks table
create table document_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  content text not null,                 -- The text chunk
  embedding extensions.vector(1536),     -- OpenAI text-embedding-3-small (via OpenRouter)
  metadata jsonb not null default '{}',  -- { page_num, section_title, chunk_index, total_chunks }
  created_at timestamptz default now()
);

create index idx_document_chunks_embedding
  on document_chunks
  using hnsw (embedding vector_cosine_ops)
  with (ef_construction = 64, m = 16);

create index idx_document_chunks_document_id on document_chunks(document_id);

alter table document_chunks enable row level security;
create policy "Admin full access" on document_chunks
  for all using (auth.role() = 'authenticated');
create policy "Public read for chat" on document_chunks
  for select using (true);  -- Needed for RAG retrieval (called server-side)

-- Match function (Semantic Search)
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

-- 3. chat_sessions table
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

alter table chat_sessions enable row level security;
create policy "Public session access" on chat_sessions
  for all using (visitor_id = current_setting('app.current_visitor_id', true));
create policy "Admin full access" on chat_sessions
  for all using (auth.role() = 'authenticated');

-- 4. chat_messages table
create table chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references chat_sessions(id) on delete cascade,
  role text not null,                    -- 'user' | 'assistant' | 'system'
  content text not null,
  model text,                            -- Which model generated the response
  sources jsonb,                         -- Array of cited chunks
  retrieval_chunks jsonb,                -- All retrieved chunks (for debugging)
  tokens_used int,                       -- Total tokens (input + output)
  latency_ms int,                        -- Response generation time
  created_at timestamptz default now()
);

create index idx_chat_messages_session_id on chat_messages(session_id);
create index idx_chat_messages_created_at on chat_messages(created_at);

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

-- 5. query_logs table
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

alter table query_logs enable row level security;
create policy "Admin full access" on query_logs
  for all using (auth.role() = 'authenticated');

-- 6. settings table
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

insert into settings (id) values (1) on conflict do nothing;

alter table settings enable row level security;
create policy "Public read" on settings for select using (true);
create policy "Admin write" on settings 
  for all using (auth.role() = 'authenticated');

-- 7. notion_connections table
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

alter table notion_connections enable row level security;
create policy "Admin full access" on notion_connections
  for all using (auth.role() = 'authenticated');
