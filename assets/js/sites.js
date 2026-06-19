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
    slug: "masaz",
    title: "Sensum — Gabinet Masażu",
    desc: "Luksusowy dark-wellness landing dla gabinetu masażu. Oddychające hero, mosaikowa galeria, booking.",
    icon: "🌿",
    tag: "landing",
    preview: true,
    meta: {
      colors: ["#0b0a08", "#141210", "#c08040", "#f0ece4", "#b5a090"],
      fonts: ["Fraunces", "Outfit"],
      tech: ["HTML", "CSS", "Vanilla JS", "Google Fonts", "Unsplash"],
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
      colors: ["#09080c", "#0e0d11", "#c8a870", "#f2ede4", "#c9a4a0"],
      fonts: ["Bodoni Moda", "DM Sans", "Playfair Display SC"],
      tech: ["HTML", "CSS", "Vanilla JS", "Google Fonts", "Unsplash"],
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
];
