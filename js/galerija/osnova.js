/* =========================================================
   Virtuelna galerija — osnova
   Mjere sale i ostale konstante, elementi stranice, zajedničko
   stanje S i sitni pomoćnici koje koriste svi ostali dijelovi.

   Dvije sale: u prvoj istaknuta djela na tri zida i crteži na
   prednjem zidu, iza otvorenog prolaza druga sala sa ostalim
   radovima (sve iz data/radovi.json). Nema slobodnog hodanja: klik
   na platno vodi kameru pred njega, a iz sale u salu se hoda kroz
   prolaz.

   FAJLOVI (js/galerija/, galerija.html ih učitava OVIM REDOM):
     osnova     mjere, konstante, elementi stranice, stanje S
     tekstovi   jezik stranice i tekstovi koje skripta sama upisuje
     svjetla    reflektori i svjetiljke, svjetla van kadra, zagrijavanje
     teksture   izvori slika, red preuzimanja, slanje na GPU
     scena      raspored djela, građenje sala, djela, legende
     telefon    kartica koja se sklapa, režim preko cijelog ekrana
     ui         stanja prikaza, 2D rezerva, panel, mapa, savjeti, natpis
     izbliza    Izbliza (djelo preko cijelog ekrana) i Lupa
     kamera     pozicije, orbita, klizanje i hod, izbor djela, tura
     unos       tastatura, miš, dodir, točkić, fokus, vidljivost
     glavni     Three.js, podaci, pokretanje, petlja, izlaz, ulaz

   KLASIČNE SKRIPTE, NE ES MODULI. Modul se sa `file://` adrese ne
   izvrši (CORS), pa bi stranica otvorena duplim klikom lagala
   posjetiocu da je JavaScript isključen; klasična skripta se izvrši
   i tamo i kaže pravi razlog (vidi ulaz() u glavni.js). Uz to sve
   klasične skripte pregledač traži odjednom, čim pročita HTML, a
   moduli bi tražili još jedan ili dva kruga do servera (mjereno).

   DIJELJENJE IMENA. Svaki fajl je u svom omotaču (IIFE), pa
   globalni prostor ostaje čist. Zajednički je samo objekat G: dio
   na kraju upiše u G ono što drugi koriste (Object.assign), a na
   početku uzme iz G ono što su upisali RANIJI dijelovi
   (const { … } = G). Funkcija iz KASNIJEG dijela poziva se preko G u
   trenutku poziva (npr. G.izaberi(i) u ui.js) — tada su svi dijelovi
   već učitani. G je na window.__galerija samo dok se skripte
   učitavaju; glavni.js ga na kraju skida.

   Svaka adresa ka ovim fajlovima nosi ?v=<heš sadržaja>
   (alati/verzije.py), pa se keširaju „immutable“ (vercel.json).
   Bez build koraka. Three.js r186 iz vendor/three/, samo jezgro,
   bez addona — preuzima se tek na klik „Uđi u salu“ (glavni.js).
   Komentari na crnogorskom.
   ========================================================= */

