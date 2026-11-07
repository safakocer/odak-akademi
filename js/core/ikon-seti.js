// Renkli ikon seti (S28): çocuk görünümünde icons/cocuk-ikonlar.svg'deki sembolleri sayfadaki sprite'ın AYNI ADLI sembollerinin içine yazar; profesyonelde asıl çizgiler geri gelir.
// Sprite adları değişmez: <use href="#ad"> kullanan her yer (index.html, katalog.js, modüller) kendiliğinden renkli ikonu gösterir. Dosyada olmayan ikon çizgi kalır.
// Başarılı olunca kök öznitelik data-ikonlar="renkli" (cocuk.css ikon zeminlerini buna göre açar). innerHTML yok: DOMParser + importNode.

const DOSYA = 'icons/cocuk-ikonlar.svg';
const kok = document.documentElement;
const asil = new Map(); // sayfadaki <symbol> → { viewBox, parca (asıl çizgilerin kopyası) }
let yukleme = null; // Promise<Map<id, symbol>>
let istenen = 'profesyonel';

function setiYukle() {
  yukleme ??= fetch(new URL(DOSYA, document.baseURI))
    .then((y) => { if (!y.ok) throw new Error(`HTTP ${y.status}`); return y.text(); })
    .then((metin) => {
      const belge = new DOMParser().parseFromString(metin, 'image/svg+xml');
      if (belge.querySelector('parsererror')) throw new Error('İkon dosyası okunamadı');
      return new Map([...belge.querySelectorAll('symbol[id]')].map((s) => [s.id, s]));
    })
    .catch((h) => { yukleme = null; throw h; }); // bir sonraki denemede yeniden indirilsin
  return yukleme;
}

function renkliYaz(set) {
  for (const [id, kaynak] of set) {
    const hedef = document.getElementById(id);
    if (!hedef || hedef.localName !== 'symbol') continue;
    if (!asil.has(hedef)) {
      const parca = document.createDocumentFragment();
      parca.append(...[...hedef.childNodes].map((n) => n.cloneNode(true)));
      asil.set(hedef, { viewBox: hedef.getAttribute('viewBox'), parca });
    }
    hedef.replaceChildren(...[...kaynak.childNodes].map((n) => document.importNode(n, true)));
    if (kaynak.hasAttribute('viewBox')) hedef.setAttribute('viewBox', kaynak.getAttribute('viewBox'));
  }
  kok.dataset.ikonlar = 'renkli';
}

function asliniYaz() {
  for (const [hedef, { viewBox, parca }] of asil) {
    hedef.replaceChildren(parca.cloneNode(true));
    if (viewBox) hedef.setAttribute('viewBox', viewBox);
  }
  delete kok.dataset.ikonlar;
}

/**
 * Görünüme uygun ikon setini uygular (hesap.js görünüm her uygulandığında çağırır).
 * Profesyonelde dosya hiç indirilmez. Döner: Promise<true | false> (renkli set yüklenemezse false; çizgi ikonlar kalır)
 */
export async function ikonSetiniUygula(gorunum) {
  istenen = gorunum;
  if (gorunum !== 'cocuk') {
    if (kok.dataset.ikonlar) asliniYaz();
    return true;
  }
  try {
    const set = await setiYukle();
    if (istenen === 'cocuk') renkliYaz(set); // beklerken görünüm değiştiyse yazılmaz
    return true;
  } catch (h) {
    console.warn('[ikon-seti] Renkli ikonlar yüklenemedi; çizgi ikonlar kullanılıyor.', h);
    return false;
  }
}
