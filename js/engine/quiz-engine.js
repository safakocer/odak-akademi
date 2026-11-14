// Anlama ve soru motoru: soru şeması ve denetimi, 5 soru tipinin puanlaması, soru oturumu ekranı, katman özeti (S35b: kademeli soru yolculuğu bilgi → çıkarım → yorum, zor katmandaki doğrular kazanım) ve açıklamalı gözden geçirme
import { el } from '../core/ui.js';
import { duyur, odakla } from '../core/a11y.js';
import { sesCal } from '../core/sound.js';
import { trKucuk, boslukTemizle, sayiBicimle } from '../core/utils.js';
import { metniGrupla, okumaAlaniOlustur } from './reader-engine.js';

/* ================= SORU ŞEMASI =================
 * Ortak: { kimlik, tip, katman: 'bilgi'|'cikarim'|'yorum', soru, aciklama }
 *   coktan-secmeli  secenekler: [metin, ...] (2-5), dogru: doğru seçeneğin sırası (0'dan)
 *   dogru-yanlis    dogru: true | false   (soru bir yargı cümlesidir)
 *   bosluk          soru içinde tek "___", cevaplar: [kabul edilen yazımlar] (büyük/küçük harf, noktalama, şapka fark etmez)
 *   siralama        ogeler: [doğru sırayla metinler] (2-6; ekranda karışık gelir)
 *   kisa-cevap      ornekCevap, kontrolListesi?: [madde]  → öğrenci örnekle karşılaştırıp kendini değerlendirir
 * Puan her soru için 0-1: tam 1, kısmen 0,5 (sıralamada tek yer değişikliği, kısa cevapta "kısmen"), yanlış 0.
 * ============================================== */

export const SORU_TIPLERI = Object.freeze(['coktan-secmeli', 'dogru-yanlis', 'bosluk', 'siralama', 'kisa-cevap']);
export const ANLAMA_ESIGI = 70; // %: altındaysa hız artırılmaz, anlama önerilir
export const KATMANLAR = Object.freeze({
  bilgi: Object.freeze({ etiket: 'Bilgi', aciklama: 'Metinde açıkça yazanı bulma',
    oneri: 'Okurken kim, ne, nerede, ne zaman sorularını aklında tut; her paragraftan sonra bir an durup ne okuduğunu kendine söyle.' }),
  cikarim: Object.freeze({ etiket: 'Çıkarım', aciklama: 'Metnin açıkça söylemediğini ipuçlarından bulma',
    oneri: 'Olayların nedenlerini düşün: “Bu neden oldu?”, “Kişi bunu neden söyledi?” diye sorup metindeki ipucunu ara.' }),
  yorum: Object.freeze({ etiket: 'Yorum', aciklama: 'Metindeki fikri kendi düşüncenle ilişkilendirme',
    oneri: 'Metnin ana fikrini bir cümleyle söylemeyi ve “Ben olsam ne yapardım?” diye düşünmeyi dene.' }),
});
export const BOSLUK = '___'; // boşluk doldurma sorusundaki boşluk işareti (text-bank.js de kullanır)
const OZ_SECENEKLERI = Object.freeze([
  { deger: 1, etiket: 'Cevabım örnekteki ana fikri içeriyor' },
  { deger: 0.5, etiket: 'Kısmen içeriyor' },
  { deger: 0, etiket: 'Henüz içermiyor' },
]);

// Yargılamayan geri bildirim cümleleri (art arda aynısı gelmez)
export const GERI_BILDIRIMLER = Object.freeze({
  dogru: Object.freeze([
    'Doğru! Metni dikkatle okuduğun belli.',
    'Evet, tam olarak bu.',
    'Harika, ipucunu yakaladın.',
    'Doğru cevap. Böyle devam.',
    'Güzel! Soruyu metinle iyi bağladın.',
    'Doğru. Okuduğunu aklında iyi tutmuşsun.',
  ]),
  yanlis: Object.freeze([
    'Bu sefer olmadı; doğru cevabı birlikte görelim.',
    'Henüz değil. Bu tür sorular pratikle kolaylaşır.',
    'Yakındın! Metindeki ipucuna bir daha bakmak işe yarar.',
    'Sorun değil; yanlışlar neyi yeniden okuyacağımızı gösterir.',
    'Bu soru biraz zordu. Açıklamayı okuyunca netleşecek.',
    'Bu kez başka bir cevap doğruydu. Bir sonraki soruda yeniden dene.',
    'Henüz oturmadı; okurken kendine “Bu neden oldu?” diye sorabilirsin.',
    'Herkes bazen kaçırır. Önemli olan ipucunu fark etmeyi öğrenmek.',
    'Bu sefer tutmadı. Doğru cevaba bakıp nedenini düşünelim.',
    'İyi bir deneme. Metindeki anahtar kelimeleri izlemek yardımcı olur.',
    'Bu bilgi metinde biraz saklıydı; bir sonraki okumada yakalayabilirsin.',
    'Şimdilik olmadı; gözden geçirme bölümünde açıklamasını bulacaksın.',
  ]),
  kismen: Object.freeze([
    'Kısmen doğru; bir adım kaldı.',
    'Yolun yarısındasın; eksik parçaya birlikte bakalım.',
    'Güzel bir başlangıç. Tamamlamak için açıklamaya göz at.',
    'Kendini dürüstçe değerlendirdin; bu da önemli bir beceri.',
  ]),
});
const sonSecilen = {};

