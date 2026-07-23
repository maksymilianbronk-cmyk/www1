# Dokumentacja projektu — kolekcja www1 i aplikacja „Trasa"

Przewodnik właściciela. Stan na 2026-07-21.

## 1. Najważniejsze adresy

| Co | Adres |
|---|---|
| **Aplikacja Trasa (publiczna)** | https://maksymilianbronk-cmyk.github.io/www1/sites/podroze-mapy/ |
| Galeria kolekcji | https://maksymilianbronk-cmyk.github.io/www1/ |
| Repozytorium | https://github.com/maksymilianbronk-cmyk/www1 |
| Baza punktów (chmura) | gałąź `poi-db` w repo |

## 2. Struktura repozytorium i gałęzie

```
www1/
├── index.html              # galeria kolekcji stron
├── assets/js/sites.js      # lista stron (opisy kart)
├── sites/podroze-mapy/     # APLIKACJA TRASA
│   ├── index.html          # UI + sprite ~45 ikon SVG
│   ├── app.js              # cała logika (warstwy, POI, chmura, offline…)
│   ├── layers.js           # katalog 105 warstw map
│   ├── styles.css          # ciemny motyw (grafit + pomarańcz)
│   ├── sw.js               # service worker (offline + bufor kafelków)
│   ├── cloud-config.js     # (opcjonalny) ręczny token aplikacji
│   ├── manifest.webmanifest, icon.svg   # PWA
│   ├── vendor/leaflet/     # Leaflet 1.9.4 lokalnie (bez CDN)
│   └── ANALIZA.md          # analiza źródeł map i decyzji technicznych
├── .claude/skills/         # skille dla Claude (patrz §8)
├── .github/workflows/pages.yml  # automatyczne wdrożenie na Pages
├── CLAUDE.md               # instrukcje projektu dla Claude
└── DOKUMENTACJA.md         # ten plik
```

**Gałęzie:**
- `claude/website-collection-setup-xojca4` — **gałąź domyślna i źródło GitHub
  Pages**; każdy push na nią automatycznie publikuje stronę (~1 min).
- `claude/travel-maps-app-goud9f` — gałąź robocza aplikacji Trasa (zwykle
  identyczna z domyślną).
- `poi-db` — **gałąź danych** (nie uruchamia wdrożeń): baza punktów
  użytkowników, konfiguracja chmury i kanał aktualizacji map.

## 3. Aplikacja Trasa — przewodnik

### Warstwy map (105)
- **Manager warstw** (☰): kategorie, filtr, ulubione ★, licznik; ⚡ przy
  kategorii testuje dostępność każdej warstwy (zielona/czerwona kropka),
  ▶ przelatuje do zasięgu mapy regionalnej.
- **Szybki dostęp** (góra panelu): nakładki (pomarańczowe — Cieniowanie
  Geoportal, Wikimapia, Działki) i mapy „solo" (niebieskie — Wizualizacja
  BDOT10k, Hipsometria, Cieniowanie ISOK 1m, Wikimapia).
- **Profile map**: gotowe zestawy (Turystyka, Rower, Zima, Satelita+,
  Orto+działki, Wikimapia, Google+Wikimapia…) + „zapisz obecny" tworzy własny.
- **Porównywanie 🆚**: wybierz drugą mapę, przeciągaj uchwyt dzielący ekran.
- **Strzałki ‹ ›** przy nazwie mapy: szybkie przełączanie (cykl po ulubionych).
- **↺ Reset**: kasuje wszystkie nakładki, ślady, pomiary i wraca do OSM.
- **＋ Własna mapa**: podepnij dowolny WMS (adres + LAYERS) albo szablon XYZ.
- Kategorie specjalne: mapy historyczne (WIG, Messtischblätter, sztabówki
  ZSRR, USGS), Geoportal (orto, orto HD, topo, BDOT10k, hipsometria,
  cieniowanie ISOK), nakładki szlaków/kolei/morza, pogoda i Premium
  (wymagają darmowych kluczy — przycisk 🔑).

### Punkty (POI)
- Dodawanie: przycisk 📌, **przytrzymanie palca na mapie** (na komputerze
  prawy przycisk) → menu: Dodaj POI / Kopiuj współrzędne / Nawiguj.
- Edytor: nazwa, **folder**, kategoria (9 ikon), kolor, notatka.
- Panel „Punkty": foldery z licznikami (tworzenie/zmiana nazwy/usuwanie),
  szukajka, filtr kategorii, lista sortowana odległością, usuwanie z „Cofnij".
- Import/eksport: **GPX, KML, KMZ, GeoJSON** (format rozpoznawany po treści).
  Okno „GPX/KML/KMZ" wczytuje też całe ślady tras na mapę.

