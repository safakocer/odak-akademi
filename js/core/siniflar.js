// Sınıf düzeyleri tek kaynak (S34a): 2-8. sınıf, kademeler (ilkokul/ortaokul), sınıf aralığı denetimi ve sınıf bantları (data/sinif-bantlari.json; okuma bantları, S34d: seviye testi okuma hızı ölçeği, S34e: egzersiz bantları; S34-son: kademe egzersiz bantları, okuma üst hızı)
// Sınıfa göre değişen değerler koda değil bant dosyasına yazılır (S36 yönetim paneli düzenleyebilsin diye). Bu dosya başka modül içe aktarmaz.

export const SINIFLAR = Object.freeze([2, 3, 4, 5, 6, 7, 8]);
export const KADEMELER = Object.freeze({
  ilkokul: Object.freeze([2, 3, 4]),
  ortaokul: Object.freeze([5, 6, 7, 8]),
});
export const KADEME_ETIKETLERI = Object.freeze({ ilkokul: 'İlkokul', ortaokul: 'Ortaokul' });
/** Kartta aralık yazılmamışsa geçerli olan aralık: [en küçük, en büyük] */
export const TUM_ARALIK = Object.freeze([SINIFLAR[0], SINIFLAR[SINIFLAR.length - 1]]);
/** Bozuk kayıtta kullanılan sınıf (S34a öncesi davranış: 5) */
export const VARSAYILAN_SINIF = KADEMELER.ortaokul[0];

export const sinifGecerliMi = (s) => SINIFLAR.includes(Number(s));

/** Sınıfın kademesi: 'ilkokul' | 'ortaokul' | null (geçersiz ya da profil yok) */
export function kademe(sinif) {
  const s = Number(sinif);
  for (const [ad, liste] of Object.entries(KADEMELER)) if (liste.includes(s)) return ad;
  return null;
}

export const ilkokulMu = (sinif) => kademe(sinif) === 'ilkokul';

/** Sınıf [en, enCok] aralığında mı? Sınıf bilinmiyorsa (profil yok) true: her şey görünür */
export function araliktaMi(sinif, aralik = TUM_ARALIK) {
  if (!sinifGecerliMi(sinif)) return true;
  const s = Number(sinif);
  const [en, enCok] = Array.isArray(aralik) ? aralik : TUM_ARALIK;
  return s >= en && s <= enCok;
}

// ---------- Sınıf bantları (data/sinif-bantlari.json) ----------
const BANT_ADRESI = new URL('../../data/sinif-bantlari.json', import.meta.url);
const OKUMA_MODLARI = ['rehber', 'kelime-grubu', 'serbest', 'rsvp'];
// Dosya açılamazsa güvenli yedek: ilkokulda yalnız rehber ve serbest mod (asıl değerler dosyadadır); kademeli hız öğrenci isterse açılır (S34a-d); test ölçeği yoksa test-veri.js’teki sabit ölçek
const YEDEK = Object.freeze({
  ilkokul: Object.freeze({
    okuma: Object.freeze({ varsayilanWpm: null, ustWpm: null, modlar: Object.freeze(['rehber', 'serbest']), kademeli: true }),
    test: Object.freeze({ olcekWpm: null }),
  }),
});

let bantlar = null; // { surum, siniflar: { '2': { okuma } … } }
let soz = null;

// Bir sınıfın okuma bandını şemaya uydurur; hatalı alan yok sayılır. S34-son: ustWpm (okuma ekranlarında en yüksek hız; varsayılandan küçük olamaz)
function okumaDuzelt(o) {
  if (!o || typeof o !== 'object') return null;
  const wpm = Number(o.varsayilanWpm);
  const ust = Number(o.ustWpm);
  const modlar = Array.isArray(o.modlar) ? o.modlar.filter((m) => OKUMA_MODLARI.includes(m)) : null;
  const varsayilanWpm = Number.isFinite(wpm) && wpm >= 30 && wpm <= 500 ? Math.round(wpm) : null;
  return Object.freeze({
    varsayilanWpm,
    ustWpm: Number.isFinite(ust) && ust >= 30 && ust <= 500 && ust >= (varsayilanWpm ?? 30) ? Math.round(ust) : null, // null: üst sınır yok (500)
    modlar: modlar?.length ? Object.freeze(modlar) : null, // null: tüm modlar
    kademeli: o.kademeli !== false,
  });
}

