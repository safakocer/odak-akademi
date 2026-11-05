// Akıllı Kurs planlayıcı (S18b): kural tabanlı uyarlanabilir 21 günlük plan. Saf fonksiyonlar (girdi değişmez, yeni nesne döner); tüm değerler data/course-rules.json'dan
// Kullanım: kurallariYukle() → planOlustur({ sinif, profilDk, bugun, baslangicTesti, kurallar }) → her gün: atlananGunIsle → (yorgunModuUygula) → dersDurumuAyarla → gunSonuGuncelle

export const PLAN_SURUMU = 1;
const GUN_DESENI = /^\d{4}-\d{2}-\d{2}$/;
const KURAL_ADRESI = new URL('../../data/course-rules.json', import.meta.url);

// ---------- Küçük yardımcılar (bağımlılık yok; testte tek başına yüklenir) ----------
const kopya = (o) => structuredClone(o);
const sayi = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);
const sinirla = (n, en, enCok) => Math.min(enCok, Math.max(en, n));
const gunNo = (g) => { const [y, a, d] = g.split('-').map(Number); return Date.UTC(y, a - 1, d) / 86400000; };

/** İki gün anahtarı (YYYY-AA-GG) arasındaki takvim günü (sonraki − önceki) */
export function gunFarki(onceki, sonraki) {
  return Math.round(gunNo(sonraki) - gunNo(onceki));
}

function yuvarla(n, K) {
  return K.kurs.yuvarlama === 'yarim-yukari' ? Math.floor(n + 0.5) : Math.round(n);
}

// ---------- Kurallar ----------
// Planlayıcının okuduğu her değer; biri eksikse kural dosyası geçersiz sayılır
const ZORUNLU_YOLLAR = [
  'surum', 'kurs.gunSayisi', 'kurs.gundeDers', 'kurs.takvimGunundeEnCokKursGunu', 'kurs.gunTamamEnAzDers', 'kurs.gunTamamZorunluTip',
  'kurs.enUzunTakvimGun', 'gunTurleri.pekistirmeAraligi', 'gunTurleri.olcumGunleri', 'gunTurleri.cakismaOnceligi', 'gunTurleri.hedefArtisiYok',
  'baslangic.sinifVarsayilanWpm', 'baslangic.testAnlamaDusukCarpani', 'baslangic.hizliGecisteTestsiz', 'kalibrasyon.okumaModu', 'kalibrasyon.anlamaDusukCarpani',
  'hedef.wpmSinir', 'hedef.artisKademeleri', 'hedef.baslangicKademe', 'hedef.ustSinirOrani', 'hedef.ustSinirOraniAralik', 'hedef.tabanOrani',
  'hedef.tutmaToleransi', 'hedef.hizDersiCarpani', 'hedef.hizDersiCarpaniDondurulmus', 'hedef.yuksekBaslangic.esikWpm',
  'hedef.yuksekBaslangic.ustSinirOrani', 'hedef.yuksekBaslangic.enCokKademe', 'hedef.artisKapaliEsikWpm', 'hedef.tavanda.hizDersiModu',
  'hedef.tavanda.agirlikDegisimi', 'anlama.esik', 'anlama.ileriEsik', 'anlama.dusukSeriEsigi', 'anlama.dusukSeriDusus',
  'olcum.okumaModu', 'olcum.metin', 'olcum.dersSirasi', 'olcum.hizDersiCarpani', 'olcum.yukariKalibrasyon.wpmOrani',
  'olcum.yukariKalibrasyon.enAzAnlama', 'olcum.asagiKalibrasyon.wpmOrani', 'olcum.guncellenenEksenler', 'ara.kurallar', 'ara.kaldigimYerdenEylem',
  'yorgun.dersler', 'yorgun.sureProfili', 'yorgun.hedefArtisi', 'yorgun.anlamaSayilir', 'yorgun.kursGunuSayilir', 'yorgun.esnekKrediTuketimi',
  'yorgun.ardArdaOneriEsigi', 'yorgun.oneri', 'olcum.finalTestiGunu', 'ara.yenidenBaslatmaSecenekleri',
  'sureProfilleri.varsayilan', 'sureProfilleri.secenekler', 'slotlar', 'pekistirme.hizDersiModu', 'pekistirme.besinciDers.tip',
  'pekistirme.besinciDers.arac', 'pekistirme.zorlukFarki', 'dersTipleri', 'agirlik.temel', 'agirlik.enZayifEk', 'agirlik.ikinciZayifEk',
  'agirlik.dengeliFark', 'agirlik.enAzEksen', 'agirlik.esitlikSirasi', 'agirlik.ayniTipGunlukEnCok', 'kararOnceligi', 'korumalar',
  'kararMetinleri', 'aciklamalar',
];
const yolAl = (o, yol) => yol.split('.').reduce((v, k) => (v == null ? undefined : v[k]), o);
// Yöntem seçen alanlar: kod yalnız bu değerleri bilir; başka bir değer yazılırsa kural dosyası geçersiz sayılır (sessizce yok sayılmaz)
const DESTEKLENEN = {
  'kurs.yuvarlama': ['yarim-yukari'], 'baslangic.testsizIlkGun': ['kalibrasyon', 'yok'], 'kalibrasyon.anlamaIyiyse': ['olculen-wpm'],
  'anlama.veriYoksa': ['sabit-seri-degismez'], 'ara.olcu': ['kacirilan-gun'], 'ara.kaldigimYerdenEylem': ['kalibrasyon', 'devam'],
  havuzSecimi: ['tip-sayaci-mod-havuz'], 'agirlik.yontem': ['kredili-dagitim'],
};

