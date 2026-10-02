---
name: hydra-recette
description: >
  Recette graphique : mesure une maquette et son intégration développée, apparie
  les éléments, et rend une LISTE DE CORRECTIONS pour le développeur — où, quoi,
  valeur attendue, valeur constatée. Un écran maquetté + son build à comparer =
  ce skill. Déclencheurs : « est-ce que c'est conforme », « est-ce iso maquette »,
  « regarde ce que les devs ont livré », « vérifie cette intégration », « une
  revue visuelle avant la mise en prod ». NE PAS confondre avec hydra-audit
  (analyse et critique d'un design en amont).
effort: medium
---

# Hydra — Recette graphique

<!-- version: v2.0 — la recette se MESURE des deux côtés : styles calculés du
build relevés par `.tools/hydra-mesure.js`, valeurs attendues lues dans l'outil de
design. -->

## Objectif

Rendre au développeur la liste des écarts FACTUELS entre la maquette et le build,
chacun avec sa valeur attendue et sa valeur constatée, pour qu'il corrige sans
avoir à interpréter. Ce livrable n'est pas une analyse : ni raisonnement, ni
hypothèse, ni ce qui est conforme.

## Inputs

- **La maquette** : toujours le lien du cadre de l'écran dans l'outil de design —
  point d'entrée de la structure, pas du contexte de design (§ Méthode). Une
  maquette reçue en capture : demander son lien. Une section qui porte le cadre
  desktop et le cadre mobile du même écran : la recette se fait sur les deux
  (§ Deux devices).
- **Le build** : l'URL de la page (le seul mode qui rende la typographie), ou à
  défaut une capture — voir § Quand on n'a qu'une capture.
- **Le périmètre** : quels écrans, quel(s) device(s) — desktop, mobile ou les deux —,
  quelle largeur, quel état. Non précisé : le
  demander — comparer deux états différents produit un rapport faux. C'est, avec une
  maquette sans lien ou un lien sans nœud, le seul motif d'arrêt : la maquette, elle, ne se discute pas (§ Format de sortie). L'état de
  la page AU RELEVÉ, lui, ne se demande pas et ne se suppose pas : il est rendu
  par le champ `etat` du relevé. Page annoncée BARRÉE au relevé : relancer avec
  `--fermer <sélecteur du bouton de fermeture>`, et déclarer l'état au rapport.

## Deux devices — desktop et mobile

Le cas courant : l'URL du build, et le lien d'une section de l'outil de design qui
porte le cadre desktop et le cadre mobile du même écran. La recette se fait sur les
deux, l'un après l'autre, chacun avec la méthode complète (§ Méthode : relever, lire la
maquette, apparier), et ses fichiers dans son dossier — `<device>` vaut `desktop` ou
`mobile`, en minuscules :
- **relevé du build** : `--sortie <sujet>/.mesures/<device>/build.json --dossier
  <sujet>/refs/<device>` ; en mobile, `--mobile` et la largeur du cadre mobile. L'outil
  refuse un dossier de captures qui ne porte pas le nom du device : les deux devices
  donneraient les mêmes noms de fichiers, et le second écraserait le premier ;
- **valeurs de la maquette** : lues dans le cadre du device, écrites dans
  `<sujet>/.mesures/<device>/maquette.json`, appariées au relevé du MÊME device ;
- **livrable** : une seule page — le compte global en tête, puis une section par zone,
  « ## [zone] », qui porte une sous-partie « ### Desktop » puis une « ### Mobile »,
  chacune avec sa capture annotée et son tableau : le dev compare les deux devices
  d'une zone sans parcourir le document. Ce titre de sous-partie relie ses lignes aux
  mesures de son device : le calcul des conformes et le garde comparent chaque
  sous-partie à SON relevé ;
- **captures annotées** : une commande par device, `--annoter <livrable> --releve
  <sujet>/.mesures/<device>/build.json` — elle n'annote que les sous-parties du device.

Un seul device : les fichiers restent à la racine de `.mesures/`, comme avant. Une
recette de plusieurs écrans différents (un flow) n'est pas traitée.

## Méthode — mesurer les deux côtés, puis apparier

La recette ne se fait pas à l'œil. Trois temps, dans cet ordre.

1. **Relever le build ET le photographier.** `node .tools/hydra-mesure.js --url
   <url|fichier> --largeur <px> [--mobile] --sortie <sujet>/.mesures/build.json
   --dossier <sujet>/refs [--captures <sujet>/plan-captures.json]` écrit un
   relevé par élément : repère, chemin CSS, texte, boîte (x, y, largeur, hauteur),
   police, taille, graisse, interligne, couleur, fond, marges, rayon, bordure —
   et, pour toute image, sa source, ses dimensions intrinsèques et l'empreinte
   de ses pixels, qui se compare d'un côté à l'autre là où l'URL ne le peut pas.
   La même invocation produit les captures du build, dans la session qui vient de
   mesurer : sans `--captures`, la page entière ; avec, les zones du plan — un
   tableau JSON d'entrées `{ "nom", "pleine": true }` ou `{ "nom", "x", "y", "l", "h" }`,
   toujours avec une entrée `pleine` (sans elle, les captures annotées sont
   impossibles ensuite), écrit une fois par écran, gardé à la racine du sujet, réutilisé aux recettes
   suivantes. Un second chargement de la page produirait des visuels d'un autre
   état que le relevé.
2. **Relever la maquette — et l'ÉCRIRE.** Chaque lecture désigne son nœud — celui du
   lien déposé, ou un nœud tiré de la structure déjà lue ; une sélection que l'outil
   annonce dans sa réponse ne désigne jamais la cible (c'est celle de l'application,
   partagée par toutes les sessions), et un lien sans nœud se complète en le
   demandant. Trois lectures, elles ne se remplacent
   pas, et se font DANS CET ORDRE — chacune dit où faire la suivante :
   - le **catalogue de variables**, UNE fois par cadre : les valeurs légales
     (tailles, graisses, couleurs, espacements, ombres) et les dimensions propres
     aux composants. Deux devices, deux cadres, deux lectures : les valeurs d'un
     cadre ne valent pas pour l'autre. La réponse s'écrit telle quelle, au moment de
     la lecture, dans `<sujet>/.mesures/<device>/variables.json` :
     `{ "noeud", "variables": { "<nom>": "<valeur>" } }` — le garde y confronte
     chaque valeur attendue qui porte un `jeton` ;
   - la **structure**, sur le cadre puis RÉCURSIVEMENT dans les instances qu'elle
     rend fermées : l'arbre géométrique, coordonnées relatives au parent. C'est
     elle qui fixe les RÉGIONS : une région est le nœud de la structure auquel on
     rattache UNE zone du rapport, et un nœud qui en contient deux n'en est pas
     une ;
   - le **contexte de design**, région par région : par élément, son TEXTE et
     ses valeurs attendues en token + valeur résolue. Il les rend sous forme de
     TRANSCRIPTION en code de tout le sous-arbre, d'où l'interdiction : jamais sur
     le cadre ni sur un nœud qui contient plusieurs régions — la réponse enfle
     jusqu'à être tronquée avant la fin. Une réponse tronquée ne vaut pas relevé :
     on relit sur les sous-régions, et ses valeurs ne s'écrivent pas dans
     `maquette.json`. On y PRÉLÈVE les valeurs, on ne relit pas le code, et
     l'image jointe n'est pas un relevé.
   Chaque valeur attendue LUE s'écrit dans `<sujet>/.mesures/maquette.json`, une
   entrée par valeur, **au moment où on la lit** — pas après, sinon elle se perd
   entre la lecture et le rapport :
   `{ "zone", "noeud", "element", "propriete", "attendu", "jeton", "build", "statut" }`,
   et `"etat": "inactif"` quand la maquette montre l'élément désactivé.
   `propriete` prend l'un des noms que le calcul reconnaît — taille, couleur, fond,
   graisse, police, rayon, hauteur, largeur, dimensions, bordure, marge interne,
   texte — ; tout autre nom sort en « non comparée ». L'interligne ne se recette pas :
   il ne s'écrit ni au relevé de maquette, ni au livrable.
   `build` se pose à l'appariement : l'index de l'élément apparié dans le relevé du
   build (ou son chemin complet). **Le conforme se CALCULE, il ne se déclare pas** : au
   rendu du livrable, chaque valeur attendue appariée est comparée à la valeur relevée,
   et le statut calculé s'inscrit dans le relevé de maquette. L'agent ne pose que ce
   que la comparaison ne voit pas — `derive` (un constat visuel, une absence) ou
   `hors-perimetre` —, jamais `conforme`. Une valeur attendue sans élément apparié ni
   statut posé n'est ni conforme ni dérive : elle se signale « non comparée ».
3. **Apparier les deux relevés.** Par le TEXTE d'abord — libellé normalisé identique des deux
   côtés, c'est la clé la plus sûre. Par la GÉOMÉTRIE pour ce qui n'a pas de
   texte (média, icône, conteneur), à largeur de référence égale et coordonnées
   ramenées à l'origine du cadre. Ce qui ne s'apparie pas se LISTE des deux
   côtés — élément de la maquette sans équivalent au build (candidat « élément
   absent »), élément du build sans équivalent en maquette (candidat « élément
   en trop »). Un appariement muet serait une recette qui se croit complète.

**Le même état des deux côtés, élément par élément.** Un contrôle désactivé au build
(le relevé le marque `inactif`) ne se compare pas à un contrôle actif en maquette :
relever l'état équivalent, ou poser `hors-perimetre`.

Sur les paires, comparer cela et rien d'autre : géométrie (position RELATIVE —
écart au frère précédent, à défaut décalage à l'origine du parent —, largeur,
hauteur) · typographie (police, taille, graisse — pas l'interligne) · couleur (texte, fond, bordure) · forme (rayon, bordure) ·
wording (libellé exact, casse, ponctuation) · asset (contenu de l'image, par
son empreinte).

**Une position ABSOLUE ne se remonte jamais seule**, ni en ordonnée ni en
abscisse. « y = 1200 attendu, 1230 constaté » et rien d'autre n'est pas une
propriété de l'élément : c'est lui PLUS la somme de tout ce qui le précède, donc
un bloc amont qui dérive fait corriger dix positions justes. Ce qu'elle voulait
dire se dit sans elle : un bloc qui change de place le dit par son RANG dans
l'ordre, un espace qui change le dit par son ÉCART, une faute d'amont se remonte
UNE FOIS là où elle naît — en hauteur ou en marge. Ni frère ni parent mesurable :
la ligne le déclare, et ne repasse pas en absolu par défaut.

Deux contrôles, dans cet ordre de coût :
- **premier ordre — hors-catalogue** : toute valeur relevée au build qui ne
  figure pas au catalogue de variables est une dérive, même quand la valeur
  attendue pour CET élément est inconnue. Il ne demande que les deux relevés.
- **second ordre — token attendu** : l'élément apparié porte-t-il la valeur que
  le contexte de design lui assigne ? Plus précis, un appel par région.

Chaque dérive est localisée par le REPÈRE du relevé — id, libellé visible,
`aria-label`, nom de fichier d'image : ce qu'un développeur peut chercher dans
son code. Un élément sans repère se décrit en mots courts — « carte de produit
(titre, prix, bouton) » —, jamais par un chemin CSS : sur un build à classes
utilitaires, un chemin ne désigne personne, et il alourdit la ligne. Le chemin
complet, s'il sert, vit dans l'identifiant caché de la ligne (`<!--r:…-->`), jamais
dans le texte visible ; jamais non plus le libellé d'un descendant posé comme s'il
était celui de l'élément. Et dite en attendu → constaté : jamais de « ça ne
ressemble pas ».

## Ce qui n'est PAS une dérive

Le build tourne dans un environnement de développement. Ce qui en découle ne se
remonte NI en dérive NI en incertitude — on n'en parle pas :

- **données** : montants, dates, libellés pilotés par le contenu, jeux d'essai ;
- **session** : compte, solde, personnalisation, en-tête réduit quand la capture
  est prise hors connexion ;
- **fonction en panne** : erreur serveur, écran d'échec — hors périmètre ;
- **rendu** : anti-aliasing, lissage de police, compression d'image ;
- **version d'asset** : un visuel plus récent d'un côté que de l'autre se
  signale en une ligne, il ne se juge pas.

Si l'environnement empêche de recetter une zone, cela s'écrit en UNE ligne en
tête — « zone X non recettable : raison » — et la zone sort du périmètre.

## Constat visuel — ce qui se voit sans se mesurer

Un écart réel peut échapper au relevé : un bloc réagencé à boîtes identiques, un
texte qui déborde ou se tronque, un élément que l'appariement n'a pas su
rapprocher. Il se remonte, dans les DEUX modes, avec la sévérité que sa nature
lui donne — la preuve n'est pas une priorité, elle est une colonne : la ligne
porte « image » là où une dérive mesurée porte « mesuré ».

La frontière : un constat visuel nomme un OBJET et ce qui diffère chez lui —
« les cartes sont empilées là où la maquette les met côte à côte ». Une
impression compare un DEGRÉ — « paraît plus petit », « moins aéré », « ça ne
ressemble pas ». Un degré est une grandeur : il se mesure, ou il ne s'écrit pas.

Trois verrous, pour que cette voie ne serve pas de décharge :

- **subsidiarité** : si la propriété est mesurable dans le mode courant, la voie
  visuelle est FERMÉE. Elle ne reçoit que ce que le relevé ne peut pas voir, et
  elle rétrécit chaque fois qu'il grandit.
- **falsifiabilité** : le constat se revérifie sur les deux mêmes visuels par
  quelqu'un d'autre, sans refaire la recette.
- **désignation** : il cite la zone et les deux visuels. Sans pièce, rien.

## Taxonomie des dérives (motif stable)

Chaque dérive porte un **motif** stable `famille / type / localisation` —
c'est cet identifiant qui permet de compter les récurrences d'une recette à
l'autre. **Sans stabilité de nommage, les récurrences ne se comptent pas.**

- **Familles** (fermées) : `géométrie`, `typo`, `couleur`, `forme`, `wording`,
  `asset`, `absence`.
- **Type** : le sous-motif précis (ex. `espacement-vertical`, `graisse`,
  `hors-catalogue`, `élément-absent`). **Réutiliser les types déjà présents
  dans le registre `recette-recurrences.md` du contexte projet AVANT d'en
  inventer un** — un même écart porte toujours le même type.
- **Localisation** : le REPÈRE de l'élément, tel que le relevé le donne (id,
  `aria-label`, libellé, image) — la même adresse qu'au livrable, et la clé de
  COMPTAGE. Sans repère, une courte description en mots ; jamais de chemin CSS visible.

