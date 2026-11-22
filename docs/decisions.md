# Journal des décisions

| Date | Décision | Raison |
| --- | --- | --- |
| 2026-11-22 | Monorepo npm workspaces (apps/mobile, apps/api, packages/*) | Simplicité, compatible Expo |
| 2026-11-22 | Expo SDK 58, RN 0.88, Expo Router 58 | Dernières versions stables (npm) |
| 2026-11-22 | NestJS 12, Prisma 7.10 (adapter pg), PostGIS 3.5 / PostgreSQL 17 | Stables ; Prisma 8 encore en RC |
| 2026-11-22 | TypeScript 5.9 | TS 7 trop récent pour l’outillage |
| 2026-11-22 | Live : socket.io + LiveKit, mode démo sans clés | Consentement par étapes, honnêteté |
| 2026-11-22 | Pour toi : sélection quotidienne de 8, un profil à la fois, réaction sur photo/réponse | Benchmark : pas de swipe, contact ciblé |
| 2026-11-22 | Dealbreakers : une réponse absente ou non partagée n’exclut jamais | Pas de déduction, pas de pénalité |
| 2026-11-22 | Croisés : grille 150 m, rayon 250 m, fenêtre 72 h, jamais lieu/heure | Vie privée |
| 2026-11-22 | Direction artistique « candlelight editorial » : ivoire, encre, grenade, laiton ; Fraunces + Inter | Chaleureux, élégant, non générique |
| 2026-11-22 | Auth : OTP e-mail (Resend, HTTP sans SDK) + Apple/Google vérifiés avec `jose` 6 | Pas de mot de passe ; une seule dépendance, maintenue |
| 2026-11-22 | Accès JWT 15 min + rafraîchissement opaque haché, rotation, détection de réutilisation | Sessions révocables, vol de jeton limité |
| 2026-11-22 | Liaison Apple/Google à un compte existant seulement par e-mail marqué vérifié | Pas de prise de compte par e-mail non vérifié |
| 2026-11-22 | Aucune réponse « vie juive » stockée sans consentement explicite du champ ; retrait = effacement | RGPD art. 9 : pas de consentement, pas de stockage |
| 2026-11-22 | Zone de domicile sur grille 1 km, jamais renvoyée ; distances en tranches | Pas de localisation précise, même pour « Pour toi » |
| 2026-11-22 | Critères éliminatoires, âge, genre et distance mutuels ; réponse inconnue = neutre | Respect des deux personnes, pas de pénalité au silence |
| 2026-11-22 | Sélection du jour persistée (`DailyPick`), renouvelée à minuit heure locale | Liste finie et stable, pas de swipe infini |
| 2026-11-22 | Match = conversation créée automatiquement | Pas de match sans moyen d’écrire |
| 2026-11-22 | Croisés : arrondi ~110 m sur le téléphone + grille 150 m serveur, affichage après 2 h, « une fois / plusieurs fois » seulement, lieux discrets (400 m), aucune localisation en arrière-plan | Plus strict que happn ; rien ne permet de déduire où ni quand |
| 2026-11-22 | Présentations : la personne présentée voit le profil de l’autre, jamais sa réponse ; l’entremetteur voit « en attente / en contact / terminée », jamais qui a refusé ; 14 jours, suspendu pendant Shabbat | Double opt-in sans pression |
| 2026-11-22 | Blocage global (`BlockService`) : ferme les conversations et présentations en cours, sans prévenir ; un signalement bloque par défaut | Un blocage s’applique partout |
| 2026-11-22 | Nudge de bienveillance par liste courte FR/EN/HE, jamais bloquant, rien stocké | Pas d’IA, la personne décide |
| 2026-11-22 | Mode Shabbat : horaires @hebcal/core (NOAA) par région, bougies 18 min, fin à la tombée de la nuit, réglables ; jamais visible des autres | Respect du rythme sans exposer la pratique |
| 2026-11-22 | Live : la caméra est accordée par le serveur LiveKit (canPublishSources) seulement à l’état video_on | Le consentement ne dépend pas que de l’app |
| 2026-11-22 | Live : « qui peut m’appeler » par défaut = mes contacts ; refus toujours vague (not_available) | Vie privée, pas de déduction possible |
| 2026-11-22 | Live : anti-harcèlement (24 h après un refus, 5 invitations / 10 min, une seule conversation à la fois) | Sécurité |
| 2026-11-22 | @livekit/react-native 3.1, react-native-webrtc 150.1, livekit-client 2.23 (versions de plus de 2 semaines) | Stabilité ; development build obligatoire |
| 2026-11-22 | Onboarding en 3 étapes (essentiel, vie juive facultative, questions), consentement groupé explicite en fin d’étape 2, puis réglage champ par champ | Rapide à remplir, privé par défaut, jamais bloquant |
| 2026-11-22 | App : consentement demandé avant d’enregistrer une réponse sensible (règle API), visibilité et usage pour les suggestions réglés à part ; retrait = effacement | Benchmark §6.2, RGPD art. 9 |
| 2026-11-22 | Aperçu « mon profil vu par un membre / un contact » avec la même règle que l’API (`visibleSensitive` dans shared) | Confiance : voir avant d’exposer |
| 2026-11-22 | Mode démo : profil personnel en mémoire, réactions simulées et annoncées comme telles | Pas de fausse fonctionnalité |
| 2026-11-22 | Portraits de démo illustrés et générés par code, sans visage | Aucun visage réel ni licence à suivre ; pas de crédits d’IA d’image disponibles |
| 2026-11-22 | Une seule source pour la démo (app hors ligne et seed) | Même histoire et mêmes identifiants partout |
| 2026-11-22 | i18n : fr référence, en/he complets, contrôle automatique ; hébreu au pluriel ou à l’infinitif pour rester neutre | Pas de genre supposé |
