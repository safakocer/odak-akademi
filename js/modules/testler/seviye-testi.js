// Seviye Belirleme Testi sayfası (S17, #/testler): 5 adım (okuma+anlama, Dokun ya da Bekle, Rakam Dizisi, Görme Alanı Flaşı, odak öz değerlendirmesi), profil radarı, başlangıç/final karşılaştırması
// S34d: 2-8. sınıf; kademe akışı data/tests/seviye-testi.json akislar’dan (ilkokulda kısa yönergeli 3-4 adım), egzersizi sınıfa uygun olmayan adım atlanır, okuma hızı ölçeği sınıf bandından
// S34-son: akış adımında ornek (egzersizin görsel örneği), alistirma (kaydedilmeyen kısa deneme; olcum alanlarının üstüne) ve bantli (sınıfın egzersiz bandı; sonuç bantli listesine yazılır, final aynı koşulla)
// S35a: eşdeğer form A/B (final başlangıcın diğer formuyla; yeni dönemde formlar yer değiştirir), finalde isteğe bağlı “İlk metnine dön” (yalnız hız, tekrarOkuma alanına; puanlara karışmaz), karşılaştırma ekranı ve çocukta Fener
import { el } from '../../core/ui.js';
import { odakla, duyur } from '../../core/a11y.js';
import { etkinProfil } from '../../core/store.js';
import { sesCal } from '../../core/sound.js';
import { gunAnahtari, tarihMetni, sayiBicimle } from '../../core/utils.js';
import { eohHesapla } from '../../core/metrics.js';
import { metniGrupla, okumaMotoruOlustur, okumaAlaniOlustur, okumaAyarlariniGetir, WPM_SINIR } from '../../engine/reader-engine.js';
import { soruOturumuKur, ANLAMA_ESIGI } from '../../engine/quiz-engine.js';
import { radarOlustur } from '../../engine/radar.js';
import { egzersizYukle, egzersizBilgisi, aracBilgisi, kartUygunMu } from '../katalog.js';
import { bantlariYukle, egzersizBandi, seviyeleriUyarla } from '../../core/siniflar.js';
import { cocukGorunumuMu } from '../../core/hesap.js';
import { fenerBalonu } from '../../engine/fener.js';
import { karsilastirmaMesaji } from '../../engine/fener-mesajlari.js';
import {
  EKSENLER, OLCEK, FINAL_GUN, YENILEME_GUN, testDurumu, sonucKaydet, yeniDonem, guclulukOzeti, karsilastir, hamMetin, sinifOlcegi, sonucOlcegi,
  FORMLAR, formGecerli, testFormu, gelisimOzeti,
} from './test-veri.js';

const OKUMA_EN_AZ_MS = 8000;     // bundan önce “Bitirdim” okumayı bitirmez (yanlışlıkla dokunma)
const OKUMA_SINIR_MS = 240000;   // 4 dk: test 12 dakikayı aşmasın; dolunca okuma biter, sorular gelir

// Varsayılan akış (5-8. sınıf). Ölçüm adımları: egzersiz dosyaları olduğu gibi kullanılır; olcum alanı sabit ayar verir (önceki kayıtlar kullanılmaz, final aynı koşulda yapılır)
const ADIMLAR = Object.freeze([
  { ad: 'okuma', baslik: 'Oku ve anla', sure: '3-4 dk', kisa: 'Kısa bir metin ve 4 soru',
    aciklama: 'Kısa bir metni her zamanki hızında, anlayarak oku. Bitirince “Bitirdim”e bas; ardından 4 soru gelecek.',
    ipuclari: ['Süre ekranda görünmez; acele etme, anlayarak okumak hızdan önemli.', 'Sorular sırasında metin görünmez, aklında kalanlarla yanıtla.'] },
  { ad: 'dikkat', egzersiz: 'git-dur', zorluk: 2, olcum: { deneme: 28 }, baslik: 'Dokun ya da Bekle', sure: '1 dk', kisa: 'Yalnız yıldıza dokun',
    aciklama: 'Ortada şekiller tek tek belirecek. Yalnız yıldızı görünce kutuya dokun ya da Boşluk tuşuna bas; başka şekillerde bekle.',
    ipuclari: ['Yaklaşık 1 dakika sürer.', 'Beklemek de bir beceri: emin değilsen dokunma.'] },
  { ad: 'hafiza', egzersiz: 'rakam-dizisi', zorluk: 2, olcum: { mod: 'ileri', baslangic: 3, deneme: 8 }, baslik: 'Rakam Dizisi', sure: '2 dk', kisa: 'Rakamları aynı sırayla gir',
    aciklama: 'Rakamlar tek tek görünecek. Sıra sana gelince aynı sırayla tuş takımından gir. Doğru yaptıkça dizi uzar.',
    ipuclari: ['8 dizi gösterilir; 3 rakamla başlar.', 'Rakamları ikişer üçer gruplayıp içinden tekrar etmek işe yarar.'] },
  { ad: 'gorme', egzersiz: 'periferik-flas', zorluk: 2, olcum: { oge: 'rakam', baslangicMs: 400, deneme: 12 }, baslik: 'Görme Alanı Flaşı', sure: '1 dk', kisa: 'Çevrede beliren sayıyı yakala',
    aciklama: 'Gözün ortadaki artıda (+) kalsın. Çevrede bir an için bir sayı belirecek; ne gördüğünü dört seçenekten seç.',
    ipuclari: ['12 deneme var. Doğru gördükçe flaş kısalır.', 'Emin değilsen tahmin et; sorun değil.'] },
  { ad: 'oz', baslik: 'Odak hakkında 3 soru', sure: '1 dk', kisa: 'Kendini değerlendir',
    aciklama: 'Ders çalışırken nasıl olduğunu düşün. Doğru ya da yanlış cevap yok; sana en uygun olanı seç.',
    ipuclari: ['Bu bölüm radara girmez, ayrıca gösterilir.'] },
].map(Object.freeze));

// Varsayılan akışın sayfa metinleri ({gun}: final günü); kademe akışı (seviye-testi.json akislar) bunları değiştirebilir
const AKIS_METINLERI = Object.freeze({
  sure: 'yaklaşık 10 dakika',
  giris: 'Kısa adımlarla okuma, anlama, dikkat, hafıza ve görme alanındaki bugünkü noktanı görürsün. {gun} gün sonra testi eşdeğer bir metinle yeniden yapıp yalnızca kendi sonuçlarınla karşılaştırırsın.',
  hazirlik: 'Sessiz bir yer seç, bildirimleri kapat. Her adımdan önce hazır olduğunda “Başla”ya basarsın; zorlandığın bir adımı atlayabilirsin.',
  adimNotu: 'Hazır olduğunda başla. Adımlar arasında istediğin kadar dinlenebilirsin.',
});
// Akış dosyasının bir adımda değiştirebileceği alanlar ve türleri (egzersiz adı değiştirilemez). S34-son: ornek, alistirma, bantli
const ADIM_ALANLARI = Object.freeze({
  baslik: 'metin', sure: 'metin', kisa: 'metin', aciklama: 'metin', ipuclari: 'liste', zorluk: 'sayi', olcum: 'nesne',
  ornek: 'bool', alistirma: 'nesne', bantli: 'bool',
});