/** tur: 'dogru' | 'yanlis' | 'kismen' → cümle (bir önceki cümle tekrarlanmaz) */
export function geriBildirimSec(tur) {
  const liste = GERI_BILDIRIMLER[tur] ?? GERI_BILDIRIMLER.yanlis;
  let i = Math.floor(Math.random() * liste.length);
  if (liste.length > 1 && i === sonSecilen[tur]) i = (i + 1) % liste.length;
  sonSecilen[tur] = i;
  return liste[i];
}

const puanTuru = (p) => (p >= 1 ? 'dogru' : p > 0 ? 'kismen' : 'yanlis');
const metinMi = (v) => typeof v === 'string' && v.trim() !== '';
const dugumler = (...d) => d.filter((x) => x != null && x !== false); // replaceChildren boş değerleri metin olarak yazmasın
// S25: işaretlemede renk ve kenar çizgisine ek olarak ekran okuyucu notu (yalnız renge dayanmaz)
const okuyucuNotu = (metin) => el('span', { sinif: 'ekran-okuyucu', metin });
const SONUC_ETIKETI = Object.freeze({ dogru: 'doğru', kismen: 'kısmen doğru', yanlis: 'henüz doğru değil' });

// ---------- Şema denetimi ----------
/** Soruyu denetler; hatalıysa TypeError atar. Döner: dondurulmuş kopya */
export function soruDenetle(s) {
  const hata = (m) => { throw new TypeError(`Soru "${s?.kimlik ?? '?'}": ${m}`); };
  if (!s || typeof s !== 'object' || !metinMi(s.kimlik)) hata('kimlik eksik.');
  if (!SORU_TIPLERI.includes(s.tip)) hata(`tip şunlardan biri olmalı: ${SORU_TIPLERI.join(', ')}.`);
  if (!Object.hasOwn(KATMANLAR, s.katman)) hata('katman bilgi, cikarim ya da yorum olmalı.');
  if (!metinMi(s.soru)) hata('soru metni eksik.');
  if (!metinMi(s.aciklama)) hata('aciklama eksik.');
  const k = { ...s };
  if (s.tip === 'coktan-secmeli') {
    if (!Array.isArray(s.secenekler) || s.secenekler.length < 2 || s.secenekler.length > 5 || !s.secenekler.every(metinMi)) hata('2-5 seçenek gerekli.');
    if (!Number.isInteger(s.dogru) || s.dogru < 0 || s.dogru >= s.secenekler.length) hata('dogru, seçenek sırası olmalı.');
    k.secenekler = Object.freeze([...s.secenekler]);
  } else if (s.tip === 'dogru-yanlis') {
    if (typeof s.dogru !== 'boolean') hata('dogru true ya da false olmalı.');
  } else if (s.tip === 'bosluk') {
    if (s.soru.split(BOSLUK).length !== 2) hata(`soru içinde tam bir "${BOSLUK}" olmalı.`);
    if (!Array.isArray(s.cevaplar) || !s.cevaplar.length || !s.cevaplar.every(metinMi)) hata('en az bir kabul edilen cevap gerekli.');
    k.cevaplar = Object.freeze([...s.cevaplar]);
  } else if (s.tip === 'siralama') {
    if (!Array.isArray(s.ogeler) || s.ogeler.length < 2 || s.ogeler.length > 6 || !s.ogeler.every(metinMi)) hata('2-6 öğe gerekli.');
    k.ogeler = Object.freeze([...s.ogeler]);
  } else if (s.tip === 'kisa-cevap') {
    if (!metinMi(s.ornekCevap)) hata('ornekCevap eksik.');
    k.kontrolListesi = Object.freeze((s.kontrolListesi ?? []).filter(metinMi));
  }
  return Object.freeze(k);
}

export function sorulariDenetle(liste) {
  if (!Array.isArray(liste) || !liste.length) throw new TypeError('En az bir soru gerekli.');
  const kimlikler = new Set();
  return Object.freeze(liste.map((s) => {
    const d = soruDenetle(s);
    if (kimlikler.has(d.kimlik)) throw new TypeError(`Aynı soru kimliği iki kez var: ${d.kimlik}`);
    kimlikler.add(d.kimlik);
    return d;
  }));
}

