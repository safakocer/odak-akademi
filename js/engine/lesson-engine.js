// Ders motoru (S15; S21: okuma stratejisi dersleri): data/lessons/<ad>.json dersini yükler, denetler ve oynatır. Hafıza tekniği: ön deneme → anlat → birlikte yap → kendin dene → ölç. Okuma stratejisi: anlat → örnek metin → görev → mini sınama → sonuç
import { el, spriteIkon } from '../core/ui.js';
import { duyur, odakla } from '../core/a11y.js';
import { trKucuk, karistir, sureBicimle, sureMetni, yuzdeBicimle, sayiBicimle } from '../core/utils.js';
import { kayitEkle, modulKayitlari } from '../core/metrics.js';
import { sesCal } from '../core/sound.js';
import { sorulariDenetle, soruOturumuKur, gozdenGecirmeOlustur } from './quiz-engine.js';

/*
 * HAFIZA TEKNİĞİ DERSİ (data/lessons/<ad>.json, tur yok):
 * { surum, ad, baslik, kisaAciklama, sureDk,
 *   anlat: { baslik?, paragraflar[], ornek?: { baslik, satirlar[] }, not? },
 *   birlikte: { yonerge, adimlar: [{ metin, sahne? }] (≥2), kontrol: { soru, secenekler[2-4], dogru (sıra), aciklama } },
 *   kendin: { tur: metin|satirlar, yonerge, ipuclari[], onerilenSn (30-300), etiket?, yerTutucu?,
 *             etiketler? (satır adları; yoksa satırlar ölçüm öğelerinden), ogeyleEsle? (etiket → öğe), satirIpuclari? },
 *   olcum: { tur: liste|esler, siraOnemli? (liste), calismaSn (10-120), araSn (5-60), konu?, hatirlaYonerge?, araYonerge?,
 *            once/sonra: liste → { ogeler: [tek kelime] } · esler → { esler: [{ ipucu, okunus?, cevap: [kabul edilen] }] } (iki taraf eşit uzunlukta) },
 *   kapanis? }
 * Kayıt: modul hafiza, egzersiz teknik-<ad>, zorluk 1, dogru/yanlis = sonraki ölçüm, ekstra { tur, once, sonra, toplam, fark, onceSira?, sonraSira?, kendinSn }
 *
 * S21 OKUMA STRATEJİSİ DERSİ (tur: "strateji"):
 * { surum, tur, ad, baslik, kisaAciklama, sureDk, kazanim, anlat (yukarıdaki gibi),
 *   metin: { baslik, yonerge, bolumler: [{ araBaslik?, paragraflar[] }] (≥1), gorsel?: { simgeler[], aciklama },
 *            tablo?: { baslik, sutunlar[≥2], satirlar[[hücre]] }, grafik?: { baslik, birim, veriler: [{ etiket, deger ≥0 }] (2-8) },
 *            onizleme? (true: önce yalnız başlık, görsel, ara başlıklar), onizlemeYonerge?, onGorev?: [Parça] (önizlemede) },
 *   gorev: { yonerge, metinAcik? (metin kutusu açık gelir), parcalar: [Parça] (1-5) },
 *   sinama: { yonerge?, sorular: [3 soru, quiz-engine soru şeması] },
 *   kapanis? }
 * Parça (baslik? hepsinde): not { kimlik (a-z0-9-), soru, ipucu?, yerTutucu?, goster? (önceki notun kimliği), gosterBaslik? } (puanlanmaz, kaydedilmez)
 *   · sorular { sorular: [1-4 soru] } (listede en çok bir tane) · isaretle { yonerge, secenekler[2-8], dogru: [sıra], aciklama }
 *   · eslestir { yonerge, kategoriler[2-6], ogeler: [{ metin, dogru: kategori sırası }] (2-8), aciklama }
 * Kayıt: modul oku, egzersiz strateji-<ad>, zorluk 1, dogru/yanlis = mini sınama, ekstra { tur: strateji, sinama (%), sinamaPuan, soru,
 *   katman { bilgi, cikarim, yorum: % }, gorev? (puanlanan görev %), okumaSn, gorevSn }. anlamaYuzde yazılmaz (okuma anlaması değil).
 */

export const DERS_MODUL = 'hafiza';
export const DERS_ADLARI = Object.freeze(['hikaye-zinciri', 'mekan-yontemi', 'akrostis-kisaltma', 'gorsellestirme', 'anahtar-kelime', 'gruplama']);
export const STRATEJI_MODUL = 'oku';
export const STRATEJI_ADLARI = Object.freeze(['tahmin-etme', 'tara-sor-oku', 'ana-fikir', 'cikarim-yapma', 'bes-n-bir-k', 'soru-uretme', 'ozetleme', 'tablo-grafik']);
export const STRATEJI_LISTESI = 'stratejiler'; // #/teknikler/stratejiler: strateji ders listesi
export const OLCUM_TURLERI = Object.freeze(['liste', 'esler']);
export const KENDIN_TURLERI = Object.freeze(['metin', 'satirlar']);
export const PARCA_TURLERI = Object.freeze(['not', 'sorular', 'isaretle', 'eslestir']);
export const ADIMLAR = Object.freeze(['Ön deneme', 'Anlat', 'Birlikte yap', 'Kendin dene', 'Ölç']);
export const STRATEJI_ADIMLARI = Object.freeze(['Anlat', 'Örnek metin', 'Görev', 'Mini sınama', 'Sonuç']);

// Ders serileri: liste sayfası, renk (data-modul) ve kayıt modülü
export const SERILER = Object.freeze({
  hafiza: Object.freeze({ ad: 'hafiza', modul: DERS_MODUL, arac: 'teknikler', adlar: DERS_ADLARI, ikon: 'akademi',
    listeAdres: '#/teknikler', geriAdres: '#/modul/hafiza', geriEtiket: 'Hafıza' }),
  okuma: Object.freeze({ ad: 'okuma', modul: STRATEJI_MODUL, arac: 'stratejiler', adlar: STRATEJI_ADLARI, ikon: 'akademi',
    listeAdres: `#/teknikler/${STRATEJI_LISTESI}`, geriAdres: '#/modul/oku', geriEtiket: 'Okuma' }),
});
/** Dersin serisi ya da null */
export const dersSerisi = (ad) => (STRATEJI_ADLARI.includes(ad) ? SERILER.okuma : DERS_ADLARI.includes(ad) ? SERILER.hafiza : null);
export const dersEgzersizAdi = (ad) => (STRATEJI_ADLARI.includes(ad) ? `strateji-${ad}` : `teknik-${ad}`);

const VARSAYILAN_ARA = 'Listeyi aklında tutmaya çalışırken içinden 20’den geriye doğru ikişer say: 20, 18, 16…';
const DURUSTLUK = 'İki listedeki kelimeler farklı ve bu tek bir deneme; küçük farklar şans eseri de olabilir. Dersi birkaç gün sonra tekrarlarsan tekniğin sana ne kadar uyduğunu daha iyi görürsün (listeler aynı kalır, bu yüzden en anlamlı karşılaştırma ilk denemendir).';

// ---------- Puanlama (DOM'a dokunmaz) ----------
/** Karşılaştırma için sadeleştirir: tr-TR küçük harf, şapkasız, noktalamasız, tek boşluk */
export function normalYaz(s) {
  return trKucuk(String(s ?? '').normalize('NFC'))
    .replace(/[âà]/g, 'a').replace(/[îì]/g, 'i').replace(/[ûù]/g, 'u')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
}

// Düzenleme uzaklığı (1'den büyükse 2 döner; yalnız "en çok 1 hata" sorusu için)
function mesafe(a, b) {
  const x = [...a];
  const y = [...b];
  if (Math.abs(x.length - y.length) > 1) return 2;
  let onceki = Array.from({ length: y.length + 1 }, (_, i) => i);
  for (let i = 1; i <= x.length; i++) {
    const satir = [i];
    for (let j = 1; j <= y.length; j++) {
      satir[j] = Math.min(onceki[j] + 1, satir[j - 1] + 1, onceki[j - 1] + (x[i - 1] === y[j - 1] ? 0 : 1));
    }
    onceki = satir;
  }
  return onceki[y.length];
}

/** Hoşgörülü eşleşme: Türkçe ekler ("elmayı", "kitabı") ve 5+ harfli kelimede tek harflik yazım hatası kabul edilir (sondan kesik yazım değil: "kova" ≠ "kovan") */
export function benzerMi(girilen, hedef) {
  if (!girilen || !hedef) return false;
  if (girilen === hedef) return true;
  const g = [...girilen];
  const h = [...hedef];
  const ek = g.length - h.length;
  if (h.length >= 3 && ek >= 1 && ek <= 4) {
    const bas = g.slice(0, h.length).join('');
    if (bas === hedef || (h.length >= 4 && mesafe(bas, hedef) <= 1)) return true;
  }
  return h.length >= 5 && !hedef.startsWith(girilen) && mesafe(girilen, hedef) <= 1;
}

