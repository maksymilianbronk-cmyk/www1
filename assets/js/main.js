const gallery = document.getElementById('gallery');
const catBar  = document.getElementById('cat-bar');
const searchI = document.getElementById('search');
const modal   = document.getElementById('info-modal');
const mBody   = document.getElementById('modal-body');
const mClose  = document.getElementById('modal-close');
const zModal  = document.getElementById('zip-modal');
const zInput  = document.getElementById('zip-pass');
const zOk     = document.getElementById('zip-ok');
const zCancel = document.getElementById('zip-cancel');
const zErr    = document.getElementById('zip-err');

const ZIP_PASS = 'ab123';

/* ── IMPORTED SITES FROM LOCALSTORAGE ── */
const IMPORTED = (() => {
  try {
    return JSON.parse(localStorage.getItem('www1_imported_v1') || '[]').map(s => ({
      slug: s.slug,
      title: s.title,
      desc: s.desc || '',
      icon: s.icon || '📄',
      tag: s.tag || 'import',
      preview: !!s.html,
      meta: s.meta || {},
      _imported: true,
      _blobUrl: s.html
        ? URL.createObjectURL(new Blob([s.html], { type: 'text/html' }))
        : null
    }));
  } catch { return []; }
})();

const ALL_SITES = [...SITES, ...IMPORTED];

/* ── KATEGORIE ── */
const CATS = [
  { id: 'all',       label: 'Wszystkie',             icon: '✨', match: () => true },
  { id: 'firmy',     label: 'Strony dla firm',       icon: '🏪', tags: ['landing', 'hotel', 'klinika'] },
  { id: 'narzedzia', label: 'Narzędzia',             icon: '🛠️', tags: ['narzędzie', 'crm'] },
  { id: 'katalogi',  label: 'Katalogi i przewodniki', icon: '📚', tags: ['katalog', 'przewodnik'] },
  { id: 'import',    label: 'Zaimportowane',         icon: '📦', match: s => s._imported },
];

function siteCat(site) {
  for (const c of CATS) {
    if (c.id === 'all') continue;
    if (c.match ? c.match(site) : c.tags.includes(site.tag)) return c.id;
  }
  return 'inne';
}

const state = { cat: 'all', q: '' };

function catCount(id) {
  if (id === 'all') return ALL_SITES.length;
  return ALL_SITES.filter(s => siteCat(s) === id).length;
}

function buildCatBar() {
  const cats = [...CATS];
  if (ALL_SITES.some(s => siteCat(s) === 'inne')) {
    cats.push({ id: 'inne', label: 'Inne', icon: '🧩' });
  }
  catBar.innerHTML = cats
    .filter(c => catCount(c.id) > 0)
    .map(c => `
      <button class="cat-chip${state.cat === c.id ? ' active' : ''}" data-cat="${c.id}">
        <span class="cat-ico">${c.icon}</span>${c.label}
        <span class="cat-count">${catCount(c.id)}</span>
      </button>`).join('');
}

catBar.addEventListener('click', e => {
  const chip = e.target.closest('.cat-chip');
  if (!chip) return;
  state.cat = chip.dataset.cat;
  buildCatBar();
  render();
});

let searchT;
searchI.addEventListener('input', () => {
  clearTimeout(searchT);
  searchT = setTimeout(() => { state.q = searchI.value.trim().toLowerCase(); render(); }, 120);
});

/* ── BUILD CARDS ── */
function buildCard(site) {
  const href = site._blobUrl ? site._blobUrl : `sites/${site.slug}/`;
  const linkExtra = site._blobUrl ? ' target="_blank" rel="noopener"' : '';
  const iframeSrc = site._blobUrl ? site._blobUrl : `sites/${site.slug}/`;
  return `
    <div class="card" data-slug="${site.slug}">
      <a class="card-link" href="${href}"${linkExtra} aria-label="${site.title}">
        <div class="card-preview">
          ${site.preview
            ? `<iframe src="${iframeSrc}" loading="lazy" title="${site.title}" tabindex="-1"></iframe>`
            : `<span class="card-icon">${site.icon || '🌐'}</span>`}
          <span class="card-open-hint">Otwórz stronę →</span>
        </div>
        <div class="card-body">
          <div class="card-title">${site.title}</div>
          <div class="card-desc">${site.desc || ''}</div>
          <button class="desc-toggle" type="button" hidden>Rozwiń ▾</button>
          ${site.tag ? `<span class="card-tag">${site.tag}${site._imported ? ' · import' : ''}</span>` : ''}
        </div>
      </a>
      <div class="card-actions">
        <button class="card-info-btn" data-slug="${site.slug}" aria-label="Informacje o stronie ${site.title}">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <circle cx="7" cy="7" r="6.5" stroke="currentColor"/>
            <rect x="6.3" y="5.5" width="1.4" height="5" rx=".7" fill="currentColor"/>
            <circle cx="7" cy="3.5" r=".8" fill="currentColor"/>
          </svg>
          info
        </button>
        ${site._imported
          ? `<button class="card-zip-btn card-rm-btn" data-slug="${site.slug}" aria-label="Usuń ${site.title} z kolekcji">
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
                <path d="M2 2l9 9M11 2l-9 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              </svg>
              usuń
            </button>`
          : `<button class="card-zip-btn" data-slug="${site.slug}" aria-label="Pobierz ${site.title} jako ZIP">
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
                <path d="M6.5 1v8M3.5 6l3 3 3-3M1.5 10.5h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              Pobierz ZIP
            </button>`}
      </div>
    </div>`;
}

