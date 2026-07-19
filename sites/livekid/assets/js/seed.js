/* ==========================================================================
   KidBloom — warstwa danych (mock backend na localStorage)
   Odwrotna inżynieria funkcji systemu LiveKid. Wersja rozbudowana (v2).
   ========================================================================== */
(function () {
  "use strict";

  const KEY = "kidbloom_v2";
  const SESSION = "kidbloom_session_v2";

  /* --- pomocnicze --- */
  const pad = (n) => String(n).padStart(2, "0");
  const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const today = new Date(2026, 6, 17); // 2026-07-17 (stała data demo, piątek)
  const TODAY = iso(today);
  const addDays = (base, n) => { const d = new Date(base); d.setDate(d.getDate() + n); return d; };
  const daysAgo = (n) => iso(addDays(today, -n));
  const uid = (p) => p + "_" + Math.random().toString(36).slice(2, 9);
  // deterministyczny pseudo-random na potrzeby powtarzalnego ziarna
  let _s = 20260717;
  const rnd = () => { _s = (_s * 1103515245 + 12345) & 0x7fffffff; return _s / 0x7fffffff; };
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)];

  const FIRST_F = ["Zosia", "Lena", "Maja", "Zuzia", "Hania", "Ola", "Ala", "Nadia", "Pola", "Kaja"];
  const FIRST_M = ["Jaś", "Antek", "Franek", "Staś", "Leon", "Kuba", "Adam", "Igor", "Bruno", "Miłosz"];
  const LAST = ["Kowalski", "Nowak", "Wiśniewski", "Wójcik", "Zając", "Kamiński", "Lewandowski", "Dąbrowski", "Mazur", "Krawczyk"];
  const AVA_F = ["🦋", "🐞", "🌸", "🐰", "🦄", "🐤"];
  const AVA_M = ["🐸", "🐝", "🦖", "🚀", "⚽", "🐢"];

  /* ============================ ZIARNO DANYCH ============================ */
  function seed() {
    _s = 20260717;

    const facility = { id: "f1", name: "Przedszkole KidBloom", city: "Warszawa", nip: "5213456789", regon: "146500000", director: "Ewa Zielińska", address: "ul. Słoneczna 12, 02-495 Warszawa", phone: "22 111 22 33", email: "kontakt@kidbloom.pl", capacity: 60, logo: "🌱" };

    // pozostałe placówki (dla samorządu) — dane zbiorcze
    const facilities = [
      facility,
      { id: "f2", name: "Żłobek Tęczowa Kraina", city: "Warszawa", childrenCount: 42, staffCount: 11, attendanceRate: 91, subsidyMonthly: 58800, director: "Marta Lis" },
      { id: "f3", name: "Przedszkole Leśne Skrzaty", city: "Warszawa", childrenCount: 75, staffCount: 16, attendanceRate: 88, subsidyMonthly: 105000, director: "Robert Kowal" },
    ];

    const groups = [
      { id: "g1", name: "Motylki", color: "#ff8fab", ageRange: "3–4 lata", teacherIds: ["t1"], room: "Sala 1" },
      { id: "g2", name: "Biedronki", color: "#ff7a6b", ageRange: "4–5 lat", teacherIds: ["t2"], room: "Sala 2" },
      { id: "g3", name: "Żabki", color: "#4aa8ff", ageRange: "2–3 lata", teacherIds: ["t3"], room: "Sala 3" },
      { id: "g4", name: "Pszczółki", color: "#ffb340", ageRange: "5–6 lat", teacherIds: ["t4"], room: "Sala 4" },
    ];

    const staff = [
      { id: "t1", name: "Magda Nowak", role: "nauczyciel", groupId: "g1", email: "magda.nowak@kidbloom.pl", phone: "600 001 001", qualifications: "wychowanie przedszkolne", hoursWeek: 40, employment: "umowa o pracę" },
      { id: "t2", name: "Karolina Wójcik", role: "nauczyciel", groupId: "g2", email: "k.wojcik@kidbloom.pl", phone: "600 001 002", qualifications: "pedagogika przedszkolna", hoursWeek: 40, employment: "umowa o pracę" },
      { id: "t3", name: "Piotr Lewandowski", role: "nauczyciel", groupId: "g3", email: "p.lewandowski@kidbloom.pl", phone: "600 001 003", qualifications: "wczesne wspomaganie rozwoju", hoursWeek: 32, employment: "umowa o pracę" },
      { id: "t4", name: "Agnieszka Kamińska", role: "nauczyciel", groupId: "g4", email: "a.kaminska@kidbloom.pl", phone: "600 001 004", qualifications: "edukacja wczesnoszkolna", hoursWeek: 40, employment: "umowa o pracę" },
      { id: "s1", name: "mgr Julia Krawczyk", role: "logopeda", groupId: null, email: "logopeda@kidbloom.pl", phone: "600 001 005", qualifications: "logopedia", hoursWeek: 12, employment: "umowa zlecenie" },
      { id: "s2", name: "Tomasz Mazur", role: "rytmika", groupId: null, email: "rytmika@kidbloom.pl", phone: "600 001 006", qualifications: "edukacja muzyczna", hoursWeek: 8, employment: "umowa zlecenie" },
      { id: "s3", name: "Anna Dąbrowska", role: "psycholog", groupId: null, email: "psycholog@kidbloom.pl", phone: "600 001 007", qualifications: "psychologia dziecięca", hoursWeek: 10, employment: "umowa zlecenie" },
    ];

    /* rodzice + dzieci — generowane */
    const parents = [];
    const children = [];
    const contracts = [];
    let cIdx = 0, pIdx = 0;
    const perGroup = { g1: 6, g2: 5, g3: 5, g4: 5 };
    groups.forEach((g) => {
      const n = perGroup[g.id];
      for (let i = 0; i < n; i++) {
        cIdx++; pIdx++;
        const boy = rnd() > 0.5;
        const first = boy ? pick(FIRST_M) : pick(FIRST_F);
        const last = pick(LAST);
        const pid = "p" + pIdx, ch = "c" + cIdx, u = "u" + cIdx;
        parents.push({ id: pid, name: (boy ? pick(["Marek", "Adam", "Paweł", "Tomasz"]) : pick(["Anna", "Katarzyna", "Ewa", "Magda"])) + " " + last, email: `rodzic${pIdx}@example.com`, phone: `600 ${pad(100 + pIdx)} ${pad(200 + pIdx)}` });
        const ageBase = g.id === "g3" ? 2 : g.id === "g1" ? 3 : g.id === "g2" ? 4 : 5;
        const birthY = 2026 - ageBase - Math.floor(rnd() * 2);
        children.push({ id: ch, name: `${first} ${last}`, groupId: g.id, parentId: pid, birth: `${birthY}-${pad(1 + Math.floor(rnd() * 12))}-${pad(1 + Math.floor(rnd() * 27))}`, avatar: boy ? pick(AVA_M) : pick(AVA_F), allergies: rnd() > 0.75 ? pick(["orzechy", "laktoza", "gluten", "truskawki"]) : "brak", contractId: u, diet: rnd() > 0.85 ? pick(["wegetariańska", "bezmleczna", "bezglutenowa"]) : "standardowa" });
        contracts.push({ id: u, childId: ch, from: `${2024 + Math.floor(rnd() * 2)}-09-01`, monthlyFee: 650, mealFee: 18, status: "aktywna", hoursDeclared: "7:00–17:00", signed: true });
      }
    });

    // stałe „główne" konto rodzica: pierwszy rodzic w Motylkach = Anna Kowalska z dwójką dzieci
    parents[0].id = "p1"; parents[0].name = "Anna Kowalska"; parents[0].email = "anna.kowalska@example.com"; parents[0].phone = "600 100 200";
    children[0].id = "c1"; children[0].name = "Zosia Kowalska"; children[0].parentId = "p1"; children[0].avatar = "🦋"; children[0].allergies = "brak"; children[0].contractId = "u1"; children[0].birth = "2022-03-11"; children[0].diet = "standardowa";
    contracts[0].id = "u1"; contracts[0].childId = "c1";
    // drugie dziecko Anny (Antek) w tej samej grupie
    children.push({ id: "c1b", name: "Antek Kowalski", groupId: "g1", parentId: "p1", birth: "2023-05-30", avatar: "🐸", allergies: "brak", contractId: "u1b", diet: "standardowa" });
    contracts.push({ id: "u1b", childId: "c1b", from: "2025-02-01", monthlyFee: 650, mealFee: 18, status: "aktywna", hoursDeclared: "8:00–16:00", signed: false });

    /* obecności: ostatnie 30 dni roboczych */
    const attendance = [];
    let d = 0, count = 0;
    while (count < 30) {
      const dateStr = daysAgo(d); d++;
      const wd = new Date(dateStr).getDay();
      if (wd === 0 || wd === 6) continue;
      count++;
      children.forEach((ch) => {
        const present = rnd() > 0.13;
        const ci = 7 + Math.floor(rnd() * 2);
        const co = 15 + Math.floor(rnd() * 3);
        attendance.push({ id: uid("att"), childId: ch.id, date: dateStr, present, checkIn: present ? `${pad(ci)}:${pad(Math.floor(rnd() * 59))}` : null, checkOut: present ? `${pad(co)}:${pad(Math.floor(rnd() * 59))}` : null });
      });
    }

    const absences = [
      { id: uid("abs"), childId: "c2", from: daysAgo(1), to: daysAgo(1), reason: "Przeziębienie", type: "choroba", reportedBy: "p2", createdAt: daysAgo(2) },
      { id: uid("abs"), childId: "c1", from: daysAgo(6), to: daysAgo(5), reason: "Wizyta u lekarza", type: "inne", reportedBy: "p1", createdAt: daysAgo(7) },
    ];

    const menu = buildMenu();

    const mealOrders = [
      { id: uid("mo"), childId: "c1", date: TODAY, meals: ["śniadanie", "obiad", "podwieczorek"] },
    ];

    const reports = [
      { id: uid("rap"), childId: "c1", date: TODAY, teacherId: "t1", mood: "😊", sleep: "1h 20min", meals: { "śniadanie": "wszystko", "obiad": "połowa", "podwieczorek": "wszystko" }, note: "Zosia miała świetny humor, chętnie brała udział w zajęciach plastycznych. Zjadła prawie wszystko.", photos: ["🎨", "🧩"] },
      { id: uid("rap"), childId: "c1", date: daysAgo(3), teacherId: "t1", mood: "🙂", sleep: "50min", meals: { "śniadanie": "wszystko", "obiad": "wszystko", "podwieczorek": "połowa" }, note: "Dobry dzień, dużo zabaw ruchowych na świeżym powietrzu.", photos: ["🛝"] },
    ];

    const journal = [
      { id: uid("dz"), groupId: "g1", date: TODAY, topic: "Kolory tęczy", desc: "Zajęcia plastyczne — mieszanie kolorów, malowanie tęczy farbami. Realizacja obszaru IV podstawy programowej.", teacherId: "t1", core: "IV.8" },
      { id: uid("dz"), groupId: "g1", date: daysAgo(1), topic: "Liczymy do 5", desc: "Zabawy matematyczne z liczmanami, przeliczanie w zakresie 5.", teacherId: "t1", core: "IV.15" },
      { id: uid("dz"), groupId: "g1", date: daysAgo(2), topic: "Nasze emocje", desc: "Rozmowa o emocjach, rozpoznawanie min, zabawa „lustro emocji”.", teacherId: "t1", core: "I.9" },
      { id: uid("dz"), groupId: "g2", date: TODAY, topic: "Podróż po Polsce", desc: "Poznajemy największe miasta i symbole narodowe.", teacherId: "t2", core: "III.4" },
    ];

    const planDnia = [
      { id: uid("pd"), groupId: "g1", time: "07:00", title: "Schodzenie się dzieci, zabawy dowolne" },
      { id: uid("pd"), groupId: "g1", time: "08:30", title: "Śniadanie" },
      { id: uid("pd"), groupId: "g1", time: "09:00", title: "Zajęcia dydaktyczne" },
      { id: uid("pd"), groupId: "g1", time: "10:30", title: "Pobyt na świeżym powietrzu" },
      { id: uid("pd"), groupId: "g1", time: "12:00", title: "Obiad" },
      { id: uid("pd"), groupId: "g1", time: "12:45", title: "Odpoczynek / leżakowanie" },
      { id: uid("pd"), groupId: "g1", time: "14:30", title: "Podwieczorek" },
      { id: uid("pd"), groupId: "g1", time: "15:00", title: "Zabawy popołudniowe, zajęcia dodatkowe" },
    ];

    const observations = [
      { id: uid("obs"), childId: "c1", date: daysAgo(10), teacherId: "t1", area: "Rozwój społeczny", text: "Zosia chętnie współpracuje w grupie, potrafi dzielić się zabawkami. Coraz śmielej zabiera głos podczas zajęć.", rating: 4 },
      { id: uid("obs"), childId: "c1", date: daysAgo(30), teacherId: "t1", area: "Rozwój poznawczy", text: "Rozpoznaje podstawowe kolory i kształty. Liczy do 5. Wymaga wsparcia w koncentracji przy dłuższych zadaniach.", rating: 3 },
    ];

    const announcements = [
      { id: uid("ann"), title: "Wycieczka do ZOO", body: "W piątek 24.07 wybieramy się do ZOO. Prosimy o wygodne buty i czapki z daszkiem. Zbiórka 8:30.", audience: "all", authorId: "d1", date: daysAgo(1), pinned: true, category: "wydarzenie" },
      { id: uid("ann"), title: "Zebranie z rodzicami", body: "Zapraszamy na zebranie podsumowujące rok — wtorek 29.07 o 17:00, sala Motylków.", audience: "all", authorId: "d1", date: daysAgo(3), pinned: false, category: "organizacja" },
      { id: uid("ann"), title: "Zmiana jadłospisu", body: "Od poniedziałku wprowadzamy nowy, sezonowy jadłospis z lokalnymi warzywami.", audience: "all", authorId: "d1", date: daysAgo(5), pinned: false, category: "żywienie" },
    ];

    const messages = [
      { id: uid("th"), participants: ["p1", "t1"], childId: "c1", title: "Magda Nowak", msgs: [
        { from: "t1", text: "Dzień dobry! Zosia dziś świetnie się bawiła 😊", at: daysAgo(0) + " 14:20" },
        { from: "p1", text: "Dziękuję za informację! Odbiorę ją dziś o 16.", at: daysAgo(0) + " 14:35" },
      ] },
      { id: uid("th"), participants: ["p1", "d1"], childId: null, title: "Dyrekcja — Ewa Zielińska", msgs: [
        { from: "d1", text: "Przypominamy o dostarczeniu zgody na wycieczkę do ZOO.", at: daysAgo(1) + " 09:00" },
      ] },
    ];

    const events = [
      { id: uid("ev"), date: "2026-07-24", title: "Wycieczka do ZOO", type: "wydarzenie" },
      { id: uid("ev"), date: "2026-07-29", title: "Zebranie z rodzicami", type: "zebranie" },
      { id: uid("ev"), date: "2026-08-15", title: "Dzień wolny — Wniebowzięcie NMP", type: "dzien-wolny" },
      { id: uid("ev"), date: "2026-07-21", title: "Teatrzyk „Calineczka”", type: "wydarzenie" },
      { id: uid("ev"), date: "2026-07-31", title: "Bal letni", type: "wydarzenie" },
    ];

    const gallery = [
      { id: uid("alb"), groupId: "g1", title: "Zajęcia plastyczne", date: daysAgo(1), photos: ["🎨", "🖼️", "✂️", "🖌️"] },
      { id: uid("alb"), groupId: "g1", title: "Zabawy na placu", date: daysAgo(4), photos: ["🛝", "⚽", "🌳", "🏃"] },
      { id: uid("alb"), groupId: "g1", title: "Dzień Rodziny", date: daysAgo(12), photos: ["👨‍👩‍👧", "🎈", "🎂", "💐", "🎉"] },
      { id: uid("alb"), groupId: "g2", title: "Wycieczka do parku", date: daysAgo(6), photos: ["🌲", "🦆", "🍃"] },
    ];

    const recruitment = [
      { id: uid("rek"), childName: "Filip Nowicki", birth: "2023-02-14", parentName: "Ewa Nowicka", phone: "600 700 800", email: "e.nowicka@example.com", groupPref: "Żabki", status: "nowe", stage: "zgłoszenie", date: daysAgo(2), note: "" },
      { id: uid("rek"), childName: "Maja Dąbrowska", birth: "2022-11-03", parentName: "Adam Dąbrowski", phone: "600 900 100", email: "a.dabrowski@example.com", groupPref: "Motylki", status: "nowe", stage: "zgłoszenie", date: daysAgo(5), note: "" },
      { id: uid("rek"), childName: "Igor Wróbel", birth: "2021-06-20", parentName: "Karolina Wróbel", phone: "600 300 300", email: "k.wrobel@example.com", groupPref: "Pszczółki", status: "wtoku", stage: "rozmowa", date: daysAgo(9), note: "Umówiona rozmowa 22.07" },
    ];

    /* faktury: 3 miesiące (05, 06, 07 2026) */
    const invoices = [];
    ["2026-05", "2026-06", "2026-07"].forEach((month, mi) => {
      children.forEach((ch, i) => {
        const c = contracts.find((x) => x.childId === ch.id);
        const days = 18 + Math.floor(rnd() * 4);
        const meals = days * c.mealFee;
        const total = c.monthlyFee + meals;
        const isCurrent = month === "2026-07";
        invoices.push({
          id: uid("fv"), number: `FV/${month.replace("-", "/")}/${pad(i + 1)}`, childId: ch.id, month,
          items: [
            { name: "Czesne (opłata stała)", amount: c.monthlyFee },
            { name: `Wyżywienie (${days} dni × ${c.mealFee} zł)`, amount: meals },
          ],
          total, paid: isCurrent ? (i % 3 !== 0) : true, dueDate: `${month}-10`, days,
        });
      });
    });

    const payments = invoices.filter((i) => i.paid).slice(0, 20).map((i) => ({ id: uid("pay"), invoiceId: i.id, childId: i.childId, amount: i.total, date: i.dueDate, method: pick(["Przelewy24", "przelew", "BLIK"]) }));

    /* dokumenty i zgody */
    const documents = [];
    children.forEach((ch) => {
      documents.push({ id: uid("doc"), childId: ch.id, name: "Umowa o świadczenie usług", type: "umowa", date: KB_contractDate(contracts, ch.id), signed: true });
      documents.push({ id: uid("doc"), childId: ch.id, name: "Karta informacyjna dziecka", type: "karta", date: KB_contractDate(contracts, ch.id), signed: true });
    });
    const consents = [];
    children.forEach((ch) => {
      consents.push({ id: uid("con"), childId: ch.id, name: "Zgoda na przetwarzanie danych (RODO)", granted: true, date: KB_contractDate(contracts, ch.id) });
      consents.push({ id: uid("con"), childId: ch.id, name: "Zgoda na publikację wizerunku", granted: ch.id !== "c2", date: KB_contractDate(contracts, ch.id) });
      consents.push({ id: uid("con"), childId: ch.id, name: "Zgoda na wycieczki", granted: ch.id !== "c1" ? true : false, date: KB_contractDate(contracts, ch.id) });
    });

    /* grafiki i nieobecności kadry */
    const staffSchedule = staff.map((s) => ({ staffId: s.id, mon: "7:00–15:00", tue: "7:00–15:00", wed: "7:00–15:00", thu: "7:00–15:00", fri: "7:00–15:00" }));
    const staffAbsences = [
      { id: uid("sabs"), staffId: "t2", from: daysAgo(8), to: daysAgo(6), type: "urlop wypoczynkowy" },
      { id: uid("sabs"), staffId: "s1", from: daysAgo(2), to: daysAgo(2), type: "L4" },
    ];

    /* dotacje (samorząd) */
    const subsidies = facilities.map((f, i) => ({
      facilityId: f.id, month: "2026-07",
      childrenCount: f.id === "f1" ? children.length : f.childrenCount,
      ratePerChild: 1400,
      amount: (f.id === "f1" ? children.length : f.childrenCount) * 1400,
      status: i === 0 ? "wypłacona" : i === 1 ? "do wypłaty" : "wypłacona",
    }));

    /* powiadomienia per rola/użytkownik */
    const notifications = [
      { id: uid("n"), userId: "p1", icon: "📣", text: "Nowe ogłoszenie: Wycieczka do ZOO", date: daysAgo(1), read: false },
      { id: uid("n"), userId: "p1", icon: "💬", text: "Nowa wiadomość od Magdy Nowak", date: daysAgo(0), read: false },
      { id: uid("n"), userId: "p1", icon: "💳", text: "Faktura FV/2026/07 do zapłaty", date: daysAgo(2), read: true },
      { id: uid("n"), userId: "t1", icon: "📝", text: "3 raporty dzienne do uzupełnienia", date: daysAgo(0), read: false },
      { id: uid("n"), userId: "d1", icon: "📥", text: "2 nowe zgłoszenia rekrutacyjne", date: daysAgo(2), read: false },
      { id: uid("n"), userId: "d1", icon: "⚠️", text: "Zaległe płatności: kilka faktur", date: daysAgo(1), read: false },
      { id: uid("n"), userId: "sm1", icon: "💰", text: "Dotacja lipcowa do wypłaty (Tęczowa Kraina)", date: daysAgo(1), read: false },
      { id: uid("n"), userId: "s1", icon: "🗣️", text: "Dziś 3 sesje logopedyczne w planie", date: daysAgo(0), read: false },
    ];

    /* opieka specjalistów (podopieczni) + dziennik sesji */
    const specialistCare = [
      { specialistId: "s1", childId: "c1" }, { specialistId: "s1", childId: "c3" }, { specialistId: "s1", childId: "c6" },
      { specialistId: "s3", childId: "c2" }, { specialistId: "s3", childId: "c9" },
    ];
    const therapySessions = [
      { id: uid("ts"), specialistId: "s1", childId: "c1", date: daysAgo(3), type: "Terapia logopedyczna", notes: "Ćwiczenia głoski sz. Zosia robi wyraźne postępy, chętnie powtarza.", next: "2026-07-24" },
      { id: uid("ts"), specialistId: "s1", childId: "c3", date: daysAgo(3), type: "Terapia logopedyczna", notes: "Ćwiczenia oddechowe i usprawnianie aparatu mowy.", next: "2026-07-24" },
      { id: uid("ts"), specialistId: "s1", childId: "c1", date: daysAgo(10), type: "Diagnoza logopedyczna", notes: "Ocena artykulacji — zalecane ćwiczenia głosek szumiących.", next: "2026-07-17" },
      { id: uid("ts"), specialistId: "s3", childId: "c2", date: daysAgo(5), type: "Wsparcie psychologiczne", notes: "Praca nad regulacją emocji i adaptacją w grupie.", next: "2026-07-22" },
    ];

    /* zajęcia dodatkowe (płatne) */
    const classes = [
      { id: "zd1", name: "Język angielski", instructor: "Native Speaker School", day: "Poniedziałek", time: "10:00", price: 120, capacity: 15, enrolled: ["c1", "c3", "c6", "c9"] },
      { id: "zd2", name: "Rytmika", instructor: "Tomasz Mazur", day: "Wtorek", time: "11:00", price: 80, capacity: 20, enrolled: ["c1", "c2", "c4", "c5", "c7"] },
      { id: "zd3", name: "Zajęcia taneczne", instructor: "Studio Tańca Krok", day: "Środa", time: "15:00", price: 100, capacity: 12, enrolled: ["c3", "c8"] },
      { id: "zd4", name: "Robotyka i klocki LEGO", instructor: "MiniTech", day: "Czwartek", time: "15:30", price: 140, capacity: 10, enrolled: ["c6", "c1b"] },
      { id: "zd5", name: "Basen", instructor: "Aquapark Fala", day: "Piątek", time: "9:30", price: 160, capacity: 16, enrolled: ["c2", "c9", "c1"] },
    ];

    // dolicz zajęcia dodatkowe do faktur bieżącego miesiąca
    invoices.filter((i) => i.month === "2026-07").forEach((inv) => {
      classes.forEach((z) => { if (z.enrolled.includes(inv.childId)) { inv.items.push({ name: `Zajęcia: ${z.name}`, amount: z.price }); inv.total += z.price; } });
    });

    // salda kont (nadpłaty) i upoważnienia do odbioru
    const balances = [
      { childId: "c1", overpayment: 65 }, { childId: "c3", overpayment: 120 },
    ];
    const pickups = [
      { id: uid("pu"), childId: "c1", name: "Barbara Kowalska", relation: "babcia", phone: "601 111 222" },
      { id: uid("pu"), childId: "c1", name: "Piotr Kowalski", relation: "tata", phone: "601 333 444" },
      { id: uid("pu"), childId: "c2", name: "Anna Wiśniewska", relation: "mama", phone: "602 555 666" },
    ];

    const director = { id: "d1", name: "Ewa Zielińska", role: "dyrektor", email: "dyrektor@kidbloom.pl", facilityId: "f1" };
    const samorzad = { id: "sm1", name: "Wydział Edukacji UM", role: "samorzad", email: "edukacja@um.warszawa.pl" };

    return {
      facility, facilities, groups, staff, parents, children, contracts, director, samorzad,
      attendance, absences, menu, mealOrders, reports, journal, planDnia, observations,
      announcements, messages, events, gallery, recruitment, invoices, payments,
      documents, consents, staffSchedule, staffAbsences, subsidies, notifications,
      specialistCare, therapySessions, classes, balances, pickups,
    };
  }

  function KB_contractDate(contracts, childId) {
    const c = contracts.find((x) => x.childId === childId);
    return c ? c.from : "2024-09-01";
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
      const d = addDays(start, i);
      menu.push({ date: iso(d), "śniadanie": dishes["śniadanie"][i], "obiad": dishes["obiad"][i], "podwieczorek": dishes["podwieczorek"][i] });
    }
    return menu;
  }

  /* ============================ STORE ============================ */
  const KB = {
    KEY, SESSION, today: TODAY, uid, iso,
    _cache: null,

    load() {
      if (this._cache) return this._cache;
      let data;
      try { data = JSON.parse(localStorage.getItem(KEY)); } catch { data = null; }
      if (!data || !data.facilities || !data.therapySessions || !data.classes || !data.pickups) { data = seed(); this._save(data); }
      this._cache = data;
      return data;
    },
    _save(data) { this._cache = data; try { localStorage.setItem(KEY, JSON.stringify(data)); } catch {} },
    save() { this._save(this._cache); },
    reset() { this._cache = null; try { localStorage.removeItem(KEY); } catch {} return this.load(); },
    replace(data) { this._save(data); this._cache = data; return data; },
    export() { return JSON.stringify(this.load(), null, 2); },

    session() { try { return JSON.parse(localStorage.getItem(SESSION)); } catch { return null; } },
    login(role, id) { const s = { role, id }; localStorage.setItem(SESSION, JSON.stringify(s)); return s; },
    patchSession(patch) { const s = this.session() || {}; Object.assign(s, patch); localStorage.setItem(SESSION, JSON.stringify(s)); return s; },
    logout() { localStorage.removeItem(SESSION); },

    /* zapytania pomocnicze */
    child: (id) => KB.load().children.find((c) => c.id === id),
    group: (id) => KB.load().groups.find((g) => g.id === id),
    childrenOf: (groupId) => KB.load().children.filter((c) => c.groupId === groupId),
    childrenOfParent: (parentId) => KB.load().children.filter((c) => c.parentId === parentId),
    staffById: (id) => KB.load().staff.find((s) => s.id === id) || (KB.load().director.id === id ? KB.load().director : (KB.load().samorzad.id === id ? KB.load().samorzad : null)),
    parent: (id) => KB.load().parents.find((p) => p.id === id),
    contractOf: (childId) => KB.load().contracts.find((c) => c.childId === childId),
    attendanceOf: (childId) => KB.load().attendance.filter((a) => a.childId === childId),
    reportOf: (childId, date) => KB.load().reports.find((r) => r.childId === childId && r.date === date),
    invoicesOf: (childId) => KB.load().invoices.filter((i) => i.childId === childId),
    notifsOf: (userId) => KB.load().notifications.filter((n) => n.userId === userId),
    careOf: (specialistId) => KB.load().specialistCare.filter((c) => c.specialistId === specialistId).map((c) => KB.child(c.childId)).filter(Boolean),
    sessionsOf: (specialistId) => KB.load().therapySessions.filter((s) => s.specialistId === specialistId),
    sessionsForChild: (childId) => KB.load().therapySessions.filter((s) => s.childId === childId),
    pickupsOf: (childId) => KB.load().pickups.filter((p) => p.childId === childId),
    overpaymentOf: (childId) => { const b = (KB.load().balances || []).find((x) => x.childId === childId); return b ? b.overpayment : 0; },
    classesOf: (childId) => KB.load().classes.filter((z) => z.enrolled.includes(childId)),
    ageFrom: (birth) => { const b = new Date(birth), t = new Date(TODAY); let a = t.getFullYear() - b.getFullYear(); if (t.getMonth() < b.getMonth() || (t.getMonth() === b.getMonth() && t.getDate() < b.getDate())) a--; return a; },
  };

  window.KB = KB;
})();
