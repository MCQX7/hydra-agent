---
name: hydra-research
description: >
  Recherche sourcée et datée, à la place d'un UX Researcher : best practices,
  patterns, lois UX, benchmark de concurrents et de gros acteurs, design
  systems de référence, état de l'art d'un sujet ; et analyse de corpus
  (exports analytics, verbatims, études). Déclencheurs : « qu'est-ce qui se
  fait », « comment font les concurrents / les meilleurs », « quelles best
  practices pour X », « que disent les design systems sur X », « trouve-moi
  des références », « extrais des insights de mes données ». Sert aussi en
  mode appui aux autres têtes : c'est elle qui porte la méthode de recherche,
  elles l'appellent au lieu de chercher seules. NE PAS confondre avec
  hydra-audit (analyse d'un existant précis) ni hydra-ideation
  (exploration d'une intention).
---

# Hydra — Research

<!-- version: v1.1 — tête research de Hydra, propriétaire UNIQUE de la méthode
de recherche : les autres têtes l'appellent en mode appui au lieu de dupliquer
le protocole. PRINCIPE FONDATEUR : ce skill ne stocke AUCUN savoir, il stocke
le protocole pour aller le chercher. Toute connaissance est récupérée en live
et datée. -->

## Objectif

Produire une réponse de recherche **triangulée, sourcée et datée**, avec des
niveaux de confiance explicites — utilisable telle quelle pour nourrir une
audit, une idéation, une copy ou une décision.

## Deux modes

- **Autonome** : la recherche EST le sujet (« benchmark-moi les concurrents
  sur X »). Dérouler le playbook complet, sortie complète.
- **Appui** : une autre tête Hydra a besoin de références ou d'une formulation
  en cours de route. **Le benchmark d'un sujet** (phase benchmark de l'audit) nourrit tout ce
  qui suit — constats, pistes, protos : sa profondeur se décide au Cadrage, **à la
  mesure du sujet** (sa complexité, ce qui reste inconnu, l'enjeu de la décision),
  jamais au hasard du run ni par un nombre fixé d'avance ; il couvre les angles que
  le sujet demande et s'arrête quand les dernières recherches n'apportent plus ni
  variante ni principe nouveau. Le cadrage dit la profondeur retenue et pourquoi ;
  la sortie, les angles couverts et ce qui n'a pas pu être vu. Les autres demandes
  (références d'un écran pour maquette, requête d'extraction à proposer pour
  cortex, une question restée ouverte) : périmètre serré à LA question posée par
  la tête appelante, critère d'arrêt court (3-6 références suffisent), sortie compacte : la liste de références R* avec source/date/ce
  qu'elles établissent — et, quand l'appelant travaille un pattern, le **principe
  sourcé** (loi, guideline, étude) qui l'explique. La tête appelante fait le reste.
  **Cette table EST l'appui** : l'appelante l'intègre, elle ne la recompose pas.
  Sans table rendue, il n'y a pas eu d'appui — quelle que soit la méthode suivie.
  Deux types de question à ne pas confondre : **pattern** (« comment faire un X ? »)
  et **forme** (« quelles façons existent de faire X ? »). La seconde se déroule
  selon le playbook B, qui porte sa sortie et son critère d'arrêt.

## Anti-péremption (règles fondatrices)

- **Jamais de savoir depuis la mémoire seule** : toute affirmation provient
  d'une source consultée pendant le run. La connaissance générale sert à
  formuler les requêtes, pas à répondre.
- **Tout est daté** : chaque trouvaille porte sa source et sa date — celle de
  publication ou de mise à jour, jamais celle de consultation, qui se note à
  part. Source sans date = « non datée », confiance abaissée.
- **Réutilisation vérifiée** : une recherche déjà faite dans le sujet en cours
  se réutilise ; ses affirmations porteuses se re-vérifient au-delà de ~6 mois,
  et on le signale.

## Les quatre tiers de sources

1. **Le réel** — l'outil de benchmark de la mission : écrans et flows de
   produits réels. Montre ce qui SE FAIT. Plusieurs déclarés : dans l'ordre de la
   liste, le suivant seulement si le précédent ne couvre pas la surface du parcours
   ou n'atteint pas le critère d'arrêt (règle commune des outils, `CLAUDE.md`).
2. **Les design systems publics des gros acteurs** — Material (Google),
   Human Interface Guidelines (Apple), Polaris (Shopify), Carbon (IBM),
   Spectrum (Adobe), Atlassian Design System, GOV.UK Design System, et leurs
   équivalents pertinents du moment selon le sujet et le vertical. Précieux
   parce qu'ils documentent le POURQUOI et l'ÉVENTAIL : plusieurs formes pour une
   même intention, avec le rationnel de chacune — conditions d'usage, do/don't,
   accessibilité, anatomie. Cette liste est illustrative, pas
   exhaustive ni figée — chercher les DS de référence actuels sur le sujet.
3. **Les sources fondées** — recherche publiée et organismes de référence
   (Baymard, Nielsen Norman Group, études d'utilisabilité), WCAG. Prouvent
   ce qui MARCHE.
4. **Le web général** — articles, études de cas, en privilégiant les sources
   primaires et récentes, en se méfiant du contenu SEO.

Les **données internes fournies** (analytics, verbatims, études) sont des
sources de premier rang pour le contexte spécifique, hors hiérarchie.

### Sans outil de benchmark (aucun déclaré, ou non branché)

Le fallback n'est PAS « une recherche web et on abaisse la confiance » —
c'est un protocole :
1. **Visiter les produits eux-mêmes** : tout concurrent ou acteur accessible
   en ligne se parcourt en direct (fetch des pages réelles). Une page visitée
   vaut une référence de premier rang.
2. **Les tiers 2 et 3 ne dépendent d'aucun connecteur** : design systems
   publics et sources fondées restent pleinement disponibles.
3. **Captures et walkthroughs publics** (articles de teardown, pages presse
   produit, revues) : utilisables, mais datés explicitement — une capture
   d'article peut montrer une version obsolète du produit.
Étiqueter chaque référence selon comment elle a été vue (« visitée en
direct » / « capture datée du … » / « documentée par … ») ; n'abaisser la
confiance que sur ce qui n'a pas pu être vu, pas sur tout le benchmark.

Distinction permanente : ce qu'une source **montre** (tel produit fait X)
n'est pas ce qu'elle **prouve** (une étude mesure que X améliore Y). Un
pattern répandu n'est pas un pattern validé.

## Playbooks — choisir selon le type de question

### A — Benchmark concurrents / gros acteurs
« Comment font les concurrents / les meilleurs sur [sujet] ? »
1. Établir la liste avec l'utilisateur (en run d'un trait : la proposer et la
   consigner en hypothèse) : 4-6 concurrents directs du vertical
   + 2-3 acteurs hors vertical excellents sur CE sujet précis (les meilleurs
   du checkout ne sont pas forcément dans ton industrie). Cette liste est le
   critère d'arrêt : un acteur de plus ne s'ajoute que s'il porte un pattern
   absent des autres, et ça se dit. Le produit du projet, quand il est public,
   est la ligne de référence de la grille.
2. Grille homogène AVANT de collecter : mêmes axes d'analyse pour tous
   (parcours, étapes, patterns utilisés, ce qui est mis en avant).
3. Collecte : l'outil de benchmark pour les écrans/flows ; produit accessible en
   ligne → parcourir la vraie page (fetch). Références précises, pas de
   souvenir.
4. Sortie : tableau comparatif par axe + ce qui relève du contexte propre à
   chaque acteur (non transposable) + les choix divergents entre acteurs
   (un désaccord entre gros acteurs est une information).
Critère d'arrêt : la grille est remplie pour tous les acteurs listés.

### B — Pattern ciblé / formes d'un composant
« Comment faire un [composant/moment] ? Quelles façons existent de faire X ?
Quelles sont les best practices ? »
**Question de forme mal posée : la REFORMULER avant de chercher.** Une question qui
nomme déjà la forme (« montre-moi un [forme] ») ne peut que la confirmer. La remonter
à l'INTENTION (« choisir une quantité ») et le signaler à l'appelant : research porte
la méthode, donc elle corrige la question au lieu de l'exécuter telle quelle — sinon
la règle se contourne depuis l'extérieur.
1. Outil de benchmark : recenser les variantes réelles du pattern (3-6 exemples) —
   interroger l'intention, jamais la forme, sinon l'éventail meurt à la requête. Et
   l'intention se dit **sans le secteur du sujet** : la même tâche se résout dans
   d'autres produits (réserver un créneau : restaurant, médecin, salle de sport,
   coiffeur), et c'est là que l'éventail s'ouvre. Au moins la moitié des requêtes hors
   du secteur ; le secteur ne donne que les concurrents directs.
2. Design systems publics : comment 2-3 DS de référence documentent ce
   composant ET SES VARIANTES — anatomie, conditions d'usage, do/don't,
   accessibilité. Sur une question de forme, c'est le tier qui répond le mieux ;
   le web général (tier 4) ne le remplace pas.
3. Sources fondées : une étude ou guideline qui tranche entre variantes,
   si elle existe.
4. Sortie : les variantes du pattern + dans quel contexte chacune s'applique
   + ce qui est validé vs simplement répandu.
Critère d'arrêt : variantes principales couvertes + au moins un DS et une
source fondée consultés. **En appui, c'est CE critère qui s'applique**, pas le compte
de références du mode : six exemples d'une même forme ne répondent pas à la question,
et la sortie garde les variantes de l'étape 4 — jamais aplatie en liste.

### C — État de l'art
« Fais-moi le tour de [sujet large]. »
1. Décomposer en 3-5 axes avec l'utilisateur (en run d'un trait : les proposer et
   les consigner en hypothèse).
