// Ayna mı, Döndürme mi? (S10; D06: ok tuşları yanıt vermez, yalnız 1/2; S34-son: parça sayısı ve açılar sınıf bandından, deneme sayısı denemeSayisi ile, örnek): rastgele üretilen kare parçalı şekil ile döndürülmüş hâlini ya da ayna görüntüsünü karşılaştırma (zihinde döndürme)
import { el } from '../../core/ui.js';
import { sayiBicimle, karistir, dakikaPuani } from '../../core/utils.js';
import { svg, rastgeleSec, geriYaz } from '../../engine/algi.js';
import { secenekPaneli } from '../../engine/flas.js';
import { ornekListesi } from '../../engine/exercise-frame.js';
import { denemeSayisi } from '../../engine/attention-core.js';

const DENEME = 12;               // yarısı ayna, yarısı döndürme (karışık sırayla)
const HATA_CEZA_SN = 3;
const KARE = 18;                 // bir parçanın kenarı (SVG birimi)
const SEVIYELER = Object.freeze([
  { ad: 'Kolay', hucre: 5, acilar: [0, 90, 270], isaret: true },
  { ad: 'Orta', hucre: 5, acilar: [90, 180, 270], isaret: false },
  { ad: 'Zor', hucre: 6, acilar: [45, 90, 135, 180, 225, 270, 315], isaret: false },
]);

// ---------- Şekil üretimi: bitişik kareler; aynası hiçbir döndürmeyle kendisine benzemeyen (kiral) şekil seçilir ----------
const anahtar = (h) => {
  const mx = Math.min(...h.map((p) => p[0]));
  const my = Math.min(...h.map((p) => p[1]));
  return h.map(([x, y]) => `${x - mx},${y - my}`).sort().join(' ');
};
const dondur = ([x, y]) => [-y, x];
const aynala = ([x, y]) => [-x, y];

function kiralMi(h) {
  const ayna = anahtar(h.map(aynala));
  let d = h;
  for (let i = 0; i < 4; i++) {
    if (anahtar(d) === ayna) return false;
    d = d.map(dondur);
  }
  return true;
}

function parcaUret(n) {
  for (let deneme = 0; deneme < 300; deneme++) {
    const h = [[0, 0]];
    const kume = new Set(['0,0']);
    while (h.length < n) {
      const [x, y] = rastgeleSec(h);
      const [dx, dy] = rastgeleSec([[1, 0], [-1, 0], [0, 1], [0, -1]]);
      const k = `${x + dx},${y + dy}`;
      if (!kume.has(k)) { kume.add(k); h.push([x + dx, y + dy]); }
    }
    const xs = h.map((p) => p[0]);
    const ys = h.map((p) => p[1]);
    const genis = Math.max(...xs) - Math.min(...xs);
    const yuksek = Math.max(...ys) - Math.min(...ys);
    if (genis <= 3 && yuksek <= 3 && kiralMi(h)) return h;
  }
  return [[0, 0], [1, 0], [0, 1], [0, 2], [-1, 2]]; // yedek: kiral beşli
}

// Şekli ağırlık merkezine göre çizer; vb: iki resimde aynı ölçek için görüş kutusu yarıçapı
function parcaCiz(h, { aci, ayna, isaret, vb }) {
  const cx = h.reduce((t, p) => t + p[0], 0) / h.length;
  const cy = h.reduce((t, p) => t + p[1], 0) / h.length;
  const g = svg('g', { transform: `rotate(${aci}) scale(${ayna ? -1 : 1} 1)` },
    h.map(([x, y]) => svg('rect', { x: (x - cx - 0.5) * KARE, y: (y - cy - 0.5) * KARE, width: KARE, height: KARE, rx: 3, class: 'ayna-hucre' })),
    isaret && svg('circle', { cx: (h[0][0] - cx) * KARE, cy: (h[0][1] - cy) * KARE, r: KARE * 0.22, class: 'ayna-nokta' }));
  return svg('svg', { viewBox: `${-vb} ${-vb} ${vb * 2} ${vb * 2}`, class: 'ayna-sekil', 'aria-hidden': 'true', focusable: 'false' }, g);
}