// Girilen sıradaki hedef numaralarının en uzun artan alt dizisi = doğru sırada yazılan öğe sayısı
function enUzunArtan(dizi) {
  const uz = dizi.map(() => 1);
  for (let i = 1; i < dizi.length; i++) for (let j = 0; j < i; j++) if (dizi[j] < dizi[i]) uz[i] = Math.max(uz[i], uz[j] + 1);
  return uz.length ? Math.max(...uz) : 0;
}

/**
 * Serbest hatırlama: metin boşluk/virgül/satırla bölünür; her hedef en çok bir kez sayılır (önce tam, sonra hoşgörülü eşleşme).
 * Döner: { dogru, toplam, hatirlanan: [bool], fazla, sira: number|null }
 */
export function listePuanla(metin, ogeler, { siraOnemli = false } = {}) {
  const hedefler = ogeler.map(normalYaz);
  const girilen = normalYaz(metin).split(' ').filter(Boolean);
  const bulunan = hedefler.map(() => -1); // hedef → girilen kelimenin sırası
  const kullanildi = girilen.map(() => false);
  for (const tam of [true, false]) {
    girilen.forEach((g, gi) => {
      if (kullanildi[gi]) return;
      const hi = hedefler.findIndex((h, i) => bulunan[i] < 0 && (tam ? g === h : benzerMi(g, h)));
      if (hi >= 0) { bulunan[hi] = gi; kullanildi[gi] = true; }
    });
  }
  const sirali = bulunan.map((gi, hi) => [gi, hi]).filter(([gi]) => gi >= 0).sort((a, b) => a[0] - b[0]).map(([, hi]) => hi);
  return {
    dogru: sirali.length,
    toplam: hedefler.length,
    hatirlanan: bulunan.map((gi) => gi >= 0),
    fazla: kullanildi.filter((k) => !k).length,
    sira: siraOnemli ? enUzunArtan(sirali) : null,
  };
}

/** İpuçlu hatırlama: yanitlar[i] esler[i] içindir; boşluklar yok sayılır ("baş parmak" = "başparmak") */
export function eslerPuanla(yanitlar, esler) {
  const sade = (s) => normalYaz(s).replace(/ /g, '');
  const hatirlanan = esler.map((e, i) => {
    const g = sade(yanitlar?.[i]);
    return !!g && e.cevap.some((c) => benzerMi(g, sade(c)));
  });
  return { dogru: hatirlanan.filter(Boolean).length, toplam: esler.length, hatirlanan, fazla: 0, sira: null };
}

/** Öncesi/sonrası karşılaştırma (iki liste eşit uzunlukta) */
export function karsilastir(once, sonra) {
  const yuzde = (s) => (s.toplam ? Math.round((s.dogru * 100) / s.toplam) : 0);
  const fark = sonra.dogru - once.dogru;
  return {
    once: once.dogru, sonra: sonra.dogru, toplam: sonra.toplam,
    onceYuzde: yuzde(once), sonraYuzde: yuzde(sonra), fark,
    durum: fark > 0 ? 'artti' : fark < 0 ? 'azaldi' : 'ayni',
  };
}

/** Sonuç mesajı: cezalandırmayan, kendi geçmişiyle kıyaslayan dil */
export function karsilastirmaMesaji(k) {
  const tam = k.sonra === k.toplam ? ' Hepsini hatırladın!' : '';
  if (k.durum === 'artti') return `Teknikle ${k.fark} öğe daha fazla hatırladın.${tam}`;
  if (k.durum === 'ayni') return `İki denemede de ${k.sonra} öğe hatırladın.${tam} Yeni bir yöntem ilk seferde alışılmadık gelebilir; denedikçe kolaylaşır.`;
  return 'Bu kez ilk deneme biraz daha iyi geçti. Bu da olur: yeni bir yöntem başta düşünmeyi yavaşlatabilir. Bir sonraki denemede yeniden ölç.';
}

/** S21: İşaretleme görevi. Fazladan işaret isabetten düşülür. Döner: { puan 0-1, isabet, fazla, kacan } */
export function isaretPuanla(secili, dogru) {
  const s = new Set(secili);
  const d = new Set(dogru);
  const isabet = [...s].filter((i) => d.has(i)).length;
  const fazla = s.size - isabet;
  return { puan: d.size ? Math.max(0, isabet - fazla) / d.size : 0, isabet, fazla, kacan: d.size - isabet };
}

/** S21: Eşleştirme görevi. secimler[i] = ogeler[i] için seçilen kategori sırası. Döner: { puan 0-1, dogru, toplam, dogrular: [bool] } */
export function eslestirPuanla(secimler, ogeler) {
  const dogrular = ogeler.map((o, i) => secimler?.[i] === o.dogru);
  const dogru = dogrular.filter(Boolean).length;
  return { puan: ogeler.length ? dogru / ogeler.length : 0, dogru, toplam: ogeler.length, dogrular };
}

/** S21: Mini sınama mesajı (kendi sonucu; “henüz” dili) */
export function sinamaMesaji(dogru, toplam) {
  if (toplam && dogru === toplam) return 'Hepsini doğru yanıtladın. Bir sonraki hedef: bu stratejiyi Oku ve Anla’daki bir metinde kullanmak.';
  if (dogru >= toplam - 1) return 'Stratejinin temelini kavradın. Gözden geçirmede kaçırdığın soruya bakarsan eksik parça da yerine oturur.';
  return 'Bu strateji henüz tam oturmadı; bu çok normal. Anlatımı bir kez daha oku, birkaç gün sonra dersi yeniden yap.';
}

// ---------- Denetim ve yükleme ----------
const metinMi = (v) => typeof v === 'string' && v.trim() !== '';
const metinDizisi = (v, en = 1) => Array.isArray(v) && v.length >= en && v.every(metinMi);
const sayiAraliginda = (v, en, enCok) => Number.isFinite(v) && v >= en && v <= enCok;
const KIMLIK = /^[a-z0-9-]+$/;

function anlatDenetle(a, h) {
  if (!metinDizisi(a?.paragraflar)) h.push('anlat.paragraflar eksik');
  if (a?.ornek && (!metinMi(a.ornek.baslik) || !metinDizisi(a.ornek.satirlar))) h.push('anlat.ornek hatalı');
}

/** Ders JSON'unu denetler; hata metinleri dizisi döner (boşsa geçerli) */
export function dersDenetle(d, ad) {
  if (STRATEJI_ADLARI.includes(ad)) return stratejiDenetle(d, ad);
  const h = [];
  if (!d || typeof d !== 'object') return ['ders nesne değil'];
  if (d.ad !== ad) h.push('ad dosya adıyla aynı değil');
  for (const a of ['baslik', 'kisaAciklama', 'sureDk']) if (!metinMi(d[a])) h.push(`${a} eksik`);
  anlatDenetle(d.anlat, h);
  const b = d.birlikte;
  if (!metinMi(b?.yonerge) || !Array.isArray(b?.adimlar) || b.adimlar.length < 2 || !b.adimlar.every((x) => metinMi(x?.metin))) h.push('birlikte hatalı');
  const k = b?.kontrol;
  if (!metinMi(k?.soru) || !metinDizisi(k?.secenekler, 2) || k.secenekler.length > 4
    || !Number.isInteger(k?.dogru) || k.dogru < 0 || k.dogru >= k.secenekler.length || !metinMi(k?.aciklama)) h.push('birlikte.kontrol hatalı');

  const o = d.olcum;
  if (!OLCUM_TURLERI.includes(o?.tur)) h.push('olcum.tur hatalı');
  if (!sayiAraliginda(o?.calismaSn, 10, 120) || !sayiAraliginda(o?.araSn, 5, 60)) h.push('olcum süreleri hatalı');
  let n = 0;
  if (o?.tur === 'liste') {
    const tek = (l) => metinDizisi(l, 4) && l.length <= 15 && l.every((x) => !/\s/.test(x.trim()));
    if (!tek(o.once?.ogeler) || !tek(o.sonra?.ogeler)) h.push('olcum öğeleri 4-15 tek kelime olmalı');
    else if (o.once.ogeler.length !== o.sonra.ogeler.length) h.push('once ve sonra eşit uzunlukta olmalı');
    else n = o.sonra.ogeler.length;
  } else if (o?.tur === 'esler') {
    const es = (l) => Array.isArray(l) && l.length >= 3 && l.length <= 10 && l.every((x) => metinMi(x?.ipucu) && metinDizisi(x?.cevap));
    if (!es(o.once?.esler) || !es(o.sonra?.esler)) h.push('olcum eşleri 3-10 {ipucu, cevap[]} olmalı');
    else if (o.once.esler.length !== o.sonra.esler.length) h.push('once ve sonra eşit uzunlukta olmalı');
    else n = o.sonra.esler.length;
  }

  const kd = d.kendin;
  if (!KENDIN_TURLERI.includes(kd?.tur) || !metinMi(kd?.yonerge) || !Array.isArray(kd?.ipuclari) || !sayiAraliginda(kd?.onerilenSn, 30, 300)) h.push('kendin hatalı');
  if (kd?.etiketler !== undefined && !metinDizisi(kd.etiketler)) h.push('kendin.etiketler hatalı');
  if (kd?.ogeyleEsle && (o?.tur !== 'liste' || kd.etiketler?.length !== n)) h.push('ogeyleEsle için etiketler öğe sayısıyla eşit olmalı');
  if (kd?.satirIpuclari !== undefined && (!Array.isArray(kd.satirIpuclari) || kd.satirIpuclari.length !== (kd.etiketler?.length ?? n))) h.push('satirIpuclari satır sayısıyla eşit olmalı');
  return h;
}

