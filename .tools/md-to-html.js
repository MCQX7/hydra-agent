#!/usr/bin/env node
'use strict';
/* Rend un livrable markdown Hydra en HTML PRÉ-RENDU (statique, visible sans JS
   → Quick Look). Le markdown est parsé ICI (marked vendoré), pas au chargement :
   le .html contient déjà titres/tableaux/listes/images base64, le sommaire et
   le type. Seul « Copier le markdown » dépend du JS ; il lit #mdSource.

   Usage : node .tools/md-to-html.js chemin/livrable.md
   Hook  : sans argument, lit le JSON PostToolUse sur stdin ; ne traite que les
           .md sous topics/** (portée stricte).

   Anti-boucle : le hook se déclenche sur les APPELS D'OUTIL de l'agent, pas sur
   les changements de fichiers. Ce script écrit via `fs` → sa sortie .html est
   invisible du système de hooks. Il ne réagit qu'aux .md, ne réécrit jamais le
   .md, et saute l'écriture si le .html est inchangé (idempotent). */
const fs = require('fs');
const path = require('path');

// marked vendoré (MIT) — v15 expose .parse directement ; fallback défensif.
const _marked = require(path.join(__dirname, 'vendor', 'marked.min.js'));
const marked = (_marked && _marked.marked) ? _marked.marked : _marked;
if (marked && typeof marked.setOptions === 'function') marked.setOptions({ gfm: true, breaks: false });
function renderMd(s){
  if (typeof _marked.parse === 'function') return _marked.parse(s);
  if (marked && typeof marked.parse === 'function') return marked.parse(s);
  return marked(s);
}

// Après conversion, la source .md est DÉPLACÉE dans <sujet>/.src/
// (copie de secours autonome) au lieu d'être supprimée. Le .html garde la
// source markdown embarquée pour le bouton copier.
const MOVE_TO_SRC = true;

const MIME = { '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg',
  '.gif':'image/gif', '.svg':'image/svg+xml', '.webp':'image/webp', '.avif':'image/avif' };

