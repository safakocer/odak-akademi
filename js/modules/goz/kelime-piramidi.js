// Kelime Piramidi (D06: dar ekranda en küçük yazı boyu korunur, satır ve kelime uzunluğu ekrana göre ayarlanır): ortadaki kelime çevresinde her satırda genişleyen satırlar kısa süre görünür; öğrenci iki uçtaki kelimenin aynı olup olmadığını söyler
import { el } from '../../core/ui.js';
import { odakla } from '../../core/a11y.js';
import { karistir, karakterSayisi, sayiBicimle } from '../../core/utils.js';
import { havuzHazirla, flasGoster, secenekPaneli, rastgeleKelime, kelimeCeldiricileri } from '../../engine/flas.js';

await havuzHazirla();

const SORU_SAYISI = 12;
const SECENEKLER = Object.freeze(['Aynı', 'Farklı']);
const EN_KUCUK_YAZI_REM = 0.8125; // --fs-xs: satır bundan küçük yazılmaz (stilde de aynı alt sınır)
const ORTA_PAY = 7;               // ortadaki kelime (en çok 5 harf) + iki yandaki boşluk payı (karakter)
const KF = { standart: 0.62, disleksi: 0.74 }; // ortalama harf genişliği / yazı boyu (stildeki --kf ile aynı)

// D06: Kutuya en küçük yazı boyuyla sığan satır genişliği (karakter)
function satirButcesi(kutu) {
  const st = getComputedStyle(kutu);
  const genislik = kutu.clientWidth - parseFloat(st.paddingLeft) - parseFloat(st.paddingRight);
  const kokPx = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
  const kf = document.documentElement.dataset.font === 'disleksi' ? KF.disleksi : KF.standart;
  return Math.floor((genislik * 0.96) / (EN_KUCUK_YAZI_REM * kokPx * kf));
}
// k kelimelik yanın her kelimesi en çok kaç harf olabilir (bütçeye sığması için)
const yanSiniri = (butce, k) => Math.floor(((butce - ORTA_PAY) / 2 - (k - 1)) / k);

// Satır k: ortada bir kelime, iki yanında k kelime. En dıştaki iki kelime yarı yarıya aynıdır
function piramitKur(s, cevaplar, satirSayisi, butce) {
  return Array.from({ length: satirSayisi }, (_, i) => {
    const k = i + 1;
    const enCok = Math.max(2, Math.min(s.yan[1], yanSiniri(butce, k)));
    const aralik = [Math.min(s.yan[0], enCok), enCok];
    const sol = Array.from({ length: k }, () => rastgeleKelime(aralik));
    const sag = Array.from({ length: k }, () => rastgeleKelime(aralik));
    const ayni = cevaplar.shift() ?? Math.random() < 0.5;
    if (ayni) sag[k - 1] = sol[0];
    else if (sag[k - 1] === sol[0]) [sag[k - 1]] = kelimeCeldiricileri(sol[0], 1);
    // Zor seviyede farklı uç kelime benzer seçilir (aynı uzunluk, baş harf ya da son ek)
    if (!ayni && s.benzer) [sag[k - 1]] = kelimeCeldiricileri(sol[0], 1);
    return { orta: rastgeleKelime([3, 5]), sol, sag, ayni };
  });
}

