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

**Ikonografia:** cały interfejs korzysta z autorskiego sprite'a 40+ ikon SVG
(`<symbol>` w index.html, styl stroke à la Lucide, `currentColor`) — piny POI,
chipy kategorii i profili, paski narzędzi, popupy; zero emoji w UI.

**Audyt mobilny (Chromium, 390×844, touch)** wykrył i naprawiono:
43 cele dotykowe < 40 px, ściętą nazwę mapy, 9 przycisków stłoczonych
w topbarze (przeniesione do dolnego paska akcji), brak `safe-area`,
`prompt()` zamiast edytora, brak long-pressa i wibracji (haptyka
`navigator.vibrate`).

## 7. Wikimapia — inżynieria wsteczna wariantów

Po ponownej analizie pakietów AnyGIS/melda i implementacji z
[leaflet.wikimapia](https://github.com/olegsmetanin/leaflet.wikimapia)
(ten sam wzór stosują SAS.Planet i pakiety Locusa):

- kafelek: `http://i{hash}.wikimapia.org/?x={x}&y={y}&zoom={z}&type=hybrid&lng=0`,
  gdzie **hash = x%4 + (y%4)·4** (subdomeny `i0`–`i15`) — zaimplementowane
  jako własna klasa `L.TileLayer` z nadpisanym `getTileUrl` (Leaflet nie umie
  liczyć subdomeny z kafelka);
- serwery Wikimapii nie mają https, więc wariant domyślny opakowuje kafelek
  w `https://wsrv.nl/?url=…` (publiczny cache obrazków images.weserv.nl) —
  dzięki temu nakładka działa też na stronie https (github.io) bez żadnego
  klucza API; wariant bezpośredni (http) zostaje dla Androida/WebView;
- gotowe profile: **Wikimapia** (OSM+obiekty), **Google+Wikimapia**,
  **Google Sat+Wikimapia** — odpowiedniki hybryd z pakietów rosyjskich.

## 8. Baza plików POI w repozytorium GitHub (konta użytkowników)

Architektura „chmury" bez własnego backendu:

- dane trzyma osobna gałąź **`poi-db`** (nie uruchamia wdrożeń Pages),
  struktura: `poi-db/<użytkownik>/<folder>.json`, a każdy plik to jeden
  folder punktów: `{ name, user, updated, pois[] }`;
- **odczyt jest publiczny** — GitHub Contents API pozwala czytać publiczne
  repo bez tokena i wysyła nagłówki CORS, więc „Przeglądaj bazę" działa
  u każdego (nagłówek `Accept` jest CORS-safelisted — zero preflight);
- **zapis** wymaga fine-grained tokena (Contents: write) wklejanego
  w aplikacji (trzymany w localStorage) — commit przez `PUT /contents`,
  konflikt SHA rozwiązywany strategią last-write-wins z ponownym pobraniem;
- **auto-sync**: każda zmiana oznacza folder jako „brudny" i po 4 s ciszy
  zapisuje tylko zmienione pliki (debounce), więc nie trzeba niczego
  eksportować ręcznie; foldery można tworzyć, zmieniać nazwy i usuwać,
  a operacje odbijają się w plikach repo;
- pełna historia zmian punktów = historia commitów gałęzi `poi-db`.

To model lepszy niż w Locus/OsmAnd o tyle, że baza jest jawna, wersjonowana
i współdzielona linkiem, a „konto" nie wymaga rejestracji — wystarczy nazwa
katalogu i token.

## 9. Własne mapy WMS/XYZ

Manager warstw pozwala dopisać dowolną usługę WMS (endpoint + LAYERS +
format + przezroczystość, np. geoportale wojewódzkie, ISOK) albo serwer
kafelków XYZ; wpisy trafiają do kategorii „Moje mapy (własne)"
w localStorage i zachowują się jak wbudowane (ulubione, test ⚡, profile).
Z Geoportalu dołączona jest też ortofotomapa **HighResolution** (piksel
5–10 cm) obok standardowej i cieniowania NMT z lidaru.

## 10. Mapy historyczne i poprawki Geoportalu

- Kategoria **Mapy historyczne**: rosyjskie sztabówki (nakarte.me 1:25k/50k/100k
  + marshruty.ru), polskie **WIG 1:100 000** i pruskie **Messtischblätter 1:25 000**
  (serwer HGIS Cartomatic), skany **USGS** (Esri USA_Topo_Maps) i **OS 1919–47**
  (National Library of Scotland).
- Cieniowanie 1 m z ISOK: kafelkowe usługi Geoportalu (WMTS `ISOK_CIEN`,
  `NMT/GRID1/WMTS/ShadedRelief`) publikują wyłącznie układ **EPSG:2180**,
  którego Leaflet nie reprojektuje — dlatego warstwa korzysta z WMS
  z wymuszonym **EPSG:4326** (`crs: L.CRS.EPSG4326`, gwarantowany przez
  INSPIRE); tak samo topo raster i orto HD. Wizualizacja BDOT10k dodana
  z kafelkowego WMTS `guest/wmts/BDOT10k` (ten ma zestaw EPSG:3857, jak ORTO).
  Cieniowanie jest szybkim przełącznikiem na górze panelu warstw. TopPlusOpen
  (BKG) dodany jako ogólnoeuropejski backup topo z listy leaflet-providers.

## 11. KML / KMZ

Import i eksport bez bibliotek: własny czytnik ZIP (parsowanie central
directory + `DecompressionStream("deflate-raw")`) i zapis KMZ jako ZIP
w trybie *stored* z liczonym CRC32. Parser KML obsługuje Point, LineString,
LinearRing i gx:Track; format pliku rozpoznawany po zawartości (magic bytes),
nie tylko rozszerzeniu. Eksport POI zachowuje foldery jako `<Folder>`.

## 12. Offline — bufor kafelków

Panel „Offline — bufor map": włączany bufor Cache Storage (service worker
dosyła kafelki z bufora przy braku sieci; strategia network-first),
pobieranie widocznego obszaru do 3 poziomów zoomu (limit 600 kafelków,
pula 8 równoległych pobrań `no-cors`), podgląd zawartości bufora per serwer
z czyszczeniem per-host i całości oraz licznik zajętości magazynu
(`navigator.storage.estimate`). SW przycina bufor powyżej 4000 wpisów.

