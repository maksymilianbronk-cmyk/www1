# Analiza źródeł map — inżynieria wsteczna pakietów Locus Pro

Dokument opisuje, skąd pochodzą warstwy zebrane w `layers.js` i jak działają
pakiety map, na których wzorowana jest aplikacja **Trasa**.

## 1. `onlinemapsources.xml` (gist oneyoung)

Format pliku źródeł map OruxMaps/Locus: każde `<onlinemapsource>` definiuje
nazwę, szablon URL z tokenami `{$s}` (subdomena), `{$x}/{$y}/{$z}` oraz zakres
zoomów. Z gista przejęto (po aktualizacji na https i nowe endpointy):

- **Google** — endpointy `mt{0-3}.google.com/vt/lyrs=…` (m = mapa, s = satelita,
  y = hybryda, p = teren, h = nakładka dróg),
- **OSM Mapnik, OpenCycleMap** (dziś Thunderforest — wymaga klucza),
- **OpenSeaMap** — nakładka oznakowania nawigacyjnego,
- **OpenTopoMap**, **4UMaps**, **Freemap.sk**, **Turistautak.hu**,
- **IGN Hiszpania** (WMTS: ign-base, mapa-raster, pnoa-ma),
- **USGS** (Topo / ImageryOnly przez ArcGIS REST),
- **Statkart Norwegia** — stare bramki `opencache.statkart.no` zastąpione nowym
  `cache.kartverket.no/v1/wmts`,
- **OpenWeatherMap** — warstwy pogodowe (dziś wersje `*_new` + klucz API),
- martwe źródła pominięto: MapQuest, ChartBundle, toolserver Hike&Bike.

## 2. Pakiet AnyGIS (anygis.ru/Web/Html/Locus_ru)

