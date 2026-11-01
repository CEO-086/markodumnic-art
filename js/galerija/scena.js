// @ts-check
/* =========================================================
   Virtuelna galerija — scena
   Raspored djela po zidovima obje sale, građenje sobe (pod, plafon,
   zidovi, lajsne), prolaza i druge sale, klupa, djela sa ramom,
   odrazom u podu i legendom, i jednokratno slaganje matrica
   nepokretnih objekata.
   ========================================================= */

(function () {
'use strict';

/** @type {Galerija} */
const G = /** @type {any} */ (window).__galerija;
/* osnova.js */
const {
  izKorijena, BOJA, SVJETLO_TOPLO, SVJETLO_AMBIJENT, TON_ZIDA, NEUTRALNO, SOBA, POLA_X, POLA_Z,
  VISINA_DJELA, MARGINA_ZIDA, DEBLJINA_PLATNA, DEBLJINA_RAMA, PREPUST_RAMA, PROLAZ, LEGENDA,
  ODRAZ_PROZIRNOST, POD_PROZIRNOST, S, pamti, osvjeziKadar
} = G;
const { SVJ, materijaliSvjetiljke, postaviSine, rasporediSvjetla, napraviReflektor } = G;   /* svjetla.js */
const { rasporediTeksture } = G;   /* teksture.js */

/* "70 × 60 cm" → { sirina: 0.70, visina: 0.60 } u METRIMA.
   Prava veličina, bez normalizacije i bez uvećanja. */
function mjereIzDimenzija(tekst, djelo) {
  const m = String(tekst || '').match(/(\d+(?:[.,]\d+)?)\s*[×xX*]\s*(\d+(?:[.,]\d+)?)/);
  if (!m && djelo && djelo.kategorija === 'crtezi' && djelo.sirinaPx > 0 && djelo.visinaPx > 0) {
    /* Crtež bez upisanih mjera: duža strana 42 cm (A3) */
    const k = 0.42 / Math.max(djelo.sirinaPx, djelo.visinaPx);
    return { sirina: djelo.sirinaPx * k, visina: djelo.visinaPx * k };
  }
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
/**
 * Mjesto na zidu, prije nego što dobije djelo (vidi Mjesto u osnova.js).
 * @typedef {Object} MjestoZida
 * @property {number} x
 * @property {number} [y]       visina centra (VISINA_DJELA)
 * @property {number} z
 * @property {number} rot       okret platna oko uspravne ose
 * @property {number} [nx]      normala zida, iz rot
 * @property {number} [nz]
 * @property {number} [soba]    2 = druga sala
 * @property {number} [red]     redoslijed obilaska u drugoj sali
 * @property {string} [grupa]   crteži: 'istok' | 'zapad' (zajednički reflektor)
 * @property {number} [cx]      crteži: sredina grupe po x
 * @property {number} [raspon]  crteži: širina grupe
 */
function raspored(n) {
  /* Zadnji zid je 14 od ukupno 32 m zidova koji nose djela */
  let nZadnji = Math.max(1, Math.round(n * SOBA.sirina / (SOBA.sirina + 2 * SOBA.dubina)));
  if (nZadnji > n) { nZadnji = n; }
  const ostatak = n - nZadnji;
  const nLijevi = Math.ceil(ostatak / 2);
  const nDesni = ostatak - nLijevi;

  /** @type {MjestoZida[]} */
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

/* CRTEŽI na prednjem zidu prve sale, lijevo i desno od prolaza — iza
   leđa posjetioca na početnoj poziciji, iznad klupa. Do pet po polovini
   zida. Obilazak nastavlja krug prve sale: posle desnog zida (x > 0) ide
   polovina prednjeg zida uz njega (od ugla ka vratima), pa druga (od
   vrata ka uglu). U data/radovi.json `zid: "desno"` je polovina uz
   desni zid sale (x > 0), `"lijevo"` ona uz lijevi. */
function rasporedCrteza(crtezi) {
  const ivica = PROLAZ.sirina / 2 + PROLAZ.okvir + 0.55;   /* od sredine vrata */
  const kraj = POLA_X - 0.75;                               /* od ugla */
  const raspon = kraj - ivica;
  const sredina = (ivica + kraj) / 2;
  /** @type {MjestoZida[]} */
  const mjesta = [];
  /** @type {[string, number][]} */ ([['istok', 1], ['zapad', -1]]).forEach(function (par) {
    const grupa = crtezi.filter(function (c) { return (c.zid === 'desno' ? 'istok' : 'zapad') === par[0]; });
    const n = grupa.length;
    for (let i = 0; i < n; i++) {
      /* od ugla ka vratima na x > 0, od vrata ka uglu na x < 0 */
      const udio = (i + 0.5) / n;
      const x = par[1] > 0 ? kraj - raspon * udio : -(ivica + raspon * udio);
      mjesta.push({
        x: x, z: POLA_Z, rot: Math.PI, y: VISINA_DJELA,
        nx: Math.sin(Math.PI), nz: Math.cos(Math.PI),
        grupa: par[0], cx: par[1] * sredina, raspon: raspon
      });
    }
  });
  return mjesta;
}

/* Druga sala (iza prolaza): pet mjesta na zadnjem zidu, po četiri na
   bočnim. Ista visina i normale kao u prvoj sali, pa za kameru,
   reflektor, legendu i lupu nema razlike u kojoj je sali djelo. */
const MJESTA_DRUGE = 13;
function rasporedDruge(n) {
  const SW = PROLAZ.sala2.sirina, SD = PROLAZ.sala2.dubina;
  const z0 = POLA_Z + PROLAZ.zid;
  /* Posjetilac ulazi kroz prolaz licem ka +z, pa mu je lijevo +x.
     `red` je redoslijed obilaska kao u prvoj sali: lijevi zid od vrata
     ka dnu, zadnji zid slijeva nadesno, desni zid od dna ka vratima —
     ▶ uvijek vodi na djelo desno. Niz ispod je redoslijed popunjavanja
     kad je djela manje od mjesta. */
  /** @type {MjestoZida[]} */
  const sva = [
    { x: -3.2, z: z0 + SD, rot: Math.PI, red: 8 },
    { x: -1.6, z: z0 + SD, rot: Math.PI, red: 7 },
    { x: 0,    z: z0 + SD, rot: Math.PI, red: 6 },
    { x: 1.6,  z: z0 + SD, rot: Math.PI, red: 5 },
    { x: 3.2,  z: z0 + SD, rot: Math.PI, red: 4 },
    { x: -SW / 2, z: z0 + SD * 0.2, rot: Math.PI / 2, red: 12 },
    { x:  SW / 2, z: z0 + SD * 0.2, rot: -Math.PI / 2, red: 0 },
    { x: -SW / 2, z: z0 + SD * 0.8, rot: Math.PI / 2, red: 9 },
    { x:  SW / 2, z: z0 + SD * 0.8, rot: -Math.PI / 2, red: 3 },
    { x: -SW / 2, z: z0 + SD * 0.4, rot: Math.PI / 2, red: 11 },
    { x:  SW / 2, z: z0 + SD * 0.4, rot: -Math.PI / 2, red: 1 },
    { x: -SW / 2, z: z0 + SD * 0.6, rot: Math.PI / 2, red: 10 },
    { x:  SW / 2, z: z0 + SD * 0.6, rot: -Math.PI / 2, red: 2 }
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

/* ---------------------------------------------------------
   Građenje sobe — pod, plafon, četiri zida, podna letva
   --------------------------------------------------------- */
/* Sobna mapa: WebP iz alati/teksture.py; ako ga nema, original PNG.
   Isti fajl učitan dvaput pregledač preuzima jednom (keš slika). */
function sobnaMapa(T, ime) {
  const ucitac = new T.TextureLoader();
  const t = ucitac.load(izKorijena('img/soba/' + ime + '.webp'), osvjeziKadar, undefined, function () {
    ucitac.load(izKorijena('img/soba/' + ime + '.png'), function (p) { t.image = p.image; t.needsUpdate = true; osvjeziKadar(); }, undefined, function () {});
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
    const t = pamti(sobnaMapa(T, ime));   /* oslobađa se na izlasku */
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
   Djela na zidovima + reflektor nad svakim + odraz u podu
   --------------------------------------------------------- */
function postaviDjela(djela) {
  const T = S.tri;
  const uPrvoj = Math.min(djela.length, S.uPrvoj || djela.length);
  const nCrt = Math.min(djela.length - uPrvoj, S.crtezi || 0);
  const mjesta = raspored(uPrvoj)
    .concat(rasporedCrteza(djela.slice(uPrvoj, uPrvoj + nCrt)))
    .concat(rasporedDruge(djela.length - uPrvoj - nCrt));
  S.teksture = [];
  S.drugaKrenula = false;

  S.drugaZakazana = false;
  S.zagrijavanjeZakazano = false;
  S.drugaZagrijana = false; S.zagrijEkran = 0;
  S.svjetlaGrupa = {};
  S.reflektori = [];
  S.svjetlaMalo = false; S.svjetlaPrisilno = null; S.zagrijMalo = 0;
  S.kadrovi = [];
  /* Ravna normal mapa (1×1, 128/128/255): platno od početka ima
     normalMap, pa dolazak pravog reljefa ne mijenja shader. */
  const ravnaNormala = pamti(new T.DataTexture(new Uint8Array([128, 128, 255, 255]), 1, 1));
  ravnaNormala.needsUpdate = true;

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
      metalness: 0.0,
      normalMap: ravnaNormala   /* prava mapa reljefa je samo zamijeni */
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
           ovdje, nego kroz red (`rasporediTeksture`, teksture.js): prvo sićušna
           slika svih djela, pa prava slika prve sale, pa njen reljef.
           Druga sala čeka dok posjetilac ne krene ka njoj. Do tada platno
           stoji u rezervnoj boji, pa u sićušnoj slici — nikad prazno. --- */
    if (djelo.slika) {
      S.teksture.push({
        djelo: djelo, soba: mj.soba || 1,
        platno: matPlatno, odraz: matOdrazPlatno, mesh: platno,
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
        osvjeziKadar();
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

    /* CRTEŽI dijele reflektor: jedan širi snop po polovini prednjeg zida,
       ne po jedan za svaki crtež — svako svjetlo više košta u svakom
       kadru, a crteži ionako traže blaže svjetlo (OSVJETLJENOST). */
    const grupa = mj.grupa ? (S.svjetlaGrupa || (S.svjetlaGrupa = {})) : null;
    const svjetlo = grupa && grupa[mj.grupa] ? grupa[mj.grupa] : napraviReflektor(mj, djelo, i);
    if (grupa) { grupa[mj.grupa] = svjetlo; }


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
  /* Prije svakog crtanja (i zagrijavanja): svjetla van kadra se gase */
  S.scena.onBeforeRender = function (r, scena, kamera) { rasporediSvjetla(kamera); };
}

/* NEPOKRETNO: zidovi, pod, plafon, klupe, ramovi, platna, odrazi,
   legende, svjetiljke i šine se posle gradnje više ne pomjeraju, a
   three.js bi inače u svakom kadru iznova slagao matricu svakog objekta
   (updateMatrix + množenje sa roditeljem). Zato se njihova matrica složi
   jednom — iste vrijednosti, samo bez ponavljanja. Svjetla ostaju živa
   (bočno svjetlo ih pomjera, vidi postaviBocno u svjetla.js).
   PAZI: objekat koji bi se posle gradnje pomjerao (position, rotation,
   scale) mora zadržati matrixAutoUpdate — ili posle pomjeranja pozvati
   updateMatrix(). */
function zamrzniNepokretno() {
  S.scena.matrixAutoUpdate = false;
  S.scena.traverse(function (o) {
    if (o === S.scena || o.isLight || !o.matrixAutoUpdate) { return; }
    o.matrixAutoUpdate = false;
    o.updateMatrix();
  });
}

Object.assign(G, {
  MJESTA_DRUGE, napraviSobu, postaviDjela, zamrzniNepokretno
});
G.dijelovi.push('scena');

})();
