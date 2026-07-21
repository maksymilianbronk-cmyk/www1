# LeadFlow CRM — pełna dokumentacja techniczna (v2.5.0)

Samodzielny system CRM dla agencji Meta Ads na zwykłym hostingu PHP.
Silnik **REAKTOR** — „React bez Node'a”: SPA z danymi na żywo, bez Node.js,
bez budowania, bez zależności. Ten dokument to kompletna mapa systemu;
szybki start znajdziesz w `README.md`, historię zmian w `CHANGELOG.md`.

---

## 1. Architektura

```
                    ┌───────────── HOSTING PHP (shared) ─────────────┐
 strony www ──POST──▶ webhook.php ─┐                                 │
 Facebook Lead Ads ─▶ fb-webhook.php ─┤   config.php (rdzeń)         │
 ApixDrive/Make ────▶ webhook.php ─┘  │   lib/db.php (SQLite/MySQL)  │
                    │                 ▼                              │
 landing lp.php ────▶ formularz ──▶ [ data/crm.sqlite ]◀── cron.php ◀── cron hostingu
                    │                 ▲        │  (kampanie Meta,    │
 Claude przez MCP ──▶ deploy.php ─────┘        │   publikacja postów,│
                    ▶ landing-api.php          │   kopie zapasowe)   │
                    │                          ▼                     │
                    │   api.php (JSON) ◀── sync.php (long-poll)      │
                    └─────────│────────────────│─────────────────────┘
                              ▼                ▼
                   przeglądarka: reaktor.js + views.js (SPA)
                   admin.php (super admin) · panel.php (klient)
```

Zasady: **push, nie poll** (webhooki), **delty, nie pełne odpowiedzi**,
**optymistyczne UI**, **dane w `data/` nietykalne dla deployów**.

## 2. Pliki systemu

| Plik | Rola |
|---|---|
| `config.php` | rdzeń: schemat bazy + migracje, sesje, CSRF, powiadomienia e-mail, webhook wychodzący, rewizja stanu (`bump_rev`), helpery |
| `lib/db.php` | `ReaktorPDO` — warstwa bazy: SQLite (domyślnie) / MySQL (`data/config.local.php`), translacja dialektu w locie |
| `lib/contentforge.php` | generator planów postów (archetypy × dane CRM × kalendarz PL) + publikacja Graph API |
| `lib/landing.php` | renderer landingów (16 typów sekcji, motywy, efekty FX) |
| `lib/landing-templates.php` | 8 szablonów branżowych landingów |
| `reaktor.js` | silnik SPA: morph DOM, stan + localStorage, pętla sync, mutacje optymistyczne, toasty |
| `views.js` | widoki: Leady / Reklamy / Posty / Statystyki / Notatki (Keep) + wykresy SVG |
| `ui.php` | ikony SVG (jedno źródło PHP+JS), powłoka SPA, layout stron klasycznych |
| `admin.php` / `panel.php` | powłoki paneli (super admin / klient) |
| `login.php` / `logout.php` / `reset.php` | logowanie (+ brandowane panele klientów `?panel=slug`), reset hasła e-mailem |
| `clients.php` | zarządzanie klientami: konta, tokeny, profil treści, integracje FB, webhook wychodzący |
| `settings.php` | ustawienia: Meta webhook, cron, deploy MCP, powiadomienia, landingi, diagnostyka |
| `api.php` | JSON API paneli (bootstrap / delta / mutacje) |
| `sync.php` | long-poll — kanał zmian w czasie rzeczywistym |
| `webhook.php` | uniwersalny webhook leadów (www + ApixDrive/Make/Zapier) |
| `fb-webhook.php` | bezpośredni webhook Meta Lead Ads (weryfikacja, podpis, Graph API) |
| `lead-action.php` | zapasowy endpoint zmiany statusu (bez JS) |
| `export.php` | eksport CSV (separator `;`, BOM dla Excela) |
| `cron.php` | zadania cykliczne (sekcja 8) |
| `deploy.php` | przebudowa systemu przez MCP (sekcja 9) |
| `lp.php` / `landing-api.php` | publiczne landingi + API Landing Kreatora |
| `manifest.webmanifest` / `icon.svg` | PWA — instalacja na ekranie telefonu |
| `crm.css` / `crm.js` | style paneli (desktop + mobile) i drobne interakcje stron klasycznych |
| `data/` | baza SQLite, kopie (`backups/`), wydania (`releases/`), `config.local.php` — **nietykalne dla deployów** |

## 3. Baza danych

Tabele (schemat tworzy się i migruje sam — `crm_migrate()`):

- **admins** — konta super admina (bcrypt).
- **clients** — klienci: login (email+hasło), `token` (webhook), `slug`
  (panel logowania), branding (`color`), profil treści (`industry`, `city`,
  `offer`), integracje FB (`fb_page_id`, `fb_page_token`, `fb_ad_account_id`,
  `fb_ads_token`), `notify_email`, `outbound_url`, `active`.
- **leads** — leady: dane kontaktowe, `source` (www/facebook/inne), `campaign`,
  `raw` (JSON nadmiarowych pól), `status` (nowy→kontakt→umowiony→wygrany/przegrany),
  `note`, znaczniki czasu.
