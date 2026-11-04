// Ders motoru (S15): data/lessons/<ad>.json dersini yükler, denetler ve tek bileşende oynatır: ön deneme → anlat → birlikte yap → kendin dene → ölç (öncesi/sonrası karşılaştırma)
import { el, spriteIkon } from '../core/ui.js';
import { duyur, odakla } from '../core/a11y.js';
import { trKucuk, karistir, sureBicimle, sureMetni, yuzdeBicimle } from '../core/utils.js';
import { kayitEkle, modulKayitlari } from '../core/metrics.js';
import { sesCal } from '../core/sound.js';

/*
 * DERS ŞEMASI (data/lessons/<ad>.json):
 * { surum, ad, baslik, kisaAciklama, sureDk,
 *   anlat: { baslik?, paragraflar[], ornek?: { baslik, satirlar[] }, not? },
 *   birlikte: { yonerge, adimlar: [{ metin, sahne? }] (≥2), kontrol: { soru, secenekler[2-4], dogru (sıra), aciklama } },
 *   kendin: { tur: metin|satirlar, yonerge, ipuclari[], onerilenSn (30-300), etiket?, yerTutucu?,
 *             etiketler? (satır adları; yoksa satırlar ölçüm öğelerinden), ogeyleEsle? (etiket → öğe), satirIpuclari? },
 *   olcum: { tur: liste|esler, siraOnemli? (liste), calismaSn (10-120), araSn (5-60), konu?, hatirlaYonerge?, araYonerge?,
 *            once/sonra: liste → { ogeler: [tek kelime] } · esler → { esler: [{ ipucu, okunus?, cevap: [kabul edilen] }] } (iki taraf eşit uzunlukta) },
 *   kapanis? }
 * Kayıt: modul hafiza, egzersiz teknik-<ad>, zorluk 1, dogru/yanlis = sonraki ölçüm, ekstra { tur, once, sonra, toplam, fark, onceSira?, sonraSira? }
 */

export const DERS_MODUL = 'hafiza';
export const DERS_ADLARI = Object.freeze(['hikaye-zinciri', 'mekan-yontemi', 'akrostis-kisaltma', 'gorsellestirme', 'anahtar-kelime', 'gruplama']);
export const OLCUM_TURLERI = Object.freeze(['liste', 'esler']);
export const KENDIN_TURLERI = Object.freeze(['metin', 'satirlar']);
export const ADIMLAR = Object.freeze(['Ön deneme', 'Anlat', 'Birlikte yap', 'Kendin dene', 'Ölç']);
export const dersEgzersizAdi = (ad) => `teknik-${ad}`;

const VARSAYILAN_ARA = 'Listeyi aklında tutmaya çalışırken içinden 20’den geriye doğru ikişer say: 20, 18, 16…';
const DURUSTLUK = 'İki listedeki kelimeler farklı ve bu tek bir deneme; küçük farklar şans eseri de olabilir. Dersi birkaç gün sonra tekrarlarsan tekniğin sana ne kadar uyduğunu daha iyi görürsün (listeler aynı kalır, bu yüzden en anlamlı karşılaştırma ilk denemendir).';

// ---------- Puanlama (DOM'a dokunmaz) ----------
/** Karşılaştırma için sadeleştirir: tr-TR küçük harf, şapkasız, noktalamasız, tek boşluk */
export function normalYaz(s) {
  return trKucuk(String(s ?? '').normalize('NFC'))
    .replace(/[âà]/g, 'a').replace(/[îì]/g, 'i').replace(/[ûù]/g, 'u')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
}

// Düzenleme uzaklığı (1'den büyükse 2 döner; yalnız "en çok 1 hata" sorusu için)
function mesafe(a, b) {
  const x = [...a];
  const y = [...b];
  if (Math.abs(x.length - y.length) > 1) return 2;
  let onceki = Array.from({ length: y.length + 1 }, (_, i) => i);
  for (let i = 1; i <= x.length; i++) {
    const satir = [i];
    for (let j = 1; j <= y.length; j++) {
      satir[j] = Math.min(onceki[j] + 1, satir[j - 1] + 1, onceki[j - 1] + (x[i - 1] === y[j - 1] ? 0 : 1));
    }
    onceki = satir;
  }
  return onceki[y.length];
}

/** Hoşgörülü eşleşme: Türkçe ekler ("elmayı", "kitabı") ve 5+ harfli kelimede tek harflik yazım hatası kabul edilir (sondan kesik yazım değil: "kova" ≠ "kovan") */
export function benzerMi(girilen, hedef) {
  if (!girilen || !hedef) return false;
  if (girilen === hedef) return true;
  const g = [...girilen];
  const h = [...hedef];
  const ek = g.length - h.length;
  if (h.length >= 3 && ek >= 1 && ek <= 4) {
    const bas = g.slice(0, h.length).join('');
    if (bas === hedef || (h.length >= 4 && mesafe(bas, hedef) <= 1)) return true;
  }
  return h.length >= 5 && !hedef.startsWith(girilen) && mesafe(girilen, hedef) <= 1;
}

