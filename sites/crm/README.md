# ⚡ LeadFlow CRM — leady dla agencji Meta Ads (silnik REAKTOR)

Samodzielny CRM (PHP 8 + SQLite, zero zależności) zbierający leady
**ze stron www klientów** i **z formularzy Facebook Lead Ads** techniką
**webhooków / modułu HTTP Request** (Make.com, Zapier lub bezpośrednio z Meta).

Panele działają na autorskim silniku **REAKTOR ⚛ — „React bez Node'a”**:
aplikacja jednostronicowa (SPA) na zwykłym hostingu PHP, bez Node.js, bez
budowania, bez zależności.

- **Panel super admina** — leady wszystkich klientów NA ŻYWO, filtry działające
  natychmiast (bez przeładowań), zarządzanie kontami, eksport CSV.
- **Panel klienta** — 4 zakładki: **Leady** (na żywo), **Reklamy** (kampanie
  z bieżącego miesiąca: status, wydatki, CTR, koszt leada — z Meta Marketing API),
  **Statystyki** (wykresy dzienne, źródła, lejek statusów), **Wspólne notatki**
  (wątek agencja ↔ klient, synchronizowany na żywo).
- Nowy lead pojawia się w otwartym panelu w ~1 sekundę od webhooka — z toastem
  i opcjonalnym dźwiękiem. Bez odświeżania strony.
- Statusy leadów, notatki, wyszukiwarka, powiadomienia e-mail, antyspam
  (honeypot), deduplikacja, blokada brute-force, diagnostyka serwera.

## Jak działa REAKTOR (i czemu jest tak szybki)

| Technika | Efekt |
|---|---|
| **Stan w localStorage** | panel rysuje się natychmiast z lokalnej kopii (~100 ms), świeże dane dociągają się w tle (stale-while-revalidate) |
| **Widoki deklaratywne + morph DOM** | interfejs to funkcje `stan → HTML`; podmieniane są tylko różniące się węzły — fokus, zaznaczenie i scroll zostają |
| **Long-poll + globalna rewizja stanu** | każda mutacja podbija licznik `state_rev`; otwarte panele trzymają tanie 20-sekundowe połączenie i budzą się w ~1 s po zmianie |
| **Delty zamiast pełnych odpowiedzi** | po zmianie panel pobiera tylko wiersze zmodyfikowane od ostatniej synchronizacji |
| **Mutacje optymistyczne** | zmiana statusu/notatki widoczna od razu, zapis leci w tle; błąd = automatyczny powrót do stanu serwera |
| **Routing hashowy** | przełączanie zakładek bez żadnego żądania HTTP |

Sekret wydajności long-polla: sprawdzanie rewizji to odczyt **jednego wiersza**
SQLite (tryb WAL) raz na sekundę — koszt praktycznie zerowy nawet na tanim
hostingu współdzielonym, a sesja PHP jest zwalniana (`session_write_close()`),
więc nic nie blokuje innych kart ani użytkowników.

---

## 1. Wymagania i instalacja

| Wymaganie | Wartość |
|---|---|
| PHP | 8.1+ z rozszerzeniami `pdo_sqlite`, `curl` (standard na hostingach współdzielonych) |
| Baza | SQLite — plik tworzy się sam w `data/crm.sqlite` |
| Serwer | Apache/LiteSpeed (`.htaccess` w zestawie) lub nginx (patrz niżej) |

**Instalacja:**

1. Wgraj folder `crm/` na hosting z PHP (np. `https://twojadomena.pl/crm/`).
2. Upewnij się, że PHP może zapisywać do podfolderu `data/` (chmod 775).
3. Otwórz `https://twojadomena.pl/crm/` — kreator poprosi o utworzenie konta **super admina**.
4. W zakładce **Klienci** dodaj pierwszego klienta — system wygeneruje jego **token** i gotowy **adres webhooka**.

> **nginx:** folder `data/` musi być zablokowany ręcznie:
> `location ^~ /crm/data/ { deny all; }`

**Test lokalny:** `php -S localhost:8080` w folderze `crm/`.

---

## 2. Leady ze stron www klientów

Każdy klient ma swój adres webhooka (zakładka **Klienci** → skopiuj klikając):

```
POST https://twojadomena.pl/crm/webhook.php?token=TOKEN_KLIENTA
```

