# Multijoueur V1.6 — activation et exploitation

**V1.6 publiée le 6 octobre 2026** sur https://veille-noire.vercel.app. Déploiement : `dpl_Z3bbyuBhGi9WAnTaiVdGESCq8yCT`. L’API publique répond `{"available":true,"protocol":3}`.

## Ce qui est prêt

- Solo et coopération locale conservés, avec leur sauvegarde indépendante.
- Salons privés par code de 8 caractères, de 2 à 4 joueurs, un personnage par joueur.
- Invitations par lien, douze personnages, six missions et trois intensités.
- Règles calculées par le serveur ; synchronisation HTTPS toutes les 1,5 secondes au premier plan.
- Une action ne peut pas être répétée après perte de sa réponse. Les actions concurrentes utilisent un contrôle de révision atomique.
- Fin de tour individuelle, reprise possible avant que le dernier joueur termine ; une seule phase ennemie commune.
- Reconnexion avec le même navigateur, y compris après rechargement. Le téléphone créateur n’héberge pas la partie.
- Conservation du salon pendant 24 heures après la dernière action ou entrée d’un joueur.

## Infrastructure requise

Le site statique et la fonction `/api/party` restent sur le projet Vercel existant. La fonction nécessite un stockage partagé Upstash Redis, offre gratuite, région Frankfurt et mise à niveau automatique désactivée. Aucune clé de stockage n’est envoyée au navigateur.

Variables serveur reconnues :

- `UPSTASH_REDIS_REST_URL` et `UPSTASH_REDIS_REST_TOKEN` ; ou
- `KV_REST_API_URL` et `KV_REST_API_TOKEN` (intégration Vercel).

Le refus d’activation ne casse pas le solo. Sans ces variables, la fonction annonce explicitement que les salons ne sont pas activés ; elle n’utilise jamais la mémoire éphémère d’une fonction Vercel comme stockage de production.

Clem a explicitement autorisé l’ajout d’Upstash gratuit avec `autoUpgrade=false` le 4 octobre 2026, puis confirmé l’acceptation des conditions Vercel Marketplace / Upstash. La ressource `veille-noire-salons` a été créée avec succès et connectée à l’environnement Production. Identifiant : `store_QjjjQ2pVmBi87hXt`. Les variables `KV_REST_API_URL` et `KV_REST_API_TOKEN` sont injectées côté serveur. Aucun secret n’a été ajouté au code ou à l’archive source.

Commande déjà exécutée avec succès (ne pas la relancer pour créer une deuxième ressource) :

```sh
vercel integration add upstash/upstash-kv --name veille-noire-salons --plan free --metadata primaryRegion=fra1 --metadata autoUpgrade=false --metadata eviction=false --no-env-pull --environment production --scope clempiqs-projects
```

Une fois l’intégration connectée, publier avec `vercel deploy --prod`, puis vérifier `/api/party?health=1` et effectuer une partie de test sur le site public. Ne jamais imprimer les jetons ni inclure un fichier `.env` dans une archive.

## Développement local

`node server.mjs` expose le site et la même API sur 127.0.0.1:4173. Pour un deuxième serveur, définir `PORT=4175`. Le stockage local est en mémoire et disparaît lorsque ce serveur s’arrête. Le serveur local filtre les fichiers publics et ne sert pas les fichiers de configuration privés.

## Vérifications réalisées

113 tests automatisés passent, dont 21 tests multijoueurs : propriété des personnages, unicité des choix, limite de quatre joueurs, droits de l’hôte, contrôle des commandes, synchronisation concurrente, déduplication, fin de tour commune, réanimation/état à terre, reprise, authentification, secrets retirés des réponses, expiration et stockage de production manquant. Les tests de transport couvrent aussi les réponses perdues ou tardives, les erreurs de jeu sans fausse déconnexion, le déblocage après reconnexion et la fermeture d’un salon pendant sa création.

Essais navigateur sur quatre sessions distinctes (pas quatre téléphones physiques) :

- Salon à deux : Clem/Lina et Alex/Iris ; déplacement gratuit d’Iris synchronisé, contrôle du personnage d’un autre joueur refusé, passage à la manche 2 sur les deux écrans.
- Rechargement du navigateur hôte pendant que le second joueur continue ; reprise de l’hôte avec les positions actuelles.
- Solo : création d’une partie à quatre survivants, déplacement de Lina et sauvegarde conservée.
- Salon à quatre : Clem/Lina, Alex/Malik, Sam/Ada, Lou/Jonas ; échange clé/pistolet synchronisé sur les deux inventaires, déplacement visible sur les autres écrans et phase ennemie déclenchée après le quatrième tour terminé.
- Rendu mobile 390 pixels, code/lien d’invitation et notifications vérifiés. Pas d’erreur JavaScript observée pendant ces essais.
- Vérification du 4 octobre : ancien salon expiré correctement refusé ; nouveau salon à deux, déplacements, manche 2, attaque de Malik avec dés puis action Viser. Les commandes restent utilisables après l’animation ; le second écran retrouve les mêmes points d’action et munitions.

Le déploiement public a ensuite été vérifié avec Redis réel :

- Deux sessions navigateur : invitation par lien, création/entrée, échange clé/pistolet avec conservation des munitions, déplacements, fin de tour commune, attaque animée, rechargement de l’hôte pendant que l’autre joueur continue, reprise avec le plateau courant. Aucun message d’erreur JavaScript observé.
- Rendu mobile 390 × 844 vérifié sur le site public. Bouton de resynchronisation de 46 pixels de haut.
- Quatre clients HTTP distincts : quatre actions envoyées simultanément contre la même révision, une seule validée ; nouvelle émission de la commande gagnante sans double dépense ; quatre fins de tour produisant exactement une phase ennemie ; reconnexion et secrets absents de la réponse. Résultats dans `../veille-noire-v14-online-test.json`. Quinze requêtes, médiane observée de 614 ms depuis cet environnement.

Les parties complètes précédentes restent documentées dans `../veille-noire-playtest.md`. Les essais en ligne ont utilisé des sessions navigateur et des clients HTTP, pas plusieurs smartphones physiques sur Wi-Fi/4G. Le transport HTTPS central ne nécessite pas de réseau local commun. Un essai sur les téléphones de la soirée reste utile.

## Validation V1.5

Les anciens salons restent reprenables avec leurs règles initiales. Les nouveaux salons utilisent le protocole 2 et permettent talents et pouvoirs. Les anciens clients doivent recharger la page.

Contrôle en production : quatre clients HTTP, pouvoir d’Orso appliqué à Maëlys, concurrence et déduplication, manche commune et reprise. Dix-huit requêtes, médiane observée 623 ms. Résultat : `../veille-noire-v15-online-test.json`. Les empreintes de douze fichiers et l’état de l’API publique concordent avec la version validée (`../veille-noire-v15-release-check.json`).


## Validation V1.6

Nouveaux salons en protocole 3 avec règles équilibrées ; protocoles 1 et 2 conservés pour les parties existantes. Contrôle public à quatre clients : Éveil requis, commande refusée sans modification de révision, concurrence, déduplication, phase commune et reprise. Dix-huit requêtes, médiane 619 ms. Rapport : `../veille-noire-v16-online-test.json`. Quinze empreintes de fichiers vérifiées et API disponible (`../veille-noire-v16-release-check.json`).
