// Ses efektlerinin tek kaynağı (S29): dosyasız, Web Audio ile üretilir; profesyonel (sade) ve çocuk (müzikal) paleti aynı tür adlarını kullanır; ses ayarı, ses düzeyi, “egzersizde yalnız geri bildirim” ve ilk dokunuş kuralı burada uygulanır
import { sesAcikMi, sesDuzeyi, yalnizGeriBildirimMi, hareketAzaltilmisMi } from './a11y.js';
import { cocukGorunumuMu } from './hesap.js';

// Nota: [frekans Hz, başlangıç sn, süre sn, dalga ('sine' | 'triangle'), göreli ses 0-1, kayma (bitiş frekansı Hz)?]
// Süre sınırı: her ses ≤1 sn, kutlama sesleri (rekor, seviye, rozet, hedef) ≤1,5 sn. İstisna: zil (S12, öğrencinin kurduğu zamanlayıcı)
const U = 'triangle';
const ZIL = [[784, 0, 0.7], [988, 0.25, 0.9], [784, 1.3, 0.7], [988, 1.55, 1.1]]; // S12: yumuşak, iki kez (iki görünümde aynı)

// Profesyonel: S29 öncesi sesler değişmedi; yeni türler kısa ve sade. Boş dizi = bu görünümde sessiz
const PROFESYONEL = Object.freeze({
  dogru: [[660, 0, 0.12], [880, 0.1, 0.18]],
  yanlis: [[392, 0, 0.18], [349, 0.12, 0.22]],
  henuz: [[392, 0, 0.18], [349, 0.12, 0.22]],
  bitti: [[523, 0, 0.14], [659, 0.12, 0.14], [784, 0.24, 0.28]],
  rekor: [[523, 0, 0.12], [659, 0.1, 0.12], [784, 0.2, 0.12], [1047, 0.3, 0.3]],
  seviye: [[523, 0, 0.12], [784, 0.1, 0.3]],
  rozet: [[659, 0, 0.12], [784, 0.1, 0.12], [988, 0.2, 0.3]],
  hedef: [[523, 0, 0.14], [659, 0.12, 0.14], [784, 0.24, 0.28]],
  tik: [[1000, 0, 0.04]],
  bip: [[740, 0, 0.09]],
  basla: [[988, 0, 0.16]],
  sayfa: [],   // profesyonelde arayüz sesi yok
  pencere: [],
  zil: ZIL,
});

// Çocuk: üçgen dalga ve do majör notaları; en tiz nota 1175 Hz (re6), hepsi yumuşak giriş/çıkışlı
const COCUK = Object.freeze({
  dogru: [[659, 0, 0.1, U], [784, 0.08, 0.1, U], [1047, 0.16, 0.24, U, 0.9]],
  yanlis: [[440, 0, 0.16, U, 0.55], [392, 0.14, 0.3, 'sine', 0.55, 370]], // “hımm”: alçalan, yumuşak
  henuz: [[440, 0, 0.16, U, 0.55], [392, 0.14, 0.3, 'sine', 0.55, 370]],
  bitti: [[523, 0, 0.12, U], [659, 0.1, 0.12, U], [784, 0.2, 0.12, U], [1047, 0.3, 0.35, U, 0.85]],
  rekor: [[392, 0, 0.1, U], [523, 0.1, 0.1, U], [659, 0.2, 0.1, U], [784, 0.3, 0.18, U], [659, 0.48, 0.08, U, 0.8],
    [784, 0.56, 0.4, U], [262, 0.3, 0.66, 'sine', 0.4]],
  seviye: [[523, 0, 0.09, U], [587, 0.08, 0.09, U], [659, 0.16, 0.09, U], [784, 0.24, 0.09, U], [880, 0.32, 0.1, U],
    [1047, 0.42, 0.5, U, 0.85], [659, 0.42, 0.5, 'sine', 0.45], [784, 0.42, 0.5, 'sine', 0.45]],
  rozet: [[659, 0, 0.1, U], [784, 0.08, 0.1, U], [988, 0.16, 0.12, U], [784, 0.3, 0.1, U], [988, 0.38, 0.12, U],
    [1175, 0.5, 0.45, 'sine', 0.7], [523, 0.5, 0.5, 'sine', 0.4]],
  hedef: [[523, 0, 0.14, U], [659, 0.12, 0.14, U], [784, 0.24, 0.4, U], [392, 0.24, 0.4, 'sine', 0.4]],
  tik: [[784, 0, 0.05, U, 0.5, 988]],               // küçük “pıt”
  bip: [[587, 0, 0.1, U, 0.7]],
  basla: [[784, 0, 0.08, U], [1047, 0.07, 0.2, U, 0.85]],
  sayfa: [[392, 0, 0.16, 'sine', 0.45, 659]],        // yumuşak “vuuş”
  pencere: [[523, 0, 0.09, U, 0.55], [784, 0.07, 0.14, U, 0.55]],
  zil: ZIL,
});

