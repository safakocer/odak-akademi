// Odak araçları verisi (S12): zamanlayıcı seçimleri, günlük ortam kontrol listesi, süren zamanlayıcı ve odak günlüğü; tek anahtar odakAraclari:<profilId>
import { oku, yaz } from '../../core/storage.js';
import { etkinProfil } from '../../core/store.js';
import { gunAnahtari, kimlikUret, sayi, tamSayi, sinirla } from '../../core/utils.js';

export const CALISMA_SECENEKLERI = Object.freeze([10, 15, 20, 25]);
export const ONERILEN_CALISMA = Object.freeze([15, 20]); // ortaokul için önerilen blok uzunlukları
export const MOLA_SECENEKLERI = Object.freeze([3, 5, 10]);
export const KONTROL_LISTESI = Object.freeze([
  { ad: 'telefon', metin: 'Telefonumu sessize aldım ya da başka bir yere koydum' },
  { ad: 'masa', metin: 'Masamda yalnızca bu derse gereken şeyler var' },
  { ad: 'ses', metin: 'Ortam sakin; televizyon ve bildirimler kapalı' },
  { ad: 'su', metin: 'Yanımda bir bardak su var' },
].map(Object.freeze));
/** Öz değerlendirme: kisa ekranda, uzun ekran okuyucuda */
export const PUANLAR = Object.freeze([
  { deger: 1, kisa: 'Hiç', uzun: 'Hiç odaklanamadım' },
  { deger: 2, kisa: 'Az', uzun: 'Sık sık dağıldım' },
  { deger: 3, kisa: 'Orta', uzun: 'Orta düzeyde odaklandım' },
  { deger: 4, kisa: 'İyi', uzun: 'İyi odaklandım' },
  { deger: 5, kisa: 'Çok iyi', uzun: 'Çok iyi odaklandım' },
].map(Object.freeze));
export const EN_FAZLA_BLOK = 500;
const VARSAYILAN_AYAR = Object.freeze({ calismaDk: 15, molaDk: 5, zil: true });
const anahtar = (id) => `odakAraclari:${id}`;

// ---------- Şemaya uydurma (bozuk ya da eski kayıt sorun çıkarmasın) ----------
function zamanlayiciDuzelt(z) {
  if (!z || typeof z !== 'object' || !['calisma', 'mola'].includes(z.tur)) return null;
  const dk = sayi(z.dk);
  const bitis = sayi(z.bitis);
  const kalanMs = sayi(z.kalanMs);
  if (!dk || dk <= 0 || dk > 60 || (bitis === undefined && kalanMs === undefined)) return null;
  return {
    tur: z.tur,
    dk,
    bitis: bitis ?? null,                                         // çalışıyorsa bitiş anı (Date.now ölçeğinde)
    kalanMs: bitis === undefined ? sinirla(kalanMs, 0, dk * 60000) : null, // duraklatıldıysa kalan süre
    ortamHazir: !!z.ortamHazir,
  };
}

function blokDuzelt(b) {
  if (!b || typeof b !== 'object' || typeof b.tarih !== 'string' || Number.isNaN(Date.parse(b.tarih))) return null;
  return {
    id: typeof b.id === 'string' ? b.id : kimlikUret(),
    tarih: b.tarih,
    dk: sinirla(tamSayi(b.dk) ?? 1, 1, 60),
    sureSn: sinirla(tamSayi(b.sureSn) ?? 0, 0, 3600),
    tamamlandi: !!b.tamamlandi,
    puan: PUANLAR.some((p) => p.deger === b.puan) ? b.puan : null,
    ortamHazir: !!b.ortamHazir,
  };
}

function duzelt(ham) {
  const v = ham && typeof ham === 'object' ? ham : {};
  const a = v.ayar && typeof v.ayar === 'object' ? v.ayar : {};
  const bugun = gunAnahtari();
  const h = v.hazirlik?.gun === bugun ? v.hazirlik : null; // kontrol listesi her gün baştan
  return {
    ayar: {
      calismaDk: CALISMA_SECENEKLERI.includes(a.calismaDk) ? a.calismaDk : VARSAYILAN_AYAR.calismaDk,
      molaDk: MOLA_SECENEKLERI.includes(a.molaDk) ? a.molaDk : VARSAYILAN_AYAR.molaDk,
      zil: typeof a.zil === 'boolean' ? a.zil : VARSAYILAN_AYAR.zil,
    },
    hazirlik: {
      gun: bugun,
      isaretli: KONTROL_LISTESI.map((k) => k.ad).filter((ad) => Array.isArray(h?.isaretli) && h.isaretli.includes(ad)),
      onay: !!h?.onay,
    },
    zamanlayici: zamanlayiciDuzelt(v.zamanlayici),
    bekleyen: blokDuzelt(v.bekleyen), // bitmiş, henüz değerlendirilmemiş blok
    bloklar: (Array.isArray(v.bloklar) ? v.bloklar : []).map(blokDuzelt).filter(Boolean).slice(-EN_FAZLA_BLOK),
  };
}

