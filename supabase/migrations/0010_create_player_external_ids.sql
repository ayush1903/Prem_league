-- Create player_external_ids, a mapping table between our FPL-sourced
-- squad data (clubs.squad[].id) and API-Football's player IDs. Populated
-- (and safe to re-run) by the one-time admin route
-- /api/admin/match-player-ids. `candidates` holds the plausible API-Football
-- matches for ambiguous rows, so match quality can be reviewed without
-- re-running the match.

create table if not exists public.player_external_ids (
  id                        bigint generated always as identity primary key,
  fpl_element_id            bigint not null unique,
  api_football_player_id    bigint,
  player_name               text not null,
  club_short_name           text not null,
  match_status              text not null
                              check (match_status in ('matched', 'ambiguous', 'unmatched')),
  candidates                jsonb,
  updated_at                timestamptz not null default now()
);

comment on table public.player_external_ids is 'Maps FPL element IDs (clubs.squad[].id) to API-Football player IDs. Populated by /api/admin/match-player-ids; upserted on fpl_element_id so re-runs are safe.';

-- Reuses the trigger function created in 0001_create_club_content_and_transfers.sql.
drop trigger if exists set_player_external_ids_updated_at on public.player_external_ids;
create trigger set_player_external_ids_updated_at
  before update on public.player_external_ids
  for each row
  execute function public.set_updated_at();
