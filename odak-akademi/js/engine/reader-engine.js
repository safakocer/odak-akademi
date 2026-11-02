// Okuma motoru: Türkçe metin ön işleme, kelime/karakter gruplama, rAF zamanlayıcı, WPM ölçümü, kademeli hız kuralları, okuma ayarları ve okuma alanı
import { kelimelereBol, kelimeGruplari, karakterSayisi, boslukTemizle, sinirla, sayi } from '../core/utils.js';
import { oku, yazmaDene, sil, depoUyar } from '../core/storage.js';
import { dinle, OLAYLAR, etkinProfil } from '../core/store.js';
import { hareketAzaltilmisMi } from '../core/a11y.js';
import { el } from '../core/ui.js';

// ---------- Sabitler ----------
export const WPM_SINIR = Object.freeze({ en: 60, enCok: 500, adim: 10 });
export const GRUP_SINIR = Object.freeze({
  kelime: Object.freeze({ en: 1, enCok: 4, adim: 1, varsayilan: 2 }),
  karakter: Object.freeze({ en: 12, enCok: 20, adim: 2, varsayilan: 16 }),
});
export const OKUMA_SECENEKLERI = Object.freeze({
  grupTuru: Object.freeze(['kelime', 'karakter']),
  yaziBoyutu: Object.freeze(['kucuk', 'normal', 'buyuk', 'cok-buyuk']),
  satirAraligi: Object.freeze([1.4, 1.6, 1.8, 2]),
  font: Object.freeze(['uygulama', 'standart', 'disleksi']),
  tema: Object.freeze(['uygulama', 'acik', 'koyu', 'sepya']),
});
export const VARSAYILAN_OKUMA_AYARLARI = Object.freeze({
  wpm: 150, grupBoyutu: 2, grupTuru: 'kelime', yaziBoyutu: 'normal', satirAraligi: 1.6, font: 'uygulama', tema: 'uygulama',
  kademeli: false, gozMolasi: true,
});
// S05b: kademeli hız. Yalnızca öğrenci açarsa ve tempolu modda çalışır; artış o turla sınırlıdır, kayıtlı hız değişmez
export const KADEMELI = Object.freeze({
  adimKelime: 40,  // her 40 kelimede bir
  oran: 0.04,      // hız %4 artar ("Yavaşlat" aynı oranda düşürür)
  tavanOran: 1.25, // en çok başlangıç hızının %25 fazlası (ve WPM_SINIR.enCok)
  anlamaEsigi: 70, // son anlama bunun altındaysa otomatik artış yapılmaz
});

