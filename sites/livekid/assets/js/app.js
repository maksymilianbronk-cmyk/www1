/* ==========================================================================
   KidBloom — aplikacja SPA (odpowiednik funkcji LiveKid)
   ========================================================================== */
(function () {
  "use strict";
  const KB = window.KB;
  const app = document.getElementById("app");

  /* ---------------- helpers ---------------- */
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const money = (n) => n.toLocaleString("pl-PL") + " zł";
  const plDate = (s) => { const d = new Date(s); return d.toLocaleDateString("pl-PL", { day: "numeric", month: "long", year: "numeric" }); };
  const plShort = (s) => { const d = new Date(s); return d.toLocaleDateString("pl-PL", { day: "2-digit", month: "2-digit" }); };
  const wday = (s) => new Date(s).toLocaleDateString("pl-PL", { weekday: "long" });
  const initials = (name) => name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  function toast(msg) {
    let t = document.querySelector(".toast");
    if (!t) { t = document.createElement("div"); t.className = "toast"; document.body.appendChild(t); }
    t.textContent = msg; t.classList.add("show");
    clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove("show"), 2400);
  }

  function modal(html) {
    let bg = document.getElementById("kb-modal");
    if (!bg) {
      bg = document.createElement("div"); bg.className = "modal-bg"; bg.id = "kb-modal";
      document.body.appendChild(bg);
      bg.addEventListener("click", (e) => { if (e.target === bg) closeModal(); });
    }
    bg.innerHTML = `<div class="modal">${html}</div>`;
    bg.classList.add("open");
  }
  function closeModal() { const bg = document.getElementById("kb-modal"); if (bg) bg.classList.remove("open"); }
  window.KBcloseModal = closeModal;

  /* ---------------- routing ---------------- */
  const NAV = {
    rodzic: [
      { g: "Moje dziecko" },
      { path: "pulpit", ico: "🏠", label: "Pulpit" },
      { path: "nieobecnosci", ico: "📅", label: "Nieobecności" },
      { path: "posilki", ico: "🍽️", label: "Posiłki i jadłospis" },
      { path: "galeria", ico: "📸", label: "Galeria" },
      { g: "Kontakt" },
      { path: "wiadomosci", ico: "💬", label: "Wiadomości", badge: "unread" },
      { path: "ogloszenia", ico: "📣", label: "Ogłoszenia" },
      { path: "kalendarz", ico: "🗓️", label: "Kalendarz" },
      { g: "Finanse" },
      { path: "platnosci", ico: "💳", label: "Płatności" },
    ],
    nauczyciel: [
      { g: "Grupa" },
      { path: "pulpit", ico: "🏠", label: "Pulpit" },
      { path: "obecnosc", ico: "✅", label: "Obecność" },
      { path: "raporty", ico: "📝", label: "Raporty dzienne" },
      { path: "dziennik", ico: "📖", label: "Dziennik elektroniczny" },
      { g: "Treści" },
      { path: "galeria", ico: "📸", label: "Galeria" },
      { path: "jadlospis", ico: "🍽️", label: "Jadłospis" },
      { path: "wiadomosci", ico: "💬", label: "Wiadomości" },
    ],
    dyrektor: [
      { g: "Placówka" },
      { path: "pulpit", ico: "📊", label: "Pulpit" },
      { path: "dzieci", ico: "🧒", label: "Dzieci i umowy" },
      { path: "kadry", ico: "👩‍🏫", label: "Kadry" },
      { g: "Finanse" },
      { path: "rozliczenia", ico: "🧾", label: "Rozliczenia i faktury" },
      { path: "raporty", ico: "📈", label: "Raporty" },
      { g: "Zarządzanie" },
      { path: "rekrutacja", ico: "📥", label: "Rekrutacja", badge: "rekrut" },
      { path: "ogloszenia", ico: "📣", label: "Ogłoszenia" },
      { path: "kalendarz", ico: "🗓️", label: "Kalendarz" },
    ],
  };

  const ROLE_META = {
    rodzic: { emoji: "👪", name: "Rodzic", color: "#ff8fab" },
    nauczyciel: { emoji: "👩‍🏫", name: "Nauczyciel", color: "#4aa8ff" },
    dyrektor: { emoji: "💼", name: "Dyrektor", color: "#0eb39e" },
  };

  /* ---------------- auth ---------------- */
  function renderAuth() {
    const data = KB.load();
    app.className = "";
    app.innerHTML = `
      <div class="auth">
        <div class="auth-card">
          <div class="brand"><span class="brand-dot">🌱</span> Kid<b>Bloom</b></div>
          <p class="auth-sub">System dla żłobków i przedszkoli — komunikacja, dziennik, rozliczenia i aplikacja dla rodzica w jednym miejscu.</p>
          <div class="auth-label">Zaloguj się jako</div>
          <div class="role-grid">
            <button class="role-btn" data-login="rodzic:p1">
              <span class="role-emoji" style="background:#ffe3ea">👪</span>
              <span><span class="role-name">Anna Kowalska</span><br><span class="role-desc">Rodzic · mama Zosi (grupa Motylki)</span></span>
            </button>
            <button class="role-btn" data-login="nauczyciel:t1">
              <span class="role-emoji" style="background:#e2effd">👩‍🏫</span>
              <span><span class="role-name">Magda Nowak</span><br><span class="role-desc">Nauczyciel · grupa Motylki</span></span>
            </button>
            <button class="role-btn" data-login="dyrektor:d1">
              <span class="role-emoji" style="background:#d9f5f0">💼</span>
              <span><span class="role-name">Ewa Zielińska</span><br><span class="role-desc">Dyrektor · ${esc(data.facility.name)}</span></span>
            </button>
          </div>
          <p class="auth-foot">Konta demonstracyjne — dane lokalne w przeglądarce. <a href="../../DOKUMENTACJA.md" target="_blank" rel="noopener">Dokumentacja</a></p>
        </div>
      </div>`;
    app.querySelectorAll("[data-login]").forEach((b) => b.addEventListener("click", () => {
      const [role, id] = b.dataset.login.split(":");
      KB.login(role, id);
      location.hash = `#/${role}/pulpit`;
      render();
    }));
  }

  /* ---------------- shell ---------------- */
  function unreadCount(sess) {
    const data = KB.load();
    // proste: liczba wątków, w których ostatnia wiadomość jest od drugiej strony
    let n = 0;
    data.messages.forEach((th) => {
      if (!th.participants.includes(sess.id)) return;
      const last = th.msgs[th.msgs.length - 1];
      if (last && last.from !== sess.id) n++;
    });
    return n;
  }

  function renderShell(sess, path, viewHtml, titleObj) {
    const data = KB.load();
    const meta = ROLE_META[sess.role];
    const user = sess.role === "dyrektor" ? data.director : (sess.role === "nauczyciel" ? KB.staffById(sess.id) : KB.parent(sess.id));
    const nav = NAV[sess.role];
    const badges = { unread: unreadCount(sess), rekrut: data.recruitment.filter((r) => r.status === "nowe").length };

    const navHtml = nav.map((n) => {
      if (n.g) return `<div class="nav-group-label">${esc(n.g)}</div>`;
      const active = n.path === path ? " active" : "";
      const bcount = n.badge ? badges[n.badge] : 0;
      const badge = bcount ? `<span class="nav-badge">${bcount}</span>` : "";
      return `<a class="nav-item${active}" href="#/${sess.role}/${n.path}"><span class="ni-ico">${n.ico}</span>${esc(n.label)}${badge}</a>`;
    }).join("");

    app.className = "app";
    app.innerHTML = `
      <aside class="sidebar" id="sidebar">
        <div class="side-brand"><span class="brand-dot">🌱</span> Kid<b style="color:var(--teal-d)">Bloom</b></div>
        ${navHtml}
        <div class="side-foot">
          <div class="side-user">
            <span class="av">${meta.emoji}</span>
            <span><span class="u-name">${esc(user.name)}</span><br><span class="u-role">${meta.name}</span></span>
          </div>
          <div class="side-actions">
            <button data-act="reset">↺ Reset demo</button>
            <button data-act="logout">Wyloguj</button>
          </div>
        </div>
      </aside>
      <div class="scrim" id="scrim"></div>
      <div>
        <div class="mtop">
          <button class="burger" id="burger">☰</button>
          <span class="m-brand">🌱 KidBloom</span>
        </div>
        <main class="main">
          <div class="topbar">
            <div>
              <div class="page-title">${esc(titleObj.title)}</div>
              ${titleObj.sub ? `<div class="page-sub">${esc(titleObj.sub)}</div>` : ""}
            </div>
            <div class="topbar-spacer"></div>
            <div class="date-chip">📆 ${plDate(KB.today)}</div>
          </div>
          <div id="view">${viewHtml}</div>
        </main>
      </div>`;

    // mobile toggle
    const sb = document.getElementById("sidebar"), scrim = document.getElementById("scrim");
    const burger = document.getElementById("burger");
    if (burger) burger.addEventListener("click", () => { sb.classList.add("open"); scrim.classList.add("on"); });
    if (scrim) scrim.addEventListener("click", () => { sb.classList.remove("open"); scrim.classList.remove("on"); });
    app.querySelectorAll(".nav-item").forEach((a) => a.addEventListener("click", () => { sb.classList.remove("open"); scrim.classList.remove("on"); }));
  }

  /* ---------------- global actions ---------------- */
  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-act]");
    if (!t) return;
    const act = t.dataset.act;
    const sess = KB.session();
    if (act === "logout") { KB.logout(); location.hash = ""; render(); return; }
    if (act === "reset") { if (confirm("Zresetować dane demo do stanu początkowego?")) { KB.reset(); toast("Dane demo zresetowane"); render(); } return; }
    if (ACTIONS[act]) { e.preventDefault(); ACTIONS[act](t, sess); }
  });

  document.addEventListener("submit", (e) => {
    const f = e.target.closest("form[data-act]");
    if (!f) return;
    e.preventDefault();
    const sess = KB.session();
    if (ACTIONS[f.dataset.act]) ACTIONS[f.dataset.act](f, sess);
  });

  /* ---------------- render dispatcher ---------------- */
  function render() {
    const sess = KB.session();
    if (!sess) { renderAuth(); return; }
    const hash = location.hash.replace(/^#\//, "");
    let [role, path] = hash.split("/");
    if (role !== sess.role || !path) { location.hash = `#/${sess.role}/pulpit`; return; }
    const fn = VIEWS[sess.role][path] || VIEWS[sess.role].pulpit;
    const out = fn(sess);
    renderShell(sess, path, out.html, { title: out.title, sub: out.sub });
    if (out.after) out.after(sess);
    window.scrollTo(0, 0);
  }
  window.addEventListener("hashchange", render);

  /* ============================================================
     WIDOKI — RODZIC
     ============================================================ */
  const VIEWS = { rodzic: {}, nauczyciel: {}, dyrektor: {} };

  function parentChild(sess) {
    const kids = KB.childrenOfParent(sess.id);
    const sel = sess._child && kids.find((k) => k.id === sess._child) ? sess._child : kids[0].id;
    return { kids, child: KB.child(sel) };
  }

  VIEWS.rodzic.pulpit = (sess) => {
    const { kids, child } = parentChild(sess);
    const data = KB.load();
    const grp = KB.group(child.groupId);
    const rep = KB.reportOf(child.id, KB.today);
    const ann = data.announcements.filter((a) => a.audience === "all").slice(0, 2);
    const nextEvent = data.events.filter((e) => e.date >= KB.today).sort((a, b) => a.date.localeCompare(b.date))[0];

    const childSwitch = kids.length > 1 ? `<div class="seg" style="margin-bottom:16px">${kids.map((k) => `<button class="${k.id === child.id ? "on" : ""}" data-act="switchChild" data-id="${k.id}">${k.avatar} ${esc(k.name.split(" ")[0])}</button>`).join("")}</div>` : "";

    const reportCard = rep ? `
      <div class="report-tiles">
        <div class="rtile"><div class="rt-ico">${rep.mood}</div><div class="rt-lbl">Nastrój</div></div>
        <div class="rtile"><div class="rt-ico">😴</div><div class="rt-lbl">Sen</div><div class="rt-val">${esc(rep.sleep)}</div></div>
        <div class="rtile"><div class="rt-ico">🍽️</div><div class="rt-lbl">Posiłki</div><div class="rt-val">${Object.keys(rep.meals).length}/3</div></div>
      </div>
      <p class="mt-16">${esc(rep.note)}</p>
      ${rep.photos && rep.photos.length ? `<div class="photo-grid mt-16">${rep.photos.map((p) => `<div class="photo">${p}</div>`).join("")}</div>` : ""}
    ` : `<div class="empty2"><div class="e-ico">⏳</div>Raport dzienny pojawi się po zajęciach.</div>`;

    return {
      title: `Cześć, ${esc(sess ? KB.parent(sess.id).name.split(" ")[0] : "")}! 👋`,
      sub: `${esc(child.name)} · grupa ${esc(grp.name)}`,
      html: `
        ${childSwitch}
        <div class="grid g-2">
          <div class="card2">
            <div class="card-h"><span class="avatar" style="background:${grp.color}22">${child.avatar}</span><div><h3>Raport dzienny</h3><span class="muted" style="font-size:.84rem">${plDate(KB.today)}</span></div></div>
            ${reportCard}
          </div>
          <div class="grid" style="align-content:start">
            <div class="card2">
              <div class="card-h"><h3>Szybkie akcje</h3></div>
              <button class="btn btn-coral btn-block" data-act="openAbsence" style="margin-bottom:10px">📅 Zgłoś nieobecność</button>
              <a class="btn btn-ghost btn-block" href="#/rodzic/wiadomosci" style="margin-bottom:10px">💬 Napisz do placówki</a>
              <a class="btn btn-ghost btn-block" href="#/rodzic/posilki">🍽️ Zamów posiłki</a>
            </div>
            ${nextEvent ? `<div class="card2"><div class="card-h"><h3>Najbliższe wydarzenie</h3></div><div class="row" style="border:none;padding:0"><span class="avatar" style="background:#fff2dc">🗓️</span><div class="r-main"><div class="r-title">${esc(nextEvent.title)}</div><div class="r-sub">${plDate(nextEvent.date)}</div></div></div></div>` : ""}
          </div>
        </div>
        <div class="card2 mt-16">
          <div class="card-h"><h3>📣 Ogłoszenia</h3><div class="spacer"></div><a href="#/rodzic/ogloszenia" class="muted" style="font-size:.85rem">wszystkie →</a></div>
          ${ann.map((a) => `<div class="row"><span class="avatar" style="background:#ffe3ea">📣</span><div class="r-main"><div class="r-title">${esc(a.title)}</div><div class="r-sub">${esc(a.body.slice(0, 90))}…</div></div>${a.pinned ? '<span class="pill pill-amber">📌 przypięte</span>' : ""}</div>`).join("")}
        </div>`,
    };
  };

  VIEWS.rodzic.nieobecnosci = (sess) => {
    const { child } = parentChild(sess);
    const data = KB.load();
    const abs = data.absences.filter((a) => a.childId === child.id).sort((a, b) => b.from.localeCompare(a.from));
    const att = KB.attendanceOf(child.id).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8);
    return {
      title: "Nieobecności",
      sub: "Zgłoś nieobecność z wyprzedzeniem — rozliczenie zostanie poprawione automatycznie.",
      html: `
        <button class="btn btn-coral" data-act="openAbsence" style="margin-bottom:18px">📅 Zgłoś nieobecność</button>
        <div class="grid g-2">
          <div class="card2">
            <div class="card-h"><h3>Zgłoszone nieobecności</h3></div>
            ${abs.length ? abs.map((a) => `<div class="row"><span class="avatar" style="background:#fde4e6">🚫</span><div class="r-main"><div class="r-title">${plDate(a.from)}${a.to !== a.from ? " – " + plDate(a.to) : ""}</div><div class="r-sub">${esc(a.reason || "brak powodu")}</div></div><span class="pill pill-red">nieobecność</span></div>`).join("") : `<div class="empty2"><div class="e-ico">✅</div>Brak zgłoszonych nieobecności.</div>`}
          </div>
          <div class="card2">
            <div class="card-h"><h3>Historia obecności</h3></div>
            ${att.map((a) => `<div class="row"><div class="r-main"><div class="r-title">${plDate(a.date)}</div><div class="r-sub">${a.present ? `w placówce ${a.checkIn || ""}–${a.checkOut || ""}` : "nieobecny/a"}</div></div>${a.present ? '<span class="pill pill-green">obecny</span>' : '<span class="pill pill-gray">nieobecny</span>'}</div>`).join("")}
          </div>
        </div>`,
    };
  };

  VIEWS.rodzic.posilki = (sess) => {
    const { child } = parentChild(sess);
    const data = KB.load();
    const menu = data.menu;
    const order = data.mealOrders.find((o) => o.childId === child.id && o.date === KB.today);
    const meals = ["śniadanie", "obiad", "podwieczorek"];
    const chosen = order ? order.meals : meals.slice();
    return {
      title: "Posiłki i jadłospis",
      sub: "Zaplanuj posiłki dziecka i sprawdź jadłospis na kolejne dni.",
      html: `
        <div class="grid g-2">
          <div class="card2">
            <div class="card-h"><h3>🍽️ Zamówienie na dziś</h3></div>
            <p class="muted" style="font-size:.88rem;margin-bottom:14px">Zaznacz posiłki, z których dziecko dziś skorzysta:</p>
            <form data-act="orderMeals">
              ${meals.map((m) => `<label class="row" style="cursor:pointer"><input type="checkbox" name="meal" value="${m}" ${chosen.includes(m) ? "checked" : ""} style="width:20px;height:20px;accent-color:var(--teal)"><div class="r-main"><div class="r-title" style="text-transform:capitalize">${m}</div></div></label>`).join("")}
              <button class="btn btn-primary btn-block mt-16">Zapisz zamówienie</button>
            </form>
          </div>
          <div class="card2">
            <div class="card-h"><h3>📋 Jadłospis tygodnia</h3></div>
            ${menu.map((d) => `
              <div class="menu-day">
                <div class="menu-date">${plShort(d.date)}<span style="text-transform:capitalize">${wday(d.date)}</span></div>
                <div>
                  <div class="meal-line"><b>Śniadanie</b> ${esc(d["śniadanie"])}</div>
                  <div class="meal-line"><b>Obiad</b> ${esc(d["obiad"])}</div>
                  <div class="meal-line"><b>Podwieczorek</b> ${esc(d["podwieczorek"])}</div>
                </div>
              </div>`).join("")}
          </div>
        </div>`,
    };
  };

  VIEWS.rodzic.galeria = (sess) => {
    const { child } = parentChild(sess);
    const data = KB.load();
    const albums = data.gallery.filter((a) => a.groupId === child.groupId);
    return {
      title: "Galeria",
      sub: "Zdjęcia z życia grupy. Chronimy wizerunek dzieci — zdjęcia widzą tylko rodzice.",
      html: albums.length ? albums.map((a) => `
        <div class="card2" style="margin-bottom:18px">
          <div class="card-h"><span class="avatar" style="background:#f0f7f5">📸</span><div><h3>${esc(a.title)}</h3><span class="muted" style="font-size:.84rem">${plDate(a.date)} · ${a.photos.length} zdjęć</span></div></div>
          <div class="photo-grid">${a.photos.map((p) => `<div class="photo">${p}</div>`).join("")}</div>
        </div>`).join("") : `<div class="empty2"><div class="e-ico">📷</div>Brak albumów.</div>`,
    };
  };

  VIEWS.rodzic.wiadomosci = (sess) => threadView(sess, "rodzic");
  VIEWS.nauczyciel.wiadomosci = (sess) => threadView(sess, "nauczyciel");

  function threadView(sess, role) {
    const data = KB.load();
    const threads = data.messages.filter((th) => th.participants.includes(sess.id));
    const activeId = sess._thread || (threads[0] && threads[0].id);
    const th = threads.find((t) => t.id === activeId) || threads[0];
    if (!th) return { title: "Wiadomości", sub: "", html: `<div class="empty2"><div class="e-ico">💬</div>Brak konwersacji.</div>` };
    const other = th.participants.find((p) => p !== sess.id);
    const otherName = KB.staffById(other) ? KB.staffById(other).name : (KB.parent(other) ? KB.parent(other).name : "Placówka");
    const list = threads.map((x) => {
      const o = x.participants.find((p) => p !== sess.id);
      const on = KB.staffById(o) ? KB.staffById(o).name : (KB.parent(o) ? KB.parent(o).name : x.title);
      const last = x.msgs[x.msgs.length - 1];
      return `<div class="row" style="cursor:pointer;${x.id === th.id ? "background:#f2f8f6;border-radius:10px" : ""}" data-act="openThread" data-id="${x.id}"><span class="avatar" style="background:var(--teal-l)">${initials(on)}</span><div class="r-main"><div class="r-title">${esc(on)}</div><div class="r-sub">${esc((last && last.text || "").slice(0, 34))}…</div></div></div>`;
    }).join("");
    const bubbles = th.msgs.map((m) => `<div class="bubble ${m.from === sess.id ? "me" : "them"}">${esc(m.text)}<span class="b-at">${esc(m.at)}</span></div>`).join("");
    return {
      title: "Wiadomości",
      sub: "Czaty indywidualne i grupowe z placówką.",
      html: `
        <div class="grid" style="grid-template-columns:300px 1fr">
          <div class="card2" style="align-self:start">${list}</div>
          <div class="card2">
            <div class="card-h"><span class="avatar" style="background:var(--teal-l)">${initials(otherName)}</span><h3>${esc(otherName)}</h3></div>
            <div class="chat" id="chatbox">${bubbles}</div>
            <form class="chat-input" data-act="sendMsg" data-thread="${th.id}">
              <input class="" name="text" placeholder="Napisz wiadomość…" autocomplete="off" style="padding:11px 13px;border:1.5px solid var(--line);border-radius:12px" required>
              <button class="btn btn-primary">Wyślij</button>
            </form>
          </div>
        </div>`,
      after: () => { const c = document.getElementById("chatbox"); if (c) c.scrollTop = c.scrollHeight; },
    };
  }

  VIEWS.rodzic.ogloszenia = () => {
    const data = KB.load();
    const ann = data.announcements.slice().sort((a, b) => (b.pinned - a.pinned) || b.date.localeCompare(a.date));
    return {
      title: "Ogłoszenia",
      sub: "Komunikaty od placówki.",
      html: ann.map((a) => `
        <div class="card2" style="margin-bottom:14px">
          <div class="card-h"><span class="avatar" style="background:#ffe3ea">📣</span><div><h3>${esc(a.title)} ${a.pinned ? '<span class="pill pill-amber">📌</span>' : ""}</h3><span class="muted" style="font-size:.82rem">${plDate(a.date)}</span></div></div>
          <p>${esc(a.body)}</p>
        </div>`).join(""),
    };
  };

  VIEWS.rodzic.kalendarz = () => calendarView("rodzic");
  VIEWS.dyrektor.kalendarz = () => calendarView("dyrektor");

  function calendarView(role) {
    const data = KB.load();
    const evs = data.events.slice().sort((a, b) => a.date.localeCompare(b.date));
    const typeColor = { "wydarzenie": "pill-teal", "zebranie": "pill-amber", "dzien-wolny": "pill-red" };
    return {
      title: "Kalendarz",
      sub: "Wydarzenia, zebrania i dni wolne.",
      html: `
        ${role === "dyrektor" ? `<button class="btn btn-primary" data-act="openEvent" style="margin-bottom:18px">＋ Dodaj wydarzenie</button>` : ""}
        <div class="card2">
          ${evs.map((e) => `<div class="row"><span class="avatar" style="background:#fff2dc">🗓️</span><div class="r-main"><div class="r-title">${esc(e.title)}</div><div class="r-sub">${plDate(e.date)} · ${wday(e.date)}</div></div><span class="pill ${typeColor[e.type] || "pill-gray"}">${esc(e.type.replace("-", " "))}</span></div>`).join("")}
        </div>`,
    };
  }

  VIEWS.rodzic.platnosci = (sess) => {
    const kids = KB.childrenOfParent(sess.id);
    let invoices = [];
    kids.forEach((k) => invoices.push(...KB.invoicesOf(k.id)));
    invoices.sort((a, b) => (a.paid - b.paid) || b.month.localeCompare(a.month));
    const due = invoices.filter((i) => !i.paid).reduce((s, i) => s + i.total, 0);
    return {
      title: "Płatności",
      sub: "Rachunki i faktury. Płatności online przez bramkę (demo).",
      html: `
        <div class="grid g-3" style="margin-bottom:18px">
          <div class="stat accent-coral"><div class="s-ico">💳</div><div class="s-val">${money(due)}</div><div class="s-lbl">Do zapłaty</div></div>
          <div class="stat accent-teal"><div class="s-ico">✅</div><div class="s-val">${invoices.filter((i) => i.paid).length}</div><div class="s-lbl">Opłacone faktury</div></div>
          <div class="stat accent-amber"><div class="s-ico">📄</div><div class="s-val">${invoices.length}</div><div class="s-lbl">Wszystkie faktury</div></div>
        </div>
        <div class="card2">
          <div class="card-h"><h3>Faktury</h3></div>
          <div class="wrap-scroll"><table class="tbl">
            <thead><tr><th>Numer</th><th>Dziecko</th><th>Miesiąc</th><th class="right">Kwota</th><th>Status</th><th></th></tr></thead>
            <tbody>${invoices.map((i) => { const ch = KB.child(i.childId); return `<tr>
              <td><b>${esc(i.number)}</b></td>
              <td>${ch.avatar} ${esc(ch.name)}</td>
              <td>${esc(i.month)}</td>
              <td class="right"><b>${money(i.total)}</b></td>
              <td>${i.paid ? '<span class="pill pill-green">opłacona</span>' : '<span class="pill pill-red">do zapłaty</span>'}</td>
              <td class="right">${i.paid ? "" : `<button class="btn btn-primary btn-sm" data-act="payInvoice" data-id="${i.id}">Zapłać</button>`}</td>
            </tr>`; }).join("")}</tbody>
          </table></div>
        </div>`,
    };
  };

  /* ============================================================
     WIDOKI — NAUCZYCIEL
     ============================================================ */
  VIEWS.nauczyciel.pulpit = (sess) => {
    const t = KB.staffById(sess.id);
    const grp = KB.group(t.groupId);
    const kids = KB.childrenOf(t.groupId);
    const data = KB.load();
    const todayAtt = data.attendance.filter((a) => a.date === KB.today && kids.some((k) => k.id === a.childId));
    const present = todayAtt.filter((a) => a.present).length;
    const reportsToday = data.reports.filter((r) => r.date === KB.today && kids.some((k) => k.id === r.childId)).length;
    const journalToday = data.journal.find((j) => j.groupId === grp.id && j.date === KB.today);
    return {
      title: `Grupa ${esc(grp.name)}`,
      sub: `${esc(t.name)} · ${kids.length} dzieci`,
      html: `
        <div class="grid g-4" style="margin-bottom:18px">
          <div class="stat accent-teal"><div class="s-ico">🧒</div><div class="s-val">${kids.length}</div><div class="s-lbl">Dzieci w grupie</div></div>
          <div class="stat accent-sky"><div class="s-ico">✅</div><div class="s-val">${present}/${kids.length}</div><div class="s-lbl">Obecnych dziś</div></div>
          <div class="stat accent-amber"><div class="s-ico">📝</div><div class="s-val">${reportsToday}/${kids.length}</div><div class="s-lbl">Raporty dzienne</div></div>
          <div class="stat accent-coral"><div class="s-ico">📖</div><div class="s-val">${journalToday ? "✓" : "—"}</div><div class="s-lbl">Wpis w dzienniku</div></div>
        </div>
        <div class="grid g-2">
          <div class="card2">
            <div class="card-h"><h3>Dzieci w grupie</h3><div class="spacer"></div><a href="#/nauczyciel/obecnosc" class="btn btn-ghost btn-sm">Obecność</a></div>
            ${kids.map((k) => { const a = todayAtt.find((x) => x.childId === k.id); const has = data.reports.some((r) => r.childId === k.id && r.date === KB.today); return `<div class="row"><span class="avatar" style="background:${grp.color}22">${k.avatar}</span><div class="r-main"><div class="r-title">${esc(k.name)}</div><div class="r-sub">${a && a.present ? "obecny/a" : "nieobecny/a"}</div></div>${has ? '<span class="pill pill-green">raport ✓</span>' : `<button class="btn btn-ghost btn-sm" data-act="openReport" data-id="${k.id}">＋ raport</button>`}</div>`; }).join("")}
          </div>
          <div class="grid" style="align-content:start">
            <div class="card2">
              <div class="card-h"><h3>Szybkie akcje</h3></div>
              <a class="btn btn-primary btn-block" href="#/nauczyciel/obecnosc" style="margin-bottom:10px">✅ Odnotuj obecność</a>
              <a class="btn btn-ghost btn-block" href="#/nauczyciel/dziennik" style="margin-bottom:10px">📖 Wpis do dziennika</a>
              <a class="btn btn-ghost btn-block" href="#/nauczyciel/galeria">📸 Dodaj zdjęcia</a>
            </div>
          </div>
        </div>`,
    };
  };

  VIEWS.nauczyciel.obecnosc = (sess) => {
    const t = KB.staffById(sess.id);
    const grp = KB.group(t.groupId);
    const kids = KB.childrenOf(t.groupId);
    const data = KB.load();
    return {
      title: "Obecność",
      sub: `Ewidencja obecności i godzin — grupa ${esc(grp.name)} · ${plDate(KB.today)}`,
      html: `
        <div class="card2">
          <div class="wrap-scroll"><table class="tbl">
            <thead><tr><th>Dziecko</th><th>Obecność</th><th>Przyjście</th><th>Wyjście</th></tr></thead>
            <tbody>${kids.map((k) => {
              let a = data.attendance.find((x) => x.childId === k.id && x.date === KB.today);
              const present = a ? a.present : false;
              return `<tr>
                <td><b>${k.avatar} ${esc(k.name)}</b></td>
                <td><div class="seg"><button class="${present ? "on" : ""}" data-act="setPresent" data-id="${k.id}" data-v="1">Obecny</button><button class="${!present ? "on" : ""}" data-act="setPresent" data-id="${k.id}" data-v="0">Nieob.</button></div></td>
                <td><input type="time" value="${a && a.checkIn || ""}" data-act="setTime" data-id="${k.id}" data-f="checkIn" ${present ? "" : "disabled"} style="padding:7px;border:1.5px solid var(--line);border-radius:9px"></td>
                <td><input type="time" value="${a && a.checkOut || ""}" data-act="setTime" data-id="${k.id}" data-f="checkOut" ${present ? "" : "disabled"} style="padding:7px;border:1.5px solid var(--line);border-radius:9px"></td>
              </tr>`;
            }).join("")}</tbody>
          </table></div>
        </div>`,
    };
  };

  VIEWS.nauczyciel.raporty = (sess) => {
    const t = KB.staffById(sess.id);
    const grp = KB.group(t.groupId);
    const kids = KB.childrenOf(t.groupId);
    const data = KB.load();
    return {
      title: "Raporty dzienne",
      sub: `Uzupełnij raport dla każdego dziecka — grupa ${esc(grp.name)}`,
      html: `
        <div class="card2">
          ${kids.map((k) => { const r = data.reports.find((x) => x.childId === k.id && x.date === KB.today); return `<div class="row"><span class="avatar" style="background:${grp.color}22">${k.avatar}</span><div class="r-main"><div class="r-title">${esc(k.name)}</div><div class="r-sub">${r ? `${r.mood} · sen ${esc(r.sleep)} · ${esc(r.note.slice(0, 40))}…` : "brak raportu na dziś"}</div></div><button class="btn ${r ? "btn-ghost" : "btn-primary"} btn-sm" data-act="openReport" data-id="${k.id}">${r ? "Edytuj" : "＋ Wypełnij"}</button></div>`; }).join("")}
        </div>`,
    };
  };

  VIEWS.nauczyciel.dziennik = (sess) => {
    const t = KB.staffById(sess.id);
    const grp = KB.group(t.groupId);
    const data = KB.load();
    const entries = data.journal.filter((j) => j.groupId === grp.id).sort((a, b) => b.date.localeCompare(a.date));
    return {
      title: "Dziennik elektroniczny",
      sub: `Temat zajęć, opis i realizacja podstawy programowej — grupa ${esc(grp.name)}`,
      html: `
        <button class="btn btn-primary" data-act="openJournal" style="margin-bottom:18px">＋ Nowy wpis</button>
        <div class="card2">
          ${entries.map((j) => `<div class="row"><span class="avatar" style="background:#e2effd">📖</span><div class="r-main"><div class="r-title">${esc(j.topic)} ${j.core ? `<span class="pill pill-teal">podst. ${esc(j.core)}</span>` : ""}</div><div class="r-sub">${plDate(j.date)} — ${esc(j.desc)}</div></div></div>`).join("")}
        </div>`,
    };
  };

  VIEWS.nauczyciel.galeria = (sess) => {
    const t = KB.staffById(sess.id);
    const grp = KB.group(t.groupId);
    const data = KB.load();
    const albums = data.gallery.filter((a) => a.groupId === grp.id);
    return {
      title: "Galeria",
      sub: `Albumy grupy ${esc(grp.name)}`,
      html: `
        <button class="btn btn-primary" data-act="openAlbum" style="margin-bottom:18px">＋ Nowy album</button>
        ${albums.map((a) => `<div class="card2" style="margin-bottom:18px"><div class="card-h"><span class="avatar" style="background:#f0f7f5">📸</span><div><h3>${esc(a.title)}</h3><span class="muted" style="font-size:.84rem">${plDate(a.date)} · ${a.photos.length} zdjęć</span></div><div class="spacer"></div><button class="btn btn-ghost btn-sm" data-act="addPhoto" data-id="${a.id}">＋ zdjęcie</button></div><div class="photo-grid">${a.photos.map((p) => `<div class="photo">${p}</div>`).join("")}</div></div>`).join("")}`,
    };
  };

  VIEWS.nauczyciel.jadlospis = () => {
    const data = KB.load();
    return {
      title: "Jadłospis",
      sub: "Jadłospis tygodnia widoczny dla rodziców.",
      html: `<div class="card2">${data.menu.map((d) => `
        <div class="menu-day"><div class="menu-date">${plShort(d.date)}<span style="text-transform:capitalize">${wday(d.date)}</span></div>
        <div><div class="meal-line"><b>Śniadanie</b> ${esc(d["śniadanie"])}</div><div class="meal-line"><b>Obiad</b> ${esc(d["obiad"])}</div><div class="meal-line"><b>Podwieczorek</b> ${esc(d["podwieczorek"])}</div></div></div>`).join("")}</div>`,
    };
  };

  /* ============================================================
     WIDOKI — DYREKTOR
     ============================================================ */
  VIEWS.dyrektor.pulpit = () => {
    const data = KB.load();
    const kids = data.children;
    const todayAtt = data.attendance.filter((a) => a.date === KB.today);
    const present = todayAtt.filter((a) => a.present).length;
    const attRate = todayAtt.length ? Math.round((present / todayAtt.length) * 100) : 0;
    const revenue = data.invoices.reduce((s, i) => s + i.total, 0);
    const arrears = data.invoices.filter((i) => !i.paid).reduce((s, i) => s + i.total, 0);
    const newRek = data.recruitment.filter((r) => r.status === "nowe").length;
    return {
      title: "Pulpit dyrektora",
      sub: `${esc(data.facility.name)} · ${esc(data.facility.city)}`,
      html: `
        <div class="grid g-4" style="margin-bottom:18px">
          <div class="stat accent-teal"><div class="s-ico">🧒</div><div class="s-val">${kids.length}</div><div class="s-lbl">Dzieci</div><div class="s-sub s-up">▲ ${data.groups.length} grupy</div></div>
          <div class="stat accent-sky"><div class="s-ico">✅</div><div class="s-val">${attRate}%</div><div class="s-lbl">Frekwencja dziś</div><div class="s-sub">${present}/${todayAtt.length} obecnych</div></div>
          <div class="stat accent-amber"><div class="s-ico">💰</div><div class="s-val">${money(revenue)}</div><div class="s-lbl">Przychód (07/2026)</div></div>
          <div class="stat accent-coral"><div class="s-ico">⚠️</div><div class="s-val">${money(arrears)}</div><div class="s-lbl">Zaległości</div></div>
        </div>
        <div class="grid g-2">
          <div class="card2">
            <div class="card-h"><h3>Frekwencja wg grup</h3></div>
            ${data.groups.map((g) => { const gk = KB.childrenOf(g.id); const ga = todayAtt.filter((a) => gk.some((k) => k.id === a.childId)); const p = ga.filter((a) => a.present).length; const rate = ga.length ? Math.round(p / ga.length * 100) : 0; return `<div class="row"><span class="avatar" style="background:${g.color}22">🧸</span><div class="r-main"><div class="r-title">${esc(g.name)} <span class="muted" style="font-weight:600">· ${esc(g.ageRange)}</span></div><div style="height:8px;background:#eef2f1;border-radius:6px;margin-top:6px;overflow:hidden"><div style="width:${rate}%;height:100%;background:${g.color}"></div></div></div><b>${rate}%</b></div>`; }).join("")}
          </div>
          <div class="grid" style="align-content:start">
            <div class="card2">
              <div class="card-h"><h3>Do zrobienia</h3></div>
              <a class="row" href="#/dyrektor/rekrutacja" style="text-decoration:none"><span class="avatar" style="background:#fde4e6">📥</span><div class="r-main"><div class="r-title">Nowe zgłoszenia rekrutacyjne</div><div class="r-sub">${newRek} oczekuje na decyzję</div></div>${newRek ? `<span class="nav-badge" style="position:static">${newRek}</span>` : ""}</a>
              <a class="row" href="#/dyrektor/rozliczenia" style="text-decoration:none"><span class="avatar" style="background:#fff2dc">🧾</span><div class="r-main"><div class="r-title">Zaległe płatności</div><div class="r-sub">${data.invoices.filter((i) => !i.paid).length} niezapłaconych faktur</div></div></a>
            </div>
          </div>
        </div>`,
    };
  };

  VIEWS.dyrektor.dzieci = () => {
    const data = KB.load();
    return {
      title: "Dzieci i umowy",
      sub: `${data.children.length} dzieci · ${data.contracts.filter((c) => c.status === "aktywna").length} aktywnych umów`,
      html: `
        <div class="card2">
          <div class="wrap-scroll"><table class="tbl">
            <thead><tr><th>Dziecko</th><th>Grupa</th><th>Rodzic</th><th>Umowa od</th><th class="right">Czesne</th><th>Status</th></tr></thead>
            <tbody>${data.children.map((c) => { const g = KB.group(c.groupId); const p = KB.parent(c.parentId); const u = KB.contractOf(c.id); return `<tr>
              <td><b>${c.avatar} ${esc(c.name)}</b><br><span class="muted" style="font-size:.78rem">ur. ${plDate(c.birth)}</span></td>
              <td><span class="pill" style="background:${g.color}22;color:${g.color}">${esc(g.name)}</span></td>
              <td>${esc(p.name)}<br><span class="muted" style="font-size:.78rem">${esc(p.phone)}</span></td>
              <td>${plDate(u.from)}</td>
              <td class="right">${money(u.monthlyFee)}</td>
              <td><span class="pill pill-green">${esc(u.status)}</span></td>
            </tr>`; }).join("")}</tbody>
          </table></div>
        </div>`,
    };
  };

  VIEWS.dyrektor.kadry = () => {
    const data = KB.load();
    return {
      title: "Kadry",
      sub: "Zespół placówki, kwalifikacje i czas pracy.",
      html: `
        <div class="card2">
          <div class="wrap-scroll"><table class="tbl">
            <thead><tr><th>Pracownik</th><th>Rola</th><th>Grupa</th><th>Kwalifikacje</th><th class="right">Godz./tydz.</th></tr></thead>
            <tbody>${data.staff.map((s) => { const g = s.groupId ? KB.group(s.groupId) : null; return `<tr>
              <td><b>${esc(s.name)}</b><br><span class="muted" style="font-size:.78rem">${esc(s.email)}</span></td>
              <td style="text-transform:capitalize">${esc(s.role)}</td>
              <td>${g ? `<span class="pill" style="background:${g.color}22;color:${g.color}">${esc(g.name)}</span>` : '<span class="pill pill-gray">specjalista</span>'}</td>
              <td>${esc(s.qualifications)}</td>
              <td class="right"><b>${s.hoursWeek}h</b></td>
            </tr>`; }).join("")}</tbody>
          </table></div>
        </div>`,
    };
  };

  VIEWS.dyrektor.rozliczenia = () => {
    const data = KB.load();
    const inv = data.invoices.slice().sort((a, b) => (a.paid - b.paid));
    const total = inv.reduce((s, i) => s + i.total, 0);
    const paid = inv.filter((i) => i.paid).reduce((s, i) => s + i.total, 0);
    return {
      title: "Rozliczenia i faktury",
      sub: "Automatyczne faktury na podstawie obecności. Generowanie i eksport.",
      html: `
        <div class="grid g-3" style="margin-bottom:18px">
          <div class="stat accent-teal"><div class="s-ico">💰</div><div class="s-val">${money(total)}</div><div class="s-lbl">Wartość faktur 07/2026</div></div>
          <div class="stat accent-sky"><div class="s-ico">✅</div><div class="s-val">${money(paid)}</div><div class="s-lbl">Opłacono</div></div>
          <div class="stat accent-coral"><div class="s-ico">⚠️</div><div class="s-val">${money(total - paid)}</div><div class="s-lbl">Zaległości</div></div>
        </div>
        <div class="card2">
          <div class="card-h"><h3>Faktury lipiec 2026</h3><div class="spacer"></div>
            <button class="btn btn-ghost btn-sm" data-act="regenInvoices">↻ Przelicz z obecności</button>
            <button class="btn btn-primary btn-sm" data-act="exportInvoices">⬇ Eksport CSV</button>
          </div>
          <div class="wrap-scroll"><table class="tbl">
            <thead><tr><th>Numer</th><th>Dziecko</th><th>Składniki</th><th class="right">Kwota</th><th>Status</th></tr></thead>
            <tbody>${inv.map((i) => { const ch = KB.child(i.childId); return `<tr>
              <td><b>${esc(i.number)}</b></td>
              <td>${ch.avatar} ${esc(ch.name)}</td>
              <td><span class="muted" style="font-size:.82rem">${i.items.map((it) => esc(it.name)).join("<br>")}</span></td>
              <td class="right"><b>${money(i.total)}</b></td>
              <td>${i.paid ? '<span class="pill pill-green">opłacona</span>' : '<span class="pill pill-red">niezapłacona</span>'}</td>
            </tr>`; }).join("")}</tbody>
          </table></div>
        </div>`,
    };
  };

  VIEWS.dyrektor.raporty = () => {
    const reports = [
      { ico: "📋", name: "Frekwencja miesięczna", desc: "Obecności wg dziecka i grupy", type: "attendance" },
      { ico: "💰", name: "Zestawienie płatności", desc: "Faktury, wpłaty i zaległości", type: "payments" },
      { ico: "📖", name: "Realizacja dziennika", desc: "Tematy zajęć i podstawa programowa", type: "journal" },
      { ico: "👩‍🏫", name: "Czas pracy kadry", desc: "Godziny wg pracownika i kwalifikacji", type: "staff" },
    ];
    return {
      title: "Raporty",
      sub: "Wybierz raport, zakres i pobierz zestawienie (CSV).",
      html: `<div class="grid g-2">${reports.map((r) => `
        <div class="card2"><div class="card-h"><span class="avatar" style="background:#f0f7f5">${r.ico}</span><div><h3>${esc(r.name)}</h3><span class="muted" style="font-size:.84rem">${esc(r.desc)}</span></div></div>
        <div class="field-row"><div class="field mb-0"><label>Miesiąc</label><select><option>Lipiec 2026</option><option>Czerwiec 2026</option></select></div><div class="field mb-0"><label>Grupa</label><select><option>Wszystkie</option>${KB.load().groups.map((g) => `<option>${esc(g.name)}</option>`).join("")}</select></div></div>
        <button class="btn btn-primary btn-block mt-16" data-act="exportReport" data-type="${r.type}">⬇ Pobierz CSV</button></div>`).join("")}</div>`,
    };
  };

  VIEWS.dyrektor.rekrutacja = () => {
    const data = KB.load();
    const rek = data.recruitment.slice().sort((a, b) => b.date.localeCompare(a.date));
    return {
      title: "Rekrutacja",
      sub: "Zgłoszenia z formularza. Akceptacja tworzy umowę i dodaje dziecko.",
      html: `<div class="card2"><div class="wrap-scroll"><table class="tbl">
        <thead><tr><th>Dziecko</th><th>Rodzic</th><th>Grupa (pref.)</th><th>Data zgłoszenia</th><th>Status</th><th></th></tr></thead>
        <tbody>${rek.map((r) => `<tr>
          <td><b>${esc(r.childName)}</b><br><span class="muted" style="font-size:.78rem">ur. ${plDate(r.birth)}</span></td>
          <td>${esc(r.parentName)}<br><span class="muted" style="font-size:.78rem">${esc(r.phone)}</span></td>
          <td>${esc(r.groupPref)}</td>
          <td>${plDate(r.date)}</td>
          <td>${r.status === "nowe" ? '<span class="pill pill-amber">nowe</span>' : r.status === "przyjete" ? '<span class="pill pill-green">przyjęte</span>' : '<span class="pill pill-gray">odrzucone</span>'}</td>
          <td class="right">${r.status === "nowe" ? `<button class="btn btn-primary btn-sm" data-act="acceptRek" data-id="${r.id}">Przyjmij</button> <button class="btn btn-ghost btn-sm" data-act="rejectRek" data-id="${r.id}">Odrzuć</button>` : ""}</td>
        </tr>`).join("")}</tbody>
      </table></div></div>`,
    };
  };

  VIEWS.dyrektor.ogloszenia = () => {
    const data = KB.load();
    const ann = data.announcements.slice().sort((a, b) => (b.pinned - a.pinned) || b.date.localeCompare(a.date));
    return {
      title: "Ogłoszenia",
      sub: "Publikuj komunikaty do rodziców i kadry.",
      html: `
        <button class="btn btn-primary" data-act="openAnn" style="margin-bottom:18px">＋ Nowe ogłoszenie</button>
        ${ann.map((a) => `<div class="card2" style="margin-bottom:14px"><div class="card-h"><span class="avatar" style="background:#ffe3ea">📣</span><div><h3>${esc(a.title)} ${a.pinned ? '<span class="pill pill-amber">📌</span>' : ""}</h3><span class="muted" style="font-size:.82rem">${plDate(a.date)}</span></div></div><p>${esc(a.body)}</p></div>`).join("")}`,
    };
  };

  /* ============================================================
     AKCJE
     ============================================================ */
  const ACTIONS = {
    switchChild(t, sess) { sess._child = t.dataset.id; KB.login(sess.role, sess.id); const s = KB.session(); s._child = t.dataset.id; localStorage.setItem(KB.SESSION, JSON.stringify(s)); render(); },
    openThread(t, sess) { const s = KB.session(); s._thread = t.dataset.id; localStorage.setItem(KB.SESSION, JSON.stringify(s)); render(); },

    openAbsence(t, sess) {
      const { kids } = parentChild(sess);
      modal(`
        <h3>Zgłoś nieobecność</h3>
        <p class="m-sub">Rozliczenie zostanie automatycznie skorygowane.</p>
        <form data-act="saveAbsence">
          ${kids.length > 1 ? `<div class="field"><label>Dziecko</label><select name="child">${kids.map((k) => `<option value="${k.id}">${esc(k.name)}</option>`).join("")}</select></div>` : `<input type="hidden" name="child" value="${kids[0].id}">`}
          <div class="field-row"><div class="field"><label>Od</label><input type="date" name="from" value="${KB.today}" required></div><div class="field"><label>Do</label><input type="date" name="to" value="${KB.today}" required></div></div>
          <div class="field"><label>Powód (opcjonalnie)</label><input name="reason" placeholder="np. przeziębienie"></div>
          <div class="modal-actions"><button type="button" class="btn btn-ghost" onclick="KBcloseModal()">Anuluj</button><button class="btn btn-coral">Zgłoś nieobecność</button></div>
        </form>`);
    },
    saveAbsence(f, sess) {
      const fd = new FormData(f); const data = KB.load();
      const childId = fd.get("child"), from = fd.get("from"), to = fd.get("to");
      data.absences.push({ id: KB.uid("abs"), childId, from, to, reason: fd.get("reason"), reportedBy: sess.id, createdAt: KB.today });
      // oznacz obecność jako nieobecną w zakresie
      let d = new Date(from), end = new Date(to);
      while (d <= end) {
        const ds = d.toISOString().slice(0, 10);
        let a = data.attendance.find((x) => x.childId === childId && x.date === ds);
        if (a) { a.present = false; a.checkIn = null; a.checkOut = null; }
        else data.attendance.push({ id: KB.uid("att"), childId, date: ds, present: false, checkIn: null, checkOut: null });
        d.setDate(d.getDate() + 1);
      }
      KB.save(); closeModal(); toast("Nieobecność zgłoszona ✓"); render();
    },

    orderMeals(f, sess) {
      const { child } = parentChild(sess); const data = KB.load();
      const meals = [...f.querySelectorAll('input[name="meal"]:checked')].map((c) => c.value);
      let o = data.mealOrders.find((x) => x.childId === child.id && x.date === KB.today);
      if (o) o.meals = meals; else data.mealOrders.push({ id: KB.uid("mo"), childId: child.id, date: KB.today, meals });
      KB.save(); toast("Zamówienie zapisane ✓");
    },

    payInvoice(t) {
      const data = KB.load(); const i = data.invoices.find((x) => x.id === t.dataset.id);
      if (i) { i.paid = true; KB.save(); toast("Płatność zaksięgowana ✓ (demo Przelewy24)"); render(); }
    },

    sendMsg(f, sess) {
      const data = KB.load(); const th = data.messages.find((x) => x.id === f.dataset.thread);
      const text = f.querySelector('[name="text"]').value.trim(); if (!text) return;
      const now = KB.today + " " + new Date().toTimeString().slice(0, 5);
      th.msgs.push({ from: sess.id, text, at: now });
      const s = KB.session(); s._thread = th.id; localStorage.setItem(KB.SESSION, JSON.stringify(s));
      KB.save(); render();
    },

    setPresent(t) {
      const data = KB.load(); const childId = t.dataset.id; const v = t.dataset.v === "1";
      let a = data.attendance.find((x) => x.childId === childId && x.date === KB.today);
      if (!a) { a = { id: KB.uid("att"), childId, date: KB.today, present: v, checkIn: v ? "08:00" : null, checkOut: null }; data.attendance.push(a); }
      else { a.present = v; if (!v) { a.checkIn = null; a.checkOut = null; } else if (!a.checkIn) a.checkIn = "08:00"; }
      KB.save(); render();
    },
    setTime(t) {
      const data = KB.load(); const a = data.attendance.find((x) => x.childId === t.dataset.id && x.date === KB.today);
      if (a) { a[t.dataset.f] = t.value; KB.save(); }
    },

    openReport(t) {
      const child = KB.child(t.dataset.id); const rep = KB.reportOf(child.id, KB.today) || {};
      const meals = ["śniadanie", "obiad", "podwieczorek"];
      const opts = ["", "wszystko", "połowa", "niewiele", "nie jadł/a"];
      modal(`
        <h3>Raport dzienny — ${esc(child.name)}</h3>
        <p class="m-sub">${plDate(KB.today)} <button class="ai-btn" data-act="aiReport" style="float:right">✨ Generuj opis AI</button></p>
        <form data-act="saveReport" data-child="${child.id}">
          <div class="field"><label>Nastrój</label><div class="seg" style="display:flex">${["😊", "🙂", "😐", "😴", "😢"].map((m) => `<label style="flex:1;text-align:center"><input type="radio" name="mood" value="${m}" ${rep.mood === m ? "checked" : ""} style="display:none"><span style="font-size:1.5rem;cursor:pointer;padding:6px;display:block;border-radius:8px" class="mood-opt">${m}</span></label>`).join("")}</div></div>
          <div class="field"><label>Sen / drzemka</label><input name="sleep" value="${esc(rep.sleep || "")}" placeholder="np. 1h 20min"></div>
          ${meals.map((m) => `<div class="field mb-0" style="margin-bottom:8px"><label style="text-transform:capitalize">${m}</label><select name="meal_${m}">${opts.map((o) => `<option ${rep.meals && rep.meals[m] === o ? "selected" : ""}>${o}</option>`).join("")}</select></div>`).join("")}
          <div class="field mt-16"><label>Notatka dla rodzica</label><textarea name="note" id="repNote" placeholder="Jak minął dzień?">${esc(rep.note || "")}</textarea></div>
          <div class="modal-actions"><button type="button" class="btn btn-ghost" onclick="KBcloseModal()">Anuluj</button><button class="btn btn-primary">Zapisz raport</button></div>
        </form>`);
      // podświetlenie wyboru nastroju
      document.querySelectorAll('input[name="mood"]').forEach((r) => r.addEventListener("change", () => {
        document.querySelectorAll(".mood-opt").forEach((s) => s.style.background = "");
        r.nextElementSibling.style.background = "var(--teal-l)";
      }));
      const checked = document.querySelector('input[name="mood"]:checked'); if (checked) checked.nextElementSibling.style.background = "var(--teal-l)";
    },
    aiReport() {
      const child = document.querySelector('form[data-act="saveReport"]').dataset.child;
      const name = KB.child(child).name.split(" ")[0];
      const samples = [
        `${name} miał/a dziś świetny humor. Chętnie uczestniczył/a w zajęciach plastycznych i bardzo dobrze zjadł/a posiłki.`,
        `Dziś ${name} aktywnie bawił/a się z rówieśnikami. Po obiedzie spokojnie odpoczywał/a podczas drzemki.`,
        `${name} z zaangażowaniem brał/a udział w zabawach ruchowych. Dzień minął pogodnie i bez problemów.`,
      ];
      document.getElementById("repNote").value = samples[Math.floor(Math.random() * samples.length)];
      toast("Opis wygenerowany przez AI ✨");
    },
    saveReport(f, sess) {
      const fd = new FormData(f); const data = KB.load(); const childId = f.dataset.child;
      const meals = {}; ["śniadanie", "obiad", "podwieczorek"].forEach((m) => { const v = fd.get("meal_" + m); if (v) meals[m] = v; });
      let r = data.reports.find((x) => x.childId === childId && x.date === KB.today);
      const payload = { mood: fd.get("mood") || "🙂", sleep: fd.get("sleep") || "—", meals, note: fd.get("note") || "", teacherId: sess.id };
      if (r) Object.assign(r, payload); else data.reports.push(Object.assign({ id: KB.uid("rap"), childId, date: KB.today, photos: [] }, payload));
      KB.save(); closeModal(); toast("Raport zapisany ✓"); render();
    },

    openJournal(t, sess) {
      modal(`
        <h3>Nowy wpis do dziennika</h3>
        <p class="m-sub">${plDate(KB.today)} <button class="ai-btn" data-act="aiJournal" style="float:right">✨ Generuj opis AI</button></p>
        <form data-act="saveJournal">
          <div class="field"><label>Temat zajęć</label><input name="topic" id="jTopic" placeholder="np. Kolory tęczy" required></div>
          <div class="field"><label>Opis realizacji</label><textarea name="desc" id="jDesc" placeholder="Przebieg zajęć…" required></textarea></div>
          <div class="field"><label>Obszar podstawy programowej</label><input name="core" placeholder="np. IV.8"></div>
          <div class="modal-actions"><button type="button" class="btn btn-ghost" onclick="KBcloseModal()">Anuluj</button><button class="btn btn-primary">Zapisz wpis</button></div>
        </form>`);
    },
    aiJournal() {
      const topic = document.getElementById("jTopic").value || "zajęcia tematyczne";
      document.getElementById("jDesc").value = `Zajęcia „${topic}" — dzieci aktywnie uczestniczyły w zabawach edukacyjnych rozwijających kreatywność, spostrzegawczość i współpracę w grupie. Realizacja treści zgodnie z podstawą programową wychowania przedszkolnego.`;
      toast("Opis wygenerowany przez AI ✨");
    },
    saveJournal(f, sess) {
      const fd = new FormData(f); const data = KB.load(); const t = KB.staffById(sess.id);
      data.journal.push({ id: KB.uid("dz"), groupId: t.groupId, date: KB.today, topic: fd.get("topic"), desc: fd.get("desc"), core: fd.get("core") || "", teacherId: sess.id });
      KB.save(); closeModal(); toast("Wpis dodany ✓"); render();
    },

    openAlbum(t, sess) {
      modal(`<h3>Nowy album</h3><p class="m-sub">Utwórz album zdjęć dla grupy.</p>
        <form data-act="saveAlbum"><div class="field"><label>Nazwa albumu</label><input name="title" placeholder="np. Dzień Sportu" required></div>
        <div class="modal-actions"><button type="button" class="btn btn-ghost" onclick="KBcloseModal()">Anuluj</button><button class="btn btn-primary">Utwórz</button></div></form>`);
    },
    saveAlbum(f, sess) {
      const data = KB.load(); const t = KB.staffById(sess.id);
      const pics = ["🎨", "⚽", "🧩", "🖼️", "🌳", "🎈"];
      data.gallery.push({ id: KB.uid("alb"), groupId: t.groupId, title: new FormData(f).get("title"), date: KB.today, photos: pics.slice(0, 3) });
      KB.save(); closeModal(); toast("Album utworzony ✓"); render();
    },
    addPhoto(t) {
      const data = KB.load(); const alb = data.gallery.find((a) => a.id === t.dataset.id);
      const pics = ["📷", "🎈", "🌈", "⭐", "🎨", "🧸", "🎭", "🎪"];
      alb.photos.push(pics[Math.floor(Math.random() * pics.length)]);
      KB.save(); toast("Zdjęcie dodane ✓"); render();
    },

    openAnn(t, sess) {
      modal(`<h3>Nowe ogłoszenie</h3><p class="m-sub">Trafi do rodziców i kadry. <button class="ai-btn" data-act="aiAnn" style="float:right">✨ AI</button></p>
        <form data-act="saveAnn"><div class="field"><label>Tytuł</label><input name="title" id="aTitle" required></div>
        <div class="field"><label>Treść</label><textarea name="body" id="aBody" required></textarea></div>
        <label class="row" style="cursor:pointer;border:none"><input type="checkbox" name="pinned" style="width:18px;height:18px;accent-color:var(--teal)"> <span>Przypnij na górze</span></label>
        <div class="modal-actions"><button type="button" class="btn btn-ghost" onclick="KBcloseModal()">Anuluj</button><button class="btn btn-primary">Opublikuj</button></div></form>`);
    },
    aiAnn() {
      const title = document.getElementById("aTitle").value || "Informacja";
      document.getElementById("aBody").value = `Szanowni Rodzice, uprzejmie informujemy o wydarzeniu „${title}". Prosimy o zapoznanie się ze szczegółami i potwierdzenie obecności dziecka. W razie pytań zapraszamy do kontaktu z placówką.`;
      toast("Treść wygenerowana ✨");
    },
    saveAnn(f, sess) {
      const fd = new FormData(f); const data = KB.load();
      data.announcements.push({ id: KB.uid("ann"), title: fd.get("title"), body: fd.get("body"), audience: "all", authorId: sess.id, date: KB.today, pinned: !!fd.get("pinned") });
      KB.save(); closeModal(); toast("Ogłoszenie opublikowane ✓"); render();
    },

    openEvent() {
      modal(`<h3>Nowe wydarzenie</h3><form data-act="saveEvent">
        <div class="field"><label>Nazwa</label><input name="title" required></div>
        <div class="field"><label>Data</label><input type="date" name="date" value="${KB.today}" required></div>
        <div class="field"><label>Typ</label><select name="type"><option value="wydarzenie">Wydarzenie</option><option value="zebranie">Zebranie</option><option value="dzien-wolny">Dzień wolny</option></select></div>
        <div class="modal-actions"><button type="button" class="btn btn-ghost" onclick="KBcloseModal()">Anuluj</button><button class="btn btn-primary">Dodaj</button></div></form>`);
    },
    saveEvent(f) {
      const fd = new FormData(f); const data = KB.load();
      data.events.push({ id: KB.uid("ev"), date: fd.get("date"), title: fd.get("title"), type: fd.get("type") });
      KB.save(); closeModal(); toast("Wydarzenie dodane ✓"); render();
    },

    acceptRek(t) {
      const data = KB.load(); const r = data.recruitment.find((x) => x.id === t.dataset.id);
      const grp = data.groups.find((g) => g.name === r.groupPref) || data.groups[0];
      const parentId = KB.uid("p"); const childId = KB.uid("c"); const contractId = KB.uid("u");
      data.parents.push({ id: parentId, name: r.parentName, email: "", phone: r.phone });
      data.children.push({ id: childId, name: r.childName, groupId: grp.id, parentId, birth: r.birth, avatar: "🧒", allergies: "brak", contractId });
      data.contracts.push({ id: contractId, childId, from: KB.today, monthlyFee: 650, mealFee: 18, status: "aktywna" });
      r.status = "przyjete";
      KB.save(); toast(`${r.childName} przyjęty/a — utworzono umowę ✓`); render();
    },
    rejectRek(t) {
      const data = KB.load(); const r = data.recruitment.find((x) => x.id === t.dataset.id);
      r.status = "odrzucone"; KB.save(); toast("Zgłoszenie odrzucone"); render();
    },

    regenInvoices() {
      const data = KB.load();
      data.invoices.forEach((inv) => {
        const c = KB.contractOf(inv.childId);
        const days = data.attendance.filter((a) => a.childId === inv.childId && a.present).length;
        const meals = days * c.mealFee;
        inv.items = [{ name: "Czesne (opłata stała)", amount: c.monthlyFee }, { name: `Wyżywienie (${days} dni × ${c.mealFee} zł)`, amount: meals }];
        inv.total = c.monthlyFee + meals;
      });
      KB.save(); toast("Faktury przeliczone z obecności ✓"); render();
    },
    exportInvoices() {
      const data = KB.load();
      const rows = [["Numer", "Dziecko", "Miesiąc", "Kwota", "Status"]];
      data.invoices.forEach((i) => rows.push([i.number, KB.child(i.childId).name, i.month, i.total, i.paid ? "opłacona" : "niezapłacona"]));
      downloadCSV("faktury_2026-07.csv", rows);
    },
    exportReport(t) {
      const data = KB.load(); const type = t.dataset.type; let rows;
      if (type === "attendance") { rows = [["Dziecko", "Grupa", "Dni obecne"]]; data.children.forEach((c) => rows.push([c.name, KB.group(c.groupId).name, data.attendance.filter((a) => a.childId === c.id && a.present).length])); }
      else if (type === "payments") { rows = [["Faktura", "Dziecko", "Kwota", "Status"]]; data.invoices.forEach((i) => rows.push([i.number, KB.child(i.childId).name, i.total, i.paid ? "opłacona" : "zaległość"])); }
      else if (type === "journal") { rows = [["Data", "Grupa", "Temat", "Podstawa"]]; data.journal.forEach((j) => rows.push([j.date, KB.group(j.groupId).name, j.topic, j.core])); }
      else { rows = [["Pracownik", "Rola", "Kwalifikacje", "Godz/tydz"]]; data.staff.forEach((s) => rows.push([s.name, s.role, s.qualifications, s.hoursWeek])); }
      downloadCSV(`raport_${type}.csv`, rows);
    },
  };

  function downloadCSV(name, rows) {
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: name });
    a.click(); URL.revokeObjectURL(a.href); toast("Plik CSV pobrany ✓");
  }

  /* ---------------- start ---------------- */
  render();
})();
