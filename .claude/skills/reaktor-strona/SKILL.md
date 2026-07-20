---
name: reaktor-strona
description: Błyskawicznie buduje kompletną, animowaną stronę www na silniku REAKTOR FX (ultra-lekkim, bez zależności). Użyj, gdy użytkownik prosi o „stronę na silniku Reaktor", „animowaną stronę", „stronę z efektami" lub podobnie. Tworzy sites/<slug>/ z index.html podpiętym pod assets/reaktor/reaktor-fx.js i rejestruje kartę w assets/js/sites.js.
---

# Budowa strony na silniku REAKTOR FX

## Krok 1 — struktura

1. Utwórz `sites/<slug>/index.html` (strona w pełni samodzielna, własny CSS inline lub w pliku).
2. Podepnij silnik efektów względną ścieżką:
   ```html
   <script src="../../assets/reaktor/reaktor-fx.js" defer></script>
   ```
3. Dodaj wpis do `SITES` w `assets/js/sites.js` (slug, title, desc, icon, tag,
   preview: true, meta z kolorami/fontami/tech zawierającym "REAKTOR FX").

## Krok 2 — efekty przez atrybuty (zero JS do pisania)

| Atrybut | Efekt |
|---|---|
| `data-rv` | wjazd przy scrollu (fade + translate); warianty `data-rv="left/right/zoom"` |
| `data-rv-delay="150"` | opóźnienie ms — kolejne karty z 0/100/200/300 dają efekt kaskady |
| `data-parallax="0.25"` | parallax (ozdobniki tła, obrazy hero) |
| `data-counter="2500" data-counter-suffix="+"` | licznik nabijający się po pojawieniu |
| `data-typing` | nagłówek pisany jak na maszynie |
| `data-tilt` | karta z delikatnym 3D za kursorem |
| `<a data-smooth href="#oferta">` | płynne przewijanie do sekcji |

Silnik sam szanuje `prefers-reduced-motion` — nie dubluj tej logiki.

## Krok 3 — szkielet sekcji (sprawdzony układ landing page)

hero (data-typing nagłówek + data-parallax ozdobnik) → pasek liczników
(data-counter ×3-4) → oferta jako karty (data-rv + rosnące data-rv-delay +
data-tilt) → galeria/portfolio (data-rv="zoom") → opinie → CTA/kontakt
(formularz może POST-ować na webhook LeadFlow CRM: `sites/crm/webhook.php?token=…`).

## Zasady jakości

- Zero bibliotek zewnętrznych; fonty Google przez `<link>` tylko gdy potrzebne.
- Obrazy z Unsplash/Pexels z parametrami rozmiaru (`?w=1200&q=70`).
- Mobile-first; menu hamburger przy < 720 px.
- Lighthouse-friendly: `defer` na skryptach, `loading="lazy"` na obrazach poniżej folda.
- Formularz kontaktowy podpinaj pod CRM kolekcji (webhook + honeypot `_gotcha`).
