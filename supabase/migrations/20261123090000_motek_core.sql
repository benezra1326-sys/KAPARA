-- ZIV : base réelle sur Supabase (comptes, profils, likes, conversations, sécurité, administration).
-- Les profils de démo (is_demo) sont dans la même table que les vrais membres, avec un badge dans l'app.
-- Données de vie juive : lisibles en entier uniquement par leur propriétaire ; les autres membres
-- ne reçoivent que les réponses partagées (« membres », ou « matchs » après un double like),
-- via les fonctions ci-dessous. Jamais de lecture directe de la table par un autre membre.

create extension if not exists pgcrypto with schema extensions;

-- ── Administrateurs ────────────────────────────────────────────────────────
-- Empreintes SHA-256 des adresses (jamais l'adresse en clair, comme dans l'app).
create table public.admin_email_hashes (hash text primary key);
alter table public.admin_email_hashes enable row level security; -- aucune politique : invisible aux clients

insert into public.admin_email_hashes (hash) values
  ('20bccfa0a6f8d190a33c0d18777c757a28fe498b90f366ae8690d1dc9953528e'),
  ('9342ebeff4ec056b18a8375a3b0ab8e103ca4c1284cee41b5a726b2207c050e2');

-- Administrateur = adresse reconnue ET vérifiée (e-mail confirmé ou fournisseur Google/Facebook/Apple).
create function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from auth.users u
    join public.admin_email_hashes h on h.hash = encode(extensions.digest(lower(u.email), 'sha256'), 'hex')
    where u.id = auth.uid() and u.email_confirmed_at is not null
  );
$$;

-- ── Membres ────────────────────────────────────────────────────────────────
create table public.members (
  id text primary key,                       -- auth.users.id pour un vrai membre, « demo-<clé> » pour la démo
  is_demo boolean not null default false,
  first_name text not null default '' check (char_length(first_name) <= 40),
  gender text check (gender in ('woman', 'man', 'nonbinary')),
  seeks text[] not null default '{}',
  birth_date date,
  region_code text not null default 'fr-paris',
  headline text not null default '' check (char_length(headline) <= 140),
  languages text[] not null default '{fr}',
  prompts jsonb not null default '[]',
  photos jsonb not null default '[]',
  jewish_life jsonb not null default '{}',   -- sensible : jamais exposé tel quel aux autres
  consents jsonb not null default '{}',
  privacy jsonb not null default '{}',
  preferences jsonb not null default '{}',
  verified boolean not null default false,
  onboarded boolean not null default false,
  suspended boolean not null default false,
  provider text,                              -- google | facebook | apple | email (dernier utilisé)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_seen_at timestamptz
);
create index members_discover_idx on public.members (onboarded, suspended);
alter table public.members enable row level security;

create policy "membre : lit sa fiche" on public.members for select to authenticated
  using (id = (select auth.uid())::text or (select public.is_admin()));
create policy "membre : crée sa fiche" on public.members for insert to authenticated
  with check (id = (select auth.uid())::text and is_demo = false);
create policy "membre : modifie sa fiche" on public.members for update to authenticated
  using (id = (select auth.uid())::text or (select public.is_admin()))
  with check (id = (select auth.uid())::text or (select public.is_admin()));
create policy "membre : supprime sa fiche" on public.members for delete to authenticated
  using (id = (select auth.uid())::text);

-- Un membre ne peut ni se vérifier, ni se suspendre/réactiver, ni se déclarer « démo ».
create function public.members_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() and auth.uid() is not null then
    if tg_op = 'INSERT' then
      new.verified := false; new.suspended := false; new.is_demo := false;
    else
      new.verified := old.verified; new.suspended := old.suspended; new.is_demo := old.is_demo;
    end if;
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger members_guard before insert or update on public.members
  for each row execute function public.members_guard();

-- Suppression du compte = suppression de la fiche.
create function public.on_auth_user_deleted() returns trigger
language plpgsql security definer set search_path = '' as $$
begin delete from public.members where id = old.id::text; return old; end $$;
create trigger on_auth_user_deleted after delete on auth.users
  for each row execute function public.on_auth_user_deleted();

