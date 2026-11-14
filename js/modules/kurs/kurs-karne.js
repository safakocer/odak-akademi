// Kurs karnesi (S35b): “İlk gün ve bugün”: kursta yapılan her egzersizin ilk ve son sonucu yan yana, son seviyedeki en iyi sonuç ve değişim; Kurs raporu ve İlerleme sayfası çizer; yazdırılabilir (rehber yazdir, html.yazdir-karne), üstte yalnız takma ad ve sınıf; S35c: veli raporu için tablo satırları (karneRaporSatirlari)
import { el, spriteIkon } from '../../core/ui.js';
import { etkinProfil } from '../../core/store.js';
import { kayitlariGetir, kayitKademesi } from '../../core/metrics.js';
import { sayi, sayiBicimle, yuzdeBicimle, tarihMetni, gunAnahtari } from '../../core/utils.js';
import { cocukGorunumuMu } from '../../core/hesap.js';
import { fenerBalonu } from '../../engine/fener.js';
import { karneMesaji } from '../../engine/fener-mesajlari.js';
import { egzersizBilgisi, modulBilgisi } from '../katalog.js';
import { yazdir, yazdirDugmesi } from '../rehber/rehber-sayfasi.js';
import { karneSatirlari, karneOzeti } from './kurs-veri.js';

export const KARNE_YAZDIR_SINIFI = 'yazdir-karne'; // kurs.css @media print: yalnız karne basılır
const OLCU_ADI = Object.freeze({ eoh: 'Etkin okuma hızı (kelime/dk)', puan: 'Puan', dogru: 'Doğru sayısı' });
const YON_ISARETI = Object.freeze({ artti: '▲', benzer: '≈', azaldi: '•' }); // renk tek başına bilgi taşımaz; metin de yazılır

