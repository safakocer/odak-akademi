// Egzersiz çerçevesi (S29: sonuç sesi kutlama türüne göre: rozet, seviye, rekor, hedef ya da bitti; S28: çocuk görünümünde sonuçta Fener ve kutlama ekranı; S20: sonuçta XP, yeni rozet ve “bugünlük yeter”; D06: kayitYok egzersiz seviye de yazmaz; S19: kurs dersi bandı, ctx.kurs, ekstra.kurs, “Sonraki derse geç”): açıklama → geri sayım → çalışma → sonuç yaşam döngüsü; başlık ikonu, duraklat/çık, tam ekran, seviye (S09: otomatik seviye), hazırlık ayarları, metrics kaydı, mola önerisi (S10: Ayarlar'dan kapatılabilir; mola egzersizi sayacı sıfırlar)
import { odakTuzagi, odakla, duyur, molaRehberiAcikMi } from '../core/a11y.js';
import { kayitEkle, sonSeviye, sonSeviyeKaydet } from '../core/metrics.js';
import { el, spriteIkon } from '../core/ui.js';
import { sesCal } from '../core/sound.js';
import { sureBicimle, sureMetni, dakikaMetni, yuzdeBicimle, sinirla, sayi } from '../core/utils.js';
import { kutla, cocukKutla, kutlamaSec } from './celebrate.js';
import { cocukGorunumuMu } from '../core/hesap.js';
import { fenerCiz } from './fener.js';
import { dinle, OLAYLAR } from '../core/store.js';
import { kazanimAl, bugunlukMesaji } from './motivasyon.js';

const UYGULAMA_ADI = 'Odak Akademi';
const VARSAYILAN_SEVIYELER = Object.freeze([{ ad: 'Kolay' }, { ad: 'Orta' }, { ad: 'Zor' }]);
const ILERLEME_ESIGI = 80;                // % isabet: bir üst seviye önerilir (otomatik seviyede: yükselir)
const GERILEME_ESIGI = 50;                // S09: otomatik seviyede bu isabetin altında bir alt seviyeye iner
const MOLA_SURESI_SN = 60;
const MOLA_SIFIRLAMA_MS = 10 * 60 * 1000; // bu kadar ara verildiyse aralıksız süre sıfırlanır
// Başlık ikonu: tanim.ikon yoksa modülün ana sayfadaki ikonu (index.html sprite'ı)
const MODUL_IKON = Object.freeze({
  kurs: 'harita', oku: 'kitap', goz: 'goz', dikkat: 'hedef', hafiza: 'ampul', testler: 'test', kutuphane: 'kitaplar', rehber: 'pusula',
});

let molaEsigiSn = 12 * 60; // aralıksız bu kadar çalışınca mola önerilir
let molasizSn = 0;
let sonBitis = 0;
let cssSozu = null;
let acik = null; // aynı anda tek egzersiz açık olur
// Aralıksız çalışma süresi öğrenciye aittir: profil değişince sıfırlanır
dinle(OLAYLAR.PROFIL_DEGISTI, () => { molasizSn = 0; sonBitis = 0; });

/** Mola önerisi eşiğini değiştirir (deneme için). Güncel eşiği döndürür. */
export function molaEsiginiAyarla(sn) {
  const s = sayi(sn);
  if (s !== undefined && s >= 0) molaEsigiSn = s;
  return molaEsigiSn;
}

/**
 * Hazırlık ekranı için seçenek grubu (radyo listesi; stil: exercise.css .okuma-ayar__*).
 * secenekler: [{ deger, etiket, aciklama? }] → <fieldset>; seçim değişince degisince(deger)
 */
export function hazirlikSecimi({ ad, baslik, secenekler, secili, degisince }) {
  return el('fieldset', {}, el('legend', { metin: baslik }),
    el('div', { sinif: 'okuma-ayar__liste' }, secenekler.map((s) => el('label', { sinif: 'okuma-ayar__secenek' },
      el('input', { type: 'radio', name: ad, value: String(s.deger), checked: s.deger === secili, onchange: () => degisince?.(s.deger) }),
      el('span', {}, el('strong', { metin: s.etiket }), s.aciklama && ` (${s.aciklama})`)))));
}

/** Açık egzersizi kaydetmeden kapatır (sayfa değişince yönlendirici çağırır). */
export function egzersiziKapat() { acik?.kapat({ bildir: false }); }
export function egzersizAcikMi() { return !!acik; }

// ---------- Küçük yardımcılar ----------
// Çizgi ikonu: sprite'taki semboller görünsün diye çizgi ayarları dış svg'ye verilir (içerideki semboller miras alır)
function cizgiIkon(ad, kalinlik = '2.5') {
  const ikon = spriteIkon(ad);
  for (const [k, v] of Object.entries({ viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': kalinlik,
    'stroke-linecap': 'round', 'stroke-linejoin': 'round' })) ikon.setAttribute(k, v);
  return ikon;
}

// Üst çubuk düğmesi: sprite ikonu (duraklat | devam | tam-ekran | kapat) + dar ekranda gizlenen yazı
function ustDugme(metin, ikonAd, fn) {
  return el('button', { type: 'button', sinif: 'btn btn--hayalet egz__ust-dugme', onclick: fn },
    cizgiIkon(ikonAd), el('span', { sinif: 'egz__etiket', metin }));
}