### Chmura punktów (konta)
- **Rejestracja = login + hasło** (panel Punkty → Chmura GitHub). Punkty
  zapisują się automatycznie (auto-sync ~4 s po zmianie) do
  `poi-db/<login>/<folder>.json` i są dostępne po zalogowaniu z każdego
  urządzenia. „Przeglądaj bazę" pokazuje foldery wszystkich użytkowników.
- **Konto administratora: `max`** — tylko po zalogowaniu na nie widać panele
  tokenów (Administrator + własny token).

### Offline
- Panel ☁ (obok ↺): włącz buforowanie kafelków, pobierz widoczny obszar
  (1–3 poziomy zoomu), podgląd bufora per serwer, czyszczenie. Przy braku
  sieci kafelki wracają z bufora. Aplikacja jest **PWA** — na Androidzie
  „Dodaj do ekranu głównego" instaluje ją jak natywną.

### Skróty klawiszowe
M — warstwy · S — szukaj · L — GPS · P — pomiar · W — dodaj POI ·
O — panel punktów · , / . — poprzednia/następna mapa · Esc — zamknij.

## 4. Administracja chmurą (dla Ciebie)

- **Token**: fine-grained PAT ograniczony WYŁĄCZNIE do repo `www1`,
  uprawnienie *Contents: Read and write* (github.com/settings/personal-access-tokens).
- **Aktywacja**: zaloguj się jako `max` → panel „Administrator" → wklej token
  → „Aktywuj". Token zapisuje się ZAKODOWANY w `cloud/config.json` na gałęzi
  `poi-db` — użytkownicy nie potrzebują własnych tokenów.
- **Bezpieczeństwo**: kodowanie chroni przed skanerami sekretów, nie przed
  człowiekiem — traktuj bazę POI jako publiczną i publicznie edytowalną
  w granicach repo. Hasła kont są haszowane (SHA-256+sól), weryfikacja po
  stronie przeglądarki (zabezpieczenie umowne). Nie trzymaj w POI danych
  wrażliwych.
- **Awaryjnie**: unieważnij token na GitHubie → chmura przechodzi w tryb
  offline; nowa aktywacja = nowy token w panelu admina. Historia wszystkich
  zmian punktów = historia commitów gałęzi `poi-db`.

## 5. Szybkie aktualizacje map (bez wdrożenia)

Plik `catalog/extra.json` na gałęzi `poi-db`:
```json
{ "sources": [ {nowe warstwy — schemat jak w layers.js} ],
  "disable": ["id-martwej-warstwy"],
  "patch":   { "id": { "url": "https://nowy-adres/{z}/{x}/{y}.png" } } }
```
Aplikacja pobiera go przy każdym starcie — edycja JSON-a w repo natychmiast
aktualizuje mapy u wszystkich użytkowników.

## 6. Publikowanie zmian

Push na gałąź `claude/website-collection-setup-xojca4` → workflow
`pages.yml` wdraża stronę automatycznie (Actions → „Deploy to GitHub
Pages"). Przy zmianach w aplikacji podbij wersję cache w `sw.js`
(`trasa-shell-vN` → `vN+1`), aby użytkownicy dostali świeże pliki.

## 7. Kierunek: aplikacja Android

Aplikacja jest gotowa pod opakowanie **TWA** (Trusted Web Activity) lub
WebView: PWA z manifestem i service workerem, Leaflet lokalnie, https.
W wersji natywnej dojdą: pełne mapy offline (pobieranie regionów), warstwy
w EPSG:2180/3395 (natywna reprojekcja), źródła http bez proxy.

## 8. Skille Claude (`.claude/skills/`)

Automatycznie ładowana wiedza dla przyszłych sesji:
- **`trasa-app`** — architektura aplikacji, chmura, checklista zmian, testy,
  wdrożenie, wyniesione lekcje.
- **`zrodla-map`** — jak szukać/weryfikować/dodawać źródła map + rejestr
  endpointów (`references/zrodla.md`).
- **`nowa-strona`**, **`allegro-aukcje`** — pozostałe skille kolekcji.

Wystarczy napisać np. „dodaj mapę X" albo „napraw warstwę Y" — Claude
załaduje właściwy playbook i przejdzie procedurę (test ⚡, liczniki, SW,
wdrożenie, monitoring).

## 9. Dokumentacja techniczna

Pełna analiza źródeł map, decyzji (Wikimapia hash, EPSG-y Geoportalu,
KML/KMZ bez bibliotek, bufor offline, architektura chmury):
`sites/podroze-mapy/ANALIZA.md`.
