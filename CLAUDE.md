# KAPARA — consignes pour les agents

- Langue produit : français d’abord (fr.ts est la référence), puis en/he. Aucune chaîne en dur dans les écrans : `t('…')`.
- Ne jamais écrire le nom de l’app en dur : `APP.name` (`@kapara/config`).
- Types partagés app/API dans `packages/shared` (zod). Changer un contrat = changer `shared` d’abord.
- Données sensibles (vie juive) : privées par défaut, consentement explicite, jamais déduites, jamais loguées. Tout nouveau champ passe par `sensitive()`.
- Pas de swipe infini, pas d’accusés de lecture, pas de fausse fonctionnalité : un service non configuré affiche un mode démo annoncé comme tel.
- Profils de démo : `isDemo: true` + `DemoBadge`.
- Accessibilité : cibles ≥ 48, `accessibilityLabel`, tailles de texte dynamiques (composant `Text`).
- Après modification : `npm run typecheck` et `npm test -w @kapara/api`.
- Mettre à jour `status/kapara.json` (champ `maj_le`) quand un chantier change d’état.

## Chantiers et frontières (un fil = un dossier)

| Chantier | Dossiers possédés |
| --- | --- |
| A. Écrans mobiles « Pour toi » + profil + onboarding | `apps/mobile/app/(tabs)/index.tsx`, `app/profile`, `app/onboarding`, `src/ui` |
| B. API profils, préférences, découverte, auth | `apps/api/src/{auth,profiles,discovery}` |
| C. Live (présence, invitations, LiveKit, écrans d’appel) | `apps/api/src/live`, `apps/mobile/app/(tabs)/live.tsx`, `app/call` |
| D. Croisés + présentations + conversations + sécurité | `apps/api/src/{crossed,introductions,conversations}`, écrans associés |
| E. Données de démo, i18n, portraits générés | `apps/api/prisma/seed.ts`, `apps/mobile/src/{demo,i18n}` |

Fichiers partagés (`packages/*`, `schema.prisma`) : petits changements additifs uniquement, et signaler dans la PR.
