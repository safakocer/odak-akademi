// Oturum sonuçlarını Kayıt şemasına göre saklar; kişisel rekor, seri, haftalık süre, son anlama yüzdesi ve son seçilen seviye sorguları sunar (S34-son: rekor kademeye göre ayrı)
import { oku, yaz, yazmaDene, sil, depoUyar } from './storage.js';
import { yay, OLAYLAR, etkinProfil } from './store.js';
import { kimlikUret, sayi, tamSayi, gunAnahtari } from './utils.js';

const ONEK = 'kayitlar:';
const SEVIYE_ONEK = 'seviyeler:';
export const EN_FAZLA_KAYIT = 1000; // profil başına; dolunca en eski kayıtlar düşer
export const REKOR_ONCELIGI = Object.freeze(['eoh', 'puan', 'dogru']); // rekor alanı: ilk dolu olan

function gunBasi(geriGun = 0) {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  t.setDate(t.getDate() - geriGun);
  return t;
}

function profilKimligi(profilId) {
  return profilId ?? etkinProfil()?.id ?? null;
}

// Kayıt ekstrası yer kaplamasın (1000 kayıt × 6 profil): boş/false/null atılır, üst düzeyde zaten olan alanlar tekrarlanmaz,
// sayılar en çok 1 basamak, en çok 2 düzey iç içe nesne; dizi ve 80 karakterden uzun metin yazılmaz
const UST_ALANLAR = new Set(['wpm', 'anlamaYuzde', 'eoh', 'dogru', 'yanlis', 'puan', 'sureSn', 'zorluk']);
function ekstraSadelestir(nesne, duzey = 0) {
  const sonuc = {};
  for (const [k, v] of Object.entries(nesne)) {
    if (v == null || v === false || v === '' || (duzey === 0 && UST_ALANLAR.has(k))) continue;
    if (typeof v === 'number') { if (Number.isFinite(v)) sonuc[k] = Math.round(v * 10) / 10; }
    else if (v === true) sonuc[k] = true;
    else if (typeof v === 'string') { if (v.length <= 80) sonuc[k] = v; }
    else if (typeof v === 'object' && !Array.isArray(v) && duzey < 2) {
      const ic = ekstraSadelestir(v, duzey + 1);
      if (Object.keys(ic).length) sonuc[k] = ic;
    }
  }
  return sonuc;
}

// EOH = WPM x anlama oranı
export function eohHesapla(wpm, anlamaYuzde) {
  const w = sayi(wpm);
  const a = sayi(anlamaYuzde);
  if (w === undefined || a === undefined) return undefined;
  return Math.round((w * Math.min(100, Math.max(0, a))) / 100);
}

export function kayitlariGetir(profilId) {
  const id = profilKimligi(profilId);
  if (!id) return [];
  const liste = oku(ONEK + id, []);
  return Array.isArray(liste)
    ? liste.filter((k) => k && typeof k === 'object' && typeof k.tarih === 'string' && typeof k.modul === 'string')
    : [];
}

/**
 * S34-son: Kaydın rekor kademesi. İlkokulda yapılan turun kaydı ekstra.kademe = 'ilkokul' taşır (çerçeve yazar); etiketi olmayan kayıt
 * (S34-son öncesi ve ortaokul) 'ortaokul' sayılır. Sınıf bantları ayarları değiştirdiği için rekorlar kademe içinde karşılaştırılır.
 */
export const ILKOKUL_ETIKETI = 'ilkokul';
export const kayitKademesi = (kayit) => (kayit?.ekstra?.kademe === ILKOKUL_ETIKETI ? ILKOKUL_ETIKETI : 'ortaokul');
/** İki kayıt (ya da kayıt ve kademe adı) aynı rekor kademesinde mi? */
export const ayniKademe = (kayit, kademeAdi) => kayitKademesi(kayit) === (kademeAdi === ILKOKUL_ETIKETI ? ILKOKUL_ETIKETI : 'ortaokul');

/** Kaydın rekor alanı: eoh > puan > dogru (ilk dolu olan); yoksa null */
export function rekorAlani(kayit) {
  return REKOR_ONCELIGI.find((a) => sayi(kayit?.[a]) !== undefined) ?? null;
}

function enIyi(liste, alan, yon = 'buyuk') {
  let en = null;
  let enDeger;
  for (const k of liste) {
    const v = sayi(k[alan]);
    if (v === undefined) continue;
    if (en === null || (yon === 'kucuk' ? v < enDeger : v > enDeger)) { en = k; enDeger = v; }
  }
  return en;
}

