// İlerleme paneli (S20, #/ilerleme): seviye ve XP, esnek seri, günlük hedef, haftalık/aylık grafikler, 20 rozet; yazdırılabilir veli raporu (#/ilerleme/rapor)
import { el, spriteIkon, toastGoster } from '../../core/ui.js';
import { duyur } from '../../core/a11y.js';
import { etkinProfil } from '../../core/store.js';
import { kayitlariGetir } from '../../core/metrics.js';
import { egzersizBilgisi, modulBilgisi } from '../katalog.js';
import { cizgiGrafik } from '../../engine/grafik.js';
import {
  ilerlemeVerisi, seriDurumu, bugunDurumu, seviyeBilgisi, rozetDurumu, gunlukHedefAyarla, bugunlukMesaji,
  bugunAnahtari, gunKaydir, HEDEF_SECENEKLERI, SERI, XP, ROZETLER,
} from '../../engine/motivasyon.js';
import { DONEMLER, OLCULER, gunListesi, olcuSerileri, donemOzeti } from './ilerleme-veri.js';

const YAZDIR_SINIFI = 'yazdir-ilerleme';
const RAPOR_GUN = 30;
let donem = 'hafta'; // oturum boyunca hatırlanır

// ---------- Tarih ve metin yardımcıları ----------
function tarih(anahtar) {
  const [y, a, g] = anahtar.split('-').map(Number);
  return new Date(y, a - 1, g);
}
const bicim = (ops) => new Intl.DateTimeFormat('tr-TR', ops);
const GUN_KISA = bicim({ weekday: 'short' });
const AY_KISA = bicim({ day: 'numeric', month: 'short' });
const UZUN = bicim({ day: 'numeric', month: 'long', weekday: 'long' });
const TAM = bicim({ day: 'numeric', month: 'long', year: 'numeric' });
const tarihMetni = (anahtar, f = TAM) => f.format(tarih(anahtar));

function sayfaUst(baslik, aciklama) {
  return el('div', { sinif: 'sayfa-ust' },
    el('span', { sinif: 'kart__ikon', 'aria-hidden': 'true', style: '--m-zemin: var(--modul-test); --m-ikon: var(--modul-test-ikon)' }, spriteIkon('grafik', 'ikon')),
    el('div', {}, el('h1', { metin: baslik }), el('p', { sinif: 'soluk', metin: aciklama })));
}

function cubuk(yuzde, etiketId, metin, tur = 'basari') {
  return el('div', { sinif: `ilerleme ilerleme--${tur}`, role: 'progressbar', 'aria-labelledby': etiketId,
    'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': String(yuzde), 'aria-valuetext': metin },
  el('span', { sinif: 'ilerleme__dolgu', style: `--deger: ${yuzde}%` }));
}

// Ölçü değeri metni: yüzde Türkçe yazımla önde (%80), diğerleri birimle (120 k/dk)
const degerMetni = (o, v) => (v == null ? '—' : o.yuzde ? `%${v}` : `${v} ${o.birim}`);
const serilerinAdi = (s) => s.etiket ?? egzersizBilgisi(s.egzersiz)?.baslik ?? s.ad;

// ---------- Özet kartları ----------
function seviyeKarti(veri) {
  const s = seviyeBilgisi(veri.xp);
  const kalanMetni = `Seviye ${s.seviye + 1} için ${s.kalan} XP kaldı`;
  return el('section', { sinif: 'kart ilerleme-kart', 'aria-labelledby': 'il-seviye-baslik' },
    el('h2', { id: 'il-seviye-baslik', sinif: 'ilerleme-kart__baslik', metin: 'Seviye' }),
    el('p', { sinif: 'ilerleme-kart__deger' }, el('strong', { metin: String(s.seviye) }), el('span', { metin: s.unvan })),
    el('div', { sinif: 'ilerleme-etiket' }, el('span', { id: 'il-seviye-etiket', metin: `${veri.xp} XP` }), el('span', { metin: `${s.ust} XP` })),
    cubuk(s.yuzde, 'il-seviye-etiket', kalanMetni, 'gunes'),
    el('p', { sinif: 'ilerleme-kart__not', metin: `${kalanMetni}.` }));
}