// ---------- Puanlama ----------
// Boşluk cevabı: tr-TR küçük harf, şapkasız ve Türkçe harfler harfsiz (ı→i, ş→s …), noktalamasız, tek boşluklu.
// Rakamlar arasındaki virgül/nokta korunur ve virgüle çevrilir: “23,5” ≠ “235”, “2.5” = “2,5”. Anlama ölçülür, yazım değil.
const HARFSIZ = { â: 'a', î: 'i', û: 'u', ı: 'i', ğ: 'g', ü: 'u', ş: 's', ö: 'o', ç: 'c' };
const ONDALIK = '\u0000'; // geçici işaret: noktalama silinirken ondalık ayırıcı korunsun
export const cevapBicimle = (s) => trKucuk(boslukTemizle(s))
  .replace(/[âîûığüşöç]/g, (h) => HARFSIZ[h])
  .replace(/(\p{N})[.,](?=\p{N})/gu, `$1${ONDALIK}`)
  .replace(/[^\p{L}\p{N}\s\u0000]/gu, '')
  .replaceAll(ONDALIK, ',')
  .replace(/\s+/g, ' ').trim();

/**
 * Cevabı 0-1 arasında puanlar. Cevap biçimi: çoktan → seçenek sırası; doğru/yanlış → true|false; boşluk → metin;
 * sıralama → ekranda dizilen öğelerin asıl sıraları [2,0,1...]; kısa cevap → { metin, oz: 0|0.5|1 }
 */
export function cevapPuanla(soru, cevap) {
  switch (soru.tip) {
    case 'coktan-secmeli':
    case 'dogru-yanlis':
      return cevap === soru.dogru ? 1 : 0;
    case 'bosluk': {
      const c = cevapBicimle(cevap);
      return c && soru.cevaplar.some((d) => cevapBicimle(d) === c) ? 1 : 0;
    }
    case 'siralama': {
      if (!Array.isArray(cevap)) return 0;
      const yanlisYer = cevap.filter((v, i) => v !== i).length;
      return yanlisYer === 0 ? 1 : yanlisYer === 2 && soru.ogeler.length > 2 ? 0.5 : 0; // tek yer değişikliği: kısmen
    }
    case 'kisa-cevap':
      return [0, 0.5, 1].includes(cevap?.oz) ? cevap.oz : 0;
    default:
      return 0;
  }
}

/** sonuclar: [{ soru, cevap, puan }] → { yuzde, puan, soruSayisi, dogruSayisi, katmanlar: { bilgi: { puan, soru, yuzde, dogru (S35b: tam puanlı soru) } ... } } */
export function anlamaHesapla(sonuclar) {
  const katmanlar = {};
  let toplam = 0;
  for (const r of sonuclar) {
    toplam += r.puan;
    const k = (katmanlar[r.soru.katman] ??= { puan: 0, soru: 0, yuzde: 0, dogru: 0 });
    k.puan += r.puan;
    k.soru += 1;
    if (r.puan >= 1) k.dogru += 1;
  }
  for (const k of Object.values(katmanlar)) k.yuzde = Math.round((k.puan * 100) / k.soru);
  const n = sonuclar.length;
  return {
    yuzde: n ? Math.round((toplam * 100) / n) : 0,
    puan: toplam,
    soruSayisi: n,
    dogruSayisi: sonuclar.filter((r) => r.puan >= 1).length,
    katmanlar,
  };
}

// ---------- Cevapları metne çevirme (geri bildirim ve gözden geçirme) ----------
function siraliMetin(ogeler) { return ogeler.map((m, i) => `${i + 1}) ${m}`).join('  '); }

export function cevapMetni(soru, cevap) {
  switch (soru.tip) {
    case 'coktan-secmeli': return soru.secenekler[cevap] ?? '(boş)';
    case 'dogru-yanlis': return cevap === true ? 'Doğru' : cevap === false ? 'Yanlış' : '(boş)';
    case 'bosluk': return metinMi(cevap) ? soru.soru.replace(BOSLUK, `“${boslukTemizle(cevap)}”`) : '(boş)';
    case 'siralama': return Array.isArray(cevap) ? siraliMetin(cevap.map((i) => soru.ogeler[i])) : '(boş)';
    case 'kisa-cevap': return metinMi(cevap?.metin) ? boslukTemizle(cevap.metin) : '(boş)';
    default: return '';
  }
}

