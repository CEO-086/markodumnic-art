#!/usr/bin/env python3
"""Fontovi sa sopstvenog servera: Inter i EB Garamond, isječeni na znakove sajta.

Pokretanje iz bilo kog mjesta:  python3 alati/fontovi.py   [--izvor DIR] [--provjera]

Potrebno:  pip install fonttools brotli

Šta radi (svaki put isto — idempotentno):
  1. Izvorni promjenljivi TTF-ovi (google/fonts na GitHubu, ista verzija koju
     služi Google Fonts: Inter 4.001, EB Garamond 1.003) i OFL licence se
     preuzimaju u keš (~/.cache/markodumnic-fontovi ili --izvor DIR) samo ako
     ih tamo nema, i provjeravaju po SHA-256. Keš NIJE u sajtu — 2.5 MB
     izvora ne treba da ide na server.
  2. Skupi sve znakove koje sajt stvarno ispisuje: tekst iz *.html, js/*.js,
     data/*.json i css/*.css (bez komentara i bez vendor/), plus osnovni
     latinični skup (cio ASCII i tvrdi razmak) i obavezni
     znakovi crnogorske latinice i tipografije (čćšžđ śź, — – „ “ ” ’ · × … → ←).
     Uzimaju se samo znakovi iz opsega u kojima je Google Fonts ove fontove
     i ranije služio (latin + latin-ext) i obavezni znakovi — simboli poput
     ▶ ◀ ✕ i dalje dolaze iz sistemskog fonta, kao i do sada, da se izgled
     ne promijeni.
  3. Fiksira ose kao Google (Inter opsz=14, Inter wght 100–399 odsječen;
     EB Garamond kurziv statičan 400), isječe i upiše woff2 u fonts/.
     Gornja granica wght ostaje na krajnjem masteru (Inter 900, Garamond 800):
     sužavanje na 600 bi preračunalo delte i 500/600 bi se za piksel
     razlikovali od Google verzije, a uštedi samo ~3 KB. U @font-face piše
     font-weight: 400 600 — isto kao Google (400, 500, 600), pa traženih 700
     i dalje daje 600, kao i do sada.
     Fajl se prepisuje samo kad se sadržaj promijeni.
  4. Upiše @font-face blok u css/tokens.css (između /* fontovi */ i
     /* /fontovi */) sa unicode-range i ?v=<heš> u adresi, i blok
     <!-- fontovi --> … <!-- /fontovi --> sa <link rel="preload"> za Inter i
     EB Garamond (uspravni) u <head> svake stranice, odmah ispred tokens.css.
     Usput iz <head> skida stare <link>-ove ka fonts.googleapis.com /
     fonts.gstatic.com. Svaki fajl se čita neposredno prije upisa i mijenja
     se samo taj blok — ostatak stranice (slike, <!-- jezik -->,
     <!-- hreflang --> …) ostaje netaknut.

Heš u ?v= mijenja se samo kad se promijeni sam font, pa /fonts/* smije imati
Cache-Control: immutable (vidi vercel.json i _headers).

--provjera: ništa ne upisuje, samo javi šta bi se promijenilo (izlaz 1 ako bi).
"""
import argparse, hashlib, io, os, re, sys, urllib.request

KORIJEN = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONTOVI = os.path.join(KORIJEN, 'fonts')
TOKENI = os.path.join(KORIJEN, 'css', 'tokens.css')
RAW = 'https://raw.githubusercontent.com/google/fonts/main/ofl/'

IZVORI = {
    'inter':       (RAW + 'inter/Inter%5Bopsz,wght%5D.ttf',
                    '29160a80ff49ddcab2c97711247e08b1fab27a484a329ce8b813d820dc559031'),
    'garamond':    (RAW + 'ebgaramond/EBGaramond%5Bwght%5D.ttf',
                    'ef9512f92f6d579e5dc75af59a5a4b1b8b47d2eda89e00b954d44520e5369027'),
    'garamond-i':  (RAW + 'ebgaramond/EBGaramond-Italic%5Bwght%5D.ttf',
                    'bba2c4499c93c9612b90b9825d32b07da52fce2fe57562a1eb6b833553f93c4e'),
    'ofl-inter':   (RAW + 'inter/OFL.txt',
                    '5b9321a4298cfeb6b34354164a1c3afc3db114569984c502b9b35d988fd58c57'),
    'ofl-garamond': (RAW + 'ebgaramond/OFL.txt',
                    '0985066662eb755ed3683ae5482a81a9195b49ce3f7e165cc2388b3dbece7dd7'),
}