// Duraklatılabilir zamanlayıcı: duraklayınca kalan süreler saklanır, devam edince kaldığı yerden sürer
function zamanlayiciOlustur() {
  const isler = new Set();
  let durdu = false;
  let bitti = false;
  const kur = (is) => { is.basla = performance.now(); is.id = setTimeout(() => calistir(is), is.kalan); };
  function calistir(is) {
    if (is.aralik) { is.kalan = is.aralik; kur(is); } else isler.delete(is);
    is.fn();
  }
  function ekle(fn, ms, aralik) {
    if (bitti) return () => {};
    const is = { fn, kalan: Math.max(0, ms), aralik };
    isler.add(is);
    if (!durdu) kur(is);
    return () => { clearTimeout(is.id); isler.delete(is); };
  }
  return {
    sonra: (fn, ms) => ekle(fn, ms, 0),
    her: (fn, ms) => ekle(fn, ms, Math.max(16, ms)),
    durdur() {
      if (durdu) return;
      durdu = true;
      const t = performance.now();
      isler.forEach((is) => { clearTimeout(is.id); is.kalan = Math.max(0, is.kalan - (t - is.basla)); });
    },
    surdur() { if (!durdu || bitti) return; durdu = false; isler.forEach(kur); },
    temizle() { bitti = true; isler.forEach((is) => clearTimeout(is.id)); isler.clear(); },
  };
}

// Çerçeve stili ilk açılışta bir kez yüklenir (index.html'e dokunmadan)
function cssYukle() {
  cssSozu ??= new Promise((coz) => {
    if (document.querySelector('link[data-egzersiz-css]')) { coz(); return; }
    const link = el('link', { rel: 'stylesheet', href: new URL('../../css/exercise.css', import.meta.url).href, 'data-egzersiz-css': true });
    link.onload = link.onerror = () => coz();
    document.head.append(link);
  });
  return cssSozu;
}

// Egzersize özel stil (tanim.stil) bir kez eklenir
function stilEkle(tanim) {
  if (!tanim.stil || document.querySelector(`style[data-egz-stil="${tanim.egzersiz}"]`)) return;
  document.head.append(el('style', { 'data-egz-stil': tanim.egzersiz }, tanim.stil));
}

function tanimDenetle(t) {
  if (!t || typeof t.baslat !== 'function') throw new TypeError('Egzersiz tanımında baslat(ctx) fonksiyonu yok.');
  for (const alan of ['modul', 'egzersiz', 'ad']) {
    if (typeof t[alan] !== 'string' || !t[alan]) throw new TypeError(`Egzersiz tanımında "${alan}" eksik.`);
  }
  if (!/^[a-z0-9-]+$/.test(t.egzersiz)) throw new TypeError('"egzersiz" küçük harf, rakam ve tireden oluşmalı.');
  if (!Array.isArray(t.nasil) || t.nasil.length !== 3) console.warn('[egzersiz] "nasil" 3 adım olmalı:', t.egzersiz);
}

function tamEkranDestegi() { return !!(document.fullscreenEnabled || document.webkitFullscreenEnabled); }
function tamEkranOgesi() { return document.fullscreenElement || document.webkitFullscreenElement || null; }

// S20: kaydın kazanımı (XP, seviye, yeni rozet) ve günlük süre mesajı; kurs dersinde yalnız uzun çalışma uyarısı
function kazanimBolumu(k, kurs) {
  if (!k) return null;
  const mesaj = bugunlukMesaji(k.bugun, { kurs: !!kurs });
  return el('div', { sinif: 'egz-kazanim' },
    el('p', { sinif: 'egz-kazanim__xp' },
      el('span', { sinif: 'rozet rozet--birincil', metin: `+${k.xp} XP` }),
      el('span', { metin: k.seviyeAtladi
        ? `Yeni seviye: ${k.seviye.seviye} (${k.seviye.unvan}).`
        : `Seviye ${k.seviye.seviye}; bir sonrakine ${k.seviye.kalan} XP.` })),
    k.xpSinirDoldu && el('p', { sinif: 'egz-kazanim__not', metin: 'Bugünlük XP sınırına ulaştın; XP yarın yeniden başlar.' }),
    k.yeniRozetler.length > 0 && el('p', {}, el('strong', { metin: k.yeniRozetler.length > 1 ? 'Yeni rozetler: ' : 'Yeni rozet: ' }),
      k.yeniRozetler.map((r) => r.ad).join(', '), '. İlerleme sayfasında görebilirsin.'),
    mesaj && el('div', { sinif: `bildirim bildirim--${mesaj.tur}` }, el('p', {}, el('strong', { metin: `${mesaj.baslik}. ` }), mesaj.metin)));
}

// S28: çocuk görünümünde sonuç ekranındaki Fener ifadesi (yalnız görsel; metinler ve duyurular aynı)
function sonucIfadesi(tanim, deg, yeniRekor, kazanim) {
  if (tanim.molaMi) return 'mola';
  if (yeniRekor || deg.ilerle || kazanim?.seviyeAtladi || kazanim?.hedefYeni || kazanim?.yeniRozetler?.length) return 'sevinc';
  if (!tanim.sayacYok && deg.dogru + deg.yanlis === 0) return 'dusunme';
  return 'cesaret';
}
// Fener ve çevresinde bir kez açılan küçük yıldızlar (ekran okuyucuya gizli; hareketi azaltta yıldız çizilmez, Fener durur)
function sonucSahnesi(ifade) {
  const yildizli = ifade === 'sevinc' || ifade === 'cesaret';
  return el('div', { sinif: 'egz-sonuc__fener', 'aria-hidden': 'true' },
    fenerCiz(ifade),
    yildizli && Array.from({ length: 6 }, (_, i) => el('span', { sinif: `egz-sonuc__yildiz egz-sonuc__yildiz--${i + 1}` })));
}