function seriMesaji(s, dun) {
  if (s.seri === 0) return 'Bugün çalışınca yeni bir seri başlar.';
  if (s.bugunCalisildi) return 'Bugün çalıştın, serin sürüyor.';
  if (s.durumlar.get(dun) === 'dinlenme') return 'Dün dinlenme günündü; hakkın serini korudu.';
  return s.hak > 0
    ? 'Bugün ara verirsen bir dinlenme hakkı kullanılır, serin bozulmaz.'
    : 'Dinlenme hakkın şu an yok; bugün kısa bir çalışma serini sürdürür.';
}

const GUN_DURUMLARI = {
  calisti: 'çalıştın', dinlenme: 'dinlenme günü (hak kullanıldı)', bos: 'çalışma yok', bekliyor: 'bugün, henüz çalışma yok',
};

function seriSeridi(s) {
  const bugun = bugunAnahtari();
  return el('ol', { sinif: 'seri-serit', 'aria-label': 'Son 7 gün' }, gunListesi(7, bugun).map((g) => {
    const durum = s.durumlar.get(g) ?? (g === bugun ? 'bekliyor' : 'bos');
    return el('li', { sinif: 'seri-serit__gun', 'data-durum': durum },
      el('span', { sinif: 'seri-serit__isaret', 'aria-hidden': 'true' }, durum === 'calisti' ? spriteIkon('onay', 'ikon ikon--kucuk')
        : durum === 'dinlenme' ? spriteIkon('ay', 'ikon ikon--kucuk') : null),
      el('span', { sinif: 'seri-serit__ad', 'aria-hidden': 'true', metin: GUN_KISA.format(tarih(g)) }),
      el('span', { sinif: 'ekran-okuyucu', metin: `${tarihMetni(g, UZUN)}: ${GUN_DURUMLARI[durum]}` }));
  }));
}

function seriKarti() {
  const s = seriDurumu();
  const dun = gunKaydir(bugunAnahtari(), -1);
  return el('section', { sinif: 'kart ilerleme-kart', 'aria-labelledby': 'il-seri-baslik' },
    el('h2', { id: 'il-seri-baslik', sinif: 'ilerleme-kart__baslik', metin: 'Çalışma serisi' }),
    el('p', { sinif: 'ilerleme-kart__deger' }, el('strong', { metin: String(s.seri) }), el('span', { metin: 'gün' })),
    seriSeridi(s),
    el('p', { sinif: 'ilerleme-kart__not', metin: seriMesaji(s, dun) }),
    el('p', { sinif: 'ilerleme-kart__alt' },
      el('span', {}, spriteIkon('ay', 'ikon ikon--kucuk'), ` Dinlenme hakkı: ${s.hak} / ${SERI.enCokHak}`),
      el('span', { metin: `En uzun seri: ${s.enUzun} gün` })));
}

function bugunKarti() {
  const d = bugunDurumu();
  const mesaj = bugunlukMesaji(d);
  const kart = el('section', { sinif: 'kart ilerleme-kart', 'aria-labelledby': 'il-bugun-baslik' },
    el('h2', { id: 'il-bugun-baslik', sinif: 'ilerleme-kart__baslik', metin: 'Bugün' }),
    el('p', { sinif: 'ilerleme-kart__deger' }, el('strong', { metin: String(d.dk) }), el('span', { metin: `/ ${d.hedefDk} dk` })),
    el('div', { sinif: 'ilerleme-etiket' }, el('span', { id: 'il-hedef-etiket', metin: 'Günlük hedef' }), el('span', { metin: `%${d.yuzde}` })),
    cubuk(d.yuzde, 'il-hedef-etiket', `${d.hedefDk} dakikalık hedefin ${d.dk} dakikası tamam`),
    mesaj
      ? el('div', { sinif: `bildirim bildirim--${mesaj.tur}` }, el('p', {}, el('strong', { metin: `${mesaj.baslik}. ` }), mesaj.metin))
      : el('p', { sinif: 'ilerleme-kart__not', metin: d.dk === 0 ? 'Kısa bir çalışma yeterli; hedefin günde birkaç kısa tur.' : `Hedefe ${d.hedefDk - d.dk} dakika kaldı.` }),
    el('fieldset', { sinif: 'grup' },
      el('legend', { metin: 'Günlük hedefim' }),
      el('div', { sinif: 'segment' }, HEDEF_SECENEKLERI.map((dk) => el('label', {},
        el('input', { type: 'radio', name: 'gunluk-hedef', value: String(dk), checked: dk === d.hedefDk,
          onchange: () => hedefDegisti(kart, dk) }),
        el('span', { metin: `${dk} dk` }))))));
  return kart;
}