// Girilen sıradaki hedef numaralarının en uzun artan alt dizisi = doğru sırada yazılan öğe sayısı
function enUzunArtan(dizi) {
  const uz = dizi.map(() => 1);
  for (let i = 1; i < dizi.length; i++) for (let j = 0; j < i; j++) if (dizi[j] < dizi[i]) uz[i] = Math.max(uz[i], uz[j] + 1);
  return uz.length ? Math.max(...uz) : 0;
}

/**
 * Serbest hatırlama: metin boşluk/virgül/satırla bölünür; her hedef en çok bir kez sayılır (önce tam, sonra hoşgörülü eşleşme).
 * Döner: { dogru, toplam, hatirlanan: [bool], fazla, sira: number|null }
 */
export function listePuanla(metin, ogeler, { siraOnemli = false } = {}) {
  const hedefler = ogeler.map(normalYaz);
  const girilen = normalYaz(metin).split(' ').filter(Boolean);
  const bulunan = hedefler.map(() => -1); // hedef → girilen kelimenin sırası
  const kullanildi = girilen.map(() => false);
  for (const tam of [true, false]) {
    girilen.forEach((g, gi) => {
      if (kullanildi[gi]) return;
      const hi = hedefler.findIndex((h, i) => bulunan[i] < 0 && (tam ? g === h : benzerMi(g, h)));
      if (hi >= 0) { bulunan[hi] = gi; kullanildi[gi] = true; }
    });
  }
  const sirali = bulunan.map((gi, hi) => [gi, hi]).filter(([gi]) => gi >= 0).sort((a, b) => a[0] - b[0]).map(([, hi]) => hi);
  return {
    dogru: sirali.length,
    toplam: hedefler.length,
    hatirlanan: bulunan.map((gi) => gi >= 0),
    fazla: kullanildi.filter((k) => !k).length,
    sira: siraOnemli ? enUzunArtan(sirali) : null,
  };
}

/** İpuçlu hatırlama: yanitlar[i] esler[i] içindir; boşluklar yok sayılır ("baş parmak" = "başparmak") */
export function eslerPuanla(yanitlar, esler) {
  const sade = (s) => normalYaz(s).replace(/ /g, '');
  const hatirlanan = esler.map((e, i) => {
    const g = sade(yanitlar?.[i]);
    return !!g && e.cevap.some((c) => benzerMi(g, sade(c)));
  });
  return { dogru: hatirlanan.filter(Boolean).length, toplam: esler.length, hatirlanan, fazla: 0, sira: null };
}

/** Öncesi/sonrası karşılaştırma (iki liste eşit uzunlukta) */
export function karsilastir(once, sonra) {
  const yuzde = (s) => (s.toplam ? Math.round((s.dogru * 100) / s.toplam) : 0);
  const fark = sonra.dogru - once.dogru;
  return {
    once: once.dogru, sonra: sonra.dogru, toplam: sonra.toplam,
    onceYuzde: yuzde(once), sonraYuzde: yuzde(sonra), fark,
    durum: fark > 0 ? 'artti' : fark < 0 ? 'azaldi' : 'ayni',
  };
}

/** Sonuç mesajı: cezalandırmayan, kendi geçmişiyle kıyaslayan dil */
export function karsilastirmaMesaji(k) {
  const tam = k.sonra === k.toplam ? ' Hepsini hatırladın!' : '';
  if (k.durum === 'artti') return `Teknikle ${k.fark} öğe daha fazla hatırladın.${tam}`;
  if (k.durum === 'ayni') return `İki denemede de ${k.sonra} öğe hatırladın.${tam} Yeni bir yöntem ilk seferde alışılmadık gelebilir; denedikçe kolaylaşır.`;
  return 'Bu kez ilk deneme biraz daha iyi geçti. Bu da olur: yeni bir yöntem başta düşünmeyi yavaşlatabilir. Bir sonraki denemede yeniden ölç.';
}

// ---------- Denetim ve yükleme ----------
const metinMi = (v) => typeof v === 'string' && v.trim() !== '';
const metinDizisi = (v, en = 1) => Array.isArray(v) && v.length >= en && v.every(metinMi);
const sayiAraliginda = (v, en, enCok) => Number.isFinite(v) && v >= en && v <= enCok;

