// Dikkat oyunları ortak ölçüm altyapısı (S11a; S11b: dikkatBitir, denemeye özel ara, ekBolum): deneme döngüsü, tepki süresi (performance.now), doğruluk, ortalama, tutarlılık (değişkenlik katsayısı), 1-5 basamak, kişisel rekor ve sonuç bölümü. Yeni dikkat oyunu = tek dosya + dikkatOyunu()
import { el } from '../core/ui.js';
import { karistir, sayi, sinirla, sayiBicimle, yuzdeBicimle, sureMetni } from '../core/utils.js';
import { modulKayitlari } from '../core/metrics.js';
import { geriYaz } from './algi.js';

/*
 * KULLANIM (S11b ve sonraki dikkat oyunları):
 *   export default dikkatOyunu({ egzersiz, ad, nasil, basamaklar: [5 ayar], baslat(ctx) {...}, ekSatirlar?(ekstra), ekBolum?(ekstra) → Node });
 *   baslat içinde: const sahne = dikkatSahnesi(ctx, { ust });
 *                  const tur = dikkatTuru(ctx, { plan, pencereMs, goster, gizle, dogruMu?, sonucta?, bitince? });
 *                  dokunuş/tuşta: tur.yanitla(yanit, olay)
 *   Deneme döngüsü olmayan oyun (ör. iptal testi): kayıtları kendisi üretir, sonunda dikkatBitir(ctx, kayitlar)
 *   Kayda giden: dogru, yanlis (deneme − doğru), puan (dikkat puanı), zorluk (1-5),
 *   ekstra: { deneme, atlanan, onTepki, kesinti, isabet, ortMs, medyanMs, sapmaMs, cv, tutarlilik, turMs: {tur: ms}, + oyunun alanları }
 */

export const ON_TEPKI_MS = 150;      // uyarandan bu kadar kısa sürede gelen tepki tahmindir: "ön tepki", ortalamaya girmez, hata sayılır
export const KESINTI_MS = 40;        // deneme sürerken duraklatma/sekme değişimi olduysa deneme yinelenir (süre bozulmasın)
export const DOGRULUK_ESIGI = 70;    // bunun altında hız ve tutarlılık rekoru tutulmaz
const ILERI_ESIK = 85;               // doğruluk ≥%85 ve ön tepki ≤%10 → bir üst basamak
const GERI_ESIK = 60;                // doğruluk <%60 → bir alt basamak
export const BASAMAK_ADLARI = Object.freeze(['Isınma', 'Kolay', 'Orta', 'Zor', 'Usta']);

// ---------- Basamaklar ve deneme planı ----------
/** 5 basamak ayarına ad ekler → çerçevenin seviyeler dizisi */
export function basamaklar(ayarlar) {
  if (!Array.isArray(ayarlar) || ayarlar.length !== BASAMAK_ADLARI.length) {
    throw new TypeError('basamaklar: 5 basamak ayarı gerekli.');
  }
  return Object.freeze(ayarlar.map((a, i) => Object.freeze({ ad: BASAMAK_ADLARI[i], ...a })));
}

/** Toplamın oranı kadar tam sayı (en az 0, en çok toplam) */
export const oranliAdet = (toplam, oran) => sinirla(Math.round(toplam * (sayi(oran) ?? 0)), 0, toplam);

/**
 * Tür adetlerinden karışık sıra: denemePlani({ uyumlu: 12, uyumsuz: 12 }, { enCokArdisik: 4 | { git: 6, dur: 2 } }) → ['uyumlu', ...]
 * Ardışık sınır sağlanamazsa son karışık sıra döner.
 */
export function denemePlani(adetler, { enCokArdisik = 4 } = {}) {
  const liste = Object.entries(adetler).flatMap(([tur, n]) => Array(Math.max(0, Math.round(n))).fill(tur));
  const sinir = (t) => (typeof enCokArdisik === 'number' ? enCokArdisik : (enCokArdisik[t] ?? Infinity));
  let sira = karistir(liste);
  for (let d = 0; d < 300; d++) {
    let seri = 1;
    let uygun = true;
    for (let i = 1; i < sira.length && uygun; i++) {
      seri = sira[i] === sira[i - 1] ? seri + 1 : 1;
      if (seri > sinir(sira[i])) uygun = false;
    }
    if (uygun) return sira;
    sira = karistir(liste);
  }
  return sira;
}

