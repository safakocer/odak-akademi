// Nesne Takibi (D06: işaret halkası kontrastı; S34-son: ilkokulda tempo sınıf bandından, en uzun süre bant enCokDakika, kısa alıştırma turu, örnek): baş sabit, gözler hareket eden noktayı izler (yatay, dikey, sekiz, zigzag); her dakikanın sonunda kısa mola, ara sıra beliren işaretle dikkat denetimi
import { el } from '../../core/ui.js';
import { hareketAzaltilmisMi, duyur, odakla } from '../../core/a11y.js';
import { sureBicimle } from '../../core/utils.js';
import { hazirlikSecimi, ornekListesi } from '../../engine/exercise-frame.js';

const BLOK_MS = 60 * 1000; // her 60 sn hareketten sonra mola
const MOLA_SN = 15;
const ADIM_MS = 500;       // "hareketi azalt" açıkken nokta kaymaz, bu aralıkla adım adım ilerler
const YOLLAR = Object.freeze([
  { deger: 'yatay', etiket: 'Yatay', aciklama: 'soldan sağa, sağdan sola' },
  { deger: 'dikey', etiket: 'Dikey', aciklama: 'yukarıdan aşağıya' },
  { deger: 'sekiz', etiket: 'Sekiz', aciklama: 'yan yatmış 8 şeklinde' },
  { deger: 'zigzag', etiket: 'Zigzag', aciklama: 'sağa sola giderek iner, çıkar' },
]);
const SURELER = Object.freeze([1, 2, 3].map((d) => ({ deger: d, etiket: `${d} dakika`, aciklama: d > 1 ? `${d - 1} kısa mola` : 'molasız' })));
const secim = { yol: 'yatay', dakika: 2 }; // oturum boyunca hatırlanır
const ALISTIRMA_SN = 20; // S34-son: alıştırma turu (bant alistirma.sureSn verirse o)
// S34-son: bandın en uzun süresi (enCokDakika; ilkokulda 1-2 dk), yoksa 3
const enCokDakika = (bant) => Math.max(1, Math.min(3, Number(bant?.enCokDakika) || 3));

const ucgen = (a) => (2 / Math.PI) * Math.asin(Math.sin(a)); // -1..1 arasında düz çizgilerle gidip gelen dalga
// Yol: faz (radyan) → { x, y } (-1..1); hepsi ortadan başlar
const YOL_FN = {
  yatay: (p) => ({ x: Math.sin(p), y: 0 }),
  dikey: (p) => ({ x: 0, y: Math.sin(p) }),
  sekiz: (p) => ({ x: Math.sin(p * 0.6), y: Math.sin(p * 1.2) }),
  zigzag: (p) => ({ x: ucgen(p), y: ucgen(p / 5) }),
};
const rastgele = (en, enCok) => en + Math.random() * (enCok - en);

