#!/usr/bin/env node
'use strict';
/* Hydra en plugin — le dossier de mission.

   Le plugin s'installe pour un seul dossier, celui de la mission (portée locale de Claude
   Code) ; Hydra y travaille sur place, dans un DOSSIER DE MISSION que désigne un témoin :
   .claude/hydra.json. Ce fichier porte trois choses, une définition chacune.

   1. LE GARDE — hors d'un dossier de mission, chaque hook et chaque outil d'Hydra se tait
      (le plugin peut aussi avoir été installé pour toutes les sessions).
      Un hook juge le dossier de la session (CLAUDE_PROJECT_DIR) tel quel : ouverte dans un
      sous-dossier, rien ne marcherait, context/ et topics/ se lisant à la racine. Un outil
      appelé à la main juge le chemin qu'il traite, en remontant jusqu'au dossier de mission.
      Seule exception, tenue par hydra-bilan : quand une tête s'ouvre hors d'un dossier de
      mission, proposer de le créer.

   2. LA CRÉATION — `--creer [dossier]` fait du dossier lui-même le dossier de mission : les
      règles (CLAUDE.md), les réglages (.claude/settings.local.json : modèle, effort, et
      l'exclusion des CLAUDE.md trouvés dans les dossiers au-dessus, ajoutés à ce que le
      fichier porte déjà — l'installation du plugin y écrit), les modèles vides du contexte
      (context/), topics/, et le témoin, écrit en dernier. Seulement dans un dossier VIDE :
      rien de visible (un nom sans point devant), ni .claude/CLAUDE.md. Un dossier occupé
      (un hub, d'autres projets, des règles) est refusé sans y rien écrire : ses règles se
      mêleraient à celles d'Hydra ou seraient écrasées. `--etat [dossier]` dit où en est un
      dossier, pour l'accueil. Par défaut, le dossier courant.

   3. LES RÈGLES — hook SessionStart : le CLAUDE.md du dossier de mission est la copie
      complète des règles du plugin (regles/CLAUDE.md, chemins du plugin résolus), sous une
      ligne qui dit qu'il est géré par Hydra. Claude Code le lit AVANT ce hook : une
      différence se répare ici et ne vaut qu'à la session suivante — d'où le message qui
      demande de relancer, au designer (systemMessage) et à l'agent (additionalContext).
      Rien à réparer : silence.

   LES AUTORISATIONS — à la création et à chaque ouverture de session, les réglages du dossier
   de mission portent celles de la copie (son .claude/settings.json), au chemin du plugin :
   lire les fichiers du plugin (en copie, ils sont dans le dossier), lancer l'appel d'API et le
   préparateur des clés, et cet outil. Un plugin ne sait pas porter d'autorisation ; sans elles,
   chaque lecture d'un guide et chaque appel d'API demanderait la permission. Le chemin du
   plugin change à chaque mise à jour : les entrées de l'ancien chemin sont remplacées, et
   seulement elles. */
const fs = require('fs');
const path = require('path');

