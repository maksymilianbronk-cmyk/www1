# Historia zmian — LeadFlow CRM

## v2.3.0 (2026-07-21) — Landing Kreator: sekcje + szablony branżowe

- 🧩 **7 nowych sekcji landinga** (razem 16): `steps` (jak działamy,
  numerowane kroki), `team` (zespół ze zdjęciami), `cta` (baner
  śródstronowy), `video` (YouTube/mp4), `logos` (pasek zaufania),
  `map` (dojazd — Google Maps bez klucza API), `hours` (godziny otwarcia).
- 🏭 **8 gotowych szablonów branżowych**: barber, beauty, budowlana,
  gastronomia, fitness, moto, stomatolog, fotograf — każdy z dopasowanym
  motywem, fontem, zdjęciami i polskim copy. Publikacja jedną komendą:
  `POST {"template":"barber","slug":…,"client_token":…}` — szablon sam
  podstawia dane klienta z CRM (firma, miasto, oferta).
- 🔧 **Overrides**: nadpisywanie tytułu/motywu oraz sekcji typ-po-typie
  (własny cennik, FAQ) i dołączanie nowych sekcji (mapa, godziny) przed
  kontaktem; `GET ?templates=1` listuje dostępne szablony.
- 📖 Zaktualizowany skill `reaktor-landing` (pełna lista sekcji + procedura
  szablonowa).


## v2.2.0 (2026-07-21) — REAKTOR Landing Kreator

- 🛬 **Landing Kreator — landingi przez MCP**: landing to specyfikacja JSON
  (sekcje: hero, features, stats, text, gallery, testimonials, pricing,
  faq, contact + motyw kolorów i font), wysyłana jedną komendą na
  `landing-api.php` (klucz wdrożeniowy). Strona od razu żyje pod
  `lp.php?s=<slug>`; aktualizacja = ponowny POST, do tego lista/podgląd/
  usuwanie. Spec w bazie (`data/` — przeżywa deploye plików).
- 🎨 Renderer serwerowy z wbudowanymi efektami REAKTOR FX (reveal,
  liczniki, płynne kotwice), responsywny, SEO meta, szanuje
  prefers-reduced-motion.
- 📥 Formularz kontaktowy landinga spięty wprost z webhookiem CRM
  (token klienta walidowany przy publikacji, honeypot wbudowany) —
  leady z landinga wpadają do panelu na żywo.
- 🤖 Skill `reaktor-landing`: procedura budowy speca i publikacji przez MCP.


## v2.1.0 (2026-07-21) — REAKTOR ContentForge

- ✍️ **ContentForge — autorski generator miesięcznych planów postów**:
  łączy trzy źródła — DANE Z CRM KLIENTA (realna liczba leadów, wygrane,
  nazwy kampanii trafiają do treści jako social proof), kalendarz
  marketingowy PL (święta i dni nietypowe) oraz bank archetypów
  (edukacja, promocja, kulisy, FAQ, CTA leadowe) × rotowane hooki.
  Deterministyczny PRNG (mulberry32): ta sama próba = ten sam plan,
  kolejna generacja = świeży wariant. Złote godziny publikacji,
  równomierny rozkład dni, guardy jakości (nie chwalimy się 2 leadami).
- 📅 **Zakładka „Posty”**: plan miesiąca pogrupowany dniami, statusy
  szkic → zaakceptowany → opublikowany/błąd, edycja i „Publikuj teraz”
  (admin), akceptacja jednym klikiem (klient), na żywo w obu panelach.
- 🤖 **Automatyczna publikacja na Facebooku**: cron publikuje
  zaakceptowane posty o zaplanowanej godzinie przez Graph API
  (token strony, uprawnienie pages_manage_posts); fb_post_id i błędy
  wracają do panelu. Baza Graph API konfigurowalna (sandbox/testy).
- 🧑‍🎨 Profil treści klienta: branża, miasto, oferta (paliwo generatora).
- ⚙️ Szlif silnika: renderowanie batchowane przez requestAnimationFrame,
  adaptacyjny odstęp long-polla (0,8→3 s przy bezczynności), timeout API
  15 s, automatyczne wykrycie nowej wersji po deployu MCP (toast+reload).


## v2.0.0 (2026-07-20) — silnik REAKTOR ⚛

- 🚀 **Deploy przez MCP** (`deploy.php`): zdalna podmiana wszystkich plików
  aplikacji paczką ZIP jedną komendą — folder `data/` nietykalny, nic nie jest
  kasowane, kopia plików (rotacja 5) i bazy przed każdym wdrożeniem, rollback.
- 🗒 **Notatki w stylu Google Keep**: siatka masonry, 10 kolorów (ciemna
  paleta Keep), przypinanie, edycja inline, usuwanie, na żywo w obie strony.
