-- MOTEK : vrais appels audio ou vidéo entre deux membres en contact (conversation ouverte).
-- Le son et l'image passent en direct d'un téléphone à l'autre (WebRTC) ; la base ne garde que
-- l'état de l'appel (qui, quand, audio ou vidéo, durée) : rien n'est enregistré.
-- La signalisation WebRTC passe par un canal Realtime privé « call:<id> », réservé aux deux participants.

create table public.calls (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.conversations(id) on delete cascade,
  caller_id text not null references public.members(id) on delete cascade,
  callee_id text not null references public.members(id) on delete cascade,
  -- Ce que l'appelant a proposé. L'appelé peut toujours répondre en audio seul.
  mode text not null check (mode in ('audio', 'video')),
  state text not null default 'invited'
    check (state in ('invited', 'connected', 'video_requested', 'video_on', 'declined', 'expired', 'ended')),
  video_requested_by text,
  created_at timestamptz not null default now(),
  answered_at timestamptz,
  ended_at timestamptz,
  updated_at timestamptz not null default now(),
  check (caller_id <> callee_id)
);
create index calls_caller_idx on public.calls (caller_id, created_at desc);
create index calls_callee_idx on public.calls (callee_id, created_at desc);
alter table public.calls enable row level security;
create policy "appels : participants lisent" on public.calls for select to authenticated
  using ((select auth.uid())::text in (caller_id, callee_id) or (select public.is_admin()));
-- Aucune écriture directe : tout passe par les fonctions ci-dessous, qui vérifient chaque étape.
revoke insert, update, delete on public.calls from anon, authenticated;
alter publication supabase_realtime add table public.calls;

-- Durée d'appel utilisée (secondes) depuis une date : base des plafonds gratuits / premium.
create function public.call_seconds_used(member text, since timestamptz) returns int
language sql stable security definer set search_path = '' as $$
  select coalesce(sum(extract(epoch from (coalesce(c.ended_at, now()) - c.answered_at)))::int, 0)
  from public.calls c
  where member in (c.caller_id, c.callee_id) and c.answered_at is not null and c.answered_at >= since;
$$;
revoke execute on function public.call_seconds_used(text, timestamptz) from public, anon, authenticated;

-- Point d'accroche des abonnements : null = appel autorisé, sinon la raison du refus
-- ('quota_reached' | 'premium_required'). Pour l'instant aucun plafond : le chantier premium
-- remplace cette fonction (create or replace) sans toucher au reste.
create function public.call_allowance(member text, call_mode text) returns text
language sql stable security definer set search_path = '' as $$
  select null::text;
$$;
revoke execute on function public.call_allowance(text, text) from public, anon, authenticated;

-- Ce que voit un participant : l'autre personne, le sens et l'état.
create function public.call_view(call_id uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'callId', c.id, 'state', c.state, 'mode', c.mode,
    'direction', case when c.caller_id = (auth.uid())::text then 'outgoing' else 'incoming' end,
    'videoRequestedBy', case when c.video_requested_by is null then null
                             when c.video_requested_by = (auth.uid())::text then 'me' else 'peer' end,
    'conversationId', c.conversation_id,
    'startedAt', c.answered_at,
    'peer', jsonb_build_object(
      'userId', o.id, 'firstName', o.first_name,
      'age', coalesce(extract(year from age(o.birth_date))::int, 18),
      'headline', nullif(o.headline, ''), 'photoUrl', o.photos->0->>'url',
      'verified', o.verified, 'isDemo', o.is_demo))
  from public.calls c
  join public.members o on o.id = case when c.caller_id = (auth.uid())::text then c.callee_id else c.caller_id end
  where c.id = call_id and (auth.uid())::text in (c.caller_id, c.callee_id);
$$;
revoke execute on function public.call_view(uuid) from public, anon;
grant execute on function public.call_view(uuid) to authenticated;

-- Une invitation sans réponse expire au bout de 60 s (RULES.liveInviteTtlSeconds). Un appel en cours dont aucun des deux
-- n'a donné signe de vie depuis 60 s (téléphone éteint, onglet fermé) est clos.
create function public.calls_expire() returns void
language sql security definer set search_path = '' as $$
  update public.calls set state = 'expired', ended_at = now(), updated_at = now()
   where state = 'invited' and created_at < now() - interval '60 seconds';
  update public.calls set state = 'ended', ended_at = now(), updated_at = now()
   where ended_at is null and state <> 'invited' and updated_at < now() - interval '60 seconds';
$$;
revoke execute on function public.calls_expire() from public, anon, authenticated;

-- Appeler une personne avec qui j'ai une conversation ouverte.
create function public.call_start(peer text, call_mode text default 'audio') returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  me text := (auth.uid())::text;
  conv uuid;
  refusal text;
  new_id uuid;
