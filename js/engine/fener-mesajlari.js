// Fener’in ana sayfa mesajları ve ipuçları (S30): duruma göre ifade + mesaj seçimi. Saf modül (DOM ve depo yok); bilgiyi app.js toplar, fener.js yeniden dışa açar.
// Uzunluk (S30 düzeltme): mesaj ve ipucu en çok ~90 karakter; ana sayfa balonu bu uzunluğa göre sabit yükseklikte (telefonda 4, genişte 2-3 satır).
// Dil kuralı: kısa, “henüz / bir sonraki hedef” dili; başkasıyla karşılaştırma, seri kaybı korkusu, süre baskısı ve tıbbi iddia yok.
// S34f: ilkokul (2-4. sınıf) için ayrı mesaj ve ipucu kümeleri: daha kısa cümleler (cümle başına en çok ~8 kelime, mesaj en çok ~60 karakter), aynı durumlar ve öncelik. Kademe profilin sınıfından; profil yoksa ortaokul kümesi.
import { kademe } from '../core/siniflar.js';

export const GECE = Object.freeze({ basDk: 21 * 60 + 30, bitDk: 6 * 60 }); // 21.30-06.00 arası “dinlenme” mesajı
export const SERI_TASLARI = Object.freeze([3, 5, 7, 10, 14, 21, 30, 50, 75, 100]);
export const SEVIYE_YAKIN_XP = 30; // bir sonraki seviyeye bu kadar XP kalınca
export const HEDEF_YAKIN_YUZDE = 75; // günlük hedefin bu yüzdesi dolunca
export const DONUS_BOS_GUN = 3; // en az bu kadar boş günden sonra “tekrar hoş geldin”
export const TEST_ONERI_ARALIGI = 3; // seviye testi önerisi her 3 günde bir (her gün tekrarlanmasın)

/** Durum → Fener’in ifadesi (fener.js FENER_IFADELERI anahtarları) */
export const DURUM_IFADESI = Object.freeze({
  profilYok: 'normal', uzun: 'mola', gece: 'uykulu', rozet: 'sevinc', seviye: 'sevinc', hedef: 'sevinc', seri: 'sevinc',
  donus: 'saskin', yeni: 'normal', kurs: 'cesaret', tekrar: 'dusunme', final: 'dusunme', seviyeYakin: 'cesaret',
  hedefYakin: 'cesaret', calisti: 'cesaret', test: 'dusunme', sabah: 'normal', ogle: 'dusunme', aksam: 'normal',
});

