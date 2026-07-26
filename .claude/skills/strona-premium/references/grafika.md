# Autorska grafika SVG — generatory scen

Zdjęcia stockowe kosztują, wymagają licencji i wyglądają jak u wszystkich.
Tło sekcji da się narysować kodem: kilkanaście linijek Pythona generuje
scenę, która skaluje się do każdej rozdzielczości, waży 2–4 kB i przyjmuje
kolory z systemu zmiennych CSS.

**Zasada:** grafika jest **dekoracją**, nie treścią. Zawsze
`aria-hidden="true"`, zawsze `pointer-events: none`, zawsze pod tekstem
(`z-index: 0`) i zawsze na tyle wygaszona, żeby nie walczyła z czytelnością.
Kontury trzymam w przedziale `opacity: .05–.10` na jasnym tle i `.05–.09`
na tle w kolorze marki.

## Wspólne opakowanie

Wszystkie sceny wchodzą w ten sam kontener. `preserveAspectRatio="…slice"`
sprawia, że scena kadruje się jak `background-size: cover` — nigdy się nie
rozciąga.

```python
def medart(kind="mol"):
    """Dekoracyjna scena SVG w tle sekcji (czysto ozdobna, aria-hidden)."""
    return ('<div class="medart" aria-hidden="true">'
            '<svg viewBox="0 0 1140 500" preserveAspectRatio="xMidYMid slice">%s</svg>'
            '</div>') % _ART_SCENES[kind]()
```

```css
.medart { position: absolute; inset: 0; z-index: 0; pointer-events: none; overflow: hidden; }
.medart svg { width: 100%; height: 100%; }
.medart .ln      { fill: none; stroke: var(--brand); stroke-width: 1;  opacity: .10; }
.medart .ln-soft { fill: none; stroke: var(--brand); stroke-width: .8; opacity: .06; }
.medart .dot     { fill: var(--gold); opacity: .3; }

/* na sekcjach w kolorze marki kontury muszą być białe, nie ciemniejsze */
.bg-brand .medart .ln      { stroke: #fff; opacity: .09; }
.bg-brand .medart .ln-soft { stroke: #fff; opacity: .05; }
.bg-brand .medart .dot     { fill: var(--gold); opacity: .5; }

.medart + * { position: relative; z-index: 2; }   /* treść nad sceną */
```

Sekcja z `.medart` musi mieć `position: relative` **i** `overflow: hidden`
— sceny celowo wychodzą poza kadr (patrz `x` startujący od `-40`), więc bez
przycięcia zrobi się przewijanie w bok.

## Scena 1 — siatka heksagonalna („kolagen")

Do medycyny estetycznej, biologii, regeneracji. Rzędy przesunięte o połowę
szerokości dają plaster miodu; co piąty węzeł dostaje złotą kropkę, żeby
siatka nie była martwa.

```python
def _hex_lattice(cols=9, rows=5, r=46):
    import math
    out = []
    for row in range(rows):
        for col in range(cols):
            cx = col * r * 1.72 + (r * .86 if row % 2 else 0)
            cy = row * r * 1.5
            pts = " ".join("%.1f,%.1f" % (cx + r * math.cos(math.radians(60 * k - 30)),
                                          cy + r * math.sin(math.radians(60 * k - 30)))
                           for k in range(6))
            out.append('<polygon class="ln-soft" points="%s"/>' % pts)
            if (col + row) % 5 == 0:
                out.append('<circle class="dot" cx="%.1f" cy="%.1f" r="2.6"/>' % (cx, cy))
    return "".join(out)
```

Geometria: przy promieniu `r` sąsiedni heksagon w rzędzie stoi co `r*1.732`,
kolejny rząd co `r*1.5`, a nieparzyste rzędy przesuwa się o `r*0.866`.
Kąt `60*k - 30` daje wierzchołek „płasko u góry".

## Scena 2 — warstwy skóry

Do zabiegów działających w głąb (mezoterapia, lasery, peelingi). Miękkie
krzywe Béziera układają się w przekrój tkanki. Co trzecia linia jest
mocniejsza — inaczej całość zlewa się w szarość.

