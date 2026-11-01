// @ts-check
/* =========================================================
   Virtuelna galerija — sučelje
   Stanja prikaza (ulaz, učitavanje, soba, 2D) i 2D rezerva sa svim
   djelima, najava za čitače ekrana, dugmad kretanja, mapa sale,
   savjeti pri ulasku, panel sa podacima o djelu i natpis na prelaz
   miša.
   ========================================================= */

(function () {
'use strict';

/** @type {Galerija} */
const G = /** @type {any} */ (window).__galerija;
const { izKorijena, SOBA, POLA_X, POLA_Z, VIDNO_POLJE, PROLAZ, korijen, el, S } = G;   /* osnova.js */
const { EN, IT, TEKST } = G;   /* tekstovi.js */
const { postaviKarticu, osvjeziUronjeno, osvjeziMob } = G;   /* telefon.js */

/* ---------------------------------------------------------
   Stanja prikaza i 2D rezerva
   --------------------------------------------------------- */

/* Postavlja stanje prikaza: 'ulaz' | 'ucitavanje' | 'soba' | '2d' */
function stanje(novo) {
  korijen.setAttribute('data-stanje', novo);
  osvjeziUronjeno();
}

/* Prelazak na 2D mrežu, sa razlogom koji CSS otkriva.
   Vrijednosti: webgl | fajl | cdn | podaci | json | prazno
   (smanjeno kretanje NIJE među njima — vidi `smanjenoKretanje` u osnova.js) */
function na2D(razlog) {
  korijen.setAttribute('data-razlog', razlog);
  stanje('2d');
  /* U HTML-u je samo izbor djela (radi i bez JavaScripta). Kad podaci
     mogu da stignu, mreža se dopuni do svih djela iz radovi.json. */
  if (razlog === 'webgl' || razlog === 'cdn' || razlog === 'prazno') { popuni2D(); }
}

/* 2D mreža sa SVIM djelima iz data/radovi.json, istim oznakama kao
   statična mreža u HTML-u (isti CSS). Statična mreža ostaje ako
   podaci ne stignu. */
function popuni2D() {
  const lista = korijen.querySelector('.galerija-2d__mreza');
  if (!lista || !window.fetch || S.mreza2D) { return; }
  S.mreza2D = true;
  const uzorak = lista.querySelector('source');
  const velicine = (uzorak && uzorak.getAttribute('sizes')) || '100vw';
  fetch(izKorijena('data/radovi.json')).then(function (o) {
    if (!o.ok) { throw new Error('podaci'); }
    return o.json();
  }).then(function (podaci) {
    const radovi = ((podaci && podaci.radovi) || []).filter(function (r) { return r && r.id && r.slika; });
    if (!radovi.length) { return; }
    const nova = document.createDocumentFragment();
    radovi.forEach(function (r) {
      const prevod = (IT ? r.it : EN ? r.en : null) || {};
      const naziv = prevod.naziv || r.naziv || '';
      const opis = prevod.opis || r.opis || '';
      const tehnika = prevod.tehnika || r.tehnika || '';
      const n = function (ime, klasa) { const e = document.createElement(ime); if (klasa) { e.className = klasa; } return e; };
      const li = n('li');
      const fig = n('figure', 'galerija-2d__djelo');
      const a = n('a');
      a.setAttribute('href', 'djelo.html?id=' + encodeURIComponent(r.id));
      const okvir = n('span', 'galerija-2d__okvir');
      const pic = n('picture');
      const sirine = Array.isArray(r.varijante) ? r.varijante.map(Number).filter(function (w) { return w > 0; }) : [];
      if (sirine.length && /^[a-z0-9-]+$/.test(String(r.id))) {
        ['avif', 'webp'].forEach(function (ekst) {
          const izvor = n('source');
          izvor.setAttribute('type', 'image/' + ekst);
          izvor.setAttribute('srcset', sirine.map(function (w) {
            return izKorijena('img/radovi/w/' + r.id + '-' + w + '.' + ekst) + ' ' + w + 'w';
          }).join(', '));
          izvor.setAttribute('sizes', velicine);
          pic.appendChild(izvor);
        });
      }
      const img = n('img');
      if (r.sirinaPx && r.visinaPx) {
        img.setAttribute('width', String(r.sirinaPx));
        img.setAttribute('height', String(r.visinaPx));
      }
      img.setAttribute('alt', opis ? naziv + ' — ' + opis : naziv);
      img.setAttribute('loading', 'lazy');
      img.setAttribute('src', izKorijena(r.slika));
      pic.appendChild(img);
      okvir.appendChild(pic);
      a.appendChild(okvir);
      const cap = n('figcaption');
      const ime = n('span', 'galerija-2d__naziv');
      ime.textContent = naziv;
      const meta = n('span', 'galerija-2d__meta');
      meta.textContent = [r.godina, tehnika, r.dimenzije]
        .filter(function (v) { return v != null && String(v).trim() !== ''; }).join(' · ');
      cap.appendChild(ime);
      cap.appendChild(meta);
      fig.appendChild(a);
      fig.appendChild(cap);
      li.appendChild(fig);
      nova.appendChild(li);
    });
    lista.textContent = '';
    lista.appendChild(nova);
  }).catch(function () { S.mreza2D = false; /* ostaje statični izbor */ });
}

/* Kratka najava za čitače ekrana: „naziv, godina, tehnika, dimenzije.
   k od n“ — isti podaci kao na kartici, bez opisa. Polja kojih nema
   (crteži bez godine i dimenzija) se preskaču. Panel nije aria-live —
   inače bi se na svakom izboru čitao cio opis. Prazni se pa puni, da
   se i isto djelo izabrano ponovo najavi. */
function najavi(djelo, k, n) {
  if (!el.najava || !djelo) { return; }
  let tekst = [djelo.naziv, djelo.godina, djelo.tehnika, djelo.dimenzije]
    .filter(function (v) { return v != null && String(v).trim() !== ''; }).join(', ');
  if (k >= 0 && n > 0) { tekst += '. ' + TEKST.redni(k + 1, n); }
  el.najava.textContent = '';
  window.clearTimeout(S.najavaTajmer);
  S.najavaTajmer = window.setTimeout(function () { el.najava.textContent = tekst; }, 60);
}

/* Dugmad ◀ ▶ nemaju smisla dok nema djela; "Pregled" nema smisla
   kad si već u pregledu. Stanje se odražava na aria-disabled, a ne
   na `disabled` — dugme ostaje u Tab redu i čitač ekrana ga najavi. */
function osvjeziKretanje() {
  const uPregledu = S.izabrano < 0;
  if (el.pregled) {
    el.pregled.setAttribute('aria-disabled', uPregledu ? 'true' : 'false');
  }
  if (el.sala) {
    el.sala.textContent = S.sala === 2 ? TEKST.salaNazad : TEKST.salaDruga;
    el.sala.hidden = !S.mjesta.some(function (m) { return m.soba === 2; });
  }
  osvjeziMob();
}

const KLJUC_MAPE = 'dumnic-galerija-mapa';

function citaj(kljuc) {
  try { return window.localStorage.getItem(kljuc); } catch (e) { return null; }
}
function pisi(kljuc, vrijednost) {
  try { window.localStorage.setItem(kljuc, vrijednost); } catch (e) { /* privatni prozor — nebitno */ }
}

/* MAPA SALE: tlocrt obje sale odozgo, tačka za svako djelo i
   „vi ste ovdje“ sa smjerom pogleda. Klik na tačku vodi do djela.
   Koordinate SVG-a su metri sobe: x desno, z nadolje (zadnji zid
   prve sale gore, druga sala ispod, iza prolaza). */
const SVG_NS = 'http://www.w3.org/2000/svg';
function svgEl(ime, atributi) {
  const e = document.createElementNS(SVG_NS, ime);
  for (const k in atributi) { e.setAttribute(k, atributi[k]); }
  return e;
}

function napraviMapu() {
  if (!el.mapa) { return; }
  el.mapa.textContent = '';
  const z0 = POLA_Z + PROLAZ.zid;
  const SW = PROLAZ.sala2.sirina, SD = PROLAZ.sala2.dubina;
  const v = PROLAZ.sirina / 2;

  const glava = document.createElement('button');
  glava.type = 'button';
  glava.className = 'galerija-mapa__prekidac';
  glava.innerHTML = '<span>' + TEKST.mapa + '</span><span class="galerija-mapa__strelica" aria-hidden="true"></span>';
  el.mapa.appendChild(glava);

  const svg = svgEl('svg', {
    viewBox: (-POLA_X - 0.6) + ' ' + (-POLA_Z - 0.6) + ' ' + (SOBA.sirina + 1.2) + ' ' + (SOBA.dubina + PROLAZ.zid + SD + 1.2),
    class: 'galerija-mapa__crtez', role: 'group', 'aria-label': TEKST.tlocrt
  });
  svg.appendChild(svgEl('rect', { x: -POLA_X, y: -POLA_Z, width: SOBA.sirina, height: SOBA.dubina, class: 'galerija-mapa__pod' }));
  svg.appendChild(svgEl('rect', { x: -SW / 2, y: z0, width: SW, height: SD, class: 'galerija-mapa__pod' }));
  svg.appendChild(svgEl('rect', { x: -v, y: POLA_Z, width: 2 * v, height: PROLAZ.zid, class: 'galerija-mapa__pod' }));
  svg.appendChild(svgEl('path', {
    class: 'galerija-mapa__zid',
    d: 'M ' + (-v) + ' ' + POLA_Z + ' H ' + (-POLA_X) + ' V ' + (-POLA_Z) + ' H ' + POLA_X + ' V ' + POLA_Z + ' H ' + v +
       ' M ' + (-v) + ' ' + z0 + ' H ' + (-SW / 2) + ' V ' + (z0 + SD) + ' H ' + (SW / 2) + ' V ' + z0 + ' H ' + v +
       ' M ' + (-v) + ' ' + POLA_Z + ' V ' + z0 + ' M ' + v + ' ' + POLA_Z + ' V ' + z0
  }));
  const natpisSale = function (tekst, z) {
    const t = svgEl('text', { x: 0, y: z, class: 'galerija-mapa__sala', 'text-anchor': 'middle' });
    t.textContent = tekst;
    svg.appendChild(t);
  };
  natpisSale(TEKST.sala1, 0.4);
  natpisSale(TEKST.sala2, z0 + SD / 2 + 0.4);

  S.mapaTacke = [];
  S.mjesta.forEach(function (m, i) {
    /* Jedna Tab-stanica za cijelu mapu (roving tabindex): strelice
       idu od tačke do tačke, Enter / razmak vode do djela. */
    const g = svgEl('g', { class: 'galerija-mapa__djelo', tabindex: i === 0 ? '0' : '-1', role: 'button', 'data-mapa-djelo': String(i) });
    const naziv = (m.djelo && m.djelo.naziv) || TEKST.djeloBr(i + 1);
    g.setAttribute('aria-label', TEKST.idiDo + naziv);
    const x = m.x + m.nx * 0.35, z = m.z + m.nz * 0.35;
    const naslov = svgEl('title', {});
    naslov.textContent = naziv;
    g.appendChild(naslov);
    /* Nevidljiva meta za klik/dodir: najmanje 24 px na ekranu (vidi velicinaMeta) */
    g.appendChild(svgEl('circle', { cx: x, cy: z, r: 1.6, class: 'galerija-mapa__pogodak' }));
    g.appendChild(svgEl('circle', { cx: x, cy: z, r: 1.05, class: 'galerija-mapa__meta' }));
    g.appendChild(svgEl('circle', { cx: x, cy: z, r: 0.42, class: 'galerija-mapa__tacka' }));
    const idi = function () { G.pauzirajTuru(); G.izaberi(i); };   /* kamera.js */
    g.addEventListener('click', idi);
    g.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); idi(); return; }
      const n = S.mapaTacke.length;
      let j = -1;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { j = (i + 1) % n; }
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { j = (i - 1 + n) % n; }
      else if (e.key === 'Home') { j = 0; }
      else if (e.key === 'End') { j = n - 1; }
      if (j < 0) { return; }
      /* strelice ovdje ne smiju i da biraju djelo u sali (tipkaDole) */
      e.preventDefault();
      e.stopPropagation();
      tackaUFokus(j, true);
    });
    svg.appendChild(g);
    S.mapaTacke.push(g);
  });

  /* Vi ste ovdje: tačka i klin vidnog polja */
  const ja = svgEl('g', { class: 'galerija-mapa__ja', 'aria-hidden': 'true' });
  const pola = (VIDNO_POLJE * 0.75) * Math.PI / 360;
  const r = 2.6;
  ja.appendChild(svgEl('path', {
    class: 'galerija-mapa__pogled',
    d: 'M 0 0 L ' + (r * Math.cos(-pola)) + ' ' + (r * Math.sin(-pola)) +
       ' A ' + r + ' ' + r + ' 0 0 1 ' + (r * Math.cos(pola)) + ' ' + (r * Math.sin(pola)) + ' Z'
  }));
  ja.appendChild(svgEl('circle', { cx: 0, cy: 0, r: 0.5, class: 'galerija-mapa__oko' }));
  svg.appendChild(ja);
  S.mapaJa = ja;

  el.mapa.appendChild(svg);
  S.mapaSvg = svg;
  velicinaMeta();

  const postavi = function (otvorena) {
    el.mapa.classList.toggle('je-skupljena', !otvorena);
    glava.setAttribute('aria-expanded', otvorena ? 'true' : 'false');
    glava.setAttribute('aria-label', otvorena ? TEKST.sakrijMapu : TEKST.prikaziMapu);
  };
  const zapamceno = citaj(KLJUC_MAPE);
  postavi(zapamceno ? zapamceno === 'da' : !window.matchMedia('(max-width: 380px)').matches);
  glava.addEventListener('click', function () {
    const otvorena = el.mapa.classList.contains('je-skupljena');
    postavi(otvorena);
    pisi(KLJUC_MAPE, otvorena ? 'da' : 'ne');
  });
  S.mapaZadnje = '';
}

