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
js/skrypt.js          – menu mobilne i lightbox galerii
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

## Co doszło przy wdrożeniu

Do pakietu dołożone zostały rzeczy potrzebne dopiero pod publicznym adresem —
treść i wygląd stron zostały bez zmian:

- `canonical`, `og:url` i `og:image` na adresie bezwzględnym (relatywny `og:image`
  nie pokazuje miniatury przy wysyłaniu linku),
- sześć miniatur Open Graph 1200×630 (`img/og*.jpg`) — panel z logo i tytułem
  plus zdjęcie z pakietu; generator: `narzedzia/og_miniatury.py`,
- Twitter Card, `og:site_name`, `og:locale`,
- JSON-LD: `LocalBusiness`/`Store` z adresem, telefonem, numerami WNI i WET,
  `BreadcrumbList` na podstronach i `FAQPage` na stronie miodomatu,
- `sitemap.xml` i `robots.txt`,
- poprawki dostępności i układu wyłapane audytem (Playwright, 6 podstron ×
  4 szerokości okna): pieczęć z logo w hero rozpychała się na całe zdjęcie
  (kolizja specyficzności `.hero-foto img` z `.pieczec`), podpis pod zdjęciem
  chował się pod pieczęcią, linki w stopce i w tekście miały cel dotykowy
  poniżej 44 px, najmniejszy tekst miał 11,2 px, a „Zobacz odmiany" i znak „+"
  w FAQ dawały kontrast 2,87:1 przy wymaganych 4,5:1.

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
