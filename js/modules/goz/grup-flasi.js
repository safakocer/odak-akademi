// Grup Flaşı (takistoskop; D06: yazarak yanıtta sonuç ekran okuyucuya duyurulur; S34-son: süre aralığı ve basamaklar sınıf bandından, deneme sayısı denemeSayisi ile, örnek): 2-3-4 kelimelik grup ekranın ortasında kısa süre görünür; öğrenci seçeneklerden seçer ya da yazar; süre kademeli kısalır
import { el } from '../../core/ui.js';
import { odakla, duyur } from '../../core/a11y.js';
import { karistir, karakterSayisi, sayiBicimle } from '../../core/utils.js';
import { hazirlikSecimi, ornekListesi } from '../../engine/exercise-frame.js';
import { denemeSayisi } from '../../engine/attention-core.js';
import {
  havuzHazirla, flasGoster, kareSuresi, merdivenOlustur, merdivenSeviyesi, baslangicSuresi, hizPuani, secenekPaneli,
  rastgeleGrup, grupCeldiricileri, yazimKarsilastir,
} from '../../engine/flas.js';

await havuzHazirla();

const DENEME_SAYISI = 12;
const YANIT_TURLERI = Object.freeze([
  { deger: 'sec', etiket: 'Seçerek', aciklama: 'dört seçenekten birini seç' },
  { deger: 'yaz', etiket: 'Yazarak', aciklama: 'gördüğün kelimeleri yaz; Türkçe harf ve noktalama farkı sayılmaz' },
]);
let yanitTuru = 'sec'; // oturum boyunca hatırlanır
let sonSure = null; // S34-son: son turun süre aralığı (bant seviyenin sure alanını değiştirebilir)