/** Kural nesnesindeki eksikleri listeler (boş dizi = geçerli) */
export function kurallariDenetle(K) {
  if (!K || typeof K !== 'object') return ['kural dosyası'];
  const eksik = ZORUNLU_YOLLAR.filter((y) => yolAl(K, y) === undefined);
  for (const [y, degerler] of Object.entries(DESTEKLENEN)) {
    const v = yolAl(K, y);
    if (v !== undefined && !degerler.includes(v)) eksik.push(`${y} (desteklenen: ${degerler.join(', ')})`);
  }
  if (!eksik.length) {
    if (K.slotlar.length !== K.kurs.gundeDers) eksik.push('slotlar (gundeDers kadar olmalı)');
    if (K.olcum.dersSirasi.length !== K.kurs.gundeDers) eksik.push('olcum.dersSirasi (gundeDers kadar olmalı)');
    for (const dk of K.sureProfilleri.secenekler) if (!K.sureProfilleri[String(dk)]) eksik.push(`sureProfilleri.${dk}`);
    for (const [t, b] of Object.entries(K.dersTipleri)) if (!Array.isArray(b.havuz) || !b.havuz.length || !b.eksen) eksik.push(`dersTipleri.${t}`);
  }
  return eksik;
}

function kurallariAl(K) {
  const eksik = kurallariDenetle(K);
  if (eksik.length) throw new TypeError(`Kurs kuralları eksik ya da hatalı: ${eksik.slice(0, 5).join(', ')}`);
  return K;
}

let kuralSozu = null;
/** data/course-rules.json'ı bir kez yükler. Döner: { tamam: true, kurallar } | { tamam: false, hata } (öğrenciye gösterilebilir nazik metin) */
export function kurallariYukle() {
  kuralSozu ??= (async () => {
    try {
      const yanit = await fetch(KURAL_ADRESI);
      if (!yanit.ok) throw new Error(`HTTP ${yanit.status}`);
      const K = await yanit.json();
      const eksik = kurallariDenetle(K);
      if (eksik.length) throw new Error(`eksik alanlar: ${eksik.join(', ')}`);
      return { tamam: true, kurallar: K };
    } catch (h) {
      console.error('[kurs] Kural dosyası yüklenemedi:', h);
      kuralSozu = null; // sonraki denemede yeniden yüklensin
      return { tamam: false, hata: 'Kurs planı şu an hazırlanamadı. İnternet bağlantını kontrol edip sayfayı yenile; sorun sürerse uygulamayı güncelle.' };
    }
  })();
  return kuralSozu;
}

// ---------- Sınırlar ve ağırlıklar ----------
function sinirlarHesapla(baslangicWpm, K) {
  const H = K.hedef;
  const [en, enCok] = H.wpmSinir;
  const yuksek = baslangicWpm >= H.yuksekBaslangic.esikWpm;
  const ustOran = yuksek ? H.yuksekBaslangic.ustSinirOrani : sinirla(H.ustSinirOrani, ...H.ustSinirOraniAralik);
  return {
    tabanWpm: sinirla(yuvarla(baslangicWpm * H.tabanOrani, K), en, enCok),
    tavanWpm: sinirla(yuvarla(baslangicWpm * (1 + ustOran), K), en, enCok),
    enCokKademe: yuksek ? H.yuksekBaslangic.enCokKademe : H.artisKademeleri.length - 1,
    artisKapali: baslangicWpm >= H.artisKapaliEsikWpm,
  };
}

// Korumalar kural dosyasındaki sırayla, her zaman en son uygulanır
function korumalariUygula(hedef, d, K) {
  let h = hedef;
  for (const k of K.korumalar) {
    if (k === 'wpm-siniri') h = sinirla(h, ...K.hedef.wpmSinir);
    else if (k === 'taban') h = Math.max(h, d.tabanWpm);
    else if (k === 'tavan') h = Math.min(h, d.tavanWpm);
  }
  return yuvarla(h, K);
}

const tipListesi = (K) => [...K.agirlik.esitlikSirasi.filter((t) => K.dersTipleri[t]), ...Object.keys(K.dersTipleri).filter((t) => !K.agirlik.esitlikSirasi.includes(t))];

/** Esnek ders ağırlıkları: temel + en zayıf iki eksene ek (ölçülen eksen ≥ enAzEksen ve fark ≥ dengeliFark ise); tavandaysa hız → anlama */
export function agirlikHesapla(eksenPuanlari, K, tavanda = false) {
  const A = K.agirlik;
  const tipler = tipListesi(K);
  const ag = Object.fromEntries(tipler.map((t) => [t, A.temel[t] ?? 0]));
  const olculen = tipler.map((t) => ({ t, p: sayi(eksenPuanlari?.[K.dersTipleri[t].eksen]) })).filter((x) => x.p !== undefined);
  if (olculen.length >= A.enAzEksen) {
    olculen.sort((a, b) => a.p - b.p || tipler.indexOf(a.t) - tipler.indexOf(b.t));
    if (olculen.at(-1).p - olculen[0].p >= A.dengeliFark) {
      ag[olculen[0].t] += A.enZayifEk;
      if (olculen[1]) ag[olculen[1].t] += A.ikinciZayifEk;
    }
  }
  if (tavanda) for (const [t, fark] of Object.entries(K.hedef.tavanda.agirlikDegisimi)) if (t in ag) ag[t] = Math.max(0, ag[t] + fark);
  return ag;
}

