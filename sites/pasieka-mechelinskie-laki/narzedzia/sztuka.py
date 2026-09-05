# -*- coding: utf-8 -*-
"""Autorska grafika SVG dla serwisu pasieki: plaster miodu, kapiąca kropla,
pszczoła, kalendarz miodobrania, mapa terroir, spływający miód na krawędzi."""
import math

# --- ikony dwutonowe (plama 16% + kreska 1.5) -------------------------------
IKONY = {
    "telefon": ('<path d="M6.5 3h3l1.6 4-2 1.4a11 11 0 0 0 5.5 5.5l1.4-2 4 1.6v3a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 4.5 5.2 2 2 0 0 1 6.5 3z"/>',
                '<path d="M6.5 3h3l1.6 4-2 1.4a11 11 0 0 0 5.5 5.5l1.4-2 4 1.6v3a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 4.5 5.2 2 2 0 0 1 6.5 3z"/>'),
    "pin": ('<path d="M12 2.5c3.6 0 6.5 2.9 6.5 6.4 0 4.6-6.5 12.6-6.5 12.6S5.5 13.5 5.5 8.9C5.5 5.4 8.4 2.5 12 2.5z"/>',
            '<path d="M12 2.5c3.6 0 6.5 2.9 6.5 6.4 0 4.6-6.5 12.6-6.5 12.6S5.5 13.5 5.5 8.9C5.5 5.4 8.4 2.5 12 2.5z"/><circle cx="12" cy="9" r="2.4"/>'),
    "sloik": ('<path d="M6.5 8.5h11v10a2.5 2.5 0 0 1-2.5 2.5H9a2.5 2.5 0 0 1-2.5-2.5z"/>',
              '<path d="M6.5 8.5h11v10a2.5 2.5 0 0 1-2.5 2.5H9a2.5 2.5 0 0 1-2.5-2.5z"/><path d="M7.5 5.2h9a1 1 0 0 1 1 1v2.3h-11V6.2a1 1 0 0 1 1-1z"/><path d="M8.6 14.4c1.6-1.3 5.2-1.3 6.8 0"/>'),
    "plaster": ('<path d="M12 3.2l5.2 3v6l-5.2 3-5.2-3v-6z"/>',
                '<path d="M12 3.2l5.2 3v6l-5.2 3-5.2-3v-6z"/><path d="M12 15.2v5.6M6.8 12.2L2.4 14.8M17.2 12.2l4.4 2.6"/>'),
    "swieca": ('<path d="M8.6 8.5h6.8v12.2H8.6z"/>',
               '<path d="M8.6 8.5h6.8v12.2H8.6zM12 8.5V6.4"/><path d="M12 2.4c1.9 1.6 2 3.2.9 4-1 .7-2.4.1-2.4-1.2 0-.9.7-1.8 1.5-2.8z"/>'),
    "pszczola": ('<ellipse cx="12" cy="14" rx="4.2" ry="5.4"/>',
                 '<ellipse cx="12" cy="14" rx="4.2" ry="5.4"/><path d="M7.9 12.4h8.2M8 15.6h8M12 6.2v2.4M10.6 4.4l1.4 1.8 1.4-1.8"/><path d="M8.2 10.4C5.6 8.2 3.4 8.8 3.6 10.6c.2 1.6 2.4 2.4 4.5 1.6M15.8 10.4c2.6-2.2 4.8-1.6 4.6.2-.2 1.6-2.4 2.4-4.5 1.6"/>'),
    "kropla": ('<path d="M12 3.4c3.4 4.2 5.4 7 5.4 9.6a5.4 5.4 0 0 1-10.8 0c0-2.6 2-5.4 5.4-9.6z"/>',
               '<path d="M12 3.4c3.4 4.2 5.4 7 5.4 9.6a5.4 5.4 0 0 1-10.8 0c0-2.6 2-5.4 5.4-9.6z"/>'),
    "kwiat": ('<circle cx="12" cy="12" r="3"/>',
              '<circle cx="12" cy="12" r="2.6"/><path d="M12 9.4c0-2.6.9-4.4 2.6-4.4 1.4 0 2 1.6.7 3.2-.8 1-2 1.6-3.3 1.2zM12 14.6c0 2.6-.9 4.4-2.6 4.4-1.4 0-2-1.6-.7-3.2.8-1 2-1.6 3.3-1.2zM9.4 12c-2.6 0-4.4-.9-4.4-2.6 0-1.4 1.6-2 3.2-.7 1 .8 1.6 2 1.2 3.3zM14.6 12c2.6 0 4.4.9 4.4 2.6 0 1.4-1.6 2-3.2.7-1-.8-1.6-2-1.2-3.3z"/>'),
    "blik": ('<rect x="2.6" y="5.4" width="18.8" height="13.2" rx="2.2"/>',
             '<rect x="2.6" y="5.4" width="18.8" height="13.2" rx="2.2"/><path d="M2.6 9.6h18.8M6.2 14.6h3.4M12.4 14.6h2"/>'),
    "zegar": ('<circle cx="12" cy="12" r="8.6"/>', '<circle cx="12" cy="12" r="8.6"/><path d="M12 7v5.2l3.3 2"/>'),
    "check": ("", '<path d="M4.6 12.4l4.8 4.8L19.4 7"/>'),
    "strzalka": ("", '<path d="M4 12h15M13.4 6.4L19 12l-5.6 5.6"/>'),
    "kompas": ('<circle cx="12" cy="12" r="8.6"/>', '<circle cx="12" cy="12" r="8.6"/><path d="M15.2 8.8l-1.8 4.6-4.6 1.8 1.8-4.6z"/>'),
    "tarcza": ('<path d="M12 2.6l7.4 2.8v5.8c0 4.6-3.1 8.6-7.4 10.2-4.3-1.6-7.4-5.6-7.4-10.2V5.4z"/>',
               '<path d="M12 2.6l7.4 2.8v5.8c0 4.6-3.1 8.6-7.4 10.2-4.3-1.6-7.4-5.6-7.4-10.2V5.4z"/><path d="M8.8 12l2.3 2.3 4.3-4.6"/>'),
    "list": ('<rect x="3" y="5.4" width="18" height="13.2" rx="2"/>',
             '<rect x="3" y="5.4" width="18" height="13.2" rx="2"/><path d="M3.6 7.4l8.4 6 8.4-6"/>'),
}