function hedefDegisti(kart, dk) {
  if (!gunlukHedefAyarla(dk)) { toastGoster('Hedef kaydedilemedi; yeniden dene.', { tur: 'uyari' }); return; }
  const yeni = bugunKarti();
  kart.replaceWith(yeni);
  yeni.querySelector(`input[value="${dk}"]`)?.focus();
  duyur(`Günlük hedef ${dk} dakika oldu.`);
}

// ---------- Grafikler ----------
function grafikEtiketleri(gunler, uzunDonem) {
  return {
    etiketler: gunler.map((g) => (uzunDonem ? AY_KISA : GUN_KISA).format(tarih(g))),
    uzunEtiketler: gunler.map((g) => tarihMetni(g, UZUN)),
  };
}

function olcuKarti(olcu, kayitlar, gunler, donemEtiketi, uzunDonem) {
  const { seriler, bos } = olcuSerileri(olcu, kayitlar, gunler);
  if (bos) {
    return el('div', { sinif: 'kart grafik-kart' },
      el('h3', { sinif: 'grafik-kart__bos-baslik', metin: olcu.baslik }),
      el('p', { sinif: 'bos-durum', metin: `${donemEtiketi.toLocaleLowerCase('tr-TR')} için ölçüm yok. ${olcu.bos}` }),
      el('a', { sinif: 'btn btn--hayalet btn--kucuk yazdirma-yok', href: olcu.adres, metin: olcu.adresMetni }));
  }
  const adlar = seriler.map((s) => ({ ...s, etiket: serilerinAdi(s) }));
  const ozetler = adlar.filter((s) => s.olcumGunu).map((s) => (s.olcumGunu === 1
    ? `${adlar.length > 1 ? `${s.etiket}: ` : ''}bu dönemde 1 ölçüm günü (${degerMetni(olcu, s.son)})`
    : `${adlar.length > 1 ? `${s.etiket}: ` : ''}ilk ölçüm günü ${degerMetni(olcu, s.ilk)}, son ölçüm günü ${degerMetni(olcu, s.son)}`));
  const { etiketler, uzunEtiketler } = grafikEtiketleri(gunler, uzunDonem);
  return el('div', { sinif: 'kart grafik-kart' },
    cizgiGrafik({
      baslik: olcu.baslik, aciklama: olcu.aciklama, birim: olcu.birim, yuzde: !!olcu.yuzde, etiketler, uzunEtiketler,
      seriler: adlar, ozet: `${olcu.baslik}, ${donemEtiketi.toLocaleLowerCase('tr-TR')}: ${ozetler.join('; ')}.`,
    }),
    el('p', { sinif: 'grafik-kart__not', metin: `${ozetler.join('. ')}.` }));
}

function grafikleriCiz(alan, kayitlar) {
  const d = DONEMLER[donem];
  const gunler = gunListesi(d.gun);
  alan.replaceChildren(...OLCULER.map((o) => olcuKarti(o, kayitlar, gunler, d.etiket, d.gun > 7)));
}

function grafikBolumu(kayitlar) {
  const baslik = el('h2', { id: 'il-grafik-baslik', metin: 'Gelişim grafikleri' });
  if (!kayitlar.length) {
    return el('section', { sinif: 'yigin', 'aria-labelledby': 'il-grafik-baslik', style: '--yigin-bosluk: var(--b-3)' }, baslik,
      el('div', { sinif: 'bos-durum ilerleme-bos' },
        el('p', { metin: 'Henüz kayıtlı bir çalışman yok. İlk egzersizini bitirdiğinde okuma, anlama, dikkat ve hafıza grafiklerin burada oluşmaya başlar.' }),
        el('a', { sinif: 'btn btn--birincil', href: '#/egzersizler', metin: 'Egzersizlere göz at' })));
  }
  const alan = el('div', { sinif: 'grafik-izgara' });
  const secim = el('fieldset', { sinif: 'grup donem-secimi' },
    el('legend', { sinif: 'ekran-okuyucu', metin: 'Dönem' }),
    el('div', { sinif: 'segment' }, Object.entries(DONEMLER).map(([ad, d]) => el('label', {},
      el('input', { type: 'radio', name: 'il-donem', value: ad, checked: ad === donem,
        onchange: () => { donem = ad; grafikleriCiz(alan, kayitlar); duyur(`${d.etiket} gösteriliyor.`); } }),
      el('span', { metin: d.etiket })))));
  grafikleriCiz(alan, kayitlar);
  return el('section', { sinif: 'yigin', 'aria-labelledby': 'il-grafik-baslik', style: '--yigin-bosluk: var(--b-3)' },
    el('div', { sinif: 'bolum-baslik ilerleme-bolum-baslik' }, baslik, secim),
    el('p', { sinif: 'soluk', metin: 'Her nokta bir günü gösterir; çalışmadığın günler boş kalır. Günden güne iniş çıkışlar olağandır, uzun dönemdeki yöne bak.' }),
    alan);
}

