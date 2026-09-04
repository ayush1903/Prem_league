-- Add net_spend to club_content for display alongside manager/formation stats.

alter table public.club_content add column if not exists net_spend text;
