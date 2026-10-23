# markodumnic.art

Statički sajt slikara Marka Dumnića — crnogorski (korijen) i engleski (`en/`).
Bez build koraka: HTML, CSS i JavaScript se služe takvi kakvi jesu.

- Objava: Vercel (uvezen iz ovog repozitorijuma, preset „Other“, bez build komande). Uputstvo: `alati/VERCEL.md`.
- Pomoćne skripte u `alati/` (pokreću se iz korijena):
  - `python3 alati/jezik.py` — zastavice/prekidač jezika, hreflang, canonical
  - `python3 alati/slike.py` — AVIF/WebP veličine slika radova
  - `python3 alati/teksture.py` — teksture za 3D galeriju
  - `python3 alati/fontovi.py` — fontovi sa sajta (podskup znakova)
- `izvorne-fotografije/` — originalne fotografije svih 13 radova u punoj rezoluciji (spisak u `izvorne-fotografije/README.md`).
- `alati/`, `izvorne-fotografije/`, `_headers` i ovaj README se ne objavljuju na sajtu (`.vercelignore`).
