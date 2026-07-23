---
name: grafika-agy
description: Generuje realne pliki graficzne przez `agy` (Google Antigravity CLI) i jego wbudowane narzędzie generate_image. Użyj, gdy użytkownik prosi o "wygeneruj obraz przez agy/antigravity", "grafika przez Gemini/Antigravity", "okładka/cover na bloga", "zdjęcie AI lokalnie". Działa TYLKO lokalnie (agy zainstalowany + OAuth Google) — nie w zdalnej sesji bez agy. Obejmuje wywołanie, pułapkę katalogu scratch, optymalizację webp i zasady promptowania.
---

# Generowanie obrazów przez `agy` (Antigravity CLI)

`agy` to agent Google Antigravity z **wbudowanym narzędziem `generate_image`**. Naprawdę
powstają pliki graficzne, lokalnie, na koncie Google użytkownika.

> Wymaga lokalnej maszyny z zainstalowanym `agy` i aktywnym OAuth Google. W zdalnej
> sesji bez `agy` / bez OAuth to NIE zadziała — wtedy użyj `grafika-1min` lub Pollinations.

## 1. Sprawdź gotowość (zawsze najpierw)

```bash
node "C:/Users/<USER>/.claude/plugins/cache/antigravity-plugin-cc/antigravity/1.0.0/scripts/antigravity-companion.mjs" setup --json
```

Oczekiwane: `{"ready":true,"agy":{"available":true,...},"auth":{"detail":"Google account active (...)"}}`.
Gdy `auth` puste — user musi raz uruchomić `agy` interaktywnie i przejść OAuth Google. Sam tego nie zrobisz.
(Ścieżka i wersja `1.0.0` mogą się różnić — dostosuj do swojej instalacji.)

Modele (`agy models`) to wyłącznie tekst/kod (gemini-3.x, claude, gpt-oss) — **nie szukaj tam modelu obrazowego**.
Generowanie idzie przez narzędzie agenta, nie przez wybór modelu.

## 2. Wywołanie

```bash
timeout 280 agy --dangerously-skip-permissions -p "Wygeneruj obraz i zapisz jako cover1.webp. Opis: <OPIS>. BEZ tekstu, BEZ napisów, BEZ logo."
```

- `--dangerously-skip-permissions` — bez tego CLI czeka na potwierdzenie i wisi do timeoutu.
- Jeden obraz = jedno wywołanie. Licz ~1–3 min na obraz; daj `timeout` ≥ 270 s.
- `agy` sam konwertuje wynik do **.webp** (nawet gdy poprosisz o .png).

## 3. PUŁAPKA: gdzie lądują pliki

`agy` **NIE zapisuje do katalogu, z którego go wywołałeś**. Pisze do własnego scratcha:

```
C:/Users/<USER>/.gemini/antigravity-cli/scratch/
```

Zawsze po generowaniu skopiuj plik we właściwe miejsce projektu:

```bash
SC="C:/Users/<USER>/.gemini/antigravity-cli/scratch"
cp "$SC/cover1.webp" "<projekt>/uploads/blog-nazwa.webp"
```

Gdy `timeout` ubije CLI, plik i tak bywa już zapisany — **sprawdź scratch przed ponowieniem**
(`ls -la "$SC"/*.webp`), żeby nie generować drugi raz tego samego.

## 4. Optymalizacja (obowiązkowa — surowe pliki ważą ~1 MB)

```bash
magick in.webp -resize "1600x1600>" -quality 82 -define webp:method=6 out.webp
```

Realny efekt: 965 KB → 65 KB, 1016 KB → 86 KB przy zachowaniu jakości.
**Uwaga:** na Windows `convert` to systemowy konwerter dysków (`C:\Windows\system32\convert.exe`) —
ImageMagick wołaj wyłącznie jako `magick`.

## 5. Jak pisać opis obrazu

- **Zawsze dopisz** `BEZ tekstu, BEZ napisów, BEZ logo` — modele obrazowe generują bełkot zamiast liter.
  Jeśli w kadrze musi być pismo (notatnik), traktuj je jako teksturę, nie treść.
- Podaj **format** wprost: „format poziomy 16:9" (okładki), „kwadrat 1:1" (kafle), „pionowy 4:5" (social).
- Podaj **paletę marki** słownie: „tonacja miedzi, beżu i kremu", a nie kody hex — model reaguje na nazwy.
- Dodaj rejestr: „fotografia editorial", „premium", „miękkie ciepłe światło", „płytka głębia ostrości",
  „minimalizm". To najmocniej odróżnia wynik od stockowej sieczki.
- Brak przezroczystości — Gemini wypala kratkę w piksele. Elementy świecące generuj na czarnym tle
  i nakładaj przez `mix-blend-mode:screen`, ramki rób w CSS.

## 6. Po wygenerowaniu

Podepnij plik tam, gdzie ma działać (np. `UPDATE posts SET cover=?`), opublikuj ponownie stronę
i sprawdź HTTP-em, że plik faktycznie się serwuje (`curl -o /dev/null -w "%{http_code} %{size_download}"`).
Nie zakładaj, że skopiowanie pliku wystarczy.

## Osadzanie na stronach kolekcji

Skopiuj wynikowy `.webp` do `sites/<slug>/img/` i wstaw `<img src="img/nazwa.webp">`.
Nową stronę rejestruj wg skilla `nowa-strona` (wpis w `assets/js/sites.js`).

## Powiązane / alternatywy

- **`grafika-1min`** — generowanie przez API 1min.ai (wymaga klucza `ONEMIN_API_KEY`
  i dopuszczonego egress); działa też w sesji zdalnej z odpowiednim środowiskiem.
- **Pollinations** (client-side, bez klucza) — gdy nie ma `agy` ani klucza.
