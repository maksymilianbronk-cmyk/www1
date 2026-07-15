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
    slug: "hotel-court",
    title: "Hotel Court*** Wellness & SPA — Kędzierzyn-Koźle",
    desc: "Wielostronicowy serwis premium dla Hotelu Court (redesign court.pl): złoto-biel-pastele, 10 podstron — pokoje, rezerwacje, restauracja d'Oro, SPA d'Oro, korty, uroczystości, aktualności, blog, kontakt. Prawdziwe logo, dane z wizytówki Google, Booksy i Booking.",
    icon: "🏨",
    tag: "hotel",
    preview: true,
    meta: {
      colors: ["#fbf8f2", "#f4eee1", "#b08a47", "#f0e1da", "#2e2a23"],
      fonts: ["Cormorant Garamond", "Jost", "Pinyon Script"],
      tech: ["HTML", "CSS", "Vanilla JS", "Google Fonts", "Unsplash"],
    },
  },
  {
    slug: "kwadrans",
    title: "Kwadrans — Obiady Domowe, Pabianice",
    desc: "Wielostronicowy serwis premium dla baru Kwadrans (Pabianice): editorial design, prawdziwe zdjęcia i dane z wizytówki Google, demo rezerwacji stolika/imprez.",
    icon: "🍲",
    tag: "landing",
    preview: true,
    meta: {
      colors: ["#f7f4ea", "#14503a", "#6da544", "#c9a24b", "#1c2a22"],
      fonts: ["Fraunces", "Manrope", "Yellowtail"],
      tech: ["HTML", "CSS", "Vanilla JS", "Google Fonts", "Unsplash"],
    },
  },
  {
    slug: "szablony-github",
    title: "Szablony z GitHuba — 50 branż",
    desc: "Katalog 250 lekkich szablonów stron PL: 50 popularnych branż × 5 skinów. Wyszukiwarka, podglądy, gotowe do podmiany treści.",
    icon: "🗃️",
    tag: "katalog",
    preview: true,
    meta: {
      colors: ["#0d0d12", "#15151d", "#7c6cff", "#ff6b9d", "#43d9b8"],
      fonts: ["Space Grotesk", "Inter"],
      tech: ["HTML", "CSS", "Vanilla JS", "Google Fonts", "Unsplash"],
    },
  },
  {
    slug: "barbershop",
    title: "Sztuka Zarostu — Barbershop Rumia",
    desc: "Strona barbershopu Sztuka Zarostu (Rumia). Dane firmy z profilu Facebook: kontakt, godziny, adres. Ciemny vintage landing z rezerwacją.",
    icon: "🪒",
    tag: "landing",
    preview: true,
    meta: {
      colors: ["#110f0c", "#17140f", "#c79a4b", "#a9302c", "#f3ece0"],
      fonts: ["Bebas Neue", "Barlow", "Sacramento"],
      tech: ["HTML", "CSS", "Vanilla JS", "Google Fonts", "Unsplash"],
    },
  },
  {
    slug: "ortopeda",
    title: "Ortopeda — Dr Wiśniewski",
    desc: "Ultra-lekki light-mode landing dla ortopedy. Animowany SVG kręgosłupa, split hero, statystyki, rezerwacja.",
    icon: "🦴",
    tag: "klinika",
    preview: true,
    meta: {
      colors: ["#f7f6f3", "#ffffff", "#0b6659", "#161618", "#78787e"],
      fonts: ["Cormorant Garamond", "DM Sans"],
      tech: ["HTML", "CSS", "SVG", "Vanilla JS", "Google Fonts", "Unsplash"],
    },
  },
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
    slug: "luksus-i-fryz",
    title: "Luksus i Fryz — Salon Asi, Rumia",
    desc: "Butikowy salon fryzjerski Asi z Rumi: noir + szampańskie złoto, animowane pasma włosów na canvasie, katalog 8 fryzur (ilustracje SVG do podmiany na zdjęcia), rytuał all inclusive, rezerwacja demo. Font Italiana osadzony w pliku — zero zależności sieciowych.",
    icon: "💇‍♀️",
    tag: "landing",
    preview: true,
    meta: {
      colors: ["#140d13", "#221521", "#d8b072", "#e3a4b5", "#f7f0e6"],
      fonts: ["Italiana (embedded)", "Segoe UI / system-ui"],
      tech: ["HTML", "CSS", "SVG", "Canvas", "Vanilla JS"],
    },
  },
  {
    slug: "scraper-facebook",
    title: "Inteligentny Scraper Facebooka",
    desc: "Narzędzie do pobierania najważniejszych danych i zdjęć ze stron (fanpage) na Facebooku przez oficjalne Graph API: opis, kategoria, kontakt, adres, godziny otwarcia, galeria zdjęć z zapisem na dysk i eksportem do JSON. Tryb demo bez tokenu. Wszystko po stronie przeglądarki.",
    icon: "📘",
    tag: "narzędzie",
    preview: true,
    meta: {
      colors: ["#0b0d14", "#151827", "#1877f2", "#3b82f6", "#e8eaf3"],
      fonts: ["Segoe UI", "system-ui"],
      tech: ["HTML", "CSS", "Vanilla JS", "Facebook Graph API"],
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
