// Aralıklı tekrar motoru (S16): 5 kutulu Leitner sistemi, günlük sınır, deste/kart yönetimi, hazır desteler, CSV içe/dışa aktarma (S34c: 2-4. sınıf desteleri). Depo: tekrar:<profilId> (DOM'a dokunmaz)
import { oku, yaz } from '../core/storage.js';
import { etkinProfil } from '../core/store.js';
import { gunAnahtari, kimlikUret, trKucuk, boslukTemizle, karakterSayisi, sinirla, tamSayi } from '../core/utils.js';

export const KUTU_SAYISI = 5;
export const VARSAYILAN_ARALIKLAR = Object.freeze([1, 2, 4, 8, 16]); // gün; kutu i'ye geçen kart araliklar[i-1] gün sonra sorulur
export const ARALIK_SINIRI = Object.freeze({ en: 1, enCok: 120 });
export const GUNLUK_SINIR = Object.freeze({ en: 5, enCok: 100, adim: 5, varsayilan: 20 });
export const SINIRLAR = Object.freeze({ on: 200, arka: 400, desteAdi: 40, deste: 30, kart: 2000, csvBayt: 1024 * 1024 });
export const HAZIR_DESTELER = Object.freeze(['fen-terimleri', 'sosyal-kavramlar', 'matematik-terimleri', 'ingilizce-kelimeler', 'sinif2-kelimeler', 'sinif3-kelimeler', 'sinif4-kelimeler', 'sinif5-kelimeler', 'sinif6-kelimeler', 'sinif7-kelimeler', 'sinif8-kelimeler']);
export const ICE_AKTARILAN_DESTE = 'İçe aktarılan kartlar';
const VERI_SURUMU = 1;
const GUN_DESENI = /^\d{4}-\d{2}-\d{2}$/;

const anahtar = (profilId) => `tekrar:${profilId}`;
const pid = (profilId) => profilId ?? etkinProfil()?.id ?? null;
const kes = (s, n) => [...s].slice(0, n).join('');

// ---------- Tarih (yerel gün, "YYYY-AA-GG") ----------
export const bugun = () => gunAnahtari();
const gunTarihi = (gun) => { const [y, a, g] = gun.split('-').map(Number); return new Date(y, a - 1, g); };
/** gun + n gün */
export const gunEkle = (gun, n) => { const t = gunTarihi(gun); t.setDate(t.getDate() + n); return gunAnahtari(t); };
/** gun2 - gun1 (gün) */
export function gunFarki(gun1, gun2) {
  const utc = (s) => { const [y, a, g] = s.split('-').map(Number); return Date.UTC(y, a - 1, g); };
  return Math.round((utc(gun2) - utc(gun1)) / 86400000);
}
/** "bugün", "yarın", "3 gün sonra", "12 Kasım" (başka yılsa yıl da) */
export function gunMetni(gun, simdi = bugun()) {
  const f = gunFarki(simdi, gun);
  if (f <= 0) return 'bugün';
  if (f === 1) return 'yarın';
  if (f < 7) return `${f} gün sonra`;
  const yilFarkli = gun.slice(0, 4) !== simdi.slice(0, 4);
  return new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', ...(yilFarkli ? { year: 'numeric' } : {}) }).format(gunTarihi(gun));
}
export const aralikMetni = (n) => (n === 1 ? 'yarın' : `${n} gün sonra`);

// ---------- Metin ----------
/** Kart metni: satır sonları korunur, satır içi boşluklar teke iner, en çok bir boş satır */
export function kartMetni(s) {
  return String(s ?? '').replace(/\r\n?/g, '\n').split('\n')
    .map((x) => x.replace(/[ \t\u00a0]+/g, ' ').trim()).join('\n')
    .replace(/\n{3,}/g, '\n\n').trim();
}
const karsilastirmaMetni = (s) => trKucuk(boslukTemizle(s));
const kartAnahtari = (on, arka) => `${karsilastirmaMetni(on)}|${karsilastirmaMetni(arka)}`;

