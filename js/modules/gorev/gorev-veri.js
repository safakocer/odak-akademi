// Bugünün Görevi verisi (S35c; saf: DOM'a ve depoya dokunmaz, tests.html de kullanır): kurs yokken günlük öneri listesi (egzersiz + okuma; öncelik seviye testindeki gelişim alanı, sonra son 7 günde az çalışılan alan; sınıfa uygun okunmamış metin), süre tahmini, bütçe, tamam denetimi ve kademeye göre metinler (S35c-d: kompakt kart metinleri)
import { kademe } from '../../core/siniflar.js';
import { gunAnahtari, sayi } from '../../core/utils.js';

export const GOREV_SURUMU = 1;

// Kademeye göre sınırlar (kod sınıfa göre çatallanmaz; kademe(sinif) ile seçilir). Toplam öğe, egzersiz ve okuma sayısı
export const KADEME_SINIRLARI = Object.freeze({
  ortaokul: Object.freeze({ enCokOge: 4, egzersiz: 2, okuma: 2 }),
  ilkokul: Object.freeze({ enCokOge: 2, egzersiz: 1, okuma: 1 }),
});

// Süre tahmini (dk). Egzersiz süresi öğrencinin son kayıtlarından; kayıt yoksa varsayılan
export const SURE = Object.freeze({
  egzersizVarsayilanDk: 3, egzersizEnAzDk: 2, egzersizEnCokDk: 6, sonKayitSayisi: 5,
  okumaHazirlikDk: 0.5, soruDk: 0.5, okumaEnAzDk: 2, okumaPayOrani: 0.6, okumaEnAzPayDk: 4,
  enAzButceDk: 2, istegeBagliDk: 10, // kalan süre 2 dk’dan azsa (hedef tamam) öneri isteğe bağlı ve en çok 10 dk
  tekrarKartSn: 10, tekrarEnAzDk: 2, tekrarEnCokDk: 10,
});

export const ALANLAR = Object.freeze(['goz', 'dikkat', 'hafiza']); // egzersiz önerilen alanlar; okuma ayrı öğedir
export const HARIC_EGZERSIZLER = Object.freeze(['nefes', 'goz-molasi', 'hizli-oku', 'oku-anla']); // mola ve okuma ekranları egzersiz olarak önerilmez
export const EKSEN_ALANI = Object.freeze({ okumaHizi: 'oku', anlama: 'oku', dikkat: 'dikkat', hafiza: 'hafiza', gorme: 'goz' });
export const OKUMA_EGZERSIZI = Object.freeze({ ilk: 'oku-anla', ikinci: 'hizli-oku' }); // ilk okuma sorulu (anlama ölçülür), ikincisi deneme
export const VARSAYILAN_WPM = 150;

