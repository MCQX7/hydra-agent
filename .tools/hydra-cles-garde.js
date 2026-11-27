#!/usr/bin/env node
// Garde des clés d'API (avant chaque commande et chaque lecture) : une clé ne s'utilise que par
// .tools/hydra-api.js, qui la place lui-même. Toute autre commande qui nomme une variable de clé,
// et toute lecture de .claude/cles.env, est arrêtée avec la bonne marche à suivre — au lieu d'un
// refus du contrôle de sécurité qui ferait renoncer à l'outil. Les noms viennent de cles.env ;
// les valeurs ne sont jamais lues ici.
const fs = require('fs');
const path = require('path');
let entree = '';
process.stdin.on('data', (d) => { entree += d; });
process.stdin.on('end', () => {
  let e;
  try { e = JSON.parse(entree); } catch { process.exit(0); }
  const racine = process.env.CLAUDE_PROJECT_DIR || e.cwd || process.cwd();
  const fichier = path.join(racine, '.claude', 'cles.env');
  // Hors d'un dossier Hydra (plugin actif dans une autre session), la garde se tait : même critère que
  // hydra-cles.js — le témoin du plugin, ou la méthode elle-même en copie.
  const estMission = fs.existsSync(path.join(racine, '.claude', 'hydra.json'))
    || fs.existsSync(path.join(racine, '.claude', 'skills', 'hydra-accueil', 'SKILL.md'));
  if (!estMission) process.exit(0);
  const outil = e.tool_name;
  const i = e.tool_input || {};
  const arret = (m) => { process.stderr.write(m + '\n'); process.exit(2); };
  if (outil !== 'Bash') {
    const cible = String(i.file_path || i.path || '');
    if (/(^|\/)cles\.env$/.test(cible)) arret('Le fichier des clés ne s\'ouvre jamais. Une clé s\'utilise par le nom de sa variable, écrit dans la ligne de l\'outil (context/mission.md), avec node .tools/hydra-api.js.');
    process.exit(0);
  }
  const cmd = String(i.command || '');
  if (/cles\.env/.test(cmd)) arret('Le fichier des clés ne s\'ouvre jamais. Une clé s\'utilise par le nom de sa variable, écrit dans la ligne de l\'outil (context/mission.md), avec node .tools/hydra-api.js.');
  if (!fs.existsSync(fichier)) process.exit(0);
  const noms = fs.readFileSync(fichier, 'utf8').split('\n')
    .map((l) => (l.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)=/) || [])[1]).filter(Boolean);
  const cites = noms.filter((n) => cmd.includes(n));
  if (!cites.length) process.exit(0);
  // Les deux scripts permis : relatifs au dossier de mission (`.tools/…`, `./.tools/…`,
  // `$CLAUDE_PROJECT_DIR/.tools/…`), ou par un chemin absolu qui mène exactement aux scripts du
  // dossier de mission ou du plugin d'Hydra (CLAUDE_PLUGIN_ROOT, connu des hooks du plugin) — jamais
  // un script du même nom posé ailleurs.
  const SCRIPTS = ['hydra-api.js', 'hydra-cles-preparer.js'];
  const reel = (d) => { try { return fs.realpathSync(d); } catch { return null; } };
  const permis = [racine, process.env.CLAUDE_PLUGIN_ROOT].filter(Boolean).map(reel).filter(Boolean);
  const m = cmd.match(/^\s*node\s+(?:"([^"]*)"|([^\s"']+))(?=\s|$)/);
  const chemin = m ? (m[1] !== undefined ? m[1] : m[2]) : '';
  const nom = path.basename(chemin);
  const dossierOutils = path.dirname(chemin);
  let bonScript = false;
  if (SCRIPTS.includes(nom) && path.basename(dossierOutils) === '.tools') {
    const base = path.dirname(dossierOutils);
    if (['', '.', '$CLAUDE_PROJECT_DIR'].includes(base) || chemin === '.tools/' + nom) bonScript = true;
    else if (path.isAbsolute(base)) bonScript = permis.includes(reel(base));
  }
  const tete = { test: () => bonScript };
  const reste = m ? cmd.slice(m[0].length) : cmd;
  // Ni $ ni enchaînement (; & | ` retour à la ligne) là où le shell les lit ; entre apostrophes
  // (corps JSON), ils ne sont que du texte et passent. Le $ de $CLAUDE_PROJECT_DIR part avec la tête.
  // Lecture comme le shell : apostrophe dans des guillemets ou échappée, ce n'est pas une ouverture ;
  // une apostrophe jamais refermée arrête la commande.
  const actif = (s) => {
    let lu = '', q = null;
    for (let k = 0; k < s.length; k++) {
      const c = s[k];
      if (q === "'") { if (c === "'") q = null; continue; }
      if (c === '\\') { lu += c + (s[k + 1] || ''); k++; continue; }
      if (q === '"') { if (c === '"') q = null; lu += c; continue; }
      if (c === "'" || c === '"') q = c;
      lu += c;
    }
    return q ? lu + '$' : lu;
  };
  const parScript = tete.test(cmd) && !/[;&|`\n$]/.test(actif(reste));
  if (parScript) process.exit(0);
  const appel = process.env.CLAUDE_PLUGIN_ROOT ? `"${process.env.CLAUDE_PLUGIN_ROOT}/.tools/hydra-api.js"` : '.tools/hydra-api.js';
  arret(`Commande arrêtée : elle utilise ${cites.join(', ')} hors du script d'appel. Une clé ne s'utilise que par :\n  node ${appel} --url <adresse> [--methode POST] --entete 'Nom-en-tête: {${cites[0]}}' [--corps '<json>']\nLe script place la clé lui-même ; la commande ne porte que le nom de la variable, entre accolades, sans $. Refais l'appel ainsi.`);
});
