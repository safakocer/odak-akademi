// Sağlıklı oyunlaştırma (S20): esnek seri (dinlenme hakkı), XP ve seviye, 20 rozet, günlük hedef ve “bugünlük yeter”; veri ilerleme:<profilId>
import { oku, yaz } from '../core/storage.js';
import { dinle, OLAYLAR, etkinProfil } from '../core/store.js';
import { kayitlariGetir } from '../core/metrics.js';
import { sayi, gunAnahtari } from '../core/utils.js';

const ONEK = 'ilerleme:';
export const ILERLEME_SURUMU = 1;
export const HEDEF_SECENEKLERI = Object.freeze([10, 15, 20, 30]); // günlük hedef (dk)
export const VARSAYILAN_HEDEF_DK = 15;
// Seri: başta 1 dinlenme hakkı; her 7 çalışma gününde +1, en çok 2. Hak yokken çalışılmayan gün seriyi sıfırlar
export const SERI = Object.freeze({ baslangicHak: 1, enCokHak: 2, hakIcinGun: 7 });
// XP: tur 5 (20 sn altı 1), dakika başına 2 (en çok 10 dk), anlama %70+ ise +5, hedef tamamlanınca bir kez +20; günde en çok 150
export const XP = Object.freeze({ tur: 5, kisaTur: 1, kisaTurSn: 20, dakika: 2, enCokDakika: 10, anlama: 5, anlamaEsigi: 70, hedefBonusu: 20, gunlukSinir: 150 });
// “Bugünlük yeter” uyarısı: hedefin 2 katı ve en az 40 dk
export const YETER = Object.freeze({ katsayi: 2, enAzDk: 40 });
const EN_COK_GUN = 800;
const UNVANLAR = [[15, 'Yıldız Rehberi'], [10, 'Fener Bekçisi'], [5, 'Işık Taşıyıcı'], [1, 'Kıyı Gözcüsü']];
const DIKKAT_OYUNLARI = ['hizli-dokun', 'stroop', 'git-dur', 'iptal-testi', 'surekli-dikkat'];
const ANA_ALANLAR = ['oku', 'goz', 'dikkat', 'hafiza'];

// ---------- Gün yardımcıları (yerel tarih, YYYY-AA-GG) ----------
function tarihten(anahtar) {
  const [y, a, g] = anahtar.split('-').map(Number);
  return new Date(y, a - 1, g);
}
export function gunKaydir(anahtar, n) {
  const t = tarihten(anahtar);
  t.setDate(t.getDate() + n);
  return gunAnahtari(t);
}
export function bugunAnahtari() { return gunAnahtari(new Date()); }

// ---------- Ölçü okuyucular (ilerleme-veri.js de kullanır) ----------
/** Dikkat doğruluğu %: çerçevenin ekstra.isabet alanı, yoksa doğru ÷ (doğru + yanlış) */
export function dikkatIsabet(k) {
  const i = sayi(k?.ekstra?.isabet);
  if (i !== undefined) return i;
  const d = sayi(k?.dogru) ?? 0;
  const y = sayi(k?.yanlis) ?? 0;
  return d + y > 0 ? Math.round((d * 100) / (d + y)) : undefined;
}
/** Hafıza dizi uzunluğu: ekstra.enIyi, yoksa puan (hafıza oyunlarında puan = enIyi) */
export function hafizaDuzey(k) { return sayi(k?.ekstra?.enIyi) ?? sayi(k?.puan); }

// ---------- Esnek seri (saf) ----------
/**
 * aktifGunler: Set<'YYYY-AA-GG'>. Döner: { seri, hak, enUzun, bugunCalisildi, dinlenmeKullanildi, dinlenmeSonrasiDevam, durumlar: Map<gün, calisti|dinlenme|bos|bekliyor> }
 * Bugün çalışılmadıysa ceza yoktur (gün bitmedi); seri dünde biter.
 */
