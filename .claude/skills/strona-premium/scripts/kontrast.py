#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Kalkulator kontrastu WCAG. Użycie: python3 kontrast.py '#574B50' '#FFFFFF'
albo bez argumentów — sprawdza całą przykładową paletę."""
import sys

def lum(h):
    h = h.lstrip('#')
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    c = [(x / 12.92 if x <= 0.03928 else ((x + 0.055) / 1.055) ** 2.4) for x in c]
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]

def cr(a, b):
    la, lb = lum(a), lum(b)
    hi, lo = max(la, lb), min(la, lb)
    return (hi + 0.05) / (lo + 0.05)

def ocen(r):
    return "AAA" if r >= 7 else ("AA" if r >= 4.5 else ("AA-duzy" if r >= 3 else "PONIZEJ AA"))

def biel(pct, tlo):
    """Kolor bieli o zadanym kryciu zmieszany z tłem — do tekstu na ciemnym."""
    t = tlo.lstrip('#')
    return '#%02X%02X%02X' % tuple(round(255 * pct + int(t[i:i+2], 16) * (1 - pct)) for i in (0, 2, 4))

if len(sys.argv) == 3:
    r = cr(sys.argv[1], sys.argv[2])
    print("%s na %s → %.2f:1  (%s)" % (sys.argv[1], sys.argv[2], r, ocen(r)))
else:
    PALETA = {"--ink": "#171114", "--ink-70": "#574B50", "--ink-45": "#6E6166", "marka": "#6E1533"}
    TLA = {"paper": "#FFFFFF", "bone": "#FBF9F8", "blush": "#FAF2F4"}
    print("Progi: 4.5 = AA, 7.0 = AAA\n")
    for tn, tc in TLA.items():
        print("Tlo %s (%s):" % (tn, tc))
        for n, c in PALETA.items():
            r = cr(c, tc)
            print("  %-12s %-9s %5.2f  %s" % (n, c, r, ocen(r)))
        print()
    print("Tekst na kolorze marki #6E1533:")
    for pct in (1.0, .88, .82, .68):
        c = biel(pct, "#6E1533")
        print("  biel %3d%%   %s  %5.2f  %s" % (pct * 100, c, cr(c, "#6E1533"), ocen(cr(c, "#6E1533"))))
