---
name: zrodla-map
description: >
  Wyszukiwanie, weryfikacja i dodawanie źródeł map (XYZ/WMS/WMTS/ArcGIS REST)
  do aplikacji Trasa (sites/podroze-mapy). Użyj, gdy użytkownik prosi o "dodaj
  mapę", "nowe źródło map", "nowa warstwa", "sprawdź czy mapa działa", "znajdź
  mapy podobne do...", "napraw warstwę", "cieniowanie/orto/geoportal nie działa"
  lub podaje link do pakietu map (onlinemapsources.xml, AnyGIS, Locus, OruxMaps).
---

# Źródła map — wyszukiwanie, weryfikacja, dodawanie

Playbook pracy ze źródłami kafelków dla aplikacji **Trasa**
(`sites/podroze-mapy`). Rejestr znanych źródeł: `references/zrodla.md`.

## 1. Gdzie szukać nowych źródeł (kolejność skuteczności)

1. **leaflet-providers** — `raw.githubusercontent.com/leaflet-extras/leaflet-providers/master/leaflet-providers.js`
   — najlepiej utrzymywana lista ŻYWYCH endpointów bez klucza (WebFetch działa).
2. **editor-layer-index (ELI/JOSM)** — `github.com/osmlab/editor-layer-index`,
   pliki `sources/europe/pl/*.geojson` — społecznościowo weryfikowane, z listą
   wspieranych EPSG. (Uwaga: API GitHuba spoza zakresu sesji bywa blokowane —
   wtedy WebSearch po nazwie pliku/issue.)
3. **Pakiety Locus/OruxMaps/SAS.Planet** — format `onlinemapsources.xml`
   (tokeny `{$x}{$y}{$z}{$s}`): gist oneyoung, `dkxce/OruxMaps-Online-Maps`,
   AnyGIS (`nnngrach/AnyGIS_maps`), melda.ru. Skarbnica wzorców URL, ale ~połowa
   wpisów martwa — każdy sprawdzaj.
4. **Konfiguracje przeglądarek map**: `rzymek/geoproxy` (usługi Geoportalu),
   nakarte.me (genshtab), plugin `leaflet.wikimapia` (hash subdomen).
5. **Usługi krajowe**: geoportal.gov.pl → „Usługi przeglądania"; frazy WebSearch:
   `"mapy.geoportal.gov.pl" WMTS <temat>`, `"integracja.gugik.gov.pl" WMS`,
   `site:spatineo.com <nazwa usługi>` (spatineo listuje wspierane CRS).
6. Frazy ogólne: `<kraj> WMTS EPSG:3857 tiles`, `<mapa> {z}/{x}/{y} template`,
   `github <nazwa> tile url`.

## 2. Pułapki formatów (sprawdź ZANIM dodasz)

- **Układ współrzędnych — pułapka nr 1.** Leaflet renderuje tylko
  EPSG:3857 (kafelki XYZ/WMTS GoogleMapsCompatible). Jeśli usługa ma tylko:
  - **EPSG:2180** (Geoportal WMTS `ISOK_CIEN`, `NMT/GRID1/WMTS/ShadedRelief`) →
    użyj **ArcGIS REST `/MapServer/export`** z `bboxSR=3857&imageSR=3857`
    (typ `esri` w layers.js — serwer sam przeprojektowuje) albo **WMS z
    `crs4326: true`** (EPSG:4326 gwarantowane przez INSPIRE; typ `wms`).
  - **EPSG:3395** (Yandex) → nie da się w czystym Leaflet — pomiń.
- **TMS** — oś Y odwrócona (nakarte.me): `opts.tms: true`.
- **WMS**: wersja 1.1.1 → parametr `SRS`, bbox zawsze lng,lat; wersja 1.3.0 →
  `CRS`, a dla EPSG:4326 kolejność osi lat,lng (Leaflet ogarnia, własne testery
  muszą pamiętać). Nasze usługi Geoportalu: patrz rejestr.
