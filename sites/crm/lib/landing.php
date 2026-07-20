<?php
/**
 * REAKTOR Landing Kreator — deklaratywny renderer landing page'y.
 *
 * Unikalna technika: landing to SPECYFIKACJA JSON (sekcje + motyw), nie pliki.
 * Spec przylatuje przez MCP (landing-api.php, klucz wdrożeniowy), ląduje w bazie
 * i jest renderowany serwerowo pod adresem lp.php?s=<slug> — z wbudowanymi
 * efektami REAKTOR FX (reveal, liczniki, płynne kotwice) i formularzem
 * kontaktowym spiętym prosto z webhookiem CRM (leady wpadają do panelu).
 *
 * Sekcje: hero, features, stats, text, gallery, testimonials, pricing,
 * faq, contact. Motyw: primary/accent/bg/font.
 */

declare(strict_types=1);

function lp_e(?string $s): string
{
    return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8');
}

/** Renderuje pełny dokument HTML z decyzji w spec. */
function landing_render(array $spec, string $webhookUrl): string
{
    $t = $spec['theme'] ?? [];
    $primary = lp_e($t['primary'] ?? '#4f7cff');
    $accent  = lp_e($t['accent'] ?? '#f5b942');
    $bg      = lp_e($t['bg'] ?? '#0e1320');
    $font    = lp_e($t['font'] ?? 'Poppins');
    $title   = lp_e($spec['title'] ?? 'Strona');
    $desc    = lp_e($spec['description'] ?? '');
    $token   = (string)($spec['client_token'] ?? '');

    $html = '';
    foreach (($spec['sections'] ?? []) as $i => $sec) {
        $html .= landing_section((array)$sec, $i, $token !== '');
    }

    $formJs = $token !== '' ? "
document.querySelectorAll('form[data-lp]').forEach(f=>f.addEventListener('submit',async e=>{
  e.preventDefault();const b=f.querySelector('button');b.disabled=true;b.textContent='Wysyłanie…';
  try{const r=await fetch(" . json_encode($webhookUrl . '?token=' . $token) . ",{method:'POST',body:new FormData(f)});
  const d=await r.json();if(d.ok){f.innerHTML='<p class=\"lp-ok\">Dziękujemy! Odezwiemy się wkrótce.</p>';return}}catch{}
  b.disabled=false;b.textContent='Spróbuj ponownie';}));" : '';

    return '<!DOCTYPE html><html lang="pl"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>' . $title . '</title>' . ($desc !== '' ? '<meta name="description" content="' . $desc . '">' : '') . '
<link href="https://fonts.googleapis.com/css2?family=' . rawurlencode($font) . ':wght@400;600;800&display=swap" rel="stylesheet">
<style>
:root{--p:' . $primary . ';--a:' . $accent . ';--bg:' . $bg . ';--tx:#eef1f8;--mut:#9aa4bd;--card:color-mix(in srgb,var(--bg) 84%,white)}
*{margin:0;padding:0;box-sizing:border-box}html{scroll-behavior:smooth}
body{font-family:"' . $font . '",system-ui,sans-serif;background:var(--bg);color:var(--tx);line-height:1.6}
.lp-wrap{width:min(1100px,92%);margin:0 auto}
section{padding:72px 0}
h1{font-size:clamp(2rem,5vw,3.4rem);line-height:1.12;font-weight:800}
h2{font-size:clamp(1.5rem,3vw,2.2rem);margin-bottom:34px;font-weight:800}
.lp-sub{color:var(--mut);font-size:1.12rem;margin:18px 0 30px;max-width:640px}
.lp-btn{display:inline-block;background:var(--p);color:#fff;padding:15px 34px;border-radius:12px;font-weight:700;
 text-decoration:none;border:none;font-size:1.02rem;cursor:pointer;font-family:inherit;transition:transform .15s,filter .15s}
.lp-btn:hover{filter:brightness(1.12);transform:translateY(-2px)}
.lp-hero{min-height:78vh;display:flex;align-items:center;position:relative;overflow:hidden;
 background:radial-gradient(900px 500px at 85% -10%,color-mix(in srgb,var(--p) 34%,transparent),transparent)}
.lp-hero-img{position:absolute;inset:0;background-size:cover;background-position:center;opacity:.16}
.lp-hero .lp-wrap{position:relative}
.lp-kicker{color:var(--a);font-weight:700;letter-spacing:2px;text-transform:uppercase;font-size:.82rem}
.lp-grid{display:grid;gap:22px;grid-template-columns:repeat(auto-fit,minmax(250px,1fr))}
.lp-card{background:var(--card);border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:26px}
.lp-card .ic{font-size:2rem;margin-bottom:12px}
.lp-card h3{margin-bottom:8px;font-size:1.08rem}
.lp-card p{color:var(--mut);font-size:.95rem}
.lp-stats{display:grid;gap:18px;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));text-align:center}
.lp-stat b{font-size:2.4rem;color:var(--a)}
.lp-stat span{display:block;color:var(--mut)}
.lp-cols{display:grid;gap:44px;grid-template-columns:1fr 1fr;align-items:center}
.lp-cols img{width:100%;border-radius:18px}
.lp-gal{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(230px,1fr))}
.lp-gal img{width:100%;height:230px;object-fit:cover;border-radius:14px}
.lp-quote{font-style:italic}
.lp-quote b{display:block;margin-top:12px;color:var(--a);font-style:normal}
.lp-price{display:flex;justify-content:space-between;gap:14px;border-bottom:1px dashed rgba(255,255,255,.14);padding:13px 2px}
.lp-price i{color:var(--mut);font-style:normal;font-size:.88rem;display:block}
.lp-price b{color:var(--a);white-space:nowrap}
details{background:var(--card);border-radius:12px;padding:16px 20px;margin-bottom:10px;border:1px solid rgba(255,255,255,.08)}
summary{cursor:pointer;font-weight:600}
details p{color:var(--mut);margin-top:10px}
.lp-form{display:grid;gap:12px;max-width:520px}
.lp-form input,.lp-form textarea{background:var(--card);border:1px solid rgba(255,255,255,.14);border-radius:11px;
 padding:14px 16px;color:var(--tx);font-family:inherit;font-size:1rem}
