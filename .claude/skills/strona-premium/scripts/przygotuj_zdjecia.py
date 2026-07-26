# -*- coding: utf-8 -*-
"""Przygotowanie oryginalnych zdjęć Dormed do folderu assets/img/."""
from PIL import Image
import numpy as np, os, shutil

SRC = "/root/.claude/uploads/4854cd80-dbd2-5691-9fae-077bdacf7c7d"
DST = "/home/user/www1/sites/dormed-busko/assets/img"
os.makedirs(DST, exist_ok=True)

def trim_white(im, thr=240):
    """Obetnij białą ramkę kolażu."""
    g = np.asarray(im.convert("L"), dtype=float)
    h, w = g.shape
    rows = g.mean(axis=1); cols = g.mean(axis=0)
    t = 0
    while t < h // 3 and rows[t] > thr: t += 1
    b = h - 1
    while b > h * 2 // 3 and rows[b] > thr: b -= 1
    l = 0
    while l < w // 3 and cols[l] > thr: l += 1
    r = w - 1
    while r > w * 2 // 3 and cols[r] > thr: r -= 1
    return im.crop((l, t, r + 1, b + 1))

def save(im, name, max_w=1800, q=84):
    im = im.convert("RGB")
    if im.width > max_w:
        im = im.resize((max_w, round(im.height * max_w / im.width)), Image.LANCZOS)
    im.save(os.path.join(DST, name), "JPEG", quality=q, optimize=True, progressive=True)
    kb = os.path.getsize(os.path.join(DST, name)) // 1024
    print("  %-34s %-12s %4d kB" % (name, im.size, kb))

def pair(src, name_a, name_b, axis, cut_lo, cut_hi, max_w=1100):
    """Rozetnij kolaż przed/po na dwa pliki tej samej wielkości."""
    im = trim_white(Image.open(os.path.join(SRC, src)))
    w, h = im.size
    # przelicz punkty cięcia po obcięciu ramki (przybliżenie: proporcjonalnie)
    if axis == "h":
        a = im.crop((0, 0, w, cut_lo)); b = im.crop((0, cut_hi, w, h))
    else:
        a = im.crop((0, 0, cut_lo, h)); b = im.crop((cut_hi, 0, w, h))
    side = min(a.size[0], b.size[0]), min(a.size[1], b.size[1])
    a = a.crop((0, 0, side[0], side[1])); b = b.crop((0, 0, side[0], side[1]))
    save(a, name_a, max_w); save(b, name_b, max_w)

print("Logo:")
shutil.copy(os.path.join(SRC, "af52fa6e-1000053150.png"), os.path.join(DST, "logo.png"))
lg = Image.open(os.path.join(DST, "logo.png"))
print("  logo.png", lg.size, lg.mode)
# wersja 2x do ekranów Retina (upscale LANCZOS ze źródła 300px)
lg.resize((lg.width * 3, lg.height * 3), Image.LANCZOS).save(os.path.join(DST, "logo@3x.png"))

print("Zdjęcia obiektu i zabiegów:")
save(trim_white(Image.open(os.path.join(SRC, "57075600-1000053151.jpg"))), "budynek-dormed.jpg", 1200)
save(Image.open(os.path.join(SRC, "7b84587b-1000053158.jpg")), "gabinet-masazu.jpg", 1600)
save(Image.open(os.path.join(SRC, "7738e289-1000053167.jpg")), "kapiel-balneologia.jpg", 1100)
save(trim_white(Image.open(os.path.join(SRC, "881df17c-1000053166.jpg"))), "presoterapia.jpg", 1300)
save(trim_white(Image.open(os.path.join(SRC, "bd987bcd-1000053163.jpg"))), "laser-wysokoenergetyczny.jpg", 1300)
save(Image.open(os.path.join(SRC, "07127a31-1000053162.jpg")), "pst-urzadzenie.jpg", 1300)
save(trim_white(Image.open(os.path.join(SRC, "0a7153e1-1000053161.jpg"))), "detoks-stop.jpg", 1300)
save(Image.open(os.path.join(SRC, "a13d70c5-1000053155.jpg")), "masaz-kark.jpg", 1300)
save(trim_white(Image.open(os.path.join(SRC, "d320e15b-1000053154.jpg"))), "masaz-plecy.jpg", 900)
save(Image.open(os.path.join(SRC, "7123509c-1000053152.jpg")), "plakat-pst.jpg", 900)

# z plakatu Relax wycinamy samo zdjęcie masażu (górna część)
rel = Image.open(os.path.join(SRC, "8a4afae1-1000053153.jpg"))
save(rel.crop((40, 120, rel.width - 40, 780)), "masaz-orientalny.jpg", 1600)
save(rel, "plakat-relax.jpg", 1000)

print("Metamorfozy przed/po (rozcięte kolaże):")
pair("8df90bbe-1000053171.jpg", "ba-usta-przed.jpg",       "ba-usta-po.jpg",       "h", 470, 500)
pair("7c2283c0-1000053169.jpg", "ba-usta2-przed.jpg",      "ba-usta2-po.jpg",      "h", 470, 486)
pair("738889d2-1000053168.jpg", "ba-oko-przed.jpg",        "ba-oko-po.jpg",        "h", 470, 486)
pair("d9697551-1000053170.jpg", "ba-zmarszczki-przed.jpg", "ba-zmarszczki-po.jpg", "v", 462, 494)

# miniatura Open Graph 1200x630 z budynku
b = Image.open(os.path.join(DST, "budynek-dormed.jpg"))
sc = max(1200 / b.width, 630 / b.height)
b2 = b.resize((round(b.width * sc), round(b.height * sc)), Image.LANCZOS)
x = (b2.width - 1200) // 2; y = int((b2.height - 630) * 0.32)
save(b2.crop((x, y, x + 1200, y + 630)), "og.jpg", 1200, 82)

print("\nRAZEM:", len(os.listdir(DST)), "plików,",
      sum(os.path.getsize(os.path.join(DST, f)) for f in os.listdir(DST)) // 1024, "kB")
