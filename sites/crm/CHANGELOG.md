# Historia zmian — LeadFlow CRM

## v1.1.0 (2026-07-20)

- 📬 **Powiadomienia e-mail** o nowym leadzie — do agencji (globalnie)
  i do klienta (per klient), z konfigurowalnym adresem nadawcy.
- 📈 **Wykres leadów** z ostatnich 14 dni w panelu admina i klienta.
- 🛡 **Blokada brute-force** — 8 nieudanych logowań z IP = 15 min przerwy.
- 🍯 **Honeypot antyspamowy** w webhooku (`_gotcha`, `_honey`, `_honeypot`).
- ♻️ **Deduplikacja zgłoszeń www** — identyczny lead w ciągu 60 s nie dubluje się.
- 🔌 **Box „dla webmastera”** w panelu klienta z jego adresem webhooka.
- 🩺 **Diagnostyka serwera** w ustawieniach (PHP, SQLite, curl, mail, HTTPS, zapis).
- 🔒 `.htaccess` w katalogu głównym: blokada listowania i plików wewnętrznych.
- 🌐 Wykrywanie HTTPS za proxy/CDN (`X-Forwarded-Proto`).
- 🧰 Zgodność eksportu CSV z PHP 8.4 (jawny parametr escape).

## v1.0.0 (2026-07-20)

- Pierwsze wydanie: uniwersalny webhook leadów (www + Make/Zapier),
  bezpośredni webhook Meta Lead Ads z pobieraniem danych z Graph API,
  panel super admina, panele klientów, statusy, notatki, filtry,
  eksport CSV, kreator pierwszego uruchomienia.