export function dogruCevapMetni(soru) {
  switch (soru.tip) {
    case 'coktan-secmeli': return soru.secenekler[soru.dogru];
    case 'dogru-yanlis': return soru.dogru ? 'Doğru' : 'Yanlış';
    case 'bosluk': return soru.soru.replace(BOSLUK, `“${soru.cevaplar[0]}”`);
    case 'siralama': return siraliMetin(soru.ogeler);
    case 'kisa-cevap': return soru.ornekCevap;
    default: return '';
  }
}

const katmanRozeti = (katman) => el('span', { sinif: 'soru-katman', 'data-katman': katman, metin: KATMANLAR[katman].etiket });

function karistir(dizi) {
  const d = [...dizi];
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

// ---------- Soru tipi görünümleri ----------
// Her biri: { govde, cevapAl() → cevap | undefined, bosMesaj, kilitle(), isaretle(cevap) } (+ kısa cevapta ornekGoster, ozAl)
function secmeliGorunum(soru, secenekler, dogruDeger) {
  const ad = `soru-${soru.kimlik}`;
  const etiketler = secenekler.map(([deger, metin]) => el('label', { sinif: 'soru__secenek', 'data-deger': String(deger) },
    el('input', { type: 'radio', name: ad, value: String(deger) }), el('span', { metin })));
  const govde = el('fieldset', { sinif: 'soru__alan' }, el('legend', { sinif: 'soru__metin', metin: soru.soru }),
    el('div', { sinif: 'soru__secenekler' }, etiketler));
  const coz = (v) => secenekler.find(([d]) => String(d) === v)?.[0];
  return {
    govde,
    bosMesaj: 'Önce bir seçenek seç.',
    cevapAl: () => coz(govde.querySelector('input:checked')?.value),
    kilitle: () => govde.querySelectorAll('input').forEach((i) => { i.disabled = true; }),
    isaretle(cevap) {
      for (const l of etiketler) {
        const d = coz(l.dataset.deger);
        if (d === dogruDeger) { l.classList.add('soru__secenek--dogru'); l.append(okuyucuNotu(' (doğru cevap)')); }
        else if (d === cevap) { l.classList.add('soru__secenek--yanlis'); l.append(okuyucuNotu(' (senin seçimin, henüz doğru değil)')); }
      }
    },
  };
}

function boslukGorunum(soru) {
  const [once, sonra] = soru.soru.split(BOSLUK);
  // En uzun kabul edilen cevap rahatça yazılabilsin (öz-sorularda cevap 120 karaktere kadar olabilir)
  const enUzun = Math.max(40, ...soru.cevaplar.map((c) => [...c].length)) + 20;
  const girdi = el('input', { type: 'text', sinif: 'soru__bosluk', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false',
    lang: 'tr', maxlength: String(enUzun), 'aria-label': `Boşluğa gelecek ifade. Cümle: ${soru.soru.replace(BOSLUK, 'boşluk')}` });
  const govde = el('fieldset', { sinif: 'soru__alan' },
    el('legend', { sinif: 'soru__metin', metin: 'Cümledeki boşluğu doldur.' }),
    el('p', { sinif: 'soru__cumle' }, once, girdi, sonra));
  return {
    govde,
    bosMesaj: 'Boşluğa bir kelime yaz.',
    cevapAl: () => (metinMi(girdi.value) ? girdi.value : undefined),
    kilitle: () => { girdi.readOnly = true; },
    isaretle(cevap) {
      const dogru = cevapPuanla(soru, cevap);
      girdi.classList.add(dogru ? 'soru__bosluk--dogru' : 'soru__bosluk--yanlis');
      girdi.setAttribute('aria-label', `${girdi.getAttribute('aria-label')}. ${dogru ? 'Doğru.' : 'Henüz doğru değil.'}`);
    },
  };
}

function siralamaGorunum(soru) {
  let sira = karistir(soru.ogeler.map((_, i) => i));
  for (let d = 0; d < 5 && sira.every((v, i) => v === i); d++) sira = karistir(sira); // hazır doğru gelmesin
  const liste = el('ol', { sinif: 'siralama' });
  let kilitli = false;

  function ciz(odakSira, yon) {
    liste.replaceChildren(...sira.map((asil, konum) => {
      const metin = soru.ogeler[asil];
      const dugme = (ad, ok, fark) => el('button', {
        type: 'button', sinif: 'btn btn--ikincil', 'aria-label': `${metin}: ${ad}`, metin: ok,
        disabled: kilitli || konum + fark < 0 || konum + fark >= sira.length,
        onclick: () => tasi(konum, fark),
      });
      return el('li', { sinif: 'siralama__oge', 'data-asil': String(asil) },
        el('span', { sinif: 'siralama__no', 'aria-hidden': 'true', metin: String(konum + 1) }),
        el('span', { sinif: 'siralama__metin', metin }),
        el('span', { sinif: 'siralama__dugmeler' }, dugme('yukarı taşı', '↑', -1), dugme('aşağı taşı', '↓', 1)));
    }));
    if (odakSira !== undefined) {
      const li = liste.children[odakSira];
      // Odak aynı yönde kalır; uca gelince diğer düğmeye geçer
      const dugmeler = li?.querySelectorAll('button') ?? [];
      const hedef = yon < 0 ? (dugmeler[0]?.disabled ? dugmeler[1] : dugmeler[0]) : (dugmeler[1]?.disabled ? dugmeler[0] : dugmeler[1]);
      hedef?.focus();
    }
  }
  function tasi(konum, fark) {
    const yeni = konum + fark;
    if (kilitli || yeni < 0 || yeni >= sira.length) return;
    [sira[konum], sira[yeni]] = [sira[yeni], sira[konum]];
    ciz(yeni, fark);
    duyur(`${soru.ogeler[sira[yeni]]}: ${yeni + 1}. sıraya taşındı.`);
  }
  ciz();
  const govde = el('fieldset', { sinif: 'soru__alan' }, el('legend', { sinif: 'soru__metin', metin: soru.soru }),
    el('p', { sinif: 'soru__not', metin: 'Okları kullanarak olayları baştan sona doğru sırala.' }), liste);
  return {
    govde,
    bosMesaj: '',
    cevapAl: () => [...sira],
    kilitle: () => { kilitli = true; ciz(); },
    isaretle: () => [...liste.children].forEach((li, i) => {
      const dogru = Number(li.dataset.asil) === i;
      li.classList.add(dogru ? 'siralama__oge--dogru' : 'siralama__oge--yanlis');
      li.querySelector('.siralama__metin')?.append(okuyucuNotu(dogru ? ' (doğru sırada)' : ' (sırası farklı)'));
    }),
  };
}

function kisaCevapGorunum(soru) {
  const id = `soru-${soru.kimlik}-cevap`;
  const alan = el('textarea', { id, sinif: 'soru__yazi', rows: '4', maxlength: '600', lang: 'tr' });
  const ad = `soru-${soru.kimlik}-oz`;
  const ozGrubu = el('fieldset', { sinif: 'soru__alan soru__oz', hidden: true },
    el('legend', { sinif: 'soru__alt-baslik', metin: 'Cevabını örnekle karşılaştır:' }),
    el('div', { sinif: 'soru__secenekler' }, OZ_SECENEKLERI.map((o) => el('label', { sinif: 'soru__secenek' },
      el('input', { type: 'radio', name: ad, value: String(o.deger) }), el('span', { metin: o.etiket })))));
  const ornekBaslik = el('h4', { sinif: 'soru__alt-baslik', metin: 'Örnek cevap' });
  const ornek = el('div', { sinif: 'soru__ornek', hidden: true }, ornekBaslik,
    el('p', { metin: soru.ornekCevap }),
    soru.kontrolListesi.length > 0 && el('p', { sinif: 'soru__not', metin: 'İyi bir cevapta şunlar olabilir:' }),
    soru.kontrolListesi.length > 0 && el('ul', { sinif: 'soru__kontrol' }, soru.kontrolListesi.map((m) => el('li', { metin: m }))));
  const govde = el('div', { sinif: 'soru__kisa' },
    el('fieldset', { sinif: 'soru__alan' }, el('legend', { sinif: 'soru__metin', metin: soru.soru }),
      el('label', { for: id, sinif: 'soru__not', metin: 'Cevabın (birkaç cümle yeterli):' }), alan),
    ornek, ozGrubu);
  return {
    govde,
    bosMesaj: 'Önce kısa bir cevap yaz; sonra örnekle karşılaştıracaksın.',
    cevapAl: () => (metinMi(alan.value) ? { metin: alan.value } : undefined),
    ornekGoster() { alan.readOnly = true; ornek.hidden = false; ozGrubu.hidden = false; odakla(ornekBaslik); },
    ozBosMesaj: 'Cevabını değerlendirmek için üç seçenekten birini seç.',
    ozAl: () => { const v = ozGrubu.querySelector('input:checked')?.value; return v === undefined ? undefined : Number(v); },
    kilitle: () => ozGrubu.querySelectorAll('input').forEach((i) => { i.disabled = true; }),
    isaretle: () => {},
  };
}

function gorunumOlustur(soru) {
  switch (soru.tip) {
    case 'coktan-secmeli': return secmeliGorunum(soru, soru.secenekler.map((m, i) => [i, m]), soru.dogru);
    case 'dogru-yanlis': return secmeliGorunum(soru, [[true, 'Doğru'], [false, 'Yanlış']], soru.dogru);
    case 'bosluk': return boslukGorunum(soru);
    case 'siralama': return siralamaGorunum(soru);
    default: return kisaCevapGorunum(soru);
  }
}

// ---------- Soru oturumu ----------
/**
 * Soruları tek tek gösterir; her cevaptan sonra kısa geri bildirim verir.
 * secenekler: { sorular, metin?, ayar? (okuma görünümü), metinGorunur? (vars. false: sorularda metin görünmez),
 *               giris? (vars. true: "Sorulara geç" kartı), aktifMi?(), bitince(sonuc) }
 * sonuc: { sorular: [{ soru, cevap, puan }], anlama: anlamaHesapla(...), metinGorunur, metneBakis }
 * Döner: { kok, iptal() }
 */
export function soruOturumuKur(kap, { sorular, metin = '', ayar, metinGorunur = false, giris = true, aktifMi = () => true, bitince } = {}) {
  const liste = sorulariDenetle(sorular);
  const kok = el('section', { sinif: 'soru-oturum', 'aria-labelledby': 'soru-oturum-baslik' });
  const sonuclar = [];
  let metneBakis = 0;
  let bitti = false;
  kap.append(kok);

  // Metne yeniden bakma (ayar açıksa): kapalı katlanır bölüm; açılış sayısı kayda yazılır
  const metinBolumu = () => {
    if (!metinGorunur || !metinMi(metin)) return null;
    const d = el('details', { sinif: 'soru-metin' }, el('summary', { metin: 'Metne yeniden bak' }),
      okumaAlaniOlustur(metniGrupla(metin, ayar ?? {}), { ayar, etiket: 'Okunan metin' }).kok);
    d.addEventListener('toggle', () => { if (d.open) metneBakis += 1; });
    return d;
  };

  function girisGoster() {
    const baslik = el('h3', { id: 'soru-oturum-baslik', sinif: 'soru-oturum__baslik', metin: 'Okuman bitti' });
    kok.replaceChildren(baslik,
      el('p', { metin: `Şimdi metinle ilgili ${liste.length} soru var. Acele etme; her cevaptan sonra kısa bir geri bildirim göreceksin.` }),
      el('p', { metin: metinGorunur
        ? 'Gerekirse “Metne yeniden bak” bölümünü açabilirsin.'
        : 'Sorular sırasında metin görünmeyecek; aklında kalanlarla yanıtla.' }),
      el('button', { type: 'button', sinif: 'btn btn--birincil btn--buyuk btn--blok', metin: 'Sorulara geç',
        onclick: () => { if (aktifMi()) soruGoster(0); } }));
    odakla(baslik);
  }

  function soruGoster(i) {
    const soru = liste[i];
    const g = gorunumOlustur(soru);
    let asama = 'cevap'; // cevap | oz (kısa cevap) | bitti
    let cevap;
    const baslik = el('h3', { id: 'soru-oturum-baslik', sinif: 'soru-oturum__baslik', metin: `Soru ${i + 1} / ${liste.length}` });
    const dolgu = el('span', { sinif: 'ilerleme__dolgu' });
    dolgu.style.setProperty('--deger', `${(i * 100) / liste.length}%`);
    const hata = el('p', { sinif: 'soru__hata', role: 'alert', hidden: true });
    const geri = el('div', { sinif: 'soru__geri', role: 'status', hidden: true });
    const dugme = el('button', { type: 'submit', sinif: 'btn btn--birincil btn--buyuk btn--blok',
      metin: soru.tip === 'kisa-cevap' ? 'Örnek cevapla karşılaştır' : 'Kontrol et' });
    const form = el('form', { sinif: 'soru', 'data-tip': soru.tip, novalidate: true }, g.govde, hata, geri, dugme);

    const hataGoster = (m) => { hata.textContent = m; hata.hidden = !m; };
    function sonucla(puan) {
      sonuclar[i] = { soru, cevap, puan };
      g.kilitle();
      g.isaretle(cevap);
      const tur = puanTuru(puan);
      const cumle = soru.tip !== 'kisa-cevap' || tur === 'kismen' ? geriBildirimSec(tur)
        : puan >= 1 ? 'Güzel! Cevabını örnekle karşılaştırıp değerlendirdin.'
          : 'Dürüst değerlendirmen için teşekkürler. Örnekteki fikri bir dahaki sefere kendi cümlelerinle dene.';
      geri.dataset.sonuc = tur;
      geri.replaceChildren(...dugumler(el('p', { sinif: 'soru__geri-cumle', metin: cumle }),
        puan < 1 && soru.tip !== 'kisa-cevap' && el('p', {}, el('strong', { metin: 'Doğru cevap: ' }), dogruCevapMetni(soru))));
      geri.hidden = false;
      sesCal(soru.tip === 'kisa-cevap' ? 'tik' : tur === 'dogru' ? 'dogru' : 'yanlis');
      asama = 'bitti';
      dugme.textContent = i + 1 < liste.length ? 'Sonraki soru' : 'Sonuçları gör';
      dugme.focus();
    }

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (bitti || !aktifMi()) return;
      if (asama === 'bitti') { i + 1 < liste.length ? soruGoster(i + 1) : bitir(); return; }
      if (asama === 'oz') {
        const oz = g.ozAl();
        if (oz === undefined) { hataGoster(g.ozBosMesaj); return; }
        hataGoster('');
        cevap = { ...cevap, oz };
        sonucla(cevapPuanla(soru, cevap));
        return;
      }
      const c = g.cevapAl();
      if (c === undefined) { hataGoster(g.bosMesaj); return; }
      hataGoster('');
      cevap = c;
      if (soru.tip === 'kisa-cevap') {
        asama = 'oz';
        dugme.textContent = 'Değerlendirmemi kaydet';
        g.ornekGoster();
        return;
      }
      sonucla(cevapPuanla(soru, cevap));
    });

    kok.replaceChildren(...dugumler(
      el('div', { sinif: 'soru-oturum__ust' }, baslik, katmanRozeti(soru.katman)),
      el('div', { sinif: 'ilerleme ilerleme--ince', 'aria-hidden': 'true' }, dolgu),
      metinBolumu(),
      form));
    odakla(baslik);
  }

  function bitir() {
    if (bitti) return;
    bitti = true;
    const sonuc = { sorular: sonuclar.slice(), anlama: anlamaHesapla(sonuclar), metinGorunur, metneBakis };
    try { bitince?.(sonuc); } catch (h) { console.error('[soru-motoru]', h); }
  }

  if (giris) girisGoster(); else soruGoster(0);
  return { kok, iptal() { bitti = true; kok.remove(); } };
}

