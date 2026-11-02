// Kutu nefes (S12): al, tut, ver, tut; 1-3 dk. Kare üzerinde ilerleyen nokta ve büyüyüp küçülen iç kare; hareketi azaltta yalnız kenar vurgusu ve sayaç. Kaydedilmez, tıbbi iddia yok
import { el } from '../../core/ui.js';
import { sureMetni } from '../../core/utils.js';
import { duyur, hareketAzaltilmisMi } from '../../core/a11y.js';
import { hazirlikSecimi } from '../../engine/exercise-frame.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
// Kare köşeleri (sol alt → sol üst → sağ üst → sağ alt); nokta bu sırayla dolaşır
const KOSE = Object.freeze([[40, 160], [40, 40], [160, 40], [160, 160]]);
const ADIMLAR = Object.freeze([
  { baslik: 'Nefes al', ipucu: 'Burnundan yavaşça', kenar: 0, olcek: [0.45, 0.85] },
  { baslik: 'Tut', ipucu: 'Rahatça bekle', kenar: 1, olcek: [0.85, 0.85] },
  { baslik: 'Nefes ver', ipucu: 'Ağzından yavaşça', kenar: 2, olcek: [0.85, 0.45] },
  { baslik: 'Tut', ipucu: 'Rahatça bekle', kenar: 3, olcek: [0.45, 0.45] },
]);
const SURELER = Object.freeze([
  { deger: 1, etiket: '1 dakika' },
  { deger: 2, etiket: '2 dakika' },
  { deger: 3, etiket: '3 dakika' },
]);
const TEMPOLAR = Object.freeze([
  { deger: 3, etiket: '3 saniye', aciklama: 'daha kolay' },
  { deger: 4, etiket: '4 saniye', aciklama: 'klasik kutu nefes' },
]);
let dakika = 1; // seçimler oturum boyunca hatırlanır
let tempo = 4;

function svg(ad, oz = {}) {
  const o = document.createElementNS(SVG_NS, ad);
  for (const [k, v] of Object.entries(oz)) o.setAttribute(k, v);
  return o;
}

