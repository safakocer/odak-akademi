// Metin bankası: sınıf metinlerini (data/texts/sinif5-8.json) yükler; öğrencinin kendi metinleri, favoriler, “okundu” bilgisi, süzgeç ve egzersize metin aktarımı
import { oku, yaz } from '../core/storage.js';
import { dinle, OLAYLAR, etkinProfil } from '../core/store.js';
import { kimlikUret, kelimelereBol, boslukTemizle, karakterSayisi, trKucuk, trSirala, sayi } from '../core/utils.js';
import { metniHazirla, kelimeMi } from './reader-engine.js';
import { sorulariDenetle, KATMANLAR, BOSLUK } from './quiz-engine.js';

export const SINIF_DUZEYLERI = Object.freeze([5, 6, 7, 8]);
export const METIN_TURLERI = Object.freeze({
  hikaye: 'Hikâye',
  masal: 'Masal ve fabl',
  bilgilendirici: 'Bilgilendirici',
  fen: 'Fen ve doğa',
  kendi: 'Kendi metnim',
});
// Uzunluk sınıfları (kelime). Kelime sayısı JSON'da tutulmaz, yüklemede hesaplanır
export const UZUNLUKLAR = Object.freeze([
  { ad: 'kisa', etiket: 'Kısa (180 kelimeden az)', en: 0, enCok: 179 },
  { ad: 'orta', etiket: 'Orta (180-259 kelime)', en: 180, enCok: 259 },
  { ad: 'uzun', etiket: 'Uzun (260 kelime ve üstü)', en: 260, enCok: Infinity },
].map(Object.freeze));
export const KENDI_SINIR = Object.freeze({
  enAzKelime: 20, enFazlaKarakter: 12000, enFazlaMetin: 30, enFazlaSoru: 5,
  baslik: Object.freeze([3, 60]), soru: Object.freeze([5, 200]), cevap: Object.freeze([2, 400]),
  secenek: Object.freeze([2, 4]), oge: Object.freeze([2, 5]), kisaMetin: 120,
});
// Öğrencinin kendi metnine yazabileceği soru türleri (quiz-engine şemasıyla aynı adlar)
export const OZ_SORU_TIPLERI = Object.freeze({
  'coktan-secmeli': 'Çoktan seçmeli',
  'dogru-yanlis': 'Doğru / yanlış',
  bosluk: 'Boşluk doldurma',
  siralama: 'Sıralama',
  'kisa-cevap': 'Açık uçlu (cevabını örnekle karşılaştırırsın)',
});

const KENDI_ONEK = 'metinler:';     // metinler:<profilId>  → öğrencinin kendi metinleri
const KUTUPHANE_ONEK = 'kutuphane:'; // kutuphane:<profilId> → { favori: [kimlik], okunan: { kimlik: {...} } }
const KIMLIK_DESENI = /^[a-z0-9-]{2,60}$/;
const dosyaAdresi = (s) => new URL(`../../data/texts/sinif${s}.json`, import.meta.url);

let banka = Object.freeze([]);
let bankaSozu = null;
let durum = { yuklendi: false, hataliDosya: 0, hataliMetin: 0 };
const secimler = new Map(); // egzersiz adı → seçilen metin kimliği (sayfa açıkken)

const pid = (profilId) => profilId ?? etkinProfil()?.id ?? null;
/** Etkin profilin sınıf düzeyi (5-8) ya da null */
export const profilSinifi = () => etkinProfil()?.sinif ?? null;

/** Okuma motoruyla aynı kural: yalnız noktalamadan oluşan parçalar kelime sayılmaz */
export function metinKelimeSayisi(metin) {
  return metniHazirla(metin).paragraflar.reduce((t, p) => t + kelimelereBol(p).filter(kelimeMi).length, 0);
}

export const uzunlukBul = (kelime) => UZUNLUKLAR.find((u) => kelime >= u.en && kelime <= u.enCok) ?? UZUNLUKLAR[0];

