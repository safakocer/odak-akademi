// Service worker: uygulama dosyalarını önbelleğe alır, internet yokken uygulamayı açar; SURUM değişince günceller (S26: kapsama göre önbellek adı, sürüm sorgusu, tam kabuk listesi; S27: cocuk.css, hesap.js; S28: renkli ikonlar, Fener, algi.js kabukta; S29: ses katmanı, yeni dosya yok; S30: fener-mesajlari.js kabukta; S31: gokyuzu.js kabukta; S32: fener-sahnesi.js kabukta; S33: gun-isigi.js, gok-cisimleri.js kabukta; S34a: siniflar.js kabukta, sinif-bantlari.json; S34b: sinif2.json, sinif3.json; S34c: sinif4.json, 2-4. sınıf desteleri, kelime-havuzu.js; S34d: yeni dosya yok; S34e-1: yeni dosya yok; S34f: yeni dosya yok; S34-son: yeni dosya yok)
// YAYIN KURALI (S26): Yayındaki herhangi bir dosya değişince SURUM'u artır, yoksa kullanıcılar eski sürümde kalır.
//   1.<küçük>.<yama>-s<oturum>: hata düzeltmesi → yama +1 (1.0.1), yeni özellik → küçük +1, yama 0 (1.1.0).
//   Yeni dosya: açılışta gerekiyorsa ZORUNLU'ya, sonradan yükleniyorsa DOSYALAR'a yaz.

const SURUM = '1.14.0-s34'; // v1.14 (S34-son): ilkokulda göz ve hafıza oyunları sınıfa göre (basamak, tempo, dizi sınırı; 2. sınıfta tek yön, 4. sınıfta yalnız 1-geri), kısa yönerge, görsel örnek ve alıştırma turu; ortaokulda da isteğe bağlı alıştırma turu; rekorlar kademe içinde; flaş kelimeleri sınıfın kelime havuzundan; okuma ekranlarında ilkokul üst hızı (120/150/180); Kütüphane uzunluk filtresi kademeye göre; seviye testinin ilkokul adımlarında örnek ve alıştırma, dikkat adımı sınıf bandıyla.  v1.13 (S34f): v1.13 (S34f): ilkokulda Hafıza Teknikleri (hikâye zinciri, görselleştirme, gruplama) ve Okuma Stratejileri (tahmin, 5N1K, 3. sınıftan ana fikir) kısa ilkokul sürümleriyle, diğer dersler ilkokulda gizli; Haftalık Plan 2-8. sınıf (ailece kullanım dili, 10-15 dk bloklar); aile rehberine ilkokul bölümü; Fener’in mesajları ve ipuçları ilkokulda kısa cümlelerle.  v1.12 (S34e-1): ilkokulda dikkat oyunları sınıfa göre (daha uzun tepki süresi, daha az deneme, en yüksek basamak sınırı; data/sinif-bantlari.json), kısa yönerge, görsel örnek ve kaydedilmeyen alıştırma turu; Renk mi, Kelime mi? 2. sınıfa açıldı (şekil ipucu baştan açık).  1.11.1: 1.11.1 (S34d-d): 4. sınıftaki iki metnin kimliği ortaokul metinleriyle çakışıyordu (ortaokul metni atlanıyordu); kimlik ve ad değişti.  v1.11 (S34d): seviye testi 2-8. sınıf (ilkokulda 3-4 adımlı, 6-8 dakikalık kısa akış, 2-4. sınıf metinleri, okuma hızı ölçeği sınıfa göre), Akıllı Kurs’ta ilkokul bantları (günde 4 ders, 10/15 dk, hız üst sınırı, ilkokula uygun çalışmalar).  v1.10 (S34c): 4. sınıf metinleri (10 metin, 5 soru), 2-4. sınıf kelime desteleri, Tekrar Kartları’nda hazır desteler öğrencinin kademesine göre, kelime havuzunda sınıfa göre kategoriler (ilkokulda kısa, sık kullanılan kelimeler).  1.9.1: Kütüphane’de ilkokul öğrencisine önce kendi sınıfının metinleri, kendi metinleri sınıf filtresinde de görünür, “süzgeç” yerine “filtre” (S34b-d). v1.9 (S34b): 2. ve 3. sınıf metinleri (10’ar metin, 3-5 soru), sınıf dosyasında kelime/soru sınırı, kütüphanede kademeye göre seviye noktaları. 1.8.1: ilkokulda da kademeli hız öğrenci isterse açılır (S34a-d). v1.8 (S34a): 2-8. sınıf altyapısı: sınıf listesi tek kaynakta, 2-4. sınıfta her zaman çocuk görünümü, kartlarda sınıf aralığı ve “daha büyük sınıflar için” ekranı, sınıf bantları (WPM alt sınırı 30, ilkokulda yalnız uygun okuma modları), kursta sınıf değişimi seçeneği. v1.7: çocuk görünümünde dinamik tema (saate göre gündüz/gece), güneş ve ay, doğuş/batışta sıcak gök, gece yıldızlar ayla aynı yönde (S33); 1.7.1: güneş/ay açık/koyu temada sabit yerde, balondaki Fener eski boyunda (S33-d); 1.7.2: ana sayfa balonunda Fener telefonda balonu dolduracak boyda; 1.7.3: açılışta uygulama hazır olana kadar siyah ekran (yanlış tema bir an görünmez)
const ONEK = 'odak-akademi-';
// Aynı alan adında iki kopya (ör. /odak-akademi/ ve /odak-deneme/) birbirinin önbelleğini silmesin diye adda kapsam yolu da var
const KAPSAM = new URL(self.registration.scope).pathname;
const ONBELLEK = `${ONEK}${SURUM}@${KAPSAM}`;

