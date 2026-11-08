// Egzersiz kataloğu: çalışma alanları (modüller), egzersiz ve araç kartı bilgileri tek yerde; adres adı (#/egzersiz/<ad>) → egzersiz dosyası, dosya yalnızca açılınca yüklenir
// S34a: her kartta sınıf aralığı (sinif: [en, enCok]; yazılmazsa 2-8). Liste, ana sayfa ve kurs yalnız etkin profilin sınıfına uygun kartları gösterir; uygun olmayan adrese gelinirse #/sinif-disi/<ad>
import { TUM_ARALIK, araliktaMi } from '../core/siniflar.js';

// Egzersiz içeren çalışma alanları (ana sayfadaki kartlar #/modul/<ad> adresine gider; renkler data-modul ile)
export const MODULLER = Object.freeze([
  { ad: 'oku', baslik: 'Okuma', aciklama: 'Akıcı ve anlayarak okuma', ikon: 'kitap' },
  { ad: 'goz', baslik: 'Göz ve Algı', aciklama: 'Görsel tarama oyunları ve mola', ikon: 'goz' },
  { ad: 'dikkat', baslik: 'Dikkat', aciklama: 'Odak oyunları ve odak araçları', ikon: 'hedef' },
  { ad: 'hafiza', baslik: 'Hafıza', aciklama: 'Dizi oyunları, teknikler ve tekrar', ikon: 'ampul' },
].map(Object.freeze));

// S34a: sınıf aralığı yazılmamışsa 2-8; dizi dondurulur
function aralikDondur(kart) {
  return { ...kart, sinif: Object.freeze(Array.isArray(kart.sinif) ? [...kart.sinif] : [...TUM_ARALIK]) };
}

