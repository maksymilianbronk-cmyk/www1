# -*- coding: utf-8 -*-
"""Generator miniatur Open Graph 1200x630 dla każdej podstrony Dormed."""
from PIL import Image, ImageDraw, ImageFont
import os

DST = "/home/user/www1/sites/dormed-busko/assets/img"
W, H = 1200, 630
BORDO = (110, 21, 51)
BORDO_DARK = (51, 9, 26)
INK = (23, 17, 20)
INK_45 = (140, 128, 133)
PAPER = (255, 255, 255)

FB = "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"
FR = "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf"

def f(path, size): return ImageFont.truetype(path, size)

LOGO = Image.open(os.path.join(DST, "logo.png")).convert("RGBA")

def wrap(draw, text, font, max_w):
    words, lines, cur = text.split(), [], ""
    for w_ in words:
        t = (cur + " " + w_).strip()
        if draw.textlength(t, font=font) <= max_w:
            cur = t
        else:
            if cur: lines.append(cur)
            cur = w_
    if cur: lines.append(cur)
    return lines

def card(out, title, subtitle, photo, eyebrow="KLINIKA ZDROWIA I URODY"):
    img = Image.new("RGB", (W, H), PAPER)
    d = ImageDraw.Draw(img)

    # --- prawa kolumna: zdjęcie ---
    PANEL = 660                                  # szerokość lewego panelu
    ph = Image.open(os.path.join(DST, photo)).convert("RGB")
    tw, th = W - PANEL, H
    sc = max(tw / ph.width, th / ph.height)
    ph = ph.resize((max(1, round(ph.width * sc)), max(1, round(ph.height * sc))), Image.LANCZOS)
    x = (ph.width - tw) // 2
    y = int((ph.height - th) * 0.32)
    img.paste(ph.crop((x, y, x + tw, y + th)), (PANEL, 0))

    # miękkie przejście panel → zdjęcie
    grad = Image.new("L", (90, H))
    gd = ImageDraw.Draw(grad)
    for i in range(90):
        gd.line([(i, 0), (i, H)], fill=int(255 * (1 - i / 90)))
    img.paste(Image.new("RGB", (90, H), PAPER), (PANEL, 0), grad)

    # --- lewy panel ---
    d.rectangle([0, 0, 10, H], fill=BORDO)        # pionowy akcent marki

    lg = LOGO.copy()
    lgw = 176
    lg = lg.resize((lgw, round(LOGO.height * lgw / LOGO.width)), Image.LANCZOS)
    img.paste(lg, (58, 44), lg)

    y = 44 + lg.height + 18
    d.text((58, y), eyebrow, font=f(FB, 17), fill=BORDO)
    y += 42

    fT = f(FB, 56)
    for line in wrap(d, title, fT, PANEL - 120)[:3]:
        d.text((58, y), line, font=fT, fill=INK)
        y += 66

    y += 10
    fS = f(FR, 24)
    for line in wrap(d, subtitle, fS, PANEL - 120)[:3]:
        d.text((58, y), line, font=fS, fill=(87, 75, 80))
        y += 34

    # stopka panelu
    d.line([(58, H - 96), (PANEL - 70, H - 96)], fill=(236, 230, 228), width=1)
    d.text((58, H - 76), "Busko-Zdrój  ·  ul. Jana Rokosza 5  ·  tel. 41 378 23 18",
           font=f(FR, 21), fill=INK_45)

    img.save(os.path.join(DST, out), "JPEG", quality=88, optimize=True, progressive=True)
    print("  %-28s %s kB" % (out, os.path.getsize(os.path.join(DST, out)) // 1024))

CARDS = [
    ("og.jpg", "Klinika Zdrowia i Urody w sercu uzdrowiska",
     "Rehabilitacja, balneologia, medycyna estetyczna i kosmetologia — od 1991 roku.",
     "gabinet-masazu.jpg"),
    ("og-osrodek.jpg", "Ośrodek i pokoje",
     "10 komfortowych pokoi z własną łazienką, Wi-Fi i bezpłatnym parkingiem.",
     "budynek-dormed.jpg"),
    ("og-rehabilitacja.jpg", "Rehabilitacja i balneologia",
     "Laser, magnetoterapia 3 T, krioterapia oraz kąpiele siarczkowe i borowinowe.",
     "kapiel-balneologia.jpg"),
    ("og-medycyna-estetyczna.jpg", "Medycyna estetyczna",
     "Kwas hialuronowy, nici liftingujące, botoks i mezoterapia — u lekarza.",
     "ba-usta-po.jpg"),
    ("og-kosmetologia.jpg", "Kosmetologia, laser i podologia",
     "GENEO, PQ Age, peelingi, modelowanie sylwetki, makijaż permanentny.",
     "presoterapia.jpg"),
    ("og-masaze-orientalne.jpg", "Masaże i rytuały orientalne",
     "REFLEXOLOGIC, masaż marokański, jadeitowy i turmalinowy.",
     "masaz-orientalny.jpg"),
    ("og-pakiety.jpg", "Pakiety i pobyty",
     "Rehabilitacja Lecznicza 5 dni z 20 zabiegami, weekend regeneracyjny, pobyt seniorski.",
     "wanna-chromoterapia.jpg"),
    ("og-cennik.jpg", "Cennik zabiegów",
     "Fizykoterapia, balneologia, masaże, kosmetologia, podologia i medycyna estetyczna.",
     "laser-wysokoenergetyczny.jpg"),
    ("og-o-nas.jpg", "O klinice",
     "Dormed Medical SPA — dr n. med. Dorota Sagan. Działamy nieprzerwanie od 1991 roku.",
     "dr-dorota-sagan.jpg"),
    ("og-kontakt.jpg", "Kontakt i rezerwacja",
     "ul. Jana Rokosza 5, Busko-Zdrój. Rezerwacje bez skierowania.",
     "budynek-dormed.jpg"),
]

print("Miniatury Open Graph 1200x630:")
for out, title, sub, photo in CARDS:
    card(out, title, sub, photo)
print("gotowe:", len(CARDS))
