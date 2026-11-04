// Hafıza oyunları ortak altyapısı (S14a; S14b: seviyeye özel sınır, seçim başlığı, sonuç metinleri ve mesaj ezilebilir): merdiven yöntemiyle uyarlanan zorluk, dizi turu döngüsü (izle → hatırla → geri bildirim), tur özeti, en iyi dizi, kendi rekorunla karşılaştırma ve çerçeve tanımı. Yeni hafıza oyunu = tek dosya + hafizaOyunu()
import { el } from '../core/ui.js';
import { duyur } from '../core/a11y.js';
import { sayi, sinirla, trKucuk, yuzdeBicimle, sayiBicimle, sureMetni } from '../core/utils.js';
import { modulKayitlari } from '../core/metrics.js';
import { hazirlikSecimi } from './exercise-frame.js';
import { geriYaz } from './algi.js';
import { KESINTI_MS } from './attention-core.js';

/*
 * KULLANIM (dizi oyunu, ör. Rakam Dizisi):
 *   export default hafizaOyunu({ egzersiz, ad, nasil, seviyeler: [3 tempo {ad, gosterMs, araMs}], birim: 'rakam',
 *     baslangic: { ileri: 3, geri: 2 }, sinir: { en: 2, enCok: 9 }, ipuclari: [...],
 *     baslat(ctx, { mod, ters, merdiven, deneme }) {
 *       const sahne = hafizaSahnesi(ctx);
 *       diziTuru(ctx, { sahne, merdiven, deneme, ters, birim, uret(n), sun(dizi) → Promise, gir(n) → Promise<yanıt[]>, sonucta? });
 *     } });
 * Dizi dışı oyun (S14b: n-back, kelime listesi, eşleştirme): yonler: false verilebilir; merdiven düzeyi n ya da liste uzunluğu olur.
 *   Kendi döngüsünü kurar, her denemeyi { duzey, dogru, dogruOge, ogeSayisi } olarak toplar, merdiven.sonuc(dogru) çağırır, sonunda hafizaBitir(ctx, denemeler, { merdiven }).
 *   Rekor göstergeleri gostergeler ile değiştirilebilir ([{ alan, ad, yon: 'buyuk'|'kucuk', bicim }]; ilki puan ve "yeni rekor" kararıdır).
 * Kayda giden: puan = en iyi düzey (enIyi), dogru/yanlis = doğru/yanlış deneme, zorluk = tempo seviyesi (1-3),
 *   ekstra: { mod?, baslangic, gosterMs?, deneme, enIyi, ortDuzey, ogeIsabet, sonDuzey, donus, kesinti, isabet, + oyunun alanları }
 * Rekor: aynı egzersiz, aynı seviye ve aynı yön (mod) içindeki kendi kayıtları.
 */

export const HAFIZA_MODUL = 'hafiza';
// Varsayılan merdiven kuralı: 1 doğruda +1, üst üste 2 yanlışta −1 (tek bir dalgınlık diziyi kısaltmaz)
export const MERDIVEN_VARSAYILAN = Object.freeze({ yukselt: 1, dusur: 2 });
export const YONLER = Object.freeze([
  Object.freeze({ deger: 'ileri', etiket: 'İleri', aciklama: 'gösterilen sırayla' }),
  Object.freeze({ deger: 'geri', etiket: 'Geri', aciklama: 'sondan başa doğru' }),
]);
const GERI_DOGRU_MS = 1100;
const GERI_YANLIS_MS = 2400;

// ---------- Merdiven (uyarlanan zorluk) ----------
/**
 * Merdiven: üst üste `yukselt` doğruda düzey 1 artar, üst üste `dusur` yanlışta 1 azalır; [en, enCok] dışına çıkmaz.
 * Döner: { deger, enIyi (doğru yapılan en yüksek düzey), donus (yön değiştirme sayısı), kural, sonuc(dogruMu) → { onceki, deger, degisim: -1|0|1 } }
 */
