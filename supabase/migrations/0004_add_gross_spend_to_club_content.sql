-- Add gross_spend to club_content, alongside net_spend.

alter table public.club_content add column if not exists gross_spend text;