def sprite():
    """Jeden sprite <symbol> wklejany na początku <body>; zero dodatkowych żądań."""
    out = ['<svg xmlns="http://www.w3.org/2000/svg" style="display:none" aria-hidden="true">']
    for nazwa, (plama, kreska) in IKONY.items():
        out.append('<symbol id="i-%s" viewBox="0 0 24 24">' % nazwa)
        if plama:
            out.append('<g class="i-fill">%s</g>' % plama)
        out.append('<g class="i-line">%s</g></symbol>' % kreska)
    out.append("</svg>")
    return "".join(out)


def ikona(nazwa, klasa="ico"):
    return '<svg class="%s" aria-hidden="true"><use href="#i-%s"/></svg>' % (klasa, nazwa)


# --- plaster miodu (wzór z maski CSS, zero kodu w HTML) ---------------------
def plaster(*_args, gesty=False, **_kw):
    return '<div class="plaster%s" aria-hidden="true"></div>' % (" plaster--gesty" if gesty else "")


# --- kapiąca kropla jako separator sekcji -----------------------------------
def kropla_sep():
    return ('<svg class="kropla-sep" data-anim viewBox="0 0 900 54" preserveAspectRatio="none" aria-hidden="true">'
            '<path pathLength="100" d="M0 27h300c40 0 46-16 86-16s46 16 86 16h428"/>'
            '<circle cx="450" cy="14" r="4.6"/></svg>')


