/* =========================================================
   Virtuelna galerija — KRATAK PRIKAZ
   Jedna soba, sedam istaknutih djela, kretanje KA IZABRANOJ SLICI.
   Nema slobodnog hodanja: klik na platno, kamera klizne pred njega.

   Three.js r186 preko ESM importmape (vidi galerija.html).
   Biblioteka se preuzima tek na klik "Uđi u salu" — dinamičkim
   `await import()` vezanim za document.baseURI, ne na učitavanju stranice.

   Ovaj fajl se uključuje kao KLASIČAN skript, ne kao modul: modul
   se sa `file://` adrese ne izvrši (CORS), pa bi stranica otvorena
   duplim klikom lagala posjetiocu da je JavaScript isključen.
   Dinamički `import()` ovdje unutra i dalje ide kroz importmapu.
   Zato je sve u omotaču (IIFE) — bez modula nema zatvorenog opsega
   sam po sebi, a globalni prostor nije smetlište.

   Bez build koraka. Bez addona (`three/addons/...`) — samo jezgro.
   Komentari na crnogorskom.
   ========================================================= */

(function () {
'use strict';

/* ---------------------------------------------------------
   JEZIK I KORIJEN SAJTA
   Ista skripta služi i crnogorsku (korijen) i englesku stranicu
   (en/). Jezik se čita iz <html lang>, a sve putanje iz podataka
   (data/, img/, vendor/) računaju se od KORIJENA SAJTA, izvedenog iz
   adrese ove skripte (js/galerija.js → ../), ne od adrese stranice —
   inače bi sa en/galerija.html išle na en/img/… i padale.
   --------------------------------------------------------- */
const EN = document.documentElement.lang === 'en';
const KORIJEN_SAJTA = (function () {
  const s = document.currentScript;
  try { return new URL('../', s && s.src ? s.src : document.baseURI).href; }
  catch (e) { return document.baseURI; }
})();
function izKorijena(put) {
  if (!put) { return put; }
  try { return new URL(put, KORIJEN_SAJTA).href; } catch (e) { return put; }
}

/* Tekstovi koje skripta sama upisuje. Crnogorski je izvor. */
const TEKST = EN ? {
  izbliza: 'Close-up: ', djelo: 'artwork', zatvori: 'Close',
  savjetPuna: 'Drag or use the arrow keys to move around the painting · click or Enter shows the whole work',
  savjetCijela: 'Click the painting or press Enter to view it at full size',
  slikaIzbliza: function (n) { return n + ' — Enter switches to full size, the arrow keys move around the painting'; },
  platnoIme: 'Virtual exhibition room',
  salaNazad: 'Back to room one', salaDruga: 'To room two',
  platno: 'Virtual exhibition room with works by Marko Dumnić. Click a painting to bring the camera in front of it; ' +
    'the left and right arrow keys go to the previous and next work, and Escape returns to the overview of the room. ' +
    'In front of a work: A and D circle around the painting, W and S change the viewing height, ' +
    'the up and down arrow keys move closer and further away, and L turns on the side light.',
  tura: 'Tour the exhibition', nastavi: 'Resume tour', pauza: 'Pause',
  obilazak: function (k, n) { return 'Tour ' + k + ' of ' + n; },
  nastavlja: 'The tour continues',
  pocetak: function (n) { return 'Exhibition tour · ' + n + ' works'; },
  pauzirano: 'Tour paused · “Resume tour” picks it up again',
  kraj: 'End of the tour · thank you for visiting',
  mapa: 'Map', tlocrt: 'Floor plan of the rooms and the works',
  sala1: 'ROOM 1', sala2: 'ROOM 2',
  djeloBr: function (i) { return 'Work ' + i; },
  idiDo: 'Go to the work: ',
  sakrijMapu: 'Hide the floor plan', prikaziMapu: 'Show the floor plan',
  crtez: 'Drawing', ulje: 'Oil painting',
  karticaVise: 'Show the details of the work', karticaManje: 'Hide the details of the work',
  opcije: 'Options', iliDodir: 'or tap a painting', oDjelu: 'About the work',
  cistoSavjet: 'Tap the painting to hide the buttons', cistoNazad: 'Tap the painting again for the buttons'
} : {
  izbliza: 'Izbliza: ', djelo: 'djelo', zatvori: 'Zatvori',
  savjetPuna: 'Prevucite ili koristite strelice za kretanje po slici · klik ili Enter vraća cijelu sliku',
  savjetCijela: 'Klik na sliku ili Enter za punu veličinu',
  slikaIzbliza: function (n) { return n + ' — Enter prebacuje na punu veličinu, strelice pomjeraju po slici'; },
  platnoIme: 'Virtuelna sala',
  salaNazad: 'Nazad u prvu salu', salaDruga: 'U drugu salu',
  platno: 'Virtuelna sala sa djelima Marka Dumnića. Klik na sliku vodi kameru pred nju, ' +
    'strelice lijevo i desno idu na prethodno i sljedeće djelo, Escape vraća na pregled sobe. ' +
    'Pred djelom: A i D kruže oko slike, W i S mijenjaju visinu pogleda, ' +
    'strelice gore i dolje približavaju, L pali bočno svjetlo.',
  tura: 'Obiđi izložbu', nastavi: 'Nastavi obilazak', pauza: 'Pauza',
  obilazak: function (k, n) { return 'Obilazak ' + k + ' od ' + n; },
  nastavlja: 'Obilazak se nastavlja',
  pocetak: function (n) { return 'Obilazak izložbe · ' + n + ' djela'; },
  pauzirano: 'Obilazak je pauziran · „Nastavi“ ga vraća',
  kraj: 'Kraj obilaska · hvala na posjeti',
  mapa: 'Mapa', tlocrt: 'Tlocrt sala sa djelima',
  sala1: 'SALA 1', sala2: 'SALA 2',
  djeloBr: function (i) { return 'Djelo ' + i; },
  idiDo: 'Idi do djela: ',
  sakrijMapu: 'Sakrij mapu sale', prikaziMapu: 'Prikaži mapu sale',
  crtez: 'Crtež', ulje: 'Ulje',
  karticaVise: 'Prikaži podatke o djelu', karticaManje: 'Sakrij podatke o djelu',
  opcije: 'Opcije', iliDodir: 'ili dodirnite sliku', oDjelu: 'O djelu',
  cistoSavjet: 'Dodir na sliku sakriva dugmad', cistoNazad: 'Dodirnite sliku da vratite dugmad'
};

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

/* IZVORI TEKSTURA (pravi ih alati/teksture.py iz originala, koji ostaju
   na disku kao rezerva):
     img/sala/<id>-160.webp     sićušna slika — stoji na platnu odmah,
                                dok prava ne stigne
     img/sala/<id>-1024.webp    fotografija za telefone (MAX_TEKSTURA 1024)
     img/radovi/<id>.jpg        fotografija za ostale, u prirodnoj veličini
     img/reljef/<id>.webp       normal mapa (telefon: <id>-512.webp)
   Ako WebP fajla nema, uzima se original (JPG / PNG). */
function izvorMali(djelo) {
  return djelo.id ? izKorijena('img/sala/' + encodeURIComponent(djelo.id) + '-160.webp') : null;
}
function izvorDjela(djelo) {
  return TELEFON && djelo.id ? izKorijena('img/sala/' + encodeURIComponent(djelo.id) + '-1024.webp') : djelo.slika;
}
function izvorReljefa(djelo, original) {
  const id = encodeURIComponent(djelo.id);
  return izKorijena('img/reljef/' + id + (original ? '.png' : (TELEFON ? '-512.webp' : '.webp')));
}

/* Three.js: modul i jezgro koje on uvozi. Oba se najavljuju kao
   <link rel="modulepreload"> čim je dugme "Uđi u salu" na vidiku, pod
   mišem ili u fokusu — inače bi jezgro krenulo tek kad modul stigne
   (vodopad od dva zahtjeva poslije klika). */
const THREE_FAJLOVI = ['vendor/three/three.module.min.js', 'vendor/three/three.core.min.js'];

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

/* ---------------------------------------------------------
   Pomoćne funkcije
   --------------------------------------------------------- */

/* Postavlja stanje prikaza: 'ulaz' | 'ucitavanje' | 'soba' | '2d' */
function stanje(novo) {
  korijen.setAttribute('data-stanje', novo);
  osvjeziUronjeno();
}

/* Prelazak na 2D mrežu, sa razlogom koji CSS otkriva.
   Vrijednosti: webgl | fajl | cdn | podaci | json | prazno
   (smanjeno kretanje NIJE među njima — vidi `smanjenoKretanje`) */
function na2D(razlog) {
  korijen.setAttribute('data-razlog', razlog);
  stanje('2d');
}

/* Da li pregledač uopšte može WebGL */
function imaWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext &&
      (c.getContext('webgl') || c.getContext('experimental-webgl')));
  } catch (e) {
    return false;
  }
}

/* Smanjeno kretanje u postavkama sistema.
   PAZI: ovo NE vodi na 2D mrežu. Sala radi i uz smanjeno kretanje,
   samo kamera skače odmah na izabrano djelo umjesto da klizi, a
   paralaksa je ugašena. Jedina poruka o tome stoji na ulaznom ekranu
   (.galerija-ulaz__napomena--kretanje) i otkriva je CSS media upit,
   pa se pojavljuje tačno jednom i tačno onima koje se tiče. */
function smanjenoKretanje() {
  return !!(window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches);
}

/* "70 × 60 cm" → { sirina: 0.70, visina: 0.60 } u METRIMA.
   Prava veličina, bez normalizacije i bez uvećanja. */
function mjereIzDimenzija(tekst, djelo) {
  const m = String(tekst || '').match(/(\d+(?:[.,]\d+)?)\s*[×xX*]\s*(\d+(?:[.,]\d+)?)/);
  if (!m) { return { sirina: 0.6, visina: 0.6 }; }
  let w = parseFloat(m[1].replace(',', '.'));
  let h = parseFloat(m[2].replace(',', '.'));
  if (!(w > 0) || !(h > 0)) { return { sirina: 0.6, visina: 0.6 }; }
  /* Katalozi pišu mjere različitim redom (visina × širina ili veća ×
     manja). Fotografija odlučuje: uspravna slika dobija uspravno platno. */
  if (djelo && djelo.sirinaPx > 0 && djelo.visinaPx > 0 &&
      (djelo.visinaPx > djelo.sirinaPx) !== (h > w)) {
    const t = w; w = h; h = t;
  }
  return { sirina: w / 100, visina: h / 100 };
}

