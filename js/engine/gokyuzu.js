// Çocuk görünümünde gökyüzü katmanı (S31; S31-d: yandan yarasa, her kuş kendi yönü ve şeridi, daha sık): gündüz martılar, gece yarasalar üst bantta yavaşça geçer; yalnız transform/opacity, renkler cocuk.css’te
import { cocukGorunumuMu } from '../core/hesap.js';
import { hareketAzaltilmisMi } from '../core/a11y.js';

// Ayar (S31-d): 20-40 sn’de bir 1-4 kuşluk çıkış, aynı anda en çok 5 kuş, ekranı 10-14 sn’de geçer.
// Bant üst üste binmesin diye şeritlere bölünür (şerit ≈ 46 px); her kuş boş bir şerit ve kendi yönünü seçer.
export const GOKYUZU = Object.freeze({
  aralikSn: [20, 40], enCok: 5, suru: [1, 4], sureSn: [10, 14], kanatSn: [1.0, 1.3], aralarMs: [500, 3000], seritPx: 46,
});

const SVG_NS = 'http://www.w3.org/2000/svg';
const kok = document.documentElement;
const canli = new Set();
let katman = null;
let zamanlayici = null;
let baslatildi = false;

const rastgele = (a, b) => a + Math.random() * (b - a);
const sinirla = (n, a, b) => Math.min(b, Math.max(a, n));

// Küçük SVG oluşturucu (renk niteliği yok; sınıflar cocuk.css’te boyanır)
function s(ad, oz = {}, ...cocuklar) {
  const o = document.createElementNS(SVG_NS, ad);
  for (const [k, v] of Object.entries(oz)) o.setAttribute(k, v);
  o.append(...cocuklar);
  return o;
}

// Gece mi? Kullanıcı seçimi önce, “sistem” ise cihazın teması (cocuk.css ile aynı kural)
function koyuMu() {
  const tema = kok.dataset.tema;
  if (tema === 'koyu') return true;
  if (tema === 'acik') return false;
  return matchMedia('(prefers-color-scheme: dark)').matches;
}

/** Kuş çıkabilir mi: çocuk görünümü, hareket serbest, egzersiz kapalı, sekme önde */
export function gokyuzuUygunMu() {
  return cocukGorunumuMu() && !hareketAzaltilmisMi() && !document.hidden && !kok.classList.contains('egz-acik');
}

// Martı (yandan, sağa bakar): kanatlar omuzdan yavaşça iner kalkar
function martiCiz() {
  const kanat = 'M24 21 C22 13 16 7 6 5 C10 11 15 16 18 19 C22 21 27 22 32 22 Z';
  const uc = 'M6 5 C9 7 11 9 13 11.5 L15.5 9 C12.5 6.8 9.5 5.6 6 5 Z';
  return s('svg', { class: 'gokyuzu__cizim', viewBox: '0 0 64 40', 'aria-hidden': 'true', focusable: 'false' },
    s('g', { class: 'marti__kanat marti__kanat--arka' }, s('path', { class: 'marti__kanat-yuz', d: kanat, transform: 'translate(5 -1)' })),
    s('path', { class: 'marti__govde', d: 'M19 22 L10 18.5 L12.5 25.5 Z' }),
    s('ellipse', { class: 'marti__govde', cx: 31, cy: 24, rx: 14, ry: 6.5 }),
    s('circle', { class: 'marti__govde', cx: 44, cy: 19.5, r: 6 }),
    s('path', { class: 'marti__gaga', d: 'M49.2 19.6 L55.5 21.2 L49.2 22.8 Z' }),
    s('circle', { class: 'kus__goz', cx: 46, cy: 18.6, r: 1.4 }),
    s('circle', { class: 'kus__parilti', cx: 46.5, cy: 18.1, r: 0.45 }),
    s('g', { class: 'marti__kanat' }, s('path', { class: 'marti__kanat-yuz', d: kanat }), s('path', { class: 'marti__uc', d: uc })));
}

// Yarasa (yandan, sağa bakar): iri göz, sivri kulak, yanak; kanat martı gibi omuzdan yavaşça iner kalkar
function yarasaCiz() {
  const kanat = 'M35 21 C33 12 25 6 13 5 C16 8 16 11 14 13.5 C18 12.5 20.5 14.5 20.5 17.5 C23.5 15.5 26.5 16.5 27.5 19.5 C29.5 18.5 32 19.5 33 22 Z';
  return s('svg', { class: 'gokyuzu__cizim', viewBox: '0 0 64 40', 'aria-hidden': 'true', focusable: 'false' },
    s('g', { class: 'yarasa__kanat yarasa__kanat--arka' }, s('path', { class: 'yarasa__zar', d: kanat, transform: 'translate(4 -1)' })),
    s('path', { class: 'yarasa__govde', d: 'M22 25 L17 23.5 L19 27 Z' }),
    s('ellipse', { class: 'yarasa__govde', cx: 31, cy: 24.5, rx: 10, ry: 6 }),
    s('path', { class: 'yarasa__govde', d: 'M38.5 17 L38.8 9 L43.5 15.2 Z' }),
    s('path', { class: 'yarasa__kulak-ici', d: 'M39.9 15.5 L40 11.5 L42.2 14.6 Z' }),
    s('circle', { class: 'yarasa__govde', cx: 42, cy: 21, r: 6.3 }),
    s('ellipse', { class: 'yarasa__karin', cx: 31, cy: 26.5, rx: 6, ry: 3 }),
    s('circle', { class: 'yarasa__goz', cx: 43.6, cy: 20, r: 3.1 }),
    s('circle', { class: 'kus__goz', cx: 44.4, cy: 20.4, r: 1.7 }),
    s('circle', { class: 'kus__parilti', cx: 45, cy: 19.6, r: 0.6 }),
    s('circle', { class: 'yarasa__yanak', cx: 45.2, cy: 24.2, r: 1.1 }),
    s('path', { class: 'yarasa__agiz', d: 'M46.2 23 Q47.4 23.9 48.2 22.8' }),
    s('g', { class: 'yarasa__kanat' }, s('path', { class: 'yarasa__zar', d: kanat })));
}

