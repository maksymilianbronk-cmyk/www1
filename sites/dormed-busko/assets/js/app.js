/* ============================================================
   DORMED MEDICAL SPA — interakcje i animacje przewijania
   Bez zależności zewnętrznych. Szanuje prefers-reduced-motion.
   ============================================================ */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ---------- 1. Rok w stopce ---------- */
  $$('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });

  /* ---------- 2. Nagłówek: przyklejanie + pasek postępu ---------- */
  var header = $('.header');
  var progress = $('.progress');
  var actionBar = $('.action-bar');
  var lastY = 0;
  var ticking = false;
  var sweepReveal = null;   // przypisywane w sekcji 4

  function onScroll() {
    var y = window.scrollY || window.pageYOffset;
    if (header) header.classList.toggle('is-stuck', y > 40);
    if (progress) {
      var h = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.transform = 'scaleX(' + (h > 0 ? Math.min(y / h, 1) : 0) + ')';
    }
    if (actionBar) actionBar.classList.toggle('is-on', y > 320);

    // parallax
    if (!reduced) {
      $$('[data-parallax]').forEach(function (el) {
        var speed = parseFloat(el.getAttribute('data-parallax')) || 0.15;
        var r = el.getBoundingClientRect();
        if (r.bottom < -200 || r.top > window.innerHeight + 200) return;
        var offset = (r.top + r.height / 2 - window.innerHeight / 2) * speed;
        el.style.transform = 'translate3d(0,' + offset.toFixed(1) + 'px,0)';
      });
    }
    if (sweepReveal) sweepReveal();

    lastY = y;
    ticking = false;
  }
  function requestScroll() {
    if (!ticking) { ticking = true; window.requestAnimationFrame(onScroll); }
  }
  window.addEventListener('scroll', requestScroll, { passive: true });
  window.addEventListener('resize', requestScroll, { passive: true });
  onScroll();

  /* ---------- 3. Menu mobilne ---------- */
  var burger = $('.burger');
  var mobileNav = $('.mobile-nav');
  function closeNav() {
    document.body.classList.remove('nav-open');
    document.body.style.overflow = '';
    if (burger) burger.setAttribute('aria-expanded', 'false');
  }
  if (burger && mobileNav) {
    burger.addEventListener('click', function () {
      var open = document.body.classList.toggle('nav-open');
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      document.body.style.overflow = open ? 'hidden' : '';
      if (open) {
        $$('.mnav__link', mobileNav).forEach(function (a, i) {
          a.style.animationDelay = (0.05 + i * 0.045).toFixed(2) + 's';
        });
      }
    });
    $$('a', mobileNav).forEach(function (a) { a.addEventListener('click', closeNav); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && document.body.classList.contains('nav-open')) closeNav();
    });
  }

  /* ---------- 4. Animacje wejścia ---------- */
  var pending = $$('[data-reveal], .stagger');

  function reveal(el) {
    if (el.classList.contains('is-in')) return;
    var delay = parseFloat(el.getAttribute('data-delay') || '0');
    if (delay) el.style.transitionDelay = delay + 's';
    el.classList.add('is-in');
    if (el.classList.contains('stagger')) {
      var step = parseFloat(el.getAttribute('data-step') || '0.09');
      Array.prototype.forEach.call(el.children, function (child, i) {
        child.style.transitionDelay = (delay + i * step).toFixed(2) + 's';
      });
    }
  }

  if (reduced || !('IntersectionObserver' in window)) {
    pending.forEach(reveal);
    pending = [];
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { reveal(entry.target); io.unobserve(entry.target); }
      });
    }, { threshold: 0, rootMargin: '0px 0px -8% 0px' });
    pending.forEach(function (el) { io.observe(el); });

    /* Siatka bezpieczeństwa: przy bardzo szybkim przewijaniu obserwator
       potrafi pominąć element — sprawdzamy pozycję przy każdym przewinięciu,
       żeby żadna sekcja nie została na stałe niewidoczna. */
    sweepReveal = function () {
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

  /* ---------- 5. Liczniki ---------- */
  var counters = $$('.counter[data-to]');
  if (counters.length) {
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        var to = parseFloat(el.getAttribute('data-to'));
        var dec = (el.getAttribute('data-dec') | 0);
        if (reduced) { el.textContent = to.toFixed(dec).replace('.', ','); cio.unobserve(el); return; }
        var start = null, dur = 1500;
        function tick(ts) {
          if (start === null) start = ts;
          var p = Math.min((ts - start) / dur, 1);
          var eased = 1 - Math.pow(1 - p, 3);
          el.textContent = (to * eased).toFixed(dec).replace('.', ',');
          if (p < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
        cio.unobserve(el);
      });
    }, { threshold: 0.5 });
    counters.forEach(function (el) { cio.observe(el); });
  }

  /* ---------- 6. Zdjęcia: awaria = elegancki wzór zamiast pustki ---------- */
  $$('.img-slot img, .hero__media img').forEach(function (img) {
    function fail() { img.setAttribute('data-failed', '1'); }
    if (img.complete && img.naturalWidth === 0) fail();
    img.addEventListener('error', fail);
  });

  /* ---------- 8. Aktywna pozycja menu ---------- */
  var here = location.pathname.split('/').pop() || 'index.html';
  $$('.nav__link, .mnav__link').forEach(function (a) {
    var href = (a.getAttribute('href') || '').split('#')[0];
    if (href && href === here) a.setAttribute('aria-current', 'page');
  });

  /* ---------- 9. Formularz kontaktowy (mailto — bez backendu) ---------- */
  var form = $('#kontakt-form');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var d = new FormData(form);
      var lines = [
        'Imię i nazwisko: ' + (d.get('imie') || ''),
        'Telefon: ' + (d.get('telefon') || ''),
        'E-mail: ' + (d.get('email') || ''),
        'Temat: ' + (d.get('temat') || ''),
        'Termin: ' + (d.get('termin') || '—'),
        '',
        'Wiadomość:',
        (d.get('wiadomosc') || '')
      ];
      var subject = 'Zapytanie ze strony — ' + (d.get('temat') || 'Dormed Medical SPA');
      window.location.href = 'mailto:dormedbusko@gmail.com'
        + '?subject=' + encodeURIComponent(subject)
        + '&body=' + encodeURIComponent(lines.join('\n'));
      var note = $('.form__sent', form);
      if (note) note.hidden = false;
    });
  }

  /* ---------- 10. Filtr cennika ---------- */
  var filter = $('#cennik-filtr');
  if (filter) {
    var rows = $$('.price-row');
    var groups = $$('.price-group');
    filter.addEventListener('input', function () {
      var q = filter.value.trim().toLowerCase();
      rows.forEach(function (row) {
        var text = row.textContent.toLowerCase();
        row.style.display = (!q || text.indexOf(q) > -1) ? '' : 'none';
      });
      groups.forEach(function (g) {
        var any = $$('.price-row', g).some(function (r) { return r.style.display !== 'none'; });
        g.style.display = any ? '' : 'none';
      });
      var empty = $('#cennik-pusto');
      if (empty) empty.hidden = groups.some(function (g) { return g.style.display !== 'none'; });
    });
  }

  /* ---------- 11. Metamorfozy: suwak PRZED / PO ---------- */
  $$('.ba').forEach(function (ba) {
    var range = $('.ba__range', ba);
    if (!range) return;

    function set(pct) {
      pct = Math.max(0, Math.min(100, pct));
      ba.style.setProperty('--pos', pct + '%');
      range.value = pct;
      range.setAttribute('aria-valuenow', Math.round(pct));
    }
    range.addEventListener('input', function () { set(parseFloat(range.value)); });

    function fromPointer(e) {
      var r = ba.getBoundingClientRect();
      set(((e.clientX - r.left) / r.width) * 100);
    }
    ba.addEventListener('pointerdown', function (e) {
      if (e.target === range) return;
      ba.setPointerCapture(e.pointerId); fromPointer(e);
    });
    ba.addEventListener('pointermove', function (e) {
      if (e.buttons === 1 && ba.hasPointerCapture && ba.hasPointerCapture(e.pointerId)) fromPointer(e);
    });

    set(parseFloat(range.value || 50));

    // jednorazowa podpowiedź, że suwak da się przeciągnąć
    if (!reduced && 'IntersectionObserver' in window) {
      var peek = new IntersectionObserver(function (en) {
        en.forEach(function (x) {
          if (!x.isIntersecting) return;
          ba.classList.add('is-peek');
          setTimeout(function () { ba.classList.remove('is-peek'); }, 2700);
          peek.unobserve(ba);
        });
      }, { threshold: 0.45 });
      peek.observe(ba);
    }
  });

  /* ---------- 12. Lightbox galerii ---------- */
  var zoomables = $$('[data-zoom]');
  if (zoomables.length) {
    var box = document.createElement('div');
    box.className = 'lightbox';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-label', 'Powiększone zdjęcie');
    box.innerHTML =
      '<button class="lightbox__btn lightbox__close" type="button" aria-label="Zamknij">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">' +
        '<path d="M6 6l12 12M18 6 6 18"/></svg></button>' +
      '<button class="lightbox__btn lightbox__prev" type="button" aria-label="Poprzednie">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
        '<path d="M4 12h15m-6-6 6 6-6 6"/></svg></button>' +
      '<button class="lightbox__btn lightbox__next" type="button" aria-label="Następne">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
        '<path d="M4 12h15m-6-6 6 6-6 6"/></svg></button>' +
      '<figure style="margin:0"><img alt="Powiększone zdjęcie"><figcaption class="lightbox__cap"></figcaption></figure>';
    document.body.appendChild(box);

    var lbImg = $('img', box), lbCap = $('.lightbox__cap', box), idx = 0, opener = null;

    function show(i) {
      idx = (i + zoomables.length) % zoomables.length;
      var src = zoomables[idx].getAttribute('data-zoom');
      var cap = zoomables[idx].getAttribute('data-caption') || '';
      lbImg.src = src; lbImg.alt = cap; lbCap.textContent = cap;
    }
    function open(i, from) {
      opener = from || null;
      show(i);
      box.classList.add('is-open');
      document.body.style.overflow = 'hidden';
      $('.lightbox__close', box).focus();
    }
    function close() {
      box.classList.remove('is-open');
      document.body.style.overflow = '';
      if (opener) opener.focus();
    }
    zoomables.forEach(function (el, i) {
      el.addEventListener('click', function (e) { e.preventDefault(); open(i, el); });
    });
    $('.lightbox__close', box).addEventListener('click', close);
    $('.lightbox__prev', box).addEventListener('click', function () { show(idx - 1); });
    $('.lightbox__next', box).addEventListener('click', function () { show(idx + 1); });
    box.addEventListener('click', function (e) { if (e.target === box) close(); });
    document.addEventListener('keydown', function (e) {
      if (!box.classList.contains('is-open')) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight') show(idx + 1);
      if (e.key === 'ArrowLeft') show(idx - 1);
    });
  }

  /* ---------- 13. Płynne przewijanie do kotwic ---------- */
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a) return;
    var id = a.getAttribute('href');
    if (id.length < 2) return;
    var target = document.getElementById(id.slice(1));
    if (!target) return;
    e.preventDefault();
    closeNav();
    target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
    target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  });
})();
