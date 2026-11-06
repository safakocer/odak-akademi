// Basit durum yönetimi ve olay sistemi: modüller birbirini doğrudan bilmeden haberleşir

// Ortak olay adları (yazım hatasını önlemek için buradan kullan)
export const OLAYLAR = Object.freeze({
  PROFIL_DEGISTI: 'profil:degisti',         // veri: profil | null (yalnız etkin profil değişince: seçim, silme, açılış, yedek)
  PROFIL_GUNCELLENDI: 'profil:guncellendi', // veri: { profil, ayarMi } (etkin profilin adı/sınıfı/avatarı ya da ayarları değişti)
  PROFILLER_DEGISTI: 'profiller:degisti',   // veri: profil listesi
  PROFIL_SILINDI: 'profil:silindi',         // veri: { id } (depo anahtarlarını profile.js siler; dinleyiciler bellekteki kopyaları bırakır)
  KAYIT_EKLENDI: 'kayit:eklendi',           // veri: kayıt
  DEPO_HATA: 'depo:hata',                   // veri: { tur, mesaj }
  DEPO_YUKLENDI: 'depo:yuklendi',           // veri: { anahtarSayisi }
  ROTA_DEGISTI: 'rota:degisti',             // veri: { yol, parametreler, sorgu }
  VELI_DEGISTI: 'veli:degisti',             // S24, veri: { tur: 'pin'|'sinifModu'|'hedef'|'sifirlandi', profilId? } (Veli/Öğretmen alanı)
});

const kanallar = new Map();

// Olayı dinler; dinlemeyi bırakan fonksiyonu döndürür
export function dinle(ad, fn) {
  if (!kanallar.has(ad)) kanallar.set(ad, new Set());
  kanallar.get(ad).add(fn);
  return () => kanallar.get(ad)?.delete(fn);
}

// Olayı tüm dinleyicilere iletir; bir dinleyicideki hata diğerlerini durdurmaz
export function yay(ad, veri) {
  const dinleyiciler = kanallar.get(ad);
  if (!dinleyiciler) return;
  for (const fn of [...dinleyiciler]) {
    try { fn(veri); } catch (hata) { console.error(`[olay] "${ad}" dinleyicisinde hata:`, hata); }
  }
}

// Küçük durum kabı: al(), ayarla(parça | fn), izle(fn)
export function durumOlustur(baslangic = {}) {
  let durum = Object.freeze({ ...baslangic });
  const izleyiciler = new Set();
  return {
    al: () => durum,
    ayarla(degisiklik) {
      const parca = typeof degisiklik === 'function' ? degisiklik(durum) : degisiklik;
      if (!parca) return durum;
      const onceki = durum;
      durum = Object.freeze({ ...durum, ...parca });
      for (const fn of [...izleyiciler]) {
        try { fn(durum, onceki); } catch (hata) { console.error('[durum] izleyici hatası:', hata); }
      }
      return durum;
    },
    izle(fn) {
      izleyiciler.add(fn);
      return () => izleyiciler.delete(fn);
    },
  };
}

// Uygulama genelinde paylaşılan durum (etkin profil burada)
export const uygulamaDurumu = durumOlustur({ profil: null });

/** D05: Etkin profil ya da null. Profil kimliği ve sınıfı gereken her modül buradan okur (tek kaynak; depoyu yeniden okumaz) */
export const etkinProfil = () => uygulamaDurumu.al().profil ?? null;
