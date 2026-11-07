// Uygulamanın giriş noktası: çekirdek modülleri başlatır; ana ekranı, alan ve egzersiz listelerini, kütüphaneyi, odak araçlarını (S12), hafıza tekniklerini (S15), tekrar kartlarını (S16), seviye testini (S17), Akıllı Kurs ve raporunu (S19), İlerleme paneli ve veli raporunu (S20), Çalışma Rehberini (S22), Veli/Öğretmen alanını ve sınıf modunu (S24), yöneticinin verdiği görünümü (S27) ve çocuk görünümünde Fener balonunu (S28), ses katmanını (S29: dokunma sesi, ses düzeyi önizlemesi), ayarlar sayfasını, profil/yedek pencerelerini ve PWA'yı bağlar
import { temaDugmesiBagla, ayarFormuBagla, duyur, degisinceHaberVer } from './core/a11y.js';
import { modalBagla, modalAc, toastGoster, el } from './core/ui.js';
import { depoBaslat, yedekIndir, yedekYukle, kullanimBayt, kaliciMi } from './core/storage.js';
import { dinle, OLAYLAR } from './core/store.js';
import { rotaEkle, rotaBaslat, git, etkinRota } from './core/router.js';
import { profilBaslat, aktifProfil, profilleriGetir, karsilamayiBagla, profilPenceresiniBagla, profilDugmesiniBagla } from './core/profile.js';
import { ozet, kayitEkle, profilKayitlariniSil } from './core/metrics.js';
import { ayarlarBaslat, ayarlariSifirla, tumVeriyiSil } from './core/settings.js';
import { hesapBaslat, gorunumAyarla, hesapBilgisi, cocukGorunumuMu } from './core/hesap.js';
import { sesCal, dokunmaSesleriniBagla } from './core/sound.js';
import { pwaBaslat, kurulumDugmesiniBagla, pwaDurumunuDinle } from './core/pwa.js';
import { boyutMetni } from './core/utils.js';
import { egzersizAc, egzersiziKapat, molaEsiginiAyarla } from './engine/exercise-frame.js';
import { egzersizYukle, aracBilgisi, egzersizBilgisi, modulAraclari } from './modules/katalog.js';
import { modulKartlariniGuncelle, modulSayfasiCiz, egzersizlerSayfasiCiz, egzersizKarti } from './modules/egzersiz-listesi.js';
import { gozMolasiEsiginiAyarla } from './engine/eye-rest.js';
import { seriDurumu, bugunDurumu, bugunlukMesaji, seviyeBilgisi, ilerlemeVerisi, ilerlemeSonuclariniSil } from './engine/motivasyon.js';
import { sinifModuAcikMi, haftalikDurum } from './modules/veli/veli-veri.js';
import { fenerBalonu, anaSayfaMesaji } from './engine/fener.js';

const $ = (secici) => document.querySelector(secici);

// 1) Depo uyarıları (depo başlamadan önce dinlenmeli)
dinle(OLAYLAR.DEPO_HATA, ({ tur, mesaj }) => toastGoster(mesaj, { tur: ['kota', 'sekme'].includes(tur) ? 'uyari' : 'hata', sure: 8000 }));
depoBaslat();
// S27: yöneticinin verdiği görünüm (profesyonel | cocuk) profil ayarlarından önce uygulanır
hesapBaslat();

// 2) Kayıtlı görünüm ayarları hemen uygulanır, değişiklikler profile kaydedilir
ayarlarBaslat();
temaDugmesiBagla($('#tema-dugmesi'));
ayarFormuBagla($('#ayar-formu'));
// S29: çocuk görünümünde düğmelere dokunma sesi; ses düzeyi değişince yeni düzeyde örnek ses
dokunmaSesleriniBagla();
$('#ayar-formu').addEventListener('change', (e) => { if (e.target.name === 'sesDuzeyi') sesCal('dogru'); });

// 3) PWA: çevrimdışı önbellek, yeni sürüm bandı, ana ekrana ekle
pwaBaslat({ guncellemeBandi: $('#guncelleme-bandi') });

// 4) Henüz açılmamış bölümler: düğmeler burada, bağlantılar yönlendiricide
function yakindaUyarisi(ad = 'Bu bölüm') {
  toastGoster(`${ad} çok yakında açılacak.`, { tur: 'bilgi' });
}
document.addEventListener('click', (e) => {
  const oge = e.target.closest('[data-yakinda]');
  if (!oge || oge.matches('a[href^="#/"]')) return;
  e.preventDefault();
  yakindaUyarisi(oge.dataset.yakinda);
});

// 5) Yönlendirici: ana sayfa ve ayarlar; diğer adresler "yakında" der ve geri döner
rotaEkle('/', { baslik: '', goster: () => anaEkraniGuncelle() }); // S20: günlük hedef her açılışta güncel
rotaEkle('/ayarlar', {
  baslik: 'Ayarlar',
  goster: ayarSayfasiniGuncelle,
  gizle: () => silmeOnayiniKapat(false),
});

