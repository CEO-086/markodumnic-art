#!/usr/bin/env python3
"""Prekidač jezika (zastavice) i hreflang za sve stranice.

Pokretanje iz korijena sajta:  python3 alati/jezik.py
Crnogorske stranice su u korijenu, engleske iste putanje pod en/,
italijanske pod it/.
Blok prekidača stoji između <!-- jezik --> i <!-- /jezik --> u zaglavlju,
a hreflang veze između <!-- hreflang --> i <!-- /hreflang --> u <head>.
Skripta je idempotentna: svako pokretanje prepiše oba bloka.
"""
import os, re, sys

DOMEN = 'https://markodumnic.art/'
KORIJEN = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

ZASTAVA_ME = ('<svg class="jezik__zastava" viewBox="0 0 30 20" aria-hidden="true" focusable="false">'
              '<rect width="30" height="20" fill="#C40308"/>'
              '<rect x="0.6" y="0.6" width="28.8" height="18.8" fill="none" stroke="#D3AE3B" stroke-width="1.2"/>'
              '<path fill="#D3AE3B" d="M15 4.6l1 1.5 3.4-1.7-1.1 3.3 2.4-.6-2.3 3.2-1.9.4.9 2.9-2.4-1.3-2.4 1.3.9-2.9-1.9-.4-2.3-3.2 2.4.6-1.1-3.3 3.4 1.7z"/>'
              '</svg>')
ZASTAVA_EN = ('<svg class="jezik__zastava" viewBox="0 0 60 30" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">'
              '<clipPath id="jezik-uk"><path d="M30 15h30v15zv15H0zH0V0zV0h30z"/></clipPath>'
              '<path d="M0 0v30h60V0z" fill="#012169"/>'
              '<path d="M0 0l60 30m0-30L0 30" stroke="#fff" stroke-width="6"/>'
              '<path d="M0 0l60 30m0-30L0 30" clip-path="url(#jezik-uk)" stroke="#C8102E" stroke-width="4"/>'
              '<path d="M30 0v30M0 15h60" stroke="#fff" stroke-width="10"/>'
              '<path d="M30 0v30M0 15h60" stroke="#C8102E" stroke-width="6"/>'
              '</svg>')
ZASTAVA_IT = ('<svg class="jezik__zastava" viewBox="0 0 30 20" aria-hidden="true" focusable="false">'
              '<rect width="10" height="20" fill="#009246"/>'
              '<rect x="10" width="10" height="20" fill="#F1F2F1"/>'
              '<rect x="20" width="10" height="20" fill="#CE2B37"/>'
              '</svg>')

def stranice():
    for d, _, fajlovi in os.walk(KORIJEN):
        rel_d = os.path.relpath(d, KORIJEN)
        if rel_d.split(os.sep)[0] in ('vendor', 'alati', 'node_modules', '.git'):
            continue
        for f in fajlovi:
            if f.endswith('.html'):
                yield os.path.normpath(os.path.join(rel_d, f))

