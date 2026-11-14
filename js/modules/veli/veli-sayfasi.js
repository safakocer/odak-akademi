// Veli/Öğretmen alanı (S24, #/veli): PIN kapısı (oluştur, gir, bekleme, unuttum), profil özetleri ve hedefler, sınıf modu, dışa aktarım, PIN değiştirme; profil raporu #/veli/rapor?profil=<id> (S35a: seviye testinde eşdeğer metin ve aynı metni yeniden okuma ayrı tablolarda; S35a-d: yeniden okuma yapılmadıysa da tablo, nedeniyle; S35c: Akıllı Kurs bölümünde kurs karnesi tablosu)
import { el, spriteIkon, toastGoster } from '../../core/ui.js';
import { duyur, odakla } from '../../core/a11y.js';
import { git } from '../../core/router.js';
import { profilleriGetir, avatarOge } from '../../core/profile.js';
import { sureBicimle, tarihMetni } from '../../core/utils.js';
import { ilerlemeRaporuCiz, ilerlemeSayfasiniKapat, raporTablosu } from '../ilerleme/ilerleme-sayfasi.js';
import { testVerisi, karsilastir, gelisimOzeti, DEGISIM_ESIGI } from '../testler/test-veri.js';
import {
  PIN_UZUNLUK, BEKLEME, GUNLUK_SECENEKLER, HAFTALIK_SECENEKLER, pinVarMi, pinDogrula, pinKaydet, pinHatasi, beklemeKalanMs,
  oturumAcikMi, oturumuKapat, veliSifirla, sinifModuAcikMi, sinifModuAyarla, veliHedefi, veliHedefiKaydet, haftaGecmisi, gunTarihi,
} from './veli-veri.js';
import { profilOzeti, kursOzetiKisa, disaAktar } from './veli-disa.js';
import { kayitlariGetir } from '../../core/metrics.js';
import { kursVerisi, karneSatirlari, karneOzeti } from '../kurs/kurs-veri.js';
import { karneRaporSatirlari } from '../kurs/kurs-karne.js';

const OTOMATIK_KILIT_MS = 5 * 60 * 1000; // dokunulmadan 5 dk geçerse alan kilitlenir
let kap = null;
let raporKap = null;
let sayac = null;
let kilitZamani = null;
let sira = 0;

const gunMetni = (g) => tarihMetni(gunTarihi(g));
const KISA = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short' });
const kisaGun = (g) => KISA.format(gunTarihi(g));

function sayacDurdur() { clearInterval(sayac); sayac = null; }

// ---------- Otomatik kilit ----------
function hareketVar() {
  clearTimeout(kilitZamani);
  kilitZamani = setTimeout(() => {
    if (!oturumAcikMi()) return;
    veliKilitle();
    toastGoster('Uzun süre işlem yapılmadığı için Veli / Öğretmen alanı kilitlendi.', { tur: 'bilgi' });
    if (location.hash.startsWith('#/veli')) git('/veli', { degistir: true }); // rapor açıksa da PIN kapısına döner
  }, OTOMATIK_KILIT_MS);
}
function hareketiIzle(acikMi) {
  for (const t of ['pointerdown', 'keydown']) document[acikMi ? 'addEventListener' : 'removeEventListener'](t, hareketVar, true);
  if (acikMi) hareketVar(); else clearTimeout(kilitZamani);
}

/** Alanı kilitler (alan dışına çıkınca app.js çağırır); gizli sayfalarda kalan içerik de silinir */
export function veliKilitle() {
  oturumuKapat();
  sayacDurdur();
  hareketiIzle(false);
  kap?.replaceChildren();
  raporKap?.replaceChildren();
}

/** Sayfa gizlenince: sayaç durur, rapor yazdırma sınıfı kalkar (kilit app.js’te, alandan çıkınca) */
export function veliSayfasiniKapat() {
  sayacDurdur();
  ilerlemeSayfasiniKapat();
}

