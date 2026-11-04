// 20-20-20 göz molası rehberi (S10; D06: halka kontrastı): uzakta nokta seç → yaklaşık 20 sn uzağa bak → göz kırp; adım adım ve sesli işaretli, kaydedilmez; tıbbi iddia yok
import { el } from '../../core/ui.js';
import { sureMetni } from '../../core/utils.js';
import { duyur } from '../../core/a11y.js';
import { hazirlikSecimi } from '../../engine/exercise-frame.js';
import { gozMolasiVerildi } from '../../engine/eye-rest.js';

/** uzak: öğrenci ekrana bakmıyor; adım bitince kısa ses çalar (ses açıksa) */
const ADIMLAR = Object.freeze([
  { baslik: 'Uzakta bir nokta seç', sn: 6,
    metin: 'Pencereden görünen bir ağaç ya da bina, olmazsa odanın en uzak köşesi olabilir. Yaklaşık 20 adım (6 metre) uzakta olsun.' },
  { baslik: 'Uzağa bak', sn: 20, uzak: true,
    metin: 'Başını ekrandan kaldır ve seçtiğin noktaya rahatça bak. Ekrana dönmen gerekmez; süre bitince kısa bir ses duyarsın.' },
  { baslik: 'Gözlerini kırp, omuzlarını gevşet', sn: 8,
    metin: 'Gözlerini yavaşça birkaç kez açıp kapat. Omuzlarını birkaç kez geriye doğru çevir.' },
]);
const TUR_SN = ADIMLAR.reduce((t, a) => t + a.sn, 0);
const TURLAR = Object.freeze([
  { deger: 1, etiket: '1 tur', aciklama: `yaklaşık ${TUR_SN} saniye` },
  { deger: 2, etiket: '2 tur', aciklama: 'yaklaşık 1 dakika' },
  { deger: 3, etiket: '3 tur', aciklama: 'yaklaşık 1,5 dakika' },
]);
let turSayisi = 1; // seçim oturum boyunca hatırlanır

