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
