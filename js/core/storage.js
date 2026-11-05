// Sürümlü localStorage sarmalayıcı: güvenli okuma/yazma, kota uyarısı, JSON yedek indirme/yükleme
import { yay, OLAYLAR } from './store.js';
import { gunAnahtari } from './utils.js';

const ONEK = 'odak:';
const SURUM_ANAHTARI = 'surum';
const UYGULAMA = 'odak-akademi';
const YEDEK_EN_BUYUK_BAYT = 5 * 1024 * 1024;
const ANAHTAR_DESENI = /^[a-zA-Z0-9:_-]{1,120}$/;
export const VERI_SURUMU = 1;

// Veri şeması değişirse geçiş buraya eklenir. Anahtar: hedef sürüm; değer: (veri) => yeni veri
const GECISLER = {
  // 2: (veri) => { /* eski alanları dönüştür */ return veri; },
};

let depo = null;
let kalici = true;
const sonUyari = new Map();

// localStorage kapalıysa (gizli sekme vb.) sayfa açıkken çalışan bellek deposu
function bellekDeposu() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => { m.set(k, String(v)); },
    removeItem: (k) => { m.delete(k); },
    key: (i) => [...m.keys()][i] ?? null,
    get length() { return m.size; },
  };
}

// Aynı uyarıyı kısa sürede tekrar göstermemek için 8 sn bekletir
function hataBildir(tur, mesaj) {
  const simdi = Date.now();
  if (simdi - (sonUyari.get(tur) ?? 0) < 8000) return;
  sonUyari.set(tur, simdi);
  yay(OLAYLAR.DEPO_HATA, { tur, mesaj });
}

// Uygulama başka bir sekmede de açıksa son yazan diğerinin kayıtlarını silebilir: öğrenci uyarılır
window.addEventListener('storage', (e) => {
  if (e.key?.startsWith(ONEK)) hataBildir('sekme', 'Odak Akademi başka bir sekmede de açık. Sonuçların karışmaması için yalnız birinde çalış, diğerini kapat.');
});

function d() {
  if (depo) return depo;
  try {
    const ls = window.localStorage;
    const deneme = ONEK + '__deneme';
    ls.setItem(deneme, '1');
    ls.removeItem(deneme);
    depo = ls;
  } catch {
    depo = bellekDeposu();
    kalici = false;
    hataBildir('erisim', 'Bu tarayıcı kayıt yapmaya izin vermiyor. Çalışmaların sayfa kapanınca silinir.');
  }
  return depo;
}

function kotaHatasiMi(h) {
  return !!h && (h.name === 'QuotaExceededError' || h.name === 'NS_ERROR_DOM_QUOTA_REACHED' || h.code === 22 || h.code === 1014);
}

export function oku(anahtar, varsayilan = null) {
  let ham;
  try { ham = d().getItem(ONEK + anahtar); } catch { return varsayilan; }
  if (ham === null) return varsayilan;
  try { return JSON.parse(ham); } catch {
    console.warn(`[depo] Bozuk kayıt atlandı: ${anahtar}`);
    return varsayilan;
  }
}

/** Yazmayı dener, kullanıcıya uyarı göstermez. Döner: 'tamam' | 'kota' | 'hata' (kota dolunca budayıp yeniden denemek için) */
export function yazmaDene(anahtar, deger) {
  try {
    d().setItem(ONEK + anahtar, JSON.stringify(deger));
    return 'tamam';
  } catch (h) {
    if (kotaHatasiMi(h)) return 'kota';
    console.error('[depo] Yazılamadı:', anahtar, h);
    return 'hata';
  }
}

/** Depo uyarısını kullanıcıya iletir (aynı türde 8 sn içinde tekrar göstermez). tur: 'kota' | 'yazma' | ... */
export function depoUyar(tur, mesaj) {
  hataBildir(tur, mesaj);
}

// Başarılıysa true; kota doluysa kullanıcıya nazik uyarı gider ve false döner
export function yaz(anahtar, deger) {
  const durum = yazmaDene(anahtar, deger);
  if (durum === 'kota') {
    hataBildir('kota', 'Cihazdaki kayıt alanı doldu, son değişiklik kaydedilemedi. Profiller penceresinden yedek indirip kullanılmayan profilleri silebilirsin.');
  } else if (durum === 'hata') {
    hataBildir('yazma', 'Kayıt yapılamadı. Sayfayı yenileyip yeniden dene.');
  }
  return durum === 'tamam';
}

export function sil(anahtar) {
  try { d().removeItem(ONEK + anahtar); } catch { /* yok say */ }
}

// Uygulamaya ait anahtarlar (önek olmadan)
export function anahtarlar() {
  const s = d();
  const liste = [];
  for (let i = 0; i < s.length; i++) {
    const k = s.key(i);
    if (k && k.startsWith(ONEK)) liste.push(k.slice(ONEK.length));
  }
  return liste;
}

export function kaliciMi() { d(); return kalici; }

