/* =========================================================
   Virtuelna galerija — telefon
   Kartica djela koja se sklapa (uspravni telefon) i režim preko
   cijelog ekrana: trake sa dugmadima, list „Opcije“, „čisto“ (samo
   slika).
   ========================================================= */

(function () {
'use strict';

const G = window.__galerija;
const { korijen, el, S, sada, poruka } = G;   /* osnova.js */
const { TEKST } = G;   /* tekstovi.js */

/* Kartica djela na uspravnom telefonu (panel odozdo): svako novo djelo
   je otvara SKLOPLJENU — vide se serija i naziv, a slika ostaje
   slobodna. Strelica, dodir na naziv ili prevlačenje nagore je
   izvlači. Na ostalim ekranima panel je sa strane i CSS ovo stanje
   ne koristi (strelica se tamo ni ne prikazuje). */
function postaviKarticu(puna) {
  korijen.setAttribute('data-kartica', puna ? 'puna' : 'sklopljena');
  if (el.panelVise) {
    el.panelVise.setAttribute('aria-expanded', puna ? 'true' : 'false');
    el.panelVise.lastChild.textContent = puna ? TEKST.karticaManje : TEKST.karticaVise;
  }
  if (!puna && el.panel) { el.panel.scrollTop = 0; }
  /* Preko cijelog ekrana sklopljena kartica nestaje — fokus iz nje ide
     na natpis u donjoj traci, koji je ponovo otvara. */
  if (!puna && el.mob && uronjeno()) { fokusUTraku(el.panel, el.mob.natpis); }
}

function karticaPuna() {
  return korijen.getAttribute('data-kartica') === 'puna';
}

/* Da li je panel sada kartica koja se sklapa: na telefonu preko cijelog
   ekrana (strelica je tamo skrivena, pa se režim provjerava direktno)
   ili kao kartica odozdo, kad se strelica vidi. */
function karticaSeSklapa() {
  return uronjeno() || !!(el.panelVise && el.panelVise.getClientRects().length);
}

function pripremiKarticu() {
  if (!el.panel || !el.panelZatvori) { return; }
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'galerija-panel__vise';
  b.setAttribute('aria-controls', 'galerija-panel');
  b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 15l6-6 6 6" /></svg>' +
    '<span class="vizuelno-skriveno"></span>';
  el.panelZatvori.insertAdjacentElement('afterend', b);
  el.panelVise = b;
  /* Dodir na tekst panela bi fokus spustio na <body>, a fokusIzasao to
     čita kao odlazak iz sale i zatvara panel. Panel zato prima fokus sam
     (tabindex -1: klikom da, Tabom ne). */
  el.panel.setAttribute('tabindex', '-1');
  postaviKarticu(false);
  b.addEventListener('click', function () { postaviKarticu(!karticaPuna()); });

  /* Dodir bilo gdje na sklopljenoj kartici je izvlači; na punoj, dodir
     na seriju ili naziv je vraća. Dugmad i veza rade svoje. */
  el.panel.addEventListener('click', function (e) {
    if (!karticaSeSklapa() || (e.target.closest && e.target.closest('a, button'))) { return; }
    if (!karticaPuna()) { postaviKarticu(true); }
    else if (e.target.closest('.galerija-panel__oznaka, .galerija-panel__naziv')) { postaviKarticu(false); }
  });

  /* Prevlačenje: nagore izvlači, nadolje sklapa — ali samo kad tekst
     u kartici nije odskrolovan, da skrol opisa ne sklopi karticu. */
  let dodir = null;
  el.panel.addEventListener('touchstart', function (e) {
    dodir = e.touches.length === 1 && karticaSeSklapa()
      ? { y: e.touches[0].clientY, vrh: el.panel.scrollTop } : null;
  }, { passive: true });
  el.panel.addEventListener('touchend', function (e) {
    if (!dodir || !e.changedTouches.length) { dodir = null; return; }
    const dy = e.changedTouches[0].clientY - dodir.y;
    if (dy < -30 && !karticaPuna()) { postaviKarticu(true); }
    else if (dy > 30 && karticaPuna() && dodir.vrh <= 0) { postaviKarticu(false); }
    dodir = null;
  }, { passive: true });
}

/* ---------------------------------------------------------
   TELEFON: sala preko cijelog ekrana, slika u centru
   Na uskom ekranu (i na položenom telefonu) sala čim se uđe prekrije
   cijeli ekran, a dugmad su svedena na dvije tanke trake preko kadra:
   gore „Izađi“ i „?“, dolje ◀ naziv ▶ i „Opcije“. Sve ostalo (obilazak,
   pregled, druga sala, uglovi, bočno svjetlo, lupa, mapa) je isti
   blok .galerija-alati, samo izvučen kao list odozdo na „Opcije“.
   Kartica djela se ne otvara sama — dodir na naziv je izvlači.
   Dodir na izabranu sliku sakrije i trake, pa ostaje samo slika
   (data-cisto). Nova dugmad samo okidaju postojeća, pa logika ostaje
   na jednom mjestu.
   --------------------------------------------------------- */
const UZAK_EKRAN = '(max-width: 720px), (max-height: 500px) and (pointer: coarse)';
const UZAK = window.matchMedia ? window.matchMedia(UZAK_EKRAN) : null;   /* jedan upit; .matches prati promjenu */

function uronjeno() {
  return document.documentElement.classList.contains('galerija-uronjena');
}

function osvjeziUronjeno() {
  const st = korijen.getAttribute('data-stanje');
  const da = (st === 'soba' || st === 'ucitavanje') &&
    !!(UZAK && UZAK.matches);
  document.documentElement.classList.toggle('galerija-uronjena', da);
  if (!da) {
    postaviOpcije(false);
    korijen.removeAttribute('data-cisto');
  }
}

/* Fokus iz lista ili kartice koji se upravo sakriva ide na vidljivo
   dugme u traci. Inače padne na <body>, a fokusIzasao to čita kao
   odlazak iz sale i vraća na pregled. */
function fokusUTraku(iz, na) {
  if (!iz || !na || !iz.contains(document.activeElement)) { return; }
  try { na.focus({ preventScroll: true }); } catch (e) { na.focus(); }
}

function postaviOpcije(otvori) {
  if (otvori) {
    korijen.setAttribute('data-opcije', 'otvorene');
    /* Fokus ulazi u list (prvo vidljivo dugme, × u glavi); zatvaranje
       ga vraća na dugme „Opcije“ (fokusUTraku ispod). */
    const prvo = dugmadOpcija()[0];
    /* List ulazi uz prelaz visibility, pa je do prvog kadra prelaza još
       skriven i ne prima fokus — pokušava se iz kadra u kadar, najviše
       2 s (spor uređaj), dok fokus ne uđe. */
    const kraj = sada() + 2000;
    const fokus = function () {
      if (!prvo || !opcijeOtvorene() || el.alati.contains(document.activeElement)) { return; }
      try { prvo.focus({ preventScroll: true }); } catch (e) { prvo.focus(); }
      if (document.activeElement !== prvo && sada() < kraj) { window.requestAnimationFrame(fokus); }
    };
    fokus();
  } else {
    korijen.removeAttribute('data-opcije');
    if (el.mob) { fokusUTraku(el.alati, el.mob.opcije); }
  }
  if (el.mob) { el.mob.opcije.setAttribute('aria-expanded', otvori ? 'true' : 'false'); }
}

function opcijeOtvorene() {
  return korijen.getAttribute('data-opcije') === 'otvorene';
}

/* Vidljiva dugmad i tačke mape u listu „Opcije“, redom za Tab */
function dugmadOpcija() {
  if (!el.alati) { return []; }
  return Array.prototype.slice.call(el.alati.querySelectorAll('button, [href], [tabindex]:not([tabindex="-1"])'))
    .filter(function (d) { return d.getClientRects().length && !d.disabled; });
}

function prebaciCisto() {
  const cisto = korijen.getAttribute('data-cisto') !== 'da';
  if (cisto) {
    korijen.setAttribute('data-cisto', 'da');
    postaviOpcije(false);
    postaviKarticu(false);
    poruka(TEKST.cistoNazad, 2200);
  } else {
    korijen.removeAttribute('data-cisto');
  }
}

/* Prvi izbor djela na telefonu, jednom po posjeti: kratko „dodir na
   sliku sakriva dugmad“ — inače se taj pokret ne bi ni otkrio. */
function savjetCisto() {
  if (!uronjeno() || S.cistoRecen || S.tura) { return; }
  S.cistoRecen = true;
  poruka(TEKST.cistoSavjet, 2600);
}

const IKONA = {
  lijevo: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>',
  desno: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7" /></svg>',
  x: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>',
  opcije: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h10M18 7h2M4 17h4M12 17h8" /><circle cx="16" cy="7" r="2" /><circle cx="10" cy="17" r="2" /></svg>',
  info: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7.5v.01" /></svg>',
  kreni: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10-6.5z" /></svg>'
};

function pripremiMob() {
  const scena = korijen.querySelector('.galerija-scena');
  if (!scena || !el.alati) { return; }
  const tekstOd = function (b, rezerva) {
    const s = b && b.querySelector('.vizuelno-skriveno');
    return (s && s.textContent.trim()) || (b && b.getAttribute('aria-label')) || (b && b.textContent.trim()) || rezerva;
  };
  const m = document.createElement('div');
  m.className = 'galerija-mob';
  m.innerHTML =
    '<div class="galerija-mob__vrh">' +
      '<button class="galerija-mob__dugme galerija-mob__izadji" type="button" data-mob="izadji">' + IKONA.x + '<span></span></button>' +
      '<span class="galerija-mob__gdje"></span>' +
      '<button class="galerija-mob__dugme galerija-mob__krug" type="button" data-mob="pomoc">?</button>' +
    '</div>' +
    '<div class="galerija-mob__dno">' +
      '<button class="galerija-mob__tura" type="button" data-mob="tura" hidden></button>' +
      '<div class="galerija-mob__red">' +
        '<button class="galerija-mob__dugme galerija-mob__strelica" type="button" data-mob="prethodni">' + IKONA.lijevo + '</button>' +
        '<button class="galerija-mob__natpis" type="button" data-mob="natpis">' +
          '<span class="galerija-mob__kreni">' + IKONA.kreni + '</span>' +
          '<span class="galerija-mob__tekst"><span class="galerija-mob__naziv"></span><span class="galerija-mob__meta"></span></span>' +
          '<span class="galerija-mob__info">' + IKONA.info + '</span>' +
        '</button>' +
        '<button class="galerija-mob__dugme galerija-mob__strelica" type="button" data-mob="sljedeci">' + IKONA.desno + '</button>' +
        '<button class="galerija-mob__dugme galerija-mob__opcije" type="button" data-mob="opcije" aria-expanded="false" aria-controls="galerija-alati">' + IKONA.opcije + '</button>' +
      '</div>' +
    '</div>' +
    '<button class="galerija-mob__zastor" type="button" data-mob="zastor" tabindex="-1" aria-hidden="true"></button>';
  scena.appendChild(m);

  const d = function (ime) { return m.querySelector('[data-mob="' + ime + '"]'); };
  el.mob = {
    korijen: m,
    gdje: m.querySelector('.galerija-mob__gdje'),
    natpis: d('natpis'),
    naziv: m.querySelector('.galerija-mob__naziv'),
    meta: m.querySelector('.galerija-mob__meta'),
    tura: d('tura'),
    opcije: d('opcije')
  };
  d('izadji').lastChild.textContent = (el.izadji && el.izadji.textContent.trim()) || TEKST.zatvori;
  d('pomoc').setAttribute('aria-label', tekstOd(el.pomoc, '?'));
  d('prethodni').setAttribute('aria-label', tekstOd(el.prethodni, '◀'));
  d('sljedeci').setAttribute('aria-label', tekstOd(el.sljedeci, '▶'));
  el.mob.opcije.setAttribute('aria-label', TEKST.opcije);

  /* Nova dugmad okidaju postojeća — ista logika, isto pauziranje ture */
  const okini = function (b) { return function () { if (b) { b.click(); } }; };
  d('izadji').addEventListener('click', okini(el.izadji));
  d('pomoc').addEventListener('click', okini(el.pomoc));
  d('prethodni').addEventListener('click', okini(el.prethodni));
  d('sljedeci').addEventListener('click', okini(el.sljedeci));
  el.mob.tura.addEventListener('click', okini(el.tura));
  el.mob.natpis.addEventListener('click', function () {
    if (S.izabrano >= 0) { postaviKarticu(!karticaPuna()); }
    else if (el.tura) { el.tura.click(); }
  });
  el.mob.opcije.addEventListener('click', function () {
    postaviKarticu(false);
    postaviOpcije(korijen.getAttribute('data-opcije') !== 'otvorene');
  });
  d('zastor').addEventListener('click', function () { postaviOpcije(false); });

  /* Glava lista „Opcije“: naslov i ×. Na većim ekranima je skrivena. */
  const glava = document.createElement('div');
  glava.className = 'galerija-alati__glava';
  glava.innerHTML = '<span class="galerija-alati__naslov"></span>' +
    '<button class="galerija-mob__dugme galerija-mob__krug" type="button" data-mob="zatvori-opcije">' + IKONA.x + '</button>';
  glava.firstChild.textContent = TEKST.opcije;
  glava.lastChild.setAttribute('aria-label', TEKST.zatvori);
  glava.lastChild.addEventListener('click', function () { postaviOpcije(false); });
  el.alati.insertBefore(glava, el.alati.firstChild);
  /* Izbor u listu ga zatvara — posjetilac odmah vidi šta je uradio */
  el.alati.addEventListener('click', function (e) {
    if (!uronjeno() || !e.target.closest) { return; }
    const b = e.target.closest('button, [data-mapa-djelo]');
    if (b && !b.hasAttribute('data-mob')) { postaviOpcije(false); }
  });

  if (UZAK) {
    const promjena = function () { osvjeziUronjeno(); };
    if (UZAK.addEventListener) { UZAK.addEventListener('change', promjena); }
    else if (UZAK.addListener) { UZAK.addListener(promjena); }
  }
  osvjeziMob();
}

function osvjeziMob() {
  const m = el.mob;
  if (!m) { return; }
  const n = S.mjesta.length;
  const tura = el.tura && (el.tura.querySelector('.galerija-tura__tekst') || el.tura).textContent;
  m.gdje.textContent = S.sala === 2 ? TEKST.sala2 : TEKST.sala1;
  const djelo = S.izabrano >= 0 && S.mjesta[S.izabrano] ? S.mjesta[S.izabrano].djelo : null;
  if (djelo) {
    m.naziv.textContent = djelo.naziv || '—';
    m.meta.textContent = [djelo.godina, (S.izabrano + 1) + ' / ' + n]
      .filter(function (v) { return v != null && v !== ''; }).join(' · ');
    m.natpis.setAttribute('aria-label', (djelo.naziv || '') + ' — ' + TEKST.oDjelu);
    m.natpis.setAttribute('aria-controls', 'galerija-panel');
  } else {
    m.naziv.textContent = tura || TEKST.tura;
    m.meta.textContent = TEKST.iliDodir;
    m.natpis.removeAttribute('aria-label');
    m.natpis.removeAttribute('aria-controls');
  }
  m.tura.hidden = !(S.tura && djelo);
  if (S.tura && djelo) { m.tura.textContent = tura; }
}

Object.assign(G, {
  postaviKarticu, pripremiKarticu, uronjeno, osvjeziUronjeno, fokusUTraku, postaviOpcije, opcijeOtvorene,
  dugmadOpcija, prebaciCisto, savjetCisto, pripremiMob, osvjeziMob
});
G.dijelovi.push('telefon');

})();
