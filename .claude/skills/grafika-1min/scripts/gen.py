#!/usr/bin/env python3
"""
Generator grafik przez API 1min.ai (tekst -> obraz).

BEZPIECZEŃSTWO
  - Klucz API czytany WYŁĄCZNIE ze zmiennej środowiskowej ONEMIN_API_KEY.
  - Nigdy nie zapisuj klucza w plikach repo ani na stronie (repo bywa publiczne).
  - Odpowiedź zawiera `temporaryUrl` (podpisany, WYGASAJĄCY link S3) — obraz trzeba
    pobrać i zapisać lokalnie, nie linkować do S3.

WYMAGANIA SIECIOWE
  - Środowisko musi dopuszczać ruch do api.1min.ai oraz *.amazonaws.com (pobranie
    wyniku). W restrykcyjnej polityce egress wywołanie zwróci 403 (CONNECT).

UŻYCIE
  export ONEMIN_API_KEY="twój-klucz"
  python3 gen.py --model flux-schnell --prompt "opis" --out img/foto.png
  python3 gen.py --model stable-image --prompt "opis" --aspect 16:9 --out img/a.png
  python3 gen.py --list-models
  python3 gen.py --model flux-schnell --prompt "opis" --dry-run   # bez sieci

Wyjście: zapisany plik obrazu + JSON {plik, model, prompt} na stdout.
"""
import argparse
import json
import os
import sys
import time
import urllib.error
import urllib.request

API_URL = "https://api.1min.ai/api/features"

# ---------------------------------------------------------------------------
# Rejestr modeli. `key` = wartość pola "model" w API.
# `prefix` = przedrostek pól w promptObject (wg konwencji docs, np.
#            stable_image_core_aspect_ratio). Gdy None — pola bez przedrostka.
# `credits` = orientacyjny koszt (kredyty 1min.ai) — ZWERYFIKUJ w panelu, ceny się zmieniają.
# `tier` = tani / średni / premium.  `best_for` = do czego.
# ---------------------------------------------------------------------------
MODELS = {
    "flux-schnell": {
        "prefix": None, "credits": 9000, "tier": "tani",
        "best_for": "szybkie, tanie, dobra jakość — DOMYŚLNY wybór jakość/cena",
        "aspects": ["1:1", "16:9", "9:16", "3:2", "2:3"],
    },
    "stable-image": {  # Stable Image Core
        "prefix": "stable_image_core", "credits": 12000, "tier": "tani",
        "best_for": "fotorealizm, sceny, dobra kontrola (negativePrompt, style_preset)",
        "aspects": ["1:1", "16:9", "9:16", "3:2", "2:3", "21:9", "4:5"],
        "presets": ["photographic", "cinematic", "digital-art", "anime",
                     "3d-model", "neon-punk", "fantasy-art"],
    },
    "sdxl": {  # Stable Diffusion XL
        "prefix": "sdxl", "credits": 8000, "tier": "tani",
        "best_for": "najtaniej, open-source, ogólne zastosowania",
        "aspects": ["1:1", "16:9", "9:16"],
    },
    "leonardo-kino-xl": {
        "prefix": "leonardo_kino_xl", "credits": 16000, "tier": "średni",
        "best_for": "kinowe, cinematic, spójny styl",
        "aspects": ["1:1", "16:9", "9:16", "3:2"],
    },
    "dall-e-3": {
        "prefix": "dalle3", "credits": 40000, "tier": "premium",
        "best_for": "tekst w obrazie, łatwe prompty, bezpieczne treści",
        "aspects": ["1:1", "16:9", "9:16"],
    },
    "midjourney": {
        "prefix": "midjourney", "credits": 45000, "tier": "premium",
        "best_for": "najwyższa jakość artystyczna, estetyka",
        "aspects": ["1:1", "16:9", "9:16", "2:3", "3:2"],
    },
    "gemini-3-pro-image-preview": {
        "prefix": "gemini_3_pro_image", "credits": 30000, "tier": "premium",
        "best_for": "trzymanie się promptu, tekst, edycja/warianty",
        "aspects": ["1:1", "16:9", "9:16"],
    },
}

DEFAULT_MODEL = "flux-schnell"


