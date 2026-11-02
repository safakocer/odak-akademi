// Eşleştirme Kartları (S14b): kapalı kartlardan ikişer açılır, aynı olanlar eşleşir. Zorluk = çeldirici benzerliği ve kart sayısı aralığı (3 seviye); çift sayısı merdivenle uyarlanır (memory-core.js). Hamle ve süre ölçülür
import { el } from '../../core/ui.js';
import { karistir, yuzdeBicimle, sureMetni } from '../../core/utils.js';
import { SEKILLER, SEKIL_ADLARI, RENKLER, simgeSvg, rastgeleSec, izgaraGezinme } from '../../engine/algi.js';
import { hafizaOyunu, hafizaSahnesi, hafizaBitir, bekle, ogeDuyur } from '../../engine/memory-core.js';

const BIRIM = 'çift';
const hamleSiniri = (c) => 2 * c; // tahta en çok bu kadar hamlede biterse “hedefte” sayılır → çift sayısı artar
const ACILAR = Object.freeze([
  { aci: 0, ad: 'düz' }, { aci: 90, ad: 'sağa yatık' }, { aci: 180, ad: 'ters' }, { aci: 270, ad: 'sola yatık' },
]);
const DONEN = Object.freeze(['ok', 'lsekil', 'ucgen', 'damla', 'hilal', 'kalp']); // döndürünce görünüşü değişen şekiller

/** c çiftin görünüşü. kolay: farklı şekil + farklı renk; orta: farklı şekil, tek renk (renk ipucu yok); zor: birkaç şekil, farklı yönler, tek renk */
function ciftUret(c, celdirici) {
  if (celdirici === 'kolay') {
    const renkler = karistir(RENKLER);
    return karistir(SEKIL_ADLARI).slice(0, c).map((sekil, i) => {
      const renk = renkler[i % renkler.length];
      return { sekil, renk: renk.deger, aci: 0, etiket: `${renk.ad} ${SEKILLER[sekil].ad}` };
    });
  }
  if (celdirici === 'orta') {
    const renk = rastgeleSec(RENKLER).deger;
    return karistir(SEKIL_ADLARI).slice(0, c).map((sekil) => ({ sekil, renk, aci: 0, etiket: SEKILLER[sekil].ad }));
  }
  const k = Math.min(DONEN.length, Math.max(2, Math.ceil(c / 3)));
  const tum = karistir(DONEN).slice(0, k).flatMap((sekil) => ACILAR.map((a) => ({
    sekil, renk: 'var(--renk-birincil)', aci: a.aci, etiket: `${SEKILLER[sekil].ad}, ${a.ad}`,
  })));
  return karistir(tum).slice(0, c);
}

/** Kart sayısına göre sütun: 360 px ekranda kart ~60 px'ten küçük olmaz */
function sutunSayisi(kart) {
  if (kart <= 6) return 3;
  if (kart <= 8) return 4;
  if (kart <= 10) return 5;
  return kart <= 16 ? 4 : 5;
}

