// Okuma ayar paneli: hız, gruplama, kademeli hız, yazı boyutu, satır aralığı, yazı tipi, tema ve göz molası; canlı önizlemeli (S34-son: hız sürgüsü sınıf bandının üst hızıyla sınırlı)
import { el } from '../core/ui.js';
import { GRUP_SINIR, WPM_SINIR, KADEMELI, okumaAyarDenetle, okumaAlaniOlustur, metniGrupla, etkinOkumaBandi, ustWpm } from './reader-engine.js';
import { etkinGruplama } from './reader-modes.js';

// Satır aralığı ve gruplar görünsün diye birkaç satırlık, uzun cümleli özgün metin
const ONIZLEME_METNI = 'Küçük adadaki beyaz fener her akşam yanar ve karanlık denizi dikkatle tarar. Işığını gören gemiler kıyıya güvenle yaklaşır, limana sağ salim girer.';
const SECENEKLER = Object.freeze({
  grupTuru: [['kelime', 'Kelime sayısına göre'], ['karakter', 'Uzunluğa göre (harf ve boşluk)']],
  yaziBoyutu: [['kucuk', 'Küçük'], ['normal', 'Normal'], ['buyuk', 'Büyük'], ['cok-buyuk', 'Çok büyük']],
  satirAraligi: [[1.4, 'Dar'], [1.6, 'Normal'], [1.8, 'Geniş'], [2, 'Çok geniş']],
  font: [['uygulama', 'Varsayılan (uygulamadaki gibi)'], ['standart', 'Standart'], ['disleksi', 'Disleksi dostu (geniş aralık)']],
  tema: [['uygulama', 'Uygulamadaki gibi'], ['acik', 'Açık'], ['koyu', 'Koyu'], ['sepya', 'Sepya (kâğıt)']],
});

// Grup boyu seçenekleri: modun izin verdiği aralıkla sınırlı (ör. Kelime grubu: 2-4 kelime)
function boyutSecenekleri(tanim, tur) {
  const s = GRUP_SINIR[tur];
  const m = tur === 'kelime' && tanim?.grupSiniri ? tanim.grupSiniri : s;
  const liste = [];
  for (let n = Math.max(s.en, m.en); n <= Math.min(s.enCok, m.enCok); n += s.adim) {
    liste.push(el('option', { value: String(n), metin: tur === 'karakter' ? `En çok ${n} karakter` : `${n} kelime` }));
  }
  return liste;
}

/**
 * Ayar paneli. Her değişiklikte önizleme anında yenilenir ve degisince çağrılır.
 * secenekler: { ayar, tanim? (seçili mod), onizlemeMetni?, kimlik? (alan id öneki), degisince?(ayar, { kaydet }),
 *   bant? (S34-son: okuma bandı; verilmezse etkin profilinki: hız sürgüsünün üst sınırı bant.ustWpm) }
 *   kaydet true: değişiklik tamamlandı (change olayı), profile kaydedilebilir; false: sürükleme sürüyor (input olayı)
 * Döner: { kok, ayar(), modAyarla(tanim) }
 */
