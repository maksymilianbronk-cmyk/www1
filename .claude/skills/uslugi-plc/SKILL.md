---
name: uslugi-plc
description: >
  Playbook świadczenia usług programowania PLC i automatyzacji produkcji:
  wycena i brief klienta, standard architektury programu (S7-1200/1500, TIA
  Portal, LAD/SCL), wzorce dla maszyn pakujących i owijarek do palet,
  checklisty uruchomienia, odbioru i dokumentacji powykonawczej. Użyj przy
  zleceniach typu "wyceń oprogramowanie maszyny", "napisz program owijarki /
  pakowaczki", "przygotuj ofertę dla producenta maszyn", "brief / FDS / lista
  I/O", "retrofit sterowania", "dokumentacja powykonawcza".
---

# Usługi programowania PLC — playbook

Kompletny proces prowadzenia zlecenia: od zapytania klienta do przekazania
maszyny z dokumentacją. Wiedza techniczna o sterowniku i instrukcjach jest
w poradniku `sites/s7-1200-poradnik/` w tym repo — ten skill dodaje warstwę
usługową: jak wycenić, ustandaryzować, uruchomić i odebrać.

## 1. Kolejność prowadzenia zlecenia

1. **Brief** — wypełnij z klientem ankietę z `references/wycena-brief.md`.
   Bez listy I/O i opisu cyklu maszyny nie podawaj ceny — tylko widełki.
2. **Oferta** — zakres, cena, termin, wyłączenia (czego NIE obejmuje),
   warunki odbioru (FAT/SAT). Wzór struktury oferty w tym samym pliku.
3. **Specyfikacja funkcjonalna (FDS)** — 2–5 stron: tryby pracy, sekwencja
   krok po kroku, reakcje na awarie, lista parametrów operatora. Klient
   podpisuje PRZED pisaniem kodu — to dokument rozstrzygający spory zakresu.
4. **Program** — wg standardu architektury (sekcja 2). Symulacja PLCSIM,
   przegląd własny z checklistą (sekcja 4).
5. **Uruchomienie** — u klienta lub zdalnie; protokół testów z FDS,
   podpisany odbiór.
6. **Przekazanie** — dokumentacja powykonawcza (sekcja 5), kopie projektu,
   hasła, okres gwarancyjny i zasady wsparcia.

## 2. Standard architektury programu

Jedna struktura dla każdej maszyny — klient płaci mniej, bo nie piszesz od
zera, tylko konfigurujesz przetestowane wzorce:

```
OB1
 ├─ FC_Wejscia      # odczyt, filtrowanie, skalowanie analogów (NORM_X/SCALE_X)
 ├─ FB_Tryby        # automat stanów maszyny: STOP → RĘCZNY → AUTO → AWARIA
 ├─ FB_Sekwencja    # cykl maszyny: CASE #Krok OF (kroki co 10, timeout kroku)
 ├─ FB_Napedy[n]    # jeden FB na napęd: zezwolenia, sterowanie, diagnostyka
 ├─ FC_Alarmy       # zbiorcza obsługa alarmów: bufor, kwitowanie, priorytety
 └─ FC_Wyjscia      # JEDYNE miejsce zapisu %Q; wymuszenia serwisowe
OB100 — inicjalizacja; OB30 — PID/próbkowanie; OB82/86 — diagnostyka
```

Zasady niezmienne:
- **Wyjścia fizyczne zapisywane w jednym FC** — nigdy rozproszone po programie.
- **Każdy krok sekwencji ma timeout** → alarm „sekwencja zawieszona w kroku N".
- Awaria lub STOP wymusza krok 0 i gasi wyjścia sekwencji — zawsze.
- Zmienna kroku, tryb i ostatni alarm widoczne na HMI — diagnostyka bez laptopa.
- DB `Parametry` (retentywny) z nastawami operatora; DB `Receptury` osobno.
- Nazewnictwo: `iCzujnikX` (wejście), `qStycznikY` (wyjście), `pNastawa`
  (parametr) — utrzymanie ruchu klienta czyta program bez Ciebie.
- Dla maszyn pakujących trzymaj się stanów **PackML** (ISA-TR88):
  Stopped/Idle/Execute/Held/Suspended/Aborted — integratorzy linii tego oczekują.

## 3. Wzorce maszyn i biblioteka kodu

