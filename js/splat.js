/* =========================================================
   Marko Dumnić — splat.js
   Prikazivač Gaussian splata: jedno platno snimljeno iz više
   uglova, da se vidi kako lak i pasta hvataju svjetlo.

   Bez build koraka. Klasična skripta koja Three.js i Spark
   povlači dinamičkim import()-om — tek na klik, nikad prije.

   Biblioteke su lokalne (vendor/), ne sa CDN-a:
     vendor/three/three.module.min.js   Three.js r186
     vendor/spark/spark.module.min.js  Spark 2.4.0

   Splat fajl se NE isporučuje uz sajt. Koji snimci postoje piše
   u splat/index.json (vidi splat/README.md). Dok ga nema, stranica
   pošteno kaže šta će tu stajati i kako se pravi — bez lažne
   demonstracije.
   ========================================================= */

(function () {
  'use strict';

  /* --- Jezik stranice i korijen sajta ---
     Ista skripta služi i en/splat.html i it/splat.html. Sve putanje (vendor/, splat/,
     img/) računaju se od KORIJENA SAJTA, izvedenog iz adrese ove
     skripte (js/splat.js → ../), ne od adrese stranice. */
  var EN = document.documentElement.lang === 'en';
  var IT = document.documentElement.lang === 'it';
  var KORIJEN_SAJTA = (function () {
    var s = document.currentScript;
    try { return new URL('../', s && s.src ? s.src : document.baseURI).href; }
    catch (e) { return ''; }
  }());
  function izKorijena(put) {
    if (!KORIJEN_SAJTA) { return put; }
    try { return new URL(put, KORIJEN_SAJTA).href; } catch (e) { return put; }
  }

  var TEKST = IT ? {
    natpis: ' — fotografia dell’opera, senza la vista da ogni angolazione.',
    decimala: ',',
    mjeriloSa: function (mb) { return 'Visualizzatore circa 1,4 MB · opera ' + mb; },
    mjerilo: 'Visualizzatore circa 1,4 MB',
    platno: function (n) {
      return '«' + n + '» in tre dimensioni. ' +
        'Le frecce ruotano la vista, più e meno avvicinano, ' +
        'Home riporta alla vista iniziale, Esc chiude il visualizzatore.';
    },
    biblioteka: 'Il visualizzatore non è riuscito a caricare la sua libreria da ' +
      '<code>vendor/spark/</code> o <code>vendor/three/</code>. ' +
      'Probabilmente i file non sono stati pubblicati con il sito, oppure ' +
      'le regole di sicurezza (CSP) li bloccano.',
    citanje: function (u) {
      return 'La ripresa <code>' + u + '</code> è stata trovata, ma non è ' +
        'stato possibile leggerla come Gaussian splat. Probabilmente il file ' +
        'è incompleto o in un formato che il visualizzatore non legge.';
    },
    spremno: function (mb) {
      return 'L’opera è stata ripresa ed è pronta: ' + mb +
        '. Il visualizzatore e l’opera si scaricano solo quando premete il pulsante.';
    }
  } : EN ? {
    natpis: ' — photograph of the work, without the view from every angle.',
    decimala: '.',
    mjeriloSa: function (mb) { return 'Viewer about 1.4 MB · work ' + mb; },
    mjerilo: 'Viewer about 1.4 MB',
    platno: function (n) {
      return '“' + n + '” in three dimensions. ' +
        'Arrow keys turn the view, plus and minus move closer, ' +
        'Home returns to the starting view, Escape exits.';
    },
    biblioteka: 'The viewer could not load its library from ' +
      '<code>vendor/spark/</code> or <code>vendor/three/</code>. ' +
      'The files were probably not published with the site, or ' +
      'security rules (CSP) are blocking them.',
    citanje: function (u) {
      return 'The capture <code>' + u + '</code> was found, but it ' +
        'could not be read as a Gaussian splat. The file is probably ' +
        'incomplete or in a format the viewer cannot read.';
    },
    spremno: function (mb) {
      return 'The work has been captured and is ready: ' + mb +
        '. The viewer and the work are downloaded only when you press the button.';
    }
  } : {
    natpis: ' — fotografija djela, bez obilaska iz više uglova.',
    decimala: ',',
    mjeriloSa: function (mb) { return 'Prikazivač oko 1,4 MB · djelo ' + mb; },
    mjerilo: 'Prikazivač oko 1,4 MB',
    platno: function (n) {
      return 'Djelo „' + n + '“ u tri dimenzije. ' +
        'Strelice okreću pogled, plus i minus približavaju, ' +
        'Home vraća na početni pogled, Escape izlazi.';
    },
    biblioteka: 'Prikazivač nije mogao da učita biblioteku iz ' +
      '<code>vendor/spark/</code> ili <code>vendor/three/</code>. ' +
      'Fajlovi vjerovatno nijesu objavljeni uz sajt, ili ih ' +
      'pravila bezbjednosti (CSP) blokiraju.',
    citanje: function (u) {
      return 'Djelo <code>' + u + '</code> je pronađeno, ali se ' +
        'nije moglo pročitati kao Gaussian splat. Vjerovatno je ' +
        'fajl nepotpun ili u formatu koji prikazivač ne čita.';
    },
    spremno: function (mb) {
      return 'Djelo je snimljeno i spremno: ' + mb +
        '. Prikazivač i djelo se preuzimaju tek kad pritisnete dugme.';
    }
  };

  /* --- Gdje se traže splat fajlovi i koja djela postoje --- */

  var FASCIKLA = 'splat/';

  /* Spisak snimaka. Stranica prvo čita SAMO njega i traži jedino fajl
     koji je tu upisan — nema pogađanja nastavaka, pa ni niza 404 grešaka
     dok snimaka nema. Kako se dodaje snimak: splat/README.md. */
  var SPISAK = FASCIKLA + 'index.json';

  /* Formati koje Spark čita. Služi samo za provjeru imena iz spiska. */
  var NASTAVCI = ['.spz', '.ply', '.splat', '.ksplat'];

  /* Djela za koja prikazivač uopšte pokušava da traži fajl.
     Ključ je ?djelo=<id>; vrijednost nosi naziv i 2D zamjenu. */
  var DJELA = IT ? {
    'aria-di-torino': {
      naziv: 'Aria di Torino',
      slika: 'img/radovi/aria-di-torino.jpg',
      opis: 'Una villa dal tetto rosso all’angolo di una strada e, sopra, un cielo di pennellate dense e vorticose di blu e di bianco.'
    },
    'havanac-kastro': {
      naziv: 'Kastro, bichon avanese',
      slika: 'img/radovi/havanac-kastro.jpg',
      opis: 'Kastro, un bichon avanese, dorme su una coperta nello studio, tra cuscini e quadri appesi alla parete.'
    },
    'mrtva-priroda-sa-vazom': {
      naziv: 'Natura morta con vaso',
      slika: 'img/radovi/mrtva-priroda-sa-vazom.jpg',
      opis: 'Un vaso blu, una piantina fiorita e una scatola sul tavolo, davanti alla parete variopinta dello studio.'
    }
  } : EN ? {
    'aria-di-torino': {
      naziv: 'Aria di Torino',
      slika: 'img/radovi/aria-di-torino.jpg',
      opis: 'A villa with a red roof on a street corner, under a sky of thick, swirling strokes of blue and white.'
    },
    'havanac-kastro': {
      naziv: 'Havanese Kastro',
      slika: 'img/radovi/havanac-kastro.jpg',
      opis: 'Kastro, a Havanese dog, asleep on a blanket in the studio, among cushions and paintings on the wall.'
    },
    'mrtva-priroda-sa-vazom': {
      naziv: 'Still Life with Vase',
      slika: 'img/radovi/mrtva-priroda-sa-vazom.jpg',
      opis: 'A blue vase, a potted flower and a box on a table, against the colourful wall of the studio.'
    }
  } : {
    'aria-di-torino': {
      naziv: 'Aria di Torino',
      slika: 'img/radovi/aria-di-torino.jpg',
      opis: 'Vila sa crvenim krovom na uglu ulice, a iznad nje nebo u gustim, kovitlavim potezima plave i bijele.'
    },
    'havanac-kastro': {
      naziv: 'Havanac Kastro',
      slika: 'img/radovi/havanac-kastro.jpg',
      opis: 'Havanski bišon Kastro spava na pokrivaču u ateljeu, među jastucima i slikama na zidu.'
    },
    'mrtva-priroda-sa-vazom': {
      naziv: 'Mrtva priroda sa vazom',
      slika: 'img/radovi/mrtva-priroda-sa-vazom.jpg',
      opis: 'Plava vaza, saksija sa cvijetom i kutija na stolu, pred šarenim zidom ateljea.'
    }
  };

  var PODRAZUMIJEVANO = 'aria-di-torino';

  /* Zamka: u klasičnoj skripti dinamički import() računa putanju prema
     ADRESI SKRIPTE, ne prema stranici. "./vendor/..." iz js/splat.js
     postalo bi "js/vendor/..." i palo bi na 404. Zato se puna adresa
     računa iz document.baseURI — tako radi i kad je sajt u podfascikli.

     Spark dalje sam povlači ../three/three.module.min.js relativno prema
     sebi, pa se njegova putanja ne navodi. */
  function vendor(put) {
    try {
      return new URL(put, KORIJEN_SAJTA || document.baseURI).href;
    } catch (e) {
      return '/' + put;
    }
  }

  var PUT_THREE = vendor('vendor/three/three.module.min.js');
  var PUT_SPARK = vendor('vendor/spark/spark.module.min.js');

  /* Početni pogled — na njega vraća dugme „Početni pogled“. */
  var POCETNI = {
    udaljenost: 1.6,
    minUdaljenost: 0.35,
    maxUdaljenost: 6.0,
    azimut: 0,              /* radijani, oko Y ose */
    visina: 0.12            /* radijani, gore-dolje */
  };

  var MAX_VISINA = 1.35;    /* da se kamera ne prevrne preko tjemena */


  /* =======================================================
     Elementi
     ======================================================= */

  var korijen = document.getElementById('splat');
  if (!korijen) { return; }

  var el = {
    scena:       korijen.querySelector('.splat-scena'),
    ulaz:        document.getElementById('splat-ulaz'),
    ulazNaslov:  document.getElementById('splat-ulaz-naslov'),
    ulazTekst:   document.getElementById('splat-ulaz-tekst'),
    pokreni:     document.getElementById('splat-pokreni'),
    platno:      document.getElementById('splat-platno'),
    ucitavanje:  document.getElementById('splat-ucitavanje'),
    mjerilo:     document.getElementById('splat-mjerilo'),
    hud:         document.getElementById('splat-hud'),
    pocetni:     document.getElementById('splat-pocetni'),
    izadji:      document.getElementById('splat-izadji'),
    prazno:      document.getElementById('splat-prazno'),
    praznoNaziv: document.getElementById('splat-prazno-naziv'),
    putanja:     document.getElementById('splat-putanja'),
    poruka:      document.getElementById('splat-poruka'),
    dvad:        korijen.querySelector('.splat-2d'),
    dvadSlika:   document.getElementById('splat-2d-slika'),
    dvadNatpis:  document.getElementById('splat-2d-natpis')
  };


  /* =======================================================
     Sitne pomoćne
     ======================================================= */

  var tiho = window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : null;

  /* Da li korisnik traži manje pokreta. Čita se svaki put, pa promjena
     postavke djeluje odmah, bez ponovnog učitavanja. */
  function manjePokreta() {
    return !!(tiho && tiho.matches);
  }

  function stanje(ime) {
    korijen.setAttribute('data-stanje', ime);
  }

  /* Poruke UVIJEK idu u traku ispod okna — nikad preko slike. */
  function poruka(html) {
    if (!el.poruka) { return; }
    if (!html) {
      el.poruka.removeAttribute('data-vidljivo');
      el.poruka.innerHTML = '';
      return;
    }
    el.poruka.innerHTML = html;
    el.poruka.setAttribute('data-vidljivo', 'da');
  }

  function na2d(razlog) {
    if (el.dvad && razlog) { el.dvad.setAttribute('data-razlog', razlog); }
    stanje('2d');
  }

  function imaWebGL() {
    try {
      var c = document.createElement('canvas');
      return !!(window.WebGL2RenderingContext && c.getContext('webgl2'));
    } catch (e) {
      return false;
    }
  }

  function jeFajlProtokol() {
    return window.location.protocol === 'file:';
  }

  function stegni(v, min, max) {
    return v < min ? min : (v > max ? max : v);
  }

  function megabajti(bajtovi) {
    return (bajtovi / (1024 * 1024)).toFixed(1).replace('.', TEKST.decimala) + ' MB';
  }


  /* =======================================================
     Koje je djelo traženo (?djelo=<id>)
     ======================================================= */

  function trazenoDjelo() {
    var id = PODRAZUMIJEVANO;
    try {
      var p = new URLSearchParams(window.location.search).get('djelo');
      /* Samo id iz spiska — ništa iz adrese ne ide u putanju bez provjere. */
      if (p && Object.prototype.hasOwnProperty.call(DJELA, p)) { id = p; }
    } catch (e) { /* stari pregledač: ostaje podrazumijevano */ }
    return { id: id, podaci: DJELA[id] };
  }

  var djelo = trazenoDjelo();

  /* Nazivi djela upisani na mjesta koja ih pominju. */
  (function upisiNaziv() {
    var naziv = djelo.podaci.naziv;
    if (el.ulazNaslov) { el.ulazNaslov.textContent = naziv; }
    if (el.praznoNaziv) { el.praznoNaziv.textContent = naziv; }
    if (el.putanja) {
      el.putanja.textContent = FASCIKLA + djelo.id + '.spz';
    }
    if (el.dvadSlika) {
      el.dvadSlika.setAttribute('src', izKorijena(djelo.podaci.slika));
      el.dvadSlika.setAttribute('alt', djelo.podaci.opis);
    }
    if (el.dvadNatpis) {
      el.dvadNatpis.textContent =
        naziv + TEKST.natpis;
    }
  }());


  /* =======================================================
     Postoji li splat fajl uopšte — prvo spisak, pa HEAD
     ======================================================= */

  /* Ime fajla iz spiska: samo slova, cifre i crtice, uz poznat nastavak.
     Ništa iz JSON-a ne ide u putanju bez ove provjere (nema "../"). */
  function valjanoIme(f) {
    if (typeof f !== 'string' || !/^[a-z0-9][a-z0-9-]*\.[a-z]+$/i.test(f)) {
      return false;
    }
    var nastavak = f.slice(f.lastIndexOf('.')).toLowerCase();
    return NASTAVCI.indexOf(nastavak) !== -1;
  }

  /* Iz spiska izvlači unos za traženo djelo, ili null. */
  function unosZaDjelo(spisak) {
    var snimci = spisak && Array.isArray(spisak.snimci) ? spisak.snimci : [];
    for (var i = 0; i < snimci.length; i++) {
      var s = snimci[i];
      if (s && s.djelo === djelo.id && valjanoIme(s.fajl)) { return s; }
    }
    return null;
  }

  /* Vraća Promise: {nadjen, url, bajtovi} ili {nadjen:false}.
     Najviše dva zahtjeva: splat/index.json, pa HEAD samo za fajl koji je
     u njemu upisan. Nema spiska, prazan je ili djela nema u njemu —
     odmah prazno stanje, bez ijednog daljeg zahtjeva. */
  function nadjiFajl() {
    var nema = { nadjen: false, razlog: 'nema' };
    if (!window.fetch) {
      return Promise.resolve({ nadjen: false, razlog: 'nepoznato' });
    }

    /* no-cache: pregledač smije da čuva spisak, ali ga uvijek provjeri. */
    return fetch(izKorijena(SPISAK), { cache: 'no-cache' })
      .then(function (o) { return o.ok ? o.json() : null; })
      .then(function (spisak) {
        var unos = unosZaDjelo(spisak);
        if (!unos) { return nema; }

        /* `ime` je za poruke (od korijena sajta), `url` je puna adresa */
        var ime = FASCIKLA + unos.fajl;
        var url = izKorijena(ime);
        return fetch(url, { method: 'HEAD', cache: 'no-store' })
          .then(function (o) {
            if (!o.ok) { return nema; }
            /* Neki serveri na HEAD vrate 200 i za nepostojeći fajl (SPA
               preusmjeravanje). Ako je tip HTML, to nije splat. */
            var tip = o.headers.get('Content-Type') || '';
            if (tip.indexOf('text/html') === 0) { return nema; }
            var duz = parseInt(o.headers.get('Content-Length') || '0', 10);
            return { nadjen: true, url: url, ime: ime, bajtovi: duz > 0 ? duz : 0 };
          });
      })
      .catch(function () { return nema; });
  }


  /* =======================================================
     Scena — pravi se tek na klik
     ======================================================= */

  var S = {
    radi: false,
    THREE: null,
    spark: null,
    renderer: null,
    scena: null,
    kamera: null,
    sparkRenderer: null,
    mreza: null,
    platno: null,
    petlja: 0,
    pauza: false,
    prljavo: true,        /* Spark traži novi kadar */
    jos: 0,               /* koliko kadrova još crtati pošto se sve smiri */
    /* orbita */
    azimut: POCETNI.azimut,
    visina: POCETNI.visina,
    udaljenost: POCETNI.udaljenost,
    ciljAzimut: POCETNI.azimut,
    ciljVisina: POCETNI.visina,
    ciljUdaljenost: POCETNI.udaljenost,
    /* ulaz */
    pokazivaci: {},
    zadnjiRazmak: 0,
    /* za čišćenje */
    otkaci: []
  };

  function slusaj(cilj, dogadjaj, f, opcije) {
    cilj.addEventListener(dogadjaj, f, opcije);
    S.otkaci.push(function () {
      cilj.removeEventListener(dogadjaj, f, opcije);
    });
  }


  /* --- Kamera: orbita oko djela --- */

  function namjestiKameru() {
    var k = S.kamera;
    if (!k) { return; }
    var d = S.udaljenost;
    var cosV = Math.cos(S.visina);
    k.position.set(
      d * cosV * Math.sin(S.azimut),
      d * Math.sin(S.visina),
      d * cosV * Math.cos(S.azimut)
    );
    k.lookAt(0, 0, 0);
  }

  /* Svaka promjena pogleda traži bar jedan novi kadar. */
  function osvjezi() {
    S.prljavo = true;
  }

  function naPocetniPogled() {
    S.ciljAzimut = POCETNI.azimut;
    S.ciljVisina = POCETNI.visina;
    S.ciljUdaljenost = POCETNI.udaljenost;
    osvjezi();
  }


  /* --- Ulaz: prevlačenje, točkić, pinch --- */

  function vezhiUlaz(platno) {
    function brojPokazivaca() {
      return Object.keys(S.pokazivaci).length;
    }

    function razmak() {
      var k = Object.keys(S.pokazivaci);
      if (k.length < 2) { return 0; }
      var a = S.pokazivaci[k[0]], b = S.pokazivaci[k[1]];
      return Math.sqrt((a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y));
    }

    slusaj(platno, 'pointerdown', function (e) {
      S.pokazivaci[e.pointerId] = { x: e.clientX, y: e.clientY };
      if (brojPokazivaca() === 2) { S.zadnjiRazmak = razmak(); }
      if (platno.setPointerCapture) {
        try { platno.setPointerCapture(e.pointerId); } catch (x) {}
      }
    });

    slusaj(platno, 'pointermove', function (e) {
      var p = S.pokazivaci[e.pointerId];
      if (!p) { return; }
      var dx = e.clientX - p.x;
      var dy = e.clientY - p.y;
      p.x = e.clientX;
      p.y = e.clientY;

      if (brojPokazivaca() >= 2) {
        /* Pinch: dva prsta mijenjaju udaljenost. */
        var r = razmak();
        if (S.zadnjiRazmak > 0 && r > 0) {
          S.ciljUdaljenost = stegni(
            S.ciljUdaljenost * (S.zadnjiRazmak / r),
            POCETNI.minUdaljenost, POCETNI.maxUdaljenost
          );
        }
        S.zadnjiRazmak = r;
        osvjezi();
        e.preventDefault();
        return;
      }

      /* Prevlačenje: obilazak oko djela. */
      var w = platno.clientWidth || 1;
      S.ciljAzimut -= (dx / w) * Math.PI * 2;
      S.ciljVisina = stegni(
        S.ciljVisina + (dy / w) * Math.PI * 1.4,
        -MAX_VISINA, MAX_VISINA
      );
      osvjezi();
      e.preventDefault();
    });

    function pusti(e) {
      delete S.pokazivaci[e.pointerId];
      if (brojPokazivaca() < 2) { S.zadnjiRazmak = 0; }
    }
    slusaj(platno, 'pointerup', pusti);
    slusaj(platno, 'pointercancel', pusti);
    slusaj(platno, 'lostpointercapture', pusti);

    /* Točkić: približavanje. passive:false jer se skrol zaustavlja. */
    slusaj(platno, 'wheel', function (e) {
      e.preventDefault();
      var korak = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
      S.ciljUdaljenost = stegni(
        S.ciljUdaljenost * Math.exp(korak * 0.0012),
        POCETNI.minUdaljenost, POCETNI.maxUdaljenost
      );
      osvjezi();
    }, { passive: false });

    /* Tastatura — platno je fokusabilno, pa mora i da sluša. */
    slusaj(platno, 'keydown', function (e) {
      var k = e.key;
      if (k === 'ArrowLeft')       { S.ciljAzimut += 0.12; }
      else if (k === 'ArrowRight') { S.ciljAzimut -= 0.12; }
      else if (k === 'ArrowUp')    { S.ciljVisina = stegni(S.ciljVisina + 0.08, -MAX_VISINA, MAX_VISINA); }
      else if (k === 'ArrowDown')  { S.ciljVisina = stegni(S.ciljVisina - 0.08, -MAX_VISINA, MAX_VISINA); }
      else if (k === '+' || k === '=') { S.ciljUdaljenost = stegni(S.ciljUdaljenost * 0.9, POCETNI.minUdaljenost, POCETNI.maxUdaljenost); }
      else if (k === '-' || k === '_') { S.ciljUdaljenost = stegni(S.ciljUdaljenost * 1.1, POCETNI.minUdaljenost, POCETNI.maxUdaljenost); }
      else if (k === 'Home')       { naPocetniPogled(); }
      else if (k === 'Escape')     { ugasi(); return; }
      else { return; }
      osvjezi();
      e.preventDefault();
    });
  }


  /* --- Veličina platna --- */

  function uskladiVelicinu() {
    if (!S.renderer || !el.platno) { return; }
    var w = el.platno.clientWidth;
    var h = el.platno.clientHeight;
    if (!w || !h) { return; }
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    S.renderer.setPixelRatio(dpr);
    S.renderer.setSize(w, h, false);
    S.kamera.aspect = w / h;
    S.kamera.updateProjectionMatrix();
    osvjezi();
  }


  /* --- Petlja --- */

  /* Eksponencijalno primicanje nikad ne stigne do cilja samo od sebe,
     pa bi kamera vječno "skoro" stizala, a petlja vječno crtala. Ispod
     ovog praga se poravna tačno na cilj i miruje. */
  var PRAG_UGAO = 0.0004;        /* radijana — ispod ovoga se ne vidi */
  var PRAG_DUZINA = 0.0008;      /* jedinica scene */

  function dotjeraj() {
    var dA = S.ciljAzimut - S.azimut;
    var dV = S.ciljVisina - S.visina;
    var dU = S.ciljUdaljenost - S.udaljenost;

    var mirno = Math.abs(dA) < PRAG_UGAO &&
                Math.abs(dV) < PRAG_UGAO &&
                Math.abs(dU) < PRAG_DUZINA;

    if (mirno) {
      /* Već poravnato i nacrtano — nema se šta raditi. */
      if (dA === 0 && dV === 0 && dU === 0) { return false; }

      /* Poravnanje: dva ista „početna pogleda“ moraju biti ISTI pogled.
         Vraća se true da se taj poravnati kadar i NACRTA — inače bi na
         ekranu ostao zadnji, za dlaku promašen položaj. */
      S.azimut = S.ciljAzimut;
      S.visina = S.ciljVisina;
      S.udaljenost = S.ciljUdaljenost;
      return true;
    }

    /* Tiho dotjerivanje ka cilju — bez skakanja.
       Uz „smanjeno kretanje“ nema klizanja: pogled ide pravo na cilj.
       Obilazak i dalje radi, samo prati prst bez kašnjenja. */
    var k = manjePokreta() ? 1 : 0.18;
    S.azimut     += dA * k;
    S.visina     += dV * k;
    S.udaljenost += dU * k;
    return true;
  }

  /* Koliko kadrova se još crta pošto se kamera smiri.

     ZAMKA: Spark sortira splatove po dubini u radniku, a rezultat
     preuzima tek PRI CRTANJU. Ako se petlja zaustavi čim kamera stane,
     slika ostane zamrznuta na poluzavršenom sortiranju — vidjelo se kao
     razlika od oko 5% piksela između istog pogleda prije i poslije
     okretanja. onDirty pomaže, ali stigne tek kad je sortiranje gotovo,
     a i tada treba još koji kadar da se preuzme.

     Zato se poslije mirovanja crta još kratko, pa se tek onda staje.
     Izmjereno: sa 45 kadrova slika je još ostajala oko 7% nedovršena,
     sa ovim brojem padne ispod 1%. */
  var KADROVA_POSLIJE = 180;     /* oko 3 s na 60 Hz */

  function kadar() {
    if (!S.radi) { return; }
    S.petlja = window.requestAnimationFrame(kadar);
    if (S.pauza) { return; }

    if (dotjeraj()) {
      /* Kamera se pomjera — crta se i odbrojavanje kreće iznova. */
      S.jos = KADROVA_POSLIJE;
    } else if (S.prljavo) {
      /* Spark javio da mu treba novi kadar. */
      S.jos = Math.max(S.jos, KADROVA_POSLIJE);
    } else if (S.jos <= 0) {
      /* Sve stoji i sortiranje je preuzeto — ne crta se, telefon miruje. */
      return;
    }

    S.prljavo = false;
    if (S.jos > 0) { S.jos--; }

    namjestiKameru();
    S.renderer.render(S.scena, S.kamera);
  }



  /* =======================================================
     Pokretanje i gašenje
     ======================================================= */

  function ugasi() {
    if (!S.radi) { return; }
    S.radi = false;

    if (S.petlja) { window.cancelAnimationFrame(S.petlja); S.petlja = 0; }

    var i;
    for (i = 0; i < S.otkaci.length; i++) { S.otkaci[i](); }
    S.otkaci = [];
    S.pokazivaci = {};

    /* Oslobađanje redom: mreža → Spark → renderer → WebGL kontekst. */
    try { if (S.mreza) { S.scena.remove(S.mreza); S.mreza.dispose(); } } catch (e) {}
    try { if (S.sparkRenderer) { S.scena.remove(S.sparkRenderer); S.sparkRenderer.dispose(); } } catch (e) {}
    try { if (S.renderer) { S.renderer.dispose(); S.renderer.forceContextLoss(); } } catch (e) {}

    if (S.platno && S.platno.parentNode) {
      S.platno.parentNode.removeChild(S.platno);
    }

    S.mreza = null;
    S.sparkRenderer = null;
    S.renderer = null;
    S.scena = null;
    S.kamera = null;
    S.platno = null;

    stanje('ulaz');
    poruka('');
    if (el.pokreni) {
      try { el.pokreni.focus({ preventScroll: true }); }
      catch (e) { el.pokreni.focus(); }
    }
  }

  /* Biblioteke se povlače tek ovdje — ni bajt prije klika. */
  function ucitajBiblioteke() {
    if (S.THREE && S.spark) {
      return Promise.resolve();
    }
    return import(PUT_THREE)
      .then(function (T) {
        S.THREE = T;
        return import(PUT_SPARK);
      })
      .then(function (Sp) {
        S.spark = Sp;
      });
  }

  function pokreni(fajl) {
    poruka('');
    stanje('ucitavanje');
    if (el.mjerilo) {
      el.mjerilo.textContent = fajl.bajtovi
        ? TEKST.mjeriloSa(megabajti(fajl.bajtovi))
        : TEKST.mjerilo;
    }

    ucitajBiblioteke()
      .then(function () {
        var THREE = S.THREE;
        var spark = S.spark;

        S.scena = new THREE.Scene();
        S.kamera = new THREE.PerspectiveCamera(50, 1, 0.01, 200);

        /* antialias: false — Spark izričito traži, WebGL AA ovdje ne
           pomaže kvalitetu a mnogo košta. */
        S.renderer = new THREE.WebGLRenderer({ antialias: false });
        S.platno = S.renderer.domElement;
        S.platno.setAttribute('tabindex', '0');
        S.platno.setAttribute('role', 'application');
        S.platno.setAttribute(
          'aria-label',
          TEKST.platno(djelo.podaci.naziv)
        );
        el.platno.appendChild(S.platno);

        /* onDirty: Spark javlja kad mu sortiranje splatova zatraži novi
           kadar. Bez ovoga bi mirna slika ostala nedovršeno sortirana. */
        S.sparkRenderer = new spark.SparkRenderer({
          renderer: S.renderer,
          onDirty: osvjezi
        });
        S.scena.add(S.sparkRenderer);

        S.mreza = new spark.SplatMesh({ url: fajl.url });
        /* Splatovi iz Scaniverse-a (i drugih alata) izlaze okrenuti naglavačke —
           ovo ih uspravlja. */
        S.mreza.quaternion.set(1, 0, 0, 0);
        S.scena.add(S.mreza);

        return S.mreza.initialized;
      })
      .then(function () {
        naPocetniPogled();
        S.azimut = POCETNI.azimut;
        S.visina = POCETNI.visina;
        S.udaljenost = POCETNI.udaljenost;

        uskladiVelicinu();
        namjestiKameru();
        vezhiUlaz(S.platno);

        slusaj(window, 'resize', uskladiVelicinu);

        /* Pauza kad kartica nije u prvom planu — ne grije telefon badava. */
        slusaj(document, 'visibilitychange', function () {
          S.pauza = document.hidden;
          if (!S.pauza) { osvjezi(); }
        });

        S.radi = true;
        S.pauza = document.hidden;
        S.prljavo = true;
        S.jos = KADROVA_POSLIJE;
        stanje('splat');
        /* preventScroll: fokus na platno ne smije da trgne stranicu. */
        try { S.platno.focus({ preventScroll: true }); }
        catch (e) { S.platno.focus(); }
        kadar();
      })
      .catch(function (e) {
        /* Razdvojeno: nedostaje biblioteka, ili fajl ne valja. */
        var tekst;
        if (!S.THREE || !S.spark) {
          tekst = TEKST.biblioteka;
          na2d('biblioteka');
        } else {
          tekst = TEKST.citanje(fajl.ime || fajl.url);
          na2d('citanje');
        }
        if (window.console && console.warn) { console.warn('splat:', e); }
        poruka(tekst);
        /* Djelimično napravljena scena se ne ostavlja da visi. */
        try { if (S.renderer) { S.renderer.dispose(); S.renderer.forceContextLoss(); } } catch (x) {}
        if (S.platno && S.platno.parentNode) {
          S.platno.parentNode.removeChild(S.platno);
        }
        S.renderer = null;
        S.platno = null;
      });
  }


  /* =======================================================
     Odluka na učitavanju stranice
     ======================================================= */

  function odluci() {
    if (!imaWebGL()) {
      na2d('webgl');
      return;
    }

    if (jeFajlProtokol()) {
      na2d('fajl');
      return;
    }

    /* Dinamički import() ne postoji u starim pregledačima. Provjerava
       se bez eval-a — ako nema, odmah 2D, bez pokušaja. */
    if (typeof window.Promise !== 'function' || !window.fetch) {
      na2d('biblioteka');
      return;
    }

    /* Ima li fajla? Prije klika idu samo mali spisak i, ako je djelo
       u njemu, jedan HEAD — sam snimak se ne preuzima. */
    nadjiFajl().then(function (fajl) {
      if (!fajl.nadjen) {
        stanje('prazno');
        return;
      }

      stanje('ulaz');

      if (el.ulazTekst && fajl.bajtovi) {
        el.ulazTekst.textContent = TEKST.spremno(megabajti(fajl.bajtovi));
      }

      if (el.pokreni) {
        el.pokreni.addEventListener('click', function () {
          pokreni(fajl);
        });
      }
    });
  }

  if (el.pocetni) {
    el.pocetni.addEventListener('click', function () {
      naPocetniPogled();
      if (S.platno) {
        try { S.platno.focus({ preventScroll: true }); }
        catch (e) { S.platno.focus(); }
      }
    });
  }

  if (el.izadji) {
    el.izadji.addEventListener('click', ugasi);
  }

  /* Kad se stranica napušta, WebGL kontekst se oslobađa. */
  window.addEventListener('pagehide', function () {
    if (S.radi) { ugasi(); }
  });

  odluci();

}());
