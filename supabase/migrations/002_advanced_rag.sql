-- Phase 1: Database & Schema Upgrades for Advanced RAG

-- 1. documents table upgrades
alter table documents add column if not exists version int default 1;
alter table documents add column if not exists hash text;
alter table documents add column if not exists archived boolean default false;
alter table documents add column if not exists trust_score float default 1.0;

create index if not exists idx_documents_hash on documents(hash);
create index if not exists idx_documents_archived on documents(archived);

-- 2. document_chunks table upgrades (PostgreSQL Full-Text Search)
alter table document_chunks add column if not exists fts tsvector generated always as (to_tsvector('english', content)) stored;
create index if not exists idx_document_chunks_fts on document_chunks using gin (fts);

-- 3. query_logs table upgrades
alter table query_logs add column if not exists hallucination_score float;
alter table query_logs add column if not exists hybrid_ranks jsonb;
alter table query_logs add column if not exists token_attribution jsonb;

-- 4. query_cache table (Semantic Caching)
create table if not exists query_cache (
  id uuid primary key default gen_random_uuid(),
  query_hash text not null unique, -- SHA-256 of the normalized query
  query text not null,
  answer text not null,
  model text,
  sources jsonb,
  embedding extensions.vector(1536), -- For semantic hit matching
  hit_count int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_query_cache_embedding
  on query_cache
  using hnsw (embedding vector_cosine_ops)
  with (ef_construction = 64, m = 16);

create index if not exists idx_query_cache_hash on query_cache(query_hash);

alter table query_cache enable row level security;
create policy "Admin full access" on query_cache for all using (auth.role() = 'authenticated');
create policy "Public read for cache" on query_cache for select using (true);

-- 5. Hybrid Search RPC (RRF + Trust Score Re-ranking)
create or replace function hybrid_search(
  query_text text,
  query_embedding extensions.vector(1536),
  match_count int,
  full_text_weight float default 1.0,
  semantic_weight float default 1.0,
  rrf_k int default 60
)
returns table (
  id uuid,
  document_id uuid,
  content text,
  metadata jsonb,
  similarity float,
  rrf_score float,
  trust_score float
)
language sql stable
as $$
  with semantic_search as (
    select
      dc.id,
      1 - (dc.embedding <=> query_embedding) as similarity,
      row_number() over (order by dc.embedding <=> query_embedding) as rank
    from document_chunks dc
    join documents d on d.id = dc.document_id
    where d.archived = false
    order by dc.embedding <=> query_embedding
    limit match_count * 2
  ),
  keyword_search as (
    select
      dc.id,
      ts_rank(dc.fts, websearch_to_tsquery('english', query_text)) as fts_rank_score,
      row_number() over (order by ts_rank(dc.fts, websearch_to_tsquery('english', query_text)) desc) as rank
    from document_chunks dc
    join documents d on d.id = dc.document_id
    where d.archived = false
      and dc.fts @@ websearch_to_tsquery('english', query_text)
    order by ts_rank(dc.fts, websearch_to_tsquery('english', query_text)) desc
    limit match_count * 2
  )
  select
    dc.id,
    dc.document_id,
    dc.content,
    dc.metadata,
    coalesce(ss.similarity, 0.0) as similarity,
    -- Reciprocal Rank Fusion multiplied by trust_score
    (
      (coalesce(semantic_weight * (1.0 / (rrf_k + ss.rank)), 0.0)) +
      (coalesce(full_text_weight * (1.0 / (rrf_k + ks.rank)), 0.0))
    ) * coalesce(d.trust_score, 1.0) as rrf_score,
    coalesce(d.trust_score, 1.0) as trust_score
  from document_chunks dc
  join documents d on d.id = dc.document_id
  full outer join semantic_search ss on ss.id = dc.id
  full outer join keyword_search ks on ks.id = dc.id
  where (ss.id is not null or ks.id is not null)
  order by rrf_score desc
  limit match_count;
$$;

-- 6. match_cache RPC (Semantic Caching)
create or replace function match_cache(
  query_embedding extensions.vector(1536),
  match_threshold float
)
returns table (
  id uuid,
  answer text,
  model text,
  sources jsonb,
  similarity float
)
language sql stable
as $$
  select
    id,
    answer,
    model,
    sources,
    1 - (embedding <=> query_embedding) as similarity
  from query_cache
  where 1 - (embedding <=> query_embedding) > match_threshold
  order by similarity desc
  limit 1;
$$;

