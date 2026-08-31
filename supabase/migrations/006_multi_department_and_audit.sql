-- ==============================================================================
-- 006_multi_department_and_audit.sql
-- Enterprise Multi-Department RBAC, Universal General Access, Allowed Domains & Audit Trail
-- ==============================================================================

-- 1. Multi-Department Array in public.profiles
do $$
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'departments'
  ) then
    alter table public.profiles add column departments text[] not null default array['general']::text[];
  end if;
end $$;

-- Backfill existing single department_id into departments array if not already done
update public.profiles
set departments = array[coalesce(department_id, 'general')]::text[]
where departments is null or departments = array['general']::text[] and department_id is not null and department_id <> 'general';

-- 2. Domain Whitelisting in public.settings
do $$
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'settings' and column_name = 'allowed_domains'
  ) then
    alter table public.settings add column allowed_domains text[] default array[]::text[];
  end if;
end $$;

-- 3. Administrative Audit Logs Table
create table if not exists public.audit_logs (
  id uuid default gen_random_uuid() primary key,
  actor_id uuid references auth.users(id) on delete set null,
  actor_email text,
  action text not null,          -- e.g. 'USER_CREATED', 'USER_UPDATED', 'USER_DELETED', 'DOC_INGESTED', 'DOC_DELETED'
  target_resource text,          -- e.g. 'user: employee@company.com' or 'doc: Q3_Financials.pdf'
  details jsonb default '{}'::jsonb,
  created_at timestamptz default now() not null
);

create index if not exists idx_audit_logs_created_at on public.audit_logs(created_at desc);
create index if not exists idx_audit_logs_action on public.audit_logs(action);

alter table public.audit_logs enable row level security;

-- Drop existing policies if needed
drop policy if exists "Admins can read all audit logs" on public.audit_logs;
drop policy if exists "Service role can insert audit logs" on public.audit_logs;

create policy "Admins can read all audit logs"
  on public.audit_logs for select
  using (public.is_admin());

create policy "Admins and service role can insert audit logs"
  on public.audit_logs for insert
  with check (true);

-- 4. Upgrade Vector Retrieval Match Function (Universal 'general' access + Multi-Department Array)
drop function if exists public.match_chunks_rbac(vector(1536), double precision, integer, text, text);
drop function if exists public.match_chunks_rbac(vector(1536), double precision, integer, text[], text);

create or replace function public.match_chunks_rbac(
  query_embedding vector(1536),
  match_threshold double precision default 0.5,
  match_count integer default 5,
  user_depts text[] default array['general']::text[],
  user_role text default 'employee'
)
returns table (
  id uuid,
  document_id uuid,
  content text,
  metadata jsonb,
  department_id text,
  minimum_role text,
  similarity double precision
)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select
    dc.id,
    dc.document_id,
    dc.content,
    dc.metadata,
    dc.department_id,
    dc.minimum_role,
    1 - (dc.embedding <=> query_embedding) as similarity
  from public.document_chunks dc
  where 
    -- 1. Department Boundary: User's assigned departments OR universal 'general' partition OR global admin
    (
      dc.department_id = any(user_depts)
      or dc.department_id = 'general'
      or user_role = 'admin'
    )
    -- 2. Role Clearance Boundary: User weight must be >= Chunk weight
    and public.get_role_weight(user_role) >= public.get_role_weight(dc.minimum_role)
    -- 3. Similarity threshold
    and (1 - (dc.embedding <=> query_embedding)) >= match_threshold
  order by dc.embedding <=> query_embedding
  limit match_count;
$$;
