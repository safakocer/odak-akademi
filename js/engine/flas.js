// Flaş yardımcıları (S09; D06: gruplarda özel ad yok, kenarTemizle dışa açıldı; S34c-2: tek kelimeler sınıfın kelime havuzundan da gelir): kare eşzamanlı kısa gösterim + maske, kademeli süre merdiveni, hız puanı, kelime/sayı/kelime grubu havuzu, çeldiriciler, seçenek paneli, yazım karşılaştırması
import { el } from '../core/ui.js';
import { karistir, trKucuk, kelimelereBol, karakterSayisi, sayi } from '../core/utils.js';
import { modulKayitlari } from '../core/metrics.js';
import { metniHazirla } from './reader-engine.js';
import { metinBankasiYukle, tumMetinler, profilSinifi } from './text-bank.js';
import { kelimeHavuzuYukle, kelimeHavuzuYuklendiMi, sinifKelimeleri } from './kelime-havuzu.js';

const rastgeleSira = (n) => Math.floor(Math.random() * n);

// ---------- Kare eşzamanlı flaş ----------
let kareMs = 1000 / 60;

/** Ölçülen ekran karesi süresi (ms; 60 Hz ekranda ~16,7) */
export const kareSuresi = () => kareMs;

function kareOlc(araliklar) {
  const gecerli = araliklar.filter((a) => a > 3 && a < 60).sort((a, b) => a - b);
  if (gecerli.length >= 2) kareMs = gecerli[Math.floor(gecerli.length / 2)];
}

/**
 * Öğeyi hedef süre kadar gösterir (sınıf: flas--gorunur). Gösterme ve gizleme requestAnimationFrame karesinde yapılır;
 * ekran yenilemesiyle aynı anda değiştiği için gerçek süre hedeften en çok yarım kare sapar. setTimeout kullanılmaz.
 * secenekler: { aktifMi() (false olursa flaş iptal), maske? (flaştan sonra maskeMs görünür, ardıl görüntüyü siler), maskeMs = 150 }
 * Döner: Promise<{ iptal: true } | { iptal: false, gercekMs }>
 */
export function flasGoster(oge, hedefMs, { aktifMi = () => true, maske = null, maskeMs = 150 } = {}) {
  return new Promise((coz) => {
    const araliklar = [];
    let onceki = null;
    let bas = null;
    let gizlendi = null;
    let gercekMs = 0;
    function kare(t) {
      if (onceki !== null) araliklar.push(t - onceki);
      onceki = t;
      if (gizlendi === null && (!aktifMi() || document.hidden)) {
        oge.classList.remove('flas--gorunur');
        coz({ iptal: true });
        return;
      }
      if (bas === null) {
        if (araliklar.length < 3) { requestAnimationFrame(kare); return; } // ısınma: kare süresi ölçülür
        kareOlc(araliklar);
        oge.classList.add('flas--gorunur');
        bas = t;
      } else if (gizlendi === null) {
        if (t - bas >= hedefMs - kareMs / 2) {
          oge.classList.remove('flas--gorunur');
          gercekMs = Math.round(t - bas);
          gizlendi = t;
          if (!maske) { coz({ iptal: false, gercekMs }); return; }
          maske.classList.add('flas--gorunur');
        }
      } else if (t - gizlendi >= maskeMs - kareMs / 2 || !aktifMi() || document.hidden) {
        maske.classList.remove('flas--gorunur');
        coz({ iptal: false, gercekMs });
        return;
      }
      requestAnimationFrame(kare);
    }
    requestAnimationFrame(kare);
  });
}

// ---------- Kademeli süre merdiveni ----------
/**
 * İlk hataya kadar her doğruda, sonra 2 doğruda bir kısalır; her yanlışta uzar (~%70 isabette dengelenir).
 * Adım: 200 ms üstünde 50 ms, altında 25 ms. Döner: { ms, deneme, sonuc(dogruMu, gercekMs?), esik(), sapma(), enKisaDogru() }
 */