Webhook przyjmuje **JSON** oraz **zwykłe pola formularza** (`x-www-form-urlencoded`
/ `multipart`). Rozpoznaje aliasy pól PL/EN: `name`/`imie`/`your-name`,
`email`, `phone`/`telefon`, `message`/`wiadomosc`… Nierozpoznane pola trafiają
do szczegółów leada. Odpowiedź: `{"ok":true,"lead_id":123}`.

### A. Formularz HTML na stronie klienta (fetch)

```html
<form id="kontakt">
  <input name="imie" placeholder="Imię i nazwisko" required>
  <input name="telefon" placeholder="Telefon" required>
  <input name="email" type="email" placeholder="E-mail">
  <textarea name="wiadomosc" placeholder="Wiadomość"></textarea>
  <button>Wyślij</button>
</form>
<script>
document.getElementById('kontakt').addEventListener('submit', async e => {
  e.preventDefault();
  const r = await fetch('https://twojadomena.pl/crm/webhook.php?token=TOKEN_KLIENTA', {
    method: 'POST',
    body: new FormData(e.target),
  });
  if ((await r.json()).ok) { e.target.reset(); alert('Dziękujemy! Odezwiemy się wkrótce.'); }
});
</script>
```

*(CORS jest otwarty — formularz może stać na dowolnej domenie klienta.)*

**Antyspam:** dodaj do formularza ukryte pole-pułapkę — boty je wypełnią,
a CRM po cichu odrzuci takie zgłoszenie:

```html
<input type="text" name="_gotcha" style="display:none" tabindex="-1" autocomplete="off">
```

