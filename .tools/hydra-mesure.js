#!/usr/bin/env node
'use strict';
/* Hydra — relevé de mesures pour la recette graphique. Invoqué À LA MAIN par la
   tête hydra-recette, jamais par un hook : c'est une ENTRÉE du livrable, pas une
   vérification de sortie. Seul le pilotage CDP (`session`) est partagé, avec la
   galerie des explorations, qui y charge ses cadres — et la lecture des identifiants
   de ligne d'un livrable (`idsLigne`), avec le garde de fin de tour.

   POURQUOI UN SCRIPT. Sans outil de mesure, la recette se fait à l'œil, et les
   écarts métriques ne sortent jamais : une taille ou un espacement qui dérive de
   quelques pixels ne se voit pas. Une méthode qui demande de mesurer sans outil
   pour mesurer est une règle sans mécanisme.

   ÉCHEC NON SILENCIEUX — c'est la propriété qui justifie ce script plutôt qu'une
   heuristique d'image. Le relevé est un FICHIER d'entrée du rapport : s'il
   manque, la colonne « Constaté » n'a rien à contenir et la recette ne peut pas
   s'écrire en faisant semblant. Navigateur absent, page injoignable, page vide :
   on sort avec le motif sur stderr, code 1, et on n'écrit RIEN.

   DEUX MODES.
     --url <url|chemin>  page réelle → styles CALCULÉS par élément (le seul mode
                         qui rende police, taille, graisse, interligne).
     --image <png>       capture seule → recensement des couleurs au pixel exact.
                         La géométrie n'y est PAS relevée : la détection de
                         frontières par profil de ligne rend des dizaines de
                         fausses limites (mesuré : 65 sur 1 400 lignes, toutes sur
                         des bords de glyphe). Un relevé faux est pire qu'absent.

   Zéro dépendance : Chrome headless piloté en CDP, client WebSocket natif de
   Node (≥ 22). Zéro contenu client. */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');

const ATTENTE_MS = 20000;   // chargement de page
const REPOS_MS   = 1200;    // stabilisation après load (polices, images)
const REPOS_FERM = 600;     // stabilisation après une tentative de fermeture
const PLAFOND    = 1200;    // éléments relevés au maximum — dit quand il coupe

// Part du viewport au-delà de laquelle un élément hors flux ne décore plus la
// page : il la BARRE.
// CE SEUIL N'EST PAS CALIBRÉ, IL EST CHOISI. Un seul cas réel l'a motivé, et bien
// d'autres seuils l'auraient attrapé aussi. Pour le calibrer il faudrait une collection de pages portant des
// surcouches de tailles VARIÉES — bandeau de bas de page, encart de coin,
// modale partielle — avec, pour chacune, le verdict humain « ça barre / ça ne
// barre pas ». Tant que cette collection n'existe pas, 0,25 est un pari
// documenté.
// LA SURFACE NE SUFFIT PAS : un en-tête collant peut occuper plus que ce seuil dès
// que le viewport se raccourcit. Un critère de surface seul en ferait un barrage. D'où la seconde
// condition, non négociable : l'élément doit COUVRIR LE CENTRE de l'écran. Une
// bande haute ou basse, si large soit-elle, laisse le centre libre — elle
// n'empêche personne de voir la page.
const COUVERTURE = 0.25;