- **notes** — wspólne notatki (Keep): `color`, `pinned`, autor (admin/klient).
- **campaigns** — kampanie Meta per miesiąc (spend, impressions, clicks, leads_count).
- **posts** — plan postów: `month`, `publish_at`, `archetype`, `status`
  (szkic/gotowy/opublikowany/blad), `fb_post_id`, `error`.
- **landings** — specyfikacje landingów (JSON w kolumnie `spec`).
- **settings** — klucz→wartość: `state_rev`, klucze (cron/deploy), tokeny FB,
  konfiguracja poczty, tokeny resetu hasła (`reset_<sha256>`, 30 min).
- **login_attempts** — ochrona brute-force (8 prób z IP = 15 min blokady).

Zmiana silnika na MySQL: utwórz `data/config.local.php` wg wzoru w `lib/db.php`
(sterownik BETA — translacja dialektu w locie, przetestuj przed migracją).

## 4. Silnik REAKTOR (frontend)

- **Stan**: jeden obiekt `R.state` (leads/notes/campaigns/posts/clients/totals),
  cache w `localStorage` per użytkownik (`reaktor_<rola>_<uid>`) → start ~100 ms.
- **Render**: widoki to funkcje `stan → HTML`; `morph()` podmienia tylko różniące
  się węzły (parowanie po `data-key`, ochrona fokusa i edytowanych pól);
  wywołania renderu koalescowane przez `requestAnimationFrame`.
- **Sync**: pętla long-poll (`sync.php?rev=N`, okno 20 s, odczyt 1 wiersza/s)
  → przy zmianie delta `api.php?a=delta&since=TS` (wiersze od znacznika +
  autorytatywny zbiór id leadów — usunięcia znikają na żywo). Odstęp adaptacyjny
  0,8→3,2 s; pauza w ukrytej karcie; wykrycie nowej wersji po deployu → auto-reload.
- **Mutacje optymistyczne**: zmiana widoczna od razu, POST w tle
  (nagłówek `X-CSRF`); błąd → toast + powrót do stanu serwera; wygasły CSRF →
  automatyczne odświeżenie tokena i jedno ponowienie.
- **Routing**: hash (`#/leady …`); parametr `?client=N` z stron klasycznych.

## 5. API paneli (api.php) — sesja + X-CSRF

| Akcja | Kto | Opis |
|---|---|---|
| GET `a=bootstrap` | obaj | pełny stan roli (klient widzi wyłącznie swoje dane) |
| GET `a=delta&since=TS` | obaj | zmiany od znacznika + `lead_ids` |
| POST `a=lead` `{id,status?,note?}` | obaj* | aktualizacja częściowa leada |
| POST `a=lead-delete` `{id}` | admin | usunięcie leada (RODO) |
| POST `a=note` `{client_id?,body,color?}` | obaj | nowa notatka |
| POST `a=note-update` `{id,body?,color?,pinned?}` | autor/admin | edycja notatki |
| POST `a=note-delete` `{id}` | autor/admin | usunięcie notatki |
| POST `a=posts-generate` `{client_id,month,count}` | admin | plan ContentForge (szkice) |
| POST `a=post-update` `{id,body?,publish_at?,status?}` | obaj* | klient: tylko status szkic↔gotowy |
| POST `a=post-publish` `{id}` | admin | natychmiastowa publikacja na FB |
| POST `a=post-delete` `{id}` | admin | usunięcie posta |

\* klient wyłącznie w obrębie własnych rekordów — wymuszone w SQL.

## 6. Wejścia leadów

1. **webhook.php?token=<token-klienta>** — POST JSON/formularz; aliasy pól
   PL/EN; honeypot `_gotcha/_honey/_honeypot`; deduplikacja 60 s; `&source=`.
   Po zapisie: powiadomienia e-mail + webhook wychodzący (`outbound_url` —
   ApixDrive/Make/Zapier dostają JSON `lead.created`).
2. **fb-webhook.php** — bezpośrednio z Meta: GET `hub.challenge`
   (verify token z Ustawień), POST leadgen → dopasowanie klienta po
   `fb_page_id`, pobranie danych leada tokenem strony, deduplikacja po
   `leadgen_id`, opcjonalny podpis `X-Hub-Signature-256` (App Secret).
3. **Formularze landingów** (lp.php) — wbudowane, z tokenem klienta.

## 7. ContentForge i publikacja postów

Generator (sekcja Posty): archetypy (edukacja, promocja, social proof, kulisy,
FAQ, CTA, okazje, kampania) × dane CRM klienta (leady/wygrane/kampanie —
z guardem jakości) × kalendarz świąt PL × profil klienta (branża/miasto/oferta).
PRNG mulberry32: ta sama próba = ten sam plan; regeneracja usuwa tylko szkice.
Przepływ: szkice → akceptacja (klient/admin) → **cron publikuje** o zaplanowanej
godzinie przez Graph API `/{page_id}/feed` (token strony, uprawnienie
`pages_manage_posts`); wynik (`fb_post_id`/błąd) wraca do panelu na żywo.
Baza Graph API konfigurowalna (`settings.graph_base` — sandbox/testy).

