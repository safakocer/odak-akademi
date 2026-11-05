// “Kendi metnini ekle / düzenle” penceresi: başlık, yapıştırılan metin (kelime sayısı canlı), sorusuz okuma ya da en çok 5 öz-soru (çoktan seçmeli, doğru/yanlış, boşluk, sıralama, açık uçlu)
import { el, spriteIkon, modalAc, modalKapat } from '../../core/ui.js';
import { odakla, duyur } from '../../core/a11y.js';
import { sayiBicimle } from '../../core/utils.js';
import { kendiMetniKaydet, metinKelimeSayisi, KENDI_SINIR, OZ_SORU_TIPLERI } from '../../engine/text-bank.js';

const KATMAN_SECENEKLERI = Object.freeze([
  ['bilgi', 'Bilgi: cevabı metinde açıkça yazıyor'],
  ['cikarim', 'Çıkarım: cevabı ipuçlarından bulunuyor'],
  ['yorum', 'Yorum: okuyanın kendi düşüncesini soruyor'],
]);
// Soru metni alanının etiketi ve örneği türe göre değişir
const SORU_ETIKETI = Object.freeze({
  'coktan-secmeli': ['Soru', 'Örnek: Fener ışığı gemilere ne sağlar?'],
  'dogru-yanlis': ['Doğru ya da yanlış olan bir cümle', 'Örnek: Fırtına gecesi fenerin ışığı söndü.'],
  bosluk: ['Boşluklu cümle (boşluğun yerine ___ yaz)', 'Örnek: Fenerin bekçisi ___ Hanım’dı.'],
  siralama: ['Soru', 'Örnek: Olayları metindeki sıraya göre diz.'],
  'kisa-cevap': ['Soru', 'Örnek: Sen fenerin bekçisi olsaydın ne yapardın?'],
});
const HARFLER = 'ABCDE';

const hataAlani = (id) => el('p', { sinif: 'alan__hata', id, hidden: true, role: 'alert' });

/**
 * Pencereyi açar. secenekler: { metin? (düzenlenecek kendi metni), acici? (kapanınca odak), kaydedince?(metin, yeniMi) }
 * Kapanınca pencere sayfadan kaldırılır.
 */
