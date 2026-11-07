// Ders sayfaları (S15 Hafıza Teknikleri, S21 Okuma Stratejileri): #/teknikler hafıza ders listesi, #/teknikler/stratejiler strateji ders listesi, #/teknikler/<ad> tek ders; içerik data/lessons/*.json, oynatma js/engine/lesson-engine.js (S34a: sınıfa uygun değilse #/sinif-disi)
import { el, spriteIkon, toastGoster } from '../../core/ui.js';
import { etkinProfil } from '../../core/store.js';
import { git, etkinRota } from '../../core/router.js';
import { aracBilgisi } from '../katalog.js';
import { sinifDisiysaYonlendir } from '../egzersiz-listesi.js';
import { SERILER, STRATEJI_LISTESI, dersSerisi, dersYukle, dersleriYukle, dersEkraniKur, dersGecmisi } from '../../engine/lesson-engine.js';

let oturum = null; // açık ders (sayaçları sayfadan çıkınca durur)
let cizimNo = 0;   // eski bir yükleme bitince yeni sayfanın üstüne çizmesin

// Liste sayfası metinleri (seri başına)
const LISTE_METINLERI = Object.freeze({
  hafiza: {
    giris: 'Altı kısa ders: önce kendi yolunla dene, tekniği öğren, uygula ve öncesiyle sonrasını karşılaştır.',
    sure: 'Her ders yaklaşık 6-8 dakika sürer. Teknikler herkese aynı ölçüde uymaz; hangisinin sana yaradığını ölçerek görürsün.',
  },
  okuma: {
    giris: 'Sekiz kısa ders: stratejiyi öğren, örnek bir metinde uygula, üç soruluk mini sınamayla kendini dene.',
    sure: 'Her ders yaklaşık 8-10 dakika sürer. Bir stratejiyi öğrendikten sonra Oku ve Anla’daki metinlerde kullanmayı dene; strateji kullandıkça kolaylaşır.',
  },
});

export function tekniklerSayfasiniKapat() {
  oturum?.kapat();
  oturum = null;
  cizimNo++;
}

const geriBaglanti = (href, metin) => el('a', { sinif: 'btn btn--hayalet btn--kucuk geri-baglanti', href },
  spriteIkon('ok-sag', 'ikon ikon--kucuk ikon--ters'), metin);
const yukleniyor = () => el('p', { sinif: 'soluk', role: 'status', metin: 'Yükleniyor…' });

function dersKarti(ders, no, seri) {
  const son = dersGecmisi(ders.ad).at(-1);
  let durum = 'Henüz denemedin';
  if (son && seri.ad === 'okuma') durum = `Son deneme: mini sınamada ${son.dogru ?? 0} / ${son.ekstra?.soru ?? 3} doğru`;
  else if (son) durum = `Son deneme: önce ${son.ekstra?.once ?? 0}, sonra ${son.dogru ?? 0} / ${son.ekstra?.toplam ?? '?'}`;
  return el('li', {}, el('a', { sinif: 'kart kart--modul ders-karti', href: `#/teknikler/${ders.ad}`, 'data-modul': seri.modul },
    el('span', { sinif: 'kart__ikon ders-karti__no', 'aria-hidden': 'true', metin: String(no) }),
    el('span', { sinif: 'kart__baslik' }, el('span', { sinif: 'ekran-okuyucu', metin: `${no}. ders: ` }), ders.baslik),
    el('span', { sinif: 'kart__aciklama', metin: ders.kisaAciklama }),
    el('span', { sinif: 'ders-karti__durum', metin: durum }),
    el('span', { sinif: 'kart__alt ders-karti__alt' },
      el('span', { sinif: 'rozet rozet--vurgu', metin: `${ders.sureDk} dk` }),
      el('span', { sinif: `rozet ${son ? 'rozet--basari' : 'rozet--bilgi'}`, metin: son ? 'Yapıldı' : 'Yeni' }))));
}

// Bir serinin ders listesi (kap: o anki sayfa kapsayıcısı)
async function listeCiz(kap, seriAd) {
  const seri = SERILER[seriAd] ?? SERILER.hafiza;
  if (sinifDisiysaYonlendir(seri.arac)) return; // S34a
  const metin = LISTE_METINLERI[seri.ad];
  const no = cizimNo;
  const bilgi = aracBilgisi(seri.arac);
  document.title = `${bilgi.baslik} | Odak Akademi`;
  const ust = [
    geriBaglanti(seri.geriAdres, seri.geriEtiket),
    el('div', { sinif: 'sayfa-ust', 'data-modul': seri.modul },
      el('span', { sinif: 'kart__ikon', 'aria-hidden': 'true' }, spriteIkon(bilgi.ikon, 'ikon')),
      el('div', {}, el('h1', { metin: bilgi.baslik }), el('p', { sinif: 'soluk', metin: metin.giris }))),
  ];
  if (!etkinProfil()) {
    kap.replaceChildren(...ust, el('p', { sinif: 'bos-durum', metin: 'Derslere başlamak için önce bir profil oluştur.' }));
    return;
  }
  kap.replaceChildren(...ust, yukleniyor());
  const dersler = (await dersleriYukle(seri.ad)).filter((d) => d.ders);
  if (no !== cizimNo) return;
  kap.replaceChildren(...ust,
    el('p', { metin: metin.sure }),
    el('section', { 'aria-labelledby': 'ders-liste-baslik' },
      el('div', { sinif: 'bolum-baslik' }, el('h2', { id: 'ders-liste-baslik', metin: 'Dersler' })),
      dersler.length
        ? el('ol', { sinif: 'izgara modul-izgara ders-listesi', 'aria-labelledby': 'ders-liste-baslik' }, dersler.map((d, i) => dersKarti(d.ders, i + 1, seri)))
        : el('p', { sinif: 'bos-durum', metin: 'Dersler şu an açılamadı. Sayfayı yenileyip yeniden dene.' })));
}

/** #/teknikler: hafıza dersleri listesi (seriAd 'okuma' ile strateji listesi) */
export async function tekniklerSayfasiCiz(kap, seriAd = 'hafiza') {
  tekniklerSayfasiniKapat();
  if (!kap) return;
  await listeCiz(kap, seriAd);
}

/** #/teknikler/<ad>: tek ders; S21: ad = "stratejiler" ise okuma stratejileri listesi */
export async function dersSayfasiCiz(kap, ad) {
  tekniklerSayfasiniKapat();
  if (!kap) return;
  if (ad === STRATEJI_LISTESI) { await listeCiz(kap, 'okuma'); return; }
  const no = cizimNo;
  const seri = dersSerisi(ad) ?? SERILER.hafiza;
  if (sinifDisiysaYonlendir(seri.arac)) return; // S34a
  if (!etkinProfil()) {
    kap.replaceChildren(geriBaglanti(seri.listeAdres, 'Tüm dersler'),
      el('p', { sinif: 'bos-durum', metin: 'Derse başlamak için önce bir profil oluştur.' }));
    return;
  }
  kap.replaceChildren(yukleniyor());
  let ders = null;
  try { ders = await dersYukle(ad); } catch (h) { console.error('[teknikler]', h); }
  if (no !== cizimNo || etkinRota()?.parametreler.ad !== ad) return;
  if (!ders) {
    toastGoster('Bu ders açılamadı. Listeden yeniden seç.', { tur: 'hata' });
    git(seri.listeAdres.slice(1), { degistir: true });
    return;
  }
  document.title = `${ders.baslik} | Odak Akademi`;
  oturum = dersEkraniKur(kap, ders, { geriAdres: seri.listeAdres, geriEtiket: 'Tüm dersler' });
}
