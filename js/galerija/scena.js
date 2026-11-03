// @ts-check
/* =========================================================
   Virtuelna galerija — js/galerija/scena.js
   Tri dijela: svjetla, teksture djela, scena (raspored i građenje
   sala). Svaki je u svom omotaču i prijavljuje se sam.
   ========================================================= */

/* =========================================================
   Virtuelna galerija — svjetla
   Svjetiljke i šine (vidljiva tijela reflektora), reflektor nad
   djelom, zagrijavanje druge sale, gašenje svjetala van kadra i
   prevođenje varijanti shadera za to, bočno svjetlo i sjenka.
   ========================================================= */

(function () {
'use strict';

/** @type {Galerija} */
const G = /** @type {any} */ (window).__galerija;
/* osnova.js */
const {
  BOJA, SVJETLO_TOPLO, POLA_X, POLA_Z, VISINA_DJELA, UGAO_UPADA, VISINA_SINE, DALJINA_SVJETLA,
  UGAO_SNOPA, ODMAK_OD_ZIDA, UGAO_BOCNO, OSVJETLJENOST, CRTEZI_SVJETLO, PROLAZ, TELEFON, el, S,
  kameraIde, pamti, graniceSale, POCETNA_SALA, jeDruga, osvjeziKadar
} = G;

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

/* Sredina sale i četiri pravca ka njenim zidovima (x, z), za
   zagrijavanje: 4 × 100° pokrije sve oko kamere. */
function pravciSale(soba) {
  if (soba === 2) {
    const SW = PROLAZ.sala2.sirina, SD = PROLAZ.sala2.dubina;
    const z0 = POLA_Z + PROLAZ.zid;
    return { x: 0, z: z0 + SD * 0.5, pravci: [[0, z0 + SD], [SW, z0 + SD * 0.5], [-SW, z0 + SD * 0.5], [0, z0]] };
  }
  return { x: 0, z: 0, pravci: [[0, -POLA_Z], [POLA_X, 0], [-POLA_X, 0], [0, POLA_Z]] };
}
const DRUGA_SALA = POCETNA_SALA === 2 ? 1 : 2;

/* ZAGRIJAVANJE DRUGE SALE: dok je posjetilac u prvoj (početnoj), drugu
   (onu iza prolaza) jednom iscrta u sićušnu nevidljivu sliku (64 × 64),
   iz sredine druge sale ka svakom zidu. Tako se svi shaderi i teksture njenih
   djela, legendi i odraza pripreme unaprijed, a ne u kadru u kom
   kamera prvi put vidi drugu salu — to je bio trzaj usred klizanja. */
function zagrijDrugu() {
  if (!S.render || !S.tri || !S.scena || S.drugaZagrijana) { return; }
  /* ne dok se kamera kreće (klizanje, točkić, zamah, prevlačenje), ne dok
     teksture još idu na GPU (ili čekaju da se nacrtaju, vidi kadMiruje u
     dijelu teksture) i ne prije nego što platna druge sale dobiju
     sićušne slike (mapa mijenja shader) */
  if (kameraIde() || (S.kadrovi && S.kadrovi.length) || S.crtanjaNaCekanju > 0 || !maleDrugeStigle()) { window.setTimeout(zagrijDrugu, 400); return; }
  S.drugaZagrijana = true;
  const T = S.tri;
  const druga = pravciSale(DRUGA_SALA);
  const meta = new T.WebGLRenderTarget(64, 64);
  const kam = new T.PerspectiveCamera(100, 1, 0.1, 40);
  kam.position.set(druga.x, 1.6, druga.z);
  const stara = S.render.getRenderTarget();
  /* Ovdje su upaljena SVA svjetla, kao pri prvom zagrijavanju: kad se
     druga sala zagrije ponovo (prave teksture), gašenje svjetala van
     kadra je već uključeno, pa bi ova sićušna slika tražila nove
     varijante shadera (6/12 svjetala, bez tone mappinga) — 11 programa
     prevedenih usred mirovanja u drugoj sali, samo za nju. */
  S.svjetlaPrisilno = 'sva';
  try {
    druga.pravci.forEach(function (t) {
      kam.lookAt(t[0], VISINA_DJELA, t[1]);
      kam.updateMatrixWorld();
      S.render.setRenderTarget(meta);
      S.render.render(S.scena, kam);
    });
  } catch (e) { /* nije uspjelo — sala radi i bez toga */ }
  S.svjetlaPrisilno = null;
  S.render.setRenderTarget(stara);
  meta.dispose();
  /* Crtež u render target ide BEZ tone mappinga i sRGB izlaza, pa su to
     druge varijante shadera od onih na ekranu. Zato još i compile()
     sa ekranom kao metom: pripremi baš one programe koje kadar koristi
     (za sve objekte scene, bez obzira na to gdje kamera gleda). */
  try { S.render.compile(S.scena, kam); } catch (e) {}
  prevediMalo(kam);
  /* Na računaru (ANGLE/Metal) grafički drajver i poslije toga sprema
     dio stanja tek pri PRVOM crtanju na sam ekran. Zato još jedan
     kadar: druga sala se iscrta na ekran i odmah preko nje obična
     slika prve (početne) sale, u istom kadru, pa posjetilac to ne vidi. */
  if (!TELEFON) { S.zagrijEkran = 4; }
}

function maleDrugeStigle() {
  return S.teksture.every(function (m) { return !jeDruga(m.soba) || m.nivo >= 1 || m.malaPala; });
}

/* Jedan pravac po kadru (S.zagrijEkran broji 4 → 1), da nijedan kadar
   u prvoj sali ne nosi četiri dodatna crtanja odjednom. */
function zagrijNaEkranu(korak, malo) {   /* malo: broj svjetala (SVJETLA_U_KADRU) */
  const T = S.tri;
  const kam = new T.PerspectiveCamera(100, S.kamera.aspect, 0.1, 40);
  /* Varijanta sa manje svjetala (vidi rasporediSvjetla): koraci 8 → 5
     su iz sredine prve (početne) sale ka njena četiri zida, 4 → 1 iz
     sredine druge, kao gore. */
  let sala = pravciSale(DRUGA_SALA);
  if (malo && korak > 4) {
    sala = pravciSale(POCETNA_SALA);
    korak -= 4;
  }
  const pravci = sala.pravci;
  kam.position.set(sala.x, 1.6, sala.z);
  S.svjetlaPrisilno = malo || 'sva';   /* i posle nove oštrine: tačno ta varijanta */
  try {
    pravci.slice(korak - 1, korak).forEach(function (t) {
      kam.lookAt(t[0], VISINA_DJELA, t[1]);
      kam.updateMatrixWorld();
      S.render.render(S.scena, kam);
    });
  } catch (e) {}
  S.svjetlaPrisilno = null;
}

/* SVJETLA VAN KADRA. Svaki reflektor se u shaderu računa za svaki
   piksel, i kad ga ne dotiče. A reflektor čiji snop (kupa dužine
   `distance`) ne siječe vidno polje kamere ne doprinosi NIJEDNOM pikselu
   tog kadra: three.js mu van kupe i dalje od `distance` daje tačno nulu.
   Takav se za taj kadar ugasi — slika je ista do posljednjeg bita.
   Broj upaljenih mijenja shader, pa da se ništa ne prevodi usred hoda,
   upaljeno je uvijek SVE ili tačno jedan od brojeva SVJETLA_U_KADRU
   (dopunjeno reflektorima van kadra, koji ionako daju nulu): pregled
   velike sale sa ulaza traži 13, pred djelima i u maloj sali manje,
   pogled kroz vrata sva. Sve varijante se
   prevedu i zagriju unaprijed (zagrijDrugu → prevediMalo); dok to nije
   gotovo, sva svjetla su upaljena, kao i prije. Reflektor koji baca
   sjenku je uvijek upaljen (i njegova sjenka mijenja shader). */
const SVJETLA_U_KADRU = [6, 14];
const DOMET = {};
function dometSvjetla(l) {
  const T = S.tri;
  if (!DOMET.tacka) {
    DOMET.tacka = new T.Vector3();
    DOMET.osa = new T.Vector3();
    DOMET.u = new T.Vector3();
    DOMET.v = new T.Vector3();
  }
  /* Kutija zavisi samo od mjesta svjetla, mete, ugla i dometa, a oni se
     mijenjaju tek uz bočno svjetlo — inače se ista kutija ne računa
     iznova u svakom kadru. */
  const P = l.position, Q = l.target.position, d = l.distance;
  let z = l.userData.domet;
  if (z && z.px === P.x && z.py === P.y && z.pz === P.z && z.qx === Q.x && z.qy === Q.y && z.qz === Q.z &&
      z.ugao === l.angle && z.d === d) { return z.kutija; }
  if (!z) { z = l.userData.domet = { kutija: new T.Box3() }; }
  z.px = P.x; z.py = P.y; z.pz = P.z; z.qx = Q.x; z.qy = Q.y; z.qz = Q.z; z.ugao = l.angle; z.d = d;
  const k = z.kutija, t = DOMET.tacka;
  const osa = DOMET.osa.subVectors(Q, P).normalize();
  const c = Math.cos(l.angle), s = Math.sin(l.angle);
  DOMET.u.set(Math.abs(osa.y) < 0.9 ? 0 : 1, Math.abs(osa.y) < 0.9 ? 1 : 0, 0).cross(osa).normalize();
  DOMET.v.crossVectors(osa, DOMET.u);
  k.makeEmpty();
  k.expandByPoint(P);
  /* rub kupe na daljini d (16 tačaka) i, ako je u kupi, krajnja tačka
     kape u pravcu svake ose — kutija obuhvata cijeli snop */
  for (let i = 0; i < 16; i++) {
    const f = i * Math.PI / 8;
    t.copy(osa).multiplyScalar(c)
      .addScaledVector(DOMET.u, s * Math.cos(f))
      .addScaledVector(DOMET.v, s * Math.sin(f));
    k.expandByPoint(t.multiplyScalar(d).add(P));
  }
  const ose = [osa.x, osa.y, osa.z];
  for (let a = 0; a < 3; a++) {
    for (let z = -1; z <= 1; z += 2) {
      if (ose[a] * z >= c) {
        t.set(0, 0, 0).setComponent(a, z * d);
        k.expandByPoint(t.add(P));
      }
    }
  }
  /* 16 tačaka malo potcijene krug; plus 5 cm zalihe */
  k.expandByScalar(d * s * (1 - Math.cos(Math.PI / 16)) + 0.05);
  return k;
}
function rasporediSvjetla(kamera) {
  const R = S.reflektori;
  if (!R || !R.length || !S.tri) { return; }
  const nacin = S.svjetlaPrisilno || (S.svjetlaMalo ? 'kadar' : 'sva');
  let treba = 0;
  if (nacin === 'kadar') {
    if (!DOMET.kadar) { DOMET.kadar = new S.tri.Frustum(); DOMET.matrica = new S.tri.Matrix4(); }
    DOMET.kadar.setFromProjectionMatrix(DOMET.matrica.multiplyMatrices(kamera.projectionMatrix, kamera.matrixWorldInverse));
  }
  for (const l of R) {
    l.userData.uKadru = nacin === 'sva' || l.castShadow || !(l.distance > 0) ||
      (nacin === 'kadar' && DOMET.kadar.intersectsBox(dometSvjetla(l)));
    if (l.userData.uKadru) { treba++; }
  }
  S.svjetlaPotrebno = treba;
  let K = typeof nacin === 'number' ? nacin : R.length;
  if (nacin === 'kadar') {
    for (const k of SVJETLA_U_KADRU) { if (treba <= k) { K = k; break; } }
  }
  let dopuna = Math.max(0, Math.min(K, R.length) - treba);
  for (const l of R) {
    if (l.userData.uKadru) { l.visible = true; }
    else { l.visible = dopuna > 0; dopuna--; }
  }
}
/* Varijante sa SVJETLA_U_KADRU svjetala: prevedu se za sve materijale
   scene, sačeka se da ih grafika zaista spremi (bez blokiranja), pa se
   još i iscrtaju na ekran (zagrijNaEkranu, 8 pravaca po varijanti, samo
   dok kamera stoji). Tek tada se svjetla van kadra gase. */
function prevediMalo(kam) {
  const R = S.reflektori;
  if (!R || R.length <= SVJETLA_U_KADRU[0]) { return; }
  const programi = [];
  for (const k of SVJETLA_U_KADRU) {
    let mat = null;
    S.svjetlaPrisilno = k;
    rasporediSvjetla(kam);
    try { mat = S.render.compile(S.scena, kam); } catch (e) { mat = null; }
    S.svjetlaPrisilno = null;
    if (!mat) { rasporediSvjetla(kam); return; }
    mat.forEach(function (m) {
      const p = S.render.properties.get(m).currentProgram;
      if (p && programi.indexOf(p) < 0) { programi.push(p); }
    });
  }
  rasporediSvjetla(kam);
  const gen = S.gen, krug = S.svjetlaKrug = (S.svjetlaKrug || 0) + 1;
  const cekaj = function () {
    if (S.gen !== gen || S.svjetlaKrug !== krug || !S.render) { return; }
    if (programi.some(function (p) { return p.isReady && !p.isReady(); })) { window.setTimeout(cekaj, 50); return; }
    /* i na telefonu: novi shaderi se prvi put crtaju dok kamera stoji
       (iOS/ANGLE-Metal spremaju stanje tek pri prvom crtanju) */
    S.zagrijMalo = 8 * SVJETLA_U_KADRU.length;
  };
  cekaj();
}

/* Reflektor na šini nad djelom (vidi postaviDjela, dio scena) */
function napraviReflektor(mj, djelo, i) {
    const T = S.tri;
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
    if (mj.grupa) {
      /* Zajednički snop za grupu crteža: iz sredine grupe, dalje od
         zida i širi, da pokrije sve crteže na toj polovini zida. */
      /* Snop gađa malo ispod sredine crteža: pod kosim uglom najsvjetliji
         dio kruga pada iznad cilja, pa tako krug sjedne baš na crteže. */
      const dalje = CRTEZI_SVJETLO.dalje, gore = CRTEZI_SVJETLO.gore;
      svjetlo.position.set(mj.cx + mj.nx * dalje, gore, mj.z + mj.nz * dalje);
      svjetlo.target.position.set(mj.cx, mj.y - CRTEZI_SVJETLO.nize, mj.z);
      const daljina = svjetlo.position.distanceTo(svjetlo.target.position);
      /* Jezgro snopa (puna jačina) pokriva sve crteže grupe, i krajnje —
         inače su krajnji bili u polusjeni, sa ~40 % svjetla unutrašnjih.
         Od jezgra do ivice snopa svjetlo se mekano gasi, malo van crteža. */
      svjetlo.angle = Math.min(1.1, Math.atan((mj.raspon / 2 + CRTEZI_SVJETLO.preko) / daljina));
      const jezgro = Math.atan(Math.max(0.1, mj.raspon / 2 + CRTEZI_SVJETLO.jezgro) / daljina);
      svjetlo.penumbra = Math.min(0.9, Math.max(0.1, 1 - jezgro / svjetlo.angle));
      svjetlo.distance = daljina * 2.5;
      svjetlo.intensity = 17 * Math.pow(daljina / 3.0, 2) * CRTEZI_SVJETLO.jacina;
    }

    /* SJENKU BACA SAMO JEDNO SVJETLO, ne svaki reflektor.
       Sjenke su najskuplja stvar u sceni; shadow mapa po djelu bi
       ubilo brzinu na slabijoj grafici, a dobitak je jedna mekana
       sjenka ispod rama koju ionako vidite samo kod prvog djela. */
    if (i === 0 && !mj.grupa) {
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
    S.reflektori.push(svjetlo);

    /* --- SVJETILJKA: vidljivo tijelo reflektora na mjestu svjetla —
           adapter na šini, kratka cijev i kućište okrenuto ka djelu,
           sa toplim sočivom. Svjetlo u sceni izlazi tačno iz sočiva. */
    postaviSvjetiljku(svjetlo.position, svjetlo.target.position);
  return svjetlo;
}

/* Bočno svjetlo: reflektor izabranog djela prelazi na stranu,
   skoro paralelno sa platnom. Isključuje se pri izboru drugog djela. */
function postaviBocno(ukljuci) {
  // eslint-disable-next-line no-unused-vars -- od ranije; ostaje, izmjene su samo premještanje
  const T = S.tri;
  /* Crteži jedne grupe dijele isti reflektor: kad je izabran jedan od
     njih, ostali iz grupe ga ne smiju vratiti na početno mjesto. */
  const izabraniReflektor = ukljuci && S.izabrano >= 0 ? S.mjesta[S.izabrano].svjetlo : null;
  for (let i = 0; i < S.mjesta.length; i++) {
    const m = S.mjesta[i];
    const na = ukljuci && i === S.izabrano;
    if (!na && m.svjetlo === izabraniReflektor) { continue; }
    if (na) {
      const tx = m.nz, tz = -m.nx;
      /* Zid crteža (ciklus) se osvjetljava cio, sa kraja zida: reflektor
         ide dalje u stranu i zadržava širok snop grupe. */
      const L = DALJINA_SVJETLA * 0.6 + (m.clanovi ? m.sirina * 0.5 : 0);
      m.svjetlo.position.set(
        m.x - tx * L * Math.sin(UGAO_BOCNO) + m.nx * L * Math.cos(UGAO_BOCNO),
        m.y + 0.15,
        m.z - tz * L * Math.sin(UGAO_BOCNO) + m.nz * L * Math.cos(UGAO_BOCNO)
      );
      m.svjetlo.angle = m.clanovi ? Math.min(1.2, m.svjetloUgao + 0.3) : 0.75;
      m.svjetlo.intensity = m.svjetloJacina * (m.clanovi ? 1.6 : 0.9);
    } else {
      m.svjetlo.position.copy(m.svjetloPoz);
      m.svjetlo.angle = m.svjetloUgao;   /* početni snop, ne UGAO_SNOPA: crteži su širi */
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

/* Mapa sjenke se crta u sljedećem kadru. To je jedini put do nove
   sjenke (shadowMap.autoUpdate je ugašen, vidi pokreni u glavni.js). */
function osvjeziSjenke() {
  if (S.render) { S.render.shadowMap.needsUpdate = true; }
  osvjeziKadar();
}

Object.assign(G, {
  SVJ, materijaliSvjetiljke, postaviSine, zagrijDrugu, zagrijNaEkranu, SVJETLA_U_KADRU, rasporediSvjetla,
  napraviReflektor, postaviBocno, osvjeziSjenke
});
G.dijelovi.push('svjetla');

})();

/* =========================================================
   Virtuelna galerija — teksture djela
   Izvori slika (sićušna, prava, reljef, velika), provjera AVIF-a,
   rasterizacija u platno, čekanje mirnog kadra, red preuzimanja po
   prioritetu, slanje na GPU jedna po kadru, i druga sala tek kad
   joj posjetilac krene.
   ========================================================= */

(function () {
'use strict';

/** @type {Galerija} */
const G = /** @type {any} */ (window).__galerija;
/* osnova.js */
const {
  izKorijena, NEUTRALNO, POLA_Z, PROLAZ, VIDNO_POLJE, MAX_TEKSTURA, TELEFON, stediPodatke, S, kameraIde,
  uUvodu, pamti, salaTacke, POCETNA_SALA, jeDruga, osvjeziKadar
} = G;
const { zagrijDrugu } = G;   /* svjetla, scena.js */

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
  if (m.soba !== (S.sala || POCETNA_SALA) || salaTacke(S.poz.z) !== m.soba) { return false; }
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
  !!(/** @type {any} */ (navigator).userAgentData && /** @type {any} */ (navigator).userAgentData.brands &&
     /** @type {any} */ (navigator).userAgentData.brands.some(function (b) { return b.brand === 'Chromium'; }));
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

   Sve fotografije i normal mape odjednom na telefonu znače da sala
   stoji siva i minut i po (izmjereno još sa 13 djela, a sada ih je
   više). Zato red sa prioritetima i najviše
   RED_MAX poslova istovremeno (manji broj = ranije):
     —    sićušne slike (img/sala/<id>-160.webp, ~4 KB) svih djela
          idu odmah, mimo reda
     1    prave slike prve sale (početne, vidi POCETNA_SALA)
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
  /* Druga sala je učitana: jednom je „zagrij“ (vidi zagrijDrugu, dio
     svjetla), sada
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
   stoji (i u uvodu, vidi uUvodu u osnova.js), osim za platno pred očima (`m`, vidi
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
    if (!jeDruga(m.soba)) { uRed(1, function () { return ucitajBoju(m); }); }
  });
  S.teksture.forEach(function (m) {
    if (!jeDruga(m.soba)) { uRed(3, function () { return ucitajReljef(m); }); }
  });
}
/* Druga sala (iza prolaza, vidi POCETNA_SALA): čim posjetilac krene ka
   njoj (hod, tura, izbor djela iz nje, mapa, dugme „Druga sala“ pod
   mišem) ili se okrene ka prolazu. */
function ucitajDrugu() {
  if (S.drugaKrenula || !S.teksture.length) { return; }
  S.drugaKrenula = true;
  S.teksture.forEach(function (m) {
    if (jeDruga(m.soba)) { uRed(0.5, function () { return ucitajBoju(m); }); }
  });
  S.teksture.forEach(function (m) {
    if (jeDruga(m.soba)) { uRed(2, function () { return ucitajReljef(m); }); }
  });
}
/* Kad se druga sala „najavi“ sama od sebe (svaki kadar): kamera je u
   njoj, ili je bliže vratima od `blizu` m i okrenuta ka njima, ili su
   vrata unutar vidnog polja uvećanog za `ugao` (rad.) — dok se pogled
   okreće ka prolazu, teksture već idu. Pregled male (početne) sale
   stoji odmah uz vrata, ali leđima okrenut njima: tu blizina sama ne
   znači polazak. Uz štednju podataka ništa unaprijed: samo stvarni
   polazak (kreniKa, uSalu, tura). */
const NAJAVA_DRUGE = { blizu: 2.0, ugao: 0.6 };
function paziNaDrugu() {
  if (S.drugaKrenula || !S.poz || !S.cilj) { return; }
  if (jeDruga(S.sala) || jeDruga(salaTacke(S.poz.z))) { ucitajDrugu(); return; }
  if (stediPodatke()) { return; }
  const vx = -S.poz.x, vz = POLA_Z + PROLAZ.zid / 2 - S.poz.z;
  const daljina = Math.hypot(vx, vz) || 1e-6;
  const dx = S.cilj.x - S.poz.x, dz = S.cilj.z - S.poz.z;
  const d = Math.hypot(dx, dz) || 1;
  const ka = (dx * vx + dz * vz) / (d * daljina);   /* kosinus ugla između pogleda i vrata */
  if (daljina < NAJAVA_DRUGE.blizu && ka > 0) { ucitajDrugu(); return; }
  const polH = Math.atan(Math.tan(VIDNO_POLJE * Math.PI / 360) * (S.kamera ? S.kamera.aspect : 1.6));
  if (ka > Math.cos(Math.min(Math.PI, polH + NAJAVA_DRUGE.ugao))) { ucitajDrugu(); }
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
  ODRAZ_PROZIRNOST, POD_PROZIRNOST, S, pamti, osvjeziKadar, TEKST
} = G;
const { SVJ, materijaliSvjetiljke, postaviSine, rasporediSvjetla, napraviReflektor } = G;   /* svjetla, scena.js */
const { rasporediTeksture } = G;   /* teksture, scena.js */

/* "70 × 60 cm" → { sirina: 0.70, visina: 0.60 } u METRIMA.
   Prava veličina, bez normalizacije i bez uvećanja. */
function mjereIzDimenzija(tekst, djelo) {
  const m = String(tekst || '').match(/(\d+(?:[.,]\d+)?)\s*[×xX*]\s*(\d+(?:[.,]\d+)?)/);
  if (!m && djelo && djelo.sirinaPx > 0 && djelo.visinaPx > 0) {
    /* Bez upisanih mjera: proporcije sa fotografije, duža strana 42 cm
       za crtež (A3), 55 cm za ulje (kao srednja platna serija) */
    const k = (djelo.kategorija === 'crtezi' ? 0.42 : 0.55) / Math.max(djelo.sirinaPx, djelo.visinaPx);
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

   VELIKA SALA (soba 1, ostala ulja). Djela se dijele na tri zida —
   lijevi, zadnji, desni — i to
   proporcionalno dužini zida (zadnji je 14 m, bočni 9 m).
   Redoslijed je redoslijed OBILASKA: lijevi zid od prednjeg ka
   zadnjem, pa zadnji zid lijevo-desno, pa desni zid od zadnjeg
   ka prednjem. Zato strelice ◀ ▶ vode kroz salu u krug, a ne
   skakuću po njoj.

   Trenutni data/radovi.json daje 14 ostalih ulja → 4 + 6 + 4.
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
 * @property {number} [soba]    2 = mala sala (iza prolaza)
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

/* CRTEŽI na prednjem zidu velike sale, lijevo i desno od prolaza — iza
   leđa posjetioca u pregledu velike sale, iznad klupa. Do pet po polovini
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

/* MALA SALA (soba 2, iza prolaza): istaknuta djela, po istom pravilu
   kao velika — tri zida, proporcionalno dužini (zadnji 9 m, bočni po
   6 m), metar i po od ugla. Sedam istaknutih → 2 + 3 + 2. Ista visina i
   normale kao u velikoj sali, pa za kameru, reflektor, legendu i lupu
   nema razlike u kojoj je sali djelo. Posjetilac ulazi kroz prolaz licem
   ka +z, pa mu je lijevo +x: obilazak ide lijevim zidom od vrata ka dnu,
   zadnjim slijeva nadesno, desnim od dna ka vratima — ▶ uvijek vodi na
   djelo desno. */
function rasporedMale(n) {
  const SW = PROLAZ.sala2.sirina, SD = PROLAZ.sala2.dubina;
  const z0 = POLA_Z + PROLAZ.zid;
  let nZadnji = Math.max(1, Math.round(n * SW / (SW + 2 * SD)));
  if (nZadnji > n) { nZadnji = n; }
  const ostatak = n - nZadnji;
  const nLijevi = Math.ceil(ostatak / 2);
  const nDesni = ostatak - nLijevi;
  function duz(korisno, i, broj) {
    return -korisno / 2 + korisno * (i + 0.5) / broj;
  }
  const korisnoZ = Math.max(0.1, SD - 2 * MARGINA_ZIDA);
  const korisnoX = Math.max(0.1, SW - 2 * MARGINA_ZIDA);
  /** @type {MjestoZida[]} */
  const mjesta = [];
  /* Lijevi zid (x = +SW/2), gleda ka -x. Od vrata ka dnu → z raste. */
  for (let i = 0; i < nLijevi; i++) {
    mjesta.push({ x: SW / 2, z: z0 + SD / 2 + duz(korisnoZ, i, nLijevi), rot: -Math.PI / 2 });
  }
  /* Zadnji zid (z = z0 + SD), gleda ka -z. Slijeva nadesno → x opada. */
  for (let i = 0; i < nZadnji; i++) {
    mjesta.push({ x: -duz(korisnoX, i, nZadnji), z: z0 + SD, rot: Math.PI });
  }
  /* Desni zid (x = -SW/2), gleda ka +x. Od dna ka vratima → z opada. */
  for (let i = 0; i < nDesni; i++) {
    mjesta.push({ x: -SW / 2, z: z0 + SD / 2 - duz(korisnoZ, i, nDesni), rot: Math.PI / 2 });
  }
  for (const m of mjesta) {
    m.y = VISINA_DJELA;
    m.nx = Math.sin(m.rot);
    m.nz = Math.cos(m.rot);
    m.soba = 2;
  }
  return mjesta;
}
/* Najviše ostalih ulja u velikoj sali (4 + 6 + 4 je 14; do 16 razmak
   još drži i legendu uz svako djelo) */
const MJESTA_VELIKE = 16;

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

  /* MALA SALA iza prolaza — u nju posjetilac ulazi prvo (vidi
     POCETNA_SALA). Isti pod, zidovi i šine kao velika sala; na zidovima
     vise istaknuta djela, a u sredini muzejska klupa. Svjetlo je JEDNO tačkasto + blaga emisija na
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

  /* Muzejska klupa u sredini male sale */
  napraviKlupu(matDrvo, 0, z0 + SD * 0.62, 0);
  /* I u velikoj sali dvije, uz zid lijevo i desno od prolaza — mjesto
     da se sjedne i gleda zadnji zid sale */
  [-1, 1].forEach(function (k) {
    napraviKlupu(matDrvo, k * (W / 2 + O + 2.1), Z - 0.42, 0);
  });

  /* Toplo opšte svjetlo male sale; djela imaju svoje reflektore */
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
  /* Redom obilaska (vidi ucitajPodatke u glavni.js): istaknuta u maloj
     sali, pa ostala ulja u velikoj, pa crteži na njenom zidu sa prolazom */
  const nMala = Math.min(djela.length, S.uMaloj || djela.length);
  const nVelika = Math.min(djela.length - nMala, S.uVelikoj || 0);
  const mjesta = rasporedMale(nMala)
    .concat(raspored(nVelika))
    .concat(rasporedCrteza(djela.slice(nMala + nVelika, nMala + nVelika + (S.crtezi || 0))));
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

  /* Muzejska legenda: kartica od 12 mm desno od rama (za posmatrača).
     indeks < 0: legenda nije meta za klik (legenda grupe crteža). */
  const postaviLegendu = function (platnoLeg, ponovo, mj, d, indeks, strana) {
    const s = strana || 1;            /* 1 = desno od rama, -1 = lijevo */
    const tx = mj.nz * s, tz = -mj.nx * s;   /* tangenta zida, desno za posmatrača */
    const odCentra = d.sirina / 2 + PREPUST_RAMA + LEGENDA.razmak + LEGENDA.sirina / 2;
    const texLeg = pamti(new T.CanvasTexture(platnoLeg));
    /* Fontovi sajta (EB Garamond, Inter) možda još nisu stigli —
       legenda se precrta kad stignu, da ne ostane u rezervnom fontu. */
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () {
        if (!S.radi) { return; }
        const novo = ponovo();
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
    S.scena.add(legenda);
    if (indeks >= 0) {
      legenda.userData.indeks = indeks;
      S.platna.push(legenda);    /* klik na legendu bira djelo */
    }
  };
  /** @type {Object<string, {mj: MjestoZida, d: {sirina: number, visina: number}, djelo: Object, n: number}>} */
  const grupeCrteza = {};

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
           ovdje, nego kroz red (`rasporediTeksture`, dio teksture): prvo sićušna
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

    /* --- MUZEJSKA LEGENDA desno od rama. Crteži nemaju svaki svoju:
           pet crteža na jednoj polovini zida je jedna postavka, kao jedno
           djelo, pa ima jednu legendu (postavlja se poslije petlje). --- */
    if (mj.grupa) {
      const g = grupeCrteza[mj.grupa] || (grupeCrteza[mj.grupa] = { mj: mj, d: d, djelo: djelo, n: 0 });
      g.n++;
      /* legenda ide uz crtež najbliži vratima, sa strane vrata */
      if (Math.abs(mj.x) < Math.abs(g.mj.x)) { g.mj = mj; g.d = d; g.djelo = djelo; }
    } else {
      postaviLegendu(napraviLegendu(djelo), function () { return napraviLegendu(djelo); }, mj, d, i);
    }

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
      svjetloJacina: svjetlo.intensity,
      svjetloUgao: svjetlo.angle,   /* crteži imaju širi zajednički snop */
      grupa: mj.grupa || null
    });
  });

  /* ZID CRTEŽA KAO JEDNO DJELO: pet crteža na polovini zida je ciklus na
     jednu temu, zamišljen kao jedan rad (zamisao Marka Dumnića). Svaki
     zid dobija svoje mjesto u S.mjesta (iza svih djela, bez platna):
     sredina zida, širina svih pet crteža, isti reflektor. Strelice, tura
     i mapa idu na zid; crtež se bira tek unutar zida (kretanje.js).
     Nazivi i godine ciklusa su u TEKST.zidovi (osnova.js): x > 0 je
     „Cetinjski dnevnik“ (crteži 1–5), x < 0 „Dnevnik iz ateljea“ (6–10).
     Jedna legenda po zidu, uz crtež najbliži vratima, sa strane vrata
     (obje legende su par oko prolaza) — i ona bira zid. */
  ['istok', 'zapad'].forEach(function (k, r) {
    const g = grupeCrteza[k];
    if (!g) { return; }
    /** @type {number[]} */
    const clanovi = [];
    S.mjesta.forEach(function (m, i) { if (m.grupa === k) { clanovi.push(i); } });
    let x0 = Infinity, x1 = -Infinity, visina = 0;
    clanovi.forEach(function (i) {
      const m = S.mjesta[i];
      x0 = Math.min(x0, m.x - m.sirina / 2);
      x1 = Math.max(x1, m.x + m.sirina / 2);
      visina = Math.max(visina, m.visina);
    });
    /* Legenda stoji uz vrata (kao par oko prolaza): desno od rama na
       zidu gdje su vrata desno, lijevo gdje su lijevo. I ona ulazi u kadar. */
    const strana = -Math.sign(g.mj.x) * Math.sign(g.mj.nz) || 1;
    const tl = g.mj.nz * strana, rub = g.d.sirina / 2 + PREPUST_RAMA + LEGENDA.razmak + LEGENDA.sirina;
    x0 = Math.min(x0, g.mj.x + tl * rub);
    x1 = Math.max(x1, g.mj.x + tl * rub);
    const prvi = S.mjesta[clanovi[0]];
    const indeks = S.mjesta.length;
    clanovi.forEach(function (i) { S.mjesta[i].zid = indeks; });
    const zidT = (TEKST.zidovi && TEKST.zidovi[k]) || { naziv: TEKST.crtezi + ' ' + (r === 0 ? 'I' : 'II'), godina: null };
    const naziv = zidT.naziv;
    S.mjesta.push({
      soba: prvi.soba,
      mesh: null,
      x: (x0 + x1) / 2, y: prvi.y, z: prvi.z,
      nx: prvi.nx, nz: prvi.nz,
      sirina: x1 - x0, visina: visina,
      djelo: /** @type {any} */ ({
        id: '', naziv: naziv, kategorija: 'crtezi', godina: zidT.godina,
        tehnika: g.djelo.tehnika || '', dimenzije: TEKST.brojCrteza(clanovi.length),
        opis: TEKST.ciklus(clanovi.length)
      }),
      svjetlo: prvi.svjetlo,
      svjetloPoz: prvi.svjetloPoz.clone(),
      svjetloJacina: prvi.svjetloJacina,
      svjetloUgao: prvi.svjetloUgao,
      grupa: k,
      clanovi: clanovi
    });
    const tekst = {
      naziv: naziv,
      godina: zidT.godina,
      tehnika: g.djelo.tehnika || '',
      dimenzije: TEKST.brojCrteza(g.n)
    };
    postaviLegendu(napraviLegendu(tekst), function () { return napraviLegendu(tekst); }, g.mj, g.d, indeks, strana);
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
   (bočno svjetlo ih pomjera, vidi postaviBocno, dio svjetla).
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
  MJESTA_VELIKE, napraviSobu, postaviDjela, zamrzniNepokretno
});
G.dijelovi.push('scena');

})();