## 13. System szybkich aktualizacji map

Plik `catalog/extra.json` na gałęzi `poi-db` to kanał aktualizacji katalogu
bez wdrożenia: `sources` dodaje źródła, `disable` ukrywa martwe, `patch`
łata istniejące (np. nowy URL). Aplikacja pobiera go przy starcie
(raw.githubusercontent, CORS), cache'uje w localStorage i stosuje także
offline. Edycja JSON-a w repo = natychmiastowa aktualizacja map u wszystkich.

## 14. Konta użytkowników (login + hasło)

Rejestracja tworzy `poi-db/<login>/_account.json` z solą i haszem SHA-256
hasła (WebCrypto); logowanie weryfikuje hasz po stronie klienta i otwiera
sesję auto-sync folderów POI. Zapisy idą przez **token aplikacji** właściciela
repo z `cloud-config.js` (fine-grained, Contents:write tylko do www1) —
użytkownicy nie potrzebują własnych tokenów. Ograniczenia bezpieczeństwa
(token jawny w kliencie, weryfikacja umowna) opisane w cloud-config.js;
docelowo token powinien mieszkać w lekkim backendzie.

## 15. Uwagi prawne

Endpointy Google, 2GIS, nakarte, marshruty itp. pochodzą z nieoficjalnych
pakietów społeczności Locusa — dostawcy mogą je zmieniać lub ograniczać.
Do zastosowań produkcyjnych używaj źródeł z jawną licencją (OSM + własny
serwer kafelków, dostawcy z kluczem API, usługi publiczne PZGiK).
