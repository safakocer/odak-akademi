// Veli/Öğretmen dışa aktarımı (S24): profil özetleri; tüm profillerin özet ve çalışma CSV’si (UTF-8 BOM, “;”) ve JSON dosyası. Yedek değildir (geri yükleme Ayarlar’daki yedekle)
import { profilleriGetir } from '../../core/profile.js';
import { kayitlariGetir, sonEoh, sonAnlamaYuzde } from '../../core/metrics.js';
import { csvMetni, gunAnahtari } from '../../core/utils.js';
import { dosyaIndir } from '../../core/ui.js';
import { ilerlemeVerisi, seriDurumu, seviyeBilgisi } from '../../engine/motivasyon.js';
import { gunListesi, donemOzeti } from '../ilerleme/ilerleme-veri.js';
import { egzersizBilgisi, modulBilgisi } from '../katalog.js';
import { testVerisi } from '../testler/test-veri.js';
import { kursVerisi } from '../kurs/kurs-veri.js';
import { veliHedefi, haftalikDurum } from './veli-veri.js';

export const DISA_SURUMU = 1;

/** Kurs planının kısa özeti ya da null */
export function kursOzetiKisa(profilId) {
  const plan = kursVerisi(profilId);
  if (!plan) return null;
  return {
    baslangic: plan.baslangic, sonAktif: plan.sonAktif ?? null, kursGunu: plan.durum.gun, toplamGun: plan.gunler.length,
    tamamlananGun: plan.gunler.filter((g) => g.tamamlandi).length,
    baslangicWpm: plan.durum.baslangicWpm ?? null, hedefWpm: plan.durum.hedefWpm ?? null, bitti: !!plan.durum.bitti,
  };
}

/** Bir profilin özeti (veli paneli, özet CSV ve JSON ortak kullanır) */
export function profilOzeti(p) {
  const veri = ilerlemeVerisi(p.id);
  const kayitlar = kayitlariGetir(p.id);
  const o7 = donemOzeti(veri, kayitlar, gunListesi(7));
  const o30 = donemOzeti(veri, kayitlar, gunListesi(30));
  const seri = seriDurumu(p.id);
  const sev = seviyeBilgisi(veri.xp);
  const hedef = veliHedefi(p.id);
  return {
    son7Dk: o7.toplamDk, son30Dk: o30.toplamDk, calisilanGun30: o30.calisilanGun, hedefGun30: o30.hedefGun,
    seri: seri.seri, enUzunSeri: seri.enUzun, seviye: sev.seviye, unvan: sev.unvan, xp: veri.xp,
    rozet: Object.keys(veri.rozetler).length, sonEoh: sonEoh(p.id), sonAnlama: sonAnlamaYuzde({ profilId: p.id }),
    sonCalisma: kayitlar.at(-1)?.tarih ?? null, kayitSayisi: kayitlar.length,
    gunlukHedefDk: veri.gunlukHedefDk, veliGunlukDk: hedef.gunlukDk, haftalikHedefDk: hedef.haftalikDk, buHaftaDk: haftalikDurum(p.id).dk,
  };
}

const evetHayir = (b) => (b ? 'Evet' : 'Hayır');

const OZET_SUTUNLARI = [
  ['Takma ad', (p) => p.takmaAd], ['Sınıf', (p) => p.sinif],
  ['Son 7 gün (dk)', (_, o) => o.son7Dk], ['Son 30 gün (dk)', (_, o) => o.son30Dk],
  ['Çalışılan gün (30 gün)', (_, o) => o.calisilanGun30], ['Hedefin tutulduğu gün (30 gün)', (_, o) => o.hedefGun30],
  ['Bu hafta (dk)', (_, o) => o.buHaftaDk], ['Haftalık hedef (dk)', (_, o) => o.haftalikHedefDk],
  ['Günlük hedef (dk)', (_, o) => o.gunlukHedefDk], ['Günlük hedefi veli/öğretmen belirledi', (_, o) => evetHayir(o.veliGunlukDk)],
  ['Seri (gün)', (_, o) => o.seri], ['En uzun seri (gün)', (_, o) => o.enUzunSeri],
  ['Seviye', (_, o) => o.seviye], ['XP', (_, o) => o.xp], ['Rozet', (_, o) => o.rozet],
  ['Son etkin okuma hızı (k/dk)', (_, o) => o.sonEoh], ['Son anlama (%)', (_, o) => o.sonAnlama],
  ['Son çalışma', (_, o) => (o.sonCalisma ? gunAnahtari(o.sonCalisma) : null)], ['Kayıt sayısı', (_, o) => o.kayitSayisi],
];

