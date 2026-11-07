// Egzersiz listeleri: ana sayfadaki alan kartlarına çalışma sayısı, alan sayfası (#/modul/<ad>; S12: araçlar bölümü) ve egzersizler sayfası (#/egzersizler; S31: açılır alan kartları, ?alan=<ad>); bilgiler katalog.js'ten
// S34a: listeler etkin profilin sınıfına uygun kartları gösterir; uygun olmayan çalışmaya gelinirse #/sinif-disi/<ad> ekranı (sinifDisiSayfasiCiz)
import { el, spriteIkon } from '../core/ui.js';
import { git } from '../core/router.js';
import { etkinProfil } from '../core/store.js';
import { aktifProfil } from '../core/profile.js';
import { bosDurum } from '../engine/fener.js';
import { MODULLER, modulBilgisi, modulEgzersizleri, modulAraclari, kartBul, kartUygunMu } from './katalog.js';

// Açılışta yönlendirici profilden önce çalışır: etkin profil henüz yoksa kayıtlı etkin profil okunur
const profilSinifi = () => (etkinProfil() ?? aktifProfil())?.sinif ?? null;

/** Egzersiz ya da araç kartı (<li>). Araçta adres alanı vardır (S12) */
export function egzersizKarti(e) {
  return el('li', {}, el('a', { sinif: 'kart kart--modul', href: e.adres ?? `#/egzersiz/${e.ad}`, 'data-modul': e.modul },
    el('span', { sinif: 'kart__ikon', 'aria-hidden': 'true' }, spriteIkon(e.ikon, 'ikon')),
    el('span', { sinif: 'kart__baslik', metin: e.baslik }),
    el('span', { sinif: 'kart__aciklama', metin: e.aciklama }),
    e.etiket && el('span', { sinif: 'kart__alt' }, el('span', { sinif: 'rozet rozet--vurgu', metin: e.etiket }))));
}

// Egzersizi olmayan alanda kart yerine nazik bir "yakında" notu
function egzersizIzgarasi(liste, baslikId) {
  if (!liste.length) return el('p', { sinif: 'bos-durum', metin: 'Bu alandaki çalışmalar yakında geliyor.' });
  return el('ul', { sinif: 'izgara modul-izgara', 'aria-labelledby': baslikId }, liste.map(egzersizKarti));
}

/** Ana sayfadaki #/modul/<ad> kartlarına "N çalışma" ya da "Yakında" rozeti ekler */
export function modulKartlariniGuncelle(kok = document) {
  kok.querySelectorAll('a.kart--modul[href^="#/modul/"]').forEach((a) => {
    const n = modulEgzersizleri(a.getAttribute('href').slice('#/modul/'.length), profilSinifi()).length;
    const alt = a.querySelector('.kart__alt') ?? a.appendChild(el('span', { sinif: 'kart__alt' }));
    alt.replaceChildren(el('span', { sinif: `rozet ${n ? 'rozet--birincil' : 'rozet--bilgi'}`, metin: n ? `${n} çalışma` : 'Yakında' }));
  });
}

/** Alan sayfasını kaba çizer. Döner: alan bilgisi ya da (bilinmeyen alan) null */
export function modulSayfasiCiz(kap, ad) {
  const m = modulBilgisi(ad);
  if (!m || !kap) return null;
  const sinif = profilSinifi();
  const araclar = modulAraclari(m.ad, sinif);
  kap.replaceChildren(
    el('a', { sinif: 'btn btn--hayalet btn--kucuk geri-baglanti', href: '#/' }, spriteIkon('ok-sag', 'ikon ikon--kucuk ikon--ters'), 'Ana sayfa'),
    el('div', { sinif: 'sayfa-ust', 'data-modul': m.ad },
      el('span', { sinif: 'kart__ikon', 'aria-hidden': 'true' }, spriteIkon(m.ikon, 'ikon')),
      el('div', {}, el('h1', { metin: m.baslik }), el('p', { sinif: 'soluk', metin: m.aciklama }))),
    ...(araclar.length ? [el('section', { 'aria-labelledby': 'modul-arac-baslik' },
      el('div', { sinif: 'bolum-baslik' }, el('h2', { id: 'modul-arac-baslik', metin: 'Araçlar' })),
      el('ul', { sinif: 'izgara modul-izgara', 'aria-labelledby': 'modul-arac-baslik' }, araclar.map(egzersizKarti)))] : []),
    el('section', { 'aria-labelledby': 'modul-calisma-baslik' },
      el('div', { sinif: 'bolum-baslik' }, el('h2', { id: 'modul-calisma-baslik', metin: 'Çalışmalar' })),
      egzersizIzgarasi(modulEgzersizleri(m.ad, sinif), 'modul-calisma-baslik')));
  return m;
}

