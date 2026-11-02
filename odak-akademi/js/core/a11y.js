// Erişilebilirlik çekirdeği: görünüm ayarlarını uygular (tema, yazı, font, ses, hareket, S10: mola hatırlatıcısı), ekran okuyucu duyuruları, odak yönetimi.
// İkonlar sayfa içi sprite: <use href="#ad">. Ayarların kalıcı kaydını settings.js yapar.

const kok = document.documentElement;
const koyuSorgu = window.matchMedia('(prefers-color-scheme: dark)');
const hareketSorgu = window.matchMedia('(prefers-reduced-motion: reduce)');

export const TEMALAR = ['sistem', 'acik', 'koyu'];
export const YAZI_BOYUTLARI = ['kucuk', 'normal', 'buyuk', 'cok-buyuk'];
export const FONTLAR = ['standart', 'disleksi'];

const dinleyiciler = new Set();

/** Ayar değişince çağrılacak fonksiyonu kaydeder; kaydı silen fonksiyon döner. */
export function degisinceHaberVer(fn) {
  dinleyiciler.add(fn);
  return () => dinleyiciler.delete(fn);
}

function bildir() {
  const ayarlar = ayarlariOku();
  dinleyiciler.forEach((fn) => {
    try { fn(ayarlar); } catch (h) { console.error('[a11y] dinleyici hatası:', h); }
  });
}

// Varsayılan değerde öznitelik kaldırılır; CSS sistem tercihini izler
function oznitelikAyarla(ad, deger, varsayilan) {
  if (deger === varsayilan || deger == null) delete kok.dataset[ad];
  else kok.dataset[ad] = deger;
}

/** Profil şemasıyla uyumlu ayar nesnesi: { tema, yaziBoyutu, font, ses, hareketAzalt, molaRehberi } */
export function ayarlariOku() {
  return {
    tema: kok.dataset.tema || 'sistem',
    yaziBoyutu: kok.dataset.yazi || 'normal',
    font: kok.dataset.font || 'standart',
    ses: kok.dataset.ses !== 'kapali',
    hareketAzalt: kok.dataset.hareket === 'azalt',
    molaRehberi: kok.dataset.mola !== 'kapali',
  };
}

/** Birden çok ayarı birlikte uygular; tanınmayan değerler yok sayılır. */
export function ayarlariUygula(ayarlar = {}) {
  if (TEMALAR.includes(ayarlar.tema)) oznitelikAyarla('tema', ayarlar.tema, 'sistem');
  if (YAZI_BOYUTLARI.includes(ayarlar.yaziBoyutu)) oznitelikAyarla('yazi', ayarlar.yaziBoyutu, 'normal');
  if (FONTLAR.includes(ayarlar.font)) oznitelikAyarla('font', ayarlar.font, 'standart');
  if (typeof ayarlar.ses === 'boolean') oznitelikAyarla('ses', ayarlar.ses ? null : 'kapali', null);
  if (typeof ayarlar.hareketAzalt === 'boolean') oznitelikAyarla('hareket', ayarlar.hareketAzalt ? 'azalt' : null, null);
  if (typeof ayarlar.molaRehberi === 'boolean') oznitelikAyarla('mola', ayarlar.molaRehberi ? null : 'kapali', null);
  temaRengiGuncelle();
  bildir();
}

/** Şu an ekranda görünen tema: 'acik' | 'koyu' */
export function etkinTema() {
  const secim = kok.dataset.tema;
  if (secim === 'acik' || secim === 'koyu') return secim;
  return koyuSorgu.matches ? 'koyu' : 'acik';
}

/** Açık ↔ koyu arasında geçiş yapar. */
export function temaDegistir() {
  ayarlariUygula({ tema: etkinTema() === 'koyu' ? 'acik' : 'koyu' });
}

/** Animasyonlar kapalı mı? (kullanıcı ayarı veya sistem tercihi) */
export function hareketAzaltilmisMi() {
  return kok.dataset.hareket === 'azalt' || hareketSorgu.matches;
}

/** S10: Mola hatırlatıcısı (çerçevede mola önerisi, okumada göz molası) açık mı? Kök öznitelik: data-mola="kapali" */
export function molaRehberiAcikMi() {
  return kok.dataset.mola !== 'kapali';
}

/** Ses efektleri açık mı? */
export function sesAcikMi() {
  return kok.dataset.ses !== 'kapali';
}

// Mobil tarayıcı çubuğunun rengi temaya uysun. index.html'de iki meta var (açık/koyu, media ile):
// tema seçildiyse ikisi de o temanın rengini alır; "sistem"de her meta kendi rengine döner
const TEMA_RENGI = Object.freeze({ acik: '#ffffff', koyu: '#172529' });
function temaRengiGuncelle() {
  const secim = kok.dataset.tema;
  document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => {
    const media = meta.getAttribute('media');
    const kendi = media ? (media.includes('dark') ? 'koyu' : 'acik') : etkinTema();
    meta.setAttribute('content', TEMA_RENGI[secim === 'acik' || secim === 'koyu' ? secim : kendi]);
  });
}

koyuSorgu.addEventListener('change', () => { temaRengiGuncelle(); bildir(); });
temaRengiGuncelle();

