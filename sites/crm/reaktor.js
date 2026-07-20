/**
 * REAKTOR ⚛ — autorski silnik reaktywny dla klasycznego hostingu PHP.
 *
 * "React bez Node'a": deklaratywne widoki (funkcja stan → HTML), rekonsyliacja
 * DOM (morph zamiast przeładowań), stan w localStorage (natychmiastowy start),
 * synchronizacja delta przez long-poll (sync.php + api.php?a=delta) oraz
 * optymistyczne mutacje. Zero zależności, zero budowania, jeden plik.
 *
 * Cykl życia:
 *   boot() → paint z cache (0 ms) → bootstrap z API → live sync w pętli
 *   akcja użytkownika → mutacja lokalna → render → POST w tle → delta
 */

'use strict';

/* ── Pomocnicze ── */
const esc = s => String(s ?? '').replace(/[&<>"']/g,
  c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const fmtDT = iso => {
  if (!iso) return '—';
  const d = new Date(String(iso).replace(' ', 'T'));
  return isNaN(d) ? iso : d.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' })
    + ' ' + d.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
};
const fmtD = iso => {
  const p = String(iso).slice(0, 10).split('-');
  return p.length === 3 ? p[2] + '.' + p[1] : String(iso);
};
const fmtN = n => new Intl.NumberFormat('pl-PL').format(n ?? 0);
const fmtMoney = (n, cur) => new Intl.NumberFormat('pl-PL',
  { style: 'currency', currency: cur || 'PLN', maximumFractionDigits: 2 }).format(n ?? 0);

/* Ikony SVG — biblioteka wstrzyknięta przez powłokę (window.RK_ICONS) */
const ico = (name, size = 18, cls = '') => {
  const lib = window.RK_ICONS || { paths: {}, filled: [] };
  const p = lib.paths[name] || lib.paths.info || '';
  const attrs = lib.filled.includes(name)
    ? 'fill="currentColor" stroke="none"'
    : 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
  return `<svg class="ico${cls ? ' ' + cls : ''}" width="${size}" height="${size}" viewBox="0 0 24 24" ${attrs} aria-hidden="true">${p}</svg>`;
};

/* ── Rekonsyliacja DOM (morph) ──
 * Podmienia w istniejącym drzewie tylko to, co się różni — zachowuje fokus,
 * zaznaczenie i pozycję scrolla. Elementy listy paruje po data-key. */
function morph(el, html) {
  const tpl = document.createElement('template');
  tpl.innerHTML = html;
  morphChildren(el, tpl.content);
}

function morphChildren(from, to) {
  const keyed = new Map();
  for (const ch of from.children) {
    if (ch.dataset && ch.dataset.key !== undefined) keyed.set(ch.dataset.key, ch);
  }
  const toNodes = Array.from(to.childNodes);
  let cursor = from.firstChild;

  for (const toN of toNodes) {
    // elementy z data-key: dopasuj istniejący węzeł albo wstaw nowy — nigdy nie nadpisuj cudzego
    if (toN.nodeType === 1 && toN.dataset && toN.dataset.key !== undefined) {
      const match = keyed.get(toN.dataset.key);
      if (match) {
        if (match === cursor) cursor = cursor.nextSibling;
        else from.insertBefore(match, cursor);
        morphNode(match, toN);
      } else {
        from.insertBefore(toN.cloneNode(true), cursor);
      }
      continue;
    }
    if (!cursor) { from.appendChild(toN.cloneNode(true)); continue; }
    // nie konsumuj węzła z kluczem na pozycji bez klucza — może być potrzebny dalej
    if (cursor.nodeType === 1 && cursor.dataset && cursor.dataset.key !== undefined) {
      from.insertBefore(toN.cloneNode(true), cursor);
      continue;
    }
    if (toN.nodeType === 3) { // tekst
      if (cursor.nodeType === 3) {
        if (cursor.nodeValue !== toN.nodeValue) cursor.nodeValue = toN.nodeValue;
        cursor = cursor.nextSibling;
      } else {
        const fresh = toN.cloneNode(true);
        from.replaceChild(fresh, cursor);
        cursor = fresh.nextSibling;
      }
      continue;
    }
    if (toN.nodeType !== 1) { cursor = cursor.nextSibling; continue; }
    if (cursor.nodeType !== 1 || cursor.tagName !== toN.tagName) {
      const fresh = toN.cloneNode(true);
      from.replaceChild(fresh, cursor);
      cursor = fresh.nextSibling;
      continue;
    }
    const el = cursor;
    cursor = cursor.nextSibling;
    morphNode(el, toN);
  }
  // usuń wszystko, co zostało za kursorem (stare wiersze)
  while (cursor) { const nx = cursor.nextSibling; from.removeChild(cursor); cursor = nx; }
}

function morphNode(el, toN) {
  morphAttrs(el, toN);
  // nie przebudowujemy wnętrza pola, w którym użytkownik właśnie pisze
  const ae = document.activeElement;
  if (el === ae && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) return;
  morphChildren(el, toN);
}

function morphAttrs(from, to) {
  for (const a of Array.from(from.attributes)) {
    if (!to.hasAttribute(a.name)) from.removeAttribute(a.name);
  }
  for (const a of Array.from(to.attributes)) {
    if (from.getAttribute(a.name) !== a.value) from.setAttribute(a.name, a.value);
  }
  const tag = from.tagName;
  if ((tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') && from !== document.activeElement) {
    const v = to.getAttribute('value') ?? to.value ?? '';
    if (tag === 'SELECT') { if (from.value !== to.value && to.value !== undefined) from.value = to.value; }
    else if (from.value === from.defaultValue) { // czyste pole — synchronizuj deklaratywnie
      if (from.value !== v) { from.value = v; }
      from.defaultValue = v;
    } // pole z niezapisaną edycją użytkownika zostaje nietknięte
  }
}

/* ── Rdzeń ── */
const R = {
  state: { leads: [], notes: [], campaigns: [], clients: [], posts: [], totals: {}, statuses: {}, sources: {},
           user: {}, role: '', now: '', ads_last_sync: '' },
  rev: 0,
  csrf: '',
  ui: { open: 0, q: '', client: 0, status: '', source: '', noteClient: 0,
        editNote: 0, paletteFor: 0, noteColor: '',
        postClient: 0, postMonth: '', editPost: 0,
        sound: localStorage.getItem('rk_sound') !== '0' },
  views: {},          // rejestrowane przez views.js
  container: null,
  ready: false,
  online: true,
  _saveT: 0,

  cacheKey() { return 'reaktor_' + (window.REAKTOR.role || 'x') + '_' + (window.REAKTOR.uid || 0); },

  boot() {
    this.container = document.getElementById('app');
    this.csrf = window.REAKTOR.csrf;
    this.state.role = window.REAKTOR.role;
    const sb = document.querySelector('.sound-btn');
    if (sb) sb.innerHTML = ico(this.ui.sound ? 'bell' : 'bell-off', 17);
    // głębokie linki z klasycznych stron, np. admin.php?client=3
    const cq = new URLSearchParams(location.search).get('client');
    if (cq) this.ui.client = +cq;

    // 1) natychmiastowy paint z pamięci lokalnej
    try {
      const cached = JSON.parse(localStorage.getItem(this.cacheKey()) || 'null');
      if (cached && cached.state) { this.state = cached.state; this.rev = cached.rev; this.ready = true; }
    } catch {}
    this.render();

    window.addEventListener('hashchange', () => { this.ui.open = 0; this.render(); });

    // 2) świeży stan z serwera, 3) pętla live
    this.bootstrap().then(() => this.syncLoop());
  },

  async bootstrap() {
    try {
      const r = await fetch('api.php?a=bootstrap', { headers: { Accept: 'application/json' } });
      if (r.status === 401) { location.href = 'login.php'; return; }
      const d = await r.json();
      if (!d.ok) throw 0;
      this.csrf = d.csrf;
      this.applySnapshot(d);
      this.ready = true;
      this.setOnline(true);
      this.render();
    } catch {
      this.setOnline(false);
      setTimeout(() => this.bootstrap(), 5000);
    }
  },

  applySnapshot(d) {
    const prevMax = this.ready ? Math.max(0, ...this.state.leads.map(l => l.id)) : null;
    for (const k of ['leads', 'notes', 'campaigns', 'clients', 'posts', 'totals', 'statuses', 'sources', 'user', 'role', 'now', 'ads_last_sync']) {
      if (d[k] !== undefined) this.state[k] = d[k];
    }
    this.rev = d.rev;
    if (prevMax !== null) this.announceNew(this.state.leads.filter(l => l.id > prevMax));
    this.persist();
  },

  merge(d) {
    const prevMax = Math.max(0, ...this.state.leads.map(l => l.id));
    const upsert = (list, rows) => {
      const byId = new Map(list.map(x => [x.id, x]));
      for (const row of rows) byId.set(row.id, row);
      return Array.from(byId.values()).sort((a, b) => b.id - a.id);
    };
    if (d.leads?.length) this.state.leads = upsert(this.state.leads, d.leads);
    if (d.lead_ids) {
      const alive = new Set(d.lead_ids);
      this.state.leads = this.state.leads.filter(l => alive.has(l.id));
    }
    if (d.notes) {
      // notatki przychodzą w komplecie (edycje + usunięcia); zachowujemy tylko
      // lokalne wpisy w trakcie wysyłki, których serwer jeszcze nie zna
      const pending = this.state.notes.filter(n =>
        n._pending && !d.notes.some(x => x.client_id === n.client_id && x.body === n.body));
      this.state.notes = [...pending, ...d.notes];
    }
    if (d.campaigns) this.state.campaigns = d.campaigns;
    if (d.posts) this.state.posts = d.posts;
    if (d.clients) this.state.clients = d.clients;
    if (d.totals) this.state.totals = d.totals;
    if (d.now) this.state.now = d.now;
    if (d.ads_last_sync !== undefined) this.state.ads_last_sync = d.ads_last_sync;
    this.rev = d.rev;
    this.announceNew(this.state.leads.filter(l => l.id > prevMax));
    this.persist();
    this.render();
  },

  announceNew(fresh) {
    if (!fresh.length) return;
    const l = fresh[0];
    this.toast('Nowy lead: ' + (l.name || l.phone || l.email || 'bez danych'), 'new');
    if (this.ui.sound) this.beep();
    if (document.hidden) document.title = '(' + fresh.length + ') LeadFlow CRM';
    document.addEventListener('visibilitychange',
      () => { if (!document.hidden) document.title = 'LeadFlow CRM'; }, { once: true });
  },

  async syncLoop() {
    for (;;) {
      if (document.hidden) { // karta w tle: nie trzymaj long-polla, wróć przy fokusie
        await new Promise(res => {
          const on = () => { document.removeEventListener('visibilitychange', on); res(); };
          document.addEventListener('visibilitychange', on);
          setTimeout(() => { document.removeEventListener('visibilitychange', on); res(); }, 60000);
        });
        continue;
      }
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 30000);
        const r = await fetch('sync.php?rev=' + this.rev, { signal: ctrl.signal });
        clearTimeout(t);
        if (r.status === 401) { location.href = 'login.php'; return; }
        const d = await r.json();
        this.setOnline(true);
        if (d.ver && window.REAKTOR.ver && d.ver !== window.REAKTOR.ver) {
          this.toast('Nowa wersja systemu — odświeżam…', 'info');
          setTimeout(() => location.reload(), 1500);
          return;
        }
        if (d.changed) {
          const since = encodeURIComponent(this.state.now || '1970-01-01 00:00:00');
          const dr = await fetch('api.php?a=delta&since=' + since);
          const dd = await dr.json();
          if (dd.ok) this.merge(dd);
        }
        this._idle = d.changed ? 0 : Math.min((this._idle || 0) + 1, 8);
        await new Promise(res => setTimeout(res, 800 + this._idle * 300));
      } catch {
        this.setOnline(false);
        await new Promise(res => setTimeout(res, 6000));
      }
    }
  },

  setOnline(v) {
    if (this.online === v) return;
    this.online = v;
    const el = document.getElementById('live-dot');
    if (el) { el.classList.toggle('off', !v); el.title = v ? 'Połączono — dane na żywo' : 'Łączenie ponownie…'; }
  },

  /* mutacje optymistyczne */
  async api(action, payload, retried = false) {
    try {
      const ctrl = new AbortController();
      const tt = setTimeout(() => ctrl.abort(), 15000);
      const r = await fetch('api.php?a=' + action, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF': this.csrf },
        body: JSON.stringify(payload),
        signal: ctrl.signal,
      });
      clearTimeout(tt);
      const d = await r.json().catch(() => ({}));
      if (!d.ok) {
        // sesja zalogowana ponownie w innej karcie → świeży token i jedna ponowna próba
        if (d.error === 'csrf' && !retried) {
          await this.bootstrap();
          return this.api(action, payload, true);
        }
        throw 0;
      }
      return d;
    } catch {
      this.toast('Nie udało się zapisać — sprawdź połączenie.', 'err');
      this.bootstrap();
      return null;
    }
  },

  setLead(id, patch) {
    const l = this.state.leads.find(x => x.id === id);
    if (!l) return;
    Object.assign(l, patch);
    this.persist(); this.render();
    this.api('lead', { id, ...patch });
  },

  async addNote(clientId, body, color = '') {
    const tmp = { id: -Date.now(), client_id: clientId, author_type: this.state.role === 'admin' ? 'admin' : 'client',
                  author_name: this.state.user.name, body, color, pinned: 0,
                  created_at: (this.state.now || ''), _pending: true };
    this.state.notes.unshift(tmp);
    this.render();
    const d = await this.api('note', { client_id: clientId, body, color });
    if (d) { tmp.id = d.id; delete tmp._pending; this.persist(); }
    else this.state.notes = this.state.notes.filter(n => n !== tmp);
    this.render();
  },

  /* Notatki w stylu Keep: edycja / kolor / przypięcie / usunięcie — optymistycznie */
  noteAction(id, patch) {
    const n = this.state.notes.find(x => x.id === id);
    if (!n) return;
    Object.assign(n, patch);
    this.ui.editNote = 0; this.ui.paletteFor = 0;
    this.persist(); this.render();
    this.api('note-update', { id, ...patch });
  },

  deleteNote(id) {
    this.state.notes = this.state.notes.filter(n => n.id !== id);
    this.persist(); this.render();
    this.api('note-delete', { id });
  },

  /* Plan postów (ContentForge) */
  postAction(id, patch) {
    const p = this.state.posts.find(x => x.id === id);
    if (!p) return;
    Object.assign(p, patch, { error: '' });
    this.ui.editPost = 0;
    this.persist(); this.render();
    this.api('post-update', { id, ...patch });
  },

  deletePost(id) {
    this.state.posts = this.state.posts.filter(p => p.id !== id);
    this.persist(); this.render();
    this.api('post-delete', { id });
  },

  async publishPost(id) {
    const p = this.state.posts.find(x => x.id === id);
    if (p) { p.status = 'opublikowany'; this.render(); }
    const d = await this.api('post-publish', { id });
    if (!d) return;
    if (!d.ok) this.toast('Publikacja nieudana — sprawdź token strony klienta.', 'err');
    else this.toast('Post opublikowany na Facebooku.', 'new');
  },

  async generatePosts(clientId, month, count) {
    this.toast('ContentForge układa plan postów…', 'info');
    const d = await this.api('posts-generate', { client_id: clientId, month, count });
    if (d) this.toast('Wygenerowano ' + d.generated + ' postów — przejrzyj i zaakceptuj.', 'new');
  },

  toggleSound(btn) {
    this.ui.sound = !this.ui.sound;
    localStorage.setItem('rk_sound', this.ui.sound ? '1' : '0');
    if (btn) btn.innerHTML = ico(this.ui.sound ? 'bell' : 'bell-off', 17);
  },

  persist() {
    clearTimeout(this._saveT);
    this._saveT = setTimeout(() => {
      try {
        const s = { ...this.state, leads: this.state.leads.slice(0, 400), notes: this.state.notes.slice(0, 200) };
        localStorage.setItem(this.cacheKey(), JSON.stringify({ rev: this.rev, state: s }));
      } catch {}
    }, 250);
  },

  route() {
    const h = (location.hash || '').replace(/^#\/?/, '');
    return this.views[h] ? h : 'leady';
  },

  render() { // koalescencja: dowolna liczba wywołań w jednej klatce = jeden morph
    if (this._raf) return;
    this._raf = requestAnimationFrame(() => { this._raf = 0; this.renderNow(); });
  },

  renderNow() {
    if (!this.container) return;
    const route = this.route();
    document.querySelectorAll('.mainnav a[data-route]').forEach(a =>
      a.classList.toggle('active', a.dataset.route === route));
    const html = this.ready
      ? this.views[route](this.state, this.ui)
      : '<div class="rk-skeleton"><div class="rk-spin"></div>Ładowanie danych…</div>';
    morph(this.container, html);
  },

  toast(msg, kind) {
    const box = document.getElementById('toasts') || (() => {
      const b = document.createElement('div'); b.id = 'toasts'; document.body.appendChild(b); return b;
    })();
    const t = document.createElement('div');
    t.className = 'toast toast-' + (kind || 'info');
    const icon = document.createElement('span');
    icon.className = 't-ico';
    icon.innerHTML = ico(kind === 'new' ? 'bolt' : kind === 'err' ? 'x' : 'info', 16);
    const txt = document.createElement('span');
    txt.textContent = msg;
    t.append(icon, txt);
    box.appendChild(t);
    setTimeout(() => t.classList.add('show'), 10);
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 400); }, 4200);
  },

  beep() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.frequency.value = 880; g.gain.value = 0.06;
      o.start(); o.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.12);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
      o.stop(ctx.currentTime + 0.36);
    } catch {}
  },
};

/* tooltip wykresów — jedna warstwa dla wszystkich */
document.addEventListener('mousemove', e => {
  const tip = document.getElementById('rk-tip') || (() => {
    const d = document.createElement('div'); d.id = 'rk-tip'; document.body.appendChild(d); return d;
  })();
  const target = e.target.closest && e.target.closest('[data-tip]');
  if (target) {
    tip.textContent = target.dataset.tip;
    tip.style.display = 'block';
    const x = Math.min(e.clientX + 14, window.innerWidth - tip.offsetWidth - 8);
    tip.style.left = x + 'px';
    tip.style.top = (e.clientY + 16) + 'px';
  } else {
    tip.style.display = 'none';
  }
});

window.R = R;
document.addEventListener('DOMContentLoaded', () => R.boot());