function visibleSites() {
  return ALL_SITES.filter(s => {
    if (state.cat !== 'all' && siteCat(s) !== state.cat) return false;
    if (state.q) {
      const hay = `${s.title} ${s.desc} ${s.tag}`.toLowerCase();
      if (!hay.includes(state.q)) return false;
    }
    return true;
  });
}

function render() {
  const list = visibleSites();
  if (!ALL_SITES.length) {
    gallery.innerHTML = `
      <div class="empty">
        <h2>Brak stron w kolekcji</h2>
        <p>Dodaj pierwszą stronę: utwórz folder <code>sites/&lt;slug&gt;/</code><br>
           i dodaj wpis w <code>assets/js/sites.js</code>.</p>
      </div>`;
    return;
  }
  if (!list.length) {
    gallery.innerHTML = `
      <div class="empty">
        <h2>Nic nie znaleziono 🔍</h2>
        <p>Zmień kategorię albo wpisz inną frazę.</p>
      </div>`;
    return;
  }
  gallery.innerHTML = list.map(buildCard).join('');
  requestAnimationFrame(setupDescToggles);
}

/* ── „ROZWIŃ" DLA DŁUGICH OPISÓW ── */
function setupDescToggles() {
  gallery.querySelectorAll('.card-desc').forEach(desc => {
    const btn = desc.parentElement.querySelector('.desc-toggle');
    if (!btn) return;
    // pokazuj przycisk tylko, gdy opis faktycznie się nie mieści
    if (desc.scrollHeight > desc.clientHeight + 4) btn.hidden = false;
  });
}

gallery.addEventListener('click', e => {
  const btn = e.target.closest('.desc-toggle');
  if (!btn) return;
  e.preventDefault();
  e.stopPropagation();
  const desc = btn.parentElement.querySelector('.card-desc');
  const open = desc.classList.toggle('expanded');
  btn.textContent = open ? 'Zwiń ▴' : 'Rozwiń ▾';
});

buildCatBar();
render();

/* ── INFO BUTTON CLICK ── */
gallery.addEventListener('click', e => {
  const btn = e.target.closest('.card-info-btn');
  if (!btn) return;
  e.preventDefault();
  e.stopPropagation();
  const site = ALL_SITES.find(s => s.slug === btn.dataset.slug);
  if (site) openModal(site);
});

/* ── MODAL ── */
function openModal(site) {
  const m = site.meta || {};
  const href = site._blobUrl ? site._blobUrl : `sites/${site.slug}/`;

  const swatches = (m.colors || []).map(c => `
    <button class="swatch" data-hex="${c}" style="--c:${c}" title="Kopiuj ${c}" aria-label="Kolor ${c}">
      <span class="swatch-hex">${c}</span>
    </button>`).join('');

  const badges = (arr, cls = '') =>
    arr.map(x => `<span class="mi-badge ${cls}">${x}</span>`).join('');

  mBody.innerHTML = `
    <div class="mi-head">
      <span class="mi-icon">${site.icon || '🌐'}</span>
      <div>
        <span class="mi-tag">${site.tag || ''}${site._imported ? ' · zaimportowana' : ''}</span>
        <h2 class="mi-title">${site.title}</h2>
      </div>
    </div>
    <p class="mi-desc">${site.desc || ''}</p>
    ${m.colors?.length ? `
      <div class="mi-section">
        <div class="mi-label">Kolory</div>
        <div class="mi-swatches">${swatches}</div>
        <div class="mi-copy-hint">kliknij kolor, aby skopiować hex</div>
      </div>` : ''}
    ${m.fonts?.length ? `
      <div class="mi-section">
        <div class="mi-label">Czcionki</div>
        <div class="mi-badges">${badges(m.fonts)}</div>
      </div>` : ''}
    ${m.tech?.length ? `
      <div class="mi-section">
        <div class="mi-label">Technologie</div>
        <div class="mi-badges">${badges(m.tech, 'mi-badge--tech')}</div>
      </div>` : ''}
    <a class="mi-open" href="${href}" target="_blank" rel="noopener">
      Otwórz stronę
      <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
        <path d="M2 11L11 2M11 2H5M11 2v6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
    </a>
  `;

  modal.classList.add('open');
  modal.focus();
}

