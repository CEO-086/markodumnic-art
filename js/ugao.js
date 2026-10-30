/* Proba uglova gledanja — jedno platno, pravi WebGL, Three.js r186 lokalno.
 *
 * Čemu služi: da se prije snimanja vidi šta donosi reljef platna. Isto djelo
 * se prikazuje dvaput — kao ravna slika (kako sala radi sada) i sa normal
 * mapom (kako bi radila sa snimljenim podacima). Kad se mijenja ugao ili
 * svjetlo, razlika se vidi odmah.
 *
 * Djelo: „Aria di Torino“ (2024, ulje na platnu, 60 × 50 cm).
 * VAŽNO: reljef na ovoj probi je IZVEDEN iz fotografije djela, nije izmjeren
 * sa platna. Služi da pokaže mehanizam, ne konačni kvalitet.
 */
'use strict';

const OKNO   = document.getElementById('okno');
const STANJE = document.getElementById('stanje');
// Od korijena sajta (adresa ovog modula, js/ → ../), ne od stranice —
// isti modul služi i en/ugao.html i it/ugao.html.
const PUT    = new URL('../img/proba/aria-di-torino-', import.meta.url).href;
const EN     = document.documentElement.lang === 'en';
const IT     = document.documentElement.lang === 'it';

const TEKST = IT ? {
  reljef: 'Rilievo',
  fajl: 'La pagina è stata aperta come file locale. Avviate ./pokreni.sh e aprite http://localhost:8000/it/ugao.html',
  webgl: 'Questo browser non supporta WebGL, quindi la tela non può essere mostrata nello spazio.',
  ucitavanje: 'Caricamento…',
  three: 'Impossibile caricare Three.js da vendor/three/. Verificate che i file siano presenti.',
  spremno: 'Trascinate con il mouse, usate le frecce della tastiera o i pulsanti Ruota a sinistra / Ruota a destra per cambiare l\'angolo di visione.',
} : EN ? {
  reljef: 'Relief',
  fajl: 'The page was opened as a local file. Run ./pokreni.sh and open http://localhost:8000/en/ugao.html',
  webgl: 'This browser does not offer WebGL, so the canvas cannot be shown in space.',
  ucitavanje: 'Loading…',
  three: 'Three.js could not be loaded from vendor/three/. Check that the files are there.',
  spremno: 'Drag with the mouse, use the arrow keys, or the Turn left / Turn right buttons to change the viewing angle.',
} : {
  reljef: 'Reljef',
  fajl: 'Stranica je otvorena kao lokalni fajl. Pokreni ./pokreni.sh pa otvori http://localhost:8000/ugao.html',
  webgl: 'Ovaj pregledač ne nudi WebGL, pa se platno ne može prikazati u prostoru.',
  ucitavanje: 'Učitavanje…',
  three: 'Three.js se nije mogao učitati iz vendor/three/. Provjeri da fajlovi postoje.',
  spremno: 'Prevlači mišem, koristi strelice na tastaturi ili dugmad Okreni lijevo / Okreni desno da promijeniš ugao gledanja.',
};

// Boje preuzete iz css/tokens.css. Three ne čita CSS promjenljive, pa se
// ovdje drže kao hex i ručno se ažuriraju ako se tokeni promijene.
const BOJA = {
  soba:   0x15120E,  // --paper-ink
  zid:    0x2A241C,  // tamnija varijanta --paper-ink, zid iza platna
  ram:    0x1E1A15,  // --ink
  svjetlo:0xFFD9A8,  // topli reflektor, ~3100 K
};

/* Jačine reljefa. Brojevi odgovaraju procijenjenoj debljini paste:
 * blag ≈ 0,3 mm (običan potez), srednji ≈ 1 mm (prosječna pasta sa tragom
 * špahtle), jak ≈ 3 mm (teški impasto).
 * NAPOMENA: ovo je kalibracija za IZVEDEN reljef. Kod izmjerenog podatka iz
 * fotometrijskog stereja normalScale je po definiciji 1.0 — mapa već nosi
 * stvarne nagibe i ne smije se dotjerivati. */
