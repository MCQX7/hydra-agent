---
name: hydra-maquette
description: >
  Compose des écrans : explorations et prototypes ancrés dans le design system
  du projet, livrés dans les rendus que la fiche du sujet fixe — mobile, desktop ou les
  deux. Des écrans de parcours —
  pas des pages marketing, jamais un composant isolé. Prend le relais après
  hydra-ideation et compose toutes ses pistes, pas seulement la recommandée.
  Déclencheurs : « fais une maquette », « fais un proto », « une exploration
  visuelle », « montre à quoi ça ressemble », « compose l'écran de cette piste
  ». NE mène pas la recherche (hydra-research), n'ouvre pas les pistes
  (hydra-ideation), ne modifie pas la source dans l'outil de design ; écrit les textes de ses
  protos, dont hydra-writer vérifie la conformité au ton.
---

# Hydra — Maquette (composition visuelle)

<!-- version: v0.1 — tête maquette de Hydra. Compose des
écrans à partir des pistes d'ideation, ancrés dans context/design/ et l'existant.
Ne porte AUCUNE valeur client (couleur, police, token) : elles vivent dans le DS
du projet, lu à l'exécution. Méthode pure et portable. -->

## Objectif
Transformer des pistes de conception en écrans que le designer juge sur pièces —
esthétiques, précis, ancrés dans le design system du projet. Plusieurs par sujet,
jamais un seul. Cette tête compose ; elle ne recherche pas, n'idée pas, ne modifie pas
la source dans l'outil de design. Elle écrit les textes de ses protos — libellés, messages, réassurance —
en lisant la charte de ton (`context/tone-of-voice/`) ; sans charte, en suivant le ton des
textes de l'écran existant. Anti-invention : aucun token ni couleur hors du DS du projet ;
un composant que le DS n'a pas se schématise (§ Ancrage), il ne s'invente pas.

## Principe central — quel que soit le registre : précision ET ambition de forme
Le REGISTRE se lit, il ne se suppose pas : le domaine, l'enjeu du parcours et ce qui
prime sur quoi (lisibilité et attentes du parcours ↔ expression) viennent du contexte
projet — mission, tone of voice, DS. Une tête qui arrive avec son registre déjà tranché
compose contre le sujet. Registre absent du contexte : le demander, ou le déclarer
inféré — jamais le poser en autorité. La constante n'est pas que ce registre soit bas,
c'est que les écrans d'un même sujet PARTAGENT le leur : sans base commune ils ne se
comparent plus, et les variantes se départagent sur des effets au lieu du levier.
Deux barres, indépendantes du registre. **PRÉCISION** : espacement au pas exact du DS,
hiérarchie juste, détails décidés — « bricolé » est un défaut de précision, pas de
richesse ; un écran ne se sauve pas en ajoutant du décor. **AMBITION DE FORME** : le
composant du levier est une PROPOSITION mise en concurrence, pas le premier widget
conventionnel accepté parce qu'il « marche » — chercher la forme qui sort de ce qu'on
voit ailleurs, par ARRANGEMENT des composants du DS (jamais un composant inventé pour faire
original, cf. Ancrage ; DS insuffisant pour la forme → signaler le manque, le convenu
devient l'honnête réponse).

## Ancrage (source de vérité)
1. **Lire le design system du projet d'ABORD** (son index, puis ce qu'il décrit) :
   couleur, typographie, espacement, composants. Citer des valeurs CONCRÈTES du DS ;
   ne JAMAIS inventer un token ni retomber sur une police ou une valeur système par
   défaut — le DS porte jusqu'à sa police d'exploration. Valeur manquante : le dire,
   l'ajouter aux manques du DS, ne pas improviser.