```python
def _skin_layers():
    return "".join(
        '<path class="%s" d="M-40 %d C 160 %d, 360 %d, 560 %d S 900 %d, 1140 %d"/>'
        % ("ln" if i % 3 == 0 else "ln-soft", y, y - 34, y + 26, y - 16, y + 22, y - 8)
        for i, y in enumerate(range(-30, 520, 28)))
```

Klucz to `S` (smooth curveto) — odbija poprzedni uchwyt, więc łączenie
dwóch krzywych nie ma widocznego załamania.

## Scena 3 — fale wodne

Do balneologii, SPA, basenu, siarczkowych kąpieli. `q` + powtórzone `t`
tworzą regularną falę jednym poleceniem na wiersz.

```python
def _water():
    return "".join(
        '<path class="%s" d="M-40 %d q 70 -26 140 0 t 140 0 t 140 0 t 140 0 t 140 0 t 140 0 t 140 0"/>'
        % ("ln" if i % 4 == 0 else "ln-soft", y)
        for i, y in enumerate(range(0, 520, 26)))
```

`t` (smooth quadratic) sam lustruje uchwyt poprzedniego `q`, więc grzbiety
i doliny wychodzą naprzemiennie bez liczenia współrzędnych.

## Scena 4 — siatka kliniczna

Neutralna, „aparaturowa" — pasuje pod fizykoterapię, diagnostykę, cennik.
Sześć złotych węzłów rozstawionych ręcznie sugeruje punkty pomiarowe.

```python
def _pulse_grid():
    out = []
    for x in range(0, 1160, 40):
        out.append('<line class="ln-soft" x1="%d" y1="0" x2="%d" y2="500"/>' % (x, x))
    for y in range(0, 520, 40):
        out.append('<line class="ln-soft" x1="0" y1="%d" x2="1140" y2="%d"/>' % (y, y))
    for i, (x, y) in enumerate([(200,120),(520,80),(840,200),(360,340),(700,400),(980,320)]):
        out.append('<circle class="dot" cx="%d" cy="%d" r="3.4"/>' % (x, y))
    return "".join(out)

_ART_SCENES = {"mol": _hex_lattice, "skin": _skin_layers,
               "water": _water, "grid": _pulse_grid}
```

## Dobór sceny do sekcji

| Scena | Sekcje |
|---|---|
| `mol` | medycyna estetyczna, zabiegi regeneracyjne, „dlaczego my" |
| `skin` | kosmetologia, peelingi, lasery, metamorfozy |
| `water` | balneologia, SPA, masaże, pobyty wypoczynkowe |
| `grid` | rehabilitacja, fizykoterapia, cennik, kontakt |

Jedna scena na sekcję i **maksymalnie 3–4 sceny na stronę**. Piąta i każda
kolejna przestaje być akcentem, a zaczyna być szumem.

## Koszt i wydajność

Scena to statyczny SVG w HTML — zero requestów, zero JS, renderuje się
razem z dokumentem. Heksagony to najcięższa z czterech: 45 wielokątów,
ok. 4 kB przed gzipem. Nie animuję samych scen (setki węzłów × transform =
zadyszka na telefonie) — ruch dokładam osobno przez `aurora` na
pseudoelemencie sekcji, który jest jednym prostokątem gradientu.

Gdyby scena miała być animowana, animuj **kontener**, nie węzły:

```css
.medart { animation: drift 40s linear infinite alternate; }
@keyframes drift { to { transform: translate3d(-2%, 1.5%, 0) scale(1.04); } }
```

## Ikony a sceny — nie mylić

- **Sceny** (`medart`) — tło sekcji, `viewBox 1140×500`, kontury 0.8–1 px,
  bez znaczenia semantycznego.
- **Ikony** (`references/ikony.py`) — element treści, `viewBox 24×24`,
  dwutonowe (plama 16% + kreska 1.5 px), zawsze w sprite'cie i wołane
  przez `<use href="#i-nazwa">`.

Nigdy nie skaluj ikony 24×24 do tła sekcji — kreska 1.5 px urośnie do
kilkudziesięciu pikseli i wyjdzie plakat, nie tło.