export default {
  modul: 'dikkat',
  egzersiz: 'nefes',
  ad: 'Kutu Nefes',
  ikon: 'nefes',
  kisaAciklama: 'Yavaş ve düzenli nefes, derse başlamadan önce ya da molada sakinleşmek için kullanabileceğin basit bir yöntemdir. Bir tedavi değildir.',
  nasil: [
    'Rahat otur, omuzlarını gevşet. Kare boyunca ilerleyen noktayı izle; ses efektleri açıksa her adımda kısa bir ses gelir.',
    'Dört adım var: nefes al, tut, nefes ver, tut. Her adım seçtiğin süre kadar sürer; ortadaki sayı geri sayar.',
    'Zorlanma. Başın döner ya da rahatsız hissedersen dur ve normal nefes almaya devam et.',
  ],
  seviyeler: [{ ad: 'Nefes' }],
  sayacYok: true,
  kayitYok: true,
  kayitYokMetni: 'Nefes molaları puan için değil, bu yüzden kaydedilmez.',
  molaMi: true, // çerçevedeki aralıksız çalışma sayacını sıfırlar
  puanEtiketi: 'Tamamlanan nefes turu',
  alanEtiketi: 'Kutu nefes rehberi. Adımlar ekranda yazar ve ekran okuyucuyla duyurulur.',

  hazirlik() {
    return el('div', { sinif: 'okuma-ayar' },
      hazirlikSecimi({ ad: 'sure', baslik: 'Süre', secenekler: SURELER, secili: dakika, degisince: (d) => { dakika = d; } }),
      hazirlikSecimi({ ad: 'tempo', baslik: 'Her adım', secenekler: TEMPOLAR, secili: tempo, degisince: (d) => { tempo = d; } }));
  },

  baslat(ctx) {
    const { alan } = ctx;
    const adimSn = tempo;
    const donguSn = ADIMLAR.length * adimSn;
    const hedefTur = Math.ceil((dakika * 60) / donguSn);
    const toplamSn = hedefTur * donguSn;
    const azalt = hareketAzaltilmisMi();
    alan.classList.add('algi-alan', 'nefes-alan');
    Object.assign(ctx.ekstra, { tur: 0, hedefTur, tempo: adimSn });

    const kenarlar = KOSE.map(([x1, y1], i) => {
      const [x2, y2] = KOSE[(i + 1) % KOSE.length];
      return svg('line', { x1, y1, x2, y2, class: 'nefes-kenar' });
    });
    const ic = svg('rect', { x: 40, y: 40, width: 120, height: 120, rx: 14, class: 'nefes-ic' });
    const nokta = svg('circle', { r: 11, cx: KOSE[0][0], cy: KOSE[0][1], class: 'nefes-nokta' });
    const cizim = svg('svg', { viewBox: '0 0 200 200', class: 'nefes-svg', 'aria-hidden': 'true', focusable: 'false' });
    cizim.append(ic, ...kenarlar);
    if (!azalt) cizim.append(nokta);
    if (azalt) ic.setAttribute('transform', 'translate(100 100) scale(0.65) translate(-100 -100)');

    const durumEl = el('p', { sinif: 'algi-durum' });
    const sayiEl = el('span', { sinif: 'nefes-sayi', 'aria-hidden': 'true' });
    const baslik = el('h3', { sinif: 'nefes-baslik' });
    const ipucu = el('p', { sinif: 'nefes-ipucu' });
    alan.append(el('div', { sinif: 'nefes-kart' }, durumEl, el('div', { sinif: 'nefes-sahne' }, cizim, sayiEl), baslik, ipucu));

    let sonAdim = -1;
    let sonSayi = -1;
    let kareNo = 0;

    function adimGoster(i, tur) {
      const a = ADIMLAR[i];
      kenarlar.forEach((k, j) => { if (j === a.kenar) k.setAttribute('data-etkin', ''); else k.removeAttribute('data-etkin'); });
      baslik.textContent = a.baslik;
      ipucu.textContent = a.ipucu;
      durumEl.textContent = `Tur ${tur} / ${hedefTur}`;
      ctx.ses('tik');
      duyur(`${a.baslik}. ${a.ipucu}.`);
    }

    // Süre çerçevenin saatinden okunur: duraklatınca nokta da bekler
    function kare() {
      kareNo = requestAnimationFrame(kare);
      if (!ctx.aktifMi()) return;
      const t = ctx.gecenSn();
      ctx.ekstra.tur = Math.min(hedefTur, Math.floor(t / donguSn));
      if (t >= toplamSn) { ctx.ekstra.tur = hedefTur; ctx.bitir(); return; }
      const icinde = t % donguSn;
      const i = Math.floor(icinde / adimSn);
      const ilerleme = (icinde - i * adimSn) / adimSn;
      if (i !== sonAdim || sonAdim === -1) { sonAdim = i; adimGoster(i, Math.floor(t / donguSn) + 1); }
      const sayi = adimSn - Math.floor(icinde - i * adimSn);
      if (sayi !== sonSayi) { sonSayi = sayi; sayiEl.textContent = String(sayi); }
      if (azalt) return;
      const [x1, y1] = KOSE[i];
      const [x2, y2] = KOSE[(i + 1) % KOSE.length];
      nokta.setAttribute('cx', (x1 + (x2 - x1) * ilerleme).toFixed(1));
      nokta.setAttribute('cy', (y1 + (y2 - y1) * ilerleme).toFixed(1));
      const [o1, o2] = ADIMLAR[i].olcek;
      const yumusak = (1 - Math.cos(Math.PI * ilerleme)) / 2; // nefes gibi yavaş başlayıp yavaş biten geçiş
      ic.setAttribute('transform', `translate(100 100) scale(${(o1 + (o2 - o1) * yumusak).toFixed(3)}) translate(-100 -100)`);
    }
    kareNo = requestAnimationFrame(kare);
    ctx.temizlenince(() => cancelAnimationFrame(kareNo));
  },

  degerlendir({ sureSn, ekstra }) {
    return {
      puan: ekstra.tur ?? 0,
      satirlar: [
        ['Tamamlanan tur', `${ekstra.tur ?? 0} / ${ekstra.hedefTur ?? 1}`],
        ['Adım süresi', `${ekstra.tempo ?? 4} saniye`],
        ['Süre', sureMetni(sureSn)],
      ],
      mesaj: 'Güzel. Çalışmaya dönmeden önce birkaç normal nefes al. Bu nefesi derse başlamadan önce ya da molada istediğin zaman kullanabilirsin.',
    };
  },

  stil: `
    .nefes-kart { display: grid; justify-items: center; gap: var(--b-3); inline-size: min(100%, 26rem); margin: auto; text-align: center; }
    .nefes-sahne { position: relative; display: grid; place-items: center; inline-size: min(68vw, 16rem); aspect-ratio: 1; }
    .nefes-svg { inline-size: 100%; block-size: 100%; overflow: visible; }
    .nefes-kenar { stroke: var(--renk-kenar-guclu); stroke-width: 6; stroke-linecap: round; }
    .nefes-kenar[data-etkin] { stroke: var(--renk-birincil); stroke-width: 10; }
    .nefes-ic { fill: var(--renk-birincil-zemin); stroke: var(--renk-birincil); stroke-width: 2; }
    .nefes-nokta { fill: var(--renk-vurgu-metin); stroke: var(--renk-yuzey); stroke-width: 4; }
    .nefes-sayi {
      position: absolute; inset: 0; display: grid; place-items: center;
      font-size: var(--fs-3xl); font-weight: 800; font-variant-numeric: tabular-nums; color: var(--renk-metin);
    }
    .nefes-baslik { margin: 0; font-size: var(--fs-xl); }
    .nefes-ipucu { margin: 0; color: var(--renk-metin-soluk); }
    @media (forced-colors: active) {
      .nefes-kenar { stroke: CanvasText; }
      .nefes-kenar[data-etkin] { stroke: Highlight; }
      .nefes-nokta { fill: Highlight; }
    }
  `,
};
