// Ortak yardımcılar: Türkçe metin işlemleri, sayı/süre/tarih biçimleme, kimlik üretme (DOM'a dokunmaz)

const YEREL = 'tr-TR';

// ---------- Metin (Türkçe) ----------
/** tr-TR küçük harf: "IŞIK" → "ışık", "İnci" → "inci" */
export const trKucuk = (s) => String(s ?? '').toLocaleLowerCase(YEREL);
/** tr-TR büyük harf: "inci" → "İNCİ", "ılık" → "ILIK" */
export const trBuyuk = (s) => String(s ?? '').toLocaleUpperCase(YEREL);
/** Baştaki/sondaki boşlukları siler, aradaki çoklu boşlukları teke indirir */
export const boslukTemizle = (s) => String(s ?? '').trim().replace(/\s+/g, ' ');
/** Emoji ve birleşik harfleri tek sayan karakter sayısı */
export const karakterSayisi = (s) => [...String(s ?? '')].length;
/** Türkçe alfabe sırasıyla karşılaştırma (sort için) */
export const trSirala = (a, b) => String(a).localeCompare(String(b), YEREL, { sensitivity: 'base' });

/** Metni boşluklara göre kelimelere böler (noktalama kelimeye bağlı kalır) */
export function kelimelereBol(metin) {
  const m = String(metin ?? '').trim();
  return m ? m.split(/\s+/u) : [];
}

/**
 * Kelimeleri okuma gruplarına ayırır. Türkçe kelimeler eklerle uzadığı için
 * grup hem kelime sayısıyla hem karakter uzunluğuyla sınırlanır (tek kelime sınırı aşsa da tek başına grup olur).
 * Örnek: kelimeGruplari('Kitapları ...', { enFazlaKelime: 3, enFazlaKarakter: 18 }) → ['...', '...']
 */
export function kelimeGruplari(metin, { enFazlaKelime = 2, enFazlaKarakter = Infinity } = {}) {
  const gruplar = [];
  let grup = [];
  let uzunluk = 0;
  for (const k of kelimelereBol(metin)) {
    const ek = karakterSayisi(k) + (grup.length ? 1 : 0);
    if (grup.length && (grup.length >= enFazlaKelime || uzunluk + ek > enFazlaKarakter)) {
      gruplar.push(grup.join(' '));
      grup = [];
      uzunluk = 0;
    }
    uzunluk += karakterSayisi(k) + (grup.length ? 1 : 0);
    grup.push(k);
  }
  if (grup.length) gruplar.push(grup.join(' '));
  return gruplar;
}

// ---------- Sayı ----------
/** Sayıya çevirir; geçersizse undefined */
export const sayi = (v) => {
  const n = typeof v === 'string' && v.trim() !== '' ? Number(v) : v;
  return typeof n === 'number' && Number.isFinite(n) ? n : undefined;
};
/** 0 veya daha büyük tam sayı; geçersizse undefined */
export const tamSayi = (v) => { const n = sayi(v); return n === undefined ? undefined : Math.max(0, Math.round(n)); };
/** Değeri [en, enCok] aralığına sıkıştırır */
export const sinirla = (v, en, enCok) => Math.min(enCok, Math.max(en, v));
/** Türkçe sayı biçimi: 1234.5 → "1.234,5" */
export const sayiBicimle = (n, basamak = 0) =>
  new Intl.NumberFormat(YEREL, { maximumFractionDigits: basamak }).format(sayi(n) ?? 0);
/** Yüzde biçimi: 85 → "%85" */
export const yuzdeBicimle = (n) => `%${Math.round(sayi(n) ?? 0)}`;
/** D06: Dakikadaki adet (ör. bulunan/dk). ekSn: hata/ipucu cezası olarak süreye eklenen saniye. adet 0 ya da süre yoksa 0 */
export function dakikaPuani(adet, sn, ekSn = 0) {
  const a = sayi(adet) ?? 0;
  const t = (sayi(sn) ?? 0) + (sayi(ekSn) ?? 0);
  return a > 0 && t > 0 ? Math.round((a * 60) / t) : 0;
}

// ---------- Süre ----------
/** Saniyeyi saat gibi gösterir: 65 → "1:05", 3725 → "1:02:05" */
export function sureBicimle(saniye) {
  const top = Math.max(0, Math.round(sayi(saniye) ?? 0));
  const sa = Math.floor(top / 3600);
  const dk = Math.floor((top % 3600) / 60);
  const sn = String(top % 60).padStart(2, '0');
  return sa ? `${sa}:${String(dk).padStart(2, '0')}:${sn}` : `${dk}:${sn}`;
}

/** Saniyeyi okunur metne çevirir (ekran okuyucu için): 65 → "1 dakika 5 saniye" */
export function sureMetni(saniye) {
  const top = Math.max(0, Math.round(sayi(saniye) ?? 0));
  const sa = Math.floor(top / 3600);
  const dk = Math.floor((top % 3600) / 60);
  const sn = top % 60;
  const parca = [];
  if (sa) parca.push(`${sa} saat`);
  if (dk) parca.push(`${dk} dakika`);
  if (sn || !parca.length) parca.push(`${sn} saniye`);
  return parca.join(' ');
}

/** Kısa dakika metni: 125 → "2 dk", 30 → "1 dk'dan az" */
export function dakikaMetni(saniye) {
  const top = Math.max(0, sayi(saniye) ?? 0);
  return top < 60 ? '1 dk’dan az' : `${Math.round(top / 60)} dk`;
}

// ---------- Tarih ----------
/** Yerel saate göre "YYYY-AA-GG" (gün anahtarı, dosya adı etiketi) */
export function gunAnahtari(tarih = new Date()) {
  const t = new Date(tarih);
  const i = (n) => String(n).padStart(2, '0');
  return `${t.getFullYear()}-${i(t.getMonth() + 1)}-${i(t.getDate())}`;
}
/** Okunur tarih: "29 Ekim 2026" */
export const tarihMetni = (tarih = new Date()) =>
  new Intl.DateTimeFormat(YEREL, { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(tarih));

// ---------- Diğer ----------
/** Dizinin karıştırılmış kopyası (Fisher-Yates); asıl dizi değişmez */
export function karistir(dizi) {
  const d = [...dizi];
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

/** Benzersiz kimlik */
export const kimlikUret = () =>
  globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

/** Bayt değerini okunur yapar: 15360 → "15 KB" */
export function boyutMetni(bayt) {
  const b = Math.max(0, sayi(bayt) ?? 0);
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${sayiBicimle(b / 1024)} KB`;
  return `${sayiBicimle(b / (1024 * 1024), 1)} MB`;
}