// S21: soru listesi quiz-engine şemasıyla denetlenir; hata metni ya da null
function soruHatasi(sorular, en, enCok) {
  if (!Array.isArray(sorular) || sorular.length < en || sorular.length > enCok) return en === enCok ? `${en} soru olmalı` : `${en}-${enCok} soru olmalı`;
  try { sorulariDenetle(sorular); return null; } catch (h) { return h.message; }
}

// S21: görev parçaları (notlar: önceki not kimlikleri; goster yalnız öncekini gösterebilir)
function parcalarDenetle(liste, yer, h, notlar) {
  if (!Array.isArray(liste) || !liste.length || liste.length > 5) { h.push(`${yer}: 1-5 parça olmalı`); return; }
  let soruParcasi = 0;
  liste.forEach((p, i) => {
    const y = `${yer}[${i}]`;
    if (!PARCA_TURLERI.includes(p?.tur)) { h.push(`${y}.tur hatalı`); return; }
    if (p.baslik !== undefined && !metinMi(p.baslik)) h.push(`${y}.baslik hatalı`);
    if (p.tur === 'not') {
      if (!metinMi(p.kimlik) || !KIMLIK.test(p.kimlik) || notlar.has(p.kimlik)) h.push(`${y}.kimlik hatalı ya da tekrarlı`);
      if (!metinMi(p.soru)) h.push(`${y}.soru eksik`);
      if (p.goster !== undefined && !notlar.has(p.goster)) h.push(`${y}.goster önceki bir notun kimliği olmalı`);
      notlar.add(p.kimlik);
    } else if (p.tur === 'sorular') {
      soruParcasi += 1;
      const e = soruHatasi(p.sorular, 1, 4);
      if (e) h.push(`${y}: ${e}`);
    } else if (p.tur === 'isaretle') {
      const n = Array.isArray(p.secenekler) ? p.secenekler.length : 0;
      if (!metinMi(p.yonerge) || !metinDizisi(p.secenekler, 2) || n > 8) h.push(`${y}: yonerge ve 2-8 seçenek gerekli`);
      if (!Array.isArray(p.dogru) || !p.dogru.length || new Set(p.dogru).size !== p.dogru.length
        || !p.dogru.every((d) => Number.isInteger(d) && d >= 0 && d < n)) h.push(`${y}.dogru hatalı`);
      if (!metinMi(p.aciklama)) h.push(`${y}.aciklama eksik`);
    } else {
      const k = Array.isArray(p.kategoriler) ? p.kategoriler.length : 0;
      if (!metinMi(p.yonerge) || !metinDizisi(p.kategoriler, 2) || k > 6) h.push(`${y}: yonerge ve 2-6 kategori gerekli`);
      if (!Array.isArray(p.ogeler) || p.ogeler.length < 2 || p.ogeler.length > 8
        || !p.ogeler.every((o) => metinMi(o?.metin) && Number.isInteger(o?.dogru) && o.dogru >= 0 && o.dogru < k)) h.push(`${y}.ogeler hatalı`);
      if (!metinMi(p.aciklama)) h.push(`${y}.aciklama eksik`);
    }
  });
  if (soruParcasi > 1) h.push(`${yer}: en çok bir “sorular” parçası olabilir`);
}

function stratejiDenetle(d, ad) {
  if (!d || typeof d !== 'object') return ['ders nesne değil'];
  const h = [];
  if (d.tur !== 'strateji') h.push('tur "strateji" olmalı');
  if (d.ad !== ad) h.push('ad dosya adıyla aynı değil');
  for (const a of ['baslik', 'kisaAciklama', 'sureDk', 'kazanim']) if (!metinMi(d[a])) h.push(`${a} eksik`);
  anlatDenetle(d.anlat, h);
  const m = d.metin;
  if (!metinMi(m?.baslik) || !metinMi(m?.yonerge)) h.push('metin.baslik ya da metin.yonerge eksik');
  if (!Array.isArray(m?.bolumler) || !m.bolumler.length
    || !m.bolumler.every((b) => metinDizisi(b?.paragraflar) && (b.araBaslik === undefined || metinMi(b.araBaslik)))) h.push('metin.bolumler hatalı');
  if (m?.gorsel && (!metinDizisi(m.gorsel.simgeler) || !metinMi(m.gorsel.aciklama))) h.push('metin.gorsel hatalı');
  if (m?.tablo) {
    const t = m.tablo;
    const s = t.sutunlar?.length;
    if (!metinMi(t.baslik) || !metinDizisi(t.sutunlar, 2) || !Array.isArray(t.satirlar) || !t.satirlar.length
      || !t.satirlar.every((r) => metinDizisi(r) && r.length === s)) h.push('metin.tablo hatalı');
  }
  if (m?.grafik) {
    const g = m.grafik;
    if (!metinMi(g.baslik) || !metinMi(g.birim) || !Array.isArray(g.veriler) || g.veriler.length < 2 || g.veriler.length > 8
      || !g.veriler.every((v) => metinMi(v?.etiket) && sayiAraliginda(v?.deger, 0, 1e6))) h.push('metin.grafik hatalı');
  }
  const notlar = new Set();
  if (m?.onGorev !== undefined) {
    if (m.onizleme !== true) h.push('metin.onGorev için onizleme: true gerekli');
    parcalarDenetle(m.onGorev, 'metin.onGorev', h, notlar);
  }
  if (!metinMi(d.gorev?.yonerge)) h.push('gorev.yonerge eksik');
  parcalarDenetle(d.gorev?.parcalar, 'gorev.parcalar', h, notlar);
  const e = soruHatasi(d.sinama?.sorular, 3, 3);
  if (e) h.push(`sinama: ${e}`);
  return h;
}

const yuklenenler = new Map();

/** Dersi yükler (bir kez); geçersizse hata fırlatır. Bilinmeyen ad → null */
export function dersYukle(ad) {
  if (!dersSerisi(ad)) return Promise.resolve(null);
  if (!yuklenenler.has(ad)) {
    const s = (async () => {
      const yanit = await fetch(new URL(`../../data/lessons/${ad}.json`, import.meta.url));
      if (!yanit.ok) throw new Error(`${ad}.json açılamadı (${yanit.status})`);
      const ders = await yanit.json();
      const hatalar = dersDenetle(ders, ad);
      if (hatalar.length) throw new Error(`${ad}.json: ${hatalar.join('; ')}`);
      return ders;
    })();
    s.catch(() => yuklenenler.delete(ad)); // hata kalıcı olmasın: sonraki açılışta yeniden denenir
    yuklenenler.set(ad, s);
  }
  return yuklenenler.get(ad);
}

/** Bir serinin dersleri (sırasıyla): [{ ad, ders | null }]. seri: 'hafiza' (vars.) | 'okuma' */
export async function dersleriYukle(seri = 'hafiza') {
  const adlar = SERILER[seri]?.adlar ?? DERS_ADLARI;
  const sonuc = await Promise.allSettled(adlar.map(dersYukle));
  return sonuc.map((s, i) => {
    if (s.status === 'rejected') console.error('[ders]', s.reason);
    return { ad: adlar[i], ders: s.status === 'fulfilled' ? s.value : null };
  });
}

/** Bu dersin kayıtları (eskiden yeniye) */
export const dersGecmisi = (ad, profilId) => modulKayitlari(dersSerisi(ad)?.modul ?? DERS_MODUL, { egzersiz: dersEgzersizAdi(ad), profilId });

// ---------- Ortak ekran parçaları ----------
const dugme = (metin, onclick, tur = 'ikincil') => el('button', { type: 'button', sinif: `btn btn--${tur}`, metin, onclick });
const ornekKutusu = (o) => el('div', { sinif: 'ders-ornek' },
  el('p', { sinif: 'ders-ornek__baslik', metin: o.baslik }),
  el('ul', {}, o.satirlar.map((s) => el('li', { metin: s }))));

// Ölçüm öğelerinin metinleri (çalışma ekranı, satır etiketleri, inceleme)
function esMetni(e) {
  return `${e.ipucu}${e.okunus ? ` (okunuşu: ${e.okunus})` : ''}`;
}

