// @ts-check
/* =========================================================
   Virtuelna galerija — osnova
   Mjere sale i ostale konstante, elementi stranice, zajedničko
   stanje S i sitni pomoćnici koje koriste svi ostali dijelovi.

   Dvije sale: u prvoj istaknuta djela na tri zida i crteži na
   prednjem zidu, iza otvorenog prolaza druga sala sa ostalim
   radovima (sve iz data/radovi.json). Nema slobodnog hodanja: klik
   na platno vodi kameru pred njega, a iz sale u salu se hoda kroz
   prolaz.

   FAJLOVI I DIJELOVI (galerija.html ih učitava OVIM REDOM). Dio je
   jedna cjelina u svom omotaču; fajl drži jedan ili više dijelova:
     osnova.js    osnova     mjere, konstante, elementi stranice, stanje S
                  tekstovi   jezik stranice i tekstovi koje skripta sama upisuje
     scena.js     svjetla    reflektori i svjetiljke, svjetla van kadra, zagrijavanje
                  teksture   izvori slika, red preuzimanja, slanje na GPU
                  scena      raspored djela, građenje sala, djela, legende
     sucelje.js   telefon    kartica koja se sklapa, režim preko cijelog ekrana
                  ui         stanja prikaza, 2D rezerva, panel, mapa, savjeti, natpis
                  izbliza    Izbliza (djelo preko cijelog ekrana) i Lupa
     kretanje.js  kamera     pozicije, orbita, klizanje i hod, izbor djela, tura
                  unos       tastatura, miš, dodir, točkić, fokus, vidljivost
     glavni.js    glavni     Three.js, podaci, pokretanje, petlja, izlaz, ulaz
   Pet fajlova, a ne jedanaest: svaki fajl više je još jedan zahtjev
   koji se sa CSS-om otima o vezu, a dijelovi u istom fajlu se bolje
   komprimuju (mjereno na sporoj vezi); zato i fetchpriority="low" u
   galerija.html. Novi fajl — samo uz novo mjerenje.

   KLASIČNE SKRIPTE, NE ES MODULI. Modul se sa `file://` adrese ne
   izvrši (CORS), pa bi stranica otvorena duplim klikom lagala
   posjetiocu da je JavaScript isključen; klasična skripta se izvrši
   i tamo i kaže pravi razlog (vidi ulaz() u glavni.js). Uz to sve
   klasične skripte pregledač traži odjednom, čim pročita HTML, a
   moduli bi tražili još jedan ili dva kruga do servera (mjereno).

   DIJELJENJE IMENA. Svaki dio je u svom omotaču (IIFE), pa globalni
   prostor ostaje čist. Zajednički je samo objekat G: dio na kraju
   upiše u G ono što drugi koriste (Object.assign) i prijavi se
   (G.dijelovi.push), a na početku uzme iz G ono što su upisali
   RANIJI dijelovi (const { … } = G). Funkcija iz KASNIJEG dijela
   poziva se preko G u trenutku poziva (npr. G.izaberi(i) u dijelu
   ui) — tada su svi dijelovi već učitani. G je na window.__galerija
   samo dok se skripte učitavaju; glavni.js provjeri da su se svi
   dijelovi prijavili i skine ga. Novi dio: svoj omotač, prijava, i
   ime u spisku u glavni.js (testovi/galerija/imena.js to provjerava).

   Svaka adresa ka ovim fajlovima nosi ?v=<heš sadržaja>
   (alati/verzije.py), pa se keširaju „immutable“ na godinu
   (vercel.json, _headers). Zato u js/galerija/ idu samo skripte koje
   galerija.html uključuje, i to samo preko tog alata.
   Bez build koraka. Three.js r186 iz vendor/three/, samo jezgro,
   bez addona — preuzima se tek na klik „Uđi u salu“ (glavni.js).
   Komentari na crnogorskom.
   ========================================================= */

/* ---------------------------------------------------------
   TIPOVI (samo JSDoc, za `tsc --checkJs` — vidi testovi/galerija/).
   Van omotača, da ih vide svi dijelovi. Ime iz G koje ovdje nije
   zapisano je `any`; S, el i korijen nose pun tip, pa tsc u svakom
   dijelu hvata pogrešno ime polja.
   --------------------------------------------------------- */