// S34d: seviye testi bandı; olcekWpm [en, enCok] (kelime/dk, 1-500, en < enCok) değilse null
function testDuzelt(t) {
  const o = Array.isArray(t?.olcekWpm) ? t.olcekWpm.map(Number) : null;
  const gecerli = o?.length === 2 && o.every((n) => Number.isFinite(n) && n >= 1 && n <= 500) && o[0] < o[1];
  return Object.freeze({ olcekWpm: gecerli ? Object.freeze(o.map(Math.round)) : null });
}

// ---------- S34e: egzersiz bantları ----------
// Bir egzersizin sınıf bandı: { enCok?, baslangic? (1-5), basamaklar? [≤5 nesne|null] (basamak ayarının üstüne yazılır),
//   yonerge? [1-2 kısa cümle] (açıklama ekranında uzun yönergenin yerine), sureNotu?, alistirma? { deneme?, sureSn?, ayar? },
//   + egzersize özel tek değerler (ör. stroop ipucu, iptal-testi hucre) }. Hatalı alan atılır, gerisi kullanılır.
export const YONERGE_SINIRI = Object.freeze({ cumle: 2, karakter: 60 });
const EGZ_AD = /^[a-z0-9-]+$/;
const nesneMi = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const tamSayi = (v, en, enCok) => (Number.isInteger(v) && v >= en && v <= enCok ? v : undefined);

function alistirmaDuzelt(v) {
  if (v === true) return Object.freeze({});
  if (!nesneMi(v)) return null;
  const a = {};
  const deneme = tamSayi(v.deneme, 1, 20);
  const sureSn = tamSayi(v.sureSn, 5, 60);
  if (deneme) a.deneme = deneme;
  if (sureSn) a.sureSn = sureSn;
  if (nesneMi(v.ayar)) a.ayar = Object.freeze({ ...v.ayar });
  return Object.freeze(a);
}

/** Tek egzersizin bandını şemaya uydurur (saf; tests.html de kullanır) → dondurulmuş nesne ya da null */
export function egzersizBandiDuzelt(e) {
  if (!nesneMi(e)) return null;
  const b = {};
  for (const [k, v] of Object.entries(e)) {
    if (k === 'enCok' || k === 'baslangic') {
      const n = tamSayi(v, 1, 5);
      if (n) b[k] = n;
    } else if (k === 'basamaklar') {
      if (Array.isArray(v)) b.basamaklar = Object.freeze(v.slice(0, 5).map((x) => (nesneMi(x) ? Object.freeze({ ...x }) : null)));
    } else if (k === 'yonerge') {
      const y = Array.isArray(v) ? v.filter((m) => typeof m === 'string' && m.trim() && m.trim().length <= YONERGE_SINIRI.karakter) : [];
      if (y.length) b.yonerge = Object.freeze(y.slice(0, YONERGE_SINIRI.cumle).map((m) => m.trim()));
    } else if (k === 'sureNotu') {
      if (typeof v === 'string' && v.trim()) b.sureNotu = v.trim();
    } else if (k === 'alistirma') {
      const a = alistirmaDuzelt(v);
      if (a) b.alistirma = a;
    } else if (k !== 'aciklama' && ['boolean', 'number', 'string'].includes(typeof v)) {
      b[k] = v; // egzersize özel tek değer
    }
  }
  if (b.baslangic && b.enCok && b.baslangic > b.enCok) b.baslangic = b.enCok;
  return Object.freeze(b);
}

/**
 * S34-son: Bir sınıfın ham egzersiz bantları (saf; tests.html de kullanır): kademe bandı (veri.kademeler.<kademe>.egzersiz) ile sınıf bandı
 * (veri.siniflar.<sınıf>.egzersiz) birleşir; aynı egzersizde sınıfın alanları kademeninkinin üstüne yazılır (sığ, alan alan). Hiç bant yoksa null.
 * Kademe bandı ortak alanlar içindir (ör. ilkokulda kısa yönerge ve alıştırma, ortaokulda yalnız alıştırma turu).
 */
export function egzersizBantlariBirlestir(veri, sinif) {
  const kb = veri?.kademeler?.[kademe(sinif)]?.egzersiz;
  const sb = veri?.siniflar?.[String(Number(sinif))]?.egzersiz;
  const k = nesneMi(kb) ? kb : {};
  const s = nesneMi(sb) ? sb : {};
  const sonuc = {};
  for (const ad of new Set([...Object.keys(k), ...Object.keys(s)])) {
    const a = nesneMi(k[ad]) ? k[ad] : null;
    const b = nesneMi(s[ad]) ? s[ad] : null;
    if (a || b) sonuc[ad] = { ...a, ...b };
  }
  return Object.keys(sonuc).length ? sonuc : null;
}