// ---------- Sınıf metinleri ----------
function paketDenetle(p, dosyaSinifi) {
  const hata = (m) => { throw new TypeError(`Metin "${p?.kimlik ?? '?'}": ${m}`); };
  if (!p || typeof p !== 'object' || !KIMLIK_DESENI.test(p.kimlik ?? '')) hata('kimlik eksik ya da geçersiz.');
  const sinif = Number(p.sinif ?? dosyaSinifi);
  if (!SINIF_DUZEYLERI.includes(sinif)) hata('sinif 5-8 olmalı.');
  if (!Object.hasOwn(METIN_TURLERI, p.tur) || p.tur === 'kendi') hata('tur geçersiz.');
  const ad = boslukTemizle(p.ad);
  if (!ad) hata('ad eksik.');
  const kelime = metinKelimeSayisi(p.metin);
  if (!kelime) hata('metin boş.');
  return Object.freeze({
    kimlik: p.kimlik, ad, sinif, tur: p.tur, metin: String(p.metin),
    sorular: sorulariDenetle(p.sorular), kelime, kaynak: 'banka',
  });
}

/** Tüm sınıf dosyalarını bir kez yükler (sonraki çağrılar aynı sonucu bekler). Hiçbiri yüklenemezse yeniden denenebilir. */
export function metinBankasiYukle() {
  bankaSozu ??= (async () => {
    let hataliDosya = 0;
    let hataliMetin = 0;
    const sonuclar = await Promise.allSettled(SINIF_DUZEYLERI.map(async (s) => {
      const yanit = await fetch(dosyaAdresi(s));
      if (!yanit.ok) throw new Error(`sinif${s}.json: HTTP ${yanit.status}`);
      const veri = await yanit.json();
      return (Array.isArray(veri?.metinler) ? veri.metinler : []).flatMap((p) => {
        try { return [paketDenetle(p, s)]; } catch (h) { hataliMetin++; console.warn('[metin-bankasi]', h.message); return []; }
      });
    }));
    const gorulen = new Set();
    const liste = [];
    sonuclar.forEach((r) => {
      if (r.status === 'rejected') { hataliDosya++; console.warn('[metin-bankasi] Dosya yüklenemedi:', r.reason); return; }
      r.value.forEach((m) => { if (!gorulen.has(m.kimlik)) { gorulen.add(m.kimlik); liste.push(m); } });
    });
    banka = Object.freeze(liste);
    durum = { yuklendi: liste.length > 0, hataliDosya, hataliMetin };
    if (!liste.length) bankaSozu = null; // hiç yüklenemediyse sonraki açılışta yeniden denensin
    return banka;
  })();
  return bankaSozu;
}

/** { yuklendi, hataliDosya, hataliMetin } */
export const metinBankasiDurumu = () => ({ ...durum });

// ---------- Kendi metinleri ----------
// Depoda sade biçim: { kimlik, ad, metin, sorular: [öz-soru], olusturma, guncelleme }
// Öz-soru: { tip, katman, soru, cevap? (kisa-cevap), secenekler?+dogru (sıra), dogru? (true|false), cevaplar? (bosluk), ogeler? (doğru sırayla) }
const SAHIP = 'Bu soruyu sen yazdın.';
const metinListesi = (a) => (Array.isArray(a) ? a.map((v) => boslukTemizle(v)).filter(Boolean) : []);
const tekrarVar = (liste) => new Set(liste.map(trKucuk)).size !== liste.length;

/** Ham öz-soruyu temizler (eski kayıtlarda tip yoksa açık uçlu sayılır). Hatalı değerler korunur; denetimi ozSoruHatasi yapar */
export function ozSoruDuzelt(s) {
  if (!s || typeof s !== 'object') return null;
  const tip = Object.hasOwn(OZ_SORU_TIPLERI, s.tip) ? s.tip : 'kisa-cevap';
  const o = { tip, katman: Object.hasOwn(KATMANLAR, s.katman) ? s.katman : 'bilgi', soru: boslukTemizle(s.soru) };
  if (tip === 'kisa-cevap') o.cevap = String(s.cevap ?? '').trim();
  else if (tip === 'coktan-secmeli') { o.secenekler = metinListesi(s.secenekler); o.dogru = Number.isInteger(s.dogru) ? s.dogru : -1; }
  else if (tip === 'dogru-yanlis') o.dogru = s.dogru === true || s.dogru === false ? s.dogru : null;
  else if (tip === 'bosluk') o.cevaplar = metinListesi(s.cevaplar);
  else if (tip === 'siralama') o.ogeler = metinListesi(s.ogeler);
  return o;
}

