/* ==========================================================================
   KidBloom — komponenty UI (wykresy SVG, kalendarz, druk) — bez zależności
   ========================================================================== */
(function () {
  "use strict";
  const UI = {};

  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  UI.esc = esc;

  /* ---- wykres słupkowy ---- */
  UI.barChart = function (data, opts = {}) {
    // data: [{label, value, color?}]
    const w = opts.width || 520, h = opts.height || 180, pad = 28;
    const max = Math.max(1, ...data.map((d) => d.value));
    const bw = (w - pad * 2) / data.length;
    const bars = data.map((d, i) => {
      const bh = ((h - pad - 16) * d.value) / max;
      const x = pad + i * bw, y = h - pad - bh;
      const col = d.color || "var(--teal)";
      return `<rect x="${x + bw * 0.18}" y="${y}" width="${bw * 0.64}" height="${bh}" rx="5" fill="${col}"><title>${esc(d.label)}: ${d.value}</title></rect>
        <text x="${x + bw / 2}" y="${h - pad + 14}" text-anchor="middle" font-size="10.5" fill="var(--ink-2)">${esc(d.label)}</text>
        <text x="${x + bw / 2}" y="${y - 5}" text-anchor="middle" font-size="10.5" font-weight="800" fill="var(--ink)">${opts.fmt ? opts.fmt(d.value) : d.value}</text>`;
    }).join("");
    return `<svg viewBox="0 0 ${w} ${h}" width="100%" role="img" aria-label="Wykres słupkowy"><line x1="${pad}" y1="${h - pad}" x2="${w - pad}" y2="${h - pad}" stroke="var(--line)"/>${bars}</svg>`;
  };

  /* ---- wykres liniowy ---- */
  UI.lineChart = function (data, opts = {}) {
    const w = opts.width || 520, h = opts.height || 180, pad = 30;
    const max = Math.max(1, ...data.map((d) => d.value));
    const min = opts.min != null ? opts.min : 0;
    const span = Math.max(1, max - min);
    const step = (w - pad * 2) / Math.max(1, data.length - 1);
    const pts = data.map((d, i) => {
      const x = pad + i * step, y = h - pad - ((h - pad - 14) * (d.value - min)) / span;
      return { x, y, d };
    });
    const path = pts.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
    const area = `${path} L${pts[pts.length - 1].x},${h - pad} L${pts[0].x},${h - pad} Z`;
    const col = opts.color || "var(--teal)";
    const dots = pts.map((p) => `<circle cx="${p.x}" cy="${p.y}" r="3.5" fill="${col}"><title>${esc(p.d.label)}: ${p.d.value}${opts.suffix || ""}</title></circle>`).join("");
    const labels = pts.map((p, i) => (i % opts.labelEvery === 0 || i === pts.length - 1) ? `<text x="${p.x}" y="${h - pad + 14}" text-anchor="middle" font-size="9.5" fill="var(--ink-2)">${esc(p.d.label)}</text>` : "").join("");
    return `<svg viewBox="0 0 ${w} ${h}" width="100%" role="img" aria-label="Wykres liniowy">
      <defs><linearGradient id="lg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${col}" stop-opacity=".22"/><stop offset="1" stop-color="${col}" stop-opacity="0"/></linearGradient></defs>
      <path d="${area}" fill="url(#lg)"/><path d="${path}" fill="none" stroke="${col}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>${dots}${labels}</svg>`;
  };

  /* ---- donut ---- */
  UI.donut = function (segments, opts = {}) {
    // segments: [{label, value, color}]
    const size = opts.size || 150, r = size / 2 - 12, cx = size / 2, cy = size / 2, sw = opts.stroke || 20;
    const total = segments.reduce((s, x) => s + x.value, 0) || 1;
    let off = 0;
    const circ = 2 * Math.PI * r;
    const arcs = segments.map((s) => {
      const frac = s.value / total, len = frac * circ;
      const el = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${s.color}" stroke-width="${sw}" stroke-dasharray="${len} ${circ - len}" stroke-dashoffset="${-off}" transform="rotate(-90 ${cx} ${cy})"><title>${esc(s.label)}: ${s.value}</title></circle>`;
      off += len; return el;
    }).join("");
    const center = opts.center ? `<text x="${cx}" y="${cy - 2}" text-anchor="middle" font-size="22" font-weight="900" fill="var(--ink)">${esc(opts.center)}</text><text x="${cx}" y="${cy + 15}" text-anchor="middle" font-size="10" fill="var(--ink-2)">${esc(opts.centerSub || "")}</text>` : "";
    return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img"><circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="var(--line)" stroke-width="${sw}"/>${arcs}${center}</svg>`;
  };

  UI.legend = function (items) {
    return `<div class="legend">${items.map((i) => `<span class="legend-item"><span class="legend-dot" style="background:${i.color}"></span>${esc(i.label)}${i.value != null ? ` <b>${i.value}</b>` : ""}</span>`).join("")}</div>`;
  };

  /* ---- kalendarz miesięczny ---- */
  UI.monthCalendar = function (year, month, marks, opts = {}) {
    // marks: { 'YYYY-MM-DD': [{color,title}] }
    const first = new Date(year, month, 1);
    const startWd = (first.getDay() + 6) % 7; // pon=0
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const monthName = first.toLocaleDateString("pl-PL", { month: "long", year: "numeric" });
    const wd = ["Pn", "Wt", "Śr", "Cz", "Pt", "So", "Nd"];
    let cells = "";
    for (let i = 0; i < startWd; i++) cells += `<div class="cal-cell cal-empty"></div>`;
    for (let day = 1; day <= daysInMonth; day++) {
      const ds = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const m = marks[ds] || [];
      const isToday = ds === (opts.today || "");
      const dots = m.slice(0, 3).map((x) => `<span class="cal-dot" style="background:${x.color}" title="${esc(x.title)}"></span>`).join("");
      cells += `<div class="cal-cell${isToday ? " cal-today" : ""}${m.length ? " cal-has" : ""}" ${opts.clickable ? `data-act="calDay" data-date="${ds}"` : ""}><span class="cal-num">${day}</span><span class="cal-dots">${dots}</span></div>`;
    }
    return `<div class="cal">
      <div class="cal-head"><button class="cal-nav" data-act="calPrev">‹</button><span class="cal-title">${monthName}</span><button class="cal-nav" data-act="calNext">›</button></div>
      <div class="cal-grid cal-wd">${wd.map((w) => `<div class="cal-wdc">${w}</div>`).join("")}</div>
      <div class="cal-grid">${cells}</div>
    </div>`;
  };

  /* ---- wydruk (faktura / raport) ---- */
  UI.print = function (title, innerHtml) {
    const win = window.open("", "_blank");
    if (!win) { alert("Zezwól na wyskakujące okna, aby wydrukować."); return; }
    win.document.write(`<!DOCTYPE html><html lang="pl"><head><meta charset="utf-8"><title>${esc(title)}</title>
      <style>
        body{font-family:"Nunito",Segoe UI,system-ui,sans-serif;color:#123a3a;padding:40px;max-width:720px;margin:auto}
        h1{font-size:1.4rem;margin:0 0 4px} .muted{color:#6a8a8a}
        table{width:100%;border-collapse:collapse;margin:18px 0}
        th,td{text-align:left;padding:10px;border-bottom:1px solid #e3ece9}
        .right{text-align:right} .tot{font-size:1.2rem;font-weight:900}
        .brand{display:flex;align-items:center;gap:8px;font-weight:900;font-size:1.2rem;color:#0a8c7d;margin-bottom:20px}
        .box{border:1px solid #e3ece9;border-radius:12px;padding:16px;margin:12px 0}
      </style></head><body>${innerHtml}<script>window.onload=function(){window.print()}<\/script></body></html>`);
    win.document.close();
  };

  window.UI = UI;
})();