// Kademeye göre metinler (ilkokulda kısa). “Yapmalısın” yok; görev zorunluluk gibi sunulmaz
export const METINLER = Object.freeze({
  ortaokul: Object.freeze({
    profilYok: 'Profil oluşturunca bugünün görevi burada hazırlanır.',
    hazirlaniyor: 'Bugün için hazırlanıyor…',
    oneriBaslik: 'İstersen bunlarla başla',
    yeterBaslik: 'Bugünlük yeter',
    kursBaslik: 'Kurs: Gün {gun} / {toplam}',
    kursDevam: 'Derslere devam et',
    kursAc: 'Kursu aç',
    kursBitirNot: 'Dersler bitti; günü kurs sayfasında bitirebilirsin.',
    kursTamamBaslik: 'Bugünkü kurs günün tamam',
    kursDonusBaslik: 'Kursun seni bekliyor',
    kursDonusAlt: 'Nasıl devam edeceğini kurs sayfasında seçebilirsin.',
    oneriYok: 'Bugün için öneri hazırlanamadı. Çalışma alanlarından istediğini seçebilirsin.',
    yonerge: null,
    neden: Object.freeze({
      gelisim: 'Gelişim alanın: {alan}',
      'az-calisilan': 'Bu hafta az çalıştığın alan',
      okunmamis: 'Okumadığın bir metin',
      yeniden: 'Yeniden okuma, akıcılık için',
      deneme: 'Okuma modlarını dene (kaydedilmez)',
    }),
    tekrar: '{n} tekrar kartı',
    tekrarTamam: 'Tekrar kartları: bugün {n} kart',
    toplam: '{n} {birim} · yaklaşık {dk} dk · {tamam} tamam',
    adim: 'adım',
    ders: 'ders',
    istege: 'İsteğe bağlı',
    notBasla: 'Birkaç kısa tur yeterli.',
    notKalan: 'Hedefe {dk} dk kaldı.',
    notTamam: 'Hedefin tamam; bugünlük yeter diyebilirsin.',
    notUzun: 'Bugünlük yeter: ara ver, yarın devam edersin.',
    hafta: 'Hafta: {dk} / {hedef} dk',
    haftaTamam: 'Haftalık hedef tamam ({dk} dk)',
    karne: 'Kurs karnen',
    ilerleme: 'İlerlemem',
  }),
  ilkokul: Object.freeze({
    profilYok: 'Profil oluşturunca görevin burada.',
    hazirlaniyor: 'Hazırlanıyor…',
    oneriBaslik: 'İstersen bunlarla başla',
    yeterBaslik: 'Bugünlük yeter',
    kursBaslik: 'Kurs: Gün {gun} / {toplam}',
    kursDevam: 'Derslere devam et',
    kursAc: 'Kursu aç',
    kursBitirNot: 'Dersler bitti. Günü kursta bitir.',
    kursTamamBaslik: 'Bugünkü kurs günün tamam',
    kursDonusBaslik: 'Kursun seni bekliyor',
    kursDonusAlt: 'Kurs sayfasında devam et.',
    oneriYok: 'Bugün öneri yok. İstediğin oyunu seç.',
    yonerge: 'Birine dokun. Hemen açılır.',
    neden: Object.freeze({
      gelisim: 'Gelişim alanın',
      'az-calisilan': 'Bu hafta az oynadın',
      okunmamis: 'Yeni bir metin',
      yeniden: 'Yeniden oku',
      deneme: 'Deneme okuması',
    }),
    tekrar: '{n} tekrar kartı',
    tekrarTamam: 'Tekrar kartları: bugün {n} kart',
    toplam: '{n} {birim} · yaklaşık {dk} dk · {tamam} tamam',
    adim: 'adım',
    ders: 'ders',
    istege: 'İsteğe bağlı',
    notBasla: 'Kısa bir tur yeter.',
    notKalan: 'Hedefe {dk} dk kaldı.',
    notTamam: 'Hedefin tamam. Bugünlük yeter.',
    notUzun: 'Bugünlük yeter. Biraz dinlen.',
    hafta: 'Hafta: {dk} / {hedef} dk',
    haftaTamam: 'Haftalık hedef tamam ({dk} dk)',
    karne: 'Kurs karnen',
    ilerleme: 'İlerlemem',
  }),
});

/** Kademenin metinleri (kademe yoksa ortaokul) */
export const gorevMetinleri = (sinif) => METINLER[kademe(sinif)] ?? METINLER.ortaokul;
/** Kademenin sınırları (kademe yoksa ortaokul) */
export const gorevSinirlari = (sinif) => KADEME_SINIRLARI[kademe(sinif)] ?? KADEME_SINIRLARI.ortaokul;
/** {ad} yer tutucularını doldurur */
export const sablon = (metin, degerler = {}) => String(metin ?? '').replace(/\{(\w+)\}/g, (t, ad) => (ad in degerler ? String(degerler[ad]) : t));

export const DURUM_METNI = Object.freeze({ sirada: 'sırada', tamam: 'tamam', atlandi: 'atlandı' });

