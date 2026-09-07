-- Create head_to_head_cache to hold the last-fetched head-to-head payload per match.

create table if not exists public.head_to_head_cache (
  id          bigint generated always as identity primary key,
  match_id    bigint not null unique,
  data        jsonb not null,
  updated_at  timestamptz not null default now()
);

comment on table public.head_to_head_cache is 'Cached head-to-head payload per football-data.org match id, refreshed periodically from the upstream API.';

drop trigger if exists set_head_to_head_cache_updated_at on public.head_to_head_cache;
create trigger set_head_to_head_cache_updated_at
  before update on public.head_to_head_cache
  for each row
  execute function public.set_updated_at();
