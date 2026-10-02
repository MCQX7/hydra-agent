---
name: hydra-audit
description: >
  Audit d'un existant : analyse d'une maquette (via l'outil de design
  de la mission) ou d'une page en production (via son URL), croisement avec les documents
  fournis (exports analytics, restitutions, verbatims), critique de l'existant,
  puis rapport d'action ; le benchmark, elle le confie à hydra-research. Un
  lien de maquette ou de prod + un problème à résoudre = ce skill. Déclencheurs : «
  audite cette page », « trouve les points de friction », « pourquoi cette feature
  sous-performe », « analyse cet écran », « critique ce
  parcours », « croise ces données avec la maquette », « on prépare une
  refonte », ou un dilemme design exposé sans le mot audit. NE PAS
  confondre avec hydra-ideation (exploration d'une intention, sans analyse de
  l'existant) ni hydra-recette (QA visuelle du build).
---

# Hydra — Audit

<!-- version: v1.0 — tête audit de Hydra. Analyse l'EXISTANT avec des
preuves. -->

## Objectif

Produire une compréhension **triangulée** d'un sujet design (ce que montre
l'existant × ce que disent les données × ce que font les meilleurs produits)
et la convertir en rapport d'action directement actionnable (le brief
d'exploration part en aval à hydra-maquette). La cible :
que le designer reparte avec des hypothèses justifiées, priorisées, et des
idées à formaliser — pas un rapport qui dort.

## Contexte projet (à lire avant tout)

Ce skill est agnostique client. Les spécificités (design system, tokens,
univers graphiques, contraintes réglementaires, KPI de référence) vivent dans
le contexte du projet — `context/`, et CLAUDE.md pour les règles transverses.
Les consulter en phase 0. Si une information
client nécessaire manque, le signaler plutôt que d'inventer.

## Inputs acceptés

- **L'existant** : lien de maquette (lu via l'outil de design de la mission) et/ou URL de production
  (fetch + analyse de la page réelle). Les deux ensemble : l'écart
  maquette ↔ prod est un signal en soi.
- **Les documents** : tout format — exports d'outils d'analytics, Excel, CSV,
  PDF, restitutions, screenshots d'outils analytics, verbatims, tickets.
- **Le dilemme** : formulé à la volée en langage naturel. Pas de template
  à remplir : le cadrage se mène interactivement — si `hydra-cortex` est
  installé, son cadrage express le couvre (KPI décisionnel + seuil et MIX
  users compris) ; à défaut, cette tête le collecte en Phase 0.

## Déroulé — 5 phases