/**
 * Objekat G (vidi DIJELJENJE IMENA gore).
 * @typedef {{ dijelovi: string[], S?: Stanje, el?: Elementi, korijen?: HTMLElement } & Object<string, any>} Galerija
 */
/**
 * Elementi stranice. Prva grupa je u HTML-u (null ako ga nema), a
 * panelVise i mob prave sucelje.js (pripremiKarticu, pripremiMob).
 * @typedef {Object} Elementi
 * @property {HTMLElement} ulaz
 * @property {HTMLElement} pokreni
 * @property {HTMLElement} platno
 * @property {HTMLElement} ucitavanje
 * @property {HTMLElement} izadji
 * @property {HTMLElement} fps
 * @property {HTMLElement} fpsPrekidac
 * @property {HTMLElement} pregled
 * @property {HTMLElement} prethodni
 * @property {HTMLElement} sljedeci
 * @property {HTMLElement} sala
 * @property {HTMLElement} panel
 * @property {HTMLElement} panelZatvori
 * @property {HTMLElement} pNaziv
 * @property {HTMLElement} pKat
 * @property {HTMLElement} pGodina
 * @property {HTMLElement} pTehnika
 * @property {HTMLElement} pDimenzije
 * @property {HTMLElement} pOpis
 * @property {HTMLElement} pLink
 * @property {HTMLElement} bocno
 * @property {HTMLElement} lupa
 * @property {HTMLElement[]} uglovi
 * @property {HTMLElement} tura
 * @property {HTMLElement} mapa
 * @property {HTMLElement} savjeti
 * @property {HTMLElement} pomoc
 * @property {HTMLElement} poruka
 * @property {HTMLElement} najava
 * @property {HTMLElement} hud
 * @property {HTMLElement} alati
 * @property {HTMLButtonElement} [panelVise]  strelica kartice (uspravni telefon)
 * @property {Object<string, any>} [mob]  trake režima preko cijelog ekrana
 */
/**
 * Jedno djelo iz data/radovi.json, u jeziku stranice (glavni.js,
 * ucitajPodatke): id, naziv, opis, tehnika, godina, dimenzije, slika…
 * @typedef {Object<string, any>} Djelo
 */
/**
 * Mjesto djela u sali (scena.js, postaviDjela).
 * @typedef {Object} Mjesto
 * @property {number} soba        1 ili 2
 * @property {any} mesh           lice djela — lupa gađa samo njega
 * @property {number} x
 * @property {number} y
 * @property {number} z
 * @property {number} nx          normala zida (ka sali)
 * @property {number} nz
 * @property {number} sirina      platno, u metrima
 * @property {number} visina
 * @property {Djelo} djelo
 * @property {any} svjetlo        reflektor nad djelom (ili zajednički za crteže)
 * @property {any} svjetloPoz     njegov početni položaj (bočno svjetlo ga pomjera)
 * @property {number} svjetloJacina
 * @property {number} svjetloUgao   početni ugao snopa (vraća se kad se bočno svjetlo ugasi)
 */
