-- Create club_content and transfers tables, with RLS restricting
-- public SELECT access to rows where status = 'published'.

-- ---------------------------------------------------------------------------
-- club_content
-- ---------------------------------------------------------------------------
create table if not exists public.club_content (
  id                 bigint generated always as identity primary key,
  club_name          text not null,
  manager            text,
  formation          text,
  club_summary       text,
  playstyle_summary  text,
  status             text not null default 'draft'
                       check (status in ('draft', 'published')),
  updated_at         timestamptz not null default now()
);

comment on table public.club_content is 'Editorial content (summary, manager, formation) for a club.';

-- Keep updated_at current on every row change.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_club_content_updated_at on public.club_content;
create trigger set_club_content_updated_at
  before update on public.club_content
  for each row
  execute function public.set_updated_at();

alter table public.club_content enable row level security;

drop policy if exists "Public can read published club_content" on public.club_content;
create policy "Public can read published club_content"
  on public.club_content
  for select
  to public
  using (status = 'published');

-- ---------------------------------------------------------------------------
-- transfers
-- ---------------------------------------------------------------------------
create table if not exists public.transfers (
  id            bigint generated always as identity primary key,
  club_name     text not null,
  player_name   text not null,
  type          text check (type in ('in', 'out', 'rumour')),
  fee           text,
  source_name   text,
  date_logged   timestamptz not null default now(),
  status        text not null default 'draft'
                  check (status in ('draft', 'published'))
);

comment on table public.transfers is 'Logged transfer activity (in/out/rumour) per club.';

alter table public.transfers enable row level security;

drop policy if exists "Public can read published transfers" on public.transfers;
create policy "Public can read published transfers"
  on public.transfers
  for select
  to public
  using (status = 'published');