// Kota dolarsa en eski kayıtların dörtte birini budayıp en fazla 3 kez yeniden dener; yeni kayıt (sondaki) korunur
function listeyiYaz(pid, liste) {
  let durum = yazmaDene(ONEK + pid, liste);
  let budanan = 0;
  for (let i = 0; durum === 'kota' && i < 3 && liste.length > 1; i++) {
    const n = Math.min(liste.length - 1, Math.ceil(liste.length / 4));
    liste.splice(0, n);
    budanan += n;
    durum = yazmaDene(ONEK + pid, liste);
  }
  if (durum === 'tamam' && budanan) {
    depoUyar('kota', `Cihazda yer azaldığı için en eski ${budanan} sonuç silindi. Ayarlar’dan yedek indirmeyi unutma.`);
  } else if (durum === 'kota') {
    depoUyar('kota', 'Cihazdaki kayıt alanı dolu; bu sonuç kaydedilemedi. Ayarlar’dan yedek indirip kullanılmayan profilleri silebilirsin.');
  } else if (durum === 'hata') {
    depoUyar('yazma', 'Kayıt yapılamadı. Sayfayı yenileyip yeniden dene.');
  }
  return { durum, budanan };
}

/**
 * Oturum sonucunu etkin profile kaydeder.
 * sonuc: { modul, egzersiz, sureSn, zorluk, wpm?, anlamaYuzde?, eoh?, dogru?, yanlis?, puan?, ekstra? }
 * Döner: { kayit, kaydedildi, hata: null|'profil'|'kota'|'hata', rekor: { alan, deger, onceki, yeni } | null }
 * Rekor yalnızca aynı egzersiz, aynı seviye ve (S34-son) aynı kademedeki önceki kayıtlarla karşılaştırılır.
 */
export function kayitEkle(sonuc, profilId) {
  if (!sonuc || typeof sonuc.modul !== 'string' || typeof sonuc.egzersiz !== 'string') {
    throw new TypeError('kayitEkle: "modul" ve "egzersiz" metin olmalı.');
  }
  const pid = profilKimligi(profilId);
  if (!pid) return { kayit: null, kaydedildi: false, hata: 'profil', rekor: null };

  // profilId kayda yazılmaz (anahtar zaten profili belirtir); yer kazanmak için
  const kayit = {
    id: kimlikUret(),
    tarih: new Date().toISOString(),
    modul: sonuc.modul,
    egzersiz: sonuc.egzersiz,
    sureSn: tamSayi(sonuc.sureSn) ?? 0,
    zorluk: sayi(sonuc.zorluk) ?? 1,
  };
  const wpm = tamSayi(sonuc.wpm);
  if (wpm !== undefined) kayit.wpm = wpm;
  const anlama = sayi(sonuc.anlamaYuzde);
  if (anlama !== undefined) kayit.anlamaYuzde = Math.round(Math.min(100, Math.max(0, anlama)));
  const eoh = sonuc.eoh !== undefined ? tamSayi(sonuc.eoh) : eohHesapla(kayit.wpm, kayit.anlamaYuzde);
  if (eoh !== undefined) kayit.eoh = eoh;
  const dogru = tamSayi(sonuc.dogru);
  if (dogru !== undefined) kayit.dogru = dogru;
  const yanlis = tamSayi(sonuc.yanlis);
  if (yanlis !== undefined) kayit.yanlis = yanlis;
  const puan = tamSayi(sonuc.puan);
  if (puan !== undefined) kayit.puan = puan;
  if (sonuc.ekstra && typeof sonuc.ekstra === 'object') {
    const ekstra = ekstraSadelestir(sonuc.ekstra);
    if (Object.keys(ekstra).length) kayit.ekstra = ekstra;
  }

  const liste = kayitlariGetir(pid);
  const alan = rekorAlani(kayit);
  const oncekiKayit = alan
    ? enIyi(liste.filter((k) => k.modul === kayit.modul && k.egzersiz === kayit.egzersiz && k.zorluk === kayit.zorluk
      && kayitKademesi(k) === kayitKademesi(kayit)), alan)
    : null;
  liste.push(kayit);
  if (liste.length > EN_FAZLA_KAYIT) liste.splice(0, liste.length - EN_FAZLA_KAYIT);

  const { durum } = listeyiYaz(pid, liste);
  const kaydedildi = durum === 'tamam';
  const tamKayit = { ...kayit, profilId: pid };
  if (kaydedildi) yay(OLAYLAR.KAYIT_EKLENDI, tamKayit);

  let rekor = null;
  if (alan) {
    const deger = sayi(kayit[alan]);
    const onceki = oncekiKayit ? sayi(oncekiKayit[alan]) : undefined;
    rekor = { alan, deger, onceki, yeni: kaydedildi && onceki !== undefined && deger > onceki };
  }
  return { kayit: tamKayit, kaydedildi, hata: kaydedildi ? null : durum, rekor };
}

// ---------- Sorgular (profilId verilmezse etkin profil) ----------
function sonGunlerSuz(liste, gun) {
  const sinir = gunBasi(Math.max(1, gun) - 1).getTime();
  return liste.filter((k) => Date.parse(k.tarih) >= sinir);
}

