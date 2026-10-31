#!/usr/bin/env python3
"""Normal mape reljefa paste za virtuelnu galeriju (js/galerija.js).

Pokretanje iz bilo kog mjesta:  python3 alati/reljef.py <id> [<id> ...]   [--sve]
                                                         [--izlaz <folder>]

Za svako djelo pravi img/reljef/<id>.png — tangent-space normal mapu, duža
strana 1024 px, iste proporcije kao fotografija. Mapa je IZVEDENA iz
fotografije (svjetlina -> visina), nije izmjerena sa platna.

Izvor je img/radovi/<id>.jpg (1400 px), a ako njega nema
img/radovi/velike/<id>.jpg. Postojeće mape su pravljene iz 1400 px
fotografije — sa njom se nova mapa poklapa sa starim skoro piksel za piksel.

Postupak (rekonstruisan iz postojećih mapa, original skripte je izgubljen):
  1. fotografija -> 1024 px (LANCZOS), svjetlina Rec.709 u 0..1
  2. Gaussovo zamućenje sigma 1.33 px (skida šum JPEG-a i platna)
  3. visoki propust: oduzme se Gauss sigma 16 px (ostaje samo potez,
     ne i krupne svijetle/tamne površine)
  4. Sobel gradijent -> normala (-k*dx, +k*dy, 1), k = 9.7, normalizovana;
     zelena je "Y gore" (OpenGL), kako three.js očekuje
  5. pakovanje 128 + n*127.5, zaokruženo na korak od 3 (kao stare mape)

Postojeća mapa se ne dira, osim uz --sve. --izlaz <folder> piše mape
tamo umjesto u img/reljef (za poređenje sa postojećim). Poslije pokreni
python3 alati/teksture.py — on od PNG-a pravi .webp i -512.webp.
"""
import os, sys
import numpy as np
from PIL import Image

KORIJEN = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

MAKS = 1024                       # duža strana mape
LUMA = (0.2126, 0.7152, 0.0722)   # Rec.709, na gama vrijednostima
SIGMA = 1.33                      # zamućenje prije gradijenta (px na 1024)
PROPUST = 16.0                    # visoki propust (px na 1024)
JACINA = 9.7                      # nagib normale po jedinici svjetline
KORAK = 3                         # kvantizacija kanala: 128 + 3k


def put(*d):
    return os.path.join(KORIJEN, *d)


def ime(f):
    r = os.path.relpath(f, KORIJEN)
    return f if r.startswith('..') else r


def gauss(h, sigma):
    """Odvojivo Gaussovo zamućenje (numpy, bez scipy). Ivica se preslikava
    bez ponavljanja krajnjeg piksela (kao OpenCV) — tako su rađene stare mape."""
    r = int(4 * sigma + 0.5)
    x = np.arange(-r, r + 1)
    k = np.exp(-x * x / (2.0 * sigma * sigma))
    k /= k.sum()
    p = np.pad(h, ((0, 0), (r, r)), mode='reflect')
    h = sum(k[j] * p[:, j:j + h.shape[1]] for j in range(len(k)))
    p = np.pad(h, ((r, r), (0, 0)), mode='reflect')
    return sum(k[j] * p[j:j + h.shape[0]] for j in range(len(k)))


def sobel(h):
    p = np.pad(h, 1, mode='edge')
    gx = ((p[:-2, 2:] + 2 * p[1:-1, 2:] + p[2:, 2:])
          - (p[:-2, :-2] + 2 * p[1:-1, :-2] + p[2:, :-2])) / 8
    gy = ((p[2:, :-2] + 2 * p[2:, 1:-1] + p[2:, 2:])
          - (p[:-2, :-2] + 2 * p[:-2, 1:-1] + p[:-2, 2:])) / 8
    return gx, gy


def normal_mapa(slika):
    k = MAKS / max(slika.size)
    vel = (max(1, round(slika.width * k)), max(1, round(slika.height * k)))
    rgb = np.asarray(slika.convert('RGB').resize(vel, Image.LANCZOS), dtype=np.float64) / 255
    h = gauss(rgb @ np.array(LUMA), SIGMA)
    h -= gauss(h, PROPUST)
    gx, gy = sobel(h)
    nx, ny = -JACINA * gx, JACINA * gy
    duz = np.sqrt(nx * nx + ny * ny + 1)
    n = np.stack([nx / duz, ny / duz, 1 / duz], -1)
    v = 128 + KORAK * np.round(n * 127.5 / KORAK)
    return Image.fromarray(np.clip(v, 2, 254).astype(np.uint8), 'RGB')


def main():
    arg = sys.argv[1:]
    sve = '--sve' in arg
    izlaz = put('img', 'reljef')
    if '--izlaz' in arg:
        i = arg.index('--izlaz')
        if i + 1 >= len(arg):
            sys.exit('--izlaz traži folder')
        izlaz = os.path.abspath(arg[i + 1])
        del arg[i:i + 2]
    ids = [a for a in arg if not a.startswith('--')]
    if not ids:
        sys.exit(__doc__)
    os.makedirs(izlaz, exist_ok=True)
    greske = 0
    for id_ in ids:
        izvor = next((f for f in (put('img', 'radovi', id_ + '.jpg'),
                                  put('img', 'radovi', 'velike', id_ + '.jpg'))
                      if os.path.exists(f)), None)
        cilj = os.path.join(izlaz, id_ + '.png')
        if izvor is None:
            print('  NEMA fotografije za', id_)
            greske += 1
            continue
        if os.path.exists(cilj) and not sve:
            print('  postoji, preskačem (--sve prepisuje):', ime(cilj))
            continue
        with Image.open(izvor) as im:
            im.load()
            mapa = normal_mapa(im)
        privremeni = cilj + '.tmp'
        mapa.save(privremeni, 'PNG')
        os.replace(privremeni, cilj)
        print('  %-40s %4dx%-4d %7.1f KB  (iz %s)' % (
            ime(cilj), mapa.width, mapa.height,
            os.path.getsize(cilj) / 1024, ime(izvor)))
    sys.exit(1 if greske else 0)


if __name__ == '__main__':
    main()
