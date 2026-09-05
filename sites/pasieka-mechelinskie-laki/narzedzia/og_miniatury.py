# -*- coding: utf-8 -*-
"""Miniatury Open Graph 1200x630 dla Pasieki Mechelińskie Łąki.
Skład: ciemny panel w kolorze morza + logo + tytuł, po prawej zdjęcie z pakietu."""
from PIL import Image, ImageDraw, ImageFont, ImageOps
import os

SITE = "/home/user/www1/sites/pasieka-mechelinskie-laki"
IMG = os.path.join(SITE, "img")
W, H = 1200, 630
MORZE = (11, 46, 58)
MIOD = (208, 138, 21)
MIOD_JASNY = (240, 190, 85)
KREM = (247, 238, 222)
CICHY = (198, 182, 156)

FS = "/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf"
FN = "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf"
FB = "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"
f = lambda p, s: ImageFont.truetype(p, s)

LOGO = Image.open(os.path.join(IMG, "logo.webp")).convert("RGBA")


def kolo(im, rozmiar):
    im = ImageOps.fit(im, (rozmiar, rozmiar), Image.LANCZOS)
    maska = Image.new("L", (rozmiar * 4, rozmiar * 4), 0)
    ImageDraw.Draw(maska).ellipse((0, 0, rozmiar * 4 - 1, rozmiar * 4 - 1), fill=255)
    im.putalpha(maska.resize((rozmiar, rozmiar), Image.LANCZOS))
    return im


def zawin(d, tekst, font, maks):
    slowa, linie, biezaca = tekst.split(), [], ""
    for w in slowa:
        probna = (biezaca + " " + w).strip()
        if d.textlength(probna, font=font) <= maks:
            biezaca = probna
        else:
            if biezaca:
                linie.append(biezaca)
            biezaca = w
    if biezaca:
        linie.append(biezaca)
    return linie


def karta(plik, tytul, podtytul, zdjecie):
    img = Image.new("RGB", (W, H), MORZE)
    d = ImageDraw.Draw(img)
    PANEL = 700

    foto = Image.open(os.path.join(IMG, zdjecie)).convert("RGB")
    tw, th = W - PANEL, H
    sc = max(tw / foto.width, th / foto.height)
    foto = foto.resize((max(1, round(foto.width * sc)), max(1, round(foto.height * sc))), Image.LANCZOS)
    x = (foto.width - tw) // 2
    y = int((foto.height - th) * 0.35)
    img.paste(foto.crop((x, y, x + tw, y + th)), (PANEL, 0))

    # miękkie przejście panel → zdjęcie
    grad = Image.new("L", (120, H))
    gd = ImageDraw.Draw(grad)
    for i in range(120):
        gd.line([(i, 0), (i, H)], fill=int(255 * (1 - i / 120) ** 1.3))
    img.paste(Image.new("RGB", (120, H), MORZE), (PANEL, 0), grad)

    d.rectangle([0, 0, 9, H], fill=MIOD)                       # pionowy akcent

    lg = kolo(LOGO, 132)
    img.paste(lg, (58, 46), lg)

    d.text((208, 62), "PASIEKA", font=f(FB, 22), fill=MIOD_JASNY)
    d.text((208, 96), "MECHELIŃSKIE ŁĄKI", font=f(FB, 22), fill=MIOD_JASNY)
    d.text((208, 132), "miód prosto z pasieki", font=f(FN, 20), fill=CICHY)

    yy = 232
    fT = f(FS, 58)
    for linia in zawin(d, tytul, fT, PANEL - 120)[:3]:
        d.text((58, yy), linia, font=fT, fill=KREM)
        yy += 70

    yy += 14
    fP = f(FN, 25)
    for linia in zawin(d, podtytul, fP, PANEL - 130)[:3]:
        d.text((58, yy), linia, font=fP, fill=(214, 199, 173))
        yy += 36

    d.line([(58, H - 92), (PANEL - 110, H - 92)], fill=(60, 100, 114), width=1)
    d.text((58, H - 72), "Bukszpanowa 4, Mosty  ·  tel. i BLIK 600 192 252",
           font=f(FN, 22), fill=MIOD_JASNY)

    sciezka = os.path.join(IMG, plik)
    img.save(sciezka, "JPEG", quality=86, optimize=True, progressive=True)
    print("  %-22s %s kB" % (plik, os.path.getsize(sciezka) // 1024))


KARTY = [
    ("og.jpg", "Miód z łąk nad samą zatoką",
     "Naturalny miód, wosk pszczeli i świece z węzy znad Zatoki Puckiej.", "pszczelarz.webp"),
    ("og-miody.jpg", "Miody tego sezonu",
     "Od jasnego rzepakowego po ciemną grykę — odmiany w rytm kwitnienia.", "sloiki-okno.webp"),
    ("og-miodomat.jpg", "Miodomat w Mostach",
     "Automat z miodem przy Bukszpanowej 4. Bierzesz słoik, płacisz BLIK-iem.", "miodomat.webp"),
    ("og-wosk.jpg", "Wosk pszczeli i świece",
     "Świece rolowane z węzy, szyszki z formy i czysty wosk w bloku.", "swiece.webp"),
    ("og-pasieka.jpg", "Pasieka nad Zatoką Pucką",
     "Ule przy rezerwacie Mechelińskie Łąki — 113 hektarów słonawych łąk.", "pszczola-etykieta.webp"),
    ("og-kontakt.jpg", "Kontakt",
     "Marek Kunc, Bukszpanowa 4, 81-198 Mosty. Telefon i BLIK: 600 192 252.", "stoisko.webp"),
]

print("Miniatury Open Graph 1200x630:")
for k in KARTY:
    karta(*k)
print("gotowe:", len(KARTY))
