// Kwadrans — wspólny JS podstron
const nav = document.getElementById('nav');
const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 40);
onScroll();
window.addEventListener('scroll', onScroll, { passive: true });

const burger = document.getElementById('burger');
const links = document.getElementById('navLinks');
burger.addEventListener('click', () => links.classList.toggle('open'));
links.querySelectorAll('a').forEach(a => a.addEventListener('click', () => links.classList.remove('open')));

const io = new IntersectionObserver(es => es.forEach(e => {
  if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
}), { threshold: .12 });
document.querySelectorAll('[data-r]').forEach(el => io.observe(el));

// ── liczniki ──
const cio = new IntersectionObserver(es => es.forEach(e => {
  if (!e.isIntersecting) return;
  const el = e.target; cio.unobserve(el);
  const to = parseFloat(el.dataset.count);
  const dec = parseInt(el.dataset.dec || '0', 10);
  const t0 = performance.now(), dur = 1400;
  const tick = now => {
    const k = Math.min((now - t0) / dur, 1);
    const v = to * (1 - Math.pow(1 - k, 3));
    el.textContent = v.toFixed(dec).replace('.', ',');
    if (k < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}), { threshold: .5 });
document.querySelectorAll('[data-count]').forEach(el => cio.observe(el));

// ── własny kursor (desktop) ──
if (matchMedia('(hover:hover)').matches) {
  const cur = document.createElement('div'); cur.id = 'cur';
  const ring = document.createElement('div'); ring.id = 'curR';
  document.body.append(cur, ring);
  let mx = -100, my = -100, rx = -100, ry = -100;
  addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; });
  (function loop(){
    rx += (mx - rx) * .16; ry += (my - ry) * .16;
    cur.style.left = mx + 'px'; cur.style.top = my + 'px';
    ring.style.left = rx + 'px'; ring.style.top = ry + 'px';
    requestAnimationFrame(loop);
  })();
  document.querySelectorAll('a,button,.dish-row,.snap').forEach(el => {
    el.addEventListener('mouseenter', () => document.body.classList.add('cur-hover'));
    el.addEventListener('mouseleave', () => document.body.classList.remove('cur-hover'));
  });
}

// ── magnetyczne przyciski ──
if (matchMedia('(hover:hover)').matches) {
  document.querySelectorAll('.btn').forEach(b => {
    b.addEventListener('mousemove', e => {
      const r = b.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width/2);
      const dy = e.clientY - (r.top + r.height/2);
      b.style.transform = `translate(${dx*.18}px, ${dy*.28}px)`;
    });
    b.addEventListener('mouseleave', () => b.style.transform = '');
  });
}

// ── pasek postępu scrolla ──
const prog = document.getElementById('prog');
if (prog) {
  const upd = () => {
    const h = document.documentElement;
    const max = h.scrollHeight - h.clientHeight;
    prog.style.width = (max > 0 ? (h.scrollTop / max) * 100 : 0) + '%';
  };
  addEventListener('scroll', upd, { passive: true }); upd();
}
