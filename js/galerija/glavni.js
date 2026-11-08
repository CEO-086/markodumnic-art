// @ts-check
/* =========================================================
   Virtuelna galerija — pokretanje
   Preuzimanje Three.js (tek na klik) i podataka, pokretanje sale,
   petlja (crtanje po potrebi) i prilagodljiva oštrina, izlaz, ulaz
   i početno stanje stranice. Učitava se POSLJEDNJI.
   ========================================================= */

(function () {
'use strict';

/** @type {Galerija} */
const G = /** @type {any} */ (window).__galerija;
/* osnova.js */
const {
  izKorijena, BOJA, VIDNO_POLJE, TELEFON, stediPodatke, korijen, el, S, smanjenoKretanje, kameraIde,
  uUvodu, svedi, lako, osvjeziKadar, sada, POCETNA_SALA
} = G;
const { EN, IT, TEKST } = G;   /* tekstovi, osnova.js */
const { SVJ, zagrijNaEkranu, SVJETLA_U_KADRU, osvjeziSjenke } = G;   /* svjetla, scena.js */
const { zatvoriBitmapu, jedanPosaoKadra, paziNaDrugu, izvorMali, izvorDjela, AVIF_PROVJERA } = G;   /* teksture, scena.js */
const { MJESTA_VELIKE, napraviSobu, postaviDjela, zamrzniNepokretno } = G;   /* scena.js */
/* telefon, sucelje.js */
const {
  postaviKarticu, pripremiKarticu, uronjeno, fokusUTraku, postaviOpcije, pripremiMob
} = G;
/* ui, sucelje.js */
const {
  stanje, izmjeriTraku, centrirajSalu, centrirajSaluUnaprijed, na2D, osvjeziKretanje, napraviMapu, osvjeziMapu, pokaziSavjete,
  zatvoriSavjete, zatvoriPanel, natpis
} = G;
const { zatvoriIzbliza, postaviLupu, osvjeziLupu } = G;   /* izbliza, sucelje.js */
/* kamera, kretanje.js */
const {
  pozicijaPregleda, korakHoda, korakKlizanja, mjeri, osvjeziDugmeTure, zavrsiTuru, korakTure,
  uvod, korakUvoda, sParalaksom, pogodak
} = G;
const { vezi, odvezi } = G;   /* unos, kretanje.js */

/* Three.js: modul i jezgro koje on uvozi. Oba se najavljuju kao
   <link rel="modulepreload"> čim je dugme "Uđi u salu" na vidiku, pod
   mišem ili u fokusu — inače bi jezgro krenulo tek kad modul stigne
   (vodopad od dva zahtjeva poslije klika). */
const THREE_FAJLOVI = ['vendor/three/three.module.min.js', 'vendor/three/three.core.min.js'];

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

/* ---------------------------------------------------------
   Preuzimanje Three.js — tek na klik, iz vendor/three/

   Dinamički import() minifikovanog ES modula r186 sa istog sajta
   (vendor/three/three.module.min.js); on sam uvozi
   ./three.core.min.js. Importmape nema: inline bi je CSP blokirao,
   a adresa se ionako gradi ovdje.
   --------------------------------------------------------- */
async function ucitajThree() {
  /* PAZI: adresa je apsolutna, od KORIJENA SAJTA (izKorijena,
     osnova.js), a ne relativna: ne zavisi od toga prema čemu se
     razrješava `import()` iz klasičnog skripta, i radi i u korijenu, i
     sa en/ i it/, i kad je sajt objavljen pod prefiksom. */
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
  const veza = /** @type {any} */ (navigator).connection;
  if (stediPodatke() || (veza && /(^|-)2g$/.test(veza.effectiveType || ''))) { return; }
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
   Podaci o djelima: istaknuta (mala sala, u koju se ulazi), ostala
   ulja i crteži (velika sala, crteži na zidu sa prolazom), iz
   data/radovi.json

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

  /* Svako djelo u jeziku stranice (polje `en` na engleskoj, `it` na
     italijanskoj), sa putanjama slika od korijena sajta — dalje u kodu
     sve je isto. */
  const svi = ((podaci && podaci.radovi) || []).map(function (r) {
    if (!r) { return r; }
    const d = Object.assign({}, r);
    const prevod = IT ? r.it : EN ? r.en : null;
    if (prevod) {
      if (prevod.naziv) { d.naziv = prevod.naziv; }
      if (prevod.opis) { d.opis = prevod.opis; }
      if (prevod.tehnika) { d.tehnika = prevod.tehnika; }
    }
    if (d.slika) { d.slika = izKorijena(d.slika); }
    if (d.slikaVelika) { d.slikaVelika = izKorijena(d.slikaVelika); }
    return d;
  });
  /* Nazivi serija za natpis u panelu ("Pejzaži"…) */
  S.serije = {};
  ((podaci && podaci.kategorije) || []).forEach(function (k) {
    if (k && k.id) { S.serije[k.id] = (IT && k.nazivIt) || (EN && k.nazivEn) || k.naziv; }
  });
  const izbor = svi.filter(function (r) { return r && r.istaknuto; });
  /* Ostala ulja vise u velikoj sali, iza prolaza */
  S.ostali = svi.filter(function (r) { return r && !r.istaknuto && r.slika && r.kategorija !== 'crtezi'; });
  if (!izbor.length) { throw { vrsta: 'prazno' }; }
  /* Crteži (kategorija "crtezi" u radovi.json) idu na zid velike sale
     sa prolazom, po zidu iz polja `zid` ("desno" = polovina uz desni
     zid sale, x > 0) */
  let crtezi = svi.filter(function (r) { return r && r.kategorija === 'crtezi' && r.slika; });
  const po = { desno: 0, lijevo: 0 };
  crtezi = crtezi.filter(function (c) { const z = c.zid === 'desno' ? 'desno' : 'lijevo'; c.zid = z; return ++po[z] <= 5; });
  /* redoslijed obilaska: prvo polovina uz desni zid sale */
  crtezi = crtezi.filter(function (c) { return c.zid === 'desno'; }).concat(crtezi.filter(function (c) { return c.zid !== 'desno'; }));
  /* Sva djela idu na zidove, redom obilaska: istaknuta u malu salu,
     pa ostala ulja u veliku, pa crteži na njen zid sa prolazom */
  const velika = S.ostali.slice(0, MJESTA_VELIKE);
  S.uMaloj = izbor.length;
  S.uVelikoj = velika.length;
  S.crtezi = crtezi.length;
  return izbor.concat(velika, crtezi);
}

/* PRILAGODLJIVA OŠTRINA (samo računar): ako je crtanje sporo (medijana
   kadra preko 26 ms, tj. ispod ~38 fps, dok se kamera kreće), broj
   piksela se spusti 2 → 1.5 → 1.25. Nikad ne raste nazad usred posjete,
   da se oštrina ne bi klackala. Na jakom računaru se ništa ne mijenja. */
const STEPENI_OSTRINE = [2, 1.5, 1.25];
function mjeriBrzinu(t) {
  if (TELEFON || !S.render) { S.prosliCrtan = t; return; }
  const kretanje = S.anim || S.ka || S.inercija || S.vuce;
  if (kretanje && S.prosliCrtan) {
    (S.kadroviMjera || (S.kadroviMjera = [])).push(t - S.prosliCrtan);
    if (S.kadroviMjera.length >= 45) {
      const niz = S.kadroviMjera.slice().sort(function (a, b) { return a - b; });
      const medijana = niz[niz.length >> 1];
      S.kadroviMjera = [];
      if (medijana > 26) {
        const sad = S.render.getPixelRatio();
        const sljedeci = STEPENI_OSTRINE.filter(function (x) { return x < sad - 0.01; })[0];
        if (sljedeci) { S.novaOstrina = sljedeci; }
      }
    }
  }
  S.prosliCrtan = kretanje ? t : 0;
}
/* Nova oštrina tek kad kamera stane — promjena veličine slike usred
   klizanja je sama po sebi jedan spori kadar. Primjenjuje se u petlji
   PRIJE crtanja tog kadra: promjena veličine briše bafer slike i čeka
   da grafika završi sve poslato. Kadar nacrtan neposredno prije nje bio
   bi obrisan neprikazan (platno bi taj kadar ostalo prazno), a čekanje
   bi trajalo i za cio taj kadar. Poslije nje se druga sala opet
   „zagrije“ na ekranu, za novu veličinu slike. */
function primijeniOstrinu() {
  if (!S.novaOstrina || S.anim || S.ka || S.inercija || S.vuce) { return; }
  S.render.setPixelRatio(S.novaOstrina);   /* sam zadrži veličinu okna */
  S.novaOstrina = 0;
  if (S.drugaZagrijana) { S.zagrijEkran = 4; }
  if (S.svjetlaMalo) { S.zagrijMalo = 8 * SVJETLA_U_KADRU.length; }
  osvjeziKadar();
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
  /* Sala stoji, pa se mapa sjenke ne crta u svakom kadru, nego samo
     kad se nešto u sceni promijeni (vidi osvjeziSjenke, scena.js) — na telefonu
     i na računaru. Sjenka izgleda isto, a grafika ima manje posla. */
  S.render.shadowMap.autoUpdate = false;
  S.render.shadowMap.needsUpdate = true;
  S.sjenkeDjeca = -1;

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

  /* Na ulasku kamera stoji na PREGLEDU početne (male) sale */
  S.sala = POCETNA_SALA;
  const start = pozicijaPregleda();
  S.poz = start.poz.clone();
  S.cilj = start.cilj.clone();
  S.izabrano = -1;
  S.zadnje = -1;
  S.anim = null;
  S.mis.x = 0;
  S.mis.y = 0;

  S.radi = true;
  S.sat = sada();
  S.fpsOd = S.sat;
  S.fpsBrojac = 0;

  stanje('soba');
  izmjeriTraku();
  korijen.setAttribute('data-fps', S.fpsVidljiv ? 'da' : 'ne');
  if (el.fpsPrekidac) { el.fpsPrekidac.setAttribute('aria-pressed', S.fpsVidljiv ? 'true' : 'false'); }
  vezi();
  mjeri();
  osvjeziKretanje();
  osvjeziDugmeTure();
  uvod();
  petlja();
  centrirajSalu();
  /* Svaki ulazak, na svakom uređaju: kratko uputstvo u tri sličice i
     pitanje „sa vodičem ili sam“. Fokus tada ide na prvo dugme u njemu. */
  if (G.okreniNaUlazu) { G.okreniNaUlazu(); }
  if (el.savjeti) { pokaziSavjete(); return; }
  if (G.savjetOkreni) { window.setTimeout(G.savjetOkreni, 500); }

  /* Fokus na platno: tipke rade odmah, bez Taba i bez klika.
     preventScroll — inače pregledač skoči na salu i otme mjesto čitanja. */
  try { S.render.domElement.focus({ preventScroll: true }); }
  catch (e) { S.render.domElement.focus(); }
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

  /* Vidno polje klizi ka cilju (zid crteža na uspravnom telefonu) */
  if (S.fovCilj && S.kamera && Math.abs(S.kamera.fov - S.fovCilj) > 0.05) {
    const f = S.kamera.fov + (S.fovCilj - S.kamera.fov) * Math.min(1, dt * 5);
    S.kamera.fov = Math.abs(f - S.fovCilj) <= 0.05 ? S.fovCilj : f;
    S.kamera.updateProjectionMatrix();
    osvjeziKadar();
  }

  /* Kretanje na početku kadra (vidi jedanPosaoKadra i zagrijavanje u
     scena.js) */
  const stajala = !kameraIde();
  const hodala = !!(S.anim && S.anim.hod);
  const uvodila = uUvodu();

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
  S.kamera.updateMatrixWorld();
  /* Pogled klizi ispod mirnog miša (zamah poslije okretanja, točkić):
     natpis prati ono što je SAD pod mišem, pa pritisak ide baš na
     djelo koje natpis pokazuje (vidi naDole u kretanje.js). */
  if (S.misKlijent && !S.vuce && S.izabrano < 0 && !S.anim && (S.ka || S.inercija)) {
    natpis(pogodak(S.misKlijent.x, S.misKlijent.y), S.misKlijent.x, S.misKlijent.y);
  }

  /* Tekstura ide na GPU tek kad se zna kretanje (i kadar) ovog kadra:
     velika samo ako kamera ne ide ni na početku ni na kraju koraka — ni
     u kadru u kom klizanje stiže na cilj, ni u kom tura krene ka
     sljedećem djelu. Izuzeci: uvod (vidi uUvodu, osnova.js) i platno
     pred očima (vidi predOcima, scena.js). */
  jedanPosaoKadra(hodala || !!(S.anim && S.anim.hod), uvodila || (stajala && !kameraIde()));

  /* CRTANJE PO POTREBI: kad se ništa ne mijenja (kamera stoji, nema
     klizanja, prevlačenja ni novih tekstura), isti kadar se ne crta
     iznova — grafika se odmori, a kad krene pokret, nema zaostalog
     posla. Sve što mijenja sliku bez pomjeranja kamere (tekstura,
     legenda, svjetlo, veličina okna, oštrina) zove osvjeziKadar(). */
  const me = S.kamera.matrixWorld.elements;
  let promjena = !S.zadnjaMatrica;
  if (!promjena) {
    for (let k = 0; k < 16; k++) { if (Math.abs(me[k] - S.zadnjaMatrica[k]) > 1e-7) { promjena = true; break; } }
  }
  if (promjena) { S.zadnjaMatrica = me.slice(); }
  let crtaj = promjena || S.crtajJos > 0 || S.anim || S.ka || S.inercija || S.vuce || S.uvod ||
    S.lupa.na || (S.kadrovi && S.kadrovi.length) || S.novaOstrina;
  if (S.crtajJos > 0) { S.crtajJos--; }
  primijeniOstrinu();

  /* Nešto dodato u scenu (gradnja sale) — sjenka se crta iznova,
     a matrice novih nepokretnih objekata se slože jednom */
  if (S.scena.children.length !== S.sjenkeDjeca) {
    S.sjenkeDjeca = S.scena.children.length;
    zamrzniNepokretno();
    osvjeziSjenke();
  }
  /* Zagrijavanje samo u kadru u kom kamera stoji od početka do kraja
     (ne ni u posljednjem kadru klizanja) */
  if (S.zagrijEkran && stajala && !kameraIde()) {
    zagrijNaEkranu(S.zagrijEkran);
    S.zagrijEkran--;
    crtaj = true;
  } else if (S.zagrijMalo && stajala && !kameraIde()) {
    zagrijNaEkranu((S.zagrijMalo - 1) % 8 + 1, SVJETLA_U_KADRU[Math.floor((S.zagrijMalo - 1) / 8)]);
    S.zagrijMalo--;
    if (!S.zagrijMalo) { S.svjetlaMalo = true; }
    crtaj = true;
  }
  if (crtaj) {
    S.render.render(S.scena, S.kamera);
    S.zadnjiKadar = t;
    mjeriBrzinu(t);
  } else {
    S.prosliCrtan = 0;
  }
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
  if (G.skiniIstoriju) { G.skiniIstoriju(); }
  if (el.mapa) { el.mapa.textContent = ''; }
  S.mapaJa = null;
  S.mapaTacke = [];
  S.mapaSvg = null;
  S.uvod = 0;
  if (S.kontekstIzgubljen && el.poruka) { el.poruka.classList.remove('je-vidljiva'); }
  S.kontekstIzgubljen = false;
  if (!S.radi) { stanje('ulaz'); return; }
  S.radi = false;

  if (S.petlja) { window.cancelAnimationFrame(S.petlja); S.petlja = 0; }
  zatvoriPanel(false);
  odvezi();

  /* Oslobađanje resursa */
  for (const r of S.zaCiscenje) {
    if (r && typeof r.dispose === 'function') { r.dispose(); }
    /* ImageBitmap pušta memoriju odmah, ne tek kad je pokupi GC */
    if (r && r.isTexture) { zatvoriBitmapu(r.image); }
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
    /* reflektor sa sjenkom drži i mapu sjenke na grafici */
    S.scena.traverse(function (o) { if (o.isLight && o.dispose) { o.dispose(); } });
    while (S.scena.children.length) { S.scena.remove(S.scena.children[0]); }
  }
  S.reflektori = [];

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
   PREDUČITAVANJE U POZADINI

   Dok posjetilac čita stranicu, sala se tiho priprema: Three.js
   (modulepreload), data/radovi.json i slike PRVE sale (sićušne,
   prave, pa reljef poteza), plus teksture zidova, poda i plafona. Sve ide u keš
   pregledača sa niskim prioritetom, kad se stranica smiri — pa je klik
   na „Uđi u salu“ praktično trenutan, a slike su već na platnima.
   Ne pokreće se uz „štedi podatke“ ili 2G (tada tek kad posjetilac
   krene ka dugmetu), ni bez WebGL-a.
   --------------------------------------------------------- */
const SOBA_MAPE = ['zid-albedo', 'zid-normal', 'zid-roughness', 'pod-albedo', 'pod-normal', 'pod-roughness',
  'plafon-albedo', 'plafon-normal'];
function predSliku(url, cors, gotovo) {
  if (!url) { if (gotovo) { gotovo(); } return; }
  const i = new Image();
  if (gotovo) { i.onload = i.onerror = gotovo; }
  /* Isti način kao kasnije u sali (TextureLoader traži CORS, rasterizuj
     ne), da pregledač uzme istu kopiju iz keša. */
  if (cors) { i.crossOrigin = 'anonymous'; }
  try { /** @type {any} */ (i).fetchPriority = 'low'; } catch (e) { /* stari pregledač */ }
  i.decoding = 'async';
  i.src = url;
}
function predUcitaj() {
  if (S.predUcitano) { return; }
  S.predUcitano = true;
  najaviThree();
  const p = ucitajPodatke();
  S.podaciRano = p;
  p.then(function (djela) {
    SOBA_MAPE.forEach(function (ime) { predSliku(izKorijena('img/soba/' + ime + '.webp'), true); });
    const prva = djela.slice(0, S.uMaloj || 0);
    prva.forEach(function (d) { predSliku(izvorMali(d), false); });
    /* Prave slike tek kad se zna radi li AVIF (izvorDjela bira format) */
    AVIF_PROVJERA.then(function () {
      /* Reljef poteza (normal mape, ~250 KB) tek kad stignu sve slike —
         ne smije im oduzimati vezu. Crteži reljef nemaju. */
      let ostalo = prva.length;
      const reljef = function () {
        if (--ostalo) { return; }
        const kraj = TELEFON ? '-512.webp' : '.webp';
        prva.forEach(function (d) {
          if (d.id && d.kategorija !== 'crtezi') {
            predSliku(izKorijena('img/reljef/' + encodeURIComponent(d.id) + kraj), true);
          }
        });
      };
      prva.forEach(function (d) { predSliku(izvorDjela(d), false, reljef); });
    });
  }, function () { /* greška se pokazuje tek na klik (ulaz) */ });
}
function predUcitajKadTreba() {
  if (!korijen || !imaWebGL() || location.protocol === 'file:') { return; }
  const d = el.pokreni;
  /* Posjetilac krene ka dugmetu — odmah, bez čekanja */
  if (d) {
    ['pointerenter', 'focus', 'touchstart'].forEach(function (tip) {
      d.addEventListener(tip, predUcitaj, { once: true, passive: true });
    });
  }
  const veza = /** @type {any} */ (navigator).connection;
  if (stediPodatke() || (veza && /(^|-)2g$/.test(veza.effectiveType || ''))) { return; }
  const kreni = function () {
    if (window.requestIdleCallback) { window.requestIdleCallback(predUcitaj, { timeout: 2500 }); }
    else { window.setTimeout(predUcitaj, 300); }
  };
  if (document.readyState === 'complete') { kreni(); }
  else { window.addEventListener('load', kreni, { once: true }); }
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

  /* Podaci iz pozadinskog predučitavanja, ako su već tu (samo jednom —
     ponovni ulazak čita svježe). Ako je ono palo, pokušava se iznova. */
  const rano = S.podaciRano;
  S.podaciRano = null;
  S.predUcitano = true;
  let djela;
  try {
    djela = rano ? await rano.catch(function () { return ucitajPodatke(); }) : await ucitajPodatke();
  } catch (g) {
    na2D((g && g.vrsta) || 'podaci');
    return;
  }

  let modul;
  try {
    modul = await obecanjeThree;
    if (!modul || !modul.WebGLRenderer) { throw new Error('nepotpun modul'); }
  } catch (g) {
    /* Three.js nije stigao iz vendor/three/ (nema veze, blokiran) ili je
       nepotpun. Razlog se i dalje zove 'cdn' — tako ga čitaju CSS i
       galerija.html (data-razlog). */
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

Object.assign(G, {
  petlja, izadji
});

/* Svi dijelovi su se izvršili do kraja, ovim redom? Ako neki fajl
   nije stigao sa mreže, sala se ne pokreće — kao kad nije stigla
   cijela skripta: bez data-stanje, pa js/rano.js na `load` pokaže 2D
   mrežu. Spisak mora pratiti fajlove (provjera:
   testovi/galerija/imena.js). G je svim dijelovima već u rukama, pa
   se skida sa window. */
delete /** @type {any} */ (window).__galerija;
if (G.dijelovi.join() !== 'osnova,tekstovi,svjetla,teksture,scena,telefon,ui,izbliza,kamera,unos') { return; }

/* ---------------------------------------------------------
   Početno stanje

   Smanjeno kretanje NE vodi više na 2D: sala radi, kamera samo
   skače umjesto da klizi (vidi `kreniKa` u kretanje.js). Poruka o tome je na
   ulaznom ekranu i otkriva je CSS.
   --------------------------------------------------------- */
if (korijen) {
  if (!imaWebGL()) {
    na2D('webgl');
  } else {
    stanje('ulaz');
    if (el.pokreni) { el.pokreni.addEventListener('click', ulaz); }
    /* Slika Kastra na ulaznom ekranu (na telefonu) vodi u salu isto kao
       dugme. Ostaje aria-hidden: za tastaturu i čitače ekrana tu je dugme. */
    const ukras = korijen.querySelector('.galerija-ulaz-slika');
    if (ukras && el.pokreni) {
      ukras.addEventListener('click', function () { el.pokreni.click(); });
    }
    najaviKadTreba();
    predUcitajKadTreba();
    /* „Uđi u galeriju“ sa početne (galerija.html?ulaz) ulazi odmah u
       salu, bez drugog klika. Parametar se briše iz adrese, pa
       osvježavanje stranice opet prikazuje običan ulaz. */
    if (/(^|[?&])ulaz(=|&|$)/.test(location.search.slice(1))) {
      try { history.replaceState(history.state, '', location.pathname + location.hash); } catch (e) { /* nebitno */ }
      ulaz();
      /* Sala odmah u sredinu ekrana, još dok se učitava — ne prvo vrh
         stranice pa skok kad se sala otvori. */
      centrirajSaluUnaprijed();
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
      G.nazad(true);   /* kretanje.js: iz crteža prvo na cijeli zid */
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
