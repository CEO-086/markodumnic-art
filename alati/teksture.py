#!/usr/bin/env python3
"""Lakše teksture za virtuelnu galeriju (js/galerija.js).

Pokretanje iz korijena sajta:  python3 alati/teksture.py   [--sve]

Iz izvornih fajlova (koji OSTAJU na disku, ne briše se ništa) pravi:

  img/reljef/<id>.webp        normal mapa reljefa paste, najviše 1024 px,
                              WebP q95 (vidi RELJEF ispod)
  img/reljef/<id>-512.webp    ista mapa za telefone, 512 px
  img/soba/<ime>.webp         PBR mape sobe (albedo, normal, roughness)
  img/sala/<id>-1024.webp     fotografija djela za telefone (1024 px)
  img/sala/<id>-160.webp      sićušna verzija djela — stoji na platnu dok
                              prava tekstura ne stigne (i u drugoj sali dok
                              posjetilac ne krene ka njoj)

Desktop i dalje crta img/radovi/<id>.jpg u prirodnoj veličini — tu se
ne gubi ništa od fotografije.

Skripta je idempotentna: izlaz se prepiše samo kad je izvor noviji od
njega (ili uz --sve), a isti ulaz uvijek daje isti izlaz.
"""
import glob, json, os, sys
from PIL import Image

KORIJEN = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SVE = '--sve' in sys.argv

# Normal mape: WebP q95, 4:2:0. Upoređeno renderom pod bočnim svjetlom
# (agent-ui/galerija-perf): razlika prema PNG-u se ne vidi, a fajl je
# oko 3x manji. Lossless WebP je štedio samo ~15 %.
RELJEF = [('', 1024, dict(quality=95, method=6)),
          ('-512', 512, dict(quality=95, method=6))]
# Sobne mape: albedo je boja (q88), normal i roughness su podaci (q95).
SOBA = {'albedo': dict(quality=88, method=6),
        'normal': dict(quality=95, method=6),
        'roughness': dict(quality=92, method=6)}
RADOVI = [('-1024', 1024, dict(quality=86, method=6)),
          ('-160', 160, dict(quality=60, method=6))]

napravljeno = preskoceno = 0


def put(*d):
    return os.path.join(KORIJEN, *d)


def zastario(izvor, izlaz):
    return SVE or not os.path.exists(izlaz) or os.path.getmtime(izvor) > os.path.getmtime(izlaz)


def smanji(im, maks):
    if max(im.size) <= maks:
        return im
    k = maks / max(im.size)
    return im.resize((max(1, round(im.width * k)), max(1, round(im.height * k))), Image.LANCZOS)


def sacuvaj(izvor, izlaz, maks, opcije, mod=None):
    global napravljeno, preskoceno
    if not zastario(izvor, izlaz):
        preskoceno += 1
        return
    os.makedirs(os.path.dirname(izlaz), exist_ok=True)
    with Image.open(izvor) as im:
        im.load()
        if mod is None:
            mod = 'L' if im.mode in ('L', 'LA', 'I;16') else 'RGB'
        slika = smanji(im.convert(mod), maks)
    privremeni = izlaz + '.tmp'
    slika.save(privremeni, 'WEBP', exact=True, **opcije)
    os.replace(privremeni, izlaz)
    napravljeno += 1
    print('  %-40s %4dx%-4d %7.1f KB  (izvor %7.1f KB)' % (
        os.path.relpath(izlaz, KORIJEN), slika.width, slika.height,
        os.path.getsize(izlaz) / 1024, os.path.getsize(izvor) / 1024))


def main():
    # Reljef — normal mape (RGB, bez alfe)
    for f in sorted(glob.glob(put('img', 'reljef', '*.png'))):
        ime = os.path.splitext(os.path.basename(f))[0]
        for sufiks, maks, opcije in RELJEF:
            sacuvaj(f, put('img', 'reljef', ime + sufiks + '.webp'), maks, opcije, 'RGB')

    # Soba — samo mape koje sala stvarno učitava (okolina.png se ne koristi)
    for f in sorted(glob.glob(put('img', 'soba', '*-*.png'))):
        ime = os.path.splitext(os.path.basename(f))[0]
        vrsta = ime.rsplit('-', 1)[1]
        if vrsta in SOBA:
            sacuvaj(f, put('img', 'soba', ime + '.webp'), 1024, SOBA[vrsta])

    # Djela — iz data/radovi.json, da se pokriju sva koja vise u sali
    with open(put('data', 'radovi.json'), encoding='utf-8') as d:
        radovi = json.load(d).get('radovi', [])
    for r in radovi:
        if not r or not r.get('id') or not r.get('slika'):
            continue
        izvor = put(*r['slika'].split('/'))
        if not os.path.exists(izvor):
            print('  NEMA', r['slika'])
            continue
        for sufiks, maks, opcije in RADOVI:
            sacuvaj(izvor, put('img', 'sala', r['id'] + sufiks + '.webp'), maks, opcije, 'RGB')

    print('napravljeno %d, već ažurno %d' % (napravljeno, preskoceno))


if __name__ == '__main__':
    main()
