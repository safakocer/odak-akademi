// Veli/Öğretmen alanı verisi (S24): 4 haneli PIN (tuzlu, yinelemeli SHA-256 karması), yanlış denemede artan bekleme, sınıf modu, profil başına hedefler (veliHedef:<profilId>), haftalık süre
import { oku, yaz, sil, anahtarlar } from '../../core/storage.js';
import { yay, dinle, OLAYLAR, etkinProfil } from '../../core/store.js';
import { sayi } from '../../core/utils.js';
import { ilerlemeVerisi, gunlukHedefAyarla, gunKaydir, bugunAnahtari, HEDEF_SECENEKLERI } from '../../engine/motivasyon.js';

const ANAHTAR = 'veli';
const HEDEF_ONEK = 'veliHedef:';
export const VELI_SURUMU = 1;
export const PIN_UZUNLUK = 4;
export const KARMA_TEKRAR = 10000; // her doğrulama yaklaşık 10-80 ms; cihazdan kopyalanan karmayı denemeyi yavaşlatır
// İlk 3 yanlış serbest; sonra 30 sn, her yeni yanlışta iki katı, en çok 15 dk. Doğru PIN sayacı sıfırlar
export const BEKLEME = Object.freeze({ serbestHata: 3, ilkSn: 30, enCokSn: 900 });
export const GUNLUK_SECENEKLER = HEDEF_SECENEKLERI; // 10/15/20/30 dk (S20 günlük hedefiyle aynı)
export const HAFTALIK_SECENEKLER = Object.freeze([30, 60, 90, 120, 150, 180, 240, 300]);

// ---------- SHA-256 (saf JS; crypto.subtle yalnız https/localhost’ta var, uygulama yerel ağdan da açılıyor) ----------
const ASALLAR = [];
for (let n = 2; ASALLAR.length < 64; n++) if (ASALLAR.every((a) => n % a)) ASALLAR.push(n);
const kesir = (x) => Math.floor((x - Math.floor(x)) * 2 ** 32) >>> 0;
const K = Uint32Array.from(ASALLAR, (a) => kesir(Math.cbrt(a)));
const H0 = Uint32Array.from(ASALLAR.slice(0, 8), (a) => kesir(Math.sqrt(a)));
const don = (x, n) => (x >>> n) | (x << (32 - n));

