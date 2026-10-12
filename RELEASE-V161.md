# Veille Noire 1.6.1 — 10 octobre 2026

- Confirmation individuelle « Je suis prêt » dans le salon, hôte compris. Le serveur refuse le lancement tant que tous les joueurs ne sont pas prêts et connectés. L’hôte garde le bouton de lancement.
- Annulation possible avant le départ. Mission, intensité, choix de personnage, arrivée ou retrait d’un joueur : toutes les confirmations sont remises à zéro. Une reconnexion conserve la confirmation.
- Au lancement, les états prêts sont effacés pour ne pas terminer automatiquement la première manche.
- Dés : mouvement de 650 ms, décalage de 35 ms par dé, puis maintien du résultat pendant 1 200 ms. Trois dés restent visibles environ 1,92 seconde au lieu de 0,69 seconde. La préférence de réduction des mouvements reste respectée.
- Protocole réseau 4 ; les snapshots des protocoles 1, 2 et 3 restent lisibles. Les parties en cours gardent leurs règles. Recharger le jeu sur chaque appareil pour accéder au nouveau bouton.

Validation : 118 tests automatisés réussis, dont cinq nouveaux cas couvrant le consentement individuel, l’annulation, les changements du salon, la reconnexion et les commandes répétées/périmées. Le moteur de combat et les ressources Redis ne sont pas modifiés.

## Publication et vérifications

En ligne : https://veille-noire.vercel.app — production READY, déploiement `dpl_GdDrbjFmcCghXzkYxBWNMcUSsaoi`. Six fichiers publics vérifiés par SHA-256, API disponible en protocole 4.

Deux navigateurs indépendants en local, dont un écran 390 × 844 : validation, annulation, changement de paramètres, reconnexion et lancement réussis. Aucun débordement horizontal ni erreur JavaScript ; trois dés visibles pendant 1 932 ms.

Deux sessions contre l’API publique : lancement prématuré refusé, validation de l’hôte exigée, annulation prise en compte, paramètres invalidant les validations, reconnexion conservée, lancement et passage à la deuxième manche réussis. Aucune erreur remontée par la consultation des logs Vercel de niveau error sur les dix minutes suivant la publication.

Limite du contrôle : les requêtes du navigateur automatisé vers l’API publique ont expiré dans cet environnement ; le parcours visuel a été vérifié localement et le serveur de production par requêtes HTTPS directes. Aucun essai sur deux téléphones physiques.
