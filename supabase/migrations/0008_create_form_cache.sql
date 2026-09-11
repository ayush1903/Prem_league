-- Create form_cache to hold the last-fetched finished-matches payload used
-- to compute each club's "last 5" form strip (current + previous season,
-- merged, since standings_cache's own `form` field isn't populated on the
-- free tier).

create table if not exists public.form_cache (
  id          bigint generated always as identity primary key,
  data        jsonb not null,
  updated_at  timestamptz not null default now()
);

comment on table public.form_cache is 'Cached finished PL matches (current + previous season), refreshed periodically, used to compute each club''s last-5 form.';

drop trigger if exists set_form_cache_updated_at on public.form_cache;
create trigger set_form_cache_updated_at
  before update on public.form_cache
  for each row
  execute function public.set_updated_at();
