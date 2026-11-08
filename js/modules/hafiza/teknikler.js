// Ders sayfaları (S15 Hafıza Teknikleri, S21 Okuma Stratejileri): #/teknikler hafıza ders listesi, #/teknikler/stratejiler strateji ders listesi, #/teknikler/<ad> tek ders; içerik data/lessons/*.json, oynatma js/engine/lesson-engine.js (S34a: sınıfa uygun değilse #/sinif-disi; S34f: liste sınıfa uygun dersleri ve ilkokulda ilkokul sürümünü gösterir, aralık dışı ders sade bir bilgi ekranı açar)
import { el, spriteIkon, toastGoster } from '../../core/ui.js';
import { kademe } from '../../core/siniflar.js';
import { bosDurum } from '../../engine/fener.js';
import { etkinProfil } from '../../core/store.js';
import { git, etkinRota } from '../../core/router.js';
import { aracBilgisi } from '../katalog.js';
import { sinifDisiysaYonlendir } from '../egzersiz-listesi.js';
import { SERILER, STRATEJI_LISTESI, dersSerisi, dersYukle, dersleriYukle, dersEkraniKur, surumGecmisi, dersUygunMu, dersSurumu, dersAraligi } from '../../engine/lesson-engine.js';

let oturum = null; // açık ders (sayaçları sayfadan çıkınca durur)
let cizimNo = 0;   // eski bir yükleme bitince yeni sayfanın üstüne çizmesin

// Liste sayfası metinleri (seri ve kademe başına; S34f: ders sayısı listedeki derslerden, ilkokulda kısa cümleler). Kademe yoksa (profil yok) ortaokul metni
const SAYI_ADLARI = ['Hiç', 'Bir', 'İki', 'Üç', 'Dört', 'Beş', 'Altı', 'Yedi', 'Sekiz', 'Dokuz', 'On'];
const sayiAdi = (n) => SAYI_ADLARI[n] ?? String(n);
const LISTE_METINLERI = Object.freeze({
  hafiza: {
    ortaokul: {
      giris: (n) => `${sayiAdi(n)} kısa ders: önce kendi yolunla dene, tekniği öğren, uygula ve öncesiyle sonrasını karşılaştır.`,
      sure: 'Her ders yaklaşık 6-8 dakika sürer. Teknikler herkese aynı ölçüde uymaz; hangisinin sana yaradığını ölçerek görürsün.',
    },
    ilkokul: {
      giris: (n) => `${sayiAdi(n)} kısa ders: önce kendin dene, tekniği öğren, sonra yeniden dene.`,
      sure: 'Her ders yaklaşık 5-6 dakika sürer. Hangi tekniğin sana uyduğunu deneyerek görürsün.',
    },
  },
  okuma: {
    ortaokul: {
      giris: (n) => `${sayiAdi(n)} kısa ders: stratejiyi öğren, örnek bir metinde uygula, üç soruluk mini sınamayla kendini dene.`,
      sure: 'Her ders yaklaşık 8-10 dakika sürer. Bir stratejiyi öğrendikten sonra Oku ve Anla’daki metinlerde kullanmayı dene; strateji kullandıkça kolaylaşır.',
    },
    ilkokul: {
      giris: (n) => `${sayiAdi(n)} kısa ders: stratejiyi öğren, kısa bir metinde dene, üç soruyla kendini yokla.`,
      sure: 'Her ders yaklaşık 6-8 dakika sürer. Öğrendiğin stratejiyi Oku ve Anla’daki metinlerde de dene.',
    },
  },
});
const listeMetni = (seriAd, sinif) => LISTE_METINLERI[seriAd][kademe(sinif) ?? 'ortaokul'] ?? LISTE_METINLERI[seriAd].ortaokul;

export function tekniklerSayfasiniKapat() {
  oturum?.kapat();
  oturum = null;
  cizimNo++;
}

