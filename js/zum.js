/* =========================================================
   Marko Dumnić — zum.js
   Prikazivač djela sa pločicama (tiles). Bez biblioteka.

   Kako radi, u tri rečenice:
   1. Pročita `img/plocice/<id>/info.json` — odatle zna dimenzije djela,
      koliko ima nivoa uvećanja i kako se pločice zovu.
   2. Za trenutni nivo izračuna koje pločice padaju u vidno polje i učita
      SAMO njih. Ništa drugo se ne dira — tu je sva brzina.
   3. Kad se skala promijeni toliko da treba drugi nivo, novi nivo se učitava
      ISPOD već vidljivog starog. Stari se skloni tek kad novi legne, pa ekran
      nikad nije prazan i nikad ne trepne.

   Sve je u jednom koordinatnom sistemu: "sadržajne jedinice" (0..W, 0..H iz
   info.json). Pločice svih nivoa pokrivaju isti taj prostor, pa se nivoi
   preklapaju tačno, bez poravnavanja i bez računanja u piksele ekrana.
   ========================================================= */

(function () {
  'use strict';

  /* Jezik stranice i korijen sajta. Ista skripta služi i en/zum.html
     i it/zum.html, pa se putanje do pločica i podataka računaju od korijena sajta
     (adresa ove skripte, js/zum.js → ../), ne od adrese stranice. */
  var EN = document.documentElement.lang === 'en';
  var IT = document.documentElement.lang === 'it';
  var KORIJEN_SAJTA = (function () {
    var s = document.currentScript;
    try { return new URL('../', s && s.src ? s.src : document.baseURI).href; }
    catch (e) { return ''; }
  }());
  function izKorijena(put) {
    if (!put || !KORIJEN_SAJTA) { return put; }
    try { return new URL(put, KORIJEN_SAJTA).href; } catch (e) { return put; }
  }

  var TEKST = IT ? {
    cijela: ' — il dipinto intero, senza zoom a tasselli',
    nedostupna: 'L\'immagine non è disponibile. Verificate che esista questo file: ',
    bezPlocica: 'Impossibile trovare i tasselli: al loro posto è mostrata l\'immagine semplice.',
    djelo: 'Opera',
    ucitano: 'Caricata: ',
    okno: ' — visualizzatore con zoom. Le frecce spostano l\'immagine, più e meno ' +
      'ingrandiscono e riducono, zero riporta al dipinto intero.',
    fajl: 'La pagina è stata aperta come file (file://), quindi il browser non ' +
      'legge i dati dei tasselli. Avviate un server locale — ' +
      './pokreni.sh — e aprite http://localhost:8000/it/zum.html',
    neprocitano: function (m) {
      return 'Impossibile leggere i dati dei tasselli (' + m + '): al loro posto è mostrata l\'immagine semplice.';
    }
  } : EN ? {
    cijela: ' — the whole painting, without tiled zoom',
    nedostupna: 'The image is not available. Check that this file exists: ',
    bezPlocica: 'The tiles could not be found, so the plain image is shown instead.',
    djelo: 'Artwork',
    ucitano: 'Loaded: ',
    okno: ' — zoom viewer. Arrow keys move the image, plus and minus zoom, ' +
      'zero returns to the whole painting.',
    fajl: 'The page was opened as a file (file://), so the browser will not ' +
      'read the tile data. Start a local server — ' +
      './pokreni.sh — and open http://localhost:8000/en/zum.html',
    neprocitano: function (m) {
      return 'The tile data could not be read (' + m + '), so the plain image is shown instead.';
    }
  } : {
    cijela: ' — cijela slika, bez zumiranja po pločicama',
    nedostupna: 'Slika nije dostupna. Provjeri da li postoji ',
    bezPlocica: 'Pločice nijesu nađene. Prikazana je obična slika.',
    djelo: 'Djelo',
    ucitano: 'Učitano: ',
    okno: ' — prikazivač sa zumiranjem. Strelice pomjeraju, plus i minus ' +
      'zumiraju, nula vraća na cijelu sliku.',
    fajl: 'Stranica je otvorena kao fajl (file://), pa browser ne da ' +
      'čitanje podataka o pločicama. Pokreni lokalni server — ' +
      './pokreni.sh — i otvori http://localhost:8000/zum.html',
    neprocitano: function (m) {
      return 'Podaci o pločicama nijesu pročitani (' + m + '). Prikazana je obična slika.';
    }
  };

  /* Na engleskoj i italijanskoj stranici naziv i tehnika dolaze iz
     data/radovi.json (polje `en`, odnosno `it`), jer info.json pločica
     nosi crnogorske. Učitava se jednom; ako ne stigne, ostaje ono što
     piše u info.json. */
  var POLJE_JEZIKA = IT ? 'it' : 'en';
  var engleski = null;
  function engleskiPodaci() {
    if (!(EN || IT) || !window.fetch) { return Promise.resolve(null); }
    if (!engleski) {
      engleski = fetch(izKorijena('data/radovi.json'), { cache: 'default' })
        .then(function (o) { return o.ok ? o.json() : null; })
        .then(function (d) {
          var mapa = {};
          ((d && d.radovi) || []).forEach(function (r) { if (r && r.id && r[POLJE_JEZIKA]) { mapa[r.id] = r[POLJE_JEZIKA]; } });
          return mapa;
        })
        .catch(function () { return null; });
    }
    return engleski;
  }

  var korijen = document.querySelector('[data-zum]');
  if (!korijen) { return; }

  /* --- Elementi --- */
  var okno = korijen.querySelector('[data-zum-okno]');       /* vidno polje */
  var platno = korijen.querySelector('[data-zum-platno]');   /* nosi transform */
  var mjerac = korijen.querySelector('[data-zum-mjerac]');   /* HUD */
  var poljeVrijeme = korijen.querySelector('[data-zum-vrijeme]');
  var poljeBroj = korijen.querySelector('[data-zum-broj]');
  var poljeNivo = korijen.querySelector('[data-zum-nivo]');
  var poljeSkala = korijen.querySelector('[data-zum-skala]');
  var poljePoruka = korijen.querySelector('[data-zum-poruka]');
  var poljeNaziv = korijen.querySelector('[data-zum-naziv]');
  var poljeMeta = korijen.querySelector('[data-zum-meta]');

  if (!okno || !platno) { return; }

  /* --- Podešavanja --- */
  /* Putanje u atributima su od korijena sajta (i na en/ i it/ stranicama). */
  var OSNOVA = izKorijena(korijen.getAttribute('data-zum-osnova') || 'img/plocice');
  var REZERVA_DIR = izKorijena(korijen.getAttribute('data-zum-rezerva') || 'img/radovi');
  var PODRAZUMIJEVANI = korijen.getAttribute('data-zum-id') || 'aria-di-torino';
  /* Prag za izbor nivoa: nivo se mijenja kad skala pređe 0.9 × 2^nivo.
     Malo ispod jedinice da detalj dođe neznatno ranije nego što je nužno. */
  var PRAG = 0.9;
  var KORAK_ZUMA = 1.35;        /* dugmad i tastatura */
  var KORAK_POMJERAJA = 80;     /* strelice, u pikselima ekrana */
  var MAKS_PREKO_NIVOA = 2;     /* koliko se smije zumirati preko zadnjeg nivoa */
  var MARGINA_PLOCICA = 0.35;   /* pretrči malo van okvira — mekši skrol */

  var tiho = window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : null;

  function manjePokreta() {
    return !!(tiho && tiho.matches);
  }


  /* =======================================================
     Stanje
     ======================================================= */

  var info = null;            /* sadržaj info.json */
  var W = 0, H = 0;           /* dimenzije u sadržajnim jedinicama */
  var maksNivo = 0;
  var nivoi = [];             /* { sloj, plocice: Map, kolona, redova } */
  var aktivniNivo = 0;

  var skala = 1;              /* sadržajna jedinica -> CSS piksel */
  var pomjerajX = 0;          /* položaj tačke (0,0) sadržaja, u pikselima okna */
  var pomjerajY = 0;
  var minSkala = 0.1;
  var maksSkala = 8;

  var ucitanoPlocica = 0;
  var pocetak = 0;            /* mjerenje počinje prije prvog fetch-a */
  var prvaPlocicaMs = null;
  var zakazano = false;       /* rAF guard za crtanje */
  var tekuciId = PODRAZUMIJEVANI;


  /* =======================================================
     Pomoćne funkcije
     ======================================================= */

  function ogranici(v, min, maks) {
    return v < min ? min : (v > maks ? maks : v);
  }

  function pravougaonikOkna() {
    var r = okno.getBoundingClientRect();
    /* Pri skrivenom elementu rect je 0 — vraćamo bezbjednu vrijednost. */
    return {
      sirina: r.width || okno.clientWidth || 1,
      visina: r.height || okno.clientHeight || 1
    };
  }

  function poruka(tekst, trajno) {
    if (!poljePoruka) { return; }
    poljePoruka.textContent = tekst || '';
    poljePoruka.hidden = !tekst;
    if (trajno) {
      poljePoruka.setAttribute('data-trajno', 'da');
    }
  }

  function jeFajlProtokol() {
    return window.location.protocol === 'file:';
  }


  /* =======================================================
     Rezervni prikaz — obična slika
     Koristi se kad info.json ili pločice ne postoje, i kad je sajt
     otvoren kao file:// (fetch tada ne radi ni za šta).
     ======================================================= */

  function rezerva(ident, razlog) {
    platno.textContent = '';
    platno.removeAttribute('style');
    korijen.setAttribute('data-stanje', 'rezerva');

    /* Okno više nije sprava nego obična slika: ne prima tastaturu,
       ne javlja se kao `application`, i nema šta da najavi. */
    okno.removeAttribute('tabindex');
    okno.removeAttribute('role');
    okno.removeAttribute('aria-label');

    var slika = document.createElement('img');
    slika.className = 'zum-rezerva';
    /* info.json zna tačnu putanju; bez njega se uzima fotografija djela. */
    slika.src = (info && info.rezerva && izKorijena(info.rezerva)) || (REZERVA_DIR + '/' + ident + '.jpg');
    slika.alt = (poljeNaziv ? poljeNaziv.textContent : ident) + TEKST.cijela;
    slika.decoding = 'async';
    slika.addEventListener('error', function () {
      slika.remove();
      poruka(TEKST.nedostupna +
             REZERVA_DIR + '/' + ident + '.jpg', true);
    });
    platno.appendChild(slika);

    if (mjerac) { mjerac.hidden = true; }
    poruka(razlog, true);
  }


  /* =======================================================
     Geometrija: ograničavanje pomjeraja i skale
     ======================================================= */

  function osvjeziGranice() {
    var o = pravougaonikOkna();
    /* Minimum je "cijelo djelo u okno" — ispod toga nema potrebe ići. */
    var uklapa = Math.min(o.sirina / W, o.visina / H);
    minSkala = uklapa;
    /* Maksimum je zadnji nivo prikazan 1:1, pa još malo preko toga. */
    maksSkala = Math.max(uklapa, Math.pow(2, maksNivo) * MAKS_PREKO_NIVOA);
  }

  /* Slika se ne smije odvući van vidnog polja. Ako je u nekoj osi manja od
     okna, tu osu centriramo; inače pomjeraj držimo tako da sadržaj pokriva
     okno do ivice. */
  function stegniPomjeraj() {
    var o = pravougaonikOkna();
    var sirinaS = W * skala;
    var visinaS = H * skala;

    if (sirinaS <= o.sirina) {
      pomjerajX = (o.sirina - sirinaS) / 2;
    } else {
      pomjerajX = ogranici(pomjerajX, o.sirina - sirinaS, 0);
    }

    if (visinaS <= o.visina) {
      pomjerajY = (o.visina - visinaS) / 2;
    } else {
      pomjerajY = ogranici(pomjerajY, o.visina - visinaS, 0);
    }
  }

  /* Zum oko tačke (ekranski piksel unutar okna) — tačka ostaje na mjestu. */
  function postaviSkalu(novaSkala, tackaX, tackaY) {
    var s = ogranici(novaSkala, minSkala, maksSkala);
    if (s === skala) { return; }

    var o = pravougaonikOkna();
    var tx = (typeof tackaX === 'number') ? tackaX : o.sirina / 2;
    var ty = (typeof tackaY === 'number') ? tackaY : o.visina / 2;

    /* Sadržajna koordinata pod tačkom prije promjene skale. */
    var cx = (tx - pomjerajX) / skala;
    var cy = (ty - pomjerajY) / skala;

    skala = s;
    pomjerajX = tx - cx * skala;
    pomjerajY = ty - cy * skala;

    stegniPomjeraj();
    zakaziCrtanje();
  }

  function uklopi() {
    osvjeziGranice();
    skala = minSkala;
    stegniPomjeraj();
    zakaziCrtanje();
  }


  /* =======================================================
     Nivoi i pločice
     ======================================================= */

  /* Nivo koji odgovara trenutnoj skali. Nivo L ima 2^L piksela po sadržajnoj
     jedinici, pa tražimo najmanji L kod kojeg pločica nije razvučena. */
  function nivoZaSkalu(s) {
    var idealan = Math.log(Math.max(s, 1e-6) / PRAG) / Math.LN2;
    return ogranici(Math.ceil(idealan), 0, maksNivo);
  }

  /* Geometrija pločice (kol, red) na nivou L, u sadržajnim jedinicama.
     MORA se poklopiti sa onim kako je generator isjekao pločice: svaka
     pločica nivoa L je (sirina × visina) iz info.json, u pikselima tog
     nivoa, plus `preklop` piksela na svaku stranu gdje ima susjeda.
     Preklop ide na sve četiri strane, pa izglađena ivica jedne pločice
     pada preko susjedne koja je tu već naslikala isto; bez toga se na
     spoju vidi tanka svijetla nit. */
  function geometrija(L, kol, red) {
    var djelilac = Math.pow(2, L);
    var sirC = W / djelilac;
    var visC = H / djelilac;
    var preklopC = (info.preklop || 0) / djelilac;

    var x0 = Math.max(0, kol * sirC - preklopC);
    var y0 = Math.max(0, red * visC - preklopC);
    var x1 = Math.min(W, (kol + 1) * sirC + preklopC);
    var y1 = Math.min(H, (red + 1) * visC + preklopC);

    return { x: x0, y: y0, sirina: x1 - x0, visina: y1 - y0 };
  }

  /* Vidno polje izraženo u sadržajnim jedinicama, sa malom marginom. */
  function vidnoPolje(L) {
    var o = pravougaonikOkna();
    var djelilac = Math.pow(2, L);
    var marginaX = (W / djelilac) * MARGINA_PLOCICA;
    var marginaY = (H / djelilac) * MARGINA_PLOCICA;

    return {
      x0: (0 - pomjerajX) / skala - marginaX,
      y0: (0 - pomjerajY) / skala - marginaY,
      x1: (o.sirina - pomjerajX) / skala + marginaX,
      y1: (o.visina - pomjerajY) / skala + marginaY
    };
  }

  function stvoriNivo(L) {
    var podatak = info.nivoi && info.nivoi[L];
    var djelilac = Math.pow(2, L);
    var sloj = document.createElement('div');
    sloj.className = 'zum-nivo';
    sloj.setAttribute('data-nivo', String(L));
    /* Dublji nivo ide iznad, pa pokriva grublji kad se učita. */
    sloj.style.zIndex = String(L + 1);
    sloj.setAttribute('aria-hidden', 'true');
    platno.appendChild(sloj);

    return {
      L: L,
      sloj: sloj,
      plocice: Object.create(null),
      kolona: (podatak && podatak.kolona) || djelilac,
      redova: (podatak && podatak.redova) || djelilac
    };
  }

  /* Ime pločice dolazi iz info.json (`obrazac`), pa format (JPG, WebP, SVG)
     određuje generator, ne ovaj kod. */
  function putanjaPlocice(L, kol, red) {
    var obrazac = (info && info.obrazac) || '{nivo}/{kolona}_{red}.jpg';
    return OSNOVA + '/' + tekuciId + '/' + obrazac
      .replace('{nivo}', String(L))
      .replace('{kolona}', String(kol))
      .replace('{red}', String(red));
  }

  function dodajPlocicu(nivo, kol, red) {
    var kljuc = kol + '_' + red;
    if (nivo.plocice[kljuc]) { return nivo.plocice[kljuc]; }

    var g = geometrija(nivo.L, kol, red);
    var slika = document.createElement('img');
    slika.className = 'zum-plocica';
    slika.alt = '';
    slika.setAttribute('aria-hidden', 'true');
    slika.decoding = 'async';
    slika.draggable = false;
    /* Položaj i veličina su u sadržajnim jedinicama; skaliranje radi platno. */
    slika.style.left = g.x + 'px';
    slika.style.top = g.y + 'px';
    slika.style.width = g.sirina + 'px';
    slika.style.height = g.visina + 'px';

    var zapis = { el: slika, ucitana: false, greska: false };

    slika.addEventListener('load', function () {
      zapis.ucitana = true;
      ucitanoPlocica += 1;

      /* Prva pločica koja se vidi — to je broj koji korisnik mjeri. */
      if (prvaPlocicaMs === null) {
        prvaPlocicaMs = Math.round(performance.now() - pocetak);
      }
      slika.classList.add('je-ucitana');
      osvjeziMjerac();
      /* Kad se novi nivo popunio, grublji nivoi ispod mogu da se sklone. */
      zakaziCrtanje();
    });

    slika.addEventListener('error', function () {
      zapis.greska = true;
      slika.remove();
      /* Ako ni prva pločica nije uspjela, nema šta da se prikaže po nivoima. */
      if (nivo.L === 0 && ucitanoPlocica === 0) {
        rezerva(tekuciId, TEKST.bezPlocica);
      }
    });

    slika.src = putanjaPlocice(nivo.L, kol, red);
    nivo.sloj.appendChild(slika);
    nivo.plocice[kljuc] = zapis;
    return zapis;
  }

  /* Da li su sve pločice nivoa koje pokrivaju vidno polje stigle. */
  function nivoPokriva(nivo) {
    var p = vidnoPolje(nivo.L);
    var sirC = W / nivo.kolona;
    var visC = H / nivo.redova;

    var k0 = Math.max(0, Math.floor(p.x0 / sirC));
    var k1 = Math.min(nivo.kolona - 1, Math.floor((p.x1 - 1e-6) / sirC));
    var r0 = Math.max(0, Math.floor(p.y0 / visC));
    var r1 = Math.min(nivo.redova - 1, Math.floor((p.y1 - 1e-6) / visC));

    for (var red = r0; red <= r1; red++) {
      for (var kol = k0; kol <= k1; kol++) {
        var z = nivo.plocice[kol + '_' + red];
        if (!z) { return false; }
        if (!z.ucitana && !z.greska) { return false; }
      }
    }
    return true;
  }

  /* Učitava pločice nivoa koje padaju u vidno polje. Ništa van njega. */
  function ucitajVidljive(nivo) {
    var p = vidnoPolje(nivo.L);
    var sirC = W / nivo.kolona;
    var visC = H / nivo.redova;

    var k0 = Math.max(0, Math.floor(p.x0 / sirC));
    var k1 = Math.min(nivo.kolona - 1, Math.floor((p.x1 - 1e-6) / sirC));
    var r0 = Math.max(0, Math.floor(p.y0 / visC));
    var r1 = Math.min(nivo.redova - 1, Math.floor((p.y1 - 1e-6) / visC));

    for (var red = r0; red <= r1; red++) {
      for (var kol = k0; kol <= k1; kol++) {
        dodajPlocicu(nivo, kol, red);
      }
    }
  }


  /* =======================================================
     Crtanje — jedan rAF po promjeni
     ======================================================= */

  function zakaziCrtanje() {
    if (zakazano) { return; }
    zakazano = true;
    window.requestAnimationFrame(function () {
      zakazano = false;
      crtaj();
    });
  }

  function crtaj() {
    if (!info) { return; }

    platno.style.transform =
      'translate3d(' + pomjerajX + 'px,' + pomjerajY + 'px,0) scale(' +
      skala + ')';

    var zeljeni = nivoZaSkalu(skala);
    aktivniNivo = zeljeni;

    /* Nivo 0 je jedna pločica — uvijek je tu kao podloga koja garantuje
       da ekran nikad nije prazan. */
    ucitajVidljive(nivoi[0]);
    if (zeljeni > 0) {
      ucitajVidljive(nivoi[zeljeni]);
    }

    /* Vidljivost slojeva. Grublji nivoi ostaju ISPOD dok se željeni ne
       popuni — to je cijeli trik protiv treperenja i praznog ekrana. */
    var zeljeniSpreman = nivoPokriva(nivoi[zeljeni]);

    for (var L = 0; L <= maksNivo; L++) {
      var vidljiv;
      if (L === zeljeni) {
        vidljiv = true;
      } else if (L < zeljeni) {
        /* Grublji nivo se gasi tek kad željeni pokrije vidno polje.
           Nivo 0 je jeftin pa ga držimo kao mrežu za sigurnost. */
        vidljiv = !zeljeniSpreman || L === 0;
      } else {
        vidljiv = false;
      }
      nivoi[L].sloj.hidden = !vidljiv;
    }

    osvjeziMjerac();
    osvjeziKontrole();
  }

  function osvjeziMjerac() {
    if (poljeVrijeme) {
      poljeVrijeme.textContent = prvaPlocicaMs === null
        ? '—' : (prvaPlocicaMs + ' ms');
    }
    if (poljeBroj) {
      var ukupno = info && info.ukupno_plocica ? info.ukupno_plocica : 0;
      poljeBroj.textContent = ukupno
        ? (ucitanoPlocica + ' / ' + ukupno)
        : String(ucitanoPlocica);
    }
    if (poljeNivo) {
      poljeNivo.textContent = aktivniNivo + ' / ' + maksNivo;
    }
    if (poljeSkala) {
      poljeSkala.textContent = Math.round(skala * 100) + '%';
    }
  }

  function osvjeziKontrole() {
    var plus = korijen.querySelector('[data-zum-akcija="uvecaj"]');
    var minus = korijen.querySelector('[data-zum-akcija="umanji"]');
    if (plus) { plus.disabled = skala >= maksSkala - 1e-6; }
    if (minus) { minus.disabled = skala <= minSkala + 1e-6; }
  }


  /* =======================================================
     Animirani zum (dugmad, dvoklik, tastatura)
     ======================================================= */

  var animacija = null;

  function prekiniAnimaciju() {
    if (animacija !== null) {
      window.cancelAnimationFrame(animacija);
      animacija = null;
    }
  }

  function animirajZum(ciljSkala, tackaX, tackaY) {
    prekiniAnimaciju();
    var cilj = ogranici(ciljSkala, minSkala, maksSkala);

    /* Manje pokreta: bez prelaza, skokovito. */
    if (manjePokreta()) {
      postaviSkalu(cilj, tackaX, tackaY);
      return;
    }

    var od = skala;
    if (Math.abs(cilj - od) < 1e-4) { return; }

    var pocetakA = performance.now();
    var trajanje = 220;

    function korak(sada) {
      var t = ogranici((sada - pocetakA) / trajanje, 0, 1);
      /* ease-out, isti karakter kao --ease u tokenima */
      var e = 1 - Math.pow(1 - t, 3);
      /* Geometrijska interpolacija skale — zum izgleda ravnomjerno. */
      postaviSkalu(od * Math.pow(cilj / od, e), tackaX, tackaY);
      if (t < 1) {
        animacija = window.requestAnimationFrame(korak);
      } else {
        animacija = null;
      }
    }

    animacija = window.requestAnimationFrame(korak);
  }


  /* =======================================================
     Miš, dodir, točkić
     ======================================================= */

  var pokazivaci = Object.create(null);
  var brojPokazivaca = 0;
  var vuce = false;
  var zadnjaX = 0, zadnjaY = 0;
  var pinchRastojanje = 0;

  function uOkno(e) {
    var r = okno.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  function rastojanje() {
    var kljucevi = Object.keys(pokazivaci);
    if (kljucevi.length < 2) { return 0; }
    var a = pokazivaci[kljucevi[0]];
    var b = pokazivaci[kljucevi[1]];
    return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
  }

  function srediste() {
    var kljucevi = Object.keys(pokazivaci);
    var a = pokazivaci[kljucevi[0]];
    var b = pokazivaci[kljucevi[1]];
    var r = okno.getBoundingClientRect();
    return {
      x: (a.x + b.x) / 2 - r.left,
      y: (a.y + b.y) / 2 - r.top
    };
  }

  okno.addEventListener('pointerdown', function (e) {
    if (korijen.getAttribute('data-stanje') === 'rezerva') { return; }
    prekiniAnimaciju();

    pokazivaci[e.pointerId] = { x: e.clientX, y: e.clientY };
    brojPokazivaca = Object.keys(pokazivaci).length;

    if (brojPokazivaca === 1) {
      vuce = true;
      zadnjaX = e.clientX;
      zadnjaY = e.clientY;
      okno.classList.add('je-vuceno');
      if (okno.setPointerCapture) {
        try { okno.setPointerCapture(e.pointerId); } catch (x) { /* nema */ }
      }
    } else if (brojPokazivaca === 2) {
      vuce = false;
      okno.classList.remove('je-vuceno');
      pinchRastojanje = rastojanje();
    }
    e.preventDefault();
  });

  okno.addEventListener('pointermove', function (e) {
    if (!pokazivaci[e.pointerId]) { return; }
    pokazivaci[e.pointerId] = { x: e.clientX, y: e.clientY };

    if (brojPokazivaca >= 2) {
      /* Pinch: odnos rastojanja prstiju je odnos skale. */
      var novo = rastojanje();
      if (pinchRastojanje > 0 && novo > 0) {
        var c = srediste();
        postaviSkalu(skala * (novo / pinchRastojanje), c.x, c.y);
        pinchRastojanje = novo;
      }
      e.preventDefault();
      return;
    }

    if (!vuce) { return; }
    pomjerajX += e.clientX - zadnjaX;
    pomjerajY += e.clientY - zadnjaY;
    zadnjaX = e.clientX;
    zadnjaY = e.clientY;
    stegniPomjeraj();
    zakaziCrtanje();
    e.preventDefault();
  });

  function pustiPokazivac(e) {
    if (pokazivaci[e.pointerId]) {
      delete pokazivaci[e.pointerId];
    }
    brojPokazivaca = Object.keys(pokazivaci).length;
    if (brojPokazivaca < 2) { pinchRastojanje = 0; }
    if (brojPokazivaca === 0) {
      vuce = false;
      okno.classList.remove('je-vuceno');
    }
  }

  okno.addEventListener('pointerup', pustiPokazivac);
  okno.addEventListener('pointercancel', pustiPokazivac);
  okno.addEventListener('lostpointercapture', pustiPokazivac);

  /* Točkić: zum ka kursoru. Pinch na trackpadu dolazi kao wheel + ctrlKey. */
  okno.addEventListener('wheel', function (e) {
    if (korijen.getAttribute('data-stanje') === 'rezerva') { return; }
    e.preventDefault();
    prekiniAnimaciju();

    var t = uOkno(e);
    /* Normalizacija: različiti uređaji daju deltaY u različitim jedinicama. */
    var delta = e.deltaY;
    if (e.deltaMode === 1) { delta *= 16; }        /* linije */
    else if (e.deltaMode === 2) { delta *= 100; }  /* stranice */

    /* Jedan zub točkića (delta oko 100) daje oko 13% — dovoljno da se
       osjeti, ne toliko da preskoči nivo. Pinch na trackpadu stiže sa
       ctrlKey i mnogo manjom deltom, pa ide osjetljivije. */
    var faktor = Math.exp(-delta * (e.ctrlKey ? 0.009 : 0.00125));
    postaviSkalu(skala * faktor, t.x, t.y);
  }, { passive: false });

  /* Dvoklik: zum ka tački. Na maksimumu vraća na uklapanje. */
  okno.addEventListener('dblclick', function (e) {
    if (korijen.getAttribute('data-stanje') === 'rezerva') { return; }
    e.preventDefault();
    var t = uOkno(e);
    if (skala >= maksSkala - 1e-6) {
      animirajZum(minSkala, t.x, t.y);
    } else {
      animirajZum(skala * 2, t.x, t.y);
    }
  });

  /* Kontekstni meni na dugi dodir smeta vučenju. */
  okno.addEventListener('contextmenu', function (e) {
    if (brojPokazivaca > 0) { e.preventDefault(); }
  });


  /* =======================================================
     Dugmad i tastatura
     ======================================================= */

  korijen.addEventListener('click', function (e) {
    var dugme = e.target.closest ? e.target.closest('[data-zum-akcija]') : null;
    if (!dugme) { return; }
    var akcija = dugme.getAttribute('data-zum-akcija');

    if (akcija === 'uvecaj') {
      animirajZum(skala * KORAK_ZUMA);
    } else if (akcija === 'umanji') {
      animirajZum(skala / KORAK_ZUMA);
    } else if (akcija === 'reset') {
      prekiniAnimaciju();
      uklopi();
      okno.focus();
    }
  });

  okno.addEventListener('keydown', function (e) {
    if (korijen.getAttribute('data-stanje') === 'rezerva') { return; }
    var k = e.key;
    var korak = e.shiftKey ? KORAK_POMJERAJA * 3 : KORAK_POMJERAJA;
    var obradjeno = true;

    if (k === 'ArrowLeft') {
      pomjerajX += korak;
    } else if (k === 'ArrowRight') {
      pomjerajX -= korak;
    } else if (k === 'ArrowUp') {
      pomjerajY += korak;
    } else if (k === 'ArrowDown') {
      pomjerajY -= korak;
    } else if (k === '+' || k === '=' || k === 'Add') {
      animirajZum(skala * KORAK_ZUMA);
      return;
    } else if (k === '-' || k === '_' || k === 'Subtract') {
      animirajZum(skala / KORAK_ZUMA);
      return;
    } else if (k === '0') {
      prekiniAnimaciju();
      uklopi();
      return;
    } else {
      obradjeno = false;
    }

    if (obradjeno) {
      e.preventDefault();
      prekiniAnimaciju();
      stegniPomjeraj();
      zakaziCrtanje();
    }
  });


  /* =======================================================
     Promjena veličine okna
     ======================================================= */

  function naPromjenuVelicine() {
    if (!info) { return; }
    var staraMin = minSkala;
    osvjeziGranice();
    /* Ako je korisnik bio na "uklopljeno", ostaje uklopljeno. */
    if (Math.abs(skala - staraMin) < 1e-3) {
      skala = minSkala;
    } else {
      skala = ogranici(skala, minSkala, maksSkala);
    }
    stegniPomjeraj();
    zakaziCrtanje();
  }

  if ('ResizeObserver' in window) {
    new ResizeObserver(naPromjenuVelicine).observe(okno);
  } else {
    window.addEventListener('resize', naPromjenuVelicine);
  }


  /* =======================================================
     Izbor djela
     ======================================================= */

  function idIzAdrese() {
    var upit = window.location.search;
    if (!upit) { return null; }
    var parovi = upit.replace(/^\?/, '').split('&');
    for (var i = 0; i < parovi.length; i++) {
      var dio = parovi[i].split('=');
      if (decodeURIComponent(dio[0]) === 'id') {
        var v = decodeURIComponent((dio[1] || '').replace(/\+/g, ' '));
        /* Samo bezbjedan oblik ida — bez putanja i bez tačaka. */
        return /^[a-z0-9-]{1,64}$/.test(v) ? v : null;
      }
    }
    return null;
  }

  function oznaciAktivanLink(ident) {
    /* Lista "Druga djela izbliza" je u posebnoj sekciji, izvan korijena
       prikazivača — zato document, ne korijen. */
    var linkovi = document.querySelectorAll('[data-zum-djelo]');
    for (var i = 0; i < linkovi.length; i++) {
      var jeOvo = linkovi[i].getAttribute('data-zum-djelo') === ident;
      if (jeOvo) {
        linkovi[i].setAttribute('aria-current', 'true');
      } else {
        linkovi[i].removeAttribute('aria-current');
      }
    }
  }

  function upisiPodatke() {
    if (poljeNaziv && info.naziv) {
      poljeNaziv.textContent = info.naziv;
    }
    if (poljeMeta) {
      var dijelovi = [];
      if (info.tehnika) { dijelovi.push(info.tehnika); }
      if (info.dimenzije) { dijelovi.push(info.dimenzije); }
      if (info.godina) { dijelovi.push(String(info.godina)); }
      poljeMeta.textContent = dijelovi.join(' · ');
    }
    if (okno) {
      okno.setAttribute(
        'aria-label',
        (info.naziv || TEKST.djelo) + TEKST.okno
      );
    }
  }


  /* =======================================================
     Pokretanje
     ======================================================= */

  function ocisti() {
    prekiniAnimaciju();
    platno.textContent = '';
    nivoi = [];
    ucitanoPlocica = 0;
    prvaPlocicaMs = null;
    aktivniNivo = 0;
    info = null;
    poruka('');
    korijen.removeAttribute('data-stanje');
    if (mjerac) { mjerac.hidden = false; }

    /* Vraćamo ono što je rezerva mogla da skine. */
    okno.setAttribute('tabindex', '0');
    okno.setAttribute('role', 'application');
  }

  /* `najavi` je true kad je korisnik sam izabrao drugo djelo sa liste:
     tada se fokus vraća na prikazivač (inače padne na <body>) i u
     statusno polje se upiše šta je učitano. */
  function ucitaj(ident, najavi) {
    ocisti();
    tekuciId = ident;
    oznaciAktivanLink(ident);
    pocetak = performance.now();

    if (jeFajlProtokol()) {
      rezerva(ident, TEKST.fajl);
      return;
    }

    korijen.setAttribute('data-stanje', 'ucitavanje');

    var zaPodatke = engleskiPodaci();
    fetch(OSNOVA + '/' + ident + '/info.json', { cache: 'default' })
      .then(function (odgovor) {
        if (!odgovor.ok) { throw new Error('HTTP ' + odgovor.status); }
        return odgovor.json();
      })
      .then(function (podaci) {
        return zaPodatke.then(function (en) {
          var p = en && en[ident];
          if (p && podaci) {
            if (p.naziv) { podaci.naziv = p.naziv; }
            if (p.tehnika) { podaci.tehnika = p.tehnika; }
          }
          return podaci;
        });
      })
      .then(function (podaci) {
        if (!podaci || !podaci.sadrzaj) { throw new Error(IT ? 'info.json non valido' : EN ? 'invalid info.json' : 'neispravan info.json'); }

        info = podaci;
        W = Number(info.sadrzaj.sirina) || 700;
        H = Number(info.sadrzaj.visina) || 600;
        maksNivo = Math.max(0, (Number(info.nivoa) || 1) - 1);

        platno.style.width = W + 'px';
        platno.style.height = H + 'px';

        for (var L = 0; L <= maksNivo; L++) {
          nivoi.push(stvoriNivo(L));
        }

        upisiPodatke();
        korijen.setAttribute('data-stanje', 'spremno');
        uklopi();

        if (najavi && tekuciId === ident) {
          okno.focus();
          poruka(TEKST.ucitano + (info.naziv || ident));
        }
      })
      .catch(function (greska) {
        rezerva(ident, TEKST.neprocitano(greska.message));
        if (najavi && tekuciId === ident) {
          /* Rezerva skida tabindex (okno nije sprava); -1 da bi fokus
             ipak mogao doći ovdje, a poruka o razlogu je već u statusu. */
          okno.setAttribute('tabindex', '-1');
          okno.focus();
        }
      });
  }

  /* base.js dodaje location.search na .jezik__veza samo pri učitavanju
     stranice; kad se djelo promijeni bez ponovnog učitavanja, ?id= u
     birač jezika upisujemo ovdje, da druga jezička verzija otvori isto
     djelo. */
  function osvjeziBiracJezika() {
    var veze = document.querySelectorAll('.jezik__veza');
    for (var i = 0; i < veze.length; i++) {
      var href = veze[i].getAttribute('href');
      if (!href) { continue; }
      veze[i].setAttribute('href', href.split('?')[0] + window.location.search);
    }
  }

  /* Linkovi na druga djela mijenjaju prikazivač bez ponovnog učitavanja
     stranice — ali ostaju pravi linkovi, pa rade i bez JS-a.
     Slušamo na documentu: linkovi nijesu unutar korijena (section.zum),
     pa ih ranije ovaj rukovalac nije ni vidio i stranica se cijela
     ponovo učitavala. */
  document.addEventListener('click', function (e) {
    var link = e.target.closest ? e.target.closest('[data-zum-djelo]') : null;
    if (!link) { return; }
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) { return; }
    var ident = link.getAttribute('data-zum-djelo');
    if (!ident || ident === tekuciId) {
      e.preventDefault();
      return;
    }
    e.preventDefault();
    if (window.history && window.history.pushState) {
      window.history.pushState({ id: ident }, '', '?id=' + ident);
      osvjeziBiracJezika();
    }
    ucitaj(ident, true);
  });

  window.addEventListener('popstate', function () {
    osvjeziBiracJezika();
    var ident = idIzAdrese() || PODRAZUMIJEVANI;
    if (ident !== tekuciId) { ucitaj(ident); }
  });

  ucitaj(idIzAdrese() || PODRAZUMIJEVANI);

}());
