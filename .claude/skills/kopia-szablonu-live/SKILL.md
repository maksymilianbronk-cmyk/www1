---
name: kopia-szablonu-live
description: Robi wierną kopię 1:1 istniejącego, open-source'owego szablonu strony (np. TemplateMo, ThemeWagon, HTML5UP) i tłumaczy widoczny tekst na polski, NIE zmieniając designu. Użyj, gdy użytkownik prosi o „kopię szablonu", „wierną kopię", „port szablonu", „kopię podglądu live po polsku", „pobierz design jak z pierwszego barbera" itp. Wzorzec referencyjny: sites/szablony-github/branze/fryzjer/szablon-1 (TemplateMo Barber Shop).
---

# Kopia szablonu live (1:1, tłumaczenie PL)

Procedura tworzenia **wiernej kopii** istniejącego darmowego szablonu strony,
z tłumaczeniem **wyłącznie widocznego tekstu** na polski. Design, układ, CSS i JS
pozostają **nietknięte** (1:1 jak oryginalny podgląd live).

## Zasady (ważne)

- **Nie zmieniaj designu** — żadnych poprawek layoutu, kolorów, czcionek, klas.
- Zmieniasz **tylko** widoczny tekst (PL) i — jeśli sensowne — symbol waluty na `zł`.
- Używaj wyłącznie szablonów **na wolnej licencji** (TemplateMo, ThemeWagon, HTML5UP,
  Start Bootstrap itp.). **Zachowaj atrybucję autora** w stopce (link „Design/Projekt").
- Render 1:1 uzyskujemy, ładując CSS/JS/obrazy z **oryginalnego hosta** szablonu
  (przepięcie ścieżek względnych na absolutne) — nie modyfikujemy plików assetów.

## Kroki

1. **Pobierz surowe źródło** szablonu (dokładny HTML, nie przez narzędzia tekstowe,
   które konwertują do markdown — użyj `curl`):
   ```bash
   curl -sS -L -o /tmp/src.html "<URL_DO_index.html_SZABLONU>"
   ```
   Dobre źródła demo/źródeł: `https://templatemo.com/templates/<nazwa>/index.html`,
   strony GitHub Pages danego repo, `raw.githubusercontent.com/.../index.html`.

2. **Wypisz odwołania do assetów**, żeby wiedzieć co przepiąć:
   ```bash
   grep -oE '(href|src)="[^"]+"' /tmp/src.html | grep -viE 'https?://|#|mailto:' | sort -u
   ```

3. **Przepnij ścieżki względne na absolutne** (host oryginału = `$B`):
   ```bash
   B="https://<host-oryginalu>/<sciezka-szablonu>"
   perl -pe '
     s{(href|src)="css/}{$1="'"$B"'/css/}g;
     s{(href|src)="js/}{$1="'"$B"'/js/}g;
     s{(href|src)="images/}{$1="'"$B"'/images/}g;
     s{src="/cdn-cgi/}{src="https://<host-oryginalu>/cdn-cgi/}g;
   ' /tmp/src.html > /tmp/port.html
   ```
   Dostosuj nazwy katalogów (`assets/`, `img/`, `vendor/` itp.) do konkretnego szablonu.
   Sprawdź, że nie zostały ścieżki względne:
   ```bash
   grep -oE '(href|src)="(css|js|images|assets|img)/[^"]+"' /tmp/port.html | sort -u
   ```

4. **Przeczytaj plik i przetłumacz widoczny tekst na polski.** Najbezpieczniej
   skryptem z mapą podmian `(angielski -> polski)` na pełnych, unikalnych fragmentach
   (z kawałkiem markupu jako kontekstem), żeby nie ruszyć tagów. Zmień też
   `<html lang="en">` → `lang="pl"`, `<title>` i ceny `$` → `zł` (rozsądne kwoty PL).
   Wzorzec skryptu: patrz `translate_barber.py` użyty dla fryzjer/szablon-1
   (lista krotek + `str.replace`, raport „nieznalezione fragmenty: 0").

   Po podmianie zweryfikuj brak resztek angielskiego w nawigacji/sekcjach:
   ```bash
   grep -oiE '>(Home|Services|Contact|Price List|Submit|Book)\b' <plik> | sort -u
   ```

5. **Zapisz kopię** w katalogu docelowym, zwykle:
   `sites/szablony-github/branze/<branża>/szablon-N/index.html`.
   Zaktualizuj wpis tego szablonu w `sites/szablony-github/branze/<branża>/index.html`
   (tablica `T`): `k:"Kopia 1:1 · <Autor>"`, `h:"<Nazwa szablonu>"`, `p:"Wierna kopia ... PL."`.

6. **Publikuj** (Pages wdraża się TYLKO z gałęzi `claude/website-collection-setup-xojca4`):
   commit → push gałęzi roboczej → merge do `main` → merge do
   `claude/website-collection-setup-xojca4` → push. Następnie zweryfikuj na żywo
   (HTTP 200 + obecność polskich fraz i nazwy pliku CSS oryginału).

## Weryfikacja live

```bash
base="https://maksymilianbronk-cmyk.github.io/www1/sites/szablony-github/branze/<branża>/szablon-N/index.html"
curl -s -o /dev/null -w "%{http_code}\n" "$base"   # oczekuj 200 (po ~1 min od push)
```

## Wzorzec referencyjny

`sites/szablony-github/branze/fryzjer/szablon-1/index.html` — wierna kopia
TemplateMo „Gentlemen's Barber Shop" (Bootstrap 5), tekst PL, atrybucja zachowana,
ceny zlokalizowane do `zł`, assety ładowane z hosta templatemo.com.
