// Kelime Listesi (S14b): kelimeler tek tek gösterilir; öğrenci seçeneklerden sırayla dokunarak ya da yazarak hatırlar. Kelime doğruluğu ve sıra doğruluğu ayrı hesaplanır; liste uzunluğu merdivenle uyarlanır. Kelimeler data/kelimeler.json'dan okunur (S34c: kelime-havuzu.js, sınıfa göre kategori)
import { el } from '../../core/ui.js';
import { karistir, trKucuk, yuzdeBicimle } from '../../core/utils.js';
import { duyur } from '../../core/a11y.js';
import { KESINTI_MS } from '../../engine/attention-core.js';
import { yazimSadelestir } from '../../engine/flas.js';
import { hafizaOyunu, hafizaSahnesi, hafizaBitir, bekle, ogeDuyur } from '../../engine/memory-core.js';
import { kelimeHavuzuYukle, sinifKategorileri, havuzYeterliMi } from '../../engine/kelime-havuzu.js';

const BIRIM = 'kelime';

// S34c: kelime havuzu ortak modülde (kelime-havuzu.js); kategoriler etkin profilin sınıfına göre seçilir (ilkokulda kısa, sık kullanılan kelimeler)
// Havuz modül açılırken bir kez yüklenir; yüklenemezse oyun başlatılmaz (hazirlikDenetle uyarır)
await kelimeHavuzuYukle();

/** n kelimelik liste: ceil(n/2) kategoriden ikişer kelime, karışık sırada (gruplama stratejisine fırsat). kullanilan: bu turda gösterilenler; kategoriler: sınıfa uygun kategoriler */
function listeUret(n, kullanilan, kategoriler) {
  const kat = karistir([...kategoriler]).slice(0, Math.min(kategoriler.length, Math.ceil(n / 2)));
  const secilen = [];
  for (let i = 0; secilen.length < n && i < n * 4; i++) {
    const k = kat[i % kat.length];
    let aday = k.kelimeler.filter((w) => !kullanilan.has(w) && !secilen.some((s) => s.kelime === w));
    if (!aday.length) aday = k.kelimeler.filter((w) => !secilen.some((s) => s.kelime === w));
    if (aday.length) secilen.push({ kelime: aday[Math.floor(Math.random() * aday.length)], kategori: k });
  }
  secilen.forEach((s) => kullanilan.add(s.kelime));
  return karistir(secilen);
}

/** Seçenekler: listedekiler + aynı kategorilerden aynı sayıda çeldirici (anlamca benzer), karışık */
function secenekUret(liste) {
  const hedef = new Set(liste.map((s) => s.kelime));
  const celdirici = [];
  for (const { kategori } of liste) {
    const aday = kategori.kelimeler.filter((w) => !hedef.has(w) && !celdirici.includes(w));
    if (aday.length) celdirici.push(aday[Math.floor(Math.random() * aday.length)]);
  }
  return karistir([...hedef, ...celdirici]);
}

/** yanit: hatırlanan kelimeler (sırasıyla). Kelime doğruluğu sıradan bağımsız, sıra doğruluğu aynı konumda aynı kelime */
function puanla(hedef, yanit) {
  const h = hedef.map(yazimSadelestir);
  const y = yanit.map(yazimSadelestir);
  const bulunan = new Set(y.filter((x) => h.includes(x)));
  return {
    kelimeDogru: bulunan.size,
    siraDogru: h.filter((x, i) => y[i] === x).length,
    fazla: yanit.filter((_, i) => !h.includes(y[i])),
    hatirlandi: h.map((x) => bulunan.has(x)),
    yerinde: h.map((x, i) => y[i] === x),
  };
}