export function merdivenOlustur({ baslangic, en = 2, enCok = 9, yukselt = MERDIVEN_VARSAYILAN.yukselt, dusur = MERDIVEN_VARSAYILAN.dusur } = {}) {
  const yukari = Math.max(1, Math.round(sayi(yukselt) ?? 1));
  const asagi = Math.max(1, Math.round(sayi(dusur) ?? 2));
  let deger = sinirla(Math.round(sayi(baslangic) ?? en), en, enCok);
  let ardDogru = 0;
  let ardYanlis = 0;
  let enIyi = 0;
  let donus = 0;
  let sonYon = 0;
  return {
    get deger() { return deger; },
    get enIyi() { return enIyi; },
    get donus() { return donus; },
    kural: Object.freeze({ en, enCok, yukselt: yukari, dusur: asagi }),
    sonuc(dogruMu) {
      const onceki = deger;
      if (dogruMu) {
        enIyi = Math.max(enIyi, deger);
        ardYanlis = 0;
        ardDogru += 1;
        if (ardDogru >= yukari) { ardDogru = 0; deger = Math.min(enCok, deger + 1); }
      } else {
        ardDogru = 0;
        ardYanlis += 1;
        if (ardYanlis >= asagi) { ardYanlis = 0; deger = Math.max(en, deger - 1); }
      }
      const degisim = Math.sign(deger - onceki);
      if (degisim && sonYon && degisim !== sonYon) donus += 1;
      if (degisim) sonYon = degisim;
      return { onceki, deger, degisim };
    },
  };
}

/** Önceki turun bittiği düzeyin bir altından başlar (ısınma); kayıt yoksa varsayilan */
export function baslangicDuzeyi({ modul = HAFIZA_MODUL, egzersiz, ayrim, varsayilan = 3, en = 2, enCok = 9, profilId } = {}) {
  const son = modulKayitlari(modul, { egzersiz, profilId })
    .filter((k) => !ayrim || k.ekstra?.[ayrim.alan] === ayrim.deger).at(-1);
  const d = sayi(son?.ekstra?.sonDuzey) ?? sayi(son?.ekstra?.enIyi);
  return sinirla(d === undefined ? Math.round(sayi(varsayilan) ?? en) : Math.round(d) - 1, en, enCok);
}

/** Bu egzersizin son kaydındaki ekstra alanı (ör. son seçilen yön); yoksa undefined */
export function sonEkstra({ modul = HAFIZA_MODUL, egzersiz, alan, profilId } = {}) {
  return modulKayitlari(modul, { egzersiz, profilId }).at(-1)?.ekstra?.[alan];
}

/** Çerçeve zamanlayıcısıyla bekler (duraklatınca durur; tur kapanınca hiç çözülmez, döngü kendiliğinden biter) */
export const bekle = (ctx, ms) => new Promise((coz) => { ctx.sonra(coz, Math.max(0, ms)); });

// ---------- Oyun alanı ----------
/** Ortak düzen: üst satır (aşama + dizi sayısı), sahne, geri bildirim. Döner: { sahne, durum, asama, geri, ilerle, asamaYaz, geriYaz, temizle } */
export function hafizaSahnesi(ctx, { ust = null, sahneSinif = '' } = {}) {
  ctx.alan.classList.add('hafiza-alan');
  // Basılı tutulan Enter/Boşluk tekrar tekrar yanıt üretmesin
  ctx.alan.addEventListener('keydown', (e) => {
    if (e.repeat && (e.key === 'Enter' || e.key === ' ')) e.preventDefault();
  }, true);
  const asama = el('p', { sinif: 'hafiza-asama', 'aria-live': 'polite' }); // "İzle" / "Sıra sende" duyurulur
  const durum = el('p', { sinif: 'hafiza-durum', 'aria-live': 'off' });
  const sahne = el('div', { sinif: `hafiza-sahne ${sahneSinif}`.trim() });
  const geri = el('p', { sinif: 'hafiza-geri', 'aria-live': 'polite' }); // tempo yok, geri bildirim okunabilir
  ctx.alan.append(el('div', { sinif: 'hafiza-ust' }, ust, asama, durum), sahne, geri);
  return {
    sahne, durum, asama, geri,
    ilerle: (n, toplam, ek = '') => { durum.textContent = `Dizi ${n}/${toplam}${ek ? ` · ${ek}` : ''}`; },
    asamaYaz: (metin = '', tur = '') => { asama.textContent = metin; asama.dataset.tur = tur; },
    geriYaz: (sonuc, metin) => geriYaz(geri, sonuc, metin),
    temizle: () => geriYaz(geri, null, ''),
  };
}

