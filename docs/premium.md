# Offre MOTEK : Gratuit, Plus, Cercle

## Principe
Tout l'essentiel est gratuit, pour toujours : profil, questions, préférences et critères de valeurs, **changer de ville**, écrire à ses matchs, recevoir des appels Live, Croisés, et toute la sécurité (blocage, signalement, mode Shabbat). On ne fait jamais payer la sécurité ni les valeurs (benchmark, point 11).

Ce qui est limité, **par jour** (remise à zéro à minuit, heure locale du membre) : les réactions envoyées et la taille de la sélection « Pour toi ».

| | Gratuit | Plus | Cercle |
|---|---|---|---|
| Réactions par jour | 20 | 60 | illimitées |
| Profils par jour dans Pour toi | 8 | 20 | 40 |
| Live : choisir le sexe et la ville | non (hasard, monde entier) | oui | oui |
| Voir qui vous a remarqué | nombre seulement | oui | oui |
| Revenir sur un profil passé | non | oui | oui |
| Mode discret (visible seulement des personnes remarquées) | non | non | oui |
| Prix par mois (1 / 3 / 6 mois) | 0 € | 14,99 / 11,99 / 9,99 € | 29,99 / 23,99 / 19,99 € |

Le Live est gratuit et illimité pour tous, en appariement aléatoire mondial. Choisir le sexe et la ville est inclus dans Plus et Cercle, pour tout le monde sans exception selon le sexe (`can_filter_live()`, choix d'Avishay du 23/11 : un prix selon le sexe pose un risque juridique dans l'UE).

L'administrateur (Avishay) a tout, sans limite.

## Où c'est appliqué
- **Base Supabase** (`supabase/migrations/20261123130000_motek_premium.sql`) : table `plans`, formule sur `members` (`plan`, `plan_until`, `plan_source`, `timezone`), compteurs `usage_daily`. Une réaction au-delà de la limite est refusée par la base (`quota_exceeded`), « Pour toi » est coupé à la taille de la formule, `likes_inbox()` ne renvoie les profils qu'à Plus et Cercle, le mode discret est appliqué dans `visible_members()`. Un membre ne peut pas écrire sa formule lui-même.
- **App** : `apps/mobile/src/premium/` (limites, état, paiement simulé), page `app/premium.tsx`, `app/likes.tsx`, `app/city.tsx`.

## Paiement
Simulé dans la démo (`subscribe_demo`), annoncé comme tel. Pour l'App Store : abonnements auto-renouvelables Apple, puis une fonction serveur qui vérifie le reçu (App Store Server API) avant d'écrire la formule avec `plan_source = 'apple'`. Nécessite le compte Apple Developer.

## Leviers à tester plus tard
Prix par pays (Israël, États-Unis), essai gratuit 7 jours, achats à l'unité (une réaction de plus), offre de lancement.