-- ── Likes, conversations, messages ────────────────────────────────────────
create table public.likes (
  from_id text not null references public.members(id) on delete cascade,
  to_id text not null references public.members(id) on delete cascade,
  target jsonb not null default '{}',
  comment text check (char_length(comment) <= 200),
  created_at timestamptz not null default now(),
  primary key (from_id, to_id),
  check (from_id <> to_id)
);
alter table public.likes enable row level security;
create policy "likes : les miens et ceux reçus" on public.likes for select to authenticated
  using (from_id = (select auth.uid())::text or to_id = (select auth.uid())::text or (select public.is_admin()));
create policy "likes : j'envoie" on public.likes for insert to authenticated
  with check (from_id = (select auth.uid())::text);
create policy "likes : je retire" on public.likes for delete to authenticated
  using (from_id = (select auth.uid())::text);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  a_id text not null references public.members(id) on delete cascade,
  b_id text not null references public.members(id) on delete cascade,
  origin text not null default 'like' check (origin in ('like', 'introduction', 'live', 'other')),
  created_at timestamptz not null default now(),
  closed_at timestamptz,
  check (a_id < b_id),
  unique (a_id, b_id)
);
alter table public.conversations enable row level security;
create policy "conversations : participants" on public.conversations for select to authenticated
  using ((select auth.uid())::text in (a_id, b_id) or (select public.is_admin()));
create policy "conversations : un participant ferme" on public.conversations for update to authenticated
  using ((select auth.uid())::text in (a_id, b_id)) with check ((select auth.uid())::text in (a_id, b_id));

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id text not null default (auth.uid())::text references public.members(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index messages_conv_idx on public.messages (conversation_id, created_at);
alter table public.messages enable row level security;
create policy "messages : participants lisent" on public.messages for select to authenticated
  using (exists (select 1 from public.conversations c where c.id = conversation_id
    and ((select auth.uid())::text in (c.a_id, c.b_id) or (select public.is_admin()))));
create policy "messages : participant écrit si ouverte" on public.messages for insert to authenticated
  with check (sender_id = (select auth.uid())::text and exists (
    select 1 from public.conversations c where c.id = conversation_id and c.closed_at is null
      and (select auth.uid())::text in (c.a_id, c.b_id)));

-- Double like entre deux vrais membres = conversation ouverte.
create function public.on_like() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from public.likes l where l.from_id = new.to_id and l.to_id = new.from_id)
     and not exists (select 1 from public.members m where m.id in (new.from_id, new.to_id) and m.is_demo) then
    insert into public.conversations (a_id, b_id, origin)
    values (least(new.from_id, new.to_id), greatest(new.from_id, new.to_id), 'like')
    on conflict (a_id, b_id) do nothing;
  end if;
  return new;
end $$;
create trigger on_like after insert on public.likes for each row execute function public.on_like();

-- ── Sécurité ───────────────────────────────────────────────────────────────
create table public.blocks (
  blocker_id text not null references public.members(id) on delete cascade,
  blocked_id text not null references public.members(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id)
);
alter table public.blocks enable row level security;
create policy "blocages : les miens" on public.blocks for all to authenticated
  using (blocker_id = (select auth.uid())::text) with check (blocker_id = (select auth.uid())::text);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id text not null default (auth.uid())::text references public.members(id) on delete cascade,
  reported_id text not null references public.members(id) on delete cascade,
  reason text not null,
  details text check (char_length(details) <= 1000),
  context text not null default 'profile',
  status text not null default 'open' check (status in ('open', 'dismissed', 'warned', 'suspended')),
  created_at timestamptz not null default now(),
  handled_at timestamptz
);
alter table public.reports enable row level security;
create policy "signalements : j'envoie" on public.reports for insert to authenticated
  with check (reporter_id = (select auth.uid())::text);
create policy "signalements : admin lit" on public.reports for select to authenticated using ((select public.is_admin()));
create policy "signalements : admin traite" on public.reports for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- ── Vues publiques (fonctions) ────────────────────────────────────────────
-- Réponses de vie juive visibles par un autre membre.
create function public.shared_jewish_life(jl jsonb, is_match boolean) returns jsonb
language sql immutable set search_path = '' as $$
  select coalesce(jsonb_object_agg(e.key, e.value), '{}'::jsonb)
  from jsonb_each(coalesce(jl, '{}'::jsonb)) e
  where coalesce((e.value->>'preferNotToSay')::boolean, false) = false
    and (e.value->>'visibility' = 'members' or (is_match and e.value->>'visibility' = 'matches'));