- **WMTS KVP**: `SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=…&STYLE=default&
  TILEMATRIXSET=EPSG:3857&TILEMATRIX=EPSG:3857:{z}&TILEROW={y}&TILECOL={x}`.
  Rodzina `mapy.geoportal.gov.pl/wss/service/WMTS/guest/wmts/{ORTO,TOPO,BDOT10k,
  G2_MOBILE_500}` ma zestaw EPSG:3857; LAYER = zwykle nazwa usługi
  (ORTO→ORTOFOTOMAPA).
- **Tylko http** (Wikimapia, UMP, mtbmap, marshruty) → na stronie https mixed
  content; oznacz `http: true`, a dla ważnych źródeł zrób wariant przez proxy
  obrazków `https://wsrv.nl/?url=<encoded>`.
- **Subdomena liczona z kafelka** (Wikimapia: `i{x%4+(y%4)*4}`) → własna klasa
  `L.TileLayer` z `getTileUrl` (wzorzec `WikimapiaLayer` w app.js).
- **Klucz API** (Thunderforest, OWM, Mapy.cz, Stadia, Tracestrack) → pole
  `key:` + `{key}` w URL; kategoria Premium/Pogoda.

## 3. Jak sprawdzić, czy źródło działa

1. Zbuduj URL kafelka testowego: Polska centrum `z=6 x=35 y=21`; dla map
   regionalnych użyj `home` warstwy (wzór w `lngLatToTile` w app.js).
2. Z tego środowiska (proxy blokuje większość hostów!): `curl -sI --cacert
   /root/.ccr/ca-bundle.crt <url>` — status 000/403 z proxy ≠ martwe źródło.
   Gdy proxy blokuje: weryfikuj pośrednio — konfiguracje ELI/JOSM/leaflet-providers
   (żywe listy), spatineo (CRS), issues na GitHubie.
3. **Ostateczny sędzia = test ⚡ w aplikacji** (przycisk przy kategorii,
   funkcja `testTileUrl`) — uruchamiany z przeglądarki użytkownika.
4. Smoke Playwright (`/opt/pw-browsers/chromium`, `--no-sandbox`): sprawdź
   `testTileUrl(byId["id"])` i realne żądania `page.on("request")`.

## 4. Jak dodać źródło do aplikacji (checklista)

1. Wpis w `sites/podroze-mapy/layers.js` (schemat: id, name, cat z
   CATEGORY_ORDER, url, type xyz/wms/esri, wms{layers,format,version,crs4326,
   transparent}, esri{transparent,layers}, combo:[…] dla map zespolonych,
   overlay, opts{maxZoom,subdomains,tms,opacity,attribution}, home, http, key, desc).
2. Zaktualizuj licznik warstw w **3 miejscach**: `index.html` (meta description
   + placeholder filtra) i `assets/js/sites.js` (opis karty). Policz:
   `node scratchpad/count.js` (eval layers.js → MAP_SOURCES.length, duplikaty).
3. Podbij wersję cache SW: `sed -i 's/trasa-shell-vN/trasa-shell-vN+1/' sw.js`.
4. `node --check` wszystkich zmienionych JS + smoke Playwright (0 błędów JS).
5. Commit → push na OBIE gałęzie (`claude/travel-maps-app-goud9f` +
   `claude/website-collection-setup-xojca4` — push na drugą uruchamia deploy
   Pages). Monitor deployu: API runs `pages.yml`, head_sha == commit.
6. Duże/eksperymentalne zmiany map — najpierw kanałem **`catalog/extra.json`**
   na gałęzi `poi-db` (sources/disable/patch): działa u wszystkich bez deployu,
   łatwo wycofać.

## 5. Naprawa niedziałającej warstwy — drzewko decyzyjne

1. Użytkownik: która kropka ⚡ czerwona? / co pokazuje konsola?
2. http na https? → wariant wsrv.nl albo `http: true` + komunikat.
3. WMS pusty? → sprawdź wspierane CRS (spatineo/GetCapabilities przez
   WebSearch); spróbuj `crs4326: true` + `version: 1.1.1`.
4. Usługa kafelkowa w EPSG:2180? → szukaj bliźniaczej usługi REST
   (`img/guest/*/MapServer` na geoportalu) i użyj typu `esri`.
5. Endpoint przeniesiony? → leaflet-providers/ELI mają aktualne adresy;
   napraw przez `patch` w extra.json, potem w layers.js.