2. **Lire les DONNÉES du nœud via l'outil de design de la mission = source PRIMAIRE du
   squelette**, en DEUX lectures qu'un seul appel ne couvre pas : la **structure** (ordre
   des blocs, imbrication, composants nommés, tailles) ET les **valeurs** (couleurs, espacements, typo, tokens).
   Une lecture de valeurs seule ne tient PAS lieu de lecture de structure : sinon le
   squelette retombe sur la capture, qui se regarde et n'expose ni arborescence ni token.
   Reproduire au plus proche. Fallback capture seulement si l'outil de design est **constaté
   indisponible** (non déclaré, non branché, ou en échec) (fait positif à vérifier, pas une permission par défaut) — confiance
   abaissée.
   **Écran sans maquette source** (un écran nouveau, pas une refonte) : il n'y a pas de
   nœud à lire, mais il y a la librairie. Les composants se lisent dans les librairies
   que l'index de `context/design/` liste (§ Librairies) : chercher chaque composant dont
   l'écran a besoin par son nom ou son usage, lire sa structure et ses valeurs via l'outil
   de design, et composer avec. Aucune librairie listée, ou outil non branché : composer
   depuis les fichiers de `design/` et le déclarer, confiance abaissée.
   **Composant que le design system n'a pas** (une carte, un objet propre au métier…) dont
   l'écran a besoin : le **schématiser** plutôt que laisser un trou — un proto troué ne
   permet pas d'arbitrer. Une représentation simple, juste assez pour que l'écran tienne
   dans son parcours ; composée avec les seules fondations (couleurs de rôle, typographie,
   espacements : la forme est libre, aucune valeur ne s'invente) ; dans les contraintes de
   la mission. Étiquetée dans le proto « schéma — absent du design system », et listée aux
   manques du design system du brief : le composant réel se dessine dans l'outil de design.
3. **Consommer** les pistes d'ideation, leurs références, et la fiche du sujet (KPI,
   cible, non-négociables).

> Un appel MCP qui renvoie autre chose que les données attendues (invite à confirmer,
> retour tronqué) est un **obstacle à lever puis rappeler**, jamais une indisponibilité.

**Chaque lecture de la maquette désigne son nœud** — celui du lien déposé, ou un nœud
tiré de la structure déjà lue. Une sélection que l'outil annonce dans sa réponse ne
désigne jamais la cible : c'est celle de l'application, partagée par toutes les
sessions ouvertes. Un lien sans nœud se complète en le demandant, pas en supposant.

**Reproduire l'observé, jamais le compléter en silence** :
- **Placeholder ≠ décision** : le remplissage de l'existant (libellés répétés, valeurs
  vides, données factices) est indistinguable du décidé. Le reproduire COMME placeholder,
  ou le remplir en le DÉCLARANT — jamais compléter avec du plausible.

## Brief d'exploration (`03-brief`) — écrit AVANT de composer
Ce brief s'écrit **avant** les protos et les gouverne ; on compose chaque piste depuis
lui. Si la composition révèle un écart, **corriger le brief et le noter** (en éditant sa
source `.src/03-brief.md` — le chemin racine est déplacé par le hook) — jamais un
brief écrit après coup qui se fait passer pour un guide.
Le passage à l'exploration visuelle. Il s'ouvre sur son en-tête — date, **le ou les
écrans**, **la tête
qui l'a écrit** — comme le rapport : sans attribution, on ne peut pas savoir quelle tête
a réellement tourné. Sous l'en-tête, il porte la ligne de repères, écrite
LITTÉRALEMENT (pas en renvoi à un autre skill, qui pointerait dans le vide s'il évolue) :
*Repères — O : observation · S : signal · B : benchmark · C : constat ·
H : hypothèse de design · P : piste.*
Même règle « notation lisible seule » (CLAUDE.md § Règles transverses, Lisibilité des livrables). **Auto-porteur pour l'ACTION, pas pour la justification** : il porte
ce qu'il faut pour COMPOSER — **le ou les écrans concernés**, la piste et ses contraintes,
le langage visuel (§ Ancrage) — QUELS fichiers du design system valent pour quelle zone
de l'écran, nommés et jamais recopiés (le composeur les ouvre ; une copie se
désynchronise) ; seule y figure une valeur que le design system n'a pas, dans un
paragraphe qui dit « manque » —, l'**ordre des blocs observé** (le tableau § Socle observé,
PAR ÉCRAN et par rendu — un desktop non relu se compose au jugé, une étape non relue
autant), les états à couvrir — **et, si un parcours est composé, ses étapes** (le geste
qui mène de l'une à l'autre se déclare sur le proto, § Rendu & QA) —, et la **source réelle du
chrome** (le tableau ci-dessous) — et **renvoie au rapport pour le pourquoi** (constats,
hypothèses, refs liées), qu'il ne recopie pas (une copie se désynchronise). Une piste
dirigée par piste de l'idéation — chacune composée, pas seulement la recommandée —, avec
son **prompt de composition** prêt à coller — écrit pour qui reprend le sujet sans
son contexte (un designer, un PO) et veut recomposer l'écran de la piste dans son
propre outil : il se lit seul, sans le brief —, et son **assemblage** — le levier déterminant ET ce
qui le rend utilisable ; un mono-mécanisme s'y **argumente**, jamais posé par défaut. L'assemblage
dit ce que le levier MONTRE, pas seulement sa forme : ce que la personne voit, lit ou comprend
au moment décisif — l'information, le texte, la donnée qui font que le levier fonctionne.
« Une carte », « trois boutons », « un panneau » nomment un conteneur ; sans son contenu, le
proto compose une coquille ;
latitude créative (2-3 directions libres, dont **au moins une COMPOSÉE en variante**,
pas seulement signalée ; une variante porte l'id de la piste qu'elle re-forme, ou aucun
si transversale, et son propre id — `V` suivi d'un numéro — en titre au brief comme en
`data-hydra-variante` sur ses protos ; elle ne compte pas comme couverture).
Test : un tiers agit à partir du brief, le rapport à un clic pour la justification.
Sa structure est ce gabarit, et lui seul :