const OZ_SORULAR = Object.freeze([
  { metin: 'Ders çalışırken aklım başka şeylere kayar.', ters: true },
  { metin: 'Bir işe başlayınca bitirene kadar sürdürebilirim.', ters: false },
  { metin: 'Yanımda telefon ya da tablet varken çalışmaya sık sık ara veririm.', ters: true },
]);
const OZ_SECENEKLER = Object.freeze(['Hiçbir zaman', 'Bazen', 'Sık sık', 'Neredeyse her zaman']);

let oturum = null; // süren test: { profilId, bitti, durdur() }
let sayac = 0;

// ---------- Stil ve veri yükleme ----------
// exercise.css çerçeve açılınca da yüklenir; test çerçeve dışında çalıştığı için gerekirse burada eklenir (aynı adresse iki kez eklenmez)
const stilSozleri = new Map();
function stilYukle(yol) {
  const href = new URL(`../../../${yol}`, import.meta.url).href;
  if ([...document.querySelectorAll('link[rel="stylesheet"]')].some((l) => l.href === href)) return Promise.resolve();
  if (!stilSozleri.has(href)) {
    stilSozleri.set(href, new Promise((coz) => {
      const l = el('link', { rel: 'stylesheet', href });
      l.addEventListener('load', coz);
      l.addEventListener('error', coz);
      document.head.append(l);
    }));
  }
  return stilSozleri.get(href);
}

// Egzersiz tanımındaki ek stil (tanim.stil) bir kez eklenir
function tanimStili(tanim) {
  if (!tanim.stil || document.querySelector(`style[data-test-stil="${tanim.egzersiz}"]`)) return;
  document.head.append(el('style', { 'data-test-stil': tanim.egzersiz, metin: tanim.stil }));
}

// Test dosyası: { metinler: [], akislar: {} } (yüklenemezse boş; okuma adımı atlanır, varsayılan akış kullanılır)
let dosyaSozu = null;
let dosya = null;
function testDosyasi() {
  dosyaSozu ??= fetch(new URL('../../../data/tests/seviye-testi.json', import.meta.url))
    .then((y) => { if (!y.ok) throw new Error(`HTTP ${y.status}`); return y.json(); })
    .then((v) => ({
      metinler: Array.isArray(v?.metinler) ? v.metinler : [],
      akislar: v?.akislar && typeof v.akislar === 'object' ? v.akislar : {},
    }))
    .catch((h) => { console.error('[seviye-testi] test dosyası yüklenemedi:', h); dosyaSozu = null; return { metinler: [], akislar: {} }; });
  return dosyaSozu.then((d) => { dosya = d; return d; });
}

// S35a: metnin formu (form alanı olmayan metin A sayılır) ve kimlikten form çözücü (S35a öncesi sonuçlar için)
const metinFormuAl = (m) => (formGecerli(m?.form) ? m.form : FORMLAR[0]);
const formCozucu = (d) => (kimlik) => { const m = d?.metinler.find((x) => x.kimlik === kimlik); return m ? metinFormuAl(m) : null; };

/**
 * S35a: Sınıfın istenen formdaki metni; yoksa yedek (final: başlangıçtaki metin, aynı metin olur), o da yoksa sınıfın herhangi bir metni.
 * Kullanılan metnin formu sonuca yazılır; karşılaştırma ekranı aynı metin kullanıldıysa bunu ayrıca belirtir.
 */
function testMetni(d, { sinif, form, yedekKimlik = null }) {
  const liste = d.metinler;
  const s = Number(sinif);
  return liste.find((m) => m.sinif === s && metinFormuAl(m) === form)
    ?? liste.find((m) => m.kimlik === yedekKimlik)
    ?? liste.find((m) => m.sinif === s) ?? liste[0] ?? null;
}
const metinAdi = (d, kimlik) => d?.metinler.find((m) => m.kimlik === kimlik)?.ad ?? null;

const turUygun = (v, tur) => (tur === 'metin' ? typeof v === 'string' && v.trim() !== ''
  : tur === 'liste' ? Array.isArray(v) && v.every((x) => typeof x === 'string')
    : tur === 'sayi' ? Number.isInteger(v) && v >= 1
      : tur === 'bool' ? typeof v === 'boolean'
        : !!v && typeof v === 'object' && !Array.isArray(v));

/**
 * S34d: Sınıfın test akışı: { sure, giris, hazirlik, adimNotu, adimlar }. Akış dosyasında sınıfı içeren akış varsa adımları ve metinleri ondan
 * (yazılmayan alan varsayılandan; olcum alan alan birleşir), yoksa varsayılan 5 adım. Egzersizi bu sınıfa uygun olmayan adım (katalog aralığı) çıkar.
 */
function akisKur(d, sinif) {
  const ek = Object.values(d?.akislar ?? {}).find((a) => Array.isArray(a?.siniflar) && a.siniflar.includes(Number(sinif))) ?? null;
  const metin = (k) => (turUygun(ek?.[k], 'metin') ? ek[k] : AKIS_METINLERI[k]);
  let adimlar = ADIMLAR;
  if (Array.isArray(ek?.adimlar)) {
    const ozel = ek.adimlar.map((a) => {
      const temel = ADIMLAR.find((x) => x.ad === a?.ad);
      if (!temel) return null;
      const y = { ...temel };
      for (const [k, tur] of Object.entries(ADIM_ALANLARI)) {
        if (a[k] === undefined) continue;
        if (!turUygun(a[k], tur)) { console.warn('[seviye-testi] akış alanı yok sayıldı:', a.ad, k); continue; }
        y[k] = k === 'olcum' ? Object.freeze({ ...(temel.olcum ?? {}), ...a.olcum }) : a[k];
      }
      return Object.freeze(y);
    }).filter(Boolean);
    if (ozel.length) adimlar = ozel;
  }
  adimlar = adimlar.filter((a) => !a.egzersiz || kartUygunMu(egzersizBilgisi(a.egzersiz), sinif));
  return { sure: metin('sure'), giris: metin('giris'), hazirlik: metin('hazirlik'), adimNotu: metin('adimNotu'), adimlar };
}

// ---------- Egzersizleri çerçeve dışında çalıştıran küçük bağlam ----------
/*
 * Egzersiz dosyalarının beklediği ctx: alan, seviye, zorluk, ekstra, olcum, sonra(fn, ms) → iptal(), aktifMi(), gecenSn(),
 * temizlenince(fn), dogru(), yanlis(), ses(tur), bitir(). Sekme gizlenince zamanlayıcılar durur, oyun saati işlemez
 * (dikkat ve hafıza motorları bu farkı “kesinti” sayıp denemeyi yineler). Kayıt yapılmaz.
 */
