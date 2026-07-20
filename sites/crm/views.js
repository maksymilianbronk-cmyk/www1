/**
 * LeadFlow CRM — widoki REAKTOR-a (funkcje: stan → HTML).
 * Rejestrowane w R.views; router hashowy: #/leady #/reklamy #/stats #/notatki
 */

'use strict';

/* Palety wykresów — zwalidowane pod ciemne tło (#182138): pasmo jasności,
 * chroma, separacja CVD (deutan/protan/tritan) i kontrast ≥3:1. */
const CH = {
  accent: '#5b82f7',
  sources:  { www: '#0f9e93', facebook: '#5b82f7', inne: '#a25fd9' },
  statuses: { nowy: '#b8821a', kontakt: '#4d7df8', umowiony: '#c052c9', wygrany: '#178f63', przegrany: '#e94d86' },
};

const SRC_ICO = { www: 'globe', facebook: 'facebook', inne: 'box' };
const srcIcon = (s, size = 16) => ico(SRC_ICO[s] || 'box', size, 'src-ico src-' + s);
const FB_STATUS = {
  ACTIVE: ['Aktywna', 'ok'], PAUSED: ['Wstrzymana', 'warn'], CAMPAIGN_PAUSED: ['Wstrzymana', 'warn'],
  ARCHIVED: ['Zarchiwizowana', 'mut'], DELETED: ['Usunięta', 'mut'], IN_PROCESS: ['Przetwarzana', 'warn'],
  WITH_ISSUES: ['Problemy', 'err'], DISAPPROVED: ['Odrzucona', 'err'],
};

const clientById = (s, id) => (s.clients || []).find(c => c.id === id);
const chipHtml = (s, id) => {
  const c = clientById(s, id);
  return c ? `<span class="client-chip" style="--chip:${esc(c.color)}">${esc(c.name)}</span>` : '';
};

/* ── Komponenty wspólne ── */

function tiles(items) {
  return '<div class="stats">' + items.map(([num, label, cls]) =>
    `<div class="stat ${cls || ''}"><div class="stat-num">${num}</div><div class="stat-label">${esc(label)}</div></div>`
  ).join('') + '</div>';
}

/** Wykres słupkowy dzienny (jedna seria) — SVG, etykiety wybiórcze: maksimum + dziś. */
function dailyBars(leads, days = 30) {
  const today = new Date();
  const byDay = {};
  for (const l of leads) byDay[String(l.created_at).slice(0, 10)] = (byDay[String(l.created_at).slice(0, 10)] || 0) + 1;
  const dayKey = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0')
    + '-' + String(d.getDate()).padStart(2, '0');
  const data = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    data.push([dayKey(d), byDay[dayKey(d)] || 0]);
  }
  const max = Math.max(1, ...data.map(x => x[1]));
  const W = 640, H = 150, pad = 6, bw = (W - pad * 2) / days;
  let bars = '', labels = '';
  data.forEach(([key, v], i) => {
    const h = Math.max(v > 0 ? 4 : 2, Math.round(v / max * (H - 34)));
    const x = pad + i * bw, y = H - 18 - h;
    bars += `<rect x="${(x + 1).toFixed(1)}" y="${y}" width="${(bw - 2).toFixed(1)}" height="${h}" rx="3"
             fill="${v > 0 ? CH.accent : '#263252'}" data-tip="${fmtD(key)}: ${v} ${v === 1 ? 'lead' : 'leadów'}"/>`;
    if (v === max && v > 0) labels += `<text x="${(x + bw / 2).toFixed(1)}" y="${y - 5}" text-anchor="middle" class="ch-val">${v}</text>`;
    if (i % 5 === 0 || i === days - 1) labels += `<text x="${(x + bw / 2).toFixed(1)}" y="${H - 4}" text-anchor="middle" class="ch-day">${fmtD(key)}</text>`;
  });
  const grid = [0.5, 1].map(f => {
    const y = H - 18 - Math.round(f * (H - 34));
    return `<line x1="${pad}" x2="${W - pad}" y1="${y}" y2="${y}" class="ch-grid"/>
            <text x="${W - pad + 2}" y="${y + 3}" class="ch-day">${Math.round(f * max)}</text>`;
  }).join('');
  return `<svg viewBox="0 0 ${W + 24} ${H}" class="ch-svg" role="img" aria-label="Leady dziennie">${grid}${bars}${labels}</svg>`;
}