// Kredili dağıtım: her slotta krediye ağırlık eklenir, en yüksek seçilir (eşitlikte esitlikSirasi), seçilenden toplam ağırlık düşülür
function esnekSec(sim, gunSayac, K) {
  const tipler = tipListesi(K);
  const toplam = tipler.reduce((t, x) => t + (sim.agirlik[x] ?? 0), 0);
  for (const t of tipler) sim.kredi[t] = (sim.kredi[t] ?? 0) + (sim.agirlik[t] ?? 0);
  let sec = null;
  for (const t of tipler) {
    if ((sim.agirlik[t] ?? 0) <= 0 || (gunSayac[t] ?? 0) >= K.agirlik.ayniTipGunlukEnCok) continue;
    if (sec === null || sim.kredi[t] > sim.kredi[sec]) sec = t;
  }
  sec ??= tipler.find((t) => (gunSayac[t] ?? 0) < K.agirlik.ayniTipGunlukEnCok) ?? tipler[0];
  sim.kredi[sec] -= toplam;
  gunSayac[sec] = (gunSayac[sec] ?? 0) + 1;
  return sec;
}

// ---------- Gün ve ders üretimi ----------
/** Kurs gününün türü: olcum | pekistirme | normal (çakışmada cakismaOnceligi) */
export function gunTuru(n, K) {
  const T = K.gunTurleri;
  const turler = ['normal'];
  if (T.olcumGunleri.includes(n)) turler.push('olcum');
  if (T.pekistirmeAraligi > 0 && n % T.pekistirmeAraligi === 0) turler.push('pekistirme');
  return T.cakismaOnceligi.find((t) => turler.includes(t)) ?? 'normal';
}

// Günün slot tipleri: 'esnek' = kredili seçim; pekiştirmede 5. slot sabit hafıza/tekrar
function slotPlani(tur, K) {
  const temel = [...K.slotlar].sort((a, b) => a.sira - b.sira);
  const tipler = tur === 'olcum' ? [...K.olcum.dersSirasi] : temel.map((s) => s.sabit ?? 'esnek');
  return tipler.map((tip, i) => {
    if (tur === 'pekistirme' && i === tipler.length - 1) return { tip: K.pekistirme.besinciDers.tip, tekrar: true, esnekYeri: tip === 'esnek' };
    return { tip, esnekYeri: tip === 'esnek' };
  });
}

function sabitTipSayilari(plan) {
  const s = {};
  for (const x of plan) if (x.tip !== 'esnek') s[x.tip] = (s[x.tip] ?? 0) + 1;
  return s;
}

function havuzdan(tip, sim, K) {
  const b = K.dersTipleri[tip];
  const i = sim.tipSayaci[tip] ?? 0;
  sim.tipSayaci[tip] = i + 1;
  return { egzersiz: b.havuz[i % b.havuz.length], mod: b.modlar?.length ? b.modlar[i % b.modlar.length] : undefined };
}

function hizCarpani(tur, d, K) {
  if (tur === 'olcum') return K.olcum.hizDersiCarpani;
  return d.dusukSeri > 0 ? K.hedef.hizDersiCarpaniDondurulmus : K.hedef.hizDersiCarpani;
}

// Tek günü üretir; sim (kredi, tipSayaci, agirlik) yerinde ilerler
function gunUret(n, sim, { K, d, profilDk, hedefWpm, kalibrasyon }) {
  const tur = gunTuru(n, K);
  const profil = K.sureProfilleri[String(profilDk)];
  const plan = slotPlani(tur, K);
  const sayac = sabitTipSayilari(plan);
  const pek = tur === 'pekistirme';
  let esnekSira = 0;
  const dersler = plan.map((slot, i) => {
    const dk = slot.esnekYeri ? profil.esnek[esnekSira++] ?? profil.esnek.at(-1) : profil[slot.tip];
    const ders = { sira: i + 1, tip: slot.tip, dk, sabit: !slot.esnekYeri || !!slot.tekrar, ayar: {}, durum: 'bekliyor' };
    if (slot.tekrar) {
      const b = K.pekistirme.besinciDers;
      return { ...ders, arac: b.arac, kosul: b.kosul, yedekEgzersiz: b.yedekEgzersiz };
    }
    if (slot.tip === 'esnek') ders.tip = esnekSec(sim, sayac, K);
    const { egzersiz, mod } = havuzdan(ders.tip, sim, K);
    ders.egzersiz = egzersiz;
    if (ders.tip === 'hiz') {
      ders.ayar.mod = d.tavanda ? K.hedef.tavanda.hizDersiModu : pek ? K.pekistirme.hizDersiModu : mod;
      if (hedefWpm) ders.ayar.wpm = korumaliHiz(hedefWpm * hizCarpani(tur, d, K), K);
      if (ders.ayar.mod === K.pekistirme.hizDersiModu || ders.ayar.mod === K.hedef.tavanda.hizDersiModu) ders.ayar.metin = 'onceki-anlama';
    } else if (ders.tip === 'anlama') {
      ders.ayar.mod = kalibrasyon ? K.kalibrasyon.okumaModu : tur === 'olcum' ? K.olcum.okumaModu : mod;
      if (hedefWpm && ders.ayar.mod !== K.olcum.okumaModu && ders.ayar.mod !== K.kalibrasyon.okumaModu) ders.ayar.wpm = hedefWpm;
      ders.ayar.metin = tur === 'olcum' ? K.olcum.metin : `sinif-okunmamis-${profil.metinUzunlugu}`;
    }
    if (pek && ders.tip !== 'hiz' && ders.tip !== 'anlama' && K.pekistirme.zorlukFarki) ders.ayar.zorlukFarki = K.pekistirme.zorlukFarki;
    if (!ders.ayar.mod) delete ders.ayar.mod;
    return ders;
  });
  return { gun: n, tur, hedefWpm: hedefWpm ?? null, yorgun: false, kalibrasyon: !!kalibrasyon, tarih: null, tamamlandi: false, dersler, sonuc: null, karar: null };
}