/** Tema düğmesini bağlar: aria-pressed ve ikon (güneş/ay) güncel tutulur. */
export function temaDugmesiBagla(dugme) {
  if (!dugme) return;
  const guncelle = () => {
    const koyu = etkinTema() === 'koyu';
    dugme.setAttribute('aria-pressed', String(koyu));
    const kullan = dugme.querySelector('use');
    if (kullan) {
      const href = kullan.getAttribute('href') || '';
      kullan.setAttribute('href', href.replace(/#.*$/, koyu ? '#ay' : '#gunes'));
    }
  };
  dugme.addEventListener('click', temaDegistir);
  degisinceHaberVer(guncelle);
  guncelle();
}

/** Ayar formunu bağlar. Alan adları: tema, yaziBoyutu, font (radyo/seçim), ses, hareketAzalt, molaRehberi (onay kutusu) */
export function ayarFormuBagla(form) {
  if (!form) return;
  const el = form.elements;
  const doldur = (a) => {
    for (const ad of ['tema', 'yaziBoyutu', 'font']) if (el[ad]) el[ad].value = a[ad];
    for (const ad of ['ses', 'hareketAzalt', 'molaRehberi']) if (el[ad]) el[ad].checked = a[ad];
  };
  form.addEventListener('change', (e) => {
    const { name, value, checked, type } = e.target;
    if (!name) return;
    ayarlariUygula({ [name]: type === 'checkbox' ? checked : value });
  });
  form.addEventListener('submit', (e) => {
    if (form.method !== 'dialog') e.preventDefault();
  });
  degisinceHaberVer(doldur);
  doldur(ayarlariOku());
}

// ---------- Ekran okuyucu duyuruları ----------
const duyuruAlanlari = {};

function duyuruAlani(oncelik) {
  let alan = duyuruAlanlari[oncelik];
  if (!alan) {
    alan = document.createElement('div');
    alan.className = 'ekran-okuyucu';
    alan.setAttribute('aria-live', oncelik);
    alan.setAttribute('aria-atomic', 'true');
    duyuruAlanlari[oncelik] = alan;
  }
  return acikPencereyeTasi(alan); // modal açıkken dışarıdaki alan okunmaz
}

/** Öğeyi açık <dialog>'un içine (yoksa body'ye) taşır; pencere kapanınca body'ye geri koyar. Toast ve duyuru alanları için */
export function acikPencereyeTasi(oge) {
  const pencere = document.querySelector('dialog[open]');
  const hedef = pencere ?? document.body;
  if (oge.parentElement === hedef) return oge;
  hedef.append(oge);
  if (pencere) {
    pencere.addEventListener('close', () => { if (oge.parentElement !== document.body) document.body.append(oge); }, { once: true });
  }
  return oge;
}

/**
 * Görünmeden ekran okuyucuya mesaj okutur.
 * oncelik: 'polite' (sırasını bekler, varsayılan) | 'assertive' (hemen okur; yalnızca acil durum)
 */
export function duyur(mesaj, { oncelik = 'polite' } = {}) {
  const alan = duyuruAlani(oncelik === 'assertive' ? 'assertive' : 'polite');
  alan.textContent = '';
  // Aynı mesaj art arda gelse de okunsun diye kısa gecikme
  setTimeout(() => { alan.textContent = String(mesaj ?? ''); }, 60);
}

// ---------- Odak yönetimi ----------
const ODAKLANABILIR = [
  'a[href]', 'button:not([disabled])', 'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])', 'textarea:not([disabled])', 'summary', '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
].join(',');

/** Kapsayıcı içindeki görünür ve odaklanabilir öğeler */
export function odaklanabilirler(kapsayici = document) {
  return [...kapsayici.querySelectorAll(ODAKLANABILIR)]
    .filter((o) => !o.closest('[hidden], [inert]') && o.getClientRects().length > 0);
}

/** Öğeye odaklanır; normalde odak almayan öğeye (başlık vb.) geçici tabindex verir. */
export function odakla(oge, { kaydir = true } = {}) {
  if (!oge) return false;
  if (!oge.matches(ODAKLANABILIR) && !oge.hasAttribute('tabindex')) {
    oge.setAttribute('tabindex', '-1');
    oge.addEventListener('blur', () => oge.removeAttribute('tabindex'), { once: true });
  }
  oge.focus({ preventScroll: !kaydir });
  return document.activeElement === oge;
}

/** Şu anki odağı hatırlar; dönen fonksiyon çağrılınca odak oraya geri verilir. */
export function odagiKaydet() {
  const onceki = document.activeElement;
  return () => { if (onceki?.isConnected && typeof onceki.focus === 'function') onceki.focus(); };
}

/**
 * Odağı kapsayıcı içinde tutar (Tab / Shift+Tab döngüsü). <dialog> dışındaki tam ekran
 * egzersizler için; isteğe bağlı Esc ile kapatma. Dönen fonksiyon tuzağı kaldırır ve odağı geri verir.
 */
export function odakTuzagi(kapsayici, { esc } = {}) {
  if (!kapsayici) return () => {};
  const geriVer = odagiKaydet();
  const tus = (e) => {
    if (e.key === 'Escape' && esc) { e.preventDefault(); esc(); return; }
    if (e.key !== 'Tab') return;
    const liste = odaklanabilirler(kapsayici);
    if (!liste.length) { e.preventDefault(); return; }
    const ilk = liste[0];
    const son = liste[liste.length - 1];
    const icinde = kapsayici.contains(document.activeElement);
    if (e.shiftKey && (!icinde || document.activeElement === ilk)) { e.preventDefault(); son.focus(); }
    else if (!e.shiftKey && (!icinde || document.activeElement === son)) { e.preventDefault(); ilk.focus(); }
  };
  document.addEventListener('keydown', tus);
  if (!kapsayici.contains(document.activeElement)) odakla(odaklanabilirler(kapsayici)[0] ?? kapsayici);
  return () => { document.removeEventListener('keydown', tus); geriVer(); };
}