// Şablonlar: {ad} biçimindeki yerler doldurulur. Sayıdan sonra ek gelmeyecek biçimde yazıldı (5’e / 3’e sorunu olmasın)
const MESAJLAR = Object.freeze({
  profilYok: ['Merhaba, ben Fener! Bir profil oluşturunca kısa çalışmalarla başlayabiliriz.'],
  uzun: [
    'Bugün epey çalıştın. Şimdi dinlenme zamanı; yarın yine buradayım.',
    'Bugün çok emek verdin. Biraz oyna, biraz dinlen; yarın devam ederiz.',
    'Bugünlük yeter. Dinlenmek de öğrenmenin bir parçası.',
  ],
  gece: [
    'Saat epey ilerledi. Ben de uykuya hazırlanıyorum; yarın görüşürüz!',
    'Gece oldu. İyi bir uyku, yarına hazır olmanın güzel bir yolu.',
    'Yıldızlar çıktı! Bugünlük dinlenelim, yarın yeni bir tur yaparız.',
  ],
  rozet: [
    'Bugün yeni rozet kazandın: {rozet}! İlerleme sayfasında seni bekliyor.',
    'Işığım senin için parlıyor! Yeni rozetin: {rozet}.',
    'Yeni rozet: {rozet}. Emeğinin karşılığını aldın!',
  ],
  seviye: [
    'Bugün seviye atladın! Artık Seviye {seviye}: {unvan}.',
    'Yeni seviye, yeni unvan: {unvan}! Tebrikler.',
    'Seviye {seviye} oldun. Adım adım ilerliyorsun!',
  ],
  hedef: [
    'Bugünkü hedefin tamam! İstersen dinlen, istersen kısa bir tur daha yap.',
    'Hedef tamam! Bugünlük yeter diyebilirsin.',
    'Günlük hedefine ulaştın. Kendinle gurur duyabilirsin!',
  ],
  seri: [
    '{n} gündür buradasın. Bu güzel bir alışkanlık!',
    '{n} günlük seri! Her gün küçük bir adım, uzun bir yol.',
    'Serin {n} güne ulaştı. Işığım bugün daha da parlak!',
  ],
  donus: [
    'Tekrar hoş geldin! Kısa bir egzersizle ısınalım mı?',
    'Aa, sen geldin! Kaldığımız yerden yavaşça devam edelim.',
    'Seni görmek ne güzel! Bugün küçük bir turla başlayabiliriz.',
  ],
  yeni: [
    'Hoş geldin! Ben Fener. İlk kısa turunu birlikte yapalım mı?',
    'Burada yeni misin? Merak ettiğin bir egzersizi seç; ben yanındayım.',
    'İlk adım en güzeli! Birkaç dakikalık bir tur yeter.',
  ],
  kurs: [
    'Akıllı Kurs’ta bugünkü dersin seni bekliyor.',
    'Kursta yeni bir gün! Bugünkü dersler kısa ve eğlenceli.',
    'Bugünkü kurs dersini birlikte yapalım mı?',
  ],
  tekrar: [
    'Tekrar zamanı gelen kart sayısı: {n}. Hatırlıyor musun bakalım?',
    'Tekrar Kartları’nda seni bekleyen kart sayısı: {n}.',
    'Bugün tekrar edilecek {n} kart var. Tekrar etmek, öğrendiklerini aklında tutar.',
  ],
  final: [
    'Final testin hazır! Ne kadar ilerlediğini birlikte görelim mi?',
    'Seviye testini yeniden çözme zamanı. Kendi gelişimini görmek ister misin?',
  ],
  seviyeYakin: [
    'Bir sonraki seviyeye {kalan} XP kaldı!',
    'Seviye {sonraki} çok yakın: yalnızca {kalan} XP.',
  ],
  hedefYakin: [
    'Neredeyse tamam! Hedefe {kalan} dakika kaldı.',
    'Az kaldı: {kalan} dakika daha ve bugünkü hedefin tamam.',
  ],
  calisti: [
    'Güzel gidiyorsun. Hedefe {kalan} dakika kaldı; kısa bir tur yeter.',
    'Bugün başladın bile! Hedefe {kalan} dakika kaldı.',
    'Her tur bir adım. Hedefe {kalan} dakika kaldı.',
  ],
  test: [
    'Seviye testini henüz çözmedin. Nereden başlayacağımızı görmek için iyi bir yol!',
    'Seviye testi, Akıllı Kurs’un sana göre ayarlanmasına yardım eder. Denemek ister misin?',
  ],
  sabah: [
    'Günaydın! Bugün ne öğreneceğiz?',
    'Günaydın! Güne kısa bir egzersizle başlamaya ne dersin?',
    'Günaydın! Merak ettiğin bir egzersizi seç; ben buradayım.',
  ],
  ogle: [
    'Bugün hangi alanı deneyelim? Kısa bir çalışma yeter.',
    'Henüz başlamadık. Birkaç dakikalık bir tur güzel bir başlangıç olur.',
    'Bir sonraki hedefin: bugünün ilk turunu tamamlamak.',
    'Merak ettiğin bir egzersizi seç; ben buradayım.',
  ],
  aksam: [
    'İyi akşamlar! Kısa bir tur bugün için yeter.',
    'Akşam oldu. Bugün hangi alanı deneyelim?',
    'İyi akşamlar! Birkaç dakikalık bir egzersizle günü tamamlayalım mı?',
  ],
});

