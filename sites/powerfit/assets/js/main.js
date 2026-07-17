/* POWERFIT Gym & Fitness — wspólna logika stron */
(function () {
  "use strict";

  /* --- menu mobilne --- */
  const toggle = document.querySelector(".nav-toggle");
  const nav = document.querySelector(".main-nav");
  if (toggle && nav) {
    toggle.addEventListener("click", () => {
      const open = nav.classList.toggle("open");
      toggle.classList.toggle("open", open);
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    nav.querySelectorAll("a").forEach((a) =>
      a.addEventListener("click", () => {
        nav.classList.remove("open");
        toggle.classList.remove("open");
      })
    );
  }

  /* --- podświetlenie aktywnej pozycji menu --- */
  const current = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".main-nav a").forEach((a) => {
    const href = a.getAttribute("href");
    if (href === current) a.classList.add("active");
  });

  /* --- kaskadowe opóźnienia reveal wewnątrz siatek --- */
  document
    .querySelectorAll(".cards-grid, .stats-grid, .quotes-grid, .pricing-grid, .gallery-grid")
    .forEach((grid) => {
      Array.from(grid.children).forEach((el, i) => {
        if (el.classList.contains("reveal")) {
          el.style.transitionDelay = (i % 4) * 90 + "ms";
        }
      });
    });

  /* --- animacje reveal przy scrollu --- */
  const revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && revealEls.length) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("visible");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add("visible"));
  }

  /* --- liczniki statystyk --- */
  const counters = document.querySelectorAll("[data-count]");
  if ("IntersectionObserver" in window && counters.length) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          io.unobserve(e.target);
          const el = e.target;
          const target = parseInt(el.dataset.count, 10);
          const dur = 1400;
          const start = performance.now();
          const tick = (now) => {
            const p = Math.min((now - start) / dur, 1);
            el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
            if (p < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        });
      },
      { threshold: 0.4 }
    );
    counters.forEach((el) => io.observe(el));
  }

  /* --- lightbox galerii --- */
  const gallery = document.querySelector(".gallery-grid");
  if (gallery) {
    const box = document.createElement("div");
    box.className = "lightbox";
    box.innerHTML = "<img alt=\"Podgląd zdjęcia\">";
    document.body.appendChild(box);
    const boxImg = box.querySelector("img");
    gallery.addEventListener("click", (ev) => {
      const fig = ev.target.closest("figure");
      if (!fig) return;
      const img = fig.querySelector("img");
      boxImg.src = img.dataset.full || img.src;
      box.classList.add("open");
    });
    box.addEventListener("click", () => box.classList.remove("open"));
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") box.classList.remove("open");
    });
  }

  /* --- formularze demo (kontakt / zapis) --- */
  const showToast = (msg) => {
    let toast = document.querySelector(".toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.className = "toast";
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add("show");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => toast.classList.remove("show"), 4000);
  };

  document.querySelectorAll("form[data-demo]").forEach((form) => {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      showToast("Dziękujemy! To wersja demo — Twoja wiadomość nie została jeszcze nigdzie wysłana.");
      form.reset();
    });
  });

  /* --- pasek postępu scrolla --- */
  const progress = document.createElement("div");
  progress.className = "scroll-progress";
  document.body.appendChild(progress);

  /* --- przycisk „do góry" --- */
  const toTop = document.createElement("button");
  toTop.className = "to-top";
  toTop.setAttribute("aria-label", "Przewiń do góry");
  toTop.innerHTML =
    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 19V5M5 12l7-7 7 7"/></svg>';
  document.body.appendChild(toTop);
  toTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));

  const onScroll = () => {
    const doc = document.documentElement;
    const max = doc.scrollHeight - doc.clientHeight;
    progress.style.width = max > 0 ? (doc.scrollTop / max) * 100 + "%" : "0";
    toTop.classList.toggle("show", doc.scrollTop > 600);
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* --- płynne pojawianie się obrazów + ukrywanie uszkodzonych w galerii --- */
  document.querySelectorAll("main img").forEach((img) => {
    img.classList.add("img-fade");
    const done = () => img.classList.add("loaded");
    if (img.complete && img.naturalWidth > 0) done();
    else img.addEventListener("load", done);
    img.addEventListener("error", () => {
      img.classList.add("loaded");
      const fig = img.closest(".gallery-grid figure");
      if (fig) fig.remove(); // uszkodzony hotlink nie zostawia dziury w galerii
    });
  });
})();