// ---------- Yardımcılar ----------
function gunKaydir(anahtar, n) {
  const [y, a, g] = anahtar.split('-').map(Number);
  return gunAnahtari(new Date(y, a - 1, g + n));
}
// Kısa, kararlı karma (aynı gün aynı seçim; Math.random yok)
export function karma(metin) {
  let h = 2166136261;
  for (const c of String(metin)) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619) >>> 0; }
  return h;
}
const sinirla = (v, en, enCok) => Math.min(enCok, Math.max(en, v));

/**
 * Bugünün öneri bütçesi: kalan süre (hedef − bugünkü dk). Kalan 2 dk’dan azsa (hedef tamam) öneri isteğe bağlıdır ve en çok 10 dk (hedeften fazla değil).
 * Döner: { butceDk, istegeBagli }
 */
export function butceHesapla({ hedefDk = 15, dk = 0 } = {}) {
  const kalan = Math.max(0, Math.round(hedefDk - dk));
  if (kalan >= SURE.enAzButceDk) return { butceDk: kalan, istegeBagli: false };
  return { butceDk: Math.min(SURE.istegeBagliDk, Math.max(SURE.enAzButceDk, hedefDk)), istegeBagli: true };
}

/** Bekleyen tekrar kartlarının yaklaşık süresi (dk): kart başına ~10 sn, 2-10 dk */
export function tekrarDk(kartSayisi) {
  const n = Math.max(0, sayi(kartSayisi) ?? 0);
  return n ? sinirla(Math.ceil((n * SURE.tekrarKartSn) / 60), SURE.tekrarEnAzDk, SURE.tekrarEnCokDk) : 0;
}

/** Egzersizin yaklaşık süresi: son 5 kaydının ortalaması (yukarı yuvarlanmış dk, 2-6); kayıt yoksa 3 */
export function egzersizDk(egzersiz, kayitlar = []) {
  const son = kayitlar.filter((k) => k?.egzersiz === egzersiz && (sayi(k.sureSn) ?? 0) > 0).slice(-SURE.sonKayitSayisi);
  if (!son.length) return SURE.egzersizVarsayilanDk;
  const ort = son.reduce((t, k) => t + sayi(k.sureSn), 0) / son.length;
  return sinirla(Math.ceil(ort / 60), SURE.egzersizEnAzDk, SURE.egzersizEnCokDk);
}

/** Okumanın yaklaşık süresi: kelime ÷ hız + (sorulu ise soru başına 0,5) + 0,5 dk hazırlık; en az 2 */
export function okumaDk(metin, wpm, { sorulu = true } = {}) {
  const w = sayi(wpm) > 0 ? sayi(wpm) : VARSAYILAN_WPM;
  const dk = (sayi(metin?.kelime) ?? 0) / w + (sorulu ? (sayi(metin?.soru) ?? 0) * SURE.soruDk : 0) + SURE.okumaHazirlikDk;
  return Math.max(SURE.okumaEnAzDk, Math.ceil(dk));
}

/** Son 7 günde (bugün dahil) alanlara göre çalışma saniyesi: { goz, dikkat, hafiza, … } */
export function alanSureleri(kayitlar = [], bugun, gun = 7) {
  const sinir = gunKaydir(bugun, -(gun - 1));
  const s = {};
  for (const k of kayitlar) {
    if (typeof k?.tarih !== 'string') continue;
    const g = gunAnahtari(k.tarih);
    if (g < sinir || g > bugun) continue;
    s[k.modul] = (s[k.modul] ?? 0) + (sayi(k.sureSn) ?? 0);
  }
  return s;
}