/** Öz-soruyu denetler. Döner: null ya da { alan: 'soru', sira, alt: 'soru'|'cevap'|'secenek'|'dogru'|'oge', mesaj } */
export function ozSoruHatasi(s, i = 0) {
  const h = (alt, mesaj) => ({ alan: 'soru', sira: i, alt, mesaj: `${i + 1}. soru: ${mesaj}` });
  const [en, enCok] = KENDI_SINIR.soru;
  const n = karakterSayisi(s.soru);
  if (n < en || n > enCok) return h('soru', `soru metni ${en}-${enCok} karakter olmalı.`);
  const uzun = (liste) => liste.some((m) => karakterSayisi(m) > KENDI_SINIR.kisaMetin);
  if (s.tip === 'kisa-cevap') {
    const c = karakterSayisi(s.cevap);
    if (c < KENDI_SINIR.cevap[0] || c > KENDI_SINIR.cevap[1]) return h('cevap', `örnek cevabını yaz (en çok ${KENDI_SINIR.cevap[1]} karakter).`);
  } else if (s.tip === 'coktan-secmeli') {
    if (s.secenekler.length < 2) return h('secenek', 'en az 2 seçenek yaz.');
    if (uzun(s.secenekler)) return h('secenek', `bir seçenek en çok ${KENDI_SINIR.kisaMetin} karakter olabilir.`);
    if (tekrarVar(s.secenekler)) return h('secenek', 'seçenekler birbirinden farklı olmalı.');
    if (!(s.dogru >= 0 && s.dogru < s.secenekler.length)) return h('dogru', 'dolu seçeneklerden doğru olanı işaretle.');
  } else if (s.tip === 'dogru-yanlis') {
    if (typeof s.dogru !== 'boolean') return h('dogru', 'cümlenin doğru mu yanlış mı olduğunu seç.');
  } else if (s.tip === 'bosluk') {
    if (s.soru.split(BOSLUK).length !== 2) return h('soru', `cümlede boşluğun yerine bir kez ${BOSLUK} (üç alt çizgi) yaz.`);
    if (!s.cevaplar.length) return h('cevap', 'boşluğa gelecek cevabı yaz.');
    if (uzun(s.cevaplar)) return h('cevap', `cevap en çok ${KENDI_SINIR.kisaMetin} karakter olabilir.`);
  } else if (s.tip === 'siralama') {
    if (s.ogeler.length < 2) return h('oge', 'sıralanacak en az 2 öğe yaz.');
    if (uzun(s.ogeler)) return h('oge', `bir öğe en çok ${KENDI_SINIR.kisaMetin} karakter olabilir.`);
    if (tekrarVar(s.ogeler)) return h('oge', 'öğeler birbirinden farklı olmalı.');
  }
  return null;
}

// Öz-soru → soru motoru şeması (açıklama soru türüne göre kendiliğinden yazılır)
function ozSoruyaCevir(s, i) {
  const k = { kimlik: `oz-${i + 1}`, tip: s.tip, katman: s.katman, soru: s.soru };
  if (s.tip === 'kisa-cevap') {
    return { ...k, ornekCevap: s.cevap, aciklama: `${SAHIP} Cevabını, kendi yazdığın örnek cevapla karşılaştır.`,
      kontrolListesi: ['Cevabım, yazdığım örnek cevaptaki ana fikri içeriyor.', 'Cevabımı metindeki bilgilere dayandırdım.'] };
  }
  if (s.tip === 'coktan-secmeli') return { ...k, secenekler: s.secenekler, dogru: s.dogru, aciklama: `${SAHIP} Doğru cevap: “${s.secenekler[s.dogru]}”.` };
  if (s.tip === 'dogru-yanlis') return { ...k, dogru: s.dogru, aciklama: `${SAHIP} Bu cümle ${s.dogru ? 'doğru' : 'yanlış'}.` };
  if (s.tip === 'bosluk') return { ...k, cevaplar: s.cevaplar, aciklama: `${SAHIP} Kabul edilen cevap: ${s.cevaplar.join(' / ')}.` };
  return { ...k, ogeler: s.ogeler, aciklama: `${SAHIP} Doğru sıra, soruyu yazarken verdiğin sıradır.` };
}

