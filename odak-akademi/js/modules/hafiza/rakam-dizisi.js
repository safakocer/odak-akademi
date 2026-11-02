// Rakam Dizisi (S14a): rakamlar tek tek gösterilir; öğrenci aynı sırayla (ileri) ya da sondan başa (geri) büyük tuş takımıyla girer, Sil ile düzeltir. Dizi uzunluğu merdivenle uyarlanır (memory-core.js)
import { el } from '../../core/ui.js';
import { hafizaOyunu, hafizaSahnesi, diziTuru, bekle, ogeDuyur } from '../../engine/memory-core.js';

const BIRIM = 'rakam';
const TUS_SIRASI = [1, 2, 3, 4, 5, 6, 7, 8, 9, 'sil', 0, 'tamam'];

// Ardışık rakamlar eşit ya da komşu olmaz (5-6-7 gibi kolay zincirler çıkmasın); önce kullanılmamış rakamlar seçilir
function diziUret(n) {
  const dizi = [];
  while (dizi.length < n) {
    const son = dizi.at(-1);
    const adaylar = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].filter((r) => son === undefined || Math.abs(r - son) > 1);
    const yeni = adaylar.filter((r) => !dizi.includes(r));
    const havuz = yeni.length ? yeni : adaylar;
    dizi.push(havuz[Math.floor(Math.random() * havuz.length)]);
  }
  return dizi;
}

