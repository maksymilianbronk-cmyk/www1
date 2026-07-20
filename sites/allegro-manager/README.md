# Allegro Manager — panel integracji hurtowni XML z Allegro

Samodzielny system w stylu **SkyShop / BaseLinker**: panel administracyjny, który
pobiera pliki XML polskich hurtowni, autoryzuje się z Allegro przez **OAuth 2.0**
i masowo wystawia przedmioty przez **Allegro REST API**. Bez abonamentu, bez
zewnętrznych zależności — czysty PHP + Vanilla JS, działa na zwykłym hostingu
współdzielonym.

> **Dlaczego własny system?** Na GitHubie istnieją biblioteki PHP do Allegro REST
> API (np. [imper86/php-allegro-api](https://github.com/imper86/php-allegro-api),
> [asocial-media/allegro-api](https://github.com/asocial-media/allegro-api)),
> ale **kompletnego open-source'owego odpowiednika SkyShopa/BaseLinkera nie ma** —
> takie rozwiązania są wyłącznie komercyjne (Apilo, Sellasist, BaseLinker).
> Ten panel wypełnia tę lukę.

## Możliwości

- 🔐 **Autoryzacja z Allegro jak SkyShop** — OAuth 2.0 Authorization Code
  (przekierowanie do Allegro → zgoda → powrót do panelu) oraz **Device Flow**
  (kod do zatwierdzenia na `allegro.pl/skojarz-aplikacje` — wygodny na localhost).
  Automatyczne odświeżanie tokenów. Środowisko **produkcyjne i Sandbox**.
- 📥 **Import XML hurtowni** — auto-wykrywanie formatu:
  - **IOF** (Internet Offer Format — standard wielu polskich hurtowni),
  - **Ceneo XML** (`<offers><o …>`),
  - dowolny XML z powtarzalnym węzłem produktu (heurystyka pól PL/EN:
    `nazwa/name`, `cena_brutto/price`, `ean/kod_kreskowy`, `stan/stock`…),
  - własne **mapowanie pól JSON-em**, gdy heurystyka nie trafi.
  - Parsowanie **strumieniowe** (XMLReader) — pliki po 100+ MB nie zapychają
    pamięci. Basic Auth i gzip obsługiwane.
- 🧮 **Marże** — procentowa marża per hurtownia, przeliczanie netto→brutto z VAT.
- 🎯 **Dopasowanie po EAN** — produkty łączone z katalogiem produktów Allegro
  po kodzie GTIN (`GET /sale/products?phrase=EAN&mode=GTIN`).
- 🏷️ **Masowe wystawianie** — `POST /sale/product-offers`; oferty robocze
  (INACTIVE, dokańczasz w Allegro) lub od razu aktywne; domyślny cennik dostawy,
  polityka zwrotów, warunki reklamacji i gwarancja pobierane z konta.
- 📊 **Lista ofert** z konta Allegro, logi zdarzeń, rate-limit logowania,
  CSRF, hasło bcrypt, dane w katalogu odciętym `.htaccess`.

## Wymagania

- PHP **7.4+** (zalecane 8.x) z rozszerzeniami: `curl`, `xmlreader`,
  `simplexml`, `session` — standard na polskich hostingach (home.pl, nazwa.pl,
  cyberFolks, OVH, mikr.us itd.).
- Serwer Apache (dla `.htaccess`) lub odpowiednik — przy nginx zablokuj
  samodzielnie dostęp do `panel/data/`.
- Konto Allegro + darmowa aplikacja deweloperska (niżej).

## Instalacja

1. Wgraj folder `allegro-manager/` na hosting (FTP/panel plików).
2. Upewnij się, że PHP może zapisywać w `panel/data/` (zwykle działa od razu;
   w razie problemów nadaj prawa `770`).
3. Otwórz `https://twojadomena.pl/…/allegro-manager/panel/` — przy pierwszym
   uruchomieniu ustawisz hasło administratora.

## Połączenie z Allegro (krok po kroku)

1. Wejdź na **https://apps.developer.allegro.pl** (produkcja) lub
   **https://apps.developer.allegro.pl.allegrosandbox.pl** (Sandbox — polecane
   na start; konto sandbox zakładasz na `allegro.pl.allegrosandbox.pl`).
2. Utwórz aplikację typu **webowa** i zaznacz uprawnienia sprzedażowe
   (zarządzanie ofertami).
3. W polu **Redirect URI** wklej adres z panelu:
   *Ustawienia → „Redirect URI"* (kończy się na `/panel/callback.php`).
4. Skopiuj **Client ID** i **Client Secret** do panelu → *Ustawienia* → Zapisz.
5. Kliknij **„🔗 Połącz konto Allegro"** — zalogujesz się w Allegro i wrócisz
   do panelu już połączony (dokładnie ten sam mechanizm, którego używa SkyShop).
   Alternatywnie **„📱 Połącz kodem"** (Device Flow) — bez publicznego adresu.

## Import hurtowni i wystawianie

1. *Hurtownie XML* → **Dodaj hurtownię**: nazwa, adres pliku XML, ewentualnie
   login/hasło (Basic Auth) i marża %.
2. **⬇️ Pobierz XML** — import i podsumowanie (liczba produktów, ile ma EAN).
3. *Produkty* → zaznacz pozycje (tylko te z EAN da się dopasować automatycznie)
   → **Wystaw na Allegro** → kreator sprawdzi dopasowanie w katalogu Allegro,
   pozwoli skorygować ceny i ilości → wystawia.
4. Statusy znajdziesz w *Oferty Allegro* i w *Logach*.

### Własne mapowanie pól

Gdy hurtownia ma nietypowy XML, w formularzu hurtowni podaj JSON:

```json
{
  "product_node": "produkt",
  "fields": {
    "name": "opis/nazwa",
    "price_gross": "@cena_brutto",
    "ean": "kody/ean",
    "stock": "magazyn@ilosc"
  }
}
```

Ścieżki są względne wobec węzła produktu; `@x` oznacza atrybut.

## Ograniczenia (świadome decyzje v1)

- Automatycznie wystawiane są produkty **z kodem EAN obecnym w katalogu
  Allegro** (tak samo działa dopasowanie w SkyShop/BaseLinker). Produkty bez
  EAN trzeba wystawić ręcznie — panel je oznacza.
- Oferta dziedziczy zdjęcia/parametry z katalogu produktów Allegro; zdjęcia
  z XML hurtowni są pokazywane w panelu, ale nie są wysyłane do oferty.
- Brak automatycznej synchronizacji stanów/cen w tle (hosting współdzielony
  zwykle nie ma crona) — odśwież import i popraw oferty w Allegro. Naturalne
  rozszerzenie: cron wywołujący `supplier_fetch` + aktualizacja ofert.

## Struktura

```
allegro-manager/
├── index.html            # statyczna strona-wizytówka (galeria kolekcji)
├── README.md
└── panel/
    ├── index.php         # panel administracyjny (SPA, vanilla JS)
    ├── api.php           # backend JSON API
    ├── callback.php      # redirect URI OAuth Allegro
    ├── lib/
    │   ├── bootstrap.php # sesja, auth, tokeny
    │   ├── Store.php     # magazyn JSON z blokadą plików
    │   ├── AllegroClient.php  # OAuth + REST API Allegro
    │   └── XmlImporter.php    # pobieranie i parsowanie XML hurtowni
    └── data/             # konfiguracja, tokeny, produkty (odcięte .htaccess)
```

## Bezpieczeństwo

- Hasło administratora: bcrypt (`password_hash`), rate-limit 10 prób / 10 min.
- Wszystkie POST-y wymagają nagłówka `X-CSRF` zgodnego z tokenem sesji.
- `panel/data/` (tokeny OAuth, hasła hurtowni, konfiguracja) jest odcięty
  `.htaccess` + pliki poza publicznym listingiem. **Nie commituj zawartości
  `data/` do repozytorium.**
- Client Secret nigdy nie wraca do przeglądarki (tylko flaga „zapisany").