// S31: Egzersizler sayfası. Alan kartları düğmedir; dokununca o satırın altında liste açılır (aynı anda tek kart).
// Açık kart adreste durur (#/egzersizler?alan=<ad>): geri tuşu ve yenileme korur. Geçmişe kayıt eklenmez (replaceState).
const ALAN_SORGUSU = 'alan';
let sayfa = null;   // { kap, alanlar: Map<ad, {dugme, panel, baslik}>, acik, sinif (S34a: çizildiği sınıf) }
let odakIste = null; // dokunuşla açılan alanın başlığına odak geçer (geri tuşuyla gelişte geçmez)

function alanSayfasiKur(kap) {
  const sinif = profilSinifi();
  const alanlar = new Map();
  const izgara = el('div', { sinif: 'alan-izgara' });
  MODULLER.forEach((m, i) => {
    const egzersizler = modulEgzersizleri(m.ad, sinif);
    const araclar = modulAraclari(m.ad, sinif);
    const panelId = `egz-alan-${m.ad}`;
    const baslikId = `${panelId}-baslik`;
    const aracId = `${panelId}-araclar`;
    const sira = i + 1; // CSS order: panel kartın satırının altına (2 ya da 4 sütun)
    const dugme = el('button', {
      type: 'button', sinif: 'kart kart--modul alan-karti', 'data-modul': m.ad, 'data-sira': sira,
      'aria-expanded': 'false', 'aria-controls': panelId,
      onclick: () => alanDegistir(m.ad),
    },
    el('span', { sinif: 'alan-karti__ust' },
      el('span', { sinif: 'kart__ikon', 'aria-hidden': 'true' }, spriteIkon(m.ikon, 'ikon')),
      spriteIkon('ok-sag', 'ikon ikon--kucuk alan-karti__ok')),
    el('span', { sinif: 'kart__baslik', metin: m.baslik }),
    el('span', { sinif: 'kart__aciklama', metin: m.aciklama }),
    el('span', { sinif: 'kart__alt' }, el('span', {
      sinif: `rozet ${egzersizler.length ? 'rozet--birincil' : 'rozet--bilgi'}`,
      metin: egzersizler.length ? `${egzersizler.length} egzersiz` : 'Yakında',
    })));
    const baslik = el('h2', { id: baslikId, sinif: 'baslik-ikonlu', tabindex: '-1' },
      el('span', { sinif: 'kart__ikon kart__ikon--kucuk', 'aria-hidden': 'true' }, spriteIkon(m.ikon, 'ikon ikon--kucuk')),
      `${m.baslik} egzersizleri`);
    const panel = el('section', { id: panelId, sinif: 'alan-paneli', 'data-modul': m.ad, 'data-sira': sira, 'aria-labelledby': baslikId, hidden: true },
      baslik,
      egzersizIzgarasi(egzersizler, baslikId),
      araclar.length > 0 && el('h3', { id: aracId, metin: 'Araçlar' }),
      araclar.length > 0 && el('ul', { sinif: 'izgara modul-izgara', 'aria-labelledby': aracId }, araclar.map(egzersizKarti)));
    izgara.append(dugme, panel);
    alanlar.set(m.ad, { dugme, panel, baslik });
  });
  kap.replaceChildren(
    el('div', {}, el('h1', { metin: 'Egzersizler' }),
      el('p', { sinif: 'soluk', metin: 'Bir alana dokun, kısa çalışmaları gör. İstediğinden başlayabilirsin.' })),
    izgara);
  return { kap, alanlar, acik: null, sinif };
}

// Açık kartı adrese yazar; görünümü yönlendirici (goster → egzersizlerSayfasiCiz) günceller
function alanDegistir(ad) {
  const kapat = sayfa?.acik === ad;
  odakIste = kapat ? null : ad;
  git(kapat ? '/egzersizler' : `/egzersizler?${ALAN_SORGUSU}=${encodeURIComponent(ad)}`, { degistir: true });
}

function alanAc(ad) {
  const hedef = sayfa.alanlar.has(ad) ? ad : null; // bilinmeyen alan: hiçbiri açık değil
  sayfa.alanlar.forEach(({ dugme, panel }, a) => {
    const acik = a === hedef;
    dugme.setAttribute('aria-expanded', String(acik));
    panel.hidden = !acik;
  });
  sayfa.acik = hedef;
  if (hedef && odakIste === hedef) sayfa.alanlar.get(hedef).baslik.focus();
  odakIste = null;
}

