/* Sve statičke provjere galerije, jednom komandom (bez pregledača):
     node testovi/galerija/provjeri.js

   1. imena.js — dogovor dijelova js/galerija/ (red, G, prijava)
   2. python3 alati/verzije.py --provjeri — svaka adresa ka dijelovima
      i css/galerija.css ima ažuran ?v= (keširaju se "immutable")
   3. ESLint (eslint.config.js u korijenu)
   4. tsc --checkJs (tsconfig.json ovdje)

   eslint i tsc se traže u testovi/galerija/node_modules (npm install
   ovdje), pa u PATH-u. Pregledač provjerava smoke.js. */
'use strict';
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const KORIJEN = path.resolve(__dirname, '..', '..');

function alat(ime) {
  const lokalno = path.join(__dirname, 'node_modules', '.bin', ime);
  return fs.existsSync(lokalno) ? lokalno : ime;
}

const koraci = [
  ['imena', process.execPath, [path.join(__dirname, 'imena.js')]],
  ['verzije', 'python3', [path.join('alati', 'verzije.py'), '--provjeri']],
  ['eslint', alat('eslint'), []],
  ['tsc', alat('tsc'), ['-p', path.join(__dirname, 'tsconfig.json')]]
];

let palo = 0;
for (const [ime, komanda, argumenti] of koraci) {
  const r = spawnSync(komanda, argumenti, { cwd: KORIJEN, stdio: 'inherit' });
  if (r.error) {
    console.log(ime + ': nije pokrenut (' + r.error.code + ') — npm install u testovi/galerija/');
    palo++;
  } else if (r.status !== 0) {
    console.log(ime + ': PAO');
    palo++;
  } else {
    console.log(ime + ': u redu');
  }
}
console.log(palo ? 'provjere: ' + palo + ' pale' : 'provjere: sve u redu');
process.exit(palo ? 1 : 0);
