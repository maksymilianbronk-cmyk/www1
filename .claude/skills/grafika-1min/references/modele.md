# Modele obrazów 1min.ai — wybór, jakość, koszt

> Kredyty są **orientacyjne** (zmieniają się) — zweryfikuj bieżące ceny w panelu
> 1min.ai. Plany: od ~$5–10/mies. w modelu kredytowym. Generowanie obrazu to
> zwykle **kilka–kilkadziesiąt tys. kredytów**; 4 mln kredytów ≈ ~1000–1200 obrazów
> (średnio). Wideo/obrazy „premium" zjadają najwięcej.

## Szybki wybór

| Cel | Model | Dlaczego |
|-----|-------|----------|
| **Najlepszy stosunek jakość/cena (domyślny)** | `flux-schnell` | szybki, tani (~$0.003/obraz u źródła), dobra jakość i trzymanie promptu |
| **Najtaniej** | `sdxl` / `stable-image` | open-source, groszowe koszty, pełna kontrola (negative prompt, presety) |
| **Fotorealizm z kontrolą** | `stable-image` (Stable Image Core) | aspect ratio, `style_preset`, `negativePrompt`, seed |
| **Kinowy look** | `leonardo-kino-xl` | spójny, filmowy styl |
| **Tekst w obrazie / łatwe prompty** | `dall-e-3`, `gemini-3-pro-image-preview` | dobre renderowanie napisów, bezpieczne treści |
| **Najwyższa estetyka artystyczna** | `midjourney` | topowa jakość wizualna, ale najdrożej |

## Tabela modeli

| model (pole API) | tier | ~kredyty/obraz | best for |
|------------------|------|----------------|----------|
| `flux-schnell` | tani | ~9 000 | domyślny — szybko, tanio, dobrze |
| `sdxl` | tani | ~8 000 | najtaniej, ogólne |
| `stable-image` | tani | ~12 000 | fotorealizm, kontrola |
| `leonardo-kino-xl` | średni | ~16 000 | cinematic |
| `gemini-3-pro-image-preview` | premium | ~30 000 | prompt-adherence, tekst |
| `dall-e-3` | premium | ~40 000 | tekst w obrazie |
| `midjourney` | premium | ~45 000 | najwyższa estetyka |

Pełną, aktualną listę modeli daje też skrypt: `python3 scripts/gen.py --list-models`.

## Jak robić to DOBRZE — promptowanie

1. **Struktura promptu:** *podmiot + cechy + otoczenie + światło + styl + jakość*.
   Np. „a wooden mountain cabin, snow on roof, pine forest, golden hour backlight,
   cinematic, photorealistic, high detail".
2. **Styl na końcu:** `photorealistic`, `cinematic`, `3d render`, `watercolor`,
   `flat vector`, `isometric`. Dla `stable-image` użyj `--preset`.
3. **Negative prompt** (gdy model wspiera): odcina wady —
   `--negative "blurry, low quality, distorted, extra fingers, watermark, text"`.
4. **Aspect ratio** dobierz do użycia: `16:9` hero/tło, `1:1` miniatura/awatar,
   `9:16` mobile/story, `3:2`/`4:5` karty.
5. **Seed** (`--seed`) = powtarzalność i warianty tej samej kompozycji.
6. **Iteruj tanio:** dobierz kompozycję na `flux-schnell`/`sdxl`, a finał (jeśli
   trzeba) dogeneruj na droższym modelu tym samym promptem.
7. **Tekst w grafice:** modele dyfuzyjne słabo renderują napisy — literki wpisuj
   raczej w HTML/CSS nad obrazem, a nie w prompt (albo użyj `dall-e-3`/Gemini).

## Jak robić to NAJTANIEJ

- Domyślnie generuj na `flux-schnell` lub `sdxl`.
- Nie generuj w kółko tego samego — ustaw `--seed` i dopracowuj prompt.
- Rób jeden obraz w potrzebnej rozdzielczości/aspekcie zamiast serii „na próbę".
- Premium (`midjourney`, `dall-e-3`) tylko na finalny, kluczowy kadr.

## Format odpowiedzi API (do czego dąży skrypt)

```
POST https://api.1min.ai/api/features
Nagłówki: API-KEY: <klucz>,  Content-Type: application/json
Body:     {"type":"IMAGE_GENERATOR","model":"<model>","promptObject":{...}}

Odpowiedź:
  aiRecord.status                       -> "SUCCESS"
  aiRecord.aiRecordDetail.resultObject  -> ["development/images/...png"]
  aiRecord.temporaryUrl                 -> podpisany, WYGASAJĄCY link S3 (pobrać!)
```

Pola w `promptObject` mają przedrostek modelu, np. `stable_image_core_aspect_ratio`,
`stable_image_core_style_preset`, `stable_image_core_negative_prompt`. Skrypt składa
je automatycznie na podstawie rejestru `MODELS`.
