'use strict';
/* Rendus demandés pour les protos d'un sujet : ceux que la fiche déclare (champ
   « **Rendus :** » de l'en-tête de 01-fiche), posés au cadrage d'après les plateformes
   de la mission — une appli seule n'a pas de rendu desktop. Lu par proto-shot (quelles
   captures) et proto-frame (quels cadres, quelles captures attendues).
   Fiche absente, champ absent ou illisible ⇒ mobile ET desktop, et `etat` le dit :
   un défaut ne passe jamais pour une déclaration. */
const fs = require('fs');
const path = require('path');
const LX = require(path.join(__dirname, 'lexique.js'));

function rendusDuSujet(sujetDir){
  const defaut = raison => ({ m: true, d: true, etat: '⚠ Rendus : mobile et desktop, par défaut — ' + raison });
  // La fiche sous son nom français ou anglais (01-fiche, 01-topic-sheet), champ « Rendus » ou « Renders ».
  for(const f of LX.nomsLivrable('fiche').flatMap(n => [path.join(sujetDir, '.src', n), path.join(sujetDir, n)])){
    let md; try { md = fs.readFileSync(f, 'utf8'); } catch(e){ continue; }
    const champ = LX.re('rendus', '\\*\\*', '\\s*:\\*\\*\\s*([^·\\n]*)', 'i').exec(md);
    if(!champ) return defaut('la fiche ne dit pas les rendus');
    const v = champ[1].toLowerCase(), r = { m: /mobile/.test(v), d: /desktop/.test(v) };
    if(!r.m && !r.d) return defaut('rendus illisibles dans la fiche (« ' + champ[1].trim() + ' »)');
    r.etat = 'Rendus : ' + (r.m && r.d ? 'mobile et desktop' : r.m ? 'mobile seul' : 'desktop seul') + ' (fiche)';
    return r;
  }
  return defaut('pas de fiche dans le sujet');
}

module.exports = { rendusDuSujet };
