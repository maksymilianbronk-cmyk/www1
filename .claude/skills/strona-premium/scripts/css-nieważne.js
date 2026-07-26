// Wykrywa deklaracje odrzucone przez przeglądarkę: ustawiamy każdą własność
// z CSSOM na świeżym elemencie i sprawdzamy, czy w ogóle się przyjęła.
const { chromium } = require('playwright');
const PAGES = ['index.html','osrodek.html','rehabilitacja.html','medycyna-estetyczna.html',
  'kosmetologia.html','masaze-orientalne.html','pakiety.html','cennik.html','o-nas.html','kontakt.html'];
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium' });
  let bad = 0;
  for (const pg of PAGES) {
    const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
    await p.route('**/*', r => (/^https?:\/\/(?!127\.0\.0\.1)/.test(r.request().url()) ? r.abort() : r.continue()));
    await p.goto('http://127.0.0.1:8123/' + pg, { waitUntil: 'load' });
    const out = await p.evaluate(() => {
      const probe = document.createElement('div'), res = [];
      // 1. style inline w HTML
      document.querySelectorAll('[style]').forEach(el => {
        el.getAttribute('style').split(';').forEach(d => {
          const i = d.indexOf(':'); if (i < 1) return;
          const prop = d.slice(0, i).trim(), val = d.slice(i + 1).trim();
          if (!prop || !val) return;
          probe.style.cssText = '';
          probe.style.setProperty(prop, val);
          if (!probe.style.getPropertyValue(prop) && !prop.startsWith('--'))
            res.push('inline ' + el.tagName.toLowerCase() + '.' + el.className.toString().slice(0,24) + ' → ' + prop + ': ' + val);
        });
      });
      // 2. reguły w arkuszach
      for (const sh of document.styleSheets) {
        let rules; try { rules = sh.cssRules; } catch (e) { continue; }
        const walk = rs => { for (const r of rs) {
          if (r.cssRules) { walk(r.cssRules); continue; }
          if (!r.style) continue;
          for (const prop of r.style) {
            const val = r.style.getPropertyValue(prop);
            probe.style.cssText = ''; probe.style.setProperty(prop, val);
            if (!probe.style.getPropertyValue(prop) && !prop.startsWith('--'))
              res.push('css ' + r.selectorText + ' → ' + prop + ': ' + val);
          }
        }};
        walk(rules);
      }
      return [...new Set(res)];
    });
    if (out.length) { bad += out.length; console.log('✗', pg); out.forEach(x => console.log('   ', x)); }
    await p.close();
  }
  console.log(bad ? `\n${bad} nieważnych deklaracji` : '\nZero odrzuconych deklaracji CSS');
  await b.close();
})();
