# Veille Noire 1.8

## Fin de tour automatique

- **Solo** : dès que tous les survivants debout ont joué leurs actions, un bandeau « Fin de manche dans 3 s » apparaît et la phase du Chœur se lance seule. Le bouton « Attendre » garde la main pour la manche en cours.
- **En ligne** : le tour d'un joueur se termine seul après sa dernière action. « Reprendre mon tour » annule, et l'automatisme ne se relance pas pour cette manche.
- **Talents gratuits** : si un survivant peut encore agir sans action (déplacement d'Iris ou de Silène, porte de Lina, changement d'arme de Mira, talent Rapide), le bandeau le signale et le délai passe à 6 s.
- Le compte à rebours se met en pause pendant les animations, les fenêtres (fouille, talents…), quand l'onglet est en arrière-plan et pendant l'évacuation possible.
- Réglage « Fin auto / Fin manuelle » dans la barre de l'équipement et dans Pause. Préférence enregistrée sur l'appareil.
- Logique pure dans `ui-state.js` (`autoEndPlan`, `freeTalents`), testée dans `tests/auto-end-v18.test.mjs`.

## Portraits

Sacha, Mira et Naël reçoivent des portraits peints dans la même direction artistique que les planches précédentes (`assets/survivors-v18.jpg`, grille 2 × 2 ; la quatrième case est un portrait en réserve pour un futur survivant). Les anciens SVG `*-v17.svg` des personnages ne sont plus utilisés.

Génération : référence de style `survivors-reinforcements.webp`, modèle d'image avec référence, prompt dans `ART-DIRECTION.md`.
