// Seviye testi verisi (S17): başlangıç/final sonuçlarını saklar (testler:<profilId>), 5 eksen puanı (sabit ölçek, 0-100), 21 gün kuralı, iki ölçümün karşılaştırması
import { oku, yaz } from '../../core/storage.js';
import { etkinProfil } from '../../core/store.js';
import { sayi, sinirla, gunAnahtari, sayiBicimle, yuzdeBicimle } from '../../core/utils.js';

const ONEK = 'testler:';
export const TEST_SURUMU = 1;
export const FINAL_GUN = 21;      // final, başlangıçtan bu kadar gün sonra açılır
export const YENILEME_GUN = 3;    // başlangıç testi ilk 3 gün içinde (final yoksa) yenilenebilir
export const GECMIS_SINIR = 10;   // kapanan dönem (başlangıç + final) sayısı
export const DEGISIM_ESIGI = 5;   // puan farkı bundan küçükse “benzer” sayılır (tek ölçüm günden güne oynar)

/*
 * Ölçek sabittir ve herkes için aynıdır; amaç başkalarıyla karşılaştırmak değil, öğrencinin iki ölçümünü aynı cetvelle göstermek.
 * okumaHizi: 40 k/dk → 0, 240 k/dk → 100 | anlama: yüzde | dikkat: %70 doğruluk + %30 hız (900 ms → 0, 350 ms → 100)
 * hafiza: en uzun doğru dizi 2 → 0, 8 → 100 | gorme: flaş eşiği 400 ms → 0, 100 ms → 100
 */
export const OLCEK = Object.freeze({ wpm: [40, 240], tepkiMs: [900, 350], dizi: [2, 8], flasMs: [400, 100] });

export const EKSENLER = Object.freeze([
  { ad: 'okumaHizi', etiket: 'Okuma hızı', satirlar: ['Okuma', 'hızı'], egzersiz: 'oku-anla',
    guclu: 'Metni akıcı bir hızla okuyorsun.', gelisim: 'Tekrarlı okuma ile akıcılığın artabilir; hızı anlamayı koruyarak yükselt.' },
  { ad: 'anlama', etiket: 'Anlama', satirlar: ['Anlama'], egzersiz: 'oku-anla',
    guclu: 'Metinde yazanı ve ipuçlarını iyi yakalıyorsun.', gelisim: 'Okurken “kim, ne, neden?” diye sormak anlamayı güçlendirir.' },
  { ad: 'dikkat', etiket: 'Dikkat', satirlar: ['Dikkat'], egzersiz: 'git-dur',
    guclu: 'Doğru anda tepki verip gerekince beklemeyi başarıyorsun.', gelisim: 'Kısa dikkat oyunlarıyla önce doğruluğu, sonra hızı çalış.' },
  { ad: 'hafiza', etiket: 'Hafıza', satirlar: ['Hafıza'], egzersiz: 'rakam-dizisi',
    guclu: 'Kısa süreli bilgiyi aklında iyi tutuyorsun.', gelisim: 'Rakamları ikişer üçer gruplamak daha uzun dizileri hatırlatır.' },
  { ad: 'gorme', etiket: 'Görme alanı', satirlar: ['Görme', 'alanı'], egzersiz: 'periferik-flas',
    guclu: 'Gözün ortadayken çevrede olanı hızla fark ediyorsun.', gelisim: 'Kısa flaş turları, tek bakışta görülen alanı fark etmene yardım eder.' },
].map(Object.freeze));

const oran = (v, [en, enCok]) => {
  const n = sayi(v);
  return n === undefined ? 0 : Math.round(sinirla((n - en) / (enCok - en), 0, 1) * 100);
};