/**
 * Günlük öneri listesi (saf; aynı girdiyle aynı liste). girdi:
 * { sinif, butceDk, bugun 'YYYY-AA-GG', kayitlar (metrics), adaylar [{ ad, modul }] (sınıfa uygun egzersiz kartları),
 *   gelisim { eksen, egzersiz, etiket } | null (seviye testindeki gelişim alanı), metinler [{ kimlik, ad, kelime, soru, okundu (ISO) | null }] (sınıfa uygun),
 *   wpm, tohum (profil + gün) }
 * Sıra: gelişim alanı (okuma ise okuma) → okuma → az çalışılan alan → ikinci okuma (Hızlı Oku) → başka bir az çalışılan alan.
 * Her öğe sığarsa eklenir (toplam ≤ bütçe), kademe sınırları (ilkokulda en çok 2 öğe) aşılmaz.
 * Döner: [{ tur: 'egzersiz'|'okuma', egzersiz, alan, dk, neden: gelisim|az-calisilan|okunmamis|yeniden|deneme, gelisimEtiketi?, metin?, metinAd? }]
 */
export function gorevListesiOlustur(girdi = {}) {
  const { sinif, bugun, kayitlar = [], adaylar = [], gelisim = null, metinler = [], wpm, tohum = '' } = girdi;
  const butce = Math.max(0, Math.floor(sayi(girdi.butceDk) ?? 0));
  const s = gorevSinirlari(sinif);
  const ogeler = [];
  const sayac = { egzersiz: 0, okuma: 0 };
  let kalan = butce;
  const sigar = (tur, dk) => ogeler.length < s.enCokOge && sayac[tur] < s[tur] && dk <= kalan;
  const ekle = (oge) => { ogeler.push(oge); sayac[oge.tur] += 1; kalan -= oge.dk; };
  const sira = (ad) => karma(`${tohum}|${ad}`);

  // Egzersiz adayları (mola ve okuma ekranları hariç)
  const egz = adaylar.filter((a) => ALANLAR.includes(a.modul) && !HARIC_EGZERSIZLER.includes(a.ad));
  const sonTarih = new Map();
  for (const k of kayitlar) if (typeof k?.tarih === 'string' && (!sonTarih.has(k.egzersiz) || k.tarih > sonTarih.get(k.egzersiz))) sonTarih.set(k.egzersiz, k.tarih);
  const kullanilanAlan = new Set();
  const kullanilanEgz = new Set();
  const kullanilanMetin = new Set();

  function egzersizSec(alan, oncelikli) {
    const liste = egz.filter((a) => a.modul === alan && !kullanilanEgz.has(a.ad));
    if (!liste.length) return null;
    const tercih = oncelikli && liste.find((a) => a.ad === oncelikli);
    if (tercih) return tercih;
    // Hiç yapılmamış ya da en uzun süredir yapılmamış olan; eşitlikte güne göre kararlı sıra
    return [...liste].sort((a, b) => (sonTarih.get(a.ad) ?? '').localeCompare(sonTarih.get(b.ad) ?? '') || sira(a.ad) - sira(b.ad))[0];
  }
  function egzersizEkle(alan, neden, oncelikli) {
    const a = egzersizSec(alan, oncelikli);
    if (!a) return false;
    const dk = egzersizDk(a.ad, kayitlar);
    if (!sigar('egzersiz', dk)) return false;
    ekle({ tur: 'egzersiz', egzersiz: a.ad, alan, dk, neden, ...(neden === 'gelisim' && gelisim?.etiket ? { gelisimEtiketi: gelisim.etiket } : {}) });
    kullanilanAlan.add(alan);
    kullanilanEgz.add(a.ad);
    return true;
  }
  const sureler = alanSureleri(kayitlar, bugun);
  function azCalisilanEkle() {
    const alanlar = ALANLAR.filter((a) => egz.some((x) => x.modul === a) && !kullanilanAlan.has(a))
      .sort((a, b) => (sureler[a] ?? 0) - (sureler[b] ?? 0) || sira(a) - sira(b));
    for (const a of alanlar) if (egzersizEkle(a, 'az-calisilan')) return true;
    return false;
  }
  function okumaEkle(egzersiz, neden) {
    const sorulu = egzersiz === OKUMA_EGZERSIZI.ilk;
    const pay = Math.min(kalan, Math.max(SURE.okumaEnAzPayDk, Math.round(butce * SURE.okumaPayOrani)));
    const uygun = metinler.filter((m) => !kullanilanMetin.has(m.kimlik) && (!sorulu || (sayi(m.soru) ?? 0) > 0))
      .map((m) => ({ m, dk: okumaDk(m, wpm, { sorulu }) })).filter((x) => x.dk <= pay);
    if (!uygun.length || !sigar('okuma', Math.min(...uygun.map((x) => x.dk)))) return false;
    // Okunmamış: süreye en çok yaklaşan (uzunluk kalan süreye göre); yoksa en eski okunan (yeniden okuma)
    const okunmamis = uygun.filter((x) => !x.m.okundu).sort((a, b) => b.dk - a.dk || sira(a.m.kimlik) - sira(b.m.kimlik));
    const okunan = uygun.filter((x) => x.m.okundu).sort((a, b) => String(a.m.okundu).localeCompare(String(b.m.okundu)) || sira(a.m.kimlik) - sira(b.m.kimlik));
    const secilen = okunmamis[0] ?? okunan[0];
    const n = neden ?? (okunmamis[0] ? 'okunmamis' : 'yeniden');
    ekle({ tur: 'okuma', egzersiz, alan: 'oku', dk: secilen.dk, neden: n, metin: secilen.m.kimlik, metinAd: secilen.m.ad,
      ...(n === 'gelisim' && gelisim?.etiket ? { gelisimEtiketi: gelisim.etiket } : {}) });
    kullanilanMetin.add(secilen.m.kimlik);
    return true;
  }

  const gAlan = gelisim ? EKSEN_ALANI[gelisim.eksen] ?? null : null;
  if (gAlan === 'oku') okumaEkle(OKUMA_EGZERSIZI.ilk, 'gelisim');
  else if (gAlan) egzersizEkle(gAlan, 'gelisim', gelisim.egzersiz);
  if (!sayac.okuma) okumaEkle(OKUMA_EGZERSIZI.ilk);
  if (sayac.egzersiz < s.egzersiz) azCalisilanEkle();
  if (sayac.okuma < s.okuma) okumaEkle(OKUMA_EGZERSIZI.ikinci, 'deneme');
  if (sayac.egzersiz < s.egzersiz) azCalisilanEkle();
  // Hiç öğe sığmadıysa (ör. metin yok) yalnız egzersizle dene
  if (!ogeler.length) azCalisilanEkle();
  return ogeler;
}

