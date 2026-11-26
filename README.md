# ZIV

Application de rencontres mobile pour la communauté juive, conçue pour l’international (lancement : Paris).
**ZIV est le nom de travail actuel** : il est centralisé dans [`packages/config/src/brand.json`](packages/config/src/brand.json). Les identifiants techniques restent `kapara` pendant le prototype.

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

### Mode connecté

`EXPO_PUBLIC_DEMO=0 EXPO_PUBLIC_API_URL=http://<ip-de-la-machine>:3000 npm run dev:mobile` branche l’app sur l’API :

- **Connexion par code e-mail** (pas de mot de passe) : adresse → code à 6 chiffres → l’app. Un compte qui existe déjà va directement aux onglets, un nouveau compte continue l’onboarding, qui enregistre le profil dans l’API. Sans `RESEND_API_KEY`, le serveur de développement renvoie le code à l’app, qui l’affiche dans un encadré « Serveur de développement : aucun email n’est envoyé » ; en production, l’envoi est obligatoire.
- **Session** (`apps/mobile/src/api/session.ts`) : jeton d’accès de 15 min et jeton de rafraîchissement à rotation, rangés dans le trousseau du téléphone (`expo-secure-store`). Le jeton est rafraîchi une minute avant expiration, et une seule fois même si plusieurs requêtes partent en même temps, parce que l’API révoque toute la session si un jeton de rafraîchissement déjà utilisé est présenté de nouveau. Un 401 déclenche un rafraîchissement et un nouvel essai. Si le rafraîchissement est refusé, l’app revient à l’accueil et vide tout ce qu’elle avait en mémoire. Une coupure réseau, elle, ne déconnecte pas.
- Pour toi, Croisés, Messages, présentations, sécurité, mode Shabbat et Live utilisent l’API réelle. La connexion Live ne s’ouvre qu’une fois connecté.
- Sur le web, le trousseau n’existe pas : la session ne survit pas à un rechargement de page (le web sert d’aperçu, pas de cible).

Comptes de démo seedés : `demo1@demo.kapara.invalid` (Ilan, le membre « vous » de la démo) … `demo29@…`, accessibles avec le code e-mail ou via `POST /v1/auth/demo-login` (désactivé en production).

## Ce qui est réel et ce qui est simulé

| Fonction | État |
| --- | --- |
| Appels audio/vidéo | **Simulés** tant que `LIVEKIT_URL/API_KEY/API_SECRET` ne sont pas fournis. L’app l’annonce clairement. Avec les clés, l’API émet de vrais jetons LiveKit. |
| Paiement | Aucun en v1. |
| IA | Aucune. « Pour toi » est un score explicable (critères déclarés + proximité + retours « pas pour moi »). |
| Photos de profil | **Réelles** : choix dans la photothèque (sélecteur système, sans accès à toute la galerie) ou appareil photo, recadrage 4:5, ré-encodage JPEG 1600 px sur le téléphone (métadonnées et position GPS retirées), envoi direct vers un stockage compatible S3 par URL pré-signée. Sans `S3_*` : stockage sur le disque de l’API en développement (annoncé `mode: "local"`), refus en production. App en mode démo : les photos restent sur le téléphone. |
| Photos de démo | Portraits **illustrés générés par code** (`apps/mobile/src/demo/art`), sans visage ni personne réelle, embarqués dans l’app (`kapara-demo://…`). Badge « Profil de démonstration ». |
| Authentification | **Réelle** : code à usage unique par e-mail (Resend), Sign in with Apple, Sign in with Google (jetons vérifiés côté serveur). Sans clé, la méthode est annoncée indisponible (`GET /v1/auth/methods`) ; en développement, le code e-mail est renvoyé dans la réponse avec `delivery: "demo"`. |

## API profils, préférences, découverte (chantier B)