$$;

create function public.public_card(m public.members, viewer text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'id', m.id, 'firstName', m.first_name,
    'age', coalesce(extract(year from age(m.birth_date))::int, 18),
    'regionCode', m.region_code, 'headline', nullif(m.headline, ''), 'languages', to_jsonb(m.languages),
    'photos', m.photos, 'prompts', coalesce((select jsonb_agg(p) from (select p from jsonb_array_elements(m.prompts) p limit 4) s), '[]'::jsonb),
    'jewishLife', public.shared_jewish_life(m.jewish_life, exists (
      select 1 from public.conversations c where c.a_id = least(m.id, viewer) and c.b_id = greatest(m.id, viewer))),
    'verified', m.verified, 'isDemo', m.is_demo
  );
$$;

-- Personnes visibles par le membre connecté : fiches finies, non suspendues, sans blocage dans un sens ou l'autre.
create function public.visible_members() returns setof public.members
language sql stable security definer set search_path = '' as $$
  select m.* from public.members m
  where m.onboarded and not m.suspended and m.id <> (auth.uid())::text and auth.uid() is not null
    and not exists (select 1 from public.blocks b where (b.blocker_id = (auth.uid())::text and b.blocked_id = m.id)
                                                  or (b.blocker_id = m.id and b.blocked_id = (auth.uid())::text));
$$;
revoke execute on function public.visible_members() from public, anon;

-- Fiches publiques (toutes, ou celles demandées).
create function public.member_cards(ids text[] default null) returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(public.public_card(m, (auth.uid())::text) order by m.is_demo, m.created_at desc), '[]'::jsonb)
  from public.visible_members() m
  where ids is null or m.id = any(ids);
$$;
revoke execute on function public.member_cards(text[]) from public, anon;
grant execute on function public.member_cards(text[]) to authenticated;

-- « Pour toi » : vrais membres d'abord (genre recherché réciproque si renseigné), puis profils de démo.
create function public.for_you(max_count int default 12) returns jsonb
language sql stable security definer set search_path = '' as $$
  with me as (select * from public.members where id = (auth.uid())::text)
  select coalesce(jsonb_agg(public.public_card(m, (auth.uid())::text) order by m.is_demo, m.created_at desc), '[]'::jsonb)
  from (
    select v.* from public.visible_members() v, me
    where (cardinality(me.seeks) = 0 or v.gender is null or v.gender = any(me.seeks))
      and (cardinality(v.seeks) = 0 or me.gender is null or me.gender = any(v.seeks))
      and not exists (select 1 from public.likes l where l.from_id = me.id and l.to_id = v.id)
    order by v.is_demo, v.created_at desc
    limit max_count
  ) m;
$$;
revoke execute on function public.for_you(int) from public, anon;
grant execute on function public.for_you(int) to authenticated;

-- Conversations du membre, avec l'autre personne et le dernier message.
create function public.my_conversations() returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(x order by x->>'sortAt' desc), '[]'::jsonb) from (
    select jsonb_build_object(
      'id', c.id, 'origin', c.origin, 'createdAt', c.created_at, 'closed', c.closed_at is not null,
      'other', jsonb_build_object('id', o.id, 'firstName', o.first_name, 'photoUrl', o.photos->0->>'url', 'isDemo', o.is_demo),
      'lastMessage', (select jsonb_build_object('id', mm.id, 'senderId', mm.sender_id, 'mine', mm.sender_id = (auth.uid())::text,
                        'body', mm.body, 'createdAt', mm.created_at)
                      from public.messages mm where mm.conversation_id = c.id order by mm.created_at desc limit 1),
      'sortAt', coalesce((select max(mm.created_at) from public.messages mm where mm.conversation_id = c.id), c.created_at)
    ) x
    from public.conversations c
    join public.members o on o.id = case when c.a_id = (auth.uid())::text then c.b_id else c.a_id end
    where (auth.uid())::text in (c.a_id, c.b_id) and c.closed_at is null
      and not exists (select 1 from public.blocks b where (b.blocker_id = (auth.uid())::text and b.blocked_id = o.id)
                                                    or (b.blocker_id = o.id and b.blocked_id = (auth.uid())::text))
  ) s;
