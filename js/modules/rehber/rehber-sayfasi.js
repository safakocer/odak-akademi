// Çalışma Rehberi (S22): #/rehber araç ve bilgi kartları, #/rehber/<sayfa> araç (Cornell, zihin haritası, haftalık plan) ya da bilgi sayfası; ortak sayfa üstü, ders adı listesi ve yazdırma (html.yazdir-rehber); S34a: kartlar etkin profilin sınıfına göre, uygun olmayan sayfa #/sinif-disi; S34f: ders önerileri ve bilgi sayfalarının kademe bölümleri etkin profilin kademesine göre
import { el, spriteIkon, toastGoster } from '../../core/ui.js';
import { git } from '../../core/router.js';
import { aracBilgisi, modulAraclari } from '../katalog.js';
import { egzersizKarti, sinifDisiysaYonlendir } from '../egzersiz-listesi.js';
import { etkinProfil } from '../../core/store.js';
import { kademe } from '../../core/siniflar.js';
import { BILGI_SAYFALARI, KADEME_DERS_ONERILERI } from './rehber-icerik.js';

const YAZDIR_SINIFI = 'yazdir-rehber';
const ARAC_DOSYALARI = {
  cornell: () => import('./cornell.js'),
  'zihin-haritasi': () => import('./zihin-haritasi.js'),
  'haftalik-plan': () => import('./haftalik-plan.js'),
};

let etkinArac = null; // açık aracın { kapat() } nesnesi (kaydedilmemiş yazıyı kaydeder)
let cizimNo = 0;      // eski bir yükleme bitince yeni sayfanın üstüne çizmesin

// ---------- Ortak yardımcılar (araç dosyaları da kullanır) ----------
export const geriBaglanti = (href, metin) => el('a', { sinif: 'btn btn--hayalet btn--kucuk geri-baglanti yazdirma-yok', href },
  spriteIkon('ok-sag', 'ikon ikon--kucuk ikon--ters'), metin);

export const sayfaUst = (ikon, baslik, aciklama) => el('div', { sinif: 'sayfa-ust', 'data-modul': 'rehber' },
  el('span', { sinif: 'kart__ikon', 'aria-hidden': 'true' }, spriteIkon(ikon, 'ikon')),
  el('div', {}, el('h1', { metin: baslik }), aciklama && el('p', { sinif: 'soluk', metin: aciklama })));

/** Ders adı önerileri (datalist); sayfada bir kez eklenir, girdiler list="rehber-dersler" ile bağlanır. S34f: öneriler kademeye göre (kademe yoksa ortaokul) */
export const dersListesi = (sinif = etkinProfil()?.sinif) => el('datalist', { id: 'rehber-dersler' },
  (KADEME_DERS_ONERILERI[kademe(sinif) ?? 'ortaokul'] ?? KADEME_DERS_ONERILERI.ortaokul).map((d) => el('option', { value: d })));

export const yazdirDugmesi = (metin = 'Yazdır', fn = () => yazdir()) => el('button',
  { type: 'button', sinif: 'btn btn--ikincil btn--kucuk yazdirma-yok', onclick: fn }, spriteIkon('indir', 'ikon ikon--kucuk'), metin);

/** Yazdırır; ekSinif yazdırma bitince kökten kaldırılır (ör. yalnız boş şablon) */
export function yazdir(ekSinif) {
  const kok = document.documentElement;
  if (ekSinif) {
    kok.classList.add(ekSinif);
    window.addEventListener('afterprint', () => kok.classList.remove(ekSinif), { once: true });
  }
  window.print();
}

const yukleniyor = () => el('p', { sinif: 'soluk', role: 'status', metin: 'Yükleniyor…' });

export function rehberSayfasiniKapat() {
  etkinArac?.kapat?.();
  etkinArac = null;
  cizimNo++;
  document.documentElement.classList.remove(YAZDIR_SINIFI);
}

// ---------- #/rehber ----------
export function rehberSayfasiCiz(kap) {
  rehberSayfasiniKapat();
  if (!kap) return;
  const kartlar = modulAraclari('rehber', etkinProfil()?.sinif); // S34a: yalnız sınıfa uygun kartlar
  // S34a: sınıfa uygun kartı olmayan bölüm hiç çizilmez (ör. 2. sınıfta Araçlar)
  const bolum = (id, baslik, grup) => {
    const liste = kartlar.filter((k) => k.grup === grup);
    return liste.length > 0 && el('section', { 'aria-labelledby': id },
      el('div', { sinif: 'bolum-baslik' }, el('h2', { id, metin: baslik })),
      el('ul', { sinif: 'izgara modul-izgara', 'aria-labelledby': id }, liste.map(egzersizKarti)));
  };
  // S34a: sınav dili yalnız Sınav Hazırlığı kartı görünüyorsa
  const sinavVar = kartlar.some((k) => k.ad === 'sinav-hazirlik');
  kap.replaceChildren(...[
    geriBaglanti('#/', 'Ana sayfa'),
    sayfaUst('pusula', 'Çalışma Rehberi', sinavVar
      ? 'Not tut, konuyu haritala, haftanı planla. Bilgi köşesinde sınav, sağlık ve aile önerileri var.'
      : 'Çalışmanı kolaylaştıran araçlar ve bilgi köşesi: sağlıklı alışkanlıklar ve aileler için öneriler.'),
    bolum('rehber-arac-baslik', 'Araçlar', 'arac'),
    bolum('rehber-bilgi-baslik', 'Bilgi köşesi', 'bilgi'),
    el('p', { sinif: 'alan__ipucu', metin: 'Notların, haritaların ve planın yalnızca bu cihazda, bu profilde saklanır. Yedek indirildiğinde onlar da yedeğe girer.' }),
  ].filter(Boolean));
}

