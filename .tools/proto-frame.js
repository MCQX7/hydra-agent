#!/usr/bin/env node
'use strict';
/* Assemble la GALERIE d'explorations à partir des protos écrits par la tête.
   Principe jumeau de md-to-html.js : la tête écrit le PROTO seul (un fichier HTML
   auto-contenu par proto, dans <sujet>/explorations/.src/) ; ce script assemble
   le CADRE déterministe autour des protos. La tête n'écrit pas le harnais, donc ne
   peut pas le dégrader.

   Cadre = identité des livrables Hydra (valeurs REPRISES de .tools/hydra-render.html à
   l'identique — pas de fichier de tokens partagé) : masthead « Hydra. »,
   filets, sidebar gauche « Pistes » (traitement du Sommaire), palette + polices.

   Chaque proto isolé dans une <iframe srcdoc> :
   - CSS/JS étanche dans les DEUX sens, quoi que le proto déclare (:root, body, *) ;
   - rendu dans un VIEWPORT d'appareil à scroll interne : mobile 390×844, desktop
     1280×720. Les media queries du proto réagissent à la largeur de l'iframe.
   Le desktop 1280 est mis à l'échelle pour tenir dans le main (--dscale responsive =
   min(1, largeur du main / 1280)) ; le scroll reste INTERNE à l'iframe.

   Contrat tête → gabarit (minimal), attributs sur <html> :
     data-hydra-label="…"  (libellé de piste)   · absent → nom de fichier
     data-hydra-rank="N"   (ordre)               · absent → fin, marqué « (rang ?) »
     data-hydra-note="…"   (texte explicatif)    · absent → repli visible
     data-hydra-piste="P4" (id de piste du rapport, OPTIONNEL) · absent → repli sur la tête du label
     data-hydra-step="2"   (rang de l'étape dans un parcours, OPTIONNEL) · avec la clé de
                           parcours, regroupe les étapes en UN panneau navigable ;
                           absent → entrée séparée, donc un oubli se voit
     data-hydra-geste="…"  (en parcours, sur chaque étape composée après la première : le
                           geste qui y mène depuis la précédente) · affiché en tête de
                           l'étape ; absent → dit dans l'état caché, rien de visible
     data-hydra-flow="P1b" (id de parcours, OPTIONNEL) · défaut = l'id de piste. À déclarer
                           quand deux parcours partagent une piste, sinon ils fusionnent
                           en un seul panneau
     data-hydra-variante="V1" (id de variante, OBLIGATOIRE pour une variante) · range l'entrée
                           sous « Latitude créative », hors du compte des pistes, dans son
                           propre panneau ; absent → numérotée comme une piste
     data-hydra-suite      (sur un CONTRÔLE du proto, pas sur <html> : passage à l'étape
                           suivante, que seule la barre de la galerie fait) · sort des
                           contrôles cliqués au chargement ; absent → cliqué, et dit s'il
                           ne change rien
   Parcours : si le socle du brief relève ≥ 2 écrans ET qu'un proto porte data-hydra-step,
   chaque panneau se déroule sur tous les écrans du socle, dans leur ordre ; l'écran d'un
   proto se déduit de ses blocs, et un écran non recomposé montre la capture déclarée en
   4e colonne du socle (obsPane). step ne sert alors qu'à départager deux protos d'un même écran.
   Rangs en collision : départage par nom de fichier, marqué « (rang N partagé) ».

   Hook PostToolUse (Write|Edit), canal fiable ; et Bash, qui balaie les galeries en
   retard sur le disque. NON BLOQUANT (exit 0). Idempotent. */
const fs = require('fs');
const path = require('path');
// Titres des tableaux du brief : la constante de md-to-html, qui les masque au rendu.
const { SECTIONS_CONTROLE } = require(path.join(__dirname, 'md-to-html.js'));
// index.html s'écrit par renommage : deux écritures parallèles font assembler la même
// galerie par deux hooks à la fois, et une écriture en place se lirait à demi faite.
// UNE implémentation, celle de hydra-bilan.
const { ecrireAtomique } = require(path.join(__dirname, 'hydra-bilan.js'));
const { rendusDuSujet } = require(path.join(__dirname, 'rendus.js'));

const OUT_NAME = 'index.html';

