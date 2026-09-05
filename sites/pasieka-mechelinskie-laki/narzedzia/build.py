# -*- coding: utf-8 -*-
"""Szkielet serwisu: <head> z kompletem SEO, nagłówek, menu mobilne, stopka,
mobilny pasek akcji. Wszystkie podstrony powstają przez strona()."""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import sztuka

SITE = "/home/user/www1/sites/pasieka-mechelinskie-laki"
BASE = "https://maksymilianbronk-cmyk.github.io/www1/sites/pasieka-mechelinskie-laki/"
TEL = "600 192 252"
TEL_LINK = "tel:+48600192252"
MAPY = "https://maps.google.com/?q=Bukszpanowa+4,+81-198+Mosty"
FB = "https://www.facebook.com/share/1Di826vM5K/"
GOOGLE = "https://share.google/ncXHzOlIbUmtECkNr"

NAWIGACJA = [
    ("miody.html", "Miody", "01"),
    ("miodomat.html", "Miodomat", "02"),
    ("wosk-i-swiece.html", "Wosk i świece", "03"),
    ("o-pasiece.html", "O pasiece", "04"),
    ("kontakt.html", "Kontakt", "05"),
]

FIRMA = {
    "@type": ["LocalBusiness", "Store"],
    "@id": BASE + "#pasieka",
    "name": "Pasieka Mechelińskie Łąki",
    "description": ("Pasieka Marka Kunca znad Zatoki Puckiej. Naturalny miód ze słonawych łąk "
                    "przy rezerwacie Mechelińskie Łąki, wosk pszczeli i świece z węzy. "
                    "Sprzedaż bezpośrednia i miodomat czynny samoobsługowo."),
    "url": BASE,
    "image": BASE + "img/og.jpg",
    "logo": BASE + "img/logo.webp",
    "telephone": "+48600192252",
    "founder": {"@type": "Person", "name": "Marek Kunc"},
    "address": {"@type": "PostalAddress", "streetAddress": "Bukszpanowa 4", "postalCode": "81-198",
                "addressLocality": "Mosty", "addressRegion": "pomorskie", "addressCountry": "PL"},
    "sameAs": [FB, GOOGLE],
    "paymentAccepted": "BLIK",
    "currenciesAccepted": "PLN",
    "identifier": [
        {"@type": "PropertyValue", "name": "Nr WNI", "value": "22114725"},
        {"@type": "PropertyValue", "name": "Nr WET", "value": "22115688"},
    ],
    "hasOfferCatalog": {
        "@type": "OfferCatalog", "name": "Miód, wosk i świece z pasieki",
        "itemListElement": [{"@type": "Offer", "itemOffered": {"@type": "Product", "name": n}}
                            for n in ["Miód wielokwiatowy", "Miód rzepakowy", "Miód lipowy",
                                      "Miód gryczany", "Miód spadziowy", "Miód nawłociowy",
                                      "Świece z wosku pszczelego", "Wosk pszczeli w bloku"]],
    },
}

HEAD = """<!DOCTYPE html>
<html lang="pl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<meta name="description" content="{desc}">
<link rel="canonical" href="{url}">
<meta name="theme-color" content="#0B2E3A">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Pasieka Mechelińskie Łąki">
<meta property="og:locale" content="pl_PL">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{desc}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{og}">
<meta property="og:image:secure_url" content="{og}">
<meta property="og:image:type" content="image/jpeg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="{alt}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{title}">
<meta name="twitter:description" content="{desc}">
<meta name="twitter:image" content="{og}">
<link rel="icon" href="favicon.png" type="image/png">
<link rel="apple-touch-icon" href="apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="preload" as="image" href="img/{hero_img}" fetchpriority="high">
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300;9..144,400;9..144,600;9..144,700&family=Karla:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="css/styl.css">
<script type="application/ld+json">{ld}</script>
</head>
<body>
<a class="pomin" href="#tresc">Przejdź do treści</a>
{sprite}
"""


def naglowek(aktywna):
    linki = "".join(
        '<a href="%s"%s>%s</a>' % (plik, ' class="aktywny"' if plik == aktywna else "", nazwa)
        for plik, nazwa, _ in NAWIGACJA)
    linki_mob = "".join(
        '<a href="%s"><b>%s</b>%s</a>' % (plik, nr, nazwa) for plik, nazwa, nr in NAWIGACJA)
    return """<header class="naglowek" id="naglowek">
  <div class="wrap naglowek-in">
    <a class="marka" href="index.html">
      <img src="img/logo.webp" alt="" width="46" height="46">
      <span>Pasieka Mechelińskie Łąki<small>Miód prosto z pasieki</small></span>
    </a>
    <nav class="menu" aria-label="Menu główne">%s<a class="btn-menu" href="miodomat.html">Kup w miodomacie</a></nav>
    <button class="burger" aria-expanded="false" aria-controls="menu-mobilne" aria-label="Menu"><i></i></button>
  </div>
  <div class="postep" id="postep"></div>
</header>
<div class="menu-mobilne" id="menu-mobilne">
  <nav aria-label="Menu mobilne"><a href="index.html"><b>00</b>Start</a>%s</nav>
  <div class="stopka-menu">
    Bukszpanowa 4, 81-198 Mosty<br>
    tel. i BLIK <a href="%s">%s</a>
  </div>
</div>""" % (linki, linki_mob, TEL_LINK, TEL)


