# Modération, signalements et support

Ce document décrit comment ZIV traite les signalements pendant la bêta (ouverte partout dans le monde).
Les textes juridiques de l'app sont des brouillons tant qu'un juriste ne les a pas validés.

## Qui modère
- Les comptes dont l'e-mail figure dans `MODERATOR_EMAILS` (API) ouvrent l'écran de modération.
- Un modérateur suspendu ou supprimé perd l'accès immédiatement (vérifié à chaque requête).

## Signaler
- On peut signaler depuis un profil, une conversation, ou à la fin d'un appel Live (bouton « Signaler »).
- Chaque signalement est enregistré avec un statut (`open`, `dismissed`, `actioned`) et sa date de mise à jour.
- Limite de 20 signalements par jour et par membre. Une photo précise peut être signalée.
- L'app n'affiche « Signalement envoyé » qu'après la réponse du serveur. En démo, le texte dit que rien n'est envoyé.

## Décider
Depuis l'écran de modération :
1. Lire le signalement et le profil concerné.
2. Décider : classer sans suite (`dismissed`) ou agir (`actioned`), avec une note.
3. Agir si besoin :
   - masquer le profil (invisible dans Pour toi, Croisés et Live) ;
   - suspendre le compte (sessions coupées, conversations et présentations en attente fermées) ;
   - rétablir le compte ;
   - retirer une photo (le fichier est supprimé).

Chaque décision et chaque action est écrite dans le journal `ModerationAction` (qui, quoi, quand, pourquoi). Ce journal ne contient aucune donnée de vie juive.

## Urgences
En cas de danger immédiat, le membre doit appeler les secours locaux. ZIV ne remplace pas la police.
L'adresse de sécurité est configurée dans `packages/config/brand.json` (`supportEmail`). Elle vaut encore `support@example.invalid` : il faut la remplacer par une vraie adresse avant d'ouvrir la bêta.

## Suppression de compte
- Depuis « Moi » → Supprimer mon compte. Sont supprimés : le profil, les photos (fichiers compris), les messages, les présentations, l'historique d'appels et les sessions.
- Un compte refusé à l'inscription (moins de 18 ans) est supprimé tout de suite, sans profil partiel conservé.

## Anti-spam des messages
- Au plus 20 messages par minute et 500 par jour.
- Un même texte ne peut pas être envoyé dans plus de 3 conversations.
- Au plus 10 messages de suite sans réponse.
Ces limites sont comptées en base : elles tiennent même avec plusieurs serveurs.

## Limites connues
- La présence Live et la limite d'invitations sont gardées en mémoire. La production doit rester sur une seule instance (`API_INSTANCES=1`) jusqu'à l'ajout d'un stockage partagé (Redis).