function yaricap(h) {
  const cx = h.reduce((t, p) => t + p[0], 0) / h.length;
  const cy = h.reduce((t, p) => t + p[1], 0) / h.length;
  return Math.max(...h.map(([x, y]) => Math.hypot(Math.abs(x - cx) + 0.5, Math.abs(y - cy) + 0.5))) * KARE + 6;
}

export default {
  modul: 'goz',
  egzersiz: 'ayna-dondur',
  ad: 'Ayna mı, Döndürme mi?',
  ikon: 'ayna',
  kisaAciklama: 'B şekli, A şeklinin döndürülmüş hâli mi, yoksa ayna görüntüsü mü? Şekli zihninde çevirerek karar ver.',
  nasil: [
    `Her denemede iki şekil görürsün. Toplam ${DENEME} deneme var; şekiller her seferinde yeniden üretilir.`,
    '“Aynısı”: B’yi döndürünce A’nın üstüne tam oturur. “Ayna”: A’nın aynadaki görüntüsüdür; döndürmek yetmez.',
    'Acele etme, önce doğru karar ver. Klavyede 1 = aynısı, 2 = ayna görüntüsü.',
  ],
  seviyeler: SEVIYELER,
  otomatikSeviye: true,
  puanEtiketi: 'Doğru/dakika',
  puanAciklama: `Dakikada doğru karar. Her yanlış süreye ${HATA_CEZA_SN} saniye ekler.`,
  alanEtiketi: 'Ayna mı, döndürme mi? İki şekli karşılaştır, 1 ya da 2 ile yanıtla.',
  // S34-son: örnek L şekli; döndürülmüşü üst üste oturur, aynası oturmaz
  ornek() {
    const h = [[0, 0], [0, 1], [0, 2], [1, 2]];
    const vb = yaricap(h);
    const ciz = (aci, ayna) => parcaCiz(h, { aci, ayna, isaret: true, vb });
    return ornekListesi([
      { cizim: el('span', { sinif: 'egz-ornek__ikili' }, ciz(0, false), ciz(90, false)), metin: 'Yalnız dönmüş: “Aynısı”' },
      { cizim: el('span', { sinif: 'egz-ornek__ikili' }, ciz(0, false), ciz(0, true)), metin: 'Aynadaki gibi ters: “Ayna görüntüsü”' },
    ]);
  },

  baslat(ctx) {
    const { alan } = ctx;
    const sv = ctx.seviye;
    alan.classList.add('algi-alan', 'ayna-alan');
    Object.assign(ctx.ekstra, { hucre: sv.hucre, aciAdim: sv.acilar.includes(45) ? 45 : 90 });
    const toplamDeneme = denemeSayisi(ctx, DENEME); // S34-son: alıştırma > bant > 12
    const sira = karistir(Array.from({ length: toplamDeneme }, (_, i) => i % 2 === 0)); // true = ayna
    let deneme = 0;
    let panel = null;
    let aynaMi = false;

    const durum = el('p', { sinif: 'algi-durum' });
    const solKap = el('figure', {}, el('figcaption', { metin: 'A' }));
    const sagKap = el('figure', {}, el('figcaption', { metin: 'B' }));
    const panelKap = el('div', { sinif: 'flas-soru' });
    const geri = el('p', { sinif: 'algi-geri', 'aria-live': 'polite' });
    alan.append(durum, el('div', { sinif: 'ayna-cift', 'aria-hidden': 'true' }, solKap, sagKap), panelKap, geri);

    function yeniDeneme() {
      deneme += 1;
      aynaMi = sira[deneme - 1];
      const h = parcaUret(sv.hucre);
      const vb = yaricap(h);
      const taban = rastgeleSec([0, 90, 180, 270]);
      solKap.querySelector('svg')?.remove();
      sagKap.querySelector('svg')?.remove();
      solKap.prepend(parcaCiz(h, { aci: taban, ayna: false, isaret: sv.isaret, vb }));
      sagKap.prepend(parcaCiz(h, { aci: taban + rastgeleSec(sv.acilar), ayna: aynaMi, isaret: sv.isaret, vb }));
      durum.textContent = `Deneme ${deneme}/${toplamDeneme} · Yanlış ${ctx.sayac().yanlis}`;
      const odakIcerde = panelKap.contains(document.activeElement);
      panel = secenekPaneli({
        baslik: 'B şekli A’nın…',
        secenekler: ['Aynısı', 'Ayna görüntüsü'],
        // D06: ok tuşları seçenekler arasında gezinirken kazara yanıt vermesin diye kısayol değil
        tuslar: ['1', '2'],
        secince: cevap,
      });
      panelKap.replaceChildren(panel.kok);
      if (odakIcerde) panel.odakla();
    }

    function cevap(i) {
      if (!ctx.aktifMi()) return false;
      const dogru = aynaMi ? 1 : 0;
      panel.isaretle(i, dogru);
      if (i === dogru) {
        ctx.dogru(1, 'dogru');
        geriYaz(geri, 'dogru', aynaMi ? 'Doğru: ayna görüntüsü, döndürerek üst üste getiremezsin.' : 'Doğru: döndürünce üst üste oturuyor.');
      } else {
        ctx.yanlis(1, 'yanlis');
        geriYaz(geri, 'yanlis', aynaMi ? 'Bu sefer ayna görüntüsüydü. Bir köşeyi seçip iki şekilde izlemeyi dene.' : 'Bu sefer aynısıydı, yalnızca döndürülmüştü.');
      }
      ctx.sonra(() => {
        if (deneme < toplamDeneme) { yeniDeneme(); return; }
        ctx.ekstra.sureMs = Math.round(ctx.gecenSn() * 1000);
        ctx.bitir();
      }, i === dogru ? 1000 : 1900);
      return undefined;
    }

    alan.addEventListener('keydown', (e) => { if (ctx.aktifMi()) panel?.tus(e); });
    yeniDeneme();
  },

  degerlendir({ dogru, yanlis, sureSn, ekstra }) {
    const sn = Math.max(1, (ekstra.sureMs ?? sureSn * 1000) / 1000);
    const toplam = dogru + yanlis;
    return {
      puan: dakikaPuani(dogru, sn, yanlis * HATA_CEZA_SN),
      satirlar: [
        ['Şekil', `${ekstra.hucre ?? '-'} kare, ${ekstra.aciAdim ?? 90}° adım`],
        ['Karar başına', toplam ? `${sayiBicimle(sn / toplam, 1)} saniye` : '-'],
      ],
    };
  },

  stil: `
    .ayna-cift { display: grid; grid-template-columns: 1fr 1fr; gap: var(--b-3); inline-size: min(100%, 30rem); margin-inline: auto; }
    .ayna-cift figure { display: grid; justify-items: center; gap: var(--b-1); margin: 0; padding: var(--b-2); border-radius: var(--kose-m); background: var(--renk-yuzey-2); }
    .ayna-cift figcaption { font-weight: 800; color: var(--renk-metin-soluk); }
    .ayna-sekil { display: block; inline-size: 100%; aspect-ratio: 1; block-size: auto; }
    .ayna-hucre { fill: var(--renk-birincil); stroke: var(--renk-yuzey-2); stroke-width: 2; }
    .ayna-nokta { fill: var(--renk-gunes); stroke: var(--renk-metin); stroke-width: 1.5; }
    @media (forced-colors: active) { .ayna-hucre { fill: CanvasText; stroke: Canvas; } }
  `,
};