// ---------- Rozetler ----------
function rozetListesi(rozetler, { kilitliler = true } = {}) {
  const liste = kilitliler ? rozetler : rozetler.filter((r) => r.kazanildi);
  return el('ul', { sinif: 'rozet-izgara' }, liste.map((r) => el('li', { sinif: `madalya rozet-karti${r.kazanildi ? '' : ' madalya--kilitli'}` },
    el('span', { sinif: 'madalya__disk', 'aria-hidden': 'true' }, spriteIkon(r.kazanildi ? r.ikon : 'kilit', 'ikon')),
    el('span', { sinif: 'rozet-karti__ad' }, r.kazanildi ? null : el('span', { sinif: 'ekran-okuyucu', metin: 'Henüz kazanılmadı: ' }), r.ad),
    el('span', { sinif: 'rozet-karti__olcut', metin: r.olcut }),
    r.kazanildi && el('span', { sinif: 'rozet-karti__tarih', metin: tarihMetni(r.kazanildi, AY_KISA) }))));
}

function rozetBolumu() {
  const rozetler = rozetDurumu();
  const kazanilan = rozetler.filter((r) => r.kazanildi).length;
  return el('section', { sinif: 'yigin', 'aria-labelledby': 'il-rozet-baslik', style: '--yigin-bosluk: var(--b-3)' },
    el('div', { sinif: 'bolum-baslik' }, el('h2', { id: 'il-rozet-baslik', metin: `Rozetler (${kazanilan} / ${rozetler.length})` })),
    el('p', { sinif: 'soluk', metin: kazanilan
      ? 'Her rozet bir alışkanlığı ya da kendi sonucundaki bir adımı gösterir.'
      : 'Henüz rozetin yok. İlk çalışmanı bitirince ilk rozetin gelir; ölçütler her rozetin altında.' }),
    rozetListesi(rozetler));
}

function nasilIsler() {
  return el('details', { sinif: 'kart ilerleme-nasil' },
    el('summary', { metin: 'XP, seviye ve seri nasıl işler?' }),
    el('ul', {},
      el('li', { metin: `Bitirdiğin her tur ${XP.tur} XP (${XP.kisaTurSn} saniyeden kısa turlar ${XP.kisaTur} XP), çalıştığın her dakika ${XP.dakika} XP getirir (tur başına en çok ${XP.enCokDakika} dakika).` }),
      el('li', { metin: `Okumada anlama %${XP.anlamaEsigi} ve üstündeyse +${XP.anlama} XP; günlük hedefini tamamladığın gün bir kez +${XP.hedefBonusu} XP.` }),
      el('li', { metin: `Günde en çok ${XP.gunlukSinir} XP kazanılır. Daha uzun çalışmak daha çok XP getirmez; kısa ve düzenli çalışmak yeterli.` }),
      el('li', { metin: `Seri, çalıştığın ardışık günleri sayar. Başta ${SERI.baslangicHak} dinlenme hakkın var; her ${SERI.hakIcinGun} çalışma gününde bir hak daha kazanırsın (en çok ${SERI.enCokHak}). Çalışmadığın bir günde hak varsa serin bozulmaz.` })));
}