// Kategori: geri (bilgi veren geri bildirim) | arayuz | gerisayim. “Egzersizde yalnız geri bildirim” açıkken egzersizde yalnız “geri” çalar
const KATEGORI = Object.freeze({
  dogru: 'geri', yanlis: 'geri', henuz: 'geri', bitti: 'geri', rekor: 'geri', seviye: 'geri', rozet: 'geri', hedef: 'geri', zil: 'geri',
  tik: 'arayuz', sayfa: 'arayuz', pencere: 'arayuz',
  bip: 'gerisayim', basla: 'gerisayim',
});
export const SES_TURLERI = Object.freeze(Object.keys(KATEGORI));

// Ses düzeyi → tepe kazancı (yüksek bile kulağı yormaz; sıkıştırıcı ani tepeleri keser)
export const SES_DUZEYI_KAZANC = Object.freeze({ kisik: 0.05, orta: 0.1, yuksek: 0.16 });
const EN_YUKSEK_HZ = 1400;     // tiz ses yok
const SUZGEC_HZ = 3200;        // üçgen dalganın parlak üst tınısını yumuşatır
const TEKRAR_ARALIGI_MS = 50;  // aynı ses art arda çok hızlı gelirse bir kez çalar
const DOKUNMA_ARALIGI_MS = 120; // başka bir ses yeni çaldıysa dokunma sesi atlanır
const GECIKME_SINIRI_MS = 250; // ilk dokunuşta ses bağlamı geç açılırsa eski ses sonradan çalmasın

let baglam = null;
let ana = null;
let kilitAcik = false;
let sonHerhangi = -Infinity;
const sonCalma = new Map();

function baglamKur() {
  if (baglam) return baglam;
  const Sinif = window.AudioContext || window.webkitAudioContext;
  if (!Sinif) return null;
  try {
    baglam = new Sinif();
    ana = baglam.createGain();
    const suzgec = baglam.createBiquadFilter();
    suzgec.type = 'lowpass';
    suzgec.frequency.value = SUZGEC_HZ;
    const sikistir = baglam.createDynamicsCompressor();
    sikistir.threshold.value = -10;
    sikistir.knee.value = 6;
    sikistir.ratio.value = 4;
    ana.connect(suzgec).connect(sikistir).connect(baglam.destination);
  } catch {
    baglam = null;
    ana = null;
  }
  return baglam;
}

// ---------- İlk dokunuş kuralı: ses bağlamı ancak kullanıcı etkileşiminde açılır ----------
const KILIT_OLAYLARI = ['pointerdown', 'keydown', 'touchend'];
function dinlemeyiBirak() {
  KILIT_OLAYLARI.forEach((o) => window.removeEventListener(o, kilidiAc, true));
}
function dinlemeyeBasla() {
  KILIT_OLAYLARI.forEach((o) => window.addEventListener(o, kilidiAc, { capture: true, passive: true }));
}
function kilidiAc() {
  kilitAcik = true;
  const b = baglamKur();
  if (!b || b.state === 'running') { dinlemeyiBirak(); return; }
  b.resume().then(() => { if (b.state === 'running') dinlemeyiBirak(); }).catch(() => {});
}
dinlemeyeBasla();
// Telefon ses bağlamını askıya alabilir (arama, arka plan): sayfaya dönünce bir sonraki dokunuşta yeniden açılır
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && baglam && baglam.state !== 'running') dinlemeyeBasla();
});

