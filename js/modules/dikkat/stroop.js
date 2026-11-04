// Renk mi, Kelime mi? (Stroop, S11a): renk adı yazılı kelimenin yazı rengini seç; uyumlu ve uyumsuz denemeler karışık. Düğmelerde renksiz ad + sabit konum, isteğe bağlı şekil ipucu (renk körlüğü)
import { el } from '../../core/ui.js';
import { trBuyuk } from '../../core/utils.js';
import { simgeSvg, rastgeleSec } from '../../engine/algi.js';
import { hazirlikSecimi } from '../../engine/exercise-frame.js';
import { dikkatOyunu, dikkatTuru, dikkatSahnesi, denemePlani, oranliAdet, msMetni } from '../../engine/attention-core.js';

const DENEME = 24;
// Renkler yalnız belirteçlerden; her rengin sabit şekli var (ipucu açıkken kelimenin altında ve düğmede görünür)
const RENKLER = Object.freeze([
  { kod: 'kirmizi', ad: 'kırmızı', deger: 'var(--renk-hata)', sekil: 'kare' },
  { kod: 'mavi', ad: 'mavi', deger: 'var(--renk-bilgi)', sekil: 'daire' },
  { kod: 'yesil', ad: 'yeşil', deger: 'var(--renk-basari)', sekil: 'ucgen' },
  { kod: 'sari', ad: 'sarı', deger: 'var(--renk-gunes)', sekil: 'yildiz' },
].map(Object.freeze));
let ipucu = false; // oturumluk seçim

