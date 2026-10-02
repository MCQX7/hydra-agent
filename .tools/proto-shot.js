#!/usr/bin/env node
'use strict';
/* Capture le RENDU d'un proto, pour que la tête regarde ce qu'elle a écrit.
   Troisième outil du trio : md-to-html rend les livrables, proto-frame assemble la
   galerie, proto-shot produit l'image. La tête écrit du HTML à la main et n'a, sans
   ça, aucune prise sur son propre rendu — elle ne peut que relire son source.

   QUATRE captures par proto dans <sujet>/explorations/.shots/, deux par taille :
   - `-m` / `-d`           : au viewport d'appareil du gabarit (390x844, 1280x720).
     La page DÉBORDE, donc une barre collante recouvre le contenu comme dans la
     galerie. Seule vue fidèle à ce que le designer voit en première vue.
   - `-m-full` / `-d-full` : en pleine hauteur. Rien ne déborde, donc une barre
     collante s'y pose naturellement et n'y recouvre RIEN — cette vue ment sur la
     première vue, et c'est la seule qui montre le bas de l'écran (structure des
     blocs, colonne vide, débordements sous la ligne de flottaison).
   - `-m-scroll` : mobile défilé d'une hauteur de viewport, tirée UNIQUEMENT si le
     proto porte `position:sticky|fixed`. Seule vue où une bande épinglée se voit
     DÉTRÔNER ce qu'elle recouvre une fois le chrome sorti de l'écran — les quatre
     autres sont au scroll 0 ou en pleine page, structurellement aveugles à ce
     défaut (un bandeau collant peut passer devant un texte obligatoire : seule
     cette vue le montre).
   Le desktop est rendu à l'échelle 0,75 : un débordement et un chevauchement y
   restent lisibles pour ~40 % de jetons en moins à la lecture.

   Les chemins relatifs du proto (../refs/…) se résolvent depuis explorations/, PAS
   depuis .src/ : le proto est donc encadré comme dans la galerie — iframe srcdoc sous
   un <base> pointant sur explorations/ — sinon les assets liés tombent.

   Navigateur absent ou capture qui n'aboutit pas : aucun fichier, exit 0, la galerie
   le signale (proto-frame). Jamais bloquant, aucune exception qui remonte.

   Ce que la tête reçoit : le CHEMIN des captures, via hookSpecificOutput.additional-
   Context (stdout JSON, non bloquant) — un fait, rien de plus. L'obligation de
   regarder est portée par le skill (maquette § Rendu & QA), pas par ce message :
   deux formulations de la même règle divergeraient.
   stdout ne porte QUE ce JSON ; tout le reste va sur stderr.

   Hook PostToolUse (Write|Edit). Idempotent : les mêmes fichiers sont réécrits. */
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');
const { rendusDuSujet } = require(path.join(__dirname, 'rendus.js'));

const SHOTS = '.shots';
const VIEWS = [
  { tag: 'm',      w: 390,  h: 844,  scale: 1    },   // viewport d'appareil (gabarit)
  { tag: 'm-full', w: 390,  h: 1600, scale: 1    },   // pleine hauteur
  { tag: 'd',      w: 1280, h: 720,  scale: 0.75 },
  { tag: 'd-full', w: 1280, h: 1150, scale: 0.75 },
  // CONDITIONNELLE (`if`) : au scroll 0 un `sticky` n'est pas encore épinglé et un
  // `fixed` ne recouvre que le HAUT de page. Mobile seul (mobile-first, non-négociable de
  // CLAUDE.md) et à 0,75 : un chevauchement de bandes reste lisible pour ~40 % de jetons
  // en moins. Limite : la détection est textuelle, un `sticky` cantonné à une media
  // query desktop serait détecté mais tiré en mobile.
  { tag: 'm-scroll', w: 390, h: 844, scale: 0.75, scroll: true, if: /position:\s*(sticky|fixed)/ }
];
const TIMEOUT_MS = 20000;

function log(m){ process.stderr.write('[proto-shot] ' + m + '\n'); }
function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;'); }
function isProtoSrc(p){ return /(^|\/)topics\/.+\/explorations\/\.src\/[^/]+\.html?$/.test(String(p).replace(/\\/g,'/')); }