begin
  if me is null then raise exception 'not_signed_in'; end if;
  if call_mode not in ('audio', 'video') then raise exception 'bad_mode'; end if;
  perform public.calls_expire();

  select c.id into conv from public.conversations c
   where c.a_id = least(me, peer) and c.b_id = greatest(me, peer) and c.closed_at is null;
  -- Toujours la même réponse vague : on ne dit pas si c'est un blocage, une suspension ou un appel en cours.
  if conv is null
     or exists (select 1 from public.blocks b where (b.blocker_id = me and b.blocked_id = peer) or (b.blocker_id = peer and b.blocked_id = me))
     or exists (select 1 from public.members m where m.id = peer and (m.suspended or m.is_demo))
     or exists (select 1 from public.calls k where k.ended_at is null and (peer in (k.caller_id, k.callee_id)))
  then return jsonb_build_object('ok', false, 'error', 'not_available'); end if;

  refusal := public.call_allowance(me, call_mode);
  if refusal is not null then return jsonb_build_object('ok', false, 'error', refusal); end if;
  -- Plafond quotidien d'appels de l'abonnement (chantier premium : public.consume_quota, 'live_call'),
  -- appliqué ici côté serveur dès que la fonction existe.
  if to_regprocedure('public.consume_quota(text,text)') is not null then
    begin
      execute 'select public.consume_quota($1, $2)' using me, 'live_call';
    exception when others then
      if sqlerrm = 'quota_exceeded' then return jsonb_build_object('ok', false, 'error', 'quota_reached'); end if;
      raise;
    end;
  end if;

  -- Un éventuel appel à moi resté ouvert (onglet fermé…) est clos avant d'en lancer un nouveau.
  update public.calls set state = 'ended', ended_at = now(), updated_at = now()
   where ended_at is null and me in (caller_id, callee_id);

  insert into public.calls (conversation_id, caller_id, callee_id, mode)
  values (conv, me, peer, call_mode) returning id into new_id;
  return jsonb_build_object('ok', true, 'call', public.call_view(new_id));
end $$;
revoke execute on function public.call_start(text, text) from public, anon;
grant execute on function public.call_start(text, text) to authenticated;

-- Répondre : accepter (en vidéo seulement si l'appelant l'a proposée ET que je le choisis) ou refuser.
create function public.call_respond(call_id uuid, accept boolean, with_video boolean default false) returns jsonb
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
  end if;
  return jsonb_build_object('ok', true);
end $$;
revoke execute on function public.call_respond(uuid, boolean, boolean) from public, anon;
grant execute on function public.call_respond(uuid, boolean, boolean) to authenticated;

-- Vidéo en cours d'appel : chacun la propose, l'autre accepte ou non ; chacun peut repasser en audio.
create function public.call_video(call_id uuid, action text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  me text := (auth.uid())::text;
  c public.calls;
begin
  select * into c from public.calls k where k.id = call_id for update;
  if c.id is null or me not in (c.caller_id, c.callee_id) or c.ended_at is not null then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;
  if action = 'request' and c.state = 'connected' then
    update public.calls set state = 'video_requested', video_requested_by = me, updated_at = now() where id = c.id;
  elsif action in ('accept', 'decline') and c.state = 'video_requested' and c.video_requested_by <> me then
    update public.calls set state = case when action = 'accept' then 'video_on' else 'connected' end,
                            video_requested_by = null, updated_at = now() where id = c.id;
  elsif action = 'stop' and c.state in ('video_on', 'video_requested') then
    update public.calls set state = 'connected', video_requested_by = null, updated_at = now() where id = c.id;
  else
    return jsonb_build_object('ok', false, 'error', 'not_allowed');
  end if;
  return jsonb_build_object('ok', true);
end $$;
revoke execute on function public.call_video(uuid, text) from public, anon;
grant execute on function public.call_video(uuid, text) to authenticated;

-- Signe de vie pendant l'appel (toutes les 20 s), pour clore les appels abandonnés.
create function public.call_ping(call_id uuid) returns void
language sql security definer set search_path = '' as $$
  update public.calls set updated_at = now()
   where id = call_id and ended_at is null and (auth.uid())::text in (caller_id, callee_id);
$$;
revoke execute on function public.call_ping(uuid) from public, anon;
grant execute on function public.call_ping(uuid) to authenticated;

-- Raccrocher, annuler, ou laisser expirer.
create function public.call_end(call_id uuid, reason text default 'ended') returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  me text := (auth.uid())::text;
  c public.calls;
begin
  select * into c from public.calls k where k.id = call_id for update;
  if c.id is null or me not in (c.caller_id, c.callee_id) then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;
  if c.ended_at is null then
    update public.calls
       set state = case when c.state = 'invited' and reason = 'expired' then 'expired'
                        when c.state = 'invited' and me = c.callee_id then 'declined'
                        else 'ended' end,
           ended_at = now(), updated_at = now()
     where id = c.id;
  end if;
  return jsonb_build_object('ok', true);
end $$;
revoke execute on function public.call_end(uuid, text) from public, anon;
grant execute on function public.call_end(uuid, text) to authenticated;

-- Signalisation WebRTC : seuls les deux participants d'un appel en cours lisent et écrivent sur « call:<id> ».
create policy "appels : signalisation lue par les participants" on realtime.messages for select to authenticated
  using (
    realtime.messages.extension = 'broadcast'
    and exists (select 1 from public.calls c
                 where 'call:' || c.id::text = (select realtime.topic())
                   and c.ended_at is null and (select auth.uid())::text in (c.caller_id, c.callee_id)));
create policy "appels : signalisation envoyée par les participants" on realtime.messages for insert to authenticated
  with check (
    realtime.messages.extension = 'broadcast'
    and exists (select 1 from public.calls c
                 where 'call:' || c.id::text = (select realtime.topic())
                   and c.ended_at is null and (select auth.uid())::text in (c.caller_id, c.callee_id)));
