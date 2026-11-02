// Hafıza Teknikleri Akademisi (S15): #/teknikler ders listesi ve #/teknikler/<ad> ders sayfası; içerik data/lessons/*.json, oynatma js/engine/lesson-engine.js
import { el, spriteIkon, toastGoster } from '../../core/ui.js';
import { etkinProfil } from '../../core/store.js';
import { git, etkinRota } from '../../core/router.js';
import { aracBilgisi } from '../katalog.js';
import { DERS_MODUL, dersYukle, dersleriYukle, dersEkraniKur, dersGecmisi } from '../../engine/lesson-engine.js';

let oturum = null; // açık ders (sayaçları sayfadan çıkınca durur)
let cizimNo = 0;   // eski bir yükleme bitince yeni sayfanın üstüne çizmesin

export function tekniklerSayfasiniKapat() {
  oturum?.kapat();
  oturum = null;
  cizimNo++;
}

const geriBaglanti = (href, metin) => el('a', { sinif: 'btn btn--hayalet btn--kucuk geri-baglanti', href },
  spriteIkon('ok-sag', 'ikon ikon--kucuk ikon--ters'), metin);
const yukleniyor = () => el('p', { sinif: 'soluk', role: 'status', metin: 'Yükleniyor…' });

function dersKarti(ders, no) {
  const son = dersGecmisi(ders.ad).at(-1);
  const durum = son
    ? `Son deneme: önce ${son.ekstra?.once ?? 0}, sonra ${son.dogru ?? 0} / ${son.ekstra?.toplam ?? '?'}`
    : 'Henüz denemedin';
  return el('li', {}, el('a', { sinif: 'kart kart--modul ders-karti', href: `#/teknikler/${ders.ad}`, 'data-modul': DERS_MODUL },
    el('span', { sinif: 'kart__ikon ders-karti__no', 'aria-hidden': 'true', metin: String(no) }),
    el('span', { sinif: 'kart__baslik' }, el('span', { sinif: 'ekran-okuyucu', metin: `${no}. ders: ` }), ders.baslik),
    el('span', { sinif: 'kart__aciklama', metin: ders.kisaAciklama }),
    el('span', { sinif: 'ders-karti__durum', metin: durum }),
    el('span', { sinif: 'kart__alt ders-karti__alt' },
      el('span', { sinif: 'rozet rozet--vurgu', metin: `${ders.sureDk} dk` }),
      el('span', { sinif: `rozet ${son ? 'rozet--basari' : 'rozet--bilgi'}`, metin: son ? 'Yapıldı' : 'Yeni' }))));
}

/** #/teknikler: altı dersin listesi */
export async function tekniklerSayfasiCiz(kap) {
  tekniklerSayfasiniKapat();
  if (!kap) return;
  const no = cizimNo;
  const bilgi = aracBilgisi('teknikler');
  const ust = [
    geriBaglanti('#/modul/hafiza', 'Hafıza'),
    el('div', { sinif: 'sayfa-ust', 'data-modul': DERS_MODUL },
      el('span', { sinif: 'kart__ikon', 'aria-hidden': 'true' }, spriteIkon(bilgi.ikon, 'ikon')),
      el('div', {}, el('h1', { metin: bilgi.baslik }),
        el('p', { sinif: 'soluk', metin: 'Altı kısa ders: önce kendi yolunla dene, tekniği öğren, uygula ve öncesiyle sonrasını karşılaştır.' }))),
  ];
  if (!etkinProfil()) {
    kap.replaceChildren(...ust, el('p', { sinif: 'bos-durum', metin: 'Derslere başlamak için önce bir profil oluştur.' }));
    return;
  }
  kap.replaceChildren(...ust, yukleniyor());
  const dersler = (await dersleriYukle()).filter((d) => d.ders);
  if (no !== cizimNo) return;
  kap.replaceChildren(...ust,
    el('p', { metin: 'Her ders yaklaşık 6-8 dakika sürer. Teknikler herkese aynı ölçüde uymaz; hangisinin sana yaradığını ölçerek görürsün.' }),
    el('section', { 'aria-labelledby': 'ders-liste-baslik' },
      el('div', { sinif: 'bolum-baslik' }, el('h2', { id: 'ders-liste-baslik', metin: 'Dersler' })),
      dersler.length
        ? el('ol', { sinif: 'izgara modul-izgara ders-listesi', 'aria-labelledby': 'ders-liste-baslik' }, dersler.map((d, i) => dersKarti(d.ders, i + 1)))
        : el('p', { sinif: 'bos-durum', metin: 'Dersler şu an açılamadı. Sayfayı yenileyip yeniden dene.' })));
}

/** #/teknikler/<ad>: tek ders */
export async function dersSayfasiCiz(kap, ad) {
  tekniklerSayfasiniKapat();
  if (!kap) return;
  const no = cizimNo;
  if (!etkinProfil()) {
    kap.replaceChildren(geriBaglanti('#/teknikler', 'Tüm dersler'),
      el('p', { sinif: 'bos-durum', metin: 'Derse başlamak için önce bir profil oluştur.' }));
    return;
  }
  kap.replaceChildren(yukleniyor());
  let ders = null;
  try { ders = await dersYukle(ad); } catch (h) { console.error('[teknikler]', h); }
  if (no !== cizimNo || etkinRota()?.parametreler.ad !== ad) return;
  if (!ders) {
    toastGoster('Bu ders açılamadı. Listeden yeniden seç.', { tur: 'hata' });
    git('/teknikler', { degistir: true });
    return;
  }
  document.title = `${ders.baslik} | Odak Akademi`;
  oturum = dersEkraniKur(kap, ders, { geriAdres: '#/teknikler', geriEtiket: 'Tüm dersler' });
}
