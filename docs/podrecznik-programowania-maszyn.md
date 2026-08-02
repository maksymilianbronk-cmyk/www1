# Podręcznik programowania maszyn
### Standard CLAMAX Automation — S7-1200/S7-1500, TIA Portal, SCL

Dokumentacja rozszerzona: architektura programu, biblioteka bloków w SCL,
kompletny program owijarki palet, wzorce maszyn pakujących, szablony
komunikacji oraz proces wyceny i odbioru. Ten sam materiał w formie skilla
(dla Claude) leży w `.claude/skills/uslugi-plc/` — obie wersje są generowane
z tych samych plików źródłowych, więc nie rozjadą się w treści.

Uzupełnieniem jest publiczny poradnik podstaw: katalog wszystkich instrukcji
S7-1200 i wzorce LAD — https://maksymilianbronk-cmyk.github.io/www1/sites/s7-1200-poradnik/

## Standard architektury (fundament wszystkiego)

```
OB1
 ├─ FC_Wejscia      # odczyt, filtrowanie, skalowanie analogów (FC_SkalujAI)
 ├─ FB_Tryby        # STOP → RĘCZNY → AUTO → AWARIA (jedno źródło prawdy)
 ├─ FB_Sekwencja    # cykl maszyny: CASE #Krok OF, kroki co 10, watchdog kroku
 ├─ FB_Naped[n]     # jeden FB na napęd: zezwolenia, potwierdzenia, awarie
 ├─ FC_Alarmy       # FB_Alarm[n]: filtr, zatrzask, kwitowanie, suma zbiorcza
 └─ FC_Wyjscia      # JEDYNE miejsce zapisu %Q (sekwencja + jog + serwis)
OB100 — inicjalizacja · OB30 — PID/próbkowanie · OB82/86 — diagnostyka
```

Zasady niezmienne: wyjścia tylko w FC_Wyjscia; każdy krok ma timeout; awaria
wymusza krok 0; zmienna kroku i tryb widoczne na HMI; parametry w retentywnym
DB; nazewnictwo z prefiksami (tabela w Części I).

---

# Część I — Biblioteka standardowych bloków (SCL)

Gotowe do wklejenia bloki w SCL. Konwencja: `i` = wejście procesowe, `q` =
wyjście procesowe, `p` = parametr, `x` = flaga wewnętrzna, `t` = timer.
Wszystkie bloki są FB (mają pamięć) poza funkcjami czysto obliczeniowymi (FC).

## 1. FB_Naped — napęd załączany stycznikiem / falownikiem

Jeden blok na każdy silnik. Pilnuje potwierdzenia pracy i zgłasza awarię.

```scl
FUNCTION_BLOCK "FB_Naped"
{ S7_Optimized_Access := 'TRUE' }
VAR_INPUT
    iZadanie       : Bool;          // żądanie pracy (z sekwencji lub trybu ręcznego)
    iZezwolenie    : Bool;          // zezwolenie zbiorcze (tryb, osłony OK)
    iPotwierdzenie : Bool;          // styk pomocniczy stycznika / "running" falownika
    iKwituj        : Bool;          // kasowanie awarii
END_VAR
VAR_INPUT
    pCzasPotw      : Time := T#2s;  // maks. czas na potwierdzenie
END_VAR
VAR_OUTPUT
    qWyjscie       : Bool;          // do %Q (przez FC_Wyjscia!)
    qPracuje       : Bool;          // potwierdzona praca
    qAwaria        : Bool;          // brak/utrata potwierdzenia
END_VAR
VAR
    tBrakPotw      : TON;
    tObcaPraca     : TON;
END_VAR

BEGIN
    // wysterowanie tylko przy zezwoleniu i bez awarii
    #qWyjscie := #iZadanie AND #iZezwolenie AND NOT #qAwaria;

    // awaria 1: wysterowany, a po pCzasPotw brak potwierdzenia
    #tBrakPotw(IN := #qWyjscie AND NOT #iPotwierdzenie, PT := #pCzasPotw);

    // awaria 2: potwierdzenie bez wysterowania (sklejony stycznik / obce zasilanie)
    #tObcaPraca(IN := NOT #qWyjscie AND #iPotwierdzenie, PT := #pCzasPotw);

    IF #tBrakPotw.Q OR #tObcaPraca.Q THEN
        #qAwaria := TRUE;
    END_IF;
    IF #iKwituj AND NOT #tBrakPotw.Q AND NOT #tObcaPraca.Q THEN
        #qAwaria := FALSE;
    END_IF;

    #qPracuje := #qWyjscie AND #iPotwierdzenie;
END_FUNCTION_BLOCK
```

## 2. FB_Tryby — menedżer trybów maszyny

Jedno źródło prawdy o trybie. Sekwencja działa tylko w AUTO, jog tylko
w RĘCZNYM, awaria wygrywa ze wszystkim.

```scl
FUNCTION_BLOCK "FB_Tryby"
{ S7_Optimized_Access := 'TRUE' }
VAR_INPUT
    iWyborAuto   : Bool;   // przełącznik / HMI: żądanie AUTO
    iWyborReczny : Bool;   // żądanie trybu ręcznego
    iStart       : Bool;   // start cyklu (tylko AUTO)
    iStop        : Bool;   // stop normalny (= koniec cyklu / pauza)
    iWarunkiBazowe : Bool; // maszyna w pozycji bazowej (pozwala wejść w AUTO)
    iBezpieczenstwoOK : Bool; // obwód bezpieczeństwa zazbrojony (styk przekaźnika)
    iAwariaZbiorcza   : Bool; // suma awarii z FC_Alarmy
    iKwituj      : Bool;
END_VAR
VAR_OUTPUT
    qTryb        : Int;    // 0=STOP 1=RECZNY 2=AUTO 3=AWARIA
    qAutoAktywne : Bool;   // sekwencja może pracować
    qJogDozwolony: Bool;
END_VAR

BEGIN
    // AWARIA ma najwyższy priorytet
    IF NOT #iBezpieczenstwoOK OR #iAwariaZbiorcza THEN
        #qTryb := 3;
    END_IF;

    CASE #qTryb OF
        0: // STOP
            IF #iWyborReczny THEN #qTryb := 1; END_IF;
            IF #iWyborAuto AND #iWarunkiBazowe THEN #qTryb := 2; END_IF;
        1: // RECZNY
            IF NOT #iWyborReczny THEN #qTryb := 0; END_IF;
        2: // AUTO
            IF NOT #iWyborAuto OR #iStop THEN #qTryb := 0; END_IF;
        3: // AWARIA — wyjście tylko przez kwitowanie przy usuniętej przyczynie
            IF #iKwituj AND #iBezpieczenstwoOK AND NOT #iAwariaZbiorcza THEN
                #qTryb := 0;
            END_IF;
    END_CASE;

    #qAutoAktywne  := (#qTryb = 2) AND #iStart;
    #qJogDozwolony := (#qTryb = 1);
END_FUNCTION_BLOCK
```

