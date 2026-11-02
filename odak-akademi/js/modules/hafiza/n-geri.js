// Aynı mı? (n-geri, S14b): öğeler tek tek belirir; öğrenci her öğenin n önceki öğeyle aynı olup olmadığını Evet/Hayır ile söyler. Konum, şekil ya da harf modu; n merdivenle 1 → 2 (2-geri için 1-geride bir blokta en az %80 doğru şart)
import { el } from '../../core/ui.js';
import { karistir, trKucuk, yuzdeBicimle, sayiBicimle } from '../../core/utils.js';
import { KESINTI_MS } from '../../engine/attention-core.js';
import { SEKILLER, simgeSvg } from '../../engine/algi.js';
import { hafizaOyunu, hafizaSahnesi, hafizaBitir, bekle, ogeDuyur } from '../../engine/memory-core.js';

const BLOK_OGE = 12;     // her blokta yanıt beklenen öğe (ilk n öğe yalnız izlenir)
const HEDEF_SAYISI = 4;  // bunların kaçı “aynı” (yaklaşık üçte bir)
const GECME_ESIGI = 80;  // blokta doğru yanıt ≥ %80 → n bir artar
const KONUMLAR = Object.freeze(['sol üst', 'üst orta', 'sağ üst', 'sol orta', 'sağ orta', 'sol alt', 'alt orta', 'sağ alt']);
const IZGARA_SIRA = Object.freeze([0, 1, 2, 3, 5, 6, 7, 8]); // 3×3 ızgarada ortası (odak işareti) hariç
const SEKIL_HAVUZU = Object.freeze(['daire', 'kare', 'ucgen', 'yildiz', 'arti', 'kalp', 'hilal', 'damla']);
const HARFLER = Object.freeze(['B', 'D', 'F', 'K', 'L', 'M', 'R', 'S', 'T', 'Z']); // I/İ yok, birbirine benzeyen çift az
const HAVUZ = Object.freeze({ konum: KONUMLAR.length, sekil: SEKIL_HAVUZU.length, harf: HARFLER.length });
const kacOnce = (n) => (n === 1 ? 'bir önceki' : 'iki önceki');

/** n-geri dizisi: HEDEF_SAYISI öğe n öncekinin aynısı; diğerleri n öncekinden ve hemen öncekinden farklı (kazara “aynı” çıkmaz) */
function diziUret(n, boyut) {
  const toplam = n + BLOK_OGE;
  const hedefler = new Set(karistir(Array.from({ length: BLOK_OGE }, (_, i) => i + n)).slice(0, HEDEF_SAYISI));
  const dizi = [];
  for (let i = 0; i < toplam; i++) {
    if (hedefler.has(i)) { dizi.push(dizi[i - n]); continue; }
    const yasak = new Set([dizi[i - n], dizi[i - 1]]);
    const aday = Array.from({ length: boyut }, (_, k) => k).filter((k) => !yasak.has(k));
    dizi.push(aday[Math.floor(Math.random() * aday.length)]);
  }
  return { dizi, hedef: dizi.map((_, i) => hedefler.has(i)) };
}