const korumaliHiz = (w, K) => yuvarla(sinirla(w, ...K.hedef.wpmSinir), K);

// Yalnız tamamlanmamış günler (bugünkü kurs günü ve sonrası) yeniden üretilir; geçmiş günler değişmez
function gelecekUret(p, K) {
  const d = p.durum;
  const sim = { kredi: { ...d.kredi }, tipSayaci: { ...d.tipSayaci }, agirlik: { ...d.agirlik } };
  for (let n = d.gun; n <= K.kurs.gunSayisi; n++) {
    if (p.gunler[n - 1]?.tamamlandi) continue;
    p.gunler[n - 1] = gunUret(n, sim, {
      K, d, profilDk: p.profilDk,
      hedefWpm: n === d.gun ? d.hedefWpm : null,
      kalibrasyon: n === d.gun && d.kalibrasyonBekliyor,
    });
  }
  return p;
}

// Tamamlanan günün kredi ve sayaç etkisi (gün üretilirken yapılanın aynısı; yorgun günde yalnız kalan esnek dersler)
function gunEtkisiniIsle(d, gun, K) {
  const sim = { kredi: { ...d.kredi }, tipSayaci: { ...d.tipSayaci }, agirlik: d.agirlik };
  const sayac = sabitTipSayilari(slotPlani(gun.tur, K));
  const esnekSayisi = gun.dersler.filter((x) => !x.sabit).length;
  for (let i = 0; i < esnekSayisi; i++) esnekSec(sim, sayac, K);
  for (const x of gun.dersler) if (x.egzersiz && !x.arac) sim.tipSayaci[x.tip] = (sim.tipSayaci[x.tip] ?? 0) + 1;
  d.kredi = sim.kredi;
  d.tipSayaci = sim.tipSayaci;
}

function agirlikYenile(d, K) {
  const yeni = agirlikHesapla(d.eksenPuanlari, K, d.tavanda);
  const degisti = Object.keys(yeni).some((t) => yeni[t] !== d.agirlik[t]);
  d.agirlik = yeni;
  if (degisti && K.agirlik.agirlikDegisinceKrediSifirla) d.kredi = Object.fromEntries(Object.keys(yeni).map((t) => [t, 0]));
}

function gunAnahtariMi(g) {
  return typeof g === 'string' && GUN_DESENI.test(g) && Number.isFinite(gunNo(g));
}

// ---------- Plan oluşturma ----------
/**
 * Girdi: { sinif (5-8), profilDk (15|20|30), bugun (YYYY-AA-GG), baslangicTesti: TestSonucu | null, kurallar, olcekWpm?: [en, enCok], gecmis?: [] }
 * Döner: Kurs planı (PROJE_DEFTERI.md şeması). Hatalı girdi → TypeError
 */
export function planOlustur(girdi) {
  const K = kurallariAl(girdi?.kurallar);
  const sinif = Number(girdi.sinif);
  if (!(String(sinif) in K.baslangic.sinifVarsayilanWpm)) throw new TypeError('planOlustur: sınıf 5-8 olmalı.');
  if (!gunAnahtariMi(girdi.bugun)) throw new TypeError('planOlustur: bugun YYYY-AA-GG olmalı.');
  const profilDk = K.sureProfilleri.secenekler.includes(Number(girdi.profilDk)) ? Number(girdi.profilDk) : K.sureProfilleri.varsayilan;
  const test = girdi.baslangicTesti ?? null;

  // S19: testte metin çok hızlı geçildiyse (hizliGecis) okuma hızı güvenilir değil: testsiz başlangıç gibi davranılır
  const hizliGecis = K.baslangic.hizliGecisteTestsiz === true && test?.okuma?.hizliGecis === true;
  let wpm = hizliGecis ? undefined : sayi(test?.okuma?.wpm);
  let kalibrasyon = false;
  if (wpm === undefined) {
    wpm = K.baslangic.sinifVarsayilanWpm[String(sinif)];
    kalibrasyon = K.baslangic.testsizIlkGun === 'kalibrasyon';
  } else {
    const a = sayi(test.anlama?.yuzde);
    if (a !== undefined && a < K.anlama.esik) wpm *= K.baslangic.testAnlamaDusukCarpani;
  }
  wpm = korumaliHiz(wpm, K);

  const tipler = tipListesi(K);
  const eksenPuanlari = {};
  for (const t of tipler) {
    const e = K.dersTipleri[t].eksen;
    eksenPuanlari[e] = hizliGecis && e === 'okumaHizi' ? null : sayi(test?.puanlar?.[e]) ?? null;
  }
  const s = sinirlarHesapla(wpm, K);
  const durum = {
    gun: 1, hedefWpm: wpm, baslangicWpm: wpm, ...s,
    kademe: Math.min(K.hedef.baslangicKademe, s.enCokKademe), dusukSeri: 0, yorgunSeri: 0,
    tavanda: false, kalibrasyonBekliyor: kalibrasyon, yenidenBaslatmaOnerisi: false, uzunAraSoruldu: false,
    oneri: null, araIslenen: null, sayilmayanTarih: null, bitti: false, sonKarar: null, eksenPuanlari,
    agirlik: {}, kredi: Object.fromEntries(tipler.map((t) => [t, 0])), tipSayaci: Object.fromEntries(tipler.map((t) => [t, 0])),
  };
  durum.agirlik = agirlikHesapla(eksenPuanlari, K, false);
  const plan = {
    surum: PLAN_SURUMU, kuralSurumu: K.surum, baslangic: girdi.bugun, sonAktif: null, sinif, profilDk,
    olcekWpm: Array.isArray(girdi.olcekWpm) ? [...girdi.olcekWpm] : null,
    durum, gunler: new Array(K.kurs.gunSayisi).fill(null),
    gecmis: Array.isArray(girdi.gecmis) ? kopya(girdi.gecmis).slice(-5) : [],
  };
  return gelecekUret(plan, K);
}

