-- Create standings_cache to hold the last-fetched league table payload.

create table if not exists public.standings_cache (
  id          bigint generated always as identity primary key,
  data        jsonb not null,
  updated_at  timestamptz not null default now()
);

comment on table public.standings_cache is 'Cached league standings payload, refreshed periodically from the upstream API.';

drop trigger if exists set_standings_cache_updated_at on public.standings_cache;
create trigger set_standings_cache_updated_at
  before update on public.standings_cache
  for each row
  execute function public.set_updated_at();
