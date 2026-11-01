/* =========================================================
   Virtuelna galerija — kamera i kretanje
   Pregled sale i stajanje pred djelom, orbita oko djela, klizanje i
   hod kroz prolaz, izbor djela, pregled, prelaz u drugu salu,
   veličina okna, vođena tura, uvod (svjetla se pale), paralaksa i
   šta je pod pokazivačem.
   ========================================================= */

(function () {
'use strict';

const G = window.__galerija;
/* osnova.js */
const {
  SOBA, POLA_X, POLA_Z, VISINA_OKA, VIDNO_POLJE, PUNJENJE_KADRA, MIN_DALJINA, MAX_DALJINA, HOD,
  VISINA_PREGLEDA, TRAJANJE_KLIZANJA, PARALAKSA, ORBITA, UGAO_PRESETA, PROLAZ, korijen, el, S,
  smanjenoKretanje, graniceSale, salaTacke, osvjeziKadar, sada, poruka
} = G;
const { TEKST } = G;   /* tekstovi.js */
const { postaviBocno } = G;   /* svjetla.js */
const { ucitajDrugu, predUcitajVeliku } = G;   /* teksture.js */
const { savjetCisto, osvjeziMob } = G;   /* telefon.js */
/* ui.js */
const {
  najavi, osvjeziKretanje, velicinaMeta, zatvoriSavjete, otvoriPanel, zatvoriPanel, panelOtvoren
} = G;
const { otvoriIzbliza, postaviLupu } = G;   /* izbliza.js */

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
    /* Tačke ispred i iza vrata ne smiju pasti iza početka ni iza
       odredišta: pregled druge sale stoji samo 0.6 m iza vrata, pa je
       put išao preko njega i vraćao se — pogled je tu trznuo u stranu. */
    const prije = Math.min(0.9, Math.abs(S.poz.z - vrata.z) * 0.5);
    const poslije = Math.min(0.9, Math.abs(poz.z - vrata.z) * 0.5);
    tacke.push(vrata.clone().setZ(vrata.z - smjer * prije));
    ciljevi.push(new T.Vector3(0, 1.5, vrata.z + smjer * 3));
    tacke.push(vrata.clone().setZ(vrata.z + smjer * poslije));
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
  predUcitajVeliku(S.mjesta[k].djelo);
  savjetCisto();
  najavi(S.mjesta[k].djelo, k, n);
  osvjeziKretanje();
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

/* --- Veličina platna. Pregled zavisi od odnosa stranica, pa se
       pozicija kamere preračunava kad se okno promijeni. --- */
function mjeri() {
  if (!S.render || !el.platno) { return; }
  const w = el.platno.clientWidth || 800;
  const h = el.platno.clientHeight || 500;
  S.kamera.aspect = w / h;
  S.kamera.updateProjectionMatrix();
  /* Svaka dodjela canvas.width/height (i ista vrijednost) iznova pravi
     i briše bafer slike, a to čeka grafiku. ResizeObserver i 'resize'
     javljaju i kad se broj piksela ne promijeni (oba za istu promjenu
     prozora, djelić piksela, traka za skrol) — tada setSize ne treba. */
  const v = S.render.getSize(S.velicina || (S.velicina = new S.tri.Vector2()));
  if (v.x !== w || v.y !== h) { S.render.setSize(w, h, false); }
  velicinaMeta();
  osvjeziKadar();

  if (S.anim) { return; }   /* usred klizanja ne preskačemo kameru */
  const c = S.izabrano < 0 ? pozicijaPregleda() : pozicijaOrbite(S.izabrano, S.orbita);
  S.poz.copy(c.poz);
  S.cilj.copy(c.cilj);
}

/* ---------------------------------------------------------
   Vođena tura, uvod, paralaksa i šta je pod pokazivačem
   (mapa sale i savjeti su u ui.js)
   --------------------------------------------------------- */

/* VOĐENA TURA: kamera sama ide od djela do djela (i kroz prolaz u
   drugu salu), zastane pred svakim koliko je potrebno da se pročita
   kartica i polako se primakne, kao posjetilac koji se naginje ka
   slici. Svaki dodir, klik ili tipka je pauzira — posjetilac uvijek
   ima prednost — a dugme je nastavlja od djela pred kojim stoji. */
const TURA = { zadrziMin: 7000, zadrziMax: 13000, poRijeci: 120, kruzenje: 6 * Math.PI / 180, primicanje: 0.07 };

function osvjeziDugmeTure() {
  if (!el.tura) { return; }
  const t = S.tura;
  const n = S.mjesta.length || 1;
  const tekst = el.tura.querySelector('.galerija-tura__tekst') || el.tura;
  if (!t) {
    tekst.textContent = TEKST.tura;
    el.tura.style.setProperty('--napredak', '0');
    korijen.removeAttribute('data-tura');
    osvjeziMob();
    return;
  }
  /* Natpis kaže šta će dugme uraditi („Pauza“ / „Nastavi“), pa dugme
     NEMA aria-pressed — čitač bi inače čuo dva suprotna stanja. */
  tekst.textContent = (t.pauza ? TEKST.nastavi : TEKST.pauza) + ' · ' + Math.min(n, t.korak + 1) + '/' + n;
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
    pocetak: S.uvod + 250,
    uvod: true            /* teksture idu i u uvodu, kao i ranije (vidi uUvodu, osnova.js) */
  };
}

function korakUvoda(t) {
  if (!S.uvod) { return; }
  const p = Math.min(1, (t - S.uvod) / 1700);
  const e = 1 - Math.pow(1 - p, 3);
  S.render.toneMappingExposure = 0.15 + (1.2 - 0.15) * e;
  if (p >= 1) { S.uvod = 0; osvjeziKadar(); }
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

Object.assign(G, {
  pozicijaPregleda, promijeniOrbitu, ugao, kreniKa, korakHoda, korakKlizanja, izaberi, naPregled, uSalu,
  prvoUSali, tackaKlika, mjeri, osvjeziDugmeTure, kreniTuru, pauzirajTuru, zavrsiTuru, korakTure, uvod,
  korakUvoda, sParalaksom, pogodak
});
G.dijelovi.push('kamera');

})();