# (izvor, izlaz, porodica, stil, font-weight u @font-face, ose, preload?)
# Preload samo uspravni Inter i EB Garamond — oni su iznad pregiba na svakoj
# stranici; kurziv je samo u citatima niže na naslovnoj i o-autoru.
LICI = [
    ('inter',      'inter-var.woff2',            'Inter',       'normal', '400 600',
     {'opsz': 14, 'wght': (400, 900)}, True),
    ('garamond',   'eb-garamond-var.woff2',      'EB Garamond', 'normal', '400 600',
     {'wght': (400, 800)}, True),
    ('garamond-i', 'eb-garamond-italic.woff2',   'EB Garamond', 'italic', '400',
     {'wght': 400}, False),
]
LICENCE = [('ofl-inter', 'OFL-Inter.txt'), ('ofl-garamond', 'OFL-EBGaramond.txt')]

# Opsezi koje Google Fonts daje za latin i latin-ext (css2 API, 2026).
GOOGLE_OPSEZI = (
    'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, '
    'U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, '
    'U+2212, U+2215, U+FEFF, U+FFFD, '
    'U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, '
    'U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, '
    'U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF')
# Uvijek unutra, i kad ih trenutno nema u tekstu.
OBAVEZNI = ('čćšžđČĆŠŽĐśźŚŹ' '—–„“”‘’‚«»·×…→←' '€§°')
OSNOVNI = [chr(c) for c in range(0x20, 0x7F)] + ['\u00A0']


def opsezi(tekst):
    skup = set()
    for dio in tekst.split(','):
        dio = dio.strip()[2:]
        a, _, b = dio.partition('-')
        skup.update(range(int(a, 16), int(b or a, 16) + 1))
    return skup


def u_opsege(kodovi):
    kodovi = sorted(kodovi)
    delovi, i = [], 0
    while i < len(kodovi):
        j = i
        while j + 1 < len(kodovi) and kodovi[j + 1] == kodovi[j] + 1:
            j += 1
        delovi.append('U+%04X' % kodovi[i] if i == j else 'U+%04X-%04X' % (kodovi[i], kodovi[j]))
        i = j + 1
    return ', '.join(delovi)


def stranice():
    for d, pod, fajlovi in os.walk(KORIJEN):
        rel_d = os.path.relpath(d, KORIJEN)
        if rel_d.split(os.sep)[0] in ('vendor', 'alati', 'node_modules', '.git', 'fonts'):
            pod[:] = []
            continue
        for f in fajlovi:
            if f.endswith('.html'):
                yield os.path.normpath(os.path.join(rel_d, f))


def znakovi_sajta():
    import html
    z = set()
    putanje = [os.path.join(KORIJEN, p) for p in stranice()]
    for pod, ext in (('js', '.js'), ('data', '.json'), ('css', '.css')):
        d = os.path.join(KORIJEN, pod)
        if os.path.isdir(d):
            putanje += [os.path.join(d, f) for f in os.listdir(d) if f.endswith(ext)]
    for put in putanje:
        t = open(put, encoding='utf-8').read()
        t = re.sub(r'<!--.*?-->', '', t, flags=re.S)
        t = re.sub(r'/\*.*?\*/', '', t, flags=re.S)
        if put.endswith('.js'):
            t = re.sub(r'(?m)^\s*//.*$', '', t)
        if put.endswith('.html'):
            t = html.unescape(t)
        if put.endswith('.css'):        # content: "\2014"
            t += ''.join(chr(int(h, 16)) for h in re.findall(r'\\([0-9a-fA-F]{2,6})\s?', t))
        if put.endswith('.js'):         # '\u2014'
            t += ''.join(chr(int(h, 16)) for h in re.findall(r'\\u([0-9a-fA-F]{4})', t))
        z.update(t)
    return {ord(c) for c in z if ord(c) >= 0x20}


