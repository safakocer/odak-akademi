// Uygulamanın giriş noktası: çekirdek modülleri başlatır; ana ekranı, alan ve egzersiz listelerini, kütüphaneyi, odak araçlarını (S12), hafıza tekniklerini (S15), ayarlar sayfasını, profil/yedek pencerelerini ve PWA'yı bağlar
import { temaDugmesiBagla, ayarFormuBagla, duyur } from './core/a11y.js';
import { modalBagla, toastGoster } from './core/ui.js';
import { depoBaslat, yedekIndir, yedekYukle, kullanimBayt, kaliciMi } from './core/storage.js';
import { dinle, OLAYLAR } from './core/store.js';
import { rotaEkle, rotaBaslat, git, etkinRota } from './core/router.js';
import { profilBaslat, aktifProfil, karsilamayiBagla, profilPenceresiniBagla, profilDugmesiniBagla } from './core/profile.js';
import { ozet, kayitEkle, profilKayitlariniSil } from './core/metrics.js';
import { ayarlarBaslat, ayarlariSifirla, tumVeriyiSil } from './core/settings.js';
import { sesCal } from './core/sound.js';
import { pwaBaslat, kurulumDugmesiniBagla, pwaDurumunuDinle } from './core/pwa.js';
import { boyutMetni } from './core/utils.js';
import { egzersizAc, egzersiziKapat, molaEsiginiAyarla } from './engine/exercise-frame.js';
import { egzersizYukle, aracBilgisi, egzersizBilgisi } from './modules/katalog.js';
import { modulKartlariniGuncelle, modulSayfasiCiz, egzersizlerSayfasiCiz, egzersizKarti } from './modules/egzersiz-listesi.js';
import { gozMolasiEsiginiAyarla } from './engine/eye-rest.js';

const $ = (secici) => document.querySelector(secici);

// 1) Depo uyarıları (depo başlamadan önce dinlenmeli)
dinle(OLAYLAR.DEPO_HATA, ({ tur, mesaj }) => toastGoster(mesaj, { tur: ['kota', 'sekme'].includes(tur) ? 'uyari' : 'hata', sure: 8000 }));
depoBaslat();

// 2) Kayıtlı görünüm ayarları hemen uygulanır, değişiklikler profile kaydedilir
ayarlarBaslat();
temaDugmesiBagla($('#tema-dugmesi'));
ayarFormuBagla($('#ayar-formu'));

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
rotaEkle('/', { baslik: '' });
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
// K2: ana sayfadaki "Ders çalışırken" kısayolları (kart bilgileri yalnız katalog.js'te); S15: + Hafıza Teknikleri
$('#kisayol-kartlari')?.replaceChildren(...[aracBilgisi('odak'), aracBilgisi('teknikler'), egzersizBilgisi('goz-molasi')].filter(Boolean).map(egzersizKarti));

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
profilPenceresiniBagla({
  dialog: profilModal,
  liste: $('#profil-listesi'),
  ekleDugmesi: $('#profil-ekle-dugmesi'),
  formAlani: $('#profil-form-alani'),
});
profilDugmesiniBagla($('#profil-dugmesi'));

// Ana ekran: selamlama ve kısa özet (öğrencinin kendi verisi)
function anaEkraniGuncelle() {
  const p = aktifProfil();
  $('#karsilama-baslik').textContent = p ? `Merhaba, ${p.takmaAd}!` : 'Merhaba!';
  const o = p ? ozet(p.id) : { seriGun: 0, haftaDk: 0, sonEoh: null };
  $('#ozet-seri').textContent = `${o.seriGun} gün`;
  $('#ozet-hafta').textContent = `${o.haftaDk} dk`;
  $('#ozet-eoh').textContent = o.sonEoh != null ? `${o.sonEoh} k/dk` : '—';
}

dinle(OLAYLAR.PROFIL_DEGISTI, (p) => {
  anaEkraniGuncelle();
  if (etkinRota()?.yol === '/kutuphane') kutuphaneCiz(); // S07: profil değişince kütüphane o profilin metinleriyle yenilenir
  if (etkinRota()?.yol === '/odak') odakCiz(); // S12: o profilin zamanlayıcısı ve günlüğü
  if (etkinRota()?.yol.startsWith('/teknikler')) teknikCiz(); // S15: o profilin ders sonuçları (açık ders baştan başlar)
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
});
dinle(OLAYLAR.DEPO_YUKLENDI, () => {
  if (!aktifProfil() && profilModal.open) profilModal.close();
  profilBaslat();
});

// 7) Yedek indir / yükle (profiller penceresinde ve ayarlar sayfasında)
function yedegiIndir() {
  if (yedekIndir()) toastGoster('Yedek dosyası indirildi.', { tur: 'basari' });
}

function yedekSec() {
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
  if (!p) return;
  if (!confirm(`${p.takmaAd} profilinin tüm çalışma sonuçları silinsin mi? “Okundu” bilgileri, odak günlüğü ve seviye seçimleri de silinir; profil, kendi metinlerin ve favorilerin kalır. Bu işlem geri alınamaz.`)) return;
  profilKayitlariniSil(p.id); // sonuçlar ve seviye seçimleri
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

// S12: süren odak zamanlayıcısı (sayfa yenilendiyse) kaldığı yerden sürer; bitiş zili ve bildirimi hangi sayfada olunursa olsun gelir
import('./modules/odak/odak-zamanlayici.js').then((m) => m.zamanlayiciKur()).catch((h) => console.error('[odak-zamanlayici]', h));

// Geliştirici denemesi: yalnızca bilgisayardaki yerel sunucuda konsoldan sonuç eklemek için
if (['localhost', '127.0.0.1'].includes(location.hostname)) {
  window.odakDeneme = { kayitEkle, ozet, sesCal, molaEsiginiAyarla, gozMolasiEsiginiAyarla };
}