export default {
  modul: 'goz',
  egzersiz: 'nesne-takibi',
  ad: 'Nesne Takibi',
  ikon: 'yorunge',
  kisaAciklama: 'Başını sabit tut, hareket eden noktayı yalnızca gözlerinle izle.',
  nasil: [
    'Başını sabit tut; ekrandaki noktayı yalnızca gözlerinle izle.',
    'Nokta ara sıra sarı bir kareye dönüşür. O an ekrana dokun ya da Boşluk tuşuna bas.',
    `Her dakikanın sonunda ${MOLA_SN} saniyelik kısa mola var. Gözlerin yorulursa ya da rahatsız hissedersen hemen duraklat.`,
  ],
  seviyeler: [
    { ad: 'Yavaş', turMs: 7000, isaretMs: 1800, araMin: 4500, araMax: 8500 },
    { ad: 'Orta', turMs: 5000, isaretMs: 1500, araMin: 4000, araMax: 8000 },
    { ad: 'Hızlı', turMs: 3600, isaretMs: 1300, araMin: 3500, araMax: 7000 },
  ],
  etiketler: { dogru: 'Yakalanan işaret', yanlis: 'Boşa dokunuş' },
  puanEtiketi: 'Takip puanı',
  puanAciklama: 'Yakalanan işaretlerin yüzdesi; kaçan işaret ve boşa dokunuş puanı düşürür.',
  alanEtiketi: 'Takip alanı. Nokta sarı kareye dönüşünce Boşluk tuşuna bas.',
  ornek: () => ornekListesi([
    { cizim: el('span', { sinif: 'nt-nokta nt-ornek' }), metin: 'Yeşil nokta: gözünle izle' },
    { cizim: el('span', { sinif: 'nt-nokta nt-nokta--isaret nt-ornek' }), metin: 'Sarı kare: ekrana dokun' },
  ]),

  hazirlik({ bant } = {}) {
    const enCok = enCokDakika(bant);
    if (secim.dakika > enCok) secim.dakika = enCok;
    return el('div', { sinif: 'okuma-ayar' },
      hazirlikSecimi({ ad: 'yol', baslik: 'Hareket yolu', secenekler: YOLLAR, secili: secim.yol, degisince: (d) => { secim.yol = d; } }),
      hazirlikSecimi({ ad: 'dakika', baslik: 'Süre', secenekler: SURELER.filter((x) => x.deger <= enCok), secili: secim.dakika, degisince: (d) => { secim.dakika = d; } }),
      hareketAzaltilmisMi() && el('p', { sinif: 'okuma-ayar__not', metin: '“Hareketi azalt” açık: nokta kayarak değil, kısa adımlarla ilerler.' }));
  },

  baslat(ctx) {
    const { alan, seviye: s } = ctx;
    const yolFn = YOL_FN[secim.yol] ?? YOL_FN.yatay;
    // S34-son: alıştırma tek kısa blok (molasız); asıl turda seçilen dakika, bandın en uzun süresini aşmaz
    const blokSiniri = ctx.alistirma ? (ctx.alistirma.sureSn ?? ALISTIRMA_SN) * 1000 : BLOK_MS;
    const toplamBlok = ctx.alistirma ? 1 : Math.min(secim.dakika, enCokDakika(ctx.bant));
    const azalt = hareketAzaltilmisMi();
    Object.assign(ctx.ekstra, { yol: secim.yol, dakika: toplamBlok, isaret: 0, kacan: 0, mola: 0 });
    alan.classList.add('nt-alan');
    const nokta = el('span', { sinif: 'nt-nokta' });
    const sahne = el('div', { sinif: 'nt-sahne', 'aria-hidden': 'true' }, nokta);
    const molaKutu = el('section', { sinif: 'nt-mola', hidden: true, 'aria-labelledby': 'nt-mola-baslik' });
    alan.append(sahne, molaKutu);

    let hareketMs = 0;   // yalnız nokta hareket ederken işler (duraklatma ve mola sayılmaz)
    let blokMs = 0;
    let blok = 1;
    let adimMs = ADIM_MS;
    let son = null;
    let kare = 0;
    let molada = false;
    let isaretAcik = false;
    let isaretIptal = null;
    let molaIptal = null;

    function ciz() {
      const w = sahne.clientWidth;
      const h = sahne.clientHeight;
      const rx = Math.max(0, Math.min(w / 2 - 24, 520)); // geniş ekranda bile rahat bakış açısı
      const ry = Math.max(0, Math.min(h / 2 - 24, 320));
      const { x, y } = yolFn((hareketMs / s.turMs) * 2 * Math.PI);
      nokta.style.transform = `translate(${w / 2 + x * rx}px, ${h / 2 + y * ry}px)`;
    }

    function kareCiz(simdi) {
      kare = requestAnimationFrame(kareCiz);
      const dt = son == null ? 0 : Math.min(100, simdi - son);
      son = simdi;
      if (molada || !ctx.aktifMi()) return;
      hareketMs += dt;
      blokMs += dt;
      adimMs += dt;
      if (!azalt || adimMs >= ADIM_MS) { adimMs = 0; ciz(); }
      if (blokMs >= blokSiniri) blokBitti();
    }

    // ---------- Dikkat işareti ----------
    function isaretPlanla() {
      isaretIptal = ctx.sonra(isaretGoster, rastgele(s.araMin, s.araMax));
    }
    function isaretGoster() {
      isaretIptal = null;
      if (molada || blokSiniri - blokMs < s.isaretMs + 500) return; // dakika bitmek üzereyse yeni işaret yok
      isaretAcik = true;
      ctx.ekstra.isaret += 1;
      nokta.classList.add('nt-nokta--isaret');
      isaretIptal = ctx.sonra(() => {
        if (isaretAcik) { isaretAcik = false; ctx.ekstra.kacan += 1; nokta.classList.remove('nt-nokta--isaret'); }
        isaretPlanla();
      }, s.isaretMs);
    }
    function isaretKapat() {
      isaretIptal?.();
      isaretIptal = null;
      if (!isaretAcik) return;
      isaretAcik = false;
      ctx.ekstra.isaret -= 1; // yarıda kalan işaret sayılmaz
      nokta.classList.remove('nt-nokta--isaret');
    }
    function yakala() {
      if (molada || !ctx.aktifMi()) return;
      if (isaretAcik) {
        isaretAcik = false;
        nokta.classList.remove('nt-nokta--isaret');
        ctx.dogru(1, 'tik');
      } else ctx.yanlis();
    }

    // ---------- Dakika sonu ve mola ----------
    function blokBitti() {
      isaretKapat();
      if (blok >= toplamBlok) { ctx.bitir(); return; }
      molaBaslat();
    }
    function molaBaslat() {
      molada = true;
      ctx.ekstra.mola += 1;
      nokta.hidden = true;
      let kalan = MOLA_SN;
      const baslik = el('h3', { id: 'nt-mola-baslik', metin: `${blok}. dakika bitti: kısa mola` });
      const sure = el('p', { sinif: 'nt-mola__sure', role: 'timer', 'aria-live': 'off', metin: sureBicimle(kalan) });
      molaKutu.replaceChildren(baslik,
        el('p', { metin: 'Gözlerini birkaç saniye kapat ya da uzaktaki bir noktaya bak. Omuzlarını gevşet.' }),
        sure,
        el('button', { type: 'button', sinif: 'btn btn--ikincil', metin: 'Molayı geç', onclick: molaBitir }));
      molaKutu.hidden = false;
      odakla(baslik);
      duyur(`Kısa mola, ${MOLA_SN} saniye.`);
      molaIptal = ctx.her(() => {
        kalan -= 1;
        sure.textContent = sureBicimle(Math.max(0, kalan));
        if (kalan <= 0) molaBitir();
      }, 1000);
    }
    function molaBitir() {
      if (!molada) return;
      molaIptal?.();
      molaIptal = null;
      molaKutu.hidden = true;
      molaKutu.replaceChildren();
      nokta.hidden = false;
      blok += 1;
      blokMs = 0;
      molada = false;
      duyur(`${blok}. dakika başladı. Noktayı izle.`);
      odakla(alan, { kaydir: false });
      isaretPlanla();
    }

    // ---------- Girdi: dokunma her yerde, klavyede Boşluk / Enter ----------
    alan.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.nt-mola')) return;
      e.preventDefault();
      yakala();
    });
    alan.addEventListener('keydown', (e) => {
      if ((e.key !== ' ' && e.key !== 'Enter') || e.target.closest('button')) return;
      e.preventDefault();
      if (!e.repeat) yakala();
    });

    kare = requestAnimationFrame(kareCiz);
    ctx.temizlenince(() => cancelAnimationFrame(kare));
    isaretPlanla();
  },

  degerlendir({ dogru, yanlis, ekstra }) {
    const kacan = ekstra.kacan ?? 0;
    const toplam = dogru + yanlis + kacan;
    const isabet = toplam ? Math.round((dogru * 100) / toplam) : 0;
    const yol = YOLLAR.find((y) => y.deger === ekstra.yol)?.etiket ?? '-';
    return {
      puan: isabet,
      isabet,
      satirlar: [['Kaçan işaret', kacan], ['Hareket yolu', yol], ...(ekstra.mola ? [['Verilen mola', `${ekstra.mola} kez`]] : [])],
    };
  },

  stil: `
    .nt-alan [hidden] { display: none !important; }
    .nt-sahne { position: absolute; inset: 0; }
    .nt-nokta {
      --nt-boyut: 28px;
      position: absolute; left: 0; top: 0; width: var(--nt-boyut); height: var(--nt-boyut);
      margin: calc(var(--nt-boyut) / -2) 0 0 calc(var(--nt-boyut) / -2);
      border-radius: 50%; background: var(--renk-birincil); box-shadow: 0 0 0 4px var(--renk-birincil-zemin);
      will-change: transform; pointer-events: none;
    }
    /* İşaret: renk + biçim değişir (yalnız renge dayanmaz) */
    /* D06: kenar halkası --renk-uyari (açık zeminde 3:1 üstü); sarı dolgu tek başına zeminden ayrışmıyordu */
    .nt-nokta--isaret { --nt-boyut: 34px; border-radius: 22%; background: var(--renk-gunes); box-shadow: 0 0 0 4px var(--renk-uyari); }
    .nt-mola {
      position: absolute; inset: 0; z-index: 1; display: grid; place-content: center; justify-items: center; gap: var(--b-3);
      padding: var(--b-4); background: var(--renk-yuzey); text-align: center;
    }
    .nt-mola h3 { margin: 0; font-size: var(--fs-l); }
    .nt-mola p { margin: 0; max-width: 26rem; }
    .nt-nokta.nt-ornek { position: relative; display: block; margin: 0; transform: none; }
    .nt-mola__sure { font-family: var(--font-baslik); font-size: var(--fs-2xl); font-weight: 700; font-variant-numeric: tabular-nums; }
  `,
};
