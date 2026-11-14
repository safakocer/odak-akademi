// Bugünün Görevi kartı (S35c, ana sayfa; S20’nin “Bugün” kartı buna katıldı): günlük hedef çubuğu ve “bugünlük yeter”, XP seviyesi ve seri, veli haftalık hedefi; kurs sürüyorsa bugünkü dersler (sırada/tamam/atlandı), yoksa gün içinde değişmeyen öneri listesi (gorev-veri.js; depo gorev:<profilId>), bekleyen tekrar kartları, kurs karnesi bağlantısı; çocukta ifadeli Fener (mesajsız; ana sayfa balonuyla çakışmaz). S35c-d: kompakt düzen (tek satır başlık ve hedef, ince satırlar), Fener 60 px; S35c-d2: tek sütun, hedef listenin üstünde, seviye ve bağlantılar kurs düğmesinin sağında
import { el, spriteIkon } from '../../core/ui.js';
import { oku, yaz } from '../../core/storage.js';
import { kayitlariGetir } from '../../core/metrics.js';
import { sayi } from '../../core/utils.js';
import { cocukGorunumuMu } from '../../core/hesap.js';
import { bantlariYukle, okumaBandi, kademe } from '../../core/siniflar.js';
import { fenerCiz } from '../../engine/fener.js';
import { bugunDurumu, seviyeBilgisi, ilerlemeVerisi, seriDurumu, bugunAnahtari } from '../../engine/motivasyon.js';
import { haftalikDurum } from '../veli/veli-veri.js';
import { egzersizBilgisi, aracBilgisi, modulEgzersizleri } from '../katalog.js';
import {
  GOREV_SURUMU, ALANLAR, DURUM_METNI, VARSAYILAN_WPM, gorevMetinleri, sablon, butceHesapla, tekrarDk, gorevListesiOlustur,
  listeGecerliMi, ogeTamamMi, toplamDk,
} from './gorev-veri.js';

const ONEK = 'gorev:';
let cizimNo = 0; // üst üste gelen çağrılarda yalnız sonuncusu çizer

// Sonradan yüklenen bilgiler: biri açılamazsa o bölüm atlanır (kart yine çizilir)
const modul = (yukle) => yukle().catch((h) => { console.warn('[gorev]', h); return null; });
const kursModulu = () => modul(() => import('../kurs/kurs-veri.js'));
const srsModulu = () => modul(() => import('../../engine/srs.js'));
const testModulu = () => modul(() => import('../testler/test-veri.js'));
const metinModulu = () => modul(() => import('../../engine/text-bank.js'));

// ---------- Veri toplama ----------
function tekrarBilgisi(srs, pid) {
  try {
    const t = srs?.bugununTekrari({ profilId: pid });
    return t ? { kalan: t.kartlar.length, yapilan: t.yapilan } : null;
  } catch (h) { console.warn('[gorev] tekrar kartları okunamadı:', h); return null; }
}

// Kurs durumu: { plan, tur: 'aktif' | 'donus' | 'bugunTamam', gun } | { plan, tur: null } (kurs yok ya da bitti)
function kursDurumu(kv, profil, bugun) {
  const plan = kv?.kursVerisi(profil.id) ?? null;
  if (!plan || plan.durum?.bitti) return { plan, tur: null };
  if (plan.durum?.yenidenBaslatmaOnerisi || kv.sinifDegisimi?.(plan, profil)) return { plan, tur: 'donus' };
  if (plan.gunler.some((g) => g.tarih === bugun && g.tamamlandi)) return { plan, tur: 'bugunTamam' };
  const gun = plan.gunler[plan.durum.gun - 1] ?? null;
  return gun ? { plan, tur: 'aktif', gun } : { plan, tur: null };
}

// Seviye testindeki gelişim alanı (yalnız ölçülen eksenler, dengeli değilse; test başka kademede yapıldıysa yok sayılır)
function gelisimAlani(tv, profil) {
  try {
    const v = tv?.testVerisi(profil.id);
    const son = v?.final ?? v?.baslangic;
    if (!son?.puanlar || (son.sinif != null && kademe(son.sinif) !== kademe(profil.sinif))) return null;
    const g = tv.guclulukOzeti(son.puanlar);
    return g.gelisim && !g.dengeli ? { eksen: g.gelisim.ad, egzersiz: g.gelisim.egzersiz, etiket: g.gelisim.etiket } : null;
  } catch (h) { console.warn('[gorev] test okunamadı:', h); return null; }
}