export default {
  modul: 'goz',
  egzersiz: 'grup-flasi',
  ad: 'Grup Flaşı',
  ikon: 'grup-flas',
  kisaAciklama: 'Birkaç kelimeyi tek bakışta görmeyi çalış; okurken kelimeleri gruplayarak ilerlemeye yardımcı olur.',
  nasil: [
    'Gözün ortadaki noktada olsun. Nokta kaybolunca birkaç kelimelik bir grup bir an görünecek.',
    'Grubu kelime kelime değil, bütün olarak görmeye çalış. Sonra seçeneklerden seç ya da yaz.',
    'Doğru gördükçe süre kısalır, zorlanınca uzar. Hazırlıkta yanıt biçimini seçebilirsin.',
  ],
  seviyeler: [
    { ad: '2 kelime', kelime: 2, sure: { baslangic: 400, en: 100, enCok: 500 } },
    { ad: '3 kelime', kelime: 3, sure: { baslangic: 500, en: 150, enCok: 600 } },
    { ad: '4 kelime', kelime: 4, sure: { baslangic: 600, en: 200, enCok: 700 } },
  ],
  otomatikSeviye: true,
  etiketler: { dogru: 'Doğru yanıt', yanlis: 'Yanlış yanıt' },
  puanEtiketi: 'Hız puanı',
  puanAciklama: '1000 − son flaşların ortalama süresi (ms). Flaş ne kadar kısaysa puan o kadar yüksek.',
  alanEtiketi: 'Grup flaşı alanı. Flaştan sonra 1 ile 4 arasındaki rakamlarla seç ya da kutuya yazıp Enter’a bas.',
  ornek: () => ornekListesi([
    { cizim: el('span', { sinif: 'egz-ornek__yazi', metin: '•' }), metin: 'Ortadaki noktaya bak' },
    { cizim: el('span', { sinif: 'egz-ornek__yazi', metin: 'sabah erken' }), metin: 'Kelimeleri bütün olarak gör, sonra seç' },
  ]),

  hazirlik() {
    return el('div', { sinif: 'okuma-ayar' }, hazirlikSecimi({
      ad: 'gfYanit', baslik: 'Yanıt biçimi', secenekler: YANIT_TURLERI, secili: yanitTuru, degisince: (d) => { yanitTuru = d; },
    }));
  },

  baslat(ctx) {
    const { alan, seviye: s } = ctx;
    const tur = yanitTuru;
    const toplamDeneme = denemeSayisi(ctx, DENEME_SAYISI); // S34-son: alıştırma > bant > 12
    sonSure = s.sure;
    const merdiven = merdivenOlustur({ ...s.sure, baslangic: baslangicSuresi({ modul: 'goz', egzersiz: 'grup-flasi', zorluk: ctx.zorluk }, s.sure) });
    Object.assign(ctx.ekstra, { kelime: s.kelime, yanit: tur, baslangicMs: merdiven.ms });
    alan.classList.add('flas-alan');

    const durumEl = el('p', { sinif: 'flas-durum' });
    const odak = el('span', { sinif: 'flas-odak', metin: '•' });
    const ogeEl = el('span', { sinif: 'flas-oge gf-oge' });
    const maske = el('span', { sinif: 'flas-maske' });
    const kutu = el('span', { sinif: 'flas-kutu flas-kutu--konumlu', style: 'left:50%;top:50%' }, ogeEl, maske);
    const sahne = el('div', { sinif: 'flas-sahne gf-sahne', 'aria-hidden': 'true' }, odak, kutu);
    const soru = el('div', { sinif: 'flas-soru', hidden: true });
    const geri = el('p', { sinif: 'flas-geri', 'aria-live': 'polite' });
    alan.append(durumEl, sahne, soru, geri);

    let tamam = 0;
    let panel = null;
    let kelimeDogru = 0;
    let kelimeToplam = 0;

    function bitir() {
      Object.assign(ctx.ekstra, {
        esikMs: merdiven.esik(), enKisaMs: merdiven.enKisaDogru(), sapmaMs: merdiven.sapma(), kareMs: Math.round(kareSuresi() * 10) / 10,
        kelimeIsabet: kelimeToplam ? Math.round((kelimeDogru * 100) / kelimeToplam) : null,
      });
      ctx.bitir();
    }

    // Bir denemenin sonucu: merdiven, sayaç, geri bildirim (mesajEl: yazarak yanıtta kutunun altındaki sonuç), sıradaki deneme
    function sonuclandir(dogruMu, grup, gercekMs, ek = '', mesajEl = geri) {
      merdiven.sonuc(dogruMu, gercekMs);
      if (dogruMu) ctx.dogru(); else ctx.yanlis();
      tamam += 1;
      geri.textContent = '';
      mesajEl.textContent = dogruMu ? `✓ Doğru! Flaş ${gercekMs} ms sürdü.${ek}` : `✗ Gösterilen: “${grup}”.${ek} Sıradakinde grubu bütün olarak görmeye çalış.`;
      ctx.sonra(deneme, dogruMu ? 900 : 1800);
    }

    function deneme() {
      if (tamam >= toplamDeneme) { bitir(); return; }
      panel = null;
      soru.hidden = true;
      durumEl.textContent = `Deneme ${tamam + 1} / ${toplamDeneme} · Flaş: ${merdiven.ms} ms`;
      if (!alan.contains(document.activeElement) || soru.contains(document.activeElement)) odakla(alan, { kaydir: false });
      const grup = rastgeleGrup(s.kelime);
      ogeEl.textContent = grup;
      kutu.style.setProperty('--ch', String(Math.max(10, karakterSayisi(grup))));
      odak.hidden = false;
      const hedef = merdiven.ms;
      ctx.sonra(async () => {
        odak.hidden = true; // grup noktanın yerinde görünür
        const r = await flasGoster(ogeEl, hedef, { aktifMi: ctx.aktifMi, maske });
        if (r.iptal) { odak.hidden = false; ctx.sonra(deneme, 500); return; }
        if (tur === 'yaz') yazdir(grup, r.gercekMs); else sec(grup, r.gercekMs);
      }, 800 + Math.random() * 500);
    }

    function sec(grup, gercekMs) {
      const secenekler = karistir([grup, ...grupCeldiricileri(grup, 3)]);
      const dogruSira = secenekler.indexOf(grup);
      panel = secenekPaneli({
        baslik: 'Hangi grubu gördün?', secenekler,
        secince: (i) => {
          if (!ctx.aktifMi()) return false;
          panel.isaretle(i, dogruSira);
          sonuclandir(i === dogruSira, grup, gercekMs);
          return true;
        },
      });
      soru.replaceChildren(panel.kok);
      soru.hidden = false;
      panel.odakla();
    }

    function yazdir(grup, gercekMs) {
      const id = `gf-girdi-${tamam}`;
      const girdi = el('input', {
        type: 'text', id, sinif: 'girdi gf-girdi', autocomplete: 'off', autocapitalize: 'off', autocorrect: 'off', spellcheck: 'false', enterkeyhint: 'done',
      });
      const uyari = el('p', { sinif: 'gf-uyari', hidden: true, metin: 'Gördüğün kadarını yaz; emin değilsen tahmin et.' });
      // Sonuç kutusu gizliyken açıldığı için canlı bölge güvenilir değil: metin duyur() ile okunur
      const sonucEl = el('p', { sinif: 'flas-sonuc', hidden: true });
      let bitti = false;
      const kontrol = () => {
        if (bitti || !ctx.aktifMi()) return;
        if (!girdi.value.trim()) { uyari.hidden = false; girdi.focus(); return; }
        bitti = true;
        girdi.readOnly = true;
        dugme.setAttribute('aria-disabled', 'true');
        const k = yazimKarsilastir(girdi.value, grup);
        kelimeDogru += k.dogruKelime;
        kelimeToplam += k.toplamKelime;
        uyari.hidden = true;
        // Renk + ✓/✗ işareti + kısa animasyon (yalnız renge dayanmaz; hareketi azalt açıkken animasyon yok)
        const durum = k.tam ? 'dogru' : 'yanlis';
        girdi.dataset.sonuc = durum;
        sonucEl.dataset.sonuc = durum;
        sonucEl.hidden = false;
        sonuclandir(k.tam, grup, gercekMs, k.tam ? '' : ` (${k.dogruKelime}/${k.toplamKelime} kelime doğru)`, sonucEl);
        duyur(sonucEl.textContent);
      };
      const dugme = el('button', { type: 'button', sinif: 'btn btn--birincil', metin: 'Kontrol et', onclick: kontrol });
      girdi.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); kontrol(); } });
      soru.replaceChildren(el('div', { sinif: 'flas-soru__ic' },
        el('label', { for: id, sinif: 'gf-etiket', metin: 'Gördüğün kelimeleri yaz' }),
        el('div', { sinif: 'gf-yaz' }, girdi, dugme), uyari, sonucEl));
      soru.hidden = false;
      girdi.focus({ preventScroll: true });
    }

    alan.addEventListener('keydown', (e) => { panel?.tus(e); });
    deneme();
  },

  degerlendir({ dogru, yanlis, zorluk, ekstra }) {
    const sure = sonSure ?? this.seviyeler[zorluk - 1]?.sure ?? this.seviyeler[0].sure;
    const toplam = dogru + yanlis;
    const isabet = toplam ? Math.round((dogru * 100) / toplam) : 0;
    const esikMs = ekstra.esikMs ?? sure.baslangic;
    const satirlar = [
      ['Ortalama flaş süresi', `${esikMs} ms`],
      ['En kısa doğru flaş', ekstra.enKisaMs ? `${ekstra.enKisaMs} ms` : '-'],
    ];
    if (ekstra.kelimeIsabet != null) satirlar.push(['Doğru yazılan kelime', `%${ekstra.kelimeIsabet}`]);
    satirlar.push(['Ölçüm sapması', `± ${sayiBicimle(ekstra.sapmaMs ?? 0, 1)} ms (ekran karesi ${sayiBicimle(ekstra.kareMs ?? 16.7, 1)} ms)`]);
    return {
      isabet,
      puan: toplam ? hizPuani(esikMs) : 0,
      sonrakiSeviye: toplam ? merdivenSeviyesi(zorluk, { esikMs, isabet, ...sure }) : zorluk,
      satirlar,
    };
  },

  stil: `
    /* Grup 360 px'te taşmasın: yazı boyu grubun karakter sayısına göre küçülür (--ch) */
    .gf-oge { --kf: 0.62; font-size: var(--fs-xl); font-size: min(var(--fs-2xl), calc(92cqi / (var(--ch, 16) * var(--kf)))); }
    :root[data-font="disleksi"] .gf-oge { --kf: 0.72; }
    .gf-sahne .flas-odak { font-size: 2.25rem; }
    .gf-etiket { font-weight: 700; }
    .gf-yaz { display: flex; flex-wrap: wrap; gap: var(--b-2); justify-content: center; inline-size: min(100%, 30rem); }
    .gf-yaz .girdi { flex: 1 1 12rem; min-inline-size: 0; min-block-size: var(--dokunma-min); font-size: var(--fs-l); }
    .gf-uyari { color: var(--renk-uyari); }
  `,
};
