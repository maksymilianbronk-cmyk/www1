/* ABBA1 — interakcje wspólne dla wszystkich podstron */
(function () {
  "use strict";

  var docEl = document.documentElement;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var CART_KEY = "abba1-cart-v1";
  var ORDERS_KEY = "abba1-orders-v1";

  /* rejestr zamówień — wspólny ze sklepowym panelem (panel.html) */
  function readOrders() {
    try { return JSON.parse(localStorage.getItem(ORDERS_KEY)) || []; } catch (e) { return []; }
  }
  function saveOrder(order) {
    var all = readOrders();
    all.unshift(order);
    localStorage.setItem(ORDERS_KEY, JSON.stringify(all));
  }
  function nextOrderId() {
    var seq = parseInt(localStorage.getItem("abba1-order-seq") || "1041", 10) + 1;
    localStorage.setItem("abba1-order-seq", String(seq));
    return "A1-" + seq;
  }

  /* ---------- kaskada zapasowych zdjęć ---------- */
  var PLACEHOLDER =
    "data:image/svg+xml;utf8," +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600">' +
        '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">' +
        '<stop offset="0" stop-color="#0d3623"/><stop offset="1" stop-color="#0a2b1c"/>' +
        "</linearGradient></defs>" +
        '<rect width="800" height="600" fill="url(#g)"/>' +
        '<g fill="none" stroke="#7fc548" stroke-width="4" opacity="0.85" transform="translate(400 300)">' +
        '<rect x="-90" y="-70" width="180" height="110" rx="12"/>' +
        '<path d="M-60 40 h120 M-60 60 h80" stroke-dasharray="6 8"/>' +
        '<path d="M-40 -70 v-30 h80 v30"/>' +
        "</g>" +
        '<text x="400" y="430" text-anchor="middle" fill="#a5e063" font-family="monospace" font-size="26">ABBA1 • kasy fiskalne</text>' +
        "</svg>"
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

  /* ---------- header + progress + parallax ---------- */
  var header = document.querySelector(".site-header");
  var progress = document.querySelector(".scroll-progress");
  var heroBg = document.querySelector("[data-parallax]");

  function onScroll() {
    var y = window.scrollY;
    if (header) header.classList.toggle("scrolled", y > 40);
    if (progress) {
      var max = docEl.scrollHeight - window.innerHeight;
      progress.style.width = (max > 0 ? (y / max) * 100 : 0) + "%";
    }
    if (heroBg && !reduceMotion) {
      heroBg.style.transform = "translateY(" + y * 0.25 + "px)";
    }
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  onScroll();

  /* ---------- hamburger + menu mobilne ---------- */
  var burger = document.querySelector(".hamburger");
  var mobileMenu = document.querySelector(".mobile-menu");
  if (burger && mobileMenu) {
    var toggleMenu = function (force) {
      var open = typeof force === "boolean" ? force : !mobileMenu.classList.contains("open");
      mobileMenu.classList.toggle("open", open);
      burger.classList.toggle("open", open);
      document.body.classList.toggle("menu-locked", open);
      burger.setAttribute("aria-expanded", open ? "true" : "false");
    };
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
    { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
  );
  document.querySelectorAll(".reveal").forEach(function (el) { revealObserver.observe(el); });

  /* ---------- liczniki ---------- */
  function animateCounter(el) {
    var target = parseFloat(el.dataset.count);
    var decimals = (String(el.dataset.count).split(".")[1] || "").length;
    var suffix = el.dataset.suffix || "";
    var dur = 1700, start = null;
    if (reduceMotion) { el.textContent = target.toFixed(decimals) + suffix; return; }
    function frame(ts) {
      if (!start) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = (target * eased).toFixed(decimals) + suffix;
      if (p < 1) requestAnimationFrame(frame);
    }
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
  document.querySelectorAll("[data-count]").forEach(function (el) { counterObserver.observe(el); });

  /* ---------- toasty ---------- */
  var toastWrap = document.createElement("div");
  toastWrap.className = "toast-wrap";
  document.body.appendChild(toastWrap);
  function toast(msg) {
    var t = document.createElement("div");
    t.className = "toast";
    t.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>' +
      msg;
    toastWrap.appendChild(t);
    setTimeout(function () { t.classList.add("out"); }, 2600);
    setTimeout(function () { t.remove(); }, 3100);
  }

  /* ================== KOSZYK (paragon) ================== */
  function readCart() {
    try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch (e) { return []; }
  }
  function saveCart(items) { localStorage.setItem(CART_KEY, JSON.stringify(items)); }
  function cartTotal(items) {
    return items.reduce(function (s, it) { return s + it.price * it.qty; }, 0);
  }
  function fmt(n) {
    return n.toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " zł";
  }

  /* wstrzyknięcie drawera koszyka (wspólne dla wszystkich stron) */
  var drawerHtml =
    '<div class="cart-backdrop" id="cartBackdrop"></div>' +
    '<aside class="cart-drawer" id="cartDrawer" aria-label="Koszyk">' +
    '  <div class="cart-head">' +
    '    <div class="ch-title">ABBA1 ★ WARSZAWA</div>' +
    '    <div class="ch-sub">al. Tysiąclecia 151 • tel. 22 619 40 80<br>— PARAGON DEMO (symulacja sklepu) —</div>' +
    "  </div>" +
    '  <div class="cart-items" id="cartItems"></div>' +
    '  <div class="cart-sum" id="cartSum"></div>' +
    '  <div class="cart-actions">' +
    '    <button class="btn btn-pine" id="checkoutBtn">Złóż zamówienie (demo)</button>' +
    '    <button class="btn btn-outline-pine" id="cartCloseBtn">Wróć do zakupów</button>' +
    "  </div>" +
    '  <div class="cart-note">NIP 113-259-98-56 • DZIĘKUJEMY • ZAPRASZAMY PONOWNIE</div>' +
    "</aside>";
  document.body.insertAdjacentHTML("beforeend", drawerHtml);

  var cartDrawer = document.getElementById("cartDrawer");
  var cartBackdrop = document.getElementById("cartBackdrop");
  var cartItemsEl = document.getElementById("cartItems");
  var cartSumEl = document.getElementById("cartSum");

  function renderCartBadge() {
    var items = readCart();
    var count = items.reduce(function (s, it) { return s + it.qty; }, 0);
    document.querySelectorAll(".cart-count").forEach(function (b) {
      b.textContent = count;
      b.classList.toggle("show", count > 0);
    });
  }

  function renderCart() {
    var items = readCart();
    if (!items.length) {
      cartItemsEl.innerHTML =
        '<div class="cart-empty">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1.6"/><circle cx="19" cy="21" r="1.6"/><path d="M2.5 3h2l2.6 12.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L22 7H6"/></svg>' +
        "KOSZYK PUSTY<br>*** DODAJ PRODUKTY ZE SKLEPU ***</div>";
      cartSumEl.innerHTML = "";
      renderCartBadge();
      return;
    }
    cartItemsEl.innerHTML = items
      .map(function (it, i) {
        return (
          '<div class="cart-item">' +
          '<div class="ci-name"><span>' + it.name + '</span><button data-del="' + i + '" aria-label="Usuń">✕</button></div>' +
          '<div class="ci-row">' +
          '<span class="qty-ctrl"><button data-minus="' + i + '">−</button><output>' + it.qty + "</output>" +
          '<button data-plus="' + i + '">+</button></span>' +
          "<b>" + fmt(it.price * it.qty) + "</b>" +
          "</div></div>"
        );
      })
      .join("");
    var total = cartTotal(items);
    var net = total / 1.23;
    cartSumEl.innerHTML =
      '<div class="cs-row"><span>PODSUMA NETTO</span><span>' + fmt(net) + "</span></div>" +
      '<div class="cs-row"><span>VAT 23%</span><span>' + fmt(total - net) + "</span></div>" +
      '<div class="cs-row cs-total"><span>SUMA PLN</span><span class="val">' + fmt(total) + "</span></div>";
    renderCartBadge();
  }

  function openCart() {
    renderCart();
    cartDrawer.classList.add("open");
    cartBackdrop.classList.add("open");
    document.body.classList.add("drawer-locked");
  }
  function closeCart() {
    cartDrawer.classList.remove("open");
    cartBackdrop.classList.remove("open");
    document.body.classList.remove("drawer-locked");
  }

  document.querySelectorAll(".cart-btn").forEach(function (b) { b.addEventListener("click", openCart); });
  cartBackdrop.addEventListener("click", closeCart);
  document.getElementById("cartCloseBtn").addEventListener("click", closeCart);
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeCart(); });

  cartItemsEl.addEventListener("click", function (e) {
    var t = e.target.closest("button");
    if (!t) return;
    var items = readCart();
    if (t.dataset.del !== undefined) items.splice(+t.dataset.del, 1);
    if (t.dataset.plus !== undefined) items[+t.dataset.plus].qty++;
    if (t.dataset.minus !== undefined) {
      items[+t.dataset.minus].qty--;
      if (items[+t.dataset.minus].qty <= 0) items.splice(+t.dataset.minus, 1);
    }
    saveCart(items);
    renderCart();
  });

  /* dodawanie do koszyka + animacja lotu */
  window.abbaAddToCart = function (product, sourceEl) {
    var items = readCart();
    var found = items.find(function (it) { return it.id === product.id; });
    if (found) found.qty++;
    else items.push({ id: product.id, name: product.name, price: product.price, qty: 1 });
    saveCart(items);
    renderCartBadge();
    document.querySelectorAll(".cart-count").forEach(function (b) {
      b.classList.remove("bump"); void b.offsetWidth; b.classList.add("bump");
    });
    toast("Dodano do koszyka: " + product.name);

    var target = document.querySelector(".cart-btn");
    if (sourceEl && target && !reduceMotion) {
      var r1 = sourceEl.getBoundingClientRect();
      var r2 = target.getBoundingClientRect();
      var dot = document.createElement("div");
      dot.className = "fly-dot";
      dot.style.left = r1.left + r1.width / 2 + "px";
      dot.style.top = r1.top + r1.height / 2 + "px";
      document.body.appendChild(dot);
      dot.animate(
        [
          { transform: "translate(0,0) scale(1)", opacity: 1 },
          {
            transform:
              "translate(" + (r2.left + r2.width / 2 - r1.left - r1.width / 2) + "px," +
              (r2.top + r2.height / 2 - r1.top - r1.height / 2) + "px) scale(0.3)",
            opacity: 0.4,
          },
        ],
        { duration: 700, easing: "cubic-bezier(0.3, 0.7, 0.4, 1)" }
      ).onfinish = function () { dot.remove(); };
    }
  };

  /* checkout demo — kroki w modalu */
  var checkoutHtml =
    '<div class="modal-backdrop" id="checkoutModal">' +
    '  <div class="modal" role="dialog" aria-modal="true" aria-label="Zamówienie demo">' +
    '    <button class="modal-close" data-close-checkout aria-label="Zamknij">✕</button>' +
    '    <div id="checkoutBody"></div>' +
    "  </div>" +
    "</div>";
  document.body.insertAdjacentHTML("beforeend", checkoutHtml);
  var checkoutModal = document.getElementById("checkoutModal");
  var checkoutBody = document.getElementById("checkoutBody");

  function checkoutStep1() {
    checkoutBody.innerHTML =
      '<div class="checkout-steps"><span class="step on"></span><span class="step"></span><span class="step"></span></div>' +
      "<h3>Dane do zamówienia</h3>" +
      '<p class="modal-sub">To symulacja sklepu — zamówienie trafi jako wiadomość e-mail do ABBA1.</p>' +
      '<form class="form-grid" id="checkoutForm">' +
      '  <div class="f-row">' +
      '    <div class="field"><label for="cf-name">Imię i nazwisko / firma</label><input id="cf-name" name="name" required placeholder="Jan Kowalski"></div>' +
      '    <div class="field"><label for="cf-phone">Telefon</label><input id="cf-phone" name="phone" required placeholder="600 000 000"></div>' +
      "  </div>" +
      '  <div class="field"><label for="cf-mail">E-mail</label><input id="cf-mail" type="email" name="mail" required placeholder="firma@przyklad.pl"></div>' +
      '  <div class="field"><label for="cf-nip">NIP (do faktury, opcjonalnie)</label><input id="cf-nip" name="nip" placeholder="000-000-00-00"></div>' +
      '  <button class="btn btn-pine" style="justify-content:center" type="submit">Dalej → podsumowanie</button>' +
      "</form>";
    document.getElementById("checkoutForm").addEventListener("submit", function (e) {
      e.preventDefault();
      var d = new FormData(e.target);
      checkoutStep2({ name: d.get("name"), phone: d.get("phone"), mail: d.get("mail"), nip: d.get("nip") });
    });
  }

  function checkoutStep2(who) {
    var items = readCart();
    var total = cartTotal(items);
    checkoutBody.innerHTML =
      '<div class="checkout-steps"><span class="step on"></span><span class="step on"></span><span class="step"></span></div>' +
      "<h3>Podsumowanie</h3>" +
      '<p class="modal-sub">Sprawdź zamówienie przed wysłaniem.</p>' +
      '<div style="font-family:var(--font-mono);font-size:0.85rem;border:1px dashed var(--mint-2);border-radius:12px;padding:18px;margin-bottom:20px">' +
      items.map(function (it) { return '<div style="display:flex;justify-content:space-between;gap:10px;padding:3px 0"><span>' + it.qty + " × " + it.name + "</span><b>" + fmt(it.price * it.qty) + "</b></div>"; }).join("") +
      '<div style="display:flex;justify-content:space-between;border-top:2px solid var(--ink);margin-top:10px;padding-top:10px;font-weight:700"><span>SUMA</span><span>' + fmt(total) + "</span></div>" +
      "</div>" +
      '<button class="btn btn-pine" style="justify-content:center;width:100%" id="sendOrder">Wyślij zamówienie ✓</button>';
    document.getElementById("sendOrder").addEventListener("click", function () {
      var orderId = nextOrderId();
      saveOrder({
        id: orderId,
        ts: Date.now(),
        customer: { name: who.name, phone: who.phone, mail: who.mail, nip: who.nip || "" },
        items: items,
        total: total,
        status: "nowe",
        note: "",
        history: [{ status: "nowe", ts: Date.now() }],
      });
      var body =
        "Dzień dobry,\n\nskładam zamówienie " + orderId + " ze strony (demo):\n\n" +
        items.map(function (it) { return "• " + it.qty + " × " + it.name + " — " + fmt(it.price * it.qty); }).join("\n") +
        "\n\nRAZEM: " + fmt(total) +
        "\n\nDane:\n" + who.name + "\ntel. " + who.phone + "\n" + who.mail + (who.nip ? "\nNIP: " + who.nip : "") + "\n";
      var href = "mailto:biuro@abba1.pl?subject=" + encodeURIComponent("Zamówienie " + orderId + " — " + who.name) + "&body=" + encodeURIComponent(body);
      checkoutStep3(orderId);
      window.location.href = href;
    });
  }

  function checkoutStep3(orderId) {
    saveCart([]);
    renderCart();
    checkoutBody.innerHTML =
      '<div class="checkout-steps"><span class="step on"></span><span class="step on"></span><span class="step on"></span></div>' +
      '<div class="order-ok">' +
      '<div class="ok-ring"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg></div>' +
      "<h3>Zamówienie przyjęte!</h3>" +
      (orderId ? '<p style="font-family:var(--font-mono);font-size:1.05rem;color:var(--pine);font-weight:700;margin-bottom:8px">nr ' + orderId + "</p>" : "") +
      '<p class="modal-sub">Otwieramy Twój program pocztowy z gotową wiadomością.<br>Status znajdziesz w <a href="panel.html" style="color:var(--pine);font-weight:700">panelu sklepu (demo)</a>. Oddzwonimy: pn–pt 9:00–17:00.</p>' +
      '<button class="btn btn-pine" style="justify-content:center" data-close-checkout>Zamknij</button>' +
      "</div>";
  }

  document.getElementById("checkoutBtn").addEventListener("click", function () {
    if (!readCart().length) { toast("Koszyk jest pusty — dodaj produkty"); return; }
    closeCart();
    checkoutModal.classList.add("open");
    checkoutStep1();
  });
  checkoutModal.addEventListener("click", function (e) {
    if (e.target === checkoutModal || e.target.closest("[data-close-checkout]")) {
      checkoutModal.classList.remove("open");
    }
  });

  renderCartBadge();

  /* ================== ZAWIESZKA „WEŹ W LEASING" ================== */
  var tagHtml =
    '<button class="leasing-tag" id="leasingTag" aria-label="Weź w leasing teraz">' +
    '<svg viewBox="0 0 100 150" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M50 2 C 50 26, 50 26, 50 30" stroke="#8fae9c" stroke-width="2.5" fill="none" stroke-dasharray="4 4"/>' +
    '<g>' +
    '<path d="M50 24 L78 44 L78 132 Q78 142 68 142 L32 142 Q22 142 22 132 L22 44 Z" fill="#eab63f" stroke="#0a2b1c" stroke-width="2.5"/>' +
    '<circle cx="50" cy="44" r="6" fill="#0a2b1c"/>' +
    '<circle class="tag-pulse" cx="50" cy="44" r="6" fill="none" stroke="#0a2b1c" stroke-width="1.5"/>' +
    '<text x="50" y="76" text-anchor="middle" font-family="Unbounded, sans-serif" font-weight="800" font-size="15" fill="#0a2b1c">0%</text>' +
    '<text x="50" y="97" text-anchor="middle" font-family="Manrope, sans-serif" font-weight="800" font-size="10.5" fill="#0a2b1c">WEŹ W</text>' +
    '<text x="50" y="111" text-anchor="middle" font-family="Manrope, sans-serif" font-weight="800" font-size="10.5" fill="#0a2b1c">LEASING</text>' +
    '<text x="50" y="127" text-anchor="middle" font-family="Manrope, sans-serif" font-weight="700" font-size="8.5" fill="#5c4308">→ teraz</text>' +
    "</g></svg></button>";
  document.body.insertAdjacentHTML("beforeend", tagHtml);

  var leasHtml =
    '<div class="modal-backdrop" id="leasingModal">' +
    '  <div class="modal" role="dialog" aria-modal="true" aria-label="Kalkulator leasingu">' +
    '    <button class="modal-close" data-close-leas aria-label="Zamknij">✕</button>' +
    "    <h3>Weź w leasing teraz 🌿</h3>" +
    '    <p class="modal-sub">Kasa, terminal lub cały zestaw POS — od ręki, bez zamrażania gotówki. Policz orientacyjną ratę:</p>' +
    '    <div class="leas-calc">' +
    '      <div class="leas-row"><label>Wartość sprzętu (netto) <output id="leasVal">4 000 zł</output></label>' +
    '      <input type="range" id="leasRange" min="1000" max="30000" step="250" value="4000"></div>' +
    '      <div class="leas-row"><label>Okres leasingu</label>' +
    '      <div class="leas-months" id="leasMonths">' +
    '        <button data-m="24">24 mies.</button><button data-m="36" class="active">36 mies.</button><button data-m="48">48 mies.</button>' +
    "      </div></div>" +
    '      <div class="leas-result"><div class="leas-rata" id="leasRata">—</div><small>orientacyjna rata netto / mies.*</small></div>' +
    '      <a class="btn btn-pine" style="justify-content:center;width:100%" id="leasAsk" href="#">Zapytaj o ofertę leasingu</a>' +
    '      <p style="font-size:0.72rem;color:var(--ink-soft);margin-top:14px">* Kalkulacja poglądowa (symulacja). Ostateczne warunki zależą od oferty firmy leasingowej i oceny wniosku.</p>' +
    "    </div>" +
    "  </div>" +
    "</div>";
  document.body.insertAdjacentHTML("beforeend", leasHtml);

  var leasingModal = document.getElementById("leasingModal");
  var leasRange = document.getElementById("leasRange");
  var leasValOut = document.getElementById("leasVal");
  var leasRataOut = document.getElementById("leasRata");
  var leasMonths = 36;

  function leasCalc() {
    var val = +leasRange.value;
    /* poglądowo: wykup 1%, marża roczna ~6% */
    var months = leasMonths;
    var total = val * (1 + 0.06 * (months / 12));
    var rata = (total - val * 0.01) / months;
    leasValOut.textContent = fmt(val).replace(",00", "");
    leasRataOut.textContent = fmt(rata);
    document.getElementById("leasAsk").href =
      "mailto:biuro@abba1.pl?subject=" + encodeURIComponent("Zapytanie o leasing sprzętu") +
      "&body=" + encodeURIComponent(
        "Dzień dobry,\n\nproszę o ofertę leasingu sprzętu o wartości ok. " + fmt(val) +
        " netto na " + months + " miesięcy.\n\n(zapytanie wysłane ze strony abba1)"
      );
  }
  leasRange.addEventListener("input", leasCalc);
  document.getElementById("leasMonths").addEventListener("click", function (e) {
    var b = e.target.closest("button[data-m]");
    if (!b) return;
    leasMonths = +b.dataset.m;
    this.querySelectorAll("button").forEach(function (x) { x.classList.remove("active"); });
    b.classList.add("active");
    leasCalc();
  });
  leasCalc();

  document.getElementById("leasingTag").addEventListener("click", function () {
    leasingModal.classList.add("open");
  });
  leasingModal.addEventListener("click", function (e) {
    if (e.target === leasingModal || e.target.closest("[data-close-leas]")) leasingModal.classList.remove("open");
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") { leasingModal.classList.remove("open"); checkoutModal.classList.remove("open"); }
  });

  /* ================== LIGHTBOX GALERII ================== */
  var gItems = Array.prototype.slice.call(document.querySelectorAll(".g-item"));
  if (gItems.length) {
    var lbHtml =
      '<div class="lightbox" id="lightbox" role="dialog" aria-modal="true" aria-label="Podgląd zdjęcia">' +
      '  <div class="lb-count" id="lbCount"></div>' +
      '  <button class="lb-close" id="lbClose" aria-label="Zamknij"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button>' +
      '  <button class="lb-prev" id="lbPrev" aria-label="Poprzednie"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg></button>' +
      '  <div class="lb-stage"><img class="lb-img" id="lbImg" alt=""></div>' +
      '  <button class="lb-next" id="lbNext" aria-label="Następne"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg></button>' +
      '  <div class="lb-cap" id="lbCap"></div>' +
      '  <div class="lb-thumbs" id="lbThumbs"></div>' +
      "</div>";
    document.body.insertAdjacentHTML("beforeend", lbHtml);

    var lightbox = document.getElementById("lightbox");
    var lbImg = document.getElementById("lbImg");
    var lbCap = document.getElementById("lbCap");
    var lbCount = document.getElementById("lbCount");
    var lbThumbs = document.getElementById("lbThumbs");
    var lbIndex = 0;

    gItems.forEach(function (item, i) {
      var img = item.querySelector("img");
      var thumb = document.createElement("img");
      thumb.src = img.currentSrc || img.src;
      thumb.alt = "";
      thumb.addEventListener("click", function () { showLb(i); });
      lbThumbs.appendChild(thumb);
      item.addEventListener("click", function () { openLb(i); });
    });

    function visibleItems() {
      return gItems.filter(function (it) { return !it.classList.contains("hide"); });
    }
    function showLb(i) {
      var vis = visibleItems();
      if (!vis.length) return;
      lbIndex = ((i % vis.length) + vis.length) % vis.length;
      var item = vis[lbIndex];
      var img = item.querySelector("img");
      lbImg.classList.remove("in");
      setTimeout(function () {
        lbImg.src = img.currentSrc || img.src;
        lbImg.alt = img.alt || "";
        lbImg.onload = function () { lbImg.classList.add("in"); };
        if (lbImg.complete) lbImg.classList.add("in");
      }, 120);
      lbCap.textContent = (item.querySelector(".g-cap") || {}).textContent || img.alt || "";
      lbCount.textContent = (lbIndex + 1) + " / " + vis.length;
      Array.prototype.forEach.call(lbThumbs.children, function (t, ti) {
        var visIdx = vis.indexOf(gItems[ti]);
        t.style.display = visIdx === -1 ? "none" : "";
        t.classList.toggle("on", visIdx === lbIndex);
      });
    }
    function openLb(iAll) {
      var vis = visibleItems();
      var i = vis.indexOf(gItems[iAll]);
      if (i === -1) i = 0;
      lightbox.classList.add("open");
      document.body.classList.add("drawer-locked");
      showLb(i);
    }
    function closeLb() {
      lightbox.classList.remove("open");
      document.body.classList.remove("drawer-locked");
    }
    document.getElementById("lbClose").addEventListener("click", closeLb);
    document.getElementById("lbPrev").addEventListener("click", function () { showLb(lbIndex - 1); });
    document.getElementById("lbNext").addEventListener("click", function () { showLb(lbIndex + 1); });
    lightbox.addEventListener("click", function (e) { if (e.target === lightbox) closeLb(); });
    document.addEventListener("keydown", function (e) {
      if (!lightbox.classList.contains("open")) return;
      if (e.key === "Escape") closeLb();
      if (e.key === "ArrowLeft") showLb(lbIndex - 1);
      if (e.key === "ArrowRight") showLb(lbIndex + 1);
    });
    /* gest przesunięcia na mobile */
    var touchX = null;
    lightbox.addEventListener("touchstart", function (e) { touchX = e.touches[0].clientX; }, { passive: true });
    lightbox.addEventListener("touchend", function (e) {
      if (touchX === null) return;
      var dx = e.changedTouches[0].clientX - touchX;
      if (Math.abs(dx) > 50) showLb(lbIndex + (dx < 0 ? 1 : -1));
      touchX = null;
    }, { passive: true });
  }

  /* ================== FAQ accordion ================== */
  document.querySelectorAll(".faq-item").forEach(function (item) {
    var q = item.querySelector(".faq-q");
    var a = item.querySelector(".faq-a");
    if (!q || !a) return;
    q.addEventListener("click", function () {
      var open = item.classList.toggle("open");
      a.style.maxHeight = open ? a.scrollHeight + "px" : "0";
      q.setAttribute("aria-expanded", open ? "true" : "false");
    });
  });

  /* ================== filtry (sklep + galeria) ================== */
  document.querySelectorAll("[data-filter-group]").forEach(function (group) {
    var targetsSel = group.dataset.filterTargets;
    group.addEventListener("click", function (e) {
      var chip = e.target.closest(".chip");
      if (!chip) return;
      group.querySelectorAll(".chip").forEach(function (c) { c.classList.remove("active"); });
      chip.classList.add("active");
      var f = chip.dataset.filter;
      document.querySelectorAll(targetsSel).forEach(function (el) {
        el.classList.toggle("hide", f !== "all" && el.dataset.cat !== f);
      });
    });
  });

  /* ================== formularze mailto ================== */
  document.querySelectorAll("form[data-mailto]").forEach(function (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var d = new FormData(form);
      var lines = [];
      d.forEach(function (v, k) {
        if (v) lines.push((form.querySelector('[name="' + k + '"]').dataset.label || k) + ": " + v);
      });
      var href =
        "mailto:" + form.dataset.mailto +
        "?subject=" + encodeURIComponent(form.dataset.subject || "Wiadomość ze strony ABBA1") +
        "&body=" + encodeURIComponent("Dzień dobry,\n\n" + lines.join("\n") + "\n\n(wiadomość ze strony abba1)");
      window.location.href = href;
      var status = form.querySelector(".form-status");
      if (status) status.textContent = "Otwieramy Twój program pocztowy z gotową wiadomością…";
      toast("Przygotowano wiadomość e-mail ✉");
    });
  });

  /* ================== POS demo (dotykacka) ================== */
  var posTiles = document.getElementById("posTiles");
  if (posTiles) {
    var bill = [];
    var pbItems = document.getElementById("pbItems");
    var pbSum = document.getElementById("pbSum");
    function renderBill() {
      if (!bill.length) {
        pbItems.innerHTML = '<div class="pb-empty">Dotknij pozycji z menu,<br>aby nabić rachunek →</div>';
      } else {
        pbItems.innerHTML = bill
          .map(function (b) { return '<div class="pb-row"><span>' + b.qty + "× " + b.name + "</span><span>" + fmt(b.price * b.qty) + "</span></div>"; })
          .join("");
      }
      var total = bill.reduce(function (s, b) { return s + b.price * b.qty; }, 0);
      pbSum.innerHTML = "<span>SUMA</span><span>" + fmt(total) + "</span>";
    }
    posTiles.addEventListener("click", function (e) {
      var tile = e.target.closest(".pos-tile");
      if (!tile) return;
      var name = tile.dataset.name, price = +tile.dataset.price;
      var found = bill.find(function (b) { return b.name === name; });
      if (found) found.qty++;
      else bill.push({ name: name, price: price, qty: 1 });
      renderBill();
    });
    document.getElementById("pbPay").addEventListener("click", function () {
      if (!bill.length) { toast("Rachunek jest pusty"); return; }
      toast("Rachunek zamknięty — paragon wydrukowany 🧾");
      bill = [];
      renderBill();
    });
    renderBill();
  }
})();
