-- player_external_ids already exists (created directly in Supabase, not via
-- a migration). This just adds the `candidates` column the matching route
-- needs — the plausible API-Football matches for ambiguous rows, so match
-- quality can be reviewed without re-running the match.

alter table public.player_external_ids
  add column if not exists candidates jsonb not null default '[]'::jsonb;
