# Maszyny pakujące i linie — wzorce programów

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