# --- pszczoła ---------------------------------------------------------------
def pszczola(nr=1):
    return ('<div class="pszczola pszczola--%d" aria-hidden="true">'
            '<svg viewBox="0 0 24 24">'
            '<g class="skrzydlo" fill="rgba(255,255,255,.55)" stroke="rgba(255,255,255,.7)" stroke-width=".6">'
            '<ellipse cx="8.4" cy="8.6" rx="3.6" ry="2.2" transform="rotate(-24 8.4 8.6)"/>'
            '<ellipse cx="15.6" cy="8.6" rx="3.6" ry="2.2" transform="rotate(24 15.6 8.6)"/></g>'
            '<g fill="#F0BE55" stroke="#3A2405" stroke-width=".9">'
            '<ellipse cx="12" cy="14.4" rx="3.9" ry="5.1"/></g>'
            '<g stroke="#3A2405" stroke-width="1.1" fill="none" stroke-linecap="round">'
            '<path d="M8.4 12.8h7.2M8.3 15.8h7.4"/>'
            '<path d="M10.7 8.4l1.3 1.6 1.3-1.6"/></g></svg></div>' % nr)


# --- spływający miód na krawędzi sekcji -------------------------------------
def miod_krawedz(kolor="var(--papier)"):
    """Miękka fala z trzema kroplami — miód spływający z sekcji wyżej."""
    return ('<div class="miod-krawedz" aria-hidden="true">'
            '<svg viewBox="0 0 1200 26" preserveAspectRatio="none">'
            '<path fill="%s" d="M0 0h1200v9c-46 0-58 5-92 5s-46-5-92-5-50 8-84 8-52-8-86-8-58 6-92 6-50-6-84-6-56 7-90 7-54-7-88-7-52 6-86 6-56-6-90-6-50 7-84 7-52-7-86-7-56 5-90 5-38-5-56-5z"/>'
            '</svg></div>' % kolor)


# --- kalendarz miodobrania --------------------------------------------------
MIESIACE = ["kwiecień", "maj", "czerwiec", "lipiec", "sierpień", "wrzesień"]

