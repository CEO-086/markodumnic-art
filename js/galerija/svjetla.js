/* =========================================================
   Virtuelna galerija — svjetla
   Svjetiljke i šine (vidljiva tijela reflektora), reflektor nad
   djelom, zagrijavanje druge sale, gašenje svjetala van kadra i
   prevođenje varijanti shadera za to, bočno svjetlo i sjenka.
   ========================================================= */

(function () {
'use strict';

const G = window.__galerija;
/* osnova.js */
const {
  BOJA, SVJETLO_TOPLO, POLA_X, POLA_Z, VISINA_DJELA, UGAO_UPADA, VISINA_SINE, DALJINA_SVJETLA,
  UGAO_SNOPA, ODMAK_OD_ZIDA, UGAO_BOCNO, OSVJETLJENOST, CRTEZI_SVJETLO, PROLAZ, TELEFON, el, S,
  kameraIde, pamti, graniceSale, osvjeziKadar
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

/* ZAGRIJAVANJE DRUGE SALE: dok je posjetilac u prvoj, drugu sala
   jednom iscrta u sićušnu nevidljivu sliku (64 × 64), iz sredine
   druge sale ka svakom zidu. Tako se svi shaderi i teksture njenih
   djela, legendi i odraza pripreme unaprijed, a ne u kadru u kom
   kamera prvi put vidi drugu salu — to je bio trzaj usred klizanja. */
function zagrijDrugu() {
  if (!S.render || !S.tri || !S.scena || S.drugaZagrijana) { return; }
  /* ne dok se kamera kreće (klizanje, točkić, zamah, prevlačenje), ne dok
     teksture još idu na GPU (ili čekaju da se nacrtaju, vidi kadMiruje u
     teksture.js) i
     ne prije nego što platna druge sale dobiju sićušne slike (mapa
     mijenja shader) */
  if (kameraIde() || (S.kadrovi && S.kadrovi.length) || S.crtanjaNaCekanju > 0 || !maleDrugeStigle()) { window.setTimeout(zagrijDrugu, 400); return; }
  S.drugaZagrijana = true;
  const T = S.tri;
  const SW = PROLAZ.sala2.sirina, SD = PROLAZ.sala2.dubina;
  const z0 = POLA_Z + PROLAZ.zid;
  const meta = new T.WebGLRenderTarget(64, 64);
  const kam = new T.PerspectiveCamera(100, 1, 0.1, 40);
  kam.position.set(0, 1.6, z0 + SD * 0.5);
  const stara = S.render.getRenderTarget();
  /* Ovdje su upaljena SVA svjetla, kao pri prvom zagrijavanju: kad se
     druga sala zagrije ponovo (prave teksture), gašenje svjetala van
     kadra je već uključeno, pa bi ova sićušna slika tražila nove
     varijante shadera (6/12 svjetala, bez tone mappinga) — 11 programa
     prevedenih usred mirovanja u drugoj sali, samo za nju. */
  S.svjetlaPrisilno = 'sva';
  try {
    [[0, z0 + SD], [SW, z0 + SD * 0.5], [-SW, z0 + SD * 0.5], [0, z0]].forEach(function (t) {
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
     slika prve sale, u istom kadru, pa posjetilac to ne vidi. */
  if (!TELEFON) { S.zagrijEkran = 4; }
}

function maleDrugeStigle() {
  return S.teksture.every(function (m) { return m.soba !== 2 || m.nivo >= 1 || m.malaPala; });
}

/* Jedan pravac po kadru (S.zagrijEkran broji 4 → 1), da nijedan kadar
   u prvoj sali ne nosi četiri dodatna crtanja odjednom. */
function zagrijNaEkranu(korak, malo) {   /* malo: broj svjetala (SVJETLA_U_KADRU) */
  const T = S.tri;
  const SW = PROLAZ.sala2.sirina, SD = PROLAZ.sala2.dubina;
  const z0 = POLA_Z + PROLAZ.zid;
  const kam = new T.PerspectiveCamera(100, S.kamera.aspect, 0.1, 40);
  let pravci = [[0, z0 + SD], [SW, z0 + SD * 0.5], [-SW, z0 + SD * 0.5], [0, z0]];
  kam.position.set(0, 1.6, z0 + SD * 0.5);
  /* Varijanta sa manje svjetala (vidi rasporediSvjetla): koraci 8 → 5
     su iz sredine prve sale ka njena četiri zida, 4 → 1 isto kao gore. */
  if (malo && korak > 4) {
    pravci = [[0, -POLA_Z], [POLA_X, 0], [-POLA_X, 0], [0, POLA_Z]];
    kam.position.set(0, 1.6, 0);
    korak -= 4;
  }
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
   (dopunjeno reflektorima van kadra, koji ionako daju nulu): prva sala
   treba do 5, druga do 9, pogled kroz vrata sva. Sve varijante se
   prevedu i zagriju unaprijed (zagrijDrugu → prevediMalo); dok to nije
   gotovo, sva svjetla su upaljena, kao i prije. Reflektor koji baca
   sjenku je uvijek upaljen (i njegova sjenka mijenja shader). */
const SVJETLA_U_KADRU = [6, 12];
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

/* Reflektor na šini nad djelom (vidi postaviDjela u scena.js) */
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
      svjetlo.angle = Math.min(1.1, Math.atan((mj.raspon / 2 + CRTEZI_SVJETLO.preko) / daljina));
      svjetlo.penumbra = CRTEZI_SVJETLO.penumbra;
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
