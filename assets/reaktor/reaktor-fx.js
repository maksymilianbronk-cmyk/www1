/**
 * REAKTOR FX — ultra-lekki silnik efektów stron www (~2 KB gzip, zero zależności).
 * Część rodziny REAKTOR („React bez Node'a”). Sterowanie atrybutami danych:
 *
 *   data-rv            wjazd przy scrollu (fade+translate); warianty: data-rv="left|right|up|zoom"
 *   data-rv-delay="200"   opóźnienie w ms (stagger robisz rosnącymi wartościami)
 *   data-parallax="0.3"   tło/element przesuwa się z ułamkiem prędkości scrolla
 *   data-counter="1500"   liczba nabija się od 0 po pojawieniu (data-counter-suffix="+")
 *   data-tilt             delikatny 3D tilt za kursorem
 *   data-typing           efekt maszyny do pisania (tekst z elementu)
 *   data-smooth           <a data-smooth href="#sekcja"> płynny scroll
 *
 * Użycie: <script src="reaktor-fx.js" defer></script> — silnik startuje sam.
 * Szanuje prefers-reduced-motion (wyłącza animacje, zostawia treść widoczną).
 */
(() => {
  'use strict';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const css = document.createElement('style');
  css.textContent = `
    [data-rv]{opacity:0;transform:translateY(26px);transition:opacity .7s cubic-bezier(.16,1,.3,1),transform .7s cubic-bezier(.16,1,.3,1)}
    [data-rv="left"]{transform:translateX(-34px)}
    [data-rv="right"]{transform:translateX(34px)}
    [data-rv="zoom"]{transform:scale(.92)}
    [data-rv].rv-in{opacity:1;transform:none}
    [data-tilt]{transition:transform .18s ease-out;will-change:transform}
    ${reduced ? '[data-rv]{opacity:1!important;transform:none!important}' : ''}`;
  document.head.appendChild(css);

  const onReady = fn => document.readyState !== 'loading' ? fn() : addEventListener('DOMContentLoaded', fn);

  onReady(() => {
    /* reveal + counters — jeden IntersectionObserver */
    const io = new IntersectionObserver(entries => {
      for (const en of entries) {
        if (!en.isIntersecting) continue;
        const el = en.target;
        io.unobserve(el);
        const delay = +el.dataset.rvDelay || 0;
        setTimeout(() => {
          el.classList.add('rv-in');
          if (el.dataset.counter !== undefined) runCounter(el);
          if (el.dataset.typing !== undefined) runTyping(el);
        }, reduced ? 0 : delay);
      }
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

    document.querySelectorAll('[data-rv],[data-counter],[data-typing]').forEach(el => io.observe(el));

    function runCounter(el) {
      const to = parseFloat(el.dataset.counter) || 0;
      const suffix = el.dataset.counterSuffix || '';
      const dur = reduced ? 0 : (+el.dataset.counterMs || 1400);
      const t0 = performance.now();
      const fmt = new Intl.NumberFormat('pl-PL');
      const tick = t => {
        const p = dur ? Math.min(1, (t - t0) / dur) : 1;
        el.textContent = fmt.format(Math.round(to * (1 - Math.pow(1 - p, 3)))) + suffix;
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }

    function runTyping(el) {
      const text = el.textContent;
      if (reduced) return;
      el.textContent = '';
      el.style.minHeight = '1em';
      let i = 0;
      const step = () => {
        el.textContent = text.slice(0, ++i);
        if (i < text.length) setTimeout(step, 26 + Math.random() * 40);
      };
      step();
    }

    /* parallax — rAF-throttled, pasywny scroll */
    const par = [...document.querySelectorAll('[data-parallax]')];
    if (par.length && !reduced) {
      let raf = 0;
      const apply = () => {
        raf = 0;
        for (const el of par) {
          const f = parseFloat(el.dataset.parallax) || 0.3;
          const r = el.getBoundingClientRect();
          el.style.transform = `translateY(${((r.top + r.height / 2 - innerHeight / 2) * -f).toFixed(1)}px)`;
        }
      };
      addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(apply); }, { passive: true });
      apply();
    }

    /* tilt 3D */
    if (!reduced) document.querySelectorAll('[data-tilt]').forEach(el => {
      el.addEventListener('mousemove', e => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform = `perspective(700px) rotateX(${(-y * 7).toFixed(2)}deg) rotateY(${(x * 9).toFixed(2)}deg)`;
      });
      el.addEventListener('mouseleave', () => { el.style.transform = ''; });
    });

    /* płynne kotwice */
    document.querySelectorAll('a[data-smooth][href^="#"]').forEach(a =>
      a.addEventListener('click', e => {
        const t = document.querySelector(a.getAttribute('href'));
        if (t) { e.preventDefault(); t.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' }); }
      }));
  });
})();