// ---------- Ölçüm ----------
/** Olayın gerçekleştiği an (ms, performance.now ile aynı saat). event.timeStamp geçersizse şimdi */
export function olayZamani(olay) {
  const simdi = performance.now();
  const t = sayi(olay?.timeStamp);
  return t !== undefined && t > 0 && t <= simdi + 1 && simdi - t < 1000 ? t : simdi;
}

/** Süre listesinin özeti: { n, ortMs, medyanMs, sapmaMs, cv (%) } */
export function istatistik(sureler) {
  const s = sureler.filter((x) => sayi(x) !== undefined);
  const n = s.length;
  if (!n) return { n: 0 };
  const ort = s.reduce((t, x) => t + x, 0) / n;
  const sirali = [...s].sort((a, b) => a - b);
  const orta = Math.floor(n / 2);
  const medyan = n % 2 ? sirali[orta] : (sirali[orta - 1] + sirali[orta]) / 2;
  const sapma = n > 1 ? Math.sqrt(s.reduce((t, x) => t + (x - ort) ** 2, 0) / (n - 1)) : 0;
  return { n, ortMs: Math.round(ort), medyanMs: Math.round(medyan), sapmaMs: Math.round(sapma), cv: Math.round((sapma / ort) * 1000) / 10 };
}

/** Tutarlılık = 100 − değişkenlik katsayısı (en az 4 tepki gerekir); yüksek = tepki süreleri birbirine yakın */
export const tutarlilikPuani = (cv, n) => (n >= 4 && sayi(cv) !== undefined ? sinirla(Math.round(100 - cv), 0, 100) : undefined);

/** Dikkat puanı: doğruluk oranı × dakikadaki tepki (60000 ÷ ort. tepki ms). %100 doğruluk ve 600 ms → 100 */
export function etkinlikPuani(isabet, ortMs) {
  const o = sayi(ortMs);
  return o > 0 ? Math.round(((sayi(isabet) ?? 0) / 100) * (60000 / o)) : 0;
}

export const msMetni = (ms) => (sayi(ms) !== undefined ? `${sayiBicimle(ms)} ms` : '-');

/**
 * Deneme kayıtlarının özeti. Kayıt: { tur, beklenen: 'tepki'|'bekle'|null, sonuc: 'dogru'|'yanlis'|'atlandi'|'on-tepki', rtMs? }
 * Ortalama ve tutarlılık yalnız doğru tepkilerden; doğruluk = doğru ÷ tüm kayıtlar (ara erken dokunuşlar dahil)
 */
export function ozetle(kayitlar) {
  const say = (s) => kayitlar.filter((k) => k.sonuc === s).length;
  const deneme = kayitlar.length;
  const dogru = say('dogru');
  const dogruRt = (liste) => liste.filter((k) => k.sonuc === 'dogru' && sayi(k.rtMs) !== undefined).map((k) => k.rtMs);
  const ist = istatistik(dogruRt(kayitlar));
  const turMs = {};
  for (const tur of new Set(kayitlar.map((k) => k.tur).filter(Boolean))) {
    const t = istatistik(dogruRt(kayitlar.filter((k) => k.tur === tur)));
    if (t.n) turMs[tur] = t.ortMs;
  }
  return {
    deneme, dogru, yanlis: say('yanlis'), atlanan: say('atlandi'), onTepki: say('on-tepki'),
    isabet: deneme ? Math.round((dogru * 100) / deneme) : 0,
    ortMs: ist.ortMs, medyanMs: ist.medyanMs, sapmaMs: ist.sapmaMs, cv: ist.cv,
    tutarlilik: tutarlilikPuani(ist.cv, ist.n), turMs,
  };
}

// ---------- Deneme döngüsü ----------
const rastgeleArasi = ([en, enCok]) => en + Math.random() * Math.max(0, enCok - en);

/**
 * Bir turu yürütür: ara (odak işareti) → uyaran (rAF karesinde gösterilir, t0 ölçülür) → yanıt penceresi → geri bildirim.
 * plan: [{ beklenen: 'tepki'|'bekle', tur?, ...oyun alanları }]
 * uyaranMs: uyaranın görünme süresi (Infinity: pencere bitene kadar); pencereMs: yanıt süresi; araMs: [en, enCok]; geriMs: geri bildirim süresi
 * goster(d), gizle(d), dogruMu(d, yanit) → bool, sonucta(kayit, d|null), ilerleme(sira, toplam), bitince(ozet, kayitlar) (ctx.ekstra'ya ek yazılabilir)
 * Duraklatma çerçevenin zamanlayıcısıyla uyumludur; uyaran açıkken duraklatılan deneme yinelenir.
 * Döner: { yanitla(yanit, olay) → işlendiyse true }
 */
