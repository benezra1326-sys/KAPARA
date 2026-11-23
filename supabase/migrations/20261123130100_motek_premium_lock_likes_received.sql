-- Qui vous a remarqué passe uniquement par likes_inbox(), qui masque les profils pour la formule gratuite.
revoke execute on function public.likes_received() from public, anon, authenticated;
