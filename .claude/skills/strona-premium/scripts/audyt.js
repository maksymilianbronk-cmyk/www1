const { chromium, devices } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = 'http://127.0.0.1:8123';
const PAGES = ['index.html','osrodek.html','rehabilitacja.html','medycyna-estetyczna.html',
  'kosmetologia.html','masaze-orientalne.html','pakiety.html','cennik.html','o-nas.html','kontakt.html'];
const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900, isMobile: false },
  { name: 'tablet',  width: 820,  height: 1180, isMobile: true },
  { name: 'mobile',  width: 390,  height: 844, isMobile: true },
];
const SHOT = process.env.SHOT_DIR || './shots';
fs.mkdirSync(SHOT, { recursive: true });

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium' });
  const report = [];
  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 2, isMobile: vp.isMobile, hasTouch: vp.isMobile,
      userAgent: vp.isMobile ? devices['iPhone 13'].userAgent : undefined,
    });
    for (const p of PAGES) {
      const page = await ctx.newPage();
      await page.route('**/*', r => (/^https?:\/\/(?!127\.0\.0\.1)/.test(r.request().url()) ? r.abort() : r.continue()));
      const errors = [];
      page.on('console', m => {
        // audyt sam blokuje żądania zewnętrzne (route abort) — wynikające z tego
        // ERR_FAILED to artefakt narzędzia, nie błąd strony
        if (m.type() === 'error' && !/Failed to load resource: net::ERR_/.test(m.text()))
          errors.push(m.text().slice(0, 160));
      });
      page.on('pageerror', e => errors.push('JS: ' + e.message.slice(0, 160)));
      const failed = [];
      page.on('requestfailed', r => {
        const u = r.url();
        if (!/fonts\.(googleapis|gstatic)|maps\.google|assets\/img\/.*\.jpg/.test(u)) failed.push(u.slice(0, 120));
      });
      await page.goto(BASE + '/' + p, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(e => errors.push('NAV ' + e.message));
      await page.waitForTimeout(400);
      // rozwiń animacje przewijania
      await page.evaluate(async () => {
        const h = document.body.scrollHeight;
        for (let y = 0; y < h; y += window.innerHeight * 0.8) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 60)); }
        window.scrollTo(0, 0);
      });
      await page.waitForTimeout(500);

      const m = await page.evaluate(() => {
        const doc = document.documentElement;
        const overflow = doc.scrollWidth - doc.clientWidth;
        // elementy wystające poza viewport
        const wide = [];
        document.querySelectorAll('body *').forEach(el => {
          const r = el.getBoundingClientRect();
          if (r.width > 0 && (r.right > doc.clientWidth + 2 || r.left < -2)) {
            const cs = getComputedStyle(el);
            if (cs.position === 'fixed' || cs.visibility === 'hidden' || cs.display === 'none') return;
            wide.push(el.tagName.toLowerCase() + '.' + (el.className.toString().split(' ')[0] || '') +
                      ' [' + Math.round(r.left) + '→' + Math.round(r.right) + ']');
          }
        });
        // małe cele dotykowe
        const small = [];
        const touch = window.matchMedia('(hover: none)').matches || navigator.maxTouchPoints > 0;
        document.querySelectorAll('a, button, input, select, [role="button"], summary').forEach(el => {
          const r = el.getBoundingClientRect();
          if (r.width === 0 || r.height === 0) return;
          const cs = getComputedStyle(el);
          if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') return;
          if (el.closest('.mobile-nav') && !document.body.classList.contains('nav-open')) return;
          // realnym celem jest etykieta obejmująca pole (klik w nią aktywuje kontrolkę)
          const lab = el.closest('label');
          const box = (lab && lab !== el) ? lab.getBoundingClientRect() : r;
          // 40 px to próg dla ekranów dotykowych; przy myszce obowiązuje
          // WCAG 2.5.8 Target Size (Minimum) = 24×24 px
          const min = touch ? 40 : 24;
          if (box.height < min || box.width < min) {
            small.push((el.tagName.toLowerCase()) + '.' + (el.className.toString().split(' ')[0] || '') +
                       ' ' + Math.round(r.width) + '×' + Math.round(r.height) + ' "' +
                       (el.textContent || '').trim().slice(0, 22) + '"');
          }
        });
        // podstawowe SEO
        const seo = {
          title: (document.title || '').length,
          desc: (document.querySelector('meta[name=description]')?.content || '').length,
          h1: document.querySelectorAll('h1').length,
          imgNoAlt: [...document.querySelectorAll('img')].filter(i => !i.alt).length,
          canonical: !!document.querySelector('link[rel=canonical]'),
          jsonld: document.querySelectorAll('script[type="application/ld+json"]').length,
          lang: document.documentElement.lang,
          links: document.querySelectorAll('a[href]').length,
        };
        // najmniejszy font
        let minFont = 99;
        document.querySelectorAll('p, span, li, a, small, div').forEach(el => {
          if (!el.textContent.trim() || el.children.length) return;
          const fs = parseFloat(getComputedStyle(el).fontSize);
          if (fs && fs < minFont) minFont = fs;
        });
        return { overflow, wide: [...new Set(wide)].slice(0, 8), small: [...new Set(small)].slice(0, 8), seo, minFont };
      });

      report.push({ vp: vp.name, page: p, ...m, errors: [...new Set(errors)], failed: [...new Set(failed)] });
      if (['index.html', 'cennik.html', 'kontakt.html', 'rehabilitacja.html'].includes(p)) {
        await page.screenshot({ path: path.join(SHOT, `${vp.name}-${p.replace('.html','')}.png`), fullPage: vp.name === 'desktop' ? false : false });
      }
      await page.close();
    }
    await ctx.close();
  }
  await browser.close();
  fs.writeFileSync(path.join(SHOT, 'report.json'), JSON.stringify(report, null, 1));

  // Podsumowanie
  let issues = 0;
  for (const r of report) {
    const bad = [];
    if (r.overflow > 0) bad.push(`przewijanie poziome +${r.overflow}px → ${r.wide.join(' | ')}`);
    if (r.small.length) bad.push(`małe cele: ${r.small.join(' | ')}`);
    if (r.errors.length) bad.push(`błędy: ${r.errors.join(' | ')}`);
    if (r.failed.length) bad.push(`404: ${r.failed.join(' | ')}`);
    if (r.seo.h1 !== 1) bad.push(`H1=${r.seo.h1}`);
    if (r.seo.imgNoAlt) bad.push(`img bez alt: ${r.seo.imgNoAlt}`);
    if (r.seo.title > 65) bad.push(`title ${r.seo.title} zn.`);
    if (r.seo.desc < 70 || r.seo.desc > 165) bad.push(`description ${r.seo.desc} zn.`);
    if (r.minFont < 12) bad.push(`font ${r.minFont}px`);
    if (bad.length) { issues++; console.log(`✗ [${r.vp}] ${r.page}\n   ${bad.join('\n   ')}`); }
  }
  console.log(issues ? `\n=== ${issues}/${report.length} widoków z uwagami ===` : '\n=== Wszystko czyste ===');
})();
