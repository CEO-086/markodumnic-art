#!/usr/bin/env python3
"""Verzije CSS i JS fajlova u adresama: css/base.css?v=<heš sadržaja>.

Pokretanje iz korijena sajta:  python3 alati/verzije.py
Pokrenuti poslije svake izmjene u css/ ili js/, prije commita.

Zašto: HTML se ne kešira (stiže odmah), ali CSS i JS se keširaju
(GitHub Pages 10 minuta, _headers/vercel.json sat vremena). Bez verzije
telefon dobije novu stranicu sa starim stilom i raspored se izmiješa.
Sa heš-om sadržaja u adresi, izmijenjen fajl = nova adresa, pa stari
keš ne smeta; neizmijenjen fajl zadržava adresu i keš.

Dira samo <link href> i <script src> ka našim css/*.css i js/*.js,
i u podfolderima (js/galerija/*.js — dijelovi galerije). vendor/ ne —
tamo je verzija u zaključanoj biblioteci. Idempotentno.

Svaki fajl dobija heš SVOG sadržaja. Dijelovi galerije su klasične
skripte (ne ES moduli), pa među njima nema unutrašnjih adresa
(import '…') koje bi i same trebalo verzionisati: jedine adrese ka
njima su <script src> u galerija.html (ME/EN/IT), a njih piše ovaj alat.

  --provjeri   ništa ne upisuje; izlazi sa greškom ako neka stranica nema
               ažuran ?v=, ili ako je neki fajl iz js/galerija/ i
               css/galerija.css uključen bez ?v= ili mimo ovog alata
               (keširaju se "immutable" na godinu — vidi _headers i
               vercel.json).
"""
import hashlib
import os
import re
import sys

KORIJEN = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# Keširaju se "immutable" na godinu (vercel.json, _headers): svaka veza ka
# njima MORA nositi ažuran ?v=, inače bi posjetilac godinu dana imao staru
# kopiju. --provjeri zato gleda i veze koje VEZA ne hvata (jednostruki
# navodnici, bez navodnika, apsolutna adresa).
NEPROMJENLJIVO = re.compile(r'(?:js/galerija/[\w.-]+\.js|css/galerija\.css)')
ATRIBUT = re.compile(r'''\b(?:href|src)\s*=\s*(["']?)([^"'\s>]*)''')
VEZA = re.compile(r'((?:href|src)=")((?:\.\./|/)*)((?:css|js)/(?:[\w-]+/)*[\w.-]+\.(?:css|js))(?:\?v=[0-9a-f]+)?(")')


def hes(rel, keš={}):
    if rel not in keš:
        with open(os.path.join(KORIJEN, rel), 'rb') as f:
            keš[rel] = hashlib.sha1(f.read()).hexdigest()[:10]
    return keš[rel]


def main():
    provjeri = '--provjeri' in sys.argv
    izmijenjeno = 0
    for d, poddir, fajlovi in os.walk(KORIJEN):
        poddir[:] = [p for p in poddir if not p.startswith('.') and p not in ('vendor', 'node_modules', 'alati', 'testovi')]
        for ime in fajlovi:
            if not ime.endswith('.html'):
                continue
            put = os.path.join(d, ime)
            with open(put, encoding='utf-8') as f:
                s = f.read()

            def zamijeni(m):
                rel = m.group(3)
                if not os.path.exists(os.path.join(KORIJEN, rel)):
                    return m.group(0)
                return '%s%s%s?v=%s%s' % (m.group(1), m.group(2), rel, hes(rel), m.group(4))

            novo = VEZA.sub(zamijeni, s)
            if provjeri:
                for m in ATRIBUT.finditer(s):
                    vr = m.group(2)
                    n = NEPROMJENLJIVO.search(vr)
                    if not n:
                        continue
                    rel = n.group(0)
                    dobro = (m.group(1) == '"' and re.fullmatch(r'(?:\.\./|/)*', vr[:n.start()]) is not None
                             and vr[n.end():] == '?v=' + hes(rel) and os.path.exists(os.path.join(KORIJEN, rel)))
                    if not dobro:
                        print('veza bez ažurnog ?v= (immutable!):', os.path.relpath(put, KORIJEN), vr)
                        izmijenjeno += 1
            if novo != s and provjeri:
                print('zastarjela verzija:', os.path.relpath(put, KORIJEN))
                izmijenjeno += 1
            elif novo != s:
                with open(put, 'w', encoding='utf-8') as f:
                    f.write(novo)
                izmijenjeno += 1
    if provjeri:
        sys.exit(1 if izmijenjeno else 0)
    print('verzije upisane u %d stranica' % izmijenjeno)


if __name__ == '__main__':
    main()
