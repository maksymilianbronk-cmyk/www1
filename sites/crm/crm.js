/* LeadFlow CRM — interakcje panelu */

/* Rozwijanie szczegółów leada po kliknięciu wiersza */
document.querySelectorAll('.lead-row').forEach(row => {
  row.addEventListener('click', e => {
    if (e.target.closest('a, button, select, input, textarea, form')) return;
    const det = document.getElementById(row.dataset.target);
    if (!det) return;
    const open = det.classList.toggle('open');
    row.classList.toggle('expanded', open);
  });
});

/* Kopiowanie adresów webhooków jednym kliknięciem */
document.querySelectorAll('[data-copy]').forEach(el => {
  el.title = 'Kliknij, aby skopiować';
  el.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(el.textContent.trim());
      el.classList.add('copied');
      setTimeout(() => el.classList.remove('copied'), 1200);
    } catch {}
  });
});