export default {
  modul: 'goz',
  egzersiz: 'kelime-piramidi',
  ad: 'Kelime Piramidi',
  ikon: 'piramit',
  kisaAciklama: 'Ortadaki kelimeye bakarken satırın iki ucunu da görmeyi çalış; satırlar aşağı indikçe genişler.',
  nasil: [
    'Her satır bir an görünür. Gözün satırın ortasındaki koyu kelimede olsun; işaret (▾) yerini gösterir.',
    'Satır kaybolunca iki uçtaki kelimelerin aynı mı farklı mı olduğunu seç (klavyede 1 = Aynı, 2 = Farklı).',
    'Satırlar aşağı indikçe genişler. Başını sabit tut; rahatsız hissedersen duraklat.',
  ],
  seviyeler: [
    { ad: 'Kolay', satir: 3, sureMs: 1500, yan: [2, 4] },
    { ad: 'Orta', satir: 4, sureMs: 1100, yan: [2, 4] },
    { ad: 'Zor', satir: 4, sureMs: 750, yan: [3, 5], benzer: true },
  ],
  otomatikSeviye: true,
  etiketler: { dogru: 'Doğru yanıt', yanlis: 'Yanlış yanıt' },
  puanEtiketi: 'İsabet puanı',
  puanAciklama: 'İki ucu doğru karşılaştırdığın satırların yüzdesi.',
  alanEtiketi: 'Kelime piramidi alanı. Satır kaybolunca 1 (Aynı) ya da 2 (Farklı) tuşuna bas.',

  baslat(ctx) {
    const { alan, seviye: s } = ctx;
    alan.classList.add('flas-alan');
    const durumEl = el('p', { sinif: 'flas-durum' });
    const kutu = el('div', { sinif: 'pir-kutu', 'aria-hidden': 'true' });
    const soru = el('div', { sinif: 'flas-soru', hidden: true });
    const geri = el('p', { sinif: 'flas-geri', 'aria-live': 'polite' });
    alan.append(durumEl, kutu, soru, geri);

    // D06: dar ekranda satır sayısı, yan kelimeleri en az 3 harfle sığdıracak kadar azalır (en az 2 satır)
    const butce = satirButcesi(kutu);
    let satirSayisi = s.satir;
    while (satirSayisi > 2 && yanSiniri(butce, satirSayisi) < 3) satirSayisi -= 1;
    Object.assign(ctx.ekstra, { satir: satirSayisi, sureMs: s.sureMs, piramit: 0 });

    const piramitSayisi = Math.ceil(SORU_SAYISI / satirSayisi);
    const toplamSoru = piramitSayisi * satirSayisi;
    const cevaplar = karistir(Array.from({ length: toplamSoru }, (_, i) => i % 2 === 0)); // aynı/farklı dengeli
    let satirlar = [];
    let r = 0;
    let tamam = 0;
    let panel = null;
    let sapmaToplam = 0;

    function piramitBasla() {
      ctx.ekstra.piramit += 1;
      const veri = piramitKur(s, cevaplar, satirSayisi, butce);
      // Yazı boyu en geniş satıra göre ayarlanır (360 px'te taşmaz)
      const genislik = Math.max(...veri.map((v) => 2 * Math.max(karakterSayisi(v.sol.join(' ')), karakterSayisi(v.sag.join(' '))) + karakterSayisi(v.orta) + 2));
      satirlar = veri.map((v) => {
        const oge = el('span', { sinif: 'flas-oge pir-satir' },
          el('span', { sinif: 'pir-sol', metin: v.sol.join(' ') }),
          el('strong', { sinif: 'pir-orta', metin: v.orta }),
          el('span', { sinif: 'pir-sag', metin: v.sag.join(' ') }));
        const maske = el('span', { sinif: 'flas-maske' });
        const sira = el('div', { sinif: 'pir-sira' }, el('span', { sinif: 'pir-isaret', metin: '▾' }), el('span', { sinif: 'flas-kutu' }, oge, maske));
        return { ...v, oge, maske, sira };
      });
      kutu.replaceChildren(el('div', { sinif: 'pir', style: `--ch:${genislik}` }, satirlar.map((x) => x.sira)));
      r = 0;
      ctx.sonra(satirGoster, 900);
    }

    function satirGoster() {
      const x = satirlar[r];
      panel = null;
      soru.hidden = true;
      durumEl.textContent = `Piramit ${ctx.ekstra.piramit} / ${piramitSayisi} · Satır ${r + 1} / ${satirSayisi}`;
      if (!alan.contains(document.activeElement) || soru.contains(document.activeElement)) odakla(alan, { kaydir: false });
      x.sira.classList.add('pir-sira--etkin');
      ctx.sonra(async () => {
        const sonuc = await flasGoster(x.oge, s.sureMs, { aktifMi: ctx.aktifMi, maske: x.maske });
        if (sonuc.iptal) { ctx.sonra(satirGoster, 500); return; } // duraklatıldı: aynı satır yeniden gösterilir
        x.sira.classList.remove('pir-sira--etkin');
        sapmaToplam += Math.abs(sonuc.gercekMs - s.sureMs);
        sor(x);
      }, 700);
    }

    function sor(x) {
      const dogruSira = x.ayni ? 0 : 1;
      panel = secenekPaneli({
        baslik: 'Uçtaki iki kelime aynı mıydı?', secenekler: SECENEKLER, tuslar: [['1', 'a'], ['2', 'f']],
        secince: (i) => {
          if (!ctx.aktifMi()) return false;
          panel.isaretle(i, dogruSira);
          const dogruMu = i === dogruSira;
          if (dogruMu) ctx.dogru(); else ctx.yanlis();
          tamam += 1;
          x.oge.classList.add('pir-satir--goruldu');
          const uclar = `“${x.sol[0]}” … “${x.sag[x.sag.length - 1]}”`;
          geri.textContent = dogruMu ? `✓ Doğru! Uçlar: ${uclar}.` : `✗ Uçlar: ${uclar}. Gözün ortada kalsın, iki yanı birlikte görmeye çalış.`;
          r += 1;
          if (tamam >= toplamSoru) {
            ctx.ekstra.sapmaMs = Math.round((sapmaToplam / tamam) * 10) / 10;
            ctx.sonra(() => ctx.bitir(), 1200);
          } else if (r < satirlar.length) ctx.sonra(satirGoster, dogruMu ? 900 : 1500);
          else ctx.sonra(piramitBasla, 1600);
          return true;
        },
      });
      soru.replaceChildren(panel.kok);
      soru.hidden = false;
      panel.odakla();
    }

    alan.addEventListener('keydown', (e) => { panel?.tus(e); });
    piramitBasla();
  },

  degerlendir({ dogru, yanlis, ekstra }) {
    const toplam = dogru + yanlis;
    const isabet = toplam ? Math.round((dogru * 100) / toplam) : 0;
    return {
      isabet,
      puan: isabet,
      satirlar: [
        ['Satır süresi', `${ekstra.sureMs} ms`],
        ['Piramit', `${ekstra.piramit} × ${ekstra.satir} satır`],
        ['Ölçüm sapması', `± ${sayiBicimle(ekstra.sapmaMs ?? 0, 1)} ms`],
      ],
    };
  },

  stil: `
    .pir-kutu { flex: 1 0 auto; display: grid; align-content: center; padding: var(--b-3) var(--b-1); border-radius: var(--kose-m); background: var(--renk-yuzey-2); container-type: inline-size; overflow: hidden; }
    /* Yazı boyu en geniş satırın karakter sayısına göre küçülür (--ch), --fs-xs altına inmez (satır sayısını JS ayarlar); disleksi yazı tipi daha geniş */
    .pir { --kf: 0.62; position: relative; display: grid; justify-items: center; gap: 0.9em; font-size: var(--fs-m);
      font-size: max(var(--fs-xs), min(var(--fs-xl), calc(96cqi / (var(--ch) * var(--kf))))); line-height: 1.25; }
    :root[data-font="disleksi"] .pir { --kf: 0.74; }
    .pir::before { content: ""; position: absolute; inset-block: -0.5em; inset-inline-start: 50%; border-inline-start: 2px dashed var(--renk-kenar); }
    .pir-sira { position: relative; display: grid; justify-items: center; }
    .pir-isaret { position: absolute; inset-block-end: 100%; line-height: 1; font-size: 0.8em; color: var(--renk-birincil); visibility: hidden; }
    .pir-sira--etkin .pir-isaret { visibility: visible; }
    .pir-satir { display: grid; grid-template-columns: 1fr auto 1fr; gap: 0.5ch; white-space: nowrap; color: var(--renk-metin); background: var(--renk-yuzey-2); position: relative; }
    .pir-sol { justify-self: end; }
    .pir-sag { justify-self: start; }
    .pir-orta { font-weight: 800; color: var(--renk-birincil); }
    .flas-oge.pir-satir--goruldu { visibility: visible; color: var(--renk-metin-soluk); }
    .pir-satir--goruldu .pir-orta { color: inherit; }
  `,
};
