---
name: strona-premium
description: >
  Buduje wielostronicowy serwis firmowy w standardzie topowych agencji —
  jasny, przestronny layout z kolorem marki jako akcentem, autorskie ikony SVG,
  animacje przewijania, komplet SEO (JSON-LD, Open Graph z generowanymi
  miniaturami, sitemap) i audyt mobilny w Playwright. Użyj, gdy użytkownik prosi
  o „ładną stronę", „stronę na światowym poziomie", „redesign strony firmowej",
  „stronę kliniki/hotelu/gabinetu", „lepsze SEO", „lepszą wersję mobilną",
  „miniaturkę w social mediach" albo o audyt istniejącej strony z kolekcji.
---

# Strona premium — metodyka

Skill spisany po zbudowaniu serwisu Dormed Medical SPA (`sites/dormed-busko`).
Zawiera gotowy proces, sprawdzone wartości i skrypty, które można przenieść na
kolejnego klienta bez wymyślania wszystkiego od nowa.

## 1. Kolejność pracy

1. **Zbierz materiał** — WebSearch po nazwie firmy: dane kontaktowe, oferta,
   opinie, profile społecznościowe, drugi adres, rok założenia. Serwisy
   rezerwacyjne (Booking, Nocowanie, Groupon) są kopalnią konkretów: liczba
   pokoi, ceny wyżywienia, oceny.
2. **Wyciśnij materiały klienta** — logo, zdjęcia, plakaty. Zdjęcia z banera na
   budynku albo z plakatu potrafią zdradzić usługi, których nie ma na stronie
   (powiększ kadr i odczytaj — patrz `scripts/przygotuj_zdjecia.py`).
3. **Zbuduj generator, nie pliki HTML** — 10 podstron pisanych ręcznie to 10
   miejsc na rozjazd nagłówka i stopki. Patrz sekcja 6.
4. **Audytuj po każdej większej zmianie** — `scripts/audyt.js`. Cztery
   viewporty, w tym **2560 px**: błędy układu, które skalują się z szerokością
   okna, na 1440 px w ogóle nie widać.
5. **Publikuj i sprawdź wdrożenie** — sekcja 9.

## 2. System kolorów: jasna baza, marka jako akcent

Najczęstszy błąd przy „mocnym" kolorze marki: zalanie nim całego tła. Wygląda
ciężko i tanio. Zasada, która się sprawdziła:

- **baza jasna** — biel, kość słoniowa, jeden bardzo delikatny odcień marki
- **kolor marki wyłącznie jako akcent** — przyciski, ikony, wyróżnione słowo
  w nagłówku, cyfry, cienkie linie
- **sekcje w pełnym kolorze marki: jedna na podstronę, dwie na stronie głównej**
  — dają rytm, nie przytłaczają
- **stopka zawsze ciemna** — domyka stronę

```css
--paper: #FFFFFF;  --bone: #FBF9F8;  --sand: #F5F1EF;
--blush: <marka rozjaśniona do ~4% nasycenia>;
--line: #ECE6E4;  --line-mid: #DED5D2;
--ink: #171114;  --ink-70: #574B50;  --ink-45: #6E6166;
--brand: <kolor z logo>;  --brand-dark: <ten sam, przyciemniony>;
```

**Kontrast sprawdzaj liczbowo, nie na oko.** Skrypt `scripts/kontrast.py`.
Progi: 4,5:1 dla tekstu (AA), 7:1 dla komfortu (AAA). Kolor tekstu pomocniczego
to najczęstszy element, który nie przechodzi — typowe `#8C8085` ma 3,79:1.

## 3. Typografia

| Charakter | Nagłówki | Treść |
|---|---|---|
| Korporacyjny, instytucjonalny | **Archivo** 600–700 | Inter 400–600 |
| Butikowy, modowy | Outfit 300 | Inter |
| Klasyczny, luksusowy | Cormorant Garamond | Manrope |

Klient mówiący „korporacyjne" ma na myśli: **cięższe wagi, mniejszy ujemny
tracking, mniej zaokrągleń**. Waga 300 czyta się jako moda, 600–700 jako firma.

Wartości bazowe, które się sprawdziły:

