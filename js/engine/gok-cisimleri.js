// Çocuk görünümünde gökteki güneş ve ay (S33; S33-d: açık/koyu temada da, sabit yerde): dinamik temada güneş sağdan doğup soldan batar (gün içindeki orana göre), gece ay her saat soldan doğup sağdan batar, evresi gerçek tarihe göre; doğuş/batışta sıcak gök. Yalnız transform/opacity; renkler cocuk.css (.gok*)
// Açık temada güneş, koyu temada ay yayın sağ yanında sabit durur (eski gökyüzü ışığının tarafı); ay evresi orada da gerçek tarihe göre.
// Katman sabittir (fixed): yayın tepesi ana sayfadaki “Merhaba” başlığının hemen üstündedir, öbür sayfalarda da aynı yerde durur. Konum dakikada bir güncellenir; arada 60 sn’lik doğrusal geçişle kayar (hareketi azaltta dakikalık atlamalar).
import { svg } from './algi.js';
import { cocukGorunumuMu } from '../core/hesap.js';
import { dinamikTemaMi, dinamikTemaDenetle, degisinceHaberVer } from '../core/a11y.js';
import { dinle, OLAYLAR } from '../core/store.js';
import { gunDurumu, ayEvresi, denemeSaati, evreAdi, saatMetni } from '../core/gun-isigi.js';

export const GOK = Object.freeze({
  guncelleMs: 60000,
  yayOran: 0.14, yayY: [48, 150], // yay yüksekliği (uçlar tepenin bu kadar altında) = pencere yüksekliği × oran
  bosluk: 4, // tepede cismin alt kenarı başlığın bu kadar üstünde
  gunesBelir: 0.04, ayBelir: 0.1, // yolun başında ve sonunda yavaşça belirme/kaybolma payı (oran)
  ayR: 30, // ay çiziminin yarıçapı (viewBox -50 -50 100 100)
  sabitOran: { gunes: 0.18, ay: 0.82 }, // S33-d: açık/koyu temada yaydaki sabit yer (ikisi de sağ yanda)
});

const kok = document.documentElement;
let katman = null;
let gunes = null;
let ay = null;
let ayIsik = null;
let ayKirp = null;
let sonEvre = null;
let son = null; // son çizim: {gunduz, oran, w, h, tepe}
let baslikUst = null; // “Merhaba” başlığının sayfa başındaki üst kenarı (px); ana sayfa görünürken ölçülür
let baslatildi = false;
let bekleyen = 0;

const sinirla = (n, a, b) => Math.min(b, Math.max(a, n));
const px = (n) => `${Math.round(n)}px`;

// Güneş: hale, kısa yuvarlak ışınlar, iki tonlu yuvarlak yüz
function gunesCiz() {
  const isinlar = Array.from({ length: 12 }, (_, i) => {
    const a = (i * Math.PI) / 6;
    const [ic, dis] = [33, i % 2 ? 40 : 44];
    return `M${(Math.cos(a) * ic).toFixed(1)} ${(Math.sin(a) * ic).toFixed(1)}L${(Math.cos(a) * dis).toFixed(1)} ${(Math.sin(a) * dis).toFixed(1)}`;
  }).join('');
  return svg('svg', { class: 'gok__cizim', viewBox: '-50 -50 100 100', 'aria-hidden': 'true', focusable: 'false' },
    svg('circle', { r: 49, class: 'gok__gunes-hale' }),
    svg('path', { d: isinlar, class: 'gok__gunes-isin' }),
    svg('circle', { r: 27, class: 'gok__gunes-yuz' }),
    svg('circle', { cx: -5, cy: -5, r: 19, class: 'gok__gunes-ic' }));
}

