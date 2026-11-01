/* Smoke test galerije u pravom pregledaču (Playwright, Chromium):
     node testovi/galerija/smoke.js            (npm install ovdje, ili
                                                globalni playwright)
   Sam podiže statički server nad korijenom sajta (slobodan port), pa
   ne treba ništa drugo. WebGL ide kroz SwiftShader (bez grafičke
   kartice), pa ulazak u salu traje nekoliko sekundi.

   Provjerava ono što bi raspad dijelova js/galerija/ prvo pokvario:
   - ME/EN/IT: stranica bez ijedne greške u konzoli, data-stanje="ulaz",
     ništa od galerije ne ostaje na window (ni __galerija)
   - ?proba: ulazak u salu, sva djela na zidovima, window.__S radi
   - bez WebGL-a: 2D mreža sa SVIM djelima iz data/radovi.json
   - file://: poruka da je stranica otvorena kao fajl
   - jedan dio ne stigne (404): sala se ne pokreće, a js/rano.js na
     `load` otkrije 2D mrežu */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const KORIJEN = path.resolve(__dirname, '..', '..');
const ARGS = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'];
const TIPOVI = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.avif': 'image/avif',
  '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json'
};

function server() {
  const s = http.createServer(function (zahtjev, odgovor) {
    let put = decodeURIComponent(new URL(zahtjev.url, 'http://x').pathname);
    if (put.endsWith('/')) { put += 'index.html'; }
    const fajl = path.join(KORIJEN, path.normalize(put));
    if (!fajl.startsWith(KORIJEN + path.sep) || !fs.existsSync(fajl) || !fs.statSync(fajl).isFile()) {
      odgovor.writeHead(404); odgovor.end(); return;
    }
    odgovor.writeHead(200, { 'Content-Type': TIPOVI[path.extname(fajl)] || 'application/octet-stream' });
    fs.createReadStream(fajl).pipe(odgovor);
  });
  return new Promise(function (r) { s.listen(0, '127.0.0.1', function () { r(s); }); });
}

/* Koliko djela galerija stavlja na zidove (isto pravilo kao ucitajPodatke
   u glavni.js) i koliko ih ima 2D mreža (sva sa slikom) */
function ocekivano() {
  const r = JSON.parse(fs.readFileSync(path.join(KORIJEN, 'data', 'radovi.json'), 'utf8')).radovi.filter(Boolean);
  const istaknuta = r.filter(function (x) { return x.istaknuto; }).length;
  const po = { desno: 0, lijevo: 0 };
  const crtezi = r.filter(function (x) {
    return x.kategorija === 'crtezi' && x.slika && ++po[x.zid === 'desno' ? 'desno' : 'lijevo'] <= 5;
  }).length;
  const ostali = r.filter(function (x) { return !x.istaknuto && x.slika && x.kategorija !== 'crtezi'; }).length;
  /* MJESTA_VELIKE u js/galerija/scena.js (ostala ulja u velikoj sali) */
  const mjestaVelike = Number((fs.readFileSync(path.join(KORIJEN, 'js', 'galerija', 'scena.js'), 'utf8')
    .match(/const MJESTA_VELIKE = (\d+);/) || [])[1]);
  return { sala: istaknuta + crtezi + Math.min(mjestaVelike, ostali), mreza: r.filter(function (x) { return x.id && x.slika; }).length };
}

function prati(page) {
  const greske = [];
  page.on('pageerror', function (e) { greske.push('pageerror: ' + e.message); });
  page.on('console', function (m) { if (m.type() === 'error') { greske.push('console: ' + m.text()); } });
  return greske;
}

const rezultati = [];
async function test(ime, f) {
  const t = Date.now();
  try {
    const opis = await f();
    rezultati.push(true);
    console.log('PROŠAO  ' + ime.padEnd(44) + String(Date.now() - t).padStart(6) + ' ms  ' + (opis || ''));
  } catch (e) {
    rezultati.push(false);
    console.log('PAO     ' + ime.padEnd(44) + String(Date.now() - t).padStart(6) + ' ms  ' + (e && e.message || e));
  }
}
function tvrdi(uslov, poruka) { if (!uslov) { throw new Error(poruka); } }

