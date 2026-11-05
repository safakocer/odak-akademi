// Kütüphanesiz SVG radar grafiği (S17): eksen başına 0-100 değer, bir ya da iki seri (önceki: kesik çizgi + boş nokta, şimdiki: dolgu + dolu nokta; renge dayanmaz); stil css/testler.css .radar-*
import { el } from '../core/ui.js';

const NS = 'http://www.w3.org/2000/svg';
// Görünüm kutusu: 360 px ekranda yazılar ~15 px kalacak biçimde ölçülü (etiketler iki satıra bölünür)
const G = 400;
const Y = 360;
const MX = 200;
const MY = 195;
const R = 105;
const ETIKET_R = 126;
const SATIR = 20;
const HALKALAR = [25, 50, 75, 100];

let sayac = 0;

function s(ad, oz = {}, ...cocuklar) {
  const o = document.createElementNS(NS, ad);
  for (const [k, v] of Object.entries(oz)) if (v != null && v !== false) o.setAttribute(k, String(v));
  o.append(...cocuklar.filter((c) => c != null));
  return o;
}

const aci = (i, n) => -Math.PI / 2 + (i * 2 * Math.PI) / n;
const nokta = (i, n, deger, r = R) => {
  const a = aci(i, n);
  const k = (Math.max(0, Math.min(100, deger)) / 100) * r;
  return [MX + Math.cos(a) * k, MY + Math.sin(a) * k];
};
const yol = (noktalar) => noktalar.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');

// Etiket bloğu: eksen adı (1-2 satır) + değer satırı; konum açıya göre (üst, alt, yanlar)
function etiket(i, n, satirlar, deger) {
  const a = aci(i, n);
  const cx = Math.cos(a);
  const cy = Math.sin(a);
  const x = MX + cx * ETIKET_R;
  const y = MY + cy * ETIKET_R;
  const hiza = cx > 0.3 ? 'start' : cx < -0.3 ? 'end' : 'middle';
  const tum = [...satirlar.map((m) => ({ m, sinif: 'radar__etiket' })), { m: deger, sinif: 'radar__deger' }];
  let ilkY;
  if (cy < -0.6) ilkY = y - (tum.length - 1) * SATIR;   // üstte: blok yukarı doğru
  else if (cy > 0.6) ilkY = y + SATIR * 0.8;            // altta: blok aşağı doğru
  else ilkY = y - ((tum.length - 1) * SATIR) / 2 + 6;   // yanlarda: ortalı
  return s('text', { x: x.toFixed(1), 'text-anchor': hiza, 'aria-hidden': 'true' },
    ...tum.map((t, j) => s('tspan', { x: x.toFixed(1), y: (ilkY + j * SATIR).toFixed(1), class: t.sinif }, t.m)));
}

/**
 * Radar grafiği. eksenler: [{ ad, etiket, satirlar? }], seriler: en çok 2 [{ etiket, degerler: { [ad]: 0-100 | null } }]
 * (son seri “şimdiki”, öncekisi “önceki” çizilir). baslik: ekran okuyucu başlığı. Ölçülmeyen eksen 0'da çizilir, etiketinde “—” yazar.
 * Döner: <figure class="radar"> (svg + lejant). Sayısal ayrıntı için sayfada ayrıca tablo verilmeli.
 */
export function radarOlustur({ eksenler, seriler, baslik = 'Profil radarı', aciklama = '' }) {
  const n = eksenler.length;
  const id = `radar-${++sayac}`;
  const liste = seriler.slice(-2);
  const simdiki = liste.at(-1);
  const onceki = liste.length > 1 ? liste[0] : null;
  const deger = (seri, ad) => (typeof seri?.degerler?.[ad] === 'number' ? seri.degerler[ad] : null);

  const izgara = s('g', { class: 'radar__izgara', 'aria-hidden': 'true' },
    ...HALKALAR.map((h) => s('polygon', { class: 'radar__halka', points: yol(eksenler.map((_, i) => nokta(i, n, h))) })),
    ...eksenler.map((_, i) => { const [x, y] = nokta(i, n, 100); return s('line', { class: 'radar__eksen', x1: MX, y1: MY, x2: x.toFixed(1), y2: y.toFixed(1) }); }),
    s('text', { class: 'radar__olcek', x: MX + 4, y: (MY - R / 2 + 4).toFixed(1) }, '50'),
    s('text', { class: 'radar__olcek', x: MX + 4, y: (MY - R + 14).toFixed(1) }, '100'));

  const seriCiz = (seri, tur) => {
    const pts = eksenler.map((e, i) => nokta(i, n, deger(seri, e.ad) ?? 0));
    return s('g', { class: `radar__seri radar__seri--${tur}`, 'aria-hidden': 'true' },
      s('polygon', { class: 'radar__alan', points: yol(pts) }),
      ...pts.map(([x, y]) => (tur === 'onceki'
        ? s('rect', { class: 'radar__nokta', x: (x - 4).toFixed(1), y: (y - 4).toFixed(1), width: 8, height: 8 })
        : s('circle', { class: 'radar__nokta', cx: x.toFixed(1), cy: y.toFixed(1), r: 5.5 }))));
  };

  const degerMetni = (ad) => {
    const b = deger(simdiki, ad);
    const o = onceki ? deger(onceki, ad) : null;
    if (onceki) return `${o ?? '—'} → ${b ?? '—'}`;
    return b === null ? '—' : String(b);
  };
  const ozet = eksenler.map((e) => {
    const b = deger(simdiki, e.ad);
    const o = onceki ? deger(onceki, e.ad) : null;
    return `${e.etiket}: ${onceki ? `${onceki.etiket} ${o ?? 'ölçülmedi'}, ${simdiki.etiket} ${b ?? 'ölçülmedi'}` : (b ?? 'ölçülmedi')}`;
  }).join('; ');

  const grafik = s('svg', { class: 'radar__svg', viewBox: `0 0 ${G} ${Y}`, role: 'img', 'aria-labelledby': `${id}-b ${id}-a`, focusable: 'false' },
    s('title', { id: `${id}-b` }, baslik),
    s('desc', { id: `${id}-a` }, `${aciklama ? `${aciklama} ` : ''}100 üzerinden değerler. ${ozet}.`),
    izgara,
    onceki ? seriCiz(onceki, 'onceki') : null,
    seriCiz(simdiki, 'simdiki'),
    s('g', { class: 'radar__etiketler' }, ...eksenler.map((e, i) => etiket(i, n, e.satirlar ?? [e.etiket], degerMetni(e.ad)))));

  const lejant = el('ul', { sinif: 'radar__lejant', 'aria-hidden': 'true' },
    onceki ? el('li', {}, el('span', { sinif: 'radar__ornek radar__ornek--onceki' }), onceki.etiket) : null,
    el('li', {}, el('span', { sinif: 'radar__ornek radar__ornek--simdiki' }), simdiki.etiket));

  return el('figure', { sinif: 'radar', 'data-seri': String(liste.length) }, grafik, lejant);
}
