// Hedef Avı (İptal testi, S11b; d2 benzeri seçici dikkat): satır satır sembollere bak, yalnız hedefleri işaretle; hedef ve çeldirici kümesi basamakla zorlaşır. Satır süresi cömert, doğruluk öncelikli; ölçüm attention-core.js ile
import { el } from '../../core/ui.js';
import { karistir, sinirla } from '../../core/utils.js';
import { simgeSvg, SEKILLER, rastgeleTam, izgaraGezinme } from '../../engine/algi.js';
import { dikkatOyunu, dikkatSahnesi, dikkatBitir, olayZamani, KESINTI_MS } from '../../engine/attention-core.js';

const HUCRE = 12;         // satırdaki sembol sayısı (dar ekranda 6 + 6)
const GERI_MS = 1300;     // satır sonu geri bildirimi
const RENK = 'var(--renk-birincil)';

// Sembol = şekil + açı (kural yalnız biçime dayanır, renk hepsinde aynı); ad ekranda ve ekran okuyucuda
const S = (sekil, aci = 0, ad = SEKILLER[sekil].ad) => Object.freeze({ kod: `${sekil}-${aci}`, sekil, aci, ad });
const OK = { sag: S('ok', 0, 'sağa bakan ok'), sol: S('ok', 180, 'sola bakan ok'), yukari: S('ok', 270, 'yukarı bakan ok'), asagi: S('ok', 90, 'aşağı bakan ok') };
const UCGEN = { yukari: S('ucgen', 0, 'yukarı bakan üçgen'), asagi: S('ucgen', 180, 'aşağı bakan üçgen'), sag: S('ucgen', 90, 'sağa bakan üçgen') };
const cizim = (sb) => simgeSvg(sb.sekil, { aci: sb.aci, renk: RENK });