function log(m){ process.stderr.write('[proto-frame] ' + m + '\n'); }
// Texte et attributs du cadre. Les valeurs lues sur <html> sortent DÉCODÉES d'attr() : un
// « < » qui en vient se rééchappe, sinon « &lt;b&gt; » écrit par la tête deviendrait une balise.
// « > » seul n'ouvre rien : il reste tel quel, et le rendu n'en est pas altéré.
function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;'); }
// srcdoc : le proto entier, tel quel. Entre guillemets, « & » et « " » suffisent — et le
// proto reste intact à l'octet près.
function escSrcdoc(s){ return String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;'); }
function pad(n){ return String(n).padStart(2,'0'); }
// Valeur d'attribut telle que le navigateur la lit : références de caractère décodées.
// Brute, « d&#x27;essai » (HTML valide, celui d'un échappement standard) repasserait par
// esc() en « d&amp;#x27;essai » et s'afficherait tel quel dans la galerie. Une seule passe :
// « &amp;#39; » rend « &#39; », pas « ' ». Référence inconnue ou hors Unicode ⇒ laissée
// telle quelle.
const ENTITES = { amp:'&', quot:'"', apos:"'", lt:'<', gt:'>' };
function decode(s){
  return s.replace(/&(?:#(\d+)|#[xX]([\da-fA-F]+)|(amp|quot|apos|lt|gt));/g, (m, d, h, n) => {
    if(n) return ENTITES[n];
    const c = d ? parseInt(d, 10) : parseInt(h, 16);
    return c > 0 && c <= 0x10FFFF ? String.fromCodePoint(c) : m;
  });
}
function attr(html, name){ const m = html.match(new RegExp('<html\\b[^>]*\\b' + name + '="([^"]*)"', 'i')); return m ? decode(m[1]) : null; }
function isProtoSrc(p){ return /(^|\/)topics\/.+\/explorations\/\.src\/[^/]+\.html?$/.test(String(p).replace(/\\/g,'/')); }
function resolveExplorationsDir(p){
  const abs = path.resolve(p);
  const norm = abs.replace(/\\/g,'/');
  const m = norm.match(/^(.*\/explorations)\//);
  if(m) return m[1];
  if(/\/explorations$/.test(norm)) return abs;
  return null;
}

// Réconciliation de couverture : confronte les pistes DÉCLARÉES au rapport (frère
// .src/02-rapport.md) aux protos composés. Notation Hydra P* + nommage de livrable
// Hydra : portable, zéro contenu client. Échec d'extraction => statut explicite,
// JAMAIS un « 0/0 » qui certifierait une couverture complète.
function readRapportPistes(explorationsDir){
  const md = path.join(path.dirname(explorationsDir), '.src', '02-rapport.md');
  if(!fs.existsSync(md)) return { status:'no-file', pistes:[] };
  const seen = {}, pistes = []; let inSec = false;
  // id de piste : P1 · P0 (chiffre) · P-A · P-alt · P-B3 (tiret, SANS chiffre) · PA (majuscule).
  // Rejette Pré · Pré-requis · Pari · Pistes · PDF. Un « Pa » bas-de-casse sans séparateur
  // n'est pas attrapé (ambigu avec un mot) : s'il est seul → 0 piste → statut no-table → invérifiable.
  const idRe = /\bP(?:\d[A-Za-z0-9]*|-[A-Za-z0-9]+|[A-Z]\d*)\b/g;
  for(const ln of fs.readFileSync(md,'utf8').split('\n')){
    if(/^##\s+/.test(ln)){ inSec = /^##\s+Pistes\b/i.test(ln); continue; }
    if(!inSec) continue;
    let m; idRe.lastIndex = 0;
    while((m = idRe.exec(ln))){
      const id = m[0];
      if(seen[id]) continue;
      seen[id] = 1;
      const t = ln.slice(m.index + id.length).match(/^\s*(?:\*\*)?\s*[—–:-]?\s*([^|*]{0,60})/);
      pistes.push({ id, title: t ? t[1].trim() : '' });
    }
  }
  return { status: pistes.length ? 'ok' : 'no-table', pistes };
}
// id de variante (maquette § Brief, latitude créative) : déclaré, jamais déduit.
function varId(v){ const x = attr(v.html, 'data-hydra-variante'); return x && x.trim() ? x.trim() : null; }
// id de piste d'un proto : contrat OPTIONNEL data-hydra-piste, sinon repli = tête du label.
function protoPisteId(v){
  const x = attr(v.html, 'data-hydra-piste');
  if(x && x.trim()) return x.trim();
  const m = (v.label || '').match(/^\s*(P(?:\d[A-Za-z0-9]*|-[A-Za-z0-9]+|[A-Z]\d*))\b/);
  return m ? m[1] : null;
}
// asset LIÉ = <img>, ou référence à un FICHIER d'asset (chemin refs/ ou extension image)
// dans src/href/url(). Exclut fonts (url woff/ttf), gradients, data:, et <svg> INLINE — un
// svg dessiné à la main est une reconstruction, pas un asset exporté (l'export correct se
// LIE depuis refs/). Portable, aucun contenu client présumé. Coarse : reconstruction totale.
function refsAsset(html){
  return /<img\b/i.test(html)
      || /(?:src|href)\s*=\s*["'][^"']*(?:refs\/|\.(?:png|jpe?g|svg|webp|gif|avif))\b/i.test(html)
      || /url\(\s*["']?[^"')]*(?:refs\/|\.(?:png|jpe?g|svg|webp|gif|avif))\b/i.test(html);
}

// Source du chrome déclarée au brief (hydra-maquette § Source du chrome). Même forme que
// readRapportPistes : on lit le FRÈRE .src/03-brief.md, et l'absence est un STATUT —
// jamais un vert par défaut. Titre écrit autrement ⇒ aucune ligne lue ⇒ no-table ⇒
// « invérifiable » : la panne se voit, elle ne se tait pas.
// Parseur de tableau markdown d'un FRÈRE .src/ — mutualisé par les lecteurs de brief.
// La ligne de séparation sépare l'en-tête des données : avant elle, rien n'est une ligne
// de tableau. Repère déterministe, là où comparer aux titres de colonnes serait fragile.
// `heading` est un littéral du code, jamais une entrée : pas d'échappement à prévoir.
function readTable(explorationsDir, file, heading){
  const md = path.join(path.dirname(explorationsDir), '.src', file);
  let txt; try { txt = fs.readFileSync(md, 'utf8'); } catch(e){ return { status:'no-file', rows:[] }; }
  // Pas de `\b` en fin de titre : il est ASCII, donc il ne ferme pas « Socle observé »
  // (é n'est pas un caractère de mot — même morsure que les statuts du tableau du
  // chrome). Un lookahead qui refuse une lettre, accent compris.
  const re = new RegExp('^#{2,3}\\s+' + heading + '(?![\\wÀ-ÿ-])', 'i');
  const rows = []; let inSec = false, afterSep = false;
  for(const ln of txt.split('\n')){
    if(/^#{2,3}\s/.test(ln)){ inSec = re.test(ln); afterSep = false; continue; }
    if(!inSec || !/^\s*\|/.test(ln)) continue;
    const c = ln.split('|').slice(1, -1).map(s => s.trim());
    if(c.length >= 2 && c.every(s => /^:?-{2,}:?$/.test(s))){ afterSep = true; continue; }
    if(afterSep && c.length >= 3) rows.push(c);
  }
  return { status: rows.length ? 'ok' : 'no-table', rows };
}
const sansAccent = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

function readChrome(explorationsDir){
  const t = readTable(explorationsDir, '03-brief.md', SECTIONS_CONTROLE.chrome);
  // Accents : `\b` de JS est ASCII, donc `\blié\b` ne matche PAS « lié » (é n'est pas un
  // caractère de mot, il n'y a pas de frontière après lui) : toutes les lignes « lié » et
  // « écarté » resteraient muettes. On normalise, et on ancre au début de la cellule de
  // statut.
  // Le chemin déclaré peut porter des dossiers : « marque/logo.svg ». Sans le segment,
  // deux fichiers de même nom dans deux dossiers se confondraient. On le garde, on le
  // ramène en relatif à refs/ (un `refs/` ou des `../` de tête écrits par l'auteur sont
  // retirés) et on passe en minuscules — des DEUX côtés de la comparaison.
  const rows = t.rows.map(c => {
    const k = sansAccent(c[1]);
    return { el: c[0], fait: c[2],                           // st null CONSERVÉ : une ligne
      st: /^lie/.test(k) ? 'lie' : /^ecart/.test(k) ? 'ecarte'
        : /^refus/.test(k) ? 'refuse' : null,                // au statut illisible se signale
      // DUPLICATION CONNUE : cette regex et cette normalisation sont celles d'IMG_RE et
      // normRef (plus bas, lecture des captures du socle). Laissée en l'état pour ne pas
      // toucher ce lecteur hors besoin — à fusionner : si l'une change seule, un même
      // chemin sera reconnu par un tableau du brief et pas par l'autre.
      files: (c[2].match(/(?:[\w.-]+\/)*[\w.-]+\.(?:svg|png|jpe?g|webp|gif|avif)/gi) || [])
               .map(p => p.toLowerCase().replace(/^(?:\.\.?\/)*(?:refs\/)?/, '')) };
  });
  return { status: t.status, rows };
}

// Socle observé au brief (hydra-maquette § Socle observé) : écran · bloc · identifiant.
// Le tableau se remplit depuis l'écran OBSERVÉ, avant composition — un tableau déduit des
// protos validerait n'importe quelle amputation. C'est la référence EXTERNE : dix protos
// identiquement amputés ne peuvent plus se valider entre eux.
function readSocle(explorationsDir){
  const t = readTable(explorationsDir, '03-brief.md', SECTIONS_CONTROLE.socle);
  const none = t.rows.some(c => /aucun ecran existant/.test(sansAccent(c.join(' '))));
  const blocs = [], ecrans = [];
  t.rows.forEach(c => {
    const id = c[2].replace(/[`\s]/g, '').toLowerCase();
    // `ecran` sert de CLÉ (comparaison, donc sans accent) ; `ecranNom` sert à l'affichage.
    // Un nom d'écran vide ou « — » n'est pas un écran (il n'entre pas dans `ecrans`) : sa clé
    // reste vide, et le proto qu'il rangerait passe « écran indéterminable », dit à la ligne
    // Socle — sinon il sortirait « écran ? » dans la barre sans que rien ne le dise.
    const ecr = c[0] && !/^[—–-]+$/.test(c[0]) ? c[0] : '';
    if(id && !/^[—–-]+$/.test(id)) blocs.push({ ecran: sansAccent(ecr), ecranNom: ecr, nom: c[1], id });
    // Les écrans dans l'ordre de leur première ligne — l'ordre du parcours quand il y en a
    // un. La 4e colonne porte la capture de l'écran observé, lue sur n'importe quelle ligne
    // de l'écran : c'est la source même du relevé, pas une déclaration de plus.
    if(!c[0] || /^[—–-]+$/.test(c[0])) return;
    const k = sansAccent(c[0]);
    let e = ecrans.find(x => x.ecran === k);
    if(!e) ecrans.push(e = { ecran: k, ecranNom: c[0], files: [] });
    ((c[3] || '').match(IMG_RE) || []).map(normRef)
      .forEach(f => { if(!e.files.includes(f)) e.files.push(f); });
  });
  return { status: t.status, none, blocs, ecrans };
}
// Même regex et même normalisation que readChrome, qui les écrit en ligne : DUPLICATION
// CONNUE, à fusionner (voir le commentaire là-bas). Changer l'une, c'est changer l'autre.
const IMG_RE = /(?:[\w.-]+\/)*[\w.-]+\.(?:svg|png|jpe?g|webp|gif|avif)/gi;
const normRef = p => p.toLowerCase().replace(/^(?:\.\.?\/)*(?:refs\/)?/, '');
// Largeur lue dans l'en-tête PNG (IHDR, octets 16-19) : un fait sur le fichier, jamais une
// déduction de son nom. Autre format ou fichier illisible ⇒ null, et le cadre le dit.
function pngWidth(fp){
  try { const b = Buffer.alloc(24), fd = fs.openSync(fp, 'r');
    fs.readSync(fd, b, 0, 24, 0); fs.closeSync(fd);
    return b.readUInt32BE(0) === 0x89504e47 ? b.readUInt32BE(16) : null; } catch(e){ return null; }
}

// Dimensions PROPRES d'un fichier d'asset : SVG (width/height, à défaut viewBox), PNG,
// GIF, JPEG. Autre format ou fichier illisible ⇒ null — et la ligne le dit, jamais « ok ».
function assetDims(fp){
  try {
    if(/\.svg$/i.test(fp)){
      const s = fs.readFileSync(fp, 'utf8').slice(0, 4000);
      const tag = (/<svg\b[^>]*>/i.exec(s) || [''])[0];
      const num = a => { const m = new RegExp('\\b' + a + '="\\s*([\\d.]+)(?:px)?\\s*"').exec(tag); return m ? +m[1] : null; };
      const vb = /viewBox="\s*[-\d.]+[\s,]+[-\d.]+[\s,]+([\d.]+)[\s,]+([\d.]+)\s*"/.exec(tag);
      const w = num('width') || (vb && +vb[1]), h = num('height') || (vb && +vb[2]);
      return w && h ? { w, h } : null;
    }
    const b = fs.readFileSync(fp);
    if(b.readUInt32BE(0) === 0x89504e47) return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
    if(b.toString('ascii', 0, 3) === 'GIF') return { w: b.readUInt16LE(6), h: b.readUInt16LE(8) };
    if(b[0] === 0xFF && b[1] === 0xD8){                   // JPEG : premier marqueur SOFn
      for(let i = 2; i + 9 < b.length;){
        if(b[i] !== 0xFF){ i++; continue; }
        const m = b[i + 1];
        if(m >= 0xC0 && m <= 0xCF && m !== 0xC4 && m !== 0xC8 && m !== 0xCC)
          return { w: b.readUInt16BE(i + 7), h: b.readUInt16BE(i + 5) };
        i += 2 + b.readUInt16BE(i + 2);
      }
    }
  } catch(e){}
  return null;
}
// Taille de l'élément dans l'écran OBSERVÉ, écrite dans la colonne « fait » d'un lié
// (maquette § Source du chrome) : « L × H ». La première trouvée.
function tailleObservee(fait){
  const m = /(\d+(?:[.,]\d+)?)\s*[×x]\s*(\d+(?:[.,]\d+)?)/.exec(fait || '');
  return m ? { w: +m[1].replace(',', '.'), h: +m[2].replace(',', '.') } : null;
}
// TOLÉRANCE PROVISOIRE, CHOISIE ET NON CALIBRÉE : écart de proportions (en log du rapport
// largeur/hauteur) au-delà duquel le fichier n'a plus la forme de l'élément observé. Aucun
// relevé ne la fonde ; elle se calibre au run, sur des assets justes et faux mesurés.
// Un nom de fichier, c'est l'agent qui le choisit : il ne prouve rien. La forme, si.
const TOL_PROPORTIONS = 0.15;

// Étape NON RECOMPOSÉE d'un parcours (maquette § Socle / variable) : l'écran observé, en
// image. Le lecteur déroule la piste de bout en bout et voit si l'écartement tient — une
// étape écartée à tort montre, sur sa capture, ce que la piste aurait dû y changer.
// Chaque capture va au cadre dont la largeur est la plus proche de la sienne ; largeur
// illisible ⇒ ordre d'écriture (mobile, puis desktop). Jamais agrandie : une image étirée
// ferait lire un écart de gabarit là où il n'y a qu'un écart de source.
function obsPane(explorationsDir, e, i, k){
  const refs = path.join(path.dirname(explorationsDir), 'refs');
  const L = e.files.map(f => { const fp = path.join(refs, f), ok = fs.existsSync(fp);
    return { f, ok, w: ok ? pngWidth(fp) : null }; });
  let m = null, d = null;
  if(L.length && L.every(x => x.w)){
    L.forEach(x => { if(Math.abs(x.w - 390) < Math.abs(x.w - 1280)){ if(!m) m = x; } else if(!d) d = x; });
  } else { m = L[0] || null; d = L[1] || null; }
  const slot = (cls, cap, vw) => {
    const hide = cls === 'd-slot' ? ' hide' : '', dev = cls === 'd-slot' ? 'desktop' : 'mobile';
    if(!cap) return `<div class="frame-wrap ${cls} obs${hide}"><p class="obs-miss">Capture ${dev} de l'écran « ${esc(e.ecranNom)} » non déclarée au socle — étape non montrable.</p></div>`;
    if(!cap.ok) return `<div class="frame-wrap ${cls} obs${hide}"><p class="obs-miss">${esc(cap.f)} déclarée au socle, absente de <code>refs/</code> — étape non montrable.</p></div>`;
    const w = cap.w, shown = w ? Math.min(w, vw) : vw;
    const dim = !w ? 'largeur non lue, ajustée au cadre'
      : w > vw ? `${w} px, réduite à ${Math.round(vw / w * 100)} %` : `${w} px, taille réelle`;
    const cw = cls === 'd-slot' ? `calc(${shown}px * var(--dscale))` : `${shown}px`;
    return `<div class="frame-wrap ${cls} obs${hide}"><div class="obs-scroll"><div class="obs-tag">Image figée · ${dim}</div>`
      + `<img src="../refs/${esc(cap.f)}" alt="Écran observé : ${esc(e.ecranNom)}" style="width:${cw}"></div></div>`;
  };
  return `<div class="step-pane hide" data-p="${i}" data-s="${k}">`
    + `<p class="obs-band"><strong>Écran observé, non recomposé par cette piste.</strong> Image figée de la maquette source, telle que déposée : rien n'y répond au clic, et elle peut montrer autrement — ou omettre — des blocs que les protos reproduisent. Entre cette image et une étape composée, un écart de rendu ou de bloc vient de la source, pas de la piste : ce qui se juge ici, c'est ce que la piste laisse en place.</p>`
    + slot('m-slot', m, 390) + slot('d-slot', d, 1280) + `</div>`;
}

// Captures de contrôle (.tools/proto-shot.js) : un FAIT, pas une déclaration. Un proto
// dont l'image manque n'a PAS pu être regardé — on le dit. On ne demande à personne de
// cocher qu'il a regardé : un auto-report que rien ne vérifie ne vaut rien.
function shotsStatus(explorationsDir, V, rendus){
  const TAGS = [].concat(rendus.m ? ['-m.png','-m-full.png'] : [], rendus.d ? ['-d.png','-d-full.png'] : []);
  let have = [];
  try { have = fs.readdirSync(path.join(explorationsDir, '.shots')); } catch(e){ have = []; }
  if(!have.length) return `<div class="cov cov--warn">Captures : <strong>aucune</strong> — rendu jamais capturé (navigateur indisponible&nbsp;?)</div>`;
  // Un proto à élément épinglé DOIT aussi porter sa vue défilée (proto-shot § VIEWS) —
  // sans ça la vue conditionnelle pourrait ne pas avoir lieu en silence.
  const miss = V.filter(v => !TAGS.concat(rendus.m && /position:\s*(sticky|fixed)/.test(v.html || '') ? ['-m-scroll.png'] : [])
                               .every(t => have.includes(v.file + t)));
  // Nommer chaque manquant DISTINCTEMENT : les étapes d'un parcours partagent leur id de
  // piste, « P1, P1 » ne dirait pas laquelle manque.
  const name = v => { const s = attr(v.html || '', 'data-hydra-step');
    return esc((protoPisteId(v) || v.label) + (s ? ' étape ' + s : '')); };
  return miss.length
    ? `<div class="cov cov--warn">Captures : ${V.length - miss.length} / ${V.length} protos — incomplètes : ${miss.map(name).join(', ')}</div>`
    : `<div class="cov cov--ok">Captures : ${V.length} / ${V.length} protos rendus dans <code>.shots/</code></div>`;
}

// Brief AVANT les protos (maquette § Brief). La question a UNE réponse, au moment de la
// première composition — après, plus rien sur le disque ne la porte : le skill IMPOSE de
// corriger le brief quand la composition révèle un écart, ce qui déplace sa date, et
// aucune date de fichier n'y survit (mesuré : birthtime CONSERVÉ par une
// écriture en place, RÉINITIALISÉ par une écriture atomique par renommage — inexploitable).
// Le verdict se FIGE donc à la première assemblée et voyage dans index.html, qui est
// versionné : il suit le dépôt d'une machine à l'autre, là où un tampon dans .shots/
// (gitignoré) se recalculerait faussement ailleurs.
// MODE DE PANNE CONNU : index.html est le seul porteur. Le supprimer perd le verdict —
// la prochaine assemblée rejuge sur des dates que les corrections ont déplacées.
function briefVerdict(explorationsDir, files, prev){
  const rec = /<!--hydra-order:(ok|absent|late:\d+)-->/.exec(prev || '');
  if(rec) return rec[1];                        // déjà tranché : on ne rejuge pas
  const b = path.join(path.dirname(explorationsDir), '.src', '03-brief.md');
  let bt; try { bt = fs.statSync(b).mtimeMs; } catch(e){ return 'absent'; }
  const first = Math.min.apply(null, files.map(f => {
    try { return fs.statSync(f).mtimeMs; } catch(e){ return Infinity; } }));
  if(!isFinite(first) || bt <= first) return 'ok';
  return 'late:' + Math.round((bt - first) / 1000);
}
// Directions de latitude déclarées au brief : un titre « V<n> » (maquette § Brief), ou une
// puce qui s'ouvre sur « V<n> » dans la section Latitude — une variante écrite en puce et
// jamais composée passerait sinon sans alerte. Compte des ids distincts ; brief absent ⇒ 0, et rien
// ne se signale.
function briefVariantes(explorationsDir){
  let t; try { t = fs.readFileSync(path.join(path.dirname(explorationsDir), '.src', '03-brief.md'), 'utf8'); }
  catch(e){ return 0; }
  const ids = new Set(); let lat = false;
  for(const l of t.split('\n')){
    const h = /^(#{2,4})\s+(.*)$/.exec(l);
    if(h){
      const v = /^V\d+\b/.exec(h[2]); if(v) ids.add(v[0]);
      if(h[1].length === 2) lat = /^Latitude\b/i.test(h[2]);
      continue;
    }
    const p = lat && /^\s*[-*+]\s+(?:\*\*|__)?(V\d+)\b/.exec(l); if(p) ids.add(p[1]);
  }
  return ids.size;
}
function briefLine(v){
  if(v === 'absent') return `<div class="cov cov--warn">Brief : <strong>absent</strong> — les protos ne sont gouvernés par rien</div>`;
  if(v === 'ok') return '';
  return `<div class="cov cov--warn">Brief : écrit <strong>après</strong> le premier proto (${v.slice(5)}&nbsp;s) — écrit après coup, il ne les gouverne pas</div>`;
}

// Une ligne d'état en texte : « ⚠ » pour ce qui demande une action, rien pour le reste.
function etatTexte(h){
  const t = h.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"')
             .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
  return (/cov--warn/.test(h) ? '⚠ ' : '') + t;
}
function etatDe(html){ const m = /<!--hydra-etat\n([\s\S]*?)\n-->/.exec(html || ''); return m ? m[1] : null; }

function assemble(explorationsDir){
  const srcDir = path.join(explorationsDir, '.src');
  if(!fs.existsSync(srcDir)) return null;
  // Lu AVANT de reconstruire : c'est le rendu précédent qui porte le verdict figé.
  const outPath = path.join(explorationsDir, OUT_NAME);
  let prev = ''; try { prev = fs.readFileSync(outPath, 'utf8'); } catch(e){}
  const files = fs.readdirSync(srcDir).filter(f => /\.html?$/i.test(f)).map(f => path.join(srcDir, f));
  if(!files.length) return null;

  const V = files.map(fp => {
    const html = fs.readFileSync(fp, 'utf8');
    const base = path.basename(fp).replace(/\.html?$/i,'');
    const label = attr(html, 'data-hydra-label') || base;             // repli : nom de fichier
    const note = attr(html, 'data-hydra-note') || '';
    const raw = attr(html, 'data-hydra-rank');
    const rank = (raw !== null && raw.trim() !== '' && !isNaN(+raw)) ? +raw : Infinity; // repli : fin
    // declare : le libellé vient du proto, pas du nom de fichier — lui seul se compare au proto.
    return { file: base, label, note, rank, html, declare: !!attr(html, 'data-hydra-label') };
  });
  V.sort((a,b) => (a.rank - b.rank) || a.file.localeCompare(b.file));  // rang, puis nom (déterministe)

  // ---- écran de chaque proto : sert à la fidélité du socle ET au parcours -------------
  // Un proto PORTE un bloc s'il cite son identifiant dans un data-hydra-bloc. L'écran d'un
  // proto se DÉDUIT des identifiants qu'il porte : ni colonne ni attribut de plus. Le
  // dénominateur d'un bloc est le nombre de protos qui composent SON écran — « tous les
  // protos » allumerait la ligne en permanence dès qu'un parcours mêle des écrans.
  const so = readSocle(explorationsDir);
  const T = V.map(v => { const s = new Set(); let m;
    const re = /data-hydra-bloc\s*=\s*"([^"]*)"/gi;
    while((m = re.exec(v.html))) sansAccent(m[1]).split(/[\s,;]+/).filter(Boolean).forEach(x => s.add(x));
    return { v, t: s }; });
  const sansAnnot = T.filter(x => !x.t.size);
  // Un identifiant PARTAGÉ (bandeau, en-tête, barre d'action) ne range personne : le tableau
  // lui donne une ligne par écran, donc il vit sur plusieurs. Seul un identifiant EXCLUSIF à
  // un écran y range le proto qui le porte. Indexer l'écran PAR IDENTIFIANT écraserait
  // l'écran des partagés au dernier lu : mesuré sur un run réel, 12 des 15 lignes signalées
  // comparaient alors un bloc d'un écran aux protos d'un autre.
  const surN = {}; so.blocs.forEach(b => { (surN[b.id] = surN[b.id] || new Set()).add(b.ecran); });
  T.forEach(x => {
    const v = {};
    x.t.forEach(id => { const s = surN[id];
      if(s && s.size === 1){ const e = [...s][0]; v[e] = (v[e] || 0) + 1; } });
    const o = Object.keys(v).sort((a, b) => v[b] - v[a]);
    // Écran indécidable — aucun exclusif, ou égalité entre deux écrans — se DIT, jamais ne se devine.
    x.ecran = o.length && (o.length === 1 || v[o[0]] > v[o[1]]) ? o[0] : null;
  });
  const flou = T.filter(x => x.t.size && !x.ecran);

  // Un parcours se compose UNE ÉTAPE PAR FICHIER (maquette § Socle / variable) : chaque
  // étape est donc capturée et inspectée comme un proto. C'est ici qu'on les rassemble en
  // un panneau navigable — V reste par FICHIER, pour que le décompte des captures et la
  // couverture continuent d'exiger CHAQUE étape. Regroupement sur le couple
  // data-hydra-step + data-hydra-piste ; l'un des deux manque ⇒ entrée séparée, donc un
  // oubli se VOIT dans la galerie au lieu de se taire.
  // Mode PARCOURS : le socle relève au moins deux écrans ET un proto se déclare étape — le
  // premier fait est posé avant composition, le second par la composition : rien ne se
  // suppose. Chaque panneau se déroule alors sur TOUS les écrans du socle, dans leur ordre ;
  // un écran que la piste ne recompose pas montre l'écran observé (obsPane). `step` ne sert
  // alors qu'à départager deux protos d'un même écran : c'est un rang parmi les fichiers,
  // jamais une position dans le parcours — lu comme une position, deux confirmations à
  // step=1 et step=2 donneraient « (2 étapes) » et cacheraient l'étape sautée. Hors de ce
  // cas, rien ne change.
  const stepOf = v => { const r = attr(v.html, 'data-hydra-step');
    return (r !== null && String(r).trim() !== '' && !isNaN(+r)) ? +r : null; };
  const parcours = so.status === 'ok' && !so.none && so.ecrans.length >= 2
                && V.some(v => stepOf(v) !== null);
  const ecranDe = new Map(T.map(x => [x.v, x.ecran]));
  const rangEcran = v => { const j = so.ecrans.findIndex(e => e.ecran === ecranDe.get(v));
    return j < 0 ? Infinity : j; };
  const G = [], byFlow = {};
  V.forEach(v => {
    const step = stepOf(v);
    // Clé de panneau : l'id de variante si déclaré, puis data-hydra-flow, puis l'id de piste.
    // Sans la première, une VARIANTE (même data-hydra-piste que la piste qu'elle re-forme)
    // serait absorbée dans le panneau de sa piste, qui compterait ses fichiers parmi ses étapes.
    const piste = varId(v) || attr(v.html, 'data-hydra-flow') || protoPisteId(v);
    // En parcours, un proto sans step rejoint quand même sa piste : son écran le place.
    // `src` : le proto dont le panneau reprend le libellé et la note.
    if((step === null && !parcours) || !piste){ G.push({ steps: [v], ord: [0], rank: v.rank, label: v.label, note: v.note, src: v }); return; }
    let g = byFlow[piste];
    if(!g){ g = byFlow[piste] = { steps: [], ord: [], rank: v.rank, label: v.label, note: v.note, src: v }; G.push(g); }
    g.steps.push(v); g.ord.push(step === null ? 0 : step);
    if(v.rank < g.rank){ g.rank = v.rank; g.label = v.label; g.note = v.note; g.src = v; }
  });
  G.forEach(g => {
    // Infinity − Infinity vaut NaN, donc faux : deux protos hors écran retombent sur `step`.
    const k = g.steps.map((_,j) => j).sort((a,b) =>
      (parcours ? rangEcran(g.steps[a]) - rangEcran(g.steps[b]) : 0) || g.ord[a] - g.ord[b]);
    g.steps = k.map(j => g.steps[j]);
    // Un proto dont l'écran est indéterminable (déjà nommé par la ligne Socle) reste dans
    // son panneau, après les écrans connus : on ne le range pas au jugé.
    g.items = !parcours ? g.steps : so.ecrans.flatMap(e => {
      const p = g.steps.filter(v => ecranDe.get(v) === e.ecran);
      return p.length ? p : [{ obs: e }];
    }).concat(g.steps.filter(v => rangEcran(v) === Infinity));
    g.done = so.ecrans.filter(e => g.steps.some(v => ecranDe.get(v) === e.ecran)).length;
    g.ks = g.items.indexOf(g.src);             // étape du cadre source du libellé de panneau
  });
  G.sort((a,b) => (a.rank - b.rank) || a.steps[0].file.localeCompare(b.steps[0].file));

  const rc = {};
  G.forEach(g => { if(g.rank !== Infinity) rc[g.rank] = (rc[g.rank]||0) + 1; });

  // Geste d'un parcours : chaque étape COMPOSÉE après la première déclare, sur son proto, le
  // geste qui y mène depuis l'étape précédente (data-hydra-geste). C'est une information de
  // parcours pour le lecteur : elle s'affiche en tête de l'étape. Son oubli est un contrôle :
  // il part dans l'état caché, jamais dans une ligne visible. Une étape d'existant n'a pas
  // de proto, donc pas de déclaration à attendre.
  // Libellé REPRIS d'un proto : il porte le cadre source (panneau/étape) et l'attribut. Au
  // chargement, son texte se compare à l'attribut que le navigateur lit dans ce cadre
  // (chargerCadres) — sans quoi un libellé mal décodé passerait, puisque rien ne regarderait
  // ce que le cadre compose lui-même. Le marqueur n'enveloppe que le libellé : numéros, marques et
  // compteurs du cadre restent dehors. Un élément qui ne le porte pas sort de la comparaison.
  const lib = (i, k, a, t) => `<span data-hydra-lib="${i}/${k}/${a}">${esc(t)}</span>`;
  const libelle = (g, i) => g.ks >= 0 && g.src.declare ? lib(i, g.ks, 'label', g.label) : esc(g.label);
  const gestesManquants = [];
  const cadres = {};                         // « panneau/étape » → proto, pour nommer un cadre en erreur
  const panels = G.map((g,i) => {
    g.items.forEach((v,k) => { if(!v.obs) cadres[i + '/' + k] = v.file; });
    const multi = g.items.length > 1;
    const gesteDe = (v, k) => {
      if(!parcours || k === 0 || v.obs) return '';
      const x = attr(v.html, 'data-hydra-geste');
      // Numéro de l'étape précédente, le même que dans la barre : k (base 0) = son rang.
      if(x && x.trim()) return `<p class="geste"><span>Depuis l'étape ${k}</span> ${lib(i, k, 'geste', x.trim())}</p>`;
      gestesManquants.push((protoPisteId(v) || g.label) + ' · ' + (rangEcran(v) !== Infinity ? so.ecrans[rangEcran(v)].ecranNom : v.label));
      return '';
    };
    // En parcours, une étape se nomme par son écran du socle : le nom de la piste est déjà en
    // tête du panneau. Deux protos d'un même écran gardent leur libellé pour se distinguer.
    // Écran indéterminable : le libellé du proto, suivi de « écran ? » — et la ligne Socle le dit.
    const nomEtape = (v, k) => { const j = rangEcran(v);
      if(!parcours || j === Infinity) return (v.declare ? lib(i, k, 'label', v.label) : esc(v.label)) + (parcours ? ' · écran ?' : '');
      return esc(so.ecrans[j].ecranNom) + (g.items.filter(x => !x.obs && rangEcran(x) === j).length > 1 ? ' · ' + esc(v.label) : ''); };
    // Le panneau s'ouvre sur la première étape COMPOSÉE : l'entrée d'une piste montre la
    // piste, pas l'existant qu'elle laisse en place.
    const on = g.items.findIndex(x => !x.obs);
    // La barre se lit sans explication : un titre qui dit que c'est un parcours et combien
    // il a d'étapes, chaque étape numérotée, une flèche entre deux. Le geste reprend le numéro.
    const num = k => `<span class="stepb__n">${k + 1}</span>`;
    const nav = multi ? `<div class="steps__t">Parcours en ${g.items.length} étapes</div><nav class="steps">` + g.items.map((v,k) => (k ? '<span class="steps__sep" aria-hidden="true">›</span>' : '') + (v.obs
        ? `<button class="stepb stepb--obs${k === on ? ' on' : ''}" data-p="${i}" data-s="${k}">${num(k)}${esc(v.obs.ecranNom)} · existant</button>`
        : `<button class="stepb${k === on ? ' on' : ''}" data-p="${i}" data-s="${k}">${num(k)}${nomEtape(v, k)}</button>`)).join('') + `</nav>` : '';
    const panes = g.items.map((v,k) => v.obs ? obsPane(explorationsDir, v.obs, i, k) :
        `<div class="step-pane${(multi && k !== on) ? ' hide' : ''}" data-p="${i}" data-s="${k}">`
      + gesteDe(v, k)
      + `<div class="frame-wrap m-slot"><iframe class="m-frame" srcdoc="${escSrcdoc(v.html)}"></iframe></div>`
      + `<div class="frame-wrap d-slot hide"><iframe class="d-frame" srcdoc="${escSrcdoc(v.html)}"></iframe></div>`
      + `</div>`).join('');
    return `<section class="panel" data-i="${i}">`
      + `<div class="pnote"><span class="h">${libelle(g, i)}</span>${g.note ? esc(g.note) : '<em class="muted">(pas de note — data-hydra-note absent)</em>'}</div>`
      + nav + panes + `</section>`;
  }).join('\n');

  // --- couverture : pistes du rapport vs protos composés ---
  const rap = readRapportPistes(explorationsDir);
  const linkUncertain = rap.status === 'ok' && !V.some(protoPisteId) && V.length > 0;
  // Une variante n'est pas une piste (maquette § Brief, latitude créative : « elle ne
  // compte pas comme couverture »). Elle se reconnaît à sa SEULE déclaration,
  // data-hydra-variante, jamais au jugé : deviner (seconde entrée d'une même piste, entrée
  // sans id, flow distinct de l'id de piste) rangerait en « variante » un step oublié ou un
  // flow mal tapé — un trou se déguiserait en latitude. Une variante
  // non déclarée reste donc numérotée parmi les pistes, et l'alerte de latitude ci-dessous
  // — déclarée au brief, jamais composée — en garde la trace.
  G.forEach(g => {
    g.vid = varId(g.steps[0]);
    g.variante = !!g.vid;
    g.re = g.variante ? protoPisteId(g.steps[0]) : null;
  });
  // Ne compte que les entrées-pistes : une piste que seule sa variante compose n'est PAS
  // composée — la compter certifierait une couverture que le lecteur ne voit pas.
  const composed = new Set(G.filter(g => !g.variante)
    .flatMap(g => g.steps.map(protoPisteId)).filter(Boolean));
  const missing = (rap.status === 'ok' && !linkUncertain) ? rap.pistes.filter(p => !composed.has(p.id)) : [];
  let coverage;
  if(rap.status !== 'ok')
    coverage = `<div class="cov cov--warn">Couverture : rapport ${rap.status==='no-file'?'introuvable':'sans table de pistes lisible'} — <strong>invérifiable</strong></div>`;
  else if(linkUncertain)
    coverage = `<div class="cov cov--warn">Couverture : ${V.length} proto(s) / ${rap.pistes.length} pistes — <strong>liaison proto↔piste indéterminée</strong>, à vérifier</div>`;
  else {
    const n = rap.pistes.length, m = n - missing.length;
    coverage = `<div class="cov ${m<n?'cov--warn':'cov--ok'}">Couverture : <strong>${m} / ${n}</strong> pistes composées${m<n?` — ${n-m} sans proto`:''}</div>`;
  }
  // ---- fidélité du socle -------------------------------------------------------------
  // Numérateur ET dénominateur par écran. Compter les protos porteurs tous écrans confondus
  // gonflerait AUSSI le numérateur : un bloc sur deux écrans sortirait à la somme des deux.
  const compte = so.blocs.map(b => ({ ...b,
    n:    T.filter(x => x.ecran === b.ecran && x.t.has(b.id)).length,
    elig: T.filter(x => x.ecran === b.ecran).length }));
  const absents = compte.filter(b => !b.n), partiels = compte.filter(b => b.n && b.n < b.elig);
  // Un bloc partagé a une ligne par écran : sans son écran, « 4/5 · 2/3 » ne se lit pas.
  const situe = b => esc(b.nom) + (surN[b.id].size > 1 ? ' (' + esc(b.ecranNom || 'écran sans nom') + ')' : '');
  const bribes = [
    absents.length  ? absents.map(situe).join(', ') + ' — composé(s) dans aucun proto' : '',
    partiels.length ? partiels.map(b => situe(b) + ' ' + b.n + '/' + b.elig).join(' · ') : '',
    flou.length ? flou.map(x => esc(protoPisteId(x.v) || x.v.label)).join(', ')
                  + ' — écran indéterminable' : '',
    sansAnnot.length ? sansAnnot.map(x => esc(protoPisteId(x.v) || x.v.label)).join(', ')
                       + ' sans aucun bloc annoté' : ''
  ].filter(Boolean);
  const socle = so.status !== 'ok'
    ? `<div class="cov cov--warn">Socle : ${so.status === 'no-file' ? 'sans brief' : 'non déclaré au brief'} — <strong>invérifiable</strong></div>`
    : so.none
      ? `<div class="cov cov--ok">Socle : aucun écran existant à reproduire, déclaré</div>`
      : sansAnnot.length === V.length
        ? `<div class="cov cov--warn">Socle : ${so.blocs.length} bloc(s) observé(s), châssis <strong>non annoté</strong> — fidélité invérifiable</div>`
        : bribes.length
          ? `<div class="cov cov--warn">Socle : ${bribes.join(' · ')}</div>`
          : `<div class="cov cov--ok">Socle : ${so.blocs.length} bloc(s) observé(s), tous composés partout où leur écran l'est</div>`;

  const noAsset = V.filter(v => !refsAsset(v.html));
  const ch = readChrome(explorationsDir);
  // refs/ en RÉCURSIF, chemins relatifs à refs/ : un asset rangé dans un sous-dossier est
  // trouvé. Trois états distincts — une liste vide qui produirait N alertes d'absence
  // serait une panne déguisée en constat, donc l'absence du dossier et l'échec du parcours
  // se disent chacun pour ce qu'ils sont.
  const refsDir = path.join(path.dirname(explorationsDir), 'refs');
  let inRefs = [], refsState = 'ok';
  if(!fs.existsSync(refsDir)) refsState = 'missing';
  else try {
    const walk = (d, pre) => fs.readdirSync(d, { withFileTypes: true }).forEach(e =>
      e.isDirectory() ? walk(path.join(d, e.name), pre + e.name.toLowerCase() + '/')
                      : inRefs.push(pre + e.name.toLowerCase()));
    walk(refsDir, '');
  } catch(e){ inRefs = []; refsState = 'unreadable'; }
  // Ce que les protos référencent SOUS refs/, en chemins relatifs à refs/. Appartenance à
  // un ensemble, jamais sous-chaîne : « bigbadge.svg » ne satisfait pas « badge.svg » — une
  // sous-chaîne ferait disparaître en silence l'alerte d'orphelin. Un lien qui ne
  // pointe pas dans refs/ ne pointe pas vers l'asset exporté : il ne l'atteste pas.
  const refd = new Set((V.map(v => v.html).join('\n')
    .match(/refs\/(?:[\w.-]+\/)*[\w.-]+\.(?:svg|png|jpe?g|webp|gif|avif)/gi) || [])
    .map(s => s.toLowerCase().replace(/^refs\//, '')));
  const gaps = [];
  if(noAsset.length) gaps.push(noAsset.map(v => esc(protoPisteId(v) || v.label)).join(', ')
    + ' sans aucune référence d\'asset lié');
  // Aucun échec de vérification n'est SILENCIEUX : une ligne dont la colonne « fait » ne
  // porte rien d'exploitable ne vérifie rien — la compter pour verte serait un 0/0 qui
  // certifie. Un « lié » sans nom de fichier est donc un défaut, au même titre qu'un
  // « écarté » ou « refusé » sans fait.
  ch.rows.forEach(r => {
    if(!r.st)
      gaps.push(esc(r.el) + ' : statut illisible (attendu lié, écarté ou refusé)');
    else if(r.st === 'lie' && !r.files.length)
      gaps.push(esc(r.el) + ' : déclaré lié, aucun nom de fichier dans la colonne fait');
    else if(r.st !== 'lie' && !r.fait)
      gaps.push(esc(r.el) + ' : statut « ' + (r.st === 'ecarte' ? 'écarté' : 'refusé') + ' » sans fait');
  });
  // Réconciliation : le TABLEAU est la source de vérité, jamais le contenu de refs/ —
  // qui porte aussi les visuels du rapport (frames, benchmark), étrangers aux protos.
  // Un fichier non déclaré est donc invisible au contrôle : exporter davantage ne peut
  // qu'ajouter des alertes, jamais en retirer.
  if(refsState !== 'ok' && ch.rows.some(r => r.st === 'lie'))
    gaps.push(refsState === 'missing'
      ? 'des éléments sont déclarés liés, mais <code>refs/</code> n\'existe pas'
      : '<code>refs/</code> illisible — les liens déclarés n\'ont pas pu être vérifiés');
  else ch.rows.filter(r => r.st === 'lie').forEach(r => r.files.forEach(f => {
    if(!inRefs.includes(f)) gaps.push(esc(f) + ' déclaré lié, absent de <code>refs/</code>');
    else if(!refd.has(f))   gaps.push(esc(f) + ' exporté, référencé par aucun proto');
    // Un asset plausible et faux passe les trois contrôles de chemin : sa FORME le trahit.
    const obs = tailleObservee(r.fait);
    if(!inRefs.includes(f)) return;
    if(!obs){ gaps.push(esc(f) + ' : lié sans la taille de l\'élément observé — sa forme ne se vérifie pas'); return; }
    const dim = assetDims(path.join(refsDir, f));
    if(!dim){ gaps.push(esc(f) + ' : proportions du fichier illisibles — forme non vérifiée'); return; }
    // Une taille qui VAUT celle du fichier au centième près a été lue sur le fichier, pas
    // à l'écran : la comparaison qui suit ne pourrait pas échouer. Sauf une image
    // vectorielle : exportée de la librairie, sa taille nominale EST celle du composant.
    if(!/\.svg$/i.test(f) && Math.abs(obs.w - dim.w) < 0.01 && Math.abs(obs.h - dim.h) < 0.01){
      gaps.push(esc(f) + ' : taille identique au fichier — lue à l\'écran ?'); return; }
    if(Math.abs(Math.log((obs.w / obs.h) / (dim.w / dim.h))) > TOL_PROPORTIONS)
      gaps.push(esc(f) + ' : proportions ' + Math.round(dim.w) + '×' + Math.round(dim.h)
        + ' contre ' + obs.w + '×' + obs.h + ' observé — est-ce bien l\'élément ?');
  }));
  const approx = ch.rows.filter(r => r.st === 'refuse').length;
  const assets = ch.status !== 'ok'
    ? `<div class="cov cov--warn">Assets : source du chrome ${ch.status === 'no-file' ? 'sans brief' : 'non déclarée au brief'} — <strong>invérifiable</strong></div>`
    : gaps.length
      ? `<div class="cov cov--warn">Assets : ${gaps.join(' · ')}</div>`
      : `<div class="cov cov--ok">Assets : ${ch.rows.length} élément(s) de chrome déclaré(s)${approx ? `, dont <strong>${approx} approximé(s)</strong> en esquisse` : ''}</div>`;
  const ghostRows = missing.map((p,k) =>
    `<li><button class="piste piste--ghost" data-i="${G.length+k}"><span class="num">—</span><span>${esc(p.id)}${p.title?' — '+esc(p.title):''} <em>(non composée)</em></span></button></li>`
  ).join('\n');
  // ---- barre latérale : les pistes, puis la latitude créative ------------------------
  // Ce que la barre numérote est ce que la ligne Couverture compte : les variantes vont sous
  // leur propre intitulé, avec leur id et la piste qu'elles re-forment.
  const mark = g => g.rank === Infinity ? ' <em>(rang ?)</em>'
                  : rc[g.rank] > 1 ? ` <em>(rang ${g.rank} partagé)</em>` : '';
  // En parcours, l'entrée dit ce que la piste recompose du parcours, pas combien de fichiers.
  const nb = g => parcours ? ` <em>(${g.done} / ${so.ecrans.length} étapes composées)</em>`
                : g.steps.length > 1 ? ` <em>(${g.steps.length} étapes)</em>` : '';
  const row = (g, i, num, sub) => `<li><button class="piste" data-i="${i}"><span class="num">${num}</span><span>${libelle(g, i)}${sub}${mark(g)}${nb(g)}</span></button></li>`;
  let n = 0;
  const pistes = G.map((g,i) => g.variante ? '' : row(g, i, pad(++n), '')).filter(Boolean).join('\n');
  const nomDe = {}; G.forEach(g => { const p = protoPisteId(g.steps[0]); if(!g.variante && p && !nomDe[p]) nomDe[p] = g.label; });
  const vRows = G.map((g,i) => !g.variante ? '' : row(g, i, esc(g.vid),
    g.re && nomDe[g.re] ? ` <em>(variante de « ${esc(nomDe[g.re])} »)</em>` : '')).filter(Boolean).join('\n');
  // Le brief déclare sa latitude (maquette § Brief : au moins une direction COMPOSÉE en
  // variante). Déclarée et jamais composée ⇒ l'absence se dit à l'endroit où la variante
  // serait. Rien de déclaré, rien de composé ⇒ rien : un sujet sans variante n'en porte aucune trace.
  const vDecl = briefVariantes(explorationsDir);
  const latitude = vRows
    ? `<div class="rail__label rail__label--sub">Latitude créative</div><ol class="rail__toc">${vRows}</ol>`
    : '';
  const latitudeEtat = !vRows && vDecl
    ? `<div class="cov cov--warn">Latitude : aucun proto déclaré en variante — le brief en déclare ${vDecl} ; au moins une se compose, et se déclare (<code>data-hydra-variante</code>)</div>`
    : '';
  const ghostPanels = missing.map((p,k) =>
    `<section class="panel panel--ghost" data-i="${G.length+k}"><div class="pnote"><span class="h">${esc(p.id)}${p.title?' — '+esc(p.title):''}</span>Aucun proto : piste du rapport non composée — non arbitrable en l'état.</div></section>`
  ).join('\n');

  const verdict = briefVerdict(explorationsDir, files, prev);
  // Les lignes d'état sont des CONTRÔLES : elles servent l'agent pendant le run, pas le
  // lecteur de la galerie, qui la partage. Elles quittent l'affichage pour un commentaire
  // caché de index.html (versionné avec lui) et partent à l'agent par le hook. Ce qui reste
  // visible est du contenu : pistes non composées, étapes composées, variantes.
  const gesteEtat = gestesManquants.length
    ? `<div class="cov cov--warn">Parcours : geste non déclaré (data-hydra-geste) — ${gestesManquants.map(esc).join(' · ')}</div>` : '';
  const rendus = rendusDuSujet(path.dirname(explorationsDir));
  const etat = [rendus.etat, coverage, shotsStatus(explorationsDir, V, rendus), briefLine(verdict), socle, assets, latitudeEtat, gesteEtat]
    .filter(Boolean).map(etatTexte);
  // Remplacement en FONCTION, comme md-to-html : en chaîne, « $$ » devient « $ » et « $& »,
  // « $' » réinjectent le gabarit — le code des protos serait réécrit à l'insertion.
  const rendre = lignes => TEMPLATE
    .replace('<!--COVERAGE-->', () => '<!--hydra-etat\n' + lignes.join('\n').replace(/--/g, '- -') + '\n-->')
    .replace('<!--SHOTS-->', () => '')
    .replace('<!--DEVBAR-->', () => (rendus.m ? '<button data-dev="m">Mobile 390×844</button>' : '')
      + (rendus.d ? '<button data-dev="d">Desktop 1280×720</button>' : ''))
    .replace('<!--BRIEF-->', () => '<!--hydra-order:' + verdict + '-->')
    .replace('<!--SOCLE-->', () => '')
    .replace('<!--ASSETS-->', () => '')
    .replace('<!--PISTES-->', () => pistes + (ghostRows ? '\n' + ghostRows : ''))
    .replace('<!--LATITUDE-->', () => latitude)
    .replace('<!--PANELS-->', () => panels + (ghostPanels ? '\n' + ghostPanels : ''))
    .replace('<!--EXTRA-CSS-->', () => (parcours ? OBS_CSS : '') + (latitude ? LAT_CSS : '')
      + (G.some(g => g.items.length > 1) ? STEPS_CSS : ''));
  // Les lignes Scripts, Libellés et Contrôles dérivent du reste du fichier (elles se lisent en le
  // chargeant) : la comparaison « inchangé » les ignore, et une galerie inchangée garde
  // celles du rendu précédent sans être rechargée.
  const prevNav = (etatDe(prev) || '').split('\n').filter(l => NAV.test(l));
  const out = rendre(etat);
  if(prev && sansScripts(prev) === out){
    log('inchangé : ' + outPath);
    return finir({ outPath, prev, rendre, etat: etat.concat(prevNav), ecrit: false });
  }
  ecrireAtomique(outPath, out);
  log('écrit ' + outPath + ' (' + V.length + ' proto' + (V.length>1?'s':'') + ')');   // « [proto-frame] écrit » : lu par hydra-bilan --duree
  return finir({ outPath, prev, rendre, etat, ecrit: true, cadres });
}

// Un état se dit UNE fois : il part à l'agent s'il diffère de celui du rendu précédent.
// Au message, pas la ligne Captures : proto-shot tourne en même temps que ce hook, donc
// au moment de l'écriture elle compterait manquante la capture qui est en train de se
// faire. La fraîcheur des captures est l'affaire du garde de fin de tour.
const NAV = /^(⚠ )?(Scripts|Libellés|Contrôles) :/; // lignes du chargement dans le navigateur
const horsCaptures = ls => ls.filter(l => !/^(⚠ )?Captures :/.test(l));
const sansScripts = html => html.replace(/(?:\n(?:⚠ )?(?:Scripts|Libellés|Contrôles) : [^\n]*)+\n-->/, '\n-->');
function finir(r){
  r.message = horsCaptures(r.etat);
  r.nouveau = horsCaptures((etatDe(r.prev) || '').split('\n')).join('\n')
              !== r.message.join('\n').replace(/--/g, '- -');
  return r;
}

// —— Scripts des cadres : la galerie ASSEMBLÉE, chargée dans Chrome ——————————————
// Les captures photographient chaque proto SEUL : une erreur que l'assemblage introduit
// (remplacement qui réécrit le code, collision entre protos) n'y apparaît jamais, et
// personne ne la voit. On charge donc index.html tel qu'il est écrit, on relève les
// erreurs levées au CHARGEMENT dans chaque cadre, et la ligne part dans l'état caché.
// Limite : une erreur qui ne survient qu'au clic n'est pas vue — elle reste à l'œil du
// designer. Pilotage CDP de hydra-mesure (session partagée, aucune copie).
// Le MÊME chargement compare les libellés que la galerie compose (ligne Libellés, voir
// comparerLibelles), puis clique les contrôles des protos (ligne Contrôles, voir
// cliquerControles). Non vérifié ⇒ ça se dit, sur chaque ligne, jamais un silence.
async function verifierScripts(r){
  if(!r.ecrit) return r;
  const lignes = await chargerCadres(r.outPath, r.cadres || {});
  if(!lignes) return r;
  r.etat = r.etat.concat(lignes);
  try { ecrireAtomique(r.outPath, r.rendre(r.etat)); } catch(e){ log('état des scripts non écrit : ' + e.message); }
  return finir(r);
}
async function chargerCadres(outPath, cadres){
  const nonVerifies = raison => ['Scripts', 'Libellés', 'Contrôles'].map(l => '⚠ ' + l + ' : non vérifiés — ' + raison);
  let mesure;
  try { mesure = require(path.join(__dirname, 'hydra-mesure.js')); }
  catch(e){ return nonVerifies('pilotage du navigateur introuvable (' + e.message + ')'); }
  const nav = mesure.trouverNavigateur();
  if(!nav) return nonVerifies('navigateur absent');
  try {
    return await mesure.session(nav, async ({ envoyer, sid, evenements }) => {
      await envoyer('DOM.enable', {}, sid);
      const n0 = await envoyer('Page.navigate', { url: 'file://' + outPath }, sid);
      if(n0.result && n0.result.errorText) return nonVerifies('chargement refusé (' + n0.result.errorText + ')');
      const t0 = Date.now();
      while(Date.now() - t0 < 15000 && !evenements.some(e => e.method === 'Page.loadEventFired'))
        await new Promise(res => setTimeout(res, 100));
      if(!evenements.some(e => e.method === 'Page.loadEventFired')) return nonVerifies('chargement non abouti');
      await new Promise(res => setTimeout(res, 300));
      const nb = await envoyer('Runtime.evaluate', { expression: 'document.querySelectorAll("iframe").length', returnByValue: true }, sid);
      const total = (nb.result && nb.result.result && nb.result.result.value) || 0;
      if(!total) return null;
      // Contexte d'exécution → cadre → son étape (data-p / data-s) → le fichier du proto.
      const cadreDe = new Map();
      evenements.filter(e => e.method === 'Runtime.executionContextCreated')
        .forEach(e => cadreDe.set(e.params.context.id, e.params.context.auxData && e.params.context.auxData.frameId));
      const parMotif = new Map(), fautifs = new Set();
      for(const e of evenements.filter(x => x.method === 'Runtime.exceptionThrown')){
        const d = e.params.exceptionDetails || {};
        const motif = String((d.exception && d.exception.description) || d.text || 'erreur').split('\n')[0];
        const frameId = cadreDe.get(d.executionContextId);
        fautifs.add(frameId || d.executionContextId);
        let ou = '?';
        try {
          const o = await envoyer('DOM.getFrameOwner', { frameId }, sid);
          const n = await envoyer('DOM.resolveNode', { backendNodeId: o.result.backendNodeId }, sid);
          const w = await envoyer('Runtime.callFunctionOn', { objectId: n.result.object.objectId, returnByValue: true,
            functionDeclaration: 'function(){ var p = this.closest(".step-pane"); return (p ? p.dataset.p + "/" + p.dataset.s : "?") + "|" + (/d-frame/.test(this.className) ? "desktop" : "mobile"); }' }, sid);
          const [cle, rendu] = w.result.result.value.split('|');
          ou = (cadres[cle] || '?') + '|' + rendu;
        } catch(x){}
        if(!parMotif.has(motif)) parMotif.set(motif, new Map());
        const [f, rendu] = ou.split('|');
        const m = parMotif.get(motif); if(!m.has(f)) m.set(f, new Set()); if(rendu) m.get(f).add(rendu);
      }
      const libelles = await comparerLibelles(envoyer, sid, cadres);
      // Les clics viennent en DERNIER : ils rechargent des cadres, et leurs exceptions ne
      // doivent pas entrer dans la ligne Scripts, relevée ci-dessus sur le seul chargement.
      const controles = await cliquerControles(envoyer, sid, cadres);
      if(!parMotif.size) return ['Scripts : ' + total + ' cadre' + (total > 1 ? 's' : '') + ' chargé' + (total > 1 ? 's' : '') + ' sans erreur', libelles, controles];
      const dits = [...parMotif].map(([motif, fs_]) => {
        const l = [...fs_].map(([f, r]) => f + (r.size ? ' (' + [...r].sort((a, b) => b.localeCompare(a)).join(', ') + ')' : ''));
        return motif + ' : ' + l.slice(0, 6).join(' · ') + (l.length > 6 ? ' · +' + (l.length - 6) : '');
      });
      return ['⚠ Scripts : ' + fautifs.size + ' / ' + total + ' cadres en erreur au chargement — ' + dits.join(' ; '), libelles, controles];
    });
  } catch(e){ return nonVerifies(e.message); }
}
// Libellés : chaque élément marqué data-hydra-lib (voir `lib` dans assemble) contre
// l'attribut que le navigateur lit sur le <html> de son cadre source — la valeur que le
// proto déclare, décodée par le navigateur, pas par l'outil. Un cadre srcdoc hérite de
// l'origine de la galerie : son document se lit directement. Cadre illisible ⇒ dit,
// jamais compté conforme. Aucun marqueur ⇒ dit aussi : ce n'est pas « tout conforme ».
const LIRE_LIBELLES = `[].map.call(document.querySelectorAll('[data-hydra-lib]'), function(el){
  var c = el.getAttribute('data-hydra-lib').split('/'), v = null, lu = true;
  try { v = document.querySelector('.step-pane[data-p="' + c[0] + '"][data-s="' + c[1] + '"] iframe.m-frame')
              .contentDocument.documentElement.getAttribute('data-hydra-' + c[2]); } catch(e){ lu = false; }
  return { cle: c[0] + '/' + c[1], a: c[2], affiche: el.textContent, proto: v, lu: lu };
})`;
async function comparerLibelles(envoyer, sid, cadres){
  let L = null;
  try { const r = await envoyer('Runtime.evaluate', { expression: LIRE_LIBELLES, returnByValue: true }, sid);
        L = r.result && r.result.result && r.result.result.value; } catch(e){}
  if(!Array.isArray(L)) return '⚠ Libellés : non vérifiés — lecture de la galerie en échec';
  if(!L.length) return 'Libellés : aucun libellé repris d\'un proto — rien à comparer';
  const nom = x => (cadres[x.cle] || '?') + (x.a === 'geste' ? ' (geste)' : '');
  const illisibles = L.filter(x => !x.lu);
  const ecarts = L.filter(x => x.lu && (x.proto === null || x.proto.trim() !== x.affiche.trim()));
  // Un même libellé s'affiche à plusieurs endroits (sommaire, en-tête, barre) : compté à
  // chaque endroit, dit une fois.
  const dits = [...new Set(ecarts.map(x => nom(x) + ' : affiché « ' + x.affiche.trim() + ' », proto « '
    + (x.proto === null ? '(attribut absent)' : x.proto.trim()) + ' »'))];
  const noms = [...new Set(illisibles.map(nom))];
  const parts = [];
  if(ecarts.length) parts.push(ecarts.length + ' / ' + L.length + ' affichés autrement que le proto — '
    + dits.slice(0, 6).join(' · ') + (dits.length > 6 ? ' · +' + (dits.length - 6) : ''));
  if(illisibles.length) parts.push(illisibles.length + ' / ' + L.length + ' non comparés, document du cadre illisible — '
    + noms.slice(0, 6).join(' · ') + (noms.length > 6 ? ' · +' + (noms.length - 6) : ''));
  return parts.length ? '⚠ Libellés : ' + parts.join(' ; ') : 'Libellés : ' + L.length + ' conformes au proto';
}

// —— Contrôles : chaque contrôle de chaque proto, cliqué dans le même chargement ————————
// « Un proto se manipule » : un bouton reproduit comme actionnable et que rien ne branche
// passe quand la vérification se fait à l'œil (des boutons de sortie et des choix en
// <button> nus). Chaque contrôle est cliqué ; ceux qui ne changent RIEN sont dits.
// - Contrôle : SEL ci-dessous — ce qui se clique pour agir. Un champ de saisie se tape, il
//   n'en est pas. Sortent : désactivé (disabled, aria-disabled), sans boîte ou invisible dans
//   le proto, sous [inert], et ce qui porte data-hydra-suite (passage d'étape : seule la barre
//   de la galerie navigue entre étapes).
// - Changer quelque chose : une mutation du DOM du cadre (nœuds, attributs, classes, texte),
//   l'état d'un champ (checked, value, selectedIndex), un défilement, une ancre atteinte, une
//   navigation ou un envoi tenté, un dialogue ouvert (alert, confirm, prompt, open, print).
// - Navigation neutralisée : un écouteur posé en DERNIER (fenêtre, phase de remontée)
//   l'annule s'il n'a été annulé par personne et la compte comme effet ; une navigation par
//   script remplace le document : c'est un effet, et le cadre est rechargé.
// - Ordre : les clics s'enchaînent dans l'état qu'ils laissent ; un contrôle SANS effet dans
//   un état modifié par les clics précédents est rejugé depuis l'état de chargement (cadre
//   rechargé), puis une seconde fois depuis un état rempli (voir « second passage »). Est
//   dit sans effet ce qui ne répond depuis aucun des deux, deux états que l'ordre des clics
//   ne change pas. Reste dépendant de l'ordre le seul contrôle qui ne répondrait que dans
//   un état intermédiaire précis : il sort « répond », jamais « sans effet » à tort.
//   Recharger avant CHAQUE clic serait plus strict, mais un
//   rechargement par clic est trop lent pour un hook qui tourne à chaque écriture de proto.
//   Un proto qui change SEUL (minuterie) n'est pas jugé : dit.
// - Un rendu par contrôle : les deux cadres portent le même document et le même script,
//   seul le CSS diffère — cliquer deux fois le même contrôle n'apprend rien. Un contrôle
//   visible dans un seul rendu y est cliqué ; visible dans les deux, il va à l'un ou à
//   l'autre en alternance, et les deux cadres se cliquent en même temps (moitié du temps).
// - Exception levée au clic : dite ici, séparément — la ligne Scripts dit le chargement.
// - Plafond : CLICS_MS pour tous les cadres, cliqués en parallèle ; ce qui reste au-delà se
//   dit, jamais compté sans effet. ATTENTE_MS : délai laissé à l'effet d'un clic ; un effet
//   plus lent passerait pour absent — l'erreur tombe du côté d'un contrôle dit de trop.
const CLICS_MS = 30000, ATTENTE_MS = 120;
const CLIQUER_CONTROLES = `(async function(plafond, attente){
  var fin = Date.now() + plafond, dormir = function(ms){ return new Promise(function(r){ setTimeout(r, ms); }); };
  var SEL = 'button, a[href], summary, input[type=checkbox], input[type=radio], input[type=button], input[type=submit], '
    + 'input[type=reset], input[type=image], [role=button], [role=tab], [role=switch], [role=checkbox], [role=radio], '
    + '[role=menuitem], [role=option], [role=link], [onclick]';
  // Un panneau caché n'a pas de mise en page : tous les cadres sont rendus avant de cliquer.
  document.querySelectorAll('.panel, .step-pane, .m-slot, .d-slot').forEach(function(e){ e.style.display = 'block'; });
  function suivre(f){
    var w = f.contentWindow, d = f.contentDocument, st = { effets: 0, erreurs: [] };
    ['alert', 'confirm', 'prompt', 'open', 'print'].forEach(function(n){ w[n] = function(){ st.effets++; return n === 'confirm' ? false : null; }; });
    w.addEventListener('click', function(e){
      var a = e.target && e.target.closest && e.target.closest('a[href]');
      if(!a || e.defaultPrevented) return;
      var h = a.getAttribute('href') || ''; e.preventDefault();
      if(/^#./.test(h)){ if(d.getElementById(decodeURIComponent(h.slice(1)))) st.effets++; }
      else if(h && h !== '#' && !/^javascript:/i.test(h)) st.effets++;
    });
    w.addEventListener('submit', function(e){ if(!e.defaultPrevented){ e.preventDefault(); st.effets++; } });
    w.addEventListener('error', function(e){ st.erreurs.push(String(e.message || 'erreur')); });
    var mo = new w.MutationObserver(function(l){ st.effets += l.length; });
    mo.observe(d.documentElement, { subtree: true, childList: true, attributes: true, characterData: true });
    return { f: f, w: w, d: d, st: st, mo: mo };
  }
  function etat(d){
    var s = [], w = d.defaultView;
    d.querySelectorAll('input, select, textarea').forEach(function(x){ s.push(x.checked + '|' + x.value + '|' + x.selectedIndex); });
    s.push(w.scrollX + ',' + w.scrollY);
    d.querySelectorAll('*').forEach(function(x, i){ if(x.scrollTop || x.scrollLeft) s.push(i + ':' + x.scrollTop + ',' + x.scrollLeft); });
    return s.join(';');
  }
  function jouable(el){
    if(el.disabled || el.getAttribute('aria-disabled') === 'true' || el.closest('[data-hydra-suite], [inert]')) return false;
    return el.getClientRects().length > 0 && el.ownerDocument.defaultView.getComputedStyle(el).visibility !== 'hidden';
  }
  function nom(el){
    var t = (el.getAttribute('aria-label') || el.textContent || el.value || el.getAttribute('title') || '').replace(/\\s+/g, ' ').trim();
    return t ? (t.length > 40 ? t.slice(0, 40) + '…' : t) : '<' + el.tagName.toLowerCase() + '>';
  }
  function recharger(f){
    return new Promise(function(r){ var fait = false, ok = function(){ if(!fait){ fait = true; r(); } };
      f.addEventListener('load', ok, { once: true }); f.setAttribute('srcdoc', f.getAttribute('srcdoc')); setTimeout(ok, 5000); });
  }
  async function cadre(pane){
    var r = { cle: pane.dataset.p + '/' + pane.dataset.s, n: 0, inertes: [], erreurs: [], seul: false, restants: 0 };
    var fm = pane.querySelector('iframe.m-frame'), fd = pane.querySelector('iframe.d-frame');
    if(!fm || !fm.contentDocument) return r;
    var X = { m: suivre(fm), d: fd && fd.contentDocument ? suivre(fd) : null };
    await dormir(attente);                                    // le proto change-t-il seul ?
    if(X.m.st.effets || (X.d && X.d.st.effets)){ r.seul = true; return r; }
    // Répartition fixée sur l'état de chargement : un contrôle visible dans les deux rendus
    // va à l'un ou à l'autre en alternance — les deux cadres se cliquent en même temps.
    var Lm = X.m.d.querySelectorAll(SEL), Ld = X.d ? X.d.d.querySelectorAll(SEL) : [], pour = { m: [], d: [] }, vus = [];
    for(var k = 0; k < Lm.length; k++){
      var vm = jouable(Lm[k]), vd = !!(Ld[k] && jouable(Ld[k]));
      if(vm && vd) pour[k % 2 ? 'd' : 'm'].push(k); else if(vm) pour.m.push(k); else if(vd) pour.d.push(k);
    }
    // Un clic ; rend { change, erreur, remplace }.
    async function cliquer(c, el){
      var avant = etat(c.d), doc = c.d; c.st.effets = 0; c.st.erreurs = [];
      ['pointerdown', 'mousedown', 'pointerup', 'mouseup'].forEach(function(t){
        el.dispatchEvent(new c.w.MouseEvent(t, { bubbles: true, cancelable: true, view: c.w })); });
      el.click();
      await dormir(attente);
      var remplace = c.f.contentDocument !== doc;
      return { remplace: remplace, change: remplace || c.st.effets > 0 || etat(c.d) !== avant, erreur: c.st.erreurs[0] };
    }
    async function boucle(q, ks){
      var sale = false;                                       // un clic a changé l'état depuis le dernier chargement
      var frais = async function(){ X[q].mo.disconnect(); await recharger(X[q].f);
        if(!X[q].f.contentDocument || !X[q].f.contentDocument.documentElement) throw new Error('cadre non rechargé');
        X[q] = suivre(X[q].f); sale = false; };
      for(var j = 0; j < ks.length; j++){
        if(Date.now() > fin){ r.restants += ks.length - j; break; }
        var el = X[q].d.querySelectorAll(SEL)[ks[j]];
        if(!el) continue;
        r.n++;
        var s = await cliquer(X[q], el);
        // Sans effet dans un état qu'ont modifié des clics précédents : rejugé depuis l'état
        // de chargement. Un « sans effet » n'est donc jamais un effet de l'ordre des clics.
        if(!s.change && !s.erreur && sale){ await frais(); el = X[q].d.querySelectorAll(SEL)[ks[j]]; if(el) s = await cliquer(X[q], el); }
        if(s.erreur) vus.push({ k: ks[j], e: nom(el) + ' (' + s.erreur + ')' });
        else if(!s.change) vus.push({ k: ks[j], i: nom(el) });
        else if(!s.remplace) repondent.push(ks[j]);
        if(s.remplace) await frais(); else if(s.change || s.erreur) sale = true;
      }
    }
    var repondent = [];
    await Promise.all([boucle('m', pour.m), X.d ? boucle('d', pour.d) : null]);
    // Second passage, depuis un état fixé : chargement, puis chaque contrôle qui a répondu
    // cliqué une fois, dans l'ordre du document. Un contrôle qui n'agit que sur un état
    // rempli (vider une liste encore vide) y répond et sort de la liste ; un contrôle que rien
    // ne branche n'y répond pas davantage. Les deux états sont définis sans l'ordre des
    // clics de la première passe : le verdict ne dépend pas de lui.
    var cand = vus.filter(function(v){ return v.i; });
    if(cand.length && Date.now() < fin){
      X.m.mo.disconnect(); await recharger(X.m.f);
      if(X.m.f.contentDocument && X.m.f.contentDocument.documentElement){
        X.m = suivre(X.m.f);
        repondent.sort(function(a, b){ return a - b; }).forEach(function(k){ var e = X.m.d.querySelectorAll(SEL)[k]; if(e) e.click(); });
        await dormir(attente);
        for(var j = 0; j < cand.length && Date.now() < fin; j++){
          var el = X.m.d.querySelectorAll(SEL)[cand[j].k];
          if(el && (await cliquer(X.m, el)).change) cand[j].repond = true;
          if(X.m.f.contentDocument !== X.m.d) break;          // il a navigué : l'état fixé est perdu
        }
      }
    }
    vus = vus.filter(function(v){ return !v.repond; });
    vus.sort(function(a, b){ return a.k - b.k; });            // l'ordre du document, pas celui des fins de clic
    vus.forEach(function(v){ if(v.e) r.erreurs.push(v.e); else r.inertes.push(v.i); });
    return r;
  }
  var panes = [].slice.call(document.querySelectorAll('.step-pane')).filter(function(p){ return p.querySelector('iframe.m-frame'); });
  return await Promise.all(panes.map(function(p){ return cadre(p).catch(function(e){ return { cle: p.dataset.p + '/' + p.dataset.s, echec: String(e && e.message || e) }; }); }));
})`;
async function cliquerControles(envoyer, sid, cadres){
  const t0 = Date.now();
  let R = null;
  try {
    const r = await Promise.race([
      envoyer('Runtime.evaluate', { expression: CLIQUER_CONTROLES + '(' + CLICS_MS + ', ' + ATTENTE_MS + ')', awaitPromise: true, returnByValue: true }, sid),
      new Promise(res => setTimeout(() => res(null), CLICS_MS + 20000).unref()) ]);   // unref : ne retient pas le processus
    R = r && r.result && r.result.result && r.result.result.value;
  } catch(e){}
  if(!Array.isArray(R)) return '⚠ Contrôles : non vérifiés — clics interrompus ou sans réponse du navigateur';
  // Tous les noms, sans plafond : c'est la liste à corriger. Un même nom deux fois dans un
  // proto (contrôle répété d'un rendu à l'autre) se compte, il ne se répète pas.
  const nom = x => cadres[x.cle] || '?';
  const compte = a => [...a.reduce((m, t) => m.set(t, (m.get(t) || 0) + 1), new Map())]
    .map(([t, n]) => '« ' + t + ' »' + (n > 1 ? ' ×' + n : ''));
  const parFichier = (L, k) => L.filter(x => x[k] && x[k].length).map(x => nom(x) + ' : ' + compte(x[k]).join(', '));
  const N = R.reduce((s, x) => s + (x.n || 0), 0), k = R.reduce((s, x) => s + ((x.inertes || []).length), 0);
  // Un contrôle sans effet qui revient à l'identique dans deux pistes ou plus est REPRODUIT
  // (bloc de page repris tel quel), pas composé : il noierait les contrôles composés de la piste.
  // Il est dit une fois, avec son nombre de pistes. La piste d'un cadre est son panneau (clé
  // « panneau/étape ») : les étapes d'un parcours restent UNE piste.
  const pistes = new Map();
  R.forEach(x => (x.inertes || []).forEach(t => (pistes.get(t) || pistes.set(t, new Set()).get(t)).add(String(x.cle).split('/')[0])));
  const repris = [...pistes].filter(([, s]) => s.size > 1);
  const propres = R.map(x => ({ ...x, inertes: (x.inertes || []).filter(t => !(pistes.get(t).size > 1)) }));
  const parts = [];
  if(k) parts.push(k + ' / ' + N + ' sans effet au clic — ' + parFichier(propres, 'inertes')
    .concat(repris.length ? ['reproduits à l\'identique dans plusieurs pistes : '
      + repris.map(([t, s]) => '« ' + t + ' » (' + s.size + ' pistes)').join(', ')] : []).join(' · '));
  const err = parFichier(R, 'erreurs'); if(err.length) parts.push('exception au clic — ' + err.join(' · '));
  const seuls = R.filter(x => x.seul).map(nom); if(seuls.length) parts.push('non jugés, le proto change seul — ' + seuls.join(', '));
  const echecs = R.filter(x => x.echec).map(x => nom(x) + ' (' + x.echec + ')'); if(echecs.length) parts.push('clics en échec — ' + echecs.join(', '));
  const restes = R.filter(x => x.restants); if(restes.length) parts.push('plafond atteint, '
    + restes.reduce((s, x) => s + x.restants, 0) + ' non cliqués — ' + restes.map(nom).join(', '));
  log('contrôles cliqués en ' + Math.round((Date.now() - t0) / 100) / 10 + ' s');
  if(parts.length) return '⚠ Contrôles : ' + parts.join(' ; ');
  return N ? 'Contrôles : ' + N + ' cliqués, tous changent quelque chose' : 'Contrôles : aucun contrôle cliquable dans les protos';
}

// —— Galerie en retard : protos écrits hors Write/Edit (Bash, script) ——————————————
// Même mécanisme que md-to-html pour les livrables : on regarde le DISQUE. Un proto de
// .src/ plus récent que la galerie, ou des protos sans galerie. UNE définition.
const mtime = f => { try { return fs.statSync(f).mtimeMs; } catch(e){ return 0; } };
function galerieEnRetard(explorationsDir){
  const src = path.join(explorationsDir, '.src');
  let fl = []; try { fl = fs.readdirSync(src).filter(f => /\.html?$/i.test(f)); } catch(e){ return false; }
  if(!fl.length) return false;
  return Math.max(...fl.map(f => mtime(path.join(src, f)))) > mtime(path.join(explorationsDir, OUT_NAME));
}

// Étape non recomposée : tout ce qui la distingue d'un proto se voit AVANT d'être lu —
// bouton en pointillé, cadre sans ombre sur fond hachuré (une image n'est pas un écran),
// étiquette collée en tête du cadre qui dit sa largeur réelle. Injecté seulement en mode
// parcours : hors de ce cas, la galerie n'en porte rien.
const OBS_CSS = `.geste{ font:500 13px/1.5 var(--sans); color:var(--ink-2); margin:0 0 12px; }
.geste > span:first-child{ font:700 11px/1 var(--sans); letter-spacing:.06em; text-transform:uppercase; color:var(--ink-3); margin-right:8px; }
.stepb--obs{ border-style:dashed; color:var(--ink-3); }
.stepb--obs.on{ background:var(--panel); color:var(--ink); border-color:var(--ink-3); }
.obs-band{ font:500 13px/1.5 var(--sans); color:var(--ink-2); max-width:70ch; margin:0 0 14px; padding:10px 14px; border-left:3px solid var(--ink-3); background:var(--panel); }
.obs-band strong{ color:var(--ink); }
.frame-wrap.obs{ border:1px dashed var(--ink-3); box-shadow:none; background:repeating-linear-gradient(135deg, var(--panel) 0 8px, #ebeae4 8px 16px); }
.obs-scroll{ height:100%; overflow:auto; }
.obs-scroll img{ display:block; margin:0 auto; height:auto; }
.obs-tag{ position:sticky; top:0; z-index:1; font:700 10.5px/1 var(--sans); letter-spacing:.06em; text-transform:uppercase; color:var(--ink-2); background:var(--panel); border-bottom:1px dashed var(--ink-3); padding:7px 10px; }
.obs-miss{ margin:0; padding:24px; font:600 13px/1.5 var(--sans); color:var(--accent); }
`;

// Intitulé « Latitude créative » : même traitement que « Pistes », décollé de la liste.
// Titre et numéros de la barre d'étapes : injectés seulement s'il y a une barre — une
// galerie d'écrans uniques n'en porte rien.
const STEPS_CSS = `.steps__t{ font:700 11px/1 var(--sans); letter-spacing:.06em; text-transform:uppercase; color:var(--ink-3); margin:0 0 8px; }
.steps{ align-items:center; }
.steps__sep{ color:var(--ink-3); font:500 14px/1 var(--sans); }
.stepb__n{ display:inline-block; min-width:1.4em; margin-right:6px; padding:2px 0; border-radius:2px; background:var(--rule-soft); color:var(--ink); text-align:center; font-variant-numeric:tabular-nums; }
.stepb.on .stepb__n{ background:var(--paper); color:var(--ink); }
`;
const LAT_CSS = `.rail__label--sub{ margin-top:26px; }
`;

// Cadre : masthead + .rail-l + .main REPRIS verbatim de hydra-render.html ; zone device
// (switch + note) + viewports d'appareil à scroll interne. --dscale ajusté au runtime.
const TEMPLATE = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Hydra — Explorations</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,900&family=Inter:wght@500;600;700&display=swap" rel="stylesheet">
<style>
/* valeurs REPRISES de .tools/hydra-render.html à l'identique (pas de fichier partagé) */
:root{ --ink:#111; --ink-2:#5b5b5b; --ink-3:#8f8f8f; --rule:#111; --rule-soft:#d9d8d3; --paper:#fff; --panel:#f6f5f1;
  --accent:#d5341a; --serif:"Fraunces",Georgia,serif; --sans:"Inter","Helvetica Neue",Arial,sans-serif;
  --rail-l:220px; --masthead-h:92px; --gap:48px; --dscale:1; }
*{ box-sizing:border-box; }
html,body{ margin:0; background:var(--paper); color:var(--ink); font-family:var(--sans); font-size:17px; line-height:1.62; }
.masthead{ position:fixed; top:0; left:0; right:0; z-index:50; height:var(--masthead-h); background:var(--paper); padding:20px 48px 0; }
.masthead__row{ display:flex; align-items:baseline; gap:24px; padding-bottom:12px; }
.masthead__mark{ font:900 26px/1 var(--serif); letter-spacing:-.02em; text-transform:uppercase; }
.masthead__mark .dot{ color:var(--accent); }
.masthead__type{ margin-left:auto; align-self:center; font-size:11px; font-weight:700; letter-spacing:.22em; text-transform:uppercase; color:var(--accent); white-space:nowrap; }
.masthead__rule{ height:3px; background:var(--ink); } .masthead__rule-thin{ height:1px; background:var(--accent); margin-top:2px; }
.rail{ position:fixed; top:var(--masthead-h); bottom:0; overflow:auto; z-index:40; background:var(--paper); font-size:12.5px; }
.rail-l{ left:0; width:var(--rail-l); border-right:1px solid var(--rule); padding:26px 22px 40px 48px; }
.rail__label{ font-size:10.5px; font-weight:700; letter-spacing:.18em; text-transform:uppercase; color:var(--ink-3); padding-bottom:8px; border-bottom:1px solid var(--rule); margin-bottom:14px; }
.rail__toc{ list-style:none; margin:0; padding:0; }
.piste{ display:flex; gap:10px; width:100%; text-align:left; background:none; border:0; cursor:pointer; color:var(--ink-2); padding:7px 0; border-bottom:1px solid var(--rule-soft); line-height:1.3; font:inherit; }
.piste:hover{ color:var(--accent); }
.piste .num{ color:var(--accent); font-weight:600; font-variant-numeric:tabular-nums; min-width:22px; }
.piste.on{ color:var(--ink); font-weight:600; }
.piste em{ font-style:italic; color:var(--accent); }
.cov{ font-size:11px; line-height:1.4; padding:2px 0 10px; margin-bottom:12px; border-bottom:1px solid var(--rule-soft); }
.cov--ok{ color:var(--ink-3); } .cov--warn{ color:var(--accent); font-weight:600; }
.piste--ghost{ opacity:.72; } .piste--ghost .num{ color:var(--ink-3); }
.piste--ghost em{ font-style:normal; font-weight:600; color:var(--accent); }
.panel--ghost .pnote .h{ color:var(--accent); }
.main{ margin-left:var(--rail-l); margin-right:var(--gap); padding:calc(var(--masthead-h) + 28px) var(--gap) 120px var(--gap); }
.devbar{ display:flex; gap:6px; margin:0 0 20px; }
.devbar button{ font:600 10px/1 var(--sans); letter-spacing:.08em; text-transform:uppercase; color:var(--ink-3); background:var(--paper); border:1px solid var(--rule-soft); padding:8px 12px; cursor:pointer; }
.devbar button.on{ color:var(--paper); background:var(--ink); border-color:var(--ink); }
.panel{ display:none; } .panel.on{ display:block; }
.pnote{ font:500 14px/1.5 var(--sans); color:var(--ink-2); margin:0 0 18px; max-width:70ch; }
.pnote .h{ display:block; font-family:var(--serif); font-weight:600; font-size:1.5rem; line-height:1.1; color:var(--ink); letter-spacing:-.01em; margin-bottom:6px; }
.pnote .muted{ color:var(--ink-3); }
.frame-wrap{ border:1px solid var(--rule); box-shadow:0 5px 10px #00000021; background:var(--paper); overflow:hidden; }
.m-slot{ width:390px; height:844px; }
.m-frame{ width:390px; height:844px; border:0; display:block; }
.d-slot{ width:calc(1280px * var(--dscale)); height:calc(720px * var(--dscale)); }
.d-frame{ width:1280px; height:720px; border:0; display:block; transform:scale(var(--dscale)); transform-origin:top left; }
.hide{ display:none; }
<!--EXTRA-CSS-->/* barre d'étapes d'un parcours : les étapes sont des FICHIERS distincts, chacun capturé ;
   la galerie les remet bout à bout ici (maquette § Socle / variable) */
.steps{ display:flex; gap:8px; flex-wrap:wrap; margin:0 0 18px; }
.stepb{ font:700 11.5px/1 var(--sans); letter-spacing:.06em; text-transform:uppercase;
  padding:9px 14px; border:1px solid var(--rule); background:var(--paper); color:var(--ink-2); cursor:pointer; }
.stepb:hover{ color:var(--ink); }
.stepb.on{ background:var(--ink); color:var(--paper); border-color:var(--ink); }
@media (max-width:900px){
  .masthead{ position:static; height:auto; padding:22px 22px 0; }
  .masthead__row{ flex-direction:column; align-items:flex-start; }
  .masthead__type{ margin-left:0; }
  .rail{ position:static; width:auto; bottom:auto; overflow:visible; }
  .rail-l{ border-right:0; border-bottom:1px solid var(--rule); padding:20px 22px; }
  .main{ margin:0; padding:24px 22px 80px; }
}
</style>
</head>
<body>
<header class="masthead"><div class="masthead__row"><div class="masthead__mark">Hydra<span class="dot">.</span></div><div class="masthead__type">Explorations</div></div><div class="masthead__rule"></div><div class="masthead__rule-thin"></div></header>
<aside class="rail rail-l"><div class="rail__label">Pistes</div><!--COVERAGE--><!--SHOTS--><!--BRIEF--><!--SOCLE--><!--ASSETS--><ol class="rail__toc"><!--PISTES--></ol><!--LATITUDE--></aside>
<main class="main">
<div class="devbar"><!--DEVBAR--></div>
<!--PANELS-->
</main>
<script>
var dev = 'm';
function fitDesktop(){                                   // --dscale = min(1, largeur du main / 1280)
  var b = document.querySelector('.devbar'); if(!b) return;
  document.documentElement.style.setProperty('--dscale', Math.min(1, b.clientWidth / 1280));
}
function showDev(){
  document.querySelectorAll('.m-slot').forEach(function(e){ e.classList.toggle('hide', dev!=='m'); });
  document.querySelectorAll('.d-slot').forEach(function(e){ e.classList.toggle('hide', dev!=='d'); });
  document.querySelectorAll('.devbar button').forEach(function(x){ x.classList.toggle('on', x.dataset.dev===dev); });
}
function showTab(i){
  document.querySelectorAll('.panel').forEach(function(p){ p.classList.toggle('on', p.dataset.i===String(i)); });
  document.querySelectorAll('.piste').forEach(function(t){ t.classList.toggle('on', t.dataset.i===String(i)); });
}
function showStep(p, s){                                  // calque de showDev(), par panneau
  document.querySelectorAll('.step-pane[data-p="'+p+'"]').forEach(function(e){ e.classList.toggle('hide', e.dataset.s!==String(s)); });
  document.querySelectorAll('.stepb[data-p="'+p+'"]').forEach(function(b){ b.classList.toggle('on', b.dataset.s===String(s)); });
  showDev();
}
document.querySelectorAll('.stepb').forEach(function(b){ b.onclick = function(){ showStep(b.dataset.p, b.dataset.s); }; });
document.querySelectorAll('.piste').forEach(function(t){ t.onclick = function(){ showTab(t.dataset.i); }; });
document.querySelectorAll('.devbar button').forEach(function(b){ b.onclick = function(){ dev=b.dataset.dev; showDev(); }; });
window.addEventListener('resize', fitDesktop);
var q = new URLSearchParams(location.search);
var premier = document.querySelector('.devbar button');   // le premier rendu que la fiche demande
dev = q.get('dev') || (premier ? premier.dataset.dev : 'm');
showTab(q.get('active') || '0'); showDev(); fitDesktop();
</script>
</body>
</html>
`;

// ---- entrée : CLI (argv) ou hook (stdin JSON PostToolUse) ----
async function construire(dir){
  let r = null;
  try { r = assemble(dir); if(r) r = await verifierScripts(r); } catch(e){ log('échec : ' + e.message); }
  return r;
}
const dire = (r, entete) => entete + ' (' + path.relative(process.cwd(), r.outPath) + ') :\n- ' + r.message.join('\n- ');
module.exports = { assemble, chargerCadres, galerieEnRetard };
const arg = require.main === module ? process.argv[2] : null;
if(require.main !== module){ /* importé (fixtures) : aucune entrée */ }
else if(arg){
  const dir = resolveExplorationsDir(arg);
  if(dir) construire(dir).then(r => { if(r) r.etat.forEach(l => log('état : ' + l)); });
  else log('pas un chemin explorations/ : ' + arg);
} else {
  let raw=''; process.stdin.setEncoding('utf8');
  process.stdin.on('data', d => raw += d);
  process.stdin.on('end', async () => {
    let pl = {}; try { pl = JSON.parse(raw) || {}; } catch(e){ process.exit(0); }
    // AVERTISSANT, non bloquant : l'état de la galerie entre dans le contexte de l'agent,
    // seul lecteur des contrôles. Une panne d'outil qu'il y lit se dit au message de fin
    // de tour, pas dans les écarts du brief (maquette § Rendu & QA).
    const envoyer = txt => { try { if(txt) process.stdout.write(JSON.stringify({
      hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: txt } })); } catch(e){} };
    // Bash : aucun chemin dans l'appel — on regarde le DISQUE, comme md-to-html pour les
    // livrables. Des protos écrits par script sont assemblés ici, et leur état arrive dans
    // le même tour. Les captures restent au garde de fin de tour, qui les refait.
    if(pl.tool_name === 'Bash'){
      const dits = []; let nonEtabli = null;
      try {
        // Le sujet courant seulement (md-to-html § balayage Bash, même fait, même règle).
        const { sujetsBalayes, touch } = require(path.join(__dirname, 'md-to-html.js'));
        // Racine = le projet d'abord, jamais le cwd d'un appel qui a fait `cd` (md-to-html, même règle).
        const b = sujetsBalayes(pl, process.env.CLAUDE_PROJECT_DIR || pl.cwd || process.cwd(),
          s => galerieEnRetard(path.join(s, 'explorations')), 'des galeries');
        nonEtabli = b.dit;
        for(const sub of b.subs){
          const dir = path.join(sub, 'explorations');
          if(!galerieEnRetard(dir)) continue;
          const r = await construire(dir);
          if(!r) continue;
          touch(r.outPath);             // inchangée, elle repasserait « en retard » à chaque appel
          if(r.nouveau && r.message.length) dits.push(dire(r, 'État de la galerie'));
        }
      } catch(e){ log('balayage ignoré : ' + e.message); }
      envoyer([nonEtabli, dits.length ? 'Protos écrits hors Write/Edit, galerie assemblée au passage.\n'
        + dits.join('\n') : null].filter(Boolean).join('\n'));
      process.exit(0);
    }
    const fp = (pl.tool_input || {}).file_path || '';
    if(!fp || !isProtoSrc(fp)) process.exit(0);
    const dir = resolveExplorationsDir(fp);
    const r = dir ? await construire(dir) : null;
    if(r && r.nouveau && r.message.length) envoyer(dire(r, 'État de la galerie'));
    process.exit(0);   // jamais bloquant
  });
}