/* Jedina tačka mape u Tab redu; `fokus` je i pomjera tamo */
function tackaUFokus(j, fokus) {
  S.mapaTacke.forEach(function (g, i) { g.setAttribute('tabindex', i === j ? '0' : '-1'); });
  if (fokus && S.mapaTacke[j]) { S.mapaTacke[j].focus(); }
}
/* Poluprečnik nevidljive mete u metrima sale, tako da je na ekranu
   prečnik bar 24 px (WCAG 2.5.8). Mapa je 6–7.5rem široka, pa razmjer
   zavisi od ekrana — računa se kad se mapa napravi i na promjenu veličine. */
function velicinaMeta() {
  const svg = S.mapaSvg;
  if (!svg || !svg.viewBox || !svg.viewBox.baseVal) { return; }
  const sirina = svg.getBoundingClientRect().width - 10;   /* bez paddinga i okvira */
  if (!(sirina > 20)) { return; }
  const r = Math.max(1.05, 12 * svg.viewBox.baseVal.width / sirina);
  svg.querySelectorAll('.galerija-mapa__pogodak').forEach(function (c) { c.setAttribute('r', r.toFixed(2)); });
}

function osvjeziMapu() {
  if (!S.mapaJa || !S.poz) { return; }
  const ugaoPogleda = Math.atan2(S.cilj.z - S.poz.z, S.cilj.x - S.poz.x) * 180 / Math.PI;
  const tr = 'translate(' + S.poz.x.toFixed(2) + ' ' + S.poz.z.toFixed(2) + ') rotate(' + ugaoPogleda.toFixed(1) + ')';
  if (tr !== S.mapaZadnje) { S.mapaJa.setAttribute('transform', tr); S.mapaZadnje = tr; }
  if (S.mapaIzabrano !== S.izabrano) {
    S.mapaIzabrano = S.izabrano;
    S.mapaTacke.forEach(function (g, i) { g.classList.toggle('je-izabrano', i === S.izabrano); });
    /* Tab ulazi u mapu na izabranom djelu — osim dok je fokus već u mapi */
    if (S.izabrano >= 0 && !(el.mapa && el.mapa.contains(document.activeElement))) { tackaUFokus(S.izabrano, false); }
  }
}