function geriBildirim({ dogru, yanlis, isabet, ilerle }, enUst) {
  if (dogru + yanlis === 0) return 'Bu turda hiç yanıt olmadı. Hazır olduğunda yeniden dene.';
  if (ilerle) {
    return enUst
      ? 'İsabetin çok iyi. En üst seviyedesin; şimdiki hedefin kendi rekorunu geçmek.'
      : 'İsabetin çok iyi. Hazır hissediyorsan bir üst seviyeyi dene.';
  }
  return `İsabetin henüz %${ILERLEME_ESIGI}’in altında. Acele etmeden doğru hedeflere odaklan; hız arkasından gelir.`;
}

// S09: otomatik seviyeli egzersizde sonuç mesajı (seviye adı: bir sonraki turun seviyesi)
function seviyeMesaji({ dogru, yanlis }, yeni, eski, enUst, ad) {
  if (dogru + yanlis === 0) return 'Bu turda hiç yanıt olmadı. Hazır olduğunda yeniden dene.';
  if (yeni > eski) return `Çok iyi gidiyorsun. Bir sonraki tur ${ad} seviyede.`;
  if (yeni < eski) return `Bir sonraki tur ${ad} seviyede; önce rahatça doğru görmeye odaklan. Hazır olunca seviye yine yükselir.`;
  return enUst
    ? 'En üst seviyedesin; şimdiki hedefin kendi rekorunu geçmek.'
    : 'Bu seviyede biraz daha çalış; sonuçların iyileşince seviye kendiliğinden yükselir.';
}

/**
 * Egzersizi tam ekran katmanda açar.
 * tanim: { modul, egzersiz, ad, nasil:[3 adım], baslat(ctx), sureSn?, seviyeler?, kisaAciklama?, etiketler?,
 *          puanEtiketi?, puanAciklama?, alanEtiketi?, stil?, degerlendir?(ham) → { puan?, satirlar?, mesaj?, ek? (Node), wpm?, anlamaYuzde?, eoh?, ... },
 *          hazirlik?({seviye}) → açıklama ekranına eklenecek ayar düğümü, hazirlikDenetle?() → hata metni | {mesaj, odak},
 *          sayacYok? (doğru/yanlış/isabet gösterilmez; satırlar yalnızca degerlendir'den), kayitYok? (sonuç kaydedilmez), kayitYokMetni?,
 *          ikon? (başlıktaki sprite ikonu; yoksa modülün ikonu),
 *          otomatikSeviye? (S09: isabet ≥%80 → bir üst, <%50 → bir alt seviye; degerlendir'in sonrakiSeviye'si bunu ezer),
 *          molaMi? (S10: mola egzersizi; bitince aralıksız çalışma sayacı sıfırlanır, mola önerisi çıkmaz) }
 * Rekor alanını metrics.js seçer: eoh > puan > dogru.
 * secenekler: { zorluk?, kapaninca?({ turBitti, devam }), kurs? }  → Döner: { kapat() }
 * S19 kurs: { gun, sira, toplam, baslik, yonerge, ayar, sonDers } → açıklamada bant, hazirlik({ seviye, kurs }), ctx.kurs,
 * kayıtta ekstra.kurs { gun, sira }; sonuçta “Sonraki derse geç” (kapaninca({ turBitti: true, devam: true }))
 */
