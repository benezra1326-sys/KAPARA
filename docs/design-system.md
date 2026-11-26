# Système visuel ZIV « Grenat » (23 novembre 2026)

Remplace la direction « Club / façon Raya » (noir et blanc, laiton). Source unique : `packages/design/src/index.ts`. Aucun écran ne doit écrire une couleur en dur, sauf les logos des fournisseurs de connexion (Apple, Google, Facebook) et les écrans d'appel, toujours sombres.

## Intention
Intime, éditoriale, chaleureuse, contemporaine. Une seule couleur signature, le **grenat**, partagée par les deux thèmes : l'action principale, l'onglet ouvert, les raisons d'une suggestion, les éléments choisis. Les photos portent le reste de la couleur. Aucun emprunt d'écran, de logo, de composant ou de navigation à une autre application.

## Couleurs

| Rôle | Ivoire (clair, défaut) | Aubergine (sombre) |
| --- | --- | --- |
| Fond | `#FBF7F0` ivoire | `#1A1118` aubergine |
| Surface / surface haute | `#F4EDE3` / `#EBE2D5` | `#251923` / `#30222D` |
| Filet | `#E2D7C7` | `#432F3D` |
| Texte / secondaire / discret | `#22161C` / `#56464E` / `#6E5D65` | `#F6EEE6` / `#D3C4CA` / `#AD99A4` |
| Action principale (fond) | grenat `#7A1E36` | grenat éclairci `#93284A` |
| Texte grenat (liens, raisons) | `#7A1E36` | rosé grenat `#EDA9BA` |
| Teinte de sélection | `#F3E1E3` | `#3A1A28` |
| Disponible / erreur | `#1E6B45` / `#B42318` | `#86D3A4` / `#FF8A7A` |

Contrastes mesurés (WCAG 2.1) : texte discret ≥ 4,79:1 sur la surface la plus foncée de chaque thème, texte principal ≥ 13:1, ivoire sur grenat 9,5:1, ivoire sur grenat éclairci 7,6:1.

## Typographie
- Titres, prénoms, réponses aux questions : **Fraunces** (Light pour les grands titres, Regular pour les intertitres), la police du logo.
- Textes, boutons, champs : **Inter** 16 pt (400, 500, 600).
- Hébreu : **Frank Ruhl Libre** (titres) et **Heebo** (textes), chargées seulement quand l'app est en hébreu ; le composant `Text` fait la substitution, la page passe en `dir="rtl"` sur le web.
- Petites capitales de rubrique : Inter SemiBold 11 pt, espacement 1,2 (supprimé en hébreu).

## Composants
- `Button` : pilule 52 pt. `primary` et `accent` en grenat, `secondary` filet, `ghost` discret. Focus clavier visible (contour grenat).
- `Field` : bordure grenat au focus, erreur en rouge, compteur.
- `Chips` : choisi = teinte grenat + coche, pas seulement une couleur.
- Cartes : rayon 20, filet 1 px, ombre très légère teintée aubergine.
- Navigation : icône + libellé sur téléphone, onglet ouvert en grenat ; barre latérale sur ordinateur.
- Mouvement : une seule grammaire (160 / 240 / 400 ms, sans rebond), respect de « réduire les animations ».

## Honnêteté
- Badge « Profil de démonstration » sur chaque profil fictif.
- Aucun badge « vérifié » sur un profil de démonstration, et aucun membre ne peut être vérifié tant qu'un vrai parcours de vérification n'existe pas.
- Une fonction simulée le dit à l'endroit où on l'utilise.

## Marque
Logo ZIV : Z en Fraunces Light, ivoire sur la tuile grenat, avec le point rosé signature. Le nom s'affiche en capitales Fraunces espacées dans l'application. En hébreu, ZIV reste en alphabet latin. Les icônes iOS, Android et web reprennent la tuile grenat.
