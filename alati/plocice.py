#!/usr/bin/env python3
"""Pločice za zumiranje (zum.html): piramida JPEG pločica jednog djela.

Pokretanje iz bilo kog mjesta:
    python3 alati/plocice.py <id> [<id> ...]   [--sve]   [--izlaz <folder>]

Za svako navedeno djelo iz data/radovi.json sječe pločice iz fotografije u
punoj rezoluciji (img/radovi/velike/<id>.jpg, duža strana 2400 px) i pravi:
    img/plocice/<id>/info.json            opis piramide za js/zum.js
    img/plocice/<id>/{0,1,2}/<kolona>_<red>.jpg
i upisuje djelo u img/plocice/index.json (redom kao u data/radovi.json).
Naziv, tehnika, dimenzije, godina i rezervna slika (`slika`) se uzimaju iz
data/radovi.json, pa ih prvo tamo upiši.

Piramida ima 3 nivoa: nivo 0 je jedna pločica (cijelo djelo), nivo 1 je
2 × 2, nivo 2 je 4 × 4. Pločica je ista na svim nivoima: četvrtina izvora,
zaokružena (Pythonov round, npr. 2157 × 2400 → 539 × 600). Nivo 2 je izvor
smanjen/uvećan LANCZOS-om na tačno 4 pločice (2157 → 2156, najviše piksel-dva
razlike), a nivoi 1 i 0 su nivo 2 smanjen LANCZOS-om na pola, odnosno
četvrtinu. Svaka pločica dobija još `preklop` (2) piksela sa svake strane
gdje ima susjeda — na ivici djela ne — da se u pregledaču ne vide šavovi.
JPEG kvalitet 80, progresivni, 4:2:0, bez EXIF-a.

Ova pravila su izvučena iz postojećih pločica (prvobitni generator je
izgubljen): ponovo isječene pločice su bajt-za-bajt iste kao one u repou.

Postojeći folder pločica se ne dira, osim uz --sve. Sa --izlaz se sve
(pločice i index.json) piše u drugi folder umjesto img/plocice/, npr. za
probu:  python3 alati/plocice.py svjetlo-u-sumrak --izlaz /tmp/plocice-test
(ako tamo nema index.json, polazi se od kopije onog iz img/plocice/).

Novo djelo, poslije alati/izvorne.py:
    python3 alati/plocice.py <id>
"""
import json, os, shutil, sys
from PIL import Image, ImageOps

KORIJEN = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NIVOA = 3
PREKLOP = 2
JPEG = dict(quality=80, progressive=True, subsampling='4:2:0')
OBRAZAC = '{nivo}/{kolona}_{red}.jpg'
NAPOMENA = ('Pločice su isječene iz fotografije djela u punoj rezoluciji (%s). '
            'Svaka pločica je sirina × visina piksela svog nivoa, plus preklop.')
NAPOMENA_INDEKS = 'Djela koja imaju pločice za zumiranje.'


def put(*dijelovi):
    return os.path.join(KORIJEN, *dijelovi)


def upisi_json(putanja, podaci):
    privremeni = putanja + '.tmp'
    with open(privremeni, 'w', encoding='utf-8') as f:
        f.write(json.dumps(podaci, indent=2, ensure_ascii=False) + '\n')
    os.replace(privremeni, putanja)


def isijeci(djelo, izvor_rel, folder):
    """Pravi pločice i info.json u `folder`; vraća info."""
    with Image.open(put(izvor_rel)) as orig:
        izvor = ImageOps.exif_transpose(orig).convert('RGB')
    djelilac = 2 ** (NIVOA - 1)
    pw = round(izvor.width / djelilac)
    ph = round(izvor.height / djelilac)

    najveci = izvor.resize((pw * djelilac, ph * djelilac), Image.LANCZOS)
    nivoi = []
    ukupno = 0
    for nivo in range(NIVOA):
        n = 2 ** nivo
        sirina, visina = pw * n, ph * n
        slika = najveci if n == djelilac else najveci.resize((sirina, visina), Image.LANCZOS)
        os.makedirs(os.path.join(folder, str(nivo)), exist_ok=True)
        for kolona in range(n):
            for red in range(n):
                okvir = (max(0, kolona * pw - PREKLOP), max(0, red * ph - PREKLOP),
                         min(sirina, (kolona + 1) * pw + PREKLOP),
                         min(visina, (red + 1) * ph + PREKLOP))
                cilj = os.path.join(folder, OBRAZAC.format(nivo=nivo, kolona=kolona, red=red))
                slika.crop(okvir).save(cilj, 'JPEG', **JPEG)
                ukupno += 1
        nivoi.append({'nivo': nivo, 'kolona': n, 'redova': n,
                      'sirina': sirina, 'visina': visina})

    info = {
        'napomena': NAPOMENA % izvor_rel,
        'id': djelo['id'],
        'naziv': djelo['naziv'],
        'tehnika': djelo['tehnika'],
        'dimenzije': djelo['dimenzije'],
        'godina': djelo['godina'],
        'rezerva': djelo['slika'],
        'sadrzaj': {'sirina': pw, 'visina': ph},
        'plocica': {'sirina': pw, 'visina': ph},
        'preklop': PREKLOP,
        'nivoa': NIVOA,
        'nivoi': nivoi,
        'obrazac': OBRAZAC,
        'ukupno_plocica': ukupno,
    }
    upisi_json(os.path.join(folder, 'info.json'), info)
    print('%-36s %4dx%-4d → pločica %dx%d, %d nivoa, %d pločica'
          % (djelo['id'], izvor.width, izvor.height, pw, ph, NIVOA, ukupno))
    return info