function adimBaglami({ alan, seviye, zorluk, olcum, bant = null }) {
  let bitti = false;
  let duraklatildi = document.hidden;
  let oyunMs = 0;
  let sonAn = performance.now();
  let dogru = 0;
  let yanlis = 0;
  let coz;
  const sonuc = new Promise((r) => { coz = r; });
  const zamanlayicilar = new Set();
  const temizleyiciler = [];

  const saat = () => {
    if (!duraklatildi) { const s = performance.now(); oyunMs += s - sonAn; sonAn = s; }
    return oyunMs;
  };
  function kur(z) {
    z.bas = saat();
    z.id = setTimeout(() => { zamanlayicilar.delete(z); if (!bitti) z.fn(); }, Math.max(0, z.kalan));
  }
  function gorunurluk() {
    if (bitti) return;
    if (document.hidden && !duraklatildi) {
      saat();
      duraklatildi = true;
      zamanlayicilar.forEach((z) => { clearTimeout(z.id); z.kalan -= oyunMs - z.bas; });
    } else if (!document.hidden && duraklatildi) {
      duraklatildi = false;
      sonAn = performance.now();
      zamanlayicilar.forEach(kur);
    }
  }
  document.addEventListener('visibilitychange', gorunurluk);

  function kapat(deger) {
    if (bitti) return;
    bitti = true;
    document.removeEventListener('visibilitychange', gorunurluk);
    zamanlayicilar.forEach((z) => clearTimeout(z.id));
    zamanlayicilar.clear();
    temizleyiciler.splice(0).forEach((fn) => { try { fn(); } catch (h) { console.error('[seviye-testi] temizlik:', h); } });
    coz(deger);
  }

  const ctx = {
    alan, seviye, zorluk, olcum, bant, ekstra: {}, sonuc,
    sonra(fn, ms = 0) {
      const z = { fn, kalan: ms };
      zamanlayicilar.add(z);
      if (!duraklatildi) kur(z); else z.bas = oyunMs;
      return () => { clearTimeout(z.id); zamanlayicilar.delete(z); };
    },
    aktifMi: () => !bitti && !duraklatildi,
    gecenSn: () => saat() / 1000,
    temizlenince: (fn) => { temizleyiciler.push(fn); },
    dogru: () => { dogru += 1; },
    yanlis: () => { yanlis += 1; },
    ses: (tur) => sesCal(tur),
    bitir: () => kapat({ ekstra: { ...ctx.ekstra }, dogru, yanlis, sureSn: Math.round(saat() / 1000) }),
    iptal: () => kapat(null),
  };
  return ctx;
}

// ---------- Adım ekranları ----------
// S34-son: adimOrnegi: egzersizin görsel örneği (Node | null); adim.alistirma varsa “Önce alıştırma yap” → 'alistirma'
function adimGirisi(govde, adim, calisma, onceki, adimNotu, adimOrnegi = null) {
  return new Promise((coz) => {
    const bitir = (secim) => { calisma.durdur = null; coz(secim); };
    calisma.durdur = () => bitir('iptal');
    const baslik = el('h2', { metin: adim.baslik });
    govde.replaceChildren(el('section', { sinif: 'test-adim' },
      onceki ? el('p', { sinif: 'test-adim__onceki', metin: onceki }) : null,
      baslik,
      el('p', { metin: adim.aciklama }),
      adimOrnegi instanceof Node ? el('figure', { sinif: 'egz-ornek' }, el('figcaption', { metin: 'Örnek' }), adimOrnegi) : null,
      el('ul', {}, adim.ipuclari.map((m) => el('li', { metin: m }))),
      el('p', { sinif: 'test-not', metin: adimNotu }),
      el('div', { sinif: 'test-eylemler' },
        el('button', { type: 'button', sinif: 'btn btn--birincil btn--buyuk', metin: 'Başla', onclick: () => bitir('basla') }),
        adim.alistirma ? el('button', { type: 'button', sinif: 'btn btn--ikincil', onclick: () => bitir('alistirma') },
          'Önce alıştırma yap', el('small', { metin: ' (kaydedilmez)' })) : null,
        el('button', { type: 'button', sinif: 'btn btn--hayalet', metin: 'Bu adımı atla', onclick: () => bitir('atla') }))));
    odakla(baslik);
  });
}

// S34-son: adımın egzersiz tanımı ve seviyesi; bantli ise sınıfın egzersiz bandı uygulanır (çerçevedeki gibi seviyeleriUyarla)
async function adimHazirla(adim, sinif, bantli) {
  const tanim = adim.egzersiz ? await egzersizYukle(adim.egzersiz) : null;
  if (!tanim?.baslat) return { tanim: null, seviye: null, bant: null };
  const bant = bantli ? egzersizBandi(adim.egzersiz, sinif) : null;
  const seviyeler = seviyeleriUyarla(tanim.seviyeler ?? [], bant);
  const sira = Math.min(Math.max(1, adim.zorluk ?? 1), seviyeler.length || 1);
  return { tanim, seviye: seviyeler[sira - 1], bant };
}

function adimOrnegiOlustur(adim, h) {
  if (!adim.ornek || typeof h?.tanim?.ornek !== 'function') return null;
  tanimStili(h.tanim);
  try { return h.tanim.ornek({ seviye: { ...h.seviye }, bant: h.bant }) ?? null; } catch (e) { console.error('[seviye-testi] örnek:', e); return null; }
}

// Egzersiz dosyasını sabit ayarla çalıştırır → { ekstra, dogru, yanlis } | { atlandi } | null (iptal)
// S34-son: h = adimHazirla sonucu (tanım, seviye, bant); alistirma: true → olcum'un üstüne adim.alistirma, üstte “kaydedilmez” notu
async function olcumAdimi(govde, adim, calisma, h, { alistirma = false } = {}) {
  await stilYukle('css/exercise.css');
  const tanim = h?.tanim;
  if (calisma.bitti) return null;
  if (!tanim?.baslat) return { atlandi: true };
  tanimStili(tanim);
  const alan = el('div', { sinif: 'egz-alan test-alan', tabindex: '-1', role: 'group', 'aria-label': tanim.alanEtiketi ?? adim.baslik });
  govde.replaceChildren(...[alistirma && el('p', { sinif: 'rozet rozet--gunes', metin: 'Alıştırma turu · kaydedilmez' }), alan].filter(Boolean));
  const olcum = alistirma ? Object.freeze({ ...(adim.olcum ?? {}), ...adim.alistirma }) : adim.olcum;
  const ctx = adimBaglami({ alan, seviye: h.seviye, zorluk: adim.zorluk, olcum, bant: h.bant });
  calisma.durdur = () => ctx.iptal();
  odakla(alan);
  try { tanim.baslat(ctx); } catch (h) {
    console.error('[seviye-testi] adım başlatılamadı:', adim.egzersiz, h);
    ctx.iptal();
    return { atlandi: true };
  }
  const sonuc = await ctx.sonuc;
  calisma.durdur = null;
  return sonuc;
}