// ---------- Dizi turu ----------
/**
 * Dizi hatırlama turu: her denemede merdiven düzeyi kadar uzun dizi üretilir, gösterilir, öğrenci girer, merdiven güncellenir.
 * uret(n) → dizi; sun(dizi) → Promise (bekle(ctx, ms) ile gösterir); gir(n, { ters }) → Promise<yanıt dizisi>;
 * sonucta(kayit, { dizi, hedef, yanit, adim }) görsel işaret koyar; dogrusuMetni?(hedef) yanlışta gösterilecek doğru cevap.
 * Gösterim sırasında duraklatma/sekme değişimi olursa deneme sayılmaz, yeni diziyle yinelenir.
 */
export function diziTuru(ctx, {
  sahne, merdiven, deneme = 12, ters = false, birim = 'öğe',
  uret, sun, gir, sonucta = () => {}, dogrusuMetni, bitince,
}) {
  const denemeler = [];
  let kesinti = 0;
  let bitti = false;
  ctx.temizlenince(() => { bitti = true; });
  const kural = merdiven.kural;

  function geriMetni(dogru, { onceki, deger, degisim }, hedef) {
    if (dogru) {
      if (degisim > 0) return `Doğru! Sıradaki dizi ${deger} ${birim}.`;
      return onceki >= kural.enCok ? 'Doğru! En uzun dizidesin.' : 'Doğru! Bir doğru daha gelince dizi uzar.';
    }
    const parca = ['Bu kez tutmadı.'];
    const dogrusu = dogrusuMetni?.(hedef);
    if (dogrusu) parca.push(dogrusu);
    if (degisim < 0) parca.push(`Sıradaki dizi ${deger} ${birim}.`);
    else if (onceki > kural.en) parca.push('Aynı uzunlukta bir deneme daha.');
    return parca.join(' ');
  }

  async function dongu() {
    await bekle(ctx, 500);
    while (!bitti && denemeler.length < deneme) {
      const duzey = merdiven.deger;
      sahne.ilerle(denemeler.length + 1, deneme, `${duzey} ${birim}`);
      sahne.temizle();
      sahne.asamaYaz('İzle', 'izle');
      await bekle(ctx, 700);
      if (bitti) return;
      const dizi = uret(duzey);
      const hedef = ters ? [...dizi].reverse() : [...dizi];
      const d0 = performance.now();
      const g0 = ctx.gecenSn() * 1000;
      await sun(dizi);
      if (bitti) return;
      // Duvar saati oyun saatinden çok ilerlediyse gösterim kesildi: deneme yinelenir
      if ((performance.now() - d0) - (ctx.gecenSn() * 1000 - g0) > KESINTI_MS) {
        kesinti += 1;
        sahne.asamaYaz('', '');
        sahne.geriYaz(null, 'Ara verildiği için yeni bir dizi gösterilecek.');
        await bekle(ctx, 1400);
        continue;
      }
      sahne.asamaYaz(ters ? 'Sıra sende: sondan başa' : 'Sıra sende: aynı sırayla', 'gir');
      const yanit = await gir(hedef.length, { ters });
      if (bitti) return;
      const dogruOge = hedef.reduce((t, x, i) => t + (yanit[i] === x ? 1 : 0), 0);
      const dogru = yanit.length === hedef.length && dogruOge === hedef.length;
      const adim = merdiven.sonuc(dogru);
      const kayit = { duzey, dogru, dogruOge, ogeSayisi: hedef.length };
      denemeler.push(kayit);
      sahne.asamaYaz('', '');
      ctx.ses(dogru ? 'dogru' : 'yanlis');
      sahne.geriYaz(dogru ? 'dogru' : 'yanlis', geriMetni(dogru, adim, hedef));
      try { sonucta(kayit, { dizi, hedef, yanit, adim }); } catch (h) { console.error('[hafiza] sonucta hatası:', h); }
      await bekle(ctx, dogru ? GERI_DOGRU_MS : GERI_YANLIS_MS);
    }
    if (!bitti) hafizaBitir(ctx, denemeler, { merdiven, kesinti, bitince });
  }

  dongu().catch((h) => {
    console.error('[hafiza] tur hatası:', h);
    if (!bitti) hafizaBitir(ctx, denemeler, { merdiven, kesinti, bitince });
  });
}

