#!/usr/bin/env node
'use strict';
/* Garde de fin de tour — hook `Stop`.

   Le trio (md-to-html, proto-frame, proto-shot) est branché sur PostToolUse
   Write|Edit : une écriture par SCRIPT (Bash, heredoc, générateur) ne le déclenche
   PAS — seul md-to-html la rattrape au passage d'un appel Bash —, et rien ne
   vérifie qu'une correction a été re-regardée. Des protos peuvent ainsi naître d'un
   script sans qu'aucun hook ne tire, et des corrections s'écrire sans qu'aucune soit
   revérifiée.

   Ce garde ne regarde pas COMMENT un fichier a été écrit — il regarde le DISQUE au
   moment où la tête s'apprête à conclure : il remet à niveau ce qui est en retard,
   puis force UN regard sur ce qu'il vient de produire. Portée : le sujet courant
   de la session (les sujets où elle a écrit), jamais les autres sujets actifs.

   TROIS INVARIANTS, dans cet ordre de priorité :
   1. Il ne bloque JAMAIS sur ce qu'il n'a pas produit. Navigateur absent, capture
      qui n'aboutit pas ⇒ aucune capture fraîche ⇒ exit 0 silencieux (la galerie
      porte déjà le signalement).
   2. Il ne bloque JAMAIS s'il ne peut pas s'en souvenir. Le tampon `.shots/.gate`
      est relu après écriture ; s'il n'a pas persisté (disque plein, droits), le
      garde renonce au blocage — mieux vaut un défaut manqué qu'une boucle.
   3. La remise à niveau, elle, a TOUJOURS lieu — blocage ou pas. Les artefacts ne
      restent jamais incohérents.

   Toute erreur ⇒ exit 0. Budget de temps borné : au-delà, on remet à niveau ce
   qu'on peut et on ne bloque pas.

   Ne jamais bloquer n'est pas se taire : une vérification que le garde n'a pas pu
   faire — outil introuvable ou en échec, module qui ne se charge pas, tampon qui ne
   persiste pas — se DIT au designer : aucun échec de vérification n'est
   silencieux. Un outil renommé ferait sinon taire le garde sans que personne le voie. */

const fs = require('fs'), path = require('path'), cp = require('child_process');

const ROOT = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const BUDGET_MS = 150000;          // au-delà : plus de régénération, plus de blocage
const PER_TOOL_MS = 60000;         // proto-shot borne déjà chaque capture à 20 s
const t0 = Date.now();

const log = m => process.stderr.write('[hydra-qa-gate] ' + m + '\n');
// Vérifications NON FAITES. Le stderr d'un Stop qui sort en 0 ne va qu'au journal de
// débogage : elles partent au designer par systemMessage (direEtSortir), une fois par
// panne et par session — une alarme répétée à chaque tour cesse d'être lue. Jamais un
// motif de blocage (invariant 1).
const pannes = [];
const panne = m => { log(m); if(!pannes.includes(m)) pannes.push(m); };
const raison = e => e && e.code === 'MODULE_NOT_FOUND' ? 'fichier introuvable'
  : String((e && e.message) || e).split('\n')[0];
const T   = f => { try { return fs.statSync(f).mtimeMs; } catch(e){ return 0; } };
const ls  = d => { try { return fs.readdirSync(d);    } catch(e){ return [];  } };

function subjects(){
  return ls(path.join(ROOT, 'topics'))
    // Un dossier préfixé d'un point est de la matière DORMANTE — même convention
    // que .src/ .shots/ .gate : archives de runs passés. Un proto qu'on n'a pas
    // touché depuis des semaines n'est pas une correction qui attend un second
    // regard : le garde n'a rien à y vérifier, et surtout rien à bloquer dessus.
    // Sans cette exclusion, il bloquerait sur une archive dont les protos, anciens,
    // n'ont jamais été capturés. « En retard » n'est pas « pertinent ».
    .filter(n => !n.startsWith('.'))
    .map(n => path.join(ROOT, 'topics', n))
    .filter(p => { try { return fs.statSync(p).isDirectory(); } catch(e){ return false; } });
}

// Un proto est EN RETARD si aucune capture, ou si la plus ANCIENNE de ses captures
// précède le proto (une seule vue périmée suffit : on ne regarde pas un jeu mixte).
function staleProtos(sub){
  const src = path.join(sub, 'explorations', '.src');
  const shots = path.join(sub, 'explorations', '.shots');
  return ls(src).filter(f => /\.html?$/i.test(f)).map(f => {
    const proto = path.join(src, f), base = f.replace(/\.html?$/i, '');
    const png = ls(shots).filter(s => s.startsWith(base + '-') && s.endsWith('.png'));
    const oldest = png.length ? Math.min(...png.map(s => T(path.join(shots, s)))) : 0;
    return { proto, base, mtime: T(proto), stale: oldest < T(proto) };
  }).filter(v => v.stale);
}

// Markdown de livrable jamais rendu ou plus récent que son .html : la définition vit
// dans md-to-html, qui rattrape aussi les écritures Bash au passage et en rend les
// lints. Import en échec ⇒ rien n'est vu en retard, et la panne se dit.
let staleDocs = () => [];
try {
  const f = require(path.join(__dirname, 'md-to-html.js')).staleDocs;
  if(typeof f !== 'function') throw new Error('staleDocs absent de ses exports');
  staleDocs = f;
} catch(e){ panne('livrables en retard non vérifiés — md-to-html.js ne se charge pas (' + raison(e) + ')'); }

// Les identifiants de ligne (<!--r:…-->) se lisent où ils se définissent : hydra-mesure,
// dont ils désignent le relevé et qui pose les marqueurs des captures annotées avec la
// même lecture. Import en échec ⇒ le contrôle qui en dépend se dit non vérifié.
let idsLigne = null;
try { idsLigne = require(path.join(__dirname, 'hydra-mesure.js')).idsLigne; } catch(e){}

function run(tool, arg){
  if(Date.now() - t0 > BUDGET_MS) return false;
  const f = path.join(__dirname, tool);   // à côté du garde, quel que soit le nom du dossier
  if(!fs.existsSync(f)){
    panne(tool + ' introuvable (' + path.relative(ROOT, f) + ') — ce qu\'il remet à niveau ne l\'est plus');
    return false;
  }
  try {
    cp.execFileSync(process.execPath, [f, arg], { stdio: 'ignore', timeout: PER_TOOL_MS });
    return true;
  } catch(e){
    // proto-shot sans navigateur échoue par construction : la galerie le dit déjà (invariant 1).
    if(tool !== 'proto-shot.js') panne(tool + ' en échec sur ' + path.relative(ROOT, arg) + ' ('
      + (e.signal ? 'interrompu après ' + PER_TOOL_MS / 1000 + ' s' : 'code ' + e.status) + ')');
    return false;
  }
}

