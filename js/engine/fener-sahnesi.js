// Çocuk görünümünde geniş ekranda sol altta kayalıklar üstünde Fener sahnesi (S32; S32-d: irili ufaklı kayalar, yatay dönen hüzme, kum yok, dokunmatik tablette içerik sağa kayar): gündüz lamba yanar, gece daha parlak ve yavaşça dönen hüzme; renkler ve hareketler css/cocuk.css (.fener-sahnesi*)
// İki yerleşim: “genis” = içerik sütununun solundaki boşluk yeter (içerik değişmez); “dar” = dokunmatik tablette yatay ekran: içerik sütunu sahnenin sağına kayar.
// Ana sayfa balonu (#fener-selam) DOM’da yerinde kalır, CSS ile buraya konumlanır.
import { svg } from './algi.js';
import { cocukGorunumuMu } from '../core/hesap.js';
import { fenerCiz } from './fener.js';

// Ölçüler (px; fener ve balon payı rem ile yazı boyutuna uyar)
export const SAHNE = Object.freeze({
  genislik: [220, 340], // “genis”: sahne sütunu (en az, en çok)
  kenar: 24, // “genis”: sahne ile içerik arasında en az boşluk
  darYalnizDokunmatik: false, // S32-d2: “dar” her ekranda (dizüstü dahil, ≥1000 px); true: yalnız dokunmatik ekranda
  darEnAzGenislik: 1000, // “dar”: pencere en az bu genişlikte (tablet yatay)
  darSutun: [200, 260], darOran: 0.2, // “dar”: sahne sütunu = pencere × oran
  darKenar: 8, // “dar”: sahne ile içerik sütunu arası (sütunun kendi iç boşluğu ayrıca var)
  darIcerikEnAz: 740, // “dar”: içerik sütunu en az
  enAzEkranY: 560, // daha alçak pencerede sahne yok
  kayaOran: 0.42, // kayalık yüksekliği = pencere yüksekliği × oran
  kayaY: [120, 420],
  fenerOran: 0.55, // Fener genişliği = sütun × oran (7-11 rem)
  fenerRem: [7, 11],
  balonRem: 14, // ana sayfa balonu için Fener’in üstünde bırakılan yer
});

// fenerCiz() viewBox: -6 -8 76 72; taban çubuğunun altı y=61, lamba merkezi y=16.5
const FENER_EN_BOY = 72 / 76;
const TABAN_PAYI = 3 / 72; // çizim altındaki boşluk
const LAMBA_ORAN = (64 - 16.5) / 72; // çizim altından lambaya
const KAYA_TEPE = 1 - 20 / 400; // kayalık çiziminde düzlüğün yüksekliği

const kok = document.documentElement;
const DEGISKENLER = ['--sahne-g', '--sahne-kaya-y', '--sahne-fener-g', '--sahne-fener-alt', '--sahne-lamba-x', '--sahne-lamba-alt'];
let sahne = null;
let baslatildi = false;
let bekleyen = 0;

const sinirla = (n, a, b) => Math.min(b, Math.max(a, n));
const yol = (d, sinif) => svg('path', { d, class: sinif, 'vector-effect': 'non-scaling-stroke' });

