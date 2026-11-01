// Egzersiz listeleri: ana sayfadaki alan kartlarına çalışma sayısı, alan sayfası (#/modul/<ad>) ve tüm egzersizler sayfası (#/egzersizler); bilgiler katalog.js'ten
import { el, spriteIkon } from '../core/ui.js';
import { MODULLER, modulBilgisi, modulEgzersizleri } from './katalog.js';

function egzersizKarti(e) {
  return el('li', {}, el('a', { sinif: 'kart kart--modul', href: `#/egzersiz/${e.ad}`, 'data-modul': e.modul },
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
  kap.replaceChildren(
    el('a', { sinif: 'btn btn--hayalet btn--kucuk geri-baglanti', href: '#/' }, spriteIkon('ok-sag', 'ikon ikon--kucuk ikon--ters'), 'Ana sayfa'),
    el('div', { sinif: 'sayfa-ust', 'data-modul': m.ad },
      el('span', { sinif: 'kart__ikon', 'aria-hidden': 'true' }, spriteIkon(m.ikon, 'ikon')),
      el('div', {}, el('h1', { metin: m.baslik }), el('p', { sinif: 'soluk', metin: m.aciklama }))),
    el('section', { 'aria-labelledby': 'modul-calisma-baslik' },
      el('div', { sinif: 'bolum-baslik' }, el('h2', { id: 'modul-calisma-baslik', metin: 'Çalışmalar' })),
      egzersizIzgarasi(modulEgzersizleri(m.ad), 'modul-calisma-baslik')));
  return m;
}

/** Tüm egzersizler sayfası: alanlara göre gruplu */
export function egzersizlerSayfasiCiz(kap) {
  if (!kap) return;
  kap.replaceChildren(
    el('div', {}, el('h1', { metin: 'Egzersizler' }),
      el('p', { sinif: 'soluk', metin: 'Tüm kısa çalışmalar, alanlarına göre. İstediğinden başlayabilirsin.' })),
    ...MODULLER.map((m) => {
      const id = `egz-liste-${m.ad}`;
      return el('section', { 'aria-labelledby': id, 'data-modul': m.ad },
        el('div', { sinif: 'bolum-baslik' }, el('h2', { id, sinif: 'baslik-ikonlu' },
          el('span', { sinif: 'kart__ikon kart__ikon--kucuk', 'aria-hidden': 'true' }, spriteIkon(m.ikon, 'ikon ikon--kucuk')), m.baslik)),
        egzersizIzgarasi(modulEgzersizleri(m.ad), id));
    }));
}