// ---------- Özet ve bitiş ----------
/** Deneme kayıtlarının özeti. Deneme: { duzey, dogru (bool), dogruOge?, ogeSayisi? } */
export function hafizaOzeti(denemeler) {
  const n = denemeler.length;
  const dogru = denemeler.filter((d) => d.dogru).length;
  const oge = denemeler.reduce((t, d) => t + (sayi(d.ogeSayisi) ?? 0), 0);
  const ogeDogru = denemeler.reduce((t, d) => t + (sayi(d.dogruOge) ?? 0), 0);
  return {
    deneme: n,
    dogru,
    yanlis: n - dogru,
    isabet: n ? Math.round((dogru * 100) / n) : 0,
    enIyi: denemeler.reduce((m, d) => (d.dogru ? Math.max(m, d.duzey) : m), 0),
    ortDuzey: n ? Math.round((denemeler.reduce((t, d) => t + d.duzey, 0) / n) * 10) / 10 : 0,
    ogeIsabet: oge ? Math.round((ogeDogru * 100) / oge) : undefined,
    yol: denemeler.map((d) => ({ d: d.duzey, ok: !!d.dogru })), // yalnız sonuç ekranı için (dizi olduğundan kayda girmez)
  };
}

/** Turu kapatır: özet + kesinti + merdivenin son durumu → ctx.ekstra; bitince(ozet, denemeler) ek alan yazabilir; sonra ctx.bitir() */
export function hafizaBitir(ctx, denemeler, { merdiven, kesinti = 0, bitince } = {}) {
  const oz = { ...hafizaOzeti(denemeler), kesinti, sonDuzey: merdiven?.deger, donus: merdiven?.donus };
  Object.assign(ctx.ekstra, oz);
  try { bitince?.(oz, denemeler); } catch (h) { console.error('[hafiza] bitince hatası:', h); }
  ctx.bitir();
}

// ---------- Kendi rekorun ----------
export const VARSAYILAN_GOSTERGELER = Object.freeze([
  Object.freeze({ alan: 'enIyi', ad: 'En iyi dizi', yon: 'buyuk', bicim: (v) => sayiBicimle(v) }), // ilk sırada: puan ve rekor kararı
  Object.freeze({ alan: 'isabet', ad: 'Doğru dizi oranı', yon: 'buyuk', bicim: yuzdeBicimle }),
  Object.freeze({ alan: 'ogeIsabet', ad: 'Yerinde öğe', yon: 'buyuk', bicim: yuzdeBicimle }),
]);

// S14b: sonuç ekranı metinleri (dizi dışı oyunlar kendi adlarını verir: blok, liste, tahta)
export const VARSAYILAN_METINLER = Object.freeze({
  enIyi: 'En iyi dizi', deneme: 'Doğru dizi', oge: 'Yerinde öğe', yolOge: 'dizi',
  yol: 'Doğruda dizi uzadı, üst üste yanlışta kısaldı. Çubuk boyu dizinin uzunluğu.',
});

/** Aynı egzersiz, seviye ve (varsa) yöndeki önceki en iyiler: { tur, [alan]: en iyi değer } */
export function hafizaRekorlari({ modul = HAFIZA_MODUL, egzersiz, zorluk, ayrim, gostergeler = VARSAYILAN_GOSTERGELER, profilId }) {
  const liste = modulKayitlari(modul, { egzersiz, profilId })
    .filter((k) => k.zorluk === zorluk && (!ayrim || k.ekstra?.[ayrim.alan] === ayrim.deger));
  const r = { tur: liste.length };
  for (const g of gostergeler) {
    for (const k of liste) {
      const v = sayi(k.ekstra?.[g.alan] ?? k[g.alan]);
      if (v === undefined) continue;
      if (r[g.alan] === undefined || (g.yon === 'kucuk' ? v < r[g.alan] : v > r[g.alan])) r[g.alan] = v;
    }
  }
  return r;
}

