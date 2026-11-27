# Âge minimum : 18 ans

ZIV est réservé aux personnes majeures, partout dans le monde.

## La règle

- Âge en années calendaires, à la **date locale** de la personne (`packages/config/src/age.ts`, `checkAge`). 18 ans le jour de l’anniversaire : accepté. La veille : refusé.
- 29 février : l’anniversaire tombe le 1er mars les années non bissextiles (lecture courante en France et au Royaume-Uni). À faire confirmer par un juriste si un autre pays de lancement l’exige.
- Fuseau : celui de l’appareil, envoyé avec le profil (`timeZone`, jamais stocké), sinon celui de la ville, sinon UTC.
- Pas de pièce d’identité, pas de reconnaissance faciale, pas de biométrie.

## Où elle s’applique

| Couche | Comportement |
| --- | --- |
| App (`BasicsForm`, `onboarding/basics`) | Date demandée en jour / mois / année avec clavier numérique ; message « ZIV est réservé aux 18 ans et plus ». Moins de 18 ans → écran « ZIV est réservé aux adultes », le compte en cours de création est supprimé, rien n’est gardé sur l’appareil. |
| API (`PUT /v1/profiles/me`) | Même règle côté serveur. Compte sans profil : supprimé immédiatement, réponse `403 { code: "adults_only", accountDeleted: true }`. Profil existant : changement refusé, profil inchangé. |
| Base API (migration `20261127120000_adults_only`) | Déclencheur `profile_adults_only` : refuse toute personne qui n’a pas 18 ans où que ce soit sur Terre (date de référence UTC+14), dernier rempart contre une écriture directe. |
| Base Supabase de test (`supabase/migrations/20261127120000_ziv_adults_only.sql`) | Déclencheur `members_adults_only` : même rempart, et un profil terminé sans date de naissance est refusé. |

## Confidentialité de la date de naissance

- Jamais renvoyée aux autres membres : seul l’âge (`age`) l’est. La vue « soi » (`GET /profiles/me`) la renvoie à son propriétaire pour l’édition.
- Les journaux de l’API masquent les corps de requête (`redact: req.body`) ; aucun événement analytique n’existe.
- Supabase : table `members` lisible seulement par son propriétaire et l’administration ; les fonctions publiques ne renvoient que l’âge.

## Tests

`apps/api/src/common/age.spec.ts` : 17 ans, 18 ans le jour même, la veille, 29 février (années bissextiles ou non), dates impossibles, fuseaux (Paris vs New York à minuit).

## À la publication

- **Google Play Console** : activer « Restrict Minor Access » (Restreindre l’accès aux mineurs) dans *Policy and programs › App content › Target audience*, cibler 18+ uniquement, et remplir le questionnaire de classification (IARC) en indiquant une app de rencontres avec interactions entre utilisateurs.
- **Apple App Store Connect** : répondre honnêtement au questionnaire de classification d’âge (rencontres, contenus générés par les utilisateurs, interactions non modérées en direct pour Live) ; la classification attendue est 18+.
- Les deux stores demandent aussi un lien de suppression de compte et une politique de confidentialité publiques : voir `docs/moderation-et-support.md`.