export function okumaAyarPaneliOlustur({ ayar, tanim = null, onizlemeMetni = ONIZLEME_METNI, kimlik = 'ok', degisince, bant = etkinOkumaBandi() } = {}) {
  let a = okumaAyarDenetle(ayar, bant);
  const ust = ustWpm(bant); // S34-son: ilkokulda sınıfın üst hızı (2: 120, 3: 150, 4: 180), yoksa 500
  let mod = tanim;
  const id = (ad) => `${kimlik}-${ad}`;

  const secimKutusu = (ad, etiket, liste = []) => {
    const kutu = el('select', { id: id(ad), name: id(ad), 'data-ayar': ad },
      liste.map(([v, m]) => el('option', { value: String(v), metin: m })));
    return [kutu, el('div', { sinif: 'okuma-ayar__satir' }, el('label', { for: id(ad), metin: etiket }), kutu)];
  };
  const anahtar = (ad, etiket, aciklama) => {
    const kutu = el('input', { type: 'checkbox', id: id(ad), name: id(ad), 'data-ayar': ad, 'aria-describedby': id(`${ad}-not`) });
    return [kutu, el('div', { sinif: 'okuma-ayar__satir' },
      el('label', { sinif: 'okuma-ayar__secenek okuma-ayar__anahtar', for: id(ad) }, kutu, el('span', { metin: etiket })),
      el('p', { id: id(`${ad}-not`), sinif: 'okuma-ayar__not', metin: aciklama }))];
  };

  // Canlı önizleme (geniş ekranda kaydırırken üstte kalır). Vurgu sayfayı kaydırmaz (data-kaydirma="yok")
  const onizlemeAlani = el('div', { sinif: 'okuma-onizleme', 'data-kaydirma': 'yok' });
  let onizlemeGorunumu = null;
  const onizleme = el('figure', { sinif: 'okuma-onizleme-kap' }, el('figcaption', { metin: 'Önizleme' }), onizlemeAlani);

  // Hız ve gruplar
  const hiz = el('input', { type: 'range', id: id('wpm'), name: id('wpm'), 'data-ayar': 'wpm',
    min: String(WPM_SINIR.en), max: String(ust), step: String(WPM_SINIR.adim) });
  const hizDeger = el('output', { for: id('wpm') });
  const hizKutu = el('div', { sinif: 'okuma-ayar__satir' }, el('label', { for: id('wpm') }, 'Hız: ', hizDeger), hiz,
    ust < WPM_SINIR.enCok && el('p', { sinif: 'okuma-ayar__not', metin: `Sınıfına uygun en yüksek hız: dakikada ${ust} kelime. Anlayarak okumak hızdan önemli.` }));
  const [turSec, turKutu] = secimKutusu('grupTuru', 'Gruplama', SECENEKLER.grupTuru);
  const [boyutSec, boyutKutu] = secimKutusu('grupBoyutu', 'Grup boyu');
  const grupKutu = el('div', { sinif: 'okuma-ayar__ikili' }, turKutu, boyutKutu);
  const yuzde = (x) => `%${Math.round(x * 100)}`;
  const [kademeli, kademeliKutu] = anahtar('kademeli', 'Kademeli hız artışı',
    `Açarsan her ${KADEMELI.adimKelime} kelimede hız yaklaşık ${yuzde(KADEMELI.oran)} artar; en çok başlangıç hızının ${yuzde(KADEMELI.tavanOran - 1)} fazlasına kadar çıkar. Okurken “Yavaşlat” ile geri alabilirsin. Anlama sonucun %${KADEMELI.anlamaEsigi}’in altındaysa hız artmaz. Kayıtlı hızın değişmez.`);
  const tempoGrubu = el('fieldset', { sinif: 'grup' }, el('legend', { metin: 'Hız ve gruplar' }), hizKutu, grupKutu, kademeliKutu);

  // Yazı ve renk
  const [yaziSec, yaziKutu] = secimKutusu('yaziBoyutu', 'Yazı boyutu', SECENEKLER.yaziBoyutu);
  const [satirSec, satirKutu] = secimKutusu('satirAraligi', 'Satır aralığı', SECENEKLER.satirAraligi);
  const [fontSec, fontKutu] = secimKutusu('font', 'Yazı tipi', SECENEKLER.font);
  const [temaSec, temaKutu] = secimKutusu('tema', 'Renk', SECENEKLER.tema);
  const gorunumGrubu = el('fieldset', { sinif: 'grup' }, el('legend', { metin: 'Yazı ve renk' }),
    el('div', { sinif: 'okuma-ayar__ikili' }, yaziKutu, satirKutu, fontKutu, temaKutu));

  // Mola
  const [goz, gozKutu] = anahtar('gozMolasi', 'Göz dinlendirme hatırlatıcısı',
    'Yaklaşık 20 dakika okuyunca okuma durur ve kısa bir mola önerilir: 20 saniye kadar uzaktaki bir noktaya bakmak gibi.');
  const molaGrubu = el('fieldset', { sinif: 'grup' }, el('legend', { metin: 'Mola' }), gozKutu);

  const kok = el('div', { sinif: 'okuma-panel' }, onizleme, tempoGrubu, gorunumGrubu, molaGrubu);

  // Ayarı kontrollere yansıtır; modun istemediği kontroller gizlenir
  function yansit() {
    const g = mod ? etkinGruplama(mod, a) : { grupTuru: a.grupTuru, grupBoyutu: a.grupBoyutu };
    const hm = `dakikada ${a.wpm} kelime`;
    hiz.value = String(a.wpm);
    hizDeger.textContent = hm;
    hiz.setAttribute('aria-valuetext', hm);
    turSec.value = a.grupTuru;
    boyutSec.replaceChildren(...boyutSecenekleri(mod, a.grupTuru));
    boyutSec.value = String(g.grupBoyutu);
    yaziSec.value = a.yaziBoyutu;
    satirSec.value = String(a.satirAraligi);
    fontSec.value = a.font;
    temaSec.value = a.tema;
    kademeli.checked = a.kademeli;
    goz.checked = a.gozMolasi;
    const k = mod?.kontroller ?? ['wpm', 'grup'];
    hizKutu.hidden = !k.includes('wpm');
    grupKutu.hidden = !k.includes('grup');
    kademeliKutu.hidden = hizKutu.hidden || mod?.motor === 'serbest';
    tempoGrubu.hidden = hizKutu.hidden && grupKutu.hidden && kademeliKutu.hidden;
  }

  // Önizleme grubu: en çok kelimeli ilk grup (ilk grup değilse), böylece grup boyu açıkça görünür
  function onizlemeSirasi(gruplar) {
    const enCok = Math.max(0, ...gruplar.map((x) => x.kelime));
    const i = gruplar.findIndex((x, j) => j > 0 && x.kelime === enCok);
    return i > 0 ? i : 0;
  }

  // Önizleme: seçili modun KENDİ görünümüyle (rehberde işaretçi ve şerit, RSVP'de tek nokta) örnek metin, bir grup vurgulu
  function onizle() {
    try { onizlemeGorunumu?.kapat?.(); } catch { /* yok say */ }
    onizlemeGorunumu = null;
    const gruplar = metniGrupla(onizlemeMetni, mod ? etkinGruplama(mod, a) : a);
    const sira = onizlemeSirasi(gruplar);
    // Düğüm önce önizleme kutusuna konur, sonra vurgulanır (vurgu, data-kaydirma="yok" sayesinde sayfayı kaydırmaz)
    const yerlestir = (dugum) => {
      if (dugum.matches('.okuma')) dugum.classList.add('okuma--onizleme');
      else dugum.querySelector('.okuma')?.classList.add('okuma--onizleme');
      onizlemeAlani.replaceChildren(dugum);
    };
    try {
      if (!mod) throw new Error('mod yok');
      const yardim = Object.freeze({ ilerlemeBildir() {}, gecenMs: () => 0, sureSiniriMs: (mod.sureSiniriSn ?? 0) * 1000 });
      onizlemeGorunumu = mod.gorunumOlustur(gruplar, a, yardim);
      // Modların CSS'i okuma durumuna bakar; önizleme "okuyor" gibi görünür ama motor çalışmaz
      yerlestir(el('div', { sinif: `okuma-modu okuma-modu--${mod.ad}`, 'data-durum': 'okuyor' }, onizlemeGorunumu.kok));
      onizlemeGorunumu.grupDegisti?.(gruplar[sira], sira);
    } catch {
      const alan = okumaAlaniOlustur(gruplar, { ayar: a, etiket: 'Önizleme metni' });
      yerlestir(alan.kok);
      alan.vurgula(sira);
    }
  }

  function olay(e) {
    const ad = e.target?.dataset?.ayar;
    if (!ad) return;
    const degisen = { [ad]: e.target.type === 'checkbox' ? e.target.checked : e.target.value };
    if (ad === 'grupTuru') degisen.grupBoyutu = undefined; // tür değişince o türün varsayılan boyu
    a = okumaAyarDenetle({ ...a, ...degisen }, bant);
    yansit();
    onizle();
    try { degisince?.({ ...a }, { kaydet: e.type === 'change' }); } catch (h) { console.error('[okuma-paneli]', h); }
  }
  kok.addEventListener('input', olay);
  kok.addEventListener('change', olay);

  yansit();
  onizle();
  return {
    kok,
    ayar: () => ({ ...a }),
    modAyarla(t) { mod = t; yansit(); onizle(); },
  };
}