/** Yeniden başlatma ya da yeni dönem için kısa özet (plan.gecmis öğesi) */
export function gecmisOzeti(plan, bitis) {
  const d = plan.durum;
  return {
    baslangic: plan.baslangic, bitis: bitis ?? plan.sonAktif, tamamlananGun: plan.gunler.filter((g) => g?.tamamlandi).length,
    baslangicWpm: d.baslangicWpm, sonHedefWpm: d.hedefWpm,
  };
}

/** Şekil denetimi (depodan okunan plan için) */
export function planDenetle(p, K) {
  return !!p && typeof p === 'object' && p.surum === PLAN_SURUMU && gunAnahtariMi(p.baslangic) && p.durum && typeof p.durum === 'object'
    && Array.isArray(p.gunler) && (!K || p.gunler.length === K.kurs.gunSayisi) && p.gunler.every((g) => g && Array.isArray(g.dersler));
}

// ---------- Ders durumu ----------
const DERS_DURUMLARI = ['bekliyor', 'tamam', 'atlandi'];

/** Bir dersin durumunu değiştirir (yalnız tamamlanmamış günde). Döner: yeni plan */
export function dersDurumuAyarla(plan, gun, sira, durum) {
  const p = kopya(plan);
  const g = p.gunler[gun - 1];
  const ders = g?.dersler.find((x) => x.sira === sira);
  if (!ders || g.tamamlandi || !DERS_DURUMLARI.includes(durum)) return p;
  ders.durum = durum;
  return p;
}

// ---------- Gün sonu değerlendirmesi ----------
/**
 * gunSonucu: { gun?, tarih (YYYY-AA-GG), dersler?: { sira: durum }, wpm?, anlamaYuzde?, eoh? } (wpm/anlama: günün anlama dersinin sonucu)
 * Döner: { plan, tamamlandi, ilerledi (kurs günü arttı mı), karar: { kod, onceki, yeni } | null, neden? }
 * neden: kurs-bitti | yeniden-baslat-bekliyor | tarih-gecersiz | takvim-siniri | gun-uyusmaz | eksik-ders | anlama-eksik
 */