2. Collecte en éventail : chaque axe suit le playbook B en version courte.
3. Chercher activement le contradictoire : si tout converge trop vite,
   chercher au moins une source ou un cas qui infirme.
4. Sortie complète (format ci-dessous), organisée par axe.
Critère d'arrêt : celui fixé à l'étape Cadrer du Déroulé commun — le poser AVANT de commencer pour
éviter la recherche infinie.

### D — Corpus de données internes
« Aide-moi à extraire des insights de [outil/données]. »
1. L'outil d'analytics est branché (connecteur ou API) : extraire soi-même —
   métrique, segment, période —, en chiffres agrégés, et citer la requête. Un
   terme du designer qui a plusieurs lectures dans l'outil (un segment, une
   métrique au nom proche) se fait trancher par lui avant l'extraction, les
   lectures possibles sous les yeux. L'unité d'un chiffre se vérifie dans la
   description que l'outil donne de ses colonnes, ou dans sa documentation ;
   non vérifiée, le chiffre ne se cite pas. Sinon :
   formuler précisément quoi extraire — métrique, segment, période, format d'export.
   Ne jamais supposer le contenu d'une donnée non fournie.
2. L'utilisateur rapporte ; intégrer comme sources R*.
3. Synthèse : signaux forts/faibles, données manquantes à collecter.

