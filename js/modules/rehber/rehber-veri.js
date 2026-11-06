// Çalışma Rehberi verisi (S22): Cornell notları, zihin haritaları ve haftalık ders planı; profil başına calisma:<profilId> anahtarında (storage.js üzerinden)
import { oku, yaz } from '../../core/storage.js';
import { etkinProfil } from '../../core/store.js';
import { profilBul } from '../../core/profile.js';
import { kimlikUret, boslukTemizle, gunAnahtari } from '../../core/utils.js';

const SURUM = 1;
export const SINIR = Object.freeze({
  not: 50, notBaslik: 60, notDers: 40, ipucu: 1500, notMetni: 5000, ozet: 1000,
  harita: 20, haritaAdi: 40, dugum: 60, dugumMetni: 40,
  blok: 6, ders: 40,
});
export const GUNLER = Object.freeze([
  { ad: 'pzt', etiket: 'Pazartesi' }, { ad: 'sal', etiket: 'Salı' }, { ad: 'car', etiket: 'Çarşamba' },
  { ad: 'per', etiket: 'Perşembe' }, { ad: 'cum', etiket: 'Cuma' },
  { ad: 'cmt', etiket: 'Cumartesi', haftaSonu: true }, { ad: 'paz', etiket: 'Pazar', haftaSonu: true },
].map(Object.freeze));
export const BLOK_SURELERI = Object.freeze([10, 15, 20, 25, 30, 40, 45]);
export const MOLA_SURELERI = Object.freeze([5, 10, 15]);
export const VARSAYILAN_BLOK_DK = 25;
/** Zihin haritası çizim alanı (SVG birimi); ana konu ortada */
export const DUNYA = Object.freeze({ g: 1000, y: 700 });
export const KOK_ID = 'kok';

const anahtar = (id) => `calisma:${id}`;
const kirp = (s, n) => [...String(s ?? '')].slice(0, n).join('');
const tekSatir = (s, n) => kirp(boslukTemizle(s), n);
const sayiMi = (v) => typeof v === 'number' && Number.isFinite(v);
const tarihMi = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
const sinirla = (v, en, enCok) => Math.min(enCok, Math.max(en, v));
const simdi = () => new Date().toISOString();

// ---------- Şemaya uydurma (yedekten gelen bozuk veri de güvenle okunur) ----------
function notDuzelt(n) {
  if (!n || typeof n !== 'object' || typeof n.id !== 'string') return null;
  return {
    id: n.id,
    baslik: tekSatir(n.baslik, SINIR.notBaslik),
    ders: tekSatir(n.ders, SINIR.notDers),
    tarih: tarihMi(n.tarih) ? n.tarih : '',
    ipuclari: kirp(n.ipuclari, SINIR.ipucu),
    notlar: kirp(n.notlar, SINIR.notMetni),
    ozet: kirp(n.ozet, SINIR.ozet),
    olusturma: typeof n.olusturma === 'string' ? n.olusturma : simdi(),
    guncelleme: typeof n.guncelleme === 'string' ? n.guncelleme : simdi(),
  };
}

function dugumDuzelt(d) {
  if (!d || typeof d !== 'object' || typeof d.id !== 'string') return null;
  return {
    id: d.id,
    metin: tekSatir(d.metin, SINIR.dugumMetni),
    x: sinirla(sayiMi(d.x) ? Math.round(d.x) : DUNYA.g / 2, 0, DUNYA.g),
    y: sinirla(sayiMi(d.y) ? Math.round(d.y) : DUNYA.y / 2, 0, DUNYA.y),
    ust: typeof d.ust === 'string' ? d.ust : null,
  };
}