// Kart bilgileri dosya yüklenmeden gösterilir. Yeni egzersiz: dosyasını yaz, buraya bir satır ekle (liste sırası = kart sırası)
const EGZERSIZLER = [
  { ad: 'oku-anla', sinif: [2, 8], modul: 'oku', baslik: 'Oku ve Anla', ikon: 'kitap', etiket: 'Hız + anlama',
    aciklama: 'Metni oku, soruları yanıtla. Etkin okuma hızını gör.', yukle: () => import('./oku/oku-anla.js') },
  { ad: 'hizli-oku', sinif: [2, 8], modul: 'oku', baslik: 'Hızlı Oku (deneme)', ikon: 'kitap', etiket: 'Deneme',
    aciklama: 'Okuma modlarını ve hız ayarlarını dene.', yukle: () => import('./oku/hizli-oku.js') },
  { ad: 'hizli-dokun', sinif: [2, 8], modul: 'dikkat', baslik: 'Hızlı Dokun', ikon: 'isik', etiket: '30 saniye',
    aciklama: 'Yanan ışıkları sönmeden yakala.', yukle: () => import('./dikkat/hizli-dokun.js') },
  // S11a: seçici dikkat oyunları (ortak ölçüm: js/engine/attention-core.js)
  // S34e: stroop 2-8 (2. sınıfta 3 renk, şekil ipucu baştan açık, en çok 2. basamak: data/sinif-bantlari.json)
  { ad: 'stroop', sinif: [2, 8], modul: 'dikkat', baslik: 'Renk mi, Kelime mi?', ikon: 'renk-kelime', etiket: '16-24 deneme',
    aciklama: 'Kelimeyi okuma, yazının rengini seç.', yukle: () => import('./dikkat/stroop.js') },
  { ad: 'git-dur', sinif: [2, 8], modul: 'dikkat', baslik: 'Dokun ya da Bekle', ikon: 'git-dur', etiket: '30-40 deneme',
    aciklama: 'Yalnız yıldıza dokun, öteki şekillerde bekle.', yukle: () => import('./dikkat/git-dur.js') },
  // S11b: iptal testi (seçici dikkat) ve sürekli dikkat
  { ad: 'iptal-testi', sinif: [2, 8], modul: 'dikkat', baslik: 'Hedef Avı', ikon: 'satirlar', etiket: '6-8 satır',
    aciklama: 'Satırları tara, yalnız hedef şekilleri işaretle.', yukle: () => import('./dikkat/iptal-testi.js') },
  { ad: 'surekli-dikkat', sinif: [2, 8], modul: 'dikkat', baslik: 'Gece Nöbeti', ikon: 'yorunge', etiket: '2-3 dakika',
    aciklama: 'Seyrek ve habersiz gelen hilali kaçırmadan yakala.', yukle: () => import('./dikkat/surekli-dikkat.js') },
  // S12: kutu nefes (Odak Araçları sayfasındaki mola bölümünden de açılır)
  { ad: 'nefes', sinif: [2, 8], modul: 'dikkat', baslik: 'Kutu Nefes', ikon: 'nefes', etiket: '1-3 dakika',
    aciklama: 'Al, tut, ver, tut: kare boyunca yavaş ve düzenli nefes.', yukle: () => import('./odak/nefes.js') },
  { ad: 'schulte', sinif: [2, 8], modul: 'goz', baslik: 'Schulte Tablosu', ikon: 'izgara', etiket: '3×3 – 7×7',
    aciklama: 'Karışık sayıları 1’den başlayarak sırayla bul.', yukle: () => import('./goz/schulte.js') },
  { ad: 'nesne-takibi', sinif: [2, 8], modul: 'goz', baslik: 'Nesne Takibi', ikon: 'yorunge', etiket: '1-3 dakika',
    aciklama: 'Başını sabit tut, hareket eden noktayı gözlerinle izle.', yukle: () => import('./goz/nesne-takibi.js') },
  { ad: 'satir-ritmi', sinif: [2, 8], modul: 'goz', baslik: 'Satır Ritmi', ikon: 'satirlar', etiket: 'Ritimli',
    aciklama: 'Işığı satır satır izle, satır başına rahatça geç.', yukle: () => import('./goz/satir-ritmi.js') },
  { ad: 'periferik-flas', sinif: [4, 8], modul: 'goz', baslik: 'Periferik Flaş', ikon: 'cevre', etiket: '400 → 100 ms',
    aciklama: 'Ortaya bak, çevrede bir an beliren sayıyı ya da kelimeyi yakala.', yukle: () => import('./goz/periferik-flas.js') },
  { ad: 'grup-flasi', sinif: [4, 8], modul: 'goz', baslik: 'Grup Flaşı', ikon: 'grup-flas', etiket: '2-4 kelime',
    aciklama: 'Kısa süre görünen kelime grubunu bütün olarak gör, seç ya da yaz.', yukle: () => import('./goz/grup-flasi.js') },
  { ad: 'kelime-piramidi', sinif: [4, 8], modul: 'goz', baslik: 'Kelime Piramidi', ikon: 'piramit', etiket: 'Genişleyen satırlar',
    aciklama: 'Ortadaki kelimeye bakarken satırın iki ucunu da gör.', yukle: () => import('./goz/kelime-piramidi.js') },
  { ad: 'sekilli-metin', sinif: [4, 8], modul: 'goz', baslik: 'Şekilli Metin', ikon: 'sekil', etiket: 'Kare · üçgen · elmas',
    aciklama: 'Metnini şekle diz, gözünü ortadan aşağı indirerek oku.', yukle: () => import('./goz/sekilli-metin.js') },
  // S10: görsel algı oyunları ve 20-20-20 göz molası
  { ad: 'fark-bul', sinif: [2, 8], modul: 'goz', baslik: 'Farkı Bul', ikon: 'fark', etiket: '3-8 fark',
    aciklama: 'İki resmi karşılaştır, aradaki farkları bul.', yukle: () => import('./goz/fark-bul.js') },
  { ad: 'gorsel-arama', sinif: [2, 8], modul: 'goz', baslik: 'Görsel Arama', ikon: 'arama', etiket: '12 deneme',
    aciklama: 'Kalabalığın içinde istenen şekli olabildiğince çabuk bul.', yukle: () => import('./goz/gorsel-arama.js') },
  { ad: 'simge-esle', sinif: [2, 8], modul: 'goz', baslik: 'Simge Anahtarı', ikon: 'simge', etiket: '60 saniye',
    aciklama: 'Anahtara bak, ortadaki simgenin sayısını seç.', yukle: () => import('./goz/simge-esle.js') },
  { ad: 'ayna-dondur', sinif: [3, 8], modul: 'goz', baslik: 'Ayna mı, Döndürme mi?', ikon: 'ayna', etiket: '12 deneme',
    aciklama: 'İki şekil aynı mı, yoksa biri ötekinin ayna görüntüsü mü?', yukle: () => import('./goz/ayna-dondur.js') },
  { ad: 'goz-molasi', sinif: [2, 8], modul: 'goz', baslik: '20-20-20 Göz Molası', ikon: 'uzak', etiket: 'Kısa mola',
    aciklama: 'Ekrandan kısa bir ara ver: yaklaşık 20 saniye uzağa bak.', yukle: () => import('./goz/goz-molasi.js') },
  // S14a: çalışan bellek (dizi) oyunları (ortak altyapı: js/engine/memory-core.js)
  { ad: 'rakam-dizisi', sinif: [2, 8], modul: 'hafiza', baslik: 'Rakam Dizisi', ikon: 'rakam-dizi', etiket: 'İleri · geri',
    aciklama: 'Rakamları izle, aynı sırayla ya da tersten gir.', yukle: () => import('./hafiza/rakam-dizisi.js') },
  { ad: 'corsi-bloklari', sinif: [2, 8], modul: 'hafiza', baslik: 'Işıklı Bloklar', ikon: 'bloklar', etiket: '9 blok',
    aciklama: 'Yanan blokların sırasını aklında tut, aynı yoldan dokun.', yukle: () => import('./hafiza/corsi-bloklari.js') },
  // S14b: çalışan bellek oyunları, bölüm 2
  { ad: 'n-geri', sinif: [4, 8], modul: 'hafiza', baslik: 'Aynı mı? (n-geri)', ikon: 'n-geri', etiket: '1-geri → 2-geri',
    aciklama: 'Her öğe bir ya da iki önceki ile aynı mı? Evet ya da Hayır de.', yukle: () => import('./hafiza/n-geri.js') },
  { ad: 'kelime-listesi', sinif: [2, 8], modul: 'hafiza', baslik: 'Kelime Listesi', ikon: 'kelime-liste', etiket: 'Seç · yaz',
    aciklama: 'Kelimeleri izle, sonra sırasıyla seç ya da yaz.', yukle: () => import('./hafiza/kelime-listesi.js') },
  { ad: 'eslestirme', sinif: [2, 8], modul: 'hafiza', baslik: 'Eşleştirme Kartları', ikon: 'kartlar', etiket: '3 zorluk',
    aciklama: 'Kartları ikişer aç, eşlerini az hamlede bul.', yukle: () => import('./hafiza/eslestirme.js') },
].map(aralikDondur);
// S12: Araçlar (S15: + Hafıza Teknikleri, S16: + Tekrar Kartları, S21: + Okuma Stratejileri, S22: + Çalışma Rehberi kartları): egzersiz değil, kendi sayfası olan yardımcılar (çerçevede açılmaz, kaydedilmez). Kart alanları egzersiz kartıyla aynı + adres
const ARACLAR = Object.freeze([
  { ad: 'odak', sinif: [3, 8], modul: 'dikkat', baslik: 'Odak Araçları', ikon: 'saat', etiket: 'Ders çalışırken', adres: '#/odak',
    aciklama: 'Ortamını hazırla, kısa bloklarla çalış, odağını günlüğe yaz.' },
  // S15: Hafıza Teknikleri Akademisi: 6 mini ders (içerik data/lessons/*.json, sayfa hafiza/teknikler.js)
  // S34f: kart 2-8; her dersin kendi aralığı ders dosyasında (ilkokulda hikâye zinciri, görselleştirme, gruplama; ilkokul sürümüyle)
  { ad: 'teknikler', sinif: [2, 8], modul: 'hafiza', baslik: 'Hafıza Teknikleri', ikon: 'akademi', etiket: 'Mini dersler', adres: '#/teknikler',
    aciklama: 'Hikâye zinciri, görselleştirme, gruplama ve dahası: dene, öğren, ölç.' },
  // S21: Okuma Stratejileri: 8 mini ders (içerik data/lessons/*.json, motor lesson-engine.js, sayfa hafiza/teknikler.js; adres ders sayfasının kapsayıcısını kullanır)
  // S34f: kart 2-8; ilkokulda tahmin, 5N1K ve (3. sınıftan) ana fikir, ilkokul sürümüyle
  { ad: 'stratejiler', sinif: [2, 8], modul: 'oku', baslik: 'Okuma Stratejileri', ikon: 'akademi', etiket: 'Mini dersler', adres: '#/teknikler/stratejiler',
    aciklama: 'Tahmin, 5N1K, ana fikir ve dahası: öğren, uygula, dene.' },
  // S16: aralıklı tekrar (5 kutulu Leitner; motor js/engine/srs.js, sayfa hafiza/tekrar.js, hazır desteler data/decks/*.json)
  { ad: 'tekrar', sinif: [2, 8], modul: 'hafiza', baslik: 'Tekrar Kartları', ikon: 'tekrar-kart', etiket: 'Her gün birkaç dakika', adres: '#/tekrar',
    aciklama: 'Kartları kutularla tekrar et: bildiğin seyrekleşir, zorlandığın sık gelir.' },
  // S22: Çalışma Rehberi (#/rehber/<ad>; sayfa rehber/rehber-sayfasi.js). grup: arac (Araçlar) | bilgi (Bilgi köşesi); ana sayfadaki "Çalışma Rehberi" bölümü de buradan çizilir
  { ad: 'cornell', sinif: [5, 8], modul: 'rehber', grup: 'arac', baslik: 'Cornell Notu', ikon: 'not-sayfasi', etiket: 'Yazdırılabilir', adres: '#/rehber/cornell',
    aciklama: 'Solda sorular, sağda notlar, altta özet. Tekrar ederken kendini yokla.' },
  { ad: 'zihin-haritasi', sinif: [3, 8], modul: 'rehber', grup: 'arac', baslik: 'Zihin Haritası', ikon: 'zihin', etiket: 'Sürükle, bağla', adres: '#/rehber/zihin-haritasi',
    aciklama: 'Konuyu ortaya yaz, alt başlıkları dallar hâlinde diz; resim olarak indir.' },
  // S34f: 2-8; ilkokulda ailece kullanım dili, kısa bloklar ve ilkokul örnek planı (metinler rehber-icerik.js PLAN_METINLERI)
  { ad: 'haftalik-plan', sinif: [2, 8], modul: 'rehber', grup: 'arac', baslik: 'Haftalık Plan', ikon: 'takvim', etiket: 'Hafta sonu esnek', adres: '#/rehber/haftalik-plan',
    aciklama: 'Her güne kısa ders blokları ve molalar koy, haftanı bir bakışta gör.' },
  { ad: 'sinav-hazirlik', sinif: [5, 8], modul: 'rehber', grup: 'bilgi', baslik: 'Sınav Hazırlığı', ikon: 'test', etiket: 'LGS dahil', adres: '#/rehber/sinav-hazirlik',
    aciklama: 'Plan, kendini yoklama, yanlış defteri ve sınav günü için öneriler.' },
  { ad: 'saglikli-aliskanliklar', sinif: [2, 8], modul: 'rehber', grup: 'bilgi', baslik: 'Uyku, Beslenme, Ekran', ikon: 'kalp', etiket: 'Bilgi kartları', adres: '#/rehber/saglikli-aliskanliklar',
    aciklama: 'Ders çalışmayı kolaylaştıran günlük alışkanlıklar için genel bilgiler.' },
  { ad: 'aile-rehberi', sinif: [2, 8], modul: 'rehber', grup: 'bilgi', baslik: 'Aileler İçin', ikon: 'aile', etiket: '10 öneri', adres: '#/rehber/aile-rehberi',
    aciklama: 'Evde baskı kurmadan nasıl destek olunur? Somut öneriler.' },
].map((a) => Object.freeze(aralikDondur(a))));

