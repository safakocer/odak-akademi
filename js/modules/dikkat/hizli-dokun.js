// Hızlı Dokun: beliren fener ışıklarına sönmeden dokun, gri sis karelerine dokunma (dikkat ve tepki denetimi; S34e: seviyeler sınıf bandından, görsel örnek)
import { el } from '../../core/ui.js';
import { ornekListesi } from '../../engine/exercise-frame.js';

export default {
  modul: 'dikkat',
  egzersiz: 'hizli-dokun',
  ad: 'Hızlı Dokun',
  ikon: 'isik', // başlıkta ve kartta aynı ikon
  kisaAciklama: 'Gözün ekranda, parmağın hazır. Yanan ışıkları sönmeden yakala.',
  nasil: [
    'Ekranda sarı ışıklar yanacak. Her biri kısa bir süre sonra söner.',
    'Işığa sönmeden dokun. Klavyede Boşluk ya da Enter tuşu en eski ışığı yakalar.',
    'Orta ve Zor seviyede gri sis kareleri de çıkar. Onlara dokunma, beklemeyi öğren.',
  ],
  sureSn: 30,
  seviyeler: [
    { ad: 'Kolay', boyut: 76, omurMs: 1700, aralikMs: 900, sis: 0 },
    { ad: 'Orta', boyut: 64, omurMs: 1300, aralikMs: 750, sis: 0.2 },
    { ad: 'Zor', boyut: 54, omurMs: 1000, aralikMs: 600, sis: 0.3 },
  ],
  etiketler: { dogru: 'Yakalanan ışık', yanlis: 'Hatalı dokunuş' },
  puanAciklama: 'Puan: yakalanan ışık eksi hatalı dokunuş.',
  alanEtiketi: 'Oyun alanı. Işık yanınca Boşluk tuşuna bas; yalnızca sis varken bekle.',
  // S34e: kısa yönergede görsel örnek
  ornek: () => ornekListesi([
    { cizim: el('span', { sinif: 'hd-isik hd-ornek' }), metin: 'Sarı ışık: dokun' },
    { cizim: el('span', { sinif: 'hd-sis hd-ornek' }), metin: 'Gri sis: dokunma' },
  ]),

  baslat(ctx) {
    const { alan, seviye: s } = ctx;
    const canli = []; // ekrandaki öğeler, eskiden yeniye
    ctx.ekstra.kacan = 0;

    function kaldir(o) {
      const i = canli.indexOf(o);
      if (i >= 0) canli.splice(i, 1);
      o.iptal();
      o.dugum.remove();
    }

    // Diğer öğelerle üst üste binmeyen bir yer dene
    function yerBul() {
      const enX = Math.max(0, alan.clientWidth - s.boyut);
      const enY = Math.max(0, alan.clientHeight - s.boyut);
      let x = 0;
      let y = 0;
      for (let i = 0; i < 8; i++) {
        x = Math.random() * enX;
        y = Math.random() * enY;
        if (canli.every((o) => Math.hypot(o.x - x, o.y - y) > s.boyut * 1.1)) break;
      }
      return { x, y };
    }

    function olustur() {
      const sis = Math.random() < s.sis;
      const { x, y } = yerBul();
      const dugum = document.createElement('span');
      dugum.className = sis ? 'hd-sis' : 'hd-isik';
      dugum.style.cssText = `--boyut:${s.boyut}px;left:${x}px;top:${y}px`;
      const o = { dugum, sis, x, y };
      o.iptal = ctx.sonra(() => {
        if (!sis) ctx.ekstra.kacan += 1;
        kaldir(o);
      }, sis ? s.omurMs * 1.3 : s.omurMs);
      canli.push(o);
      alan.append(dugum);
    }

    function vur(o) {
      kaldir(o);
      if (o.sis) ctx.yanlis();
      else ctx.dogru(1, 'tik');
    }

    alan.addEventListener('pointerdown', (e) => {
      if (!ctx.aktifMi()) return;
      e.preventDefault();
      const hedef = e.target.closest('.hd-isik, .hd-sis');
      const o = canli.find((x) => x.dugum === hedef);
      if (o) vur(o);
      else ctx.yanlis(); // boşluğa dokunmak da sayılır (rastgele dokunmayı önler)
    });

    alan.addEventListener('keydown', (e) => {
      if (e.key !== ' ' && e.key !== 'Enter') return;
      e.preventDefault();
      if (e.repeat || !ctx.aktifMi()) return;
      const o = canli.find((x) => !x.sis);
      if (o) vur(o);
      else ctx.yanlis();
    });

    ctx.sonra(olustur, 300);
    ctx.her(olustur, s.aralikMs);
  },

  degerlendir({ dogru, yanlis, ekstra }) {
    const toplam = dogru + yanlis + ekstra.kacan;
    return {
      puan: Math.max(0, dogru - yanlis),
      isabet: toplam ? Math.round((dogru * 100) / toplam) : 0,
      satirlar: [['Kaçan ışık', ekstra.kacan]],
    };
  },

  stil: `
    .hd-isik, .hd-sis { position: absolute; width: var(--boyut); height: var(--boyut); cursor: pointer; animation: hd-yan 160ms ease-out both; }
    /* Renkler yalnız tokens.css belirteçlerinden (açık ve koyu temada kendiliğinden uyar); animasyon base.css'teki genel kuralla kapanır */
    .hd-isik {
      border-radius: 50%;
      background: radial-gradient(circle at 50% 45%, var(--renk-gunes-zemin) 0 18%, var(--renk-gunes) 46%, var(--renk-gunes-golge) 74%);
      box-shadow: 0 0 0 3px var(--renk-birincil), 0 0 16px 4px var(--renk-gunes);
    }
    .hd-sis {
      border-radius: 24%;
      background: repeating-linear-gradient(135deg, var(--renk-kenar-guclu) 0 6px, var(--renk-kenar) 6px 12px);
      box-shadow: inset 0 0 0 3px var(--renk-metin-soluk);
    }
    .hd-ornek { position: relative; display: block; --boyut: 2.5rem; animation: none; cursor: default; }
    @keyframes hd-yan { from { opacity: 0; transform: scale(0.4); } }
  `,
};
