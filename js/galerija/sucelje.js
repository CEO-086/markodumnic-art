// @ts-check
/* =========================================================
   Virtuelna galerija — js/galerija/sucelje.js
   Tri dijela: telefon (kartica i režim preko cijelog ekrana), ui
   (stanja prikaza, 2D, mapa, savjeti, panel) i izbliza (Izbliza i
   Lupa). Svaki je u svom omotaču i prijavljuje se sam.
   ========================================================= */

/* =========================================================
   Virtuelna galerija — telefon
   Kartica djela koja se sklapa (uspravni telefon) i režim preko
   cijelog ekrana: trake sa dugmadima, list „Opcije“, „čisto“ (samo
   slika).
   ========================================================= */

(function () {
'use strict';

/** @type {Galerija} */
const G = /** @type {any} */ (window).__galerija;
const { korijen, el, S, jeDruga, sada, poruka } = G;   /* osnova.js */
const { TEKST } = G;   /* tekstovi, osnova.js */

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
  el.panel.addEventListener('click', /** @param {MouseEvent & { target: any }} e */ function (e) {
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
  /** @type {Element} */ (glava.lastChild).setAttribute('aria-label', TEKST.zatvori);
  glava.lastChild.addEventListener('click', function () { postaviOpcije(false); });
  el.alati.insertBefore(glava, el.alati.firstChild);
  /* Izbor u listu ga zatvara — posjetilac odmah vidi šta je uradio */
  el.alati.addEventListener('click', /** @param {MouseEvent & { target: any }} e */ function (e) {
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
  const krug = G.krugObilaska ? G.krugObilaska() : [];   /* kretanje.js */
  const n = krug.length;
  const tura = el.tura && (el.tura.querySelector('.galerija-tura__tekst') || el.tura).textContent;
  m.gdje.textContent = jeDruga(S.sala) ? TEKST.sala2 : TEKST.sala1;
  const djelo = S.izabrano >= 0 && S.mjesta[S.izabrano] ? S.mjesta[S.izabrano].djelo : null;
  if (djelo) {
    m.naziv.textContent = djelo.naziv || '—';
    m.meta.textContent = [djelo.godina, (krug.indexOf(G.stanica(S.izabrano)) + 1) + ' / ' + n]
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
const { izKorijena, SOBA, POLA_X, POLA_Z, VIDNO_POLJE, PROLAZ, korijen, el, S, jeDruga } = G;   /* osnova.js */
const { EN, IT, TEKST } = G;   /* tekstovi, osnova.js */
const { postaviKarticu, uronjeno, osvjeziUronjeno, osvjeziMob } = G;   /* telefon, sucelje.js */

/* ---------------------------------------------------------
   Stanja prikaza i 2D rezerva
   --------------------------------------------------------- */

/* Postavlja stanje prikaza: 'ulaz' | 'ucitavanje' | 'soba' | '2d' */
function stanje(novo) {
  korijen.setAttribute('data-stanje', novo);
  osvjeziUronjeno();
}

/* Računar: visina trake ispod sale (dugmad i mapa, sa razmakom iznad)
   ide u CSS kao --visina-trake, pa CSS na nižem ekranu skrati salu
   toliko da i sala i traka stanu ispod zaglavlja. Traka ne zavisi od
   visine sale, pa nema kruga. Mjeri se na ulasku i kad se mijenja prozor. */
function izmjeriTraku() {
  const a = el.alati;
  if (!a || !a.getClientRects().length) { return; }
  const v = Math.ceil(a.getBoundingClientRect().height +
    (parseFloat(getComputedStyle(a).marginTop) || 0)) + 'px';
  if (korijen.style.getPropertyValue('--visina-trake') !== v) {
    korijen.style.setProperty('--visina-trake', v);
  }
}

/* Računar: po ulasku sala sa trakom ispod nje stoji u sredini dijela
   ekrana ispod zaglavlja (CSS ih skrati tako da ostane bar RAZMAK_SALE
   gore i dolje). Na vrlo niskom prozoru, gdje ni to ne pomaže, sala je
   cijela na ekranu, do RAZMAK_SALE ispod zaglavlja. Na telefonu je sala
   preko cijelog ekrana — tu se ne dira. */
const RAZMAK_SALE = 16;   /* = --s-4 u css/galerija.css */
function centrirajSalu() {
  if (uronjeno()) { return; }
  const scena = korijen.querySelector('.galerija-scena');
  if (!scena || !scena.getClientRects().length) { return; }
  const zaglavlje = document.querySelector('.zaglavlje');
  const gore = zaglavlje ? Math.max(0, zaglavlje.getBoundingClientRect().bottom) : 0;
  const vrh = scena.getBoundingClientRect().top;
  const donji = el.alati && el.alati.getClientRects().length ? el.alati : scena;
  const visina = donji.getBoundingClientRect().bottom - vrh;
  const prostor = window.innerHeight - gore;
  const razmak = visina <= prostor ? (prostor - visina) / 2
    : Math.min(RAZMAK_SALE, Math.max(0, (prostor - scena.getBoundingClientRect().height) / 2));
  const pomak = Math.round(vrh - (gore + razmak));
  if (Math.abs(pomak) < 2) { return; }
  /* Skok, ne klizanje: sala se upravo pojavljuje, a savjeti odmah
     poslije čitaju gdje su na ekranu. */
  const h = document.documentElement;
  const bilo = h.style.scrollBehavior;
  h.style.scrollBehavior = 'auto';
  window.scrollBy(0, pomak);
  h.style.scrollBehavior = bilo;
}

/* „Uđi u galeriju“ sa početne: sala se namjesti još dok se učitava,
   tačno tamo gdje će stajati kad se otvori, pa se poslije ne pomjeri.
   Raspored otvorene sale (sala + traka sa mapom) se samo izmjeri: stanje
   se vrati u istom potezu, prije iscrtavanja, pa se na ekranu ništa ne
   promijeni. Mapa se ovdje crta prazna (iste je veličine kao puna);
   pokreni je nacrta ponovo sa djelima. */
function centrirajSaluUnaprijed() {
  const bilo = korijen.getAttribute('data-stanje');
  if (!bilo || bilo === 'soba') { centrirajSalu(); return; }
  if (el.mapa && !el.mapa.firstChild) { napraviMapu(); }
  korijen.setAttribute('data-stanje', 'soba');
  izmjeriTraku();
  centrirajSalu();
  korijen.setAttribute('data-stanje', bilo);
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
    el.sala.textContent = jeDruga(S.sala) ? TEKST.salaNazad : TEKST.salaDruga;
    el.sala.hidden = !S.mjesta.some(function (m) { return jeDruga(m.soba); });
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
   velike sale gore, mala sala ispod, iza prolaza). */
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
  /* „Sala 1“ je ona u koju se ulazi (vidi POCETNA_SALA) */
  natpisSale(jeDruga(1) ? TEKST.sala2 : TEKST.sala1, 0.4);
  natpisSale(jeDruga(2) ? TEKST.sala2 : TEKST.sala1, z0 + SD / 2 + 0.4);

  S.mapaTacke = [];
  S.mjesta.forEach(function (m, i) {
    /* Jedna Tab-stanica za cijelu mapu (roving tabindex): strelice
       idu od tačke do tačke, Enter / razmak vode do djela. */
    const g = svgEl('g', { class: 'galerija-mapa__djelo', tabindex: i === 0 ? '0' : '-1', role: 'button', 'data-mapa-djelo': String(i) });
    /* Crteži iz zida nemaju svoju tačku: zid (ciklus) ima jednu, u sredini */
    if (m.zid != null) { g.setAttribute('display', 'none'); g.setAttribute('aria-hidden', 'true'); }
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
    const idi = function () { G.pauzirajTuru(); G.izaberi(i); };   /* kamera, kretanje.js */
    /* Mete (bar 24 px) susjednih tačaka se preklapaju — crteži su na
       mapi ~6 px jedan od drugog — pa klik ide tački najbližoj mjestu
       klika, a ne meti koja je slučajno nacrtana posljednja. */
    g.addEventListener('click', function (e) {
      const j = e.detail ? najblizaTacka(e.clientX, e.clientY, i) : i;
      G.pauzirajTuru();
      G.izaberi(j);
    });
    g.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); idi(); return; }
      const n = S.mapaTacke.length;
      let j = -1;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { j = (i + 1) % n; }
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { j = (i - 1 + n) % n; }
      else if (e.key === 'Home') { j = 0; }
      else if (e.key === 'End') { j = n - 1; }
      if (j < 0) { return; }
      /* skrivene tačke (crteži iz zida) se preskaču */
      const korak = (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'End') ? -1 : 1;
      for (let s = 0; s < n && S.mjesta[j] && S.mjesta[j].zid != null; s++) { j = (j + korak + n) % n; }
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

/* Tačka mape čiji je centar najbliži tački na ekranu (x, y) */
function najblizaTacka(x, y, inace) {
  let naj = inace, min = Infinity;
  S.mapaTacke.forEach(function (g, k) {
    const c = g.querySelector('.galerija-mapa__tacka');
    if (!c || g.getAttribute('display') === 'none') { return; }
    const r = c.getBoundingClientRect();
    const d = Math.hypot(r.left + r.width / 2 - x, r.top + r.height / 2 - y);
    if (d < min) { min = d; naj = k; }
  });
  return naj;
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
    const tacka = S.izabrano >= 0 && G.stanica ? G.stanica(S.izabrano) : S.izabrano;   /* crtež → njegov zid */
    S.mapaTacke.forEach(function (g, i) { g.classList.toggle('je-izabrano', i === tacka); });
    /* Tab ulazi u mapu na izabranom djelu — osim dok je fokus već u mapi */
    if (tacka >= 0 && !(el.mapa && el.mapa.contains(document.activeElement))) { tackaUFokus(tacka, false); }
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
  /* Zid crteža (ciklus) nema svoju stranicu — samo crteži u njemu */
  el.pLink.hidden = !djelo.id;
  clanoviUPanelu();
  postaviKarticu(false);
  korijen.setAttribute('data-panel', 'otvoren');
  /* Petlja se namjerno NE pauzira dok je panel otvoren — sala ostaje živa iza njega. */
}

/* Crteži ciklusa u panelu: kad je izabran zid crteža (ili crtež iz
   njega), ispod opisa stoji pet sličica sa nazivima; sličica vodi
   kameru izbliza pred taj crtež. Za ostala djela lista je skrivena. */
function clanoviUPanelu() {
  const m = S.mjesta[S.izabrano];
  const zid = m ? (m.clanovi ? S.izabrano : (m.zid != null ? m.zid : -1)) : -1;
  let lista = S.panelClanovi;
  if (zid < 0) {
    if (lista) { lista.hidden = true; }
    return;
  }
  if (!lista) {
    lista = document.createElement('ul');
    lista.className = 'galerija-panel__clanovi';
    lista.setAttribute('aria-label', TEKST.clanovi);
    el.pOpis.insertAdjacentElement('afterend', lista);
    S.panelClanovi = lista;
  }
  if (lista.dataset.zid !== String(zid)) {
    lista.textContent = '';
    (S.mjesta[zid].clanovi || []).forEach(function (i) {
      const d = S.mjesta[i].djelo;
      const li = document.createElement('li');
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'galerija-panel__clan';
      b.dataset.mjesto = String(i);
      const img = document.createElement('img');
      img.src = izKorijena('img/sala/' + d.id + '-160.webp');
      img.alt = '';
      img.width = 60; img.height = 84;
      img.loading = 'lazy';
      img.decoding = 'async';
      const s = document.createElement('span');
      s.textContent = d.naziv || '';
      b.appendChild(img);
      b.appendChild(s);
      b.addEventListener('click', function () { G.pauzirajTuru(); G.izaberi(i); });   /* kretanje.js */
      li.appendChild(b);
      lista.appendChild(li);
    });
    lista.dataset.zid = String(zid);
  }
  lista.querySelectorAll('.galerija-panel__clan').forEach(function (b) {
    if (b.getAttribute('data-mjesto') === String(S.izabrano)) { b.setAttribute('aria-current', 'true'); }
    else { b.removeAttribute('aria-current'); }
  });
  lista.hidden = false;
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
  /* Crtež iz zida pokazuje naziv zida (ciklusa) — osim kad je taj zid
     već izabran, tada se bira crtež u njemu pa natpis kaže koji */
  const izab = S.mjesta[S.izabrano];
  const mi = S.mjesta[i];
  if (mi.zid != null && S.izabrano !== mi.zid && !(izab && izab.zid === mi.zid)) { i = mi.zid; }
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
  stanje, izmjeriTraku, centrirajSalu, centrirajSaluUnaprijed, na2D, najavi, osvjeziKretanje, napraviMapu, velicinaMeta,
  osvjeziMapu, pokaziSavjete, zatvoriSavjete, savjetiOtvoreni, otvoriPanel, zatvoriPanel, panelOtvoren,
  natpis
});
G.dijelovi.push('ui');

})();

/* =========================================================
   Virtuelna galerija — Izbliza i Lupa
   Izbliza: djelo preko cijelog ekrana, iz fotografije pune veličine.
   Lupa: krug koji u sali uvećava dio djela ispod miša ili prsta.
   ========================================================= */

(function () {
'use strict';

/** @type {Galerija} */
const G = /** @type {any} */ (window).__galerija;
const { LUPA, MAX_TEKSTURA, korijen, el, S } = G;   /* osnova.js */
const { TEKST } = G;   /* tekstovi, osnova.js */
const { izvorDjela, izvorVelike, rasterizuj } = G;   /* teksture, scena.js */
const { panelOtvoren } = G;   /* ui, sucelje.js */

/* --- IZBLIZA: djelo preko cijelog ekrana, iz fotografije u najvećoj
       rezoluciji (slikaVelika). Odvojeno od lupe — lupa je krug koji
       uvećava dio slike u sali, a ovo je sama slika, bez sale. --- */
function otvoriIzbliza() {
  if (S.izabrano < 0 || S.izbliza || !S.mjesta[S.izabrano].mesh) { return; }
  const djelo = S.mjesta[S.izabrano].djelo;
  postaviLupu(false);
  const o = document.createElement('div');
  o.className = 'galerija-izbliza';
  o.setAttribute('role', 'dialog');
  o.setAttribute('aria-modal', 'true');
  o.setAttribute('aria-label', TEKST.izbliza + (djelo.naziv || TEKST.djelo));
  o.innerHTML =
    '<div class="galerija-izbliza__okno"><img class="galerija-izbliza__slika" alt="" draggable="false"></div>' +
    '<div class="galerija-izbliza__traka">' +
      '<p class="galerija-izbliza__opis"><strong></strong><span></span></p>' +
      '<p class="galerija-izbliza__savjet"></p>' +
      '<button type="button" class="galerija-izbliza__zatvori">' + TEKST.zatvori + ' <span aria-hidden="true">✕</span></button>' +
    '</div>';
  const okno = /** @type {HTMLElement} */ (o.querySelector('.galerija-izbliza__okno'));
  const img = o.querySelector('img');
  const savjet = o.querySelector('.galerija-izbliza__savjet');
  const dugme = /** @type {HTMLElement} */ (o.querySelector('.galerija-izbliza__zatvori'));
  img.alt = djelo.naziv || '';
  /* Okno sa slikom je fokusabilno: Enter / razmak prebacuju na punu
     veličinu (od sredine), a strelice skroluju sliku same od sebe —
     okno je overflow: auto, pa pregledač to radi bez ijedne linije koda. */
  okno.tabIndex = 0;
  okno.setAttribute('role', 'group');
  okno.setAttribute('aria-label', TEKST.slikaIzbliza(djelo.naziv || TEKST.djelo));
  o.querySelector('strong').textContent = djelo.naziv || '';
  o.querySelector('.galerija-izbliza__opis span').textContent =
    [djelo.godina, djelo.tehnika, djelo.dimenzije].filter(function (v) { return v != null && v !== ''; }).join(' · ');
  /* Prvo manja fotografija — ista kao tekstura na zidu, pa je već u
     kešu (JPG samo ako ona ne prođe) — pa velika kad stigne (AVIF, a
     JPG ako AVIF ne prođe). */
  const rezerva = djelo.slika || djelo.slikaVelika;
  img.onerror = function () { img.onerror = null; if (img.getAttribute('src') !== rezerva) { img.src = rezerva; } };
  img.src = izvorDjela(djelo) || rezerva;
  if (djelo.slikaVelika && djelo.slikaVelika !== djelo.slika) {
    const velika = new Image();
    velika.onload = function () { if (S.izbliza && S.izbliza.el === o) { img.onerror = null; img.src = velika.src; } };
    velika.onerror = function () {
      velika.onerror = null;
      if (velika.getAttribute('src') !== djelo.slikaVelika) { velika.src = djelo.slikaVelika; }
    };
    velika.src = izvorVelike(djelo);
  }

  let puna = false, vuce = null;
  function postaviSavjet() {
    savjet.textContent = puna ? TEKST.savjetPuna : TEKST.savjetCijela;
  }
  /* Klik: cijela slika ⇄ puna veličina (1 piksel fotografije = 1 piksel
     ekrana), sa tačkom na koju se kliknulo na sredini okna. */
  function prebaci(x, y) {
    const r = img.getBoundingClientRect();
    const ux = r.width ? (x - r.left) / r.width : 0.5;
    const uy = r.height ? (y - r.top) / r.height : 0.5;
    puna = !puna;
    o.classList.toggle('je-puna', puna);
    if (puna) {
      okno.scrollLeft = Math.max(0, ux * img.offsetWidth - okno.clientWidth / 2);
      okno.scrollTop = Math.max(0, uy * img.offsetHeight - okno.clientHeight / 2);
    }
    postaviSavjet();
  }
  okno.addEventListener('pointerdown', function (e) {
    if (e.button !== undefined && e.button !== 0) { return; }
    vuce = { x: e.clientX, y: e.clientY, sl: okno.scrollLeft, st: okno.scrollTop, put: 0, mis: e.pointerType === 'mouse' };
  });
  okno.addEventListener('pointermove', function (e) {
    if (!vuce) { return; }
    vuce.put = Math.max(vuce.put, Math.abs(e.clientX - vuce.x) + Math.abs(e.clientY - vuce.y));
    /* Prst skroluje sam (overflow: auto); mišem se vuče ručno */
    if (puna && vuce.mis) {
      okno.scrollLeft = vuce.sl - (e.clientX - vuce.x);
      okno.scrollTop = vuce.st - (e.clientY - vuce.y);
    }
  });
  okno.addEventListener('pointerup', function (e) {
    const v = vuce; vuce = null;
    if (!v || v.put > 6) { return; }
    if (e.target === img) { prebaci(e.clientX, e.clientY); }
    else if (!puna) { zatvoriIzbliza(); }   /* klik pored slike zatvara */
  });
  okno.addEventListener('pointercancel', function () { vuce = null; });
  dugme.addEventListener('click', function () { zatvoriIzbliza(); });
  /* Tipke se slušaju na dokumentu: poslije klika na sliku fokus nije na dugmetu */
  function tipka(e) {
    if (e.key === 'Escape' || e.key === 'Esc') { e.preventDefault(); e.stopPropagation(); zatvoriIzbliza(); }
    else if (e.key === 'Tab') {
      /* fokus ostaje u prozoru: kruži između slike i dugmeta */
      e.preventDefault();
      (document.activeElement === dugme ? okno : dugme).focus();
    }
    else if (puna && document.activeElement === okno && /^Arrow(Left|Right|Up|Down)$/.test(e.key)) {
      /* Strelice pomjeraju sliku. Pregledač bi skrolovao fokusirano okno i
         sam, ali ne svaki (i ne pouzdano dok kadar kasni) — zato izričito. */
      e.preventDefault();
      const korak = e.shiftKey ? 240 : 80;
      okno.scrollBy({
        left: e.key === 'ArrowLeft' ? -korak : e.key === 'ArrowRight' ? korak : 0,
        top: e.key === 'ArrowUp' ? -korak : e.key === 'ArrowDown' ? korak : 0
      });
    }
    else if ((e.key === 'Enter' || e.key === ' ') && document.activeElement !== dugme) {
      e.preventDefault();
      const r = okno.getBoundingClientRect();
      prebaci(r.left + r.width / 2, r.top + r.height / 2);
    }
  }
  document.addEventListener('keydown', tipka, true);
  postaviSavjet();
  document.body.appendChild(o);
  document.documentElement.classList.add('galerija-izbliza-otvoreno');
  S.izbliza = { el: o, povratak: document.activeElement, tipka: tipka };
  try { okno.focus({ preventScroll: true }); } catch (e) { okno.focus(); }
}

function zatvoriIzbliza() {
  const z = S.izbliza;
  if (!z) { return; }
  S.izbliza = null;
  document.removeEventListener('keydown', z.tipka, true);
  z.el.remove();
  document.documentElement.classList.remove('galerija-izbliza-otvoreno');
  if (z.povratak && z.povratak.focus) {
    try { z.povratak.focus({ preventScroll: true }); } catch (e) { z.povratak.focus(); }
  }
}

/* --- LUPA --- */
function postaviLupu(ukljuci) {
  const L = S.lupa;
  /* Lupa i Izbliza rade nad jednim platnom — za cijeli zid crteža ne */
  L.na = !!ukljuci && S.izabrano >= 0 && !!S.mjesta[S.izabrano].mesh;
  if (el.lupa) { el.lupa.setAttribute('aria-pressed', L.na ? 'true' : 'false'); }
  if (!L.na) {
    if (L.okvir) { L.okvir.hidden = true; }
    L.x = L.y = null;
    L.prst = null;
    return;
  }
  if (!L.okvir) {
    L.okvir = document.createElement('div');
    L.okvir.className = 'galerija-lupa';
    L.okvir.setAttribute('aria-hidden', 'true');
    L.okvir.hidden = true;
    L.platno = document.createElement('canvas');
    L.okvir.appendChild(L.platno);
    el.platno.appendChild(L.okvir);
  }
  /* Izvor u dvostrukoj rezoluciji, samo za izabrano djelo */
  const i = S.izabrano;
  if (L.za !== i) {
    L.za = i;
    L.izvor = null;
    const djelo = S.mjesta[i] && S.mjesta[i].djelo;
    if (djelo && djelo.slika) {
      /* Fotografija u punoj veličini (slikaVelika) samo za lupu */
      const maxStr = Math.min(MAX_TEKSTURA * 2, 4096);
      const jpg = djelo.slikaVelika || djelo.slika;
      const prvi = izvorVelike(djelo);
      rasterizuj(prvi, maxStr).catch(function (g) {
        if (prvi === jpg) { throw g; }
        return rasterizuj(jpg, maxStr);   /* AVIF nije prošao — JPG */
      }).then(function (c) {
        if (L.za === i) { L.izvor = c; osvjeziLupu(); }
      }).catch(function () { /* bez izvora nema lupe */ });
    }
  }
  /* Bez miša (dugme, tastatura) lupa se pojavi na sredini vidljivog dijela */
  if (L.x === null) {
    const v = vidljivo();
    L.x = (v.x0 + v.x1) / 2;
    L.y = (v.y0 + v.y1) / 2;
    L.odmak = 0;
  }
  osvjeziLupu();
}

/* Dio canvas-a koji se zaista vidi: okno sale reže platno (pomjereno
   ulijevo), a panel na telefonu pokriva donji dio. U pikselima canvas-a. */
function vidljivo() {
  const r = S.render.domElement.getBoundingClientRect();
  const okno = korijen.querySelector('.galerija-scena');
  const o = okno ? okno.getBoundingClientRect() : r;
  let x0 = Math.max(r.left, o.left), x1 = Math.min(r.right, o.right);
  let y0 = Math.max(r.top, o.top), y1 = Math.min(r.bottom, o.bottom);
  if (panelOtvoren() && el.panel) {
    const p = el.panel.getBoundingClientRect();
    if (p.width > 0 && p.left <= x0 + 2 && p.top > y0) { y1 = Math.min(y1, p.top); }  /* panel ispod */
    else if (p.width > 0 && p.left > x0) { x1 = Math.min(x1, p.left); }              /* panel desno */
  }
  return { x0: x0 - r.left, x1: x1 - r.left, y0: y0 - r.top, y1: y1 - r.top };
}

/* x, y — u pikselima unutar canvas-a; odmak — lupa iznad prsta */
function pomjeriLupu(clientX, clientY, dodir) {
  const L = S.lupa;
  if (!L.na) { return; }
  const r = S.render.domElement.getBoundingClientRect();
  L.x = clientX - r.left;
  L.y = clientY - r.top;
  L.odmak = dodir ? 1 : 0;
  osvjeziLupu();
}

/* Tačka djela ispod piksela (x, y) canvas-a, u pikselima izvora */
function tackaDjela(x, y, r, izvor) {
  const n = { x: (x / r.width) * 2 - 1, y: -(y / r.height) * 2 + 1 };
  S.raycaster.setFromCamera(n, S.kamera);
  const u = S.raycaster.intersectObject(S.mjesta[S.izabrano].mesh, false)[0];
  /* Samo lice platna (materijal 4), ne bokovi kutije */
  if (!u || !u.uv || !u.face || u.face.materialIndex !== 4) { return null; }
  return { x: u.uv.x * izvor.width, y: (1 - u.uv.y) * izvor.height };
}

/* Poziva se i iz petlje: dok kamera klizi, djelo ispod lupe se mijenja */
function osvjeziLupu() {
  const L = S.lupa;
  if (!L.na || !L.okvir || L.x === null || S.izabrano < 0) { return; }
  const izvor = L.izvor;
  const r = S.render.domElement.getBoundingClientRect();
  const t = izvor && tackaDjela(L.x, L.y, r, izvor);
  if (!t) { L.okvir.hidden = true; return; }

  /* Koliko piksela izvora staje u jedan piksel ekrana */
  const d = 6;
  const t2 = tackaDjela(L.x + d, L.y, r, izvor) || tackaDjela(L.x - d, L.y, r, izvor);
  if (t2) { L.skala = Math.max(0.05, Math.hypot(t2.x - t.x, t2.y - t.y) / d); }

  const v0 = vidljivo();
  const p = Math.round(Math.max(LUPA.min, Math.min(LUPA.max, Math.min(v0.x1 - v0.x0, v0.y1 - v0.y0) * LUPA.precnik)));
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = Math.round(p * dpr);
  if (L.platno.width !== w) { L.platno.width = L.platno.height = w; }
  L.okvir.style.width = L.okvir.style.height = p + 'px';

  /* Na dodir lupa stoji IZNAD prsta, da je prst ne zakloni.
     Uvijek ostaje cijela u vidljivom dijelu okna. */
  const v = v0;
  let cx = L.x;
  let cy = L.y - L.odmak * (p * 0.5 + 40);
  if (cy < v.y0 + p / 2) { cy = L.y + L.odmak * (p * 0.5 + 40); }
  cx = Math.max(v.x0 + p / 2, Math.min(v.x1 - p / 2, cx));
  cy = Math.max(v.y0 + p / 2, Math.min(v.y1 - p / 2, cy));
  L.okvir.style.transform = 'translate(' + Math.round(cx - p / 2) + 'px,' + Math.round(cy - p / 2) + 'px)';

  const g = L.platno.getContext('2d');
  const izrez = (p / LUPA.uvecanje) * L.skala;   /* stranica izreza u pikselima izvora */
  g.fillStyle = '#2A2119';
  g.fillRect(0, 0, w, w);
  g.imageSmoothingEnabled = true;
  g.imageSmoothingQuality = 'high';
  g.drawImage(izvor, t.x - izrez / 2, t.y - izrez / 2, izrez, izrez, 0, 0, w, w);
  L.okvir.hidden = false;
}

Object.assign(G, {
  otvoriIzbliza, zatvoriIzbliza, postaviLupu, pomjeriLupu, osvjeziLupu
});
G.dijelovi.push('izbliza');

})();
