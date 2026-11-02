// Şekilli Metin (D06: yoklamada yalnız küçük harfli kelimeler): seçilen metin kare, üçgen ya da elmas biçiminde dizilir; göz şeklin ortasından aşağı iner, sonda kelime yoklaması yapılır
import { el } from '../../core/ui.js';
import { odakla, duyur } from '../../core/a11y.js';
import { karistir, kelimelereBol, karakterSayisi, trKucuk, sayiBicimle } from '../../core/utils.js';
import { hazirlikSecimi } from '../../engine/exercise-frame.js';
import { metniHazirla, kelimeMi, wpmHesapla } from '../../engine/reader-engine.js';
import { metinSeciciOlustur, metinSecimHatasi } from '../../engine/text-picker.js';
import { havuzHazirla, rastgeleKelime, kenarTemizle } from '../../engine/flas.js';

await havuzHazirla(); // metin bankasını da yükler

const EN_AZ_KELIME = 120;  // okuma bu sayıdan sonraki ilk cümle sonunda biter
const EN_COK_KELIME = 180;
const YOKLAMA = 3;         // metinde olan + olmayan kelime sayısı (her biri)
const COK_HIZLI_WPM = 450; // bunun üstünde seviye yükselmez
const SEKILLER = Object.freeze([
  { deger: 'karisik', etiket: 'Karışık', aciklama: 'her sayfada başka şekil' },
  { deger: 'kare', etiket: 'Kare' },
  { deger: 'ucgen', etiket: 'Üçgen' },
  { deger: 'elmas', etiket: 'Elmas' },
]);
const SIRA = ['kare', 'ucgen', 'elmas'];
const SEKIL_ADI = Object.freeze({ kare: 'kare', ucgen: 'üçgen', elmas: 'elmas', karisik: 'karışık' });
let sekilSecimi = 'karisik'; // oturum boyunca hatırlanır
let secici = null;

const harfKelimesi = (ham) => { const k = trKucuk(kenarTemizle(ham)); return /^\p{L}+$/u.test(k) ? k : null; };
// D06: yoklamada gösterilecek kelime metinde küçük harfle yazılmış olmalı (özel ad küçük harfe çevrilip gösterilmesin)
const kucukKelime = (ham) => { const k = kenarTemizle(ham); return /^\p{Ll}+$/u.test(k) ? k : null; };

// Şeklin satır genişlikleri (karakter). Satır yüksekliği ≈ 2,5 karakter genişliği: kare ≈ 0,4 × genişlik satır
function genislikler(sekil, g) {
  const dar = Math.max(6, Math.round(g * 0.25));
  if (sekil === 'kare') return Array(Math.max(4, Math.round(g * 0.4))).fill(g);
  if (sekil === 'ucgen') {
    const n = Math.max(4, Math.round(g * 0.45));
    return Array.from({ length: n }, (_, i) => Math.round(dar + ((g - dar) * i) / (n - 1)));
  }
  const yari = Math.max(3, Math.round(g * 0.3));
  const ust = Array.from({ length: yari }, (_, i) => Math.round(dar + ((g - dar) * i) / yari));
  return [...ust, g, ...[...ust].reverse()];
}

// Kelimeleri şekil sayfalarına dizer → [{ sekil, satirlar: [{ metin, hedef }] }]; satıra sığmayan tek kelime kendi satırında kalır
function sayfalariKur(kelimeler, secim, g) {
  const sayfalar = [];
  let i = 0;
  while (i < kelimeler.length) {
    const sekil = secim === 'karisik' ? SIRA[sayfalar.length % SIRA.length] : secim;
    const satirlar = [];
    for (const hedef of genislikler(sekil, g)) {
      if (i >= kelimeler.length) break;
      let satir = kelimeler[i++];
      while (i < kelimeler.length && karakterSayisi(satir) + 1 + karakterSayisi(kelimeler[i]) <= hedef) satir += ` ${kelimeler[i++]}`;
      satirlar.push({ metin: satir, hedef });
    }
    sayfalar.push({ sekil, satirlar });
  }
  // Son sayfa çok kısaysa bir öncekine eklenir
  if (sayfalar.length > 1 && sayfalar[sayfalar.length - 1].satirlar.length < 3) {
    const son = sayfalar.pop();
    sayfalar[sayfalar.length - 1].satirlar.push(...son.satirlar);
  }
  return sayfalar;
}

