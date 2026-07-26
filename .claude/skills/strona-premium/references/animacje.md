# Animacje i efekty — gotowe bloki

Wszystkie efekty domknięte blokiem `prefers-reduced-motion` na końcu pliku.

## 1. Animacje wejścia z siatką bezpieczeństwa

**To jest najważniejszy fragment tego dokumentu.** Sam IntersectionObserver
nie wystarcza: przy szybkim „flicku" na telefonie potrafi pominąć element,
który wtedy zostaje niewidoczny **na zawsze**. Sweep przy każdym przewinięciu
gwarantuje, że nic nie zniknie.

```css
[data-reveal] {
  opacity: 0; transform: translate3d(0, 22px, 0);
  transition: opacity .7s var(--ease), transform .8s var(--ease);
  will-change: opacity, transform;
}
[data-reveal].is-in { opacity: 1; transform: none; }
.stagger > * { opacity: 0; transform: translate3d(0, 20px, 0);
               transition: opacity .6s var(--ease), transform .7s var(--ease); }
.stagger.is-in > * { opacity: 1; transform: none; }

/* animacje poziome powodują przewijanie w bok na wąskich ekranach */
@media (max-width: 980px) {
  [data-reveal="left"], [data-reveal="right"] { transform: translate3d(0, 22px, 0); }
}
```

```js
var pending = $$('[data-reveal], .stagger');
var sweepReveal = null;                 // deklaracja PRZED onScroll (tryb ścisły)

function reveal(el) {
  if (el.classList.contains('is-in')) return;
  var delay = parseFloat(el.getAttribute('data-delay') || '0');
  if (delay) el.style.transitionDelay = delay + 's';
  el.classList.add('is-in');
  if (el.classList.contains('stagger')) {
    var step = parseFloat(el.getAttribute('data-step') || '0.09');
    Array.prototype.forEach.call(el.children, function (c, i) {
      c.style.transitionDelay = (delay + i * step).toFixed(2) + 's';
    });
  }
}

if (reduced || !('IntersectionObserver' in window)) {
  pending.forEach(reveal); pending = [];
} else {
  var io = new IntersectionObserver(function (en) {
    en.forEach(function (e) { if (e.isIntersecting) { reveal(e.target); io.unobserve(e.target); } });
  }, { threshold: 0, rootMargin: '0px 0px -8% 0px' });
  pending.forEach(function (el) { io.observe(el); });

  sweepReveal = function () {                       // wołane z onScroll
    if (!pending.length) return;
    var vh = window.innerHeight;
    pending = pending.filter(function (el) {
      var r = el.getBoundingClientRect();
      if (r.top < vh * 0.92 && r.bottom > -1) { reveal(el); io.unobserve(el); return false; }
      if (r.bottom <= 0) { reveal(el); io.unobserve(el); return false; }
      return true;
    });
  };
  sweepReveal();
}
```

`threshold: 0` (nie `0.12`) — inaczej wysokie elementy nigdy nie osiągają progu.

## 2. Linia EKG rysująca się

`pathLength="100"` normalizuje długość ścieżki — dzięki temu
`stroke-dasharray: 100` działa bez mierzenia w JS. Element dostaje `data-reveal`,
więc korzysta z tego samego mechanizmu co reszta animacji wejścia.

```html
<svg class="ecg" viewBox="0 0 900 54" preserveAspectRatio="none" data-reveal aria-hidden="true">
  <path pathLength="100" d="M0 27 H118 l9 -3 8 6 7 -18 9 40 8 -25 8 6 H210 …"/>
  <circle cx="866" cy="27" r="4"/>
</svg>
```

```css
.ecg { display: block; width: 100%; height: 54px; overflow: visible; }
.ecg path {
  fill: none; stroke: var(--brand); stroke-width: 1.8;
  stroke-linecap: round; stroke-linejoin: round;
  stroke-dasharray: 100; stroke-dashoffset: 100;
}
.ecg.is-in path { animation: ecgDraw 2.6s var(--ease-soft) forwards; }
@keyframes ecgDraw { to { stroke-dashoffset: 0; } }
```

