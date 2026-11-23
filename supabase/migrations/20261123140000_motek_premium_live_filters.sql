-- Retour d'Avishay (23/11) : gratuit plus généreux (20 réactions par jour) ; le Live gratuit est un
-- appariement aléatoire mondial, sans choix du sexe ni de la ville. Choisir le sexe et la ville dans le Live
-- est payant pour les hommes ; les femmes l'ont gratuitement. Plus de plafond d'appels lancés par jour.
alter table public.plans add column live_filters boolean not null default false;
update public.plans set likes_per_day = 20, live_calls_per_day = null, live_filters = false where id = 'free';
update public.plans set likes_per_day = 60, live_calls_per_day = null, live_filters = true where id = 'plus';
update public.plans set likes_per_day = null, live_calls_per_day = null, live_filters = true where id = 'cercle';

-- Choisir le sexe et la ville dans le Live : formule payante, femmes et administrateur.
create function public.can_filter_live() returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_admin()
    or (select live_filters from public.plans where id = public.my_plan_id())
    or coalesce((select gender = 'woman' from public.members where id = (auth.uid())::text), false);
$$;
revoke execute on function public.can_filter_live() from public, anon;
grant execute on function public.can_filter_live() to authenticated;

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
                                 'seeLikes', p.see_likes, 'rewind', p.rewind, 'discreet', p.discreet, 'liveFilters', p.live_filters),
    'liveFiltersAllowed', public.can_filter_live(),
    'used', jsonb_build_object(
      'like', coalesce((select u.used from public.usage_daily u, d where u.member_id = (auth.uid())::text and u.day = d.day and u.kind = 'like'), 0),
      'liveCall', coalesce((select u.used from public.usage_daily u, d where u.member_id = (auth.uid())::text and u.day = d.day and u.kind = 'live_call'), 0)),
    'resetsAt', public.member_next_reset((select timezone from me))
  ) from p;
$$;