/** Bu turu önceki en iyilerle karşılaştırır → [{ ad, deger, onceki, yeni, bicim }] */
export function hafizaKarsilastir(oz, rekorlar, gostergeler = VARSAYILAN_GOSTERGELER) {
  return gostergeler.map((g) => {
    const deger = sayi(oz[g.alan]);
    const onceki = sayi(rekorlar[g.alan]);
    const daha = g.yon === 'kucuk' ? deger < onceki : deger > onceki;
    return { ad: g.ad, deger, onceki, bicim: g.bicim, yeni: deger !== undefined && onceki !== undefined && daha };
  });
}

let bolumSayaci = 0;
/** Sonuç bölümü "Yarış değil, kendi rekorun" (stil: exercise.css .dikkat-rekor, dikkat oyunlarıyla ortak). kapsam: "Orta seviyede ve geri yönde" */
export function hafizaRekorBolumu(karsilastirma, ilkTur, kapsam) {
  const id = `hafiza-rekor-${++bolumSayaci}`;
  return el('section', { sinif: 'dikkat-rekor hafiza-rekor', 'aria-labelledby': id },
    el('h4', { id, metin: 'Yarış değil, kendi rekorun' }),
    el('p', { sinif: 'dikkat-rekor__not', metin: ilkTur
      ? `Bu, ${trKucuk(kapsam)} ilk turun. Sonraki turların bununla karşılaştırılacak.`
      : `${kapsam} yaptığın kendi turlarınla karşılaştırılır.` }),
    el('ul', { sinif: 'dikkat-rekor__liste' }, karsilastirma.map((g) => el('li', {
      sinif: g.yeni ? 'dikkat-rekor__oge dikkat-rekor__oge--yeni' : 'dikkat-rekor__oge' },
    el('span', { metin: g.ad }),
    el('strong', { metin: g.deger !== undefined ? g.bicim(g.deger) : '-' }),
    el('small', { metin: g.yeni ? `★ Yeni rekor (önceki ${g.bicim(g.onceki)})`
      : g.onceki !== undefined ? `Rekorun: ${g.bicim(g.onceki)}` : 'İlk ölçüm' })))));
}

/** Merdiven yolu: her denemenin uzunluğu bir çubuk (✓ doğru, ✗ yanlış; yalnız renge dayanmaz). Zorluğun nasıl uyduğunu gösterir */
export function merdivenYolu(yol, { enCok = 9, birim = 'öğe', aciklama = VARSAYILAN_METINLER.yol, oge = VARSAYILAN_METINLER.yolOge } = {}) {
  if (!yol?.length) return null;
  const id = `hafiza-yol-${++bolumSayaci}`;
  return el('section', { sinif: 'hafiza-yol', 'aria-labelledby': id },
    el('h4', { id, metin: 'Merdivenin' }),
    el('p', { metin: aciklama }),
    el('ol', { sinif: 'hafiza-yol__liste' }, yol.map((a, i) => el('li', {
      sinif: `hafiza-yol__adim hafiza-yol__adim--${a.ok ? 'dogru' : 'yanlis'}`, style: `--d: ${a.d}; --en-cok: ${enCok}` },
    el('span', { sinif: 'ekran-okuyucu', metin: `${i + 1}. ${oge}: ${a.d} ${birim}, ${a.ok ? 'doğru' : 'yanlış'}` }),
    el('span', { 'aria-hidden': 'true', metin: String(a.d) }),
    el('span', { 'aria-hidden': 'true', metin: a.ok ? '✓' : '✗' })))));
}