/**
 * Zajedničko stanje sale (const S, niže u omotaču). Polja bez [zagrada]
 * postoje od početka, u literalu; polja u [zagradama] upisuju dijelovi
 * kad zatrebaju, a do tada su undefined. Three.js objekti su `any`
 * (tipova Three.js nema u repou).
 * @typedef {Object} Stanje
 * @property {any} tri
 * @property {any} scena
 * @property {any} kamera
 * @property {any} render
 * @property {any} raycaster
 * @property {any[]} platna
 * @property {any[]} odrazi
 * @property {Mjesto[]} mjesta
 * @property {any[]} zaCiscenje
 * @property {number} petlja       requestAnimationFrame id (0 = stoji)
 * @property {number} sat
 * @property {boolean} fpsVidljiv
 * @property {number} fpsBrojac
 * @property {number} fpsOd
 * @property {boolean} radi
 * @property {Djelo[]} djela
 * @property {number} izabrano
 * @property {Object<string, any>} anim
 * @property {any} poz
 * @property {any} cilj
 * @property {{ x: number, y: number }} mis
 * @property {boolean} vuce
 * @property {{ x: number, y: number }} pocetak
 * @property {number} put
 * @property {{ skretanje: number, nagib: number, daljina: number }} orbita
 * @property {Object<string, any>} lupa
 * @property {Map<number, { x: number, y: number }>} prsti
 * @property {number} stipanje
 * @property {boolean} bocno
 * @property {Object<string, any>} tura
 * @property {number} uvod
 * @property {number} anizotropija
 * @property {Object<string, any>[]} teksture
 * @property {Object<string, any>[]} red
 * @property {number} redBroj
 * @property {number} redAktivno
 * @property {number} gen
 * @property {boolean} drugaKrenula
 * @property {boolean} najavljeno
 *
 * Kretanje kamere (kretanje.js, glavni.js)
 * @property {{ poz: any, cilj: any }} [ka]  prigušeno praćenje: kamo kamera ide
 * @property {number} [pogled]     smjer pogleda u pregledu (radijani)
 * @property {number} [inercija]   zamah poslije prevlačenja
 * @property {number} [brzina]
 * @property {number} [zadnjiPomak]
 * @property {{ x: number, y: number }} [misKlijent]
 * @property {number} [pincPregled]
 * @property {number} [pincTajmer]
 * @property {number} [sala]       1 ili 2: sala u kojoj je kamera
 * @property {any} [velicina]      Vector2, veličina okna
 * @property {ResizeObserver} [posmatrac]
 *
 * Petlja i crtanje (glavni.js)
 * @property {number} [prosli]
 * @property {number} [crtajJos]   još toliko kadrova se crta i kad kamera stoji
 * @property {number[]} [zadnjaMatrica]
 * @property {number} [zadnjiKadar]
 * @property {number} [sjenkeDjeca]
 * @property {number} [prosliCrtan]
 * @property {number[]} [kadroviMjera]
 * @property {number} [novaOstrina]
 * @property {number} [natpisT]
 * @property {boolean} [kontekstIzgubljen]
 *
 * Podaci (glavni.js, ucitajPodatke)
 * @property {Object<string, string>} [serije]
 * @property {Djelo[]} [ostali]
 * @property {number} [uPrvoj]
 * @property {number} [crtezi]
 *
 * Scena, svjetla i zagrijavanje (scena.js)
 * @property {any} [ambijent]
 * @property {any} [polulopta]
 * @property {any} [matZid]
 * @property {any} [matPlafon]
 * @property {any[]} [reflektori]
 * @property {Object<string, any>} [svjetlaGrupa]
 * @property {boolean} [svjetlaMalo]
 * @property {string|number} [svjetlaPrisilno]  'sva', ili broj svjetala (SVJETLA_U_KADRU)
 * @property {number} [svjetlaPotrebno]
 * @property {number} [svjetlaKrug]
 * @property {boolean} [drugaZagrijana]
 * @property {boolean} [drugaZakazana]
 * @property {boolean} [zagrijavanjeZakazano]
 * @property {number} [zagrijEkran]
 * @property {number} [zagrijMalo]
 *
 * Teksture (scena.js)
 * @property {any[]} [kadrovi]  poslovi koji čekaju kadar, jedan po kadru (uKadar)
 * @property {number} [crtanjaNaCekanju]
 * @property {Object<string, boolean>} [velikeUcitane]
 * @property {number} [velikaTajmer]
 *
 * Sučelje (sucelje.js, osnova.js)
 * @property {boolean} [mreza2D]
 * @property {number} [najavaTajmer]
 * @property {number} [porukaTajmer]
 * @property {HTMLElement} [natpis]
 * @property {SVGSVGElement} [mapaSvg]
 * @property {SVGElement} [mapaJa]
 * @property {SVGElement[]} [mapaTacke]
 * @property {string} [mapaZadnje]
 * @property {number} [mapaIzabrano]
 * @property {HTMLElement} [savjetiPovratak]
 * @property {boolean} [cistoRecen]
 * @property {{ el: HTMLElement, povratak: any, tipka: any }} [izbliza]  otvoren prozor Izbliza
 */

