// Görsel algı yardımcıları (S10; D06: yuvarla dışa açıldı): SVG öğesi üretme, şekil ve renk havuzu (renkler tokens.css belirteçleri), şekil çizme, ekran → SVG koordinatı, ızgarada ok tuşlarıyla gezinme, geri bildirim satırı

const NS = 'http://www.w3.org/2000/svg';
/** Bir ondalık basamağa yuvarlar (SVG koordinatları kısa kalsın) */
export const yuvarla = (n) => Math.round(n * 10) / 10;

/** SVG öğesi: svg('circle', { cx: 5, class: 'a' }, ...cocuklar). null/undefined/false öznitelik ve çocuklar atlanır */
export function svg(ad, oz = {}, ...cocuklar) {
  const e = document.createElementNS(NS, ad);
  for (const [k, v] of Object.entries(oz)) {
    if (v !== null && v !== undefined && v !== false) e.setAttribute(k, v === true ? '' : String(v));
  }
  for (const c of cocuklar.flat()) if (c) e.append(c);
  return e;
}

// ---------- Rastgele seçim ----------
/** [en, enCok] aralığında tam sayı (iki uç dahil) */
export const rastgeleTam = (en, enCok) => en + Math.floor(Math.random() * (enCok - en + 1));
export const rastgeleSec = (dizi) => dizi[Math.floor(Math.random() * dizi.length)];
/** haric dışındaki rastgele öğe */
export const digeriniSec = (dizi, haric) => rastgeleSec(dizi.filter((x) => x !== haric));

// ---------- Şekiller (100×100 kutu, merkez 50,50) ----------
function cokgen(n, r, basAci, cy = 50) {
  const p = Array.from({ length: n }, (_, i) => {
    const a = ((basAci + (i * 360) / n) * Math.PI) / 180;
    return `${yuvarla(50 + r * Math.cos(a))} ${yuvarla(cy + r * Math.sin(a))}`;
  });
  return `M${p.join('L')}Z`;
}
function yildizYolu() {
  const p = Array.from({ length: 10 }, (_, i) => {
    const r = i % 2 ? 17 : 42;
    const a = ((-90 + i * 36) * Math.PI) / 180;
    return `${yuvarla(50 + r * Math.cos(a))} ${yuvarla(54 + r * Math.sin(a))}`;
  });
  return `M${p.join('L')}Z`;
}

/** ad: ekranda ve ekran okuyucuda kullanılan Türkçe ad; don: 90/180 derece döndürünce görünüşü değişir */
export const SEKILLER = Object.freeze({
  daire: { ad: 'daire', don: false, d: 'M50 10A40 40 0 1 1 49.9 10Z' },
  kare: { ad: 'kare', don: false, d: 'M15 15H85V85H15Z' },
  ucgen: { ad: 'üçgen', don: true, d: 'M50 10L90 84H10Z' },
  elmas: { ad: 'elmas', don: false, d: 'M50 6L86 50L50 94L14 50Z' },
  yildiz: { ad: 'yıldız', don: true, d: yildizYolu() },
  arti: { ad: 'artı', don: false, d: 'M37 10H63V37H90V63H63V90H37V63H10V37H37Z' },
  altigen: { ad: 'altıgen', don: false, d: cokgen(6, 42, 0) },
  kalp: { ad: 'kalp', don: true, d: 'M50 88C20 66 8 48 13 31 18 15 39 12 50 29 61 12 82 15 87 31 92 48 80 66 50 88Z' },
  hilal: { ad: 'hilal', don: true, d: 'M60 10A40 40 0 0 0 60 90A48 48 0 0 1 60 10Z' },
  ok: { ad: 'ok', don: true, d: 'M10 38H54V16L90 50L54 84V62H10Z' },
  damla: { ad: 'damla', don: true, d: 'M50 8C62 28 80 44 80 62A30 30 0 0 1 20 62C20 44 38 28 50 8Z' },
  lsekil: { ad: 'L harfi', don: true, d: 'M18 10H44V64H84V90H18Z' },
});
export const SEKIL_ADLARI = Object.freeze(Object.keys(SEKILLER));

