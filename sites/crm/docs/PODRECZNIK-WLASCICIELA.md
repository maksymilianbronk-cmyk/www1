# 📕 LeadFlow CRM — podręcznik właściciela agencji

Wersja systemu: 2.5.0 · Ten podręcznik jest dla **Ciebie** — właściciela
agencji Meta Ads. Bez technicznego żargonu, krok po kroku. Dokumentacja
techniczna (dla programisty/Claude): `DOKUMENTACJA.md`.

---

## Spis treści

1. [Co masz w rękach](#1-co-masz-w-rękach)
2. [Instalacja na hostingu (15 minut)](#2-instalacja-na-hostingu)
3. [Pierwsze uruchomienie](#3-pierwsze-uruchomienie)
4. [Dodanie klienta — pełna checklista](#4-dodanie-klienta)
5. [Skąd wpadają leady (3 drogi)](#5-skąd-wpadają-leady)
6. [Codzienna praca z leadami](#6-codzienna-praca-z-leadami)
7. [Zakładka Reklamy — kampanie klientów](#7-zakładka-reklamy)
8. [Posty — plan treści i publikacja na FB](#8-posty)
9. [Wspólne notatki](#9-wspólne-notatki)
10. [Landingi dla klientów](#10-landingi)
11. [Telefon — CRM jako aplikacja](#11-telefon)
12. [Bezpieczeństwo i kopie zapasowe](#12-bezpieczeństwo)
13. [Aktualizacje systemu przez Claude](#13-aktualizacje)
14. [Najczęstsze pytania (FAQ)](#14-faq)

---

## 1. Co masz w rękach

LeadFlow CRM to Twój własny system (nie abonament!) działający na zwykłym
hostingu PHP. W jednym miejscu:

- **leady** wszystkich klientów NA ŻYWO (ze stron www, Facebook Lead Ads,
  ApixDrive/Make/Zapier i z landingów),
- **panele klientów** — każdy klient ma własny adres logowania ze swoim
  logo-kolorem i widzi wyłącznie swoje dane,
- **kampanie reklamowe** klientów (wydatki, CTR, koszt leada) z Meta,
- **plan postów** na każdy miesiąc + automatyczna publikacja na Facebooku,
- **wspólne notatki** z klientem (jak Google Keep),
- **landingi** stawiane w minutę z szablonów branżowych.

Wszystko aktualizuje się na żywo — nowy lead pojawia się w otwartym panelu
w ~1 sekundę, z powiadomieniem i dźwiękiem.

## 2. Instalacja na hostingu

Potrzebujesz: hosting z PHP 8.1+ (praktycznie każdy polski hosting) i domenę.

1. Rozpakuj paczkę `leadflow-crm-*.zip`.
2. Wgraj folder `leadflow-crm/` przez FTP lub menedżer plików hostingu,
   np. do `public_html/crm/` → system będzie pod `https://twojadomena.pl/crm/`.
3. Upewnij się, że folder `crm/data/` ma prawa zapisu (zwykle domyślnie ma;
   jeśli nie — chmod 775).
4. Wejdź na `https://twojadomena.pl/crm/` — zobaczysz kreator pierwszego
   uruchomienia.
5. Po zalogowaniu wejdź w **Ustawienia → Diagnostyka serwera** — wszystkie
   pozycje powinny mieć ✔ (HTTPS wymagany do integracji z Meta).
6. W panelu hostingu ustaw **cron co godzinę** na adres z
   **Ustawienia → Cron** (kopiujesz jednym kliknięciem). Cron pobiera
   kampanie z Meta, publikuje posty i robi codzienną kopię bazy.

> System działa też bez crona (leady wpadają na żywo) — cron dokłada
> reklamy, publikację postów i kopie zapasowe.

## 3. Pierwsze uruchomienie

Kreator poprosi o nazwę agencji, e-mail i hasło (min. 8 znaków) — to Twoje
konto **super admina**. Widzisz wszystko: leady wszystkich klientów, ich
kampanie, posty, notatki i landingi.

Od razu po instalacji ustaw w **Ustawienia → Powiadomienia**:
- e-mail agencji (dostaniesz maila o KAŻDYM nowym leadzie),
- adres nadawcy w Twojej domenie (lepsza dostarczalność).

## 4. Dodanie klienta

Zakładka **Klienci → Dodaj nowego klienta**: nazwa, firma, e-mail (login),
hasło. Po dodaniu rozwiń **Ustawienia klienta** i uzupełnij:

| Pole | Po co |
|---|---|
| Branża, Miasto, Oferta | paliwo generatora postów i landingów — wypełnij zawsze! |
| E-mail do powiadomień | klient dostaje maila o każdym swoim leadzie |
| ID strony na Facebooku | dopasowanie leadów z Meta do klienta |
| Page Access Token | pobieranie danych leadów z Meta + publikacja postów |
| ID konta reklamowego + token Marketing API | zakładka Reklamy (wydatki, CTR, koszt leada) |
| Wychodzący webhook | każdy lead poleci POST-em do ApixDrive/Make (automatyzacje) |

Przy każdym kliencie masz też **do skopiowania jednym kliknięciem**:
- **adres webhooka** — pod niego wpinasz formularze i automatyzacje,
- **adres panelu logowania klienta** (`login.php?panel=…`) — wyślij go
  klientowi; strona logowania będzie brandowana jego nazwą i kolorem.

Hasło klienta możesz zresetować w tym samym miejscu; token webhooka —
unieważnić jednym kliknięciem (gdyby wyciekł).

## 5. Skąd wpadają leady

**Droga A — formularz na stronie klienta.** Webmaster klienta (albo Claude)
wpina formularz pod adres webhooka (kopiujesz go w zakładce Klienci).
Gotowy kod HTML jest w `README.md`; klient ma też skróconą instrukcję
u siebie: panel klienta → Leady → rozwijany box „Dla webmastera” na dole
listy. WordPress: wtyczki „CF7 to Webhook”, Elementor „Webhook” itd.

**Droga B — Facebook Lead Ads.**
- *Prościej (Make/Zapier/ApixDrive):* trigger „nowy lead” → moduł HTTP →
  POST na webhook klienta z dopiskiem `&source=facebook`. 5 minut klikania.
- *Bez pośredników:* skonfiguruj webhook Meta w **Ustawienia** (Callback URL
  + verify token do skopiowania), a przy kliencie uzupełnij ID strony i token.
  Wtedy leady lecą prosto z Meta, z nazwą kampanii.

**Droga C — landing z Landing Kreatora** (sekcja 10) — formularz jest
wpięty automatycznie.

Antyspam: ukryte pole-pułapka `_gotcha` (boty je wypełniają — zgłoszenie
jest po cichu odrzucane), a podwójne kliknięcie „Wyślij” nie tworzy duplikatu.

## 6. Codzienna praca z leadami

Zakładka **Leady**: kafelki (wszystkie / w tym miesiącu / nowe / wygrane),
filtry (klient, status, źródło) i wyszukiwarka działająca natychmiast.
Nowe leady mają żółty pasek i pojawiają się na żywo z toastem i dźwiękiem
(dzwoneczek w prawym górnym rogu włącza/wyłącza dźwięk).

Klikasz lead → szczegóły zgłoszenia (wszystkie pola z formularza, kampania)
i obsługa: **status** (Nowy → W kontakcie → Umówiony → Wygrany/Przegrany)
+ **notatka** („umówiony na czwartek 12:00”). Zmiany widzi też klient — na żywo.

Telefon i e-mail w wierszu leada są klikalne (od razu dzwonisz/piszesz).
**Eksport CSV** (przycisk przy filtrach) otwiera się w Excelu z polskimi
znakami. Lead można też bezpowrotnie usunąć (RODO) — przycisk w szczegółach.

Statusy to Twój lejek sprzedażowy — zakładka **Statystyki** pokazuje
konwersję na wygrane i lejek statusów, per klient i zbiorczo.

## 7. Zakładka Reklamy

Po skonfigurowaniu konta reklamowego klienta (sekcja 4) i crona — zakładka
**Reklamy** pokazuje kampanie bieżącego miesiąca: status (Aktywna/
Wstrzymana), wydatki, wyświetlenia, kliknięcia, CTR, liczbę leadów
i **koszt leada**. Klient widzi to samo u siebie — czarno na białym,
za co płaci i co z tego ma. To Twój najlepszy argument przy przedłużaniu
współpracy.

Bez konfiguracji API zakładka pokazuje kampanie wykryte z napływających
leadów (nazwy + liczby zgłoszeń).

## 8. Posty

Zakładka **Posty** — plan treści na miesiąc:

1. Wybierz klienta i miesiąc, kliknij **„Wygeneruj plan ContentForge”**
   (4–24 postów). Generator układa posty z: danych klienta (branża, miasto,
   oferta), prawdziwych liczb z CRM (social proof) i kalendarza świąt.
2. Przejrzyj szkice, edytuj co chcesz, popraw terminy.
3. **Akceptacja**: Ty albo klient (u siebie w panelu) klikacie „Akceptuj”.
4. **Publikacja**: cron publikuje zaakceptowane posty na stronie FB klienta
   o zaplanowanej godzinie (wymaga tokena strony z uprawnieniem
   `pages_manage_posts`). Jest też przycisk „Publikuj teraz”.
5. Status i link posta (albo błąd z powodem) wracają do panelu na żywo.

Nie podoba Ci się wariant? „Wygeneruj nowy wariant szkiców” — zaakceptowane
i opublikowane posty zostają nietknięte.

## 9. Wspólne notatki

Zakładka **Notatki** — wspólna tablica z każdym klientem w stylu Google
Keep: kolorowe karteczki, przypinanie ważnych, edycja. Co napiszesz, klient
widzi u siebie na żywo (i odwrotnie). Idealne na ustalenia, dostępy,
pomysły na kampanie — koniec z szukaniem po mailach i messengerze.

## 10. Landingi

Landingi stawia dla Ciebie **Claude przez MCP** — mówisz np. *„postaw
landing dla Barber Jan, szablon barber, dopisz prawdziwy cennik i godziny
otwarcia”* i po chwili dostajesz działający adres. 8 szablonów branżowych:
barber, beauty, budowlana, gastronomia, fitness, moto, stomatolog, fotograf
— każdy z gotowym polskim copy, motywem i animacjami.

Formularz landinga od razu tworzy leady w CRM tego klienta. Lista wszystkich
landingów z linkami: **Ustawienia → Landingi**. Landing pod reklamę Meta =
komplet: reklama → landing → lead w CRM → powiadomienie → obsługa.

## 11. Telefon

CRM działa na telefonie jak aplikacja: kompaktowy pasek u góry, **zakładki
na dole** (jak w Instagramie), wszystko jednym kciukiem.

**Zainstaluj na ekranie głównym** (Ty i klienci):
- **Android/Chrome**: menu ⋮ → „Dodaj do ekranu głównego”.
- **iPhone/Safari**: przycisk Udostępnij → „Do ekranu początkowego”.

Panel otwiera się wtedy na pełnym ekranie, z własną ikoną — bez paska
przeglądarki.

## 12. Bezpieczeństwo

Wbudowane: szyfrowane hasła, blokada po 8 nieudanych logowaniach (15 min),
osobne tokeny per klient (unieważnialne), klient widzi wyłącznie swoje dane
(pilnuje tego serwer, nie przeglądarka), baza niedostępna z internetu,
reset hasła linkiem e-mail ważnym 30 minut.

Twoje dobre praktyki:
- hasła min. 12 znaków, unikalne dla każdego klienta,
- nie wysyłaj hasła i loginu w jednej wiadomości,
- **kopie zapasowe**: cron robi codzienną kopię automatycznie
  (`data/backups/`, 14 dni wstecz); dodatkowo raz na jakiś czas pobierz
  plik `data/crm.sqlite` na dysk — to cała historia w jednym pliku.

## 13. Aktualizacje

System aktualizuje **Claude przez MCP** — jedną komendą podmienia pliki
aplikacji na hostingu. Twoje dane są bezpieczne z gwarancją: folder `data/`
jest nietykalny, przed każdą aktualizacją powstaje kopia plików i bazy,
a cofnięcie (rollback) to jedna komenda. Otwarte panele same wykryją nową
wersję i się odświeżą.

Klucz do aktualizacji: **Ustawienia → Przebudowa systemu przez MCP**
(podajesz go Claude, gdy prosisz o wdrożenie zmian). Traktuj go jak hasło.

## 14. FAQ

**Ile klientów/leadów uciągnie system?** Na typowym hostingu spokojnie
dziesiątki klientów i dziesiątki tysięcy leadów (panel wczytuje 1000
najnowszych, reszta w eksporcie CSV i statystykach).

**Klient zapomniał hasła.** Sam je zresetuje („Nie pamiętam hasła” na
stronie logowania — dostanie link e-mailem), albo Ty ustawisz nowe
w zakładce Klienci.

**Czy klient widzi innych klientów?** Nie. Izolacja jest wymuszana na
serwerze przy każdym zapytaniu.

**Chcę przenieść system na inny hosting.** Przenosisz folder `crm/`
w całości (razem z `data/`) — to wszystko. Adresy webhooków się zmienią,
zaktualizuj je w formularzach/Make.

**Meta odrzuca publikację postów.** Sprawdź, czy token strony ma uprawnienie
`pages_manage_posts` i czy Twoja aplikacja Meta ma dostęp do tej strony.
Powód błędu jest zawsze przy poście w zakładce Posty.

**Coś nie działa.** Zajrzyj do tabeli „Rozwiązywanie problemów”
w `DOKUMENTACJA.md`, sprawdź **Ustawienia → Diagnostyka**, albo po prostu
opisz problem Claude — ma pełne instrukcje operacyjne systemu.
