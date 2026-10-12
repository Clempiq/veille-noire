# Veille Noire 1.7 — Les veilleurs du port

Extension du 10 octobre 2026. Trois survivants, quatre armes et trois missions supplémentaires. Les personnages, équipements et six premières missions restent disponibles ; la validation de tous les joueurs et les dés prolongés de la 1.6.1 sont conservés.

## Personnages

| Survivant | Équipement initial | Atout et limite |
|---|---|---|
| Sacha Riel, guetteur des toits | Arc, 5 PV | Première visée gratuite par manche. Aucun cumul de visée ; les suivantes coûtent une action. |
| Mira Sol, convoyeuse | Pic de sauvetage, 6 PV | Premier changement d’arme gratuit par manche. Ne rend ni les échanges gratuits ni les armes de haut niveau accessibles. |
| Naël Cendre, inspecteur des réserves | Arbalète, 6 PV | Supprime uniquement l’embuscade aléatoire après sa propre fouille. Ni butin supplémentaire ni fouille supplémentaire ; les rencontres à l’ouverture des bâtiments restent présentes. |

Chaque personnage possède deux choix à 19 XP, trois à 43 XP, puis les options restantes à 70 et 100 XP. Pas de nouveau pouvoir magique ni de bonus de dégâts automatique. Mélanger combattants, mobilité et soutien reste utile ; recruter tous les nouveaux personnages ne constitue pas une équipe optimisée.

## Armes

| Arme | Dés / seuil | Dégâts | Portée | Bruit | Chargeur | XP |
|---|---|---|---|---|---|---|
| Pic de sauvetage | 1 / 2+ | 2 | Mêlée | 0 | — | 0 |
| Arbalète à magasin | 1 / 3+ | 2 | 2 | 0 | 3 | 0 |
| Masse de cale | 1 / 4+ | 3 | Mêlée | 2 | — | 7 |
| Carabine à levier | 4 / 5+ | 2 | 3 | 4 | 4 | 7 |

Le pic est fiable mais ne peut toucher qu’une cible par attaque sans talent. L’arbalète est discrète mais limitée en portée et en munitions. La masse frappe fort mais manque une fois sur deux avant bonus. La carabine à levier peut toucher davantage de cibles que la carabine de veille, avec plus de variance, moins de portée et davantage de bruit.

Les quatre armes entrent dans les emplacements d’armes du butin existant : pas d’augmentation de la fréquence globale des armes, pas de diminution des proportions de soins et de munitions. Les anciennes sauvegardes gardent leur table de butin et leur séquence aléatoire.

## Missions

- **Les lanternes dérivantes** : récupérer deux éléments de balisage et évacuer ; deux failles, limite de 23 manches.
- **La réserve des vivants** : remettre deux circuits en marche et les garder libres pendant trois phases du Chœur ; deux failles, limite de 25 manches. Une intrusion suspend le décompte.
- **Le chenal des brumes** : fermer trois vannes ; deux actions par vanne, suppression définitive de la faille correspondante, limite de 26 manches.

Les plans sont des variantes en miroir de trois agencements existants, avec de nouveaux récits. Cela conserve des distances et accès connus. Le trajet estimé, portes comprises et hors combats, est respectivement de 22, 25 et 17 actions pour un survivant visitant tous les objectifs puis la sortie. Le reste de l’escouade doit aussi évacuer. La défense a été ramenée de trois à deux failles après les essais comparatifs.

## Vérifications et limites

128 tests automatisés, dont la validité des 1 365 compositions de quatre survivants, les limites des nouveaux talents, les sauvegardes, les XP requis, les chargeurs, les accès aux objectifs, le maintien des circuits, le scellement et les commandes réseau.

7 920 attaques contrôlées : 11 armes × 2 types d’ennemis × 360 graines. Exemple sans talent : carabine à levier 1,347 Noyé éliminé par attaque en moyenne, carabine de veille 1,347, fusil de pont 1,531. Ces moyennes portent sur une seule attaque contre un groupe, pas sur le coût des recharges ni une partie entière. La masse élimine en moyenne 0,508 Cloche par attaque ; le harpon, réservé à 19 XP, 1,347.

108 parties simulées avec une stratégie automatique identique, équipes de deux à quatre joueurs et deux difficultés : elles exercent le moteur et révèlent les écarts grossiers. Elles ne donnent pas un taux de victoire humain. Dans les missions nouvelles, les simulations ont produit des victoires et des défaites ; les groupes sans soutien ont davantage souffert en Survie. Un équilibrage parfait de toutes les compositions ne peut pas être garanti sans retours de parties humaines.

Interface contrôlée dans Chromium à 1280 × 900 et 390 × 844 : recrutement, nouveaux visuels, catalogue, démarrage, visée gratuite, sauvegarde et reprise ; aucune erreur JavaScript ni débordement horizontal. WebKit n’était pas installé dans la version demandée par le runtime de cette session ; aucun nouveau test WebKit revendiqué.

Portraits et armes supplémentaires : illustrations vectorielles originales intégrées, de style graphique distinct des portraits réalistes existants. Aucune génération d’images via API payante.

Protocole réseau 5. Recharger les appareils avant de créer un nouveau salon pour l’extension. Les anciennes parties restent reprenables ; les nouveaux personnages et missions nécessitent un salon créé avec cette version.


## Publication vérifiée

En production sur https://veille-noire.vercel.app, état READY, déploiement `dpl_9HNvn7FtKEDhVbPc9zBUF71PRJdJ`. Seize fichiers publics identiques à la construction locale par SHA-256. API disponible en protocole 5.

Trois salons de contrôle à deux joueurs : missions 07, 08 et 09 démarrées avec les nouveaux personnages, validation de chacun exigée, talents appliqués par le serveur, deuxième manche atteinte et reconnexion réussie. Aucune erreur trouvée dans les logs de niveau error consultés après publication. Les contrôles de production ont utilisé l’API HTTPS ; les contrôles visuels ont été effectués en local.

Compatibilité : 1 200 comparaisons d’état avec la version 1.6.1 sur 120 graines, incluant création, fouille, visée et phases ennemies. Résultats et séquence aléatoire inchangés pour les sauvegardes antérieures.
