-- Enable pg_cron extension (requires superuser, Supabase allows this for postgres user)
create extension if not exists pg_cron;

-- Create a function to evict old cache entries
create or replace function evict_stale_cache(days_to_keep int default 30)
returns int
language plpgsql
security definer
as $$
declare
  deleted_count int;
begin
  delete from query_cache 
  where created_at < now() - (days_to_keep || ' days')::interval;
  
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

-- Schedule it to run every day at midnight (UTC)
select cron.schedule(
  'evict-query-cache-daily',
  '0 0 * * *',
  $$ select evict_stale_cache(30) $$
);
