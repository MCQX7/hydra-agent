---
name: hydra-accueil
description: >
  Accueil d'une instance neuve d'Hydra : explique au designer comment Hydra
  fonctionne, recopie les modèles vides du contexte, pré-remplit chaque fichier
  avec lui à partir de ses réponses et de ses sources (documents, outils
  branchés), lui dit comment l'enrichir ensuite, l'aide à déclarer et brancher
  les outils de sa mission, puis lance son premier sujet. Se charge d'office
  quand `context/mission.md` manque ou porte encore la marque « hydra-accueil :
  en cours ». Déclencheurs : « première session », « installe Hydra », « aide-moi
  à remplir le contexte », « reprends l'accueil », « je change de mission ». NE
  PAS confondre avec hydra-cortex (le déroulé d'un sujet, une fois le contexte posé).
---

# Hydra — Accueil

<!-- PRINCIPE : cette tête ne contient aucun contenu de mission. Elle s'appuie sur
les modèles vides et le guide du contexte rangés dans son dossier, sous `references/`
(`.claude/skills/hydra-accueil/references/` depuis la racine de l'instance),
qui disent, fichier par fichier, à quoi il sert, ce qui se dégrade sans lui, quelles
sources le remplissent et comment l'enrichir. Elle les lit, elle ne les recopie pas. -->

## Quand elle tourne

- **D'office**, dans deux cas, constatés sur le disque :
  - `context/mission.md` n'existe pas : instance neuve ;
  - `context/mission.md` porte encore la ligne « hydra-accueil : en cours » : l'accueil
    a été interrompu. Reprendre au premier fichier encore au modèle vide.
  Un contrôle le rappelle au premier message de la session. L'accueil se propose avant
  toute autre demande ; un sujet déposé d'emblée attend la fin de l'étape 2. Le
  designer refuse : traiter sa demande en mode dégradé déclaré ; le rappel revient à
  la session suivante tant que la marque est là.
- **Sur demande** : le designer veut reprendre l'accueil, ou change de mission.
- **Jamais d'office une fois la marque retirée** (fin de l'étape 5).

## Le déroulé

Un message par étape, court. Le designer peut passer une étape ou un fichier : ce qui
est passé reste au modèle vide, et se dit au bilan.

### 1. Expliquer en quelques lignes

Ce qu'est Hydra (un orchestrateur et ses têtes), les trois couches — la méthode,
commune à tous ; le contexte, propre à la mission ; les sujets, un dossier chacun —,
et comment se déroule un sujet : dépôt, cadrage en un message, analyse, pistes,
protos, textes vérifiés. Dix lignes au plus : le reste s'apprend sur le premier sujet.

### 2. Poser les modèles

Lire `.claude/skills/hydra-accueil/references/GUIDE-CONTEXTE.md`. Proposer de recopier les modèles de
`.claude/skills/hydra-accueil/references/context/` dans `context/` ; au go du designer, ne recopier que les
fichiers absents de `context/` — jamais par-dessus un fichier existant.

### 3. Pré-remplir, fichier par fichier

Dans cet ordre : `mission.md` (dont la section des outils), `design/`, `kpi.md`,
`users.md`, `tone-of-voice/`. Le registre de recette ne se remplit pas : la recette
s'en charge.

`mission.md` est le fichier qui rapporte le plus : y passer le temps qu'il faut, section
par section, et creuser jusqu'au niveau que le guide décrit (domaine et périmètre
précis, plateformes principale et ponctuelles, vrai vocabulaire métier, contraintes de
faisabilité, quotidien). `kpi.md` et `users.md` se proposent sans insister : ils se
remplissent surtout au fil des sujets, par les questions du cadrage et les
propositions de capitalisation qui suivent — le dire.

**Rien n'a à être complet aujourd'hui, et le dire tôt.** Un designer en mission donne
rarement tout d'emblée : une grande part du vocabulaire, des composants et des usages
se découvre dans les maquettes et les documents des sujets, et Hydra la propose alors.
Un terme flou prend une seule question ; sans réponse, il reste [à confirmer].

**Parler la langue de la mission.** Chaque réponse du designer règle les questions
suivantes : une fois le client, le produit et le domaine connus, les questions
portent sur eux, dans leurs mots — plus d'exemples génériques. Ne jamais proposer :
- un terme qu'il n'a pas employé (« y a-t-il aussi tel ou tel mot ? ») — il ne
  comprend pas la question, et rien ne dit que le terme existe chez lui ;
- un terme du jargon général du métier (gestion de produit, design, analytics) : ce
  n'est pas du vocabulaire de mission.

Pour chaque fichier, quatre temps, d'après le guide :
1. **Dire à quoi il sert et ce qui se dégrade sans lui** — deux ou trois lignes, pas
   de cours. Pour `users.md`, dire en plus pourquoi des axes et non des personas.
