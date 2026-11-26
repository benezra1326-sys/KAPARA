-- MOTEK, 26/11 : Live au hasard + suppression de compte + lecture du dossier photos.
-- À coller en entier dans l'éditeur SQL de Supabase (nouvelle requête vide), puis Run.
-- Tout passe ou rien ne passe ; peut être relancé sans erreur.
begin;
-- MOTEK : Live façon Azar. On ne parcourt plus une liste : on lance une recherche, et l'app envoie
-- 3 ou 4 demandes d'appel en même temps à des membres présents dans le Live, au hasard.
-- La première personne qui accepte gagne, les autres demandes s'arrêtent ; après un refus, on en relance.
-- Gratuit : hasard dans le monde entier. Abonnement : choix du genre et de la ville.

alter table public.calls add column if not exists context text not null default 'match'
  check (context in ('match', 'live'));

-- Qui est dans le Live en ce moment (rafraîchi toutes les ~20 s par l'app).
create table if not exists public.live_presence (
  member_id text primary key references public.members(id) on delete cascade,
  updated_at timestamptz not null default now(),
  want_gender text check (want_gender in ('woman', 'man', 'nonbinary')),
  want_region text
);
alter table public.live_presence enable row level security; -- aucune politique : accès par les fonctions seulement

-- Droit aux filtres du Live (genre, ville) : défini par l'offre (chantier premium, table public.plans).
create or replace function public.live_filters_allowed() returns boolean
language plpgsql stable security definer set search_path = '' as $$
declare ok boolean;
begin
  -- Règle d'Avishay (23/11/2026) : filtres réservés aux offres payantes, pour tout le monde.
  if to_regprocedure('public.can_filter_live()') is not null then
    execute 'select public.can_filter_live()' into ok;
    return coalesce(ok, false);
  end if;
  if to_regclass('public.plans') is null or to_regprocedure('public.my_plan_id()') is null then return false; end if;
  execute 'select coalesce((to_jsonb(p)->>''live_filters'')::boolean, p.rank > 0) from public.plans p where p.id = public.my_plan_id()' into ok;
  return coalesce(ok, false);
end $$;
revoke execute on function public.live_filters_allowed() from public, anon;
grant execute on function public.live_filters_allowed() to authenticated;

-- Être présent dans le Live (et donc pouvoir recevoir des demandes). Les filtres ne sont gardés
-- que si l'offre les permet.
create or replace function public.live_here(want_gender text default null, want_region text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  me text := (auth.uid())::text;
  filters boolean := public.live_filters_allowed();
begin
  if me is null then raise exception 'not_signed_in'; end if;
  if not exists (select 1 from public.members m where m.id = me and m.onboarded and not m.suspended) then
    return jsonb_build_object('ok', false, 'error', 'not_available');
  end if;
  insert into public.live_presence (member_id, updated_at, want_gender, want_region)
  values (me, now(), case when filters then want_gender end, case when filters then want_region end)
  on conflict (member_id) do update set updated_at = now(),
    want_gender = excluded.want_gender, want_region = excluded.want_region;
  return jsonb_build_object('ok', true, 'filters', filters);
end $$;
revoke execute on function public.live_here(text, text) from public, anon;
grant execute on function public.live_here(text, text) to authenticated;

-- Quitter le Live : je ne reçois plus rien, mes demandes en attente s'arrêtent.
create or replace function public.live_leave() returns void
language sql security definer set search_path = '' as $$
  delete from public.live_presence where member_id = (auth.uid())::text;
  update public.calls set state = 'expired', ended_at = now(), updated_at = now()
   where state = 'invited' and context = 'live' and caller_id = (auth.uid())::text;
$$;
revoke execute on function public.live_leave() from public, anon;
grant execute on function public.live_leave() to authenticated;

-- Envoyer des demandes au hasard jusqu'à en avoir `want` en attente (3 ou 4).
-- `fresh` = début d'une nouvelle recherche : c'est elle qui compte dans le quota du jour.
create or replace function public.live_search(want int default 3, fresh boolean default false) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  me text := (auth.uid())::text;
  mine public.members;
  pres public.live_presence;
  pending int;
  r record;
  ids uuid[] := '{}';
  new_id uuid;
begin
  if me is null then raise exception 'not_signed_in'; end if;
  want := least(greatest(coalesce(want, 3), 1), 4);
  select * into mine from public.members where id = me;
  if mine.id is null or not mine.onboarded or mine.suspended then return jsonb_build_object('ok', false, 'error', 'not_available'); end if;
  select * into pres from public.live_presence where member_id = me;
  if pres.member_id is null then return jsonb_build_object('ok', false, 'error', 'live_disabled'); end if;
  perform public.calls_expire();
  if exists (select 1 from public.calls k where k.ended_at is null and k.state <> 'invited' and me in (k.caller_id, k.callee_id)) then
    return jsonb_build_object('ok', false, 'error', 'not_allowed');
  end if;

  if fresh and to_regprocedure('public.consume_quota(text,text)') is not null then
    begin
      execute 'select public.consume_quota($1, $2)' using me, 'live_call';
    exception when others then
      if sqlerrm = 'quota_exceeded' then return jsonb_build_object('ok', false, 'error', 'quota_reached'); end if;
      raise;
    end;
  end if;

  select count(*) into pending from public.calls k where k.caller_id = me and k.context = 'live' and k.state = 'invited';
  for r in
    select m.id from public.live_presence p join public.members m on m.id = p.member_id
    where p.updated_at > now() - interval '45 seconds'
      and m.id <> me and m.onboarded and not m.suspended and not m.is_demo
      and not exists (select 1 from public.blocks b where (b.blocker_id = me and b.blocked_id = m.id) or (b.blocker_id = m.id and b.blocked_id = me))
      -- personne déjà en appel, ni déjà sollicitée par moi
      and not exists (select 1 from public.calls k where k.ended_at is null and k.state <> 'invited' and m.id in (k.caller_id, k.callee_id))
      and not exists (select 1 from public.calls k where k.ended_at is null and k.caller_id = me and k.callee_id = m.id)
      -- une personne qui m'a dit non ne me revoit pas avant une heure
      and not exists (select 1 from public.calls k where k.caller_id = me and k.callee_id = m.id and k.state = 'declined' and k.created_at > now() - interval '1 hour')
      -- mes filtres (abonnement) et les siens
      and (pres.want_gender is null or m.gender = pres.want_gender)
      and (pres.want_region is null or m.region_code = pres.want_region)
      and (p.want_gender is null or mine.gender = p.want_gender)
      and (p.want_region is null or mine.region_code = p.want_region)
    order by random()
    limit greatest(want - pending, 0)
  loop
    insert into public.calls (caller_id, callee_id, mode, context) values (me, r.id, 'video', 'live') returning id into new_id;
    ids := ids || new_id;
  end loop;

  return jsonb_build_object('ok', true, 'sent', cardinality(ids),
    'pending', (select coalesce(jsonb_agg(public.call_view(k.id)), '[]'::jsonb) from public.calls k
                 where k.caller_id = me and k.context = 'live' and k.state = 'invited'));
end $$;
revoke execute on function public.live_search(int, boolean) from public, anon;
grant execute on function public.live_search(int, boolean) to authenticated;

-- Une demande Live sans réponse s'arrête après 20 s (au lieu de 60 s pour un appel entre matchs).
create or replace function public.calls_expire() returns void
language sql security definer set search_path = '' as $$
  update public.calls set state = 'expired', ended_at = now(), updated_at = now()
   where state = 'invited' and (created_at < now() - interval '60 seconds'
                                or (context = 'live' and created_at < now() - interval '20 seconds'));
  update public.calls set state = 'ended', ended_at = now(), updated_at = now()
   where ended_at is null and state <> 'invited' and updated_at < now() - interval '60 seconds';
  delete from public.live_presence where updated_at < now() - interval '2 minutes';
$$;

-- Répondre : quand un appel démarre, toutes les autres demandes en attente des deux personnes s'arrêtent.
create or replace function public.call_respond(call_id uuid, accept boolean, with_video boolean default false) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  me text := (auth.uid())::text;
  c public.calls;
begin
  perform public.calls_expire();
  select * into c from public.calls k where k.id = call_id for update;
  if c.id is null or c.callee_id <> me or c.state <> 'invited' then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;
  if not accept then
    update public.calls set state = 'declined', ended_at = now(), updated_at = now() where id = c.id;
  else
    update public.calls set state = case when c.mode = 'video' and with_video then 'video_on' else 'connected' end,
                            answered_at = now(), updated_at = now()
     where id = c.id;
    update public.calls set state = 'expired', ended_at = now(), updated_at = now()
     where id <> c.id and state = 'invited'
       and (caller_id in (c.caller_id, c.callee_id) or callee_id in (c.caller_id, c.callee_id));
  end if;
  return jsonb_build_object('ok', true);
end $$;

-- call_view : on ajoute le contexte (Live ou match).
create or replace function public.call_view(call_id uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'callId', c.id, 'state', c.state, 'mode', c.mode, 'context', c.context,
    'direction', case when c.caller_id = (auth.uid())::text then 'outgoing' else 'incoming' end,
    'videoRequestedBy', case when c.video_requested_by is null then null
                             when c.video_requested_by = (auth.uid())::text then 'me' else 'peer' end,
    'conversationId', c.conversation_id,
    'startedAt', c.answered_at,
    'peer', jsonb_build_object(
      'userId', o.id, 'firstName', o.first_name,
      'age', coalesce(extract(year from age(o.birth_date))::int, 18),
      'headline', nullif(o.headline, ''), 'photoUrl', o.photos->0->>'url',
      'regionCode', o.region_code,
      'verified', o.verified, 'isDemo', o.is_demo))
  from public.calls c
  join public.members o on o.id = case when c.caller_id = (auth.uid())::text then c.callee_id else c.caller_id end
  where c.id = call_id and (auth.uid())::text in (c.caller_id, c.callee_id);
$$;

-- MOTEK : suppression de compte (la fonction de 20261123142000 n'avait pas été appliquée en base)
-- et lecture de son propre dossier photos (sans elle, storage list() revient vide).

create or replace function public.delete_my_account()
 returns void
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not_signed_in'; end if;
  delete from public.members where id = uid::text;
  delete from auth.users where id = uid;
end;
$function$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

drop policy if exists "photos : je vois mon dossier" on storage.objects;
create policy "photos : je vois mon dossier" on storage.objects for select to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

commit;
