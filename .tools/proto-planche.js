#!/usr/bin/env node
'use strict';
/* Planche : la capture d'un proto à côté de ses références, à la même largeur, pour juger
   le proto CONTRE les références (hydra-maquette § Juger contre les références) à l'œil, en
   une seule image.

   Usage : node .tools/proto-planche.js <sujet> <proto> <référence>…
     <sujet>      dossier sous topics/, ou chemin d'un dossier de sujet
     <proto>      nom de base d'un proto de explorations/.src/ (sans .html)
     <référence>  nom de fichier dans refs/ du sujet, ou chemin (relatif au dossier de travail,
                  au sujet, ou à explorations/.shots/ — une capture « avant-<proto>-m.png » y passe)

   Sortie : explorations/.shots/planche-<proto>.png — la capture mobile du proto (<proto>-m.png),
   sinon la desktop (<proto>-d.png) ; puis chaque référence, dans l'ordre de la ligne de commande.
   Chaque image a la largeur de la capture du proto, alignée en haut, à 24 px de la suivante ;
   sous chacune, son nom de fichier en petit. Pas de marge extérieure : la largeur vaut
   N × largeur + (N − 1) × 24.

   Rendu : Chrome headless piloté par le relevé de hydra-mesure (session CDP, même lancement
   et même capture). Aucune dépendance. Code de sortie 1 avec un message clair si la capture du
   proto manque (« lance d'abord la capture du proto »), si une référence est introuvable (elle
   est nommée), ou si le navigateur est absent. Le chemin de la planche est imprimé sur stdout. */
const fs = require('fs');
const path = require('path');
const os = require('os');
const { pathToFileURL } = require('url');
const { session, trouverNavigateur } = require(path.join(__dirname, 'hydra-mesure.js'));

const GAP = 24;                       // écart entre deux images, en px
const SHOTS = '.shots';

function sortie(motif, code){ process.stderr.write('proto-planche : ' + motif + '\n'); process.exit(code); }
const rel = p => path.relative(process.cwd(), p);
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const dormir = ms => new Promise(r => setTimeout(r, ms));

// Largeur et hauteur lues dans l'en-tête PNG (IHDR, octets 16 à 23) : un fait sur le fichier.
function taillePng(f){
  const b = Buffer.alloc(24), fd = fs.openSync(f, 'r');
  try { fs.readSync(fd, b, 0, 24, 0); } finally { fs.closeSync(fd); }
  if(b.readUInt32BE(0) !== 0x89504e47) return null;
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}

// Le dossier du sujet : un chemin s'il en porte un, sinon le nom sous topics/ du dossier de travail.
function dossierSujet(arg){
  const d = /[\\/]/.test(arg) ? path.resolve(arg) : path.join(process.cwd(), 'topics', arg);
  let ok = false; try { ok = fs.statSync(d).isDirectory(); } catch(e){}
  if(!ok) sortie('sujet introuvable : ' + arg + ' (ni chemin, ni dossier sous topics/)', 1);
  return d;
}

// La référence : premier fichier trouvé parmi les emplacements usuels du sujet.
function trouverRef(r, sujet){
  const candidats = [path.resolve(r), path.join(sujet, 'refs', r), path.join(sujet, r),
    path.join(sujet, 'explorations', SHOTS, r)];
  for(const f of candidats){ try { if(fs.statSync(f).isFile()) return f; } catch(e){} }
  sortie('référence introuvable : ' + r + ' (cherchée dans refs/ du sujet, puis à son chemin)', 1);
}

// HTML de la planche : images à la largeur W, alignées en haut, écart GAP, légende en petit.
function page(images, W, total){
  const cases = images.map(im => '<figure><img src="' + esc(pathToFileURL(im.file).href) + '">'
    + '<figcaption>' + esc(path.basename(im.file)) + '</figcaption></figure>').join('');
  return '<!doctype html><meta charset="utf-8"><title>planche</title><style>'
    + 'html,body{margin:0;background:#ECECEC}'
    + '.p{display:flex;gap:' + GAP + 'px;align-items:flex-start;width:' + total + 'px}'
    + 'figure{margin:0;width:' + W + 'px;flex:none}'
    + 'img{display:block;width:' + W + 'px;height:auto}'
    + 'figcaption{margin-top:6px;font:12px/1.2 system-ui,sans-serif;color:#555;white-space:nowrap;'
    + 'overflow:hidden;text-overflow:ellipsis}'
    + '</style><div class="p">' + cases + '</div>';
}

