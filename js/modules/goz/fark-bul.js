// Farkı Bul (S10; D06: Kolay'da yalnız renk farkı yok, dikey ekranda iki resim birlikte sığar, ipucu halkası AA; S34-son: nesne/fark sayısı sınıf bandından, resim sayısı denemeSayisi ile (alıştırma 1 resim), örnek): programla üretilen iki resim arasındaki farkları bulma; her resimde farklı fark sayısı, ipucu, klavyeyle nokta seçimi
import { el } from '../../core/ui.js';
import { sayiBicimle, karistir, sinirla, dakikaPuani } from '../../core/utils.js';
import { svg, sekilCiz, simgeSvg, SEKILLER, SEKIL_ADLARI, RENKLER, rastgeleSec, rastgeleTam, digeriniSec, noktaSvgde, geriYaz, yuvarla } from '../../engine/algi.js';
import { ornekListesi } from '../../engine/exercise-frame.js';
import { denemeSayisi } from '../../engine/attention-core.js';

const RESIM_SAYISI = 3;          // bir turdaki resim çifti
const GEN = 320;                 // resim boyutu (viewBox)
const YUK = 220;
const SUTUN = 6;                 // nesneler 6×4 hücreye yerleşir (üst üste binmez)
const SATIR = 4;
const HATA_CEZA_SN = 2;          // puan hesabında her yanlış dokunuş süreye eklenir
const IPUCU_CEZA_SN = 5;
const BOS_NOKTA = 3;             // klavye gezinmesinde boş hücre noktaları (boş yer ipucu vermesin)
const RENK_DEGERLERI = RENKLER.map((r) => r.deger);

/** Fark türleri: yok (bir resimde eksik), renk, sekil, boyut, don (döndürülmüş), kay (yeri kaymış).
 *  D06: Kolay'da yalnız renkle ayırt edilen fark yok (renk ayırt etme güçlüğü olan öğrenci de bitirebilsin) */
const SEVIYELER = Object.freeze([
  { ad: 'Kolay', nesne: 9, fark: [3, 4], boyut: [36, 46], turler: ['yok', 'sekil', 'boyut'] },
  { ad: 'Orta', nesne: 13, fark: [4, 6], boyut: [30, 40], turler: ['yok', 'renk', 'sekil', 'boyut', 'don'] },
  { ad: 'Zor', nesne: 17, fark: [6, 8], boyut: [26, 36], turler: ['yok', 'renk', 'sekil', 'boyut', 'don', 'kay'] },
]);

// Bir resim çifti üretir: { sol, sag (nesne listeleri), farklar, noktalar (klavye için) }
function sahneUret(sv) {
  const hG = GEN / SUTUN;
  const hY = YUK / SATIR;
  const merkez = (h) => ({ x: ((h % SUTUN) + 0.5) * hG, y: (Math.floor(h / SUTUN) + 0.5) * hY });
  const hucreler = karistir([...Array(SUTUN * SATIR).keys()]);
  const sol = hucreler.slice(0, sv.nesne).map((h, id) => {
    const sekil = rastgeleSec(SEKIL_ADLARI);
    const m = merkez(h);
    return {
      id, sekil, renk: rastgeleSec(RENK_DEGERLERI), boyut: rastgeleTam(...sv.boyut),
      x: m.x + rastgeleTam(-3, 3), y: m.y + rastgeleTam(-3, 3),
      aci: SEKILLER[sekil].don ? rastgeleSec([0, 90, 180, 270]) : 0,
    };
  });
  const sag = sol.map((n) => ({ ...n }));
  const farklar = karistir(sol).slice(0, rastgeleTam(...sv.fark)).map((n) => {
    let tur = rastgeleSec(sv.turler);
    if (tur === 'don' && !SEKILLER[n.sekil].don) tur = 'sekil'; // dönünce değişmeyen şekilde şekil değişir
    const s = sag[n.id];
    if (tur === 'yok') (Math.random() < 0.5 ? s : n).yok = true; // eksik nesne bazen solda, bazen sağda
    else if (tur === 'renk') s.renk = digeriniSec(RENK_DEGERLERI, n.renk);
    else if (tur === 'sekil') { s.sekil = digeriniSec(SEKIL_ADLARI, n.sekil); s.aci = 0; }
    else if (tur === 'boyut') s.boyut = Math.round(n.boyut * (n.boyut >= 34 ? 0.6 : 1.45));
    else if (tur === 'don') s.aci = (n.aci + rastgeleSec([90, 180])) % 360;
    else if (tur === 'kay') s.x = sinirla(n.x + rastgeleSec([-12, 12]), 18, GEN - 18);
    return {
      tur, bulundu: false,
      x: (n.x + s.x) / 2, y: n.y,
      r: Math.max(n.boyut, s.boyut) * 0.55 + (tur === 'kay' ? 14 : 8), // dokunma hedefi şeklin biraz dışına taşar
    };
  });
  const noktalar = [...sol, ...hucreler.slice(sv.nesne, sv.nesne + BOS_NOKTA).map(merkez)]
    .map(({ x, y }) => ({ x, y }))
    .sort((a, b) => (Math.floor(a.y / hY) - Math.floor(b.y / hY)) || a.x - b.x);
  return { sol, sag, farklar, noktalar };
}

