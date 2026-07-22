#!/usr/bin/env python3
"""
Generator zdjęć AI przez API 1min.ai (model dyfuzyjny, tekst→obraz).

BEZPIECZEŃSTWO: klucz API NIE jest zapisany w tym pliku. Czytany jest ze
zmiennej środowiskowej ONEMIN_API_KEY, więc plik można bezpiecznie commitować.

Wymaga środowiska, którego polityka sieciowa dopuszcza api.1min.ai oraz S3
(*.amazonaws.com) do pobrania wyniku.

Użycie:
    export ONEMIN_API_KEY="twój-klucz"
    python3 gen_ai_1min.py

Zapisuje obrazy do img/ai_*.png i wypisuje mapę plik→prompt.
"""
import json
import os
import sys
import urllib.request

API_URL = "https://api.1min.ai/api/features"
OUT = "img"

# (nazwa_pliku, prompt) — do podmiany na własne opisy
PROMPTS = [
    ("ai_cabin",   "a cozy wooden mountain cabin at golden sunset, warm light, photorealistic"),
    ("ai_city",    "a futuristic city skyline at night, neon reflections, cinematic, ultra detailed"),
    ("ai_forest",  "a misty pine forest at dawn, volumetric light rays, photorealistic landscape"),
]

MODEL = "stable-image"  # inne: 'gemini-3-pro-image-preview', 'leonardo-kino-xl', 'flux-2-klein-9b', ...


def generate(prompt):
    body = {
        "type": "IMAGE_GENERATOR",
        "model": MODEL,
        "promptObject": {
            "prompt": prompt,
            "stable_image_core_aspect_ratio": "16:9",
            "stable_image_core_output_format": "png",
        },
    }
    req = urllib.request.Request(
        API_URL,
        data=json.dumps(body).encode(),
        headers={"API-KEY": API_KEY, "Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=180) as r:
        data = json.load(r)
    # temporaryUrl = podpisany link S3 do gotowego obrazu
    rec = data.get("aiRecord", data)
    url = rec.get("temporaryUrl") or data.get("temporaryUrl")
    if isinstance(url, list):
        url = url[0]
    if not url:
        raise RuntimeError("Brak temporaryUrl w odpowiedzi: " + json.dumps(data)[:400])
    return url


def download(url, path):
    with urllib.request.urlopen(url, timeout=180) as r, open(path, "wb") as f:
        f.write(r.read())


if __name__ == "__main__":
    API_KEY = os.environ.get("ONEMIN_API_KEY")
    if not API_KEY:
        sys.exit("Ustaw ONEMIN_API_KEY (export ONEMIN_API_KEY=...)")
    os.makedirs(OUT, exist_ok=True)
    mapping = {}
    for name, prompt in PROMPTS:
        print(f"→ generuję: {name}: {prompt}")
        url = generate(prompt)
        path = f"{OUT}/{name}.png"
        download(url, path)
        mapping[f"{name}.png"] = prompt
        print(f"  zapisano {path}")
    print("\nMapa plik→prompt:")
    print(json.dumps(mapping, indent=2, ensure_ascii=False))
