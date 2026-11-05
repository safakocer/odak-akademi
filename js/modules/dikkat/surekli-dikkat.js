// Gece Nöbeti (Sürekli dikkat, S11b): 2-3 dakika boyunca ortada şekiller akar; seyrek ve tahmin edilemeyen aralıklarla gelen hilali yakala. İlk ve son yarının doğruluğu "odak sürekliliği" olarak gösterilir; ölçüm attention-core.js ile
import { el } from '../../core/ui.js';
import { karistir, yuzdeBicimle } from '../../core/utils.js';
import { molaRehberiAcikMi } from '../../core/a11y.js';
import { simgeSvg, rastgeleSec } from '../../engine/algi.js';
import { dikkatOyunu, dikkatTuru, dikkatSahnesi, dokunusBagla, ozetle, msMetni } from '../../engine/attention-core.js';

const HEDEF = 'hilal';
const RENK = 'var(--renk-gunes)'; // hepsi aynı renk: kural yalnız şekle dayanır
const GERI_MS = 450;

/**
 * Bir yarının ara uzunlukları (akış adımı cinsinden): tabakalı rastgele + karışık sıra.
 * Kısa ve uzun aralar birlikte bulunur, sıra her turda değişir; iki yarının toplam süresi birbirine yakın kalır
 */
function araAdimlari(adet, [en, enCok]) {
  return karistir(Array.from({ length: adet }, (_, i) => Math.round(en + ((enCok - en) * (i + Math.random())) / adet)));
}

