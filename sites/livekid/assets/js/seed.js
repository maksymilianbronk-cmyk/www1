/* ==========================================================================
   KidBloom — warstwa danych (mock backend na localStorage)
   Odwrotna inżynieria funkcji systemu LiveKid.
   ========================================================================== */
(function () {
  "use strict";

  const KEY = "kidbloom_v1";
  const SESSION = "kidbloom_session_v1";

  /* --- pomocnicze --- */
  const pad = (n) => String(n).padStart(2, "0");
  const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const today = new Date(2026, 6, 17); // 2026-07-17 (stała data demo)
  const daysAgo = (n) => { const d = new Date(today); d.setDate(d.getDate() - n); return iso(d); };
  const uid = (p) => p + "_" + Math.random().toString(36).slice(2, 9);

  /* ============================ ZIARNO DANYCH ============================ */
  function seed() {
    const groups = [
      { id: "g1", name: "Motylki", color: "#ff8fab", ageRange: "3–4 lata", teacherIds: ["t1"] },
      { id: "g2", name: "Biedronki", color: "#ff7a6b", ageRange: "4–5 lat", teacherIds: ["t2"] },
      { id: "g3", name: "Żabki", color: "#4aa8ff", ageRange: "2–3 lata", teacherIds: ["t3"] },
    ];

    const staff = [
      { id: "t1", name: "Magda Nowak", role: "nauczyciel", groupId: "g1", email: "magda.nowak@kidbloom.pl", qualifications: "wychowanie przedszkolne", hoursWeek: 40 },
      { id: "t2", name: "Karolina Wójcik", role: "nauczyciel", groupId: "g2", email: "k.wojcik@kidbloom.pl", qualifications: "pedagogika", hoursWeek: 40 },
      { id: "t3", name: "Piotr Lewandowski", role: "nauczyciel", groupId: "g3", email: "p.lewandowski@kidbloom.pl", qualifications: "wczesne wspomaganie", hoursWeek: 32 },
      { id: "s1", name: "mgr Julia Krawczyk", role: "logopeda", groupId: null, email: "logopeda@kidbloom.pl", qualifications: "logopedia", hoursWeek: 12 },
      { id: "s2", name: "Tomasz Mazur", role: "rytmika", groupId: null, email: "rytmika@kidbloom.pl", qualifications: "muzyka", hoursWeek: 8 },
    ];

    const parents = [
      { id: "p1", name: "Anna Kowalska", email: "anna.kowalska@example.com", phone: "600 100 200" },
      { id: "p2", name: "Marek Wiśniewski", email: "m.wisniewski@example.com", phone: "600 300 400" },
      { id: "p3", name: "Katarzyna Zając", email: "k.zajac@example.com", phone: "600 500 600" },
    ];

    const children = [
      { id: "c1", name: "Zosia Kowalska", groupId: "g1", parentId: "p1", birth: "2022-03-11", avatar: "🦋", allergies: "brak", contractId: "u1" },
      { id: "c2", name: "Jaś Wiśniewski", groupId: "g1", parentId: "p2", birth: "2022-01-04", avatar: "🐝", allergies: "orzechy", contractId: "u2" },
      { id: "c3", name: "Lena Zając", groupId: "g2", parentId: "p3", birth: "2021-09-22", avatar: "🐞", allergies: "laktoza", contractId: "u3" },
      { id: "c4", name: "Antek Kowalski", groupId: "g1", parentId: "p1", birth: "2023-05-30", avatar: "🐸", allergies: "brak", contractId: "u4" },
    ];

    const contracts = [
      { id: "u1", childId: "c1", from: "2024-09-01", monthlyFee: 650, mealFee: 18, status: "aktywna" },
      { id: "u2", childId: "c2", from: "2024-09-01", monthlyFee: 650, mealFee: 18, status: "aktywna" },
      { id: "u3", childId: "c3", from: "2023-09-01", monthlyFee: 650, mealFee: 18, status: "aktywna" },
      { id: "u4", childId: "c4", from: "2025-02-01", monthlyFee: 650, mealFee: 18, status: "aktywna" },
    ];

    /* obecności ostatnich 10 dni roboczych */
    const attendance = [];
    let d = 0, count = 0;
    while (count < 10) {
      const dateStr = daysAgo(d); d++;
      const wd = new Date(dateStr).getDay();
      if (wd === 0 || wd === 6) continue; // pomiń weekend
      count++;
      children.forEach((ch) => {
        const present = Math.random() > 0.12;
        attendance.push({
          id: uid("att"), childId: ch.id, date: dateStr,
          present,
          checkIn: present ? `0${7 + (Math.random() > 0.5 ? 1 : 0)}:${pad(Math.floor(Math.random() * 59))}` : null,
          checkOut: present ? `1${5 + (Math.random() > 0.5 ? 1 : 0)}:${pad(Math.floor(Math.random() * 59))}` : null,
        });
      });
    }

    const absences = [
      { id: uid("abs"), childId: "c2", from: daysAgo(1), to: daysAgo(1), reason: "Przeziębienie", reportedBy: "p2", createdAt: daysAgo(2) },
    ];

    const menu = buildMenu();

    const mealOrders = [
      { id: uid("mo"), childId: "c1", date: today.getFullYear() + "-" + pad(today.getMonth() + 1) + "-" + pad(today.getDate()), meals: ["śniadanie", "obiad", "podwieczorek"] },
    ];

    const reports = [
      {
        id: uid("rap"), childId: "c1", date: iso(today), teacherId: "t1",
        mood: "😊", sleep: "1h 20min", meals: { "śniadanie": "wszystko", "obiad": "połowa", "podwieczorek": "wszystko" },
        note: "Zosia miała świetny humor, chętnie brała udział w zajęciach plastycznych. Zjadła prawie wszystko.",
        photos: ["🎨", "🧩"],
      },
    ];

    const journal = [
      { id: uid("dz"), groupId: "g1", date: iso(today), topic: "Kolory tęczy", desc: "Zajęcia plastyczne — mieszanie kolorów, malowanie tęczy farbami. Realizacja obszaru IV podstawy programowej.", teacherId: "t1", core: "IV.8" },
      { id: uid("dz"), groupId: "g1", date: daysAgo(1), topic: "Liczymy do 5", desc: "Zabawy matematyczne z liczmanami, przeliczanie w zakresie 5.", teacherId: "t1", core: "IV.15" },
    ];

    const announcements = [
      { id: uid("ann"), title: "Wycieczka do ZOO", body: "W piątek 24.07 wybieramy się do ZOO. Prosimy o wygodne buty i czapki z daszkiem. Zbiórka 8:30.", audience: "all", authorId: "d1", date: daysAgo(1), pinned: true },
      { id: uid("ann"), title: "Zebranie z rodzicami", body: "Zapraszamy na zebranie podsumowujące rok — wtorek 29.07 o 17:00, sala Motylków.", audience: "all", authorId: "d1", date: daysAgo(3), pinned: false },
    ];

    const messages = [
      { id: uid("th"), participants: ["p1", "t1"], childId: "c1", title: "Grupa Motylki — Magda Nowak",
        msgs: [
          { from: "t1", text: "Dzień dobry! Zosia dziś świetnie się bawiła 😊", at: daysAgo(0) + " 14:20" },
          { from: "p1", text: "Dziękuję za informację! Odbiorę ją dziś o 16.", at: daysAgo(0) + " 14:35" },
        ] },
    ];

    const events = [
      { id: uid("ev"), date: "2026-07-24", title: "Wycieczka do ZOO", type: "wydarzenie" },
      { id: uid("ev"), date: "2026-07-29", title: "Zebranie z rodzicami", type: "zebranie" },
      { id: uid("ev"), date: "2026-08-15", title: "Dzień wolny — Wniebowzięcie NMP", type: "dzien-wolny" },
    ];

    const gallery = [
      { id: uid("alb"), groupId: "g1", title: "Zajęcia plastyczne", date: daysAgo(1), photos: ["🎨", "🖼️", "✂️", "🖌️"] },
      { id: uid("alb"), groupId: "g1", title: "Zabawy na placu", date: daysAgo(4), photos: ["🛝", "⚽", "🌳", "🏃"] },
    ];

    const recruitment = [
      { id: uid("rek"), childName: "Filip Nowicki", birth: "2023-02-14", parentName: "Ewa Nowicka", phone: "600 700 800", groupPref: "Żabki", status: "nowe", date: daysAgo(2) },
      { id: uid("rek"), childName: "Maja Dąbrowska", birth: "2022-11-03", parentName: "Adam Dąbrowski", phone: "600 900 100", groupPref: "Motylki", status: "nowe", date: daysAgo(5) },
    ];

    /* faktury bieżącego miesiąca */
    const invoices = children.map((ch, i) => {
      const c = contracts.find((x) => x.childId === ch.id);
      const days = 20 - i * 2;
      const meals = days * c.mealFee;
      const total = c.monthlyFee + meals;
      return {
        id: uid("fv"), number: `FV/2026/07/${pad(i + 1)}`, childId: ch.id, month: "2026-07",
        items: [
          { name: "Czesne (opłata stała)", amount: c.monthlyFee },
          { name: `Wyżywienie (${days} dni × ${c.mealFee} zł)`, amount: meals },
        ],
        total, paid: i % 2 === 0, dueDate: "2026-07-10",
      };
    });

    const facility = { name: "Przedszkole KidBloom", city: "Warszawa", nip: "5213456789", director: "Ewa Zielińska" };

    const director = { id: "d1", name: "Ewa Zielińska", role: "dyrektor", email: "dyrektor@kidbloom.pl" };

    return {
      facility, groups, staff, parents, children, contracts, director,
      attendance, absences, menu, mealOrders, reports, journal,
      announcements, messages, events, gallery, recruitment, invoices,
    };
  }

  function buildMenu() {
    const dishes = {
      "śniadanie": ["Owsianka z owocami", "Kanapki z serem i warzywami", "Płatki z mlekiem", "Jajecznica z pieczywem", "Kasza manna z musem"],
      "obiad": ["Rosół z makaronem + kotlet mielony i ziemniaki", "Zupa pomidorowa + naleśniki", "Barszcz + pierogi ruskie", "Krupnik + ryba z ryżem", "Zupa jarzynowa + gulasz z kaszą"],
      "podwieczorek": ["Jogurt z granolą", "Kisiel z owocami", "Bułka z dżemem + owoc", "Budyń waniliowy", "Koktajl owocowy + herbatniki"],
    };
    const menu = [];
    const start = new Date(2026, 6, 13); // poniedziałek 13.07
    for (let i = 0; i < 5; i++) {
      const d = new Date(start); d.setDate(start.getDate() + i);
      menu.push({
        date: iso(d),
        "śniadanie": dishes["śniadanie"][i],
        "obiad": dishes["obiad"][i],
        "podwieczorek": dishes["podwieczorek"][i],
      });
    }
    return menu;
  }

  /* ============================ STORE ============================ */
  const KB = {
    KEY, SESSION, today: iso(today),
    _cache: null,

    load() {
      if (this._cache) return this._cache;
      let data;
      try { data = JSON.parse(localStorage.getItem(KEY)); } catch { data = null; }
      if (!data) { data = seed(); this._save(data); }
      this._cache = data;
      return data;
    },
    _save(data) {
      this._cache = data;
      try { localStorage.setItem(KEY, JSON.stringify(data)); } catch {}
    },
    save() { this._save(this._cache); },
    reset() {
      this._cache = null;
      try { localStorage.removeItem(KEY); } catch {}
      return this.load();
    },
    replace(data) { this._save(data); return data; },

    /* sesja */
    session() {
      try { return JSON.parse(localStorage.getItem(SESSION)); } catch { return null; }
    },
    login(role, id) {
      const s = { role, id };
      localStorage.setItem(SESSION, JSON.stringify(s));
      return s;
    },
    logout() { localStorage.removeItem(SESSION); },

    /* zapytania pomocnicze */
    uid,
    child: (id) => KB.load().children.find((c) => c.id === id),
    group: (id) => KB.load().groups.find((g) => g.id === id),
    childrenOf: (groupId) => KB.load().children.filter((c) => c.groupId === groupId),
    childrenOfParent: (parentId) => KB.load().children.filter((c) => c.parentId === parentId),
    staffById: (id) => KB.load().staff.find((s) => s.id === id) || (KB.load().director.id === id ? KB.load().director : null),
    parent: (id) => KB.load().parents.find((p) => p.id === id),
    contractOf: (childId) => KB.load().contracts.find((c) => c.childId === childId),
    attendanceOf: (childId) => KB.load().attendance.filter((a) => a.childId === childId),
    reportOf: (childId, date) => KB.load().reports.find((r) => r.childId === childId && r.date === date),
    invoicesOf: (childId) => KB.load().invoices.filter((i) => i.childId === childId),
  };

  window.KB = KB;
})();
