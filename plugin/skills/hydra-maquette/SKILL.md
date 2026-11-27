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
Deux barres, indépendantes du registre. **PRÉCISION** : l'exigence de rendu (§ Exigence de
rendu) tenue sur chaque écran — « bricolé » est un défaut de précision, pas de richesse ; un
écran ne se sauve pas en ajoutant du décor, il se raffine en retirant. La barre n'est pas
l'écran existant : c'est le niveau d'exécution des apps en production du même type d'écran,
que les références du sujet donnent à voir (§ Juger contre les références) — en régime
reproduire, pour ce qui est composé (§ Socle / variable). **AMBITION DE FORME** :
chaque piste est une PROPOSITION mise en concurrence, pas le premier widget conventionnel
accepté parce qu'il « marche ». L'ambition se loge là où le régime du sujet l'autorise
(§ Régime de composition) : dans le composant du levier quand on reproduit un existant, dans
la structure, le nombre d'écrans et le point d'entrée quand on explore. Une convention de
plateforme bien exécutée n'est pas un manque d'ambition ; une rupture mal exécutée n'est pas
une divergence, c'est un brouillon. Jamais un composant inventé pour faire original
(cf. Ancrage) ; DS insuffisant pour la forme → signaler le manque, le convenu devient
l'honnête réponse.

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
   Reproduire au plus proche — en régime reproduire ; en régime explorer, la lecture donne
   les valeurs et ce que l'existant porte, pas la structure des pistes (§ Régime de composition). Fallback capture seulement si l'outil de design est **constaté
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
   la mission ; au niveau du reste de l'écran (§ Exigence de rendu) — un schéma est une
   forme simple, pas une forme bâclée. Il se signale HORS de l'écran : attribut
   `data-hydra-schema` sur son conteneur, et ligne aux manques du design system du brief ;
   jamais une étiquette dessinée dans la composition, qui ferait partie de ce qu'on juge.
   Le composant réel se dessine dans l'outil de design.
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

## Régime de composition — reproduire ou explorer
La fiche du sujet fixe le régime (champ « Composition », cortex § Cadrage express). Les deux
régimes tiennent la même exigence de rendu et se jugent contre les mêmes références ; ils
diffèrent par ce qui est fixe d'une piste à l'autre.
- **Reproduire** — retouche ou refonte d'un écran existant, dont la structure est acquise.
  Le châssis reproduit l'existant observé et il est commun à toutes les pistes ; seul le
  composant du levier varie (§ Socle / variable). Rien de ce que dit cette section ne change
  ce régime.
- **Explorer** — parcours ou composant nouveau, ou carte blanche sur l'interface. Seuls sont
  fixes ce que la fiche et la mission imposent (chrome de la plateforme, mentions
  obligatoires, fondations du design system). Chaque piste compose SA structure : l'ordre des
  blocs, le nombre d'écrans, le point d'entrée du parcours suivent son principe — trois
  pistes qui gardent la structure de l'existant ne sont qu'une piste en trois habillages. L'existant
  se lit toujours (§ Ancrage) et son socle observé se relève au brief : c'est ce qui dit ce que
  chaque piste garde, déplace ou retire, pas un plan à suivre. Le kit en code reste la règle
  pour ce qui est fixe — fondations, chrome, mentions obligatoires, composants du design
  system tels quels —, et chaque piste assemble les siennes. Ce qui porte la piste — son point
  focal, l'objet qu'on manipule, ce qu'elle compose de neuf — s'écrit dans la piste, pas en
  pièce partagée par défaut : une pièce commune donne à toutes les pistes la même forme au
  même endroit sans qu'on l'ait choisi. Varier ne veut pas dire inventer : placement,
  alignement, échelle, traitement suffisent souvent. Quand la même forme se justifie — la
  convention du type d'écran, rien de mieux pour ce principe —, elle se garde et le brief le
  dit en une ligne.
- **Régime absent de la fiche** : reproduire si le sujet part d'un écran existant à retoucher,
  explorer sinon — et le déclarer au brief en une ligne, jamais le supposer en silence. Une
  demande du designer qui dit « carte blanche », « nouveau parcours », « ose » vaut explorer.

