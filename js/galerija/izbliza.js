/* =========================================================
   Virtuelna galerija — Izbliza i Lupa
   Izbliza: djelo preko cijelog ekrana, iz fotografije pune veličine.
   Lupa: krug koji u sali uvećava dio djela ispod miša ili prsta.
   ========================================================= */

(function () {
'use strict';

const G = window.__galerija;
const { LUPA, MAX_TEKSTURA, korijen, el, S } = G;   /* osnova.js */
const { TEKST } = G;   /* tekstovi.js */
const { izvorDjela, izvorVelike, rasterizuj } = G;   /* teksture.js */
const { panelOtvoren } = G;   /* ui.js */

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
  /* Prvo manja fotografija — ista kao tekstura na zidu, pa je već u
     kešu (JPG samo ako ona ne prođe) — pa velika kad stigne (AVIF, a
     JPG ako AVIF ne prođe). */
  const rezerva = djelo.slika || djelo.slikaVelika;
  img.onerror = function () { img.onerror = null; if (img.getAttribute('src') !== rezerva) { img.src = rezerva; } };
  img.src = izvorDjela(djelo) || rezerva;
  if (djelo.slikaVelika && djelo.slikaVelika !== djelo.slika) {
    const velika = new Image();
    velika.onload = function () { if (S.izbliza && S.izbliza.el === o) { img.onerror = null; img.src = velika.src; } };
    velika.onerror = function () {
      velika.onerror = null;
      if (velika.getAttribute('src') !== djelo.slikaVelika) { velika.src = djelo.slikaVelika; }
    };
    velika.src = izvorVelike(djelo);
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
      const jpg = djelo.slikaVelika || djelo.slika;
      const prvi = izvorVelike(djelo);
      rasterizuj(prvi, maxStr).catch(function (g) {
        if (prvi === jpg) { throw g; }
        return rasterizuj(jpg, maxStr);   /* AVIF nije prošao — JPG */
      }).then(function (c) {
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

Object.assign(G, {
  otvoriIzbliza, zatvoriIzbliza, postaviLupu, pomjeriLupu, osvjeziLupu
});
G.dijelovi.push('izbliza');

})();