export function seriHesapla(aktifGunler, bugun = bugunAnahtari()) {
  const s = {
    seri: 0, hak: SERI.baslangicHak, enUzun: 0, aktifSayac: 0, dinlenmeKullanildi: 0, dinlenmeSonrasiDevam: 0,
    bugunCalisildi: aktifGunler.has(bugun), durumlar: new Map(),
  };
  const sirali = [...aktifGunler].filter((g) => g <= bugun).sort();
  if (!sirali.length) return s;
  let dinlenmeVar = false;
  for (let g = sirali[0]; g <= bugun; g = gunKaydir(g, 1)) {
    if (aktifGunler.has(g)) {
      s.seri += 1;
      s.aktifSayac += 1;
      if (s.aktifSayac % SERI.hakIcinGun === 0) s.hak = Math.min(SERI.enCokHak, s.hak + 1);
      if (dinlenmeVar) { s.dinlenmeSonrasiDevam += 1; dinlenmeVar = false; }
      s.enUzun = Math.max(s.enUzun, s.seri);
      s.durumlar.set(g, 'calisti');
    } else if (g === bugun) {
      s.durumlar.set(g, 'bekliyor');
    } else if (s.seri > 0 && s.hak > 0) {
      s.hak -= 1;
      s.dinlenmeKullanildi += 1;
      dinlenmeVar = true;
      s.durumlar.set(g, 'dinlenme');
    } else {
      s.seri = 0;
      s.hak = SERI.baslangicHak;
      s.aktifSayac = 0;
      dinlenmeVar = false;
      s.durumlar.set(g, 'bos');
    }
  }
  return s;
}

// ---------- XP ve seviye (saf) ----------
export function xpHesapla(kayit) {
  const sn = sayi(kayit?.sureSn) ?? 0;
  let xp = sn >= XP.kisaTurSn ? XP.tur : XP.kisaTur;
  xp += Math.min(XP.enCokDakika, Math.floor(sn / 60)) * XP.dakika;
  if ((sayi(kayit?.anlamaYuzde) ?? -1) >= XP.anlamaEsigi) xp += XP.anlama;
  return xp;
}

/** n. seviyenin başladığı toplam XP: 1→0, 2→100, 3→250, 4→450, 5→700 … */
export function seviyeEsigi(n) { return 25 * (n - 1) * (n + 2); }

export function seviyeBilgisi(xp = 0) {
  let n = 1;
  while (seviyeEsigi(n + 1) <= xp) n += 1;
  const alt = seviyeEsigi(n);
  const ust = seviyeEsigi(n + 1);
  return {
    seviye: n, unvan: UNVANLAR.find(([s]) => n >= s)[1], xp, alt, ust,
    kalan: ust - xp, yuzde: Math.round(((xp - alt) * 100) / (ust - alt)),
  };
}

// ---------- Rozetler (20) ----------
const okumaAnlamalari = (b) => b.kayitlar.filter((k) => k.modul === 'oku' && sayi(k.anlamaYuzde) !== undefined);
const ort = (dizi) => dizi.reduce((t, v) => t + v, 0) / dizi.length;

