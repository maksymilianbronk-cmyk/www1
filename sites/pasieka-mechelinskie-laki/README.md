# Pasieka Mechelińskie Łąki

Strona wizytówka pasieki **Mechelińskie Łąki** (Marek Kunc) — naturalny miód, wosk pszczeli
i świece z węzy znad Zatoki Puckiej.

Serwis statyczny, sześć podstron, zero zależności i zero build-stepu.
Fonty (Fraunces, Karla) ładowane z Google Fonts, cała reszta lokalnie.

## Struktura

```
index.html            – strona główna
miody.html            – odmiany miodu, krystalizacja, przechowywanie
miodomat.html         – automat z miodem: jak kupić, adres, BLIK, FAQ
wosk-i-swiece.html    – świece z węzy, szyszki, wosk w bloku
o-pasiece.html        – pasieka, rezerwat, droga od ula do słoika, galeria
kontakt.html          – dane kontaktowe i rejestrowe
css/styl.css          – jeden arkusz dla całego serwisu
js/skrypt.js          – nagłówek, menu mobilne, animacje wejścia, lightbox
img/                  – zdjęcia w WebP, logo, obrazek Open Graph
favicon.png, apple-touch-icon.png
sitemap.xml, robots.txt
narzedzia/og_miniatury.py – generator miniatur Open Graph
.nojekyll             – wyłącza przetwarzanie Jekyllem na GitHub Pages
```

## Dane firmowe użyte na stronie

Marek Kunc, Pasieka „Mechelińskie Łąki”, Bukszpanowa 4, 81-198 Mosty (gmina Kosakowo).
Telefon i BLIK: 600 192 252. Nr WNI 22114725, nr WET 22115688. Dane pochodzą z tabliczki
na miodomacie.

## Uruchomienie lokalnie

```bash
python3 -m http.server 8000
# http://localhost:8000
```

## Publikacja

Strona jest częścią kolekcji `www1` i wchodzi na GitHub Pages razem z nią
(workflow `.github/workflows/pages.yml` w katalogu głównego repozytorium).

Adres publiczny:
**https://maksymilianbronk-cmyk.github.io/www1/sites/pasieka-mechelinskie-laki/**

Podgląd lokalny działa tak samo jak wyżej (`python3 -m http.server`), bo wszystkie
ścieżki w HTML są względne.

## System wizualny „Bursztyn i sól"

Redesign zrobiony pod standard, jaki trzymają dziś najlepsze marki miodowe
(terroir opisany jak przy winie, karta degustacyjna zamiast listy odmian,
sezonowość podana wprost, mobile-first ścieżka zakupu):

- **Paleta** — papier w kolorze piasku jako baza, głęboka zieleń morska
  (`#0B2E3A`) na pasy i stopkę, miód wyłącznie jako akcent. Kontrast każdego
  napisu policzony liczbowo do WCAG AA, także dla przyklejonego nagłówka.
- **Typografia** — Fraunces (display, 300–700) + Karla; płynna skala `clamp()`
  od 16 px do 6,4 rem w hero, nagłówki z ujemnym trackingiem.
- **Plaster miodu** — jeden kafel SVG powielany maską CSS (`--hex`), więc wzór
  nie waży nic w HTML i skaluje się bez końca. Do tego ziarno filmowe na
  ciemnych pasach i miód kapiący spod taśmy z faktami (maska `--kapie`).
- **Karty degustacyjne** — każda odmiana z kroplą w swojej barwie, sezonem
  i czterema nutami: aromat, smak, krystalizacja, podanie.
- **Kalendarz miodobrania** — wykres SVG generowany w Pythonie
  (`narzedzia/`), sześć odmian na osi kwiecień–wrzesień.
- **Mapa terroir** — autorska ilustracja SVG: Zatoka Pucka, rezerwat,
  Mosty i znacznik pasieki (podpisana jako poglądowa, nie nawigacyjna).
- **Mikrointerakcje** — animacje wejścia z siatką bezpieczeństwa (sam
  IntersectionObserver gubi elementy przy szybkim przewinięciu), pasek
  postępu czytania, przyklejany nagłówek, powiększenie zdjęć w kaflach,
  pszczoły krążące nad hero, wszystko wyłączane przez `prefers-reduced-motion`.
- **Mobile** — pełnoekranowe menu, dolny pasek akcji (Zadzwoń / Miodomat /
  Dojazd), cele dotykowe 44 px+, `safe-area-inset`.

Strony powstają z generatora w Pythonie (`build.py` + `strony.py` + `sztuka.py`
w historii wdrożenia), więc nagłówek, stopka i `<head>` mają jedno źródło.

## SEO i wdrożenie

- `canonical`, `og:url` i `og:image` na adresach bezwzględnych (relatywny
  `og:image` nie pokazuje miniatury przy wysyłaniu linku),
- sześć miniatur Open Graph 1200×630 (`img/og*.jpg`) składanych w Pythonie —
  generator: `narzedzia/og_miniatury.py`,
- Twitter Card, `og:site_name`, `og:locale`, `preload` zdjęcia hero,
- JSON-LD: `LocalBusiness`/`Store` z adresem, telefonem i numerami WNI/WET,
  `BreadcrumbList` na podstronach, `FAQPage` na stronie miodomatu,
- `sitemap.xml` i `robots.txt`.

## Audyt

Playwright, 6 podstron × 4 szerokości okna (390, 820, 1440, 2560 px):
zero błędów JS, zero przewijania w poziomie, cele dotykowe 44 px+, tekst
≥ 12 px, kontrast AA policzony dla każdego napisu, test menu mobilnego na
390 i 320 px, lightboxa galerii i rozwijanych pytań, kontrola deklaracji CSS
odrzuconych przez przeglądarkę oraz układu przy 7600 px.

## Do uzupełnienia przed publikacją

- [ ] adres e-mail
- [ ] godziny dostępności miodomatu i odbioru osobistego
- [ ] aktualny asortyment i ceny w automacie
- [ ] lista odmian miodu — potwierdzona ze zdjęć jest tylko gryka
- [ ] gramatury i ceny słoików, cena wosku za kilogram
- [ ] dokładne brzmienie zdania z etykiety (blockquote w sekcji „Skąd bierze się ten smak”)

Miejsca do edycji są oznaczone w kodzie komentarzami `UZUPEŁNIĆ` i `SPRAWDZIĆ`
(`miody.html`, `miodomat.html`, `wosk-i-swiece.html`, `o-pasiece.html`, `kontakt.html`).

## Zdjęcia

Zdjęcia i grafika etykiety pochodzą od właściciela pasieki. Wszelkie prawa zastrzeżone —
nie są objęte licencją kodu.
