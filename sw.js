// Service worker: uygulama dosyalarını önbelleğe alır, internet yokken uygulamayı açar; SURUM değişince günceller
// ÖNEMLİ: Yayındaki bir dosyayı her değiştirdiğinde SURUM'u artır (ör. 0.1.1). Yeni dosya eklediğinde DOSYALAR'a da yaz.

const SURUM = '0.3.0-s20'; // v0.3
const ONBELLEK = `odak-akademi-${SURUM}`;

// Kabuk: biri bile eksikse kurulum başarısız sayılır (yarım kurulumla "çevrimdışı hazır" denmesin)
const ZORUNLU = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/tokens.css',
  './css/base.css',
  './css/components.css',
  './js/app.js',
  './js/core/a11y.js',
  './js/core/ui.js',
  './js/core/utils.js',
  './js/core/storage.js',
  './js/core/store.js',
  './js/core/router.js',
  './js/core/profile.js',
  './js/core/metrics.js',
  './js/core/settings.js',
  './js/core/sound.js',
  './js/core/pwa.js',
];

// Diğer dosyalar: tek tek eklenir; eksik olan konsola yazılır, diğerleri yine önbelleğe girer
const DOSYALAR = [
  './icons/fener.svg',
  './icons/uygulama-ikonu.svg',
  './icons/ikon-180.png',
  './icons/ikon-192.png',
  './icons/ikon-512.png',
  './icons/ikon-maskable-512.png',
  './fonts/atkinson-hyperlegible-next-regular.woff2',
  './fonts/atkinson-hyperlegible-next-bold.woff2',
  './css/exercise.css',
  './css/library.css',
  './css/odak.css',
  './css/lessons.css',
  './css/srs.css',
  './css/testler.css',
  './css/kurs.css',
  './css/ilerleme.css',
  './js/engine/exercise-frame.js',
  './js/engine/celebrate.js',
  './js/engine/reader-engine.js',
  './js/engine/reader-modes.js',
  './js/engine/modes/rehber.js',
  './js/engine/modes/kelime-grubu.js',
  './js/engine/modes/serbest.js',
  './js/engine/modes/rsvp.js',
  './js/engine/reader-panel.js',
  './js/engine/eye-rest.js',
  './js/engine/quiz-engine.js',
  './js/engine/text-bank.js',
  './js/engine/text-picker.js',
  './js/engine/flas.js',
  './js/engine/algi.js',
  './js/engine/attention-core.js',
  './js/engine/memory-core.js',
  './js/engine/lesson-engine.js',
  './js/engine/srs.js',
  './js/engine/radar.js',
  './js/engine/course-planner.js',
  './js/engine/motivasyon.js',
  './js/engine/grafik.js',
  './js/modules/katalog.js',
  './js/modules/egzersiz-listesi.js',
  './js/modules/dikkat/hizli-dokun.js',
  './js/modules/dikkat/stroop.js',
  './js/modules/dikkat/git-dur.js',
  './js/modules/dikkat/iptal-testi.js',
  './js/modules/dikkat/surekli-dikkat.js',
  './js/modules/goz/schulte.js',
  './js/modules/goz/nesne-takibi.js',
  './js/modules/goz/satir-ritmi.js',
  './js/modules/goz/periferik-flas.js',
  './js/modules/goz/grup-flasi.js',
  './js/modules/goz/kelime-piramidi.js',
  './js/modules/goz/sekilli-metin.js',
  './js/modules/goz/fark-bul.js',
  './js/modules/goz/gorsel-arama.js',
  './js/modules/goz/simge-esle.js',
  './js/modules/goz/ayna-dondur.js',
  './js/modules/goz/goz-molasi.js',
  './js/modules/hafiza/rakam-dizisi.js',
  './js/modules/hafiza/corsi-bloklari.js',
  './js/modules/hafiza/n-geri.js',
  './js/modules/hafiza/kelime-listesi.js',
  './js/modules/hafiza/eslestirme.js',
  './js/modules/hafiza/teknikler.js',
  './js/modules/hafiza/tekrar.js',
  './js/modules/oku/hizli-oku.js',
  './js/modules/oku/oku-anla.js',
  './js/modules/kutuphane/kutuphane.js',
  './js/modules/kutuphane/metin-formu.js',
  './js/modules/odak/odak-veri.js',
  './js/modules/odak/odak-zamanlayici.js',
  './js/modules/odak/odak-araclari.js',
  './js/modules/odak/nefes.js',
  './js/modules/testler/test-veri.js',
  './js/modules/testler/seviye-testi.js',
  './js/modules/kurs/kurs-veri.js',
  './js/modules/kurs/kurs-sayfasi.js',
  './js/modules/ilerleme/ilerleme-veri.js',
  './js/modules/ilerleme/ilerleme-sayfasi.js',
  './data/texts/sinif5.json',
  './data/texts/sinif6.json',
  './data/texts/sinif7.json',
  './data/texts/sinif8.json',
  './data/kelimeler.json',
  './data/lessons/hikaye-zinciri.json',
  './data/lessons/mekan-yontemi.json',
  './data/lessons/akrostis-kisaltma.json',
  './data/lessons/gorsellestirme.json',
  './data/lessons/anahtar-kelime.json',
  './data/lessons/gruplama.json',
  './data/decks/fen-terimleri.json',
  './data/decks/sosyal-kavramlar.json',
  './data/decks/matematik-terimleri.json',
  './data/decks/ingilizce-kelimeler.json',
  './data/tests/seviye-testi.json',
  './data/course-rules.json',
];

