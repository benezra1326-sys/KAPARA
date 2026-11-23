-- Choix d'Avishay (23/11) : choisir le sexe et la ville dans le Live est réservé à Plus et Cercle, pour tous,
-- sans exception selon le sexe (un prix différent selon le sexe pose un risque juridique dans l'UE).
create or replace function public.can_filter_live() returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_admin() or coalesce((select live_filters from public.plans where id = public.my_plan_id()), false);
$$;
