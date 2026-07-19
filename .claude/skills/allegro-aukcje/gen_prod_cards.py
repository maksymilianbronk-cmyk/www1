#!/usr/bin/env python3
"""Generator kart aukcji Allegro (.prod) dla stron z kolekcji.

Użycie:
    python3 gen_prod_cards.py produkty.json > karty.html

Wejście — JSON: lista obiektów:
    {
      "title": "Serwer Fujitsu TX120-S2",     # wymagane
      "href":  "https://allegro.pl/oferta/…", # wymagane (oferta lub /uzytkownik/<login>?string=…)
      "price": "300,00 zł",                   # opcjonalne; brak = „sprawdź cenę"
      "icon":  "i-drive",                     # opcjonalne; id symbolu SVG (domyślnie i-chip)
      "color": "g",                           # opcjonalne; g=zielony (domyślnie), b=niebieski
      "smart": true                           # opcjonalne; plakietka Smart!
    }

Wynik: karty <a class="prod"> gotowe do wklejenia w .prod-grid sekcji #aukcje.
"""
import html
import json
import re
import sys

OFERTA_RE = re.compile(r"^https://allegro\.pl/oferta/[a-z0-9-]+-\d+$")
PROFIL_RE = re.compile(r"^https://allegro\.pl/uzytkownik/[\w-]+(\?string=.+|/oceny)?$")


def card(p: dict) -> str:
    title = html.escape(p["title"])
    href = p["href"]
    if not (OFERTA_RE.match(href) or PROFIL_RE.match(href)):
        sys.exit(f"BŁĄD: podejrzany href (nie oferta/profil Allegro): {href}")
    blue = p.get("color") == "b"
    icon = p.get("icon", "i-chip")
    smart = '<span class="tag-smart">Smart!</span>' if p.get("smart") else ""
    price = (
        f'<span class="price">{html.escape(p["price"])}</span>'
        if p.get("price")
        else '<span class="price"><small>sprawdź cenę</small></span>'
    )
    return (
        f'      <a class="prod reveal" href="{href}" target="_blank" rel="noopener">{smart}\n'
        f'        <div class="prod-top"><div class="card-icon{" blue" if blue else ""}">'
        f'<svg style="color:{"#1d6fe0" if blue else "#0e9f6e"}"><use href="#{icon}"/></svg></div>'
        f"<h3>{title}</h3></div>\n"
        f'        <div class="prod-meta">{price}'
        f'<span class="go">Zobacz aukcję <svg><use href="#i-arrow"/></svg></span></div>\n'
        f"      </a>"
    )


def main() -> None:
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    products = json.loads(open(sys.argv[1], encoding="utf-8").read())
    seen = set()
    out = []
    for p in products:
        key = re.sub(r".*-(\d+)$", r"\1", p["href"]) if "/oferta/" in p["href"] else p["href"]
        if key in seen:
            print(f"POMINIĘTO duplikat: {p['title']}", file=sys.stderr)
            continue
        seen.add(key)
        out.append(card(p))
    print("\n".join(out))


if __name__ == "__main__":
    main()
