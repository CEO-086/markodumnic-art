/* Provjera dogovora dijelova galerije (js/galerija/*.js), bez paketa.
     node testovi/galerija/imena.js        iz korijena sajta

   Dogovor je opisan u zaglavlju js/galerija/osnova.js:
   - sve tri galerija.html (ME/EN/IT) uključuju ISTE fajlove ISTIM
     redom, svaki tačno jednom; prvi je osnova.js, posljednji glavni.js
   - fajl počinje sa // @ts-check i van omotača ima samo komentare;
     svaki dio je omotač (function () { 'use strict'; … })() koji se
     na kraju prijavi sa G.dijelovi.push('<ime>') (glavni.js ne)
   - spisak dijelova u glavni.js (G.dijelovi.join() !== '…') je tačno
     spisak prijava, istim redom
   - dio uzima iz G (const { … } = G) samo ono što je upisao RANIJI dio
   - G.ime (poziv u trenutku poziva) postoji u nekom dijelu
   - nijedno ime se ne upisuje u G dvaput
   Šta ESLint ne može da vidi (gleda fajl po fajl), to vidi ova provjera;
   da je svako ime unutar dijela definisano, gleda ESLint (no-undef). */
'use strict';
const fs = require('fs');
const path = require('path');

const KORIJEN = path.resolve(__dirname, '..', '..');
const DIR = path.join(KORIJEN, 'js', 'galerija');
const STRANICE = ['galerija.html', 'en/galerija.html', 'it/galerija.html'];

const greske = [];
const upozorenja = [];
const greska = function (t) { greske.push(t); };
const bezKomentara = function (s) { return s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, ''); };

/* Redoslijed fajlova iz stranica */
const redovi = STRANICE.map(function (s) {
  const html = fs.readFileSync(path.join(KORIJEN, s), 'utf8');
  return Array.from(html.matchAll(/<script\b[^>]*\bsrc="(?:\.\.\/|\/)*js\/galerija\/([\w.-]+\.js)(?:\?v=[0-9a-f]+)?"[^>]*><\/script>/g))
    .map(function (m) { return m[1]; });
});
const red = redovi[0];
redovi.forEach(function (r, i) {
  if (r.join() !== red.join()) { greska(STRANICE[i] + ': drugačiji spisak ili red fajlova nego ' + STRANICE[0]); }
});
const fajlovi = fs.readdirSync(DIR).filter(function (f) { return f.endsWith('.js'); }).sort();
if (red.slice().sort().join() !== fajlovi.join()) {
  greska('stranice uključuju [' + red.join(', ') + '], a u js/galerija/ su [' + fajlovi.join(', ') + ']');
}
if (new Set(red).size !== red.length) { greska('neki fajl je uključen dvaput'); }
if (red[0] !== 'osnova.js') { greska('prvi fajl mora biti osnova.js (pravi G)'); }
if (red[red.length - 1] !== 'glavni.js') { greska('posljednji fajl mora biti glavni.js (provjerava da su svi dijelovi stigli)'); }

/* Imena iz bloka { a, b, c } (bez komentara) */
function imena(blok) {
  return bezKomentara(blok).split(',')
    .map(function (x) { return x.trim(); }).filter(Boolean)
    .map(function (x) { return x.replace(/\s*:.*$/, ''); });
}

