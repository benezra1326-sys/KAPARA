-- ZIV : Live, on voit des profils et on choisit qui appeler (retour d'Avishay du 27/11/2026).
-- Les membres présents dans le Live sont proposés en cartes ; on peut faire sonner jusqu'à 5 appels
-- vidéo en même temps. La première personne qui répond prend l'appel, les autres sonneries s'arrêtent
-- (call_respond), et une personne qui répond trop tard voit « appel manqué ».
-- Gratuit : ni genre ni ville au choix (les filtres de live_here ne sont gardés que pour les abonnés).
-- Dans tous les cas, « Je recherche » est respecté dans les deux sens (public.seeks_match).

-- Qui je peux appeler maintenant (règle commune aux suggestions et à l'appel).
create function public.live_can_call(me public.members, pres public.live_presence, m public.members, p public.live_presence)
returns boolean language sql stable security definer set search_path = '' as $$
  select p.updated_at > now() - interval '45 seconds'
    and m.id <> me.id and m.onboarded and not m.suspended and not m.is_demo
    and not exists (select 1 from public.blocks b where (b.blocker_id = me.id and b.blocked_id = m.id) or (b.blocker_id = m.id and b.blocked_id = me.id))
    -- déjà en appel
    and not exists (select 1 from public.calls k where k.ended_at is null and k.state <> 'invited' and m.id in (k.caller_id, k.callee_id))
    -- une personne qui m'a dit non ne me revoit pas avant une heure
    and not exists (select 1 from public.calls k where k.caller_id = me.id and k.callee_id = m.id and k.state = 'declined' and k.created_at > now() - interval '1 hour')
    -- « Je recherche », dans les deux sens (règle commune, migration 20261127150000)
    and public.seeks_match(me, m)
    -- filtres du Live (abonnement) : les miens et les siens
    and (pres.want_gender is null or m.gender = pres.want_gender)
    and (pres.want_region is null or m.region_code = pres.want_region)
    and (p.want_gender is null or me.gender = p.want_gender)
    and (p.want_region is null or me.region_code = p.want_region);
$$;
revoke execute on function public.live_can_call(public.members, public.live_presence, public.members, public.live_presence) from public, anon, authenticated;

-- Mes appels Live qui sonnent encore.
create function public.live_pending() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare me text := (auth.uid())::text;
begin
  if me is null then raise exception 'not_signed_in'; end if;
  perform public.calls_expire();
  return jsonb_build_object('ok', true,
    'pending', (select coalesce(jsonb_agg(public.call_view(k.id) order by k.created_at), '[]'::jsonb) from public.calls k
                 where k.caller_id = me and k.context = 'live' and k.state = 'invited'));
end $$;
revoke execute on function public.live_pending() from public, anon;
grant execute on function public.live_pending() to authenticated;

-- Les profils proposés : des membres présents dans le Live, au hasard, que je peux appeler.
create function public.live_suggestions(max_count int default 12) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  me text := (auth.uid())::text;
  mine public.members;
  pres public.live_presence;
begin
  if me is null then raise exception 'not_signed_in'; end if;
  select * into mine from public.members where id = me;
  if mine.id is null or not mine.onboarded or mine.suspended then return jsonb_build_object('ok', false, 'error', 'not_available'); end if;
  select * into pres from public.live_presence where member_id = me;
  if pres.member_id is null then return jsonb_build_object('ok', false, 'error', 'live_disabled'); end if;
  perform public.calls_expire();
  return jsonb_build_object('ok', true, 'members', coalesce((
    select jsonb_agg(x.j) from (
      select jsonb_build_object(
        'userId', m.id, 'firstName', m.first_name,
        'age', coalesce(extract(year from age(m.birth_date))::int, 18),
        'headline', nullif(m.headline, ''), 'photoUrl', m.photos->0->>'url',
        'regionCode', m.region_code, 'verified', m.verified, 'isDemo', m.is_demo) j
      from public.live_presence p join public.members m on m.id = p.member_id
      where public.live_can_call(mine, pres, m, p)
        and not exists (select 1 from public.calls k where k.ended_at is null and k.caller_id = me and k.callee_id = m.id)
      order by random()
      limit least(greatest(coalesce(max_count, 12), 1), 30)) x), '[]'::jsonb));
end $$;
revoke execute on function public.live_suggestions(int) from public, anon;
grant execute on function public.live_suggestions(int) to authenticated;

-- Appeler un profil proposé (vidéo). Jusqu'à 5 appels qui sonnent en même temps.
create function public.live_call(peer text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  me text := (auth.uid())::text;
  mine public.members;
  pres public.live_presence;
  other public.members;
  their public.live_presence;
  pending int;
begin
  if me is null then raise exception 'not_signed_in'; end if;
  select * into mine from public.members where id = me;
  if mine.id is null or not mine.onboarded or mine.suspended then return jsonb_build_object('ok', false, 'error', 'not_available'); end if;
  select * into pres from public.live_presence where member_id = me;
  if pres.member_id is null then return jsonb_build_object('ok', false, 'error', 'live_disabled'); end if;
  perform public.calls_expire();
  if exists (select 1 from public.calls k where k.ended_at is null and k.state <> 'invited' and me in (k.caller_id, k.callee_id)) then
    return jsonb_build_object('ok', false, 'error', 'not_allowed');
  end if;
  select count(*) into pending from public.calls k where k.caller_id = me and k.context = 'live' and k.state = 'invited';
  if pending >= 5 then return jsonb_build_object('ok', false, 'error', 'too_many_calls'); end if;
  select * into other from public.members where id = peer;
  select * into their from public.live_presence where member_id = peer;
  if other.id is null or their.member_id is null or not public.live_can_call(mine, pres, other, their) then
    return jsonb_build_object('ok', false, 'error', 'not_available');
  end if;
  if exists (select 1 from public.calls k where k.ended_at is null and k.caller_id = me and k.callee_id = peer) then
    return public.live_pending();
  end if;

  if to_regprocedure('public.consume_quota(text,text)') is not null then
    begin
      execute 'select public.consume_quota($1, $2)' using me, 'live_call';
    exception when others then
      if sqlerrm = 'quota_exceeded' then return jsonb_build_object('ok', false, 'error', 'quota_reached'); end if;
      raise;
    end;
  end if;

  insert into public.calls (caller_id, callee_id, mode, context) values (me, peer, 'video', 'live');
  return public.live_pending();
end $$;
revoke execute on function public.live_call(text) from public, anon;
grant execute on function public.live_call(text) to authenticated;

-- Une sonnerie Live dure 30 s (laisse le temps de voir l'appel et de choisir).
create or replace function public.calls_expire() returns void
language sql security definer set search_path = '' as $$
  update public.calls set state = 'expired', ended_at = now(), updated_at = now()
   where state = 'invited' and (created_at < now() - interval '60 seconds'
                                or (context = 'live' and created_at < now() - interval '30 seconds'));
  update public.calls set state = 'ended', ended_at = now(), updated_at = now()
   where ended_at is null and state <> 'invited' and updated_at < now() - interval '60 seconds';
  delete from public.live_presence where updated_at < now() - interval '2 minutes';
$$;