.lp-form input:focus,.lp-form textarea:focus{outline:2px solid var(--p)}
.lp-ok{color:var(--a);font-weight:700;font-size:1.1rem}
.lp-contact-info{color:var(--mut);margin-bottom:26px}
.lp-contact-info a{color:var(--a);text-decoration:none}
footer{padding:28px 0;color:var(--mut);font-size:.85rem;text-align:center;border-top:1px solid rgba(255,255,255,.08)}
[data-rv]{opacity:0;transform:translateY(26px);transition:opacity .7s cubic-bezier(.16,1,.3,1),transform .7s cubic-bezier(.16,1,.3,1)}
[data-rv].rv-in{opacity:1;transform:none}
@media(max-width:800px){.lp-cols{grid-template-columns:1fr}section{padding:52px 0}}
@media(prefers-reduced-motion:reduce){[data-rv]{opacity:1!important;transform:none!important}}
</style></head><body>' . $html . '
<footer><div class="lp-wrap">© ' . date('Y') . ' ' . $title . ' · strona: REAKTOR Landing Kreator</div></footer>
<script>
const io=new IntersectionObserver(es=>{for(const e of es){if(!e.isIntersecting)continue;io.unobserve(e.target);
 setTimeout(()=>{e.target.classList.add("rv-in");const c=e.target.dataset.counter;if(c!==undefined){
  const to=+c,t0=performance.now(),el=e.target,suf=el.dataset.suffix||"";const tick=t=>{const p=Math.min(1,(t-t0)/1400);
  el.textContent=new Intl.NumberFormat("pl-PL").format(Math.round(to*(1-Math.pow(1-p,3))))+suf;if(p<1)requestAnimationFrame(tick)};
  requestAnimationFrame(tick)}},+(e.target.dataset.rvDelay||0))}},{threshold:.12});
document.querySelectorAll("[data-rv],[data-counter]").forEach(el=>io.observe(el));' . $formJs . '
</script></body></html>';
}

