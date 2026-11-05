// Akıllı Kurs ekranları (S19): #/kurs (başlangıç, gün haritası, bugünün dersleri ve akışı, aralarda mola, plan bildirimi, yorgun modu) ve #/kurs/rapor (başlangıç/final karşılaştırması, yazdırılabilir sertifika)
import { el, spriteIkon, toastGoster, modalAc, modalKapat } from '../../core/ui.js';
import { duyur, odakla, molaRehberiAcikMi } from '../../core/a11y.js';
import { etkinProfil } from '../../core/store.js';
import { git, etkinRota } from '../../core/router.js';
import { gunAnahtari, tarihMetni, sayiBicimle, yuzdeBicimle } from '../../core/utils.js';
import { modulKayitlari } from '../../core/metrics.js';
import { egzersizAc, egzersiziKapat } from '../../engine/exercise-frame.js';
import { radarOlustur } from '../../engine/radar.js';
import { bugununTekrari } from '../../engine/srs.js';
import { bugunkuGun, kursOzeti, kararAciklamasi, kurallarAciklamasi, kurallariYukle, gunFarki } from '../../engine/course-planner.js';
import { egzersizYukle, egzersizBilgisi, aracBilgisi } from '../katalog.js';
import { testVerisi, testDurumu, EKSENLER, karsilastir, hamMetin } from '../testler/test-veri.js';
import { kursVerisi, kursBaslat, kursAc, dersiIsaretle, gunuBitir, yorgunModu, yenidenBaslatSec } from './kurs-veri.js';

const MOLA_SN = 20;        // dersler arası mola (20-20-20: uzağa bakma)
const GECIS_SN = 5;        // mola hatırlatıcısı kapalıyken kısa geçiş
const OKUMA_MODU = Object.freeze({ 'tekrarli-okuma': 'rehber' }); // kural adı → okuma modu (tekrarlı okuma = aynı metni rehberli yeniden okumak)
const NEDEN_METNI = Object.freeze({
  'eksik-ders': 'Günü bitirmek için en az {enAz} dersi tamamlaman gerekiyor.',
  'anlama-eksik': 'Günü bitirmek için önce anlama okumasını yapman gerekiyor; günün ölçüsü bu ders.',
  'takvim-siniri': 'Bugün bir kurs günü zaten tamamlandı. Sıradaki gün yarın açılır.',
  'yeniden-baslat-bekliyor': 'Önce uzun aradan sonra nasıl devam edeceğini seç.',
  'kurs-bitti': 'Kurs tamamlandı; raporuna bakabilirsin.',
});

let cizimNo = 0;     // eski bir çizim yeni sayfanın üstüne yazmasın
let kapEl = null;
let kurallar = null;
let ara = null;      // dersler arası mola: { dialog, zaman }

// ---------- Küçük yardımcılar ----------
const sayfaUst = (baslik, aciklama, id) => el('div', { sinif: 'sayfa-ust', 'data-modul': 'kurs' },
  el('span', { sinif: 'kart__ikon', 'aria-hidden': 'true' }, spriteIkon('harita', 'ikon')),
  el('div', {}, el('h1', { id, metin: baslik }), aciklama && el('p', { sinif: 'soluk', metin: aciklama })));
const bolum = (id, baslik, ...icerik) => el('section', { sinif: 'kurs-kart', 'aria-labelledby': id }, el('h2', { id, metin: baslik }), ...icerik);
const dugme = (metin, sinif, onclick, oz = {}) => el('button', { type: 'button', sinif: `btn ${sinif}`, onclick, ...oz }, metin);
const tipEtiketi = (ders) => (ders.arac ? aracBilgisi(ders.arac)?.baslik : null) ?? kurallar?.dersTipleri?.[ders.tip]?.etiket ?? ders.tip;
const kursSayfasinda = () => etkinRota()?.yol === '/kurs';
const enAzDers = (gun) => Math.min(kurallar.kurs.gunTamamEnAzDers, gun.dersler.length);
const tamamSayisi = (gun) => gun.dersler.filter((x) => x.durum === 'tamam').length;
const zorunluMu = (ders) => ders.tip === kurallar.kurs.gunTamamZorunluTip && !ders.arac;
const bitirilebilir = (gun) => tamamSayisi(gun) >= enAzDers(gun) && gun.dersler.filter(zorunluMu).every((x) => x.durum === 'tamam');

// Pekiştirme günü 5. ders: bekleyen kart varsa Tekrar Kartları, yoksa yedek egzersiz
function dersHedefi(ders) {
  if (!ders.arac) return { egzersiz: ders.egzersiz };
  let bekleyen = 0;
  try { bekleyen = bugununTekrari().kartlar.length; } catch (h) { console.error('[kurs] tekrar kartları okunamadı:', h); }
  return bekleyen > 0 ? { arac: ders.arac, bekleyen } : { egzersiz: ders.yedekEgzersiz };
}

function dersBasligi(ders) {
  const h = dersHedefi(ders);
  const ad = h.arac ? aracBilgisi(h.arac)?.baslik : egzersizBilgisi(h.egzersiz)?.baslik;
  return ad ?? h.egzersiz ?? '';
}