export default hafizaOyunu({
  egzersiz: 'rakam-dizisi',
  ad: 'Rakam Dizisi',
  ikon: 'rakam-dizi',
  birim: BIRIM,
  kisaAciklama: 'Bir hafıza çalışması: rakamları aklında tut, sıralarını koru. Yarış değil; kendi en uzun dizini geçmeye çalış.',
  nasil: [
    'Ekranda rakamlar tek tek belirir. Dikkatle izle. Seviye, rakamların ne kadar süre görüneceğini belirler.',
    'Sıra sana gelince rakamları tuş takımıyla gir; geri yönde sondan başa doğru. Yanlış bastıysan Sil ile düzelt, sonra Tamam’a bas.',
    'Doğru yaptıkça dizi bir rakam uzar; üst üste iki kez tutmazsa bir rakam kısalır. Böylece dizi hep senin için uygun uzunlukta kalır.',
  ],
  // Tempo: rakamın görünme süresi ve iki rakam arasındaki boşluk
  seviyeler: [
    { ad: 'Rahat', gosterMs: 1000, araMs: 300 },
    { ad: 'Orta', gosterMs: 800, araMs: 250 },
    { ad: 'Hızlı', gosterMs: 600, araMs: 200 },
  ],
  baslangic: { ileri: 3, geri: 2 },
  sinir: { en: 2, enCok: 9 },
  deneme: 12,
  ipuclari: [
    'rakamları ikişer üçer gruplayıp içinden tekrar et (4 7 2 9 yerine “47, 29”).',
    { mod: 'geri', metin: 'geri yönde önce diziyi aklında baştan sona bir kez tekrar et, sonra sondan başla.' },
    'gösterim sürerken rakamları içinden söyle; sesli tekrar aklında tutmayı kolaylaştırır.',
  ],
  alanEtiketi: 'Rakam Dizisi. Rakamlar sırayla okunur. Sıra sana gelince rakam tuşlarıyla gir, Geri silme tuşuyla düzelt, Enter ile onayla.',

  baslat(ctx, { ters, merdiven, deneme }) {
    const s = ctx.seviye;
    const sahne = hafizaSahnesi(ctx, { sahneSinif: 'rd-sahne' });
    const gosterim = el('div', { sinif: 'rd-gosterim', 'aria-hidden': 'true' });
    const kutular = el('div', { sinif: 'rd-kutular', 'aria-hidden': 'true', hidden: true });
    const girilenMetni = el('p', { sinif: 'ekran-okuyucu', 'aria-live': 'polite' });
    sahne.sahne.append(gosterim, kutular, girilenMetni);

    let girilen = [];
    let hedefN = 0;
    let acik = false;   // giriş bekleniyor mu
    let coz = null;

    const tamamDugme = el('button', { type: 'button', sinif: 'btn btn--birincil rd-tus rd-tus--islem', metin: 'Tamam', onclick: () => tamam() });
    const tusTakimi = el('div', { sinif: 'rd-tuslar', role: 'group', 'aria-label': 'Rakam tuş takımı' },
      TUS_SIRASI.map((t) => {
        if (t === 'tamam') return tamamDugme;
        if (t === 'sil') {
          return el('button', { type: 'button', sinif: 'btn btn--ikincil rd-tus rd-tus--islem', 'aria-label': 'Son rakamı sil', onclick: () => sil() },
            el('span', { 'aria-hidden': 'true', metin: '⌫ ' }), 'Sil');
        }
        return el('button', { type: 'button', sinif: 'btn btn--ikincil rd-tus', metin: String(t), onclick: () => yaz(t) });
      }));
    ctx.alan.append(tusTakimi);

    function tusTakimiAc(ac) {
      acik = ac;
      tusTakimi.setAttribute('aria-disabled', String(!ac));
    }

    function kutulariCiz() {
      kutular.replaceChildren(...Array.from({ length: hedefN }, (_, i) => el('span', {
        sinif: 'rd-kutu', 'data-sira': i === girilen.length ? 'siradaki' : null, metin: girilen[i] === undefined ? '' : String(girilen[i]),
      })));
      girilenMetni.textContent = `Girilen ${girilen.length}/${hedefN}${girilen.length ? `: ${girilen.join(' ')}` : ''}`;
      tamamDugme.setAttribute('aria-disabled', String(girilen.length < hedefN));
    }

    function yaz(r) {
      if (!acik || !ctx.aktifMi() || girilen.length >= hedefN) return;
      girilen.push(r);
      ctx.ses('tik');
      sahne.temizle();
      kutulariCiz();
    }

    function sil() {
      if (!acik || !ctx.aktifMi() || !girilen.length) return;
      girilen.pop();
      kutulariCiz();
    }

    function tamam() {
      if (!acik || !ctx.aktifMi()) return;
      if (girilen.length < hedefN) {
        sahne.geriYaz(null, `${hedefN} rakamın hepsini gir; şu an ${girilen.length} rakam var.`);
        return;
      }
      tusTakimiAc(false);
      const sonuc = [...girilen];
      coz?.(sonuc);
      coz = null;
    }

    // Klavye: rakam tuşları (üst sıra ve sayı tuş takımı), Geri silme/Delete, Enter (düğme üzerindeyken düğmenin kendisi çalışır)
    ctx.alan.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (/^[0-9]$/.test(e.key)) { e.preventDefault(); if (!e.repeat) yaz(Number(e.key)); }
      else if (e.key === 'Backspace' || e.key === 'Delete') { e.preventDefault(); sil(); }
      else if (e.key === 'Enter' && !(e.target instanceof HTMLButtonElement)) { e.preventDefault(); if (!e.repeat) tamam(); }
    });

    tusTakimiAc(false);
    diziTuru(ctx, {
      sahne, merdiven, deneme, ters, birim: BIRIM,
      uret: diziUret,
      async sun(dizi) {
        kutular.hidden = true;
        gosterim.hidden = false;
        for (const r of dizi) {
          gosterim.textContent = String(r);
          ogeDuyur(r);
          await bekle(ctx, s.gosterMs);
          gosterim.textContent = '';
          await bekle(ctx, s.araMs);
        }
      },
      gir(n) {
        hedefN = n;
        girilen = [];
        gosterim.hidden = true;
        kutular.hidden = false;
        kutulariCiz();
        tusTakimiAc(true);
        return new Promise((r) => { coz = r; });
      },
      sonucta(kayit, { hedef, yanit }) {
        [...kutular.children].forEach((k, i) => {
          k.removeAttribute('data-sira');
          k.dataset.sonuc = yanit[i] === hedef[i] ? 'dogru' : 'yanlis';
        });
      },
      dogrusuMetni: (hedef) => `Doğrusu: ${hedef.join(' ')}.`,
    });
  },

  stil: `
    .rd-sahne { min-block-size: 8rem; }
    .rd-gosterim { min-block-size: 1.15em; font-size: clamp(3.5rem, 20vw, 6.5rem); font-weight: 800; line-height: 1.1; font-variant-numeric: tabular-nums; color: var(--renk-metin); }
    .rd-kutular { display: flex; flex-wrap: wrap; justify-content: center; gap: var(--b-1); }
    .rd-kutu {
      display: grid; place-items: center; inline-size: clamp(1.9rem, 8vw, 2.75rem); block-size: 3rem;
      border: 2px solid var(--renk-metin-soluk); border-radius: var(--kose-s); background: var(--renk-yuzey);
      font-size: var(--fs-xl); font-weight: 700; font-variant-numeric: tabular-nums;
    }
    .rd-kutu[data-sira="siradaki"] { border-color: var(--renk-birincil); box-shadow: inset 0 0 0 2px var(--renk-birincil); }
    .rd-kutu[data-sonuc="dogru"] { border-color: var(--renk-basari); background: var(--renk-basari-zemin); color: var(--renk-basari); }
    .rd-kutu[data-sonuc="yanlis"] { border-color: var(--renk-vurgu-metin); border-style: dashed; background: var(--renk-vurgu-zemin); color: var(--renk-vurgu-metin); }
    .rd-tuslar { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--b-2); inline-size: min(100%, 22rem); margin-inline: auto; }
    .rd-tus { min-block-size: 3.5rem; padding: var(--b-1); font-size: var(--fs-xl); font-weight: 700; font-variant-numeric: tabular-nums; touch-action: manipulation; }
    .rd-tus--islem { font-size: var(--fs-m); }
    .rd-tuslar[aria-disabled="true"] .rd-tus { opacity: 0.5; cursor: default; }
    .rd-tus[aria-disabled="true"] { opacity: 0.6; }
    @media (forced-colors: active) { .rd-kutu[data-sonuc] { border-color: Highlight; } }
  `,
});