// Même recherche que proto-shot.js : l'absence est un FAIT à déclarer.
function trouverNavigateur(){
  const c = [ process.env.HYDRA_BROWSER,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' ];
  for(const p of c){ try { if(p && fs.existsSync(p)) return p; } catch(e){} }
  return null;
}

function mourir(motif){ process.stderr.write('hydra-mesure : ' + motif + '\n'); process.exit(1); }

function args(){
  const a = process.argv.slice(2), o = { largeur: 1440, mobile: false };
  for(let i=0;i<a.length;i++){
    const v = a[i+1];
    if(a[i]==='--url') { o.url = v; i++; }
    else if(a[i]==='--image')   { o.image = v; i++; }
    else if(a[i]==='--largeur') { o.largeur = parseInt(v,10); i++; }
    else if(a[i]==='--hauteur') { o.hauteur = parseInt(v,10); i++; }
    else if(a[i]==='--sortie')  { o.sortie = v; i++; }
    else if(a[i]==='--dossier') { o.dossier = v; i++; }
    else if(a[i]==='--captures'){ o.captures = v; i++; }
    else if(a[i]==='--fermer')  { o.fermer = v; i++; }
    else if(a[i]==='--mobile')  { o.mobile = true; }
    else if(a[i]==='--annoter') { o.annoter = v; i++; }
    else if(a[i]==='--releve')  { o.releve = v; i++; }
  }
  return o;
}

// —— Pilotage CDP ————————————————————————————————————————————————————————————
// Deux lancements simultanés (deux recettes, une galerie pendant une recette) ne doivent
// jamais se croiser. D'où : un profil NEUF et unique (jamais celui d'un autre lancement ni
// d'un ancien, qui garderait cookies et consentements) ; un port choisi par le SYSTÈME,
// que Chrome écrit dans ce profil — on ne devine plus un port qu'un autre Chrome, ou un
// orphelin, pourrait tenir ; et la vérification que l'adresse annoncée au port est celle
// que NOTRE profil a écrite. Chrome est toujours fermé et son profil supprimé en sortie,
// erreur comprise ; une connexion qui tombe rejette les appels en attente au lieu de les
// laisser pendre. Toute erreur est LEVÉE, jamais une sortie du processus : la galerie
// réutilise cette session et doit pouvoir dire « non vérifié » ; la ligne de commande la
// rattrape en bas de fichier et sort avec le message de l'erreur, code 1.
async function session(nav, prepare){
  const profil = fs.mkdtempSync(path.join(os.tmpdir(), 'hydra-mesure-'));
  // Sans extensions : leur installation au premier lancement, coupée par la fermeture,
  // laisse ses paquets dans le dossier temporaire, hors du profil (proto-shot, même cause).
  const proc = spawn(nav, ['--headless=new','--disable-gpu','--hide-scrollbars',
    '--no-first-run','--no-default-browser-check','--disable-extensions','--allow-file-access-from-files',
    '--remote-debugging-port=0', '--user-data-dir=' + profil, 'about:blank'],
    { stdio: 'ignore' });
  proc.on('error', () => {});
  const sortieProc = new Promise(r => proc.once('exit', r));
  const tuer = () => { try{ proc.kill(); }catch(e){} };
  process.on('exit', tuer);                     // dernier recours, si le processus sort ailleurs
  let ws = null;
  try {
    let port = 0, chemin = '';
    for(let i = 0; i < 75 && !port; i++){
      try { const l = fs.readFileSync(path.join(profil, 'DevToolsActivePort'), 'utf8').split('\n');
            if(+l[0] > 0){ port = +l[0]; chemin = (l[1] || '').trim(); } } catch(e){}
      if(!port) await new Promise(r => setTimeout(r, 200));
    }
    if(!port) throw new Error('le navigateur n\'a pas ouvert son port de pilotage');
    let ver = null; try { ver = await (await fetch('http://127.0.0.1:' + port + '/json/version')).json(); } catch(e){}
    if(!ver || !chemin || !String(ver.webSocketDebuggerUrl || '').endsWith(chemin))
      throw new Error('le port de pilotage ne répond pas depuis notre navigateur');

    ws = new WebSocket(ver.webSocketDebuggerUrl);
    let n = 0, ferme = false; const attente = new Map(); const evenements = [];
    const rompre = () => { ferme = true;
      for(const [, p] of attente) p.rej(new Error('pilotage du navigateur interrompu'));
      attente.clear(); };
    const envoyer = (method, params = {}, sessionId) => new Promise((res, rej) => {
      if(ferme) return rej(new Error('pilotage du navigateur interrompu'));
      const id = ++n; attente.set(id, { res, rej });
      ws.send(JSON.stringify({ id, method, params, sessionId }));
    });
    await new Promise((r, j) => { ws.onopen = r; ws.onerror = () => j(new Error('connexion au navigateur refusée')); });
    ws.onclose = rompre; ws.onerror = rompre;
    ws.onmessage = m => {
      const d = JSON.parse(m.data);
      if(d.id && attente.has(d.id)){ attente.get(d.id).res(d); attente.delete(d.id); }
      else evenements.push(d);
    };
    const cible = await envoyer('Target.createTarget', { url: 'about:blank' });
    const att = await envoyer('Target.attachToTarget', { targetId: cible.result.targetId, flatten: true });
    const sid = att.result.sessionId;
    await envoyer('Page.enable', {}, sid);
    await envoyer('Runtime.enable', {}, sid);
    return await prepare({ envoyer, sid, evenements });
  } finally {
    try { if(ws) { ws.onclose = null; ws.onerror = null; ws.close(); } } catch(e){}
    tuer();
    await Promise.race([sortieProc, new Promise(r => setTimeout(r, 3000))]);
    process.removeListener('exit', tuer);
    try { fs.rmSync(profil, { recursive: true, force: true }); } catch(e){}
  }
}

// —— Relevé d'une page ————————————————————————————————————————————————————————
// Un élément est RELEVÉ s'il porte du texte en propre, s'il est média ou contrôle,
// ou s'il peint quelque chose (fond, bordure). Les conteneurs transparents sans
// texte ne sont pas des objets de recette : ils n'ont rien qui puisse dériver.
// —— Outils de page, partagés par le relevé et le constat d'état ——————————————
// Une seule implémentation. Deux copies de `chemin` divergeraient, et un chemin
// qui ne désigne pas le même élément des deux côtés rendrait le constat d'état
// inutilisable pour retrouver la surcouche dans le relevé.
// FNV-1a 32 bits : empreinte courte et déterministe, sans dépendance.
const OUTILS_PAGE = `
  const fnv = s => { let h = 0x811c9dc5;
    for(let i = 0; i < s.length; i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    return (h >>> 0).toString(16).padStart(8, '0'); };
  const chemin = el => {
    const bouts = [];
    for(let n = el; n && n.nodeType === 1 && bouts.length < 4; n = n.parentElement){
      let s = n.tagName.toLowerCase();
      if(n.id){ bouts.unshift(s + '#' + n.id); break; }
      const cl = (n.getAttribute('class') || '').trim().split(/\\s+/).filter(Boolean)[0];
      if(cl) s += '.' + cl;
      bouts.unshift(s);
    }
    return bouts.join(' > ');
  };
  // ANCRE — ce qu'un développeur peut chercher dans son code. Le chemin CSS n'est
  // pas cela : il prend la PREMIÈRE classe de chaque ancêtre, s'arrête au premier
  // id rencontré en remontant — souvent celui d'un ancêtre —, et n'est pas unique.
  // « div.relative » peut désigner deux objets différents dans un même rapport.
  // Sur un build à classes utilitaires, beaucoup d'éléments s'y partagent peu de
  // chemins. L'échelle a été établie sur un relevé de référence ; le premier barreau
  // gagne : id propre · aria-label · alt · texte propre · texte du sous-arbre ·
  // source d'image (title et href n'y ont rien apporté). Ce qui reste sans rien, ce
  // sont des conteneurs (header, main, section, enveloppes).
  // Les data-* ne sont PAS un barreau : sur les builds relevés, ce sont des attributs
  // de framework (images, thème, liens d'évitement) — du bruit, aucun crochet de composant.
  const coupe = t => { t = (t || '').replace(/\\s+/g, ' ').trim();
                       return t.length > 48 ? t.slice(0, 48) + '…' : t; };
  const propre = el => coupe([...el.childNodes].filter(n => n.nodeType === 3)
                              .map(n => n.textContent).join(' '));
  const ancre = el => {
    if(el.id) return '#' + el.id;
    for(const a of ['aria-label', 'alt', 'title']){
      const v = el.getAttribute(a); if(v && coupe(v)) return a + ' : ' + coupe(v);
    }
    const t = propre(el); if(t) return '« ' + t + ' »';
    // Sous-arbre BORNÉ, et seulement pour ce qu'un libellé NOMME légitimement : un
    // bouton porte souvent son texte dans un enfant. Un conteneur de page, non — lui
    // donner le libellé de son premier enfant enverrait le dev sur un autre élément,
    // et une ancre fausse est pire qu'une ancre absente : body et header hériteraient
    // tous deux du libellé de l'en-tête.
    // Les deux bornes — balises et profondeur — ne servent PAS la vitesse : sur le
    // relevé de référence, le texte complet du sous-arbre sur toutes les balises
    // coûte pareil, et ce barreau est négligeable. Elles servent la justesse : sans
    // elles, des conteneurs reçoivent un repère, chacun le libellé d'un autre élément.
    if(/^(BUTTON|A|LABEL|SUMMARY|OPTION|LEGEND|TH|H[1-6])$/.test(el.tagName)){
      let s = '';
      for(const x of el.children){
        s = coupe(s + ' ' + propre(x)); if(s.length > 8) break;
        for(const y of x.children){ s = coupe(s + ' ' + propre(y)); if(s.length > 8) break; }
      }
      if(s) return '« ' + s + ' »';
    }
    if(el.tagName === 'A' && el.getAttribute('href'))
      return 'href : …' + el.getAttribute('href').slice(-40);
    if(el.tagName === 'IMG' && (el.currentSrc || el.src))
      return 'image : ' + (el.currentSrc || el.src).split('/').pop();
    return null;
  };`;

const EXTRACTION = plafond => `(() => {
  const out = [];
  ${OUTILS_PAGE}
  // IDENTITÉ D'UNE IMAGE — sans elle, un logo remplacé par un autre à boîte
  // identique est invisible au relevé. Trois champs, du moins au plus coûteux :
  // la source, les dimensions INTRINSÈQUES de l'octet (une autre œuvre a
  // rarement le même ratio natif), et l'empreinte des pixels RENDUS, échantillonnés
  // en 16x16 gris — comparable d'un côté à l'autre là où l'URL ne l'est jamais
  // (la maquette exporte vers son propre hôte). L'empreinte peut être refusée par
  // le navigateur quand l'image vient d'une autre origine : on écrit alors le
  // MOTIF, jamais un silence — une empreinte absente sans raison serait un écart
  // d'asset réputé vérifié qui ne l'a pas été.
  const identite = el => {
    if(el.tagName === 'SVG' || el.tagName === 'svg')
      return { source: 'svg en ligne', empreinte: fnv(el.outerHTML) };
    const cs = getComputedStyle(el);
    const fondImg = /url\\((.+?)\\)/.exec(cs.backgroundImage || '');
    if(el.tagName !== 'IMG') return fondImg ? { source: fondImg[1].replace(/["']/g, '') } : null;
    const o = { source: el.currentSrc || el.src || null,
                intrinseque: (el.naturalWidth || 0) + 'x' + (el.naturalHeight || 0) };
    try {
      const c = document.createElement('canvas'); c.width = 16; c.height = 16;
      const g = c.getContext('2d'); g.drawImage(el, 0, 0, 16, 16);
      const d = g.getImageData(0, 0, 16, 16).data; let s = '';
      for(let i = 0; i < d.length; i += 4)
        s += String.fromCharCode(((d[i] * 3 + d[i+1] * 6 + d[i+2]) / 10) | 0);
      o.empreinte = fnv(s);
    } catch(e){ o.empreinte = null; o.empreinte_motif = 'refusée : ' + (e.name || 'origine croisée'); }
    return o;
  };
  const opaque = c => c && c !== 'rgba(0, 0, 0, 0)' && c !== 'transparent';
  // ÉCART AU VOISIN. hydra-recette demande de comparer « l'écart entre blocs
  // voisins ». Calculé seulement quand quelqu'un y pense, il sort d'un run à l'autre,
  // sur le même écran, oui puis non. Une propriété qui dépend de l'attention n'est
  // pas une propriété mesurée.
  // On garde, PAR PARENT, la boîte du dernier élément retenu : les frères se
  // visitent dans l'ordre du document, et un enfant de frère ne brouille rien
  // puisque la table est indexée par parent.
  // PORTÉE. L'écart au FRÈRE ne vaut que pour qui en a un : une minorité sur la
  // page qui a servi de banc, les autres étant premiers retenus sous leur parent.
  // C'est pourquoi le décalage au PARENT l'accompagne — lui existe toujours, et il
  // couvre tous les éléments. Les deux répondent à des questions
  // différentes : « l'espace avant ce bloc a-t-il changé » pour le premier,
  // « ce bloc est-il à sa place dans son conteneur » pour le second.
  // Aucun des deux n'hérite de l'amont, et c'est tout l'objet : une ordonnée
  // absolue, elle, porte la somme de ce qui la précède — un en-tête trop court fait
  // remonter des positions justes.
  const dernier = new Map();
  const marche = el => {
    if(out.length >= ${plafond}) return;
    const r = el.getBoundingClientRect();
    if(r.width > 0 && r.height > 0){
      const cs = getComputedStyle(el);
      const txt = [...el.childNodes].filter(n => n.nodeType === 3)
        .map(n => n.textContent.replace(/\\s+/g, ' ').trim()).join(' ').trim();
      const media = /^(IMG|SVG|VIDEO|CANVAS|BUTTON|INPUT|SELECT|TEXTAREA)$/.test(el.tagName);
      const peint = opaque(cs.backgroundColor) || (parseFloat(cs.borderTopWidth) > 0 && opaque(cs.borderTopColor));
      if(txt || media || peint){
        const img = identite(el);
        const par = el.parentElement, av = par ? dernier.get(par) : null;
        // Le référentiel NATIF de la maquette est le parent : sa structure rend des
        // coordonnées relatives au parent. En le portant ici, les deux côtés cessent
        // de parler deux langues, et personne n'a plus à additionner des décalages
        // à la main pour fabriquer un absolu comparable.
        const pr = par ? par.getBoundingClientRect() : null;
        const rep = ancre(el);
        // PLACE SUR LA CAPTURE. Une boîte se lit au défilement 0 ; deux cas où elle ne
        // tombe pas là sur la capture pleine page, que l'annotation doit savoir : un
        // élément fixe ou collant (lui ou un ancêtre), et un élément dans un conteneur à
        // défilement interne (masqué ou décalé par lui). Champs posés seulement s'ils
        // valent : une page sans l'un ni l'autre ne les porte pas.
        // Défiler, c'est auto ou scroll (overlay se calcule en auto) sur l'axe qui déborde.
        // hidden et clip rognent sans faire défiler : l'élément reste où sa boîte le dit.
        // Par axe, parce qu'un seul axe déclaré hidden calcule l'autre en auto : un
        // débordement rogné en largeur ne fait pas un défilement en hauteur.
        let fixe = null, defilement = null;
        const defile = (o, plein, vu) => /(auto|scroll)/.test(o) && plein > vu + 1;
        for(let n = el; n && n.nodeType === 1 && n !== document.documentElement; n = n.parentElement){
          const s = n === el ? cs : getComputedStyle(n);
          if(s.position === 'fixed') fixe = 'fixed';            // fixe l'emporte sur collant
          else if(!fixe && s.position === 'sticky') fixe = 'sticky';
          if(!defilement && n !== el && n !== document.body
             && (defile(s.overflowX, n.scrollWidth, n.clientWidth) || defile(s.overflowY, n.scrollHeight, n.clientHeight)))
            defilement = chemin(n);
        }
        out.push({
          chemin: chemin(el), balise: el.tagName, texte: txt.slice(0, 120),
          ...(rep ? { repere: rep } : {}),
          ...(img ? { image: img } : {}),
          ...(fixe ? { fixe } : {}),
          ...(defilement ? { defilement } : {}),
          // INACTIF — un contrôle désactivé (disabled, aria-disabled, ou dans un groupe
          // désactivé) n'a pas l'état d'un contrôle actif en maquette : le garde le dit.
          ...((el.matches(':disabled') || el.closest('[aria-disabled="true"], fieldset:disabled')) ? { inactif: true } : {}),
          ...((av || pr) ? { ecart: {
                ...(av ? { avant_y: Math.round(r.top - av.bottom),
                           avant_x: Math.round(r.left - av.right) } : {}),
                ...(pr ? { parent_y: Math.round(r.top - pr.top),
                           parent_x: Math.round(r.left - pr.left) } : {}) } } : {}),
          x: Math.round(r.x), y: Math.round(r.y + scrollY),
          l: Math.round(r.width), h: Math.round(r.height),
          police: cs.fontFamily.split(',')[0].replace(/["']/g, ''),
          taille: cs.fontSize, graisse: cs.fontWeight, interligne: cs.lineHeight,
          couleur: cs.color, fond: cs.backgroundColor,
          marge: cs.margin, interieur: cs.padding,
          rayon: cs.borderRadius, bordure: cs.borderWidth + ' ' + cs.borderStyle + ' ' + cs.borderColor
        });
        if(par) dernier.set(par, r);
      }
    }
    for(const c of el.children) marche(c);
  };
  marche(document.body);
  // Un repère partagé ne désigne personne : sur le relevé de référence (voir
  // ANCRE), une part notable des éléments qui ont un repère le partagent — un
  // libellé d'accessibilité répété sur chaque lien, par exemple. On ne le
  // supprime pas, on le MARQUE : la ligne saura qu'elle doit le qualifier, et c'est
  // le seul cas où le chemin CSS a encore quelque chose à dire.
  const occ = new Map();
  for(const e of out) if(e.repere) occ.set(e.repere, (occ.get(e.repere) || 0) + 1);
  for(const e of out) if(e.repere && occ.get(e.repere) > 1) e.repere_partage = occ.get(e.repere);
  return JSON.stringify({
    coupe: out.length >= ${plafond},
    page: { l: document.documentElement.scrollWidth, h: document.documentElement.scrollHeight },
    // Signature de la MISE EN PAGE mesurée. Deux relevés du même écran pris dans
    // deux états n'ont pas la même : un décalage d'en-tête la change entièrement.
    empreinte: fnv(out.map(e => e.chemin + '|' + e.x + '|' + e.y + '|' + e.l + '|' + e.h).join(';')),
    // Ce relevé sait dire « fixe » et « défilement » : un relevé sans ce champ, non, et
    // l'annotation ne doit pas prendre son silence pour une absence.
    place_relevee: true,
    elements: out
  });
})()`;

// —— Constat d'état de page ————————————————————————————————————————————————
// Une surcouche qui barre le centre de l'écran n'est pas un détail de rendu : un
// en-tête collant peut ne pas avoir la même hauteur tant qu'une modale de
// consentement reste ouverte et une fois répondue. Mesurer sans le savoir, c'est
// rendre des hauteurs et des ordonnées d'un état que personne ne regarde, et un
// rapport faux.
// Le constat est GÉOMÉTRIQUE, jamais nominal : on demande à la page qui occupe
// son centre, et on remonte au premier ancêtre hors flux. Aucun domaine, aucun
// libellé, aucun sélecteur — la règle vaut sur n'importe quel site.
// Il ne rend JAMAIS « aucun » par défaut : une page sans surface interrogeable
// rend « indéterminé », qui est un fait, pas une absence de fait.
const ETAT = `(() => {
  ${OUTILS_PAGE}
  const vw = innerWidth, vh = innerHeight;
  if(!document.body || !vw || !vh || typeof document.elementFromPoint !== 'function')
    return JSON.stringify({ barrage: 'indéterminé',
      motif: 'la page n\\'offre pas de surface interrogeable' });
  const bodyFige = getComputedStyle(document.body).position === 'fixed';
  for(const [x, y] of [[vw / 2, vh * 0.35], [vw / 2, vh / 2], [vw / 2, vh * 0.65]]){
    const cible = document.elementFromPoint(x, y);
    if(!cible) continue;
    for(let n = cible; n && n !== document.body; n = n.parentElement){
      const cs = getComputedStyle(n);
      // Une surcouche en absolute compte quand la page a bloqué son défilement en
      // passant body en fixed : elle couvre alors l'écran comme une fixe (cas d'un
      // bandeau de consentement en mobile).
      if(cs.position !== 'fixed' && cs.position !== 'sticky'
         && !(cs.position === 'absolute' && bodyFige)) continue;
      const r = n.getBoundingClientRect();
      const couverture = (r.width * r.height) / (vw * vh);
      const auCentre = r.left <= vw / 2 && r.right >= vw / 2
                    && r.top <= vh / 2 && r.bottom >= vh / 2;
      if(auCentre && couverture >= ${COUVERTURE})
        return JSON.stringify({ barrage: 'présent', surcouche: {
          chemin: chemin(n), couverture: Math.round(couverture * 100) / 100,
          dialogue: !!(n.closest && n.closest('dialog[open]')) } });
    }
  }
  return JSON.stringify({ barrage: 'aucun' });
})()`;

// —— Mise en page, avant et après une levée ——————————————————————————————————
// Une levée VÉRIFIÉE dit que plus rien ne barre le centre ; elle ne dit pas que la
// page a quitté l'état que la surcouche lui imposait. Une surcouche qui contraint
// la mise en page peut disparaître sans que la page se remette en place — le
// relevé garde alors la contrainte. Le fait se constate sans rien nommer : les
// boîtes des enfants de body EN FLUX, et les dimensions de défilement. Identiques
// avant et après ⇒ la levée n'a pas touché la mise en page. C'est un FAIT inscrit,
// pas un verdict : une surcouche purement posée par-dessus donne le même.
const MISE_EN_PAGE = `(() => {
  if(!document.body) return null;
  const r = n => { const b = n.getBoundingClientRect();
    return [n.tagName, Math.round(b.left), Math.round(b.top + scrollY),
            Math.round(b.width), Math.round(b.height)].join(','); };
  const flux = [...document.body.children].filter(n => {
    const cs = getComputedStyle(n);
    return cs.display !== 'none' && cs.position !== 'fixed' && cs.position !== 'absolute';
  });
  const d = document.documentElement;
  return flux.map(r).join(';') + '|' + d.scrollWidth + 'x' + d.scrollHeight;
})()`;

// —— Captures, prises DANS LA SESSION QUI VIENT DE MESURER ————————————————————
// C'est tout l'objet de ce mode. Le DOM photographié EST celui qui vient d'être
// relevé : il n'y a plus deux états à rapprocher, donc plus de règle à tenir. Un
// second chargement, lui, ne se met d'accord avec le premier par aucune consigne.
// Le NOM DU FICHIER porte l'état. Une capture prise sur une page barrée s'appelle
// « x.barre.png » : le rapport qui la lie écrit le fait dans son propre texte, et
// l'oubli de déclarer l'état cesse d'être silencieux. C'est la seule trace que
// l'aval ne peut pas ne pas voir.
function suffixeEtat(etat){
  if(etat.barrage_au_releve === 'présent') return '.barre';
  if(etat.barrage_au_releve !== 'aucun')   return '.etat-indetermine';
  return '';
}

async function capturer(plan, releve, envoyer, sid, dossier, suffixe){
  fs.mkdirSync(path.resolve(dossier), { recursive: true });
  const faites = [];
  for(const c of plan){
    const clip = c.pleine
      ? { x: 0, y: 0, width: releve.page.l,
          height: Math.min(releve.page.h, c.h || releve.page.h), scale: 1 }
      : { x: c.x, y: c.y, width: c.l, height: c.h, scale: c.echelle || 2 };
    const r = await envoyer('Page.captureScreenshot',
      { format: 'png', captureBeyondViewport: true, clip }, sid);
    const d = r.result && r.result.data;
    if(!d){ faites.push({ nom: c.nom, fichier: null,
                          motif: 'capture refusée par le navigateur' }); continue; }
    const f = path.join(dossier, c.nom + suffixe + '.png');
    fs.writeFileSync(f, Buffer.from(d, 'base64'));
    faites.push({ nom: c.nom, fichier: path.relative(process.cwd(), f), clip });
  }
  return faites;
}

// —— Rattrapage d'empreinte ————————————————————————————————————————————————
// Le navigateur refuse de lire les pixels d'une image venue d'une AUTRE origine
// (canvas « teinté »). Or ce sont justement les assets de marque, servis par un
// CDN. Plutôt que de désactiver la sécurité du navigateur — ce qui changerait le
// rendu qu'on est en train de mesurer, donc une distorsion muette —, on récupère
// les octets depuis Node, sans navigateur et sans politique d'origine, et on les
// redonne à la page en `data:` — même origine, plus de refus. L'empreinte porte
// alors sur les PIXELS DÉCODÉS : comparable d'un côté à l'autre malgré des hôtes
// et des encodages différents. Un échec de récupération réécrit le MOTIF.
const PLAFOND_IMG = 40, POIDS_MAX = 8 * 1024 * 1024;

async function rattraperEmpreintes(releve, envoyer, sid){
  const aFaire = new Map();
  for(const e of releve.elements || []){
    const i = e.image;
    if(i && i.empreinte === null && i.source && /^https?:/i.test(i.source)
       && !aFaire.has(i.source) && aFaire.size < PLAFOND_IMG) aFaire.set(i.source, null);
  }
  if(!aFaire.size) return 0;
  for(const src of [...aFaire.keys()]){
    try {
      const ctrl = AbortSignal.timeout(8000);
      const rep = await fetch(src, { signal: ctrl });
      if(!rep.ok) { aFaire.set(src, { motif: 'HTTP ' + rep.status }); continue; }
      const buf = Buffer.from(await rep.arrayBuffer());
      if(buf.length > POIDS_MAX) { aFaire.set(src, { motif: 'trop volumineuse' }); continue; }
      const type = rep.headers.get('content-type') || 'image/png';
      const url = 'data:' + type.split(';')[0] + ';base64,' + buf.toString('base64');
      const expr = `(async () => { const im = new Image(); im.src = ${JSON.stringify(url)};
        await im.decode();
        const c = document.createElement('canvas'); c.width = 16; c.height = 16;
        const g = c.getContext('2d'); g.drawImage(im, 0, 0, 16, 16);
        const d = g.getImageData(0, 0, 16, 16).data; let s = '';
        for(let i = 0; i < d.length; i += 4) s += String.fromCharCode(((d[i]*3 + d[i+1]*6 + d[i+2]) / 10) | 0);
        let h = 0x811c9dc5;
        for(let i = 0; i < s.length; i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
        return (h >>> 0).toString(16).padStart(8, '0'); })()`;
      const r = await envoyer('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }, sid);
      const v = r.result && r.result.result && r.result.result.value;
      aFaire.set(src, v ? { empreinte: v } : { motif: 'décodage impossible' });
    } catch(e){ aFaire.set(src, { motif: 'récupération : ' + (e.name || 'échec') }); }
  }
  let n = 0;
  for(const e of releve.elements || []){
    const i = e.image; if(!i || i.empreinte !== null || !aFaire.has(i.source)) continue;
    const r = aFaire.get(i.source);
    if(r && r.empreinte){ i.empreinte = r.empreinte; i.empreinte_source = 'octets récupérés'; delete i.empreinte_motif; n++; }
    else if(r && r.motif) i.empreinte_motif = i.empreinte_motif + ' · rattrapage : ' + r.motif;
  }
  return n;
}

async function releverPage(nav, o){
  const cible = /^[a-z]+:\/\//i.test(o.url) ? o.url : 'file://' + path.resolve(o.url);
  return session(nav, async ({ envoyer, sid, evenements }) => {
    await envoyer('Emulation.setDeviceMetricsOverride', {
      width: o.largeur, height: o.hauteur || (o.mobile ? 844 : 900),
      deviceScaleFactor: o.mobile ? 2 : 1, mobile: !!o.mobile }, sid);
    // Une navigation qui échoue ne lève RIEN : Chrome sert sa propre page d'erreur,
    // qui se mesure comme n'importe quelle page. Sans ce garde, une URL injoignable
    // rendrait un relevé de quelques éléments et un code 0 — un build réputé recetté qui
    // ne l'est pas. Deux témoins : l'erreur rendue par la navigation, et l'URL
    // effectivement chargée, que Chrome remplace par un schéma d'erreur.
    const nav0 = await envoyer('Page.navigate', { url: cible }, sid);
    if(nav0.result && nav0.result.errorText)
      throw new Error('navigation refusée (' + nav0.result.errorText + ') — rien n\'est écrit');
    const t0 = Date.now();
    while(Date.now() - t0 < ATTENTE_MS && !evenements.some(e => e.method === 'Page.loadEventFired'))
      await new Promise(r => setTimeout(r, 150));
    await new Promise(r => setTimeout(r, REPOS_MS));
    const ou = await envoyer('Runtime.evaluate',
      { expression: 'location.href', returnByValue: true }, sid);
    const href = ou.result && ou.result.result && ou.result.result.value;
    if(typeof href === 'string' && /^(chrome-error|chrome:)/.test(href))
      throw new Error('la page n\'a pas chargé (' + href + ') — rien n\'est écrit');
    // On CONSTATE, on tente de lever par des moyens portables, on RE-CONSTATE.
    // Jamais de présomption : le fait inscrit au relevé est celui d'APRÈS l'action.
    const constater = async () => {
      const e = await envoyer('Runtime.evaluate', { expression: ETAT, returnByValue: true }, sid);
      const w = e.result && e.result.result && e.result.result.value;
      return w ? JSON.parse(w)
               : { barrage: 'indéterminé', motif: 'la page n\'a pas répondu au constat' };
    };
    const avant = await constater();
    const etat = { barrage_initial: avant.barrage, surcouche: avant.surcouche || null,
                   motif: avant.motif || null, fermeture: null,
                   barrage_au_releve: avant.barrage };
    const miseEnPage = async () => {
      const e = await envoyer('Runtime.evaluate', { expression: MISE_EN_PAGE, returnByValue: true }, sid);
      return (e.result && e.result.result && e.result.result.value) || null;
    };
    if(avant.barrage === 'présent'){
      const tentees = [];
      const mepAvant = await miseEnPage();
      // 1. Un <dialog> ouvert se ferme par son propre contrat — sans libellé.
      const d = await envoyer('Runtime.evaluate', { expression:
        `(() => { const d = document.querySelector('dialog[open]');
           if(!d || typeof d.close !== 'function') return false; d.close(); return true; })()`,
        returnByValue: true }, sid);
      if(d.result && d.result.result && d.result.result.value === true) tentees.push('dialog.close()');
      // 2. Échap en frappe RÉELLE : un KeyboardEvent fabriqué en page n'est pas
      //    de confiance, et une surcouche a raison de l'ignorer.
      for(const type of ['rawKeyDown', 'keyUp'])
        await envoyer('Input.dispatchKeyEvent', { type, key: 'Escape', code: 'Escape',
          windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27 }, sid);
      tentees.push('Échap');
      await new Promise(r2 => setTimeout(r2, REPOS_FERM));
      let apres = await constater();
      // 3. En dernier recours seulement, le sélecteur que l'OPÉRATEUR a fourni.
      //    Il vit sur la ligne de commande, jamais dans le code : aucun site
      //    particulier n'entre ici, et son effet est re-constaté comme le reste.
      if(apres.barrage === 'présent' && o.fermer){
        const c = await envoyer('Runtime.evaluate', { expression:
          `(() => { const c = document.querySelector(${JSON.stringify(o.fermer)});
             if(!c) return 'introuvable'; c.click(); return 'cliqué'; })()`,
          returnByValue: true }, sid);
        tentees.push('sélecteur fourni : '
          + ((c.result && c.result.result && c.result.result.value) || 'échec'));
        await new Promise(r2 => setTimeout(r2, REPOS_FERM));
        apres = await constater();
      }
      const mepApres = await miseEnPage();
      etat.fermeture = { tentees, verifiee: apres.barrage === 'aucun',
        // Faute de constat d'un côté ou de l'autre : « indéterminée », jamais « inchangée ».
        mise_en_page: !mepAvant || !mepApres ? 'indéterminée'
                    : mepAvant === mepApres ? 'inchangée' : 'modifiée' };
      etat.barrage_au_releve = apres.barrage;
      if(apres.barrage !== 'aucun') etat.surcouche = apres.surcouche || etat.surcouche;
    }
    const r = await envoyer('Runtime.evaluate',
      { expression: EXTRACTION(PLAFOND), returnByValue: true }, sid);
    const v = r.result && r.result.result && r.result.result.value;
    if(!v) throw new Error('la page n\'a rien rendu de mesurable (injoignable, vide, ou bloquée)');
    const releve = JSON.parse(v);
    releve.etat = etat;
    releve.empreintes_rattrapees = await rattraperEmpreintes(releve, envoyer, sid);
    if(o.plan) releve.captures = await capturer(o.plan, releve, envoyer, sid,
                                                o.dossier, suffixeEtat(etat));
    return releve;
  });
}

// —— Recensement des couleurs d'une capture ——————————————————————————————————
// Chrome décode le PNG dans un canvas : la teinte rendue est EXACTE, donc
// confrontable au catalogue de tokens même sans URL.
const RECENSEMENT = f => `(async () => {
  const im = new Image(); im.src = ${JSON.stringify('file://' + f)};
  await im.decode();
  const c = document.createElement('canvas');
  c.width = im.naturalWidth; c.height = im.naturalHeight;
  c.getContext('2d').drawImage(im, 0, 0);
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  const n = new Map();
  for(let i = 0; i < d.length; i += 4){
    if(d[i+3] < 250) continue;
    const k = d[i] + ',' + d[i+1] + ',' + d[i+2];
    n.set(k, (n.get(k) || 0) + 1);
  }
  const hex = k => '#' + k.split(',').map(x => (+x).toString(16).padStart(2, '0')).join('');
  return JSON.stringify({
    page: { l: c.width, h: c.height }, teintes_distinctes: n.size,
    couleurs: [...n.entries()].sort((a, b) => b[1] - a[1]).slice(0, 40)
      .map(([k, px]) => ({ hex: hex(k), pixels: px }))
  });
})()`;

async function releverImage(nav, o){
  const f = path.resolve(o.image);
  if(!fs.existsSync(f)) mourir('capture introuvable : ' + o.image);
  return session(nav, async ({ envoyer, sid }) => {
    await envoyer('Page.navigate', { url: 'file:///' }, sid);
    await new Promise(r => setTimeout(r, 400));
    const r = await envoyer('Runtime.evaluate',
      { expression: RECENSEMENT(f), awaitPromise: true, returnByValue: true }, sid);
    const v = r.result && r.result.result && r.result.result.value;
    if(!v) throw new Error('la capture n\'a pas pu être décodée');
    return JSON.parse(v);
  });
}

// —— Captures annotées pour le dev ————————————————————————————————————————————
// `--annoter <livrable.md>` : une image par section du livrable, recadrée dans la
// capture du build prise PAR CE RELEVÉ (même session que les boîtes), avec un marqueur
// numéroté au numéro de la ligne sur chaque boîte que la ligne désigne (une boîte que
// plusieurs lignes désignent porte un seul badge, à tous leurs numéros). La ligne dit son
// élément en source, `<!--r:N-->` (index au relevé, ou chemin complet ; plusieurs boîtes :
// `<!--r:N,M-->`). Aucune boîte n'est devinée : sans identifiant, pas de marqueur, et la
// raison se dit. Ce qui ne se marque pas, et pourquoi, s'écrit dans
// `.mesures/annotations.json` et sur la sortie — jamais un silence :
// (recette desktop + mobile : le relevé d'un device vit dans `.mesures/<device>/` ; avec
// `--releve` qui le désigne, seules les sous-parties « ### <Device> » s'annotent, et le
// bilan s'écrit à côté du relevé, dans le dossier du device)
//   - élément absent du build : pas de marqueur, sa ligne dit « absent » ;
//   - pas d'identifiant, ou identifiant introuvable au relevé ;
//   - élément fixe (lui ou un ancêtre) : sa place sur la capture pleine page n'est pas
//     celle de sa boîte — un collant, lui, y est à sa place de flux ;
//   - élément dans un conteneur à défilement interne : masqué ou décalé par lui ;
//   - boîte hors de la capture.
// Facteur d'échelle : largeur de l'image sur largeur capturée (1 en desktop, 2 en mobile) ;
// l'image de maquette n'est pas annotée. Rendu : Chrome, la capture en fond d'une page,
// les marqueurs par-dessus — aucune dépendance.
function taillePng(f){
  const b = fs.readFileSync(f);
  if(b.slice(1, 4).toString() !== 'PNG') throw new Error('pas un PNG : ' + f);
  return { l: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}
// Identifiants de ligne d'une case Élément : TOUS ses commentaires `<!--r:…-->`, chacun
// un index au relevé, un chemin complet, ou une liste à virgules. `.*?` et non `[^>]*?` :
// un chemin porte des « > ». Une définition, deux lecteurs : les marqueurs ici, le garde
// (dérive calculée sans ligne), qui l'importe — une copie divergerait.
const idsLigne = c => [...c.matchAll(/<!--r:(.*?)-->/g)]
  .flatMap(m => m[1].split(',')).map(s => s.trim()).filter(Boolean);
// Une section par zone « ## » ; une zone qui porte des sous-parties « ### » (recette
// desktop + mobile : « ### Desktop », « ### Mobile ») donne une section par sous-partie,
// intitulée « <sous-partie> — <zone> » : une capture annotée par device et par zone.
function lireLivrable(t){
  const sections = []; let cur = null, zone = null;
  for(const l of t.split('\n')){
    const h = /^##\s+(.*)$/.exec(l), h3 = /^###\s+(.*)$/.exec(l);
    if(h){ zone = h[1].trim(); cur = { titre: zone, lignes: [] }; sections.push(cur); continue; }
    if(h3 && zone){ cur = { titre: h3[1].trim() + ' — ' + zone, lignes: [] }; sections.push(cur); continue; }
    const m = /^\|\s*(\d+)\s*\|([^|]*)\|[^|]*\|[^|]*\|([^|]*)\|/.exec(l);
    if(m && cur){
      const ids = idsLigne(m[2]);
      cur.lignes.push({ n: +m[1], ids, absent: /(^|[^\p{L}])absente?s?([^\p{L}]|$)/iu.test(m[3]) });
    }
  }
  return sections;
}
const slug = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'section';
async function annoter(nav, o){
  const liv = path.resolve(o.annoter);
  const sujet = path.basename(path.dirname(liv)) === '.src' ? path.dirname(path.dirname(liv)) : path.dirname(liv);
  const releveF = o.releve ? path.resolve(o.releve) : path.join(sujet, '.mesures', 'build.json');
  const device = path.basename(path.dirname(path.dirname(releveF))) === '.mesures'
    ? path.basename(path.dirname(releveF)) : null;
  let releve; try { releve = JSON.parse(fs.readFileSync(releveF, 'utf8')); }
  catch(e){ mourir('relevé du build illisible (' + releveF + ') : ' + e.message); }
  const cap = (releve.captures || []).find(c => c.fichier && c.nom === 'page-entiere')
           || (releve.captures || []).find(c => c.fichier && c.clip && c.clip.x === 0 && c.clip.y === 0);
  if(!cap) mourir('le relevé ne porte aucune capture pleine page — rien à annoter (relancer le relevé avec --dossier)');
  const capF = [cap.fichier, path.join(sujet, 'refs', path.basename(cap.fichier))]
    .map(p => path.resolve(p)).find(p => fs.existsSync(p));
  if(!capF) mourir('capture introuvable : ' + cap.fichier);
  const img = taillePng(capF);
  const f = img.l / ((cap.clip && cap.clip.width) || releve.page.l);
  const capH = img.h / f;                               // hauteur capturée, en px CSS
  const els = releve.elements || [];
  const trouver = id => /^\d+$/.test(id) ? els[+id] : els.find(e => e.chemin === id);
  const dossier = path.resolve(o.dossier || path.join(sujet, 'refs'));
  fs.mkdirSync(dossier, { recursive: true });
  const sections = lireLivrable(fs.readFileSync(liv, 'utf8'))
    .filter(s => !device || slug(s.titre) === device || slug(s.titre).startsWith(device + '-'));
  if(device && !sections.length) mourir('aucune sous-partie « ### ' + device + ' » au livrable — rien à annoter pour ce device');
  const bilan = { livrable: path.relative(sujet, liv), capture: path.relative(sujet, capF), facteur: f,
    ...(releve.place_relevee ? {} : { avertissement: 'relevé antérieur au repérage des éléments fixes, '
      + 'collants et en défilement interne : leurs marqueurs peuvent être décalés' }), images: [] };
  const plans = [];
  sections.forEach((s, i) => {
    const marqueurs = [], nonMarquables = [];
    for(const l of s.lignes){
      if(!l.ids.length){ nonMarquables.push({ n: l.n, raison: l.absent ? 'absent du build' : 'sans identifiant du relevé' }); continue; }
      const boites = [];
      for(const id of l.ids){
        const e = trouver(id);
        if(!e){ nonMarquables.push({ n: l.n, raison: 'identifiant introuvable au relevé : ' + id }); continue; }
        // Collant : au défilement 0, il est à sa place dans le flux — la capture pleine page
        // le montre là. Fixe : la capture agrandit la fenêtre, un élément ancré en bas part
        // en bas de page ; sa boîte ne dit plus où il est.
        if(e.fixe === 'fixed'){ nonMarquables.push({ n: l.n, raison: 'élément fixe : sa place sur la capture pleine page n\'est pas celle de sa boîte' }); continue; }
        if(e.defilement){ nonMarquables.push({ n: l.n, raison: 'dans un conteneur à défilement interne (' + e.defilement + ')' }); continue; }
        if(e.x < 0 || e.y < 0 || e.x + e.l > releve.page.l + 0.5 || e.y + e.h > capH + 0.5){ nonMarquables.push({ n: l.n, raison: 'boîte hors de la capture' }); continue; }
        boites.push([e.x, e.y, e.l, e.h]);
      }
      if(boites.length) marqueurs.push({ n: l.n, boites });
    }
    const nn = String(i + 1).padStart(2, '0');
    const entree = { section: s.titre, lignes: s.lignes.length, marqueurs, non_marquables: nonMarquables };
    if(marqueurs.length){
      // Une boîte que plusieurs lignes désignent se dessine une fois, sous UN badge qui
      // porte tous ses numéros : un badge par ligne s'empilerait au même point, et seul le
      // dernier se lirait. « Même boîte » se juge sur le rectangle à l'échelle de l'image,
      // au pixel près — pas sur l'identifiant : un index et un chemin nomment le même
      // élément, deux éléments emboîtés partagent un rectangle. Ordre de dessin : celui de
      // la première apparition, celui des lignes quand rien n'est partagé.
      const groupes = new Map();
      for(const m of marqueurs) for(const b of m.boites){
        const k = b.map(v => Math.round(v * f)).join(',');
        if(!groupes.has(k)) groupes.set(k, { boite: b, numeros: [] });
        if(!groupes.get(k).numeros.includes(m.n)) groupes.get(k).numeros.push(m.n);
      }
      entree.badges = [...groupes.values()].map(g => ({ ...g, numeros: g.numeros.sort((a, b) => a - b) }));
      const ys = marqueurs.flatMap(m => m.boites.flatMap(b => [b[1], b[1] + b[3]]));
      const y0 = Math.max(0, Math.floor(Math.min(...ys) * f) - 40), y1 = Math.min(img.h, Math.ceil(Math.max(...ys) * f) + 40);
      entree.fichier = path.relative(sujet, path.join(dossier, 'annot-' + nn + '-' + slug(s.titre) + '.png'));
      entree.recadrage = { y0, h: y1 - y0 };
      plans.push({ entree, y0, h: y1 - y0 });
    }
    bilan.images.push(entree);
  });
  if(plans.length) await session(nav, async ({ envoyer, sid, evenements }) => {
    for(const p of plans){
      const box = p.entree.badges.map(({ boite: b, numeros }) => {
        const x = b[0] * f, y = b[1] * f - p.y0, l = b[2] * f, h = b[3] * f;
        return `<div class="b" style="left:${x}px;top:${y}px;width:${l}px;height:${h}px"></div>`
          + `<div class="n" style="left:${Math.max(0, x - 14)}px;top:${Math.max(0, y - 14)}px">${numeros.join('·')}</div>`;
      }).join('');
      const page = path.join(os.tmpdir(), 'hydra-annot-' + process.pid + '.html');
      fs.writeFileSync(page, `<!doctype html><meta charset="utf-8"><style>html,body{margin:0}`
        + `#c{position:relative;width:${img.l}px;height:${p.h}px;background:url("file://${capF}") 0 -${p.y0}px no-repeat}`
        // Contour DANS la boîte (bordure, box-sizing) : ses bords sont ceux de l'élément.
        + `.b{position:absolute;border:2px solid #e6007e;box-sizing:border-box}`
        + `.n{position:absolute;min-width:24px;height:24px;padding:0 4px;box-sizing:border-box;border-radius:12px;background:#e6007e;color:#fff;font:bold 13px/24px sans-serif;text-align:center;white-space:nowrap}`
        + `</style><div id="c">${box}</div>`);
      await envoyer('Emulation.setDeviceMetricsOverride', { width: img.l, height: p.h, deviceScaleFactor: 1, mobile: false }, sid);
      evenements.length = 0;
      await envoyer('Page.navigate', { url: 'file://' + page }, sid);
      const t0 = Date.now();
      while(Date.now() - t0 < ATTENTE_MS && !evenements.some(e => e.method === 'Page.loadEventFired'))
        await new Promise(r => setTimeout(r, 100));
      await new Promise(r => setTimeout(r, 300));
      const r = await envoyer('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true,
        clip: { x: 0, y: 0, width: img.l, height: p.h, scale: 1 } }, sid);
      try { fs.unlinkSync(page); } catch(e){}
      if(!(r.result && r.result.data)){ p.entree.fichier = null; p.entree.motif = 'rendu refusé par le navigateur'; continue; }
      fs.writeFileSync(path.join(sujet, p.entree.fichier), Buffer.from(r.result.data, 'base64'));
    }
  });
  const sortie = device ? path.join(path.dirname(releveF), 'annotations.json') : path.join(sujet, '.mesures', 'annotations.json');
  fs.mkdirSync(path.dirname(sortie), { recursive: true });
  fs.writeFileSync(sortie, JSON.stringify(bilan, null, 1));
  const lignes = bilan.images.map(e => '§ ' + e.section + ' — '
    + (e.fichier ? e.marqueurs.length + ' marqueur(s)'
        + (e.badges.some(b => b.numeros.length > 1) ? ' (badge partagé : '
          + [...new Set(e.badges.filter(b => b.numeros.length > 1).map(b => b.numeros.join('·')))].join(', ') + ')' : '')
        + ' → lier en tête de section : [Capture annotée](' + e.fichier + ')'
                 : (e.motif || (e.lignes ? 'aucune ligne marquable, pas d\'image' : 'aucune ligne, pas d\'image')))
    + (e.non_marquables.length ? ' · non marqué(s) : ' + e.non_marquables.map(x => 'n°' + x.n + ' (' + x.raison + ')').join(', ') : ''));
  process.stdout.write(path.relative(process.cwd(), sortie) + (bilan.avertissement ? '\n⚠ ' + bilan.avertissement : '')
    + '\n' + lignes.join('\n') + '\n');
}

// Pilotage partagé : la galerie charge ses cadres dans la même session CDP, sans copie.
// Lecture partagée : le garde lit les identifiants de ligne par idsLigne.
module.exports = { session, trouverNavigateur, idsLigne };

// —— Programme ————————————————————————————————————————————————————————————————
if(require.main === module) (async () => {
  const o = args();
  if(o.annoter){
    const nav = trouverNavigateur();
    if(!nav) mourir('aucun navigateur trouvé (définir HYDRA_BROWSER) — aucune image annotée');
    await annoter(nav, o); process.exit(0);
  }
  if(!o.url && !o.image)
    mourir('usage : --url <url|fichier> [--largeur 1440] [--mobile] [--sortie f.json]\n'
         + '                [--dossier <rép.>] [--captures <plan.json>] [--fermer <sélecteur>]\n'
         + '        --image <capture.png> [--sortie f.json]\n'
         + '        --annoter <livrable.md> [--releve build.json] [--dossier <rép.>]');
  if(o.url && o.image) mourir('--url et --image s\'excluent : un relevé, une source');
  if(o.captures && !o.dossier) mourir('--captures demande --dossier <répertoire> — où écrire ne se devine pas');
  // Recette desktop + mobile : le relevé d'un device va dans `.mesures/<device>/`, ses
  // captures dans un dossier du même nom. Deux devices photographiés dans le même dossier
  // portent les mêmes noms de fichiers : le second écraserait le premier, et l'annotation
  // du premier se ferait sur l'image du second.
  const deviceSortie = o.sortie && path.basename(path.dirname(path.dirname(path.resolve(o.sortie)))) === '.mesures'
    ? path.basename(path.dirname(path.resolve(o.sortie))) : null;
  if(deviceSortie && o.dossier && path.basename(path.resolve(o.dossier)) !== deviceSortie)
    mourir('relevé du device « ' + deviceSortie + ' » : ses captures vont dans un dossier du même nom '
      + '(--dossier <sujet>/refs/' + deviceSortie + ') — sinon celles de l\'autre device les écrasent');
  if(o.dossier){
    if(!o.url) mourir('--dossier demande --url : on ne photographie pas une capture');
    if(o.captures){
      try { o.plan = JSON.parse(fs.readFileSync(o.captures, 'utf8')); }
      catch(e){ mourir('plan de captures illisible (' + o.captures + ') : ' + e.message); }
      if(!Array.isArray(o.plan) || !o.plan.length) mourir('le plan de captures est vide');
      for(const c of o.plan){
        if(!c || !c.nom) mourir('une entrée du plan n\'a pas de nom');
        if(!c.pleine && ![c.x, c.y, c.l, c.h].every(n => Number.isFinite(n)))
          mourir('entrée « ' + c.nom + ' » : il faut pleine:true, ou x, y, l et h');
      }
    } else {
      // PLAN FACULTATIF, ET C'EST VOULU. Les coordonnées d'une zone se lisent dans
      // le relevé : exiger un plan au premier passage, ce serait le faire improviser
      // — un fichier jetable à la place d'un script jetable. Sans plan, la page
      // entière, qui est le besoin de toute recette. Le plan de zones se garde à la
      // racine du sujet (jamais dans .mesures/, régénérable et ignoré de git) et se
      // réutilise aux recettes suivantes du même écran.
      o.plan = [{ nom: 'page-entiere', pleine: true }];
    }
  }
  const nav = trouverNavigateur();
  if(!nav) mourir('aucun navigateur trouvé (définir HYDRA_BROWSER) — rien n\'est écrit');

  const t0 = Date.now();
  const releve = o.image ? await releverImage(nav, o) : await releverPage(nav, o);
  releve.source = o.image ? { mode: 'capture', fichier: o.image }
                          : { mode: 'page', cible: o.url, largeur: o.largeur, mobile: o.mobile };
  releve.releve_le = new Date().toISOString();

  const sortie = o.sortie || path.join(process.cwd(), 'releve-'
    + (o.image ? 'capture' : 'page') + '-' + Date.now() + '.json');
  fs.mkdirSync(path.dirname(path.resolve(sortie)), { recursive: true });
  fs.writeFileSync(sortie, JSON.stringify(releve, null, 1));

  const n = releve.elements ? releve.elements.length : releve.couleurs.length;
  process.stdout.write(sortie + ' — ' + n + (releve.elements ? ' éléments' : ' teintes')
    + ' en ' + Math.round((Date.now() - t0) / 100) / 10 + ' s'
    + (releve.coupe ? ' (COUPÉ au plafond de ' + PLAFOND + ')' : '')
    + (releve.captures ? ' · ' + releve.captures.filter(c => c.fichier).length
        + '/' + releve.captures.length + ' captures' : '')
    + (releve.etat && releve.etat.barrage_au_releve !== 'aucun'
        ? ' · ÉTAT : page ' + (releve.etat.barrage_au_releve === 'présent'
            ? 'BARRÉE' : 'INDÉTERMINÉE') + ' au relevé'
          + (releve.etat.fermeture
              ? ' (fermeture tentée : ' + releve.etat.fermeture.tentees.join(', ') + ')' : '')
        : '')
    + (releve.etat && releve.etat.fermeture && releve.etat.fermeture.verifiee
       && releve.etat.fermeture.mise_en_page !== 'modifiée'
        ? ' · LEVÉE ' + (releve.etat.fermeture.mise_en_page === 'inchangée'
            ? 'SANS EFFET sur la mise en page — si la surcouche la contraignait, le relevé garde la contrainte'
            : 'à l\'effet INDÉTERMINÉ sur la mise en page')
        : '')
    + '\n');
  process.exit(0);
})().catch(e => mourir(e && e.message ? e.message : String(e)));
