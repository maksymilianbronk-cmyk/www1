# Owijarka do palet — kompletny program przykładowy (SCL)

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
