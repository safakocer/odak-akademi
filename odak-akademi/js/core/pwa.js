// PWA: service worker kaydı, yeni sürüm bildirimi, "Ana ekrana ekle" düğmesi, çevrimiçi/çevrimdışı durumu
import { toastGoster } from './ui.js';
import { duyur } from './a11y.js';

const SW_YOLU = './sw.js';
let kurulumIstegi = null;          // beforeinstallprompt olayı (Chrome, Edge, Android)
let bekleyen = null;               // yeni sürümü bekleyen service worker
let yenileniyor = false;
let kurulumHatasi = false;         // ilk kurulum başarısız (ör. kabuk dosyalarından biri eksik)
const durumDinleyicileri = new Set();

/** Uygulama ana ekrandan/uygulama penceresinden mi açıldı? */
export function yukluMu() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

/** iPhone/iPad Safari: kurulum düğmesi yok, menüden eklenir */
export function iosMu() {
  const ua = navigator.userAgent;
  return /iphone|ipad|ipod/i.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1);
}

/** Service worker desteği var mı ve sayfa güvenli adresten (https / localhost) mı açıldı? */
export function pwaDestekleniyorMu() {
  return 'serviceWorker' in navigator && window.isSecureContext;
}

/** Durum: { destek, cevrimdisiHazir, kurulabilir, yuklu, ios, cevrimici, guncellemeVar } */
export function pwaDurumu() {
  return {
    destek: pwaDestekleniyorMu(),
    cevrimdisiHazir: pwaDestekleniyorMu() && !!navigator.serviceWorker.controller,
    kurulumHatasi,
    kurulabilir: !!kurulumIstegi,
    yuklu: yukluMu(),
    ios: iosMu(),
    cevrimici: navigator.onLine,
    guncellemeVar: !!bekleyen,
  };
}

/** Durum değişince çağrılır; dinlemeyi bırakan fonksiyon döner. */
export function pwaDurumunuDinle(fn) {
  durumDinleyicileri.add(fn);
  fn(pwaDurumu());
  return () => durumDinleyicileri.delete(fn);
}

function durumBildir() {
  const d = pwaDurumu();
  durumDinleyicileri.forEach((fn) => { try { fn(d); } catch (h) { console.error('[pwa]', h); } });
}

function bekleyeniIzle(kayit) {
  const isaretle = (sw) => { bekleyen = sw; durumBildir(); };
  const izle = (sw) => sw?.addEventListener('statechange', () => {
    // İlk kurulumda değil, var olan sürümün yerine gelecekse bildir
    if (sw.state === 'installed' && navigator.serviceWorker.controller) isaretle(sw);
    // Kurulum başarısızsa işçi "redundant" olur; çalışan eski sürüm yoksa bu bir hatadır
    if (sw.state === 'redundant' && !navigator.serviceWorker.controller) { kurulumHatasi = true; durumBildir(); }
    if (sw.state === 'activated') { kurulumHatasi = false; durumBildir(); }
  });
  if (kayit.waiting && navigator.serviceWorker.controller) isaretle(kayit.waiting);
  izle(kayit.installing);
  kayit.addEventListener('updatefound', () => izle(kayit.installing));
}

/** Bekleyen yeni sürümü etkinleştirip sayfayı yeniler (yalnızca kullanıcı isteyince çağrılır). */
export function guncellemeyiUygula() {
  if (!bekleyen) return false;
  yenileniyor = true;
  bekleyen.postMessage({ tip: 'BEKLEMEYI_ATLA' });
  return true;
}

/**
 * Uygulama açılışında bir kez çağrılır.
 * guncellemeBandi: yeni sürüm hazır olunca gösterilecek öğe; içindeki [data-guncelle] düğmesi yeniler.
 */
export function pwaBaslat({ guncellemeBandi } = {}) {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); // tarayıcının kendi küçük çubuğu yerine bizim düğmemiz
    kurulumIstegi = e;
    durumBildir();
  });
  window.addEventListener('appinstalled', () => {
    kurulumIstegi = null;
    toastGoster('Odak Akademi ana ekrana eklendi.', { tur: 'basari' });
    durumBildir();
  });
  window.addEventListener('online', () => { toastGoster('İnternet bağlantısı geri geldi.', { tur: 'basari' }); durumBildir(); });
  window.addEventListener('offline', () => {
    toastGoster('İnternet yok. Uygulama çalışmaya devam ediyor.', { tur: 'bilgi', sure: 5000 });
    durumBildir();
  });

  if (guncellemeBandi) {
    pwaDurumunuDinle((d) => {
      const goster = d.guncellemeVar;
      if (goster && guncellemeBandi.hidden) duyur('Uygulamanın yeni sürümü hazır.');
      guncellemeBandi.hidden = !goster;
    });
    guncellemeBandi.querySelector('[data-guncelle]')?.addEventListener('click', guncellemeyiUygula);
  }

  if (!pwaDestekleniyorMu()) {
    if (location.protocol === 'file:') console.info('[pwa] Çevrimdışı mod için uygulamayı yerel sunucuyla (http://localhost) aç.');
    return;
  }

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (yenileniyor) { location.reload(); return; }
    kurulumHatasi = false;
    durumBildir(); // ilk kurulum: artık çevrimdışı hazır
  });

  const kaydet = () => navigator.serviceWorker.register(SW_YOLU)
    .then((kayit) => {
      bekleyeniIzle(kayit);
      // Uzun açık kalan sekmede de güncellemeyi ara (saatte bir)
      setInterval(() => kayit.update().catch(() => {}), 60 * 60 * 1000);
    })
    .catch((h) => {
      console.warn('[pwa] Service worker kaydedilemedi:', h);
      kurulumHatasi = true;
      durumBildir();
    });
  if (document.readyState === 'complete') kaydet();
  else window.addEventListener('load', kaydet, { once: true });
}

/** "Ana ekrana ekle" isteğini açar. Döner: 'kabul' | 'red' | 'yok' */
export async function anaEkranaEkle() {
  if (!kurulumIstegi) return 'yok';
  const istek = kurulumIstegi;
  kurulumIstegi = null;
  istek.prompt();
  const { outcome } = await istek.userChoice.catch(() => ({ outcome: 'dismissed' }));
  durumBildir();
  return outcome === 'accepted' ? 'kabul' : 'red';
}

/**
 * "Ana ekrana ekle" düğmesini bağlar: yalnızca kurulabilir olduğunda görünür.
 * ipucu: iPhone/iPad için menü talimatı gösterilecek öğe (isteğe bağlı).
 */
export function kurulumDugmesiniBagla(dugme, { ipucu } = {}) {
  if (!dugme) return;
  dugme.addEventListener('click', async () => {
    const sonuc = await anaEkranaEkle();
    if (sonuc === 'red') toastGoster('İstediğin zaman buradan ekleyebilirsin.');
  });
  pwaDurumunuDinle((d) => {
    dugme.hidden = !d.kurulabilir || d.yuklu;
    if (ipucu) ipucu.hidden = !(d.ios && !d.yuklu);
  });
}