// Kabuk: index.html'in yüklediği her şey ve app.js'in doğrudan içe aktardığı her modül (S26: liste açılış zinciriyle eşitlendi).
// Biri bile eksikse kurulum başarısız sayılır (yarım kurulumla "çevrimdışı hazır" denmesin).
const ZORUNLU = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/tokens.css',
  './css/base.css',
  './css/components.css',
  './css/library.css',
  './css/odak.css',
  './css/lessons.css',
  './css/srs.css',
  './css/testler.css',
  './css/kurs.css',
  './css/ilerleme.css',
  './css/rehber.css',
  './css/veli.css',
  './css/cocuk.css',
  './icons/fener.svg',
  './icons/cocuk-ikonlar.svg', // S28: çocuk görünümünde açılışta okunur
  './js/app.js',
  './js/core/hata-yakala.js',
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
  './js/core/hesap.js',
  './js/core/ikon-seti.js', // S28
  './js/core/gun-isigi.js', // S33: a11y.js içe aktarır
  './js/core/siniflar.js', // S34a: profile.js ve hesap.js içe aktarır
  './js/engine/exercise-frame.js',
  './js/engine/celebrate.js',
  './js/engine/eye-rest.js',
  './js/engine/motivasyon.js',
  './js/engine/fener.js', // S28: app.js içe aktarır
  './js/engine/fener-mesajlari.js', // S30: fener.js ve app.js içe aktarır
  './js/engine/gokyuzu.js', // S31: app.js içe aktarır
  './js/engine/fener-sahnesi.js', // S32: app.js içe aktarır
  './js/engine/gok-cisimleri.js', // S33: app.js içe aktarır
  './js/engine/algi.js', // S28: fener.js içe aktardığı için kabukta (DOSYALAR'dan taşındı)
  './js/modules/katalog.js',
  './js/modules/egzersiz-listesi.js',
  './js/modules/veli/veli-veri.js',
];