export function gunSonuGuncelle(plan, gunSonucu, kurallar) {
  const K = kurallariAl(kurallar);
  const p = kopya(plan);
  const d = p.durum;
  const gs = gunSonucu ?? {};
  const red = (neden) => ({ plan: p, tamamlandi: false, ilerledi: false, karar: null, neden });

  if (d.bitti) return red('kurs-bitti');
  if (d.yenidenBaslatmaOnerisi) return red('yeniden-baslat-bekliyor');
  if (!gunAnahtariMi(gs.tarih) || (p.sonAktif && gunFarki(p.sonAktif, gs.tarih) < 0)) return red('tarih-gecersiz');
  const bugunYapilan = p.gunler.filter((g) => g.tarih === gs.tarih).length + (d.sayilmayanTarih === gs.tarih ? 1 : 0);
  if (bugunYapilan >= K.kurs.takvimGunundeEnCokKursGunu) return red('takvim-siniri');
  if (gs.gun !== undefined && gs.gun !== d.gun) return red('gun-uyusmaz');

  const gun = p.gunler[d.gun - 1];
  for (const [sira, durum] of Object.entries(gs.dersler ?? {})) {
    const ders = gun.dersler.find((x) => x.sira === Number(sira));
    if (ders && DERS_DURUMLARI.includes(durum)) ders.durum = durum;
  }
  const tamam = gun.dersler.filter((x) => x.durum === 'tamam').length;
  if (tamam < Math.min(K.kurs.gunTamamEnAzDers, gun.dersler.length)) return red('eksik-ders');
  const zorunlu = gun.dersler.find((x) => x.tip === K.kurs.gunTamamZorunluTip);
  if (zorunlu && zorunlu.durum !== 'tamam') return red('anlama-eksik');

  const wpm = sayi(gs.wpm);
  const anlama = sayi(gs.anlamaYuzde);
  const anlamaSayilmaz = gun.yorgun && !K.yorgun.anlamaSayilir;
  const veri = !anlamaSayilmaz && wpm !== undefined && anlama !== undefined;
  const hedef = gun.hedefWpm ?? d.hedefWpm;
  const tuttu = veri && wpm >= hedef * K.hedef.tutmaToleransi;
  const yarinTur = d.gun < K.kurs.gunSayisi ? gunTuru(d.gun + 1, K) : null;

  // 1) Aday kararlar
  const aday = [];
  let seri = d.dusukSeri;
  if (!veri) {
    aday.push({ tur: 'sabit', kod: anlamaSayilmaz ? 'sabit-yorgun' : 'sabit-veri-yok', yeni: hedef });
  } else {
    if (gun.kalibrasyon) {
      // Not: anlama düşükken kalibrasyon hedefi yükseltmez (önceki hedeften büyük olamaz)
      aday.push({ tur: 'kalibrasyon', kod: 'kalibrasyon', yeni: anlama >= K.anlama.esik ? wpm : Math.min(wpm * K.kalibrasyon.anlamaDusukCarpani, hedef) });
    }
    if (anlama < K.anlama.esik) {
      seri = d.dusukSeri + 1;
      if (seri >= K.anlama.dusukSeriEsigi) aday.push({ tur: 'dusur', kod: 'dusur-seri', yeni: hedef * (1 - K.anlama.dusukSeriDusus) });
      else aday.push({ tur: 'sabit', kod: 'sabit-anlama', yeni: hedef });
    } else {
      seri = 0;
    }
    if (gun.tur === 'olcum') {
      const Y = K.olcum.yukariKalibrasyon;
      // Not: aşağı ayar hedefi düşürdüğü için "dusur" sırasında değerlendirilir (en temkinli kazanır)
      if (wpm >= hedef * Y.wpmOrani && anlama >= Y.enAzAnlama) aday.push({ tur: 'ayarla', kod: 'ayarla-yukari', yeni: wpm });
      else if (wpm < hedef * K.olcum.asagiKalibrasyon.wpmOrani) aday.push({ tur: 'dusur', kod: 'ayarla-asagi', yeni: wpm });
    }
    // Artış engelleri yalnız günlük artışın yerini alır (katman artir); ölçüm ayarını engellemez
    if (anlama >= K.anlama.esik) {
      const engel = (kod) => aday.push({ tur: 'sabit', katman: 'artir', kod, yeni: hedef });
      if (!tuttu) engel('sabit-tutmadi');
      else if (gun.yorgun && !K.yorgun.hedefArtisi) engel('sabit-yorgun');
      else if (K.gunTurleri.hedefArtisiYok.includes(gun.tur) || K.gunTurleri.hedefArtisiYok.includes(yarinTur)) engel('sabit-gun-turu');
      else if (d.tavanda || d.artisKapali) engel('tavan');
      else {
        const kademe = anlama >= K.anlama.ileriEsik ? Math.min(d.kademe + 1, d.enCokKademe) : d.kademe;
        aday.push({ tur: 'artir', kod: 'artir', yeni: hedef * (1 + K.hedef.artisKademeleri[kademe]), kademe });
      }
    }
  }
  // 2) Öncelik: kararOnceligi sırası; aynı sırada daha düşük hedef (daha temkinli) kazanır
  const sira = (a) => { const i = K.kararOnceligi.indexOf(a.katman ?? a.tur); return i < 0 ? K.kararOnceligi.length : i; };
  aday.sort((a, b) => sira(a) - sira(b) || a.yeni - b.yeni);
  const secilen = aday[0];

  // 3) Uygula; sınırlar en son
  if (secilen.tur === 'kalibrasyon') {
    const yeniBaslangic = korumaliHiz(secilen.yeni, K);
    if (K.kalibrasyon.baslangicWpmGuncelle) {
      d.baslangicWpm = yeniBaslangic;
      Object.assign(d, sinirlarHesapla(yeniBaslangic, K));
      d.tavanda = false;
    }
    if (K.kalibrasyon.seriSifirla) seri = 0;
    if (K.kalibrasyon.kademeSifirla) d.kademe = Math.min(K.hedef.baslangicKademe, d.enCokKademe);
  }
  if (secilen.kod === 'dusur-seri') {
    seri = 0; // bir sonraki düşüş için yeniden iki gün gerekir
    if (K.anlama.dususteKademeSifirla) d.kademe = Math.min(K.hedef.baslangicKademe, d.enCokKademe);
  }
  if (secilen.tur === 'artir') d.kademe = secilen.kademe;
  let yeniHedef = korumalariUygula(secilen.yeni, d, K);
  let kod = secilen.kod;
  if (!d.tavanda && (secilen.tur === 'artir' || secilen.tur === 'ayarla') && yeniHedef >= d.tavanWpm) kod = 'tavan';
  if (veri) d.dusukSeri = seri;
  d.hedefWpm = yeniHedef;
  d.tavanda = yeniHedef >= d.tavanWpm;
  if (gun.kalibrasyon) d.kalibrasyonBekliyor = !veri;

  // Ölçüm günü eksenleri güncellenir (ağırlıklar yeniden hesaplanır)
  if (veri && gun.tur === 'olcum') {
    for (const e of K.olcum.guncellenenEksenler) {
      if (e === K.dersTipleri.anlama?.eksen) d.eksenPuanlari[e] = Math.round(sinirla(anlama, 0, 100));
      else if (e === K.dersTipleri.hiz?.eksen && p.olcekWpm) {
        const [en, enCok] = p.olcekWpm;
        d.eksenPuanlari[e] = Math.round(sinirla((wpm - en) / (enCok - en), 0, 1) * 100);
      }
    }
  }
  gunEtkisiniIsle(d, gun, K);
  agirlikYenile(d, K);

  d.yorgunSeri = gun.yorgun ? d.yorgunSeri + 1 : 0;
  d.oneri = d.yorgunSeri >= K.yorgun.ardArdaOneriEsigi ? K.yorgun.oneri : null;

  const karar = { kod, onceki: hedef, yeni: yeniHedef };
  // Yorgun gün kurs gününe sayılmıyorsa: takvim günü dolar, kurs günü ilerlemez; gün yarın normal planla yeniden gelir
  if (gun.yorgun && !K.yorgun.kursGunuSayilir) {
    p.sonAktif = gs.tarih;
    d.sayilmayanTarih = gs.tarih;
    d.araIslenen = null;
    d.sonKarar = { ...karar, gun: gun.gun, tarih: gs.tarih };
    gelecekUret(p, K);
    return { plan: p, tamamlandi: true, ilerledi: false, karar };
  }
  Object.assign(gun, {
    tamamlandi: true, tarih: gs.tarih, karar,
    sonuc: veri ? { wpm, anlamaYuzde: anlama, eoh: sayi(gs.eoh) ?? yuvarla((wpm * anlama) / 100, K), tuttu } : null,
  });
  p.sonAktif = gs.tarih;
  d.araIslenen = null;
  d.sonKarar = { ...karar, gun: gun.gun, tarih: gs.tarih };
  d.gun += 1;
  if (d.gun > K.kurs.gunSayisi) d.bitti = true;
  else gelecekUret(p, K);
  return { plan: p, tamamlandi: true, ilerledi: true, karar };
}