// Okuma hızı tahmini: son Oku ve Anla hızı, yoksa sınıf bandının varsayılanı, o da yoksa 150
function wpmTahmini(kayitlar, sinif) {
  for (let i = kayitlar.length - 1; i >= 0; i--) {
    if (kayitlar[i].egzersiz === 'oku-anla' && sayi(kayitlar[i].wpm) > 0) return kayitlar[i].wpm;
  }
  return okumaBandi(sinif)?.varsayilanWpm ?? VARSAYILAN_WPM;
}

// Bugünün öneri listesi: kayıtlıysa o (gün içinde değişmez), değilse kurulur ve kaydedilir
async function oneriListesi(profil, { bugun, kayitlar, durum, tekrarKalan }) {
  const anahtar = ONEK + profil.id;
  const kayitli = oku(anahtar, null);
  if (listeGecerliMi(kayitli, { bugun, sinif: profil.sinif })) return kayitli;
  const [tv, tb] = await Promise.all([testModulu(), metinModulu(), bantlariYukle()]);
  let metinler = [];
  if (tb) {
    try {
      await tb.metinBankasiYukle();
      metinler = tb.tumMetinler(profil.id).filter((m) => m.kaynak === 'banka' && m.sinif === profil.sinif)
        .map((m) => ({ kimlik: m.kimlik, ad: m.ad, kelime: m.kelime, soru: m.sorular.length, okundu: tb.okumaBilgisi(m.kimlik, profil.id)?.son ?? null }));
    } catch (h) { console.warn('[gorev] metinler okunamadı:', h); }
  }
  const { butceDk, istegeBagli } = butceHesapla(durum);
  const ogeler = gorevListesiOlustur({
    sinif: profil.sinif, bugun, kayitlar, butceDk: Math.max(0, butceDk - tekrarDk(tekrarKalan)),
    adaylar: ALANLAR.flatMap((a) => modulEgzersizleri(a, profil.sinif).map((b) => ({ ad: b.ad, modul: b.modul }))),
    gelisim: gelisimAlani(tv, profil), metinler, wpm: wpmTahmini(kayitlar, profil.sinif), tohum: `${profil.id}|${bugun}`,
  });
  const yeni = { surum: GOREV_SURUMU, gun: bugun, sinif: profil.sinif, olusturma: new Date().toISOString(), butceDk, istegeBagli, ogeler };
  yaz(anahtar, yeni); // yazılamazsa liste yine gösterilir; yeniden açılışta aynı girdiyle aynı liste kurulur
  return yeni;
}

// ---------- Çizim parçaları ----------
function maskot(ifade) {
  if (!cocukGorunumuMu()) return el('img', { sinif: 'gorev-karti__maskot', src: 'icons/fener.svg', alt: '', width: '72', height: '72' });
  return el('span', { sinif: 'gorev-karti__maskot gorev-karti__fener', 'aria-hidden': 'true' }, fenerCiz(ifade));
}

// Üst: rozet ve başlık tek satırda (sığmazsa alta kayar); açıklama yalnız gerektiğinde (kursa dönüş, öneri yok, profil yok).
// S35c-d3: ilkokul yönergesi (“Birine dokun…”) yalnız dokunulabilir öneri listesi varken; kurs dersleri satırdan açılmadığı için kursta yok
function ustBolum(M, { baslik, alt, ifade, yonerge = null }) {
  return el('div', { sinif: 'gorev-karti__ust' },
    el('div', { sinif: 'gorev-karti__baslik-kap' },
      el('div', { sinif: 'gorev-karti__baslik-satir' },
        el('span', { sinif: 'rozet rozet--gunes', metin: 'Bugünün Görevi' }),
        el('h2', { id: 'gorev-baslik', metin: baslik })),
      alt && el('p', { sinif: 'gorev-karti__not', metin: alt }),
      yonerge && el('p', { sinif: 'gorev-karti__yonerge', metin: yonerge })),
    maskot(ifade));
}