const KAYIT_SUTUNLARI = [
  ['Takma ad', (p) => p.takmaAd], ['Sınıf', (p) => p.sinif],
  ['Tarih', (_, k) => gunAnahtari(k.tarih)],
  ['Saat', (_, k) => new Date(k.tarih).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })],
  ['Alan', (_, k) => modulBilgisi(k.modul)?.baslik ?? k.modul],
  ['Egzersiz', (_, k) => egzersizBilgisi(k.egzersiz)?.baslik ?? k.egzersiz],
  ['Seviye', (_, k) => k.zorluk], ['Süre (sn)', (_, k) => k.sureSn],
  ['Okuma hızı (k/dk)', (_, k) => k.wpm], ['Anlama (%)', (_, k) => k.anlamaYuzde], ['Etkin okuma hızı (k/dk)', (_, k) => k.eoh],
  ['Doğru', (_, k) => k.dogru], ['Yanlış', (_, k) => k.yanlis], ['Puan', (_, k) => k.puan],
  ['Kurs günü', (_, k) => k.ekstra?.kurs?.gun],
];

/** Özet CSV: her profil bir satır */
export function ozetCsv() {
  const satirlar = profilleriGetir().map((p) => {
    const o = profilOzeti(p);
    return OZET_SUTUNLARI.map(([, f]) => f(p, o));
  });
  return csvMetni([OZET_SUTUNLARI.map(([b]) => b), ...satirlar]);
}

/** Çalışma CSV’si: tüm profillerin tüm kayıtları (profil, sonra tarih sırasıyla) */
export function kayitCsv() {
  const satirlar = profilleriGetir().flatMap((p) => kayitlariGetir(p.id)
    .sort((a, b) => a.tarih.localeCompare(b.tarih))
    .map((k) => KAYIT_SUTUNLARI.map(([, f]) => f(p, k))));
  return csvMetni([KAYIT_SUTUNLARI.map(([b]) => b), ...satirlar]);
}

/** İncelemek için JSON: profil özetleri, hedefler, ilerleme, seviye testi, kurs özeti ve kayıtlar. Notlar, zihin haritaları ve kendi metinleri girmez */
export function jsonVerisi() {
  return {
    uygulama: 'odak-akademi', tur: 'veli-disa-aktarim', surum: DISA_SURUMU, olusturma: new Date().toISOString(),
    aciklama: 'İnceleme dosyasıdır, yedek değildir; uygulamaya geri yüklenemez. Tam yedek: Ayarlar > Yedeği indir.',
    profiller: profilleriGetir().map((p) => {
      const ilerleme = ilerlemeVerisi(p.id);
      const test = testVerisi(p.id);
      return {
        takmaAd: p.takmaAd, sinif: p.sinif, olusturma: p.olusturma,
        ozet: profilOzeti(p), hedefler: veliHedefi(p.id),
        ilerleme: { gunlukHedefDk: ilerleme.gunlukHedefDk, xp: ilerleme.xp, gunler: ilerleme.gunler, rozetler: ilerleme.rozetler },
        seviyeTesti: { baslangic: test.baslangic, final: test.final },
        kurs: kursOzetiKisa(p.id),
        kayitlar: kayitlariGetir(p.id),
      };
    }),
  };
}

const DOSYALAR = {
  ozet: () => ({ ad: `odak-akademi-ozet-${gunAnahtari()}.csv`, icerik: ozetCsv(), tur: 'text/csv;charset=utf-8' }),
  kayitlar: () => ({ ad: `odak-akademi-calismalar-${gunAnahtari()}.csv`, icerik: kayitCsv(), tur: 'text/csv;charset=utf-8' }),
  json: () => ({ ad: `odak-akademi-veli-${gunAnahtari()}.json`, icerik: JSON.stringify(jsonVerisi(), null, 2), tur: 'application/json' }),
};

/** Dosyayı hazırlayıp indirir. tur: 'ozet' | 'kayitlar' | 'json'. Döner: { tamam, ad } | { tamam: false, hata } */
export function disaAktar(tur) {
  try {
    const d = DOSYALAR[tur]?.();
    if (!d) return { tamam: false, hata: 'Bilinmeyen dosya türü.' };
    return dosyaIndir(d.ad, d.icerik, d.tur) ? { tamam: true, ad: d.ad } : { tamam: false, hata: 'Dosya indirilemedi. Yeniden deneyin.' };
  } catch (h) {
    console.error('[veli-disa]', h);
    return { tamam: false, hata: 'Dosya hazırlanamadı. Yeniden deneyin.' };
  }
}