/**
 * Ders kabuğu (iki ders türü için ortak): geri bağlantısı, başlık, adım göstergesi, gövde, sayaçlar.
 * Döner: { govde, goster(adim, baslik, ...icerik), aralik, sayacOlustur, kapandiMi(), kapat() }
 */
function kabukKur(kap, ders, { adimlar, seri, geriAdres, geriEtiket, cikisOnayi, kapaninca }) {
  let kapandi = false;
  const sayaclar = new Set();

  function aralik(fn, ms) {
    const id = setInterval(() => { if (!kapandi) fn(); }, ms);
    sayaclar.add(id);
    return () => { clearInterval(id); sayaclar.delete(id); };
  }

  const geri = el('a', {
    sinif: 'btn btn--hayalet btn--kucuk geri-baglanti', href: geriAdres,
    onclick: (e) => {
      if (cikisOnayi() && !confirm('Dersten çıkarsan bu denemenin sonucu kaydedilmez. Çıkılsın mı?')) e.preventDefault();
    },
  }, spriteIkon('ok-sag', 'ikon ikon--kucuk ikon--ters'), geriEtiket);
  const adimOgeleri = adimlar.map((a, i) => el('li', {},
    el('span', { sinif: 'ders-adimlar__no', 'aria-hidden': 'true', metin: String(i + 1) }),
    el('span', { sinif: 'ders-adimlar__ad', metin: a }),
    el('span', { sinif: 'ekran-okuyucu' })));
  const adimListesi = el('ol', { sinif: 'ders-adimlar', 'aria-label': 'Ders adımları' }, adimOgeleri);
  const govde = el('section', { sinif: `kart ders-govde ders-govde--${seri.modul}`, 'aria-labelledby': 'ders-adim-baslik' });

  kap.replaceChildren(
    geri,
    el('div', { sinif: 'sayfa-ust', 'data-modul': seri.modul },
      el('span', { sinif: 'kart__ikon', 'aria-hidden': 'true' }, spriteIkon(seri.ikon, 'ikon')),
      el('div', {}, el('h1', { metin: ders.baslik }), el('p', { sinif: 'soluk', metin: ders.kisaAciklama }))),
    el('p', { sinif: 'ders-sure' }, el('span', { sinif: 'rozet rozet--vurgu', metin: `Yaklaşık ${ders.sureDk} dakika` })),
    adimListesi,
    govde);

  let ilkCizim = true;
  function goster(adim, baslik, ...icerik) {
    adimOgeleri.forEach((li, i) => {
      li.dataset.durum = i < adim ? 'bitti' : i === adim ? 'simdi' : 'sirada';
      if (i === adim) li.setAttribute('aria-current', 'step');
      else li.removeAttribute('aria-current');
      li.lastChild.textContent = i < adim ? ' (tamamlandı)' : '';
    });
    const h2 = el('h2', { id: 'ders-adim-baslik', metin: baslik });
    govde.replaceChildren(h2, ...icerik.flat().filter((c) => c != null && c !== false));
    if (!ilkCizim) odakla(h2);
    ilkCizim = false;
  }

  // Sayaç: kalan süre metni + ince çubuk; Date.now ile hesaplanır (sekme arka plandayken de doğru)
  function sayacOlustur(sn, bitince) {
    const metin = el('span', { sinif: 'ders-sayac__sure', metin: sureBicimle(sn) });
    const dolgu = el('span', { sinif: 'ilerleme__dolgu', style: '--deger: 100%' });
    const kok = el('div', { sinif: 'ders-sayac' },
      el('span', { sinif: 'ders-sayac__etiket', metin: 'Kalan süre' }), metin,
      el('div', { sinif: 'ilerleme ilerleme--ince ders-sayac__cubuk', 'aria-hidden': 'true' }, dolgu));
    const bitis = Date.now() + sn * 1000;
    const dur = aralik(() => {
      const kalan = Math.max(0, bitis - Date.now());
      metin.textContent = sureBicimle(Math.ceil(kalan / 1000));
      dolgu.style.setProperty('--deger', `${(kalan / (sn * 1000)) * 100}%`);
      if (!kalan) { dur(); bitince(); }
    }, 250);
    return { kok, dur };
  }

  return {
    govde, goster, aralik, sayacOlustur,
    kapandiMi: () => kapandi,
    kapat() {
      kapandi = true;
      sayaclar.forEach((id) => clearInterval(id));
      sayaclar.clear();
      kapaninca?.();
    },
  };
}

/**
 * Dersi kap içine çizer ve oynatır. Döner: { kapat() } (sayfadan çıkınca sayaçları durdurur).
 * Seçenekler: geriAdres, geriEtiket (dersten çıkış bağlantısı; varsayılan dersin serisinin listesi)
 */
export function dersEkraniKur(kap, ders, { geriAdres, geriEtiket = 'Tüm dersler' } = {}) {
  const seri = ders.tur === 'strateji' ? SERILER.okuma : SERILER.hafiza;
  const secenek = { seri, geriAdres: geriAdres ?? seri.listeAdres, geriEtiket };
  return ders.tur === 'strateji' ? stratejiEkrani(kap, ders, secenek) : teknikEkrani(kap, ders, secenek);
}

