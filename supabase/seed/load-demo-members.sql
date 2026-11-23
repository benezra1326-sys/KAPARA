-- Charge (ou recharge) les profils de démo depuis supabase/seed/demo-members.json du dépôt.
-- Remplacer <commit> par le commit qui contient la version voulue du fichier.
create extension if not exists http with schema extensions;
with src as (
  select content::jsonb as j from extensions.http_get('https://raw.githubusercontent.com/benezra1326-sys/KAPARA/<commit>/supabase/seed/demo-members.json')
), del as (delete from public.members where is_demo)
insert into public.members (id, is_demo, first_name, gender, seeks, birth_date, region_code, headline, languages, prompts, photos,
  jewish_life, privacy, preferences, verified, onboarded, created_at)
select r.id, true, r.first_name, r.gender, r.seeks, r.birth_date, r.region_code, r.headline, r.languages, r.prompts, r.photos,
  r.jewish_life, r.privacy, r.preferences, r.verified, true, r.created_at
from src, jsonb_to_recordset(src.j) as r(id text, first_name text, gender text, seeks text[], birth_date date, region_code text, headline text,
  languages text[], prompts jsonb, photos jsonb, jewish_life jsonb, privacy jsonb, preferences jsonb, verified boolean, created_at timestamptz)
on conflict (id) do update set first_name = excluded.first_name, gender = excluded.gender, seeks = excluded.seeks, birth_date = excluded.birth_date,
  region_code = excluded.region_code, headline = excluded.headline, languages = excluded.languages, prompts = excluded.prompts, photos = excluded.photos,
  jewish_life = excluded.jewish_life, privacy = excluded.privacy, preferences = excluded.preferences, verified = excluded.verified;
