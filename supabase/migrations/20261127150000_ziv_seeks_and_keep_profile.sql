-- ZIV : « Je recherche » respecté partout, dans les deux sens, et un profil
-- terminé qui ne peut plus être effacé par une écriture partielle.
-- Script idempotent : peut être relancé sans risque.

-- 1. Qui un membre recherche : sa réponse, sinon une valeur par défaut tirée
--    de son genre (homme -> femmes, femme -> hommes, sinon tout le monde).
create or replace function public.effective_seeks(m public.members) returns text[]
language sql immutable set search_path = '' as $$
  select case
    when cardinality(m.seeks) > 0 then m.seeks
    when m.gender = 'man' then array['woman']
    when m.gender = 'woman' then array['man']
    else array['woman', 'man', 'nonbinary']
  end;
$$;

-- 2. Les deux se recherchent : je recherche son genre ET il/elle recherche le
--    mien. Une personne sans genre n'apparaît jamais. Profils de démo compris.
create or replace function public.seeks_match(me public.members, other public.members) returns boolean
language sql immutable set search_path = '' as $$
  select other.gender is not null
     and other.gender = any(public.effective_seeks(me))
     and (me.gender is null or me.gender = any(public.effective_seeks(other)));
$$;

-- 3. « Pour toi » : même sélection qu'avant, filtrée par seeks_match.
create or replace function public.for_you(max_count integer default 12, region text default null)
returns jsonb language plpgsql stable security definer set search_path = '' as $function$
declare
  home text := (select region_code from public.members where id = (auth.uid())::text);
  target text := coalesce(nullif(region, ''), home);
  n int := least(greatest(coalesce(max_count, 12), 1), (select picks_per_day from public.plans where id = public.my_plan_id()));
begin
  if auth.uid() is null then raise exception 'signed_out' using errcode = '42501'; end if;
  if target is distinct from home and not public.can_browse_other_city() then
    raise exception 'premium_required' using errcode = 'P0001', hint = 'otherCity';
  end if;
  return (
    with me as (select * from public.members where id = (auth.uid())::text)
    select coalesce(jsonb_agg(public.public_card(m, (auth.uid())::text) order by m.is_demo, m.created_at desc), '[]'::jsonb)
    from (
      select v.* from public.visible_members() v, me
      where v.region_code = target
        and public.seeks_match(me, v)
        and not exists (select 1 from public.likes l where l.from_id = me.id and l.to_id = v.id)
      order by v.is_demo, v.created_at desc
      limit n
    ) m
  );
end $function$;

-- 4. Live au hasard : on n'appelle que des personnes qui se recherchent mutuellement.
do $do$
declare def text;
begin
  if to_regprocedure('public.live_search(integer,boolean)') is null then return; end if;
  def := pg_get_functiondef('public.live_search(integer,boolean)'::regprocedure);
  if position('seeks_match' in def) = 0 then
    def := replace(def, '      -- mes filtres (abonnement) et les siens',
      E'      -- « Je recherche », dans les deux sens\n      and public.seeks_match(mine, m)\n      -- mes filtres (abonnement) et les siens');
    if position('seeks_match' in def) = 0 then raise exception 'live_search: point d''insertion introuvable'; end if;
    execute def;
  end if;
end $do$;

-- 5. Un profil terminé n'est jamais remis à zéro par une écriture de l'app
--    (ancienne version, double chargement, réseau) : l'écriture est ignorée.
--    Supprimer son compte reste possible (delete_my_account).
create or replace function public.members_keep_profile() returns trigger
language plpgsql set search_path = '' as $$
begin
  if old.onboarded and not new.onboarded and not new.is_demo then
    return old;
  end if;
  return new;
end $$;

drop trigger if exists members_keep_profile on public.members;
create trigger members_keep_profile before update on public.members
  for each row execute function public.members_keep_profile();