// ---------- Hafıza tekniği dersi (S15) ----------
function teknikEkrani(kap, ders, { seri, geriAdres, geriEtiket }) {
  const o = ders.olcum;
  const liste = o.tur === 'liste';
  const n = liste ? o.sonra.ogeler.length : o.sonra.esler.length;
  const durum = { basladi: false, bitti: false, baslangic: 0, once: null, sonra: null, kendinBaslangic: 0, kendinSn: 0 };
  const kabuk = kabukKur(kap, ders, { adimlar: ADIMLAR, seri, geriAdres, geriEtiket, cikisOnayi: () => durum.basladi && !durum.bitti });
  const { goster, aralik, sayacOlustur } = kabuk;
  const kapandi = kabuk.kapandiMi;

  // Öğeleri gösterir: liste (sıra önemliyse numaralı) ya da eşler (ipucu — cevap)
  function ogeGorunumu(parca) {
    if (liste) {
      return el(o.siraOnemli ? 'ol' : 'ul', { sinif: `ders-ogeler${o.siraOnemli ? ' ders-ogeler--sirali' : ''}`, 'aria-label': 'Kelimeler' },
        parca.ogeler.map((k) => el('li', { metin: k })));
    }
    return el('ul', { sinif: 'ders-esler', 'aria-label': 'Kelime çiftleri' },
      parca.esler.map((e) => el('li', {},
        el('span', { sinif: 'ders-esler__ipucu' }, e.ipucu, e.okunus && el('small', { metin: ` (okunuşu: ${e.okunus})` })),
        el('span', { sinif: 'ders-esler__ok', 'aria-hidden': 'true', metin: '→' }),
        el('span', { sinif: 'ekran-okuyucu', metin: ': ' }),
        el('span', { sinif: 'ders-esler__cevap', metin: e.cevap[0] }))));
  }

  // Çalışma: kesin ise süre bitince kendiliğinden geçer; değilse süre yalnızca önerilir
  function calisma({ adim, baslik, aciklama, ust = [], parca, sureSn, kesin, alt = [], dugmeMetni }) {
    return new Promise((coz) => {
      let bitti = false;
      const not = el('p', { sinif: 'alan__ipucu', 'aria-live': 'polite' });
      const sayac = sayacOlustur(sureSn, () => {
        if (kesin) { duyur('Süre doldu.'); bitir(); return; }
        not.textContent = 'Önerilen süre doldu. Hazırsan devam et; birkaç saniye daha kullanabilirsin.';
      });
      function bitir() {
        if (bitti || kapandi()) return;
        bitti = true;
        sayac.dur();
        coz();
      }
      goster(adim, baslik, aciklama && el('p', { metin: aciklama }), ust, sayac.kok, parca && ogeGorunumu(parca), alt, not,
        el('div', { sinif: 'ders-eylemler' }, dugme(dugmeMetni, bitir, 'birincil')));
      duyur(`${sureMetni(sureSn)} ${kesin ? 'süren var' : 'önerilen süre'}.`);
    });
  }

  function ara(adim) {
    return new Promise((coz) => {
      const sn = o.araSn;
      const sayi = el('p', { sinif: 'ders-ara__sayi', 'aria-hidden': 'true', metin: String(sn) });
      goster(adim, 'Kısa ara', el('p', { metin: o.araYonerge ?? VARSAYILAN_ARA }), sayi);
      duyur(`Kısa ara, ${sureMetni(sn)}. ${o.araYonerge ?? VARSAYILAN_ARA}`);
      const bitis = Date.now() + sn * 1000;
      const dur = aralik(() => {
        const k = Math.max(0, Math.ceil((bitis - Date.now()) / 1000));
        sayi.textContent = String(k);
        if (!k) { dur(); coz(); }
      }, 200);
    });
  }

  // Hatırlama: liste → tek metin alanı; eşler → karışık sırada ipucu başına bir kutu
  function hatirla(adim, parca) {
    return new Promise((coz) => {
      const uyari = el('p', { sinif: 'alan__ipucu', 'aria-live': 'polite' });
      let bosUyarildi = false;
      let topla;
      let alanlar;
      if (liste) {
        const ipucu = el('p', { id: `ders-hatirla-ipucu-${adim}`, sinif: 'alan__ipucu',
          metin: 'Virgülle, boşlukla ya da alt alta yazabilirsin. Emin olmadıklarını da yaz.' });
        const kutu = el('textarea', { sinif: 'girdi', id: `ders-hatirla-${adim}`, rows: '5', autocomplete: 'off',
          autocapitalize: 'off', spellcheck: 'false', 'aria-describedby': ipucu.id });
        alanlar = [el('div', { sinif: 'alan' },
          el('label', { sinif: 'alan__etiket', for: kutu.id,
            metin: o.siraOnemli ? 'Hatırladığın kelimeleri yaz; sırasını da korumaya çalış.' : 'Hatırladığın kelimeleri yaz; sıra önemli değil.' }),
          kutu, ipucu)];
        topla = () => ({ bos: !kutu.value.trim(), sonuc: () => listePuanla(kutu.value, parca.ogeler, { siraOnemli: o.siraOnemli }) });
      } else {
        const sira = karistir(parca.esler.map((_, i) => i));
        const kutular = parca.esler.map(() => null);
        alanlar = sira.map((i, s) => {
          const kutu = el('input', { sinif: 'girdi', id: `ders-es-${adim}-${i}`, type: 'text', autocomplete: 'off',
            autocapitalize: 'off', spellcheck: 'false', enterkeyhint: s === sira.length - 1 ? 'done' : 'next' });
          kutular[i] = kutu;
          // Enter son kutuda değilse sonrakine geçer (yanlışlıkla erken bitirilmesin)
          kutu.addEventListener('keydown', (e) => {
            if (e.key !== 'Enter' || s === sira.length - 1) return;
            e.preventDefault();
            document.getElementById(`ders-es-${adim}-${sira[s + 1]}`)?.focus();
          });
          return el('div', { sinif: 'alan ders-es-alani' }, el('label', { sinif: 'alan__etiket', for: kutu.id, metin: esMetni(parca.esler[i]) }), kutu);
        });
        topla = () => ({ bos: kutular.every((k) => !k.value.trim()), sonuc: () => eslerPuanla(kutular.map((k) => k.value), parca.esler) });
      }
      const form = el('form', { sinif: 'yigin ders-form', novalidate: true }, alanlar, uyari,
        el('div', { sinif: 'ders-eylemler' }, el('button', { type: 'submit', sinif: 'btn btn--birincil', metin: 'Bitirdim' })));
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const t = topla();
        if (t.bos && !bosUyarildi) {
          bosUyarildi = true;
          uyari.textContent = 'Hiçbiri aklına gelmediyse de sorun değil. Yine de bitirmek için “Bitirdim”e bir kez daha bas.';
          return;
        }
        coz(t.sonuc());
      });
      goster(adim, 'Hatırla', el('p', { metin: liste ? 'Liste gizlendi. Aklında kalanları yaz.' : (o.hatirlaYonerge ?? 'Her kelimenin eşini yaz. Emin değilsen tahmin edebilir ya da boş bırakabilirsin.') }), form);
    });
  }

  // Hatırlananlar listesi (✓ hatırladın / – bu kez gelmedi)
  function inceleme(parca, sonuc) {
    const metinler = liste ? parca.ogeler : parca.esler.map((e) => `${e.ipucu} → ${e.cevap[0]}`);
    return el('ul', { sinif: 'ders-inceleme' }, metinler.map((m, i) => el('li', { 'data-durum': sonuc.hatirlanan[i] ? 'evet' : 'hayir' },
      el('span', { sinif: 'ders-inceleme__isaret', 'aria-hidden': 'true', metin: sonuc.hatirlanan[i] ? '✓' : '–' }),
      m, el('span', { sinif: 'ekran-okuyucu', metin: sonuc.hatirlanan[i] ? ' (hatırladın)' : ' (bu kez gelmedi)' }))));
  }

  // ---------- Akış ----------
  function giris() {
    Object.assign(durum, { basladi: false, bitti: false, once: null, sonra: null });
    const konu = o.konu ?? (liste ? 'kelime' : 'kelime çifti');
    goster(0, 'Önce kendi yolunla dene',
      el('p', { metin: `Ekranda ${n} ${konu} göreceksin. ${sureMetni(o.calismaSn)} boyunca, nasıl istersen öyle aklında tutmaya çalış.` }),
      el('p', { metin: 'Sonra kısa bir ara ve hatırlama var. Dersin sonunda tekniği kullanarak yeni bir listeyle aynısını yapacak, iki sonucu karşılaştıracaksın.' }),
      el('p', { sinif: 'soluk', metin: 'Bu bir sınav değil; yalnızca başlangıç noktanı gösterir.' }),
      el('div', { sinif: 'ders-eylemler' }, dugme('Listeyi göster', onDeneme, 'birincil')));
  }

  async function onDeneme() {
    durum.basladi = true;
    durum.baslangic = Date.now();
    await calisma({ adim: 0, baslik: 'Aklında tut', parca: o.once, sureSn: o.calismaSn, kesin: true, dugmeMetni: 'Hazırım' });
    await ara(0);
    if (kapandi()) return;
    durum.once = await hatirla(0, o.once);
    if (kapandi()) return;
    goster(0, 'Başlangıç noktan',
      el('p', { sinif: 'ders-buyuk-sonuc', metin: `${durum.once.toplam} öğeden ${durum.once.dogru} tanesini hatırladın.` }),
      inceleme(o.once, durum.once),
      el('p', { metin: 'Şimdi bir teknik öğrenip yeni bir listeyle yeniden deneyeceksin.' }),
      el('div', { sinif: 'ders-eylemler' }, dugme('Tekniği öğren', anlat, 'birincil')));
  }

  function anlat() {
    const a = ders.anlat;
    goster(1, a.baslik ?? 'Teknik nedir?',
      a.paragraflar.map((p) => el('p', { metin: p })),
      a.ornek && ornekKutusu(a.ornek),
      a.not && el('p', { sinif: 'soluk', metin: a.not }),
      el('div', { sinif: 'ders-eylemler' }, dugme('Birlikte yapalım', birlikte, 'birincil')));
  }

  function birlikte() {
    const b = ders.birlikte;
    const adimlar = el('ol', { sinif: 'ders-birlikte', 'aria-live': 'polite', 'aria-relevant': 'additions' });
    let i = 0;
    const kontrol = kontrolBolumu(b.kontrol);
    kontrol.kok.hidden = true;
    const sonraki = dugme('Sonraki adım', () => ekle(true), 'ikincil');
    function ekle(odakKoru) {
      const a = b.adimlar[i++];
      adimlar.append(el('li', {}, el('p', { metin: a.metin }), a.sahne && el('p', { sinif: 'ders-sahne', metin: a.sahne })));
      if (i >= b.adimlar.length) {
        sonraki.hidden = true;
        kontrol.kok.hidden = false;
        if (odakKoru) kontrol.odakla(); // gizlenen düğmedeki odak kaybolmasın
      }
    }
    goster(2, 'Birlikte yapalım', el('p', { metin: b.yonerge }), adimlar,
      el('div', { sinif: 'ders-eylemler' }, sonraki), kontrol.kok);
    ekle(false);
  }

  // Tek soruluk kontrol: yanlışta açıklama ve doğru cevap gösterilir; her durumda devam edilebilir
  function kontrolBolumu(k) {
    const ad = 'ders-kontrol';
    const secenekler = k.secenekler.map((s, i) => el('label', { sinif: 'secim ders-secenek' },
      el('input', { type: 'radio', name: ad, value: String(i) }), el('span', { metin: s })));
    const legend = el('legend', { metin: k.soru });
    const geriBildirim = el('div', { 'aria-live': 'polite' });
    const devam = dugme('Kendin dene', kendin, 'birincil');
    devam.hidden = true;
    const denetle = dugme('Kontrol et', () => {
      const secili = kok.querySelector(`input[name="${ad}"]:checked`);
      if (!secili) { geriBildirim.replaceChildren(el('p', { sinif: 'alan__ipucu', metin: 'Önce bir seçenek işaretle.' })); return; }
      const dogru = Number(secili.value) === k.dogru;
      if (dogru) sesCal('dogru');
      geriBildirim.replaceChildren(el('div', { sinif: `bildirim ${dogru ? 'bildirim--basari' : 'bildirim--uyari'}` },
        el('p', {}, el('strong', { metin: dogru ? 'Doğru! ' : `Henüz değil. Doğru cevap: ${k.secenekler[k.dogru]}. ` }), k.aciklama)));
      devam.hidden = false;
    }, 'ikincil');
    const kok = el('div', { sinif: 'ders-kontrol yigin' },
      el('fieldset', { sinif: 'grup' }, legend, secenekler),
      el('div', { sinif: 'ders-eylemler' }, denetle, devam), geriBildirim);
    return { kok, odakla: () => odakla(legend) };
  }

  function kendin() {
    const k = ders.kendin;
    const parca = o.sonra;
    const ogeMetinleri = liste ? parca.ogeler : parca.esler.map((e) => `${esMetni(e)} = ${e.cevap[0]}`);
    let yazma;
    let listeGoster = true;
    if (k.tur === 'metin') {
      const id = 'ders-kendin-metin';
      yazma = el('div', { sinif: 'alan' },
        el('label', { sinif: 'alan__etiket', for: id, metin: k.etiket ?? 'Tekniğini buraya yazabilirsin (isteğe bağlı)' }),
        el('textarea', { sinif: 'girdi', id, rows: '5', placeholder: k.yerTutucu, autocomplete: 'off' }));
    } else {
      // Satır adları: etiketler (ogeyleEsle ise "durak → öğe") ya da doğrudan ölçüm öğeleri
      const etiketler = k.etiketler
        ? k.etiketler.map((e, i) => (k.ogeyleEsle ? `${e} → ${parca.ogeler[i]}` : e))
        : ogeMetinleri;
      listeGoster = !!k.etiketler && !k.ogeyleEsle;
      yazma = el('div', { sinif: 'ders-satirlar' }, etiketler.map((e, i) => {
        const id = `ders-kendin-${i}`;
        return el('div', { sinif: 'alan' },
          el('label', { sinif: 'alan__etiket', for: id, metin: e }),
          el('input', { sinif: 'girdi', id, type: 'text', placeholder: k.yerTutucu, autocomplete: 'off' }),
          k.satirIpuclari?.[i] && el('details', { sinif: 'ders-ipucu' }, el('summary', { metin: 'İpucu' }), el('p', { metin: k.satirIpuclari[i] })));
      }));
    }
    durum.kendinBaslangic = Date.now();
    calisma({
      adim: 3, baslik: 'Kendin dene', aciklama: k.yonerge,
      ust: k.ipuclari.length ? [el('ul', { sinif: 'ders-ipuclari' }, k.ipuclari.map((p) => el('li', { metin: p })))] : [],
      parca: listeGoster ? parca : null, sureSn: k.onerilenSn, kesin: false,
      alt: [yazma, el('p', { sinif: 'alan__ipucu', metin: 'Yazdıkların kaydedilmez; yalnızca bu ekranda durur.' })],
      dugmeMetni: 'Hazırım, listeyi gizle',
    }).then(olc);
  }

  async function olc() {
    if (kapandi()) return;
    durum.kendinSn = Math.round((Date.now() - durum.kendinBaslangic) / 1000);
    await ara(4);
    if (kapandi()) return;
    durum.sonra = await hatirla(4, o.sonra);
    if (kapandi()) return;
    durum.bitti = true;
    sonuc();
  }

  function sonuc() {
    const onceki = dersGecmisi(ders.ad); // bu deneme eklenmeden önce
    const k = karsilastir(durum.once, durum.sonra);
    const sureSn = Math.round((Date.now() - durum.baslangic) / 1000);
    const { kaydedildi, hata } = kayitEkle({
      modul: DERS_MODUL, egzersiz: dersEgzersizAdi(ders.ad), sureSn, zorluk: 1,
      dogru: k.sonra, yanlis: k.toplam - k.sonra,
      ekstra: { tur: o.tur, once: k.once, sonra: k.sonra, toplam: k.toplam, fark: k.fark,
        onceSira: durum.once.sira, sonraSira: durum.sonra.sira, kendinSn: durum.kendinSn },
    });
    const enIyi = onceki.reduce((m, r) => Math.max(m, r.dogru ?? 0), 0);
    const cubuk = (ad, d, y, tur) => el('div', { sinif: 'ders-cubuk' },
      el('div', { sinif: 'ilerleme-etiket' }, el('span', { metin: ad }), el('span', { metin: `${d} / ${k.toplam} (${yuzdeBicimle(y)})` })),
      el('div', { sinif: `ilerleme${tur ? ` ${tur}` : ''}`, 'aria-hidden': 'true' }, el('span', { sinif: 'ilerleme__dolgu', style: `--deger: ${y}%` })));
    goster(4, 'Öncesi ve sonrası',
      el('div', { sinif: 'ders-karsilastirma' },
        cubuk('Önce (kendi yolunla)', k.once, k.onceYuzde),
        cubuk('Sonra (teknikle)', k.sonra, k.sonraYuzde, 'ilerleme--basari')),
      el('p', { sinif: 'ders-buyuk-sonuc', metin: karsilastirmaMesaji(k) }),
      o.siraOnemli && el('p', { metin: `Doğru sırada yazdıkların: önce ${durum.once.sira}, sonra ${durum.sonra.sira}.` }),
      el('p', { sinif: 'soluk', metin: `Ders yaklaşık ${sureMetni(sureSn)} sürdü.` }),
      onceki.length > 0 && el('p', { sinif: 'soluk', metin: `Bu dersi daha önce ${onceki.length} kez yaptın; en iyi “sonra” sonucun ${enIyi} / ${k.toplam} idi.` }),
      !kaydedildi && el('p', { sinif: 'alan__hata', metin: hata === 'profil' ? 'Profil seçili olmadığı için sonuç kaydedilmedi.' : 'Sonuç bu kez kaydedilemedi.' }),
      el('h3', { metin: 'İkinci listede hatırladıkların' }),
      inceleme(o.sonra, durum.sonra),
      ders.kapanis && el('div', { sinif: 'ders-ornek' }, el('p', { metin: ders.kapanis })),
      el('p', { sinif: 'alan__ipucu', metin: DURUSTLUK }),
      el('div', { sinif: 'ders-eylemler' },
        el('a', { sinif: 'btn btn--birincil', href: geriAdres, metin: 'Tüm dersler' }),
        dugme('Dersi yeniden yap', giris, 'ikincil')));
    duyur(`Önce ${k.once}, sonra ${k.sonra}. ${karsilastirmaMesaji(k)}`);
  }

  giris();
  return { kapat: kabuk.kapat };
}