Uwaga: `iStart`/`iStop` podawaj już po obróbce zboczem (`R_TRIG`) albo jako
podtrzymywany bit „cykl aktywny" sterowany z zewnątrz — zależnie od maszyny.

## 3. FB_Alarm — pojedynczy alarm z opóźnieniem, zatrzaskiem i kwitowaniem

```scl
FUNCTION_BLOCK "FB_Alarm"
{ S7_Optimized_Access := 'TRUE' }
VAR_INPUT
    iWarunek : Bool;            // warunek alarmowy (prawda = źle)
    iKwituj  : Bool;
    pZwloka  : Time := T#0ms;   // filtr — ile musi trwać, by zgłosić
    pZatrzask: Bool := TRUE;    // TRUE = alarm trzyma do kwitowania
END_VAR
VAR_OUTPUT
    qAlarm       : Bool;        // aktywny (do logiki blokad)
    qNiekwitowany: Bool;        // do migania lampy / HMI
END_VAR
VAR
    tFiltr : TON;
END_VAR

BEGIN
    #tFiltr(IN := #iWarunek, PT := #pZwloka);

    IF #tFiltr.Q THEN
        #qAlarm := TRUE;
        #qNiekwitowany := TRUE;
    ELSIF NOT #pZatrzask THEN
        #qAlarm := FALSE;
    END_IF;

    IF #iKwituj THEN
        #qNiekwitowany := FALSE;
        IF NOT #tFiltr.Q THEN      // przyczyna ustąpiła → można skasować
            #qAlarm := FALSE;
        END_IF;
    END_IF;
END_FUNCTION_BLOCK
```

Zbiorczo: tablica instancji w DB + pętla `FOR` w FC_Alarmy, suma do
`iAwariaZbiorcza` w FB_Tryby i czerwona lampa `qNiekwitowany AND "Clock_1Hz"`
(wzorzec ISA-18: miga niekwitowany, świeci skwitowany-aktywny).

## 4. FC_SkalujAI — skalowanie wejścia analogowego z diagnostyką

```scl
FUNCTION "FC_SkalujAI" : Void
{ S7_Optimized_Access := 'TRUE' }
VAR_INPUT
    iSurowe  : Int;             // %IWxx (0..27648)
    pMin     : Real;            // dolna granica jedn. fizycznych
    pMax     : Real;            // górna granica
    pSurMin  : Int := 0;        // 0 dla 0–10 V, 5530 dla 2–10 V (4–20 mA na 500R)
END_VAR
VAR_OUTPUT
    qWartosc : Real;
    qBladCzujnika : Bool;       // poza zakresem pomiarowym
END_VAR
VAR_TEMP
    tmpNorm : Real;
END_VAR

BEGIN
    // przerwanie pętli / zwarcie: sygnał wyraźnie poza zakresem
    #qBladCzujnika := (#iSurowe < #pSurMin - 500) OR (#iSurowe > 28311);

    #tmpNorm := NORM_X(MIN := #pSurMin, VALUE := #iSurowe, MAX := 27648);
    #qWartosc := SCALE_X(MIN := #pMin, VALUE := LIMIT(MN:=0.0, IN:=#tmpNorm, MX:=1.0),
                         MAX := #pMax);
END_FUNCTION
```

## 5. Szablon sekwencji — FB_Sekwencja z watchdogiem kroku

Szkielet każdej maszyny cyklicznej. Kroki co 10, timeout, pauza ze
wznowieniem, wymuszenie kroku 0 przy wyjściu z AUTO.

```scl
FUNCTION_BLOCK "FB_Sekwencja"
{ S7_Optimized_Access := 'TRUE' }
VAR_INPUT
    iAutoAktywne : Bool;        // z FB_Tryby
    iPauza       : Bool;        // stop „miękki" — zamrożenie kroku
    pTimeoutKroku: Time := T#60s;
END_VAR
VAR_OUTPUT
    qKrok        : Int;
    qTimeoutKroku: Bool;        // do FB_Alarm
    // ...wyjścia procesowe sekwencji (żądania do FB_Naped itd.)
END_VAR
VAR
    xKrokPoprz   : Int := -1;
    tKrok        : TON;
    tCzasKroku   : Time;
END_VAR

BEGIN
    // watchdog kroku: liczy zawsze, gdy krok > 0 i nie ma pauzy
    #tKrok(IN := (#qKrok > 0) AND NOT #iPauza AND (#qKrok = #xKrokPoprz),
           PT := #pTimeoutKroku);
    #qTimeoutKroku := #tKrok.Q;
    #tCzasKroku := #tKrok.ET;

    IF #qKrok <> #xKrokPoprz THEN     // reset timera przy zmianie kroku
        #xKrokPoprz := #qKrok;
    END_IF;

    IF NOT #iAutoAktywne THEN
        #qKrok := 0;                  // stan bezpieczny; wyjścia gasi krok 0
        RETURN;
    END_IF;
    IF #iPauza THEN
        RETURN;                       // zamrożenie: nic nie przełączamy
    END_IF;

    CASE #qKrok OF
        0:  // GOTOWOSC — wygaś wszystkie żądania, czekaj na warunki startu
            ;
        10: // pierwszy krok procesu
            ;
        // ... kolejne kroki maszyny
    END_CASE;
END_FUNCTION_BLOCK
```

