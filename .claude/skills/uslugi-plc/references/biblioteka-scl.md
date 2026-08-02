# Biblioteka standardowych bloków SCL (S7-1200/1500, TIA Portal)

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