export function dikkatTuru(ctx, {
  plan, uyaranMs = Infinity, pencereMs, araMs = [500, 1000], geriMs = 300,
  araSonucu = 'on-tepki', // ara sırasındaki dokunuşun sonucu (Gece Nöbeti: 'yanlis' = yanlış alarm)
  goster, gizle = () => {}, dogruMu = () => true, sonucta = () => {}, ilerleme = () => {}, bitince = () => {},
}) {
  const kayitlar = [];
  let sira = 0;
  let kesinti = 0;
  let asama = 'bekle'; // bekle | ara | hazir | uyaran | geri | bitti
  let deneme = null;
  let t0 = 0;
  let g0 = 0;
  let iptaller = [];
  let bitti = false;
  const temizle = () => { iptaller.forEach((f) => f()); iptaller = []; };
  ctx.temizlenince(() => { bitti = true; temizle(); });

  function araBaslat() {
    if (bitti) return;
    if (sira >= plan.length) { turuBitir(); return; }
    deneme = plan[sira];
    asama = 'ara';
    ilerleme(sira + 1, plan.length);
    // S11b: deneme kendi arasını verebilir (d.araMs); yoksa araMs aralığından rastgele
    iptaller.push(ctx.sonra(uyaranHazirla, sayi(deneme.araMs) ?? rastgeleArasi(araMs)));
  }

  function uyaranHazirla() {
    asama = 'hazir';
    requestAnimationFrame(() => {
      if (bitti || asama !== 'hazir') return;
      if (!ctx.aktifMi()) { iptaller.push(ctx.sonra(uyaranHazirla, 0)); return; } // duraklatıldı: devam edince göster
      goster(deneme);
      t0 = performance.now(); // görüntü bu karede çizilir (sapma en çok 1 kare)
      g0 = ctx.gecenSn() * 1000;
      asama = 'uyaran';
      if (Number.isFinite(uyaranMs) && uyaranMs < pencereMs) iptaller.push(ctx.sonra(() => gizle(deneme), uyaranMs));
      // Pencere dolunca da kesinti denetlenir: duraklatılıp yanıtsız kalan deneme yinelenir
      iptaller.push(ctx.sonra(() => {
        if (kesildiMi()) yinele();
        else denemeyiBitir(deneme.beklenen === 'bekle' ? 'dogru' : 'atlandi');
      }, pencereMs));
    });
  }

  function denemeyiBitir(sonuc, rtMs, yanit) {
    if (asama !== 'uyaran') return;
    temizle();
    gizle(deneme);
    const k = { tur: deneme.tur ?? null, beklenen: deneme.beklenen, sonuc, rtMs, yanit };
    kayitlar.push(k);
    sira += 1;
    asama = 'geri';
    sonucta(k, deneme);
    iptaller.push(ctx.sonra(araBaslat, geriMs));
  }

  // Uyaran açıkken duraklatma/sekme değişimi oldu mu? (duvar saati − oyun saati)
  const kesildiMi = () => (performance.now() - t0) - (ctx.gecenSn() * 1000 - g0) > KESINTI_MS;

  function yinele() {
    if (asama !== 'uyaran') return;
    temizle();
    gizle(deneme);
    kesinti += 1;
    asama = 'geri';
    iptaller.push(ctx.sonra(araBaslat, geriMs));
  }

  function yanitla(yanit, olay) {
    if (bitti || !ctx.aktifMi()) return false;
    const t = olayZamani(olay);
    if (asama === 'ara' || asama === 'hazir') {
      const k = { tur: null, beklenen: null, sonuc: araSonucu, erken: true };
      kayitlar.push(k);
      sonucta(k, null);
      return true;
    }
    if (asama !== 'uyaran') return false; // geri bildirim sırasında gelen dokunuş sayılmaz
    if (kesildiMi()) { yinele(); return true; }
    const rt = Math.round(t - t0);
    if (rt < ON_TEPKI_MS) denemeyiBitir('on-tepki', rt, yanit);
    else if (deneme.beklenen === 'bekle') denemeyiBitir('yanlis', rt, yanit);
    else denemeyiBitir(dogruMu(deneme, yanit) ? 'dogru' : 'yanlis', rt, yanit);
    return true;
  }

  function turuBitir() {
    asama = 'bitti';
    dikkatBitir(ctx, kayitlar, { kesinti, bitince });
  }

  iptaller.push(ctx.sonra(araBaslat, 400));
  return { yanitla };
}