2. **Demander les sources que le designer a** — celles que le guide liste pour ce
   fichier (documents à déposer, outils à lire), y compris pour un fichier proposé
   sans insister — et poser les questions d'une section à la fois, groupées. Il peut répondre en vrac, coller un texte, déposer des
   fichiers : c'est Hydra qui met en forme.
3. **Pré-remplir depuis ces sources**, montrer ce qui sera écrit, et écrire au go —
   rien ne s'écrit dans `context/` sans l'accord du designer. Ce qu'aucune source ne
   donne reste vide ; une définition supposée porte [à confirmer] ; une combinaison
   d'utilisateurs porte son niveau de preuve ; aucune valeur mesurée n'entre.
4. **Dire comment l'enrichir ensuite** — en une ligne, d'après le guide : quelle
   source apporter plus tard, et ce qu'Hydra en fera.

**Les outils** (section « Outils de la mission » de `mission.md`) :
- Rôle par rôle (design, benchmark, analytics, gestion), **demander l'outil que la
  mission utilise**. Les connecteurs branchés dans la session peuvent servir de piste
  (« je vois tel connecteur branché : est-ce l'outil de benchmark de la mission ? »),
  jamais de réponse par défaut : ils sont ceux du designer, pas forcément ceux de la
  mission, et aucun outil ne vaut pour tous les designers. Plusieurs outils pour un
  rôle : dans quel ordre.
- Puis vérifier s'il est branché, et noter son connecteur. **Plusieurs connecteurs
  pour un même outil** : prendre celui de l'éditeur de l'outil (le connecteur
  officiel), sans poser la question.
- Un outil que la mission a sans qu'il soit branché : le déclarer avec « aucun
  connecteur », et aider à le brancher depuis la documentation de l'outil — ce que la
  commande `/mcp` montre ensuite fait foi.
- **L'analytics** : demander si l'outil est branché à Claude par un connecteur (MCP)
  — pas si le designer y a accès, c'est une autre question. Dire qu'aujourd'hui Hydra
  travaille sur les exports et restitutions déposés dans un sujet : un connecteur
  d'analytics se déclare, mais Hydra ne va pas encore y chercher les données lui-même.
- Un rôle sans outil reste vide : la tête qui en a besoin le dira et appliquera son repli.

**Le design system** : suivre le `README.md` de `context/design/`. Outil de design
branché → demander les liens des fichiers de librairie, les noter dans la section
« Librairies » de l'index, lire variables, styles de texte et composants, et rédiger
les fondations et l'index. Une librairie partagée (publiée) se lit par la recherche de
l'outil, composant par composant : aucun lien de page n'est à demander. Une librairie non
partagée se lit page par page ; une première lecture qui n'en montre qu'une partie (peu
de pages, aucune couleur ni aucun composant) ne prouve pas leur absence : lister toutes
les pages par un autre moyen de l'outil avant de conclure, et ne demander les liens au
designer qu'en dernier recours. Puis rédiger `design.md`, section par section (le README du
dossier les liste) : les règles d'usage se tirent des descriptions des composants, de la
documentation publique du kit quand la librairie en dérive un, et des mesures faites
(contrastes) ; les principes et le figé / libre se demandent au designer, en deux ou
trois questions ; les archétypes de page se rempliront par observation des écrans. Rien
ne s'invente : une section sans source reste vide, et le dit. Pas d'outil branché → un
export des variables ou des captures de la page de styles.

**La charte de ton** : facultative. Une charte existe → la déposer dans
`tone-of-voice/`. Sinon, rien à faire : writer relèvera le ton sur l'existant.

### 4. Vérifier la protection

Demander si le designer a un `CLAUDE.md` personnel ou un `CLAUDE.md` dans un dossier
au-dessus de l'instance : il entrerait dans chaque session. Si oui, l'aider à
l'écarter dans `.claude/settings.local.json`, comme le README le montre.

### 5. Faire le bilan, clore, lancer le premier sujet

- Une ligne par fichier : rempli, partiel, vide — et pour chaque partiel ou vide, ce que
  ça coûtera sur un sujet (d'après le guide). Le contexte se complète ensuite au fil
  des sujets : cortex rappelle ce qui manque au cadrage.
- **Clore l'accueil** : proposer de retirer de `mission.md` la ligne « hydra-accueil :
  en cours », et la retirer au go. Tant qu'elle est là, l'accueil se repropose à
  chaque session.
- Proposer le premier sujet : un dossier `topics/<nom>/inputs/`, les documents dedans,
  et une phrase qui dit le problème et l'existant (lien de maquette ou URL).

## Ce que cette tête NE fait PAS

- Ne traite aucun sujet : le premier sujet passe par cortex.
- N'invente aucune valeur de contexte : ce que le designer ne donne pas reste vide.
- N'écrit jamais par-dessus un fichier de `context/` existant, et n'écrit rien sans go.