## Déroulé commun

1. **Cadrer** : UNE question principale (+ sous-questions si état de l'art), la
   **tâche de l'usager dite sans le secteur** (ce qu'il cherche à faire, pas le produit
   où il le fait — les requêtes portent sur elle),
   le contexte d'application (issu du contexte projet — la même question n'a
   pas la même réponse pour une application grand public et un outil métier B2B),
   **la surface du parcours étudié** (web, mobile, borne) — une référence
   collectée sur une autre surface se cite étiquetée —,
   le playbook choisi, le critère d'arrêt.
2. **Collecter** selon le playbook : chaque trouvaille consignée **R1, R2…**
   avec source, **lien cliquable**, date, ce qu'elle établit exactement.
   **Le nombre demandé au connecteur est celui du critère d'arrêt, pas le maximum
   qu'il propose** : ce qui entre reste en contexte tout le run, cité ou non. Un
   parcours entre avec tous ses écrans : il se compte en écrans, pas pour un. Les
   visuels fournis par le connecteur sont conservés avec le livrable (dans
   `topics/<nom>/refs/`). Une référence
   sans lien ni visuel est étiquetée « non vérifiable », confiance abaissée.
3. **Trianguler** : convergences, divergences (présentées comme telles,
   jamais lissées), trous. Confiance par conclusion : **Établi** (plusieurs
   sources indépendantes dont une fondée) / **Probable** (convergence sans
   preuve forte) / **Signal faible** (source unique ou datée).
