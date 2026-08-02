# Owijarka do palet — wzorzec programu

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