// Okuma ekranı: perde → metin (süre görünmez) → “Bitirdim”. Döner: { okuma: { wpm, kelime, sureSn, sureDoldu?, hizliGecis? }, ayar } | null (iptal)
// S35a: okuma adımı ve “İlk metnine dön” ortak kullanır; sorular çağırana aittir
function metniOku(govde, metin, calisma, { ust = null } = {}) {
  return new Promise((coz) => {
    const ayar = okumaAyarlariniGetir();
    const gruplar = metniGrupla(metin.metin, ayar);
    const motor = okumaMotoruOlustur({ gruplar, mod: 'serbest', wpm: ayar.wpm });
    let saat = 0;
    let bitti = false;
    const kapat = (sonuc) => {
      if (bitti) return;
      bitti = true;
      clearInterval(saat);
      motor.iptal();
      calisma.durdur = null;
      coz(sonuc);
    };
    calisma.durdur = () => kapat(null);

    const baslik = el('h2', { metin: metin.ad });
    const not = el('p', { sinif: 'test-not', 'aria-live': 'polite' });
    const okumaAlani = okumaAlaniOlustur(gruplar, { ayar, etiket: metin.ad });
    const metinKutusu = el('div', { hidden: true }, okumaAlani.kok);
    const baslaDugme = el('button', { type: 'button', sinif: 'btn btn--birincil btn--buyuk btn--blok', metin: 'Okumaya başla', onclick: basla });
    const bitirDugme = el('button', { type: 'button', sinif: 'btn btn--birincil btn--buyuk btn--blok', metin: 'Bitirdim', hidden: true, onclick: () => okumaBitti(false) });
    const perde = el('div', { sinif: 'test-perde' },
      el('p', { metin: 'Metin, düğmeye basınca görünecek. Süre o an başlar ve ekranda gösterilmez.' }), baslaDugme);
    govde.replaceChildren(el('section', { sinif: 'test-okuma' }, ust, baslik, perde, metinKutusu, not, bitirDugme));
    odakla(baslik);

    function basla() {
      perde.hidden = true;
      metinKutusu.hidden = false;
      bitirDugme.hidden = false;
      motor.baslat();
      odakla(okumaAlani.kok);
      saat = setInterval(() => { if (motor.gecenMs() >= OKUMA_SINIR_MS) okumaBitti(true); }, 1000);
    }

    function okumaBitti(sureDoldu) {
      if (bitti) return;
      if (!sureDoldu && motor.gecenMs() < OKUMA_EN_AZ_MS) {
        not.textContent = 'Metnin sonuna gelince “Bitirdim”e bas.';
        return;
      }
      clearInterval(saat);
      const o = motor.bitir();
      if (!o) return;
      const okuma = { wpm: o.wpm, kelime: o.toplamKelime, sureSn: o.sureSn };
      if (sureDoldu) okuma.sureDoldu = true;
      if (o.wpm > WPM_SINIR.enCok) okuma.hizliGecis = true;
      kapat({ okuma, ayar });
    }
  });
}

async function okumaAdimi(govde, metin, calisma) {
  const r = await metniOku(govde, metin, calisma);
  if (!r || calisma.bitti) return null;
  return new Promise((coz) => {
    let soruOturumu = null;
    let bitti = false;
    const kapat = (sonuc) => {
      if (bitti) return;
      bitti = true;
      soruOturumu?.iptal();
      calisma.durdur = null;
      coz(sonuc);
    };
    calisma.durdur = () => kapat(null);
    const kap = el('div', { sinif: 'test-sorular' });
    govde.replaceChildren(kap);
    if (r.okuma.sureDoldu) duyur('Okuma süresi doldu. Şimdi sorulara geçiyoruz.');
    soruOturumu = soruOturumuKur(kap, {
      sorular: metin.sorular, metin: metin.metin, ayar: r.ayar, metinGorunur: false, giris: true,
      bitince: ({ anlama: a }) => kapat({
        okuma: r.okuma,
        anlama: {
          yuzde: a.yuzde, dogru: a.dogruSayisi, soru: a.soruSayisi,
          katman: Object.fromEntries(Object.entries(a.katmanlar).map(([k, v]) => [k, v.yuzde])),
        },
      }),
    });
  });
}

// S35a: “İlk metnine dön” (finalden sonra, isteğe bağlı): başlangıç metni yeniden okunur, yalnız hız ölçülür, soru yok.
// Adım ekranı adimGirisi ile; döner: { metin, wpm, kelime, sureSn, sureDoldu?, hizliGecis? } | { atlandi: true } | null (iptal)
const TEKRAR_ADIMI = Object.freeze({
  baslik: 'Ek adım: İlk metnine dön',
  aciklama: 'İstersen başlangıç testinde okuduğun metni yeniden oku. Yalnız okuma hızın ölçülür; soru yok.',
  ipuclari: Object.freeze([
    'Metni daha önce okuduğun için tanıdık gelecek; sonuç “Aynı metni yeniden okudun” diye ayrı gösterilir.',
    'Bu ölçüm final puanlarına, radara ve kursa karışmaz.',
  ]),
});
async function tekrarOkumaAdimi(govde, metin, calisma, onceki, adimNotu) {
  const secim = await adimGirisi(govde, TEKRAR_ADIMI, calisma, onceki, adimNotu);
  if (calisma.bitti || secim === 'iptal') return null;
  if (secim === 'atla') return { atlandi: true };
  const ust = el('p', { sinif: 'rozet rozet--gunes', metin: 'Aynı metni yeniden okuyorsun · puanlara girmez' });
  const r = await metniOku(govde, metin, calisma, { ust });
  return r ? { metin: metin.kimlik, ...r.okuma } : null;
}

function ozAdimi(govde, calisma) {
  return new Promise((coz) => {
    const bitir = (sonuc) => { calisma.durdur = null; coz(sonuc); };
    calisma.durdur = () => bitir(null);
    const id = `test-oz-${++sayac}`;
    const hata = el('p', { sinif: 'test-oz__hata', role: 'alert', hidden: true });
    const baslik = el('h2', { metin: 'Odak hakkında 3 soru' });
    const form = el('form', { sinif: 'test-oz', novalidate: true },
      el('p', { metin: 'Doğru ya da yanlış cevap yok. Son haftalarını düşünerek sana en uygun olanı seç.' }),
      OZ_SORULAR.map((s, i) => el('fieldset', {},
        el('legend', { metin: `${i + 1}. ${s.metin}` }),
        el('div', { sinif: 'test-oz__secenekler' }, OZ_SECENEKLER.map((etiket, j) => el('label', { sinif: 'secim' },
          el('input', { type: 'radio', name: `${id}-${i}`, value: String(j) }), el('span', { metin: etiket })))))),
      hata,
      el('button', { type: 'submit', sinif: 'btn btn--birincil btn--buyuk btn--blok', metin: 'Testi bitir' }));
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const cevaplar = OZ_SORULAR.map((_, i) => form.querySelector(`input[name="${id}-${i}"]:checked`)?.value);
      const bos = cevaplar.findIndex((c) => c === undefined);
      if (bos >= 0) {
        hata.textContent = `${bos + 1}. soruyu da yanıtla.`;
        hata.hidden = false;
        form.querySelector(`input[name="${id}-${bos}"]`)?.focus();
        return;
      }
      const sayilar = cevaplar.map(Number);
      const son = OZ_SECENEKLER.length - 1;
      const ort = sayilar.reduce((t, c, i) => t + (OZ_SORULAR[i].ters ? son - c : c) / son, 0) / sayilar.length;
      bitir({ cevaplar: sayilar, puan: Math.round(ort * 100) });
    });
    govde.replaceChildren(el('section', { sinif: 'test-adim' }, baslik, form));
    odakla(baslik);
  });
}

// ---------- Ham sonuçtan test kaydına ----------
const dikkatSonucu = ({ ekstra: e }) => ({
  isabet: e.isabet ?? 0, ortMs: e.ortMs ?? null, tutarlilik: e.tutarlilik ?? null, deneme: e.deneme ?? 0,
  hataliDokunma: e.hataliDokunma ?? 0, atlananHedef: e.atlananHedef ?? 0, onTepki: e.onTepki ?? 0,
});
const hafizaSonucu = ({ ekstra: e }) => ({ enIyi: e.enIyi ?? 0, isabet: e.isabet ?? 0, deneme: e.deneme ?? 0, ogeIsabet: e.ogeIsabet ?? null });
function gormeSonucu({ ekstra: e, dogru, yanlis }) {
  const deneme = dogru + yanlis;
  return deneme ? { esikMs: e.esikMs ?? OLCEK.flasMs[0], isabet: Math.round((dogru * 100) / deneme), deneme, enKisaMs: e.enKisaMs ?? null } : null;
}