const PLUGIN = path.dirname(__dirname);
// Le nom du plugin dans son catalogue, pour les commandes que l'accueil donne au designer.
const INSTALLE = 'hydra@hydra-agent';
const TEMOIN = path.join('.claude', 'hydra.json');
const ENTETE = 'Fichier géré par Hydra, ne pas modifier — tes consignes vont dans context/\n\n';
// Les messages d'ouverture de session vont tels quels au designer : dans la langue de travail que
// déclare context/mission.md, en anglais pour toute autre langue que le français (lexique.js).
const MESSAGES = {
  fr: { misAJour: 'Hydra vient d\'être mis à jour : relance la session pour charger les nouvelles règles.',
        deplace: 'Hydra a changé d\'emplacement : relance la session pour charger ses règles à jour.',
        manquait: 'Le CLAUDE.md de ce dossier manquait : Hydra l\'a remis. Relance la session pour charger les règles.',
        modifie: 'Le CLAUDE.md de ce dossier ne correspondait plus aux règles d\'Hydra : il est rétabli — il est géré par '
          + 'Hydra, tes consignes vont dans context/. Relance la session pour charger les règles.',
        echec: e => 'Hydra n\'a pas pu mettre à jour le CLAUDE.md de ce dossier (' + e + ') : '
          + 'les règles chargées dans cette session peuvent être anciennes.' },
  en: { misAJour: 'Hydra has just been updated: restart the session to load the new rules.',
        deplace: 'Hydra has moved: restart the session to load its current rules.',
        manquait: 'This folder\'s CLAUDE.md was missing: Hydra has put it back. Restart the session to load the rules.',
        modifie: 'This folder\'s CLAUDE.md no longer matched Hydra\'s rules, so it has been restored. Hydra manages it; '
          + 'your own instructions go in context/. Restart the session to load the rules.',
        echec: e => 'Hydra could not update this folder\'s CLAUDE.md (' + e + '), so the rules loaded in this '
          + 'session may be out of date.' },
};
const messages = d => {
  let lm = null; try { lm = require(path.join(__dirname, 'lexique.js')).langueMission(d); } catch (e) {}
  return MESSAGES[lm && lm !== 'fr' ? 'en' : 'fr'];
};
// Réglages du dossier de mission : ceux de la copie d'Hydra (son .claude/settings.json), que
// les réglages d'un plugin ne savent pas porter.
const REGLAGES = { model: 'opus', effortLevel: 'high' };
// Les fichiers d'instructions que Claude Code charge depuis chaque dossier au-dessus.
const INSTRUCTIONS = ['CLAUDE.md', path.join('.claude', 'CLAUDE.md'), 'CLAUDE.local.md'];
// Les autorisations d'un plugin à cet emplacement (« // » : chemin absolu, pour Claude Code).
const autorisations = p => ['Read(/' + p + '/**)'].concat(
  ['hydra-api.js', 'hydra-cles-preparer.js', 'hydra-dossier.js'].map(f => 'Bash(node "' + p + '/.tools/' + f + '":*)'));

const lire = f => { try { return fs.readFileSync(f, 'utf8'); } catch (e) { return null; } };
const reel = d => { try { return fs.realpathSync(d); } catch (e) { return path.resolve(d); } };
const ecrire = (f, s) => require(path.join(__dirname, 'hydra-bilan.js')).ecrireAtomique(f, s);
function version() {
  return JSON.parse(fs.readFileSync(path.join(PLUGIN, '.claude-plugin', 'plugin.json'), 'utf8')).version;
}

// —— 1. LE GARDE ————————————————————————————————————————————————————————————————
const estDossierHydra = d => !!d && fs.existsSync(path.join(d, TEMOIN));
function dossierAuDessus(depart) {           // le dossier de départ compris
  for (let d = path.resolve(depart); ; d = path.dirname(d)) {
    if (estDossierHydra(d)) return d;
    if (path.dirname(d) === d) return null;
  }
}
const actifHook = () => estDossierHydra(process.env.CLAUDE_PROJECT_DIR);
const actifPour = chemin => !!dossierAuDessus(chemin || process.cwd());
const horsDossier = (outil, chemin) => process.stderr.write('[' + outil + '] ' + chemin
  + ' : hors d\'un dossier de mission Hydra (aucun ' + TEMOIN + ' au-dessus) — rien n\'est fait.\n');

// —— 3. LES RÈGLES ———————————————————————————————————————————————————————————————
const regles = () => ENTETE + fs.readFileSync(path.join(PLUGIN, 'regles', 'CLAUDE.md'), 'utf8')
  .split('${CLAUDE_PLUGIN_ROOT}').join(PLUGIN);