export function merdivenOlustur({ baslangic, en, enCok }) {
  let ms = Math.min(enCok, Math.max(en, baslangic));
  let seri = 0;
  let hataOldu = false;
  const gecmis = [];
  return {
    get ms() { return ms; },
    get deneme() { return gecmis.length; },
    sonuc(dogruMu, gercekMs) {
      gecmis.push({ hedef: ms, gercek: sayi(gercekMs) ?? ms, dogru: !!dogruMu });
      if (dogruMu) {
        seri += 1;
        if (seri >= (hataOldu ? 2 : 1)) { seri = 0; ms = Math.max(en, ms - (ms > 200 ? 50 : 25)); }
      } else {
        hataOldu = true;
        seri = 0;
        ms = Math.min(enCok, ms + (ms >= 200 ? 50 : 25));
      }
    },
    /** Eşik: son denemelerin (en az 4, turun yarısı) ortalama flaş süresi */
    esik() {
      if (!gecmis.length) return ms;
      const son = gecmis.slice(-Math.max(4, Math.ceil(gecmis.length / 2)));
      return Math.round(son.reduce((t, g) => t + g.hedef, 0) / son.length);
    },
    /** Ölçülen süre ile hedef arasındaki ortalama fark (ms) */
    sapma() {
      if (!gecmis.length) return 0;
      return Math.round((gecmis.reduce((t, g) => t + Math.abs(g.gercek - g.hedef), 0) / gecmis.length) * 10) / 10;
    },
    enKisaDogru() {
      const d = gecmis.filter((g) => g.dogru).map((g) => g.hedef);
      return d.length ? Math.min(...d) : null;
    },
  };
}

/** Hız puanı = 1000 − eşik (ms): flaş kısaldıkça artar */
export const hizPuani = (esikMs) => Math.max(0, 1000 - Math.round(sayi(esikMs) ?? 1000));

/** Merdivenli egzersizde sonraki seviye: eşik alt sınıra yakın (≤ en+50) ve isabet ≥%70 → +1; eşik üst sınırda ve isabet <%50 → −1 */
export function merdivenSeviyesi(zorluk, { esikMs, isabet, en, enCok }) {
  if (esikMs <= en + 50 && isabet >= 70) return zorluk + 1;
  if (esikMs >= enCok - 25 && isabet < 50) return zorluk - 1;
  return zorluk;
}

/** Turun başlangıç süresi: aynı seviyedeki son eşik + 50 ms (25'in katı); kayıt yoksa seviyenin başlangıcı */
export function baslangicSuresi({ modul, egzersiz, zorluk }, { baslangic, en, enCok }) {
  const liste = modulKayitlari(modul, { egzersiz }).filter((k) => k.zorluk === zorluk && sayi(k.ekstra?.esikMs) !== undefined);
  if (!liste.length) return baslangic;
  const ms = Math.round((sayi(liste[liste.length - 1].ekstra.esikMs) + 50) / 25) * 25;
  return Math.min(enCok, Math.max(en, ms));
}

// ---------- Kelime ve grup havuzu (metin bankasından; yüklenemezse yedek metin) ----------
// S34c-2: tek kelimeler = sınıfın kelime havuzu (kelime-havuzu.js sinifKelimeleri; ilkokulda kısa, sık kullanılan kelimeler) ∪ sınıfa uygun
// metinlerdeki küçük harfli kelimeler. Kelime grupları (2-4 kelime) metinlerden gelir. Havuz yüklenemezse yalnız metin kelimeleri.
const YEDEK_METIN = `Sabah erken kalkan çocuklar bahçede top oynadı. Güneş yavaş yavaş yükselirken kuşlar ağaçta öttü.
Annem pazardan taze elma ve armut aldı. Küçük kedi pencerenin önünde uyuyordu. Akşam olunca hep birlikte masaya oturduk.
Deniz kenarında yürümek bana iyi gelir. Kitabın son sayfasını okuyunca gülümsedim. Rüzgâr esince yapraklar yere düştü.
Okulun önündeki yol bugün çok kalabalıktı. Dedem bize eski bir masal anlattı. Yağmur dinince gökyüzünde gökkuşağı belirdi.
Arkadaşım yeni bir resim çizdi ve duvara astı. Kış gelince dağların tepesi bembeyaz oldu. Sınıfta herkes sırayla şiir okudu.`;
/** Kelimenin başındaki ve sonundaki noktalamayı siler (“Kitap,” → “Kitap”) */
export const kenarTemizle = (s) => String(s ?? '').replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
const GRUP_EN_COK_KARAKTER = 28;

let havuz = null;
let havuzAnahtari = '';

/** Metin bankasını ve kelime havuzunu yükler (egzersiz dosyasının başında beklenir) */
export async function havuzHazirla() {
  try { await metinBankasiYukle(); } catch (h) { console.warn('[flas] Metin bankası yüklenemedi; yedek kelimeler kullanılacak.', h); }
  try { await kelimeHavuzuYukle(); } catch (h) { console.warn('[flas] Kelime havuzu yüklenemedi; metin kelimeleri kullanılacak.', h); }
  havuz = null;
}

