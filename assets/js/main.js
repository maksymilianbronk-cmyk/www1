const gallery = document.getElementById('gallery');
const modal   = document.getElementById('info-modal');
const mBody   = document.getElementById('modal-body');
const mClose  = document.getElementById('modal-close');

/* ── BUILD CARDS ── */
if (!SITES || SITES.length === 0) {
  gallery.innerHTML = `
    <div class="empty">
      <h2>Brak stron w kolekcji</h2>
      <p>Dodaj pierwszą stronę: utwórz folder <code>sites/&lt;slug&gt;/</code><br>
         i dodaj wpis w <code>assets/js/sites.js</code>.</p>
    </div>`;
} else {
  gallery.innerHTML = SITES.map(site => `
    <div class="card">
      <a class="card-link" href="sites/${site.slug}/" aria-label="${site.title}">
        <div class="card-preview">
          ${site.preview
            ? `<iframe src="sites/${site.slug}/" loading="lazy" title="${site.title}" tabindex="-1"></iframe>`
            : `<span class="card-icon">${site.icon || '🌐'}</span>`}
        </div>
        <div class="card-body">
          <div class="card-title">${site.title}</div>
          <div class="card-desc">${site.desc || ''}</div>
          ${site.tag ? `<span class="card-tag">${site.tag}</span>` : ''}
        </div>
      </a>
      <button class="card-info-btn" data-slug="${site.slug}" aria-label="Informacje o stronie ${site.title}">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <circle cx="7" cy="7" r="6.5" stroke="currentColor"/>
          <rect x="6.3" y="5.5" width="1.4" height="5" rx=".7" fill="currentColor"/>
          <circle cx="7" cy="3.5" r=".8" fill="currentColor"/>
        </svg>
        info
      </button>
    </div>
  `).join('');
}

/* ── INFO BUTTON CLICK ── */
gallery.addEventListener('click', e => {
  const btn = e.target.closest('.card-info-btn');
  if (!btn) return;
  e.preventDefault();
  e.stopPropagation();
  const site = SITES.find(s => s.slug === btn.dataset.slug);
  if (site) openModal(site);
});

/* ── MODAL ── */
function openModal(site) {
  const m = site.meta || {};

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
        <span class="mi-tag">${site.tag || ''}</span>
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
    <a class="mi-open" href="sites/${site.slug}/" target="_blank" rel="noopener">
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
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

/* ── SWATCH COPY ── */
mBody.addEventListener('click', e => {
  const sw = e.target.closest('.swatch');
  if (!sw) return;
  navigator.clipboard?.writeText(sw.dataset.hex).catch(() => {});
  sw.classList.add('copied');
  setTimeout(() => sw.classList.remove('copied'), 1400);
});
