# MOTEK sur Supabase (vraie base)

Depuis le 23 novembre 2026, la démo web (https://motek-demo.vercel.app) fonctionne sur une vraie base Supabase.

- Projet Supabase : **motek** (région Paris, `eu-west-3`), organisation d'Avishay. URL : `https://gvtixevqemhsahhxiqsr.supabase.co`.
- L'app l'utilise dès que la compilation a `EXPO_PUBLIC_SUPABASE_URL` et `EXPO_PUBLIC_SUPABASE_KEY` (clé publique « publishable », faite pour être dans l'app ; déjà dans `vercel.json`).
- Schéma : `supabase/migrations/` (appliqué). Profils de démo : `supabase/seed/` (55 profils, mêmes identifiants `demo-<clé>` et mêmes photos que l'app).
- Création de compte par e-mail : fonction `supabase/functions/signup` (déployée).

## Ce qui est réel

| Partie | Où c'est stocké |
| --- | --- |
| Comptes (e-mail + mot de passe ; Google et Facebook dès qu'ils sont activés) | Supabase Auth |
| Mon profil (prénom, date de naissance, genre, ville, phrases, réponses de vie juive, consentements) | table `members`, même profil sur tous les appareils |
| Mes photos | bucket `photos` (dossier = mon identifiant) |
| Mes préférences | `members.preferences` ; les genres choisis décident de qui apparaît dans « Pour toi » |
| Pour toi | fonction `for_you()` : vrais membres d'abord, puis profils de démo (badge « démo ») |
| Likes | table `likes` ; un double like entre deux vrais membres ouvre une conversation |
| Messages | tables `conversations` et `messages`, arrivée en direct (Realtime) |
| Blocages, signalements | tables `blocks` et `reports` |
| Administration (Moi › Espace administrateur) | fonctions `admin_members()`, `admin_reports()`, `admin_stats()` : tous les comptes, leurs e-mails, signalements, suspension |

Toujours en démonstration (annoncé dans l'app) : Croisés, Live, présentations.

## Sécurité

- Chaque table a des règles d'accès (RLS) : un membre ne lit que sa propre fiche. Les autres membres ne reçoivent que la fiche publique, avec seulement les réponses partagées « membres » (ou « matchs » après un double like), jamais les réponses privées.
- Administrateur : décidé par la base. Adresse parmi les empreintes SHA-256 de `admin_email_hashes` (les deux adresses d'Avishay) **et** adresse vérifiée (lien de confirmation, ou connexion Google). Un membre ne peut ni se vérifier, ni se suspendre/réactiver lui-même.
- Les comptes e-mail sont créés déjà confirmés (pas encore de service d'envoi d'e-mails branché), sauf les adresses administrateur, qui doivent toujours être prouvées.

## À faire par Avishay (une seule fois)

### 1. Adresse du site (1 minute, indispensable pour Google, Facebook et les liens e-mail)
Supabase → projet **motek** → Authentication → **URL Configuration** :
- Site URL : `https://motek-demo.vercel.app`
- Redirect URLs, ajouter : `https://motek-demo.vercel.app/**`

### 2. Google (10 minutes)
1. https://console.cloud.google.com → créer un projet « MOTEK ».
2. APIs & Services → **OAuth consent screen** : type « External », nom MOTEK, votre e-mail ; publier (« In production »).
3. APIs & Services → **Credentials** → Create credentials → **OAuth client ID** → type « Web application ».
   - Authorized JavaScript origins : `https://motek-demo.vercel.app`
   - Authorized redirect URIs : `https://gvtixevqemhsahhxiqsr.supabase.co/auth/v1/callback`
4. Copier le **Client ID** et le **Client secret**.
5. Supabase → Authentication → **Sign In / Providers** → Google → activer, coller les deux valeurs, enregistrer.

### 3. Facebook (15 minutes)
1. https://developers.facebook.com → My Apps → Create App → cas d'usage « Authenticate and request data from users with Facebook Login ».
2. Facebook Login → Settings → **Valid OAuth Redirect URIs** : `https://gvtixevqemhsahhxiqsr.supabase.co/auth/v1/callback`.
3. App settings → Basic : copier **App ID** et **App Secret** ; renseigner une URL de politique de confidentialité ; passer l'app en mode **Live**.
4. Supabase → Authentication → Sign In / Providers → Facebook → activer, coller les deux valeurs.

Tant qu'un fournisseur n'est pas activé, son bouton le dit (« en cours d'activation ») au lieu de faire semblant.

### 4. Apple
Attend le compte Apple Developer (99 $/an). Le bouton l'annonce.

### Plus tard
- Envoi d'e-mails à toutes les adresses (mot de passe oublié, confirmations) : brancher un service d'envoi (Resend) dans Supabase → Authentication → SMTP. Sans lui, Supabase n'envoie qu'aux adresses de l'équipe du projet.

## Recharger les profils de démo

```
npx tsx supabase/seed/demo-members.mts   # régénère supabase/seed/demo-members.json
```
puis exécuter `supabase/seed/load-demo-members.sql` (en remplaçant `<commit>` par le commit poussé). Les vrais membres ne sont jamais touchés.