/** Kayıtlı liste bugüne ve bu sınıfa mı ait? (gün içinde aynı liste; sınıf değişince yeniden kurulur) */
export function listeGecerliMi(kayit, { bugun, sinif } = {}) {
  return !!kayit && kayit.surum === GOREV_SURUMU && kayit.gun === bugun && Number(kayit.sinif) === Number(sinif)
    && typeof kayit.olusturma === 'string' && Array.isArray(kayit.ogeler);
}

/**
 * Öğe tamam mı? Liste kurulduktan sonra: egzersizde o egzersizin kaydı; okumada metnin “okundu” zamanı (Hızlı Oku kaydedilmediği için).
 * baglam: { kayitlar, olusturma (ISO), okunduZamani(kimlik) → ISO | null }
 */
export function ogeTamamMi(oge, { kayitlar = [], olusturma = '', okunduZamani = () => null } = {}) {
  if (oge?.tur === 'okuma') {
    const z = okunduZamani(oge.metin);
    return typeof z === 'string' && z >= olusturma;
  }
  return kayitlar.some((k) => k?.egzersiz === oge?.egzersiz && typeof k.tarih === 'string' && k.tarih >= olusturma);
}

/** Toplam süre (dk) */
export const toplamDk = (ogeler = []) => ogeler.reduce((t, o) => t + (sayi(o?.dk) ?? 0), 0);