Exemple : `couleur / hors-catalogue / « Valider »`.

## Sévérité

Deux niveaux, calculés puis tranchés par le designer. Ce qui les sépare, c'est ce
que l'écart fait au rendu — jamais la zone où il tombe, jamais le mode de preuve :
un réagencement vu sur image est Majeur comme s'il était mesuré.

- **Majeur** — ce qui change fortement le rendu :
  - disposition ou agencement : bloc absent, réagencé, rang changé, grille
    réorganisée ;
  - élément manquant ; libellé faux — d'autres mots, pas seulement une autre
    casse, une autre ponctuation ou un autre espace ;
  - taille de police très éloignée ; couleur qui change de rôle.
- **Mineur** — tout le reste.

« Très éloignée » et « change de rôle » se jugent sur le catalogue de variables,
jamais sur un seuil chiffré. Une taille est très éloignée quand plus d'un cran de
l'échelle typographique la sépare de l'attendue. Une couleur change de rôle quand
la variable constatée n'a pas le rôle de l'attendue (texte principal ou secondaire,
fond, marque, état…) ; le rôle d'une couleur est celui de la variable SÉMANTIQUE la
plus proche. Une valeur hors catalogue s'y rattache de même, et c'est cette variable
qui se compare. Une mention réglementaire suit la même
grille : absente ou au texte altéré, elle est Majeure ; sa géométrie est une
géométrie. Un override du registre, s'il en porte, prime. Une sévérité que le designer
corrige est consignée au registre (§ Désaccords).