- **Biblioteka standardowych bloków w SCL** (FB_Naped, FB_Tryby, FB_Alarm,
  FC_SkalujAI, szablon FB_Sekwencja z watchdogiem, FB_PackML, FC_Wyjscia,
  konwencje nazewnictwa) → `references/biblioteka-scl.md`. **Od tych bloków
  zaczynaj każdy nowy program** — nie pisz napędu ani alarmu od zera.
- **Owijarka do palet** (obrotowa/ramieniowa): specyfikacja I/O, sekwencja,
  parametry i alarmy → `references/owijarka.md`; **kompletny program
  przykładowy w SCL** (tags, DB_Parametry, FB_Owijarka z pauzą po zerwaniu
  folii, OB1) → `references/owijarka-program.md`.
- **Maszyny pakujące** (flow-pack, kartoniarka, zamykarka) + paletyzer,
  przenośniki z trackingiem → `references/pakowanie.md`.
- **Komunikacja — gotowe szablony kodu** (USS, Modbus RTU/TCP, GET/PUT,
  TSEND_C/TRCV_C, interfejs 24 V maszyna↔linia) → `references/komunikacja-kod.md`.
- Uniwersalne wzorce (start/stop, nawrotnik, gwiazda–trójkąt, analogi,
  sygnalizacja ISA-18) → `sites/s7-1200-poradnik/przyklady.html`.
- Podręcznik zbiorczy (wszystko powyższe w jednym pliku dla człowieka)
  → `docs/podrecznik-programowania-maszyn.md` w repo.

## 4. Checklista przed uruchomieniem u klienta

- [ ] Symulacja pełnego cyklu w PLCSIM (w tym awarie: brak czujnika, timeout)
- [ ] Test każdego wejścia fizycznie, każdego wyjścia bez obwodów mocy
- [ ] E-STOP zatrzymuje sprzętowo — program tylko OBSERWUJE styk pomocniczy
      (PN-EN ISO 13849-1; obwód bezpieczeństwa NIGDY wyłącznie w standardowym PLC)
- [ ] Tryb ręczny każdego napędu przed pierwszym cyklem AUTO
- [ ] Watchdog kroków działa (odłącz czujnik w trakcie cyklu)
- [ ] Zanik zasilania w środku cyklu → restart bezpieczny, bez ruchu maszyny
- [ ] Kopia projektu sprzed wyjazdu + kopia po uruchomieniu (z datą i opisem)

## 5. Dokumentacja powykonawcza (deliverables)

Minimum, które oddajesz zawsze — to połowa wartości usługi:
1. Projekt TIA Portal (aktualny, skompilowany) + kopia na karcie pamięci CPU.
2. Lista I/O z adresami i typem styku (NO/NC).
3. FDS zaktualizowany do stanu faktycznego („as-built").
4. Lista parametrów operatora z wartościami nastawionymi przy odbiorze.
5. Lista alarmów: tekst, przyczyna, sposób usunięcia.
6. Hasła i poziomy dostępu (przekazane osobno, nie w dokumentacji).
7. Protokół testów odbiorczych podpisany przez obie strony.

## 6. Zasady handlowe

- Wycena = suma: brief/FDS + program + HMI + symulacja + uruchomienie
  (dniówki na obiekcie osobno!) + dokumentacja + bufor 15 %. Rozbicie
  pokazuj klientowi — buduje zaufanie i ułatwia negocjacje zakresu, nie ceny.
- „Najtaniej na rynku" osiągasz przez: pracę zdalną (bez kosztów biura),
  biblioteki wielokrotnego użytku i stałą cenę z oferty — a NIE przez
  pomijanie dokumentacji czy testów. Tego nie tnij nigdy.
- Zmiany zakresu po podpisaniu FDS → osobna wycena (change request).
  FDS podpisany przed kodem to Twoja jedyna obrona.
- Kod przekazujesz na własność klienta (bez know-how protect na blokach,
  chyba że umowa mówi inaczej) — to argument sprzedażowy przeciw droższym
  integratorom, którzy zamykają programy.
- Serwis po gwarancji: stawka godzinowa zdalnie / dojazd wg cennika —
  zapisz w ofercie od razu.

## 7. Marketing usług

Strona sprzedażowa usług w tej kolekcji: `sites/automatyka-plc/`
(oferta, maszyny, proces współpracy, kontakt). Nowe realizacje dopisuj tam
jako case studies. Do budowy kolejnych stron firmowych → skill `strona-premium`.