// D03: Alan sayfası (#/modul/<ad>) ve tüm egzersizler (#/egzersizler); kartlar katalog.js'ten çizilir
rotaEkle('/egzersizler', { baslik: 'Egzersizler', goster: () => egzersizlerSayfasiCiz($('#egzersizler-sayfasi')) });
rotaEkle('/modul/:ad', {
  baslik: 'Çalışma alanı',
  goster: ({ ad }) => {
    const m = modulSayfasiCiz($('#modul-sayfasi'), ad);
    if (!m) { yakindaUyarisi(); git('/', { degistir: true }); return; }
    document.title = `${m.baslik} | Odak Akademi`;
  },
});
modulKartlariniGuncelle();
// K2: ana sayfadaki "Ders çalışırken" kısayolları (kart bilgileri yalnız katalog.js'te); S15: + Hafıza Teknikleri; S16: + Tekrar Kartları
$('#kisayol-kartlari')?.replaceChildren(...[aracBilgisi('odak'), aracBilgisi('teknikler'), aracBilgisi('tekrar'), egzersizBilgisi('goz-molasi')].filter(Boolean).map(egzersizKarti));
// S22: ana sayfadaki "Çalışma Rehberi" bölümü (araç ve bilgi kartları katalog.js'te, modul: rehber)
$('#rehber-kartlari')?.replaceChildren(...modulAraclari('rehber').map(egzersizKarti));

// S07: Kütüphane (#/kutuphane): ana sayfa kartından ve gezinme sekmesinden açılır; sayfa dosyası ilk açılışta yüklenir
const kutuphaneCiz = () => import('./modules/kutuphane/kutuphane.js')
  .then((m) => m.kutuphaneSayfasiCiz($('#kutuphane-sayfasi')))
  .catch((h) => { console.error('[kutuphane]', h); toastGoster('Kütüphane açılamadı. Sayfayı yenileyip yeniden dene.', { tur: 'hata' }); });
rotaEkle('/kutuphane', { baslik: 'Kütüphane', goster: kutuphaneCiz });

// S12: Odak Araçları (#/odak): ana sayfa kartından ve Dikkat alanından açılır; sayfa dosyası ilk açılışta yüklenir
const odakModulu = () => import('./modules/odak/odak-araclari.js');
const odakCiz = () => odakModulu()
  .then((m) => { if (etkinRota()?.yol === '/odak') m.odakSayfasiCiz($('#odak-sayfasi')); })
  .catch((h) => { console.error('[odak]', h); toastGoster('Odak Araçları açılamadı. Sayfayı yenileyip yeniden dene.', { tur: 'hata' }); });
rotaEkle('/odak', {
  baslik: 'Odak Araçları',
  goster: odakCiz,
  gizle: () => odakModulu().then((m) => m.odakSayfasiniKapat()).catch(() => {}),
});

// S15: Hafıza Teknikleri (#/teknikler ders listesi, #/teknikler/<ad> ders); ana sayfa kısayolundan ve Hafıza alanından açılır
const teknikModulu = () => import('./modules/hafiza/teknikler.js');
const teknikCiz = () => teknikModulu()
  .then((m) => {
    const r = etkinRota();
    if (r?.yol === '/teknikler') m.tekniklerSayfasiCiz($('#teknikler-sayfasi'));
    else if (r?.yol.startsWith('/teknikler/')) m.dersSayfasiCiz($('#ders-sayfasi'), r.parametreler.ad);
  })
  .catch((h) => { console.error('[teknikler]', h); toastGoster('Hafıza Teknikleri açılamadı. Sayfayı yenileyip yeniden dene.', { tur: 'hata' }); });
const teknikKapat = () => teknikModulu().then((m) => m.tekniklerSayfasiniKapat()).catch(() => {});
rotaEkle('/teknikler', { baslik: 'Hafıza Teknikleri', goster: teknikCiz, gizle: teknikKapat });
rotaEkle('/teknikler/:ad', { baslik: 'Hafıza dersi', goster: teknikCiz, gizle: teknikKapat });

// S16: Tekrar Kartları (#/tekrar ana sayfa, #/tekrar/<deste> deste); ana sayfa kısayolundan ve Hafıza alanından açılır
const tekrarModulu = () => import('./modules/hafiza/tekrar.js');
const tekrarCiz = () => tekrarModulu()
  .then((m) => {
    const r = etkinRota();
    if (r?.yol === '/tekrar') m.tekrarSayfasiCiz($('#tekrar-sayfasi'));
    else if (r?.yol.startsWith('/tekrar/')) m.desteSayfasiCiz($('#deste-sayfasi'), r.parametreler.deste);
  })
  .catch((h) => { console.error('[tekrar]', h); toastGoster('Tekrar Kartları açılamadı. Sayfayı yenileyip yeniden dene.', { tur: 'hata' }); });
