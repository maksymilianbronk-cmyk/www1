---
name: grafika-1min
description: Generuje grafiki AI (tekst→obraz) przez API 1min.ai i wstawia je na strony w kolekcji. Użyj, gdy użytkownik prosi o "wygeneruj zdjęcie/grafikę AI", "obrazek na stronę", "grafika przez 1min.ai", "dodaj zdjęcie AI" itp. Wybiera model (jakość/cena), buduje prompt, generuje, pobiera i zapisuje obraz jako plik, dba o bezpieczeństwo klucza (ONEMIN_API_KEY z env, nigdy w repo).
---

# Grafika 1min.ai

Generowanie grafik AI przez API 1min.ai i osadzanie ich na stronach kolekcji.

## Kiedy uruchamiać

Prośby typu: „wygeneruj zdjęcie/grafikę AI", „zrób obrazek na stronę",
„grafika przez 1min.ai", „dodaj zdjęcie AI do sekcji hero", „potrzebuję tła".

## Zasady bezpieczeństwa (KRYTYCZNE)

1. **Klucz TYLKO ze zmiennej `ONEMIN_API_KEY`.** Nigdy nie wpisuj klucza do
   plików repo, HTML, JS ani do commita — to repo bywa publiczne.
2. **Nie generuj client-side** (klucz w przeglądarce = publiczny). Zawsze
   generuj serwerowo (w sesji), pobierz obraz, zapisz jako **statyczny plik**.
3. **`temporaryUrl` z API wygasa** — nie linkuj do S3 na stronie; pobierz i
   zapisz plik lokalnie (skrypt robi to sam).
4. Jeśli klucz pojawił się w czacie, zasugeruj jego **rotację** w panelu 1min.ai.

## Wymagania sieciowe (SPRAWDŹ NAJPIERW)

API `api.1min.ai` musi być dopuszczone przez politykę egress środowiska
(oraz `*.amazonaws.com` do pobrania wyniku). Szybki test:

```bash
curl -sS "$HTTPS_PROXY/__agentproxy/status"   # szukaj connect_rejected dla api.1min.ai
```

Jeśli host jest blokowany (403 CONNECT), generowanie się nie uda — patrz
sekcja „Gdy egress blokuje". Nie obchodź polityki proxy.

## Kroki

1. **Ustal parametry** z prośby użytkownika:
   - model — domyślnie `flux-schnell` (najlepszy jakość/cena); patrz
     `references/modele.md` po tabelę wyboru i koszty.
   - prompt — zbuduj wg zasad promptowania (`references/modele.md`).
   - aspect — `16:9` (hero/tło), `1:1` (miniatura), `9:16` (mobile), itd.
   - opcjonalnie: `--negative`, `--preset` (dla `stable-image`), `--seed`.

2. **Podgląd requestu bez sieci** (zawsze warto):
   ```bash
   python3 scripts/gen.py --model flux-schnell --prompt "..." --aspect 16:9 --dry-run
   ```

3. **Generuj** (wymaga `ONEMIN_API_KEY` i dopuszczonego egress):
   ```bash
   export ONEMIN_API_KEY="…"
   python3 scripts/gen.py --model flux-schnell \
     --prompt "a cozy wooden cabin at golden sunset, photorealistic" \
     --aspect 16:9 --out sites/<slug>/img/hero.png
   ```
   Wynik: zapisany plik + JSON `{file, model, prompt}` na stdout.

4. **Iteruj tanio:** dobierz kompozycję na `flux-schnell`/`sdxl` z ustalonym
   `--seed`, dopracuj prompt; premium (`midjourney`, `dall-e-3`) tylko na finał.

5. **Osadź na stronie:** wstaw `<img src="img/…">` w `sites/<slug>/index.html`.
   Nową stronę rejestruj wg skilla `nowa-strona` (wpis w `assets/js/sites.js`).

6. **Commit** obrazów i kodu. **Nigdy** nie commituj klucza.

## Narzędzia

- `scripts/gen.py` — generator. Flagi: `--model`, `--prompt`, `--out`,
  `--aspect`, `--negative`, `--preset`, `--seed`, `--format`,
  `--dry-run` (bez sieci), `--list-models`.
- `references/modele.md` — modele, koszty, wybór, promptowanie, format API.

## Gdy egress blokuje `api.1min.ai`

To środowisko (domyślne „anthropic_cloud") blokuje ten host — nie da się tego
zmienić z wnętrza sesji. Trzeba środowiska z polityką sieci dopuszczającą
`api.1min.ai` i `*.amazonaws.com`:

1. W panelu **Claude Code on the web** utwórz/edytuj środowisko i ustaw politykę
   sieci na dopuszczającą te hosty (allowlist / szerszy dostęp).
   Dokumentacja: https://code.claude.com/docs/en/claude-code-on-the-web
2. Uruchom sesję w tym środowisku i ustaw sekret `ONEMIN_API_KEY`
   (zmienna środowiskowa / sekret środowiska — nie w repo).
3. Wróć do „Kroki" powyżej.

Alternatywa bez klucza i bez tych wymagań: darmowe generowanie przez
Pollinations client-side (`https://image.pollinations.ai/prompt/<opis>`) —
niższa kontrola i jakość, ale zero konfiguracji (użyte na stronie
`sites/strona-testowa-zdjecia`).