// ---------- Ara (kaçırılan günler) ----------
/** Kaçırılan takvim günü: son tamamlanan günden (yoksa başlangıçtan) bugüne */
export function kacirilanGun(plan, tarih) {
  if (!gunAnahtariMi(tarih)) return 0;
  return Math.max(0, plan.sonAktif ? gunFarki(plan.sonAktif, tarih) - 1 : gunFarki(plan.baslangic, tarih));
}

/**
 * Uygulama/kurs açılınca çağrılır. Ara kuralını bir kez uygular (aynı ara için daha üst bir aralığa geçilirse fark uygulanır).
 * Döner: { plan, degisti, kacirilan, karar: { kod, onceki, yeni } | null }
 */
export function atlananGunIsle(plan, tarih, kurallar) {
  const K = kurallariAl(kurallar);
  const p = kopya(plan);
  const d = p.durum;
  const bos = (kacirilan = 0) => ({ plan: p, degisti: false, kacirilan, karar: null });
  if (d.bitti || !gunAnahtariMi(tarih) || (p.sonAktif && gunFarki(p.sonAktif, tarih) < 0)) return bos();

  const kacirilan = kacirilanGun(p, tarih);
  const kurallarListe = K.ara.kurallar;
  let bant = kurallarListe.findIndex((r) => kacirilan >= r.enAz && (r.enCok == null || kacirilan <= r.enCok));
  const yenidenBant = kurallarListe.findIndex((r) => r.eylem === 'yeniden-baslatma-oner');
  const uzun = !d.uzunAraSoruldu && gunFarki(p.baslangic, tarih) > K.kurs.enUzunTakvimGun && yenidenBant >= 0;
  if (uzun) bant = Math.max(bant, yenidenBant);
  const kural = kurallarListe[bant];
  if (!kural) return bos(kacirilan);
  const etkisiz = kural.eylem === 'devam' && kural.hedefCarpani === 1 && !kural.seriSifirla;
  const ref = p.sonAktif ?? p.baslangic;
  if (etkisiz || (d.araIslenen && d.araIslenen.ref === ref && d.araIslenen.bant >= bant)) return bos(kacirilan);

  const araOncesi = d.araIslenen?.ref === ref ? d.araIslenen.hedef : d.hedefWpm;
  const onceki = d.hedefWpm;
  d.hedefWpm = korumalariUygula(araOncesi * kural.hedefCarpani, d, K);
  d.tavanda = d.hedefWpm >= d.tavanWpm;
  if (kural.seriSifirla) d.dusukSeri = 0;
  if (kural.eylem === 'kalibrasyon') d.kalibrasyonBekliyor = true;
  let kod = 'dusur-ara';
  if (kural.eylem === 'yeniden-baslatma-oner') {
    d.yenidenBaslatmaOnerisi = true;
    kod = 'yeniden-baslat';
    if (uzun) d.uzunAraSoruldu = true;
  }
  d.araIslenen = { ref, bant, hedef: araOncesi };
  agirlikYenile(d, K);
  const karar = { kod, onceki, yeni: d.hedefWpm };
  d.sonKarar = { ...karar, gun: d.gun, tarih, kacirilan };
  gelecekUret(p, K);
  return { plan: p, degisti: true, kacirilan, karar };
}

/**
 * Uzun aradan sonra öğrencinin seçimi. secim: 'kaldigim-yerden' | 'bastan'
 * 'bastan' için secenekler.girdi (planOlustur girdisi; bugun ve kurallar burada da verilir) gerekir; eski plan gecmis'e eklenir.
 */
export function yenidenBaslat(plan, secim, { bugun, kurallar, girdi } = {}) {
  const K = kurallariAl(kurallar);
  if (!K.ara.yenidenBaslatmaSecenekleri.includes(secim)) throw new TypeError(`yenidenBaslat: seçim ${K.ara.yenidenBaslatmaSecenekleri.join(' | ')} olmalı.`);
  if (secim === 'bastan') {
    return planOlustur({ ...girdi, bugun, kurallar: K, gecmis: [...(plan.gecmis ?? []), gecmisOzeti(plan, bugun)] });
  }
  const p = kopya(plan);
  const d = p.durum;
  d.yenidenBaslatmaOnerisi = false;
  if (K.ara.kaldigimYerdenEylem === 'kalibrasyon') d.kalibrasyonBekliyor = true;
  return gelecekUret(p, K);
}