// ---------- Sonuç ekranı parçaları ----------
/** S35b: Soru yolculuğunun basamakları (kolaydan zora) ve zor basamaklar: buradaki her tam doğru “kazanım” olarak gösterilir (zorluk düşürülmez) */
export const KATMAN_YOLU = Object.freeze(['bilgi', 'cikarim', 'yorum']);
export const ZOR_KATMANLAR = Object.freeze(['cikarim', 'yorum']);
const KAZANIM_METNI = Object.freeze({
  cikarim: 'metnin açıkça söylemediğini ipuçlarından buldun',
  yorum: 'metindeki fikri kendi düşüncenle ilişkilendirdin',
});
/** S35b: Zor katmanlardaki tam doğrular: [{ katman, dogru, soru }] (doğrusu olmayan katman yok) */
export function zorKatmanKazanimlari(anlama) {
  return ZOR_KATMANLAR.map((k) => ({ katman: k, ...anlama?.katmanlar?.[k] }))
    .filter((x) => x.soru > 0 && (x.dogru ?? Math.floor(x.puan ?? 0)) > 0)
    .map((x) => ({ katman: x.katman, dogru: x.dogru ?? Math.floor(x.puan), soru: x.soru }));
}

/** Katman özeti, S35b’den beri kademeli soru yolculuğu: bilgi → çıkarım → yorum basamakları, doğru sayıları, zor basamakta kazanım (anlama: anlamaHesapla çıktısı) */
export function katmanOzetiOlustur(anlama) {
  const anahtarlar = KATMAN_YOLU.filter((k) => anlama.katmanlar[k]);
  const zayif = anahtarlar.filter((k) => anlama.katmanlar[k].yuzde < ANLAMA_ESIGI);
  const kazanimlar = zorKatmanKazanimlari(anlama);
  const adim = (k, i) => {
    const d = anlama.katmanlar[k];
    const dogru = d.dogru ?? Math.floor(d.puan);
    const guclu = d.yuzde >= ANLAMA_ESIGI;
    const kazanim = kazanimlar.find((x) => x.katman === k);
    const dolgu = el('span', { sinif: 'ilerleme__dolgu' });
    dolgu.style.setProperty('--deger', `${d.yuzde}%`);
    return el('li', { sinif: 'soru-yol__adim anlama-katman', 'data-katman': k, 'data-guclu': String(guclu), 'data-kazanim': String(!!kazanim) },
      el('span', { sinif: 'soru-yol__no', 'aria-hidden': 'true', metin: String(i + 1) }),
      el('div', { sinif: 'soru-yol__govde' },
        el('div', { sinif: 'anlama-katman__ust' }, katmanRozeti(k),
          el('span', { metin: `${dogru}/${d.soru} doğru · %${d.yuzde} · ${guclu ? 'güçlü yön' : 'bir sonraki hedef'}` })),
        el('div', { sinif: 'ilerleme ilerleme--ince', 'aria-hidden': 'true' }, dolgu),
        el('small', { metin: `${i + 1}. basamak: ${KATMANLAR[k].aciklama} (${sayiBicimle(d.puan, 1)} / ${d.soru} puan)` }),
        kazanim && el('p', { sinif: 'soru-yol__kazanim' },
          el('span', { sinif: 'soru-yol__yildiz', 'aria-hidden': 'true', metin: '★' }),
          el('strong', { metin: 'Kazanım: ' }),
          `${KATMANLAR[k].etiket} sorularında ${kazanim.dogru} doğru; ${KAZANIM_METNI[k]}.`)));
  };
  return el('section', { sinif: 'anlama-katmanlar soru-yol', 'aria-labelledby': 'anlama-katman-baslik' },
    el('h4', { id: 'anlama-katman-baslik', metin: 'Soru yolculuğun: bilgi → çıkarım → yorum' }),
    el('p', { sinif: 'soru-yol__giris', metin: 'Sorular kolaydan zora üç basamaktır. Zor basamaklardaki her doğru ayrı bir kazanımdır.' }),
    el('ol', { sinif: 'soru-yol__liste' }, anahtarlar.map(adim)),
    zayif.length
      ? el('div', { sinif: 'anlama-katmanlar__oneri' }, el('p', {}, el('strong', { metin: 'Bir sonraki adım için ipucu: ' })),
        el('ul', {}, zayif.map((k) => el('li', {}, el('strong', { metin: `${KATMANLAR[k].etiket}: ` }), KATMANLAR[k].oneri))))
      : el('p', { metin: 'Üç basamakta da iyi iş çıkardın. Bir sonraki hedef: bu anlamayı farklı metinlerde de korumak.' }));
}