// S34f: ilkokul mesajları (MESAJLAR ile aynı anahtarlar; şablon yerleri aynı)
const MESAJLAR_ILKOKUL = Object.freeze({
  profilYok: ['Merhaba, ben Fener! Önce bir profil oluşturalım.'],
  uzun: ['Bugün çok çalıştın. Şimdi dinlenme zamanı.', 'Bugünlük yeter. Biraz oyna, biraz dinlen.', 'Çok emek verdin. Yarın yine buradayım.'],
  gece: ['Gece oldu. Ben de uyuyorum. İyi geceler!', 'Yıldızlar çıktı! Yarın görüşürüz.', 'Uyku zamanı. Yarın yine oynarız.'],
  rozet: ['Yeni rozet: {rozet}! Emeğin için tebrikler.', 'Işığım parlıyor! Yeni rozetin: {rozet}.', 'Bugün rozet kazandın: {rozet}!'],
  seviye: ['Seviye atladın! Artık Seviye {seviye}.', 'Yeni unvanın: {unvan}! Tebrikler.', 'Seviye {seviye} oldun. Adım adım ilerliyorsun!'],
  hedef: ['Bugünkü hedefin tamam! İstersen dinlen.', 'Hedef tamam! Bugünlük yeter.', 'Hedefine ulaştın. Harika iş!'],
  seri: ['{n} gündür buradasın. Süper!', '{n} günlük seri! Her gün küçük bir adım.', 'Serin {n} gün oldu. Işığım parlıyor!'],
  donus: ['Tekrar hoş geldin! Kısa bir turla başlayalım mı?', 'Seni gördüğüme sevindim! Yavaşça başlayalım.', 'Hoş geldin! Küçük bir turla başlayalım.'],
  yeni: ['Hoş geldin! Ben Fener. Birlikte başlayalım mı?', 'Merak ettiğin bir oyunu seç. Ben yanındayım.', 'İlk adım en güzeli! Kısa bir tur yeter.'],
  kurs: ['Kursta bugünkü dersin hazır.', 'Kursta yeni bir gün! Hadi başlayalım.', 'Bugünkü kurs dersini yapalım mı?'],
  tekrar: ['Tekrar edilecek kart sayısı: {n}. Hatırlıyor musun?', 'Seni bekleyen kart sayısı: {n}.', 'Bugün {n} kart var. Hadi tekrar edelim.'],
  final: ['Final testin hazır! Neler öğrendiğine bakalım mı?', 'Testi yeniden çözme zamanı. Gelişimini görelim mi?'],
  seviyeYakin: ['Bir sonraki seviyeye {kalan} XP kaldı!', 'Seviye {sonraki} çok yakın!'],
  hedefYakin: ['Az kaldı! Hedefe {kalan} dakika var.', 'Neredeyse tamam! {kalan} dakika daha.'],
  calisti: ['Güzel gidiyorsun! Hedefe {kalan} dakika kaldı.', 'Başladın bile! Hedefe {kalan} dakika kaldı.', 'Her tur bir adım. {kalan} dakika kaldı.'],
  test: ['Seviye testini henüz çözmedin. Birlikte deneyelim mi?', 'Kısa bir test, kursu sana göre ayarlar.'],
  sabah: ['Günaydın! Bugün ne öğrenelim?', 'Günaydın! Kısa bir turla başlayalım mı?', 'Günaydın! Bir oyun seç, ben buradayım.'],
  ogle: ['Bugün hangi oyunu deneyelim?', 'Henüz başlamadık. Kısa bir tur yeter.', 'Bir sonraki hedef: bugünün ilk turu.', 'Bir oyun seç, ben buradayım.'],
  aksam: ['İyi akşamlar! Kısa bir tur yeter.', 'Akşam oldu. Hangi oyunu deneyelim?', 'İyi akşamlar! Günü küçük bir turla bitirelim mi?'],
});