// Kayalık (sütunun tamamı): basamak basamak girintili çıkıntılı yamaç, çıkıntılarda ve dipte irili ufaklı kayalar; en üstteki düzlükte Fener durur
function kayalikCiz() {
  return svg('svg', { class: 'fener-sahnesi__kaya', viewBox: '0 0 300 400', preserveAspectRatio: 'none', 'aria-hidden': 'true', focusable: 'false' },
    yol('M0 400 0 318 14 300 12 276 30 262 34 236 52 222 50 196 66 182 70 154 84 140 82 112 92 96 90 60 100 40 108 20H192L200 38 212 50 210 80 224 94 222 122 238 136 242 166 258 178 256 206 272 222 276 252 290 266 292 296 300 306V400Z', 'kaya kaya--orta'),
    yol('M192 20 200 38 212 50 210 80 224 94 222 122 238 136 242 166 258 178 256 206 272 222 276 252 290 266 292 296 300 306V400H210L222 340 206 280 214 230 196 180 204 130 188 80 196 50Z', 'kaya kaya--golge kaya--kontursuz'),
    yol('M108 20 100 40 90 60 92 96 82 112 84 140 70 154 66 182 50 196 52 222 34 236 30 262 12 276 14 300 0 318V340L28 312 48 270 64 230 86 186 100 140 106 92 118 52Z', 'kaya kaya--isik kaya--kontursuz'),
    yol('M0 400 0 318 14 300 12 276 30 262 34 236 52 222 50 196 66 182 70 154 84 140 82 112 92 96 90 60 100 40 108 20H192L200 38 212 50 210 80 224 94 222 122 238 136 242 166 258 178 256 206 272 222 276 252 290 266 292 296 300 306', 'kaya__kontur'),
    yol('M140 60 132 96 144 130 134 170M170 110 178 150 166 196 176 240M110 230 98 262 112 300 102 340M160 280 170 320 158 360', 'kaya__cizgi'),
    yol('M18 300 30 284 52 282 62 296 54 312 28 314Z', 'kaya kaya--orta'),
    yol('M60 222 72 206 94 208 100 224 88 238 66 236Z', 'kaya kaya--isik'),
    yol('M74 150 84 138 100 140 104 152 94 162 78 160Z', 'kaya kaya--orta'),
    yol('M214 130 228 120 246 126 248 142 232 150 216 144Z', 'kaya kaya--golge'),
    yol('M236 236 252 222 274 228 278 246 262 258 240 252Z', 'kaya kaya--orta'),
    yol('M150 400 160 368 186 352 214 358 226 380 224 400Z', 'kaya kaya--isik'),
    yol('M232 400 240 376 266 366 290 374 300 392V400Z', 'kaya kaya--golge'),
    yol('M-4 400 4 376 28 366 50 374 58 400Z', 'kaya kaya--golge'),
    yol('M60 400 70 380 96 374 114 388 116 400Z', 'kaya kaya--orta'),
    yol('M104 28 110 18H190L196 28 186 25 178 29 168 24 158 28 148 24 138 29 128 24 118 28Z', 'kaya__yosun'));
}

// Kıyı kayaları: kayalığın sağ altından denize doğru alçalan irili ufaklı kayalar (sabit ölçü; dalgalar önünden geçer)
function kiyiCiz() {
  return svg('svg', { class: 'fener-sahnesi__kiyi', viewBox: '0 0 420 130', 'aria-hidden': 'true', focusable: 'false' },
    yol('M0 130V38L24 30 46 40 70 34 96 48 122 46 140 62 166 60 186 76 212 74 232 92 258 92 278 108 306 110 326 124 340 130Z', 'kaya kaya--orta'),
    yol('M40 130 48 100 74 88 100 96 112 116 108 130Z', 'kaya kaya--golge'),
    yol('M150 130 158 108 182 100 206 108 214 124 212 130Z', 'kaya kaya--isik'),
    yol('M248 130 256 116 276 112 292 120 296 130Z', 'kaya kaya--golge'),
    yol('M362 130 370 116 390 112 402 122 404 130Z', 'kaya kaya--orta'),
    yol('M60 52 56 70 66 86M150 70 146 86 156 98', 'kaya__cizgi'));
}

function sahneOlustur() {
  const kap = document.createElement('div');
  kap.className = 'fener-sahnesi';
  kap.setAttribute('aria-hidden', 'true');
  const parca = (sinif, ...cocuk) => { const d = document.createElement('div'); d.className = sinif; d.append(...cocuk); return d; };
  kap.append(
    parca('fener-sahnesi__huzme'),
    kiyiCiz(),
    kayalikCiz(),
    parca('fener-sahnesi__parilti'),
    parca('fener-sahnesi__fener', fenerCiz('normal')), // ana sayfada balonun Fener’i bunun yerine görünür
  );
  // Gökyüzü katmanından (body’nin ilk çocuğu) sonra, içerikten önce: kuşlar sahnenin arkasından geçer, dalgalar (body::after) önünden
  const ana = document.querySelector('.ana');
  if (ana) ana.before(kap); else document.body.append(kap);
  return kap;
}

const dokunmatikMi = () => matchMedia('(pointer: coarse)').matches;