/** Ders JSON'unu denetler; hata metinleri dizisi döner (boşsa geçerli) */
export function dersDenetle(d, ad) {
  const h = [];
  if (!d || typeof d !== 'object') return ['ders nesne değil'];
  if (d.ad !== ad) h.push('ad dosya adıyla aynı değil');
  for (const a of ['baslik', 'kisaAciklama', 'sureDk']) if (!metinMi(d[a])) h.push(`${a} eksik`);
  if (!metinDizisi(d.anlat?.paragraflar)) h.push('anlat.paragraflar eksik');
  if (d.anlat?.ornek && (!metinMi(d.anlat.ornek.baslik) || !metinDizisi(d.anlat.ornek.satirlar))) h.push('anlat.ornek hatalı');
  const b = d.birlikte;
  if (!metinMi(b?.yonerge) || !Array.isArray(b?.adimlar) || b.adimlar.length < 2 || !b.adimlar.every((x) => metinMi(x?.metin))) h.push('birlikte hatalı');
  const k = b?.kontrol;
  if (!metinMi(k?.soru) || !metinDizisi(k?.secenekler, 2) || k.secenekler.length > 4
    || !Number.isInteger(k?.dogru) || k.dogru < 0 || k.dogru >= k.secenekler.length || !metinMi(k?.aciklama)) h.push('birlikte.kontrol hatalı');

  const o = d.olcum;
  if (!OLCUM_TURLERI.includes(o?.tur)) h.push('olcum.tur hatalı');
  if (!sayiAraliginda(o?.calismaSn, 10, 120) || !sayiAraliginda(o?.araSn, 5, 60)) h.push('olcum süreleri hatalı');
  let n = 0;
  if (o?.tur === 'liste') {
    const tek = (l) => metinDizisi(l, 4) && l.length <= 15 && l.every((x) => !/\s/.test(x.trim()));
    if (!tek(o.once?.ogeler) || !tek(o.sonra?.ogeler)) h.push('olcum öğeleri 4-15 tek kelime olmalı');
    else if (o.once.ogeler.length !== o.sonra.ogeler.length) h.push('once ve sonra eşit uzunlukta olmalı');
    else n = o.sonra.ogeler.length;
  } else if (o?.tur === 'esler') {
    const es = (l) => Array.isArray(l) && l.length >= 3 && l.length <= 10 && l.every((x) => metinMi(x?.ipucu) && metinDizisi(x?.cevap));
    if (!es(o.once?.esler) || !es(o.sonra?.esler)) h.push('olcum eşleri 3-10 {ipucu, cevap[]} olmalı');
    else if (o.once.esler.length !== o.sonra.esler.length) h.push('once ve sonra eşit uzunlukta olmalı');
    else n = o.sonra.esler.length;
  }

  const kd = d.kendin;
  if (!KENDIN_TURLERI.includes(kd?.tur) || !metinMi(kd?.yonerge) || !Array.isArray(kd?.ipuclari) || !sayiAraliginda(kd?.onerilenSn, 30, 300)) h.push('kendin hatalı');
  if (kd?.etiketler !== undefined && !metinDizisi(kd.etiketler)) h.push('kendin.etiketler hatalı');
  if (kd?.ogeyleEsle && (o?.tur !== 'liste' || kd.etiketler?.length !== n)) h.push('ogeyleEsle için etiketler öğe sayısıyla eşit olmalı');
  if (kd?.satirIpuclari !== undefined && (!Array.isArray(kd.satirIpuclari) || kd.satirIpuclari.length !== (kd.etiketler?.length ?? n))) h.push('satirIpuclari satır sayısıyla eşit olmalı');
  return h;
}

const yuklenenler = new Map();

/** Dersi yükler (bir kez); geçersizse hata fırlatır. Bilinmeyen ad → null */
export function dersYukle(ad) {
  if (!DERS_ADLARI.includes(ad)) return Promise.resolve(null);
  if (!yuklenenler.has(ad)) {
    const s = (async () => {
      const yanit = await fetch(new URL(`../../data/lessons/${ad}.json`, import.meta.url));
      if (!yanit.ok) throw new Error(`${ad}.json açılamadı (${yanit.status})`);
      const ders = await yanit.json();
      const hatalar = dersDenetle(ders, ad);
      if (hatalar.length) throw new Error(`${ad}.json: ${hatalar.join('; ')}`);
      return ders;
    })();
    s.catch(() => yuklenenler.delete(ad)); // hata kalıcı olmasın: sonraki açılışta yeniden denenir
    yuklenenler.set(ad, s);
  }
  return yuklenenler.get(ad);
}

/** Tüm dersler (DERS_ADLARI sırasıyla): [{ ad, ders | null }] */
export async function dersleriYukle() {
  const sonuc = await Promise.allSettled(DERS_ADLARI.map(dersYukle));
  return sonuc.map((s, i) => {
    if (s.status === 'rejected') console.error('[ders]', s.reason);
    return { ad: DERS_ADLARI[i], ders: s.status === 'fulfilled' ? s.value : null };
  });
}