def kalendarz(wiersze):
    """wiersze: [(nazwa, od, do, kolor)] gdzie od/do to indeksy miesięcy 0..5."""
    L, R, T = 168, 40, 42            # margines lewy, prawy, górny
    W, H_W, LUKA = 1000, 30, 16
    H = T + len(wiersze) * (H_W + LUKA) + 18
    kol = (W - L - R) / len(MIESIACE)
    czesci = []
    # siatka miesięcy
    for i, m in enumerate(MIESIACE):
        x = L + i * kol
        czesci.append('<line x1="%.1f" y1="%d" x2="%.1f" y2="%d" stroke="var(--linia-2)" stroke-width="1"/>'
                      % (x, T - 16, x, H - 12))
        czesci.append('<text x="%.1f" y="%d" font-size="13" fill="var(--atrament-55)" '
                      'font-family="Karla, sans-serif" letter-spacing="1.4">%s</text>'
                      % (x + kol / 2, T - 24, m.upper()))
    czesci.append('<line x1="%.1f" y1="%d" x2="%.1f" y2="%d" stroke="var(--linia-2)" stroke-width="1"/>'
                  % (W - R, T - 16, W - R, H - 12))
    # słupki odmian
    for i, (nazwa, od, do, kolor) in enumerate(wiersze):
        y = T + i * (H_W + LUKA)
        x1 = L + od * kol + 6
        x2 = L + (do + 1) * kol - 6
        czesci.append('<text x="%d" y="%.1f" font-size="15" fill="var(--atrament)" '
                      'font-family="Fraunces, Georgia, serif" font-weight="600">%s</text>'
                      % (L - 18, y + H_W * 0.68, nazwa))
        czesci.append('<rect x="%.1f" y="%.1f" width="%.1f" height="%d" rx="%d" fill="%s"/>'
                      % (x1, y, max(10, x2 - x1), H_W, H_W // 2, kolor))
    # oś podpisów po lewej wyrównana do prawej
    svg = ('<svg viewBox="0 0 %d %d" role="img" aria-label="Kalendarz miodobrania: '
           'w których miesiącach zbierane są poszczególne odmiany miodu">'
           '<style>text{text-anchor:middle}text[x="%d"]{text-anchor:end}</style>%s</svg>'
           % (W, H, L - 18, "".join(czesci)))
    return '<div class="kalendarz">%s</div>' % svg


# --- mapa terroir (ilustracja poglądowa) ------------------------------------
def mapa():
    """Stylizowana mapa okolicy: Zatoka Pucka, rezerwat, pasieka. Ilustracja,
    nie materiał nawigacyjny — podpisana jako poglądowa."""
    return '''<div class="mapa" aria-hidden="false">
<svg viewBox="0 0 640 480" role="img" aria-label="Ilustracja poglądowa: pasieka w Mostach, rezerwat Mechelińskie Łąki i Zatoka Pucka">
  <defs>
    <linearGradient id="woda" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#16505F"/><stop offset="1" stop-color="#0B2E3A"/>
    </linearGradient>
    <pattern id="szuwar" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(24)">
      <line x1="0" y1="0" x2="0" y2="12" stroke="#4E6B4F" stroke-width="1.4" opacity=".55"/>
    </pattern>
  </defs>
  <rect width="640" height="480" fill="#F1E7D2"/>
  <path d="M640 0v480H332c14-52 44-96 58-150 16-62-6-118 24-176 12-24 34-44 62-56 44-19 108-24 164-28z" fill="url(#woda)"/>
  <path d="M332 480c14-52 44-96 58-150 16-62-6-118 24-176 12-24 34-44 62-56" fill="none" stroke="#F0BE55" stroke-width="2" opacity=".55"/>
  <path d="M356 330c30-16 52-52 56-96 4-42-8-76 8-108 22 6 40 20 48 40-18 44-16 92-34 136-14 34-40 56-70 66z" fill="url(#szuwar)"/>
  <path d="M356 330c30-16 52-52 56-96 4-42-8-76 8-108" fill="none" stroke="#4E6B4F" stroke-width="1.6" stroke-dasharray="6 5" opacity=".8"/>
  <g stroke="#C9B48A" stroke-width="2" fill="none">
    <path d="M0 250c70-14 130-6 196 16 46 15 84 40 118 66"/>
    <path d="M96 480c8-70 40-128 96-166"/>
  </g>
  <g fill="#0B2E3A" font-family="Karla, sans-serif" font-size="15" letter-spacing="1.5">
    <text x="470" y="120" fill="#F6EEDF">ZATOKA PUCKA</text>
    <text x="286" y="214" fill="#3C5340" font-size="13">REZERWAT</text>
    <text x="286" y="232" fill="#3C5340" font-size="13">MECHELIŃSKIE ŁĄKI</text>
    <text x="96" y="300">MOSTY</text>
    <text x="330" y="404" font-size="13" fill="#3C5340">MECHELINKI</text>
    <text x="404" y="60" font-size="13" fill="#F6EEDF" opacity=".8">REWA</text>
  </g>
  <g>
    <circle cx="330" cy="386" r="4" fill="#0B2E3A" opacity=".55"/>
    <circle cx="398" cy="42" r="4" fill="#F6EEDF" opacity=".7"/>
    <g transform="translate(74 258)">
      <circle r="26" fill="#D08A15" opacity=".16"/>
      <circle r="16" fill="#D08A15" opacity=".22"/>
      <path d="M0-9l8 4.6v9.2L0 18.4-8 8.8V-4.4z" fill="#D08A15"/>
      <path d="M0-9l8 4.6v9.2L0 18.4-8 8.8V-4.4z" fill="none" stroke="#5E2417" stroke-width="1.4"/>
    </g>
    <text x="74" y="330" text-anchor="middle" font-family="Fraunces, Georgia, serif" font-size="15" font-weight="700" fill="#5E2417">pasieka</text>
  </g>
  <g font-family="Karla, sans-serif" font-size="11" fill="#7C6C52" letter-spacing="1.2">
    <text x="24" y="456">ILUSTRACJA POGLĄDOWA — NIE DO NAWIGACJI</text>
  </g>
</svg></div>'''
