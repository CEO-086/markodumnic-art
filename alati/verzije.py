#!/usr/bin/env python3
"""Verzije CSS i JS fajlova u adresama: css/base.css?v=<heš sadržaja>.

Pokretanje iz korijena sajta:  python3 alati/verzije.py
Pokrenuti poslije svake izmjene u css/ ili js/, prije commita.

Zašto: HTML se ne kešira (stiže odmah), ali CSS i JS se keširaju
(GitHub Pages 10 minuta, _headers/vercel.json sat vremena). Bez verzije
telefon dobije novu stranicu sa starim stilom i raspored se izmiješa.
Sa heš-om sadržaja u adresi, izmijenjen fajl = nova adresa, pa stari
keš ne smeta; neizmijenjen fajl zadržava adresu i keš.

Dira samo <link href> i <script src> ka našim css/*.css i js/*.js
(vendor/ ne — tamo je verzija u zaključanoj biblioteci). Idempotentno.
"""
import hashlib
import os
import re

KORIJEN = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VEZA = re.compile(r'((?:href|src)=")((?:\.\./|/)*)((?:css|js)/[\w.-]+\.(?:css|js))(?:\?v=[0-9a-f]+)?(")')


def hes(rel, keš={}):
    if rel not in keš:
        with open(os.path.join(KORIJEN, rel), 'rb') as f:
            keš[rel] = hashlib.sha1(f.read()).hexdigest()[:10]
    return keš[rel]


def main():
    izmijenjeno = 0
    for d, poddir, fajlovi in os.walk(KORIJEN):
        poddir[:] = [p for p in poddir if not p.startswith('.') and p not in ('vendor', 'node_modules', 'alati')]
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
            if novo != s:
                with open(put, 'w', encoding='utf-8') as f:
                    f.write(novo)
                izmijenjeno += 1
    print('verzije upisane u %d stranica' % izmijenjeno)


if __name__ == '__main__':
    main()