def build_prompt_object(model, prompt, aspect, negative, seed, preset, fmt):
    """Buduje promptObject wg konwencji przedrostków 1min.ai."""
    info = MODELS[model]
    prefix = info["prefix"]
    po = {"prompt": prompt}

    def put(field, value):
        if value is None:
            return
        po[f"{prefix}_{field}" if prefix else field] = value

    put("aspect_ratio", aspect)
    put("output_format", fmt)
    if negative is not None:
        # różne modele: negativePrompt lub <prefix>_negative_prompt
        if prefix:
            po[f"{prefix}_negative_prompt"] = negative
        else:
            po["negativePrompt"] = negative
    put("seed", seed)
    if preset is not None:
        put("style_preset", preset)
    return po


def build_request(model, prompt, aspect, negative, seed, preset, fmt):
    return {
        "type": "IMAGE_GENERATOR",
        "model": model,
        "promptObject": build_prompt_object(
            model, prompt, aspect, negative, seed, preset, fmt),
    }


def extract_image_url(data):
    """Wyciąga temporaryUrl z odpowiedzi (obsługa kilku wariantów kształtu)."""
    rec = data.get("aiRecord", data) if isinstance(data, dict) else {}
    url = rec.get("temporaryUrl") or data.get("temporaryUrl")
    if isinstance(url, list):
        url = url[0] if url else None
    return url


def post_json(url, body, headers, timeout=180):
    req = urllib.request.Request(
        url, data=json.dumps(body).encode(), headers=headers, method="POST")
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.load(r)


def generate(api_key, req_body, retries=3):
    headers = {"API-KEY": api_key, "Content-Type": "application/json"}
    last = None
    for attempt in range(retries):
        try:
            data = post_json(API_URL, req_body, headers)
            url = extract_image_url(data)
            if url:
                return url
            last = RuntimeError("Brak temporaryUrl: " + json.dumps(data)[:400])
        except urllib.error.HTTPError as e:
            body = e.read().decode(errors="replace")[:400]
            last = RuntimeError(f"HTTP {e.code}: {body}")
            if e.code in (401, 403):  # klucz/uprawnienia/egress — nie ponawiaj
                break
        except urllib.error.URLError as e:
            reason = str(e.reason)
            last = RuntimeError(f"Sieć: {reason} (host dopuszczony w egress?)")
            if "403" in reason or "Forbidden" in reason:  # odmowa polityki — nie ponawiaj
                break
        time.sleep(2 ** attempt)
    raise last


def download(url, path, timeout=180):
    os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
    with urllib.request.urlopen(url, timeout=timeout) as r, open(path, "wb") as f:
        f.write(r.read())


def main():
    ap = argparse.ArgumentParser(description="Generator grafik 1min.ai")
    ap.add_argument("--model", default=DEFAULT_MODEL)
    ap.add_argument("--prompt")
    ap.add_argument("--out", default="out.png")
    ap.add_argument("--aspect", default="16:9")
    ap.add_argument("--negative", default=None)
    ap.add_argument("--seed", type=int, default=None)
    ap.add_argument("--preset", default=None)
    ap.add_argument("--format", dest="fmt", default="png")
    ap.add_argument("--dry-run", action="store_true",
                    help="Zbuduj i wypisz request bez wywołania sieci")
    ap.add_argument("--list-models", action="store_true")
    args = ap.parse_args()

    if args.list_models:
        print(f"{'MODEL':<28}{'TIER':<9}{'~KREDYTY':<10}BEST FOR")
        for k, v in MODELS.items():
            mark = "  ← domyślny" if k == DEFAULT_MODEL else ""
            print(f"{k:<28}{v['tier']:<9}{v['credits']:<10}{v['best_for']}{mark}")
        return

    if not args.prompt:
        sys.exit("Podaj --prompt (albo --list-models).")
    if args.model not in MODELS:
        sys.exit(f"Nieznany model '{args.model}'. Zobacz --list-models.")

    req_body = build_request(args.model, args.prompt, args.aspect,
                             args.negative, args.seed, args.preset, args.fmt)

    if args.dry_run:
        print(json.dumps(req_body, indent=2, ensure_ascii=False))
        return

    api_key = os.environ.get("ONEMIN_API_KEY")
    if not api_key:
        sys.exit("Ustaw ONEMIN_API_KEY (export ONEMIN_API_KEY=...).")

    url = generate(api_key, req_body)
    download(url, args.out)
    print(json.dumps({"file": args.out, "model": args.model,
                      "prompt": args.prompt}, ensure_ascii=False))


if __name__ == "__main__":
    main()
