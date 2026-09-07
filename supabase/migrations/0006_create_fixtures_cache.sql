-- Create fixtures_cache to hold the last-fetched fixtures payload per competition.

create table if not exists public.fixtures_cache (
  id                bigint generated always as identity primary key,
  competition_code  text not null unique,
  data              jsonb not null,
  updated_at        timestamptz not null default now()
);

comment on table public.fixtures_cache is 'Cached fixtures payload per competition, refreshed periodically from the upstream API.';

drop trigger if exists set_fixtures_cache_updated_at on public.fixtures_cache;
create trigger set_fixtures_cache_updated_at
  before update on public.fixtures_cache
  for each row
  execute function public.set_updated_at();
