/* Hotel Court — wspólna logika stron */
(function () {
  "use strict";

  /* ---------- preloader ---------- */
  var pre = document.querySelector(".preloader");
  if (pre) {
    window.addEventListener("load", function () {
      setTimeout(function () { pre.classList.add("done"); }, 500);
    });
    // awaryjnie schowaj po 3,5 s, gdyby jakiś zasób wisiał
    setTimeout(function () { pre.classList.add("done"); }, 3500);
  }

  /* ---------- topbar scroll ---------- */
  var topbar = document.querySelector(".topbar");
  function onScroll() {
    if (topbar) topbar.classList.toggle("scrolled", window.scrollY > 40);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- mobile menu ---------- */
  var burger = document.querySelector(".burger");
  if (burger) {
    burger.addEventListener("click", function () {
      document.body.classList.toggle("menu-open");
    });
    document.querySelectorAll(".mobile-menu a").forEach(function (a) {
      a.addEventListener("click", function () {
        document.body.classList.remove("menu-open");
      });
    });
  }

  /* ---------- reveal on scroll ---------- */
  var io = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add("in");
          io.unobserve(e.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
  );
  document.querySelectorAll(".reveal").forEach(function (el) { io.observe(el); });

  /* ---------- hero slideshow ---------- */
  var slides = document.querySelectorAll(".hero__slide");
  var dotsWrap = document.querySelector(".hero__dots");
  if (slides.length > 1) {
    var cur = 0, timer;
    var dots = [];
    if (dotsWrap) {
      slides.forEach(function (_, i) {
        var b = document.createElement("button");
        b.setAttribute("aria-label", "Slajd " + (i + 1));
        b.addEventListener("click", function () { go(i); restart(); });
        dotsWrap.appendChild(b);
        dots.push(b);
      });
    }
    function go(i) {
      slides[cur].classList.remove("on");
      if (dots[cur]) dots[cur].classList.remove("on");
      cur = (i + slides.length) % slides.length;
      slides[cur].classList.add("on");
      if (dots[cur]) dots[cur].classList.add("on");
    }
    function restart() {
      clearInterval(timer);
      timer = setInterval(function () { go(cur + 1); }, 6500);
    }
    go(0);
    restart();
  } else if (slides.length === 1) {
    slides[0].classList.add("on");
  }

  /* ---------- counters ---------- */
  var counterIO = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        counterIO.unobserve(e.target);
        var el = e.target;
        var target = parseFloat(el.dataset.count);
        var decimals = (el.dataset.count.split(".")[1] || "").length;
        var dur = 1600, t0 = null;
        function tick(t) {
          if (!t0) t0 = t;
          var p = Math.min((t - t0) / dur, 1);
          var eased = 1 - Math.pow(1 - p, 3);
          el.textContent = (target * eased).toFixed(decimals);
          if (p < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
      });
    },
    { threshold: 0.5 }
  );
  document.querySelectorAll("[data-count]").forEach(function (el) { counterIO.observe(el); });

  /* ---------- testimonial slider ---------- */
  document.querySelectorAll(".quotes").forEach(function (wrap) {
    var quotes = wrap.querySelectorAll(".quote");
    if (quotes.length < 2) { if (quotes[0]) quotes[0].classList.add("on"); return; }
    var dotsBox = wrap.parentElement.querySelector(".quotes__dots");
    var qDots = [];
    if (dotsBox) {
      quotes.forEach(function (_, i) {
        var b = document.createElement("button");
        b.setAttribute("aria-label", "Opinia " + (i + 1));
        b.addEventListener("click", function () { show(i); qRestart(); });
        dotsBox.appendChild(b);
        qDots.push(b);
      });
    }
    var qc = 0, qt;
    function show(i) {
      quotes[qc].classList.remove("on");
      if (qDots[qc]) qDots[qc].classList.remove("on");
      qc = (i + quotes.length) % quotes.length;
      quotes[qc].classList.add("on");
      if (qDots[qc]) qDots[qc].classList.add("on");
    }
    function qRestart() {
      clearInterval(qt);
      qt = setInterval(function () { show(qc + 1); }, 7000);
    }
    show(0);
    qRestart();
  });

  /* ---------- lightbox ---------- */
  var links = Array.prototype.slice.call(document.querySelectorAll(".mosaic a"));
  if (links.length) {
    var lb = document.createElement("div");
    lb.className = "lightbox";
    lb.innerHTML =
      '<button class="lightbox__close" aria-label="Zamknij">×</button>' +
      '<button class="lightbox__nav lightbox__prev" aria-label="Poprzednie">‹</button>' +
      '<img alt="Podgląd galerii">' +
      '<button class="lightbox__nav lightbox__next" aria-label="Następne">›</button>';
    document.body.appendChild(lb);
    var lbImg = lb.querySelector("img");
    var idx = 0;
    function open(i) {
      idx = (i + links.length) % links.length;
      lbImg.src = links[idx].getAttribute("href");
      lb.classList.add("on");
    }
    links.forEach(function (a, i) {
      a.addEventListener("click", function (ev) { ev.preventDefault(); open(i); });
    });
    lb.querySelector(".lightbox__close").addEventListener("click", function () { lb.classList.remove("on"); });
    lb.querySelector(".lightbox__prev").addEventListener("click", function () { open(idx - 1); });
    lb.querySelector(".lightbox__next").addEventListener("click", function () { open(idx + 1); });
    lb.addEventListener("click", function (e) { if (e.target === lb) lb.classList.remove("on"); });
    document.addEventListener("keydown", function (e) {
      if (!lb.classList.contains("on")) return;
      if (e.key === "Escape") lb.classList.remove("on");
      if (e.key === "ArrowLeft") open(idx - 1);
      if (e.key === "ArrowRight") open(idx + 1);
    });
  }

  /* ---------- moduł rezerwacji (hero) ---------- */
  var bb = document.querySelector("form[data-booking]");
  if (bb) {
    var bbIn = bb.querySelector("#bb-in");
    var bbOut = bb.querySelector("#bb-out");
    var DAY = 86400000;
    function iso(d) { return d.toISOString().slice(0, 10); }
    var now = new Date();
    bbIn.min = iso(now);
    bbIn.value = iso(new Date(now.getTime() + 7 * DAY));
    bbOut.value = iso(new Date(now.getTime() + 8 * DAY));
    bbOut.min = bbOut.value;
    bbIn.addEventListener("change", function () {
      if (!bbIn.value) return;
      var next = iso(new Date(new Date(bbIn.value).getTime() + DAY));
      bbOut.min = next;
      if (bbOut.value <= bbIn.value) bbOut.value = next;
    });
    bb.addEventListener("submit", function (e) {
      e.preventDefault();
      var url =
        "https://booking.profitroom.com/pl/hotelcourt/home" +
        "?checkIn=" + encodeURIComponent(bbIn.value) +
        "&checkOut=" + encodeURIComponent(bbOut.value) +
        "&adults=" + encodeURIComponent(bb.querySelector("#bb-guests").value);
      window.open(url, "_blank", "noopener");
    });
  }

  /* ---------- demo form ---------- */
  document.querySelectorAll("form[data-demo]").forEach(function (f) {
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      var ok = f.querySelector(".form__ok");
      if (ok) {
        ok.classList.add("on");
        ok.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      f.reset();
    });
  });

  /* ---------- custom cursor ---------- */
  if (window.matchMedia("(pointer: fine)").matches) {
    var dot = document.createElement("div");
    var ring = document.createElement("div");
    dot.className = "cursor-dot";
    ring.className = "cursor-ring";
    document.body.appendChild(dot);
    document.body.appendChild(ring);
    var mx = -100, my = -100, rx = -100, ry = -100;
    document.addEventListener("mousemove", function (e) { mx = e.clientX; my = e.clientY; });
    (function loop() {
      rx += (mx - rx) * 0.16;
      ry += (my - ry) * 0.16;
      dot.style.transform = "translate(" + mx + "px," + my + "px) translate(-50%,-50%)";
      ring.style.transform = "translate(" + rx + "px," + ry + "px) translate(-50%,-50%)";
      requestAnimationFrame(loop);
    })();
    document.querySelectorAll("a, button, .pillar, .card").forEach(function (el) {
      el.addEventListener("mouseenter", function () { document.body.classList.add("cursor-hover"); });
      el.addEventListener("mouseleave", function () { document.body.classList.remove("cursor-hover"); });
    });
  }

  /* ---------- fallback dla zdjęć ---------- */
  var FALLBACK =
    "data:image/svg+xml;charset=utf-8," +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800">' +
        '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">' +
        '<stop offset="0" stop-color="#f4eee1"/><stop offset="1" stop-color="#e9dcc0"/>' +
        "</linearGradient></defs>" +
        '<rect width="1200" height="800" fill="url(#g)"/>' +
        '<circle cx="600" cy="400" r="120" fill="none" stroke="#b08a47" stroke-width="3"/>' +
        '<text x="600" y="455" text-anchor="middle" font-family="Georgia" font-size="150" fill="#b08a47">C</text>' +
        "</svg>"
    );
  document.querySelectorAll("img").forEach(function (img) {
    if (img.classList.contains("brand__logo") || img.classList.contains("footer__logo")) return;
    img.addEventListener("error", function () {
      if (img.src !== FALLBACK) img.src = FALLBACK;
    });
    if (img.complete && img.naturalWidth === 0 && img.src && img.src !== FALLBACK) {
      img.src = FALLBACK;
    }
  });
  document.querySelectorAll("[style*='background-image']").forEach(function (el) {
    var m = /url\(['"]?(.+?)['"]?\)/.exec(el.getAttribute("style") || "");
    if (!m) return;
    var probe = new Image();
    probe.onerror = function () {
      el.style.backgroundImage = "url('" + FALLBACK + "')";
    };
    probe.src = m[1];
  });

  /* ---------- back to top ---------- */
  var toTop = document.createElement("button");
  toTop.className = "to-top";
  toTop.innerHTML = "↑";
  toTop.setAttribute("aria-label", "Wróć na górę");
  document.body.appendChild(toTop);
  toTop.addEventListener("click", function () {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
  window.addEventListener("scroll", function () {
    toTop.classList.toggle("show", window.scrollY > 650);
  }, { passive: true });

  /* ---------- 3D tilt na kartach filarów ---------- */
  if (window.matchMedia("(pointer: fine)").matches) {
    document.querySelectorAll(".pillar").forEach(function (p) {
      p.style.transition = "transform 0.25s ease-out";
      p.addEventListener("mousemove", function (e) {
        var r = p.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width - 0.5;
        var y = (e.clientY - r.top) / r.height - 0.5;
        p.style.transform = "perspective(900px) rotateY(" + (x * 6).toFixed(2) + "deg) rotateX(" + (-y * 6).toFixed(2) + "deg) translateY(-4px)";
      });
      p.addEventListener("mouseleave", function () { p.style.transform = ""; });
    });
  }

  /* ---------- rok w stopce ---------- */
  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });
})();
