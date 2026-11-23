-- Choix d'Avishay (23/11) : « Pour toi » dans sa propre ville est gratuit ; regarder une autre ville
-- (voyage, déménagement à venir) est réservé à Plus et Cercle. La base l'applique : for_you(region)
-- refuse une autre ville sans la formule (erreur « premium_required », indice « otherCity »)
-- et ne renvoie que les personnes de la ville demandée.
alter table public.plans add column other_city boolean not null default false;
update public.plans set other_city = (id <> 'free');

create function public.can_browse_other_city() returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_admin() or coalesce((select other_city from public.plans where id = public.my_plan_id()), false);
$$;
revoke execute on function public.can_browse_other_city() from public, anon;
grant execute on function public.can_browse_other_city() to authenticated;

drop function public.for_you(int);
create function public.for_you(max_count int default 12, region text default null) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
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
        and (cardinality(me.seeks) = 0 or v.gender is null or v.gender = any(me.seeks))
        and (cardinality(v.seeks) = 0 or me.gender is null or me.gender = any(v.seeks))
        and not exists (select 1 from public.likes l where l.from_id = me.id and l.to_id = v.id)
      order by v.is_demo, v.created_at desc
      limit n
    ) m
  );
end $$;
revoke execute on function public.for_you(int, text) from public, anon;
grant execute on function public.for_you(int, text) to authenticated;

create or replace function public.my_plan() returns jsonb
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
                                 'seeLikes', p.see_likes, 'rewind', p.rewind, 'discreet', p.discreet, 'liveFilters', p.live_filters,
                                 'otherCity', p.other_city),
    'liveFiltersAllowed', public.can_filter_live(),
    'otherCityAllowed', public.can_browse_other_city(),
    'used', jsonb_build_object(
      'like', coalesce((select u.used from public.usage_daily u, d where u.member_id = (auth.uid())::text and u.day = d.day and u.kind = 'like'), 0),
      'liveCall', coalesce((select u.used from public.usage_daily u, d where u.member_id = (auth.uid())::text and u.day = d.day and u.kind = 'live_call'), 0)),
    'resetsAt', public.member_next_reset((select timezone from me))
  ) from p;
$$;
