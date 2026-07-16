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
        document.querySelectorAll(".tile").forEach(function (t) {
          var show = cat === "all" || t.getAttribute("data-cat") === cat;
          t.style.display = show ? "" : "none";
        });
      });
    });
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
