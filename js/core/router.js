// Hash tabanlı yönlendirici: #/yol/:param adreslerini kayıtlı görünümlere bağlar, geri/ileri tuşlarıyla çalışır (S29: sayfa geçişi sesi)
import { yay, OLAYLAR } from './store.js';
import { sesCal } from './sound.js';

const rotalar = [];
let etkin = null;
let secenekler = { bulunamadi: null, varsayilan: '/', uygulamaAdi: 'Odak Akademi' };
let baslatildi = false;
let ilkGecisBitti = false;

// "/kurs/gun/:no" → düzenli ifade + parametre adları
function kalipDerle(kalip) {
  const adlar = [];
  const govde = kalip.replace(/\/+$/, '').split('/').map((parca) => {
    if (parca.startsWith(':')) { adlar.push(parca.slice(1)); return '([^/]+)'; }
    return parca.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }).join('/');
  return { re: new RegExp(`^${govde}/?$`), adlar };
}

function guvenliCoz(s) {
  try { return decodeURIComponent(s); } catch { return s; }
}

function adresiOku() {
  const ham = location.hash.slice(1) || '/';
  const [yolHam, sorguHam = ''] = ham.split('?');
  return { yol: '/' + yolHam.replace(/^\/+/, ''), sorgu: Object.fromEntries(new URLSearchParams(sorguHam)) };
}

// data-rota="<kalıp>" olan öğelerden yalnızca eşleşeni gösterir
function gorunumleriAyarla(kalip) {
  const gorunumler = [...document.querySelectorAll('[data-rota]')];
  if (!gorunumler.some((g) => g.dataset.rota === kalip)) return;
  gorunumler.forEach((g) => { g.hidden = g.dataset.rota !== kalip; });
}

function isle() {
  const { yol, sorgu } = adresiOku();
  let bulunan = null;
  const parametreler = {};
  for (const r of rotalar) {
    const m = r.re.exec(yol);
    if (m) { bulunan = r; r.adlar.forEach((ad, i) => { parametreler[ad] = guvenliCoz(m[i + 1]); }); break; }
  }
  if (!bulunan) {
    if (secenekler.bulunamadi) secenekler.bulunamadi(yol);
    else git(secenekler.varsayilan, { degistir: true });
    return;
  }
  const rotaDegisti = etkin?.rota !== bulunan;
  if (etkin && rotaDegisti) etkin.rota.gizle?.();
  gorunumleriAyarla(bulunan.kalip);
  etkin = { rota: bulunan, yol, parametreler, sorgu };
  document.title = bulunan.baslik ? `${bulunan.baslik} | ${secenekler.uygulamaAdi}` : secenekler.uygulamaAdi;
  bulunan.goster?.(parametreler, sorgu);
  // İlk açılışta değil, sayfa değişince odağı ana içeriğe taşı (ekran okuyucu için)
  if (rotaDegisti && ilkGecisBitti) {
    document.getElementById('ana-icerik')?.focus({ preventScroll: true });
    window.scrollTo(0, 0);
    sesCal('sayfa'); // S29: hareketi azaltta ve profesyonel görünümde çalmaz (sound.js karar verir)
  }
  ilkGecisBitti = true;
  yay(OLAYLAR.ROTA_DEGISTI, { yol, parametreler: { ...parametreler }, sorgu: { ...sorgu } });
}

// Rota kaydı: goster(parametreler, sorgu) ve gizle() isteğe bağlı
export function rotaEkle(kalip, { baslik = '', goster, gizle } = {}) {
  rotalar.push({ kalip, baslik, goster, gizle, ...kalipDerle(kalip) });
}

// Seçenekler: { bulunamadi(yol), varsayilan, uygulamaAdi }
export function rotaBaslat(ayarlar = {}) {
  secenekler = { ...secenekler, ...ayarlar };
  if (!baslatildi) { window.addEventListener('hashchange', isle); baslatildi = true; }
  isle();
}

// git('/kurs') → #/kurs ; { degistir: true } geçmişe yeni kayıt eklemez
export function git(yol, { degistir = false } = {}) {
  const hedef = '#' + (yol.startsWith('/') ? yol : '/' + yol);
  if (degistir) { history.replaceState(history.state, '', hedef); isle(); }
  else if (location.hash === hedef) isle();
  else location.hash = hedef;
}

export function etkinRota() {
  return etkin ? { yol: etkin.yol, parametreler: { ...etkin.parametreler }, sorgu: { ...etkin.sorgu } } : null;
}