(function () {
'use strict';

/* Zajednički objekat dijelova (vidi zaglavlje). `dijelovi`: imena
   dijelova koji su se do kraja izvršili — glavni.js ne pokreće salu
   ako neki fali (nije stigao sa mreže). */
const G = window.__galerija = { dijelovi: [] };

/* ---------------------------------------------------------
   KORIJEN SAJTA
   Sve putanje iz podataka (data/, img/, vendor/) računaju se od
   KORIJENA SAJTA, izvedenog iz adrese ove skripte
   (js/galerija/osnova.js → ../../), ne od adrese stranice — inače
   bi sa en/galerija.html išle na en/img/… i padale.
   --------------------------------------------------------- */
const KORIJEN_SAJTA = (function () {
  const s = document.currentScript;
  try { return s && s.src ? new URL('../../', s.src).href : new URL('../', document.baseURI).href; }
  catch (e) { return document.baseURI; }
})();
function izKorijena(put) {
  if (!put) { return put; }
  try { return new URL(put, KORIJEN_SAJTA).href; } catch (e) { return put; }
}

/* ---------------------------------------------------------
   BOJE SOBE — prepisane iz css/tokens.css u hex konstante.

   Three.js ne čita CSS varijable, pa je ovo jedino mjesto u
   projektu gdje se boje iz palete ponavljaju doslovno.
   AKO SE tokens.css MIJENJA, MIJENJA SE I OVO RUČNO —
   nijedna vrijednost ispod nije izmišljena, svaka stoji u
   tokenima. Provjereno uz tokens.css od 2026-10-23; `pod`
   nosi --ink-muted koji je tada promijenjen sa #8A8073 na
   #665E53 (zbog kontrasta teksta na svijetlom papiru).
   --------------------------------------------------------- */
const BOJA = {
  pozadina: 0x15120E,  /* --paper-ink   — tamna soba, i boja magle */
  pod:      0x665E53,  /* --ink-muted   — topao kameni ton poda */
  zid:      0xEDE5D7,  /* --paper-warm  — zidovi boje papira */
  plafon:   0x4A4238,  /* --ink-soft    — plafon, tamniji od zidova */
  okvir:    0x1E1A15,  /* --ink         — tanak tamni ram oko platna */
  letva:    0xB6AC9C   /* --ink-faint   — podna letva uz zidove */
};

/* ---------------------------------------------------------
   BOJE SVJETLA — ovo NISU tokeni i nemaju token-par.

   Svjetlo u sceni je temperatura boje, ne boja iz palete:
   reflektor nad slikom je 3200 K, kao halogena sijalica u
   pravoj galeriji. Paleta je zemljana (okeri, sijena, bor) i
   hladno svjetlo bi joj ubilo okere — zato toplo.

   0xFFB87B = rgb(255, 184, 123) — 3200 K po uobičajenoj
   aproksimaciji crnog tijela u sRGB. Ne mijenjati "da bude
   ljepše" bez razloga: ovo je fizička vrijednost.

   Ambijent je izveden IZ tokena: --ink-soft iz .soba-tamna
   (#C9BEAB), topao i razbijeljen taupe. Ambijent puni cijelu
   sobu, pa bi puna zasićenost od 3200 K sve prelila u narandžasto.
   --------------------------------------------------------- */
const SVJETLO_TOPLO = 0xFFEBDD;   /* 3200 K uz hromatsku adaptaciju — jača
                                     toplina razbija okere i pretvara more u pijesak */  /* 3200 K — reflektori nad djelima */
const SVJETLO_AMBIJENT = 0xE9D6BC;  /* topao ambijent — kao svjetlo odbijeno od parketa i krem zidova */
/* Ton krečenog zida: topla krem boja umjesto sivkastog maltera.
   Množi se sa teksturom zida, pa je ovo nijansa, ne puna boja. */
const TON_ZIDA = 0xF8ECDC;

/* Bijelo nije boja iz palete nego neutralna množiteljka: materijal
   množi teksturu svojom bojom, pa svaka druga vrijednost obojila bi
   sliku. Zato ni ovaj hex nema token-par. */
const NEUTRALNO = 0xFFFFFF;

/* ---------------------------------------------------------
   Mjere sobe (metri)
   --------------------------------------------------------- */
const SOBA = { sirina: 14, dubina: 9, visina: 4 };
const POLA_X = SOBA.sirina / 2;   /* 7   */
const POLA_Z = SOBA.dubina / 2;   /* 4.5 */

/* MUZEJSKI STANDARD VJEŠANJA
   Centar svakog djela na istoj liniji, 57" = 145 cm od poda — linija koju
   koriste muzeji (raspon 57–60", prosječna visina oka). Svi radovi dijele
   tu liniju bez obzira na veličinu, pa sala djeluje mirno. */
const VISINA_DJELA = 1.45;        /* visina centra platna — muzejska linija 145 cm */
const VISINA_OKA = 1.60;          /* oko odraslog posmatrača — kamera stoji tu, ne u liniji djela */
const MARGINA_ZIDA = 1.2;         /* koliko djelo stoji od ugla */

const DEBLJINA_PLATNA = 0.03;     /* 3 cm — platno je kutija, ne list papira */
const DEBLJINA_RAMA = 0.02;       /* ram je podloška iza platna */
const PREPUST_RAMA = 0.035;       /* koliko ram izlazi izvan platna sa svake strane */

/* ---------------------------------------------------------
   Svjetlo — reflektor na plafonskoj šini, muzejsko pravilo 30°
   Svjetiljka visi sa šine na plafonu, ispred zida, i snop pada
   na centar djela pod 30° OD VERTIKALE. Toliko je potrebno da
   odsjaj sa laka i stakla ode ka podu, a ne u oko posmatraču,
   i da ram ne baci dugu sjenku preko slike (strmije od 30° —
   sjenka rama; položenije od 45° — odsjaj i posmatrač zaklanja
   svjetlo sopstvenom sjenkom). Udaljenost šine od zida se RAČUNA
   iz visine šine i visine djela, nikad se ne upisuje ručno:
     od zida = (visina svjetiljke − 1.45 m) · tan 30°
   --------------------------------------------------------- */
const UGAO_UPADA = Math.PI / 6;   /* 30° od vertikale */
const VISINA_SINE = SOBA.visina - 0.04;   /* šina skoro uz plafon */
const VISINA_SVJETILJKE = SOBA.visina - 0.30;  /* sočivo reflektora, ispod šine */
const DALJINA_SVJETLA = (VISINA_SVJETILJKE - VISINA_DJELA) / Math.cos(UGAO_UPADA);  /* ≈ 2.6 m do centra djela */
const UGAO_SNOPA = 0.33;          /* ~22° — snop od 0.19 davao je krug od 28 cm,
                                     a najmanje platno je 70 cm: nijedan rad nije bio cio osvijetljen */

/* ---------------------------------------------------------
   Kamera
   --------------------------------------------------------- */
const VIDNO_POLJE = 55;           /* stepeni, vertikalno */
const PUNJENJE_KADRA = 0.55;      /* koliko kadra rad zauzima kad kamera stane pred njega */
const MIN_DALJINA = 0.8;          /* najbliže što kamera staje pred platno */
const MAX_DALJINA = 3.2;
/* Hod iz sale u salu: brzina šetnje (m/s), dužina koraka (m),
   njihanje glave gore-dolje i lijevo-desno (m), udio zaleta/kočenja */
const HOD = { brzina: 1.25, korak: 0.72, gore: 0.035, strana: 0.018, zalet: 0.22 };
const VISINA_PREGLEDA = VISINA_OKA;  /* oko posmatrača u pregledu sobe */
const TRAJANJE_KLIZANJA = 1200;   /* ms */
const PARALAKSA = 2.5 * Math.PI / 180;  /* najviše 2.5° okretanja pogleda mišem */

const PRAG_KLIKA = 8;             /* px — ispod toga je klik, iznad prevlačenje */

/* ---------------------------------------------------------
   Obilazak djela iz više uglova
   Kad kamera stane pred djelo, prevlačenjem se kruži oko centra
   platna: lijevo-desno do 70° od normale (tad se vidi debljina
   platna i reljef paste), gore-dolje od -30° do +45°. Točkić ili
   dva prsta približavaju — do 35 cm, koliko se u muzeju smije prići.
   --------------------------------------------------------- */
const ORBITA = {
  maxSkretanje: 70 * Math.PI / 180,
  minNagib: -30 * Math.PI / 180,
  maxNagib: 45 * Math.PI / 180,
  minDaljina: 0.35,
  brzina: 0.0055                  /* radijana po pikselu prevlačenja */
};
const UGAO_PRESETA = 45 * Math.PI / 180;   /* dugmad Lijevo / Desno */
const ODMAK_OD_ZIDA = 0.25;       /* kamera nikad bliže zidu od ovoga */

/* BOČNO (KOSO) SVJETLO — „raking light“ iz konzervatorskih ateljea.
   Snop pada skoro paralelno sa platnom, pa svaki potez paste baci
   sjenku. Ovako restauratori čitaju površinu slike. */
const UGAO_BOCNO = 78 * Math.PI / 180;

/* OSVJETLJENOST PO VRSTI DJELA (CIE 157 / muzejska praksa):
   ulje do ~200 lx, rad na papiru (tuš) 50 lx — papir je osjetljiv na
   svjetlo. Odnos je 4:1; ovdje je 2.5:1 jer ekran nema adaptaciju oka
   koju posjetilac ima u stvarnoj sali, pa bi crtež na 1/4 bio crna rupa. */
const OSVJETLJENOST = { ulja: 1.0, crtezi: 0.4 };
/* Zajednički reflektor za grupu crteža (po jedan sa svake strane prolaza) */
const CRTEZI_SVJETLO = { dalje: 3.2, gore: 3.3, nize: 0.55, preko: 0.5, penumbra: 0.55, jacina: 0.75 };

/* PROLAZ: otvorena vrata na sredini prednjeg zida (zid bez djela).
   1.4 × 2.5 m — dvoje ljudi se mimoilazi, po pravilima za javne
   prostore. Iza je druga izložbena sala, 9 × 6 m. */
const PROLAZ = { sirina: 1.4, visina: 2.5, zid: 0.25, okvir: 0.09, sala2: { sirina: 9, dubina: 6 } };

/* MUZEJSKA LEGENDA uz svako djelo: desno od rama, centar na 135 cm,
   redom autor · naziv · godina · tehnika · dimenzije. */
const LEGENDA = { sirina: 0.26, visina: 0.16, debljina: 0.012, odZida: 0.006, razmak: 0.10, centar: 1.35, px: 4 };

/* LUPA: krug koji uvećava dio djela ispod miša ili prsta, kao lupa
   u pregledniku fotografija. Crta se iz izvorne slike (dvostruka
   rezolucija teksture), ne iz 3D kadra — pokazuje stvarne poteze,
   bez zamućenja od svjetla i perspektive. Uvećanje je u odnosu na
   to koliko je djelo veliko na ekranu u tom trenutku. */
const LUPA = { precnik: 0.34, min: 130, max: 260, uvecanje: 3 };

/* Rezolucija u koju se djelo rasterizuje za izbliza i pod uglom */
/* Po KRAĆOJ strani ekrana, ne po trenutnoj širini — telefon otvoren
   položeno ne smije dobiti desktop teksture (7 × 17 MB na GPU-u). */
const MAX_TEKSTURA = Math.min(
  (window.screen && screen.width) || 1024,
  (window.screen && screen.height) || 1024
) < 700 ? 1024 : 2048;
const TELEFON = MAX_TEKSTURA <= 1024;

/* ŠTEDNJA PODATAKA: „štedi podatke“ (navigator.connection.saveData) ili
   prefers-reduced-data — manje teksture i ništa unaprijed (ni Three.js
   prije klika, ni velika fotografija, ni druga sala prije polaska). */
const MANJE_PODATAKA = window.matchMedia ? window.matchMedia('(prefers-reduced-data: reduce)') : null;
function stediPodatke() {
  const veza = navigator.connection;
  return !!((veza && veza.saveData) || (MANJE_PODATAKA && MANJE_PODATAKA.matches));
}

/* Odraz u podu: ogledalna kopija ispod nivoa poda. Bez addona
   (`Reflector` je addon, a addone ne koristimo). */
const ODRAZ_PROZIRNOST = 0.12;
const POD_PROZIRNOST = 0.9;       /* pod mora biti blago proziran da se odraz vidi kroz njega */

/* ---------------------------------------------------------
   Elementi stranice
   --------------------------------------------------------- */
const korijen = document.getElementById('galerija');

const el = {
  ulaz:         document.getElementById('galerija-ulaz'),
  pokreni:      document.getElementById('galerija-pokreni'),
  platno:       document.getElementById('galerija-platno'),
  ucitavanje:   document.getElementById('galerija-ucitavanje'),
  izadji:       document.getElementById('galerija-izadji'),
  fps:          document.getElementById('galerija-fps'),
  fpsPrekidac:  document.getElementById('galerija-fps-prekidac'),
  pregled:      document.getElementById('galerija-pregled'),
  prethodni:    document.getElementById('galerija-prethodni'),
  sljedeci:     document.getElementById('galerija-sljedeci'),
  sala:         document.getElementById('galerija-sala'),
  panel:        document.getElementById('galerija-panel'),
  panelZatvori: document.getElementById('galerija-panel-zatvori'),
  pNaziv:       document.getElementById('galerija-panel-naziv'),
  pKat:         document.getElementById('galerija-panel-kat'),
  pGodina:      document.getElementById('galerija-panel-godina'),
  pTehnika:     document.getElementById('galerija-panel-tehnika'),
  pDimenzije:   document.getElementById('galerija-panel-dimenzije'),
  pOpis:        document.getElementById('galerija-panel-opis'),
  pLink:        document.getElementById('galerija-panel-link'),
  bocno:        document.getElementById('galerija-bocno'),
  lupa:         document.getElementById('galerija-lupa'),
  uglovi:       Array.prototype.slice.call(document.querySelectorAll('[data-ugao]')),
  tura:         document.getElementById('galerija-tura'),
  mapa:         document.getElementById('galerija-mapa'),
  savjeti:      document.getElementById('galerija-savjeti'),
  pomoc:        document.getElementById('galerija-pomoc'),
  poruka:       document.getElementById('galerija-poruka'),
  najava:       document.getElementById('galerija-najava'),
  hud:          document.getElementById('galerija-hud'),
  alati:        document.getElementById('galerija-alati')
};

/* ---------------------------------------------------------
   Stanje
   --------------------------------------------------------- */
const S = {
  tri: null,            /* modul `three` kad se učita */
  scena: null,
  kamera: null,
  render: null,
  raycaster: null,
  platna: [],           /* mesh-evi djela — SAMO ovo gleda raycaster */
  odrazi: [],           /* ogledalne kopije — nikad klikabilne */
  mjesta: [],           /* { poz, normala, sirina, visina, djelo } po djelu */
  zaCiscenje: [],       /* geometrije, materijali, teksture */
  petlja: 0,
  sat: 0,
  fpsVidljiv: false,    /* brojač je alat za provjeru, ne za posjetioca */
  fpsBrojac: 0,
  fpsOd: 0,
  radi: false,
  djela: [],
  izabrano: -1,         /* -1 = pregled sobe */
  /* Klizanje kamere */
  anim: null,           /* { odPoz, doPoz, odCilja, doCilja, pocetak } */
  poz: null,            /* trenutna pozicija kamere (Vector3) */
  cilj: null,           /* trenutna tačka u koju kamera gleda (Vector3) */
  mis: { x: 0, y: 0 },  /* normalizovano -1..1 za paralaksu */
  vuce: false,
  pocetak: { x: 0, y: 0 },
  put: 0,
  orbita: null,         /* { skretanje, nagib, daljina } dok je djelo izabrano */
  /* Lupa: krug (div sa canvasom) iznad 3D platna */
  lupa: { na: false, okvir: null, platno: null, izvor: null, za: -1, x: null, y: null, prst: null, skala: 1, odmak: 0 },
  prsti: new Map(),     /* aktivni pokazivači — za štipanje sa dva prsta */
  stipanje: 0,          /* razmak prstiju u prošlom kadru */
  bocno: false,         /* bočno svjetlo na izabranom djelu */
  tura: null,           /* vođena tura: { i, korak, faza, pauza, od, do, osnova } */
  uvod: 0,              /* trenutak ulaska — svjetla se pale */
  anizotropija: 1,
  /* Teksture djela: red preuzimanja po prioritetu (vidi `uRed`) */
  teksture: [],         /* { djelo, soba, platno, odraz, tex, nivo, gen } po djelu */
  red: [], redBroj: 0, redAktivno: 0,
  gen: 0,               /* raste na svakom izlasku — stari poslovi se odbacuju */
  drugaKrenula: false,  /* teksture druge sale su naručene */
  najavljeno: false     /* modulepreload za Three.js je već u <head> */
};
/* Automatski testovi (Playwright): ?proba izlaže stanje kao window.__S. */
if (/(^|[?&])proba(=|&|$)/.test(location.search.slice(1))) window.__S = S;

/* Smanjeno kretanje u postavkama sistema.
   PAZI: ovo NE vodi na 2D mrežu. Sala radi i uz smanjeno kretanje,
   samo kamera skače odmah na izabrano djelo umjesto da klizi, a
   paralaksa je ugašena. Jedina poruka o tome stoji na ulaznom ekranu
   (.galerija-ulaz__napomena--kretanje) i otkriva je CSS media upit,
   pa se pojavljuje tačno jednom i tačno onima koje se tiče.
   Upit se pravi jednom (zove se u svakom kadru, a matchMedia() ga svaki
   put iznova parsira); `.matches` istog upita prati promjenu postavke. */
const MANJE_KRETANJA = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
function smanjenoKretanje() {
  return !!(MANJE_KRETANJA && MANJE_KRETANJA.matches);
}
/* Kamera se kreće: klizanje (i hod iz sale u salu, i uvod), prigušeno
   praćenje točkića i tastature, zamah posle povlačenja, prevlačenje. */
function kameraIde() {
  return !!(S.anim || S.ka || S.inercija || S.vuce);
}
/* Uvod (svjetla se pale, pogled obiđe salu) je izuzet: prave slike prve
   sale stižu na platna i dok on traje, kao i do sada — posjetilac vidi
   istu salu u istom trenutku. */
function uUvodu() {
  return !!(S.anim && S.anim.uvod);
}

/* Ugao u opsegu −π..π */
function svedi(u) {
  return Math.atan2(Math.sin(u), Math.cos(u));
}

/* easeInOutCubic */
function lako(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function pamti(x) { S.zaCiscenje.push(x); return x; }

/* Granice kretanja kamere po salama (x0, x1, z0, z1), sa odmakom od zida */
function graniceSale(soba) {
  const o = ODMAK_OD_ZIDA;
  if (soba === 2) {
    const SW = PROLAZ.sala2.sirina, SD = PROLAZ.sala2.dubina;
    const z0 = POLA_Z + PROLAZ.zid;
    return { x0: -SW / 2 + o, x1: SW / 2 - o, z0: z0 + o, z1: z0 + SD - o };
  }
  return { x0: -POLA_X + o, x1: POLA_X - o, z0: -POLA_Z + o, z1: POLA_Z - o };
}

/* U kojoj je sali tačka: sve iza ravni prolaza je druga sala */
function salaTacke(z) { return z > POLA_Z + PROLAZ.zid / 2 ? 2 : 1; }

/* Scena se promijenila (tekstura, svjetlo, veličina…) — sljedećih
   nekoliko kadrova se crta i kad kamera stoji (vidi petlju). */
function osvjeziKadar() { S.crtajJos = 6; }

function sada() {
  return (window.performance && performance.now) ? performance.now() : Date.now();
}

/* Kratka poruka preko sale („Obilazak pauziran“), sama nestane */
function poruka(tekst, trajanje) {
  if (!el.poruka) { return; }
  el.poruka.textContent = tekst;
  el.poruka.classList.add('je-vidljiva');
  window.clearTimeout(S.porukaTajmer);
  S.porukaTajmer = window.setTimeout(function () {
    if (el.poruka) { el.poruka.classList.remove('je-vidljiva'); }
  }, trajanje || 2600);
}

Object.assign(G, {
  izKorijena, BOJA, SVJETLO_TOPLO, SVJETLO_AMBIJENT, TON_ZIDA, NEUTRALNO, SOBA, POLA_X, POLA_Z,
  VISINA_DJELA, VISINA_OKA, MARGINA_ZIDA, DEBLJINA_PLATNA, DEBLJINA_RAMA, PREPUST_RAMA, UGAO_UPADA,
  VISINA_SINE, DALJINA_SVJETLA, UGAO_SNOPA, VIDNO_POLJE, PUNJENJE_KADRA, MIN_DALJINA, MAX_DALJINA, HOD,
  VISINA_PREGLEDA, TRAJANJE_KLIZANJA, PARALAKSA, PRAG_KLIKA, ORBITA, UGAO_PRESETA, ODMAK_OD_ZIDA,
  UGAO_BOCNO, OSVJETLJENOST, CRTEZI_SVJETLO, PROLAZ, LEGENDA, LUPA, MAX_TEKSTURA, TELEFON, stediPodatke,
  ODRAZ_PROZIRNOST, POD_PROZIRNOST, korijen, el, S, smanjenoKretanje, kameraIde, uUvodu, svedi, lako,
  pamti, graniceSale, salaTacke, osvjeziKadar, sada, poruka
});
G.dijelovi.push('osnova');

})();
