/* ==========================================================================
   KidBloom — aplikacja SPA (odpowiednik funkcji LiveKid). Wersja rozbudowana.
   ========================================================================== */
(function () {
  "use strict";
  const KB = window.KB, UI = window.UI;
  const app = document.getElementById("app");

  /* ---------------- helpers ---------------- */
  const esc = UI.esc;
  const money = (n) => Number(n).toLocaleString("pl-PL") + " zł";
  const plDate = (s) => new Date(s).toLocaleDateString("pl-PL", { day: "numeric", month: "long", year: "numeric" });
  const plShort = (s) => new Date(s).toLocaleDateString("pl-PL", { day: "2-digit", month: "2-digit" });
  const wday = (s) => new Date(s).toLocaleDateString("pl-PL", { weekday: "long" });
  const initials = (name) => name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  const first = (name) => name.split(" ")[0];
  const monthName = (m) => new Date(m + "-01").toLocaleDateString("pl-PL", { month: "long", year: "numeric" });

  /* stan widoku (kalendarz, zakładki, filtry) */
  const VS = { calY: 2026, calM: 6, tabs: {}, rozMonth: "2026-07", search: "", matCat: "all", matSearch: "" };

  function toast(msg) {
    let t = document.querySelector(".toast");
    if (!t) { t = document.createElement("div"); t.className = "toast"; document.body.appendChild(t); }
    t.textContent = msg; t.classList.add("show");
    clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove("show"), 2400);
  }
  function modal(html) {
    let bg = document.getElementById("kb-modal");
    if (!bg) { bg = document.createElement("div"); bg.className = "modal-bg"; bg.id = "kb-modal"; document.body.appendChild(bg); bg.addEventListener("click", (e) => { if (e.target === bg) closeModal(); }); }
    bg.innerHTML = `<div class="modal">${html}</div>`;
    bg.classList.add("open");
  }
  function closeModal() { const bg = document.getElementById("kb-modal"); if (bg) bg.classList.remove("open"); }
  window.KBcloseModal = closeModal;
  const tab = (key, def) => VS.tabs[key] || def;

  /* ---------------- nawigacja ---------------- */
  const NAV = {
    rodzic: [
      { g: "Moje dziecko" },
      { path: "pulpit", ico: "🏠", label: "Pulpit" },
      { path: "profil", ico: "🧒", label: "Profil dziecka" },
      { path: "nieobecnosci", ico: "📅", label: "Nieobecności" },
      { path: "posilki", ico: "🍽️", label: "Posiłki i jadłospis" },
      { path: "zajecia", ico: "🎭", label: "Zajęcia dodatkowe" },
      { path: "rozwoj", ico: "🌱", label: "Rozwój i obserwacje" },
      { path: "galeria", ico: "📸", label: "Galeria" },
      { path: "materialy", ico: "📚", label: "Materiały do domu" },
      { g: "Kontakt" },
      { path: "wiadomosci", ico: "💬", label: "Wiadomości", badge: "unread" },
      { path: "ogloszenia", ico: "📣", label: "Ogłoszenia" },
      { path: "kalendarz", ico: "🗓️", label: "Kalendarz" },
      { g: "Formalności" },
      { path: "platnosci", ico: "💳", label: "Płatności" },
      { path: "dokumenty", ico: "📄", label: "Dokumenty i zgody" },
    ],
    nauczyciel: [
      { g: "Grupa" },
      { path: "pulpit", ico: "🏠", label: "Pulpit" },
      { path: "obecnosc", ico: "✅", label: "Obecność" },
      { path: "raporty", ico: "📝", label: "Raporty dzienne" },
      { path: "dziennik", ico: "📖", label: "Dziennik elektroniczny" },
      { path: "plan", ico: "🕐", label: "Plan dnia" },
      { path: "obserwacje", ico: "🔎", label: "Obserwacje" },
      { g: "Treści" },
      { path: "galeria", ico: "📸", label: "Galeria" },
      { path: "jadlospis", ico: "🍽️", label: "Jadłospis" },
      { path: "materialy", ico: "📚", label: "Materiały" },
      { path: "wiadomosci", ico: "💬", label: "Wiadomości" },
    ],
    dyrektor: [
      { g: "Placówka" },
      { path: "pulpit", ico: "📊", label: "Pulpit" },
      { path: "dzieci", ico: "🧒", label: "Dzieci i umowy" },
      { path: "grupy", ico: "🧸", label: "Grupy" },
      { path: "zajecia", ico: "🎭", label: "Zajęcia dodatkowe" },
      { path: "kadry", ico: "👩‍🏫", label: "Kadry" },
      { g: "Finanse" },
      { path: "rozliczenia", ico: "🧾", label: "Rozliczenia i faktury" },
      { path: "raporty", ico: "📈", label: "Raporty" },
      { g: "Zarządzanie" },
      { path: "rekrutacja", ico: "📥", label: "Rekrutacja", badge: "rekrut" },
      { path: "ogloszenia", ico: "📣", label: "Ogłoszenia" },
      { path: "kalendarz", ico: "🗓️", label: "Kalendarz" },
      { path: "materialy", ico: "📚", label: "Materiały" },
      { path: "dokumenty", ico: "📄", label: "Dokumenty" },
      { path: "ustawienia", ico: "⚙️", label: "Ustawienia i dane" },
    ],
    samorzad: [
      { g: "Nadzór" },
      { path: "pulpit", ico: "📊", label: "Pulpit zbiorczy" },
      { path: "placowki", ico: "🏫", label: "Placówki" },
      { path: "dotacje", ico: "💰", label: "Dotacje" },
      { path: "raporty", ico: "📈", label: "Raporty zbiorcze" },
    ],
    specjalista: [
      { g: "Gabinet" },
      { path: "pulpit", ico: "🏠", label: "Pulpit" },
      { path: "podopieczni", ico: "🧒", label: "Podopieczni" },
      { path: "sesje", ico: "🗒️", label: "Dziennik sesji" },
      { path: "harmonogram", ico: "🕐", label: "Harmonogram" },
      { path: "wiadomosci", ico: "💬", label: "Wiadomości" },
    ],
  };

  const ROLE_META = {
    rodzic: { emoji: "👪", name: "Rodzic" },
    nauczyciel: { emoji: "👩‍🏫", name: "Nauczyciel" },
    dyrektor: { emoji: "💼", name: "Dyrektor" },
    samorzad: { emoji: "🏛️", name: "Samorząd" },
    specjalista: { emoji: "🗣️", name: "Specjalista" },
  };

  /* ---------------- ekran logowania ---------------- */
  function renderAuth() {
    const data = KB.load();
    app.className = "";
    app.innerHTML = `
      <div class="auth">
        <div class="auth-card">
          <div class="brand"><span class="brand-dot">🌱</span> Kid<b>Bloom</b></div>
          <p class="auth-sub">System dla żłobków i przedszkoli — komunikacja, dziennik elektroniczny, rozliczenia i aplikacja dla rodzica w jednym miejscu.</p>
          <div class="auth-label">Zaloguj się jako</div>
          <div class="role-grid">
            <button class="role-btn" data-login="rodzic:p1"><span class="role-emoji" style="background:#ffe3ea">👪</span><span><span class="role-name">Anna Kowalska</span><br><span class="role-desc">Rodzic · mama Zosi i Antka (Motylki)</span></span></button>
            <button class="role-btn" data-login="nauczyciel:t1"><span class="role-emoji" style="background:#e2effd">👩‍🏫</span><span><span class="role-name">Magda Nowak</span><br><span class="role-desc">Nauczyciel · grupa Motylki</span></span></button>
            <button class="role-btn" data-login="dyrektor:d1"><span class="role-emoji" style="background:#d9f5f0">💼</span><span><span class="role-name">Ewa Zielińska</span><br><span class="role-desc">Dyrektor · ${esc(data.facility.name)}</span></span></button>
            <button class="role-btn" data-login="samorzad:sm1"><span class="role-emoji" style="background:#efeaff">🏛️</span><span><span class="role-name">Wydział Edukacji</span><br><span class="role-desc">Samorząd · nadzór nad placówkami</span></span></button>
            <button class="role-btn" data-login="specjalista:s1"><span class="role-emoji" style="background:#e6f7ee">🗣️</span><span><span class="role-name">Julia Krawczyk</span><br><span class="role-desc">Specjalista · logopeda</span></span></button>
          </div>
          <p class="auth-foot">Konta demonstracyjne — dane lokalne w przeglądarce. <a href="o-systemie.html">O systemie</a> · <a href="DOKUMENTACJA.md" target="_blank" rel="noopener">Dokumentacja</a></p>
        </div>
      </div>`;
    app.querySelectorAll("[data-login]").forEach((b) => b.addEventListener("click", () => {
      const [role, id] = b.dataset.login.split(":");
      KB.login(role, id); location.hash = `#/${role}/pulpit`; render();
    }));
  }

  /* ---------------- powłoka ---------------- */
  function unreadCount(sess) {
    return KB.load().messages.filter((th) => th.participants.includes(sess.id) && th.msgs.length && th.msgs[th.msgs.length - 1].from !== sess.id).length;
  }
  function currentUser(sess) {
    const data = KB.load();
    if (sess.role === "dyrektor") return data.director;
    if (sess.role === "samorzad") return data.samorzad;
    if (sess.role === "nauczyciel" || sess.role === "specjalista") return KB.staffById(sess.id);
    return KB.parent(sess.id);
  }

  function renderShell(sess, path, out) {
    const data = KB.load();
    const meta = ROLE_META[sess.role];
    const user = currentUser(sess);
    const nav = NAV[sess.role];
    const badges = { unread: unreadCount(sess), rekrut: data.recruitment.filter((r) => r.status === "nowe").length };
    const notifs = KB.notifsOf(sess.id);
    const unreadN = notifs.filter((n) => !n.read).length;

    const navHtml = nav.map((n) => {
      if (n.g) return `<div class="nav-group-label">${esc(n.g)}</div>`;
      const active = n.path === path ? " active" : "";
      const bcount = n.badge ? badges[n.badge] : 0;
      return `<a class="nav-item${active}" href="#/${sess.role}/${n.path}"><span class="ni-ico">${n.ico}</span>${esc(n.label)}${bcount ? `<span class="nav-badge">${bcount}</span>` : ""}</a>`;
    }).join("");

    app.className = "app";
    app.innerHTML = `
      <aside class="sidebar" id="sidebar">
        <div class="side-brand"><span class="brand-dot">🌱</span> Kid<b style="color:var(--teal-d)">Bloom</b></div>
        ${navHtml}
        <div class="side-foot">
          <div class="side-user"><span class="av">${meta.emoji}</span><span><span class="u-name">${esc(user.name)}</span><br><span class="u-role">${meta.name}</span></span></div>
          <div class="side-actions"><button data-act="toggleTheme">${document.documentElement.getAttribute("data-theme") === "dark" ? "☀️ Jasny" : "🌙 Ciemny"}</button><button data-act="reset">↺ Reset</button><button data-act="logout">Wyloguj</button></div>
        </div>
      </aside>
      <div class="scrim" id="scrim"></div>
      <div>
        <div class="mtop"><button class="burger" id="burger">☰</button><span class="m-brand">🌱 KidBloom</span></div>
        <main class="main">
          <div class="topbar">
            <div><div class="page-title">${esc(out.title)}</div>${out.sub ? `<div class="page-sub">${esc(out.sub)}</div>` : ""}</div>
            <div class="topbar-spacer"></div>
            <div class="bell-wrap">
              <button class="bell" id="bell">🔔${unreadN ? `<span class="bell-badge">${unreadN}</span>` : ""}</button>
              <div class="notif-panel" id="notifPanel">
                <div class="np-head">Powiadomienia ${unreadN ? `<button class="ai-btn" data-act="readAllNotif">oznacz przeczytane</button>` : ""}</div>
                ${notifs.length ? notifs.slice().reverse().map((n) => `<div class="notif-item ${n.read ? "" : "unread"}"><span class="ni-emo">${n.icon}</span><div><div class="ni-tx">${esc(n.text)}</div><div class="ni-dt">${plDate(n.date)}</div></div></div>`).join("") : `<div class="notif-item"><div class="ni-tx muted">Brak powiadomień</div></div>`}
              </div>
            </div>
            <div class="date-chip">📆 ${plDate(KB.today)}</div>
          </div>
          <div id="view">${out.html}</div>
        </main>
      </div>`;

    const sb = document.getElementById("sidebar"), scrim = document.getElementById("scrim"), burger = document.getElementById("burger");
    if (burger) burger.addEventListener("click", () => { sb.classList.add("open"); scrim.classList.add("on"); });
    if (scrim) scrim.addEventListener("click", () => { sb.classList.remove("open"); scrim.classList.remove("on"); });
    app.querySelectorAll(".nav-item").forEach((a) => a.addEventListener("click", () => { sb.classList.remove("open"); scrim.classList.remove("on"); }));
    const bell = document.getElementById("bell"), panel = document.getElementById("notifPanel");
    if (bell) bell.addEventListener("click", (e) => { e.stopPropagation(); panel.classList.toggle("open"); });
    if (out.after) out.after(sess);
  }

  /* ---------------- akcje globalne ---------------- */
  document.addEventListener("click", (e) => {
    // zamknij panel powiadomień przy kliknięciu poza nim
    const panel = document.getElementById("notifPanel");
    if (panel && panel.classList.contains("open") && !e.target.closest(".bell-wrap")) panel.classList.remove("open");
    const t = e.target.closest("[data-act]");
    if (!t) return;
    const act = t.dataset.act, sess = KB.session();
    if (act === "logout") { KB.logout(); location.hash = ""; render(); return; }
    if (act === "reset") { if (confirm("Zresetować dane demo do stanu początkowego?")) { KB.reset(); toast("Dane demo zresetowane"); render(); } return; }
    if (ACTIONS[act]) { e.preventDefault(); e.stopPropagation(); ACTIONS[act](t, sess); }
  });
  document.addEventListener("change", (e) => {
    const t = e.target.closest('[data-act="importJSON"]');
    if (t) ACTIONS.importJSON(t, KB.session());
  });
  document.addEventListener("input", (e) => {
    const si = e.target.closest('[data-act="searchInput"]');
    if (si) return ACTIONS.searchInput(si, KB.session());
    const ms = e.target.closest('[data-act="matSearch"]');
    if (ms) return ACTIONS.matSearch(ms, KB.session());
  });
  document.addEventListener("submit", (e) => {
    const f = e.target.closest("form[data-act]"); if (!f) return;
    e.preventDefault(); const sess = KB.session();
    if (ACTIONS[f.dataset.act]) ACTIONS[f.dataset.act](f, sess);
  });

  /* ---------------- dispatcher ---------------- */
  function render() {
    const sess = KB.session();
    if (!sess) { renderAuth(); return; }
    let [role, path] = location.hash.replace(/^#\//, "").split("/");
    if (role !== sess.role || !path) { location.hash = `#/${sess.role}/pulpit`; return; }
    const fn = (VIEWS[sess.role] || {})[path] || VIEWS[sess.role].pulpit;
    renderShell(sess, path, fn(sess));
    window.scrollTo(0, 0);
  }
  window.addEventListener("hashchange", render);

  const VIEWS = { rodzic: {}, nauczyciel: {}, dyrektor: {}, samorzad: {}, specjalista: {} };

  /* helper: wybrane dziecko rodzica */
  function parentChild(sess) {
    const kids = KB.childrenOfParent(sess.id);
    const sel = (sess._child && kids.find((k) => k.id === sess._child)) ? sess._child : kids[0].id;
    return { kids, child: KB.child(sel) };
  }
  function childSwitcher(kids, child) {
    return kids.length > 1 ? `<div class="seg" style="margin-bottom:16px">${kids.map((k) => `<button class="${k.id === child.id ? "on" : ""}" data-act="switchChild" data-id="${k.id}">${k.avatar} ${esc(first(k.name))}</button>`).join("")}</div>` : "";
  }
  function attRate(childId, days) {
    const att = KB.attendanceOf(childId).slice(0, days || 999);
    if (!att.length) return 0;
    return Math.round(att.filter((a) => a.present).length / att.length * 100);
  }

  /* ============================================================ RODZIC */
  VIEWS.rodzic.pulpit = (sess) => {
    const { kids, child } = parentChild(sess);
    const data = KB.load();
    const grp = KB.group(child.groupId);
    const rep = KB.reportOf(child.id, KB.today);
    const ann = data.announcements.slice(0, 2);
    const nextEvent = data.events.filter((e) => e.date >= KB.today).sort((a, b) => a.date.localeCompare(b.date))[0];
    const invs = [];
    kids.forEach((k) => invs.push(...KB.invoicesOf(k.id)));
    const due = invs.filter((i) => !i.paid).reduce((s, i) => s + i.total, 0);
    const att = KB.attendanceOf(child.id).slice(0, 8).reverse();
    const trend = att.map((a) => ({ label: plShort(a.date), value: a.present ? 1 : 0 }));

    const reportCard = rep ? `
      <div class="report-tiles">
        <div class="rtile"><div class="rt-ico">${rep.mood}</div><div class="rt-lbl">Nastrój</div></div>
        <div class="rtile"><div class="rt-ico">😴</div><div class="rt-lbl">Sen</div><div class="rt-val">${esc(rep.sleep)}</div></div>
        <div class="rtile"><div class="rt-ico">🍽️</div><div class="rt-lbl">Posiłki</div><div class="rt-val">${Object.keys(rep.meals).length}/3</div></div>
      </div>
      <p class="mt-16">${esc(rep.note)}</p>
      ${rep.photos && rep.photos.length ? `<div class="photo-grid mt-16">${rep.photos.map((p) => `<div class="photo">${p}</div>`).join("")}</div>` : ""}`
      : `<div class="empty2"><div class="e-ico">⏳</div>Raport dzienny pojawi się po zajęciach.</div>`;

    return { title: `Cześć, ${esc(first(KB.parent(sess.id).name))}! 👋`, sub: `${esc(child.name)} · grupa ${esc(grp.name)} · ${KB.ageFrom(child.birth)} lata`, html: `
      ${childSwitcher(kids, child)}
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
          <div class="grid g-2" style="gap:14px">
            <div class="stat accent-teal"><div class="s-ico">📊</div><div class="s-val">${attRate(child.id, 30)}%</div><div class="s-lbl">Frekwencja (30 dni)</div></div>
            <div class="stat accent-coral"><div class="s-ico">💳</div><div class="s-val">${due ? money(due) : "0 zł"}</div><div class="s-lbl">Do zapłaty</div></div>
          </div>
        </div>
      </div>
      <div class="grid g-2 mt-16">
        <div class="card2"><div class="card-h"><h3>Obecność — ostatnie dni</h3></div>${UI.barChart(trend.map((t) => ({ label: t.label, value: t.value, color: t.value ? "var(--teal)" : "var(--line)" })), { height: 150, fmt: (v) => v ? "✓" : "–" })}</div>
        <div class="card2"><div class="card-h"><h3>📣 Ogłoszenia</h3><div class="spacer"></div><a href="#/rodzic/ogloszenia" class="muted" style="font-size:.85rem">wszystkie →</a></div>
          ${ann.map((a) => `<div class="row"><span class="avatar" style="background:#ffe3ea">📣</span><div class="r-main"><div class="r-title">${esc(a.title)}</div><div class="r-sub">${esc(a.body.slice(0, 70))}…</div></div>${a.pinned ? '<span class="pill pill-amber">📌</span>' : ""}</div>`).join("")}
          ${nextEvent ? `<div class="row"><span class="avatar" style="background:#fff2dc">🗓️</span><div class="r-main"><div class="r-title">${esc(nextEvent.title)}</div><div class="r-sub">Najbliższe wydarzenie · ${plDate(nextEvent.date)}</div></div></div>` : ""}
        </div>
      </div>` };
  };

  VIEWS.rodzic.profil = (sess) => {
    const { kids, child } = parentChild(sess);
    const grp = KB.group(child.groupId), parent = KB.parent(sess.id), u = KB.contractOf(child.id);
    return { title: "Profil dziecka", sub: "Dane, kontakt i informacje o pobycie.", html: `
      ${childSwitcher(kids, child)}
      <div class="grid g-2">
        <div class="card2">
          <div class="card-h"><span class="avatar" style="background:${grp.color}22;font-size:1.8rem;width:60px;height:60px">${child.avatar}</span><div><h3>${esc(child.name)}</h3><span class="muted">${KB.ageFrom(child.birth)} lata · grupa ${esc(grp.name)}</span></div></div>
          <table class="tbl"><tbody>
            <tr><td class="muted">Data urodzenia</td><td class="right"><b>${plDate(child.birth)}</b></td></tr>
            <tr><td class="muted">Grupa</td><td class="right"><span class="pill" style="background:${grp.color}22;color:${grp.color}">${esc(grp.name)}</span></td></tr>
            <tr><td class="muted">Alergie</td><td class="right"><b>${esc(child.allergies)}</b></td></tr>
            <tr><td class="muted">Dieta</td><td class="right">${esc(child.diet)}</td></tr>
            <tr><td class="muted">Deklarowane godziny</td><td class="right">${esc(u.hoursDeclared)}</td></tr>
          </tbody></table>
        </div>
        <div class="grid" style="align-content:start">
          <div class="card2">
            <div class="card-h"><h3>Rodzic / opiekun</h3></div>
            <div class="row"><span class="avatar" style="background:var(--teal-l)">${initials(parent.name)}</span><div class="r-main"><div class="r-title">${esc(parent.name)}</div><div class="r-sub">${esc(parent.phone)} · ${esc(parent.email)}</div></div></div>
          </div>
          <div class="card2">
            <div class="card-h"><h3>Umowa</h3></div>
            <table class="tbl"><tbody>
              <tr><td class="muted">Obowiązuje od</td><td class="right">${plDate(u.from)}</td></tr>
              <tr><td class="muted">Czesne miesięczne</td><td class="right"><b>${money(u.monthlyFee)}</b></td></tr>
              <tr><td class="muted">Stawka za posiłek</td><td class="right">${money(u.mealFee)}</td></tr>
              <tr><td class="muted">Status</td><td class="right"><span class="pill pill-green">${esc(u.status)}</span></td></tr>
            </tbody></table>
          </div>
        </div>
      </div>` };
  };

  VIEWS.rodzic.nieobecnosci = (sess) => {
    const { kids, child } = parentChild(sess);
    const data = KB.load();
    const abs = data.absences.filter((a) => a.childId === child.id).sort((a, b) => b.from.localeCompare(a.from));
    const att = KB.attendanceOf(child.id).sort((a, b) => b.date.localeCompare(a.date));
    const marks = {};
    att.forEach((a) => { marks[a.date] = [{ color: a.present ? "var(--green)" : "var(--red)", title: a.present ? "obecny" : "nieobecny" }]; });
    return { title: "Nieobecności", sub: "Zgłoś nieobecność z wyprzedzeniem — rozliczenie zostanie skorygowane automatycznie.", html: `
      ${childSwitcher(kids, child)}
      <button class="btn btn-coral" data-act="openAbsence" style="margin-bottom:18px">📅 Zgłoś nieobecność</button>
      <div class="grid g-2">
        <div class="card2">${UI.monthCalendar(VS.calY, VS.calM, marks, { today: KB.today })}<div class="legend mt-16"><span class="legend-item"><span class="legend-dot" style="background:var(--green)"></span>obecny</span><span class="legend-item"><span class="legend-dot" style="background:var(--red)"></span>nieobecny</span></div></div>
        <div class="card2">
          <div class="card-h"><h3>Zgłoszone nieobecności</h3></div>
          ${abs.length ? abs.map((a) => `<div class="row"><span class="avatar" style="background:#fde4e6">🚫</span><div class="r-main"><div class="r-title">${plDate(a.from)}${a.to !== a.from ? " – " + plDate(a.to) : ""}</div><div class="r-sub">${esc(a.reason || "brak powodu")}</div></div><span class="pill pill-red">${esc(a.type || "nieobecność")}</span></div>`).join("") : `<div class="empty2"><div class="e-ico">✅</div>Brak zgłoszonych nieobecności.</div>`}
        </div>
      </div>` };
  };

  VIEWS.rodzic.posilki = (sess) => {
    const { kids, child } = parentChild(sess);
    const data = KB.load();
    const order = data.mealOrders.find((o) => o.childId === child.id && o.date === KB.today);
    const meals = ["śniadanie", "obiad", "podwieczorek"];
    const chosen = order ? order.meals : meals.slice();
    return { title: "Posiłki i jadłospis", sub: "Zaplanuj posiłki dziecka i sprawdź jadłospis.", html: `
      ${childSwitcher(kids, child)}
      <div class="grid g-2">
        <div class="grid" style="align-content:start">
          <div class="card2">
            <div class="card-h"><h3>🍽️ Zamówienie na dziś</h3></div>
            ${child.diet !== "standardowa" ? `<div class="pill pill-amber" style="margin-bottom:12px">Dieta: ${esc(child.diet)}</div>` : ""}
            ${child.allergies !== "brak" ? `<div class="pill pill-red" style="margin-bottom:12px">Alergie: ${esc(child.allergies)}</div>` : ""}
            <form data-act="orderMeals">
              ${meals.map((m) => `<label class="row" style="cursor:pointer"><input type="checkbox" name="meal" value="${m}" ${chosen.includes(m) ? "checked" : ""} style="width:20px;height:20px;accent-color:var(--teal)"><div class="r-main"><div class="r-title" style="text-transform:capitalize">${m}</div></div></label>`).join("")}
              <button class="btn btn-primary btn-block mt-16">Zapisz zamówienie</button>
            </form>
          </div>
        </div>
        <div class="card2">
          <div class="card-h"><h3>📋 Jadłospis tygodnia</h3></div>
          ${data.menu.map((d) => `<div class="menu-day"><div class="menu-date">${plShort(d.date)}<span style="text-transform:capitalize">${wday(d.date)}</span></div><div><div class="meal-line"><b>Śniadanie</b> ${esc(d["śniadanie"])}</div><div class="meal-line"><b>Obiad</b> ${esc(d["obiad"])}</div><div class="meal-line"><b>Podwieczorek</b> ${esc(d["podwieczorek"])}</div></div></div>`).join("")}
        </div>
      </div>` };
  };

  VIEWS.rodzic.zajecia = (sess) => {
    const { kids, child } = parentChild(sess);
    const data = KB.load();
    const mine = data.classes.filter((z) => z.enrolled.includes(child.id));
    const monthly = mine.reduce((s, z) => s + z.price, 0);
    return { title: "Zajęcia dodatkowe", sub: "Zapisz dziecko na zajęcia — koszt zostanie doliczony do rachunku.", html: `
      ${childSwitcher(kids, child)}
      <div class="grid g-3" style="margin-bottom:18px">
        <div class="stat accent-teal"><div class="s-ico">🎭</div><div class="s-val">${mine.length}</div><div class="s-lbl">Zapisane zajęcia</div></div>
        <div class="stat accent-amber"><div class="s-ico">💰</div><div class="s-val">${money(monthly)}</div><div class="s-lbl">Miesięczny koszt</div></div>
        <div class="stat accent-sky"><div class="s-ico">📅</div><div class="s-val">${data.classes.length}</div><div class="s-lbl">Dostępne zajęcia</div></div>
      </div>
      <div class="grid g-2">${data.classes.map((z) => { const on = z.enrolled.includes(child.id); const full = z.enrolled.length >= z.capacity && !on; return `<div class="card2"><div class="card-h"><span class="avatar" style="background:#f3f0ff">🎭</span><div><h3>${esc(z.name)}</h3><span class="muted" style="font-size:.84rem">${esc(z.instructor)}</span></div><div class="spacer"></div><b>${money(z.price)}/mies.</b></div>
        <div class="flex" style="justify-content:space-between;margin-bottom:12px"><span class="pill pill-gray">${esc(z.day)}, ${esc(z.time)}</span><span class="muted" style="font-size:.82rem">${z.enrolled.length}/${z.capacity} miejsc</span></div>
        <button class="btn ${on ? "btn-ghost" : full ? "btn-ghost" : "btn-primary"} btn-block" data-act="enrollClass" data-id="${z.id}" ${full ? "disabled style=opacity:.5" : ""}>${on ? "✓ Zapisane — wypisz" : full ? "Brak miejsc" : "＋ Zapisz dziecko"}</button></div>`; }).join("")}</div>` };
  };

  VIEWS.rodzic.rozwoj = (sess) => {
    const { kids, child } = parentChild(sess);
    const data = KB.load();
    const obs = data.observations.filter((o) => o.childId === child.id).sort((a, b) => b.date.localeCompare(a.date));
    const areas = [
      { name: "Rozwój społeczny", val: 4 }, { name: "Rozwój poznawczy", val: 3 },
      { name: "Sprawność ruchowa", val: 5 }, { name: "Samodzielność", val: 4 }, { name: "Mowa i komunikacja", val: 3 },
    ];
    return { title: "Rozwój i obserwacje", sub: "Postępy dziecka i notatki obserwacyjne od nauczyciela.", html: `
      ${childSwitcher(kids, child)}
      <div class="grid g-2">
        <div class="card2">
          <div class="card-h"><h3>Obszary rozwoju</h3></div>
          ${areas.map((a) => `<div style="margin-bottom:14px"><div class="flex" style="justify-content:space-between"><span style="font-weight:700;font-size:.9rem">${esc(a.name)}</span><span class="stars" style="color:var(--amber)">${"★".repeat(a.val)}${"☆".repeat(5 - a.val)}</span></div><div class="bar mt-10"><span style="width:${a.val * 20}%"></span></div></div>`).join("")}
        </div>
        <div class="card2">
          <div class="card-h"><h3>Obserwacje nauczyciela</h3></div>
          ${obs.length ? obs.map((o) => `<div class="row"><span class="avatar" style="background:#e2effd">🔎</span><div class="r-main"><div class="r-title">${esc(o.area)} <span class="stars" style="color:var(--amber);font-size:.85rem">${"★".repeat(o.rating)}</span></div><div class="r-sub">${plDate(o.date)} — ${esc(o.text)}</div></div></div>`).join("") : `<div class="empty2"><div class="e-ico">🌱</div>Brak obserwacji.</div>`}
        </div>
      </div>` };
  };

  VIEWS.rodzic.galeria = (sess) => {
    const { kids, child } = parentChild(sess);
    const albums = KB.load().gallery.filter((a) => a.groupId === child.groupId);
    return { title: "Galeria", sub: "Zdjęcia z życia grupy. Chronimy wizerunek — widzą je tylko rodzice.", html: `
      ${childSwitcher(kids, child)}
      ${albums.length ? albums.map((a) => `<div class="card2" style="margin-bottom:18px"><div class="card-h"><span class="avatar" style="background:#f0f7f5">📸</span><div><h3>${esc(a.title)}</h3><span class="muted" style="font-size:.84rem">${plDate(a.date)} · ${a.photos.length} zdjęć</span></div></div><div class="photo-grid">${a.photos.map((p) => `<div class="photo">${p}</div>`).join("")}</div></div>`).join("") : `<div class="empty2"><div class="e-ico">📷</div>Brak albumów.</div>`}` };
  };

  VIEWS.rodzic.wiadomosci = (sess) => threadView(sess);
  VIEWS.nauczyciel.wiadomosci = (sess) => threadView(sess);

  function threadView(sess) {
    const data = KB.load();
    const threads = data.messages.filter((th) => th.participants.includes(sess.id));
    const activeId = sess._thread && threads.find((t) => t.id === sess._thread) ? sess._thread : (threads[0] && threads[0].id);
    const th = threads.find((t) => t.id === activeId) || threads[0];
    const otherName = (x) => { const o = x.participants.find((p) => p !== sess.id); return x.title || (KB.staffById(o) ? KB.staffById(o).name : (KB.parent(o) ? KB.parent(o).name : "Placówka")); };
    if (!th) return { title: "Wiadomości", sub: "", html: `<button class="btn btn-primary" data-act="newThread">＋ Nowa wiadomość</button><div class="empty2"><div class="e-ico">💬</div>Brak konwersacji.</div>` };
    const list = threads.map((x) => { const last = x.msgs[x.msgs.length - 1]; return `<div class="row" style="cursor:pointer;${x.id === th.id ? "background:#f2f8f6;border-radius:10px" : ""}" data-act="openThread" data-id="${x.id}"><span class="avatar" style="background:var(--teal-l)">${initials(otherName(x))}</span><div class="r-main"><div class="r-title">${esc(otherName(x))}</div><div class="r-sub">${esc((last && last.text || "").slice(0, 30))}…</div></div></div>`; }).join("");
    const bubbles = th.msgs.map((m) => `<div class="bubble ${m.from === sess.id ? "me" : "them"}">${esc(m.text)}<span class="b-at">${esc(m.at)}</span></div>`).join("");
    return { title: "Wiadomości", sub: "Czaty indywidualne i grupowe z placówką.", html: `
      <button class="btn btn-primary btn-sm" data-act="newThread" style="margin-bottom:14px">＋ Nowa wiadomość</button>
      <div class="grid" style="grid-template-columns:300px 1fr">
        <div class="card2" style="align-self:start">${list}</div>
        <div class="card2">
          <div class="card-h"><span class="avatar" style="background:var(--teal-l)">${initials(otherName(th))}</span><h3>${esc(otherName(th))}</h3></div>
          <div class="chat" id="chatbox">${bubbles}</div>
          <form class="chat-input" data-act="sendMsg" data-thread="${th.id}"><input name="text" placeholder="Napisz wiadomość…" autocomplete="off" style="padding:11px 13px;border:1.5px solid var(--line);border-radius:12px" required><button class="btn btn-primary">Wyślij</button></form>
        </div>
      </div>`, after: () => { const c = document.getElementById("chatbox"); if (c) c.scrollTop = c.scrollHeight; } };
  }

  VIEWS.rodzic.ogloszenia = () => announcementsView(false);
  function announcementsView(canPublish) {
    const ann = KB.load().announcements.slice().sort((a, b) => (b.pinned - a.pinned) || b.date.localeCompare(a.date));
    const catColor = { "wydarzenie": "pill-teal", "organizacja": "pill-amber", "żywienie": "pill-green" };
    return { title: "Ogłoszenia", sub: "Komunikaty od placówki.", html: `
      ${canPublish ? `<button class="btn btn-primary" data-act="openAnn" style="margin-bottom:18px">＋ Nowe ogłoszenie</button>` : ""}
      ${ann.map((a) => `<div class="card2" style="margin-bottom:14px"><div class="card-h"><span class="avatar" style="background:#ffe3ea">📣</span><div><h3>${esc(a.title)} ${a.pinned ? '<span class="pill pill-amber">📌</span>' : ""}</h3><span class="muted" style="font-size:.82rem">${plDate(a.date)}</span></div><div class="spacer"></div>${a.category ? `<span class="pill ${catColor[a.category] || "pill-gray"}">${esc(a.category)}</span>` : ""}</div><p>${esc(a.body)}</p></div>`).join("")}` };
  }

  VIEWS.rodzic.kalendarz = () => calendarView(false);
  VIEWS.dyrektor.kalendarz = () => calendarView(true);
  function calendarView(canAdd) {
    const data = KB.load();
    const marks = {};
    const typeColor = { "wydarzenie": "var(--teal)", "zebranie": "var(--amber)", "dzien-wolny": "var(--red)" };
    data.events.forEach((e) => { (marks[e.date] = marks[e.date] || []).push({ color: typeColor[e.type] || "var(--sky)", title: e.title }); });
    const evs = data.events.slice().sort((a, b) => a.date.localeCompare(b.date));
    return { title: "Kalendarz", sub: "Wydarzenia, zebrania i dni wolne.", html: `
      ${canAdd ? `<button class="btn btn-primary" data-act="openEvent" style="margin-bottom:18px">＋ Dodaj wydarzenie</button>` : ""}
      <div class="grid g-2">
        <div class="card2">${UI.monthCalendar(VS.calY, VS.calM, marks, { today: KB.today })}</div>
        <div class="card2"><div class="card-h"><h3>Nadchodzące</h3></div>${evs.filter((e) => e.date >= KB.today).map((e) => `<div class="row"><span class="avatar" style="background:#fff2dc">🗓️</span><div class="r-main"><div class="r-title">${esc(e.title)}</div><div class="r-sub">${plDate(e.date)} · ${wday(e.date)}</div></div><span class="pill" style="background:${(typeColor[e.type] || "#888")}22;color:${typeColor[e.type] || "#888"}">${esc(e.type.replace("-", " "))}</span></div>`).join("")}</div>
      </div>` };
  }

  VIEWS.rodzic.platnosci = (sess) => {
    const kids = KB.childrenOfParent(sess.id);
    let invoices = []; kids.forEach((k) => invoices.push(...KB.invoicesOf(k.id)));
    invoices.sort((a, b) => (a.paid - b.paid) || b.month.localeCompare(a.month));
    const due = invoices.filter((i) => !i.paid).reduce((s, i) => s + i.total, 0);
    const paidCount = invoices.filter((i) => i.paid).length;
    return { title: "Płatności", sub: "Rachunki i faktury. Płatności online (demo Przelewy24).", html: `
      <div class="grid g-3" style="margin-bottom:18px">
        <div class="stat accent-coral"><div class="s-ico">💳</div><div class="s-val">${money(due)}</div><div class="s-lbl">Do zapłaty</div></div>
        <div class="stat accent-teal"><div class="s-ico">✅</div><div class="s-val">${paidCount}</div><div class="s-lbl">Opłacone faktury</div></div>
        <div class="stat accent-amber"><div class="s-ico">📄</div><div class="s-val">${invoices.length}</div><div class="s-lbl">Wszystkie faktury</div></div>
      </div>
      <div class="card2"><div class="card-h"><h3>Faktury</h3></div>
        <div class="wrap-scroll"><table class="tbl"><thead><tr><th>Numer</th><th>Dziecko</th><th>Miesiąc</th><th class="right">Kwota</th><th>Status</th><th></th></tr></thead>
        <tbody>${invoices.map((i) => { const ch = KB.child(i.childId); return `<tr><td><b>${esc(i.number)}</b></td><td>${ch.avatar} ${esc(first(ch.name))}</td><td>${esc(monthName(i.month))}</td><td class="right"><b>${money(i.total)}</b></td><td>${i.paid ? '<span class="pill pill-green">opłacona</span>' : '<span class="pill pill-red">do zapłaty</span>'}</td><td class="right"><button class="btn btn-ghost btn-sm" data-act="printInvoice" data-id="${i.id}">🖨️</button>${i.paid ? "" : ` <button class="btn btn-primary btn-sm" data-act="payInvoice" data-id="${i.id}">Zapłać</button>`}</td></tr>`; }).join("")}</tbody></table></div>
      </div>` };
  };

  VIEWS.rodzic.dokumenty = (sess) => {
    const { kids, child } = parentChild(sess);
    const data = KB.load();
    const docs = data.documents.filter((d) => d.childId === child.id);
    const cons = data.consents.filter((c) => c.childId === child.id);
    return { title: "Dokumenty i zgody", sub: "Umowy, dokumenty oraz zgody RODO i na wizerunek.", html: `
      ${childSwitcher(kids, child)}
      <div class="grid g-2">
        <div class="card2"><div class="card-h"><h3>📄 Dokumenty</h3></div>
          ${docs.map((d) => `<div class="row"><span class="avatar" style="background:#f0f7f5">${d.type === "umowa" ? "📝" : "📋"}</span><div class="r-main"><div class="r-title">${esc(d.name)}</div><div class="r-sub">${plDate(d.date)}</div></div><button class="btn btn-ghost btn-sm" data-act="printDoc" data-name="${esc(d.name)}">🖨️ PDF</button></div>`).join("")}
        </div>
        <div class="card2"><div class="card-h"><h3>✅ Zgody</h3></div>
          ${cons.map((c) => `<div class="row"><span class="avatar" style="background:${c.granted ? "#e2f7ec" : "#fde4e6"}">${c.granted ? "✅" : "⛔"}</span><div class="r-main"><div class="r-title">${esc(c.name)}</div><div class="r-sub">${c.granted ? "udzielona " + plDate(c.date) : "brak zgody"}</div></div><div class="seg"><button class="${c.granted ? "on" : ""}" data-act="setConsent" data-id="${c.id}" data-v="1">Tak</button><button class="${!c.granted ? "on" : ""}" data-act="setConsent" data-id="${c.id}" data-v="0">Nie</button></div></div>`).join("")}
        </div>
      </div>` };
  };

  /* ============================================================ NAUCZYCIEL */
  VIEWS.nauczyciel.pulpit = (sess) => {
    const t = KB.staffById(sess.id), grp = KB.group(t.groupId), kids = KB.childrenOf(t.groupId), data = KB.load();
    const todayAtt = data.attendance.filter((a) => a.date === KB.today && kids.some((k) => k.id === a.childId));
    const present = todayAtt.filter((a) => a.present).length;
    const reportsToday = data.reports.filter((r) => r.date === KB.today && kids.some((k) => k.id === r.childId)).length;
    const journalToday = data.journal.find((j) => j.groupId === grp.id && j.date === KB.today);
    return { title: `Grupa ${esc(grp.name)}`, sub: `${esc(t.name)} · ${kids.length} dzieci · ${esc(grp.room)}`, html: `
      <div class="grid g-4" style="margin-bottom:18px">
        <div class="stat accent-teal"><div class="s-ico">🧒</div><div class="s-val">${kids.length}</div><div class="s-lbl">Dzieci w grupie</div></div>
        <div class="stat accent-sky"><div class="s-ico">✅</div><div class="s-val">${present}/${kids.length}</div><div class="s-lbl">Obecnych dziś</div></div>
        <div class="stat accent-amber"><div class="s-ico">📝</div><div class="s-val">${reportsToday}/${kids.length}</div><div class="s-lbl">Raporty dzienne</div></div>
        <div class="stat accent-coral"><div class="s-ico">📖</div><div class="s-val">${journalToday ? "✓" : "—"}</div><div class="s-lbl">Wpis w dzienniku</div></div>
      </div>
      <div class="grid g-2">
        <div class="card2"><div class="card-h"><h3>Dzieci w grupie</h3><div class="spacer"></div><a href="#/nauczyciel/obecnosc" class="btn btn-ghost btn-sm">Obecność</a></div>
          ${kids.map((k) => { const a = todayAtt.find((x) => x.childId === k.id); const has = data.reports.some((r) => r.childId === k.id && r.date === KB.today); return `<div class="row"><span class="avatar" style="background:${grp.color}22">${k.avatar}</span><div class="r-main"><div class="r-title">${esc(k.name)}</div><div class="r-sub">${a && a.present ? "obecny/a od " + (a.checkIn || "—") : "nieobecny/a"}${k.allergies !== "brak" ? ` · ⚠️ ${esc(k.allergies)}` : ""}</div></div>${has ? '<span class="pill pill-green">raport ✓</span>' : `<button class="btn btn-ghost btn-sm" data-act="openReport" data-id="${k.id}">＋ raport</button>`}</div>`; }).join("")}
        </div>
        <div class="card2" style="align-content:start">
          <div class="card-h"><h3>Szybkie akcje</h3></div>
          <a class="btn btn-primary btn-block" href="#/nauczyciel/obecnosc" style="margin-bottom:10px">✅ Odnotuj obecność</a>
          <a class="btn btn-ghost btn-block" href="#/nauczyciel/dziennik" style="margin-bottom:10px">📖 Wpis do dziennika</a>
          <a class="btn btn-ghost btn-block" href="#/nauczyciel/obserwacje" style="margin-bottom:10px">🔎 Dodaj obserwację</a>
          <a class="btn btn-ghost btn-block" href="#/nauczyciel/galeria">📸 Dodaj zdjęcia</a>
        </div>
      </div>` };
  };

  VIEWS.nauczyciel.obecnosc = (sess) => {
    const t = KB.staffById(sess.id), grp = KB.group(t.groupId), kids = KB.childrenOf(t.groupId), data = KB.load();
    const present = data.attendance.filter((a) => a.date === KB.today && kids.some((k) => k.id === a.childId) && a.present).length;
    return { title: "Obecność", sub: `Ewidencja obecności i godzin — grupa ${esc(grp.name)} · ${plDate(KB.today)}`, html: `
      <div class="toolbar"><div class="pill pill-teal">Obecnych: ${present}/${kids.length}</div><div style="flex:1"></div><button class="btn btn-ghost btn-sm" data-act="markAllPresent">✅ Zaznacz wszystkich obecnych</button></div>
      <div class="card2"><div class="wrap-scroll"><table class="tbl"><thead><tr><th>Dziecko</th><th>Obecność</th><th>Przyjście</th><th>Wyjście</th></tr></thead>
        <tbody>${kids.map((k) => { const a = data.attendance.find((x) => x.childId === k.id && x.date === KB.today); const p = a ? a.present : false; return `<tr><td><b>${k.avatar} ${esc(k.name)}</b></td><td><div class="seg"><button class="${p ? "on" : ""}" data-act="setPresent" data-id="${k.id}" data-v="1">Obecny</button><button class="${!p ? "on" : ""}" data-act="setPresent" data-id="${k.id}" data-v="0">Nieob.</button></div></td><td><input type="time" value="${a && a.checkIn || ""}" data-act="setTime" data-id="${k.id}" data-f="checkIn" ${p ? "" : "disabled"} style="padding:7px;border:1.5px solid var(--line);border-radius:9px"></td><td><input type="time" value="${a && a.checkOut || ""}" data-act="setTime" data-id="${k.id}" data-f="checkOut" ${p ? "" : "disabled"} style="padding:7px;border:1.5px solid var(--line);border-radius:9px"></td></tr>`; }).join("")}</tbody></table></div></div>` };
  };

  VIEWS.nauczyciel.raporty = (sess) => {
    const t = KB.staffById(sess.id), grp = KB.group(t.groupId), kids = KB.childrenOf(t.groupId), data = KB.load();
    return { title: "Raporty dzienne", sub: `Uzupełnij raport dla każdego dziecka — grupa ${esc(grp.name)}`, html: `
      <div class="card2">${kids.map((k) => { const r = data.reports.find((x) => x.childId === k.id && x.date === KB.today); return `<div class="row"><span class="avatar" style="background:${grp.color}22">${k.avatar}</span><div class="r-main"><div class="r-title">${esc(k.name)}</div><div class="r-sub">${r ? `${r.mood} · sen ${esc(r.sleep)} · ${esc(r.note.slice(0, 40))}…` : "brak raportu na dziś"}</div></div><button class="btn ${r ? "btn-ghost" : "btn-primary"} btn-sm" data-act="openReport" data-id="${k.id}">${r ? "Edytuj" : "＋ Wypełnij"}</button></div>`; }).join("")}</div>` };
  };

  VIEWS.nauczyciel.dziennik = (sess) => {
    const t = KB.staffById(sess.id), grp = KB.group(t.groupId), data = KB.load();
    const entries = data.journal.filter((j) => j.groupId === grp.id).sort((a, b) => b.date.localeCompare(a.date));
    return { title: "Dziennik elektroniczny", sub: `Temat, opis i realizacja podstawy programowej — grupa ${esc(grp.name)}`, html: `
      <button class="btn btn-primary" data-act="openJournal" style="margin-bottom:18px">＋ Nowy wpis</button>
      <div class="card2">${entries.map((j) => `<div class="row"><span class="avatar" style="background:#e2effd">📖</span><div class="r-main"><div class="r-title">${esc(j.topic)} ${j.core ? `<span class="pill pill-teal">podst. ${esc(j.core)}</span>` : ""}</div><div class="r-sub">${plDate(j.date)} — ${esc(j.desc)}</div></div></div>`).join("")}</div>` };
  };

  VIEWS.nauczyciel.plan = (sess) => {
    const t = KB.staffById(sess.id), grp = KB.group(t.groupId), data = KB.load();
    const plan = data.planDnia.filter((p) => p.groupId === grp.id).sort((a, b) => a.time.localeCompare(b.time));
    return { title: "Plan dnia", sub: `Ramowy rozkład dnia — grupa ${esc(grp.name)}`, html: `
      <button class="btn btn-primary" data-act="openPlan" style="margin-bottom:18px">＋ Dodaj punkt</button>
      <div class="card2"><div class="timeline">${plan.map((p) => `<div class="tl-item"><div class="tl-time">${esc(p.time)}</div><div class="flex" style="justify-content:space-between"><span style="font-weight:600">${esc(p.title)}</span><button class="btn btn-ghost btn-sm" data-act="delPlan" data-id="${p.id}">✕</button></div></div>`).join("")}</div></div>` };
  };

  VIEWS.nauczyciel.obserwacje = (sess) => {
    const t = KB.staffById(sess.id), grp = KB.group(t.groupId), kids = KB.childrenOf(t.groupId), data = KB.load();
    const obs = data.observations.filter((o) => kids.some((k) => k.id === o.childId)).sort((a, b) => b.date.localeCompare(a.date));
    return { title: "Obserwacje", sub: `Notatki obserwacyjne dzieci — grupa ${esc(grp.name)}`, html: `
      <button class="btn btn-primary" data-act="openObs" style="margin-bottom:18px">＋ Nowa obserwacja</button>
      <div class="card2">${obs.length ? obs.map((o) => { const ch = KB.child(o.childId); return `<div class="row"><span class="avatar" style="background:${grp.color}22">${ch.avatar}</span><div class="r-main"><div class="r-title">${esc(ch.name)} · ${esc(o.area)} <span class="stars" style="color:var(--amber);font-size:.85rem">${"★".repeat(o.rating)}</span></div><div class="r-sub">${plDate(o.date)} — ${esc(o.text)}</div></div></div>`; }).join("") : `<div class="empty2"><div class="e-ico">🔎</div>Brak obserwacji.</div>`}</div>` };
  };

  VIEWS.nauczyciel.galeria = (sess) => {
    const t = KB.staffById(sess.id), grp = KB.group(t.groupId);
    const albums = KB.load().gallery.filter((a) => a.groupId === grp.id);
    return { title: "Galeria", sub: `Albumy grupy ${esc(grp.name)}`, html: `
      <button class="btn btn-primary" data-act="openAlbum" style="margin-bottom:18px">＋ Nowy album</button>
      ${albums.map((a) => `<div class="card2" style="margin-bottom:18px"><div class="card-h"><span class="avatar" style="background:#f0f7f5">📸</span><div><h3>${esc(a.title)}</h3><span class="muted" style="font-size:.84rem">${plDate(a.date)} · ${a.photos.length} zdjęć</span></div><div class="spacer"></div><button class="btn btn-ghost btn-sm" data-act="addPhoto" data-id="${a.id}">＋ zdjęcie</button></div><div class="photo-grid">${a.photos.map((p) => `<div class="photo">${p}</div>`).join("")}</div></div>`).join("")}` };
  };

  VIEWS.nauczyciel.jadlospis = () => {
    const data = KB.load();
    return { title: "Jadłospis", sub: "Jadłospis tygodnia widoczny dla rodziców. Kliknij danie, aby edytować.", html: `
      <div class="card2">${data.menu.map((d, i) => `<div class="menu-day"><div class="menu-date">${plShort(d.date)}<span style="text-transform:capitalize">${wday(d.date)}</span></div><div>${["śniadanie", "obiad", "podwieczorek"].map((m) => `<div class="meal-line"><b style="text-transform:capitalize">${m}</b> <span style="flex:1;cursor:pointer" data-act="editMeal" data-i="${i}" data-m="${m}">${esc(d[m])} ✎</span></div>`).join("")}</div></div>`).join("")}</div>` };
  };

  /* ============================================================ DYREKTOR */
  VIEWS.dyrektor.pulpit = () => {
    const data = KB.load(), kids = data.children;
    const todayAtt = data.attendance.filter((a) => a.date === KB.today);
    const present = todayAtt.filter((a) => a.present).length;
    const attR = todayAtt.length ? Math.round(present / todayAtt.length * 100) : 0;
    const revenue = data.invoices.filter((i) => i.month === "2026-07").reduce((s, i) => s + i.total, 0);
    const arrears = data.invoices.filter((i) => i.month === "2026-07" && !i.paid).reduce((s, i) => s + i.total, 0);
    const newRek = data.recruitment.filter((r) => r.status === "nowe").length;
    const days = [...new Set(data.attendance.map((a) => a.date))].sort().slice(-10);
    const trend = days.map((d) => { const day = data.attendance.filter((a) => a.date === d); const p = day.filter((a) => a.present).length; return { label: plShort(d), value: day.length ? Math.round(p / day.length * 100) : 0 }; });
    const groupSeg = data.groups.map((g) => ({ label: g.name, value: KB.childrenOf(g.id).length, color: g.color }));
    return { title: "Pulpit dyrektora", sub: `${esc(data.facility.name)} · ${esc(data.facility.city)}`, html: `
      <div class="grid g-4" style="margin-bottom:18px">
        <div class="stat accent-teal"><div class="s-ico">🧒</div><div class="s-val">${kids.length}</div><div class="s-lbl">Dzieci</div><div class="s-sub">${data.groups.length} grupy · ${data.staff.length} kadry</div></div>
        <div class="stat accent-sky"><div class="s-ico">✅</div><div class="s-val">${attR}%</div><div class="s-lbl">Frekwencja dziś</div><div class="s-sub">${present}/${todayAtt.length} obecnych</div></div>
        <div class="stat accent-amber"><div class="s-ico">💰</div><div class="s-val">${money(revenue)}</div><div class="s-lbl">Przychód (07/2026)</div></div>
        <div class="stat accent-coral"><div class="s-ico">⚠️</div><div class="s-val">${money(arrears)}</div><div class="s-lbl">Zaległości</div></div>
      </div>
      <div class="grid g-2">
        <div class="card2"><div class="card-h"><h3>Trend frekwencji (10 dni)</h3></div>${UI.lineChart(trend, { suffix: "%", labelEvery: 3, min: 40 })}</div>
        <div class="card2"><div class="card-h"><h3>Dzieci wg grup</h3></div><div class="flex" style="gap:20px;justify-content:center;flex-wrap:wrap">${UI.donut(groupSeg, { center: String(kids.length), centerSub: "dzieci" })}<div>${UI.legend(groupSeg)}</div></div></div>
      </div>
      <div class="grid g-2 mt-16">
        <div class="card2"><div class="card-h"><h3>Frekwencja wg grup (dziś)</h3></div>
          ${data.groups.map((g) => { const gk = KB.childrenOf(g.id); const ga = todayAtt.filter((a) => gk.some((k) => k.id === a.childId)); const p = ga.filter((a) => a.present).length; const rate = ga.length ? Math.round(p / ga.length * 100) : 0; return `<div class="row"><span class="avatar" style="background:${g.color}22">🧸</span><div class="r-main"><div class="r-title">${esc(g.name)} <span class="muted" style="font-weight:600">· ${esc(g.ageRange)}</span></div><div class="bar mt-10"><span style="width:${rate}%;background:${g.color}"></span></div></div><b>${rate}%</b></div>`; }).join("")}
        </div>
        <div class="card2"><div class="card-h"><h3>Do zrobienia</h3></div>
          <a class="row" href="#/dyrektor/rekrutacja" style="text-decoration:none"><span class="avatar" style="background:#fde4e6">📥</span><div class="r-main"><div class="r-title">Nowe zgłoszenia rekrutacyjne</div><div class="r-sub">${newRek} oczekuje na decyzję</div></div>${newRek ? `<span class="nav-badge" style="position:static">${newRek}</span>` : ""}</a>
          <a class="row" href="#/dyrektor/rozliczenia" style="text-decoration:none"><span class="avatar" style="background:#fff2dc">🧾</span><div class="r-main"><div class="r-title">Zaległe płatności</div><div class="r-sub">${data.invoices.filter((i) => i.month === "2026-07" && !i.paid).length} niezapłaconych faktur</div></div></a>
          <a class="row" href="#/dyrektor/kadry" style="text-decoration:none"><span class="avatar" style="background:#e2effd">👩‍🏫</span><div class="r-main"><div class="r-title">Nieobecności kadry</div><div class="r-sub">${data.staffAbsences.length} zaplanowanych</div></div></a>
        </div>
      </div>` };
  };

  VIEWS.dyrektor.dzieci = () => {
    const data = KB.load();
    const q = (VS.search || "").toLowerCase();
    const list = data.children.filter((c) => c.name.toLowerCase().includes(q));
    return { title: "Dzieci i umowy", sub: `${data.children.length} dzieci · ${data.contracts.filter((c) => c.status === "aktywna").length} aktywnych umów`, html: `
      <div class="toolbar"><div class="search"><input placeholder="Szukaj dziecka…" data-act="searchInput" value="${esc(VS.search)}"></div><button class="btn btn-primary" data-act="openAddChild">＋ Dodaj dziecko</button></div>
      <div class="card2"><div class="wrap-scroll"><table class="tbl"><thead><tr><th>Dziecko</th><th>Grupa</th><th>Rodzic</th><th>Umowa od</th><th class="right">Czesne</th><th>Status</th></tr></thead>
        <tbody>${list.map((c) => { const g = KB.group(c.groupId), p = KB.parent(c.parentId), u = KB.contractOf(c.id); return `<tr style="cursor:pointer" data-act="openChildDetail" data-id="${c.id}"><td><b>${c.avatar} ${esc(c.name)}</b><br><span class="muted" style="font-size:.78rem">${KB.ageFrom(c.birth)} lata${c.allergies !== "brak" ? " · ⚠️ " + esc(c.allergies) : ""}</span></td><td><span class="pill" style="background:${g.color}22;color:${g.color}">${esc(g.name)}</span></td><td>${esc(p.name)}<br><span class="muted" style="font-size:.78rem">${esc(p.phone)}</span></td><td>${plDate(u.from)}</td><td class="right">${money(u.monthlyFee)}</td><td><span class="pill pill-green">${esc(u.status)}</span></td></tr>`; }).join("")}</tbody></table></div>
        <p class="muted mt-16" style="font-size:.82rem">💡 Kliknij dziecko, aby zobaczyć pełny profil (frekwencja, faktury, obserwacje, sesje).</p>
        ${list.length === 0 ? `<div class="empty2"><div class="e-ico">🔍</div>Brak wyników.</div>` : ""}
      </div>` };
  };

  VIEWS.dyrektor.grupy = () => {
    const data = KB.load();
    return { title: "Grupy", sub: `${data.groups.length} grup w placówce`, html: `
      <div class="grid g-2">${data.groups.map((g) => { const kids = KB.childrenOf(g.id); const teacher = data.staff.find((s) => s.id === (g.teacherIds || [])[0]); return `<div class="card2"><div class="card-h"><span class="avatar" style="background:${g.color}22;font-size:1.5rem">🧸</span><div><h3>${esc(g.name)}</h3><span class="muted" style="font-size:.84rem">${esc(g.ageRange)} · ${esc(g.room)}</span></div><div class="spacer"></div><span class="pill" style="background:${g.color}22;color:${g.color}">${kids.length} dzieci</span></div><div class="r-sub" style="margin-bottom:10px">Wychowawca: <b>${teacher ? esc(teacher.name) : "—"}</b></div><div class="photo-grid" style="grid-template-columns:repeat(auto-fill,minmax(44px,1fr))">${kids.map((k) => `<div class="photo" style="font-size:1.3rem" title="${esc(k.name)}">${k.avatar}</div>`).join("")}</div></div>`; }).join("")}</div>` };
  };

  VIEWS.dyrektor.zajecia = () => {
    const data = KB.load();
    const totalRevenue = data.classes.reduce((s, z) => s + z.price * z.enrolled.length, 0);
    const totalEnroll = data.classes.reduce((s, z) => s + z.enrolled.length, 0);
    return { title: "Zajęcia dodatkowe", sub: "Oferta zajęć płatnych, instruktorzy i zapisy.", html: `
      <div class="toolbar"><button class="btn btn-primary" data-act="openAddClass">＋ Dodaj zajęcia</button><div style="flex:1"></div><span class="pill pill-teal">${totalEnroll} zapisów</span><span class="pill pill-amber">${money(totalRevenue)}/mies.</span></div>
      <div class="card2"><div class="wrap-scroll"><table class="tbl"><thead><tr><th>Zajęcia</th><th>Instruktor</th><th>Termin</th><th class="right">Cena</th><th>Zapisy</th><th class="right">Przychód/mies.</th></tr></thead>
        <tbody>${data.classes.map((z) => { const pct = Math.round(z.enrolled.length / z.capacity * 100); return `<tr><td><b>🎭 ${esc(z.name)}</b></td><td>${esc(z.instructor)}</td><td>${esc(z.day)}, ${esc(z.time)}</td><td class="right">${money(z.price)}</td><td><div class="flex" style="gap:8px"><div class="bar" style="width:70px"><span style="width:${pct}%"></span></div><span class="muted" style="font-size:.8rem">${z.enrolled.length}/${z.capacity}</span></div></td><td class="right"><b>${money(z.price * z.enrolled.length)}</b></td></tr>`; }).join("")}</tbody></table></div></div>` };
  };

  VIEWS.dyrektor.kadry = () => {
    const data = KB.load();
    const T = tab("kadry", "lista");
    const tabs = `<div class="tabs"><button class="tab ${T === "lista" ? "on" : ""}" data-act="setTab" data-key="kadry" data-v="lista">Zespół</button><button class="tab ${T === "grafik" ? "on" : ""}" data-act="setTab" data-key="kadry" data-v="grafik">Grafik</button><button class="tab ${T === "nieobecnosci" ? "on" : ""}" data-act="setTab" data-key="kadry" data-v="nieobecnosci">Nieobecności</button></div>`;
    let body;
    if (T === "grafik") {
      body = `<div class="card2"><div class="wrap-scroll"><table class="tbl"><thead><tr><th>Pracownik</th><th>Pon</th><th>Wt</th><th>Śr</th><th>Czw</th><th>Pt</th></tr></thead><tbody>${data.staffSchedule.map((s) => { const st = KB.staffById(s.staffId); return `<tr><td><b>${esc(st.name)}</b></td><td>${s.mon}</td><td>${s.tue}</td><td>${s.wed}</td><td>${s.thu}</td><td>${s.fri}</td></tr>`; }).join("")}</tbody></table></div></div>`;
    } else if (T === "nieobecnosci") {
      body = `<div class="card2">${data.staffAbsences.map((a) => { const st = KB.staffById(a.staffId); return `<div class="row"><span class="avatar" style="background:#fde4e6">🚫</span><div class="r-main"><div class="r-title">${esc(st.name)}</div><div class="r-sub">${plDate(a.from)}${a.to !== a.from ? " – " + plDate(a.to) : ""}</div></div><span class="pill pill-amber">${esc(a.type)}</span></div>`; }).join("")}</div>`;
    } else {
      body = `<div class="card2"><div class="wrap-scroll"><table class="tbl"><thead><tr><th>Pracownik</th><th>Rola</th><th>Grupa</th><th>Kwalifikacje</th><th>Zatrudnienie</th><th class="right">Godz./tydz.</th></tr></thead><tbody>${data.staff.map((s) => { const g = s.groupId ? KB.group(s.groupId) : null; return `<tr><td><b>${esc(s.name)}</b><br><span class="muted" style="font-size:.78rem">${esc(s.email)}</span></td><td style="text-transform:capitalize">${esc(s.role)}</td><td>${g ? `<span class="pill" style="background:${g.color}22;color:${g.color}">${esc(g.name)}</span>` : '<span class="pill pill-gray">specjalista</span>'}</td><td>${esc(s.qualifications)}</td><td class="muted" style="font-size:.82rem">${esc(s.employment)}</td><td class="right"><b>${s.hoursWeek}h</b></td></tr>`; }).join("")}</tbody></table></div></div>`;
    }
    return { title: "Kadry", sub: "Zespół, grafik pracy i nieobecności.", html: `<div class="toolbar"><button class="btn btn-primary" data-act="openAddStaff">＋ Dodaj pracownika</button></div>${tabs}${body}` };
  };

  VIEWS.dyrektor.rozliczenia = () => {
    const data = KB.load();
    const months = ["2026-05", "2026-06", "2026-07"];
    const m = VS.rozMonth;
    const inv = data.invoices.filter((i) => i.month === m).sort((a, b) => (a.paid - b.paid));
    const total = inv.reduce((s, i) => s + i.total, 0), paid = inv.filter((i) => i.paid).reduce((s, i) => s + i.total, 0);
    return { title: "Rozliczenia i faktury", sub: "Automatyczne faktury na podstawie obecności.", html: `
      <div class="toolbar"><div class="seg">${months.map((x) => `<button class="${x === m ? "on" : ""}" data-act="selMonth" data-v="${x}">${esc(monthName(x))}</button>`).join("")}</div><div style="flex:1"></div><button class="btn btn-ghost btn-sm" data-act="regenInvoices">↻ Przelicz z obecności</button><button class="btn btn-primary btn-sm" data-act="exportInvoices">⬇ Eksport CSV</button></div>
      <div class="grid g-3" style="margin-bottom:18px">
        <div class="stat accent-teal"><div class="s-ico">💰</div><div class="s-val">${money(total)}</div><div class="s-lbl">Wartość faktur</div></div>
        <div class="stat accent-sky"><div class="s-ico">✅</div><div class="s-val">${money(paid)}</div><div class="s-lbl">Opłacono</div></div>
        <div class="stat accent-coral"><div class="s-ico">⚠️</div><div class="s-val">${money(total - paid)}</div><div class="s-lbl">Zaległości</div></div>
      </div>
      <div class="card2"><div class="card-h"><h3>Faktury — ${esc(monthName(m))}</h3></div><div class="wrap-scroll"><table class="tbl"><thead><tr><th>Numer</th><th>Dziecko</th><th>Składniki</th><th class="right">Kwota</th><th>Status</th><th></th></tr></thead>
        <tbody>${inv.map((i) => { const ch = KB.child(i.childId); return `<tr><td><b>${esc(i.number)}</b></td><td>${ch.avatar} ${esc(first(ch.name))}</td><td><span class="muted" style="font-size:.82rem">${i.items.map((it) => esc(it.name)).join("<br>")}</span></td><td class="right"><b>${money(i.total)}</b></td><td>${i.paid ? '<span class="pill pill-green">opłacona</span>' : '<span class="pill pill-red">niezapłacona</span>'}</td><td class="right"><button class="btn btn-ghost btn-sm" data-act="printInvoice" data-id="${i.id}">🖨️</button> ${i.paid ? "" : `<button class="btn btn-primary btn-sm" data-act="markPaid" data-id="${i.id}">Oznacz</button>`}</td></tr>`; }).join("")}</tbody></table></div></div>` };
  };

  VIEWS.dyrektor.raporty = () => {
    const data = KB.load();
    const groupBars = data.groups.map((g) => { const gk = KB.childrenOf(g.id); const ga = data.attendance.filter((a) => gk.some((k) => k.id === a.childId)); const p = ga.filter((a) => a.present).length; return { label: g.name, value: ga.length ? Math.round(p / ga.length * 100) : 0, color: g.color }; });
    const reports = [
      { ico: "📋", name: "Frekwencja miesięczna", desc: "Obecności wg dziecka i grupy", type: "attendance" },
      { ico: "💰", name: "Zestawienie płatności", desc: "Faktury, wpłaty i zaległości", type: "payments" },
      { ico: "📖", name: "Realizacja dziennika", desc: "Tematy zajęć i podstawa programowa", type: "journal" },
      { ico: "👩‍🏫", name: "Czas pracy kadry", desc: "Godziny wg pracownika", type: "staff" },
    ];
    return { title: "Raporty", sub: "Analizy i eksport zestawień (CSV).", html: `
      <div class="card2" style="margin-bottom:18px"><div class="card-h"><h3>Średnia frekwencja wg grup (30 dni)</h3></div>${UI.barChart(groupBars, { height: 190, fmt: (v) => v + "%" })}</div>
      <div class="grid g-2">${reports.map((r) => `<div class="card2"><div class="card-h"><span class="avatar" style="background:#f0f7f5">${r.ico}</span><div><h3>${esc(r.name)}</h3><span class="muted" style="font-size:.84rem">${esc(r.desc)}</span></div></div><div class="field-row"><div class="field mb-0"><label>Miesiąc</label><select><option>Lipiec 2026</option><option>Czerwiec 2026</option></select></div><div class="field mb-0"><label>Grupa</label><select><option>Wszystkie</option>${data.groups.map((g) => `<option>${esc(g.name)}</option>`).join("")}</select></div></div><button class="btn btn-primary btn-block mt-16" data-act="exportReport" data-type="${r.type}">⬇ Pobierz CSV</button></div>`).join("")}</div>` };
  };

  VIEWS.dyrektor.rekrutacja = () => {
    const data = KB.load();
    const rek = data.recruitment.slice().sort((a, b) => b.date.localeCompare(a.date));
    return { title: "Rekrutacja", sub: "Zgłoszenia z formularza. Akceptacja tworzy umowę i dodaje dziecko.", html: `
      <button class="btn btn-primary" data-act="openAddRek" style="margin-bottom:18px">＋ Dodaj zgłoszenie</button>
      <div class="card2"><div class="wrap-scroll"><table class="tbl"><thead><tr><th>Dziecko</th><th>Rodzic</th><th>Grupa</th><th>Etap</th><th>Data</th><th>Status</th><th></th></tr></thead>
        <tbody>${rek.map((r) => `<tr><td><b>${esc(r.childName)}</b><br><span class="muted" style="font-size:.78rem">ur. ${plDate(r.birth)}</span></td><td>${esc(r.parentName)}<br><span class="muted" style="font-size:.78rem">${esc(r.phone)}</span></td><td>${esc(r.groupPref)}</td><td>${r.status === "przyjete" ? '<span class="pill pill-green">✓</span>' : r.status === "odrzucone" ? '<span class="pill pill-gray">—</span>' : `<span class="pill pill-teal">${esc(r.stage || "zgłoszenie")}</span>`}</td><td>${plDate(r.date)}</td><td>${r.status === "nowe" ? '<span class="pill pill-amber">nowe</span>' : r.status === "wtoku" ? '<span class="pill pill-teal">w toku</span>' : r.status === "przyjete" ? '<span class="pill pill-green">przyjęte</span>' : '<span class="pill pill-gray">odrzucone</span>'}</td><td class="right">${r.status === "nowe" || r.status === "wtoku" ? `<button class="btn btn-primary btn-sm" data-act="acceptRek" data-id="${r.id}">Przyjmij</button> <button class="btn btn-ghost btn-sm" data-act="rejectRek" data-id="${r.id}">Odrzuć</button>` : ""}</td></tr>`).join("")}</tbody></table></div></div>` };
  };

  VIEWS.dyrektor.ogloszenia = () => announcementsView(true);

  VIEWS.dyrektor.dokumenty = () => {
    const data = KB.load();
    const consentStats = {};
    data.consents.forEach((c) => { consentStats[c.name] = consentStats[c.name] || { g: 0, n: 0 }; c.granted ? consentStats[c.name].g++ : consentStats[c.name].n++; });
    return { title: "Dokumenty", sub: "Ewidencja dokumentów i zgód (RODO, wizerunek, wycieczki).", html: `
      <div class="grid g-3" style="margin-bottom:18px">
        <div class="stat accent-teal"><div class="s-ico">📄</div><div class="s-val">${data.documents.length}</div><div class="s-lbl">Dokumenty</div></div>
        <div class="stat accent-sky"><div class="s-ico">✅</div><div class="s-val">${data.consents.filter((c) => c.granted).length}</div><div class="s-lbl">Udzielone zgody</div></div>
        <div class="stat accent-coral"><div class="s-ico">⛔</div><div class="s-val">${data.consents.filter((c) => !c.granted).length}</div><div class="s-lbl">Brak zgody</div></div>
      </div>
      <div class="card2"><div class="card-h"><h3>Stan zgód</h3></div>${Object.entries(consentStats).map(([name, s]) => { const tot = s.g + s.n; const pct = Math.round(s.g / tot * 100); return `<div class="row"><div class="r-main"><div class="r-title">${esc(name)}</div><div class="bar mt-10"><span style="width:${pct}%"></span></div></div><b>${s.g}/${tot}</b></div>`; }).join("")}</div>` };
  };

  VIEWS.dyrektor.ustawienia = () => {
    const f = KB.load().facility;
    return { title: "Ustawienia i dane", sub: "Dane placówki oraz import/eksport danych systemu.", html: `
      <div class="grid g-2">
        <div class="card2"><div class="card-h"><h3>Dane placówki</h3></div>
          <form data-act="saveFacility">
            <div class="field"><label>Nazwa</label><input name="name" value="${esc(f.name)}"></div>
            <div class="field-row"><div class="field"><label>Miasto</label><input name="city" value="${esc(f.city)}"></div><div class="field"><label>NIP</label><input name="nip" value="${esc(f.nip)}"></div></div>
            <div class="field"><label>Adres</label><input name="address" value="${esc(f.address || "")}"></div>
            <div class="field-row"><div class="field"><label>Telefon</label><input name="phone" value="${esc(f.phone || "")}"></div><div class="field"><label>E-mail</label><input name="email" value="${esc(f.email || "")}"></div></div>
            <button class="btn btn-primary btn-block">Zapisz</button>
          </form>
        </div>
        <div class="grid" style="align-content:start">
          <div class="card2"><div class="card-h"><h3>Kopia i przenoszenie danych</h3></div>
            <p class="muted" style="font-size:.88rem;margin-bottom:14px">Eksportuj wszystkie dane do pliku JSON lub wczytaj wcześniejszą kopię / dane własnej placówki (zgodne z modelem <code>seed.js</code>).</p>
            <button class="btn btn-ghost btn-block" data-act="exportJSON" style="margin-bottom:10px">⬇ Eksportuj dane (JSON)</button>
            <label class="btn btn-primary btn-block" style="cursor:pointer">⬆ Importuj dane (JSON)<input type="file" accept="application/json" data-act="importJSON" hidden></label>
          </div>
          <div class="card2"><div class="card-h"><h3>Strefa danych demo</h3></div>
            <button class="btn btn-coral btn-block" data-act="reset">↺ Przywróć dane demonstracyjne</button>
          </div>
        </div>
      </div>` };
  };

  /* ============================================================ SAMORZĄD */
  VIEWS.samorzad.pulpit = () => {
    const data = KB.load();
    const facs = data.facilities.map((f) => ({ ...f, kids: f.id === "f1" ? data.children.length : f.childrenCount, staff: f.id === "f1" ? data.staff.length : f.staffCount, att: f.id === "f1" ? (() => { const a = data.attendance.filter((x) => x.date === KB.today); return a.length ? Math.round(a.filter((y) => y.present).length / a.length * 100) : 0; })() : f.attendanceRate }));
    const totalKids = facs.reduce((s, f) => s + f.kids, 0);
    const totalSubsidy = data.subsidies.reduce((s, x) => s + x.amount, 0);
    const avgAtt = Math.round(facs.reduce((s, f) => s + f.att, 0) / facs.length);
    const bars = facs.map((f) => ({ label: f.name.split(" ").slice(-1)[0], value: f.kids, color: "var(--teal)" }));
    return { title: "Pulpit zbiorczy", sub: "Nadzór nad placówkami — dane zagregowane.", html: `
      <div class="grid g-4" style="margin-bottom:18px">
        <div class="stat accent-teal"><div class="s-ico">🏫</div><div class="s-val">${facs.length}</div><div class="s-lbl">Placówki</div></div>
        <div class="stat accent-sky"><div class="s-ico">🧒</div><div class="s-val">${totalKids}</div><div class="s-lbl">Dzieci łącznie</div></div>
        <div class="stat accent-amber"><div class="s-ico">📊</div><div class="s-val">${avgAtt}%</div><div class="s-lbl">Śr. frekwencja</div></div>
        <div class="stat accent-coral"><div class="s-ico">💰</div><div class="s-val">${money(totalSubsidy)}</div><div class="s-lbl">Dotacje (07/2026)</div></div>
      </div>
      <div class="grid g-2">
        <div class="card2"><div class="card-h"><h3>Liczba dzieci wg placówek</h3></div>${UI.barChart(bars, { height: 190 })}</div>
        <div class="card2"><div class="card-h"><h3>Placówki</h3></div>${facs.map((f) => `<div class="row"><span class="avatar" style="background:var(--teal-l)">🏫</span><div class="r-main"><div class="r-title">${esc(f.name)}</div><div class="r-sub">${f.kids} dzieci · ${f.staff} kadry · frekwencja ${f.att}%</div></div></div>`).join("")}</div>
      </div>` };
  };

  VIEWS.samorzad.placowki = () => {
    const data = KB.load();
    const facs = data.facilities.map((f) => ({ ...f, kids: f.id === "f1" ? data.children.length : f.childrenCount, staff: f.id === "f1" ? data.staff.length : f.staffCount, att: f.id === "f1" ? 92 : f.attendanceRate, dir: f.id === "f1" ? data.facility.director : f.director }));
    return { title: "Placówki", sub: `${facs.length} placówek pod nadzorem`, html: `
      <div class="grid g-2">${facs.map((f) => `<div class="fac-card"><div class="card-h"><span class="avatar" style="background:var(--teal-l);font-size:1.4rem">🏫</span><div><h3>${esc(f.name)}</h3><span class="muted" style="font-size:.84rem">${esc(f.city)} · dyr. ${esc(f.dir)}</span></div></div><div class="grid g-3" style="gap:10px"><div class="rtile"><div class="rt-val">${f.kids}</div><div class="rt-lbl">Dzieci</div></div><div class="rtile"><div class="rt-val">${f.staff}</div><div class="rt-lbl">Kadra</div></div><div class="rtile"><div class="rt-val">${f.att}%</div><div class="rt-lbl">Frekwencja</div></div></div></div>`).join("")}</div>` };
  };

  VIEWS.samorzad.dotacje = () => {
    const data = KB.load();
    const total = data.subsidies.reduce((s, x) => s + x.amount, 0);
    return { title: "Dotacje", sub: "Rozliczenie dotacji oświatowych wg placówek (07/2026).", html: `
      <div class="stat accent-teal" style="margin-bottom:18px;max-width:320px"><div class="s-ico">💰</div><div class="s-val">${money(total)}</div><div class="s-lbl">Suma dotacji</div></div>
      <div class="card2"><div class="card-h"><h3>Rozliczenie dotacji</h3><div class="spacer"></div><button class="btn btn-primary btn-sm" data-act="exportSubsidies">⬇ Eksport CSV</button></div>
        <div class="wrap-scroll"><table class="tbl"><thead><tr><th>Placówka</th><th class="right">Dzieci</th><th class="right">Stawka/dziecko</th><th class="right">Kwota</th><th>Status</th><th></th></tr></thead>
        <tbody>${data.subsidies.map((s) => { const f = data.facilities.find((x) => x.id === s.facilityId); return `<tr><td><b>${esc(f.name)}</b></td><td class="right">${s.childrenCount}</td><td class="right">${money(s.ratePerChild)}</td><td class="right"><b>${money(s.amount)}</b></td><td>${s.status === "wypłacona" ? '<span class="pill pill-green">wypłacona</span>' : '<span class="pill pill-amber">do wypłaty</span>'}</td><td class="right">${s.status === "wypłacona" ? "" : `<button class="btn btn-primary btn-sm" data-act="paySubsidy" data-id="${s.facilityId}">Wypłać</button>`}</td></tr>`; }).join("")}</tbody></table></div>
      </div>` };
  };

  VIEWS.samorzad.raporty = () => {
    const data = KB.load();
    const bars = data.facilities.map((f) => ({ label: f.name.split(" ").slice(-1)[0], value: f.id === "f1" ? 92 : f.attendanceRate, color: "var(--sky)" }));
    return { title: "Raporty zbiorcze", sub: "Zestawienia wielu placówek.", html: `
      <div class="card2" style="margin-bottom:18px"><div class="card-h"><h3>Frekwencja wg placówek</h3></div>${UI.barChart(bars, { height: 190, fmt: (v) => v + "%" })}</div>
      <div class="grid g-2">
        <div class="card2"><div class="card-h"><span class="avatar" style="background:#f0f7f5">📊</span><div><h3>Raport zbiorczy placówek</h3><span class="muted" style="font-size:.84rem">Dzieci, kadra, frekwencja</span></div></div><button class="btn btn-primary btn-block mt-16" data-act="exportFacilities">⬇ Pobierz CSV</button></div>
        <div class="card2"><div class="card-h"><span class="avatar" style="background:#f0f7f5">💰</span><div><h3>Raport dotacji</h3><span class="muted" style="font-size:.84rem">Rozliczenie dotacji oświatowych</span></div></div><button class="btn btn-primary btn-block mt-16" data-act="exportSubsidies">⬇ Pobierz CSV</button></div>
      </div>` };
  };

  /* ============================================================ MATERIAŁY */
  const roleLetter = { rodzic: "r", nauczyciel: "n", dyrektor: "d" };
  VIEWS.rodzic.materialy = (sess) => materialsView(sess, "Materiały do domu", "Karty pracy, kolorowanki i zadania do wydrukowania w domu.");
  VIEWS.nauczyciel.materialy = (sess) => materialsView(sess, "Materiały edukacyjne", "Scenariusze, karty pracy, arkusze i pomoce dydaktyczne — gotowe do druku.");
  VIEWS.dyrektor.materialy = (sess) => materialsView(sess, "Materiały edukacyjne", "Scenariusze, wzory dokumentów, arkusze i e-booki dla placówki.");

  function materialsView(sess, title, sub) {
    const rl = roleLetter[sess.role] || "n";
    let items = MAT.forRole(rl);
    const cats = MAT.CATS.filter((c) => items.some((i) => i.cat === c.id));
    if (VS.matCat !== "all") items = items.filter((i) => i.cat === VS.matCat);
    const q = (VS.matSearch || "").toLowerCase();
    if (q) items = items.filter((i) => (i.title + " " + i.desc).toLowerCase().includes(q));
    const chip = (id, label, ico) => `<button class="mat-chip ${VS.matCat === id ? "on" : ""}" data-act="matCat" data-v="${id}">${ico ? ico + " " : ""}${esc(label)}</button>`;
    return { title, sub, html: `
      <div class="toolbar"><div class="search"><input placeholder="Szukaj materiału…" data-act="matSearch" value="${esc(VS.matSearch)}"></div><span class="pill pill-teal">${items.length} materiałów</span></div>
      <div class="mat-chips">${chip("all", "Wszystkie")}${cats.map((c) => chip(c.id, c.label, c.ico)).join("")}</div>
      <div class="grid g-3 mt-16">
        ${items.map((i) => { const c = MAT.cat(i.cat); return `<div class="mat-card"><div class="mat-thumb" style="background:${c.color}1f;color:${c.color}">${c.ico}</div><div class="mat-body"><div class="mat-cat" style="color:${c.color}">${esc(c.label)}</div><div class="mat-title">${esc(i.title)}</div><div class="mat-desc">${esc(i.desc)}</div><div class="mat-foot"><span class="pill pill-gray">${esc(i.age)}</span><div class="spacer" style="flex:1"></div><button class="btn btn-ghost btn-sm" data-act="previewMat" data-id="${i.id}">Podgląd</button><button class="btn btn-primary btn-sm" data-act="printMat" data-id="${i.id}">⬇ Pobierz</button></div></div></div>`; }).join("")}
      </div>
      ${items.length === 0 ? `<div class="empty2"><div class="e-ico">🔍</div>Brak materiałów w tej kategorii.</div>` : ""}` };
  }

  /* ============================================================ SPECJALISTA */
  VIEWS.specjalista.wiadomosci = (sess) => threadView(sess);

  VIEWS.specjalista.pulpit = (sess) => {
    const sp = KB.staffById(sess.id), kids = KB.careOf(sess.id), sessions = KB.sessionsOf(sess.id);
    const todaySess = sessions.filter((s) => s.next === KB.today || s.date === KB.today);
    const upcoming = sessions.filter((s) => s.next && s.next >= KB.today).sort((a, b) => a.next.localeCompare(b.next));
    return { title: `Gabinet — ${esc(sp.role)}`, sub: `${esc(sp.name)} · ${kids.length} podopiecznych`, html: `
      <div class="grid g-4" style="margin-bottom:18px">
        <div class="stat accent-teal"><div class="s-ico">🧒</div><div class="s-val">${kids.length}</div><div class="s-lbl">Podopieczni</div></div>
        <div class="stat accent-sky"><div class="s-ico">🗒️</div><div class="s-val">${sessions.length}</div><div class="s-lbl">Sesje (łącznie)</div></div>
        <div class="stat accent-amber"><div class="s-ico">📅</div><div class="s-val">${upcoming.length}</div><div class="s-lbl">Zaplanowane</div></div>
        <div class="stat accent-coral"><div class="s-ico">⏱️</div><div class="s-val">${sp.hoursWeek}h</div><div class="s-lbl">Wymiar tygodniowy</div></div>
      </div>
      <div class="grid g-2">
        <div class="card2"><div class="card-h"><h3>Podopieczni</h3><div class="spacer"></div><a href="#/specjalista/sesje" class="btn btn-ghost btn-sm">Dziennik</a></div>
          ${kids.map((k) => { const g = KB.group(k.groupId); const last = KB.sessionsForChild(k.id).filter((s) => s.specialistId === sess.id).sort((a, b) => b.date.localeCompare(a.date))[0]; return `<div class="row"><span class="avatar" style="background:${g.color}22">${k.avatar}</span><div class="r-main"><div class="r-title">${esc(k.name)} <span class="muted" style="font-weight:600">· ${esc(g.name)}</span></div><div class="r-sub">${last ? "ostatnia sesja: " + plDate(last.date) : "brak sesji"}</div></div><button class="btn btn-primary btn-sm" data-act="openSession" data-id="${k.id}">＋ sesja</button></div>`; }).join("")}
        </div>
        <div class="card2"><div class="card-h"><h3>Najbliższe sesje</h3></div>
          ${upcoming.length ? upcoming.map((s) => { const ch = KB.child(s.childId); return `<div class="row"><span class="avatar" style="background:#e6f7ee">🗓️</span><div class="r-main"><div class="r-title">${esc(ch.name)}</div><div class="r-sub">${esc(s.type)} · ${plDate(s.next)}</div></div></div>`; }).join("") : `<div class="empty2"><div class="e-ico">📅</div>Brak zaplanowanych sesji.</div>`}
        </div>
      </div>` };
  };

  VIEWS.specjalista.podopieczni = (sess) => {
    const kids = KB.careOf(sess.id);
    return { title: "Podopieczni", sub: "Dzieci objęte opieką specjalisty.", html: `
      <div class="card2"><div class="wrap-scroll"><table class="tbl"><thead><tr><th>Dziecko</th><th>Grupa</th><th class="right">Sesje</th><th>Ostatnia</th><th></th></tr></thead>
        <tbody>${kids.map((k) => { const g = KB.group(k.groupId); const ss = KB.sessionsForChild(k.id).filter((s) => s.specialistId === sess.id).sort((a, b) => b.date.localeCompare(a.date)); return `<tr><td><b>${k.avatar} ${esc(k.name)}</b><br><span class="muted" style="font-size:.78rem">${KB.ageFrom(k.birth)} lata</span></td><td><span class="pill" style="background:${g.color}22;color:${g.color}">${esc(g.name)}</span></td><td class="right">${ss.length}</td><td>${ss[0] ? plDate(ss[0].date) : "—"}</td><td class="right"><button class="btn btn-primary btn-sm" data-act="openSession" data-id="${k.id}">＋ sesja</button></td></tr>`; }).join("")}</tbody></table></div></div>` };
  };

  VIEWS.specjalista.sesje = (sess) => {
    const sessions = KB.sessionsOf(sess.id).slice().sort((a, b) => b.date.localeCompare(a.date));
    return { title: "Dziennik sesji", sub: "Zapisy sesji terapeutycznych — dziennik specjalisty.", html: `
      <button class="btn btn-primary" data-act="openSession" style="margin-bottom:18px">＋ Nowa sesja</button>
      <div class="card2">${sessions.length ? sessions.map((s) => { const ch = KB.child(s.childId); return `<div class="row"><span class="avatar" style="background:#e6f7ee">🗒️</span><div class="r-main"><div class="r-title">${esc(ch ? ch.name : "—")} · ${esc(s.type)}</div><div class="r-sub">${plDate(s.date)} — ${esc(s.notes)}${s.next ? ` · <b>następna:</b> ${plDate(s.next)}` : ""}</div></div></div>`; }).join("") : `<div class="empty2"><div class="e-ico">🗒️</div>Brak sesji.</div>`}</div>` };
  };

  VIEWS.specjalista.harmonogram = (sess) => {
    const sp = KB.staffById(sess.id);
    const slots = [
      { day: "Poniedziałek", items: ["9:00 Zosia K. — logopedia", "10:00 Lena Z. — logopedia"] },
      { day: "Wtorek", items: ["11:00 konsultacje z kadrą"] },
      { day: "Środa", items: ["9:00 Zosia K. — logopedia", "10:30 diagnozy"] },
      { day: "Czwartek", items: ["9:30 Jaś W. — wsparcie"] },
      { day: "Piątek", items: ["9:00 Zosia K. — logopedia", "12:00 dokumentacja"] },
    ];
    return { title: "Harmonogram", sub: `Tygodniowy plan pracy — ${esc(sp.name)} (${sp.hoursWeek}h/tydz.)`, html: `
      <div class="grid g-2">${slots.map((s) => `<div class="card2"><div class="card-h"><h3>${esc(s.day)}</h3></div><div class="timeline">${s.items.map((it) => `<div class="tl-item"><div class="tl-time">${esc(it.split(" ")[0])}</div><div style="font-weight:600">${esc(it.split(" ").slice(1).join(" "))}</div></div>`).join("")}</div></div>`).join("")}</div>` };
  };

  /* ============================================================ AKCJE */
  const ACTIONS = {
    switchChild(t) { KB.patchSession({ _child: t.dataset.id }); render(); },
    openThread(t) { KB.patchSession({ _thread: t.dataset.id }); render(); },
    setTab(t) { VS.tabs[t.dataset.key] = t.dataset.v; render(); },
    selMonth(t) { VS.rozMonth = t.dataset.v; render(); },
    searchInput(t) { VS.search = t.value; render(); const inp = document.querySelector('[data-act="searchInput"]'); if (inp) { inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length); } },
    calPrev() { VS.calM--; if (VS.calM < 0) { VS.calM = 11; VS.calY--; } render(); },
    calNext() { VS.calM++; if (VS.calM > 11) { VS.calM = 0; VS.calY++; } render(); },
    readAllNotif(t, sess) { KB.load().notifications.forEach((n) => { if (n.userId === sess.id) n.read = true; }); KB.save(); render(); },

    /* rodzic */
    openAbsence(t, sess) {
      const { kids } = parentChild(sess);
      modal(`<h3>Zgłoś nieobecność</h3><p class="m-sub">Rozliczenie zostanie automatycznie skorygowane.</p>
        <form data-act="saveAbsence">
          ${kids.length > 1 ? `<div class="field"><label>Dziecko</label><select name="child">${kids.map((k) => `<option value="${k.id}">${esc(k.name)}</option>`).join("")}</select></div>` : `<input type="hidden" name="child" value="${kids[0].id}">`}
          <div class="field"><label>Rodzaj</label><select name="type"><option value="choroba">Choroba</option><option value="urlop">Urlop / wypoczynek</option><option value="inne">Inne</option></select></div>
          <div class="field-row"><div class="field"><label>Od</label><input type="date" name="from" value="${KB.today}" required></div><div class="field"><label>Do</label><input type="date" name="to" value="${KB.today}" required></div></div>
          <div class="field"><label>Powód (opcjonalnie)</label><input name="reason" placeholder="np. przeziębienie"></div>
          <div class="modal-actions"><button type="button" class="btn btn-ghost" onclick="KBcloseModal()">Anuluj</button><button class="btn btn-coral">Zgłoś</button></div>
        </form>`);
    },
    saveAbsence(f, sess) {
      const fd = new FormData(f), data = KB.load(), childId = fd.get("child"), from = fd.get("from"), to = fd.get("to");
      data.absences.push({ id: KB.uid("abs"), childId, from, to, reason: fd.get("reason"), type: fd.get("type"), reportedBy: sess.id, createdAt: KB.today });
      let d = new Date(from), end = new Date(to);
      while (d <= end) { const ds = KB.iso(d); let a = data.attendance.find((x) => x.childId === childId && x.date === ds); if (a) { a.present = false; a.checkIn = null; a.checkOut = null; } else data.attendance.push({ id: KB.uid("att"), childId, date: ds, present: false, checkIn: null, checkOut: null }); d.setDate(d.getDate() + 1); }
      KB.save(); closeModal(); toast("Nieobecność zgłoszona ✓"); render();
    },
    orderMeals(f, sess) {
      const { child } = parentChild(sess), data = KB.load();
      const meals = [...f.querySelectorAll('input[name="meal"]:checked')].map((c) => c.value);
      let o = data.mealOrders.find((x) => x.childId === child.id && x.date === KB.today);
      if (o) o.meals = meals; else data.mealOrders.push({ id: KB.uid("mo"), childId: child.id, date: KB.today, meals });
      KB.save(); toast("Zamówienie zapisane ✓");
    },
    payInvoice(t) { const i = KB.load().invoices.find((x) => x.id === t.dataset.id); if (i) { i.paid = true; KB.save(); toast("Płatność zaksięgowana ✓ (demo Przelewy24)"); render(); } },
    printInvoice(t) {
      const i = KB.load().invoices.find((x) => x.id === t.dataset.id); if (!i) return;
      const ch = KB.child(i.childId), f = KB.load().facility;
      UI.print("Faktura " + i.number, `
        <div class="brand">🌱 KidBloom</div>
        <h1>Faktura ${esc(i.number)}</h1><p class="muted">Data wystawienia: ${plDate(i.dueDate)} · Miesiąc: ${esc(monthName(i.month))}</p>
        <div class="box"><b>Sprzedawca:</b> ${esc(f.name)}, ${esc(f.address || f.city)}, NIP ${esc(f.nip)}<br><b>Nabywca:</b> ${esc(KB.parent(ch.parentId).name)} — za pobyt: ${esc(ch.name)}</div>
        <table><thead><tr><th>Pozycja</th><th class="right">Kwota</th></tr></thead><tbody>${i.items.map((it) => `<tr><td>${esc(it.name)}</td><td class="right">${money(it.amount)}</td></tr>`).join("")}</tbody></table>
        <p class="right tot">Razem: ${money(i.total)}</p><p class="muted">${i.paid ? "OPŁACONA" : "Do zapłaty do " + plDate(i.dueDate)}</p>`);
    },
    printDoc(t) { UI.print(t.dataset.name, `<div class="brand">🌱 KidBloom</div><h1>${esc(t.dataset.name)}</h1><p class="muted">Dokument demonstracyjny wygenerowany przez system KidBloom.</p><div class="box">Treść dokumentu…</div>`); },
    setConsent(t) { const c = KB.load().consents.find((x) => x.id === t.dataset.id); if (c) { c.granted = t.dataset.v === "1"; c.date = KB.today; KB.save(); toast("Zgoda zaktualizowana ✓"); render(); } },
    newThread(t, sess) {
      const data = KB.load();
      const targets = sess.role === "rodzic" ? [data.director, ...data.staff.filter((s) => s.role === "nauczyciel")] : data.parents;
      modal(`<h3>Nowa wiadomość</h3><form data-act="saveThread">
        <div class="field"><label>Do</label><select name="to">${targets.map((x) => `<option value="${x.id}">${esc(x.name)}</option>`).join("")}</select></div>
        <div class="field"><label>Wiadomość</label><textarea name="text" required></textarea></div>
        <div class="modal-actions"><button type="button" class="btn btn-ghost" onclick="KBcloseModal()">Anuluj</button><button class="btn btn-primary">Wyślij</button></div></form>`);
    },
    saveThread(f, sess) {
      const fd = new FormData(f), data = KB.load(), to = fd.get("to");
      const now = KB.today + " " + new Date().toTimeString().slice(0, 5);
      const th = { id: KB.uid("th"), participants: [sess.id, to], childId: null, title: (KB.staffById(to) || KB.parent(to) || {}).name, msgs: [{ from: sess.id, text: fd.get("text"), at: now }] };
      data.messages.push(th); KB.patchSession({ _thread: th.id }); KB.save(); closeModal(); toast("Wiadomość wysłana ✓"); render();
    },
    sendMsg(f, sess) {
      const data = KB.load(), th = data.messages.find((x) => x.id === f.dataset.thread);
      const text = f.querySelector('[name="text"]').value.trim(); if (!text) return;
      th.msgs.push({ from: sess.id, text, at: KB.today + " " + new Date().toTimeString().slice(0, 5) });
      KB.patchSession({ _thread: th.id }); KB.save(); render();
    },

    /* nauczyciel */
    setPresent(t) {
      const data = KB.load(), childId = t.dataset.id, v = t.dataset.v === "1";
      let a = data.attendance.find((x) => x.childId === childId && x.date === KB.today);
      if (!a) { a = { id: KB.uid("att"), childId, date: KB.today, present: v, checkIn: v ? "08:00" : null, checkOut: null }; data.attendance.push(a); }
      else { a.present = v; if (!v) { a.checkIn = null; a.checkOut = null; } else if (!a.checkIn) a.checkIn = "08:00"; }
      KB.save(); render();
    },
    setTime(t) { const a = KB.load().attendance.find((x) => x.childId === t.dataset.id && x.date === KB.today); if (a) { a[t.dataset.f] = t.value; KB.save(); } },
    markAllPresent(t, sess) {
      const grp = KB.staffById(sess.id).groupId, data = KB.load();
      KB.childrenOf(grp).forEach((k) => { let a = data.attendance.find((x) => x.childId === k.id && x.date === KB.today); if (!a) { a = { id: KB.uid("att"), childId: k.id, date: KB.today, present: true, checkIn: "08:00", checkOut: null }; data.attendance.push(a); } else { a.present = true; if (!a.checkIn) a.checkIn = "08:00"; } });
      KB.save(); toast("Wszyscy oznaczeni jako obecni ✓"); render();
    },
    openReport(t) {
      const child = KB.child(t.dataset.id), rep = KB.reportOf(child.id, KB.today) || {};
      const meals = ["śniadanie", "obiad", "podwieczorek"], opts = ["", "wszystko", "połowa", "niewiele", "nie jadł/a"];
      modal(`<h3>Raport dzienny — ${esc(child.name)}</h3><p class="m-sub">${plDate(KB.today)} <button class="ai-btn" data-act="aiReport" style="float:right">✨ Generuj opis AI</button></p>
        <form data-act="saveReport" data-child="${child.id}">
          <div class="field"><label>Nastrój</label><div class="seg" style="display:flex">${["😊", "🙂", "😐", "😴", "😢"].map((m) => `<label style="flex:1;text-align:center"><input type="radio" name="mood" value="${m}" ${rep.mood === m ? "checked" : ""} style="display:none"><span style="font-size:1.5rem;cursor:pointer;padding:6px;display:block;border-radius:8px" class="mood-opt">${m}</span></label>`).join("")}</div></div>
          <div class="field"><label>Sen / drzemka</label><input name="sleep" value="${esc(rep.sleep || "")}" placeholder="np. 1h 20min"></div>
          ${meals.map((m) => `<div class="field mb-0" style="margin-bottom:8px"><label style="text-transform:capitalize">${m}</label><select name="meal_${m}">${opts.map((o) => `<option ${rep.meals && rep.meals[m] === o ? "selected" : ""}>${o}</option>`).join("")}</select></div>`).join("")}
          <div class="field mt-16"><label>Notatka dla rodzica</label><textarea name="note" id="repNote" placeholder="Jak minął dzień?">${esc(rep.note || "")}</textarea></div>
          <div class="modal-actions"><button type="button" class="btn btn-ghost" onclick="KBcloseModal()">Anuluj</button><button class="btn btn-primary">Zapisz</button></div>
        </form>`);
      document.querySelectorAll('input[name="mood"]').forEach((r) => r.addEventListener("change", () => { document.querySelectorAll(".mood-opt").forEach((s) => s.style.background = ""); r.nextElementSibling.style.background = "var(--teal-l)"; }));
      const ck = document.querySelector('input[name="mood"]:checked'); if (ck) ck.nextElementSibling.style.background = "var(--teal-l)";
    },
    aiReport() {
      const child = document.querySelector('form[data-act="saveReport"]').dataset.child, name = first(KB.child(child).name);
      const s = [`${name} miał/a dziś świetny humor. Chętnie uczestniczył/a w zajęciach plastycznych i bardzo dobrze zjadł/a posiłki.`, `Dziś ${name} aktywnie bawił/a się z rówieśnikami. Po obiedzie spokojnie odpoczywał/a podczas drzemki.`, `${name} z zaangażowaniem brał/a udział w zabawach ruchowych. Dzień minął pogodnie.`];
      document.getElementById("repNote").value = s[Math.floor(Math.random() * s.length)]; toast("Opis wygenerowany ✨");
    },
    saveReport(f, sess) {
      const fd = new FormData(f), data = KB.load(), childId = f.dataset.child, meals = {};
      ["śniadanie", "obiad", "podwieczorek"].forEach((m) => { const v = fd.get("meal_" + m); if (v) meals[m] = v; });
      let r = data.reports.find((x) => x.childId === childId && x.date === KB.today);
      const p = { mood: fd.get("mood") || "🙂", sleep: fd.get("sleep") || "—", meals, note: fd.get("note") || "", teacherId: sess.id };
      if (r) Object.assign(r, p); else data.reports.push(Object.assign({ id: KB.uid("rap"), childId, date: KB.today, photos: [] }, p));
      KB.save(); closeModal(); toast("Raport zapisany ✓"); render();
    },
    openJournal() {
      modal(`<h3>Nowy wpis do dziennika</h3><p class="m-sub">${plDate(KB.today)} <button class="ai-btn" data-act="aiJournal" style="float:right">✨ Generuj opis AI</button></p>
        <form data-act="saveJournal"><div class="field"><label>Temat zajęć</label><input name="topic" id="jTopic" placeholder="np. Kolory tęczy" required></div>
        <div class="field"><label>Opis realizacji</label><textarea name="desc" id="jDesc" required></textarea></div>
        <div class="field"><label>Obszar podstawy programowej</label><input name="core" placeholder="np. IV.8"></div>
        <div class="modal-actions"><button type="button" class="btn btn-ghost" onclick="KBcloseModal()">Anuluj</button><button class="btn btn-primary">Zapisz</button></div></form>`);
    },
    aiJournal() { const topic = document.getElementById("jTopic").value || "zajęcia tematyczne"; document.getElementById("jDesc").value = `Zajęcia „${topic}" — dzieci aktywnie uczestniczyły w zabawach edukacyjnych rozwijających kreatywność, spostrzegawczość i współpracę w grupie. Realizacja treści zgodnie z podstawą programową wychowania przedszkolnego.`; toast("Opis wygenerowany ✨"); },
    saveJournal(f, sess) { const fd = new FormData(f), data = KB.load(), t = KB.staffById(sess.id); data.journal.push({ id: KB.uid("dz"), groupId: t.groupId, date: KB.today, topic: fd.get("topic"), desc: fd.get("desc"), core: fd.get("core") || "", teacherId: sess.id }); KB.save(); closeModal(); toast("Wpis dodany ✓"); render(); },
    openPlan() { modal(`<h3>Dodaj punkt planu dnia</h3><form data-act="savePlan"><div class="field-row"><div class="field"><label>Godzina</label><input type="time" name="time" required></div><div class="field" style="flex:2"><label>Nazwa</label><input name="title" required></div></div><div class="modal-actions"><button type="button" class="btn btn-ghost" onclick="KBcloseModal()">Anuluj</button><button class="btn btn-primary">Dodaj</button></div></form>`); },
    savePlan(f, sess) { const fd = new FormData(f), t = KB.staffById(sess.id); KB.load().planDnia.push({ id: KB.uid("pd"), groupId: t.groupId, time: fd.get("time"), title: fd.get("title") }); KB.save(); closeModal(); toast("Dodano ✓"); render(); },
    delPlan(t) { const data = KB.load(); data.planDnia = data.planDnia.filter((p) => p.id !== t.dataset.id); KB.replace(data); toast("Usunięto"); render(); },
    openObs(t, sess) {
      const kids = KB.childrenOf(KB.staffById(sess.id).groupId);
      modal(`<h3>Nowa obserwacja</h3><form data-act="saveObs">
        <div class="field"><label>Dziecko</label><select name="child">${kids.map((k) => `<option value="${k.id}">${esc(k.name)}</option>`).join("")}</select></div>
        <div class="field"><label>Obszar</label><select name="area"><option>Rozwój społeczny</option><option>Rozwój poznawczy</option><option>Sprawność ruchowa</option><option>Samodzielność</option><option>Mowa i komunikacja</option></select></div>
        <div class="field"><label>Ocena</label><select name="rating"><option value="5">★★★★★</option><option value="4">★★★★</option><option value="3" selected>★★★</option><option value="2">★★</option><option value="1">★</option></select></div>
        <div class="field"><label>Obserwacja</label><textarea name="text" required></textarea></div>
        <div class="modal-actions"><button type="button" class="btn btn-ghost" onclick="KBcloseModal()">Anuluj</button><button class="btn btn-primary">Zapisz</button></div></form>`);
    },
    saveObs(f, sess) { const fd = new FormData(f); KB.load().observations.push({ id: KB.uid("obs"), childId: fd.get("child"), date: KB.today, teacherId: sess.id, area: fd.get("area"), text: fd.get("text"), rating: +fd.get("rating") }); KB.save(); closeModal(); toast("Obserwacja zapisana ✓"); render(); },
    openAlbum() { modal(`<h3>Nowy album</h3><form data-act="saveAlbum"><div class="field"><label>Nazwa albumu</label><input name="title" placeholder="np. Dzień Sportu" required></div><div class="modal-actions"><button type="button" class="btn btn-ghost" onclick="KBcloseModal()">Anuluj</button><button class="btn btn-primary">Utwórz</button></div></form>`); },
    saveAlbum(f, sess) { const t = KB.staffById(sess.id), pics = ["🎨", "⚽", "🧩", "🖼️", "🌳", "🎈"]; KB.load().gallery.push({ id: KB.uid("alb"), groupId: t.groupId, title: new FormData(f).get("title"), date: KB.today, photos: pics.slice(0, 3) }); KB.save(); closeModal(); toast("Album utworzony ✓"); render(); },
    addPhoto(t) { const alb = KB.load().gallery.find((a) => a.id === t.dataset.id), pics = ["📷", "🎈", "🌈", "⭐", "🎨", "🧸", "🎭", "🎪"]; alb.photos.push(pics[Math.floor(Math.random() * pics.length)]); KB.save(); toast("Zdjęcie dodane ✓"); render(); },
    editMeal(t) {
      const data = KB.load(), i = +t.dataset.i, m = t.dataset.m, cur = data.menu[i][m];
      modal(`<h3>Edytuj danie</h3><form data-act="saveMeal" data-i="${i}" data-m="${m}"><div class="field"><label style="text-transform:capitalize">${m} — ${plShort(data.menu[i].date)}</label><input name="dish" value="${esc(cur)}" required></div><div class="modal-actions"><button type="button" class="btn btn-ghost" onclick="KBcloseModal()">Anuluj</button><button class="btn btn-primary">Zapisz</button></div></form>`);
    },
    saveMeal(f) { const data = KB.load(); data.menu[+f.dataset.i][f.dataset.m] = new FormData(f).get("dish"); KB.save(); closeModal(); toast("Jadłospis zaktualizowany ✓"); render(); },

    /* dyrektor */
    openAddChild() {
      const groups = KB.load().groups;
      modal(`<h3>Dodaj dziecko</h3><form data-act="saveChild">
        <div class="field"><label>Imię i nazwisko</label><input name="name" required></div>
        <div class="field-row"><div class="field"><label>Data urodzenia</label><input type="date" name="birth" required></div><div class="field"><label>Grupa</label><select name="group">${groups.map((g) => `<option value="${g.id}">${esc(g.name)}</option>`).join("")}</select></div></div>
        <div class="field"><label>Imię i nazwisko rodzica</label><input name="parent" required></div>
        <div class="field-row"><div class="field"><label>Telefon</label><input name="phone"></div><div class="field"><label>Alergie</label><input name="allergies" value="brak"></div></div>
        <div class="modal-actions"><button type="button" class="btn btn-ghost" onclick="KBcloseModal()">Anuluj</button><button class="btn btn-primary">Dodaj</button></div></form>`);
    },
    saveChild(f) {
      const fd = new FormData(f), data = KB.load(), pid = KB.uid("p"), ch = KB.uid("c"), u = KB.uid("u");
      data.parents.push({ id: pid, name: fd.get("parent"), email: "", phone: fd.get("phone") || "" });
      data.children.push({ id: ch, name: fd.get("name"), groupId: fd.get("group"), parentId: pid, birth: fd.get("birth"), avatar: "🧒", allergies: fd.get("allergies") || "brak", contractId: u, diet: "standardowa" });
      data.contracts.push({ id: u, childId: ch, from: KB.today, monthlyFee: 650, mealFee: 18, status: "aktywna", hoursDeclared: "7:00–17:00" });
      KB.save(); closeModal(); toast("Dziecko dodane ✓"); render();
    },
    openAddStaff() {
      modal(`<h3>Dodaj pracownika</h3><form data-act="saveStaff">
        <div class="field"><label>Imię i nazwisko</label><input name="name" required></div>
        <div class="field-row"><div class="field"><label>Rola</label><input name="role" value="nauczyciel"></div><div class="field"><label>Godz./tydz.</label><input type="number" name="hours" value="40"></div></div>
        <div class="field"><label>Kwalifikacje</label><input name="qual"></div>
        <div class="modal-actions"><button type="button" class="btn btn-ghost" onclick="KBcloseModal()">Anuluj</button><button class="btn btn-primary">Dodaj</button></div></form>`);
    },
    saveStaff(f) { const fd = new FormData(f), data = KB.load(); const id = KB.uid("t"); data.staff.push({ id, name: fd.get("name"), role: fd.get("role"), groupId: null, email: "", phone: "", qualifications: fd.get("qual") || "", hoursWeek: +fd.get("hours") || 40, employment: "umowa o pracę" }); data.staffSchedule.push({ staffId: id, mon: "7:00–15:00", tue: "7:00–15:00", wed: "7:00–15:00", thu: "7:00–15:00", fri: "7:00–15:00" }); KB.save(); closeModal(); toast("Pracownik dodany ✓"); render(); },
    regenInvoices() { const data = KB.load(); data.invoices.filter((i) => i.month === VS.rozMonth).forEach((inv) => { const c = KB.contractOf(inv.childId); const days = data.attendance.filter((a) => a.childId === inv.childId && a.present).length; const meals = days * c.mealFee; inv.items = [{ name: "Czesne (opłata stała)", amount: c.monthlyFee }, { name: `Wyżywienie (${days} dni × ${c.mealFee} zł)`, amount: meals }]; inv.total = c.monthlyFee + meals; }); KB.save(); toast("Faktury przeliczone ✓"); render(); },
    markPaid(t) { const i = KB.load().invoices.find((x) => x.id === t.dataset.id); if (i) { i.paid = true; KB.save(); toast("Oznaczono jako opłaconą ✓"); render(); } },
    exportInvoices() { const data = KB.load(); const rows = [["Numer", "Dziecko", "Miesiąc", "Kwota", "Status"]]; data.invoices.filter((i) => i.month === VS.rozMonth).forEach((i) => rows.push([i.number, KB.child(i.childId).name, i.month, i.total, i.paid ? "opłacona" : "niezapłacona"])); downloadCSV(`faktury_${VS.rozMonth}.csv`, rows); },
    exportReport(t) {
      const data = KB.load(), type = t.dataset.type; let rows;
      if (type === "attendance") { rows = [["Dziecko", "Grupa", "Dni obecne", "Frekwencja %"]]; data.children.forEach((c) => { const att = KB.attendanceOf(c.id); rows.push([c.name, KB.group(c.groupId).name, att.filter((a) => a.present).length, attRate(c.id)]); }); }
      else if (type === "payments") { rows = [["Faktura", "Dziecko", "Kwota", "Status"]]; data.invoices.forEach((i) => rows.push([i.number, KB.child(i.childId).name, i.total, i.paid ? "opłacona" : "zaległość"])); }
      else if (type === "journal") { rows = [["Data", "Grupa", "Temat", "Podstawa"]]; data.journal.forEach((j) => rows.push([j.date, KB.group(j.groupId).name, j.topic, j.core])); }
      else { rows = [["Pracownik", "Rola", "Kwalifikacje", "Godz/tydz"]]; data.staff.forEach((s) => rows.push([s.name, s.role, s.qualifications, s.hoursWeek])); }
      downloadCSV(`raport_${type}.csv`, rows);
    },
    openAddRek() {
      const groups = KB.load().groups;
      modal(`<h3>Nowe zgłoszenie</h3><form data-act="saveRek">
        <div class="field"><label>Imię i nazwisko dziecka</label><input name="childName" required></div>
        <div class="field-row"><div class="field"><label>Data urodzenia</label><input type="date" name="birth" required></div><div class="field"><label>Grupa (pref.)</label><select name="group">${groups.map((g) => `<option>${esc(g.name)}</option>`).join("")}</select></div></div>
        <div class="field"><label>Rodzic</label><input name="parent" required></div>
        <div class="field"><label>Telefon</label><input name="phone"></div>
        <div class="modal-actions"><button type="button" class="btn btn-ghost" onclick="KBcloseModal()">Anuluj</button><button class="btn btn-primary">Dodaj</button></div></form>`);
    },
    saveRek(f) { const fd = new FormData(f); KB.load().recruitment.push({ id: KB.uid("rek"), childName: fd.get("childName"), birth: fd.get("birth"), parentName: fd.get("parent"), phone: fd.get("phone") || "", email: "", groupPref: fd.get("group"), status: "nowe", stage: "zgłoszenie", date: KB.today, note: "" }); KB.save(); closeModal(); toast("Zgłoszenie dodane ✓"); render(); },
    acceptRek(t) {
      const data = KB.load(), r = data.recruitment.find((x) => x.id === t.dataset.id);
      const grp = data.groups.find((g) => g.name === r.groupPref) || data.groups[0];
      const pid = KB.uid("p"), ch = KB.uid("c"), u = KB.uid("u");
      data.parents.push({ id: pid, name: r.parentName, email: r.email || "", phone: r.phone });
      data.children.push({ id: ch, name: r.childName, groupId: grp.id, parentId: pid, birth: r.birth, avatar: "🧒", allergies: "brak", contractId: u, diet: "standardowa" });
      data.contracts.push({ id: u, childId: ch, from: KB.today, monthlyFee: 650, mealFee: 18, status: "aktywna", hoursDeclared: "7:00–17:00" });
      r.status = "przyjete"; KB.save(); toast(`${r.childName} przyjęty/a — utworzono umowę ✓`); render();
    },
    rejectRek(t) { const r = KB.load().recruitment.find((x) => x.id === t.dataset.id); r.status = "odrzucone"; KB.save(); toast("Zgłoszenie odrzucone"); render(); },
    openAnn() { modal(`<h3>Nowe ogłoszenie</h3><p class="m-sub">Trafi do rodziców i kadry. <button class="ai-btn" data-act="aiAnn" style="float:right">✨ AI</button></p><form data-act="saveAnn"><div class="field"><label>Tytuł</label><input name="title" id="aTitle" required></div><div class="field"><label>Kategoria</label><select name="category"><option>wydarzenie</option><option>organizacja</option><option>żywienie</option></select></div><div class="field"><label>Treść</label><textarea name="body" id="aBody" required></textarea></div><label class="row" style="cursor:pointer;border:none"><input type="checkbox" name="pinned" style="width:18px;height:18px;accent-color:var(--teal)"> <span>Przypnij na górze</span></label><div class="modal-actions"><button type="button" class="btn btn-ghost" onclick="KBcloseModal()">Anuluj</button><button class="btn btn-primary">Opublikuj</button></div></form>`); },
    aiAnn() { const title = document.getElementById("aTitle").value || "Informacja"; document.getElementById("aBody").value = `Szanowni Rodzice, uprzejmie informujemy o wydarzeniu „${title}". Prosimy o zapoznanie się ze szczegółami i potwierdzenie obecności dziecka. W razie pytań zapraszamy do kontaktu z placówką.`; toast("Treść wygenerowana ✨"); },
    saveAnn(f, sess) { const fd = new FormData(f); KB.load().announcements.push({ id: KB.uid("ann"), title: fd.get("title"), body: fd.get("body"), audience: "all", authorId: sess.id, date: KB.today, pinned: !!fd.get("pinned"), category: fd.get("category") }); KB.save(); closeModal(); toast("Ogłoszenie opublikowane ✓"); render(); },
    openEvent() { modal(`<h3>Nowe wydarzenie</h3><form data-act="saveEvent"><div class="field"><label>Nazwa</label><input name="title" required></div><div class="field"><label>Data</label><input type="date" name="date" value="${KB.today}" required></div><div class="field"><label>Typ</label><select name="type"><option value="wydarzenie">Wydarzenie</option><option value="zebranie">Zebranie</option><option value="dzien-wolny">Dzień wolny</option></select></div><div class="modal-actions"><button type="button" class="btn btn-ghost" onclick="KBcloseModal()">Anuluj</button><button class="btn btn-primary">Dodaj</button></div></form>`); },
    saveEvent(f) { const fd = new FormData(f); KB.load().events.push({ id: KB.uid("ev"), date: fd.get("date"), title: fd.get("title"), type: fd.get("type") }); KB.save(); closeModal(); toast("Wydarzenie dodane ✓"); render(); },
    saveFacility(f) { const fd = new FormData(f), fac = KB.load().facility; ["name", "city", "nip", "address", "phone", "email"].forEach((k) => fac[k] = fd.get(k)); KB.save(); toast("Dane placówki zapisane ✓"); },
    exportJSON() { const blob = new Blob([KB.export()], { type: "application/json" }); const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: "kidbloom-dane.json" }); a.click(); URL.revokeObjectURL(a.href); toast("Dane wyeksportowane ✓"); },
    importJSON(t) {
      const file = t.files[0]; if (!file) return;
      const rd = new FileReader();
      rd.onload = () => { try { const obj = JSON.parse(rd.result); if (!obj.children || !obj.groups) throw new Error("zły format"); KB.replace(obj); toast("Dane zaimportowane ✓"); render(); } catch (e) { alert("Nie udało się wczytać pliku: " + e.message); } };
      rd.readAsText(file);
    },

    /* specjalista */
    openSession(t, sess) {
      const kids = KB.careOf(sess.id);
      const preId = t.dataset.id;
      const sp = KB.staffById(sess.id);
      const defType = sp.role === "logopeda" ? "Terapia logopedyczna" : sp.role === "psycholog" ? "Wsparcie psychologiczne" : "Sesja";
      modal(`<h3>Nowa sesja</h3><p class="m-sub">Dziennik specjalisty <button class="ai-btn" data-act="aiSession" style="float:right">✨ AI</button></p>
        <form data-act="saveSession">
          <div class="field"><label>Dziecko</label><select name="child">${kids.map((k) => `<option value="${k.id}" ${k.id === preId ? "selected" : ""}>${esc(k.name)}</option>`).join("")}</select></div>
          <div class="field"><label>Rodzaj</label><input name="type" value="${esc(defType)}"></div>
          <div class="field"><label>Notatka z sesji</label><textarea name="notes" id="sesNotes" required></textarea></div>
          <div class="field"><label>Następna sesja</label><input type="date" name="next" value="${KB.today}"></div>
          <div class="modal-actions"><button type="button" class="btn btn-ghost" onclick="KBcloseModal()">Anuluj</button><button class="btn btn-primary">Zapisz</button></div>
        </form>`);
    },
    aiSession() { document.getElementById("sesNotes").value = "Podczas sesji dziecko było skoncentrowane i chętne do współpracy. Wykonano zaplanowane ćwiczenia, obserwuję stopniową poprawę. Zalecane kontynuowanie ćwiczeń w domu."; toast("Notatka wygenerowana ✨"); },
    saveSession(f, sess) {
      const fd = new FormData(f), sp = KB.staffById(sess.id);
      KB.load().therapySessions.push({ id: KB.uid("ts"), specialistId: sess.id, childId: fd.get("child"), date: KB.today, type: fd.get("type"), notes: fd.get("notes"), next: fd.get("next") || "" });
      KB.save(); closeModal(); toast("Sesja zapisana ✓"); render();
    },

    /* szczegóły dziecka (dyrektor) */
    openChildDetail(t) {
      const ch = KB.child(t.dataset.id); if (!ch) return;
      const g = KB.group(ch.groupId), p = KB.parent(ch.parentId), u = KB.contractOf(ch.id);
      const att = KB.attendanceOf(ch.id).slice(0, 10).reverse();
      const trend = att.map((a) => ({ label: plShort(a.date), value: a.present ? 1 : 0, color: a.present ? "var(--teal)" : "var(--line)" }));
      const invs = KB.invoicesOf(ch.id).sort((a, b) => b.month.localeCompare(a.month));
      const reps = KB.load().reports.filter((r) => r.childId === ch.id).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3);
      const obs = KB.load().observations.filter((o) => o.childId === ch.id).sort((a, b) => b.date.localeCompare(a.date));
      const sess = KB.sessionsForChild(ch.id);
      modal(`<h3>${ch.avatar} ${esc(ch.name)}</h3><p class="m-sub">${KB.ageFrom(ch.birth)} lata · grupa ${esc(g.name)} · rodzic: ${esc(p.name)} (${esc(p.phone)})</p>
        <div class="grid g-2" style="gap:12px;margin-bottom:12px">
          <div class="rtile"><div class="rt-val">${attRate(ch.id, 30)}%</div><div class="rt-lbl">Frekwencja 30 dni</div></div>
          <div class="rtile"><div class="rt-val">${money(u.monthlyFee)}</div><div class="rt-lbl">Czesne</div></div>
        </div>
        <div class="card-h" style="margin:6px 0"><b>Obecność (10 dni)</b></div>${UI.barChart(trend, { height: 110, fmt: (v) => v ? "✓" : "–" })}
        <div class="card-h" style="margin:10px 0 6px"><b>Faktury</b></div>
        ${invs.map((i) => `<div class="row" style="padding:8px 4px"><div class="r-main"><div class="r-title" style="font-size:.86rem">${esc(i.number)}</div></div><b>${money(i.total)}</b> ${i.paid ? '<span class="pill pill-green">✓</span>' : '<span class="pill pill-red">!</span>'}</div>`).join("")}
        ${obs.length ? `<div class="card-h" style="margin:10px 0 6px"><b>Obserwacje</b></div>${obs.map((o) => `<div class="r-sub" style="margin:4px 0">${esc(o.area)} ${"★".repeat(o.rating)} — ${esc(o.text.slice(0, 70))}…</div>`).join("")}` : ""}
        ${sess.length ? `<div class="card-h" style="margin:10px 0 6px"><b>Sesje specjalistów</b></div>${sess.map((s) => { const sp = KB.staffById(s.specialistId); return `<div class="r-sub" style="margin:4px 0">${plDate(s.date)} · ${esc(s.type)} (${sp ? esc(sp.name) : "—"})</div>`; }).join("")}` : ""}
        <div class="modal-actions"><button type="button" class="btn btn-primary btn-block" onclick="KBcloseModal()">Zamknij</button></div>`);
    },

    /* materiały */
    matCat(t) { VS.matCat = t.dataset.v; render(); },
    matSearch(t) { VS.matSearch = t.value; render(); const inp = document.querySelector('[data-act="matSearch"]'); if (inp) { inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length); } },
    previewMat(t) {
      const m = MAT.byId(t.dataset.id); if (!m) return; const c = MAT.cat(m.cat);
      modal(`<h3>${c.ico} ${esc(m.title)}</h3><p class="m-sub">${esc(c.label)} · ${esc(m.age)}</p>
        <p>${esc(m.desc)}</p>
        <div class="mat-preview">${MAT.render(m)}</div>
        <div class="modal-actions"><button type="button" class="btn btn-ghost" onclick="KBcloseModal()">Zamknij</button><button class="btn btn-primary" data-act="printMat" data-id="${m.id}">⬇ Pobierz / drukuj</button></div>`);
    },
    printMat(t) { const m = MAT.byId(t.dataset.id); if (m) { UI.print(m.title, MAT.render(m)); toast("Materiał gotowy do druku ✓"); } },

    /* zajęcia dodatkowe */
    enrollClass(t, sess) {
      const { child } = parentChild(sess), data = KB.load(), z = data.classes.find((x) => x.id === t.dataset.id); if (!z) return;
      const idx = z.enrolled.indexOf(child.id);
      if (idx >= 0) { z.enrolled.splice(idx, 1); toast("Wypisano z zajęć ✓"); }
      else { if (z.enrolled.length >= z.capacity) { toast("Brak wolnych miejsc"); return; } z.enrolled.push(child.id); toast(`Zapisano na: ${z.name} ✓`); }
      KB.save(); render();
    },
    openAddClass() {
      modal(`<h3>Nowe zajęcia dodatkowe</h3><form data-act="saveClass">
        <div class="field"><label>Nazwa</label><input name="name" required></div>
        <div class="field"><label>Instruktor / firma</label><input name="instructor" required></div>
        <div class="field-row"><div class="field"><label>Dzień</label><select name="day"><option>Poniedziałek</option><option>Wtorek</option><option>Środa</option><option>Czwartek</option><option>Piątek</option></select></div><div class="field"><label>Godzina</label><input type="time" name="time" value="15:00"></div></div>
        <div class="field-row"><div class="field"><label>Cena/mies. (zł)</label><input type="number" name="price" value="100"></div><div class="field"><label>Limit miejsc</label><input type="number" name="capacity" value="15"></div></div>
        <div class="modal-actions"><button type="button" class="btn btn-ghost" onclick="KBcloseModal()">Anuluj</button><button class="btn btn-primary">Dodaj</button></div></form>`);
    },
    saveClass(f) { const fd = new FormData(f); KB.load().classes.push({ id: KB.uid("zd"), name: fd.get("name"), instructor: fd.get("instructor"), day: fd.get("day"), time: fd.get("time"), price: +fd.get("price") || 0, capacity: +fd.get("capacity") || 10, enrolled: [] }); KB.save(); closeModal(); toast("Zajęcia dodane ✓"); render(); },

    /* motyw */
    toggleTheme() {
      const cur = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", cur);
      try { localStorage.setItem("kidbloom_theme", cur); } catch {}
      render();
    },

    /* samorząd */
    paySubsidy(t) { const s = KB.load().subsidies.find((x) => x.facilityId === t.dataset.id); if (s) { s.status = "wypłacona"; KB.save(); toast("Dotacja wypłacona ✓"); render(); } },
    exportSubsidies() { const data = KB.load(); const rows = [["Placówka", "Dzieci", "Stawka", "Kwota", "Status"]]; data.subsidies.forEach((s) => { const f = data.facilities.find((x) => x.id === s.facilityId); rows.push([f.name, s.childrenCount, s.ratePerChild, s.amount, s.status]); }); downloadCSV("dotacje_2026-07.csv", rows); },
    exportFacilities() { const data = KB.load(); const rows = [["Placówka", "Miasto", "Dzieci", "Kadra", "Frekwencja %"]]; data.facilities.forEach((f) => rows.push([f.name, f.city, f.id === "f1" ? data.children.length : f.childrenCount, f.id === "f1" ? data.staff.length : f.staffCount, f.id === "f1" ? 92 : f.attendanceRate])); downloadCSV("placowki.csv", rows); },
  };

  function downloadCSV(name, rows) {
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: name });
    a.click(); URL.revokeObjectURL(a.href); toast("Plik CSV pobrany ✓");
  }

  /* init motywu z localStorage */
  try { const th = localStorage.getItem("kidbloom_theme"); if (th) document.documentElement.setAttribute("data-theme", th); } catch {}

  render();
})();