/** Açıklamalı gözden geçirme: yanlış ve kısmen doğru sorular (hepsi doğruysa tüm açıklamalar); düğmeyle açılır */
export function gozdenGecirmeOlustur(sonuc) {
  const eksik = sonuc.sorular.filter((r) => r.puan < 1);
  const gosterilecek = eksik.length ? eksik : sonuc.sorular;
  const id = 'soru-gozden-liste';
  const baslikId = 'soru-gozden-baslik';
  const ilkBaslik = [];
  const liste = el('ol', { sinif: 'soru-gozden__liste', id, hidden: true, 'aria-labelledby': baslikId },
    gosterilecek.map((r, n) => {
      const sira = sonuc.sorular.indexOf(r) + 1;
      const h = el('h5', { metin: `Soru ${sira}: ${SONUC_ETIKETI[puanTuru(r.puan)]}` });
      if (n === 0) ilkBaslik.push(h);
      const kisa = r.soru.tip === 'kisa-cevap';
      return el('li', { sinif: 'soru-gozden__oge', 'data-sonuc': puanTuru(r.puan) },
        el('div', { sinif: 'soru-oturum__ust' }, h, katmanRozeti(r.soru.katman)),
        el('p', { sinif: 'soru-gozden__soru', metin: r.soru.tip === 'bosluk' ? r.soru.soru.replace(BOSLUK, '……') : r.soru.soru }),
        el('p', {}, el('strong', { metin: 'Senin cevabın: ' }), cevapMetni(r.soru, r.cevap)),
        el('p', {}, el('strong', { metin: kisa ? 'Örnek cevap: ' : 'Doğru cevap: ' }), dogruCevapMetni(r.soru)),
        el('p', {}, el('strong', { metin: 'Açıklama: ' }), r.soru.aciklama),
        r.puan < 1 && el('p', { sinif: 'soru-gozden__cumle', metin: geriBildirimSec(puanTuru(r.puan)) }));
    }));
  const etiketKapali = eksik.length ? `Yanlışlarımı açıklamalarıyla gözden geçir (${eksik.length})` : 'Tüm soruların açıklamalarını oku';
  const dugme = el('button', { type: 'button', sinif: 'btn btn--ikincil btn--blok', 'aria-expanded': 'false', 'aria-controls': id, metin: etiketKapali });
  dugme.addEventListener('click', () => {
    const ac = liste.hidden;
    liste.hidden = !ac;
    dugme.setAttribute('aria-expanded', String(ac));
    dugme.textContent = ac ? 'Gözden geçirmeyi kapat' : etiketKapali;
    if (ac) odakla(ilkBaslik[0]);
  });
  return el('section', { sinif: 'soru-gozden', 'aria-labelledby': baslikId },
    el('h4', { id: baslikId, metin: 'Gözden geçirme' }),
    el('p', { metin: eksik.length
      ? 'Yanlışlar, neyi yeniden okuyacağını gösterir. Her sorunun açıklamasına bakabilirsin.'
      : 'Tüm soruları doğru yanıtladın. İstersen açıklamaları yine de okuyabilirsin.' }),
    dugme, liste);
}