// Yaklaşık kullanılan alan (bayt; tarayıcılar karakter başına 2 bayt sayar)
export function kullanimBayt() {
  const s = d();
  return anahtarlar().reduce((t, k) => t + (ONEK.length + k.length + (s.getItem(ONEK + k)?.length ?? 0)) * 2, 0);
}

function tumVeri() {
  const veri = {};
  for (const k of anahtarlar()) if (k !== SURUM_ANAHTARI) veri[k] = oku(k);
  return veri;
}

function gecisleriUygula(veri, kaynakSurum) {
  let sonuc = veri;
  for (let s = kaynakSurum + 1; s <= VERI_SURUMU; s++) if (GECISLER[s]) sonuc = GECISLER[s](sonuc);
  return sonuc;
}

// Uygulama açılışında bir kez çağrılır: sürümü kontrol eder, gerekirse veriyi taşır
export function depoBaslat() {
  d();
  const surum = oku(SURUM_ANAHTARI);
  if (typeof surum !== 'number') {
    yaz(SURUM_ANAHTARI, VERI_SURUMU);
  } else if (surum < VERI_SURUMU) {
    const veri = gecisleriUygula(tumVeri(), surum);
    for (const [k, v] of Object.entries(veri)) yaz(k, v);
    yaz(SURUM_ANAHTARI, VERI_SURUMU);
  } else if (surum > VERI_SURUMU) {
    console.warn('[depo] Kayıtlar uygulamanın daha yeni bir sürümüne ait.');
  }
  return { kalici, surum: VERI_SURUMU };
}

// ---------- Yedek ----------
export function yedekOlustur() {
  return { uygulama: UYGULAMA, surum: VERI_SURUMU, olusturma: new Date().toISOString(), veri: tumVeri() };
}

export function yedekIndir() {
  try {
    const metin = JSON.stringify(yedekOlustur(), null, 2);
    const url = URL.createObjectURL(new Blob([metin], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `odak-akademi-yedek-${gunAnahtari()}.json`;
    a.hidden = true;
    (document.querySelector('dialog[open]') ?? document.body).append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return true;
  } catch (h) {
    console.error('[depo] Yedek indirilemedi:', h);
    hataBildir('yedek', 'Yedek dosyası hazırlanamadı. Yeniden dene.');
    return false;
  }
}

function yedekDenetle(y) {
  if (!y || typeof y !== 'object' || y.uygulama !== UYGULAMA || !y.veri || typeof y.veri !== 'object' || Array.isArray(y.veri)) {
    throw new Error('Bu dosya bir Odak Akademi yedeği değil.');
  }
  if (!Number.isInteger(y.surum) || y.surum < 1) throw new Error('Yedek dosyasının sürüm bilgisi eksik.');
  if (y.surum > VERI_SURUMU) throw new Error('Bu yedek uygulamanın daha yeni bir sürümünden. Önce uygulamayı güncelle.');
  for (const k of Object.keys(y.veri)) {
    if (!ANAHTAR_DESENI.test(k)) throw new Error('Yedek dosyasında tanınmayan bilgi var; yüklenmedi.');
  }
}

export async function yedekDosyasiOku(dosya) {
  if (!dosya) throw new Error('Dosya seçilmedi.');
  if (dosya.size > YEDEK_EN_BUYUK_BAYT) throw new Error('Dosya çok büyük; bir Odak Akademi yedeği gibi görünmüyor.');
  let yedek;
  try { yedek = JSON.parse(await dosya.text()); } catch {
    throw new Error('Dosya okunamadı. Odak Akademi’den indirdiğin .json yedeğini seç.');
  }
  yedekDenetle(yedek);
  return yedek;
}

// Mevcut verinin yerine yedektekini yazar; sorun çıkarsa eski veriyi geri koyar
export function yedekUygula(yedek) {
  yedekDenetle(yedek);
  const veri = gecisleriUygula(structuredClone(yedek.veri), yedek.surum);
  delete veri[SURUM_ANAHTARI];
  const s = d();
  const eski = anahtarlar().map((k) => [k, s.getItem(ONEK + k)]);
  try {
    eski.forEach(([k]) => s.removeItem(ONEK + k));
    for (const [k, v] of Object.entries(veri)) {
      if (v !== undefined) s.setItem(ONEK + k, JSON.stringify(v));
    }
    s.setItem(ONEK + SURUM_ANAHTARI, JSON.stringify(VERI_SURUMU));
  } catch (h) {
    anahtarlar().forEach((k) => s.removeItem(ONEK + k));
    eski.forEach(([k, v]) => { try { s.setItem(ONEK + k, v); } catch { /* yok say */ } });
    throw new Error(kotaHatasiMi(h)
      ? 'Yedek bu cihazdaki kayıt alanına sığmadı. Önceki verilerin korundu.'
      : 'Yedek yüklenemedi. Önceki verilerin korundu.');
  }
  const anahtarSayisi = Object.keys(veri).length;
  yay(OLAYLAR.DEPO_YUKLENDI, { anahtarSayisi });
  return anahtarSayisi;
}

export async function yedekYukle(dosya) {
  return yedekUygula(await yedekDosyasiOku(dosya));
}