// ---------- Ortak parçalar ----------
function sayfaUst() {
  return el('div', { sinif: 'sayfa-ust' },
    el('span', { sinif: 'kart__ikon', 'aria-hidden': 'true', style: '--m-zemin: var(--modul-rehber); --m-ikon: var(--modul-rehber-ikon)' }, spriteIkon('aile', 'ikon')),
    el('div', {}, el('h1', { id: 'veli-baslik', metin: 'Veli / Öğretmen alanı' }),
      el('p', { sinif: 'soluk', metin: 'Raporlar, hedefler, sınıf modu ve dışa aktarım. Öğrenci ekranlarından ayrı tutulur.' })));
}

const geriBaglanti = (href, metin) => el('a', { sinif: 'btn btn--hayalet btn--kucuk geri-baglanti', href },
  spriteIkon('ok-sag', 'ikon ikon--kucuk ikon--ters'), metin);

function pinGirdisi(id, etiket, ipucuId) {
  const girdi = el('input', {
    sinif: 'girdi veli-pin-girdi', id, name: id, type: 'password', inputmode: 'numeric', maxlength: String(PIN_UZUNLUK),
    autocomplete: 'off', spellcheck: 'false', 'aria-describedby': ipucuId,
  });
  girdi.addEventListener('input', () => {
    const temiz = girdi.value.replace(/\D/g, '').slice(0, PIN_UZUNLUK);
    if (temiz !== girdi.value) girdi.value = temiz;
    girdi.removeAttribute('aria-invalid');
  });
  return { girdi, alan: el('div', { sinif: 'alan' }, el('label', { sinif: 'alan__etiket', for: id, metin: etiket }), girdi) };
}

function hataAlani(id) {
  return el('p', { sinif: 'alan__hata', id, role: 'alert', hidden: true });
}
function hataGoster(hata, metin, girdi) {
  hata.textContent = metin;
  hata.hidden = false;
  if (girdi) { girdi.setAttribute('aria-invalid', 'true'); girdi.focus(); girdi.select?.(); }
}

// ---------- PIN kapısı ----------
/** PIN oluşturma ya da değiştirme formu. degistir: true ise önce şu anki PIN sorulur */
function pinFormu({ degistir = false, bitince }) {
  const k = `vp${++sira}`;
  const ipucu = el('p', { sinif: 'alan__ipucu', id: `${k}-ipucu`,
    metin: `${PIN_UZUNLUK} rakam. Aynı ya da sıralı rakamlar (0000, 1234) kabul edilmez. Bu PIN’i çocuğunuzla paylaşmayın.` });
  const eski = degistir ? pinGirdisi(`${k}-eski`, 'Şu anki PIN', `${k}-hata`) : null;
  const yeni = pinGirdisi(`${k}-yeni`, degistir ? 'Yeni PIN' : 'PIN', `${k}-ipucu ${k}-hata`);
  const tekrar = pinGirdisi(`${k}-tekrar`, degistir ? 'Yeni PIN (tekrar)' : 'PIN (tekrar)', `${k}-hata`);
  const hata = hataAlani(`${k}-hata`);
  const gonder = el('button', { type: 'submit', sinif: 'btn btn--birincil', metin: degistir ? 'PIN’i değiştir' : 'PIN’i oluştur ve aç' });
  const form = el('form', { sinif: 'veli-form', novalidate: true }, eski?.alan, yeni.alan, ipucu, tekrar.alan, hata, el('div', {}, gonder));
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hata.hidden = true;
    const ilkHata = pinHatasi(yeni.girdi.value, tekrar.girdi.value);
    if (ilkHata) { hataGoster(hata, ilkHata, ilkHata.includes('aynı değil') ? tekrar.girdi : yeni.girdi); return; }
    if (degistir) {
      gonder.disabled = true;
      const d = await pinDogrula(eski.girdi.value, { sorgu: true });
      gonder.disabled = false;
      if (!d.tamam) { hataGoster(hata, d.hata === 'bekle' ? beklemeMetni(d.kalanMs) : 'Şu anki PIN doğru değil.', eski.girdi); return; }
    }
    const s = pinKaydet(yeni.girdi.value, tekrar.girdi.value);
    if (!s.tamam) { hataGoster(hata, s.hata, yeni.girdi); return; }
    bitince?.();
  });
  return form;
}

const beklemeMetni = (ms) => `Çok sayıda yanlış deneme oldu. ${sureBicimle(Math.ceil(ms / 1000))} sonra yeniden deneyebilirsiniz.`;

