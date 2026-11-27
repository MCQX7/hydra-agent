'use strict';
/* Régime de composition du sujet (hydra-cortex, champ « Composition » de l'en-tête de la fiche) :
   'explorer' ou 'reproduire'. Lu par proto-frame (galerie) : en régime explorer, l'existant du
   socle sert de référence et ses blocs ne se comptent pas ; en reproduire, rien ne change.
   Fiche absente, champ absent ou illisible ⇒ 'reproduire' — le comportement d'avant. */
const fs = require('fs');
const path = require('path');
const LX = require(path.join(__dirname, 'lexique.js'));

function compositionDuSujet(sujetDir){
  // La fiche sous son nom français ou anglais (01-fiche, 01-topic-sheet), dans .src/ puis à plat.
  for(const f of LX.nomsLivrable('fiche').flatMap(n => [path.join(sujetDir, '.src', n), path.join(sujetDir, n)])){
    let md; try { md = fs.readFileSync(f, 'utf8'); } catch(e){ continue; }
    const champ = LX.re('composition', '\\*\\*', '\\s*:\\*\\*\\s*([^·\\n]*)', 'i').exec(md);
    if(!champ) return 'reproduire';
    // Valeur entière, en début de champ : « [reproduire / explorer] » (gabarit non rempli) se lit
    // comme illisible, donc reproduire.
    return LX.re('explorer', '^\\s*', '(?![\\wÀ-ÿ])', 'i').test(champ[1]) ? 'explorer' : 'reproduire';
  }
  return 'reproduire';
}

module.exports = { compositionDuSujet };