**Deduplikacja:** identyczne zgłoszenie od tego samego klienta w ciągu 60 sekund
(podwójne kliknięcie „Wyślij") nie tworzy drugiego leada.

### B. WordPress

- **Contact Form 7** — wtyczka „CF7 to Webhook”: wklej adres webhooka (pola
  `your-name`, `your-email`, `your-phone` są rozpoznawane automatycznie).
- **Elementor Forms** — Actions after submit → **Webhook** → wklej adres.
- **WPForms / Fluent Forms** — analogicznie, akcja „Webhook”.

### C. Testy (curl)

```bash
curl -X POST 'https://twojadomena.pl/crm/webhook.php?token=TOKEN_KLIENTA' \
  -H 'Content-Type: application/json' \
  -d '{"imie":"Jan Testowy","telefon":"600100200","email":"jan@test.pl","wiadomosc":"Proszę o kontakt"}'
```

---

## 3. Leady z Facebook Lead Ads

### Wariant A — Make.com / Zapier (moduł HTTP Request) — najszybszy

1. **Trigger:** `Facebook Lead Ads → Watch Leads` (Make) / `New Lead` (Zapier)
   — wybierz stronę i formularz klienta.
2. **Akcja:** moduł **HTTP → Make a request** (Make) / `Webhooks by Zapier → POST`:
   - **URL:** `https://twojadomena.pl/crm/webhook.php?token=TOKEN_KLIENTA&source=facebook`
   - **Method:** `POST`, **Body type:** `JSON`
   - **Body:** zmapuj pola z triggera, np.

     ```json
     {
       "name": "{{full_name}}",
       "email": "{{email}}",
       "phone": "{{phone_number}}",
       "form_name": "{{form_name}}",
       "campaign": "{{campaign_name}}"
     }
     ```
3. Włącz scenariusz — leady wpadają do CRM z ikoną 📘 i nazwą kampanii.

Parametr `&source=facebook` oznacza lead jako pochodzący z Facebooka.

### Wariant B — bezpośredni webhook Meta (bez pośredników i abonamentów)

1. Utwórz aplikację na [developers.facebook.com](https://developers.facebook.com)
   (typ Business) i dodaj produkt **Webhooks**.
2. Subskrybuj obiekt **`page`**, pole **`leadgen`**:
   - **Callback URL:** `https://twojadomena.pl/crm/fb-webhook.php`
   - **Verify token:** z panelu CRM → **Ustawienia** (kopiowanie jednym kliknięciem).
3. W panelu CRM → **Ustawienia** wklej opcjonalnie **App Secret**
   (weryfikacja podpisu żądań — zalecane w produkcji).
4. Dla każdego klienta w zakładce **Klienci** uzupełnij:
   - **ID strony na Facebooku** (po nim CRM przypisuje lead do klienta),
   - **Page Access Token** (uprawnienia `leads_retrieval`, `pages_show_list`,
     `pages_manage_ads`) — nim CRM pobiera z Graph API pełne dane leada.
5. Podepnij stronę klienta pod aplikację
   (`POST /{page-id}/subscribed_apps?subscribed_fields=leadgen`) — najprościej
   w narzędziu [Graph API Explorer](https://developers.facebook.com/tools/explorer/).

Bez Page Access Tokena CRM zapisze lead z samymi identyfikatorami
(`leadgen_id`, `page_id`) i dopisze informację, czego brakuje.

> **Test:** [Lead Ads Testing Tool](https://developers.facebook.com/tools/lead-ads-testing)
> wysyła testowego leada na webhook.

---

## 3b. Reklamy klientów i statystyki (Meta Marketing API + cron)

Zakładka **Reklamy** pokazuje klientowi jego kampanie z bieżącego miesiąca
(status, wydatki, wyświetlenia, kliknięcia, CTR, liczba leadów, koszt leada).
Dane pobiera **cron** z Meta Marketing API:

1. W panelu hostingu ustaw zadanie cron (co godzinę) na adres z
   **Ustawienia → Cron** (np. `wget -q -O /dev/null "https://…/cron.php?key=…"`).
2. Przy kliencie (**Klienci → Ustawienia klienta**) uzupełnij:
   - **ID konta reklamowego Meta** (`act_…` — znajdziesz w Menedżerze reklam),
   - **token Marketing API** z uprawnieniem `ads_read` (puste pole = system
     spróbuje użyć tokena strony).
3. Po pierwszym przebiegu crona dane pojawią się w zakładkach Reklamy
   i Statystyki (koszt leada) — u klienta i u Ciebie.

Bez skonfigurowanego API zakładka Reklamy pokazuje kampanie **wykryte
z napływających leadów** (nazwy kampanii z Lead Ads + liczba zgłoszeń).

Cron dodatkowo robi **codzienną kopię zapasową** bazy do `data/backups/`
(rotacja 14 kopii) i sprząta stare wpisy blokady logowania.

---

## 3c. ApixDrive i inne automatyzacje (dwukierunkowo)

**Do CRM (ApixDrive → LeadFlow):** w ApixDrive wybierz „Webhooks” jako system
odbierający dane (destination), metoda POST, adres = webhook klienta
(`webhook.php?token=…`). Pola `name/email/phone/message` mapują się same.

**Z CRM (LeadFlow → ApixDrive):** w ApixDrive utwórz połączenie „Webhooks
(source)” → dostaniesz catch-URL; wklej go w **Klienci → Wychodzący webhook**.
Każdy nowy lead poleci tam POST-em JSON (`event: lead.created`, dane leada) —
dalej ApixDrive przekaże go do 300+ systemów (CRM, arkusze, SMS, e-mail…).
Ten sam mechanizm działa z Make, Zapier i dowolnym catch-hookiem.

## 3d. Własny panel logowania każdego klienta

Każdy klient ma dedykowany adres logowania: `login.php?panel=<slug>`
(do skopiowania w zakładce **Klienci**). Strona jest brandowana danymi
klienta (nazwa, firma, kolor) i wpuszcza wyłącznie jego konto.

## 3e. Baza danych: SQLite → MySQL (modułowość)

Domyślnie SQLite (zero konfiguracji). Aby przejść na MySQL, utwórz
`data/config.local.php` według wzoru z `lib/db.php` — warstwa `ReaktorPDO`
tłumaczy dialekt w locie, kod aplikacji pozostaje jeden (sterownik MySQL:
status BETA). Plik konfiguracyjny leży w `data/`, więc **przeżywa deploye**.

## 3f. Przebudowa systemu przez MCP (deploy.php)

Panel → Ustawienia → „Przebudowa systemu przez MCP”: klucz + gotowe komendy.
`deploy.php` przyjmuje ZIP z plikami aplikacji, podmienia je bez kasowania
czegokolwiek, `data/` jest nietykalne, przed wdrożeniem powstaje kopia plików
i bazy, rollback jedną komendą. Szczegóły: skill `.claude/skills/reaktor-mcp`.

---

## 3g. ContentForge — automatyczne posty i publikacja na Facebooku

Zakładka **Posty** generuje miesięczny plan treści dla klienta (4–24 postów)
autorską techniką: szablony archetypów (edukacja, promocja, kulisy, FAQ,
CTA leadowe) są personalizowane **prawdziwymi danymi z CRM** (liczba leadów,
wygrane, nazwy kampanii), kalendarzem świąt PL i profilem klienta
(**Klienci → branża, miasto, oferta** — uzupełnij je przed generacją!).

Przepływ: **admin generuje szkice → klient (lub admin) akceptuje → cron
publikuje** na stronie FB o zaplanowanej „złotej godzinie” przez Graph API.
Wymagania publikacji: ID strony + token strony z uprawnieniem
`pages_manage_posts` (ten sam token co dla Lead Ads może je zawierać).
Status, ID posta na FB i ewentualny błąd wracają do panelu na żywo.
„Publikuj teraz” (admin) omija harmonogram. Kolejna generacja tego samego
miesiąca tworzy świeży wariant szkiców — zaakceptowane i opublikowane
posty zostają nietknięte.

---

## 4. Powiadomienia e-mail

CRM wysyła powiadomienie natychmiast po odebraniu leada (funkcją `mail()`
hostingu — na typowych hostingach współdzielonych działa od ręki):

- **do agencji** — ustaw swój e-mail w **Ustawienia → Powiadomienia**
  (otrzymujesz powiadomienie o KAŻDYM leadzie każdego klienta),
- **do klienta** — ustaw jego „e-mail do powiadomień” w **Klienci → Ustawienia klienta**.

Możesz też ustawić własny adres nadawcy (np. `crm@twojadomena.pl`) — poprawia
dostarczalność. Stan funkcji `mail()` sprawdzisz w **Ustawienia → Diagnostyka serwera**.

---

## 5. Bezpieczeństwo

- hasła: `password_hash()` (bcrypt), formularze chronione tokenem CSRF,
  sesje HttpOnly/SameSite,
- blokada brute-force: 8 nieudanych prób logowania z jednego IP = 15 minut przerwy,
- każdy klient ma osobny 40-znakowy token webhooka (można unieważnić jednym kliknięciem),
- klient widzi wyłącznie swoje leady (wymuszone w SQL po stronie serwera),
- baza w `data/` zablokowana przez `.htaccess`; dodatkowy `.htaccess` w katalogu
  głównym blokuje listowanie i pobieranie plików wewnętrznych,
- wpisy ograniczone długością, zapytania wyłącznie parametryzowane (PDO),
  wyjście escapowane (XSS),
- opcjonalna weryfikacja podpisu `X-Hub-Signature-256` dla webhooka Meta,
- poprawne wykrywanie HTTPS także za proxy/CDN (`X-Forwarded-Proto`).

**Kopia zapasowa** = skopiowanie pliku `data/crm.sqlite`.

---

## 6. Struktura plików

```
crm/
├── index.php        # wejście — przekierowanie do właściwego panelu
├── login.php        # logowanie + kreator pierwszego uruchomienia
├── admin.php        # panel super admina — powłoka aplikacji REAKTOR
├── panel.php        # panel klienta — powłoka aplikacji REAKTOR
├── reaktor.js       # ⚛ silnik: morph DOM, stan, cache, sync na żywo
├── views.js         # widoki: Leady / Reklamy / Statystyki / Notatki
├── api.php          # JSON API: bootstrap, delty, mutacje (CSRF)
├── sync.php         # long-poll — kanał zmian w czasie rzeczywistym
├── cron.php         # kampanie z Marketing API + kopie zapasowe (klucz)
├── clients.php      # zarządzanie klientami, tokeny, konta reklamowe
├── settings.php     # ustawienia Meta, cron, powiadomienia, diagnostyka
├── webhook.php      # uniwersalny webhook (www + Make/Zapier)
├── fb-webhook.php   # bezpośredni webhook Meta Lead Ads
├── lead-action.php  # zapasowy endpoint zmiany statusu (bez JS)
├── export.php       # eksport CSV
├── config.php       # rdzeń: baza, sesje, powiadomienia, rewizje stanu
├── ui.php / filters.php / crm.css / crm.js
├── .htaccess        # blokada listowania i plików wewnętrznych
├── CHANGELOG.md     # historia zmian
└── data/            # baza SQLite + kopie zapasowe (chronione .htaccess)
```
