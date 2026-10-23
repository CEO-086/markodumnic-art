/* =========================================================
   Marko Dumnić — radovi.js
   Jedan fajl opslužuje dvije stranice:
     · radovi.html  — filter po seriji (radi na već ugrađenom HTML-u)
     · djelo.html   — pojedinačno djelo, puni se iz data/radovi.json

   Bez biblioteka. Stranica se bira po prisustvu ključnog elementa.
   ========================================================= */

(function () {
  'use strict';

  /* --- Jezik stranice: engleske stranice su pod en/ i nose lang="en" --- */
  var ENGLESKI = document.documentElement.lang === 'en';

  /* --- Korijen sajta, izveden iz adrese OVE skripte (js/radovi.js),
     ne iz adrese stranice — da podaci i slike rade i sa /en/ stranica. --- */
  var KORIJEN = (function () {
    var skripta = document.currentScript;
    try {
      if (skripta && skripta.src) { return new URL('../', skripta.src).href; }
    } catch (e) { /* stari pregledač — ispod je rezervni put */ }
    return new URL(ENGLESKI ? '../' : './', window.location.href).href;
  }());

  /* Pretvara putanju iz radovi.json (img/radovi/…) u adresu od korijena. */
  function odKorijena(putanja) {
    return new URL(putanja, KORIJEN).href;
  }

  /* --- Putanja do podataka --- */
  var PUTANJA_PODACI = 'data/radovi.json';

  /* --- Dozvoljene kategorije (serije iz radovi.json) --- */
  var KATEGORIJE = ['sve', 'torino', 'atelje', 'rodni-grad'];

  /* Nazivi serija — za vezu „Serija” na stranici djela. Ako radovi.json
     donese svoje nazive (polje `kategorije`), oni imaju prednost. */
  var NAZIVI_SERIJA = ENGLESKI ? {
    'torino': 'Turin Landscapes',
    'atelje': 'Glimpses from the Studio',
    'rodni-grad': 'Hometown Reveries'
  } : {
    'torino': 'Torinski pejzaži',
    'atelje': 'Prizori iz ateljea',
    'rodni-grad': 'Sanjarenja o rodnom gradu'
  };

  /* --- Tekstovi koje skripta upisuje, po jeziku --- */
  var TEKST = ENGLESKI ? {
    prikazano: function (n, ukupno) {
      return 'Showing ' + n + ' of ' + ukupno + ' ' + (ukupno === 1 ? 'work' : 'works');
    },
    upit: function (naziv) { return 'Enquire about “' + naziv + '”'; },
    fajlSistem:
      'The site has been opened directly from the file system (file://), so ' +
      'the browser will not allow the details of the works to be read. Please ' +
      'open the site through a local server — for example by running ' +
      '“python3 -m http.server” in the site folder and visiting ' +
      'http://localhost:8000 in your browser.',
    nedostupno: function (status) {
      return 'The details of the works are not available (status ' + status + '). ' +
        'Please check that the file ' + PUTANJA_PODACI + ' exists.';
    },
    nemaIdNaslov: 'No work selected',
    nemaIdTekst: 'The address does not specify a work. Please choose one from the list of works.',
    nijeNadjenoNaslov: 'Work not found',
    nijeNadjenoTekst: function (id) {
      return 'There is no work with the identifier “' + id + '” in the list of works. ' +
        'The link may be out of date or mistyped.';
    },
    neucitanoNaslov: 'The details could not be loaded',
    neucitanoTekst:
      'The details of the works cannot be read. If you opened the site by ' +
      'double-clicking a file, please open it through a local server instead — ' +
      'for example by running “python3 -m http.server” in the site folder and ' +
      'visiting http://localhost:8000 in your browser. If you are on a server, ' +
      'please check that the file ' + PUTANJA_PODACI + ' exists and is valid.'
  } : {
    prikazano: function (n, ukupno) {
      return 'Prikazano ' + n + ' od ' + ukupno + ' ' + rijecRadova(ukupno);
    },
    upit: function (naziv) { return 'Upit za djelo „' + naziv + '”'; },
    fajlSistem:
      'Sajt je otvoren direktno iz fajl sistema (file://), pa pregledač ne ' +
      'dozvoljava čitanje podataka o djelima. Otvori sajt preko lokalnog ' +
      'servera — na primjer komandom „python3 -m http.server” u folderu ' +
      'sajta, pa u pregledaču idi na http://localhost:8000.',
    nedostupno: function (status) {
      return 'Podaci o djelima nisu dostupni (status ' + status + '). ' +
        'Provjeri da fajl ' + PUTANJA_PODACI + ' postoji.';
    },
    nemaIdNaslov: 'Nije izabrano djelo',
    nemaIdTekst: 'Adresa ne sadrži oznaku djela. Izaberi djelo sa spiska radova.',
    nijeNadjenoNaslov: 'Djelo nije nađeno',
    nijeNadjenoTekst: function (id) {
      return 'Djelo pod oznakom „' + id + '” ne postoji u spisku radova. ' +
        'Možda je veza stara ili pogrešno prepisana.';
    },
    neucitanoNaslov: 'Podaci se ne mogu učitati',
    neucitanoTekst:
      'Podaci o djelima se ne mogu pročitati. Ako si sajt otvorio ' +
      'duplim klikom na fajl, otvori ga preko lokalnog servera — na ' +
      'primjer komandom „python3 -m http.server” u folderu sajta, pa u ' +
      'pregledaču idi na http://localhost:8000. Ako si na serveru, ' +
      'provjeri da fajl ' + PUTANJA_PODACI + ' postoji i da je ispravan.'
  };

  /* Gramatika: 1 rad, 2–4 rada, 5+ radova. */
  function rijecRadova(n) {
    var zadnja = n % 10;
    var zadnjeDvije = n % 100;
    if (zadnja === 1 && zadnjeDvije !== 11) { return 'rada'; }
    if (zadnja >= 2 && zadnja <= 4 && (zadnjeDvije < 12 || zadnjeDvije > 14)) { return 'rada'; }
    return 'radova';
  }

  /* Djelo na jeziku stranice: na engleskim stranicama naziv, opis i
     tehnika dolaze iz polja `en`; sve ostalo je isto za oba jezika. */
  function naJeziku(djelo) {
    if (!ENGLESKI || !djelo) { return djelo; }
    var en = djelo.en || {};
    var kopija = {};
    Object.keys(djelo).forEach(function (k) { kopija[k] = djelo[k]; });
    kopija.naziv = en.naziv || djelo.naziv;
    kopija.opis = en.opis || djelo.opis;
    kopija.tehnika = en.tehnika || djelo.tehnika;
    return kopija;
  }

  /* Da li izvorni naziv treba prikazati — samo kad se razlikuje od
     naziva na stranici. Na engleskom bez obzira na velika slova
     („Turin rooftops” je isto što i „Turin Rooftops”). */
  function imaIzvorniNaziv(djelo) {
    if (!djelo.originalniNaziv) { return false; }
    if (ENGLESKI) {
      return djelo.originalniNaziv.toLowerCase() !== String(djelo.naziv || '').toLowerCase();
    }
    return djelo.originalniNaziv !== djelo.naziv;
  }

  /* ===========================================================
     POMOĆNE FUNKCIJE
     =========================================================== */

  /* Skraćenica za querySelector. */
  function nadji(selektor, korijen) {
    return (korijen || document).querySelector(selektor);
  }

  /* Skraćenica za querySelectorAll, vraća pravi niz. */
  function nadjiSve(selektor, korijen) {
    return Array.prototype.slice.call((korijen || document).querySelectorAll(selektor));
  }

  /* Pravi grešku sa porukom na jeziku stranice, označenu kao našu —
     da se u catch bloku ne pomiješa sa sirovim porukama pregledača. */
  function nasaGreska(poruka) {
    var e = new Error(poruka);
    e.nasa = true;
    return e;
  }

  /* Učitava radovi.json. Vraća Promise sa objektom podataka.
     Baca grešku sa čitljivom porukom — poruke se prikazuju korisniku. */
  function ucitajPodatke() {
    /* Preko file:// protokola fetch ne radi ni u jednom pregledaču:
       sigurnosna politika blokira čitanje lokalnih fajlova. */
    if (window.location.protocol === 'file:') {
      return Promise.reject(nasaGreska(TEKST.fajlSistem));
    }

    return fetch(odKorijena(PUTANJA_PODACI), { cache: 'no-cache' })
      .then(function (odgovor) {
        if (!odgovor.ok) {
          throw nasaGreska(TEKST.nedostupno(odgovor.status));
        }
        return odgovor.json();
      });
  }

  /* ===========================================================
     STRANICA: radovi.html — filter
     Mreža je ugrađena u HTML, pa filter ne zavisi od fetch-a.
     Bez JavaScripta dugmad se sklanjaju i vidi se svih 13 radova.
     =========================================================== */

  function pokreniRadove(mreza) {
    var dugmad = nadjiSve('.filter__dugme');
    var stavke = nadjiSve('.rad', mreza);
    var brojac = nadji('#broj-radova');
    var prazno = nadji('#radovi-prazno');
    var ukupno = stavke.length;

    /* Trenutno primijenjena kategorija — da se u istoriju ne upisuje
       isti unos dva puta kad korisnik dva puta klikne isto dugme. */
    var trenutna = null;

    /* Vraća kategoriju iz URL hash-a; ako nije ispravna, vraća 'sve'. */
    function kategorijaIzHasha() {
      var hash = (window.location.hash || '').replace('#', '').toLowerCase();
      return KATEGORIJE.indexOf(hash) !== -1 ? hash : 'sve';
    }

    /* Primjenjuje filter: sakriva stavke, osvježava dugmad i brojač. */
    function primijeni(kategorija, pisiHash) {
      var prikazano = 0;

      stavke.forEach(function (stavka) {
        var pripada = kategorija === 'sve' ||
                      stavka.getAttribute('data-kategorija') === kategorija;

        /* hidden atribut, ne samo klasa — stavka tada izlazi i iz
           pristupačnog drveta, ne samo iz vizuelnog prikaza. */
        stavka.hidden = !pripada;
        if (pripada) { prikazano += 1; }
      });

      /* Stanje dugmadi — aria-pressed nosi informaciju, klasa nosi liniju. */
      dugmad.forEach(function (dugme) {
        var aktivno = dugme.getAttribute('data-filter') === kategorija;
        dugme.setAttribute('aria-pressed', aktivno ? 'true' : 'false');
        dugme.classList.toggle('je-aktivno', aktivno);
      });

      /* Brojač u aria-live elementu — čitač ekrana pročita promjenu. */
      if (brojac) {
        brojac.textContent = TEKST.prikazano(prikazano, ukupno);
      }

      /* Prazno stanje — za sada se ne pojavljuje, ali stoji ako neko
         u hash upiše kategoriju bez radova. */
      if (prazno) { prazno.hidden = prikazano !== 0; }

      /* Hash se mijenja da se stanje filtera može podijeliti linkom.
         pushState, NE replaceState: svaki izbor filtera je korak u
         istoriji, pa back dugme pregledača vraća prethodni filter.
         replaceState je prepisivao isti unos i back je izlazio sa
         stranice (ili vraćao na stanje prije prvog klika). */
      if (pisiHash && kategorija !== trenutna) {
        var noviHash = kategorija === 'sve' ? '' : '#' + kategorija;
        var novaAdresa = window.location.pathname + window.location.search + noviHash;

        if (window.history && window.history.pushState) {
          window.history.pushState({ kategorija: kategorija }, '', novaAdresa);
        } else {
          /* Bez History API-ja: upis u hash sam pravi unos u istoriji.
             Za 'sve' nema hash-a, pa ostaje postojeće ponašanje. */
          window.location.hash = noviHash;
        }
      }

      trenutna = kategorija;
    }

    /* Klik na dugme filtera. */
    dugmad.forEach(function (dugme) {
      dugme.addEventListener('click', function () {
        primijeni(dugme.getAttribute('data-filter'), true);
      });
    });

    /* Promjena hash-a (ručno uneseni link, skok na #atelje). */
    window.addEventListener('hashchange', function () {
      primijeni(kategorijaIzHasha(), false);
    });

    /* Back/forward dugme pregledača. Uz pushState iznad, popstate je
       taj koji pouzdano stiže i kad se hash uklanja (vraćanje na „sve”). */
    window.addEventListener('popstate', function () {
      primijeni(kategorijaIzHasha(), false);
    });

    /* Početno stanje iz hash-a. Prvi unos u istoriji dobija svoje stanje,
       da se iz njega može vratiti i naprijed i nazad. */
    var pocetna = kategorijaIzHasha();
    if (window.history && window.history.replaceState) {
      window.history.replaceState({ kategorija: pocetna }, '',
        window.location.pathname + window.location.search + window.location.hash);
    }
    primijeni(pocetna, false);
  }

  /* ===========================================================
     STRANICA: djelo.html — pojedinačno djelo
     =========================================================== */

  function pokreniDjelo(okvirDjela) {
    var ucitavanje = nadji('#djelo-ucitavanje');
    var greska = nadji('#djelo-greska');
    var susjedi = nadji('#djelo-susjedi');

    /* Prikazuje pristojnu poruku umjesto prazne stranice.
       Stranica ima jedan jedini <h1> (#djelo-naziv), pa ga ovdje
       premještamo u blok sa greškom i u njega upisujemo naslov poruke. */
    function prikaziGresku(naslov, tekst) {
      if (ucitavanje) { ucitavanje.hidden = true; }
      if (okvirDjela) { okvirDjela.hidden = true; }
      if (susjedi) { susjedi.hidden = true; }
      if (!greska) { return; }

      var elNaslov = nadji('#djelo-naziv');
      if (elNaslov) {
        elNaslov.textContent = naslov;
        elNaslov.classList.remove('djelo__naziv');
        elNaslov.classList.add('djelo-greska__naslov');
        greska.insertBefore(elNaslov, greska.firstChild);
      }

      var elTekst = nadji('#djelo-greska-tekst', greska);
      if (elTekst) { elTekst.textContent = tekst; }

      greska.hidden = false;
      document.title = naslov + ' — Marko Dumnić';
    }

    /* Čita ?id= iz URL-a. */
    function idIzUrla() {
      if (window.URLSearchParams) {
        return new URLSearchParams(window.location.search).get('id') || '';
      }
      /* Rezervni put za starije pregledače. */
      var par = /[?&]id=([^&]*)/.exec(window.location.search);
      return par ? decodeURIComponent(par[1].replace(/\+/g, ' ')) : '';
    }

    /* Popunjava JSON-LD blok nakon što podaci dođu.
       Vidi napomenu u <head> djelo.html: u produkciji ovo treba
       biti statički upisano po djelu, ne ubacivano JavaScriptom. */
    function popuniJsonLd(djelo) {
      var blok = nadji('#jsonld-djelo');
      if (!blok) { return; }

      try {
        var shema = JSON.parse(blok.textContent);
        shema.name = djelo.naziv;
        shema.artMedium = djelo.tehnika;
        shema.dateCreated = String(djelo.godina);
        shema.description = djelo.opis;
        /* Svi radovi su ulja na platnu. */
        shema.artform = 'Painting';
        if (imaIzvorniNaziv(djelo)) {
          shema.alternateName = djelo.originalniNaziv;
        } else {
          delete shema.alternateName;
        }
        shema.url = window.location.href;

        /* Dimenzije iz oblika "70 × 60 cm" u schema.org polja. */
        var mjere = /(\d+)\s*[×x]\s*(\d+)\s*cm/i.exec(djelo.dimenzije || '');
        if (mjere) {
          shema.width = { '@type': 'Distance', 'value': mjere[1], 'unitCode': 'CMT' };
          shema.height = { '@type': 'Distance', 'value': mjere[2], 'unitCode': 'CMT' };
        }

        if (djelo.slikaVelika || djelo.slika) {
          shema.image = odKorijena(djelo.slikaVelika || djelo.slika);
        }

        blok.textContent = JSON.stringify(shema, null, 2);
      } catch (e) {
        /* Ako shema ne može da se popuni, stranica i dalje radi. */
      }
    }

    /* Popunjava jednog susjeda (prethodno ili sljedeće djelo). */
    function popuniSusjeda(selektor, susjed) {
      var veza = nadji(selektor);
      if (!veza) { return; }
      var naziv = nadji('.djelo-susjed__naziv', veza);

      if (!susjed) {
        veza.hidden = true;
        return;
      }
      veza.hidden = false;
      veza.setAttribute('href', 'djelo/' + encodeURIComponent(susjed.id) + '.html');
      if (naziv) { naziv.textContent = susjed.naziv; }
    }

    /* Manje verzije slike za <picture> (img/radovi/w/, pravi ih
       alati/slike.py; širine su u polju `varijante`). <source> elementi idu
       PRIJE src-a na <img>, da pregledač bira i preuzme fajl samo jednom.
       sizes se prepisuje sa <img> u djelo.html. Bez polja ostaje JPEG. */
    function dodajIzvore(slika, djelo) {
      var okvir = slika.parentNode;
      var sirine = djelo.varijante;
      if (!okvir || okvir.nodeName !== 'PICTURE' || !Array.isArray(sirine) || !sirine.length) { return; }
      if (!/^[a-z0-9-]+$/.test(String(djelo.id))) { return; }
      Array.prototype.slice.call(okvir.querySelectorAll('source')).forEach(function (s) { okvir.removeChild(s); });
      ['avif', 'webp'].forEach(function (ekst) {
        var izvor = document.createElement('source');
        izvor.setAttribute('type', 'image/' + ekst);
        izvor.setAttribute('srcset', sirine.map(function (w) {
          return odKorijena('img/radovi/w/' + djelo.id + '-' + Number(w) + '.' + ekst) + ' ' + Number(w) + 'w';
        }).join(', '));
        izvor.setAttribute('sizes', slika.getAttribute('sizes') || '100vw');
        okvir.insertBefore(izvor, slika);
      });
    }

    /* Iscrtava djelo. */
    function prikaziDjelo(djelo, spisak, indeks, nazivSerije) {
      /* Naslov stranice i opis za dijeljenje. */
      document.title = djelo.naziv + ' — Marko Dumnić';
      var metaOpis = nadji('meta[name="description"]');
      if (metaOpis) { metaOpis.setAttribute('content', djelo.opis || ''); }

      /* Slika — alt opisuje motiv (polje `opis`), ne naziv fajla.

         width/height se postavljaju PRIJE src-a, iz stvarnih piksela
         fotografije (sirinaPx/visinaPx): pregledač tada rezerviše pravu
         visinu i stranica ne skače kad slika stigne (CLS je bio 0.18 na
         telefonu, iznad granice 0.1). Dimenzije platna u cm nisu dovoljno
         tačne — fotografija ne mora imati baš isti odnos stranica. */
      var slika = nadji('#djelo-slika');
      if (slika) {
        if (djelo.sirinaPx && djelo.visinaPx) {
          slika.setAttribute('width', String(djelo.sirinaPx));
          slika.setAttribute('height', String(djelo.visinaPx));
        }
        slika.setAttribute('alt', djelo.opis || djelo.naziv);
        dodajIzvore(slika, djelo);
        slika.setAttribute('src', odKorijena(djelo.slika));
      }

      /* Izvorni naziv — samo kad se razlikuje od prevedenog. */
      var izvorniPar = nadji('#djelo-izvorni-par');
      var imaIzvorni = imaIzvorniNaziv(djelo);
      if (izvorniPar) { izvorniPar.hidden = !imaIzvorni; }
      upisi('#djelo-izvorni', imaIzvorni ? djelo.originalniNaziv : '');

      /* Serija — veza na filtrirani spisak radova. */
      var serija = nadji('#djelo-serija');
      if (serija) {
        serija.textContent = nazivSerije || NAZIVI_SERIJA[djelo.kategorija] || '';
        serija.setAttribute('href', 'radovi.html#' + encodeURIComponent(djelo.kategorija || ''));
      }

      /* Tekstualni podaci. */
      upisi('#djelo-naziv', djelo.naziv);
      upisi('#djelo-godina', String(djelo.godina));
      upisi('#djelo-tehnika', djelo.tehnika);
      upisi('#djelo-dimenzije', djelo.dimenzije);
      upisi('#djelo-opis', djelo.opis);

      /* Upit za djelo — kontakt forma dobija id djela. */
      var upit = nadji('#djelo-upit');
      if (upit) {
        upit.setAttribute('href', 'kontakt.html?djelo=' + encodeURIComponent(djelo.id));
        upit.setAttribute('aria-label', TEKST.upit(djelo.naziv));
      }

      /* Susjedi se vrte u krug, pa nema mrtvih veza na krajevima. */
      if (spisak.length > 1) {
        var prethodni = spisak[(indeks - 1 + spisak.length) % spisak.length];
        var sljedeci = spisak[(indeks + 1) % spisak.length];
        popuniSusjeda('#djelo-prethodno', prethodni);
        popuniSusjeda('#djelo-sljedece', sljedeci);
        if (susjedi) { susjedi.hidden = false; }
      }

      popuniJsonLd(djelo);

      /* Prazno stanje odlazi, djelo dolazi. */
      if (ucitavanje) { ucitavanje.hidden = true; }
      if (greska) { greska.hidden = true; }
      okvirDjela.hidden = false;
    }

    function upisi(selektor, vrijednost) {
      var el = nadji(selektor);
      if (el) { el.textContent = vrijednost || ''; }
    }

    /* --- Tok --- */
    var id = idIzUrla();

    if (!id) {
      prikaziGresku(TEKST.nemaIdNaslov, TEKST.nemaIdTekst);
      return;
    }

    ucitajPodatke()
      .then(function (podaci) {
        var spisak = ((podaci && podaci.radovi) || []).map(naJeziku);
        var indeks = -1;

        for (var i = 0; i < spisak.length; i += 1) {
          if (spisak[i].id === id) { indeks = i; break; }
        }

        if (indeks === -1) {
          prikaziGresku(TEKST.nijeNadjenoNaslov, TEKST.nijeNadjenoTekst(id));
          return;
        }

        /* Naziv serije iz podataka, ako postoji. */
        var nazivSerije = '';
        ((podaci && podaci.kategorije) || []).forEach(function (k) {
          if (k.id === spisak[indeks].kategorija) {
            nazivSerije = (ENGLESKI && k.nazivEn) || k.naziv;
          }
        });

        prikaziDjelo(spisak[indeks], spisak, indeks, nazivSerije);
      })
      .catch(function (e) {
        /* Ovdje stiže i file:// slučaj i pravi mrežni ili JSON problem.
           Naše poruke su već na jeziku stranice; poruke pregledača ("Failed
           to fetch", "Unexpected token") se ne prikazuju sirove nego se
           zamjenjuju objašnjenjem koje korisniku nešto znači. */
        var poruka = e && e.nasa ? e.message : TEKST.neucitanoTekst;

        prikaziGresku(TEKST.neucitanoNaslov, poruka);
      });
  }

  /* ===========================================================
     IZBOR STRANICE — po prisustvu ključnog elementa
     =========================================================== */

  function pokreni() {
    var mreza = nadji('#mreza-radova');
    if (mreza) {
      pokreniRadove(mreza);
      return;
    }

    var okvirDjela = nadji('#djelo');
    if (okvirDjela) {
      pokreniDjelo(okvirDjela);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', pokreni);
  } else {
    pokreni();
  }

}());