## 6. FB_PackML — raportowanie stanów dla maszyn pakujących

Minimalny model stanów ISA-TR88 do integracji z linią/MES.

```scl
FUNCTION_BLOCK "FB_PackML"
{ S7_Optimized_Access := 'TRUE' }
VAR_INPUT
    iReset : Bool;  iStart : Bool;  iStopCmd : Bool;
    iHold  : Bool;          // przyczyna WEWNĘTRZNA (brak folii itp.)
    iSuspend : Bool;        // przyczyna ZEWNĘTRZNA (blokada od sąsiada)
    iAbort : Bool;          // E-STOP / awaria
    iClear : Bool;
END_VAR
VAR_OUTPUT
    qStan : Int;  // 2=STOPPED 4=IDLE 6=EXECUTE 11=HELD 5=SUSPENDED 9=ABORTED
END_VAR

BEGIN
    IF #iAbort THEN #qStan := 9; END_IF;   // Abort z każdego stanu

    CASE #qStan OF
        0, 2: // STOPPED
            IF #iReset THEN #qStan := 4; END_IF;
        4:    // IDLE
            IF #iStart THEN #qStan := 6; END_IF;
        6:    // EXECUTE
            IF #iStopCmd  THEN #qStan := 2;  END_IF;
            IF #iHold     THEN #qStan := 11; END_IF;
            IF #iSuspend  THEN #qStan := 5;  END_IF;
        11:   // HELD — wraca po ustąpieniu przyczyny wewnętrznej
            IF NOT #iHold AND #iStart THEN #qStan := 6; END_IF;
            IF #iStopCmd THEN #qStan := 2; END_IF;
        5:    // SUSPENDED — wraca sam po odblokowaniu z zewnątrz
            IF NOT #iSuspend THEN #qStan := 6; END_IF;
            IF #iStopCmd THEN #qStan := 2; END_IF;
        9:    // ABORTED
            IF #iClear THEN #qStan := 2; END_IF;
    END_CASE;
END_FUNCTION_BLOCK
```

## 7. FC_Wyjscia — jedyne miejsce zapisu %Q

```scl
FUNCTION "FC_Wyjscia" : Void
{ S7_Optimized_Access := 'TRUE' }
// Zasada: żaden inny blok nie pisze bezpośrednio w %Q.
// Tu spotykają się: żądania z sekwencji, tryb ręczny i wymuszenia serwisowe.
BEGIN
    "qStycznikGlowny" := "DB_Naped_Glowny".qWyjscie
                         OR ("Tryby".qJogDozwolony AND "HMI".JogGlowny);

    "qLampaZielona"  := "Tryby".qTryb = 2;
    "qLampaZolta"    := ("Tryby".qTryb = 1) AND "Clock_1Hz";
    "qLampaCzerwona" := ("Alarmy".Niekwitowany AND "Clock_1Hz")
                        OR ("Alarmy".Aktywny AND NOT "Alarmy".Niekwitowany);
END_FUNCTION
```

## 8. Drobiazgi wielokrotnego użytku

```scl
// Zbocze narastające w SCL (instancja R_TRIG w VAR):
#trigStart(CLK := #iPrzycisk);
IF #trigStart.Q THEN ... END_IF;

// Licznik produkcji z kasowaniem z HMI:
IF #trigSztuka.Q THEN "Prod".Zmiana += 1; "Prod".Partia += 1; END_IF;
IF "HMI".KasujZmiane THEN "Prod".Zmiana := 0; END_IF;

// Miganie bez bitów zegarowych (gdy nie włączono clock memory):
#tMig(IN := NOT #tMig.Q, PT := T#500ms);
IF #tMig.Q THEN #xFaza := NOT #xFaza; END_IF;

// Histereza dwustawna (termostat/poziom):
IF #Wartosc < #pDolny THEN #qZalacz := TRUE; END_IF;
IF #Wartosc > #pGorny THEN #qZalacz := FALSE; END_IF;
```

## Konwencje nazewnictwa (obowiązkowe w każdym projekcie)

| Prefiks | Znaczenie | Przykład |
|---|---|---|
| `i` | wejście fizyczne / parametr wejściowy FB | `iCzujnikGorny`, `iZadanie` |
| `q` | wyjście fizyczne / wyjściowy FB | `qStycznikPompy`, `qAwaria` |
| `p` | parametr nastawialny (HMI/DB) | `pCzasMieszania` |
| `x` | flaga wewnętrzna Bool | `xCyklAktywny` |
| `t` | timer (instancja TON/TOF/TP) | `tRozruch` |
| `trig` | instancja R_TRIG/F_TRIG | `trigStart` |
| `DB_` | blok danych globalny | `DB_Parametry` |
| `FB_`/`FC_` | typy bloków | `FB_Naped`, `FC_Wyjscia` |


---

# Część II — Owijarka do palet: specyfikacja

Specyfikacja bazowa dla owijarki obrotowej (talerzowej). Warianty: ramieniowa
(obraca się ramię, nie paleta — ładunki lekkie/niestabilne) i pierścieniowa
(wysoka wydajność). Sekwencja i parametry są w ~90 % wspólne.

## Dobór sterownika

| Konfiguracja | CPU | Uwagi |
|---|---|---|
| Ekonomiczna (talerzowa, wciągarka na falowniku) | S7-1200 CPU 1212C DC/DC/DC | PTO niepotrzebne, prędkości przez falowniki (USS/Modbus RTU po CM 1241 lub analog 0–10 V przez SB 1232) |
| Standard | CPU 1214C DC/DC/DC + HMI KTP700 | zapas I/O na opcje (docisk góry, podajnik folii z napędem) |
| CPU 1211C | tylko najprostsza owijarka | 6 DI / 4 DQ ledwo starcza; brak rozbudowy o moduły |