function egzersizleriDuzelt(o) {
  if (!nesneMi(o)) return null;
  const sonuc = {};
  for (const [ad, e] of Object.entries(o)) {
    const b = EGZ_AD.test(ad) ? egzersizBandiDuzelt(e) : null;
    if (b) sonuc[ad] = b;
  }
  return Object.freeze(sonuc);
}

const ayniTur = (a, b) => (Array.isArray(a) ? Array.isArray(b) : typeof a === typeof b);

/**
 * Egzersizin seviye (basamak) dizisini banda göre uyarlar (saf): basamaklar[i] alanları i. seviyenin üstüne yazılır
 * (ad değişmez; seviyede olan alan aynı türde değilse yok sayılır, olmayan alan eklenir: ör. deneme), dizi enCok’ta kesilir.
 * Bant yoksa dizi aynen döner.
 */
export function seviyeleriUyarla(seviyeler, bant) {
  if (!Array.isArray(seviyeler) || !seviyeler.length || !bant) return seviyeler;
  const liste = seviyeler.map((s, i) => {
    const ek = bant.basamaklar?.[i];
    if (!ek) return s;
    const yeni = { ...s };
    for (const [k, v] of Object.entries(ek)) {
      if (k === 'ad') continue;
      if (k in s && !ayniTur(s[k], v)) { console.warn('[siniflar] Bant alanı türü uymuyor, yok sayıldı:', k); continue; }
      yeni[k] = v;
    }
    return Object.freeze(yeni);
  });
  const enCok = Math.min(liste.length, Math.max(1, bant.enCok ?? liste.length));
  return Object.freeze(liste.slice(0, enCok));
}

/** Bant dosyasını bir kez yükler (açılışta app.js başlatır; okuma ekranları ve kurs bekler). Döner: Promise<true|false> */
export function bantlariYukle() {
  soz ??= fetch(BANT_ADRESI)
    .then((y) => { if (!y.ok) throw new Error(`HTTP ${y.status}`); return y.json(); })
    .then((veri) => {
      const siniflar = {};
      for (const s of SINIFLAR) {
        const b = veri?.siniflar?.[String(s)];
        if (b && typeof b === 'object') siniflar[String(s)] = Object.freeze({ okuma: okumaDuzelt(b.okuma), test: testDuzelt(b.test), egzersiz: egzersizleriDuzelt(egzersizBantlariBirlestir(veri, s)) });
      }
      bantlar = Object.freeze({ surum: Number(veri?.surum) || 1, siniflar: Object.freeze(siniflar) });
      return true;
    })
    .catch((h) => {
      console.warn('[siniflar] Sınıf bantları yüklenemedi; güvenli varsayılanlar kullanılıyor.', h);
      soz = null; // sonraki çağrıda yeniden denensin
      return false;
    });
  return soz;
}

export const bantlarYuklendiMi = () => bantlar !== null;

/** Sınıfın bandı: { okuma: { varsayilanWpm|null, ustWpm|null (S34-son), modlar|null, kademeli }, test: { olcekWpm|null } (S34d), egzersiz: { <ad>: bant }|null (S34e) } ya da null (geçersiz sınıf / bant yok) */
export function sinifBandi(sinif) {
  if (!sinifGecerliMi(sinif)) return null;
  return bantlar?.siniflar?.[String(Number(sinif))] ?? YEDEK[kademe(sinif)] ?? null;
}

/** Kısayol: okuma bandı ya da null */
export const okumaBandi = (sinif) => sinifBandi(sinif)?.okuma ?? null;
/** S34d: seviye testi bandı ({ olcekWpm|null }) ya da null */
export const testBandi = (sinif) => sinifBandi(sinif)?.test ?? null;
/** S34e: Bir egzersizin sınıf bandı (egzersizBandiDuzelt şeması; S34-son: kademe bandıyla birleşmiş) ya da null (bant yok: egzersiz kendi ayarlarıyla çalışır). Sınıfı çağıran verir (bu dosya profil okumaz) */
export const egzersizBandi = (egzersiz, sinif) => sinifBandi(sinif)?.egzersiz?.[egzersiz] ?? null;