function metniIsle(metin, kelimeler, gruplar) {
  for (const p of metniHazirla(metin).paragraflar) {
    let zincir = []; // noktalamayla bölünmeyen ardışık kelimeler
    for (const ham of kelimelereBol(p)) {
      const ic = kenarTemizle(ham);
      const harfli = /^\p{L}+$/u.test(ic);
      if (harfli && /^\p{Ll}+$/u.test(ic) && ic.length >= 2 && ic.length <= 9) kelimeler.add(ic); // özel adlar alınmaz
      // D06: büyük harfle başlayan kelime (özel ad ya da cümle başı) gruba girmez, zinciri keser: “ayşe okula” gibi küçük harfli özel ad gösterilmez
      if (!harfli || /^\p{Lu}/u.test(ic)) { zincir = []; continue; }
      if (/^[^\p{L}\p{N}]/u.test(ham)) zincir = [];
      zincir.push(trKucuk(ic));
      for (const n of [2, 3, 4]) {
        if (zincir.length < n) continue;
        const g = zincir.slice(-n).join(' ');
        if (karakterSayisi(g) <= GRUP_EN_COK_KARAKTER) gruplar[n].add(g);
      }
      if (/[^\p{L}\p{N}]$/u.test(ham)) zincir = [];
    }
  }
}

function havuzGetir() {
  const ps = profilSinifi();
  let metinler = [];
  try { metinler = tumMetinler().filter((m) => m.kaynak !== 'banka' || !ps || m.sinif <= ps); } catch { metinler = []; }
  const anahtar = `${ps}:${metinler.length}:${kelimeHavuzuYuklendiMi()}`;
  if (havuz && havuzAnahtari === anahtar) return havuz;
  const kelimeler = new Set(sinifKelimeleri(ps ?? undefined, [2, 9])); // S34c-2: sınıfın kelime havuzu (profil yoksa hepsi)
  const gruplar = { 2: new Set(), 3: new Set(), 4: new Set() };
  metinler.forEach((m) => metniIsle(m.metin, kelimeler, gruplar));
  if (kelimeler.size < 60 || gruplar[4].size < 20) metniIsle(YEDEK_METIN, kelimeler, gruplar);
  havuz = { kelimeler: [...kelimeler], gruplar: { 2: [...gruplar[2]], 3: [...gruplar[3]], 4: [...gruplar[4]] } };
  havuzAnahtari = anahtar;
  return havuz;
}

/** Uzunluğu [en, enCok] harf olan rastgele kelime (küçük harf); haric: Set (küçük harf) */
export function rastgeleKelime([en, enCok], { haric } = {}) {
  const uygun = havuzGetir().kelimeler.filter((k) => {
    const n = karakterSayisi(k);
    return n >= en && n <= enCok && !haric?.has(k);
  });
  return uygun[rastgeleSira(uygun.length)] ?? 'kalem';
}

/** Doğru kelimeye benzeyen (uzunluğu ±1, tercihen aynı baş harf ya da son ek) çeldiriciler */
export function kelimeCeldiricileri(dogru, adet = 3) {
  const n = karakterSayisi(dogru);
  const aday = havuzGetir().kelimeler.filter((k) => k !== dogru && Math.abs(karakterSayisi(k) - n) <= 1);
  const benzer = aday.filter((k) => k[0] === dogru[0] || k.slice(-2) === dogru.slice(-2));
  const sonuc = [...new Set([...karistir(benzer).slice(0, adet), ...karistir(aday)])].slice(0, adet);
  while (sonuc.length < adet) sonuc.push(`${dogru}${'abcdefg'[sonuc.length]}`); // havuz çok küçükse
  return sonuc;
}

/** Baş rakamı 0 olmayan rastgele sayı (metin) */
export function sayiUret(basamak) {
  const en = 10 ** (basamak - 1);
  return String(en + rastgeleSira(9 * en));
}

/** Sayı çeldiricileri: komşu rakamların yeri değişir, ters çevrilir ya da bir rakam değişir */
export function sayiCeldiricileri(s, adet = 3) {
  const yerDegisen = new Set();
  const degisen = new Set();
  const uygun = (d) => d !== s && d[0] !== '0' && d.length === s.length;
  for (let i = 0; i < s.length - 1; i++) {
    const d = s.slice(0, i) + s[i + 1] + s[i] + s.slice(i + 2);
    if (uygun(d)) yerDegisen.add(d);
  }
  const ters = [...s].reverse().join('');
  if (uygun(ters)) yerDegisen.add(ters);
  for (let j = 0; j < 40 && degisen.size < adet; j++) {
    const i = rastgeleSira(s.length);
    const d = s.slice(0, i) + rastgeleSira(10) + s.slice(i + 1);
    if (uygun(d) && !yerDegisen.has(d)) degisen.add(d);
  }
  const sonuc = [...new Set([...karistir([...yerDegisen]).slice(0, 1), ...karistir([...degisen]), ...yerDegisen])].slice(0, adet);
  while (sonuc.length < adet) { const d = sayiUret(s.length); if (d !== s && !sonuc.includes(d)) sonuc.push(d); }
  return sonuc;
}