## Hotlist (priorisation par le registre)

Si le registre `recette-recurrences.md` existe dans le contexte projet :
**vérifier ses motifs ACTIFS en premier** (récurrences connues, les plus
rentables à checker). La hotlist **priorise** l'ordre de la passe — elle ne
**remplace JAMAIS** la passe complète.

**Après chaque recette, proposer la mise à jour du registre** — le registre est le
compteur PERSISTANT ; ne JAMAIS compter les récurrences de mémoire (entre
deux recettes il y a des clear/compact). Dans le message de fin au designer, et non
dans le livrable du dev, le motif de chaque dérive et ce qu'il devient :
- motif vu pour la 1ʳᵉ fois → une entrée en zone **Candidats**, avec son occurrence ;
- motif déjà en Candidats et recroisé sur une **recette distincte** →
  2 occurrences → **promotion en Motif actif** ;
- motif actif recroisé → son occurrence ajoutée.
L'occurrence s'écrit `[AAAA-MM-JJ] écran · build — note` : le jour du relevé et le
build recetté, ce qui fait d'elle une recette distincte. **Une recette distincte**,
c'est un autre build, ou le même relevé un autre jour : deux runs sur le même build le
même jour sont UNE recette, donc une seule occurrence. L'occurrence ne nomme jamais un
dossier de `topics/` : le contexte ne dépend d'aucun sujet.
Le registre vit dans le contexte : la proposition se fait en diff, et rien ne s'écrit
avant le go du designer (CLAUDE.md, « Écrire dans le contexte »). Le comptage se LIT et
s'ÉCRIT dans le registre, jamais en mémoire.