function pinGirisFormu() {
  const k = `vg${++sira}`;
  const pin = pinGirdisi(`${k}-pin`, 'PIN', `${k}-hata ${k}-bekle`);
  const hata = hataAlani(`${k}-hata`);
  const bekle = el('p', { sinif: 'veli-bekleme', id: `${k}-bekle`, hidden: true }); // canlı bölge değil: her saniye okunmasın
  const gonder = el('button', { type: 'submit', sinif: 'btn btn--birincil', metin: 'Alanı aç' });
  const form = el('form', { sinif: 'veli-form', novalidate: true }, pin.alan, hata, bekle, el('div', {}, gonder));

  // Bekleme varsa girişi kapatır; true = hâlâ bekleniyor
  const guncelle = () => {
    const kalan = beklemeKalanMs();
    const bekliyor = kalan > 0;
    pin.girdi.disabled = bekliyor;
    gonder.disabled = bekliyor;
    bekle.hidden = !bekliyor;
    if (bekliyor) bekle.textContent = beklemeMetni(kalan);
    return bekliyor;
  };
  const beklemeyiGoster = () => {
    sayacDurdur();
    if (!guncelle()) return;
    duyur(beklemeMetni(beklemeKalanMs()));
    sayac = setInterval(() => {
      if (guncelle()) return;
      sayacDurdur();
      if (!form.isConnected) return;
      duyur('Yeniden deneyebilirsiniz.');
      pin.girdi.focus();
    }, 1000);
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hata.hidden = true;
    gonder.disabled = true;
    gonder.textContent = 'Denetleniyor…';
    const s = await pinDogrula(pin.girdi.value);
    gonder.disabled = false;
    gonder.textContent = 'Alanı aç';
    if (s.tamam) {
      duyur('Veli / Öğretmen alanı açıldı.');
      veliSayfasiCiz(kap);
      odakla(kap.querySelector('#veli-baslik'));
      return;
    }
    if (s.hata === 'bicim') { hataGoster(hata, `PIN ${PIN_UZUNLUK} rakamdan oluşur.`, pin.girdi); return; }
    if (s.hata === 'bekle') { beklemeyiGoster(); return; }
    pin.girdi.value = '';
    if (s.kalanMs > 0) { hata.hidden = true; beklemeyiGoster(); return; }
    hataGoster(hata, s.kalanHak > 0
      ? `PIN doğru değil. Bekleme olmadan ${s.kalanHak} deneme hakkı kaldı.`
      : 'PIN doğru değil.', pin.girdi);
  });
  queueMicrotask(beklemeyiGoster);
  return { form, odak: pin.girdi };
}

function unuttumBolumu() {
  const sifirla = el('button', { type: 'button', sinif: 'btn btn--hayalet tehlike-metin', metin: 'Alanı sıfırla' });
  sifirla.addEventListener('click', () => {
    if (!confirm('PIN, sınıf modu ve tüm profillerin veli/öğretmen hedefleri silinecek. Çocukların çalışma sonuçları silinmez. Ardından yeni bir PIN oluşturabilirsiniz. Devam edilsin mi?')) return;
    veliSifirla();
    toastGoster('Veli / Öğretmen alanı sıfırlandı. Yeni bir PIN oluşturun.', { tur: 'bilgi' });
    veliSayfasiCiz(kap);
  });
  return el('details', { sinif: 'veli-unuttum' },
    el('summary', { metin: 'PIN’i unuttum' }),
    el('p', { metin: 'PIN hiçbir yere gönderilmediği için geri getirilemez. Alanı sıfırlarsanız PIN, sınıf modu ve hedefler silinir; çalışma sonuçları kalır. Hedefler kaybolacağı için sıfırlama fark edilir.' }),
    sifirla);
}