const JACINE = IT ? [
  { ime: 'disattivato', skala: 0,   opis: 'Un\'immagine piatta — come funziona oggi la sala espositiva.' },
  { ime: 'lieve',       skala: 0.8, opis: 'Circa 0,3 mm — una normale pennellata.' },
  { ime: 'medio',       skala: 1.6, opis: 'Circa 1 mm — un impasto medio, con segni di spatola.' },
  { ime: 'forte',       skala: 3.0, opis: 'Circa 3 mm — un impasto denso e corposo.' },
] : EN ? [
  { ime: 'off',       skala: 0,   opis: 'A flat picture — how the exhibition room works now.' },
  { ime: 'low',       skala: 0.8, opis: 'About 0.3 mm — an ordinary brushstroke.' },
  { ime: 'medium',    skala: 1.6, opis: 'About 1 mm — average paint with palette-knife marks.' },
  { ime: 'high',      skala: 3.0, opis: 'About 3 mm — heavy impasto.' },
] : [
  { ime: 'isključen', skala: 0,   opis: 'Ravna slika — kako sala radi sada.' },
  { ime: 'blag',      skala: 0.8, opis: 'Oko 0,3 mm — običan potez kistom.' },
  { ime: 'srednji',   skala: 1.6, opis: 'Oko 1 mm — prosječna pasta sa tragom špahtle.' },
  { ime: 'jak',       skala: 3.0, opis: 'Oko 3 mm — teški impasto.' },
];

const stanje = {
  jacina: 2,          // srednji, radna pretpostavka za ova platna
  reljef: true,
  kruzi:  false,
  ugaoH:  0,        // zakret kamere lijevo-desno (radijani)
  ugaoV:  0,        // gore-dolje
  svjetloUgao: -0.6,
};

let THREE, renderer, scena, kamera, platno, reflektor, petlja = null, unisten = false;

function javi(poruka, greska) {
  STANJE.textContent = poruka;
  STANJE.classList.toggle('je-greska', Boolean(greska));
}

/* ---------- pokretanje ---------- */

async function pokreni() {
  if (location.protocol === 'file:') {
    javi(TEKST.fajl, true);
    return;
  }
  const proba = document.createElement('canvas');
  if (!(proba.getContext('webgl2') || proba.getContext('webgl'))) {
    javi(TEKST.webgl, true);
    return;
  }

  javi(TEKST.ucitavanje);
  try {
    THREE = await import('../vendor/three/three.module.min.js');
  } catch (e) {
    javi(TEKST.three, true);
    return;
  }

  await izgradi();
  javi(TEKST.spremno);
}