// ---------- S21: Okuma stratejisi dersi ----------
const PARCA_BASLIKLARI = Object.freeze({ not: 'Yaz', sorular: 'Yanıtla', isaretle: 'İşaretle', eslestir: 'Eşleştir' });

const gorselGorunumu = (g) => el('figure', { sinif: 'strateji-gorsel' },
  el('p', { sinif: 'strateji-gorsel__simgeler', 'aria-hidden': 'true', metin: g.simgeler.join(' ') }),
  el('figcaption', { metin: g.aciklama }));

// Tablo: dar ekranda kendi içinde kayar (klavyeyle de: tabindex)
function tabloGorunumu(t) {
  return el('div', { sinif: 'strateji-tablo-kap', role: 'region', 'aria-label': t.baslik, tabindex: '0' },
    el('table', { sinif: 'strateji-tablo' },
      el('caption', { metin: t.baslik }),
      el('thead', {}, el('tr', {}, t.sutunlar.map((s) => el('th', { scope: 'col', metin: s })))),
      el('tbody', {}, t.satirlar.map((r) => el('tr', {},
        r.map((h, i) => (i === 0 ? el('th', { scope: 'row', metin: h }) : el('td', { metin: h }))))))));
}

// Yatay çubuk grafik: her satırda etiket, çubuk (görsel) ve değer (yazıyla); ekran okuyucu satırları okur
function grafikGorunumu(g) {
  const enCok = Math.max(1, ...g.veriler.map((v) => v.deger));
  return el('figure', { sinif: 'strateji-grafik' },
    el('figcaption', { sinif: 'strateji-grafik__baslik', metin: g.baslik }),
    el('ul', { sinif: 'strateji-grafik__liste' }, g.veriler.map((v) => el('li', {},
      el('span', { sinif: 'strateji-grafik__etiket', metin: v.etiket }),
      el('span', { sinif: 'strateji-grafik__cubuk', 'aria-hidden': 'true' },
        el('span', { sinif: 'strateji-grafik__dolgu', style: `--deger: ${Math.round((v.deger * 100) / enCok)}%` })),
      el('span', { sinif: 'strateji-grafik__deger', metin: `${sayiBicimle(v.deger)} ${g.birim}` })))));
}

