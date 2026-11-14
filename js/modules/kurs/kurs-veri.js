// Kurs verisi (S18b; S19: geliştirici denemesi için tarih kaydırma; S34a: kurallar profilin sınıfına uyarlanır, sınıf değişince uyarı ve seçenek; S34d: önce kural dosyasındaki sınıf bantları işlenir, okuma hızı ölçeği testten ya da sınıf bandından; S35b: kurs karnesi satırları, kurs başındaki kayıt, bitirme denetimi): planı kurs:<profilId> anahtarında saklar; planlayıcıyı başlangıç testi, metrics kayıtları ve bugünün tarihiyle bağlar (ekran yok)
import { oku, yaz, sil } from '../../core/storage.js';
import { etkinProfil } from '../../core/store.js';
import { gunAnahtari, sayi } from '../../core/utils.js';
import { modulKayitlari, rekorAlani, kayitKademesi, ayniKademe } from '../../core/metrics.js';
import { testVerisi, sinifOlcegi, sonucOlcegi } from '../testler/test-veri.js';
import { egzersizBilgisi, aracBilgisi, kartUygunMu } from '../katalog.js';
import { bantlariYukle, okumaBandi, kademe } from '../../core/siniflar.js';
import {
  kurallariYukle, sinifKurallari, planOlustur, planDenetle, gunSonuGuncelle, atlananGunIsle, dersDurumuAyarla,
  yorgunModuUygula, yorgunModuKaldir, yenidenBaslat, gecmisOzeti,
} from '../../engine/course-planner.js';

const ONEK = 'kurs:';
const profilKimligi = (pid) => pid ?? etkinProfil()?.id ?? null;
const KAYIT_HATASI = 'Kurs planı kaydedilemedi. Cihazda yer kalmamış olabilir; Ayarlar’dan yedek indirip yeniden dene.';

/** Kayıtlı plan ya da null (bozuk/eski şemalı kayıt null sayılır) */
export function kursVerisi(profilId) {
  const pid = profilKimligi(profilId);
  if (!pid) return null;
  const plan = oku(ONEK + pid, null);
  return planDenetle(plan) ? plan : null;
}

/** Döner: { tamam: true, plan } | { tamam: false, hata } */
export function kursuKaydet(plan, profilId) {
  const pid = profilKimligi(profilId);
  if (!pid) return { tamam: false, hata: 'Önce bir profil seç.' };
  return yaz(ONEK + pid, plan) ? { tamam: true, plan } : { tamam: false, hata: KAYIT_HATASI };
}

/** Planı siler (profil silinince anahtarı profile.js zaten siler) */
export function kursuSil(profilId) {
  const pid = profilKimligi(profilId);
  if (pid) sil(ONEK + pid);
}

/**
 * Kurs gününün anlama sonucu: oku-anla kaydı (ekstra.kurs.gun) bu planın başlangıcından sonra yazılmış olmalı; en son olan alınır.
 * Döner: { wpm, anlamaYuzde, eoh } | null
 */
export function kursAnlamaSonucu(plan, gun, profilId) {
  const pid = profilKimligi(profilId);
  if (!pid || !plan) return null;
  const liste = modulKayitlari('oku', { egzersiz: 'oku-anla', profilId: pid })
    .filter((k) => k.ekstra?.kurs?.gun === gun && gunAnahtari(k.tarih) >= plan.baslangic);
  const k = liste.at(-1);
  return k && typeof k.anlamaYuzde === 'number' ? { wpm: k.wpm, anlamaYuzde: k.anlamaYuzde, eoh: k.eoh } : null;
}

/** S19: Kursun başlangıç testi: yalnız açık dönemin başlangıcı (final yapılmışsa dönem kapanmıştır, yeni kursu beslemez).
 *  S34a: test başka kademede yapıldıysa (ör. 5. sınıfta yapılmış, profil şimdi 4. sınıf) kursu beslemez; başlangıç hızı sınıftan alınır */
export function kursBaslangicTesti(profilId) {
  const v = testVerisi(profilId);
  const b = v.final ? null : v.baslangic;
  const sinif = etkinProfil()?.sinif; // kurs her zaman etkin profil için kurulur
  if (b && sinif && b.sinif != null && kademe(b.sinif) !== kademe(sinif)) return null;
  return b;
}