// ---------- Test akışı ----------
async function testiCalistir(kap, tur) {
  const p = etkinProfil();
  if (!p) return;
  const durum = testDurumu(p.id);
  const calisma = { profilId: p.id, bitti: false, durdur: null };
  oturum = calisma;
  const [d] = await Promise.all([testDosyasi(), bantlariYukle()]);
  if (calisma.bitti) return;
  // Final, başlangıçla aynı koşulda: başlangıcın sınıfının akışı ve ölçeği; S35a: metin aynı sınıfın eşdeğer (diğer) formundan
  const b = tur === 'final' ? durum.veri.baslangic : null;
  const form = testFormu(durum.veri, tur, formCozucu(d));
  const metin = testMetni(d, { sinif: b?.sinif ?? p.sinif, form, yedekKimlik: b?.metin ?? null });
  const akis = akisKur(d, b?.sinif ?? p.sinif);
  const ADIM = akis.adimlar;

  const t0 = Date.now();
  const testSinifi = b?.sinif ?? p.sinif;
  const sonuc = { sinif: p.sinif, metin: metin?.kimlik ?? null, form: metin ? metinFormuAl(metin) : form, atlanan: [], olcek: { wpm: (b ? sonucOlcegi(b) : sinifOlcegi(p.sinif)).wpm } };
  // S34-son: bandın uygulandığı adımlar; final başlangıçtakini izler (eski başlangıçta liste yoksa bant uygulanmaz)
  const bantliMi = (adim) => (b ? (Array.isArray(b.bantli) && b.bantli.includes(adim.ad)) : adim.bantli === true);
  const baslik = el('h1', { metin: tur === 'final' ? 'Final testi' : 'Başlangıç testi' });
  const etiket = el('span', { id: `test-ilerleme-${++sayac}` });
  const dolgu = el('span', { sinif: 'ilerleme__dolgu' });
  const cubuk = el('div', { sinif: 'ilerleme', role: 'progressbar', 'aria-labelledby': etiket.id, 'aria-valuemin': '0', 'aria-valuemax': String(ADIM.length) }, dolgu);
  const govde = el('div', { sinif: 'test-govde' });
  let cikisSorusu = 'Test yarıda bırakılsın mı? Bu testteki yanıtlar kaydedilmez; istediğin zaman baştan başlayabilirsin.';
  const cik = el('button', { type: 'button', sinif: 'btn btn--hayalet btn--kucuk', metin: 'Testten çık', onclick: () => {
    if (!confirm(cikisSorusu)) return;
    testiDurdur();
    sayfaCiz(kap);
  } });
  kap.replaceChildren(el('div', { sinif: 'test-akis' },
    el('div', { sinif: 'test-ust' }, el('div', { sinif: 'test-ust__satir' }, baslik, cik), el('div', { sinif: 'ilerleme-etiket' }, etiket), cubuk),
    govde));

  let onceki = '';
  for (let i = 0; i < ADIM.length; i++) {
    const adim = ADIM[i];
    etiket.textContent = `Adım ${i + 1} / ${ADIM.length}: ${adim.baslik}`;
    dolgu.style.setProperty('--deger', `${(i * 100) / ADIM.length}%`);
    cubuk.setAttribute('aria-valuenow', String(i));
    cubuk.setAttribute('aria-valuetext', `${ADIM.length} adımdan ${i} tamamlandı`);

    const bantli = bantliMi(adim);
    const h = adim.egzersiz ? await adimHazirla(adim, testSinifi, bantli) : null;
    if (calisma.bitti) return;
    let secim = await adimGirisi(govde, adim, calisma, onceki, akis.adimNotu, adimOrnegiOlustur(adim, h));
    // S34-son: alıştırma turu (kaydedilmez); sonra aynı adımın girişine dönülür
    while (secim === 'alistirma' && !calisma.bitti) {
      const a = await olcumAdimi(govde, adim, calisma, h, { alistirma: true });
      if (calisma.bitti || !a) return;
      secim = await adimGirisi(govde, adim, calisma, a.atlandi ? 'Alıştırma şu an açılamadı.' : 'Alıştırma bitti. Hazır olunca “Başla”ya bas.', akis.adimNotu, adimOrnegiOlustur(adim, h));
    }
    if (calisma.bitti || secim === 'iptal') return;
    if (secim === 'atla') { sonuc.atlanan.push(adim.ad); onceki = `${adim.baslik} adımını atladın.`; continue; }

    let r = null;
    if (adim.ad === 'okuma') {
      if (!metin) { sonuc.atlanan.push('okuma'); onceki = 'Okuma metni yüklenemediği için bu adım atlandı.'; continue; }
      r = await okumaAdimi(govde, metin, calisma);
      if (r) Object.assign(sonuc, r);
    } else if (adim.ad === 'oz') {
      r = await ozAdimi(govde, calisma);
      if (r) sonuc.oz = r;
    } else {
      r = await olcumAdimi(govde, adim, calisma, h);
      if (r && !r.atlandi) {
        const deger = adim.ad === 'dikkat' ? dikkatSonucu(r) : adim.ad === 'hafiza' ? hafizaSonucu(r) : gormeSonucu(r);
        if (deger) {
          sonuc[adim.ad] = deger;
          if (h?.bant) (sonuc.bantli ??= []).push(adim.ad); // S34-son
        } else r = { atlandi: true };
      }
    }
    if (calisma.bitti || !r) return;
    if (r.atlandi) { sonuc.atlanan.push(adim.ad); onceki = `${adim.baslik} şu an açılamadı; bu adım atlandı.`; continue; }
    onceki = `✓ ${adim.baslik} tamamlandı.`;
    sesCal('dogru');
  }

  const simdi = new Date();
  Object.assign(sonuc, { tarih: simdi.toISOString(), gun: gunAnahtari(simdi), sureSn: Math.round((Date.now() - t0) / 1000) });
  if (sonuc.okuma && sonuc.anlama) sonuc.eoh = eohHesapla(sonuc.okuma.wpm, sonuc.anlama.yuzde);
  let k = sonucKaydet(tur, sonuc, p.id);

  // S35a: finalde isteğe bağlı “İlk metnine dön” (başlangıçta okuma ölçüldüyse ve final başka metinle yapıldıysa).
  // Final önce kaydedilir; bu adımdan çıkılırsa ya da atlanırsa final yine kayıtlıdır. Okunursa tekrarOkuma eklenip yeniden kaydedilir.
  const ilkMetin = k.tamam && tur === 'final' && b?.okuma && b.metin && b.metin !== sonuc.metin ? d.metinler.find((m) => m.kimlik === b.metin) : null;
  if (ilkMetin) {
    cikisSorusu = 'Ek adımdan çıkılsın mı? Final testin kaydedildi; yalnız bu isteğe bağlı okuma kaydedilmez.';
    etiket.textContent = 'Ek adım (isteğe bağlı): İlk metnine dön';
    dolgu.style.setProperty('--deger', '100%');
    cubuk.setAttribute('aria-valuenow', String(ADIM.length));
    cubuk.setAttribute('aria-valuetext', `${ADIM.length} adımın hepsi tamamlandı; isteğe bağlı ek adım`);
    const t = await tekrarOkumaAdimi(govde, ilkMetin, calisma, `${onceki} Final testin kaydedildi.`, 'İstersen geçebilirsin; sonuçların bu adım olmadan da hazır.');
    if (calisma.bitti || !t) return;
    if (!t.atlandi) k = sonucKaydet(tur, { ...sonuc, tekrarOkuma: t }, p.id);
  }

  oturum = null;
  sayfaCiz(kap, { yeniTur: k.tamam ? tur : null, hata: k.tamam ? null : k.hata });
}