export const ROZETLER = Object.freeze([
  { id: 'ilk-isik', ad: 'İlk Işık', ikon: 'isik', olcut: 'İlk çalışmanı tamamla.', kontrol: (b) => b.toplamOturum >= 1 },
  { id: 'kivilcim', ad: 'Kıvılcım', ikon: 'alev', olcut: 'Serin 3 güne ulaşsın.', kontrol: (b) => b.seri.enUzun >= 3 },
  { id: 'haftanin-feneri', ad: 'Haftanın Feneri', ikon: 'yildiz', olcut: 'Serin 7 güne ulaşsın.', kontrol: (b) => b.seri.enUzun >= 7 },
  { id: 'sabirli-dalga', ad: 'Sabırlı Dalga', ikon: 'yenile', olcut: 'Serin 14 güne ulaşsın.', kontrol: (b) => b.seri.enUzun >= 14 },
  { id: 'uzun-yol', ad: 'Uzun Yol', ikon: 'harita', olcut: 'Serin 30 güne ulaşsın.', kontrol: (b) => b.seri.enUzun >= 30 },
  { id: 'dinlenmeyi-bilen', ad: 'Dinlenmeyi Bilen', ikon: 'ay', olcut: 'Bir dinlenme gününden sonra çalışmaya dön; serin sürsün.', kontrol: (b) => b.seri.dinlenmeSonrasiDevam >= 1 },
  { id: 'gunun-hedefi', ad: 'Günün Hedefi', ikon: 'saat', olcut: 'Günlük hedefini ilk kez tamamla.', kontrol: (b) => b.hedefGun >= 1 },
  { id: 'duzenli-rota', ad: 'Düzenli Rota', ikon: 'onay', olcut: 'Günlük hedefini 10 farklı günde tamamla.', kontrol: (b) => b.hedefGun >= 10 },
  { id: 'kasif', ad: 'Kâşif', ikon: 'arama', olcut: '5 farklı egzersiz dene.', kontrol: (b) => b.egzersizler.size >= 5 },
  { id: 'dort-yon', ad: 'Dört Yön', ikon: 'pusula', olcut: 'Okuma, Göz ve Algı, Dikkat ve Hafıza alanlarının her birinde çalış.', kontrol: (b) => ANA_ALANLAR.every((m) => b.moduller.has(m)) },
  { id: 'dikkatli-okur', ad: 'Dikkatli Okur', ikon: 'kitap', olcut: 'Bir okumada anlama sorularında %70 ya da üstü al.', kontrol: (b) => okumaAnlamalari(b).some((k) => k.anlamaYuzde >= 70) },
  { id: 'tam-anlama', ad: 'Tam Anlama', ikon: 'test', olcut: 'Bir okumada soruların hepsini doğru yanıtla.', kontrol: (b) => okumaAnlamalari(b).some((k) => k.anlamaYuzde >= 100) },
  { id: 'akici-adim', ad: 'Akıcı Adım', ikon: 'satirlar', olcut: 'Son 3 okumanın etkin okuma hızı ortalaması ilk 3 okumanınkinden en az %10 yüksek olsun.',
    kontrol: (b) => {
      const e = b.kayitlar.map((k) => sayi(k.eoh)).filter((v) => v !== undefined && v > 0);
      return e.length >= 6 && ort(e.slice(-3)) >= ort(e.slice(0, 3)) * 1.1;
    } },
  { id: 'tarama-ustasi', ad: 'Tarama Ustası', ikon: 'izgara', olcut: 'Sayı tablosunu (Schulte) 5×5 ya da daha büyük boyutta tamamla.', kontrol: (b) => b.kayitlar.some((k) => k.egzersiz === 'schulte' && (sayi(k.zorluk) ?? 0) >= 3) },
  { id: 'keskin-dikkat', ad: 'Keskin Dikkat', ikon: 'hedef', olcut: 'Bir dikkat oyununda en az 15 denemede %90 ya da üstü doğruluk yakala.',
    kontrol: (b) => b.kayitlar.some((k) => k.modul === 'dikkat' && (dikkatIsabet(k) ?? 0) >= 90
      && (sayi(k.ekstra?.deneme) ?? (sayi(k.dogru) ?? 0) + (sayi(k.yanlis) ?? 0)) >= 15) },
  { id: 'odak-bekcisi', ad: 'Odak Bekçisi', ikon: 'goz', olcut: '5 dikkat oyununun hepsini en az bir kez oyna.', kontrol: (b) => DIKKAT_OYUNLARI.every((e) => b.egzersizler.has(e)) },
  { id: 'hafiza-zinciri', ad: 'Hafıza Zinciri', ikon: 'rakam-dizi', olcut: 'Rakam Dizisi’nde 6 ya da daha uzun bir diziyi hatırla.', kontrol: (b) => b.kayitlar.some((k) => k.egzersiz === 'rakam-dizisi' && (hafizaDuzey(k) ?? 0) >= 6) },
  { id: 'blok-mimari', ad: 'Blok Mimarı', ikon: 'bloklar', olcut: 'Işıklı Bloklar’da 5 ya da daha uzun bir sırayı hatırla.', kontrol: (b) => b.kayitlar.some((k) => k.egzersiz === 'corsi-bloklari' && (hafizaDuzey(k) ?? 0) >= 5) },
  { id: 'teknik-ciragi', ad: 'Teknik Çırağı', ikon: 'akademi', olcut: 'Bir Hafıza Teknikleri dersini tamamla.', kontrol: (b) => b.kayitlar.some((k) => k.egzersiz.startsWith('teknik-')) },
  { id: 'isik-yolcusu', ad: 'Işık Yolcusu', ikon: 'gunes', olcut: '5. seviyeye ulaş.', kontrol: (b) => seviyeBilgisi(b.veri.xp).seviye >= 5 },
]);
const ROZET_IDLERI = new Set(ROZETLER.map((r) => r.id));

// ---------- Veri ----------
function bosVeri(hedef = VARSAYILAN_HEDEF_DK) {
  return { surum: ILERLEME_SURUMU, gunlukHedefDk: hedef, xp: 0, gunler: {}, rozetler: {} };
}