function closeModal() { modal.classList.remove('open'); }

mClose.addEventListener('click', closeModal);
modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeModal(); closeZipModal(); }
});

/* ── ZIP: HASŁO ── */
let pendingZip = null; // { site, btn }

function openZipModal(site, btn) {
  pendingZip = { site, btn };
  zErr.hidden = true;
  zInput.value = '';
  zModal.classList.add('open');
  setTimeout(() => zInput.focus(), 60);
}

function closeZipModal() {
  pendingZip = null;
  if (zModal) zModal.classList.remove('open');
}

if (zModal) {
  zCancel.addEventListener('click', closeZipModal);
  zModal.addEventListener('click', e => { if (e.target === zModal) closeZipModal(); });
  zInput.addEventListener('keydown', e => { if (e.key === 'Enter') zOk.click(); });
  zInput.addEventListener('input', () => { zErr.hidden = true; });
  zOk.addEventListener('click', async () => {
    if (!pendingZip) return;
    if (zInput.value !== ZIP_PASS) {
      zErr.hidden = false;
      const card = zModal.querySelector('.info-modal-card');
      card.classList.remove('shake');
      void card.offsetWidth;
      card.classList.add('shake');
      zInput.select();
      return;
    }
    const { site, btn } = pendingZip;
    closeZipModal();
    await downloadZip(site, btn);
  });
}

/* ── ZIP DOWNLOAD / REMOVE IMPORTED ── */
gallery.addEventListener('click', async e => {
  const btn = e.target.closest('.card-zip-btn');
  if (!btn) return;
  e.preventDefault();
  e.stopPropagation();

  if (btn.classList.contains('card-rm-btn')) {
    const slug = btn.dataset.slug;
    if (!confirm(`Usunąć „${slug}" z kolekcji?`)) return;
    try {
      const list = JSON.parse(localStorage.getItem('www1_imported_v1') || '[]');
      localStorage.setItem('www1_imported_v1', JSON.stringify(list.filter(s => s.slug !== slug)));
    } catch {}
    const card = btn.closest('.card');
    if (card) { card.style.transition = 'opacity .3s,transform .3s'; card.style.opacity = '0'; card.style.transform = 'scale(.95)'; setTimeout(() => card.remove(), 300); }
    return;
  }

  const site = ALL_SITES.find(s => s.slug === btn.dataset.slug);
  if (site) openZipModal(site, btn);
});

async function downloadZip(site, btn) {
  btn.classList.add('loading');
  btn.disabled = true;
  try {
    const zip = new JSZip();
    const folder = zip.folder(site.slug);

    // Fetch main HTML as text so we can rewrite image URLs
    const htmlRes = await fetch(`sites/${site.slug}/index.html`);
    if (!htmlRes.ok) throw new Error(htmlRes.status);
    let html = await htmlRes.text();

    // Find all Unsplash image URLs (absolute, including query strings)
    const unsplashRe = /https:\/\/images\.unsplash\.com\/[^"'\s)\]>]+/g;
    const imgUrls = [...new Set(html.match(unsplashRe) || [])];

    // Fetch each image, add to zip/images/, build rewrite map
    const imgMap = {};
    await Promise.all(imgUrls.map(async url => {
      try {
        const pid = (url.match(/\/(photo-[a-zA-Z0-9_-]+)/) || [])[1] || ('img-' + Math.random().toString(36).slice(2, 8));
        const local = `images/${pid}.jpg`;
        const r = await fetch(url);
        if (r.ok) { folder.file(local, await r.blob()); imgMap[url] = local; }
      } catch {}
    }));

    // Rewrite HTML so local images are used
    for (const [orig, local] of Object.entries(imgMap)) {
      html = html.split(orig).join(local);
    }
    folder.file('index.html', html);

    // Extra declared files (CSS, sub-pages etc.)
    const extras = (site.meta?.files || []).filter(f => f !== 'index.html');
    await Promise.all(extras.map(async f => {
      const r = await fetch(`sites/${site.slug}/${f}`);
      if (r.ok) folder.file(f, await r.blob());
    }));

    const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(blob),
      download: `${site.slug}.zip`,
    });
    a.click();
    URL.revokeObjectURL(a.href);
  } catch (err) {
    alert(`Nie udało się pobrać: ${err.message}`);
  } finally {
    btn.classList.remove('loading');
    btn.disabled = false;
  }
}

/* ── SWATCH COPY ── */
mBody.addEventListener('click', e => {
  const sw = e.target.closest('.swatch');
  if (!sw) return;
  navigator.clipboard?.writeText(sw.dataset.hex).catch(() => {});
  sw.classList.add('copied');
  setTimeout(() => sw.classList.remove('copied'), 1400);
});