// S34a: katalog kartı olmayan, sınıfa göre kapanan sayfalar (#/sinif-disi ekranı da bu bilgiyi okur). S34d: seviye testi 2-8 (ilkokulda kısa akış)
const SAYFALAR = Object.freeze([
  { ad: 'testler', sinif: [2, 8], baslik: 'Seviye Testi', adres: '#/testler', aciklama: 'Okuma, anlama, dikkat, hafıza ve görme alanını ölç.' },
].map((a) => Object.freeze(aralikDondur(a))));

const BILGILER = new Map(EGZERSIZLER.map(({ yukle, ...b }) => [b.ad, Object.freeze(b)]));
const YUKLEYICILER = new Map(EGZERSIZLER.map((e) => [e.ad, e.yukle]));

export function egzersizVarMi(ad) {
  return YUKLEYICILER.has(ad);
}

/** Kart bilgisi: { ad, modul, baslik, aciklama, ikon, etiket, sinif (S34a) } ya da null */
export const egzersizBilgisi = (ad) => BILGILER.get(ad) ?? null;
export const modulBilgisi = (ad) => MODULLER.find((m) => m.ad === ad) ?? null;

/** S34a: Kart (egzersiz, araç ya da sayfa) bu sınıfa uygun mu? Sınıf yoksa (profil yok) true */
export const kartUygunMu = (kart, sinif) => !kart || araliktaMi(sinif, kart.sinif ?? TUM_ARALIK);