async function izgradi() {
  const sirina = OKNO.clientWidth, visina = OKNO.clientHeight;

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(sirina, visina);
  // Bez ovoga slike izgledaju isprano — ovo je najjeftiniji skok kvaliteta.
  renderer.outputColorSpace   = THREE.SRGBColorSpace;
  renderer.toneMapping        = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.shadowMap.enabled  = true;
  renderer.shadowMap.type     = THREE.PCFShadowMap;   // PCFSoftShadowMap je uklonjen u r186
  OKNO.appendChild(renderer.domElement);

  scena = new THREE.Scene();
  scena.background = new THREE.Color(BOJA.soba);

  kamera = new THREE.PerspectiveCamera(38, sirina / visina, 0.1, 50);
  kamera.position.set(0, 0, 1.45);

  // Zid iza platna, da se vidi da predmet stoji u prostoru a ne lebdi.
  const zid = new THREE.Mesh(
    new THREE.PlaneGeometry(6, 4),
    new THREE.MeshStandardMaterial({ color: BOJA.zid, roughness: 0.95 })
  );
  // Platno u galeriji visi par centimetara od zida, ne pola metra — zato je
  // i sjenka uska. Ovo je bio uzrok ogromne crne mrlje.
  zid.position.z = -0.075;
  zid.receiveShadow = true;
  scena.add(zid);

  // Teksture. Samo albedo ide u sRGB; normal i hrapavost su podaci, ne boja.
  const ucitaj = new THREE.TextureLoader();
  const [boja, normala, hrapavost] = await Promise.all(
    ['boja.jpg', 'normal.jpg', 'hrapavost.jpg'].map(ime =>
      new Promise(res => ucitaj.load(PUT + ime, res, undefined, () => res(null))))
  );
  if (boja) boja.colorSpace = THREE.SRGBColorSpace;

  // Platno je kutija, ne ravna ploha — bočna ivica se vidi pod uglom.
  const S = 0.50, V = 0.60, D = 0.028;   // 50 × 60 cm (uspravno), 2.8 cm debljine
  const lice = new THREE.MeshStandardMaterial({
    map: boja,
    normalMap: normala || null,
    roughnessMap: hrapavost || null,
    roughness: 0.72,
    metalness: 0.0,
  });
  if (lice.normalMap) {
    const s = JACINE[stanje.jacina].skala;
    lice.normalScale = new THREE.Vector2(s, s);
  }
  const bok = new THREE.MeshStandardMaterial({ color: 0x6B6052, roughness: 0.9 });

  platno = new THREE.Mesh(new THREE.BoxGeometry(S, V, D),
    [bok, bok, bok, bok, lice, bok]);   // +Z strana nosi sliku
  platno.castShadow = true;
  scena.add(platno);

  // Ram je ŠUPALJ — četiri letve oko platna. Puna kutija bi zaklonila sliku.
  const L = 0.03, DR = 0.040;                    // širina letve, dubina rama
  const gradja = new THREE.MeshStandardMaterial({ color: BOJA.ram, roughness: 0.5 });
  const ram = new THREE.Group();
  const letva = (w, h, x, y) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, DR), gradja);
    m.position.set(x, y, 0);
    m.castShadow = true;
    return m;
  };
  ram.add(letva(S + 2 * L, L, 0,  V / 2 + L / 2));   // gornja
  ram.add(letva(S + 2 * L, L, 0, -V / 2 - L / 2));   // donja
  ram.add(letva(L, V, -S / 2 - L / 2, 0));           // lijeva
  ram.add(letva(L, V,  S / 2 + L / 2, 0));           // desna
  scena.add(ram);

  // Jedan reflektor odozgo-sprijeda, upadni ugao oko 30° — muzejski standard.
  // Širok snop i jaka penumbra, da svjetlo ne pravi oštar krug po zidu.
  reflektor = new THREE.SpotLight(BOJA.svjetlo, 22, 10, Math.PI / 4.2, 0.9, 1.3);
  reflektor.castShadow = true;
  reflektor.shadow.mapSize.set(2048, 2048);
  reflektor.shadow.radius = 8;        // mekša ivica sjenke
  reflektor.shadow.bias = -0.0008;
  scena.add(reflektor, reflektor.target);
  // Ambijent podignut: bez njega sjenka na zidu ispadne crna rupa.
  scena.add(new THREE.AmbientLight(0x8A7D68, 0.85));

  pomjeriSvjetlo();
  vezi();
  crtaj();
}

/* ---------- svjetlo i kamera ---------- */

function pomjeriSvjetlo() {
  const u = stanje.svjetloUgao;
  // 30° iznad ravni platna, obilazi lijevo-desno.
  const r = 1.6, visina = r * Math.tan(Math.PI / 6);
  reflektor.position.set(Math.sin(u) * r, visina, Math.cos(u) * r);
  reflektor.target.position.set(0, 0, 0);
  reflektor.target.updateMatrixWorld();
}

function postaviKameru() {
  const r = 1.45;
  kamera.position.set(
    Math.sin(stanje.ugaoH) * r,
    Math.sin(stanje.ugaoV) * r * 0.6,
    Math.cos(stanje.ugaoH) * r
  );
  kamera.lookAt(0, 0, 0);
}

const MANJE_KRETANJA = window.matchMedia('(prefers-reduced-motion: reduce)');
let korakSvjetla = 0;

function crtaj() {
  if (unisten) return;
  petlja = requestAnimationFrame(crtaj);
  if (stanje.kruzi) {
    // Uz smanjeno kretanje svjetlo ne klizi nego preskače u koracima.
    if (MANJE_KRETANJA.matches) {
      if (++korakSvjetla % 90 === 0) { stanje.svjetloUgao += 0.9; pomjeriSvjetlo(); }
    } else {
      stanje.svjetloUgao += 0.012;
      pomjeriSvjetlo();
    }
  }
  postaviKameru();
  renderer.render(scena, kamera);
}

/* ---------- upravljanje ---------- */