const tekrarKapat = () => tekrarModulu().then((m) => m.tekrarSayfasiniKapat()).catch(() => {});
rotaEkle('/tekrar', { baslik: 'Tekrar Kartları', goster: tekrarCiz, gizle: tekrarKapat });
rotaEkle('/tekrar/:deste', { baslik: 'Deste', goster: tekrarCiz, gizle: tekrarKapat });

// S17: Seviye Belirleme Testi (#/testler): ana sayfadaki Testler kartından açılır; sayfa dosyası ilk açılışta yüklenir
const testModulu = () => import('./modules/testler/seviye-testi.js');
const testCiz = () => testModulu()
  .then((m) => { if (etkinRota()?.yol === '/testler') m.testlerSayfasiCiz($('#testler-sayfasi')); })
  .catch((h) => { console.error('[testler]', h); toastGoster('Seviye testi açılamadı. Sayfayı yenileyip yeniden dene.', { tur: 'hata' }); });
rotaEkle('/testler', {
  baslik: 'Seviye Testi',
  goster: testCiz,
  gizle: () => testModulu().then((m) => m.testlerSayfasiniKapat()).catch(() => {}),
});

// S19: Akıllı Kurs (#/kurs gün haritası ve dersler, #/kurs/rapor rapor ve sertifika); ana sayfa kartından ve gezinmeden açılır
const kursModulu = () => import('./modules/kurs/kurs-sayfasi.js');
const kursCiz = () => kursModulu()
  .then((m) => {
    const yol = etkinRota()?.yol;
    if (yol === '/kurs') m.kursSayfasiCiz($('#kurs-sayfasi'));
    else if (yol === '/kurs/rapor') m.kursRaporuCiz($('#kurs-rapor-sayfasi'));
  })
  .catch((h) => { console.error('[kurs]', h); toastGoster('Akıllı Kurs açılamadı. Sayfayı yenileyip yeniden dene.', { tur: 'hata' }); });
const kursKapat = () => kursModulu().then((m) => m.kursSayfasiniKapat()).catch(() => {});
rotaEkle('/kurs', { baslik: 'Akıllı Kurs', goster: kursCiz, gizle: kursKapat });
rotaEkle('/kurs/rapor', { baslik: 'Kurs raporu', goster: kursCiz, gizle: kursKapat });

// S20: İlerleme paneli (#/ilerleme) ve veli raporu (#/ilerleme/rapor); gezinmeden ve ana sayfadaki “Bugün” kartından açılır
const ilerlemeModulu = () => import('./modules/ilerleme/ilerleme-sayfasi.js');
const ilerlemeCiz = () => ilerlemeModulu()
  .then((m) => {
    const yol = etkinRota()?.yol;
    if (yol === '/ilerleme') m.ilerlemeSayfasiCiz($('#ilerleme-sayfasi'));
    else if (yol === '/ilerleme/rapor') m.ilerlemeRaporuCiz($('#ilerleme-rapor-sayfasi'));
  })
  .catch((h) => { console.error('[ilerleme]', h); toastGoster('İlerleme sayfası açılamadı. Sayfayı yenileyip yeniden dene.', { tur: 'hata' }); });
const ilerlemeKapat = () => ilerlemeModulu().then((m) => m.ilerlemeSayfasiniKapat()).catch(() => {});
rotaEkle('/ilerleme', { baslik: 'İlerleme', goster: ilerlemeCiz, gizle: ilerlemeKapat });
rotaEkle('/ilerleme/rapor', { baslik: 'Veli raporu', goster: ilerlemeCiz, gizle: ilerlemeKapat });

// S22: Çalışma Rehberi (#/rehber kartlar, #/rehber/<sayfa> Cornell notu, zihin haritası, haftalık plan ve bilgi sayfaları); ana sayfadaki bölümden ve alan kartından açılır
const rehberModulu = () => import('./modules/rehber/rehber-sayfasi.js');
const rehberCiz = () => rehberModulu()
  .then((m) => {
    const r = etkinRota();
    if (r?.yol === '/rehber') m.rehberSayfasiCiz($('#rehber-sayfasi'));
    else if (r?.yol.startsWith('/rehber/')) m.rehberAltSayfaCiz($('#rehber-alt-sayfasi'), r.parametreler.sayfa, r.sorgu);
  })
  .catch((h) => { console.error('[rehber]', h); toastGoster('Çalışma Rehberi açılamadı. Sayfayı yenileyip yeniden dene.', { tur: 'hata' }); });
const rehberKapat = () => rehberModulu().then((m) => m.rehberSayfasiniKapat()).catch(() => {});
rotaEkle('/rehber', { baslik: 'Çalışma Rehberi', goster: rehberCiz, gizle: rehberKapat });
rotaEkle('/rehber/:sayfa', { baslik: 'Çalışma Rehberi', goster: rehberCiz, gizle: rehberKapat });

