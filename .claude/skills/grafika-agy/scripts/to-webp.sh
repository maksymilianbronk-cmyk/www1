#!/usr/bin/env bash
# Konwersja obrazu do zoptymalizowanego .webp i przeniesienie w miejsce docelowe.
#
# Użycie:
#   to-webp.sh <wejście> <wyjście.webp> [max_px] [jakość]
#
#   <wejście>      dowolny obraz (png/jpg/webp/...) — np. plik ze scratcha agy
#   <wyjście.webp> docelowa ścieżka w projekcie (katalogi tworzone same)
#   [max_px]       maks. dłuższy bok (domyślnie 1600); mniejsze nie są powiększane
#   [jakość]       jakość webp 0–100 (domyślnie 82)
#
# Przykłady:
#   to-webp.sh "$SC/cover1.webp" sites/blog/img/cover.webp
#   to-webp.sh render.png sites/foo/img/hero.webp 1920 80
#
# Preferuje `magick` (ImageMagick 7), potem `convert` (IM6), potem `cwebp`.
# UWAGA (Windows): NIE używaj `convert` — to systemowy konwerter dysków; tam jest `magick`.
set -euo pipefail

IN="${1:?podaj plik wejściowy}"
OUT="${2:?podaj plik wyjściowy .webp}"
MAX="${3:-1600}"
Q="${4:-82}"

[[ -f "$IN" ]] || { echo "Brak pliku wejściowego: $IN" >&2; exit 1; }
mkdir -p "$(dirname "$OUT")"

size_of(){ stat -c%s "$1" 2>/dev/null || stat -f%z "$1"; }
before=$(size_of "$IN")

if command -v magick >/dev/null 2>&1; then
  magick "$IN" -resize "${MAX}x${MAX}>" -quality "$Q" -define webp:method=6 "$OUT"
elif command -v convert >/dev/null 2>&1; then
  convert "$IN" -resize "${MAX}x${MAX}>" -quality "$Q" -define webp:method=6 "$OUT"
elif command -v cwebp >/dev/null 2>&1; then
  # cwebp nie skaluje — najpierw ewentualny resize przez sips/brak; robimy prostą konwersję
  cwebp -q "$Q" -m 6 -resize "$MAX" 0 "$IN" -o "$OUT" >/dev/null 2>&1 \
    || cwebp -q "$Q" -m 6 "$IN" -o "$OUT" >/dev/null 2>&1
else
  echo "Brak magick/convert/cwebp — zainstaluj ImageMagick lub webp." >&2
  exit 2
fi

after=$(size_of "$OUT")
printf '%s -> %s  (%s KB -> %s KB, -%d%%)\n' \
  "$IN" "$OUT" \
  "$(( before/1024 ))" "$(( after/1024 ))" \
  "$(( 100 - (after*100/before) ))"