## Lista I/O (wariant bazowy, talerzowa)

Wejścia cyfrowe:
- `iStart`, `iStop` (NC), `iEstopOK` (styk pomocniczy przekaźnika bezp., NC)
- `iTalerzPozycjaBazowa` — indukcyjny, pozycja 0° talerza
- `iWozekDol`, `iWozekGora` — krańcówki wózka folii (NC jako granice!)
- `iFotoWysokoscLadunku` — fotokomórka na wózku wykrywająca górę ładunku
- `iDrzwiZamkniete` / `iKurtynaOK` — obwód osłon (przez przekaźnik bezp.)
- `iFoliaZerwana` — czujnik obecności/naciągu folii
- `iImpulsTalerza` — enkoder/indukcyjny zliczania obrotów (HSC przy >1 imp/obr)

Wyjścia:
- `qTalerzFalownik` (start/stop) + prędkość zadana (analog/komunikacja)
- `qWozekGora`, `qWozekDol` (stycznik rewersyjny lub falownik)
- `qHamulecNaciagu` / `qNapedFoliiPrec` — naciąg folii (pre-stretch)
- `qCiecieZgrzew` — nóż/drut tnący z docisk. zgrzewającym (opcja)
- `qLampaPraca`, `qLampaAwaria`, `qBuczek`

## Parametry operatora (DB retentywny, edycja z HMI)

| Parametr | Typowy zakres | Domyślnie |
|---|---|---|
| Owinięcia dolne | 1–5 | 2 |
| Owinięcia górne | 1–5 | 2 |
| Owinięcia transportowe (środek, opcja) | 0–3 | 0 |
| Zakładka górna (owinięcie ponad ładunek) | 0–30 cm | 10 |
| Prędkość talerza | 3–12 obr/min | 8 |
| Prędkość wózka góra/dół | 0–100 % | 60 |
| Naciąg / pre-stretch folii | 0–300 % | 150 |
| Opóźnienie cięcia po zakończeniu | 0–5 s | 1 s |
| Tryb: wysokość z fotokomórki / zadana ręcznie | — | fotokomórka |

## Sekwencja (CASE #Krok OF, kroki co 10)

```
0   GOTOWOŚĆ    czeka na Start; warunki: EstopOK, DrzwiZamkniete,
                WozekDol, TalerzPozycjaBazowa (inaczej komunikat "wybazuj")
10  START       operator przypina folię do palety ręcznie (potwierdza Start)
20  OWIJANIE DOLNE   talerz jedzie; licznik obrotów (zbocze iImpulsTalerza)
                     aż OwinieciaDolne; wózek stoi na dole
30  JAZDA W GÓRĘ     talerz kręci się, wózek jedzie w górę;
                     stop wózka gdy iFotoWysokoscLadunku traci ładunek
                     + dojazd o ZakladkaGorna (czas lub enkoder)
40  OWINIĘCIA GÓRNE  wózek stoi na górze; licznik do OwinieciaGorne
50  JAZDA W DÓŁ      talerz kręci się, wózek zjeżdża do iWozekDol
60  OWINIĘCIA KOŃCOWE dolne domykające (zwykle 1)
70  POZYCJONOWANIE   talerz dojeżdża do iTalerzPozycjaBazowa ze zwolnieniem
                     (rampa w falowniku; dokładność zatrzymania!)
80  CIĘCIE/ZGRZEW    (opcja) wysuw ramienia, cięcie, zgrzew ogona folii
90  KONIEC       buczek 1 s, raport cyklu (+1 licznik palet), powrót do 0
```

Każdy krok: timeout (np. 60 s) → alarm z numerem kroku. Pauza (Stop w trakcie):
zapamiętaj krok, zatrzymaj napędy, wznowienie od tego samego kroku po Start.

## Alarmy specyficzne

- Zerwanie folii (`iFoliaZerwana` w trakcie kroków 20–60) → pauza, komunikat,
  po założeniu folii wznowienie od bieżącego kroku
- Timeout bazowania talerza / wózka
- Otwarcie osłon w cyklu → STOP kat. 1 przez przekaźnik bezp.; program
  przechodzi w AWARIA i wymaga kwitowania
- Falownik: brak gotowości / błąd (słowo statusowe przy komunikacji)
- Obie krańcówki wózka aktywne jednocześnie → awaria czujników

## Pułapki z praktyki

1. **Zatrzymanie talerza w pozycji** — sama krańcówka przy 12 obr/min nie
   wystarczy; zwolnij obroty 90° przed pozycją (drugi czujnik albo licznik
   impulsów), inaczej talerz przejeżdża bazę.
2. **Fotokomórka wysokości** widzi folię wystającą z ładunku — filtruj TON
   0,3–0,5 s zanim uznasz „koniec ładunku".
3. **Czarna folia stretch** potrafi nie odbijać wiązki czujnika folii — czujnik
   naciągu (ramię z krańcówką) jest pewniejszy niż optyczny.
4. **Licznik obrotów ze zbocza** (`|P|`) — bez zbocza doliczysz jeden obrót
   na każdy cykl PLC. Przy kilku impulsach na obrót licz przez HSC.
5. Palety niepełne/lekkie przy szybkim starcie talerza się przewracają —
   rampa rozpędzania w falowniku min. 2–3 s, prędkość startowa obniżona.


---

# Część III — Owijarka do palet: kompletny program (SCL)

Pełna implementacja sekwencji z `owijarka.md` dla owijarki obrotowej
(talerzowej) na S7-1200. Napędy talerza i wózka przez falowniki sterowane
cyfrowo (start/stop + 2 prędkości), licznik obrotów z czujnika indukcyjnego.
Do adaptacji: zamień sterowanie prędkością na komunikację USS/Modbus
(szablony w `komunikacja-kod.md`).

## 1. Tabela zmiennych (PLC tags)

