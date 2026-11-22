# Interface : où modifier quoi

Base posée le 22/11/2026 pour itérer vite sur le contenu, le style, la disposition et les fonctions.

| Je veux changer… | Fichier |
| --- | --- |
| Couleurs, typographie, rayons, ombres, largeurs maximales, points de rupture | `packages/design/src/index.ts` |
| Un texte de l'app | `apps/mobile/src/i18n/fr.ts` (puis `en.ts`, `he.ts` ; vérifié par `npm run i18n:check -w @kapara/mobile`) |
| Une icône | `apps/mobile/src/ui/Icon.tsx` (jeu unique, trait 1,75, grille 24) |
| La navigation (barre du bas / barre latérale) | `apps/mobile/src/ui/AppNav.tsx` |
| Largeur d'une page | prop `width` de `Screen` : `readable` (680 px) ou `wide` (1080 px) |
| Décisions responsive | `apps/mobile/src/ui/layout.ts` (`useLayout`) |
| Carte de profil (photos, raisons, réponses) | `apps/mobile/src/ui/ProfileCard.tsx` |
| Identité du membre (nom public, âge, ville) | `apps/mobile/src/me/identity.ts` (source unique : `src/me/store.ts`) |

## Règles responsive
- Téléphone (< 640 px) : une colonne, barre de navigation fixe en bas, actions principales épinglées en bas d'écran.
- Tablette (640–1023 px) : même barre, libellés à côté des icônes, contenu centré à largeur maximale.
- Ordinateur (≥ 1024 px) : barre latérale avec le nom de l'app ; contenu centré, jamais sur toute la largeur.
- Profils : deux colonnes dès 700 px disponibles (photos à gauche, 400 px max ; texte à droite). Sur téléphone, photos au format 4:5, hauteur limitée à environ la moitié de l'écran, cadrage par le haut pour garder les visages.
- Pas de zoom ni de mise à l'échelle globale.

## Direction artistique
« Porcelaine au crépuscule » : page porcelaine froide, encre indigo, un seul accent lie-de-vin (grenade), laiton pour les détails rares. Fraunces pour les noms et titres, Inter pour la lecture. Libellés de section en casse normale (pas de capitales espacées). Tous les tons de texte passent le contraste WCAG AA.

## Profil : public / privé
- Privé (jamais affiché) : date de naissance exacte, genre, e-mail, consentements.
- Public : prénom, âge calculé depuis la date de naissance, ville (région), phrase, langues, photos, questions, et seulement les réponses de vie juive dont la visibilité le permet.
- Distance : jamais en kilomètres, seulement « À proximité ».
