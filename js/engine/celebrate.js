// Kutlamalar: kutla() profesyonel görünümün kısa konfetisi (değişmedi); S28: çocuk görünümünde kutlama ekranı (Fener + başlık + konfeti ve yıldız patlaması, dokununca ya da tuşla kapanır).
// S30: ekran 4 sn görünür; hareket (konfeti, ışınlar, zıplama) ilk 1,5 sn’de biter, sonra kart durgun kalır ve alttaki çubuk kalan süreyi gösterir. Sekme arka plandayken süre durur.
// "Hareketi azalt" açıkken (ayar ya da sistem tercihi) hiçbiri çizilmez. Kutlama katmanı ekran okuyucuya gizlidir: duyurular çerçevede, metinler değişmedi.
import { hareketAzaltilmisMi } from '../core/a11y.js';
import { el, spriteIkon } from '../core/ui.js';
import { fenerCiz } from './fener.js';

const RENKLER = ['var(--renk-gunes)', 'var(--renk-birincil)', 'var(--renk-vurgu)', 'var(--renk-bilgi)']; // yalnız tokens.css belirteçleri
const SURE_MS = 1900; // en uzun parça: gecikme + düşüş
const rastgele = (en, enCok) => en + Math.random() * (enCok - en);

/**
 * Kapsayıcının üstünde kısa konfeti gösterir (stil: css/exercise.css, .kutlama).
 * Çizildiyse true, hareket azaltılmışsa false döner.
 */
export function kutla(kapsayici = document.body, { adet = 40 } = {}) {
  if (!kapsayici || hareketAzaltilmisMi()) return false;
  const katman = document.createElement('div');
  katman.className = 'kutlama';
  katman.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < adet; i++) {
    const parca = document.createElement('span');
    parca.className = 'kutlama__parca';
    parca.style.cssText = `--x:${rastgele(2, 98)}%;--kayma:${rastgele(-60, 60)}px;--donus:${rastgele(-540, 540)}deg;`
      + `--gecikme:${rastgele(0, 350)}ms;--sure:${rastgele(1100, 1550)}ms;--renk:${RENKLER[i % RENKLER.length]}`;
    katman.append(parca);
  }
  kapsayici.append(katman);
  setTimeout(() => katman.remove(), SURE_MS + 300);
  return true;
}

// ---------- S28: Çocuk görünümü kutlama ekranı ----------
export const COCUK_KUTLAMA_MS = 4000; // S30: görünür kalma süresinin tamamı (giriş + bekleme + çıkış); S28’de 1500. CSS --kutlama-ms bu değerden yazılır
export const COCUK_KUTLAMA_HAREKET_MS = 1500; // konfeti, ışınlar ve Fener’in zıplaması bu süre içinde biter (css/cocuk.css süreleriyle uyumlu)
const KONFETI_RENKLERI = ['kirmizi', 'sari', 'yesil', 'mavi', 'mor', 'pembe', 'turuncu', 'turkuaz']; // css/cocuk.css --ck-*
const SEKILLER = ['serit', 'daire', 'yildiz'];

/**
 * Sonuçtan kutlama türünü seçer (öncelik: rozet > seviye > rekor > hedef). Kutlanacak bir şey yoksa null.
 * kazanim: motivasyon.kazanimAl() çıktısı ya da null. Döner: { tur, baslik, alt, ikon, ekler[] } | null
 */
export function kutlamaSec({ yeniRekor = false, kazanim = null } = {}) {
  const liste = [];
  const rozetler = kazanim?.yeniRozetler ?? [];
  if (rozetler.length) {
    liste.push({ tur: 'rozet', baslik: rozetler.length > 1 ? 'Yeni rozetler!' : 'Yeni rozet!', kisa: 'Yeni rozet',
      alt: rozetler.map((r) => r.ad).join(', '), ikon: rozetler[0].ikon || 'onay' });
  }
  if (kazanim?.seviyeAtladi) {
    liste.push({ tur: 'seviye', baslik: `Seviye ${kazanim.seviye.seviye}!`, kisa: 'Yeni seviye', alt: kazanim.seviye.unvan, ikon: 'isik' });
  }
  if (yeniRekor) liste.push({ tur: 'rekor', baslik: 'Yeni kişisel rekor!', kisa: 'Kişisel rekor', alt: 'Kendi en iyi sonucunu geçtin.', ikon: 'hedef' });
  if (kazanim?.hedefYeni) liste.push({ tur: 'hedef', baslik: 'Günlük hedef tamam!', kisa: 'Günlük hedef', alt: 'Bugünlük yeter diyebilirsin.', ikon: 'saat' });
  if (!liste.length) return null;
  const [ilk, ...diger] = liste;
  return { ...ilk, ekler: diger.slice(0, 2).map((k) => k.kisa) };
}