/** Poziome paski kategorii — etykieta wiersza niesie tożsamość, kolor ją tylko wspiera. */
function catBars(rows) {
  const max = Math.max(1, ...rows.map(r => r.v));
  return '<div class="cat-bars">' + rows.map(r => `
    <div class="cat-row" data-key="cb-${esc(r.key)}">
      <span class="cat-label">${r.icon ? ico(r.icon, 15) + ' ' : ''}${esc(r.label)}</span>
      <span class="cat-track"><span class="cat-fill" style="width:${Math.max(2, r.v / max * 100)}%;background:${r.color}"
        data-tip="${esc(r.label)}: ${r.v}"></span></span>
      <span class="cat-val">${fmtN(r.v)}</span>
    </div>`).join('') + '</div>';
}

function leadDetail(s, l) {
  const raw = Object.entries(l.raw || {});
  const opts = Object.entries(s.statuses).map(([k, v]) =>
    `<option value="${k}" ${l.status === k ? 'selected' : ''}>${esc(v)}</option>`).join('');
  return `<div class="lead-detail open" data-key="det-${l.id}"><div class="detail-grid">
    <div class="detail-col"><h4>Szczegóły zgłoszenia</h4><dl>
      ${l.message ? `<dt>Wiadomość</dt><dd>${esc(l.message)}</dd>` : ''}
      ${l.form_name ? `<dt>Formularz</dt><dd>${esc(l.form_name)}</dd>` : ''}
      ${l.campaign ? `<dt>Kampania</dt><dd>${esc(l.campaign)}</dd>` : ''}
      ${raw.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(typeof v === 'object' ? JSON.stringify(v) : v)}</dd>`).join('')}
      <dt>Dodano</dt><dd>${fmtDT(l.created_at)}</dd>
    </dl></div>
    <div class="detail-col"><h4>Obsługa leada</h4>
      <div class="lead-form">
        <label>Status
          <select onchange="R.setLead(${l.id},{status:this.value})">${opts}</select>
        </label>
        <label>Notatka
          <textarea id="lead-note-${l.id}" rows="3" placeholder="np. umówiony na czwartek 12:00">${esc(l.note)}</textarea>
        </label>
        <button class="btn" onclick="R.setLead(${l.id},{note:document.getElementById('lead-note-${l.id}').value})">${ico('check',15)} Zapisz notatkę</button>
      </div>
    </div>
  </div></div>`;
}

/* ── Widok: LEADY ── */
function viewLeady(s, ui) {
  const isAdmin = s.role === 'admin';
  const q = ui.q.trim().toLowerCase();
  let rows = s.leads;
  if (isAdmin && ui.client) rows = rows.filter(l => l.client_id === ui.client);
  if (ui.status) rows = rows.filter(l => l.status === ui.status);
  if (ui.source) rows = rows.filter(l => l.source === ui.source);
  if (q) rows = rows.filter(l =>
    (l.name + ' ' + l.email + ' ' + l.phone + ' ' + l.message + ' ' + l.campaign + ' ' + JSON.stringify(l.raw)).toLowerCase().includes(q));

  const t = s.totals || {};
  const byStatus = t.by_status || {};
  const nowe = byStatus.nowy ?? s.leads.filter(l => l.status === 'nowy').length;

  const clientSel = isAdmin ? `<select onchange="R.ui.client=+this.value;R.render()">
      <option value="0">Wszyscy klienci</option>
      ${(s.clients || []).map(c => `<option value="${c.id}" ${ui.client === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}
    </select>` : '';

  const list = rows.slice(0, 200).map(l => {
    
    const open = ui.open === l.id;
    return `<div class="lead-card ${l.status === 'nowy' ? 'is-new' : ''} ${open ? 'expanded' : ''}" data-key="l-${l.id}">
      <div class="lead-line" onclick="R.ui.open=R.ui.open===${l.id}?0:${l.id};R.render()">
        <span class="ll-date">${fmtDT(l.created_at)}</span>
        ${isAdmin ? chipHtml(s, l.client_id) : ''}
        <span class="ll-src" title="${esc(l.source)}">${srcIcon(l.source)}</span>
        <span class="ll-name">${esc(l.name) || '<span class="muted">—</span>'}</span>
        <span class="ll-contact">${l.phone ? `<a href="tel:${esc(l.phone)}" onclick="event.stopPropagation()">${esc(l.phone)}</a>` : ''}
          ${l.email ? `<a href="mailto:${esc(l.email)}" onclick="event.stopPropagation()">${esc(l.email)}</a>` : ''}</span>
        <span class="badge badge-${esc(l.status)}">${esc(s.statuses[l.status] || l.status)}</span>
        <span class="ll-chev">${open ? '▴' : '▾'}</span>
      </div>
      ${open ? leadDetail(s, l) : ''}
    </div>`;
  }).join('');

  return tiles([
    [fmtN(t.all), 'Wszystkie leady'],
    [fmtN(t.month), 'W tym miesiącu'],
    [fmtN(nowe), 'Nowe (do obsłużenia)', 'stat-new'],
    [fmtN(byStatus.wygrany ?? 0), 'Wygrane', 'stat-won'],
  ]) + `
  <div class="filters">
    ${clientSel}
    <select onchange="R.ui.status=this.value;R.render()">
      <option value="">Każdy status</option>
      ${Object.entries(s.statuses).map(([k, v]) => `<option value="${k}" ${ui.status === k ? 'selected' : ''}>${esc(v)}</option>`).join('')}
    </select>
    <select onchange="R.ui.source=this.value;R.render()">
      <option value="">Każde źródło</option>
      ${Object.entries(s.sources).map(([k, v]) => `<option value="${k}" ${ui.source === k ? 'selected' : ''}>${esc(v)}</option>`).join('')}
    </select>
    <input type="search" placeholder="Szukaj natychmiast: imię, telefon, e-mail…" value="${esc(ui.q)}"
           oninput="R.ui.q=this.value;R.render()">
    <a class="btn btn-sm btn-ghost" href="export.php">${ico('download',15)} CSV</a>
  </div>
  <div class="lead-list">${list ||
    `<div class="empty-state"><div class="empty-icon">${ico('inbox',42)}</div><p>Brak leadów dla tych filtrów.</p></div>`}</div>
  ${rows.length > 200 ? `<p class="muted" style="margin-top:10px">Pokazano 200 z ${rows.length} — zawęź filtry lub użyj eksportu CSV.</p>` : ''}`;
}

/* ── Widok: REKLAMY ── */
function viewReklamy(s, ui) {
  const isAdmin = s.role === 'admin';
  const month = (s.now || new Date().toISOString()).slice(0, 7);
  const cid = isAdmin ? (ui.client || (s.clients[0] && s.clients[0].id) || 0) : (s.user.id || 0);

  const clientSel = isAdmin ? `<div class="filters"><select onchange="R.ui.client=+this.value;R.render()">
      ${(s.clients || []).map(c => `<option value="${c.id}" ${cid === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}
    </select></div>` : '';

  const camps = (s.campaigns || []).filter(c => c.month === month && (!cid || c.client_id === cid));
  const monthLabel = new Date(month + '-01T00:00:00').toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' });

  let body;
  if (camps.length) {
    const spend = camps.reduce((a, c) => a + c.spend, 0);
    const leads = camps.reduce((a, c) => a + c.leads_count, 0);
    const cur = camps.find(c => c.currency)?.currency || 'PLN';
    body = tiles([
      [fmtN(camps.length), 'Kampanie (' + monthLabel + ')'],
      [fmtN(camps.filter(c => c.status === 'ACTIVE').length), 'Aktywne teraz', 'stat-won'],
      [fmtMoney(spend, cur), 'Wydatki (' + monthLabel + ')'],
      [leads ? fmtMoney(spend / leads, cur) : '—', 'Średni koszt leada'],
    ]) + `<div class="card"><h2>${ico('megaphone',19)} Kampanie — ${esc(monthLabel)}</h2>
    <div class="table-scroll"><table class="leads"><thead><tr>
      <th>Kampania</th><th>Status</th><th>Wydatki</th><th>Wyświetlenia</th><th>Kliknięcia</th><th>CTR</th><th>Leady</th><th>Koszt leada</th>
    </tr></thead><tbody>
    ${camps.map(c => {
      const [label, cls] = FB_STATUS[c.status] || [c.status || '—', 'mut'];
      const ctr = c.impressions ? (c.clicks / c.impressions * 100).toFixed(2) + '%' : '—';
      const cpl = c.leads_count ? fmtMoney(c.spend / c.leads_count, c.currency) : '—';
      return `<tr data-key="cmp-${c.id}">
        <td class="td-name">${esc(c.name)}</td>
        <td><span class="fbst fbst-${cls}">${esc(label)}</span></td>
        <td>${fmtMoney(c.spend, c.currency)}</td><td>${fmtN(c.impressions)}</td>
        <td>${fmtN(c.clicks)}</td><td>${ctr}</td><td>${fmtN(c.leads_count)}</td><td>${cpl}</td></tr>`;
    }).join('')}
    </tbody></table></div>
    <p class="muted" style="margin-top:10px">Dane z Meta Marketing API · ostatnia synchronizacja: ${esc(s.ads_last_sync || '—')}</p></div>`;
  } else {
    // fallback: kampanie wykryte z pola "campaign" leadów w tym miesiącu
    const fromLeads = {};
    for (const l of s.leads) {
      if (String(l.created_at).slice(0, 7) !== month) continue;
      if (isAdmin && cid && l.client_id !== cid) continue;
      const name = l.campaign || (l.source === 'facebook' ? '(kampania bez nazwy)' : null);
      if (!name) continue;
      (fromLeads[name] = fromLeads[name] || { n: 0, last: '' }).n++;
      if (l.created_at > fromLeads[name].last) fromLeads[name].last = l.created_at;
    }
    const rows = Object.entries(fromLeads).sort((a, b) => b[1].n - a[1].n);
    body = `<div class="card"><h2>${ico('megaphone',19)} Reklamy — ${esc(monthLabel)}</h2>
      ${rows.length ? `<p class="muted">Kampanie wykryte na podstawie napływających leadów:</p>
        ${catBars(rows.map(([name, d], i) => ({ key: 'c' + i, label: name, v: d.n, color: CH.accent, icon: 'megaphone' })))}`
      : `<div class="empty-state"><div class="empty-icon">${ico('megaphone',42)}</div><p>Brak danych o kampaniach w tym miesiącu.</p></div>`}
      <div class="flash flash-info" style="margin-top:14px">
        ${isAdmin
          ? 'Pełne statystyki (wydatki, CTR, koszt leada) pojawią się po podłączeniu Meta Marketing API: uzupełnij <b>ID konta reklamowego</b> i token w zakładce <a href="clients.php">Klienci</a> oraz ustaw <b>cron</b> (Ustawienia → Cron).'
          : 'Szczegółowe statystyki wydatków pojawią się po podłączeniu konta reklamowego przez Twoją agencję.'}
      </div></div>`;
  }
  return clientSel + body;
}

/* ── Widok: STATYSTYKI ── */
function viewStats(s, ui) {
  const isAdmin = s.role === 'admin';
  const cid = isAdmin ? ui.client : 0;
  const leads = cid ? s.leads.filter(l => l.client_id === cid) : s.leads;
  const month = (s.now || '').slice(0, 7);
  const mLeads = leads.filter(l => String(l.created_at).slice(0, 7) === month);
  const won = leads.filter(l => l.status === 'wygrany').length;
  const conv = leads.length ? Math.round(won / leads.length * 100) : 0;

  const clientSel = isAdmin ? `<div class="filters"><select onchange="R.ui.client=+this.value;R.render()">
      <option value="0">Wszyscy klienci</option>
      ${(s.clients || []).map(c => `<option value="${c.id}" ${cid === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}
    </select></div>` : '';

  const srcRows = Object.entries(s.sources).map(([k, label]) => ({
    key: k, label, icon: SRC_ICO[k], color: CH.sources[k] || CH.accent,
    v: leads.filter(l => l.source === k).length,
  })).filter(r => r.v > 0);

  const stRows = Object.entries(s.statuses).map(([k, label]) => ({
    key: k, label, color: CH.statuses[k], v: leads.filter(l => l.status === k).length,
  }));

  const camps = (s.campaigns || []).filter(c => c.month === month && (!cid || c.client_id === cid));
  const spend = camps.reduce((a, c) => a + c.spend, 0);
  const cur = camps.find(c => c.currency)?.currency || 'PLN';

  return clientSel + tiles([
    [fmtN(mLeads.length), 'Leady w tym miesiącu'],
    [fmtN(leads.length), 'Leady (wczytane)'],
    [conv + '%', 'Konwersja na wygrane', 'stat-won'],
    ...(camps.length ? [[fmtMoney(spend, cur), 'Wydatki na reklamy (mies.)'],
                        [mLeads.length ? fmtMoney(spend / mLeads.length, cur) : '—', 'Koszt leada (mies.)']] : []),
  ]) + `
  <div class="card"><h2>${ico('chart',19)} Leady dziennie — ostatnie 30 dni</h2>${dailyBars(leads, 30)}</div>
  <div class="grid-2">
    <div class="card"><h2>${ico('compass',19)} Źródła leadów</h2>${srcRows.length ? catBars(srcRows) : '<p class="muted">Brak danych.</p>'}</div>
    <div class="card"><h2>${ico('target',19)} Lejek statusów</h2>${catBars(stRows)}</div>
  </div>
  ${camps.length ? `<div class="card"><h2>${ico('rocket',19)} Kampanie miesiąca wg kosztu leada</h2>
    ${catBars(camps.filter(c => c.leads_count > 0).sort((a, b) => a.spend / a.leads_count - b.spend / b.leads_count).slice(0, 8)
      .map((c, i) => ({ key: 'cc' + i, label: c.name + ' (' + fmtMoney(c.spend / c.leads_count, c.currency) + '/lead)', v: c.leads_count, color: CH.accent })))}
  </div>` : ''}`;
}

/* ── Widok: WSPÓLNE NOTATKI (styl Google Keep) ── */

/* Ciemna paleta Keep: klucz → tło karty */
const KEEP_COLORS = {
  '':       '#182138',
  berry:    '#77172e',
  umber:    '#692b17',
  amber:    '#7c4a03',
  forest:   '#264d3b',
  teal:     '#0c625d',
  ocean:    '#256377',
  purple:   '#472e5b',
  pink:     '#6c394f',
  sand:     '#4b443a',
};

function keepPalette(onPick, current) {
  return `<div class="keep-palette" onclick="event.stopPropagation()">
    ${Object.entries(KEEP_COLORS).map(([key, hex]) => `
      <button class="keep-swatch ${current === key ? 'sel' : ''}" style="--sw:${hex}"
        title="${key || 'domyślny'}" onclick="${onPick.replace('__C__', key)}">
        ${current === key ? ico('check', 12) : ''}
      </button>`).join('')}
  </div>`;
}

function keepCard(s, ui, n, canEdit) {
  const bg = KEEP_COLORS[n.color] || KEEP_COLORS[''];
  const editing = ui.editNote === n.id;
  const palette = ui.paletteFor === n.id;
  const authorIco = n.author_type === 'admin' ? 'users' : 'note';
  return `<div class="keep-note ${n._pending ? 'note-pending' : ''} ${n.pinned ? 'pinned' : ''}"
       style="--note-bg:${bg}" data-key="n-${n.id}">
    ${n.pinned ? `<span class="keep-pin-mark">${ico('pin', 13)}</span>` : ''}
    ${editing
      ? `<textarea class="keep-edit" id="keep-edit-${n.id}" rows="4">${esc(n.body)}</textarea>
         <div class="keep-tools">
           <button class="keep-tool" title="Zapisz"
             onclick="R.noteAction(${n.id},{body:document.getElementById('keep-edit-${n.id}').value.trim()||' '})">${ico('check', 15)}</button>
           <button class="keep-tool" title="Anuluj" onclick="R.ui.editNote=0;R.render()">${ico('x', 15)}</button>
         </div>`
      : `<div class="keep-body">${esc(n.body)}</div>
         <div class="keep-meta">
           <span class="keep-author">${ico(authorIco, 13)} ${esc(n.author_name)}</span>
           <span class="keep-when">${n._pending ? 'wysyłanie…' : fmtDT(n.created_at)}</span>
         </div>
         ${palette ? keepPalette(`R.noteAction(${n.id},{color:'__C__'})`, n.color || '') : ''}
         ${canEdit ? `<div class="keep-tools">
           <button class="keep-tool" title="${n.pinned ? 'Odepnij' : 'Przypnij'}"
             onclick="R.noteAction(${n.id},{pinned:${n.pinned ? 0 : 1}})">${ico('pin', 15)}</button>
           <button class="keep-tool" title="Kolor"
             onclick="R.ui.paletteFor=R.ui.paletteFor===${n.id}?0:${n.id};R.render()">${ico('palette', 15)}</button>
           <button class="keep-tool" title="Edytuj"
             onclick="R.ui.editNote=${n.id};R.ui.paletteFor=0;R.render()">${ico('pencil', 15)}</button>
           <button class="keep-tool keep-tool-danger" title="Usuń"
             onclick="if(confirm('Usunąć notatkę?'))R.deleteNote(${n.id})">${ico('trash', 15)}</button>
         </div>` : ''}`}
  </div>`;
}

function viewNotatki(s, ui) {
  const isAdmin = s.role === 'admin';
  const cid = isAdmin ? (ui.noteClient || (s.clients[0] && s.clients[0].id) || 0) : (s.user.id || 0);
  const notes = s.notes.filter(n => n.client_id === cid);
  const pinned = notes.filter(n => n.pinned);
  const rest   = notes.filter(n => !n.pinned);
  const canEdit = n => isAdmin || n.author_type === 'client';

  const clientSel = isAdmin ? `<div class="filters"><select onchange="R.ui.noteClient=+this.value;R.render()">
      ${(s.clients || []).map(c => `<option value="${c.id}" ${cid === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}
    </select></div>` : '';

  const composerBg = KEEP_COLORS[ui.noteColor] || KEEP_COLORS[''];

  return clientSel + `
  <div class="keep-head">
    <h1>${ico('note', 22)} Wspólne notatki ${isAdmin ? '— ' + esc(clientById(s, cid)?.name || '') : '— Ty i Twoja agencja'}</h1>
    <p class="muted">Widoczne dla obu stron, synchronizowane na żywo — jak wspólna tablica.</p>
  </div>
  <div class="keep-composer" style="--note-bg:${composerBg}">
    <textarea id="note-body" rows="2" placeholder="Utwórz notatkę…"
      onfocus="this.rows=4" ></textarea>
    <div class="keep-composer-bar">
      ${keepPalette("R.ui.noteColor='__C__';R.render()", ui.noteColor)}
      <span class="spacer"></span>
      <button class="btn btn-sm" onclick="const t=document.getElementById('note-body');
        if(t.value.trim()){R.addNote(${cid},t.value.trim(),R.ui.noteColor);R.ui.noteColor='';t.value=''}">
        ${ico('send', 14)} Zapisz</button>
    </div>
  </div>
  ${pinned.length ? `<div class="keep-section">${ico('pin', 13)} Przypięte</div>
    <div class="keep-grid">${pinned.map(n => keepCard(s, ui, n, canEdit(n))).join('')}</div>` : ''}
  ${pinned.length && rest.length ? `<div class="keep-section">Pozostałe</div>` : ''}
  <div class="keep-grid">
    ${rest.map(n => keepCard(s, ui, n, canEdit(n))).join('')}
  </div>
  ${!notes.length ? `<div class="empty-state"><div class="empty-icon">${ico('note', 42)}</div>
    <p>Jeszcze nie ma notatek — napisz pierwszą.</p></div>` : ''}`;
}

/* ── Widok: POSTY (plan treści — REAKTOR ContentForge) ── */

const POST_STATUS = {
  szkic:        ['Szkic', 'warn'],
  gotowy:       ['Zaakceptowany', 'ok2'],
  opublikowany: ['Opublikowany', 'ok'],
  blad:         ['Błąd publikacji', 'err'],
};

function monthShift(month, delta) {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
}

function postCard(s, ui, p, isAdmin) {
  const [label, cls] = POST_STATUS[p.status] || [p.status, 'mut'];
  const editing = ui.editPost === p.id;
  const time = String(p.publish_at).slice(11, 16);
  const canApprove = p.status === 'szkic';
  const canRevoke  = p.status === 'gotowy';
  return `<div class="post-card post-${esc(p.status)}" data-key="p-${p.id}">
    <div class="post-head">
      <span class="post-time">${ico('clock', 13)} ${esc(time)}</span>
      <span class="post-arch">${esc(p.archetype)}</span>
      <span class="spacer"></span>
      <span class="fbst fbst-${cls === 'ok2' ? 'ok' : cls}">${esc(label)}</span>
    </div>
    ${editing
      ? `<textarea class="post-edit" id="post-edit-${p.id}" rows="7">${esc(p.body)}</textarea>
         <div class="post-actions">
           <button class="btn btn-sm" onclick="R.postAction(${p.id},{body:document.getElementById('post-edit-${p.id}').value.trim()})">${ico('check', 14)} Zapisz</button>
           <button class="btn btn-sm btn-ghost" onclick="R.ui.editPost=0;R.render()">${ico('x', 14)} Anuluj</button>
         </div>`
      : `<div class="post-body">${esc(p.body)}</div>
         ${p.error ? `<div class="post-error">${ico('x', 13)} ${esc(p.error)}</div>` : ''}
         ${p.fb_post_id ? `<div class="post-fbid">${ico('facebook', 13)} ID posta: ${esc(p.fb_post_id)}</div>` : ''}
         <div class="post-actions">
           ${canApprove ? `<button class="btn btn-sm" onclick="R.postAction(${p.id},{status:'gotowy'})">${ico('check', 14)} Akceptuj</button>` : ''}
           ${canRevoke ? `<button class="btn btn-sm btn-ghost" onclick="R.postAction(${p.id},{status:'szkic'})">${ico('refresh', 14)} Cofnij akceptację</button>` : ''}
           ${isAdmin && p.status !== 'opublikowany' ? `
             <button class="btn btn-sm btn-ghost" onclick="R.ui.editPost=${p.id};R.render()">${ico('pencil', 14)} Edytuj</button>
             <button class="btn btn-sm btn-ghost" title="Opublikuj teraz na Facebooku"
               onclick="if(confirm('Opublikować ten post na Facebooku TERAZ?'))R.publishPost(${p.id})">${ico('send', 14)} Publikuj teraz</button>
             <button class="btn btn-sm btn-danger" onclick="if(confirm('Usunąć post?'))R.deletePost(${p.id})">${ico('trash', 14)}</button>` : ''}
         </div>`}
  </div>`;
}

function viewPosty(s, ui) {
  const isAdmin = s.role === 'admin';
  const nowMonth = (s.now || '').slice(0, 7) || new Date().toISOString().slice(0, 7);
  const month = ui.postMonth || nowMonth;
  const cid = isAdmin ? (ui.postClient || (s.clients[0] && s.clients[0].id) || 0) : (s.user.id || 0);

  const posts = (s.posts || []).filter(p => p.month === month && p.client_id === cid);
  const byDay = {};
  for (const p of posts) (byDay[String(p.publish_at).slice(0, 10)] = byDay[String(p.publish_at).slice(0, 10)] || []).push(p);
  const days = Object.keys(byDay).sort();

  const monthLabel = new Date(month + '-01T00:00:00').toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' });
  const drafts = posts.filter(p => p.status === 'szkic').length;
  const ready  = posts.filter(p => p.status === 'gotowy').length;
  const pub    = posts.filter(p => p.status === 'opublikowany').length;

  const clientSel = isAdmin ? `<select onchange="R.ui.postClient=+this.value;R.render()">
      ${(s.clients || []).map(c => `<option value="${c.id}" ${cid === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}
    </select>` : '';

  const nav = `<div class="post-monthnav">
      <button class="btn btn-sm btn-ghost" onclick="R.ui.postMonth='${monthShift(month, -1)}';R.render()">‹</button>
      <span class="post-month">${esc(monthLabel)}</span>
      <button class="btn btn-sm btn-ghost" onclick="R.ui.postMonth='${monthShift(month, 1)}';R.render()">›</button>
    </div>`;

  const genBar = isAdmin ? `<div class="post-genbar">
      <label class="muted">Liczba postów
        <input type="number" id="gen-count" min="4" max="24" value="12">
      </label>
      <button class="btn" onclick="R.generatePosts(${cid},'${month}',+document.getElementById('gen-count').value||12)">
        ${ico('sparkles', 15)} ${posts.length ? 'Wygeneruj nowy wariant szkiców' : 'Wygeneruj plan ContentForge'}</button>
      <span class="muted post-genhint">Generator personalizuje posty danymi z CRM klienta (leady, wygrane, kampanie),
        kalendarzem świąt i bankiem archetypów. Szkice → akceptacja → cron publikuje na Facebooku o zaplanowanej godzinie.</span>
    </div>` : '';

  return `<div class="page-head"><h1>${ico('calendar', 22)} Plan postów ${isAdmin ? '— ' + esc(clientById(s, cid)?.name || '') : ''}</h1></div>
  <div class="filters">${clientSel}${nav}
    <span class="spacer"></span>
    <span class="post-counts">${drafts} szkiców · ${ready} zaakceptowanych · ${pub} opublikowanych</span>
  </div>
  ${genBar}
  ${days.length ? days.map(day => `
    <div class="post-day" data-key="d-${day}">
      <div class="post-day-label">${new Date(day + 'T12:00:00').toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
      <div class="post-day-grid">${byDay[day].map(p => postCard(s, ui, p, isAdmin)).join('')}</div>
    </div>`).join('')
  : `<div class="empty-state"><div class="empty-icon">${ico('calendar', 42)}</div>
      <p>Brak planu na ${esc(monthLabel)}.</p>
      ${isAdmin ? '<p class="empty-hint">Kliknij „Wygeneruj plan ContentForge" powyżej.</p>'
                : '<p class="empty-hint">Twoja agencja przygotuje go wkrótce.</p>'}</div>`}`;
}

R.views = { leady: viewLeady, reklamy: viewReklamy, posty: viewPosty, stats: viewStats, notatki: viewNotatki };
