#!/usr/bin/env python3
"""
Generator obrazów dla strony testowej (Poziom 1 wg claude-image-generation:
rysowanie graficzne kodem, bez klucza API — Pillow + NumPy).

Uruchomienie:
    pip install Pillow numpy
    python3 gen_images.py

Tworzy pliki PNG w folderze img/.
"""
import math
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

W, H = 1200, 800
OUT = "img"


def load_font(size, bold=False):
    candidates = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold
        else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ]
    for path in candidates:
        try:
            return ImageFont.truetype(path, size)
        except OSError:
            continue
    return ImageFont.load_default()


def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def diagonal_gradient(size, c1, c2):
    w, h = size
    y, x = np.mgrid[0:h, 0:w]
    t = (x + y) / (w + h)
    arr = np.zeros((h, w, 3), dtype=np.uint8)
    for i in range(3):
        arr[..., i] = (c1[i] + (c2[i] - c1[i]) * t).astype(np.uint8)
    return Image.fromarray(arr, "RGB")


# ---------------------------------------------------------------------------
# 1) Plakat gradientowy z typografią
# ---------------------------------------------------------------------------
def gen_hero():
    img = diagonal_gradient((W, H), np.array([28, 20, 60]), np.array([214, 64, 120]))
    draw = ImageDraw.Draw(img, "RGBA")

    # miękkie świecące kręgi
    for cx, cy, r, col in [
        (250, 200, 260, (255, 200, 90, 40)),
        (980, 620, 320, (90, 200, 255, 45)),
        (700, 120, 180, (255, 255, 255, 25)),
    ]:
        draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=col)
    img = img.filter(ImageFilter.GaussianBlur(2))

    draw = ImageDraw.Draw(img, "RGBA")
    f_big = load_font(120, bold=True)
    f_mid = load_font(38)
    f_small = load_font(26)

    draw.text((80, 300), "STRONA", font=f_big, fill=(255, 255, 255, 255))
    draw.text((80, 420), "TESTOWA", font=f_big, fill=(255, 224, 130, 255))
    draw.text((84, 250), "generowane kodem · bez API", font=f_small,
              fill=(255, 255, 255, 180))
    draw.text((84, 570), "Pillow + NumPy · Poziom 1", font=f_mid,
              fill=(255, 255, 255, 220))
    img.save(f"{OUT}/hero.png")


# ---------------------------------------------------------------------------
# 2) Pole przepływu (flow field) — cząsteczki
# ---------------------------------------------------------------------------
def gen_flowfield():
    rng = np.random.default_rng(7)
    img = Image.new("RGB", (W, H), (10, 12, 24))
    draw = ImageDraw.Draw(img, "RGBA")

    def field(x, y):
        return (math.sin(x * 0.004) + math.cos(y * 0.004)) * math.pi

    palette = [(255, 122, 26), (47, 140, 255), (67, 217, 184), (255, 107, 157)]
    for k in range(1400):
        x = rng.uniform(0, W)
        y = rng.uniform(0, H)
        col = palette[k % len(palette)]
        for _ in range(28):
            a = field(x, y)
            nx, ny = x + math.cos(a) * 6, y + math.sin(a) * 6
            draw.line([x, y, nx, ny], fill=(*col, 55), width=1)
            x, y = nx, ny
            if not (0 <= x < W and 0 <= y < H):
                break
    img = img.filter(ImageFilter.GaussianBlur(0.4))
    img.save(f"{OUT}/flowfield.png")


# ---------------------------------------------------------------------------
# 3) Geometria — koncentryczne wielokąty
# ---------------------------------------------------------------------------
def gen_geo():
    img = diagonal_gradient((W, H), np.array([8, 10, 18]), np.array([20, 30, 46]))
    draw = ImageDraw.Draw(img, "RGBA")
    cx, cy = W / 2, H / 2
    c1, c2 = (255, 122, 26), (47, 140, 255)
    rings = 42
    for i in range(rings):
        t = i / rings
        r = 40 + i * 12
        sides = 6
        rot = i * 0.14
        pts = [
            (cx + r * math.cos(rot + 2 * math.pi * s / sides),
             cy + r * math.sin(rot + 2 * math.pi * s / sides))
            for s in range(sides)
        ]
        col = lerp(c1, c2, t)
        draw.polygon(pts, outline=(*col, 200))
    img.save(f"{OUT}/geo.png")


if __name__ == "__main__":
    import os
    os.makedirs(OUT, exist_ok=True)
    gen_hero()
    gen_flowfield()
    gen_geo()
    print("OK — obrazy w", OUT)