// md-to-html est IDEMPOTENT : rendu inchangé ⇒ il n'écrit pas, donc le .html garde
// sa vieille date et le doc repasserait « en retard » à chaque tour. On avance la
// date après passage : le test se purge lui-même, sans tampon.
function touch(f){ try { const n = new Date(); fs.utimesSync(f, n, n); } catch(e){} }

// ---- tampon : un blocage par état de proto et par session, jamais deux ----------
function gateFile(sub){ return path.join(sub, 'explorations', '.shots', '.gate'); }
function gateRecette(sub){ return path.join(sub, '.mesures', '.gate'); }
function readStamp(f){
  try { const o = JSON.parse(fs.readFileSync(f, 'utf8')); return (o && typeof o === 'object') ? o : {}; }
  catch(e){ return {}; }                      // illisible ou corrompu ⇒ table vide
}
// Écrit PUIS relit : le blocage n'est autorisé que si le souvenir a persisté.
function writeStamp(f, obj, keys){
  try {
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f, JSON.stringify(obj));
  } catch(e){ return false; }
  const back = readStamp(f);
  return keys.every(k => Object.values(back).some(a => Array.isArray(a) && a.includes(k)));
}

// ---- lectures d'autres sujets : dites AU DESIGNER, une fois par état ------------
// Le signal de hydra-bilan va à l'agent seul (UserPromptSubmit) ; l'agent peut le
// recevoir sans le relayer. Le garde reprend la MÊME détection (exportée
// par hydra-bilan, jamais recopiée) et la dit lui-même, par systemMessage — la trace est
// ce message dans le transcript. Sans bloquer : le garde ne bloque que sur deux faits.
// Une fois par état : le tampon de session garde les sujets déjà dits ; un sujet de plus
// les redit tous, le même ensemble (ou un sous-ensemble) ne redit rien. Le tampon ne
// s'écrit qu'au moment où le message part (retenir).
function lecturesADire(tp, sid){
  let autres;
  try { autres = require(path.join(__dirname, 'hydra-bilan.js')).autresSujetsLus(tp, ROOT); }
  catch(e){ panne('lectures d\'autres sujets non vérifiées — hydra-bilan.js ne se charge pas (' + raison(e) + ')'); return null; }
  if(!autres.length) return null;
  const exemple = new Map();                               // sujet → premier chemin lu
  for(const [p, s] of autres) if(!exemple.has(s)) exemple.set(s, p);
  const noms = [...exemple.keys()].sort();
  const stamp = path.join(require('os').tmpdir(), 'hydra-garde-lectures-' + sid.replace(/[^\w-]/g, '') + '.txt');
  let deja = []; try { deja = fs.readFileSync(stamp, 'utf8').split('\n').filter(Boolean); } catch(e){}
  if(noms.every(n => deja.includes(n))) return null;
  const ex = noms.slice(0, 3).map(n => exemple.get(n));
  return {
    msg: 'Garde de fin de tour : cette session a lu ' + noms.length + ' autre(s) sujet(s) — ' + noms.join(', ')
      + ' (par exemple ' + ex.join(' · ') + '). La structure d\'un livrable vient des gabarits des skills, '
      + 'jamais d\'un autre sujet.',
    retenir: () => { try { fs.writeFileSync(stamp, [...new Set([...deja, ...noms])].join('\n')); } catch(e){} }
  };
}

// ---- livrable de recette : compteurs recalculés, lecture réconciliée ------------
// Une règle qui vit loin de l'artefact qu'elle façonne ne s'applique pas. Celle-ci vit ICI, au moment
// où le fichier est sur le disque et où la tête s'apprête à conclure — pas dans un
// skill lu au début du run et oublié à la fin.
// Un livrable de recette se reconnaît à sa LIGNE DE COMPTE, pas à son nom : un sujet
// qui n'en porte pas ne paie rien du tout.
//
// DEUX CONTRÔLES, DEUX RÉGIMES.
//  1. Les compteurs BLOQUENT. Le tableau est la vérité, la ligne de tête est une
//     affirmation ; elles concordent ou non, il n'y a pas de cas gris, et le
//     livrable part à un développeur. Une ligne de tête peut annoncer d'autres
//     comptes que ceux de son tableau.
//  2. La réconciliation SE DIT, elle n'arrête rien. Une entrée sans statut est une
//     valeur lue côté maquette dont personne n'a rendu compte — c'est la forme que
//     prend une valeur perdue en route. Mais le rapprochement a des cas gris, donc
//     stderr, une fois par session, jamais de blocage.
//
// CE QUI N'EST PAS COMPARÉ, ET POURQUOI : le NOMBRE d'entrées « derive » contre le
// NOMBRE de lignes du tableau. Ce n'est pas une identité — d'un run à l'autre, des
// dérives se scindent en plusieurs lignes et d'autres fusionnent en une. Le contrôle accuserait un rapport juste. Reste peut-être vérifiable, non
// implémenté : qu'un « attendu » relevé APPARAISSE quelque part dans la colonne
// Attendu. Demande une normalisation des valeurs (« N px » / « Npx ») que
// personne n'a calibrée ; tant qu'elle n'existe pas, ce serait du faux positif.
const CRANS = ['Majeur', 'Mineur'];   // hydra-recette § Sévérité : deux niveaux
// Une case qui ne contient qu'une coordonnée : « y = N px », « x = N px ».
const ABSOLU = /^[xy]\s*=\s*-?\d+(?:[.,]\d+)?\s*px$/;

// UNE implémentation, deux appelants : le garde (lecture seule, à la fin du tour) et
// md-to-html au rendu du livrable (opts.livrable = le texte qui vient d'être écrit ;
// opts.ecrire = inscrire le calcul des conformes dans le relevé de maquette). Le rendu
// est le seul canal qui parle à l'agent sans bloquer : un hook de fin de tour ne peut
// rien lui dire sans l'arrêter.
// Jeux de mesures. Une recette desktop + mobile d'un même écran range les mesures de
// chaque device dans `.mesures/<device>/` (build.json, maquette.json, annotations.json,
// journal du calcul). Au livrable, chaque zone « ## <zone> » porte une sous-partie par
// device, « ### Desktop », « ### Mobile » ; la forme « ## <Device> — <zone> » (une section
// par device) se lit aussi.
// Sans sous-dossier de mesures, `.mesures/` seul : la recette d'un seul device. Les mêmes
// fichiers à la racine pour deux devices s'écraseraient l'un l'autre, et les appariements
// du premier pointeraient dans le relevé du second — sans aucun message.
const slugTitre = s => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
function jeuxDeMesures(sub, t){
  const racine = path.join(sub, '.mesures');
  const devices = ls(racine).filter(d => !d.startsWith('.')
    && ['maquette.json', 'build.json'].some(f => fs.existsSync(path.join(racine, d, f))));
  if(!devices.length) return [{ device: null, dir: racine, texte: t }];
  return devices.map(d => ({ device: d, dir: path.join(racine, d), texte: sectionsDuDevice(t, d) }));
}
// Les lignes d'un device : ses sous-parties « ### <Device> » sous chaque zone, ou ses
// sections « ## <Device> — … ».
function sectionsDuDevice(t, d){
  const est = titre => { const s = slugTitre(titre); return s === d || s.startsWith(d + '-'); };
  const out = []; let zone = false, dedans = false;
  for(const l of t.split('\n')){
    const h2 = /^##\s+(.*)$/.exec(l), h3 = /^###\s+(.*)$/.exec(l);
    if(h2){ zone = est(h2[1]); dedans = zone; }
    else if(h3) dedans = zone || est(h3[1]);
    if(dedans) out.push(l);
  }
  return out.join('\n');
}

