---
name: reaktor-landing
description: Tworzy i aktualizuje landing page przez MCP na hostingu z LeadFlow CRM (REAKTOR Landing Kreator) — landing to spec JSON wysyłany jedną komendą curl na landing-api.php; strona od razu żyje pod lp.php?s=slug z formularzem spiętym z CRM. Użyj przy prośbach „landing przez MCP", „postaw landing klientowi", „zaktualizuj landing".
---

# REAKTOR Landing Kreator — landing przez MCP

Dane wejściowe: `URL` instalacji CRM i `KLUCZ` (Ustawienia → Przebudowa przez MCP).

## Procedura

1. Zbierz treści (branża, oferta, miasto, zdjęcia — Unsplash z `?w=1600&q=70`).
2. Zbuduj spec JSON (sekcje w kolejności landingu):

```json
{
  "slug": "barber-jan", "title": "Barber Shop Brusy",
  "description": "SEO opis", "client_token": "TOKEN_KLIENTA_Z_CRM",
  "theme": {"primary": "#b3541e", "accent": "#f5b942", "bg": "#12100e", "font": "Poppins"},
  "sections": [
    {"type": "hero", "kicker": "BARBER · BRUSY", "heading": "...", "sub": "...",
     "cta": "Umów wizytę", "image": "https://..."},
    {"type": "features", "heading": "...", "items": [{"icon": "✂️", "title": "...", "text": "..."}]},
    {"type": "stats", "items": [{"value": 1200, "suffix": "+", "label": "klientów"}]},
    {"type": "text", "heading": "...", "body": "...", "image": "https://...", "side": "left"},
    {"type": "gallery", "heading": "...", "images": ["https://..."]},
    {"type": "testimonials", "items": [{"name": "...", "text": "..."}]},
    {"type": "pricing", "items": [{"name": "...", "price": "50 zł", "desc": "..."}]},
    {"type": "faq", "items": [{"q": "...", "a": "..."}]},
    {"type": "contact", "heading": "...", "phone": "...", "address": "...", "form": true}
  ]
}
```

3. Wyślij: `curl -X POST -H "X-Deploy-Key: KLUCZ" -H "Content-Type: application/json" -d @spec.json "URL/landing-api.php"` → odpowiedź zawiera gotowy adres `lp.php?s=slug`.
4. Zweryfikuj: `curl -s "URL/lp.php?s=slug" | grep h1` + otwórz/screenshot.
5. Aktualizacja = ponowny POST tego samego `slug`. Lista: `GET ?key=…`. Usunięcie: `POST ?action=delete&slug=…&key=…`.

## Szablony branżowe (najszybsza droga)

`GET landing-api.php?key=…&templates=1` → lista. Publikacja z szablonu:

```bash
curl -X POST -H "X-Deploy-Key: KLUCZ" -H "Content-Type: application/json" \
  -d '{"template":"barber","slug":"barber-jan","client_token":"TOKEN",
       "overrides":{"sections":[{"type":"pricing","heading":"Cennik","items":[…]},
         {"type":"map","query":"ul. Główna 1, Brusy"},
         {"type":"hours","items":[{"d":"Pon–Pt","h":"9–18"}]}]}}' \
  "URL/landing-api.php"
```

Klucze: `barber, beauty, budowlana, gastronomia, fitness, moto, stomatolog,
fotograf`. Szablon sam podstawia dane klienta z CRM (firma, miasto, oferta);
`overrides.sections` podmienia sekcję tego samego typu lub dodaje nową przed
kontaktem. Zawsze nadpisz szablonowy cennik i FAQ prawdziwymi danymi klienta.

## Wszystkie typy sekcji

hero · features · stats · steps (jak działamy) · text · gallery · video
(youtube: ID) · logos (pasek zaufania) · testimonials · pricing · hours
(godziny otwarcia) · faq · cta (baner śródstronowy) · map (query: adres)
· contact (form: true)

## Zasady

- `client_token` z zakładki Klienci — formularz landinga tworzy leady w CRM
  (honeypot `_gotcha` już wbudowany). Bez tokena sekcja contact nie ma formularza.
- Motyw dobieraj z brandu klienta; font z Google Fonts (nazwa dokładna).
- Renderer sam dodaje animacje (reveal, liczniki) i responsywność — spec ma być
  treścią, nie kodem. 6–9 sekcji to sprawdzony układ.
