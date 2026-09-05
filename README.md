# Kolekcja stron www

Zbiór samodzielnych stron i aplikacji webowych. Strona główna repo (`index.html`)
to galeria/katalog wszystkich projektów, a każdy projekt mieszka w osobnym
folderze `sites/<nazwa>/`.

## 🌍 Strona publiczna (GitHub Pages)

Kolekcja jest opublikowana publicznie — wdrożenie uruchamia się automatycznie
po każdym pushu na gałąź domyślną (workflow `.github/workflows/pages.yml`):

| Co | Link |
|---|---|
| **Galeria kolekcji** | **https://maksymilianbronk-cmyk.github.io/www1/** |
| **Aplikacja Trasa — mapy podróżnicze** 🧭 | **https://maksymilianbronk-cmyk.github.io/www1/sites/podroze-mapy/** |
| **Dormed Medical SPA — Busko-Zdrój** 🌿 | **https://maksymilianbronk-cmyk.github.io/www1/sites/dormed-busko/** |
| **CLAMAX Automation — oprogramowanie maszyn i PLC** 🏭 | **https://maksymilianbronk-cmyk.github.io/www1/sites/automatyka-plc/** |
| **Pasieka Mechelińskie Łąki — miód znad Zatoki Puckiej** 🍯 | **https://maksymilianbronk-cmyk.github.io/www1/sites/pasieka-mechelinskie-laki/** |
| **Poradnik S7-1200 CPU 1211C** 🎛️ | **https://maksymilianbronk-cmyk.github.io/www1/sites/s7-1200-poradnik/** |
| **Skill `uslugi-plc` + podręcznik (ZIP do pobrania)** 📦 | **https://maksymilianbronk-cmyk.github.io/www1/pliki/skill-uslugi-plc.zip** |
| **Podręcznik programowania maszyn (MD)** 📖 | **https://maksymilianbronk-cmyk.github.io/www1/docs/podrecznik-programowania-maszyn.md** |

Adres działa przez https, więc aplikacja Trasa ma pełne PWA: GPS, service
worker i instalację na telefonie („Dodaj do ekranu głównego").

- [Analiza źródeł map (ANALIZA.md)](sites/podroze-mapy/ANALIZA.md)
- [Kod aplikacji Trasa](sites/podroze-mapy/)

## 🔗 Podgląd gałęzi roboczej (bez wdrożenia)

Najnowszy stan gałęzi `claude/travel-maps-app-goud9f` przed publikacją:

- [Aplikacja Trasa (githack)](https://raw.githack.com/maksymilianbronk-cmyk/www1/claude/travel-maps-app-goud9f/sites/podroze-mapy/index.html)
- [Galeria (githack)](https://raw.githack.com/maksymilianbronk-cmyk/www1/claude/travel-maps-app-goud9f/index.html)

## Struktura repo

```
www1/
├── index.html          # galeria/katalog kolekcji
├── assets/js/sites.js  # lista stron (edytuj tu!)
└── sites/<slug>/       # każda strona w osobnym folderze
```

Szczegóły dodawania nowych stron: [CLAUDE.md](CLAUDE.md).