function kapiCiz() {
  if (!pinVarMi()) {
    const form = pinFormu({ bitince: () => {
      toastGoster('PIN oluşturuldu.', { tur: 'basari' });
      veliSayfasiCiz(kap);
      odakla(kap.querySelector('#veli-baslik'));
    } });
    return { oge: el('section', { sinif: 'kart veli-kapi', 'aria-labelledby': 'veli-kapi-baslik' },
      el('h2', { id: 'veli-kapi-baslik', sinif: 'baslik-ikonlu' }, spriteIkon('kilit', 'ikon'), 'PIN oluşturun'),
      el('p', { metin: 'Bu alan bir yetişkin için. İlk kez açıyorsunuz; 4 haneli bir PIN belirleyin. Sonraki girişlerde bu PIN sorulur.' }),
      form,
      el('p', { sinif: 'alan__ipucu', metin: 'PIN bu cihazda, geri çevrilemeyen bir özet (karma) olarak saklanır. Bu kilit çocukların ayarları kazara değiştirmesini önler; cihazın tarayıcı verilerine erişebilen biri için tam bir güvenlik önlemi değildir.' })),
    odak: form.querySelector('input') };
  }
  const { form, odak } = pinGirisFormu();
  return { oge: el('section', { sinif: 'kart veli-kapi', 'aria-labelledby': 'veli-kapi-baslik' },
    el('h2', { id: 'veli-kapi-baslik', sinif: 'baslik-ikonlu' }, spriteIkon('kilit', 'ikon'), 'PIN gerekli'),
    el('p', { metin: `Devam etmek için PIN’i yazın. ${BEKLEME.serbestHata} yanlış denemeden sonra her yanlışta bekleme süresi uzar.` }),
    form, unuttumBolumu()),
  odak };
}

// ---------- Açık alan: profiller ----------
function hedefFormu(p, guncellendi) {
  const k = `vh${++sira}`;
  const h = veliHedefi(p.id);
  const secim = (id, etiket, bos, secenekler, deger) => el('div', { sinif: 'alan' },
    el('label', { sinif: 'alan__etiket', for: id, metin: etiket }),
    el('select', { sinif: 'girdi', id, name: id },
      el('option', { value: '', metin: bos, selected: deger == null }),
      secenekler.map((dk) => el('option', { value: String(dk), metin: `${dk} dk`, selected: deger === dk }))));
  const gunluk = secim(`${k}-gun`, 'Günlük süre önerisi', 'Öğrenci kendisi seçsin', GUNLUK_SECENEKLER, h.gunlukDk);
  const haftalik = secim(`${k}-hafta`, 'Haftalık hedef', 'Haftalık hedef yok', HAFTALIK_SECENEKLER, h.haftalikDk);
  const hata = hataAlani(`${k}-hata`);
  const form = el('form', { sinif: 'veli-form', novalidate: true },
    el('div', { sinif: 'veli-hedef__alanlar' }, gunluk, haftalik),
    el('p', { sinif: 'alan__ipucu', metin: 'Günlük öneri belirlenirse öğrenci kendi günlük hedefini değiştiremez. Haftalık hedef için günlük önerinin yaklaşık 5 katı (haftada 5 gün) iyi bir başlangıçtır. Kısa ve düzenli çalışma, uzun ve seyrek çalışmadan genellikle daha yararlıdır.' }),
    hata, el('div', {}, el('button', { type: 'submit', sinif: 'btn btn--birincil btn--kucuk', metin: 'Hedefleri kaydet' })));
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    hata.hidden = true;
    const deger = (alan) => (alan.querySelector('select').value === '' ? null : Number(alan.querySelector('select').value));
    const s = veliHedefiKaydet(p.id, { gunlukDk: deger(gunluk), haftalikDk: deger(haftalik) });
    if (!s.tamam) { hataGoster(hata, s.hata, haftalik.querySelector('select')); return; }
    toastGoster(`${p.takmaAd} için hedefler kaydedildi.`, { tur: 'basari' });
    guncellendi();
  });
  return el('details', { sinif: 'veli-hedef' }, el('summary', { metin: 'Hedefleri ayarla' }), form);
}