## Incertitudes — l'exception

Une incertitude ne se justifie que si la mesure a été TENTÉE et a échoué, et
elle dit laquelle : « propriété sur élément — mesure impossible : raison ».
« Non mesuré » n'est pas recevable : la mesure est outillée. Les états
survol et focus sont hors recette : la maquette ne les montre pas, rien ne
permet de les juger. **Zéro incertitude est un résultat normal.**

## Re-recette (après corrections)

Quand un écran déjà recetté revient : relever à nouveau, puis vérifier
UNIQUEMENT (1) les dérives du rapport précédent — corrigée / persistante /
partiellement corrigée — et (2) les régressions sur les zones touchées. Pas de
re-passe complète, sauf demande explicite.

## Format de sortie — une liste de corrections pour un dev

Le livrable s'adresse au développeur qui corrige : où, quoi, attendu, constaté.
Pas de raisonnement, pas d'hypothèse, **rien de ce qui est conforme** — ni section,
ni ligne de fin de zone, ni compte : ce qui est conforme vit dans le relevé de
maquette, pour le travail, pas dans le livrable du dev.

**L'en-tête porte les seuls champs du gabarit, puis le tableau.** Aucun paragraphe
entre les deux : la recette ne juge ni la légitimité ni l'ancienneté de la maquette
— elle est la vérité ici —, et elle ne s'arrête pour demander que si le périmètre
manque (écrans, largeur, état) ou si la maquette n'a pas de lien, ou un lien sans nœud. Seules exceptions en tête : « zone X non
recettable : raison », et la déclaration du mode capture.