export default hafizaOyunu({
  egzersiz: 'eslestirme',
  ad: 'Eşleştirme Kartları',
  ikon: 'kartlar',
  birim: BIRIM,
  yonler: false,
  kisaAciklama: 'Bir görsel hafıza çalışması: açtığın kartların yerini aklında tut, eşlerini az hamlede bul. Yarış değil; kendi rekorunu geçmeye çalış.',
  nasil: [
    'Kartlar kapalı gelir. Bir karta dokun, sonra bir tane daha: aynıysa açık kalır, değilse kısa süre sonra kapanır.',
    'Açılan kartların yerini aklında tut; tüm çiftleri bulunca tahta biter. Klavyede ok tuşlarıyla gezin, Enter ya da Boşlukla aç.',
    'Seviye kartların birbirine ne kadar benzediğini belirler. Tahtayı az hamlede (en çok çift sayısının iki katı) bitirirsen bir sonraki tahtaya bir çift eklenir; üst üste iki kez olmazsa bir çift azalır.',
  ],
  // Seviye: çeldirici benzerliği + çift sayısı aralığı; açıkMs: eşleşmeyen kartların açık kalma süresi
  seviyeler: [
    { ad: 'Kolay', celdirici: 'kolay', acikMs: 1300, sinir: { en: 3, enCok: 6 } },
    { ad: 'Orta', celdirici: 'orta', acikMs: 1100, sinir: { en: 4, enCok: 8 } },
    { ad: 'Zor', celdirici: 'zor', acikMs: 1000, sinir: { en: 4, enCok: 10 } },
  ],
  baslangic: 4,
  sinir: { en: 3, enCok: 10 },
  deneme: 5,
  puanEtiketi: 'En büyük tahta',
  puanAciklama: 'Bu turda hedef hamle sayısında bitirdiğin en çok çiftli tahta.',
  sureNotu: 'Süre sınırı yok; 5 tahta, yaklaşık 3-5 dakika. Süre yalnızca bilgi için ölçülür.',
  gostergeler: [
    { alan: 'enIyi', ad: 'En büyük tahta', yon: 'buyuk', bicim: (v) => (v ? `${v} çift` : '-') },
    { alan: 'ogeIsabet', ad: 'Hamle verimi', yon: 'buyuk', bicim: yuzdeBicimle },
    { alan: 'isabet', ad: 'Hedefte biten tahta', yon: 'buyuk', bicim: yuzdeBicimle },
  ],
  metinler: {
    enIyi: 'En büyük tahta (hedefte)', deneme: 'Hedefte biten tahta', oge: 'Hamle verimi', yolOge: 'tahta',
    yol: 'Tahta hedef hamlede bitince bir çift eklendi, üst üste iki kez olmayınca bir çift azaldı. Çubuk boyu çift sayısı.',
  },
  ekSatirlar: (e) => [
    ['Toplam hamle', `${e.hamle ?? 0} (${e.cift ?? 0} çift)`],
    ['Eşleşmeyen açış', String(Math.max(0, (e.hamle ?? 0) - (e.cift ?? 0)))],
    ...(e.ortTahtaSn ? [['Tahta başına ortalama süre', sureMetni(e.ortTahtaSn)]] : []),
  ],
  mesaj(e, { ipuclari }) {
    if (!e.deneme) return 'Bu turda tahta tamamlanmadı. Hazır olduğunda yeniden dene.';
    const parca = [e.enIyi
      ? `Bu turda ${e.enIyi} çiftlik tahtayı hedef hamle sayısında bitirdin.`
      : 'Tahtalar henüz hedef hamle sayısında bitmedi; acele etme, merdiven tahtayı senin için uygun büyüklükte tutar.'];
    parca.push('Hamle verimi, her hamlenin ne kadarının eşleşme bulduğunu gösterir; açtığın kartları hatırladıkça artar.');
    if (e.enIyi && e.enIyi >= (e.enCokCift ?? Infinity)) parca.push('Bu seviyenin en büyük tahtasını bitirdin; hazır hissediyorsan bir üst seviyeyi dene.');
    else if (e.enIyi) parca.push(`Bir sonraki hedef: ${e.enIyi + 1} çiftlik tahtayı hedefte bitirmek.`);
    if (ipuclari.length) parca.push(`İpucu: ${ipuclari[Math.floor(Math.random() * ipuclari.length)]}`);
    return parca.join(' ');
  },
  ipuclari: [
    'yeni bir kart açarken önce eşini daha önce görüp görmediğini düşün.',
    'açtığın kartın adını ve yerini içinden söyle: “kalp, üst sıra, sağda”.',
    'tahtayı satır satır gez; rastgele açmak yerine düzenli açmak yerleri hatırlamayı kolaylaştırır.',
  ],
  alanEtiketi: 'Eşleştirme Kartları. Ok tuşlarıyla kartlar arasında gezin, Enter ya da Boşlukla kart aç. Açılan kartın adı okunur.',

  baslat(ctx, { merdiven, deneme }) {
    const s = ctx.seviye;
    const sahne = hafizaSahnesi(ctx, { sahneSinif: 'es-sahne' });
    const izgara = el('div', { sinif: 'es-izgara', role: 'group', 'aria-label': 'Kartlar' });
    sahne.sahne.append(izgara);
    const devamDugme = el('button', { type: 'button', sinif: 'btn btn--birincil hafiza-devam', hidden: true });
    ctx.alan.append(el('div', { sinif: 'hafiza-alt' }, devamDugme));

    let kartlar = [];   // { oge, id, etiket, durum: kapali|acik|eslesti }
    let sutun = 3;
    const gezinme = izgaraGezinme(izgara, { ogeler: () => kartlar.map((k) => k.oge), sutun: () => sutun });
    const denemeler = [];
    const toplam = { hamle: 0, cift: 0, tahtaSn: 0 };
    let bitti = false;
    let kilit = true;
    let acilan = [];
    let hamle = 0;
    let bulunan = 0;
    let tahtaBitti = null;
    ctx.temizlenince(() => { bitti = true; });

    function kartEtiketi(k, sira) {
      if (k.durum === 'kapali') return `Kart ${sira}, kapalı`;
      return `Kart ${sira}: ${k.etiket}${k.durum === 'eslesti' ? ', eşleşti' : ''}`;
    }

    function kartGuncelle(k) {
      const sira = kartlar.indexOf(k) + 1;
      k.oge.dataset.durum = k.durum;
      k.oge.setAttribute('aria-label', kartEtiketi(k, sira));
      if (k.durum === 'eslesti') k.oge.setAttribute('aria-disabled', 'true');
    }

    function durumYaz(tahtaNo, c) {
      sahne.durum.textContent = `Tahta ${tahtaNo}/${deneme} · ${c} çift · ${hamle} hamle`;
    }

    function tahtaKur(c) {
      const ciftler = ciftUret(c, s.celdirici);
      sutun = sutunSayisi(c * 2);
      kartlar = karistir(ciftler.flatMap((p, id) => [{ ...p, id }, { ...p, id }])).map((p) => {
        const k = { id: p.id, etiket: p.etiket, durum: 'kapali' };
        k.oge = el('button', { type: 'button', sinif: 'es-kart', onclick: () => ac(k) },
          el('span', { sinif: 'es-kart__arka', 'aria-hidden': 'true' }),
          el('span', { sinif: 'es-kart__on' }, simgeSvg(p.sekil, { renk: p.renk, aci: p.aci })));
        return k;
      });
      izgara.style.setProperty('--sutun', String(sutun));
      izgara.style.setProperty('--satir', String(Math.ceil(kartlar.length / sutun)));
      izgara.replaceChildren(...kartlar.map((k) => k.oge));
      kartlar.forEach(kartGuncelle);
      gezinme.sifirla(true);
    }

    async function ac(k) {
      if (kilit || bitti || !ctx.aktifMi() || k.durum !== 'kapali') return;
      k.durum = 'acik';
      kartGuncelle(k);
      ctx.ses('tik');
      acilan.push(k);
      if (acilan.length < 2) { ogeDuyur(k.etiket); return; }
      const [a, b] = acilan;
      acilan = [];
      hamle += 1;
      durumYaz(denemeler.length + 1, kartlar.length / 2);
      if (a.id === b.id) {
        a.durum = 'eslesti';
        b.durum = 'eslesti';
        kartGuncelle(a);
        kartGuncelle(b);
        bulunan += 1;
        ctx.ses('dogru');
        ogeDuyur(`${k.etiket}. Eşleşti.`);
        if (bulunan === kartlar.length / 2) { kilit = true; tahtaBitti?.(); }
        return;
      }
      ogeDuyur(`${k.etiket}. Eşleşmedi.`);
      kilit = true;
      [a, b].forEach((x) => { x.oge.dataset.yanlis = ''; });
      await bekle(ctx, s.acikMs);
      if (bitti) return;
      [a, b].forEach((x) => { x.durum = 'kapali'; delete x.oge.dataset.yanlis; kartGuncelle(x); });
      kilit = false;
    }

    function devamBekle(metin) {
      return new Promise((r) => {
        devamDugme.textContent = metin;
        devamDugme.hidden = false;
        devamDugme.onclick = () => {
          if (!ctx.aktifMi()) return;
          devamDugme.hidden = true;
          devamDugme.onclick = null;
          r();
        };
        devamDugme.focus({ preventScroll: true });
      });
    }

    function geriMetni(c, h, sn, hedefte, adim) {
      const parca = [`Tahta tamam: ${c} çift, ${h} hamle (hedef en çok ${hamleSiniri(c)}), ${sureMetni(sn)}.`];
      if (adim.degisim > 0) parca.push(`Sıradaki tahta ${adim.deger} çift.`);
      else if (adim.degisim < 0) parca.push(`Sıradaki tahta ${adim.deger} çift; rahatça ısın.`);
      else if (hedefte) parca.push(adim.onceki >= merdiven.kural.enCok ? 'Bu seviyenin en büyük tahtasındasın.' : 'Bir hedefte tahta daha gelince bir çift eklenir.');
      else parca.push('Aynı büyüklükte bir tahta daha.');
      return parca.join(' ');
    }

    async function dongu() {
      while (!bitti && denemeler.length < deneme) {
        const c = merdiven.deger;
        hamle = 0;
        bulunan = 0;
        acilan = [];
        sahne.temizle();
        tahtaKur(c);
        durumYaz(denemeler.length + 1, c);
        sahne.asamaYaz('Sıra sende: eşleri bul', 'gir');
        const g0 = ctx.gecenSn();
        const bitis = new Promise((r) => { tahtaBitti = r; });
        kilit = false;
        await bitis;
        if (bitti) return;
        const sn = Math.max(1, Math.round(ctx.gecenSn() - g0));
        const hedefte = hamle <= hamleSiniri(c);
        const adim = merdiven.sonuc(hedefte);
        // Deneme: öğe = hamle, doğru öğe = eşleşen çift → ogeIsabet = hamle verimi (çift ÷ hamle)
        denemeler.push({ duzey: c, dogru: hedefte, dogruOge: c, ogeSayisi: hamle });
        toplam.hamle += hamle;
        toplam.cift += c;
        toplam.tahtaSn += sn;
        sahne.asamaYaz('', '');
        await bekle(ctx, 400); // son eşleşme görünsün
        if (bitti) return;
        ctx.ses(hedefte ? 'dogru' : 'yanlis');
        sahne.geriYaz(hedefte ? 'dogru' : 'yanlis', geriMetni(c, hamle, sn, hedefte, adim));
        await devamBekle(denemeler.length < deneme ? 'Sonraki tahta' : 'Sonuçları gör');
      }
      if (!bitti) bitir();
    }

    function bitir() {
      hafizaBitir(ctx, denemeler, {
        merdiven,
        bitince: () => Object.assign(ctx.ekstra, {
          celdirici: s.celdirici, hamle: toplam.hamle, cift: toplam.cift, enCokCift: merdiven.kural.enCok,
          ortTahtaSn: denemeler.length ? Math.round(toplam.tahtaSn / denemeler.length) : undefined,
        }),
      });
    }

    dongu().catch((h) => {
      console.error('[eslestirme] tur hatası:', h);
      if (!bitti) bitir();
    });
  },

  stil: `
    .es-sahne { grid-template-columns: minmax(0, 1fr); justify-items: center; padding: clamp(0.5rem, 3vw, 1rem); }
    /* Kartlar ekrana sığar: genişlik hem ekran enine hem (satır sayısına göre) ekran boyuna bağlı */
    .es-izgara {
      display: grid; grid-template-columns: repeat(var(--sutun, 4), minmax(0, 1fr)); gap: clamp(0.375rem, 2vw, 0.75rem);
      inline-size: min(100%, calc(var(--sutun, 4) * 6.5rem), calc(58dvh * var(--sutun, 4) / var(--satir, 4)));
    }
    .es-kart {
      position: relative; display: grid; aspect-ratio: 1; min-block-size: 2.75rem; padding: 0;
      border: 3px solid var(--renk-kenar-guclu); border-radius: var(--kose-m); background: var(--renk-yuzey);
      color: var(--renk-metin); font: inherit; cursor: pointer; touch-action: manipulation; overflow: hidden;
    }
    .es-kart > span { grid-area: 1 / 1; display: grid; place-items: center; }
    .es-kart:focus-visible { outline: 3px solid var(--renk-odak); outline-offset: 3px; }
    /* Kapalı kartın arkası: deniz camı desen (her temada belirteçlerle) */
    .es-kart__arka {
      background: var(--renk-birincil-zemin);
      background: repeating-linear-gradient(45deg, var(--renk-birincil-zemin) 0 0.45rem, var(--renk-yuzey-2) 0.45rem 0.9rem);
    }
    .es-kart__on { visibility: hidden; padding: 12%; }
    .es-kart__on .algi-simge { inline-size: 100%; block-size: 100%; }
    .es-kart[data-durum="acik"] .es-kart__arka, .es-kart[data-durum="eslesti"] .es-kart__arka { visibility: hidden; }
    .es-kart[data-durum="acik"] .es-kart__on, .es-kart[data-durum="eslesti"] .es-kart__on { visibility: visible; }
    .es-kart[data-durum="acik"] { border-color: var(--renk-birincil); box-shadow: inset 0 0 0 2px var(--renk-birincil); }
    /* Eşleşen: başarı çerçevesi + köşede ✓ (yalnız renge dayanmaz) */
    .es-kart[data-durum="eslesti"] { border-color: var(--renk-basari); background: var(--renk-basari-zemin); cursor: default; }
    .es-kart[data-durum="eslesti"]::after {
      content: "✓"; position: absolute; inset-block-start: 2px; inset-inline-end: 6px; font-weight: 800; color: var(--renk-basari);
    }
    .es-kart[data-yanlis] { border-color: var(--renk-vurgu-metin); border-style: dashed; }
    @media (forced-colors: active) {
      .es-kart[data-durum="acik"], .es-kart[data-durum="eslesti"] { outline: 3px solid Highlight; }
      .es-kart__arka { background: Canvas; }
    }
  `,
});