/**
 * S11b: Turu kayıtlarla kapatır (dikkatTuru da bunu kullanır; deneme döngüsü olmayan oyunlar doğrudan çağırır).
 * ozetle(kayitlar) + kesinti → ctx.ekstra; bitince(ozet, kayitlar) ek alan yazabilir; sonra ctx.bitir()
 */
export function dikkatBitir(ctx, kayitlar, { kesinti = 0, bitince } = {}) {
  const oz = { ...ozetle(kayitlar), kesinti };
  Object.assign(ctx.ekstra, oz, { yanlis: oz.deneme - oz.dogru });
  try { bitince?.(oz, kayitlar); } catch (h) { console.error('[dikkat] bitince hatası:', h); }
  ctx.bitir();
}

// ---------- Oyun alanı ----------
/** Ortak düzen: üst satır (oyunun görevi + deneme sayısı), sahne, geri bildirim satırı. Döner: { sahne, durum, geri, ilerle(n, toplam), geriYaz(sonuc, metin), temizle() } */
export function dikkatSahnesi(ctx, { ust = null, sahneSinif = '' } = {}) {
  ctx.alan.classList.add('dikkat-alan');
  // Basılı tutulan Enter/Boşluk tekrar tekrar yanıt üretmesin (odaktaki düğmenin click'i de engellenir)
  ctx.alan.addEventListener('keydown', (e) => {
    if (e.repeat && (e.key === 'Enter' || e.key === ' ')) e.preventDefault();
  }, true);
  // Hızlı akışta her denemeyi duyurmak gecikme yaratır; sonuç turun sonunda çerçevece duyurulur
  const durum = el('p', { sinif: 'dikkat-durum', 'aria-live': 'off' });
  const geri = el('p', { sinif: 'dikkat-geri', 'aria-live': 'off' });
  const sahne = el('div', { sinif: `dikkat-sahne ${sahneSinif}`.trim() });
  ctx.alan.append(el('div', { sinif: 'dikkat-ust' }, ust, durum), sahne, geri);
  return {
    sahne, durum, geri,
    ilerle: (n, toplam) => { durum.textContent = `Deneme ${n}/${toplam}`; },
    geriYaz: (sonuc, metin) => geriYaz(geri, sonuc, metin),
    temizle: () => geriYaz(geri, null, ''),
  };
}

/** Tek tuşlu oyunlar: sahneye dokunuş (pointerdown; sahnede kaydırma yok) ya da alanda Boşluk/Enter → tur.yanitla(true) */
export function dokunusBagla(ctx, sahne, tur) {
  sahne.classList.add('dikkat-sahne--dokun');
  sahne.addEventListener('pointerdown', (e) => {
    if (!e.isPrimary || e.button > 0) return;
    e.preventDefault();
    tur.yanitla(true, e);
  });
  ctx.alan.addEventListener('keydown', (e) => {
    if (e.key !== ' ' && e.key !== 'Enter') return;
    e.preventDefault();
    if (!e.repeat) tur.yanitla(true, e);
  });
}

// ---------- Basamak, rekor, sonuç ----------
/** Sonraki basamak (1-5): doğruluk ≥%85 ve ön tepki ≤%10 → +1; doğruluk <%60 → −1 */
export function basamakOner(zorluk, oz, enCok = BASAMAK_ADLARI.length) {
  const z = sayi(zorluk) ?? 1;
  if (!oz?.deneme) return z;
  if (oz.isabet >= ILERI_ESIK && (oz.onTepki ?? 0) / oz.deneme <= 0.1) return Math.min(enCok, z + 1);
  if (oz.isabet < GERI_ESIK) return Math.max(1, z - 1);
  return z;
}