export async function egzersizAc(tanim, { zorluk, kapaninca, kurs } = {}) {
  tanimDenetle(tanim);
  acik?.kapat({ bildir: false });
  await cssYukle();
  stilEkle(tanim);

  const seviyeler = tanim.seviyeler?.length ? tanim.seviyeler : VARSAYILAN_SEVIYELER;
  const etiket = { dogru: 'Doğru', yanlis: 'Yanlış', ...tanim.etiketler };
  const puanEtiketi = tanim.puanEtiketi ?? 'Puan';
  // S19: pekiştirme dersinde zorluk bir alt seviyeden başlar (kayıtlı seviye seçimi değişmez)
  const zorlukFarki = sayi(kurs?.ayar?.zorlukFarki) ?? 0;
  let seviye = sinirla(Math.round(sayi(zorluk) ?? (sonSeviye(tanim.egzersiz) ?? 1) + zorlukFarki), 1, seviyeler.length);
  let turBitti = false; // S19: en az bir tur sonuç ekranına ulaştı mı (kurs dersi tamam sayılır)
  let durum = '';          // aciklama | gerisayim | calisma | sonuc | mola
  let duraklatildi = false;
  let zaman = null;        // tur başına zamanlayıcı
  let temizlikler = [];
  let sayac = { dogru: 0, yanlis: 0 };
  let ekstra = {};
  const saat = { birikmis: 0, son: null };

  // ---------- İskelet ----------
  const duraklatDugme = ustDugme('Duraklat', 'duraklat', () => (duraklatildi ? devamEt() : duraklat()));
  const tamEkranDugme = ustDugme('Tam ekran', 'tam-ekran', tamEkranDegistir);
  const cikDugme = ustDugme('Çık', 'kapat', cikIstegi);
  tamEkranDugme.setAttribute('aria-pressed', 'false');
  tamEkranDugme.hidden = !tamEkranDestegi();

  const sureDeger = el('span');
  const sureEl = el('span', { sinif: 'egz__sure', role: 'timer', 'aria-live': 'off' },
    el('span', { sinif: 'ekran-okuyucu', metin: tanim.sureSn ? 'Kalan süre: ' : 'Geçen süre: ' }), sureDeger);
  const puanEl = el('span', { sinif: 'egz__puan', hidden: !!tanim.sayacYok });
  const dolgu = el('span', { sinif: 'ilerleme__dolgu' });
  const gosterge = el('div', { sinif: 'egz__gosterge', hidden: true }, sureEl,
    el('div', { sinif: 'ilerleme ilerleme--ince', 'aria-hidden': 'true', hidden: !tanim.sureSn }, dolgu), puanEl);

  const govde = el('div', { sinif: 'egz__govde' });
  const panelDevam = el('button', { type: 'button', sinif: 'btn btn--birincil btn--blok', metin: 'Devam et', onclick: () => devamEt() });
  const panelCik = el('button', { type: 'button', sinif: 'btn btn--ikincil btn--blok', metin: 'Çık', onclick: () => kapat() });
  // Hazırlık ayarı olan egzersizde (ör. okuma modu seçimi) tur bırakılıp açıklama ekranına dönülebilir
  const panelAyar = tanim.hazirlik && el('button', { type: 'button', sinif: 'btn btn--hayalet btn--blok', metin: 'Ayarları değiştir', onclick: () => aciklamaGoster() });
  const panel = el('div', { sinif: 'egz-panel', hidden: true },
    el('div', { sinif: 'egz-panel__ic', role: 'group', 'aria-labelledby': 'egz-panel-baslik' },
      el('h3', { id: 'egz-panel-baslik', metin: 'Duraklatıldı' }),
      el('p', { metin: 'Süre durdu. Çıkarsan bu tur kaydedilmez.' }),
      panelDevam, panelAyar, panelCik));

  const kok = el('div', { sinif: 'egz', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'egz-baslik', 'data-modul': tanim.modul },
    el('header', { sinif: 'egz__ust' },
      el('span', { sinif: 'egz__ikon', 'aria-hidden': 'true' }, cizgiIkon(tanim.ikon ?? MODUL_IKON[tanim.modul] ?? 'hedef', '2')),
      el('h2', { id: 'egz-baslik', sinif: 'egz__baslik', metin: tanim.ad }),
      el('div', { sinif: 'egz__eylemler' }, duraklatDugme, tamEkranDugme, cikDugme)),
    gosterge,
    el('div', { sinif: 'egz__icerik' }, govde, panel));

  // Sayfanın geri kalanı erişilemez olur (canlı duyuru alanları hariç)
  const kardesler = [...document.body.children]
    .filter((o) => !o.inert && !o.matches('script, [aria-live], [role="status"], [role="alert"]'));
  document.body.append(kok);
  kardesler.forEach((o) => { o.inert = true; });
  document.documentElement.classList.add('egz-acik');
  const tuzakKaldir = odakTuzagi(kok, { esc: escBasildi });
  const gorunurluk = () => { if (document.hidden) duraklat(); };
  const tamEkranOlayi = () => tamEkranDugme.setAttribute('aria-pressed', String(tamEkrandaMi()));
  document.addEventListener('visibilitychange', gorunurluk);
  document.addEventListener('fullscreenchange', tamEkranOlayi);
  document.addEventListener('webkitfullscreenchange', tamEkranOlayi);
  document.title = `${tanim.ad} | ${UYGULAMA_ADI}`;

  const denetim = { kapat };
  acik = denetim;
  aciklamaGoster();
  return denetim;

  // ---------- Durum ve saat ----------
  function durumAyarla(yeni) {
    durum = yeni;
    kok.dataset.durum = yeni;
    const tur = yeni === 'gerisayim' || yeni === 'calisma';
    duraklatDugme.hidden = !tur;
    gosterge.hidden = yeni !== 'calisma';
    if (!tur) { duraklatildi = false; panel.hidden = true; govde.inert = false; duraklatDugmesiniGuncelle(); }
  }

  function ekranGoster(dugum, odak) {
    govde.replaceChildren(dugum);
    govde.scrollTop = 0;
    if (odak) odakla(odak);
  }

  function turuTemizle() {
    zaman?.temizle();
    zaman = null;
    const liste = temizlikler;
    temizlikler = [];
    liste.forEach((fn) => { try { fn(); } catch (h) { console.error('[egzersiz] temizlik hatası:', h); } });
  }

  function saatBaslat() { if (saat.son == null) saat.son = performance.now(); }
  function saatDurdur() { if (saat.son != null) { saat.birikmis += performance.now() - saat.son; saat.son = null; } }
  function gecenMs() { return saat.birikmis + (saat.son != null ? performance.now() - saat.son : 0); }

  function gostergeGuncelle() {
    const gecen = gecenMs() / 1000;
    if (tanim.sureSn) {
      sureDeger.textContent = sureBicimle(Math.ceil(Math.max(0, tanim.sureSn - gecen)));
      dolgu.style.setProperty('--deger', `${Math.min(100, (gecen / tanim.sureSn) * 100)}%`);
    } else {
      sureDeger.textContent = sureBicimle(gecen);
    }
    puanEl.textContent = `${etiket.dogru}: ${sayac.dogru}`;
  }

  // ---------- 1) Açıklama: nasıl oynanır + seviye ----------
  function aciklamaGoster() {
    turuTemizle();
    durumAyarla('aciklama');
    const baslik = el('h3', { metin: 'Nasıl oynanır?' });
    let hazirlikDugumu = null;
    try { hazirlikDugumu = tanim.hazirlik?.({ seviye, kurs: kurs ? { ...kurs } : null }) ?? null; } catch (h) { console.error('[egzersiz] hazırlık hatası:', h); }
    const hataEl = el('p', { sinif: 'egz-aciklama__hata', role: 'alert', hidden: true });
    const kursBandi = kurs && el('div', { sinif: 'egz-kurs-bandi', role: 'note' },
      el('strong', { metin: `Kurs · Gün ${kurs.gun} · Ders ${kurs.sira}/${kurs.toplam}${kurs.baslik ? ` · ${kurs.baslik}` : ''}` }),
      kurs.yonerge && el('p', { metin: kurs.yonerge }));
    const form = el('form', { sinif: 'egz-ekran egz-aciklama' },
      kursBandi,
      tanim.kisaAciklama && el('p', { sinif: 'egz-aciklama__giris', metin: tanim.kisaAciklama }),
      baslik,
      el('ol', { sinif: 'egz-adimlar' }, (tanim.nasil ?? []).map((a) => el('li', { metin: a }))),
      el('fieldset', { sinif: 'grup', hidden: seviyeler.length < 2 },
        el('legend', { metin: 'Seviye' }),
        el('div', { sinif: 'segment' }, seviyeler.map((s, i) => el('label', {},
          el('input', { type: 'radio', name: 'seviye', value: String(i + 1), checked: i + 1 === seviye }),
          el('span', { metin: s.ad }))))),
      hazirlikDugumu,
      hataEl,
      el('p', { sinif: 'egz-aciklama__not', metin: tanim.sureSn
        ? `Süre: ${sureMetni(tanim.sureSn)}. İstediğin an duraklatabilirsin.`
        : tanim.sureNotu ?? 'Süre sınırı yok. İstediğin an duraklatabilirsin.' }),
      el('button', { type: 'submit', sinif: 'btn btn--birincil btn--buyuk btn--blok', metin: 'Başla' }));
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      let sorun;
      try { sorun = tanim.hazirlikDenetle?.(); } catch (h) { console.error('[egzersiz] hazırlık denetimi hatası:', h); }
      if (sorun) {
        hataEl.textContent = typeof sorun === 'string' ? sorun : sorun.mesaj;
        hataEl.hidden = false;
        if (sorun.odak) odakla(sorun.odak);
        return;
      }
      hataEl.hidden = true;
      seviye = sinirla(Number(form.elements.seviye?.value) || 1, 1, seviyeler.length);
      turBaslat();
    });
    ekranGoster(form, baslik);
  }

  // ---------- 2) Geri sayım ----------
  function turBaslat() {
    turuTemizle();
    zaman = zamanlayiciOlustur();
    if (!tanim.kayitYok && !zorlukFarki) sonSeviyeKaydet(tanim.egzersiz, seviye); // tur yarıda kalsa da seçim hatırlansın (D06: kaydedilmeyen egzersiz depoya yazmaz)
    sayac = { dogru: 0, yanlis: 0 };
    ekstra = {};
    saat.birikmis = 0;
    saat.son = null;
    durumAyarla('gerisayim');
    const halka = el('div', { sinif: 'egz-gerisayim__halka', 'aria-hidden': 'true' });
    const kutu = el('div', { sinif: 'egz-gerisayim', tabindex: '-1' },
      el('p', { sinif: 'egz-gerisayim__etiket', metin: seviyeler.length > 1 ? `${seviyeler[seviye - 1].ad} seviye. Hazır ol!` : 'Hazır ol!' }), halka);
    ekranGoster(kutu, kutu);
    duyur('Üç saniye içinde başlıyor.');
    let kalan = 3;
    const adim = () => {
      if (kalan === 0) { sesCal('basla'); calismaBaslat(); return; }
      halka.replaceChildren(el('span', { sinif: 'egz-gerisayim__sayi', metin: String(kalan) }));
      sesCal('bip');
      kalan -= 1;
      zaman.sonra(adim, 1000);
    };
    adim();
  }

  // ---------- 3) Çalışma: egzersiz kendi alanına çizer ----------
  function calismaBaslat() {
    durumAyarla('calisma');
    const alan = el('div', { sinif: 'egz-alan', tabindex: '0', role: 'application', 'aria-label': tanim.alanEtiketi ?? `${tanim.ad} alanı` });
    ekranGoster(alan, alan);
    saatBaslat();
    const z = zaman;
    const guvenli = (fn) => () => { try { fn(); } catch (h) { console.error('[egzersiz]', h); } };
    const ctx = {
      alan,
      zorluk: seviye,
      seviye: { ...seviyeler[seviye - 1] },
      ekstra,
      kurs: kurs ? { gun: kurs.gun, sira: kurs.sira, ayar: { ...kurs.ayar } } : undefined,
      sonra: (fn, ms) => z.sonra(guvenli(fn), ms),
      her: (fn, ms) => z.her(guvenli(fn), ms),
      aktifMi: () => z === zaman && durum === 'calisma' && !duraklatildi,
      dogru(n = 1, ses = 'dogru') { if (!ctx.aktifMi()) return; sayac.dogru += n; sesCal(ses); gostergeGuncelle(); },
      yanlis(n = 1, ses = 'yanlis') { if (!ctx.aktifMi()) return; sayac.yanlis += n; sesCal(ses); },
      sayac: () => ({ ...sayac }),
      gecenSn: () => gecenMs() / 1000,
      ses: (tur) => sesCal(tur),
      bitir: () => { if (z === zaman) turBitir(); },
      temizlenince: (fn) => { if (typeof fn === 'function') temizlikler.push(fn); },
    };
    if (tanim.sureSn) {
      z.sonra(turBitir, tanim.sureSn * 1000);
      if (tanim.sureSn > 20) z.sonra(() => duyur('Son 10 saniye.'), (tanim.sureSn - 10) * 1000);
    }
    z.her(gostergeGuncelle, 250);
    gostergeGuncelle();
    try {
      tanim.baslat(ctx);
    } catch (h) {
      console.error('[egzersiz] başlatılamadı:', h);
      hataGoster();
    }
  }

  function turBitir() {
    if (durum !== 'calisma') return;
    saatDurdur();
    const ham = { dogru: sayac.dogru, yanlis: sayac.yanlis, sureSn: Math.round(gecenMs() / 1000), zorluk: seviye, ekstra: { ...ekstra } };
    turuTemizle();
    sonucGoster(ham);
  }

  // ---------- 4) Sonuç: puan, kişisel rekor, geri bildirim, mola önerisi ----------
  function sonucGoster(ham) {
    durumAyarla('sonuc');
    const toplam = ham.dogru + ham.yanlis;
    const deg = { dogru: ham.dogru, yanlis: ham.yanlis, isabet: toplam ? Math.round((ham.dogru * 100) / toplam) : 0 };
    try { Object.assign(deg, tanim.degerlendir?.(ham)); } catch (h) { console.error('[egzersiz] değerlendirme hatası:', h); }
    deg.puan ??= deg.dogru;
    const turSeviyesi = seviye;
    const enUst = seviye >= seviyeler.length;
    const yeniSeviye = sonrakiSeviyeBul(deg); // S09: undefined = otomatik seviye yok
    deg.ilerle ??= !tanim.sayacYok && deg.dogru + deg.yanlis > 0 && deg.isabet >= ILERLEME_ESIGI;
    deg.mesaj ??= tanim.sayacYok ? ''
      : yeniSeviye !== undefined ? seviyeMesaji(deg, yeniSeviye, turSeviyesi, enUst, seviyeler[yeniSeviye - 1].ad)
        : geriBildirim(deg, enUst);

    // Kayıt ve rekor kararı metrics.js'te (aynı egzersiz, aynı seviye; eoh > puan > dogru)
    const { kayit, kaydedildi, hata, rekor } = tanim.kayitYok ? { kaydedildi: false, hata: 'kayit-yok' } : kayitEkle({
      modul: tanim.modul, egzersiz: tanim.egzersiz, sureSn: ham.sureSn, zorluk: seviye,
      dogru: deg.dogru, yanlis: deg.yanlis, puan: deg.puan, wpm: deg.wpm, anlamaYuzde: deg.anlamaYuzde, eoh: deg.eoh,
      ekstra: { ...ham.ekstra, ...deg.ekstra, isabet: deg.isabet, ...(kurs ? { kurs: { gun: kurs.gun, sira: kurs.sira } } : {}) },
    });
    const kazanim = kaydedildi ? kazanimAl(kayit?.id) : null; // S20
    const puan = rekor?.deger ?? sayi(deg.eoh ?? deg.puan) ?? 0;
    const oncekiDeger = rekor?.onceki;
    // Rekor bölümü olan egzersizde (dikkat) rekor kararı degerlendir'den gelir
    const yeniRekor = tanim.rekorBolumuVar ? kaydedildi && !!deg.yeniRekor : !!rekor?.yeni;
    let rekorMetni;
    if (hata === 'kayit-yok') rekorMetni = tanim.kayitYokMetni ?? 'Bu tur kaydedilmez.';
    else if (hata === 'profil') rekorMetni = 'Bir profil açık olmadığı için bu sonuç kaydedilmedi.';
    else if (hata === 'kota') rekorMetni = 'Cihazdaki kayıt alanı dolu olduğu için bu sonuç kaydedilemedi. Ayarlar’dan yedek indirip yer açabilirsin.';
    else if (!kaydedildi) rekorMetni = 'Bu sonuç kaydedilemedi. Sayfayı yenileyip yeniden dene.';
    else if (tanim.rekorBolumuVar) rekorMetni = ''; // karşılaştırma egzersizin sonuç bölümünde
    else if (oncekiDeger === undefined) rekorMetni = 'Bu seviyedeki ilk sonucun kaydedildi. Bundan sonra kendi sonuçlarınla karşılaştıracağız.';
    else if (yeniRekor) rekorMetni = `Önceki en iyi sonucun ${oncekiDeger} idi.`;
    else if (puan === oncekiDeger) rekorMetni = `Rekoruna ulaştın. Bir sonraki hedef: ${oncekiDeger + 1}.`;
    else rekorMetni = `Bu seviyedeki rekorun ${oncekiDeger}. Bir sonraki hedef: ${puan + 1}.`;

    // Mola: kısa aralarla art arda yapılan turların toplam süresi. S10: mola egzersizi sayacı sıfırlar; öneri Ayarlar'dan kapatılabilir
    if (tanim.molaMi) molasizSn = 0;
    else {
      if (sonBitis && Date.now() - ham.sureSn * 1000 - sonBitis > MOLA_SIFIRLAMA_MS) molasizSn = 0;
      molasizSn += ham.sureSn;
    }
    sonBitis = Date.now();
    const molaKarti = !tanim.molaMi && molaRehberiAcikMi() && molasizSn >= molaEsigiSn && el('div', { sinif: 'bildirim egz-mola-onerisi' },
      el('p', {}, el('strong', { metin: 'Kısa bir mola zamanı. ' }),
        `Bir süredir aralıksız çalışıyorsun (toplam ${dakikaMetni(molasizSn)}). Bir dakika ekrandan uzaklaşmak iyi gelir.`),
      el('button', { type: 'button', sinif: 'btn btn--gunes', metin: '1 dakika mola ver', onclick: molaGoster }),
      el('p', { sinif: 'egz-mola-onerisi__not', metin: 'Bu öneriyi Ayarlar’daki “Mola hatırlatıcısı” ile kapatabilirsin.' }));

    // S09: otomatik seviye: bir sonraki tur ve sonraki açılış yeni seviyeyle başlar; öğrenci aynı seviyede kalmayı seçebilir
    let seviyeNotu = null;
    if (yeniSeviye !== undefined) {
      seviye = yeniSeviye;
      if (!tanim.kayitYok && !zorlukFarki) sonSeviyeKaydet(tanim.egzersiz, seviye);
      if (seviye !== turSeviyesi) {
        seviyeNotu = el('p', { sinif: 'egz-sonuc__seviye',
          metin: `Seviye kendiliğinden ayarlandı: ${seviyeler[turSeviyesi - 1].ad} → ${seviyeler[seviye - 1].ad}.` });
      }
    }

    const baslik = el('h3', { id: 'egz-sonuc-baslik', sinif: 'egz-sonuc__baslik', metin: yeniRekor ? 'Yeni kişisel rekor!' : 'Tur bitti' });
    const satirlar = tanim.sayacYok
      ? (deg.satirlar?.length ? deg.satirlar : [['Süre', sureMetni(ham.sureSn)]]) // süre satırını egzersiz verir
      : [[etiket.dogru, deg.dogru], [etiket.yanlis, deg.yanlis], ...(deg.satirlar ?? []),
        ['İsabet', yuzdeBicimle(deg.isabet)], ['Süre', sureMetni(ham.sureSn)]];
    const otomatik = yeniSeviye !== undefined;
    const degisti = otomatik && seviye !== turSeviyesi;
    const oneriVar = !otomatik && deg.ilerle && !enUst;
    const sonraki = !otomatik && !enUst && el('button', { type: 'button', sinif: `btn ${oneriVar ? 'btn--birincil' : 'btn--ikincil'}`,
      metin: 'Sonraki seviye', onclick: () => { seviye += 1; turBaslat(); } });
    const tekrar = el('button', { type: 'button', sinif: `btn ${oneriVar ? 'btn--ikincil' : 'btn--birincil'}`,
      metin: degisti ? `Devam et (${seviyeler[seviye - 1].ad})` : 'Tekrar dene', onclick: () => turBaslat() });
    const ayniSeviye = degisti && el('button', { type: 'button', sinif: 'btn btn--ikincil', metin: 'Aynı seviyede tekrar',
      onclick: () => { seviye = turSeviyesi; turBaslat(); } });
    const bitir = el('button', { type: 'button', sinif: 'btn btn--hayalet', metin: kurs ? 'Kurs sayfasına dön' : 'Bitir', onclick: () => kapat() });
    turBitti = true;
    // S19: kurs dersinde ana eylem bir sonraki derse geçmektir
    const kursDevam = kurs && el('button', { type: 'button', sinif: 'btn btn--gunes btn--buyuk', onclick: () => kapat({ devam: true }) },
      kurs.sonDers ? 'Günü tamamla' : 'Sonraki derse geç', spriteIkon('ok-sag', 'ikon'));
    const ayarlar = tanim.hazirlik && el('button', { type: 'button', sinif: 'btn btn--ikincil', metin: 'Ayarları değiştir', onclick: () => aciklamaGoster() });

    const cocuk = cocukGorunumuMu(); // S28
    const ekran = el('section', { sinif: 'egz-ekran egz-sonuc', 'aria-labelledby': 'egz-sonuc-baslik' },
      baslik,
      el('div', { sinif: 'egz-sonuc__puan' },
        cocuk && sonucSahnesi(sonucIfadesi(tanim, deg, yeniRekor, kazanim)),
        yeniRekor && el('span', { sinif: 'rozet rozet--gunes', metin: 'Kişisel rekor' }),
        el('strong', { metin: String(puan) }),
        el('span', { metin: seviyeler.length > 1 ? `${puanEtiketi}, ${seviyeler[turSeviyesi - 1].ad} seviye` : puanEtiketi }),
        tanim.puanAciklama && el('small', { metin: tanim.puanAciklama })),
      el('ul', { sinif: 'egz-sonuc__liste' }, satirlar.map(([ad, deger]) => el('li', {}, el('span', { metin: ad }), el('strong', { metin: String(deger) })))),
      rekorMetni && el('p', { sinif: 'egz-sonuc__rekor', metin: rekorMetni }),
      deg.mesaj && el('p', { metin: deg.mesaj }),
      seviyeNotu,
      deg.ek instanceof Node ? deg.ek : null, // S06: egzersize özel sonuç bölümü (ör. katman özeti, gözden geçirme)
      kazanimBolumu(kazanim, kurs),
      molaKarti,
      kursDevam && el('div', { sinif: 'egz-sonuc__eylemler egz-sonuc__kurs' }, kursDevam),
      el('div', { sinif: 'egz-sonuc__eylemler' }, oneriVar ? [sonraki, tekrar] : [tekrar, sonraki], ayniSeviye, ayarlar, bitir));
    ekranGoster(ekran, baslik);
    // S29: ses, kutlamayla aynı öncelikle seçilir (rozet > seviye > rekor > günlük hedef, yoksa bitti); hareketi azaltta da çalar, görseli sonuç ekranında
    const kutlama = kutlamaSec({ yeniRekor, kazanim });
    sesCal(kutlama?.tur ?? 'bitti');
    if (cocuk) cocukKutla(kok, kutlama); // S28
    else if (yeniRekor) kutla(kok);
    duyur(`${puanEtiketi}: ${puan}. ${rekorMetni}`);
  }

  // S09: bir sonraki turun seviyesi (otomatik seviye yoksa undefined). Yanıt yoksa seviye değişmez
  function sonrakiSeviyeBul(deg) {
    const istenen = sayi(deg.sonrakiSeviye);
    if (istenen === undefined && !tanim.otomatikSeviye) return undefined;
    if (deg.dogru + deg.yanlis === 0) return seviye;
    const hedef = istenen ?? (deg.isabet >= ILERLEME_ESIGI ? seviye + 1 : deg.isabet < GERILEME_ESIGI ? seviye - 1 : seviye);
    return sinirla(Math.round(hedef), 1, seviyeler.length);
  }

  // ---------- Mola ekranı ----------
  function molaGoster() {
    turuTemizle();
    durumAyarla('mola');
    molasizSn = 0;
    zaman = zamanlayiciOlustur();
    let kalan = MOLA_SURESI_SN;
    const baslik = el('h3', { metin: 'Mola' });
    const sure = el('p', { sinif: 'egz-mola__sure', role: 'timer', 'aria-live': 'off', metin: sureBicimle(kalan) });
    const bitirDugme = el('button', { type: 'button', sinif: 'btn btn--birincil btn--buyuk btn--blok', metin: 'Molayı bitir', onclick: () => aciklamaGoster() });
    ekranGoster(el('section', { sinif: 'egz-ekran egz-mola' }, baslik,
      el('p', { metin: 'Bir dakika ekrandan uzaklaş:' }),
      el('ul', { sinif: 'egz-mola__liste' },
        el('li', { metin: 'Yaklaşık 20 saniye pencereden ya da odanın en uzak köşesine bak (20-20-20).' }),
        el('li', { metin: 'Ayağa kalk, omuzlarını birkaç kez geriye çevir.' }),
        el('li', { metin: 'Bir bardak su iç.' })),
      sure, bitirDugme), baslik);
    zaman.her(() => {
      kalan -= 1;
      sure.textContent = sureBicimle(Math.max(0, kalan));
      if (kalan > 0) return;
      zaman.temizle();
      sesCal('bitti');
      bitirDugme.textContent = 'Devam et';
      duyur('Mola bitti. Hazır olduğunda devam edebilirsin.');
    }, 1000);
  }

  function hataGoster() {
    turuTemizle();
    durumAyarla('sonuc');
    const baslik = el('h3', { metin: 'Egzersiz açılamadı' });
    ekranGoster(el('section', { sinif: 'egz-ekran' }, baslik,
      el('p', { metin: 'Bir sorun oldu. Çıkıp sayfayı yeniledikten sonra yeniden dene.' }),
      el('button', { type: 'button', sinif: 'btn btn--birincil', metin: 'Çık', onclick: () => kapat() })), baslik);
  }

  // ---------- Duraklat / devam / çık ----------
  function duraklat(odak = 'devam') {
    if (!['gerisayim', 'calisma'].includes(durum) || duraklatildi || !zaman) return;
    duraklatildi = true;
    zaman.durdur();
    saatDurdur();
    govde.inert = true;
    panel.hidden = false;
    duraklatDugmesiniGuncelle();
    duyur('Duraklatıldı. Süre durdu.');
    (odak === 'cik' ? panelCik : panelDevam).focus();
  }

  function devamEt() {
    if (!duraklatildi) return;
    duraklatildi = false;
    panel.hidden = true;
    govde.inert = false;
    if (durum === 'calisma') saatBaslat();
    zaman?.surdur();
    duraklatDugmesiniGuncelle();
    odakla(govde.firstElementChild);
  }

  function duraklatDugmesiniGuncelle() {
    duraklatDugme.querySelector('.egz__etiket').textContent = duraklatildi ? 'Devam et' : 'Duraklat';
    duraklatDugme.querySelector('use')?.setAttribute('href', duraklatildi ? '#devam' : '#duraklat');
  }

  // Tur sürerken "Çık" önce duraklatır ve onay ister; diğer ekranlarda hemen kapatır
  function cikIstegi() {
    if (durum === 'gerisayim' || durum === 'calisma') {
      if (duraklatildi) panelCik.focus();
      else duraklat('cik');
    } else kapat();
  }

  function escBasildi() {
    if (duraklatildi) devamEt();
    else if (durum === 'gerisayim' || durum === 'calisma') duraklat();
    else kapat();
  }

  // ---------- Tam ekran ----------
  function tamEkrandaMi() { return tamEkranOgesi() === kok; }
  function tamEkranDegistir() {
    try {
      const sonuc = tamEkrandaMi()
        ? (document.exitFullscreen || document.webkitExitFullscreen)?.call(document)
        : (kok.requestFullscreen || kok.webkitRequestFullscreen)?.call(kok);
      sonuc?.catch?.(() => {});
    } catch { /* tarayıcı izin vermedi */ }
  }

  // ---------- Kapat ----------
  function kapat({ bildir = true, devam = false } = {}) {
    if (acik !== denetim) return;
    acik = null;
    turuTemizle();
    saatDurdur();
    if (tamEkrandaMi()) tamEkranDegistir();
    document.removeEventListener('visibilitychange', gorunurluk);
    document.removeEventListener('fullscreenchange', tamEkranOlayi);
    document.removeEventListener('webkitfullscreenchange', tamEkranOlayi);
    kok.remove();
    kardesler.forEach((o) => { o.inert = false; });
    document.documentElement.classList.remove('egz-acik');
    tuzakKaldir();
    if (bildir) kapaninca?.({ turBitti, devam });
  }
}
