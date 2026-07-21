# catalog/extra.json — zdalne aktualizacje katalogu map

Aplikacja Trasa pobiera ten plik przy każdym starcie (raw.githubusercontent,
cache w localStorage). Dzięki temu mapy można aktualizować BEZ wdrażania
aplikacji — wystarczy edytować JSON na tej gałęzi.

Pola:
- `sources` — nowe źródła (schemat jak w layers.js: id, name, cat, url, type,
  wms, overlay, opts, home, http, key),
- `disable` — lista id źródeł do ukrycia (np. martwe serwery),
- `patch`   — poprawki istniejących źródeł po id (np. nowy url, maxZoom).

Przykład:
```json
{
  "sources": [
    { "id": "nowa-mapa", "name": "Nowa mapa", "cat": "Topo / Outdoor",
      "url": "https://serwer/{z}/{x}/{y}.png", "opts": { "maxZoom": 18 } }
  ],
  "disable": ["hist-nls"],
  "patch": { "freemap-sk": { "url": "https://nowy.adres/{z}/{x}/{y}" } }
}
```
