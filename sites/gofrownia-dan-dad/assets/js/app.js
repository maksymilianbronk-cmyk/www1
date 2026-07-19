/* Gofrownia Dan & Dad — wspólna logika strony */
(function () {
  "use strict";

  /* ---------- Preloader ---------- */
  window.addEventListener("load", function () {
    var pre = document.getElementById("preloader");
    if (pre) setTimeout(function () { pre.classList.add("done"); }, 350);
  });

  /* ---------- Header: shrink on scroll ---------- */
  var header = document.querySelector(".site-header");
  var toTop = document.getElementById("toTop");
  var plxEls = [].slice.call(document.querySelectorAll("[data-plx]"));
  function onScroll() {
    var y = window.scrollY || 0;
    if (header) header.classList.toggle("scrolled", y > 30);
    if (toTop) toTop.classList.toggle("show", y > 600);
    parallax(y);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  if (toTop) toTop.addEventListener("click", function () {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  /* ---------- Parallax dla elementów [data-plx] ---------- */
  function parallax(y) {
    for (var i = 0; i < plxEls.length; i++) {
      var el = plxEls[i];
      var speed = parseFloat(el.getAttribute("data-plx")) || 0.1;
      el.style.transform = "translateY(" + (y * speed) + "px)";
    }
  }

  /* ---------- Hamburger + mobile menu ---------- */
  var burger = document.querySelector(".hamburger");
  var mobileMenu = document.querySelector(".mobile-menu");
  if (burger && mobileMenu) {
    burger.addEventListener("click", function () {
      var open = burger.classList.toggle("open");
      mobileMenu.classList.toggle("open", open);
      document.body.style.overflow = open ? "hidden" : "";
      burger.setAttribute("aria-expanded", open ? "true" : "false");
      var links = mobileMenu.querySelectorAll("a");
      for (var i = 0; i < links.length; i++) {
        links[i].style.transitionDelay = open ? (0.12 + i * 0.06) + "s" : "0s";
      }
    });
    mobileMenu.addEventListener("click", function (e) {
      if (e.target.tagName === "A") {
        burger.classList.remove("open");
        mobileMenu.classList.remove("open");
        document.body.style.overflow = "";
      }
    });
  }

  /* ---------- Aktywny link nawigacji ---------- */
  var path = location.pathname.split("/").pop() || "index.html";
  [].forEach.call(document.querySelectorAll(".main-nav a, .mobile-menu a"), function (a) {
    var href = (a.getAttribute("href") || "").split("/").pop();
    if (href === path) a.classList.add("active");
  });

  /* ---------- Scroll reveal ---------- */
  var revealEls = [].slice.call(document.querySelectorAll(".reveal, .stagger"));
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add("in");
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.14, rootMargin: "0px 0px -40px 0px" });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("in"); });
  }

  /* ---------- Liczniki ---------- */
  var counters = [].slice.call(document.querySelectorAll("[data-count]"));
  if (counters.length && "IntersectionObserver" in window) {
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        cio.unobserve(en.target);
        var el = en.target;
        var target = parseFloat(el.getAttribute("data-count"));
        var suffix = el.getAttribute("data-suffix") || "";
        var dur = 1600, t0 = null;
        function tick(t) {
          if (!t0) t0 = t;
          var p = Math.min((t - t0) / dur, 1);
          var eased = 1 - Math.pow(1 - p, 3);
          el.textContent = Math.round(target * eased) + suffix;
          if (p < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
      });
    }, { threshold: 0.6 });
    counters.forEach(function (el) { cio.observe(el); });
  }

  /* ---------- Zakładki menu ---------- */
  var tabs = [].slice.call(document.querySelectorAll(".menu-tab"));
  tabs.forEach(function (tab) {
    tab.addEventListener("click", function () {
      tabs.forEach(function (t) { t.classList.remove("active"); });
      tab.classList.add("active");
      [].forEach.call(document.querySelectorAll(".menu-panel"), function (p) {
        p.classList.toggle("active", p.id === tab.getAttribute("data-panel"));
      });
    });
  });

  /* ---------- Galeria: lightbox ---------- */
  var lightbox = document.getElementById("lightbox");
  if (lightbox) {
    var lbArt = lightbox.querySelector(".lb-art");
    var lbTitle = lightbox.querySelector(".lb-title");
    [].forEach.call(document.querySelectorAll(".g-tile"), function (tile) {
      tile.addEventListener("click", function () {
        var media = tile.querySelector("img, svg");
        if (media) lbArt.innerHTML = media.outerHTML;
        lbTitle.textContent = tile.getAttribute("data-title") || "";
        lightbox.classList.add("open");
        document.body.style.overflow = "hidden";
      });
    });
    function closeLb() {
      lightbox.classList.remove("open");
      document.body.style.overflow = "";
    }
    lightbox.addEventListener("click", function (e) {
      if (e.target === lightbox || e.target.closest(".lb-close")) closeLb();
    });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeLb(); });
  }

  /* ---------- FAQ ---------- */
  [].forEach.call(document.querySelectorAll(".faq-item"), function (item) {
    var q = item.querySelector(".faq-q");
    var a = item.querySelector(".faq-a");
    q.addEventListener("click", function () {
      var open = item.classList.toggle("open");
      a.style.maxHeight = open ? a.scrollHeight + "px" : "0";
    });
  });

  /* ---------- Custom cursor (desktop) ---------- */
  if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    var dot = document.createElement("div"); dot.className = "cursor-dot";
    var ring = document.createElement("div"); ring.className = "cursor-ring";
    document.body.appendChild(dot); document.body.appendChild(ring);
    var mx = -100, my = -100, rx = -100, ry = -100;
    document.addEventListener("mousemove", function (e) { mx = e.clientX; my = e.clientY; });
    (function loop() {
      rx += (mx - rx) * 0.16; ry += (my - ry) * 0.16;
      dot.style.left = mx + "px"; dot.style.top = my + "px";
      ring.style.left = rx + "px"; ring.style.top = ry + "px";
      requestAnimationFrame(loop);
    })();
    document.addEventListener("mouseover", function (e) {
      if (e.target.closest("a, button, .g-tile, .slot, .chip")) ring.classList.add("hovering");
    });
    document.addEventListener("mouseout", function (e) {
      if (e.target.closest("a, button, .g-tile, .slot, .chip")) ring.classList.remove("hovering");
    });
  }

  /* ---------- Magnetyczne przyciski ---------- */
  if (window.matchMedia("(hover: hover)").matches) {
    [].forEach.call(document.querySelectorAll(".btn, .nav-cta"), function (btn) {
      btn.classList.add("magnetic");
      btn.addEventListener("mousemove", function (e) {
        var r = btn.getBoundingClientRect();
        var x = (e.clientX - r.left - r.width / 2) * 0.22;
        var y = (e.clientY - r.top - r.height / 2) * 0.3;
        btn.style.transform = "translate(" + x + "px," + y + "px)";
      });
      btn.addEventListener("mouseleave", function () { btn.style.transform = ""; });
    });
  }

  /* ---------- Split-text: tnij nagłówki [data-split] na linie ---------- */
  [].forEach.call(document.querySelectorAll("[data-split]"), function (el) {
    var lines = el.innerHTML.split("<br>");
    el.classList.add("split-lines");
    el.innerHTML = lines.map(function (l) {
      return '<span class="line"><span>' + l + "</span></span>";
    }).join("");
    if ("IntersectionObserver" in window) {
      var sio = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) { en.target.classList.add("in"); sio.unobserve(en.target); }
        });
      }, { threshold: 0.3 });
      sio.observe(el);
    } else { el.classList.add("in"); }
  });

  /* ---------- Godziny: podświetl dzisiejszy wiersz ---------- */
  var todayRow = document.querySelector('.hours-table tr[data-day="' + new Date().getDay() + '"]');
  if (todayRow) todayRow.classList.add("today");

  /* ================================================================
     KREATOR REZERWACJI (rezerwacja.html)
     ================================================================ */
  var rezForm = document.getElementById("rezForm");
  if (!rezForm) return;

  var state = {
    step: 1,
    type: "stolik",
    date: "",
    time: "",
    guests: 2,
    occasion: "",
    name: "",
    phone: "",
    email: "",
    notes: ""
  };
  var TOTAL_STEPS = 3;

  /* Data: min = dziś, max = +60 dni */
  var dateInput = document.getElementById("rezDate");
  function fmtDate(d) {
    var m = ("0" + (d.getMonth() + 1)).slice(-2);
    var day = ("0" + d.getDate()).slice(-2);
    return d.getFullYear() + "-" + m + "-" + day;
  }
  var now = new Date();
  var max = new Date(); max.setDate(max.getDate() + 60);
  dateInput.min = fmtDate(now);
  dateInput.max = fmtDate(max);
  dateInput.value = fmtDate(now);
  state.date = dateInput.value;
  dateInput.addEventListener("change", function () {
    state.date = dateInput.value;
    buildSlots();
  });

  /* Typ rezerwacji */
  [].forEach.call(document.querySelectorAll("[data-rez-type]"), function (chip) {
    chip.addEventListener("click", function () {
      [].forEach.call(document.querySelectorAll("[data-rez-type]"), function (c) { c.classList.remove("selected"); });
      chip.classList.add("selected");
      state.type = chip.getAttribute("data-rez-type");
    });
  });

  /* Sloty godzinowe 10:00–21:30 co 30 min */
  var slotGrid = document.getElementById("slotGrid");
  function buildSlots() {
    slotGrid.innerHTML = "";
    state.time = "";
    var isToday = state.date === fmtDate(new Date());
    var nowMin = new Date().getHours() * 60 + new Date().getMinutes();
    for (var h = 10; h <= 21; h++) {
      for (var m = 0; m < 60; m += 30) {
        if (h === 21 && m > 30) break;
        var label = ("0" + h).slice(-2) + ":" + ("0" + m).slice(-2);
        var b = document.createElement("button");
        b.type = "button";
        b.className = "slot";
        b.textContent = label;
        if (isToday && h * 60 + m <= nowMin + 45) b.classList.add("off");
        b.addEventListener("click", function () {
          [].forEach.call(slotGrid.children, function (s) { s.classList.remove("selected"); });
          this.classList.add("selected");
          state.time = this.textContent;
        });
        slotGrid.appendChild(b);
      }
    }
  }
  buildSlots();

  /* Liczba gości */
  var gNum = document.getElementById("guestNum");
  document.getElementById("gMinus").addEventListener("click", function () {
    if (state.guests > 1) { state.guests--; gNum.textContent = state.guests; }
  });
  document.getElementById("gPlus").addEventListener("click", function () {
    if (state.guests < 20) { state.guests++; gNum.textContent = state.guests; }
  });

  /* Okazja */
  [].forEach.call(document.querySelectorAll("[data-occasion]"), function (chip) {
    chip.addEventListener("click", function () {
      var was = chip.classList.contains("selected");
      [].forEach.call(document.querySelectorAll("[data-occasion]"), function (c) { c.classList.remove("selected"); });
      if (!was) { chip.classList.add("selected"); state.occasion = chip.getAttribute("data-occasion"); }
      else state.occasion = "";
    });
  });

  /* Nawigacja kroków */
  function showStep(n) {
    state.step = n;
    [].forEach.call(document.querySelectorAll(".rez-pane"), function (p) {
      p.classList.toggle("active", parseInt(p.getAttribute("data-pane"), 10) === n);
    });
    [].forEach.call(document.querySelectorAll(".rez-step"), function (s, i) {
      s.classList.toggle("active", i + 1 === n);
      s.classList.toggle("done", i + 1 < n);
    });
    document.getElementById("rezBack").style.visibility = n === 1 ? "hidden" : "visible";
    document.getElementById("rezNext").textContent = n === TOTAL_STEPS ? "Wyślij rezerwację ♥" : "Dalej →";
    if (n === TOTAL_STEPS) fillSummary();
    var card = document.querySelector(".rez-form-card");
    if (card) card.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function setInvalid(id, bad) {
    var f = document.getElementById(id);
    if (f) f.closest(".form-field").classList.toggle("invalid", bad);
    return !bad;
  }

  function validateStep(n) {
    if (n === 1) {
      if (!state.time) {
        slotGrid.style.animation = "none";
        void slotGrid.offsetWidth;
        slotGrid.style.animation = "shake .4s";
        var hint = document.getElementById("slotHint");
        if (hint) hint.style.display = "block";
        return false;
      }
      return true;
    }
    if (n === 2) {
      var ok = true;
      state.name = document.getElementById("rezName").value.trim();
      state.phone = document.getElementById("rezPhone").value.trim();
      state.email = document.getElementById("rezEmail").value.trim();
      state.notes = document.getElementById("rezNotes").value.trim();
      ok = setInvalid("rezName", state.name.length < 3) && ok;
      ok = setInvalid("rezPhone", !/^[\d+\s-]{7,}$/.test(state.phone)) && ok;
      ok = setInvalid("rezEmail", state.email !== "" && !/^\S+@\S+\.\S+$/.test(state.email)) && ok;
      return ok;
    }
    return true;
  }

  var typeLabels = { stolik: "Stolik w gofrowni", wynos: "Zamówienie na wynos", urodziny: "Urodziny / impreza" };

  function fillSummary() {
    var d = new Date(state.date + "T00:00:00");
    var days = ["niedziela", "poniedziałek", "wtorek", "środa", "czwartek", "piątek", "sobota"];
    document.getElementById("sumType").textContent = typeLabels[state.type] || state.type;
    document.getElementById("sumDate").textContent = d.toLocaleDateString("pl-PL") + " (" + days[d.getDay()] + ")";
    document.getElementById("sumTime").textContent = state.time;
    document.getElementById("sumGuests").textContent = state.guests + (state.guests === 1 ? " osoba" : state.guests < 5 ? " osoby" : " osób");
    document.getElementById("sumName").textContent = state.name;
    document.getElementById("sumPhone").textContent = state.phone;
    document.getElementById("sumOccasion").textContent = state.occasion || "—";
  }

  document.getElementById("rezBack").addEventListener("click", function () {
    if (state.step > 1) showStep(state.step - 1);
  });

  document.getElementById("rezNext").addEventListener("click", function () {
    if (!validateStep(state.step)) return;
    if (state.step < TOTAL_STEPS) { showStep(state.step + 1); return; }
    /* Wysyłka: zapis lokalny + mailto do gofrowni */
    try {
      var saved = JSON.parse(localStorage.getItem("dandad_rezerwacje") || "[]");
      saved.push(Object.assign({ created: new Date().toISOString() }, state));
      localStorage.setItem("dandad_rezerwacje", JSON.stringify(saved));
    } catch (e) { /* localStorage niedostępny — pomiń */ }

    var body =
      "Nowa rezerwacja — Gofrownia Dan & Dad\n" +
      "--------------------------------------\n" +
      "Rodzaj: " + (typeLabels[state.type] || state.type) + "\n" +
      "Data: " + state.date + "\n" +
      "Godzina: " + state.time + "\n" +
      "Liczba gości: " + state.guests + "\n" +
      (state.occasion ? "Okazja: " + state.occasion + "\n" : "") +
      "Imię i nazwisko: " + state.name + "\n" +
      "Telefon: " + state.phone + "\n" +
      (state.email ? "E-mail: " + state.email + "\n" : "") +
      (state.notes ? "Uwagi: " + state.notes + "\n" : "");
    var mailto = "mailto:dandad2023@gmail.com" +
      "?subject=" + encodeURIComponent("Rezerwacja — " + state.date + " " + state.time + " — " + state.name) +
      "&body=" + encodeURIComponent(body);

    document.getElementById("rezSuccess").classList.add("open");
    document.getElementById("rsMailto").setAttribute("href", mailto);
    confetti();
  });

  document.getElementById("rsClose").addEventListener("click", function () {
    document.getElementById("rezSuccess").classList.remove("open");
  });

  /* Konfetti */
  function confetti() {
    var colors = ["#f2578e", "#ffd9e6", "#e9a94e", "#fff", "#d63d77"];
    for (var i = 0; i < 60; i++) {
      var p = document.createElement("i");
      p.className = "confetti-piece";
      var size = 6 + Math.random() * 9;
      p.style.cssText =
        "left:" + Math.random() * 100 + "vw;" +
        "width:" + size + "px;height:" + size * (Math.random() > .5 ? 1 : 1.8) + "px;" +
        "background:" + colors[i % colors.length] + ";" +
        "border-radius:" + (Math.random() > .5 ? "50%" : "3px") + ";" +
        "animation-duration:" + (2.4 + Math.random() * 2.4) + "s;" +
        "animation-delay:" + Math.random() * .7 + "s;";
      document.body.appendChild(p);
      (function (el) { setTimeout(function () { el.remove(); }, 6000); })(p);
    }
  }

  showStep(1);
})();