function testiDurdur() {
  if (!oturum) return;
  oturum.bitti = true;
  oturum.durdur?.();
  oturum = null;
}

// ---------- Sayfa (testin dışında) ----------
function girisBolumu(akis) {
  return el('div', { sinif: 'test-giris' },
    el('h1', { metin: 'Seviye Belirleme Testi' }),
    el('p', { sinif: 'test-giris__vurgu', metin: 'Yarış değil, başlangıç noktan.' }),
    el('p', { metin: String(akis?.giris ?? AKIS_METINLERI.giris).replace('{gun}', String(FINAL_GUN)) }));
}

function baslangicKarti(kap, akis) {
  return el('section', { sinif: 'test-kart', 'aria-labelledby': 'test-adimlar-baslik' },
    el('h2', { id: 'test-adimlar-baslik', metin: `Test ${akis.adimlar.length} adım, ${akis.sure}` }),
    el('ol', { sinif: 'test-adimlar' }, akis.adimlar.map((a) => el('li', {},
      el('span', {}, el('strong', { metin: a.baslik }), el('small', { metin: a.kisa })),
      el('span', { sinif: 'test-adimlar__sure', metin: a.sure })))),
    el('p', { metin: akis.hazirlik }),
    el('div', { sinif: 'test-eylemler' },
      el('button', { type: 'button', sinif: 'btn btn--gunes btn--buyuk', metin: 'Teste başla', onclick: () => testiCalistir(kap, 'baslangic') })));
}

function egzersizBaglantisi(eksen) {
  const b = egzersizBilgisi(eksen.egzersiz);
  return b && kartUygunMu(b, etkinProfil()?.sinif) ? el('a', { sinif: 'btn btn--ikincil btn--kucuk', href: `#/egzersiz/${b.ad}`, metin: `${b.baslik} ile çalış` }) : null;
}

// Tek ölçüm: güçlü yön ve gelişim alanı
function ozetListesi(s) {
  const o = guclulukOzeti(s.puanlar);
  const ogeler = [];
  if (!o.guclu) {
    ogeler.push(el('li', {}, el('p', { metin: 'Radar için en az iki alanın ölçülmesi gerekiyor. Atladığın adımları bir sonraki testte deneyebilirsin.' })));
  } else if (o.dengeli) {
    ogeler.push(el('li', { 'data-tur': 'guclu' }, el('h3', { metin: 'Dengeli bir başlangıç' }),
      el('p', { metin: 'Alanların birbirine yakın. Her gün kısa ve çeşitli çalışmalar bu dengeyi korur.' })));
  } else {
    ogeler.push(
      el('li', { 'data-tur': 'guclu' }, el('h3', { metin: `Güçlü yönün: ${o.guclu.etiket}` }), el('p', { metin: o.guclu.guclu })),
      el('li', { 'data-tur': 'gelisim' }, el('h3', { metin: `Gelişim alanın: ${o.gelisim.etiket}` }),
        el('p', { metin: `${o.gelisim.gelisim} Bir sonraki hedefin bu alan.` }), egzersizBaglantisi(o.gelisim)));
  }
  if (s.anlama && s.anlama.yuzde < ANLAMA_ESIGI) {
    ogeler.push(el('li', { 'data-tur': 'gelisim' }, el('h3', { metin: 'Önce anlama' }),
      el('p', { metin: `Anlaman henüz %${ANLAMA_ESIGI}’in altında. Okurken önce anlamaya odaklan; hız, anlama yerleşince artar.` })));
  }
  if (s.okuma?.hizliGecis) {
    ogeler.push(el('li', {}, el('h3', { metin: 'Okuma çok hızlı geçildi' }),
      el('p', { metin: 'Okuma hızın olağan aralığın üstünde ölçüldü. Bir sonraki testte metni anlayarak sonuna kadar oku.' })));
  }
  if (s.oz) {
    const odak = aracBilgisi('odak');
    ogeler.push(el('li', {}, el('h3', { metin: `Odak öz değerlendirmen: ${s.oz.puan}/100` }),
      el('p', { metin: s.oz.puan >= 67
        ? 'Çalışırken odağını korumakta kendini iyi görüyorsun.'
        : 'Kısa çalışma blokları ve telefonu uzağa koymak odağını kolaylaştırabilir.' }),
      odak && kartUygunMu(odak, etkinProfil()?.sinif) ? el('a', { sinif: 'btn btn--ikincil btn--kucuk', href: odak.adres, metin: odak.baslik }) : null));
  }
  return el('ul', { sinif: 'test-ozet' }, ogeler);
}

// S35a: “önce → sonra” satırı; fark işaretle yazılır (renge dayanmaz)
const isaretliFark = (fark) => (fark > 0 ? `+${sayiBicimle(fark)}` : fark < 0 ? `−${sayiBicimle(-fark)}` : '0');
function degisimSatiri(etiket, x, birim) {
  if (!x) return null;
  const yon = { artti: 'arttı', azaldi: 'henüz başlangıcın altında', benzer: 'başlangıca yakın' }[x.yon];
  return el('div', { sinif: 'test-degisim__satir' },
    el('dt', { metin: etiket }),
    el('dd', {}, `${birim(x.once)} → ${birim(x.sonra)} `,
      el('span', { sinif: 'test-fark', 'data-yon': x.yon, metin: `(${isaretliFark(x.fark)})` }),
      el('span', { sinif: 'ekran-okuyucu', metin: `, ${yon}` })));
}
const kdk = (n) => `${sayiBicimle(n)} kelime/dk`;
const yuzde = (n) => `%${sayiBicimle(n)}`;

// S35a (a): eşdeğer metinde değişim
function esdegerOgesi(o, d0) {
  const e = o.esdeger;
  if (!e.wpm && !e.anlama) return null;
  const bAd = metinAdi(d0, e.baslangicMetin);
  const fAd = metinAdi(d0, e.finalMetin);
  const giris = e.ayniMetin
    ? `Başlangıçta ve finalde aynı metni${bAd ? ` (“${bAd}”)` : ''} okudun; bu dönem için eşdeğer metin bulunamadı.`
    : `Başlangıçta “${bAd ?? 'ilk metin'}”, finalde “${fAd ?? 'eşdeğer metin'}” metnini okudun. İki metin aynı türde, benzer uzunlukta ve aynı soru tiplerinde.`;
  const notlar = [];
  if (!e.guvenilir) notlar.push('Metinlerden biri çok hızlı geçildiği için okuma hızı farkı güvenilir değil.');
  if (e.eoh?.yon === 'azaldi') notlar.push('Etkin okuma hızın henüz başlangıcın altında. Bir sonraki hedefin: anlamayı koruyarak, kendi hızında okumak.');
  else if (e.anlama?.yon === 'azaldi') notlar.push('Anlaman henüz başlangıcın altında. Bir sonraki hedefin: okurken “kim, ne, neden?” diye sormak.');
  return el('li', { 'data-tur': 'esdeger' },
    el('h3', { metin: e.ayniMetin ? 'Okuma ve anlamada değişim' : 'Eşdeğer metinde değişim' }),
    el('p', { metin: giris }),
    el('dl', { sinif: 'test-degisim' },
      degisimSatiri('Okuma hızı', e.wpm, kdk),
      degisimSatiri('Anlama', e.anlama, yuzde),
      degisimSatiri('Etkin okuma hızı', e.eoh, kdk)),
    ...notlar.map((m) => el('p', { sinif: 'test-not', metin: m })));
}

