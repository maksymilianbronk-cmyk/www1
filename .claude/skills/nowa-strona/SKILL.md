---
name: nowa-strona
description: Dodaje nową stronę do kolekcji www. Użyj, gdy użytkownik prosi o "nową stronę", "nowa strona", "dodaj stronę" lub podobnie. Tworzy folder sites/<slug>/index.html ze startowym szablonem i rejestruje wpis w assets/js/sites.js, dzięki czemu karta pojawia się w galerii na stronie głównej.
---

# Nowa strona

Procedura dodania nowej strony do kolekcji w tym repozytorium.

## Kiedy uruchamiać

Gdy użytkownik wyda polecenie typu „nowa strona", „dodaj stronę", „stwórz stronę"
(opcjonalnie z nazwą/tematem, np. „nowa strona portfolio").

## Kroki

1. **Ustal dane strony**
   - `slug` — nazwa folderu: małe litery, bez polskich znaków, spacje → `-`
     (np. „Moje Portfolio" → `moje-portfolio`).
   - `title` — czytelny tytuł karty.
   - `desc` — krótki, jednozdaniowy opis.
   - `icon` — pasujące emoji jako miniatura.
   - `tag` — kategoria (np. `landing`, `portfolio`, `gra`, `narzędzie`).
   - Jeśli użytkownik nie podał tematu/nazwy, dopytaj **tylko o jedno**: jaki ma być
     temat strony. Resztę dobierz sam sensownie.
   - Jeśli folder `sites/<slug>/` już istnieje, dodaj sufiks (`-2`) albo zaproponuj inny slug.

2. **Utwórz folder i plik** `sites/<slug>/index.html`
   - Samodzielny dokument HTML (własny `<style>`, opcjonalnie `<script>`).
   - Spójny z ciemnym motywem kolekcji (tło `#0f0f13`, tekst `#e8e8f0`,
     akcent `#6c63ff`), responsywny, `lang="pl"`.
   - Wypełnij treścią pasującą do tematu — nie zostawiaj pustego „lorem ipsum",
     chyba że użytkownik prosi o czysty szablon.

3. **Zarejestruj wpis** w tablicy `SITES` w `assets/js/sites.js`
   ```js
   {
     slug: "<slug>",
     title: "<title>",
     desc: "<desc>",
     icon: "<emoji>",
     tag: "<tag>",
     preview: false,
   },
   ```
   Dodaj na końcu tablicy (przed zamykającym `];`).

4. **Commit i push** na bieżącą gałąź roboczą
   - Komunikat: `feat: dodaj stronę <slug> do kolekcji`.
   - Push: `git push -u origin <branch>`.

5. **Podsumuj** użytkownikowi: nazwę folderu, ścieżkę i że karta jest już w galerii.

## Zasady

- Każda strona jest **w pełni samodzielna** — nie współdziel CSS/JS między stronami,
  chyba że użytkownik wprost o to poprosi (wtedy `assets/`).
- Nie zmieniaj logiki strony głównej (`index.html`, `main.js`) — jedynym punktem
  rejestracji jest `assets/js/sites.js`.
- Trzymaj się konwencji opisanej w `CLAUDE.md`.

## Zasady menu mobilnego (hamburger) — wymagania klienta

Przy każdej stronie z hamburgerem i pełnoekranowym menu mobilnym:

1. **Hamburger musi pozostać widoczny po otwarciu menu** (zamienia się w „X"
   do zamknięcia). Uwaga na pułapkę z-index: jeśli hamburger siedzi w
   `position: fixed` headerze z własnym z-index, header tworzy stacking context
   i overlay menu (wyższy z-index) przykryje hamburger mimo wyższego z-index na
   samym przycisku. Rozwiązanie: przy otwartym menu podbij z-index CAŁEGO
   headera powyżej overlaya, np.:
   ```css
   body.menu-locked .site-header { z-index: 1200; } /* menu ma np. 1100 */
   body.menu-locked .site-header.scrolled { background: transparent; box-shadow: none; }
   ```
2. **Teksty linków w menu nie mogą na siebie nachodzić** na małych ekranach:
   - font-size linków przez `clamp()` (np. `clamp(1.5rem, 6.5vw, 2.6rem)`),
     `line-height` ≥ 1.15, `white-space: nowrap`;
   - kontener menu: `overflow-y: auto; overscroll-behavior: contain` +
     `margin-top: auto` na nav i stopce zamiast `justify-content: center`,
     żeby przy niskich ekranach lista scrollowała się zamiast nachodzić;
   - `padding-top` menu większy niż wysokość headera (logo i X nie nachodzą
     na pierwszy link).
3. Po otwarciu blokuj scroll strony (`body.menu-locked { overflow: hidden; }`),
   zamykaj menu po kliknięciu linku i po `Escape`, ustawiaj `aria-expanded`.
4. Zweryfikuj w headless Chromium na wąskich viewportach (390 px i 320 px):
   otwórz menu i sprawdź, że hamburger jest w viewporcie i klikalny
   (`document.elementFromPoint` w środku przycisku trafia w przycisk),
   a bounding boxy linków się nie przecinają.

## Zasady treści wielostronicowej

Preferencja klienta: **mało treści na stronie głównej**. Strona główna =
hero + krótkie zajawki sekcji z linkami. Pełne treści (o nas, oferta,
galeria, opinie, kontakt/formularz, artykuły) rozłóż na podstrony we
wspólnym folderze strony (`sites/<slug>/*.html`) ze wspólną nawigacją.
