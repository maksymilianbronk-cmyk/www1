# Kolekcja stron www

Repozytorium przechowuje zbiór samodzielnych stron/projektów webowych.

## Struktura

```
www1/
├── index.html          # strona główna — galeria/katalog
├── assets/
│   ├── css/main.css    # style strony głównej
│   └── js/
│       ├── sites.js    # LISTA stron w kolekcji (edytuj tu!)
│       └── main.js     # logika renderowania kart
└── sites/
    └── <slug>/         # każda strona w osobnym folderze
        └── index.html
```

## Jak dodać nową stronę

> Skrót: polecenie **„nowa strona"** uruchamia skill `nowa-strona`
> (`.claude/skills/nowa-strona/`), który wykonuje poniższe kroki automatycznie.

1. Utwórz folder `sites/<slug>/` i umieść w nim `index.html` (plus dowolne zasoby).
2. Dodaj wpis do tablicy `SITES` w `assets/js/sites.js`:

```js
{
  slug: "moja-strona",   // nazwa folderu
  title: "Moja strona",  // tytuł karty
  desc: "Krótki opis.",  // wyświetlany pod tytułem
  icon: "🚀",            // emoji jako miniatura (gdy preview: false)
  tag: "landing",        // etykieta kategorii
  preview: false,        // true = podgląd iframe w karcie
}
```

## Skille pomocnicze

- **`nowa-strona`** — dodaje nową stronę do kolekcji (opis wyżej).
- **`grafika-1min`** (`.claude/skills/grafika-1min/`) — generuje grafiki AI
  (tekst→obraz) przez API 1min.ai i osadza je na stronach. Wybór modelu
  (jakość/cena), promptowanie, generator `scripts/gen.py` (klucz z env
  `ONEMIN_API_KEY`, nigdy w repo), tabela modeli i kosztów w
  `references/modele.md`. Użyj przy „wygeneruj zdjęcie/grafikę AI".
- **`allegro-aukcje`** (`.claude/skills/allegro-aukcje/`) — wyszukuje aukcje
  danego sprzedawcy Allegro (fan-out wyszukiwań web + walidacja slugów,
  fallback na wyszukiwanie w profilu) i generuje karty produktów skryptem
  `gen_prod_cards.py`. Użyj przy prośbach typu „podlinkuj aukcje z Allegro".
- **`zrodla-map`** (`.claude/skills/zrodla-map/`) — wyszukiwanie, weryfikacja
  i dodawanie źródeł map (XYZ/WMS/WMTS/ArcGIS REST) do aplikacji Trasa
  (`sites/podroze-mapy`), z rejestrem znanych endpointów i pułapek układów
  współrzędnych (`references/zrodla.md`). Użyj przy „dodaj mapę", „napraw
  warstwę", „sprawdź czy mapa działa".
- **`trasa-app`** (`.claude/skills/trasa-app/`) — playbook rozwoju aplikacji
  Trasa: architektura modułów, chmura POI na gałęzi `poi-db` (konta, token
  właściciela, panel administratora), checklista zmian (liczniki, SW, testy
  Playwright), wdrożenie na Pages i wyniesione lekcje. Użyj przy każdej pracy
  nad `sites/podroze-mapy`.

## Zasady

- Każda strona jest **w pełni samodzielna** — własny HTML/CSS/JS.
- Zasoby wspólne dla wielu stron można umieścić w `assets/`.
- Strona główna (`index.html`) służy tylko jako katalog — nie modyfikuj jej logiki poza `sites.js`.