const KARAKTER_GRUBU_EN_FAZLA_KELIME = 5; // karakter gruplamasında kısa kelimeler yığılmasın
const EN_BUYUK_ADIM_MS = 100;             // takılan karede süre ve ilerleme en çok bu kadar artar
const CUMLE_SONU_BEKLEME = 0.4;           // kelime birimi; toplam süreyi değiştirmez, yalnızca dağıtır
const PARAGRAF_SONU_BEKLEME = 0.8;
const GORUNMEZ = /[\u00AD\u200B-\u200D\u2060\uFEFF]/g;              // yumuşak tire, sıfır genişlikli karakterler
const OZEL_BOSLUK = /[\t\v\f\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g;
const CUMLE_SONU = /[.!?…]["'”’»)\]]*$/u;
const HARF = /[\p{L}\p{N}]/gu;

// ---------- Metin ----------
/** Bir parça kelime sayılır mı? Yalnızca noktalamadan oluşan parçalar ("–", "...") sayılmaz. */
export const kelimeMi = (parca) => /[\p{L}\p{N}]/u.test(parca);
const harfSay = (s) => (String(s).match(HARF) ?? []).length;

/**
 * Metni okumaya hazırlar: Unicode NFC (ayrık yazılmış "İ" vb. birleşir), görünmez karakterler silinir,
 * özel boşluklar düz boşluk olur. Boş satırla ayrılan paragraflar korunur.
 * Döner: { paragraflar: string[], metin }
 */
export function metniHazirla(metin) {
  const ham = String(metin ?? '').normalize('NFC').replace(/\r\n?/g, '\n').replace(GORUNMEZ, '').replace(OZEL_BOSLUK, ' ');
  const paragraflar = ham.split(/\n[ ]*\n+/).map(boslukTemizle).filter(Boolean);
  return { paragraflar, metin: paragraflar.join('\n\n') };
}

function cumlelereBol(kelimeler) {
  const cumleler = [];
  let c = [];
  for (const k of kelimeler) {
    c.push(k);
    if (CUMLE_SONU.test(k)) { cumleler.push(c); c = []; }
  }
  if (c.length) cumleler.push(c);
  return cumleler;
}

/**
 * Metni okuma gruplarına ayırır. Grup cümle ve paragraf sınırını aşmaz.
 * ayar: { grupTuru: 'kelime' | 'karakter', grupBoyutu } → kelime: en çok N kelime; karakter: en çok N karakter (boşluk dahil).
 * Döner: [{ sira, metin, kelime, harf, karakter, paragraf, cumleSonu, paragrafSonu }]
 */
export function metniGrupla(metin, ayar = {}) {
  const { grupTuru, grupBoyutu } = okumaAyarDenetle(ayar);
  const sinir = grupTuru === 'karakter'
    ? { enFazlaKelime: KARAKTER_GRUBU_EN_FAZLA_KELIME, enFazlaKarakter: grupBoyutu }
    : { enFazlaKelime: grupBoyutu };
  const gruplar = [];
  metniHazirla(metin).paragraflar.forEach((p, pi) => {
    const cumleler = cumlelereBol(kelimelereBol(p));
    cumleler.forEach((cumle, ci) => {
      const parcalar = kelimeGruplari(cumle.join(' '), sinir);
      parcalar.forEach((g, gi) => {
        const son = gi === parcalar.length - 1;
        gruplar.push(Object.freeze({
          sira: gruplar.length, metin: g, kelime: kelimelereBol(g).filter(kelimeMi).length,
          harf: harfSay(g), karakter: karakterSayisi(g), paragraf: pi,
          cumleSonu: son && CUMLE_SONU.test(g), paragrafSonu: son && ci === cumleler.length - 1,
        }));
      });
    });
  });
  return Object.freeze(gruplar);
}

// ---------- Hesaplar ----------
/** Dakikadaki kelime: kelime / dakika (yuvarlanmış). Süre yoksa 0. */
export const wpmHesapla = (kelime, sureMs) => (sureMs > 0 ? Math.round((kelime * 60000) / sureMs) : 0);
/** Verilen hızda tahmini okuma süresi (saniye) */
export const tahminiSureSn = (kelime, wpm) => (kelime * 60) / wpmDenetle(wpm);
/** WPM'yi sınırlar içine alır; geçersizse varsayılan */
export function wpmDenetle(wpm) {
  const n = sayi(wpm);
  return n === undefined ? VARSAYILAN_OKUMA_AYARLARI.wpm : sinirla(Math.round(n), WPM_SINIR.en, WPM_SINIR.enCok);
}

// Her grubun bitiş noktası "kelime birimi" cinsinden. Süre, kelime ve harf sayısının ortalamasına göre dağıtılır
// (eklerle uzayan kelimeye biraz daha zaman); toplam her zaman toplam kelimeye eşittir, yani hedef WPM tam tutar.
function zamanPlani(gruplar) {
  const toplamKelime = gruplar.reduce((t, g) => t + g.kelime, 0);
  if (!toplamKelime) return null;
  const ortHarf = gruplar.reduce((t, g) => t + g.harf, 0) / toplamKelime || 1;
  const agirliklar = gruplar.map((g) => 0.5 * g.kelime + (0.5 * g.harf) / ortHarf
    + (g.paragrafSonu ? PARAGRAF_SONU_BEKLEME : g.cumleSonu ? CUMLE_SONU_BEKLEME : 0));
  const toplamAgirlik = agirliklar.reduce((t, a) => t + a, 0);
  let birikim = 0;
  const bitisler = agirliklar.map((a) => (birikim += (a * toplamKelime) / toplamAgirlik));
  bitisler[bitisler.length - 1] = toplamKelime;
  return { toplamKelime, bitisler };
}

/** Kademeli artışa izin var mı? Anlama ölçülmediyse (null) izin verilir; %70 altında verilmez. */
export function kademeliIzinli(anlamaYuzde) {
  const n = sayi(anlamaYuzde);
  return n === undefined || n >= KADEMELI.anlamaEsigi;
}
/** Kademeli artışın bu turdaki üst sınırı */
export const kademeliTavan = (baslangic) => Math.min(WPM_SINIR.enCok, Math.round(wpmDenetle(baslangic) * KADEMELI.tavanOran));

// ---------- Motor ----------
/**
 * Okuma motoru. mod 'tempolu': gruplar ayarlı hızda sırayla gelir. mod 'serbest': metin bütün gösterilir,
 * öğrenci bitir() deyince gerçek okuma hızı ölçülür.
 * secenekler: { metin | gruplar, wpm, grupTuru, grupBoyutu, mod, etkinMi?() → false iken süre işlemez (ör. ctx.aktifMi),
 *               grupDegisince?(grup, sira), ilerleyince?(yuzde), durumDegisince?(durum), bitince?(sonuc) }
 * Sekme gizliyken süre işlemez. Döner: denetim nesnesi (dosya sonundaki özet).
 */
export function okumaMotoruOlustur(secenekler = {}) {
  const { metin, wpm, grupTuru, grupBoyutu, mod = 'tempolu', etkinMi, grupDegisince, ilerleyince, durumDegisince, bitince } = secenekler;
  if (mod !== 'tempolu' && mod !== 'serbest') throw new TypeError('Okuma modu "tempolu" ya da "serbest" olmalı.');
  const gruplar = secenekler.gruplar ?? metniGrupla(metin, { grupTuru, grupBoyutu });
  const plan = zamanPlani(gruplar);
  if (!plan) throw new RangeError('Metinde okunacak kelime yok.');

  let hiz = wpmDenetle(wpm);
  let durum = 'hazir';        // hazir | okuyor | duraklatildi | bitti
  let aktifMs = 0;            // yalnızca okurken geçen süre
  let konum = 0;              // okunan kelime birimi (tempolu)
  let sira = -1;
  let son = null;             // son karenin zamanı; null = yeniden say
  let raf = 0;
  let etkindi = true;
  let duraklatma = 0;
  let sonYuzde = -1;
  let sonuc = null;

  const cagir = (fn, ...a) => { try { fn?.(...a); } catch (h) { console.error('[okuma]', h); } };
  const durumAyarla = (yeni) => { durum = yeni; cagir(durumDegisince, yeni); };
  const gorunurluk = () => { son = null; };

  function sonucHesapla(tamamlandi) {
    const okunan = tamamlandi ? plan.toplamKelime : Math.min(plan.toplamKelime, Math.floor(konum + 1e-9));
    const sureMs = Math.round(aktifMs);
    return Object.freeze({
      mod, tamamlandi, toplamKelime: plan.toplamKelime, okunanKelime: okunan, sureMs, sureSn: Math.round(sureMs / 100) / 10,
      wpm: wpmHesapla(okunan, sureMs), hedefWpm: mod === 'tempolu' ? hiz : undefined,
      grupSayisi: gruplar.length, duraklatmaSayisi: duraklatma,
    });
  }

  function ilerle(dt) {
    konum = Math.min(plan.toplamKelime, konum + (dt * hiz) / 60000);
    let yeni = sira;
    while (yeni < gruplar.length - 1 && konum >= plan.bitisler[yeni]) yeni += 1;
    if (yeni !== sira) { sira = yeni; cagir(grupDegisince, gruplar[sira], sira); }
    const yuzde = Math.min(100, Math.floor((konum / plan.toplamKelime) * 100));
    if (yuzde !== sonYuzde) { sonYuzde = yuzde; cagir(ilerleyince, yuzde); }
    if (konum >= plan.toplamKelime) sonlandir(true);
  }

  function dongu(simdi) {
    if (durum !== 'okuyor') return;
    raf = requestAnimationFrame(dongu);
    const etkin = !document.hidden && (!etkinMi || etkinMi() !== false);
    if (!etkin) {
      if (etkindi) duraklatma += 1;
      etkindi = false;
      son = null;
      return;
    }
    etkindi = true;
    if (son === null) { son = simdi; return; }
    const dt = Math.min(Math.max(0, simdi - son), EN_BUYUK_ADIM_MS);
    son = simdi;
    aktifMs += dt;
    if (mod === 'tempolu') ilerle(dt);
  }

  function dinlemeyiBirak() {
    cancelAnimationFrame(raf);
    document.removeEventListener('visibilitychange', gorunurluk);
  }

  function sonlandir(tamamlandi) {
    if (durum === 'bitti' || durum === 'hazir') return null;
    dinlemeyiBirak();
    sonuc = sonucHesapla(tamamlandi);
    durumAyarla('bitti');
    cagir(bitince, sonuc);
    return sonuc;
  }

  const denetim = {
    gruplar,
    toplamKelime: plan.toplamKelime,
    mod,
    /** Okumayı başlatır (yalnızca bir kez) */
    baslat() {
      if (durum !== 'hazir') return false;
      document.addEventListener('visibilitychange', gorunurluk);
      durumAyarla('okuyor');
      if (mod === 'tempolu') {
        sira = 0;
        cagir(grupDegisince, gruplar[0], 0);
        sonYuzde = 0;
        cagir(ilerleyince, 0);
      }
      son = null;
      raf = requestAnimationFrame(dongu);
      return true;
    },
    duraklat() {
      if (durum !== 'okuyor') return false;
      cancelAnimationFrame(raf);
      son = null;
      duraklatma += 1;
      durumAyarla('duraklatildi');
      return true;
    },
    devam() {
      if (durum !== 'duraklatildi') return false;
      son = null;
      durumAyarla('okuyor');
      raf = requestAnimationFrame(dongu);
      return true;
    },
    /** Okumayı bitirir. Serbest modda metin okunmuş sayılır; tempolu modda erken bitiştir. Döner: sonuç */
    bitir: () => sonlandir(mod === 'serbest'),
    /** Sonuç üretmeden durdurur (ekran kapanırken) */
    iptal() { if (durum === 'bitti') return; dinlemeyiBirak(); durum = 'bitti'; },
    /** Hızı anında değiştirir; o ana kadar geçen süre korunur. Döner: geçerli hız */
    hizAyarla(yeni) { hiz = wpmDenetle(yeni); return hiz; },
    hiz: () => hiz,
    durum: () => durum,
    sira: () => sira,
    ilerlemeYuzde: () => Math.min(100, (konum / plan.toplamKelime) * 100),
    gecenMs: () => aktifMs,
    /** Anlık ölçüm (okurken de çağrılabilir) */
    olcum: () => sonuc ?? sonucHesapla(false),
  };
  return Object.freeze(denetim);
}

// ---------- Ayarlar (profil başına, depo anahtarı okuma:<profilId>) ----------
const bellek = new Map(); // profil yoksa ya da yazılamazsa ayarlar burada kalır
const ayarAnahtari = (id) => `okuma:${id}`;
const aktifProfilId = () => etkinProfil()?.id ?? null;

/** Ayar nesnesini şemaya göre temizler; eksik/geçersiz alan varsayılan olur */
export function okumaAyarDenetle(ham) {
  const a = ham && typeof ham === 'object' ? ham : {};
  const v = VARSAYILAN_OKUMA_AYARLARI;
  const sec = (deger, liste, vars) => (liste.includes(deger) ? deger : vars);
  const grupTuru = sec(a.grupTuru, OKUMA_SECENEKLERI.grupTuru, v.grupTuru);
  const s = GRUP_SINIR[grupTuru];
  const boyut = Math.round(sayi(a.grupBoyutu) ?? NaN);
  return {
    wpm: wpmDenetle(a.wpm),
    grupBoyutu: boyut >= s.en && boyut <= s.enCok ? boyut : s.varsayilan,
    grupTuru,
    yaziBoyutu: sec(a.yaziBoyutu, OKUMA_SECENEKLERI.yaziBoyutu, v.yaziBoyutu),
    satirAraligi: sec(sayi(a.satirAraligi), OKUMA_SECENEKLERI.satirAraligi, v.satirAraligi),
    font: sec(a.font, OKUMA_SECENEKLERI.font, v.font),
    tema: sec(a.tema, OKUMA_SECENEKLERI.tema, v.tema),
    kademeli: a.kademeli === true || a.kademeli === 'true',
    gozMolasi: !(a.gozMolasi === false || a.gozMolasi === 'false'),
  };
}

/** Profilin okuma ayarlarını getirir (profil yoksa bu oturumdaki ayarlar) */
export function okumaAyarlariniGetir(profilId = aktifProfilId()) {
  const anahtar = profilId ?? '';
  if (bellek.has(anahtar)) return okumaAyarDenetle(bellek.get(anahtar));
  let kayit;
  if (profilId) { try { kayit = oku(ayarAnahtari(profilId)); } catch { kayit = undefined; } }
  return okumaAyarDenetle(kayit);
}

/** Ayarları birleştirip kaydeder. Döner: { ayar, sonuc: 'tamam' | 'kota' | 'hata' | 'profil' } */
export function okumaAyarlariniKaydet(degisen, profilId = aktifProfilId()) {
  const ayar = okumaAyarDenetle({ ...okumaAyarlariniGetir(profilId), ...degisen });
  bellek.set(profilId ?? '', ayar);
  if (!profilId) return { ayar, sonuc: 'profil' };
  let sonuc;
  try { sonuc = yazmaDene(ayarAnahtari(profilId), ayar); } catch { sonuc = 'hata'; }
  // Ayar bellekte geçerli kalır; öğrenci kaydedilemediğini bilsin
  if (sonuc === 'kota') depoUyar('kota', 'Cihazdaki kayıt alanı dolu; okuma ayarın yalnız bu oturumda geçerli. Ayarlar’dan yedek indirip yer açabilirsin.');
  else if (sonuc === 'hata') depoUyar('yazma', 'Okuma ayarı kaydedilemedi; yalnız bu oturumda geçerli.');
  return { ayar, sonuc };
}

/** Profil silinirken okuma ayarlarını da siler */
export function okumaAyarlariniSil(profilId) {
  if (!profilId) return;
  bellek.delete(profilId);
  try { sil(ayarAnahtari(profilId)); } catch { /* yok say */ }
}

// Depodaki anahtarı profile.js siler; burada yalnız bellekteki kopya bırakılır. Yedek yüklenince eski ayarlar bellekte kalmasın
dinle(OLAYLAR.PROFIL_SILINDI, ({ id } = {}) => { if (id) bellek.delete(id); });
dinle(OLAYLAR.DEPO_YUKLENDI, () => bellek.clear());

// ---------- Okuma alanı (görünüm) ----------
/** Okuma ayarlarını (yazı boyutu, satır aralığı, yazı tipi, tema) bir okuma kutusuna uygular */
export function okumaGorunumuUygula(kok, ayar) {
  const a = okumaAyarDenetle(ayar);
  kok.dataset.yazi = a.yaziBoyutu;
  kok.dataset.font = a.font;
  kok.dataset.tema = a.tema;
  kok.style.setProperty('--okuma-satir', String(a.satirAraligi));
  return a;
}

function kaydirmaKabi(oge) {
  for (let p = oge.parentElement; p; p = p.parentElement) {
    const oy = getComputedStyle(p).overflowY;
    if ((oy === 'auto' || oy === 'scroll') && p.scrollHeight > p.clientHeight) return p;
  }
  return document.scrollingElement || document.documentElement;
}

// Etkin grup görünür alanın üst-orta bölgesinde kalsın
function gorunurTut(oge) {
  const kap = kaydirmaKabi(oge);
  const sayfa = kap === document.scrollingElement || kap === document.documentElement;
  const ust = sayfa ? 0 : kap.getBoundingClientRect().top;
  const yukseklik = sayfa ? window.innerHeight : kap.clientHeight;
  const r = oge.getBoundingClientRect();
  if (r.top >= ust + yukseklik * 0.12 && r.bottom <= ust + yukseklik * 0.75) return;
  kap.scrollBy({ top: r.top - (ust + yukseklik * 0.3), behavior: hareketAzaltilmisMi() ? 'auto' : 'smooth' });
}

/**
 * Grupları ekrana çizer. gorunum 'metin': metnin tamamı, etkin grup vurgulu; 'tek': ortada tek grup.
 * Döner: { kok, vurgula(sira), sifirla(), ayarUygula(ayar) }
 */
export function okumaAlaniOlustur(gruplar, { ayar, gorunum = 'metin', etiket = 'Okuma metni' } = {}) {
  const tek = gorunum === 'tek';
  const kok = el('div', { sinif: `okuma okuma--${tek ? 'tek' : 'metin'}`, lang: 'tr', 'aria-label': etiket });
  okumaGorunumuUygula(kok, ayar);
  const parcalar = [];
  let tekKutu = null;
  if (tek) {
    tekKutu = el('p', { sinif: 'okuma__tek' });
    kok.append(tekKutu);
  } else {
    const paragraflar = [];
    for (const g of gruplar) {
      const span = el('span', { sinif: 'okuma__grup', metin: g.metin });
      parcalar.push(span);
      (paragraflar[g.paragraf] ??= []).push(span, ' ');
    }
    kok.append(...paragraflar.filter(Boolean).map((p) => el('p', { sinif: 'okuma__paragraf' }, ...p.slice(0, -1))));
  }
  let etkin = -1;

  function vurgula(i) {
    if (tek) { tekKutu.textContent = gruplar[i]?.metin ?? ''; etkin = i; return; }
    parcalar[etkin]?.classList.remove('okuma__grup--etkin');
    for (let j = Math.max(0, etkin); j < i; j += 1) parcalar[j]?.classList.add('okuma__grup--okundu');
    const s = parcalar[i];
    if (s) {
      s.classList.remove('okuma__grup--okundu');
      s.classList.add('okuma__grup--etkin');
      if (!kok.closest('[data-kaydirma="yok"]')) gorunurTut(s); // ayar önizlemesi sayfayı kaydırmaz
    }
    etkin = i;
  }

  function sifirla() {
    parcalar.forEach((p) => p.classList.remove('okuma__grup--etkin', 'okuma__grup--okundu'));
    if (tekKutu) tekKutu.textContent = '';
    etkin = -1;
  }

  return { kok, vurgula, sifirla, ayarUygula: (a) => okumaGorunumuUygula(kok, a) };
}

/* ---------- Dış API özeti (S05/S06) ----------
 * metniHazirla(metin) → { paragraflar, metin }       metniGrupla(metin, {grupTuru, grupBoyutu}) → gruplar
 * okumaMotoruOlustur({...}) → { gruplar, toplamKelime, mod, baslat, duraklat, devam, bitir, iptal, hizAyarla,
 *                               hiz, durum, sira, ilerlemeYuzde, gecenMs, olcum }
 * sonuç: { mod, tamamlandi, toplamKelime, okunanKelime, sureMs, sureSn, wpm, hedefWpm, grupSayisi, duraklatmaSayisi }
 * okumaAyarlariniGetir / okumaAyarlariniKaydet / okumaAyarlariniSil / okumaAyarDenetle
 * okumaAlaniOlustur(gruplar, {ayar, gorunum}) / okumaGorunumuUygula
 * wpmHesapla, wpmDenetle, tahminiSureSn, kelimeMi; WPM_SINIR, GRUP_SINIR, OKUMA_SECENEKLERI, VARSAYILAN_OKUMA_AYARLARI
 * S05b: kademeliIzinli(anlamaYuzde), kademeliTavan(baslangic), KADEMELI; ayarlarda kademeli ve gozMolasi (true/false)
 */
