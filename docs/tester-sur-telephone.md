# Tester KAPARA sur un téléphone

## 1. Tout de suite : la version web de démo
Ouvrir le lien de démo dans Safari ou Chrome sur le téléphone. C'est l'app réelle compilée pour le web, en mode démonstration (profils fictifs, rien n'est envoyé). Les appels Live y sont simulés.

## 2. L'app native (Android / iPhone) via EAS
Les appels Live utilisent des modules natifs (LiveKit/WebRTC) : **Expo Go ne suffit pas**, il faut un build.

Une seule fois :
1. Créer un compte gratuit sur https://expo.dev.
2. Dans expo.dev → Account settings → Access tokens, créer un jeton.
3. Sur GitHub → KAPARA → Settings → Secrets and variables → Actions → New repository secret : nom `EXPO_TOKEN`, valeur = le jeton.

Ensuite : GitHub → Actions → « Build mobile (EAS) » → Run workflow.
- `preview` + `android` : un fichier APK installable directement sur Android (lien envoyé par expo.dev).
- `development` : build de développement (rechargement à chaud).
- iPhone : nécessite un compte Apple Developer (99 €/an) pour installer hors App Store.

Au premier build, EAS associe le projet à votre compte (`extra.eas.projectId`).