| Route | Rôle |
| --- | --- |
| `GET /auth/methods` | Méthodes réellement configurées (`email` / `demo` / `unavailable`, Apple, Google) |
| `POST /auth/otp/request` · `/auth/otp/verify` | Code à 6 chiffres, 10 min, 5 essais, 1 demande / 30 s et 5 / h par adresse ; seul un HMAC du code est stocké |
| `POST /auth/apple` · `/auth/google` | Jeton d’identité vérifié (signature JWKS, émetteur, audience, expiration, nonce) |
| `POST /auth/refresh` · `/auth/logout` · `/auth/logout-all` | Accès JWT 15 min ; jeton de rafraîchissement opaque 60 j, haché, renouvelé à chaque usage ; réutilisation = toute la session révoquée |
| `GET/PUT /profiles/me` · `PUT /profiles/me/photos` (voir « Photos de profil ») · `PUT/DELETE /profiles/me/location` · `PUT /profiles/me/settings` · `DELETE /profiles/me` | Profil, photos, zone approximative (grille 1 km, jamais renvoyée), pause / mode Shabbat, suppression du compte |
| `POST /profiles/me/consents` · `DELETE /profiles/me/consents/:champ` | Consentement explicite par champ sensible ; le retrait efface la réponse |
| `PUT /profiles/me/jewish-life` | Mise à jour partielle (fusion) ; `null` efface ; 409 `consent_required` si une réponse est envoyée sans consentement |
| `GET/PUT /preferences` | Âge, distance, genres, critères éliminatoires et préférences souples (valeurs contrôlées) |
| `GET /for-you` | Sélection du jour (8 max), stable jusqu’à minuit heure locale, profils complets + raisons |
| `POST /for-you/feedback` · `/for-you/like` · `GET /for-you/likes-received` | « Pas pour moi » (raison facultative), « plus comme ça », like sur une photo ou une réponse précise ; like réciproque = match + conversation |

**Découverte.** Filtres durs en SQL : distance PostGIS (`ST_DWithin` entre zones approximatives, centre de la région à défaut), genre et âge **dans les deux sens**, blocages, déjà aimés, « pas pour moi », profils vus il y a moins de 14 jours. Puis `discovery/scoring.ts` : critères éliminatoires **mutuels**, score = préférences souples du membre 50 %, celles de l’autre sur lui 15 %, proximité 15 % (30 % après deux « trop loin »), ressemblance avec les profils appréciés 20 % (à partir de 3 signaux). Une réponse absente ou non partagée n’élimine jamais et compte comme neutre. Seules les réponses consenties **et** marquées « utilisables pour les suggestions » sont lues (`matchableAnswers`), jamais les champs libres. Chaque suggestion porte 1 à 3 raisons (clés i18n `reason.*`). Distances affichées en tranches (« moins de 5 km »).

## Photos de profil

1. `POST /v1/media/photo-uploads` `{ contentType, size }` → ticket `{ mode, key, uploadUrl, headers, expiresAt }` (5 min, 30 tickets / 10 min par membre). Clé `profiles/<id membre>/<128 bits aléatoires>.jpg`.
2. L’app envoie le fichier en `PUT` sur `uploadUrl` avec les en-têtes donnés. En `s3`, c’est une URL pré-signée SigV4 (`apps/api/src/media/sigv4.ts`, vérifiée contre l’exemple officiel AWS) : le téléphone ne détient aucune clé de stockage.
3. `PUT /v1/profiles/me/photos` `{ photos: [{ id } | { key }] }` : la liste complète et ordonnée (la première est la principale). L’API vérifie chaque nouvelle clé (appartient au membre, fichier présent, vrai JPEG/PNG/WebP lu sur ses premiers octets, ≤ 10 Mo), puis supprime les photos retirées **et leur fichier**. Liste vide acceptée : le profil n’est simplement plus proposé. La suppression du compte efface aussi les fichiers.

Variables : `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_ENDPOINT` (vide pour AWS ; Cloudflare R2, Scaleway, MinIO sinon), `S3_PUBLIC_URL` (domaine public ou CDN de lecture). Sans elles : `UPLOAD_DIR` (`.uploads`) et `PUBLIC_API_URL` en développement.

Compromis : les photos sont lues par une URL publique non devinable (CDN), pas par des URL signées à chaque lecture, pour garder un cache simple. Les fichiers envoyés mais jamais rattachés à un profil (onboarding abandonné) restent : prévoir une règle de cycle de vie du bucket ou un nettoyage périodique. Pas de modération automatique des images en v1 : le signalement existant couvre les photos.

Côté app (`apps/mobile/src/me/photos.ts`, `src/ui/PhotoGrid.tsx`) : 6 emplacements, déplacer avant/après, « photo principale », suppression, actions aussi disponibles au lecteur d’écran ; envoi en arrière-plan avec état « échec, toucher pour réessayer » ; appareil photo refusé → explication et bouton vers les réglages. Étape « Vos photos » dans l’onboarding (encouragée, pas obligatoire).

## Croisés, présentations, conversations, sécurité, mode Shabbat (chantier D)

