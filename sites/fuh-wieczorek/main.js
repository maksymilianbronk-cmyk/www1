/* F.U.H. WIECZOREK — wspólna logika serwisu */
(function () {
  "use strict";

  /* ---------- sprite ikon SVG (rysowane, stroke) ---------- */
  var SPRITE =
    '<svg xmlns="http://www.w3.org/2000/svg" style="display:none" aria-hidden="true">' +
    /* chip / procesor */
    '<symbol id="i-chip" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="6" width="12" height="12" rx="2"/><rect x="9.5" y="9.5" width="5" height="5" rx="1"/><path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3"/></symbol>' +
    /* laptop */
    '<symbol id="i-laptop" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="5" width="16" height="10" rx="1.5"/><path d="M2 18h20l-1.5-2.5h-17z"/></symbol>' +
    /* recykling */
    '<symbol id="i-recycle" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 19H4.7a1.5 1.5 0 0 1-1.3-2.25l2-3.46"/><path d="M11 19H7l2-3.5"/><path d="M14.6 6.5l-1.9-3.2a1.5 1.5 0 0 0-2.6 0L8.2 6.6"/><path d="M12.6 3.5L14.5 7l-4 .2"/><path d="M17.4 9.2l2.2 3.8a1.5 1.5 0 0 1-1.3 2.25H16"/><path d="M19.5 13l-3.9.3 1.9 3.5"/></symbol>' +
    /* waga */
    '<symbol id="i-scale" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v18M4 21h16"/><path d="M12 5l-6 2m6-2l6 2"/><path d="M3.5 13a2.8 2.8 0 0 0 5 0L6 7.2 3.5 13zM15.5 13a2.8 2.8 0 0 0 5 0L18 7.2 15.5 13z"/></symbol>' +
    /* banknot */
    '<symbol id="i-cash" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="6.5" width="19" height="11" rx="2"/><circle cx="12" cy="12" r="2.6"/><path d="M6 10v.01M18 14v.01"/></symbol>' +
    /* telefon */
    '<symbol id="i-phone" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 4.5A2 2 0 0 1 7 3h1.4a1 1 0 0 1 1 .76l.8 3.2a1 1 0 0 1-.4 1.06l-1.6 1.15a13.5 13.5 0 0 0 6.6 6.6l1.16-1.6a1 1 0 0 1 1.06-.4l3.2.8a1 1 0 0 1 .76 1V17a2 2 0 0 1-2 2h-1C10.6 19 5 13.4 5 6.5v-2z"/></symbol>' +
    /* mail */
    '<symbol id="i-mail" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3.5 7l8.5 6 8.5-6"/></symbol>' +
    /* pinezka */
    '<symbol id="i-pin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s7-6.1 7-11a7 7 0 1 0-14 0c0 4.9 7 11 7 11z"/><circle cx="12" cy="10" r="2.6"/></symbol>' +
    /* zegar */
    '<symbol id="i-clock" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></symbol>' +
    /* tarcza */
    '<symbol id="i-shield" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l7.5 3v5.5c0 4.7-3.2 7.9-7.5 9.5-4.3-1.6-7.5-4.8-7.5-9.5V6z"/><path d="M8.8 12l2.2 2.2 4.2-4.4"/></symbol>' +
    /* gwiazdka */
    '<symbol id="i-star" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.3L12 17.1l-5.7 3.1 1.2-6.3L2.8 9.5l6.4-.8z"/></symbol>' +
    /* strzałka */
    '<symbol id="i-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h16m-6-6l6 6-6 6"/></symbol>' +
    /* check kółko */
    '<symbol id="i-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9.2"/><path d="M8 12.3l2.6 2.6L16 9.6"/></symbol>' +
    /* plus (FAQ) */
    '<symbol id="i-plus" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></symbol>' +
    /* klucz / serwis */
    '<symbol id="i-wrench" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 6.5a4.5 4.5 0 0 0-6.1 5.2L3 17.1a2 2 0 1 0 2.8 2.8l5.4-5.4a4.5 4.5 0 0 0 5.2-6.1L13.6 11l-2.5-2.5 3.4-2z"/></symbol>' +
    /* TV */
    '<symbol id="i-tv" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6" width="18" height="12" rx="2"/><path d="M9 21h6M8.5 3l3.5 3 3.5-3"/></symbol>' +
    /* smartfon */
    '<symbol id="i-mobile" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18.5h2"/></symbol>' +
    /* pamięć / dysk */
    '<symbol id="i-drive" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="8" width="18" height="8" rx="2"/><path d="M7 12h.01M11 12h.01"/><circle cx="17" cy="12" r="1.6"/></symbol>' +
    /* kabel / wtyczka */
    '<symbol id="i-plug" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 7V3M15 7V3"/><path d="M7 7h10v4a5 5 0 0 1-10 0V7z"/><path d="M12 16v3a2 2 0 0 1-2 2H8"/></symbol>' +
    /* sofa / meble */
    '<symbol id="i-sofa" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 10V8a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v2"/><path d="M3 14a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v1h10v-1a2 2 0 0 1 4 0v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-3z"/><path d="M5 19v2M19 19v2"/></symbol>' +
    /* ciężarówka */
    '<symbol id="i-truck" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 7h12v9H2zM14 10h4l3 3v3h-7"/><circle cx="6.5" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/></symbol>' +
    /* dokument / faktura */
    '<symbol id="i-doc" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/></symbol>' +
    /* medal */
    '<symbol id="i-medal" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="9" r="5.5"/><path d="M12 6.6l.9 1.8 2 .3-1.4 1.4.3 2-1.8-1-1.8 1 .3-2-1.4-1.4 2-.3z" fill="currentColor" stroke="none"/><path d="M8.5 13.5L7 21l5-2.5L17 21l-1.5-7.5"/></symbol>' +
    /* monitor */
    '<symbol id="i-monitor" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M9 20h6M12 16v4"/></symbol>' +
    /* drukarka */
    '<symbol id="i-printer" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 8V3h10v5"/><rect x="4" y="8" width="16" height="8" rx="2"/><path d="M7 13h10v8H7z" fill="none"/><path d="M17 11h.01"/></symbol>' +
    /* konsola */
    '<symbol id="i-gamepad" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6.5 8h11a4.5 4.5 0 0 1 4.4 5.5l-.8 3.6a2.5 2.5 0 0 1-4.3 1.1L15 16H9l-1.8 2.2a2.5 2.5 0 0 1-4.3-1.1l-.8-3.6A4.5 4.5 0 0 1 6.5 8z"/><path d="M8 11v3M6.5 12.5h3M15.5 11.5h.01M17.5 13.5h.01"/></symbol>' +
    "</svg>";

  document.addEventListener("DOMContentLoaded", function () {
    /* wstrzyknij sprite */
    var holder = document.createElement("div");
    holder.innerHTML = SPRITE;
    document.body.prepend(holder.firstChild);

    /* rok w stopce */
    var y = document.getElementById("year");
    if (y) y.textContent = new Date().getFullYear();

    /* pasek postępu scrolla */
    var prog = document.createElement("div");
    prog.className = "scroll-progress";
    document.body.appendChild(prog);

    /* przycisk "do góry" */
    var toTop = document.createElement("button");
    toTop.className = "to-top";
    toTop.setAttribute("aria-label", "Przewiń do góry");
    toTop.innerHTML = '<svg><use href="#i-arrow"/></svg>';
    document.body.appendChild(toTop);
    toTop.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

    /* sticky header shadow + postęp + widoczność "do góry" */
    var header = document.querySelector(".header");
    var onScroll = function () {
      var y = window.scrollY;
      if (header) header.classList.toggle("scrolled", y > 8);
      var max = document.documentElement.scrollHeight - window.innerHeight;
      prog.style.width = (max > 0 ? (y / max) * 100 : 0) + "%";
      toTop.classList.toggle("show", y > 700);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    /* menu mobilne */
    var burger = document.querySelector(".burger");
    var nav = document.querySelector(".nav");
    if (burger && nav) {
      burger.addEventListener("click", function () {
        var open = nav.classList.toggle("open");
        burger.classList.toggle("open", open);
        burger.setAttribute("aria-expanded", open ? "true" : "false");
        document.body.style.overflow = open ? "hidden" : "";
      });
      nav.querySelectorAll("a").forEach(function (a) {
        a.addEventListener("click", function () {
          nav.classList.remove("open");
          burger.classList.remove("open");
          document.body.style.overflow = "";
        });
      });
    }

    /* reveal on scroll */
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            e.target.classList.add("visible");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    document.querySelectorAll(".reveal").forEach(function (el) { io.observe(el); });

    /* kaskadowe opóźnienia w siatkach kategorii */
    document.querySelectorAll(".cat-grid").forEach(function (grid) {
      Array.prototype.forEach.call(grid.children, function (el, i) {
        el.style.transitionDelay = (i % 5) * 70 + "ms";
      });
    });

    /* liczniki */
    var cio = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          var el = e.target;
          cio.unobserve(el);
          var target = parseFloat(el.dataset.count);
          var decimals = parseInt(el.dataset.decimals || "0", 10);
          var suffix = el.dataset.suffix || "";
          var dur = 1600;
          var t0 = null;
          var tick = function (t) {
            if (!t0) t0 = t;
            var p = Math.min((t - t0) / dur, 1);
            var eased = 1 - Math.pow(1 - p, 3);
            var val = (target * eased).toFixed(decimals);
            el.textContent = val.replace(".", ",") + suffix;
            if (p < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        });
      },
      { threshold: 0.5 }
    );
    document.querySelectorAll("[data-count]").forEach(function (el) { cio.observe(el); });

    /* FAQ */
    document.querySelectorAll(".faq-item").forEach(function (item) {
      var q = item.querySelector(".faq-q");
      var a = item.querySelector(".faq-a");
      if (!q || !a) return;
      q.addEventListener("click", function () {
        var open = item.classList.toggle("open");
        a.style.maxHeight = open ? a.scrollHeight + "px" : "0";
        q.setAttribute("aria-expanded", open ? "true" : "false");
        /* zamknij pozostałe pozycje akordeonu */
        if (open) {
          item.parentElement.querySelectorAll(".faq-item.open").forEach(function (other) {
            if (other === item) return;
            other.classList.remove("open");
            other.querySelector(".faq-a").style.maxHeight = "0";
            other.querySelector(".faq-q").setAttribute("aria-expanded", "false");
          });
        }
      });
    });

    /* formularz wyceny → mailto */
    var form = document.getElementById("lead-form");
    if (form) {
      form.addEventListener("submit", function (ev) {
        ev.preventDefault();
        var d = new FormData(form);
        var body =
          "Imię i nazwisko: " + (d.get("name") || "-") +
          "\nTelefon: " + (d.get("phone") || "-") +
          "\nE-mail: " + (d.get("email") || "-") +
          "\nTemat: " + (d.get("topic") || "-") +
          "\n\nWiadomość:\n" + (d.get("msg") || "-");
        var subject = "Zapytanie ze strony — " + (d.get("topic") || "kontakt");
        window.location.href =
          "mailto:awrecyclingi@gmail.com?subject=" + encodeURIComponent(subject) +
          "&body=" + encodeURIComponent(body);
      });
    }
  });
})();
