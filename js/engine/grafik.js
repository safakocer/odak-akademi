// SVG çizgi grafiği (S20; harici kütüphane yok): günlük değerler, en çok 3 seri (renk + çizgi deseni + işaret şekliyle ayrılır), kapsayıcı genişliğine göre çizim, tablo görünümü
import { svg as svgOgesi } from './algi.js';
import { el } from '../core/ui.js';

const YUKSEKLIK = 190;

// SVG öğesi algi.js'ten; nitelikler burada yazılır (sayılar ve kebap adları olduğu gibi kalsın)
function svg(ad, oz = {}) {
  const o = svgOgesi(ad, {});
  for (const [k, v] of Object.entries(oz)) if (v != null) o.setAttribute(k, String(v));
  return o;
}

const sayiMetni = (v) => (Number.isInteger(v) ? String(v) : v.toLocaleString('tr-TR', { maximumFractionDigits: 1 }));

// Y ekseni: yüzdede 0-100 (25'er), diğerlerinde 1-2-5 adımlı yuvarlak üst sınır
function olcek(enBuyuk, yuzde) {
  if (yuzde) return { ust: 100, adim: 25 };
  const max = enBuyuk > 0 ? enBuyuk : 1;
  const ham = max / 4;
  const us = 10 ** Math.floor(Math.log10(ham));
  const f = ham / us;
  const adim = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * us;
  return { ust: Math.ceil(max / adim) * adim, adim };
}

// Yazı boyu (px): --fs-xs ölçüsü; viewBox genişliği piksel genişliğiyle aynı olduğu için yazı küçülmez
function yaziBoyu() {
  const kok = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
  return Math.round(kok * 0.8125);
}

function metin(oz, icerik) {
  const t = svg('text', oz);
  t.textContent = icerik;
  return t;
}

function isaret(i, x, y, r, ipucu) {
  const sinif = `grafik__isaret grafik__isaret--${i}`;
  const s = i === 1
    ? svg('rect', { x: x - r, y: y - r, width: r * 2, height: r * 2, class: sinif })
    : i === 2
      ? svg('path', { d: `M${x} ${y - r * 1.2}L${x + r * 1.15} ${y + r * 0.9}L${x - r * 1.15} ${y + r * 0.9}Z`, class: sinif })
      : svg('circle', { cx: x, cy: y, r, class: sinif });
  const baslik = svg('title', {});
  baslik.textContent = ipucu;
  s.append(baslik);
  return s;
}

