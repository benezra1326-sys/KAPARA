# Environnements et serveur de production

Une compilation de ZIV parle à **un seul** backend, choisi explicitement. Rien ne se mélange en silence.

| `EXPO_PUBLIC_BACKEND` | Données | Usage |
| --- | --- | --- |
| `demo` | membres fictifs sur l’appareil, rien ne sort | revues de design, démonstrations hors ligne |
| `test` | projet Supabase de test (comptes réels + profils démo badgés) | aperçu web (ziv-demo.vercel.app), testeurs |
| `api` | API ZIV (NestJS + PostgreSQL/PostGIS) | développement contre l’API **et production** |

`EXPO_PUBLIC_APP_ENV` = `development` · `preview` · `production`.

## Règles appliquées par le code

- `packages/config/src/backend.ts` (`checkAppEnv`) est la seule source. `app.config.ts` l’exécute à chaque build : une compilation `production` (ou le profil EAS `production`) est **refusée** si le backend n’est pas `api`, si `EXPO_PUBLIC_API_URL` manque, n’est pas en `https://`, pointe vers `localhost`/une IP locale/un domaine `.invalid`, ou si des clés Supabase de test sont présentes. Le message nomme la variable, jamais sa valeur.
- Dans l’app (`src/env.ts`), le backend `api` n’utilise jamais les données de démo (`DEMO_MODE` est faux) ni Supabase ; une version de production mal configurée affiche « Configuration incomplète » au lieu d’ouvrir l’app. Hors production, un badge (accueil et « Moi ») indique l’environnement : « Démonstration », « Base de test » ou « Serveur ZIV · hôte ».
- Les anciennes variables restent comprises (`EXPO_PUBLIC_DEMO=0` → `api`, clés Supabase → `test`), sans jamais combiner deux backends.

## Pourquoi NestJS pour la production

L’API NestJS couvre tous les parcours retenus (connexion par code e-mail, Apple, Google ; profil, photos S3 ; Pour toi ; Croisés ; présentations ; messages ; blocage et signalement ; modération ; Live avec LiveKit). Supabase ne couvre pas Croisés, Live ni les présentations : il reste la base de **test** de l’aperçu web, isolée, jusqu’à couverture équivalente. Aucun état hybride en production.

## Ce que l’API exige en production (`NODE_ENV=production`)

Elle refuse de démarrer (`apps/api/src/common/env.ts`, `productionProblems`) sans :

- `JWT_SECRET` aléatoire d’au moins 32 caractères ;
- `DATABASE_URL` hors localhost ;
- `RESEND_API_KEY` + `MAIL_FROM` (codes de connexion) ;
- `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` (photos) ;
- les trois `LIVEKIT_*` ensemble, ou aucun : sans LiveKit, Live est **désactivé** et annoncé comme tel (`GET /v1/live/status` → `disabled`), jamais simulé ;
- `API_INSTANCES=1` : présence et appels Live sont en mémoire ; plusieurs instances exigent d’abord un stockage partagé (Redis), non encore écrit ;
- aucune donnée de démo : l’API refuse de démarrer si la base contient des comptes `isDemo`. `npm run db:purge-demo` (simulation) puis `npm run db:purge-demo -- --yes` les retire ; le seed refuse de tourner en production.

## Exemples

```bash
# Démo locale
EXPO_PUBLIC_BACKEND=demo npm run dev:mobile
# Contre l’API locale
EXPO_PUBLIC_BACKEND=api EXPO_PUBLIC_API_URL=http://192.168.1.20:3000 npm run dev:mobile
# Aperçu web Supabase (vercel.json)
EXPO_PUBLIC_BACKEND=test EXPO_PUBLIC_APP_ENV=preview EXPO_PUBLIC_SUPABASE_URL=… EXPO_PUBLIC_SUPABASE_KEY=…
# Production (eas.json, profil production) : à compléter avec l’adresse publique de l’API
EXPO_PUBLIC_BACKEND=api EXPO_PUBLIC_APP_ENV=production EXPO_PUBLIC_API_URL=https://api.<domaine>
```

Variables : `apps/mobile/.env.example`, `apps/api/.env.example`.