/** n kelimelik (2-4) rastgele grup; küçük harf, noktalamasız, metindeki sırasıyla */
export function rastgeleGrup(n) {
  const liste = havuzGetir().gruplar[n] ?? [];
  return liste[rastgeleSira(liste.length)] ?? 'sabah erken kalkan çocuklar'.split(' ').slice(0, n).join(' ');
}

/** Grup çeldiricileri: bir kelime benzeriyle değişir, iki komşu kelimenin yeri değişir; eksik kalırsa havuzdan aynı boyda grup */
export function grupCeldiricileri(grup, adet = 3) {
  const k = grup.split(' ');
  const gorulen = new Set([grup]);
  const degisen = [];
  const yerDegisen = [];
  karistir(k.map((_, i) => i)).forEach((i) => {
    const d = [...k];
    [d[i]] = kelimeCeldiricileri(k[i], 1);
    const g = d.join(' ');
    if (!gorulen.has(g)) { gorulen.add(g); degisen.push(g); }
  });
  for (let i = 0; i < k.length - 1; i++) {
    if (k[i] === k[i + 1]) continue;
    const d = [...k];
    [d[i], d[i + 1]] = [d[i + 1], d[i]];
    const g = d.join(' ');
    if (!gorulen.has(g)) { gorulen.add(g); yerDegisen.push(g); }
  }
  const sonuc = [...karistir(yerDegisen).slice(0, 1), ...degisen].slice(0, adet);
  for (let j = 0; j < 20 && sonuc.length < adet; j++) {
    const g = rastgeleGrup(k.length);
    if (!gorulen.has(g)) { gorulen.add(g); sonuc.push(g); }
  }
  return sonuc;
}

// ---------- Yazım karşılaştırması (D05 kuralı: tr-TR küçük harf, Türkçe harfler harfsiz, noktalamasız) ----------
const HARFSIZ = Object.freeze({ ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u', â: 'a', î: 'i', û: 'u' });
export const yazimSadelestir = (s) => trKucuk(String(s ?? '').normalize('NFC'))
  .replace(/[çğıöşüâîû]/g, (h) => HARFSIZ[h]).replace(/[^\p{L}\p{N}\s]/gu, ' ').trim().replace(/\s+/g, ' ');

/** Yazılan grubu doğrusuyla karşılaştırır → { tam, dogruKelime, toplamKelime } (kelimeler sırasıyla) */
export function yazimKarsilastir(yazilan, dogru) {
  const a = yazimSadelestir(yazilan).split(' ').filter(Boolean);
  const b = yazimSadelestir(dogru).split(' ').filter(Boolean);
  const dogruKelime = b.filter((x, i) => a[i] === x).length;
  return { tam: a.length === b.length && dogruKelime === b.length, dogruKelime, toplamKelime: b.length };
}

// ---------- Seçenek paneli (flaştan sonra “ne gördün?”) ----------
let panelSayaci = 0;

/**
 * secenekler: [metin]; tuslar?: her seçenek için tuş ya da tuş dizisi (vars. '1'..'4'); secince(i) → false dönerse kilitlenmez
 * Döner: { kok, odakla(), isaretle(secilen, dogru), tus(e) → işlendiyse true }
 */
export function secenekPaneli({ baslik, secenekler, secince, tuslar }) {
  const id = `flas-soru-${++panelSayaci}`;
  const tus = (tuslar ?? secenekler.map((_, i) => String(i + 1))).map((t) => [].concat(t));
  let kilitli = false;
  const dugmeler = secenekler.map((s, i) => el('button', {
    type: 'button', sinif: 'btn btn--ikincil flas-secenek', 'aria-keyshortcuts': tus[i].join(' '), metin: s,
    onclick: () => sec(i),
  }));
  function sec(i) {
    if (kilitli) return;
    kilitli = true;
    if (secince(i) === false) kilitli = false;
  }
  return {
    kok: el('div', { sinif: 'flas-soru__ic' },
      el('h3', { id, metin: baslik }),
      el('div', { sinif: 'flas-secenekler', role: 'group', 'aria-labelledby': id }, dugmeler)),
    odakla: () => dugmeler[0]?.focus({ preventScroll: true }),
    isaretle(secilen, dogru) {
      kilitli = true;
      dugmeler.forEach((d, i) => {
        d.setAttribute('aria-disabled', 'true');
        if (i === dogru) { d.dataset.sonuc = 'dogru'; d.textContent = `✓ ${secenekler[i]}`; }
        else if (i === secilen) { d.dataset.sonuc = 'yanlis'; d.textContent = `✗ ${secenekler[i]}`; }
      });
    },
    tus(e) {
      if (kilitli || e.ctrlKey || e.altKey || e.metaKey) return false;
      const i = tus.findIndex((t) => t.includes(trKucuk(e.key)));
      if (i < 0) return false;
      e.preventDefault();
      sec(i);
      return true;
    },
  };
}