| Nazwa | Adres | Uwagi |
|---|---|---|
| `iStart` | %I0.0 | przycisk NO |
| `iStopNC` | %I0.1 | przycisk NC (w programie styk zwykły!) |
| `iBezpieczenstwoOK` | %I0.2 | styk pomocniczy przekaźnika bezpieczeństwa |
| `iTalerzBaza` | %I0.3 | indukcyjny — pozycja 0° |
| `iImpulsObrotu` | %I0.4 | 1 impuls/obrót (przy >3/obr → HSC) |
| `iWozekDol` | %I0.5 | krańcówka NC |
| `iWozekGora` | %I0.6 | krańcówka NC (SB/rozszerzenie przy 1211C!) |
| `iFotoLadunek` | %I0.7 | fotokomórka na wózku „widzi ładunek" |
| `iFoliaOK` | %I1.0 | czujnik folii (ramię naciągu) |
| `qTalerzStart` | %Q0.0 | falownik talerza: bieg |
| `qTalerzSzybko` | %Q0.1 | falownik talerza: prędkość 2 |
| `qWozekGora` | %Q0.2 | falownik/stycznik wózka: góra |
| `qWozekDol` | %Q0.3 | wózka: dół |
| `qLampy...` | %Q0.4+ | sygnalizacja |

## 2. DB_Parametry (retentywny, edycja z HMI)

```scl
DATA_BLOCK "DB_Parametry"
{ S7_Optimized_Access := 'TRUE' }
VAR RETAIN
    OwiniecDolne   : Int := 2;      // 1..5
    OwiniecGorne   : Int := 2;      // 1..5
    OwiniecKoncowe : Int := 1;      // domykające na dole
    CzasZakladki   : Time := T#1s;  // dojazd wózka ponad ładunek
    TimeoutKroku   : Time := T#60s;
    LicznikPalet   : DInt := 0;     // statystyka (kasowana z HMI)
END_VAR
BEGIN
END_DATA_BLOCK
```

## 3. FB_Owijarka — sekwencja główna

```scl
FUNCTION_BLOCK "FB_Owijarka"
{ S7_Optimized_Access := 'TRUE' }
VAR_INPUT
    iAutoAktywne : Bool;    // z FB_Tryby (AUTO + cykl uruchomiony)
    iStart       : Bool;    // zbocze przycisku Start (potwierdzenia operatora)
    iTalerzBaza  : Bool;
    iImpulsObrotu: Bool;
    iWozekDol    : Bool;    // TRUE = wózek na dole (po obróbce NC!)
    iWozekGora   : Bool;
    iFotoLadunek : Bool;
    iFoliaOK     : Bool;
END_VAR
VAR_OUTPUT
    qKrok         : Int;
    qTalerzStart  : Bool;
    qTalerzSzybko : Bool;   // FALSE przy dojeździe do bazy (zwolnienie)
    qWozekGora    : Bool;
    qWozekDol     : Bool;
    qPauzaFolia   : Bool;   // komunikat HMI: załóż folię i wciśnij Start
    qTimeout      : Bool;
    qCyklGotowy   : Bool;   // impuls na koniec cyklu (buczek, licznik)
END_VAR
VAR
    xKrokPoprz    : Int := -1;
    xObroty       : Int;
    xKrokPrzedPauza : Int;
    trigObrot     : R_TRIG;
    trigStart     : R_TRIG;
    tKrok         : TON;
    tZakladka     : TON;
    tFiltrFoto    : TON;
END_VAR

BEGIN
    #trigObrot(CLK := #iImpulsObrotu);
    #trigStart(CLK := #iStart);

    // filtr fotokomórki: folia wystająca z ładunku daje krótkie przerwy
    #tFiltrFoto(IN := NOT #iFotoLadunek, PT := T#400ms);

    // watchdog kroku
    #tKrok(IN := (#qKrok > 0) AND (#qKrok = #xKrokPoprz) AND NOT #qPauzaFolia,
           PT := "DB_Parametry".TimeoutKroku);
    #qTimeout := #tKrok.Q;
    IF #qKrok <> #xKrokPoprz THEN #xKrokPoprz := #qKrok; END_IF;

    // wyjście z AUTO lub awaria → stan bezpieczny
    IF NOT #iAutoAktywne THEN
        #qKrok := 0;
    END_IF;

    // PAUZA po zerwaniu folii (kroki owijania 20..60): stój, czekaj na Start
    IF (#qKrok >= 20) AND (#qKrok <= 60) AND NOT #iFoliaOK THEN
        IF NOT #qPauzaFolia THEN
            #xKrokPrzedPauza := #qKrok;
            #qPauzaFolia := TRUE;
        END_IF;
    END_IF;
    IF #qPauzaFolia THEN
        // zatrzymaj napędy, wznowienie po założeniu folii i Starcie
        #qTalerzStart := FALSE;  #qWozekGora := FALSE;  #qWozekDol := FALSE;
        IF #iFoliaOK AND #trigStart.Q THEN
            #qPauzaFolia := FALSE;
            #qKrok := #xKrokPrzedPauza;
        END_IF;
        RETURN;
    END_IF;

    // domyślnie: nic nie jedzie — kroki włączają, co trzeba
    #qTalerzStart := FALSE;  #qTalerzSzybko := FALSE;
    #qWozekGora := FALSE;    #qWozekDol := FALSE;
    #qCyklGotowy := FALSE;

    CASE #qKrok OF
        0: // GOTOWOSC — warunki bazowe
            IF #iAutoAktywne AND #trigStart.Q THEN
                IF #iTalerzBaza AND #iWozekDol AND #iFoliaOK THEN
                    #qKrok := 20;               // operator przypiął folię
                    #xObroty := 0;
                END_IF;
                // brak warunków → komunikat "wybazuj" obsługuje HMI/alarmy
            END_IF;

        20: // OWINIECIA DOLNE — talerz kręci, wózek stoi
            #qTalerzStart := TRUE;  #qTalerzSzybko := TRUE;
            IF #trigObrot.Q THEN #xObroty += 1; END_IF;
            IF #xObroty >= "DB_Parametry".OwiniecDolne THEN
                #qKrok := 30;
            END_IF;

        30: // JAZDA W GORE — talerz kręci, wózek jedzie do góry ładunku
            #qTalerzStart := TRUE;  #qTalerzSzybko := TRUE;
            #qWozekGora := TRUE;
            #tZakladka(IN := #tFiltrFoto.Q, PT := "DB_Parametry".CzasZakladki);
            IF #tZakladka.Q OR #iWozekGora THEN   // zakładka LUB krańcówka
                #xObroty := 0;
                #qKrok := 40;
            END_IF;

        40: // OWINIECIA GORNE
            #qTalerzStart := TRUE;  #qTalerzSzybko := TRUE;
            IF #trigObrot.Q THEN #xObroty += 1; END_IF;
            IF #xObroty >= "DB_Parametry".OwiniecGorne THEN
                #qKrok := 50;
            END_IF;

        50: // JAZDA W DOL
            #qTalerzStart := TRUE;  #qTalerzSzybko := TRUE;
            #qWozekDol := TRUE;
            IF #iWozekDol THEN
                #xObroty := 0;
                #qKrok := 60;
            END_IF;

        60: // OWINIECIA KONCOWE (domykające)
            #qTalerzStart := TRUE;  #qTalerzSzybko := TRUE;
            IF #trigObrot.Q THEN #xObroty += 1; END_IF;
            IF #xObroty >= "DB_Parametry".OwiniecKoncowe THEN
                #qKrok := 70;
            END_IF;

        70: // POZYCJONOWANIE — wolno do czujnika bazy
            #qTalerzStart := TRUE;  #qTalerzSzybko := FALSE;  // zwolnienie!
            IF #iTalerzBaza THEN
                #qKrok := 90;
            END_IF;

        90: // KONIEC CYKLU
            #qCyklGotowy := TRUE;
            "DB_Parametry".LicznikPalet += 1;
            #qKrok := 0;
    END_CASE;
END_FUNCTION_BLOCK
```

