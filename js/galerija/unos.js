// @ts-check
/* =========================================================
   Virtuelna galerija — unos
   Tastatura, miš, dodir i štipanje, točkić i touchpad, odlazak
   fokusa iz galerije, vidljivost kartice pregledača, gubitak WebGL
   konteksta, i vezivanje / odvezivanje slušalaca na ulasku i izlasku.
   ========================================================= */

(function () {
'use strict';

/** @type {Galerija} */
const G = /** @type {any} */ (window).__galerija;
/* osnova.js */
const {
  POLA_Z, PRAG_KLIKA, ORBITA, PROLAZ, stediPodatke, korijen, el, S, smanjenoKretanje, svedi, salaTacke,
  osvjeziKadar, sada, poruka
} = G;
const { PORUKA_GRAFIKE } = G;   /* tekstovi.js */
const { zagrijDrugu, postaviBocno, osvjeziSjenke } = G;   /* svjetla.js */
const { ucitajDrugu } = G;   /* teksture.js */
const { uronjeno, postaviOpcije, opcijeOtvorene, dugmadOpcija, prebaciCisto } = G;   /* telefon.js */
const { pokaziSavjete, zatvoriSavjete, savjetiOtvoreni, panelOtvoren, natpis } = G;   /* ui.js */
const { postaviLupu, pomjeriLupu } = G;   /* izbliza.js */
/* kamera.js */
const {
  pozicijaPregleda, promijeniOrbitu, ugao, kreniKa, izaberi, naPregled, uSalu, prvoUSali, tackaKlika,
  mjeri, kreniTuru, pauzirajTuru, pogodak
} = G;

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
   je fokus u galeriji (canvas je fokusabilan, vidi tabindex u pokreni,
   glavni.js). */
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
  /* List „Opcije“ (telefon): Esc zatvara samo list, ne salu, i fokus se
     vraća na dugme „Opcije“; Tab kruži unutar lista. */
  if (opcijeOtvorene()) {
    if (e.key === 'Escape') {
      postaviOpcije(false);
      if (el.mob && el.mob.opcije) {
        try { el.mob.opcije.focus({ preventScroll: true }); } catch (g) { el.mob.opcije.focus(); }
      }
      e.preventDefault();
      return;
    }
    if (e.key === 'Tab') {
      const d = dugmadOpcija();
      if (d.length) {
        const i = d.indexOf(document.activeElement);
        const j = i < 0 ? 0 : (i + (e.shiftKey ? -1 : 1) + d.length) % d.length;
        d[j].focus();
        e.preventDefault();
      }
      return;
    }
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
    else { G.izadji(); }   /* glavni.js */
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
  } else if (!S.petlja && !S.kontekstIzgubljen) {
    S.sat = sada();
    S.fpsOd = S.sat;
    S.fpsBrojac = 0;
    /* Klizanje koje je zateklo pauzu bi inače "preskočilo" cijelu
       animaciju u jednom kadru — pomjeri se početak na sada. */
    if (S.anim) { S.anim.pocetak = S.sat; }
    osvjeziKadar();
    G.petlja();   /* glavni.js */
  }
}

/* GUBITAK WebGL KONTEKSTA: grafički drajver se resetovao, pregledač
   je oduzeo grafiku kartici u pozadini i sl. preventDefault() traži od
   pregledača da kontekst vrati; do tada petlja stoji, a posjetilac dobija
   kratku poruku (PORUKA_GRAFIKE, tekstovi.js) u postojećem obavještenju
   sale. Kad se vrati, three.js sam ponovo napravi svoje stanje (teksture
   i shaderi se ponovo šalju pri crtanju); ovdje se još traži nova mapa
   sjenke i ponovo zagrijava druga sala, a dok to traje gore su sva
   svjetla (vidi rasporediSvjetla u svjetla.js). */
function kontekstIzgubljen(e) {
  e.preventDefault();
  if (!S.radi) { return; }
  S.kontekstIzgubljen = true;
  S.svjetlaKrug = (S.svjetlaKrug || 0) + 1;   /* stari shaderi više ne postoje */
  if (S.petlja) { window.cancelAnimationFrame(S.petlja); S.petlja = 0; }
  poruka(PORUKA_GRAFIKE.izgubljena, 24 * 3600 * 1000);   /* stoji dok se grafika ne vrati */
}
function kontekstVracen() {
  if (!S.kontekstIzgubljen) { return; }
  S.kontekstIzgubljen = false;
  if (!S.radi || !S.render) { return; }
  S.svjetlaMalo = false; S.zagrijMalo = 0; S.zagrijEkran = 0;
  if (S.drugaZagrijana) {
    S.drugaZagrijana = false;
    const gen = S.gen;
    window.setTimeout(function () { if (S.gen === gen) { zagrijDrugu(); } }, 800);
  }
  S.zadnjaMatrica = null;
  osvjeziSjenke();
  poruka(PORUKA_GRAFIKE.vracena, 2600);
  if (!S.petlja && !document.hidden) {
    S.sat = sada();
    S.prosli = S.sat;
    if (S.anim) { S.anim.pocetak = S.sat; }
    G.petlja();   /* glavni.js */
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
  slusaj(c, 'webglcontextlost', kontekstIzgubljen);
  slusaj(c, 'webglcontextrestored', kontekstVracen);
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
    /* Namjera prije klika: druga sala kreće dok je miš na dugmetu */
    const najaviDrugu = function () { if (S.radi && S.sala !== 2 && !stediPodatke()) { ucitajDrugu(); } };
    slusaj(el.sala, 'pointerenter', najaviDrugu);
    slusaj(el.sala, 'focus', najaviDrugu);
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

Object.assign(G, {
  vezi, odvezi
});
G.dijelovi.push('unos');

})();