/** Bu dersin kayıtları (eskiden yeniye) */
export const dersGecmisi = (ad, profilId) => modulKayitlari(DERS_MODUL, { egzersiz: dersEgzersizAdi(ad), profilId });

// ---------- Ders ekranı ----------
const dugme = (metin, onclick, tur = 'ikincil') => el('button', { type: 'button', sinif: `btn btn--${tur}`, metin, onclick });

// Ölçüm öğelerinin metinleri (çalışma ekranı, satır etiketleri, inceleme)
function esMetni(e) {
  return `${e.ipucu}${e.okunus ? ` (okunuşu: ${e.okunus})` : ''}`;
}

/**
 * Dersi kap içine çizer ve oynatır. Döner: { kapat() } (sayfadan çıkınca sayaçları durdurur).
 * Seçenekler: geriAdres, geriEtiket (dersten çıkış bağlantısı)
 */
export function dersEkraniKur(kap, ders, { geriAdres = '#/teknikler', geriEtiket = 'Tüm dersler' } = {}) {
  const o = ders.olcum;
  const liste = o.tur === 'liste';
  const n = liste ? o.sonra.ogeler.length : o.sonra.esler.length;
  let kapandi = false;
  const sayaclar = new Set();
  const durum = { adim: 0, basladi: false, bitti: false, baslangic: 0, once: null, sonra: null, kendinBaslangic: 0, kendinSn: 0 };

  function aralik(fn, ms) {
    const id = setInterval(() => { if (!kapandi) fn(); }, ms);
    sayaclar.add(id);
    return () => { clearInterval(id); sayaclar.delete(id); };
  }

  // Üst kısım ve adım göstergesi
  const geri = el('a', {
    sinif: 'btn btn--hayalet btn--kucuk geri-baglanti', href: geriAdres,
    onclick: (e) => {
      if (durum.basladi && !durum.bitti && !confirm('Dersten çıkarsan bu denemenin sonucu kaydedilmez. Çıkılsın mı?')) e.preventDefault();
    },
  }, spriteIkon('ok-sag', 'ikon ikon--kucuk ikon--ters'), geriEtiket);
  const adimOgeleri = ADIMLAR.map((a, i) => el('li', {},
    el('span', { sinif: 'ders-adimlar__no', 'aria-hidden': 'true', metin: String(i + 1) }),
    el('span', { sinif: 'ders-adimlar__ad', metin: a }),
    el('span', { sinif: 'ekran-okuyucu' })));
  const adimListesi = el('ol', { sinif: 'ders-adimlar', 'aria-label': 'Ders adımları' }, adimOgeleri);
  const govde = el('section', { sinif: 'kart ders-govde', 'aria-labelledby': 'ders-adim-baslik' });

  kap.replaceChildren(
    geri,
    el('div', { sinif: 'sayfa-ust', 'data-modul': DERS_MODUL },
      el('span', { sinif: 'kart__ikon', 'aria-hidden': 'true' }, spriteIkon('akademi', 'ikon')),
      el('div', {}, el('h1', { metin: ders.baslik }), el('p', { sinif: 'soluk', metin: ders.kisaAciklama }))),
    el('p', { sinif: 'ders-sure' }, el('span', { sinif: 'rozet rozet--vurgu', metin: `Yaklaşık ${ders.sureDk} dakika` })),
    adimListesi,
    govde);

  let ilkCizim = true;
  function goster(adim, baslik, ...icerik) {
    durum.adim = adim;
    adimOgeleri.forEach((li, i) => {
      li.dataset.durum = i < adim ? 'bitti' : i === adim ? 'simdi' : 'sirada';
      if (i === adim) li.setAttribute('aria-current', 'step');
      else li.removeAttribute('aria-current');
      li.lastChild.textContent = i < adim ? ' (tamamlandı)' : '';
    });
    const h2 = el('h2', { id: 'ders-adim-baslik', metin: baslik });
    govde.replaceChildren(h2, ...icerik.flat().filter((c) => c != null && c !== false));
    if (!ilkCizim) odakla(h2);
    ilkCizim = false;
  }

  // Sayaç: kalan süre metni + ince çubuk; Date.now ile hesaplanır (sekme arka plandayken de doğru)
  function sayacOlustur(sn, bitince) {
    const metin = el('span', { sinif: 'ders-sayac__sure', metin: sureBicimle(sn) });
    const dolgu = el('span', { sinif: 'ilerleme__dolgu', style: '--deger: 100%' });
    const kok = el('div', { sinif: 'ders-sayac' },
      el('span', { sinif: 'ders-sayac__etiket', metin: 'Kalan süre' }), metin,
      el('div', { sinif: 'ilerleme ilerleme--ince ders-sayac__cubuk', 'aria-hidden': 'true' }, dolgu));
    const bitis = Date.now() + sn * 1000;
    const dur = aralik(() => {
      const kalan = Math.max(0, bitis - Date.now());
      metin.textContent = sureBicimle(Math.ceil(kalan / 1000));
      dolgu.style.setProperty('--deger', `${(kalan / (sn * 1000)) * 100}%`);
      if (!kalan) { dur(); bitince(); }
    }, 250);
    return { kok, dur };
  }

  // Öğeleri gösterir: liste (sıra önemliyse numaralı) ya da eşler (ipucu — cevap)
  function ogeGorunumu(parca) {
    if (liste) {
      return el(o.siraOnemli ? 'ol' : 'ul', { sinif: `ders-ogeler${o.siraOnemli ? ' ders-ogeler--sirali' : ''}`, 'aria-label': 'Kelimeler' },
        parca.ogeler.map((k) => el('li', { metin: k })));
    }
    return el('ul', { sinif: 'ders-esler', 'aria-label': 'Kelime çiftleri' },
      parca.esler.map((e) => el('li', {},
        el('span', { sinif: 'ders-esler__ipucu' }, e.ipucu, e.okunus && el('small', { metin: ` (okunuşu: ${e.okunus})` })),
        el('span', { sinif: 'ders-esler__ok', 'aria-hidden': 'true', metin: '→' }),
        el('span', { sinif: 'ekran-okuyucu', metin: ': ' }),
        el('span', { sinif: 'ders-esler__cevap', metin: e.cevap[0] }))));
  }

  // Çalışma: kesin ise süre bitince kendiliğinden geçer; değilse süre yalnızca önerilir
  function calisma({ adim, baslik, aciklama, ust = [], parca, sureSn, kesin, alt = [], dugmeMetni }) {
    return new Promise((coz) => {
      let bitti = false;
      const not = el('p', { sinif: 'alan__ipucu', 'aria-live': 'polite' });
      const sayac = sayacOlustur(sureSn, () => {
        if (kesin) { duyur('Süre doldu.'); bitir(); return; }
        not.textContent = 'Önerilen süre doldu. Hazırsan devam et; birkaç saniye daha kullanabilirsin.';
      });
      function bitir() {
        if (bitti || kapandi) return;
        bitti = true;
        sayac.dur();
        coz();
      }
      goster(adim, baslik, aciklama && el('p', { metin: aciklama }), ust, sayac.kok, parca && ogeGorunumu(parca), alt, not,
        el('div', { sinif: 'ders-eylemler' }, dugme(dugmeMetni, bitir, 'birincil')));
      duyur(`${sureMetni(sureSn)} ${kesin ? 'süren var' : 'önerilen süre'}.`);
    });
  }

  function ara(adim) {
    return new Promise((coz) => {
      const sn = o.araSn;
      const sayi = el('p', { sinif: 'ders-ara__sayi', 'aria-hidden': 'true', metin: String(sn) });
      goster(adim, 'Kısa ara', el('p', { metin: o.araYonerge ?? VARSAYILAN_ARA }), sayi);
      duyur(`Kısa ara, ${sureMetni(sn)}. ${o.araYonerge ?? VARSAYILAN_ARA}`);
      const bitis = Date.now() + sn * 1000;
      const dur = aralik(() => {
        const k = Math.max(0, Math.ceil((bitis - Date.now()) / 1000));
        sayi.textContent = String(k);
        if (!k) { dur(); coz(); }
      }, 200);
    });
  }

  // Hatırlama: liste → tek metin alanı; eşler → karışık sırada ipucu başına bir kutu
  function hatirla(adim, parca) {
    return new Promise((coz) => {
      const uyari = el('p', { sinif: 'alan__ipucu', 'aria-live': 'polite' });
      let bosUyarildi = false;
      let topla;
      let alanlar;
      if (liste) {
        const ipucu = el('p', { id: `ders-hatirla-ipucu-${adim}`, sinif: 'alan__ipucu',
          metin: 'Virgülle, boşlukla ya da alt alta yazabilirsin. Emin olmadıklarını da yaz.' });
        const kutu = el('textarea', { sinif: 'girdi', id: `ders-hatirla-${adim}`, rows: '5', autocomplete: 'off',
          autocapitalize: 'off', spellcheck: 'false', 'aria-describedby': ipucu.id });
        alanlar = [el('div', { sinif: 'alan' },
          el('label', { sinif: 'alan__etiket', for: kutu.id,
            metin: o.siraOnemli ? 'Hatırladığın kelimeleri yaz; sırasını da korumaya çalış.' : 'Hatırladığın kelimeleri yaz; sıra önemli değil.' }),
          kutu, ipucu)];
        topla = () => ({ bos: !kutu.value.trim(), sonuc: () => listePuanla(kutu.value, parca.ogeler, { siraOnemli: o.siraOnemli }) });
      } else {
        const sira = karistir(parca.esler.map((_, i) => i));
        const kutular = parca.esler.map(() => null);
        alanlar = sira.map((i, s) => {
          const kutu = el('input', { sinif: 'girdi', id: `ders-es-${adim}-${i}`, type: 'text', autocomplete: 'off',
            autocapitalize: 'off', spellcheck: 'false', enterkeyhint: s === sira.length - 1 ? 'done' : 'next' });
          kutular[i] = kutu;
          // Enter son kutuda değilse sonrakine geçer (yanlışlıkla erken bitirilmesin)
          kutu.addEventListener('keydown', (e) => {
            if (e.key !== 'Enter' || s === sira.length - 1) return;
            e.preventDefault();
            document.getElementById(`ders-es-${adim}-${sira[s + 1]}`)?.focus();
          });
          return el('div', { sinif: 'alan ders-es-alani' }, el('label', { sinif: 'alan__etiket', for: kutu.id, metin: esMetni(parca.esler[i]) }), kutu);
        });
        topla = () => ({ bos: kutular.every((k) => !k.value.trim()), sonuc: () => eslerPuanla(kutular.map((k) => k.value), parca.esler) });
      }
      const form = el('form', { sinif: 'yigin ders-form', novalidate: true }, alanlar, uyari,
        el('div', { sinif: 'ders-eylemler' }, el('button', { type: 'submit', sinif: 'btn btn--birincil', metin: 'Bitirdim' })));
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const t = topla();
        if (t.bos && !bosUyarildi) {
          bosUyarildi = true;
          uyari.textContent = 'Hiçbiri aklına gelmediyse de sorun değil. Yine de bitirmek için “Bitirdim”e bir kez daha bas.';
          return;
        }
        coz(t.sonuc());
      });
      goster(adim, 'Hatırla', el('p', { metin: liste ? 'Liste gizlendi. Aklında kalanları yaz.' : (o.hatirlaYonerge ?? 'Her kelimenin eşini yaz. Emin değilsen tahmin edebilir ya da boş bırakabilirsin.') }), form);
    });
  }

  // Hatırlananlar listesi (✓ hatırladın / – bu kez gelmedi)
  function inceleme(parca, sonuc) {
    const metinler = liste ? parca.ogeler : parca.esler.map((e) => `${e.ipucu} → ${e.cevap[0]}`);
    return el('ul', { sinif: 'ders-inceleme' }, metinler.map((m, i) => el('li', { 'data-durum': sonuc.hatirlanan[i] ? 'evet' : 'hayir' },
      el('span', { sinif: 'ders-inceleme__isaret', 'aria-hidden': 'true', metin: sonuc.hatirlanan[i] ? '✓' : '–' }),
      m, el('span', { sinif: 'ekran-okuyucu', metin: sonuc.hatirlanan[i] ? ' (hatırladın)' : ' (bu kez gelmedi)' }))));
  }

  // ---------- Akış ----------
  function giris() {
    Object.assign(durum, { basladi: false, bitti: false, once: null, sonra: null });
    const konu = o.konu ?? (liste ? 'kelime' : 'kelime çifti');
    goster(0, 'Önce kendi yolunla dene',
      el('p', { metin: `Ekranda ${n} ${konu} göreceksin. ${sureMetni(o.calismaSn)} boyunca, nasıl istersen öyle aklında tutmaya çalış.` }),
      el('p', { metin: 'Sonra kısa bir ara ve hatırlama var. Dersin sonunda tekniği kullanarak yeni bir listeyle aynısını yapacak, iki sonucu karşılaştıracaksın.' }),
      el('p', { sinif: 'soluk', metin: 'Bu bir sınav değil; yalnızca başlangıç noktanı gösterir.' }),
      el('div', { sinif: 'ders-eylemler' }, dugme('Listeyi göster', onDeneme, 'birincil')));
  }

  async function onDeneme() {
    durum.basladi = true;
    durum.baslangic = Date.now();
    await calisma({ adim: 0, baslik: 'Aklında tut', parca: o.once, sureSn: o.calismaSn, kesin: true, dugmeMetni: 'Hazırım' });
    await ara(0);
    if (kapandi) return;
    durum.once = await hatirla(0, o.once);
    if (kapandi) return;
    goster(0, 'Başlangıç noktan',
      el('p', { sinif: 'ders-buyuk-sonuc', metin: `${durum.once.toplam} öğeden ${durum.once.dogru} tanesini hatırladın.` }),
      inceleme(o.once, durum.once),
      el('p', { metin: 'Şimdi bir teknik öğrenip yeni bir listeyle yeniden deneyeceksin.' }),
      el('div', { sinif: 'ders-eylemler' }, dugme('Tekniği öğren', anlat, 'birincil')));
  }

  function anlat() {
    const a = ders.anlat;
    goster(1, a.baslik ?? 'Teknik nedir?',
      a.paragraflar.map((p) => el('p', { metin: p })),
      a.ornek && el('div', { sinif: 'ders-ornek' },
        el('p', { sinif: 'ders-ornek__baslik', metin: a.ornek.baslik }),
        el('ul', {}, a.ornek.satirlar.map((s) => el('li', { metin: s })))),
      a.not && el('p', { sinif: 'soluk', metin: a.not }),
      el('div', { sinif: 'ders-eylemler' }, dugme('Birlikte yapalım', birlikte, 'birincil')));
  }

  function birlikte() {
    const b = ders.birlikte;
    const adimlar = el('ol', { sinif: 'ders-birlikte', 'aria-live': 'polite', 'aria-relevant': 'additions' });
    let i = 0;
    const kontrol = kontrolBolumu(b.kontrol);
    kontrol.kok.hidden = true;
    const sonraki = dugme('Sonraki adım', () => ekle(true), 'ikincil');
    function ekle(odakKoru) {
      const a = b.adimlar[i++];
      adimlar.append(el('li', {}, el('p', { metin: a.metin }), a.sahne && el('p', { sinif: 'ders-sahne', metin: a.sahne })));
      if (i >= b.adimlar.length) {
        sonraki.hidden = true;
        kontrol.kok.hidden = false;
        if (odakKoru) kontrol.odakla(); // gizlenen düğmedeki odak kaybolmasın
      }
    }
    goster(2, 'Birlikte yapalım', el('p', { metin: b.yonerge }), adimlar,
      el('div', { sinif: 'ders-eylemler' }, sonraki), kontrol.kok);
    ekle(false);
  }

  // Tek soruluk kontrol: yanlışta açıklama ve doğru cevap gösterilir; her durumda devam edilebilir
  function kontrolBolumu(k) {
    const ad = 'ders-kontrol';
    const secenekler = k.secenekler.map((s, i) => el('label', { sinif: 'secim ders-secenek' },
      el('input', { type: 'radio', name: ad, value: String(i) }), el('span', { metin: s })));
    const legend = el('legend', { metin: k.soru });
    const geriBildirim = el('div', { 'aria-live': 'polite' });
    const devam = dugme('Kendin dene', kendin, 'birincil');
    devam.hidden = true;
    const denetle = dugme('Kontrol et', () => {
      const secili = kok.querySelector(`input[name="${ad}"]:checked`);
      if (!secili) { geriBildirim.replaceChildren(el('p', { sinif: 'alan__ipucu', metin: 'Önce bir seçenek işaretle.' })); return; }
      const dogru = Number(secili.value) === k.dogru;
      if (dogru) sesCal('dogru');
      geriBildirim.replaceChildren(el('div', { sinif: `bildirim ${dogru ? 'bildirim--basari' : 'bildirim--uyari'}` },
        el('p', {}, el('strong', { metin: dogru ? 'Doğru! ' : `Henüz değil. Doğru cevap: ${k.secenekler[k.dogru]}. ` }), k.aciklama)));
      devam.hidden = false;
    }, 'ikincil');
    const kok = el('div', { sinif: 'ders-kontrol yigin' },
      el('fieldset', { sinif: 'grup' }, legend, secenekler),
      el('div', { sinif: 'ders-eylemler' }, denetle, devam), geriBildirim);
    return { kok, odakla: () => odakla(legend) };
  }

  function kendin() {
    const k = ders.kendin;
    const parca = o.sonra;
    const ogeMetinleri = liste ? parca.ogeler : parca.esler.map((e) => `${esMetni(e)} = ${e.cevap[0]}`);
    let yazma;
    let listeGoster = true;
    if (k.tur === 'metin') {
      const id = 'ders-kendin-metin';
      yazma = el('div', { sinif: 'alan' },
        el('label', { sinif: 'alan__etiket', for: id, metin: k.etiket ?? 'Tekniğini buraya yazabilirsin (isteğe bağlı)' }),
        el('textarea', { sinif: 'girdi', id, rows: '5', placeholder: k.yerTutucu, autocomplete: 'off' }));
    } else {
      // Satır adları: etiketler (ogeyleEsle ise "durak → öğe") ya da doğrudan ölçüm öğeleri
      const etiketler = k.etiketler
        ? k.etiketler.map((e, i) => (k.ogeyleEsle ? `${e} → ${parca.ogeler[i]}` : e))
        : ogeMetinleri;
      listeGoster = !!k.etiketler && !k.ogeyleEsle;
      yazma = el('div', { sinif: 'ders-satirlar' }, etiketler.map((e, i) => {
        const id = `ders-kendin-${i}`;
        return el('div', { sinif: 'alan' },
          el('label', { sinif: 'alan__etiket', for: id, metin: e }),
          el('input', { sinif: 'girdi', id, type: 'text', placeholder: k.yerTutucu, autocomplete: 'off' }),
          k.satirIpuclari?.[i] && el('details', { sinif: 'ders-ipucu' }, el('summary', { metin: 'İpucu' }), el('p', { metin: k.satirIpuclari[i] })));
      }));
    }
    durum.kendinBaslangic = Date.now();
    calisma({
      adim: 3, baslik: 'Kendin dene', aciklama: k.yonerge,
      ust: k.ipuclari.length ? [el('ul', { sinif: 'ders-ipuclari' }, k.ipuclari.map((p) => el('li', { metin: p })))] : [],
      parca: listeGoster ? parca : null, sureSn: k.onerilenSn, kesin: false,
      alt: [yazma, el('p', { sinif: 'alan__ipucu', metin: 'Yazdıkların kaydedilmez; yalnızca bu ekranda durur.' })],
      dugmeMetni: 'Hazırım, listeyi gizle',
    }).then(olc);
  }

  async function olc() {
    if (kapandi) return;
    durum.kendinSn = Math.round((Date.now() - durum.kendinBaslangic) / 1000);
    await ara(4);
    if (kapandi) return;
    durum.sonra = await hatirla(4, o.sonra);
    if (kapandi) return;
    durum.bitti = true;
    sonuc();
  }

  function sonuc() {
    const onceki = dersGecmisi(ders.ad); // bu deneme eklenmeden önce
    const k = karsilastir(durum.once, durum.sonra);
    const sureSn = Math.round((Date.now() - durum.baslangic) / 1000);
    const { kaydedildi, hata } = kayitEkle({
      modul: DERS_MODUL, egzersiz: dersEgzersizAdi(ders.ad), sureSn, zorluk: 1,
      dogru: k.sonra, yanlis: k.toplam - k.sonra,
      ekstra: { tur: o.tur, once: k.once, sonra: k.sonra, toplam: k.toplam, fark: k.fark,
        onceSira: durum.once.sira, sonraSira: durum.sonra.sira, kendinSn: durum.kendinSn },
    });
    const enIyi = onceki.reduce((m, r) => Math.max(m, r.dogru ?? 0), 0);
    const cubuk = (ad, d, y, tur) => el('div', { sinif: 'ders-cubuk' },
      el('div', { sinif: 'ilerleme-etiket' }, el('span', { metin: ad }), el('span', { metin: `${d} / ${k.toplam} (${yuzdeBicimle(y)})` })),
      el('div', { sinif: `ilerleme${tur ? ` ${tur}` : ''}`, 'aria-hidden': 'true' }, el('span', { sinif: 'ilerleme__dolgu', style: `--deger: ${y}%` })));
    goster(4, 'Öncesi ve sonrası',
      el('div', { sinif: 'ders-karsilastirma' },
        cubuk('Önce (kendi yolunla)', k.once, k.onceYuzde),
        cubuk('Sonra (teknikle)', k.sonra, k.sonraYuzde, 'ilerleme--basari')),
      el('p', { sinif: 'ders-buyuk-sonuc', metin: karsilastirmaMesaji(k) }),
      o.siraOnemli && el('p', { metin: `Doğru sırada yazdıkların: önce ${durum.once.sira}, sonra ${durum.sonra.sira}.` }),
      el('p', { sinif: 'soluk', metin: `Ders yaklaşık ${sureMetni(sureSn)} sürdü.` }),
      onceki.length > 0 && el('p', { sinif: 'soluk', metin: `Bu dersi daha önce ${onceki.length} kez yaptın; en iyi “sonra” sonucun ${enIyi} / ${k.toplam} idi.` }),
      !kaydedildi && el('p', { sinif: 'alan__hata', metin: hata === 'profil' ? 'Profil seçili olmadığı için sonuç kaydedilmedi.' : 'Sonuç bu kez kaydedilemedi.' }),
      el('h3', { metin: 'İkinci listede hatırladıkların' }),
      inceleme(o.sonra, durum.sonra),
      ders.kapanis && el('div', { sinif: 'ders-ornek' }, el('p', { metin: ders.kapanis })),
      el('p', { sinif: 'alan__ipucu', metin: DURUSTLUK }),
      el('div', { sinif: 'ders-eylemler' },
        el('a', { sinif: 'btn btn--birincil', href: geriAdres, metin: 'Tüm dersler' }),
        dugme('Dersi yeniden yap', giris, 'ikincil')));
    duyur(`Önce ${k.once}, sonra ${k.sonra}. ${karsilastirmaMesaji(k)}`);
  }

  giris();
  return {
    kapat() {
      kapandi = true;
      sayaclar.forEach((id) => clearInterval(id));
      sayaclar.clear();
    },
  };
}