function resimCiz(liste, etiket, etkilesimli) {
  const isaretler = svg('g', { class: 'fark-isaretler' });
  const kok = svg('svg', { viewBox: `0 0 ${GEN} ${YUK}`, class: 'fark-resim', role: etkilesimli ? 'group' : 'img', 'aria-label': etiket },
    svg('rect', { x: 0, y: 0, width: GEN, height: YUK, class: 'fark-zemin' }),
    svg('rect', { x: 0, y: YUK * 0.74, width: GEN, height: YUK * 0.26, class: 'fark-yer' }),
    svg('g', {}, liste.filter((n) => !n.yok).map((n) => sekilCiz(n.sekil, n))),
    isaretler);
  return { kok, isaretler };
}

export default {
  modul: 'goz',
  egzersiz: 'fark-bul',
  ad: 'Farkı Bul',
  ikon: 'fark',
  kisaAciklama: 'İki resmi dikkatle karşılaştır, aralarındaki farkları bul.',
  nasil: [
    `Her turda ${RESIM_SAYISI} resim çifti var. Her çiftte farklı sayıda fark saklı; kaç fark kaldığı yukarıda yazar.`,
    'Farkı gördüğün yere iki resimden birinde dokun. Renk, şekil, boyut, yön değişmiş ya da bir şekil eksik olabilir.',
    'Takılırsan “İpucu”ya bas. Klavyede: B resmine geç, oklarla noktalar arasında gezin, Enter ile işaretle.',
  ],
  seviyeler: SEVIYELER,
  etiketler: { dogru: 'Bulunan fark', yanlis: 'Boş dokunuş' },
  puanEtiketi: 'Fark/dakika',
  puanAciklama: `Dakikada bulunan fark. Her boş dokunuş süreye ${HATA_CEZA_SN}, her ipucu ${IPUCU_CEZA_SN} saniye ekler.`,
  alanEtiketi: 'Farkı bul. İki resim arasındaki farkları işaretle.',
  ornek: () => ornekListesi([
    { cizim: el('span', { sinif: 'egz-ornek__ikili' }, simgeSvg('daire'), simgeSvg('kare')), metin: 'Şekil değişmiş: bu bir fark' },
    { cizim: el('span', { sinif: 'egz-ornek__ikili' }, simgeSvg('daire'), simgeSvg('daire', { boyut: 55 })), metin: 'Boyu değişmiş: bu da fark' },
  ]),

  baslat(ctx) {
    const { alan } = ctx;
    const sv = ctx.seviye;
    alan.classList.add('algi-alan', 'fark-alan');
    const resimSayisi = denemeSayisi(ctx, RESIM_SAYISI); // S34-son: alıştırmada 1 resim
    Object.assign(ctx.ekstra, { nesne: sv.nesne });

    let resimNo = 0;
    let ipucu = 0;
    let toplamFark = 0;
    let sahne = null;
    let a = null;
    let b = null;
    let noktaEls = [];
    let kilit = false;

    const durum = el('p', { sinif: 'algi-durum' });
    const geri = el('p', { sinif: 'algi-geri', 'aria-live': 'polite' });
    const ipucuDugme = el('button', { type: 'button', sinif: 'btn btn--ikincil btn--kucuk', metin: 'İpucu', onclick: ipucuVer });
    const resimler = el('div', { sinif: 'fark-resimler' });
    alan.append(el('div', { sinif: 'algi-ust' }, durum, ipucuDugme), resimler, geri);

    const bulunan = () => sahne.farklar.filter((f) => f.bulundu).length;
    function durumYaz() {
      durum.textContent = `Resim ${resimNo}/${resimSayisi} · Bulunan ${bulunan()}/${sahne.farklar.length} · Boş dokunuş ${ctx.sayac().yanlis}`;
    }

    function yeniResim() {
      resimNo += 1;
      kilit = false;
      sahne = sahneUret(sv);
      toplamFark += sahne.farklar.length;
      a = resimCiz(sahne.sol, 'Resim A', false);
      b = resimCiz(sahne.sag, 'Resim B. Ok tuşlarıyla noktalar arasında gezin, Enter ile farkı işaretle.', true);
      noktaEls = sahne.noktalar.map((p, i) => svg('circle', {
        cx: yuvarla(p.x), cy: yuvarla(p.y), r: 22, class: 'fark-nokta', tabindex: i === 0 ? '0' : '-1', role: 'button', 'aria-label': `Nokta ${i + 1}`,
      }));
      b.kok.append(svg('g', {}, noktaEls));
      [a, b].forEach((r) => r.kok.addEventListener('click', (e) => {
        const p = noktaSvgde(r.kok, e);
        if (p) dene(p.x, p.y);
      }));
      b.kok.addEventListener('keydown', noktaTusu);
      const odakIcerde = resimler.contains(document.activeElement);
      resimler.replaceChildren(
        el('figure', { sinif: 'fark-kare' }, a.kok, el('figcaption', { metin: 'A', 'aria-hidden': 'true' })),
        el('figure', { sinif: 'fark-kare' }, b.kok, el('figcaption', { metin: 'B', 'aria-hidden': 'true' })));
      if (odakIcerde) noktaEls[0].focus();
      durumYaz();
      geriYaz(geri, null, `Bu resimde ${sahne.farklar.length} fark var.`);
    }

    function noktaTusu(e) {
      const i = noktaEls.indexOf(document.activeElement);
      if (i < 0) return;
      const adim = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
      if (adim) {
        e.preventDefault();
        const yeni = (i + adim + noktaEls.length) % noktaEls.length;
        noktaEls[i].setAttribute('tabindex', '-1');
        noktaEls[yeni].setAttribute('tabindex', '0');
        noktaEls[yeni].focus();
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        dene(Number(noktaEls[i].getAttribute('cx')), Number(noktaEls[i].getAttribute('cy')));
      }
    }

    function dene(x, y) {
      if (kilit || !ctx.aktifMi()) return;
      const yakin = (f) => Math.hypot(f.x - x, f.y - y) <= f.r;
      const f = sahne.farklar.find((g) => !g.bulundu && yakin(g));
      if (f) {
        f.bulundu = true;
        [a, b].forEach((r) => r.isaretler.append(svg('circle', { cx: yuvarla(f.x), cy: yuvarla(f.y), r: yuvarla(f.r), class: 'fark-halka' })));
        ctx.dogru(1, 'dogru');
        const kalan = sahne.farklar.length - bulunan();
        durumYaz();
        if (kalan) { geriYaz(geri, 'dogru', `Buldun! ${kalan} fark kaldı.`); return; }
        kilit = true;
        geriYaz(geri, 'dogru', resimNo >= resimSayisi ? 'Son resimdeki farkların hepsini buldun.' : 'Bu resimdeki farkların hepsini buldun. Sıradaki resim geliyor.');
        ctx.sonra(() => (resimNo >= resimSayisi ? bitir() : yeniResim()), 1300);
        return;
      }
      if (sahne.farklar.some((g) => g.bulundu && yakin(g))) return; // bulunmuş farka yeniden dokunmak hata değil
      ctx.yanlis(1, 'yanlis');
      const carpi = [a, b].map((r) => {
        const g = svg('path', { d: `M${yuvarla(x - 7)} ${yuvarla(y - 7)}l14 14M${yuvarla(x + 7)} ${yuvarla(y - 7)}l-14 14`, class: 'fark-carpi' });
        r.isaretler.append(g);
        return g;
      });
      ctx.sonra(() => carpi.forEach((g) => g.remove()), 700);
      durumYaz();
      geriYaz(geri, 'yanlis', 'Burada fark yok. Aramaya devam et.');
    }

    function ipucuVer() {
      if (kilit || !ctx.aktifMi()) return;
      const f = rastgeleSec(sahne.farklar.filter((g) => !g.bulundu));
      if (!f) return;
      ipucu += 1;
      const ip = svg('circle', {
        cx: yuvarla(f.x + rastgeleTam(-8, 8)), cy: yuvarla(f.y + rastgeleTam(-8, 8)), r: yuvarla(Math.max(f.r * 1.8, 40)), class: 'fark-ipucu',
      });
      b.isaretler.append(ip);
      ctx.sonra(() => ip.remove(), 2000);
      geriYaz(geri, null, 'İpucu: B resminde işaretli bölgeye yakından bak.');
    }

    function bitir() {
      Object.assign(ctx.ekstra, { resim: resimNo, fark: toplamFark, ipucu, sureMs: Math.round(ctx.gecenSn() * 1000) });
      ctx.bitir();
    }

    yeniResim();
  },

  degerlendir({ dogru, yanlis, sureSn, zorluk, ekstra }) {
    const sn = Math.max(1, (ekstra.sureMs ?? sureSn * 1000) / 1000);
    const ipucu = ekstra.ipucu ?? 0;
    const puan = dakikaPuani(dogru, sn, yanlis * HATA_CEZA_SN + ipucu * IPUCU_CEZA_SN);
    const isabet = dogru + yanlis ? Math.round((dogru * 100) / (dogru + yanlis)) : 0;
    // Seviye: isabet ≥%80 ve en çok 1 ipucu → üst; isabet <%50 ya da farkların yarısından çoğu ipucuyla → alt
    let sonrakiSeviye = zorluk;
    if (isabet >= 80 && ipucu <= 1) sonrakiSeviye = zorluk + 1;
    else if (isabet < 50 || ipucu * 2 > (ekstra.fark ?? dogru)) sonrakiSeviye = zorluk - 1;
    return {
      puan,
      sonrakiSeviye,
      satirlar: [
        ['Resim', `${ekstra.resim ?? RESIM_SAYISI} çift`],
        ['İpucu', ipucu],
        ['Fark başına', dogru ? `${sayiBicimle(sn / dogru, 1)} saniye` : '-'],
      ],
    };
  },

  stil: `
    .fark-resimler { display: grid; gap: var(--b-3); inline-size: min(100%, 64rem); margin-inline: auto; }
    /* Geniş ya da yatay ekranda yan yana */
    @media (min-width: 760px), (orientation: landscape) and (min-width: 560px) { .fark-resimler { grid-template-columns: 1fr 1fr; } }
    .fark-kare { position: relative; margin: 0; }
    /* D06: dikey telefonda iki resim alt alta ekrana birlikte sığsın (resim oranı 320:220; 17rem üst çubuk ve satırlar için) */
    @media (orientation: portrait) and (max-width: 759px) {
      .fark-kare { inline-size: min(100%, max(16rem, (100vh - 17rem) * 0.727)); margin-inline: auto; }
      .fark-kare { inline-size: min(100%, max(16rem, (100svh - 17rem) * 0.727)); }
    }
    .fark-kare figcaption { position: absolute; inset-block-start: var(--b-1); inset-inline-start: var(--b-2); font-weight: 800; color: var(--renk-metin-soluk); pointer-events: none; }
    .fark-resim { display: block; inline-size: 100%; block-size: auto; border: 2px solid var(--renk-kenar); border-radius: var(--kose-m); cursor: crosshair; touch-action: manipulation; user-select: none; -webkit-user-select: none; }
    .fark-zemin { fill: var(--renk-yuzey); }
    .fark-yer { fill: var(--renk-yuzey-2); }
    .fark-nokta { fill: transparent; }
    .fark-nokta:focus { outline: none; }
    .fark-nokta:focus-visible { stroke: var(--renk-odak); stroke-width: 3; stroke-dasharray: 5 4; }
    .fark-halka { fill: none; stroke: var(--renk-basari); stroke-width: 3.5; pointer-events: none; }
    .fark-carpi { fill: none; stroke: var(--renk-vurgu-metin); stroke-width: 4; stroke-linecap: round; pointer-events: none; }
    .fark-ipucu { fill: none; stroke: var(--renk-uyari); stroke-width: 3; stroke-dasharray: 8 6; pointer-events: none; animation: fark-ipucu 0.9s ease-in-out infinite alternate; }
    @keyframes fark-ipucu { to { opacity: 0.35; } }
    :root[data-hareket="azalt"] .fark-ipucu { animation: none; }
    @media (prefers-reduced-motion: reduce) { .fark-ipucu { animation: none; } }
    @media (forced-colors: active) { .fark-halka, .fark-ipucu { stroke: Highlight; } .fark-carpi { stroke: CanvasText; } }
  `,
};