/* Dijelovi, redom kojim se izvršavaju */
const dijelovi = [];   /* { fajl, ime, tekst } */
let spisak = null;
red.forEach(function (f) {
  if (!fs.existsSync(path.join(DIR, f))) { return; }
  const s = fs.readFileSync(path.join(DIR, f), 'utf8');
  if (!s.startsWith('// @ts-check\n')) { greska(f + ': prvi red nije // @ts-check'); }
  /* Omotač počinje redom "(function () {" + "'use strict';", a završava
     POSLJEDNJIM "})();" prije sljedećeg omotača (unutra ih može biti još) */
  const komadi = s.split(/^\(function \(\) \{\n'use strict';\n/m);
  let van = komadi[0];
  const tijela = [];
  for (const k of komadi.slice(1)) {
    const kraj = k.lastIndexOf('\n})();');
    if (kraj < 0) { greska(f + ': omotač bez kraja })();'); continue; }
    tijela.push(k.slice(0, kraj + 1));
    van += k.slice(kraj + '\n})();'.length);
  }
  van = bezKomentara(van).trim();
  if (van) { greska(f + ': kod van omotača: ' + van.slice(0, 60)); }
  let n = 0;
  for (const tekst of tijela) {
    n++;
    const prijava = /\nG\.dijelovi\.push\('(\w+)'\);\n\n$/.exec(tekst);
    if (prijava) { dijelovi.push({ fajl: f, ime: prijava[1], tekst: tekst }); continue; }
    if (f === 'glavni.js') {
      const sp = /\nif \(G\.dijelovi\.join\(\) !== '([\w,]+)'\) \{ return; \}\n/.exec(tekst);
      if (!sp) { greska(f + ': nema provjere da su svi dijelovi stigli (G.dijelovi.join())'); }
      else { spisak = sp[1]; }
      dijelovi.push({ fajl: f, ime: 'glavni', tekst: tekst });
    } else {
      greska(f + ': dio br. ' + n + " se ne prijavljuje na kraju (G.dijelovi.push('…'))");
    }
  }
  if (!n) { greska(f + ': nema nijednog omotača'); }
});
const prijave = dijelovi.filter(function (d) { return d.fajl !== 'glavni.js'; }).map(function (d) { return d.ime; });
if (new Set(prijave).size !== prijave.length) { greska('dva dijela se prijavljuju istim imenom'); }
if (spisak !== null && spisak !== prijave.join()) {
  greska("glavni.js čeka '" + spisak + "', a dijelovi se prijavljuju kao '" + prijave.join() + "'");
}

const upisao = new Map();   /* ime → dio */
const uzima = [];           /* { dio, ime, poRedu } */
const preko = [];           /* G.ime u trenutku poziva */
dijelovi.forEach(function (d, poRedu) {
  const oznaka = d.fajl + ' (' + d.ime + ')';
  for (const m of d.tekst.matchAll(/^Object\.assign\(G, \{([\s\S]*?)\}\);$/gm)) {
    for (const n of imena(m[1])) {
      if (upisao.has(n)) { greska(oznaka + ': ' + n + ' je već upisao ' + upisao.get(n).oznaka); }
      upisao.set(n, { oznaka: oznaka, poRedu: poRedu });
    }
  }
  for (const m of d.tekst.matchAll(/^const \{([\s\S]*?)\} = G;/gm)) {
    for (const n of imena(m[1])) { uzima.push({ oznaka: oznaka, ime: n, poRedu: poRedu }); }
  }
  for (const m of bezKomentara(d.tekst).matchAll(/\bG\.(\w+)\b/g)) {
    if (m[1] !== 'dijelovi') { preko.push({ oznaka: oznaka, ime: m[1] }); }
  }
});

for (const u of uzima) {
  const od = upisao.get(u.ime);
  if (!od) { greska(u.oznaka + ': uzima ' + u.ime + ' iz G, a nijedan dio ga ne upisuje'); }
  else if (od.poRedu >= u.poRedu) {
    greska(u.oznaka + ': uzima ' + u.ime + ' iz G na učitavanju, a upisuje ga ' +
      (od.poRedu === u.poRedu ? 'on sam' : od.oznaka + ', koji dolazi kasnije (pozvati preko G.' + u.ime + ')'));
  }
}
for (const p of preko) {
  if (!upisao.has(p.ime)) { greska(p.oznaka + ': G.' + p.ime + ' — nijedan dio ga ne upisuje'); }
}
const koristi = new Set(uzima.map(function (u) { return u.ime; }).concat(preko.map(function (p) { return p.ime; })));
for (const [n, od] of upisao) {
  if (!koristi.has(n)) { upozorenja.push(od.oznaka + ': ' + n + ' je upisan u G, a niko ga ne uzima'); }
}

upozorenja.forEach(function (u) { console.log('upozorenje: ' + u); });
greske.forEach(function (g) { console.log('GREŠKA: ' + g); });
console.log(greske.length ? 'imena: ' + greske.length + ' grešaka' :
  'imena: u redu (' + red.length + ' fajlova, ' + dijelovi.length + ' dijelova, ' + upisao.size + ' imena u G, ' +
  uzima.length + ' uzimanja, ' + preko.length + ' poziva preko G)');
process.exit(greske.length ? 1 : 0);