// Günlük hedef tek satır (etiket, çubuk, dk) + tek kısa not (“bugünlük yeter” dahil) ve veli haftalık hedefi (S20/S24 “Bugün” kartından taşındı)
function hedefBolumu(M, d, h) {
  const not = d.uzun ? M.notUzun : d.hedefTamam ? M.notTamam : d.dk === 0 ? M.notBasla : sablon(M.notKalan, { dk: d.hedefDk - d.dk });
  const hafta = h.hedefDk ? sablon(h.tamam ? M.haftaTamam : M.hafta, { dk: h.dk, hedef: h.hedefDk }) : null;
  return el('div', { sinif: 'gorev-karti__hedef' },
    el('div', { sinif: 'gorev-karti__hedef-satir' },
      el('span', { id: 'gorev-hedef-etiket', metin: 'Günlük hedef' }),
      el('div', { sinif: 'ilerleme ilerleme--gunes', role: 'progressbar', 'aria-labelledby': 'gorev-hedef-etiket', 'aria-valuemin': '0', 'aria-valuemax': '100',
        'aria-valuenow': String(d.yuzde), 'aria-valuetext': `${d.hedefDk} dakikalık hedefin ${d.dk} dakikası tamam` },
      el('span', { sinif: 'ilerleme__dolgu', style: `--deger: ${d.yuzde}%` })),
      el('span', { sinif: 'gorev-karti__dk', metin: `${d.dk} / ${d.hedefDk} dk` })),
    el('p', { sinif: 'gorev-karti__not', 'data-tur': d.uzun ? 'uyari' : null }, not, hafta && ` · ${hafta}`));
}

// Listenin bir satırı: durum dairesi (numara, ✓, –), ad (bağlantı ya da yazı) ve nedeni, süre; durum ekran okuyucuya yazıyla
function satir(i, { durum, ad, href, neden, dk, tikla }) {
  const isaret = durum === 'tamam' ? '✓' : durum === 'atlandi' ? '–' : String(i + 1);
  const govde = [el('span', { sinif: 'gorev-listesi__ad', metin: ad }), neden && el('span', { sinif: 'gorev-listesi__neden', metin: neden })];
  const sureVar = dk != null && dk > 0;
  return el('li', { 'data-durum': durum },
    el('span', { sinif: 'gorev-listesi__durum', 'aria-hidden': 'true', metin: isaret }),
    href
      ? el('a', { sinif: 'gorev-listesi__metin gorev-listesi__baglanti', href, onclick: tikla ?? null }, govde,
        el('span', { sinif: 'ekran-okuyucu', metin: `${sureVar ? `, yaklaşık ${dk} dakika` : ''}, ${DURUM_METNI[durum]}` }))
      : el('span', { sinif: 'gorev-listesi__metin' }, govde, el('span', { sinif: 'ekran-okuyucu', metin: `, ${DURUM_METNI[durum]}` })),
    sureVar && el('span', { sinif: 'gorev-listesi__sure', 'aria-hidden': href ? 'true' : null, metin: `${dk} dk` }));
}

function tekrarSatiri(M, t, i) {
  if (!t || (!t.kalan && !t.yapilan)) return null;
  const tamam = !t.kalan;
  return satir(i, {
    durum: tamam ? 'tamam' : 'sirada', href: '#/tekrar', dk: tamam ? null : tekrarDk(t.kalan),
    ad: tamam ? sablon(M.tekrarTamam, { n: t.yapilan }) : sablon(M.tekrar, { n: t.kalan }),
    neden: tamam ? null : aracBilgisi('tekrar')?.baslik ?? 'Tekrar Kartları',
  });
}

function nedenMetni(M, oge) {
  const sablonu = M.neden[oge.neden];
  return sablonu ? sablon(sablonu, { alan: oge.gelisimEtiketi ?? '' }) : null;
}

// Öneri öğeleri: tek dokunuşla açılır; okumada metin seçili gelir (text-bank secimAyarla)
function oneriSatirlari(M, liste, tamamMi, tb, ilk = 0) {
  return liste.ogeler.map((o, i) => {
    const bilgi = egzersizBilgisi(o.egzersiz);
    const ad = o.tur === 'okuma' ? `${bilgi?.baslik ?? o.egzersiz}: ${o.metinAd}` : bilgi?.baslik ?? o.egzersiz;
    return satir(ilk + i, {
      durum: tamamMi(o) ? 'tamam' : 'sirada', ad, dk: o.dk, neden: nedenMetni(M, o), href: `#/egzersiz/${o.egzersiz}`,
      tikla: o.tur === 'okuma' && tb ? () => tb.secimAyarla(o.egzersiz, o.metin) : null,
    });
  });
}