function lireTemoin(d) { try { return JSON.parse(lire(path.join(d, TEMOIN))) || {}; } catch (e) { return {}; } }
function ecrireTemoin(d, v) {
  ecrire(path.join(d, TEMOIN), JSON.stringify({ version: v, plugin: PLUGIN,
    note: 'Témoin du dossier de mission Hydra : ne pas supprimer. Version et emplacement du plugin dont les règles sont écrites dans CLAUDE.md.' },
  null, 2) + '\n');
}
// Le message pour le designer, ou null si tout est à jour. Les règles écrites portent les
// chemins du plugin : une autre version, ou le même plugin ailleurs, les change.
function tenirRegles(d) {
  const attendu = regles(), v = version(), t = lireTemoin(d);
  const actuel = lire(path.join(d, 'CLAUDE.md'));
  if (actuel !== attendu) ecrire(path.join(d, 'CLAUDE.md'), attendu);
  if (t.version !== v || t.plugin !== PLUGIN) ecrireTemoin(d, v);
  if (actuel === attendu) return null;
  const M = messages(d);
  if (t.version && t.version !== v) return M.misAJour;
  if (t.plugin && t.plugin !== PLUGIN) return M.deplace;
  return actuel === null ? M.manquait : M.modifie;
}
// Les autorisations du plugin dans un objet de réglages : celles d'un ancien emplacement
// retirées, les siennes ajoutées. Rend true si l'objet a changé.
function poserAutorisations(reglages, ancien) {
  const allow = ((reglages.permissions || {}).allow || []).slice();
  const vieilles = ancien && ancien !== PLUGIN ? new Set(autorisations(ancien)) : new Set();
  const garde = allow.filter(r => !vieilles.has(r));
  const nouv = garde.concat(autorisations(PLUGIN).filter(r => !garde.includes(r)));
  if (nouv.length === allow.length && nouv.every((r, i) => r === allow[i])) return false;
  reglages.permissions = Object.assign({}, reglages.permissions, { allow: nouv });
  return true;
}
function tenirAutorisations(d, ancien) {
  const f = path.join(d, '.claude', 'settings.local.json');
  let r; try { r = JSON.parse(lire(f) || '{}'); } catch (e) { return; }   // illisible : n'y pas toucher
  if (poserAutorisations(r, ancien)) ecrire(f, JSON.stringify(r, null, 2) + '\n');
}
function sessionStart() {
  const d = process.env.CLAUDE_PROJECT_DIR;
  if (!estDossierHydra(d)) return;                       // le garde : hors d'un dossier de mission, rien
  try { tenirAutorisations(d, lireTemoin(d).plugin); } catch (e) {}
  let msg;
  try { msg = tenirRegles(d); }
  catch (e) { msg = messages(d).echec(e.message); }
  if (!msg) return;
  process.stdout.write(JSON.stringify({ systemMessage: 'Hydra — ' + msg, hookSpecificOutput: {
    hookEventName: 'SessionStart',
    additionalContext: 'Message d\'Hydra, à dire au designer en tête de ta première réponse, tel quel : « ' + msg + ' »' } }));
}