```css
--fs-body: clamp(1rem, .96rem + .2vw, 1.09rem);   /* 16–17 px */
line-height: 1.72;
--fs-h2: clamp(1.6rem, 1.2rem + 1.8vw, 2.5rem);
letter-spacing: -.021em;   /* nagłówki */
max-width: 62–68ch;        /* miara tekstu */
```

Jeśli odbiorcą są **seniorzy** (rehabilitacja, sanatorium, opieka), podnieś
tekst bazowy do 17 px i interlinię do 1,72. To realnie zmienia komfort czytania.

## 4. Ikony dwutonowe (duotone)

Zwykłe ikony konturowe wyglądają jak z darmowej biblioteki. Dwutonowe wyglądają
jak zaprojektowane pod markę. Każda ikona = **miękka plama wypełnienia (16%
krycia) + precyzyjna kreska 1,5 na wierzchu**, siatka 24×24.

```python
ICONS = { "nazwa": (plama_svg, kreska_svg) }   # patrz references/ikony.md
```

```css
svg .i-fill { fill: currentColor; opacity: .16; transform-origin: 12px 12px; }
svg .i-line { fill: none; stroke: currentColor; stroke-width: 1.5;
              stroke-linecap: round; stroke-linejoin: round; }
.card:hover .card__icon svg .i-fill { opacity: .3; transform: scale(1.1); }
```

Wszystkie ikony w jednym sprite `<symbol>` wklejonym na początku `<body>` —
zero dodatkowych żądań, `<use href="#i-nazwa">` w treści. Sprite inline, nie
zewnętrzny plik: zewnętrzny nie zadziała przy otwarciu z dysku.

## 5. Animacje i grafika — branżowe, nie ozdobne

Dobra animacja mówi coś o branży. Dla medycyny sprawdziły się:

| Efekt | Gdzie | Jak |
|---|---|---|
| **Linia EKG rysująca się** | przejście hero → statystyki | `stroke-dasharray:100` + `pathLength="100"` + `stroke-dashoffset: 100 → 0` |
| **Kręgi na wodzie** | sekcje balneologiczne | 3 okręgi, `scale(.35 → 2.4)` + zanik, opóźnienia 2,3 s |
| **Aurora** | sekcje w kolorze marki | dwa gradienty radialne, `animation: 22s alternate` |
| **Pulsujące kręgi** | wyróżniona ikona | `::before`/`::after`, `scale(1 → 1.9)` + zanik |
| **Połysk** | karta z ofertą, pas CTA | ukośny gradient przesuwany przy hover |
| **Siatka kolagenowa** | tła sekcji | heksagony SVG generowane w Pythonie |

`pathLength="100"` to klucz do rysowania dowolnej ścieżki — normalizuje długość,
więc `stroke-dasharray: 100` działa bez mierzenia w JS.

**Zawsze** domykaj blokiem `@media (prefers-reduced-motion: reduce)`.

Grafika tła: generuj ją w Pythonie jako SVG (`references/grafika.md`). Zero
problemów licencyjnych, ostra na każdym ekranie, kilka kB.

**Dwie pułapki, które kosztowały mnie wpadkę u klienta:**

1. **Scena tła wypchnięta do układu.** Reguła w rodzaju
   `.bg-brand > * { position: relative; z-index: 2 }` (żeby treść była nad tłem)
   ma tę samą specyficzność co `.medart { position: absolute }` i — jeśli stoi
   niżej w pliku — **wygrywa**. Scena wraca do przepływu, dobiera wysokość
   z proporcji `viewBox` i przy szerokim oknie rozpycha sekcję na tysiące
   pikseli pustki. Pisz `> *:not(.medart)` i daj `position: absolute` również
   na samym `<svg>`. Objaw: strona rośnie razem z szerokością okna — dlatego
   audyt mierzy `document.body.scrollHeight` na 1440 i 7600 px.
2. **Animacja podpowiedzi blokuje sterowanie.** Jeśli hint (np. `baPeek`)
   animuje tę samą własność, którą ustawia użytkownik (`--pos`), to przez
   cały czas trwania animacji CSS nadpisuje każde ustawienie z JS — suwak
   wygląda na całkowicie zepsuty. **Pierwsze dotknięcie musi zdejmować klasę
   animacji**, a obserwator nie może jej ponownie założyć.

## 6. Generator zamiast plików