// Metnin başından en az 120 kelime; ilk cümle sonunda (en çok 180 kelimede) durur
function okunacakKisim(metin) {
  const kelimeler = [];
  let sayi = 0;
  for (const p of metniHazirla(metin).paragraflar) {
    for (const k of kelimelereBol(p)) {
      kelimeler.push(k);
      if (kelimeMi(k)) sayi += 1;
      if ((sayi >= EN_AZ_KELIME && /[.!?…]["'”’»)\]]*$/u.test(k)) || sayi >= EN_COK_KELIME) return { kelimeler, sayi };
    }
  }
  return { kelimeler, sayi };
}

// Yoklama: okunan kısımdan 3 kelime (metinde küçük harfle geçen) + metinde hiçbir biçimde geçmeyen 3 kelime
function yoklamaKur(metin, okunan) {
  const metindekiler = new Set(kelimelereBol(metniHazirla(metin).metin).map(harfKelimesi).filter(Boolean));
  const tekil = [...new Set(okunan.map(kucukKelime).filter(Boolean))];
  let aday = tekil.filter((k) => karakterSayisi(k) >= 5);
  if (aday.length < YOKLAMA) aday = tekil.filter((k) => karakterSayisi(k) >= 3);
  const varOlan = karistir(aday).slice(0, YOKLAMA);
  const olmayan = [];
  for (let j = 0; j < 60 && olmayan.length < varOlan.length; j++) {
    const k = rastgeleKelime([5, 10], { haric: metindekiler });
    if (!olmayan.includes(k) && !metindekiler.has(k)) olmayan.push(k);
  }
  return karistir([...varOlan.map((k) => ({ k, var: true })), ...olmayan.map((k) => ({ k, var: false }))]);
}

export default {
  modul: 'goz',
  egzersiz: 'sekilli-metin',
  ad: 'Şekilli Metin',
  ikon: 'sekil',
  kisaAciklama: 'Metin kare, üçgen ya da elmas biçiminde dizilir. Gözünü şeklin ortasından aşağı indirerek satırları bütün olarak görmeyi çalış.',
  nasil: [
    'Gözünü her satırın ortasına (kesik çizgi) koy ve aşağı doğru in; satırın iki yanını yan görüşünle yakalamaya çalış.',
    'Şekli okuyunca “Sonraki şekil”e bas. Metnin başından yaklaşık 150 kelime okursun; süre yalnızca okurken işler.',
    'Sonda birkaç kelime gösterilir: okuduğun metinde olanları seç. Acele etme; anlamadan hızlanmak işe yaramaz.',
  ],
  seviyeler: [
    { ad: 'Dar', genislik: 16 },
    { ad: 'Orta', genislik: 24 },
    { ad: 'Geniş', genislik: 32 },
  ],
  otomatikSeviye: true,
  etiketler: { dogru: 'Doğru işaret', yanlis: 'Yanlış işaret' },
  puanEtiketi: 'Dikkatli okuma puanı',
  puanAciklama: 'Dakikadaki kelime × kelime yoklaması isabeti.',
  alanEtiketi: 'Şekilli metin alanı',

  hazirlik() {
    secici = metinSeciciOlustur({ egzersiz: 'sekilli-metin', kimlik: 'sm' });
    return el('div', { sinif: 'okuma-ayar' },
      hazirlikSecimi({ ad: 'smSekil', baslik: 'Şekil', secenekler: SEKILLER, secili: sekilSecimi, degisince: (d) => { sekilSecimi = d; } }),
      secici.kok);
  },

  hazirlikDenetle() {
    return metinSecimHatasi(secici);
  },

  baslat(ctx) {
    const { alan, seviye: s } = ctx;
    const metin = secici?.secili();
    if (!metin) throw new Error('Metin seçilmedi.');
    const { kelimeler, sayi } = okunacakKisim(metin.metin);
    const sayfalar = sayfalariKur(kelimeler, sekilSecimi, s.genislik);
    Object.assign(ctx.ekstra, { sekil: sekilSecimi, genislik: s.genislik, kelime: sayi, metin: metin.kimlik, kaynak: metin.kaynak });
    alan.classList.add('sm-alan');

    const durumEl = el('p', { sinif: 'sm-durum' });
    const kutu = el('div', { sinif: 'sm-kutu' });
    const ileri = el('button', { type: 'button', sinif: 'btn btn--birincil sm-ileri' });
    alan.append(durumEl, kutu, el('div', { sinif: 'sm-eylem' }, ileri));
    let no = 0;

    function sayfaGoster() {
      const sayfa = sayfalar[no];
      const son = no === sayfalar.length - 1;
      durumEl.textContent = `Şekil ${no + 1} / ${sayfalar.length} · ${metin.ad}`;
      const ch = Math.max(s.genislik, ...sayfa.satirlar.map((x) => karakterSayisi(x.metin)));
      // Satır, şekildeki genişliğine iki yana yaslanır; tek kelimelik satır ortalanır
      kutu.replaceChildren(el('div', { sinif: 'sm-sekil', 'data-sekil': sayfa.sekil, style: `--ch:${ch}` },
        sayfa.satirlar.map((x) => el('span', { sinif: `sm-satir${x.metin.includes(' ') ? '' : ' sm-satir--tek'}`, style: `--w:${x.hedef}`, metin: x.metin }))));
      kutu.scrollTop = 0;
      ileri.textContent = son ? 'Bitirdim' : 'Sonraki şekil';
      if (no > 0) duyur(`Şekil ${no + 1}`);
    }

    ileri.addEventListener('click', () => {
      if (!ctx.aktifMi()) return;
      if (no < sayfalar.length - 1) { no += 1; sayfaGoster(); return; }
      ctx.ekstra.sureMs = Math.round(ctx.gecenSn() * 1000);
      yoklamaGoster();
    });

    function yoklamaGoster() {
      const liste = yoklamaKur(metin.metin, kelimeler);
      durumEl.textContent = 'Kelime yoklaması';
      const baslik = el('h3', { id: 'sm-yoklama-baslik', metin: 'Okuduğun bölümde hangi kelimeler vardı?' });
      const dugmeler = liste.map((x) => el('button', {
        type: 'button', sinif: 'btn btn--ikincil sm-kelime', 'aria-pressed': 'false', metin: x.k,
        onclick: (e) => { if (!kontrolEdildi) e.currentTarget.setAttribute('aria-pressed', String(e.currentTarget.getAttribute('aria-pressed') !== 'true')); },
      }));
      const geri = el('p', { sinif: 'sm-geri', 'aria-live': 'polite' });
      let kontrolEdildi = false;
      const kontrol = el('button', { type: 'button', sinif: 'btn btn--birincil', metin: 'Kontrol et', onclick: () => {
        if (!ctx.aktifMi()) return;
        if (kontrolEdildi) { ctx.bitir(); return; }
        kontrolEdildi = true;
        let d = 0;
        dugmeler.forEach((b, i) => {
          const secili = b.getAttribute('aria-pressed') === 'true';
          const dogruMu = secili === liste[i].var;
          if (dogruMu) d += 1;
          b.dataset.sonuc = dogruMu ? 'dogru' : 'yanlis';
          b.setAttribute('aria-disabled', 'true');
          b.textContent = `${liste[i].var ? '✓' : '–'} ${liste[i].k} (${liste[i].var ? 'vardı' : 'yoktu'})`;
        });
        if (d) ctx.dogru(d);
        if (liste.length - d) ctx.yanlis(liste.length - d);
        geri.textContent = `${liste.length} kelimeden ${d} tanesini doğru işaretledin.`;
        kontrol.textContent = 'Sonucu gör';
        kontrol.focus();
      } });
      kutu.replaceChildren(el('section', { sinif: 'sm-yoklama', 'aria-labelledby': 'sm-yoklama-baslik' },
        baslik,
        el('p', { metin: 'Metinde gördüğünü düşündüğün kelimeleri seç (birden çok olabilir), sonra “Kontrol et”e bas.' }),
        el('div', { sinif: 'sm-kelimeler', role: 'group', 'aria-labelledby': 'sm-yoklama-baslik' }, dugmeler),
        geri, kontrol));
      ileri.parentElement.hidden = true;
      odakla(baslik);
    }

    sayfaGoster();
    ileri.focus({ preventScroll: true });
  },

  degerlendir({ dogru, yanlis, zorluk, ekstra }) {
    const toplam = dogru + yanlis;
    const isabet = toplam ? Math.round((dogru * 100) / toplam) : 0;
    const wpm = wpmHesapla(ekstra.kelime ?? 0, ekstra.sureMs ?? 0);
    const cokHizli = wpm > COK_HIZLI_WPM;
    const sonuc = {
      isabet,
      wpm,
      puan: Math.round((wpm * isabet) / 100),
      satirlar: [
        ['Okunan kelime', ekstra.kelime ?? 0],
        ['Okuma hızı', `${sayiBicimle(wpm)} kelime/dk`],
        ['Şekil', `${SEKIL_ADI[ekstra.sekil] ?? '-'}, ${ekstra.genislik} karakter genişlik`],
      ],
    };
    if (cokHizli && isabet < 100) {
      sonuc.sonrakiSeviye = zorluk;
      sonuc.mesaj = 'Bu hızda satırları gerçekten görmek zor. Bir sonraki turda şeklin ortasından satır satır, rahatça in.';
    }
    return sonuc;
  },

  stil: `
    .egz-alan.sm-alan { display: flex; flex-direction: column; gap: var(--b-3); padding: var(--b-3); overflow: auto; }
    .sm-alan [hidden] { display: none !important; }
    .sm-durum { margin: 0; font-weight: 700; color: var(--renk-metin-soluk); overflow-wrap: anywhere; }
    .sm-kutu { flex: 1 0 auto; display: grid; align-content: center; container-type: inline-size; }
    /* Yazı boyu şeklin en uzun satırına göre küçülür (--ch): 360 px'te yatay taşma olmaz */
    .sm-sekil {
      --kf: 0.6; position: relative; display: grid; justify-items: center; padding-block: var(--b-2);
      font-size: var(--fs-m); font-size: min(1.25rem, calc(96cqi / (var(--ch) * var(--kf)))); line-height: 1.55;
      user-select: text; -webkit-user-select: text;
    }
    :root[data-font="disleksi"] .sm-sekil { --kf: 0.72; }
    .sm-sekil::before { content: ""; position: absolute; inset-block: 0; inset-inline-start: 50%; border-inline-start: 2px dashed var(--renk-kenar); }
    .sm-satir {
      position: relative; display: block; inline-size: fit-content; min-inline-size: calc(var(--w) * var(--kf) * 1em);
      white-space: nowrap; padding-inline: 0.15em; background: var(--renk-yuzey); text-align: justify; text-align-last: justify;
    }
    .sm-satir--tek { text-align-last: center; }
    .sm-eylem { display: flex; justify-content: center; }
    .sm-ileri { min-inline-size: 12rem; }
    .sm-yoklama { display: grid; gap: var(--b-3); justify-items: center; text-align: center; max-inline-size: 32rem; margin-inline: auto; }
    .sm-yoklama h3, .sm-yoklama p { margin: 0; }
    .sm-kelimeler { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--b-2); inline-size: 100%; }
    .sm-kelime { min-block-size: 3rem; overflow-wrap: anywhere; }
    .sm-kelime[aria-pressed="true"] { border-color: var(--renk-birincil); background: var(--renk-birincil-zemin); color: var(--renk-birincil); box-shadow: inset 0 0 0 2px var(--renk-birincil); }
    .sm-kelime[data-sonuc="dogru"] { border-color: var(--renk-basari); }
    .sm-kelime[data-sonuc="yanlis"] { border-color: var(--renk-vurgu-metin); border-style: dashed; }
    .sm-geri { font-weight: 700; }
  `,
};