def izvor(kljuc, kes):
    url, sha = IZVORI[kljuc]
    put = os.path.join(kes, os.path.basename(url).replace('%5B', '[').replace('%5D', ']'))
    if kljuc.startswith('ofl-'):
        put = os.path.join(kes, kljuc + '.txt')
    if not os.path.exists(put) or hashlib.sha256(open(put, 'rb').read()).hexdigest() != sha:
        print('preuzimam', url)
        podaci = urllib.request.urlopen(url, timeout=60).read()
        if hashlib.sha256(podaci).hexdigest() != sha:
            sys.exit('SHA-256 se ne slaže za %s — izvor se promijenio na GitHubu. '
                     'Provjeri novu verziju i ažuriraj heš u IZVORI.' % url)
        os.makedirs(kes, exist_ok=True)
        open(put, 'wb').write(podaci)
    return put


def napravi(ttf, ose, kodovi):
    from fontTools.ttLib import TTFont
    from fontTools.varLib import instancer
    from fontTools import subset
    f = TTFont(ttf, recalcTimestamp=False)
    f = instancer.instantiateVariableFont(f, ose)
    # Kroz memoriju i nazad: subsetter ne podnosi gvar koji je instancer
    # ostavio napola učitan (KeyError na glifovima poput uni00A0.tf).
    b = io.BytesIO()
    f.save(b)
    f = TTFont(io.BytesIO(b.getvalue()), recalcTimestamp=False)
    o = subset.Options()
    o.flavor = 'woff2'
    # Samo ono što pregledač (HarfBuzz, latinica) uključuje sam — kern, liga,
    # calt, ccmp, locl, mark … — plus tnum/lnum, koje sajt traži kroz
    # font-variant-numeric. frac/numr/dnom, smcp, ss01 … bi povukli stotine
    # glifova koje sajt nikad ne prikazuje.
    o.layout_features = ['ccmp', 'locl', 'mark', 'mkmk', 'rlig', 'rvrn', 'calt', 'clig',
                         'curs', 'dist', 'kern', 'liga', 'rclt', 'tnum', 'lnum']
    o.name_IDs = ['*']
    o.name_languages = ['*']
    o.hinting = False                   # Google ih takođe služi bez hintova
    o.notdef_outline = True
    s = subset.Subsetter(o)
    s.populate(unicodes=kodovi)
    s.subset(f)
    b = io.BytesIO()
    f.recalcTimestamp = False
    f.save(b)
    return b.getvalue(), set(f.getBestCmap())


def upisi_ako_treba(put, novo, provjera, promjene, binarno=False):
    staro = None
    if os.path.exists(put):
        staro = open(put, 'rb' if binarno else 'r', **({} if binarno else {'encoding': 'utf-8'})).read()
    if staro == novo:
        return
    promjene.append(os.path.relpath(put, KORIJEN))
    if not provjera:
        if binarno:
            open(put, 'wb').write(novo)
        else:
            open(put, 'w', encoding='utf-8').write(novo)


GOOGLE_LINK = re.compile(r'[ \t]*<link\b[^>]*\bhref="https://fonts\.(?:googleapis|gstatic)\.com[^"]*"[^>]*>[ \t]*\n?')
FONT_BLOK = re.compile(r'[ \t]*<!-- fontovi -->.*?<!-- /fontovi -->[ \t]*\n?', re.S)
TOKENI_LINK = re.compile(r'([ \t]*)<link\b[^>]*\bhref="([^"]*?)css/tokens\.css"[^>]*>')