function recetteFaits(sub, opts = {}){
  const bloquants = [], dits = [];
  const fichiers = opts.livrable ? [opts.livrable] : ls(path.join(sub, '.src')).filter(f => /\.md$/i.test(f))
    .map(f => { let texte = ''; try { texte = fs.readFileSync(path.join(sub, '.src', f), 'utf8'); } catch(e){} return { nom: f, texte }; });
  for(const { nom: f, texte: t } of fichiers){
    // Le sujet est nommé : plusieurs recettes coexistent et leurs livrables portent
    // souvent le même nom de fichier.
    const ou = path.basename(sub) + '/' + f;
    // Un livrable de recette se reconnaît à sa ligne de compte, quelle que soit sa forme.
    if(!/^\*\*\d+ corrections?\*\*/m.test(t)) continue;

    // — contrôle 0 : l'en-tête porte les seuls champs du gabarit, puis le tableau. Un
    //   paragraphe de prose avant le premier tableau (avertissement sur la maquette,
    //   mode d'emploi des sévérités) est lu par le dev comme une réserve sur la liste.
    //   Restent licites en tête : « zone X non recettable : raison » et la déclaration
    //   du mode capture (hydra-recette § Quand on n'a qu'une capture).
    const prose = [];
    for(const l of t.split('\n')){
      const s = l.trim();
      if(/^\||^#{2,}\s/.test(s)) break;
      if(!s || /^#\s/.test(s) || /^\*\*Maquette :\*\*/.test(s) || /^\*\*\d+ corrections?\*\*/.test(s)
         || /^\*\*\d+ valeurs? vérifiées?/.test(s) || /non recettable|pas été recettés|non recettés/i.test(s)) continue;
      prose.push('« ' + s.replace(/\*\*/g, '').slice(0, 70) + (s.length > 70 ? '…' : '') + ' »');
    }
    if(prose.length) dits.push(ou + ' : ' + prose.length + ' paragraphe(s) de prose entre l\'en-tête et le '
      + 'premier tableau — ' + prose.join(' · ') + '. L\'en-tête porte les seuls champs du gabarit '
      + '(maquette, build, largeur, état, hors périmètre, compte), puis le tableau ; la recette ne juge ni la '
      + 'maquette ni son ancienneté.');

    const tete = /^\*\*(\d+) corrections?\*\*\s*—\s*(\d+) majeures?,\s*(\d+) mineures?/m.exec(t);
    // Une ligne de compte à trois niveaux (« N bloquantes, ») n'est pas reconnue, et le
    // livrable échapperait en silence à tout contrôle : elle se dit.
    // Les autres contrôles ne dépendent pas de sa forme : ils tournent quand même.
    if(!tete){
      dits.push(ou + ' : ligne de compte ' + (/^\*\*\d+ corrections?\*\*\s*—\s*\d+ bloquantes?,/m.test(t)
        ? 'à trois niveaux — le niveau Bloquant n\'existe plus (hydra-recette § Sévérité : Majeur, Mineur)'
        : 'hors gabarit (« N corrections — N majeures, N mineures »)') + ' ; les compteurs ne sont pas contrôlés');
    } else {
      // — contrôle 1a : les sévérités du tableau contre la ligne de tête
      const lignes = [...t.matchAll(/^\|\s*\d+\s*\|.*\|\s*(Bloquant|Majeur|Mineur)\s*\|\s*$/gm)];
      const vu = { Bloquant: 0, Majeur: 0, Mineur: 0 };
      for(const m of lignes) vu[m[1]]++;
      const dit = { total: +tete[1], Majeur: +tete[2], Mineur: +tete[3] };
      if(lignes.length !== dit.total || CRANS.some(c => vu[c] !== dit[c]))
        bloquants.push(ou + ' — annoncé ' + dit.total + ' (' + dit.Majeur + ' maj. / '
          + dit.Mineur + ' min.), compté au tableau ' + lignes.length + ' ('
          + vu.Majeur + ' / ' + vu.Mineur + (vu.Bloquant ? ' / ' + vu.Bloquant + ' « Bloquant », niveau retiré' : '') + ')');
    }

    // — contrôle 1 bis : une ligne dont l'attendu ET le constaté ne portent qu'une
    //   coordonnée absolue ne dit rien de l'élément, elle dit l'amont. La règle
    //   vit ici, sur le fichier fini, pas dans le skill lu au début du run. Elle ne
    //   bloque pas — une dérive de gabarit légitime peut prendre cette forme.
    //   Un fait par FICHIER, pas par ligne : la consigne est la même pour toutes,
    //   la répéter à chaque ligne la rend invisible.
    const nues = [];
    for(const m of t.matchAll(/^\|\s*(\d+)\s*\|[^|]*\|[^|]*\|([^|]*)\|([^|]*)\|/gm))
      if(ABSOLU.test(m[2].trim()) && ABSOLU.test(m[3].trim()))
        nues.push(m[1] + ' (' + m[2].trim() + ' → ' + m[3].trim() + ')');
    if(nues.length)
      dits.push(ou + ' : ' + nues.length + ' ligne(s) ne portent qu\'une coordonnée '
        + 'absolue — ' + nues.join(' · ') + '. Une coordonnée absolue hérite de tout '
        + 'l\'amont : remonte le RANG dans l\'ordre, l\'ÉCART au frère ou le DÉCALAGE '
        + 'au parent, et la faute d\'amont une seule fois là où elle naît, en hauteur '
        + 'ou en marge.');

    // — contrôle 1 ter : une case Élément qui affiche un chemin CSS ne localise rien
    //   pour le dev, seul destinataire du livrable. La règle vit
    //   ici, sur le fichier fini. Elle ne bloque pas — des éléments, surtout des
    //   conteneurs, n'ont réellement aucune ancre, et la ligne a le droit de le dire.
    const sansAncre = [];
    for(const m of t.matchAll(/^\|\s*(\d+)\s*\|([^|]*)\|/gm)){
      // L'identifiant de ligne (<!--r:N-->, <!--r:N,M-->, ou un chemin complet, qui peut
      // porter un « > ») clôt la case : retiré avant le test, sans quoi la case ne finit
      // jamais par un backtick et le contrôle ne tire pas.
      const c = m[2].replace(/\s*<!--r:.*?-->\s*/g, ' ').trim();
      // Un repère du relevé mis entre backticks n'est pas un chemin : ses formes
      // (« texte », aria-label : …, alt : …) se reconnaissent à leur tête.
      // Un chemin CSS visible, seul ou suivi d'une description : il ne désigne rien dans
      // le code du dev et alourdit la ligne. Le chemin, s'il
      // sert, va dans l'identifiant caché.
      const chemins = [...c.matchAll(/`([^`]*)`/g)].map(x => x[1]).filter(x => !x.startsWith('#')
        && !/^(«|(aria-label|alt|title|href|image) : )/.test(x)
        && (/\s>\s/.test(x) || /^[a-z][a-z0-9]*\.[\w:-]/.test(x)));
      if(chemins.length) sansAncre.push(m[1] + ' (`' + chemins[0] + '`)');
    }
    if(sansAncre.length)
      dits.push(ou + ' : ' + sansAncre.length + ' ligne(s) affichent un chemin CSS '
        + '— ' + sansAncre.join(' · ') + '. Un chemin utilitaire ne désigne rien dans le '
        + 'code du dev : reprends le REPÈRE du relevé (id, libellé, aria-label), et '
        + 'si l\'élément n\'en a aucun, décris-le en mots courts ; le chemin, s\'il sert, va '
        + 'dans l\'identifiant caché <!--r:…-->.');
    // L'interligne ne se recette pas.
    const interlignes = [...t.matchAll(/^\|\s*(\d+)\s*\|[^|]*\|\s*interligne\s*\|/gim)].map(m => m[1]);
    if(interlignes.length)
      dits.push(ou + ' : ' + interlignes.length + ' ligne(s) sur l\'interligne (' + interlignes.slice(0, 8).join(', ')
        + (interlignes.length > 8 ? '…' : '') + ') — l\'interligne ne se recette pas : retire ces lignes.');

    // — contrôle 1b : aucun « conforme » au livrable, pas même le compte. Les conformes
    //   vivent dans le relevé de maquette, pour le travail.
    if(/^\*\*\d+ valeurs? vérifiées? conformes?\*\*/m.test(t))
      dits.push(ou + ' : ligne « valeurs vérifiées conformes » — le compte des conformes ne va '
        + 'plus au livrable (hydra-recette § Format de sortie)');

    const noeudsCatalogue = [];
    for(const J of jeuxDeMesures(sub, t)){
      const ouJ = ou + (J.device ? ' [' + J.device + ']' : '');
      if(J.device && !J.texte.trim())
        dits.push(ouJ + ' : aucune section « ## ' + J.device + ' — … » au livrable — ses dérives '
          + 'calculées ne se rapprochent d\'aucune ligne');
      const mq = path.join(J.dir, 'maquette.json');
      if(!fs.existsSync(mq)){
        dits.push(ouJ + ' : aucun relevé de maquette à côté — la réconciliation entre ce '
          + 'qui a été lu et ce qui a été écrit n\'a pas eu lieu');
        continue;
      }
      let e = null;
      try { e = JSON.parse(fs.readFileSync(mq, 'utf8')); }
      catch(x){ dits.push(ouJ + ' : relevé de maquette illisible (' + x.message + ')'); continue; }
      if(!Array.isArray(e)){ dits.push(ouJ + ' : relevé de maquette mal formé (tableau attendu)'); continue; }

      // — contrôle 1 quater : chaque capture annotée produite (hydra-mesure --annoter) est
      //   liée dans le livrable — une image que personne ne lie n'arrive pas au dev.
      let annot = null; try { annot = JSON.parse(fs.readFileSync(path.join(J.dir, 'annotations.json'), 'utf8')); } catch(x){}
      if(annot && annot.livrable && path.basename(annot.livrable) === f){
        const nonLiees = (annot.images || []).filter(i => i.fichier && !t.includes(i.fichier)).map(i => i.section + ' (' + i.fichier + ')');
        if(nonLiees.length) dits.push(ouJ + ' : ' + nonLiees.length + ' capture(s) annotée(s) non liée(s) en tête de '
          + 'leur section — ' + nonLiees.join(' · '));
      }

      // — contrôle 2 : le statut « conforme » se CALCULE. Chaque valeur attendue appariée à
      //   un élément du relevé du build (champ `build` : index, ou chemin complet) est
      //   comparée à la valeur relevée ; l'agent ne pose que les dérives qu'il voit au-delà
      //   (visuel, absences) et le hors-périmètre. Le calcul s'écrit dans le relevé de
      //   maquette quand l'appelant le demande (rendu du livrable), jamais ici au garde.
      const bj = path.join(J.dir, 'build.json');
      let releve = null; try { releve = JSON.parse(fs.readFileSync(bj, 'utf8')); } catch(x){}
      const els = releve && Array.isArray(releve.elements) ? releve.elements : null;
      if(!els) dits.push(ouJ + ' : relevé du build illisible ou absent (' + path.relative(sub, bj)
        + ') — aucun statut « conforme » ne peut se calculer');
      if(!idsLigne) dits.push(ouJ + ' : identifiants de ligne non lus (hydra-mesure.js introuvable ou en erreur) '
        + '— le contrôle « dérive calculée sans ligne » ne tourne pas');
      const lignesIds = idsLigne ? [...J.texte.matchAll(/^\|\s*(\d+)\s*\|([^|]*)\|([^|]*)\|/gm)].map(m => ({
        n: +m[1], ids: idsLigne(m[2]), prop: canonProp(m[3]) })) : null;
      const fauxConformes = [], sansLigne = [], nonComparees = [], mainConformes = [];
      let calcules = 0;
      // Pour le journal du calcul : chaque entrée telle que l'agent l'a laissée (lue AVANT que
      // le calcul la réécrive), et ce que le calcul en donne.
      const avaitCalcul = e.some(x => x && typeof x === 'object' && (x.calcule || x.releve !== undefined));
      const lues = [], rangs = {};
      e.forEach((x, i) => {
        if(!x || typeof x !== 'object') { nonComparees.push('#' + i + ' (entrée mal formée)'); return; }
        const nom = '#' + i + ' ' + (x.element || '?') + ' / ' + (x.propriete || '?');
        const el = els ? elementDe(els, x.build) : null;
        const c = el ? comparer(x.propriete, x.attendu, el) : null;
        const cle = cleJournal(x);
        lues.push({ cle, rang: rangs[cle] = (rangs[cle] || 0) + 1, el, c,
          x: { attendu: x.attendu, build: x.build, statut: x.statut, calcule: x.calcule, releve: x.releve } });
        if(c){
          calcules++;
          if(x.statut === 'conforme' && !x.calcule && c.statut === 'derive') fauxConformes.push(nom + ' : ' + x.attendu + ' attendu, ' + c.releve + ' relevé');
          if(c.statut === 'derive' && lignesIds){
            const cle = String(x.build), pe = canonProp(x.propriete);
            const vue = lignesIds.some(l => l.ids.includes(cle) && (l.prop === pe || memeBoite(l.prop, pe)));
            if(!vue) sansLigne.push(nom + ' : ' + x.attendu + ' → ' + c.releve);
          }
          if(opts.ecrire){ x.statut = c.statut; x.calcule = true; x.releve = c.releve; }
          return;
        }
        if(x.statut === 'conforme' && !x.calcule) mainConformes.push(nom);
        else if(x.statut !== 'derive' && x.statut !== 'hors-perimetre') nonComparees.push(nom);
      });
      if(opts.ecrire && calcules) try { fs.writeFileSync(mq, JSON.stringify(e, null, 1)); } catch(x){}
      // — contrôle 3 : les dérives calculées d'un calcul précédent sont-elles toujours là ?
      //   Relevé du build illisible ⇒ rien ne se calcule, et tout passerait pour détaché : le
      //   contrôle ne tourne pas (la ligne « relevé du build illisible » le dit déjà).
      if(els) try { dits.push(...suivreJournal(sub, J.dir, ouJ, lues, avaitCalcul, !!opts.ecrire, calcules)); }
      catch(x){ dits.push(ouJ + ' : journal du calcul non vérifié (' + x.message + ')'); }
      const liste = (a, k = 12) => a.slice(0, k).join(' · ') + (a.length > k ? ' · … (+' + (a.length - k) + ')' : '');
      // — contrôle 4 : le catalogue de variables de CE device. Les valeurs légales d'un cadre
      //   ne valent pas pour un autre : une recette qui lit le catalogue du desktop seul
      //   sort en mobile des corrections qui n'existent pas. Le catalogue
      //   lu s'écrit par device (variables.json, hydra-recette § Méthode) ; une valeur
      //   attendue que le catalogue de son device contredit se dit. Seules les valeurs
      //   simples se confrontent (couleur, nombre) : un style composite ne se lit pas ici.
      if(J.device){
        const vf = path.join(J.dir, 'variables.json');
        let cat = null; try { cat = JSON.parse(fs.readFileSync(vf, 'utf8')); } catch(x){}
        if(!cat || typeof cat !== 'object' || !cat.variables || typeof cat.variables !== 'object')
          dits.push(ouJ + ' : aucun catalogue de variables écrit pour ce device (' + path.relative(sub, vf)
            + ') — les valeurs légales d\'un cadre ne valent pas pour l\'autre : lis le catalogue sur le cadre '
            + 'de ce device, écris-le, et revérifie ses lignes');
        else {
          if(cat.noeud) noeudsCatalogue.push([J.device, String(cat.noeud)]);
          const vars = new Map(Object.entries(cat.variables).map(([k, v]) => [nomJeton(k), v]));
          const contraires = [];
          e.forEach((x, i) => {
            if(!x || typeof x !== 'object' || !x.jeton) return;
            const v = vars.get(nomJeton(x.jeton));
            if(v !== undefined && seContredisent(v, x.attendu))
              contraires.push('#' + i + ' ' + (x.element || '?') + ' / ' + (x.propriete || '?') + ' : '
                + x.attendu + ' attendu, ' + x.jeton + ' = ' + v + ' au catalogue');
          });
          if(contraires.length) dits.push(ouJ + ' : ' + contraires.length + ' valeur(s) attendue(s) contredite(s) par '
            + 'le catalogue de variables de ce device — ' + liste(contraires) + '. Reprends la valeur du catalogue '
            + 'de CE device, puis revérifie la ligne.');
        }
      }
      // — contrôle 5 : le même état des deux côtés. Un élément désactivé au build comparé à
      //   un élément actif en maquette donne des dérives qui n'en sont pas (un bouton de
      //   validation actif en maquette, inactif au build tant que rien n'est saisi). Le relevé
      //   du build marque l'élément inactif ; l'entrée de maquette qui montre aussi l'état
      //   inactif le dit par son champ etat. Une question, pas un verdict : la ligne peut
      //   être juste.
      if(els && lignesIds){
        const inactifs = new Set(); els.forEach((x, i) => { if(x && x.inactif) inactifs.add(String(i)); });
        const memeEtat = new Set(e.filter(x => x && /inactif|d[ée]sactiv|disabled/i.test(String(x.etat || '')))
          .map(x => String(x.build)));
        const douteuses = lignesIds.filter(l => l.ids.some(id => inactifs.has(String(id)) && !memeEtat.has(String(id))))
          .map(l => String(l.n));
        if(douteuses.length) dits.push(ouJ + ' : ' + douteuses.length + ' ligne(s) portent sur un élément désactivé '
          + 'au build (' + douteuses.slice(0, 8).join(', ') + (douteuses.length > 8 ? '…' : '') + ') — la maquette '
          + 'le montre-t-elle dans le même état ? Deux états différents ne se comparent pas : relève l\'état '
          + 'équivalent, ou pose hors-perimetre ; si la maquette le montre aussi inactif, écris etat: "inactif" '
          + 'sur son entrée.');
      }
      if(fauxConformes.length) dits.push(ouJ + ' : ' + fauxConformes.length + ' valeur(s) marquée(s) '
        + '« conforme » à la main que le calcul donne en dérive — ' + liste(fauxConformes));
      if(mainConformes.length) dits.push(ouJ + ' : ' + mainConformes.length + ' « conforme » posé(s) à '
        + 'la main sans comparaison possible — un conforme se calcule, il ne se déclare pas : '
        + 'apparie l\'entrée au relevé (champ build) ou pose derive / hors-perimetre — ' + liste(mainConformes));
      if(sansLigne.length) dits.push(ouJ + ' : ' + sansLigne.length + ' dérive(s) calculée(s) sans ligne '
        + 'au livrable (aucune ligne ne porte l\'identifiant de l\'élément pour cette propriété) — ' + liste(sansLigne));
      if(nonComparees.length) dits.push(ouJ + ' : ' + nonComparees.length + ' valeur(s) attendue(s) non '
        + 'comparée(s) — ni conforme ni dérive : sans élément apparié au relevé du build, ou propriété '
        + 'que le calcul ne sait pas comparer, et sans statut posé — ' + liste(nonComparees));
    }
    // Deux devices, un seul cadre lu pour le catalogue : celui d'un device a servi pour l'autre.
    const parNoeud = new Map();
    for(const [d, n] of noeudsCatalogue) parNoeud.set(n, [...(parNoeud.get(n) || []), d]);
    for(const [n, ds] of parNoeud) if(ds.length > 1)
      dits.push(ou + ' : le catalogue de variables de ' + ds.join(' et ') + ' vient du même cadre (' + n
        + ') — lis-le sur le cadre de chaque device.');
  }
  return { bloquants, dits };
}
// Nom de jeton comparable des deux côtés : « var(--Font size/Body, 16px) » et
// « Font size/Body » désignent la même variable.
function nomJeton(s){
  return String(s).replace(/^\s*var\(\s*(--)?/i, '').replace(/,.*$|\)\s*$/g, '').trim().toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
// Vrai seulement quand les deux valeurs se lisent et diffèrent : couleur contre couleur,
// nombre contre nombre. Un style composite ou une valeur illisible ne contredit rien.
function seContredisent(cat, attendu){
  const c = String(cat).trim();
  if(/[(:]/.test(c) && !/^(#|rgba?\()/i.test(c)) return false;
  const h1 = hex(c), h2 = hex(attendu);
  if(h1 && h2) return h1 !== h2;
  if(h1 || h2) return false;
  if(!/^-?\d+(?:[.,]\d+)?\s*(px)?$/i.test(c)) return false;
  const n1 = px(c), n2 = px(attendu);
  return !isNaN(n1) && !isNaN(n2) && Math.abs(n1 - n2) > 0.01;
}

// —— calcul du conforme ————————————————————————————————————————————————————————
// Propriété de maquette → clé du relevé du build. Ce qui n'est pas ici ne se calcule
// pas (présence, ordre, disposition…) : l'agent le juge et le pose.
const CLES = { taille: 'taille', couleur: 'couleur', fond: 'fond', graisse: 'graisse',
  interligne: 'interligne', police: 'police', rayon: 'rayon', hauteur: 'h', largeur: 'l',
  dimensions: 'lh', bordure: 'bordure', interieur: 'interieur', texte: 'texte' };
function canonProp(p){
  const s = String(p || '').toLowerCase().replace(/<!--.*?-->/g, '').trim();
  if(/^couleur (du )?texte$|^couleur$/.test(s)) return 'couleur';
  if(/bordure/.test(s)) return 'bordure';
  if(/^(libellé|texte|wording)$/.test(s)) return 'texte';
  if(/^marge interne$|^padding$/.test(s)) return 'interieur';
  return s;
}
// hauteur, largeur et dimensions décrivent la même boîte : une ligne « dimensions » porte
// une dérive de hauteur.
const BOITE = ['hauteur', 'largeur', 'dimensions'];
const memeBoite = (a, b) => BOITE.includes(a) && BOITE.includes(b);
function elementDe(els, id){
  if(id === undefined || id === null || id === '') return null;
  if(/^\d+$/.test(String(id))) return els[+id] || null;
  return els.find(x => x && x.chemin === id) || null;
}
const px = v => { const m = /-?\d+(?:[.,]\d+)?(?:e[+-]?\d+)?/i.exec(String(v)); return m ? parseFloat(m[0].replace(',', '.')) : NaN; };
function hex(v){
  const s = String(v || '').trim().toLowerCase();
  let m = /#([0-9a-f]{6})\b/.exec(s); if(m) return '#' + m[1];
  m = /#([0-9a-f]{3})\b/.exec(s); if(m) return '#' + m[1].split('').map(c => c + c).join('');
  m = /rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)(?:[,\s/]+([\d.]+))?/.exec(s);
  if(m) return (m[4] !== undefined && +m[4] === 0) ? 'transparent'
    : '#' + [m[1], m[2], m[3]].map(n => (+n).toString(16).padStart(2, '0')).join('');
  return /aucune|transparent|none/.test(s) ? 'transparent' : null;
}
const GRAISSES = { thin: 100, light: 300, regular: 400, normal: 400, medium: 500, semibold: 600, bold: 700, extrabold: 800, black: 900 };
function graisse(v){ const n = px(v); if(!isNaN(n)) return n;
  const k = String(v).toLowerCase().replace(/[\s-]/g, ''); return GRAISSES[k] || null; }
function quatre(v){ const n = String(v).match(/-?[\d.]+/g) || []; const a = n.map(Number);
  if(!a.length) return null; const [t, r = t, b = t, l = r] = a; return [t, r, b, l]; }
// Rend { statut: 'conforme'|'derive', releve } ou null (ne se compare pas).
function comparer(prop, attendu, el){
  const k = CLES[canonProp(prop)]; if(!k || attendu === undefined || attendu === null) return null;
  const a = String(attendu);
  const verdict = (ok, releve) => ({ statut: ok ? 'conforme' : 'derive', releve });
  if(['taille', 'interligne', 'rayon', 'h', 'l'].includes(k)){
    const va = px(a), vb = px(el[k]); if(isNaN(va) || isNaN(vb) || /→|dégradé/.test(a)) return null;
    return verdict(Math.abs(va - vb) <= 0.5, (k === 'h' || k === 'l') ? vb + 'px' : el[k]);
  }
  if(k === 'lh'){ const m = /(\d+(?:[.,]\d+)?)\s*[×x]\s*(\d+(?:[.,]\d+)?)/.exec(a); if(!m) return null;
    return verdict(Math.abs(px(m[1]) - el.l) <= 0.5 && Math.abs(px(m[2]) - el.h) <= 0.5, el.l + '×' + el.h); }
  if(k === 'couleur' || k === 'fond'){ const ha = hex(a), hb = hex(el[k]); if(!ha || !hb || /dégradé|→/.test(a)) return null;
    return verdict(ha === hb, hb); }
  if(k === 'graisse'){ const ga = graisse(a), gb = graisse(el.graisse); if(!ga || !gb) return null; return verdict(ga === gb, String(gb)); }
  if(k === 'police'){ const f = s => String(s).toLowerCase().split(/[\s,-]/)[0].replace(/["']/g, '');
    return verdict(f(a) === f(el.police), el.police); }
  if(k === 'bordure'){
    const wa = /aucune|none/i.test(a) ? 0 : px(a), wb = px(el.bordure);
    if(isNaN(wa) || isNaN(wb)) return null;
    const ca = wa ? hex(a) : null, cb = wb ? hex(el.bordure) : null;
    if(wa && !ca) return null;
    return verdict(Math.abs(wa - wb) <= 0.5 && (!wa || ca === cb), el.bordure);
  }
  if(k === 'interieur'){ const qa = quatre(a), qb = quatre(el.interieur); if(!qa || !qb) return null;
    return verdict(qa.every((v, i) => Math.abs(v - qb[i]) <= 0.5), el.interieur); }
  if(k === 'texte'){ const n = s => String(s).replace(/\s+/g, ' ').trim(); if(!el.texte) return null;
    return verdict(n(a) === n(el.texte), el.texte); }
  return null;
}

// —— journal du calcul ————————————————————————————————————————————————————————
// Le calcul relit le relevé de maquette tel que l'agent l'a laissé : une dérive calculée
// dont l'entrée est supprimée, détachée du build ou passée hors périmètre disparaîtrait
// sans que rien le dise — un script peut ainsi effacer une dérive calculée, en supprimant
// son entrée ou en la détachant et la vidant de ses champs de calcul.
// Le journal garde chaque dérive calculée — ce qui l'identifie (nœud, élément, propriété)
// et ce qui a été calculé (attendu, constaté). Il n'est écrit que par ce calcul, au rendu
// (opts.ecrire), à côté du relevé de maquette. Une dérive du journal qui n'est plus une
// dérive calculée SE DIT, sans bloquer (le garde ne bloque que sur deux faits). Le cas
// légitime — une valeur de maquette mal transcrite, corrigée — se dit aussi : c'est au
// designer d'en juger, pas au calcul.
// Dit une fois : au rendu, le journal retient ce qu'il a dit (`dit`) et ne le redit pas tant
// que rien n'a changé ; au garde, qui n'écrit rien, son tampon de session fait cet office.
const JOURNAL = 'journal-calcul.json';
const cleJournal = x => JSON.stringify([x.noeud, x.element, x.propriete].map(v => v === undefined ? null : v));
// Ce qui a changé pour une dérive du journal ; null si elle est toujours une dérive calculée.
function changement(d, l){
  if(!l) return 'entrée supprimée du relevé de maquette';
  if(l.c && l.c.statut === 'derive') return null;
  const q = [];
  if(l.c){
    if(String(l.x.attendu) !== String(d.attendu)) q.push('attendu ' + d.attendu + ' → ' + l.x.attendu);
    if(String(l.c.releve) !== String(d.constate)) q.push('constaté ' + d.constate + ' → ' + l.c.releve);
    return 'calculée conforme' + (q.length ? ' (' + q.join(', ') + ')' : '');
  }
  if(l.x.build === undefined || l.x.build === null || l.x.build === '') q.push('détachée du build');
  else if(!l.el) q.push('build ' + l.x.build + ' introuvable au relevé');
  else q.push('ne se compare plus (attendu « ' + l.x.attendu + ' »)');
  if(l.x.statut && l.x.statut !== 'derive') q.push('statut « ' + l.x.statut + ' »');
  if(!l.x.calcule && l.x.releve === undefined) q.push('champs de calcul effacés');
  return q.join(', ');
}
function suivreJournal(sub, dir, ou, lues, avaitCalcul, ecrire, calcules){
  const f = path.join(dir, JOURNAL), rel = path.relative(sub, f), dits = [];
  let j = null;
  const present = fs.existsSync(f);
  if(present){
    try { j = JSON.parse(fs.readFileSync(f, 'utf8')); } catch(x){ return [ou + ' : journal du calcul illisible (' + rel + ', ' + x.message + ') — les dérives calculées ne sont plus suivies']; }
    if(!j || !Array.isArray(j.derives)) return [ou + ' : journal du calcul mal formé (' + rel + ') — les dérives calculées ne sont plus suivies'];
  } else if(avaitCalcul) dits.push(ou + ' : relevé de maquette déjà calculé, sans journal du calcul (' + rel
    + ') — une dérive calculée puis effacée du relevé ne peut pas se voir');
  const derives = j ? j.derives : [];
  const ici = new Map(lues.map(l => [l.cle + '#' + l.rang, l]));
  const changes = [];
  for(const d of derives){
    const l = ici.get(d.cle + '#' + d.rang), quoi = changement(d, l);
    // Toujours une dérive : le journal suit le dernier calcul, et la dérive pourra se redire.
    if(!quoi){ Object.assign(d, { attendu: l.x.attendu, constate: l.c.releve, build: l.x.build, dit: null }); continue; }
    if(ecrire && d.dit === quoi) continue;                  // dit au rendu, rien n'a changé depuis
    const [, element, propriete] = JSON.parse(d.cle);
    changes.push((element || '?') + ' / ' + (propriete || '?') + ' (calculé : attendu ' + d.attendu
      + ', constaté ' + d.constate + ') — ' + quoi);
    d.dit = quoi;
  }
  // Une dérive calculée nouvelle entre au journal sans rien dire : c'est un constat, pas un écart.
  const connues = new Set(derives.map(d => d.cle + '#' + d.rang));
  for(const l of lues) if(l.c && l.c.statut === 'derive' && !connues.has(l.cle + '#' + l.rang))
    derives.push({ cle: l.cle, rang: l.rang, attendu: l.x.attendu, constate: l.c.releve, build: l.x.build, dit: null });
  if(ecrire && (calcules || present)) try {
    fs.writeFileSync(f, JSON.stringify({ ecrit_par: 'hydra-qa-gate, au calcul du rendu du livrable — ne pas éditer', derives }, null, 1));
  } catch(x){ dits.push(ou + ' : journal du calcul non écrit (' + x.message + ')'); }
  if(changes.length) dits.push(ou + ' : ' + changes.length + ' dérive(s) calculée(s) qui ne le sont plus depuis leur '
    + 'calcul — ' + changes.join(' · ') + '. À dire au designer : c\'est lui qui juge si l\'écart a disparu pour une bonne raison.');
  return dits;
}

// md-to-html importe la réconciliation pour la dire au rendu du livrable.
module.exports = { recetteFaits };
let raw = '';
// Seule sortie du garde : ajoute au message pour le designer les pannes qu'il n'a pas
// encore entendues dans cette session (tampon de session, comme les lectures).
function direEtSortir(sortie, sid){
  const stamp = path.join(require('os').tmpdir(), 'hydra-garde-pannes-' + sid.replace(/[^\w-]/g, '') + '.txt');
  let deja = []; try { deja = fs.readFileSync(stamp, 'utf8').split('\n').filter(Boolean); } catch(e){}
  const neuves = pannes.filter(m => !deja.includes(m));
  if(neuves.length){
    try { fs.writeFileSync(stamp, [...deja, ...neuves].join('\n')); } catch(e){}
    const msg = 'Garde de fin de tour — vérification(s) non faite(s) :\n· ' + neuves.join('\n· ');
    sortie = { ...sortie, systemMessage: [sortie.systemMessage, msg].filter(Boolean).join('\n') };
  }
  if(Object.keys(sortie).length) process.stdout.write(JSON.stringify(sortie));
  process.exit(0);
}

if(require.main === module){
process.stdin.setEncoding('utf8');
process.stdin.on('data', d => raw += d);
process.stdin.on('end', () => {
  let payload = {}; try { payload = JSON.parse(raw) || {}; } catch(e){}
  const sid = String(payload.session_id || '-');
  const fresh = [], toLook = [], recette = [], assetsVus = new Set();

  // Le SUJET COURANT seulement — le même fait que les balayages Bash (hydra-bilan,
  // sujetsCourants : les sujets où la session a écrit). Deux runs parallèles sur deux
  // sujets : le garde de l'un ne capture, ne rend et ne bloque rien chez l'autre, et ne
  // désarme pas son garde en rafraîchissant ses captures à sa place.
  // Non établi : aucun blocage, et ça se dit une fois par session — au designer, seul
  // canal d'un Stop qui ne bloque pas —, s'il y avait quelque chose à regarder.
  let courants = new Set();
  try { courants = require(path.join(__dirname, 'hydra-bilan.js')).sujetsCourants(payload.transcript_path, ROOT); }
  catch(e){ panne('sujet courant non établi — hydra-bilan.js en échec (' + raison(e) + ')'); }
  const lus = lecturesADire(payload.transcript_path, sid);
  if(!courants.size){
    const enAttente = subjects().filter(s => staleDocs(s).length || staleProtos(s).length
      || recetteFaits(s).bloquants.length).map(s => path.basename(s));
    const stamp = path.join(require('os').tmpdir(), 'hydra-garde-non-etabli-' + sid.replace(/[^\w-]/g, '') + '.txt');
    const dits = [];
    if(enAttente.length && !fs.existsSync(stamp)){
      try { fs.writeFileSync(stamp, '1'); } catch(e){}
      const msg = 'Garde de fin de tour : sujet courant non établi (aucun fichier écrit par Write/Edit '
        + 'sous topics/ dans cette session) — rien n\'est contrôlé ni bloqué ; ' + enAttente.length
        + ' sujet(s) actif(s) ont des captures, rendus ou compteurs en attente.';
      log(msg);
      dits.push(msg);
    }
    if(lus){ log(lus.msg); dits.push(lus.msg); lus.retenir(); }
    direEtSortir(dits.length ? { systemMessage: dits.join('\n') } : {}, sid);
  }

  for(const sub of subjects().filter(s => courants.has(path.basename(s).normalize('NFC')))){
    // 1. remise à niveau des livrables — TOUJOURS, jamais source de blocage
    for(const md of staleDocs(sub)){
      if(run('md-to-html.js', md)){
        const html = path.join(sub, path.basename(md).replace(/\.md$/i, '.html'));
        if(fs.existsSync(html)) touch(html);
      }
    }

    // 1 bis. contrôles du livrable de recette — LECTURE SEULE, aucune écriture dans
    // le livrable : le garde constate, la tête corrige. La faute reste où elle a
    // été commise.
    const rec = recetteFaits(sub);
    if(rec.bloquants.length || rec.dits.length){
      const st = readStamp(gateRecette(sub));
      const vus = Array.isArray(st[sid]) ? st[sid] : [];
      // LA CLÉ EST L'ÉTAT CONSTATÉ, pas le sujet ni le fichier. Trois conséquences :
      // le MÊME défaut ne rebloque pas (clé déjà vue) ; un défaut
      // DIFFÉRENT rebloque (clé neuve) ; un défaut CORRIGÉ ne produit plus de fait,
      // donc plus de clé, donc plus rien — l'extinction n'a besoin d'aucun oubli.
      const cles = [...rec.bloquants, ...rec.dits].map(m => 'r:' + m);
      const neufs = cles.filter(k => !vus.includes(k));
      if(neufs.length){
        st[sid] = [...new Set([...vus, ...cles])];
        if(writeStamp(gateRecette(sub), st, cles)){
          for(const d of rec.dits)      if(neufs.includes('r:' + d)) log(d);
          for(const b of rec.bloquants) if(neufs.includes('r:' + b)) recette.push(b);
        } else {
          // Invariant 2 : pas de mémoire, pas de blocage. Les faits se disent quand même.
          panne('tampon non persisté (' + path.relative(ROOT, gateRecette(sub)) + ') — blocage de recette abandonné');
          for(const m of [...rec.dits, ...rec.bloquants]) log(m);
        }
      }
    }

    // 2. remise à niveau des captures
    const stale = staleProtos(sub);
    if(!stale.length) continue;
    for(const v of stale) run('proto-shot.js', v.proto);
    run('proto-frame.js', stale[0].proto);

    // 3. ce qui a RÉELLEMENT été produit après l'écriture du proto
    const shots = path.join(sub, 'explorations', '.shots');
    const stamp = readStamp(gateFile(sub));
    const seen = Array.isArray(stamp[sid]) ? stamp[sid] : [];
    const keys = [], candidates = [];
    for(const v of stale){
      const made = ls(shots).filter(s => s.startsWith(v.base + '-') && s.endsWith('.png')
                                      && T(path.join(shots, s)) >= v.mtime);
      if(!made.length) continue;               // invariant 1 : rien produit, rien à regarder
      fresh.push(...made.map(s => path.relative(ROOT, path.join(shots, s))));
      const k = v.base + '@' + Math.round(v.mtime);
      keys.push(k);
      if(!seen.includes(k)) candidates.push(v.base);
    }
    if(!keys.length) continue;

    stamp[sid] = [...new Set([...seen, ...keys])];
    if(!writeStamp(gateFile(sub), stamp, keys)){        // invariant 2 : pas de mémoire, pas de blocage
      panne('tampon non persisté (' + path.relative(ROOT, gateFile(sub)) + ') — remise à niveau faite, blocage abandonné');
      continue;
    }
    toLook.push(...candidates);
    // Assets que ces protos AFFICHENT depuis refs/ : lus dans le proto, pas au brief — c'est
    // ce que la capture montre. Un export réussi peut rendre le voisin sous le bon nom.
    for(const v of stale) if(candidates.includes(v.base)){
      let h = ''; try { h = fs.readFileSync(v.proto, 'utf8'); } catch(e){}
      for(const m of h.match(/refs\/(?:[\w.-]+\/)*[\w.-]+\.(?:svg|png|jpe?g|webp|gif|avif)/gi) || [])
        assetsVus.add(m);
    }
  }

  // Les lectures d'autres sujets ne bloquent jamais : elles partent au designer par
  // systemMessage, seules, ou À CÔTÉ d'un blocage — jamais dans sa raison, qui reste celle
  // des deux faits bloquants et que l'agent lit seule.
  if(lus){ log(lus.msg); lus.retenir(); }
  const aDire = lus ? { systemMessage: lus.msg } : {};
  if((!toLook.length && !recette.length) || payload.stop_hook_active
     || Date.now() - t0 > BUDGET_MS){
    direEtSortir(aDire, sid);
  }

  const motifs = [];
  if(recette.length) motifs.push(
    'Livrable de recette — la ligne de compte ne dit pas ce que porte le disque :\n· '
    + recette.join('\n· ')
    + '\nLe tableau et le relevé de maquette font foi ; la ligne de tête est une '
    + 'affirmation. Corrige la ligne, pas le tableau — et ne recompte pas à la main.');
  if(toLook.length) motifs.push(
    'Captures (re)faites après tes dernières écritures : ' + fresh.join(' · ') +
    '\nRegarde-les avant de conclure. Le second regard est FERMÉ (hydra-maquette § QA en ' +
    'passes bornées) : une ligne par correction du lot, et pour chacune « l\'EXIGENCE ' +
    'tient-elle », jamais « le correctif est-il appliqué ». Un défaut découvert ici et ' +
    'absent du lot part au brief en écart daté — il ne rouvre pas de passe.'
    // Pas un motif de blocage de plus : une question de plus au regard déjà exigé.
    + (assetsVus.size ? '\nAssets affichés : ' + [...assetsVus].join(' · ') + ' — pour chacun, '
      + 'une ligne de plus au regard fermé : la capture montre-t-elle l\'élément de l\'écran '
      + 'observé, et pas un voisin exporté sous son nom ?' : ''));
  direEtSortir({ decision: 'block', reason: motifs.join('\n\n'), ...aDire }, sid);
});
}