function profilKarti(p) {
  const o = profilOzeti(p);
  const baslikId = `veli-p-${p.id}`;
  const li = el('li', { sinif: 'kart veli-profil', 'aria-labelledby': baslikId });
  const hafta = o.haftalikHedefDk ? `${o.buHaftaDk} / ${o.haftalikHedefDk} dk` : `${o.buHaftaDk} dk`;
  const hedefSatiri = [
    `Günlük hedef ${o.gunlukHedefDk} dk${o.veliGunlukDk ? ' (sizin öneriniz)' : ' (öğrencinin seçimi)'}`,
    o.haftalikHedefDk ? `haftalık hedef ${o.haftalikHedefDk} dk` : 'haftalık hedef yok',
  ].join(', ');
  const ciz = () => li.replaceChildren(...profilKarti(p).childNodes);
  li.append(
    el('div', { sinif: 'veli-profil__ust' }, avatarOge(p.avatar),
      el('div', {}, el('h3', { id: baslikId, metin: p.takmaAd }), el('p', { sinif: 'soluk', metin: `${p.sinif}. sınıf` }))),
    el('ul', { sinif: 'mini-istatistik', 'aria-label': `${p.takmaAd} kısa özet` },
      el('li', {}, el('strong', { metin: `${o.son7Dk} dk` }), el('span', { metin: 'Son 7 gün' })),
      el('li', {}, el('strong', { metin: hafta }), el('span', { metin: 'Bu hafta' })),
      el('li', {}, el('strong', { metin: `${o.seri} gün` }), el('span', { metin: 'Seri' }))),
    el('p', { sinif: 'veli-profil__not' }, o.sonCalisma ? `Son çalışma: ${tarihMetni(o.sonCalisma)}. ` : 'Henüz çalışma yok. ',
      o.sonEoh != null ? `Son etkin okuma hızı ${o.sonEoh} k/dk${o.sonAnlama != null ? `, son anlama %${Math.round(o.sonAnlama)}` : ''}.` : ''),
    el('p', { sinif: 'alan__ipucu', metin: `${hedefSatiri}.` }),
    el('div', { sinif: 'veli-profil__eylemler' },
      el('a', { sinif: 'btn btn--ikincil btn--kucuk', href: `#/veli/rapor?profil=${encodeURIComponent(p.id)}` },
        spriteIkon('test', 'ikon ikon--kucuk'), 'Raporu aç', el('span', { sinif: 'ekran-okuyucu', metin: `: ${p.takmaAd}` }))),
    hedefFormu(p, () => {
      ciz();
      const ozet = li.querySelector('.veli-profil__ust h3');
      odakla(ozet);
    }));
  return li;
}

function profillerBolumu() {
  const profiller = profilleriGetir();
  return el('section', { sinif: 'yigin', 'aria-labelledby': 'veli-profiller-baslik', style: '--yigin-bosluk: var(--b-3)' },
    el('h2', { id: 'veli-profiller-baslik', metin: 'Profiller' }),
    el('p', { sinif: 'soluk', metin: 'Her öğrenci yalnızca kendi geçmişiyle karşılaştırılır; profiller arasında sıralama yapılmaz.' }),
    profiller.length
      ? el('ul', { sinif: 'veli-profiller' }, profiller.map(profilKarti))
      : el('p', { sinif: 'bos-durum', metin: 'Bu cihazda henüz profil yok. Öğrenci ilk açılışta bir profil oluşturur.' }));
}

// ---------- Sınıf modu, dışa aktarım, PIN ----------
function sinifModuBolumu() {
  const girdi = el('input', { type: 'checkbox', role: 'switch', checked: sinifModuAcikMi(), 'aria-describedby': 'veli-sinif-aciklama' });
  girdi.addEventListener('change', () => {
    if (!sinifModuAyarla(girdi.checked)) {
      girdi.checked = !girdi.checked;
      toastGoster('Sınıf modu kaydedilemedi.', { tur: 'uyari' });
      return;
    }
    toastGoster(girdi.checked ? 'Sınıf modu açıldı.' : 'Sınıf modu kapandı.', { tur: 'basari' });
  });
  return el('section', { sinif: 'kart ayar-bolumu', 'aria-labelledby': 'veli-sinif-baslik' },
    el('h2', { id: 'veli-sinif-baslik', metin: 'Sınıf modu' }),
    el('label', { sinif: 'anahtar' },
      el('span', {}, 'Sınıf modu ', el('small', { sinif: 'soluk', metin: '(bir cihazı birkaç öğrenci sırayla kullanırken)' })),
      girdi, el('span', { sinif: 'anahtar__ray', 'aria-hidden': 'true' })),
    el('ul', { sinif: 'veli-liste alan__ipucu', id: 'veli-sinif-aciklama' },
      el('li', { metin: 'Uygulama açılınca “Kim çalışıyor?” penceresi gelir; profiller büyük kutucuklarla seçilir. Profil düğmesiyle istenen an geçilir.' }),
      el('li', { metin: 'Öğrenciler profil ekleyemez, düzenleyemez, silemez; yedek yükleme ve veri silme düğmeleri gizlenir.' }),
      el('li', { metin: `Bir cihazda en çok 6 profil olabilir.` })));
}

