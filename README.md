# poi-db — baza folderów POI aplikacji Trasa

Gałąź danych aplikacji **Trasa — mapy podróżnicze**
(`sites/podroze-mapy` na gałęzi głównej).

Struktura: `poi-db/<użytkownik>/<folder>.json` — każdy plik to jeden folder
punktów POI: `{ "name", "user", "updated", "pois": [...] }`.

Zapis odbywa się z poziomu aplikacji (panel Punkty → Chmura GitHub) przez
GitHub Contents API; odczyt jest publiczny. Ta gałąź celowo nie uruchamia
wdrożenia GitHub Pages.