/** Bir alanın egzersiz kart bilgileri (katalog sırasıyla). S34a: sinif verilirse yalnız o sınıfa uygun olanlar */
export const modulEgzersizleri = (modul, sinif) => [...BILGILER.values()].filter((b) => b.modul === modul && kartUygunMu(b, sinif));

/** S12: Araç kartı bilgisi: { ad, modul, baslik, aciklama, ikon, etiket, adres, grup? (S22), sinif (S34a) } ya da null */
export const aracBilgisi = (ad) => ARACLAR.find((a) => a.ad === ad) ?? null;
/** S12: Bir alanın araç kartları. S34a: sinif verilirse yalnız o sınıfa uygun olanlar */
export const modulAraclari = (modul, sinif) => ARACLAR.filter((a) => a.modul === modul && kartUygunMu(a, sinif));

/** S34a: Sınıfa göre kapanan sayfa bilgisi ({ ad, sinif, baslik, adres, aciklama }) ya da null */
export const sayfaBilgisi = (ad) => SAYFALAR.find((a) => a.ad === ad) ?? null;
/** S34a: Adıyla herhangi bir kart: egzersiz, araç ya da sayfa (yoksa null) */
export const kartBul = (ad) => egzersizBilgisi(ad) ?? aracBilgisi(ad) ?? sayfaBilgisi(ad);
/** S34a: Adı verilen kart bu sınıfa uygun mu? (bilinmeyen ad: true; o sayfa kendi “bulunamadı” davranışını sürdürür) */
export const sinifaUygunMu = (ad, sinif) => kartUygunMu(kartBul(ad), sinif);

/** Egzersiz tanımını döndürür; yoksa ya da yüklenemezse null. */
export async function egzersizYukle(ad) {
  if (!egzersizVarMi(ad)) return null;
  try {
    return (await YUKLEYICILER.get(ad)()).default ?? null;
  } catch (h) {
    console.error('[katalog] Egzersiz yüklenemedi:', ad, h);
    return null;
  }
}
