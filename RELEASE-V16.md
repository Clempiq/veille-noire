# Veille Noire V1.6 — Choisir sa voie

## Problèmes corrigés

La sélection d’un survivant après une fouille pouvait afficher à nouveau la dernière découverte. La présentation dépend maintenant de l’action qui a réellement obtenu le butin ; une sélection efface cette donnée transitoire. Test navigateur : fouiller avec Lina, fermer la carte, sélectionner Maëlys ; aucun dialogue rouvert, personnage bien sélectionné.

Le bouton permanent porte explicitement le nom « Talents ». Un choix disponible affiche « Choisir 1 talent(s) ». Les choix figurent en premier dans le dialogue, suivis de l’arbre du personnage et de la progression détaillée. Les cartes, le sac, les découvertes et l’équipement expliquent les niveaux requis.

## Équilibrage des nouvelles expéditions

- 3 actions au départ, 4 dès 7 XP. Aucun cinquième point d’action automatique.
- 19 XP : une spécialisation parmi deux, propre au personnage. 43 XP : une maîtrise parmi trois. 70 XP : seconde spécialisation ; 100 XP : une autre maîtrise. Les paliers prolongés sont une adaptation originale.
- Suppression des dés et de la précision automatiquement cumulés avec les talents. Les spécialisations choisies produisent désormais ces effets.
- Les quatre nouveaux personnages commencent avec un avantage modeste : portée magique pour Maëlys, bruit réduit pour Orso, premier mouvement gratuit pour Silène, trousse améliorée pour Ysée.
- Leur pouvoir nécessite de choisir Éveil, à partir de 19 XP. Une utilisation par manche ; 2 éther ; récupération de 1 éther par manche. Un personnage qui choisit une voie non magique obtient des maîtrises adaptées plutôt que des améliorations de pouvoir inutilisables. Il peut choisir Éveil plus tard.
- Maëlys : 3 dés à 4+, 2 dégâts par succès ; Résonance vive ajoute un dé. Orso : protection de 1 blessure, 2 avec maîtrise. Ysée : soin de 1 PV, +1 avec maîtrise et réanimation débloquée par cette maîtrise ; le talent de soin ajoute 1 PV. Silène : deux zones ouvertes, trois avec maîtrise, jamais à travers les murs.
- Onde de recul limitée à une fois par manche. Déchaînement, proposé à Basile/Jonas/Silène, adapte les dés de mêlée à la foule, avec six dés de base au maximum.
- Fusil de pont et carabine : 7 XP requis. Harpon : 19 XP. Éclipse, Orage et Cœur des abysses : 43 XP. Le niveau est personnel, pas celui de l’équipe. Les armes verrouillées peuvent être transportées et données ; un échange ne peut pas contourner la restriction en les équipant automatiquement.
- Récompense de premier objectif conservée, mais relique verrouillée jusqu’à 43 XP. Chance en fouille réduite à 1 %, ou 3 % avec Main heureuse.

## Références officielles consultées

[Black Plague, p. 16](https://cdn.svc.asmodee.net/production-zombicide/uploads/dl/rulebook-black-plague.pdf) : progression à 7, 19 et 43 XP, quatrième action puis choix de compétences ; niveau le plus élevé utilisé pour les apparitions. Cette structure remplace l’accumulation automatique de la V1.5.

[Wulfsburg, p. 9–10](https://cdn.svc.asmodee.net/production-zombicide/uploads/dl/rulebook-wulfsburg.pdf) : certains équipements magiques exigent un niveau de danger ; le mode Ultrared permet de poursuivre la progression. Veille Noire utilise ses propres restrictions d’armes et paliers prolongés, explicités ci-dessus.

[Présentation officielle de la deuxième édition](https://www.zombicide.com/2nd-edition/) : personnages à spécialisations distinctes, équipement en main/réserve et récompenses puissantes. Le jeu conserve ses propres personnages, textes, statistiques, missions et illustrations.

Il s’agit d’une adaptation de la courbe de progression et des arbitrages, pas d’une implémentation complète de toutes les éditions. Les particularités de Veille Noire restent présentes : huit objets au sac, une arme active, points de vie, munitions, absence de tir ami, pouvoirs à éther et boss à résonateurs. Les statistiques ne sont donc pas interchangeables avec les cartes du jeu de plateau.

## Compatibilité

Les sauvegardes antérieures restent jouables avec leurs règles. Les anciennes parties réseau également. Le marqueur `balance:1` identifie les nouvelles règles ; les nouveaux salons utilisent le protocole 3. Recharger tous les clients avant de créer un nouveau salon. Le serveur refuse un ancien client pour la création/entrée plutôt que mélanger silencieusement les règles. Aucun changement du stockage Upstash ni de ses permissions.

## Validation

113 tests automatisés passent : règles antérieures, nouvelles transitions, 495 compositions, restrictions d’équipement et échanges, arbres ordonnés, variantes sans Éveil, sauvegardes, limites de pouvoirs, protections, soin/réanimation, déplacements et multijoueur autoritaire.

Mesure contrôlée : 240 graines dispersées, Maëlys face à 20 Noyés. V1.5 : 20 éliminations certaines, même à 0 XP. V1.6 : pouvoir inaccessible à 0 XP ; après Éveil à 19 XP, 1,49 élimination moyenne, maximum 3 ; avec Résonance vive à 43 XP, 1,99 en moyenne, maximum 4. Rapport : `../veille-noire-v16-balance-check.json`. Ces tests bornent l’efficacité du sort ; ils ne constituent pas un taux de victoire sur des missions complètes.

Essai navigateur local : recrutement, pouvoir verrouillé au départ, import d’un scénario de contrôle, fouille et changement de personnage, choix d’Éveil, arme légendaire verrouillée avec transmission possible. À 390 × 844, commandes contenues dans l’écran, deux choix de talents lisibles ; aucun débordement horizontal ni erreur JavaScript observée. Captures : `../veille-noire-v16-talents-mobile.jpg` et `../veille-noire-v16-talents-desktop.jpg`.

La difficulté globale reste à éprouver avec plusieurs parties humaines complètes. Cette livraison supprime les gains de puissance non bornés identifiés ; elle ne prétend pas assurer le même taux de victoire que Zombicide.

## Publication vérifiée

Publiée le 6 octobre 2026 sur https://veille-noire.vercel.app, déploiement `dpl_Z3bbyuBhGi9WAnTaiVdGESCq8yCT`, état READY. API disponible en protocole 3. Quinze fichiers publics identiques par SHA-256 au dossier construit. Contrôle serveur public à quatre clients réussi : refus des pouvoirs avant Éveil, concurrence, déduplication, manche commune et reprise. Dix-huit requêtes, médiane observée 619 ms. Le catalogue public affiche les niveaux requis et la fiche d’Éclipse confirme 43 XP.