export default hafizaOyunu({
  egzersiz: 'kelime-listesi',
  ad: 'Kelime Listesi',
  ikon: 'kelime-liste',
  birim: BIRIM,
  kisaAciklama: 'Bir hafıza çalışması: kelime listesini aklında tut, sonra hatırla. Yarış değil; kendi en uzun listeni geçmeye çalış.',
  nasil: [
    'Kelimeler tek tek belirir. Dikkatle oku. Seviye, kelimelerin ne kadar süre görüneceğini belirler.',
    'Sıra sana gelince hatırladığın kelimeleri gördüğün sırayla seç ya da yaz. Hem kaç kelime hatırladığın hem de sırası ayrı ayrı sayılır.',
    'Bütün kelimeleri hatırlayınca liste bir kelime uzar; üst üste iki kez eksik kalırsa bir kelime kısalır. Böylece liste hep senin için uygun uzunlukta kalır.',
  ],
  seviyeler: [
    { ad: 'Rahat', gosterMs: 1500, araMs: 500 },
    { ad: 'Orta', gosterMs: 1200, araMs: 400 },
    { ad: 'Hızlı', gosterMs: 900, araMs: 300 },
  ],
  yonler: [
    { deger: 'sec', etiket: 'Seçerek', aciklama: 'kelimelere sırayla dokun' },
    { deger: 'yaz', etiket: 'Yazarak', aciklama: 'hatırladıklarını yaz' },
  ],
  yonBaslik: 'Hatırlama',
  yonKapsam: (y) => `${trKucuk(y.etiket)} hatırlamada`,
  baslangic: { sec: 4, yaz: 3 },
  sinir: { en: 3, enCok: 10 },
  deneme: 8,
  hazirlikDenetle: () => (havuzYeterliMi() ? undefined
    : 'Kelime listeleri yüklenemedi. İnternete bağlanıp sayfayı yenile; bir kez yüklenince çevrimdışı da çalışır.'),
  puanEtiketi: 'En uzun liste',
  puanAciklama: 'Bu turda kelimelerinin hepsini hatırladığın en uzun liste.',
  sureNotu: 'Süre sınırı yok; 8 liste, yaklaşık 4 dakika. Hatırlarken acele etmene gerek yok.',
  gostergeler: [
    { alan: 'enIyi', ad: 'En uzun liste', yon: 'buyuk', bicim: (v) => (v ? `${v} kelime` : '-') },
    { alan: 'ogeIsabet', ad: 'Hatırlanan kelime', yon: 'buyuk', bicim: yuzdeBicimle },
    { alan: 'siraIsabet', ad: 'Doğru sırada', yon: 'buyuk', bicim: yuzdeBicimle },
  ],
  metinler: {
    enIyi: 'En uzun tam liste', deneme: 'Tam hatırlanan liste', oge: 'Kelime doğruluğu', yolOge: 'liste',
    yol: 'Bütün kelimeleri hatırlayınca liste uzadı, üst üste iki eksikte kısaldı. Çubuk boyu kelime sayısı.',
  },
  ekSatirlar: (e) => [
    ['Sıra doğruluğu', e.siraIsabet !== undefined ? yuzdeBicimle(e.siraIsabet) : '-'],
    ['Hatırlanan kelime', `${e.kelimeDogru ?? 0}/${e.kelimeToplam ?? 0}`],
    ['Listede olmayan', String(e.fazlaKelime ?? 0)],
  ],
  mesaj(e, { ipuclari }) {
    if (!e.deneme) return 'Bu turda liste tamamlanmadı. Hazır olduğunda yeniden dene.';
    const parca = [e.enIyi
      ? `Bu turda bütün kelimelerini hatırladığın en uzun liste ${e.enIyi} kelime.`
      : 'Bu turda listeler henüz tam tutmadı; acele etme, merdiven listeyi senin için uygun uzunlukta tutar.'];
    if (e.siraIsabet !== undefined && e.ogeIsabet !== undefined && e.ogeIsabet - e.siraIsabet >= 20) {
      parca.push('Kelimeleri iyi hatırlıyorsun; sırayı tutmak için kelimeleri küçük bir hikâyeye bağlamayı dene.');
    }
    if (e.enIyi && e.enIyi < 10) parca.push(`Bir sonraki hedef: ${e.enIyi + 1} kelimelik listeyi tam hatırlamak.`);
    else if (e.enIyi) parca.push('En uzun listeyi tam hatırladın; şimdi sırayı da korumayı hedefle.');
    if (ipuclari.length) parca.push(`İpucu: ${ipuclari[Math.floor(Math.random() * ipuclari.length)]}`);
    return parca.join(' ');
  },
  ipuclari: [
    'kelimeleri anlamlarına göre grupla: meyveler bir yana, taşıtlar bir yana.',
    'kelimeleri birbirine bağlayan kısa ve komik bir hikâye uydur; hikâye sırayı da korur.',
    'her kelimeyi gözünde canlandır; resim, tek başına kelimeden daha kolay hatırlanır.',
    { mod: 'yaz', metin: 'önce aklına gelenleri hızlıca yaz, sonra eksik kalanları kategori kategori düşün.' },
  ],
  alanEtiketi: 'Kelime Listesi. Kelimeler sırayla okunur. Sıra sana gelince kelimeleri gördüğün sırayla seç ya da yaz, sonra Tamam’a bas.',

  baslat(ctx, { mod, merdiven, deneme }) {
    const s = ctx.seviye;
    const sahne = hafizaSahnesi(ctx, { sahneSinif: 'kl-sahne' });
    const gosterim = el('p', { sinif: 'kl-gosterim', 'aria-hidden': 'true' });
    const giris = el('div', { sinif: 'kl-giris', hidden: true });
    const sonucListe = el('ol', { sinif: 'kl-sonuc', hidden: true });
    sahne.sahne.append(gosterim, giris, sonucListe);

    const ilerleme = el('p', { sinif: 'kl-ilerleme', 'aria-live': 'polite' });
    const geriAlDugme = el('button', { type: 'button', sinif: 'btn btn--ikincil hafiza-dugme', metin: 'Geri al', onclick: () => geriAl() });
    const tamamDugme = el('button', { type: 'button', sinif: 'btn btn--birincil hafiza-dugme', metin: 'Tamam', onclick: () => tamam() });
    const eylemler = el('div', { sinif: 'hafiza-eylemler', hidden: true }, geriAlDugme, tamamDugme);
    const devamDugme = el('button', { type: 'button', sinif: 'btn btn--birincil hafiza-devam', hidden: true });
    ctx.alan.append(el('div', { sinif: 'hafiza-alt' }, ilerleme, eylemler, devamDugme));

    const kullanilan = new Set();
    const kategoriler = sinifKategorileri(); // S34c: tur boyunca aynı sınıfın kategorileri
    const denemeler = [];
    const toplam = { kelimeDogru: 0, siraDogru: 0, kelimeToplam: 0, fazlaKelime: 0 };
    let kesinti = 0;
    let bitti = false;
    let acik = false;
    let hedefN = 0;
    let yanit = [];        // hatırlanan kelimeler (sırasıyla)
    let coz = null;
    let secenekDugmeleri = [];
    let girdi = null;
    ctx.temizlenince(() => { bitti = true; });

    // ---------- Hatırlama: ortak ----------
    function ilerlemeCiz() {
      ilerleme.textContent = mod === 'sec'
        ? `Seçilen ${yanit.length}/${hedefN}`
        : `Yazılan ${yanit.length}/${hedefN}${yanit.length < hedefN ? ' · bitirdiysen Tamam’a bas' : ''}`;
      geriAlDugme.setAttribute('aria-disabled', String(!yanit.length));
      tamamDugme.setAttribute('aria-disabled', String(mod === 'sec' ? yanit.length < hedefN : !yanit.length));
    }

    function geriAl() {
      if (!acik || !ctx.aktifMi() || !yanit.length) return;
      const w = yanit.pop();
      if (mod === 'sec') {
        const d = secenekDugmeleri.find((b) => b.dataset.kelime === w);
        if (d) { delete d.dataset.sira; d.setAttribute('aria-pressed', 'false'); }
      } else yazilanlariCiz();
      ilerlemeCiz();
    }

    function tamam() {
      if (!acik || !ctx.aktifMi()) return;
      if (mod === 'yaz' && girdi?.value.trim()) ekle(); // kutuda kalan kelime de sayılsın
      if (mod === 'sec' && yanit.length < hedefN) {
        sahne.geriYaz(null, `${hedefN} kelime seç; şu an ${yanit.length} kelime seçtin.`);
        return;
      }
      if (!yanit.length) {
        sahne.geriYaz(null, 'En az bir kelime yaz. Hatırlamıyorsan aklına gelen ilk kelimeyi yaz.');
        return;
      }
      acik = false;
      eylemler.setAttribute('aria-disabled', 'true');
      coz?.([...yanit]);
      coz = null;
    }

    // ---------- Seçerek: listedekiler + aynı kategoriden çeldiriciler ----------
    function secimKur(secenekler) {
      secenekDugmeleri = secenekler.map((w) => el('button', {
        type: 'button', sinif: 'btn btn--ikincil kl-secenek', 'data-kelime': w, 'aria-pressed': 'false', metin: w,
        onclick: () => sec(w),
      }));
      giris.replaceChildren(el('div', { sinif: 'kl-secenekler', role: 'group', 'aria-label': 'Kelimeler: gördüğün sırayla seç' }, secenekDugmeleri));
    }

    function sec(w) {
      if (!acik || !ctx.aktifMi() || yanit.length >= hedefN || yanit.includes(w)) return;
      yanit.push(w);
      ctx.ses('tik');
      sahne.temizle();
      const d = secenekDugmeleri.find((b) => b.dataset.kelime === w);
      d.dataset.sira = String(yanit.length);
      d.setAttribute('aria-pressed', 'true');
      ilerlemeCiz();
    }

    // ---------- Yazarak: kutuya yaz, Ekle (Enter) ----------
    const yazilanlar = el('ol', { sinif: 'kl-yazilan', 'aria-label': 'Yazdığın kelimeler' });
    function yazimKur() {
      girdi = el('input', {
        type: 'text', sinif: 'girdi kl-girdi', id: 'kl-girdi', lang: 'tr', autocomplete: 'off', autocapitalize: 'none',
        spellcheck: 'false', enterkeyhint: 'enter', maxlength: '20',
      });
      const ekleDugme = el('button', { type: 'button', sinif: 'btn btn--ikincil kl-ekle', metin: 'Ekle', onclick: () => { ekle(); girdi.focus(); } });
      girdi.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.repeat) { e.preventDefault(); e.stopPropagation(); ekle(); }
      });
      giris.replaceChildren(
        el('label', { for: 'kl-girdi', sinif: 'kl-etiket', metin: 'Hatırladığın kelimeyi yaz, Ekle’ye bas' }),
        el('div', { sinif: 'kl-yaz-satir' }, girdi, ekleDugme),
        yazilanlar);
      yazilanlariCiz();
    }

    function ekle() {
      if (!acik || !ctx.aktifMi() || !girdi) return;
      const w = trKucuk(girdi.value.normalize('NFC').trim().split(/\s+/)[0] ?? '');
      girdi.value = '';
      if (!w) return;
      if (yanit.length >= hedefN) { sahne.geriYaz(null, `En çok ${hedefN} kelime yazabilirsin. Bitirdiysen Tamam’a bas.`); return; }
      if (yanit.some((x) => yazimSadelestir(x) === yazimSadelestir(w))) { sahne.geriYaz(null, `“${w}” kelimesini zaten yazdın.`); return; }
      yanit.push(w);
      ctx.ses('tik');
      sahne.temizle();
      yazilanlariCiz();
      ilerlemeCiz();
    }

    function yazilanlariCiz() {
      yazilanlar.replaceChildren(...yanit.map((w) => el('li', { sinif: 'kl-etiket-kelime', metin: w })));
    }

    // ---------- Gösterim ve sonuç ----------
    async function sun(liste) {
      giris.hidden = true;
      sonucListe.hidden = true;
      eylemler.hidden = true;
      ilerleme.textContent = '';
      gosterim.hidden = false;
      for (const { kelime } of liste) {
        gosterim.textContent = kelime;
        ogeDuyur(kelime);
        await bekle(ctx, s.gosterMs);
        gosterim.textContent = '';
        await bekle(ctx, s.araMs);
      }
    }

    function hatirla(liste) {
      hedefN = liste.length;
      yanit = [];
      gosterim.hidden = true;
      if (mod === 'sec') secimKur(secenekUret(liste));
      else yazimKur();
      giris.hidden = false;
      eylemler.hidden = false;
      eylemler.removeAttribute('aria-disabled');
      ilerlemeCiz();
      acik = true;
      (mod === 'sec' ? secenekDugmeleri[0] : girdi)?.focus({ preventScroll: true });
      return new Promise((r) => { coz = r; });
    }

    // Listenin doğru sırası: hatırlanan ✓, yeri de doğruysa “yerinde”, hatırlanmayan ○ (yalnız renge dayanmaz)
    function sonucCiz(hedef, p) {
      giris.hidden = true;
      eylemler.hidden = true;
      sonucListe.replaceChildren(...hedef.map((w, i) => el('li', {
        sinif: 'kl-sonuc__oge', 'data-sonuc': p.yerinde[i] ? 'dogru' : p.hatirlandi[i] ? 'kismen' : 'yanlis',
        metin: `${p.hatirlandi[i] ? '✓' : '○'} ${w}${p.hatirlandi[i] && !p.yerinde[i] ? ' (sırası farklı)' : ''}`,
      })));
      sonucListe.hidden = false;
    }

    function geriMetni(p, n, adim) {
      const parca = [`${n} kelimeden ${p.kelimeDogru} tanesini hatırladın; ${p.siraDogru} tanesi doğru sırada.`];
      if (p.fazla.length) parca.push(`Listede olmayan: ${p.fazla.join(', ')}.`);
      if (adim.degisim > 0) parca.push(`Sıradaki liste ${adim.deger} kelime.`);
      else if (adim.degisim < 0) parca.push(`Sıradaki liste ${adim.deger} kelime.`);
      else if (p.kelimeDogru === n) parca.push(adim.onceki >= merdiven.kural.enCok ? 'En uzun listedesin.' : 'Bir tam liste daha gelince liste uzar.');
      else parca.push('Aynı uzunlukta bir liste daha.');
      return parca.join(' ');
    }

    function devamBekle(metin) {
      return new Promise((r) => {
        devamDugme.textContent = metin;
        devamDugme.hidden = false;
        devamDugme.onclick = () => {
          if (!ctx.aktifMi()) return;
          devamDugme.hidden = true;
          devamDugme.onclick = null;
          ctx.alan.focus({ preventScroll: true });
          r();
        };
        devamDugme.focus({ preventScroll: true });
      });
    }

    // Klavye (seçerek modda): Geri silme son seçimi geri alır, Enter onaylar. Yazarken Enter kelimeyi ekler
    ctx.alan.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey || !acik || e.target === girdi) return;
      if (e.key === 'Backspace' || e.key === 'Delete') { e.preventDefault(); geriAl(); }
      else if (e.key === 'Enter' && !(e.target instanceof HTMLButtonElement)) { e.preventDefault(); if (!e.repeat) tamam(); }
    });

    async function dongu() {
      await bekle(ctx, 500);
      while (!bitti && denemeler.length < deneme) {
        const n = merdiven.deger;
        sahne.durum.textContent = `Liste ${denemeler.length + 1}/${deneme} · ${n} ${BIRIM}`;
        sahne.temizle();
        sahne.asamaYaz('İzle', 'izle');
        await bekle(ctx, 700);
        if (bitti) return;
        const liste = listeUret(n, kullanilan, kategoriler);
        const d0 = performance.now();
        const g0 = ctx.gecenSn() * 1000;
        await sun(liste);
        if (bitti) return;
        if ((performance.now() - d0) - (ctx.gecenSn() * 1000 - g0) > KESINTI_MS) {
          kesinti += 1;
          sahne.asamaYaz('', '');
          sahne.geriYaz(null, 'Ara verildiği için yeni bir liste gösterilecek.');
          await bekle(ctx, 1400);
          continue;
        }
        sahne.asamaYaz(mod === 'sec' ? 'Sıra sende: gördüğün sırayla seç' : 'Sıra sende: hatırladıklarını yaz', 'gir');
        const hedef = liste.map((x) => x.kelime);
        const cevap = await hatirla(liste);
        if (bitti) return;
        const p = puanla(hedef, cevap);
        const tam = p.kelimeDogru === hedef.length;
        const adim = merdiven.sonuc(tam);
        denemeler.push({ duzey: n, dogru: tam, dogruOge: p.kelimeDogru, ogeSayisi: hedef.length });
        toplam.kelimeDogru += p.kelimeDogru;
        toplam.siraDogru += p.siraDogru;
        toplam.kelimeToplam += hedef.length;
        toplam.fazlaKelime += p.fazla.length;
        sahne.asamaYaz('', '');
        ctx.ses(tam ? 'dogru' : 'yanlis');
        sonucCiz(hedef, p);
        sahne.geriYaz(tam ? 'dogru' : 'yanlis', geriMetni(p, hedef.length, adim));
        duyur(`Liste: ${hedef.join(', ')}.`);
        await devamBekle(denemeler.length < deneme ? 'Sonraki liste' : 'Sonuçları gör');
      }
      if (!bitti) bitir();
    }

    function bitir() {
      hafizaBitir(ctx, denemeler, {
        merdiven, kesinti,
        bitince: () => Object.assign(ctx.ekstra, toplam, {
          siraIsabet: toplam.kelimeToplam ? Math.round((toplam.siraDogru * 100) / toplam.kelimeToplam) : undefined,
        }),
      });
    }

    dongu().catch((h) => {
      console.error('[kelime-listesi] tur hatası:', h);
      if (!bitti) bitir();
    });
  },

  stil: `
    .kl-sahne { grid-template-columns: minmax(0, 1fr); justify-items: center; min-block-size: 9rem; align-content: center; }
    .kl-gosterim { min-block-size: 1.3em; margin: 0; font-size: clamp(2rem, 11vw, 3.5rem); font-weight: 800; line-height: 1.2; text-align: center; overflow-wrap: anywhere; color: var(--renk-metin); }
    .kl-giris { display: grid; grid-template-columns: minmax(0, 1fr); gap: var(--b-2); inline-size: min(100%, 32rem); }
    .kl-secenekler { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--b-2); }
    @media (min-width: 34rem) { .kl-secenekler { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
    .kl-secenek {
      position: relative; min-block-size: 3.25rem; padding: var(--b-2) var(--b-3); font-size: var(--fs-m); font-weight: 700;
      overflow-wrap: anywhere; touch-action: manipulation;
    }
    /* Seçilen kelime: sıra numarası rozeti + birincil çerçeve */
    .kl-secenek[data-sira] { background: var(--renk-birincil-zemin); border-color: var(--renk-birincil); box-shadow: inset 0 0 0 2px var(--renk-birincil); }
    .kl-secenek[data-sira]::before {
      content: attr(data-sira); position: absolute; inset-block-start: 4px; inset-inline-start: 6px;
      font-size: var(--fs-xs); font-weight: 800; color: var(--renk-birincil);
    }
    .kl-etiket { font-weight: 700; }
    .kl-yaz-satir { display: flex; gap: var(--b-2); }
    .kl-girdi { flex: 1 1 0; inline-size: 0; min-inline-size: 0; min-block-size: 3rem; font-size: var(--fs-l); }
    .kl-ekle { flex: 0 0 auto; min-block-size: 3rem; min-inline-size: 5rem; }
    .kl-yazilan, .kl-sonuc { display: flex; flex-wrap: wrap; gap: var(--b-1); margin: 0; padding: 0; list-style: none; justify-content: center; }
    .kl-yazilan:empty { display: none; }
    .kl-etiket-kelime, .kl-sonuc__oge {
      padding: var(--b-1) var(--b-2); border: 2px solid var(--renk-kenar-guclu); border-radius: var(--kose-tam);
      background: var(--renk-yuzey); font-weight: 700;
    }
    .kl-sonuc__oge[data-sonuc="dogru"] { border-color: var(--renk-basari); background: var(--renk-basari-zemin); color: var(--renk-basari); }
    .kl-sonuc__oge[data-sonuc="kismen"] { border-color: var(--renk-gunes-golge); background: var(--renk-gunes-zemin); color: var(--renk-metin); }
    .kl-sonuc__oge[data-sonuc="yanlis"] { border-style: dashed; border-color: var(--renk-vurgu-metin); background: var(--renk-vurgu-zemin); color: var(--renk-vurgu-metin); }
    .kl-ilerleme { min-block-size: 1.5em; margin: 0; font-weight: 700; color: var(--renk-metin-soluk); }
    @media (forced-colors: active) { .kl-secenek[data-sira], .kl-sonuc__oge[data-sonuc] { outline: 2px solid Highlight; } }
  `,
});