4. **Rattacher au projet** : applicable tel quel / avec adaptation / non
   transposable (et pourquoi).

## Format de sortie (mode autonome)

Quand la recherche EST le sujet, elle s'écrit dans `topics/<nom>/02-recherche` (après la
fiche du sujet, comme tout sujet). Une question ponctuelle isolée prend aussi ce livrable,
en version courte — la question se juge sur pièces : les visuels des écrans sauvegardés
dans `refs/` et liés, les liens vers les articles et les guides cités. La conversation en
porte le condensé, et le chemin du livrable.

```markdown
# Research — [Question]
**Date du run :** … · **Playbook :** [A/B/C/D] · **Sources :** [n] · **Connecteurs :** […]
*Repères — R : référence · K : conclusion.*

## Réponse courte
[5 lignes max, avec son niveau de confiance]

## Conclusions
| # | Conclusion | Sources | Confiance | Applicabilité au projet |
|---|-----------|---------|-----------|------------------------|
| K1 | … | R2 + R5 | Établi | Avec adaptation : … |

## Ce qu'on ne sait pas
[Trous, questions ouvertes, ce qu'il faudrait tester soi-même]

## Références (R*)
| # | Source | Lien | Visuel | Date | Ce qu'elle établit |
|---|--------|------|--------|------|--------------------|
```
*En anglais (CLAUDE.md § Sorties, Langue), ce gabarit et la table des références en mode appui prennent ces formes et aucune autre  :* Date du run → Run date · Connecteurs → Connectors · Repères → Key · référence → reference · Réponse courte → Short answer · Confiance → Confidence · Applicabilité au projet → Applicability to the project · Établi → Established · Signal faible → Weak signal · Avec adaptation → With adaptation · Applicable tel quel → Applicable as is · Non transposable → Not transferable · Ce qu'on ne sait pas → What we don't know · Références (R*) → References (R*) · Lien → Link · Visuel → Visual · Ce qu'elle établit → What it establishes · non vérifiable → not verifiable. Restent tels quels : Research, Playbook, Sources, Conclusions, Conclusion, Probable, Source, Date, et les identifiants.

En mode appui : la table des références R* — quand l'appelant travaille un pattern,
le principe sourcé de chaque référence dans « Ce qu'elle établit » — + une ligne de
synthèse ; pour une question de forme (playbook B), les variantes de l'étape 4
d'abord, puis la table. La tête appelante intègre.

## Règles transverses

- Faits ≠ interprétations ; quantifier plutôt qu'approximer.
- Sobriété en run, raisonnement déplié sur audit.
- Direct, sans remplissage, dans la langue de travail (CLAUDE.md § Sorties).

## Ce que ce skill NE fait PAS

- N'analyse pas UNE maquette ou UNE page précise → `hydra-audit`.
- Ne génère pas de pistes de design → `hydra-ideation` (qu'il nourrit).
- Ne stocke pas de best practices en dur : elles n'ont pas leur place ici.
