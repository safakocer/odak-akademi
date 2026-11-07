// Fener maskotunun ifadeleri ve konuşma balonu (S28, çocuk görünümü): icons/fener.svg ile aynı karakter algi.svg() ile çizilir; renkler ve hareketler css/cocuk.css (.fener*, .fener-balon*)
// Hareketler (göz kırpma, ışığın yavaşça parlaması, zıplama) "hareketi azalt" açıkken CSS'te durur. Çizim ekran okuyucuya gizlidir; balondaki metin normal metindir.
import { svg } from './algi.js';
import { el } from '../core/ui.js';
import { cocukGorunumuMu } from '../core/hesap.js';

/** İfade adı → açıklama (vitrin ve isteğe bağlı aria-label için) */
export const FENER_IFADELERI = Object.freeze({
  normal: 'Fener gülümsüyor',
  sevinc: 'Fener seviniyor',
  dusunme: 'Fener düşünüyor',
  cesaret: 'Fener göz kırpıp cesaret veriyor',
  mola: 'Fener mola veriyor, uyuyor',
  saskin: 'Fener şaşırdı',
});

const c = (cx, cy, r, sinif) => svg('circle', { cx, cy, r, class: sinif });
const p = (d, sinif) => svg('path', { d, class: sinif });
// Dört köşeli küçük parıltı (x, y merkez; s yarıçap)
const parilti = (x, y, s, sinif) => p(`M${x} ${y - s}Q${x} ${y} ${x + s} ${y}Q${x} ${y} ${x} ${y + s}Q${x} ${y} ${x - s} ${y}Q${x} ${y} ${x} ${y - s}Z`, sinif);

// İfadeden bağımsız gövde (icons/fener.svg ile aynı ölçüler)
function govde() {
  return [
    svg('g', { class: 'fener__huzme' }, p('M32 16.5 3 8v17z'), p('M32 16.5 61 8v17z')),
    p('M21.5 12.5 32 3.5l10.5 9z', 'fener__cati'), c(32, 3.5, 1.8, 'fener__cati'),
    svg('rect', { x: 24, y: 12, width: 16, height: 9, rx: 2, class: 'fener__oda' }),
    c(32, 16.5, 3, 'fener__lamba'),
    svg('rect', { x: 20.5, y: 20.5, width: 23, height: 3.5, rx: 1.75, class: 'fener__koyu' }),
    p('M23.5 24h17l4 33h-25z', 'fener__govde'),
    p('M21.4 41h21.2l.9 7.5H20.5z', 'fener__serit'),
    p('M29 57v-4.5a3 3 0 0 1 6 0V57z', 'fener__koyu'),
  ];
}

// Açık göz: x merkez; bx/by göz bebeğinin kayması (bakış yönü)
function acikGoz(x, { bx = 0.6, by = 0.5, r = 3.2, br = 1.6, sinif = '' } = {}) {
  return svg('g', { class: `fener__goz ${sinif}`.trim() },
    c(x, 30.5, r, 'fener__goz-ak'), c(x + bx, 30.5 + by, br, 'fener__gozbebek'), c(x + bx - 0.55, 30.5 + by - 0.6, 0.5, 'fener__parlak'));
}
// Kapalı göz: yukarı kavis (sevinç) ya da aşağı kavis (uyku)
const kapaliGoz = (x, yukari = true) => p(yukari ? `M${x - 2.5} 31.4q2.5-2.8 5 0` : `M${x - 2.5} 30.2q2.5 2.6 5 0`, 'fener__cizgi');
const yanaklar = (r = 1.5) => [c(25, 35.5, r, 'fener__yanak'), c(39, 35.5, r, 'fener__yanak')];

// Her ifadenin yüzü (gövdeyle birlikte zıplar) ve dış ekleri (yerinde durur)
const IFADE_CIZIMI = {
  normal: () => ({
    yuz: [svg('g', { class: 'fener__gozler fener__gozler--kirp' }, acikGoz(28), acikGoz(36)), ...yanaklar(), p('M29 35.2q3 2.6 6 0', 'fener__cizgi')],
    ek: [],
  }),
  sevinc: () => ({
    yuz: [kapaliGoz(28), kapaliGoz(36), ...yanaklar(1.8),
      p('M28.3 34.4h7.4q-.4 4.4-3.7 4.4t-3.7-4.4z', 'fener__agiz'), p('M30.5 37.7q1.5-1.2 3 0q-1.5 1-3 0z', 'fener__dil')],
    ek: [parilti(11, 34, 3.2, 'fener__parilti'), parilti(53.5, 38, 2.6, 'fener__parilti fener__parilti--2')],
  }),
  dusunme: () => ({
    yuz: [p('M25.3 26.4q2.5-1.7 5-.5', 'fener__kas'), p('M33.7 26.9h4.6', 'fener__kas'),
      svg('g', { class: 'fener__gozler fener__gozler--kirp' }, acikGoz(28, { bx: 0.9, by: -0.9 }), acikGoz(36, { bx: 0.9, by: -0.9 })),
      ...yanaklar(), p('M30 36.3q2-.9 4-.4', 'fener__cizgi')],
    ek: [c(48, 6, 1.4, 'fener__dusunce fener__dusunce--1'), c(53.5, 1.5, 2, 'fener__dusunce fener__dusunce--2'),
      c(60, -3.5, 2.6, 'fener__dusunce fener__dusunce--3')],
  }),
  cesaret: () => ({
    yuz: [p('M25.4 26.7q2.6-1.1 5 0', 'fener__kas'), p('M33.6 26.7q2.6-1.1 5 0', 'fener__kas'),
      acikGoz(28), kapaliGoz(36), ...yanaklar(1.7), p('M28.4 34.6q3.6 3.8 7.2 0', 'fener__cizgi fener__cizgi--kalin')],
    ek: [parilti(52, 29, 3.2, 'fener__parilti fener__parilti--don')],
  }),
  mola: () => ({
    yuz: [kapaliGoz(28, false), kapaliGoz(36, false), ...yanaklar(), c(32, 35.9, 1.1, 'fener__agiz')],
    ek: [p('M45.5 13h3.4l-3.4 3.4h3.4', 'fener__z fener__z--1'), p('M50.5 3.5h4.6l-4.6 4.6h4.6', 'fener__z fener__z--2')],
  }),
  saskin: () => ({
    yuz: [p('M24.8 25.3q3-2 6 0', 'fener__kas'), p('M33.2 25.3q3-2 6 0', 'fener__kas'),
      acikGoz(28, { bx: 0, by: 0, r: 3.8, br: 1.3 }), acikGoz(36, { bx: 0, by: 0, r: 3.8, br: 1.3 }),
      svg('ellipse', { cx: 32, cy: 36.4, rx: 1.5, ry: 2, class: 'fener__agiz' })],
    ek: [p('M18.5 6.5 15.5 4M45.5 6.5l3-2.5M32 -2v-3.5', 'fener__saskin')],
  }),
};

