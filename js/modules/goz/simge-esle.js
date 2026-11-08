// Simge Anahtarı (S10; S34-son: simge sayısı sınıf bandından (tek sayı da olabilir: dar ekran sütunu yukarı yuvarlanır), örnek): anahtar tablosuna bakarak ortadaki simgenin sayısını bulma (görsel eşleme ve tarama); 60 saniye, her açılışta yeni anahtar
import { el } from '../../core/ui.js';
import { karistir } from '../../core/utils.js';
import { duyur } from '../../core/a11y.js';
import { simgeSvg, SEKILLER, SEKIL_ADLARI, rastgeleSec, geriYaz } from '../../engine/algi.js';
import { secenekPaneli } from '../../engine/flas.js';
import { ornekListesi } from '../../engine/exercise-frame.js';

const SURE_SN = 60;
const SIMGE_RENGI = 'var(--renk-birincil)'; // tek renk: renk ipucu olmasın
/** karistirHer: bu kadar doğrudan sonra anahtardaki sayılar yeniden dağıtılır */
const SEVIYELER = Object.freeze([
  { ad: 'Kolay', simge: 4 },
  { ad: 'Orta', simge: 6 },
  { ad: 'Zor', simge: 8 },
  { ad: 'Çok zor', simge: 8, karistirHer: 8 },
]);