$$;
revoke execute on function public.my_conversations() from public, anon;
grant execute on function public.my_conversations() to authenticated;

-- Likes reçus (vrais membres uniquement, pas encore rendus).
create function public.likes_received() returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('from', public.public_card(m, (auth.uid())::text), 'target', l.target,
    'comment', l.comment, 'createdAt', l.created_at) order by l.created_at desc), '[]'::jsonb)
  from public.likes l join public.visible_members() m on m.id = l.from_id
  where l.to_id = (auth.uid())::text
    and not exists (select 1 from public.likes back where back.from_id = l.to_id and back.to_id = l.from_id);
$$;
revoke execute on function public.likes_received() from public, anon;
grant execute on function public.likes_received() to authenticated;

-- ── Administration ─────────────────────────────────────────────────────────
-- Vue d'ensemble pour l'administrateur : tous les membres (sans les réponses sensibles), avec e-mail et dernière connexion.
create function public.admin_members() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  return (select coalesce(jsonb_agg(jsonb_build_object(
      'id', m.id, 'firstName', m.first_name, 'isDemo', m.is_demo, 'gender', m.gender, 'regionCode', m.region_code,
      'age', extract(year from age(m.birth_date))::int, 'photoUrl', m.photos->0->>'url', 'photos', jsonb_array_length(m.photos),
      'onboarded', m.onboarded, 'suspended', m.suspended, 'verified', m.verified, 'provider', m.provider,
      'email', u.email, 'createdAt', m.created_at, 'lastSignInAt', u.last_sign_in_at,
      'reports', (select count(*) from public.reports r where r.reported_id = m.id and r.status = 'open'),
      'isAdmin', exists (select 1 from public.admin_email_hashes h where h.hash = encode(extensions.digest(lower(u.email), 'sha256'), 'hex'))
    ) order by m.is_demo, m.created_at desc), '[]'::jsonb)
    from public.members m left join auth.users u on u.id::text = m.id);
end $$;
revoke execute on function public.admin_members() from public, anon;
grant execute on function public.admin_members() to authenticated;

create function public.admin_stats() returns jsonb
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
    'signups7d', (select count(*) from public.members where not is_demo and created_at > now() - interval '7 days')
  );
end $$;
revoke execute on function public.admin_stats() from public, anon;
grant execute on function public.admin_stats() to authenticated;

create function public.admin_reports() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  return (select coalesce(jsonb_agg(jsonb_build_object(
      'id', r.id, 'reason', r.reason, 'details', r.details, 'context', r.context, 'status', r.status, 'createdAt', r.created_at,
      'reported', jsonb_build_object('id', d.id, 'firstName', d.first_name, 'photoUrl', d.photos->0->>'url', 'isDemo', d.is_demo, 'suspended', d.suspended),
      'reporter', jsonb_build_object('id', s.id, 'firstName', s.first_name)
    ) order by r.status = 'open' desc, r.created_at desc), '[]'::jsonb)
    from public.reports r join public.members d on d.id = r.reported_id join public.members s on s.id = r.reporter_id);
end $$;
revoke execute on function public.admin_reports() from public, anon;
grant execute on function public.admin_reports() to authenticated;

-- Fonctions internes : pas d'appel direct par les clients.
revoke execute on function public.public_card(public.members, text) from public, anon, authenticated;
revoke execute on function public.members_guard() from public, anon, authenticated;
revoke execute on function public.on_like() from public, anon, authenticated;
revoke execute on function public.on_auth_user_deleted() from public, anon, authenticated;

-- ── Photos ─────────────────────────────────────────────────────────────────
-- Bucket public en lecture (chemins imprévisibles), écriture dans son propre dossier uniquement.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "photos : j'ajoute dans mon dossier" on storage.objects for insert to authenticated
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "photos : je remplace les miennes" on storage.objects for update to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "photos : je supprime les miennes" on storage.objects for delete to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- ── Temps réel : nouveaux messages ────────────────────────────────────────
alter publication supabase_realtime add table public.messages;

-- Une conversation ne peut être que fermée par un participant, rien d'autre.
revoke update on public.conversations from authenticated;
grant update (closed_at) on public.conversations to authenticated;
