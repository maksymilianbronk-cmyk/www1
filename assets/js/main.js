const gallery = document.getElementById('gallery');

if (!SITES || SITES.length === 0) {
  gallery.innerHTML = `
    <div class="empty">
      <h2>Brak stron w kolekcji</h2>
      <p>Dodaj pierwszą stronę: utwórz folder <code>sites/&lt;slug&gt;/</code><br>
         i dodaj wpis w <code>assets/js/sites.js</code>.</p>
    </div>`;
} else {
  gallery.innerHTML = SITES.map(site => `
    <a class="card" href="sites/${site.slug}/">
      <div class="card-preview">
        ${site.preview
          ? `<iframe src="sites/${site.slug}/" loading="lazy" title="${site.title}"></iframe>`
          : site.icon || '🌐'}
      </div>
      <div class="card-body">
        <div class="card-title">${site.title}</div>
        <div class="card-desc">${site.desc || ''}</div>
        ${site.tag ? `<span class="card-tag">${site.tag}</span>` : ''}
      </div>
    </a>
  `).join('');
}
