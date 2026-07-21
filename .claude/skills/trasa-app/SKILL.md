---
name: trasa-app
description: >
  Rozwój aplikacji Trasa (sites/podroze-mapy): architektura modułów, chmura POI
  na GitHubie (konta, token właściciela, panel administratora), procedury zmian,
  testy Playwright i wdrożenie na GitHub Pages. Użyj przy każdej pracy nad
  aplikacją map — "dodaj funkcję", "napraw", "przetestuj", "opublikuj",
  "chmura/konta nie działa", "wdróż na Pages". Źródła map: skill zrodla-map.
---

# Trasa — playbook rozwoju aplikacji

## 1. Architektura (sites/podroze-mapy)

- `index.html` — sprite 45+ ikon SVG (symbol/use, stroke), topbar, sidebar
  (szybki dostęp → profile → filtr → kategorie), bottombar mobilny, modale
  (keys, gpx, poi-modal, poi-panel+chmura, wms-modal, offline-modal, name-modal).
- `layers.js` — katalog MAP_SOURCES (typy: xyz, wms [crs4326], esri [REST
  export], wm [wikimapia hash], combo [mapa zespolona]) + CATEGORY_ORDER
  + KEY_PROVIDERS. Licznik warstw wypisany też w index.html (meta+placeholder)
  i assets/js/sites.js — aktualizować RAZEM (3 miejsca).
- `app.js` — moduły w kolejności: stan/LS → indeks źródeł (allSources =
  MAP_SOURCES + zdalny katalog + własne WMS) → warstwy (makeLayer, klasy
  Wikimapia/EsriExport) → mapa/hash → akcje (data-action, topbar+bottombar) →
  profile/quick access → compare (pane+clip-path) → manager warstw → test ⚡
  (tileUrlFor) → wyszukiwarka → GPS → pomiar → POI (kategorie, foldery, edytor,
  panel) → chmura GitHub → KML/KMZ (własny ZIP) → eksporty → klucze → offline
  (bufor kafelków) → skróty → start.
- `sw.js` — offline-shell (CACHE trasa-shell-vN — **podbijać przy każdej
  zmianie plików aplikacji!**) + opcjonalny bufor kafelków (TILE_CACHE,
  flaga przez postMessage + marker w CONFIG_CACHE, limit 4000).
- `cloud-config.js` — opcjonalny ręczny token aplikacji (appToken/appTokenObf).

## 2. Chmura POI (gałąź poi-db)

- Struktura: `poi-db/<login>/_account.json` (login, salt, hash SHA-256
  soli+hasła) + `<folder>.json` ({name,user,updated,pois[]});
  `cloud/config.json` — zakodowany token aplikacji; `catalog/extra.json` —
  zdalne aktualizacje katalogu map (sources/disable/patch).
- **Token właściciela**: konto administratora = login `max` (CLOUD.admin).
  Aktywacja: panel Administratora → obfToken (reverse→base64→kawałki 18 zn.,
  bez sygnatury github_pat_) → PUT cloud/config.json na poi-db. Każda
  przeglądarka pobiera config przy starcie (fetchCloudConfig, cache LS
  "cloudCfg") i dekoduje w locie. Priorytet: własny token > cloud-config.js >
  zdalny config. Panele tokenów widzi TYLKO zalogowany `max` (bootstrap:
  panel admina widoczny też, gdy chmura nieaktywna).
- Zapis: ghApi PUT/DELETE Contents API (branch poi-db), sha z shaCache,
  konflikt → refetch sha (last-write-wins). Odczyt publiczny bez tokena
  (Accept jest CORS-safelisted — zero preflight; NIE dodawać nagłówków typu
  X-GitHub-Api-Version!). Auto-sync: markDirty(folder) → debounce 4 s.
- NIGDY nie wklejać jawnego tokena do repo (Secret Scanning unieważnia)
  ani nie przetwarzać surowego tokena użytkownika w komendach shell
  (klasyfikator uprawnień blokuje — i słusznie); token obsługuje wyłącznie
  przeglądarka właściciela przez panel admina.

## 3. Procedura każdej zmiany (checklista)

1. Edycje w sites/podroze-mapy (+ ewentualnie assets/js/sites.js opis karty).
2. Nowe warstwy → licznik w 3 miejscach; policz `count.js` (eval layers.js).
3. `sed -i 's/trasa-shell-vN/vN+1/' sw.js`.
4. `node --check` każdego zmienionego .js.
5. Smoke test Playwright (patrz §4) — zero PAGEERROR.
6. Commit (PL, konwencja feat/fix(podroze-mapy)) → push na
   `claude/travel-maps-app-goud9f` ORAZ `HEAD:claude/website-collection-setup-xojca4`
   (druga gałąź = źródło Pages; push uruchamia wdrożenie).
7. Monitor wdrożenia: pętla po
   `api.github.com/repos/.../actions/workflows/pages.yml/runs?per_page=1`
   aż head_sha==commit i conclusion==success (narzędzie Monitor, nie sleep).
8. Publiczny adres: https://maksymilianbronk-cmyk.github.io/www1/sites/podroze-mapy/

## 4. Testy (Playwright w tym środowisku)

- `chromium.launch({ executablePath: "/opt/pw-browsers/chromium",
  args: ["--no-sandbox"] })`; serwer: `python3 -m http.server 8765
  --directory /home/user/www1` (uwaga: cwd shellu bywa resetowane).
- Proxy środowiska blokuje serwery kafelków i geoportal — o dostępności
  źródeł świadczy test ⚡ u użytkownika; w testach sprawdzaj WYGENEROWANE
  URL-e (`testTileUrl(byId[id])`, `page.on("request")`), nie piksele.
- Ruch do api.github.com: launch z `proxy: { server: HTTPS_PROXY,
  bypass: "localhost" }` + `--ignore-certificate-errors`. GET-y działają;
  PUT z Authorization pada na preflight (ograniczenie proxy, NIE bug) —
  zapisy weryfikuj po śladach produkcyjnych (pliki w poi-db przez curl).
- Mobile: viewport 390×844, hasTouch, cele dotykowe ≥40 px, bottombar.
- Stany UI symuluj przez localStorage (klucze "trasa:*": cloud, cloudCfg,
  pois, presets, customSources...) + reload.

## 5. Lekcje wyniesione (nie powtarzać błędów)

- Usługi Geoportalu: patrz tabela układów w zrodla-map/references/zrodla.md —
  WMTS bywa tylko EPSG:2180; ratunek: REST export (bboxSR/imageSR=3857) albo
  WMS crs4326. Kompozycje `pub/guest/kompozycja_*/MapServer` mają REST export.
- Emoji w UI → wyłącznie sprite SVG; wyjątek: ikona karty w sites.js.
- Pliki http-only na stronie https → mixed content; proxy wsrv.nl dla obrazków.
- `git push` z pkill w jednym łańcuchu = exit 144 — rozdzielać komendy.
- Playwright `download.path()` daje plik bez rozszerzenia — import plików
  rozpoznaje format po treści (sniffGeoFile), nie po nazwie.
- Elementy w zwiniętych `<details>`/zamkniętych kategoriach są niewidoczne
  dla kliknięć — najpierw otworzyć.
