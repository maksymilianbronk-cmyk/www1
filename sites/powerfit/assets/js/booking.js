/* POWERFIT — rezerwacja zajęć online w stylu Booksy (demo, localStorage) */
(function () {
  "use strict";

  const body = document.getElementById("bookingBody");
  if (!body) return;

  /* ---------- katalog usług ---------- */
  // dni: 0=Nd 1=Pn 2=Wt 3=Śr 4=Cz 5=Pt 6=So
  const SERVICES = [
    {
      id: "probny", group: "Treningi z trenerką Iwoną",
      name: "Trening próbny", desc: "Pierwsza wizyta — poznaj klub i trenerkę",
      dur: 60, price: 0, type: "personal",
    },
    {
      id: "personalny", group: "Treningi z trenerką Iwoną",
      name: "Trening personalny 1:1", desc: "Indywidualny plan i pełna uwaga trenerki",
      dur: 60, price: 120, type: "personal",
    },
    {
      id: "konsultacja", group: "Treningi z trenerką Iwoną",
      name: "Konsultacja + analiza składu ciała", desc: "Cele, pomiary i plan działania",
      dur: 30, price: 60, type: "personal",
    },
    {
      id: "pump", group: "Zajęcia grupowe",
      name: "Power Pump", desc: "Trening całego ciała ze sztangami",
      dur: 45, price: 30, type: "group",
      schedule: { 1: ["18:30"], 2: ["17:00"], 3: ["18:30"], 4: ["17:00"], 5: ["18:30"] },
    },
    {
      id: "cardio", group: "Zajęcia grupowe",
      name: "Fit Cardio", desc: "Interwały spalające kalorie",
      dur: 45, price: 30, type: "group",
      schedule: { 1: ["17:00"], 3: ["17:00"], 5: ["17:00"] },
    },
    {
      id: "kregoslup", group: "Zajęcia grupowe",
      name: "Zdrowy kręgosłup", desc: "Wzmacnianie mięśni głębokich",
      dur: 45, price: 30, type: "group",
      schedule: { 1: ["9:00"], 3: ["9:00"], 4: ["18:30"] },
    },
    {
      id: "mobility", group: "Zajęcia grupowe",
      name: "Mobility & Stretch", desc: "Zakresy ruchu i regeneracja",
      dur: 45, price: 30, type: "group",
      schedule: { 2: ["18:30"], 5: ["9:00"] },
    },
  ];

  const CAPACITY = 12;
  const DOW = ["Nd", "Pn", "Wt", "Śr", "Cz", "Pt", "So"];
  const MON = ["sty", "lut", "mar", "kwi", "maj", "cze", "lip", "sie", "wrz", "paź", "lis", "gru"];
  const STORE = "pf-bookings";

  const state = { step: 1, service: null, date: null, time: null };

  /* ---------- pomocnicze ---------- */
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const hash = (s) => {
    let h = 5381;
    for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
    return h;
  };

  const iso = (d) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");

  const fmtDate = (isoStr) => {
    const [y, m, d] = isoStr.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    return DOW[dt.getDay()] + ", " + d + " " + MON[m - 1] + " " + y;
  };

  const getBookings = () => {
    try { return JSON.parse(localStorage.getItem(STORE)) || []; } catch (e) { return []; }
  };
  const saveBookings = (list) => localStorage.setItem(STORE, JSON.stringify(list));

  const price = (v) => (v === 0 ? "Gratis" : v + " zł");

  /* ---------- dostępność slotów ---------- */
  const slotsFor = (svc, dateIso, dow) => {
    const out = [];
    const now = new Date();
    const todayIso = iso(now);
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const booked = getBookings();

    const pushSlot = (time, seatsLeft) => {
      const [h, m] = time.split(":").map(Number);
      if (dateIso === todayIso && h * 60 + m <= nowMin + 59) return; // min. godzina wyprzedzenia
      const mine = booked.some((b) => b.serviceId === svc.id && b.date === dateIso && b.time === time);
      out.push({ time, seatsLeft, mine });
    };

    if (svc.type === "group") {
      (svc.schedule[dow] || []).forEach((time) => {
        const taken = hash(svc.id + dateIso + time) % 9; // symulacja zapisanych klubowiczów
        const myCount = booked.filter((b) => b.serviceId === svc.id && b.date === dateIso && b.time === time).length;
        pushSlot(time, Math.max(0, CAPACITY - taken - myCount));
      });
    } else {
      if (dow === 0) return out; // treningi personalne pn–so
      const hours = dow === 6 ? [9, 10, 11, 12, 13, 14] : [7, 8, 9, 10, 11, 12, 13, 15, 16, 17, 18, 19, 20];
      hours.forEach((h) => {
        const time = h + ":00";
        const busyIwona = hash("iwona" + dateIso + time) % 4 === 0; // symulacja kalendarza trenerki
        const mineOrOthers = booked.some((b) => b.date === dateIso && b.time === time && SERVICES.find((s) => s.id === b.serviceId)?.type === "personal");
        pushSlot(time, busyIwona || mineOrOthers ? 0 : 1);
      });
    }
    return out;
  };

  const dayHasSlots = (svc, d) => slotsFor(svc, iso(d), d.getDay()).some((s) => s.seatsLeft > 0);

  /* ---------- pasek kroków ---------- */
  const stepsEl = document.getElementById("bookingSteps");
  const paintSteps = () => {
    stepsEl.querySelectorAll("li").forEach((li) => {
      const n = Number(li.dataset.step);
      li.classList.toggle("active", n === state.step);
      li.classList.toggle("done", n < state.step);
      if (n < state.step) li.querySelector("span").textContent = "✓";
      else li.querySelector("span").textContent = n;
    });
  };

  /* ---------- moje rezerwacje ---------- */
  const mbPanel = document.getElementById("myBookings");
  const mbToggle = document.getElementById("myBookingsToggle");
  const mbCount = document.getElementById("myBookingsCount");

  const paintMyBookings = () => {
    const list = getBookings();
    mbCount.textContent = list.length;
    if (!list.length) {
      mbPanel.innerHTML = '<div class="mb-empty">Nie masz jeszcze żadnych rezerwacji.</div>';
      return;
    }
    mbPanel.innerHTML = list
      .map((b) => `
        <div class="mb-row">
          <div>
            <strong>${esc(b.serviceName)}</strong>
            <div class="mb-when">${fmtDate(b.date)}, godz. ${esc(b.time)} · ${esc(b.ref)}</div>
          </div>
          <button type="button" class="mb-cancel" data-ref="${esc(b.ref)}">Odwołaj</button>
        </div>`)
      .join("");
  };

  mbToggle.addEventListener("click", () => {
    mbPanel.hidden = !mbPanel.hidden;
    if (!mbPanel.hidden) paintMyBookings();
  });

  mbPanel.addEventListener("click", (e) => {
    const btn = e.target.closest(".mb-cancel");
    if (!btn) return;
    saveBookings(getBookings().filter((b) => b.ref !== btn.dataset.ref));
    paintMyBookings();
    if (state.step === 2 && state.service) renderStep2(); // odśwież dostępność
  });

  /* ---------- krok 1: usługi ---------- */
  const renderStep1 = () => {
    state.step = 1; paintSteps();
    let html = "";
    let lastGroup = null;
    SERVICES.forEach((s) => {
      if (s.group !== lastGroup) {
        html += `<div class="svc-group-title">${esc(s.group)}</div>`;
        lastGroup = s.group;
      }
      html += `
        <div class="service-row">
          <div>
            <div class="svc-name">${esc(s.name)}</div>
            <div class="svc-meta">
              <span>⏱ ${s.dur} min</span>
              <span class="dot">Trenerka Iwona</span>
              <span class="dot">${esc(s.desc)}</span>
            </div>
          </div>
          <div class="svc-right">
            <div class="svc-price">${s.price === 0 ? "Gratis" : s.price + " zł"}</div>
            <button type="button" class="btn--book" data-svc="${s.id}">Umów</button>
          </div>
        </div>`;
    });
    body.innerHTML = html;
    body.querySelectorAll(".btn--book").forEach((btn) =>
      btn.addEventListener("click", () => {
        state.service = SERVICES.find((s) => s.id === btn.dataset.svc);
        state.date = null;
        state.time = null;
        renderStep2();
      })
    );
  };

  /* ---------- krok 2: termin ---------- */
  const renderStep2 = () => {
    state.step = 2; paintSteps();
    const svc = state.service;
    const days = [];
    const base = new Date();
    for (let i = 0; i < 14; i++) {
      const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + i);
      days.push(d);
    }
    if (!state.date) {
      const firstOk = days.find((d) => dayHasSlots(svc, d));
      state.date = firstOk ? iso(firstOk) : iso(days[0]);
    }

    const dayChips = days
      .map((d) => {
        const dIso = iso(d);
        const ok = dayHasSlots(svc, d);
        return `
          <button type="button" class="day-chip ${dIso === state.date ? "active" : ""}" data-date="${dIso}" ${ok ? "" : "disabled"}>
            <span class="dow">${DOW[d.getDay()]}</span>
            <span class="dnum">${d.getDate()}</span>
            <span class="mon">${MON[d.getMonth()]}</span>
          </button>`;
      })
      .join("");

    const dow = new Date(state.date + "T12:00:00").getDay();
    const slots = slotsFor(svc, state.date, dow);
    const groups = { Rano: [], "Po południu": [], Wieczorem: [] };
    slots.forEach((s) => {
      const h = Number(s.time.split(":")[0]);
      (h < 12 ? groups.Rano : h < 17 ? groups["Po południu"] : groups.Wieczorem).push(s);
    });

    let slotsHtml = "";
    Object.entries(groups).forEach(([label, arr]) => {
      if (!arr.length) return;
      slotsHtml += `
        <div class="slot-group">
          <h4>${label}</h4>
          <div class="slots">
            ${arr.map((s) => {
              const dis = s.seatsLeft <= 0;
              const seats = svc.type === "group" && !dis ? `<small>wolne: ${s.seatsLeft}/${CAPACITY}</small>` : "";
              const mine = s.mine ? `<small>masz rezerwację</small>` : "";
              return `<button type="button" class="slot-chip ${s.time === state.time ? "active" : ""}" data-time="${s.time}" ${dis ? "disabled" : ""}>${s.time}${mine || seats}</button>`;
            }).join("")}
          </div>
        </div>`;
    });
    if (!slotsHtml) slotsHtml = '<div class="slots-empty">Brak wolnych terminów tego dnia — wybierz inną datę.</div>';

    body.innerHTML = `
      <div class="booking-chosen">
        <strong>${esc(svc.name)}</strong>
        <span>⏱ ${svc.dur} min · ${price(svc.price)}</span>
        <button type="button" class="chg" id="chgSvc">zmień usługę</button>
      </div>
      <div class="day-strip">${dayChips}</div>
      ${slotsHtml}
      <div class="booking-actions">
        <button type="button" class="btn btn--back" id="backTo1">← Wstecz</button>
        <button type="button" class="btn btn--red" id="goTo3" ${state.time ? "" : "disabled"} style="${state.time ? "" : "opacity:.5;cursor:not-allowed"}">Dalej →</button>
      </div>`;

    document.getElementById("chgSvc").addEventListener("click", renderStep1);
    document.getElementById("backTo1").addEventListener("click", renderStep1);
    document.getElementById("goTo3").addEventListener("click", () => { if (state.time) renderStep3(); });
    body.querySelectorAll(".day-chip:not(:disabled)").forEach((c) =>
      c.addEventListener("click", () => { state.date = c.dataset.date; state.time = null; renderStep2(); })
    );
    body.querySelectorAll(".slot-chip:not(:disabled)").forEach((c) =>
      c.addEventListener("click", () => { state.time = c.dataset.time; renderStep2(); })
    );
  };

  /* ---------- krok 3: dane ---------- */
  const renderStep3 = () => {
    state.step = 3; paintSteps();
    const svc = state.service;
    body.innerHTML = `
      <div class="booking-grid">
        <form id="bookingForm" novalidate>
          <div class="form-row">
            <div class="field">
              <label for="bk-name">Imię i nazwisko *</label>
              <input id="bk-name" type="text" required placeholder="Jan Kowalski">
            </div>
            <div class="field">
              <label for="bk-phone">Telefon *</label>
              <input id="bk-phone" type="tel" required placeholder="500 000 000">
            </div>
          </div>
          <div class="field">
            <label for="bk-email">E-mail</label>
            <input id="bk-email" type="email" placeholder="jan@przyklad.pl">
          </div>
          <div class="field">
            <label for="bk-notes">Uwagi (opcjonalnie)</label>
            <textarea id="bk-notes" rows="3" placeholder="Np. kontuzje, poziom zaawansowania…"></textarea>
          </div>
        </form>
        <aside class="booking-summary">
          <h4>Podsumowanie</h4>
          <div class="sum-row"><span>Usługa</span><b>${esc(svc.name)}</b></div>
          <div class="sum-row"><span>Trener</span><b>Iwona</b></div>
          <div class="sum-row"><span>Termin</span><b>${fmtDate(state.date)}<br>godz. ${esc(state.time)}</b></div>
          <div class="sum-row"><span>Czas trwania</span><b>${svc.dur} min</b></div>
          <div class="sum-row sum-total"><span>Do zapłaty w klubie</span><b>${price(svc.price)}</b></div>
        </aside>
      </div>
      <div class="booking-actions">
        <button type="button" class="btn btn--back" id="backTo2">← Wstecz</button>
        <button type="button" class="btn btn--red" id="confirmBk">Potwierdzam rezerwację</button>
      </div>`;

    document.getElementById("backTo2").addEventListener("click", renderStep2);
    document.getElementById("confirmBk").addEventListener("click", () => {
      const name = document.getElementById("bk-name").value.trim();
      const phone = document.getElementById("bk-phone").value.trim();
      if (!name || !phone) {
        document.getElementById("bk-name").reportValidity();
        document.getElementById("bookingForm").reportValidity();
        return;
      }
      const ref = "PF-" + Date.now().toString(36).toUpperCase().slice(-6);
      const list = getBookings();
      list.push({
        ref, serviceId: svc.id, serviceName: svc.name,
        date: state.date, time: state.time, price: svc.price,
        name, phone,
        email: document.getElementById("bk-email").value.trim(),
        notes: document.getElementById("bk-notes").value.trim(),
        created: new Date().toISOString(),
      });
      saveBookings(list);
      paintMyBookings();
      renderStep4(ref);
    });
  };

  /* ---------- krok 4: potwierdzenie ---------- */
  const renderStep4 = (ref) => {
    state.step = 4; paintSteps();
    const svc = state.service;
    body.innerHTML = `
      <div class="booking-done">
        <div class="done-check">
          <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6"><path d="M4 12.5l5 5L20 6.5"/></svg>
        </div>
        <h3>Rezerwacja potwierdzona!</h3>
        <div class="done-ref">Nr rezerwacji: ${esc(ref)}</div>
        <p><strong>${esc(svc.name)}</strong> · ${fmtDate(state.date)}, godz. ${esc(state.time)} · trenerka Iwona.<br>
        Do zobaczenia w klubie! Rezerwację znajdziesz w zakładce „Moje rezerwacje" u góry.</p>
        <div class="booking-actions">
          <button type="button" class="btn btn--red" id="bookNext">Zarezerwuj kolejne zajęcia</button>
        </div>
      </div>`;
    document.getElementById("bookNext").addEventListener("click", () => {
      state.service = null; state.date = null; state.time = null;
      renderStep1();
    });
  };

  paintMyBookings();
  renderStep1();
})();
