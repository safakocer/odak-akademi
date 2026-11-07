// Sınıf düzeyleri tek kaynak (S34a): 2-8. sınıf, kademeler (ilkokul/ortaokul), sınıf aralığı denetimi ve sınıf bantları (data/sinif-bantlari.json; okuma bantları, S34d: seviye testi okuma hızı ölçeği)
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
    okuma: Object.freeze({ varsayilanWpm: null, modlar: Object.freeze(['rehber', 'serbest']), kademeli: true }),
    test: Object.freeze({ olcekWpm: null }),
  }),
});

let bantlar = null; // { surum, siniflar: { '2': { okuma } … } }
let soz = null;

// Bir sınıfın okuma bandını şemaya uydurur; hatalı alan yok sayılır
function okumaDuzelt(o) {
  if (!o || typeof o !== 'object') return null;
  const wpm = Number(o.varsayilanWpm);
  const modlar = Array.isArray(o.modlar) ? o.modlar.filter((m) => OKUMA_MODLARI.includes(m)) : null;
  return Object.freeze({
    varsayilanWpm: Number.isFinite(wpm) && wpm >= 30 && wpm <= 500 ? Math.round(wpm) : null,
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

/** Bant dosyasını bir kez yükler (açılışta app.js başlatır; okuma ekranları ve kurs bekler). Döner: Promise<true|false> */
export function bantlariYukle() {
  soz ??= fetch(BANT_ADRESI)
    .then((y) => { if (!y.ok) throw new Error(`HTTP ${y.status}`); return y.json(); })
    .then((veri) => {
      const siniflar = {};
      for (const s of SINIFLAR) {
        const b = veri?.siniflar?.[String(s)];
        if (b && typeof b === 'object') siniflar[String(s)] = Object.freeze({ okuma: okumaDuzelt(b.okuma), test: testDuzelt(b.test) });
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

/** Sınıfın bandı: { okuma: { varsayilanWpm|null, modlar|null, kademeli }, test: { olcekWpm|null } (S34d) } ya da null (geçersiz sınıf / bant yok) */
export function sinifBandi(sinif) {
  if (!sinifGecerliMi(sinif)) return null;
  return bantlar?.siniflar?.[String(Number(sinif))] ?? YEDEK[kademe(sinif)] ?? null;
}

/** Kısayol: okuma bandı ya da null */
export const okumaBandi = (sinif) => sinifBandi(sinif)?.okuma ?? null;
/** S34d: seviye testi bandı ({ olcekWpm|null }) ya da null */
export const testBandi = (sinif) => sinifBandi(sinif)?.test ?? null;