Chaque phase produit un livrable intermédiaire. Le rythme (pause de validation
à chaque phase, ou run d'un trait avec questions consignées) est fixé par
l'orchestrateur selon le mode choisi par l'utilisateur (`hydra-cortex`, cadrage
express). Sans mode fixé : séquencé.

### Phase 0 — Cadrage

**`01-fiche` déjà écrite** (cadrage express de cortex) : la lire, ne rien refaire ni
reposer. Ce qui suit ne vaut qu'à défaut.

1. Reformuler le dilemme en une phrase : quel problème, pour qui, avec quel
   objectif business/UX.
2. Établir la **fiche du sujet** : le problème (tel que le dépôt le dit), le KPI décisionnel (quelle métrique jugera
   le succès de CE sujet — ne jamais le supposer depuis le contexte global,
   il change à chaque sujet), les cibles concernées, le périmètre et le
   déjà-tranché.
3. Inventorier les inputs reçus (liens, fichiers) et le contexte projet
   disponible.
4. Lister explicitement ce qui **manque**. En mode séquencé : poser les
   questions bloquantes. En run d'un trait : consigner chaque question avec
   l'hypothèse prise.
5. Ne jamais analyser sur des hypothèses non explicitées.

**Livrable :** cadrage en ~10 lignes + questions ouvertes.

### Phase 1 — Audit critique de l'existant

Source : la maquette (outil de design de la mission) et/ou la prod (URL). Si l'outil de
design n'est pas branché ou le lien inaccessible : ne pas planter — demander des
screenshots exportés et abaisser la confiance des observations structurelles.
Chaque lecture de la maquette désigne son nœud — celui du lien déposé, ou un nœud tiré
de la structure déjà lue. Une sélection que l'outil annonce dans sa réponse ne désigne
jamais la cible : c'est celle de l'application, partagée par toutes les sessions. Un
lien sans nœud se complète en le demandant, pas en supposant.

1. Cartographier : écrans, parcours, hiérarchie, composants utilisés.
2. Vérifier la cohérence avec le design system du projet (composants
   détournés, valeurs en dur vs tokens) — on note, on ne corrige pas.
3. Analyse heuristique et **critique argumentée** : hiérarchie visuelle,
   charge cognitive, affordances, états manquants (vide, erreur, chargement),
   accessibilité évidente, frictions probables. Être force de proposition :
   chaque critique peut s'accompagner d'une piste, étiquetée comme hypothèse.
4. Chaque observation est factuelle et localisée (« écran X, zone Y »),
   séparée de son interprétation.
5. **Exercer les états, pas seulement l'écran au chargement.** Sur une prod ou un
   proto interactif : parcourir chaque état que la personne peut atteindre (vide,
   partiel, complet, dépassement, erreur) et relever le texte et les valeurs
   affichés dans chacun. Une ABSENCE (« l'écran ne dit pas… », « rien n'indique… »)
   ne s'écrit qu'après relecture de l'interface dans l'état concerné, capture à
   l'appui, et après avoir cherché ce qui la contredirait.

**Produit :** les observations numérotées (O1, O2…), en annexe du rapport ; la cartographie est une étape de travail, pas un livrable.

### Phase 2 — Lecture des documents

1. Ingérer les documents fournis. Format ambigu : demander (séquencé) ou
   consigner l'hypothèse de lecture (run d'un trait). Un input contenant déjà
   des pistes/mockups/hypothèses (brief, doc d'un tiers) est une **source à
   challenger, pas un socle** — ses propositions sont des candidates parmi
   d'autres. Étiqueter chaque piste/hypothèse portée à l'aval : **[input]**
   (reprise + réf ; **vérifiable**, le doc est dans `inputs/`), **[dérivé]**
   (recombine ou étend l'input), **[analyse]** (né du travail, absent de
   l'input). L'étiquette voyage vers ideation.
2. **Rattacher chaque signal à un écran ou une étape de la Phase 1.** Un taux
   d'abandon sans écran associé n'est pas exploitable.
3. Donner à chaque signal son **cran de matérialité** — il ne s'étiquette pas : il
   BORNE la confiance des constats (Phase 4) et se nomme au résumé (« Signal
   porteur »). L'annexe le porte au format parsable « - **S\*** *(cran)* — … ».
   - **mesuré** (par défaut) : l'écart est dans la donnée, noté avec ses
     coordonnées (métrique, valeur, période, segment, n si présent) et son
     amplitude (faible / forte).
   - **établi** : promu au vu de trois éléments — amplitude de l'écart, nombre
     d'observations (une coupe transversale vs une série répétée ou plusieurs
     segments), nature du lien (comptabilité directe vs déduction).
   - Un écart FAIBLE sur une seule coupe sans n reste « mesuré », quelle que soit
     l'impression qu'il donne. Absence de n ou de période → dette déclarée,
     confiance abaissée. Coordonnées non comparables → jamais « établi » sans le
     dire (cf. hydra-cortex § `kpi.md` — dictionnaire coordonné, règle de lecture).
   - Noter aussi les **données absentes** qu'il faudrait collecter (au rapport :
     « Incertitudes à vérifier par l'humain »).
4. Ne jamais inventer de causalité : « le taux chute à l'étape 3 » est un
   fait ; « parce que le bouton est mal placé » est une hypothèse, l'étiqueter
   comme telle. **Un écart, même établi, n'explique jamais rien** : toute
   explication (« l'écart vient de X », « donc le levier est Y ») est une
   hypothèse H* étiquetée et testable, jamais un constat.
5. Données sensibles repérées (emails, identifiants personnels selon le
   domaine — IDs utilisateurs, clients, patients… —, verbatims nominatifs) :
   le signaler, ne jamais les recopier dans les livrables.

**Livrable :** signaux numérotés (S1, S2…) mappés sur le parcours, chacun avec
son cran (mesuré / établi) qui voyage vers l'aval. Aucun document fourni : le
dire, passer en mode heuristique + benchmark uniquement, confiance abaissée.

### Phase 3 — Benchmark de patterns réels

**Cette phase délègue la recherche à `hydra-research` (mode appui)** : lui passer
la question (« comment les produits comparables traitent [le sujet de la Phase 0] »),
consommer ses références R* et, pour chacune, le **principe sourcé** (loi, guideline,
étude) qui l'explique. L'audit ne porte NI requête, NI source à interroger, NI
critère de sélection : tout cela est à research. **Research absente : le déclarer,
abaisser la confiance du benchmark, consigner la dette — jamais improviser une
méthode de recherche** (pas de connecteur en direct comme substitut).

Ce que cette phase fait en propre :
1. **Rattacher** chaque référence au parcours de la Phase 1 : quel écran, quelle
   étape le pattern éclaire.
2. **Double justification**, à partir de ce que research renvoie : la référence
   réelle (produit, écran) qui montre + le principe sourcé qui explique — jamais
   un principe de mémoire.
3. Juger l'**applicabilité au contexte projet**. **Annexe « Écartés »** (compacte) :
   patterns et références non retenus, **groupés par motif partagé** (une ligne par
   motif). Transparence, pas preuve du bon tri.

**Livrable :** patterns B1, B2… — chacun adossé à une référence R* de research —
avec principe sourcé et applicabilité au contexte projet.

### Phase 4 — Synthèse : le rapport d'action

1. Croiser O × S × B : un constat n'entre que soutenu par au moins une
   source ; sa confiance croît avec les sources convergentes.
   **Sources contradictoires, ou constats en tension entre eux : le conflit est
   un constat en soi**, présenté avec les lectures en présence, jamais lissé —
   et **jamais fabriqué** : une tension nommée sans être réelle décrédite tout
   le rapport. Pas de tension ⇒ pas de ligne.
2. **Le cran borne la confiance** (projection = colonne Confiance) : *Haute* ⇐ un
   `établi` ou deux `forte amplitude`, comparables ; `mesuré, faible` seul →
   *Moyenne* ; coordonnées non comparables seules → *Faible*, réserve déclarée.
3. **Parité ≠ potentiel** : un seuil absolu = question de potentiel, un seuil
   « égaler une référence » = parité. Le signal porteur doit y répondre — la parité
   ne règle pas un seuil absolu ; un signal de potentiel non comparable est la cible
   d'aspiration (réserve + dette d'extraction, jamais supprimé).
4. Prioriser en impact × effort.
5. Formuler 2 à 4 hypothèses de design testables : « si on fait X, alors [la
   métrique décisionnelle du sujet] progresse, parce que B1 ». Le « alors »
   porte sur la métrique décisionnelle AVEC sa direction attendue, ou nomme le
   chaînon explicite qui l'y relie ; une hypothèse dont l'effet ne se relie pas
   à l'objectif est incomplète (défaut de construction), pas seulement mal
   écrite.
6. Produire le rapport ci-dessous (le brief est produit par hydra-maquette).
7. Remplir la section **Incertitudes** : tout ce que l'analyse ne tranche pas
   et que l'humain doit vérifier.

Note : les identifiants O/S/B servent aussi aux corrections rétroactives — si
l'utilisateur corrige un élément amont, seules les branches qui en dépendent
sont re-déroulées.

## Format de sortie — le rapport

UN livrable : le rapport (`02-rapport`), écrit par cette tête puis **complété par
hydra-ideation** (pistes, critique, convergence, reco). Il s'ouvre sur « Questions de
cadrage non résolues » — les décisions hors autorité d'Hydra encore ouvertes au rendu,
dans les deux modes (question + hypothèse prise) ; en séquencé, une question tranchée à
une pause part dans la fiche et n'y figure plus. Le brief
d'exploration est le livrable de hydra-maquette, en aval.

### Rapport d'action

```markdown
# Audit — [Sujet]
**Date :** … · **Inputs :** [maquette vX / prod URL / données Y période Z] · manque : [tout ce qui manque, en une ligne]
**Écrit par :** audit [· complété par idéation, quand elle est passée]
**Benchmark :** [research en appui, le … · ou « produit sans research » · ou
« aucun » — ligne toujours présente, « aucun » quand il n'y a pas de section
Benchmark. Une tête et une date, jamais des R*]

*Repères — O : observation · S : signal (donnée) · B : benchmark (référence) ·
C : constat · H : hypothèse de design · P : piste. Détail des O/S/B en annexe ;
constats et pistes explicités à leur place.*

## Questions de cadrage non résolues
- [Question] → hypothèse prise : …

## Résumé exécutif
[5 lignes max : le problème, les 2-3 constats majeurs, la direction proposée]
**Signal porteur :** S* (cran) — le(s) signal(aux) qui porte(nt) la thèse.

## Constats priorisés
| # | Constat | Sources | Confiance | Impact | Effort |
|---|---------|---------|-----------|--------|--------|
| C1 | … | O2 + S1 + B3 | Haute | Haut | Moyen |

*La case Constat : le fait, puis ce qu'il fait à la personne, en une ou deux phrases. Ce
que montrent les références reste en annexe ; ce qu'on en fait va aux hypothèses et à la
direction.*

*Constat que la direction ne reprendra pas : le marquer « écarté : raison » dans sa ligne.*
**Tensions relevées :** *(ligne OMISSIBLE — n'écrire QUE si une tension existe)* C* ↔ C*
(ou source ↔ définition) — les lectures en présence — ce qui les départage.

## Hypothèses de design
*Origine — une ligne obligatoire qui GLOSE les tags puis les applique :
[input] repris d'un doc d'entrée · [dérivé] recombine ou étend un input ·
[analyse] né du travail. Puis : ce qui vient de l'input, où est l'apport de
l'analyse. Chaque H\* porte son tag. — `H*` désigne UNIQUEMENT une hypothèse
de design : une hypothèse portée par un doc externe (ticket…) s'écrit EN
CLAIR, jamais « H3 ».*
1. **H1 —** Si [changement], alors [métrique décisionnelle + direction attendue, ou chaînon vers elle], parce que [principe/référence].

## Direction recommandée
*Section écrite par hydra-ideation. L'audit ne la pose PAS en placeholder : tant
que l'idéation n'est pas passée, elle n'existe pas.*
**Fondé sur :** C* — les constats qui fondent cette direction. Un constat cité ici
et contredit par elle met le conflit sous les yeux : c'est l'objet du champ.

## Actions
- [ ] [Action concrète — triées par priorité]

## Incertitudes à vérifier par l'humain
- [ ] …

## Annexes
[Observations O*, signaux S*, benchmark B* avec leurs références. Chaque **signal**
au format « - **S\*** *(cran)* — fait » (cran = « mesuré » ou « établi », puis « forte
amplitude » ou « faible amplitude », libellés lus tels quels par le lint ; coordonnées
non comparables le cas échéant ; un signal fort laissé de côté porte « non exploité :
raison » dans la même parenthèse) : le lint y lit le cran. Le benchmark, quand il y en
a un, sous un titre « ### Benchmark » : la table R* de research intégrée telle quelle,
puis les B* ; ses non-retenus sous « #### Écartés ». Chaque B*/R*
porte lien cliquable + visuel **lié** (jamais embarqué) depuis `topics/<nom>/refs/` (produit +
écran nommés, ce qu'elle montre) ; sans lien ni visuel = étiquetée « non
vérifiable », confiance abaissée]
```

## Règles transverses

- **Traçabilité totale :** aucune affirmation sans identifiant source (O/S/B/R).
- **Faits ≠ interprétations**, toujours séparés et étiquetés.
- **Quantifier et qualifier :** « 7 utilisateurs sur 10 », pas « la plupart » — et un
  chiffre porte son cran (CLAUDE.md § Règles transverses, Traçabilité).
- **Sobriété en run** : livrables structurés, zéro narration dans les messages —
  jamais dans le livrable, dont la prose dit ce qu'elle affirme. Déplier le
  raisonnement complet uniquement quand l'utilisateur audite un point.
- Écrire en français, ton direct, sans remplissage.

## Ce que ce skill NE fait PAS

- N'ouvre pas l'espace des solutions ni ne tranche entre pistes → c'est
  `hydra-ideation`, qui prend le relais sur les constats et hypothèses.
- Ne fait pas de recette visuelle du build → `hydra-recette`.
- Ne rédige pas de specs devs : hors périmètre de cette tête (aucune tête
  handoff n'est installée).
- Ne mène pas de recherche profonde hors sujet en cours → `hydra-research`.