- 🎨 **Wszystkie emotki zastąpione ikonami SVG** — biblioteka ~30 ikon
  liniowych, jedno źródło (PHP `svg_icon()` + wstrzyknięcie do JS).
- 🔗 **ApixDrive / dwukierunkowe webhooki**: przyjmowanie POST-ów z ApixDrive
  (jak Make/Zapier) + wychodzący webhook per klient — każdy nowy lead leci
  na catch-hook (`outbound_url`), otwierając dalsze automatyzacje.
- 🚪 **Własny panel logowania każdego klienta**: `login.php?panel=<slug>` —
  brandowany (nazwa, firma, kolor klienta), wpuszcza wyłącznie to konto.
- 🗄 **Modułowość baz danych** (`lib/db.php`): SQLite domyślnie, przejście na
  MySQL przez `data/config.local.php` — translacja dialektu w locie (BETA).
- 🧰 **Skille agencyjne**: `reaktor-strona` (błyskawiczna budowa animowanych
  stron na `assets/reaktor/reaktor-fx.js`) i `reaktor-mcp` (deploy przez MCP).
- 🛡 **24 poprawki z przeglądu adwersaryjnego** (4 wymiary × weryfikacja),
  m.in.: cache stanu per użytkownik (izolacja kont na wspólnym komputerze),
  usuwanie „duchów” leadów po skasowaniu klienta (autorytatywny zbiór id),
  ochrona edytowanych pól przed nadpisaniem przez sync, poprawka stref
  czasowych wykresu, spójna kopia bazy w trybie WAL (`VACUUM INTO`),
  paginacja Graph API, częściowe mutacje leada, automatyczne odświeżenie
  CSRF, pauza long-polla w ukrytej karcie, klucz crona w nagłówku.

- ⚛ **REAKTOR — „React bez Node'a”**: autorski silnik SPA dla zwykłego
  hostingu PHP. Widoki deklaratywne (stan → HTML), rekonsyliacja DOM (morph
  z parowaniem po `data-key`, zachowuje fokus i scroll), stan w localStorage
  (start panelu ~100 ms), routing hashowy, mutacje optymistyczne.
- 🔴 **Dane na żywo**: long-poll (`sync.php`) + globalna rewizja stanu —
  nowy lead pojawia się w otwartym panelu w ~1 s od webhooka, z toastem
  i opcjonalnym dźwiękiem; delty zamiast pełnych odpowiedzi (`api.php?a=delta`).
- 📣 **Zakładka „Reklamy”** w panelu klienta i admina: kampanie bieżącego
  miesiąca z Meta Marketing API (status, wydatki, CTR, leady, koszt leada),
  pobierane cronem; fallback: kampanie wykryte z napływających leadów.
- 📈 **Zakładka „Statystyki”**: leady dziennie (30 dni), źródła, lejek
  statusów, kampanie wg kosztu leada — palety wykresów zwalidowane pod
  kątem dostępności (CVD) i kontrastu.
- 🗒 **Wspólne notatki** agencja ↔ klient — wątek synchronizowany na żywo
  w obie strony.
- ⏱ **cron.php**: kampanie z Marketing API, codzienna kopia zapasowa bazy
  (rotacja 14), sprzątanie; chroniony kluczem, sekcja w Ustawieniach.
- 🔧 Jedno źródło zegara dla delt (SQLite `localtime`) — odporność na różne
  strefy czasowe PHP/systemu.

## v1.1.0 (2026-07-20)

- 📬 **Powiadomienia e-mail** o nowym leadzie — do agencji (globalnie)
  i do klienta (per klient), z konfigurowalnym adresem nadawcy.
- 📈 **Wykres leadów** z ostatnich 14 dni w panelu admina i klienta.
- 🛡 **Blokada brute-force** — 8 nieudanych logowań z IP = 15 min przerwy.
- 🍯 **Honeypot antyspamowy** w webhooku (`_gotcha`, `_honey`, `_honeypot`).
- ♻️ **Deduplikacja zgłoszeń www** — identyczny lead w ciągu 60 s nie dubluje się.
- 🔌 **Box „dla webmastera”** w panelu klienta z jego adresem webhooka.
- 🩺 **Diagnostyka serwera** w ustawieniach (PHP, SQLite, curl, mail, HTTPS, zapis).
- 🔒 `.htaccess` w katalogu głównym: blokada listowania i plików wewnętrznych.
- 🌐 Wykrywanie HTTPS za proxy/CDN (`X-Forwarded-Proto`).
- 🧰 Zgodność eksportu CSV z PHP 8.4 (jawny parametr escape).

## v1.0.0 (2026-07-20)

- Pierwsze wydanie: uniwersalny webhook leadów (www + Make/Zapier),
  bezpośredni webhook Meta Lead Ads z pobieraniem danych z Graph API,
  panel super admina, panele klientów, statusy, notatki, filtry,
  eksport CSV, kreator pierwszego uruchomienia.
