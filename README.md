# Hydra — une équipe design dans Claude Code

Un corps, plusieurs têtes. Tu déposes un sujet — un écran existant, des documents,
un problème — et Hydra le mène : analyse de l'existant, recherche, pistes
argumentées, protos composés avec ton design system, textes vérifiés, recette
graphique du build. Le corps est l'orchestrateur ; les têtes sont des skills.

Pour la présentation complète — le déroulé d'un sujet, les têtes, les livrables, les
garde-fous : `docs/presentation.html`, à ouvrir dans un navigateur.

| Tête | Ce qu'elle fait |
|---|---|
| `hydra-cortex` | Orchestre : cadrage, déroulé, pauses, clôture. N'écrit aucun livrable. |
| `hydra-audit` | Analyse l'existant et ce qui est vrai chez le client : constats, hypothèses. |
| `hydra-research` | Cherche ce qui se fait ailleurs : références sourcées et datées. |
| `hydra-ideation` | Ouvre les pistes, les critique, converge sur des critères explicites. |
| `hydra-maquette` | Compose les pistes en protos HTML, ancrés sur le design system. |
| `hydra-writer` | Vérifie les textes des protos contre le ton ; répond aux questions de wording. |
| `hydra-recette` | Compare la maquette au build, chiffres à l'appui, pour le développeur. |
| `hydra-accueil` | À la première session : explique Hydra et pré-remplit le contexte avec toi. |

La phase de discovery d'un sujet réunit deux têtes : l'audit, qui regarde ton existant,
et research, qui regarde ailleurs.

Trois couches, qui ne se mélangent jamais :
1. **La méthode** — `CLAUDE.md`, `.claude/skills/hydra-*`, `.tools/`. Aucun contenu
   client. La même pour tous.
2. **Le contexte** — `context/`. Tout ce qui est propre à ta mission. Changer de
   mission, c'est remplacer ce dossier.
3. **Les sujets** — `topics/<nom>/`. Un dossier par sujet : ce que tu déposes, et ce
   qu'Hydra produit. Un sujet terminé se range dans `topics/.archive/`, livré vide : il
   sort de la vue, et Hydra ne s'en sert pas comme modèle.

## Pour qui, et ce que ça change

Pour un product designer qui travaille en mission, et qui veut passer moins de
temps à préparer et plus à trancher. Hydra fait le travail d'une petite équipe
autour de lui — analyse, recherche, exploration, rédaction, recette — et lui
laisse les décisions. Il ne flatte pas : une idée faible se dit avec son pourquoi,
une affirmation cite sa source, une absence de données se dit au lieu de se combler.

## Ce qu'un sujet produit

| Livrable | Ce qu'il contient |
|---|---|
| `01-fiche` | Le cadrage : le problème, l'indicateur qui tranchera et son seuil, qui est touché, le périmètre, ce qui est déjà décidé. |
| `02-rapport` | Les constats sur l'existant, les hypothèses, les références, les pistes — chacune critiquée —, la convergence et la recommandation. Chaque affirmation renvoie à sa source. |
| `03-brief` | Le passage aux protos : pour chaque piste, ce que l'écran doit montrer, avec quoi le composer, et un texte de composition que n'importe qui peut reprendre dans son outil. |
| `explorations/` | La galerie : un proto HTML par piste, manipulable, dans les rendus des plateformes de la mission (mobile, desktop ou les deux), sur le même socle d'écran — seul le levier de la piste change, pour comparer sur pièce. |
| Recette | Pour le développeur : un tableau par zone de l'écran, desktop et mobile, avec la valeur attendue, la valeur mesurée sur le build, la sévérité, et une capture annotée. |

Deux façons de dérouler : **d'un trait** — Hydra va jusqu'au bout et consigne ses
arbitrages en hypothèses — ou **par étapes** — il s'arrête aux moments clés pour que
tu tranches.

