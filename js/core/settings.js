// Ayarların kalıcılığı: etkin profilin ayarlarını uygular, değişiklikleri profil.ayarlar'a kaydeder; veri silme işlemleri
import { ayarlariUygula, degisinceHaberVer, molaRehberiAcikMi } from './a11y.js';
import { anahtarlar, sil } from './storage.js';
import { dinle, OLAYLAR, uygulamaDurumu } from './store.js';
import { aktifProfil, profilGuncelle, VARSAYILAN_AYARLAR } from './profile.js';
import { toastGoster } from './ui.js';

const AYAR_ALANLARI = Object.keys(VARSAYILAN_AYARLAR); // tema, yaziBoyutu, font, ses, hareketAzalt, molaRehberi (S10)
let baslatildi = false;
let uyguluyor = false;

const ayniMi = (a = {}, b = {}) => AYAR_ALANLARI.every((k) => a[k] === b[k]);
const sadece = (a) => Object.fromEntries(AYAR_ALANLARI.map((k) => [k, a[k]]));

/** Profil ayarlarını ekrana uygular (kaydetmeden). */
function profilAyarlariniUygula(profil) {
  if (!profil) return; // profil yoksa görünüm olduğu gibi kalır
  uyguluyor = true;
  try { ayarlariUygula({ ...VARSAYILAN_AYARLAR, ...profil.ayarlar }); } finally { uyguluyor = false; }
}

/** Ekrandaki ayarları etkin profile kaydeder; değişiklik yoksa yazmaz. */
function kaydet(ayarlar) {
  if (uyguluyor) return;
  const profil = uygulamaDurumu.al().profil;
  if (!profil || ayniMi(profil.ayarlar, ayarlar)) return;
  const { hata } = profilGuncelle(profil.id, { ayarlar: sadece(ayarlar) });
  if (hata) toastGoster('Ayar şimdilik kaydedilemedi; bu oturumda geçerli.', { tur: 'uyari' });
}

/**
 * Uygulama açılışında, profilBaslat()'tan ÖNCE bir kez çağrılır.
 * Kayıtlı profilin ayarlarını hemen uygular (ekran yanıp sönmesin), sonra değişiklikleri izler.
 */
export function ayarlarBaslat() {
  if (baslatildi) return;
  baslatildi = true;
  profilAyarlariniUygula(aktifProfil());
  dinle(OLAYLAR.PROFIL_DEGISTI, profilAyarlariniUygula);
  degisinceHaberVer(kaydet);
}

/** Görünüm ayarlarını varsayılana döndürür (etkin profile de kaydedilir). S10: mola hatırlatıcısı görünüm ayarı değildir, olduğu gibi kalır */
export function ayarlariSifirla() {
  ayarlariUygula({ ...VARSAYILAN_AYARLAR, molaRehberi: molaRehberiAcikMi() });
}

/** Bu cihazdaki tüm Odak Akademi verilerini siler (profiller, sonuçlar). Silinen anahtar sayısını döndürür.
 *  S27: '__' ile başlayan cihaz anahtarları (ör. __hesap: yöneticinin verdiği görünüm) silinmez */
export function tumVeriyiSil() {
  const liste = anahtarlar().filter((k) => k !== 'surum' && !k.startsWith('__'));
  liste.forEach((k) => sil(k));
  return liste.length;
}