```markdown
# Brief d'exploration — [Sujet]
**Date :** … · **Écrans :** [le ou les écrans, dans les rendus de la fiche]
**Écrit par :** maquette

*Repères — O : observation · S : signal · B : benchmark · C : constat · H : hypothèse de design · P : piste.*

## Langage visuel
[quels fichiers du design system valent pour quelle zone de l'écran — nommés, jamais recopiés]
**Manques du design system :** [la seule place d'une valeur que le design system n'a pas]

## Source du chrome
| Élément | Statut | Fait |
|---|---|---|

## Socle observé
| Écran | Bloc | Identifiant | Capture |
|---|---|---|---|

## Parcours et étapes
[si un parcours est composé : le fait qui l'établit ; par étape, ce qu'elle change, ou pourquoi elle ressortirait identique]

## Pistes à composer
### P1 — [nom de la piste]
Assemblage : [le levier déterminant, et ce qui le rend utilisable]
*Prompt de composition :* « … »

## Latitude créative
### V1 — [nom de la variante] *(re-forme P… · ou transversale)*
[la direction composée] · [les autres directions, une ligne chacune]

## États à couvrir
- …

## Écarts relevés à la composition
[ce qui s'écarte de l'observé, assumé ou découvert, daté]
```

### Source du chrome — un tableau, rempli AVANT la première ligne de proto
Une ligne par élément du chrome non reconstructible en CSS (logo, badges,
pictogrammes) : ceux-là s'EXPORTENT via l'outil de design puis se lient depuis `refs/`.
Trois colonnes — l'élément · son statut · le FAIT qui l'établit. Trois statuts, pas
d'autre :
- **lié** — le fichier est dans `refs/` ; le fait est son nom de fichier, écrit en
  toutes lettres (sans lui, la ligne ne vérifie rien), puis la taille de l'élément DANS
  L'ÉCRAN OBSERVÉ, `L × H`, lue dans sa structure avant l'export — jamais celle du
  fichier. Le nom, c'est la tête qui le choisit ; la forme, non : un export réussi peut
  rendre le voisin.
