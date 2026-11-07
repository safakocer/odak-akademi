// Kelime havuzu (S34c): data/kelimeler.json'u bir kez yükler, etkin profilin sınıfına uygun kategorileri verir (kategori sinif [en, enCok]; yoksa 2-8). Hafıza ve flaş egzersizleri ortak kullanır
import { trKucuk } from '../core/utils.js';
import { etkinProfil } from '../core/store.js';
import { araliktaMi, TUM_ARALIK } from '../core/siniflar.js';

const VERI_ADRESI = new URL('../../data/kelimeler.json', import.meta.url);
/** Bir sınıfta en az bu kadar kelime görünmezse havuz “yetersiz” sayılır (Kelime Listesi 10 kelimelik listeye çeldiricilerle çıkar) */
export const EN_AZ_KELIME = 40;
const KELIME_DESENI = /^\p{Ll}{2,14}$/u; // tek kelime, küçük harf

let hamKategoriler = null; // [{ ad, sinif: [en, enCok], kelimeler: [] }]
let soz = null;
const sinifOnbellegi = new Map(); // sınıf → donmuş kategori listesi

// Tekrar denetimi için sade biçim: Türkçe harfler ve şapka farkı sayılmaz (kar = kâr, kir = kır)
const sadelestir = (w) => trKucuk(w).normalize('NFD').replace(/\p{M}/gu, '').replace(/ı/g, 'i');

function aralikOku(a) {
  return Array.isArray(a) && a.length === 2 && a.every(Number.isInteger) && a[0] <= a[1] ? Object.freeze([a[0], a[1]]) : TUM_ARALIK;
}

/** Havuzu bir kez yükler. Döner: Promise<true|false> (yüklenemezse sonraki çağrıda yeniden denenir) */
export function kelimeHavuzuYukle() {
  soz ??= fetch(VERI_ADRESI)
    .then((y) => { if (!y.ok) throw new Error(`kelimeler.json: HTTP ${y.status}`); return y.json(); })
    .then((veri) => {
      hamKategoriler = (Array.isArray(veri?.kategoriler) ? veri.kategoriler : []).map((k) => Object.freeze({
        ad: String(k?.ad ?? ''),
        sinif: aralikOku(k?.sinif),
        kelimeler: Object.freeze((Array.isArray(k?.kelimeler) ? k.kelimeler : [])
          .map((w) => trKucuk(String(w ?? '').normalize('NFC').trim()))
          .filter((w) => KELIME_DESENI.test(w))),
      }));
      sinifOnbellegi.clear();
      return true;
    })
    .catch((h) => {
      console.warn('[kelime-havuzu] Kelime havuzu yüklenemedi:', h);
      soz = null;
      return false;
    });
  return soz;
}

export const kelimeHavuzuYuklendiMi = () => hamKategoriler !== null;

/**
 * Sınıfa uygun kategoriler: [{ ad, kelimeler }] (en az 4 kelimeli). Sınıf verilmezse etkin profilin sınıfı; profil yoksa hepsi.
 * Aynı listede bir kelime yalnız bir kez bulunur (önce gelen kategori alır). Havuz yüklenmemişse boş dizi.
 */
export function sinifKategorileri(sinif = etkinProfil()?.sinif) {
  if (!hamKategoriler) return Object.freeze([]);
  const anahtar = String(sinif ?? '');
  if (sinifOnbellegi.has(anahtar)) return sinifOnbellegi.get(anahtar);
  const gorulen = new Set();
  const liste = hamKategoriler.filter((k) => araliktaMi(sinif, k.sinif)).map((k) => Object.freeze({
    ad: k.ad,
    kelimeler: Object.freeze(k.kelimeler.filter((w) => {
      const s = sadelestir(w);
      if (gorulen.has(s)) return false;
      gorulen.add(s);
      return true;
    })),
  })).filter((k) => k.kelimeler.length >= 4);
  const sonuc = Object.freeze(liste);
  sinifOnbellegi.set(anahtar, sonuc);
  return sonuc;
}

/** Sınıfa uygun bütün kelimeler (düz liste). harf: [en, enCok] verilirse harf sayısına göre süzülür */
export function sinifKelimeleri(sinif = etkinProfil()?.sinif, harf = null) {
  const hepsi = sinifKategorileri(sinif).flatMap((k) => k.kelimeler);
  if (!Array.isArray(harf)) return hepsi;
  return hepsi.filter((w) => [...w].length >= harf[0] && [...w].length <= harf[1]);
}

/** Sınıfta yeterli kelime var mı (egzersizin hazırlık denetimi için) */
export function havuzYeterliMi(sinif = etkinProfil()?.sinif, enAz = EN_AZ_KELIME) {
  return sinifKelimeleri(sinif).length >= enAz;
}