function stratejiEkrani(kap, ders, { seri, geriAdres, geriEtiket }) {
  const m = ders.metin;
  const durum = { basladi: false, bitti: false, baslangic: 0, okumaBaslangic: 0, okumaSn: 0, gorevBaslangic: 0, gorevSn: 0, gorev: [], notlar: new Map() };
  const oturumlar = new Set(); // açık soru oturumları (çıkınca ya da yeniden başlayınca iptal)
  const oturumlariKapat = () => { oturumlar.forEach((o) => o.iptal()); oturumlar.clear(); };
  const kabuk = kabukKur(kap, ders, { adimlar: STRATEJI_ADIMLARI, seri, geriAdres, geriEtiket,
    cikisOnayi: () => durum.basladi && !durum.bitti, kapaninca: oturumlariKapat });
  const { goster } = kabuk;
  const kapandi = kabuk.kapandiMi;

  // ---------- Metin görünümleri ----------
  function metinGorunumu() {
    const govde = m.bolumler.flatMap((b) => [b.araBaslik ? el('h4', { metin: b.araBaslik }) : null, ...b.paragraflar.map((p) => el('p', { metin: p }))]).filter(Boolean);
    return el('article', { sinif: 'strateji-metin' },
      el('h3', { sinif: 'strateji-metin__baslik', metin: m.baslik }),
      m.gorsel && gorselGorunumu(m.gorsel), govde,
      m.grafik && grafikGorunumu(m.grafik),
      m.tablo && tabloGorunumu(m.tablo));
  }

  function onizlemeGorunumu() {
    const basliklar = m.bolumler.map((b) => b.araBaslik).filter(Boolean);
    return el('div', { sinif: 'strateji-metin strateji-onizleme' },
      el('h3', { sinif: 'strateji-metin__baslik', metin: m.baslik }),
      m.gorsel && gorselGorunumu(m.gorsel),
      basliklar.length > 0 && el('p', { sinif: 'soluk', metin: 'Ara başlıklar:' }),
      basliklar.length > 0 && el('ul', { sinif: 'strateji-onizleme__liste' }, basliklar.map((b) => el('li', { metin: b }))));
  }

  const bildirim = (tur, baslik, aciklama) => el('div', { sinif: `bildirim bildirim--${tur}` },
    el('p', {}, el('strong', { metin: `${baslik} ` }), aciklama));

  // ---------- Görev parçaları: her biri kendi kökünü doldurur, bitince bitti() ----------
  function notParcasi(p, kok, bitti) {
    const id = `strateji-not-${p.kimlik}`;
    const kutu = el('textarea', { sinif: 'girdi', id, rows: '3', maxlength: '600', lang: 'tr', autocomplete: 'off', placeholder: p.yerTutucu ?? '' });
    const uyari = el('p', { sinif: 'alan__ipucu', 'aria-live': 'polite' });
    let bosUyarildi = false;
    const tamam = dugme('Devam et', () => {
      const yazi = kutu.value.trim();
      if (!yazi && !bosUyarildi) {
        bosUyarildi = true;
        uyari.textContent = 'İstersen içinden düşünüp boş geçebilirsin. Devam etmek için düğmeye bir kez daha bas.';
        return;
      }
      durum.notlar.set(p.kimlik, yazi);
      kutu.readOnly = true;
      tamam.hidden = true;
      uyari.textContent = '';
      bitti();
    }, 'birincil');
    const onceki = p.goster !== undefined ? durum.notlar.get(p.goster) : undefined;
    kok.append(...[
      p.goster !== undefined && el('div', { sinif: 'ders-ornek' },
        el('p', { sinif: 'ders-ornek__baslik', metin: p.gosterBaslik ?? 'Daha önce yazdığın' }),
        el('p', { metin: onceki || 'Bunu boş geçmiştin; içinden ne düşündüğünü hatırla.' })),
      el('div', { sinif: 'alan' }, el('label', { sinif: 'alan__etiket', for: id, metin: p.soru }), kutu,
        p.ipucu && el('p', { sinif: 'alan__ipucu', metin: p.ipucu })),
      uyari,
      el('div', { sinif: 'ders-eylemler' }, tamam),
    ].filter(Boolean));
  }

  // Soru motorunun oturumu (giriş kartı yok); kök sayfadayken kurulur ki odak ilk soruya gitsin
  function sorularParcasi(p, kok, bitti) {
    const alan = el('div', { sinif: 'strateji-sorular' });
    kok.append(alan);
    const o = soruOturumuKur(alan, {
      sorular: p.sorular, giris: false, aktifMi: () => !kapandi(),
      bitince(sonuc) {
        durum.gorev.push({ puan: sonuc.anlama.puan, toplam: sonuc.anlama.soruSayisi });
        alan.querySelector('button[type="submit"]')?.setAttribute('hidden', ''); // “Sonuçları gör” görevde yanıltmasın
        bitti();
      },
    });
    oturumlar.add(o);
  }

  function isaretleParcasi(p, kok, bitti, no) {
    const ad = `strateji-isaret-${no}`;
    const satirlar = p.secenekler.map((s, i) => {
      const girdi = el('input', { type: 'checkbox', name: ad, value: String(i) });
      const isaret = el('span', { sinif: 'strateji-secenek__isaret', 'aria-hidden': 'true' });
      const durumMetni = el('span', { sinif: 'ekran-okuyucu' });
      return { girdi, isaret, durumMetni, kok: el('label', { sinif: 'secim strateji-secenek' }, girdi, el('span', { metin: s }), isaret, durumMetni) };
    });
    const hata = el('p', { sinif: 'alan__hata', role: 'alert', hidden: true });
    const geri = el('div', { 'aria-live': 'polite' });
    const devam = dugme('Devam et', () => { devam.hidden = true; bitti(); }, 'birincil');
    devam.hidden = true;
    const denetle = dugme('Kontrol et', () => {
      const secili = satirlar.flatMap((s, i) => (s.girdi.checked ? [i] : []));
      if (!secili.length) { hata.textContent = 'Önce en az bir seçenek işaretle.'; hata.hidden = false; return; }
      hata.hidden = true;
      const sonuc = isaretPuanla(secili, p.dogru);
      satirlar.forEach((s, i) => {
        const beklenen = p.dogru.includes(i);
        const d = beklenen ? (s.girdi.checked ? 'dogru' : 'kacan') : (s.girdi.checked ? 'fazla' : '');
        s.girdi.disabled = true;
        if (!d) return;
        s.kok.dataset.sonuc = d;
        s.isaret.textContent = d === 'dogru' ? '✓' : d === 'kacan' ? '!' : '✗';
        s.durumMetni.textContent = d === 'dogru' ? ' (doğru işaretledin)' : d === 'kacan' ? ' (bu da işaretlenmeliydi)' : ' (bu, beklenenlerden değildi)';
      });
      durum.gorev.push({ puan: sonuc.puan, toplam: 1 });
      const tam = !sonuc.kacan && !sonuc.fazla;
      if (tam) sesCal('dogru');
      const baslik = tam ? 'Tam isabet!'
        : `${p.dogru.length} seçenekten ${sonuc.isabet} tanesini buldun.${sonuc.fazla ? ` ${sonuc.fazla} işaret beklenenlerden değildi.` : ''}`;
      geri.replaceChildren(bildirim(tam ? 'basari' : 'uyari', baslik, p.aciklama));
      denetle.hidden = true;
      devam.hidden = false;
      devam.focus();
    }, 'ikincil');
    kok.append(
      el('fieldset', { sinif: 'grup strateji-isaretle' }, el('legend', { metin: p.yonerge }), satirlar.map((s) => s.kok)),
      hata, el('div', { sinif: 'ders-eylemler' }, denetle, devam), geri);
  }

  function eslestirParcasi(p, kok, bitti, no) {
    const satirlar = p.ogeler.map((o, i) => {
      const id = `strateji-es-${no}-${i}`;
      const sec = el('select', { sinif: 'girdi', id },
        el('option', { value: '', metin: 'Seç…' }), p.kategoriler.map((k, ki) => el('option', { value: String(ki), metin: k })));
      const not = el('p', { sinif: 'strateji-eslestir__not', hidden: true });
      return { sec, not, kok: el('div', { sinif: 'alan strateji-eslestir__satir' }, el('label', { sinif: 'alan__etiket', for: id, metin: o.metin }), sec, not) };
    });
    const hata = el('p', { sinif: 'alan__hata', role: 'alert', hidden: true });
    const geri = el('div', { 'aria-live': 'polite' });
    const devam = dugme('Devam et', () => { devam.hidden = true; bitti(); }, 'birincil');
    devam.hidden = true;
    const denetle = dugme('Kontrol et', () => {
      if (satirlar.some((s) => s.sec.value === '')) { hata.textContent = 'Her satır için bir seçim yap.'; hata.hidden = false; return; }
      hata.hidden = true;
      const sonuc = eslestirPuanla(satirlar.map((s) => Number(s.sec.value)), p.ogeler);
      satirlar.forEach((s, i) => {
        const dogru = sonuc.dogrular[i];
        s.sec.disabled = true;
        s.kok.dataset.sonuc = dogru ? 'dogru' : 'yanlis';
        s.not.textContent = dogru ? 'Doğru.' : `Doğrusu: ${p.kategoriler[p.ogeler[i].dogru]}`;
        s.not.hidden = false;
      });
      durum.gorev.push({ puan: sonuc.dogru, toplam: sonuc.toplam });
      const tam = sonuc.dogru === sonuc.toplam;
      if (tam) sesCal('dogru');
      geri.replaceChildren(bildirim(tam ? 'basari' : 'uyari', tam ? 'Hepsi doğru!' : `${sonuc.toplam} eşleştirmeden ${sonuc.dogru} tanesi doğru.`, p.aciklama));
      denetle.hidden = true;
      devam.hidden = false;
      devam.focus();
    }, 'ikincil');
    kok.append(
      el('div', { sinif: 'yigin strateji-eslestir', role: 'group', 'aria-label': p.yonerge }, el('p', { metin: p.yonerge }), satirlar.map((s) => s.kok)),
      hata, el('div', { sinif: 'ders-eylemler' }, denetle, devam), geri);
  }

  // Parçalar sırayla açılır; bitenler ekranda kalır (öğrenci geriye bakabilsin)
  function parcalariOynat(alan, parcalar, bitince) {
    let i = 0;
    const sonraki = () => {
      if (kapandi()) return;
      if (i >= parcalar.length) { bitince(); return; }
      const p = parcalar[i];
      const no = i;
      i += 1;
      const baslik = el('h3', { sinif: 'strateji-parca__baslik', metin: p.baslik ?? PARCA_BASLIKLARI[p.tur] });
      const kok = el('section', { sinif: 'strateji-parca yigin' }, baslik);
      alan.append(kok);
      if (p.tur === 'not') notParcasi(p, kok, sonraki);
      else if (p.tur === 'sorular') sorularParcasi(p, kok, sonraki);
      else if (p.tur === 'isaretle') isaretleParcasi(p, kok, sonraki, no);
      else eslestirParcasi(p, kok, sonraki, no);
      if (no > 0 && p.tur !== 'sorular') odakla(baslik); // soru oturumu odağı kendi başlığına taşır
    };
    sonraki();
  }

  function gorevOzeti() {
    const t = durum.gorev.reduce((a, g) => ({ puan: a.puan + g.puan, toplam: a.toplam + g.toplam }), { puan: 0, toplam: 0 });
    return t.toplam ? { ...t, yuzde: Math.round((t.puan * 100) / t.toplam) } : null;
  }

  // ---------- Akış ----------
  function giris() {
    oturumlariKapat();
    Object.assign(durum, { basladi: false, bitti: false, baslangic: Date.now(), okumaSn: 0, gorevSn: 0, gorev: [], notlar: new Map() });
    const a = ders.anlat;
    goster(0, a.baslik ?? 'Strateji nedir?',
      el('div', { sinif: 'strateji-kazanim' }, el('p', { sinif: 'strateji-kazanim__baslik', metin: 'Bu derste' }), el('p', { metin: ders.kazanim })),
      a.paragraflar.map((p) => el('p', { metin: p })),
      a.ornek && ornekKutusu(a.ornek),
      a.not && el('p', { sinif: 'soluk', metin: a.not }),
      el('div', { sinif: 'ders-eylemler' }, dugme('Örnek metne geç', metinAdimi, 'birincil')));
  }

  function metinAdimi() {
    durum.basladi = true;
    if (!m.onizleme) { tamMetin(); return; }
    const alan = el('div', { sinif: 'strateji-parcalar' });
    const ac = dugme('Metnin tamamını göster', tamMetin, 'birincil');
    const acDugmesi = () => alan.append(el('div', { sinif: 'ders-eylemler' }, ac));
    goster(1, 'Önce göz at',
      el('p', { metin: m.onizlemeYonerge ?? 'Henüz metnin tamamını okuma. Önce başlığa, görsele ve ara başlıklara göz at.' }),
      onizlemeGorunumu(), alan);
    if (m.onGorev) parcalariOynat(alan, m.onGorev, () => { acDugmesi(); ac.focus(); });
    else acDugmesi();
  }

  function tamMetin() {
    durum.okumaBaslangic = Date.now();
    goster(1, 'Örnek metin', el('p', { metin: m.yonerge }), metinGorunumu(),
      el('div', { sinif: 'ders-eylemler' }, dugme('Okumayı bitirdim', gorevAdimi, 'birincil')));
  }

  function gorevAdimi() {
    const g = ders.gorev;
    durum.okumaSn = Math.round((Date.now() - durum.okumaBaslangic) / 1000);
    durum.gorevBaslangic = Date.now();
    durum.gorev = [];
    const detay = el('details', { sinif: 'strateji-metin-detay' }, el('summary', { metin: 'Metne yeniden bak' }), metinGorunumu());
    detay.open = !!g.metinAcik;
    const alan = el('div', { sinif: 'strateji-parcalar' });
    const yaziVar = g.parcalar.some((p) => p.tur === 'not');
    goster(2, 'Görev', el('p', { metin: g.yonerge }), detay,
      yaziVar && el('p', { sinif: 'alan__ipucu', metin: 'Yazdıkların kaydedilmez; yalnızca bu ekranda durur.' }), alan);
    parcalariOynat(alan, g.parcalar, () => {
      durum.gorevSn = Math.round((Date.now() - durum.gorevBaslangic) / 1000);
      const ozet = gorevOzeti();
      const ileri = dugme('Mini sınamaya geç', sinamaAdimi, 'birincil');
      alan.append(el('div', { sinif: 'strateji-gorev-sonu yigin' },
        el('p', { metin: !ozet ? 'Görev tamam.'
          : `Görev tamam. Puanlanan bölümlerde sonucun ${yuzdeBicimle(ozet.yuzde)}.${ozet.yuzde < 100 ? ' Yukarıdaki açıklamalar neye yeniden bakacağını gösteriyor.' : ''}` }),
        el('div', { sinif: 'ders-eylemler' }, ileri)));
      ileri.focus();
    });
  }

  function sinamaAdimi() {
    oturumlariKapat();
    const kok = el('div', { sinif: 'strateji-sinama' });
    goster(3, 'Mini sınama',
      el('p', { metin: ders.sinama.yonerge ?? 'Üç kısa soru var. Öğrendiğin stratejiyi düşünerek yanıtla; her cevaptan sonra kısa bir geri bildirim göreceksin.' }),
      kok);
    oturumlar.add(soruOturumuKur(kok, { sorular: ders.sinama.sorular, giris: false, aktifMi: () => !kapandi(), bitince: sonucAdimi }));
  }

  function sonucAdimi(sonuc) {
    if (kapandi()) return;
    durum.bitti = true;
    const onceki = dersGecmisi(ders.ad); // bu deneme eklenmeden önce
    const a = sonuc.anlama;
    const g = gorevOzeti();
    const sureSn = Math.round((Date.now() - durum.baslangic) / 1000);
    const { kaydedildi, hata } = kayitEkle({
      modul: STRATEJI_MODUL, egzersiz: dersEgzersizAdi(ders.ad), sureSn, zorluk: 1,
      dogru: a.dogruSayisi, yanlis: a.soruSayisi - a.dogruSayisi,
      ekstra: { tur: 'strateji', sinama: a.yuzde, sinamaPuan: a.puan, soru: a.soruSayisi,
        katman: Object.fromEntries(Object.entries(a.katmanlar).map(([k, d]) => [k, d.yuzde])),
        gorev: g?.yuzde, okumaSn: durum.okumaSn, gorevSn: durum.gorevSn },
    });
    const enIyi = onceki.reduce((mx, r) => Math.max(mx, r.dogru ?? 0), 0);
    const mesaj = sinamaMesaji(a.dogruSayisi, a.soruSayisi);
    goster(4, 'Sonuç',
      el('p', { sinif: 'ders-buyuk-sonuc', metin: `Mini sınama: ${a.soruSayisi} sorudan ${a.dogruSayisi} doğru.` }),
      el('p', { metin: mesaj }),
      g && el('p', { metin: `Görevdeki puanlanan bölümler: ${yuzdeBicimle(g.yuzde)}.` }),
      el('p', { sinif: 'soluk', metin: `Ders yaklaşık ${sureMetni(sureSn)} sürdü.` }),
      onceki.length > 0 && el('p', { sinif: 'soluk', metin: `Bu dersi daha önce ${onceki.length} kez yaptın; mini sınamadaki en iyi sonucun ${enIyi} / ${a.soruSayisi} idi.` }),
      !kaydedildi && el('p', { sinif: 'alan__hata', metin: hata === 'profil' ? 'Profil seçili olmadığı için sonuç kaydedilmedi.' : 'Sonuç bu kez kaydedilemedi.' }),
      gozdenGecirmeOlustur(sonuc),
      ders.kapanis && el('div', { sinif: 'ders-ornek' }, el('p', { sinif: 'ders-ornek__baslik', metin: 'Bundan sonra' }), el('p', { metin: ders.kapanis })),
      el('div', { sinif: 'ders-eylemler' },
        el('a', { sinif: 'btn btn--birincil', href: geriAdres, metin: 'Tüm dersler' }),
        dugme('Dersi yeniden yap', giris, 'ikincil')));
    duyur(`Mini sınama: ${a.soruSayisi} sorudan ${a.dogruSayisi} doğru. ${mesaj}`);
  }

  giris();
  return { kapat: kabuk.kapat };
}