// ---------- Okuma / yazma ----------
/** Etkin profilin (ya da verilen profilin) odak verisi; profil yoksa null */
export function odakVerisi(profilId = etkinProfil()?.id) {
  return profilId ? duzelt(oku(anahtar(profilId))) : null;
}

/** fn(veri) veriyi değiştirir; sonuç kaydedilir ve döner (profil yoksa null) */
export function odakVerisiniGuncelle(fn, profilId = etkinProfil()?.id) {
  if (!profilId) return null;
  const veri = odakVerisi(profilId);
  fn(veri);
  const temiz = duzelt(veri);
  yaz(anahtar(profilId), temiz); // kota doluysa storage.js öğrenciyi uyarır
  return temiz;
}

export function blokOlustur({ dk, sureSn, tamamlandi, ortamHazir }) {
  return { id: kimlikUret(), tarih: new Date().toISOString(), dk, sureSn, tamamlandi, puan: null, ortamHazir };
}

/** Yeni bitmiş bloğu değerlendirmeye bekletir; önceki değerlendirilmemiş blok puansız günlüğe geçer */
export function bekleyenAyarla(veri, blok) {
  if (veri.bekleyen) veri.bloklar.push(veri.bekleyen);
  veri.bekleyen = blok;
}

/** Bekleyen bloğu puanla (null: puansız) günlüğe yazar */
export function bekleyeniKaydet(puan) {
  return odakVerisiniGuncelle((v) => {
    if (!v.bekleyen) return;
    v.bloklar.push({ ...v.bekleyen, puan: PUANLAR.some((p) => p.deger === puan) ? puan : null });
    v.bekleyen = null;
  });
}

/** "Bu profilin sonuçlarını sil": günlük temizlenir; seçimler ve süren zamanlayıcı kalır */
export function odakGunluguSil(profilId = etkinProfil()?.id) {
  return odakVerisiniGuncelle((v) => { v.bloklar = []; v.bekleyen = null; }, profilId);
}

// ---------- Haftalık özet ----------
function toplamlar(liste) {
  const puanlilar = liste.filter((b) => b.puan != null);
  return {
    blok: liste.length,
    dk: Math.round(liste.reduce((t, b) => t + b.sureSn, 0) / 60),
    ortPuan: puanlilar.length ? puanlilar.reduce((t, b) => t + b.puan, 0) / puanlilar.length : null,
    puanli: puanlilar.length,
  };
}

/** Son 7 gün (bugün dahil) gün gün + toplam; önceki 7 günün toplamı karşılaştırma için */
export function haftalikOzet(bloklar, simdi = new Date()) {
  const gunler = [];
  for (let i = 6; i >= 0; i--) {
    const tarih = new Date(simdi.getFullYear(), simdi.getMonth(), simdi.getDate() - i);
    gunler.push({ gun: gunAnahtari(tarih), tarih, bugun: i === 0 });
  }
  const gunuBul = (b) => gunAnahtari(b.tarih);
  const buHafta = new Set(gunler.map((g) => g.gun));
  const onceki = new Set();
  for (let i = 13; i >= 7; i--) onceki.add(gunAnahtari(new Date(simdi.getFullYear(), simdi.getMonth(), simdi.getDate() - i)));
  return {
    gunler: gunler.map((g) => ({ ...g, ...toplamlar(bloklar.filter((b) => gunuBul(b) === g.gun)) })),
    toplam: toplamlar(bloklar.filter((b) => buHafta.has(gunuBul(b)))),
    onceki: toplamlar(bloklar.filter((b) => onceki.has(gunuBul(b)))),
  };
}

/** Ortam hazırlanan / hazırlanmayan bloklarda ortalama öz değerlendirme (ikisinde de en az 3 puan varsa) */
export function ortamKarsilastirmasi(bloklar) {
  const hazir = toplamlar(bloklar.filter((b) => b.ortamHazir));
  const degil = toplamlar(bloklar.filter((b) => !b.ortamHazir));
  return hazir.puanli >= 3 && degil.puanli >= 3 ? { hazir: hazir.ortPuan, degil: degil.ortPuan } : null;
}