/**
 * S34a: Kuralları sınıfa uyarlar (yeni nesne; kural dosyası değişmez): ders havuzlarında yalnız o sınıfa uygun egzersizler
 * (katalog sınıf aralığı), hız ve anlama derslerinde yalnız sınıf bandının izin verdiği okuma modları. Havuz boşalırsa eski hâli kalır.
 */
export function kurallariSinifaUyarla(K, sinif) {
  if (!K || !sinif) return K;
  const izinliMod = okumaBandi(sinif)?.modlar ?? null;
  const uygun = (ad) => kartUygunMu(egzersizBilgisi(ad), sinif);
  const dersTipleri = Object.fromEntries(Object.entries(K.dersTipleri).map(([tip, b]) => {
    const havuz = b.havuz.filter(uygun);
    const yeni = { ...b, havuz: havuz.length ? havuz : [...b.havuz] };
    if (Array.isArray(b.modlar) && izinliMod) {
      const modlar = b.modlar.filter((m) => izinliMod.includes(m));
      yeni.modlar = modlar.length ? modlar : izinliMod.slice(0, 1);
    }
    return [tip, yeni];
  }));
  const besinci = K.pekistirme?.besinciDers;
  let pekistirme = K.pekistirme;
  if (besinci && besinci.yedekEgzersiz && !uygun(besinci.yedekEgzersiz)) {
    pekistirme = { ...K.pekistirme, besinciDers: { ...besinci, yedekEgzersiz: dersTipleri[besinci.tip]?.havuz[0] ?? besinci.yedekEgzersiz } };
  }
  if (besinci?.arac && !kartUygunMu(aracBilgisi(besinci.arac), sinif)) console.warn('[kurs] Pekiştirme aracı bu sınıfa uygun değil:', besinci.arac);
  return { ...K, dersTipleri, pekistirme };
}

// Kuralları (ve sınıf bantlarını) yükler, etkin profilin sınıfına uyarlar (S34d: önce kural dosyasındaki sınıf bandı, sonra katalog ve okuma bandı süzgeci); yüklenemezse nazik hata döndürür
async function kurallarVeyaHata(sinif = etkinProfil()?.sinif) {
  const [sonuc] = await Promise.all([kurallariYukle(), bantlariYukle()]);
  return sonuc.tamam ? { kurallar: kurallariSinifaUyarla(sinifKurallari(sonuc.kurallar, sinif), sinif) } : { hata: sonuc.hata };
}

/** S34d: Kursun okuma hızı ölçeği (ölçüm günlerinde eksen puanı için): başlangıç testi varsa onun ölçeği, yoksa sınıfın test ölçeği */
const kursOlcegi = (test, sinif) => (test ? sonucOlcegi(test) : sinifOlcegi(sinif)).wpm;

/**
 * S34a: Profilin sınıfı plan yapıldığından beri değiştiyse (kurs bitmemişse): { eski, yeni, kademeDegisti } | null.
 * Kurs sayfası bu durumda iki seçenek sunar: yeni sınıfa göre baştan (kursBaslat) ya da bu planla devam (sinifaGoreDevam).
 */
export function sinifDegisimi(plan, profil = etkinProfil()) {
  if (!plan || !profil || plan.durum?.bitti) return null;
  const eski = Number(plan.sinif);
  const yeni = Number(profil.sinif);
  if (!yeni || eski === yeni) return null;
  return { eski, yeni, kademeDegisti: kademe(eski) !== kademe(yeni) };
}

/** Yeni kurs başlatır (varsa eskisi geçmişe özetlenir). secenekler: { profilDk }. Döner: { tamam, plan, kurallar } | { tamam: false, hata } */
export async function kursBaslat({ profilDk } = {}) {
  const profil = etkinProfil();
  if (!profil) return { tamam: false, hata: 'Önce bir profil seç.' };
  const { kurallar, hata } = await kurallarVeyaHata(profil.sinif);
  if (hata) return { tamam: false, hata };
  const bugun = gunAnahtari();
  const eski = kursVerisi(profil.id);
  const baslangicTesti = kursBaslangicTesti(profil.id);
  const plan = planOlustur({
    sinif: profil.sinif, profilDk, bugun, kurallar, olcekWpm: kursOlcegi(baslangicTesti, profil.sinif),
    baslangicTesti,
    gecmis: eski ? [...(eski.gecmis ?? []), gecmisOzeti(eski, bugun)] : [],
  });
  const k = kursuKaydet(plan, profil.id);
  return k.tamam ? { tamam: true, plan, kurallar } : k;
}

