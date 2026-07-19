---
name: allegro-aukcje
description: Wyszukuje i podlinkowuje aukcje danego sprzedawcy Allegro na stronie w kolekcji. Użyj, gdy użytkownik prosi o "aukcje z Allegro", "podlinkuj oferty sprzedawcy", "sekcję produktów z Allegro" lub podobnie. Fan-out wyszukiwań web po nazwach produktów, walidacja slugów ofert, fallback na wyszukiwanie w profilu sprzedawcy i generator kart HTML (gen_prod_cards.py).
---

# Aukcje Allegro na stronie klienta

Procedura znajdowania i podlinkowywania aukcji konkretnego sprzedawcy Allegro
na stronie z kolekcji, bez dostępu do API Allegro (API wymaga rejestracji
aplikacji przez właściciela konta — patrz „Ograniczenia" na dole).

## Wejście

- `login` — login sprzedawcy na Allegro (np. `FUHWIECZOREK`).
- **Inwentarz** — lista nazw produktów sprzedawcy (najlepiej z cenami).
  Źródła: karta „Informacje o sprzedającym" na Allegro wklejona przez
  użytkownika, sekcja „inne produkty sprzedającego", dane leada z CRM.
  Im dokładniejsze nazwy, tym lepsza trafność wyszukiwań.

## Kroki

1. **Fan-out wyszukiwań** (WebSearch). Wykonuj do skutku lub wyczerpania wzorców,
   po 2 równolegle:
   - `"<login> allegro"` oraz `"<login> allegro oferta <kategoria>"` — Google
     indeksuje sekcję „inne produkty sprzedającego" na kartach ofert, więc jeden
     wynik potrafi zwrócić kilka linków `/oferta/` tego sprzedawcy naraz.
   - `"<dokładna nazwa produktu>" allegro` z `allowed_domains: ["allegro.pl"]` —
     dla każdego charakterystycznego produktu z inwentarza (nazwy unikalne, np.
     z symbolem modelu, dają najlepsze wyniki; generyczne typu „kabel HDMI" — złe).

2. **Walidacja linku bezpośredniego.** Link uznajesz za aukcję sprzedawcy tylko gdy:
   - ma postać `https://allegro.pl/oferta/<slug>-<id>` (id = ciąg cyfr na końcu);
   - `<slug>` odpowiada nazwie produktu z inwentarza po normalizacji
     (małe litery, bez polskich znaków, spacje/znaki → `-`) **lub** wynik
     wyszukiwania jednoznacznie wiąże ofertę z loginem sprzedawcy;
   - **odrzucasz**: `allegro.pl/listing`, `/kategoria/`, `/produkt/`
     (strony zbiorcze — nie wiadomo czyj sprzedawca) oraz
     `archiwum.allegro.pl` (aukcje zakończone!).

3. **Fallback — wyszukiwanie w profilu.** Dla produktów bez potwierdzonego
   linku bezpośredniego użyj linku zawężonego do sprzedawcy:
   `https://allegro.pl/uzytkownik/<login>?string=<słowo-klucz>`
   (słowo-klucz = najbardziej charakterystyczny wyraz nazwy, np. marka).
   Taki link zawsze pokaże tylko oferty tego sprzedawcy.

4. **Dedupe** po id oferty (końcowe cyfry sluga) i po słowie-kluczu fallbacków.

5. **Generacja kart.** Zbierz produkty do JSON-a i wygeneruj HTML skryptem:

   ```bash
   python3 .claude/skills/allegro-aukcje/gen_prod_cards.py produkty.json
   ```

   Format wejścia (patrz nagłówek skryptu): `title`, `href`, opcjonalnie
   `price`, `icon` (id symbolu SVG ze sprite'u strony), `color` (`g`/`b`),
   `smart` (bool). Wynik wklej do siatki `.prod-grid` w sekcji `#aukcje`.

6. **Sekcja na stronie.** Struktura: nagłówek sekcji → `.prod-grid` z kartami →
   nota „ceny orientacyjne z dnia publikacji" → przyciski
   „Wszystkie aukcje sprzedającego" (`/uzytkownik/<login>`) i
   „Oceny i komentarze" (`/uzytkownik/<login>/oceny`).

## Zasady

- **Nie hotlinkuj obrazków** z `allegroimg.com` — miniatury ofert bywają
  rotowane/wygaszane; karty używają ikon SVG ze sprite'u strony.
- Ceny podawaj tylko te znane z inwentarza/wyników i zawsze z notą
  o orientacyjnym charakterze — aukcje się zmieniają.
- Aukcji nie „zgaduj": lepszy fallback na profil niż link do cudzej oferty.
- Po wstawieniu sekcji zweryfikuj w przeglądarce, że wszystkie `href` są
  poprawne (np. `page.$$eval('#aukcje a.prod', ...)`).

## Ograniczenia

- Pełna, automatycznie odświeżana lista aukcji wymaga oficjalnego
  [API Allegro](https://developer.allegro.pl/) (OAuth, rejestracja aplikacji
  przez właściciela konta) — zaproponuj to klientowi jako rozszerzenie.
- Google indeksuje tylko część ofert (zwykle starsze/popularniejsze);
  świeże aukcje znajdziesz wyłącznie fallbackiem przez profil.