/** Fener’e dokununca sırayla gelen ipuçları (genel çalışma ve okuma önerileri; kesin iddia yok) */
export const IPUCLARI = Object.freeze([
  'Okumadan önce başlığa ve resimlere bak; metnin neyle ilgili olduğunu tahmin et.',
  'Bir paragrafı bitirince kendine “Burada ne anlatıldı?” diye sor.',
  'Hızlı okumak tek hedef değil; anlayarak okuduğun hız en iyi hızdır.',
  'Yeni öğrendiğin bir şeyi birine anlatmak, onu hatırlamana yardım eder.',
  'Kısa çalışıp kısa mola vermek, dikkatini toplamayı kolaylaştırabilir.',
  'Bilmediğin bir kelimenin anlamını önce cümleden tahmin et, sonra sözlüğe bak.',
  'Bir bilgiyi birkaç gün arayla tekrar etmek, onu daha kalıcı yapar.',
  'Çalışırken telefonu uzağa bırakmak dikkatini korumana yardım eder.',
  'Bir konuyu okuduktan sonra kitabı kapat ve hatırladıklarını yaz.',
  'Uzun bir listeyi hatırlamak için öğeleri küçük gruplara ayır.',
  'Gözlerin yorulunca birkaç saniye uzağa bak. Göz Molası egzersizi de var!',
  'Hata yapmak öğrenmenin parçası. “Henüz” olmadı; bir sonraki turda yeniden dene.',
  'Okuduğun metni kendi cümlelerinle bir iki cümlede özetlemeyi dene.',
  'Çalışmaya başlamadan önce masanda yalnızca gerekenleri bırak.',
  'Hikâye okurken “Sonra ne olacak?” diye tahmin etmek okumayı daha eğlenceli yapar.',
  'Zor bir metni ikinci kez okumak, onu daha akıcı okumana yardım eder.',
  'Kendini başkalarıyla değil, dünkü kendinle karşılaştır.',
  'Tablo ve grafiklerde önce başlığa ve eksenlerdeki yazılara bak.',
  'Bir şeyi zihninde resim gibi canlandırmak, onu hatırlamayı kolaylaştırır.',
  'İyi bir uyku, ertesi gün derse hazır olmana yardım eder.',
]);

/** S34f: ilkokul ipuçları (20; kısa cümleler) */
export const IPUCLARI_ILKOKUL = Object.freeze([
  'Okumadan önce başlığa ve resme bak. Ne anlatacak, tahmin et.',
  'Bir sayfayı bitirince kendine sor: Neler oldu?',
  'Anlayarak okumak, hızlı okumaktan önemlidir.',
  'Öğrendiğin bir şeyi ailene anlat.',
  'Kısa çalış, sonra kısa bir mola ver.',
  'Bilmediğin kelimeyi önce cümleden tahmin et.',
  'Öğrendiğini birkaç gün sonra yeniden hatırla.',
  'Çalışırken masanda yalnız gerekenler olsun.',
  'Okuduktan sonra kitabı kapat. Neler hatırlıyorsun?',
  'Uzun bir listeyi küçük gruplara ayır.',
  'Gözlerin yorulunca biraz uzağa bak.',
  'Hata yapmak öğrenmenin parçası. Yeniden dene!',
  'Okuduğun hikâyeyi bir iki cümleyle anlat.',
  'Hikâye okurken sor: Sonra ne olacak?',
  'Sevdiğin bir kitabı yeniden okumak çok iyidir.',
  'Kendini başkasıyla değil, dünkü hâlinle karşılaştır.',
  'Bir şeyi zihninde resim gibi düşün. Daha kolay hatırlarsın.',
  'İyi bir uyku, seni ertesi güne hazırlar.',
  'Bir büyüğünle sırayla sesli okuyabilirsin.',
  'Kim? Ne? Nerede? Ne zaman? Bu sorular hikâyeyi anlatır.',
]);

/** S34f: kademe → mesaj ve ipucu kümesi (kademe yoksa ortaokul) */
export const MESAJ_KUMELERI = Object.freeze({ ortaokul: MESAJLAR, ilkokul: MESAJLAR_ILKOKUL });
export const IPUCU_KUMELERI = Object.freeze({ ortaokul: IPUCLARI, ilkokul: IPUCLARI_ILKOKUL });
const mesajlar = (sinif) => MESAJ_KUMELERI[kademe(sinif)] ?? MESAJLAR;
const ipuclari = (sinif) => IPUCU_KUMELERI[kademe(sinif)] ?? IPUCLARI;

const GUN_MS = 86400000;
/** Yerel tarihin gün numarası (aynı gün aynı sayı; saat dilimi kayması yok) */
export function gunNumarasi(t = new Date()) {
  return Math.floor(Date.UTC(t.getFullYear(), t.getMonth(), t.getDate()) / GUN_MS);
}

// Durum adından küçük bir sayı: farklı durumlar aynı gün aynı sıradaki mesaja denk gelmesin
const karma = (s) => [...s].reduce((t, h) => (t * 31 + h.charCodeAt(0)) % 997, 7);
const doldur = (sablon, degerler = {}) => sablon.replace(/\{(\w+)\}/g, (tum, ad) => (degerler[ad] ?? tum));
// ['A', 'B', 'C'] → 'A, B ve C'
const listeMetni = (dizi) => (dizi.length < 2 ? dizi.join('') : `${dizi.slice(0, -1).join(', ')} ve ${dizi.at(-1)}`);

