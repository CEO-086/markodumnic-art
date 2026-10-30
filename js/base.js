/* =========================================================
   Marko Dumnić — base.js
   Zajedničko ponašanje za sve stranice: mobilni meni, tekuća
   godina, aktivna stavka navigacije, tiho pojavljivanje.
   Bez biblioteka, bez build koraka.
   ========================================================= */

(function () {
  'use strict';

  /* Korijen sajta iz adrese ove skripte (js/base.js): „/” na domenu,
     „/markodumnic-art/” kad je sajt u podfolderu (GitHub Pages). */
  var korijenSajta = (function () {
    var s = document.currentScript;
    try { return s && s.src ? new URL('../', s.src).pathname : '/'; } catch (e) { return '/'; }
  }());

  var telo = document.body;
  var tiho = window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : null;

  /* Da li korisnik traži manje pokreta. */
  function manjePokreta() {
    return !!(tiho && tiho.matches);
  }


  /* === Nova stranica se otvara od vrha ===
     Pregledač (i okvir u kom je sajt ugrađen) ponekad zadrži skrol
     prethodne stranice. Kod običnog prelaza linkom vraćamo na vrh;
     dugme Nazad i linkovi sa #sidrom zadržavaju svoje mjesto. */

  (function odVrha() {
    /* Svaka nova stranica kreće od vrha. Izuzeci: Nazad/Naprijed (tada
       browser vraća mjesto gdje ste bili) i link na sidro koje postoji
       na stranici (#kontakt-forma i sl.). Ovo radi i kad stranicu
       otvara okruženje koje je učitava ponovo (pregled, iframe). */
    var sidro = window.location.hash && window.location.hash.length > 1
      ? document.getElementById(decodeURIComponent(window.location.hash.slice(1))) : null;
    if (sidro) { return; }
    var ulaz = window.performance && performance.getEntriesByType
      ? performance.getEntriesByType('navigation')[0] : null;
    if (ulaz && ulaz.type === 'back_forward') { return; }
    /* Browser inače poslije učitavanja sam vrati staru poziciju
       (ponovno učitavanje) i pregazi naš skok na vrh. */
    try {
      if ('scrollRestoration' in history) {
        history.scrollRestoration = 'manual';
        /* …ali za Nazad na OVU stranicu poslije neka opet pamti mjesto */
        window.addEventListener('pagehide', function () { history.scrollRestoration = 'auto'; });
      }
    } catch (e) { /* neki iframe ne dozvoljava — skok na vrh ispod i dalje radi */ }
    var korisnik = false;
    function naVrh() {
      if (korisnik || (window.scrollY === 0 && window.scrollX === 0)) { return; }
      var html = document.documentElement;
      var staro = html.style.scrollBehavior;
      html.style.scrollBehavior = 'auto';      /* bez klizanja preko cijele stranice */
      window.scrollTo(0, 0);
      html.style.scrollBehavior = staro;
    }
    naVrh();
    document.addEventListener('DOMContentLoaded', naVrh);
    window.addEventListener('load', function () {
      naVrh();
      /* slike i fontovi mijenjaju visinu i poslije load-a */
      setTimeout(naVrh, 60);
      setTimeout(naVrh, 300);
    });
    window.addEventListener('pageshow', function (e) { if (!e.persisted) { naVrh(); } });
    function sam() { korisnik = true; }
    window.addEventListener('wheel', sam, { once: true, passive: true });
    window.addEventListener('touchstart', sam, { once: true, passive: true });
    window.addEventListener('keydown', sam, { once: true });
  }());


  /* === 404 za engleske i italijanske adrese ===
     Vercel za svaku nepostojeću adresu služi samo korijenski 404.html
     (crnogorski). Ako je tražena adresa pod /en/ ili /it/, prebaci na
     stranicu tog jezika (osim ako to već jeste ta stranica). */

  (function strani404() {
    var put = window.location.pathname;
    if (!document.body || document.body.getAttribute('data-stranica') !== '404') { return; }
    var jezik = document.documentElement.lang;
    ['en', 'it'].forEach(function (j) {
      if (jezik !== j && (put === korijenSajta + j || put.indexOf(korijenSajta + j + '/') === 0)) {
        window.location.replace(korijenSajta + j + '/404');
      }
    });
  }());


  /* === Prekidač jezika: ista stranica na drugom jeziku ===
     Veze u .jezik vode na isti fajl; ovdje se dodaje i ?id=… da
     stranica djela ostane na istom djelu. */

  (function jezik() {
    var veze = document.querySelectorAll('.jezik__veza');
    if (!veze.length || !window.location.search) { return; }
    for (var i = 0; i < veze.length; i++) {
      var href = veze[i].getAttribute('href');
      if (href && href.indexOf('?') === -1) {
        veze[i].setAttribute('href', href + window.location.search);
      }
    }
  }());


  /* === Lista jezika na telefonu: dugme sa zastavom i strelicom === */

  (function listaJezika() {
    var omot = document.querySelector('.jezik');
    var dugme = omot && omot.querySelector('.jezik__dugme');
    if (!dugme) { return; }

    function postavi(otvoreno) {
      omot.classList.toggle('je-otvoren', otvoreno);
      dugme.setAttribute('aria-expanded', otvoreno ? 'true' : 'false');
    }

    dugme.addEventListener('click', function () {
      var otvoreno = dugme.getAttribute('aria-expanded') !== 'true';
      postavi(otvoreno);
      if (otvoreno) {
        var trenutni = omot.querySelector('.jezik__veza:not([aria-current])');
        if (trenutni) { trenutni.focus(); }
      }
    });
    document.addEventListener('click', function (e) {
      if (!omot.contains(e.target)) { postavi(false); }
    });
    omot.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && omot.classList.contains('je-otvoren')) {
        postavi(false);
        dugme.focus();
      }
    });
    omot.addEventListener('focusout', function (e) {
      if (e.relatedTarget && !omot.contains(e.relatedTarget)) { postavi(false); }
    });
  }());


  /* === Mobilni meni === */

  (function meni() {
    var dugme = document.querySelector('.meni-dugme');
    var navigacija = document.querySelector('.navigacija');
    var zaglavlje = document.querySelector('.zaglavlje');

    if (!dugme || !navigacija) { return; }

    /* Meni je otvoren ako tijelo nosi klasu. */
    function jeOtvoren() {
      return telo.classList.contains('je-otvoren');
    }

    function postavi(otvoreno) {
      telo.classList.toggle('je-otvoren', otvoreno);
      if (zaglavlje) {
        zaglavlje.classList.toggle('je-otvoren', otvoreno);
      }
      dugme.setAttribute('aria-expanded', otvoreno ? 'true' : 'false');
    }

    function otvori() {
      postavi(true);
    }

    /* Pri zatvaranju fokus se vraća na dugme, ali samo ako je
       fokus bio negdje unutar menija — da ne krademo fokus. */
    function zatvori(vratiFokus) {
      if (!jeOtvoren()) { return; }
      postavi(false);
      if (vratiFokus) {
        dugme.focus();
      }
    }

    dugme.addEventListener('click', function () {
      if (jeOtvoren()) {
        zatvori(false);
      } else {
        otvori();
      }
    });

    /* Escape zatvara i vraća fokus na dugme. */
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' || e.key === 'Esc') {
        if (jeOtvoren()) {
          zatvori(true);
        }
      }
    });

    /* Klik izvan zaglavlja zatvara meni. */
    document.addEventListener('click', function (e) {
      if (!jeOtvoren()) { return; }
      var cilj = e.target;
      if (dugme.contains(cilj) || navigacija.contains(cilj)) { return; }
      zatvori(false);
    });

    /* Klik na stavku navigacije zatvara meni (iste stranice, #sidro). */
    navigacija.addEventListener('click', function (e) {
      if (e.target.closest('a')) {
        zatvori(false);
      }
    });

    /* Fokus koji napusti meni tabulatorom takođe ga zatvara. */
    document.addEventListener('focusin', function (e) {
      if (!jeOtvoren()) { return; }
      if (dugme.contains(e.target) || navigacija.contains(e.target)) { return; }
      zatvori(false);
    });

    /* Prelaskom na desktop širinu stanje se resetuje. */
    if (window.matchMedia) {
      var desktop = window.matchMedia('(min-width: 820px)');
      var naPromjenu = function (e) {
        if (e.matches) {
          postavi(false);
        }
      };
      if (desktop.addEventListener) {
        desktop.addEventListener('change', naPromjenu);
      } else if (desktop.addListener) {
        desktop.addListener(naPromjenu);
      }
    }
  }());


  /* === Tekuća godina === */

  (function godina() {
    var polja = document.querySelectorAll('[data-godina]');
    if (!polja.length) { return; }
    var sada = String(new Date().getFullYear());
    for (var i = 0; i < polja.length; i++) {
      polja[i].textContent = sada;
    }
  }());


  /* === Aktivna stavka navigacije (aria-current="page") === */

  (function tekucaStranica() {
    /* Zadnji segment putanje; prazan znači naslovnu. */
    function fajl(putanja) {
      var dio = putanja.split('/').pop();
      if (!dio || dio === '') { return 'index.html'; }
      return dio;
    }

    var sada = fajl(window.location.pathname);
    var linkovi = document.querySelectorAll(
      '.navigacija a[href], .podnozje__blok a[href]'
    );

    for (var i = 0; i < linkovi.length; i++) {
      var link = linkovi[i];

      /* Ako je HTML agent već ručno označio stavku, ne diramo je. */
      if (link.hasAttribute('aria-current')) { continue; }

      var href = link.getAttribute('href');
      if (!href) { continue; }

      /* Preskačemo sidra, vanjske linkove i mailto/tel. */
      if (href.charAt(0) === '#') { continue; }
      if (/^[a-z][a-z0-9+.-]*:/i.test(href)) { continue; }
      if (href.slice(0, 2) === '//') { continue; }

      if (fajl(href.split('?')[0].split('#')[0]) === sada) {
        link.setAttribute('aria-current', 'page');
      }
    }
  }());


  /* === Tiho pojavljivanje (data-pojavi → .je-vidljiv) === */

  (function pojavljivanje() {
    var elementi = document.querySelectorAll('[data-pojavi]');
    if (!elementi.length) { return; }

    /* Bez pokreta ili bez podrške — sve je odmah vidljivo.
       Klasu .js-pojavi NE postavljamo: sadržaj ostaje vidljiv bez
       ijednog trenutka na opacity: 0. */
    if (manjePokreta() || !('IntersectionObserver' in window)) {
      for (var i = 0; i < elementi.length; i++) {
        elementi[i].classList.add('je-vidljiv');
      }
      return;
    }

    /* Tek sada preuzimamo kontrolu nad vidljivošću: CSS sakriva
       [data-pojavi] samo unutar .js-pojavi. Ako ova skripta ne stigne
       da se izvrši, klase nema i sadržaj ostaje vidljiv. */
    document.documentElement.classList.add('js-pojavi');

    var posmatrac = new IntersectionObserver(function (zapisi, sam) {
      for (var j = 0; j < zapisi.length; j++) {
        if (zapisi[j].isIntersecting) {
          zapisi[j].target.classList.add('je-vidljiv');
          sam.unobserve(zapisi[j].target);
        }
      }
    }, {
      rootMargin: '0px 0px -8% 0px',
      threshold: 0.08
    });

    for (var k = 0; k < elementi.length; k++) {
      posmatrac.observe(elementi[k]);
    }
  }());

}());
