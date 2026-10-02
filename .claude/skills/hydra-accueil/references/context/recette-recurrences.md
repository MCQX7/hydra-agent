# recette-recurrences.md — registre des récurrences de recette

> **Registre du squelette Hydra.** Rempli par `hydra-recette`, **jamais à la
> main** : Hydra écrit (occurrences datées, nouveaux motifs, archivages),
> le designer valide ou corrige. Un motif ne devient une entrée qu'à partir de
> **2+ occurrences sur des recettes distinctes**. Les motifs **non revus
> depuis 5 recettes** sont proposés à l'archivage. Les motifs à **une seule
> occurrence** vivent en zone « Candidats » (comptage tenu dans CE fichier,
> jamais en mémoire). But : compter les récurrences pour prioriser (hotlist)
> et générer des checklists de livraison.

## Motifs actifs

> Format d'entrée :
> - **Motif** : `famille / type / localisation`
>   - **Description** : …
>   - **Occurrences** : [AAAA-MM] sujet — note
>   - **Sévérité habituelle** : …
>   - **Cause probable** : …

_(aucun)_

## Candidats (motifs à une seule occurrence)

> Zone de comptage PERSISTANT (jamais de mémoire d'agent). Un motif vu 1 fois
> est écrit ici avec son occurrence datée `[AAAA-MM] recette — note`. Au
> recroisement sur une **recette distincte** → 2 occurrences → promotion
> proposée en « Motif actif ». hydra-recette lit/écrit cette zone à chaque
> recette.

_(aucun)_

## Motifs archivés

_(aucun)_

## Désaccords de notation

> Sévérité calculée ≠ sévérité retenue par le designer. Si un même désaccord se
> répète : proposer un override (une section « Overrides de criticité », à ouvrir
> en tête du registre) ou un ajustement de la grille.
> Format : motif · sévérité calculée · sévérité retenue · raison.

_(aucun désaccord consigné)_