/** Kurs sayfası açılırken: ara kuralını uygular ve kaydeder. Döner: { tamam, plan | null, kurallar, karar } | { tamam: false, hata } */
export async function kursAc() {
  const pid = profilKimligi();
  const { kurallar, hata } = await kurallarVeyaHata();
  if (hata) return { tamam: false, hata };
  const plan = kursVerisi(pid);
  if (!plan) return { tamam: true, plan: null, kurallar, karar: null };
  const s = atlananGunIsle(plan, gunAnahtari(), kurallar);
  if (!s.degisti) return { tamam: true, plan, kurallar, karar: null };
  const k = kursuKaydet(s.plan, pid);
  return k.tamam ? { tamam: true, plan: s.plan, kurallar, karar: s.karar } : k;
}

// Kayıtlı planı alıp fn(plan, kurallar) → plan uygular ve kaydeder
async function planiDegistir(fn) {
  const pid = profilKimligi();
  const { kurallar, hata } = await kurallarVeyaHata();
  if (hata) return { tamam: false, hata };
  const plan = kursVerisi(pid);
  if (!plan) return { tamam: false, hata: 'Henüz bir kurs başlatmadın.' };
  const sonuc = fn(plan, kurallar);
  const k = kursuKaydet(sonuc.plan, pid);
  return k.tamam ? { ...sonuc, tamam: true, kurallar } : k;
}

/** Ders bitince ya da atlanınca. durum: 'tamam' | 'atlandi' | 'bekliyor' */
export const dersiIsaretle = (gun, sira, durum) => planiDegistir((p) => ({ plan: dersDurumuAyarla(p, gun, sira, durum) }));

/** Günü bitirir: anlama sonucu metrics’ten okunur. Döner: { tamam, plan, tamamlandi, karar, neden? } */
export const gunuBitir = () => planiDegistir((p, K) => {
  const gun = p.durum.gun;
  const sonuc = kursAnlamaSonucu(p, gun) ?? {};
  return gunSonuGuncelle(p, { gun, tarih: gunAnahtari(), ...sonuc }, K);
});

/** “Bugün yorgunum” aç/kapat */
export const yorgunModu = (acik = true) => planiDegistir((p, K) => (acik ? yorgunModuUygula : yorgunModuKaldir)(p, p.durum.gun, K));

/**
 * S34a: Sınıf değişti, öğrenci bu planla devam etmeyi seçti: planın sınıfı güncellenir, kaldığı günden kalibrasyonla sürer
 * (ilk gün kendi hızında okur; tamamlanmamış günler yeni sınıfa uygun çalışmalarla yeniden üretilir, bugünkü işaretli dersler de sıfırlanır).
 */
export const sinifaGoreDevam = () => planiDegistir((p, K) => {
  const profil = etkinProfil();
  const sinif = profil?.sinif ?? p.sinif;
  // S34d: ölçek de yeni sınıfa göre (kademe değiştiyse eski test kursu beslemez); süre profili yeni sınıfta yoksa planlayıcı varsayılana geçer
  const yeni = yenidenBaslat({ ...p, sinif, olcekWpm: kursOlcegi(kursBaslangicTesti(), sinif) }, 'kaldigim-yerden', { bugun: gunAnahtari(), kurallar: K });
  return { plan: yeni };
});

/** Uzun ara sonrası seçim: 'kaldigim-yerden' | 'bastan' */
export const yenidenBaslatSec = (secim) => planiDegistir((p, K) => {
  const profil = etkinProfil();
  const sinif = profil?.sinif ?? p.sinif;
  const baslangicTesti = kursBaslangicTesti();
  const girdi = { sinif, profilDk: p.profilDk, olcekWpm: kursOlcegi(baslangicTesti, sinif), baslangicTesti };
  return { plan: yenidenBaslat(p, secim, { bugun: gunAnahtari(), kurallar: K, girdi }) };
});