function veriDuzelt(v) {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
  const sonuc = bosVeri(HEDEF_SECENEKLERI.includes(v.gunlukHedefDk) ? v.gunlukHedefDk : VARSAYILAN_HEDEF_DK);
  sonuc.xp = Math.max(0, Math.round(sayi(v.xp) ?? 0));
  if (v.gunler && typeof v.gunler === 'object') {
    for (const [g, d] of Object.entries(v.gunler)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(g) || !d || typeof d !== 'object') continue;
      sonuc.gunler[g] = { sn: Math.max(0, sayi(d.sn) ?? 0), kayit: Math.max(0, sayi(d.kayit) ?? 0), xp: Math.max(0, sayi(d.xp) ?? 0) };
      if (d.hedef === true) sonuc.gunler[g].hedef = true;
    }
  }
  if (v.rozetler && typeof v.rozetler === 'object') {
    for (const [id, t] of Object.entries(v.rozetler)) if (ROZET_IDLERI.has(id) && typeof t === 'string') sonuc.rozetler[id] = t;
  }
  return sonuc;
}

function pidBul(profilId) { return profilId ?? etkinProfil()?.id ?? null; }

function veriYaz(pid, veri) {
  const gunler = Object.keys(veri.gunler).sort();
  if (gunler.length > EN_COK_GUN) gunler.slice(0, gunler.length - EN_COK_GUN).forEach((g) => { delete veri.gunler[g]; });
  return yaz(ONEK + pid, veri);
}

// Bir kaydı güne işler: süre, kayıt sayısı, XP (günlük sınırlı), hedef bonusu
function gunIsle(veri, kayit) {
  const g = gunAnahtari(kayit.tarih);
  const gun = (veri.gunler[g] ??= { sn: 0, kayit: 0, xp: 0 });
  gun.sn += Math.max(0, sayi(kayit.sureSn) ?? 0);
  gun.kayit += 1;
  let ham = xpHesapla(kayit);
  let hedefYeni = false;
  if (!gun.hedef && gun.sn >= veri.gunlukHedefDk * 60) { gun.hedef = true; hedefYeni = true; ham += XP.hedefBonusu; }
  const xp = Math.max(0, Math.min(ham, XP.gunlukSinir - gun.xp));
  gun.xp += xp;
  veri.xp += xp;
  return { xp, hedefYeni, xpSinirDoldu: gun.xp >= XP.gunlukSinir };
}

function aktifGunler(veri) {
  return new Set(Object.entries(veri.gunler).filter(([, d]) => d.kayit > 0).map(([g]) => g));
}

function baglam(veri, kayitlar, bugun) {
  const gunler = Object.values(veri.gunler);
  return {
    veri, kayitlar,
    seri: seriHesapla(aktifGunler(veri), bugun),
    toplamOturum: gunler.reduce((t, d) => t + d.kayit, 0),
    hedefGun: gunler.filter((d) => d.hedef).length,
    egzersizler: new Set(kayitlar.map((k) => k.egzersiz)),
    moduller: new Set(kayitlar.map((k) => k.modul)),
  };
}

// Kazanılmamış rozetleri denetler; kazanılanları tarihle işler ve döndürür
function rozetleriDenetle(veri, kayitlar, bugun) {
  const b = baglam(veri, kayitlar, bugun);
  const yeni = [];
  for (const r of ROZETLER) {
    if (veri.rozetler[r.id]) continue;
    let tamam = false;
    try { tamam = !!r.kontrol(b); } catch (h) { console.error('[rozet]', r.id, h); }
    if (tamam) { veri.rozetler[r.id] = bugun; yeni.push(r); }
  }
  return yeni;
}

// S20 öncesi kayıtlar ya da yeni yüklenen yedek: veri metrics kayıtlarından bir kez kurulur
function kayitlardanKur(pid, haricId, hedef) {
  const veri = bosVeri(hedef);
  const kayitlar = kayitlariGetir(pid).filter((k) => k.id !== haricId).sort((a, b) => a.tarih.localeCompare(b.tarih));
  kayitlar.forEach((k) => gunIsle(veri, k));
  rozetleriDenetle(veri, kayitlar, bugunAnahtari());
  return veri;
}

/** Profilin ilerleme verisi (yoksa kayıtlardan kurulur ve yazılır) */
export function ilerlemeVerisi(profilId) {
  const pid = pidBul(profilId);
  if (!pid) return bosVeri();
  let veri = veriDuzelt(oku(ONEK + pid));
  if (!veri) { veri = kayitlardanKur(pid); veriYaz(pid, veri); }
  return veri;
}

export function gunlukHedefAyarla(dk, profilId) {
  const pid = pidBul(profilId);
  if (!pid || !HEDEF_SECENEKLERI.includes(dk)) return false;
  const veri = ilerlemeVerisi(pid);
  veri.gunlukHedefDk = dk;
  return veriYaz(pid, veri);
}