/** Durumun mesaj listesinden günün mesajı (gün içinde değişmez, ertesi gün sıradaki gelir). S34f: sinif verilirse o kademenin kümesi */
export function mesajSec(durum, gun = new Date(), degerler = {}, sinif = null) {
  const kume = mesajlar(sinif);
  const liste = kume[durum] ?? kume.ogle;
  return doldur(liste[(gunNumarasi(gun) + karma(durum)) % liste.length], degerler);
}

/**
 * Ana sayfa balonunun ifadesi ve mesajı. Öncelik sırası kodda yukarıdan aşağıya.
 * b: { profil, durum (motivasyon.bugunDurumu), gun (Date), seri {gun, bugunCalisildi}, seviye {no, unvan, kalan, bugunAtladi},
 *      yeniRozetler [ad], araGun (son çalışılan günden bugüne gün farkı | null), tekrarKart (sayı | null), kurs ('bekliyor' | 'tamam' | null), test (testDurumu().asama | null) }
 * Yalnız { profil, durum } verilirse (S28 çağrısı) S28’deki temel davranış sürer. Döner: { ifade, mesaj, durum }
 * S34f: mesaj kümesi profilin sınıfına göre (ilkokulda kısa cümleler); durum ve öncelik aynı
 */
export function anaSayfaMesaji(b = {}) {
  const gun = b.gun ?? new Date();
  const sinif = b.profil?.sinif ?? null;
  const sec = (durum, degerler) => ({ ifade: DURUM_IFADESI[durum], mesaj: mesajSec(durum, gun, degerler, sinif), durum });
  if (!b.profil) return sec('profilYok');
  const d = b.durum ?? { dk: 0, hedefDk: 0, yuzde: 0, kayit: 0 };
  const dakika = gun.getHours() * 60 + gun.getMinutes();
  const calisti = b.seri ? b.seri.bugunCalisildi : (d.kayit ?? 0) > 0 || d.dk > 0;

  if (d.uzun) return sec('uzun');
  if (dakika >= GECE.basDk || dakika < GECE.bitDk) return sec('gece');
  if (b.yeniRozetler?.length) return sec('rozet', { rozet: listeMetni(b.yeniRozetler) });
  if (b.seviye?.bugunAtladi) return sec('seviye', { seviye: b.seviye.no, unvan: b.seviye.unvan });
  if (d.hedefTamam) return sec('hedef');
  if (calisti && SERI_TASLARI.includes(b.seri?.gun)) return sec('seri', { n: b.seri.gun });
  if (!calisti && b.seri && b.araGun == null) return sec('yeni'); // hiç çalışılmış gün yok
  if (!calisti && b.araGun != null && b.araGun - 1 >= DONUS_BOS_GUN) return sec('donus');
  if (b.kurs === 'bekliyor') return sec('kurs');
  if (b.tekrarKart > 0) return sec('tekrar', { n: b.tekrarKart });
  if (b.test === 'hazir') return sec('final');
  if (b.seviye && b.seviye.kalan <= SEVIYE_YAKIN_XP) return sec('seviyeYakin', { kalan: b.seviye.kalan, sonraki: b.seviye.no + 1 });
  if (d.dk > 0) {
    const kalan = Math.max(1, d.hedefDk - d.dk);
    return sec(d.yuzde >= HEDEF_YAKIN_YUZDE ? 'hedefYakin' : 'calisti', { kalan });
  }
  if (b.test === 'yok' && gunNumarasi(gun) % TEST_ONERI_ARALIGI === 0) return sec('test');
  return sec(dakika < 12 * 60 ? 'sabah' : dakika < 18 * 60 ? 'ogle' : 'aksam');
}

/** n. ipucu (döngüsel). S34f: sinif verilirse o kademenin ipuçları */
export function ipucuMetni(n, sinif = null) {
  const liste = ipuclari(sinif);
  const L = liste.length;
  return liste[((n % L) + L) % L];
}
/** Günün ilk ipucunun sırası (her gün farklı bir ipucundan başlar). S34f: sinif verilirse o kademenin ipucu sayısıyla */
export function gunlukIpucuSirasi(gun = new Date(), sinif = null) { return gunNumarasi(gun) % ipuclari(sinif).length; }