```
scratchpad/
  build.py     # szkielet: <head>, nagłówek, stopka, helpery, page()
  icons.py     # zestaw ikon
  pages1..3.py # treść podstron, wywołują page()
```

`page(fname, title, desc, body, extra_ld, keywords)` skleja komplet `<head>`,
sprite, nagłówek, stopkę i zapisuje plik. Zmiana w nagłówku = jedno miejsce.

Helpery, które warto mieć od razu: `slot()` (kadr na zdjęcie z zapasowym wzorem),
`ba()` (suwak przed/po), `gal()` (kafelek z lightboxem), `faq()` + `faq_ld()`,
`crumbs()` + `crumb_ld()`, `hero_page()`, `medart()`, `ecg()`.

`build.py` to biblioteka — same moduły `pages*.py` zapisują pliki, więc
przebudowa to `for f in pages1.py pages2.py pages3.py; do python3 $f; done`.
Samo `python3 build.py` kończy się sukcesem i **nie generuje niczego** —
łatwo uwierzyć, że poprawka weszła, kiedy nie weszła.

**Nie wstawiaj stylów inline z `clamp()`/`calc()`.** Zrób klasę w CSS. Styl
inline nikt nigdy nie przegląda, a jedna literówka w wyrażeniu wywala całą
deklarację po cichu (patrz niżej).

## 7. SEO — pełna lista kontrolna

- `title` ≤ 62 znaki, `description` 140–160 znaków, **unikalne na każdej podstronie**
- `canonical`, `og:url` i `sitemap.xml` muszą wskazywać **adres faktycznej
  publikacji**. Wskazanie domeny, pod którą strona jeszcze nie stoi, to
  najczęstsza przyczyna braku miniatury przy wysyłaniu linku.
- **Open Graph komplet**: `og:image`, `og:image:secure_url`, `og:image:type`,
  `og:image:width` 1200, `og:image:height` 630, `og:image:alt`. Podanie
  wymiarów sprawia, że podgląd pojawia się przy pierwszym udostępnieniu.
- **Miniatura na każdą podstronę** — generator w `scripts/miniatury_og.py`:
  logo + tytuł + opis + adres obok zdjęcia. Dobierana automatycznie:
  `og-<slug>.jpg`, fallback `og.jpg`.
- JSON-LD `@graph`: typ główny firmy (`MedicalClinic`, `HairSalon`,
  `LodgingBusiness` — można podać listę), `FAQPage`, `BreadcrumbList`,
  `ContactPage`, `AggregateRating`, `foundingDate`, `sameAs` z profilami.
- `robots.txt` z adresem sitemapy, `hreflang` przy wielu językach.
- Po zmianie miniatury: **Facebook Sharing Debugger → Scrape Again**, inaczej
  cache trzyma starą wersję. LinkedIn: Post Inspector.

## 8. Mobile i dostępność

- cele dotykowe ≥ 44 px na ekranach dotykowych, ≥ 24 px przy myszce
  (WCAG 2.5.8) — `scripts/audyt.js` rozróżnia te progi, więc nie rozdymaj
  paska górnego na desktopie tylko po to, żeby audyt zamilkł
- numer telefonu i e-mail w akapicie to najczęściej klikane linki na
  telefonie, a jako zwykły tekst mają ~16 px. `padding-block: 1.05em` na
  elemencie **inline** powiększa obszar kliknięcia do 44 px, nie ruszając
  układu strony — to jedyny poprawny sposób, bez `display: block`
- pole `checkbox` liczy się przez etykietę: `<label>` z `min-height: 44px`
  jest realnym celem, samo pole może mieć 24 px
- dolny pasek akcji na telefonie: Zadzwoń / Rezerwuj / Dojazd, `safe-area-inset`
- menu mobilne: wiersze ≥ 56 px, opisy `white-space: nowrap`, chowane < 400 px
- **animacje wjazdu muszą mieć siatkę bezpieczeństwa** — przy szybkim „flicku"
  IntersectionObserver potrafi pominąć element i sekcja zostaje niewidoczna
  na zawsze. Patrz `references/animacje.md`, sekcja „sweepReveal".
- animacje poziome (`translateX`) na wąskich ekranach powodują przewijanie
  w bok — wyłącz je poniżej 980 px
