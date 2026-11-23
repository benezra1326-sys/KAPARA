-- visible_members() renvoie des lignes complètes (réponses sensibles comprises) : réservée aux fonctions internes.
revoke execute on function public.visible_members() from authenticated;
revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;
revoke execute on function public.shared_jewish_life(jsonb, boolean) from public, anon, authenticated;