/** SHA-256 özeti: Uint8Array → Uint8Array(32) */
export function sha256(veri) {
  const l = veri.length;
  const n = Math.ceil((l + 9) / 64) * 64;
  const m = new Uint8Array(n);
  m.set(veri);
  m[l] = 0x80;
  const dv = new DataView(m.buffer);
  dv.setUint32(n - 8, Math.floor(l / 0x20000000));
  dv.setUint32(n - 4, (l * 8) >>> 0);
  const h = Uint32Array.from(H0);
  const w = new Uint32Array(64);
  for (let i = 0; i < n; i += 64) {
    for (let t = 0; t < 16; t++) w[t] = dv.getUint32(i + t * 4);
    for (let t = 16; t < 64; t++) {
      const s0 = don(w[t - 15], 7) ^ don(w[t - 15], 18) ^ (w[t - 15] >>> 3);
      const s1 = don(w[t - 2], 17) ^ don(w[t - 2], 19) ^ (w[t - 2] >>> 10);
      w[t] = (w[t - 16] + s0 + w[t - 7] + s1) | 0;
    }
    let [a, b, c, d, e, f, g, hh] = h;
    for (let t = 0; t < 64; t++) {
      const t1 = (hh + (don(e, 6) ^ don(e, 11) ^ don(e, 25)) + ((e & f) ^ (~e & g)) + K[t] + w[t]) | 0;
      const t2 = ((don(a, 2) ^ don(a, 13) ^ don(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) | 0;
      hh = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
    }
    [a, b, c, d, e, f, g, hh].forEach((v, j) => { h[j] = (h[j] + v) | 0; });
  }
  const cikti = new Uint8Array(32);
  const cv = new DataView(cikti.buffer);
  h.forEach((v, j) => cv.setUint32(j * 4, v));
  return cikti;
}

const hexe = (b) => [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
const hexten = (s) => Uint8Array.from(String(s).match(/../g) ?? [], (x) => parseInt(x, 16));
function birlestir(a, b) {
  const c = new Uint8Array(a.length + b.length);
  c.set(a);
  c.set(b, a.length);
  return c;
}

/** Karma = SHA-256’nın tekrar kez uygulanması: h1 = H(tuz + pin), hn = H(hn-1 + tuz) */
export function karmaHesapla(pin, tuzHex, tekrar = KARMA_TEKRAR) {
  const tuz = hexten(tuzHex);
  let h = sha256(birlestir(tuz, new TextEncoder().encode(String(pin))));
  for (let i = 1; i < tekrar; i++) h = sha256(birlestir(h, tuz));
  return hexe(h);
}

function tuzUret() {
  const b = new Uint8Array(16);
  if (globalThis.crypto?.getRandomValues) crypto.getRandomValues(b);
  else for (let i = 0; i < b.length; i++) b[i] = Math.floor(Math.random() * 256);
  return hexe(b);
}

// ---------- Depo ----------
const bosVeri = () => ({ surum: VELI_SURUMU, pin: null, deneme: { hata: 0, kilitBitis: null }, sinifModu: false });

function pinDuzelt(p) {
  if (!p || typeof p !== 'object') return null;
  const tekrar = sayi(p.tekrar);
  if (!/^[0-9a-f]{32}$/.test(p.tuz ?? '') || !/^[0-9a-f]{64}$/.test(p.karma ?? '') || !tekrar || tekrar < 1) return null;
  return { tuz: p.tuz, karma: p.karma, tekrar, olusturma: typeof p.olusturma === 'string' ? p.olusturma : null };
}

/** { surum, pin: { tuz, karma, tekrar, olusturma } | null, deneme: { hata, kilitBitis (ms) | null }, sinifModu } */
export function veliVerisi() {
  const ham = oku(ANAHTAR, null);
  const v = bosVeri();
  if (!ham || typeof ham !== 'object' || Array.isArray(ham)) return v;
  v.pin = pinDuzelt(ham.pin);
  v.deneme.hata = Math.max(0, Math.round(sayi(ham.deneme?.hata) ?? 0));
  const bitis = sayi(ham.deneme?.kilitBitis);
  // Saat geri alınırsa bekleme en çok sınır kadar sürer
  v.deneme.kilitBitis = bitis ? Math.min(bitis, Date.now() + BEKLEME.enCokSn * 1000) : null;
  v.sinifModu = ham.sinifModu === true && !!v.pin;
  return v;
}

const veriYaz = (v) => yaz(ANAHTAR, v);

// ---------- Oturum (yalnız bellekte; sayfa yenilenince ya da alandan çıkınca kapanır) ----------
let acik = false;
export const oturumAcikMi = () => acik && pinVarMi();
export function oturumuKapat() { acik = false; }
dinle(OLAYLAR.DEPO_YUKLENDI, () => { acik = false; }); // yedek yüklendi: PIN değişmiş olabilir

// ---------- PIN ----------
export const pinVarMi = () => !!veliVerisi().pin;
export const pinBicimiGecerli = (pin) => new RegExp(`^[0-9]{${PIN_UZUNLUK}}$`).test(String(pin ?? ''));

/** Kolay tahmin edilen PIN: tüm rakamlar aynı (0000) ya da ardışık (1234, 9876) */
export function pinZayifMi(pin) {
  const s = String(pin);
  return /^(\d)\1+$/.test(s) || '0123456789'.includes(s) || '9876543210'.includes(s);
}

/** Yanlış denemeden sonra kalan bekleme (ms); 0 = deneyebilir */
export function beklemeKalanMs() {
  const b = veliVerisi().deneme.kilitBitis;
  return b ? Math.max(0, b - Date.now()) : 0;
}

const kisaAra = () => new Promise((r) => { setTimeout(r, 30); }); // “Denetleniyor” yazısı ekrana gelsin

/**
 * PIN’i denetler. Döner: { tamam: true } | { tamam: false, hata: 'pin-yok' | 'bicim' | 'bekle' | 'yanlis', kalanHak?, kalanMs? }
 * Biçimi bozuk giriş deneme sayılmaz. Doğruysa oturum açılır (sorgu: true ise açılmaz, yalnız denetler).
 */
export async function pinDogrula(pin, { sorgu = false } = {}) {
  const v = veliVerisi();
  if (!v.pin) return { tamam: false, hata: 'pin-yok' };
  const bekle = beklemeKalanMs();
  if (bekle > 0) return { tamam: false, hata: 'bekle', kalanMs: bekle };
  if (!pinBicimiGecerli(pin)) return { tamam: false, hata: 'bicim' };
  await kisaAra();
  const dogru = karmaHesapla(pin, v.pin.tuz, v.pin.tekrar) === v.pin.karma;
  const yeni = veliVerisi();
  if (dogru) {
    yeni.deneme = { hata: 0, kilitBitis: null };
    veriYaz(yeni);
    if (!sorgu) acik = true;
    return { tamam: true };
  }
  yeni.deneme.hata += 1;
  const fazla = yeni.deneme.hata - BEKLEME.serbestHata;
  if (fazla >= 0) yeni.deneme.kilitBitis = Date.now() + Math.min(BEKLEME.enCokSn, BEKLEME.ilkSn * 2 ** fazla) * 1000;
  veriYaz(yeni);
  return { tamam: false, hata: 'yanlis', kalanHak: Math.max(0, BEKLEME.serbestHata - yeni.deneme.hata), kalanMs: beklemeKalanMs() };
}

/** Yeni PIN’in hatası (metin) ya da null */
export function pinHatasi(pin, tekrar) {
  if (!pinBicimiGecerli(pin)) return `PIN ${PIN_UZUNLUK} rakamdan oluşmalı.`;
  if (pinZayifMi(pin)) return 'Bu PIN kolay tahmin edilir (aynı ya da sıralı rakamlar). Başka bir PIN seçin.';
  if (tekrar !== undefined && pin !== tekrar) return 'İki PIN aynı değil. Yeniden yazın.';
  return null;
}

/** İlk PIN’i oluşturur (PIN yokken) ya da açık oturumda değiştirir. Döner: { tamam } | { tamam: false, hata } */
export function pinKaydet(pin, tekrar) {
  const hata = pinHatasi(pin, tekrar);
  if (hata) return { tamam: false, hata };
  const v = veliVerisi();
  if (v.pin && !oturumAcikMi()) return { tamam: false, hata: 'PIN’i değiştirmek için önce alanı açın.' };
  const tuz = tuzUret();
  v.pin = { tuz, karma: karmaHesapla(pin, tuz), tekrar: KARMA_TEKRAR, olusturma: new Date().toISOString() };
  v.deneme = { hata: 0, kilitBitis: null };
  if (!veriYaz(v)) return { tamam: false, hata: 'PIN kaydedilemedi. Tarayıcı kayıt yapmaya izin vermiyor olabilir.' };
  acik = true;
  yay(OLAYLAR.VELI_DEGISTI, { tur: 'pin' });
  return { tamam: true };
}

/** “PIN’i unuttum”: PIN, sınıf modu ve tüm profil hedefleri silinir; çalışma sonuçları kalır */
export function veliSifirla() {
  sil(ANAHTAR);
  anahtarlar().filter((k) => k.startsWith(HEDEF_ONEK)).forEach((k) => sil(k));
  acik = false;
  yay(OLAYLAR.VELI_DEGISTI, { tur: 'sifirlandi' });
}

// ---------- Sınıf modu ----------
export const sinifModuAcikMi = () => veliVerisi().sinifModu;

export function sinifModuAyarla(acikMi) {
  if (!oturumAcikMi()) return false;
  const v = veliVerisi();
  v.sinifModu = !!acikMi;
  if (!veriYaz(v)) return false;
  yay(OLAYLAR.VELI_DEGISTI, { tur: 'sinifModu' });
  return true;
}

// ---------- Profil hedefleri ----------
const pidBul = (profilId) => profilId ?? etkinProfil()?.id ?? null;

/** { gunlukDk: 10|15|20|30 | null, haftalikDk: 30-300 | null, guncelleme | null }; null = belirlenmedi */
export function veliHedefi(profilId) {
  const pid = pidBul(profilId);
  const ham = pid ? oku(HEDEF_ONEK + pid, null) : null;
  return {
    gunlukDk: GUNLUK_SECENEKLER.includes(ham?.gunlukDk) ? ham.gunlukDk : null,
    haftalikDk: HAFTALIK_SECENEKLER.includes(ham?.haftalikDk) ? ham.haftalikDk : null,
    guncelleme: typeof ham?.guncelleme === 'string' ? ham.guncelleme : null,
  };
}

/** Hedefleri kaydeder; günlük öneri öğrencinin günlük hedefine (ilerleme:<profilId>) yazılır. Döner: { tamam } | { tamam: false, hata } */
export function veliHedefiKaydet(profilId, { gunlukDk = null, haftalikDk = null } = {}) {
  if (!oturumAcikMi()) return { tamam: false, hata: 'Önce alanı açın.' };
  if (!profilId) return { tamam: false, hata: 'Profil bulunamadı.' };
  const g = gunlukDk == null ? null : Number(gunlukDk);
  const h = haftalikDk == null ? null : Number(haftalikDk);
  if (g !== null && !GUNLUK_SECENEKLER.includes(g)) return { tamam: false, hata: 'Günlük süre listeden seçilmeli.' };
  if (h !== null && !HAFTALIK_SECENEKLER.includes(h)) return { tamam: false, hata: 'Haftalık hedef listeden seçilmeli.' };
  if (g !== null && h !== null && h > g * 7) {
    return { tamam: false, hata: `Haftalık hedef, günlük önerinin 7 katını (${g * 7} dk) aşmasın; yoksa her gün öneriden fazla çalışmak gerekir.` };
  }
  if (g !== null && !gunlukHedefAyarla(g, profilId)) return { tamam: false, hata: 'Günlük hedef kaydedilemedi.' };
  if (g === null && h === null) sil(HEDEF_ONEK + profilId);
  else if (!yaz(HEDEF_ONEK + profilId, { surum: VELI_SURUMU, gunlukDk: g, haftalikDk: h, guncelleme: new Date().toISOString() })) {
    return { tamam: false, hata: 'Hedef kaydedilemedi. Cihazda yer kalmamış olabilir.' };
  }
  yay(OLAYLAR.VELI_DEGISTI, { tur: 'hedef', profilId });
  return { tamam: true };
}

// ---------- Haftalık süre (hafta pazartesi başlar; süre ilerleme verisinin günlük saniyelerinden) ----------
/** Günün haftasının pazartesisi (YYYY-AA-GG) */
export function haftaBasi(gun = bugunAnahtari()) {
  const [y, a, g] = gun.split('-').map(Number);
  return gunKaydir(gun, -((new Date(y, a - 1, g).getDay() + 6) % 7));
}

function haftaDakikasi(veri, bas) {
  let sn = 0;
  for (let i = 0; i < 7; i++) sn += veri.gunler[gunKaydir(bas, i)]?.sn ?? 0;
  return Math.round(sn / 60); // rapordaki dönem özetiyle aynı yuvarlama
}

/** Bu haftanın durumu: { hedefDk | null, dk, yuzde | null, tamam, bas, bit } */
export function haftalikDurum(profilId, bugun = bugunAnahtari()) {
  const pid = pidBul(profilId);
  const bas = haftaBasi(bugun);
  if (!pid) return { hedefDk: null, dk: 0, yuzde: null, tamam: false, bas, bit: gunKaydir(bas, 6) };
  const hedefDk = veliHedefi(pid).haftalikDk;
  const dk = haftaDakikasi(ilerlemeVerisi(pid), bas);
  return {
    hedefDk, dk, bas, bit: gunKaydir(bas, 6),
    yuzde: hedefDk ? Math.min(100, Math.round((dk * 100) / hedefDk)) : null,
    tamam: !!hedefDk && dk >= hedefDk,
  };
}

/** Son n hafta (eskiden yeniye, sonuncusu bu hafta): [{ bas, bit, dk, buHafta }] */
export function haftaGecmisi(profilId, n = 4, bugun = bugunAnahtari()) {
  const pid = pidBul(profilId);
  const veri = pid ? ilerlemeVerisi(pid) : { gunler: {} };
  const buHafta = haftaBasi(bugun);
  return Array.from({ length: n }, (_, i) => {
    const bas = gunKaydir(buHafta, (i - n + 1) * 7);
    return { bas, bit: gunKaydir(bas, 6), dk: haftaDakikasi(veri, bas), buHafta: bas === buHafta };
  });
}

/** Tarih anahtarını (YYYY-AA-GG) öğlen saatiyle Date’e çevirir (saat dilimi kaymasın) */
export const gunTarihi = (g) => new Date(`${g}T12:00:00`);