- `alt` na każdym obrazie, jeden `<h1>` na stronę, `prefers-reduced-motion`

## 9. Publikacja w tej kolekcji

Gałąź `claude/website-collection-setup-xojca4` jest źródłem GitHub Pages —
push na nią uruchamia workflow `.github/workflows/pages.yml` (~1 min).

```bash
git push -u origin <gałąź-robocza>
git checkout claude/website-collection-setup-xojca4
git merge --ff-only <gałąź-robocza>
git push origin claude/website-collection-setup-xojca4
```

Adres publiczny: `https://maksymilianbronk-cmyk.github.io/www1/sites/<slug>/`.
Po pushu **sprawdź `conclusion` workflow** przez `mcp__github__actions_get`
— nie zgłaszaj klientowi linku przed potwierdzeniem, że wdrożenie się udało.
Dopisz adres do tabeli w `README.md`.

Podgląd gałęzi roboczej bez wdrożenia:
`https://raw.githack.com/<user>/<repo>/<gałąź>/sites/<slug>/index.html`

## 10. Uczciwość wobec treści

- **Nie wymyślaj cen.** Jeśli klient ich nie podał, wpisz „cena w recepcji"
  i powiedz mu wprost, że to jedyna rzecz do uzupełnienia. Zmyślona cena to
  problem prawny klienta, nie „drobiazg wizualny".
- Zdjęcia „przed i po" pacjentów wymagają zgody na wizerunek — dodaj adnotację
  o zgodzie i indywidualnym charakterze efektu, i zapytaj klienta o zgody.
- Gdy sieć jest zablokowana i nie da się pobrać zdjęć klienta, **powiedz to**
  zamiast podstawiać przypadkowe stocki. Zapasowy wzór SVG w kadrze sprawia,
  że brak zdjęcia nie wygląda na błąd.

## 11. Ciche awarie CSS

Trzy błędy, które **nie dają żadnego komunikatu** — strona po prostu wygląda
źle, a Ty widzisz to dopiero na zrzucie od klienta:

1. **Nieprawidłowa matematyka w `clamp()`/`calc()`.** W CSS `+` i `-` muszą
   mieć spację po obu stronach. `clamp(1.2rem,1rem+1vw,1.8rem)` jest nieważne
   → cała deklaracja `padding` znika → tekst przykleja się do krawędzi karty.
   `*` i `/` spacji nie wymagają, co dodatkowo usypia czujność.
2. **Kolizja specyficzności przy pozycjonowaniu** — patrz sekcja 5, pułapka 1.
3. **Animacja nadpisująca własność sterowaną z JS** — patrz sekcja 5, pułapka 2.

Na pierwszy z nich jest test: `scripts/css-nieważne.js` przepuszcza **każdą**
deklarację (z arkuszy i ze stylów inline) przez CSSOM i zgłasza te, których
przeglądarka nie przyjęła. Uruchamiaj po każdej zmianie stylów — trwa kilka
sekund i wyłapuje literówki, których nie widać w kodzie.

Zasada nadrzędna: **jeśli błąd skaluje się z czymś, czego nie mierzysz, nie
zobaczysz go.** Dlatego audyt chodzi po czterech szerokościach, a
`scripts/szerokie-ekrany.js` porównuje wysokość dokumentu i każdej sekcji
przy 1440 i 7600 px. Sekcja wysoka od treści to nie błąd — błędem jest sekcja,
która **rośnie razem z szerokością okna**.

## Pliki pomocnicze

- `references/ikony.md` — pełny zestaw 50 ikon dwutonowych do skopiowania
- `references/animacje.md` — gotowe bloki CSS/JS wszystkich efektów
- `references/grafika.md` — generatory scen SVG (heksagony, fale, warstwy skóry)
- `scripts/audyt.js` — audyt Playwright: N stron × 4 viewporty (z 2560 px)
- `scripts/css-nieważne.js` — wykrywa deklaracje odrzucone przez przeglądarkę
- `scripts/szerokie-ekrany.js` — układ rosnący z szerokością okna
- `scripts/kontrast.py` — kalkulator WCAG dla palety
- `scripts/miniatury_og.py` — generator miniatur Open Graph 1200×630
- `scripts/przygotuj_zdjecia.py` — kadrowanie, rozcinanie kolaży „przed/po",
  favicony z logo
