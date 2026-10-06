# Ce qui change d'une version à l'autre

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