/** Kısa, cezalandırmayan mesaj + rastgele bir strateji ipucu */
export function hafizaMesaji(oz, { birim = 'öğe', ipuclari = [] } = {}) {
  if (!oz?.deneme) return 'Bu turda dizi tamamlanmadı. Hazır olduğunda yeniden dene.';
  const parca = [oz.enIyi
    ? `Bu turda doğru hatırladığın en uzun dizi ${oz.enIyi} ${birim}.`
    : 'Bu turda diziler henüz tam tutmadı; bir sonraki tur daha kısa dizilerle başlar.'];
  parca.push('Merdiven diziyi senin için zorlayıcı ama yapılabilir uzunlukta tutar; bu yüzden bazı yanlışlar beklenen bir şey.');
  if (oz.enIyi) parca.push(`Bir sonraki hedef: en iyi dizini ${oz.enIyi + 1} yapmak.`);
  if (ipuclari.length) parca.push(`İpucu: ${ipuclari[Math.floor(Math.random() * ipuclari.length)]}`);
  return parca.join(' ');
}

/** Çerçevenin degerlendir sonucu: puan (en iyi dizi), satırlar, mesaj, merdiven yolu + rekor bölümü */
export function hafizaDegerlendir(ham, {
  modul = HAFIZA_MODUL, egzersiz, gostergeler = VARSAYILAN_GOSTERGELER, ayrim, kapsam, satirlar = [], birim = 'öğe', enCok = 9, ipuclari,
  metinler, mesaj,
}) {
  const e = ham.ekstra ?? {};
  const m = { ...VARSAYILAN_METINLER, ...metinler };
  const rekorlar = hafizaRekorlari({ modul, egzersiz, zorluk: ham.zorluk, ayrim, gostergeler }); // kayıttan önce: bu tur dahil değil
  const karsilastirma = hafizaKarsilastir(e, rekorlar, gostergeler);
  const ek = document.createDocumentFragment();
  const yol = merdivenYolu(e.yol, { enCok, birim, aciklama: m.yol, oge: m.yolOge });
  if (yol) ek.append(yol);
  ek.append(hafizaRekorBolumu(karsilastirma, rekorlar.tur === 0, kapsam));
  return {
    dogru: e.dogru ?? 0,
    yanlis: e.yanlis ?? 0,
    isabet: e.isabet ?? 0,
    puan: sayi(e[gostergeler[0].alan]) ?? 0,
    yeniRekor: karsilastirma[0].yeni,
    satirlar: [
      [m.enIyi, e.enIyi ? `${e.enIyi} ${birim}` : '-'],
      [m.deneme, `${e.dogru ?? 0}/${e.deneme ?? 0} (${yuzdeBicimle(e.isabet)})`],
      [m.oge, e.ogeIsabet !== undefined ? yuzdeBicimle(e.ogeIsabet) : '-'],
      ...satirlar,
      ['Süre', sureMetni(ham.sureSn)],
    ],
    mesaj: mesaj?.(e, { birim, ipuclari }) ?? hafizaMesaji(e, { birim, ipuclari }),
    ek,
  };
}

// ---------- Çerçeve tanımı ----------
/**
 * Hafıza oyunu tanımını çerçeve için tamamlar: modül, tempo seviyeleri, yön seçimi (ileri/geri; yonler: false ile kapanır),
 * merdiven (başlangıç önceki turdan), sayaçsız sonuç ekranı, ortak değerlendirme ve rekor bölümü.
 * t: { egzersiz, ad, nasil, seviyeler, baslat(ctx, { mod, ters, merdiven, deneme }), birim?, baslangic? (sayı | { ileri, geri }),
 *      sinir? { en, enCok }, merdiven? { yukselt, dusur }, deneme?, ipuclari? [metin | { mod, metin }], gostergeler?, ekSatirlar?(ekstra), yonler? }
 * S14b ekleri: seviyeler[i].sinir (o seviyede düzey sınırı), yonBaslik? ('Yön'), yonKapsam?(yon) → "harf modunda",
 *      metinler? (VARSAYILAN_METINLER'i ezer), mesaj?(ekstra, { birim, ipuclari }) → sonuç mesajı
 */