def stopka():
    linki = "".join('<a href="%s">%s</a>' % (p, n) for p, n, _ in NAWIGACJA)
    return """<footer class="stopka">
  <div class="wrap">
    <div class="stopka-uklad">
      <div>
        <img class="stopka-logo" src="img/logo.webp" alt="" width="62" height="62" loading="lazy">
        <div class="stopka-marka">Pasieka Mechelińskie Łąki</div>
        <p>Naturalny miód, wosk pszczeli i świece z węzy znad Zatoki Puckiej.<br>
        Sprzedaż bezpośrednia — Marek Kunc.</p>
      </div>
      <div>
        <h3>Kontakt</h3>
        <p>tel. i BLIK<br><a href="%s">%s</a></p>
        <p>Bukszpanowa 4, 81-198 Mosty<br>gmina Kosakowo, powiat pucki</p>
      </div>
      <div>
        <h3>Strona</h3>
        <nav aria-label="Stopka"><a href="index.html">Strona główna</a>%s</nav>
      </div>
      <div>
        <h3>W sieci</h3>
        <nav aria-label="Profile"><a href="%s" target="_blank" rel="noopener">Facebook</a>
        <a href="%s" target="_blank" rel="noopener">Wizytówka Google</a>
        <a href="%s" target="_blank" rel="noopener">Dojazd w mapach</a></nav>
      </div>
    </div>
    <div class="stopka-dol">
      <span>© <span id="rok">2026</span> Pasieka Mechelińskie Łąki · nr WNI 22114725 · nr WET 22115688</span>
      <span>Sprzedaż bezpośrednia zarejestrowana u powiatowego lekarza weterynarii</span>
    </div>
  </div>
</footer>""" % (TEL_LINK, TEL, linki, FB, GOOGLE, MAPY)


def pasek_akcji():
    return """<nav class="pasek-akcji" aria-label="Szybkie akcje">
  <a class="glowna" href="%s">%s Zadzwoń</a>
  <a href="miodomat.html">%s Miodomat</a>
  <a href="%s" target="_blank" rel="noopener">%s Dojazd</a>
</nav>""" % (TEL_LINK, sztuka.ikona("telefon", "ico"), sztuka.ikona("sloik", "ico"),
             MAPY, sztuka.ikona("pin", "ico"))


LIGHTBOX = """<div class="lightbox" id="lightbox" role="dialog" aria-modal="true" aria-label="Powiększone zdjęcie">
  <button class="lb-zamknij" aria-label="Zamknij">✕</button>
  <button class="lb-poprz" aria-label="Poprzednie zdjęcie">‹</button>
  <img alt="">
  <button class="lb-nast" aria-label="Następne zdjęcie">›</button>
</div>"""


def okruszki(nazwa):
    return ('<p class="okruszki"><a href="index.html">Strona główna</a><span>/</span>%s</p>' % nazwa)


def ld_okruszki(nazwa, url):
    return {"@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": 1, "name": "Strona główna", "item": BASE},
        {"@type": "ListItem", "position": 2, "name": nazwa, "item": url}]}


def ld_faq(pary):
    return {"@type": "FAQPage", "mainEntity": [
        {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}}
        for q, a in pary]}


def faq(pary):
    return '<div class="faq">%s</div>' % "".join(
        "<details><summary>%s</summary><div class=\"faq-odp\"><p>%s</p></div></details>" % (q, a)
        for q, a in pary)


def strona(plik, title, desc, og, alt, hero_img, body, aktywna=None, ld_extra=None):
    url = BASE if plik == "index.html" else BASE + plik
    graf = [FIRMA] + (ld_extra or [])
    html = HEAD.format(
        title=title, desc=desc, url=url, og=BASE + "img/" + og, alt=alt, hero_img=hero_img,
        sprite=sztuka.sprite(),
        ld=json.dumps({"@context": "https://schema.org", "@graph": graf},
                      ensure_ascii=False, separators=(",", ":")))
    html += naglowek(aktywna or plik)
    html += '<main id="tresc">\n%s\n</main>\n' % body
    html += stopka() + "\n" + pasek_akcji() + "\n" + LIGHTBOX + "\n"
    html += '<script src="js/skrypt.js"></script>\n</body>\n</html>\n'
    sciezka = os.path.join(SITE, plik)
    open(sciezka, "w", encoding="utf-8").write(html)
    print("  %-20s %6d B" % (plik, os.path.getsize(sciezka)))