// ---------- #/rehber/<sayfa> ----------
export async function rehberAltSayfaCiz(kap, ad, sorgu = {}) {
  rehberSayfasiniKapat();
  if (!kap) return;
  const kart = aracBilgisi(ad);
  if (!kart || kart.modul !== 'rehber') {
    toastGoster('Bu sayfa bulunamadı. Rehberden seç.', { tur: 'bilgi' });
    git('/rehber', { degistir: true });
    return;
  }
  if (sinifDisiysaYonlendir(ad)) return; // S34a: ör. ilkokulda Sınav Hazırlığı
  document.title = `${kart.baslik} | Odak Akademi`;
  document.documentElement.classList.add(YAZDIR_SINIFI);
  if (BILGI_SAYFALARI[ad]) { bilgiSayfasiCiz(kap, kart, BILGI_SAYFALARI[ad]); return; }
  const no = cizimNo;
  kap.replaceChildren(yukleniyor());
  try {
    const m = await ARAC_DOSYALARI[ad]();
    if (no !== cizimNo) return;
    etkinArac = m.aracCiz(kap, { kart, sorgu });
  } catch (h) {
    console.error('[rehber]', h);
    if (no === cizimNo) kap.replaceChildren(geriBaglanti('#/rehber', 'Çalışma Rehberi'),
      el('p', { sinif: 'bos-durum', metin: 'Bu araç açılamadı. Sayfayı yenileyip yeniden dene.' }));
  }
}

// ---------- Bilgi sayfaları ----------
function baglantilar(liste) {
  if (!liste?.length) return null;
  return el('div', { sinif: 'bilgi-kart__baglantilar yazdirma-yok' },
    liste.map((b) => el('a', { sinif: 'btn btn--hayalet btn--kucuk', href: b.adres }, b.metin, spriteIkon('ok-sag', 'ikon ikon--kucuk'))));
}

function bilgiKarti(b, i) {
  const id = `bilgi-${i}`;
  return el('section', { sinif: 'kart bilgi-kart', 'aria-labelledby': id },
    el('h2', { id, sinif: 'baslik-ikonlu' },
      b.ikon && el('span', { sinif: 'kart__ikon kart__ikon--kucuk', 'data-modul': 'rehber', 'aria-hidden': 'true' }, spriteIkon(b.ikon, 'ikon ikon--kucuk')),
      b.baslik),
    b.metin && el('p', { metin: b.metin }),
    b.maddeler && el('ul', { sinif: 'bilgi-kart__liste' }, b.maddeler.map((m) => el('li', { metin: m }))),
    b.not && el('p', { sinif: 'bilgi-kart__not' }, spriteIkon('bilgi', 'ikon ikon--kucuk'), el('span', { metin: b.not })),
    baglantilar(b.baglantilar));
}

function bilgiSayfasiCiz(kap, kart, icerik) {
  const parcalar = [
    geriBaglanti('#/rehber', 'Çalışma Rehberi'),
    el('div', { sinif: 'rehber-ust' }, sayfaUst(kart.ikon, kart.baslik, icerik.giris), yazdirDugmesi()),
  ];
  if (icerik.uyari) {
    parcalar.push(el('div', { sinif: 'bildirim rehber-uyari', role: 'note' },
      spriteIkon('bilgi', 'ikon'), el('p', {}, el('strong', { metin: `${icerik.uyari.baslik}. ` }), icerik.uyari.metin)));
  }
  if (icerik.numarali) {
    parcalar.push(el('section', { sinif: 'yigin', 'aria-labelledby': 'aile-liste-baslik', style: '--yigin-bosluk: var(--b-3)' },
      el('h2', { id: 'aile-liste-baslik', metin: icerik.listeBasligi }),
      el('ol', { sinif: 'oneri-listesi' }, icerik.bolumler.map((b, i) => el('li', { sinif: 'kart oneri-listesi__oge' },
        el('span', { sinif: 'oneri-listesi__no', 'aria-hidden': 'true', metin: String(i + 1) }),
        el('div', {}, el('h3', { metin: b.baslik }), el('p', { metin: b.metin })))))));
  } else {
    parcalar.push(el('div', { sinif: 'bilgi-izgara' }, icerik.bolumler.map(bilgiKarti)));
  }
  // S34f: kademe bölümleri (ör. aile rehberinde ilkokul): etkin profil o kademedeyse ya da profil yoksa
  const k = kademe(etkinProfil()?.sinif);
  const ekler = Object.entries(icerik.kademeBolumleri ?? {}).filter(([ad]) => !k || ad === k);
  if (ekler.length) parcalar.push(el('div', { sinif: 'bilgi-izgara' }, ekler.map(([ad, b]) => bilgiKarti(b, `kademe-${ad}`))));
  if (icerik.kapanis) parcalar.push(el('p', { sinif: 'alan__ipucu', metin: icerik.kapanis }));
  kap.replaceChildren(...parcalar);
}