function landing_section(array $s, int $i, bool $hasForm): string
{
    $h = fn($k) => lp_e((string)($s[$k] ?? ''));
    switch ($s['type'] ?? '') {
        case 'hero':
            return '<section class="lp-hero">'
                . (!empty($s['image']) ? '<div class="lp-hero-img" style="background-image:url(\'' . lp_e($s['image']) . '\')"></div>' : '')
                . '<div class="lp-wrap"><div data-rv>'
                . ($h('kicker') !== '' ? '<div class="lp-kicker">' . $h('kicker') . '</div>' : '')
                . '<h1>' . $h('heading') . '</h1><p class="lp-sub">' . $h('sub') . '</p>'
                . ($h('cta') !== '' ? '<a class="lp-btn" href="' . ($h('cta_href') ?: '#kontakt') . '">' . $h('cta') . '</a>' : '')
                . '</div></div></section>';
        case 'features':
            $cards = '';
            foreach (($s['items'] ?? []) as $j => $it) {
                $cards .= '<div class="lp-card" data-rv data-rv-delay="' . ($j * 110) . '">'
                    . '<div class="ic">' . lp_e((string)($it['icon'] ?? '★')) . '</div>'
                    . '<h3>' . lp_e((string)($it['title'] ?? '')) . '</h3><p>' . lp_e((string)($it['text'] ?? '')) . '</p></div>';
            }
            return '<section><div class="lp-wrap"><h2 data-rv>' . $h('heading') . '</h2><div class="lp-grid">' . $cards . '</div></div></section>';
        case 'stats':
            $st = '';
            foreach (($s['items'] ?? []) as $it) {
                $st .= '<div class="lp-stat" data-rv><b data-counter="' . (int)($it['value'] ?? 0)
                    . '" data-suffix="' . lp_e((string)($it['suffix'] ?? '')) . '">0</b><span>'
                    . lp_e((string)($it['label'] ?? '')) . '</span></div>';
            }
            return '<section><div class="lp-wrap"><div class="lp-stats">' . $st . '</div></div></section>';
        case 'text':
            $img = !empty($s['image']) ? '<img src="' . lp_e($s['image']) . '" alt="" data-rv loading="lazy">' : '';
            $txt = '<div data-rv><h2>' . $h('heading') . '</h2><p class="lp-sub">' . nl2br($h('body')) . '</p></div>';
            $pair = ($s['side'] ?? '') === 'left' ? $img . $txt : $txt . $img;
            return '<section><div class="lp-wrap"><div class="lp-cols">' . $pair . '</div></div></section>';
        case 'gallery':
            $imgs = '';
            foreach (($s['images'] ?? []) as $j => $u) {
                $imgs .= '<img src="' . lp_e((string)$u) . '" alt="" data-rv data-rv-delay="' . ($j * 90) . '" loading="lazy">';
            }
            return '<section><div class="lp-wrap">' . ($h('heading') !== '' ? '<h2 data-rv>' . $h('heading') . '</h2>' : '')
                . '<div class="lp-gal">' . $imgs . '</div></div></section>';
        case 'testimonials':
            $q = '';
            foreach (($s['items'] ?? []) as $j => $it) {
                $q .= '<div class="lp-card lp-quote" data-rv data-rv-delay="' . ($j * 110) . '">„'
                    . lp_e((string)($it['text'] ?? '')) . '”<b>— ' . lp_e((string)($it['name'] ?? '')) . '</b></div>';
            }
            return '<section><div class="lp-wrap"><h2 data-rv>' . ($h('heading') ?: 'Opinie klientów') . '</h2><div class="lp-grid">' . $q . '</div></div></section>';
        case 'pricing':
            $rows = '';
            foreach (($s['items'] ?? []) as $it) {
                $rows .= '<div class="lp-price" data-rv><span>' . lp_e((string)($it['name'] ?? ''))
                    . '<i>' . lp_e((string)($it['desc'] ?? '')) . '</i></span><b>' . lp_e((string)($it['price'] ?? '')) . '</b></div>';
            }
            return '<section><div class="lp-wrap"><h2 data-rv>' . ($h('heading') ?: 'Cennik') . '</h2>' . $rows . '</div></section>';
        case 'faq':
            $f = '';
            foreach (($s['items'] ?? []) as $it) {
                $f .= '<details data-rv><summary>' . lp_e((string)($it['q'] ?? '')) . '</summary><p>'
                    . lp_e((string)($it['a'] ?? '')) . '</p></details>';
            }
            return '<section><div class="lp-wrap"><h2 data-rv>' . ($h('heading') ?: 'Częste pytania') . '</h2>' . $f . '</div></section>';
        case 'contact':
            $info = [];
            if ($h('phone') !== '') {
                $info[] = '☎ <a href="tel:' . $h('phone') . '">' . $h('phone') . '</a>';
            }
            if ($h('email') !== '') {
                $info[] = '✉ <a href="mailto:' . $h('email') . '">' . $h('email') . '</a>';
            }
            if ($h('address') !== '') {
                $info[] = '📍 ' . $h('address');
            }
            $form = $hasForm && !empty($s['form']) ? '<form class="lp-form" data-lp>
                <input type="text" name="_gotcha" style="display:none" tabindex="-1" autocomplete="off">
                <input name="imie" placeholder="Imię i nazwisko" required>
                <input name="telefon" placeholder="Telefon" required>
                <input name="email" type="email" placeholder="E-mail (opcjonalnie)">
                <textarea name="wiadomosc" rows="4" placeholder="W czym możemy pomóc?"></textarea>
                <button class="lp-btn" type="submit">' . ($h('cta') ?: 'Wyślij zapytanie') . '</button></form>' : '';
            return '<section id="kontakt"><div class="lp-wrap"><h2 data-rv>' . ($h('heading') ?: 'Kontakt')
                . '</h2><div class="lp-contact-info" data-rv>' . implode(' &nbsp;·&nbsp; ', $info) . '</div>' . $form . '</div></section>';
    }
    return '';
}
