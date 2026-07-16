/* Gminna Orkiestra Dęta przy OSP Pinczyn — wspólny skrypt */
(function () {
  "use strict";

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

  // Odsłanianie przy scrollu
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
      });
    }, { threshold: 0.12 });
    document.querySelectorAll(".reveal").forEach(function (el) { io.observe(el); });
  } else {
    document.querySelectorAll(".reveal").forEach(function (el) { el.classList.add("in"); });
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
