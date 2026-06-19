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

## Zasady

- Każda strona jest **w pełni samodzielna** — własny HTML/CSS/JS.
- Zasoby wspólne dla wielu stron można umieścić w `assets/`.
- Strona główna (`index.html`) służy tylko jako katalog — nie modyfikuj jej logiki poza `sites.js`.
