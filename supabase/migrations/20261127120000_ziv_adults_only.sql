-- ZIV : réservé aux personnes majeures (18 ans et plus), appliqué par la base.
-- L'app calcule l'âge à la date locale du membre ; la base est le dernier
-- rempart contre une requête directe : elle refuse toute personne qui n'a
-- pas encore 18 ans où que ce soit sur Terre (date de référence UTC+14), et
-- un profil terminé sans date de naissance. Les données existantes ne sont
-- pas réécrites (vérifié le 27/11/2026 : aucun mineur, aucun profil terminé
-- sans date). Script idempotent : peut être relancé sans risque.

create or replace function public.members_adults_only() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.is_demo then return new; end if;
  if new.birth_date is not null
     and new.birth_date > ((now() at time zone 'Pacific/Kiritimati')::date - interval '18 years')::date then
    raise exception 'adults_only' using errcode = 'check_violation', hint = 'adults_only';
  end if;
  if new.onboarded and new.birth_date is null then
    raise exception 'birth_date_required' using errcode = 'check_violation', hint = 'birth_date_required';
  end if;
  return new;
end $$;

drop trigger if exists members_adults_only on public.members;
create trigger members_adults_only before insert or update of birth_date, onboarded on public.members
  for each row execute function public.members_adults_only();

-- La date de naissance n'est jamais lisible par un autre membre : la table
-- n'est lisible que par son propriétaire (et l'administration), et les
-- fonctions publiques ne renvoient que l'âge.
comment on column public.members.birth_date is 'Privée. Jamais renvoyée aux autres membres ; seul l''âge est exposé.';