/** Aynı egzersiz ve basamaktaki önceki en iyiler: { tur, isabet, ortMs, tutarlilik, puan } (hız/tutarlılık yalnız doğruluk ≥%70 turlardan) */
// ayrim: { alan, deger } verilirse yalnız ekstra[alan] aynı olan turlar (ör. Stroop ipucu açık/kapalı ayrı)
export function rekorlariGetir({ modul, egzersiz, zorluk, profilId, ayrim }) {
  const liste = modulKayitlari(modul, { egzersiz, profilId }).filter((k) => k.zorluk === zorluk
    && (!ayrim || !!k.ekstra?.[ayrim.alan] === !!ayrim.deger));
  const r = { tur: liste.length };
  for (const k of liste) {
    const e = k.ekstra ?? {};
    const is = sayi(e.isabet);
    const yeterli = (is ?? 0) >= DOGRULUK_ESIGI;
    if (is !== undefined) r.isabet = Math.max(r.isabet ?? 0, is);
    if (yeterli && sayi(e.ortMs) !== undefined) r.ortMs = Math.min(r.ortMs ?? Infinity, e.ortMs);
    if (yeterli && sayi(e.tutarlilik) !== undefined) r.tutarlilik = Math.max(r.tutarlilik ?? 0, e.tutarlilik);
    if (sayi(k.puan) !== undefined) r.puan = Math.max(r.puan ?? 0, k.puan);
  }
  return r;
}

const GOSTERGELER = Object.freeze([
  { alan: 'puan', ad: 'Dikkat puanı', yon: 'buyuk', bicim: sayiBicimle }, // ilk sırada kalmalı (dikkatDegerlendir)
  { alan: 'isabet', ad: 'Doğruluk', yon: 'buyuk', bicim: yuzdeBicimle },
  { alan: 'ortMs', ad: 'Ortalama tepki', yon: 'kucuk', bicim: msMetni, dogrulukla: true },
  { alan: 'tutarlilik', ad: 'Tutarlılık', yon: 'buyuk', bicim: yuzdeBicimle, dogrulukla: true },
]);

/** Bu turu önceki en iyilerle karşılaştırır → [{ ad, deger, onceki, yeni, bicim, not? }] */
export function rekorKarsilastir(oz, rekorlar) {
  return GOSTERGELER.map((g) => {
    const deger = sayi(oz[g.alan]);
    const onceki = sayi(rekorlar[g.alan]);
    const sayilir = !g.dogrulukla || oz.isabet >= DOGRULUK_ESIGI;
    const daha = g.yon === 'kucuk' ? deger < onceki : deger > onceki;
    return { ad: g.ad, deger, onceki, bicim: g.bicim, yeni: sayilir && deger !== undefined && onceki !== undefined && daha,
      not: !sayilir && deger !== undefined ? `Doğruluk %${DOGRULUK_ESIGI} ve üstü olunca rekora sayılır` : undefined };
  });
}

let rekorSayaci = 0;
/** Sonuç ekranı bölümü: "Yarış değil, kendi rekorun" */
export function rekorBolumu(karsilastirma, ilkTur) {
  const id = `dikkat-rekor-${++rekorSayaci}`;
  return el('section', { sinif: 'dikkat-rekor', 'aria-labelledby': id },
    el('h4', { id, metin: 'Yarış değil, kendi rekorun' }),
    el('p', { sinif: 'dikkat-rekor__not', metin: ilkTur
      ? 'Bu basamaktaki ilk turun. Sonraki turlarını bununla karşılaştıracağız.'
      : 'Yalnızca bu basamaktaki kendi turlarınla karşılaştırılır.' }),
    el('ul', { sinif: 'dikkat-rekor__liste' }, karsilastirma.map((g) => el('li', {
      sinif: g.yeni ? 'dikkat-rekor__oge dikkat-rekor__oge--yeni' : 'dikkat-rekor__oge' },
    el('span', { metin: g.ad }),
    el('strong', { metin: g.deger !== undefined ? g.bicim(g.deger) : '-' }),
    el('small', { metin: g.yeni ? `★ Yeni rekor (önceki ${g.bicim(g.onceki)})`
      : g.not ?? (g.onceki !== undefined ? `Rekorun: ${g.bicim(g.onceki)}` : 'İlk ölçüm') })))));
}

