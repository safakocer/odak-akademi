// Satır Ritmi (D06: yıldız halkası kontrastı; S34-son: ilkokulda satır, nokta ve ritim sınıf bandından, sayfa sayısı denemeSayisi ile (alıştırma 1 sayfa), örnek): ışık satırda soldan sağa ritimle ilerler, satır sonunda alttaki satırın başına geçer; yıldız sayımıyla dikkat denetimi
import { el } from '../../core/ui.js';
import { duyur, odakla } from '../../core/a11y.js';
import { karistir } from '../../core/utils.js';
import { ornekListesi } from '../../engine/exercise-frame.js';
import { denemeSayisi } from '../../engine/attention-core.js';

const SAYFA_SAYISI = 3;
const YILDIZ = '★';
const SECENEKLER = [0, 1, 2, 3];
let ritimSesi = false; // oturum boyunca hatırlanır

const yildizMetni = (n) => (n ? `${n} yıldız vardı` : 'hiç yıldız yoktu');

export default {
  modul: 'goz',
  egzersiz: 'satir-ritmi',
  ad: 'Satır Ritmi',
  ikon: 'satirlar',
  kisaAciklama: 'Gözünün satırda düzenli ilerlemesini ve satır başına rahatça geçmesini çalış.',
  nasil: [
    'Işık her satırda soldan sağa, eşit aralıklarla ilerler. Başını sabit tut, gözlerinle izle.',
    'Satır bitince alttaki satırın başı belirginleşir; gözünü oraya taşı, ışık oradan devam eder.',
    `Işık bazen yıldıza (${YILDIZ}) dönüşür. Yıldızları say; sayfa bitince kaç tane gördüğünü seç.`,
  ],
  seviyeler: [
    { ad: 'Kolay', satir: 4, nokta: 4, vurusMs: 750, yildiz: [1, 2] },
    { ad: 'Orta', satir: 5, nokta: 5, vurusMs: 600, yildiz: [0, 3] },
    { ad: 'Zor', satir: 6, nokta: 6, vurusMs: 480, yildiz: [0, 3] },
  ],
  etiketler: { dogru: 'Doğru sayım', yanlis: 'Farklı sayım' },
  puanEtiketi: 'Sayım puanı',
  puanAciklama: 'Yıldızları doğru saydığın sayfaların yüzdesi.',
  alanEtiketi: 'Satır ritmi alanı. Sayfa bitince 0 ile 3 arasında bir rakam tuşuna basarak yanıt verebilirsin.',
  ornek: () => ornekListesi([
    { cizim: el('span', { sinif: 'sr-nokta sr-nokta--yanik' }), metin: 'Işık: gözünle izle' },
    { cizim: el('span', { sinif: 'sr-nokta sr-nokta--yildiz', metin: YILDIZ }), metin: 'Yıldız: say' },
  ]),

  hazirlik() {
    return el('div', { sinif: 'okuma-ayar' },
      el('label', { sinif: 'okuma-ayar__secenek' },
        el('input', { type: 'checkbox', name: 'ritimSesi', checked: ritimSesi, onchange: (e) => { ritimSesi = e.target.checked; } }),
        el('span', { metin: 'Ritim sesi: her adımda hafif bir tık (Ayarlar’da ses açık olmalı)' })));
  },

  baslat(ctx) {
    const { alan, seviye: s } = ctx;
    const sayfaSayisi = denemeSayisi(ctx, SAYFA_SAYISI); // S34-son: alıştırmada 1 sayfa
    Object.assign(ctx.ekstra, { sayfa: 0, satir: 0, vurusMs: s.vurusMs });
    alan.classList.add('sr-alan');
    const durumEl = el('p', { sinif: 'sr-durum' });
    const sayfaEl = el('div', { sinif: 'sr-sayfa', 'aria-hidden': 'true' });
    const soruEl = el('section', { sinif: 'sr-soru', hidden: true, 'aria-labelledby': 'sr-soru-baslik' });
    alan.append(durumEl, sayfaEl, soruEl);

    let sayfaNo = 0;
    let yildizSayisi = 0;
    let satirlar = [];
    let adimDurdur = null;
    let cevapBekliyor = false;
    let cevapla = () => {};

    function sayfaKur() {
      sayfaNo += 1;
      durumEl.textContent = `Sayfa ${sayfaNo} / ${sayfaSayisi}`;
      const [en, enCok] = s.yildiz;
      yildizSayisi = en + Math.floor(Math.random() * (enCok - en + 1));
      const yildizlar = new Set(karistir([...Array(s.satir * s.nokta).keys()]).slice(0, yildizSayisi));
      satirlar = Array.from({ length: s.satir }, (_, r) => {
        const noktalar = Array.from({ length: s.nokta }, (_, d) => ({ dugum: el('span', { sinif: 'sr-nokta' }), yildiz: yildizlar.has(r * s.nokta + d) }));
        return { dugum: el('div', { sinif: 'sr-satir' }, noktalar.map((x) => x.dugum)), noktalar };
      });
      sayfaEl.replaceChildren(...satirlar.map((x) => x.dugum));
      soruEl.hidden = true;
      soruEl.replaceChildren();
      sayfaEl.hidden = false;
      odakla(alan, { kaydir: false });

      // Adımlar: satır başını göster → noktalar soldan sağa → sonraki satırın başı → …
      const adimlar = [];
      for (let r = 0; r < s.satir; r++) {
        adimlar.push({ gecis: r });
        for (let d = 0; d < s.nokta; d++) adimlar.push({ r, d });
      }
      let i = 0;
      let yanik = null;
      adimDurdur = ctx.her(() => {
        if (yanik) { yanik.dugum.classList.remove('sr-nokta--yanik', 'sr-nokta--yildiz'); yanik.dugum.textContent = ''; yanik = null; }
        const a = adimlar[i++];
        if (!a) { sayfaBitti(); return; }
        if (a.gecis !== undefined) {
          satirlar[a.gecis - 1]?.dugum.classList.remove('sr-satir--etkin');
          satirlar[a.gecis].dugum.classList.add('sr-satir--sonraki');
          return;
        }
        const satir = satirlar[a.r];
        if (a.d === 0) { satir.dugum.classList.remove('sr-satir--sonraki'); satir.dugum.classList.add('sr-satir--etkin'); }
        yanik = satir.noktalar[a.d];
        yanik.dugum.classList.add('sr-nokta--yanik');
        if (yanik.yildiz) { yanik.dugum.classList.add('sr-nokta--yildiz'); yanik.dugum.textContent = YILDIZ; }
        if (ritimSesi) ctx.ses('tik');
      }, s.vurusMs);
    }

    function sayfaBitti() {
      adimDurdur?.();
      adimDurdur = null;
      ctx.ekstra.satir += s.satir;
      sayfaEl.hidden = true;
      const baslik = el('h3', { id: 'sr-soru-baslik', metin: 'Bu sayfada kaç yıldız gördün?' });
      const dugmeler = SECENEKLER.map((n) => el('button', { type: 'button', sinif: 'btn btn--ikincil sr-secenek', metin: String(n), onclick: () => cevapla(n) }));
      const geri = el('p', { sinif: 'sr-geri' });
      soruEl.replaceChildren(baslik, el('div', { sinif: 'sr-secenekler', role: 'group', 'aria-labelledby': 'sr-soru-baslik' }, dugmeler), geri);
      soruEl.hidden = false;
      cevapBekliyor = true;
      odakla(baslik);

      cevapla = (n) => {
        if (!cevapBekliyor || !ctx.aktifMi()) return;
        cevapBekliyor = false;
        ctx.ekstra.sayfa += 1;
        const dogruMu = n === yildizSayisi;
        dugmeler.forEach((d, i) => { d.disabled = true; d.setAttribute('aria-pressed', String(SECENEKLER[i] === n)); });
        if (dogruMu) ctx.dogru();
        else ctx.yanlis();
        geri.textContent = dogruMu
          ? `Doğru! Bu sayfada ${yildizMetni(yildizSayisi)}.`
          : `Bu sayfada ${yildizMetni(yildizSayisi)}. Sonraki sayfada ışığı adım adım izlemeyi dene.`;
        const son = sayfaNo >= sayfaSayisi;
        const ileri = el('button', { type: 'button', sinif: 'btn btn--birincil', metin: son ? 'Sonucu gör' : 'Sonraki sayfa',
          onclick: () => { if (!ctx.aktifMi()) return; if (son) ctx.bitir(); else sayfaKur(); } });
        soruEl.append(ileri);
        ileri.focus();
        duyur(geri.textContent);
      };
    }

    // Klavye kısayolu: soru açıkken 0-3 rakamları
    alan.addEventListener('keydown', (e) => {
      if (!cevapBekliyor || !/^[0-3]$/.test(e.key)) return;
      e.preventDefault();
      cevapla(Number(e.key));
    });

    sayfaKur();
  },

  degerlendir({ dogru, yanlis, ekstra }) {
    const sayfa = dogru + yanlis;
    const isabet = sayfa ? Math.round((dogru * 100) / sayfa) : 0;
    return {
      puan: isabet,
      isabet,
      satirlar: [['İzlenen satır', ekstra.satir ?? 0], ['Ritim', `dakikada ${Math.round(60000 / (ekstra.vurusMs || 600))} adım`]],
    };
  },

  stil: `
    .egz-alan.sr-alan { display: flex; flex-direction: column; gap: var(--b-3); padding: var(--b-4); overflow: auto; }
    .sr-alan [hidden] { display: none !important; }
    .sr-durum { margin: 0; font-weight: 700; color: var(--renk-metin-soluk); }
    .sr-sayfa { display: grid; flex: 1; align-content: center; gap: var(--b-3); width: 100%; max-width: 44rem; margin-inline: auto; }
    .sr-satir {
      position: relative; display: flex; justify-content: space-between; align-items: center;
      padding: var(--b-1) var(--b-2); border-radius: var(--kose-s); border-inline-start: 4px solid transparent;
    }
    .sr-satir::before { content: ""; position: absolute; inset-inline: var(--b-4); top: 50%; border-top: 2px dashed var(--renk-kenar); }
    .sr-satir--etkin { background: var(--renk-yuzey-2); }
    /* Satır geçişi: bir sonraki satırın başı belirginleşir */
    .sr-satir--sonraki { border-inline-start-color: var(--renk-birincil); background: var(--renk-birincil-zemin); }
    .sr-nokta {
      position: relative; z-index: 1; display: grid; place-items: center; width: 2.25rem; height: 2.25rem;
      font-size: 1.25rem; line-height: 1; color: var(--renk-gunes-uzeri);
    }
    .sr-nokta::before {
      content: ""; position: absolute; inset: 0.75rem; z-index: -1; border-radius: 50%;
      background: var(--renk-kenar-guclu); transition: inset var(--sure-hizli) var(--egri);
    }
    .sr-nokta--yanik::before { inset: 0.125rem; background: var(--renk-birincil); }
    /* Yıldız: renk + biçim + işaret (yalnız renge dayanmaz) */
    .sr-nokta--yildiz::before { inset: 0; border-radius: 28%; background: var(--renk-gunes); box-shadow: 0 0 0 2px var(--renk-uyari); } /* D06: halka 3:1 üstü */
    .sr-soru { display: grid; justify-items: center; gap: var(--b-3); max-width: 28rem; margin: auto; text-align: center; }
    .sr-soru h3, .sr-soru p { margin: 0; }
    .sr-secenekler { display: flex; flex-wrap: wrap; justify-content: center; gap: var(--b-2); }
    .sr-secenek { min-width: 3.5rem; min-height: 3.5rem; font-size: var(--fs-l); }
    .sr-secenek[aria-pressed="true"] { outline: 3px solid var(--renk-birincil); outline-offset: 2px; }
  `,
};
