/* ==========================================================================
   KidBloom — biblioteka materiałów edukacyjnych (jak sekcja „Materiały" LiveKid)
   Oryginalne, przykładowe materiały do pobrania/druku. Bez zależności.
   ========================================================================== */
(function () {
  "use strict";

  const CATS = [
    { id: "scenariusz", label: "Scenariusze zajęć", ico: "📝", color: "#4aa8ff" },
    { id: "karta", label: "Karty pracy", ico: "✏️", color: "#0eb39e" },
    { id: "kolorowanka", label: "Kolorowanki", ico: "🎨", color: "#ff7a6b" },
    { id: "matematyka", label: "Zadania matematyczne", ico: "🔢", color: "#9b8cff" },
    { id: "arkusz", label: "Arkusze obserwacji", ico: "📋", color: "#ffb340" },
    { id: "dokument", label: "Wzory dokumentów", ico: "📄", color: "#ff8fab" },
    { id: "dyplom", label: "Dyplomy", ico: "🏅", color: "#f5a623" },
    { id: "ebook", label: "E-booki i poradniki", ico: "📚", color: "#3fbf7f" },
  ];

  // roles: kto ma dostęp. 'r' rodzic, 'n' nauczyciel, 'd' dyrektor
  const ITEMS = [
    { id: "sc1", cat: "scenariusz", title: "Cztery pory roku", age: "3–4 lata", roles: "nd", desc: "Zajęcia przyrodnicze — poznajemy zmiany w przyrodzie i cechy pór roku." },
    { id: "sc2", cat: "scenariusz", title: "Emocje i uczucia", age: "4–5 lat", roles: "nd", desc: "Rozpoznawanie i nazywanie emocji, zabawy integracyjne." },
    { id: "sc3", cat: "scenariusz", title: "Bezpieczeństwo na drodze", age: "5–6 lat", roles: "nd", desc: "Zasady ruchu drogowego, sygnalizacja świetlna, przejście dla pieszych." },
    { id: "sc4", cat: "scenariusz", title: "Dzień Ziemi — ekologia", age: "wszystkie", roles: "nd", desc: "Segregacja odpadów, dbanie o przyrodę, zabawy sensoryczne." },
    { id: "kp1", cat: "karta", title: "Szlaczki i wzory", age: "3–4 lata", roles: "rnd", desc: "Ćwiczenia grafomotoryczne — rysowanie szlaczków po śladzie." },
    { id: "kp2", cat: "karta", title: "Litera A — nauka pisania", age: "5–6 lat", roles: "rnd", desc: "Nauka pisania litery A, wyszukiwanie w wyrazach." },
    { id: "kp3", cat: "karta", title: "Znajdź różnice", age: "4–5 lat", roles: "rnd", desc: "Zabawa spostrzegawczości — 7 różnic między obrazkami." },
    { id: "ko1", cat: "kolorowanka", title: "Wiosenny kwiat", age: "wszystkie", roles: "rnd", desc: "Kolorowanka z motywem kwiatka i motylka." },
    { id: "ko2", cat: "kolorowanka", title: "Zwierzątka na wsi", age: "3–4 lata", roles: "rnd", desc: "Kolorowanka: kotek, piesek, kaczka." },
    { id: "ko3", cat: "kolorowanka", title: "Rakieta kosmiczna", age: "5–6 lat", roles: "rnd", desc: "Kolorowanka z rakietą, gwiazdami i planetą." },
    { id: "ma1", cat: "matematyka", title: "Liczymy do 5", age: "3–4 lata", roles: "rnd", desc: "Przeliczanie elementów w zakresie 5." },
    { id: "ma2", cat: "matematyka", title: "Dodawanie w zakresie 10", age: "5–6 lat", roles: "rnd", desc: "Proste działania na dodawanie z obrazkami." },
    { id: "ma3", cat: "matematyka", title: "Kształty i figury", age: "4–5 lat", roles: "rnd", desc: "Rozpoznawanie figur geometrycznych." },
    { id: "ar1", cat: "arkusz", title: "Arkusz obserwacji dziecka", age: "wszystkie", roles: "nd", desc: "Gotowy arkusz do obserwacji rozwoju dziecka w 5 obszarach." },
    { id: "ar2", cat: "arkusz", title: "Arkusz diagnozy przedszkolnej", age: "5–6 lat", roles: "nd", desc: "Diagnoza gotowości szkolnej — karta zbiorcza." },
    { id: "dk1", cat: "dokument", title: "Zgoda na wykorzystanie wizerunku", age: "—", roles: "d", desc: "Wzór zgody RODO na publikację wizerunku dziecka." },
    { id: "dk2", cat: "dokument", title: "Upoważnienie do odbioru dziecka", age: "—", roles: "d", desc: "Wzór upoważnienia dla osób trzecich." },
    { id: "dk3", cat: "dokument", title: "Umowa o świadczenie usług (wzór)", age: "—", roles: "d", desc: "Ramowy wzór umowy z rodzicem." },
    { id: "dy1", cat: "dyplom", title: "Dyplom przedszkolaka", age: "wszystkie", roles: "nd", desc: "Dyplom na zakończenie roku przedszkolnego." },
    { id: "dy2", cat: "dyplom", title: "Dyplom za udział w konkursie", age: "wszystkie", roles: "nd", desc: "Uniwersalny dyplom konkursowy." },
    { id: "eb1", cat: "ebook", title: "Adaptacja w przedszkolu — poradnik", age: "—", roles: "rnd", desc: "Jak przygotować dziecko i siebie do startu w przedszkolu." },
    { id: "eb2", cat: "ebook", title: "Rozliczanie dotacji oświatowej 2026", age: "—", roles: "d", desc: "Poradnik dla dyrektora: zasady i najczęstsze błędy." },
    { id: "eb3", cat: "ebook", title: "Jak prowadzić dziennik elektroniczny", age: "—", roles: "nd", desc: "Dobre praktyki wpisów w e-dzienniku." },
  ];

  /* --------- generatory treści do druku (oryginalne) --------- */
  const box = (t) => `<div class="box">${t}</div>`;
  function gen(item) {
    const head = `<div class="brand">🌱 KidBloom · Materiały</div><h1>${esc(item.title)}</h1><p class="muted">${cat(item.cat).label} · ${esc(item.age)}</p>`;
    switch (item.cat) {
      case "scenariusz":
        return head + box(`<b>Cel zajęć:</b> ${esc(item.desc)}<br><b>Grupa wiekowa:</b> ${esc(item.age)}<br><b>Czas:</b> 30 min`) +
          `<h3>Przebieg zajęć</h3><ol><li><b>Powitanie</b> — piosenka na powitanie, krąg.</li><li><b>Wprowadzenie</b> — rozmowa kierowana na temat „${esc(item.title)}".</li><li><b>Część główna</b> — zabawa dydaktyczna i praca plastyczna.</li><li><b>Zabawa ruchowa</b> — aktywność przy muzyce.</li><li><b>Podsumowanie</b> — omówienie, ewaluacja (buźki).</li></ol>` +
          `<p><b>Pomoce:</b> ilustracje, kredki, karty pracy, instrumenty.</p><p><b>Podstawa programowa:</b> obszar I, III, IV.</p>`;
      case "karta":
        return head + box("Wykonaj zadania zgodnie z poleceniem. Powodzenia! ✏️") +
          `<h3>Zadanie 1</h3><p>Narysuj po śladzie:</p><div style="font-size:2rem;letter-spacing:8px;color:#bbb">∿∿∿∿∿∿∿∿∿∿</div>` +
          `<h3>Zadanie 2</h3><p>Pokoloruj co drugie kółko:</p><div style="font-size:1.8rem;letter-spacing:10px">◯ ◯ ◯ ◯ ◯ ◯ ◯ ◯</div>` +
          `<h3>Zadanie 3</h3><p>Połącz w pary takie same elementy.</p><div style="height:120px;border:1px dashed #ccc;border-radius:10px"></div>`;
      case "kolorowanka":
        return head + `<p class="muted">Pokoloruj obrazek 🎨</p>` +
          `<svg viewBox="0 0 300 260" width="100%" style="max-width:420px;display:block;margin:10px auto">
            <circle cx="150" cy="90" r="34" fill="none" stroke="#333" stroke-width="2.5"/>
            ${[0, 60, 120, 180, 240, 300].map((a) => { const r = a * Math.PI / 180; return `<ellipse cx="${150 + Math.cos(r) * 60}" cy="${90 + Math.sin(r) * 60}" rx="26" ry="16" fill="none" stroke="#333" stroke-width="2.5" transform="rotate(${a} ${150 + Math.cos(r) * 60} ${90 + Math.sin(r) * 60})"/>`; }).join("")}
            <line x1="150" y1="124" x2="150" y2="230" stroke="#333" stroke-width="2.5"/>
            <path d="M150 180 q-40 -20 -60 6" fill="none" stroke="#333" stroke-width="2.5"/>
            <path d="M150 200 q40 -20 60 6" fill="none" stroke="#333" stroke-width="2.5"/>
          </svg>`;
      case "matematyka":
        return head + box("Policz i wpisz wynik. 🔢") +
          `<h3>Przeliczanie</h3><p style="font-size:1.4rem">🍎🍎🍎 = ____   🐟🐟 = ____   ⭐⭐⭐⭐ = ____</p>` +
          `<h3>Dodawanie</h3><p style="font-size:1.4rem">2 + 3 = ____ &nbsp; 4 + 1 = ____ &nbsp; 5 + 2 = ____</p>` +
          `<h3>Figury</h3><p>Otocz pętlą wszystkie trójkąty: △ ◯ △ □ △ ◯ □ △</p>`;
      case "arkusz":
        return head + box("Arkusz do wypełnienia przez nauczyciela. Skala: 1–5.") +
          `<table><thead><tr><th>Obszar rozwoju</th><th>Ocena (1–5)</th><th>Uwagi</th></tr></thead><tbody>${["Rozwój społeczny", "Rozwój poznawczy", "Sprawność ruchowa", "Samodzielność", "Mowa i komunikacja"].map((o) => `<tr><td>${o}</td><td style="width:80px">&nbsp;</td><td style="width:200px">&nbsp;</td></tr>`).join("")}</tbody></table>` +
          `<p><b>Dziecko:</b> ................................. &nbsp; <b>Data:</b> ................</p><p><b>Podpis nauczyciela:</b> .................................</p>`;
      case "dokument":
        return head + box(`Niniejszy dokument stanowi wzór do wykorzystania w placówce.`) +
          `<p>Ja, niżej podpisany/a ................................................., oświadczam, że ${item.id === "dk1" ? "wyrażam / nie wyrażam* zgody na nieodpłatne wykorzystanie wizerunku mojego dziecka ................................. do celów promocyjnych placówki, zgodnie z RODO." : item.id === "dk2" ? "upoważniam do odbioru mojego dziecka ................................. następujące osoby: ..............................................." : "zawieram umowę o świadczenie usług opiekuńczo-wychowawczych na warunkach określonych w regulaminie placówki."}</p>` +
          `<p style="margin-top:30px">.............................<br>data i podpis</p><p class="muted">* niepotrzebne skreślić</p>`;
      case "dyplom":
        return `<div style="border:8px double #b8912c;border-radius:16px;padding:40px;text-align:center">
            <div class="brand" style="justify-content:center">🌱 KidBloom</div>
            <h1 style="font-size:2rem;color:#0a8c7d">${esc(item.title)}</h1>
            <p style="font-size:1.1rem">otrzymuje</p>
            <p style="font-size:1.6rem;font-weight:900;margin:10px 0">..............................................</p>
            <p>${item.id === "dy1" ? "za ukończenie roku przedszkolnego i wspaniałe postępy 🎓" : "za udział i zaangażowanie w konkursie 🏅"}</p>
            <p style="margin-top:30px" class="muted">Data: ................ &nbsp;&nbsp; Podpis: ................</p>
          </div>`;
      case "ebook":
        return head + box(`<b>O poradniku:</b> ${esc(item.desc)}`) +
          `<h3>Spis treści</h3><ol>${(item.id === "eb2" ? ["Podstawy prawne dotacji", "Jak liczyć frekwencję", "Wydatki kwalifikowane", "Najczęstsze błędy", "Kontrola — jak się przygotować"] : item.id === "eb3" ? ["Po co e-dziennik", "Codzienne wpisy krok po kroku", "Realizacja podstawy programowej", "Współpraca z rodzicami", "Raporty i archiwizacja"] : ["Pierwszy dzień w przedszkolu", "Jak wspierać dziecko", "Rytuały pożegnania", "Współpraca z kadrą", "Kiedy szukać pomocy"]).map((t) => `<li>${t}</li>`).join("")}</ol>` +
          `<p class="muted">Pełna wersja do pobrania w panelu KidBloom.</p>`;
      default:
        return head + box(esc(item.desc));
    }
  }

  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const cat = (id) => CATS.find((c) => c.id === id) || { label: id, ico: "📄", color: "#888" };

  window.MAT = {
    CATS, ITEMS, cat,
    forRole: (roleLetter) => ITEMS.filter((i) => i.roles.includes(roleLetter)),
    byId: (id) => ITEMS.find((i) => i.id === id),
    render: gen,
  };
})();