function disaAktarimBolumu() {
  const dugme = (tur, metin, ikon = 'indir') => el('button', { type: 'button', sinif: 'btn btn--ikincil btn--kucuk', onclick: () => {
    const s = disaAktar(tur);
    if (s.tamam) toastGoster(`${s.ad} indirildi.`, { tur: 'basari' });
    else toastGoster(s.hata, { tur: 'hata' });
  } }, spriteIkon(ikon, 'ikon ikon--kucuk'), metin);
  return el('section', { sinif: 'kart ayar-bolumu', 'aria-labelledby': 'veli-disa-baslik' },
    el('h2', { id: 'veli-disa-baslik', metin: 'Dışa aktarım (tüm profiller)' }),
    el('div', { sinif: 'yedek-eylemler' },
      dugme('ozet', 'Özet (CSV)'), dugme('kayitlar', 'Tüm çalışmalar (CSV)'), dugme('json', 'Tüm veriler (JSON)')),
    el('ul', { sinif: 'veli-liste alan__ipucu' },
      el('li', { metin: 'CSV dosyaları Excel’de Türkçe harflerle açılır (ayraç noktalı virgül). Özet her profil için bir satırdır; çalışmalar dosyası her egzersiz turu için bir satırdır.' }),
      el('li', { metin: 'Dosyalarda takma ad, sınıf ve çalışma sonuçları bulunur; notlar, zihin haritaları ve kendi yazdıkları metinler bulunmaz. Paylaşırken dikkatli olun.' }),
      el('li', { metin: 'Bu dosyalar inceleme içindir, uygulamaya geri yüklenmez. Tam yedek için Ayarlar’daki “Yedeği indir”i kullanın.' })));
}

function pinBolumu() {
  const kilitle = el('button', { type: 'button', sinif: 'btn btn--hayalet', onclick: () => {
    veliKilitle();
    veliSayfasiCiz(kap);
    duyur('Alan kilitlendi.');
    odakla(kap.querySelector('#veli-kapi-baslik'));
  } }, spriteIkon('kilit', 'ikon'), 'Alanı kilitle');
  const degistir = pinFormu({ degistir: true, bitince: () => {
    toastGoster('PIN değiştirildi.', { tur: 'basari' });
    veliSayfasiCiz(kap);
  } });
  return el('section', { sinif: 'kart ayar-bolumu', 'aria-labelledby': 'veli-pin-baslik' },
    el('h2', { id: 'veli-pin-baslik', metin: 'PIN ve kilit' }),
    el('p', { sinif: 'alan__ipucu', metin: 'Alan; başka bir sayfaya geçince, sayfa yenilenince ya da 5 dakika işlem yapılmayınca kendiliğinden kilitlenir.' }),
    el('div', {}, kilitle),
    el('details', { sinif: 'veli-hedef' }, el('summary', { metin: 'PIN’i değiştir' }), degistir));
}

// ---------- Sayfalar ----------
/** #/veli */
export function veliSayfasiCiz(k) {
  kap = k;
  sayacDurdur();
  ilerlemeSayfasiniKapat();
  const geri = geriBaglanti('#/ayarlar', 'Ayarlara dön');
  if (!oturumAcikMi()) {
    hareketiIzle(false);
    const { oge, odak } = kapiCiz();
    kap.replaceChildren(geri, sayfaUst(), oge);
    if (document.activeElement === document.body || !kap.contains(document.activeElement)) odak?.focus({ preventScroll: true });
    return;
  }
  hareketiIzle(true);
  kap.replaceChildren(geri, sayfaUst(), profillerBolumu(), sinifModuBolumu(), disaAktarimBolumu(), pinBolumu());
}