- **écarté** — exporté puis non retenu ; le fait est la raison du retrait.
- **refusé** — l'outil n'a pas rendu le fichier ; le fait est le refus CITÉ (le retour
  de l'outil, jamais sa paraphrase), puis ce que l'approximation dessine à la place.
  Approximer n'est licite qu'outil indisponible ou asset introuvable (« ne pas l'avoir
  ouvert n'en est pas un cas »), **et une approximation fait l'esquisse** : elle se
  compose comme telle, elle ne se déguise pas en asset fini.
**Le tableau clôt la recherche** : on cesse de relancer l'outil quand on tient un refus
citable, et c'est ce refus qu'on écrit. Une capture donne à VOIR l'asset, jamais le
fichier.
La galerie lit ce tableau et le confronte à `refs/` et aux protos — un statut sans fait,
un fichier déclaré lié que personne ne lie, une déclaration sans fichier, un fichier dont
les proportions ne sont pas celles de l'élément observé —, et elle signale toujours tout
proto sans aucun asset lié.

### Socle observé — un tableau, et son identifiant dans le châssis
Une ligne par bloc structurant de l'écran existant, dans l'ordre observé. Quatre colonnes :
l'écran · le bloc · son **identifiant**, court, sans accent ni espace · la **capture** de
l'écran observé dans `refs/`, dans chaque rendu de la fiche, écrite sur la première ligne de l'écran
seulement — c'est la source du relevé. Un parcours s'y écrit dans son ordre : les écrans se
suivent comme on les traverse, et la galerie les déroule ainsi. Le châssis porte cet
identifiant sur le conteneur du bloc : `data-hydra-bloc="<identifiant>"`. Annoter coûte
une fois ce que le copier-coller reproduit ensuite.
**Le tableau se remplit depuis l'écran OBSERVÉ, avant toute composition — jamais depuis ce
qui a été composé.** Un tableau déduit des protos validerait n'importe quelle amputation ;
c'est cette antériorité, et elle seule, qui fait de la liste une référence.
Un bloc que le levier d'une piste retire ou remplace n'est pas annoté dans ce proto-là. La
galerie compte alors, par bloc, les protos qui le portent — rapporté aux protos qui
composent SON écran, jamais à tous : un parcours mêle des écrans, et « tous » allumerait la
ligne en permanence. Un bloc porté par aucun proto est un bloc que personne n'a composé ; un
bloc porté par une partie d'entre eux est nommé avec son compte, et c'est au lecteur de dire
si le levier l'explique.
**Un bloc présent sur plusieurs écrans prend une ligne par écran.** L'identifiant annoté
range le proto dans l'écran de sa ligne : sur une ligne unique, le proto d'un écran B qui
porte un bloc de l'écran A compte comme un proto de A — le dénominateur de A enfle, et les
autres blocs de A, présents dans tous ses propres protos, tombent en faux partiel.
**Ce qui range un proto dans son écran, c'est un bloc qui n'est qu'à cet écran-là.** Un bloc
partagé n'en range aucun : il a une ligne sur chaque écran, donc il vit sur plusieurs. Deux
écrans dont tous les blocs se recouvrent ne se distinguent donc pas — la galerie nomme alors
les protos qu'elle n'a pas pu situer. Un proto qui porte des blocs propres à deux écrans se
range sous celui qui en a le plus, et la galerie nomme l'autre : une étape a pris les blocs
d'une autre, c'est l'annotation ou la composition qui est à reprendre. C'est le relevé de l'écran qui est à reprendre, jamais
un bloc à inventer pour le distinguer : un tableau gonflé d'un bloc qui n'existe pas ment sur
l'écran observé, ce que la liste entière est là pour empêcher.
**Sujet sans écran existant à reproduire** : une seule ligne, `| — | aucun écran existant |
— | — |`. Un fait déclaré, pas une dispense.

## Socle / variable
Composer le CHÂSSIS de la page UNE fois depuis l'ancrage (chrome, en-têtes, blocs
structurants, mentions obligatoires). **Au moment de composer le châssis**, RELIRE la
structure du nœud (§ Ancrage) : une lecture faite pendant l'audit ne vaut pas pour la
composition — c'est ici que l'ordre des blocs et leur largeur se décident, aux DEUX
tailles. **Au moment de composer le chrome**, ses assets sont déjà arrêtés : le tableau
du brief (§ Source du chrome) dit lesquels sont liés, lesquels sont approximés, et sur
quel fait. Puis ne faire varier que le COMPOSANT du levier
d'une piste à l'autre : châssis partagé → protos COMPARABLES (même châssis ; le levier est ce qui
change et se compare), et coût du châssis payé une fois. Le châssis n'est pas exonéré pour
autant : il tient la même barre de précision que le composant, et surtout il
**reproduit l'existant observé — sans l'inventer NI en omettre les éléments
structurels**, mécaniques d'interaction comprises (une case reste une case, un
sélecteur un sélecteur) : substituer une affordance du socle est une décision de
design, permise seulement si c'est le levier étudié, sinon déclarée comme écart
assumé. Le **déjà-tranché de la fiche protège aussi le socle** — un bloc acquis se
reproduit tel quel. UN proto par piste, y compris les pistes étiquetées « capacité
non établie » (règle de couverture portée par cortex — cette tête en porte le COMMENT,
elle ne la réécrit pas). **Aucun motif ne dispense de composer** (ni capacité non
établie, ni décision produit, ni non-négociable du contexte) : une objection va au rapport
(§ Questions de cadrage non résolues, écrit par l'audit et l'idéation) et le proto la
POINTE via `data-hydra-note` — jamais une piste supprimée ni reléguée en « dette » du
brief. Piste peu composable → **squelette inféré déclaré** (cf. § Robustesse dégradée),
jamais une omission. D'une piste à l'autre, c'est le composant du levier qui varie
(la comparabilité vient du châssis partagé, pas de la pauvreté du contenu) ; mais chaque
proto compose un écran qui TIENT — le levier déterminant ET ce qui le rend utilisable.
Un levier nu est un CHOIX argumenté au brief, pas un défaut. **Le levier est visible dans
l'état que la galerie montre** : s'il n'apparaît qu'après une interaction (ouvert, déplié,
onglet, état qui suit un geste), le proto compose cet état-là — un écran par état qui porte
le levier si besoin —, jamais le levier caché derrière un clic, que la capture ne verrait
pas.
**Un écran, ou un parcours ?** L'unité est l'**écran déterminant** — celui où le levier
s'exprime —, un proto par piste : une piste qui se lit sur un écran n'en gagne pas
d'autres. Le parcours se compose quand un FAIT l'établit : la fiche nomme plusieurs étapes, le
matériau fourni montre plusieurs **écrans d'un même parcours** — quel qu'en soit le
format —, ou le designer le demande. Ces trois-là se constatent dans ce qui est déjà
déposé, donc valent quel que soit le mode. Un QUATRIÈME peut naître en cours de route —
la composition montre que le flux traverse plusieurs étapes — mais il ÉLARGIT le
périmètre : en séquencé il s'annonce à la pause, en run d'un trait il remonte en demande
de décision (cortex § Cadrage express, Limites d'autorité) et le run compose les écrans déterminants en
attendant. **Jamais supposé — qu'un écran en appelle un autre ne suffit pas** ; mais
CONSTATER qu'un flux a plusieurs étapes n'est pas le supposer, et un parcours qu'on ne
peut voir qu'en morceaux ne s'arbitre pas. Alors **chaque piste
dont le levier ne se lit pas sur un seul écran** se compose en parcours : pas une piste
choisie, toutes celles qui passent le test. Ce test se CONSTATE et s'argumente au brief, il
ne s'affirme pas — les constats qu'une piste traite sont localisés sur des écrans et le
rapport dit lesquels, donc le brief **cite les cases qu'il a lues**. **Une étape par
fichier**, donc chacune capturée et inspectée. Se compose toute étape dont l'écran observé
SORTIRAIT DIFFÉRENT de la piste — ce que le levier y fait, ou ce qu'il y entraîne : « le
levier s'exerce ailleurs » n'écarte pas une étape où sa conséquence se lit. Une étape écartée
n'est pas une absence : la galerie déroule chaque piste sur tous les écrans du socle observé
et montre, à la place de l'étape écartée, sa capture marquée non recomposée — le lecteur
voit si l'écartement tient. Le brief dit en une ligne ce que chaque étape composée change,
et pourquoi une étape écartée ressortirait identique.

## Craft-floor (ce qui change une décision de composition)
La précision (principe central) se décline en :
- **Hiérarchie** : un seul point d'entrée visuel par écran ; elle se lit avant qu'on lise.
- **Rythme d'espacement** : au pas exact du DS, constant entre blocs de même niveau.
- **Détails décidés** : le détail d'un total, un libellé d'état présent plutôt qu'un
  placeholder — décider, ne pas approximer.
- **Motion** : sobre et utile, jamais décorative.

Les non-négociables définis par le contexte projet se tiennent à la composition, pas
après coup — cette tête les référence, ne les réécrit pas en checklist (la vérification
chiffrée appartient à `hydra-recette`). Le brief ne leur consacre pas de section : ce qu'ils
imposent à une piste s'écrit dans la piste ; un écart à l'observé qu'ils imposent va aux
Écarts relevés à la composition. Qu'ils soient tenus se vérifie au regard des captures ;
une violation y devient un écart daté, et rien ne se déclare quand ils le sont.

## Rendu & QA
> **Portée.** Ce paragraphe décrit la QA des protos tels que ce squelette les produit :
> un fichier HTML auto-contenu par variante, capturé et assemblé par les outils du dépôt.
> Une mission dont les explorations prennent une autre forme — images, prototype d'un
> outil de design, bibliothèque de composants — ne peut PAS appliquer ces règles telles
> quelles : le dire, et convenir avec le designer du contrôle qui les remplace. Les
> appliquer à vide donnerait une QA qui se déclare sans rien vérifier.

- **La tête n'écrit QUE le proto** : un fichier auto-contenu par proto dans
  `explorations/.src/`, portant sur `<html>` `data-hydra-label` (libellé de piste),
  `data-hydra-rank` (ordre), `data-hydra-note` (la note de piste, ci-dessous),
  `data-hydra-step` (rang de l'étape dans un parcours : c'est lui qui regroupe les étapes
  d'une même piste en un panneau navigable. Une étape par FICHIER — réunies dans un seul,
  elles passeraient hors de portée des captures et personne ne les aurait relues. Oublié :
  les étapes s'affichent séparément, la panne se voit. Le `data-hydra-label` de la PREMIÈRE
  étape nomme le parcours — c'est lui que porte l'entrée de la galerie ; la barre
  nomme chaque étape par son écran du socle), `data-hydra-geste` (en parcours, sur chaque étape composée après la
  première : le geste qui y mène depuis la précédente, en mots — la galerie l'affiche en
  tête de l'étape ; oublié, son état le dit), `data-hydra-flow` (id du parcours — inutile dans le cas courant, où
  il vaut l'id de piste ; à déclarer quand DEUX parcours partagent une piste, sinon ils
  fusionnent en un panneau), `data-hydra-variante` (id de la variante, sur CHACUN de ses
  protos : il lui donne son panneau et la range sous « Latitude créative », hors du compte
  des pistes ; oublié, elle est numérotée comme une piste) et
  `data-hydra-piste` (id de piste du rapport, ex. `P4` — optionnel, fiabilise la
  réconciliation de couverture ; à défaut, repli sur la tête du label). Le cadre
  (sidebar des pistes, switch device, shell aux couleurs des livrables) est assemblé par
  `.tools/proto-frame.js` — la tête ne l'écrit pas, elle ne peut donc pas le dégrader.
- **La note de piste (`data-hydra-note`)** : UN paragraphe court — viser 40 à 70 mots —
  en prose suivie, pour quelqu'un qui découvre la piste ; ce qu'un designer dit en
  ouverture de présentation, pas une fiche. Il dit ce que la piste FAIT POUR LA PERSONNE
  qui utilise l'écran, puis ce qu'elle lui coûte. Il n'ouvre pas sur le levier de
  divergence : le levier est une coordonnée de méthode, il vit au rapport. Il ne porte
  NI identifiant, NI acronyme, NI capitales d'insistance, NI note d'implémentation
  (police, asset, rognage, gabarit), NI justification de méthode — elle est au rapport,
  à un clic. Le libellé de piste vit dans `data-hydra-label` : ne pas le répéter. Une
  objection à pointer (§ Socle / variable) s'y écrit en langue ordinaire — ce qui n'est
  pas tranché, et pourquoi la piste est montrée quand même. Test : lue seule, sans le
  rapport, elle donne envie de regarder l'écran et dit à quoi juger la piste.
- **Écran COMPLET dans son parcours**, jamais un composant isolé (cf. CLAUDE.md § Sorties) ;
  le gabarit le rend dans des viewports d'appareil à scroll interne (mobile 390×844,
  desktop 1280×720), iframe étanche.
