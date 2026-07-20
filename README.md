# Kolekcja stron www

Zbiór samodzielnych stron i aplikacji webowych. Strona główna repo (`index.html`)
to galeria/katalog wszystkich projektów, a każdy projekt mieszka w osobnym
folderze `sites/<nazwa>/`.

## 🔗 Wygodne linki — otwórz w przeglądarce

### Trasa — mapy podróżnicze 🧭

Aplikacja mapowa (86 warstw, profile map, porównywanie, POI) — działa od razu,
bez żadnej konfiguracji:

**▶ [Uruchom aplikację Trasa](https://raw.githack.com/maksymilianbronk-cmyk/www1/claude/travel-maps-app-goud9f/sites/podroze-mapy/index.html)**

- [Analiza źródeł map (ANALIZA.md)](sites/podroze-mapy/ANALIZA.md)
- [Kod aplikacji](sites/podroze-mapy/)

### Galeria wszystkich stron

**▶ [Otwórz galerię kolekcji](https://raw.githack.com/maksymilianbronk-cmyk/www1/claude/travel-maps-app-goud9f/index.html)**

> Linki `raw.githack.com` serwują pliki prosto z tej gałęzi repo — zawsze
> aktualna wersja po każdym pushu, idealne do podglądu i testów na telefonie.

## 🌍 Stały adres przez GitHub Pages (zalecane na co dzień)

Aby mieć krótki, stały link (i pełne PWA — instalację na telefonie, service
worker wymaga https na własnej domenie):

1. Wejdź w **Settings → Pages** tego repozytorium.
2. W sekcji *Build and deployment* wybierz **Deploy from a branch**.
3. Wskaż gałąź z aktualną kolekcją (np. domyślną) i folder `/ (root)`, zapisz.

Po ~1 minucie strony będą dostępne pod:

| Co | Link |
|---|---|
| Galeria kolekcji | `https://maksymilianbronk-cmyk.github.io/www1/` |
| Aplikacja Trasa | `https://maksymilianbronk-cmyk.github.io/www1/sites/podroze-mapy/` |

## Struktura repo

```
www1/
├── index.html          # galeria/katalog kolekcji
├── assets/js/sites.js  # lista stron (edytuj tu!)
└── sites/<slug>/       # każda strona w osobnym folderze
```

Szczegóły dodawania nowych stron: [CLAUDE.md](CLAUDE.md).