// S24: Veli/Öğretmen alanı (#/veli PIN kapısı ve panel, #/veli/rapor?profil=<id> profil raporu); Ayarlar’daki bölümden açılır.
// Alanın dışına çıkınca (ROTA_DEGISTI) kilitlenir; PIN olmadan içerik çizilmez
let veliYuklendi = false;
const veliModulu = () => import('./modules/veli/veli-sayfasi.js').then((m) => { veliYuklendi = true; return m; });
const veliCiz = () => veliModulu()
  .then((m) => {
    const r = etkinRota();
    if (r?.yol === '/veli') m.veliSayfasiCiz($('#veli-sayfasi'));
    else if (r?.yol === '/veli/rapor') m.veliRaporuCiz($('#veli-rapor-sayfasi'), r.sorgu);
  })
  .catch((h) => { console.error('[veli]', h); toastGoster('Veli / Öğretmen alanı açılamadı. Sayfayı yenileyip yeniden dene.', { tur: 'hata' }); });
const veliKapat = () => veliModulu().then((m) => m.veliSayfasiniKapat()).catch(() => {});
rotaEkle('/veli', { baslik: 'Veli / Öğretmen alanı', goster: veliCiz, gizle: veliKapat });
rotaEkle('/veli/rapor', { baslik: 'Profil raporu', goster: veliCiz, gizle: veliKapat });

// Egzersizler: #/egzersiz/<ad> tam ekran çerçevede açılır; çıkınca gelinen sayfaya dönülür
let sonSayfa = null; // egzersiz dışındaki son sayfa (adres doğrudan açıldıysa null)
rotaEkle('/egzersiz/:ad', {
  baslik: 'Egzersiz',
  goster: ({ ad }) => egzersiziBaslat(ad),
  gizle: egzersiziKapat,
});
async function egzersiziBaslat(ad) {
  // Uygulama içinden gelindiyse tarayıcının geri adımıyla dönülür (geçmişte çift kayıt olmaz); yoksa egzersizin alanına
  const geriVar = sonSayfa !== null;
  const don = (modul) => (geriVar ? history.back() : git(modul ? `/modul/${modul}` : '/', { degistir: true }));
  const tanim = await egzersizYukle(ad);
  if (etkinRota()?.parametreler.ad !== ad) return; // bu arada başka sayfaya geçildi
  if (!aktifProfil()) {
    toastGoster('Egzersize başlamadan önce bir profil oluştur.', { tur: 'bilgi' });
    don(tanim?.modul);
    return;
  }
  if (!tanim) { yakindaUyarisi(); don(); return; }
  await egzersizAc(tanim, { kapaninca: () => don(tanim.modul) });
}