// ---------- S35b: kurs karnesi ve kurs başındaki seviye (saf; kayıtlar metrics.kayitlariGetir() biçiminde) ----------
/** Kurs bitti mi (bu plan ya da geçmişteki bir kurs 21 günün hepsini tamamladıysa)? Bitirme rozeti puandan bağımsız buna bakar */
export function kursBitirildiMi(plan) {
  if (!plan) return false;
  if (plan.durum?.bitti) return true;
  const gunSayisi = plan.gunler?.length ?? 0;
  return gunSayisi > 0 && (plan.gecmis ?? []).some((g) => (sayi(g?.tamamlananGun) ?? 0) >= gunSayisi);
}

/** Bu planın kurs dersi kayıtları (ekstra.kurs taşıyan, plan başlangıcından sonra; kurs bittiyse son aktif günden önce), eskiden yeniye */
export function kursKayitlari(plan, kayitlar = []) {
  if (!plan?.baslangic) return [];
  const bitis = plan.durum?.bitti ? plan.sonAktif : null;
  return kayitlar.filter((k) => {
    if (!k?.ekstra?.kurs || typeof k.tarih !== 'string') return false;
    const g = gunAnahtari(k.tarih);
    return g >= plan.baslangic && (!bitis || g <= bitis);
  }).sort((a, b) => a.tarih.localeCompare(b.tarih));
}

/** Karşılaştırma eşiği: EOH’de en az 5 k/dk ya da ilk değerin %5’i; diğer ölçülerde en az 1 ya da %5 (tek ölçüm günden güne oynar) */
export const KARNE_ESIK = Object.freeze({ oran: 0.05, eoh: 5, diger: 1 });

/** İki değerin değişimi: { once, sonra, fark, yon: 'artti'|'benzer'|'azaldi' } | null (biri yoksa). alan: rekor alanı (hepsi yüksek iyi) */
export function karneDegisimi(alan, once, sonra) {
  const o = sayi(once);
  const s = sayi(sonra);
  if (o === undefined || s === undefined) return null;
  const fark = Math.round((s - o) * 10) / 10;
  const esik = Math.max(alan === 'eoh' ? KARNE_ESIK.eoh : KARNE_ESIK.diger, Math.abs(o) * KARNE_ESIK.oran);
  return { once: o, sonra: s, fark, yon: fark >= esik ? 'artti' : fark <= -esik ? 'azaldi' : 'benzer' };
}

const ayniSeviyeVeKademe = (a, b) => a.zorluk === b.zorluk && kayitKademesi(a) === kayitKademesi(b);
// Kaydın rekor alanındaki değeri (eoh > puan > dogru)
const alanDegeri = (k, alan) => sayi(k?.[alan]);

/**
 * Kurs karnesi satırları: kursta yapılan her egzersiz için ilk ve son sonuç (yan yana), son seviyedeki en iyi sonuç ve değişim.
 * Farklı seviye ya da kademedeki sonuçlar karşılaştırılmaz: seviye değiştiyse değişim, son seviyedeki ilk sonuçla hesaplanır.
 * Döner: [{ egzersiz, modul, sayi, alan, ilk, son, enIyi, seviyeDegisti, karsi (son seviyedeki ilk kayıt | null), degisim | null }] (ilk yapılış sırasıyla)
 */
export function karneSatirlari(plan, kayitlar = []) {
  const gruplar = new Map();
  for (const k of kursKayitlari(plan, kayitlar)) {
    if (!rekorAlani(k)) continue;
    if (!gruplar.has(k.egzersiz)) gruplar.set(k.egzersiz, []);
    gruplar.get(k.egzersiz).push(k);
  }
  return [...gruplar.entries()].map(([egzersiz, liste]) => {
    const ilk = liste[0];
    const son = liste.at(-1);
    const alan = rekorAlani(son);
    const sonSeviyede = liste.filter((k) => ayniSeviyeVeKademe(k, son) && alanDegeri(k, alan) !== undefined);
    const enIyi = sonSeviyede.reduce((en, k) => (!en || alanDegeri(k, alan) > alanDegeri(en, alan) ? k : en), null);
    const seviyeDegisti = !ayniSeviyeVeKademe(ilk, son);
    const karsi = liste.length > 1 ? (seviyeDegisti ? sonSeviyede[0] : ilk) : null;
    const degisim = karsi && karsi !== son ? karneDegisimi(alan, alanDegeri(karsi, alan), alanDegeri(son, alan)) : null;
    return { egzersiz, modul: son.modul, sayi: liste.length, alan, ilk, son, enIyi, seviyeDegisti, karsi: karsi !== son ? karsi : null, degisim };
  });
}