// S35a (b): aynı metni yeniden okuma (asıl gelişim gibi sunulmaz; ayrı etiket ve açıklama)
function tekrarOgesi(o, d0) {
  const t = o.tekrar;
  if (!t) return null;
  const ad = metinAdi(d0, t.metin);
  return el('li', { 'data-tur': 'tekrar' },
    el('h3', { metin: 'Aynı metni yeniden okudun' }),
    el('dl', { sinif: 'test-degisim' }, degisimSatiri(ad ? `“${ad}” okuma hızı` : 'Okuma hızı', t, kdk)),
    el('p', { sinif: 'test-not', metin: t.hizliGecis
      ? 'Metin çok hızlı geçildiği için bu fark güvenilir değil.'
      : 'Metni daha önce okuduğun için tanıdık geldi. Bu fark eşdeğer metindeki değişimden ayrı tutulur; final puanlarına, radara ve kursa karışmaz.' }));
}

// İki ölçüm: değişim özeti. S35a: (c) en çok geliştiğin alan, (a) eşdeğer metin, (b) aynı metni yeniden okuma, sonra yerini koruyan ve bir sonraki hedef
function degisimListesi(b, f, d0) {
  const o = gelisimOzeti(b, f);
  const k = karsilastir(b.puanlar ? b : null, f);
  const art = k.filter((x) => x.yon === 'artti');
  const az = k.filter((x) => x.yon === 'azaldi');
  const benzer = k.filter((x) => x.yon === 'benzer');
  const adlar = (l) => l.map((x) => x.eksen.etiket).join(', ');
  const ogeler = [];
  if (o.enCok) {
    const x = k.find((y) => y.eksen.ad === o.enCok.eksen.ad);
    const diger = art.filter((y) => y.eksen.ad !== o.enCok.eksen.ad);
    ogeler.push(el('li', { 'data-tur': 'artti' }, el('h3', { metin: `En çok geliştiğin alan: ${o.enCok.eksen.etiket}` }),
      el('p', { metin: `${x.once} → ${x.sonra} (${isaretliFark(o.enCok.fark)} puan). ${FINAL_GUN} günlük çalışmanın izi burada.` }),
      diger.length ? el('p', { metin: `İlerleme olan diğer alanlar: ${adlar(diger)}.` }) : null));
  } else {
    const hedef = o.sonrakiHedef;
    ogeler.push(el('li', { 'data-tur': 'gelisim' }, el('h3', { metin: 'Henüz belirgin bir artış yok' }),
      el('p', { metin: `Bu ölçümde alanların başlangıca yakın ya da biraz altında. Tek bir test günden güne değişebilir.${hedef ? ` Bir sonraki hedefin: ${hedef.etiket}.` : ''}` }),
      hedef ? egzersizBaglantisi(hedef) : null));
  }
  ogeler.push(esdegerOgesi(o, d0), tekrarOgesi(o, d0));
  if (benzer.length) {
    ogeler.push(el('li', {}, el('h3', { metin: 'Yerini koruyan alanlar' }),
      el('p', { metin: `${adlar(benzer)}: başlangıca yakın. Düzenli kısa çalışmalar bu alanlarda da fark yaratabilir.` })));
  }
  if (az.length && o.enCok) {
    ogeler.push(el('li', { 'data-tur': 'gelisim' }, el('h3', { metin: 'Bir sonraki hedef' }),
      el('p', { metin: `${adlar(az)} bu ölçümde henüz başlangıcın altında. Tek bir test günden güne değişebilir; bu alanda kısa ve düzenli çalışmak iyi bir sonraki adım.` }),
      egzersizBaglantisi(az[0].eksen)));
  }
  return el('ul', { sinif: 'test-ozet' }, ogeler.filter(Boolean));
}

// S35a: çocuk görünümünde karşılaştırmaya Fener eşlik eder (metin ekran okuyucuda normal okunur; profesyonelde yok)
function fenerKarsilastirma(b, f) {
  if (!cocukGorunumuMu()) return null;
  const m = karsilastirmaMesaji(gelisimOzeti(b, f), { sinif: etkinProfil()?.sinif ?? f.sinif });
  return fenerBalonu({ ifade: m.ifade, mesaj: m.mesaj, sinif: 'test-sonuc__fener' });
}

function tablo(b, f) {
  const k = karsilastir(b, f);
  const hucre = (s, ad, puan) => el('td', {}, el('strong', { metin: puan ?? '—' }), el('small', { metin: hamMetin(s, ad) }));
  const farkMetni = (x) => (x.fark === null ? '—' : x.fark > 0 ? `+${x.fark}` : String(x.fark));
  return el('div', { sinif: 'test-tablo-kap' }, el('table', { sinif: 'test-tablo' },
    el('caption', { metin: f ? 'Başlangıç ve final (100 üzerinden)' : 'Başlangıç sonuçların (100 üzerinden)' }),
    el('thead', {}, el('tr', {},
      el('th', { scope: 'col', metin: 'Alan' }), el('th', { scope: 'col', metin: 'Başlangıç' }),
      f ? el('th', { scope: 'col', metin: 'Final' }) : null, f ? el('th', { scope: 'col', metin: 'Değişim' }) : null)),
    el('tbody', {}, k.map((x) => el('tr', {},
      el('th', { scope: 'row', metin: x.eksen.etiket }),
      hucre(b, x.eksen.ad, x.once),
      f ? hucre(f, x.eksen.ad, x.sonra) : null,
      f ? el('td', {}, el('span', { sinif: 'test-fark', 'data-yon': x.yon ?? '', metin: farkMetni(x) })) : null)))));
}