/** Ham ölçümlerden eksen puanları (0-100); ölçülmeyen eksen null */
export function eksenPuanlari(s) {
  return {
    okumaHizi: s.okuma ? oran(s.okuma.wpm, OLCEK.wpm) : null,
    anlama: s.anlama ? sinirla(Math.round(sayi(s.anlama.yuzde) ?? 0), 0, 100) : null,
    dikkat: s.dikkat ? Math.round(0.7 * (sayi(s.dikkat.isabet) ?? 0) + 0.3 * (s.dikkat.ortMs ? oran(s.dikkat.ortMs, OLCEK.tepkiMs) : 0)) : null,
    hafiza: s.hafiza ? oran(s.hafiza.enIyi, OLCEK.dizi) : null,
    gorme: s.gorme ? oran(s.gorme.esikMs, OLCEK.flasMs) : null,
  };
}

/** Eksenin ham değeri okunur metin olarak (tablo ve radar açıklaması için) */
export function hamMetin(s, ad) {
  if (!s) return '-';
  switch (ad) {
    case 'okumaHizi': return s.okuma ? `${sayiBicimle(s.okuma.wpm)} kelime/dk` : 'ölçülmedi';
    case 'anlama': return s.anlama ? `${yuzdeBicimle(s.anlama.yuzde)} (${s.anlama.dogru}/${s.anlama.soru} soru)` : 'ölçülmedi';
    case 'dikkat': return s.dikkat ? `${yuzdeBicimle(s.dikkat.isabet)} doğru${s.dikkat.ortMs ? `, ${sayiBicimle(s.dikkat.ortMs)} ms` : ''}` : 'ölçülmedi';
    case 'hafiza': return s.hafiza ? (s.hafiza.enIyi ? `${s.hafiza.enIyi} rakamlık dizi` : 'henüz tam dizi yok') : 'ölçülmedi';
    case 'gorme': return s.gorme ? `${sayiBicimle(s.gorme.esikMs)} ms flaş` : 'ölçülmedi';
    default: return '-';
  }
}

// ---------- Depo ----------
const profilKimligi = (pid) => pid ?? etkinProfil()?.id ?? null;
const bos = () => ({ surum: TEST_SURUMU, baslangic: null, final: null, gecmis: [] });
const sonucMu = (s) => !!s && typeof s === 'object' && typeof s.tarih === 'string' && s.puanlar && typeof s.puanlar === 'object';

/** Profilin test verisi: { surum, baslangic: Sonuç | null, final: Sonuç | null, gecmis: [{ baslangic, final }] } */
export function testVerisi(profilId) {
  const pid = profilKimligi(profilId);
  if (!pid) return bos();
  const ham = oku(ONEK + pid, null);
  if (!ham || typeof ham !== 'object') return bos();
  return {
    surum: TEST_SURUMU,
    baslangic: sonucMu(ham.baslangic) ? ham.baslangic : null,
    final: sonucMu(ham.final) && sonucMu(ham.baslangic) ? ham.final : null,
    gecmis: Array.isArray(ham.gecmis) ? ham.gecmis.filter((d) => sonucMu(d?.baslangic)).slice(-GECMIS_SINIR) : [],
  };
}

function veriyiYaz(pid, v) {
  return yaz(ONEK + pid, v);
}

/** Sonucu kaydeder. tur: 'baslangic' | 'final'. Döner: { tamam, sonuc } | { tamam: false, hata } */
export function sonucKaydet(tur, sonuc, profilId) {
  const pid = profilKimligi(profilId);
  if (!pid) return { tamam: false, hata: 'Önce bir profil seç.' };
  const v = testVerisi(pid);
  if (tur === 'final' && !v.baslangic) return { tamam: false, hata: 'Final için önce başlangıç testi gerekli.' };
  const kayit = { ...sonuc, tur, puanlar: eksenPuanlari(sonuc) };
  if (tur === 'baslangic') { v.baslangic = kayit; v.final = null; } else v.final = kayit;
  return veriyiYaz(pid, v) ? { tamam: true, sonuc: kayit } : { tamam: false, hata: 'Sonuç kaydedilemedi. Cihazda yer kalmamış olabilir.' };
}