**La ligne de compte se recompte sur le tableau, jamais de mémoire.** Les sévérités se comptent au
tableau, et le garde de fin de tour refuse de conclure tant que l'annonce et le
tableau divergent.

**Chaque ligne porte, en source, l'identifiant de son élément dans le relevé du
build** — `<!--r:N-->` dans la case Élément, N l'index (ou le chemin complet) ;
plusieurs boîtes : `<!--r:N,M-->`. Le rendu ne l'affiche pas, un outil la retrouve :
c'est lui qui relie une dérive calculée à sa ligne, et qui place les marqueurs des
captures annotées. Un élément absent du build n'a pas d'identifiant : sa ligne dit
« absent ».

**Une capture annotée par section** (deux devices : par sous-partie), pour que le dev voie où corriger. Le livrable
écrit : `node .tools/hydra-mesure.js --annoter <sujet>/.src/<livrable>.md` recadre la
capture du build — celle du relevé, même session que les boîtes —, pose sur chaque
boîte un marqueur au numéro de sa ligne, et dit ce qui ne se marque pas et pourquoi
(élément absent, fixe, dans un défilement interne, hors capture, ligne sans
identifiant). Chaque image se lie en tête de sa section ; une section sans ligne
marquable n'a pas d'image. Deux devices : une commande par device (§ Deux devices).