// s: başlangıç sonucu (okuma hızı ölçeği onunla saklanır; final aynı ölçeği kullanır)
function olcekAciklamasi(s) {
  const wpm = sonucOlcegi(s).wpm;
  return el('details', { sinif: 'test-olcek' },
    el('summary', { metin: 'Puanlar nasıl hesaplanıyor?' }),
    el('ul', {},
      el('li', { metin: `Okuma hızı: ${wpm[0]} kelime/dk → 0, ${wpm[1]} kelime/dk ve üstü → 100.` }),
      el('li', { metin: 'Anlama: doğru cevap yüzdesi.' }),
      el('li', { metin: `Dikkat: doğruluğun %70’i + tepki hızının %30’u (${OLCEK.tepkiMs[0]} ms → 0, ${OLCEK.tepkiMs[1]} ms → 100).` }),
      el('li', { metin: `Hafıza: doğru hatırlanan en uzun dizi (${OLCEK.dizi[0]} rakam → 0, ${OLCEK.dizi[1]} rakam → 100).` }),
      el('li', { metin: `Görme alanı: doğru görülen flaş süresi (${OLCEK.flasMs[0]} ms → 0, ${OLCEK.flasMs[1]} ms → 100).` })),
    el('p', { metin: 'Bu ölçek bir not ya da sıralama değildir. Başlangıç ve final aynı cetvelle hesaplanır; yalnızca senin iki ölçümünü karşılaştırmak için kullanılır.' }),
    el('p', { metin: 'Final, başlangıçtakine eşdeğer bir metinle yapılır: aynı tür, benzer uzunluk, aynı soru tipleri. Yeni dönemde iki metin yer değiştirir. “İlk metnine dön” ölçümü ayrı gösterilir, puanlara girmez.' }));
}

function durumKarti(kap, d) {
  const kart = el('section', { sinif: 'test-kart test-durum', 'data-asama': d.asama, 'aria-labelledby': 'test-durum-baslik' });
  if (d.asama === 'bekliyor') {
    kart.append(
      el('h2', { id: 'test-durum-baslik', metin: 'Final testi' }),
      el('p', { sinif: 'test-durum__gun', metin: `${d.kalan} gün` }),
      el('p', { metin: `Final testi ${tarihMetni(`${d.finalGunu}T12:00:00`)} tarihinde açılır. Bu arada her gün kısa çalışmalar yapman yeterli.` }));
    if (d.yenilenebilir) {
      kart.append(el('div', { sinif: 'test-eylemler' }, el('button', { type: 'button', sinif: 'btn btn--hayalet', metin: 'Başlangıç testini yeniden yap', onclick: () => {
        if (confirm(`Başlangıç testi ilk ${YENILEME_GUN} gün içinde yenilenebilir. Yeni sonuç eskisinin yerine geçer ve ${FINAL_GUN} günlük süre yeniden başlar. Devam edilsin mi?`)) testiCalistir(kap, 'baslangic');
      } })));
    }
  } else if (d.asama === 'hazir') {
    kart.append(
      el('h2', { id: 'test-durum-baslik', metin: `${FINAL_GUN} gün doldu` }),
      el('p', { metin: 'Final testi hazır: aynı adımlar ve ayarlar, eşdeğer bir metin (aynı türde, benzer uzunlukta, aynı soru tiplerinde). Sonunda istersen ilk metnini de yeniden okuyabilirsin.' }),
      el('div', { sinif: 'test-eylemler' }, el('button', { type: 'button', sinif: 'btn btn--gunes btn--buyuk', metin: 'Final testine başla', onclick: () => testiCalistir(kap, 'final') })));
  } else {
    kart.append(
      el('h2', { id: 'test-durum-baslik', metin: 'Bu dönem tamamlandı' }),
      el('p', { metin: `İstersen yeni bir ${FINAL_GUN} günlük dönem başlatabilirsin. Bu sonuçlar geçmişe kaydedilir, yeni başlangıç testi açılır.` }),
      el('div', { sinif: 'test-eylemler' }, el('button', { type: 'button', sinif: 'btn btn--ikincil', metin: 'Yeni dönem başlat', onclick: () => {
        if (!confirm('Yeni dönem başlatılsın mı? Şimdiki başlangıç ve final sonuçların geçmişe kaydedilir.')) return;
        if (yeniDonem()) sayfaCiz(kap);
      } })));
  }
  if (d.veri.gecmis.length) kart.append(el('p', { sinif: 'test-not', metin: `Tamamlanan önceki dönem: ${d.veri.gecmis.length}` }));
  return kart;
}

function sonucBolumu(d, d0) {
  const { baslangic: b, final: f } = d.veri;
  const seriler = [{ etiket: `Başlangıç (${tarihMetni(b.tarih)})`, degerler: b.puanlar }];
  if (f) seriler.push({ etiket: `Final (${tarihMetni(f.tarih)})`, degerler: f.puanlar });
  const radar = radarOlustur({
    eksenler: EKSENLER, seriler, baslik: f ? 'Profil radarı: başlangıç ve final' : 'Profil radarı: başlangıç',
    aciklama: f ? 'Kesik çizgi başlangıç, dolu alan final.' : '',
  });
  const baslik = el('h2', { id: 'test-sonuc-baslik', metin: f ? 'Başlangıç ve final' : 'Başlangıç noktan' });
  return el('section', { sinif: 'test-sonuc', 'aria-labelledby': 'test-sonuc-baslik' },
    el('div', { sinif: 'test-sonuc__ust' }, baslik,
      el('p', { sinif: 'soluk', metin: f
        ? 'Yalnızca kendi iki ölçümün karşılaştırılır.'
        : 'Bu, sıralama değil; kendi gelişimini izlemek için bir başlangıç çizgisi.' }),
      f ? fenerKarsilastirma(b, f) : null),
    el('div', { sinif: 'test-sonuc__duzen' }, radar, f ? degisimListesi(b, f, d0) : ozetListesi(b)),
    tablo(b, f),
    olcekAciklamasi(b));
}

// S34d: akış verisi gerektiği için önce test dosyası beklenir (önbellekte; ikinci çizimde hemen gelir). Bu arada test başladıysa çizilmez
let cizimNo = 0;
async function sayfaCiz(kap, { yeniTur = null, hata = null } = {}) {
  const no = ++cizimNo;
  const d0 = dosya ?? await testDosyasi();
  if (no !== cizimNo || oturum || !kap.isConnected) return;
  const p = etkinProfil();
  if (!p) {
    kap.replaceChildren(girisBolumu(null), el('p', { metin: 'Testi yapmak için önce bir profil oluştur.' }));
    return;
  }
  const d = testDurumu(p.id);
  const akis = akisKur(d0, d.veri.baslangic && !d.veri.final ? d.veri.baslangic.sinif ?? p.sinif : p.sinif);
  const parcalar = [girisBolumu(akis)];
  if (hata) parcalar.push(el('p', { sinif: 'test-oz__hata', role: 'alert', metin: hata }));
  if (d.asama === 'yok') parcalar.push(baslangicKarti(kap, akis));
  else parcalar.push(sonucBolumu(d, d0), durumKarti(kap, d));
  kap.replaceChildren(...parcalar);
  if (yeniTur) {
    const b = kap.querySelector('#test-sonuc-baslik');
    odakla(b);
    duyur(yeniTur === 'final' ? 'Final testi kaydedildi. Karşılaştırma hazır.' : 'Başlangıç testi kaydedildi. Profil radarın hazır.');
  }
}

/** Sayfayı çizer. Süren test varsa (aynı profil) dokunmaz; profil değiştiyse test bırakılır */
export function testlerSayfasiCiz(kap) {
  if (!kap) return;
  stilYukle('css/exercise.css'); // soru ve okuma stilleri sonuç ekranından önce de hazır olsun
  if (oturum && oturum.profilId === etkinProfil()?.id) return;
  testiDurdur();
  sayfaCiz(kap);
}

/** Sayfadan çıkınca süren test sessizce bırakılır (yanıtlar kaydedilmez) */
export function testlerSayfasiniKapat() {
  testiDurdur();
}
