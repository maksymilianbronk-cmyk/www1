/**
 * Lista stron w kolekcji.
 * Aby dodać nową stronę:
 *   1. Utwórz folder sites/<slug>/index.html
 *   2. Dodaj wpis poniżej.
 *
 * Pola:
 *   slug    — nazwa folderu w sites/
 *   title   — tytuł karty
 *   desc    — krótki opis
 *   icon    — emoji jako miniatura (gdy brak podglądu iframe)
 *   tag     — etykieta kategorii (np. "landing", "gra", "narzędzie")
 *   preview — true = wyświetl podgląd iframe (domyślnie false)
 *   meta    — obiekt: { colors[], fonts[], tech[] }
 */
const SITES = [
  {
    slug: "hello-world",
    title: "Hello World",
    desc: "Pierwsza strona w kolekcji — szablon startowy.",
    icon: "👋",
    tag: "przykład",
    preview: true,
    meta: {
      colors: ["#0f0f13", "#6c63ff", "#e8e8f0", "#8888a0"],
      fonts: ["system-ui"],
      tech: ["HTML", "CSS"],
    },
  },
  {
    slug: "katalog",
    title: "Katalog stron — CRM",
    desc: "Panel z logowaniem: foldery stron, manager plików i baza promotorów.",
    icon: "🗂️",
    tag: "crm",
    preview: true,
    meta: {
      colors: ["#0f0f13", "#1a1a22", "#6c63ff", "#42d392", "#ff5c6c"],
      fonts: ["system-ui", "monospace"],
      tech: ["HTML", "CSS", "Vanilla JS", "localStorage"],
    },
  },
  {
    slug: "prompty",
    title: "Biblioteka promptów",
    desc: "Gotowe prompty do tworzenia stron: nowe projekty, redesign, branże i własna baza wiedzy.",
    icon: "💡",
    tag: "narzędzie",
    preview: true,
    meta: {
      colors: ["#0f0f13", "#1a1a22", "#6c63ff", "#ff6b9d", "#f5a623"],
      fonts: ["system-ui", "monospace"],
      tech: ["HTML", "CSS", "Vanilla JS", "localStorage"],
    },
  },
  {
    slug: "scenariusze",
    title: "Scenariusze pracy",
    desc: "Krok po kroku: jak zlecić redesign lub nową stronę — z gotowymi promptami i integracją CRM.",
    icon: "🗺️",
    tag: "przewodnik",
    preview: true,
    meta: {
      colors: ["#0f0f13", "#1a1a22", "#6c63ff", "#ff6584", "#43d9b8"],
      fonts: ["system-ui", "monospace"],
      tech: ["HTML", "CSS", "Vanilla JS"],
    },
  },
  {
    slug: "fryzjerka",
    title: "Salon Fryzjerski — Landing",
    desc: "Ultra-nowoczesny dark-editorial landing dla salonu fryzjerskiego. Animacje, galeria, rezerwacja.",
    icon: "✂️",
    tag: "landing",
    preview: true,
    meta: {
      colors: ["#080706", "#100f0c", "#c9a96e", "#f0ebe0", "#6e6a60"],
      fonts: ["Cormorant Garamond", "Inter", "Playfair Display SC"],
      tech: ["HTML", "CSS", "Vanilla JS", "Google Fonts", "Unsplash"],
    },
  },
];