// Kök başta; üstü bulunmayan (yetim) düğümler atılır
function haritaDuzelt(h) {
  if (!h || typeof h !== 'object' || typeof h.id !== 'string') return null;
  const ham = (Array.isArray(h.dugumler) ? h.dugumler : []).map(dugumDuzelt).filter(Boolean).slice(0, SINIR.dugum);
  let kok = ham.find((d) => d.id === KOK_ID);
  if (!kok) kok = { id: KOK_ID, metin: 'Ana konu', x: DUNYA.g / 2, y: DUNYA.y / 2, ust: null };
  kok = { ...kok, ust: null, metin: kok.metin || 'Ana konu' };
  const dugumler = [kok];
  const bilinen = new Set([KOK_ID]);
  let degisti = true;
  while (degisti) {
    degisti = false;
    for (const d of ham) {
      if (!bilinen.has(d.id) && bilinen.has(d.ust)) { dugumler.push(d); bilinen.add(d.id); degisti = true; }
    }
  }
  return {
    id: h.id,
    ad: tekSatir(h.ad, SINIR.haritaAdi) || 'Adsız harita',
    dugumler,
    olusturma: typeof h.olusturma === 'string' ? h.olusturma : simdi(),
    guncelleme: typeof h.guncelleme === 'string' ? h.guncelleme : simdi(),
  };
}

function bosPlan() {
  return { molaDk: 5, haftaSonuEsnek: true, gunler: Object.fromEntries(GUNLER.map((g) => [g.ad, []])), guncelleme: null };
}

function planDuzelt(p) {
  const plan = bosPlan();
  if (!p || typeof p !== 'object') return plan;
  if (MOLA_SURELERI.includes(p.molaDk)) plan.molaDk = p.molaDk;
  if (typeof p.haftaSonuEsnek === 'boolean') plan.haftaSonuEsnek = p.haftaSonuEsnek;
  for (const g of GUNLER) {
    const liste = Array.isArray(p.gunler?.[g.ad]) ? p.gunler[g.ad] : [];
    plan.gunler[g.ad] = liste.filter((b) => b && typeof b === 'object').slice(0, SINIR.blok).map((b) => ({
      id: typeof b.id === 'string' ? b.id : kimlikUret(),
      ders: tekSatir(b.ders, SINIR.ders),
      dk: BLOK_SURELERI.includes(b.dk) ? b.dk : VARSAYILAN_BLOK_DK,
    }));
  }
  plan.guncelleme = typeof p.guncelleme === 'string' ? p.guncelleme : null;
  return plan;
}

function veriDuzelt(v) {
  const o = v && typeof v === 'object' ? v : {};
  return {
    surum: SURUM,
    notlar: (Array.isArray(o.notlar) ? o.notlar : []).map(notDuzelt).filter(Boolean).slice(0, SINIR.not),
    haritalar: (Array.isArray(o.haritalar) ? o.haritalar : []).map(haritaDuzelt).filter(Boolean).slice(0, SINIR.harita),
    plan: planDuzelt(o.plan),
  };
}

// ---------- Okuma / yazma ----------
/** Etkin (ya da verilen) profilin rehber verisi: { surum, notlar[], haritalar[], plan } */
export function calismaVerisi(profilId = etkinProfil()?.id) {
  return veriDuzelt(profilId ? oku(anahtar(profilId)) : null);
}

// fn(veri) veriyi değiştirir; dönüşü sonuç alanlarına eklenir. Döner: { tamam, ... } | { tamam:false, hata }
// profilId: açık sayfanın profili (profil değişirken bekleyen kayıt yeni profile yazılmasın; silinmiş profil yeniden oluşmasın)
function guncelle(fn, profilId = etkinProfil()?.id) {
  const p = profilId ? profilBul(profilId) : null;
  if (!p) return { tamam: false, hata: 'Önce bir profil oluştur.' };
  const veri = calismaVerisi(p.id);
  const ek = fn(veri);
  if (ek?.hata) return { tamam: false, hata: ek.hata };
  if (!yaz(anahtar(p.id), veri)) return { tamam: false, hata: 'Kaydedilemedi. Cihazda yer açıp yeniden dene.' };
  return { tamam: true, ...ek };
}

// ---------- Cornell notları ----------
export function notBul(id) {
  return calismaVerisi().notlar.find((n) => n.id === id) ?? null;
}

