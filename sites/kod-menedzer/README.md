# KodBox — menedżer projektów kodu

Wklejasz kod → aplikacja zapisuje go jako plik z wybranym rozszerzeniem.
Pliki są pogrupowane w projekty, można je edytować, podglądać, pobierać
(pojedynczo lub jako ZIP) i udostępniać linkiem.

## Funkcje

| Obszar | Co potrafi |
| --- | --- |
| Projekty | tworzenie, zmiana nazwy/opisu, usuwanie, wyszukiwarka, statystyki (pliki, rozmiar, wiek, liczba udostępnień) |
| Okno kodu | stałe pole na stronie projektu: wklejasz kod, klikasz „Zapisz jako plik". Rozszerzenie rozpoznawane z treści, nazwa uzupełniana automatycznie do pierwszej wolnej (bez pytań o nadpisanie); własna nazwa i rozszerzenie do wyboru |
| Okno pliku .md | drugie stałe pole: upuszczasz plik `.md`, wybierasz z dysku albo wklejasz treść — poniżej od razu lista wykrytych plików do zaznaczenia |
| Pliki | zapis wklejonego kodu z rozszerzeniem wybranym ręcznie **albo rozpoznanym automatycznie**, zmiana nazwy, duplikowanie, usuwanie, filtr, wgrywanie plików z dysku (klik lub przeciągnięcie) |
| Markdown → pliki | aplikacja wyodrębnia każdy blok ```` ``` ````, rozpoznaje język i proponuje nazwę pliku; nazwy można poprawić przed zapisem, opis można zapisać jako `README.md` |
| Edytor | numery linii, podświetlanie składni (HTML, CSS, JS, PY, JSON, MD, SQL, SH, YAML, INI), Tab jako wcięcie, `Ctrl+S`, wskaźnik niezapisanych zmian |
| Podgląd | render HTML na żywo — arkusze CSS i skrypty JS z tego samego projektu są wstawiane do podglądu automatycznie; podgląd Markdown i SVG; otwarcie w nowej karcie |
| Pobieranie | pojedynczy plik albo cały projekt jako ZIP (własny zapis archiwum, bez bibliotek) |
| Udostępnianie | tryb lokalny: samodzielny link z zaszytą i skompresowaną zawartością projektu (`share.html`); tryb serwerowy: krótki link z tokenem obsługiwany przez backend |
| Kopie | eksport wszystkich projektów do JSON i import z powrotem |

## Dwa tryby zapisu

**1. Lokalny (domyślny).** Pliki trzymane w przeglądarce (IndexedDB) — działa
z GitHub Pages i po otwarciu pliku z dysku, bez żadnego backendu.

**2. Serwerowy.** Pliki zapisywane fizycznie na dysku serwera. Backend to
Node.js (>= 18) **bez żadnych zależności** — same moduły wbudowane:

```bash
node server/server.js          # domyślnie port 5000
PORT=8080 node server/server.js
# albo: cd server && npm start
```

Otwórz `http://localhost:5000` — frontend sam wykryje backend (`/api/ping`)
i przełączy się w tryb serwerowy. Jeśli otwierasz stronę z innego adresu,
wpisz adres serwera w **Ustawieniach**.

Pliki lądują w `server/projects/<id>/`, metadane w `metadata.json`
tego katalogu, a linki do udostępniania w `server/shares.json`.

## API backendu

```
GET    /api/ping
GET    /api/projects
POST   /api/projects                              {name, description}
GET    /api/projects/<id>
PATCH  /api/projects/<id>                         {name?, description?}
DELETE /api/projects/<id>
POST   /api/projects/<id>/files                   {filename, extension?, content}
GET    /api/projects/<id>/files/<nazwa>
PUT    /api/projects/<id>/files/<nazwa>           {content}
POST   /api/projects/<id>/files/<nazwa>/rename    {new_name}
DELETE /api/projects/<id>/files/<nazwa>
GET    /api/projects/<id>/download/<nazwa>
GET    /api/projects/<id>/zip
POST   /api/projects/<id>/share                   → {share_url, token}
GET    /api/projects/<id>/shares
DELETE /api/shares/<token>
GET    /shared/<token>                            strona dla odbiorcy
GET    /api/shared/<token>/files/<nazwa>
GET    /api/shared/<token>/zip
```

Serwer sam serwuje frontend, więc nie trzeba osobnego serwera plików.
Backend waliduje identyfikatory projektów i nazwy plików (bez przechodzenia
po katalogach), ogranicza rozszerzenia do listy tekstowych i odrzuca pliki
powyżej 5 MB. Archiwum ZIP po stronie serwera jest kompresowane (deflate).

## Struktura

```
kod-menedzer/
├── index.html      # aplikacja
├── styles.css
├── lib.js          # wspólne: ZIP, kodowanie linków, Markdown → pliki, inline HTML
├── app.js          # projekty, menedżer plików, edytor, podgląd
├── share.html      # strona odbiorcy linku (tryb lokalny)
├── share.js
└── server/         # opcjonalny backend Node.js (zero zależności)
    ├── server.js
    └── package.json
```

## Uwagi

- Obsługiwane są pliki tekstowe (kod). Pliki binarne przy wgrywaniu są pomijane.
- Link udostępniania w trybie lokalnym zawiera całą treść projektu — przy dużych
  projektach adres bywa bardzo długi; wtedy pewniejszy jest ZIP albo backend.
- Podgląd HTML działa w ramce `sandbox` (bez dostępu do danych aplikacji).
