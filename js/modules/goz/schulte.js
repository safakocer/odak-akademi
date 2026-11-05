// Schulte tablosu (D06: puan ortak dakikaPuani ile): karışık dizilmiş sayıları 1'den başlayarak sırayla bulma (düzenli görsel tarama); 3×3-7×7, sade / renkli / sessiz çeldirici
import { el } from '../../core/ui.js';
import { sayiBicimle, karistir, dakikaPuani } from '../../core/utils.js';
import { hazirlikSecimi } from '../../engine/exercise-frame.js';

const HATA_CEZA_SN = 2;   // her hatalı dokunuş puan hesabında süreye eklenir
const RENK_SAYISI = 6;    // renkli çeldiricide kullanılan zemin/metin çifti (stil: .sch-r1 … .sch-r6)
const CELDIRICILER = Object.freeze([
  { deger: 'sade', etiket: 'Sade', aciklama: 'düz tablo, bulduğun sayılar işaretlenir' },
  { deger: 'renkli', etiket: 'Renkli çeldirici', aciklama: 'kareler karışık renkli; renkler ipucu değildir' },
  { deger: 'sessiz', etiket: 'Sessiz çeldirici', aciklama: 'sayılar farklı boy ve açıda, bulunanlar işaretlenmez' },
]);
let celdirici = 'sade'; // seçim oturum boyunca hatırlanır

const rastgele = (en, enCok) => en + Math.random() * (enCok - en);