// Katman yalnız çocuk görünümünde vardır; içeriğin arkasında, ekran okuyucuya gizli
function katmanGetir() {
  if (katman?.isConnected) return katman;
  katman = document.createElement('div');
  katman.className = 'gokyuzu';
  katman.setAttribute('aria-hidden', 'true');
  document.body.prepend(katman);
  return katman;
}

function kaldir(kus) {
  clearTimeout(kus._bitis);
  kus.remove();
  canli.delete(kus);
}

/** Uçan kuşları hemen kaldırır; çocuk görünümü değilse katmanı da siler */
export function gokyuzuTemizle() {
  [...canli].forEach(kaldir);
  if (!cocukGorunumuMu()) { katman?.remove(); katman = null; }
}

function kusEkle({ gece, sola, serit, y, sureMs, gecikmeMs, olcek, kanatSn }) {
  const kus = document.createElement('div');
  kus.className = `gokyuzu__kus gokyuzu__kus--${gece ? 'yarasa' : 'marti'}${sola ? ' gokyuzu__kus--sola' : ''}`;
  // Değerler CSS değişkeni olarak (CSSOM; satır içi stil özniteliği değil)
  kus.style.setProperty('--kus-y', `${Math.round(y)}px`);
  kus.style.setProperty('--kus-sure', `${Math.round(sureMs)}ms`);
  kus.style.setProperty('--kus-gecikme', `${Math.round(gecikmeMs)}ms`);
  kus.style.setProperty('--kus-olcek', olcek.toFixed(2));
  kus.style.setProperty('--kus-kanat', `${kanatSn.toFixed(2)}s`);
  const salin = document.createElement('div');
  salin.className = 'gokyuzu__salin';
  salin.append(gece ? yarasaCiz() : martiCiz());
  kus.append(salin);
  kus.addEventListener('animationend', (e) => { if (e.target === kus) kaldir(kus); });
  kus._bitis = setTimeout(() => kaldir(kus), sureMs + gecikmeMs + 1000); // animasyon çalışmazsa da temizlenir
  kus._serit = serit;
  canli.add(kus);
  katman.append(kus);
}

const karistir = (dizi) => {
  for (let i = dizi.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [dizi[i], dizi[j]] = [dizi[j], dizi[i]]; }
  return dizi;
};

/** 1-4 kuş çıkarır (ekranda toplam en çok 5). Her kuş boş bir şerit ve kendi yönünü seçer. Döner: çıktıysa true */
export function gokyuzuDene() {
  if (!gokyuzuUygunMu()) return false;
  const bos = GOKYUZU.enCok - canli.size;
  if (bos <= 0) return false;
  katmanGetir();
  const yukseklik = katman.clientHeight || 240;
  const seritSayisi = Math.max(1, Math.floor((yukseklik - 40) / GOKYUZU.seritPx));
  const dolu = new Set([...canli].map((k) => k._serit));
  const seritler = karistir([...Array(seritSayisi).keys()].filter((n) => !dolu.has(n)));
  const [en, enCok] = GOKYUZU.suru;
  const adet = Math.min(bos, seritler.length, en + Math.floor(Math.random() * (enCok - en + 1)));
  if (!adet) return false;
  const gece = koyuMu();
  let gecikme = 0;
  for (let i = 0; i < adet; i++) {
    const serit = seritler[i];
    kusEkle({
      gece,
      sola: Math.random() < 0.5,
      serit,
      y: sinirla(8 + serit * GOKYUZU.seritPx + rastgele(-6, 6), 4, Math.max(8, yukseklik - 44)),
      sureMs: rastgele(...GOKYUZU.sureSn) * 1000,
      gecikmeMs: gecikme,
      olcek: rastgele(0.75, 1.05),
      kanatSn: rastgele(...GOKYUZU.kanatSn),
    });
    gecikme += rastgele(...GOKYUZU.aralarMs);
  }
  return true;
}

function planla() {
  clearTimeout(zamanlayici);
  zamanlayici = setTimeout(() => { gokyuzuDene(); planla(); }, rastgele(...GOKYUZU.aralikSn) * 1000);
}

/** app.js bir kez çağırır. Koşullar değişince (egzersiz, tema, görünüm, hareket, sekme) uçanlar kaldırılır */
export function gokyuzuBaslat() {
  if (baslatildi) return;
  baslatildi = true;
  new MutationObserver((kayitlar) => {
    // Tema ya da görünüm değişti: gündüz/gece kuşu yanlış kalmasın
    if (kayitlar.some((k) => k.attributeName === 'data-tema' || k.attributeName === 'data-gorunum')) gokyuzuTemizle();
    else if (!gokyuzuUygunMu()) gokyuzuTemizle();
  }).observe(kok, { attributes: true, attributeFilter: ['class', 'data-gorunum', 'data-hareket', 'data-tema'] });
  matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', gokyuzuTemizle);
  matchMedia('(prefers-reduced-motion: reduce)').addEventListener?.('change', () => { if (!gokyuzuUygunMu()) gokyuzuTemizle(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) gokyuzuTemizle(); });
  planla();
}
