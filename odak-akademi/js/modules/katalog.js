// Egzersiz kataloğu: çalışma alanları (modüller), egzersiz ve araç kartı bilgileri tek yerde; adres adı (#/egzersiz/<ad>) → egzersiz dosyası, dosya yalnızca açılınca yüklenir

// Egzersiz içeren çalışma alanları (ana sayfadaki kartlar #/modul/<ad> adresine gider; renkler data-modul ile)
export const MODULLER = Object.freeze([
  { ad: 'oku', baslik: 'Okuma', aciklama: 'Akıcı ve anlayarak okuma', ikon: 'kitap' },
  { ad: 'goz', baslik: 'Göz ve Algı', aciklama: 'Görsel tarama oyunları ve mola', ikon: 'goz' },
  { ad: 'dikkat', baslik: 'Dikkat', aciklama: 'Odak oyunları ve odak araçları', ikon: 'hedef' },
  { ad: 'hafiza', baslik: 'Hafıza', aciklama: 'Teknikler ve tekrar kartları', ikon: 'ampul' },
].map(Object.freeze));

// Kart bilgileri dosya yüklenmeden gösterilir. Yeni egzersiz: dosyasını yaz, buraya bir satır ekle (liste sırası = kart sırası)
const EGZERSIZLER = [
  { ad: 'oku-anla', modul: 'oku', baslik: 'Oku ve Anla', ikon: 'kitap', etiket: 'Hız + anlama',
    aciklama: 'Metni oku, soruları yanıtla. Etkin okuma hızını gör.', yukle: () => import('./oku/oku-anla.js') },
  { ad: 'hizli-oku', modul: 'oku', baslik: 'Hızlı Oku (deneme)', ikon: 'kitap', etiket: 'Deneme',
    aciklama: 'Okuma modlarını ve hız ayarlarını dene.', yukle: () => import('./oku/hizli-oku.js') },
  { ad: 'hizli-dokun', modul: 'dikkat', baslik: 'Hızlı Dokun', ikon: 'isik', etiket: '30 saniye',
    aciklama: 'Yanan ışıkları sönmeden yakala.', yukle: () => import('./dikkat/hizli-dokun.js') },
  // S11a: seçici dikkat oyunları (ortak ölçüm: js/engine/attention-core.js)
  { ad: 'stroop', modul: 'dikkat', baslik: 'Renk mi, Kelime mi?', ikon: 'renk-kelime', etiket: '24 deneme',
    aciklama: 'Kelimeyi okuma, yazının rengini seç.', yukle: () => import('./dikkat/stroop.js') },
  { ad: 'git-dur', modul: 'dikkat', baslik: 'Dokun ya da Bekle', ikon: 'git-dur', etiket: '40 deneme',
    aciklama: 'Yalnız yıldıza dokun, öteki şekillerde bekle.', yukle: () => import('./dikkat/git-dur.js') },
  // S11b: iptal testi (seçici dikkat) ve sürekli dikkat
  { ad: 'iptal-testi', modul: 'dikkat', baslik: 'Hedef Avı', ikon: 'satirlar', etiket: '6-8 satır',
    aciklama: 'Satırları tara, yalnız hedef şekilleri işaretle.', yukle: () => import('./dikkat/iptal-testi.js') },
  { ad: 'surekli-dikkat', modul: 'dikkat', baslik: 'Gece Nöbeti', ikon: 'yorunge', etiket: '2-3 dakika',
    aciklama: 'Seyrek ve habersiz gelen hilali kaçırmadan yakala.', yukle: () => import('./dikkat/surekli-dikkat.js') },
  // S12: kutu nefes (Odak Araçları sayfasındaki mola bölümünden de açılır)
  { ad: 'nefes', modul: 'dikkat', baslik: 'Kutu Nefes', ikon: 'nefes', etiket: '1-3 dakika',
    aciklama: 'Al, tut, ver, tut: kare boyunca yavaş ve düzenli nefes.', yukle: () => import('./odak/nefes.js') },
  { ad: 'schulte', modul: 'goz', baslik: 'Schulte Tablosu', ikon: 'izgara', etiket: '3×3 – 7×7',
    aciklama: 'Karışık sayıları 1’den başlayarak sırayla bul.', yukle: () => import('./goz/schulte.js') },
  { ad: 'nesne-takibi', modul: 'goz', baslik: 'Nesne Takibi', ikon: 'yorunge', etiket: '1-3 dakika',
    aciklama: 'Başını sabit tut, hareket eden noktayı gözlerinle izle.', yukle: () => import('./goz/nesne-takibi.js') },
  { ad: 'satir-ritmi', modul: 'goz', baslik: 'Satır Ritmi', ikon: 'satirlar', etiket: 'Ritimli',
    aciklama: 'Işığı satır satır izle, satır başına rahatça geç.', yukle: () => import('./goz/satir-ritmi.js') },
  { ad: 'periferik-flas', modul: 'goz', baslik: 'Periferik Flaş', ikon: 'cevre', etiket: '400 → 100 ms',
    aciklama: 'Ortaya bak, çevrede bir an beliren sayıyı ya da kelimeyi yakala.', yukle: () => import('./goz/periferik-flas.js') },
  { ad: 'grup-flasi', modul: 'goz', baslik: 'Grup Flaşı', ikon: 'grup-flas', etiket: '2-4 kelime',
    aciklama: 'Kısa süre görünen kelime grubunu bütün olarak gör, seç ya da yaz.', yukle: () => import('./goz/grup-flasi.js') },
  { ad: 'kelime-piramidi', modul: 'goz', baslik: 'Kelime Piramidi', ikon: 'piramit', etiket: 'Genişleyen satırlar',
    aciklama: 'Ortadaki kelimeye bakarken satırın iki ucunu da gör.', yukle: () => import('./goz/kelime-piramidi.js') },
  { ad: 'sekilli-metin', modul: 'goz', baslik: 'Şekilli Metin', ikon: 'sekil', etiket: 'Kare · üçgen · elmas',
    aciklama: 'Metnini şekle diz, gözünü ortadan aşağı indirerek oku.', yukle: () => import('./goz/sekilli-metin.js') },
  // S10: görsel algı oyunları ve 20-20-20 göz molası
  { ad: 'fark-bul', modul: 'goz', baslik: 'Farkı Bul', ikon: 'fark', etiket: '3-8 fark',
    aciklama: 'İki resmi karşılaştır, aradaki farkları bul.', yukle: () => import('./goz/fark-bul.js') },
  { ad: 'gorsel-arama', modul: 'goz', baslik: 'Görsel Arama', ikon: 'arama', etiket: '12 deneme',
    aciklama: 'Kalabalığın içinde istenen şekli olabildiğince çabuk bul.', yukle: () => import('./goz/gorsel-arama.js') },
  { ad: 'simge-esle', modul: 'goz', baslik: 'Simge Anahtarı', ikon: 'simge', etiket: '60 saniye',
    aciklama: 'Anahtara bak, ortadaki simgenin sayısını seç.', yukle: () => import('./goz/simge-esle.js') },
  { ad: 'ayna-dondur', modul: 'goz', baslik: 'Ayna mı, Döndürme mi?', ikon: 'ayna', etiket: '12 deneme',
    aciklama: 'İki şekil aynı mı, yoksa biri ötekinin ayna görüntüsü mü?', yukle: () => import('./goz/ayna-dondur.js') },
  { ad: 'goz-molasi', modul: 'goz', baslik: '20-20-20 Göz Molası', ikon: 'uzak', etiket: 'Kısa mola',
    aciklama: 'Ekrandan kısa bir ara ver: yaklaşık 20 saniye uzağa bak.', yukle: () => import('./goz/goz-molasi.js') },
];
// S12: Araçlar: egzersiz değil, kendi sayfası olan yardımcılar (çerçevede açılmaz, kaydedilmez). Kart alanları egzersiz kartıyla aynı + adres
const ARACLAR = Object.freeze([
  { ad: 'odak', modul: 'dikkat', baslik: 'Odak Araçları', ikon: 'saat', etiket: 'Ders çalışırken', adres: '#/odak',
    aciklama: 'Ortamını hazırla, kısa bloklarla çalış, odağını günlüğe yaz.' },
].map(Object.freeze));

const BILGILER = new Map(EGZERSIZLER.map(({ yukle, ...b }) => [b.ad, Object.freeze(b)]));
const YUKLEYICILER = new Map(EGZERSIZLER.map((e) => [e.ad, e.yukle]));

export function egzersizVarMi(ad) {
  return YUKLEYICILER.has(ad);
}

/** Kart bilgisi: { ad, modul, baslik, aciklama, ikon, etiket } ya da null */
export const egzersizBilgisi = (ad) => BILGILER.get(ad) ?? null;
export const modulBilgisi = (ad) => MODULLER.find((m) => m.ad === ad) ?? null;
/** Bir alanın egzersiz kart bilgileri (katalog sırasıyla) */
export const modulEgzersizleri = (modul) => [...BILGILER.values()].filter((b) => b.modul === modul);

/** S12: Araç kartı bilgisi: { ad, modul, baslik, aciklama, ikon, etiket, adres } ya da null */
export const aracBilgisi = (ad) => ARACLAR.find((a) => a.ad === ad) ?? null;
/** S12: Bir alanın araç kartları */
export const modulAraclari = (modul) => ARACLAR.filter((a) => a.modul === modul);

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
