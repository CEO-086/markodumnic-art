/* =========================================================
   Virtuelna galerija — teksture djela
   Izvori slika (sićušna, prava, reljef, velika), provjera AVIF-a,
   rasterizacija u platno, čekanje mirnog kadra, red preuzimanja po
   prioritetu, slanje na GPU jedna po kadru, i druga sala tek kad
   joj posjetilac krene.
   ========================================================= */

(function () {
'use strict';

const G = window.__galerija;
/* osnova.js */
const {
  izKorijena, NEUTRALNO, POLA_Z, VIDNO_POLJE, MAX_TEKSTURA, TELEFON, stediPodatke, S, kameraIde, uUvodu,
  pamti, salaTacke, osvjeziKadar
} = G;
const { zagrijDrugu } = G;   /* svjetla.js */

/* IZVORI TEKSTURA (pravi ih alati/teksture.py iz originala, koji ostaju
   na disku kao rezerva):
     img/sala/<id>-160.webp     sićušna slika — stoji na platnu odmah,
                                dok prava ne stigne
     img/sala/<id>-1024.webp    fotografija za telefone (MAX_TEKSTURA 1024)
     img/radovi/w/<id>-<w>.avif fotografija za računar (JPG kao rezerva)
     img/radovi/<id>.jpg        rezerva, u prirodnoj veličini
     img/reljef/<id>.webp       normal mapa (telefon: <id>-512.webp)
   Ako WebP fajla nema, uzima se original (JPG / PNG). */
function izvorMali(djelo) {
  return djelo.id ? izKorijena('img/sala/' + encodeURIComponent(djelo.id) + '-160.webp') : null;
}
/* Izvori po redu: prvi koji prođe ide na platno (vidi ucitajBoju). */
function izvoriDjela(djelo) {
  const id = djelo.id ? encodeURIComponent(djelo.id) : '';
  const avif = id && avifRadi !== false;
  const v = (djelo.varijante || []).slice().sort(function (a, b) { return a - b; });
  const l = [];
  /* Štednja podataka: 800 px AVIF iz img/radovi/w/ (~100 KB), i na telefonu */
  if (avif && stediPodatke() && v.indexOf(800) >= 0) { l.push(izKorijena('img/radovi/w/' + id + '-800.avif')); }
  if (TELEFON && id) {
    /* Telefon: WebP 1024 (AVIF je ovdje proban i odbačen: sitan pomak
       boje, a ušteda tek ~20 %) */
    l.push(izKorijena('img/sala/' + id + '-1024.webp'));
  } else if (avif && v.length && djelo.sirinaPx > 0) {
    /* Računar: AVIF iz img/radovi/w/ (isti fajlovi kao na stranicama
       radova) u širini najbližoj JPG-u — oko upola manje podataka za istu
       oštrinu. Ako AVIF ne prođe, učitava se JPG. */
    const w = v.filter(function (x) { return x >= djelo.sirinaPx * 0.95; })[0] || v[v.length - 1];
    if (w >= 800) { l.push(izKorijena('img/radovi/w/' + id + '-' + w + '.avif')); }
  }
  if (djelo.slika) { l.push(djelo.slika); }
  return l;
}
function izvorDjela(djelo) {
  return izvoriDjela(djelo)[0] || djelo.slika;
}
/* Fotografija pune veličine za Izbliza i Lupu: originalni JPG (AVIF je
   proban i odbačen zbog sitnog pomaka boje — boje slika moraju biti tačne). */
function izvorVelike(djelo) {
  return djelo.slikaVelika || djelo.slika;
}
function izvorReljefa(djelo, original) {
  const id = encodeURIComponent(djelo.id);
  return izKorijena('img/reljef/' + id + (original ? '.png' : (TELEFON || stediPodatke() ? '-512.webp' : '.webp')));
}

/* AVIF: provjera jednom, na slici 1×1 iz data: adrese (CSP img-src je
   dozvoljava), da pregledač bez AVIF-a ne preuzima AVIF fajlove uzalud.
   avifRadi: null dok se ne zna, pa true / false. */
let avifRadi = null;
const AVIF_PROVJERA = new Promise(function (res) {
  const p = new Image();
  const kraj = function (da) { avifRadi = da; res(da); };
  p.onload = function () { kraj(p.naturalWidth === 1); };
  p.onerror = function () { kraj(false); };
  p.src = 'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADrbWV0YQAAAAAAAAAhaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAAAAAAAOcGl0bQAAAAAAAQAAAB5pbG9jAAAAAEQAAAEAAQAAAAEAAAETAAAAHgAAAChpaW5mAAAAAAABAAAAGmluZmUCAAAAAAEAAGF2MDFDb2xvcgAAAABqaXBycAAAAEtpcGNvAAAAFGlzcGUAAAAAAAAAAQAAAAEAAAAQcGl4aQAAAAADCAgIAAAADGF2MUOBAAwAAAAAE2NvbHJuY2x4AAEADQAGgAAAABdpcG1hAAAAAAAAAAEAAQQBAoMEAAAAJm1kYXQSAAoIGAAGiAhoNCAyEBlHh4Yhh5555oAAAJBAzeg=';
});

/* Djelo (SVG ili fotografija) iscrta se u platno visoke rezolucije.
   SVG bi TextureLoader inače rasterizovao u prirodnoj veličini
   (npr. 700 px), pa bi izbliza i pod uglom bio mutan. */
function rasterizuj(url, max, zaPlatno, stigla) {
  return new Promise(function (res, odbij) {
    const slika = new Image();
    slika.decoding = 'async';
    /* Dekodiranje van glavne niti (decode()), a crtanje u platno tek kad
       se ne hoda iz sale u salu — inače bi slika koja stigne usred hoda
       zaustavila kadar. Prava slika djela (`zaPlatno`) čeka i da kamera
       stane, osim ako je to platno upravo pred očima (vidi kadMiruje).
       `stigla` se javi čim je slika preuzeta i dekodirana (vidi ucitajBoju). */
    slika.onload = function () {
      const dalje = function () {
        if (stigla) { stigla(); }
        if (zaPlatno) { kadMiruje(crtaj, zaPlatno); } else { kadNeHoda(crtaj); }
      };
      if (slika.decode) { slika.decode().then(dalje, dalje); } else { dalje(); }
    };
    const crtaj = function () {
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
function kadNeHoda(f) {
  if (S.anim && S.anim.hod) { window.setTimeout(function () { kadNeHoda(f); }, 120); return; }
  f();
}
/* PRED OČIMA: platno u sali u kojoj kamera jeste, a u kadru je. Odlaganje
   do mirnog kadra važi za ono što se sprema unaprijed (druga sala dok je
   posjetilac u prvoj, platna van kadra) — platno koje posjetilac gleda i
   na kom je još sićušna slika ili ravan reljef dobija pravu sliku i u
   pokretu, jednu po kadru, kao i ranije. */
const PRED_OCIMA = {};
function predOcima(m, kadar) {
  if (!m || !m.mesh || !S.kamera || !S.poz || !S.tri) { return false; }
  if (m.soba !== (S.sala || 1) || salaTacke(S.poz.z) !== m.soba) { return false; }
  return (kadar || kadarKamere()).intersectsObject(m.mesh);
}
function kadarKamere() {
  if (!PRED_OCIMA.kadar) { PRED_OCIMA.kadar = new S.tri.Frustum(); PRED_OCIMA.matrica = new S.tri.Matrix4(); }
  return PRED_OCIMA.kadar.setFromProjectionMatrix(
    PRED_OCIMA.matrica.multiplyMatrices(S.kamera.projectionMatrix, S.kamera.matrixWorldInverse));
}
/* Velika slika se crta u platno tek kad kamera stoji (vidi rasterizuj);
   nikad u hodu iz sale u salu. S.crtanjaNaCekanju: koliko ih još čeka
   (zagrijDrugu čeka i njih, kao što čeka teksture u redu za GPU). */
function cekaMir(m) {
  return S.radi && ((S.anim && S.anim.hod) || (kameraIde() && !uUvodu() && !predOcima(m)));
}
function kadMiruje(f, m) {
  if (!cekaMir(m)) { f(); return; }
  S.crtanjaNaCekanju = (S.crtanjaNaCekanju || 0) + 1;
  const opet = function () {
    if (cekaMir(m)) { window.setTimeout(opet, 120); return; }
    S.crtanjaNaCekanju--;
    f();
  };
  window.setTimeout(opet, 120);
}

/* RELJEF KAO ImageBitmap: normal mapa se preuzme (fetch) i dekodira van
   glavne niti (createImageBitmap iz Blob-a). Kroz <img> (TextureLoader)
   pregledač je dekodira tek u samom texImage2D, NA glavnoj niti: three.js
   za NoColorSpace traži sliku bez pretvaranja boje (UNPACK_COLORSPACE_
   CONVERSION_WEBGL = NONE), pa je pregledač dekodira iznova iz fajla.
   WebGL za ImageBitmap ne gleda UNPACK_FLIP_Y ni UNPACK_PREMULTIPLY_ALPHA
   (three.js ih tada ni ne postavlja), pa se okret, alfa i boja zadaju
   ovdje — iste kao do sada: okrenuta po visini, bez množenja alfom, bez
   pretvaranja boje — a tekstura dobija flipY = false. Pikseli na GPU-u
   su isti bit po bit.
   Fotografija djela (boja) ostaje na putu kroz platno: platno na grafici
   dekodira JPG/WebP/AVIF preko YUV-a na GPU-u, a createImageBitmap na
   procesoru — razlika je do 2/255, dakle ne bi bila ista slika.
   Samo u Chromium-u, gdje je to provjereno; drugdje ostaje <img>. */
const BITMAPA = typeof window.createImageBitmap === 'function' && typeof window.fetch === 'function' &&
  !!(navigator.userAgentData && navigator.userAgentData.brands &&
     navigator.userAgentData.brands.some(function (b) { return b.brand === 'Chromium'; }));
function bitmapaReljefa(url) {
  return window.fetch(url).then(function (r) {
    if (!r.ok) { throw new Error('HTTP ' + r.status); }
    return r.blob();
  }).then(function (b) {
    return window.createImageBitmap(b, {
      imageOrientation: 'flipY', premultiplyAlpha: 'none', colorSpaceConversion: 'none'
    });
  });
}
function jeBitmapa(x) {
  return typeof ImageBitmap !== 'undefined' && x instanceof ImageBitmap;
}
function zatvoriBitmapu(x) {
  if (jeBitmapa(x)) { x.close(); }
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
  /* Prva sala je gotova: druga se NE preuzima unaprijed (posjetilac
     možda nikad ne uđe u nju) — kreće tek kad joj se kamera okrene ili
     približi (paziNaDrugu) ili krene ka njoj. Ali se odmah „zagrije“
     sa sićušnim slikama: shaderi i stanje drajvera su spremni, pa ni
     kasni ulazak ne trza. */
  if (!S.redAktivno && !S.red.length && !S.drugaKrenula && S.teksture.length && !S.drugaZakazana) {
    S.drugaZakazana = true;
    const gen = S.gen;
    const kreni = function () { if (S.gen === gen) { zagrijDrugu(); } };
    if (window.requestIdleCallback) { window.requestIdleCallback(kreni, { timeout: 2500 }); }
    else { window.setTimeout(kreni, 800); }
  }
  /* Druga sala je učitana: jednom je „zagrij“ (vidi zagrijDrugu), sada
     sa pravim teksturama. */
  if (!S.redAktivno && !S.red.length && S.drugaKrenula && !S.zagrijavanjeZakazano) {
    S.zagrijavanjeZakazano = true;
    const gen2 = S.gen;
    const zagrij = function () { if (S.gen === gen2) { S.drugaZagrijana = false; zagrijDrugu(); } };
    if (window.requestIdleCallback) { window.requestIdleCallback(zagrij, { timeout: 2500 }); }
    else { window.setTimeout(zagrij, 800); }
  }
}

/* Teksture idu na GPU jedna po kadar (renderer.initTexture), ne sve
   u istom kadru — dvanaest slika odjednom je zastoj od pola sekunde.
   `tesko`: prava slika ili reljef (do 2048 px) — ide samo dok kamera
   stoji (i u uvodu, vidi uUvodu), osim za platno pred očima (`m`, vidi
   predOcima). Sićušna slika (~160 px) ne košta ništa, pa ide i u pokretu. */
function uKadar(posao, tesko, m) {
  posao.tesko = !!tesko;
  posao.m = m || null;
  (S.kadrovi || (S.kadrovi = [])).push(posao);
}
function jedanPosaoKadra(hod, miruje) {
  if (!S.kadrovi || !S.kadrovi.length) { return; }
  /* Hod iz sale u salu ide bez ijednog slanja na GPU — tekstura koja
     zakasni stane na platno čim kamera stane (do tada sićušna slika). */
  if (hod) { return; }
  /* I kad kamera klizi od djela do djela (ili je pomjera točkić, zamah,
     prevlačenje): prava slika i reljef čekaju kadar u kom kamera stoji —
     slanje velike slike usred klizanja je zastoj koji se vidi. Osim za
     platno pred očima (vidi predOcima): ono ide i u pokretu, jedno po kadru. */
  let i = 0;
  if (!miruje) {
    let kadar = null;
    while (i < S.kadrovi.length && S.kadrovi[i].tesko) {
      const m = S.kadrovi[i].m;
      if (m && predOcima(m, kadar || (kadar = kadarKamere()))) { break; }
      i++;
    }
    if (i === S.kadrovi.length) { return; }
  }
  osvjeziKadar();
  const posao = S.kadrovi.splice(i, 1)[0];
  try { posao(); } catch (e) { /* tekstura nije prošla — ostaje stara */ }
}
/* Posao još važi: ista sala (nije se izašlo i ponovo ušlo u međuvremenu) */
function aktuelno(m) { return m.gen === S.gen && !!S.render; }

/* Nova slika na platno i odraz — samo ako je bolja od postojeće */
function staviBoju(m, c, nivo) {
  uKadar(function () { staviBojuSada(m, c, nivo); }, nivo >= 2, nivo >= 2 && m.nivo < 2 ? m : null);
}
function staviBojuSada(m, c, nivo) {
  if (!aktuelno(m) || nivo <= m.nivo) { return; }
  const T = S.tri;
  /* Rasterizovana oštro, sa mipmapama i anizotropnim filtriranjem.
     Bez anizotropije platno pod uglom od 60° se razmaže u mrlju. */
  const tex = pamti(new T.CanvasTexture(c));
  tex.colorSpace = T.SRGBColorSpace;
  tex.generateMipmaps = true;
  tex.minFilter = T.LinearMipmapLinearFilter;
  tex.anisotropy = S.anizotropija;
  S.render.initTexture(tex);
  const stara = m.tex;
  m.tex = tex;
  m.nivo = nivo;
  /* Odraz dobija istu teksturu, da se u podu ne vidi prazna boja
     ispod obojenog platna. */
  [m.platno, m.odraz].forEach(function (mat) {
    /* Shader se mijenja samo kad mapa prvi put dođe; zamjena jedne
       teksture drugom ne traži novi program. */
    if (!mat.map) { mat.needsUpdate = true; }
    mat.map = tex;
    mat.color.set(NEUTRALNO);
  });
  if (stara) { stara.dispose(); }
}
function ucitajMalu(m) {
  const u = izvorMali(m.djelo);
  if (!u) { m.malaPala = true; }
  if (!u || !aktuelno(m)) { return null; }
  return rasterizuj(u, 256).then(function (c) { staviBoju(m, c, 1); }, function () { m.malaPala = true; });
}
function ucitajBoju(m) {
  if (!aktuelno(m)) { return null; }
  const maxStr = Math.min(MAX_TEKSTURA, S.render.capabilities.maxTextureSize || MAX_TEKSTURA);
  /* Mjesto u redu preuzimanja (uRed) se oslobađa čim slika stigne i
     dekodira se, ne tek kad se nacrta: crtanje može čekati miran kadar
     (kadMiruje), a preuzimanje ostalih slika (i druge sale) ne smije
     zbog toga stati dok se posjetilac kreće. */
  let oslobodi = null;
  const stigla = new Promise(function (r) { oslobodi = r; });
  AVIF_PROVJERA.then(function () {
    /* izvori po redu (AVIF → WebP / JPG): sljedeći tek kad prethodni padne */
    const izvori = izvoriDjela(m.djelo);
    /* crtanje u platno tek kad kamera stoji (osim za platno pred očima) */
    let p = rasterizuj(izvori[0], maxStr, m, oslobodi);
    izvori.slice(1).forEach(function (u) { p = p.catch(function () { return rasterizuj(u, maxStr, m, oslobodi); }); });
    return p;
  }).then(function (c) { staviBoju(m, c, 2); }, function () { /* tišina — rezervna boja ostaje */ })
    .then(oslobodi, oslobodi);
  return stigla;
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
  const krozImg = function (url) {
    return new Promise(function (res, odbij) { ucitavac.load(url, res, undefined, odbij); });
  };
  /* ImageBitmap (vidi BITMAPA); veća od najveće teksture ide kroz <img>,
     da je three.js smanji kao i do sada */
  const maxStr = S.render.capabilities.maxTextureSize || 4096;
  const uzmi = !BITMAPA ? krozImg : function (url) {
    return bitmapaReljefa(url).then(function (b) {
      if (b.width > maxStr || b.height > maxStr) { b.close(); return krozImg(url); }
      const t = new T.Texture(b);
      t.flipY = false;            /* već okrenuta u createImageBitmap */
      t.needsUpdate = true;
      return t;
    });
  };
  return uzmi(izvorReljefa(m.djelo, false))
    .catch(function () { return uzmi(izvorReljefa(m.djelo, true)); })
    .then(function (nm) {
      uKadar(function () {
        if (!aktuelno(m)) { nm.dispose(); zatvoriBitmapu(nm.image); return; }
        nm.anisotropy = S.anizotropija;
        S.render.initTexture(nm);
        /* Platno od početka ima ravnu normal mapu (1×1), pa ovo je
           samo zamjena teksture — bez novog shadera u tom kadru. */
        m.platno.normalMap = nm;
        m.platno.normalScale.set(1.2, 1.2);
        pamti(nm);
      }, true, m);
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
/* Druga sala: čim posjetilac krene ka njoj (hod, tura, izbor djela iz
   nje, mapa, dugme „Druga sala“ pod mišem) ili se okrene ka prolazu. */
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
/* Kad se druga sala „najavi“ sama od sebe (svaki kadar): kamera je u
   njoj, ili je bliže vratima od `blizu` m, ili su vrata unutar vidnog
   polja uvećanog za `ugao` (rad.) — dok se pogled okreće ka prolazu,
   teksture već idu, a dok su djela iza vrata daleko (iz pregleda prve
   sale 8+ m), sićušna slika je oštra koliko i prava. Uz štednju podataka
   ništa unaprijed: samo stvarni polazak (kreniKa, uSalu, tura). */
const NAJAVA_DRUGE = { blizu: 2.0, ugao: 0.6 };
function paziNaDrugu() {
  if (S.drugaKrenula || !S.poz || !S.cilj) { return; }
  if (S.sala === 2 || salaTacke(S.poz.z) === 2) { ucitajDrugu(); return; }
  if (stediPodatke()) { return; }
  const vx = -S.poz.x, vz = POLA_Z - S.poz.z;
  const daljina = Math.hypot(vx, vz) || 1e-6;
  if (daljina < NAJAVA_DRUGE.blizu) { ucitajDrugu(); return; }
  const dx = S.cilj.x - S.poz.x, dz = S.cilj.z - S.poz.z;
  const d = Math.hypot(dx, dz) || 1;
  const polH = Math.atan(Math.tan(VIDNO_POLJE * Math.PI / 360) * (S.kamera ? S.kamera.aspect : 1.6));
  if ((dx * vx + dz * vz) / (d * daljina) > Math.cos(Math.min(Math.PI, polH + NAJAVA_DRUGE.ugao))) { ucitajDrugu(); }
}

/* Fotografija pune veličine za „Izbliza“ krene čim kamera stigne pred
   djelo (računar, ne uz „štedi podatke“) — klik je onda otvara odmah,
   iz keša pregledača. */
function predUcitajVeliku(djelo) {
  if (TELEFON || !djelo || !djelo.slikaVelika || stediPodatke()) { return; }
  const url = izvorVelike(djelo);
  S.velikeUcitane = S.velikeUcitane || {};
  if (S.velikeUcitane[url]) { return; }
  window.clearTimeout(S.velikaTajmer);
  S.velikaTajmer = window.setTimeout(function () {
    if (!S.radi || S.velikeUcitane[url]) { return; }
    S.velikeUcitane[url] = true;
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
  }, 1500);
}

Object.assign(G, {
  izvorDjela, izvorVelike, rasterizuj, zatvoriBitmapu, jedanPosaoKadra, rasporediTeksture, ucitajDrugu,
  paziNaDrugu, predUcitajVeliku
});
G.dijelovi.push('teksture');

})();
