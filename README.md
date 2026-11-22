# KAPARA

Application de rencontres mobile pour la communauté juive, conçue pour l’international (lancement : Paris).
**KAPARA est un nom de travail** : il est centralisé dans [`packages/config/src/brand.json`](packages/config/src/brand.json).

Trois façons de se rencontrer, un seul profil :

| Univers | Principe |
| --- | --- |
| **Croisés** | Membres croisés récemment, si les deux ont activé la fonction. Position approximative, jamais d’heure ni de lieu exact. |
| **Pour toi** | Sélection quotidienne finie (8 profils), expliquée, basée uniquement sur des réponses volontaires. Pas de swipe. |
| **Live** | Membres disponibles maintenant. Invitation → acceptation → caméra : trois consentements distincts. |

Plus : présentations par un ami en double opt-in, conversations sans accusés de lecture, mode Shabbat, pause.

## Démarrer

```bash
nvm use               # Node 22 LTS
npm install
npm run build -w @kapara/config -w @kapara/shared -w @kapara/design

# Base de données (PostgreSQL 17 + PostGIS 3.5)
npm run db:up
cp apps/api/.env.example apps/api/.env
npm run db:migrate && npm run db:seed
npm run dev:api       # http://localhost:3000/health

# Application (fonctionne seule en mode démo, sans API)
npm run dev:mobile    # puis i (iOS), a (Android) ou w (web)
```

`EXPO_PUBLIC_DEMO=0` branche l’app sur l’API. Comptes de démo : `demo1@demo.kapara.invalid` (Ilan, le membre « vous » de la démo) … `demo29@…` via `POST /v1/auth/demo-login` (désactivé en production).

## Ce qui est réel et ce qui est simulé

| Fonction | État |
| --- | --- |
| Appels audio/vidéo | **Simulés** tant que `LIVEKIT_URL/API_KEY/API_SECRET` ne sont pas fournis. L’app l’annonce clairement. Avec les clés, l’API émet de vrais jetons LiveKit. |
| Paiement | Aucun en v1. |
| IA | Aucune. « Pour toi » est un score explicable (critères déclarés + proximité + retours « pas pour moi »). |
| Photos de démo | Portraits **illustrés générés par code** (`apps/mobile/src/demo/art`), sans visage ni personne réelle, embarqués dans l’app (`kapara-demo://…`). Badge « Profil de démonstration ». |
| Authentification | Connexion démo uniquement pour l’instant (chantier dédié : OTP e-mail + Apple/Google). |

## Architecture

```
apps/
  mobile/   Expo SDK 58 · Expo Router · React Native 0.88 · TanStack Query · i18next
  api/      NestJS 12 · Prisma 7 (adapter pg) · PostGIS · socket.io · LiveKit server SDK · pino
packages/
  config/   nom de l’app, régions, langues, règles produit (source unique)
  shared/   schémas zod + types partagés app/API (profil, vie juive, Live)
  design/   jetons de design (couleurs, typo, espacements, mouvement)
infra/      docker-compose (PostGIS, Redis optionnel, LiveKit dev optionnel)
docs/       benchmark, décisions
status/     kapara.json, lu par le back-office
```

### Choix techniques et compromis

- **Monorepo npm workspaces** : le plus simple, compatible Expo sans configuration Metro. Pas de Turborepo tant que ce n’est pas utile.
- **Expo + Expo Router** : un code pour iOS/Android, routes typées, builds EAS. Compromis : modules natifs (LiveKit) imposent un *development build*, pas Expo Go.
- **NestJS** : domaines clairs (un module par univers), WebSockets intégrés. Un seul service, pas de microservices.
- **Prisma 7 + SQL explicite pour PostGIS** : Prisma pour le modèle et les migrations ; les colonnes `geography` sont `Unsupported` et manipulées en SQL brut (`ST_SnapToGrid`, `ST_DWithin`). La migration initiale crée l’extension `postgis` et un index GIST.
- **Données sensibles** : chaque réponse « vie juive » est un objet `{ value, preferNotToSay, note, visibility, useForMatching }`, privé par défaut ; toute visibilité élargie ou usage pour les suggestions exige un consentement explicite (`SensitiveConsent`, révocable). Le filtrage est fait côté serveur (`apps/api/src/common/visibility.ts`, testé). Rien n’est jamais déduit.
- **Live** : présence et signalisation via socket.io en mémoire (une instance). Redis (`REDIS_URL`) devient nécessaire au-delà d’une instance. Machine d’états testée : la vidéo ne peut pas être activée sans acceptation explicite.
- **i18n** : FR (référence), EN, HE (RTL). Régions = données (`REGIONS`), fuseau et devise par région.
- **TypeScript 5.9** : TypeScript 7 est sorti mais l’outillage Expo/Nest n’est pas encore validé dessus.

## Données de démo

29 membres fictifs (Paris surtout, plus Londres, Tel-Aviv et New York pour le Live), avec des pratiques, origines, âges (24 à 51 ans), situations familiales et orientations variées, des réponses nuancées dont certaines privées ou « je préfère ne pas répondre ». Autour du membre de démo : 8 suggestions expliquées, 5 croisements, 6 présences Live, 4 conversations, 4 présentations, 3 réactions reçues.

- Source unique : `apps/mobile/src/demo/{people,scenarios}.ts`, utilisée par l’app hors ligne **et** par `npm run db:seed` (mêmes identifiants `demo-<prénom>`).
- Portraits : `npm run demo:art -w @kapara/mobile` régénère les 87 images (Chromium de Playwright).
- Traductions : `npm run i18n:check -w @kapara/mobile` vérifie que en et he couvrent toutes les clés de fr.ts (variables et pluriels compris).

## Tests

```bash
npm test -w @kapara/api          # visibilité, scoring, machine d’appel
npm run typecheck
```
