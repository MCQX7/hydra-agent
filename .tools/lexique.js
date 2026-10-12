'use strict';
/* Les mots des livrables que les outils reconnaissent, en français et en anglais.
   Les livrables suivent la langue de la mission (CLAUDE.md § Sorties) : leurs gabarits sont
   écrits en français, et la ligne « En anglais » sous chacun donne la forme anglaise de ses
   titres et libellés. Ce fichier est la SEULE source de ces mots pour les outils : un titre
   écrit ici est reconnu dans les deux langues, un titre absent d'ici n'est reconnu dans
   aucune. tests/langues.sh vérifie que chaque forme française est bien dans le gabarit de
   sa tête, et que la ligne « En anglais » de cette tête donne la même forme anglaise —
   renommer un titre d'un côté seulement fait échouer le test, au lieu de rendre un
   contrôle aveugle sans rien dire.
   Une entrée : la tête dont le gabarit porte le mot (null : mot propre aux outils), puis
   la forme française, puis l'anglaise ; une liste quand un contrôle admet plusieurs formes
   (la première est celle du gabarit). */

const M = (tete, fr, en) => ({ tete, fr: [].concat(fr), en: [].concat(en) });
const MOTS = {
  // Noms des livrables (CLAUDE.md § Sorties)
  fiche:          M(null, '01-fiche', '01-topic-sheet'),
  rapport:        M(null, '02-rapport', '02-report'),
  recherche:      M(null, '02-recherche', '02-research'),
  brief:          M(null, '03-brief', '03-brief'),

  // Fiche de sujet (hydra-cortex)
  titreFiche:     M('hydra-cortex', 'Fiche de sujet', 'Topic sheet'),
  rendus:         M('hydra-cortex', 'Rendus', 'Renders'),
  nonNegociables: M('hydra-cortex', 'Non-négociables', 'Non-negotiables'),

  // Rapport (hydra-audit, complété par hydra-ideation)
  titreRapport:   M('hydra-audit', 'Audit', 'Audit'),
  benchmark:      M('hydra-audit', 'Benchmark', 'Benchmark'),
  benchAppui:     M('hydra-audit', 'research en appui', 'backed by research'),
  benchSans:      M('hydra-audit', 'produit sans research', 'produced without research'),
  benchAucun:     M('hydra-audit', 'aucun', 'none'),
  reperes:        M('hydra-audit', 'Repères', 'Key'),
  questions:      M('hydra-audit', 'Questions de cadrage non résolues', 'Unresolved framing questions'),
  resume:         M('hydra-audit', 'Résumé exécutif', 'Executive summary'),
  signalPorteur:  M('hydra-audit', 'Signal porteur', 'Lead signal'),
  constats:       M('hydra-audit', 'Constats priorisés', 'Prioritized findings'),
  colSources:     M('hydra-audit', 'Sources', 'Sources'),
  colConfiance:   M('hydra-audit', 'Confiance', 'Confidence'),
  confHaute:      M('hydra-audit', 'Haute', 'High'),
  confMoyenne:    M('hydra-audit', 'Moyenne', 'Medium'),
  confFaible:     M('hydra-audit', ['Faible', 'Basse'], 'Low'),
  ecarteDeLigne:  M('hydra-audit', 'écarté :', 'discarded:'),
  tensions:       M('hydra-audit', ['Tensions relevées', 'Tension', 'Conflit'], ['Tensions noted', 'Tension', 'Conflict']),
  hypotheses:     M('hydra-audit', 'Hypothèses de design', 'Design hypotheses'),
  origine:        M('hydra-audit', 'Origine', 'Origin'),
  tagInput:       M('hydra-audit', '[input]', '[input]'),
  tagDerive:      M('hydra-audit', '[dérivé]', '[derived]'),
  tagAnalyse:     M('hydra-audit', '[analyse]', '[analysis]'),
  direction:      M('hydra-audit', 'Direction recommandée', 'Recommended direction'),
  fondeSur:       M('hydra-audit', 'Fondé sur', 'Based on'),
  actions:        M('hydra-audit', 'Actions', 'Actions'),
  cranMesure:     M('hydra-audit', ['mesuré', 'mesure'], 'measured'),
  cranEtabli:     M('hydra-audit', ['établi', 'etabli'], 'established'),
  cranForte:      M('hydra-audit', 'forte amplitude', 'high amplitude'),
  cranFaible:     M('hydra-audit', 'faible amplitude', 'low amplitude'),
  horsCoord:      M('hydra-audit', ['coordonnées non comparables', 'coordonnees non comparables'], 'coordinates not comparable'),
  nonExploite:    M('hydra-audit', 'non exploité', 'not used'),
  ecartes:        M('hydra-audit', 'Écartés', 'Discarded'),
  // Les contrôles lisent le début du titre : « Pistes » seul, ou suivi d'un complément.
  pistes:         M('hydra-ideation', ['Pistes explorées', 'Pistes'], ['Options explored', 'Options']),
  ancrage:        M('hydra-ideation', 'Ancrage', 'Grounding'),
  // Objections hors autorité d'une piste (hydra-cortex, clôture ; énumérées par l'idéation)
  objCapacite:    M('hydra-ideation', 'capacité non établie', 'capability not established'),
  objDecision:    M('hydra-ideation', 'décision produit', 'product decision'),
  objArbitrage:   M(null, 'arbitrage produit', 'product call'),
  objNonNego:     M('hydra-ideation', 'non-négociable du contexte à trancher', 'context non-negotiable to settle'),

  // Recherche (hydra-research)
  titreRecherche: M('hydra-research', 'Research', 'Research'),

  // Brief d'exploration (hydra-maquette)
  titreBrief:     M('hydra-maquette', "Brief d'exploration", 'Exploration brief'),
  manquesDS:      M('hydra-maquette', 'Manques du design system', 'Design system gaps'),
  chrome:         M('hydra-maquette', 'Source du chrome', 'Chrome source'),
  socle:          M('hydra-maquette', 'Socle observé', 'Observed base'),
  lie:            M('hydra-maquette', 'lié', 'linked'),
  ecarte:         M('hydra-maquette', 'écarté', 'discarded'),
  refuse:         M('hydra-maquette', 'refusé', 'refused'),
  aucunEcran:     M('hydra-maquette', 'aucun écran existant', 'no existing screen'),
  latitude:       M('hydra-maquette', 'Latitude créative', 'Creative latitude'),

  // Recette (hydra-recette)
  titreRecette:   M('hydra-recette', 'Recette', 'Design QA'),
  maquette:       M('hydra-recette', 'Maquette', 'Design'),
  corrections:    M('hydra-recette', ['corrections', 'correction'], ['corrections', 'correction']),
  majeures:       M('hydra-recette', 'majeures', 'major'),
  mineures:       M('hydra-recette', 'mineures', 'minor'),
  majeur:         M('hydra-recette', 'Majeur', 'Major'),
  mineur:         M('hydra-recette', 'Mineur', 'Minor'),
  bloquant:       M(null, 'Bloquant', 'Blocking'),
  colElement:     M('hydra-recette', 'Élément', 'Element'),
  nonRecettable:  M('hydra-recette', 'non recettable', 'not reviewable'),
  absent:         M('hydra-recette', 'absent', 'missing'),

  // Contexte (modèles de l'accueil) : ce que le bilan lit dans mission.md
  outils:         M('hydra-accueil', 'Outils de la mission', 'Mission tools'),
};