export default {
  modul: 'goz',
  egzersiz: 'goz-molasi',
  ad: '20-20-20 Göz Molası',
  ikon: 'uzak',
  kisaAciklama: 'Ekran başında kısa bir ara ver. Bu bir tedavi değildir; uzağa bakma ve mola verme alışkanlığı için bir öneridir.',
  nasil: [
    '20-20-20 önerisi: ekrana yaklaşık 20 dakika baktıktan sonra, yaklaşık 20 saniye boyunca 20 adım kadar uzağa bak.',
    'Ekrandaki adımları izle. Uzağa bakarken ekrana dönmen gerekmez; adım bitince kısa bir ses gelir (ses efektleri açıksa).',
    'Gözlerinde rahatsızlık sürerse ailene ya da öğretmenine söyle. Bu molayı istediğin zaman buradan açabilirsin.',
  ],
  seviyeler: [{ ad: 'Mola' }],
  sayacYok: true,
  kayitYok: true,
  kayitYokMetni: 'Molalar puan için değil, bu yüzden kaydedilmez.',
  molaMi: true, // çerçevedeki aralıksız çalışma sayacını sıfırlar
  puanEtiketi: 'Tamamlanan mola turu',
  alanEtiketi: 'Göz molası rehberi. Adımlar ekranda yazar ve ekran okuyucuyla duyurulur.',

  hazirlik() {
    return el('div', { sinif: 'okuma-ayar' }, hazirlikSecimi({
      ad: 'tur', baslik: 'Mola uzunluğu', secenekler: TURLAR, secili: turSayisi,
      degisince: (d) => { turSayisi = d; },
    }));
  },

  baslat(ctx) {
    const { alan } = ctx;
    const toplam = turSayisi;
    alan.classList.add('algi-alan', 'mola-alan');
    Object.assign(ctx.ekstra, { tur: 0, hedefTur: toplam });

    const adimEl = el('p', { sinif: 'algi-durum' });
    const baslik = el('h3', { sinif: 'mola-baslik' });
    const metin = el('p', { sinif: 'mola-metin' });
    const sayi = el('span', { sinif: 'mola-sayi', 'aria-hidden': 'true' });
    const halka = el('div', { sinif: 'mola-halka', role: 'timer', 'aria-live': 'off' }, sayi);
    const gec = el('button', { type: 'button', sinif: 'btn btn--ikincil', metin: 'Sonraki adım', onclick: () => sonrakiAdim() });
    alan.append(el('div', { sinif: 'mola-kart' }, adimEl, halka, baslik, metin, gec));

    let tur = 1;
    let adim = -1;
    let kalan = 0;
    let durdur = null;

    function ciz(a) {
      sayi.textContent = String(Math.max(0, kalan));
      halka.style.setProperty('--deger', `${Math.round(((a.sn - kalan) / a.sn) * 100)}%`);
      halka.setAttribute('aria-label', `Kalan ${sureMetni(Math.max(0, kalan))}`);
    }

    function sonrakiAdim() {
      if (!ctx.aktifMi()) return;
      durdur?.();
      durdur = null;
      adim += 1;
      if (adim >= ADIMLAR.length) {
        ctx.ekstra.tur = tur;
        if (tur >= toplam) {
          gozMolasiVerildi(); // okumadaki göz molası sayacı da baştan başlar
          ctx.bitir();
          return;
        }
        tur += 1;
        adim = 0;
      }
      const a = ADIMLAR[adim];
      kalan = a.sn;
      adimEl.textContent = `Tur ${tur}/${toplam} · Adım ${adim + 1}/${ADIMLAR.length}`;
      baslik.textContent = a.baslik;
      metin.textContent = a.metin;
      alan.dataset.uzak = a.uzak ? 'evet' : 'hayir';
      gec.textContent = adim === ADIMLAR.length - 1 && tur >= toplam ? 'Molayı bitir' : 'Sonraki adım';
      ciz(a);
      duyur(`${a.baslik}. ${a.metin}`);
      // ctx.her çerçeveyle birlikte duraklar: duraklatınca geri sayım da bekler
      durdur = ctx.her(() => {
        kalan -= 1;
        ciz(a);
        if (kalan > 0) return;
        if (a.uzak) ctx.ses('bip');
        sonrakiAdim();
      }, 1000);
    }

    sonrakiAdim();
  },

  degerlendir({ sureSn, ekstra }) {
    return {
      puan: ekstra.tur ?? 0,
      satirlar: [
        ['Tamamlanan tur', `${ekstra.tur ?? 0} / ${ekstra.hedefTur ?? 1}`],
        ['Süre', sureMetni(sureSn)],
      ],
      mesaj: 'Güzel bir mola verdin. Ekran başında yaklaşık 20 dakikada bir kısa bir ara vermeyi alışkanlık edinebilirsin.',
    };
  },

  stil: `
    .mola-kart { display: grid; justify-items: center; gap: var(--b-3); inline-size: min(100%, 32rem); margin: auto; text-align: center; }
    .mola-baslik { margin: 0; font-size: var(--fs-xl); }
    .mola-metin { margin: 0; max-inline-size: 30rem; line-height: 1.5; }
    .mola-halka {
      display: grid; place-items: center; inline-size: 9.5rem; aspect-ratio: 1; border-radius: 50%;
      background: var(--renk-birincil-zemin);
      background: conic-gradient(var(--renk-birincil) var(--deger, 0%), var(--renk-birincil-zemin) 0);
    }
    .mola-alan[data-uzak="evet"] .mola-halka {
      background: var(--renk-gunes-zemin);
      background: conic-gradient(var(--renk-uyari) var(--deger, 0%), var(--renk-gunes-zemin) 0); /* D06: ilerleme 3:1 üstü */
    }
    .mola-sayi {
      display: grid; place-items: center; inline-size: 7.5rem; aspect-ratio: 1; border-radius: 50%;
      background: var(--renk-yuzey); font-size: var(--fs-3xl); font-weight: 800; font-variant-numeric: tabular-nums;
    }
    @media (forced-colors: active) { .mola-halka { border: 3px solid CanvasText; } }
  `,
};
