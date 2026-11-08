/* =========================================================
   Najava galerije — početna stranica (index.html, en/, it/)

   Sala se sa početne otvara linkom galerija.html?ulaz (dugme u vrhu,
   slika i dugme u sekciji „Virtuelna galerija“). Bez ovoga sve što
   sala traži kreće tek posle klika. Ovdje se to tiho preuzme ranije,
   u keš pregledača (vendor/, img/ i js/galerija/ se keširaju dugo —
   vidi _headers i vercel.json), pa sala na klik nađe sve gotovo.

   Dva dijela:
     LAKI   (~300 KB) kad se početna smiri: Three.js, data/radovi.json,
            CSS i skripte stranice galerije (adrese sa ?v= čita iz same
            galerija.html, pa ih alati/verzije.py ne mora znati).
     TEŠKI  (računar ~4,5 MB, telefon ~3,3 MB) tek kad posjetilac
            doskroluje do sekcije „Virtuelna galerija“. Teksture sale,
            pa slike PRVE sale (sićušne, prave), pa reljef poteza.
   Uz „štedi podatke“ / prefers-reduced-data / 2G: ništa unaprijed.

   PAZI: izbor slike (izvorPrave) prepisuje izvoriDjela i izvorReljefa
   iz js/galerija/scena.js, a TELEFON iz js/galerija/osnova.js. Ako se
   tamo mijenjaju adrese ili pravila, mijenja se i ovdje — inače se
   preuzme fajl koji sala neće tražiti (ništa se ne kvari, samo je
   predučitavanje uzaludno).
   ========================================================= */
