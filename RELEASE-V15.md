# Veille Noire V1.5 — Les Éveillés

## Changements

- Barre de commandes fixe sur ordinateur et téléphone, avec personnage, actions restantes, équipement, pouvoir et talents disponibles. Le plateau garde une marge sous les commandes.
- Chaque fouille affiche une carte de découverte : illustration, effet, statistiques et ajout au sac. Une arme trouvée n’est pas automatiquement équipée ; un bouton propose de l’équiper si les actions le permettent.
- Douze personnages, dont Maëlys (dégâts de zone), Orso (bouclier), Silène (déplacement de brume) et Ysée (soin à distance et réanimation). Les pouvoirs utilisent de l’éther, récupéré à raison de 1 par manche.
- Six niveaux à 0 / 6 / 16 / 30 / 50 / 75 XP. Un talent à choisir à chaque palier après le premier. Treize talents disponibles dans des listes adaptées au personnage : précision, portée, mêlée, protection, mouvement, poussée, discrétion, fouille, équipement, soin et éther.
- Bonus de base cumulés : +1 action à 6 XP, +1 dé à 16, seuil réduit à 30, +1 action à 50 et +1 dé à 75. Le danger des cartes d’apparition reste plafonné au quatrième palier.
- Trois reliques : Éclipse, Orage et Cœur des abysses. Chance de 3 % par fouille, ou 8 % avec Main heureuse. La première prise d’objectif d’une nouvelle mission garantit une relique. Un sac plein empêche cette prise d’objectif et explique comment libérer une place ; aucun objet n’est perdu.
- Illustrations matricielles originales du terrain, des douze armes et des quatre consommables ; quatre portraits supplémentaires.
- Déplacements glissés des survivants ; pertes et gains de PV visibles ; badge « 2 ACT » dans les zones contenant un Écorché ; détail des actions/dégâts dans la fiche ennemie et seconde activation indiquée dans la relecture.

## Compatibilité

Les sauvegardes antérieures conservent les quatre niveaux et leurs règles. Les nouveaux systèmes de pouvoirs, talents et reliques s’appliquent aux nouvelles expéditions. Les anciens salons réseau restent reprenables. Le protocole des nouveaux salons passe à 2 ; un ancien client doit recharger la page pour créer ou rejoindre un salon. Aucun remplacement de la sauvegarde solo par une partie réseau.

## Vérification

93 tests automatisés : les 77 précédents plus 14 tests des Éveillés/talents/reliques et 2 tests multijoueurs de compatibilité et d’autorité. Les 495 compositions de quatre personnages sont validées. Les tests contrôlent les protections, murs, immunité du boss, éther, réanimation, déplacements, talents, butin rare déterministe et fin de tour.

Essais navigateur locaux : création d’une escouade Maëlys/Orso, protection et déplacement animé ; import d’un scénario de contrôle avec montée de niveau, apprentissage de Réserve d’éther, sort de zone, découverte d’Orage sur objectif et trousse en fouille. La carte découverte propose correctement l’équipement et l’explication du butin. Vérification à 390 × 844, sans débordement horizontal. Deux sessions réseau Orso/Maëlys vérifient coût et protection synchronisés. Ce scénario importé est un contrôle fonctionnel, pas une partie complète gagnée.

Équilibrage : les valeurs initiales sont testées fonctionnellement, mais demandent encore plusieurs vraies parties pour mesurer la difficulté des compositions et des reliques.

## Publication

V1.5 publiée le 4 octobre 2026 sur https://veille-noire.vercel.app. Déploiement `dpl_Aq2Dfkx29VY55S2JyMrJ35hs5AxL`, état READY. API disponible, protocole 2. Douze fichiers publics contrôlés par SHA-256, identiques au dossier construit.

Test serveur public : quatre clients, pouvoir d’Orso, commandes simultanées et dédupliquées, une seule phase ennemie, reprise et absence des jetons privés dans les réponses. Dix-huit requêtes, médiane observée 623 ms.


Derniers ajustements : barre fixe contenue dans la largeur utile avec barre de défilement ; retour en haut à l’entrée en partie réseau ; dégâts de l’arme et soins de Malik affichés avec les talents. Les 93 tests passent après ces corrections.


Essai navigateur public à deux sessions : recrutement Orso/Maëlys, lancement, bouclier appliqué depuis la barre fixe et synchronisé, rechargement puis reprise du salon. Rendu final 390 × 844 : marge gauche de 6 px, aucune largeur débordante, entrée en mission en haut de page. Aucune erreur JavaScript observée. Capture : ../veille-noire-v15-public-mobile.jpg. Ces sessions ne remplacent pas une partie complète sur plusieurs téléphones physiques.