/* SAVJETI: tri sličice pri svakom ulasku. Isti prozor otvara i
   dugme „?“ u gornjoj traci. */
/* Dok su savjeti otvoreni, ostatak sale (platno, gornja traka, panel,
   traka ispod) je `inert` — ni Tab ni čitač ekrana ne odlaze iza prozora. */
function iza(ukljuci) {
  [el.platno, el.hud, el.panel, el.alati, el.poruka].forEach(function (e) {
    if (!e) { return; }
    if (ukljuci) { e.setAttribute('inert', ''); } else { e.removeAttribute('inert'); }
  });
}
function pokaziSavjete() {
  if (!el.savjeti) { return; }
  /* Fokus se vraća onome ko je otvorio (dugme „?“), inače platnu */
  const a = /** @type {HTMLElement} */ (document.activeElement);
  S.savjetiPovratak = a && a !== document.body && korijen.contains(a) && !el.savjeti.contains(a) &&
    a.getClientRects().length && a !== (S.render && S.render.domElement) ? a : null;
  el.savjeti.hidden = false;
  korijen.setAttribute('data-savjeti', 'da');
  iza(true);
  const prvo = /** @type {HTMLElement} */ (el.savjeti.querySelector('[data-savjeti-tura]'));
  if (prvo) {
    try { prvo.focus({ preventScroll: true }); } catch (e) { prvo.focus(); }
  }
  /* Na telefonu sala počinje niže na strani — prozor mora cio da se vidi */
  const r = el.savjeti.getBoundingClientRect();
  if (r.bottom > window.innerHeight || r.top < 0) {
    try { el.savjeti.scrollIntoView({ block: 'nearest' }); } catch (e) { /* stari pregledači */ }
  }
}