export function notOlustur() {
  return guncelle((v) => {
    if (v.notlar.length >= SINIR.not) return { hata: `En fazla ${SINIR.not} not saklanabilir. Eski bir notu silip yeniden dene.` };
    const n = notDuzelt({ id: kimlikUret(), tarih: gunAnahtari() });
    v.notlar.unshift(n);
    return { not: n };
  });
}

/** parca: { baslik?, ders?, tarih?, ipuclari?, notlar?, ozet? } */
export function notGuncelle(id, parca, profilId) {
  return guncelle((v) => {
    const i = v.notlar.findIndex((n) => n.id === id);
    if (i < 0) return { hata: 'Not bulunamadı.' };
    v.notlar[i] = notDuzelt({ ...v.notlar[i], ...parca, id, guncelleme: simdi() });
    return { not: v.notlar[i] };
  }, profilId);
}

export function notSil(id) {
  return guncelle((v) => { v.notlar = v.notlar.filter((n) => n.id !== id); });
}

// ---------- Zihin haritaları ----------
export function haritaBul(id) {
  return calismaVerisi().haritalar.find((h) => h.id === id) ?? null;
}

export function haritaOlustur() {
  return guncelle((v) => {
    if (v.haritalar.length >= SINIR.harita) return { hata: `En fazla ${SINIR.harita} harita saklanabilir. Eski bir haritayı silip yeniden dene.` };
    const h = haritaDuzelt({ id: kimlikUret(), ad: 'Yeni harita', dugumler: [] });
    v.haritalar.unshift(h);
    return { harita: h };
  });
}

/** Haritanın tamamını yazar (ad ve düğümler) */
export function haritaKaydet(harita, profilId) {
  return guncelle((v) => {
    const i = v.haritalar.findIndex((h) => h.id === harita.id);
    if (i < 0) return { hata: 'Harita bulunamadı.' };
    v.haritalar[i] = haritaDuzelt({ ...harita, olusturma: v.haritalar[i].olusturma, guncelleme: simdi() });
    return { harita: v.haritalar[i] };
  }, profilId);
}

export function haritaSil(id) {
  return guncelle((v) => { v.haritalar = v.haritalar.filter((h) => h.id !== id); });
}

// ---------- Haftalık plan ----------
export function planKaydet(plan, profilId) {
  return guncelle((v) => {
    v.plan = planDuzelt({ ...plan, guncelleme: simdi() });
    return { plan: v.plan };
  }, profilId);
}

export const planBosMu = (plan) => GUNLER.every((g) => !plan.gunler[g.ad].length);
export const yeniBlok = (ders = '', dk = VARSAYILAN_BLOK_DK) => ({ id: kimlikUret(), ders, dk });

/** Örnek plan: hafta içi kısa iki blok, cumartesi tek blok, pazar boş (8. sınıfta Sosyal yerine İnkılap Tarihi) */
export function ornekPlan(sinif = etkinProfil()?.sinif) {
  const sosyal = sinif === 8 ? 'T.C. İnkılap Tarihi' : 'Sosyal Bilgiler';
  const plan = bosPlan();
  const gun = (ad, ...bloklar) => { plan.gunler[ad] = bloklar.map(([d, dk]) => yeniBlok(d, dk)); };
  gun('pzt', ['Türkçe', 25], ['Matematik', 25]);
  gun('sal', ['Fen Bilimleri', 25], ['İngilizce', 20]);
  gun('car', ['Matematik', 25], ['Kitap okuma', 20]);
  gun('per', [sosyal, 25], ['Türkçe', 25]);
  gun('cum', ['Haftanın tekrarı', 25]);
  gun('cmt', ['Kitap okuma', 20]);
  return plan;
}

/** Bir günün özeti: { blok, dk, molaDk } (mola: bloklar arası) */
export function gunToplami(plan, ad) {
  const bloklar = plan.gunler[ad] ?? [];
  return { blok: bloklar.length, dk: bloklar.reduce((t, b) => t + b.dk, 0), molaDk: Math.max(0, bloklar.length - 1) * plan.molaDk };
}