function svgCiz({ genislik, etiketler, uzunEtiketler, seriler, yuzde, birim, ozet }) {
  const fs = yaziBoyu();
  const W = Math.max(200, Math.floor(genislik));
  const H = YUKSEKLIK + fs;
  const sol = Math.round(fs * (yuzde ? 3.3 : 3));
  const sag = Math.round(fs * 0.8);
  const ust = Math.round(fs * 0.8);
  const alt = Math.round(fs * 2.2);
  const w = W - sol - sag;
  const ic = H - ust - alt;
  const tum = seriler.flatMap((s) => s.degerler).filter((v) => v != null);
  const { ust: tavan, adim } = olcek(Math.max(0, ...tum), yuzde);
  const n = etiketler.length;
  const x = (i) => sol + (n === 1 ? w / 2 : (i * w) / (n - 1));
  const y = (v) => ust + ic - (Math.min(v, tavan) / tavan) * ic;

  const kok = svg('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H, class: 'grafik__svg', role: 'img', 'aria-label': ozet });
  for (let v = 0; v <= tavan + 1e-9; v += adim) {
    const yy = Math.round(y(v)) + 0.5;
    kok.append(svg('line', { x1: sol, x2: sol + w, y1: yy, y2: yy, class: v === 0 ? 'grafik__taban' : 'grafik__izgara' }),
      metin({ x: sol - fs * 0.4, y: yy, class: 'grafik__eksen', 'text-anchor': 'end', 'dominant-baseline': 'middle' }, yuzde ? `%${sayiMetni(v)}` : sayiMetni(v)));
  }
  // X etiketleri: sığdığı kadar seyrek, en son gün her zaman görünür
  const enUzunEtiket = Math.max(...etiketler.map((e) => e.length));
  const aralik = n > 1 ? Math.max(1, Math.ceil((fs * (0.62 * enUzunEtiket + 1)) / (w / (n - 1)))) : 1;
  etiketler.forEach((e, i) => {
    if ((n - 1 - i) % aralik !== 0) return;
    const son = i === n - 1 && n > 1;
    kok.append(metin({ x: x(i), y: H - fs * 0.5, class: 'grafik__eksen', 'text-anchor': son ? 'end' : 'middle' }, e));
  });
  const r = Math.max(3, fs * 0.3);
  seriler.forEach((s, si) => {
    const noktalar = s.degerler.map((v, i) => (v == null ? null : [x(i), y(v), v, i])).filter(Boolean);
    if (noktalar.length > 1) {
      kok.append(svg('path', { d: noktalar.map(([px, py], j) => `${j ? 'L' : 'M'}${px.toFixed(1)} ${py.toFixed(1)}`).join(''), class: `grafik__cizgi grafik__cizgi--${si}` }));
    }
    noktalar.forEach(([px, py, v, i]) => kok.append(isaret(si, px, py, r, `${s.etiket}, ${uzunEtiketler[i]}: ${yuzde ? `%${sayiMetni(v)}` : `${sayiMetni(v)}${birim ? ` ${birim}` : ''}`}`)));
  });
  return kok;
}

function tabloOlustur({ uzunEtiketler, seriler, yuzde, birim, baslik }) {
  const satirlar = uzunEtiketler.map((e, i) => [e, seriler.map((s) => s.degerler[i])]).filter(([, d]) => d.some((v) => v != null));
  const sutun = (s) => (seriler.length > 1 ? s.etiket : baslik) + (yuzde ? ' (%)' : birim ? ` (${birim})` : '');
  return el('details', { sinif: 'grafik__tablo' },
    el('summary', { metin: 'Değerleri tablo olarak gör' }),
    el('div', { sinif: 'grafik__tablo-kap' }, el('table', {},
      el('thead', {}, el('tr', {}, el('th', { scope: 'col', metin: 'Gün' }), seriler.map((s) => el('th', { scope: 'col', metin: sutun(s) })))),
      el('tbody', {}, satirlar.map(([e, d]) => el('tr', {}, el('th', { scope: 'row', metin: e }),
        d.map((v) => el('td', { metin: v == null ? '—' : sayiMetni(v) }))))))));
}

/**
 * Çizgi grafiği → <figure>. Genişlik kapsayıcıya göre ayarlanır (ResizeObserver; sayfadan çıkınca bırakılır).
 * { baslik, aciklama?, birim?, yuzde?, etiketler [kısa x etiketi], uzunEtiketler [tam tarih], seriler [{ etiket, degerler [sayı|null] }] (≤3), ozet (ekran okuyucu) }
 */
export function cizgiGrafik({ baslik, aciklama, birim = '', yuzde = false, etiketler, uzunEtiketler = etiketler, seriler, ozet = baslik }) {
  const ayar = { etiketler, uzunEtiketler, seriler: seriler.slice(0, 3), yuzde, birim, ozet, baslik };
  const cizim = el('div', { sinif: 'grafik__cizim' });
  const lejant = ayar.seriler.length > 1 && el('ul', { sinif: 'grafik__lejant' }, ayar.seriler.map((s, i) => el('li', {},
    el('span', { sinif: `grafik__ornek grafik__ornek--${i}`, 'aria-hidden': 'true' }), s.etiket)));
  const fig = el('figure', { sinif: 'grafik' },
    el('figcaption', { sinif: 'grafik__baslik' }, el('strong', { metin: baslik }), aciklama && el('span', { metin: aciklama })),
    cizim, lejant, tabloOlustur(ayar));
  let sonGenislik = 0;
  const ciz = (g) => {
    if (!g || Math.abs(g - sonGenislik) < 4) return;
    sonGenislik = g;
    cizim.replaceChildren(svgCiz({ ...ayar, genislik: g }));
  };
  ciz(320); // ilk çizim; sayfaya eklenince gerçek genişliğe göre yeniden çizilir
  if ('ResizeObserver' in window) {
    const izleyici = new ResizeObserver(([g]) => {
      if (!fig.isConnected) { izleyici.disconnect(); return; }
      ciz(Math.floor(g.contentRect.width));
    });
    izleyici.observe(cizim);
  }
  return fig;
}
