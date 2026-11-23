-- Retours du fil Tests (23 novembre 2026)
-- 1. Profil en pause (privacy.paused) : invisible des autres membres.
-- 2. Un profil sans photo n'apparaît pas dans « Pour toi » (promis par l'écran Photos).
-- 3. Supprimer son compte supprime aussi l'utilisateur Auth (les photos sont effacées par l'app avant).

create or replace function public.visible_members()
 returns setof public.members
 language sql
 stable security definer
 set search_path to ''
as $function$
  select m.* from public.members m
  where m.onboarded and not m.suspended and m.id <> (auth.uid())::text and auth.uid() is not null
    and jsonb_array_length(m.photos) > 0
    and not coalesce((m.privacy->>'paused')::boolean, false)
    and not exists (select 1 from public.blocks b where (b.blocker_id = (auth.uid())::text and b.blocked_id = m.id)
                                                  or (b.blocker_id = m.id and b.blocked_id = (auth.uid())::text))
    and not (coalesce((m.privacy->>'discreet')::boolean, false) and public.member_plan(m) = 'cercle'
             and not exists (select 1 from public.likes l where l.from_id = m.id and l.to_id = (auth.uid())::text));
$function$;

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

-- 4. Le mot laissé avec un like ouvre la conversation quand le like devient réciproque.
create or replace function public.on_like() returns trigger
language plpgsql security definer set search_path = '' as $$
declare conv uuid; other public.likes;
begin
  select * into other from public.likes l where l.from_id = new.to_id and l.to_id = new.from_id;
  if found and not exists (select 1 from public.members m where m.id in (new.from_id, new.to_id) and m.is_demo) then
    insert into public.conversations (a_id, b_id, origin)
    values (least(new.from_id, new.to_id), greatest(new.from_id, new.to_id), 'like')
    on conflict (a_id, b_id) do nothing
    returning id into conv;
    if conv is not null then
      insert into public.messages (conversation_id, sender_id, body, created_at)
      select conv, x.from_id, x.comment, x.created_at
      from (values (other.from_id, other.comment, other.created_at), (new.from_id, new.comment, new.created_at)) as x(from_id, comment, created_at)
      where nullif(btrim(x.comment), '') is not null
      order by x.created_at;
    end if;
  end if;
  return new;
end $$;
