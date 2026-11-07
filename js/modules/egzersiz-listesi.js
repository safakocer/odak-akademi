// Egzersiz listeleri: ana sayfadaki alan kartlarına çalışma sayısı, alan sayfası (#/modul/<ad>; S12: araçlar bölümü) ve egzersizler sayfası (#/egzersizler; S31: açılır alan kartları, ?alan=<ad>); bilgiler katalog.js'ten
import { el, spriteIkon } from '../core/ui.js';
import { git } from '../core/router.js';
import { MODULLER, modulBilgisi, modulEgzersizleri, modulAraclari } from './katalog.js';

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
    const n = modulEgzersizleri(a.getAttribute('href').slice('#/modul/'.length)).length;
    const alt = a.querySelector('.kart__alt') ?? a.appendChild(el('span', { sinif: 'kart__alt' }));
    alt.replaceChildren(el('span', { sinif: `rozet ${n ? 'rozet--birincil' : 'rozet--bilgi'}`, metin: n ? `${n} çalışma` : 'Yakında' }));
  });
}

/** Alan sayfasını kaba çizer. Döner: alan bilgisi ya da (bilinmeyen alan) null */
export function modulSayfasiCiz(kap, ad) {
  const m = modulBilgisi(ad);
  if (!m || !kap) return null;
  const araclar = modulAraclari(m.ad);
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
      egzersizIzgarasi(modulEgzersizleri(m.ad), 'modul-calisma-baslik')));
  return m;
}

// S31: Egzersizler sayfası. Alan kartları düğmedir; dokununca o satırın altında liste açılır (aynı anda tek kart).
// Açık kart adreste durur (#/egzersizler?alan=<ad>): geri tuşu ve yenileme korur. Geçmişe kayıt eklenmez (replaceState).
const ALAN_SORGUSU = 'alan';
let sayfa = null;   // { kap, alanlar: Map<ad, {dugme, panel, baslik}>, acik }
let odakIste = null; // dokunuşla açılan alanın başlığına odak geçer (geri tuşuyla gelişte geçmez)

function alanSayfasiKur(kap) {
  const alanlar = new Map();
  const izgara = el('div', { sinif: 'alan-izgara' });
  MODULLER.forEach((m, i) => {
    const egzersizler = modulEgzersizleri(m.ad);
    const araclar = modulAraclari(m.ad);
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
  return { kap, alanlar, acik: null };
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
  if (sayfa?.kap !== kap || !ilk || !kap.contains(ilk.dugme)) sayfa = alanSayfasiKur(kap); // bir kez çizilir, sonra yalnız açık kart değişir
  alanAc(sorgu[ALAN_SORGUSU] ?? null);
}