export default dikkatOyunu({
  egzersiz: 'iptal-testi',
  ad: 'Hedef Avı',
  ikon: 'satirlar',
  kisaAciklama: 'Satırı baştan sona tara, yalnız hedefleri işaretle. Acele yok; doğruluk önce gelir.',
  nasil: [
    'Her turda bir satır sembol görünür. Yukarıdaki hedeflerin hepsini bul ve dokunarak işaretle. Yanlış işarete yeniden dokunursan işaret kalkar.',
    'Bitirince “Satırı bitirdim” düğmesine bas. Çubuktaki süre dolarsa satır kendiliğinden geçer; süre cömerttir, acele etme.',
    'Satır sonunda kaçan hedefler sarı kesik, fazladan işaretler kesik çizgiyle gösterilir. Klavyede oklarla gez, Enter ya da Boşluk ile işaretle.',
  ],
  // satir: satır sayısı; hedefAdet: satır başına hedef [en, enCok]; satirMs: satır süresi (hafif baskı)
  basamaklar: [
    { satir: 6, hedefAdet: [3, 4], satirMs: 20000, hedef: [S('yildiz')], celdirici: [S('daire'), S('kare')] },
    { satir: 6, hedefAdet: [3, 4], satirMs: 18000, hedef: [S('yildiz')], celdirici: [S('daire'), S('kare'), S('ucgen'), S('arti')] },
    { satir: 7, hedefAdet: [3, 5], satirMs: 17000, hedef: [S('yildiz'), S('kalp')], celdirici: [S('daire'), S('elmas'), S('altigen'), S('arti')] },
    { satir: 8, hedefAdet: [3, 5], satirMs: 15000, hedef: [OK.sag], celdirici: [OK.sol, OK.yukari, OK.asagi] },
    { satir: 8, hedefAdet: [4, 5], satirMs: 14000, hedef: [OK.sag, UCGEN.yukari], celdirici: [OK.sol, OK.yukari, OK.asagi, UCGEN.asagi, UCGEN.sag] },
  ],
  alanEtiketi: 'Hedef Avı. Oklarla sembollerde gez, hedefleri Enter ya da Boşluk ile işaretle.',
  sureNotu: 'Her satırın cömert bir süresi var; dolarsa satır kendiliğinden geçer. İstediğin an duraklatabilirsin.',
  puanAciklama: 'Doğruluk oranı × dakikada işaretlenen hedef. Burada tepki süresi iki işaret arasındaki süredir; kaçırmadan, sakin bir ritimle işaretledikçe yükselir.',

  baslat(ctx) {
    const s = ctx.seviye;
    const hedefKod = new Set(s.hedef.map((h) => h.kod));

    const gorev = el('p', { sinif: 'iptal-gorev' }, 'Yalnız bunları işaretle:',
      s.hedef.map((h) => el('span', { sinif: 'iptal-ornek' },
        el('span', { sinif: 'iptal-ornek__simge', 'aria-hidden': 'true' }, cizim(h)), el('strong', { metin: h.ad }))));
    const duzen = dikkatSahnesi(ctx, { ust: gorev, sahneSinif: 'iptal-sahne' });
    duzen.geri.setAttribute('aria-live', 'polite'); // akış yavaş: satır özeti duyurulur
    const sureDolgu = el('span', { sinif: 'iptal-sure__dolgu' });
    const izgara = el('div', { sinif: 'iptal-izgara', role: 'group' });
    const bitirDugme = el('button', { type: 'button', sinif: 'btn btn--ikincil iptal-bitir', metin: 'Satırı bitirdim' });
    duzen.sahne.append(el('div', { sinif: 'iptal-ic' }, el('div', { sinif: 'iptal-sure', 'aria-hidden': 'true' }, sureDolgu), izgara, bitirDugme));

    let hucreler = [];
    let hedefMi = [];
    let isaretler = new Map(); // hücre sırası → { t: olay zamanı, g: geçen süre (duraklatma hariç) }
    let satir = 0;
    let asama = 'bekle';       // bekle | satir | geri | bitti
    let t0 = 0;
    let g0 = 0;
    let satirIptal = null;
    const kayitlar = [];
    const say = { hedef: 0, yanlisIsaret: 0, erkenBiten: 0, kesinti: 0 };
    ctx.temizlenince(() => { asama = 'bitti'; });

    const sutun = () => getComputedStyle(izgara).gridTemplateColumns.split(' ').filter(Boolean).length || 6;
    const gezinme = izgaraGezinme(izgara, { ogeler: () => hucreler, sutun });

    function satirKur() {
      if (asama === 'bitti') return;
      if (satir >= s.satir) { turuBitir(); return; }
      const odakIcerde = izgara.contains(document.activeElement) || document.activeElement === bitirDugme;
      const n = rastgeleTam(...s.hedefAdet);
      // Hedef türleri ve çeldiriciler eşit dağılır, sıra karışık
      const semboller = karistir([
        ...Array.from({ length: n }, (_, i) => s.hedef[i % s.hedef.length]),
        ...karistir(Array.from({ length: HUCRE - n }, (_, i) => s.celdirici[i % s.celdirici.length])),
      ]);
      hedefMi = semboller.map((sb) => hedefKod.has(sb.kod));
      hucreler = semboller.map((sb, i) => el('button', {
        type: 'button', sinif: 'iptal-hucre', tabindex: '-1', 'aria-pressed': 'false', 'aria-label': `${i + 1}. ${sb.ad}` }, cizim(sb)));
      izgara.replaceChildren(...hucreler);
      izgara.setAttribute('aria-label', `Satır ${satir + 1}`);
      isaretler = new Map();
      duzen.durum.textContent = `Satır ${satir + 1}/${s.satir}`;
      duzen.temizle();
      sureDolgu.style.setProperty('--kalan', '1');
      bitirDugme.disabled = false;
      gezinme.sifirla(odakIcerde);
      // Satırın görüntüye geldiği kare: t0 (Stroop/Go-No-Go'daki uyaran anıyla aynı yöntem)
      requestAnimationFrame(() => {
        if (asama === 'bitti') return;
        t0 = performance.now();
        g0 = ctx.gecenSn() * 1000;
        asama = 'satir';
        satirIptal = ctx.sonra(() => satirBitir(false), s.satirMs);
      });
    }

    function isaretle(i, olay) {
      if (asama !== 'satir' || !ctx.aktifMi() || i < 0) return;
      const h = hucreler[i];
      if (isaretler.has(i)) {
        isaretler.delete(i);
        h.setAttribute('aria-pressed', 'false');
      } else {
        isaretler.set(i, { t: olayZamani(olay), g: ctx.gecenSn() * 1000 });
        h.setAttribute('aria-pressed', 'true');
        ctx.ses('tik');
      }
    }

    function satirBitir(erken) {
      if (asama !== 'satir') return;
      asama = 'geri';
      satirIptal?.();
      bitirDugme.disabled = true;
      if (erken) say.erkenBiten += 1;

      // Her işaretin süresi bir öncekinden (ilki satırın göründüğü andan) bu yana; arada duraklatma olduysa süre ölçüme girmez
      const sure = new Map();
      let onceki = { t: t0, g: g0 };
      for (const [i, m] of [...isaretler.entries()].sort((a, b) => a[1].t - b[1].t)) {
        const kesik = Math.abs((m.t - onceki.t) - (m.g - onceki.g)) > KESINTI_MS;
        if (kesik) say.kesinti += 1;
        sure.set(i, kesik ? undefined : Math.round(m.t - onceki.t));
        onceki = m;
      }

      // Kayıt: her hedef bir deneme (bulundu → doğru, bulunmadı → atlandı); her fazladan işaret ayrı bir hata kaydı
      let bulunan = 0;
      let kacan = 0;
      let fazla = 0;
      hucreler.forEach((h, i) => {
        const isaretli = isaretler.has(i);
        if (hedefMi[i] && isaretli) {
          kayitlar.push({ tur: 'hedef', beklenen: 'tepki', sonuc: 'dogru', rtMs: sure.get(i) });
          h.dataset.sonuc = 'dogru';
          bulunan += 1;
        } else if (hedefMi[i]) {
          kayitlar.push({ tur: 'hedef', beklenen: 'tepki', sonuc: 'atlandi' });
          h.dataset.sonuc = 'atlandi';
          kacan += 1;
        } else if (isaretli) {
          kayitlar.push({ tur: 'celdirici', beklenen: 'bekle', sonuc: 'yanlis', rtMs: sure.get(i) });
          h.dataset.sonuc = 'yanlis';
          fazla += 1;
        }
      });
      // Satır sonucu ekran okuyucuya da: hücre etiketine eklenir
      const sonucMetni = { dogru: 'doğru işaret', atlandi: 'kaçan hedef', yanlis: 'fazladan işaret' };
      hucreler.forEach((h) => {
        if (h.dataset.sonuc) h.setAttribute('aria-label', `${h.getAttribute('aria-label')}, ${sonucMetni[h.dataset.sonuc]}`);
      });
      say.hedef += bulunan + kacan;
      say.yanlisIsaret += fazla;

      const tam = !kacan && !fazla;
      const ozet = `Satır ${satir + 1}: bulunan ${bulunan}/${bulunan + kacan} hedef`;
      if (tam) {
        ctx.ses('dogru');
        duzen.geriYaz('dogru', `${ozet}. Tertemiz!`);
      } else {
        duzen.geriYaz(null, `${ozet}${fazla ? `, fazladan işaret ${fazla}` : ''}. Kesik çizgili kutulara bir bak.`);
      }
      satir += 1;
      ctx.sonra(satirKur, tam ? GERI_MS : GERI_MS + 700);
    }

    function turuBitir() {
      asama = 'bitti';
      Object.assign(ctx.ekstra, {
        satir: s.satir, hucre: HUCRE, hedef: say.hedef, hedefTuru: s.hedef.length, celdirici: s.celdirici.length,
        satirMs: s.satirMs, yanlisIsaret: say.yanlisIsaret, erkenBiten: say.erkenBiten,
      });
      dikkatBitir(ctx, kayitlar, { kesinti: say.kesinti });
    }

    // Satır süresi çubuğu (yalnız görsel; duraklatınca durur)
    ctx.her(() => {
      if (asama !== 'satir') return;
      sureDolgu.style.setProperty('--kalan', String(sinirla(1 - (ctx.gecenSn() * 1000 - g0) / s.satirMs, 0, 1)));
    }, 200);

    // Dokunma: pointerdown (gecikmesiz, event.timeStamp); klavye: odaktaki hücrede Enter/Boşluk (click, detail 0)
    izgara.addEventListener('pointerdown', (e) => {
      if (!e.isPrimary || e.button > 0) return;
      const h = e.target.closest('.iptal-hucre');
      if (!h) return;
      e.preventDefault();
      isaretle(hucreler.indexOf(h), e);
    });
    izgara.addEventListener('click', (e) => {
      const h = e.target.closest('.iptal-hucre');
      if (h && e.detail === 0) isaretle(hucreler.indexOf(h), e);
    });
    bitirDugme.addEventListener('click', () => satirBitir(true));

    ctx.sonra(satirKur, 400);
  },

  ekSatirlar: (e) => [
    ['Doğru işaretlenen', `${e.dogru ?? 0}/${e.hedef ?? 0}`],
    ['Atlanan hedef', `${e.atlanan ?? 0}/${e.hedef ?? 0}`],
    ['Yanlış işaretlenen', String(e.yanlisIsaret ?? 0)],
  ],

  stil: `
    .iptal-gorev { display: flex; flex-wrap: wrap; align-items: center; gap: var(--b-2); margin: 0; font-size: var(--fs-m); font-weight: 700; }
    .iptal-ornek { display: inline-flex; align-items: center; gap: var(--b-1); padding: 2px var(--b-2); border: 1px solid var(--renk-kenar); border-radius: var(--kose-s); background: var(--renk-yuzey); }
    .iptal-ornek__simge { display: inline-block; inline-size: 1.75rem; block-size: 1.75rem; }
    .dikkat-sahne.iptal-sahne { place-items: stretch; overflow: visible; padding: var(--b-2); }
    .iptal-ic { display: grid; align-content: center; gap: var(--b-3); inline-size: 100%; max-inline-size: 48rem; margin-inline: auto; }
    .iptal-sure { block-size: 6px; border-radius: 3px; background: var(--renk-kenar); overflow: hidden; }
    .iptal-sure__dolgu { display: block; block-size: 100%; background: var(--renk-metin-soluk); transform: scaleX(var(--kalan, 1)); transform-origin: left; }
    .iptal-izgara { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: var(--b-1); }
    @media (min-width: 720px) { .iptal-izgara { grid-template-columns: repeat(12, minmax(0, 1fr)); } }
    .iptal-hucre {
      position: relative; display: grid; place-items: center; min-inline-size: 0; min-block-size: 2.75rem; aspect-ratio: 1; padding: 18%;
      border: 2px solid var(--renk-kenar); border-radius: var(--kose-s); background: var(--renk-yuzey); color: var(--renk-metin);
      cursor: pointer; touch-action: manipulation;
    }
    .iptal-hucre:focus-visible { outline: 3px solid var(--renk-odak); outline-offset: 2px; z-index: 1; }
    /* İşaret: kutuyu çapraz bir çizgiyle "iptal eder" (yalnız renge dayanmaz) */
    .iptal-hucre[aria-pressed="true"] { border-color: var(--renk-birincil); background: var(--renk-birincil-zemin); }
    .iptal-hucre[aria-pressed="true"]::after {
      content: ""; position: absolute; inset: 10%; pointer-events: none;
      background: linear-gradient(to top right, transparent calc(50% - 2px), var(--renk-metin) calc(50% - 2px), var(--renk-metin) calc(50% + 2px), transparent calc(50% + 2px));
    }
    .iptal-hucre[data-sonuc="dogru"] { border-color: var(--renk-basari); box-shadow: inset 0 0 0 2px var(--renk-basari); }
    .iptal-hucre[data-sonuc="yanlis"] { border-color: var(--renk-vurgu-metin); border-style: dashed; background: var(--renk-vurgu-zemin); }
    .iptal-hucre[data-sonuc="atlandi"] { border-color: var(--renk-uyari); border-style: dashed; border-width: 3px; }
    .iptal-bitir { justify-self: center; min-block-size: 2.75rem; }
    @media (forced-colors: active) {
      .iptal-hucre[aria-pressed="true"]::after { background: linear-gradient(to top right, transparent 48%, CanvasText 48%, CanvasText 52%, transparent 52%); }
      .iptal-hucre[data-sonuc="atlandi"] { border-color: Highlight; }
    }
  `,
});