// Navigateur : surchargeable par HYDRA_BROWSER, sinon chemins usuels. Aucun n'est
// garanti — l'absence est un fait à DÉCLARER, pas une panne.
function findBrowser(){
  const c = [ process.env.HYDRA_BROWSER,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' ];
  for(const p of c){ try { if(p && fs.existsSync(p)) return p; } catch(e){} }
  return null;
}

// Encadrement identique à la galerie : <base> sur explorations/ + iframe srcdoc.
function wrapper(explorationsDir, html, v){
  const base = 'file://' + explorationsDir.replace(/\\/g,'/') + '/';
  // Le défilement s'exécute DANS le document de l'iframe — aucun accès inter-document,
  // donc aucune question d'origine. Ajouté à la copie sérialisée, jamais au fichier.
  // Le min() borne sur une page courte : la vue ne tombe jamais au-delà de la fin.
  if(v.scroll) html += '<script>addEventListener("load",function(){scrollTo(0,'
    + 'Math.min(innerHeight,document.documentElement.scrollHeight-innerHeight));});<\/script>';
  return '<!doctype html><meta charset="utf-8"><base href="' + base + '">'
    + '<style>html,body{margin:0;background:#fff}iframe{border:0;display:block}</style>'
    + '<iframe width="' + v.w + '" height="' + v.h + '" srcdoc="' + esc(html) + '"></iframe>';
}

function capture(browser, wrapPath, out, v){
  return new Promise(resolve => {
    try { if(fs.existsSync(out)) fs.unlinkSync(out); } catch(e){}
    // Profil neuf par capture, SUPPRIMÉ une fois Chrome sorti : sinon les profils
    // s'accumulent dans le dossier temporaire, un par capture, jamais nettoyés. Sans extensions : sur un
    // profil neuf, Chrome installe ses extensions préinstallées ; tué avant la fin, il laisse
    // leurs paquets dans le dossier temporaire, hors du profil.
    let proc, profil;
    try {
      profil = fs.mkdtempSync(path.join(os.tmpdir(), 'hydra-shot-'));
      proc = spawn(browser, ['--headless=new','--disable-gpu','--hide-scrollbars',
        '--no-first-run','--no-default-browser-check','--disable-extensions','--virtual-time-budget=6000',
        '--user-data-dir=' + profil,
        '--force-device-scale-factor=' + v.scale,
        '--window-size=' + (v.w + 30) + ',' + (v.h + 20),
        '--screenshot=' + out, 'file://' + wrapPath], { stdio: 'ignore' });
    } catch(e){ return resolve(null); }
    const nettoyer = () => { try { fs.rmSync(profil, { recursive: true, force: true }); } catch(e){} };
    const finir = r => {
      try{ proc.kill(); }catch(e){}
      const t = setTimeout(nettoyer, 3000); proc.once('exit', () => { clearTimeout(t); nettoyer(); });
      resolve(r);
    };
    proc.on('error', () => { nettoyer(); resolve(null); });
    const t0 = Date.now();
    // Chrome sans interface ne rend pas toujours la main : on attend le FICHIER, pas la
    // sortie du process (mesuré : ~5 s ; attendre la sortie coûte plusieurs minutes).
    const iv = setInterval(() => {
      let ok = false; try { ok = fs.existsSync(out) && fs.statSync(out).size > 0; } catch(e){}
      if(ok){ clearInterval(iv); setTimeout(() => finir(out), 900); }
      else if(Date.now() - t0 > TIMEOUT_MS){ clearInterval(iv); finir(null); }
    }, 200);
  });
}

async function shoot(protoPath){
  const norm = protoPath.replace(/\\/g,'/');
  const explorationsDir = path.resolve(norm.replace(/\/\.src\/[^/]+$/, ''));
  const base = path.basename(protoPath).replace(/\.html?$/i,'');
  const outDir = path.join(explorationsDir, SHOTS);
  const browser = findBrowser();
  if(!browser){ log('navigateur introuvable — aucune capture (la galerie le signale)'); return; }
  let html; try { html = fs.readFileSync(protoPath,'utf8'); } catch(e){ return; }
  try { fs.mkdirSync(outDir, { recursive: true }); } catch(e){ return; }
  // Seuls les rendus que la fiche demande (rendus.js) : une appli seule n'a pas de desktop.
  const rendus = rendusDuSujet(path.dirname(explorationsDir));
  const wraps = [], done = [];
  await Promise.all(VIEWS.filter(v => (!v.if || v.if.test(html)) && rendus[v.tag[0]]).map(v => {
    const wp = path.join(os.tmpdir(), 'hydra-wrap-' + process.pid + '-' + base + '-' + v.tag + '.html');
    try { fs.writeFileSync(wp, wrapper(explorationsDir, html, v)); } catch(e){ return Promise.resolve(); }
    wraps.push(wp);
    return capture(browser, wp, path.join(outDir, base + '-' + v.tag + '.png'), v)
      .then(r => { if(r) done.push(path.relative(process.cwd(), r)); });
  }));
  wraps.forEach(p => { try { fs.unlinkSync(p); } catch(e){} });
  if(!done.length){ log('capture non aboutie : ' + base); return; }
  done.sort();
  log(done.length + ' capture(s) : ' + base);
  process.stdout.write(JSON.stringify({ hookSpecificOutput: {
    hookEventName: 'PostToolUse',
    additionalContext: 'Rendu du proto capturé : ' + done.join(' · ')
  } }));
}

const arg = process.argv[2];
if(arg){
  if(isProtoSrc(arg)) shoot(path.resolve(arg)).catch(e => log('échec : ' + e.message));
  else log('pas un proto de .src/ : ' + arg);
} else {
  let raw = ''; process.stdin.setEncoding('utf8');
  process.stdin.on('data', d => raw += d);
  process.stdin.on('end', () => {
    let fp = ''; try { fp = (JSON.parse(raw).tool_input || {}).file_path || ''; } catch(e){ process.exit(0); }
    if(!fp || !isProtoSrc(fp)) process.exit(0);
    shoot(fp).catch(e => log('échec : ' + e.message));   // jamais bloquant
  });
}
