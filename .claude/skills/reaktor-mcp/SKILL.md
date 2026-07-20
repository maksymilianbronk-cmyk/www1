---
name: reaktor-mcp
description: Zdalna przebudowa i modyfikacja działającego systemu LeadFlow CRM (silnik REAKTOR) przez MCP — build paczki ZIP, deploy jedną komendą na hosting, status i rollback, bez utraty danych. Użyj przy prośbach typu „wdróż zmiany na serwer", „zaktualizuj CRM na hostingu", „podmień pliki przez MCP", „cofnij wdrożenie".
---

# Przebudowa LeadFlow CRM przez MCP (deploy.php)

System na hostingu ma endpoint `deploy.php` przyjmujący paczkę ZIP z plikami
aplikacji. Folder `data/` (baza SQLite, kopie, konfiguracja lokalna) jest
**nietykalny** — deploy niczego nie kasuje, a przed podmianą robi kopię plików
(rotacja 5) i bazy.

Dane wejściowe od użytkownika: `URL` instalacji (np. `https://domena.pl/crm`)
oraz `KLUCZ` wdrożeniowy (panel → Ustawienia → „Przebudowa systemu przez MCP").

## Procedura

1. **Zmodyfikuj kod lokalnie** w `sites/crm/` (to jest źródło prawdy — commit do repo!).
2. **Lint:** `php -l` każdego zmienionego .php, `node --check` dla .js.
3. **Zbuduj paczkę** (bez bazy i plików lokalnych):
   ```bash
   cd sites && zip -r /tmp/leadflow-crm.zip crm \
     -x "crm/data/*" -x "crm/.gitignore" -x "crm/dist/*"
   ```
4. **Deploy:**
   ```bash
   curl -X POST -H "X-Deploy-Key: KLUCZ" -F "package=@/tmp/leadflow-crm.zip" "URL/deploy.php"
   ```
   Odpowiedź JSON: `replaced` (liczba plików), `skipped` (pominięte, m.in. data/),
   `snapshot` (znacznik kopii do rollbacku).
5. **Weryfikacja:** `curl "URL/deploy.php?key=KLUCZ"` → `version`, `deployed_at`,
   `db_intact: true`. Otwarte panele same dociągną świeży stan (bump rewizji).
6. **Rollback w razie problemu:**
   ```bash
   curl -X POST "URL/deploy.php?action=rollback&key=KLUCZ"
   ```

## Zasady

- NIGDY nie umieszczaj w paczce plików `data/` — i tak zostaną pominięte, ale
  nie testuj tej granicy.
- Wersjonuj: podbij `CRM_VERSION` w `config.php` i dopisz wpis w `CHANGELOG.md`
  przy każdej wysyłce.
- Migracje schematu rób WYŁĄCZNIE przez `crm_migrate()` (ALTER w pętli
  z ignorowaniem „duplicate column") — uruchamiają się same po deployu.
- Po deployu wykonaj szybki smoke-test: `login.php` (HTTP 200),
  `api.php?a=bootstrap` bez sesji (HTTP 401 = poprawnie chroni).
