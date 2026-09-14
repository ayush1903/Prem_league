-- Create history_content, curated copy for the homepage "Premier League
-- Icons" storytelling section (one row per manager/era card). Same
-- draft/published + RLS pattern as club_content/transfers.

create table if not exists public.history_content (
  id                    bigint generated always as identity primary key,
  manager_name          text not null,
  club_name             text not null,
  era_label             text,
  photo_url             text,
  headline_stat         text not null,
  headline_stat_label   text not null,
  summary               text,
  sort_order            integer not null default 0,
  status                text not null default 'draft'
                          check (status in ('draft', 'published')),
  updated_at            timestamptz not null default now(),
  unique (manager_name)
);

comment on table public.history_content is 'Editorial manager/era cards for the homepage "Premier League Icons" section.';

-- Reuses the trigger function created in 0001_create_club_content_and_transfers.sql.
drop trigger if exists set_history_content_updated_at on public.history_content;
create trigger set_history_content_updated_at
  before update on public.history_content
  for each row
  execute function public.set_updated_at();

alter table public.history_content enable row level security;

drop policy if exists "Public can read published history_content" on public.history_content;
create policy "Public can read published history_content"
  on public.history_content
  for select
  to public
  using (status = 'published');
