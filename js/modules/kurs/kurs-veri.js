// Kurs verisi (S18b; S19: geliştirici denemesi için tarih kaydırma): planı kurs:<profilId> anahtarında saklar; planlayıcıyı başlangıç testi, metrics kayıtları ve bugünün tarihiyle bağlar (ekran yok)
import { oku, yaz, sil } from '../../core/storage.js';
import { etkinProfil } from '../../core/store.js';
import { gunAnahtari } from '../../core/utils.js';
import { modulKayitlari } from '../../core/metrics.js';
import { testVerisi, OLCEK } from '../testler/test-veri.js';
import {
  kurallariYukle, planOlustur, planDenetle, gunSonuGuncelle, atlananGunIsle, dersDurumuAyarla,
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

/** S19: Kursun başlangıç testi: yalnız açık dönemin başlangıcı (final yapılmışsa dönem kapanmıştır, yeni kursu beslemez) */
export function kursBaslangicTesti(profilId) {
  const v = testVerisi(profilId);
  return v.final ? null : v.baslangic;
}

// Kuralları yükler, yüklenemezse nazik hata döndürür
async function kurallarVeyaHata() {
  const sonuc = await kurallariYukle();
  return sonuc.tamam ? { kurallar: sonuc.kurallar } : { hata: sonuc.hata };
}

/** Yeni kurs başlatır (varsa eskisi geçmişe özetlenir). secenekler: { profilDk }. Döner: { tamam, plan, kurallar } | { tamam: false, hata } */
export async function kursBaslat({ profilDk } = {}) {
  const profil = etkinProfil();
  if (!profil) return { tamam: false, hata: 'Önce bir profil seç.' };
  const { kurallar, hata } = await kurallarVeyaHata();
  if (hata) return { tamam: false, hata };
  const bugun = gunAnahtari();
  const eski = kursVerisi(profil.id);
  const plan = planOlustur({
    sinif: profil.sinif, profilDk, bugun, kurallar, olcekWpm: OLCEK.wpm,
    baslangicTesti: kursBaslangicTesti(profil.id),
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

/** Uzun ara sonrası seçim: 'kaldigim-yerden' | 'bastan' */
export const yenidenBaslatSec = (secim) => planiDegistir((p, K) => {
  const profil = etkinProfil();
  const girdi = { sinif: profil?.sinif ?? p.sinif, profilDk: p.profilDk, olcekWpm: OLCEK.wpm, baslangicTesti: kursBaslangicTesti() };
  return { plan: yenidenBaslat(p, secim, { bugun: gunAnahtari(), kurallar: K, girdi }) };
});

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
