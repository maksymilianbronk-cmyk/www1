/* SIELATYCKI COFFEE — interakcje wspólne dla wszystkich podstron */
(function () {
  "use strict";

  var docEl = document.documentElement;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- kaskada zapasowych zdjęć ----------
     <img data-fallback="url2|url3"> — przy błędzie ładowania próbuje kolejnych
     adresów, a na końcu podstawia elegancki czarno-złoty placeholder SVG. */
  var PLACEHOLDER =
    "data:image/svg+xml;utf8," +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600">' +
        '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">' +
        '<stop offset="0" stop-color="#1a140c"/><stop offset="1" stop-color="#0a0806"/>' +
        "</linearGradient></defs>" +
        '<rect width="800" height="600" fill="url(#g)"/>' +
        '<g transform="translate(400 300)">' +
        '<ellipse rx="110" ry="150" fill="none" stroke="#c9a24b" stroke-width="3" opacity="0.8"/>' +
        '<path d="M0 -150 C 55 -70, -55 70, 0 150" fill="none" stroke="#c9a24b" stroke-width="3" opacity="0.8"/>' +
        "</g></svg>"
    );

  function armFallbacks(root) {
    (root || document).querySelectorAll("img[data-fallback]").forEach(function (img) {
      img.addEventListener("error", function handler() {
        var list = (img.dataset.fallback || "").split("|").filter(Boolean);
        if (list.length) {
          img.dataset.fallback = list.slice(1).join("|");
          img.src = list[0];
        } else {
          img.removeEventListener("error", handler);
          img.src = PLACEHOLDER;
        }
      });
    });
  }
  armFallbacks(document);

  /* ---------- nagłówek: tło po przewinięciu ---------- */
  var header = document.querySelector(".site-header");
  var progress = document.querySelector(".scroll-progress");

  /* ---------- hamburger + menu mobilne ---------- */
  var burger = document.querySelector(".hamburger");
  var mobileMenu = document.querySelector(".mobile-menu");
  if (burger && mobileMenu) {
    function toggleMenu(force) {
      var open = typeof force === "boolean" ? force : !mobileMenu.classList.contains("open");
      mobileMenu.classList.toggle("open", open);
      burger.classList.toggle("open", open);
      document.body.classList.toggle("menu-locked", open);
      burger.setAttribute("aria-expanded", open ? "true" : "false");
    }
    burger.addEventListener("click", function () { toggleMenu(); });
    mobileMenu.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () { toggleMenu(false); });
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") toggleMenu(false);
    });
  }

  /* ---------- reveal on scroll ---------- */
  var revealObserver = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
  );
  document.querySelectorAll(".reveal").forEach(function (el) {
    revealObserver.observe(el);
  });

  /* ---------- liczniki (ciekawostki) ---------- */
  function animateCounter(el) {
    var target = parseFloat(el.dataset.count);
    var decimals = (el.dataset.count.split(".")[1] || "").length;
    var suffix = el.dataset.suffix || "";
    var dur = 1600;
    var start = null;
    function frame(ts) {
      if (!start) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = (target * eased).toFixed(decimals) + suffix;
      if (p < 1) requestAnimationFrame(frame);
    }
    if (reduceMotion) { el.textContent = target.toFixed(decimals) + suffix; return; }
    requestAnimationFrame(frame);
  }
  var counterObserver = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          counterObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.5 }
  );
  document.querySelectorAll("[data-count]").forEach(function (el) {
    counterObserver.observe(el);
  });

  /* ---------- ziarno wędrujące lewo → prawo przy scrollu ---------- */
  var lanes = Array.prototype.slice.call(document.querySelectorAll(".bean-lane"));
  var heroBg = document.querySelector(".hero-bg");

  function onScroll() {
    var y = window.scrollY;

    if (header) header.classList.toggle("scrolled", y > 40);

    if (progress) {
      var max = docEl.scrollHeight - window.innerHeight;
      progress.style.width = (max > 0 ? (y / max) * 100 : 0) + "%";
    }

    if (heroBg && !reduceMotion) {
      heroBg.style.transform = "translateY(" + y * 0.28 + "px)";
    }

    if (!reduceMotion) {
      lanes.forEach(function (lane) {
        var bean = lane.querySelector(".bean-traveller");
        if (!bean) return;
        var rect = lane.getBoundingClientRect();
        var vh = window.innerHeight;
        /* postęp 0→1, gdy pas przechodzi przez ekran */
        var p = (vh - rect.top) / (vh + rect.height);
        p = Math.max(0, Math.min(1, p));
        var travel = lane.offsetWidth + bean.offsetWidth * 2;
        var x = -bean.offsetWidth + p * travel;
        bean.style.transform = "translateX(" + x + "px) rotate(" + p * 720 + "deg)";
      });
    }
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  onScroll();

  /* ---------- formularz zamówienia → mailto ---------- */
  var form = document.getElementById("orderForm");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var d = new FormData(form);
      var body =
        "Dzień dobry,\n\nchciał(a)bym zamówić kawę z gospodarstwa:\n\n" +
        "Imię i nazwisko: " + d.get("name") + "\n" +
        "Telefon: " + d.get("phone") + "\n" +
        "Produkt: " + d.get("product") + "\n" +
        "Ilość: " + d.get("qty") + "\n\n" +
        "Wiadomość:\n" + d.get("msg") + "\n";
      var href =
        "mailto:kamilsielatycki@gmail.com" +
        "?subject=" + encodeURIComponent("Zamówienie kawy — " + d.get("name")) +
        "&body=" + encodeURIComponent(body);
      window.location.href = href;
      var status = form.querySelector(".form-status");
      if (status) status.textContent = "Otwieram Twój program pocztowy z gotową wiadomością…";
    });
  }
})();