function kendiPaket(k) {
  if (!k || typeof k !== 'object' || !KIMLIK_DESENI.test(k.kimlik ?? '') || typeof k.metin !== 'string') return null;
  const ozSorular = (Array.isArray(k.sorular) ? k.sorular : []).map(ozSoruDuzelt)
    .filter((s, i) => s && !ozSoruHatasi(s, i)).slice(0, KENDI_SINIR.enFazlaSoru).map(Object.freeze);
  let sorular = Object.freeze([]);
  try { if (ozSorular.length) sorular = sorulariDenetle(ozSorular.map(ozSoruyaCevir)); } catch { sorular = Object.freeze([]); }
  return Object.freeze({
    kimlik: k.kimlik, ad: boslukTemizle(k.ad) || 'Adsız metin', sinif: null, tur: 'kendi', metin: k.metin,
    sorular, ozSorular: Object.freeze(ozSorular), kelime: metinKelimeSayisi(k.metin), kaynak: 'kendi',
    olusturma: k.olusturma, guncelleme: k.guncelleme ?? k.olusturma,
  });
}

function kendiHamListe(id) {
  const liste = id ? oku(KENDI_ONEK + id, []) : [];
  return Array.isArray(liste) ? liste.filter((k) => k && typeof k === 'object') : [];
}

/** Profilin kendi metinleri (en son düzenlenen önce) */
export function kendiMetinleri(profilId) {
  return kendiHamListe(pid(profilId)).map(kendiPaket).filter(Boolean)
    .sort((a, b) => String(b.guncelleme).localeCompare(String(a.guncelleme)));
}

/**
 * Kendi metin bilgisini denetler. bilgi: { ad, metin, sorular?: [öz-soru] }
 * Döner: null ya da { alan: 'ad'|'metin'|'soru'|'genel', sira?, alt?, mesaj }
 */
export function kendiMetinDenetle({ ad, metin, sorular = [] } = {}) {
  const b = karakterSayisi(boslukTemizle(ad));
  const [bEn, bEnCok] = KENDI_SINIR.baslik;
  if (b < bEn || b > bEnCok) return { alan: 'ad', mesaj: `Başlık ${bEn}-${bEnCok} karakter olmalı.` };
  if (karakterSayisi(metin) > KENDI_SINIR.enFazlaKarakter) {
    return { alan: 'metin', mesaj: `Metin en çok ${KENDI_SINIR.enFazlaKarakter.toLocaleString('tr-TR')} karakter olabilir.` };
  }
  const n = metinKelimeSayisi(metin);
  if (n < KENDI_SINIR.enAzKelime) return { alan: 'metin', mesaj: `Metin en az ${KENDI_SINIR.enAzKelime} kelime olmalı. Şu an ${n} kelime var.` };
  if (sorular.length > KENDI_SINIR.enFazlaSoru) return { alan: 'genel', mesaj: `En çok ${KENDI_SINIR.enFazlaSoru} soru yazabilirsin.` };
  for (let i = 0; i < sorular.length; i++) {
    const s = ozSoruDuzelt(sorular[i]);
    const h = s ? ozSoruHatasi(s, i) : { alan: 'soru', sira: i, alt: 'soru', mesaj: `${i + 1}. soru okunamadı.` };
    if (h) return h;
  }
  return null;
}

/**
 * Yeni metin ekler ya da (kimlik verilirse) var olanı günceller.
 * Döner: { tamam: true, metin } | { tamam: false, hata: { alan, sira?, alt?, mesaj } }
 */