function zatvoriSavjete(vratiFokus) {
  if (!el.savjeti || el.savjeti.hidden) { return; }
  /* Fokus u prozoru koji nestaje pao bi na <body> — vraća se i kad
     pozivalac to nije tražio, osim kad izričito kaže `false`. */
  const unutra = el.savjeti.contains(document.activeElement);
  el.savjeti.hidden = true;
  korijen.removeAttribute('data-savjeti');
  iza(false);
  const cilj = S.savjetiPovratak && S.savjetiPovratak.isConnected ? S.savjetiPovratak : (S.render && S.render.domElement);
  S.savjetiPovratak = null;
  if (vratiFokus !== false && (vratiFokus || unutra) && cilj) {
    try { cilj.focus({ preventScroll: true }); } catch (e) { cilj.focus(); }
  }
}

function savjetiOtvoreni() {
  return !!(el.savjeti && !el.savjeti.hidden);
}

/* ---------------------------------------------------------
   Panel sa podacima o djelu

   Panel je role="region" + aria-live, a NE role="dialog", i
   NAMJERNO ne otima fokus. Prije je panel bio dijalog koji je na
   otvaranju fokusirao dugme X — tada je imalo smisla, jer se
   otvarao samo na izričit klik. Sada se otvara i sam, svaki put
   kad strelica odvede kameru do sljedećeg djela; da pri tome
   skače fokus, strelice bi prestale da rade posle prve. Zato
   panel samo najavljuje izabrano djelo (aria-live="polite"), a
   fokus ostaje na platnu. Tabom se do panela dolazi normalno.
   --------------------------------------------------------- */