function log(m){ process.stderr.write('[md-to-html] ' + m + '\n'); }
function esc(s){ return String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
// ATTENTION — stripTags opère sur la sortie de marked : ce qu'il rend est du texte
// DÉJÀ ÉCHAPPÉ (& ' " < > y sont des entités). Le repasser à esc() double l'encodage
// et affiche « d&#39;un trait » au lieu de « d'un trait ». esc() est pour du texte BRUT
// (chemin, valeur littérale) ; jamais pour un fragment extrait du HTML rendu.
function stripTags(s){ return String(s).replace(/<[^>]+>/g,'').trim(); }
function escScript(s){ return String(s).replace(/<\/(script)/gi, '<\\/$1'); }

function toDataURI(abs){
  const ext = path.extname(abs).toLowerCase();
  const mime = MIME[ext] || 'application/octet-stream';
  return `data:${mime};base64,` + fs.readFileSync(abs).toString('base64');
}

function embedImages(html, mdDir){
  html = html.replace(/<img\b[^>]*>/gi, tag => {
    const sm = tag.match(/\ssrc\s*=\s*["']([^"']+)["']/i);
    if(!sm) return tag;
    const src = sm[1];
    if(/^(https?:|data:)/i.test(src)) return tag;
    const abs = path.resolve(mdDir, src);
    if(!fs.existsSync(abs)){
      log('image absente (placeholder) : ' + src);
      return `<span class="img-missing"><strong>IMAGE NON RÉSOLUE</strong> ${esc(src)}</span>`;
    }
    const uri = toDataURI(abs);
    return tag.replace(sm[0], () => ' src="' + uri + '"');
  });
  // figure + légende (alt) pour une image seule dans un paragraphe
  html = html.replace(/<p>(\s*<img\b[^>]*>\s*)<\/p>/gi, (m, img) => {
    const am = img.match(/\salt\s*=\s*["']([^"']*)["']/i);
    // alt vient du HTML rendu → déjà échappé (cf. stripTags) : pas de second esc()
    const cap = am && am[1].trim() ? `<figcaption>${am[1].trim()}</figcaption>` : '';
    return `<figure>${img.trim()}${cap}</figure>`;
  });
  return html;
}

function detectType(html, mdPath){
  const m = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const t = (m ? stripTags(m[1]) : path.basename(mdPath)).toLowerCase();
  if(/rapport|action/.test(t)) return "Rapport d'action";
  if(/research|recherche/.test(t)) return "Recherche";
  if(/brief|exploration/.test(t)) return "Brief d'exploration";
  if(/fiche|sujet|cadrage/.test(t)) return "Fiche de sujet";
  return "Livrable";
}

function buildTOC(html){
  const toc = []; let n = 0;
  const out = html.replace(/<h2>([\s\S]*?)<\/h2>/gi, (m, inner) => {
    n++; const id = 'sec-' + n;
    toc.push({ id, num:String(n).padStart(2,'0'), label:stripTags(inner) });
    return `<h2 id="${id}">${inner}</h2>`;
  });
  const items = toc.length
    ? toc.map(t => `<li><a href="#${t.id}"><span class="num">${t.num}</span><span>${t.label}</span></a></li>`).join('\n')
    : '<li class="rail__empty">—</li>';
  return { html: out, tocHtml: items };
}

// —— Lint de structure (famille B) — AVERTISSANT, non bloquant. ————————————
// ⚠ COUPLAGE AUX CHAÎNES LITTÉRALES : ces contrôles cherchent des libellés
//   DÉFINIS DANS LES SKILLS. Renommer une section de livrable dans un skill
//   REND LE CONTRÔLE CORRESPONDANT AVEUGLE (échec silencieux). Garder synchro.
// Déclenchement STRICT : un contrôle ne tourne que si son déclencheur est
//   présent. Portée = le RAPPORT d'audit, plus une ligne de la FICHE (sa
//   présence seule) ; brief et prototypes ont une autre structure et ne
//   déclenchent rien (limite déclarée, pas cachée).
function lintStructure(md, mdPath){
  const gaps = [];
  // Déclencheur : section « Hypothèses de design » ← hydra-audit, Format de sortie (Bloc 1)
  if (/^#{2,6}\s+Hypothèses de design/m.test(md)) {
    // « Origine » ← hydra-audit, Format de sortie ; hydra-ideation, étape 4
    if (!/Origine/.test(md)) gaps.push("section Hypothèses sans ligne « Origine » (input vs apport de l'analyse)");
    // étiquettes ← hydra-audit, Phase 2 ; hydra-ideation, étape 4
    if (!/\[(input|dérivé|analyse)\]/.test(md)) gaps.push("hypothèses sans étiquette [input]/[dérivé]/[analyse]");
  }
  // Déclencheur : section « Benchmark » ← hydra-audit, Phase 3. Une SECTION,
  //   pas une simple citation B* : sinon brief/ideation (qui citent le benchmark
  //   sans le produire) sur-déclencheraient.
  // NB : pas de \b autour de « Écartés » — en JS \b se calcule sur \w, qui exclut
  //   les accents → frontière non fiable. Test de présence simple.
  if (/^#{2,6}\s+.*[Bb]enchmark/m.test(md) && !/Écartés/.test(md))
    gaps.push("benchmark sans annexe « Écartés » (réfs consultées non retenues)");
  // Correspondance ← hydra-cortex, clôture : une piste qui porte une objection hors
  //   autorité est NOMMÉE par une entrée de « Questions de cadrage non résolues ». Les
  //   marqueurs sont les types d'objection que cortex énumère dans cette même case de
  //   clôture, repris à l'identique par ideation (plus « arbitrage produit », sa forme
  //   courante). Pas de \b : il ne ferme pas un mot accentué.
  const OBJ = /capacité non établie|décision produit|arbitrage produit|non-négociable du contexte à trancher/i;
  const pistes = [], L = md.split('\n'); let cur = null, inQ = false, q = '', secPistes = false;
  for(const l of L){
    const h = /^(#{2,6})\s+(.*)$/.exec(l);
    if(h){
      cur = /^###$/.test(h[1]) && /^P\d+\b/.test(h[2]) ? { id: h[2].match(/^P\d+/)[0], obj: false } : (h[1].length <= 3 ? null : cur);
      if(cur && !pistes.includes(cur)) pistes.push(cur);
      if(h[1].length <= 2) inQ = /^Questions de cadrage non résolues/.test(h[2]);
      if(h[1].length === 2 && /^Pistes\b/i.test(h[2])) secPistes = true;
      continue;
    }
    if(cur && OBJ.test(l)) cur.obj = true;
    if(inQ) q += l + '\n';
  }
  // Le RAPPORT seulement, reconnu à son NOM de livrable (CLAUDE.md § Sorties), pas à un
  // titre qu'une réécriture peut changer : le brief reprend les pistes et renvoie au
  // rapport pour les décisions, il ne porte pas la section.
  const rapport = /(^|\/)02-rapport\.md$/i.test(String(mdPath || '').replace(/\\/g, '/'));
  const orphelines = !rapport ? [] : pistes.filter(p => p.obj && !new RegExp('(^|[^\\w])' + p.id + '(?!\\d)').test(q)).map(p => p.id);
  if (orphelines.length) gaps.push('piste(s) portant une objection hors autorité, nommée(s) par aucune entrée de « Questions de cadrage non résolues » : '
    + orphelines.join(', ') + ' — la décision attendue n\'a pas de trace');
  // Une section Pistes sans aucun titre « ### P… » (hydra-ideation § Récap, gabarit) : la
  // correspondance n'a rien lu, et elle le dit plutôt que de passer pour propre.
  if (rapport && secPistes && !pistes.length) gaps.push('section Pistes sans piste en titre « ### P… » (gabarit de l\'idéation) — correspondance piste ↔ question de cadrage non vérifiée');
  // Ligne d'en-tête « Benchmark : » ← hydra-audit, Rapport d'action : exigée dans
  //   TOUT rapport, reconnu à son NOM (02-rapport), jamais à un titre. La valeur
  //   « research en appui » se constate sur son produit — des R* déclarés, en puce
  //   ou en table ; sans eux, il n'y a pas eu d'appui (hydra-research § Deux modes).
  if (rapport) {
    const bl = md.match(/^\*\*Benchmark\s*:\*\*(.*)$/m);
    const hasR = /^\s*-\s+\*\*R\d+\*\*/m.test(md) || /^\|\s*(?:\*\*)?R\d+(?:\*\*)?\s*\|/m.test(md);
    if (!bl) gaps.push("rapport sans ligne d'en-tête « Benchmark : » (research en appui / produit sans research / aucun)");
    else if (/research en appui/i.test(bl[1])) {
      if (!hasR) gaps.push("« Benchmark : research en appui » sans référence R* rendue — sans table, il n'y a pas eu d'appui");
    }
    else if (/produit sans research/i.test(bl[1])) {}
    else if (/aucun/i.test(bl[1])) {
      if (/^#{2,6}\s+.*[Bb]enchmark/m.test(md)) gaps.push("« Benchmark : aucun » alors que le rapport porte une section benchmark");
    }
    else gaps.push("valeur de « Benchmark : » non reconnue (research en appui / produit sans research / aucun)");
  }
  // Ligne « Non-négociables : » ← hydra-cortex, gabarit de la fiche : sa PRÉSENCE seule,
  //   dans la fiche reconnue à son NOM (01-fiche), jamais un titre. Le contenu ne se lit
  //   pas ici : il se vérifie sur pièce (source nommée, ou fichiers lus contre le transcript).
  const fiche = /(^|\/)01-fiche\.md$/i.test(String(mdPath || '').replace(/\\/g, '/'));
  if (fiche && !/^\*\*Non-négociables :\*\*/m.test(md))
    gaps.push("fiche sans ligne « Non-négociables : » — les non-négociables du contexte n'ont pas été relevés");
  return gaps;
}

// —— Lint d'acronymes (famille B, V1) — AVERTISSANT, non bloquant. —————————
// Exclusions LUES DEPUIS LES FICHIERS, jamais recopiées dans le script :
//   mission.md (tout le fichier = source du vocabulaire) + kpi.md (titres de
//   section SEULEMENT = noms canoniques) + la méthode elle-même (CLAUDE.md et les
//   têtes hydra-*) : le jargon général du métier qu'elle emploie (KPI, UX…) n'est pas
//   du vocabulaire de mission, et le signaler poussait l'agent à retoucher un gabarit
//   pour faire taire l'alerte. kpi.md ou une tête illisible ne tait pas le reste. ⚠ On NE lit PAS le corps de kpi.md :
//   il contient à dessein des contre-exemples de nommage et des tables
//   d'acronymes métier qu'il ne faut SURTOUT pas exclure, sinon V1 s'aveugle
//   sur ses propres cibles.
// PAS d'allowlist de tokens génériques : on ASSUME CTA/AB/ET en faux positifs
//   plutôt qu'une liste qui se dégrade en silence.
//   Asymétrie des coûts : un FP = une seconde de lecture ; un FN coûte un
//   livrable (un sigle métier répété partout sans jamais être défini). Seuil ≥3 pour tuer la traîne d'emphase (VALEUR, ET…).
function loadVocab(projectRoot){
  const set = new Set();
  const add = s => (s.match(/\b[A-Z]{2,}\b/g) || []).forEach(t => set.add(t));
  const lire = f => { try { return fs.readFileSync(f, 'utf8'); } catch(e){ return null; } };
  add(fs.readFileSync(path.join(projectRoot, 'context', 'mission.md'), 'utf8'));  // absent ⇒ lint muet, voir lintAcronyms
  const kpi = lire(path.join(projectRoot, 'context', 'kpi.md'));
  if(kpi) kpi.split('\n').filter(l => /^#{2,6}\s/.test(l)).forEach(add); // titres seulement
  const methode = [path.join(projectRoot, 'CLAUDE.md')];
  try { for(const d of fs.readdirSync(path.join(projectRoot, '.claude', 'skills')))
    if(d.startsWith('hydra-')) methode.push(path.join(projectRoot, '.claude', 'skills', d, 'SKILL.md')); } catch(e){}
  methode.map(lire).filter(Boolean).forEach(add);
  return set;
}
// Deux lints de LISIBILITÉ (CLAUDE.md § Règles transverses, Lisibilité des livrables). Ils ne jugent pas le fond : ils
// comptent ce qui, mesuré sur un run réel, rendait les livrables pénibles à suivre — un
// identifiant qui occupe la place du contenu, et un gras si fréquent qu'il ne marque
// plus rien.

// Un identifiant est une NOTE (entre parenthèses, après un énoncé qui se tient seul),
// jamais un SUBSTITUT (dans la grammaire de la phrase). Ne juger QUE des identifiants
// DÉCLARÉS dans le document : tout design system nomme ses styles par une lettre suivie
// d'un nombre, et un nom de style cité dans un brief passerait sinon pour une hypothèse
// ou un constat. Corollaire assumé : un document sans déclarations
// (fiche, brief) n'est pas contrôlé — la règle vaut quand même, l'outil ne peut pas
// trancher sans savoir quels identifiants sont des identifiants.
function declOf(md){
  const decl = new Set();
  for(const l of md.split('\n')){ let m;
    if(m = l.match(/^\|\s*(C\d+)\s*\|/))              decl.add(m[1]);
    if(m = l.match(/^\s*-\s+\*\*([OSBR][\w-]*)\*\*/)) decl.add(m[1]);
    // R* : research rend une TABLE que l'appelante intègre sans la recomposer — la
    // première cellule d'une ligne déclare autant qu'une puce.
    if(m = l.match(/^\|\s*(?:\*\*)?(R\d+)(?:\*\*)?\s*\|/)) decl.add(m[1]);
    if(m = l.match(/^###\s+(P\d+)/))                  decl.add(m[1]);
    if(m = l.match(/^\s*\d+\.\s+\*\*(H\d+)/))         decl.add(m[1]);
  }
  return decl;
}
// Dimensions de users.md (titres « ### D1 — … ») : une notation que le livrable ne définit
// pas, donc à écrire en clair (CLAUDE.md § Règles transverses, Lisibilité des livrables). Lues, jamais recopiées ici.
function loadDimensions(projectRoot){
  const dims = new Map();
  try {
    for(const l of fs.readFileSync(path.join(projectRoot, 'context', 'users.md'), 'utf8').split('\n')){
      const m = /^#{2,4}\s+(D\d+)\s+[—–-]\s+(.+?)\s*$/.exec(l);
      if(m) dims.set(m[1], m[2].replace(/\s*\(.*\)\s*$/, ''));
    }
  } catch(e){}
  return dims;
}
function lintRefUse(md, mdPath, projectRoot){
  const L = md.split('\n');
  const decl = declOf(md);
  // Fiche et brief citent les identifiants du RAPPORT sans les déclarer : sans cet
  // héritage, le contrôle ne s'y exerçait jamais (ensemble vide ⇒ silence).
  if(mdPath && !/(^|\/)02-rapport\.md$/i.test(String(mdPath).replace(/\\/g, '/'))){
    try { for(const id of declOf(fs.readFileSync(path.join(path.dirname(mdPath), '02-rapport.md'), 'utf8'))) decl.add(id); }
    catch(e){}
  }
  const out = [];
  // Champs d'étiquette : les identifiants qu'ils portent ne sont pas des substituts…
  const LABEL = /^\s*\*\*(Fondé sur|Signal porteur|Sources?|Ancrage|Repères)\b/;
  // … mais un champ ne se RÉDUIT pas à eux. Tout champ en gras (« **Ancrage :** », « **Pari** : »)
  // dit d'abord ce qu'il porte ; seul « Fondé sur » est un index (lintCoherence le lit, sous
  // une reco rédigée) et reste une liste. Vide = rien, une fois retirés les identifiants,
  // « (référence Rn) » et la ponctuation.
  const INDEX = /^Fondé sur$/i;
  const CHAMP = /^\s*(?:[-*]\s+)?\*\*([^*]{1,40}?)\s*(?::\s*\*\*|\*\*\s*:)(.*)$/;
  const vide = t => !/[a-zà-ÿ]{2,}/i.test(t.replace(/\b[OSBRCHPVD]\d+\b/g, '').replace(/références?/gi, '')
    .replace(/(^|[^a-zà-ÿ])(et|ou)(?![a-zà-ÿ])/gi, '$1'));
  const reduits = [];
  for(let i = 0; i < L.length; i++){
    const m = CHAMP.exec(L[i]);
    if(!m || INDEX.test(m[1].trim()) || /^[OSBRCHPV]\d+$/.test(m[1].trim())) continue;
    let txt = m[2], j = i + 1;
    while(j < L.length && /^\s+\S/.test(L[j]) && !CHAMP.test(L[j])) txt += ' ' + L[j++];
    if(/\b[OSBRCHP]\d+\b/.test(txt) && vide(txt)) reduits.push('l.' + (i + 1) + ' « ' + m[1].trim() + ' »');
  }
  if(reduits.length) out.push(reduits.length + ' champ(s) réduit(s) à des identifiants : ' + reduits.slice(0, 5).join(' · ')
    + (reduits.length > 5 ? ' … (+' + (reduits.length - 5) + ')' : '')
    + ' — dire ce que la référence montre, l\'identifiant suit entre parenthèses');
  // Dimensions de users.md écrites en code, sauf là où la ligne les définit (titre cité).
  const dims = projectRoot ? loadDimensions(projectRoot) : new Map();
  if(dims.size){
    const dh = [];
    L.forEach((l, i) => { for(const m of l.matchAll(/(?<![\w.#-])(D\d+)(?![\w])/g))
      if(dims.has(m[1]) && !l.includes(dims.get(m[1]))) dh.push('l.' + (i + 1) + ' ' + m[1]); });
    if(dh.length) out.push(dh.length + ' dimension(s) de users.md écrite(s) en code : ' + dh.slice(0, 5).join(' · ')
      + (dh.length > 5 ? ' … (+' + (dh.length - 5) + ')' : '') + ' — l\'écrire en clair ('
      + [...new Set(dh.map(h => h.split(' ')[1]))].slice(0, 3).map(d => d + ' = « ' + dims.get(d) + ' »').join(' ; ') + ')');
  }
  // Colonne « Élément » d'un tableau : « idem » renvoie à une autre ligne — le dev qui lit
  // une ligne seule ne sait pas où chercher.
  let col = -1; const idem = [];
  L.forEach((l, i) => {
    if(!/^\s*\|/.test(l)){ col = -1; return; }
    const c = l.split('|').slice(1, -1).map(s => s.trim());
    const h = c.findIndex(s => /^élément$/i.test(s));
    if(h >= 0){ col = h; return; }
    if(col >= 0 && /^(idem|id\.|〃|")/i.test(c[col] || '')) idem.push('l.' + (i + 1));
  });
  if(idem.length) out.push(idem.length + ' cellule(s) « idem » en colonne Élément : ' + idem.slice(0, 5).join(' · ')
    + (idem.length > 5 ? ' … (+' + (idem.length - 5) + ')' : '') + ' — écrire l\'élément en entier');
  if(!decl.size) return out;
  const hits = [];
  // Un champ d'étiquette qui se replie reste un champ : l'exemption suit ses lignes de
  // continuation, reconnues à leur INDENTATION. Un paragraphe dont la suite revient en
  // marge zéro n'est plus le champ — c'est de la prose, et elle se contrôle.
  let inLabel = false;
  L.forEach((l, i) => {
    // `\s+` et non `\s*` : sans l'espace obligatoire, la puce `[-*]` mange la première
    // astérisque de `**Fondé sur :**` et le champ n'est jamais reconnu.
    if(LABEL.test(l.replace(/^\s*[-*]\s+/, ''))) inLabel = true;
    else if(!/^\s+\S/.test(l)) inLabel = false;
    if(/^\s*\|/.test(l) || /^#{1,6}\s/.test(l) || /^\*Repères/.test(l)
      || /^\s*-\s+\*\*[OSBR][\w-]*\*\*/.test(l) || /^\s*\d+\.\s+\*\*H\d/.test(l)
      || inLabel) return;
    let d = 0; const inPar = [];
    for(let k = 0; k < l.length; k++){ if(l[k] === '(') d++; inPar[k] = d > 0; if(l[k] === ')') d = Math.max(0, d - 1); }
    for(const m of l.matchAll(/\b([OSBRCHP]\d+)\b/g))
      if(!inPar[m.index] && decl.has(m[1])) hits.push('l.' + (i + 1) + ' ' + m[1]);
  });
  if(!hits.length) return out;
  return out.concat([hits.length + ' identifiant(s) en SUBSTITUT du contenu (hors parenthèse, hors '
    + 'champ d\'étiquette) — le lecteur doit remonter : ' + hits.slice(0, 5).join(' · ')
    + (hits.length > 5 ? ' … (+' + (hits.length - 5) + ')' : '')
    + ' — énoncer le mécanisme, puis poser l\'identifiant entre parenthèses']);
}

// Le gras d'ÉTIQUETTE (« **Pari** : », en tête de puce) est une clé de liste : légitime,
// compté à part. Celui des titres et des tableaux ne compte pas. Reste le gras DANS la
// prose : c'est lui qui fatigue. Mesuré sur un run réel, la séparation renverse le
// classement — le document le plus structuré porte le plus d'étiquettes et serait puni
// à tort sans elle. CIBLE : un gras par paragraphe rendu (80-120 mots), au-delà il ne
// marque plus rien. PLAFOND QUI SONNE : 1/40, choisi pour DISCRIMINER (1/80 sonnait
// sur tous les livrables du run mesuré, et une alarme permanente cesse d'être lue).
// À resserrer vers 1/60 quand les livrables d'un run passent à 1/40.
function lintEmphasis(md){
  const L = md.split('\n'); let prose = 0, words = 0;
  L.forEach(l => {
    words += l.split(/\s+/).filter(Boolean).length;
    if(/^#{1,6}\s/.test(l) || /^\s*\|/.test(l)) return;
    const body = l.replace(/^\s*[-*>]\s*/, '');
    for(const m of l.matchAll(/\*\*([^*]+)\*\*/g)){
      const isLabel = /^\*\*[^*]+\*\*\s*(:|—)/.test(body) && body.indexOf(m[0]) === 0;
      if(!isLabel) prose++;
    }
  });
  const MAX = 40;
  if(!prose || words / prose >= MAX) return [];
  return ['gras de prose : ' + prose + ' pour ' + words + ' mots (1 tous les '
    + Math.round(words / prose) + ') — viser ' + Math.floor(words / MAX)
    + ' au plus (CLAUDE.md : rationner le gras)'];
}

function lintAcronyms(md, projectRoot){
  // Robustesse dégradée : vocabulaire illisible/absent → V1 SE TAIT (jamais
  //   d'alerte sur un vocabulaire qu'on n'a pas pu charger).
  let vocab; try { vocab = loadVocab(projectRoot); } catch(e){ return []; }
  const c = {};
  for (const t of (md.match(/\b[A-Z]{2,}\b/g) || [])) c[t] = (c[t] || 0) + 1;
  return Object.keys(c).filter(t => c[t] >= 3 && !vocab.has(t))
    .sort((a, b) => c[b] - c[a])
    .map(t => `acronyme hors vocabulaire : « ${t} » (${c[t]}×) — définir dans mission.md/kpi.md ou écrire en toutes lettres`);
}

// —— Brief : valeurs recopiées du design system — AVERTISSANT, non bloquant. ———————
// maquette § Brief : le langage visuel NOMME les fichiers de context/design/, il ne
// recopie pas leurs valeurs (deux sources pour une valeur divergent). Les valeurs sont LUES
// dans ces fichiers, jamais écrites ici : couleurs hexadécimales partout, nombres dans les
// cellules de tableau (tailles, espacements, rayons, largeurs ; 0 et 1 exclus, trop
// communs). Une ligne sonne si elle porte une couleur du DS, ou au moins trois nombres
// distincts qui sont TOUS des valeurs du DS — une échelle recopiée. Un paragraphe qui dit
// « manque » est exempt : c'est la place d'une valeur que le DS n'a pas.
// Pas de dossier design/ lisible ⇒ rien à recopier ⇒ silence.
function loadDesignValues(projectRoot){
  const dir = path.join(projectRoot, 'context', 'design');
  const hex = new Set(), num = new Set();
  for(const f of fs.readdirSync(dir).filter(f => /\.md$/i.test(f))){
    const t = fs.readFileSync(path.join(dir, f), 'utf8');
    for(const m of t.match(/#[0-9a-f]{3,8}(?![0-9a-z])/gi) || []) hex.add(m.toLowerCase());
    for(const l of t.split('\n')) if(/^\s*\|/.test(l))
      for(const m of l.match(/(?<![\w.,#\/-])\d+(?:[.,]\d+)?(?![\w.,])/g) || [])
        if(!/^[01]$/.test(m)) num.add(m.replace(',', '.'));
  }
  return { hex, num };
}
function lintBriefDS(md, mdPath, projectRoot){
  if(!/(^|\/)03-brief\.md$/i.test(String(mdPath).replace(/\\/g, '/'))) return [];
  let ds; try { ds = loadDesignValues(projectRoot); } catch(e){ return []; }
  if(!ds.hex.size && !ds.num.size) return [];
  const hits = []; let manque = false;
  md.split('\n').forEach((l, i) => {
    if(!l.trim()){ manque = false; return; }                 // fin de paragraphe
    if(/^#{1,6}\s/.test(l)){ manque = false; return; }
    if(/^\s*[-*]\s|^\s*\d+\.\s/.test(l)) manque = false;       // nouvelle puce
    if(/manque/i.test(l)) manque = true;
    if(manque) return;
    const h = (l.match(/#[0-9a-f]{3,8}(?![0-9a-z])/gi) || []).filter(x => ds.hex.has(x.toLowerCase()));
    const n = [...new Set((l.match(/(?<![\w.,#\/-])\d+(?:[.,]\d+)?(?![\w.,])/g) || []).map(x => x.replace(',', '.')))];
    const echelle = n.length >= 3 && n.every(x => ds.num.has(x));
    if(h.length || echelle) hits.push('l.' + (i + 1));
  });
  if(!hits.length) return [];
  return [hits.length + ' ligne(s) du brief recopient des valeurs de context/design/ : ' + hits.slice(0, 8).join(' · ')
    + (hits.length > 8 ? ' … (+' + (hits.length - 8) + ')' : '')
    + ' — nommer le fichier et la zone, ne pas recopier ; une valeur absente du design system va dans un paragraphe qui dit « manque »'];
}

// —— Références O/S/B/R cliquables, INTRA-document (rendu). ————————————————
// Ne s'active QUE sur un document qui DÉFINIT ses identifiants (annexe :
// <li><strong>ID…). Un doc qui ne fait que citer (brief, idéation) → no-op :
// refs cross-document laissées en texte, jamais de lien mort ni de faux gap.
// Lien seulement si l'ancre existe ; sinon texte simple + orphelin (gap).
function linkifyRefs(html){
  const ID = '[OSBR](?:\\d+|-[A-Za-z0-9]+)'; // O1, S12, B7, O-a11y, S-conflit ; \b coupe « B2B », pas de préfixe sur les dates
  const defs = new Set();
  // 1. ancrer chaque définition ; id lowercase « ref-… » → pas de collision et
  //    invisible au motif de référence, qui exige des MAJUSCULES.
  html = html.replace(new RegExp('<li>\\s*<strong>(' + ID + ')\\b', 'g'),
    (m, id) => { defs.add(id); return m.replace('<li>', '<li id="ref-' + id.toLowerCase() + '">'); });
  //    R* en table (sortie de research) : la première cellule définit. Mise en gras
  //    comme une puce de définition, ce qui la soustrait aussi au lien vers elle-même.
  html = html.replace(/<tr>(\s*)<td([^>]*)>\s*(?:<strong>)?(R\d+)(?:<\/strong>)?\s*<\/td>/g,
    (m, sp, attrs, id) => { defs.add(id); return '<tr id="ref-' + id.toLowerCase() + '">' + sp
      + '<td' + attrs + '><strong>' + id + '</strong></td>'; });
  if (!defs.size) return { html, orphans: [] };            // doc non auto-définissant → no-op
  // 2. lier les références en texte SÛR : sauter a/code/pre/h1-4/strong (ni liens
  //    existants, ni la définition elle-même).
  const openRe = /^<(a|code|pre|h[1-4]|strong)\b/i, closeRe = /^<\/(a|code|pre|h[1-4]|strong)>/i;
  const refRe = new RegExp('\\b' + ID + '\\b', 'g');
  const orphans = new Set(); let skip = 0, out = '';
  for (const tok of (html.match(/<[^>]+>|[^<]+/g) || [])) {
    if (tok[0] === '<') { if (openRe.test(tok)) skip++; else if (closeRe.test(tok)) skip = Math.max(0, skip - 1); out += tok; continue; }
    out += skip > 0 ? tok : tok.replace(refRe, id =>
      defs.has(id) ? '<a class="xref" href="#ref-' + id.toLowerCase() + '">' + id + '</a>'
                   : (orphans.add(id), id));
  }
  return { html: out, orphans: [...orphans] };
}

// —— Lint de cohérence du rapport (famille C) — AVERTISSANT, non bloquant. ——
// Les contraintes que la prose n'a pas su porter vivent ICI. Deux familles :
//  · le cran doit CONTRAINDRE, pas étiqueter — (B) la confiance d'un constat ne
//    dépasse pas le PLAFOND autorisé par le cran de ses signaux ; (D) un signal fort
//    ou à coordonnées non comparables n'est pas abandonné en annexe ; (P) le résumé
//    nomme son signal porteur, cran cohérent ;
//  · le diagnostic doit tenir avec la reco — (R) chaque constat est repris par la
//    direction ou les actions, ou écarté explicitement ; (T) une note de tension,
//    quand il y en a une, nomme les identifiants en présence.
// Déclencheur : « Constats priorisés » ou « Résumé exécutif » (le RAPPORT). JAMAIS
// les pistes ni les hypothèses — proposer sur un signal faible reste légitime ;
// seul CONCLURE est contraint. Un ÉCHEC DE PARSING s'émet comme gap, il ne se tait
// pas. Normalisation de la confiance : on retient le niveau LE PLUS HAUT présent
// dans la cellule — « Moyenne-Haute » compte comme « Haute » (couvrir vers le haut
// ne contourne pas le plafond) ; une valeur non reconnue émet un gap.
const CONF = { haute:3, moyenne:2, faible:1, basse:1 };
function confRank(s){ let r = 0; for(const w in CONF) if(new RegExp(w,'i').test(s)) r = Math.max(r, CONF[w]); return r; }
function lintCoherence(md){
  const gaps = [];
  if(!/^#{2,6}\s+(Constats priorisés|Résumé exécutif)/m.test(md)) return gaps; // non-rapport → no-op

  // Découpe en sections par titre (niveaux 2-6).
  const sec = {}; let cur = '__pre__'; sec[cur] = [];
  for(const line of md.split('\n')){
    const h = line.match(/^#{2,6}\s+(.+?)\s*$/);
    if(h){ cur = h[1].trim(); sec[cur] = []; } else sec[cur].push(line);
  }
  // Titre EXACT : ne pas fusionner « Hypothèses écartées » avec « Hypothèses de
  // design », ni une sous-section d'annexe avec les Constats.
  const body = re => Object.keys(sec).filter(k => re.test(k.trim())).map(k => sec[k].join('\n')).join('\n');

  // Table S* → cran, depuis l'annexe : « - **S3** *(mesuré, faible amplitude)* — … »
  // Puce - ou *, italique du cran optionnel (tolérance de typo). Un cran sans base
  // reconnue S'ÉMET comme gap — jamais d'escamotage silencieux.
  const cran = {};
  const defRe = /^\s*[-*]\s*\*\*(S(?:\d+|-[A-Za-z0-9]+))\*\*\s*\*?\(([^)]*)\)\*?/gm;
  let m; while((m = defRe.exec(md))) cran[m[1]] = m[2].toLowerCase();
  for(const id in cran) if(!/mesur[ée]|[ée]tabli/.test(cran[id]))
    gaps.push(id + ' (' + cran[id] + ') — cran non classé (base attendue « mesuré » ou « établi ») — vérification partielle');
  const K = c => ({ etabli:/[ée]tabli/.test(c), forte:/forte amplitude/.test(c), faible:/faible amplitude/.test(c),
    horsCoord:/coordonn[eé]es?\s*(≠|non\s*comparable|incomparable)/.test(c), ecarte:/non exploité/.test(c) });
  // Plafond de confiance autorisé par les signaux cités (comparable = coordonnées OK).
  function plafond(ids){
    let etabli = 0, forteC = 0, comparable = 0;
    for(const id of ids){ const k = K(cran[id] || ''); const comp = !k.horsCoord;
      // établi ne fonde « Haute » que s'il est COMPARABLE : un « établi » à
      // coordonnées non comparables ne peut pas porter une confiance de comparaison.
      if(k.etabli && comp) etabli++; if(k.forte && comp) forteC++; if(comp) comparable++; }
    if(etabli >= 1 || forteC >= 2) return 3;   // Haute
    if(comparable >= 1) return 2;              // Moyenne
    return 1;                                  // Faible (coordonnées non comparables seules)
  }
  const NAME = { 3:'Haute', 2:'Moyenne', 1:'Faible' };

  // (B) Constats : confiance écrite vs plafond. Échec de parsing → gap.
  if(/^#{2,6}\s+Constats/m.test(md)){
    const rows = body(/^Constats priorisés$/i).split('\n').filter(l => /^\s*\|/.test(l));
    if(rows.length < 2){ gaps.push('table de constats introuvable ou illisible — bornage de confiance NON vérifié'); }
    else {
      const cells = r => r.split('|').slice(1,-1).map(s => s.trim());
      const head = cells(rows[0]).map(h => h.toLowerCase());
      const iS = head.findIndex(h => /source/.test(h)), iC = head.findIndex(h => /confiance/.test(h));
      if(iS < 0 || iC < 0){ gaps.push('colonnes « Sources »/« Confiance » introuvables — bornage NON vérifié'); }
      else for(const r of rows.slice(2)){
        const c = cells(r); if(c.length <= Math.max(iS, iC)) continue;
        const ids = c[iS].match(/S(?:\d+|-[A-Za-z0-9]+)/g) || [];
        if(!ids.length) continue;                 // pas de signal → hors bornage (repose sur O/B)
        if(ids.some(id => !(id in cran))) continue; // S* sans entrée d'annexe → géré par le contrôle d'orphelins (pas de plafond fantôme)
        const lab = (c[0].match(/C(?:\d+|-[A-Za-z0-9]+)/) || ['(constat)'])[0];
        const written = confRank(c[iC].split('(')[0]);   // lire le niveau, pas la réserve entre ()
        if(!written){ gaps.push(lab + ' : confiance « ' + c[iC] + ' » non reconnue — bornage NON vérifié'); continue; }
        const cap = plafond(ids);
        if(written > cap){
          const extra = cap === 1 ? ' (coordonnées non comparables seules — déclarer la réserve)'
                      : cap === 2 ? ' (aucun établi, moins de deux à forte amplitude)' : '';
          gaps.push(lab + ' — confiance « ' + c[iC].trim() + ' » au-dessus du plafond « ' + NAME[cap]
            + ' » autorisé par le cran des sources' + extra);
        }
      }
    }
  }

  // Usage = tout S* cité en constats, hypothèses, PISTES ou résumé (porteur inclus).
  // Proposer une piste sur un signal l'exploite autant que le citer en constat.
  const usedAny = new Set([body(/^Constats priorisés$/i), body(/^Hypothèses de design$/i),
    body(/^Pistes/i), body(/^Résumé exécutif$/i)]
    .join('\n').match(/S(?:\d+|-[A-Za-z0-9]+)/g) || []);
  if(!Object.keys(cran).length && usedAny.size)
    gaps.push('aucun cran de signal lu depuis l\'annexe (format attendu « - **S\\*** *(cran)* ») — bornage NON vérifié');

  // (D) Signal fort / non comparable jamais exploité (échappatoire « non exploité »).
  for(const id of Object.keys(cran)){
    const k = K(cran[id]); if(k.ecarte) continue;
    if((k.etabli || k.forte || k.horsCoord) && !usedAny.has(id))
      gaps.push(id + ' (' + cran[id] + ') — signal fort cité nulle part (constat, hypothèse, piste ou résumé) — écarter avec « non exploité : … » si voulu');
  }

  // (P) Résumé : nomme son signal porteur, cran cohérent avec l'annexe.
  // L'absence TOTALE de signal est une réponse VALIDE : un sujet où rien n'a été déposé
  // n'a pas de thèse à faire porter par un signal. Sans ce garde, le seul moyen de passer
  // les trois contrôles enchaînés serait d'INVENTER un signal qui déclare qu'il n'y en a
  // pas. Dès qu'UN signal existe, les trois contrôles reprennent entiers.
  if(/^#{2,6}\s+Résumé exécutif/m.test(md) && Object.keys(cran).length){
    const pm = body(/^Résumé exécutif$/i).match(/Signal porteur\s*:\s*(.+)/i);
    if(!pm){ gaps.push('résumé exécutif sans ligne « Signal porteur : S* (cran) » — la thèse ne nomme pas ce qui la porte'); }
    else {
      const stated = pm[1].replace(/[*_`]/g, '').trim();   // sans emphase markdown
      const ids = stated.match(/S(?:\d+|-[A-Za-z0-9]+)/g) || [];
      if(!ids.length) gaps.push('ligne « Signal porteur » sans identifiant S*');
      ids.forEach(id => { if(!(id in cran)) gaps.push('signal porteur ' + id + ' absent de l\'annexe des signaux'); });
      if(ids.length === 1 && (ids[0] in cran)){       // surestimation seulement — l'abrègement du cran est légitime
        const a = K(cran[ids[0]]), s = K(stated.toLowerCase());
        if((s.etabli && !a.etabli) || (s.forte && !(a.forte || a.etabli)))
          gaps.push('signal porteur ' + ids[0] + ' — le résumé surestime son cran (résumé : «' + stated + '» / annexe : «' + cran[ids[0]] + '»)');
      }
    }
  }

  // (R) Diagnostic ↔ reco : chaque constat est repris par la direction ou les
  //     actions, ou écarté explicitement dans sa ligne. Le champ « Fondé sur : C* »
  //     force la juxtaposition du constat et de la piste qu'il fonde : une reco qui
  //     contredit son diagnostic devient visible À L'ÉCRITURE. Porte sur TOUS les
  //     constats, pas les seuls « Haute » — le bornage (B) fait descendre en
  //     confiance exactement les constats en tension, qui échapperaient au contrôle.
  // Trois états distingués (un rapport peut être écrit en un seul jet ou en deux) :
  //   section absente       → no-op (audit seul, l'idéation n'est pas passée) ;
  //   section sans aucun C* → UN gap (placeholder OU reco non reliée : indécidable ici) ;
  //   section avec ≥ 1 C*   → contrôle complet, un gap par constat orphelin.
  if(/^#{2,6}\s+Direction recommandée/m.test(md)){
    const reco = body(/^Direction recommandée$/i) + '\n' + body(/^Actions$/i);
    const cited = new Set(reco.match(/\bC(?:\d+|-[A-Za-z0-9]+)\b/g) || []);
    const rows = body(/^Constats priorisés$/i).split('\n').filter(l => /^\s*\|/.test(l));
    if(!cited.size){
      gaps.push('« Direction recommandée » ne cite aucun constat — section en attente de l\'idéation, ou reco non reliée au diagnostic (ligne « Fondé sur : C* » manquante)');
    } else for(const r of rows.slice(2)){
      const id = (r.match(/\bC(?:\d+|-[A-Za-z0-9]+)\b/) || [])[0];
      if(!id || cited.has(id) || /écarté\s*:/i.test(r)) continue;
      gaps.push(id + ' — repris ni par la direction ni par les actions — le citer sous « Fondé sur : » ou le marquer « écarté : … » dans sa ligne');
    }
  }

  // (T) Note de tension : quand elle existe, elle nomme les identifiants en
  //     présence (sinon la tension n'est pas traçable jusqu'aux constats qu'elle
  //     oppose). AUCUNE note n'est exigée en retour : inventer une tension est pire
  //     que n'en signaler aucune — le lint ne crée jamais l'obligation inverse.
  const cst = (body(/^Constats priorisés$/i) || '').split('\n');
  const iT = cst.findIndex(l => !/^\s*\|/.test(l) && /\*\*\s*(Tensions?|Conflit)/i.test(l));
  if(iT >= 0 && !/\b[COSB](?:\d+|-[A-Za-z0-9]+)\b/.test(cst.slice(iT).join('\n')))
    gaps.push('note de tension sans identifiant (C*/O*/S*/B*) — les lectures en présence ne sont pas rattachées aux constats qu\'elles opposent');

  return gaps;
}

// —— Sections de CONTRÔLE : dans la source, jamais à l'affichage ————————————————
// Les deux tableaux du brief (maquette § Brief) sont lus par la galerie et servent le
// travail ; le brief, lui, se partage. Ils restent dans la source (.src/, que proto-frame
// lit, et le bouton « Copier le markdown ») et quittent le rendu, sommaire compris.
// UNE source pour les titres : proto-frame importe cette constante pour lire les mêmes
// tableaux — renommer une section ne peut plus casser l'un sans l'autre.
const SECTIONS_CONTROLE = { chrome: 'Source du chrome', socle: 'Socle observé' };
function masquerControles(md){
  const out = []; let coupe = 0;                           // niveau du titre masqué, 0 = rien
  for(const l of md.split('\n')){
    const h = /^(#{2,6})\s+(.*)$/.exec(l);
    if(h && coupe && h[1].length <= coupe) coupe = 0;
    if(h && !coupe && Object.values(SECTIONS_CONTROLE).some(s => h[2].startsWith(s))) coupe = h[1].length;
    if(!coupe) out.push(l);
  }
  return out.join('\n');
}

function convert(mdPath){
  const abs = path.resolve(mdPath);
  const mdDir = path.dirname(abs);
  const inSrc = path.basename(mdDir) === '.src';        // source déjà rangée ?
  const rootDir = inSrc ? path.dirname(mdDir) : mdDir;   // racine du sujet
  const md = fs.readFileSync(abs, 'utf8');
  // template résolu en ABSOLU depuis le dossier du script (robuste quel que
  // soit le cwd / le sous-dossier du sujet)
  const tpl = fs.readFileSync(path.join(__dirname, 'hydra-render.html'), 'utf8');

  // Ce qui se lit ET ce qui se copie : le même texte, sections de contrôle retirées — le
  // bouton « copier » ne réinjecte pas ce que le rendu masque.
  const visible = masquerControles(md);
  let body = renderMd(visible);
  const t = buildTOC(body);
  body = embedImages(t.html, rootDir);                   // images relatives à la RACINE du sujet
  // Références O/S/B/R cliquables (intra-doc). Encapsulé : si ça casse, body inchangé.
  let refOrphans = [];
  try { const lk = linkifyRefs(body); body = lk.html; refOrphans = lk.orphans; }
  catch(e){ log('linkify ignoré (non bloquant) : ' + e.message); }
  const type = detectType(body, abs);

  // replacer en FONCTION → aucune substitution accidentelle de $&, $1…
  const out = tpl
    .replace(/<!--HYDRA:TYPE-->/g, () => esc(type))
    .replace('<!--HYDRA:TOC-->', () => t.tocHtml)
    .replace('<!--HYDRA:CONTENT-->', () => body)
    .replace('<!--HYDRA:MDSOURCE-->', () => escScript(visible));

  const rel = p => path.relative(process.cwd(), p);
  const outPath = path.join(rootDir, path.basename(abs).replace(/\.(md|markdown)$/i, '') + '.html');
  if(fs.existsSync(outPath) && fs.readFileSync(outPath, 'utf8') === out){ log('inchangé : ' + rel(outPath)); }
  else { fs.writeFileSync(outPath, out); log('écrit ' + rel(outPath)); }   // « [md-to-html] écrit » : lu par hydra-bilan --duree

  // Ranger la source dans <sujet>/.src/ (jamais si déjà dans .src)
  if(MOVE_TO_SRC && !inSrc){
    const srcDir = path.join(rootDir, '.src');
    fs.mkdirSync(srcDir, { recursive: true });
    const dest = path.join(srcDir, path.basename(abs));
    fs.renameSync(abs, dest);
    log('source déplacée → ' + rel(dest));
  }
  // Conversion ET déplacement FAITS ci-dessus. Le lint vient APRÈS,
  //      entièrement encapsulé : toute erreur est avalée, le HTML est déjà écrit
  //      quoi qu'il arrive. Le lint ne casse JAMAIS la conversion.
  let gaps = [];
  const projectRoot = abs.includes('/topics/') ? abs.slice(0, abs.indexOf('/topics/')) : process.cwd();
  // Structure : rapport d'audit seulement (déclencheurs internes).
  // Acronymes : TOUT livrable .md — un acronyme inventé est un problème partout.
  try { gaps = lintStructure(md, abs); } catch(e){ log('lint structure ignoré : ' + e.message); }
  try { gaps = gaps.concat(lintAcronyms(md, projectRoot)); } catch(e){ log('lint acronymes ignoré : ' + e.message); }
  // Lisibilité : TOUT livrable .md — un renvoi qui porte la phrase et un gras qui ne
  // marque plus rien sont des problèmes partout, pas seulement dans le rapport.
  try { gaps = gaps.concat(lintRefUse(md, abs, projectRoot)); } catch(e){ log('lint renvois ignoré : ' + e.message); }
  try { gaps = gaps.concat(lintEmphasis(md)); } catch(e){ log('lint gras ignoré : ' + e.message); }
  try { gaps = gaps.concat(lintBriefDS(md, abs, projectRoot)); } catch(e){ log('lint design system ignoré : ' + e.message); }
  if (refOrphans.length) gaps.push('référence(s) O/S/B/R sans entrée d\'annexe : '
    + refOrphans.join(', ') + ' — traçabilité rompue');
  // Cohérence (cran + diagnostic/reco) : le catch ÉMET (jamais de fallback
  // silencieux — un échec de parsing doit se signaler comme gap, pas disparaître).
  try { gaps = gaps.concat(lintCoherence(md)); }
  catch(e){ gaps.push('lint de cohérence non exécuté (parsing : ' + e.message + ') — cran et cohérence diagnostic/reco NON vérifiés'); }
  // Livrable de recette (reconnu à sa ligne de compte) : la réconciliation du garde, dite
  // ICI — le rendu est le canal qui parle à l'agent sans bloquer — et le calcul des
  // conformes inscrit dans le relevé de maquette. Une implémentation, celle du garde.
  if(/^\*\*\d+ corrections?\*\*/m.test(md)){
    try {
      const r = require(path.join(__dirname, 'hydra-qa-gate.js'))
        .recetteFaits(rootDir, { livrable: { nom: path.basename(abs), texte: md }, ecrire: true });
      gaps = gaps.concat(r.bloquants, r.dits);
    } catch(e){ gaps.push('réconciliation de recette non exécutée (' + e.message + ') — conformes et dérives NON vérifiés'); }
  }
  return { outPath, gaps };
}

// inputs/ : matériau DÉPOSÉ (l'audit le recopie pour qu'une étiquette [input] soit
// vérifiable), jamais un livrable — le rendre le déplacerait sous inputs/.src/ et casserait
// le chemin que le rapport cite.
function isDeliverableMd(p){
  const n = String(p).replace(/\\/g,'/');
  return /(^|\/)topics\/.+\.(md|markdown)$/i.test(n) && !/(^|\/)topics\/[^/]+\/inputs\//i.test(n);
}

// —— Retard de rendu : écritures que le hook Write|Edit ne voit pas (Bash, script) ——
// Markdown resté à la racine d'un sujet (jamais rendu) ou .src/ plus récent que son
// .html. Sujets préfixés d'un point (dont topics/.archive/, où dorment les runs passés) =
// archives dormantes, jamais balayées. UNE seule
// définition : le garde de fin de tour l'importe au lieu de la recopier.
const mtime = f => { try { return fs.statSync(f).mtimeMs; } catch(e){ return 0; } };
const lsDir = d => { try { return fs.readdirSync(d); } catch(e){ return []; } };
function staleDocs(sub){
  const out = lsDir(sub).filter(f => /\.md$/i.test(f)).map(f => path.join(sub, f));
  const s = path.join(sub, '.src');
  for(const f of lsDir(s)){
    if(!/\.md$/i.test(f)) continue;
    if(mtime(path.join(s, f)) > mtime(path.join(sub, f.replace(/\.md$/i, '.html')))) out.push(path.join(s, f));
  }
  return out;
}
function liveSubjects(root){
  return lsDir(path.join(root, 'topics')).filter(n => !n.startsWith('.'))
    .map(n => path.join(root, 'topics', n))
    .filter(p => { try { return fs.statSync(p).isDirectory(); } catch(e){ return false; } });
}
// Rendu inchangé ⇒ convert n'écrit pas, le .html garde sa date et le doc repasserait
// « en retard » à chaque passage : on avance la date du .html rendu.
function touch(f){ try { const n = new Date(); fs.utimesSync(f, n, n); } catch(e){} }
// Balayage Bash : le SUJET COURANT seulement. Deux runs parallèles sur deux sujets ne
// doivent ni rendre les livrables de l'autre ni recevoir ses lints. Le sujet courant est
// le fait de hydra-bilan (sujets où la session a écrit), une seule définition. Non
// établi ⇒ rien n'est balayé, et ça se dit — une fois par état, pas à chaque appel —
// s'il y avait quelque chose à rattraper. `enRetard(sub)` dit ce que l'outil rattraperait.
function sujetsBalayes(pl, root, enRetard, outil){
  let courants = new Set();
  try { courants = require(path.join(__dirname, 'hydra-bilan.js')).sujetsCourants(pl.transcript_path, root); } catch(e){}
  const vivants = liveSubjects(root);
  if(courants.size) return { subs: vivants.filter(s => courants.has(path.basename(s).normalize('NFC'))), dit: null };
  const retard = vivants.filter(enRetard).map(s => path.basename(s));
  if(!retard.length) return { subs: [], dit: null };
  // Le NOMBRE, pas les noms : ce sont souvent les sujets d'autres sessions, et les nommer
  // invite l'agent à aller y toucher. Le souvenir, lui, garde les noms : un autre jeu de
  // sujets en retard se redit, même en nombre égal.
  const dit = 'Balayage ' + outil + ' : sujet courant non établi (aucun fichier écrit par Write/Edit sous '
    + 'topics/ dans cette session) — rien n\'est rendu ; ' + retard.length + ' sujet(s) actif(s) en retard';
  const etat = retard.slice().sort().join('\n');
  const stamp = path.join(require('os').tmpdir(), 'hydra-balayage-' + outil + '-'
    + path.basename(String(pl.transcript_path || pl.session_id || 'x'), '.jsonl') + '.txt');
  let prec = ''; try { prec = fs.readFileSync(stamp, 'utf8'); } catch(e){}
  if(prec === etat) return { subs: [], dit: null };
  try { fs.writeFileSync(stamp, etat); } catch(e){}
  return { subs: [], dit };
}
// Rattrape les livrables en retard et RENVOIE leurs lints, au lieu de les perdre.
function sweep(root, subs){
  const res = [];
  for(const sub of (subs || liveSubjects(root))) for(const f of staleDocs(sub)){
    try { const r = convert(f); touch(r.outPath); res.push({ file: path.relative(root, r.outPath), gaps: r.gaps || [] }); }
    catch(e){ res.push({ file: path.relative(root, f), gaps: ['rendu en échec : ' + e.message] }); }
  }
  return res;
}
module.exports = { staleDocs, liveSubjects, sweep, sujetsBalayes, touch, SECTIONS_CONTROLE, lintAcronyms };

const arg = require.main === module ? process.argv[2] : null;
if(require.main !== module){ /* importé (garde de fin de tour) : aucune entrée */ }
else if(arg){
  // CLI : convertit ET affiche les gaps via log — l'info existe, ne pas la jeter
  // en relance manuelle.
  const r = convert(arg);
  if(r && r.gaps) r.gaps.forEach(g => log('lint : ' + g));
}
else {
  let raw = ''; process.stdin.setEncoding('utf8');
  process.stdin.on('data', d => raw += d);
  process.stdin.on('end', () => {
    let pl = {}; try { pl = JSON.parse(raw) || {}; } catch(e){ process.exit(0); }
    // Bash : aucun chemin à lire dans l'appel — on regarde le DISQUE. Un livrable
    // écrit par script est rendu ici, et ses lints arrivent dans le même tour.
    if(pl.tool_name === 'Bash'){
      let out = [], dit = null;
      try {
        // Le projet d'abord : après un `cd` dans l'appel, pl.cwd n'est plus la racine, le
        // sujet courant ne s'y retrouve pas et plus rien ne serait rendu. Même règle que hydra-bilan.
        const root = process.env.CLAUDE_PROJECT_DIR || pl.cwd || process.cwd();
        const b = sujetsBalayes(pl, root, s => staleDocs(s).length > 0, 'des livrables');
        dit = b.dit;
        out = sweep(root, b.subs).filter(r => r.gaps.length);
      }
      catch(e){ log('balayage ignoré : ' + e.message); }
      const txt = [dit, out.length ? '⚠ Livrable écrit hors Write/Edit, rendu au passage — à corriger avant de finir :\n'
        + out.map(r => r.file + '\n- ' + r.gaps.join('\n- ')).join('\n') : null].filter(Boolean).join('\n');
      try {
        if(txt) process.stdout.write(JSON.stringify({
          hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: txt }
        }));
      } catch(e){}
      process.exit(0);
    }
    const fp = (pl.tool_input || {}).file_path || '';
    if(!fp || !isDeliverableMd(fp) || !fs.existsSync(fp)) process.exit(0);
    let gaps = [];
    try { gaps = (convert(fp) || {}).gaps || []; } catch(e){ log('échec : ' + e.message); }
    // AVERTISSANT, non bloquant (exit 0) : injecte un system-reminder que le
    // modèle lit et peut corriger AVANT de finir. Silencieux s'il n'y a rien.
    try {
      if(gaps.length) process.stdout.write(JSON.stringify({
        hookSpecificOutput: { hookEventName: 'PostToolUse',
          additionalContext: '⚠ Livrable — à corriger avant de finir :\n- ' + gaps.join('\n- ') }
      }));
    } catch(e){ /* jamais bloquer la fin de tour */ }
    process.exit(0);
  });
}