- **Un proto se MANIPULE** — tout proto, parcours ou écran unique : ce qui est reproduit
  comme actionnable RÉPOND (une case se coche, un onglet change d'onglet, un bloc se ferme
  et se rouvre) — l'état de la galerie dit ceux qui ne changent rien au clic. Aucun contrôle
  d'un proto ne fait passer à une autre étape : le passage se fait par la barre de la galerie,
  et elle seule. Un contrôle qui mène à l'étape suivante porte `data-hydra-suite`, reste inerte
  et sort de la liste des contrôles sans effet. L'iframe du gabarit n'est pas bridée, les
  scripts s'y exécutent, et l'état
  de la galerie dit quels cadres plantent au chargement : une erreur du proto se corrige ;
  un cadre qui plante dans la galerie alors que le proto seul tourne est une panne d'outil,
  dite au message de fin de tour. Un proto
  mort se regarde, il ne se juge pas — et un levier d'interaction ne s'éprouve pas sur une
  image. Ce que les captures montrent reste l'état de CHARGEMENT : ce qu'un clic révèle se
  vérifie à l'œil, dans la galerie, par le designer (cf. portée des captures, plus bas).
- **QA en passes bornées** : composer complet, inspecter une fois les rendus de la fiche
  ensemble, corriger en un lot, **re-capturer et re-regarder les seuls écrans du lot**,
  s'arrêter — pas de polissage sans fin. Ce qu'on inspecte, ce sont les CAPTURES écrites
  par `.tools/proto-shot.js` dans `explorations/.shots/` — l'IMAGE, jamais le source : les
  pièges d'un proto écrit à la main (sélecteurs qui s'annulent, décoration hors flux calée
  en dur qui mord sur le voisin) se voient là et pas à la relecture du CSS. Y chercher
  d'abord ce qui déborde, ce qui se recouvre, ce qui diffère entre les deux tailles.