## 8. Cron (cron.php?key=… lub nagłówek X-Cron-Key)

Zalecane co godzinę (adres w Ustawieniach). Zadania: kampanie z Marketing API
(bieżący + poprzedni miesiąc, paginacja, autorytatywne czyszczenie miesiąca),
publikacja zaległych postów, kopia bazy raz dziennie (`VACUUM INTO`,
rotacja 14 w `data/backups/`), sprzątanie. **System działa też bez crona** —
webhooki są push; cron dokłada reklamy, posty i kopie.

## 9. Deploy przez MCP (deploy.php)

- `POST` z paczką ZIP (`-F package=@…` lub surowe body) + `X-Deploy-Key` →
  podmiana plików aplikacji. Gwarancje: `data/` pomijane, nic nie jest
  usuwane, kopia plików (rotacja 5 w `data/releases/`) i bazy przed zmianą,
  walidacja ścieżek (path traversal odrzucany).
- `GET ?key=…` → status (wersja, ostatni deploy, kopie, `db_intact`).
- `POST ?action=rollback` → przywrócenie ostatniej kopii plików.
- Otwarte panele wykrywają nową wersję (sync niesie `ver`) i same się
  przeładowują. Migracje schematu uruchamiają się automatycznie.
- Procedury: skill `.claude/skills/reaktor-mcp`.

## 10. Landing Kreator (lp.php / landing-api.php)

Landing = spec JSON w bazie (przeżywa deploye). API (klucz wdrożeniowy):
`GET ?templates=1` (8 szablonów branżowych), `GET` lista, `GET ?slug=…` spec,
`POST` spec lub `{"template":…,"client_token":…,"overrides":…}`,
`POST ?action=delete&slug=…`. 16 typów sekcji (hero, features, stats, steps,
text, gallery, video, logos, testimonials, pricing, hours, faq, cta, map,
team, contact). Formularz kontaktowy tworzy leady w CRM. Lista landingów
także w panelu: Ustawienia → Landingi. Procedury: skill
`.claude/skills/reaktor-landing`.

## 11. Bezpieczeństwo

- Hasła bcrypt; sesje HttpOnly/SameSite/secure(HTTPS); regeneracja id po
  zalogowaniu; CSRF (formularze + nagłówek `X-CSRF` w API).
- Blokada brute-force (login + prośby o reset); reset hasła: token 30 min,
  hash w bazie, jednorazowy, bez ujawniania istnienia konta.
- Izolacja ról wymuszana w SQL; osobne tokeny per klient (unieważnialne);
  osobny klucz crona i deployu (nagłówki zamiast URL tam, gdzie się da).
- `data/` za `.htaccess` (deny) + `.htaccess` w katalogu głównym (blokada
  listowania i plików wewnętrznych); wyjście escapowane (XSS); zapytania
  wyłącznie parametryzowane; limity długości pól i rozmiarów żądań;
  podpis Meta `X-Hub-Signature-256` (opcjonalny App Secret).
- RODO: usuwanie pojedynczego leada (panel/API), usunięcie klienta kasuje
  kaskadowo jego dane, eksport CSV.

## 12. Wersja mobilna i PWA

- ≤740 px: kompaktowy pasek górny + **dolny pasek zakładek** (ikony, cele
  dotykowe ≥44 px, `safe-area-inset` pod „notch”), układy jednokolumnowe,
  brak przewijania poziomego.
- **PWA**: `manifest.webmanifest` + ikona SVG — panel można „Dodać do ekranu
  głównego” na telefonie (działa jak aplikacja, pełny ekran, własna ikona).
- Landingi: responsywne z założenia (clamp, grid auto-fit,
  `prefers-reduced-motion`).

## 13. Rozwiązywanie problemów

| Objaw | Sprawdź |
|---|---|
| leady nie wpadają | token w adresie webhooka; Ustawienia → Diagnostyka; odpowiedź webhooka (`ok:false` z powodem) |
| brak leadów z Meta | verify token / subskrypcja `leadgen`; `fb_page_id` przy kliencie; Page Access Token (`leads_retrieval`) |
| zakładka Reklamy pusta | cron ustawiony? `fb_ad_account_id` + token `ads_read`; błędy w odpowiedzi crona |
| posty się nie publikują | status „Zaakceptowany”? cron działa? token strony z `pages_manage_posts`; kolumna `error` przy poście |
| panel nie odświeża na żywo | HTTPS/proxy ucina długie żądania → sync wróci jako zwykły poll; sprawdź kropkę „live” w pasku |
| e-maile nie dochodzą | Diagnostyka → `mail()`; ustaw adres nadawcy w domenie hostingu |
| deploy odrzucony | klucz wdrożeniowy; rozszerzenie `zip` w diagnostyce |
| „Zbyt wiele prób logowania” | odczekaj 15 min (blokada per IP) |

Kopia zapasowa = plik `data/crm.sqlite` (+ automatyczne w `data/backups/`).
