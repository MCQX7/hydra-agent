#!/usr/bin/env node
// Démarrage de session : charge les clés d'API du designer (.claude/cles.env, une ligne NOM=valeur,
// jamais versionné) pour les commandes de la session, sous le nom de leur variable. N'affiche rien :
// la valeur ne passe ni dans la trace ni dans ce que voit l'agent. Sans fichier, ne fait rien.
// Ne charge que dans un dossier de mission Hydra : en plugin, ce hook peut tourner dans toutes les
// sessions du designer (plugin installé pour toutes), et une clé ne doit exister que dans le dossier Hydra. Un dossier de mission, c'est le
// témoin du plugin (.claude/hydra.json) ou, en copie, la méthode elle-même (la tête d'accueil, dans
// .claude/skills/). Ailleurs : rien, même si un cles.env s'y trouve.
const fs = require('fs');
const path = require('path');
const racine = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const fichier = path.join(racine, '.claude', 'cles.env');
const estMission = fs.existsSync(path.join(racine, '.claude', 'hydra.json'))
  || fs.existsSync(path.join(racine, '.claude', 'skills', 'hydra-accueil', 'SKILL.md'));
const sortie = process.env.CLAUDE_ENV_FILE;
if (!estMission || !sortie || !fs.existsSync(fichier)) process.exit(0);
const lignes = fs.readFileSync(fichier, 'utf8').split('\n')
  .map((l) => l.trim())
  .filter((l) => /^[A-Za-z_][A-Za-z0-9_]*=/.test(l))
  .map((l) => {
    const i = l.indexOf('=');
    const valeur = l.slice(i + 1).replace(/^["']|["']$/g, '').replace(/'/g, "'\\''");
    return `export ${l.slice(0, i)}='${valeur}'`;
  });
if (lignes.length) fs.appendFileSync(sortie, lignes.join('\n') + '\n');