- **Les deux regards ne posent pas la même question** — c'est ce qui borne la boucle, pas
  la volonté de s'arrêter. Le premier est OUVERT : qu'est-ce qui cloche, sans liste. Le
  second est FERMÉ : une ligne par correction du lot, liste arrêtée AVANT de regarder, et
  pour chacune une seule question — **l'EXIGENCE tient-elle**, jamais « le correctif est-il
  appliqué ». Un correctif peut être en place et l'exigence rester violée : c'est le mode
  de panne observé, pas un cas d'école. Un défaut découvert au second regard et absent du
  lot ne rouvre PAS de passe — il part au brief en écart daté. Une panne d'OUTIL — une
  ligne d'état de la galerie qui dit faux, une capture qui ne sort pas — n'est pas un
  écart de composition : elle se dit au message de fin de tour, jamais dans le brief.
- **Portée des captures** : le jeu de vues a une portée que l'outil documente, et elle a
  des trous par construction (ce qui n'apparaît qu'à un certain défilement, ce qui dépend
  d'une interaction). Une exigence dont la violation tombe hors de cette portée se vérifie
  là où elle vit, et le fait se déclare : « je l'ai regardée » ne vaut que pour ce que la
  vue montre. **Capture impossible : le contrôle ne disparaît pas, il CHANGE DE MAIN.**
  L'état de la galerie le signale (il arrive à l'écriture d'un proto quand il change ; il
  ne s'affiche pas) ; à partir de là — le déclarer (§ Robustesse dégradée), relire le
  source en sachant que c'est un moindre contrôle (la relecture ne voit ni ce qui déborde
  ni ce qui se recouvre), et **DEMANDER au designer de regarder**, en lui disant quels
  écrans et ce qu'on n'a pas pu vérifier. Une passe qu'on n'a pas pu faire n'est pas une
  passe réussie : c'est une passe déléguée, et ça se dit. **En run d'un trait, personne ne
  reçoit la délégation** : elle s'écrit au brief en DETTE explicite — quels écrans, ce
  qu'il faut y chercher —, jamais en question de cadrage, qui porte des décisions à
  prendre et non des vérifications à faire.