Rytm ścieżki: odcinek płaski → mały garb (P) → ostry pik w górę (R) →
zejście w dół (S) → powrót. Powtórz 5–6 razy na 900 px.

## 3. Aurora w sekcjach w kolorze marki

**Uwaga na pułapkę:** `inset: -20% -10%` wychodzi 10% poza sekcję i powoduje
przewijanie w bok. Albo `inset: -20% 0`, albo `overflow: hidden` na sekcji.

```css
.bg-brand { position: relative; overflow: hidden; }
.bg-brand::before {
  content: ""; position: absolute; inset: -20% 0; z-index: 0; pointer-events: none;
  background:
    radial-gradient(38% 46% at 22% 28%, rgba(201,161,91,.16), transparent 68%),
    radial-gradient(34% 40% at 78% 72%, rgba(201,161,91,.10), transparent 66%);
  animation: aurora 22s var(--ease-soft) infinite alternate;
}
.bg-brand > * { position: relative; z-index: 2; }
@keyframes aurora {
  0%   { transform: translate3d(0,0,0) scale(1); }
  50%  { transform: translate3d(2%, -2%, 0) scale(1.06); }
  100% { transform: translate3d(-2%, 2%, 0) scale(1.02); }
}
```

## 4. Kręgi na wodzie (balneologia, SPA)

```html
<div class="ripple" aria-hidden="true"><span></span><span></span><span></span></div>
```

```css
.ripple { position: absolute; inset: auto 0 0 0; height: 160px; z-index: 0;
          pointer-events: none; opacity: .5; }
.ripple span {
  position: absolute; left: 50%; bottom: -70px;
  width: 260px; height: 260px; margin-left: -130px;
  border: 1px solid currentColor; border-radius: 50%;
  opacity: 0; animation: rippleOut 7s linear infinite;
}
.ripple span:nth-child(2) { animation-delay: 2.3s; }
.ripple span:nth-child(3) { animation-delay: 4.6s; }
@keyframes rippleOut {
  0%   { transform: scale(.35); opacity: .45; }
  100% { transform: scale(2.4); opacity: 0; }
}
```

## 5. Pulsujące kręgi (motyw tętna)

```css
.pulse-ring { position: relative; display: inline-grid; place-items: center; }
.pulse-ring::before, .pulse-ring::after {
  content: ""; position: absolute; inset: 0; border-radius: 50%;
  border: 1px solid var(--brand); opacity: 0;
}
.pulse-ring::before { animation: ringOut 3.2s var(--ease-soft) infinite; }
.pulse-ring::after  { animation: ringOut 3.2s var(--ease-soft) 1.6s infinite; }
@keyframes ringOut {
  0%  { transform: scale(1);   opacity: .5; }
  70% { transform: scale(1.9); opacity: 0; }
  100%{ transform: scale(1.9); opacity: 0; }
}
```

## 6. Połysk przy najechaniu

```css
.shine { position: relative; overflow: hidden; }
.shine::after {
  content: ""; position: absolute; top: -60%; left: -80%;
  width: 45%; height: 220%; z-index: 3; pointer-events: none;
  background: linear-gradient(100deg, transparent, rgba(255,255,255,.42), transparent);
  transform: rotate(14deg); opacity: 0;
}
.shine:hover::after { animation: shineSweep 1.1s var(--ease-soft) forwards; }
@keyframes shineSweep {
  0%  { left: -80%; opacity: 0; }
  15% { opacity: 1; }
  100%{ left: 130%; opacity: 0; }
}
```

## 7. Suwak PRZED / PO

`@property --pos` pozwala animować własność procentową — bez tego
podpowiedź „mrugnięcia" suwaka nie zadziała.