/**
 * Çocuk görünümü kutlama ekranı (stil: css/cocuk.css, .c-kutlama). kapsayici: egzersiz kökü (tam ekranda da görünsün diye).
 * Konfeti + tek bir yıldız patlaması (yanıp sönme yok) + Fener kartı. Dokunma/tıklama, Esc ya da herhangi bir tuş kapatır; Esc egzersizi kapatmaz.
 * S30: COCUK_KUTLAMA_MS boyunca görünür; sekme gizlenince süre ve animasyonlar durur, dönünce kaldığı yerden sürer. Egzersiz kapanıp katman sayfadan çıktıysa dinleyiciler temizlenir.
 * Döner: kapatma fonksiyonu | null (hareket azaltılmışsa ya da kutlanacak bir şey yoksa)
 */
export function cocukKutla(kapsayici, secim, { adet = 36 } = {}) {
  if (!kapsayici || !secim || hareketAzaltilmisMi()) return null;
  const konfeti = Array.from({ length: adet }, (_, i) => {
    const parca = el('span', { sinif: `c-kutlama__parca c-kutlama__parca--${SEKILLER[i % SEKILLER.length]}` });
    parca.style.cssText = `--x:${rastgele(3, 97)}%;--kayma:${rastgele(-70, 70)}px;--donus:${rastgele(-480, 480)}deg;`
      + `--gecikme:${rastgele(0, 150)}ms;--sure:${rastgele(1000, 1300)}ms;--renk:var(--ck-${KONFETI_RENKLERI[i % KONFETI_RENKLERI.length]})`;
    return parca;
  });
  const isinlar = Array.from({ length: 8 }, (_, i) => {
    const isin = el('span', { sinif: 'c-kutlama__isin' });
    isin.style.setProperty('--aci', `${i * 45}deg`);
    return isin;
  });
  const katman = el('div', { sinif: 'c-kutlama', 'data-tur': secim.tur, 'aria-hidden': 'true' },
    el('div', { sinif: 'c-kutlama__konfeti' }, konfeti),
    el('div', { sinif: 'c-kutlama__kart' },
      el('div', { sinif: 'c-kutlama__patlama' }, isinlar),
      el('div', { sinif: 'c-kutlama__gorsel' },
        fenerCiz('sevinc', { sinif: 'c-kutlama__fener' }),
        secim.ikon && el('span', { sinif: 'c-kutlama__ikon' }, spriteIkon(secim.ikon, 'ikon'))),
      el('p', { sinif: 'c-kutlama__baslik', metin: secim.baslik }),
      secim.alt && el('p', { sinif: 'c-kutlama__alt', metin: secim.alt }),
      secim.ekler?.length > 0 && el('p', { sinif: 'c-kutlama__ekler' }, secim.ekler.map((e) => el('span', { metin: `+ ${e}` }))),
      el('p', { sinif: 'c-kutlama__dokun', metin: 'Devam etmek için dokun' }), // S30
      el('span', { sinif: 'c-kutlama__sure' }))); // S30: kalan süre çubuğu (CSS ile boşalır)
  katman.style.setProperty('--kutlama-ms', `${COCUK_KUTLAMA_MS}ms`);

  let kapandi = false;
  let sayac = 0;
  let kalanMs = COCUK_KUTLAMA_MS;
  let basladi = 0;
  const say = () => { basladi = performance.now(); clearTimeout(sayac); sayac = setTimeout(kapat, kalanMs); };
  const tus = (e) => {
    if (!katman.isConnected) { kapat(); return; } // egzersiz bu arada kapandı: tuşa dokunma
    if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); } // yalnız kutlamayı kapatır
    kapat();
  };
  // S30: sekme gizlenince süre ve CSS animasyonları durur (çocuk dönünce kutlamayı yine görsün)
  const gorunurluk = () => {
    if (!katman.isConnected) { kapat(); return; }
    if (document.hidden) {
      clearTimeout(sayac);
      kalanMs = Math.max(0, kalanMs - (performance.now() - basladi));
      katman.classList.add('c-kutlama--durdu');
    } else {
      katman.classList.remove('c-kutlama--durdu');
      say();
    }
  };
  function kapat() {
    if (kapandi) return;
    kapandi = true;
    clearTimeout(sayac);
    window.removeEventListener('keydown', tus, true);
    document.removeEventListener('visibilitychange', gorunurluk);
    katman.remove();
  }
  katman.addEventListener('pointerdown', (e) => { e.preventDefault(); kapat(); });
  window.addEventListener('keydown', tus, true); // yakalama aşaması: egzersizin Esc dinleyicisinden önce
  document.addEventListener('visibilitychange', gorunurluk);
  kapsayici.append(katman);
  say();
  return kapat;
}
