# Rejestr źródeł map — stan wiedzy (2026-07)

Status: ✅ działa (zweryfikowane w aplikacji/konfiguracjach), 🔑 wymaga klucza,
⚠️ ograniczenia, ❌ martwe (nie dodawać), ❓ niezweryfikowane z tego środowiska
(proxy) — sędzią test ⚡.

## Fundamenty (✅, bez klucza)

| Źródło | Wzorzec | Uwagi |
|---|---|---|
| OSM Standard | `tile.openstreetmap.org/{z}/{x}/{y}.png` | z19 |
| OSM FR/HOT/DE, CyclOSM | `{s}.tile.openstreetmap.fr/...`, `tile.openstreetmap.de` | subdomeny abc |
| Carto light/dark/voyager | `{s}.basemaps.cartocdn.com/...{r}.png` | abcd, retina {r} |
| OpenTopoMap | `{s}.tile.opentopomap.org` | z17 |
| Esri (10+ stylów) | `server.arcgisonline.com/ArcGIS/rest/services/<S>/MapServer/tile/{z}/{y}/{x}` | World_Imagery, Topo, NatGeo, Hillshade, USA_Topo_Maps (hist.) |
| Google (inż. wsteczna) | `mt{0-3}.google.com/vt/lyrs={m,s,y,p,h}&x&y&z` | szara strefa ToS |
| NASA GIBS | `gibs.earthdata.nasa.gov/wmts/epsg3857/best/<LAYER>/default/...` | BlueMarble L8, VIIRS TrueColor L9 (z datą {d}), CityLights_2012 L8 |
| EOX Sentinel-2 | `tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2020_3857/default/g/{z}/{y}/{x}.jpg` | z14 |
| Waymarked Trails | `tile.waymarkedtrails.org/{hiking,cycling,mtb,riding,skating,slopes}` | nakładki |
| OpenRailwayMap | `{s}.tiles.openrailwaymap.org/{standard,maxspeed,signals}` | abc |
| OpenSeaMap | `tiles.openseamap.org/seamark` | nakładka |
| OpenSnowMap | `tiles.opensnowmap.org/pistes` | nakładka |
| TopPlusOpen (BKG) | `sgx.geodatenzentrum.de/wmts_topplus_open/tile/1.0.0/{web,web_grau}/default/WEBMERC/{z}/{y}/{x}.png` | cała Europa, backup topo |
| Kraje: swisstopo, basemap.at, Kartverket, IGN FR (geopf), IGN ES, basemap.de | patrz layers.js | wszystkie 3857 |
| USGS | `basemap.nationalmap.gov/arcgis/rest/services/USGS{Topo,ImageryOnly,ImageryTopo}/MapServer/tile/{z}/{y}/{x}` | |
| 2GIS | `tile2.maps.2gis.com/tiles?x&y&z&v=1` | miasta WNP |
| nakarte.me (genshtab) | `tiles.nakarte.me/{topo250,topo500,topo1000}/{z}/{x}/{y}` | **TMS!** |
| HGIS Cartomatic | `wms.hgis.cartomatic.pl/topo/3857/{wig100k,m25k}/{z}/{x}/{y}.png` | ❓ hist. PL |
| Wikimapia | `i{hash}.wikimapia.org/?x&y&zoom&type=hybrid` hash=x%4+(y%4)*4 | http only → wariant wsrv.nl |
| wsrv.nl | `https://wsrv.nl/?url=<encoded-http-url>` | proxy obrazków https dla źródeł http |

## Geoportal.gov.pl (PZGiK) — WAŻNE ROZRÓŻNIENIE UKŁADÓW

| Usługa | Typ | Układ | Jak używać |
|---|---|---|---|
| `WMTS/guest/wmts/{ORTO,TOPO,BDOT10k,G2_MOBILE_500}` | WMTS KVP | ✅ EPSG:3857 | wprost XYZ-KVP |
| `WMTS .../ISOK_CIEN`, `NMT/GRID1/WMTS/ShadedRelief` | WMTS | ❌ tylko 2180 | NIE w Leaflet |
| `img/guest/{CIEN,HIPSO}/MapServer` | ArcGIS REST | export → 3857 | typ `esri` (serwer reprojektuje) |
| `gprest/services/G2_MOBILE_500/MapServer` | ArcGIS REST | export → 3857 | ✅ POTWIERDZONE przez użytkownika (mapa topo BDOT10k, szybkie z size=512) |
| `pub/guest/kompozycja_BDOT10k_WMS/MapServer` | REST/WMS | ？ | export NIEPOTWIERDZONY (użytkownik potwierdził tylko gprest) — nie używać bez testu |
| `PZGIK/NMT/GRID1/WMS/ShadedRelief` (1m) | WMS | 2180/4326 | `crs4326:true`, v1.1.1 |
| `PZGIK/mapy/WMS/MapyTopograficzne`, `PZGIK/ORTO/WMS/HighResolution` | WMS | j.w. | `crs4326:true` |
| `integracja.gugik.gov.pl/cgi-bin/KrajowaIntegracjaEwidencjiGruntow` | WMS | ✅ 3857 | dzialki,numery_dzialek (ELI/JOSM) |

## 🔑 Wymagają klucza (sekcje Premium/Pogoda)

Thunderforest (outdoors/landscape/cycle/transport), OpenWeatherMap (`*_new`),
Mapy.cz API v1, Stadia (Stamen terrain/toner/watercolor), Tracestrack.

## ❌ Martwe / nie dodawać

MapQuest, ChartBundle, toolserver HikeBike, tiles.wmflabs.org, Kosmosnimki,
stara Strava heatmap (wymaga logowania), mail.ru/navitel, mapy z IP
`91.237.82.95:8086` (genshtab/Strelbitsky z pakietów Orux — niestabilne),
Yandex (EPSG:3395 — poza Leafletem), HERE/Mapbox bez tokena.

## Wiedza o środowisku pracy

- Proxy sesji CCR blokuje większość hostów map (000/403) — weryfikacja
  bezpośrednia niemożliwa; używaj WebSearch/WebFetch na raw.githubusercontent
  (działa) i testu ⚡ po stronie użytkownika.
- `api.github.com` działa curl-em dla repo w zakresie sesji; poza zakresem — 403.
- Playwright: `--no-sandbox`, executablePath `/opt/pw-browsers/chromium`;
  kafelki zewnętrzne nie przejdą (proxy), ale żądania widać w `page.on("request")`.