// Her ders için kısa yönerge (cezalandırmayan, ölçülü dil)
function yonergeMetni(ders, gun) {
  const a = ders.ayar ?? {};
  const h = dersHedefi(ders);
  if (h.arac) return `Zamanı gelen ${h.bekleyen} kartını tekrar et. Bitirince Kurs sayfasına dön; ders kendiliğinden işaretlenir.`;
  if (ders.arac) return 'Bugün zamanı gelen kartın yok; onun yerine kısa bir kelime listesi çalışması yapıyorsun.';
  switch (ders.tip) {
    case 'goz': return 'Isınma: başını sabit tut, acele etme. Amaç doğru görmek; hız arkasından gelir.';
    case 'hiz':
      if ((OKUMA_MODU[a.mod] ?? a.mod) === 'serbest' || !a.wpm) return 'Kendi rahat hızında oku. Okuma modu bugünkü plana göre ayarlı.';
      return a.mod === 'tekrarli-okuma'
        ? `Daha önce okuduğun metni ${a.wpm} kelime/dk ile yeniden oku. İkinci okuma daha akıcı olur.`
        : `Vurguyu gözünle izle (${a.wpm} kelime/dk). Hız ve mod bugünkü plana göre ayarlı; zorlanırsan okurken “Yavaşlat”a bas. Bu ders anlama okumasına hazırlıktır.`;
    case 'anlama':
      if (gun.kalibrasyon) return 'Bugün kendi hızında (serbest) oku, sonra soruları yanıtla. Hedefini bu okumaya göre ayarlayacağız.';
      if (gun.tur === 'olcum') return 'Ölçüm okuması: kendi hızında (serbest) oku, sonra soruları yanıtla. Anlamak hızdan önce gelir.';
      return `Metni ${a.wpm ?? 'hedef'} kelime/dk ile oku, sonra soruları yanıtla. Hız bugünkü hedefine göre ayarlı; zorlanırsan “Yavaşlat”a basabilirsin, hedef o zaman yükselmez, yarın yeniden denenir. Günün ölçüsü bu ders.`;
    case 'dikkat': return 'Kısa bir dikkat oyunu: önce doğruluk, sonra hız.';
    case 'hafiza': return 'Kısa bir hafıza oyunu. İpucu: öğeleri gruplayarak içinden tekrar et.';
    default: return '';
  }
}

// Okuma derslerinde metin: kural adına göre kütüphaneden seçilir (seçim metin seçicinin hatırladığı metin olur)
async function metinHazirla(ders, egzersiz) {
  const kural = ders.ayar?.metin;
  if (!kural) return;
  try {
    const tb = await import('../../engine/text-bank.js');
    await tb.metinBankasiYukle();
    let kimlik = null;
    if (kural === 'onceki-anlama') {
      const k = modulKayitlari('oku', { egzersiz: 'oku-anla' }).filter((x) => x.ekstra?.kurs && x.ekstra?.metin).at(-1);
      if (k && tb.metinBul(k.ekstra.metin)) kimlik = k.ekstra.metin;
    }
    if (!kimlik) {
      const uzunluk = String(kural).split('-').at(-1); // sinif-okunmamis-kisa | orta
      const sinif = etkinProfil()?.sinif;
      const uzunlukAdi = (m) => { try { const u = tb.uzunlukBul(m); return typeof u === 'string' ? u : u?.ad; } catch { return null; } };
      const liste = tb.tumMetinler().filter((m) => m.kaynak !== 'kendi' && m.sinif === sinif && m.sorular?.length);
      const okunmamis = liste.filter((m) => !(tb.okumaBilgisi(m.kimlik)?.sayi > 0));
      const secilen = okunmamis.find((m) => uzunlukAdi(m) === uzunluk) ?? okunmamis[0] ?? liste[0];
      kimlik = secilen?.kimlik ?? null;
    }
    if (kimlik) tb.secimAyarla(egzersiz, kimlik);
  } catch (h) {
    console.error('[kurs] metin seçilemedi (öğrenci kendisi seçer):', h);
  }
}

// ---------- Ders akışı ----------
function araKapat() {
  if (!ara) return;
  clearInterval(ara.zaman);
  const d = ara.dialog;
  ara = null;
  if (d.open) modalKapat(d);
  d.remove();
}

