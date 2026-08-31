-- Phase 1: Enterprise Scaling & Segregation for RAG Chatbot (RESET SCRIPT)

-- 1. Profiles & RLS
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles 
  add column if not exists email text,
  add column if not exists department_id text not null default 'general',
  add column if not exists role text not null default 'employee' check (role in ('admin', 'manager', 'employee'));

alter table public.profiles enable row level security;
drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile" on public.profiles for select using (auth.uid() = id);

-- Fix infinite recursion in RLS by using a security definer function
create or replace function public.is_admin() 
returns boolean as $$
begin
  return exists (
    select 1 from public.profiles 
    where id = auth.uid() and role = 'admin'
  );
end;
$$ language plpgsql security definer set search_path = public;

drop policy if exists "Admins can read all profiles" on public.profiles;
create policy "Admins can read all profiles" on public.profiles for select using (
  public.is_admin()
);

-- Trigger to automatically create profile for new users
create or replace function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.profiles (id, email, department_id, role)
  values (new.id, new.email, 'general', 'employee');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2. Documents table
alter table documents 
  add column if not exists department_id text not null default 'general',
  add column if not exists minimum_role text not null default 'employee' check (minimum_role in ('admin', 'manager', 'employee'));

create or replace function get_role_weight(role_name text) returns int as $$
begin
  return case 
    when role_name = 'admin' then 3
    when role_name = 'manager' then 2
    when role_name = 'employee' then 1
    else 0
  end;
end;
$$ language plpgsql immutable;


-- 3. Partitioning: Clean Reset
-- Since this is the setup phase, we will simply drop the old table and recreate it
-- The CASCADE keyword automatically drops all partitions and dependencies as well!
DROP TABLE IF EXISTS document_chunks CASCADE;

-- Now recreate everything cleanly from scratch
create table document_chunks (
  id uuid default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  department_id text not null,
  content text not null,
  embedding extensions.vector(1536),
  metadata jsonb not null default '{}',
  minimum_role text not null default 'employee',
  created_at timestamptz default now(),
  primary key (id, department_id)
) partition by list (department_id);

-- Create partitions
create table document_chunks_general partition of document_chunks for values in ('general');
create table document_chunks_marketing partition of document_chunks for values in ('marketing');
create table document_chunks_finance partition of document_chunks for values in ('finance');
create table document_chunks_sales partition of document_chunks for values in ('sales');
create table document_chunks_operations partition of document_chunks for values in ('operations');
create table document_chunks_hr partition of document_chunks for values in ('hr');
create table document_chunks_tech partition of document_chunks for values in ('tech');
create table document_chunks_admin partition of document_chunks for values in ('admin');

-- Create Indexes
create index idx_document_chunks_general_embedding on document_chunks_general using hnsw (embedding vector_cosine_ops) with (ef_construction = 64, m = 16);
create index idx_document_chunks_marketing_embedding on document_chunks_marketing using hnsw (embedding vector_cosine_ops) with (ef_construction = 64, m = 16);
create index idx_document_chunks_finance_embedding on document_chunks_finance using hnsw (embedding vector_cosine_ops) with (ef_construction = 64, m = 16);
create index idx_document_chunks_sales_embedding on document_chunks_sales using hnsw (embedding vector_cosine_ops) with (ef_construction = 64, m = 16);
create index idx_document_chunks_operations_embedding on document_chunks_operations using hnsw (embedding vector_cosine_ops) with (ef_construction = 64, m = 16);
create index idx_document_chunks_hr_embedding on document_chunks_hr using hnsw (embedding vector_cosine_ops) with (ef_construction = 64, m = 16);
create index idx_document_chunks_tech_embedding on document_chunks_tech using hnsw (embedding vector_cosine_ops) with (ef_construction = 64, m = 16);
create index idx_document_chunks_admin_embedding on document_chunks_admin using hnsw (embedding vector_cosine_ops) with (ef_construction = 64, m = 16);

-- Enable RLS
alter table document_chunks enable row level security;

drop policy if exists "Permission aware retrieval" on document_chunks;
create policy "Permission aware retrieval" on document_chunks
  for select using (
    exists (
      select 1 from public.profiles p 
      where p.id = auth.uid() 
      and (p.department_id = document_chunks.department_id or p.role = 'admin')
      and get_role_weight(p.role) >= get_role_weight(document_chunks.minimum_role)
    )
  );

-- 4. Match function
create or replace function match_chunks_rbac(
  query_embedding extensions.vector(1536),
  match_threshold float,
  match_count int,
  user_dept text,
  user_role text
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
    and (document_chunks.department_id = user_dept or user_role = 'admin')
    and get_role_weight(user_role) >= get_role_weight(document_chunks.minimum_role)
  order by similarity desc
  limit match_count;
$$;