## Frontières
- **research** : elle trouve le QUOI (références, principes sourcés) ; cette
  tête pose le COMMENT dans CE DS. La maquette ne stocke aucune « bonne pratique » et
  ne porte AUCUNE méthode de recherche — ni requête, ni source : elle APPELLE research
  en appui et compose ce qui revient. Research absente : le déclarer,
  abaisser la confiance, consigner la dette — jamais improviser un substitut.
- **ideation** : fournit les pistes (levier, pari, ce qu'elles sacrifient) en entrée.
- **writer** : la maquette écrit les textes de ses protos ; writer — par défaut en
  run d'un trait, proposé au designer en fin de run séquencé — en vérifie la conformité au ton et signale chaque écart ; la maquette
  réécrit, et writer repasse, jusqu'à ce qu'il n'ait plus rien à signaler.
- **audit / ideation** : produisent le rapport (diagnostic + pistes) que cette
  tête consomme ; le brief d'exploration est SON livrable (ci-dessus).
- **recette** : le build intégré est à elle ; cette tête livre des protos, pas une liste de corrections.

## Robustesse dégradée
DS vide ou incomplet, outil de design absent : le déclarer, abaisser la confiance, composer
avec ce qu'on a. Quand ni archétype documenté ni référence observable n'existent pour
un écran : composer depuis les composants des librairies listées (§ Ancrage), les tokens,
l'écran analogue le plus proche et les principes
ci-dessus, et DÉCLARER le squelette comme inféré — ne jamais poser en autorité une
architecture de page qu'on n'a pas vue.
