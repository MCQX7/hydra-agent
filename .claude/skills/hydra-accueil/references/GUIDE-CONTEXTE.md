# Guide du contexte — ce qu'Hydra sait de ta mission

Hydra sépare deux choses. **La méthode** — les têtes `hydra-*`, les outils — est la
même pour tous les designers et toutes les missions. **Le contexte** — le dossier
`context/` — dit tout ce qui est propre à ta mission : le client, le produit, le
vocabulaire, les utilisateurs, les métriques, le design system, le ton, les outils.
Changer de mission, c'est remplacer `context/`, rien d'autre.

Les modèles vides de chaque fichier sont dans `.claude/skills/hydra-accueil/references/context/`. À la première
session, l'accueil les recopie dans `context/` et les pré-remplit avec toi, à partir
de tes réponses et des sources que tu as. Rien ne s'y écrit sans ton accord.

**Aucun fichier n'est bloquant.** Un fichier vide n'arrête jamais un travail : Hydra
le signale une fois, pose des questions à la place, abaisse la confiance de ce qui en
dépendait, et le dit dans le livrable. Mais chaque fichier vide se paie, et voici où.
Le contexte n'a pas à être complet le premier jour : il s'enrichit au fil des sujets.
À chaque cadrage, Hydra compare ce que le sujet nomme — une métrique, un profil, un
terme — à ce que le contexte contient ; ce qui manque, il le demande, puis te propose
de l'ajouter, et l'écrit après ton accord. Il n'invente rien pour combler un vide.

---

## `mission.md` — le cadre (à remplir en premier)

**À quoi il sert** : c'est le premier fichier qu'Hydra lit. Il dit qui est le
client, ce que couvre la mission, les mots du métier, ce que l'équipe peut absorber,
comment les décisions se prennent, et quels outils tu as.

**Sans lui** : Hydra ne connaît ni le produit ni ses contraintes. Il pose les
questions au cadrage de chaque sujet, ses livrables emploient des mots qui ne sont
pas ceux de l'équipe, et il peut proposer des pistes irréalistes pour elle. Sans la
section outils, il n'appelle aucun outil externe : pas de lecture de maquette, pas de
benchmark sur des écrans réels, pas de données d'usage.

**Les sources qui le remplissent** : tes réponses, d'abord. Et tout document de
cadrage : brief de mission, présentation du client ou du produit, glossaire interne,
charte réglementaire. C'est le fichier où la précision rapporte le plus :
- **le domaine et le périmètre** au plus près de ton travail réel — les parcours, les
  modes, ce qui n'en fait pas partie ;
- **les plateformes** — la principale et les ponctuelles : elles disent pour quels
  écrans Hydra compose ;
- **le vocabulaire métier** — les noms internes des pages, des étapes, des fonctions,
  des offres, et les sigles : ce qu'un nouvel arrivant ne comprendrait pas, pas les
  mots que tout le monde comprend ;
- **les contraintes de faisabilité** — ce que l'équipe produit peut absorber : une
  piste irréaliste pour elle ne sert à rien ;
- **ton quotidien** — ton rôle, qui te donne les sujets, qui valide, les rituels.

**Les outils** : un par ligne, sous son rôle (design, benchmark, analytics,
gestion), avec le nom de son connecteur tel que la commande `/mcp` le montre.
Plusieurs outils pour un rôle : dans ton ordre de préférence ; Hydra se sert du
premier et ne passe au suivant que si le premier ne suffit pas. Un outil que la
mission a mais qui n'est pas branché : Hydra t'aide à le brancher à partir de sa
documentation.

**Comment l'enrichir** : le vocabulaire se complète au fil des sujets — Hydra propose
un terme marqué [à confirmer], tu valides. Un outil branché plus tard s'ajoute à sa
ligne.

## `kpi.md` — les métriques

**À quoi il sert** : un dictionnaire. Pour chaque métrique que tes sujets emploient :
son nom exact, sa définition, les coordonnées sans lesquelles une valeur ne veut rien
dire (device, parcours, période…), ses pièges.

**Sans lui** : Hydra ne sait pas si deux chiffres sont comparables. Il demande la
définition au cadrage, et ne juge aucune valeur contre une autre.

**Il n'a pas à être rempli à l'accueil.** Il se remplit au fil des sujets : au cadrage,
Hydra demande quelle métrique jugera le sujet ; si elle n'est pas au dictionnaire, il
te propose sa fiche, et l'écrit après ton accord.

**Les sources qui le remplissent** :
- les définitions de ton outil d'analytics (son plan de marquage, sa liste de
  métriques) — Hydra ne va pas encore les y chercher lui-même : dépose-les ;
- **une restitution, un export ou un tableau de bord** (PDF, tableur) : Hydra en tire
  les noms, les définitions et les coordonnées ;
- tes réponses : les métriques que ton équipe regarde, et celles qu'elle confond.

