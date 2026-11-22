# Connexion sociale et compte administrateur

## Ce que fait la démo (EXPO_PUBLIC_DEMO, par défaut)

- L'accueil propose : Apple, Google, Facebook, adresse email. Créer un compte et se connecter sont le même geste.
- Apple, Google et Facebook sont **simulés** dans une fenêtre qui le dit. On peut y lier une adresse : la même adresse retrouve le même compte, quel que soit le bouton.
- Le compte et le profil sont gardés **sur l'appareil** (localStorage sur le web, trousseau sur iPhone). Recharger la page ou revenir plus tard ouvre l'app directement, plus jamais « créer votre profil ».
- « Se déconnecter » garde le profil sur l'appareil ; « Effacer ce compte de l'appareil » le supprime.
- Administrateur : une adresse reconnue (empreintes SHA-256 dans `src/account/admins.ts`, jamais l'adresse en clair, ajout possible via `EXPO_PUBLIC_ADMIN_EMAIL_HASHES`) fait apparaître « Espace administrateur » dans Moi : vue d'ensemble chiffrée, signalements (classer, avertir, suspendre), photos à valider, membres (recherche, filtres, suspension). Données fictives, décisions gardées pendant la session.

## Pour la vraie connexion (mise en ligne)

L'API sait déjà vérifier Apple et Google (`apps/api/src/auth/oidc.ts`, routes `/v1/auth/apple` et `/v1/auth/google`). Il manque, à fournir par Avishay :

| Fournisseur | À créer | Variables |
| --- | --- | --- |
| Apple | Compte Apple Developer (99 $/an), identifiant d'app + « Sign in with Apple », Services ID pour le web | `APPLE_CLIENT_IDS` (API) |
| Google | Projet Google Cloud, écran de consentement OAuth, identifiants OAuth iOS + web | `GOOGLE_CLIENT_IDS` (API), `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`, `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` |
| Facebook | App Meta for Developers avec « Facebook Login », passage en mode Live | `FACEBOOK_APP_ID` + `FACEBOOK_APP_SECRET` (API), `EXPO_PUBLIC_FACEBOOK_APP_ID` |
| Email | Domaine d'envoi chez Resend (ou équivalent) | `RESEND_API_KEY`, `MAIL_FROM` |

Reste à coder côté app au moment des clés : `expo-apple-authentication`, `expo-auth-session` (Google, Facebook) ; côté API : route `/v1/auth/facebook` (vérification du jeton via `debug_token`) et un rôle `admin` sur l'utilisateur, avec les routes d'administration (signalements, suspension, validation des photos).