export default hafizaOyunu({
  egzersiz: 'n-geri',
  ad: 'Aynı mı? (n-geri)',
  ikon: 'n-geri',
  birim: 'geri',
  kisaAciklama: 'Bir çalışan bellek çalışması: son öğeleri aklında tutup yenisiyle karşılaştır. Yarış değil; kendi doğruluğunu geçmeye çalış.',
  nasil: [
    'Öğeler tek tek belirir. 1-geride her öğeyi bir öncekiyle, 2-geride iki öncekiyle karşılaştırırsın. Seviye, öğelerin ne kadar hızlı geleceğini belirler.',
    'Aynıysa “Evet, aynı”ya, farklıysa “Hayır, farklı”ya bas. Klavyede E ya da Sol ok: Evet; H ya da Sağ ok: Hayır. Her blok 1-geriyle başlar.',
    `Bir blokta yanıtlarının en az %${GECME_ESIGI}’i doğruysa 2-geriye geçersin; 2-geride üst üste iki zor blok olursa yeniden 1-geriye dönersin.`,
  ],
  seviyeler: [
    { ad: 'Rahat', gosterMs: 1000, araMs: 2000 },
    { ad: 'Orta', gosterMs: 800, araMs: 1700 },
    { ad: 'Hızlı', gosterMs: 600, araMs: 1400 },
  ],
  yonler: [
    { deger: 'konum', etiket: 'Konum', aciklama: 'ızgarada yanan kare' },
    { deger: 'sekil', etiket: 'Şekil', aciklama: 'ortada beliren şekil' },
    { deger: 'harf', etiket: 'Harf', aciklama: 'ortada beliren harf' },
  ],
  yonBaslik: 'Mod',
  yonKapsam: (y) => `${trKucuk(y.etiket)} modunda`,
  baslangic: 1,
  sinir: { en: 1, enCok: 2 },
  deneme: 5, // blok
  puanEtiketi: 'En yüksek düzey',
  puanAciklama: `Bu turda en az %${GECME_ESIGI} doğruyla geçtiğin en yüksek n (1 ya da 2).`,
  sureNotu: 'Süre sınırı yok; 5 blok, yaklaşık 4 dakika. Bloklar arasında dilediğin kadar dinlenebilirsin.',
  gostergeler: [
    { alan: 'enIyi', ad: 'En yüksek düzey', yon: 'buyuk', bicim: (v) => (v ? `${v}-geri` : '-') },
    { alan: 'ogeIsabet', ad: 'Doğru yanıt', yon: 'buyuk', bicim: yuzdeBicimle },
    { alan: 'yanlisAlarm', ad: 'Yanlış alarm', yon: 'kucuk', bicim: (v) => sayiBicimle(v) },
  ],
  metinler: {
    enIyi: 'Geçilen en yüksek düzey', deneme: 'Geçilen blok', oge: 'Doğru yanıt', yolOge: 'blok',
    yol: `Bir blokta en az %${GECME_ESIGI} doğru yanıtta n arttı, üst üste iki zor blokta azaldı. Çubuk boyu n.`,
  },
  ekSatirlar: (e) => [
    ['Yakalanan “aynı”', `${e.yakalanan ?? 0}/${e.hedefSayisi ?? 0}`],
    ['Kaçırılan “aynı”', String(e.kacan ?? 0)],
    ['Yanlış alarm', String(e.yanlisAlarm ?? 0)],
    ['Yanıtsız (farklı)', String(e.yanitsiz ?? 0)],
    ...(e.ortMs ? [['Ortalama tepki (yakalanan)', `${sayiBicimle(e.ortMs / 1000, 2)} sn`]] : []),
  ],
  mesaj(e, { ipuclari }) {
    if (!e.deneme) return 'Bu turda blok tamamlanmadı. Hazır olduğunda yeniden dene.';
    const parca = [e.enIyi >= 2
      ? 'Bu turda 2-geri bloğunu geçtin; aynı anda iki öğeyi aklında tutup güncelledin.'
      : e.enIyi === 1
        ? `1-geride %${GECME_ESIGI} doğruya ulaştın. Bir sonraki hedef: 2-geri bloğunu geçmek.`
        : `1-geri henüz %${GECME_ESIGI}’e ulaşmadı. Bir sonraki hedef: bir blokta ${Math.ceil((BLOK_OGE * GECME_ESIGI) / 100)} doğru yanıt.`];
    if (e.yanlisAlarm > e.kacan) parca.push('Yanlış alarmların kaçırdıklarından fazla: emin olmadan “Evet” demek yerine bir an düşün.');
    else if (e.kacan > e.yanlisAlarm) parca.push('Kaçırdıkların yanlış alarmlarından fazla: “aynı” gelince çekinmeden “Evet” de.');
    if (ipuclari.length) parca.push(`İpucu: ${ipuclari[Math.floor(Math.random() * ipuclari.length)]}`);
    return parca.join(' ');
  },
  ipuclari: [
    'son öğeleri içinden sırayla tekrar et; yeni öğe gelince en eskisini bırak.',
    { mod: 'harf', metin: 'harfleri içinden sesli söyle: “B… K…”; ses, görüntüden daha kolay tutulur.' },
    { mod: 'konum', metin: 'karelere içinden ad ver (“sol üst”, “alt orta”) ve adları tekrar et.' },
    { mod: 'sekil', metin: 'şekillere kısa adlar ver (“kalp”, “artı”) ve adları tekrar et.' },
  ],
  alanEtiketi: 'Aynı mı, n-geri. Öğeler sırayla okunur. Her öğe n önceki öğeyle aynıysa E ya da Sol ok, farklıysa H ya da Sağ ok tuşuna bas.',

  baslat(ctx, { mod, merdiven, deneme }) {
    const s = ctx.seviye;
    const sahne = hafizaSahnesi(ctx, { sahneSinif: 'nb-sahne' });
    const soru = el('p', { sinif: 'nb-soru' });
    let hucreler = [];
    let gorunum;
    if (mod === 'konum') {
      hucreler = Array.from({ length: 9 }, (_, i) => el('span', { sinif: i === 4 ? 'nb-hucre nb-hucre--orta' : 'nb-hucre' }, i === 4 ? '+' : null));
      gorunum = el('div', { sinif: 'nb-izgara', 'aria-hidden': 'true' }, hucreler);
    } else {
      gorunum = el('div', { sinif: `nb-kutu nb-kutu--${mod}`, 'aria-hidden': 'true' });
    }
    const isaret = el('p', { sinif: 'nb-isaret', 'aria-hidden': 'true' });
    sahne.sahne.append(soru, gorunum, isaret);

    const evet = el('button', { type: 'button', sinif: 'btn nb-dugme nb-dugme--evet', 'aria-keyshortcuts': 'E ArrowLeft', onclick: () => yanitla('evet') },
      el('span', { sinif: 'nb-dugme__isaret', 'aria-hidden': 'true', metin: '=' }), 'Evet, aynı');
    const hayir = el('button', { type: 'button', sinif: 'btn nb-dugme nb-dugme--hayir', 'aria-keyshortcuts': 'H ArrowRight', onclick: () => yanitla('hayir') },
      el('span', { sinif: 'nb-dugme__isaret', 'aria-hidden': 'true', metin: '≠' }), 'Hayır, farklı');
    const dugmeler = el('div', { sinif: 'nb-dugmeler', role: 'group', 'aria-label': 'Yanıt' }, evet, hayir);
    const devamDugme = el('button', { type: 'button', sinif: 'btn btn--birincil hafiza-devam', hidden: true });
    ctx.alan.append(dugmeler, el('div', { sinif: 'hafiza-alt' }, devamDugme));

    const toplam = { hedefSayisi: 0, yakalanan: 0, kacan: 0, yanlisAlarm: 0, dogruRed: 0, yanitsiz: 0 };
    const tepkiler = [];
    const denemeler = [];
    let kesinti = 0;
    let bitti = false;
    let acik = false;        // yanıt penceresi açık mı
    let cevap = null;        // { y: 'evet'|'hayir', ms }
    let simdiHedef = false;
    let t0 = 0;
    let sonAsama = null;
    ctx.temizlenince(() => { bitti = true; });

    function asama(metin, tur) {
      if (metin === sonAsama) return; // aynı metin yeniden duyurulmasın
      sonAsama = metin;
      sahne.asamaYaz(metin, tur);
    }

    function dugmeDurumu(ac) {
      dugmeler.setAttribute('aria-disabled', String(!ac));
      [evet, hayir].forEach((d) => { delete d.dataset.sonuc; });
    }

    function yanitla(y) {
      if (!acik || cevap || !ctx.aktifMi()) return;
      cevap = { y, ms: Math.round(performance.now() - t0) };
      const dogru = (y === 'evet') === simdiHedef;
      (y === 'evet' ? evet : hayir).dataset.sonuc = dogru ? 'dogru' : 'yanlis';
      isaret.textContent = dogru ? '✓' : '✗';
      isaret.dataset.sonuc = dogru ? 'dogru' : 'yanlis';
      dugmeler.setAttribute('aria-disabled', 'true');
      ctx.ses('tik');
    }

    function goster(o) {
      if (mod === 'konum') { hucreler[IZGARA_SIRA[o]].dataset.yanik = ''; return KONUMLAR[o]; }
      if (mod === 'sekil') { gorunum.replaceChildren(simgeSvg(SEKIL_HAVUZU[o], { renk: 'var(--renk-birincil)' })); return SEKILLER[SEKIL_HAVUZU[o]].ad; }
      gorunum.textContent = HARFLER[o];
      return HARFLER[o];
    }

    function gizle() {
      if (mod === 'konum') hucreler.forEach((h) => { delete h.dataset.yanik; });
      else gorunum.replaceChildren();
    }

    // Öğrenci hazır olunca sonraki bloğa geçer (geri bildirimi okumaya zaman kalır)
    function devamBekle(metin) {
      return new Promise((coz) => {
        devamDugme.textContent = metin;
        devamDugme.hidden = false;
        devamDugme.onclick = () => {
          if (!ctx.aktifMi()) return;
          devamDugme.hidden = true;
          devamDugme.onclick = null;
          ctx.alan.focus({ preventScroll: true });
          coz();
        };
        devamDugme.focus({ preventScroll: true });
      });
    }

    // Klavye: E / Sol ok → Evet; H / Sağ ok → Hayır
    ctx.alan.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
      const t = e.key.toLocaleLowerCase('tr-TR');
      if (t === 'e' || e.key === 'ArrowLeft') { e.preventDefault(); yanitla('evet'); }
      else if (t === 'h' || e.key === 'ArrowRight') { e.preventDefault(); yanitla('hayir'); }
    });

    async function blok(n) {
      const { dizi, hedef } = diziUret(n, HAVUZ[mod]);
      const r = { hedefSayisi: 0, yakalanan: 0, kacan: 0, yanlisAlarm: 0, dogruRed: 0, yanitsiz: 0, tepki: [] };
      soru.textContent = `Bu öğe ${kacOnce(n)} öğeyle aynı mı?`;
      for (let i = 0; i < dizi.length; i++) {
        if (bitti) return null;
        simdiHedef = hedef[i];
        cevap = null;
        isaret.textContent = '';
        delete isaret.dataset.sonuc;
        acik = i >= n;
        dugmeDurumu(acik);
        asama(acik ? 'Aynı mı?' : `İzle: ilk ${n === 1 ? 'öğeyi' : `${n} öğeyi`} aklında tut`, acik ? 'gir' : 'izle');
        t0 = performance.now();
        ogeDuyur(goster(dizi[i]));
        await bekle(ctx, s.gosterMs);
        if (bitti) return null;
        gizle();
        await bekle(ctx, s.araMs); // yanıt penceresi bir sonraki öğeye kadar açık
        if (bitti) return null;
        acik = false;
        if (i < n) continue;
        if (hedef[i]) {
          r.hedefSayisi += 1;
          if (cevap?.y === 'evet') { r.yakalanan += 1; r.tepki.push(cevap.ms); } else r.kacan += 1;
        } else if (cevap?.y === 'evet') r.yanlisAlarm += 1;
        else if (cevap?.y === 'hayir') r.dogruRed += 1;
        else r.yanitsiz += 1;
      }
      return r;
    }

    function blokMetni(r, yuzde, gecti, n, adim) {
      const parca = [`Blok bitti: ${r.hedefSayisi} “aynı”nın ${r.yakalanan} tanesini yakaladın; ${r.kacan} kaçtı, ${r.yanlisAlarm} yanlış alarm. Doğru yanıt %${yuzde}.`];
      if (adim.degisim > 0) parca.push(`Sıradaki blok ${adim.deger}-geri.`);
      else if (adim.degisim < 0) parca.push(`Sıradaki blok ${adim.deger}-geri; rahatça ısın, sonra yeniden yükselirsin.`);
      else if (gecti) parca.push('En üst düzeydesin; doğruluğunu korumaya çalış.');
      else if (n === 1) parca.push(`2-geriye geçmek için bir blokta en az %${GECME_ESIGI} doğru gerekir. Henüz değil; bir blok daha.`);
      else parca.push('Aynı düzeyde bir blok daha.');
      return parca.join(' ');
    }

    async function dongu() {
      dugmeDurumu(false);
      await bekle(ctx, 500);
      while (!bitti && denemeler.length < deneme) {
        const n = merdiven.deger;
        sahne.durum.textContent = `Blok ${denemeler.length + 1}/${deneme} · ${n}-geri`;
        sahne.temizle();
        soru.textContent = `${n}-geri: her öğeyi ${kacOnce(n)} öğeyle karşılaştır.`;
        asama(`Hazır ol: ${n}-geri`, 'izle');
        await bekle(ctx, 1500);
        if (bitti) return;
        const d0 = performance.now();
        const g0 = ctx.gecenSn() * 1000;
        const r = await blok(n);
        if (bitti || !r) return;
        dugmeDurumu(false);
        asama('', '');
        // Duvar saati oyun saatinden çok ilerlediyse blok kesildi: sayılmaz, yinelenir
        if ((performance.now() - d0) - (ctx.gecenSn() * 1000 - g0) > KESINTI_MS) {
          kesinti += 1;
          sahne.geriYaz(null, 'Ara verildiği için bu blok sayılmadı; yeniden başlayacak.');
          await devamBekle('Bloğu yeniden başlat');
          continue;
        }
        const dogruOge = r.yakalanan + r.dogruRed;
        const yuzde = Math.round((dogruOge * 100) / BLOK_OGE);
        const gecti = yuzde >= GECME_ESIGI;
        const adim = merdiven.sonuc(gecti);
        denemeler.push({ duzey: n, dogru: gecti, dogruOge, ogeSayisi: BLOK_OGE });
        Object.keys(toplam).forEach((k) => { toplam[k] += r[k]; });
        tepkiler.push(...r.tepki);
        ctx.ses(gecti ? 'dogru' : 'yanlis');
        sahne.geriYaz(gecti ? 'dogru' : 'yanlis', blokMetni(r, yuzde, gecti, n, adim));
        await devamBekle(denemeler.length < deneme ? 'Sonraki blok' : 'Sonuçları gör');
      }
      if (!bitti) bitir();
    }

    function bitir() {
      hafizaBitir(ctx, denemeler, {
        merdiven, kesinti,
        bitince: () => Object.assign(ctx.ekstra, toplam, {
          blokOge: BLOK_OGE, gecmeEsigi: GECME_ESIGI,
          ortMs: tepkiler.length ? Math.round(tepkiler.reduce((t, x) => t + x, 0) / tepkiler.length) : undefined,
        }),
      });
    }

    dongu().catch((h) => {
      console.error('[n-geri] tur hatası:', h);
      if (!bitti) bitir();
    });
  },

  stil: `
    .nb-sahne { grid-template-columns: minmax(0, 1fr); justify-items: center; padding: clamp(0.5rem, 3vw, 1rem); }
    .nb-soru { margin: 0; font-weight: 700; text-align: center; }
    .nb-izgara {
      display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: clamp(0.5rem, 3vw, 0.875rem);
      inline-size: min(100%, 18rem, 32dvh);
    }
    .nb-hucre {
      display: grid; place-items: center; aspect-ratio: 1; border: 2px solid var(--renk-kenar-guclu);
      border-radius: var(--kose-s); background: var(--renk-yuzey); color: var(--renk-metin-soluk); font-size: var(--fs-xl); font-weight: 700;
    }
    .nb-hucre--orta { border-style: dashed; background: transparent; }
    /* Yanan kare: güneş rengi + koyu iç daire (yalnız renge dayanmaz) */
    .nb-hucre[data-yanik] { background: var(--renk-gunes); border-color: var(--renk-gunes-golge); box-shadow: 0 0 0 3px var(--renk-gunes-golge); }
    .nb-hucre[data-yanik]::before { content: ""; inline-size: 36%; aspect-ratio: 1; border-radius: 50%; background: var(--renk-gunes-uzeri); }
    .nb-kutu {
      display: grid; place-items: center; inline-size: min(60vw, 10rem, 28dvh); aspect-ratio: 1;
      border: 2px solid var(--renk-kenar-guclu); border-radius: var(--kose-m); background: var(--renk-yuzey);
    }
    .nb-kutu--harf { font-size: min(22vw, 6.5rem, 20dvh); font-weight: 800; line-height: 1; color: var(--renk-metin); }
    .nb-kutu .algi-simge { inline-size: 72%; block-size: 72%; }
    .nb-isaret { min-block-size: 1.4em; margin: 0; font-size: var(--fs-xl); font-weight: 800; line-height: 1; }
    .nb-isaret[data-sonuc="dogru"] { color: var(--renk-basari); }
    .nb-isaret[data-sonuc="yanlis"] { color: var(--renk-vurgu-metin); }
    .nb-dugmeler { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--b-3); inline-size: min(100%, 30rem); margin-inline: auto; }
    .nb-dugme {
      display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px;
      min-block-size: 4.5rem; padding: var(--b-2); border: 3px solid var(--renk-kenar-guclu); background: var(--renk-yuzey);
      color: var(--renk-metin); font-size: var(--fs-m); font-weight: 700; touch-action: manipulation;
    }
    .nb-dugme__isaret { font-size: var(--fs-2xl); line-height: 1; }
    .nb-dugme--evet { border-color: var(--renk-birincil); }
    .nb-dugmeler[aria-disabled="true"] .nb-dugme:not([data-sonuc]) { opacity: 0.55; cursor: default; }
    .nb-dugme[data-sonuc="dogru"] { background: var(--renk-basari-zemin); border-color: var(--renk-basari); color: var(--renk-basari); }
    .nb-dugme[data-sonuc="yanlis"] { background: var(--renk-vurgu-zemin); border-color: var(--renk-vurgu-metin); border-style: dashed; color: var(--renk-vurgu-metin); }
    @media (forced-colors: active) {
      .nb-hucre[data-yanik] { background: Highlight; }
      .nb-dugme[data-sonuc] { outline: 3px solid Highlight; }
    }
  `,
});