// Sahne sığıyor mu, sığıyorsa yerleşim ve ölçüler; sığmıyorsa null
function olc() {
  const ana = document.querySelector('.ana');
  if (!ana || innerHeight < SAHNE.enAzEkranY) return null;
  const rem = parseFloat(getComputedStyle(kok).fontSize) || 16;
  const stil = getComputedStyle(ana);
  // İçerik sütununun kendi (kaydırılmamış) sol kenarı: ortalanmış sütun + iç boşluk (“dar” kaydırmadan bağımsız ölçülür)
  const genislik = kok.clientWidth;
  const sutun = Math.min(genislik, parseFloat(stil.maxWidth) || genislik);
  const bosluk = (genislik - sutun) / 2 + (parseFloat(stil.paddingLeft) || 0);
  let mod = null;
  let g = Math.min(SAHNE.genislik[1], bosluk - SAHNE.kenar);
  if (g >= SAHNE.genislik[0]) mod = 'genis';
  else if (genislik >= SAHNE.darEnAzGenislik && (!SAHNE.darYalnizDokunmatik || dokunmatikMi())) {
    g = sinirla(genislik * SAHNE.darOran, ...SAHNE.darSutun);
    if (genislik - g - SAHNE.darKenar >= SAHNE.darIcerikEnAz) mod = 'dar';
  }
  if (!mod) return null;
  const fenerG = Math.min(g * 0.6, sinirla(g * SAHNE.fenerOran, SAHNE.fenerRem[0] * rem, SAHNE.fenerRem[1] * rem));
  const fenerY = fenerG * FENER_EN_BOY;
  const ust = (document.querySelector('.ust-cubuk')?.offsetHeight ?? 60) + rem;
  // Fener + balon üst çubuğun altında kalsın: Fener tabanı en çok bu yükseklikte olabilir
  const tabanEnCok = innerHeight - ust - SAHNE.balonRem * rem - fenerY;
  const kayaY = Math.min(sinirla(innerHeight * SAHNE.kayaOran, ...SAHNE.kayaY), (tabanEnCok + fenerY * TABAN_PAYI) / KAYA_TEPE);
  if (kayaY < SAHNE.kayaY[0]) return null;
  const fenerAlt = kayaY * KAYA_TEPE - fenerY * TABAN_PAYI;
  return { mod, g, kayaY, fenerG, fenerAlt, lambaX: g / 2, lambaAlt: fenerAlt + fenerY * LAMBA_ORAN };
}

function kapat() {
  sahne?.remove();
  sahne = null;
  delete kok.dataset.sahne;
  DEGISKENLER.forEach((d) => kok.style.removeProperty(d));
}

/** Sahneyi gösterir (“genis” ya da “dar”), ölçüleri yeniler ya da kaldırır (görünüm, yazı boyutu, pencere değişince çağrılır) */
export function sahneGuncelle() {
  const o = cocukGorunumuMu() ? olc() : null;
  if (!o) { kapat(); return false; }
  if (!sahne?.isConnected) sahne = sahneOlustur();
  // Değerler CSS değişkeni olarak (CSSOM; satır içi stil özniteliği değil)
  const px = (n) => `${Math.round(n)}px`;
  kok.style.setProperty('--sahne-g', px(o.g));
  kok.style.setProperty('--sahne-kaya-y', px(o.kayaY));
  kok.style.setProperty('--sahne-fener-g', px(o.fenerG));
  kok.style.setProperty('--sahne-fener-alt', px(o.fenerAlt));
  kok.style.setProperty('--sahne-lamba-x', px(o.lambaX));
  kok.style.setProperty('--sahne-lamba-alt', px(o.lambaAlt));
  kok.dataset.sahne = o.mod; // genis | dar
  return true;
}

const birAzSonra = () => { cancelAnimationFrame(bekleyen); bekleyen = requestAnimationFrame(sahneGuncelle); };

/** app.js bir kez çağırır */
export function sahneBaslat() {
  if (baslatildi) return;
  baslatildi = true;
  addEventListener('resize', birAzSonra);
  matchMedia('(pointer: coarse)').addEventListener?.('change', birAzSonra); // tablete klavye/fare takılınca
  // Görünüm ya da yazı boyutu değişince (içerik sütunu rem ile büyür)
  new MutationObserver(birAzSonra).observe(kok, { attributes: true, attributeFilter: ['data-gorunum', 'data-yazi'] });
  sahneGuncelle();
}