/** #/ilerleme */
export function ilerlemeSayfasiCiz(kap) {
  document.documentElement.classList.remove(YAZDIR_SINIFI);
  const ust = sayfaUst('İlerleme', 'Gelişimin yalnızca kendi geçmişinle karşılaştırılır.');
  const p = etkinProfil();
  if (!p) {
    kap.replaceChildren(ust, el('p', { sinif: 'bos-durum', metin: 'İlerlemeni görmek için önce bir profil oluştur.' }));
    return;
  }
  const veri = ilerlemeVerisi(p.id);
  const kayitlar = kayitlariGetir(p.id);
  kap.replaceChildren(ust,
    el('div', { sinif: 'ilerleme-ozet' }, seviyeKarti(veri), seriKarti(), bugunKarti()),
    grafikBolumu(kayitlar),
    rozetBolumu(),
    el('section', { sinif: 'kart ilerleme-rapor-karti', 'aria-labelledby': 'il-rapor-baslik' },
      el('div', {}, el('h2', { id: 'il-rapor-baslik', metin: 'Veli raporu' }),
        el('p', { sinif: 'soluk', metin: `Son ${RAPOR_GUN} günün özeti; yazdırılabilir ya da PDF olarak kaydedilebilir.` })),
      el('a', { sinif: 'btn btn--ikincil', href: '#/ilerleme/rapor' }, spriteIkon('test', 'ikon'), 'Raporu aç')),
    nasilIsler());
}

// ---------- Veli raporu ----------
function tablo(baslik, sutunlar, satirlar) {
  return el('div', { sinif: 'rapor-tablo-kap' }, el('table', { sinif: 'rapor-tablo' },
    el('caption', { metin: baslik }),
    el('thead', {}, el('tr', {}, sutunlar.map((s) => el('th', { scope: 'col', metin: s })))),
    el('tbody', {}, satirlar.map(([ilk, ...diger]) => el('tr', {}, el('th', { scope: 'row', metin: ilk }), diger.map((v) => el('td', { metin: String(v) })))))));
}

const AILE_NOTLARI = [
  'Bu rapor yalnızca bu cihazdaki çalışmalardan hazırlanır; bir sınav sonucu ya da tanı değildir.',
  'Günde 10-20 dakikalık kısa ve düzenli çalışma, seyrek ve uzun çalışmadan genellikle daha yararlıdır.',
  'Hızdan önce anlamaya bakın: uygulama, anlama %70’in altındayken okuma hızını artırmaz.',
  'Çocuğunuzu başkalarıyla değil, kendi önceki sonuçlarıyla karşılaştırın; sonuçtan çok çabayı ve düzeni takdir edin.',
  'Tek günlük düşüşler olağandır (yorgunluk, metnin zorluğu). Birkaç haftalık yöne bakmak daha anlamlıdır.',
];