export function hafizaOyunu(t) {
  const yonler = t.yonler === false ? null : (t.yonler ?? YONLER);
  const alan = yonler ? 'mod' : null;
  const sinir = { en: 2, enCok: 9, ...t.sinir };
  const sinirAl = (zorluk) => ({ ...sinir, ...t.seviyeler?.[zorluk - 1]?.sinir }); // S14b: seviyeye özel sınır
  const yonBaslik = t.yonBaslik ?? 'Yön';
  const birim = t.birim ?? 'öğe';
  const secim = { mod: undefined };
  const modBul = () => {
    secim.mod ??= sonEkstra({ egzersiz: t.egzersiz, alan: 'mod' });
    if (!yonler.some((y) => y.deger === secim.mod)) secim.mod = yonler[0].deger;
    return secim.mod;
  };

  const tanim = {
    modul: HAFIZA_MODUL,
    sayacYok: true,
    rekorBolumuVar: true, // rekor kararı ve metni sonuç bölümünde
    puanEtiketi: 'En iyi dizi',
    puanAciklama: 'Bu turda doğru hatırladığın en uzun dizinin uzunluğu.',
    sureNotu: 'Süre sınırı yok; bir tur yaklaşık 3-4 dakika sürer. İstediğin an duraklatabilirsin.',
    ...t,
  };
  if (yonler) {
    tanim.hazirlik ??= () => hazirlikSecimi({
      ad: 'hafiza-yon', baslik: yonBaslik, secenekler: yonler, secili: modBul(), degisince: (d) => { secim.mod = d; },
    });
  }
  tanim.baslat = (ctx) => {
    // S17: seviye testi sabit ayar verir (ctx.olcum: mod, baslangic, deneme); verilince önceki kayıtlar kullanılmaz
    const olcum = ctx.olcum ?? {};
    const mod = yonler ? (yonler.some((y) => y.deger === olcum.mod) ? olcum.mod : modBul()) : undefined;
    const varsayilan = typeof t.baslangic === 'object' ? t.baslangic?.[mod] : t.baslangic;
    const s = sinirAl(ctx.zorluk);
    const baslangic = sayi(olcum.baslangic) !== undefined
      ? sinirla(Math.round(olcum.baslangic), s.en, s.enCok)
      : baslangicDuzeyi({ egzersiz: t.egzersiz, ayrim: alan ? { alan, deger: mod } : undefined, varsayilan: varsayilan ?? 3, ...s });
    const merdiven = merdivenOlustur({ baslangic, ...s, ...t.merdiven });
    Object.assign(ctx.ekstra, { baslangic, gosterMs: sayi(ctx.seviye?.gosterMs) }, alan ? { [alan]: mod } : {});
    t.baslat(ctx, { mod, ters: mod === 'geri', merdiven, deneme: sayi(olcum.deneme) ?? t.deneme ?? 12 });
  };
  tanim.degerlendir ??= (ham) => {
    const e = ham.ekstra ?? {};
    const yon = yonler?.find((y) => y.deger === e.mod);
    const seviyeAdi = tanim.seviyeler?.[ham.zorluk - 1]?.ad ?? '';
    const yonMetni = yon && (t.yonKapsam?.(yon) ?? `${trKucuk(yon.etiket)} yönde`);
    const kapsam = `${seviyeAdi} seviyede${yonMetni ? ` ve ${yonMetni}` : ''}`;
    let ekSatir = [];
    try { ekSatir = t.ekSatirlar?.(e) ?? []; } catch (h) { console.error('[hafiza] ekSatirlar hatası:', h); }
    return hafizaDegerlendir(ham, {
      egzersiz: t.egzersiz, gostergeler: t.gostergeler, ayrim: alan ? { alan, deger: e.mod } : undefined, kapsam, birim,
      enCok: sinirAl(ham.zorluk).enCok, metinler: t.metinler, mesaj: t.mesaj,
      // İpucu metin ya da { mod, metin }: yöne özel ipucu yalnız o yönde gösterilir
      ipuclari: (t.ipuclari ?? []).filter((i) => typeof i === 'string' || i.mod === e.mod).map((i) => i.metin ?? i),
      satirlar: [
        ...(yon ? [[yonBaslik, `${yon.etiket} (${yon.aciklama})`]] : []),
        ...(sayi(e.gosterMs) !== undefined ? [['Gösterim', `${sayiBicimle(e.gosterMs / 1000, 1)} sn`]] : []),
        ...ekSatir,
      ],
    });
  };
  return tanim;
}

/** Ekran okuyucuya gösterilen öğeyi okutur (gösterim görsel; aria-hidden alanlar için) */
export const ogeDuyur = (metin) => duyur(String(metin));