/** Egzersizler sayfası (S31): alan kartları ve açılır listeler. sorgu.alan açık kartı belirler */
export function egzersizlerSayfasiCiz(kap, sorgu = {}) {
  if (!kap) return;
  const ilk = sayfa?.alanlar.values().next().value;
  // Bir kez çizilir, sonra yalnız açık kart değişir; S34a: profilin sınıfı değiştiyse yeniden çizilir
  if (sayfa?.kap !== kap || !ilk || !kap.contains(ilk.dugme) || sayfa.sinif !== profilSinifi()) sayfa = alanSayfasiKur(kap);
  alanAc(sorgu[ALAN_SORGUSU] ?? null);
}

// ---------- S34a: sınıfa uygun olmayan çalışma ----------
// Kartın açıldığı adres ve geri dönülecek yer
const kartAdresi = (kart) => kart.adres ?? `#/egzersiz/${kart.ad}`;
function geriHedefi(kart) {
  if (!kart) return { href: '#/', metin: 'Ana sayfa' };
  if (kart.modul === 'rehber') return { href: '#/rehber', metin: 'Çalışma Rehberi' };
  const m = kart.modul && modulBilgisi(kart.modul);
  return m ? { href: `#/modul/${m.ad}`, metin: m.baslik } : { href: '#/', metin: 'Ana sayfa' };
}

/**
 * Etkin profilin sınıfı kartın aralığında değilse #/sinif-disi/<ad> ekranına geçer (geçmişe kayıt eklemez). Döner: yönlendirildi mi.
 * Egzersiz, araç ve sınıfa göre kapanan sayfalar (ör. testler) açılmadan önce çağrılır.
 */
export function sinifDisiysaYonlendir(ad) {
  const kart = kartBul(ad);
  if (!kart || kartUygunMu(kart, profilSinifi())) return false;
  git(`/sinif-disi/${encodeURIComponent(ad)}`, { degistir: true });
  return true;
}

/** #/sinif-disi/<ad>: sade bilgi, geri bağlantısı ve aynı alandan sınıfa uygun birkaç çalışma. Döner: kart ya da null */
export function sinifDisiSayfasiCiz(kap, ad) {
  if (!kap) return null;
  const kart = kartBul(ad);
  const sinif = profilSinifi();
  const geri = geriHedefi(kart);
  const geriBaglanti = el('a', { sinif: 'btn btn--hayalet btn--kucuk geri-baglanti', href: geri.href },
    spriteIkon('ok-sag', 'ikon ikon--kucuk ikon--ters'), geri.metin);
  if (!kart) {
    kap.replaceChildren(geriBaglanti, el('h1', { metin: 'Bu sayfa bulunamadı' }),
      el('p', { sinif: 'soluk', metin: 'Ana sayfadan ya da Egzersizler’den bir çalışma seç.' }));
    return null;
  }
  // Profil ya da sınıf değiştiyse ve artık uygunsa: kendiliğinden açılmaz, bağlantı verilir
  if (kartUygunMu(kart, sinif)) {
    kap.replaceChildren(geriBaglanti, el('h1', { metin: kart.baslik }),
      el('p', { metin: 'Bu çalışma artık senin sınıfına açık.' }),
      el('p', {}, el('a', { sinif: 'btn btn--birincil', href: kartAdresi(kart), metin: 'Çalışmayı aç' })));
    return kart;
  }
  const [en, enCok] = kart.sinif;
  const buyuk = sinif < en;
  const oneriler = kart.modul === 'rehber' ? modulAraclari('rehber', sinif)
    : modulBilgisi(kart.modul) ? modulEgzersizleri(kart.modul, sinif) : [];
  kap.replaceChildren(
    geriBaglanti,
    el('div', {},
      el('h1', { metin: buyuk ? 'Bu çalışma daha büyük sınıflar için' : 'Bu çalışma daha küçük sınıflar için' }),
      el('p', { sinif: 'soluk', metin: buyuk ? `“${kart.baslik}” ${en}. sınıftan itibaren açılır.` : `“${kart.baslik}” ${enCok}. sınıfa kadar açıktır.` })),
    bosDurum('Senin sınıfına uygun başka çalışmalar seni bekliyor.', { ifade: 'cesaret' }),
    oneriler.length > 0 && el('section', { 'aria-labelledby': 'sinif-disi-oneri' },
      el('div', { sinif: 'bolum-baslik' }, el('h2', { id: 'sinif-disi-oneri', metin: 'Bunları deneyebilirsin' })),
      el('ul', { sinif: 'izgara modul-izgara', 'aria-labelledby': 'sinif-disi-oneri' }, oneriler.slice(0, 4).map(egzersizKarti))));
  return kart;
}