const gunMetni = (k) => tarihMetni(`${gunAnahtari(k.tarih)}T12:00:00`);
const isaretli = (n) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${sayiBicimle(Math.abs(n), Number.isInteger(n) ? 0 : 1)}`;

// Kaydın ek bilgisi: okumada anlama, diğerlerinde isabet; okuma dışında seviye
function ekBilgi(k) {
  const parcalar = [];
  if (k.modul !== 'oku') parcalar.push(`seviye ${k.zorluk}`);
  const anlama = sayi(k.anlamaYuzde);
  const isabet = sayi(k.ekstra?.isabet);
  if (anlama !== undefined) parcalar.push(`anlama ${yuzdeBicimle(anlama)}`);
  else if (isabet !== undefined) parcalar.push(`isabet ${yuzdeBicimle(isabet)}`);
  return parcalar.join(' · ');
}

function hucre(etiket, k, alan, enIyi) {
  const enIyiGoster = enIyi && enIyi !== k && sayi(enIyi[alan]) > sayi(k[alan]);
  return el('div', { sinif: 'kurs-karne__hucre' },
    el('p', { sinif: 'kurs-karne__etiket', metin: `${etiket} (${gunMetni(k)})` }),
    el('p', { sinif: 'kurs-karne__deger', metin: sayiBicimle(sayi(k[alan]) ?? 0) }),
    el('p', { sinif: 'kurs-karne__alt', metin: ekBilgi(k) }),
    enIyiGoster && el('p', { sinif: 'kurs-karne__alt', metin: `Bu seviyedeki en iyin: ${sayiBicimle(sayi(enIyi[alan]))}` }));
}

// Değişim cümlesi: aynı seviye ve kademede fark; seviye değiştiyse önce bu bilgi, fark son seviyedeki ilk sonuçla
function degisimMetni(r) {
  if (r.sayi < 2) return { yon: '', metin: 'Bu kursta bir kez yapıldı; karşılaştırma için ikinci sonuç yok.' };
  const kademeDegisti = kayitKademesi(r.ilk) !== kayitKademesi(r.son);
  let on = '';
  if (kademeDegisti) on = 'Okul kademen değiştiği için ilk sonuçla karşılaştırılmaz. ';
  else if (r.seviyeDegisti) {
    on = r.son.zorluk > r.ilk.zorluk
      ? `Seviyen yükseldi (seviye ${r.ilk.zorluk} → ${r.son.zorluk}). `
      : `Seviye ${r.ilk.zorluk} → ${r.son.zorluk}; farklı seviyeler karşılaştırılmaz. `;
  }
  const d = r.degisim;
  if (!d) return { yon: r.seviyeDegisti && !kademeDegisti && r.son.zorluk > r.ilk.zorluk ? 'artti' : '', metin: on.trim() || 'Karşılaştırılacak sonuç yok.' };
  const nerede = r.seviyeDegisti ? 'Şimdiki seviyendeki ilk sonucuna göre ' : 'İlk gününe göre ';
  const metin = {
    artti: `${nerede}${isaretli(d.fark)}: ileride.`,
    benzer: `${nerede}${isaretli(d.fark)}: yakın.`,
    azaldi: `${nerede}${isaretli(d.fark)}: henüz altında; tek bir sonuç günden güne değişebilir.`,
  }[d.yon];
  return { yon: d.yon, metin: on + metin };
}

function satirOgesi(r, i) {
  const bilgi = egzersizBilgisi(r.egzersiz);
  const baslikId = `kurs-karne-oge-${i}`;
  const dm = degisimMetni(r);
  return el('li', { sinif: 'kurs-karne__oge', 'data-yon': dm.yon, 'aria-labelledby': baslikId },
    el('h3', { id: baslikId, sinif: 'kurs-karne__ad' }, bilgi?.baslik ?? r.egzersiz,
      el('span', { sinif: 'kurs-karne__modul', metin: ` · ${modulBilgisi(r.modul)?.baslik ?? r.modul}` })),
    el('p', { sinif: 'kurs-karne__olcu', metin: `${OLCU_ADI[r.alan] ?? 'Sonuç'} · ${r.sayi} kez yapıldı` }),
    el('div', { sinif: 'kurs-karne__ikili' },
      hucre('İlk gün', r.ilk, r.alan, null),
      r.sayi > 1 ? hucre('Son', r.son, r.alan, r.enIyi) : el('div', { sinif: 'kurs-karne__hucre kurs-karne__hucre--bos', 'aria-hidden': 'true' })),
    el('p', { sinif: 'kurs-karne__degisim' },
      dm.yon && el('span', { sinif: 'kurs-karne__isaret', 'aria-hidden': 'true', metin: YON_ISARETI[dm.yon] }),
      dm.metin));
}

/**
 * Kurs karnesi bölümü. plan: kurs planı (kurs-veri.kursVerisi), profil: takma ad ve sınıf için, kayitlar: metrics kayıtları (vars. profilinki).
 * fener: çocuk görünümünde Fener balonu (kurs raporunda üstte ayrı balon olduğu için kapatılır). bosBaglanti: kayıt yoksa Kurs sayfasına bağlantı.
 * Döner: section.kurs-karne
 */
export function karneBolumu({ plan, profil = etkinProfil(), kayitlar, fener = true, bosBaglanti = false, id = 'kurs-karne-baslik' } = {}) {
  const liste = kayitlar ?? kayitlariGetir(profil?.id);
  const satirlar = karneSatirlari(plan, liste);
  const ozet = karneOzeti(satirlar);
  const bitti = !!plan?.durum?.bitti;
  const baslik = el('h2', { id, metin: bitti ? 'Kurs karnesi: ilk gün ve son gün' : 'Kurs karnesi: ilk gün ve bugün' });
  const bitis = bitti && plan.sonAktif ? tarihMetni(`${plan.sonAktif}T12:00:00`) : 'bugün';
  const ust = el('div', { sinif: 'kurs-karne__ust' },
    el('div', {},
      baslik,
      profil && el('p', { sinif: 'kurs-karne__kim', metin: `${profil.takmaAd}, ${profil.sinif}. sınıf` }),
      plan?.baslangic && el('p', { sinif: 'soluk', metin: `Kurs: ${tarihMetni(`${plan.baslangic}T12:00:00`)} – ${bitis}${satirlar.length ? ` · ${satirlar.length} çalışma` : ''}` })),
    satirlar.length > 0 && yazdirDugmesi('Karneyi yazdır', () => yazdir(KARNE_YAZDIR_SINIFI)));
  const parcalar = [ust];
  const fm = fener && cocukGorunumuMu() ? karneMesaji(ozet, { sinif: profil?.sinif }) : null;
  if (fm) parcalar.push(fenerBalonu({ ifade: fm.ifade, mesaj: fm.mesaj, sinif: 'kurs-karne__fener yazdirma-yok' }));
  if (!satirlar.length) {
    parcalar.push(el('p', { metin: 'Kurs derslerini yaptıkça her çalışmanın ilk ve son sonucu burada yan yana görünür.' }),
      bosBaglanti && el('a', { sinif: 'btn btn--ikincil btn--kucuk yazdirma-yok', href: '#/kurs' }, spriteIkon('harita', 'ikon ikon--kucuk'), 'Akıllı Kurs’u aç'));
  } else {
    parcalar.push(
      el('p', { sinif: 'soluk', metin: 'Yalnızca kendi sonuçların karşılaştırılır. Seviye değiştiyse farklı seviyeler karşılaştırılmaz; fark, son seviyedeki ilk sonucunla hesaplanır.' }),
      el('ul', { sinif: 'kurs-karne__liste' }, satirlar.map(satirOgesi)),
      el('p', { sinif: 'alan__ipucu', metin: '▲ ileride, ≈ yakın, • henüz altında. Tek bir sonuç günden güne değişebilir; genel yöne bak. Karnede yalnız kurs dersleri yer alır; seviye testi ayrı ölçülür.' }));
  }
  return el('section', { sinif: 'kurs-kart kurs-karne', 'aria-labelledby': id, 'data-durum': ozet.durum }, ...parcalar.filter(Boolean));
}

// ---------- S35c: veli raporu (Veli/Öğretmen alanı, hesap görünümü) ----------
const YON_METNI = Object.freeze({ artti: 'ileride', benzer: 'yakın', azaldi: 'henüz altında' });
const kisaGun = (k) => tarihMetni(`${gunAnahtari(k.tarih)}T12:00:00`);
const hucreMetni = (k, alan) => `${sayiBicimle(sayi(k[alan]) ?? 0)} (${kisaGun(k)}; ${ekBilgi(k) || 'okuma'})`;

/** Karne değişiminin veliye yönelik kısa metni (üçüncü kişi; işaret + sözcük, renk yok) */
export function karneDegisimMetni(r) {
  if (r.sayi < 2) return 'Bir kez yapıldı; karşılaştırma yok';
  if (kayitKademesi(r.ilk) !== kayitKademesi(r.son)) return 'Okul kademesi değişti; karşılaştırılmaz';
  const on = r.seviyeDegisti ? `Seviye ${r.ilk.zorluk} → ${r.son.zorluk}${r.son.zorluk > r.ilk.zorluk ? ' (yükseldi)' : ''}. ` : '';
  const d = r.degisim;
  if (!d) return on.trim() || '—';
  const yer = r.seviyeDegisti ? 'son seviyedeki ilk sonuca göre' : 'ilk güne göre';
  return `${on}${YON_ISARETI[d.yon]} ${isaretli(d.fark)} ${yer} (${YON_METNI[d.yon]})`;
}

/** Veli raporu tablosu satırları: [çalışma, ölçü, ilk gün, son, değişim] (karne mantığı kurs-veri.js karneSatirlari) */
export function karneRaporSatirlari(satirlar = []) {
  return satirlar.map((r) => [
    `${egzersizBilgisi(r.egzersiz)?.baslik ?? r.egzersiz} (${modulBilgisi(r.modul)?.baslik ?? r.modul})`,
    `${OLCU_ADI[r.alan] ?? 'Sonuç'}, ${r.sayi} kez`,
    hucreMetni(r.ilk, r.alan),
    r.sayi > 1 ? hucreMetni(r.son, r.alan) : '—',
    karneDegisimMetni(r),
  ]);
}