// ---------- Yorgun modu ----------
/** Bugünkü kurs gününü kısa plana çevirir (göz + anlama + 1 esnek, 15 dk süreleri). Döner: { plan, degisti, neden? } */
export function yorgunModuUygula(plan, gun, kurallar) {
  const K = kurallariAl(kurallar);
  const p = kopya(plan);
  const d = p.durum;
  const g = p.gunler[gun - 1];
  if (d.bitti || gun !== d.gun || !g || g.tamamlandi) return { plan: p, degisti: false, neden: 'gun-uygun-degil' };
  if (g.yorgun) return { plan: p, degisti: false, neden: 'zaten-yorgun' };
  const profil = K.sureProfilleri[String(K.yorgun.sureProfili)];
  const kalan = [...g.dersler];
  const secilen = [];
  let esnekSira = 0;
  for (const tip of K.yorgun.dersler) {
    if (tip === 'esnek' && esnekSira >= K.yorgun.esnekKrediTuketimi) continue;
    const i = kalan.findIndex((x) => (tip === 'esnek' ? !x.sabit : x.tip === tip && x.sabit));
    if (i < 0) continue;
    const ders = kalan.splice(i, 1)[0];
    ders.dk = tip === 'esnek' ? profil.esnek[esnekSira++] ?? profil.esnek.at(-1) : profil[tip] ?? ders.dk;
    secilen.push(ders);
  }
  g.dersler = secilen.sort((a, b) => a.sira - b.sira);
  g.yorgun = true;
  return { plan: p, degisti: true };
}

/** Yorgun modunu geri alır (henüz ders tamamlanmadıysa): gün normal plana döner */
export function yorgunModuKaldir(plan, gun, kurallar) {
  const K = kurallariAl(kurallar);
  const p = kopya(plan);
  const g = p.gunler[gun - 1];
  if (!g?.yorgun || g.tamamlandi || gun !== p.durum.gun || g.dersler.some((x) => x.durum === 'tamam')) return { plan: p, degisti: false };
  return { plan: gelecekUret(p, K), degisti: true };
}

// ---------- Okuma yardımcıları (ekranlar için) ----------
/** Bugünkü kurs günü (tamamlanmamış) ya da kurs bittiyse null */
export function bugunkuGun(plan) {
  return plan?.durum?.bitti ? null : plan?.gunler?.[plan.durum.gun - 1] ?? null;
}

/** Kısa özet: { gun, toplamGun, tamamlanan, bitti, hedefWpm, ilerlemeYuzde, bugunTamam, finalTestiZamani } (K verilmezse finalTestiZamani false) */
export function kursOzeti(plan, bugun, kurallar) {
  const tamamlanan = plan.gunler.filter((g) => g.tamamlandi).length;
  return {
    finalTestiZamani: !!kurallar && tamamlanan >= kurallar.olcum.finalTestiGunu,
    gun: Math.min(plan.durum.gun, plan.gunler.length), toplamGun: plan.gunler.length, tamamlanan, bitti: !!plan.durum.bitti,
    hedefWpm: plan.durum.hedefWpm, ilerlemeYuzde: Math.round((tamamlanan / plan.gunler.length) * 100),
    bugunTamam: !!bugun && plan.sonAktif === bugun,
  };
}

// ---------- Kural açıklayıcı ----------
function listeMetni(dizi) {
  const p = dizi.map((x) => `${x}.`);
  return p.length > 1 ? `${p.slice(0, -1).join(', ')} ve ${p.at(-1)}` : p.join('');
}

function sablonDegerleri(K) {
  return {
    esik: K.anlama.esik, ileriEsik: K.anlama.ileriEsik, dusukSeriEsigi: K.anlama.dusukSeriEsigi,
    pekistirmeAraligi: K.gunTurleri.pekistirmeAraligi, olcumGunleri: listeMetni(K.gunTurleri.olcumGunleri), gunSayisi: K.kurs.gunSayisi,
  };
}

const sablonDoldur = (metin, degerler) => String(metin).replace(/\{(\w+)\}/g, (t, ad) => (ad in degerler ? String(degerler[ad]) : t));

/** Plan değişikliğinin nedeni (kısa, cezalandırmayan Türkçe metin). karar: { kod, onceki?, yeni? } */
export function kararAciklamasi(karar, kurallar) {
  const K = kurallariAl(kurallar);
  if (!karar?.kod) return '';
  const ana = sablonDoldur(K.kararMetinleri[karar.kod] ?? '', sablonDegerleri(K));
  const o = sayi(karar.onceki);
  const y = sayi(karar.yeni);
  if (y === undefined || karar.kod === 'yeniden-baslat') return ana;
  const ek = o !== undefined && o !== y ? `Hedef: ${o} → ${y} kelime/dk.` : `Hedef: ${y} kelime/dk.`;
  return ana ? `${ana} ${ek}` : ek;
}

/** Arayüzde gösterilecek 5 maddelik kural açıklaması (değerler kural dosyasından) */
export function kurallarAciklamasi(kurallar) {
  const K = kurallariAl(kurallar);
  const degerler = sablonDegerleri(K);
  return K.aciklamalar.map((m) => sablonDoldur(m, degerler));
}