function otvoriPanel(djelo) {
  if (!djelo) { return; }
  el.pNaziv.textContent = djelo.naziv || '—';
  el.pKat.textContent = (S.serije && S.serije[djelo.kategorija]) || (djelo.kategorija === 'crtezi' ? TEKST.crtez : TEKST.ulje);
  el.pGodina.textContent = djelo.godina != null ? String(djelo.godina) : '—';
  el.pTehnika.textContent = djelo.tehnika || '—';
  el.pDimenzije.textContent = djelo.dimenzije || '—';
  el.pOpis.textContent = djelo.opis || '';
  el.pLink.setAttribute('href', 'djelo/' + encodeURIComponent(djelo.id || '') + '.html');
  postaviKarticu(false);
  korijen.setAttribute('data-panel', 'otvoren');
  /* Petlja se namjerno NE pauzira dok je panel otvoren — sala ostaje živa iza njega. */
}

/* Zatvaranje panela vraća fokus na platno. Bez ovoga fokus pada na <body>
   (dugme X nestaje u visibility:hidden), pa korisnik na tastaturi izgubi
   mjesto: sljedeći Tab kreće od vrha stranice, a tipke za kretanje ne
   rade dok se ne klikne u salu.
   `vratiFokus = false` koristi se kad je fokus već svojom voljom otišao
   van galerije — tada ga ne otimamo natrag, to bi bila zamka. */
