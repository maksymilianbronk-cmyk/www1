# ⚡ LeadFlow CRM — leady dla agencji Meta Ads

Lekki, samodzielny CRM (PHP 8 + SQLite, zero zależności) zbierający leady
**ze stron www klientów** i **z formularzy Facebook Lead Ads** techniką
**webhooków / modułu HTTP Request** (Make.com, Zapier, IFTTT lub bezpośrednio z Meta).

- **Panel super admina** — leady wszystkich klientów, zarządzanie kontami, filtry, eksport CSV.
- **Panel klienta** — każdy klient po zalogowaniu widzi **wyłącznie własne** leady.
- Statusy leadów (Nowy → W kontakcie → Umówiony → Wygrany/Przegrany), notatki, wyszukiwarka, statystyki.
- **Wykres leadów** z ostatnich 14 dni w obu panelach.
- **Powiadomienia e-mail** o każdym nowym leadzie — do agencji i/lub klienta.
- Antyspam (honeypot), deduplikacja zgłoszeń, blokada brute-force logowania,
  diagnostyka serwera w ustawieniach.

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
├── admin.php        # panel super admina (leady wszystkich klientów)
├── clients.php      # zarządzanie klientami, tokeny, mapowanie stron FB
├── settings.php     # ustawienia integracji Meta, zmiana hasła
├── panel.php        # panel klienta (tylko własne leady)
├── webhook.php      # uniwersalny webhook (www + Make/Zapier)
├── fb-webhook.php   # bezpośredni webhook Meta Lead Ads
├── lead-action.php  # zmiana statusu / notatki leada
├── export.php       # eksport CSV
├── config.php       # rdzeń: baza, sesje, powiadomienia, helpery
├── ui.php / filters.php / crm.css / crm.js
├── .htaccess        # blokada listowania i plików wewnętrznych
├── CHANGELOG.md     # historia zmian
└── data/            # baza SQLite (chroniona .htaccess)
```
