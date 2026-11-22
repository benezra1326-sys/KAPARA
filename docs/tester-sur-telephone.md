# Tester KAPARA sur un téléphone

## 1. Tout de suite : la version web de démo
Ouvrir le lien de démo dans Safari ou Chrome sur le téléphone. C'est l'app réelle compilée pour le web, en mode démonstration (profils fictifs, rien n'est envoyé). Les appels Live y sont simulés.

Sur iPhone, pour l'avoir comme une app : ouvrir le lien dans **Safari**, bouton Partager → « Sur l'écran d'accueil ». L'icône lance la démo en plein écran, sans barre d'adresse.

La démo est déployée par Vercel à chaque fusion sur `main` (réglages dans `vercel.json` à la racine : build Expo web avec `EXPO_PUBLIC_DEMO=1`). Mise en place, une seule fois : importer le dépôt sur https://vercel.com/new/import?s=https://github.com/benezra1326-sys/KAPARA et cliquer « Deploy » sans rien changer.

## 2. L'app native (Android / iPhone) via EAS
Les appels Live utilisent des modules natifs (LiveKit/WebRTC) : **Expo Go ne suffit pas**, il faut un build.

Une seule fois :
1. Créer un compte gratuit sur https://expo.dev.
2. Dans expo.dev → Account settings → Access tokens, créer un jeton.
3. Sur GitHub → KAPARA → Settings → Secrets and variables → Actions → New repository secret : nom `EXPO_TOKEN`, valeur = le jeton.

Ensuite : GitHub → Actions → « Build mobile (EAS) » → Run workflow.
- `preview` + `android` : un fichier APK installable directement sur Android (lien envoyé par expo.dev).
- `development` : build de développement (rechargement à chaud).
- iPhone : nécessite un compte Apple Developer (99 $/an). Ensuite `ios` + `preview` produit un build installable sur les iPhone enregistrés (EAS demande l'identifiant Apple au premier build), ou `production` + envoi sur TestFlight (`eas submit -p ios`) pour l'installer via l'app TestFlight. Expo Go ne suffit pas (modules natifs des appels Live).

Au premier build, EAS associe le projet à votre compte (`extra.eas.projectId`).