def obradi_stranicu(rel, preload, provjera, promjene):
    put = os.path.join(KORIJEN, rel)
    s = open(put, encoding='utf-8').read()           # svjež sadržaj, neposredno prije upisa
    kraj = s.find('</head>')
    if kraj < 0:
        return
    glava, ostatak = s[:kraj], s[kraj:]
    glava = GOOGLE_LINK.sub('', glava)
    glava = FONT_BLOK.sub('', glava)
    m = TOKENI_LINK.search(glava)
    if not m:
        print('UPOZORENJE: nema css/tokens.css u <head>:', rel)
    else:
        uvlaka, prefiks = m.group(1), m.group(2)
        blok = uvlaka + '<!-- fontovi -->\n' + ''.join(
            '%s<link rel="preload" href="%sfonts/%s" as="font" type="font/woff2" crossorigin>\n'
            % (uvlaka, prefiks, ime) for ime in preload) + uvlaka + '<!-- /fontovi -->\n'
        glava = glava[:m.start()] + blok + glava[m.start():]
    novo = glava + ostatak
    if novo != s:
        # Još jednom pročitaj: ako je drugi alat u međuvremenu promijenio
        # fajl, primijeni izmjenu na njegovu verziju.
        if open(put, encoding='utf-8').read() != s:
            return obradi_stranicu(rel, preload, provjera, promjene)
        promjene.append(rel)
        if not provjera:
            open(put, 'w', encoding='utf-8').write(novo)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--izvor', default=os.path.expanduser('~/.cache/markodumnic-fontovi'))
    ap.add_argument('--provjera', action='store_true')
    a = ap.parse_args()
    promjene = []

    dozvoljeni = opsezi(GOOGLE_OPSEZI)
    sajt = znakovi_sajta()
    kodovi = ({ord(c) for c in OSNOVNI} | (sajt & dozvoljeni) | {ord(c) for c in OBAVEZNI})
    van = sorted(sajt - kodovi - {0x7F})
    if van:
        print('ostaju na sistemskom fontu:', ' '.join(chr(c) for c in van))

    os.makedirs(FONTOVI, exist_ok=True)
    pravila, preload = [], []
    for kljuc, ime, porodica, stil, tezina, ose, pre in LICI:
        podaci, cmap = napravi(izvor(kljuc, a.izvor), ose, kodovi)
        upisi_ako_treba(os.path.join(FONTOVI, ime), podaci, a.provjera, promjene, binarno=True)
        nema = kodovi - cmap
        if nema:
            print('%s nema: %s' % (ime, ' '.join(chr(c) for c in sorted(nema))))
        v = hashlib.sha256(podaci).hexdigest()[:10]
        adresa = '%s?v=%s' % (ime, v)
        if pre:
            preload.append(adresa)
        pravila.append(
            "@font-face {\n"
            "  font-family: '%s';\n"
            "  font-style: %s;\n"
            "  font-weight: %s;\n"
            "  font-display: swap;\n"
            "  src: url('../fonts/%s') format('woff2');\n"
            "  unicode-range: %s;\n"
            "}\n" % (porodica, stil, tezina, adresa, u_opsege(cmap & kodovi)))
        print('%-28s %6d B  %d znakova' % (ime, len(podaci), len(cmap & kodovi)))
    for kljuc, ime in LICENCE:
        upisi_ako_treba(os.path.join(FONTOVI, ime), open(izvor(kljuc, a.izvor), 'rb').read(),
                        a.provjera, promjene, binarno=True)

    blok = ('/* fontovi — generiše alati/fontovi.py, ne mijenjati ručno.\n'
            '   Inter (Rasmus Andersson) i EB Garamond (Georg Duffner, Octavio Pardo),\n'
            '   oba pod SIL Open Font License 1.1 — vidi fonts/OFL-*.txt. */\n'
            + '\n'.join(pravila) + '/* /fontovi */')
    t = open(TOKENI, encoding='utf-8').read()
    if '/* fontovi' in t:
        t2 = re.sub(r'/\* fontovi\b.*?/\* /fontovi \*/', lambda m: blok, t, count=1, flags=re.S)
    else:   # prvi put: odmah iza uvodnog komentara
        m = re.match(r'\s*/\*.*?\*/\n', t, flags=re.S)
        i = m.end() if m else 0
        t2 = t[:i] + '\n' + blok + '\n' + t[i:]
    if t2 != t:
        if open(TOKENI, encoding='utf-8').read() != t:
            sys.exit('css/tokens.css se promijenio tokom rada — pokreni ponovo.')
        upisi_ako_treba(TOKENI, t2, a.provjera, promjene)

    for rel in sorted(stranice()):
        obradi_stranicu(rel, preload, a.provjera, promjene)

    if promjene:
        print(('bi se promijenilo:' if a.provjera else 'promijenjeno:'), len(promjene))
        for p in promjene:
            print('  ', p)
    else:
        print('sve je već ažurno')
    sys.exit(1 if (a.provjera and promjene) else 0)


if __name__ == '__main__':
    main()
