# 🤖 AI-OPERATOR — instrukcje operacyjne LeadFlow CRM dla Claude

Ten dokument jest dla **Claude** (lub innego operatora AI) pracującego przez
MCP/terminal. Definiuje wszystkie procedury zdalnej obsługi żywej instalacji
LeadFlow CRM. Skille w repo: `.claude/skills/reaktor-*` (skróty tych procedur).

**Dane wejściowe od właściciela:** `URL` instalacji (np.
`https://domena.pl/crm`) i klucze z panelu Ustawienia: `DEPLOY_KEY`
(deploy + landingi) oraz `CRON_KEY` (wywołanie crona). Traktuj je jak hasła —
nigdy nie zapisuj w commitach ani plikach paczki.

## Mapa możliwości zdalnych (bez sesji panelu)

| Operacja | Endpoint | Autoryzacja |
|---|---|---|
| status systemu | `GET deploy.php?key=…` | DEPLOY_KEY |
| pełna podmiana plików aplikacji | `POST deploy.php` (ZIP) | X-Deploy-Key |
| rollback plików | `POST deploy.php?action=rollback&key=…` | DEPLOY_KEY |
| landingi: lista/szablony/podgląd | `GET landing-api.php?key=…[&templates=1|&slug=…]` | DEPLOY_KEY |
| landing: publikacja/aktualizacja | `POST landing-api.php` (spec lub template) | X-Deploy-Key |
| landing: usunięcie | `POST landing-api.php?action=delete&slug=…&key=…` | DEPLOY_KEY |
| uruchomienie zadań crona | `GET cron.php` + `X-Cron-Key` | CRON_KEY |
| wysłanie leada testowego | `POST webhook.php?token=<token-klienta>` | token klienta |

Operacje **wymagające sesji panelu** (generowanie postów, mutacje leadów,
notatki) wykonuje właściciel w panelu — nie ma ich w API kluczowym.
Wyjątek: możesz przygotować zmiany w KODZIE (np. nowe szablony postów)
i wdrożyć deployem.

## Procedura: aktualizacja systemu (deploy)

1. Zmiany rób w repo (`sites/crm/`) — **repo jest źródłem prawdy**.
2. Lint: `php -l` każdego zmienionego `.php`, `node --check` dla `.js`.
3. Podbij `CRM_VERSION` w `config.php` + wpis w `CHANGELOG.md`.
4. Zbuduj paczkę bez danych: `cd sites && zip -r /tmp/lf.zip crm -x "crm/data/*" -x "crm/dist/*" -x "crm/.gitignore"`.
5. `curl -X POST -H "X-Deploy-Key: $KEY" -F "package=@/tmp/lf.zip" "$URL/deploy.php"` —
   odpowiedź: `replaced` (liczba), `skipped` (musi zawierać tylko data/*), `snapshot`.
6. Smoke-test: `login.php`→200, `api.php?a=bootstrap` bez sesji→401,
   `deploy.php?key=…`→`db_intact:true`, wersja się zgadza.
7. Problem? `POST deploy.php?action=rollback&key=…` i diagnozuj lokalnie.

Zasady twarde: NIGDY nie pakuj `data/`; migracje schematu wyłącznie przez
`crm_migrate()` (ALTER w pętli z ignorowaniem duplikatów); nie zmieniaj
formatu istniejących kolumn bez migracji przejściowej.

## Procedura: landing dla klienta

1. Pobierz od właściciela: klient (token z zakładki Klienci), branża, oferta,
   prawdziwy cennik/godziny/adres, ewentualne zdjęcia.
2. Najszybciej z szablonu: `POST landing-api.php`
   `{"template":"<branża>","slug":"…","client_token":"…","overrides":{…}}` —
   klucze szablonów: barber, beauty, budowlana, gastronomia, fitness, moto,
   stomatolog, fotograf. **Zawsze** nadpisz overrides: pricing, faq, map
   (adres), hours — prawdziwymi danymi.
3. Pełna kontrola: własny spec (16 sekcji — patrz skill `reaktor-landing`).
4. Weryfikacja: `curl -s "$URL/lp.php?s=<slug>" | grep "<h1"` + screenshot
   mobilny i desktopowy; test formularza → lead ma się pojawić w CRM.
5. Aktualizacja treści = ponowny POST tego samego sluga.

## Procedura: diagnostyka „coś nie działa"

Kolejność sprawdzeń:
1. `GET deploy.php?key=…` → wersja, `db_intact`.
2. `GET login.php` → 200; `GET api.php?a=bootstrap` bez sesji → 401
   (jeśli 500 — czytaj błąd PHP, najczęściej uprawnienia `data/`).
3. Lead testowy: `POST webhook.php?token=…` z `{"imie":"Test Claude","telefon":"000"}`
   → oczekiwane `{"ok":true,"lead_id":N}`. Poproś właściciela o usunięcie
   leada testowego w panelu (przycisk Usuń lead) albo zrób to przy okazji sesji.
4. `GET cron.php` z X-Cron-Key → czytaj `errors[]` (tokeny Meta, konta reklamowe).
5. Błędy publikacji postów: kolumna `error` przy poście (panel) — zwykle
   brak `pages_manage_posts` w tokenie strony.
6. Meta webhook: właściciel sprawdza verify token w Ustawieniach;
   `fb_page_id` musi być uzupełnione u klienta.

## Procedura: praca nad kodem (konwencje)

- Frontend: silnik `reaktor.js` (morph/stan/sync — nie ruszaj bez potrzeby),
  widoki w `views.js` (czyste funkcje stan→HTML, klucze `data-key` na listach,
  wszystkie akcje przez `R.*` z optymistycznym UI).
- Backend: każda mutacja danych **musi** wołać `bump_rev()` (inaczej panele
  nie odświeżą się na żywo). Autoryzację ról wymuszaj w SQL (wzorce w api.php).
- Ikony: wyłącznie `svg_icon()` / `ico()` z biblioteki w `ui.php` — zero emoji
  w UI (emoji dozwolone w TREŚCIACH: posty, szablony landingów).
- SQL w dialekcie SQLite (funkcje czasu `datetime('now','localtime')`) —
  warstwa `lib/db.php` tłumaczy na MySQL; nie używaj konstrukcji spoza
  obsługiwanych wzorców translacji.
- Po każdej zmianie: lint + test e2e odpowiedniego przepływu (wzorce testów
  w historii repo), na końcu deploy wg procedury.

## Skille (skróty procedur)

| Skill | Kiedy |
|---|---|
| `reaktor-mcp` | deploy/rollback/status systemu na hostingu |
| `reaktor-landing` | landing z szablonu lub speca przez MCP |
| `reaktor-strona` | nowa strona www w kolekcji repo na silniku REAKTOR FX |
| `reaktor-operator` | codzienna obsługa: diagnostyka, lead testowy, cron, checklisty |

## Czego NIE robić

- Nie wysyłaj sekretów (klucze, tokeny) do repo, logów ani treści paczek.
- Nie edytuj plików bezpośrednio na hostingu z pominięciem repo — następny
  deploy nadpisze zmiany.
- Nie usuwaj i nie modyfikuj niczego w `data/` (jedyny wyjątek: właściciel
  wprost prosi o przywrócenie kopii bazy — wtedy poinstruuj go krok po kroku).
- Nie publikuj postów ani landingów bez akceptacji właściciela, jeśli treść
  dotyczy prawdziwego klienta.