| Route | Rôle |
| --- | --- |
| `GET/PUT /crossed/settings` | Activer Croisés ; désactiver efface l’historique |
| `POST /crossed/ping` | Échantillon au premier plan (arrondi sur le téléphone, grille serveur, ignoré près des lieux discrets et pendant Shabbat) |
| `GET /crossed` | Membres croisés : prénom, âge, photo, « une fois / plusieurs fois », jamais lieu ni heure |
| `DELETE /crossed/history` · `GET/POST/DELETE /crossed/zones` | Effacer ; lieux discrets (jamais renvoyés en coordonnées) |
| `POST /introductions` · `GET /introductions/inbox` · `GET /introductions/sent` · `POST /introductions/:id/respond` | Présentations en double consentement ; « connected » ouvre une conversation |
| `GET /conversations` · `GET/POST /conversations/:id/messages` · `DELETE /conversations/:id` | Sans accusés de lecture ; `422 kindness_check` avant un message blessant, renvoyer avec `confirmed: true` |
| `GET /safety/blocks` · `POST/DELETE /safety/blocks/:userId` · `POST /safety/reports` | Blocage global ; signalement (bloque par défaut) |
| `GET/PUT /shabbat` | Mode Shabbat privé, prochain créneau calculé pour la ville |

Services exportés pour les autres modules : `BlockService.hiddenFrom/eitherBlocked`, `ShabbatService.isResting`, `ConversationsService.open`.

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

## Live : comment ça marche

Trois consentements distincts, appliqués côté serveur (`apps/api/src/live`) :

1. **Être visible** : opt-in « Je suis disponible », 15 min maximum, coupé sans battement de cœur (90 s).
2. **Accepter un appel** : toujours audio d’abord. L’invitation respecte « Qui peut m’appeler » (personne / mes contacts / membres compatibles), les blocages, la pause et les préférences déclarées des deux côtés. Refus toujours vague (`not_available`) pour ne rien révéler. Après un refus, 24 h avant que la même personne puisse rappeler ; 5 invitations max par 10 min.
3. **Allumer la caméra** : demandée par l’un, acceptée par l’autre. Le jeton LiveKit n’autorise que le micro ; la caméra n’est accordée aux deux participants par le serveur LiveKit (`updateParticipant`, `canPublishSources`) qu’à l’état `video_on`. Chacun peut couper sa caméra ou repasser en audio.

Pendant l’appel : signaler et bloquer en un geste (l’appel s’arrête). Aucun enregistrement ; seul `CallLog` (date, issue, démo ou non) est gardé.

| Contexte | Ce qui se passe |
| --- | --- |
| App sans API (`EXPO_PUBLIC_DEMO` ≠ `0`) | Simulation locale avec profils fictifs badgés ; bandeau « appels simulés ». |
| API sans clés LiveKit | Vraie signalisation (présence, invitations, consentements) mais média simulé, annoncé comme tel. |
| API + clés LiveKit + *development build* | Vrais appels audio/vidéo. Expo Go ne contient pas WebRTC : l’app l’indique. |
| Web | Démo uniquement pour l’instant. |

LiveKit en local : `docker compose -f infra/docker-compose.yml --profile live up -d`, puis `LIVEKIT_URL=ws://localhost:7880`, `LIVEKIT_API_KEY=devkey`, `LIVEKIT_API_SECRET=secret` (clés du mode `--dev`). Build natif : `npx expo run:ios` / `run:android` ou EAS.

Limite connue : présence et appels sont en mémoire (une instance d’API). Au-delà, passer `PresenceStore` et `CallRegistry` sur Redis.

## Données de démo

29 membres fictifs (Paris surtout, plus Londres, Tel-Aviv et New York pour le Live), avec des pratiques, origines, âges (24 à 51 ans), situations familiales et orientations variées, des réponses nuancées dont certaines privées ou « je préfère ne pas répondre ». Autour du membre de démo : 8 suggestions expliquées, 5 croisements, 6 présences Live, 4 conversations, 4 présentations, 3 réactions reçues.

- Source unique : `apps/mobile/src/demo/{people,scenarios}.ts`, utilisée par l’app hors ligne **et** par `npm run db:seed` (mêmes identifiants `demo-<prénom>`).
- Portraits : `npm run demo:art -w @kapara/mobile` régénère les 87 images (Chromium de Playwright).
- Traductions : `npm run i18n:check -w @kapara/mobile` vérifie que en et he couvrent toutes les clés de fr.ts (variables et pluriels compris) et que chaque `t('…')` utilisé dans l’app existe. Lancé en CI.

## Tests

```bash
npm test -w @kapara/api          # visibilité, scoring, machine d’appel
npm run typecheck
```
