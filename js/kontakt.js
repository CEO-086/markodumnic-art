/* =========================================================
   kontakt.js — kontakt forma bez servera.

   Sajt je statički i nema backend. Zato forma ne šalje ništa sama:
   na potvrdu sastavi `mailto:` vezu sa popunjenim sadržajem i otvori je
   u korisnikovoj aplikaciji za e-poštu. Pošteno i radi bez servera.

   Takođe: čita `?djelo=` iz adrese (stranica djela šalje korisnika ovdje
   sa tim parametrom) i prikazuje tihu liniju "Upit za djelo: ...".

   Dvojezično: engleske stranice (en/kontakt.html, <html lang="en">)
   uzimaju tekstove iz tabele TEKST.en; crnogorska ostaje kakva je bila.
   ========================================================= */

(function () {
  "use strict";

  /* ---------------------------------------------------------
     PROMIJENITI OVDJE — e-adresa na koju forma sastavlja poruku.
     Ista adresa stoji vidljivo u kontakt.html (blok „E-pošta“ i mailto
     veze) — kad se mijenja, mijenja se na oba mjesta.
     Ako se ikad isprazni, dugme vodi korisnika na Instagram umjesto na mejl.
     --------------------------------------------------------- */
  var ADRESA = "mfnlulu@gmail.com";

  var INSTAGRAM = "https://www.instagram.com/marko.mapko/";

  /* Jezik strane. Engleske strane su u en/, pa su podaci jedan nivo gore. */
  var ENGLESKI = document.documentElement.lang === "en";
  var PUT_DO_PODATAKA = ENGLESKI ? "../data/radovi.json" : "data/radovi.json";

  /* Svi tekstovi koje korisnik vidi (i oni koji idu u mejl), po jeziku.
     Funkcije primaju broj ili naziv i vraćaju gotovu rečenicu. */
  var TEKST = {
    cnr: {
      imePrazno: "Upišite ime, da se zna ko piše.",
      epostaPrazno: "Upišite e-poštu, bez nje nema odgovora.",
      epostaPogresno: "Ova adresa ne izgleda ispravno — provjerite znak @ i domen.",
      porukaPrazno: "Napišite poruku, makar kratko.",
      provjeriteUnos: "Provjerite unos.",
      upitZaDjelo: "Upit za djelo: ",
      jednoPolje: "Jedno polje treba dopuniti prije slanja.",
      visePolja: function (n) { return "Još " + n + " polja treba dopuniti prije slanja."; },
      bezAdreseProzor:
        "E-adresa još nije postavljena na sajtu, pa poruka ne može da se " +
        "sastavi. Javite se preko Instagrama — otvara se u novom prozoru.",
      bezAdreseVeza:
        "E-adresa još nije postavljena na sajtu, pa poruka ne može da se " +
        "sastavi. Javite se preko Instagrama: ",
      naslovSajt: "Poruka sa sajta",
      tijeloIme: "Ime: ",
      tijeloEposta: "E-pošta: ",
      tijeloDjelo: "Djelo: ",
      tijeloPotpis: "Poslato sa sajta.",
      otvaramo:
        "Otvaramo vašu aplikaciju za e-poštu sa popunjenom porukom. " +
        "Ostaje samo da je pošaljete."
    },
    en: {
      imePrazno: "Please enter your name, so that I know who is writing.",
      epostaPrazno: "Please enter your email address — without it there is no way to reply.",
      epostaPogresno: "This address does not look right — please check the @ sign and the domain.",
      porukaPrazno: "Please write a message, even a short one.",
      provjeriteUnos: "Please check what you have entered.",
      upitZaDjelo: "Enquiry about the work: ",
      jednoPolje: "One field still needs to be completed before sending.",
      visePolja: function (n) { return n + " fields still need to be completed before sending."; },
      bezAdreseProzor:
        "The email address has not been set up on the site yet, so the message " +
        "cannot be composed. Please get in touch on Instagram — it opens in a new window.",
      bezAdreseVeza:
        "The email address has not been set up on the site yet, so the message " +
        "cannot be composed. Please get in touch on Instagram: ",
      naslovSajt: "Message from the website",
      tijeloIme: "Name: ",
      tijeloEposta: "Email: ",
      tijeloDjelo: "Work: ",
      tijeloPotpis: "Sent from the website.",
      otvaramo:
        "Opening your email application with the message filled in. " +
        "All that is left is to send it."
    }
  };
  var T = ENGLESKI ? TEKST.en : TEKST.cnr;

  /* Adresa se provjerava jednom, na učitavanju. Prazna ili polupopunjena
     adresa (npr. ostao samo "ime@") ne smije napraviti `mailto:` koji bi
     otvorio pokvaren nacrt u korisnikovoj aplikaciji. */
  var ADRESA_JE_ISPRAVNA =
    typeof ADRESA === "string" &&
    /^[^\s@<>,;:"]+@[^\s@<>,;:".]+(\.[^\s@<>,;:".]+)+$/.test(ADRESA.trim());

  var forma = document.getElementById("forma-kontakt");
  if (!forma) { return; }

  var status = document.getElementById("status-forme");
  var poljeDjelo = document.getElementById("polje-djelo");
  var redDjela = document.getElementById("upit-djelo");

  /* Polja i njihove poruke o grešci — jedna tabela, bez ponavljanja. */
  var polja = [
    {
      unos: document.getElementById("ime"),
      greska: document.getElementById("greska-ime"),
      prazno: T.imePrazno,
      pogresno: null
    },
    {
      unos: document.getElementById("eposta"),
      greska: document.getElementById("greska-eposta"),
      prazno: T.epostaPrazno,
      pogresno: T.epostaPogresno
    },
    {
      unos: document.getElementById("poruka"),
      greska: document.getElementById("greska-poruka"),
      prazno: T.porukaPrazno,
      pogresno: null
    }
  ];


  /* === Naziv djela iz ?djelo= ============================== */

  function procitajParametar(ime) {
    try {
      return new URLSearchParams(window.location.search).get(ime);
    } catch (e) {
      return null;
    }
  }

  /* Naziv djela kad se pročita iz podataka — ide u naslov mejla. */
  var nazivDjela = "";

  /* Id iz adrese je tuđi unos. Nikad ne ide u DOM preko innerHTML — samo
     textContent — a i prije toga se propušta kroz ovu provjeru: dopuštena
     su samo mala slova, cifre i crtica, do 64 znaka. Sve ostalo se odbacuje,
     pa `<script>`, `"><img onerror=...>` i slično nikad ne dođu ni do teksta. */
  var OBLIK_ID = /^[a-z0-9-]{1,64}$/;

  function ispravanId(vrijednost) {
    return typeof vrijednost === "string" && OBLIK_ID.test(vrijednost);
  }

  function prikaziDjelo(naziv) {
    if (naziv) { nazivDjela = naziv; }
    if (!redDjela) { return; }
    /* textContent, ne innerHTML — sadržaj se ispisuje kao tekst. */
    redDjela.textContent = T.upitZaDjelo + naziv;
    redDjela.hidden = false;
  }

  var sirovId = procitajParametar("djelo");
  var idDjela = ispravanId(sirovId) ? sirovId : "";

  if (idDjela) {
    if (poljeDjelo) { poljeDjelo.value = idDjela; }

    /* Dok podaci ne stignu, red se ne prikazuje: id nije naziv djela i ne
       treba ga pokazivati korisniku. Ako djelo ne postoji u podacima ili
       fetch ne prođe (file://), red tiho ostaje skriven — strana radi
       normalno, samo bez te linije. */
    if (window.fetch) {
      fetch(PUT_DO_PODATAKA)
        .then(function (odgovor) {
          return odgovor.ok ? odgovor.json() : null;
        })
        .then(function (podaci) {
          if (!podaci || !Array.isArray(podaci.radovi)) { return; }
          for (var i = 0; i < podaci.radovi.length; i++) {
            var rad = podaci.radovi[i];
            if (rad && rad.id === idDjela && typeof rad.naziv === "string") {
              /* Na engleskom naziv iz rad.en.naziv, a ako ga nema — crnogorski. */
              var naziv = ENGLESKI && rad.en && typeof rad.en.naziv === "string" && rad.en.naziv
                ? rad.en.naziv
                : rad.naziv;
              prikaziDjelo(naziv);
              return;
            }
          }
          /* Nepoznat id — polje se prazni da naslov mejla ne nosi besmislicu. */
          if (poljeDjelo) { poljeDjelo.value = ""; }
        })
        .catch(function () { /* tiho — red ostaje skriven */ });
    }
  }


  /* === Validacija ========================================== */

  function postaviGresku(polje, poruka) {
    if (polje.greska) { polje.greska.textContent = poruka; }
    polje.unos.classList.add("je-greska");
    polje.unos.setAttribute("aria-invalid", "true");
  }

  function ocistiGresku(polje) {
    if (polje.greska) { polje.greska.textContent = ""; }
    polje.unos.classList.remove("je-greska");
    polje.unos.removeAttribute("aria-invalid");
  }

  /* Vraća poruku o grešci ili prazan string ako je polje u redu. */
  function provjeri(polje) {
    var vrijednost = polje.unos.value.trim();
    if (!vrijednost) { return polje.prazno; }

    if (polje.unos.type === "email") {
      /* Prvo browserova provjera za type="email", pa gruba rezerva za
         slučaj da je polje palo na type="text" (stariji browser). */
      var lose = polje.unos.validity
        ? polje.unos.validity.typeMismatch
        : !/^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(vrijednost);
      if (lose) { return polje.pogresno || T.provjeriteUnos; }
    }
    return "";
  }

  /* Greška nestaje čim korisnik ispravi polje — ne čeka se ponovna potvrda. */
  polja.forEach(function (polje) {
    if (!polje.unos) { return; }
    polje.unos.addEventListener("input", function () {
      if (polje.unos.classList.contains("je-greska") && !provjeri(polje)) {
        ocistiGresku(polje);
      }
    });
    polje.unos.addEventListener("blur", function () {
      var poruka = provjeri(polje);
      if (poruka && polje.unos.value.trim()) { postaviGresku(polje, poruka); }
    });
  });


  /* === Slanje — mailto umjesto POST-a ====================== */

  function sastaviTijelo(vrijednosti) {
    var redovi = [
      vrijednosti.poruka,
      "",
      "—",
      T.tijeloIme + vrijednosti.ime,
      T.tijeloEposta + vrijednosti.eposta
    ];
    if (vrijednosti.djelo) {
      redovi.push(T.tijeloDjelo + (nazivDjela
        ? nazivDjela + " (" + vrijednosti.djelo + ")"
        : vrijednosti.djelo));
    }
    redovi.push(T.tijeloPotpis);
    return redovi.join("\n");
  }

  forma.addEventListener("submit", function (dogadjaj) {
    /* Uvijek zaustavljamo normalno slanje — nema servera koji bi primio POST. */
    dogadjaj.preventDefault();

    var prvaGreska = null;
    var brojGresaka = 0;

    polja.forEach(function (polje) {
      if (!polje.unos) { return; }
      var poruka = provjeri(polje);
      if (poruka) {
        postaviGresku(polje, poruka);
        brojGresaka += 1;
        if (!prvaGreska) { prvaGreska = polje.unos; }
      } else {
        ocistiGresku(polje);
      }
    });

    if (brojGresaka > 0) {
      status.textContent = brojGresaka === 1
        ? T.jednoPolje
        : T.visePolja(brojGresaka);
      status.classList.add("forma__status--greska");
      if (prvaGreska) { prvaGreska.focus(); }
      return;
    }

    status.classList.remove("forma__status--greska");

    var vrijednosti = {
      ime: document.getElementById("ime").value.trim(),
      eposta: document.getElementById("eposta").value.trim(),
      poruka: document.getElementById("poruka").value.trim(),
      djelo: poljeDjelo ? poljeDjelo.value.trim() : ""
    };

    /* Bez upisane (ili sa neispravno upisanom) adresom nema kuda poslati.
       Nikad ne praviti `mailto:` koji bi otvorio prazan ili pokvaren nacrt —
       radije se kaže šta je i ponudi Instagram. */
    if (!ADRESA_JE_ISPRAVNA) {
      status.textContent = T.bezAdreseProzor;
      status.classList.add("forma__status--greska");

      var prozor = window.open(INSTAGRAM, "_blank", "noopener");
      /* Ako je iskačući prozor blokiran, ne tvrdimo da smo ga otvorili. */
      if (!prozor) {
        status.textContent = T.bezAdreseVeza + INSTAGRAM;
      }
      return;
    }

    var naslov = vrijednosti.djelo
      ? T.upitZaDjelo + (nazivDjela || vrijednosti.djelo)
      : T.naslovSajt;

    /* Adresa ide kroz encodeURI (ne ...Component): znak @ mora ostati @ da
       ga klijent prepozna, a sve ostalo što bi pokvarilo vezu se kodira.
       Naslov i tijelo idu kroz encodeURIComponent — tako č/ć/ž postanu UTF-8
       procenti, novi red %0A, a & i ? ne presijeku upit. */
    var veza = "mailto:" + encodeURI(ADRESA.trim()) +
      "?subject=" + encodeURIComponent(naslov) +
      "&body=" + encodeURIComponent(sastaviTijelo(vrijednosti));

    status.textContent = T.otvaramo;

    window.location.href = veza;
  });
}());
