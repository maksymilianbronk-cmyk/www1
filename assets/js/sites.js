/**
 * Lista stron w kolekcji.
 * Aby dodać nową stronę:
 *   1. Utwórz folder sites/<slug>/index.html
 *   2. Dodaj wpis poniżej.
 *
 * Pola:
 *   slug  — nazwa folderu w sites/
 *   title — tytuł karty
 *   desc  — krótki opis
 *   icon  — emoji jako miniatura (gdy brak podglądu iframe)
 *   tag   — etykieta kategorii (np. "landing", "gra", "narzędzie")
 *   preview — true = wyświetl podgląd iframe (domyślnie false)
 */
const SITES = [
  {
    slug: "hello-world",
    title: "Hello World",
    desc: "Pierwsza strona w kolekcji — szablon startowy.",
    icon: "👋",
    tag: "przykład",
    preview: false,
  },
];