function zatvoriPanel(vratiFokus) {
  const biloOtvoreno = panelOtvoren();
  korijen.removeAttribute('data-panel');
  if (vratiFokus === false || !biloOtvoreno) { return; }
  if (S.radi && S.render && S.render.domElement) {
    try { S.render.domElement.focus({ preventScroll: true }); }
    catch (e) { S.render.domElement.focus(); }
  }
}

function panelOtvoren() {
  return korijen.getAttribute('data-panel') === 'otvoren';
}

/* Natpis na prelaz miša: kućica sa istim tekstom kao kartica na zidu.
   Samo za miš — na dodir nema "hover", tamo dodir otvara panel. */
function natpis(i, x, y) {
  if (i >= 0) { korijen.setAttribute('data-nad-djelom', ''); } else { korijen.removeAttribute('data-nad-djelom'); }
  if (i < 0 || i === S.izabrano || S.lupa.na || !S.mjesta[i]) {
    if (S.natpis) { S.natpis.hidden = true; S.natpis.dataset.i = ''; }
    return;
  }
  if (!S.natpis) {
    const n = document.createElement('div');
    n.className = 'galerija-natpis';
    n.setAttribute('aria-hidden', 'true');   /* panel već najavljuje djelo čitaču ekrana */
    n.innerHTML = '<span class="galerija-natpis__autor">Marko Dumnić</span>' +
      '<strong class="galerija-natpis__naziv"></strong>' +
      '<span class="galerija-natpis__red"></span><span class="galerija-natpis__red"></span>' +
      '<span class="galerija-natpis__serija"></span>';
    el.platno.appendChild(n);
    S.natpis = n;
  }
  const n = S.natpis;
  if (n.dataset.i !== String(i)) {
    const d = S.mjesta[i].djelo;
    const redovi = n.querySelectorAll('.galerija-natpis__red');
    n.querySelector('.galerija-natpis__naziv').textContent = d.naziv || '';
    redovi[0].textContent = [d.godina, d.tehnika].filter(function (v) { return v != null && v !== ''; }).join(' · ');
    redovi[1].textContent = d.dimenzije || '';
    n.querySelector('.galerija-natpis__serija').textContent = (S.serije && S.serije[d.kategorija]) || '';
    n.dataset.i = String(i);
  }
  n.hidden = false;
  const r = el.platno.getBoundingClientRect();
  const w = n.offsetWidth, h = n.offsetHeight;
  let lx = x - r.left + 18, ly = y - r.top + 18;
  if (lx + w > r.width - 8) { lx = x - r.left - w - 14; }
  if (ly + h > r.height - 8) { ly = y - r.top - h - 14; }
  n.style.transform = 'translate(' + Math.max(8, lx) + 'px,' + Math.max(8, ly) + 'px)';
}

Object.assign(G, {
  stanje, na2D, najavi, osvjeziKretanje, napraviMapu, velicinaMeta, osvjeziMapu, pokaziSavjete,
  zatvoriSavjete, savjetiOtvoreni, otvoriPanel, zatvoriPanel, panelOtvoren, natpis
});
G.dijelovi.push('ui');

})();