function vezi() {
  let vuce = false, x0 = 0, y0 = 0, h0 = 0, v0 = 0;

  const pocni = e => {
    vuce = true;
    const t = e.touches ? e.touches[0] : e;
    x0 = t.clientX; y0 = t.clientY; h0 = stanje.ugaoH; v0 = stanje.ugaoV;
  };
  const vuci = e => {
    if (!vuce) return;
    const t = e.touches ? e.touches[0] : e;
    stanje.ugaoH = Math.max(-1.0, Math.min(1.0, h0 + (t.clientX - x0) * -0.005));
    stanje.ugaoV = Math.max(-0.5, Math.min(0.5, v0 + (t.clientY - y0) * 0.004));
    if (e.cancelable) e.preventDefault();
  };
  const stani = () => { vuce = false; };

  OKNO.addEventListener('pointerdown', pocni);
  window.addEventListener('pointermove', vuci, { passive: false });
  window.addEventListener('pointerup', stani);

  // Isto bez prevlačenja: tastatura (okno je role="application", pa
  // čitač ekrana propušta strelice) i dva dugmeta za jedan dodir/klik
  // (WCAG 2.5.7). Smjer prati prevlačenje: strelica lijevo = prevuci
  // lijevo, strelica gore = prevuci gore. Granice su iste kao kod miša.
  const zaokruzi = x => Math.round(x * 100) / 100;
  const okreni = (dh, dv) => {
    stanje.ugaoH = zaokruzi(Math.max(-1.0, Math.min(1.0, stanje.ugaoH + dh)));
    stanje.ugaoV = zaokruzi(Math.max(-0.5, Math.min(0.5, stanje.ugaoV + dv)));
  };
  const KORACI = {
    ArrowLeft: [0.1, 0], ArrowRight: [-0.1, 0],
    ArrowUp: [0, -0.05], ArrowDown: [0, 0.05],
  };
  OKNO.addEventListener('keydown', e => {
    const k = KORACI[e.key];
    if (!k || e.altKey || e.ctrlKey || e.metaKey) return;
    e.preventDefault();
    okreni(k[0], k[1]);
  });
  document.getElementById('dugme-lijevo').addEventListener('click', () => okreni(0.1, 0));
  document.getElementById('dugme-desno').addEventListener('click', () => okreni(-0.1, 0));

  // Dugme kruži kroz četiri jačine, da se može uporediti sa stvarnim platnom.
  // Četiri stanja nijesu uključeno/isključeno, pa je ovo obično dugme (bez
  // aria-pressed): natpis kaže trenutnu jačinu, a #stanje je izgovori.
  document.getElementById('dugme-reljef').addEventListener('click', e => {
    stanje.jacina = (stanje.jacina + 1) % JACINE.length;
    const j = JACINE[stanje.jacina];
    const m = platno.material[4];
    m.normalScale.set(j.skala, j.skala);
    m.needsUpdate = true;
    e.currentTarget.textContent = `${TEKST.reljef}: ${j.ime}`;
    javi(`${TEKST.reljef}: ${j.ime}. ${j.opis}`);
  });

  // Prekidač: natpis ostaje isti, stanje nosi samo aria-pressed.
  document.getElementById('dugme-svjetlo').addEventListener('click', e => {
    stanje.kruzi = !stanje.kruzi;
    e.currentTarget.setAttribute('aria-pressed', String(stanje.kruzi));
  });

  document.getElementById('dugme-reset').addEventListener('click', () => {
    stanje.ugaoH = stanje.ugaoV = 0;
    stanje.svjetloUgao = -0.6;
    pomjeriSvjetlo();
  });

  window.addEventListener('resize', () => {
    if (!renderer) return;
    const s = OKNO.clientWidth, v = OKNO.clientHeight;
    kamera.aspect = s / v;
    kamera.updateProjectionMatrix();
    renderer.setSize(s, v);
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && petlja) { cancelAnimationFrame(petlja); petlja = null; }
    else if (!document.hidden && !petlja && !unisten) crtaj();
  });
}

// Zapamti normal mapu da se prekidač može vraćati.
function zapamtiNormalu() {
  if (platno) platno.material[4].userData.normala = platno.material[4].normalMap;
}

document.addEventListener('DOMContentLoaded', () => {
  pokreni().then(zapamtiNormalu);
});