/** Başlangıç + finali geçmişe taşır, yeni dönem için başlangıç testi açılır */
export function yeniDonem(profilId) {
  const pid = profilKimligi(profilId);
  if (!pid) return false;
  const v = testVerisi(pid);
  if (!v.baslangic) return true;
  v.gecmis = [...v.gecmis, { baslangic: v.baslangic, final: v.final }].slice(-GECMIS_SINIR);
  v.baslangic = null;
  v.final = null;
  return veriyiYaz(pid, v);
}

// ---------- 21 gün kuralı ----------
/** İki gün anahtarı (YYYY-AA-GG) arasındaki takvim günü */
export function gunFarki(onceki, sonraki = gunAnahtari()) {
  const t = (g) => { const [y, a, d] = g.split('-').map(Number); return Date.UTC(y, a - 1, d); };
  return Math.round((t(sonraki) - t(onceki)) / 86400000);
}

/**
 * Sayfanın durumu: asama 'yok' (başlangıç yok) | 'bekliyor' (final henüz açılmadı) | 'hazir' (final yapılabilir) | 'tamam' (ikisi de var)
 * + gecen (gün), kalan (gün), finalGunu (YYYY-AA-GG), yenilenebilir (başlangıç yeniden yapılabilir mi)
 */
export function testDurumu(profilId) {
  const v = testVerisi(profilId);
  if (!v.baslangic) return { asama: 'yok', veri: v };
  const gecen = Math.max(0, gunFarki(v.baslangic.gun));
  const bitis = new Date(`${v.baslangic.gun}T12:00:00`);
  bitis.setDate(bitis.getDate() + FINAL_GUN);
  const ortak = { veri: v, gecen, kalan: Math.max(0, FINAL_GUN - gecen), finalGunu: gunAnahtari(bitis) };
  if (v.final) return { asama: 'tamam', ...ortak, yenilenebilir: false };
  return { asama: gecen >= FINAL_GUN ? 'hazir' : 'bekliyor', ...ortak, yenilenebilir: gecen < YENILEME_GUN };
}

// ---------- Özet ve karşılaştırma ----------
/** Güçlü yön ve gelişim alanı (yalnız ölçülen eksenler); fark <10 ise dengeli */
export function guclulukOzeti(puanlar) {
  const olculen = EKSENLER.filter((e) => sayi(puanlar?.[e.ad]) !== undefined);
  if (olculen.length < 2) return { guclu: null, gelisim: null, dengeli: false, olculen };
  const sirali = [...olculen].sort((a, b) => puanlar[b.ad] - puanlar[a.ad]);
  const guclu = sirali[0];
  const gelisim = sirali.at(-1);
  return { guclu, gelisim, dengeli: puanlar[guclu.ad] - puanlar[gelisim.ad] < 10, olculen };
}

/** Eksen eksen karşılaştırma → [{ eksen, once, sonra, fark (null: biri ölçülmedi), yon: 'artti'|'azaldi'|'benzer'|null }] */
export function karsilastir(baslangic, final) {
  return EKSENLER.map((eksen) => {
    const once = sayi(baslangic?.puanlar?.[eksen.ad]);
    const sonra = sayi(final?.puanlar?.[eksen.ad]);
    const fark = once !== undefined && sonra !== undefined ? sonra - once : null;
    const yon = fark === null ? null : fark >= DEGISIM_ESIGI ? 'artti' : fark <= -DEGISIM_ESIGI ? 'azaldi' : 'benzer';
    return { eksen, once: once ?? null, sonra: sonra ?? null, fark, yon };
  });
}

/** Geliştirici denemesi (yalnız yerel sunucu, app.js): başlangıç tarihini geri alır, finali beklemeden denemek için */
export function baslangiciGeriAl(gun = FINAL_GUN, profilId) {
  const pid = profilKimligi(profilId);
  const v = testVerisi(pid);
  if (!pid || !v.baslangic) return false;
  const t = new Date(`${v.baslangic.gun}T12:00:00`);
  t.setDate(t.getDate() - gun);
  v.baslangic = { ...v.baslangic, gun: gunAnahtari(t), tarih: t.toISOString() };
  return veriyiYaz(pid, v);
}
