// Periferik Flaş: ortadaki artıya bakarken çevrede kısa süre beliren sayıyı ya da kelimeyi seçme; flaş süresi 400 ms'den 100 ms'ye kademeli kısalır
import { el } from '../../core/ui.js';
import { odakla } from '../../core/a11y.js';
import { karistir, sayiBicimle } from '../../core/utils.js';
import { hazirlikSecimi } from '../../engine/exercise-frame.js';
import {
  havuzHazirla, flasGoster, kareSuresi, merdivenOlustur, merdivenSeviyesi, baslangicSuresi, hizPuani, secenekPaneli,
  rastgeleKelime, kelimeCeldiricileri, sayiUret, sayiCeldiricileri,
} from '../../engine/flas.js';

await havuzHazirla();

const DENEME_SAYISI = 14;
const SURE = Object.freeze({ baslangic: 400, en: 100, enCok: 400 });
const OGE_TURLERI = Object.freeze([
  { deger: 'rakam', etiket: 'Sayı', aciklama: '2-4 basamaklı sayılar' },
  { deger: 'kelime', etiket: 'Kelime', aciklama: 'sınıf metinlerinden kısa kelimeler' },
]);
let ogeTuru = 'rakam'; // oturum boyunca hatırlanır

export default {
  modul: 'goz',
  egzersiz: 'periferik-flas',
  ad: 'Periferik Flaş',
  ikon: 'cevre',
  kisaAciklama: 'Gözün ortada dururken çevrede beliren sayıyı ya da kelimeyi yakala; tek bakışta görülen alanı fark et.',
  nasil: [
    'Başını sabit tut, gözün ortadaki artıda (+) kalsın. Çevrede bir an için bir sayı ya da kelime belirecek.',
    'Ne gördüğünü dört seçenekten seç (klavyede 1-4). Emin değilsen tahmin et; sorun değil.',
    'Doğru gördükçe flaş kısalır (400 ms’den 100 ms’ye), zorlanınca uzar. Rahatsız hissedersen duraklat.',
  ],
  seviyeler: [
    { ad: 'Yakın', uzaklik: 0.35, yon: 4, basamak: 2, harf: [3, 4] },
    { ad: 'Orta', uzaklik: 0.6, yon: 8, basamak: 3, harf: [4, 5] },
    { ad: 'Uzak', uzaklik: 0.85, yon: 8, basamak: 4, harf: [5, 6] },
  ],
  otomatikSeviye: true,
  etiketler: { dogru: 'Doğru seçim', yanlis: 'Yanlış seçim' },
  puanEtiketi: 'Hız puanı',
  puanAciklama: '1000 − son flaşların ortalama süresi (ms). Flaş ne kadar kısaysa puan o kadar yüksek.',
  alanEtiketi: 'Periferik flaş alanı. Flaştan sonra 1 ile 4 arasındaki rakam tuşlarıyla ya da düğmelerle yanıt ver.',

  hazirlik() {
    return el('div', { sinif: 'okuma-ayar' }, hazirlikSecimi({
      ad: 'pfOge', baslik: 'Ne belirsin?', secenekler: OGE_TURLERI, secili: ogeTuru, degisince: (d) => { ogeTuru = d; },
    }));
  },

  baslat(ctx) {
    const { alan, seviye: s } = ctx;
    const tur = ogeTuru;
    const merdiven = merdivenOlustur({ ...SURE, baslangic: baslangicSuresi({ modul: 'goz', egzersiz: 'periferik-flas', zorluk: ctx.zorluk }, SURE) });
    Object.assign(ctx.ekstra, { oge: tur, yon: s.yon, baslangicMs: merdiven.ms });
    alan.classList.add('flas-alan');

    const durumEl = el('p', { sinif: 'flas-durum' });
    const ogeEl = el('span', { sinif: 'flas-oge pf-oge' });
    const maske = el('span', { sinif: 'flas-maske' });
    const kutu = el('span', { sinif: 'flas-kutu flas-kutu--konumlu' }, ogeEl, maske);
    const sahne = el('div', { sinif: 'flas-sahne', 'aria-hidden': 'true' }, el('span', { sinif: 'flas-odak', metin: '+' }), kutu);
    const soru = el('div', { sinif: 'flas-soru', hidden: true });
    const geri = el('p', { sinif: 'flas-geri', 'aria-live': 'polite' });
    alan.append(durumEl, sahne, soru, geri);

    let tamam = 0;
    let sonYon = -1;
    let panel = null;

    function bitir() {
      Object.assign(ctx.ekstra, {
        esikMs: merdiven.esik(), enKisaMs: merdiven.enKisaDogru(), sapmaMs: merdiven.sapma(), kareMs: Math.round(kareSuresi() * 10) / 10,
      });
      ctx.bitir();
    }

    function deneme() {
      if (tamam >= DENEME_SAYISI) { bitir(); return; }
      panel = null;
      soru.hidden = true;
      durumEl.textContent = `Deneme ${tamam + 1} / ${DENEME_SAYISI} · Flaş: ${merdiven.ms} ms`;
      if (!alan.contains(document.activeElement) || soru.contains(document.activeElement)) odakla(alan, { kaydir: false });
      const dogru = tur === 'rakam' ? sayiUret(s.basamak) : rastgeleKelime(s.harf);
      let yon;
      do { yon = Math.floor(Math.random() * s.yon); } while (yon === sonYon);
      sonYon = yon;
      const aci = (yon / s.yon) * 2 * Math.PI;
      kutu.style.left = `${50 + Math.cos(aci) * s.uzaklik * 38}%`;
      kutu.style.top = `${50 + Math.sin(aci) * s.uzaklik * 40}%`;
      ogeEl.textContent = dogru;
      const hedef = merdiven.ms;
      // Bekleme süresi her denemede biraz değişir: flaşın anı tahmin edilemesin
      ctx.sonra(async () => {
        const r = await flasGoster(ogeEl, hedef, { aktifMi: ctx.aktifMi, maske });
        if (r.iptal) { ctx.sonra(deneme, 500); return; } // duraklatıldı: deneme sayılmaz, yenisi gelir
        sor(dogru, r.gercekMs);
      }, 700 + Math.random() * 500);
    }

    function sor(dogru, gercekMs) {
      const secenekler = karistir([dogru, ...(tur === 'rakam' ? sayiCeldiricileri(dogru, 3) : kelimeCeldiricileri(dogru, 3))]);
      const dogruSira = secenekler.indexOf(dogru);
      panel = secenekPaneli({
        baslik: 'Ne gördün?', secenekler,
        secince: (i) => {
          if (!ctx.aktifMi()) return false;
          const dogruMu = i === dogruSira;
          panel.isaretle(i, dogruSira);
          merdiven.sonuc(dogruMu, gercekMs);
          if (dogruMu) ctx.dogru(); else ctx.yanlis();
          tamam += 1;
          geri.textContent = dogruMu
            ? `✓ Doğru! Flaş ${gercekMs} ms sürdü.`
            : `✗ Gösterilen: ${dogru}. Gözün artıda kalsın, sıradakine hazırlan.`;
          ctx.sonra(deneme, dogruMu ? 800 : 1400);
          return true;
        },
      });
      soru.replaceChildren(panel.kok);
      soru.hidden = false;
      panel.odakla();
    }

    alan.addEventListener('keydown', (e) => { panel?.tus(e); });
    deneme();
  },

  degerlendir({ dogru, yanlis, zorluk, ekstra }) {
    const toplam = dogru + yanlis;
    const isabet = toplam ? Math.round((dogru * 100) / toplam) : 0;
    const esikMs = ekstra.esikMs ?? SURE.baslangic;
    return {
      isabet,
      puan: toplam ? hizPuani(esikMs) : 0,
      sonrakiSeviye: toplam ? merdivenSeviyesi(zorluk, { esikMs, isabet, ...SURE }) : zorluk,
      satirlar: [
        ['Ortalama flaş süresi', `${esikMs} ms`],
        ['En kısa doğru flaş', ekstra.enKisaMs ? `${ekstra.enKisaMs} ms` : '-'],
        ['Ölçüm sapması', `± ${sayiBicimle(ekstra.sapmaMs ?? 0, 1)} ms (ekran karesi ${sayiBicimle(ekstra.kareMs ?? 16.7, 1)} ms)`],
      ],
    };
  },

  stil: `
    .pf-oge { font-size: clamp(1.125rem, 6.5cqi, 1.75rem); font-variant-numeric: tabular-nums; }
  `,
};