// Kurs dersinin adı: tekrar dersi bekleyen kart yoksa yedek egzersizle yapılır (kurs sayfasıyla aynı kural)
function dersAdi(ders, tekrarKalan) {
  if (ders.arac) return (tekrarKalan > 0 ? aracBilgisi(ders.arac)?.baslik : egzersizBilgisi(ders.yedekEgzersiz)?.baslik) ?? ders.arac;
  return egzersizBilgisi(ders.egzersiz)?.baslik ?? ders.egzersiz ?? '';
}
const DERS_DURUMU = Object.freeze({ bekliyor: 'sirada', tamam: 'tamam', atlandi: 'atlandi' });

// S35c-d5: seviye rozeti (numara; çevresindeki halka bir sonraki seviyeye ilerlemeyi gösterir; süs, ekran okuyucuya gizli) + iki satır yazı
function seviyeBolumu(s, seri) {
  return el('div', { sinif: 'gorev-karti__seviye' },
    el('span', { sinif: 'seviye-rozeti', 'aria-hidden': 'true', style: `--deger: ${Math.max(0, Math.min(100, s.yuzde))}` },
      el('span', { sinif: 'seviye-rozeti__no', metin: String(s.seviye) })),
    el('p', { sinif: 'gorev-karti__seviye-yazi' },
      el('strong', { metin: `Seviye ${s.seviye} · ${s.unvan}` }),
      el('span', { metin: `${s.xp} XP (sonrakine ${s.kalan}) · Seri ${seri.seri} gün` })));
}

// Son satırın parçaları (S35c-d4: yerler sabit): solda kurs düğmesi (varsa) ve seviye yazısı; sağda bağlantılar, “İlerlemem” her zaman en sağda, “Kurs karnen” (kurs varsa) onun solunda
function sonSatir(M, { eylem, s, seri, plan }) {
  return el('div', { sinif: 'gorev-karti__son' },
    eylem,
    seviyeBolumu(s, seri),
    el('div', { sinif: 'gorev-karti__baglantilar' },
      plan && el('a', { sinif: 'btn btn--kucuk gorev-karti__ikincil', href: '#/ilerleme?bolum=karne' }, spriteIkon('harita', 'ikon ikon--kucuk'), M.karne),
      el('a', { sinif: 'btn btn--kucuk gorev-karti__ikincil', href: '#/ilerleme' }, spriteIkon('grafik', 'ikon ikon--kucuk'), M.ilerleme)));
}

// Listenin başlığı: “İsteğe bağlı · 3 adım · yaklaşık 12 dk · 1 tamam”
function toplamSatiri(M, { dk, tamam, n, birim, istege = false }) {
  return n ? el('p', { sinif: 'gorev-karti__toplam', metin: `${istege ? `${M.istege} · ` : ''}${sablon(M.toplam, { dk, tamam, n, birim })}` }) : null;
}

