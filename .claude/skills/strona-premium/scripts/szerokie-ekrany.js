const { chromium } = require('playwright');
const PAGES = ['index.html','osrodek.html','rehabilitacja.html','medycyna-estetyczna.html',
  'kosmetologia.html','masaze-orientalne.html','pakiety.html','cennik.html','o-nas.html','kontakt.html'];
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium' });
  let bad = 0;
  for (const pg of PAGES) {
    const heights = {}, sect = {};
    for (const w of [1440, 7600]) {
      const p = await b.newPage({ viewport: { width: w, height: 900 } });
      await p.route('**/*', r => (/^https?:\/\/(?!127\.0\.0\.1)/.test(r.request().url()) ? r.abort() : r.continue()));
      await p.goto('http://127.0.0.1:8123/' + pg, { waitUntil: 'domcontentloaded' });
      await p.waitForTimeout(500);
      heights[w] = await p.evaluate(() => document.body.scrollHeight);
      sect[w] = await p.evaluate(() => [...document.querySelectorAll('section')]
        .map(s => Math.round(s.getBoundingClientRect().height)));
      await p.close();
    }
    // Sekcja może być wysoka z powodu treści (np. długa tabela cennika) — to nie
    // błąd. Błędem jest sekcja, która ROŚNIE razem z szerokością okna.
    const swelling = sect[1440]
      .map((h, i) => ({ i, d: (sect[7600][i] || 0) - h }))
      .filter(x => x.d > 300);
    if (swelling.length) { bad += swelling.length;
      swelling.forEach(x => console.log('  ✗', pg, 'sekcja #' + x.i, 'rośnie o', x.d, 'px')); }
    const grow = heights[7600] - heights[1440];
    console.log((grow > 400 ? '✗' : '✓'), pg.padEnd(26), '1440:', heights[1440], '| 7600:', heights[7600], '| różnica:', grow);
    if (grow > 400) bad++;
  }
  console.log(bad ? `\n${bad} problemów` : '\nSzerokie ekrany czyste');
  await b.close();
})();
