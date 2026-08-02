# Brief klienta i budowa wyceny

## Ankieta briefu (wysyłasz klientowi lub wypełniasz w rozmowie)

**Maszyna i proces**
1. Co maszyna robi? (jedno zdanie + zdjęcie/film jeśli jest)
2. Nowa budowa / retrofit istniejącej? Jeśli retrofit: co jest teraz
   (sterownik, schematy — są? aktualne?), co ma się zmienić?
3. Cykl pracy krok po kroku (jak opowiedziałby operator).
4. Wydajność (szt./min, palet/h) i tryby pracy (auto / ręczny / serwisowy /
   krok po kroku).

**Sprzęt**
5. Lista wejść/wyjść (albo: liczba czujników i napędów — do oszacowania).
6. Napędy: ile, jakie (stycznik / falownik / serwo / krokowy), czy jest
   pozycjonowanie i z jaką dokładnością?
7. Sygnały analogowe (temperatury, ciśnienia, wagi) — ile, jakie zakresy?
8. Preferencja sterownika (Siemens S7-1200/1500, inne?) czy dobieramy my?
9. HMI: przekątna, ile ekranów, języki? Receptury — ile parametrów?

**Otoczenie**
10. Integracja z innymi maszynami/linią? Jakie sygnały wymieniane?
11. Komunikacja nadrzędna (SCADA/MES/raporty)? Protokół?
12. Bezpieczeństwo: czy jest ocena ryzyka / kto projektuje obwody
    bezpieczeństwa? (My programujemy część standardową; obwody safety —
    elektryk/projektant z uprawnieniami.)

**Organizacja**
13. Termin: kiedy maszyna ma być u klienta końcowego?
14. Gdzie uruchomienie (adres) i ile dni maszyna będzie dostępna do testów?
15. Kto odbiera (kryteria odbioru, FAT u producenta / SAT u końcowego)?

## Budowa wyceny (pozycje)

| Pozycja | Szacowanie |
|---|---|
| Brief + FDS | 0,5–2 dni |
| Program PLC | wg liczby I/O i napędów: baza 2–4 dni (prosta maszyna, ≤32 I/O), +1 dzień na każdy napęd regulowany/oś, +1–2 dni na integracje sieciowe |
| HMI | 0,5 dnia na ekran (przegląd/parametry/alarmy to minimum 3 ekrany) |
| Symulacja i testy własne | 20–30 % czasu programu |
| Uruchomienie na obiekcie | dniówki × stawka + dojazd/nocleg — OSOBNA pozycja |
| Dokumentacja powykonawcza | 0,5–1 dzień |
| Bufor ryzyka | +15 % sumy |

Zasady:
- Widełki przed briefem, cena stała po briefie, zmiany po FDS = change request.
- Uruchomienie zawsze rozliczaj od dniówki — to jedyna pozycja, na którą nie
  masz wpływu (gotowość mechaniki i elektryki po stronie klienta).
- W ofercie wpisz jawnie: co zawiera, czego nie zawiera (obwody bezpieczeństwa,
  schematy elektryczne, prefabrykacja szafy, licencje TIA po stronie klienta?),
  warunki odbioru, termin ważności oferty.

## Struktura oferty (1–2 strony PDF)

1. Przedmiot: „Oprogramowanie sterownika i panelu HMI maszyny X wg FDS".
2. Zakres prac (lista punktowana z briefu).
3. Wyłączenia (czego nie obejmuje).
4. Cena netto + warunki płatności (np. 40 % zaliczka / 40 % po FAT / 20 % po SAT).
5. Termin realizacji od podpisania FDS.
6. Gwarancja (np. 12 mies. na oprogramowanie: błędy naprawiamy zdalnie 48 h).
7. Wsparcie pogwarancyjne: stawka zdalna/na obiekcie.