/** Bir dersi çerçevede açar. akis: bitince sıradaki derse geçilsin mi */
async function dersAc(sira, { akis = true } = {}) {
  araKapat();
  const plan = kursVerisi();
  const gun = bugunkuGun(plan);
  const i = gun?.dersler.findIndex((x) => x.sira === sira) ?? -1;
  if (!gun || i < 0) return;
  const ders = gun.dersler[i];
  const hedef = dersHedefi(ders);
  if (hedef.arac) { git(aracBilgisi(hedef.arac)?.adres?.replace(/^#/, '') ?? '/tekrar'); return; }
  const tanim = await egzersizYukle(hedef.egzersiz);
  if (!kursSayfasinda()) return;
  if (!tanim) { toastGoster('Bu ders açılamadı. Sayfayı yenileyip yeniden dene.', { tur: 'hata' }); return; }
  const okumaModu = OKUMA_MODU[ders.ayar?.mod] ?? ders.ayar?.mod;
  await metinHazirla(ders, tanim.egzersiz);
  if (!kursSayfasinda()) return;
  const sonraki = gun.dersler.slice(i + 1).some((x) => x.durum === 'bekliyor');
  await egzersizAc(tanim, {
    kurs: {
      gun: gun.gun, sira, toplam: gun.dersler.length, baslik: tipEtiketi(ders), yonerge: yonergeMetni(ders, gun),
      ayar: { ...ders.ayar, okumaModu }, sonDers: !sonraki,
    },
    kapaninca: (bilgi) => dersKapandi(gun.gun, sira, bilgi ?? {}, akis),
  });
}

async function dersKapandi(gunNo, sira, { turBitti, devam }, akis) {
  if (!turBitti) { await sayfaCiz(); return; }
  const s = await dersiIsaretle(gunNo, sira, 'tamam');
  if (!s.tamam) { toastGoster(s.hata, { tur: 'hata' }); await sayfaCiz(); return; }
  const gun = bugunkuGun(s.plan);
  if (!gun) { await sayfaCiz(); return; }
  // Bekleyen ders kalmadıysa gün kendiliğinden biter
  if (!gun.dersler.some((x) => x.durum === 'bekliyor')) { await gunuBitirVeGoster(); return; }
  await sayfaCiz();
  if (devam && akis && kursSayfasinda()) araGoster(gun, sira);
}

// Dersler arası: kısa mola (öneri, zorunlu değil), süre dolunca sıradaki ders kendiliğinden açılır
function araGoster(gun, sira) {
  const i = gun.dersler.findIndex((x) => x.sira === sira);
  const sonraki = gun.dersler.slice(i + 1).find((x) => x.durum === 'bekliyor') ?? gun.dersler.find((x) => x.durum === 'bekliyor');
  if (!sonraki) return;
  const mola = molaRehberiAcikMi();
  let kalan = mola ? MOLA_SN : GECIS_SN;
  const no = gun.dersler.indexOf(sonraki) + 1;
  const sure = el('p', { sinif: 'kurs-ara__sure', role: 'timer', 'aria-live': 'off', metin: String(kalan) });
  const basla = dugme('Hemen başla', 'btn--gunes btn--buyuk btn--blok', () => dersAc(sonraki.sira));
  const baslik = el('h2', { id: 'kurs-ara-baslik', metin: 'Ders tamam!' });
  const dialog = el('dialog', { sinif: 'modal kurs-ara', 'aria-labelledby': 'kurs-ara-baslik' },
    el('div', { sinif: 'modal__ic' }, el('div', { sinif: 'modal__govde yigin', style: '--yigin-bosluk: var(--b-4)' },
      baslik,
      el('p', {}, 'Sıradaki: ', el('strong', { metin: `Ders ${no}/${gun.dersler.length} · ${tipEtiketi(sonraki)}` }), ` (${dersBasligi(sonraki)}, yaklaşık ${sonraki.dk} dk)`),
      mola
        ? el('ul', { sinif: 'kurs-ara__liste' },
          el('li', { metin: 'Ekrandan uzaklaş, pencereden ya da odanın en uzak köşesine bak.' }),
          el('li', { metin: 'Omuzlarını birkaç kez geriye çevir, derin bir nefes al.' }))
        : el('p', { metin: 'Sıradaki ders hazırlanıyor.' }),
      el('div', { sinif: 'kurs-ara__sayac' }, sure, el('span', { metin: mola ? 'saniye mola' : 'saniye sonra başlıyor' })),
      basla,
      dugme('Sonra devam ederim', 'btn--hayalet btn--blok', () => araKapat()))));
  dialog.addEventListener('close', () => { if (ara?.dialog === dialog) araKapat(); });
  kapEl.append(dialog);
  modalAc(dialog);
  basla.focus();
  duyur(mola ? `Ders tamam. ${MOLA_SN} saniyelik kısa mola. Süre dolunca sıradaki ders açılır.` : 'Ders tamam. Sıradaki ders birazdan açılır.');
  ara = { dialog, zaman: setInterval(() => {
    kalan -= 1;
    sure.textContent = String(Math.max(0, kalan));
    if (kalan <= 0) dersAc(sonraki.sira);
  }, 1000) };
}

async function gunuBitirVeGoster() {
  const s = await gunuBitir();
  if (!s.tamam) { toastGoster(s.hata, { tur: 'hata' }); await sayfaCiz(); return; }
  if (!s.tamamlandi) {
    const m = (NEDEN_METNI[s.neden] ?? 'Gün şu an bitirilemedi.').replace('{enAz}', kurallar?.kurs.gunTamamEnAzDers ?? 3);
    toastGoster(m, { tur: 'uyari', sure: 6000 });
    await sayfaCiz();
    return;
  }
  if (s.plan.durum.bitti) {
    toastGoster('Tebrikler, 21 günü tamamladın! Raporun hazır.', { tur: 'basari', sure: 6000 });
    git('/kurs/rapor');
    return;
  }
  toastGoster(`Gün ${s.plan.durum.gun - 1} tamamlandı. Yarın görüşmek üzere!`, { tur: 'basari' });
  await sayfaCiz({ odak: 'kurs-karar-baslik' });
}

// ---------- Bölümler ----------
function baslangicEkrani() {
  const v = testVerisi();
  const test = v.final ? null : v.baslangic; // kapanmış dönem yeni kursu beslemez
  const S = kurallar.sureProfilleri;
  const secenekler = S.secenekler.map((dk) => el('label', { sinif: 'secim' },
    el('input', { type: 'radio', name: 'kurs-sure', value: String(dk), checked: dk === S.varsayilan }),
    ` Günde yaklaşık ${dk} dakika`));
  const sureGrubu = el('fieldset', { sinif: 'grup' }, el('legend', { metin: 'Günlük süre' }), ...secenekler);
  const testsizNot = (...satirlar) => el('div', { sinif: 'bildirim bildirim--uyari yigin', style: '--yigin-bosluk: var(--b-2)' },
    ...satirlar.map((m) => el('p', { metin: m })),
    el('p', { metin: 'Testsiz de başlayabilirsin: ilk gün kendi hızında okursun, hedefini bu okumaya göre ayarlarız.' }),
    el('a', { sinif: 'btn btn--ikincil btn--kucuk', href: '#/testler', metin: 'Seviye testine git' }));
  let testNotu;
  if (v.final) testNotu = testsizNot('Önceki seviye testi dönemin tamamlanmış. Bu kursun sonunda karşılaştırma yapabilmek için Testler sayfasında “Yeni dönem başlat”a basıp başlangıç testini yapman önerilir.');
  else if (test?.okuma?.hizliGecis) testNotu = testsizNot('Seviye testinde metin çok hızlı geçildiği için oradaki okuma hızı kursta kullanılmaz; başlangıç hedefi sınıf düzeyinden alınır.');
  else if (test?.okuma) testNotu = el('p', { sinif: 'bildirim bildirim--basari', metin: `Başlangıç hızın seviye testinden alınır: ${sayiBicimle(test.okuma.wpm)} kelime/dk.` });
  else testNotu = el('div', { sinif: 'bildirim bildirim--uyari yigin', style: '--yigin-bosluk: var(--b-2)' },
      el('p', { metin: 'Seviye testini henüz yapmadın. Önce testi yapman önerilir (yaklaşık 10 dakika); kursun sonunda başlangıçla karşılaştırırsın.' }),
      el('p', { metin: 'Testsiz de başlayabilirsin: ilk gün kendi hızında okursun, hedefini bu okumaya göre ayarlarız.' }),
      el('a', { sinif: 'btn btn--ikincil btn--kucuk', href: '#/testler', metin: 'Seviye testine git' }));
  const baslat = dugme('Kursu başlat', 'btn--gunes btn--buyuk', async () => {
    baslat.disabled = true;
    const profilDk = Number(sureGrubu.querySelector('input:checked')?.value) || S.varsayilan;
    const s = await kursBaslat({ profilDk });
    if (!s.tamam) { baslat.disabled = false; toastGoster(s.hata, { tur: 'hata' }); return; }
    toastGoster('Kurs başladı. İlk gün hazır!', { tur: 'basari' });
    await sayfaCiz({ odak: 'kurs-bugun-baslik' });
  });
  return [
    sayfaUst('Akıllı Kurs', `${kurallar.kurs.gunSayisi} gün, her gün ${kurallar.kurs.gundeDers} kısa ders`, 'kurs-baslik'),
    bolum('kurs-nasil-baslik', 'Nasıl çalışır?',
      el('ul', { sinif: 'kurs-kurallar' }, kurallarAciklamasi(kurallar).map((m) => el('li', { metin: m })))),
    bolum('kurs-basla-baslik', 'Başlamadan önce', testNotu, sureGrubu, el('div', { sinif: 'kurs-eylemler' }, baslat)),
  ];
}

function yenidenBaslatEkrani(plan) {
  const sec = (secim) => async () => {
    const s = await yenidenBaslatSec(secim);
    if (!s.tamam) { toastGoster(s.hata, { tur: 'hata' }); return; }
    toastGoster(secim === 'bastan' ? 'Yeni kurs başladı.' : 'Kaldığın yerden devam ediyorsun.', { tur: 'basari' });
    await sayfaCiz({ odak: 'kurs-bugun-baslik' });
  };
  return bolum('kurs-donus-baslik', 'Tekrar hoş geldin!',
    el('p', { metin: kararAciklamasi({ kod: 'yeniden-baslat' }, kurallar) }),
    el('ul', { sinif: 'kurs-secenekler' },
      el('li', {}, dugme(`Kaldığım yerden (Gün ${plan.durum.gun})`, 'btn--birincil btn--blok', sec('kaldigim-yerden')),
        el('p', { metin: 'İlk gün kendi hızında okursun; hedefin bu okumaya göre yeniden ayarlanır.' })),
      el('li', {}, dugme('Baştan başla', 'btn--ikincil btn--blok', sec('bastan')),
        el('p', { metin: 'Yeni bir 21 gün başlar; eski kursun özeti saklanır.' }))));
}

function ozetBolumu(plan, oz) {
  const dolgu = el('span', { sinif: 'ilerleme__dolgu', style: `--deger: ${oz.ilerlemeYuzde}%` });
  return el('section', { sinif: 'kurs-kart kurs-ozet', 'aria-label': 'Kurs özeti' },
    el('div', {},
      el('div', { sinif: 'ilerleme-etiket' }, el('span', { id: 'kurs-ilerleme-etiket', metin: 'Kurs ilerlemesi' }), el('span', { metin: `%${oz.ilerlemeYuzde}` })),
      el('div', { sinif: 'ilerleme', role: 'progressbar', 'aria-labelledby': 'kurs-ilerleme-etiket', 'aria-valuemin': '0', 'aria-valuemax': String(oz.toplamGun),
        'aria-valuenow': String(oz.tamamlanan), 'aria-valuetext': `${oz.toplamGun} günden ${oz.tamamlanan} gün tamamlandı` }, dolgu)),
    el('ul', { sinif: 'mini-istatistik', 'aria-label': 'Kurs sayıları' },
      el('li', {}, el('strong', { metin: `${oz.tamamlanan}/${oz.toplamGun}` }), el('span', { metin: 'Tamamlanan gün' })),
      el('li', {}, el('strong', { metin: `${sayiBicimle(oz.hedefWpm)} k/dk` }), el('span', { metin: 'Bugünkü hız hedefi' })),
      el('li', {}, el('strong', { metin: `${plan.profilDk} dk` }), el('span', { metin: 'Günlük süre' }))));
}

// Plan değişikliği bildirimi: son karar (son 2 gün içindeyse)
function kararBolumu(plan) {
  const k = plan.durum.sonKarar;
  if (!k?.kod || k.kod === 'yeniden-baslat' || !k.tarih || gunFarki(k.tarih, gunAnahtari()) > 1) return null;
  const yon = k.yeni < k.onceki ? 'dustu' : k.yeni > k.onceki ? 'yukseldi' : 'ayni';
  const baslik = { dustu: 'Hedefin biraz düştü', yukseldi: 'Hedefin biraz yükseldi', ayni: 'Hedefin aynı kaldı' }[yon];
  const araMetni = k.kacirilan ? `${k.kacirilan} gün ara verdin. ` : '';
  return el('section', { sinif: 'kurs-karar', 'data-yon': yon, 'aria-labelledby': 'kurs-karar-baslik' },
    el('h2', { id: 'kurs-karar-baslik', metin: `Plan notu: ${baslik}` }),
    el('p', { metin: araMetni + kararAciklamasi(k, kurallar) }));
}

const DURUM_METNI = Object.freeze({ tamam: 'tamamlandı', bugun: 'bugün', yarin: 'yarın açılır', kilitli: 'henüz kilitli' });
const TUR_METNI = Object.freeze({ olcum: 'ölçüm günü', pekistirme: 'pekiştirme günü' });
const TUR_ISARET = Object.freeze({ olcum: '◆', pekistirme: '↻' });

function gunHaritasi(plan, oz) {
  const d = plan.durum;
  const ogeler = plan.gunler.map((g) => {
    const durum = g.tamamlandi ? 'tamam' : !d.bitti && g.gun === d.gun ? (oz.bugunTamam ? 'yarin' : 'bugun') : 'kilitli';
    const ek = g.sonuc ? `, ${g.sonuc.wpm} kelime/dk, anlama %${g.sonuc.anlamaYuzde}` : '';
    return el('li', { 'data-durum': durum, 'data-tur': g.tur, 'aria-current': durum === 'bugun' ? 'step' : null, title: g.sonuc ? `${g.sonuc.wpm} k/dk · %${g.sonuc.anlamaYuzde}` : null },
      el('span', { sinif: 'kurs-harita__no', 'aria-hidden': 'true', metin: durum === 'tamam' ? '✓' : String(g.gun) }),
      TUR_ISARET[g.tur] && el('span', { sinif: 'kurs-harita__isaret', 'aria-hidden': 'true', metin: TUR_ISARET[g.tur] }),
      el('span', { sinif: 'ekran-okuyucu', metin: `Gün ${g.gun}: ${DURUM_METNI[durum]}${TUR_METNI[g.tur] ? `, ${TUR_METNI[g.tur]}` : ''}${g.yorgun ? ', kısa plan' : ''}${ek}` }));
  });
  return bolum('kurs-harita-baslik', 'Gün haritası',
    el('ol', { sinif: 'kurs-harita', 'aria-label': `${plan.gunler.length} günlük yol` }, ogeler),
    el('ul', { sinif: 'kurs-harita__lejant', 'aria-hidden': 'true' },
      el('li', {}, el('span', { sinif: 'kurs-harita__ornek', 'data-durum': 'tamam', metin: '✓' }), 'Tamam'),
      el('li', {}, el('span', { sinif: 'kurs-harita__ornek', 'data-durum': 'bugun', metin: '•' }), 'Bugün'),
      el('li', {}, el('span', { sinif: 'kurs-harita__ornek', 'data-durum': 'kilitli', metin: '•' }), 'Kilitli'),
      el('li', {}, `${TUR_ISARET.olcum} Ölçüm`), el('li', {}, `${TUR_ISARET.pekistirme} Pekiştirme`)));
}

function gunNotu(gun) {
  if (gun.yorgun) return 'Kısa plan: 3 ders, kısa süreler. Hedef bugün değişmez; dinlenmek de çalışmanın parçası.';
  if (gun.kalibrasyon) return 'Bugün kendi hızında okuyacaksın; hız hedefin bu okumaya göre ayarlanacak.';
  if (gun.tur === 'olcum') {
    const son = gun.gun === kurallar.olcum.finalTestiGunu ? ' Bugünü bitirince final testini yapıp başlangıçla karşılaştırabilirsin.' : '';
    return `Ölçüm günü: anlama okumasını kendi hızında yaparsın. Sonuca göre hedefin yukarı ya da aşağı ayarlanabilir.${son}`;
  }
  if (gun.tur === 'pekistirme') return 'Pekiştirme günü: bildiğin bir metni yeniden okur, öğrendiklerini tekrar edersin. Hedef bugün değişmez.';
  return '';
}

function dersSatiri(ders, i, gun, kilitli) {
  const durumMetni = { tamam: 'tamamlandı', atlandi: 'atlandı', bekliyor: 'sırada' }[ders.durum];
  const eylemler = [];
  if (!kilitli) {
    const etiket = `Ders ${i + 1}, ${tipEtiketi(ders)}`;
    if (ders.durum === 'bekliyor') {
      eylemler.push(dugme('Başla', 'btn--birincil btn--kucuk', () => dersAc(ders.sira), { 'aria-label': `Başla: ${etiket}` }));
      if (!zorunluMu(ders)) {
        eylemler.push(dugme('Atla', 'btn--hayalet btn--kucuk', async () => {
          const s = await dersiIsaretle(gun.gun, ders.sira, 'atlandi');
          if (!s.tamam) { toastGoster(s.hata, { tur: 'hata' }); return; }
          const g = bugunkuGun(s.plan);
          if (g && !g.dersler.some((x) => x.durum === 'bekliyor') && bitirilebilir(g)) { await gunuBitirVeGoster(); return; }
          await sayfaCiz();
        }, { 'aria-label': `Atla: ${etiket}` }));
      }
    } else {
      eylemler.push(dugme(ders.durum === 'tamam' ? 'Yeniden yap' : 'Yine de yap', 'btn--hayalet btn--kucuk', () => dersAc(ders.sira, { akis: false }), { 'aria-label': `${ders.durum === 'tamam' ? 'Yeniden yap' : 'Yine de yap'}: ${etiket}` }));
    }
  }
  return el('li', { 'data-durum': ders.durum },
    el('span', { sinif: 'kurs-ders__no', 'aria-hidden': 'true', metin: ders.durum === 'tamam' ? '✓' : ders.durum === 'atlandi' ? '–' : String(i + 1) }),
    el('div', { sinif: 'kurs-ders__govde' },
      el('p', { sinif: 'kurs-ders__ust' },
        el('strong', { metin: tipEtiketi(ders) }),
        el('span', { sinif: 'kurs-ders__sure', metin: `${ders.dk} dk` }),
        el('span', { sinif: 'ekran-okuyucu', metin: `, ${durumMetni}` })),
      el('p', { sinif: 'kurs-ders__ad', metin: `${dersBasligi(ders)}${zorunluMu(ders) ? ' · günün ölçüsü' : ''}` }),
      el('p', { sinif: 'kurs-ders__yonerge', metin: yonergeMetni(ders, gun) }),
      eylemler.length ? el('div', { sinif: 'kurs-ders__eylemler' }, eylemler) : null));
}

function bugunBolumu(plan, oz) {
  const gun = bugunkuGun(plan);
  if (!gun) return null;
  const kilitli = oz.bugunTamam;
  const tamam = tamamSayisi(gun);
  const ilk = gun.dersler.find((x) => x.durum === 'bekliyor');
  const rozet = gun.yorgun ? 'Kısa plan' : gun.kalibrasyon ? 'Kendi hızın' : gun.tur === 'olcum' ? 'Ölçüm günü' : gun.tur === 'pekistirme' ? 'Pekiştirme günü' : null;
  const not = gunNotu(gun);
  const eylemler = [];
  if (!kilitli) {
    if (ilk) eylemler.push(dugme(tamam ? 'Sıradaki derse devam et' : 'Bugünkü derslere başla', 'btn--gunes btn--buyuk', () => dersAc(ilk.sira)));
    if (ilk && bitirilebilir(gun)) eylemler.push(dugme('Günü şimdi bitir', 'btn--ikincil', () => gunuBitirVeGoster()));
    const hicYapilmadi = !gun.dersler.some((x) => x.durum === 'tamam');
    if (hicYapilmadi && !gun.yorgun) eylemler.push(dugme('Bugün yorgunum (kısa plan)', 'btn--hayalet', () => yorgunDegistir(true)));
    if (hicYapilmadi && gun.yorgun) eylemler.push(dugme('Normal plana dön', 'btn--hayalet', () => yorgunDegistir(false)));
  }
  return el('section', { sinif: 'kurs-kart kurs-gun', 'aria-labelledby': 'kurs-bugun-baslik' },
    el('div', { sinif: 'kurs-gun__ust' },
      el('h2', { id: 'kurs-bugun-baslik', metin: kilitli ? `Yarın: Gün ${gun.gun}` : `Bugün: Gün ${gun.gun}` }),
      rozet && el('span', { sinif: 'rozet rozet--birincil', metin: rozet })),
    kilitli
      ? el('p', { sinif: 'bildirim bildirim--basari', metin: `Bugünkü kurs günün tamam. Gün ${gun.gun} yarın açılır; bugün dinlenebilir ya da serbest çalışabilirsin.` })
      : el('p', { sinif: 'soluk', metin: `${gun.dersler.length} dersten ${tamam} tamamlandı. Günü bitirmek için en az ${enAzDers(gun)} ders ve anlama okuması gerekir.` }),
    not && el('p', { sinif: 'kurs-gun__not', metin: not }),
    el('ol', { sinif: 'kurs-dersler', 'aria-label': 'Bugünün dersleri' }, gun.dersler.map((x, i) => dersSatiri(x, i, gun, kilitli))),
    eylemler.length ? el('div', { sinif: 'kurs-eylemler' }, eylemler) : null);
}

async function yorgunDegistir(acik) {
  const s = await yorgunModu(acik);
  if (!s.tamam) { toastGoster(s.hata, { tur: 'hata' }); return; }
  toastGoster(acik ? 'Bugün kısa plan: 3 ders. Hedef değişmez.' : 'Normal plana döndün.', { tur: 'basari' });
  await sayfaCiz({ odak: 'kurs-bugun-baslik' });
}

function bittiBolumu(plan) {
  const { t, f, eski } = kursTestleri(plan);
  let testNotu;
  if (f) testNotu = el('p', { metin: 'Final testini yaptın; karşılaştırma raporunda.' });
  else if (eski) testNotu = el('p', { metin: ESKI_DONEM_METNI });
  else if (t.asama === 'hazir') testNotu = el('a', { sinif: 'btn btn--ikincil', href: '#/testler', metin: 'Final testini yap' });
  else if (t.asama === 'bekliyor') testNotu = el('p', { metin: `Final testi ${t.kalan} gün sonra açılır.` });
  return bolum('kurs-bitti-baslik', 'Kursu tamamladın!',
    el('p', { metin: 'Düzenli çalışman için tebrikler. Raporunda başlangıç ve son ölçümlerini görebilir, sertifikanı yazdırabilirsin.' }),
    el('div', { sinif: 'kurs-eylemler' }, el('a', { sinif: 'btn btn--gunes btn--buyuk', href: '#/kurs/rapor', metin: 'Raporu gör' }), testNotu));
}

function ekBolum(plan) {
  const yeni = dugme('Yeni kurs başlat', 'btn--hayalet btn--kucuk tehlike-metin', async () => {
    const mesaj = plan.durum.bitti
      ? 'Yeni bir 21 günlük kurs başlatılsın mı? Bu kursun özeti saklanır.'
      : 'Şimdiki kurs bırakılıp yeni bir 21 gün başlatılsın mı? Bu kursun özeti saklanır, ama kaldığın gün sıfırlanır.';
    if (!confirm(mesaj)) return;
    const s = await kursBaslat({ profilDk: plan.profilDk });
    if (!s.tamam) { toastGoster(s.hata, { tur: 'hata' }); return; }
    await sayfaCiz({ odak: 'kurs-bugun-baslik' });
  });
  return el('details', { sinif: 'kurs-detay' },
    el('summary', { metin: `Kurs nasıl çalışır? (${kurallar.yontemAdi})` }),
    el('ul', { sinif: 'kurs-kurallar' }, kurallarAciklamasi(kurallar).map((m) => el('li', { metin: m }))),
    plan.gecmis?.length ? el('p', { sinif: 'soluk', metin: `Önceki kurs sayısı: ${plan.gecmis.length}` }) : null,
    el('div', { sinif: 'kurs-eylemler' }, yeni));
}

// ---------- Sayfa ----------
async function sayfaCiz({ odak } = {}) {
  const kap = kapEl;
  if (!kap) return;
  const no = ++cizimNo;
  const profil = etkinProfil();
  if (!profil) { kap.replaceChildren(sayfaUst('Akıllı Kurs', 'Kursa başlamak için önce bir profil oluştur.', 'kurs-baslik')); return; }
  let s = await kursAc();
  if (no !== cizimNo) return;
  if (!s.tamam) { kap.replaceChildren(sayfaUst('Akıllı Kurs', null, 'kurs-baslik'), el('p', { sinif: 'bildirim bildirim--hata', role: 'alert', metin: s.hata })); return; }
  kurallar = s.kurallar;
  let plan = s.plan;
  if (s.karar) duyur(kararAciklamasi(s.karar, kurallar));

  // Pekiştirme dersi Tekrar Kartları’nda yapıldıysa dönüşte kendiliğinden işaretlenir
  const g = plan && !plan.durum.yenidenBaslatmaOnerisi ? bugunkuGun(plan) : null;
  const tekrarDersi = g?.dersler.find((x) => x.arac && x.durum === 'bekliyor');
  if (tekrarDersi && !kursOzeti(plan, gunAnahtari(), kurallar).bugunTamam) {
    let yapilan = 0;
    try { yapilan = bugununTekrari().yapilan; } catch { /* srs okunamadı */ }
    if (yapilan > 0) {
      const r = await dersiIsaretle(g.gun, tekrarDersi.sira, 'tamam');
      if (no !== cizimNo) return;
      if (r.tamam) { plan = r.plan; toastGoster('Tekrar kartları dersi tamamlandı.', { tur: 'basari' }); }
    }
  }

  let parcalar;
  if (!plan) parcalar = baslangicEkrani();
  else if (plan.durum.yenidenBaslatmaOnerisi) parcalar = [sayfaUst('Akıllı Kurs', kurallar.yontemAdi, 'kurs-baslik'), yenidenBaslatEkrani(plan)];
  else {
    const oz = kursOzeti(plan, gunAnahtari(), kurallar);
    parcalar = [
      sayfaUst('Akıllı Kurs', `${kurallar.yontemAdi} · ${oz.bitti ? 'Tamamlandı' : `Gün ${oz.gun} / ${oz.toplamGun}`}`, 'kurs-baslik'),
      ozetBolumu(plan, oz),
      kararBolumu(plan),
      oz.bitti ? bittiBolumu(plan) : bugunBolumu(plan, oz),
      gunHaritasi(plan, oz),
      ekBolum(plan),
    ];
  }
  kap.replaceChildren(...parcalar.filter(Boolean));
  if (odak) odakla(kap.querySelector(`#${odak}`) ?? kap.querySelector('h1'));
}

/** #/kurs sayfasını çizer */
export function kursSayfasiCiz(kap) {
  if (!kap) return;
  kapEl = kap;
  araKapat();
  return sayfaCiz();
}

/** Sayfadan çıkınca: açık ders ve mola kapanır (ders kaydedilmeden), bekleyen çizimler geçersiz olur */
export function kursSayfasiniKapat() {
  cizimNo++;
  araKapat();
  egzersiziKapat();
}

// ---------- Rapor (#/kurs/rapor) ----------
/** Bu kursa ait testler: final yalnız kurs başladıktan sonra yapıldıysa sayılır; daha eskiyse dönem kurstan önce kapanmıştır (eski) */
function kursTestleri(plan) {
  const t = testDurumu();
  const { baslangic: b, final } = t.veri;
  const fGun = final ? final.gun ?? gunAnahtari(final.tarih) : null;
  const f = final && fGun >= plan.baslangic ? final : null;
  return { t, b, f, eski: !!final && !f };
}
const ESKI_DONEM_METNI = 'Seviye testi dönemin bu kurstan önce kapanmış, bu yüzden final karşılaştırması yok. Bir sonraki karşılaştırma için Testler sayfasında “Yeni dönem başlat”a basıp başlangıç testini yap.';

function olcumTablosu(plan) {
  const sonuclu = plan.gunler.filter((g) => g.tamamlandi && g.sonuc);
  const secili = [];
  if (sonuclu[0]) secili.push({ g: sonuclu[0], ad: `İlk ölçüm (Gün ${sonuclu[0].gun})` });
  for (const g of sonuclu) if (g.tur === 'olcum' && g !== sonuclu[0]) secili.push({ g, ad: `Ölçüm günü ${g.gun}` });
  if (!secili.length) return el('p', { sinif: 'soluk', metin: 'Bu kursta anlama sonucu kaydedilen gün yok; sayılar için anlama okumasını Oku ve Anla ile yapman gerekir.' });
  return el('div', { sinif: 'test-tablo-kap' }, el('table', { sinif: 'test-tablo' },
    el('caption', { metin: 'Kurs içi okuma ölçümleri' }),
    el('thead', {}, el('tr', {}, ...['Gün', 'Okuma hızı', 'Anlama', 'Etkin okuma hızı'].map((m) => el('th', { scope: 'col', metin: m })))),
    el('tbody', {}, secili.map(({ g, ad }) => el('tr', {},
      el('th', { scope: 'row', metin: ad }),
      el('td', {}, el('strong', { metin: sayiBicimle(g.sonuc.wpm) }), el('small', { metin: 'kelime/dk' })),
      el('td', {}, el('strong', { metin: yuzdeBicimle(g.sonuc.anlamaYuzde) })),
      el('td', {}, el('strong', { metin: sayiBicimle(g.sonuc.eoh) }), el('small', { metin: 'kelime/dk' })))))));
}

function testKarsilastirmasi(plan) {
  const { t, b, f, eski } = kursTestleri(plan);
  if (!b) return el('p', { sinif: 'soluk', metin: 'Seviye testi yapılmadığı için radar karşılaştırması yok. Bir sonraki kursa testle başlarsan burada görünür.' });
  const seriler = [{ etiket: `Başlangıç (${tarihMetni(b.tarih)})`, degerler: b.puanlar }];
  if (f) seriler.push({ etiket: `Final (${tarihMetni(f.tarih)})`, degerler: f.puanlar });
  const radar = radarOlustur({ eksenler: EKSENLER, seriler, baslik: f ? 'Profil radarı: başlangıç ve final' : 'Profil radarı: başlangıç', aciklama: f ? 'Kesik çizgi başlangıç, dolu alan final.' : '' });
  const k = karsilastir(b, f);
  const hucre = (s, ad, p) => el('td', {}, el('strong', { metin: p ?? '—' }), el('small', { metin: hamMetin(s, ad) }));
  const farkMetni = (x) => (x.fark === null ? '—' : x.fark > 0 ? `+${x.fark}` : String(x.fark));
  const tablo = el('div', { sinif: 'test-tablo-kap' }, el('table', { sinif: 'test-tablo' },
    el('caption', { metin: f ? 'Seviye testi: başlangıç ve final (100 üzerinden)' : 'Seviye testi: başlangıç (100 üzerinden)' }),
    el('thead', {}, el('tr', {}, el('th', { scope: 'col', metin: 'Alan' }), el('th', { scope: 'col', metin: 'Başlangıç' }),
      f && el('th', { scope: 'col', metin: 'Final' }), f && el('th', { scope: 'col', metin: 'Değişim' }))),
    el('tbody', {}, k.map((x) => el('tr', {}, el('th', { scope: 'row', metin: x.eksen.etiket }), hucre(b, x.eksen.ad, x.once),
      f && hucre(f, x.eksen.ad, x.sonra), f && el('td', {}, el('span', { sinif: 'test-fark', 'data-yon': x.yon ?? '', metin: farkMetni(x) })))))));
  const not = !f && el('div', { sinif: 'bildirim yazdirma-yok' },
    el('p', { metin: eski ? ESKI_DONEM_METNI : t.asama === 'hazir' ? 'Final testin hazır. Yaparsan karşılaştırma burada görünür.' : `Final testi ${t.kalan ?? 0} gün sonra açılır; yapınca karşılaştırma burada görünür.` }),
    !eski && t.asama === 'hazir' && el('a', { sinif: 'btn btn--ikincil btn--kucuk', href: '#/testler', metin: 'Final testine git' }));
  return el('div', { sinif: 'kurs-rapor__test' }, el('div', { sinif: 'test-sonuc__duzen' }, radar, tablo), not);
}

function sertifika(plan) {
  const profil = etkinProfil();
  const sonuclu = plan.gunler.filter((g) => g.sonuc);
  const ilk = sonuclu[0]?.sonuc;
  const son = sonuclu.at(-1)?.sonuc;
  const tamamlanan = plan.gunler.filter((g) => g.tamamlandi).length;
  return el('section', { sinif: 'kurs-sertifika', 'aria-labelledby': 'kurs-sertifika-baslik' },
    el('img', { src: 'icons/fener.svg', alt: '', width: '88', height: '88' }),
    el('p', { sinif: 'kurs-sertifika__ust', metin: 'Odak Akademi' }),
    el('h2', { id: 'kurs-sertifika-baslik', metin: 'Başarı Belgesi' }),
    el('p', { sinif: 'kurs-sertifika__ad', metin: profil?.takmaAd ?? '' }),
    el('p', { metin: `${plan.gunler.length} günlük Akıllı Kurs’u tamamladı (${tamamlanan}/${plan.gunler.length} gün).` }),
    ilk && son && sonuclu.length > 1 ? el('p', { metin: `Etkin okuma hızı: ilk ölçümde ${sayiBicimle(ilk.eoh)}, son ölçümde ${sayiBicimle(son.eoh)} kelime/dk.` }) : null,
    el('p', { sinif: 'kurs-sertifika__mesaj', metin: 'Düzenli ve sabırlı çalıştığın için tebrikler. Bir sonraki hedef: anlamayı koruyarak okumaya devam etmek.' }),
    el('p', { sinif: 'kurs-sertifika__tarih', metin: `${tarihMetni(`${plan.baslangic}T12:00:00`)} – ${plan.sonAktif ? tarihMetni(`${plan.sonAktif}T12:00:00`) : ''}` }));
}

function yazdir(yalnizSertifika) {
  const kok = document.documentElement;
  if (yalnizSertifika) kok.classList.add('yazdir-sertifika');
  window.addEventListener('afterprint', () => kok.classList.remove('yazdir-sertifika'), { once: true });
  window.print();
}

/** #/kurs/rapor sayfasını çizer */
export async function kursRaporuCiz(kap) {
  if (!kap) return;
  const no = ++cizimNo;
  const geri = el('a', { sinif: 'btn btn--hayalet btn--kucuk geri-baglanti yazdirma-yok', href: '#/kurs' }, spriteIkon('ok-sag', 'ikon ikon--kucuk ikon--ters'), 'Kursa dön');
  const plan = kursVerisi();
  const k = await kurallariYukle();
  if (no !== cizimNo) return;
  if (!plan || !k.tamam || !plan.durum.bitti) {
    const metin = !plan ? 'Henüz bir kurs başlatmadın.' : !k.tamam ? k.hata : `Rapor kurs bitince açılır. Şu an Gün ${plan.durum.gun} / ${plan.gunler.length}.`;
    kap.replaceChildren(geri, sayfaUst('Kurs raporu', metin, 'kurs-rapor-baslik'));
    return;
  }
  kurallar = k.kurallar;
  const tamamlanan = plan.gunler.filter((g) => g.tamamlandi);
  const dersSayisi = tamamlanan.reduce((t, g) => t + g.dersler.filter((x) => x.durum === 'tamam').length, 0);
  const d = plan.durum;
  kap.replaceChildren(el('div', { sinif: 'kurs-rapor yigin', style: '--yigin-bosluk: var(--b-5)' },
    geri,
    sayfaUst('Kurs raporu', `${tarihMetni(`${plan.baslangic}T12:00:00`)} – ${tarihMetni(`${plan.sonAktif}T12:00:00`)} · yalnızca kendi sonuçların karşılaştırılır`, 'kurs-rapor-baslik'),
    el('ul', { sinif: 'mini-istatistik', 'aria-label': 'Kurs sayıları' },
      el('li', {}, el('strong', { metin: `${tamamlanan.length}/${plan.gunler.length}` }), el('span', { metin: 'Tamamlanan gün' })),
      el('li', {}, el('strong', { metin: sayiBicimle(dersSayisi) }), el('span', { metin: 'Tamamlanan ders' })),
      el('li', {}, el('strong', { metin: `${sayiBicimle(d.baslangicWpm)} → ${sayiBicimle(d.hedefWpm)}` }), el('span', { metin: 'Hız hedefi (k/dk)' }))),
    bolum('kurs-rapor-okuma', 'Okuma ölçümleri', olcumTablosu(plan),
      el('p', { sinif: 'soluk', metin: 'Etkin okuma hızı = okuma hızı × anlama oranı. Tek bir ölçüm günden güne değişebilir; genel yöne bak.' })),
    bolum('kurs-rapor-test', 'Başlangıç ve final', testKarsilastirmasi(plan)),
    el('div', { sinif: 'kurs-eylemler yazdirma-yok' },
      dugme('Raporu yazdır', 'btn--birincil', () => yazdir(false)),
      dugme('Yalnız sertifikayı yazdır', 'btn--ikincil', () => yazdir(true))),
    sertifika(plan)));
}
