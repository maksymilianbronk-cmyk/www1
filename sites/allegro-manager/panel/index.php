<?php /* Panel administracyjny Allegro Manager — całość UI po stronie przeglądarki, dane z api.php */ ?>
<!DOCTYPE html>
<html lang="pl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex, nofollow">
<title>Allegro Manager — panel administracyjny</title>
<style>
  :root{
    --bg:#0f0f13; --bg2:#15151d; --card:#1a1a22; --line:#26262f;
    --txt:#eef0f6; --mut:#8b8d98; --acc:#ff5a00; --acc2:#ffb800;
    --ok:#42d392; --err:#ff5c6c; --warn:#f5a623; --info:#6c9fff;
    --r:12px; font-size:15px;
  }
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:var(--bg);color:var(--txt);font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;min-height:100vh}
  a{color:var(--info);text-decoration:none} a:hover{text-decoration:underline}
  button{font:inherit;cursor:pointer;border:0;border-radius:8px;padding:.55rem 1rem;background:var(--card);color:var(--txt);border:1px solid var(--line)}
  button:hover{border-color:var(--acc)}
  button.primary{background:var(--acc);border-color:var(--acc);color:#fff;font-weight:600}
  button.primary:hover{filter:brightness(1.1)}
  button.danger{color:var(--err);border-color:#3a2228}
  button:disabled{opacity:.5;cursor:not-allowed}
  input,select,textarea{font:inherit;background:var(--bg2);color:var(--txt);border:1px solid var(--line);border-radius:8px;padding:.55rem .7rem;width:100%}
  input:focus,select:focus,textarea:focus{outline:none;border-color:var(--acc)}
  label{display:block;font-size:.82rem;color:var(--mut);margin:.8rem 0 .3rem}
  code{background:var(--bg2);padding:.1rem .35rem;border-radius:5px;font-size:.85em}
  .app{display:grid;grid-template-columns:230px 1fr;min-height:100vh}
  .side{background:var(--bg2);border-right:1px solid var(--line);padding:1.2rem .9rem;display:flex;flex-direction:column;gap:.2rem;position:sticky;top:0;height:100vh}
  .logo{font-weight:800;font-size:1.05rem;margin-bottom:1.2rem;display:flex;align-items:center;gap:.5rem}
  .logo .dot{width:12px;height:12px;border-radius:50%;background:linear-gradient(135deg,var(--acc),var(--acc2))}
  .nav-btn{text-align:left;background:none;border:1px solid transparent;padding:.6rem .8rem;border-radius:9px;color:var(--mut);display:flex;gap:.6rem;align-items:center}
  .nav-btn:hover{color:var(--txt);border-color:var(--line)}
  .nav-btn.active{background:var(--card);color:var(--txt);border-color:var(--line)}
  .side .spacer{flex:1}
  .envpill{font-size:.72rem;padding:.25rem .6rem;border-radius:99px;text-align:center;border:1px solid var(--line);color:var(--mut)}
  .envpill.sandbox{color:var(--warn);border-color:#4a3a18}
  .envpill.production{color:var(--ok);border-color:#1c4032}
  main{padding:1.6rem 2rem;max-width:1200px;width:100%}
  h1{font-size:1.35rem;margin-bottom:.3rem} h2{font-size:1.05rem;margin:1.4rem 0 .6rem}
  .sub{color:var(--mut);font-size:.9rem;margin-bottom:1.4rem}
  .cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:1rem;margin:1rem 0}
  .card{background:var(--card);border:1px solid var(--line);border-radius:var(--r);padding:1.1rem}
  .card .big{font-size:1.5rem;font-weight:700;margin:.3rem 0}
  .card .lbl{color:var(--mut);font-size:.8rem}
  .panel{background:var(--card);border:1px solid var(--line);border-radius:var(--r);padding:1.3rem;margin:1rem 0}
  table{width:100%;border-collapse:collapse;font-size:.88rem}
  th{color:var(--mut);text-align:left;font-weight:500;font-size:.78rem;padding:.5rem .6rem;border-bottom:1px solid var(--line)}
  td{padding:.55rem .6rem;border-bottom:1px solid var(--line);vertical-align:middle}
  tr:hover td{background:rgba(255,255,255,.02)}
  .badge{display:inline-block;font-size:.72rem;padding:.15rem .5rem;border-radius:99px;border:1px solid var(--line)}
  .badge.ok{color:var(--ok);border-color:#1c4032}
  .badge.err{color:var(--err);border-color:#3a2228}
  .badge.warn{color:var(--warn);border-color:#4a3a18}
  .badge.mut{color:var(--mut)}
  .row{display:flex;gap:.6rem;align-items:center;flex-wrap:wrap}
  .grid2{display:grid;grid-template-columns:1fr 1fr;gap:0 1.2rem}
  @media(max-width:900px){.app{grid-template-columns:1fr}.side{position:static;height:auto;flex-direction:row;overflow-x:auto}.grid2{grid-template-columns:1fr}}
  .toast-wrap{position:fixed;right:1rem;bottom:1rem;display:flex;flex-direction:column;gap:.5rem;z-index:99}
  .toast{background:var(--card);border:1px solid var(--line);border-left:4px solid var(--info);border-radius:9px;padding:.7rem 1rem;max-width:420px;font-size:.88rem;box-shadow:0 8px 30px rgba(0,0,0,.5)}
  .toast.ok{border-left-color:var(--ok)} .toast.err{border-left-color:var(--err)} .toast.warn{border-left-color:var(--warn)}
  .modal-bg{position:fixed;inset:0;background:rgba(0,0,0,.65);display:flex;align-items:center;justify-content:center;z-index:50;padding:1rem}
  .modal{background:var(--card);border:1px solid var(--line);border-radius:var(--r);padding:1.5rem;width:100%;max-width:640px;max-height:90vh;overflow:auto}
  .modal.wide{max-width:960px}
  .modal h3{margin-bottom:1rem}
  .login-wrap{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:1rem}
  .login{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:2.2rem;width:100%;max-width:400px}
  .login h1{margin-bottom:.4rem}
  .muted{color:var(--mut);font-size:.85rem}
  .pager{display:flex;gap:.5rem;align-items:center;margin-top:.8rem}
  .thumb{width:38px;height:38px;object-fit:cover;border-radius:6px;background:var(--bg2)}
  .spin{display:inline-block;width:14px;height:14px;border:2px solid var(--mut);border-top-color:var(--acc);border-radius:50%;animation:sp 1s linear infinite;vertical-align:-2px}
  @keyframes sp{to{transform:rotate(360deg)}}
  .code-box{font-family:monospace;font-size:1.6rem;letter-spacing:.35rem;text-align:center;background:var(--bg2);border:1px dashed var(--acc);border-radius:10px;padding:.8rem;margin:.8rem 0}
</style>
</head>
<body>
<div id="root"></div>
<div class="toast-wrap" id="toasts"></div>

<script>
"use strict";
/* ================= narzędzia ================= */
const $ = (s, el=document) => el.querySelector(s);
const root = $('#root');
let CSRF = null, STATUS = null;

function esc(s){ return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function toast(msg, type='info', ms=5000){
  const t = document.createElement('div');
  t.className = 'toast ' + type; t.textContent = msg;
  $('#toasts').appendChild(t);
  setTimeout(() => t.remove(), ms);
}
async function api(action, data=null, method=null){
  method = method || (data ? 'POST' : 'GET');
  const opts = { method, headers: {} };
  if (data) { opts.body = JSON.stringify(data); opts.headers['Content-Type'] = 'application/json'; }
  if (method === 'POST' && CSRF) opts.headers['X-CSRF'] = CSRF;
  const res = await fetch('api.php?action=' + action, opts);
  let json;
  try { json = await res.json(); } catch(e) { throw new Error('Serwer zwrócił nieprawidłową odpowiedź (HTTP ' + res.status + ').'); }
  if (!res.ok || json.ok === false) {
    if (res.status === 401 && action !== 'login') { boot(); }
    throw new Error(json.error || ('Błąd HTTP ' + res.status));
  }
  return json;
}
function modal(html, wide=false){
  const bg = document.createElement('div');
  bg.className = 'modal-bg';
  bg.innerHTML = `<div class="modal${wide?' wide':''}">${html}</div>`;
  bg.addEventListener('click', e => { if (e.target === bg) bg.remove(); });
  document.body.appendChild(bg);
  return bg;
}
const fmtPln = v => v == null ? '—' : Number(v).toLocaleString('pl-PL', {minimumFractionDigits:2, maximumFractionDigits:2}) + ' zł';

/* ================= start ================= */
async function boot(){
  try { STATUS = await api('status'); } catch(e){ root.innerHTML = '<div class="login-wrap"><div class="login"><h1>Błąd</h1><p class="muted">' + esc(e.message) + '</p><p class="muted" style="margin-top:1rem">Upewnij się, że hosting obsługuje PHP (por. README).</p></div></div>'; return; }
  CSRF = STATUS.csrf;
  if (STATUS.setup_required) return renderSetup();
  if (!STATUS.logged_in)     return renderLogin();
  renderApp();
}

function renderSetup(){
  root.innerHTML = `<div class="login-wrap"><div class="login">
    <h1>🛒 Allegro Manager</h1>
    <p class="muted">Pierwsze uruchomienie — ustaw hasło administratora panelu.</p>
    <label>Hasło (min. 8 znaków)</label><input type="password" id="p1">
    <label>Powtórz hasło</label><input type="password" id="p2">
    <button class="primary" style="width:100%;margin-top:1.2rem" id="go">Utwórz panel</button>
  </div></div>`;
  $('#go').onclick = async () => {
    if ($('#p1').value !== $('#p2').value) return toast('Hasła nie są identyczne.', 'err');
    try { const r = await api('setup', {password: $('#p1').value}); CSRF = r.csrf; toast('Panel gotowy!', 'ok'); boot(); }
    catch(e){ toast(e.message, 'err'); }
  };
}

function renderLogin(){
  root.innerHTML = `<div class="login-wrap"><div class="login">
    <h1>🛒 Allegro Manager</h1>
    <p class="muted">Panel integracji hurtowni XML z Allegro.</p>
    <label>Hasło administratora</label><input type="password" id="pass">
    <button class="primary" style="width:100%;margin-top:1.2rem" id="go">Zaloguj</button>
  </div></div>`;
  const go = async () => {
    try { const r = await api('login', {password: $('#pass').value}); CSRF = r.csrf; boot(); }
    catch(e){ toast(e.message, 'err'); }
  };
  $('#go').onclick = go;
  $('#pass').onkeydown = e => { if (e.key === 'Enter') go(); };
}

/* ================= aplikacja ================= */
const VIEWS = [
  ['dash',      '📊', 'Pulpit'],
  ['suppliers', '🏭', 'Hurtownie XML'],
  ['products',  '📦', 'Produkty'],
  ['offers',    '🏷️', 'Oferty Allegro'],
  ['settings',  '⚙️', 'Ustawienia'],
  ['logs',      '📜', 'Logi'],
];
let currentView = 'dash';

function renderApp(){
  const env = STATUS.allegro.env;
  root.innerHTML = `<div class="app">
    <aside class="side">
      <div class="logo"><span class="dot"></span> Allegro Manager</div>
      ${VIEWS.map(([id, ic, name]) => `<button class="nav-btn" data-v="${id}">${ic} ${name}</button>`).join('')}
      <div class="spacer"></div>
      <div class="envpill ${env}">${env === 'sandbox' ? '🧪 SANDBOX' : '🟢 PRODUKCJA'}</div>
      ${STATUS.allegro.user ? `<div class="muted" style="text-align:center;padding:.3rem">👤 ${esc(STATUS.allegro.user)}</div>` : ''}
      <button class="nav-btn" id="logout">🚪 Wyloguj</button>
    </aside>
    <main id="view"></main>
  </div>`;
  root.querySelectorAll('[data-v]').forEach(b => b.onclick = () => show(b.dataset.v));
  $('#logout').onclick = async () => { await api('logout', {}); boot(); };

  const q = new URLSearchParams(location.search);
  if (q.get('oauth') === 'ok') { toast('Konto Allegro połączone! 🎉', 'ok'); history.replaceState(null, '', 'index.php'); show('settings'); return; }
  if (q.get('oauth') === 'error') { toast('Błąd autoryzacji Allegro: ' + q.get('reason'), 'err', 9000); history.replaceState(null, '', 'index.php'); show('settings'); return; }
  show(currentView);
}

function show(view){
  currentView = view;
  root.querySelectorAll('[data-v]').forEach(b => b.classList.toggle('active', b.dataset.v === view));
  const el = $('#view');
  el.innerHTML = '<p class="muted"><span class="spin"></span> Ładowanie…</p>';
  ({dash: viewDash, suppliers: viewSuppliers, products: viewProducts,
    offers: viewOffers, settings: viewSettings, logs: viewLogs}[view])(el);
}

/* ---------------- Pulpit ---------------- */
async function viewDash(el){
  const st = await api('status'); STATUS = st; CSRF = st.csrf || CSRF;
  const sup = await api('suppliers');
  let totalProducts = 0, lastFetch = null;
  sup.suppliers.forEach(s => { totalProducts += s.last_count || 0; if (s.last_fetch && (!lastFetch || s.last_fetch > lastFetch)) lastFetch = s.last_fetch; });
  const a = st.allegro;
  el.innerHTML = `
    <h1>Pulpit</h1>
    <p class="sub">Import produktów z hurtowni XML i wystawianie na Allegro — jak w SkyShop / BaseLinker, ale u Ciebie na hostingu.</p>
    <div class="cards">
      <div class="card"><div class="lbl">Konto Allegro</div>
        <div class="big">${a.connected ? '✅' : (a.configured ? '🔌' : '⚠️')}</div>
        <div class="muted">${a.connected ? 'Połączono' + (a.user ? ': ' + esc(a.user) : '') : (a.configured ? 'Aplikacja skonfigurowana — połącz konto' : 'Skonfiguruj aplikację w Ustawieniach')}</div></div>
      <div class="card"><div class="lbl">Środowisko</div><div class="big">${a.env === 'sandbox' ? '🧪' : '🟢'}</div><div class="muted">${a.env === 'sandbox' ? 'Sandbox (testowe)' : 'Produkcja'}</div></div>
      <div class="card"><div class="lbl">Hurtownie</div><div class="big">${sup.suppliers.length}</div><div class="muted">skonfigurowane źródła XML</div></div>
      <div class="card"><div class="lbl">Produkty w imporcie</div><div class="big">${totalProducts.toLocaleString('pl-PL')}</div><div class="muted">${lastFetch ? 'ostatni import: ' + lastFetch : 'brak importów'}</div></div>
    </div>
    <div class="panel">
      <h2 style="margin-top:0">🚀 Jak zacząć</h2>
      <ol style="margin-left:1.2rem;line-height:2">
        <li><b>Ustawienia</b> → wpisz Client ID / Secret aplikacji z <a href="https://apps.developer.allegro.pl" target="_blank" rel="noopener">apps.developer.allegro.pl</a> i połącz konto Allegro (OAuth — jak w SkyShop).</li>
        <li><b>Hurtownie XML</b> → dodaj adres pliku XML hurtowni (IOF, Ceneo lub dowolny XML) i kliknij „Pobierz XML".</li>
        <li><b>Produkty</b> → zaznacz produkty z kodem EAN i kliknij „Wystaw na Allegro". Ceny naliczą się z ustawioną marżą.</li>
        <li><b>Oferty Allegro</b> → sprawdzaj status wystawionych ofert.</li>
      </ol>
      <p class="muted" style="margin-top:.6rem">💡 Zacznij od środowiska <b>Sandbox</b> — przetestujesz cały proces bez wystawiania prawdziwych ofert.</p>
    </div>`;
}

/* ---------------- Hurtownie ---------------- */
async function viewSuppliers(el){
  const r = await api('suppliers');
  el.innerHTML = `
    <h1>Hurtownie XML</h1>
    <p class="sub">Źródła plików XML z ofertą hurtowni (IOF, Ceneo XML lub dowolny format — auto-wykrywanie pól PL/EN).</p>
    <div class="row" style="margin-bottom:1rem"><button class="primary" id="add">＋ Dodaj hurtownię</button></div>
    <div class="panel" style="padding:0">
    <table><thead><tr><th>Nazwa</th><th>Adres XML</th><th>Marża</th><th>Ostatni import</th><th>Produkty</th><th>Format</th><th style="width:260px"></th></tr></thead>
    <tbody>${r.suppliers.length ? r.suppliers.map(s => `
      <tr>
        <td><b>${esc(s.name)}</b></td>
        <td class="muted" style="max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(s.url)}</td>
        <td>+${s.markup}%</td>
        <td class="muted">${esc(s.last_fetch || '—')}</td>
        <td>${s.last_count != null ? s.last_count.toLocaleString('pl-PL') : '—'}</td>
        <td class="muted">${esc(s.last_format || '—')}</td>
        <td><div class="row">
          <button data-fetch="${s.id}">⬇️ Pobierz XML</button>
          <button data-edit="${s.id}">✏️</button>
          <button class="danger" data-del="${s.id}">🗑️</button>
        </div></td>
      </tr>`).join('') : '<tr><td colspan="7" class="muted" style="text-align:center;padding:2rem">Brak hurtowni — dodaj pierwszą.</td></tr>'}
    </tbody></table></div>`;
  $('#add', el).onclick = () => supplierForm();
  el.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => supplierForm(r.suppliers.find(s => s.id === b.dataset.edit)));
  el.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => {
    if (!confirm('Usunąć hurtownię wraz z zaimportowanymi produktami?')) return;
    try { await api('supplier_delete', {id: b.dataset.del}); toast('Usunięto.', 'ok'); show('suppliers'); } catch(e){ toast(e.message, 'err'); }
  });
  el.querySelectorAll('[data-fetch]').forEach(b => b.onclick = async () => {
    b.disabled = true; b.innerHTML = '<span class="spin"></span> Pobieram…';
    try {
      const res = await api('supplier_fetch', {id: b.dataset.fetch});
      toast(`Zaimportowano ${res.count.toLocaleString('pl-PL')} produktów (${res.format}).`, 'ok', 8000);
      (res.warnings || []).forEach(w => toast(w, 'warn', 9000));
      show('suppliers');
    } catch(e){ toast(e.message, 'err', 9000); show('suppliers'); }
  });
}

function supplierForm(s){
  s = s || {};
  const bg = modal(`
    <h3>${s.id ? 'Edytuj hurtownię' : 'Dodaj hurtownię'}</h3>
    <label>Nazwa hurtowni *</label><input id="f-name" value="${esc(s.name || '')}" placeholder="np. Hurtownia ABC">
    <label>Adres pliku XML *</label><input id="f-url" value="${esc(s.url || '')}" placeholder="https://hurtownia.pl/oferta.xml">
    <div class="grid2">
      <div><label>Login (Basic Auth — opcjonalnie)</label><input id="f-login" value="${esc(s.login || '')}"></div>
      <div><label>Hasło ${s.has_password ? '(zapisane — zostaw puste by nie zmieniać)' : '(opcjonalnie)'}</label><input id="f-pass" type="password"></div>
    </div>
    <label>Marża na Allegro (%) — cena hurtowa brutto + marża</label><input id="f-markup" type="number" min="0" step="0.1" value="${s.markup != null ? s.markup : 20}">
    <label>Własne mapowanie pól (JSON, opcjonalnie — gdy auto-wykrywanie nie trafi)</label>
    <textarea id="f-map" rows="4" placeholder='np. {"product_node":"produkt","fields":{"name":"opis/nazwa","price_gross":"@cena_brutto","ean":"kody/ean"}}'>${esc(s.mapping ? JSON.stringify(s.mapping) : '')}</textarea>
    <p class="muted" style="margin-top:.4rem">Ścieżki względem węzła produktu: <code>node/podwezel</code>, atrybuty: <code>@atrybut</code> lub <code>wezel@atrybut</code>.</p>
    <div class="row" style="margin-top:1.2rem;justify-content:flex-end">
      <button id="f-cancel">Anuluj</button>
      <button class="primary" id="f-save">Zapisz</button>
    </div>`);
  $('#f-cancel', bg).onclick = () => bg.remove();
  $('#f-save', bg).onclick = async () => {
    try {
      await api('supplier_save', {
        id: s.id || '', name: $('#f-name', bg).value, url: $('#f-url', bg).value,
        login: $('#f-login', bg).value, password: $('#f-pass', bg).value,
        markup: parseFloat($('#f-markup', bg).value) || 0,
        mapping: $('#f-map', bg).value.trim() || null,
      });
      bg.remove(); toast('Zapisano hurtownię.', 'ok'); show('suppliers');
    } catch(e){ toast(e.message, 'err'); }
  };
}

/* ---------------- Produkty ---------------- */
let prodState = { supplier: '', q: '', page: 1, onlyEan: false, selected: new Map() };

async function viewProducts(el){
  const sup = await api('suppliers');
  if (!sup.suppliers.length) {
    el.innerHTML = '<h1>Produkty</h1><p class="sub">Najpierw dodaj hurtownię i pobierz jej plik XML.</p>';
    return;
  }
  if (!prodState.supplier || !sup.suppliers.find(s => s.id === prodState.supplier)) {
    prodState.supplier = sup.suppliers[0].id;
  }
  const supplier = sup.suppliers.find(s => s.id === prodState.supplier);
  const r = await api(`products&supplier=${prodState.supplier}&q=${encodeURIComponent(prodState.q)}&page=${prodState.page}${prodState.onlyEan ? '&only_ean=1' : ''}`);
  const markup = supplier.markup || 0;
  el.innerHTML = `
    <h1>Produkty</h1>
    <p class="sub">${r.fetched_at ? `Import z ${esc(r.fetched_at)} · ${esc(r.format || '')} · ${r.total.toLocaleString('pl-PL')} produktów` : 'Brak importu — pobierz XML w zakładce Hurtownie.'}</p>
    <div class="row" style="margin-bottom:1rem">
      <select id="p-sup" style="width:auto">${sup.suppliers.map(s => `<option value="${s.id}" ${s.id === prodState.supplier ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select>
      <input id="p-q" style="width:260px" placeholder="Szukaj: nazwa / EAN / SKU…" value="${esc(prodState.q)}">
      <label style="margin:0;display:flex;align-items:center;gap:.4rem;color:var(--txt);font-size:.85rem"><input type="checkbox" id="p-ean" style="width:auto" ${prodState.onlyEan ? 'checked' : ''}> tylko z EAN</label>
      <div style="flex:1"></div>
      <button class="primary" id="p-list" ${prodState.selected.size ? '' : 'disabled'}>🏷️ Wystaw na Allegro (${prodState.selected.size})</button>
    </div>
    <div class="panel" style="padding:0;overflow-x:auto">
    <table><thead><tr>
      <th style="width:30px"><input type="checkbox" id="p-all" style="width:auto"></th>
      <th></th><th>Nazwa</th><th>EAN</th><th>SKU</th><th>Cena hurt. brutto</th><th>Cena Allegro (+${markup}%)</th><th>Stan</th>
    </tr></thead><tbody>
    ${r.products.map(p => {
      const selKey = prodState.supplier + ':' + p.key;
      const allegroPrice = p.price_gross != null ? Math.round(p.price_gross * (1 + markup/100) * 100) / 100 : null;
      return `<tr>
        <td><input type="checkbox" style="width:auto" data-sel="${p.key}" ${prodState.selected.has(selKey) ? 'checked' : ''} ${p.ean ? '' : 'disabled title="Brak EAN"'}></td>
        <td>${p.images && p.images.length ? `<img class="thumb" src="${esc(p.images[0])}" loading="lazy" onerror="this.style.visibility='hidden'">` : ''}</td>
        <td style="max-width:340px">${esc(p.name)}<div class="muted" style="font-size:.75rem">${esc(p.producer || '')}${p.category ? ' · ' + esc(String(p.category).slice(0, 60)) : ''}</div></td>
        <td>${p.ean ? `<code>${esc(p.ean)}</code>` : '<span class="badge warn">brak</span>'}</td>
        <td class="muted">${esc(p.sku || '—')}</td>
        <td>${fmtPln(p.price_gross)}</td>
        <td><b>${fmtPln(allegroPrice)}</b></td>
        <td>${p.stock != null ? p.stock : '—'}</td>
      </tr>`; }).join('') || '<tr><td colspan="8" class="muted" style="text-align:center;padding:2rem">Brak produktów.</td></tr>'}
    </tbody></table></div>
    <div class="pager">
      <button id="p-prev" ${r.page <= 1 ? 'disabled' : ''}>‹ Poprzednia</button>
      <span class="muted">strona ${r.page} / ${r.pages || 1}</span>
      <button id="p-next" ${r.page >= r.pages ? 'disabled' : ''}>Następna ›</button>
    </div>`;
  $('#p-sup', el).onchange = e => { prodState.supplier = e.target.value; prodState.page = 1; prodState.selected.clear(); show('products'); };
  $('#p-q', el).onkeydown = e => { if (e.key === 'Enter') { prodState.q = e.target.value; prodState.page = 1; show('products'); } };
  $('#p-ean', el).onchange = e => { prodState.onlyEan = e.target.checked; prodState.page = 1; show('products'); };
  $('#p-prev', el).onclick = () => { prodState.page--; show('products'); };
  $('#p-next', el).onclick = () => { prodState.page++; show('products'); };
  $('#p-all', el).onchange = e => {
    el.querySelectorAll('[data-sel]:not(:disabled)').forEach(cb => {
      cb.checked = e.target.checked;
      const key = prodState.supplier + ':' + cb.dataset.sel;
      const prod = r.products.find(p => String(p.key) === cb.dataset.sel);
      if (e.target.checked) prodState.selected.set(key, {supplier_id: prodState.supplier, product: prod, markup});
      else prodState.selected.delete(key);
    });
    show('products');
  };
  el.querySelectorAll('[data-sel]').forEach(cb => cb.onchange = () => {
    const key = prodState.supplier + ':' + cb.dataset.sel;
    const prod = r.products.find(p => String(p.key) === cb.dataset.sel);
    if (cb.checked) prodState.selected.set(key, {supplier_id: prodState.supplier, product: prod, markup});
    else prodState.selected.delete(key);
    $('#p-list', el).disabled = !prodState.selected.size;
    $('#p-list', el).textContent = `🏷️ Wystaw na Allegro (${prodState.selected.size})`;
  });
  $('#p-list', el).onclick = () => listingWizard();
}

/* Kreator wystawiania na Allegro */
async function listingWizard(){
  const items = [...prodState.selected.values()];
  if (!items.length) return;
  const bg = modal(`
    <h3>🏷️ Wystawianie na Allegro — ${items.length} produkt(y)</h3>
    <p class="muted">Sprawdzam dopasowanie kodów EAN w katalogu produktów Allegro…</p>
    <div class="panel" style="padding:0;margin-top:1rem;overflow-x:auto">
    <table><thead><tr><th>Produkt</th><th>EAN</th><th>Katalog Allegro</th><th style="width:110px">Cena [zł]</th><th style="width:80px">Ilość</th></tr></thead>
    <tbody>${items.map((it, i) => `
      <tr data-row="${i}">
        <td style="max-width:280px">${esc(it.product.name)}</td>
        <td><code>${esc(it.product.ean)}</code></td>
        <td class="match"><span class="spin"></span></td>
        <td><input data-price="${i}" type="number" step="0.01" min="0.01" value="${it.product.price_gross != null ? (Math.round(it.product.price_gross * (1 + it.markup/100) * 100) / 100).toFixed(2) : ''}"></td>
        <td><input data-qty="${i}" type="number" min="1" value="${Math.max(1, Math.min(it.product.stock || 1, 999))}"></td>
      </tr>`).join('')}
    </tbody></table></div>
    <label>Status publikacji</label>
    <select id="w-pub" style="width:auto">
      <option value="INACTIVE">Oferta robocza (INACTIVE) — dokończysz w Allegro</option>
      <option value="ACTIVE">Wystaw od razu (ACTIVE)</option>
    </select>
    <div class="row" style="margin-top:1.2rem;justify-content:flex-end">
      <button id="w-cancel">Anuluj</button>
      <button class="primary" id="w-go" disabled><span class="spin"></span> Sprawdzam EAN…</button>
    </div>
    <div id="w-results"></div>`, true);
  $('#w-cancel', bg).onclick = () => bg.remove();

  // dopasowanie EAN
  try {
    const m = await api('allegro_match', {eans: items.map(it => it.product.ean)});
    items.forEach((it, i) => {
      const cell = bg.querySelector(`[data-row="${i}"] .match`);
      const res = m.matches[it.product.ean];
      if (res && res.found) cell.innerHTML = `<span class="badge ok">✓ znaleziono</span> <span class="muted" style="font-size:.78rem">${esc(res.name.slice(0, 50))}</span>`;
      else if (res && res.error) cell.innerHTML = `<span class="badge err">błąd</span> <span class="muted">${esc(res.error)}</span>`;
      else cell.innerHTML = '<span class="badge err">brak w katalogu</span>';
      it.matched = !!(res && res.found);
    });
    const anyMatched = items.some(it => it.matched);
    const goBtn = $('#w-go', bg);
    goBtn.disabled = !anyMatched;
    goBtn.innerHTML = anyMatched ? `Wystaw ${items.filter(it => it.matched).length} ofert(y)` : 'Brak produktów do wystawienia';
  } catch(e) {
    toast(e.message, 'err', 9000);
    $('#w-go', bg).innerHTML = 'Błąd dopasowania';
    return;
  }

  $('#w-go', bg).onclick = async () => {
    const goBtn = $('#w-go', bg);
    goBtn.disabled = true; goBtn.innerHTML = '<span class="spin"></span> Wystawiam…';
    const payload = items.map((it, i) => it.matched ? {
      supplier_id: it.supplier_id,
      key: it.product.key,
      ean: it.product.ean,
      price: parseFloat(bg.querySelector(`[data-price="${i}"]`).value),
      qty: parseInt(bg.querySelector(`[data-qty="${i}"]`).value, 10) || 1,
    } : null).filter(Boolean);
    try {
      const r = await api('allegro_list_offers', {items: payload, publication: $('#w-pub', bg).value});
      const okCount = r.results.filter(x => x.ok).length;
      $('#w-results', bg).innerHTML = `
        <h3 style="margin-top:1.4rem">Wynik: ${okCount} / ${r.results.length} wystawiono</h3>
        <table><tbody>${r.results.map(x => `
          <tr><td>${x.ok ? '✅' : '❌'}</td><td>${esc(x.name || '')}</td>
          <td class="muted">${x.ok ? 'ID oferty: ' + esc(x.offer_id || '?') + (x.pending ? ' (w trakcie przetwarzania)' : '') : esc(x.error)}</td></tr>`).join('')}
        </tbody></table>`;
      goBtn.innerHTML = 'Gotowe';
      if (okCount) { toast(`Wystawiono ${okCount} ofert(y). 🎉`, 'ok', 8000); prodState.selected.clear(); }
    } catch(e){ toast(e.message, 'err', 9000); goBtn.disabled = false; goBtn.innerHTML = 'Spróbuj ponownie'; }
  };
}

/* ---------------- Oferty ---------------- */
let offersPage = 1;
async function viewOffers(el){
  let r;
  try { r = await api('allegro_offers&page=' + offersPage); }
  catch(e){ el.innerHTML = `<h1>Oferty Allegro</h1><p class="sub">${esc(e.message)}</p>`; return; }
  const offerBase = r.env === 'sandbox' ? 'https://allegro.pl.allegrosandbox.pl' : 'https://allegro.pl';
  el.innerHTML = `
    <h1>Oferty Allegro</h1>
    <p class="sub">Twoje oferty na koncie Allegro (${r.totalCount.toLocaleString('pl-PL')} łącznie).</p>
    <div class="panel" style="padding:0;overflow-x:auto">
    <table><thead><tr><th>Oferta</th><th>Cena</th><th>Dostępne</th><th>Sprzedane</th><th>Status</th><th></th></tr></thead>
    <tbody>${r.offers.map(o => `
      <tr>
        <td style="max-width:380px">${esc(o.name || o.id)}</td>
        <td>${o.sellingMode && o.sellingMode.price ? fmtPln(o.sellingMode.price.amount) : '—'}</td>
        <td>${o.stock ? o.stock.available : '—'}</td>
        <td>${o.stats ? (o.stats.soldQuantity ?? '—') : '—'}</td>
        <td><span class="badge ${o.publication && o.publication.status === 'ACTIVE' ? 'ok' : 'mut'}">${esc(o.publication ? o.publication.status : '?')}</span></td>
        <td><a href="${offerBase}/oferta/${esc(o.id)}" target="_blank" rel="noopener">podgląd ↗</a></td>
      </tr>`).join('') || '<tr><td colspan="6" class="muted" style="text-align:center;padding:2rem">Brak ofert.</td></tr>'}
    </tbody></table></div>
    <div class="pager">
      <button id="o-prev" ${r.page <= 1 ? 'disabled' : ''}>‹</button>
      <span class="muted">strona ${r.page} / ${r.pages || 1}</span>
      <button id="o-next" ${r.page >= r.pages ? 'disabled' : ''}>›</button>
    </div>`;
  $('#o-prev', el).onclick = () => { offersPage--; show('offers'); };
  $('#o-next', el).onclick = () => { offersPage++; show('offers'); };
}

/* ---------------- Ustawienia ---------------- */
async function viewSettings(el){
  const r = await api('settings');
  const s = r.settings;
  const st = await api('status'); STATUS = st;
  const connected = st.allegro.connected;
  el.innerHTML = `
    <h1>Ustawienia</h1>
    <p class="sub">Aplikacja Allegro (OAuth), domyślne parametry ofert i hasło panelu.</p>

    <div class="panel">
      <h2 style="margin-top:0">🔑 Aplikacja Allegro</h2>
      <p class="muted">Zarejestruj aplikację na <a href="https://apps.developer.allegro.pl" target="_blank" rel="noopener">apps.developer.allegro.pl</a>
      (dla Sandbox: <a href="https://apps.developer.allegro.pl.allegrosandbox.pl" target="_blank" rel="noopener">wersja sandbox</a>).
      Typ: <b>aplikacja webowa</b>, Redirect URI wklej z pola poniżej.</p>
      <div class="grid2">
        <div><label>Client ID</label><input id="s-id" value="${esc(s.allegro_client_id)}"></div>
        <div><label>Client Secret ${s.allegro_secret_set ? '(zapisany — zostaw puste by nie zmieniać)' : ''}</label><input id="s-secret" type="password" placeholder="${s.allegro_secret_set ? '••••••••' : ''}"></div>
      </div>
      <div class="grid2">
        <div><label>Środowisko</label>
          <select id="s-env">
            <option value="sandbox" ${s.allegro_env === 'sandbox' ? 'selected' : ''}>Sandbox (testowe)</option>
            <option value="production" ${s.allegro_env === 'production' ? 'selected' : ''}>Produkcja (prawdziwe Allegro)</option>
          </select></div>
        <div><label>Redirect URI (wklej w ustawieniach aplikacji Allegro)</label>
          <div class="row"><input id="s-redirect" readonly value="${esc(s.redirect_uri)}" style="flex:1"><button id="s-copy">📋</button></div></div>
      </div>
      <label>Domyślna marża (%)</label><input id="s-markup" type="number" min="0" step="0.1" value="${s.markup_default}" style="max-width:160px">
      <div class="row" style="margin-top:1.2rem">
        <button class="primary" id="s-save">Zapisz ustawienia</button>
        <div style="flex:1"></div>
        ${connected
          ? `<span class="badge ok">✓ Połączono${st.allegro.user ? ': ' + esc(st.allegro.user) : ''}</span><button class="danger" id="s-disconnect">Odłącz konto</button>`
          : `<button class="primary" id="s-connect" ${st.allegro.configured ? '' : 'disabled title="Najpierw zapisz Client ID i Secret"'}>🔗 Połącz konto Allegro</button>
             <button id="s-device" ${st.allegro.configured ? '' : 'disabled'}>📱 Połącz kodem (Device Flow)</button>`}
      </div>
    </div>

    <div class="panel">
      <h2 style="margin-top:0">📦 Domyślne parametry ofert</h2>
      <p class="muted">Pobierane z Twojego konta Allegro — wymagane przy wystawianiu aktywnych ofert (konta firmowe).
        ${connected ? '' : '<b>Połącz konto, aby załadować listy.</b>'}</p>
      <div class="grid2">
        <div><label>Cennik dostawy</label><select id="s-ship"><option value="">— nie ustawiaj —</option></select></div>
        <div><label>Polityka zwrotów</label><select id="s-return"><option value="">— nie ustawiaj —</option></select></div>
        <div><label>Warunki reklamacji</label><select id="s-implied"><option value="">— nie ustawiaj —</option></select></div>
        <div><label>Gwarancja</label><select id="s-warranty"><option value="">— nie ustawiaj —</option></select></div>
      </div>
      <label>Domyślny status publikacji</label>
      <select id="s-pub" style="max-width:380px">
        <option value="INACTIVE" ${s.offer_defaults.publication !== 'ACTIVE' ? 'selected' : ''}>Oferta robocza (INACTIVE)</option>
        <option value="ACTIVE" ${s.offer_defaults.publication === 'ACTIVE' ? 'selected' : ''}>Od razu aktywna (ACTIVE)</option>
      </select>
      <div class="row" style="margin-top:1.2rem"><button class="primary" id="s-save2">Zapisz parametry ofert</button></div>
    </div>

    <div class="panel">
      <h2 style="margin-top:0">🔒 Zmiana hasła panelu</h2>
      <div class="grid2">
        <div><label>Obecne hasło</label><input id="s-cur" type="password"></div>
        <div><label>Nowe hasło (min. 8 znaków)</label><input id="s-new" type="password"></div>
      </div>
      <div class="row" style="margin-top:1.2rem"><button id="s-pass">Zmień hasło</button></div>
    </div>`;

  $('#s-copy', el).onclick = () => { navigator.clipboard.writeText(s.redirect_uri); toast('Skopiowano Redirect URI.', 'ok'); };
  const saveMain = async () => {
    await api('settings_save', {
      allegro_client_id: $('#s-id', el).value,
      allegro_client_secret: $('#s-secret', el).value,
      allegro_env: $('#s-env', el).value,
      markup_default: parseFloat($('#s-markup', el).value) || 0,
    });
  };
  $('#s-save', el).onclick = async () => {
    try { await saveMain(); toast('Zapisano.', 'ok'); show('settings'); } catch(e){ toast(e.message, 'err'); }
  };
  if ($('#s-connect', el)) $('#s-connect', el).onclick = async () => {
    try { await saveMain(); const r2 = await api('allegro_connect'); location.href = r2.url; }
    catch(e){ toast(e.message, 'err'); }
  };
  if ($('#s-device', el)) $('#s-device', el).onclick = async () => {
    try { await saveMain(); deviceFlow(); } catch(e){ toast(e.message, 'err'); }
  };
  if ($('#s-disconnect', el)) $('#s-disconnect', el).onclick = async () => {
    try { await api('allegro_disconnect', {}); toast('Odłączono konto.', 'ok'); show('settings'); } catch(e){ toast(e.message, 'err'); }
  };
  $('#s-save2', el).onclick = async () => {
    try {
      await api('settings_save', { offer_defaults: {
        publication: $('#s-pub', el).value,
        shipping_rate_id: $('#s-ship', el).value,
        return_policy_id: $('#s-return', el).value,
        implied_warranty_id: $('#s-implied', el).value,
        warranty_id: $('#s-warranty', el).value,
      }});
      toast('Zapisano parametry ofert.', 'ok');
    } catch(e){ toast(e.message, 'err'); }
  };
  $('#s-pass', el).onclick = async () => {
    try { await api('password_change', {current: $('#s-cur', el).value, new: $('#s-new', el).value}); toast('Hasło zmienione.', 'ok'); $('#s-cur', el).value = $('#s-new', el).value = ''; }
    catch(e){ toast(e.message, 'err'); }
  };

  // słowniki ofertowe
  if (connected) {
    try {
      const d = await api('allegro_offer_dictionaries');
      const fill = (sel, list, chosen) => {
        const box = $(sel, el);
        (list || []).forEach(x => {
          const o = document.createElement('option');
          o.value = x.id; o.textContent = x.name || x.id;
          if (x.id === chosen) o.selected = true;
          box.appendChild(o);
        });
      };
      fill('#s-ship', d.shipping_rates, s.offer_defaults.shipping_rate_id);
      fill('#s-return', d.return_policies, s.offer_defaults.return_policy_id);
      fill('#s-implied', d.implied_warranties, s.offer_defaults.implied_warranty_id);
      fill('#s-warranty', d.warranties, s.offer_defaults.warranty_id);
    } catch(e){ toast('Nie udało się pobrać słowników ofert: ' + e.message, 'warn', 8000); }
  }
}

/* Device Flow — połączenie kodem */
async function deviceFlow(){
  let r;
  try { r = await api('allegro_device_start', {}); } catch(e){ return toast(e.message, 'err', 9000); }
  const bg = modal(`
    <h3>📱 Połącz konto kodem</h3>
    <p class="muted">Wejdź na poniższy adres, zaloguj się w Allegro i zatwierdź kod:</p>
    <div class="code-box">${esc(r.user_code)}</div>
    <p style="text-align:center"><a href="${esc(r.verification_uri_complete)}" target="_blank" rel="noopener">${esc(r.verification_uri_complete)} ↗</a></p>
    <p class="muted" id="d-status" style="text-align:center;margin-top:1rem"><span class="spin"></span> Czekam na potwierdzenie…</p>
    <div class="row" style="justify-content:flex-end;margin-top:1rem"><button id="d-cancel">Anuluj</button></div>`);
  let stop = false;
  $('#d-cancel', bg).onclick = () => { stop = true; bg.remove(); };
  const interval = Math.max(5, r.interval || 5) * 1000;
  (async function poll(){
    while (!stop) {
      await new Promise(res => setTimeout(res, interval));
      if (stop) return;
      try {
        const p = await api('allegro_device_poll', {device_code: r.device_code});
        if (p.status === 'connected') { stop = true; bg.remove(); toast('Konto Allegro połączone! 🎉', 'ok'); show('settings'); return; }
      } catch(e) { stop = true; $('#d-status', bg).innerHTML = '❌ ' + esc(e.message); return; }
    }
  })();
}

/* ---------------- Logi ---------------- */
async function viewLogs(el){
  const r = await api('logs');
  el.innerHTML = `
    <h1>Logi</h1>
    <p class="sub">Ostatnie ${r.logs.length} zdarzeń (importy, autoryzacje, wystawianie ofert, błędy).</p>
    <div class="panel" style="padding:0;overflow-x:auto">
    <table><thead><tr><th style="width:150px">Czas</th><th style="width:70px">Typ</th><th>Zdarzenie</th><th>Szczegóły</th></tr></thead>
    <tbody>${r.logs.map(l => `
      <tr>
        <td class="muted">${esc(l.ts)}</td>
        <td><span class="badge ${l.level === 'error' ? 'err' : 'ok'}">${esc(l.level)}</span></td>
        <td>${esc(l.msg)}</td>
        <td class="muted" style="font-size:.78rem;max-width:340px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(l.ctx && Object.keys(l.ctx).length ? JSON.stringify(l.ctx) : '')}</td>
      </tr>`).join('') || '<tr><td colspan="4" class="muted" style="text-align:center;padding:2rem">Brak zdarzeń.</td></tr>'}
    </tbody></table></div>`;
}

boot();
</script>
</body>
</html>
