#!/usr/bin/env python3
"""Prepravlja apsolutne adrese („/css/…”, „/favicon.svg”) za sajt u podfolderu.

Pokretanje:  python3 alati/podputanja.py <folder sajta> <podfolder>
Primjer:     python3 alati/podputanja.py _site /markodumnic-art

Izvorni kod koristi adrese od korijena domena (markodumnic.art/…), što je
ispravno za pravi domen. GitHub Pages bez domena služi sajt pod
ceo-086.github.io/markodumnic-art/, pa bi „/favicon.svg” i stranice 404
tražile fajlove van sajta. Ovo se pokreće SAMO u objavi (.github/workflows/
pages.yml) nad kopijom za objavu; repo ostaje nepromijenjen. Prazan
podfolder ili „/” ne mijenja ništa.
"""
import os, re, sys

ATRIBUT = re.compile(r'(\s(?:href|src|action|poster)=")/(?!/)')
MANIFEST = re.compile(r'("(?:start_url|scope|src)"\s*:\s*")/(?!/)')


def main():
    folder, pod = sys.argv[1], sys.argv[2].rstrip('/')
    if not pod:
        print('podfolder je prazan — ništa se ne mijenja')
        return
    promjena = 0
    for koren, _, fajlovi in os.walk(folder):
        for ime in fajlovi:
            if ime.endswith('.html'):
                obrazac = ATRIBUT
            elif ime.endswith('.webmanifest'):
                obrazac = MANIFEST
            else:
                continue
            put = os.path.join(koren, ime)
            with open(put, encoding='utf-8') as f:
                tekst = f.read()
            novi, n = obrazac.subn(lambda m: m.group(1) + pod + '/', tekst)
            if n:
                with open(put, 'w', encoding='utf-8') as f:
                    f.write(novi)
                promjena += n
    print('prepravljeno adresa: %d (podfolder %s)' % (promjena, pod))


if __name__ == '__main__':
    main()