/**
 * Fener çizimi (<svg>). ifade: FENER_IFADELERI anahtarı (bilinmeyen → normal).
 * etiket verilirse role="img" + aria-label; verilmezse ekran okuyucuya gizli. hareket:false → animasyonsuz.
 */
export function fenerCiz(ifade = 'normal', { etiket, hareket = true, sinif = '' } = {}) {
  const ad = IFADE_CIZIMI[ifade] ? ifade : 'normal';
  const { yuz, ek } = IFADE_CIZIMI[ad]();
  return svg('svg', {
    viewBox: '-6 -8 76 72',
    class: `fener fener--${ad}${hareket ? '' : ' fener--durgun'}${sinif ? ` ${sinif}` : ''}`,
    role: etiket ? 'img' : null,
    'aria-label': etiket ?? null,
    'aria-hidden': etiket ? null : 'true',
    focusable: 'false',
  },
  svg('rect', { x: 14, y: 56.5, width: 36, height: 4.5, rx: 2.25, class: 'fener__koyu' }),
  svg('g', { class: 'fener__beden' }, ...govde(), ...yuz),
  ...ek);
}

/**
 * Konuşma balonu: Fener + kısa mesaj. Metin ekran okuyucuda normal okunur, çizim okunmaz.
 * Döner: <div class="fener-balon">
 */
export function fenerBalonu({ ifade = 'normal', mesaj, baslik, sinif = '', hareket = true } = {}) {
  return el('div', { sinif: `fener-balon ${sinif}`.trim(), 'data-ifade': ifade },
    el('span', { sinif: 'fener-balon__fener' }, fenerCiz(ifade, { hareket })),
    el('div', { sinif: 'fener-balon__balon' },
      baslik && el('p', { sinif: 'fener-balon__baslik', metin: baslik }),
      el('p', { sinif: 'fener-balon__metin', metin: mesaj })));
}

/**
 * Boş durum öğesi: profesyonel görünümde bugünkü <p class="bos-durum">, çocuk görünümünde aynı metinle Fener balonu.
 * Metin iki görünümde de aynıdır (ekran okuyucu aynı şeyi okur).
 */
export function bosDurum(metin, { ifade = 'dusunme' } = {}) {
  if (!cocukGorunumuMu()) return el('p', { sinif: 'bos-durum', metin });
  return fenerBalonu({ ifade, mesaj: metin, sinif: 'fener-balon--bos' });
}

// Ana sayfa mesajları: kısa, “henüz / bir sonraki hedef” dili; karşılaştırma yok, süre baskısı yok
const BASLANGIC_MESAJLARI = Object.freeze([
  'Bugün hangi alanı deneyelim? Kısa bir çalışma yeter.',
  'Henüz başlamadık. Birkaç dakikalık bir tur güzel bir başlangıç olur.',
  'Bir sonraki hedefin: bugünün ilk turunu tamamlamak.',
  'Merak ettiğin bir egzersizi seç; ben buradayım.',
]);

/**
 * Ana sayfa balonunun ifadesi ve mesajı. durum: motivasyon.bugunDurumu() çıktısı (profil yoksa null).
 * Aynı gün aynı durumda aynı mesaj gelir (sayfa her yenilendiğinde değişip dikkat dağıtmasın).
 */
export function anaSayfaMesaji({ profil, durum, gun = new Date() } = {}) {
  if (!profil) return { ifade: 'normal', mesaj: 'Merhaba, ben Fener! Bir profil oluşturunca kısa çalışmalarla başlayabiliriz.' };
  const d = durum ?? { dk: 0, hedefDk: 0 };
  if (d.uzun) return { ifade: 'mola', mesaj: 'Bugün epey çalıştın. Şimdi dinlenme zamanı; yarın yine buradayım.' };
  if (d.hedefTamam) return { ifade: 'sevinc', mesaj: 'Bugünkü hedefin tamam! İstersen dinlen, istersen kısa bir tur daha yap.' };
  if (d.dk > 0) {
    const kalan = Math.max(1, d.hedefDk - d.dk);
    return { ifade: 'cesaret', mesaj: `Güzel gidiyorsun. Hedefe ${kalan} dakika kaldı; kısa bir tur yeter.` };
  }
  return { ifade: 'dusunme', mesaj: BASLANGIC_MESAJLARI[gun.getDate() % BASLANGIC_MESAJLARI.length] };
}