export function kendiMetniKaydet(bilgi, profilId) {
  const id = pid(profilId);
  if (!id) return { tamam: false, hata: { alan: 'genel', mesaj: 'Metin eklemek için önce bir profil oluştur.' } };
  const sorular = (bilgi?.sorular ?? []).map(ozSoruDuzelt).filter(Boolean);
  const hata = kendiMetinDenetle({ ...bilgi, sorular });
  if (hata) return { tamam: false, hata };
  try { if (sorular.length) sorulariDenetle(sorular.map(ozSoruyaCevir)); } catch (h) {
    console.warn('[metin-bankasi]', h.message);
    return { tamam: false, hata: { alan: 'genel', mesaj: 'Sorulardan biri kaydedilemedi. Soruları gözden geçirip yeniden dene.' } };
  }
  const liste = kendiHamListe(id);
  const i = bilgi.kimlik ? liste.findIndex((k) => k.kimlik === bilgi.kimlik) : -1;
  if (i < 0 && liste.length >= KENDI_SINIR.enFazlaMetin) {
    return { tamam: false, hata: { alan: 'genel', mesaj: `En çok ${KENDI_SINIR.enFazlaMetin} metin ekleyebilirsin. Yeni metin için eskilerden birini sil.` } };
  }
  const simdi = new Date().toISOString();
  const kayit = {
    kimlik: i >= 0 ? liste[i].kimlik : `kendi-${trKucuk(kimlikUret()).replace(/[^a-z0-9-]/g, '')}`.slice(0, 60),
    ad: boslukTemizle(bilgi.ad),
    metin: metniHazirla(bilgi.metin).metin,
    sorular,
    olusturma: i >= 0 ? liste[i].olusturma ?? simdi : simdi,
    guncelleme: simdi,
  };
  if (i >= 0) liste[i] = kayit; else liste.push(kayit);
  if (!yaz(KENDI_ONEK + id, liste)) return { tamam: false, hata: { alan: 'genel', mesaj: 'Metin kaydedilemedi. Cihazda yer kalmamış olabilir.' } };
  return { tamam: true, metin: kendiPaket(kayit) };
}

/** Kendi metnini siler (favori ve okundu bilgisiyle birlikte). Döner: true | false */
export function kendiMetniSil(kimlik, profilId) {
  const id = pid(profilId);
  if (!id) return false;
  const liste = kendiHamListe(id);
  const yeni = liste.filter((k) => k.kimlik !== kimlik);
  if (yeni.length === liste.length) return false;
  if (!yaz(KENDI_ONEK + id, yeni)) return false;
  const d = kutuphaneDurumu(id);
  delete d.okunan[kimlik];
  durumYaz(id, { favori: d.favori.filter((k) => k !== kimlik), okunan: d.okunan });
  return true;
}

// ---------- Hepsi birlikte ----------
/** Sınıf metinleri + kendi metinleri. Önce metinBankasiYukle() beklenmeli (yoksa yalnız kendi metinleri gelir) */
export function tumMetinler(profilId) {
  return [...banka, ...kendiMetinleri(profilId)];
}

export function metinBul(kimlik, profilId) {
  return tumMetinler(profilId).find((m) => m.kimlik === kimlik) ?? null;
}

// ---------- Favoriler ve okundu bilgisi ----------
function kutuphaneDurumu(id) {
  const d = id ? oku(KUTUPHANE_ONEK + id, {}) : {};
  const nesne = d && typeof d === 'object' && !Array.isArray(d) ? d : {};
  return {
    favori: Array.isArray(nesne.favori) ? nesne.favori.filter((k) => typeof k === 'string') : [],
    okunan: nesne.okunan && typeof nesne.okunan === 'object' && !Array.isArray(nesne.okunan) ? { ...nesne.okunan } : {},
  };
}
const durumYaz = (id, d) => yaz(KUTUPHANE_ONEK + id, d);

export const favoriMi = (kimlik, profilId) => kutuphaneDurumu(pid(profilId)).favori.includes(kimlik);

/** Favoriye ekler/çıkarır. Döner: yeni durum (true = favoride) ya da profil yoksa null */
export function favoriDegistir(kimlik, profilId) {
  const id = pid(profilId);
  if (!id) return null;
  const d = kutuphaneDurumu(id);
  const vardi = d.favori.includes(kimlik);
  d.favori = vardi ? d.favori.filter((k) => k !== kimlik) : [...d.favori, kimlik];
  return durumYaz(id, d) ? !vardi : vardi;
}

/** { sayi, son, sonAnlama?, enIyiAnlama? } ya da null */
export function okumaBilgisi(kimlik, profilId) {
  const b = kutuphaneDurumu(pid(profilId)).okunan[kimlik];
  return b && typeof b === 'object' ? b : null;
}