// Ay: hale, karanlık yüz (yeni ayda da soluk görünür), aydınlık kısım (evreye göre), kraterler yalnız aydınlık kısımda, ince kontur
function ayCiz() {
  const R = GOK.ayR;
  ayIsik = svg('path', { class: 'gok__ay-isik', d: '' });
  ayKirp = svg('path', { d: '' });
  return svg('svg', { class: 'gok__cizim', viewBox: '-50 -50 100 100', 'aria-hidden': 'true', focusable: 'false' },
    svg('defs', {}, svg('clipPath', { id: 'gok-ay-kirp' }, ayKirp)),
    svg('circle', { r: 47, class: 'gok__ay-hale' }),
    svg('circle', { r: R, class: 'gok__ay-golge' }),
    ayIsik,
    svg('g', { class: 'gok__ay-kraterler', 'clip-path': 'url(#gok-ay-kirp)' },
      svg('circle', { cx: -9, cy: -10, r: 6 }), svg('circle', { cx: 10, cy: 6, r: 8 }),
      svg('circle', { cx: -6, cy: 14, r: 4 }), svg('circle', { cx: 15, cy: -14, r: 3.5 })),
    svg('circle', { r: R, class: 'gok__ay-kontur' }));
}

/**
 * Evreye göre aydınlık kısmın yolu (kuzey yarım küre: büyürken sağ, küçülürken sol yarı aydınlık).
 * Dış yay aydınlık yarının kenarı; iç yay sınır çizgisi (elips): hilalde aydınlık tarafa, şişkinde karşı tarafa bükülür.
 */
export function evreYolu(evre, R = GOK.ayR) {
  const k = Math.cos(2 * Math.PI * evre); // 1 yeni ay, 0 dördün, -1 dolunay
  const rx = (Math.abs(k) * R).toFixed(2);
  const buyuyen = evre < 0.5;
  const dis = buyuyen ? 1 : 0;
  const ic = buyuyen ? (k > 0 ? 0 : 1) : (k > 0 ? 1 : 0);
  return `M0 ${-R}A${R} ${R} 0 0 ${dis} 0 ${R}A${rx} ${R} 0 0 ${ic} 0 ${-R}Z`;
}

function evreCiz(evre) {
  const yuvarla = Math.round(evre * 200) / 200; // günde birkaç kez değişir; her dakika yeniden yazılmaz
  if (yuvarla === sonEvre) return;
  sonEvre = yuvarla;
  const d = evreYolu(evre);
  ayIsik.setAttribute('d', d);
  ayKirp.setAttribute('d', d);
}

// Katman yalnız çocuk görünümünde vardır (kökte data-gok); bulutların, kuşların ve sahnenin arkasında (z-index -2), ekran okuyucuya gizli
function katmanGetir() {
  if (katman?.isConnected) return katman;
  const parca = (sinif, ...cocuk) => { const d = document.createElement('div'); d.className = sinif; d.append(...cocuk); return d; };
  gunes = parca('gok__cisim gok__cisim--gunes', gunesCiz());
  ay = parca('gok__cisim gok__cisim--ay', ayCiz());
  katman = parca('gok', parca('gok__sicak'), gunes, ay);
  katman.setAttribute('aria-hidden', 'true');
  document.body.prepend(katman);
  sonEvre = null;
  son = null;
  return katman;
}

function kapat() {
  katman?.remove();
  katman = null;
  son = null;
  kok.style.removeProperty('--gok-isik-x');
  kok.style.removeProperty('--gok-isik-y');
}

// Ana sayfa görünürken “Merhaba” başlığının sayfa başındaki yeri ölçülür (sayfa kaydırılmış olsa da: + scrollY)
function baslikOlc() {
  const h = document.getElementById('karsilama-baslik');
  if (h?.getClientRects().length) baslikUst = h.getBoundingClientRect().top + scrollY;
}

// Değerler CSS değişkeni olarak (CSSOM); atla: geçiş olmadan hemen yerine (ilk çizim, ay döngüsü başa sardı, boyut ya da gündüz/gece değişti)
function konumla(oge, x, y, gorunur, atla) {
  if (atla) oge.classList.add('gok__cisim--atla');
  oge.style.setProperty('--gok-x', px(x));
  oge.style.setProperty('--gok-y', px(y));
  oge.style.setProperty('--gok-gorunur', gorunur.toFixed(3));
  if (atla) {
    void oge.offsetWidth; // yeni yer geçişsiz uygulansın
    requestAnimationFrame(() => oge.classList.remove('gok__cisim--atla'));
  }
}

// S33-d: açık/koyu temada güneş ya da ay sabit yerde; sıcak gök yok
function sabitDurum() {
  const gunduz = kok.dataset.gok === 'gunduz';
  return { gunduz, oran: gunduz ? GOK.sabitOran.gunes : GOK.sabitOran.ay, sicak: 0, evre: ayEvresi() };
}

