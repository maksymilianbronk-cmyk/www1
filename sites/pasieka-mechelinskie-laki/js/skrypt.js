/* Pasieka Mechelińskie Łąki — zachowanie strony.
   Zero zależności: nagłówek, menu mobilne, animacje wejścia, lightbox. */
(function () {
  'use strict';

  var $ = function (s, k) { return (k || document).querySelector(s); };
  var $$ = function (s, k) { return Array.prototype.slice.call((k || document).querySelectorAll(s)); };
  var mniejRuchu = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* --- rok w stopce --- */
  var rok = $('#rok');
  if (rok) rok.textContent = new Date().getFullYear();

  /* --- nagłówek: tło po przewinięciu + pasek postępu --- */
  var naglowek = $('#naglowek');
  var postep = $('#postep');

  /* --- menu mobilne --- */
  var burger = $('.burger');
  var menu = $('#menu-mobilne');

  function zamknijMenu() {
    document.body.classList.remove('menu-otwarte');
    if (burger) burger.setAttribute('aria-expanded', 'false');
  }

  if (burger && menu) {
    burger.addEventListener('click', function () {
      var otwarte = document.body.classList.toggle('menu-otwarte');
      burger.setAttribute('aria-expanded', otwarte ? 'true' : 'false');
    });
    menu.addEventListener('click', function (e) {
      if (e.target.closest('a')) zamknijMenu();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && document.body.classList.contains('menu-otwarte')) {
        zamknijMenu();
        burger.focus();
      }
    });
  }

  /* --- animacje wejścia z siatką bezpieczeństwa ---
     Sam IntersectionObserver potrafi pominąć element przy szybkim przewinięciu,
     dlatego przy każdym scrollu domiatamy to, co zostało. */
  var czekajace = $$('[data-anim], .kaskada');
  var zamiataj = null;

  /* liczby doliczają się od zera, gdy sekcja wjedzie w kadr */
  function policz(kontener) {
    $$('.liczba b', kontener).forEach(function (b) {
      var tekst = b.textContent;
      var m = tekst.match(/\d+(?:[.,]\d+)?/);
      if (!m) return;
      var cel = parseFloat(m[0].replace(',', '.'));
      var przed = tekst.slice(0, m.index);
      var po = tekst.slice(m.index + m[0].length);
      var calkowita = Number.isInteger(cel);
      var start = null;
      function krok(t) {
        if (start === null) start = t;
        var p = Math.min(1, (t - start) / 1100);
        var wartosc = cel * (1 - Math.pow(1 - p, 3));
        b.textContent = przed + (calkowita ? Math.round(wartosc) : wartosc.toFixed(1)) + po;
        if (p < 1) requestAnimationFrame(krok);
      }
      b.textContent = przed + (calkowita ? '0' : '0.0') + po;
      requestAnimationFrame(krok);
    });
  }

  function pokaz(el) {
    if (el.classList.contains('widoczny')) return;
    el.classList.add('widoczny');
    if (!mniejRuchu && el.querySelector && el.querySelector('.liczba b')) policz(el);
    if (el.classList.contains('kaskada')) {
      var krok = parseFloat(el.getAttribute('data-krok') || '0.08');
      Array.prototype.forEach.call(el.children, function (dziecko, i) {
        dziecko.style.transitionDelay = (i * krok).toFixed(2) + 's';
      });
    }
  }

  if (mniejRuchu || !('IntersectionObserver' in window)) {
    czekajace.forEach(pokaz);
    czekajace = [];
  } else {
    var io = new IntersectionObserver(function (wpisy) {
      wpisy.forEach(function (w) {
        if (w.isIntersecting) { pokaz(w.target); io.unobserve(w.target); }
      });
    }, { threshold: 0, rootMargin: '0px 0px -6% 0px' });
    czekajace.forEach(function (el) { io.observe(el); });

    zamiataj = function () {
      if (!czekajace.length) return;
      var wys = window.innerHeight;
      czekajace = czekajace.filter(function (el) {
        var r = el.getBoundingClientRect();
        if (r.top < wys * 0.94 && r.bottom > -1) { pokaz(el); io.unobserve(el); return false; }
        if (r.bottom <= 0) { pokaz(el); io.unobserve(el); return false; }
        return true;
      });
    };
  }

  /* --- jedna obsługa przewijania na wszystko --- */
  var tyka = false;
  function naScroll() {
    if (tyka) return;
    tyka = true;
    requestAnimationFrame(function () {
      var y = window.scrollY || document.documentElement.scrollTop;
      if (naglowek) naglowek.classList.toggle('przyklejony', y > 40);
      if (postep) {
        var maks = document.documentElement.scrollHeight - window.innerHeight;
        postep.style.width = (maks > 0 ? Math.min(100, (y / maks) * 100) : 0) + '%';
      }
      if (zamiataj) zamiataj();
      tyka = false;
    });
  }
  window.addEventListener('scroll', naScroll, { passive: true });
  window.addEventListener('resize', naScroll, { passive: true });
  naScroll();

  /* --- lightbox galerii --- */
  var lb = $('#lightbox');
  if (lb) {
    var lbImg = $('img', lb);
    var zdjecia = $$('.galeria button');
    var idx = 0;
    var poprzedniFokus = null;

    function pokazZdjecie(i) {
      if (!zdjecia.length) return;
      idx = (i + zdjecia.length) % zdjecia.length;
      var zrodlo = $('img', zdjecia[idx]);
      lbImg.src = zrodlo.currentSrc || zrodlo.src;
      lbImg.alt = zrodlo.alt;
    }
    function otworz(i) {
      poprzedniFokus = document.activeElement;
      pokazZdjecie(i);
      lb.classList.add('otwarty');
      document.body.style.overflow = 'hidden';
      $('.lb-zamknij', lb).focus();
    }
    function zamknij() {
      lb.classList.remove('otwarty');
      document.body.style.overflow = '';
      if (poprzedniFokus) poprzedniFokus.focus();
    }

    zdjecia.forEach(function (b, i) { b.addEventListener('click', function () { otworz(i); }); });
    $('.lb-zamknij', lb).addEventListener('click', zamknij);
    $('.lb-poprz', lb).addEventListener('click', function () { pokazZdjecie(idx - 1); });
    $('.lb-nast', lb).addEventListener('click', function () { pokazZdjecie(idx + 1); });
    lb.addEventListener('click', function (e) { if (e.target === lb) zamknij(); });
    document.addEventListener('keydown', function (e) {
      if (!lb.classList.contains('otwarty')) return;
      if (e.key === 'Escape') zamknij();
      if (e.key === 'ArrowRight') pokazZdjecie(idx + 1);
      if (e.key === 'ArrowLeft') pokazZdjecie(idx - 1);
    });
  }
})();