(async function () {
  const srv = await server();
  const adresa = 'http://127.0.0.1:' + srv.address().port + '/';
  const broj = ocekivano();
  const browser = await chromium.launch({ args: ARGS });
  const kontekst = function (opcije) {
    return browser.newContext(Object.assign({ viewport: { width: 1440, height: 800 }, deviceScaleFactor: 1 }, opcije || {}));
  };

  try {
    for (const stranica of ['galerija.html', 'en/galerija.html', 'it/galerija.html']) {
      await test(stranica + ': učitavanje bez grešaka', async function () {
        const k = await kontekst();
        const page = await k.newPage();
        const greske = prati(page);
        await page.goto(adresa + stranica, { waitUntil: 'load' });
        await page.waitForTimeout(500);
        const s = await page.evaluate(function () {
          return {
            stanje: document.getElementById('galerija').getAttribute('data-stanje'),
            ostalo: ['__galerija', '__S', 'G', 'S', 'el', 'izaberi', 'TEKST', 'petlja'].filter(function (n) { return n in window; })
          };
        });
        await k.close();
        tvrdi(!greske.length, greske.join(' | '));
        tvrdi(s.stanje === 'ulaz', 'data-stanje je ' + s.stanje);
        tvrdi(!s.ostalo.length, 'na window je ostalo: ' + s.ostalo.join(', '));
        return 'data-stanje=ulaz';
      });
    }

    await test('ulazak u salu (?proba)', async function () {
      const k = await kontekst();
      const page = await k.newPage();
      const greske = prati(page);
      await page.goto(adresa + 'galerija.html?proba', { waitUntil: 'load' });
      await page.click('#galerija-pokreni');
      await page.waitForFunction(function () {
        const S = window.__S;
        return S && S.radi && S.render && document.getElementById('galerija').getAttribute('data-stanje') === 'soba';
      }, null, { timeout: 120000 });
      await page.waitForTimeout(1500);
      const s = await page.evaluate(function () {
        const S = window.__S;
        return { mjesta: S.mjesta.length, platna: S.platna.length, petlja: !!S.petlja || S.petlja === 0, sala: S.sala };
      });
      await k.close();
      tvrdi(!greske.length, greske.join(' | '));
      tvrdi(s.mjesta === broj.sala, 'na zidovima ' + s.mjesta + ' djela, očekivano ' + broj.sala);
      return s.mjesta + ' djela';
    });

    await test('bez WebGL-a: 2D mreža sa svim djelima', async function () {
      const k = await kontekst();
      await k.addInitScript(function () {
        const izvorno = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function (vrsta) {
          return /webgl/i.test(String(vrsta)) ? null : izvorno.apply(this, arguments);
        };
      });
      const page = await k.newPage();
      const greske = prati(page);
      await page.goto(adresa + 'galerija.html', { waitUntil: 'load' });
      await page.waitForFunction(function (n) {
        return document.querySelectorAll('#galerija .galerija-2d__mreza > li').length === n;
      }, broj.mreza, { timeout: 15000 }).catch(function () {});
      const s = await page.evaluate(function () {
        const g = document.getElementById('galerija');
        return {
          stanje: g.getAttribute('data-stanje'), razlog: g.getAttribute('data-razlog'),
          djela: document.querySelectorAll('#galerija .galerija-2d__mreza > li').length
        };
      });
      await k.close();
      tvrdi(!greske.length, greske.join(' | '));
      tvrdi(s.stanje === '2d' && s.razlog === 'webgl', 'stanje ' + s.stanje + ', razlog ' + s.razlog);
      tvrdi(s.djela === broj.mreza, '2D mreža ima ' + s.djela + ' djela, očekivano ' + broj.mreza);
      return s.djela + ' djela';
    });

    await test('file://: poruka o fajlu sa diska', async function () {
      const k = await kontekst();
      const page = await k.newPage();
      await page.goto('file://' + path.join(KORIJEN, 'galerija.html'), { waitUntil: 'load' });
      await page.click('#galerija-pokreni');
      const s = await page.evaluate(function () {
        const g = document.getElementById('galerija');
        const p = g.querySelector('.galerija-2d__razlog[data-razlog="fajl"]');
        return { stanje: g.getAttribute('data-stanje'), razlog: g.getAttribute('data-razlog'), vidi: !!(p && p.getClientRects().length) };
      });
      await k.close();
      tvrdi(s.stanje === '2d' && s.razlog === 'fajl' && s.vidi, JSON.stringify(s));
      return 'data-razlog=fajl, poruka vidljiva';
    });

    await test('jedan dio ne stigne: 2D mreža (rano.js)', async function () {
      const k = await kontekst();
      await k.route(/\/js\/galerija\/kretanje\.js/, function (r) { return r.fulfill({ status: 404, body: '' }); });
      const page = await k.newPage();
      const greske = prati(page);
      await page.goto(adresa + 'galerija.html', { waitUntil: 'load' });
      await page.waitForTimeout(300);
      const s = await page.evaluate(function () {
        const g = document.getElementById('galerija');
        return {
          stanje: g.getAttribute('data-stanje'), js: document.documentElement.hasAttribute('data-js'),
          mreza: getComputedStyle(g.querySelector('.galerija-2d')).display, galerija: '__galerija' in window
        };
      });
      await k.close();
      const druge = greske.filter(function (g) { return !/404/.test(g); });
      tvrdi(!druge.length, druge.join(' | '));
      tvrdi(s.stanje === null && !s.js && s.mreza !== 'none' && !s.galerija, JSON.stringify(s));
      return 'sala se ne pokreće, mreža vidljiva';
    });
  } finally {
    await browser.close();
    srv.close();
  }

  const palo = rezultati.filter(function (r) { return !r; }).length;
  console.log('\n' + (rezultati.length - palo) + '/' + rezultati.length + ' prošlo');
  process.exit(palo ? 1 : 0);
})().catch(function (e) { console.error(e); process.exit(1); });