/** Güneşi/ayı ve gökyüzü ışığını yerleştirir (dinamikte saate göre, açık/koyu temada sabit); çocuk görünümü değilse katmanı kaldırır. Döner: çizildi mi */
export function gokGuncelle() {
  if (!cocukGorunumuMu() || !kok.dataset.gok) { kapat(); return false; }
  katmanGetir();
  const d = dinamikTemaMi() ? gunDurumu() : sabitDurum();
  const cisim = d.gunduz ? gunes : ay;
  const w = kok.clientWidth;
  const h = innerHeight;
  const r = (cisim.offsetWidth || 56) / 2;
  baslikOlc();
  const rem = parseFloat(getComputedStyle(kok).fontSize) || 16;
  const ust = document.querySelector('.ust-cubuk')?.offsetHeight ?? 60;
  // Tepe: cisim başlığın hemen üstünde; üst çubuğun altına çok girmesin (telefonda yer dar: başlığın arkasından geçer, yazı önde)
  const tepe = Math.max(ust + r * 0.4, (baslikUst ?? ust + 1.5 * rem) - r - GOK.bosluk);
  const yay = sinirla(h * GOK.yayOran, ...GOK.yayY);
  const o = d.oran;
  const x = d.gunduz ? w - r - (w - 2 * r) * o : r + (w - 2 * r) * o; // güneş sağdan sola, ay soldan sağa
  const y = tepe + yay * (1 - Math.sin(Math.PI * o));
  const pay = d.gunduz ? GOK.gunesBelir : GOK.ayBelir;
  const gorunur = sinirla(Math.min(o, 1 - o) / pay, 0, 1);
  if (!d.gunduz) evreCiz(d.evre);
  const atla = !son || son.gunduz !== d.gunduz || o < son.oran || son.w !== w || son.h !== h || son.tepe !== tepe;
  konumla(cisim, x - r, y - r, gorunur, atla);
  if (atla) katman.classList.add('gok--atla');
  katman.style.setProperty('--gok-sicak', d.sicak.toFixed(3));
  if (atla) { void katman.offsetWidth; requestAnimationFrame(() => katman?.classList.remove('gok--atla')); }
  // Mevcut gökyüzü ışığı (cocuk.css kök arka planındaki radial-gradient) güneşin ya da ayın yerine taşınır
  kok.style.setProperty('--gok-isik-x', px(x));
  kok.style.setProperty('--gok-isik-y', px(y));
  son = { gunduz: d.gunduz, oran: o, w, h, tepe };
  return true;
}

const birAzSonra = () => { cancelAnimationFrame(bekleyen); bekleyen = requestAnimationFrame(gokGuncelle); };

/** app.js bir kez çağırır. Dakikada bir, pencere boyu, sayfa, ayar (tema, görünüm, yazı boyutu) değişince ve sekmeye dönünce yenilenir */
export function gokCisimleriBaslat() {
  if (baslatildi) return;
  baslatildi = true;
  setInterval(gokGuncelle, GOK.guncelleMs);
  addEventListener('resize', birAzSonra);
  degisinceHaberVer(birAzSonra);
  dinle(OLAYLAR.ROTA_DEGISTI, birAzSonra); // ana sayfaya gelince başlık ölçülür
  document.addEventListener('visibilitychange', () => { if (!document.hidden) birAzSonra(); });
  gokGuncelle();
}

/**
 * Geliştirici denemesi (konsolda odakDeneme.saat('19:30'); argümansız gerçek saat): saati kaydırır, temayı ve gökyüzünü hemen yeniler.
 * Döner: {saat, dogus, batis, gunduz, sicak, ayEvresi}
 */
export function gokDeneme(saat) {
  denemeSaati(saat ?? null);
  dinamikTemaDenetle();
  gokGuncelle();
  const d = gunDurumu();
  return {
    saat: saatMetni(d.dakika), dogus: saatMetni(d.dogus), batis: saatMetni(d.batis),
    gunduz: d.gunduz, sicak: Number(d.sicak.toFixed(2)), ayEvresi: `${evreAdi(d.evre)} (${d.evre.toFixed(2)})`,
  };
}