const geriBaglanti = (href, metin) => el('a', { sinif: 'btn btn--hayalet btn--kucuk geri-baglanti', href },
  spriteIkon('ok-sag', 'ikon ikon--kucuk ikon--ters'), metin);
const yukleniyor = () => el('p', { sinif: 'soluk', role: 'status', metin: 'Yükleniyor…' });

function dersKarti(ders, no, seri) {
  const son = surumGecmisi(ders).at(-1); // S34f: gösterilen sürümün (tam ya da ilkokul) son denemesi
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
  const sinif = etkinProfil()?.sinif ?? null;
  const metin = listeMetni(seri.ad, sinif);
  const no = cizimNo;
  const bilgi = aracBilgisi(seri.arac);
  document.title = `${bilgi.baslik} | Odak Akademi`;
  const aciklama = el('p', { sinif: 'soluk', metin: bilgi.aciklama });
  const ust = [
    geriBaglanti(seri.geriAdres, seri.geriEtiket),
    el('div', { sinif: 'sayfa-ust', 'data-modul': seri.modul },
      el('span', { sinif: 'kart__ikon', 'aria-hidden': 'true' }, spriteIkon(bilgi.ikon, 'ikon')),
      el('div', {}, el('h1', { metin: bilgi.baslik }), aciklama)),
  ];
  if (!etkinProfil()) {
    kap.replaceChildren(...ust, el('p', { sinif: 'bos-durum', metin: 'Derslere başlamak için önce bir profil oluştur.' }));
    return;
  }
  kap.replaceChildren(...ust, yukleniyor());
  // S34f: yalnız sınıfa uygun dersler, ilkokulda ilkokul sürümüyle
  const dersler = (await dersleriYukle(seri.ad, sinif)).filter((d) => d.ders);
  if (no !== cizimNo) return;
  if (dersler.length) aciklama.textContent = metin.giris(dersler.length);
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
  let ham = null;
  try { ham = await dersYukle(ad); } catch (h) { console.error('[teknikler]', h); }
  if (no !== cizimNo || etkinRota()?.parametreler.ad !== ad) return;
  if (!ham) {
    toastGoster('Bu ders açılamadı. Listeden yeniden seç.', { tur: 'hata' });
    git(seri.listeAdres.slice(1), { degistir: true });
    return;
  }
  const sinif = etkinProfil()?.sinif ?? null;
  if (!dersUygunMu(ham, sinif)) { sinifDisiDers(kap, ham, seri, sinif); return; } // S34f
  const ders = dersSurumu(ham, sinif); // S34f: 2-4. sınıfta ilkokul sürümü
  document.title = `${ders.baslik} | Odak Akademi`;
  oturum = dersEkraniKur(kap, ders, { geriAdres: seri.listeAdres, geriEtiket: 'Tüm dersler' });
}

// S34f: Sınıfa uygun olmayan ders (adresle gelindi): sade bilgi ve ders listesine dönüş; kendiliğinden yönlendirmez
function sinifDisiDers(kap, ders, seri, sinif) {
  const [en, enCok] = dersAraligi(ders);
  const buyuk = sinif < en;
  document.title = `${ders.baslik} | Odak Akademi`;
  kap.replaceChildren(
    geriBaglanti(seri.listeAdres, 'Tüm dersler'),
    el('div', {},
      el('h1', { metin: buyuk ? 'Bu ders daha büyük sınıflar için' : 'Bu ders daha küçük sınıflar için' }),
      el('p', { sinif: 'soluk', metin: buyuk ? `“${ders.baslik}” ${en}. sınıftan itibaren açılır.` : `“${ders.baslik}” ${enCok}. sınıfa kadar açıktır.` })),
    bosDurum('Senin sınıfına uygun dersler listede seni bekliyor.', { ifade: 'cesaret' }),
    el('p', {}, el('a', { sinif: 'btn btn--birincil', href: seri.listeAdres, metin: 'Derslere dön' })));
}