export function metinFormuAc({ metin = null, acici = null, kaydedince } = {}) {
  const yeni = !metin;
  let degisti = false;
  let kaydedildi = false; // kaydedilince odağı çağıran sayfa yönetir
  let soruNo = 0;
  let sonSatirlar = [];

  // ----- Başlık ve metin -----
  const adGirdi = el('input', { sinif: 'girdi', id: 'mf-ad', name: 'ad', type: 'text', maxlength: String(KENDI_SINIR.baslik[1]),
    autocomplete: 'off', 'aria-describedby': 'mf-ad-ipucu mf-ad-hata', required: true });
  adGirdi.value = metin?.ad ?? '';
  const adHata = hataAlani('mf-ad-hata');
  const metinGirdi = el('textarea', { sinif: 'girdi metin-formu__metin', id: 'mf-metin', name: 'metin', rows: '9', lang: 'tr',
    maxlength: String(KENDI_SINIR.enFazlaKarakter), 'aria-describedby': 'mf-metin-sayi mf-metin-hata', required: true });
  metinGirdi.value = metin?.metin ?? '';
  const sayac = el('p', { sinif: 'alan__ipucu', id: 'mf-metin-sayi', 'aria-live': 'polite' });
  const metinHata = hataAlani('mf-metin-hata');
  const sayacYaz = () => {
    const n = metinKelimeSayisi(metinGirdi.value);
    sayac.textContent = `${sayiBicimle(n)} kelime (en az ${KENDI_SINIR.enAzKelime}). Paragrafları boş bir satırla ayırabilirsin.`;
  };

  // ----- Sorular -----
  const soruListesi = el('ol', { sinif: 'metin-formu__sorular' });
  const soruEkle = el('button', { type: 'button', sinif: 'btn btn--ikincil btn--kucuk', metin: 'Soru ekle' });
  const soruHata = hataAlani('mf-soru-hata');
  const soruAlani = el('div', { sinif: 'yigin metin-formu__soru-alani', style: '--yigin-bosluk: var(--b-3)' },
    el('p', { sinif: 'alan__ipucu', metin: 'Okurken kendine soru sormak, anlamayı güçlendiren bir stratejidir. Her soru için türünü seç; çoktan seçmeli, doğru/yanlış, boşluk doldurma, sıralama ya da açık uçlu soru yazabilirsin. Soruları birkaç gün sonra çözmek ya da bir arkadaşına çözdürmek daha öğreticidir.' }),
    soruListesi, soruHata, soruEkle);

  // Türe özel alanlar: data-alan değerleri hata odağı ve toplama için kullanılır
  function tipAlanlari(k, tip, s = {}) {
    const girdi = (alan, id, deger = '', ek = {}) => {
      const g = el('input', { sinif: 'girdi', id, type: 'text', autocomplete: 'off', 'data-alan': alan, maxlength: String(KENDI_SINIR.kisaMetin), ...ek });
      g.value = deger;
      return g;
    };
    if (tip === 'kisa-cevap') {
      const cevap = el('textarea', { sinif: 'girdi metin-formu__cevap', id: `${k}-cevap`, rows: '2', lang: 'tr', 'data-alan': 'cevap', maxlength: String(KENDI_SINIR.cevap[1]) });
      cevap.value = s.cevap ?? '';
      return el('div', { sinif: 'alan' }, el('label', { sinif: 'alan__etiket', for: `${k}-cevap`, metin: 'Benim örnek cevabım' }), cevap);
    }
    if (tip === 'coktan-secmeli') {
      const satirlar = Array.from({ length: KENDI_SINIR.secenek[1] }, (_, i) => {
        const harf = HARFLER[i];
        const secim = el('input', { type: 'radio', name: `${k}-dogru`, value: String(i), 'data-alan': 'dogru', 'aria-label': `${harf} seçeneği doğru`, checked: s.dogru === i });
        // Daire 44 px'lik bir dokunma alanının içinde
        return el('div', { sinif: 'metin-formu__secenek' }, el('label', { sinif: 'metin-formu__dogru' }, secim),
          el('label', { sinif: 'ekran-okuyucu', for: `${k}-sec-${i}`, metin: `${harf} seçeneği` }),
          girdi('secenek', `${k}-sec-${i}`, s.secenekler?.[i] ?? '', { placeholder: `${harf} seçeneği` }));
      });
      return el('fieldset', { sinif: 'grup' }, el('legend', { metin: 'Seçenekler (doğru olanın yanındaki daireyi işaretle)' }),
        el('div', { sinif: 'yigin', style: '--yigin-bosluk: var(--b-2)' }, satirlar),
        el('p', { sinif: 'alan__ipucu', metin: 'En az 2 seçeneği doldur; boş bıraktıkların gösterilmez.' }));
    }
    if (tip === 'dogru-yanlis') {
      const sec = (v, m) => el('label', { sinif: 'secim' },
        el('input', { type: 'radio', name: `${k}-dy`, value: String(v), 'data-alan': 'dogru', checked: s.dogru === v }), el('span', { metin: m }));
      return el('fieldset', { sinif: 'grup' }, el('legend', { metin: 'Bu cümle metne göre' }), sec(true, 'Doğru'), sec(false, 'Yanlış'));
    }
    if (tip === 'bosluk') {
      return el('div', { sinif: 'alan' },
        el('label', { sinif: 'alan__etiket', for: `${k}-cevap`, metin: 'Boşluğa gelecek cevap' }),
        girdi('cevap', `${k}-cevap`, (s.cevaplar ?? []).join(' / '), { 'aria-describedby': `${k}-cevap-ipucu` }),
        el('p', { sinif: 'alan__ipucu', id: `${k}-cevap-ipucu`, metin: 'Birden çok doğru yazım varsa / ile ayır (ör. 8 / sekiz). Büyük-küçük harf ve noktalama fark etmez.' }));
    }
    // siralama
    const ogeler = Array.from({ length: KENDI_SINIR.oge[1] }, (_, i) => el('div', { sinif: 'metin-formu__secenek' },
      el('label', { sinif: 'metin-formu__sira', for: `${k}-oge-${i}`, metin: `${i + 1}.` }),
      girdi('oge', `${k}-oge-${i}`, s.ogeler?.[i] ?? '')));
    return el('fieldset', { sinif: 'grup' }, el('legend', { metin: 'Öğeler (DOĞRU sırayla yaz)' }),
      el('div', { sinif: 'yigin', style: '--yigin-bosluk: var(--b-2)' }, ogeler),
      el('p', { sinif: 'alan__ipucu', metin: 'Çalışmada öğeler karışık gelir. En az 2 öğeyi doldur.' }));
  }

  function soruSatiri(s = {}) {
    soruNo += 1;
    const k = `mf-s${soruNo}`;
    const tipSec = el('select', { sinif: 'girdi', id: `${k}-tip`, 'data-alan': 'tip' },
      Object.entries(OZ_SORU_TIPLERI).map(([v, m]) => el('option', { value: v, metin: m })));
    tipSec.value = s.tip ?? 'coktan-secmeli';
    const katman = el('select', { sinif: 'girdi', id: `${k}-katman`, 'data-alan': 'katman' },
      KATMAN_SECENEKLERI.map(([v, m]) => el('option', { value: v, metin: m })));
    katman.value = s.katman ?? 'bilgi';
    const soru = el('input', { sinif: 'girdi', id: `${k}-soru`, type: 'text', 'data-alan': 'soru', maxlength: String(KENDI_SINIR.soru[1]), autocomplete: 'off' });
    soru.value = s.soru ?? '';
    const soruEtiket = el('label', { sinif: 'alan__etiket', for: `${k}-soru` });
    const ozel = el('div', { sinif: 'metin-formu__tip-alani' });
    const tipCiz = (veri = {}) => {
      const [etiket, ornek] = SORU_ETIKETI[tipSec.value];
      soruEtiket.textContent = etiket;
      soru.placeholder = ornek;
      ozel.replaceChildren(tipAlanlari(k, tipSec.value, veri));
    };
    tipSec.addEventListener('change', () => { tipCiz(); duyur(`Soru türü: ${tipSec.selectedOptions[0].textContent}`); });
    tipCiz(s);

    const baslik = el('legend', {});
    const kaldir = el('button', { type: 'button', sinif: 'btn btn--hayalet btn--kucuk tehlike-metin' }, spriteIkon('cop', 'ikon ikon--kucuk'), 'Bu soruyu kaldır');
    const li = el('li', {}, el('fieldset', { sinif: 'grup metin-formu__soru' }, baslik,
      el('div', { sinif: 'metin-formu__ikili' },
        el('div', { sinif: 'alan' }, el('label', { sinif: 'alan__etiket', for: `${k}-tip`, metin: 'Soru türü' }), tipSec),
        el('div', { sinif: 'alan' }, el('label', { sinif: 'alan__etiket', for: `${k}-katman`, metin: 'Ne ölçüyor?' }), katman)),
      el('div', { sinif: 'alan' }, soruEtiket, soru),
      ozel, kaldir));
    kaldir.addEventListener('click', () => {
      const sonraki = li.nextElementSibling ?? li.previousElementSibling;
      li.remove();
      degisti = true;
      soruDurumu();
      duyur('Soru kaldırıldı.');
      odakla(sonraki?.querySelector('select') ?? soruEkle);
    });
    soruListesi.append(li);
    soruDurumu();
    return tipSec;
  }

  // Bir soru satırındaki değerleri öz-soru biçiminde toplar; tamamen boşsa null
  function soruTopla(li) {
    const al = (a) => [...li.querySelectorAll(`[data-alan="${a}"]`)];
    const tip = al('tip')[0].value;
    const yazilar = [...li.querySelectorAll('input[type="text"], textarea')].map((g) => g.value.trim());
    if (!yazilar.some(Boolean)) return null;
    const s = { tip, katman: al('katman')[0].value, soru: al('soru')[0].value };
    if (tip === 'kisa-cevap') s.cevap = al('cevap')[0].value;
    else if (tip === 'coktan-secmeli') {
      const dogrular = al('dogru');
      const dolu = al('secenek').map((g, i) => ({ m: g.value.trim(), d: dogrular[i].checked })).filter((x) => x.m);
      s.secenekler = dolu.map((x) => x.m);
      s.dogru = dolu.findIndex((x) => x.d);
    } else if (tip === 'dogru-yanlis') {
      const r = li.querySelector('[data-alan="dogru"]:checked');
      s.dogru = r ? r.value === 'true' : null;
    } else if (tip === 'bosluk') s.cevaplar = al('cevap')[0].value.split('/');
    else if (tip === 'siralama') s.ogeler = al('oge').map((g) => g.value);
    return s;
  }

  function soruDurumu() {
    const satirlar = [...soruListesi.children];
    satirlar.forEach((li, i) => {
      const ad = `${i + 1}. soru`;
      li.querySelector('.metin-formu__soru > legend').textContent = ad;
      li.querySelector('.tehlike-metin').setAttribute('aria-label', `${ad} kaldır`);
    });
    soruEkle.disabled = satirlar.length >= KENDI_SINIR.enFazlaSoru;
    soruEkle.textContent = soruEkle.disabled ? `En çok ${KENDI_SINIR.enFazlaSoru} soru` : 'Soru ekle';
  }
  soruEkle.addEventListener('click', () => odakla(soruSatiri()));
  soruListesi.addEventListener('change', () => { degisti = true; });

  // ----- Sorusuz / sorulu seçimi -----
  const tur = (deger, metinYazi) => el('label', { sinif: 'secim' },
    el('input', { type: 'radio', name: 'soru-turu', value: deger }), el('span', { metin: metinYazi }));
  const turGrubu = el('fieldset', { sinif: 'grup' }, el('legend', { metin: 'Sorular' }),
    tur('yok', 'Sorusuz okuyacağım (Hızlı Oku ile okunur)'),
    tur('var', 'Kendi sorularımı yazacağım (Oku ve Anla ile de okunur)'));
  const sorulu = !!metin?.ozSorular?.length;
  turGrubu.querySelector(`input[value="${sorulu ? 'var' : 'yok'}"]`).checked = true;
  (metin?.ozSorular ?? []).forEach((s) => soruSatiri(s));
  const soruluMu = () => turGrubu.querySelector('input:checked')?.value === 'var';
  const turGuncelle = () => {
    soruAlani.hidden = !soruluMu();
    if (soruluMu() && !soruListesi.children.length) soruSatiri();
  };
  turGrubu.addEventListener('change', turGuncelle);

  // ----- Pencere -----
  const genelHata = hataAlani('mf-genel-hata');
  const kapatDugme = el('button', { type: 'button', sinif: 'btn btn--hayalet btn--ikon', 'aria-label': 'Kapat' }, spriteIkon('kapat', 'ikon'));
  const vazgec = el('button', { type: 'button', sinif: 'btn btn--hayalet', metin: 'Vazgeç' });
  const kaydet = el('button', { type: 'submit', sinif: 'btn btn--birincil', metin: yeni ? 'Kütüphaneye ekle' : 'Kaydet' });
  const form = el('form', { sinif: 'metin-formu', novalidate: true },
    el('div', { sinif: 'modal__govde yigin', style: '--yigin-bosluk: var(--b-5)' },
      el('div', { sinif: 'alan' },
        el('label', { sinif: 'alan__etiket', for: 'mf-ad', metin: 'Başlık' }), adGirdi,
        el('p', { sinif: 'alan__ipucu', id: 'mf-ad-ipucu', metin: `Kısa ve anlaşılır bir başlık yaz (${KENDI_SINIR.baslik[0]}-${KENDI_SINIR.baslik[1]} karakter).` }), adHata),
      el('div', { sinif: 'alan' },
        el('label', { sinif: 'alan__etiket', for: 'mf-metin', metin: 'Metin (yazabilir ya da yapıştırabilirsin)' }), metinGirdi, sayac, metinHata),
      turGrubu, soruAlani, genelHata),
    el('div', { sinif: 'modal__alt' }, vazgec, kaydet));
  const dialog = el('dialog', { sinif: 'modal metin-formu-modal', 'aria-labelledby': 'mf-baslik' },
    el('div', { sinif: 'modal__ic' },
      el('div', { sinif: 'modal__ust' }, el('h2', { id: 'mf-baslik', metin: yeni ? 'Kendi metnini ekle' : 'Metni düzenle' }), kapatDugme),
      form));

  // Yazılanlar yanlışlıkla kaybolmasın: arka plana tıklama kapatmaz; Esc ve Vazgeç değişiklik varsa sorar
  const kapatilsinMi = () => !degisti || confirm('Yazdıkların kaydedilmedi. Pencere kapatılsın mı?');
  const kapat = () => { if (kapatilsinMi()) modalKapat(dialog); };
  kapatDugme.addEventListener('click', kapat);
  vazgec.addEventListener('click', kapat);
  dialog.addEventListener('cancel', (e) => { if (!kapatilsinMi()) e.preventDefault(); });
  dialog.addEventListener('close', () => {
    dialog.remove();
    if (!kaydedildi && acici?.isConnected) acici.focus();
  });
  form.addEventListener('input', (e) => {
    degisti = true;
    if (e.target === metinGirdi) sayacYaz();
    if (e.target?.getAttribute('aria-invalid')) e.target.removeAttribute('aria-invalid');
  });

  function hataGoster(h) {
    [adHata, metinHata, soruHata, genelHata].forEach((a) => { a.hidden = true; a.textContent = ''; });
    if (!h) return;
    let alan = genelHata;
    let odak = kaydet;
    if (h.alan === 'ad') { alan = adHata; odak = adGirdi; }
    else if (h.alan === 'metin') { alan = metinHata; odak = metinGirdi; }
    else if (h.alan === 'soru') {
      alan = soruHata;
      const li = sonSatirlar[h.sira]?.li ?? soruListesi.children[h.sira];
      odak = li?.querySelector(`[data-alan="${h.alt ?? 'soru'}"]`) ?? li?.querySelector('select') ?? soruEkle;
    }
    alan.textContent = h.mesaj;
    alan.hidden = false;
    if (odak !== kaydet && odak.type !== 'radio') odak.setAttribute('aria-invalid', 'true');
    odakla(odak);
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    // Boş satırlar atlanır; hata sırası dolu satırlara göre olduğu için satırlar saklanır
    sonSatirlar = soruluMu() ? [...soruListesi.children].map((li) => ({ li, s: soruTopla(li) })).filter((x) => x.s) : [];
    const sorular = sonSatirlar.map((x) => x.s);
    if (soruluMu() && !sorular.length) {
      hataGoster({ alan: 'soru', sira: 0, mesaj: 'En az bir soru yaz ya da “Sorusuz okuyacağım”ı seç.' });
      return;
    }
    const sonuc = kendiMetniKaydet({ kimlik: metin?.kimlik, ad: adGirdi.value, metin: metinGirdi.value, sorular });
    if (!sonuc.tamam) { hataGoster(sonuc.hata); return; }
    degisti = false;
    kaydedildi = true;
    modalKapat(dialog);
    try { kaydedince?.(sonuc.metin, yeni); } catch (h) { console.error('[metin-formu]', h); }
  });

  sayacYaz();
  turGuncelle();
  document.body.append(dialog);
  modalAc(dialog);
  odakla(adGirdi);
  return dialog;
}