```markdown
# Recette — [écran]
**Maquette :** … · **Build :** … · **Largeur :** …px [deux devices : desktop …px · mobile …px] · **État :** [l'état comparé, le même des deux côtés ; le barrage levé au relevé, s'il y en a eu un] · **Hors périmètre :** …
**[n] corrections** — [n] majeures, [n] mineures

## [Zone]

[Capture annotée](refs/annot-01-zone.png)

| # | Élément | Propriété | Attendu | Constaté | Preuve | Sév. |
|---|---------|-----------|---------|----------|--------|------|
| 1 | `#titre-page` <!--r:12--> | taille | 24px | 20px | mesuré | Majeur |

**Non apparié** — maquette sans build : … · build sans maquette : …
**Incertitudes** *(uniquement si une mesure a échoué)* — …
```

Deux devices : sous chaque zone, `### Desktop` puis `### Mobile`, chacune avec sa
capture et son tableau (le gabarit ci-dessus, une fois par device) ; le compte global
en tête (§ Deux devices). Chaque ligne se
lit seule : l'Élément s'écrit en entier, jamais « idem » — le dev ne lit pas le
tableau de haut en bas.

**Un composant remplacé est UNE ligne.** Quand le build remplace un composant de la
maquette par un autre (une liste déroulante par des boutons d'option, un bouton par une
case à cocher…), l'écart se dit en une seule ligne — composant attendu → composant constaté —,
et ce que le remplaçant ne porte plus (boutons, textes, indicateurs) se liste dans la
case Constaté, pas une ligne par élément absent. Une ligne par élément ferait d'un seul
problème une série de majeures, et le compte varierait d'une recette à l'autre sans
qu'un écart de plus existe. Un élément absent d'un composant par ailleurs conforme
garde sa propre ligne.

## Quand on n'a qu'une capture

`--image <capture.png>` recense les teintes réellement présentes, au pixel
exact : la couleur reste confrontable au catalogue de variables. Non
mesurables sans URL : police, taille, graisse, interligne. La géométrie ne
l'est pas non plus de façon fiable — la détection de frontières sur une image
rend des dizaines de fausses limites, et un relevé faux est pire qu'absent.
Dans ce mode, le rapport porte les écarts de couleur et de wording, tout ce que
le § Constat visuel admet — dont les assets, que l'empreinte ne peut plus
établir ici —, et DÉCLARE en tête que typographie et espacements n'ont pas été
recettés.

## Checklist de livraison (sur demande)

Sur demande, condenser les **motifs actifs** du registre en une **checklist
courte orientée dev** (« avant de livrer, vérifier que… »), en markdown
**partageable hors outil IA**. La régénérer quand le registre évolue.

## Règles transverses

- Attendu → constaté, toujours localisé par le repère du relevé.
- Une dérive se MESURE, ou se CONSTATE sur pièce quand elle échappe au relevé
  (§ Constat visuel). Une impression, elle, ne s'écrit dans aucun des deux cas.
- Un faux positif coûte la crédibilité du rapport entier : au doute entre
  dérive et rendu, § Ce qui n'est PAS une dérive tranche — on n'écrit rien.
- Français, direct, sans remplissage. Le livrable est une liste, pas un texte.

## Ce que ce skill NE fait PAS

- Ne critique pas les choix de design de la maquette (la maquette est la
  vérité ici, même discutable) → la critique amont, c'est `hydra-audit`.
- Ne fait pas de QA fonctionnelle : clics, formulaires, erreurs serveur.
- Ne fait pas d'audit d'accessibilité, même partiel — ni contraste, ni focus,
  ni lecteur d'écran : le périmètre est l'écart maquette ↔ build.
- Ne juge pas les données affichées par le build.