export function sonGunler(gun = 7, profilId) {
  return sonGunlerSuz(kayitlariGetir(profilId), gun);
}

export function modulKayitlari(modul, { egzersiz, profilId } = {}) {
  return kayitlariGetir(profilId).filter((k) => k.modul === modul && (!egzersiz || k.egzersiz === egzersiz));
}

// yon: 'buyuk' (yüksek iyi) | 'kucuk' (düşük iyi, örn. süre); zorluk verilirse yalnızca o seviyenin kayıtları; S34-son: kademe ('ilkokul'|'ortaokul') verilirse yalnız o kademenin
export function kisiselRekor({ alan = 'eoh', modul, egzersiz, zorluk, kademe, yon = 'buyuk', profilId } = {}) {
  const liste = kayitlariGetir(profilId).filter((k) => (!modul || k.modul === modul)
    && (!egzersiz || k.egzersiz === egzersiz) && (zorluk === undefined || k.zorluk === zorluk) && (!kademe || ayniKademe(k, kademe)));
  return enIyi(liste, alan, yon);
}

// Listeyi bir kez okuyup hesaplayan iç fonksiyonlar (ozet aynı listeyi paylaşır)
function seriHesapla(liste) {
  const gunler = new Set(liste.map((k) => gunAnahtari(k.tarih)));
  let geri = gunler.has(gunAnahtari(gunBasi(0))) ? 0 : 1;
  let seri = 0;
  while (gunler.has(gunAnahtari(gunBasi(geri)))) { seri++; geri++; }
  return seri;
}

function haftaDakikaHesapla(liste) {
  return Math.round(sonGunlerSuz(liste, 7).reduce((t, k) => t + (sayi(k.sureSn) ?? 0), 0) / 60);
}

function sonEohBul(liste) {
  for (let i = liste.length - 1; i >= 0; i--) if (sayi(liste[i].eoh) !== undefined) return liste[i].eoh;
  return null;
}

// Bugün ya da dün biten ardışık çalışma günü sayısı
export function calismaSerisi(profilId) { return seriHesapla(kayitlariGetir(profilId)); }
export function haftalikDakika(profilId) { return haftaDakikaHesapla(kayitlariGetir(profilId)); }
export function sonEoh(profilId) { return sonEohBul(kayitlariGetir(profilId)); }

/** S06: Son ölçülen anlama yüzdesi (modül/egzersiz süzgeciyle); yoksa null. Kademeli hız %70 kuralı bunu kullanır */
export function sonAnlamaYuzde({ modul, egzersiz, profilId } = {}) {
  const liste = kayitlariGetir(profilId);
  for (let i = liste.length - 1; i >= 0; i--) {
    const k = liste[i];
    if ((modul && k.modul !== modul) || (egzersiz && k.egzersiz !== egzersiz)) continue;
    const a = sayi(k.anlamaYuzde);
    if (a !== undefined) return a;
  }
  return null;
}

export function ozet(profilId) {
  const liste = kayitlariGetir(profilId);
  return {
    seriGun: seriHesapla(liste),
    haftaDk: haftaDakikaHesapla(liste),
    sonEoh: sonEohBul(liste),
    toplamKayit: liste.length,
  };
}

// ---------- Son seçilen seviye (egzersiz adı → 1-3) ----------
function seviyeHaritasi(pid) {
  const h = oku(SEVIYE_ONEK + pid, {});
  return h && typeof h === 'object' && !Array.isArray(h) ? h : {};
}

/** Öğrencinin bu egzersizde en son seçtiği seviye; kayıt yoksa son sonucun seviyesi, o da yoksa undefined */
export function sonSeviye(egzersiz, profilId) {
  const pid = profilKimligi(profilId);
  if (!pid) return undefined;
  const s = sayi(seviyeHaritasi(pid)[egzersiz]);
  if (s !== undefined) return s;
  const liste = kayitlariGetir(pid).filter((k) => k.egzersiz === egzersiz);
  return liste.length ? sayi(liste[liste.length - 1].zorluk) : undefined;
}

/** Tur başlarken seçilen seviyeyi hatırlar (tur yarıda kalsa da). Değişmediyse yazmaz. */
export function sonSeviyeKaydet(egzersiz, zorluk, profilId) {
  const pid = profilKimligi(profilId);
  const z = sayi(zorluk);
  if (!pid || z === undefined) return false;
  const harita = seviyeHaritasi(pid);
  if (harita[egzersiz] === z) return true;
  return yaz(SEVIYE_ONEK + pid, { ...harita, [egzersiz]: z });
}

/** Profilin çalışma sonuçlarını ve seviye seçimlerini siler (profil kalır). Profil silinince anahtarları profile.js siler. */
export function profilKayitlariniSil(profilId) {
  if (!profilId) return;
  sil(ONEK + profilId);
  sil(SEVIYE_ONEK + profilId);
}