// Gezinme bağlantılarında etkin sayfayı işaretle
dinle(OLAYLAR.ROTA_DEGISTI, ({ yol }) => {
  if (!yol.startsWith('/egzersiz/')) sonSayfa = yol;
  if (veliYuklendi && !yol.startsWith('/veli')) veliModulu().then((m) => m.veliKilitle()).catch(() => {}); // S24
  document.querySelectorAll('.ust-gezinme a, .alt-gezinme a').forEach((a) => {
    if (a.getAttribute('href') === `#${yol}`) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
  const ayar = $('#ayar-dugmesi');
  if (yol === '/ayarlar') ayar.setAttribute('aria-current', 'page');
  else ayar.removeAttribute('aria-current');
});

// 6) Profil: karşılama, profiller penceresi, üst çubuk düğmesi
const profilModal = $('#profil-modal');
const karsilama = karsilamayiBagla({ dialog: $('#karsilama-modal'), formAlani: $('#karsilama-form-alani') });
modalBagla($('#profil-dugmesi'), profilModal);
const profilPenceresi = profilPenceresiniBagla({
  dialog: profilModal,
  liste: $('#profil-listesi'),
  ekleDugmesi: $('#profil-ekle-dugmesi'),
  formAlani: $('#profil-form-alani'),
  kisitliMi: sinifModuAcikMi, // S24: sınıf modunda yalnız profil geçişi
});
profilDugmesiniBagla($('#profil-dugmesi'));

// Ana ekran: selamlama, kısa özet ve günlük hedef (öğrencinin kendi verisi). S20: seri esnek seridir (dinlenme hakkıyla)
function anaEkraniGuncelle() {
  const p = aktifProfil();
  $('#karsilama-baslik').textContent = p ? `Merhaba, ${p.takmaAd}!` : 'Merhaba!';
  const o = p ? ozet(p.id) : { haftaDk: 0, sonEoh: null };
  $('#ozet-seri').textContent = `${p ? seriDurumu(p.id).seri : 0} gün`;
  $('#ozet-hafta').textContent = `${o.haftaDk} dk`;
  $('#ozet-eoh').textContent = o.sonEoh != null ? `${o.sonEoh} k/dk` : '—';
  gunlukHedefiGuncelle(p);
  fenerSelami(p);
}

// S28: çocuk görünümünde selamlamanın altında Fener'in konuşma balonu (profesyonelde öğe hiç yok). Mesaj değişmedikçe yeniden çizilmez
function fenerSelami(p) {
  const bolum = document.querySelector('section[aria-labelledby="karsilama-baslik"]');
  if (!bolum) return;
  const alan = document.getElementById('fener-selam');
  if (!cocukGorunumuMu()) { alan?.remove(); return; }
  const { ifade, mesaj } = anaSayfaMesaji({ profil: p, durum: p ? bugunDurumu(p.id) : null });
  const anahtar = `${ifade}|${mesaj}`;
  if (alan?.dataset.anahtar === anahtar) return;
  const yeni = fenerBalonu({ ifade, mesaj, sinif: 'fener-balon--selam' });
  yeni.id = 'fener-selam';
  yeni.dataset.anahtar = anahtar;
  if (alan) alan.replaceWith(yeni);
  else bolum.firstElementChild.after(yeni);
}
// Görünüm (yönetici/geliştirici) ya da ayar değişince balon eklenir, kalkar ya da yenilenir
degisinceHaberVer(() => fenerSelami(aktifProfil()));

// S20: ana sayfadaki “Bugün” kartı: günlük hedef çubuğu, “bugünlük yeter” mesajı, seviye
function gunlukHedefiGuncelle(p) {
  const kart = $('#gunluk-hedef');
  if (!kart) return;
  kart.hidden = !p;
  if (!p) return;
  const d = bugunDurumu(p.id);
  const s = seviyeBilgisi(ilerlemeVerisi(p.id).xp);
  const cubuk = $('#hedef-cubugu');
  $('#hedef-metin').textContent = `${d.dk} / ${d.hedefDk} dk`;
  cubuk.setAttribute('aria-valuenow', String(d.yuzde));
  cubuk.setAttribute('aria-valuetext', `${d.hedefDk} dakikalık hedefin ${d.dk} dakikası tamam`);
  cubuk.querySelector('.ilerleme__dolgu').style.setProperty('--deger', `${d.yuzde}%`);
  const mesaj = bugunlukMesaji(d);
  const not = $('#hedef-not');
  not.className = mesaj ? `bildirim bildirim--${mesaj.tur}` : 'soluk';
  not.replaceChildren(mesaj
    ? el('p', {}, el('strong', { metin: `${mesaj.baslik}. ` }), mesaj.metin)
    : el('p', { metin: d.dk === 0 ? 'Bugün birkaç kısa tur yeterli.' : `Hedefe ${d.hedefDk - d.dk} dakika kaldı.` }));
  $('#seviye-ozet').textContent = `Seviye ${s.seviye}, ${s.unvan}: ${s.xp} XP (bir sonraki seviyeye ${s.kalan} XP)`;
  // S24: veli/öğretmenin haftalık hedefi varsa
  const h = haftalikDurum(p.id);
  const hafta = $('#hafta-ozet');
  hafta.hidden = !h.hedefDk;
  if (h.hedefDk) hafta.textContent = h.tamam ? `Bu hafta ${h.dk} dakika çalıştın; haftalık hedefin (${h.hedefDk} dk) tamam.` : `Bu hafta: ${h.dk} / ${h.hedefDk} dk (haftalık hedef).`;
}
// Uygulama gece yarısını geçerek açık kaldıysa “bugün” yenilensin
document.addEventListener('visibilitychange', () => { if (!document.hidden && etkinRota()?.yol === '/') anaEkraniGuncelle(); });

dinle(OLAYLAR.PROFIL_DEGISTI, (p) => {
  anaEkraniGuncelle();
  if (etkinRota()?.yol === '/kutuphane') kutuphaneCiz(); // S07: profil değişince kütüphane o profilin metinleriyle yenilenir
  if (etkinRota()?.yol === '/odak') odakCiz(); // S12: o profilin zamanlayıcısı ve günlüğü
  if (etkinRota()?.yol.startsWith('/teknikler')) teknikCiz(); // S15: o profilin ders sonuçları (açık ders baştan başlar)
  if (etkinRota()?.yol.startsWith('/tekrar')) tekrarCiz(); // S16: o profilin desteleri (açık tekrar oturumu kapanır)
  if (etkinRota()?.yol === '/testler') testCiz(); // S17: o profilin test sonuçları (süren test bırakılır)
  if (etkinRota()?.yol.startsWith('/kurs')) kursCiz(); // S19: o profilin kurs planı
  if (etkinRota()?.yol.startsWith('/ilerleme')) ilerlemeCiz(); // S20: o profilin ilerlemesi
  if (etkinRota()?.yol.startsWith('/rehber')) rehberCiz(); // S22: o profilin notları, haritaları ve planı (açık not önce kaydedilir)
  ayarSayfasiniGuncelle();
  if (p) karsilama.kapat();
  else karsilama.ac();
});
dinle(OLAYLAR.KAYIT_EKLENDI, () => { anaEkraniGuncelle(); ayarSayfasiniGuncelle(); });
// D05: etkin profilin adı/sınıfı/avatarı ya da ayarı değişti (profil değişmedi: metin seçimi korunur)
dinle(OLAYLAR.PROFIL_GUNCELLENDI, ({ ayarMi }) => {
  anaEkraniGuncelle();
  ayarSayfasiniGuncelle();
  if (!ayarMi && etkinRota()?.yol === '/kutuphane') kutuphaneCiz(); // sınıf değiştiyse seviye etiketleri yenilensin
  if (!ayarMi && etkinRota()?.yol === '/ilerleme/rapor') ilerlemeCiz(); // S20: raporda takma ad ve sınıf
});
// S24: sınıf modu, PIN ya da hedef değişti: profil penceresi, ana sayfa, Ayarlar ve İlerleme güncellenir
dinle(OLAYLAR.VELI_DEGISTI, () => {
  profilPenceresi.yenile();
  anaEkraniGuncelle();
  ayarSayfasiniGuncelle();
  if (etkinRota()?.yol === '/ilerleme') ilerlemeCiz();
});
dinle(OLAYLAR.PROFILLER_DEGISTI, () => { if (etkinRota()?.yol === '/veli') veliCiz(); });
dinle(OLAYLAR.DEPO_YUKLENDI, () => {
  if (!aktifProfil() && profilModal.open) profilModal.close();
  profilBaslat();
});

// 7) Yedek indir / yükle (profiller penceresinde ve ayarlar sayfasında)
function yedegiIndir() {
  if (yedekIndir()) toastGoster('Yedek dosyası indirildi.', { tur: 'basari' });
}

// S24: sınıf modunda yedek yükleme ve silme kapalı (düğmeler gizli; burada da denetlenir)
function sinifModundaEngelle() {
  if (!sinifModuAcikMi()) return false;
  toastGoster('Sınıf modu açıkken bu işlem yapılamaz. Veli / Öğretmen alanından sınıf modunu kapatın.', { tur: 'uyari' });
  return true;
}

function yedekSec() {
  if (aktifProfil() && sinifModundaEngelle()) return;
  const girdi = document.createElement('input');
  Object.assign(girdi, { type: 'file', accept: '.json,application/json', hidden: true });
  girdi.addEventListener('change', async () => {
    const dosya = girdi.files?.[0];
    girdi.remove();
    if (!dosya) return;
    if (aktifProfil() && !confirm('Yedek yüklenince bu cihazdaki profiller ve sonuçlar yedektekilerle değiştirilecek. Devam edilsin mi?')) return;
    try {
      await yedekYukle(dosya);
      toastGoster('Yedek yüklendi.', { tur: 'basari' });
    } catch (hata) {
      toastGoster(hata.message, { tur: 'hata', sure: 8000 });
    }
  });
  (document.querySelector('dialog[open]') ?? document.body).append(girdi);
  girdi.click();
}
$('#yedek-indir').addEventListener('click', yedegiIndir);
$('#yedek-yukle').addEventListener('click', yedekSec);
$('#karsilama-yedek').addEventListener('click', yedekSec);
$('#ayar-yedek-indir').addEventListener('click', yedegiIndir);
$('#ayar-yedek-yukle').addEventListener('click', yedekSec);

// 8) Ayarlar sayfası: ses denemesi, sıfırlama, uygulama durumu, veri silme
function ayarSayfasiniGuncelle() {
  const p = aktifProfil();
  $('#ayarlar-aciklama').textContent = p
    ? `Seçimlerin ${p.takmaAd} profili için kaydedilir; profil değişince onun ayarları gelir.`
    : 'Seçimlerin, profil oluşturunca o profile kaydedilir.';
  const kalici = kaliciMi();
  $('#depo-kullanim').textContent = kalici
    ? `Kullanılan alan: yaklaşık ${boyutMetni(kullanimBayt())}.`
    : 'Bu tarayıcı kayıt yapmaya izin vermiyor; sayfa kapanınca bilgiler silinir.';
  $('#sonuclari-sil').disabled = !p;
  // S24: sınıf modunda yedek yükleme ve silme düğmeleri gizli
  const kisitli = sinifModuAcikMi();
  ['#ayar-yedek-yukle', '#sonuclari-sil', '#tumunu-sil', '#yedek-yukle'].forEach((s) => { $(s).hidden = kisitli; });
  $('#sinif-modu-notu').hidden = !kisitli;
  if (kisitli && !$('#silme-onayi').hidden) silmeOnayiniKapat(false);
}

$('#ses-dene').addEventListener('click', () => {
  if (!sesCal('dogru', { zorla: true })) toastGoster('Bu tarayıcı ses çalamıyor.', { tur: 'uyari' });
  else if (!$('#ayar-formu').elements.ses.checked) toastGoster('Ses efektleri şu an kapalı; açmak için anahtarı kullan.');
});

$('#ayar-sifirla').addEventListener('click', () => {
  ayarlariSifirla();
  toastGoster('Görünüm ilk hâline döndü.', { tur: 'basari' });
});

kurulumDugmesiniBagla($('#ana-ekrana-ekle'), { ipucu: $('#ios-ipucu') });
pwaDurumunuDinle((d) => {
  const alan = $('#cevrimdisi-durum');
  $('#yuklu-ipucu').hidden = !d.yuklu;
  // S26: çalışan sürüm (ör. "Sürüm: 1.0.0-s26")
  const surumSatiri = $('#uygulama-surumu');
  surumSatiri.hidden = !d.surum;
  if (d.surum) surumSatiri.textContent = `Sürüm: ${d.surum}`;
  if (!d.destek) {
    alan.dataset.durum = 'yok';
    alan.textContent = location.protocol === 'file:'
      ? 'Çevrimdışı kullanım için uygulamayı yerel sunucuyla ya da internet adresinden aç.'
      : 'Bu tarayıcı çevrimdışı kullanımı desteklemiyor.';
  } else if (d.cevrimdisiHazir) {
    alan.dataset.durum = 'hazir';
    alan.textContent = d.cevrimici ? 'İnternet olmadan da açılmaya hazır.' : 'Şu an çevrimdışısın; uygulama çalışıyor.';
  } else if (d.kurulumHatasi) {
    alan.dataset.durum = 'yok';
    alan.textContent = 'Çevrimdışı kullanım hazırlanamadı. İnternet bağlantını kontrol edip sayfayı yenile.';
  } else {
    alan.dataset.durum = 'bekliyor';
    alan.textContent = 'Çevrimdışı kullanım hazırlanıyor… (sayfayı bir kez yenilemen gerekebilir)';
  }
});

$('#sonuclari-sil').addEventListener('click', () => {
  const p = aktifProfil();
  if (!p || sinifModundaEngelle()) return;
  if (!confirm(`${p.takmaAd} profilinin tüm çalışma sonuçları silinsin mi? “Okundu” bilgileri, odak günlüğü, seviye seçimleri, XP, seri ve rozetler de silinir; profil, kendi metinlerin ve favorilerin kalır. Bu işlem geri alınamaz.`)) return;
  profilKayitlariniSil(p.id); // sonuçlar ve seviye seçimleri
  ilerlemeSonuclariniSil(p.id); // S20: XP, seri günleri, rozetler (günlük hedef seçimi kalır)
  if (etkinRota()?.yol.startsWith('/ilerleme')) ilerlemeCiz();
  // Kütüphanedeki “okundu / en iyi anlama” bilgisi (metin bankası dosyası gerekince yüklenir)
  import('./engine/text-bank.js').then((m) => m.okunanlariSil(p.id)).catch((h) => console.error('[sonuclari-sil]', h));
  // S12: odak günlüğü (zamanlayıcı seçimleri kalır); sayfa açıksa yenilenir
  import('./modules/odak/odak-veri.js').then((m) => { m.odakGunluguSil(p.id); if (etkinRota()?.yol === '/odak') odakCiz(); })
    .catch((h) => console.error('[sonuclari-sil]', h));
  anaEkraniGuncelle();
  ayarSayfasiniGuncelle();
  toastGoster('Sonuçlar silindi. Yeni bir başlangıç!', { tur: 'basari' });
});

const silmeOnayi = $('#silme-onayi');
const tumunuSil = $('#tumunu-sil');
function silmeOnayiniKapat(odakGeri = true) {
  silmeOnayi.hidden = true;
  tumunuSil.setAttribute('aria-expanded', 'false');
  if (odakGeri) tumunuSil.focus();
}
tumunuSil.addEventListener('click', () => {
  silmeOnayi.hidden = false;
  tumunuSil.setAttribute('aria-expanded', 'true');
  $('#tumunu-sil-vazgec').focus();
});
$('#tumunu-sil-vazgec').addEventListener('click', () => silmeOnayiniKapat());
silmeOnayi.addEventListener('keydown', (e) => { if (e.key === 'Escape') silmeOnayiniKapat(); });
$('#tumunu-sil-onay').addEventListener('click', () => {
  silmeOnayiniKapat(false);
  if (sinifModundaEngelle()) return;
  if (profilModal.open) profilModal.close();
  tumVeriyiSil();
  git('/', { degistir: true });
  profilBaslat(); // profil kalmadığı için karşılama açılır
  ayarlariSifirla();
  duyur('Tüm veriler silindi.');
});

// 9) Başlat: profil yoksa karşılama açılır
rotaBaslat({
  bulunamadi(yol) {
    const baglanti = [...document.querySelectorAll('a[data-yakinda]')].find((a) => a.getAttribute('href') === `#${yol}`);
    yakindaUyarisi(baglanti?.dataset.yakinda);
    git('/', { degistir: true });
  },
});
profilBaslat();
// S24: sınıf modunda açılışta “Kim çalışıyor?” (profiller penceresi) gelir
if (sinifModuAcikMi() && aktifProfil() && profilleriGetir().length > 1) modalAc(profilModal);

// S12: süren odak zamanlayıcısı (sayfa yenilendiyse) kaldığı yerden sürer; bitiş zili ve bildirimi hangi sayfada olunursa olsun gelir
import('./modules/odak/odak-zamanlayici.js').then((m) => m.zamanlayiciKur()).catch((h) => console.error('[odak-zamanlayici]', h));

// Geliştirici denemesi: yerel sunucuda ve aynı ev ağındaki adreste (telefondan deneme) konsol araçları ve görünüm düğmeleri.
// sw.js gelistirmeMi() ile aynı kural (service worker modül içe aktaramadığı için iki yerde); yayındaki alan adında hiçbiri çıkmaz
function gelistirmeAdresiMi(ad = location.hostname) {
  if (ad === 'localhost' || ad === '127.0.0.1' || ad === '[::1]' || ad.endsWith('.local')) return true;
  if (/^(10|192\.168)\./.test(ad)) return true;
  return /^172\.(1[6-9]|2\d|3[01])\./.test(ad);
}

// S29 GEÇİCİ: yayına kadar görünüm seçimi her adreste (Vercel dahil) Ayarlar'da görünür.
// YAYINDAN ÖNCE false yap: o zaman kutu yalnız yerel sunucuda ve ev ağında çıkar (S27 kuralı: görünümü yönetici seçer)
const GECICI_GORUNUM_SECIMI = true;

// S29: telefonda konsol olmadığı için görünüm Ayarlar sayfasının sonundaki kutudan değiştirilir
function gelistiriciKutusu() {
  const durum = el('p', { sinif: 'soluk', role: 'status' });
  const yaz = () => { durum.textContent = `Şu anki görünüm: ${cocukGorunumuMu() ? 'çocuk' : 'profesyonel'}`; };
  const dugme = (metin, ad) => el('button', {
    type: 'button', sinif: 'btn btn--ikincil btn--kucuk', metin,
    onclick: () => { gorunumAyarla(ad); yaz(); toastGoster(`Görünüm: ${metin}`); },
  });
  yaz();
  $('.ayarlar-sayfasi')?.append(el('section', { sinif: 'kart ayar-bolumu', 'aria-labelledby': 'gelistirici-baslik' },
    el('h2', { id: 'gelistirici-baslik', metin: 'Görünüm (deneme)' }),
    el('p', { sinif: 'alan__ipucu', metin: 'Geçici: yayına alınmadan önce kaldırılacak. Seçim bu cihazda saklanır.' }),
    el('div', { sinif: 'yedek-eylemler' }, dugme('Çocuk görünümü', 'cocuk'), dugme('Profesyonel görünüm', 'profesyonel')),
    durum));
}

if (GECICI_GORUNUM_SECIMI || gelistirmeAdresiMi()) gelistiriciKutusu();

if (gelistirmeAdresiMi()) {
  window.odakDeneme = {
    kayitEkle, ozet, sesCal, molaEsiginiAyarla, gozMolasiEsiginiAyarla,
    // S17: finali 21 gün beklemeden denemek için başlangıç tarihini geri alır: odakDeneme.testBaslangiciniGeriAl(21)
    testBaslangiciniGeriAl: (gun) => import('./modules/testler/test-veri.js').then((m) => m.baslangiciGeriAl(gun)),
    // S19: kurs denemesi: kursGeriAl(3) → 3 gün ara verilmiş gibi; kursIlerle(20) → 20 günü hızlıca tamamla (sonra #/kurs sayfasını yenile)
    kursGeriAl: (gun) => import('./modules/kurs/kurs-veri.js').then((m) => m.kursTarihiniGeriAl(gun)),
    kursIlerle: (gun) => import('./modules/kurs/kurs-veri.js').then((m) => m.kursDenemeIlerle(gun)),
    // S27: görünüm denemesi: odakDeneme.gorunum('cocuk') ya da odakDeneme.gorunum('profesyonel'); argümansız: şu anki bilgi
    gorunum: (ad) => (ad ? gorunumAyarla(ad) : hesapBilgisi()),
  };
}

// S25: açılış bitti. Bundan önceki hata “Uygulama açılamadı” ekranını, sonraki hatalar kapatılabilir uyarı bandını açar (js/core/hata-yakala.js)
document.documentElement.dataset.uygulama = 'hazir';