// Propriétés d'une ligne de recette → la clé du relevé du build (hydra-qa-gate, CLES).
// Le gabarit de la recette les nomme dans sa ligne « En anglais ».
const PROPRIETES = {
  taille: ['taille', 'size', 'font size', 'font-size'], couleur: ['couleur', 'couleur du texte', 'couleur texte', 'color', 'colour', 'text color', 'text colour'],
  fond: ['fond', 'background'], graisse: ['graisse', 'weight', 'font weight', 'font-weight'],
  interligne: ['interligne', 'line height', 'line-height'], police: ['police', 'font', 'font family', 'font-family'],
  rayon: ['rayon', 'radius', 'border radius', 'border-radius'], hauteur: ['hauteur', 'height'], largeur: ['largeur', 'width'],
  dimensions: ['dimensions', 'size (w × h)'], bordure: ['bordure', 'border'],
  interieur: ['marge interne', 'padding', 'interieur', 'intérieur'], texte: ['libellé', 'texte', 'wording', 'label', 'text', 'copy'],
};

const escRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// Toutes les formes d'un mot, en alternance d'expression régulière (échappées).
function alt(cle){
  const m = MOTS[cle]; if(!m) throw new Error('lexique : mot inconnu « ' + cle + ' »');
  return [...new Set([...m.fr, ...m.en])].map(escRe).join('|');
}
// Une expression qui reconnaît le mot sous toutes ses formes : avant + (formes) + après.
const re = (cle, avant = '', apres = '', drapeaux = '') => new RegExp(avant + '(?:' + alt(cle) + ')' + apres, drapeaux);
// Le livrable `cle` (fiche, rapport, recherche, brief) reconnu à son nom de fichier.
const estLivrable = (cle, p) => re(cle, '(^|/)', '\\.md$', 'i').test(String(p || '').replace(/\\/g, '/'));
// Les noms possibles d'un livrable, pour le lire sur le disque (`.src/<nom>.md`).
const nomsLivrable = cle => [...new Set([...MOTS[cle].fr, ...MOTS[cle].en])].map(n => n + '.md');