## Juger contre les références
Les captures d'apps en production que la recherche a rangées dans `refs/` (le benchmark du
sujet) sont la barre d'exécution. Elles **jugent** le rendu ; elles ne fournissent **jamais**
la forme — emprunter la forme d'une référence remplace « la première forme qui vient » par
« la première forme trouvée chez quelqu'un d'autre ».
- **Avant de composer** : rouvrir les références du même type d'écran que celui qu'on compose
  (saisie, liste, confirmation, détail…) et écrire au brief, § Niveau visé, ce qui fait leur
  niveau — des propriétés, pas des formes : échelle et graisses de la typographie, rapport des
  espacements, densité, place et poids de l'action principale, dose de couleur, traitement des
  surfaces. Aucune référence du type d'écran dans `refs/` : appeler la recherche en appui pour
  en trouver, avant de composer — jamais composer sans barre.
- **Après composition** : poser chaque écran à côté de ces références, à la même largeur
  (planche : `node ${CLAUDE_PLUGIN_ROOT}/.tools/proto-planche.js <sujet> <proto> <référence>…`), et se demander
  laquelle est la sienne. Ce qui la trahit — pas son contenu, pas son parti pris : son
  exécution — est la liste des défauts à corriger.
- **Garde anti-copie** : si l'on peut nommer l'app de référence en regardant la piste, ou si
  la piste ne pouvait pas exister sans elle, c'est une copie — elle se recompose.

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
**Protos après relecture** (champ « Protos » de la fiche) : écrire le brief en entier —
socle observé et source du chrome compris, relevés comme avant toute composition —, le
rendre, et s'arrêter : aucun proto. L'en-tête porte « **Protos :** non composés — en
attente de la relecture du designer ». À la reprise, repartir de ce brief, de la fiche et
du rapport, sans refaire ce qu'il porte déjà ; relire l'outil de design seulement pour ce
que le brief ne donne pas ; passer le champ à « composés », puis composer comme d'habitude.
Sa structure est ce gabarit, et lui seul :