## Ce qu'Hydra ne fait pas

- Pas de recherche utilisateur : il ne mène ni entretiens ni tests ; il exploite ceux
  que tu lui donnes.
- Il ne modifie jamais ta source dans l'outil de design : il la lit, et compose ses
  protos à part, en HTML.
- La recette est visuelle : ni accessibilité, ni test fonctionnel, ni contenu des
  données affichées.
- Pas de contenu marketing long : writer s'occupe des textes d'interface.
- Il n'invente ni composant, ni valeur, ni convention : ce qui manque se signale.

## Prérequis

- **Claude Code**, idéalement avec accès au modèle **Opus** : Hydra est conçu pour
  Opus en effort élevé (`.claude/settings.json`), la tête recette en effort moyen —
  c'est un parti pris, tiré de tests comparés. Il fonctionne aussi avec Sonnet ou un
  effort plus bas, si ton offre ne permet pas mieux : ses livrables sont alors moins bons.
- **Node.js 22 ou plus récent** : les outils sont des scripts Node, sans
  dépendance à installer.
- **Google Chrome** (ou Chromium) : les outils s'en servent pour capturer les
  protos et mesurer le build.
- **Les outils de ta mission**, branchés comme connecteurs MCP de Claude Code : un
  outil de design (pour lire les maquettes), un outil de benchmark (des écrans de
  produits réels), un outil d'analytics… Aucun n'est obligatoire ; tu les déclares
  dans `context/mission.md`, et chaque tête dit ce qu'elle fait sans eux. L'analytics se
  lit aujourd'hui par les exports que tu déposes dans un sujet.

## Installation

1. Récupère ce dossier, et lance `claude` à sa racine.
2. **Écarte tes autres fichiers d'instructions.** Claude Code charge dans chaque
   session ton `CLAUDE.md` personnel (`~/.claude/CLAUDE.md`) et ceux des dossiers
   au-dessus de celui-ci : ils se mêleraient à la méthode d'Hydra. Pour les
   écarter, crée `.claude/settings.local.json` (jamais versionné) :
   ```json
   {
     "claudeMdExcludes": [
       "/chemin/absolu/vers/le/dossier/parent/CLAUDE.md"
     ]
   }
   ```
   Un chemin par fichier à écarter ; un motif comme `**/mon-dossier/CLAUDE.md`
   marche aussi. Le `CLAUDE.md` d'Hydra, lui, doit rester chargé. Un `CLAUDE.md` ajouté
   plus tard au-dessus de l'instance, et non écarté, est signalé à la session suivante.
3. **La première session t'accueille** : commence par « je viens de lancer Hydra ».
   Elle t'explique le fonctionnement, recopie
   les modèles vides du contexte dans `context/` et les pré-remplit avec toi. Modèles
   et guide du contexte sont rangés dans la tête d'accueil
   (`.claude/skills/hydra-accueil/references/`) ; le guide (`GUIDE-CONTEXTE.md`) dit,
   fichier par fichier, à quoi il sert, ce qui se dégrade sans lui, quelles sources le
   remplissent et comment l'enrichir.
4. **Le contexte se construit ensuite au fil des sujets.** Il n'a pas à être complet
   le premier jour : à chaque cadrage, Hydra demande ce qui manque — la métrique qui
   jugera le sujet, qui est touché, un terme inconnu —, puis te propose de l'ajouter
   au contexte, et l'écrit après ton accord. Il n'invente rien pour combler un vide.

## Déposer un sujet

Crée `topics/<nom>/inputs/`, mets-y tes documents, puis écris par exemple :

> Audit de [sujet] : [lien de la maquette ou URL de prod], fichiers dans
> topics/[nom]/inputs/. Déroule.