/** Yazılan cevap kartın cevabıyla (ya da ilk satırıyla) aynı mı? Noktalama ve büyük/küçük harf yok sayılır. Yalnız ipucu; kararı öğrenci verir */
export function cevapBenzer(yazilan, dogru) {
  const n = (s) => trKucuk(s).replace(/[.,;:!?'"’‘“”()\-–—]/g, ' ').replace(/\s+/g, ' ').trim();
  const y = n(yazilan);
  if (!y) return false;
  return n(dogru) === y || n(String(dogru).split(/\n|·/)[0]) === y;
}

/** Dosya adı için Türkçe karaktersiz kısa ad: "Fen Terimleri" → "fen-terimleri" */
export function dosyaAdiYap(ad) {
  const harf = { ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u', â: 'a', î: 'i', û: 'u' };
  const s = trKucuk(ad).replace(/[çğıöşüâîû]/g, (h) => harf[h]).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
  return s || 'kartlar';
}

// ---------- Denetim ----------
/** Aralık listesi hatası: { sira (1-5), mesaj } ya da null */
export function araliklarHatasi(a) {
  if (!Array.isArray(a) || a.length !== KUTU_SAYISI) return { sira: 1, mesaj: '5 kutunun hepsine bir aralık yaz.' };
  for (let i = 0; i < a.length; i++) {
    const v = a[i];
    if (!Number.isInteger(v) || v < ARALIK_SINIRI.en || v > ARALIK_SINIRI.enCok) {
      return { sira: i + 1, mesaj: `${i + 1}. kutunun aralığı ${ARALIK_SINIRI.en} ile ${ARALIK_SINIRI.enCok} gün arasında bir tam sayı olmalı.` };
    }
    if (i && v < a[i - 1]) return { sira: i + 1, mesaj: `${i + 1}. kutunun aralığı ${i}. kutununkinden kısa olamaz.` };
  }
  return null;
}

/** Kart hatası: { alan: 'on'|'arka', mesaj } ya da null */
export function kartHatasi({ on, arka }) {
  const o = kartMetni(on);
  const a = kartMetni(arka);
  if (!o) return { alan: 'on', mesaj: 'Kartın ön yüzünü yaz.' };
  if (karakterSayisi(o) > SINIRLAR.on) return { alan: 'on', mesaj: `Ön yüz en fazla ${SINIRLAR.on} karakter olabilir.` };
  if (!a) return { alan: 'arka', mesaj: 'Kartın arka yüzünü (cevabı) yaz.' };
  if (karakterSayisi(a) > SINIRLAR.arka) return { alan: 'arka', mesaj: `Arka yüz en fazla ${SINIRLAR.arka} karakter olabilir.` };
  return null;
}

function desteAdiHatasi(ad, v, haricId = null) {
  const a = boslukTemizle(ad);
  if (karakterSayisi(a) < 2) return 'Deste adı en az 2 karakter olmalı.';
  if (karakterSayisi(a) > SINIRLAR.desteAdi) return `Deste adı en fazla ${SINIRLAR.desteAdi} karakter olabilir.`;
  if (v.desteler.some((d) => d.id !== haricId && trKucuk(d.ad) === trKucuk(a))) return 'Bu adda bir deste zaten var. Farklı bir ad dene.';
  return null;
}

// ---------- Depo ----------
function desteDuzelt(d) {
  if (!d || typeof d !== 'object' || typeof d.id !== 'string') return null;
  return {
    id: d.id,
    ad: kes(boslukTemizle(d.ad), SINIRLAR.desteAdi).trim() || 'Deste',
    aciklama: typeof d.aciklama === 'string' ? kes(boslukTemizle(d.aciklama), 160) : '',
    kaynak: d.kaynak === 'hazir' ? 'hazir' : 'kendi',
    hazirAd: HAZIR_DESTELER.includes(d.hazirAd) ? d.hazirAd : null,
    olusturma: typeof d.olusturma === 'string' ? d.olusturma : new Date().toISOString(),
  };
}

function kartDuzelt(k, desteIdleri) {
  if (!k || typeof k !== 'object' || typeof k.id !== 'string' || !desteIdleri.has(k.deste)) return null;
  const on = kes(kartMetni(k.on), SINIRLAR.on);
  const arka = kes(kartMetni(k.arka), SINIRLAR.arka);
  if (!on || !arka) return null;
  return {
    id: k.id,
    deste: k.deste,
    on,
    arka,
    kutu: sinirla(tamSayi(k.kutu) ?? 1, 1, KUTU_SAYISI),
    sonraki: GUN_DESENI.test(k.sonraki) ? k.sonraki : bugun(),
    son: GUN_DESENI.test(k.son) ? k.son : null,
    tekrar: tamSayi(k.tekrar) ?? 0,
    bildi: tamSayi(k.bildi) ?? 0,
    olusturma: typeof k.olusturma === 'string' ? k.olusturma : new Date().toISOString(),
  };
}

function bosVeri() {
  return {
    surum: VERI_SURUMU,
    ayar: { gunlukSinir: GUNLUK_SINIR.varsayilan, araliklar: [...VARSAYILAN_ARALIKLAR] },
    desteler: [],
    kartlar: [],
    gunluk: { gun: bugun(), sayi: 0 },
  };
}

/** Profilin tekrar verisi (şemaya uydurulmuş kopya). Şema: PROJE_DEFTERI 5. bölüm */
export function srsVerisi(profilId) {
  const id = pid(profilId);
  const ham = id ? oku(anahtar(id)) : null;
  if (!ham || typeof ham !== 'object') return bosVeri();
  const desteler = (Array.isArray(ham.desteler) ? ham.desteler : []).map(desteDuzelt).filter(Boolean).slice(0, SINIRLAR.deste);
  const idler = new Set(desteler.map((d) => d.id));
  const kartlar = (Array.isArray(ham.kartlar) ? ham.kartlar : []).map((k) => kartDuzelt(k, idler)).filter(Boolean).slice(0, SINIRLAR.kart);
  const sinir = tamSayi(ham.ayar?.gunlukSinir);
  const araliklar = Array.isArray(ham.ayar?.araliklar) ? ham.ayar.araliklar.map(Number) : null;
  const g = ham.gunluk;
  return {
    surum: VERI_SURUMU,
    ayar: {
      gunlukSinir: sinir === undefined ? GUNLUK_SINIR.varsayilan : sinirla(sinir, GUNLUK_SINIR.en, GUNLUK_SINIR.enCok),
      araliklar: araliklar && !araliklarHatasi(araliklar) ? araliklar : [...VARSAYILAN_ARALIKLAR],
    },
    desteler,
    kartlar,
    gunluk: g && g.gun === bugun() ? { gun: g.gun, sayi: tamSayi(g.sayi) ?? 0 } : { gun: bugun(), sayi: 0 },
  };
}

// Oku → değiştir → yaz. fn { tamam: false, ... } dönerse yazılmaz
function guncelle(fn) {
  const id = pid();
  if (!id) return { tamam: false, hata: 'Önce bir profil seç.' };
  const v = srsVerisi(id);
  const sonuc = fn(v) ?? { tamam: true };
  if (sonuc.tamam === false) return sonuc;
  if (!yaz(anahtar(id), v)) return { tamam: false, hata: 'Kaydedilemedi. Cihazda yer açıp yeniden dene.' };
  return sonuc;
}

// ---------- Ayarlar ----------
export const srsAyarlari = (profilId) => srsVerisi(profilId).ayar;

/** { gunlukSinir?, araliklar? } → { tamam, ayar } | { tamam: false, alan, sira?, hata } */
export function srsAyarKaydet({ gunlukSinir, araliklar } = {}) {
  return guncelle((v) => {
    if (gunlukSinir !== undefined) {
      const n = Number(gunlukSinir);
      if (!Number.isInteger(n) || n < GUNLUK_SINIR.en || n > GUNLUK_SINIR.enCok) {
        return { tamam: false, alan: 'gunlukSinir', hata: `Günlük sınır ${GUNLUK_SINIR.en} ile ${GUNLUK_SINIR.enCok} arasında bir tam sayı olmalı.` };
      }
      v.ayar.gunlukSinir = n;
    }
    if (araliklar !== undefined) {
      const a = [...araliklar].map(Number);
      const h = araliklarHatasi(a);
      if (h) return { tamam: false, alan: 'araliklar', sira: h.sira, hata: h.mesaj };
      v.ayar.araliklar = a;
    }
    return { tamam: true, ayar: { ...v.ayar } };
  });
}

// ---------- Leitner ----------
/** Saf hesap: bildiyse bir üst kutu (en çok 5), bilemediyse 1. kutu; sonraki tarih = bugün + yeni kutunun aralığı */
export function sonrakiDurum(kart, bildi, araliklar = VARSAYILAN_ARALIKLAR, gun = bugun()) {
  const kutu = bildi ? Math.min(KUTU_SAYISI, (kart.kutu ?? 1) + 1) : 1;
  const aralik = araliklar[kutu - 1];
  return { kutu, aralik, sonraki: gunEkle(gun, aralik) };
}

/** Cevabı kaydeder, kutu ve sonraki tarihi günceller, günlük sayacı artırır → { tamam, kart, onceki, aralik } */
export function cevapla(kartId, bildi) {
  return guncelle((v) => {
    const k = v.kartlar.find((x) => x.id === kartId);
    if (!k) return { tamam: false, hata: 'Kart bulunamadı.' };
    const onceki = { kutu: k.kutu, sonraki: k.sonraki };
    const d = sonrakiDurum(k, bildi, v.ayar.araliklar);
    Object.assign(k, { kutu: d.kutu, sonraki: d.sonraki, son: bugun(), tekrar: k.tekrar + 1, bildi: k.bildi + (bildi ? 1 : 0) });
    v.gunluk.sayi += 1;
    return { tamam: true, kart: { ...k }, onceki, aralik: d.aralik };
  });
}

// Önce daha önce görülmüş kartlar (en çok gecikenden, küçük kutudan), sonra yeni kartlar (eklenme sırasıyla)
function tekrarSirasi(a, b) {
  const yeni = (a.tekrar === 0) - (b.tekrar === 0);
  if (yeni) return yeni;
  if (a.tekrar && b.tekrar) return a.sonraki.localeCompare(b.sonraki) || a.kutu - b.kutu;
  return 0;
}

/** Bugün sorulacaklar: { kartlar (sınıra göre kesilmiş), bekleyen (zamanı gelen tümü), kalanHak, yapilan, sinir } */
export function bugununTekrari({ deste = null, profilId } = {}) {
  const v = srsVerisi(profilId);
  const gun = bugun();
  const bekleyen = v.kartlar.filter((k) => (!deste || k.deste === deste) && k.sonraki <= gun).sort(tekrarSirasi);
  const kalanHak = Math.max(0, v.ayar.gunlukSinir - v.gunluk.sayi);
  return { kartlar: bekleyen.slice(0, kalanHak), bekleyen: bekleyen.length, kalanHak, yapilan: v.gunluk.sayi, sinir: v.ayar.gunlukSinir };
}

/** Kutulardaki kart sayıları [k1..k5] */
export function kutuDagilimi(deste = null, profilId) {
  const d = Array(KUTU_SAYISI).fill(0);
  for (const k of srsVerisi(profilId).kartlar) if (!deste || k.deste === deste) d[k.kutu - 1]++;
  return d;
}

/** Bugünden sonraki ilk tekrar günü ve o gün zamanı gelen kart sayısı: { gun, sayi } | null */
export function sonrakiTekrar(deste = null, profilId) {
  const gun = bugun();
  const gelecek = srsVerisi(profilId).kartlar.filter((k) => (!deste || k.deste === deste) && k.sonraki > gun);
  if (!gelecek.length) return null;
  const ilk = gelecek.reduce((m, k) => (k.sonraki < m ? k.sonraki : m), gelecek[0].sonraki);
  return { gun: ilk, sayi: gelecek.filter((k) => k.sonraki === ilk).length };
}

// ---------- Desteler ----------
/** Desteler + kartSayisi, bekleyen (zamanı gelen), ogrenilen (5. kutu) */
export function desteOzetleri(profilId) {
  const v = srsVerisi(profilId);
  const gun = bugun();
  return v.desteler.map((d) => {
    const k = v.kartlar.filter((x) => x.deste === d.id);
    return { ...d, kartSayisi: k.length, bekleyen: k.filter((x) => x.sonraki <= gun).length, ogrenilen: k.filter((x) => x.kutu === KUTU_SAYISI).length };
  });
}
export const desteBul = (id) => srsVerisi().desteler.find((d) => d.id === id) ?? null;
export const desteKartlari = (id) => srsVerisi().kartlar.filter((k) => k.deste === id);

function yeniDeste(v, ad, ek = {}) {
  const d = desteDuzelt({ id: kimlikUret(), ad: boslukTemizle(ad), kaynak: 'kendi', olusturma: new Date().toISOString(), ...ek });
  v.desteler.push(d);
  return d;
}

export function desteOlustur(ad, { aciklama = '' } = {}) {
  return guncelle((v) => {
    if (v.desteler.length >= SINIRLAR.deste) return { tamam: false, hata: `En fazla ${SINIRLAR.deste} deste olabilir.` };
    const h = desteAdiHatasi(ad, v);
    if (h) return { tamam: false, hata: h };
    return { tamam: true, deste: yeniDeste(v, ad, { aciklama }) };
  });
}

export function desteYenidenAdlandir(id, ad) {
  return guncelle((v) => {
    const d = v.desteler.find((x) => x.id === id);
    if (!d) return { tamam: false, hata: 'Deste bulunamadı.' };
    const h = desteAdiHatasi(ad, v, id);
    if (h) return { tamam: false, hata: h };
    d.ad = boslukTemizle(ad);
    return { tamam: true, deste: { ...d } };
  });
}

/** Desteyi ve içindeki kartları siler */
export function desteSil(id) {
  return guncelle((v) => {
    if (!v.desteler.some((d) => d.id === id)) return { tamam: false, hata: 'Deste bulunamadı.' };
    v.desteler = v.desteler.filter((d) => d.id !== id);
    v.kartlar = v.kartlar.filter((k) => k.deste !== id);
    return { tamam: true };
  });
}

// ---------- Kartlar ----------
function yeniKart(deste, on, arka, ek = {}) {
  return { id: kimlikUret(), deste, on, arka, kutu: 1, sonraki: bugun(), son: null, tekrar: 0, bildi: 0, olusturma: new Date().toISOString(), ...ek };
}

/** Yeni kart 1. kutuya girer ve bugün sorulabilir → { tamam, kart } | { tamam: false, alan, hata } */
export function kartEkle(desteId, bilgi) {
  return guncelle((v) => {
    if (!v.desteler.some((d) => d.id === desteId)) return { tamam: false, alan: 'on', hata: 'Deste bulunamadı.' };
    if (v.kartlar.length >= SINIRLAR.kart) return { tamam: false, alan: 'on', hata: `En fazla ${SINIRLAR.kart} kart olabilir. Kullanmadığın kartları silebilirsin.` };
    const h = kartHatasi(bilgi);
    if (h) return { tamam: false, alan: h.alan, hata: h.mesaj };
    const on = kartMetni(bilgi.on);
    const arka = kartMetni(bilgi.arka);
    const a = kartAnahtari(on, arka);
    if (v.kartlar.some((k) => k.deste === desteId && kartAnahtari(k.on, k.arka) === a)) return { tamam: false, alan: 'on', hata: 'Bu destede aynı kart zaten var.' };
    const kart = yeniKart(desteId, on, arka);
    v.kartlar.push(kart);
    return { tamam: true, kart: { ...kart } };
  });
}

/** Metni değiştirir; kutu ve tarih korunur */
export function kartGuncelle(id, bilgi) {
  return guncelle((v) => {
    const k = v.kartlar.find((x) => x.id === id);
    if (!k) return { tamam: false, alan: 'on', hata: 'Kart bulunamadı.' };
    const h = kartHatasi(bilgi);
    if (h) return { tamam: false, alan: h.alan, hata: h.mesaj };
    const on = kartMetni(bilgi.on);
    const arka = kartMetni(bilgi.arka);
    const a = kartAnahtari(on, arka);
    if (v.kartlar.some((x) => x.id !== id && x.deste === k.deste && kartAnahtari(x.on, x.arka) === a)) return { tamam: false, alan: 'on', hata: 'Bu destede aynı kart zaten var.' };
    Object.assign(k, { on, arka });
    return { tamam: true, kart: { ...k } };
  });
}

export function kartSil(id) {
  return guncelle((v) => {
    const once = v.kartlar.length;
    v.kartlar = v.kartlar.filter((k) => k.id !== id);
    return v.kartlar.length < once ? { tamam: true } : { tamam: false, hata: 'Kart bulunamadı.' };
  });
}

// ---------- Hazır desteler (data/decks/<ad>.json) ----------
const hazirOnbellek = new Map();

function hazirDesteDenetle(j, ad) {
  if (!j || j.ad !== ad || typeof j.baslik !== 'string' || !Array.isArray(j.kartlar)) throw new Error(`Hazır deste bozuk: ${ad}`);
  const kartlar = j.kartlar.filter((k) => k && !kartHatasi(k)).map((k) => Object.freeze({ on: kartMetni(k.on), arka: kartMetni(k.arka) }));
  if (!kartlar.length) throw new Error(`Hazır destede kart yok: ${ad}`);
  return Object.freeze({ ad, baslik: j.baslik, aciklama: String(j.aciklama ?? ''), sinif: String(j.sinif ?? ''), kartlar: Object.freeze(kartlar) });
}

/** Hazır deste dosyasını yükler (bir kez) */
export function hazirDesteYukle(ad) {
  if (!HAZIR_DESTELER.includes(ad)) return Promise.reject(new Error(`Bilinmeyen deste: ${ad}`));
  if (!hazirOnbellek.has(ad)) {
    const adres = new URL(`../../data/decks/${ad}.json`, import.meta.url);
    hazirOnbellek.set(ad, fetch(adres)
      .then((r) => { if (!r.ok) throw new Error(`Deste dosyası açılamadı: ${ad}`); return r.json(); })
      .then((j) => hazirDesteDenetle(j, ad))
      .catch((h) => { hazirOnbellek.delete(ad); throw h; }));
  }
  return hazirOnbellek.get(ad);
}

/** Açılabilen hazır desteler (açılamayan atlanır, konsola yazılır) */
export async function hazirDesteleriYukle() {
  const sonuc = await Promise.allSettled(HAZIR_DESTELER.map(hazirDesteYukle));
  sonuc.filter((s) => s.status === 'rejected').forEach((s) => console.warn('[srs]', s.reason));
  return sonuc.filter((s) => s.status === 'fulfilled').map((s) => s.value);
}

/** Hazır desteyi profilin destelerine kopyalar (kartlar düzenlenebilir olur) → { tamam, deste, eklenen } */
export async function hazirDesteEkle(ad) {
  const h = await hazirDesteYukle(ad);
  return guncelle((v) => {
    if (v.desteler.some((d) => d.hazirAd === ad)) return { tamam: false, hata: 'Bu deste zaten eklenmiş.' };
    if (v.desteler.length >= SINIRLAR.deste) return { tamam: false, hata: `En fazla ${SINIRLAR.deste} deste olabilir.` };
    if (v.kartlar.length + h.kartlar.length > SINIRLAR.kart) return { tamam: false, hata: `En fazla ${SINIRLAR.kart} kart olabilir. Önce kullanmadığın kartları sil.` };
    let isim = h.baslik;
    for (let n = 2; desteAdiHatasi(isim, v); n++) isim = `${kes(h.baslik, SINIRLAR.desteAdi - 3)} ${n}`;
    const deste = yeniDeste(v, isim, { kaynak: 'hazir', hazirAd: ad, aciklama: h.aciklama });
    h.kartlar.forEach((k) => v.kartlar.push(yeniKart(deste.id, k.on, k.arka)));
    return { tamam: true, deste: { ...deste }, eklenen: h.kartlar.length };
  });
}

// ---------- CSV ----------
// Dışa aktarma: UTF-8 (BOM'lu, Excel Türkçe harfleri doğru açsın), ayırıcı ";" (Türkçe Excel'in liste ayırıcısı), satır sonu CRLF
export const CSV_BASLIK = Object.freeze(['deste', 'ön', 'arka', 'kutu', 'sonraki']);
const FORMUL = /^[=+\-@\t\r]/; // tablo programı bunları formül sanmasın diye başına ' eklenir; içe aktarırken geri alınır

function csvHucre(deger) {
  let m = String(deger ?? '');
  if (FORMUL.test(m)) m = `'${m}`;
  return /[;,"\n\r\t]|^\s|\s$/.test(m) ? `"${m.replace(/"/g, '""')}"` : m;
}

/** Destenin (deste null ise tüm destelerin) kartları CSV metni olarak */
export function csvOlustur(deste = null, profilId) {
  const v = srsVerisi(profilId);
  const adlar = new Map(v.desteler.map((d) => [d.id, d.ad]));
  const satirlar = [CSV_BASLIK, ...v.kartlar.filter((k) => !deste || k.deste === deste).map((k) => [adlar.get(k.deste), k.on, k.arka, k.kutu, k.sonraki])];
  return `\uFEFF${satirlar.map((s) => s.map(csvHucre).join(';')).join('\r\n')}\r\n`;
}

// İlk satırda (tırnak dışında) en çok geçen ayırıcı; eşitlikte ";"
function ayiriciBul(metin) {
  const sayac = { ';': 0, ',': 0, '\t': 0 };
  let tirnak = false;
  for (const c of metin) {
    if (c === '"') tirnak = !tirnak;
    else if (!tirnak && (c === '\n' || c === '\r')) break;
    else if (!tirnak && c in sayac) sayac[c]++;
  }
  return Object.entries(sayac).reduce((en, s) => (s[1] > en[1] ? s : en), [';', 0])[0];
}

/** CSV metnini satır/hücre dizisine çevirir (tırnaklı hücre, "" kaçışı, hücre içi satır sonu desteklenir; boş satırlar atlanır) */
export function csvCoz(metin) {
  const m = String(metin ?? '').replace(/^\uFEFF/, '');
  const ay = ayiriciBul(m);
  const satirlar = [];
  let satir = [];
  let hucre = '';
  let tirnak = false;
  let tirnakliydi = false;
  for (let i = 0; i < m.length; i++) {
    const c = m[i];
    if (tirnak) {
      if (c === '"' && m[i + 1] === '"') { hucre += '"'; i++; }
      else if (c === '"') tirnak = false;
      else hucre += c;
    } else if (c === '"' && hucre === '' && !tirnakliydi) { tirnak = true; tirnakliydi = true; }
    else if (c === ay) { satir.push(hucre); hucre = ''; tirnakliydi = false; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && m[i + 1] === '\n') i++;
      satir.push(hucre); satirlar.push(satir);
      satir = []; hucre = ''; tirnakliydi = false;
    } else hucre += c;
  }
  if (hucre !== '' || satir.length) { satir.push(hucre); satirlar.push(satir); }
  return satirlar.filter((s) => s.some((h) => h.trim() !== ''));
}

const SUTUN_ADLARI = {
  deste: ['deste', 'deck', 'konu'],
  on: ['ön', 'on', 'ön yüz', 'soru', 'terim', 'kelime', 'front', 'question'],
  arka: ['arka', 'arka yüz', 'cevap', 'anlam', 'tanım', 'back', 'answer'],
  kutu: ['kutu', 'box'],
  sonraki: ['sonraki', 'sonraki tekrar', 'next'],
};
function basligiBul(satir) {
  const h = {};
  satir.forEach((hucre, i) => {
    const ad = trKucuk(boslukTemizle(hucre));
    for (const [alan, adlar] of Object.entries(SUTUN_ADLARI)) if (h[alan] === undefined && adlar.includes(ad)) h[alan] = i;
  });
  return h.on !== undefined && h.arka !== undefined ? h : null;
}
const formulGeriAl = (s) => (/^'[=+\-@\t\r]/.test(s) ? s.slice(1) : s);

/**
 * CSV'den kart ekler. Başlık satırı varsa sütunlar adından bulunur; yoksa 2 sütun = ön;arka, 3+ sütun = deste;ön;arka;kutu;sonraki.
 * desteId verilirse tüm kartlar o desteye girer (deste sütunu yok sayılır); yoksa deste adına göre (yoksa oluşturulur).
 * Aynı destede aynı ön+arka atlanır; geçerli kutu ve sonraki tarih korunur (dışa aktar → içe aktar ilerlemeyi taşır).
 * → { tamam, eklenen, atlanan, hatali, hataliSatirlar[≤5], yeniDesteler[] } | { tamam: false, hata }
 */
export function csvIceAktar(metin, { desteId = null } = {}) {
  const satirlar = csvCoz(metin);
  if (!satirlar.length) return { tamam: false, hata: 'Dosyada kart bulunamadı.' };
  let harita = basligiBul(satirlar[0]);
  const baslikli = !!harita;
  const veri = baslikli ? satirlar.slice(1) : satirlar;
  harita ??= satirlar[0].length >= 3 ? { deste: 0, on: 1, arka: 2, kutu: 3, sonraki: 4 } : { on: 0, arka: 1 };
  if (!veri.length) return { tamam: false, hata: 'Dosyada başlıktan başka satır yok.' };
  if (veri.length > SINIRLAR.kart) return { tamam: false, hata: `Dosyada çok fazla satır var (en çok ${SINIRLAR.kart}).` };

  return guncelle((v) => {
    if (desteId && !v.desteler.some((d) => d.id === desteId)) return { tamam: false, hata: 'Deste bulunamadı.' };
    const adaGore = new Map(v.desteler.map((d) => [trKucuk(d.ad), d]));
    const mevcut = new Set(v.kartlar.map((k) => `${k.deste}|${kartAnahtari(k.on, k.arka)}`));
    const s = { tamam: true, eklenen: 0, atlanan: 0, hatali: 0, hataliSatirlar: [], yeniDesteler: [] };
    const hataliEkle = (i) => { s.hatali++; if (s.hataliSatirlar.length < 5) s.hataliSatirlar.push(i + (baslikli ? 2 : 1)); };

    veri.forEach((satir, i) => {
      const al = (alan) => (harita[alan] === undefined ? '' : formulGeriAl(satir[harita[alan]] ?? ''));
      const on = kartMetni(al('on'));
      const arka = kartMetni(al('arka'));
      if (kartHatasi({ on, arka })) { hataliEkle(i); return; }
      let hedef = desteId;
      if (!hedef) {
        let ad = kes(boslukTemizle(al('deste')), SINIRLAR.desteAdi).trim();
        if (karakterSayisi(ad) < 2) ad = ICE_AKTARILAN_DESTE;
        let d = adaGore.get(trKucuk(ad));
        if (!d) {
          if (v.desteler.length >= SINIRLAR.deste) { hataliEkle(i); return; }
          d = yeniDeste(v, ad);
          adaGore.set(trKucuk(ad), d);
          s.yeniDesteler.push(d.ad);
        }
        hedef = d.id;
      }
      const a = `${hedef}|${kartAnahtari(on, arka)}`;
      if (mevcut.has(a)) { s.atlanan++; return; }
      if (v.kartlar.length >= SINIRLAR.kart) { hataliEkle(i); return; }
      const kutu = tamSayi(al('kutu'));
      const sonraki = al('sonraki').trim();
      v.kartlar.push(yeniKart(hedef, on, arka, {
        kutu: kutu >= 1 && kutu <= KUTU_SAYISI ? kutu : 1,
        sonraki: GUN_DESENI.test(sonraki) ? sonraki : bugun(),
      }));
      mevcut.add(a);
      s.eklenen++;
    });

    if (!s.eklenen) {
      return { tamam: false, hata: s.atlanan ? 'Dosyadaki kartların hepsi zaten var.' : 'Dosyada geçerli kart bulunamadı. Her satırda en az ön ve arka yüz olmalı.' };
    }
    return s;
  });
}

/** CSV dosyasını metne çevirir: önce UTF-8, olmazsa Türkçe Windows kodlaması (eski Excel kayıtları) */
export async function csvDosyasiOku(dosya) {
  if (!dosya) throw new Error('Dosya seçilmedi.');
  if (dosya.size > SINIRLAR.csvBayt) throw new Error('Dosya çok büyük (en çok 1 MB).');
  const veri = await dosya.arrayBuffer();
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(veri);
  } catch {
    try { return new TextDecoder('windows-1254').decode(veri); } catch { throw new Error('Dosya okunamadı. CSV dosyasını “UTF-8” olarak kaydedip yeniden dene.'); }
  }
}