// Geliştirme: bilgisayardaki yerel sunucu ya da aynı ev ağındaki adres (telefondan deneme) → önce ağ denenir, değişiklik hemen görünür
function gelistirmeMi(ad) {
  if (ad === 'localhost' || ad === '127.0.0.1' || ad === '[::1]' || ad.endsWith('.local')) return true;
  if (/^(10|192\.168)\./.test(ad)) return true;
  return /^172\.(1[6-9]|2\d|3[01])\./.test(ad);
}
const GELISTIRME = gelistirmeMi(self.location.hostname);

self.addEventListener('install', (olay) => {
  olay.waitUntil((async () => {
    const onbellek = await caches.open(ONBELLEK);
    const taze = (d) => new Request(d, { cache: 'reload' });
    // Zorunlu kabuk: hata olursa kurulum durur, eski sürüm çalışmaya devam eder
    await onbellek.addAll(ZORUNLU.map(taze));
    const sonuc = await Promise.allSettled(DOSYALAR.map((d) => onbellek.add(taze(d))));
    const eksik = DOSYALAR.filter((_, i) => sonuc[i].status === 'rejected');
    if (eksik.length) console.warn('[sw] Önbelleğe alınamayan dosyalar (adı/yolu kontrol et):', eksik);
  })());
});

self.addEventListener('activate', (olay) => {
  olay.waitUntil((async () => {
    const adlar = await caches.keys();
    await Promise.all(adlar.filter((a) => a.startsWith('odak-akademi-') && a !== ONBELLEK).map((a) => caches.delete(a)));
    await self.clients.claim();
  })());
});

// Sayfa "Şimdi güncelle" deyince yeni sürüm hemen devreye girer
self.addEventListener('message', (olay) => {
  if (olay.data?.tip === 'BEKLEMEYI_ATLA') self.skipWaiting();
});

async function onbellegeYaz(istek, yanit) {
  if (!yanit || !yanit.ok || yanit.type !== 'basic') return;
  const onbellek = await caches.open(ONBELLEK);
  await onbellek.put(istek, yanit.clone());
}

async function onbellektenBul(istek) {
  const onbellek = await caches.open(ONBELLEK);
  return (await onbellek.match(istek, { ignoreSearch: true }))
    ?? (istek.mode === 'navigate' ? onbellek.match('./index.html') : undefined);
}

async function onceOnbellek(istek) {
  const kayitli = await onbellektenBul(istek);
  if (kayitli) return kayitli;
  const yanit = await fetch(istek);
  await onbellegeYaz(istek, yanit);
  return yanit;
}

async function onceAg(istek) {
  try {
    const yanit = await fetch(istek);
    await onbellegeYaz(istek, yanit);
    return yanit;
  } catch (hata) {
    const kayitli = await onbellektenBul(istek);
    if (kayitli) return kayitli;
    throw hata;
  }
}

self.addEventListener('fetch', (olay) => {
  const istek = olay.request;
  if (istek.method !== 'GET' || new URL(istek.url).origin !== self.location.origin) return;
  if (istek.headers.has('range')) return;
  olay.respondWith(
    (GELISTIRME ? onceAg(istek) : onceOnbellek(istek)).catch(async () =>
      (await onbellektenBul(istek)) ?? new Response('Çevrimdışı: bu dosya henüz kaydedilmedi.', {
        status: 503,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      })),
  );
});