function notalariCal(b, notalar) {
  const kazanc = SES_DUZEYI_KAZANC[sesDuzeyi()] ?? SES_DUZEYI_KAZANC.orta;
  const t0 = b.currentTime + 0.01;
  for (const [frekans, bas, sure, dalga = 'sine', goreli = 1, kayma] of notalar) {
    const osilator = b.createOscillator();
    const zarf = b.createGain();
    const t = t0 + bas;
    osilator.type = dalga;
    osilator.frequency.setValueAtTime(Math.min(frekans, EN_YUKSEK_HZ), t);
    if (kayma) osilator.frequency.exponentialRampToValueAtTime(Math.min(kayma, EN_YUKSEK_HZ), t + sure);
    // Tıkırtı olmasın diye yumuşak giriş ve çıkış
    zarf.gain.setValueAtTime(0.0001, t);
    zarf.gain.exponentialRampToValueAtTime(Math.max(0.0002, kazanc * goreli), t + Math.min(0.02, sure / 3));
    zarf.gain.exponentialRampToValueAtTime(0.0001, t + sure);
    osilator.connect(zarf).connect(ana);
    osilator.start(t);
    osilator.stop(t + sure + 0.03);
  }
}

/**
 * Efekti çalar. Tür adları SES_TURLERI'nde; iki görünümde aynıdır, palet görünüme göre seçilir.
 * Çalmaz (sessizce geçer): ses kapalı; tür bilinmiyor ya da bu görünümde sessiz; hareketi azaltta “sayfa”;
 * “egzersizde yalnız geri bildirim” açıkken egzersizde geri bildirim dışı sesler; ilk dokunuştan önce.
 * { zorla: true } ayarlara bakmaz (“Sesi dene”, S12: öğrencinin kurduğu zamanlayıcı zili).
 * Döner: false yalnız tarayıcı ses çalamıyorsa ya da hata olduysa; atlanan sesler de false döner.
 */
export function sesCal(tur = 'tik', { zorla = false } = {}) {
  try {
    const kategori = KATEGORI[tur];
    if (!kategori) return false;
    if (!zorla) {
      if (!sesAcikMi()) return false;
      if (tur === 'sayfa' && hareketAzaltilmisMi()) return false;
      if (kategori !== 'geri' && yalnizGeriBildirimMi() && document.documentElement.classList.contains('egz-acik')) return false;
    }
    const notalar = (cocukGorunumuMu() ? COCUK : PROFESYONEL)[tur];
    if (!notalar?.length || !kilitAcik) return false;
    const b = baglamKur();
    if (!b || !ana) return false;
    const simdi = performance.now();
    if (simdi - (sonCalma.get(tur) ?? -Infinity) < TEKRAR_ARALIGI_MS) return true;
    sonCalma.set(tur, simdi);
    sonHerhangi = simdi;
    if (b.state === 'running') {
      notalariCal(b, notalar);
    } else {
      // Bağlam yeni açılıyorsa kısa süre bekle; geç kalırsa ses atlanır (sonradan beklenmedik ses çıkmasın)
      b.resume().then(() => {
        if (b.state === 'running' && performance.now() - simdi < GECIKME_SINIRI_MS) notalariCal(b, notalar);
      }).catch(() => {});
    }
    return true;
  } catch (h) {
    console.warn('[ses] Çalınamadı:', h);
    return false;
  }
}

// ---------- Çocuk görünümü: düğmelere dokunma sesi ----------
// Egzersiz alanı (.egz-alan) kendi geri bildirim sesini verir; bağlantılar sayfa sesini alır; data-sessiz olan öğe ses vermez
const DOKUNMA_SECICI = 'button:not([disabled]), [role="tab"], summary, input[type="checkbox"], input[type="radio"], select';

/** Uygulama açılışında bir kez çağrılır (app.js). Profesyonel görünümde hiçbir şey yapmaz. */
export function dokunmaSesleriniBagla(kok = document) {
  kok.addEventListener('click', (e) => {
    if (!cocukGorunumuMu()) return;
    const hedef = e.target instanceof Element ? e.target.closest(DOKUNMA_SECICI) : null;
    if (!hedef || hedef.closest('.egz-alan, [data-sessiz]')) return;
    const an = performance.now();
    // Tıklamanın kendi işi (pencere açma, doğru sesi, ayar değişikliği) önce çalışsın; o ses çaldıysa dokunma sesi atlanır
    setTimeout(() => { if (sonHerhangi < an - 5 || performance.now() - sonHerhangi > DOKUNMA_ARALIGI_MS) sesCal('tik'); }, 0);
  });
}