/** Kısa, cezalandırmayan geri bildirim ("henüz", "bir sonraki hedef") */
export function dikkatMesaji(oz) {
  if (!oz?.deneme) return 'Bu turda yanıt olmadı. Hazır olduğunda yeniden dene.';
  const parca = [];
  if (oz.onTepki >= Math.max(2, oz.deneme * 0.1)) parca.push('Bazı dokunuşlar uyaran görünmeden geldi; önce bak, sonra dokun.');
  if (oz.isabet < DOGRULUK_ESIGI) parca.push(`Doğruluk henüz %${DOGRULUK_ESIGI}’in altında. Bir sonraki hedef: acele etmeden doğru yanıt; hız arkasından gelir.`);
  else if (oz.tutarlilik !== undefined && oz.tutarlilik < 60) parca.push('Doğruluğun iyi. Tepki sürelerin turda epey değişti; bir sonraki hedef aynı ritmi korumak.');
  else parca.push('Doğruluğun ve ritmin dengeli. Bir sonraki hedef: kendi rekorunu geçmek.');
  return parca.join(' ');
}

/** Çerçevenin degerlendir sonucu: satırlar, puan, mesaj, rekor bölümü, sonraki basamak */
export function dikkatDegerlendir(ham, { modul, egzersiz, satirlar = [], rekorAyrimi }) {
  const e = ham.ekstra ?? {};
  const deneme = e.deneme ?? 0;
  const dogru = e.dogru ?? 0;
  const puan = etkinlikPuani(e.isabet, e.ortMs);
  const ayrim = rekorAyrimi ? { alan: rekorAyrimi, deger: e[rekorAyrimi] } : undefined;
  const rekorlar = rekorlariGetir({ modul, egzersiz, zorluk: ham.zorluk, ayrim }); // kayıttan önce çağrılır: bu tur dahil değil
  const karsilastirma = rekorKarsilastir({ ...e, puan }, rekorlar);
  return {
    dogru,
    yanlis: deneme - dogru,
    isabet: e.isabet ?? 0,
    puan,
    yeniRekor: karsilastirma[0].yeni, // puan satırı: çerçevenin başlığı ve rozeti bu bölümle aynı kararı verir
    satirlar: [
      ['Doğruluk', `${yuzdeBicimle(e.isabet)} (${dogru}/${deneme})`],
      ['Ortalama tepki', msMetni(e.ortMs)],
      ['Tutarlılık', e.tutarlilik !== undefined ? yuzdeBicimle(e.tutarlilik) : '-'],
      ...satirlar,
      ['Ön tepki', e.onTepki ?? 0],
      ['Süre', sureMetni(ham.sureSn)],
    ],
    mesaj: dikkatMesaji(e),
    ek: rekorBolumu(karsilastirma, rekorlar.tur === 0),
    sonrakiSeviye: basamakOner(ham.zorluk, e),
  };
}

/** Dikkat oyunu tanımını çerçeve için tamamlar: modül, 5 basamak, sayaçsız ekran, otomatik basamak, ortak puan ve değerlendirme */
export function dikkatOyunu(t) {
  const tanim = {
    modul: 'dikkat',
    sayacYok: true,
    otomatikSeviye: true,
    puanEtiketi: 'Dikkat puanı',
    rekorBolumuVar: true, // rekor kararı ve metni sonuç bölümünde (çerçeve tekrar yazmaz)
    puanAciklama: 'Doğruluk oranı × dakikadaki tepki. Doğru yanıt arttıkça ve tepkiler kısaldıkça yükselir.',
    ...t,
    seviyeler: basamaklar(t.basamaklar),
  };
  tanim.degerlendir ??= (ham) => {
    const d = dikkatDegerlendir(ham, {
      modul: tanim.modul, egzersiz: tanim.egzersiz, satirlar: tanim.ekSatirlar?.(ham.ekstra ?? {}) ?? [],
      rekorAyrimi: tanim.rekorAyrimi,
    });
    // S11b: oyuna özel sonuç bölümü (ekBolum(ekstra) → Node) rekor bölümünün önüne eklenir
    let ek = null;
    try { ek = tanim.ekBolum?.(ham.ekstra ?? {}) ?? null; } catch (h) { console.error('[dikkat] ekBolum hatası:', h); }
    if (ek instanceof Node) {
      const parca = document.createDocumentFragment();
      parca.append(ek, d.ek);
      d.ek = parca;
    }
    return d;
  };
  return tanim;
}