// ---------- Profil raporu ek bölümleri ----------
function hedefRaporu(p) {
  const h = veliHedefi(p.id);
  const gecmis = haftaGecmisi(p.id, 4);
  return el('section', { sinif: 'yigin', 'aria-labelledby': 'veli-r-hedef', style: '--yigin-bosluk: var(--b-3)' },
    el('h2', { id: 'veli-r-hedef', metin: 'Hedefler ve haftalık süre' }),
    raporTablosu('Veli / öğretmen hedefleri', ['Hedef', 'Değer'], [
      ['Günlük süre önerisi', h.gunlukDk ? `${h.gunlukDk} dk` : 'Belirlenmedi (öğrenci seçiyor)'],
      ['Haftalık hedef', h.haftalikDk ? `${h.haftalikDk} dk` : 'Belirlenmedi'],
    ]),
    raporTablosu('Son 4 hafta (pazartesi-pazar)', ['Hafta', 'Çalışma süresi', 'Haftalık hedef'], gecmis.map((g) => [
      `${kisaGun(g.bas)} – ${kisaGun(g.bit)}${g.buHafta ? ' (bu hafta, sürüyor)' : ''}`,
      `${g.dk} dk`,
      !h.haftalikDk ? '—' : g.dk >= h.haftalikDk ? 'Tuttu' : g.buHafta ? 'Sürüyor' : 'Henüz değil',
    ])),
    el('p', { sinif: 'alan__ipucu', metin: 'Geçmiş haftalar bugünkü haftalık hedefle karşılaştırılır.' }));
}

function testRaporu(p) {
  const v = testVerisi(p.id);
  const ust = el('h2', { id: 'veli-r-test', metin: 'Seviye testi' });
  const govde = !v.baslangic
    ? [el('p', { sinif: 'soluk', metin: 'Seviye testi henüz yapılmadı.' })]
    : [raporTablosu(`Başlangıç ${gunMetni(v.baslangic.gun)}${v.final ? `, final ${gunMetni(v.final.gun)}` : ''}`, ['Alan', 'Başlangıç', 'Final'],
      karsilastir(v.baslangic, v.final).map((s) => [s.eksen.etiket, s.once ?? 'ölçülmedi', v.final ? (s.sonra ?? 'ölçülmedi') : 'henüz yok'])),
    el('p', { sinif: 'alan__ipucu', metin: `Puanlar herkes için aynı sabit ölçekte (0-100). ${DEGISIM_ESIGI} puandan küçük farklar benzer sayılır; tek ölçüm günden güne oynayabilir.` }),
    ...okumaOlcumleri(v.baslangic, v.final)];
  return el('section', { sinif: 'yigin', 'aria-labelledby': 'veli-r-test', style: '--yigin-bosluk: var(--b-3)' }, ust, ...govde);
}

// S35a: iki okuma ölçümü ayrı tablo ve etiketle; yeniden okuma farkı asıl gelişim gibi sunulmaz
const farkli = (x) => (x ? `${x.once} → ${x.sonra} (${x.fark > 0 ? '+' : ''}${x.fark})` : '—');
function okumaOlcumleri(b, f) {
  const o = gelisimOzeti(b, f);
  if (!o) return [];
  const e = o.esdeger;
  const parca = [raporTablosu(e.ayniMetin ? 'Okuma: başlangıç ve final (aynı metin)' : 'Okuma: eşdeğer metinle karşılaştırma (asıl gelişim ölçüsü)',
    ['Ölçü', 'Başlangıç → final'], [
      ['Okuma hızı (k/dk)', farkli(e.wpm)],
      ['Anlama (%)', farkli(e.anlama)],
      ['Etkin okuma hızı (k/dk)', farkli(e.eoh)],
    ])];
  parca.push(el('p', { sinif: 'alan__ipucu', metin: e.ayniMetin
    ? 'Bu dönemde final, başlangıçla aynı metinle yapıldı (eşdeğer metin bulunamadı).'
    : 'Final, başlangıçtakine eşdeğer başka bir metinle yapılır (aynı tür, benzer uzunluk, aynı soru tipleri); radar ve kurs bu ölçümü kullanır.' }));
  // S35a-d: yeniden okuma yapılmadıysa da tablo görünür (veli adımın varlığını bilsin); yapılmama nedeni yazılır
  const yok = e.ayniMetin ? 'Bu dönemde yok (final aynı metinle yapıldı)'
    : !b.okuma ? 'Yok (başlangıçta okuma ölçülmedi)'
      : 'Yapılmadı (isteğe bağlı adım)';
  parca.push(raporTablosu('Aynı metni yeniden okuma (ayrı ölçüm, puanlara girmez)', ['Ölçü', 'Başlangıçta → yeniden okumada'],
    [['Okuma hızı (k/dk)', o.tekrar ? farkli(o.tekrar) : yok]]),
  el('p', { sinif: 'alan__ipucu', metin: o.tekrar
    ? 'Öğrenci finalin sonunda başlangıç metnini isteğe bağlı olarak yeniden okudu. Metin tanıdık olduğu için hızın artması beklenir; bu fark asıl gelişim ölçüsü değildir.'
    : 'Finalin sonunda öğrenci isterse başlangıç metnini yeniden okuyabilir. Bu adım isteğe bağlıdır ve puanları etkilemez.' }));
  return parca;
}