(function () {
'use strict';

/* Zajednički objekat dijelova (vidi zaglavlje). `dijelovi`: imena
   dijelova koji su se do kraja izvršili — glavni.js ne pokreće salu
   ako neki fali (nije stigao sa mreže). */
/** @type {Galerija} */
const G = /** @type {any} */ (window).__galerija = { dijelovi: [] };

/* ---------------------------------------------------------
   KORIJEN SAJTA
   Sve putanje iz podataka (data/, img/, vendor/) računaju se od
   KORIJENA SAJTA, izvedenog iz adrese ove skripte
   (js/galerija/osnova.js → ../../), ne od adrese stranice — inače
   bi sa en/galerija.html išle na en/img/… i padale.
   --------------------------------------------------------- */
const KORIJEN_SAJTA = (function () {
  const s = /** @type {HTMLScriptElement} */ (document.currentScript);
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

   Sirovih 3200 K je 0xFFB87B = rgb(255, 184, 123), po uobičajenoj
   aproksimaciji crnog tijela u sRGB. Toliko toplo svjetlo razbija
   okere i more pretvara u pijesak, pa SVJETLO_TOPLO nosi 3200 K uz
   hromatsku adaptaciju (oko se navikne na toplo svjetlo): 0xFFEBDD.
   Ne mijenjati "da bude ljepše" bez razloga.

   Ambijent je izveden IZ tokena: --ink-soft iz .soba-tamna
   (#C9BEAB), topao i razbijeljen taupe. Ambijent puni cijelu
   sobu, pa bi puna zasićenost od 3200 K sve prelila u narandžasto.
   --------------------------------------------------------- */
const SVJETLO_TOPLO = 0xFFEBDD;   /* 3200 K uz hromatsku adaptaciju — reflektori nad djelima */
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
const CRTEZI_SVJETLO = { dalje: 3.2, gore: 3.3, nize: 0.55, preko: 0.55, jezgro: -0.1, jacina: 0.75 };

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
   položeno ne smije dobiti desktop teksture (~17 MB po djelu na GPU-u). */
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
  const veza = /** @type {any} */ (navigator).connection;
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

/** @type {Elementi} — tip je na vrhu fajla */
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
/** @type {Stanje} — tip, i sa poljima koja se upisuju kasnije, je na vrhu fajla */
const S = {
  tri: null,            /* modul `three` kad se učita */
  scena: null,
  kamera: null,
  render: null,
  raycaster: null,
  platna: [],           /* mesh-evi djela — SAMO ovo gleda raycaster */
  odrazi: [],           /* ogledalne kopije — nikad klikabilne */
  mjesta: [],           /* { soba, mesh, x, y, z, nx, nz, sirina, visina, djelo, svjetlo… }
                           po djelu (vidi postaviDjela u scena.js) */
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
  anim: null,           /* klizanje { tacke, ciljevi, duz, trajanje, pocetak, uvod? } ili
                           hod { hod, put, duzinaPuta, cilj0, cilj1, trajanje, pocetak }
                           (vidi kreniKa i uvod u kretanje.js) */
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
  tura: null,           /* vođena tura: { i, start, korak, faza, pauza, od, do, osnova } */
  uvod: 0,              /* trenutak ulaska — svjetla se pale */
  anizotropija: 1,
  /* Teksture djela: red preuzimanja po prioritetu (vidi `uRed` u scena.js) */
  teksture: [],         /* { djelo, soba, platno, odraz, mesh, tex, nivo, gen } po djelu */
  red: [], redBroj: 0, redAktivno: 0,
  gen: 0,               /* raste na svakom izlasku — stari poslovi se odbacuju */
  drugaKrenula: false,  /* teksture druge sale su naručene */
  najavljeno: false     /* modulepreload za Three.js je već u <head> */
};
/* Automatski testovi (Playwright): ?proba izlaže stanje kao window.__S. */
if (/(^|[?&])proba(=|&|$)/.test(location.search.slice(1))) /** @type {any} */ (window).__S = S;

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
   nekoliko kadrova se crta i kad kamera stoji (vidi petlja() u glavni.js). */
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

/* =========================================================
   Virtuelna galerija — jezik i tekstovi
   Ista skripta služi crnogorsku (korijen), englesku (en/) i
   italijansku stranicu (it/); jezik se čita iz <html lang>.
   Ovdje su SVI tekstovi koje skripta sama upisuje u stranicu
   (natpisi, najave za čitače ekrana, poruke), na sva tri jezika.
   Tekstovi koji stoje u HTML-u prevode se u en/ i it/ stranicama,
   a nazivi, opisi i tehnike djela dolaze iz data/radovi.json
   (polja `en` i `it`).
   ========================================================= */

(function () {
'use strict';

/** @type {Galerija} */
const G = /** @type {any} */ (window).__galerija;

/* Jezik stranice, iz <html lang> */
const EN = document.documentElement.lang === 'en';
const IT = document.documentElement.lang === 'it';

/* Tekstovi koje skripta sama upisuje. Crnogorski je izvor. */
const TEKST = IT ? {
  izbliza: 'Da vicino: ', djelo: 'opera', zatvori: 'Chiudi',
  savjetPuna: 'Trascinate o usate le frecce per muovervi sul dipinto · clic o Invio mostra l’opera intera',
  savjetCijela: 'Fate clic sul dipinto o premete Invio per vederlo a grandezza piena',
  slikaIzbliza: function (n) { return n + ' — Invio passa alla grandezza piena, le frecce si muovono sul dipinto'; },
  platnoIme: 'Sala espositiva virtuale',
  salaNazad: 'Torna alla prima sala', salaDruga: 'Alla seconda sala',
  platno: 'Sala espositiva virtuale con le opere di Marko Dumnić. Fate clic su un dipinto per portarvi davanti la telecamera; ' +
    'le frecce sinistra e destra passano all’opera precedente e a quella successiva, Esc torna alla panoramica della sala. ' +
    'Davanti a un’opera: A e D girano intorno al dipinto, W e S cambiano l’altezza dello sguardo, ' +
    'le frecce su e giù avvicinano e allontanano, L accende la luce radente.',
  tura: 'Visita la mostra', nastavi: 'Riprendi la visita', pauza: 'Pausa',
  obilazak: function (k, n) { return 'Visita: ' + k + ' di ' + n; },
  redni: function (k, n) { return k + ' di ' + n; },
  nastavlja: 'La visita prosegue',
  pocetak: function (n) { return 'Visita alla mostra · ' + n + ' opere'; },
  pauzirano: 'Visita in pausa · «Riprendi la visita» la fa ripartire',
  kraj: 'Fine del percorso · grazie per la visita',
  mapa: 'Mappa', tlocrt: 'Pianta delle sale con le opere',
  sala1: 'SALA 1', sala2: 'SALA 2',
  djeloBr: function (i) { return 'Opera ' + i; },
  idiDo: 'Vai all’opera: ',
  sakrijMapu: 'Nascondi la pianta', prikaziMapu: 'Mostra la pianta',
  crtez: 'Disegno', ulje: 'Dipinto a olio',
  karticaVise: 'Mostra i dati dell’opera', karticaManje: 'Nascondi i dati dell’opera',
  opcije: 'Opzioni', iliDodir: 'o toccate un dipinto', oDjelu: 'Sull’opera',
  cistoSavjet: 'Toccate il dipinto per nascondere i pulsanti', cistoNazad: 'Toccate di nuovo il dipinto per riavere i pulsanti'
} : EN ? {
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
  redni: function (k, n) { return k + ' of ' + n; },
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
  redni: function (k, n) { return k + ' od ' + n; },
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

/* Poruke kad se izgubi i vrati WebGL kontekst (vidi kontekstIzgubljen
   u kretanje.js) */
const PORUKA_GRAFIKE = IT ? {
  izgubljena: 'La grafica si è fermata per un momento: la sala tornerà da sola. Se non torna, ricaricate la pagina.',
  vracena: 'La sala è di nuovo qui'
} : EN ? {
  izgubljena: 'The graphics paused for a moment: the gallery will come back by itself. If it doesn’t, please reload the page.',
  vracena: 'The gallery is back'
} : {
  izgubljena: 'Grafika je na trenutak zastala: sala će se sama vratiti. Ako se ne vrati, osvježite stranicu.',
  vracena: 'Sala je ponovo tu'
};

Object.assign(G, {
  EN, IT, TEKST, PORUKA_GRAFIKE
});
G.dijelovi.push('tekstovi');

})();