async function rendrePlanche(nav, html, total, out){
  const wrap = path.join(os.tmpdir(), 'hydra-planche-' + process.pid + '-' + Date.now() + '.html');
  fs.writeFileSync(wrap, html);
  try {
    await session(nav, async ({ envoyer, sid }) => {
      await envoyer('Emulation.setDeviceMetricsOverride', { width: total, height: 1000, deviceScaleFactor: 1, mobile: false }, sid);
      await envoyer('Page.navigate', { url: pathToFileURL(wrap).href }, sid);
      // Les images se chargent avant la mesure : sinon la hauteur lue serait celle d'un contenu vide.
      let prete = false;
      for(let i = 0; i < 60 && !prete; i++){
        await dormir(200);
        const r = await envoyer('Runtime.evaluate', { expression: '[...document.images].every(i => i.complete && i.naturalWidth > 0)', returnByValue: true }, sid);
        prete = !!(r.result && r.result.result && r.result.result.value === true);
      }
      if(!prete) throw new Error('images non chargées dans la planche');
      const h = await envoyer('Runtime.evaluate', { expression: 'Math.ceil(document.querySelector(".p").getBoundingClientRect().height)', returnByValue: true }, sid);
      const H = h.result && h.result.result && h.result.result.value;
      if(!(H > 0)) throw new Error('hauteur de la planche illisible');
      await envoyer('Emulation.setDeviceMetricsOverride', { width: total, height: H, deviceScaleFactor: 1, mobile: false }, sid);
      const c = await envoyer('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true,
        clip: { x: 0, y: 0, width: total, height: H, scale: 1 } }, sid);
      const d = c.result && c.result.data;
      if(!d) throw new Error('capture refusée par le navigateur');
      fs.writeFileSync(out, Buffer.from(d, 'base64'));
    });
  } finally { try { fs.unlinkSync(wrap); } catch(e){} }
}

async function planche(argv){
  const [sujetArg, protoArg, ...refs] = argv;
  const sujet = dossierSujet(sujetArg);
  const proto = protoArg.replace(/\.html?$/i, '');
  const shots = path.join(sujet, 'explorations', SHOTS);
  const capture = ['-m', '-d'].map(t => path.join(shots, proto + t + '.png')).find(f => fs.existsSync(f));
  if(!capture) sortie('lance d\'abord la capture du proto (proto-shot) : ' + rel(path.join(shots, proto + '-m.png'))
    + ' ou ' + rel(path.join(shots, proto + '-d.png')) + ' absente', 1);
  const size = taillePng(capture);
  if(!size) sortie('capture du proto illisible (pas un PNG) : ' + rel(capture), 1);
  const W = size.w;
  const images = [capture, ...refs.map(r => trouverRef(r, sujet))].map(f => ({ file: f }));
  const total = images.length * W + (images.length - 1) * GAP;
  const nav = trouverNavigateur();
  if(!nav) sortie('aucun navigateur trouvé (définir HYDRA_BROWSER) — aucune planche', 1);
  const out = path.join(shots, 'planche-' + proto + '.png');
  try { await rendrePlanche(nav, page(images, W, total), total, out); }
  catch(e){ sortie('planche non produite : ' + e.message, 1); }
  process.stdout.write(rel(out) + '\n');
}

if(require.main === module){
  const argv = process.argv.slice(2);
  if(argv.length < 3) sortie('usage : node .tools/proto-planche.js <sujet> <proto> <référence>…', 2);
  planche(argv).catch(e => sortie('échec : ' + e.message, 1));
}

module.exports = { taillePng, page, GAP };
