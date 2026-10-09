#!/usr/bin/env node
// Prépare le fichier des clés pour un outil branché par API : une clé ne se colle jamais dans la
// conversation (elle finirait dans la trace). Ce script ajoute une ligne « NOM= » vide pour chaque
// nom de variable absent de .claude/cles.env (créé en droits 600 au besoin), ne touche jamais une
// ligne existante, puis ouvre le fichier dans un éditeur de texte : le designer colle sa clé après
// le « = » et enregistre. N'affiche aucune valeur — seulement quels noms sont prêts et lesquels
// sont déjà remplis. HYDRA_SANS_OUVRIR=1 : n'ouvre pas l'éditeur (tests).
//   node .tools/hydra-cles-preparer.js NOM1 NOM2…
const fs = require('fs');
const path = require('path');
const noms = process.argv.slice(2);
if (!noms.length || noms.some((n) => !/^[A-Za-z_][A-Za-z0-9_]*$/.test(n))) {
  console.error('Usage : node .tools/hydra-cles-preparer.js NOM1 NOM2… (noms de variables : lettres, chiffres, _).');
  process.exit(2);
}
const racine = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const dossier = path.join(racine, '.claude');
const fichier = path.join(dossier, 'cles.env');
fs.mkdirSync(dossier, { recursive: true });
let texte = fs.existsSync(fichier) ? fs.readFileSync(fichier, 'utf8') : '';
const existants = new Map();
for (const l of texte.split('\n')) {
  const m = l.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
  if (m) existants.set(m[1], m[2].trim().replace(/^["']|["']$/g, '') !== '');
}
const ajouts = [...new Set(noms)].filter((n) => !existants.has(n));
if (ajouts.length) {
  if (texte && !texte.endsWith('\n')) texte += '\n';
  texte += ajouts.map((n) => `${n}=`).join('\n') + '\n';
  fs.writeFileSync(fichier, texte, { mode: 0o600 });
}
fs.chmodSync(fichier, 0o600);
for (const n of [...new Set(noms)]) console.log(`${n} : prête${existants.get(n) ? ', déjà remplie : oui' : ', déjà remplie : non'}`);
if (process.env.HYDRA_SANS_OUVRIR !== '1') {
  const { spawnSync } = require('child_process');
  const cmd = process.platform === 'darwin' ? ['open', ['-e', fichier]]
    : process.platform === 'win32' ? ['notepad', [fichier]] : ['xdg-open', [fichier]];
  const r = spawnSync(cmd[0], cmd[1], { stdio: 'ignore' });
  console.log(r.status === 0 ? 'Fichier ouvert dans l\'éditeur de texte.' : 'Le fichier n\'a pas pu s\'ouvrir tout seul : le dire au designer.');
}