export default dikkatOyunu({
  egzersiz: 'stroop',
  ad: 'Renk mi, Kelime mi?',
  ikon: 'renk-kelime',
  kisaAciklama: 'Gözün kelimeyi okumak ister; sen yazının rengine odaklan.',
  nasil: [
    'Ortada bir renk adı belirir, ör. MAVİ. Kelimeyi değil, yazının rengini seç.',
    'Kelime ile renk bazen aynı, bazen farklıdır. Farklı olanlarda biraz yavaşlamak normaldir; doğru seçmeye odaklan.',
    'Düğmelerin yeri hiç değişmez; klavyede 1-4 tuşlarını da kullanabilirsin. Renkleri ayırt etmekte zorlanıyorsan şekil ipucunu aç.',
  ],
  // renk: seçenek sayısı (3'te kırmızı-mavi-sarı: renk körlüğünde en kolay ayrışanlar); uyumsuz: oran; uyaranMs: kelimenin görünme süresi
  basamaklar: [
    { renk: 3, uyumsuz: 0.25, pencereMs: 3000, uyaranMs: Infinity, araMs: [500, 900] },
    { renk: 3, uyumsuz: 0.4, pencereMs: 2600, uyaranMs: Infinity, araMs: [450, 850] },
    { renk: 4, uyumsuz: 0.5, pencereMs: 2300, uyaranMs: Infinity, araMs: [450, 800] },
    { renk: 4, uyumsuz: 0.5, pencereMs: 2000, uyaranMs: 1200, araMs: [400, 750] },
    { renk: 4, uyumsuz: 0.6, pencereMs: 1800, uyaranMs: 800, araMs: [400, 700] },
  ],
  alanEtiketi: 'Renk oyunu. Yazının rengini düğmelerle ya da 1-4 tuşlarıyla seç.',
  rekorAyrimi: 'ipucu', // şekil ipucu açık ve kapalı turların rekorları ayrı

  hazirlik: () => hazirlikSecimi({
    ad: 'stroop-ipucu',
    baslik: 'Renk ipucu',
    secenekler: [
      { deger: false, etiket: 'Yalnız renk' },
      { deger: true, etiket: 'Renk ve şekil', aciklama: 'renkleri ayırt etmekte zorlanıyorsan' },
    ],
    secili: ipucu,
    degisince: (d) => { ipucu = d; },
  }),

  baslat(ctx) {
    const s = ctx.seviye;
    const renkler = RENKLER.filter((r) => s.renk >= 4 || r.kod !== 'yesil');
    Object.assign(ctx.ekstra, { renk: renkler.length, ipucu });

    const sahneDuzen = dikkatSahnesi(ctx, { ust: el('p', { sinif: 'stroop-gorev', metin: 'Yazının rengini seç' }) });
    const odak = el('span', { sinif: 'dikkat-odak', 'aria-hidden': 'true', metin: '+' });
    const kelime = el('span', { sinif: 'stroop-kelime' });
    const sekilKutu = el('span', { sinif: 'stroop-ipucu', 'aria-hidden': 'true', hidden: !ipucu });
    const uyaran = el('div', { sinif: 'stroop-uyaran', hidden: true }, kelime, sekilKutu);
    sahneDuzen.sahne.append(odak, uyaran);

    const dugmeler = renkler.map((r, i) => el('button', {
      type: 'button', sinif: 'stroop-secenek', 'aria-keyshortcuts': String(i + 1), 'aria-label': `${r.ad}, tuş ${i + 1}` },
    // Düğmede renk yok (renk eşleştirme görevi kolaylaştırır); ipucu açıksa yalnız renksiz şekil
    ipucu && el('span', { sinif: 'stroop-ornek', 'aria-hidden': 'true' }, simgeSvg(r.sekil, { renk: 'var(--renk-yuzey)' })),
    el('span', { sinif: 'stroop-ad', metin: r.ad }),
    el('kbd', { sinif: 'stroop-tus', 'aria-hidden': 'true', metin: String(i + 1) })));
    const panel = el('div', { sinif: 'stroop-secenekler', role: 'group', 'aria-label': 'Yazının rengi', style: `--sutun:${renkler.length}` }, dugmeler);
    ctx.alan.append(panel);

    // Plan: uyumlu/uyumsuz karışık; yazı rengi art arda aynı olmaz
    const uyumsuz = oranliAdet(DENEME, s.uyumsuz);
    let onceki = null;
    const plan = denemePlani({ uyumsuz, uyumlu: DENEME - uyumsuz }, { enCokArdisik: 4 }).map((tur) => {
      const murekkep = rastgeleSec(renkler.filter((r) => r !== onceki));
      onceki = murekkep;
      const yazi = tur === 'uyumlu' ? murekkep : rastgeleSec(renkler.filter((r) => r !== murekkep));
      return { tur, beklenen: 'tepki', murekkep, yazi };
    });

    const tur = dikkatTuru(ctx, {
      plan, pencereMs: s.pencereMs, uyaranMs: s.uyaranMs, araMs: s.araMs, geriMs: 350,
      ilerleme: sahneDuzen.ilerle,
      goster(d) {
        sahneDuzen.temizle();
        dugmeler.forEach((b) => { delete b.dataset.sonuc; });
        kelime.textContent = trBuyuk(d.yazi.ad);
        kelime.style.color = d.murekkep.deger;
        kelime.dataset.renk = d.murekkep.kod;
        if (ipucu) sekilKutu.replaceChildren(simgeSvg(d.murekkep.sekil, { renk: d.murekkep.deger }));
        odak.hidden = true;
        uyaran.hidden = false;
      },
      gizle() { uyaran.hidden = true; odak.hidden = false; },
      dogruMu: (d, i) => renkler[i] === d.murekkep,
      sonucta(k, d) {
        const secilen = dugmeler[k.yanit];
        if (k.sonuc === 'dogru') {
          ctx.ses('tik');
          if (secilen) secilen.dataset.sonuc = 'dogru';
          sahneDuzen.geriYaz('dogru', 'Doğru');
        } else if (k.sonuc === 'yanlis') {
          ctx.ses('yanlis');
          if (secilen) secilen.dataset.sonuc = 'yanlis';
          sahneDuzen.geriYaz('yanlis', `Yazının rengi ${d.murekkep.ad} idi.`);
        } else if (k.sonuc === 'atlandi') {
          sahneDuzen.geriYaz('yanlis', `Süre doldu. Yazının rengi ${d.murekkep.ad} idi.`);
        } else {
          sahneDuzen.geriYaz('yanlis', d ? 'Biraz erken oldu. Önce kelimeye bak, sonra seç.' : 'Kelime çıkmadan seçtin. Önce bak, sonra seç.');
        }
      },
      bitince(oz) {
        const { uyumlu, uyumsuz: uy } = oz.turMs;
        if (uyumlu && uy) ctx.ekstra.farkMs = uy - uyumlu;
      },
    });

    // Dokunma: pointerdown (tıklama gecikmesi yok); klavye: 1-4 ya da odaktaki düğmede Enter/Boşluk
    panel.addEventListener('pointerdown', (e) => {
      if (!e.isPrimary || e.button > 0) return;
      const d = e.target.closest('.stroop-secenek');
      if (!d) return;
      e.preventDefault();
      tur.yanitla(dugmeler.indexOf(d), e);
    });
    panel.addEventListener('click', (e) => {
      const d = e.target.closest('.stroop-secenek');
      if (d && e.detail === 0) tur.yanitla(dugmeler.indexOf(d), e); // yalnız klavye etkinleştirmesi
    });
    ctx.alan.addEventListener('keydown', (e) => {
      if (e.repeat || e.ctrlKey || e.altKey || e.metaKey) return;
      const i = Number(e.key) - 1;
      if (!Number.isInteger(i) || i < 0 || i >= renkler.length) return;
      e.preventDefault();
      tur.yanitla(i, e);
    });
  },

  ekSatirlar: (e) => [
    ['Uyumlu kelimeler', msMetni(e.turMs?.uyumlu)],
    ['Uyumsuz kelimeler', msMetni(e.turMs?.uyumsuz)],
    ['Uyumsuzda ek süre', e.farkMs !== undefined ? `${e.farkMs > 0 ? '+' : ''}${msMetni(e.farkMs)}` : '-'],
  ],

  stil: `
    .stroop-gorev { margin: 0; font-size: var(--fs-l); font-weight: 700; }
    .stroop-uyaran { display: grid; justify-items: center; gap: var(--b-2); }
    .stroop-kelime {
      font-family: var(--font-baslik); font-size: clamp(2.5rem, 13vw, 4.25rem); font-weight: 800; line-height: 1.1;
      letter-spacing: 0.04em; forced-color-adjust: none;
    }
    /* Sarı yazı açık zeminde okunsun: koyu kenar (yalnız belirteç) */
    .stroop-kelime[data-renk="sari"] { -webkit-text-stroke: 0.035em var(--renk-gunes-uzeri); paint-order: stroke fill; }
    .stroop-ipucu { inline-size: 2.75rem; block-size: 2.75rem; forced-color-adjust: none; }
    .stroop-secenekler { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--b-2); }
    @media (min-width: 560px) { .stroop-secenekler { grid-template-columns: repeat(var(--sutun), minmax(0, 1fr)); } }
    .stroop-secenek {
      display: flex; align-items: center; gap: var(--b-2); min-block-size: 3.25rem; min-inline-size: 0; padding: var(--b-2) var(--b-3);
      border: 2px solid var(--renk-kenar-guclu); border-radius: var(--kose-m); background: var(--renk-yuzey); color: var(--renk-metin);
      font: inherit; font-size: var(--fs-l); font-weight: 700; cursor: pointer; touch-action: manipulation;
    }
    .stroop-secenek:focus-visible { outline: 3px solid var(--renk-odak); outline-offset: 2px; }
    .stroop-ornek { flex: none; inline-size: 1.75rem; block-size: 1.75rem; forced-color-adjust: none; }
    .stroop-ad { flex: 1; min-inline-size: 0; text-align: start; overflow-wrap: anywhere; }
    .stroop-tus { padding: 0 0.35em; border: 1px solid var(--renk-kenar-guclu); border-radius: var(--kose-s); font-family: var(--font-mono); font-size: var(--fs-xs); color: var(--renk-metin-soluk); }
    @media (pointer: coarse) { .stroop-tus { display: none; } }
    .stroop-secenek[data-sonuc="dogru"] { border-color: var(--renk-basari); background: var(--renk-basari-zemin); box-shadow: inset 0 0 0 2px var(--renk-basari); }
    .stroop-secenek[data-sonuc="yanlis"] { border-color: var(--renk-vurgu-metin); border-style: dashed; background: var(--renk-vurgu-zemin); }
    @media (forced-colors: active) { .stroop-secenek[data-sonuc="dogru"] { outline: 3px solid Highlight; } }
  `,
});
