// Işıklı Bloklar (Corsi blokları, S14a): 9 büyük ve aralıklı bloktan bazıları sırayla yanar; öğrenci aynı sırayla (ya da sondan başa) dokunur, Geri al ile düzeltir. Yol uzunluğu merdivenle uyarlanır (memory-core.js; S34-son: ilkokulda tempo, yol sınırı ve yön sınıf bandından, örnek)
import { el } from '../../core/ui.js';
import { karistir } from '../../core/utils.js';
import { duyur } from '../../core/a11y.js';
import { hafizaOyunu, hafizaSahnesi, diziTuru, bekle, ogeDuyur } from '../../engine/memory-core.js';
import { ornekListesi } from '../../engine/exercise-frame.js';

const BIRIM = 'blok';
const KONUMLAR = Object.freeze(['sol üst', 'üst orta', 'sağ üst', 'sol orta', 'orta', 'sağ orta', 'sol alt', 'alt orta', 'sağ alt']);
const DOKUNUS_MS = 220; // dokunulan blok kısa süre işaretli kalır

export default hafizaOyunu({
  egzersiz: 'corsi-bloklari',
  ad: 'Işıklı Bloklar',
  ikon: 'bloklar',
  birim: BIRIM,
  kisaAciklama: 'Bir görsel hafıza çalışması: yanan blokların yolunu aklında tut. Yarış değil; kendi en uzun yolunu geçmeye çalış.',
  nasil: [
    'Dokuz bloktan bazıları sırayla yanar. Yanma sırasını izle. Seviye, ışığın ne kadar süre yanacağını belirler.',
    'Sıra sana gelince bloklara aynı sırayla dokun; geri yönde sondan başa. Yanlış dokunursan Geri al ile düzelt, sonra Tamam’a bas. Klavyede 1-9 tuşları blokları soldan sağa, yukarıdan aşağı seçer.',
    'Doğru yaptıkça yol bir blok uzar; üst üste iki kez tutmazsa bir blok kısalır. Böylece yol hep senin için uygun uzunlukta kalır.',
  ],
  seviyeler: [
    { ad: 'Rahat', gosterMs: 900, araMs: 350 },
    { ad: 'Orta', gosterMs: 700, araMs: 300 },
    { ad: 'Hızlı', gosterMs: 500, araMs: 250 },
  ],
  baslangic: { ileri: 3, geri: 2 },
  sinir: { en: 2, enCok: 9 },
  deneme: 12,
  ipuclari: [
    'yolu bir şekil gibi düşün: üçgen, zikzak ya da köşeden köşeye bir çizgi.',
    'bloklar yanarken yalnızca izle; dizi bitince dokunmaya başla.',
    { mod: 'geri', metin: 'geri yönde son yanan bloktan başla ve yolu tersinden yürü.' },
  ],
  // S34-son: kısa yönergede görsel örnek: 3×3 küçük ızgarada iki blok sırayla
  ornek: () => ornekListesi([
    { cizim: el('span', { sinif: 'corsi-ornek' }, [0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => el('span', { 'data-sira': i === 2 ? '1' : i === 6 ? '2' : null, metin: i === 2 ? '1' : i === 6 ? '2' : '' }))),
      metin: 'Bloklar sırayla yanar, sırayı aklında tut' },
    { cizim: el('span', { sinif: 'egz-ornek__yazi', metin: '1 → 2' }), metin: 'Sonra aynı sırayla dokun' },
  ]),
  alanEtiketi: 'Işıklı Bloklar. Yanan blokların konumu okunur. Sıra sana gelince bloklara aynı sırayla bas; 1-9 tuşları da blok seçer, Geri silme tuşu son seçimi geri alır, Enter onaylar.',

  baslat(ctx, { ters, merdiven, deneme }) {
    const s = ctx.seviye;
    const sahne = hafizaSahnesi(ctx, { sahneSinif: 'corsi-sahne' });
    let secilen = [];
    let hedefN = 0;
    let acik = false;
    let coz = null;

    const bloklar = KONUMLAR.map((ad, i) => el('button', {
      type: 'button', sinif: 'corsi-blok', 'aria-label': `Blok: ${ad}`, onclick: () => sec(i),
    }));
    const izgara = el('div', { sinif: 'corsi-izgara', role: 'group', 'aria-label': 'Dokuz blok' }, bloklar);
    const ilerleme = el('p', { sinif: 'corsi-ilerleme', 'aria-live': 'polite' });
    const geriAlDugme = el('button', { type: 'button', sinif: 'btn btn--ikincil corsi-dugme', metin: 'Geri al', onclick: () => geriAl() });
    const tamamDugme = el('button', { type: 'button', sinif: 'btn btn--birincil corsi-dugme', metin: 'Tamam', onclick: () => tamam() });
    const eylemler = el('div', { sinif: 'corsi-eylemler' }, geriAlDugme, tamamDugme);
    sahne.sahne.append(izgara);
    ctx.alan.append(el('div', { sinif: 'corsi-alt' }, ilerleme, eylemler));

    function izgaraAc(ac) {
      acik = ac;
      izgara.setAttribute('aria-disabled', String(!ac));
      eylemler.setAttribute('aria-disabled', String(!ac));
    }

    function isaretleriTemizle() {
      bloklar.forEach((b) => { delete b.dataset.yanik; delete b.dataset.dokunuldu; delete b.dataset.sira; delete b.dataset.sonuc; });
    }

    function ilerlemeCiz() {
      ilerleme.replaceChildren(
        el('span', { 'aria-hidden': 'true', metin: Array.from({ length: hedefN }, (_, i) => (i < secilen.length ? '●' : '○')).join(' ') }),
        el('span', { sinif: 'ekran-okuyucu', metin: `Seçilen ${secilen.length}/${hedefN}` }));
      tamamDugme.setAttribute('aria-disabled', String(secilen.length < hedefN));
    }

    function sec(i) {
      if (!acik || !ctx.aktifMi() || secilen.length >= hedefN) return;
      secilen.push(i);
      ctx.ses('tik');
      sahne.temizle();
      const blok = bloklar[i];
      blok.dataset.dokunuldu = '';
      ctx.sonra(() => { delete blok.dataset.dokunuldu; }, DOKUNUS_MS);
      ilerlemeCiz();
    }

    function geriAl() {
      if (!acik || !ctx.aktifMi() || !secilen.length) return;
      secilen.pop();
      ilerlemeCiz();
    }

    function tamam() {
      if (!acik || !ctx.aktifMi()) return;
      if (secilen.length < hedefN) {
        sahne.geriYaz(null, `${hedefN} bloğun hepsine dokun; şu an ${secilen.length} blok seçtin.`);
        return;
      }
      izgaraAc(false);
      const sonuc = [...secilen];
      coz?.(sonuc);
      coz = null;
    }

    // Klavye: 1-9 blok seçer (soldan sağa, yukarıdan aşağı), Geri silme/Delete geri alır, Enter onaylar
    ctx.alan.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (/^[1-9]$/.test(e.key)) { e.preventDefault(); if (!e.repeat) sec(Number(e.key) - 1); }
      else if (e.key === 'Backspace' || e.key === 'Delete') { e.preventDefault(); geriAl(); }
      else if (e.key === 'Enter' && !(e.target instanceof HTMLButtonElement)) { e.preventDefault(); if (!e.repeat) tamam(); }
    });

    izgaraAc(false);
    diziTuru(ctx, {
      sahne, merdiven, deneme, ters, birim: BIRIM,
      uret: (n) => karistir([0, 1, 2, 3, 4, 5, 6, 7, 8]).slice(0, n), // bir yolda aynı blok iki kez yanmaz
      async sun(dizi) {
        isaretleriTemizle();
        ilerleme.replaceChildren();
        izgara.dataset.izle = '';
        for (const i of dizi) {
          bloklar[i].dataset.yanik = '';
          ogeDuyur(KONUMLAR[i]);
          await bekle(ctx, s.gosterMs);
          delete bloklar[i].dataset.yanik;
          await bekle(ctx, s.araMs);
        }
        delete izgara.dataset.izle;
      },
      gir(n) {
        hedefN = n;
        secilen = [];
        isaretleriTemizle();
        ilerlemeCiz();
        izgaraAc(true);
        return new Promise((r) => { coz = r; });
      },
      // Doğru sıra bloklarda numarayla gösterilir; yanlış dokunulan konum kesik çerçeveyle işaretlenir
      sonucta(kayit, { hedef, yanit }) {
        if (kayit.dogru) {
          hedef.forEach((i) => { bloklar[i].dataset.sonuc = 'dogru'; });
          return;
        }
        hedef.forEach((i, j) => { bloklar[i].dataset.sira = String(j + 1); });
        yanit.forEach((i, j) => { if (hedef[j] !== i && !hedef.includes(i)) bloklar[i].dataset.sonuc = 'yanlis'; });
        duyur(`Doğru sıra: ${hedef.map((i) => KONUMLAR[i]).join(', ')}.`);
      },
      dogrusuMetni: () => 'Doğru sıra bloklarda numarayla gösteriliyor.',
    });
  },

  stil: `
    .corsi-sahne { padding: clamp(0.75rem, 4vw, 1.5rem); }
    /* Bloklar büyük ve aralıklı: yanlış dokunma riski düşük (en küçük ekranda ~80 px blok, ~18 px boşluk) */
    .corsi-izgara {
      display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: clamp(0.875rem, 5vw, 1.75rem);
      inline-size: min(100%, 24rem, 56dvh);
    }
    .corsi-blok {
      position: relative; aspect-ratio: 1; min-block-size: 3.5rem; padding: 0;
      border: 3px solid var(--renk-metin-soluk); border-radius: var(--kose-m); background: var(--renk-yuzey);
      color: var(--renk-metin); font: inherit; cursor: pointer; touch-action: manipulation;
      transition: background-color var(--sure-hizli) ease-out, box-shadow var(--sure-hizli) ease-out;
    }
    .corsi-blok:focus-visible { outline: 3px solid var(--renk-odak); outline-offset: 3px; }
    .corsi-izgara[aria-disabled="true"] .corsi-blok { cursor: default; }
    /* Yanan blok: güneş rengi + koyu iç daire (yalnız renge dayanmaz) */
    .corsi-blok[data-yanik] { background: var(--renk-gunes); border-color: var(--renk-gunes-golge); box-shadow: 0 0 0 4px var(--renk-gunes-golge); }
    .corsi-blok[data-yanik]::before { content: ""; position: absolute; inset: 32%; border-radius: 50%; background: var(--renk-gunes-uzeri); }
    .corsi-blok[data-dokunuldu] { background: var(--renk-birincil-zemin); border-color: var(--renk-birincil); box-shadow: inset 0 0 0 3px var(--renk-birincil); }
    .corsi-blok[data-sonuc="dogru"] { background: var(--renk-basari-zemin); border-color: var(--renk-basari); }
    .corsi-blok[data-sonuc="yanlis"] { background: var(--renk-vurgu-zemin); border-color: var(--renk-vurgu-metin); border-style: dashed; }
    .corsi-blok[data-sira] { background: var(--renk-birincil-zemin); border-color: var(--renk-birincil); }
    .corsi-blok[data-sira]::after {
      content: attr(data-sira); position: absolute; inset: 0; display: grid; place-items: center;
      font-size: var(--fs-2xl); font-weight: 800; color: var(--renk-metin);
    }
    .corsi-ornek { display: grid; grid-template-columns: repeat(3, 0.8rem); gap: 2px; }
    .corsi-ornek > span { display: grid; place-items: center; block-size: 0.8rem; border: 1px solid var(--renk-metin-soluk); border-radius: 2px; font-size: 0.55rem; font-weight: 800; line-height: 1; }
    .corsi-ornek > span[data-sira] { background: var(--renk-gunes); border-color: var(--renk-gunes-golge); color: var(--renk-gunes-uzeri); }
    .corsi-alt { display: grid; justify-items: center; gap: var(--b-2); }
    .corsi-ilerleme { min-block-size: 1.6em; margin: 0; font-size: var(--fs-l); letter-spacing: 0.1em; color: var(--renk-birincil); }
    .corsi-eylemler { display: flex; flex-wrap: wrap; justify-content: center; gap: var(--b-2); inline-size: min(100%, 22rem); }
    .corsi-dugme { flex: 1 1 8rem; min-block-size: 3.25rem; }
    .corsi-eylemler[aria-disabled="true"] .corsi-dugme, .corsi-dugme[aria-disabled="true"] { opacity: 0.6; }
    @media (forced-colors: active) {
      .corsi-blok[data-yanik] { background: Highlight; }
      .corsi-blok[data-dokunuldu], .corsi-blok[data-sira] { outline: 3px solid Highlight; }
    }
  `,
});