export default {
  modul: 'goz',
  egzersiz: 'schulte',
  ad: 'Schulte Tablosu',
  ikon: 'izgara',
  kisaAciklama: 'Gözünü tabloda düzenli gezdirerek sayıları sırayla bul.',
  nasil: [
    'Tablodaki sayıları 1’den başlayarak sırayla bul ve dokun.',
    `Yanlış sayıya dokunursan sorun değil, aramaya devam et. Her hata süreye ${HATA_CEZA_SN} saniye ekler.`,
    'İpucu: bakışını tablonun ortasında tutup sayıları çevresinde aramayı dene. Klavyede oklarla gezin, Enter ile seç.',
  ],
  seviyeler: [3, 4, 5, 6, 7].map((n) => ({ ad: `${n}×${n}`, boyut: n })),
  etiketler: { dogru: 'Bulunan sayı', yanlis: 'Hatalı dokunuş' },
  puanEtiketi: 'Sayı/dakika',
  puanAciklama: `Dakikada bulunan sayı. Her hatalı dokunuş süreye ${HATA_CEZA_SN} saniye ekler.`,
  alanEtiketi: 'Schulte tablosu. Tab ile tabloya geç, ok tuşlarıyla gezin, Enter ile seç.',

  hazirlik() {
    return el('div', { sinif: 'okuma-ayar' }, hazirlikSecimi({
      ad: 'celdirici', baslik: 'Çeldirici', secenekler: CELDIRICILER, secili: celdirici,
      degisince: (d) => { celdirici = d; },
    }));
  },

  baslat(ctx) {
    const { alan } = ctx;
    const n = ctx.seviye.boyut;
    const toplam = n * n;
    const tur = celdirici;
    Object.assign(ctx.ekstra, { boyut: n, celdirici: tur });
    alan.classList.add('sch-alan');

    let hedef = 1;
    let odakSira = 0;
    const sonrakiEl = el('strong', { metin: '1' });
    const ust = el('p', { sinif: 'sch-ust', 'aria-live': 'polite' }, 'Sıradaki sayı: ', sonrakiEl);
    const hucreler = karistir(Array.from({ length: toplam }, (_, i) => i + 1)).map((s, i) => {
      const ic = el('span', { metin: String(s) });
      if (tur === 'sessiz') ic.style.cssText = `--olcek:${rastgele(0.7, 1.2).toFixed(2)};--aci:${Math.round(rastgele(-14, 14))}deg`;
      const renk = tur === 'renkli' ? ` sch-r${1 + Math.floor(Math.random() * RENK_SAYISI)}` : '';
      return el('button', { type: 'button', sinif: `sch-hucre${renk}`, tabindex: i === 0 ? '0' : '-1', 'data-sayi': String(s) }, ic);
    });
    const tablo = el('div', { sinif: `sch-tablo sch-tablo--${tur}`, role: 'group', 'aria-label': `${n} satır, ${n} sütunlu sayı tablosu`, style: `--n:${n}` }, hucreler);
    alan.append(ust, tablo);

    // Klavye: tabloda tek sekme durağı, oklarla gezinme
    function odakTasi(yeni) {
      hucreler[odakSira].tabIndex = -1;
      odakSira = (yeni + toplam) % toplam;
      hucreler[odakSira].tabIndex = 0;
      hucreler[odakSira].focus();
    }
    tablo.addEventListener('keydown', (e) => {
      const adim = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: n, ArrowUp: -n }[e.key];
      if (adim !== undefined) { e.preventDefault(); odakTasi(odakSira + adim); }
      else if (e.key === 'Home') { e.preventDefault(); odakTasi(0); }
      else if (e.key === 'End') { e.preventDefault(); odakTasi(toplam - 1); }
    });

    tablo.addEventListener('click', (e) => {
      const h = e.target.closest('.sch-hucre');
      if (!h || !ctx.aktifMi()) return;
      const i = hucreler.indexOf(h);
      if (i !== odakSira) { hucreler[odakSira].tabIndex = -1; odakSira = i; h.tabIndex = 0; }
      const s = Number(h.dataset.sayi);
      if (s < hedef) return; // zaten bulunmuş sayı: hata sayılmaz
      if (s !== hedef) {
        ctx.yanlis();
        h.classList.remove('sch-hucre--hata');
        void h.offsetWidth; // animasyon yeniden başlasın
        h.classList.add('sch-hucre--hata');
        ctx.sonra(() => h.classList.remove('sch-hucre--hata'), 450);
        return;
      }
      if (tur !== 'sessiz') {
        h.classList.add('sch-hucre--bulundu');
        h.setAttribute('aria-label', `${s}, bulundu`);
      }
      ctx.dogru(1, 'tik');
      hedef += 1;
      if (hedef > toplam) {
        ctx.ekstra.sureMs = Math.round(ctx.gecenSn() * 1000);
        ctx.bitir();
        return;
      }
      sonrakiEl.textContent = String(hedef);
    });
  },

  degerlendir({ dogru, yanlis, sureSn, ekstra }) {
    const sn = Math.max(0.1, (ekstra.sureMs ?? sureSn * 1000) / 1000);
    const puan = dakikaPuani(dogru, sn, yanlis * HATA_CEZA_SN);
    const celd = CELDIRICILER.find((c) => c.deger === ekstra.celdirici)?.etiket ?? 'Sade';
    return {
      puan,
      satirlar: [
        ['Tablo', `${ekstra.boyut}×${ekstra.boyut}, ${celd}`],
        ['Tablo süresi', `${sayiBicimle(sn, 1)} saniye`],
        ['Sayı başına', dogru ? `${sayiBicimle(sn / dogru, 1)} saniye` : '-'],
      ],
    };
  },

  stil: `
    .egz-alan.sch-alan { display: flex; flex-direction: column; align-items: center; gap: var(--b-3); padding: var(--b-3) 0; overflow: auto; }
    .sch-ust { margin: 0; font-size: var(--fs-l); }
    .sch-ust strong { font-size: var(--fs-xl); font-variant-numeric: tabular-nums; }
    /* Tablo kare; 360 px'te 7×7 kareler ~44 px. Yatay telefonda alan kaydırılır */
    .sch-tablo {
      display: grid; grid-template-columns: repeat(var(--n), 1fr); gap: 3px; flex: none; aspect-ratio: 1;
      width: min(calc(100vw - 2rem), 34rem, max(calc(100vh - 16rem), calc(var(--n) * 2.75rem + 1rem)));
      width: min(calc(100vw - 2rem), 34rem, max(calc(100dvh - 16rem), calc(var(--n) * 2.75rem + 1rem)));
      container-type: inline-size;
    }
    .sch-hucre {
      display: grid; place-items: center; min-width: 0; min-height: 0; padding: 0; overflow: hidden;
      border: 2px solid var(--renk-kenar); border-radius: var(--kose-s);
      background: var(--renk-yuzey-2); color: var(--renk-metin);
      font: inherit; font-weight: 700; font-variant-numeric: tabular-nums; cursor: pointer; touch-action: manipulation;
      font-size: var(--fs-l);
      font-size: calc(100cqi / var(--n) * 0.42);
    }
    .sch-hucre:focus-visible { outline: 3px solid var(--renk-odak); outline-offset: 1px; position: relative; z-index: 1; }
    .sch-hucre span { display: inline-block; transform: rotate(var(--aci, 0deg)) scale(var(--olcek, 1)); }
    .sch-r1 { background: var(--renk-birincil-zemin); color: var(--renk-birincil); }
    .sch-r2 { background: var(--renk-vurgu-zemin); color: var(--renk-vurgu-metin); }
    .sch-r3 { background: var(--renk-gunes-zemin); color: var(--renk-gunes-uzeri); }
    .sch-r4 { background: var(--renk-bilgi-zemin); color: var(--renk-bilgi); }
    .sch-r5 { background: var(--renk-basari-zemin); color: var(--renk-basari); }
    .sch-r6 { background: var(--modul-goz); color: var(--modul-goz-ikon); }
    /* Bulunan: renk + iç halka (yalnız renge dayanmaz) */
    .sch-hucre--bulundu { background: var(--renk-birincil); color: var(--renk-birincil-uzeri); border-color: var(--renk-birincil); box-shadow: inset 0 0 0 3px var(--renk-birincil-uzeri); }
    .sch-hucre--hata { border-color: var(--renk-vurgu-metin); border-style: dashed; animation: sch-titre 240ms ease-out; }
    @keyframes sch-titre { 25% { translate: -3px 0; } 75% { translate: 3px 0; } }
  `,
};