/** #/ilerleme/rapor */
export function ilerlemeRaporuCiz(kap) {
  document.documentElement.classList.add(YAZDIR_SINIFI);
  const geri = el('a', { sinif: 'btn btn--hayalet btn--kucuk geri-baglanti yazdirma-yok', href: '#/ilerleme' },
    spriteIkon('ok-sag', 'ikon ikon--kucuk ikon--ters'), 'İlerlemeye dön');
  const p = etkinProfil();
  if (!p) {
    kap.replaceChildren(geri, el('p', { sinif: 'bos-durum', metin: 'Rapor için önce bir profil oluştur.' }));
    return;
  }
  const bugun = bugunAnahtari();
  const gunler = gunListesi(RAPOR_GUN, bugun);
  const veri = ilerlemeVerisi(p.id);
  const kayitlar = kayitlariGetir(p.id);
  const ozet = donemOzeti(veri, kayitlar, gunler);
  const seri = seriDurumu(p.id);
  const sev = seviyeBilgisi(veri.xp);
  const donemMetni = `${tarihMetni(gunler[0])} – ${tarihMetni(bugun)}`;

  const parcalar = [
    geri,
    el('header', { sinif: 'rapor-ust' },
      el('div', {},
        el('h1', { metin: 'Veli raporu' }),
        el('p', { sinif: 'rapor-ust__kim', metin: `${p.takmaAd}, ${p.sinif}. sınıf` }),
        el('p', { sinif: 'soluk', metin: `Dönem: ${donemMetni} (son ${RAPOR_GUN} gün). Hazırlanma: ${tarihMetni(bugun)}.` })),
      el('button', { type: 'button', sinif: 'btn btn--birincil yazdirma-yok', onclick: () => window.print() }, spriteIkon('indir', 'ikon'), 'Yazdır')),
  ];

  if (!ozet.calisilanGun) {
    parcalar.push(el('p', { sinif: 'bos-durum', metin: `Son ${RAPOR_GUN} günde kayıtlı bir çalışma yok. Çalışmalar yapıldıkça bu rapor kendiliğinden dolar.` }));
  } else {
    parcalar.push(tablo('Genel bakış', ['Bilgi', 'Değer'], [
      ['Çalışılan gün', `${ozet.calisilanGun} / ${RAPOR_GUN}`],
      ['Toplam çalışma süresi', `${ozet.toplamDk} dk`],
      ['Çalışılan gün başına ortalama', `${ozet.ortDk} dk`],
      ['Günlük hedefin tutulduğu gün', `${ozet.hedefGun} (hedef şu an ${veri.gunlukHedefDk} dk)`],
      ['Şu anki çalışma serisi', `${seri.seri} gün (en uzun ${seri.enUzun} gün)`],
      ['Seviye', `${sev.seviye}, ${sev.unvan} (${veri.xp} XP)`],
    ]));
    const alanSatirlari = Object.entries(ozet.alanlar).sort((a, b) => b[1].sn - a[1].sn)
      .map(([m, a]) => [modulBilgisi(m)?.baslik ?? m, a.oturum, `${Math.round(a.sn / 60)} dk`]);
    if (alanSatirlari.length) parcalar.push(tablo('Alanlara göre çalışma', ['Alan', 'Tur', 'Süre'], alanSatirlari));

    const olcuSatirlari = [];
    const grafikler = [];
    const { etiketler, uzunEtiketler } = grafikEtiketleri(gunler, true);
    for (const o of OLCULER) {
      const { seriler, bos } = olcuSerileri(o, kayitlar, gunler);
      const adlar = seriler.map((s) => ({ ...s, etiket: serilerinAdi(s) }));
      adlar.forEach((s) => olcuSatirlari.push([adlar.length > 1 ? `${o.baslik}: ${s.etiket}` : o.baslik,
        degerMetni(o, s.ilk), degerMetni(o, s.son), s.olcumGunu]));
      if (!bos) {
        grafikler.push(el('div', { sinif: 'kart grafik-kart' }, cizgiGrafik({
          baslik: o.baslik, aciklama: o.aciklama, birim: o.birim, yuzde: !!o.yuzde, etiketler, uzunEtiketler, seriler: adlar,
          ozet: `${o.baslik}, son ${RAPOR_GUN} gün: ${adlar.filter((s) => s.olcumGunu).map((s) => `${s.etiket} ilk ${degerMetni(o, s.ilk)}, son ${degerMetni(o, s.son)}`).join('; ')}.`,
        })));
      }
    }
    parcalar.push(tablo('Ölçümler (günlük değerler)', ['Ölçü', 'İlk ölçüm günü', 'Son ölçüm günü', 'Ölçüm günü'], olcuSatirlari),
      el('p', { sinif: 'alan__ipucu', metin: 'Okuma ve dikkat için günün ortalaması, hafıza için günün en uzun dizisi alınır. Ölçüm günü az olan satırlar henüz bir eğilim göstermez.' }));
    if (grafikler.length) {
      parcalar.push(el('section', { sinif: 'yigin', 'aria-labelledby': 'rapor-grafik-baslik', style: '--yigin-bosluk: var(--b-3)' },
        el('h2', { id: 'rapor-grafik-baslik', metin: 'Grafikler' }), el('div', { sinif: 'grafik-izgara' }, grafikler)));
    }
  }

  const rozetler = rozetDurumu(p.id);
  const kazanilan = rozetler.filter((r) => r.kazanildi);
  parcalar.push(el('section', { sinif: 'yigin', 'aria-labelledby': 'rapor-rozet-baslik', style: '--yigin-bosluk: var(--b-3)' },
    el('h2', { id: 'rapor-rozet-baslik', metin: `Kazanılan rozetler (${kazanilan.length} / ${ROZETLER.length})` }),
    kazanilan.length ? rozetListesi(rozetler, { kilitliler: false }) : el('p', { sinif: 'soluk', metin: 'Henüz kazanılan rozet yok.' })));

  parcalar.push(el('section', { sinif: 'kart rapor-notlar', 'aria-labelledby': 'rapor-not-baslik' },
    el('h2', { id: 'rapor-not-baslik', metin: 'Aileler için notlar' }),
    el('ul', {}, AILE_NOTLARI.map((n) => el('li', { metin: n })))));
  kap.replaceChildren(...parcalar);
}

/** Sayfadan çıkınca yazdırma sınıfı kaldırılır */
export function ilerlemeSayfasiniKapat() {
  document.documentElement.classList.remove(YAZDIR_SINIFI);
}