/** Renkler yalnız belirteçlerden: açık ve koyu temada kendiliğinden değişir */
export const RENKLER = Object.freeze([
  { ad: 'yeşil', deger: 'var(--renk-birincil)' },
  { ad: 'mercan', deger: 'var(--renk-vurgu)' },
  { ad: 'sarı', deger: 'var(--renk-gunes)' },
  { ad: 'mavi', deger: 'var(--renk-bilgi)' },
  { ad: 'mor', deger: 'var(--modul-goz-ikon)' },
  { ad: 'kahverengi', deger: 'var(--modul-kutuphane-ikon)' },
].map(Object.freeze));
export const renkAdi = (deger) => RENKLER.find((r) => r.deger === deger)?.ad ?? '';

/**
 * Şekli (x, y) merkezine, boyut genişliğinde çizer (<path>). aci: derece; ayna: yatay ayna görüntüsü.
 * Çizgi stili: .algi-sekil (exercise.css)
 */
export function sekilCiz(ad, { x = 50, y = 50, boyut = 100, aci = 0, ayna = false, renk = 'var(--renk-birincil)', sinif = 'algi-sekil' } = {}) {
  const o = Math.round(boyut * 10) / 1000;
  return svg('path', {
    d: (SEKILLER[ad] ?? SEKILLER.daire).d,
    class: sinif,
    transform: `translate(${yuvarla(x)} ${yuvarla(y)}) rotate(${aci}) scale(${ayna ? -o : o} ${o}) translate(-50 -50)`,
    style: `fill:${renk}`,
    'vector-effect': 'non-scaling-stroke',
  });
}

/** Düğme ya da kutu içinde tek şekil (kendi <svg>'si, ekran okuyucuya gizli) */
export function simgeSvg(ad, secenekler = {}) {
  return svg('svg', { viewBox: '-4 -4 108 108', class: 'algi-simge', 'aria-hidden': 'true', focusable: 'false' },
    sekilCiz(ad, secenekler));
}

/** Fare/dokunma olayının SVG içindeki koordinatı (viewBox birimi) ya da null */
export function noktaSvgde(kok, olay) {
  const m = kok.getScreenCTM?.();
  if (!m) return null;
  const p = new DOMPoint(olay.clientX, olay.clientY).matrixTransform(m.inverse());
  return { x: p.x, y: p.y };
}

/**
 * Izgarada tek sekme durağı ve ok tuşlarıyla gezinme (Home/End dahil).
 * ogeler(): güncel düğme dizisi; sutun(): sütun sayısı. Döner: { sifirla(odakla?) }
 */
export function izgaraGezinme(kap, { ogeler, sutun }) {
  function tasi(yeni, odak = true) {
    const liste = ogeler();
    if (!liste.length) return;
    const sira = ((yeni % liste.length) + liste.length) % liste.length;
    liste.forEach((o, i) => { o.tabIndex = i === sira ? 0 : -1; });
    if (odak) liste[sira].focus();
  }
  kap.addEventListener('keydown', (e) => {
    const liste = ogeler();
    const i = liste.indexOf(document.activeElement);
    if (i < 0) return;
    const n = sutun();
    const adim = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: n, ArrowUp: -n }[e.key];
    if (adim !== undefined) { e.preventDefault(); tasi(i + adim); }
    else if (e.key === 'Home') { e.preventDefault(); tasi(0); }
    else if (e.key === 'End') { e.preventDefault(); tasi(liste.length - 1); }
  });
  // Fareyle seçilen öğe sekme durağı olur
  kap.addEventListener('click', (e) => {
    const i = ogeler().indexOf(e.target.closest('button'));
    if (i >= 0) tasi(i, false);
  });
  return { sifirla: (odak = false) => tasi(0, odak) };
}

/** Geri bildirim satırı: sonuc 'dogru' | 'yanlis' | null; ✓/✗ işareti metne eklenir (yalnız renge dayanmaz) */
export function geriYaz(oge, sonuc, metin) {
  if (sonuc) oge.dataset.sonuc = sonuc;
  else delete oge.dataset.sonuc;
  oge.textContent = sonuc === 'dogru' ? `✓ ${metin}` : sonuc === 'yanlis' ? `✗ ${metin}` : metin;
}
