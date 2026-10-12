# Veille Noire — Les derniers de Nacre

Jeu de plateau tactique original en français, jouable dans le navigateur.

Version publique actuelle : https://veille-noire.vercel.app — V1.7.1, mise à jour du 11 octobre 2026. Solo ou coopération locale sur le même écran, avec 2 à 4 survivants ; coopération en ligne de 2 à 4 joueurs, un personnage par appareil. Aucun compte joueur nécessaire. Les salons utilisent une API Vercel et un stockage Upstash gratuit, avec passage automatique au payant désactivé.

## Jouer

Choisir une mission, puis « Composer mon escouade ». Sélectionner l’intensité et 2 à 4 personnages parmi les quinze, puis « Voir le briefing ». Les neuf missions sont disponibles immédiatement.

Pour jouer sur plusieurs téléphones : « Jouer ensemble · chacun son téléphone », puis créer un salon. Partager le code de huit caractères ou le lien d’invitation ; chaque joueur rejoint et choisit son personnage. Chaque joueur, hôte compris, confirme « Je suis prêt ». L’hôte lance la mission une fois tout le monde prêt et connecté. Une modification de mission, d’intensité ou d’escouade remet les validations à zéro. Les appareils peuvent utiliser des réseaux différents. La phase ennemie démarre lorsque tous les survivants debout terminent leur tour. Pour revenir après un rechargement, utiliser « Reprendre mon salon » dans le même navigateur.

- 9 missions et 9 agencements : récupération, défense, archives, escorte, scellement, combat final.
- 15 survivants illustrés, dont quatre classes à pouvoirs actifs : mage, gardien, duelliste et soigneuse.
- 4 types d’ennemis, dont un boss protégé par des résonateurs.
- 16 armes, dont trois reliques très rares, 4 consommables, fouille, échange, soins et réanimation.
- Déplacements par zones, portes, lignes de vue, bruit, dés et progression.
- 6 événements, 3 intensités, 12 cartes d’apparition et vagues évolutives.
- Six niveaux à 0 / 7 / 19 / 43 / 70 / 100 XP, avec arbres de spécialisation propres aux personnages.
- Carte de découverte à chaque fouille, sans réouverture au changement de personnage.
- Fusil et carabine à 7 XP, harpon à 19 XP, reliques à 43 XP ; restrictions affichées et contrôlées côté serveur.
- Pouvoirs accessibles par le talent Éveil à 19 XP, une fois par manche.
- Commandes fixes sur ordinateur et téléphone ; arme équipée et pouvoirs directement accessibles.
- Échanges réciproques d’armes et de consommables, avec conservation des munitions.
- Plateau enrichi de terrains peints, nouveaux portraits et équipement illustré.
- Jets de dés animés, déplacements glissés des survivants et ennemis, blessures affichées.
- Animations facultatives, désactivées avec la préférence système de réduction des mouvements.
- Prévision des mouvements ennemis et bilan détaillé des blessures et apparitions.
- Codex, récit de campagne, aide, raccourcis, audio synthétisé optionnel.
- Sauvegarde automatique locale, reprise, export et import JSON.
- Interface adaptative ordinateur, tablette et téléphone.

Les nouvelles parties utilisent les règles tactiques : fuite à +1 action par ennemi, bruit de l’escouade, objectifs à 5 XP, changement d’arme à 1 action et arc à 1 dé. Les sauvegardes antérieures conservent leurs règles d’origine. Commencer une nouvelle expédition pour bénéficier des règles équilibrées V1.6 : pouvoirs à débloquer, arbres de talents et niveaux requis pour les armes.

Les règles complètes sont intégrées au jeu. La campagne conserve les victoires ; chaque mission commence avec les caractéristiques initiales. Les sauvegardes solo restent indépendantes des salons réseau. Les salons sont conservés 24 heures après la dernière action ou entrée d’un joueur.

## Démarrage local

Node.js 22 ou ultérieur. Aucune dépendance à installer.

```sh
node server.mjs
```

Ouvrir http://127.0.0.1:4173. Ne pas ouvrir simplement index.html en fichier local : les modules JavaScript nécessitent un serveur HTTP.

## Vérifier et construire

```sh
node --test tests/*.test.mjs
node build.mjs
```

Le dossier `dist` contient le site statique complet. Les 129 tests couvrent les règles, les cas de victoire et de défaite, la validation des sauvegardes, les talents, les compositions, les actions et la synchronisation multijoueur. Les essais navigateur vérifient le recrutement, le démarrage, les portes, le déplacement, le combat, les changements de manche, la reprise et le rendu mobile. Un équilibrage statistique exhaustif reste à faire. Le bilan des parties complètes figure dans `../veille-noire-playtest.md`.

## Vercel

La configuration est fournie dans `vercel.json` : construction `node build.mjs`, sortie `dist`, aucun framework. Le solo fonctionne sans secret. Le multijoueur nécessite les variables Redis privées décrites dans `MULTIPLAYER.md` et la fonction du dossier `api`, qui ne fait pas partie du dossier statique `dist`.

```sh
vercel deploy --prod
```

## Fichiers

- `room-model.js` : transitions des salons, droits des joueurs et fin de tour commune.
- `multiplayer.js` : synchronisation HTTPS, reprise et commandes dédupliquées.
- `api/party.js`, `server/` : API serveur et stockage Redis partagé.
- `ui-v14.css` : interface des salons et commandes individuelles.
- `ui-v15.css` : commandes fixes, découvertes, pouvoirs et talents.
- `progression.js` : six niveaux, quinze talents, arbres de spécialisation et pouvoirs des Éveillés.
- `engine.js` : règles et transitions d’état déterministes, indépendantes de l’interface.
- `content.js` : survivants, ennemis, équipement, événements et missions.
- `app.js` : interface, contrôles, sauvegarde et audio.
- `styles.css`, `ui-v11.css` et `ui-v13.css` : direction visuelle et interface adaptative.
- `ui-state.js` : disponibilité des actions et bilans de phase.
- `exchange.js` : validation et transfert atomique du matériel.
- `presentation.js` et `animation.js` : niveaux, dés et relecture visuelle des phases.
- `art.js` : atlas illustrés des objets et décors du plateau.
- `spawn-deck.js` : paquet d’apparitions original et ajustements de difficulté.
- `assets/` : illustrations originales WebP/JPEG et icône SVG.
- `tests/` : tests du moteur et des renforts.

## Données et ressources

Les sauvegardes restent dans le stockage local du navigateur. Les polices sont servies par Google Fonts avec des polices système de secours. Les illustrations ont été générées pour le jeu ; les briefs figurent dans `ART-DIRECTION.md` et `ART-V15.md`. Aucun visuel, personnage, scénario ou texte de règle d’une franchise existante n’est utilisé.

## Équilibrage V1.6

Le détail des changements, les références officielles consultées, les mesures et leurs limites figurent dans `RELEASE-V16.md`. La V1.6 supprime les bonus automatiques de dés/précision et la cinquième action. À 7 XP : quatrième action. À 19/43 XP : choix de spécialisation/maîtrise. À 70/100 XP : autres choix. Les anciennes sauvegardes et salons conservent leurs règles.

## Prise en main V1.7.1

L’action Viser et son raccourci ont été retirés. Le premier tir de Sacha reçoit automatiquement un seuil réduit de 1 à chaque manche (minimum 2+). Les anciennes sauvegardes restent lisibles ; leur ancien bonus de visée ne s’applique plus. Le résumé « Les règles en 2 minutes » est disponible dans Règles, au premier lancement, dans le briefing et dans le salon en ligne.
