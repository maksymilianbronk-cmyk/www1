/* Gminna Orkiestra Dęta przy OSP Pinczyn — wspólny skrypt */
(function () {
  "use strict";

  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Menu mobilne
  var toggle = document.querySelector(".nav-toggle");
  var links = document.querySelector(".nav-links");
  if (toggle && links) {
    toggle.addEventListener("click", function () {
      var open = links.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    links.addEventListener("click", function (e) {
      if (e.target.tagName === "A") links.classList.remove("open");
    });
  }

  // Rok w stopce
  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });

  // Pasek postępu przewijania
  if (!reduce) {
    var bar = document.createElement("div");
    bar.id = "progress";
    document.body.appendChild(bar);
    var ticking = false;
    function updateBar() {
      var h = document.documentElement;
      var max = h.scrollHeight - h.clientHeight;
      var pct = max > 0 ? (h.scrollTop || window.pageYOffset) / max : 0;
      bar.style.width = (pct * 100).toFixed(2) + "%";
      ticking = false;
    }
    window.addEventListener("scroll", function () {
      if (!ticking) { window.requestAnimationFrame(updateBar); ticking = true; }
    }, { passive: true });
    updateBar();
  }

  // Odsłanianie przy scrollu + delikatny stagger w obrębie sekcji
  var reveals = document.querySelectorAll(".reveal");
  reveals.forEach(function (el) {
    var sibs = el.parentElement ? el.parentElement.querySelectorAll(":scope > .reveal") : [];
    if (sibs.length > 1) {
      var idx = Array.prototype.indexOf.call(sibs, el);
      if (idx > 0) el.style.transitionDelay = Math.min(idx * 75, 340) + "ms";
    }
  });
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("in"); });
  }

  // Parallax (delikatny ruch elementów przy przewijaniu)
  var pxEls = reduce ? [] : document.querySelectorAll("[data-parallax]");
  if (pxEls.length) {
    var pxTick = false;
    function px() {
      var vh = window.innerHeight;
      pxEls.forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.bottom < 0 || r.top > vh) return;
        var speed = parseFloat(el.getAttribute("data-parallax")) || 0.06;
        var offset = ((r.top + r.height / 2) - vh / 2) * -speed;
        el.style.transform = "translate3d(0," + offset.toFixed(1) + "px,0)";
      });
      pxTick = false;
    }
    window.addEventListener("scroll", function () {
      if (!pxTick) { window.requestAnimationFrame(px); pxTick = true; }
    }, { passive: true });
    px();
  }

  // Licznik liczb (count-up) dla statystyk
  var counters = document.querySelectorAll("[data-count]");
  if (counters.length && "IntersectionObserver" in window) {
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        cio.unobserve(en.target);
        var el = en.target;
        var to = parseFloat(el.getAttribute("data-count"));
        var suffix = el.getAttribute("data-suffix") || "";
        if (reduce) { el.textContent = to + suffix; return; }
        var dur = 1200, t0 = null;
        function step(ts) {
          if (t0 === null) t0 = ts;
          var p = Math.min((ts - t0) / dur, 1);
          var eased = 1 - Math.pow(1 - p, 3);
          el.textContent = Math.round(to * eased) + suffix;
          if (p < 1) window.requestAnimationFrame(step);
          else el.textContent = to + suffix;
        }
        window.requestAnimationFrame(step);
      });
    }, { threshold: 0.5 });
    counters.forEach(function (el) { cio.observe(el); });
  }

  // Filtr galerii
  var chips = document.querySelectorAll(".chip");
  if (chips.length) {
    chips.forEach(function (chip) {
      chip.addEventListener("click", function () {
        var cat = chip.getAttribute("data-filter");
        chips.forEach(function (c) { c.classList.remove("active"); });
        chip.classList.add("active");
        document.querySelectorAll("[data-cat]").forEach(function (t) {
          var show = cat === "all" || t.getAttribute("data-cat") === cat;
          t.style.display = show ? "" : "none";
        });
      });
    });
  }

  // Lightbox (kliknięcie w zdjęcie z atrybutem data-lb)
  var lbxEls = document.querySelectorAll("[data-lb]");
  if (lbxEls.length) {
    var box = document.createElement("div");
    box.className = "lbx";
    box.innerHTML = '<figure><button class="x" aria-label="Zamknij">✕</button>' +
                    '<img alt=""><figcaption></figcaption></figure>';
    document.body.appendChild(box);
    var bImg = box.querySelector("img");
    var bCap = box.querySelector("figcaption");
    function openLb(src, cap) {
      bImg.src = src; bImg.alt = cap || "";
      bCap.textContent = cap || "";
      box.classList.add("show");
    }
    function closeLb() { box.classList.remove("show"); bImg.src = ""; }
    lbxEls.forEach(function (el) {
      el.addEventListener("click", function () {
        var img = el.tagName === "IMG" ? el : el.querySelector("img");
        var cap = el.getAttribute("data-cap") ||
                  (el.querySelector(".cap") ? el.querySelector(".cap").textContent : "") ||
                  (img ? img.alt : "");
        if (img) openLb(img.getAttribute("src"), cap);
      });
    });
    box.addEventListener("click", function (e) {
      if (e.target === box || e.target.classList.contains("x") || e.target.tagName === "FIGURE") closeLb();
    });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeLb(); });
  }

  // Formularz kontaktowy (demo — bez backendu)
  var form = document.querySelector("form[data-demo]");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var ok = form.querySelector(".form-ok");
      if (ok) ok.classList.add("show");
      form.querySelectorAll(".input,textarea,select").forEach(function (i) { i.value = ""; });
    });
  }
})();