def obradi(rel):
    put = os.path.join(KORIJEN, rel)
    s = open(put, encoding='utf-8').read()
    prvi = rel.split(os.sep)[0]
    jezik = prvi if prvi in ('en', 'it') else 'me'
    stranica = rel[3:] if jezik != 'me' else rel          # putanja bez en/ ili it/
    dubina = rel.count(os.sep)
    gore = '../' * dubina
    href = {'me': gore + stranica.replace(os.sep, '/'),
            'en': gore + 'en/' + stranica.replace(os.sep, '/'),
            'it': gore + 'it/' + stranica.replace(os.sep, '/')}
    javno = stranica.replace(os.sep, '/')
    if javno == 'index.html':
        javno = ''
    elif javno.endswith('.html'):
        javno = javno[:-5]          # čisti URL-ovi (cleanUrls na Vercelu, Pages to radi sam)
    if stranica == '404.html':
        # 404 se servira sa bilo koje dubine — veze moraju biti apsolutne
        href = {'me': '/', 'en': '/en', 'it': '/it'}

    # Na telefonu (uz hamburger) prekidač je dugme sa zastavom trenutnog
    # jezika i strelicom koje otvara listu; od 820px su veze u nizu.
    strelica = ('<svg class="jezik__strelica" viewBox="0 0 10 6" aria-hidden="true" focusable="false">'
                '<path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>')
    kvacica = ('<svg class="jezik__kvacica" viewBox="0 0 12 10" aria-hidden="true" focusable="false">'
               '<path d="M1 5l3.5 3.5L11 1" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>')
    zastave = {'me': ZASTAVA_ME, 'en': ZASTAVA_EN, 'it': ZASTAVA_IT}
    zastava_dugme = (ZASTAVA_EN.replace('jezik-uk', 'jezik-uk-d') if jezik == 'en' else zastave[jezik])
    dugme_tekst = {'me': ' Jezik: crnogorski. Promijeni jezik',
                   'en': ' Language: English. Change language',
                   'it': ' Lingua: italiano. Cambia lingua'}[jezik]
    lista_ime = {'me': 'Jezik', 'en': 'Language', 'it': 'Lingua'}[jezik]
    veze = ''
    for kod, hl, lang, ime in (('me', 'sr-ME', 'sr-Latn-ME', 'Crnogorski'),
                               ('en', 'en', 'en', 'English'),
                               ('it', 'it', 'it', 'Italiano')):
        veze += ('        <a class="jezik__veza" href="%s" hreflang="%s" lang="%s"%s>%s<span class="jezik__kod">%s</span><span class="jezik__ime">%s</span>%s</a>\n' % (
            href[kod], hl, lang, ' aria-current="true"' if kod == jezik else '', zastave[kod], kod.upper(), ime, kvacica))
    blok = ('<!-- jezik -->\n'
            '    <div class="jezik">\n'
            '      <button class="jezik__dugme" type="button" aria-expanded="false" aria-controls="jezik-lista">%s<span class="jezik__kod">%s</span>%s<span class="vizuelno-skriveno">%s</span></button>\n'
            '      <nav class="jezik__lista" id="jezik-lista" aria-label="%s">\n'
            '%s'
            '      </nav>\n'
            '    </div>\n'
            '    <!-- /jezik -->') % (zastava_dugme, jezik.upper(), strelica, dugme_tekst, lista_ime, veze)
    if '<!-- jezik -->' in s:
        s = re.sub(r'<!-- jezik -->.*?<!-- /jezik -->', lambda m: blok, s, flags=re.S)
    else:
        m = re.search(r'(<nav class="navigacija"[^>]*>.*?</nav>)', s, flags=re.S)
        if m:
            s = s[:m.end()] + '\n\n    ' + blok + s[m.end():]

    # hreflang: Google traži ISO 639-1, pa sr-ME umjesto cnr (na <html> je lang="sr-Latn-ME": čitači ekrana nemaju glas za cnr).
    url = {'me': DOMEN + javno,
           'en': DOMEN + ('en/' + javno if javno else 'en'),   # /en/ bi Vercel preusmjerio na /en
           'it': DOMEN + ('it/' + javno if javno else 'it')}
    vlastiti = url[jezik]
    noindex = 'name="robots" content="noindex' in s
    lokal = {'me': 'sr_ME', 'en': 'en_GB', 'it': 'it_IT'}
    hreflang = ('<!-- hreflang -->\n'
                '<link rel="alternate" hreflang="sr-ME" href="%s">\n'
                '<link rel="alternate" hreflang="en" href="%s">\n'
                '<link rel="alternate" hreflang="it" href="%s">\n'
                '<link rel="alternate" hreflang="x-default" href="%s">\n') % (url['me'], url['en'], url['it'], url['me'])
    if not noindex:
        hreflang += '<link rel="canonical" href="%s">\n' % vlastiti
    hreflang += ('<meta property="og:url" content="%s">\n'
                 '<meta property="og:locale" content="%s">\n') % (vlastiti, lokal[jezik])
    for kod in ('me', 'en', 'it'):
        if kod != jezik:
            hreflang += '<meta property="og:locale:alternate" content="%s">\n' % lokal[kod]
    hreflang += '<!-- /hreflang -->'
    if '<!-- hreflang -->' in s:
        s = re.sub(r'<!-- hreflang -->.*?<!-- /hreflang -->', lambda m: hreflang, s, flags=re.S)
    elif '</head>' in s and not rel.endswith('404.html'):
        s = s.replace('</head>', hreflang + '\n</head>', 1)
    open(put, 'w', encoding='utf-8').write(s)

if __name__ == '__main__':
    for rel in sorted(stranice()):
        obradi(rel)
        print('ok', rel)
