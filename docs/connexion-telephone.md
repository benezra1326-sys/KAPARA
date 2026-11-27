# Connexion par numéro de téléphone (SMS)

## Ce que fait l'app
- Bouton « Continuer avec mon numéro » à l'accueil, sous Google et Facebook.
- Écran `app/onboarding/phone.tsx` : indicatif (pré-rempli selon le pays de l'appareil, modifiable, **tous les pays acceptés**) + numéro, puis code à 6 chiffres reçu par SMS (rempli automatiquement par le clavier iPhone).
- Un numéro connu ouvre l'app ; un nouveau numéro commence le profil, comme Google ou l'email.
- Le bouton n'apparaît que lorsque Supabase dit que le fournisseur « phone » est actif (`/auth/v1/settings`). Avant, l'accueil l'annonce dans « Bientôt : connexion avec … ».
- Démo hors ligne : aucun SMS, l'écran le dit ; le même numéro retrouve le même compte sur l'appareil.
- Le numéro n'est jamais montré aux autres membres ni écrit dans les journaux de l'app.

## Côté serveur
Supabase Auth envoie et vérifie les codes (`signInWithOtp({ phone })`, `verifyOtp({ type: 'sms' })`). L'envoi passe par **Twilio** (Account SID, Auth Token, Messaging Service SID), à coller dans Supabase → Authentication → Sign In / Providers → Phone. Étapes : `docs/supabase.md`, section 4.

## Précautions avant d'ouvrir à tous
- **Coût** : chaque SMS est facturé par Twilio (quelques centimes en Europe, plus cher ailleurs). Mettre une alerte de dépense dans Twilio.
- **Fraude aux SMS** (« SMS pumping ») : dans Twilio → Messaging → Settings → **Geo permissions**, n'autoriser que les pays utiles et activer « SMS Pumping Protection ». Garder la limite Supabase par défaut (Authentication → Rate Limits → SMS).
- Les comptes d'essai Twilio n'envoient qu'aux numéros vérifiés dans Twilio : il faut un compte payant pour tout le monde.