(function () {
  'use strict';

  if (!window.fetch || !window.Promise) { return; }
  var ja = document.currentScript;
  if (!ja || !ja.src) { return; }
  /* Skripta je u js/, korijen sajta je folder iznad */
  var KORIJEN = new URL('../', ja.src).href;
  var linkovi = document.querySelectorAll('a[href*="galerija.html?ulaz"]');
  if (!linkovi.length) { return; }
  var STRANA = new URL(linkovi[0].getAttribute('href'), location.href);
  STRANA.search = ''; STRANA.hash = '';

  function izKorijena(p) { return new URL(p, KORIJEN).href; }

  var veza = navigator.connection;
  var manjePodataka = window.matchMedia && window.matchMedia('(prefers-reduced-data: reduce)').matches;
  var STEDI = !!((veza && veza.saveData) || manjePodataka ||
    (veza && /(^|-)2g$/.test(veza.effectiveType || '')));

  /* Kao u osnova.js: telefon po KRAĆOJ strani ekrana */
  var TELEFON = Math.min((window.screen && screen.width) || 1024,
    (window.screen && screen.height) || 1024) < 700;

  /* ---- preuzimanje u keš ----
     <link rel="prefetch">: pregledač ga NE prekida kad se pređe na
     stranicu galerije (fetch() bi prekinuo, pa bi napola preuzeta slika
     propala — na sporoj vezi to je skoro sve). Gdje ga nema (Safari),
     fetch() sa redom od najviše 3 odjednom. */
  var PREFETCH = (function () {
    var l = document.createElement('link');
    return !!(l.relList && l.relList.supports && l.relList.supports('prefetch'));
  })();
  var red = [], aktivno = 0, vidjeno = {};
  function uzmi(url) {
    if (!url || vidjeno[url]) { return; }
    vidjeno[url] = true;
    if (PREFETCH) {
      var l = document.createElement('link');
      l.rel = 'prefetch';
      l.href = url;
      document.head.appendChild(l);
      return;
    }
    red.push(url);
    pumpaj();
  }
  function pumpaj() {
    while (aktivno < 3 && red.length) {
      var url = red.shift();
      aktivno++;
      fetch(url, { credentials: 'same-origin', priority: 'low' })
        .then(function (r) { return r.ok ? r.blob() : null; })
        .catch(function () { return null; })
        .then(function () { aktivno--; pumpaj(); });
    }
  }

  /* ---- LAKI dio ---- */
  var podaci = null;   /* Promise sa data/radovi.json */
  function laki() {
    if (podaci) { return podaci; }
    uzmi(izKorijena('vendor/three/three.module.min.js'));
    uzmi(izKorijena('vendor/three/three.core.min.js'));
    /* Stranica galerije: iz nje adrese CSS-a i skripti, sa tačnim ?v= */
    fetch(STRANA.href, { credentials: 'same-origin', priority: 'low' })
      .then(function (r) { return r.ok ? r.text() : ''; })
      .then(function (html) {
        if (!html || !window.DOMParser) { return; }
        var d = new DOMParser().parseFromString(html, 'text/html');
        var el = d.querySelectorAll('link[rel="stylesheet"][href], script[src]');
        for (var i = 0; i < el.length; i++) {
          var a = el[i].getAttribute('href') || el[i].getAttribute('src');
          if (/\.(css|js)(\?|$)/.test(a)) { uzmi(new URL(a, STRANA.href).href); }
        }
      })
      .catch(function () {});
    podaci = fetch(izKorijena('data/radovi.json'), { credentials: 'same-origin', priority: 'low' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; });
    return podaci;
  }

  /* ---- TEŠKI dio ---- */
  var AVIF = new Promise(function (res) {
    var p = new Image();
    p.onload = function () { res(p.naturalWidth === 1); };
    p.onerror = function () { res(false); };
    p.src = 'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADrbWV0YQAAAAAAAAAhaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAAAAAAAOcGl0bQAAAAAAAQAAAB5pbG9jAAAAAEQAAAEAAQAAAAEAAAETAAAAHgAAAChpaW5mAAAAAAABAAAAGmluZmUCAAAAAAEAAGF2MDFDb2xvcgAAAABqaXBycAAAAEtpcGNvAAAAFGlzcGUAAAAAAAAAAQAAAAEAAAAQcGl4aQAAAAADCAgIAAAADGF2MUOBAAwAAAAAE2NvbHJuY2x4AAEADQAGgAAAABdpcG1hAAAAAAAAAAEAAQQBAoMEAAAAJm1kYXQSAAoIGAAGiAhoNCAyEBlHh4Yhh5555oAAAJBAzeg=';
  });

  function izvorPrave(d, avif) {
    var id = d.id ? encodeURIComponent(d.id) : '';
    if (TELEFON && id) { return izKorijena('img/sala/' + id + '-1024.webp'); }
    var v = (d.varijante || []).slice().sort(function (a, b) { return a - b; });
    if (avif && id && v.length && d.sirinaPx > 0) {
      var w = v.filter(function (x) { return x >= d.sirinaPx * 0.95; })[0] || v[v.length - 1];
      if (w >= 800) { return izKorijena('img/radovi/w/' + id + '-' + w + '.avif'); }
    }
    return d.slika ? izKorijena(d.slika) : null;
  }

  var teskiKrenuo = false;
  function teski() {
    if (teskiKrenuo || STEDI) { return; }
    teskiKrenuo = true;
    Promise.all([laki(), AVIF]).then(function (x) {
      var p = x[0], avif = x[1];
      if (!p || !p.radovi) { return; }
      var prva = p.radovi.filter(function (r) { return r && r.istaknuto; });
      ['zid-albedo', 'zid-normal', 'zid-roughness', 'pod-albedo', 'pod-normal', 'pod-roughness',
        'plafon-albedo', 'plafon-normal'].forEach(function (ime) {
        uzmi(izKorijena('img/soba/' + ime + '.webp'));
      });
      prva.forEach(function (d) {
        if (d.id) { uzmi(izKorijena('img/sala/' + encodeURIComponent(d.id) + '-160.webp')); }
      });
      prva.forEach(function (d) { uzmi(izvorPrave(d, avif)); });
      prva.forEach(function (d) {
        if (d.id && d.kategorija !== 'crtezi') {
          uzmi(izKorijena('img/reljef/' + encodeURIComponent(d.id) + (TELEFON ? '-512.webp' : '.webp')));
        }
      });
    });
  }

  /* ---- okidači ----
     NAMJERNO nema okidača na prelazak mišem / tap po linku: to je
     prekasno da slike stignu, a stranica galerije bi za iste fajlove
     čekala ova preuzimanja niskog prioriteta (izmjereno: sporije nego
     bez predučitavanja). */
  var sekcija = document.querySelector('.najava-galerije');
  if (sekcija && 'IntersectionObserver' in window) {
    var posmatrac = new IntersectionObserver(function (z) {
      if (!z.some(function (u) { return u.isIntersecting; })) { return; }
      posmatrac.disconnect();
      teski();
    }, { rootMargin: '0px 0px 400px 0px' });
    posmatrac.observe(sekcija);
  }
  if (!STEDI) {
    var kreni = function () {
      window.setTimeout(function () {
        if (window.requestIdleCallback) { window.requestIdleCallback(laki, { timeout: 3000 }); }
        else { laki(); }
      }, 1200);
    };
    if (document.readyState === 'complete') { kreni(); }
    else { window.addEventListener('load', kreni, { once: true }); }
  }
})();
