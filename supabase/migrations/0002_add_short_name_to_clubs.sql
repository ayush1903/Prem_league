-- Add short_name to clubs so api/team.js can cache-check by FPL's
-- stable short_name (e.g. "MCI") instead of requiring the full name
-- up front.

alter table public.clubs add column if not exists short_name text;

-- Backfill existing rows (accurate as of the FPL bootstrap-static
-- data at the time this migration was written).
update public.clubs set short_name = 'ARS' where name = 'Arsenal';
update public.clubs set short_name = 'LIV' where name = 'Liverpool';
update public.clubs set short_name = 'CRY' where name = 'Crystal Palace';
update public.clubs set short_name = 'CHE' where name = 'Chelsea';
update public.clubs set short_name = 'MCI' where name = 'Man City';

create unique index if not exists clubs_short_name_key on public.clubs (short_name);