/* "#BE8B3C" → 0xBE8B3C; ako nije valjan hex, vrati boju rama */
function uHex(s) {
  const m = String(s || '').match(/^#?([0-9a-fA-F]{6})$/);
  return m ? parseInt(m[1], 16) : BOJA.okvir;
}

/* Djelo (SVG ili fotografija) iscrta se u platno visoke rezolucije.
   SVG bi TextureLoader inače rasterizovao u prirodnoj veličini
   (npr. 700 px), pa bi izbliza i pod uglom bio mutan. */
function rasterizuj(url, max) {
  return new Promise(function (res, odbij) {
    const slika = new Image();
    slika.decoding = 'async';
    slika.onload = function () {
      const w0 = slika.naturalWidth || 1000;
      const h0 = slika.naturalHeight || 1000;
      /* Fotografija se NE uvećava: 1400 px razvučeno na 2048 ne dobija
         nijedan potez, a košta ~2x memorije na GPU-u. SVG nema prirodnu
         veličinu u pikselima, pa se on i dalje crta do `max`. */
      const vektor = /\.svg([?#]|$)/i.test(url);
      const k = vektor ? max / Math.max(w0, h0) : Math.min(1, max / Math.max(w0, h0));
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(w0 * k));
      c.height = Math.max(1, Math.round(h0 * k));
      c.getContext('2d').drawImage(slika, 0, 0, c.width, c.height);
      res(c);
    };
    slika.onerror = odbij;
    slika.src = url;
  });
}

/* Legenda kao platno sa tekstom — kao kartončić na zidu muzeja */
function napraviLegendu(djelo) {
  const w = Math.round(LEGENDA.sirina * 1000 * LEGENDA.px);
  const h = Math.round(LEGENDA.visina * 1000 * LEGENDA.px);
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = '#F3EEE4';            /* --paper */
  g.fillRect(0, 0, w, h);
  g.fillStyle = '#1E1A15';            /* --ink */
  g.textBaseline = 'alphabetic';
  const lijevo = Math.round(w * 0.08);
  let y = Math.round(h * 0.2);
  g.font = '500 ' + Math.round(h * 0.075) + 'px Inter, "Helvetica Neue", Arial, sans-serif';
  g.fillText('MARKO DUMNIĆ', lijevo, y);
  y += Math.round(h * 0.2);
  g.font = '500 ' + Math.round(h * 0.15) + 'px "EB Garamond", Georgia, serif';
  g.fillText(djelo.naziv || '', lijevo, y, w - 2 * lijevo);
  y += Math.round(h * 0.15);
  g.font = '400 ' + Math.round(h * 0.085) + 'px Inter, "Helvetica Neue", Arial, sans-serif';
  g.fillStyle = '#4A4238';            /* --ink-soft */
  if (djelo.godina != null) { g.fillText(String(djelo.godina), lijevo, y); }
  y += Math.round(h * 0.13);
  g.fillText(djelo.tehnika || '', lijevo, y, w - 2 * lijevo);
  y += Math.round(h * 0.13);
  g.fillText(djelo.dimenzije || '', lijevo, y);
  return c;
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

/* ---------------------------------------------------------
   Raspored djela po zidovima

   Djela se dijele na tri zida — lijevi, zadnji, desni — i to
   proporcionalno dužini zida (zadnji je 14 m, bočni 9 m).
   Redoslijed je redoslijed OBILASKA: lijevi zid od prednjeg ka
   zadnjem, pa zadnji zid lijevo-desno, pa desni zid od zadnjeg
   ka prednjem. Zato strelice ◀ ▶ vode kroz salu u krug, a ne
   skakuću po njoj.

   Trenutni data/radovi.json daje 7 istaknutih djela → 2 + 3 + 2.
   Funkcija radi za bilo koji broj: razmak se računa, ne upisuje.
   --------------------------------------------------------- */
function raspored(n) {
  /* Zadnji zid je 14 od ukupno 32 m zidova koji nose djela */
  let nZadnji = Math.max(1, Math.round(n * SOBA.sirina / (SOBA.sirina + 2 * SOBA.dubina)));
  if (nZadnji > n) { nZadnji = n; }
  const ostatak = n - nZadnji;
  const nLijevi = Math.ceil(ostatak / 2);
  const nDesni = ostatak - nLijevi;

  const mjesta = [];

  /* Ravnomjerno po dužini zida, sa marginom od ugla */
  function duz(korisno, i, broj) {
    return -korisno / 2 + korisno * (i + 0.5) / broj;
  }

  /* Lijevi zid (x = -POLA_X), gleda ka +x. Od prednjeg ka zadnjem → z opada. */
  const korisnoZ = Math.max(0.1, SOBA.dubina - 2 * MARGINA_ZIDA);
  for (let i = 0; i < nLijevi; i++) {
    mjesta.push({
      x: -POLA_X, z: -duz(korisnoZ, i, nLijevi), rot: Math.PI / 2
    });
  }

  /* Zadnji zid (z = -POLA_Z), gleda ka +z. Lijevo → desno, x raste. */
  const korisnoX = Math.max(0.1, SOBA.sirina - 2 * MARGINA_ZIDA);
  for (let i = 0; i < nZadnji; i++) {
    mjesta.push({
      x: duz(korisnoX, i, nZadnji), z: -POLA_Z, rot: 0
    });
  }

  /* Desni zid (x = +POLA_X), gleda ka -x. Od zadnjeg ka prednjem → z raste. */
  for (let i = 0; i < nDesni; i++) {
    mjesta.push({
      x: POLA_X, z: duz(korisnoZ, i, nDesni), rot: -Math.PI / 2
    });
  }

  /* Normala svakog mjesta: smjer u koji platno gleda, u sobu.
     rot = 0 → (0,0,1); rot = π/2 → (1,0,0); rot = -π/2 → (-1,0,0). */
  for (const m of mjesta) {
    m.y = VISINA_DJELA;
    m.nx = Math.sin(m.rot);
    m.nz = Math.cos(m.rot);
  }
  return mjesta;
}

/* Druga sala (iza prolaza): tri mjesta na zadnjem zidu, po dva na
   bočnim. Ista visina i normale kao u prvoj sali, pa za kameru,
   reflektor, legendu i lupu nema razlike u kojoj je sali djelo. */
const MJESTA_DRUGE = 7;
function rasporedDruge(n) {
  const SW = PROLAZ.sala2.sirina, SD = PROLAZ.sala2.dubina;
  const z0 = POLA_Z + PROLAZ.zid;
  /* Posjetilac ulazi kroz prolaz licem ka +z, pa mu je lijevo +x.
     `red` je redoslijed obilaska kao u prvoj sali: lijevi zid od vrata
     ka dnu, zadnji zid slijeva nadesno, desni zid od dna ka vratima —
     ▶ uvijek vodi na djelo desno. Niz ispod je redoslijed popunjavanja
     kad je djela manje od mjesta. */
  const sva = [
    { x: -1.7, z: z0 + SD, rot: Math.PI, red: 4 },
    { x: 0,    z: z0 + SD, rot: Math.PI, red: 3 },
    { x: 1.7,  z: z0 + SD, rot: Math.PI, red: 2 },
    { x: -SW / 2, z: z0 + SD * 0.36, rot: Math.PI / 2, red: 6 },
    { x:  SW / 2, z: z0 + SD * 0.36, rot: -Math.PI / 2, red: 0 },
    { x: -SW / 2, z: z0 + SD * 0.72, rot: Math.PI / 2, red: 5 },
    { x:  SW / 2, z: z0 + SD * 0.72, rot: -Math.PI / 2, red: 1 }
  ];
  const mjesta = sva.slice(0, Math.max(0, n)).sort(function (a, b) { return a.red - b.red; });
  for (const m of mjesta) {
    m.y = VISINA_DJELA;
    m.nx = Math.sin(m.rot);
    m.nz = Math.cos(m.rot);
    m.soba = 2;
  }
  return mjesta;
}

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

/* ---------------------------------------------------------
   Preuzimanje Three.js — tek na klik, preko importmape

   `import('three')` razrješava importmapa u galerija.html na
   three@0.186.1/build/three.module.js. Minifikovanog `.min.js`
   builda od r186 više nema, pa se skida puni ES modul.
   --------------------------------------------------------- */
async function ucitajThree() {
  /* PAZI: ovo je KLASIČAN skript, pa se relativni `import()` razrješava
     prema adresi STRANICE, ne prema adresi ovog fajla. Zato se putanja
     gradi od document.baseURI — tako radi i u korijenu i kad je sajt
     objavljen pod prefiksom. Sa '../' je ispadala iznad korijena. */
  const put = izKorijena(THREE_FAJLOVI[0]);
  return await import(/* webpackIgnore: true */ put);
}

/* Najava modula: pregledač ih preuzme (i parsira) unaprijed, a import()
   na klik ih nađe gotove. Bez inline skripta — CSP to ne bi dozvolio. */
function najaviThree() {
  if (S.najavljeno) { return; }
  S.najavljeno = true;
  for (const f of THREE_FAJLOVI) {
    const l = document.createElement('link');
    l.rel = 'modulepreload';
    l.href = izKorijena(f);
    document.head.appendChild(l);
  }
}
function najaviKadTreba() {
  const d = el.pokreni;
  if (!d) { return; }
  ['pointerenter', 'focus', 'touchstart', 'pointerdown'].forEach(function (tip) {
    d.addEventListener(tip, najaviThree, { once: true, passive: true });
  });
  /* Dugme na ekranu: najava kad se stranica smiri — osim uz "štedi
     podatke" ili 2G, gdje se čeka da posjetilac stvarno krene ka dugmetu. */
  const veza = navigator.connection;
  if (veza && (veza.saveData || /(^|-)2g$/.test(veza.effectiveType || ''))) { return; }
  if (!('IntersectionObserver' in window)) { return; }
  const posmatrac = new IntersectionObserver(function (unosi) {
    if (!unosi.some(function (u) { return u.isIntersecting; })) { return; }
    posmatrac.disconnect();
    const kreni = function () {
      if (window.requestIdleCallback) { window.requestIdleCallback(najaviThree, { timeout: 2000 }); }
      else { window.setTimeout(najaviThree, 200); }
    };
    if (document.readyState === 'complete') { kreni(); }
    else { window.addEventListener('load', kreni, { once: true }); }
  });
  posmatrac.observe(d);
}

/* ---------------------------------------------------------
   Podaci o djelima — sva sa "istaknuto": true

   Tri različita ishoda greške, svaki sa svojom porukom:
   'podaci' (404 / nema veze), 'json' (nije ispravan JSON),
   'prazno' (nijedno djelo nije istaknuto).
   --------------------------------------------------------- */
async function ucitajPodatke() {
  if (!window.fetch) { throw { vrsta: 'podaci' }; }

  let odgovor;
  try {
    odgovor = await fetch(izKorijena('data/radovi.json'), { cache: 'no-cache' });
  } catch (e) {
    throw { vrsta: 'podaci' };
  }
  if (!odgovor.ok) { throw { vrsta: 'podaci' }; }

  let tekst;
  try {
    tekst = await odgovor.text();
  } catch (e) {
    throw { vrsta: 'podaci' };
  }

  let podaci;
  try {
    podaci = JSON.parse(tekst);
  } catch (e) {
    throw { vrsta: 'json' };
  }

  /* Svako djelo u jeziku stranice (polje `en` na engleskoj), sa
     putanjama slika od korijena sajta — dalje u kodu sve je isto. */
  const svi = ((podaci && podaci.radovi) || []).map(function (r) {
    if (!r) { return r; }
    const d = Object.assign({}, r);
    if (EN && r.en) {
      if (r.en.naziv) { d.naziv = r.en.naziv; }
      if (r.en.opis) { d.opis = r.en.opis; }
      if (r.en.tehnika) { d.tehnika = r.en.tehnika; }
    }
    if (d.slika) { d.slika = izKorijena(d.slika); }
    if (d.slikaVelika) { d.slikaVelika = izKorijena(d.slikaVelika); }
    return d;
  });
  /* Nazivi serija za natpis u panelu ("Torinski pejzaži"…) */
  S.serije = {};
  ((podaci && podaci.kategorije) || []).forEach(function (k) {
    if (k && k.id) { S.serije[k.id] = (EN && k.nazivEn) || k.naziv; }
  });
  const izbor = svi.filter(function (r) { return r && r.istaknuto; });
  /* Ostali radovi vise u drugoj sali, koja se vidi kroz prolaz */
  S.ostali = svi.filter(function (r) { return r && !r.istaknuto && r.slika; });
  if (!izbor.length) { throw { vrsta: 'prazno' }; }
  /* Sva djela idu na zidove: istaknuta u prvu salu, ostala u drugu */
  S.uPrvoj = izbor.length;
  return izbor.concat(S.ostali.slice(0, MJESTA_DRUGE));
}

/* ---------------------------------------------------------
   Građenje sobe — pod, plafon, četiri zida, podna letva
   --------------------------------------------------------- */
/* Sobna mapa: WebP iz alati/teksture.py; ako ga nema, original PNG.
   Isti fajl učitan dvaput pregledač preuzima jednom (keš slika). */
function sobnaMapa(T, ime) {
  const ucitac = new T.TextureLoader();
  const t = ucitac.load(izKorijena('img/soba/' + ime + '.webp'), undefined, undefined, function () {
    ucitac.load(izKorijena('img/soba/' + ime + '.png'), function (p) { t.image = p.image; t.needsUpdate = true; }, undefined, function () {});
  });
  return t;
}
function napraviSobu() {
  const T = S.tri;


/* --- Teksture sobe ----------------------------------------------------
   Učitava PBR mape iz img/soba/ i popločava ih preko površine. Ako mapa
   nedostaje, materijal ostaje na čistoj boji — soba se nikad ne raspadne.
   VAŽNO: three.js MNOŽI teksturu sa `color`, pa čim se dodijeli mapa boja
   mora postati bijela, inače se sve potamni drugi put. */
function tekstureSobe(T, mat, osnova, ponavljanje, uSRGB) {
  const uzmi = (ime, boja) => {
    const t = sobnaMapa(T, ime);
    t.wrapS = t.wrapT = T.RepeatWrapping;
    t.repeat.set(ponavljanje[0], ponavljanje[1]);
    if (boja) t.colorSpace = T.SRGBColorSpace;   /* samo albedo je boja */
    return t;
  };
  mat.map = uzmi(osnova + '-albedo', true);
  mat.color.setHex(0xffffff);
  mat.normalMap = uzmi(osnova + '-normal', false);
  if (uSRGB) mat.roughnessMap = uzmi(osnova + '-roughness', false);
  mat.needsUpdate = true;
}

  /* --- Pod: topao i blago uglancan.
         Proziran je namjerno (POD_PROZIRNOST) — kroz njega se vidi
         ogledalna kopija djela ispod nivoa poda. Bez toga bi odraz
         bio sakriven pod neprozirnom pločom. --- */
  const geoPod = pamti(new T.PlaneGeometry(SOBA.sirina, SOBA.dubina));
  const matPod = pamti(new T.MeshStandardMaterial({
    color: BOJA.pod,
    roughness: 0.35,          /* blago uglancano, ne ogledalo */
    metalness: 0.0,
    transparent: true,
    opacity: POD_PROZIRNOST
  }));
  tekstureSobe(T, matPod, 'pod', [7, 4.5], true);   /* parket: pločica 2×2 m, daske 14 cm */
  /* Odbijeno svjetlo sa zidova: reflektori gađaju djela, pa bi pod
     ostao skoro crn. Mala emisija iz iste teksture glumi to rasuto
     svjetlo — jeftinije od ijednog dodatnog svjetla u sceni. */
  matPod.emissive.setHex(NEUTRALNO);
  matPod.emissiveMap = matPod.map;
  matPod.emissiveIntensity = 0.22;
  const pod = new T.Mesh(geoPod, matPod);
  pod.rotation.x = -Math.PI / 2;
  pod.receiveShadow = true;
  /* Pod se crta POSLIJE odraza, da odraz bude "ispod" njega.
     Three.js sortira prozirne objekte po daljini, ali eksplicitan
     renderOrder uklanja svaku sumnju. */
  pod.renderOrder = 2;
  S.scena.add(pod);

  /* --- Plafon: tamniji od zidova, mat --- */
  const geoPlafon = pamti(new T.PlaneGeometry(SOBA.sirina, SOBA.dubina));
  const matPlafon = pamti(new T.MeshStandardMaterial({
    color: BOJA.plafon, roughness: 0.95, metalness: 0.0
  }));
  tekstureSobe(T, matPlafon, 'plafon', [6, 4], false);
  S.matPlafon = matPlafon;
  /* Plafon ne dobija direktno svjetlo (reflektori gađaju zidove), pa bi
     bio crna rupa, a crne svjetiljke na njemu nevidljive. Kao i pod, dobija
     malo rasutog svjetla — tamna šina i reflektori se tad ocrtavaju. */
  matPlafon.color.setHex(BOJA.zid);
  matPlafon.emissive.setHex(NEUTRALNO);
  matPlafon.emissiveMap = matPlafon.map;
  matPlafon.emissiveIntensity = 0.28;
  const plafon = new T.Mesh(geoPlafon, matPlafon);
  plafon.rotation.x = Math.PI / 2;
  plafon.position.y = SOBA.visina;
  S.scena.add(plafon);

  /* --- Četiri zida: prava geometrija, mat gips --- */
  const matZid = pamti(new T.MeshStandardMaterial({
    color: BOJA.zid, roughness: 0.92, metalness: 0.0
  }));
  tekstureSobe(T, matZid, 'zid', [5, 2], true);
  matZid.color.setHex(TON_ZIDA);   /* poslije tekstura, koje boju vrate na bijelo */
  const geoZidDug = pamti(new T.PlaneGeometry(SOBA.sirina, SOBA.visina));
  S.matZid = matZid;
  const geoZidKratak = pamti(new T.PlaneGeometry(SOBA.dubina, SOBA.visina));

  /* Prednji zid (z = +POLA_Z) ne nosi djela, pa na njegovoj sredini
     stoji PROLAZ — otvorena vrata. Zid je zato složen od tri komada:
     lijevo i desno od otvora i nadvratnik iznad njega. UV svakog
     komada se skalira na njegovu veličinu, da malter ne bude razvučen. */
  const komad = function (w, h) {
    const g = pamti(new T.PlaneGeometry(w, h));
    const uv = g.attributes.uv;
    for (let k = 0; k < uv.count; k++) {
      uv.setXY(k, uv.getX(k) * w / SOBA.sirina, uv.getY(k) * h / SOBA.visina);
    }
    return g;
  };
  const bokW = (SOBA.sirina - PROLAZ.sirina) / 2;
  const nadH = SOBA.visina - PROLAZ.visina;
  const zidovi = [
    { geo: geoZidDug,    p: [0, SOBA.visina / 2, -POLA_Z], r: 0 },
    { geo: komad(bokW, SOBA.visina), p: [ (PROLAZ.sirina + bokW) / 2, SOBA.visina / 2, POLA_Z], r: Math.PI },
    { geo: komad(bokW, SOBA.visina), p: [-(PROLAZ.sirina + bokW) / 2, SOBA.visina / 2, POLA_Z], r: Math.PI },
    { geo: komad(PROLAZ.sirina, nadH), p: [0, PROLAZ.visina + nadH / 2, POLA_Z], r: Math.PI },
    { geo: geoZidKratak, p: [-POLA_X, SOBA.visina / 2, 0], r: Math.PI / 2 },
    { geo: geoZidKratak, p: [ POLA_X, SOBA.visina / 2, 0], r: -Math.PI / 2 }
  ];
  for (const z of zidovi) {
    const m = new T.Mesh(z.geo, matZid);
    m.position.set(z.p[0], z.p[1], z.p[2]);
    m.rotation.y = z.r;
    m.receiveShadow = true;
    S.scena.add(m);
  }

  /* --- Podna lajsna: drvena, iz iste teksture kao parket, 10 cm
         visoka i 1.8 cm ispupčena od zida — pa pod uglom baci
         tanku sjenku i ocrta spoj zida i poda. Godovi teku duž
         lajsne, kao na pravoj letvi. --- */
  const LAJSNA = { visina: 0.10, dubina: 0.018 };
  const texLajsna = pamti(sobnaMapa(T, 'pod-albedo'));
  texLajsna.colorSpace = T.SRGBColorSpace;
  texLajsna.wrapS = texLajsna.wrapT = T.RepeatWrapping;
  texLajsna.repeat.set(1, LAJSNA.visina / 2);   /* jedna pločica = 2 m duž lajsne */
  const matLajsna = pamti(new T.MeshStandardMaterial({
    color: NEUTRALNO, map: texLajsna, roughness: 0.45, metalness: 0.0,
    emissive: NEUTRALNO, emissiveMap: texLajsna, emissiveIntensity: 0.18
  }));
  const lajsnaBok = (SOBA.sirina - PROLAZ.sirina) / 2 - PROLAZ.okvir;
  const lajsne = [
    { duz: SOBA.sirina, p: [0, -POLA_Z], r: 0 },
    { duz: lajsnaBok, p: [ (SOBA.sirina - lajsnaBok) / 2, POLA_Z], r: Math.PI },
    { duz: lajsnaBok, p: [-(SOBA.sirina - lajsnaBok) / 2, POLA_Z], r: Math.PI },
    { duz: SOBA.dubina, p: [-POLA_X, 0], r: Math.PI / 2 },
    { duz: SOBA.dubina, p: [ POLA_X, 0], r: -Math.PI / 2 }
  ];
  for (const l of lajsne) {
    const geo = pamti(new T.BoxGeometry(l.duz, LAJSNA.visina, LAJSNA.dubina));
    /* UV duž lajsne skalirati na metre, da daske ne budu razvučene */
    const uv = geo.attributes.uv;
    for (let k = 0; k < uv.count; k++) { uv.setX(k, uv.getX(k) * l.duz / 2); }
    const m = new T.Mesh(geo, matLajsna);
    m.position.set(
      l.p[0] + Math.sin(l.r) * LAJSNA.dubina / 2,
      LAJSNA.visina / 2,
      l.p[1] + Math.cos(l.r) * LAJSNA.dubina / 2
    );
    m.rotation.y = l.r;
    m.receiveShadow = true;
    S.scena.add(m);
  }

  napraviProlaz(matLajsna);
}

/* ---------------------------------------------------------
   Prolaz — otvorena vrata na sredini prednjeg zida
   Drvena štok-obloga oko otvora, debljina zida u špaletama,
   otvoren prolaz bez krila, i iza svega druga izložbena sala sa
   ostalim radovima — da se vidi da postavka ide dalje.
   --------------------------------------------------------- */
/* Muzejska klupa: drveno sjedište 180 × 50 cm na visini 45 cm,
   na dvije mat-crne noge. rot okreće klupu oko uspravne ose. */
function napraviKlupu(matDrvo, x, z, rot) {
  const T = S.tri;
  const klupa = new T.Group();
  const sjediste = new T.Mesh(pamti(new T.BoxGeometry(1.8, 0.07, 0.5)), matDrvo);
  sjediste.position.set(0, 0.45, 0);
  sjediste.castShadow = true;
  klupa.add(sjediste);
  const geoNoga = pamti(new T.BoxGeometry(0.08, 0.42, 0.42));
  [-0.75, 0.75].forEach(function (nx) {
    const n = new T.Mesh(geoNoga, SVJ.tijelo);
    n.position.set(nx, 0.21, 0);
    klupa.add(n);
  });
  klupa.position.set(x, 0, z);
  klupa.rotation.y = rot || 0;
  S.scena.add(klupa);
}

function napraviProlaz(matDrvo) {
  const T = S.tri;
  materijaliSvjetiljke();   /* noge klupe su od istog mat-crnog metala kao reflektori */
  const Z = POLA_Z;
  const W = PROLAZ.sirina, H = PROLAZ.visina, D = PROLAZ.zid, O = PROLAZ.okvir;

  /* Špalete: unutrašnje strane otvora, kroz debljinu zida */
  const geoSpaleta = pamti(new T.PlaneGeometry(D, H));
  [[-W / 2, Math.PI / 2], [W / 2, -Math.PI / 2]].forEach(function (s2) {
    const m = new T.Mesh(geoSpaleta, S.matZid);
    m.position.set(s2[0], H / 2, Z + D / 2);
    m.rotation.y = s2[1];
    S.scena.add(m);
  });
  const geoNadSp = pamti(new T.PlaneGeometry(W, D));
  const nadSp = new T.Mesh(geoNadSp, S.matZid);
  nadSp.position.set(0, H, Z + D / 2);
  nadSp.rotation.x = Math.PI / 2;
  S.scena.add(nadSp);

  /* Drvena obloga (štok) oko otvora sa strane sale */
  const geoStubic = pamti(new T.BoxGeometry(O, H + O, 0.025));
  const geoGreda = pamti(new T.BoxGeometry(W + 2 * O, O, 0.025));
  [-1, 1].forEach(function (k) {
    const m = new T.Mesh(geoStubic, matDrvo);
    m.position.set(k * (W / 2 + O / 2), (H + O) / 2, Z - 0.0125);
    S.scena.add(m);
  });
  const greda = new T.Mesh(geoGreda, matDrvo);
  greda.position.set(0, H + O / 2, Z - 0.0125);
  S.scena.add(greda);

  /* DRUGA SALA iza prolaza — vidi se kroz vrata, ali se u nju ne
     ulazi. Isti pod, zidovi i šine kao glavna sala; na zidovima
     vise ostali radovi (oni koji nijesu istaknuti), a u sredini
     muzejska klupa. Svjetlo je JEDNO tačkasto + blaga emisija na
     djelima, ne po reflektor za svako: druga sala se vidi samo
     kroz otvor, pa ne smije koštati koliko prva. */
  const SW = PROLAZ.sala2.sirina, SD = PROLAZ.sala2.dubina, SH = SOBA.visina;
  const z0 = Z + D;
  /* Isti pod kao u prvoj sali — blago proziran, pa se i ovdje
     djela ogledaju u parketu */
  const matPod2 = pamti(new T.MeshStandardMaterial({
    color: NEUTRALNO, roughness: 0.4, metalness: 0.0,
    transparent: true, opacity: POD_PROZIRNOST
  }));
  const texPod2 = pamti(sobnaMapa(T, 'pod-albedo'));
  texPod2.colorSpace = T.SRGBColorSpace;
  texPod2.wrapS = texPod2.wrapT = T.RepeatWrapping;
  texPod2.repeat.set(SW / 2, SD / 2);
  matPod2.map = texPod2;
  matPod2.emissive.setHex(NEUTRALNO);
  matPod2.emissiveMap = texPod2;
  matPod2.emissiveIntensity = 0.15;
  const ploha = function (w, h, mat, x, y, z, rx, ry) {
    const m = new T.Mesh(pamti(new T.PlaneGeometry(w, h)), mat);
    m.position.set(x, y, z);
    m.rotation.set(rx || 0, ry || 0, 0);
    S.scena.add(m);
    return m;
  };
  ploha(SW, SD, matPod2, 0, 0, z0 + SD / 2, -Math.PI / 2, 0).renderOrder = 2;     /* pod, poslije odraza */
  ploha(SW, SD, S.matPlafon, 0, SH, z0 + SD / 2, Math.PI / 2, 0);              /* plafon */
  ploha(SD, SH, S.matZid, -SW / 2, SH / 2, z0 + SD / 2, 0, Math.PI / 2);       /* lijevi zid */
  ploha(SD, SH, S.matZid,  SW / 2, SH / 2, z0 + SD / 2, 0, -Math.PI / 2);      /* desni zid */
  ploha(SW, SH, S.matZid, 0, SH / 2, z0 + SD, 0, Math.PI);                     /* zadnji zid */

  /* Zid sa prolazom, gledan IZ druge sale. Ploha je jednostrana, pa
     bez ove strane zid iz druge sale nije postojao — kroz njega se
     vidjela prva sala. Tri komada oko otvora, kao i sa prve strane. */
  const bok = (SW - W) / 2;
  ploha(bok, SH, S.matZid, -(W / 2 + bok / 2), SH / 2, z0, 0, 0);
  ploha(bok, SH, S.matZid,  (W / 2 + bok / 2), SH / 2, z0, 0, 0);
  ploha(W, SH - H, S.matZid, 0, H + (SH - H) / 2, z0, 0, 0);
  /* Prag: pod kroz debljinu zida, da ispod prolaza nema rupe */
  ploha(W, D, matPod2, 0, 0.001, Z + D / 2, -Math.PI / 2, 0).renderOrder = 2;
  /* Štok i sa strane druge sale */
  [-1, 1].forEach(function (k) {
    const m = new T.Mesh(geoStubic, matDrvo);
    m.position.set(k * (W / 2 + O / 2), (H + O) / 2, z0 + 0.0125);
    S.scena.add(m);
  });
  const greda2 = new T.Mesh(geoGreda, matDrvo);
  greda2.position.set(0, H + O / 2, z0 + 0.0125);
  S.scena.add(greda2);

  /* Muzejska klupa u sredini druge sale */
  napraviKlupu(matDrvo, 0, z0 + SD * 0.62, 0);
  /* I u prvoj sali dvije, uz zid lijevo i desno od prolaza — mjesto
     da se sjedne i gleda zadnji zid sale */
  [-1, 1].forEach(function (k) {
    napraviKlupu(matDrvo, k * (W / 2 + O + 2.1), Z - 0.42, 0);
  });

  /* Toplo opšte svjetlo druge sale; djela imaju svoje reflektore */
  const svj = new T.PointLight(SVJETLO_TOPLO, 5, SD * 2.2, 2);
  svj.position.set(0, SH - 0.6, z0 + SD / 2);
  S.scena.add(svj);

  /* Bez krila vrata: prolaz je otvoren, kao između dvije muzejske sale */
}

/* ---------------------------------------------------------
   Svjetiljke i šine
   Jedan materijal za sva tijela (mat crno, kao muzejski reflektori),
   jedan za sočiva. Geometrije se dijele među svim svjetiljkama.
   --------------------------------------------------------- */
const SVJ = {};
function materijaliSvjetiljke() {
  const T = S.tri;
  if (SVJ.tijelo) { return; }
  SVJ.tijelo = pamti(new T.MeshStandardMaterial({ color: BOJA.okvir, roughness: 0.45, metalness: 0.6 }));
  SVJ.socivo = pamti(new T.MeshStandardMaterial({
    color: SVJETLO_TOPLO, emissive: SVJETLO_TOPLO, emissiveIntensity: 2.2, roughness: 0.2
  }));
  /* Kućište: osa duž +Z, pa lookAt okreće otvor ka djelu */
  SVJ.kuciste = pamti(new T.CylinderGeometry(0.055, 0.07, 0.2, 24, 1, true).rotateX(Math.PI / 2));
  SVJ.dno = pamti(new T.CircleGeometry(0.055, 24).rotateY(Math.PI));
  SVJ.leca = pamti(new T.CircleGeometry(0.062, 24));
  SVJ.cijev = pamti(new T.CylinderGeometry(0.012, 0.012, 1, 8));
  SVJ.adapter = pamti(new T.BoxGeometry(0.07, 0.04, 0.07));
}

function postaviSvjetiljku(poz, cilj) {
  const T = S.tri;
  materijaliSvjetiljke();

  /* Kućište: otvor (sočivo) na mjestu svjetla, tijelo iza njega */
  const glava = new T.Group();
  glava.position.copy(poz);
  glava.lookAt(cilj);
  const kuciste = new T.Mesh(SVJ.kuciste, SVJ.tijelo);
  kuciste.position.z = -0.1;
  const dno = new T.Mesh(SVJ.dno, SVJ.tijelo);
  dno.position.z = -0.2;
  const leca = new T.Mesh(SVJ.leca, SVJ.socivo);
  leca.position.z = -0.005;
  glava.add(kuciste, dno, leca);
  S.scena.add(glava);

  /* Tačka iznad kućišta odakle cijev ide gore do šine */
  const vrh = new T.Vector3(0, 0, -0.12);
  glava.localToWorld(vrh);
  const duzina = Math.max(0.02, VISINA_SINE - 0.02 - vrh.y);
  const cijev = new T.Mesh(SVJ.cijev, SVJ.tijelo);
  cijev.scale.y = duzina;
  cijev.position.set(vrh.x, vrh.y + duzina / 2, vrh.z);
  S.scena.add(cijev);

  const adapter = new T.Mesh(SVJ.adapter, SVJ.tijelo);
  adapter.position.set(vrh.x, VISINA_SINE - 0.02, vrh.z);
  S.scena.add(adapter);
}

/* Šina duž svakog zida koji nosi djela, na istoj udaljenosti od
   zida kao svjetiljke (računato iz pravila 30°). */
function postaviSine() {
  const T = S.tri;
  materijaliSvjetiljke();
  /* cijev izlazi 12 cm iza sočiva, a to je dalje od zida */
  const odZida = (DALJINA_SVJETLA + 0.12) * Math.sin(UGAO_UPADA);
  const vidjeno = {};
  for (const m of S.mjesta) {
    const kljuc = m.soba + ':' + m.nx.toFixed(2) + ',' + m.nz.toFixed(2);
    if (vidjeno[kljuc]) { continue; }
    vidjeno[kljuc] = true;
    const g = graniceSale(m.soba);
    const uzX = Math.abs(m.nz) > 0.5;     /* zadnji zid — šina ide duž x */
    const duzina = (uzX ? g.x1 - g.x0 : g.z1 - g.z0) + 2 * ODMAK_OD_ZIDA - 1.0;
    const geo = pamti(new T.BoxGeometry(uzX ? duzina : 0.035, 0.03, uzX ? 0.035 : duzina));
    const sina = new T.Mesh(geo, SVJ.tijelo);
    sina.position.set(
      uzX ? (g.x0 + g.x1) / 2 : m.x + m.nx * odZida,
      VISINA_SINE,
      uzX ? m.z + m.nz * odZida : (g.z0 + g.z1) / 2
    );
    S.scena.add(sina);
  }
}

/* ---------------------------------------------------------
   Teksture djela — red preuzimanja

   Svih 13 fotografija i 13 normal mapa odjednom na telefonu znači da
   sala stoji siva i minut i po. Zato red sa prioritetima i najviše
   RED_MAX poslova istovremeno (manji broj = ranije):
     —    sićušne slike (img/sala/<id>-160.webp, ~4 KB) svih djela
          idu odmah, mimo reda
     1    prave slike prve sale
     3    reljef prve sale
   a kad posjetilac krene ka drugoj sali (`ucitajDrugu`):
     0.5  prave slike druge sale
     2    reljef druge sale
   --------------------------------------------------------- */
const RED_MAX = 4;
function uRed(prioritet, posao) {
  S.red.push({ p: prioritet, n: S.redBroj++, posao: posao, gen: S.gen });
  S.red.sort(function (a, b) { return a.p - b.p || a.n - b.n; });
  pumpaj();
}
function pumpaj() {
  while (S.redAktivno < RED_MAX && S.red.length) {
    const z = S.red.shift();
    if (z.gen !== S.gen) { continue; }
    S.redAktivno++;
    let p;
    try { p = Promise.resolve(z.posao()); } catch (e) { p = Promise.resolve(); }
    p.catch(function () {}).then(function () { S.redAktivno--; pumpaj(); });
  }
}
/* Posao još važi: ista sala (nije se izašlo i ponovo ušlo u međuvremenu) */
function aktuelno(m) { return m.gen === S.gen && !!S.render; }

/* Nova slika na platno i odraz — samo ako je bolja od postojeće */
function staviBoju(m, c, nivo) {
  if (!aktuelno(m) || nivo <= m.nivo) { return; }
  const T = S.tri;
  /* Rasterizovana oštro, sa mipmapama i anizotropnim filtriranjem.
     Bez anizotropije platno pod uglom od 60° se razmaže u mrlju. */
  const tex = pamti(new T.CanvasTexture(c));
  tex.colorSpace = T.SRGBColorSpace;
  tex.generateMipmaps = true;
  tex.minFilter = T.LinearMipmapLinearFilter;
  tex.anisotropy = S.anizotropija;
  const stara = m.tex;
  m.tex = tex;
  m.nivo = nivo;
  /* Odraz dobija istu teksturu, da se u podu ne vidi prazna boja
     ispod obojenog platna. */
  [m.platno, m.odraz].forEach(function (mat) {
    mat.map = tex;
    mat.color.set(NEUTRALNO);
    mat.needsUpdate = true;
  });
  if (stara) { stara.dispose(); }
}
function ucitajMalu(m) {
  const u = izvorMali(m.djelo);
  if (!u || !aktuelno(m)) { return null; }
  return rasterizuj(u, 256).then(function (c) { staviBoju(m, c, 1); }, function () {});
}
function ucitajBoju(m) {
  if (!aktuelno(m)) { return null; }
  const maxStr = Math.min(MAX_TEKSTURA, S.render.capabilities.maxTextureSize || MAX_TEKSTURA);
  const glavni = izvorDjela(m.djelo);
  return rasterizuj(glavni, maxStr).catch(function (g) {
    /* nema WebP-a za telefon — original JPG */
    if (glavni === m.djelo.slika) { throw g; }
    return rasterizuj(m.djelo.slika, maxStr);
  }).then(function (c) { staviBoju(m, c, 2); }, function () { /* tišina — rezervna boja ostaje */ });
}
/* RELJEF PASTE: normal mapa iz img/reljef/<id>.webp.
   Ovo je ono što obilazak iz više uglova čini vrijednim — svjetlo
   prelazi preko poteza različito iz svakog ugla.
   NAPOMENA: sadašnje mape su IZVEDENE iz fotografija djela, ne
   izmjerene sa platna. Sa pravim snimkom (fotometrijski stereo) mapa
   se samo zamijeni (pa alati/teksture.py), kod ostaje isti. */
function ucitajReljef(m) {
  if (!aktuelno(m) || !m.djelo.id || m.djelo.kategorija === 'crtezi') { return null; }
  const T = S.tri;
  const ucitavac = new T.TextureLoader();
  const uzmi = function (url) {
    return new Promise(function (res, odbij) { ucitavac.load(url, res, undefined, odbij); });
  };
  return uzmi(izvorReljefa(m.djelo, false))
    .catch(function () { return uzmi(izvorReljefa(m.djelo, true)); })
    .then(function (nm) {
      if (!aktuelno(m)) { nm.dispose(); return; }
      nm.anisotropy = S.anizotropija;
      m.platno.normalMap = nm;
      m.platno.normalScale = new T.Vector2(1.2, 1.2);
      m.platno.needsUpdate = true;
      pamti(nm);
    }, function () { /* nema mape — platno ostaje ravno */ });
}
function rasporediTeksture() {
  /* Sićušne slike (~4 KB) idu odmah, mimo reda — ne zauzimaju mjesto
     pravim slikama prve sale. */
  S.teksture.forEach(ucitajMalu);
  S.teksture.forEach(function (m) {
    if (m.soba !== 2) { uRed(1, function () { return ucitajBoju(m); }); }
  });
  S.teksture.forEach(function (m) {
    if (m.soba !== 2) { uRed(3, function () { return ucitajReljef(m); }); }
  });
}
/* Druga sala: čim posjetilac krene ka njoj (vrata, hod, tura, izbor
   djela iz nje, mapa) ili se samo okrene ka prolazu. */
function ucitajDrugu() {
  if (S.drugaKrenula || !S.teksture.length) { return; }
  S.drugaKrenula = true;
  S.teksture.forEach(function (m) {
    if (m.soba === 2) { uRed(0.5, function () { return ucitajBoju(m); }); }
  });
  S.teksture.forEach(function (m) {
    if (m.soba === 2) { uRed(2, function () { return ucitajReljef(m); }); }
  });
}
function paziNaDrugu() {
  if (S.drugaKrenula || !S.poz || !S.cilj) { return; }
  const dx = S.cilj.x - S.poz.x, dz = S.cilj.z - S.poz.z;
  const d = Math.hypot(dx, dz) || 1;
  /* pogled ka prednjem zidu (prolazu), blizu vrata, ili već u drugoj */
  if (dz / d > 0.35 || S.poz.z > POLA_Z - 1.5 || S.sala === 2) { ucitajDrugu(); }
}

/* ---------------------------------------------------------
   Djela na zidovima + reflektor nad svakim + odraz u podu
   --------------------------------------------------------- */
function postaviDjela(djela) {
  const T = S.tri;
  const uPrvoj = Math.min(djela.length, S.uPrvoj || djela.length);
  const mjesta = raspored(uPrvoj).concat(rasporedDruge(djela.length - uPrvoj));
  S.teksture = [];
  S.drugaKrenula = false;

  /* Ram je jedan materijal za sva djela — tanak i tamniji od platna */
  const matRam = pamti(new T.MeshStandardMaterial({
    color: BOJA.okvir, roughness: 0.8, metalness: 0.0
  }));

  djela.forEach(function (djelo, i) {
    const mj = mjesta[i];
    if (!mj) { return; }

    /* Prava veličina iz polja `dimenzije`, u metrima */
    const d = mjereIzDimenzija(djelo.dimenzije, djelo);

    /* Rezervna boja: ZADNJA iz palete djela. Ako tekstura padne,
       platno ostaje u toj boji — sala nikad nije prazna. */
    const rezervna = uHex(
      djelo.paleta && djelo.paleta.length ? djelo.paleta[djelo.paleta.length - 1] : null
    );

    /* --- Ram: podloška malo veća od platna, prislonjena uz zid --- */
    const geoRam = pamti(new T.BoxGeometry(
      d.sirina + 2 * PREPUST_RAMA,
      d.visina + 2 * PREPUST_RAMA,
      DEBLJINA_RAMA
    ));
    const ram = new T.Mesh(geoRam, matRam);
    const dubRam = DEBLJINA_RAMA / 2;
    ram.position.set(mj.x + mj.nx * dubRam, mj.y, mj.z + mj.nz * dubRam);
    ram.rotation.y = mj.rot;
    ram.castShadow = true;
    S.scena.add(ram);

    /* --- Platno: TANKA KUTIJA, ne list papira.
           3 cm debljine, pa se bočna ivica vidi pod uglom. --- */
    const matPlatno = pamti(new T.MeshStandardMaterial({
      color: rezervna,
      roughness: 0.62,       /* ulje nije sjajno, ali ni kreda */
      metalness: 0.0
    }));
    const geoPlatno = pamti(new T.BoxGeometry(d.sirina, d.visina, DEBLJINA_PLATNA));
    /* Slika samo na licu (+Z strana kutije). Bokovi su sirovi lan —
       pod uglom se vidi ivica platna, a ne razvučena slika. */
    const matBok = pamti(new T.MeshStandardMaterial({
      color: BOJA.letva, roughness: 0.9, metalness: 0.0
    }));
    const platno = new T.Mesh(geoPlatno, [matBok, matBok, matBok, matBok, matPlatno, matBok]);
    const dubPlatno = DEBLJINA_RAMA + DEBLJINA_PLATNA / 2;
    platno.position.set(mj.x + mj.nx * dubPlatno, mj.y, mj.z + mj.nz * dubPlatno);
    platno.rotation.y = mj.rot;
    platno.castShadow = true;
    platno.userData.indeks = i;
    platno.userData.djelo = djelo;
    S.scena.add(platno);
    S.platna.push(platno);

    /* --- ODRAZ U PODU, bez addona.
           `Reflector` je addon i ne koristimo ga. Ovo je ogledalna
           kopija platna i rama ispod nivoa poda: pozicija po y se
           obrne, scale.y = -1, prozirnost oko 0.12, depthWrite
           ugašen. Jeftino — dva mesh-a po djelu, bez druge kamere i
           bez dodatnog prolaza renderovanja — a utisak je velik.

           scale.y = -1 obrće namotavanje trouglova, pa ogledalni
           materijal mora biti DoubleSide, inače bi kutija bila
           vidljiva iznutra. --- */
    const matOdrazPlatno = pamti(new T.MeshStandardMaterial({
      color: rezervna,
      roughness: 0.62,
      metalness: 0.0,
      transparent: true,
      opacity: ODRAZ_PROZIRNOST,
      depthWrite: false,
      side: T.DoubleSide
    }));
    const odrazPlatno = new T.Mesh(geoPlatno, matOdrazPlatno);
    odrazPlatno.position.copy(platno.position);
    odrazPlatno.position.y = -platno.position.y;
    odrazPlatno.rotation.y = mj.rot;
    odrazPlatno.scale.y = -1;
    odrazPlatno.renderOrder = 1;
    S.scena.add(odrazPlatno);
    S.odrazi.push(odrazPlatno);

    const matOdrazRam = pamti(new T.MeshStandardMaterial({
      color: BOJA.okvir,
      roughness: 0.8,
      metalness: 0.0,
      transparent: true,
      opacity: ODRAZ_PROZIRNOST,
      depthWrite: false,
      side: T.DoubleSide
    }));
    const odrazRam = new T.Mesh(geoRam, matOdrazRam);
    odrazRam.position.copy(ram.position);
    odrazRam.position.y = -ram.position.y;
    odrazRam.rotation.y = mj.rot;
    odrazRam.scale.y = -1;
    odrazRam.renderOrder = 1;
    S.scena.add(odrazRam);
    S.odrazi.push(odrazRam);

    /* --- Tekstura djela i RELJEF PASTE (normal mapa) ne učitavaju se
           ovdje, nego kroz red (vidi `rasporediTeksture`): prvo sićušna
           slika svih djela, pa prava slika prve sale, pa njen reljef.
           Druga sala čeka dok posjetilac ne krene ka njoj. Do tada platno
           stoji u rezervnoj boji, pa u sićušnoj slici — nikad prazno. --- */
    if (djelo.slika) {
      S.teksture.push({
        djelo: djelo, soba: mj.soba || 1,
        platno: matPlatno, odraz: matOdrazPlatno,
        tex: null, nivo: 0, gen: S.gen
      });
    }

    /* --- MUZEJSKA LEGENDA desno od rama --- */
    const tx = mj.nz, tz = -mj.nx;   /* tangenta zida, desno za posmatrača */
    const odCentra = d.sirina / 2 + PREPUST_RAMA + LEGENDA.razmak + LEGENDA.sirina / 2;
    const platnoLeg = napraviLegendu(djelo);
    const texLeg = pamti(new T.CanvasTexture(platnoLeg));
    /* Fontovi sajta (EB Garamond, Inter) možda još nisu stigli —
       legenda se precrta kad stignu, da ne ostane u rezervnom fontu. */
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () {
        if (!S.radi) { return; }
        const novo = napraviLegendu(djelo);
        platnoLeg.getContext('2d').drawImage(novo, 0, 0);
        texLeg.needsUpdate = true;
      });
    }
    texLeg.colorSpace = T.SRGBColorSpace;
    texLeg.anisotropy = S.anizotropija;
    /* Kartica je ploča od 12 mm (kao muzejski forex), odmaknuta od
       zida — pod uglom joj se vidi ivica i baca sjenku. Blaga emisija
       iz same teksture drži tekst čitljivim i kad se gleda postrance,
       gdje reflektor slabije pada. */
    const matLeg = pamti(new T.MeshStandardMaterial({
      map: texLeg, roughness: 0.8, metalness: 0.0,
      emissive: NEUTRALNO, emissiveMap: texLeg, emissiveIntensity: 0.35
    }));
    const matIvicaLeg = pamti(new T.MeshStandardMaterial({ color: BOJA.letva, roughness: 0.7, metalness: 0.0 }));
    const geoLeg = pamti(new T.BoxGeometry(LEGENDA.sirina, LEGENDA.visina, LEGENDA.debljina));
    const legenda = new T.Mesh(geoLeg, [matIvicaLeg, matIvicaLeg, matIvicaLeg, matIvicaLeg, matLeg, matIvicaLeg]);
    legenda.castShadow = true;
    legenda.position.set(
      mj.x + tx * odCentra + mj.nx * (LEGENDA.odZida + LEGENDA.debljina / 2),
      LEGENDA.centar,
      mj.z + tz * odCentra + mj.nz * (LEGENDA.odZida + LEGENDA.debljina / 2)
    );
    legenda.rotation.y = mj.rot;
    legenda.userData.indeks = i;
    S.scena.add(legenda);
    S.platna.push(legenda);    /* klik na legendu bira djelo */

    /* --- REFLEKTOR na šini: uski SpotLight odozgo, 30° od vertikale.
           Pozicija se RAČUNA iz pozicije rada:

             pozicija = centar_platna
                      + normala * (L * sin 30°)
                      + gore    * (L * cos 30°)

           Snop ide iz sočiva svjetiljke u centar platna. Nijedna
           koordinata svjetla nije upisana ručno. --- */
    const vodoravno = DALJINA_SVJETLA * Math.sin(UGAO_UPADA);
    const uspravno = DALJINA_SVJETLA * Math.cos(UGAO_UPADA);

    const svjetlo = new T.SpotLight(SVJETLO_TOPLO);
    /* Intenzitet je u fizičkoj skali (candela) — od r155 Three.js
       nema više "legacy lights", pa vrijednosti liče na stvarne
       sijalice, a ne na stare brojeve oko 1. Uz decay = 2 i
       daljinu od 3 m, 26 cd daje osvijetljen rad i zidove u polumraku. */
    const osvjetljenost = OSVJETLJENOST[djelo.kategorija] || OSVJETLJENOST.ulja;
    /* 17 cd je bilo kalibrisano na 3 m; svjetlo je sad bliže, pa se
       jačina skalira sa kvadratom daljine da rasvjeta djela ostane ista. */
    svjetlo.intensity = 17 * Math.pow(DALJINA_SVJETLA / 3.0, 2) * osvjetljenost;
    svjetlo.distance = DALJINA_SVJETLA * 2.2;
    svjetlo.angle = UGAO_SNOPA;
    svjetlo.penumbra = 0.6;    /* mekana ivica — muzejski reflektor ne crta oštar krug na zidu */
    svjetlo.decay = 2;
    svjetlo.position.set(
      mj.x + mj.nx * vodoravno,
      mj.y + uspravno,
      mj.z + mj.nz * vodoravno
    );
    svjetlo.target.position.set(mj.x, mj.y, mj.z);

    /* SJENKU BACA SAMO JEDNO SVJETLO, ne svih sedam.
       Sjenke su najskuplja stvar u sceni; sedam shadow mapa bi
       ubilo brzinu na slabijoj grafici, a dobitak je jedna mekana
       sjenka ispod rama koju ionako vidite samo kod prvog djela. */
    if (i === 0) {
      svjetlo.castShadow = true;
      svjetlo.shadow.mapSize.width = 1024;
      svjetlo.shadow.mapSize.height = 1024;
      svjetlo.shadow.camera.near = 0.5;
      svjetlo.shadow.camera.far = DALJINA_SVJETLA * 2.2;
      svjetlo.shadow.bias = -0.0008;
    } else {
      svjetlo.castShadow = false;
    }

    S.scena.add(svjetlo.target);
    S.scena.add(svjetlo);

    /* --- SVJETILJKA: vidljivo tijelo reflektora na mjestu svjetla —
           adapter na šini, kratka cijev i kućište okrenuto ka djelu,
           sa toplim sočivom. Svjetlo u sceni izlazi tačno iz sočiva. */
    postaviSvjetiljku(svjetlo.position, svjetlo.target.position);

    /* Zapamti mjesto, da kamera zna gdje da stane */
    S.mjesta.push({
      soba: mj.soba || 1,
      mesh: platno,          /* lice djela — lupa gađa samo njega */
      x: mj.x, y: mj.y, z: mj.z,
      nx: mj.nx, nz: mj.nz,
      sirina: d.sirina, visina: d.visina,
      djelo: djelo,
      svjetlo: svjetlo,
      svjetloPoz: svjetlo.position.clone(),
      svjetloJacina: svjetlo.intensity
    });
  });

  postaviSine();
  rasporediTeksture();

  /* Prigušen ambijent: zidovi tonu u polumrak, radovi svijetle.
     Namjerno slab — da nije, reflektori ne bi imali šta da istaknu. */
  S.ambijent = new T.AmbientLight(SVJETLO_AMBIJENT, 0.55);
  S.scena.add(S.ambijent);
  /* Toplina sobe: nebo toplo-svijetlo, „zemlja“ boje parketa. Svaka
     površina okrenuta nadolje dobija malo smeđeg odsjaja poda, a
     okrenuta nagore malo krem odsjaja zidova — kao u pravoj sali. */
  S.polulopta = new T.HemisphereLight(0xFFEEDA, 0x6B4226, 0.35);
  S.scena.add(S.polulopta);
}

/* ---------------------------------------------------------
   Kamera: pregled sobe i stajanje pred djelom
   --------------------------------------------------------- */

/* Pozicija iz koje se vidi cijela soba.
   Udaljenost se računa iz vidnog polja i odnosa stranica okna:
   da bi cijela širina zadnjeg zida (14 m) ušla u kadar, kamera
   mora biti najmanje D metara od njega. Na uskom ekranu (telefon
   uspravno) D ispadne veće od dubine sobe, pa se kamera prisloni
   uz prednji zid i pokaže koliko može — bolje nego da izađe kroz zid. */
function pozicijaPregleda() {
  const T = S.tri;
  /* Pregled druge sale: stoji se odmah iza vrata, pogled na zadnji zid */
  if (S.sala === 2) {
    const z0 = POLA_Z + PROLAZ.zid;
    const poz2 = new T.Vector3(0, VISINA_PREGLEDA, z0 + 0.45);
    const cilj2 = new T.Vector3(0, 2.15, z0 + PROLAZ.sala2.dubina);   /* kao u prvoj sali: u kadru i reflektori na šini */
    if (S.pogled) {
      const dx = cilj2.x - poz2.x, dz = cilj2.z - poz2.z;
      const c = Math.cos(S.pogled), sn = Math.sin(S.pogled);
      cilj2.x = poz2.x + dx * c + dz * sn;
      cilj2.z = poz2.z - dx * sn + dz * c;
    }
    return { poz: poz2, cilj: cilj2 };
  }
  const aspekt = S.kamera ? S.kamera.aspect : 1.6;
  const polV = (VIDNO_POLJE / 2) * Math.PI / 180;
  const polH = Math.atan(Math.tan(polV) * aspekt);
  const trazeno = (POLA_X - 1.2) / Math.max(0.1, Math.tan(polH));
  /* Kamera ne prilazi prednjem zidu bliže od 2.3 m: pri okretu za
     180° (pogled 360°) mora stati i prolaz u kadar, a ne samo malter. */
  const z = Math.min(POLA_Z - 2.2, -POLA_Z + trazeno);
  const poz = new T.Vector3(0, VISINA_PREGLEDA, z);
  /* Pogled blago uzdignut (2.1 m, ne 1.45): u kadar ulaze i
     reflektori na šini iznad djela, ne samo djela i pod. */
  const cilj = new T.Vector3(0, 2.2, -POLA_Z + 0.2);
  /* Razgledanje: prevlačenjem u pregledu posjetilac okreće glavu
     lijevo-desno (S.pogled). Na uspravnom telefonu ovo je jedini
     način da se vide bočni zidovi — kadar je preuzak za cijelu sobu. */
  if (S.pogled) {
    const dx = cilj.x - poz.x, dz = cilj.z - poz.z;
    const c = Math.cos(S.pogled), sn = Math.sin(S.pogled);
    cilj.x = poz.x + dx * c + dz * sn;
    cilj.z = poz.z - dx * sn + dz * c;
  }
  return { poz: poz, cilj: cilj };
}

/* Pozicija pred djelom: po normali platna, na daljini koja rad
   stavlja u razuman dio kadra (PUNJENJE_KADRA po kraćoj strani). */
function pozicijaPredDjelom(i) {
  const T = S.tri;
  const m = S.mjesta[i];
  const aspekt = S.kamera ? S.kamera.aspect : 1.6;
  const polV = (VIDNO_POLJE / 2) * Math.PI / 180;
  const tanV = Math.tan(polV);

  /* vidljiva visina na daljini d = 2 * d * tan(polV)
     vidljiva širina = vidljiva visina * aspekt
     tražimo d tako da i visina i širina rada uđu u PUNJENJE_KADRA */
  const dVisina = m.visina / (2 * PUNJENJE_KADRA * tanV);
  const dSirina = m.sirina / (2 * PUNJENJE_KADRA * tanV * aspekt);
  let d = Math.max(dVisina, dSirina);
  d = Math.max(MIN_DALJINA, Math.min(MAX_DALJINA, d));
  return d;
}

/* Početna orbita pred djelom: sprijeda, sa visine oka. Oko je na
   160 cm a centar djela na 145, pa se gleda blago naniže — kao u sali. */
function pocetnaOrbita(i) {
  const d = pozicijaPredDjelom(i);
  return {
    skretanje: 0,
    nagib: Math.atan2(VISINA_OKA - S.mjesta[i].y, d),
    daljina: d
  };
}

/* Pozicija kamere iz orbite: sfera oko centra platna.
   n = normala platna, t = tangenta zida (desno), gore = y. */
function pozicijaOrbite(i, o) {
  const T = S.tri;
  const m = S.mjesta[i];
  const tx = m.nz, tz = -m.nx;
  const cn = Math.cos(o.nagib);
  const naprijed = o.daljina * cn * Math.cos(o.skretanje);
  const ustranu = o.daljina * cn * Math.sin(o.skretanje);
  const poz = new T.Vector3(
    m.x + m.nx * naprijed + tx * ustranu,
    m.y + o.daljina * Math.sin(o.nagib),
    m.z + m.nz * naprijed + tz * ustranu
  );
  /* Kamera ne izlazi iz sobe ni kroz pod ni kroz plafon */
  const g = graniceSale(m.soba);
  poz.x = Math.max(g.x0, Math.min(g.x1, poz.x));
  poz.z = Math.max(g.z0, Math.min(g.z1, poz.z));
  poz.y = Math.max(0.3, Math.min(SOBA.visina - 0.3, poz.y));
  return { poz: poz, cilj: new T.Vector3(m.x, m.y, m.z) };
}

function ogranicOrbitu(o) {
  o.skretanje = Math.max(-ORBITA.maxSkretanje, Math.min(ORBITA.maxSkretanje, o.skretanje));
  o.nagib = Math.max(ORBITA.minNagib, Math.min(ORBITA.maxNagib, o.nagib));
  o.daljina = Math.max(ORBITA.minDaljina, Math.min(MAX_DALJINA + 0.6, o.daljina));
}

/* Orbita se mijenja: prevlačenje i točkić idu odmah (bez klizanja,
   prst mora osjetiti sliku), dugmad uglova klize. */
function promijeniOrbitu(o, klizi) {
  if (S.izabrano < 0) { return; }
  ogranicOrbitu(o);
  S.orbita = o;
  const c = pozicijaOrbite(S.izabrano, o);
  if (klizi) { kreniKa(c.poz, c.cilj); return; }
  S.anim = null;
  if (smanjenoKretanje()) { S.poz.copy(c.poz); S.cilj.copy(c.cilj); return; }
  S.ka = c;
}

/* Dugmad uglova: lijevo · sprijeda · desno · izbliza */
function ugao(vrsta) {
  if (S.izabrano < 0) { return; }
  const o = pocetnaOrbita(S.izabrano);
  if (vrsta === 'lijevo') { o.skretanje = -UGAO_PRESETA; }
  else if (vrsta === 'desno') { o.skretanje = UGAO_PRESETA; }
  else if (vrsta === 'izbliza') { otvoriIzbliza(); return; }
  promijeniOrbitu(o, true);
}

/* --- IZBLIZA: djelo preko cijelog ekrana, iz fotografije u najvećoj
       rezoluciji (slikaVelika). Odvojeno od lupe — lupa je krug koji
       uvećava dio slike u sali, a ovo je sama slika, bez sale. --- */
function otvoriIzbliza() {
  if (S.izabrano < 0 || S.izbliza) { return; }
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
  const okno = o.querySelector('.galerija-izbliza__okno');
  const img = o.querySelector('img');
  const savjet = o.querySelector('.galerija-izbliza__savjet');
  const dugme = o.querySelector('.galerija-izbliza__zatvori');
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
  /* Prvo manja fotografija (već je u kešu), pa velika kad stigne */
  img.src = djelo.slika || djelo.slikaVelika;
  if (djelo.slikaVelika && djelo.slikaVelika !== djelo.slika) {
    const velika = new Image();
    velika.onload = function () { if (S.izbliza && S.izbliza.el === o) { img.src = velika.src; } };
    velika.src = djelo.slikaVelika;
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
  L.na = !!ukljuci && S.izabrano >= 0;
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
      rasterizuj(djelo.slikaVelika || djelo.slika, maxStr).then(function (c) {
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

/* Bočno svjetlo: reflektor izabranog djela prelazi na stranu,
   skoro paralelno sa platnom. Isključuje se pri izboru drugog djela. */
function postaviBocno(ukljuci) {
  const T = S.tri;
  for (let i = 0; i < S.mjesta.length; i++) {
    const m = S.mjesta[i];
    const na = ukljuci && i === S.izabrano;
    if (na) {
      const tx = m.nz, tz = -m.nx;
      const L = DALJINA_SVJETLA * 0.6;
      m.svjetlo.position.set(
        m.x - tx * L * Math.sin(UGAO_BOCNO) + m.nx * L * Math.cos(UGAO_BOCNO),
        m.y + 0.15,
        m.z - tz * L * Math.sin(UGAO_BOCNO) + m.nz * L * Math.cos(UGAO_BOCNO)
      );
      m.svjetlo.angle = 0.75;
      m.svjetlo.intensity = m.svjetloJacina * 0.9;
    } else {
      m.svjetlo.position.copy(m.svjetloPoz);
      m.svjetlo.angle = UGAO_SNOPA;
      m.svjetlo.intensity = m.svjetloJacina;
    }
  }
  S.bocno = !!ukljuci && S.izabrano >= 0;
  if (el.bocno) { el.bocno.setAttribute('aria-pressed', S.bocno ? 'true' : 'false'); }
  /* Ambijent se priguši dok je bočno svjetlo upaljeno — inače
     ravnomjerno svjetlo ispuni sjenke poteza i reljef nestane. */
  if (S.ambijent) { S.ambijent.intensity = S.bocno ? 0.15 : 0.55; }
  if (S.polulopta) { S.polulopta.intensity = S.bocno ? 0.1 : 0.35; }
  osvjeziSjenke();   /* reflektor je promijenio mjesto */
}

/* Mapa sjenke se crta u sljedećem kadru. Na telefonu je to jedini
   put do nove sjenke; na većim ekranima se ionako crta svaki kadar. */
function osvjeziSjenke() {
  if (S.render) { S.render.shadowMap.needsUpdate = true; }
}

/* Pokretanje klizanja (ili skoka, uz smanjeno kretanje) */
function kreniKa(poz, cilj) {
  if (salaTacke(poz.z) === 2) { ucitajDrugu(); }
  if (smanjenoKretanje()) {
    S.poz.copy(poz);
    S.cilj.copy(cilj);
    S.anim = null;
    return;
  }
  const T = S.tri;
  const tacke = [S.poz.clone()];
  const ciljevi = [S.cilj.clone()];
  /* Iz sale u salu se ide KROZ PROLAZ, ne kroz zid: put dobija
     tačku na sredini vrata, a pogled je tada okrenut kroz otvor. */
  const od = salaTacke(S.poz.z), ka = salaTacke(poz.z);
  if (od !== ka) {
    const smjer = ka === 2 ? 1 : -1;
    const vrata = new T.Vector3(0, VISINA_OKA, POLA_Z + PROLAZ.zid / 2);
    tacke.push(vrata.clone().setZ(vrata.z - smjer * 0.9));
    ciljevi.push(new T.Vector3(0, 1.5, vrata.z + smjer * 3));
    tacke.push(vrata.clone().setZ(vrata.z + smjer * 0.9));
    ciljevi.push(new T.Vector3(0, 1.5, vrata.z + smjer * 4));
  }
  tacke.push(poz.clone());
  ciljevi.push(cilj.clone());
  /* Dužina puta po segmentima — kretanje je ravnomjerno po putu */
  const duz = [0];
  for (let i = 1; i < tacke.length; i++) {
    duz.push(duz[i - 1] + tacke[i].distanceTo(tacke[i - 1]) + 0.3 * ciljevi[i].distanceTo(ciljevi[i - 1]) / 3);
  }
  const ukupno = duz[duz.length - 1];
  S.ka = null;
  S.inercija = 0;
  if (od !== ka) {
    /* Iz sale u salu se HODA: glatka putanja, brzina čovjeka u šetnji,
       pogled ide naprijed kroz prolaz, a glava se blago njiše u koraku. */
    const put = new T.CatmullRomCurve3(tacke, false, 'centripetal');
    const duzinaPuta = put.getLength();
    S.ka = null;
    S.inercija = 0;
    S.anim = {
      hod: true,
      put: put,
      duzinaPuta: duzinaPuta,
      cilj0: ciljevi[0],
      cilj1: ciljevi[ciljevi.length - 1],
      trajanje: Math.max(2600, Math.min(5200, 900 + duzinaPuta / HOD.brzina * 1000)),
      pocetak: sada()
    };
    return;
  }
  S.anim = {
    tacke: tacke,
    ciljevi: ciljevi,
    duz: duz,
    /* Kratak skok traje kratko, prelaz u drugu salu duže */
    trajanje: Math.max(TRAJANJE_KLIZANJA * 0.55, Math.min(TRAJANJE_KLIZANJA * 2, 450 + ukupno * 180)),
    pocetak: sada()
  };
}

/* Hod kroz prolaz: ubrzanje i usporenje kao u koraku, ravnomjerno u sredini */
function profilHoda(p) {
  const a = HOD.zalet, v = 1 / (1 - a);
  if (p < a) { return v * p * p / (2 * a); }
  if (p > 1 - a) { return 1 - v * (1 - p) * (1 - p) / (2 * a); }
  return v * (p - a / 2);
}

function glatko(a, b, x) {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

function ugaoPogleda(od, ka) {
  const dx = ka.x - od.x, dy = ka.y - od.y, dz = ka.z - od.z;
  const h = Math.hypot(dx, dz);
  return { yaw: Math.atan2(dx, dz), nagib: Math.atan2(dy, h), d: Math.max(0.5, Math.hypot(h, dy)) };
}

function spojiUglove(a, b, t) {
  let r = b.yaw - a.yaw;
  r = Math.atan2(Math.sin(r), Math.cos(r));   /* kraći put okreta */
  return { yaw: a.yaw + r * t, nagib: a.nagib + (b.nagib - a.nagib) * t, d: a.d + (b.d - a.d) * t };
}

function korakHoda(a, p) {
  const u = profilHoda(p);
  const put = a.put;
  S.poz.copy(put.getPointAt(u));
  /* Pogled: na početku se okreće ka prolazu, u hodu gleda naprijed,
     a pred kraj se okreće ka zidu sale. */
  const smjer = put.getTangentAt(Math.min(0.999, Math.max(0.001, u)));
  const naprijed = S.poz.clone().addScaledVector(smjer, 3);
  naprijed.y = 1.55;
  const uPocetku = glatko(0, 0.28, u), predKraj = glatko(0.68, 1, u);
  /* Okret glave se računa po uglu, ne pravom linijom između ciljeva —
     inače bi pogled pri povratku "preskočio" kroz samu kameru. */
  const g0 = ugaoPogleda(S.poz, a.cilj0), gN = ugaoPogleda(S.poz, naprijed), g1 = ugaoPogleda(S.poz, a.cilj1);
  const g = spojiUglove(spojiUglove(g0, gN, uPocetku), g1, predKraj);
  S.cilj.set(
    S.poz.x + Math.sin(g.yaw) * Math.cos(g.nagib) * g.d,
    S.poz.y + Math.sin(g.nagib) * g.d,
    S.poz.z + Math.cos(g.yaw) * Math.cos(g.nagib) * g.d
  );
  if (p >= 1) { S.cilj.copy(a.cilj1); return; }
  /* Njihanje glave: gore-dolje u svakom koraku, lijevo-desno u svakom
     drugom; jenjava na početku i kraju da kamera stane mirno. */
  const koraci = u * a.duzinaPuta / HOD.korak;
  const jacina = Math.sin(Math.PI * Math.min(1, u * 1.15)) * glatko(0, 0.12, u);
  const gore = HOD.gore * jacina * (0.5 - 0.5 * Math.cos(2 * Math.PI * koraci));
  const strana = HOD.strana * jacina * Math.sin(Math.PI * koraci);
  const bocno = new S.tri.Vector3(smjer.z, 0, -smjer.x);
  S.poz.y += gore - HOD.gore * jacina * 0.5;
  S.poz.addScaledVector(bocno, strana);
  S.cilj.y += (gore - HOD.gore * jacina * 0.5) * 0.4;
}

/* Tačka na putu klizanja za udio puta u (0..1) */
function korakKlizanja(a, u) {
  const ukupno = a.duz[a.duz.length - 1] || 1;
  const d = u * ukupno;
  let i = 1;
  while (i < a.duz.length - 1 && a.duz[i] < d) { i++; }
  const seg = (a.duz[i] - a.duz[i - 1]) || 1;
  const k = Math.max(0, Math.min(1, (d - a.duz[i - 1]) / seg));
  S.poz.lerpVectors(a.tacke[i - 1], a.tacke[i], k);
  S.cilj.lerpVectors(a.ciljevi[i - 1], a.ciljevi[i], k);
}

/* Izbor djela: kamera ide pred njega, panel se otvara */
function izaberi(i) {
  if (!S.radi || !S.mjesta.length) { return; }
  const n = S.mjesta.length;
  const k = ((i % n) + n) % n;
  S.izabrano = k;
  S.sala = S.mjesta[k].soba || 1;
  S.orbita = pocetnaOrbita(k);
  const c = pozicijaOrbite(k, S.orbita);
  kreniKa(c.poz, c.cilj);
  postaviBocno(false);
  postaviLupu(false);
  korijen.setAttribute('data-izabrano', 'da');
  otvoriPanel(S.mjesta[k].djelo);
  savjetCisto();
  najavi(S.mjesta[k].djelo);
  osvjeziKretanje();
}

/* Kratka najava za čitače ekrana: „naziv, godina“. Panel nije
   aria-live — inače bi se na svakom izboru čitao cio opis. Prazni se
   pa puni, da se i isto djelo izabrano ponovo najavi. */
function najavi(djelo) {
  if (!el.najava || !djelo) { return; }
  const tekst = [djelo.naziv, djelo.godina].filter(function (v) { return v != null && v !== ''; }).join(', ');
  el.najava.textContent = '';
  window.clearTimeout(S.najavaTajmer);
  S.najavaTajmer = window.setTimeout(function () { el.najava.textContent = tekst; }, 60);
}

/* Nazad na pregled sobe, panel se zatvara */
function naPregled(vratiFokus) {
  if (!S.radi) { return; }
  S.izabrano = -1;
  S.orbita = null;
  postaviBocno(false);
  postaviLupu(false);
  korijen.removeAttribute('data-izabrano');
  korijen.removeAttribute('data-cisto');
  const c = pozicijaPregleda();
  kreniKa(c.poz, c.cilj);
  zatvoriPanel(vratiFokus);
  osvjeziKretanje();
}

/* Prelaz iz sale u salu jednim klikom: kamera prođe kroz vrata i
   stane u pregled druge sale. Iz izabranog djela takođe. */
function uSalu(sala) {
  if (!S.radi) { return; }
  S.sala = sala === 2 ? 2 : 1;
  if (S.sala === 2) { ucitajDrugu(); }
  S.pogled = 0;
  S.inercija = 0;
  if (S.izabrano >= 0 || panelOtvoren()) { naPregled(false); }
  else {
    const c = pozicijaPregleda();
    kreniKa(c.poz, c.cilj);
  }
  osvjeziKretanje();
}

/* Iz pregleda strelice kreću od prvog djela sale u kojoj se stoji */
function prvoUSali() {
  for (let i = 0; i < S.mjesta.length; i++) {
    if ((S.mjesta[i].soba || 1) === (S.sala || 1)) { return i; }
  }
  return 0;
}

/* Gdje je klik pao u prostoru (zid, pod, klupa…), ne samo na djelo */
function tackaKlika(x, y) {
  const r = S.render.domElement.getBoundingClientRect();
  S.raycaster.setFromCamera({ x: ((x - r.left) / r.width) * 2 - 1, y: -((y - r.top) / r.height) * 2 + 1 }, S.kamera);
  const udari = S.raycaster.intersectObjects(S.scena.children, true);
  for (const u of udari) {
    if (u.point.y < -0.01) { continue; }   /* odrazi ispod poda */
    return u.point;
  }
  return null;
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

/* ---------------------------------------------------------
   Pokretanje sale
   --------------------------------------------------------- */
function pokreni(djela) {
  const T = S.tri;
  S.djela = djela;

  S.scena = new T.Scene();
  S.scena.background = new T.Color(BOJA.pozadina);
  S.scena.fog = new T.Fog(BOJA.pozadina, 14, 30);

  const sirina = el.platno.clientWidth || 800;
  const visina = el.platno.clientHeight || 500;

  S.kamera = new T.PerspectiveCamera(VIDNO_POLJE, sirina / visina, 0.05, 60);

  S.render = new T.WebGLRenderer({
    antialias: true, alpha: false, powerPreference: 'high-performance'
  });
  /* Telefon: 1.75× umjesto 2× — na malom ekranu razlika se ne vidi,
     a grafika crta oko četvrtinu piksela manje. */
  S.render.setPixelRatio(Math.min(window.devicePixelRatio || 1, TELEFON ? 1.75 : 2));
  S.render.setSize(sirina, visina, false);

  /* Boja i tone mapping — veliki dobitak za malo koda.
     Bez outputColorSpace slike su isprane; bez tone mappinga
     reflektori "pregore" u bijelo tamo gdje su najjači. */
  S.render.outputColorSpace = T.SRGBColorSpace;
  S.render.toneMapping = T.ACESFilmicToneMapping;
  S.render.toneMappingExposure = 1.2;   /* malo svjetlije — topla sala, ne podrum */

  /* Sjenke. PCFSoftShadowMap je UKLONJEN u r186 — koristi se PCFShadowMap. */
  S.render.shadowMap.enabled = true;
  S.render.shadowMap.type = T.PCFShadowMap;
  /* Telefon: sala stoji, pa se mapa sjenke ne crta u svakom kadru,
     nego samo kad se nešto u sceni promijeni (vidi osvjeziSjenke).
     Sjenka izgleda isto, a grafika ima manje posla. */
  if (TELEFON) {
    S.render.shadowMap.autoUpdate = false;
    S.render.shadowMap.needsUpdate = true;
    S.sjenkeDjeca = -1;
  }

  el.platno.appendChild(S.render.domElement);
  /* Kratko ime; uputstvo za tastaturu je u skrivenom elementu na koji
     pokazuje aria-describedby — čitač ga pročita kao opis, ne kao ime. */
  let uputstvo = document.getElementById('galerija-uputstvo');
  if (!uputstvo) {
    uputstvo = document.createElement('p');
    uputstvo.id = 'galerija-uputstvo';
    uputstvo.hidden = true;
    uputstvo.textContent = TEKST.platno;
    korijen.appendChild(uputstvo);
  }
  S.render.domElement.setAttribute('aria-label', TEKST.platnoIme);
  S.render.domElement.setAttribute('aria-describedby', 'galerija-uputstvo');
  /* Canvas mora biti fokusabilan: tastatura se sluša na .galerija, pa bez
     ovoga tipke ne bi radile nikome ko uđe tastaturom, a strelice bi mu
     skrolovale stranicu ispod sale. Uz to je canvas i Tab-stanica, tako
     da je kretanje dohvatljivo bez miša. */
  S.render.domElement.setAttribute('tabindex', '0');
  S.render.domElement.setAttribute('role', 'application');

  S.raycaster = new T.Raycaster();
  S.anizotropija = Math.min(8, S.render.capabilities.getMaxAnisotropy());
  S.pogled = 0;

  napraviSobu();
  postaviDjela(djela);
  napraviMapu();

  /* Na ulasku kamera stoji na PREGLEDU — vidi se cijela soba */
  const start = pozicijaPregleda();
  S.poz = start.poz.clone();
  S.cilj = start.cilj.clone();
  S.izabrano = -1;
  S.anim = null;
  S.mis.x = 0;
  S.mis.y = 0;

  S.radi = true;
  S.sat = sada();
  S.fpsOd = S.sat;
  S.fpsBrojac = 0;

  stanje('soba');
  korijen.setAttribute('data-fps', S.fpsVidljiv ? 'da' : 'ne');
  if (el.fpsPrekidac) { el.fpsPrekidac.setAttribute('aria-pressed', S.fpsVidljiv ? 'true' : 'false'); }
  vezi();
  mjeri();
  osvjeziKretanje();
  osvjeziDugmeTure();
  uvod();
  petlja();
  /* Svaki ulazak, na svakom uređaju: kratko uputstvo u tri sličice i
     pitanje „sa vodičem ili sam“. Fokus tada ide na prvo dugme u njemu. */
  if (el.savjeti) { pokaziSavjete(); return; }

  /* Fokus na platno: tipke rade odmah, bez Taba i bez klika.
     preventScroll — inače pregledač skoči na salu i otme mjesto čitanja. */
  try { S.render.domElement.focus({ preventScroll: true }); }
  catch (e) { S.render.domElement.focus(); }
}

function sada() {
  return (window.performance && performance.now) ? performance.now() : Date.now();
}

/* --- Veličina platna. Pregled zavisi od odnosa stranica, pa se
       pozicija kamere preračunava kad se okno promijeni. --- */
function mjeri() {
  if (!S.render || !el.platno) { return; }
  const w = el.platno.clientWidth || 800;
  const h = el.platno.clientHeight || 500;
  S.kamera.aspect = w / h;
  S.kamera.updateProjectionMatrix();
  S.render.setSize(w, h, false);
  velicinaMeta();

  if (S.anim) { return; }   /* usred klizanja ne preskačemo kameru */
  const c = S.izabrano < 0 ? pozicijaPregleda() : pozicijaOrbite(S.izabrano, S.orbita);
  S.poz.copy(c.poz);
  S.cilj.copy(c.cilj);
}

/* ---------------------------------------------------------
   Vođena tura, mapa sale, savjeti pri svakom ulasku
   --------------------------------------------------------- */

/* VOĐENA TURA: kamera sama ide od djela do djela (i kroz prolaz u
   drugu salu), zastane pred svakim koliko je potrebno da se pročita
   kartica i polako se primakne, kao posjetilac koji se naginje ka
   slici. Svaki dodir, klik ili tipka je pauzira — posjetilac uvijek
   ima prednost — a dugme je nastavlja od djela pred kojim stoji. */
const TURA = { zadrziMin: 7000, zadrziMax: 13000, poRijeci: 120, kruzenje: 6 * Math.PI / 180, primicanje: 0.07 };

const KLJUC_MAPE = 'dumnic-galerija-mapa';

function citaj(kljuc) {
  try { return window.localStorage.getItem(kljuc); } catch (e) { return null; }
}
function pisi(kljuc, vrijednost) {
  try { window.localStorage.setItem(kljuc, vrijednost); } catch (e) { /* privatni prozor — nebitno */ }
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

function osvjeziDugmeTure() {
  if (!el.tura) { return; }
  const t = S.tura;
  const n = S.mjesta.length || 1;
  const tekst = el.tura.querySelector('.galerija-tura__tekst') || el.tura;
  if (!t) {
    tekst.textContent = TEKST.tura;
    el.tura.setAttribute('aria-pressed', 'false');
    el.tura.style.setProperty('--napredak', '0');
    korijen.removeAttribute('data-tura');
    osvjeziMob();
    return;
  }
  tekst.textContent = (t.pauza ? TEKST.nastavi : TEKST.pauza) + ' · ' + Math.min(n, t.korak + 1) + '/' + n;
  el.tura.setAttribute('aria-pressed', t.pauza ? 'false' : 'true');
  korijen.setAttribute('data-tura', t.pauza ? 'pauza' : 'radi');
  osvjeziMob();
}

function trajanjeZadrzavanja(djelo) {
  const rijeci = String((djelo && djelo.opis) || '').split(/\s+/).filter(Boolean).length;
  return Math.max(TURA.zadrziMin, Math.min(TURA.zadrziMax, TURA.zadrziMin + rijeci * TURA.poRijeci));
}

function idiNaTuri(i) {
  const t = S.tura;
  if (!t) { return; }
  t.i = ((i % S.mjesta.length) + S.mjesta.length) % S.mjesta.length;
  t.faza = 'ide';
  /* Tura stiže do druge sale: teksture se naručuju jedno djelo unaprijed */
  const sljedece = S.mjesta[(t.i + 1) % S.mjesta.length];
  if (S.mjesta[t.i].soba === 2 || (sljedece && sljedece.soba === 2)) { ucitajDrugu(); }
  postaviLupu(false);
  izaberi(t.i);
  /* Kartica u panelu kaže gdje smo u obilasku */
  if (el.pKat) { el.pKat.textContent = TEKST.obilazak(t.korak + 1, S.mjesta.length) + ' · ' + el.pKat.textContent; }
  osvjeziDugmeTure();
}

function kreniTuru() {
  if (!S.radi || !S.mjesta.length) { return; }
  if (S.tura && !S.tura.pauza) { pauzirajTuru(); return; }
  if (S.tura && S.tura.pauza) {
    /* Nastavak: od djela pred kojim se stoji, inače od zapamćenog */
    S.tura.pauza = false;
    poruka(TEKST.nastavlja);
    idiNaTuri(S.izabrano >= 0 ? S.izabrano : S.tura.i);
    return;
  }
  zatvoriSavjete();
  const start = S.izabrano >= 0 ? S.izabrano : prvoUSali();
  S.tura = { i: start, start: start, korak: 0, faza: 'ide', pauza: false, od: 0, do: 0, osnova: null };
  poruka(TEKST.pocetak(S.mjesta.length));
  idiNaTuri(start);
}

function pauzirajTuru() {
  if (!S.tura || S.tura.pauza) { return; }
  S.tura.pauza = true;
  /* Kamera ostaje tačno gdje je — bez trzaja nazad na osnovnu orbitu */
  if (S.tura.faza === 'stoji' && S.izabrano >= 0 && S.orbita) { S.orbita = Object.assign({}, S.orbita); }
  osvjeziDugmeTure();
  poruka(TEKST.pauzirano);
}

function zavrsiTuru(tiho) {
  if (!S.tura) { return; }
  S.tura = null;
  osvjeziDugmeTure();
  if (tiho) { return; }
  poruka(TEKST.kraj, 3600);
  if (S.sala === 2) { uSalu(1); } else { naPregled(false); }
}

/* Jedan korak ture u petlji */
function korakTure(t) {
  const tura = S.tura;
  if (!tura || tura.pauza) { return; }
  if (tura.faza === 'ide') {
    if (S.anim || S.ka) { return; }
    tura.faza = 'stoji';
    tura.od = t;
    tura.do = t + trajanjeZadrzavanja(S.mjesta[tura.i] && S.mjesta[tura.i].djelo);
    tura.osnova = S.orbita ? Object.assign({}, S.orbita) : null;
    return;
  }
  const p = Math.min(1, (t - tura.od) / (tura.do - tura.od));
  /* Polako primicanje i blago kruženje dok se stoji pred djelom */
  if (tura.osnova && S.izabrano === tura.i && !smanjenoKretanje()) {
    const s = Math.sin(p * Math.PI);
    const o = Object.assign({}, tura.osnova);
    o.skretanje += TURA.kruzenje * s;
    o.daljina *= 1 - TURA.primicanje * s;
    S.orbita = o;
    const c = pozicijaOrbite(tura.i, o);
    S.poz.copy(c.poz);
    S.cilj.copy(c.cilj);
  }
  if (p >= 1) {
    tura.korak++;
    if (tura.korak >= S.mjesta.length) { zavrsiTuru(false); return; }
    idiNaTuri(tura.i + 1);
  }
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
    const idi = function () { pauzirajTuru(); izaberi(i); };
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
  const a = document.activeElement;
  S.savjetiPovratak = a && a !== document.body && korijen.contains(a) && !el.savjeti.contains(a) &&
    a.getClientRects().length && a !== (S.render && S.render.domElement) ? a : null;
  el.savjeti.hidden = false;
  korijen.setAttribute('data-savjeti', 'da');
  iza(true);
  const prvo = el.savjeti.querySelector('[data-savjeti-tura]');
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

/* Ulazak: svjetla se pale i pogled polako „obiđe“ salu do pregleda */
function uvod() {
  if (smanjenoKretanje()) { return; }
  const T = S.tri;
  S.uvod = sada();
  S.render.toneMappingExposure = 0.15;
  const c = pozicijaPregleda();
  const pocetniPogled = S.pogled;
  S.pogled = pocetniPogled - 0.55;
  const s = pozicijaPregleda();
  S.pogled = pocetniPogled;
  S.poz.copy(s.poz).add(new T.Vector3(0, 0.12, 0));
  S.cilj.copy(s.cilj);
  S.anim = {
    tacke: [S.poz.clone(), c.poz.clone()],
    ciljevi: [S.cilj.clone(), c.cilj.clone()],
    duz: [0, 1],
    trajanje: 2800,
    pocetak: S.uvod + 250
  };
}

function korakUvoda(t) {
  if (!S.uvod) { return; }
  const p = Math.min(1, (t - S.uvod) / 1700);
  const e = 1 - Math.pow(1 - p, 3);
  S.render.toneMappingExposure = 0.15 + (1.2 - 0.15) * e;
  if (p >= 1) { S.uvod = 0; }
}

/* ---------------------------------------------------------
   Petlja
   --------------------------------------------------------- */
function petlja() {
  if (!S.radi) { return; }
  S.petlja = window.requestAnimationFrame(petlja);

  const t = sada();
  S.sat = t;

  const dt = Math.min(0.1, Math.max(0, (t - (S.prosli || t)) / 1000));
  S.prosli = t;

  /* --- Klizanje kamere, easeInOutCubic, po putu (i kroz prolaz) --- */
  if (S.anim) {
    const p = Math.min(1, (t - S.anim.pocetak) / S.anim.trajanje);
    if (S.anim.hod) { korakHoda(S.anim, p); } else { korakKlizanja(S.anim, lako(p)); }
    if (p >= 1) { S.anim = null; }
  } else {
    /* Zamah: pogled u pregledu se posle brzog povlačenja još malo okreće */
    if (S.inercija && S.izabrano < 0) {
      S.pogled = svedi(S.pogled + S.inercija * dt);
      S.inercija *= Math.exp(-dt / 0.28);
      if (Math.abs(S.inercija) < 0.02) { S.inercija = 0; }
      S.ka = pozicijaPregleda();
    }
    /* Prigušeno praćenje: prst i točkić zadaju CILJ, a kamera ga
       stiže mekano (oko 0.1 s) — bez trzaja i kod niskog FPS-a. */
    if (S.ka && smanjenoKretanje()) {
      /* Smanjeno kretanje: točkić, štipanje i prevlačenje skaču odmah */
      S.poz.copy(S.ka.poz);
      S.cilj.copy(S.ka.cilj);
      S.ka = null;
    } else if (S.ka) {
      const k = 1 - Math.exp(-dt / 0.07);
      S.poz.lerp(S.ka.poz, k);
      S.cilj.lerp(S.ka.cilj, k);
      if (S.poz.distanceToSquared(S.ka.poz) < 1e-7 && S.cilj.distanceToSquared(S.ka.cilj) < 1e-7) { S.ka = null; }
    }
  }

  korakTure(t);
  korakUvoda(t);
  osvjeziMapu();
  paziNaDrugu();

  S.kamera.position.copy(S.poz);
  S.kamera.lookAt(sParalaksom());

  /* Nešto dodato u scenu (gradnja sale) — sjenka se crta iznova */
  if (TELEFON && S.scena.children.length !== S.sjenkeDjeca) {
    S.sjenkeDjeca = S.scena.children.length;
    osvjeziSjenke();
  }
  S.render.render(S.scena, S.kamera);
  if (S.lupa.na) { osvjeziLupu(); }

  /* Kamera se pomjera ispod mirnog miša (klizanje, točkić) — natpis
     prati ono što je SADA pod pokazivačem, provjera ~7 puta u sekundi. */
  if (S.misKlijent && !S.vuce && t - (S.natpisT || 0) > 140) {
    S.natpisT = t;
    natpis(pogodak(S.misKlijent.x, S.misKlijent.y), S.misKlijent.x, S.misKlijent.y);
  }

  /* FPS preko prozora od pola sekunde */
  S.fpsBrojac++;
  if (t - S.fpsOd >= 500) {
    const fps = Math.round((S.fpsBrojac * 1000) / (t - S.fpsOd));
    if (el.fps) { el.fps.textContent = fps + ' fps'; }
    S.fpsBrojac = 0;
    S.fpsOd = t;
  }
}

/* Blago okretanje pogleda mišem — PARALAKSA, ne rotacija kamere.
   Tačka u koju kamera gleda se pomjeri za najviše PARALAKSA (2.5°)
   lijevo/desno i gore/dolje. Kamera se NE pomjera i ne okreće se
   slobodno: ovo je onaj mali pomak glave kad stojite pred slikom.
   Uz smanjeno kretanje je ugašeno. */
const pomPoglad = { d: null, desno: null, gore: null, van: null };
function sParalaksom() {
  const T = S.tri;
  if (!pomPoglad.d) {
    pomPoglad.d = new T.Vector3();
    pomPoglad.desno = new T.Vector3();
    pomPoglad.gore = new T.Vector3();
    pomPoglad.van = new T.Vector3();
  }
  if (smanjenoKretanje() || S.izabrano >= 0 || S.vuce || (S.mis.x === 0 && S.mis.y === 0)) {
    return S.cilj;
  }
  pomPoglad.d.subVectors(S.cilj, S.poz);
  const duzina = pomPoglad.d.length();
  if (duzina < 0.001) { return S.cilj; }

  pomPoglad.desno.set(0, 1, 0).cross(pomPoglad.d).normalize();
  pomPoglad.gore.copy(pomPoglad.desno).cross(pomPoglad.d).normalize();

  const k = duzina * Math.tan(PARALAKSA);
  pomPoglad.van.copy(S.cilj)
    .addScaledVector(pomPoglad.desno, -S.mis.x * k)
    .addScaledVector(pomPoglad.gore, -S.mis.y * k);
  return pomPoglad.van;
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
}

function karticaPuna() {
  return korijen.getAttribute('data-kartica') === 'puna';
}

/* Da li je panel sada kartica odozdo — strelica postoji samo tada */
function karticaSeSklapa() {
  return !!(el.panelVise && el.panelVise.getClientRects().length);
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

function uronjeno() {
  return document.documentElement.classList.contains('galerija-uronjena');
}

function osvjeziUronjeno() {
  const st = korijen.getAttribute('data-stanje');
  const da = (st === 'soba' || st === 'ucitavanje') &&
    !!(window.matchMedia && window.matchMedia(UZAK_EKRAN).matches);
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
  if (otvori) { korijen.setAttribute('data-opcije', 'otvorene'); }
  else {
    korijen.removeAttribute('data-opcije');
    if (el.mob) { fokusUTraku(el.alati, el.mob.opcije); }
  }
  if (el.mob) { el.mob.opcije.setAttribute('aria-expanded', otvori ? 'true' : 'false'); }
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

  if (window.matchMedia) {
    const mq = window.matchMedia(UZAK_EKRAN);
    const promjena = function () { osvjeziUronjeno(); };
    if (mq.addEventListener) { mq.addEventListener('change', promjena); }
    else if (mq.addListener) { mq.addListener(promjena); }
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
  m.tura.setAttribute('aria-pressed', S.tura && !S.tura.pauza ? 'true' : 'false');
}

/* Raycaster: koje je djelo pod pokazivačem.
   Gleda SAMO S.platna — odrazi u podu nisu u tom nizu, pa klik
   na odraz ne otvara ništa. */
function pogodak(x, y) {
  if (!S.render || !S.platna.length) { return -1; }
  const r = S.render.domElement.getBoundingClientRect();
  const n = {
    x: ((x - r.left) / r.width) * 2 - 1,
    y: -((y - r.top) / r.height) * 2 + 1
  };
  S.raycaster.setFromCamera(n, S.kamera);
  const udari = S.raycaster.intersectObjects(S.platna, false);
  return udari.length ? udari[0].object.userData.indeks : -1;
}

/* ---------------------------------------------------------
   Unos
   --------------------------------------------------------- */
const slusaoci = [];
function pokaziSalu() {
  const p = el.platno;
  if (!p || !p.getClientRects().length) { return; }
  const r = p.getBoundingClientRect();
  const vidi = Math.min(r.bottom, window.innerHeight) - Math.max(r.top, 0);
  if (vidi >= Math.min(r.height, window.innerHeight) * 0.6) { return; }
  try { p.scrollIntoView({ block: 'nearest' }); }
  catch (e) { p.scrollIntoView(false); }
}

function slusaj(cilj, tip, f, opcije) {
  cilj.addEventListener(tip, f, opcije);
  slusaoci.push([cilj, tip, f, opcije]);
}

/* Tastatura se sluša na .galerija, NE na window. Sala zauzima samo dio
   stranice: ispod nje stoji sekcija "Šta ovdje još ne radi" i podnožje.
   Da je slušalac na window-u, strelice bi i dalje hvatale preventDefault
   dok korisnik čita dno stranice — stranica bi prestala da se skroluje,
   a Escape bi iz bilo kojeg mjesta rušio salu. Ovako tipke rade samo dok
   je fokus u galeriji (canvas je fokusabilan, vidi tabindex u pokreni). */
function tipkaDole(e) {
  if (!S.radi) { return; }

  if (savjetiOtvoreni()) {
    if (e.key === 'Escape') { zatvoriSavjete(true); e.preventDefault(); }
    else if (e.key === 'Tab') {
      /* Tab kruži između dugmadi prozora, ne izlazi iz njega */
      const d = Array.prototype.slice.call(el.savjeti.querySelectorAll('button, [href], [tabindex]:not([tabindex="-1"])'));
      if (d.length) {
        const i = d.indexOf(document.activeElement);
        const j = i < 0 ? 0 : (i + (e.shiftKey ? -1 : 1) + d.length) % d.length;
        d[j].focus();
        e.preventDefault();
      }
    }
    return;   /* dok su savjeti otvoreni, tipke pripadaju njima (Tab, Enter) */
  }
  /* Razmak (ili T) pokreće, pauzira i nastavlja obilazak */
  if ((e.key === ' ' || e.key.toLowerCase() === 't') && e.target === (S.render && S.render.domElement)) {
    kreniTuru();
    e.preventDefault();
    return;
  }
  /* Tipka na samoj sali znači da posjetilac preuzima (dugmad pauziraju preko klika) */
  if (S.tura && !S.tura.pauza && S.render && e.target === S.render.domElement &&
      e.key !== 'Shift' && e.key !== 'Tab' && e.key !== 'Escape') { pauzirajTuru(); }
  if (S.tura && e.key === 'Escape') { pauzirajTuru(); }

  if (e.key === 'Escape') {
    if (S.izabrano >= 0 || panelOtvoren()) { naPregled(true); }
    else if (S.sala === 2) { uSalu(1); }
    else { izadji(); }
    e.preventDefault();
    return;
  }

  /* Dok je fokus UNUTAR panela, strelice pripadaju panelu: on se
     skroluje i u njemu su dugme X i link na stranicu djela. Da ih
     ovdje presretnemo, korisnik na tastaturi ne bi mogao da pročita
     dugačak opis. Escape iznad ostaje — on uvijek vraća na pregled. */
  if (el.panel && el.panel.contains(e.target)) { return; }

  if (e.key.toLowerCase() === 'f' && !e.ctrlKey && !e.metaKey) {
    /* F — brojač slika u sekundi (za provjeru brzine) */
    S.fpsVidljiv = !S.fpsVidljiv;
    korijen.setAttribute('data-fps', S.fpsVidljiv ? 'da' : 'ne');
    e.preventDefault();
    return;
  }
  if (e.key.toLowerCase() === 'v') {
    /* V — kroz vrata, u drugu salu i nazad */
    uSalu(S.sala === 2 ? 1 : 2);
    e.preventDefault();
  } else if (e.key === 'ArrowLeft') {
    izaberi(S.izabrano < 0 ? prvoUSali() : S.izabrano - 1);
    e.preventDefault();
  } else if (e.key === 'ArrowRight') {
    izaberi(S.izabrano < 0 ? prvoUSali() : S.izabrano + 1);
    e.preventDefault();
  } else if (S.izabrano < 0 && (e.key.toLowerCase() === 'a' || e.key.toLowerCase() === 'd')) {
    /* Pregled sobe: A / D okreću pogled u krug, po 15° */
    S.pogled = svedi(S.pogled + (e.key.toLowerCase() === 'a' ? 1 : -1) * 15 * Math.PI / 180);
    const c = pozicijaPregleda();
    kreniKa(c.poz, c.cilj);
    e.preventDefault();
  } else if (S.izabrano >= 0 && S.orbita) {
    /* Obilazak djela tastaturom:
       A / D — kruženje lijevo-desno, W / S — gore-dolje,
       ↑ / + — bliže, ↓ / − — dalje, L — bočno svjetlo, 0 — sprijeda */
    const o = Object.assign({}, S.orbita);
    const korak = 8 * Math.PI / 180;
    const k = e.key.toLowerCase();
    if (k === 'a') { o.skretanje -= korak; }
    else if (k === 'd') { o.skretanje += korak; }
    else if (k === 'w') { o.nagib += korak; }
    else if (k === 's') { o.nagib -= korak; }
    else if (e.key === 'ArrowUp' || e.key === '+' || e.key === '=') { o.daljina *= 0.85; }
    else if (e.key === 'ArrowDown' || e.key === '-') { o.daljina /= 0.85; }
    else if (k === 'l') { postaviBocno(!S.bocno); e.preventDefault(); return; }
    else if (e.key === '0') { ugao('sprijeda'); e.preventDefault(); return; }
    else { return; }
    promijeniOrbitu(o, false);
    e.preventDefault();
  }
}

/* Fokus izašao iz galerije (Tab, klik van, prebacivanje prozora).
   Panel bi ostao da visi preko sale, a Escape ga više ne bi zatvorio
   (tipke su vezane na galeriju). Zato se zatvara sam, BEZ otimanja
   fokusa — korisnik je sam otišao van, ne vuče mu se natrag. */
function fokusIzasao(e) {
  if (!S.radi) { return; }
  const ide = e && e.relatedTarget;
  if (ide && korijen.contains(ide)) { return; }
  if (S.izbliza) { return; }   /* fokus je u prikazu Izbliza — djelo ostaje izabrano */
  /* Na telefonu sala pokriva cijeli ekran, pa se iz nje ne može kliknuti
     „van“. iOS Safari pri dodiru dugmeta ne daje mu fokus nego ga skida
     sa platna (relatedTarget je null) — bez ovoga je svaki dodir na
     „Opcije“ ili traku vraćao kameru na pregled. */
  if (uronjeno()) { return; }
  S.mis.x = 0;
  S.mis.y = 0;
  /* Panel i izabrano djelo su jedno stanje — zatvara se oboje */
  if (S.izabrano >= 0 || panelOtvoren()) { naPregled(false); }
}

/* --- Pokazivač: klik bira djelo, pomjeranje daje paralaksu --- */
function pokazivacDole(e) {
  if (e.button !== undefined && e.button !== 0) { return; }
  pauzirajTuru();
  S.prsti.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (S.prsti.size === 2) { S.lupa.prst = null; S.stipanje = razmakPrstiju(); S.put = PRAG_KLIKA; return; }
  /* Lupa na dodir: jedan prst na djelu vodi lupu, ne kruži oko platna */
  if (S.lupa.na && e.pointerType && e.pointerType !== 'mouse' && pogodak(e.clientX, e.clientY) === S.izabrano) {
    try { S.render.domElement.setPointerCapture(e.pointerId); } catch (g) { /* nebitno */ }
    S.lupa.prst = e.pointerId;
    pomjeriLupu(e.clientX, e.clientY, true);
    return;
  }
  try { S.render.domElement.setPointerCapture(e.pointerId); } catch (g) { /* nebitno */ }
  S.vuce = true;
  S.brzina = 0;
  S.inercija = 0;
  S.pocetak.x = e.clientX;
  S.pocetak.y = e.clientY;
  S.put = 0;
}

function razmakPrstiju() {
  const p = Array.from(S.prsti.values());
  return Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y) || 1;
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

function pokazivacMice(e) {
  if (S.prsti.has(e.pointerId)) { S.prsti.set(e.pointerId, { x: e.clientX, y: e.clientY }); }
  if (S.lupa.na) {
    if (S.lupa.prst === e.pointerId) { pomjeriLupu(e.clientX, e.clientY, true); return; }
    if (e.pointerType === 'mouse' || !e.pointerType) { pomjeriLupu(e.clientX, e.clientY, false); }
  }

  /* Dva prsta: štipanje približava i udaljava od djela */
  if (S.prsti.size === 2) {
    const r = razmakPrstiju();
    if (S.izabrano >= 0 && S.orbita && S.stipanje) {
      const o = Object.assign({}, S.orbita);
      o.daljina *= S.stipanje / r;
      promijeniOrbitu(o, false);
    }
    S.stipanje = r;
    return;
  }

  if (S.vuce) {
    const dx = e.clientX - S.pocetak.x;
    const dy = e.clientY - S.pocetak.y;
    S.put += Math.abs(dx) + Math.abs(dy);
    S.pocetak.x = e.clientX;
    S.pocetak.y = e.clientY;
    if (S.put >= PRAG_KLIKA) {
      if (S.izabrano >= 0 && S.orbita) {
        /* Prevlačenje pred djelom: kruženje oko platna */
        const o = Object.assign({}, S.orbita);
        o.skretanje -= dx * ORBITA.brzina;
        o.nagib += dy * ORBITA.brzina;
        promijeniOrbitu(o, false);
      } else {
        /* Prevlačenje u pregledu: okretanje glave po sobi.
           Prekida klizanje nazad u pregled — prst ima prednost. */
        S.anim = null;
        /* Pun krug, 360° — bez granica, ugao se samo svodi na ±π */
        S.pogled = svedi(S.pogled + dx * 0.004);
        const sad = sada();
        const proslo = Math.max(8, sad - (S.zadnjiPomak || 0));
        S.zadnjiPomak = sad;
        S.brzina = 0.6 * (S.brzina || 0) + 0.4 * (dx * 0.004) / (proslo / 1000);
        S.ka = pozicijaPregleda();
      }
    }
  }
  /* Paralaksa samo za miš: na dodir nema "hover", pa bi se pogled
     zaglavio tamo gdje je bio poslednji dodir. */
  if (e.pointerType && e.pointerType !== 'mouse') { return; }
  natpis(S.vuce && S.put >= PRAG_KLIKA ? -1 : pogodak(e.clientX, e.clientY), e.clientX, e.clientY);
  S.misKlijent = { x: e.clientX, y: e.clientY };
  const r = S.render.domElement.getBoundingClientRect();
  if (!r.width || !r.height) { return; }
  S.mis.x = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width) * 2 - 1));
  S.mis.y = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height) * 2 - 1));
}

function pokazivacGore(e) {
  S.prsti.delete(e.pointerId);
  if (S.lupa.prst === e.pointerId) { S.lupa.prst = null; return; }
  if (S.prsti.size < 2) { S.stipanje = 0; }
  /* Poslije štipanja ostao je jedan prst — prevlačenje kreće od NJEGA,
     inače bi prvi pomak mjerio od podignutog prsta i orbita bi skočila. */
  if (S.prsti.size === 1) {
    const ostao = S.prsti.values().next().value;
    S.pocetak.x = ostao.x;
    S.pocetak.y = ostao.y;
  }
  if (!S.vuce) { return; }
  S.vuce = false;
  if (S.put >= PRAG_KLIKA) {
    /* Pušten u pokretu: pogled se još malo okreće pa stane */
    if (S.izabrano < 0 && !smanjenoKretanje() && sada() - (S.zadnjiPomak || 0) < 80) {
      S.inercija = Math.max(-4, Math.min(4, S.brzina || 0));
    }
    return;
  }   /* prevlačenje, ne klik */
  const i = pogodak(e.clientX, e.clientY);
  if (i >= 0 && i === S.izabrano && uronjeno()) {
    prebaciCisto();
    return;
  }
  if (i >= 0) {
    izaberi(i);
    return;
  }
  /* Klik kroz vrata (na bilo šta u drugoj sali) vodi u nju, a iz
     druge sale klik na vrata ili prvu salu vraća nazad. */
  const t = tackaKlika(e.clientX, e.clientY);
  const tu = salaTacke(S.poz.z);
  if (t && salaTacke(t.z) !== tu) {
    uSalu(salaTacke(t.z));
  } else if (t && tu === 2 && t.z < POLA_Z + PROLAZ.zid + 0.05) {
    uSalu(1);   /* sam zid sa vratima, gledan iz druge sale */
  } else if (S.izabrano >= 0 || panelOtvoren()) {
    naPregled(true);
  }
}

function pokazivacVan(e) {
  if (e && e.type === 'pointerleave') { natpis(-1); S.misKlijent = null; }
  S.mis.x = 0;
  S.mis.y = 0;
  /* Na dodir `pointerleave` stiže odmah poslije `pointerup` jednog prsta —
     briše se samo TAJ prst, ne i onaj koji je još na ekranu. */
  if (e && e.pointerId !== undefined) {
    S.prsti.delete(e.pointerId);
    if (S.prsti.size < 2) { S.stipanje = 0; }
    if (e.type === 'pointerleave' && S.vuce) { return; }  /* uhvaćen pokazivač — prevlačenje traje */
    if (S.prsti.size === 0) { S.vuce = false; }
    return;
  }
  /* Prozor izgubio fokus — sve se pušta */
  S.vuce = false;
  S.prsti.clear();
  S.stipanje = 0;
}

/* Točkić miša i dva prsta na touchpadu: približavanje djelu.
   U pregledu sobe točkić NE otimamo — stranica se normalno skroluje. */
/* Točkić miša i touchpad laptopa.
   - Pinč na touchpadu stiže kao točkić sa ctrlKey: pred djelom
     približava i udaljava, u pregledu pinč „ka sebi“ uvodi pred
     djelo koje je na sredini kadra. Pregledač tada ne zumira stranicu.
   - Dva prsta lijevo-desno: u pregledu okreću pogled po sali (kao
     prevlačenje), pred djelom kruže oko platna.
   - Dva prsta gore-dolje u pregledu skroluju stranicu, kao i točkić
     miša — sala ne zarobljava stranicu. Pred djelom približavaju. */
function tocak(e) {
  if (!S.radi) { return; }
  const k = e.deltaMode === 1 ? 33 : e.deltaMode === 2 ? 400 : 1;
  const dx = e.deltaX * k, dy = e.deltaY * k;
  const vodoravno = Math.abs(dx) > Math.abs(dy) * 1.2;

  if (S.izabrano < 0 || !S.orbita) {
    if (e.ctrlKey) {
      e.preventDefault();
      pauzirajTuru();
      /* Skupi pinč pa tek onda uvedi — jedan pokret, jedan korak */
      S.pincPregled = (S.pincPregled || 0) - dy;
      window.clearTimeout(S.pincTajmer);
      S.pincTajmer = window.setTimeout(function () { S.pincPregled = 0; }, 260);
      if (S.pincPregled > 24) {
        S.pincPregled = -1e6;   /* ostatak ovog pokreta se ignoriše */
        const r = S.render.domElement.getBoundingClientRect();
        const i = pogodak(r.left + r.width / 2, r.top + r.height / 2);
        izaberi(i >= 0 ? i : prvoUSali());
      }
      return;
    }
    if (!vodoravno) { return; }
    e.preventDefault();
    pauzirajTuru();
    S.anim = null;
    S.inercija = 0;
    S.pogled = svedi(S.pogled - Math.max(-120, Math.min(120, dx)) * 0.0028);
    S.ka = pozicijaPregleda();
    return;
  }

  e.preventDefault();
  pauzirajTuru();
  const o = Object.assign({}, S.orbita);
  if (e.ctrlKey) {
    /* pinč: male vrijednosti, pa jači faktor */
    o.daljina *= Math.exp(Math.max(-40, Math.min(40, dy)) * 0.012);
  } else if (vodoravno) {
    o.skretanje += Math.max(-120, Math.min(120, dx)) * 0.004;
  } else {
    o.daljina *= Math.exp(Math.max(-100, Math.min(100, dy)) * 0.002);
  }
  promijeniOrbitu(o, false);
}

function vidljivost() {
  if (!S.radi) { return; }
  if (document.hidden) {
    /* Tab nije vidljiv — petlja staje da ne troši bateriju i GPU */
    if (S.petlja) { window.cancelAnimationFrame(S.petlja); S.petlja = 0; }
  } else if (!S.petlja) {
    S.sat = sada();
    S.fpsOd = S.sat;
    S.fpsBrojac = 0;
    /* Klizanje koje je zateklo pauzu bi inače "preskočilo" cijelu
       animaciju u jednom kadru — pomjeri se početak na sada. */
    if (S.anim) { S.anim.pocetak = S.sat; }
    petlja();
  }
}

function vezi() {
  const c = S.render.domElement;
  slusaj(korijen, 'keydown', tipkaDole);
  slusaj(korijen, 'focusout', fokusIzasao);
  slusaj(window, 'resize', mjeri);
  /* Okno mijenja veličinu i bez promjene prozora (CSS, rotacija
     telefona, adresna traka) — bez ovoga se crtež razvuče. */
  if (window.ResizeObserver && el.platno) {
    S.posmatrac = new ResizeObserver(function () { mjeri(); });
    S.posmatrac.observe(el.platno);
  }
  slusaj(window, 'blur', pokazivacVan);
  slusaj(document, 'visibilitychange', vidljivost);
  slusaj(c, 'pointerdown', pokazivacDole);
  slusaj(c, 'pointermove', pokazivacMice);
  slusaj(c, 'pointerup', pokazivacGore);
  slusaj(c, 'pointercancel', pokazivacVan);
  slusaj(c, 'pointerleave', pokazivacVan);
  slusaj(c, 'contextmenu', function (e) { e.preventDefault(); });
  slusaj(c, 'wheel', tocak, { passive: false });
  for (const dugme of el.uglovi) {
    slusaj(dugme, 'click', function () { ugao(dugme.getAttribute('data-ugao')); });
  }
  if (el.bocno) {
    slusaj(el.bocno, 'click', function () { postaviBocno(!S.bocno); });
  }
  if (el.lupa) {
    slusaj(el.lupa, 'click', function () { postaviLupu(!S.lupa.na); });
  }
  /* Telefon: dugmad i mapa su ispod sale. Kad dugme promijeni pogled
     (ili uključi lupu), sala se vrati u kadar — inače se čini da ništa
     nije urađeno. Izbliza je preko cijelog ekrana, a gašenje lupe ne
     treba salu, pa ta dva ne pomjeraju stranu. */
  if (el.alati) {
    slusaj(el.alati, 'click', function (e) {
      const d = e.target.closest && e.target.closest('button, [data-mapa-djelo]');
      if (!d || d.getAttribute('data-ugao') === 'izbliza' || d.closest('.galerija-mapa__prekidac')) { return; }
      if (d === el.lupa && !S.lupa.na) { return; }
      setTimeout(pokaziSalu, 0);
    });
  }

  if (el.pregled) {
    slusaj(el.pregled, 'click', function () { naPregled(true); });
  }
  if (el.tura) { slusaj(el.tura, 'click', kreniTuru); }
  if (el.pomoc) { slusaj(el.pomoc, 'click', function () { pauzirajTuru(); pokaziSavjete(); }); }
  if (el.savjeti) {
    slusaj(el.savjeti, 'click', function (e) {
      const b = e.target.closest('button');
      if (b && b.hasAttribute('data-savjeti-tura')) { zatvoriSavjete(true); kreniTuru(); }
      else if (b && b.hasAttribute('data-savjeti-zatvori')) { zatvoriSavjete(true); }
      else if (e.target === el.savjeti) { zatvoriSavjete(true); }   /* klik na tamnu pozadinu */
    });
  }
  /* Svako drugo dugme u sali (strelice, uglovi, pregled, sala, X na
     panelu) znači da posjetilac preuzima — obilazak staje. */
  slusaj(korijen, 'click', function (e) {
    const b = e.target.closest && e.target.closest('button');
    if (!b || b === el.tura || b === el.panelVise || b.hasAttribute('data-mob') || (el.savjeti && el.savjeti.contains(b)) || b.classList.contains('galerija-mapa__prekidac')) { return; }
    pauzirajTuru();
  }, true);
  slusaj(document, 'visibilitychange', function () { if (document.hidden) { pauzirajTuru(); } });
  if (el.sala) {
    slusaj(el.sala, 'click', function () { uSalu(S.sala === 2 ? 1 : 2); });
  }
  if (el.prethodni) {
    slusaj(el.prethodni, 'click', function () {
      izaberi(S.izabrano < 0 ? prvoUSali() : S.izabrano - 1);
    });
  }
  if (el.sljedeci) {
    slusaj(el.sljedeci, 'click', function () {
      izaberi(S.izabrano < 0 ? prvoUSali() : S.izabrano + 1);
    });
  }
}

function odvezi() {
  if (S.posmatrac) { S.posmatrac.disconnect(); S.posmatrac = null; }
  for (const s of slusaoci) {
    s[0].removeEventListener(s[1], s[2], s[3]);
  }
  slusaoci.length = 0;
}

/* ---------------------------------------------------------
   Izlaz — rušenje scene i oslobađanje WebGL konteksta
   --------------------------------------------------------- */
function izadji() {
  S.gen++;              /* poslovi iz reda za ovu salu se više ne izvršavaju */
  S.red.length = 0;
  S.teksture = [];
  zatvoriIzbliza();
  zavrsiTuru(true);
  zatvoriSavjete(false);
  postaviOpcije(false);
  korijen.removeAttribute('data-cisto');
  if (el.mapa) { el.mapa.textContent = ''; }
  S.mapaJa = null;
  S.mapaTacke = [];
  S.mapaSvg = null;
  S.uvod = 0;
  if (!S.radi) { stanje('ulaz'); return; }
  S.radi = false;

  if (S.petlja) { window.cancelAnimationFrame(S.petlja); S.petlja = 0; }
  zatvoriPanel(false);
  odvezi();

  /* Oslobađanje resursa */
  for (const r of S.zaCiscenje) {
    if (r && typeof r.dispose === 'function') { r.dispose(); }
  }
  S.zaCiscenje.length = 0;
  for (const k in SVJ) { delete SVJ[k]; }   /* materijali svjetiljki su upravo oslobođeni */
  postaviLupu(false);
  if (S.lupa.okvir && S.lupa.okvir.parentNode) { S.lupa.okvir.parentNode.removeChild(S.lupa.okvir); }
  S.lupa.okvir = S.lupa.platno = S.lupa.izvor = null;
  S.lupa.za = -1;
  S.platna.length = 0;
  S.odrazi.length = 0;
  S.mjesta.length = 0;

  if (S.scena) {
    while (S.scena.children.length) { S.scena.remove(S.scena.children[0]); }
  }

  if (S.render) {
    S.render.dispose();
    if (S.render.forceContextLoss) {
      try { S.render.forceContextLoss(); } catch (e) { /* neki pregledači ne daju */ }
    }
    if (S.render.domElement && S.render.domElement.parentNode) {
      S.render.domElement.parentNode.removeChild(S.render.domElement);
    }
  }

  S.render = null;
  S.scena = null;
  S.kamera = null;
  S.raycaster = null;
  S.anim = null;
  S.poz = null;
  S.cilj = null;
  S.izabrano = -1;
  S.orbita = null;
  S.bocno = false;
  S.ambijent = null;
  S.prsti.clear();
  korijen.removeAttribute('data-izabrano');
  S.mis.x = 0;
  S.mis.y = 0;
  S.vuce = false;

  stanje('ulaz');
  /* preventScroll — ulazno dugme je tu gdje je bila sala, ali ako je
     posjetilac u međuvremenu skrolovao, fokus ne treba da trgne stranicu. */
  if (el.pokreni) {
    try { el.pokreni.focus({ preventScroll: true }); }
    catch (e) { el.pokreni.focus(); }
  }
}

/* ---------------------------------------------------------
   Klik na "Uđi u salu"
   --------------------------------------------------------- */
async function ulaz() {
  if (!imaWebGL()) { na2D('webgl'); return; }
  if (location.protocol === 'file:') { na2D('fajl'); return; }

  stanje('ucitavanje');

  /* Three.js i podaci se preuzimaju ISTOVREMENO, ne jedno za drugim */
  najaviThree();
  const obecanjeThree = ucitajThree();
  obecanjeThree.catch(function () { /* obrađuje se ispod */ });

  let djela;
  try {
    djela = await ucitajPodatke();
  } catch (g) {
    na2D((g && g.vrsta) || 'podaci');
    return;
  }

  let modul;
  try {
    modul = await obecanjeThree;
    if (!modul || !modul.WebGLRenderer) { throw new Error('nepotpun modul'); }
  } catch (g) {
    /* CDN blokiran, nema interneta, ili importmapa nije razriješena */
    na2D('cdn');
    return;
  }

  S.tri = modul;
  try {
    pokreni(djela);
  } catch (g) {
    /* Ako crtanje padne, ne ostavljamo prazan crni pravougaonik.
       Pokupi za sobom sve što je stiglo da se napravi. */
    try { izadji(); } catch (e) { /* nebitno */ }
    na2D('webgl');
  }
}

/* ---------------------------------------------------------
   Početno stanje

   Smanjeno kretanje NE vodi više na 2D: sala radi, kamera samo
   skače umjesto da klizi (vidi `kreniKa`). Poruka o tome je na
   ulaznom ekranu i otkriva je CSS.
   --------------------------------------------------------- */
if (korijen) {
  if (!imaWebGL()) {
    na2D('webgl');
  } else {
    stanje('ulaz');
    if (el.pokreni) { el.pokreni.addEventListener('click', ulaz); }
    najaviKadTreba();
    /* „Uđi u galeriju“ sa početne (galerija.html?ulaz) ulazi odmah u
       salu, bez drugog klika. Parametar se briše iz adrese, pa
       osvježavanje stranice opet prikazuje običan ulaz. */
    if (/(^|[?&])ulaz(=|&|$)/.test(location.search.slice(1))) {
      try { history.replaceState(history.state, '', location.pathname + location.hash); } catch (e) { /* nebitno */ }
      ulaz();
    }
  }

  if (el.izadji) { el.izadji.addEventListener('click', izadji); }
  /* Omotač, da click event ne završi kao argument `vratiFokus`.
     Zatvaranje panela vraća i kameru na pregled — panel i izabrano
     djelo su jedno stanje, ne dva. */
  if (el.panelZatvori) {
    el.panelZatvori.addEventListener('click', function () {
      if (uronjeno()) {
        if (el.mob) { fokusUTraku(el.panel, el.mob.natpis); }
        postaviKarticu(false);
        return;
      }
      naPregled(true);
    });
  }
  pripremiKarticu();
  pripremiMob();

  /* FPS brojač se može isključiti */
  if (el.fpsPrekidac) {
    el.fpsPrekidac.addEventListener('click', function () {
      S.fpsVidljiv = !S.fpsVidljiv;
      korijen.setAttribute('data-fps', S.fpsVidljiv ? 'da' : 'ne');
      el.fpsPrekidac.setAttribute('aria-pressed', S.fpsVidljiv ? 'true' : 'false');
    });
  }
  korijen.setAttribute('data-fps', 'da');
}

})();