export default {
  modul: 'goz',
  egzersiz: 'simge-esle',
  ad: 'Simge Anahtarı',
  ikon: 'simge',
  sureSn: SURE_SN,
  kisaAciklama: 'Anahtar tablosunda simgeyi bul, altındaki sayıyı seç. Hız da doğruluk da önemli.',
  nasil: [
    'Üstteki anahtarda her simgenin altında bir sayı var. Anahtar her açılışta değişir.',
    'Ortadaki simgeyi anahtarda bul ve onun sayısını seç. Klavyede sayı tuşlarını kullanabilirsin.',
    `Süre ${SURE_SN} saniye. Puan = doğru − yanlış; tahmin yerine bakıp seçmek kazandırır. “Çok zor”da anahtar ara sıra değişir.`,
  ],
  seviyeler: SEVIYELER,
  otomatikSeviye: true,
  etiketler: { dogru: 'Doğru eşleme', yanlis: 'Yanlış eşleme' },
  puanEtiketi: 'Net eşleme',
  puanAciklama: 'Doğru eşleme sayısından yanlışlar çıkarılır.',
  alanEtiketi: 'Simge anahtarı. Simgenin sayısını sayı tuşlarıyla ya da düğmelerle seç.',
  ornek: () => ornekListesi([
    { cizim: el('span', { sinif: 'egz-ornek__ikili' }, simgeSvg('kalp', { renk: SIMGE_RENGI }), el('span', { sinif: 'egz-ornek__yazi', metin: '2' })),
      metin: 'Anahtarda kalbin sayısı 2' },
    { cizim: simgeSvg('kalp', { renk: SIMGE_RENGI }), metin: 'Ortada kalp görürsen 2’yi seç' },
  ]),

  baslat(ctx) {
    const { alan } = ctx;
    const sv = ctx.seviye;
    const k = sv.simge;
    alan.classList.add('algi-alan', 'simge-alan');
    const simgeler = karistir(SEKIL_ADLARI).slice(0, k);
    let sayilar = new Map(); // simge → sayı (1..k)
    let simge = null;
    let panel = null;
    let karisma = 0;
    let seri = 0;
    Object.assign(ctx.ekstra, { simge: k });

    const anahtar = el('ul', { sinif: 'simge-anahtar', 'aria-label': 'Anahtar', style: `--n:${k};--dar:${k > 4 ? Math.ceil(k / 2) : k}` }); // S34-son: tek simge sayısında sütun tam sayı
    const soru = el('div', { sinif: 'algi-oge simge-soru', role: 'img' });
    const panelKap = el('div', { sinif: 'flas-soru simge-panel' });
    const geri = el('p', { sinif: 'algi-geri', 'aria-live': 'polite' });
    alan.append(anahtar, soru, panelKap, geri);

    function anahtarKur() {
      const s = karistir(Array.from({ length: k }, (_, i) => i + 1));
      sayilar = new Map(simgeler.map((ad, i) => [ad, s[i]]));
      anahtar.replaceChildren(...karistir(simgeler).map((ad) => el('li', { 'aria-label': `${SEKILLER[ad].ad}: ${sayilar.get(ad)}` },
        el('span', { sinif: 'simge-anahtar__simge' }, simgeSvg(ad, { renk: SIMGE_RENGI })),
        el('strong', { metin: String(sayilar.get(ad)), 'aria-hidden': 'true' }))));
    }

    function yeniSoru() {
      simge = rastgeleSec(simgeler.filter((s) => s !== simge));
      delete soru.dataset.sonuc;
      soru.setAttribute('aria-label', `Simge: ${SEKILLER[simge].ad}`);
      soru.replaceChildren(simgeSvg(simge, { renk: SIMGE_RENGI }));
      const odakIcerde = panelKap.contains(document.activeElement);
      panel = secenekPaneli({
        baslik: 'Bu simgenin sayısı kaç?',
        secenekler: Array.from({ length: k }, (_, i) => String(i + 1)),
        secince: cevap,
      });
      panelKap.replaceChildren(panel.kok);
      if (odakIcerde) panel.odakla();
    }

    function cevap(i) {
      if (!ctx.aktifMi()) return false;
      const dogruSayi = sayilar.get(simge);
      const dogruMu = i + 1 === dogruSayi;
      panel.isaretle(i, dogruSayi - 1);
      soru.dataset.sonuc = dogruMu ? 'dogru' : 'yanlis';
      if (dogruMu) {
        ctx.dogru(1, 'tik');
        geriYaz(geri, 'dogru', 'Doğru');
        seri += 1;
      } else {
        ctx.yanlis(1, 'yanlis');
        geriYaz(geri, 'yanlis', `Bu simgenin sayısı ${dogruSayi}.`);
      }
      ctx.sonra(() => {
        if (sv.karistirHer && seri >= sv.karistirHer) {
          seri = 0;
          karisma += 1;
          ctx.ekstra.karisma = karisma;
          anahtarKur();
          geriYaz(geri, null, 'Anahtar değişti! Sayılara yeniden bak.');
          duyur('Anahtar değişti.');
        }
        yeniSoru();
      }, dogruMu ? 220 : 800);
      return undefined;
    }

    alan.addEventListener('keydown', (e) => { if (ctx.aktifMi()) panel?.tus(e); });
    anahtarKur();
    yeniSoru();
  },

  degerlendir({ dogru, yanlis, ekstra }) {
    return {
      puan: Math.max(0, dogru - yanlis),
      satirlar: [
        ['Anahtar', `${ekstra.simge ?? '-'} simge`],
        ...(ekstra.karisma ? [['Anahtar değişimi', ekstra.karisma]] : []),
      ],
    };
  },

  stil: `
    .egz-alan.simge-alan { align-items: center; }
    .simge-anahtar {
      display: grid; grid-template-columns: repeat(var(--n), minmax(0, 1fr)); gap: 4px;
      inline-size: min(100%, calc(var(--n) * 4.25rem)); margin: 0; padding: 0; list-style: none;
    }
    @media (max-width: 479px) { .simge-anahtar { grid-template-columns: repeat(var(--dar), minmax(0, 1fr)); inline-size: min(100%, calc(var(--dar) * 4.25rem)); } }
    .simge-anahtar li {
      display: grid; justify-items: center; gap: 2px; padding: var(--b-1);
      border: 2px solid var(--renk-kenar); border-radius: var(--kose-s); background: var(--renk-yuzey);
    }
    .simge-anahtar__simge { display: block; inline-size: min(2.5rem, 100%); aspect-ratio: 1; }
    .simge-anahtar strong { font-size: var(--fs-l); line-height: 1.1; font-variant-numeric: tabular-nums; }
    .simge-soru {
      inline-size: min(8rem, 36vw); aspect-ratio: 1; padding: var(--b-3);
      border: 3px solid var(--renk-kenar-guclu); border-radius: var(--kose-l); background: var(--renk-yuzey);
    }
    .simge-panel { inline-size: 100%; }
    .simge-panel .flas-secenekler { grid-template-columns: repeat(4, minmax(0, 1fr)); }
  `,
};
