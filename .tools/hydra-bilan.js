#!/usr/bin/env node
'use strict';
/* Hydra — bilan de session (Famille A). Événement : UserPromptSubmit ; et PreToolUse sur
   l'outil Skill, pour le skill hors Hydra (§ SKILL HORS HYDRA, plus bas).

   CANAL & POURQUOI : le stdout d'un hook UserPromptSubmit non bloquant entre
   dans le contexte du modèle (doc officielle hooks-guide.md) — contrairement à
   Stop (visibilité non bloquante non garantie) et au terminal (que le designer
   ne consomme pas). Le bilan est injecté au prompt suivant ; l'agent le signale
   ET le traite dans sa réponse, que le designer lit.
   DÉPENDANCE ASSUMÉE : ce canal repose sur la remontée par l'agent (lien de
   jugement) ; le texte injecté la demande explicitement, sans l'éliminer.
   AVERTISSANT, jamais bloquant : exit 0 ; injecte via
   hookSpecificOutput.additionalContext s'il y a un constat, RIEN sinon.

   TROIS vérifications fondées sur la trace d'outils du transcript, et une sur le disque :
     (g) recherche menée (WebSearch/WebFetch ou outil de benchmark déclaré) sans
         qu'un skill hydra-research ait été chargé — ÉVÉNEMENT, émis UNE fois ;
     (a) input présent dans topics/<nom>/inputs/ jamais lu via Read, jamais écrit
         par la session, ni nommé en propre par une de ses commandes Bash
         (inputsNommes), pour les SEULS sujets où un livrable a été écrit dans la
         session — ÉTAT, réémis tant que c'est vrai (disparaît quand le fichier
         est enfin lu).

   ÉCHAPPATOIRE (a) : un fichier topics/<nom>/inputs/.hydra-ignore (une entrée
   par ligne = un nom de fichier ; lignes vides et lignes commençant par # sont
   ignorées) exclut de (a) les fichiers listés. Transforme un « je ne le lis
   pas » en décision CONSIGNÉE et versionnée (mettre un # commentaire pour dire
   pourquoi). Le .hydra-ignore lui-même n'est jamais compté (fichier caché).

     (s) lecture d'un fichier d'un AUTRE sujet, en cours ou archivé — ÉVÉNEMENT, un
         signal par chemin. La structure d'un livrable vient des gabarits des
         skills, jamais d'un autre sujet. Le sujet
         COURANT est un fait de la trace, pas une déclaration : les sujets où la
         session a écrit (Write/Edit). Pas encore de sujet écrit mais une tête
         hydra-* chargée ⇒ la session traite un sujet sans l'avoir encore touché :
         toute lecture d'un sujet se signale. Ni l'un ni l'autre ⇒ maintenance ou
         vérification ⇒ rien à signaler. Un sujet que la session a créé sans encore
         y écrire (sujetsCrees) n'est pas un autre sujet. Lecture = un chemin
         topics/<autre>/ nommé par Read, Grep, Glob ou une commande Bash — la lecture
         par script (cat, sed) compte autant qu'une autre.

     (c) CLAUDE.md extérieur (le personnel, ou celui d'un dossier au-dessus de l'instance)
         chargé sans être écarté par claudeMdExcludes — ÉVÉNEMENT, émis UNE fois.
     (n) instance neuve (pas de context/mission.md) ou accueil non terminé (mission.md
         porte encore la marque du modèle) — ÉVÉNEMENT, émis UNE fois ; le rappel de
         hydra-accueil, filet de la règle d'entrée de CLAUDE.md.

   SOUS-AGENTS : leurs transcripts (sidechain) sont lus comme le principal — un
   input lu, un skill chargé ou une recherche menée par un sous-agent compte pour
   la session. Dossier des sidechains absent ⇒ on lit le seul principal, en silence.

   COUVERTURE ASSUMÉE — NON couverte par conception :
     - recherche via `Bash curl` : seuls les outils Skill / MCP nommés sont tracés ;
     - un input que Bash n'atteint que par un joker (inputs/*) : il n'est pas nommé.
   Zéro contenu client : uniquement de la structure Hydra. */
const fs = require('fs');
const path = require('path');
const os = require('os');

