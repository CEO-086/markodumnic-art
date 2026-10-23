# splat/ — snimci za prikazivač (splat.html, en/splat.html)

Stranica prvo pročita samo `splat/index.json` i traži jedino fajl koji je
tu upisan. Dok je spisak prazan, prikazuje se pošteno prazno stanje, bez
ijednog daljeg zahtjeva.

## Kako se dodaje snimak

1. Fajl se snimi pod id-em djela i stavi ovdje, npr. `splat/aria-di-torino.spz`.
   Formati: `.spz` (preporučeno, najmanji), `.ply`, `.splat`, `.ksplat`.
   Ime: samo mala slova, cifre i crtice. Ciljati ispod 15–30 MB.
2. Upiše se u `splat/index.json`:

   ```json
   {
     "snimci": [
       { "djelo": "aria-di-torino", "fajl": "aria-di-torino.spz" }
     ]
   }
   ```

   `djelo` je id iz `?djelo=<id>` i mora postojati u spisku `DJELA` u
   `js/splat.js` (sada: `aria-di-torino`, `havanac-kastro`,
   `mrtva-priroda-sa-vazom`). Isti unos važi za obje jezičke verzije.

## Keš

`/splat/*` se kešira jedan dan (vercel.json, _headers), a `index.json` je
`no-cache`. Zato se snimak koji se mijenja objavljuje pod NOVIM imenom
(npr. `aria-di-torino-2.spz`) i to novo ime se upiše u `index.json`.

---

English: the page reads only `splat/index.json` and requests just the file
listed there for `?djelo=<id>`. To add a capture, drop the file here and add
`{ "djelo": "<id>", "fajl": "<id>.spz" }` to `snimci`. Replacing a capture?
Use a new file name — `/splat/*` is cached for a day.
