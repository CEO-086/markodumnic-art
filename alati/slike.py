#!/usr/bin/env python3
"""Manje verzije slika za telefone i tablete (AVIF + WebP).

Pokretanje iz bilo kog mjesta:  python3 alati/slike.py   [--sve]

Za svako djelo iz data/radovi.json pravi u img/radovi/w/:
    <id>-480.avif  <id>-800.avif  <id>-1200.avif  <id>-1600.avif
    <id>-480.webp  <id>-800.webp  <id>-1200.webp  <id>-1600.webp
iz najveće fotografije (img/radovi/velike/<id>.jpg, a ako nje nema iz
img/radovi/<id>.jpg). Širina koja je veća od izvora se preskače — slika se
nikad ne uvećava. Ako je izvor uži od najveće tražene širine, dodaje se još
jedna verzija tačno u širini izvora (npr. ponte-isabella-1180), da i veliki
ekrani dobiju pun kvalitet.

Spisak širina koje stvarno postoje upisuje se u data/radovi.json kao polje
`varijante` (npr. [480, 800, 1200, 1600]) — iz njega js/radovi.js pravi
srcset na djelo.html. HTML stranice koriste iste širine (vidi srcset u
index.html, radovi.html, djelo/*.html …): kad se doda novo djelo, pokreni
ovu skriptu i prepiši srcset po uzoru na postojeće.

Portret autora (img/autor/marko-dumnic.jpg, 600 px) dobija 400 i 600 px
verzije u img/autor/w/.

Skripta je idempotentna: fajl se pravi samo ako ne postoji ili je izvor
noviji od njega (--sve pravi sve ponovo). JPEG-ovi ostaju kao rezerva za
pregledače bez AVIF/WebP podrške.

Kvalitet je biran gledanjem isječaka 1:1 (ulje na platnu — gusti potezi,
puno sitne teksture, pa se slabo pakuje): AVIF q50 (4:2:0, speed 6) drži
teksturu poteza kao izvor; q40 je već vidljivo „peglao” potez, a q60 je
~60 % veći bez vidljive razlike. WebP q75 (method 6) je samo rezerva za
starije Safarije. Primjer, Aria di Torino u 1200 px: JPEG 1400 px 504 KB,
AVIF ~220 KB, WebP ~420 KB; u 800 px AVIF ~100 KB.
"""
import json, os, sys
from PIL import Image, ImageOps

KORIJEN = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SIRINE = (480, 800, 1200, 1600)
SIRINE_PORTRET = (400, 600)
AVIF = dict(quality=50, speed=6)
WEBP = dict(quality=75, method=6)


def put(*dijelovi):
    return os.path.join(KORIJEN, *dijelovi)


def zastario(cilj, izvor, sve):
    return sve or not os.path.exists(cilj) or os.path.getmtime(cilj) < os.path.getmtime(izvor)


def napravi(izvor, folder, ime, sirine, sve):
    """Pravi verzije jedne slike; vraća spisak širina koje postoje."""
    os.makedirs(folder, exist_ok=True)
    with Image.open(izvor) as orig:
        orig = ImageOps.exif_transpose(orig).convert('RGB')
        sw, sh = orig.size
        lista = [w for w in sirine if w <= sw]
        if sw < sirine[-1] and sw not in lista:
            lista.append(sw)
        napravljeno = 0
        for w in lista:
            h = round(sh * w / sw)
            umanjena = None
            for ekst, opcije in (('avif', AVIF), ('webp', WEBP)):
                cilj = os.path.join(folder, '%s-%d.%s' % (ime, w, ekst))
                if not zastario(cilj, izvor, sve):
                    continue
                if umanjena is None:
                    umanjena = orig if w == sw else orig.resize((w, h), Image.LANCZOS)
                privremeni = cilj + '.tmp'
                umanjena.save(privremeni, format=ekst.upper(), **opcije)
                os.replace(privremeni, cilj)
                napravljeno += 1
        print('%-36s %4dx%-4d → %s%s' % (ime, sw, sh, ', '.join(map(str, lista)),
                                          ('  (%d novih)' % napravljeno) if napravljeno else ''))
        return lista


def main():
    sve = '--sve' in sys.argv
    podaci_put = put('data', 'radovi.json')
    with open(podaci_put, encoding='utf-8') as f:
        tekst = f.read()
    podaci = json.loads(tekst)

    for djelo in podaci['radovi']:
        izvor = put('img', 'radovi', 'velike', djelo['id'] + '.jpg')
        if not os.path.exists(izvor):
            izvor = put(djelo['slika'])
        djelo['varijante'] = napravi(izvor, put('img', 'radovi', 'w'), djelo['id'], SIRINE, sve)

    portret = put('img', 'autor', 'marko-dumnic.jpg')
    if os.path.exists(portret):
        napravi(portret, put('img', 'autor', 'w'), 'marko-dumnic', SIRINE_PORTRET, sve)

    novo = json.dumps(podaci, indent=2, ensure_ascii=False) + '\n'
    if novo != tekst:
        with open(podaci_put, 'w', encoding='utf-8') as f:
            f.write(novo)
        print('data/radovi.json: upisane varijante')


if __name__ == '__main__':
    main()
