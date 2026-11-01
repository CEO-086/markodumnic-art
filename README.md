# markodumnic.art

Statički sajt slikara Marka Dumnića — crnogorski (korijen) i engleski (`en/`).
Bez build koraka: HTML, CSS i JavaScript se služe takvi kakvi jesu.

- Objava: Vercel (uvezen iz ovog repozitorijuma, preset „Other“, bez build komande). Uputstvo: `alati/VERCEL.md`.
- Pomoćne skripte u `alati/` (pokreću se iz korijena):
  - `python3 alati/jezik.py` — zastavice/prekidač jezika, hreflang, canonical
  - `python3 alati/izvorne.py` — web JPEG-ovi radova (2400 i 1400 px) iz originala u `izvorne-fotografije/`
  - `python3 alati/slike.py` — AVIF/WebP veličine slika radova
  - `python3 alati/teksture.py` — teksture za 3D galeriju
  - `python3 alati/fontovi.py` — fontovi sa sajta (podskup znakova)
- `izvorne-fotografije/` — spisak originalnih fotografija svih 13 radova (`izvorne-fotografije/README.md`); same fotografije nijesu u repou, nego lokalno. To je samo baza: sajt ih ne učitava, nego verzije koje od njih prave `alati/izvorne.py`, `alati/slike.py` i `alati/teksture.py`, tim redom.
- 3D galerija: klasične skripte u `js/galerija/` (redoslijed i dogovor u zaglavlju `js/galerija/osnova.js`). Poslije izmjene u `css/` ili `js/`: `python3 alati/verzije.py`. Provjere: `node testovi/galerija/provjeri.js` (dogovor dijelova, verzije, ESLint, tsc) i `node testovi/galerija/smoke.js` (Playwright); alati se instaliraju u `testovi/galerija/` (`npm install` tamo, nikad u korijenu — Vercel bi pokušao build).
- `alati/`, `izvorne-fotografije/`, `testovi/`, `eslint.config.js`, `_headers` i ovaj README se ne objavljuju na sajtu (`.vercelignore`).