def azuriraj_indeks(izlaz, radovi, napravljena):
    """Dodaje/ažurira djela u index.json, redom kao u data/radovi.json."""
    putanja = os.path.join(izlaz, 'index.json')
    if not os.path.exists(putanja):
        putanja_repo = put('img', 'plocice', 'index.json')
        putanja_citanja = putanja_repo if os.path.exists(putanja_repo) else None
    else:
        putanja_citanja = putanja
    if putanja_citanja:
        with open(putanja_citanja, encoding='utf-8') as f:
            indeks = json.load(f)
    else:
        indeks = {'napomena': NAPOMENA_INDEKS, 'djela': []}

    zapisi = {z['id']: z for z in indeks.get('djela', [])}
    for info in napravljena:
        zapisi[info['id']] = {'id': info['id'], 'naziv': info['naziv'],
                              'plocica': info['ukupno_plocica']}
    redosljed = [d['id'] for d in radovi]
    poznati = [zapisi[i] for i in redosljed if i in zapisi]
    ostali = [z for i, z in zapisi.items() if i not in redosljed]
    indeks['djela'] = poznati + ostali
    upisi_json(putanja, indeks)


def main():
    argumenti = sys.argv[1:]
    sve = '--sve' in argumenti
    izlaz = put('img', 'plocice')
    ids = []
    i = 0
    while i < len(argumenti):
        a = argumenti[i]
        if a == '--izlaz':
            if i + 1 >= len(argumenti):
                sys.exit('--izlaz traži folder')
            izlaz = os.path.abspath(argumenti[i + 1])
            i += 2
            continue
        if a != '--sve':
            if a.startswith('-'):
                sys.exit('nepoznata opcija: %s' % a)
            ids.append(a)
        i += 1
    if not ids:
        sys.exit(__doc__)

    with open(put('data', 'radovi.json'), encoding='utf-8') as f:
        radovi = json.load(f)['radovi']
    po_id = {d['id']: d for d in radovi}

    greske = 0
    napravljena = []
    os.makedirs(izlaz, exist_ok=True)
    for id_ in ids:
        djelo = po_id.get(id_)
        if djelo is None:
            print('%s: nema ga u data/radovi.json' % id_, file=sys.stderr)
            greske += 1
            continue
        izvor_rel = djelo.get('slikaVelika') or 'img/radovi/velike/%s.jpg' % id_
        if not os.path.exists(put(izvor_rel)):
            print('%s: nema fotografije %s (prvo alati/izvorne.py)' % (id_, izvor_rel),
                  file=sys.stderr)
            greske += 1
            continue
        folder = os.path.join(izlaz, id_)
        if os.path.exists(folder) and not sve:
            print('%s: %s već postoji, preskačem (--sve da se napravi ponovo)'
                  % (id_, folder), file=sys.stderr)
            greske += 1
            continue
        privremeni = folder + '.tmp'
        shutil.rmtree(privremeni, ignore_errors=True)
        napravljena.append(isijeci(djelo, izvor_rel, privremeni))
        if os.path.exists(folder):
            shutil.rmtree(folder)
        os.replace(privremeni, folder)

    if napravljena:
        azuriraj_indeks(izlaz, radovi, napravljena)
        print('%s: upisano %d djela' % (os.path.join(izlaz, 'index.json'), len(napravljena)))
    sys.exit(1 if greske else 0)


if __name__ == '__main__':
    main()