/** Metin sonuna kadar okununca çağrılır (Hızlı Oku, Oku ve Anla). anlamaYuzde varsa en iyisi de saklanır */
export function okunduIsaretle(kimlik, { anlamaYuzde } = {}, profilId) {
  const id = pid(profilId);
  if (!id || typeof kimlik !== 'string') return false;
  const d = kutuphaneDurumu(id);
  const eski = d.okunan[kimlik] ?? {};
  const a = sayi(anlamaYuzde);
  const yeni = { sayi: (sayi(eski.sayi) ?? 0) + 1, son: new Date().toISOString() };
  if (a !== undefined) {
    yeni.sonAnlama = Math.round(a);
    yeni.enIyiAnlama = Math.max(Math.round(a), sayi(eski.enIyiAnlama) ?? 0);
  } else if (eski.enIyiAnlama !== undefined) {
    yeni.sonAnlama = eski.sonAnlama;
    yeni.enIyiAnlama = eski.enIyiAnlama;
  }
  d.okunan[kimlik] = yeni;
  return durumYaz(id, d);
}

/** “Okundu” ve anlama bilgilerini siler; favoriler kalır (Ayarlar → Sonuçları sil). Döner: true | false */
export function okunanlariSil(profilId) {
  const id = pid(profilId);
  if (!id) return false;
  return durumYaz(id, { favori: kutuphaneDurumu(id).favori, okunan: {} });
}

/** Seviye göstergesi: metnin sınıfı öğrencinin sınıfına göre. Döner: { derece (1-4, kendi metinde 0), etiket } */
export function seviyeBilgisi(metin, profilSinif = profilSinifi()) {
  if (!metin?.sinif) return { derece: 0, etiket: 'Kendi metnin' };
  const derece = metin.sinif - 4;
  if (!profilSinif) return { derece, etiket: `${metin.sinif}. sınıf` };
  const fark = metin.sinif - profilSinif;
  const etiket = fark === 0 ? 'Sınıfına uygun' : fark < 0 ? 'Daha kolay' : fark === 1 ? 'Biraz zorlayıcı' : 'Zorlayıcı';
  return { derece, etiket };
}

// ---------- Süzgeç ve sıralama ----------
/**
 * suzgec: { arama, sinif (5-8 | ''), tur (anahtar | ''), uzunluk (ad | ''), durum ('okundu'|'okunmadi'|''), favori (bool) }
 * Sıra: öğrencinin sınıfındaki metinler, sonra diğer sınıflar, en sonda kendi metinleri.
 */
export function metinleriSuz(liste, suzgec = {}, profilId) {
  const id = pid(profilId);
  const d = kutuphaneDurumu(id);
  const aranan = trKucuk(boslukTemizle(suzgec.arama));
  const sinif = Number(suzgec.sinif) || null;
  const ps = profilSinifi();
  return liste.filter((m) => {
    if (sinif && m.sinif !== sinif) return false;
    if (suzgec.tur && m.tur !== suzgec.tur) return false;
    if (suzgec.uzunluk && uzunlukBul(m.kelime).ad !== suzgec.uzunluk) return false;
    const okundu = !!d.okunan[m.kimlik];
    if (suzgec.durum === 'okundu' && !okundu) return false;
    if (suzgec.durum === 'okunmadi' && okundu) return false;
    if (suzgec.favori && !d.favori.includes(m.kimlik)) return false;
    return !aranan || trKucuk(m.ad).includes(aranan) || trKucuk(m.metin).includes(aranan);
  }).sort((a, b) => {
    const sira = (m) => (m.kaynak === 'kendi' ? 3 : m.sinif === ps ? 0 : 1);
    return sira(a) - sira(b) || (a.sinif ?? 0) - (b.sinif ?? 0) || (a.kaynak === 'kendi' ? 0 : trSirala(a.ad, b.ad));
  });
}

// ---------- Egzersize metin aktarımı ----------
/** Kütüphane “Oku” deyince ya da seçici değişince: egzersiz o metinle açılır */
export function secimAyarla(egzersiz, kimlik) {
  if (egzersiz && kimlik) secimler.set(egzersiz, kimlik);
}
export const secimAl = (egzersiz) => secimler.get(egzersiz) ?? null;

// Profil silinince metinler/kütüphane anahtarlarını profile.js siler (bu dosya yüklenmemiş olsa da)
// Profil değişince bir önceki profilin seçimleri taşınmasın
dinle(OLAYLAR.PROFIL_DEGISTI, () => secimler.clear());