Seulement les métriques que tu emploies : elles changent d'une mission à l'autre, et
même d'un designer à l'autre chez un même client, selon la partie du produit.
**Aucun chiffre** : les valeurs vivent dans les documents déposés dans chaque sujet,
datées. Une valeur recopiée ici périme et trompe.

**Comment l'enrichir** : chaque sujet qui apporte une restitution peut ajouter une
métrique ou préciser un piège ; Hydra le propose, tu valides.

## `users.md` — les utilisateurs

**À quoi il sert** : les axes sur lesquels tes utilisateurs diffèrent, quand ces
différences changent des décisions de design, et les combinaisons qui reviennent.

**Des axes, pas des personas.** Un persona fige une combinaison — un âge, un usage, un
niveau — et pousse à concevoir pour un seul profil, alors qu'un même sujet en touche
plusieurs. Un axe dit ce qui fait varier une décision : « première visite ↔ usage
quotidien », « pressé ↔ en exploration ». Au cadrage, Hydra dit quelle combinaison
d'axes le sujet touche, et ce que chacune exige. Chaque combinaison porte son niveau
de preuve : établie, probable, signal faible, ou hypothèse.

**Sans lui** : Hydra demande au cadrage qui est touché, et marque comme hypothèse tout
ce qu'il dit des utilisateurs. Comme les KPI, il se remplit surtout au fil des sujets :
Hydra propose un axe ou une combinaison quand un sujet en apporte la preuve.

**Les sources qui le remplissent** : restitutions d'études, comptes rendus
d'entretiens, résultats de tests utilisateurs, verbatims du support client,
segmentations marketing. Hydra en dégage les axes et les combinaisons, chacune avec
sa source et son niveau de preuve. Sans document, deux ou trois axes que tu connais
suffisent pour commencer, marqués hypothèse.

**Comment l'enrichir** : chaque sujet qui apporte un terrain peut révéler un axe ou
relever un niveau de preuve ; Hydra le propose, avec sa source. Jamais de donnée
nominative.

## `design/` — le design system

**À quoi il sert** : la maquette compose ses protos avec les variables, les styles et
les composants qui y sont décrits, et rien d'autre.

**Sans lui** : les protos sont composés sans design system décrit — Hydra le dit et
abaisse leur confiance. Avec l'outil de design branché, il lit quand même les valeurs
de la maquette du sujet, mais sans les règles d'usage.

**Les sources qui le remplissent** :
- **les liens des fichiers de librairie, avec l'outil de design branché** : Hydra lit
  les variables, les styles de texte et les composants, et rédige les fondations et
  l'index du dossier ; tu relis et valides. C'est la voie la plus rapide et la plus
  fiable pour les valeurs ;
- un fichier de design system en markdown que l'équipe a déjà (un `DESIGN.md`, par
  exemple) : Hydra en tire les fondations et les règles ;
- sans outil branché : un export des variables, ou des captures de la page de styles ;
- **pour la couche de composition** (`design.md` : principes, figé / libre, règles
  d'usage par composant, archétypes de page) : les descriptions des composants dans ta
  librairie, la documentation publique du kit si ta librairie en dérive un, les mesures
  qu'Hydra fait (un contraste insuffisant devient une règle), ce qu'en dit ton équipe, et
  l'observation des écrans. C'est le fichier qui fait d'une librairie un langage.

**Les liens des librairies restent dans l'index** (`README.md` du dossier, section
« Librairies ») : pour un écran nouveau, sans maquette source, Hydra y pioche les
composants dont il a besoin et les compose tels quels, au lieu de les reconstituer.

Le `README.md` du dossier dit ce qu'il doit contenir et comment se range chaque fichier.

**Comment l'enrichir** : quand la librairie change, redemander la lecture ; un manque
relevé pendant un sujet (une valeur absente du design system) se dit dans le brief, et
peut s'ajouter ici.

## `tone-of-voice/` — la charte de ton (facultatif)

**À quoi il sert** : si le client a une charte de ton (un document, quel que soit son
format), on la dépose ici. Writer et la maquette l'appliquent à tous les textes
d'interface. C'est mieux de l'avoir : les textes sont justes d'emblée.

**Sans elle** — le cas le plus courant, et ce n'est pas grave : writer relève le ton
dans les textes du produit existant (tutoiement ou vouvoiement, registre,
longueur…), l'étiquette « non validé », et te propose en fin de sujet de le garder ici.

**Comment l'enrichir** : déposer la charte si elle arrive ; sinon, accepter ou non,
sujet après sujet, le ton que writer a relevé.

## `recette-recurrences.md` — le registre de recette

**À quoi il sert** : il compte les écarts qui reviennent d'une recette à l'autre, pour
vérifier ceux-là en premier.

**Comment le remplir** : jamais à la main. La recette le remplit, tu valides.