Hydra cadre en un message — ce qu'il a trouvé, ce qui manque, le mode de
déroulé — puis avance. « Déroule » enchaîne tout d'un trait ; « étape par
étape » s'arrête aux moments clés pour que tu tranches ; sans l'un ni l'autre,
Hydra te recommande un mode au cadrage. Les livrables s'écrivent dans le dossier
du sujet ; la galerie s'ouvre dans le navigateur.

## Demander une seule chose

Tout n'est pas un sujet complet. Hydra choisit les têtes d'après ta demande — inutile
de les nommer — et ne produit que ce qu'elle appelle :

| Tu demandes | Ce qui tourne | Ce que tu reçois |
|---|---|---|
| « Audite cette page », « trouve les points de friction de ce parcours » (un lien ou une URL) | cadrage, audit, research en appui | la fiche et le rapport — constats, hypothèses, références ; Hydra propose ensuite d'ouvrir des pistes |
| « Quels sont les meilleurs patterns pour… », « les bonnes pratiques de… », en une question | research | un livrable de recherche court, avec les écrans en images et les liens vers les sources ; son condensé dans la conversation |
| « Que disent les études sur… », « qu'est-ce qui marche pour… », sur un sujet précis | cadrage, research | un livrable de recherche : ce que les études, articles et guides établissent, et les enseignements pour ta problématique |
| Un benchmark ou un état de l'art approfondi | cadrage, research | la fiche et un livrable de recherche : réponse courte, conclusions, ce qu'on ne sait pas, références |
| « Aide-moi à trancher entre… », « challenge cette idée » | cadrage, ideation, research en appui | la fiche et le rapport : les pistes, leur critique et une recommandation ; Hydra propose ensuite de les composer en protos |
| « Quel libellé pour… », « relis ces textes » | writer | des variantes argumentées, dans la conversation ; un tableau pour un écran entier |
| « Est-ce conforme à la maquette ? » (URL du build, lien de la section de maquette) | recette | la liste de corrections pour le développeur |


## Les outils, et ce qui casse sans eux

Les outils sont branchés par les réglages de l'instance et tournent seuls ; un
outil qui ne se lance pas se signale une fois, sans bloquer.

| Outil | Ce qu'il fait | Sans lui |
|---|---|---|
| `md-to-html.js` | Rend chaque livrable markdown en HTML lisible, et y fait passer des contrôles (sigles non définis, références, gras…). | Pas de rendu HTML, aucun contrôle des livrables. |
| `proto-frame.js` | Assemble la galerie des protos d'un sujet, et vérifie que chaque piste a son proto. | Pas de galerie ; des pistes sans proto passent inaperçues. |
| `proto-shot.js` | Capture chaque proto dans les rendus que la fiche du sujet demande, pour que la tête regarde ce qu'elle a composé. | La tête ne voit pas son rendu : débordements et chevauchements passent. |
| `rendus.js` | Lit dans la fiche du sujet les rendus demandés (mobile, desktop ou les deux), pour les captures et la galerie. | Tous les protos sortent en mobile et en desktop. |
| `hydra-qa-gate.js` | Garde de fin de tour : bloque tant que des captures neuves n'ont pas été regardées ou que les compteurs d'une recette ne tombent pas juste. | Un proto corrigé peut être livré sans avoir été revu. |
| `hydra-mesure.js` | Relève les valeurs réelles du build (tailles, couleurs, positions) pour la recette. | La recette ne peut pas chiffrer ses écarts. |
| `hydra-bilan.js` | Signale en cours de session un document déposé jamais lu, une recherche faite hors de la tête research, la lecture d'un autre sujet. | Ces oublis passent sans que personne ne les voie. |
| `hydra-render.html`, `vendor/` | Gabarit de rendu des livrables, et la bibliothèque de conversion markdown (marked, licence MIT). | Rien ne se rend. |

## Règle d'or

Aucun contenu client dans la méthode : ni nom, ni chiffre, ni exemple tiré d'une
mission. Tout ce qui est propre à une mission vit dans `context/` et dans
`topics/`.