Kolekcja kilkuset presetów map dla Locus / OsmAnd / Orux / GuruMaps / AlpineQuest.
Kategorie: **miasta** (Google, Yandex, 2GIS), **informacyjne**, **OSM**,
**satelity**, **rzadko aktualizowane rastry** — w tym radzieckie mapy sztabowe
(„Genshtab") oraz podgląd przez nakarte.me. Wzorce przejęte do aplikacji:

- podział katalogu na kategorie tematyczne + ulubione,
- mapy sztabowe z serwerów nakarte.me (`topo500`, `topo1000`, schemat TMS)
  i marshruty.ru,
- 2GIS jako mapa miast Wschodu,
- łączenie map bazowych z nakładkami (hillshade, szlaki).

Yandex pominięto świadomie: kafelki są w elipsoidalnym EPSG:3395, którego
czysty Leaflet nie reprojektuje (w Locusie robi to silnik aplikacji).

## 3. Pakiet melda.ru/locus/maps

Rosyjski pakiet XML `providers` do `Locus/mapsOnline/custom`. Sekcje:
**schematy** (Google, Yandex, Wikimapia, 2GIS), **OSM** (Mapnik, Cycle, CyclOSM,
Outdoors, OpenTopoMap, OpenSnowMap, Transport), **satelity** (Google, Yandex,
Bing, ESRI), **warstwy** (trasy OSM/Strava, zasięgi sieci komórkowych).
Wzorce przejęte: rozdział „mapa bazowa vs nakładka", OpenSnowMap, CyclOSM,
ÖPNV, ESRI World Imagery, nakładka hybrydowa Google.

## 4. Geoportal.gov.pl (PZGiK)

Usługi sieciowe GUGiK użyte w aplikacji:

| Usługa | Typ | Endpoint |
|---|---|---|
| Ortofotomapa | WMTS (EPSG:3857) | `…/WMTS/guest/wmts/ORTO`, layer `ORTOFOTOMAPA` |
| BDOT10k styl mobilny | WMTS | `…/WMTS/guest/wmts/G2_MOBILE_500` |
| Mapy topograficzne (raster) | WMS | `…/PZGIK/mapy/WMS/MapyTopograficzne`, layer `Raster` |
| Cieniowanie NMT (lidar) | WMS | `…/PZGIK/NMT/GRID1/WMS/ShadedRelief` |
| Działki ewidencyjne (KIEG) | WMS | `integracja.gugik.gov.pl/cgi-bin/KrajowaIntegracjaEwidencjiGruntow` |

WMTS wołany jest w trybie KVP z `TILEMATRIXSET=EPSG:3857`, dzięki czemu kafelki
pasują wprost do siatki Leaflet. WMS-y renderowane są przez `L.tileLayer.wms`.

## 5. Wnioski projektowe (co „najlepszego" przejęto z Locus Pro / OsmAnd / Geoportalu)

- **Manager warstw** z kategoriami, filtrem, ulubionymi i licznikiem — jak
  katalog map online w Locusie.
- **Szybkie przełączanie map** strzałkami ‹ › (cykl po ulubionych) — odpowiednik
  szybkiego przełącznika map Locusa.
- **Nakładki z regulacją krycia** (hillshade, szlaki Waymarked, kolej, morze,
  pogoda, działki) — łączenie warstw jak w Locus/OsmAnd.
- **Klucze API per dostawca** (Thunderforest, OWM, Mapy.cz, Stadia/Stamen,
  Tracestrack) zapisywane lokalnie — jak konfiguracja providerów w pakietach.
- **Test dostępności ⚡** — ładuje kafelek próbny każdej warstwy kategorii
  i oznacza status; przydatne, bo źródła „reverse-engineered" bywają ulotne.
- **`home` / przelot do zasięgu** map regionalnych (Szwajcaria, Norwegia…).
- **GPS, pomiar, waypointy, GPX import/eksport** — podstawowy warsztat
  nawigacyjny Locusa.
- **PWA (manifest + service worker)** — fundament pod przyszłe opakowanie
  w aplikację Android (TWA/WebView); offline'owe kafelki celowo zostawione
  wersji natywnej ze względu na regulaminy dostawców.

## 6. Silnik warstw i POI (wersja 2)

Po audycie mobilnym aplikacja dostała własną „inżynierię" pracy z warstwami
i punktami:

**Warstwy:**
- **Profile map** — zapisywane zestawy `mapa bazowa + nakładki + krycie`
  (wbudowane: Turystyka, Rower, Zima, Satelita+, Orto+działki; własne
  zapisywane pod dowolną nazwą) — odpowiednik szybkich motywów w Locusie.
- **Tryb porównywania 🆚** — druga mapa bazowa renderowana w osobnym panelu
  Leaflet (`pane` z `clip-path: inset()`), przeciągany uchwyt dzieli ekran;
  idealne do porównania orto vs topo albo starych map sztabowych z OSM.
- **🕘 Ostatnio używane** — automatyczna kategoria z historią 8 map.
- Test dostępności ⚡, ulubione i przelot ▶ jak w wersji 1.

**POI:**
- Schemat v2: `{id, lat, lng, name, cat, color, note, ts}` z migracją ze
  starych waypointów; zapis w `localStorage` po każdej zmianie.
- 9 kategorii (nocleg, jedzenie, woda, szczyt, widok, zabytek, transport,
  uwaga, ogólny) z kolorowymi pinami SVG i emoji.
- Edytor: nazwa, kategoria, kolor (paleta 8 + auto z kategorii), notatka.
- Dodawanie: przycisk 📌, **long-press na mapie** (mobile) lub prawy przycisk
  (desktop) — szybkie menu miejsca (Dodaj POI / Kopiuj współrzędne / Nawiguj).
- Panel listy: sortowanie po odległości od środka mapy, szukajka, filtr
  kategorii, ukrywanie kategorii na mapie (2× klik na chip).
- Usuwanie z **cofnięciem (undo)** w toaście; eksport GPX i GeoJSON,
  import GPX/GeoJSON; wpt ze śladów GPX można dopisywać do POI.

**Audyt mobilny (Chromium, 390×844, touch)** wykrył i naprawiono:
43 cele dotykowe < 40 px, ściętą nazwę mapy, 9 przycisków stłoczonych
w topbarze (przeniesione do dolnego paska akcji), brak `safe-area`,
`prompt()` zamiast edytora, brak long-pressa i wibracji (haptyka
`navigator.vibrate`).

## 7. Uwagi prawne

Endpointy Google, 2GIS, nakarte, marshruty itp. pochodzą z nieoficjalnych
pakietów społeczności Locusa — dostawcy mogą je zmieniać lub ograniczać.
Do zastosowań produkcyjnych używaj źródeł z jawną licencją (OSM + własny
serwer kafelków, dostawcy z kluczem API, usługi publiczne PZGiK).