// —— 2. LA CRÉATION ——————————————————————————————————————————————————————————————
// Ce qui occupe un dossier : ses entrées visibles, et des règles cachées dans .claude/.
function occupants(d) {
  let noms = [];
  try { noms = fs.readdirSync(d).filter(n => !n.startsWith('.')).sort(); } catch (e) {}
  if (fs.existsSync(path.join(d, '.claude', 'CLAUDE.md'))) noms.push(path.join('.claude', 'CLAUDE.md'));
  return noms;
}
// Le plugin est-il installé pour ce dossier seul ? (la ligne que l'installation locale écrit)
function installeIci(d) {
  try { return !!(JSON.parse(lire(path.join(d, '.claude', 'settings.local.json'))).enabledPlugins || {})[INSTALLE]; }
  catch (e) { return false; }
}
function etat(ici) {
  ici = reel(ici);
  if (estDossierHydra(ici)) return { cas: 'mission', dossier: ici };
  const haut = dossierAuDessus(path.dirname(ici));
  if (haut) return { cas: 'dessous', dossier: haut };
  const occ = occupants(ici);
  if (occ.length) return { cas: 'occupe', dossier: ici, occupants: occ, installeIci: installeIci(ici) };
  return { cas: 'libre', dossier: ici };
}
const relancer = d => 'quitte cette session, puis relance Claude Code depuis ce dossier :\n  cd "' + d + '" && claude';
function direEtat(e) {
  switch (e.cas) {
    case 'mission': return 'Dossier de mission Hydra : ' + e.dossier + '.';
    case 'dessous': return 'Sous-dossier du dossier de mission ' + e.dossier + ' — Hydra ne travaille que depuis sa racine : '
      + relancer(e.dossier);
    case 'occupe': {
      const vus = e.occupants.slice(0, 5).join(', ') + (e.occupants.length > 5 ? '…' : '');
      return 'Ce dossier contient déjà autre chose (' + vus + ') : Hydra ne s\'installe que dans un dossier vide, '
        + 'pour ne rien mêler à ce qui est là ni l\'écraser. Rien n\'est écrit ici. Crée un dossier pour ta mission, '
        + 'installe Hydra dedans, puis lance Claude Code depuis celui-ci :\n'
        + '  mkdir "' + path.join(e.dossier, '<nom-de-ta-mission>') + '" && cd "' + path.join(e.dossier, '<nom-de-ta-mission>') + '"\n'
        + '  claude plugin install ' + INSTALLE + ' --scope local && claude'
        + (e.installeIci ? '\nHydra a été installé pour ce dossier-ci : pour l\'en retirer, depuis ce dossier, '
          + 'claude plugin uninstall ' + INSTALLE + ' --scope local' : '');
    }
    default: return 'Dossier vide : il deviendra le dossier de mission Hydra, ici même : ' + e.dossier + '.';
  }
}
function exclusionsParentes(cible) {
  const out = [];
  for (let d = path.dirname(cible); ; d = path.dirname(d)) {
    for (const f of INSTRUCTIONS) { const p = path.join(d, f); if (fs.existsSync(p)) out.push(p); }
    if (path.dirname(d) === d) break;
  }
  return out;
}
function creer(ici) {
  const e = etat(ici);
  if (e.cas !== 'libre') return { ok: false, texte: direEtat(e) };
  const cible = e.dossier;
  const exclus = exclusionsParentes(cible);
  // Les réglages déjà là (l'installation locale du plugin y écrit) se gardent ; un fichier
  // illisible arrête tout plutôt que d'être écrasé.
  const fReglages = path.join(cible, '.claude', 'settings.local.json');
  let avant = {};
  if (lire(fReglages) !== null) {
    try { avant = JSON.parse(lire(fReglages)) || {}; }
    catch (e) { return { ok: false, texte: fReglages + ' n\'est pas un JSON lisible : rien n\'est écrit. Corrige-le, ou retire-le, puis relance.' }; }
  }
  fs.mkdirSync(path.join(cible, '.claude'), { recursive: true });
  ecrire(path.join(cible, 'CLAUDE.md'), regles());
  const reglages = Object.assign({}, avant, REGLAGES,
    { claudeMdExcludes: [...new Set([...(avant.claudeMdExcludes || []), ...exclus])] });
  poserAutorisations(reglages, null);
  ecrire(fReglages, JSON.stringify(reglages, null, 2) + '\n');
  fs.cpSync(path.join(PLUGIN, 'skills', 'hydra-accueil', 'references', 'context'), path.join(cible, 'context'),
    { recursive: true, filter: s => path.basename(s) !== '.DS_Store' });
  fs.mkdirSync(path.join(cible, 'topics', '.archive'), { recursive: true });
  ecrireTemoin(cible, version());                        // en dernier : le dossier n'en est un qu'une fois complet
  return { ok: true, dossier: cible, texte: [
    'Dossier de mission créé : ' + cible,
    '  CLAUDE.md — les règles d\'Hydra, gérées par Hydra : ne pas le modifier',
    '  .claude/settings.local.json — Opus, effort élevé ; la lecture des fichiers d\'Hydra et ses commandes de clés autorisées' + (exclus.length
      ? ' ; écarte ' + exclus.length + ' fichier(s) d\'instructions des dossiers au-dessus : ' + exclus.join(' · ')
      : ' ; aucun fichier d\'instructions trouvé dans les dossiers au-dessus'),
    '  context/ — les modèles vides du contexte, à remplir avec l\'accueil',
    '  topics/ — tes sujets, un dossier chacun',
    '  ' + TEMOIN + ' — le témoin qui fait de ce dossier un dossier Hydra',
    'Pour continuer, ' + relancer(cible),
    'Hydra ne se lance que depuis ce dossier : ailleurs, ses outils se taisent.'].join('\n') };
}

module.exports = { TEMOIN, INSTALLE, estDossierHydra, dossierAuDessus, actifHook, actifPour, horsDossier,
  regles, tenirRegles, etat, creer, exclusionsParentes, autorisations };

if (require.main === module) {
  const [cmd, arg] = process.argv.slice(2);
  if (cmd === '--creer') {
    const r = creer(arg || process.cwd());
    process.stdout.write(r.texte + '\n');
    process.exit(r.ok ? 0 : 1);
  } else if (cmd === '--etat') {
    process.stdout.write(direEtat(etat(arg || process.cwd())) + '\n');
  } else {
    try { fs.readFileSync(0); } catch (e) {}              // l'entrée du hook, inutile ici
    try { sessionStart(); } catch (e) { /* ne jamais faire échouer l'ouverture de session */ }
    process.exit(0);
  }
}
