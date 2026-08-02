# Szablony komunikacji — kod i konfiguracja (S7-1200)

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
