document.getElementById('rok').textContent = new Date().getFullYear();

const burger = document.querySelector('.burger');
const menu = document.getElementById('menu');
burger.addEventListener('click', () => {
  const otwarte = menu.classList.toggle('otwarte');
  burger.setAttribute('aria-expanded', otwarte);
});
menu.addEventListener('click', e => {
  if (e.target.tagName === 'A') { menu.classList.remove('otwarte'); burger.setAttribute('aria-expanded', false); }
});

const lb = document.getElementById('lightbox');
const lbImg = lb.querySelector('img');
let zdjecia = [], idx = 0, poprzedniFokus = null;

function pokazZdjecie(i){
  idx = (i + zdjecia.length) % zdjecia.length;
  const zrodlo = zdjecia[idx].querySelector('img');
  lbImg.src = zrodlo.currentSrc || zrodlo.src;
  lbImg.alt = zrodlo.alt;
}
function otworz(i){
  poprzedniFokus = document.activeElement;
  pokazZdjecie(i);
  lb.classList.add('otwarty');
  document.body.style.overflow = 'hidden';
  lb.querySelector('.lb-zamknij').focus();
}
function zamknij(){
  lb.classList.remove('otwarty');
  document.body.style.overflow = '';
  if (poprzedniFokus) poprzedniFokus.focus();
}
function podepnijGalerie(){
  zdjecia = [...document.querySelectorAll('.galeria-siatka button')];
  zdjecia.forEach((b,i) => { b.onclick = () => otworz(i); });
}
podepnijGalerie();

lb.querySelector('.lb-zamknij').addEventListener('click', zamknij);
lb.querySelector('.lb-poprz').addEventListener('click', () => pokazZdjecie(idx-1));
lb.querySelector('.lb-nast').addEventListener('click', () => pokazZdjecie(idx+1));
lb.addEventListener('click', e => { if (e.target === lb) zamknij(); });
document.addEventListener('keydown', e => {
  if (!lb.classList.contains('otwarty')) return;
  if (e.key === 'Escape') zamknij();
  if (e.key === 'ArrowRight') pokazZdjecie(idx+1);
  if (e.key === 'ArrowLeft') pokazZdjecie(idx-1);
});
