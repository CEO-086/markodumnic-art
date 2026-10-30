# Objavljivanje na Vercelu (GitHub → Vercel)

Plan: sajt ide u GitHub repozitorijum, Vercel uvozi taj repozitorijum i
objavljuje svaku izmjenu na grani `main` sam. Ništa od ovoga još nije urađeno.

Sajt je čist statički HTML: bez build koraka, bez npm-a. Sva pravila za
produkciju stoje u `vercel.json` (cleanUrls, trailingSlash, CSP i ostala
zaglavlja, keširanje). `_headers` je za Cloudflare Pages i Vercel ga ne čita.

---

## 0. Prije svega: plan i „komercijalna upotreba“

Besplatni **Hobby** plan je po Vercelovim pravilima *samo za ličnu,
nekomercijalnu upotrebu*. Kao komercijalno navode, između ostalog,
„oglašavanje prodaje proizvoda ili usluge“. Donacije se ne računaju.
Izvor: <https://vercel.com/docs/limits/fair-use-guidelines#commercial-usage>.

Sajt prikazuje slike i poziva na upit, a `kontakt.html` u opisu izričito
pominje **„kupovina radova“**. To je najvjerovatnije komercijalna upotreba.
Postoje tri poštena izbora:

1. **Pro plan** (20 $ mjesečno po korisniku): čisto rješenje.
2. Pitati Vercel podršku (<https://vercel.com/help>) da li portfolio sa
   kontaktom za upite smije ostati na Hobby planu, i sačuvati njihov odgovor.
3. Ostati besplatan na **Cloudflare Pages** (dozvoljava komercijalnu upotrebu).
   Sajt je za to već spreman, jer `_headers` sadrži ista pravila.

Ograničenja Hobby plana, za orijentaciju (<https://vercel.com/docs/plans/hobby>,
<https://vercel.com/docs/limits>):

| Stavka | Hobby |
|---|---|
| Prenos podataka (Fast Data Transfer) | 100 GB mjesečno |
| Zahtjevi (CDN Requests) | 1.000.000 mjesečno |
| Deploya dnevno | 100 |
| Upload preko CLI-ja | najviše 100 MB izvora, najviše 15.000 fajlova |
| Domena po projektu | 50 |

Sajt sada ima oko 93 MB i oko 610 fajlova. Kod uvoza iz GitHuba ne važi
granica od 100 MB za CLI, ali kod `vercel deploy` sa računara sajt je blizu
te granice. Kada se 100 GB potroši, Hobby **pauzira** projekat do isteka
30 dana. Nema dodatne naplate.

---

## 1. GitHub repozitorijum

1. Na <https://github.com> otvori nalog (ili koristi postojeći) i napravi
   **New repository**, npr. `markodumnic-art`, **bez** README-a i licence
   (prazan repozitorijum).
2. **Javni ili privatni?** Na Hobby planu radi i privatni repozitorijum, ali
   **samo na ličnom GitHub nalogu**. Privatni repo u GitHub *organizaciji*
   Hobby ne može da objavi. Na Hobby planu commitove mora praviti vlasnik
   Vercel naloga. Preporuka je privatni repo na ličnom nalogu
   (<https://vercel.com/docs/git#deploying-private-git-repositories>).
3. U korijenu sajta (`sajt/`) dodaj dva fajla:

   `.gitignore` (šta ne ide na GitHub):
   ```
   __pycache__/
   *.pyc
   .DS_Store
   Thumbs.db
   .vercel/
   node_modules/
   ```

   `.vercelignore` (šta ide na GitHub, ali **ne** na javni sajt):
   ```
   alati/
   _headers
   splat/README.md
   ```
   `alati/` (Python skripte i ovo uputstvo) je koristan u repozitorijumu, ali
   ne treba da bude javno dostupan na `markodumnic.art/alati/...`.

   **Ne brisati `img/proba/`**: koristi je `js/ugao.js`. Najveći fajl ima
   oko 3 MB, a GitHub odbija fajlove veće od 100 MB, pa tu nema problema.
4. Postavljanje (iz fascikle `sajt/`):
   ```
   git init -b main
   git add .
   git commit -m "Sajt Marko Dumnić"
   git remote add origin https://github.com/<nalog>/markodumnic-art.git
   git push -u origin main
   ```
   Prije `git add` provjeri sa `git status` da ne ide ništa privatno.

## 2. Vercel projekat

1. Na <https://vercel.com/signup> otvori nalog **preko GitHuba**
   (Continue with GitHub). Tako se commitovi povezuju sa vlasnikom.
2. **Add New → Project → Import** izaberi repozitorijum `markodumnic-art`
   (ako ga nema na spisku: *Adjust GitHub App Permissions* i dozvoli taj repo).
3. Podešavanja pri uvozu:
   - **Framework Preset: Other**
   - **Root Directory:** `./` (korijen repozitorijuma, tu su `index.html` i `vercel.json`)
   - **Build Command:** prazno (ili isključi *Override* i ostavi prazno)
   - **Output Directory:** prazno / `.`. Vercel tada služi korijen.
   - **Install Command:** prazno
   - Environment Variables: nijedna
4. **Deploy**. Dobija se adresa oblika `markodumnic-art.vercel.app`.
   Odsad svaki `git push` na `main` pravi novu produkcijsku verziju, a svaka
   druga grana ili pull request daje pregled (preview) na posebnoj adresi
   (<https://vercel.com/docs/git>).

Bez GitHuba postoje i dvije druge mogućnosti: prevlačenje fascikle na
<https://vercel.com/drop> ili `npx vercel` iz fascikle. Uz njih nema
automatskog objavljivanja na `push`.

## 3. Domen markodumnic.art i www

1. U projektu otvori **Settings → Domains → Add**, upiši `markodumnic.art`
   i prihvati prijedlog da se doda i `www.markodumnic.art` sa
   **preusmjerenjem www → markodumnic.art** (308). Kanonske adrese, sitemap i
   hreflang na sajtu su bez `www`.
2. Kod registra domena (gdje je `.art` kupljen), u DNS zapisima:

   | Tip | Ime | Vrijednost |
   |---|---|---|
   | A | `@` | IP sa kartice domena u Vercelu (najčešće `76.76.21.21`; noviji projekti mogu dobiti drugi, npr. `216.198.79.1`) |
   | CNAME | `www` | vrijednost sa kartice domena (oblika `xxxxxxxx.vercel-dns-0xx.com`) |

   - Uvijek prepiši **tačne vrijednosti koje Vercel prikaže**. Za `www` je
     cilj sada vezan za projekat.
   - **Obriši** stare A/AAAA zapise za `@` i `www` (parking stranica registra).
     Vercel ne podržava IPv6 (AAAA) kod spoljnog DNS-a.
   - Ako postoji CAA zapis, dodaj `0 issue "letsencrypt.org"`, inače
     sertifikat ne može da se izda.
   - TTL 300 ubrzava promjene.
   - Drugi način je da kod registra postaviš Vercelove nameservere
     (`ns1.vercel-dns.com`, `ns2.vercel-dns.com`). Tada Vercel sam pravi zapise.
3. Kad DNS proradi (od nekoliko minuta do nekoliko sati), Vercel **sam izdaje
   HTTPS sertifikat** (Let's Encrypt), obično za par minuta. Ništa se ne
   plaća i ništa se ne podešava. Kartica domena treba da pokaže *Valid
   Configuration*.
   Izvori: <https://vercel.com/docs/domains/working-with-domains/add-a-domain>,
   <https://vercel.com/kb/guide/a-record-and-caa-with-vercel>.

## 4. Provjere poslije prvog deploya

Prvo na `*.vercel.app`, pa na `markodumnic.art`:

- [ ] `/` i `/en` se otvaraju (200), slike i fontovi se učitavaju.
- [ ] `/radovi.html` → **308** → `/radovi`; `/en/` → `/en`; `/index.html` → `/`.
- [ ] `/djelo.html?id=prijatelji` → `/djelo?id=prijatelji` i **zadržava `?id=`**
      (prikazuje sliku Prijatelji). Isto za `/en/djelo.html?id=prijatelji`.
- [ ] `/nema-ovoga` daje **404** sa našom stranicom 404 (sa CSS-om).
- [ ] `/alati/VERCEL.md` daje **404** (radi `.vercelignore`).
- [ ] Zaglavlja (`curl -sI https://markodumnic.art/`): `Content-Security-Policy`,
      `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`.
      Na `/splat` CSP mora sadržati `'wasm-unsafe-eval'`. Na `/img/...` mora
      stajati `Cache-Control` iz `vercel.json`.
- [ ] U pregledaču (F12 → Console) na naslovnoj, galeriji (klik „Uđi u salu“),
      zum, ugao i splat nema poruka „Refused to …“.
- [ ] Kontakt: dugme otvara program za e-poštu sa popunjenom porukom.
- [ ] `http://markodumnic.art` i `https://www.markodumnic.art` završavaju
      na `https://markodumnic.art/`.
- [ ] Google Search Console: dodaj domen i pošalji `https://markodumnic.art/sitemap.xml`.

## 5. Šta je provjereno prije objave (simulacija, 23. 10. 2026)

Lokalni server je oponašao Vercel. Pravila je izvodio iz `vercel.json`
zvaničnom bibliotekom `@vercel/routing-utils`: cleanUrls, trailingSlash:false,
zaglavlja, a nepoznata adresa daje 404.html sa statusom 404. Sajt je radio
preko HTTPS-a. Playwright je prošao **50 stranica na oba jezika** i pratio
svaki unutrašnji link. Ušao je u 3D galeriju, prošao zum, ugao i splat,
isprobao kontakt formu (mailto) i prekidač jezika na svakoj stranici.

Rezultat:

- **Nijedan pokvaren link, nijedna 404** osim namjerno traženih.
- **Nema lanaca preusmjerenja**: svaki link sa `.html` ima tačno jedan 308
  ka čistoj adresi.
- **Nema CSP prekršaja** ni mixed content-a. Galerija (WebGL), ugao i fontovi
  sa `/fonts/` rade pod strogim CSP-om.
- Relativni linkovi rade i na `/en` (bez kose crte) i na `/en/djelo/<id>`.
  Engleske stranice ostaju na engleskom, a prekidač jezika vodi na isti
  sadržaj na drugom jeziku.
- Kanonske i hreflang adrese daju 200, bez preusmjerenja.
- Splat trenutno prikazuje „prazno“ jer `splat/index.json` nema snimaka. To
  je očekivano.

Poznato ograničenje: Vercel za statički sajt služi **samo korijenski
`404.html`**. Nepoznata adresa pod `/en/...` zato dobija crnogorsku 404
stranicu, u kojoj postoji link „English“. `en/404.html` se ne koristi
automatski. `rewrites` ne mogu vratiti status 404, a stari `routes` +
`"handle": "filesystem"` je zastario i ne preporučuje se uz cleanUrls.
Ako zatreba, najjednostavnije je da `404.html` bude dvojezičan, ili da
skripta promijeni tekst kada adresa počinje sa `/en/`.