## 4. OB1 — spięcie całości

```scl
// OB1 (SCL lub LAD wywołujący te same bloki):

// 1) wejścia po obróbce NC (krańcówki i STOP są rozwierne):
"xWozekDol"  := NOT "iWozekDol";    // czujnik NC: 0 fizyczne = wózek na dole?
                                    // ZALEŻNIE OD MONTAŻU — ustal na obiekcie!
// 2) tryby
"Tryby"(iWyborAuto := "HMI".Auto, iWyborReczny := "HMI".Reczny,
        iStart := "iStart", iStop := NOT "iStopNC",
        iWarunkiBazowe := "iTalerzBaza" AND "xWozekDol",
        iBezpieczenstwoOK := "iBezpieczenstwoOK",
        iAwariaZbiorcza := "Alarmy".Aktywny, iKwituj := "HMI".Kwituj);

// 3) sekwencja
"Owijarka"(iAutoAktywne := "Tryby".qAutoAktywne, iStart := "iStart",
           iTalerzBaza := "iTalerzBaza", iImpulsObrotu := "iImpulsObrotu",
           iWozekDol := "xWozekDol", iWozekGora := NOT "iWozekGora",
           iFotoLadunek := "iFotoLadunek", iFoliaOK := "iFoliaOK");

// 4) alarmy (przykłady)
// obie krańcówki "aktywne" naraz = uszkodzony czujnik lub okablowanie
"AlObieKrancowki"(iWarunek := "xWozekDol" AND (NOT "iWozekGora"),
                  iKwituj := "HMI".Kwituj, pZwloka := T#200ms);
"AlTimeout"(iWarunek := "Owijarka".qTimeout, iKwituj := "HMI".Kwituj);

// 5) WYŁĄCZNIE tu zapis wyjść:
"qTalerzStart"  := "Owijarka".qTalerzStart
                   OR ("Tryby".qJogDozwolony AND "HMI".JogTalerz);
"qTalerzSzybko" := "Owijarka".qTalerzSzybko;
"qWozekGora"    := "Owijarka".qWozekGora
                   OR ("Tryby".qJogDozwolony AND "HMI".JogWozekGora AND NOT "iWozekGora");
"qWozekDol"     := "Owijarka".qWozekDol
                   OR ("Tryby".qJogDozwolony AND "HMI".JogWozekDol AND "xWozekDol" = FALSE);
```

## 5. Co dopasować przy wdrożeniu

1. **Polaryzacja czujników NC/NO** — tabela wyżej zakłada typowy montaż;
   na obiekcie sprawdź każde wejście w Watch table zanim ruszysz napędami.
2. **Zwolnienie przed bazą** (krok 70): przy 1 impulsie/obrót wystarczy stała
   wolna prędkość; przy większych talerzach dodaj drugi czujnik „przed bazą".
3. **Zliczanie obrotów**: >3 imp/obrót → przenieś na HSC i porównuj wartość,
   nie zbocza w OB1.
4. **Cięcie/zgrzew** (opcja): dołóż kroki 80/85 między 70 a 90 według
   sekwencji z `owijarka.md`.
5. **Jog w trybie ręcznym** ma blokady krańcówek — nie zdejmuj ich „na testy".


---

# Część IV — Maszyny pakujące i linie

## Stany PackML (ISA-TR88) — wspólny język branży pakowania

Maszyna pakująca w linii powinna raportować stany PackML — integratorzy
i systemy MES tego oczekują:

```
STOPPED → (Reset) → IDLE → (Start) → EXECUTE
EXECUTE → (Hold: brak materiału własnego)   → HELD    → wznowienie
EXECUTE → (Suspend: blokada od sąsiada linii) → SUSPENDED → wznowienie
dowolny → (Abort: E-STOP/awaria) → ABORTED → (Clear) → STOPPED
```

W S7-1200 realizacja: zmienna `Int` stanu + `CASE` (jak sekwencja krokowa),
stan raportowany na HMI i do nadrzędnego PLC (GET/PUT lub Modbus TCP).
Rozróżniaj HELD (przyczyna wewnętrzna) od SUSPENDED (przyczyna zewnętrzna) —
to pierwsza rzecz, o którą pyta kierownik produkcji przy liczeniu OEE.