function bugunHesapla(veri, bugun) {
  const g = veri.gunler[bugun] ?? { sn: 0, kayit: 0, xp: 0 };
  const hedefDk = veri.gunlukHedefDk;
  const yeterDk = Math.max(hedefDk * YETER.katsayi, YETER.enAzDk);
  return {
    bugun, sn: g.sn, dk: Math.floor(g.sn / 60), kayit: g.kayit, hedefDk, yeterDk,
    yuzde: Math.min(100, Math.round((g.sn * 100) / (hedefDk * 60))),
    hedefTamam: g.sn >= hedefDk * 60, uzun: g.sn >= yeterDk * 60,
    xp: g.xp, xpSinirDoldu: g.xp >= XP.gunlukSinir,
  };
}

export function bugunDurumu(profilId) { return bugunHesapla(ilerlemeVerisi(profilId), bugunAnahtari()); }
export function seriDurumu(profilId) { return seriHesapla(aktifGunler(ilerlemeVerisi(profilId)), bugunAnahtari()); }

/** Rozet listesi: [{ ...tanım, kazanildi: 'YYYY-AA-GG' | null }] */
export function rozetDurumu(profilId) {
  const veri = ilerlemeVerisi(profilId);
  return ROZETLER.map((r) => ({ id: r.id, ad: r.ad, ikon: r.ikon, olcut: r.olcut, kazanildi: veri.rozetler[r.id] ?? null }));
}

/** Günlük süre mesajı: uzun çalışmada “bugünlük yeter”, hedef dolunca kutlama + yeter (kurs dersinde yalnız uzun çalışma uyarısı) */
export function bugunlukMesaji(d, { kurs = false } = {}) {
  if (!d) return null;
  if (d.uzun) {
    return { tur: 'uyari', baslik: 'Bugünlük yeter',
      metin: `Bugün ${d.dk} dakika çalıştın; bu, günlük hedefinin epey üstünde. Şimdi ara verme zamanı. Dinlenmek de öğrenmenin bir parçası, yarın devam edersin.` };
  }
  if (d.hedefTamam && !kurs) {
    return { tur: 'basari', baslik: 'Bugünkü hedefin tamam',
      metin: `${d.hedefDk} dakikalık hedefine ulaştın. Bugünlük yeter diyebilirsin; istersen kısa bir tur daha yap, ama şart değil.` };
  }
  return null;
}

/** “Sonuçları sil”: XP, seri günleri ve rozetler silinir; günlük hedef seçimi kalır */
export function ilerlemeSonuclariniSil(profilId) {
  const pid = pidBul(profilId);
  if (!pid) return false;
  const eski = veriDuzelt(oku(ONEK + pid));
  return yaz(ONEK + pid, bosVeri(eski?.gunlukHedefDk));
}

// ---------- Kayıt eklenince: XP, rozet, günlük durum (çerçeve sonucu kazanimAl ile okur) ----------
const kazanimlar = new Map();

function kayitIsle(kayit) {
  const pid = kayit?.profilId;
  if (!pid || typeof kayit.tarih !== 'string') return null;
  const okunan = veriDuzelt(oku(ONEK + pid));
  const veri = okunan ?? kayitlardanKur(pid, kayit.id);
  const onceki = seviyeBilgisi(veri.xp).seviye;
  const g = gunIsle(veri, kayit);
  const bugun = bugunAnahtari();
  const yeniRozetler = rozetleriDenetle(veri, kayitlariGetir(pid), bugun);
  veriYaz(pid, veri);
  const seviye = seviyeBilgisi(veri.xp);
  return {
    xp: g.xp, hedefYeni: g.hedefYeni, xpSinirDoldu: g.xpSinirDoldu, seviye, seviyeAtladi: seviye.seviye > onceki,
    yeniRozetler: yeniRozetler.map((r) => ({ id: r.id, ad: r.ad, ikon: r.ikon })),
    bugun: bugunHesapla(veri, bugun),
  };
}

dinle(OLAYLAR.KAYIT_EKLENDI, (kayit) => {
  try {
    const k = kayitIsle(kayit);
    if (!k) return;
    kazanimlar.set(kayit.id, k);
    if (kazanimlar.size > 20) kazanimlar.delete(kazanimlar.keys().next().value);
  } catch (h) { console.error('[motivasyon]', h); }
});

/** Kaydın kazanımı (bir kez okunur): { xp, hedefYeni, xpSinirDoldu, seviye, seviyeAtladi, yeniRozetler, bugun } | null */
export function kazanimAl(kayitId) {
  const k = kazanimlar.get(kayitId) ?? null;
  kazanimlar.delete(kayitId);
  return k;
}
