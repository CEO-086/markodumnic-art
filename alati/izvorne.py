#!/usr/bin/env python3
"""Web fotografije radova iz originala u izvorne-fotografije/.

Pokretanje iz bilo kog mjesta:  python3 alati/izvorne.py   [--sve]

Originali (izvorne-fotografije/<id>.jpg, puna rezolucija sa aparata) su
samo baza: sajt ih nikad ne učitava i ne objavljuju se (.vercelignore).
Iz njih ova skripta pravi dvije JPEG verzije koje sajt koristi:
    img/radovi/velike/<id>.jpg   duža strana do 2400 px (zum, izbliza)
    img/radovi/<id>.jpg          duža strana do 1400 px (osnovna slika)
Manja se pravi iz veće (original → 2400 → 1400), isto kao prvi put.
Slika se nikad ne uvećava: ako je original manji, ostaje u svojoj veličini.
EXIF se ne prenosi (aparat, datum), a orijentacija se primijeni na piksele.

Postojeći fajl se ne dira (sajt je već podešen i testiran na njima), osim
uz --sve. Novo djelo: dodaj ga u data/radovi.json, original stavi u
izvorne-fotografije/<id>.jpg, pa pokreni redom:
    python3 alati/izvorne.py
    python3 alati/slike.py
    python3 alati/teksture.py
"""
import json, os, sys
from PIL import Image, ImageOps

KORIJEN = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VERZIJE = (  # (folder, najduža strana, JPEG kvalitet)
    (('img', 'radovi', 'velike'), 2400, 88),
    (('img', 'radovi'), 1400, 85),
)


def put(*dijelovi):
    return os.path.join(KORIJEN, *dijelovi)


def umanji(im, maks):
    s, v = im.size
    k = maks / max(s, v)
    if k >= 1:
        return im
    return im.resize((round(s * k), round(v * k)), Image.LANCZOS)


def main():
    sve = '--sve' in sys.argv
    with open(put('data', 'radovi.json'), encoding='utf-8') as f:
        radovi = json.load(f)['radovi']
    napravljeno = preskoceno = 0
    for djelo in radovi:
        izvor = put('izvorne-fotografije', djelo['id'] + '.jpg')
        if not os.path.exists(izvor):
            print('  nema originala:', os.path.relpath(izvor, KORIJEN))
            continue
        with Image.open(izvor) as orig:
            slika = ImageOps.exif_transpose(orig).convert('RGB')
        for folder, maks, kvalitet in VERZIJE:
            slika = umanji(slika, maks)
            cilj = put(*folder, djelo['id'] + '.jpg')
            if os.path.exists(cilj) and not sve:
                preskoceno += 1
                continue
            os.makedirs(os.path.dirname(cilj), exist_ok=True)
            slika.save(cilj, 'JPEG', quality=kvalitet, optimize=True, progressive=True)
            napravljeno += 1
            print('  %-58s %4dx%-4d %7.1f KB' % (
                os.path.relpath(cilj, KORIJEN), slika.size[0], slika.size[1],
                os.path.getsize(cilj) / 1024))
    print('napravljeno %d, preskočeno (već postoji) %d' % (napravljeno, preskoceno))


if __name__ == '__main__':
    main()