## Flow-pack (HFFS) / pakowarka pionowa (VFFS)

Elementy programu:
- **PID temperatur zgrzewu** (2–3 strefy): `PID_Compact` w OB30 co 100 ms;
  blokada startu produkcji dopóki temperatury nie osiągną okna ±5 °C
  (gotowość „heat-up done").
- **Synchronizacja produkt–folia**: fotocela produktu na podajniku,
  znacznik nadruku folii (registration mark) — korekta pozycji cięcia.
  Przy serwo posuwie: oś PTO/PROFIdrive z `MC_MoveRelative` na porcję folii.
- **No product – no bag**: brak produktu w oknie podania → pomiń cykl zgrzewu
  (oszczędność folii). Odwrotnie: produkt bez folii → natychmiast stop + alarm.
- **Licznik produkcji + odrzuty** na zmianę/partię (retentywne, kasowane z HMI).
- Alarmy: folia zerwana, znacznik nie znaleziony w oknie (folia się ślizga),
  temperatura poza oknem, drzwi/osłony.

## Kartoniarka / zamykarka kartonów

- Sekwencja: pobranie kartonu → formowanie → napełnienie (interfejs z linią) →
  zamknięcie klap → taśmowanie/klejenie (hot-melt: zwolnienie na przestoje!).
- Wakuometr przy przyssawkach podajnika: brak podciśnienia = karton nie pobrany
  → retry (max 3) → alarm.
- Śledzenie kartonu przez maszynę rejestrem przesuwnym (`SHL` taktowany
  enkoderem/taktem maszyny) — wyrzutnik braków kilka pozycji dalej.

## Paletyzer (warstwowy, bez robota)

- Tabela wzorów ułożenia (DB: pozycje X/Y/obrót dla każdej sztuki warstwy,
  liczba warstw) = receptura produktu.
- Sekwencje równoległe: formowanie warstwy / podnośnik palety / magazyn palet
  i przekładek — osobne FB, koordynacja przez flagi gotowości.
- Zmiana formatu = wybór receptury z HMI, zero zmian w kodzie.

## Przenośniki i sprzęganie maszyn w linię

- Strefy akumulacji: czujnik zajętości strefy + logika „jedź, jeśli następna
  strefa wolna" (ZPA). Kaskadowe zezwolenia zamiast jednego długiego taśmociągu.
- Sygnały między maszynami (fizyczne 24 V albo sieć): `GotowaPrzyjac`,
  `ProduktWyslany`, `BlokadaZwrotna` (backpressure). Zawsze definiuj je w FDS —
  spory „czyj sygnał zawinił" to klasyka uruchomień linii.
- Tracking produktu: rejestr przesuwny na takt enkodera, pozycje odrzutu
  i kontroli (waga kontrolna, detektor metalu) jako offsety w rejestrze.

## Integracje typowe w pakowaniu

| Urządzenie | Interfejs | Uwagi |
|---|---|---|
| Falowniki (SINAMICS V20/G120) | USS / Modbus RTU (CM 1241) lub PROFINET | słowo sterujące/statusowe wg dokumentacji napędu |
| Waga kontrolna, detektor metalu | 24 V (OK/NOK + takt) lub Modbus TCP | sygnał NOK → wyrzutnik przez tracking |
| Drukarka dat (TIJ/CIJ) | RS-232 (CM 1241) / Ethernet | wyzwalanie z fotoceli, treść z receptury |
| Aplikator etykiet | 24 V start + gotowość | timeout aplikacji → alarm |
| Czujniki wizyjne (np. obecność zgrzewu) | 24 V OK/NOK / PROFINET | wynik wiąż z trackingiem, nie „na żywo" |
| MES / traceability | Modbus TCP serwer w S7-1200 / OPC UA od 1500 | liczniki, stany PackML, nr partii |

## Bezpieczeństwo linii pakującej

- Strefy: każda maszyna ma własny obwód (przekaźnik bezpieczeństwa), E-STOP
  linii rozcina wszystkie — projekt obwodów po stronie elektryka, PLC tylko
  obserwuje styki pomocnicze i raportuje, KTÓRA strefa otwarta.
- Po otwarciu osłony i zamknięciu: wymagane świadome zazbrojenie (przycisk
  RESET niebieski) — nigdy auto-restart z samego zamknięcia drzwi
  (PN-EN ISO 14118 — nieoczekiwane uruchomienie).


---

# Część V — Komunikacja: szablony kodu

Gotowe fragmenty pod najczęstsze integracje. Każdy szablon: co skonfigurować
w TIA Portal + kod SCL + pułapki.

## 1. Falownik po USS (CM 1241 RS-485) — np. SINAMICS V20

Konfiguracja: CM 1241 (RS-485), w falowniku protokół USS, adres 1,
ta sama prędkość transmisji (np. 38400/8/N/1). Instrukcje z grupy USS
wywołuj w OB1; `USS_Port_Scan` obsługuje CAŁĄ magistralę.

```scl
// OB1 — jeden port, do 16 napędów na magistrali:
"USS_Port_Scan_DB"(PORT := "Local~CM_1241_(RS422_485)", BAUD := 38400,
                   USS_DB := "USS_DB");

// sterowanie napędem nr 1:
"USS_Drive_Control_DB"(RUN     := "xFalownikStart",
                       OFF2    := FALSE,             // wybieg
                       OFF3    := FALSE,             // szybki stop
                       F_ACK   := "HMI".Kwituj,
                       DIR     := "xKierunekP",
                       DRIVE   := 1,                 // adres USS
                       SPEED_SP:= "rPredkoscProc",   // -200..200 [%]
                       USS_DB  := "USS_DB");
"xFalownikPracuje" := "USS_Drive_Control_DB".RUN_EN;
"xFalownikBlad"    := "USS_Drive_Control_DB".FAULT;
```

Pułapki: rezystor terminujący na końcu magistrali; `USS_Read_Param`/
`USS_Write_Param` tylko gdy napęd nie jest w stanie FAULT; przy kilku
napędach jeden `USS_Drive_Control` NA KAŻDY adres.

## 2. Falownik / urządzenie po Modbus RTU (CM 1241)

```scl
// raz po starcie (np. w OB100 ustaw flagę, wykonaj w OB1):
IF "xInitModbus" THEN
    "MB_COMM_LOAD_DB"(REQ := TRUE,
        PORT := "Local~CM_1241_(RS422_485)",
        BAUD := 19200, PARITY := 2,        // 2 = even (typowo dla RTU)
        MB_DB := "MB_MASTER_DB".MB_DB);
    IF "MB_COMM_LOAD_DB".DONE OR "MB_COMM_LOAD_DB".ERROR THEN
        "xInitModbus" := FALSE;
    END_IF;
END_IF;

// cykliczny odczyt 10 rejestrów od adresu 40001 ze slave 2:
"MB_MASTER_DB"(REQ := "Clock_2Hz" AND NOT "xInitModbus",
    MB_ADDR := 2, MODE := 0,               // 0=czytaj
    DATA_ADDR := 40001, DATA_LEN := 10,
    DATA_PTR := "DB_Modbus".Odczyt);       // Array[0..9] of Word, DB NIEoptymalizowany!
```

Pułapki: `DATA_PTR` musi wskazywać DB z WYŁĄCZONĄ optymalizacją; jedno
żądanie naraz (sekwencjonuj MODE/adresy przez CASE); kolejność bajtów
w rejestrach 32-bit — często potrzebny `SWAP`.

## 3. Modbus TCP — S7-1200 jako serwer dla SCADA/MES

```scl
// OB1 — serwer nasłuchuje na porcie 502:
"MB_SERVER_DB"(DISCONNECT := FALSE,
    MB_HOLD_REG := "DB_MbSerwer".Rejestry,   // Array[0..99] of Word, bez optymalizacji
    CONNECT := "DB_MbSerwer".Polaczenie);    // TCON_IP_v4: port 502, id połączenia

// mapowanie danych do rejestrów (rób w jednym miejscu):
"DB_MbSerwer".Rejestry[0] := INT_TO_WORD("Tryby".qTryb);
"DB_MbSerwer".Rejestry[1] := INT_TO_WORD("Owijarka".qKrok);
"DB_MbSerwer".Rejestry[2] := DINT_TO_WORD("DB_Parametry".LicznikPalet);       // młodsze
"DB_MbSerwer".Rejestry[3] := DINT_TO_WORD(SHR(IN := "DB_Parametry".LicznikPalet, N := 16)); // starsze
```

Struktura `TCON_IP_v4`: InterfaceId = HW panelu PROFINET, ID = wolny nr
połączenia, ActiveEstablished = FALSE (serwer), LocalPort = 502.

## 4. PLC ↔ PLC po S7 (GET/PUT)

Po stronie partnera: Properties → Protection → **zaznacz „Permit access with
PUT/GET"** — bez tego zawsze błąd. Połączenie S7 tworzysz w Network view.

```scl
"GET_DB"(REQ := "Clock_1Hz", ID := W#16#0100,   // id połączenia S7
    ADDR_1 := P#DB10.DBX0.0 BYTE 20,            // co czytamy u partnera
    RD_1   := P#DB20.DBX0.0 BYTE 20);           // dokąd u nas
"xGetBlad" := "GET_DB".ERROR;
```

Uwaga: obszary przez wskaźniki P# wymagają DB nieoptymalizowanych po obu
stronach. Do nowych projektów rozważ zamiast tego TSEND_C/TRCV_C.

## 5. Open User Communication — TSEND_C/TRCV_C (PLC↔PLC, PLC↔PC)

```scl
// nadawca (klient):
"TSEND_C_DB"(REQ := "trigWyslij".Q, CONT := TRUE,
    CONNECT := "DB_OUC.PolaczenieKlient",   // TCON_IP_v4: IP partnera, port 2000
    DATA := "DB_OUC".Ramka);                 // struct/array do wysłania

// odbiorca (serwer):
"TRCV_C_DB"(EN_R := TRUE, CONT := TRUE,
    CONNECT := "DB_OUC.PolaczenieSerwer",    // ActiveEstablished=FALSE, LocalPort=2000
    DATA := "DB_OUC".Odbior);
"xNowaRamka" := "TRCV_C_DB".DONE;            // impuls przy komplecie danych
```

Pułapka: TCP to strumień — przy zmiennej długości ramek ustal stały rozmiar
albo własny nagłówek z długością; `DONE` przy `LEN=0` melduje po zapełnieniu
bufora `DATA`.

## 6. Struktura wymiany sygnałów maszyna↔linia (24 V, bez sieci)

Minimalny, sprawdzony interfejs dwustronny (zdefiniuj w FDS!):

| Sygnał | Kierunek | Znaczenie |
|---|---|---|
| `GotowaPrzyjac` | linia → maszyna | wolno podać produkt |
| `ProduktPodany` | linia → maszyna | impuls: produkt wszedł |
| `MaszynaGotowa` | maszyna → linia | mogę przyjąć następny |
| `MaszynaAwaria` | maszyna → linia | stop podawania |
| `ProduktOdebrany`| maszyna → linia | impuls na wyjściu |

```scl
// strona maszyny:
"qMaszynaGotowa" := ("Tryby".qTryb = 2) AND ("Sekwencja".qKrok = 0)
                    AND NOT "Alarmy".Aktywny;
"qMaszynaAwaria" := "Alarmy".Aktywny;
#trigPodano(CLK := "iProduktPodany");
IF #trigPodano.Q AND "qMaszynaGotowa" THEN
    "Sekwencja".StartCyklu := TRUE;
END_IF;
```


---

# Część VI — Brief klienta i budowa wyceny

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


---


*Wygenerowano ze źródeł skilla `uslugi-plc` — 2026-08-02.*
