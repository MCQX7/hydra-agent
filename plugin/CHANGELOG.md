# Ce qui change d'une version à l'autre

## 2.0 — 9 octobre 2026

### Nouveau

- **Hydra s'installe en plugin de Claude Code, pour le seul dossier de ta mission.** Deux
  commandes pour l'installer dans ce dossier, une pour le mettre à jour, sans rien cloner
  ni recopier ; Hydra n'apparaît dans aucun autre dossier. La méthode vit dans le plugin ;
  ton contexte et tes sujets vivent dans ce **dossier de mission**, qu'Hydra prépare à ton
  accord la première fois que tu le lances : ses règles, ses réglages (Opus, effort élevé,
  et l'écart des `CLAUDE.md` des dossiers au-dessus), les modèles du contexte et le dossier
  des sujets. Il ne s'installe que dans un dossier vide : ailleurs, il ne touche à rien et
  te dit comment faire. Une nouvelle mission, c'est un nouveau dossier et la même
  installation.
- **Les règles restent entières.** Le `CLAUDE.md` du dossier de mission est la copie
  complète des règles d'Hydra, tenue à jour par le plugin à chaque ouverture de session —
  ne le modifie pas : tes consignes vont dans `context/`. Après une mise à jour, Hydra te
  dit « Hydra vient d'être mis à jour : relance la session pour charger les nouvelles
  règles » : Claude Code lit les règles avant que le plugin ne les réécrive.
- **La copie reste.** Hydra s'installe aussi comme en 1.x, recopié dans ton dossier de
  travail, avec la même méthode.
- **Les clés d'API restent dans le dossier Hydra.** Une clé d'outil se pose dans
  `.claude/cles.env` du dossier de mission : elle n'est chargée que dans les sessions de ce
  dossier, jamais dans tes autres sessions Claude Code, et l'appel de l'API passe par un
  script du plugin qui place la clé lui-même, sans qu'elle apparaisse dans une commande.
- **Les chiffres d'usage se cherchent avant de se déclarer.** Avec ton outil d'analytics
  branché, une donnée d'usage qui manque — la valeur actuelle d'un indicateur, l'étape où
  les gens décrochent — se cherche dans l'outil avant de se déclarer absente : chiffres
  agrégés seulement, chacun avec sa source.
- **L'analytics se cale au branchement.** L'accueil retrouve l'espace à interroger dans une
  requête que tu copies depuis l'outil, plutôt que dans une configuration que tu n'as
  souvent pas le droit d'ouvrir, puis compare un ou deux chiffres à ton écran.

### Changé

- **Un chiffre d'analytics ne se cite pas avant que son unité soit vérifiée**, et un terme
  qui a plusieurs lectures dans l'outil (un segment, une population) se fait trancher par
  toi, les lectures chiffrées sous les yeux.
- **L'audit ne fait plus un constat du remplissage d'une maquette** : dates, prix, noms de
  démonstration ne sont pas des défauts de l'écran.
- **Le bilan de session parle dès ton premier message** (instance neuve, fichier
  d'instructions étranger), et lister le dossier des archives ne passe plus pour la lecture
  d'un autre sujet.

### Passer de la 1.x à la 2.0

Ton contexte (`context/`) et tes sujets (`topics/`) ne changent pas de forme. Deux chemins :

**Rester en copie.** Comme pour la 1.1 :
1. Récupère la 2.0 dans un dossier à part (README, § Démarrer, « En copie »).
2. Dans ton dossier Hydra, remplace par ceux de la 2.0 : `CLAUDE.md`, `README.md`,
   `CHANGELOG.md`, `LICENSE`, `.gitignore` (il tient tes clés d'API hors de git),
   `.claude/settings.json`, les dossiers
   `.claude/skills/hydra-*`, `.tools/` et `docs/`.
3. Ne touche ni à `context/`, ni à `topics/`, ni à `.claude/settings.local.json`.

**Passer au plugin.**
1. Crée un dossier vide pour ta mission, installe Hydra dedans et lances-y Claude Code
   (README, § Démarrer, « En plugin », étapes 1 à 3) : Hydra prépare le dossier.
2. Quitte Claude Code. Remplace le `context/` du nouveau dossier, qui ne porte que les
   modèles vides, par le `context/` de ta copie, et déplace-y ton dossier `topics/`.
3. Si ta copie portait des réglages à toi dans `.claude/settings.local.json`
   (autorisations), reporte-les dans celui du dossier de mission, sans toucher aux lignes
   qu'Hydra y a mises. Une clé d'outil, elle, va dans `.claude/cles.env` du dossier de
   mission : l'accueil te prépare et t'ouvre ce fichier quand tu branches l'outil.
4. Relance Claude Code depuis le dossier de mission. Ta copie 1.x ne sert plus : garde-la
   le temps de vérifier, puis supprime-la.

## 1.1 — 6 octobre 2026

### Nouveau

- **Des protos fidèles comme des écrans de production.** Avant de composer, la tête
  maquette lit le code de chaque écran existant dans ton outil de design, écrit le socle
  de la page comme un kit en code, et en génère tous les protos ; puis elle les capture,
  les regarde et les corrige jusqu'à ce qu'aucun ne s'écarte de l'écran d'origine. Toutes
  les pistes partagent ce socle : seul le levier change d'une piste à l'autre.
- **Les protos, dans la foulée ou après ta relecture.** Au cadrage, Hydra te demande
  maintenant, comme pour le mode, quand composer les protos — la partie la plus coûteuse
  d'un sujet. Après relecture : il s'arrête au brief, même d'un trait ; tu lis la fiche,
  le rapport et le brief, puis tu demandes « compose les protos » quand les pistes le
  valent. Il repart alors du brief, sans refaire le reste.
- **Tes outils, déclarés par leur seul nom.** Tu écris le nom de l'outil dans ta mission ;
  Hydra trouve lui-même comment le brancher — par son connecteur, ou par son API avec une
  clé que tu génères, rangée hors du dépôt — et t'aide à le faire.
- **Un outil de benchmark gratuit, si tu n'en as pas.** L'accueil te suggère Lazyweb,
  une bibliothèque d'écrans gratuite avec un connecteur pour Claude Code — limitée aux
  apps iOS et aux pages marketing. Plusieurs outils pour un même rôle : Hydra suit ton
  ordre, et ne passe au suivant que si le premier ne suffit pas.
- **Tes librairies retrouvées par un lien de maquette.** Tu n'as pas les liens des
  fichiers de tes librairies : le lien d'une maquette qui les utilise suffit.
- **Récupérer Hydra sans git** : en ZIP depuis GitHub, ou en une commande (README,
  § Démarrer).

### Changé

- **Ton outil de design n'est plus jamais modifié.** Hydra le lit, y compris par
  script, mais n'y crée, ne modifie et n'y supprime plus rien, même temporairement.
- **La galerie signale un proto qui mêle deux écrans** : rangé sous l'un, il porte des
  blocs propres à l'autre.
- **La recette te propose la mise à jour du registre des récurrences**, en fin de
  recette, et n'écrit qu'après ton accord ; chaque occurrence est datée au jour et au
  build recetté.
- **Revoir les alertes d'un livrable** se fait en relançant son rendu, jamais en
  supprimant un fichier.

### Passer de la 1.0 à la 1.1

Ton contexte (`context/`) et tes sujets (`topics/`) ne bougent pas. Seule la méthode se
remplace :

1. Récupère la 1.1 dans un dossier à part (README, § Démarrer).
2. Dans ton dossier Hydra, remplace par ceux de la 1.1 : `CLAUDE.md`, `README.md`,
   `CHANGELOG.md`, `LICENSE`, `.claude/settings.json`, les dossiers
   `.claude/skills/hydra-*`, `.tools/` et `docs/`.
3. Ne touche ni à `context/`, ni à `topics/`, ni à `.claude/settings.local.json`.

## 1.0 — 2 octobre 2026

Première version publique : huit têtes, un accueil guidé, des outils qui tournent seuls,
et des outils de mission déclarés dans le contexte.
