/* Provjera dogovora dijelova galerije (js/galerija/*.js), bez paketa.
     node testovi/galerija/imena.js        iz korijena sajta

   Dogovor je opisan u zaglavlju js/galerija/osnova.js:
   - sve tri galerija.html (ME/EN/IT) uključuju ISTE dijelove ISTIM
     redom, svaki tačno jednom; prvi je osnova.js, posljednji glavni.js
   - dio uzima iz G (const { … } = G) samo ono što je upisao RANIJI dio
   - G.ime (poziv u trenutku poziva) postoji u nekom dijelu
   - nijedno ime se ne upisuje u G dvaput
   - svaki dio počinje sa // @ts-check, omotan je u (function () {
     'use strict'; … })() i završava sa G.dijelovi.push('<ime fajla>')
   Šta ESLint ne može da vidi (gleda fajl po fajl), to vidi ova provjera;
   da je svako ime unutar fajla definisano, gleda ESLint (no-undef). */
'use strict';
const fs = require('fs');
const path = require('path');

const KORIJEN = path.resolve(__dirname, '..', '..');
const DIR = path.join(KORIJEN, 'js', 'galerija');
const STRANICE = ['galerija.html', 'en/galerija.html', 'it/galerija.html'];

const greske = [];
const upozorenja = [];
const greska = function (t) { greske.push(t); };

/* Redoslijed iz stranica */
const redovi = STRANICE.map(function (s) {
  const html = fs.readFileSync(path.join(KORIJEN, s), 'utf8');
  return Array.from(html.matchAll(/<script\b[^>]*\bsrc="(?:\.\.\/|\/)*js\/galerija\/([\w.-]+\.js)(?:\?v=[0-9a-f]+)?"[^>]*><\/script>/g))
    .map(function (m) { return m[1]; });
});
const red = redovi[0];
redovi.forEach(function (r, i) {
  if (r.join() !== red.join()) { greska(STRANICE[i] + ': drugačiji spisak ili red dijelova nego ' + STRANICE[0]); }
});
const fajlovi = fs.readdirSync(DIR).filter(function (f) { return f.endsWith('.js'); }).sort();
if (red.slice().sort().join() !== fajlovi.join()) {
  greska('stranice uključuju [' + red.join(', ') + '], a u js/galerija/ su [' + fajlovi.join(', ') + ']');
}
if (new Set(red).size !== red.length) { greska('neki dio je uključen dvaput'); }
if (red[0] !== 'osnova.js') { greska('prvi dio mora biti osnova.js (pravi G)'); }
if (red[red.length - 1] !== 'glavni.js') { greska('posljednji dio mora biti glavni.js (provjerava da su svi stigli)'); }

/* Imena iz bloka { a, b, c } (bez komentara) */
function imena(blok) {
  return blok.replace(/\/\*[\s\S]*?\*\//g, '').split(',')
    .map(function (x) { return x.trim(); }).filter(Boolean)
    .map(function (x) { return x.replace(/\s*:.*$/, ''); });
}

const upisao = new Map();   /* ime → dio */
const uzima = [];           /* { dio, ime, poRedu } */
const preko = [];           /* G.ime u trenutku poziva */
red.forEach(function (f, poRedu) {
  if (!fs.existsSync(path.join(DIR, f))) { return; }
  const s = fs.readFileSync(path.join(DIR, f), 'utf8');
  const ime = f.replace(/\.js$/, '');
  if (!s.startsWith('// @ts-check\n')) { greska(f + ': prvi red nije // @ts-check'); }
  if (!/\n\(function \(\) \{\n'use strict';\n/.test(s)) { greska(f + ': nema omotača (function () { \'use strict\';'); }
  if (f === 'glavni.js') {
    /* glavni.js se ne prijavljuje, nego broji ostale prije pokretanja */
    if (!/\nif \(G\.dijelovi\.length !== document\.querySelectorAll\('script\[src\*="js\/galerija\/"\]'\)\.length - 1\) \{ return; \}\n/.test(s)) {
      greska(f + ': nema provjere da su svi dijelovi stigli (G.dijelovi.length)');
    }
    if (!/\n\}\)\(\);\n$/.test(s)) { greska(f + ': ne završava omotačem })();'); }
  } else if (!new RegExp("\\nG\\.dijelovi\\.push\\('" + ime + "'\\);\\n\\n\\}\\)\\(\\);\\n$").test(s)) {
    greska(f + ": ne završava sa G.dijelovi.push('" + ime + "'); })();");
  }
  for (const m of s.matchAll(/^Object\.assign\(G, \{([\s\S]*?)\}\);$/gm)) {
    for (const n of imena(m[1])) {
      if (upisao.has(n)) { greska(f + ': ' + n + ' je već upisao ' + upisao.get(n)); }
      upisao.set(n, f);
    }
  }
  for (const m of s.matchAll(/^const \{([\s\S]*?)\} = G;/gm)) {
    for (const n of imena(m[1])) { uzima.push({ dio: f, ime: n, poRedu: poRedu }); }
  }
  const kod = s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  for (const m of kod.matchAll(/\bG\.(\w+)\b/g)) {
    if (m[1] !== 'dijelovi') { preko.push({ dio: f, ime: m[1] }); }
  }
});

for (const u of uzima) {
  const od = upisao.get(u.ime);
  if (!od) { greska(u.dio + ': uzima ' + u.ime + ' iz G, a nijedan dio ga ne upisuje'); }
  else if (red.indexOf(od) >= u.poRedu) {
    greska(u.dio + ': uzima ' + u.ime + ' iz G na učitavanju, a upisuje ga ' +
      (od === u.dio ? 'on sam' : od + ', koji dolazi kasnije (pozvati preko G.' + u.ime + ')'));
  }
}
for (const p of preko) {
  if (!upisao.has(p.ime)) { greska(p.dio + ': G.' + p.ime + ' — nijedan dio ga ne upisuje'); }
}
const koristi = new Set(uzima.map(function (u) { return u.ime; }).concat(preko.map(function (p) { return p.ime; })));
for (const [n, f] of upisao) {
  if (!koristi.has(n)) { upozorenja.push(f + ': ' + n + ' je upisan u G, a niko ga ne uzima'); }
}

upozorenja.forEach(function (u) { console.log('upozorenje: ' + u); });
greske.forEach(function (g) { console.log('GREŠKA: ' + g); });
console.log(greske.length ? 'imena: ' + greske.length + ' grešaka' :
  'imena: u redu (' + red.length + ' dijelova, ' + upisao.size + ' imena u G, ' + uzima.length + ' uzimanja, ' + preko.length + ' poziva preko G)');
process.exit(greske.length ? 1 : 0);
