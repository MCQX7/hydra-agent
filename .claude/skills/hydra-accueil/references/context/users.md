# users.md — dimensions utilisateurs

> Les utilisateurs ne rentrent pas dans des cases : un même sujet touche plusieurs
> combinaisons. Ce fichier ne stocke donc PAS des personas figés, mais les
> DIMENSIONS qui font varier les décisions de design — et les combinaisons
> récurrentes, chacune portant son NIVEAU DE PREUVE.
> Au cadrage d'un sujet, Hydra s'en sert pour établir LE MIX concerné (qui
> est touché, sur quels axes ils diffèrent, ce que chaque combinaison exige)
> — jamais pour assigner un persona unique.
> Les dimensions dépendent de la mission et des parcours travaillés : ce fichier
> se remplit au fil des sujets, avec l'accord du designer.

## Dimensions

> Format — un titre par dimension, numéroté :
> `### D1 — [nom de l'axe]`, puis : les deux pôles (« pôle A ↔ pôle B ») ;
> **Ce que ça change** : les décisions de design qui varient selon le pôle ;
> **Piège** : ce qu'on confond le plus souvent sur cet axe.

## Combinaisons (avec niveau de preuve)

> Une seule liste : chaque combinaison porte son niveau de preuve (`Établi` /
> `Probable` / `Signal faible` / `[HYPOTHÈSE]`, échelle alignée sur hydra-research).
> Format : **nom de la combinaison** (positions sur les dimensions) : ce qu'elle
> fait, ce qu'elle exige du design. Niveau : … — sources (participants ou sujets, datés).

## Profils observés (terrain)

> Observations factuelles de participants réels, positionnées sur les
> dimensions. Ce ne sont PAS des personas : aucun n'est à plaquer sur un
> sujet. Ils servent à connaître la DISTRIBUTION réelle du terrain, que les
> dimensions seules ne donnent pas. Format : par terrain (date, sujet, nombre de
> participants, méthode), la composition du corpus et ses biais, puis un
> participant par ligne, sans aucune donnée nominative.

## Règles du catalogue

- Une dimension n'entre ici que si elle change des décisions de design.
- Un sujet = un MIX de positions établi au cadrage, jamais un persona unique.
- Chaque combinaison porte un NIVEAU DE PREUVE (`Établi` / `Probable` /
  `Signal faible`, échelle alignée sur hydra-research) ou le tag `[HYPOTHÈSE]`
  si nommée mais jamais rencontrée. Pas de seuil d'occurrences : le fichier se
  remplit au fil des sujets.
- **Occurrences ÉCRITES dans le fichier, jamais en mémoire** : chaque preuve
  cite son (ses) participant(s)/sujet(s) et sa date. Le niveau de preuve se
  relit et se réévalue à chaque sujet qui recroise une combinaison.
- Provenance d'un niveau : `promu par observation` (preuve terrain) ou
  `promu par jugement designer` (validé sans preuve suffisante). À noter quand
  le designer tranche par jugement propre.
- « Sourcé ou marqué » reste la règle mère : toute affirmation non prouvée
  porte `[HYPOTHÈSE]` → confiance abaissée.
- Aucune mesure ne vit dans ce fichier : les valeurs de parcours viennent des
  documents du sujet. Même règle que `kpi.md` — une valeur figée périme et trompe.
- Une métrique de parcours est un agrégat de combinaisons : ne jamais l'attribuer à
  un profil unique sans segmentation.
- Mesures de parcours et observations terrain portent souvent des coordonnées
  différentes (device, canal) : ne jamais les croiser sans le déclarer.