function kursRaporu(p) {
  const k = kursOzetiKisa(p.id);
  return el('section', { sinif: 'yigin', 'aria-labelledby': 'veli-r-kurs', style: '--yigin-bosluk: var(--b-3)' },
    el('h2', { id: 'veli-r-kurs', metin: 'Akıllı Kurs' }),
    !k ? el('p', { sinif: 'soluk', metin: 'Akıllı Kurs henüz başlatılmadı.' })
      : raporTablosu('Kurs özeti', ['Bilgi', 'Değer'], [
        ['Başlangıç', gunMetni(k.baslangic)],
        ['Tamamlanan gün', `${k.tamamlananGun} / ${k.toplamGun}`],
        ['Durum', k.bitti ? 'Bitti' : `Sürüyor (${k.kursGunu}. gün)`],
        ['Başlangıç okuma hızı', k.baslangicWpm ? `${k.baslangicWpm} k/dk` : '—'],
        ['Şu anki hedef hız', k.hedefWpm ? `${k.hedefWpm} k/dk` : '—'],
      ]),
    ...(k ? karneRaporu(p) : []));
}

// S35c: kurs karnesi (ilk gün ve son sonuç; yalnız bu kursun dersleri, farklı seviye/kademe karşılaştırılmaz)
function karneRaporu(p) {
  const satirlar = karneSatirlari(kursVerisi(p.id), kayitlariGetir(p.id));
  if (!satirlar.length) return [el('p', { sinif: 'soluk', metin: 'Kurs karnesi: kurs dersleri yapıldıkça her çalışmanın ilk ve son sonucu burada görünür.' })];
  const oz = karneOzeti(satirlar);
  return [
    raporTablosu(`Kurs karnesi: ilk gün ve son (${oz.toplam} çalışma; ${oz.gelisen} çalışmada ileride ya da seviye yükseldi)`,
      ['Çalışma', 'Ölçü', 'İlk gün', 'Son', 'Değişim'], karneRaporSatirlari(satirlar)),
    el('p', { sinif: 'alan__ipucu', metin: '▲ ileride, ≈ yakın, • henüz altında. Yalnız öğrencinin kendi sonuçları karşılaştırılır; seviye değiştiyse fark son seviyedeki ilk sonuçla hesaplanır. Tek bir sonuç günden güne değişebilir; seviye testi karneye girmez.' }),
  ];
}

/** #/veli/rapor?profil=<id> (yalnız alan açıkken; değilse PIN kapısına döner) */
export function veliRaporuCiz(k, sorgu = {}) {
  raporKap = k;
  sayacDurdur();
  if (!oturumAcikMi()) { k.replaceChildren(); git('/veli', { degistir: true }); return; }
  hareketiIzle(true);
  const p = profilleriGetir().find((x) => x.id === sorgu.profil);
  if (!p) {
    ilerlemeSayfasiniKapat();
    k.replaceChildren(geriBaglanti('#/veli', 'Veli / Öğretmen alanına dön'),
      el('p', { sinif: 'bos-durum', metin: 'Bu profil bulunamadı; silinmiş olabilir.' }));
    return;
  }
  ilerlemeRaporuCiz(k, {
    profil: p, geriAdres: '#/veli', geriMetni: 'Veli / Öğretmen alanına dön',
    ekBolumler: [hedefRaporu(p), testRaporu(p), kursRaporu(p)],
  });
}