```markdown
# Brief d'exploration — [Sujet]
**Date :** … · **Écrans :** [le ou les écrans, dans les rendus de la fiche] · **Protos :** [composés / non composés — en attente de la relecture du designer]
**Écrit par :** maquette

*Repères — O : observation · S : signal · B : benchmark · C : constat · H : hypothèse de design · P : piste.*

## Langage visuel
[quels fichiers du design system valent pour quelle zone de l'écran — nommés, jamais recopiés]
**Manques du design system :** [la seule place d'une valeur que le design system n'a pas]

## Niveau visé
[les références du même type d'écran, liées depuis `refs/`, et ce qui fait leur niveau — des propriétés, jamais des formes (§ Juger contre les références)]

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
Structure : [régime explorer — ce que la piste garde, déplace ou retire de l'existant, son nombre d'écrans, son point d'entrée ; en régime reproduire : « châssis commun »]
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
*En anglais (CLAUDE.md § Sorties, Langue), ce gabarit prend ces formes et aucune autre — les contrôles les lisent :* Brief d'exploration → Exploration brief · Écrans → Screens · composés → composed · non composés — en attente de la relecture du designer → not composed — awaiting the designer's review · Écrit par → Written by · Repères → Key · Langage visuel → Visual language · Manques du design system → Design system gaps · Niveau visé → Target level · Source du chrome → Chrome source · Élément → Element · Statut → Status · Fait → Evidence · lié → linked · écarté → discarded · refusé → refused · Socle observé → Observed base · Écran → Screen · Bloc → Block · Identifiant → Identifier · aucun écran existant → no existing screen · Parcours et étapes → Journey and steps · Pistes à composer → Options to compose · Structure → Structure · châssis commun → shared frame · Assemblage → Assembly · Prompt de composition → Composition prompt · Latitude créative → Creative latitude · re-forme P… → reshapes P… · transversale → cross-cutting · États à couvrir → States to cover · Écarts relevés à la composition → Gaps found while composing. Restent tels quels : Date, Protos, Capture, et les identifiants. Les textes des protos, eux, suivent la langue du produit.

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
*Le châssis commun décrit ici est celui du régime reproduire. En régime explorer, les
étapes 1 à 3 valent pour les pièces partagées (chrome, fondations, composants), chaque piste
assemble sa propre structure (§ Régime de composition), et « Un écran, ou un parcours ? » se
tranche piste par piste : le nombre d'écrans d'une piste suit son principe. Le reste — un
proto par piste, aucun motif ne dispense de composer, le levier visible dans l'état montré —
vaut dans les deux régimes.*
Composer le CHÂSSIS de la page UNE fois depuis l'ancrage (chrome, en-têtes, blocs
structurants, mentions obligatoires). **Au moment de composer le châssis**, RELIRE la
structure du nœud (§ Ancrage) : une lecture faite pendant l'audit ne vaut pas pour la
composition — c'est ici que l'ordre des blocs et leur largeur se décident, aux DEUX
tailles. **Au moment de composer le chrome**, ses assets sont déjà arrêtés : le tableau
du brief (§ Source du chrome) dit lesquels sont liés, lesquels sont approximés, et sur
quel fait.
**Le châssis se construit ainsi — c'est ce qui rend un proto aussi fidèle qu'un écran de
production :**
1. **Lire le code de CHAQUE écran du socle**, tous les écrans observés et non un
   échantillon : la lecture de l'outil de design qui renvoie l'écran en code (HTML et
   CSS, structure et valeurs), en plus de sa capture. Ce code, recoupé avec le design
   system de `context/design/`, donne les tailles, les marges, les couleurs et l'ordre
   exacts ; la capture seule laisse deviner.
2. **Écrire le châssis comme un kit en code** : une pièce par bloc du socle observé (le
   tableau du brief), réutilisable et paramétrable — le chrome, chaque bloc structurant,
   les mentions —, avec les valeurs exactes. Puis **assembler chaque proto à partir de ce
   kit**, par un script qui les génère tous : jamais un proto recopié à la main d'un
   autre, qui dériverait. Le kit et son script vivent dans le sujet,
   `explorations/.build/` — ils servent à la reprise et à la correction —, jamais dans
   `context/` : chaque sujet construit le sien.
3. **Boucler sur les captures** : capturer chaque proto en pleine hauteur, dans chaque
   rendu ; les regarder toutes ; corriger d'un lot, dans le kit quand le défaut est du
   socle — la correction vaut alors pour toutes les pistes —, régénérer, recapturer,
   jusqu'à ce qu'aucune capture ne montre d'écart à l'écran observé. Le châssis
   s'arrête à zéro écart : la fidélité prime. L'exigence de rendu (§ Exigence de rendu)
   porte sur ce que le proto compose — le composant du levier ; un écart du châssis
   reproduit à cette exigence se note au brief (Écarts relevés à la composition), il ne se
   corrige pas.
Écran nouveau, sans écran existant : le kit se construit de même, à partir des
composants des librairies, lus en code dans l'outil de design.
Puis ne faire varier que le COMPOSANT du levier
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
n'est pas une absence : en régime reproduire, la galerie déroule chaque piste sur tous les écrans du socle observé
et montre, à la place de l'étape écartée, sa capture marquée non recomposée — le lecteur
voit si l'écartement tient. Le brief dit en une ligne ce que chaque étape composée change,
et pourquoi une étape écartée ressortirait identique.

## Exigence de rendu (ce qui change une décision de composition)
La précision (principe central) se juge sur l'image, écran par écran. Les valeurs viennent
du design system ; reste à les COMBINER pour qu'un écran ait le niveau d'une app en
production. **Le traitement d'un élément découle de son importance** — dans l'écran et dans
le parcours : on décide d'abord ce qui compte, à chaque écran et d'un écran à l'autre, puis
sa taille, sa graisse, sa couleur, l'espace qui l'entoure, sa place et sa surface en
découlent, ensemble. Les points qui suivent sont des façons de vérifier ce principe sur
l'image, pas une liste à dérouler : un écran les tient tous sans qu'on les ait appliqués un
à un. Aucun nombre ici n'est une valeur à copier.
- **Typographie** : une échelle courte, un rôle par taille. Le contraste se fait d'abord par
  la graisse et par le niveau de gris du texte, ensuite par la taille. **Grand n'est pas
  lourd** : l'élément qui domine monte, les autres descendent — jamais toute l'échelle en
  gras. Interligne serré et approche légèrement resserrée sur les titres, plus
  ouverts sur le texte courant ; chiffres tabulaires là où des montants se comparent.
- **Rythme** : l'espace entre deux groupes est nettement plus grand que l'espace à
  l'intérieur d'un groupe ; c'est ce rapport qui fait lire la structure, sans cadre. Un seul
  espacement partout est un défaut au même titre qu'un espacement au hasard. Une gouttière
  latérale unique, des bords gauches alignés, pas de boîte dans une boîte.
- **Hiérarchie** : un point focal et une seule action principale par écran ; elle se lit
  écran réduit, avant qu'on lise. On fait ressortir en affaiblissant le reste, pas en
  ajoutant un badge, une pastille, une couleur ou une ombre. L'action principale pèse assez
  pour clore la hiérarchie qu'elle termine.
- **Composition verticale** : la séquence de la plateforme du rendu (sur mobile : barre d'état, navigation,
  contenu, action, zone sûre). Le contenu se compose dans la hauteur de l'écran : un écran
  court ne finit pas sur un vide entre le contenu et l'action — on regroupe, on centre ou on
  ancre, on ne laisse pas tomber.
- **Densité** : celle d'une app livrée du même type d'écran (§ Juger contre les références) —
  ni trois blocs géants sur un écran vide, ni un entassement.
- **Couleur et surfaces** : l'accent va à l'action principale et à l'état actif, rarement
  ailleurs ; les neutres font le reste. Les surfaces se distinguent par la luminosité ; une
  ombre est réservée à ce qui flotte ; jamais bordure et ombre ensemble.
- **États** : un état (saisi, erreur, limite, vide, confirmé) change une partie de l'écran,
  il ne le recompose pas — l'objet qui porte la piste garde sa forme d'un état à l'autre.
- **Détails** : peu de rayons, hiérarchisés (le rayon d'un élément imbriqué est plus petit
  que celui de son conteneur) ; un seul jeu d'icônes, une taille par rôle ; les assets à
  leur taille, jamais étirés ; un texte factice garde l'apparence d'un vrai (le « 0 » et le
  « € » d'un montant vide ont le même traitement) ; rien de la méthode n'est dessiné dans
  l'écran. Le test : un développeur pourrait-il intégrer l'écran sans poser de question ?
- **Les marques du généré** — à chercher sur chaque capture ; chacune est un défaut :
  espacement identique partout ; tout en gras ou tout en grand ; plusieurs boutons pleins ;
  chaque groupe dans sa carte ; badges et pastilles sur chaque élément ; accent sur les
  titres et les icônes ; ombre sous chaque carte ; tout centré ; page qui finit sur du vide ;
  rayons égaux partout ou très grands ; texte de remplissage.
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
  `${CLAUDE_PLUGIN_ROOT}/.tools/proto-frame.js` — la tête ne l'écrit pas, elle ne peut donc pas le dégrader.
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
- **QA en passes bornées** : composer complet, inspecter une fois TOUS les écrans de
  toutes les pistes, dans les rendus de la fiche, corriger en un lot, **re-capturer et re-regarder les seuls écrans du lot**,
  s'arrêter — pas de polissage sans fin. Ce qu'on inspecte, ce sont les CAPTURES écrites
  par `${CLAUDE_PLUGIN_ROOT}/.tools/proto-shot.js` dans `explorations/.shots/` — l'IMAGE, jamais le source : les
  pièges d'un proto écrit à la main (sélecteurs qui s'annulent, décoration hors flux calée
  en dur qui mord sur le voisin) se voient là et pas à la relecture du CSS. Y chercher
  les pannes — ce qui déborde, ce qui se recouvre, ce qui diffère entre les deux tailles —
  ET le niveau : l'exigence de rendu, écran par écran, et la planche contre les références
  (§ Juger contre les références). Chaque capture se lit deux fois : **à sa taille de capture**,
  une par une (rythme, poids, alignements, détails — une vignette ou une planche réduite ne
  voit ni un espacement ni une graisse), puis **en vue d'ensemble**, dans la planche ou la
  galerie (point focal, masses, taches d'accent, niveau égal entre les pistes ; en régime
  explorer, des pistes dont le point focal a la même forme au même endroit se ressemblent à
  l'œil, quoi que dise leur texte : la forme se varie, ou le brief dit pourquoi elle se garde). Toutes les pistes sortent au même niveau
  d'exécution : une piste moins finie qu'une autre perd la comparaison pour une mauvaise
  raison.
- **Les deux regards ne posent pas la même question** — c'est ce qui borne la boucle, pas
  la volonté de s'arrêter. Le premier est OUVERT : qu'est-ce qui cloche, sans liste
  arrêtée d'avance — mais il REND une liste : chaque défaut nommé et localisé (écran,
  élément, ce qui ne tient pas) ; « rien à signaler » sans liste n'est pas un regard. Le
  second est FERMÉ : une ligne par correction du lot, liste arrêtée AVANT de regarder, et
  pour chacune une seule question — **l'EXIGENCE tient-elle**, jamais « le correctif est-il
  appliqué ». Un correctif peut être en place et l'exigence rester violée : c'est le mode
  de panne observé, pas un cas d'école. Un défaut découvert au second regard et absent du
  lot ne rouvre PAS de passe — il part au brief en écart daté. Seule exception, une PANNE
  visible — ce qui se recouvre, déborde ou se coupe, et qu'un écran livré ne peut pas
  porter : elle se corrige sur place, puis seuls ses écrans se re-capturent et se
  re-regardent, une fois ; si elle tient encore, elle part au brief et le message de fin
  la dit en tête de ce qui reste. Une panne d'OUTIL — une
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

## Retouche demandée après livraison
Une retouche que le designer demande après avoir vu les protos (« refais une passe »,
« plus osé », « plus gros ») est une composition : elle rouvre cette tête et toute sa
méthode — brief corrigé et noté, exigence de rendu, références, deux regards —, jamais une
recomposition improvisée dans la conversation.
Une demande d'intensité nomme un EFFET, pas un paramètre à appliquer à tout. Reformuler en
une ligne ce que le designer voit et l'effet qu'il attend ; dire la lecture retenue avant
d'agir — « plus gros » : creuser l'écart entre l'élément qui domine et le reste, pas grossir
toute l'échelle ; « plus immersif » : le contenu devient le fond, le chrome se retire ;
« plus minimaliste » : retirer ce qui ne sert pas la décision de l'écran, pas tout griser ;
« plus osé » : en régime explorer, la structure et le principe, pas seulement l'habillage ;
en régime reproduire, le seul composant du levier — si le designer veut toucher au châssis,
c'est un changement de régime : le lui dire, et le reporter dans la fiche ;
l'appliquer d'un cran, sur la piste visée — une demande sur une piste ne se propage pas aux
autres sans le dire ; montrer avant et après à la même taille : copier la capture d'avant
sous `explorations/.shots/avant-<proto>-m.png` avant de recomposer (un nom qui ne commence
pas par celui du proto, que les captures fraîches n'écrasent pas), puis la planche les pose
côte à côte. Si la lecture était fausse,
c'est la lecture qui change, pas le cran qui s'amplifie.

## Frontières
- **research** : elle trouve le QUOI (références, principes sourcés) ; cette
  tête pose le COMMENT dans CE DS. La maquette ne porte AUCUNE méthode de recherche —
  ni requête, ni source : elle APPELLE research en appui et compose ce qui revient ; son
  exigence de rendu est du métier de composition, pas une bonne pratique de recherche, et
  les références que research a rangées jugent ses écrans sans leur donner leur forme. Research absente : le déclarer,
  abaisser la confiance, consigner la dette — jamais improviser un substitut.
- **ideation** : fournit les pistes (levier, pari, ce qu'elles sacrifient) en entrée.
- **writer** : la maquette écrit les textes de ses protos ; writer — par défaut en
  run d'un trait, proposé au designer en fin de run séquencé — en vérifie la conformité au ton et signale chaque écart ; la maquette
  réécrit, et writer repasse, jusqu'à ce qu'il n'ait plus rien à signaler. Une
  recomposition (§ Retouche demandée après livraison) change des textes : writer y repasse
  selon la même règle — d'office en run d'un trait, proposé au designer en séquencé. Un
  compte rendu ne dit les textes relus que si writer a tourné depuis la dernière écriture
  des protos.
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