// Diğer dosyalar: tek tek eklenir; eksik olan konsola yazılır, diğerleri yine önbelleğe girer
const DOSYALAR = [
  './gizlilik.html',
  './icons/uygulama-ikonu.svg',
  './icons/ikon-180.png',
  './icons/ikon-192.png',
  './icons/ikon-512.png',
  './icons/ikon-maskable-512.png',
  './fonts/atkinson-hyperlegible-next-regular.woff2',
  './fonts/atkinson-hyperlegible-next-bold.woff2',
  './fonts/ofl-atkinson-hyperlegible-next.txt',
  './css/exercise.css',
  './js/engine/reader-engine.js',
  './js/engine/reader-modes.js',
  './js/engine/modes/rehber.js',
  './js/engine/modes/kelime-grubu.js',
  './js/engine/modes/serbest.js',
  './js/engine/modes/rsvp.js',
  './js/engine/reader-panel.js',
  './js/engine/quiz-engine.js',
  './js/engine/text-bank.js',
  './js/engine/text-picker.js',
  './js/engine/flas.js',
  './js/engine/attention-core.js',
  './js/engine/memory-core.js',
  './js/engine/lesson-engine.js',
  './js/engine/srs.js',
  './js/engine/kelime-havuzu.js', // S34c: kelime-listesi.js içe aktarır
  './js/engine/radar.js',
  './js/engine/course-planner.js',
  './js/engine/grafik.js',
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
  './js/modules/rehber/rehber-veri.js',
  './js/modules/rehber/rehber-icerik.js',
  './js/modules/rehber/rehber-sayfasi.js',
  './js/modules/rehber/cornell.js',
  './js/modules/rehber/zihin-haritasi.js',
  './js/modules/rehber/haftalik-plan.js',
  './js/modules/veli/veli-disa.js',
  './js/modules/veli/veli-sayfasi.js',
  './data/texts/sinif2.json', // S34b
  './data/texts/sinif3.json', // S34b
  './data/texts/sinif4.json', // S34c
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
  './data/lessons/tahmin-etme.json',
  './data/lessons/tara-sor-oku.json',
  './data/lessons/ana-fikir.json',
  './data/lessons/cikarim-yapma.json',
  './data/lessons/bes-n-bir-k.json',
  './data/lessons/soru-uretme.json',
  './data/lessons/ozetleme.json',
  './data/lessons/tablo-grafik.json',
  './data/decks/fen-terimleri.json',
  './data/decks/sosyal-kavramlar.json',
  './data/decks/matematik-terimleri.json',
  './data/decks/ingilizce-kelimeler.json',
  './data/decks/sinif2-kelimeler.json', // S34c
  './data/decks/sinif3-kelimeler.json', // S34c
  './data/decks/sinif4-kelimeler.json', // S34c
  './data/decks/sinif5-kelimeler.json',
  './data/decks/sinif6-kelimeler.json',
  './data/decks/sinif7-kelimeler.json',
  './data/decks/sinif8-kelimeler.json',
  './data/tests/seviye-testi.json',
  './data/course-rules.json',
  './data/sinif-bantlari.json', // S34a: açılışta arka planda okunur (okuma ekranları ve kurs bekler)
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
    // Eski sürümler silinir: bu kapsamın eski adları ve S25 öncesi kapsamsız adlar (odak-akademi-0.4.3-s25 gibi)
    const adlar = await caches.keys();
    const eski = (a) => a.startsWith(ONEK) && a !== ONBELLEK && (a.endsWith(`@${KAPSAM}`) || !a.includes('@'));
    await Promise.all(adlar.filter(eski).map((a) => caches.delete(a)));
    await self.clients.claim();
  })());
});

// Sayfa "Şimdi güncelle" deyince yeni sürüm hemen devreye girer; S26: Ayarlar'daki sürüm satırı için SURUM_SOR
self.addEventListener('message', (olay) => {
  if (olay.data?.tip === 'BEKLEMEYI_ATLA') self.skipWaiting();
  if (olay.data?.tip === 'SURUM_SOR') olay.ports[0]?.postMessage({ surum: SURUM });
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