// ---------- Ana çizim ----------
/** Kartı çizer (kap: section#gorev-karti). Profil yoksa kısa bilgi. Async: kurs, tekrar, test ve metin bilgisi sonradan yüklenir */
export async function gorevKartiCiz(kap, profil) {
  if (!kap) return;
  const no = ++cizimNo;
  const M = gorevMetinleri(profil?.sinif);
  if (!profil) {
    kap.removeAttribute('aria-busy');
    kap.replaceChildren(ustBolum(M, { baslik: M.oneriBaslik, alt: M.profilYok, ifade: 'normal' }));
    return;
  }
  const bugun = bugunAnahtari();
  const d = bugunDurumu(profil.id);
  const h = haftalikDurum(profil.id);
  const s = seviyeBilgisi(ilerlemeVerisi(profil.id).xp);
  const seri = seriDurumu(profil.id);
  const kayitlar = kayitlariGetir(profil.id);
  const [kv, srs, tb] = await Promise.all([kursModulu(), srsModulu(), metinModulu()]);
  if (no !== cizimNo) return;
  const t = tekrarBilgisi(srs, profil.id);
  const k = kursDurumu(kv, profil, bugun);

  let baslik;
  let alt;
  let satirlar = [];
  let eylem = null; // kurs düğmesi (alt satırın solunda)
  let eylemNot = null;
  let dokunulabilir = false; // satırlar öneri bağlantısı mı (yalnız kurs yokken ya da bugünkü kurs günü tamamken)
  let toplam = null;
  let tamamOge = 0;

  if (k.tur === 'aktif') {
    const dersler = k.gun.dersler;
    const tamam = dersler.filter((x) => x.durum === 'tamam').length;
    baslik = sablon(M.kursBaslik, { gun: k.gun.gun, toplam: k.plan.gunler.length });
    satirlar = dersler.map((x, i) => satir(i, { durum: DERS_DURUMU[x.durum] ?? 'sirada', ad: dersAdi(x, t?.kalan ?? 0), dk: x.dk }));
    const bekleyen = dersler.some((x) => x.durum === 'bekliyor');
    // Kurs bugün tekrar dersi içeriyorsa ayrı tekrar satırı gösterilmez (aynı iş iki kez görünmesin)
    if (!dersler.some((x) => x.arac === 'tekrar' && x.durum === 'bekliyor')) satirlar.push(tekrarSatiri(M, t, satirlar.length));
    eylemNot = !bekleyen && el('p', { sinif: 'gorev-karti__not', metin: M.kursBitirNot });
    eylem = el('a', { sinif: 'btn btn--gunes', href: '#/kurs' }, bekleyen ? M.kursDevam : M.kursAc, spriteIkon('ok-sag', 'ikon'));
    toplam = toplamSatiri(M, { dk: dersler.reduce((tp, x) => tp + (sayi(x.dk) ?? 0), 0), tamam, n: dersler.length, birim: M.ders });
    tamamOge = tamam;
  } else if (k.tur === 'donus') {
    baslik = M.kursDonusBaslik;
    alt = M.kursDonusAlt;
    satirlar = [tekrarSatiri(M, t, 0)];
    eylem = el('a', { sinif: 'btn btn--gunes', href: '#/kurs' }, M.kursAc, spriteIkon('ok-sag', 'ikon'));
  } else {
    // Kurs yok, bitti ya da bugünkü kurs günü tamam: gün içinde değişmeyen öneri listesi
    const liste = await oneriListesi(profil, { bugun, kayitlar, durum: d, tekrarKalan: t?.kalan ?? 0 });
    if (no !== cizimNo) return;
    const istegeBagli = liste.istegeBagli || d.hedefTamam;
    const okunduZamani = (kimlik) => tb?.okumaBilgisi(kimlik, profil.id)?.son ?? null;
    const tamamMi = (o) => ogeTamamMi(o, { kayitlar, olusturma: liste.olusturma, okunduZamani });
    baslik = k.tur === 'bugunTamam' ? M.kursTamamBaslik : istegeBagli ? M.yeterBaslik : M.oneriBaslik;
    satirlar = [tekrarSatiri(M, t, 0)].filter(Boolean);
    satirlar.push(...oneriSatirlari(M, liste, tamamMi, tb, satirlar.length));
    if (!liste.ogeler.length && !satirlar.length) alt = M.oneriYok;
    tamamOge = liste.ogeler.filter(tamamMi).length;
    dokunulabilir = satirlar.length > 0;
    toplam = toplamSatiri(M, { dk: toplamDk(liste.ogeler), tamam: tamamOge, n: liste.ogeler.length, birim: M.adim, istege: istegeBagli || k.tur === 'bugunTamam' });
  }

  // Fener’in yüzü (yalnız çocuk görünümü; mesaj yok: ana sayfa balonu konuşur)
  const ifade = d.hedefTamam || k.tur === 'bugunTamam' ? 'sevinc' : tamamOge > 0 || d.dk > 0 ? 'cesaret' : 'normal';
  const liste = satirlar.filter(Boolean);
  kap.removeAttribute('aria-busy');
  // S35c-d2: tek sütun: başlık → hedef → liste; en altta tek satır (S35c-d4: düğme ve seviye solda, bağlantılar sağda sabit; dar ekranda bağlantılar alt satırda yine sağda)
  kap.replaceChildren(
    ustBolum(M, { baslik, alt, ifade, yonerge: dokunulabilir ? M.yonerge : null }),
    hedefBolumu(M, d, h),
    el('div', { sinif: 'gorev-karti__ana' },
      toplam,
      liste.length > 0 && el('ol', { sinif: 'gorev-listesi', 'aria-label': 'Bugünün adımları' }, liste),
      eylemNot),
    sonSatir(M, { eylem, s, seri, plan: k.plan }));
}
