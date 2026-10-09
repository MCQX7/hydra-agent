#!/usr/bin/env node
// Appel d'une API à clé (analytics ou autre outil branché « API, clé locale »), sans que la clé
// passe jamais dans la commande ni dans la trace : la commande ne porte que le NOM des variables,
// entre accolades ; le script les remplace au moment d'envoyer. Seul le corps de la réponse s'affiche.
//   node .tools/hydra-api.js --url <adresse> [--methode POST] [--entete 'Nom: {VARIABLE}…']… [--corps '<json>']
const args = process.argv.slice(2);
const opt = { entetes: [] };
for (let i = 0; i < args.length; i += 2) {
  const [k, v] = [args[i], args[i + 1]];
  if (k === '--url') opt.url = v;
  else if (k === '--methode') opt.methode = v;
  else if (k === '--entete') opt.entetes.push(v);
  else if (k === '--corps') opt.corps = v;
  else { console.error(`Option inconnue : ${k}`); process.exit(2); }
}
if (!opt.url) { console.error('Il manque --url.'); process.exit(2); }
const manquantes = new Set();
// Clé posée après le démarrage de la session : absente de l'environnement, elle se lit dans le
// fichier des clés (jamais affichée).
const fs = require('fs');
const path = require('path');
let fichierCles = null;
const lireFichier = (nom) => {
  if (!fichierCles) {
    fichierCles = {};
    try {
      const f = path.join(process.env.CLAUDE_PROJECT_DIR || process.cwd(), '.claude', 'cles.env');
      for (const l of fs.readFileSync(f, 'utf8').split('\n')) {
        const m = l.trim().match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
        if (m) fichierCles[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
      }
    } catch { /* pas de fichier */ }
  }
  return fichierCles[nom];
};
const remplir = (t) => t.replace(/\{([A-Za-z_][A-Za-z0-9_]*)\}/g, (_, nom) => {
  const v = process.env[nom] || lireFichier(nom);
  if (!v) { manquantes.add(nom); return ''; }
  return v;
});
const headers = {};
for (const e of opt.entetes) {
  const i = e.indexOf(':');
  if (i < 1) { console.error(`En-tête mal formé (attendu « Nom: valeur ») : ${e.split(':')[0]}`); process.exit(2); }
  headers[e.slice(0, i).trim()] = remplir(e.slice(i + 1).trim());
}
const url = remplir(opt.url);
if (manquantes.size) {
  console.error(`Variable(s) absente(s) de la session : ${[...manquantes].join(', ')} — la clé se pose dans .claude/cles.env.`);
  process.exit(3);
}
if (opt.corps && !Object.keys(headers).some((h) => h.toLowerCase() === 'content-type')) headers['Content-Type'] = 'application/json';
fetch(url, { method: opt.methode || (opt.corps ? 'POST' : 'GET'), headers, body: opt.corps })
  .then(async (r) => {
    const texte = await r.text();
    if (!r.ok) console.log(`HTTP ${r.status}`);
    console.log(texte);
    process.exit(r.ok ? 0 : 1);
  })
  .catch((e) => { console.error(`Appel impossible : ${e.message}`); process.exit(1); });
