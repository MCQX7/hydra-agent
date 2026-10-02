# context/design/ — index du design system (lu par Hydra)

> **Contrat** : Hydra lit ce README pour se repérer. Un fichier non listé ici
> est **invisible** pour Hydra. Le tenir à jour quand la structure change.
> Tant que la liste ci-dessous est vide, Hydra compose sans design system décrit :
> il le dit, abaisse la confiance des protos et ne fixe aucune valeur au hasard.

## Fichiers présents

_(aucun : le design system de la mission n'est pas encore décrit)_

> Format : une ligne par fichier — **`nom-du-fichier.md`** — ce qu'il porte.

## Librairies

_(aucune)_

> Une ligne par librairie de l'outil de design : **nom** — lien du fichier — ce qu'elle
> porte (composants, variables, styles). Pour un écran nouveau, sans maquette source,
> Hydra y lit les composants dont l'écran a besoin, au lieu de les reconstituer.

## Ce que ce dossier doit contenir

1. **Une couche de composition** (`design.md`) — ce qui fait d'une librairie un
   langage. Ses sections :
   - **Principes** : ce que l'interface doit faire ressentir et ce qu'elle s'interdit,
     d'après le registre de la mission et l'équipe ;
   - **Figé / libre** : ce qui ne bouge pas d'un écran à l'autre (en-tête, navigation,
     zones obligatoires) et ce qui varie (agencement, hiérarchie, densité) ;
   - **Règles d'usage par composant** : quand employer quoi, les combinaisons
     interdites, les états — tirées des descriptions des composants dans la librairie,
     de la documentation publique du kit quand la librairie en dérive un, et des mesures
     (un contraste insuffisant devient une règle : tel texte sur tel fond) ;
   - **Comportement responsive** : comment un écran s'adapte d'une plateforme à
     l'autre — points de rupture, ce qui se réorganise, ce qui disparaît ;
   - **Archétypes de page** : les gabarits d'écran récurrents, remplis par observation
     des écrans réels ;
   - **Manques** : ce que le parcours demande et que la librairie n'a pas.
2. **Les fondations** — les variables du design system, rangées par rôle :
   couleurs par rôle sémantique (texte, fond, bordure, icône, action, alerte),
   styles de texte, espacements, rayons, élévations, grille. Chaque valeur avec
   le nom exact de sa variable, telle que le design system la donne.
3. **Si le design system a plusieurs univers ou marques** — un fichier par
   univers, qui ne porte que ses écarts aux fondations, jamais une copie.
4. **Les composants propres au produit**, quand leurs règles ne sont pas dans la
   librairie.

## Comment le produire

- **Avec l'outil de design de la mission branché** : donner à Hydra les liens des
  fichiers de librairie ; il lit les variables, les styles de texte et les
  composants, et propose les fondations et l'index de ce dossier, une librairie à
  la fois. Le designer relit, corrige, valide : rien ne s'écrit dans `context/`
  sans son accord. La couche de composition ne se lit pas dans une librairie : elle
  vient de l'équipe et de l'observation des écrans.
- **Ce qui s'écrit, et ce qui reste dans la librairie.** Les fondations portent les
  rôles sémantiques avec leur nom exact et leur valeur ; les rampes de primitives ne se
  recopient pas — on ne compose jamais avec, et elles se relisent dans la librairie au
  besoin. L'index des composants donne, par composant ou par page, son nom, ses axes
  de variantes et l'identifiant de son nœud ; le lien du fichier s'écrit une seule
  fois, dans « Librairies ». Chaque ligne de ces fichiers est relue à chaque sujet :
  ce qui ne sert pas à composer n'y a pas sa place.
- **L'équipe a déjà un fichier de design system en markdown** (un `DESIGN.md`, par
  exemple) : le déposer ; Hydra en tire les fondations et les règles, et le range dans
  ce dossier selon sa structure.
- **Sans outil branché** : déposer un export des variables (fichier JSON, par
  exemple) ou des captures de la page de styles ; Hydra les met en forme, le
  designer valide.
- **Les archétypes de page** se remplissent par observation des écrans en
  production ou des maquettes livrées, jamais par invention.

## Combiner pour un sujet

Lire la couche de composition, les fondations, et le fichier de l'univers
indiqué dans la fiche du sujet. Un fichier d'univers ne contient que ses écarts :
il complète les fondations, il ne les répète pas. Plusieurs univers et aucun
précisé dans la fiche : **demander**, ne pas supposer.

## Comment lire ces fichiers — primitives et rôles

Une librairie contient souvent, par couleur, une rampe complète de nuances : ce
sont les **primitives**, le réservoir. On ne compose **jamais** avec une
primitive en direct. On compose avec les **rôles sémantiques** — le
sous-ensemble de la rampe à qui le design system a donné un métier (couleur
principale, fond, texte lisible sur fond foncé…). Les nuances non mappées restent
en réserve (mode sombre, états, rôles à venir).
