-- MOTEK : offre gratuite / Plus / Cercle, appliquée par la base (pas seulement par l'app).
--
-- Gratuit pour toujours : profil, questions, préférences et critères de valeurs, changer de ville,
-- messages avec ses matchs, Croisés, sécurité (blocage, signalement). Ce qui est limité par jour :
-- les réactions envoyées, la taille de la sélection « Pour toi » et les appels Live lancés.
-- Les formules payantes lèvent ces limites et ajoutent du confort (voir qui vous a remarqué,
-- revenir sur un profil passé, mode discret). La sécurité et les valeurs ne sont jamais payantes.
--
-- Paiement : simulé dans la démo (subscribe_demo). Les achats Apple (App Store) passeront plus tard
-- par une fonction serveur qui vérifie le reçu avant d'écrire la formule ; le client ne peut jamais
-- écrire sa formule lui-même (members_guard).

-- ── Formules ───────────────────────────────────────────────────────────────
create table public.plans (
  id text primary key check (id in ('free', 'plus', 'cercle')),
  rank int not null,
  likes_per_day int,            -- null = illimité
  picks_per_day int not null,   -- profils proposés chaque jour dans « Pour toi »
  live_calls_per_day int,       -- appels Live lancés par jour (recevoir un appel est toujours libre) ; null = illimité
  see_likes boolean not null,   -- voir qui vous a remarqué
  rewind boolean not null,      -- revenir sur un profil passé
  discreet boolean not null     -- mode discret : visible seulement des personnes que vous avez remarquées
);
alter table public.plans enable row level security;
create policy "formules : lisibles par tous" on public.plans for select to anon, authenticated using (true);

insert into public.plans values
  ('free',   0,    5,  8,    3, false, false, false),
  ('plus',   1,   25, 20,   15, true,  true,  false),
  ('cercle', 2, null, 40, null, true,  true,  true);

-- ── Formule de chaque membre ──────────────────────────────────────────────
alter table public.members
  add column plan text not null default 'free' references public.plans(id),
  add column plan_until timestamptz,
  add column plan_source text check (plan_source in ('demo', 'apple', 'admin')),
  add column timezone text not null default 'Europe/Paris' check (char_length(timezone) <= 64);

-- Un membre ne peut ni se vérifier, ni se suspendre, ni se déclarer « démo », ni s'offrir une formule.
-- Seules les fonctions ci-dessous (paiement simulé, administrateur) écrivent la formule.
create or replace function public.members_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
declare plan_ok boolean := public.is_admin() or coalesce(current_setting('motek.plan_write', true), '') = 'on';
begin
  if not public.is_admin() and auth.uid() is not null then
    if tg_op = 'INSERT' then
      new.verified := false; new.suspended := false; new.is_demo := false;
    else
      new.verified := old.verified; new.suspended := old.suspended; new.is_demo := old.is_demo;
    end if;
  end if;
  if auth.uid() is not null and not plan_ok then
    if tg_op = 'INSERT' then
      new.plan := 'free'; new.plan_until := null; new.plan_source := null;
    else
      new.plan := old.plan; new.plan_until := old.plan_until; new.plan_source := old.plan_source;
    end if;
  end if;
  new.updated_at := now();
  return new;
end $$;

-- Formule en cours d'un membre (une formule échue redevient gratuite).
create function public.member_plan(m public.members) returns text
language sql stable set search_path = '' as $$
  select case when m.plan <> 'free' and (m.plan_until is null or m.plan_until > now()) then m.plan else 'free' end;
$$;

-- Formule du membre connecté : l'administrateur a tout.
create function public.my_plan_id() returns text
language sql stable security definer set search_path = '' as $$
  select case when public.is_admin() then 'cercle'
    else coalesce((select public.member_plan(m) from public.members m where m.id = (auth.uid())::text), 'free') end;
$$;

-- Jour en cours dans le fuseau du membre (les compteurs repartent à minuit, heure locale).
create function public.member_today(tz text) returns date
language plpgsql stable set search_path = '' as $$
begin
  return (now() at time zone coalesce(nullif(tz, ''), 'UTC'))::date;
exception when others then
  return (now() at time zone 'UTC')::date;
end $$;

create function public.member_next_reset(tz text) returns timestamptz
language plpgsql stable set search_path = '' as $$
begin
  return ((public.member_today(tz) + 1)::timestamp at time zone coalesce(nullif(tz, ''), 'UTC'));
exception when others then
  return ((public.member_today('UTC') + 1)::timestamp at time zone 'UTC');
end $$;

-- ── Compteurs du jour ─────────────────────────────────────────────────────
create table public.usage_daily (
  member_id text not null references public.members(id) on delete cascade,
  day date not null,
  kind text not null check (kind in ('like', 'live_call')),
  used int not null default 0,
  primary key (member_id, day, kind)
);
alter table public.usage_daily enable row level security;
create policy "compteurs : les miens" on public.usage_daily for select to authenticated
  using (member_id = (select auth.uid())::text or (select public.is_admin()));
-- Aucune écriture directe : seul consume_quota() incrémente.

-- Consomme une unité ; refuse au-delà de la limite de la formule (erreur « quota_exceeded »).
create function public.consume_quota(who text, what text) returns int
language plpgsql security definer set search_path = '' as $$
declare
  p public.plans;
  lim int;
  d date;
  n int;
begin
  select * into p from public.plans where id = public.my_plan_id();
  lim := case what when 'like' then p.likes_per_day when 'live_call' then p.live_calls_per_day end;
  d := public.member_today((select timezone from public.members where id = who));
  insert into public.usage_daily (member_id, day, kind, used) values (who, d, what, 0)
    on conflict (member_id, day, kind) do nothing;
  select used into n from public.usage_daily where member_id = who and day = d and kind = what for update;
  if lim is not null and n >= lim then
    raise exception 'quota_exceeded' using errcode = 'P0001', hint = what;
  end if;
  update public.usage_daily set used = used + 1 where member_id = who and day = d and kind = what;
  return case when lim is null then null else lim - n - 1 end;
end $$;

-- Chaque nouvelle réaction compte (une réaction déjà envoyée à la même personne, non).
create function public.likes_quota() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is not null and new.from_id = (auth.uid())::text
     and not exists (select 1 from public.likes l where l.from_id = new.from_id and l.to_id = new.to_id) then
    perform public.consume_quota(new.from_id, 'like');
  end if;
  return new;
end $$;
create trigger likes_quota before insert on public.likes for each row execute function public.likes_quota();

-- Avant de lancer un appel Live.
create function public.live_call_start() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare left_ int;
begin
  if auth.uid() is null then raise exception 'signed_out' using errcode = '42501'; end if;
  left_ := public.consume_quota((auth.uid())::text, 'live_call');
  return jsonb_build_object('ok', true, 'left', left_);
end $$;

-- ── Ma formule, mes limites, ce qu'il me reste aujourd'hui ────────────────
create function public.my_plan() returns jsonb
language sql stable security definer set search_path = '' as $$
  with me as (select * from public.members where id = (auth.uid())::text),
       p as (select * from public.plans where id = public.my_plan_id()),
       d as (select public.member_today((select timezone from me)) as day)
  select jsonb_build_object(
    'plan', p.id,
    'subscribed', coalesce((select public.member_plan(me) from me), 'free'),
    'until', (select plan_until from me),
    'source', (select plan_source from me),
    'isAdmin', public.is_admin(),
    'limits', jsonb_build_object('likesPerDay', p.likes_per_day, 'picksPerDay', p.picks_per_day, 'liveCallsPerDay', p.live_calls_per_day,
                                 'seeLikes', p.see_likes, 'rewind', p.rewind, 'discreet', p.discreet),
    'used', jsonb_build_object(
      'like', coalesce((select u.used from public.usage_daily u, d where u.member_id = (auth.uid())::text and u.day = d.day and u.kind = 'like'), 0),
      'liveCall', coalesce((select u.used from public.usage_daily u, d where u.member_id = (auth.uid())::text and u.day = d.day and u.kind = 'live_call'), 0)),
    'resetsAt', public.member_next_reset((select timezone from me))
  ) from p;
$$;

-- ── Paiement simulé (démo) ────────────────────────────────────────────────
create function public.subscribe_demo(plan_id text, months int) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'signed_out' using errcode = '42501'; end if;
  if plan_id not in ('plus', 'cercle') or months not in (1, 3, 6) then raise exception 'invalid_plan' using errcode = '22023'; end if;
  perform set_config('motek.plan_write', 'on', true);
  update public.members set plan = plan_id, plan_until = now() + make_interval(months => months), plan_source = 'demo'
    where id = (auth.uid())::text;
  perform set_config('motek.plan_write', 'off', true);
  return public.my_plan();
end $$;

create function public.cancel_demo_plan() returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'signed_out' using errcode = '42501'; end if;
  perform set_config('motek.plan_write', 'on', true);
  update public.members set plan = 'free', plan_until = null, plan_source = null
    where id = (auth.uid())::text and coalesce(plan_source, 'demo') = 'demo';
  perform set_config('motek.plan_write', 'off', true);
  return public.my_plan();
end $$;

-- L'administrateur peut offrir une formule (0 mois = sans échéance) ou la retirer (« free »).
create function public.admin_set_plan(member text, plan_id text, months int default 1) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  if plan_id not in ('free', 'plus', 'cercle') then raise exception 'invalid_plan' using errcode = '22023'; end if;
  update public.members set plan = plan_id,
    plan_until = case when plan_id = 'free' or months <= 0 then null else now() + make_interval(months => months) end,
    plan_source = case when plan_id = 'free' then null else 'admin' end
  where id = member;
end $$;

-- ── Découverte : mode discret et sélection selon la formule ───────────────
-- Mode discret (Cercle) : on n'apparaît qu'aux personnes qu'on a soi-même remarquées.
create or replace function public.visible_members() returns setof public.members
language sql stable security definer set search_path = '' as $$
  select m.* from public.members m
  where m.onboarded and not m.suspended and m.id <> (auth.uid())::text and auth.uid() is not null
    and not exists (select 1 from public.blocks b where (b.blocker_id = (auth.uid())::text and b.blocked_id = m.id)
                                                  or (b.blocker_id = m.id and b.blocked_id = (auth.uid())::text))
    and not (coalesce((m.privacy->>'discreet')::boolean, false) and public.member_plan(m) = 'cercle'
             and not exists (select 1 from public.likes l where l.from_id = m.id and l.to_id = (auth.uid())::text));
$$;

-- « Pour toi » : la ville choisie d'abord (changer de ville est gratuit), autant de profils que la formule en propose.
create or replace function public.for_you(max_count int default 12) returns jsonb
language sql stable security definer set search_path = '' as $$
  with me as (select * from public.members where id = (auth.uid())::text),
       cap as (select least(greatest(coalesce(max_count, 12), 1), (select picks_per_day from public.plans where id = public.my_plan_id())) as n)
  select coalesce(jsonb_agg(public.public_card(m, (auth.uid())::text)
           order by (m.region_code = (select region_code from me)) desc, m.is_demo, m.created_at desc), '[]'::jsonb)
  from (
    select v.* from public.visible_members() v, me
    where (cardinality(me.seeks) = 0 or v.gender is null or v.gender = any(me.seeks))
      and (cardinality(v.seeks) = 0 or me.gender is null or me.gender = any(v.seeks))
      and not exists (select 1 from public.likes l where l.from_id = me.id and l.to_id = v.id)
    order by (v.region_code = me.region_code) desc, v.is_demo, v.created_at desc
    limit (select n from cap)
  ) m;
$$;

-- Qui vous a remarqué : le nombre pour tous, les profils avec Plus ou Cercle.
create function public.likes_inbox() returns jsonb
language sql stable security definer set search_path = '' as $$
  with r as (select public.likes_received() as items),
       p as (select see_likes from public.plans where id = public.my_plan_id())
  select jsonb_build_object('count', jsonb_array_length(r.items), 'locked', not p.see_likes,
                            'items', case when p.see_likes then r.items else '[]'::jsonb end)
  from r, p;
$$;

-- Statistiques d'administration : abonnés par formule.
create or replace function public.admin_stats() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  return jsonb_build_object(
    'members', (select count(*) from public.members where not is_demo),
    'onboarded', (select count(*) from public.members where not is_demo and onboarded),
    'demo', (select count(*) from public.members where is_demo),
    'suspended', (select count(*) from public.members where suspended),
    'likes', (select count(*) from public.likes),
    'conversations', (select count(*) from public.conversations),
    'messages', (select count(*) from public.messages),
    'openReports', (select count(*) from public.reports where status = 'open'),
    'signups7d', (select count(*) from public.members where not is_demo and created_at > now() - interval '7 days'),
    'plus', (select count(*) from public.members m where not is_demo and public.member_plan(m) = 'plus'),
    'cercle', (select count(*) from public.members m where not is_demo and public.member_plan(m) = 'cercle')
  );
end $$;

-- ── Droits ─────────────────────────────────────────────────────────────────
revoke execute on function public.member_plan(public.members) from public, anon, authenticated;
revoke execute on function public.my_plan_id() from public, anon, authenticated;
revoke execute on function public.member_today(text) from public, anon, authenticated;
revoke execute on function public.member_next_reset(text) from public, anon, authenticated;
revoke execute on function public.consume_quota(text, text) from public, anon, authenticated;
revoke execute on function public.likes_quota() from public, anon, authenticated;
revoke execute on function public.visible_members() from public, anon, authenticated;
revoke execute on function public.members_guard() from public, anon, authenticated;
revoke execute on function public.likes_received() from public, anon;
revoke execute on function public.admin_stats() from public, anon;
grant execute on function public.admin_stats() to authenticated;
revoke execute on function public.for_you(int) from public, anon;
grant execute on function public.for_you(int) to authenticated;
do $$ declare f text; begin
  foreach f in array array['public.my_plan()', 'public.live_call_start()', 'public.subscribe_demo(text, int)',
                           'public.cancel_demo_plan()', 'public.admin_set_plan(text, text, int)', 'public.likes_inbox()'] loop
    execute format('revoke execute on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;