export default dikkatOyunu({
  egzersiz: 'surekli-dikkat',
  ad: 'Gece Nöbeti',
  ikon: 'yorunge',
  kisaAciklama: 'Fener nöbetindesin: gökyüzünü izle, seyrek gelen hilali kaçırma.',
  nasil: [
    'Ortadaki kutuda şekiller tek tek belirip kaybolur. Yalnız hilal görünce kutuya dokun ya da Boşluk tuşuna bas.',
    'Hilal seyrek gelir ve ne zaman geleceği belli olmaz. Öteki şekillerde bekle. Nöbet 2-3 dakika sürer.',
    'Sonunda nöbetin ilk ve son yarısı karşılaştırılır. Amaç hız değil, dikkati sonuna kadar korumak.',
  ],
  // hedef: hilal sayısı; akisMs: şekiller arası süre; uyaranMs: görünme; adim: iki hilal arası akış adımı [en, enCok]
  basamaklar: [
    { hedef: 12, akisMs: 1200, uyaranMs: 800, pencereMs: 1600, adim: [3, 12], celdirici: ['yildiz', 'kare', 'ucgen'] },
    { hedef: 12, akisMs: 1100, uyaranMs: 700, pencereMs: 1500, adim: [3, 13], celdirici: ['yildiz', 'kare', 'arti', 'elmas'] },
    { hedef: 14, akisMs: 1000, uyaranMs: 650, pencereMs: 1400, adim: [3, 14], celdirici: ['yildiz', 'daire', 'kalp', 'elmas'] },
    { hedef: 14, akisMs: 950, uyaranMs: 550, pencereMs: 1300, adim: [3, 15], celdirici: ['daire', 'damla', 'kalp', 'yildiz'] },
    { hedef: 16, akisMs: 900, uyaranMs: 500, pencereMs: 1200, adim: [3, 16], celdirici: ['daire', 'damla', 'kalp', 'altigen'] },
  ],
  alanEtiketi: 'Gece Nöbeti. Hilal görünce Boşluk tuşuna bas, başka şekilde bekle.',
  sureNotu: 'Nöbet yaklaşık 2-3 dakika sürer. İstediğin an duraklatabilirsin.',

  baslat(ctx) {
    const s = ctx.seviye;
    const gorev = el('p', { sinif: 'sd-gorev' }, 'Yalnız buna dokun: ',
      el('span', { sinif: 'sd-hedef', 'aria-hidden': 'true' }, simgeSvg(HEDEF, { renk: RENK })), el('strong', { metin: 'hilal' }));
    const duzen = dikkatSahnesi(ctx, { ust: gorev, sahneSinif: 'sd-sahne' });
    const { sahne } = duzen;
    const odak = el('span', { sinif: 'dikkat-odak', 'aria-hidden': 'true', metin: '+' });
    const uyaran = el('div', { sinif: 'sd-uyaran', hidden: true });
    sahne.append(odak, uyaran);

    // Plan: iki yarı eşit sayıda hilal; ara uzunlukları her yarıda ayrı karıştırılır (tahmin edilemez)
    const yarim = Math.floor(s.hedef / 2);
    const adimlar = [...araAdimlari(yarim, s.adim), ...araAdimlari(s.hedef - yarim, s.adim)];
    let onceki = null;
    const plan = adimlar.map((adim, i) => ({
      tur: i < yarim ? 'ilk' : 'son',
      beklenen: 'tepki',
      adim,
      araMs: adim * s.akisMs, // hilal, akışta bir sonraki şeklin geleceği anda gelir (ritim ipucu vermez)
      celdiriciler: Array.from({ length: adim }, () => (onceki = rastgeleSec(s.celdirici.filter((c) => c !== onceki)))),
    }));
    Object.assign(ctx.ekstra, { hedefSayisi: plan.length, akisMs: s.akisMs, celdirici: s.celdirici.length });

    let akis = [];   // akış zamanlayıcıları (çerçevenin duraklatılabilir saatiyle)
    let mevcut = 'ilk';
    let yakalanan = 0;
    let geriNo = 0;
    const akisDurdur = () => { akis.forEach((f) => f()); akis = []; };
    const akisGizle = () => { uyaran.hidden = true; odak.hidden = false; };
    function sekilGoster(ad) {
      delete sahne.dataset.sonuc;
      uyaran.replaceChildren(simgeSvg(ad, { renk: RENK }));
      odak.hidden = true;
      uyaran.hidden = false;
    }
    function geriYaz(sonuc, metin) {
      const n = ++geriNo;
      duzen.geriYaz(sonuc, metin);
      ctx.sonra(() => { if (n === geriNo) { duzen.temizle(); delete sahne.dataset.sonuc; } }, 1600);
    }
    const durumYaz = () => { duzen.durum.textContent = `Yakalanan hilal: ${yakalanan}`; };
    durumYaz();

    const tur = dikkatTuru(ctx, {
      plan, uyaranMs: s.uyaranMs, pencereMs: s.pencereMs, geriMs: GERI_MS,
      araSonucu: 'yanlis', // çeldiriciye dokunuş yanlış alarmdır, ön tepki değil
      // Ara başladı: çeldirici akışı kurulur (son şekil, hilal gelmeden kaybolur)
      ilerleme(n) {
        akisDurdur();
        const d = plan[n - 1];
        mevcut = d.tur;
        d.celdiriciler.forEach((c, i) => akis.push(ctx.sonra(() => {
          sekilGoster(c);
          akis.push(ctx.sonra(akisGizle, s.uyaranMs));
        }, i * s.akisMs)));
      },
      goster() { akisDurdur(); sekilGoster(HEDEF); },
      gizle: akisGizle,
      sonucta(k, d) {
        k.tur ??= mevcut; // çeldiriciye dokunuş da o yarıya sayılır
        if (k.sonuc === 'dogru') {
          yakalanan += 1;
          ctx.ses('tik');
          sahne.dataset.sonuc = 'dogru';
          geriYaz('dogru', 'Hilali yakaladın');
        } else if (k.sonuc === 'atlandi') {
          geriYaz('yanlis', 'Hilal kaçtı. Nöbete devam.');
        } else if (!d) {
          ctx.ses('yanlis');
          geriYaz('yanlis', 'Bu hilal değildi. Yalnız hilale dokun.');
        } else {
          geriYaz('yanlis', 'Çok erken oldu. Önce bak, sonra dokun.');
        }
        durumYaz();
      },
      bitince(oz, kayitlar) {
        const yari = (t) => {
          const o = ozetle(kayitlar.filter((k) => k.tur === t));
          return { deneme: o.deneme, dogru: o.dogru, isabet: o.isabet, ortMs: o.ortMs };
        };
        const ilk = yari('ilk');
        const son = yari('son');
        Object.assign(ctx.ekstra, {
          atlananHedef: oz.atlanan,
          yanlisDokunma: kayitlar.filter((k) => k.erken).length,
          yari: { ilk, son },
          sureklilik: son.isabet - ilk.isabet,
        });
      },
    });
    ctx.temizlenince(akisDurdur);

    dokunusBagla(ctx, sahne, tur); // sahneye dokunuş ya da Boşluk/Enter
  },

  ekSatirlar: (e) => [
    ['Yakalanan hilal', `${e.dogru ?? 0}/${e.hedefSayisi ?? 0}`],
    ['Kaçan hilal', String(e.atlananHedef ?? 0)],
    ['Başka şekle dokunma', String(e.yanlisDokunma ?? 0)],
  ],

  // Sonuç ekranı: odak sürekliliği (ilk yarı ↔ son yarı) + göz arası önerisi
  ekBolum(e) {
    const { ilk, son } = e.yari ?? {};
    if (!ilk?.deneme || !son?.deneme) return null;
    const fark = son.isabet - ilk.isabet;
    const mesaj = fark >= 10 ? 'Son yarıda daha da iyi yakaladın. Isındıkça odağın toparlandı.'
      : fark > -10 ? 'Dikkatini nöbetin sonuna kadar korudun.'
        : fark > -30 ? 'Son yarıda doğruluk biraz düştü. Uzun görevlerde bu çok olağan; bir sonraki hedef son yarıda da aynı dikkati sürdürmek.'
          : 'Son yarıda dikkat daha çok dağıldı. Bu herkesin başına gelir; bir sonraki turdan önce kısa bir mola iyi gelebilir.';
    let hiz = null;
    if (ilk.ortMs && son.ortMs) {
      const f = son.ortMs - ilk.ortMs;
      hiz = Math.abs(f) < 30 ? 'Tepki sürelerin iki yarıda da benzerdi.'
        : f > 0 ? `Son yarıda tepkilerin ortalama ${msMetni(f)} daha uzun sürdü.`
          : `Son yarıda tepkilerin ortalama ${msMetni(-f)} daha kısaydı.`;
    }
    const satir = (ad, y) => el('li', { sinif: 'sd-yari' },
      el('span', { sinif: 'sd-yari__ad', metin: ad }),
      el('span', { sinif: 'sd-cubuk', 'aria-hidden': 'true' }, el('span', { style: `--deger:${y.isabet}%` })),
      el('strong', { metin: yuzdeBicimle(y.isabet) }),
      el('small', { metin: `${y.dogru}/${y.deneme} · ${msMetni(y.ortMs)}` }));
    return el('section', { sinif: 'sd-sureklilik', 'aria-labelledby': 'sd-sureklilik-baslik' },
      el('h4', { id: 'sd-sureklilik-baslik', metin: 'Odak sürekliliği' }),
      el('p', { sinif: 'sd-not', metin: 'Nöbetin ilk ve son yarısındaki doğruluğun:' }),
      el('ul', { sinif: 'sd-yarilar' }, satir('İlk yarı', ilk), satir('Son yarı', son)),
      el('p', { metin: mesaj }),
      hiz && el('p', { sinif: 'sd-not', metin: hiz }),
      molaRehberiAcikMi() && el('p', { sinif: 'bildirim sd-mola' },
        el('strong', { metin: 'Kısa bir göz arası: ' }),
        'Birkaç dakika aralıksız odaklandın. Yeni tura geçmeden yaklaşık 20 saniye uzağa bak (20-20-20).'));
  },

  stil: `
    .sd-gorev { display: flex; flex-wrap: wrap; align-items: center; gap: var(--b-2); margin: 0; font-size: var(--fs-l); font-weight: 700; }
    .sd-hedef { display: inline-block; inline-size: 2.5rem; block-size: 2.5rem; }
    .sd-sahne { cursor: pointer; transition: box-shadow var(--sure-hizli) ease-out; }
    .sd-uyaran { inline-size: min(40vw, 9rem); block-size: min(40vw, 9rem); }
    .sd-sahne[data-sonuc="dogru"] { box-shadow: inset 0 0 0 3px var(--renk-basari); }
    @media (forced-colors: active) { .sd-sahne[data-sonuc] { outline: 3px solid Highlight; } }
    .sd-sureklilik { display: grid; gap: var(--b-2); padding: var(--b-3); border: 1px solid var(--renk-kenar); border-radius: var(--kose-m); background: var(--renk-yuzey); }
    .sd-sureklilik h4, .sd-sureklilik p { margin: 0; }
    .sd-sureklilik h4 { font-size: var(--fs-m); }
    .sd-not { font-size: var(--fs-s); color: var(--renk-metin-soluk); }
    .sd-yarilar { display: grid; gap: var(--b-2); margin: 0; padding: 0; list-style: none; }
    .sd-yari { display: grid; grid-template-columns: 5.5rem minmax(0, 1fr) auto; align-items: center; gap: 2px var(--b-2); }
    .sd-yari__ad { font-weight: 700; }
    .sd-yari strong { font-variant-numeric: tabular-nums; }
    .sd-yari small { grid-column: 2 / -1; font-size: var(--fs-xs); color: var(--renk-metin-soluk); font-variant-numeric: tabular-nums; }
    .sd-cubuk { block-size: 0.6rem; border-radius: 0.3rem; background: var(--renk-yuzey-2); box-shadow: inset 0 0 0 1px var(--renk-kenar); overflow: hidden; }
    .sd-cubuk > span { display: block; inline-size: var(--deger, 0%); block-size: 100%; background: var(--renk-birincil); }
    .sd-mola { margin: 0; }
    @media (forced-colors: active) { .sd-cubuk > span { background: CanvasText; } }
  `,
});
