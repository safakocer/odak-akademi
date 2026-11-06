// Ortak arayüz davranışları: öğe oluşturma (el), sprite ikonu, modal (<dialog>), erişilebilir sekmeler, toast bildirimleri ve dosya indirme (S24)

import { acikPencereyeTasi } from './a11y.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * Küçük öğe oluşturucu: el('button', { sinif, metin, onclick, ...nitelikler }, ...çocuklar)
 * null/false nitelik ve çocuklar atlanır; true nitelik boş değerle eklenir. Metin her zaman textContent ile yazılır.
 */
export function el(etiket, ozellik = {}, ...cocuklar) {
  const o = document.createElement(etiket);
  for (const [k, v] of Object.entries(ozellik ?? {})) {
    if (v == null || v === false) continue;
    if (k === 'sinif') o.className = v;
    else if (k === 'metin') o.textContent = v;
    else if (k.startsWith('on') && typeof v === 'function') o.addEventListener(k.slice(2), v);
    else o.setAttribute(k, v === true ? '' : v);
  }
  o.append(...cocuklar.flat().filter((c) => c != null && c !== false));
  return o;
}

/** Sayfa içi sprite'tan ikon: <svg aria-hidden><use href="#ad"></svg>. Sprite: index.html ve components.html */
export function spriteIkon(ad, sinif) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  if (sinif) svg.setAttribute('class', sinif);
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  const kullan = document.createElementNS(SVG_NS, 'use');
  kullan.setAttribute('href', `#${ad}`);
  svg.append(kullan);
  return svg;
}

/** Modalı açar; eski tarayıcıda open özniteliğine düşer. */
export function modalAc(dialog) {
  if (!dialog) return;
  if (typeof dialog.showModal === 'function') dialog.showModal();
  else dialog.setAttribute('open', '');
}

/** Modalı kapatır. */
export function modalKapat(dialog) {
  if (!dialog) return;
  if (typeof dialog.close === 'function') dialog.close();
  else dialog.removeAttribute('open');
}

/**
 * Açıcı düğme ile modalı bağlar. Kapatma: Esc, [data-kapat] düğmeleri, arka plana tıklama.
 * Kapanınca odak açıcı düğmeye döner.
 */
export function modalBagla(acici, dialog) {
  if (!dialog) return;
  if (acici) acici.addEventListener('click', () => modalAc(dialog));
  dialog.querySelectorAll('[data-kapat]').forEach((d) => d.addEventListener('click', () => modalKapat(dialog)));
    // Arka plana tıklama kapatır; içinde form düzenleniyorsa (data-duzenleniyor) yazılanlar kaybolmasın diye kapatmaz
  dialog.addEventListener('click', (e) => { if (e.target === dialog && !('duzenleniyor' in dialog.dataset)) modalKapat(dialog); });
  dialog.addEventListener('close', () => { if (acici) acici.focus(); });
}

/**
 * Sekme grubunu bağlar (WAI-ARIA sekme deseni).
 * Yapı: [role=tablist] içinde [role=tab][aria-controls] düğmeleri, karşılık gelen [role=tabpanel].
 * Klavye: Sol/Sağ ok, Home, End.
 */
export function sekmeleriBagla(kok) {
  if (!kok) return;
  const sekmeler = [...kok.querySelectorAll('[role="tab"]')];
  if (!sekmeler.length) return;

  const sec = (secilen, odakla = true) => {
    sekmeler.forEach((s) => {
      const secili = s === secilen;
      s.setAttribute('aria-selected', String(secili));
      s.tabIndex = secili ? 0 : -1;
      const panel = document.getElementById(s.getAttribute('aria-controls'));
      if (panel) panel.hidden = !secili;
    });
    if (odakla) secilen.focus();
  };

  sekmeler.forEach((s, i) => {
    s.addEventListener('click', () => sec(s));
    s.addEventListener('keydown', (e) => {
      const n = sekmeler.length;
      const hedef = { ArrowRight: (i + 1) % n, ArrowLeft: (i - 1 + n) % n, Home: 0, End: n - 1 }[e.key];
      if (hedef === undefined) return;
      e.preventDefault();
      sec(sekmeler[hedef]);
    });
  });

  sec(sekmeler.find((s) => s.getAttribute('aria-selected') === 'true') || sekmeler[0], false);
}

/** S24: Metni (ya da Blob’u) dosya olarak indirir; açık pencere varsa bağlantı onun içine eklenir. Döner: başarılıysa true */
export function dosyaIndir(ad, icerik, tur = 'text/plain;charset=utf-8') {
  try {
    const url = URL.createObjectURL(icerik instanceof Blob ? icerik : new Blob([icerik], { type: tur }));
    const a = el('a', { href: url, download: ad, hidden: true });
    (document.querySelector('dialog[open]') ?? document.body).append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return true;
  } catch (h) {
    console.error('[ui] Dosya indirilemedi:', h);
    return false;
  }
}

let toastAlani = null;

// Açık bir <dialog> varsa toast alanı onun içine taşınır (yoksa modalın arkasında kalır ve okunmaz); kapanınca sayfaya döner
function toastAlaniGetir() {
  toastAlani ??= document.querySelector('.toast-alani');
  if (!toastAlani) {
    toastAlani = document.createElement('div');
    toastAlani.className = 'toast-alani';
    toastAlani.setAttribute('role', 'status');
    toastAlani.setAttribute('aria-live', 'polite');
  }
  return acikPencereyeTasi(toastAlani);
}

/**
 * Kısa bildirim gösterir. tur: 'bilgi' | 'basari' | 'uyari' | 'hata'.
 * Tıklayınca hemen kapanır; ekran okuyucu "polite" olarak okur.
 */
export function toastGoster(mesaj, { tur = 'bilgi', sure = 3500 } = {}) {
  const alan = toastAlaniGetir();
  const toast = document.createElement('div');
  toast.className = `toast toast--${tur}`;
  toast.textContent = mesaj;
  alan.append(toast);

  let kapandi = false;
  const kaldir = () => {
    if (kapandi) return;
    kapandi = true;
    toast.classList.add('toast--cikis');
    setTimeout(() => toast.remove(), 250);
  };
  toast.addEventListener('click', kaldir);
  setTimeout(kaldir, tur === 'hata' ? Math.max(sure, 12000) : sure); // hata mesajı okunmadan kaybolmasın
  return kaldir;
}