// —— Réglages "méthode" (pas du client) ————————————————————————————————————
const RESEARCH_SKILL = 'hydra-research';
// Marque posée par le modèle de mission.md, retirée par hydra-accueil à la fin de son bilan.
const MARQUE_ACCUEIL = /<!--\s*hydra-accueil\s*:\s*en cours/i;
const WEB_TOOLS = new Set(['WebSearch', 'WebFetch']);
// Les outils de benchmark sont ceux de la mission : aucun n'est nommé ici.
// mission.md, § « Outils de la mission », ligne « Benchmark » : chaque jeton
// entre accents graves y est le nom d'un connecteur. Rien de déclaré ⇒ seuls les outils
// web comptent — l'absence se dit au cadrage (cortex), pas ici.
const SECTION_OUTILS = /^##\s+Outils de la mission\b/i;
const LIGNE_REFERENCES = /^\s*-\s*\*\*Benchmark\*\*/i;
function connecteursReferences(projectRoot) {
  let md; try { md = fs.readFileSync(path.join(projectRoot, 'context', 'mission.md'), 'utf8'); }
  catch (e) { return []; }
  const jetons = []; let dedans = false;
  for (const l of md.split('\n')) {
    if (/^##\s/.test(l)) { dedans = SECTION_OUTILS.test(l); continue; }
    if (dedans && LIGNE_REFERENCES.test(l))
      for (const m of l.matchAll(/`([^`]+)`/g)) jetons.push(m[1].trim().toLowerCase());
  }
  return jetons.filter(Boolean);
}
// ————————————————————————————————————————————————————————————————————————————

const nfc = s => String(s).normalize('NFC');
// —— CLAUDE.md extérieurs ———————————————————————————————————————————————————
// Claude Code charge, dans chaque session, le CLAUDE.md personnel et ceux des dossiers
// au-dessus de l'instance : ils se mêlent à la méthode. Seul leur chemin les écarte
// (claudeMdExcludes, réglages de l'instance). Liste ceux qui existent sans être écartés.
function globVersRegex(g) {
  let r = '';
  for (let i = 0; i < g.length; i++) {
    const c = g[i];
    if (c === '*' && g[i + 1] === '*') { r += '.*'; i++; if (g[i + 1] === '/') i++; }
    else if (c === '*') r += '[^/]*';
    else r += c.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp('^' + (g.startsWith('/') || g.startsWith('**') ? '' : '.*/') + r + '$');
}
function claudeMdExterieurs(projectRoot) {
  const exclus = [];
  for (const f of ['settings.json', 'settings.local.json']) {
    try { exclus.push(...(JSON.parse(fs.readFileSync(path.join(projectRoot, '.claude', f), 'utf8')).claudeMdExcludes || [])); }
    catch (e) {}
  }
  const motifs = exclus.map(globVersRegex);
  const candidats = [path.join(os.homedir(), '.claude', 'CLAUDE.md')];
  for (let d = path.dirname(path.resolve(projectRoot)); ; d = path.dirname(d)) {
    candidats.push(path.join(d, 'CLAUDE.md'), path.join(d, 'CLAUDE.local.md'), path.join(d, '.claude', 'CLAUDE.md'));
    if (path.dirname(d) === d) break;
  }
  return candidats.filter(f => fs.existsSync(f) && !motifs.some(m => m.test(f)));
}

// —— Écriture atomique ————————————————————————————————————————————————————————
// Deux hooks d'un même appel lisent et réécrivent le même fichier : écrit en place, il se
// lit à demi écrit (vide, tronqué). Un temporaire dans le MÊME dossier que la cible — le
// renommage n'est atomique que sur un même système de fichiers —, puis renommage : le
// lecteur voit l'ancien fichier ou le nouveau, jamais un entre-deux. Nom unique par
// écriture (pid + aléa), préfixé d'un point et du nom de la cible : aucun motif commun à
// balayer. Échec entre écriture et renommage : le temporaire se supprime par son chemin
// exact, et l'erreur remonte à l'appelant, qui la traite comme toute erreur d'écriture.
function ecrireAtomique(cible, contenu) {
  const tmp = path.join(path.dirname(cible), '.' + path.basename(cible) + '.'
    + process.pid + '-' + Math.random().toString(36).slice(2, 10) + '.tmp');
  try { fs.writeFileSync(tmp, contenu); fs.renameSync(tmp, cible); }
  catch (e) { try { fs.unlinkSync(tmp); } catch (x) {} throw e; }
}
function isResearchTool(name, references) {
  if (WEB_TOOLS.has(name)) return true;
  const n = String(name).toLowerCase();
  return n.startsWith('mcp__') && references.some(c => n.includes(c));
}
function sujetOf(fp) {
  const m = String(fp).replace(/\\/g, '/').match(/(?:^|\/)topics\/([^/]+)\//);
  return m ? m[1] : null;
}
// Chemins topics/<nom>/… nommés dans une entrée d'outil de LECTURE. Le nom s'arrête au
// premier séparateur de chemin ou de shell ; un joker (topics/*) ne nomme aucun sujet.
const LECTURE = new Set(['Read', 'Grep', 'Glob', 'NotebookRead', 'Bash']);
function cheminsSujets(inp) {
  const out = [];
  for (const k of ['file_path', 'path', 'pattern', 'notebook_path', 'command']) {
    const v = inp && inp[k]; if (typeof v !== 'string') continue;
    const re = /(?:^|[^\w.-])(topics\/([^\/\s'"`;|&()<>*?$]+)(?:\/[^\s'"`;|&()<>]*)?)/g; let m;
    while ((m = re.exec(v))) out.push({ s: nfc(m[2]), p: nfc(m[1]) });
  }
  return out;
}
// Inputs qu'une commande Bash NOMME en propre, qu'elle les lise (cat, sed, head) ou les
// écrive (cat >, tee, cp) : la session les connaît, ils ne sont pas « jamais lus ».
// Sans cela, un dépôt recopié par `cat > inputs/…` dans le sujet compterait jamais lu, et
// une lecture par `cat` pas davantage. Nommer suffit, lire ou écrire
// se distinguerait par un analyseur de shell que ce contrôle n'a pas à porter. Deux formes :
// - le chemin topics/<s>/inputs/<nom>, repéré par cheminsSujets ;
// - `inputs/<nom>` relatif, dans une commande placée dans le sujet : un chemin du sujet y
//   est nommé (le `cd` qui y entre), ou le dossier courant de l'appel, écrit dans la
//   trace, est sous topics/<s>/.
// Un joker (inputs/*) ne nomme aucun fichier. Rend des chemins « <s>/inputs/<nom> ».
function inputsNommes(cmd, cwd) {
  const out = new Set(), ici = new Set();
  for (const c of cheminsSujets({ command: cmd })) {
    ici.add(c.s);
    const m = /^topics\/[^/]+\/inputs\/([^/*?]+)$/.exec(c.p);
    if (m) out.add(c.s + '/inputs/' + m[1]);
  }
  const sc = sujetOf(String(cwd || '').replace(/\\/g, '/') + '/'); if (sc) ici.add(nfc(sc));
  const re = /(?:^|[\s'"=<>|;&(])(?:\.\/)?inputs\/([^\/\s'"`;|&()<>*?$]+)(?=$|[\s'"`;|&()<>])/g; let m;
  while ((m = re.exec(cmd))) for (const s of ici) out.add(s + '/inputs/' + nfc(m[1]));
  return out;
}
function readIgnore(dir) {
  try {
    return new Set(
      fs.readFileSync(path.join(dir, '.hydra-ignore'), 'utf8')
        .split('\n').map(l => l.trim())
        .filter(l => l && !l.startsWith('#'))
        .map(nfc)
    );
  } catch (e) { return new Set(); }
}

// —— delta-parse : ne lire que les octets nouveaux, jusqu'au dernier \n complet. Même
//    lecture pour le principal et pour chaque sidechain, un offset chacun.
function lireDelta(file, offset, surAppel) {
  const size = fs.statSync(file).size;
  if (size < offset) offset = 0;                        // fichier tronqué/roté
  if (size <= offset) return offset;
  const fd = fs.openSync(file, 'r');
  const buf = Buffer.alloc(size - offset);
  fs.readSync(fd, buf, 0, buf.length, offset);
  fs.closeSync(fd);
  let lastNl = -1;
  for (let i = buf.length - 1; i >= 0; i--) { if (buf[i] === 0x0A) { lastNl = i; break; } }
  const complete = lastNl >= 0 ? buf.slice(0, lastNl + 1) : Buffer.alloc(0);
  for (const line of complete.toString('utf8').split('\n')) {
    if (!line) continue;
    let o; try { o = JSON.parse(line); } catch (e) { continue; }
    const c = o && o.message && o.message.content;
    if (!Array.isArray(c)) continue;
    for (const b of c) if (b && b.type === 'tool_use') surAppel(b, o);   // o : la ligne, pour son horodatage
  }
  return offset + complete.length;                      // offset en octets, exact
}
function sidechains(tp) {
  const d = path.join(path.dirname(tp), path.basename(tp, '.jsonl'), 'subagents');
  try { return fs.readdirSync(d).filter(f => f.endsWith('.jsonl')).map(f => path.join(d, f)); } catch (e) { return []; }
}

// —— SUJET COURANT : un fait de la trace, jamais une déclaration de l'agent ————————
// Les sujets actifs (nom sans point) du projet où la session a ÉCRIT par Write/Edit,
// sous-agents compris. UNE définition : le signal (s) ci-dessous et les balayages Bash
// de md-to-html et proto-frame l'importent. Lecture incrémentale, mise en cache par
// session (les balayages tournent à chaque appel Bash). Vide ⇒ non établi.
function sujetsCourants(tp, root) {
  const out = new Set();
  if (!tp || !fs.existsSync(tp)) return out;
  const cache = path.join(os.tmpdir(), 'hydra-courant-' + path.basename(tp, '.jsonl') + '.json');
  let st = {}; try { st = JSON.parse(fs.readFileSync(cache, 'utf8')) || {}; } catch (e) {}
  const racine = nfc(path.resolve(root || '.')).replace(/\\/g, '/') + '/topics/';
  if (st.racine !== racine) st = { racine, offsets: {}, sujets: [] };
  const vus = new Set(st.sujets);
  for (const f of [tp, ...sidechains(tp)]) {
    try {
      st.offsets[f] = lireDelta(f, st.offsets[f] || 0, b => {
        const inp = b.input || {};
        if (!['Write', 'Edit', 'MultiEdit'].includes(b.name) || !inp.file_path) return;
        const p = nfc(path.resolve(inp.file_path)).replace(/\\/g, '/');
        if (!p.startsWith(racine)) return;
        const n = p.slice(racine.length).split('/')[0];
        if (n && !n.startsWith('.') && p.slice(racine.length).includes('/')) vus.add(n);
      });
    } catch (e) {}
  }
  st.sujets = [...vus];
  try { ecrireAtomique(cache, JSON.stringify(st)); } catch (e) {}   // md-to-html et proto-frame, même appel Bash
  return vus;
}

// —— SUJET CRÉÉ PAR LA SESSION : pour le signal (s) seulement ————————————————————
// Un dossier topics/<nom>/ compte comme créé par la session s'il est NÉ (birthtime) après
// son premier appel d'outil ET qu'un appel de CETTE session l'a nommé juste avant sa
// naissance. Un dossier qu'une autre session crée pendant la nôtre ne passe pas : notre
// session ne l'a pas nommé avant qu'il naisse.
// La fenêtre : l'horodatage d'un appel est pris quand le message est écrit, AVANT que
// l'outil tourne — l'appel qui crée précède donc la naissance. APRÈS : 2 s, pour l'écart
// entre l'horloge de la trace et celle du système de fichiers et un message écrit pendant
// que l'outil démarre. AVANT : 10 min, pour une autorisation qui fait attendre la commande ;
// au-delà, le dossier n'est pas reconnu et la lecture se signale — l'erreur tombe du côté
// d'une alerte de trop, jamais d'une lecture tue. Birthtime indisponible (0, certains
// systèmes de fichiers) ⇒ rien ne se déduit, tout se signale.
const NAISSANCE_AVANT = 10 * 60 * 1000, NAISSANCE_APRES = 2000;
function sujetsCrees(root, noms, nommes, debut) {
  const out = new Set();
  if (debut === null) return out;
  for (const s of noms) {
    let b = 0; try { b = fs.statSync(path.join(root, 'topics', s)).birthtimeMs; } catch (e) { continue; }
    if (!b || b <= debut) continue;
    if ((nommes[s] || []).some(t => t >= b - NAISSANCE_AVANT && t <= b + NAISSANCE_APRES)) out.add(s);
  }
  return out;
}

// —— LECTURE D'UN AUTRE SUJET : UNE définition, deux lecteurs ————————————————————
// Le bilan (UserPromptSubmit, à l'agent, trace lue par morceaux) et le garde de fin de tour
// (Stop, au designer, trace entière) : même relevé, mêmes exclusions. Le « déjà dit » reste
// à chacun, parce que chacun parle à un lecteur différent.
// Ce que le signal retient d'un appel : les chemins de sujets lus, les instants où un sujet
// est nommé (pour sujetsCrees), le premier appel, les têtes chargées.
function noterAppel(acc, b, o) {
  const n = b.name, inp = b.input || {};
  const t = Date.parse(o && o.timestamp);
  if (!isNaN(t)) {
    if (acc.debut === null || t < acc.debut) acc.debut = t;
    for (const c of cheminsSujets(inp)) { const a = acc.nommes[c.s] = acc.nommes[c.s] || []; if (!a.includes(t)) a.push(t); }
  }
  if (LECTURE.has(n)) for (const c of cheminsSujets(inp)) if (!acc.lectures.has(c.p)) acc.lectures.set(c.p, c.s);
  if (n === 'Skill' && inp.skill) acc.skills.add(inp.skill);
}
// Les lectures [chemin, sujet] d'un sujet qui n'est ni courant ni créé par la session.
// Fait stable qui dit que la session traite un sujet : une tête hydra-* chargée. Alors,
// sans sujet courant, toute lecture d'un sujet se signale. Ni tête ni sujet écrit : une
// session de maintenance ou de vérification, rien à signaler.
// Un sujet que la session a CRÉÉ sans y avoir encore écrit par Write/Edit (un Bash qui y
// dépose des relevés) n'est pas un autre sujet : ses chemins, mêlés aux vraies lectures,
// feraient passer le signal pour une fausse alerte (cas d'une recette, qui dépose ses
// relevés par Bash).
// Il n'est exclu QUE de ce signal : le sujet courant, qui porte aussi le garde et les
// balayages, reste le seul fait d'écriture — une déduction par date ne doit ni rendre
// ni bloquer quoi que ce soit.
function autresLus(acc, courants, root) {
  const enRun = [...acc.skills].some(s => /^hydra-/.test(String(s)));
  if (!courants.size && !enRun) return [];
  const crees = sujetsCrees(root, new Set([...acc.lectures.values()].filter(s => !courants.has(s))), acc.nommes, acc.debut);
  return [...acc.lectures].filter(([, s]) => !courants.has(s) && !crees.has(s));
}
// Pour le garde : la trace entière, principal et sous-agents, relue à chaque fin de tour —
// une lecture linéaire, sans cache à tenir à jour. Trace absente ⇒ rien.
function autresSujetsLus(tp, root) {
  if (!tp || !fs.existsSync(tp)) return [];
  const acc = { lectures: new Map(), skills: new Set(), nommes: {}, debut: null };
  for (const f of [tp, ...sidechains(tp)]) { try { lireDelta(f, 0, (b, o) => noterAppel(acc, b, o)); } catch (e) {} }
  return autresLus(acc, sujetsCourants(tp, root), root);
}

// MESURE D'UN RUN — `node .tools/hydra-bilan.js --duree <transcript> <sujet>`. La méthode de
// mesure d'un run, écrite ici pour qu'un chiffre se refasse au lieu de se recopier :
// du premier message tapé par le designer au dernier appel qui ÉCRIT un fichier du sujet
// (Write/Edit sous topics/<nom>/ hors captures, ou appel dont la sortie ou un hook dit qu'un
// livrable ou la galerie est écrit) ; un tour = un message assistant (par identifiant) qui
// porte au moins un appel ; sous-agents exclus ; attente = question posée jusqu'à sa réponse,
// et fin de tour jusqu'au message suivant du designer. La durée de tour de Claude Code n'est
// PAS cette mesure : elle retire l'attente, et pas toujours.
function duree(tp, sujet) {
  const L = fs.readFileSync(tp, 'utf8').split('\n').map(l => { try { return JSON.parse(l); } catch (e) { return null; } })
    .filter(d => d && !d.isSidechain);
  const t = d => Date.parse(d.timestamp), texte = c => typeof c === 'string' ? c
    : Array.isArray(c) ? c.filter(x => x.type === 'text').map(x => x.text).join('\n') : '';
  const duDesigner = d => {
    if (d.type !== 'user' || d.isMeta || d.toolUseResult !== undefined) return false;
    const c = d.message && d.message.content;
    if (Array.isArray(c) && c.some(x => x.type === 'tool_result')) return false;
    const s = texte(c).trim();
    return !!s && !/^<(local-command|command-name|command-message|task-notification|system-reminder)/.test(s)
      && !/^(Base directory for this skill:|Another Claude session sent a message|\[Image|Caveat:)/.test(s);
  };
  const dans = new RegExp('topics/' + sujet.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '/');
  const res = {}, appels = [], hooks = L.filter(d => d.type === 'attachment' || d.type === 'system');
  for (const d of L) {
    if (d.type === 'user' && Array.isArray(d.message && d.message.content))
      for (const x of d.message.content) if (x.type === 'tool_result') res[x.tool_use_id] = { d, x };
    if (d.type === 'assistant') for (const c of d.message.content || []) if (c.type === 'tool_use') appels.push({ d, c });
  }
  const sortie = id => (res[id] ? JSON.stringify(res[id].x.content) + JSON.stringify(res[id].d.toolUseResult || '') : '')
    + hooks.filter(h => JSON.stringify(h).includes(id)).map(h => JSON.stringify(h)).join('');
  const debut = L.find(duDesigner); if (!debut) return null;
  let fin = null;
  for (const u of appels) {
    const i = u.c.input || {}, fp = i.file_path || i.notebook_path || '', s = sortie(u.c.id);
    // Une écriture par script se reconnaît au journal « [md-to-html] écrit » / « [proto-frame]
    // écrit » de ces deux outils. Un outil renommé, ou une ligne de journal reformulée, fausse
    // la fin du run SANS ERREUR : la mesure s'arrête à la dernière écriture Write/Edit.
    const ecrit = (/^(Write|Edit|MultiEdit|NotebookEdit)$/.test(u.c.name) && dans.test(fp) && !/\/\.shots\//.test(fp))
      || (/\[(md-to-html|proto-frame)\] écrit/.test(s) && dans.test(s + JSON.stringify(i)));
    if (ecrit && t(u.d) >= t(debut)) fin = u.d;
  }
  if (!fin) return null;
  const U = appels.filter(u => t(u.d) >= t(debut) && t(u.d) <= t(fin));
  let att = 0;
  for (const u of U) if (u.c.name === 'AskUserQuestion' && res[u.c.id]) att += t(res[u.c.id].d) - t(u.d);
  L.forEach((d, k) => { if (!duDesigner(d) || t(d) <= t(debut) || t(d) > t(fin)) return;
    let j = k - 1; while (j >= 0 && L[j].type !== 'assistant') j--; if (j >= 0) att += t(d) - t(L[j]); });
  const s = Math.round((t(fin) - t(debut)) / 1000);
  return { debut: debut.timestamp, fin: fin.timestamp, duree: Math.floor(s / 60) + ' min ' + String(s % 60).padStart(2, '0'),
    attente_s: Math.round(att / 1000), tours: new Set(U.map(u => u.d.message.id)).size, appels: U.length,
    echecs: U.filter(u => res[u.c.id] && res[u.c.id].x.is_error).length };
}

// —— SKILL HORS HYDRA : PreToolUse sur l'outil Skill ————————————————————————————————
// Pendant un run, seules les têtes hydra-* portent la méthode (CLAUDE.md § Routing). Un
// autre skill qui s'ouvre se dit à l'agent AVANT qu'il le charge — jamais bloqué : un
// connecteur peut exiger son propre mode d'emploi (un skill livré avec lui), et ce cas
// est permis. Fondé sur le seul préfixe des têtes, aucune liste : un skill installé
// demain, chez n'importe quel designer, est couvert. Les appels de connecteurs (outils
// MCP) ne passent pas par ici.
function skillHorsHydra(payload) {
  const nom = String((payload.tool_input || {}).skill || '');
  const base = nom.includes(':') ? nom.slice(nom.lastIndexOf(':') + 1) : nom;
  if (!nom || /^hydra-/.test(base)) return null;
  return '⚠ Skill « ' + nom + ' » : ce n\'est pas une tête d\'Hydra. Seules les têtes hydra-* portent '
    + 'la méthode (CLAUDE.md § Routing). Charge-le seulement si c\'est le mode d\'emploi d\'un '
    + 'connecteur qu\'une tête utilise (le connecteur le demande ou le recommande), et ne laisse jamais '
    + 'sa méthode remplacer celle de la tête.';
}

function main() {
  let payload = {}; try { payload = JSON.parse(fs.readFileSync(0, 'utf8')); } catch (e) {}
  if (payload.hook_event_name === 'PreToolUse') {
    const msg = payload.tool_name === 'Skill' ? skillHorsHydra(payload) : null;
    if (msg) process.stdout.write(JSON.stringify({
      hookSpecificOutput: { hookEventName: 'PreToolUse', additionalContext: msg } }));
    return;
  }
  // Racine = le projet, pas le dossier courant : après un `cd context/design` dans un
  // appel Bash, payload.cwd le suit, aucun sujet courant ne se retrouve sous sa racine et
  // chaque lecture de sujet passerait pour faite « avant d'avoir écrit ». Le cwd ne sert
  // qu'à défaut de CLAUDE_PROJECT_DIR (lancement hors hook).
  const projectRoot = process.env.CLAUDE_PROJECT_DIR || payload.cwd || process.cwd();
  const references = connecteursReferences(projectRoot);

  let tp = payload.transcript_path;
  if ((!tp || !fs.existsSync(tp)) && payload.session_id) {
    const slug = projectRoot.replace(/\//g, '-');
    tp = path.join(os.homedir(), '.claude', 'projects', slug, payload.session_id + '.jsonl');
  }
  if (!tp || !fs.existsSync(tp)) return; // silencieux

  const sid = payload.session_id || path.basename(tp).replace(/\.jsonl$/, '');
  const statePath = path.join(os.tmpdir(), 'hydra-bilan-' + sid + '.json');
  const state = (() => {
    try { return JSON.parse(fs.readFileSync(statePath, 'utf8')); } catch (e) { return null; }
  })() || { offset: 0, skills: [], researchUsed: false, reads: [], sujets: [], emittedG: false };
  state.subOffsets = state.subOffsets || {};

  // —— delta-parse : ne lire que les octets nouveaux, jusqu'au dernier \n complet.
  //    Même lecture pour le principal et pour chaque sidechain, un offset chacun.
  const skills = new Set(state.skills), reads = new Set(state.reads), sujets = new Set(state.sujets);
  // Ce que retient le signal (s) : voir noterAppel. Lectures, têtes et instants accumulés
  // d'un prompt à l'autre, comme le reste de l'état.
  const acc = { lectures: new Map(state.lectures || []), skills, nommes: state.nommes || {}, debut: state.debut || null };
  const parseDelta = (file, offset) => lireDelta(file, offset, (b, o) => {
        const n = b.name, inp = b.input || {};
        noterAppel(acc, b, o);
        if (n === 'Skill') return;                           // tête chargée : notée par noterAppel
        if (isResearchTool(n, references)) state.researchUsed = true;
        else if (n === 'Read' && inp.file_path) reads.add(nfc(path.resolve(inp.file_path)));
        else if (n === 'Bash' && typeof inp.command === 'string')
          for (const f of inputsNommes(inp.command, o && o.cwd)) reads.add(nfc(path.resolve(projectRoot, 'topics', f)));
        else if ((n === 'Write' || n === 'Edit' || n === 'MultiEdit') && inp.file_path) {
          const s = sujetOf(inp.file_path); if (s) sujets.add(s);
          // Un input que la session écrit elle-même (dépôt collé, recopié dans inputs/)
          // est connu d'elle : il ne se signale pas « jamais lu ».
          if (/(^|\/)topics\/[^/]+\/inputs\//.test(String(inp.file_path).replace(/\\/g, '/')))
            reads.add(nfc(path.resolve(inp.file_path)));
        }
  });
  state.offset = parseDelta(tp, state.offset);
  for (const f of sidechains(tp)) {
    try { state.subOffsets[path.basename(f)] = parseDelta(f, state.subOffsets[path.basename(f)] || 0); } catch (e) {}
  }
  state.skills = [...skills]; state.reads = [...reads]; state.sujets = [...sujets];
  state.lectures = [...acc.lectures];
  state.nommes = acc.nommes; state.debut = acc.debut;

  // —— évaluation ———————————————————————————————————————————————————————————
  const lines = [];

  // (n) ÉVÉNEMENT — instance neuve : pas de context/mission.md. Filet du rappel que
  //     CLAUDE.md porte en règle d'entrée ; une fois par session.
  if (!state.emittedN) {
    let mission = null;
    try { mission = fs.readFileSync(path.join(projectRoot, 'context', 'mission.md'), 'utf8'); } catch (e) {}
    if (mission === null) lines.push('⟐ instance neuve : aucun context/mission.md — propose hydra-accueil avant toute autre demande.');
    else if (MARQUE_ACCUEIL.test(mission)) lines.push('⟐ accueil non terminé (context/mission.md porte encore sa marque) — propose de reprendre hydra-accueil à la première section vide.');
    state.emittedN = true;
  }

  // (c) ÉVÉNEMENT — CLAUDE.md extérieur non écarté ; une fois par session. L'accueil en
  //     parle à l'installation ; ce signal attrape celui ajouté ensuite.
  if (!state.emittedC) {
    const ext = claudeMdExterieurs(projectRoot);
    if (ext.length) lines.push('⟐ CLAUDE.md extérieur chargé dans cette session, non écarté : ' + ext.join(' · ')
      + ' — ses règles se mêlent à la méthode d\'Hydra ; propose au designer de l\'écarter (claudeMdExcludes dans .claude/settings.local.json, voir le README).');
    state.emittedC = true;
  }

  // (g) ÉVÉNEMENT — une seule émission sur toute la session
  if (state.researchUsed && !state.skills.includes(RESEARCH_SKILL) && !state.emittedG) {
    lines.push('⟐ recherche menée sans ' + RESEARCH_SKILL + ' chargé — méthode de recherche non appliquée par sa tête propriétaire.');
    state.emittedG = true;
  }

  // (a) ÉTAT — réémis tant qu'un input reste non lu ; scoping par preuve d'écriture ;
  //     .hydra-ignore exclut les fichiers écartés sciemment
  const readsSet = new Set(state.reads);
  const unread = [];
  for (const s of state.sujets) {
    const dir = path.join(projectRoot, 'topics', s, 'inputs');
    let files = []; try { files = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { continue; }
    const ignore = readIgnore(dir);
    for (const d of files) {
      if (!d.isFile() || d.name.startsWith('.')) continue;
      if (ignore.has(nfc(d.name))) continue;
      const abs = nfc(path.resolve(dir, d.name));
      if (!readsSet.has(abs)) unread.push(abs);
    }
  }
  if (unread.length) {
    const rel = p => path.relative(projectRoot, p);
    const shown = unread.slice(0, 2).map(rel).join(' · ');
    const extra = unread.length > 2 ? ' (+' + (unread.length - 2) + ')' : '';
    lines.push('⟐ input(s) jamais lu(s) : ' + shown + extra + ' — lire, déclarer la dette, ou écarter via .hydra-ignore.');
  }

  // (s) ÉVÉNEMENT — lecture d'un autre sujet, un signal par chemin. Courant = écrit.
  const courants = sujetsCourants(tp, projectRoot);
  // Lecture AVANT la première écriture : le sujet courant n'est pas encore établi, et la
  // lecture passerait en silence (pour toujours, si la session n'écrit que par script).
  const dejaDits = new Set(state.signalesS || []);
  const autres = autresLus(acc, courants, projectRoot).filter(([p]) => !dejaDits.has(p)).map(([p]) => p);
  if (autres.length) {
    lines.push('⟐ fichier(s) d\'un ' + (courants.size ? 'autre ' : '') + 'sujet lu(s)'
      + (courants.size ? '' : ' avant que la session ait écrit dans le sien') + ' : ' + autres.join(' · ')
      + ' — la structure d\'un livrable vient des gabarits des skills, jamais d\'un autre sujet.');
    state.signalesS = [...dejaDits, ...autres];
  }

  try { fs.writeFileSync(statePath, JSON.stringify(state)); } catch (e) { /* non bloquant */ }

  if (!lines.length) return; // SILENCE TOTAL si aucun constat

  const msg =
    '⚠ Bilan Hydra — signale ces constats au designer en tête de ta réponse, et traite-les : '
    + 'lire l\'input manquant ou déclarer la dette ; appliquer la méthode de la tête propriétaire ou dire pourquoi tu ne le fais pas.\n'
    + lines.join('\n');
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: { hookEventName: 'UserPromptSubmit', additionalContext: msg }
  }));
}

module.exports = { sujetsCourants, autresSujetsLus, duree, ecrireAtomique };
if (require.main === module && process.argv[2] === '--duree') {
  const r = process.argv[3] && process.argv[4] ? duree(process.argv[3], process.argv[4]) : null;
  console.log(r ? JSON.stringify(r) : 'usage : --duree <transcript.jsonl> <nom-du-sujet> (aucun livrable écrit du sujet dans la trace ?)');
  process.exit(r ? 0 : 1);
} else if (require.main === module) {
  try { main(); } catch (e) { /* ne jamais faire échouer le prompt */ }
  process.exit(0);
}