```css
@property --pos { syntax: "<percentage>"; inherits: false; initial-value: 50%; }
.ba { position: relative; overflow: hidden; --pos: 50%; aspect-ratio: var(--ba-ratio, 3/2);
      cursor: ew-resize; touch-action: pan-y; isolation: isolate; }
.ba__img   { width: 100%; height: 100%; object-fit: cover; object-position: var(--ba-pos, center); }
.ba__after { position: absolute; inset: 0; clip-path: inset(0 0 0 var(--pos)); will-change: clip-path; }
.ba__line  { position: absolute; top: 0; bottom: 0; left: var(--pos); width: 2px; margin-left: -1px; }
.ba__grip  { position: absolute; top: 50%; left: var(--pos); transform: translate(-50%,-50%); }
.ba__range { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0;
             -webkit-appearance: none; appearance: none; background: transparent; }
.ba__range::-webkit-slider-thumb { -webkit-appearance: none; width: 52px; height: 100%; }
@keyframes baPeek { 0%,100% { --pos: 50%; } 35% { --pos: 34%; } 70% { --pos: 62%; } }
.ba.is-peek { animation: baPeek 2.4s var(--ease) 1; }
```

Obsługa: `pointerdown` + `setPointerCapture` na kontenerze, `input` na
`<input type="range">` (klawiatura i czytniki ekranu), jednorazowe
`is-peek` przy pierwszym wejściu w kadr — użytkownik musi wiedzieć,
że da się chwycić.

**Dwie rzeczy, bez których suwak jest zepsuty:**

```js
var touched = false;
function stopPeek() { touched = true; ba.classList.remove('is-peek'); }

// 1. Animacja podpowiedzi steruje --pos, więc dopóki trwa, nadpisuje KAŻDĄ
//    pozycję ustawioną przez użytkownika. Pierwsze dotknięcie ją przerywa.
// 2. Pozycję liczymy sami, nie z natywnego range: jego uchwyt ma 52 px,
//    więc wartość mapuje się na tor pomniejszony o uchwyt i linia podziału
//    rozjeżdża się z kursorem przy krawędziach.
ba.addEventListener('pointerdown', function (e) {
  stopPeek();
  ba.setPointerCapture(e.pointerId);
  fromPointer(e);
  e.preventDefault();                       // bez natywnego przeciągania
  if (document.activeElement !== range) range.focus({ preventScroll: true });
});
range.addEventListener('input', function () { stopPeek(); set(parseFloat(range.value)); });
// obserwator podpowiedzi:
if (touched) { peek.unobserve(ba); return; }
```

Test regresyjny: przeciągnij **250 ms po wejściu suwaka w kadr** (czyli
w trakcie podpowiedzi) i sprawdź, czy `--pos` odpowiada pozycji kursora.
Przeciągnięcie po zakończeniu animacji działa nawet w zepsutej wersji —
dlatego ten błąd łatwo przeoczyć.

## 8. Ikony dwutonowe — ożywienie

```css
svg .i-fill { fill: currentColor; opacity: .16; transform-origin: 12px 12px;
              transition: opacity .45s var(--ease), transform .5s var(--ease); }
svg .i-line { fill: none; stroke: currentColor; stroke-width: 1.5;
              stroke-linecap: round; stroke-linejoin: round;
              transition: stroke-width .35s var(--ease); }
.card:hover .card__icon svg .i-fill { opacity: .3; transform: scale(1.1); }
.card:hover .card__icon svg .i-line { stroke-width: 1.7; }
```

## 9. Blok zamykający — obowiązkowy

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: .001ms !important; animation-iteration-count: 1 !important;
    transition-duration: .001ms !important; scroll-behavior: auto !important;
  }
  [data-reveal], .stagger > * { opacity: 1 !important; transform: none !important; }
  .ecg path { stroke-dashoffset: 0 !important; }
}
```