// La langue d'un livrable : celle de ses titres. Les formes anglaises reconnues contre les
// françaises ; à égalité ou sans titre reconnu, le français, langue par défaut.
function langue(md){
  const titres = String(md || '').split('\n').filter(l => /^#{1,6}\s|^\*\*[^*]+\*\*/.test(l)).join('\n');
  let fr = 0, en = 0;
  for(const m of Object.values(MOTS)){
    if(!m.tete) continue;
    const f = m.fr.filter(x => !m.en.includes(x)), e = m.en.filter(x => !m.fr.includes(x));
    if(f.some(x => titres.includes(x))) fr++;
    if(e.some(x => titres.includes(x))) en++;
  }
  return en > fr ? 'en' : 'fr';
}
// La langue d'un sujet : celle de sa fiche, à défaut de son rapport, puis de son brief.
function langueSujet(sujetDir){
  const fs = require('fs'), path = require('path');
  for(const cle of ['fiche', 'rapport', 'brief'])
    for(const n of nomsLivrable(cle))
      for(const f of [path.join(sujetDir, '.src', n), path.join(sujetDir, n)]){
        try { return langue(fs.readFileSync(f, 'utf8')); } catch(e){}
      }
  return 'fr';
}

// La langue de travail que déclare context/mission.md (« **Langue de travail** : … », écrite
// par l'accueil) : 'fr', 'en', 'autre' (toute autre langue : les titres y prennent la forme
// anglaise), ou null quand rien n'est déclaré.
function langueMission(projectRoot){
  const fs = require('fs'), path = require('path');
  let md; try { md = fs.readFileSync(path.join(projectRoot, 'context', 'mission.md'), 'utf8'); } catch(e){ return null; }
  // [ \t] et non \s : une ligne laissée vide (le modèle de l'accueil) ne lit pas la suivante, et
  // la première ligne remplie compte.
  const v = [...md.matchAll(/^[ \t]*[-*]?[ \t]*\*\*(?:Langue de travail|Working language)\*\*[ \t]*:[ \t]*(.*)$/gim)]
    .map(m => m[1].replace(/[*_`]/g, '').trim().toLowerCase()).find(Boolean) || '';
  if(!v) return null;
  if(/^(fr\b|fran[cç]ais|french)/.test(v)) return 'fr';
  if(/^(en\b|anglais|english)/.test(v)) return 'en';
  return 'autre';
}

// Les mots que les outils écrivent eux-mêmes dans les pages que le designer lit et partage
// (le rendu d'un livrable, la galerie). Les messages aux agents, eux, restent en français.
const PAGE = {
  fr: { copier: 'Copier le markdown', copie: 'Copié', sommaire: 'Sommaire',
        fiche: 'Fiche de sujet', rapport: "Rapport d'action", recherche: 'Recherche', brief: "Brief d'exploration",
        recette: 'Recette', livrable: 'Livrable',
        explorations: 'Explorations', pistes: 'Pistes', latitude: 'Latitude créative',
        parcours: n => 'Parcours en ' + n + ' étapes', depuis: k => "Depuis l'étape " + k, existant: 'existant',
        ecranInconnu: 'écran ?', nonComposee: 'non composée', rangInconnu: 'rang ?', rangPartage: n => 'rang ' + n + ' partagé',
        etapesComposees: (a, b) => a + ' / ' + b + ' étapes composées', etapes: n => n + ' étapes',
        aucunProto: 'Aucun proto : piste du rapport non composée — non arbitrable en l\'état.',
        varianteDe: nom => 'variante de « ' + nom + ' »',
        obsManquante: f => f + ' déclarée au socle, absente de <code>refs/</code> — étape non montrable.' },
  en: { copier: 'Copy markdown', copie: 'Copied', sommaire: 'Contents',
        fiche: 'Topic sheet', rapport: 'Report', recherche: 'Research', brief: 'Exploration brief',
        recette: 'Design QA', livrable: 'Deliverable',
        explorations: 'Explorations', pistes: 'Options', latitude: 'Creative latitude',
        parcours: n => 'Journey in ' + n + ' steps', depuis: k => 'From step ' + k, existant: 'current',
        ecranInconnu: 'screen ?', nonComposee: 'not composed', rangInconnu: 'rank ?', rangPartage: n => 'rank ' + n + ' shared',
        etapesComposees: (a, b) => a + ' / ' + b + ' steps composed', etapes: n => n + ' steps',
        aucunProto: 'No proto: this option from the report was not composed — it cannot be judged yet.',
        varianteDe: nom => 'variant of “' + nom + '”',
        obsManquante: f => f + ' declared in the observed base, missing from <code>refs/</code> — this step cannot be shown.' },
};

module.exports = { MOTS, PROPRIETES, alt, re, estLivrable, nomsLivrable, langue, langueSujet, langueMission, PAGE, escRe };