/** Karnenin özeti: { toplam, gelisen (artan ya da seviyesi yükselen), seviyeYukselen, durum: 'gelisti'|'surdu'|'basladi'|'bos' } */
export function karneOzeti(satirlar = []) {
  const seviyeYukselen = satirlar.filter((r) => r.seviyeDegisti && kayitKademesi(r.ilk) === kayitKademesi(r.son) && r.son.zorluk > r.ilk.zorluk).length;
  const gelisen = satirlar.filter((r) => r.degisim?.yon === 'artti'
    || (r.seviyeDegisti && kayitKademesi(r.ilk) === kayitKademesi(r.son) && r.son.zorluk > r.ilk.zorluk)).length;
  const karsilasan = satirlar.filter((r) => r.sayi > 1).length;
  const durum = !satirlar.length ? 'bos' : gelisen ? 'gelisti' : karsilasan ? 'surdu' : 'basladi';
  return { toplam: satirlar.length, gelisen, seviyeYukselen, durum };
}

/**
 * S35b “Eski seviyeni dene”: egzersizin kurs başındaki kaydı: bu kursun o egzersizdeki ilk kurs kaydı; yoksa kurs başlamadan önceki son kaydı.
 * Yalnız aynı rekor kademesindeki kayıtlar (ilkokul kaydı ortaokulda kullanılmaz). Döner: kayıt | null
 */
export function kursBasiKaydi(plan, egzersiz, kayitlar = [], kademeAdi) {
  if (!plan?.baslangic || !egzersiz) return null;
  const uygun = (k) => k?.egzersiz === egzersiz && ayniKademe(k, kademeAdi) && !!rekorAlani(k) && sayi(k.zorluk) !== undefined;
  const kursta = kursKayitlari(plan, kayitlar).find(uygun);
  if (kursta) return kursta;
  return kayitlar.filter((k) => uygun(k) && typeof k.tarih === 'string' && gunAnahtari(k.tarih) < plan.baslangic)
    .sort((a, b) => a.tarih.localeCompare(b.tarih)).at(-1) ?? null;
}

// ---------- Geliştirici denemesi (yalnız yerel sunucu, app.js: odakDeneme.kursIlerle) ----------
const gunKaydir = (g, n) => {
  if (typeof g !== 'string') return g;
  const t = new Date(`${g}T12:00:00`);
  t.setDate(t.getDate() - n);
  return gunAnahtari(t);
};

/** Plandaki tüm tarihleri n gün geriye alır (ara kuralını ve yeni günü beklemeden denemek için) */
export function kursTarihiniGeriAl(n = 1, profilId) {
  const pid = profilKimligi(profilId);
  const plan = kursVerisi(pid);
  if (!plan) return false;
  const d = plan.durum;
  plan.baslangic = gunKaydir(plan.baslangic, n);
  plan.sonAktif = gunKaydir(plan.sonAktif, n);
  plan.gunler.forEach((g) => { g.tarih = gunKaydir(g.tarih, n); });
  d.sayilmayanTarih = gunKaydir(d.sayilmayanTarih, n);
  if (d.sonKarar) d.sonKarar.tarih = gunKaydir(d.sonKarar.tarih, n);
  if (d.araIslenen) d.araIslenen.ref = gunKaydir(d.araIslenen.ref, n);
  return kursuKaydet(plan, pid).tamam;
}

/** n kurs gününü hızlıca tamamlar: her gün için tarihler 1 gün geri alınır, tüm dersler “tamam” işaretlenir (anlama verisi yoksa hedef sabit kalır) */
export async function kursDenemeIlerle(n = 1) {
  for (let i = 0; i < n; i++) {
    const plan = kursVerisi();
    if (!plan || plan.durum.bitti) break;
    kursTarihiniGeriAl(1);
    const gun = plan.durum.gun;
    for (const x of plan.gunler[gun - 1].dersler) await dersiIsaretle(gun, x.sira, 'tamam');
    const s = await gunuBitir();
    if (!s.tamamlandi) return s;
  }
  return { tamam: true, plan: kursVerisi() };
}
