# Skrzydła Furii 1939

Arcade'owa gra lotnicza w stylu *Wings of Fury*, osadzona w kampanii wrześniowej.
Wszystko działa w przeglądarce, bez zależności zewnętrznych: czysty HTML + CSS +
JavaScript i jeden canvas 2D. Grafika (samoloty, pojazdy, okręty, piechota) jest
rysowana ścieżkami canvas, dźwięk syntezowany przez WebAudio.

## Sterowanie

| Klawisz | Działanie |
|---|---|
| ← → | ster wysokości (obrót maszyny — pełna pętla pozwala zawrócić) |
| ↑ | gaz |
| ↓ | hamowanie / klapy, na ziemi hamulce kół |
| SPACJA | karabiny maszynowe |
| CTRL (lub Z) | zrzut bomby albo torpedy |
| SHIFT | ostry wiraż (kosztem prędkości) |
| L | podwozie |
| P / ESC | pauza · M — dźwięk · R (przytrzymaj) — restart misji |

## Pliki

```
wings-of-fury/
├── index.html      # powłoka: canvas + ekrany menu/odprawy/raportu
├── css/style.css   # interfejs (menu, odprawa, hangar, opcje)
└── js/
    ├── core.js     # matematyka, wejście, dźwięk, kamera, cząsteczki
    ├── world.js    # teren (mapa wysokości), morze, chmury, sceneria, leje
    ├── art.js      # rysunki wektorowe: samoloty, pojazdy, okręty, budynki
    ├── units.js    # jednostki naziemne i morskie, wraki, spadochroniarze
    ├── weapons.js  # pociski, bomby, torpedy, pociski artylerii plot.
    ├── planes.js   # model lotu, sterowanie gracza, lądowanie, SI
    ├── levels.js   # 8 misji kampanii (scenariusze, cele, fale przeciwnika)
    ├── hud.js      # przyrządy pokładowe rysowane na canvasie
    └── game.js     # silnik, przebieg misji, ekrany, zapis postępu
```

## Model lotu

Skala: **1 px ≈ 1 m**, prędkość w px/s czytana wprost jako km/h, `GRAV = 300 px/s²`.
Dla każdej maszyny podajemy tylko wielkości „fizyczne" — ciąg, prędkość
przeciągnięcia, prędkość maksymalną i prędkość obrotu sterem. Reszta wynika z nich
(`planes.js`):

- `liftK = GRAV / (vStall² · CL_MAX)` — przy prędkości przeciągnięcia i maksymalnym
  współczynniku siły nośnej lift równoważy ciężar,
- `cd0 = thrust / vMax²` — ciąg równoważy opór dokładnie przy prędkości maksymalnej.

W każdej klatce liczone są: ciąg wzdłuż osi maszyny, siła nośna prostopadła do
wektora lotu (`Cl = 5.4·α`, po przekroczeniu 0,30 rad następuje przeciągnięcie),
opór szkodliwy i indukowany oraz **trym** — nos sam ustawia się na kąt potrzebny do
lotu poziomego przy danej prędkości, dzięki czemu maszyna nie wymaga ciągłego
podtrzymywania drążka. Asystent przeciwprzeciągnięciowy tłumi ster przy kącie
natarcia powyżej 0,27 rad.

Lądowanie sprawdza cztery warunki (podwozie, prędkość < `vStall·1,45`, pochylenie
< 0,34 rad, opadanie > −130 m/s) i działa w obie strony lotu; zbyt szybkie, ale
poprawne podejście kończy się odbiciem od pasa, a nie katastrofą.

## Misje

1. **Szkolenie bojowe** — Dęblin, PWS-26 (balony i makiety)
2. **Pierwszy dzień** — Balice, PZL P.7a (Ju 87 nad lotniskiem)
3. **Kolumna pancerna** — Wieluń, PZL P.11c
4. **Most na Warcie** — Sieradz, PZL.23 Karaś
5. **Gniazdo os** — polowe lotnisko Luftwaffe, Karaś
6. **Niebo nad Warszawą** — Okęcie, P.11c (He 111 + eskorta, obrona miasta)
7. **Wilcze stado** — Zatoka Gdańska, PZL.37 Łoś (torpedy, lądowanie na pokładzie)
8. **Ostatni lot** — przyczółek nad Bugiem, Łoś

Postęp kampanii, medale i ustawienia zapisują się w `localStorage`
(klucz `wof1939.save.v1`).

## Trwałość zniszczeń

Zniszczone jednostki nie znikają: zostają wraki, które palą się i dymią do końca
misji, ciała piechoty jako ślady na ziemi, przypalenia i **leje deformujące mapę
wysokości** (`World.crater` modyfikuje teren, więc lej widać w obrysie zbocza).
Wybuchy wypalają też roślinność (`World.blastScenery`).

## Testy

Gra była rozwijana w pętli z testami Playwright (headless Chromium): start i
lądowanie na klawiaturze, przelot całej kampanii do ekranu raportu, zachowanie SI
(pościg, bombardowanie z wyprzedzeniem balistycznym, nurkowanie Ju 87), ogień
własnej i nieprzyjacielskiej artylerii plot., trwałość wraków oraz pomiar płynności
przy pełnym obciążeniu (60 kl./s przy 19 pożarach i 15 maszynach w powietrzu).
