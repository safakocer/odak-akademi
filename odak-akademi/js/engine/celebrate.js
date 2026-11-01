// Basit kutlama animasyonu: kısa konfeti; "hareketi azalt" açıksa (ayar ya da sistem tercihi) hiç çizilmez
import { hareketAzaltilmisMi } from '../core/a11y.js';

const RENKLER = ['var(--renk-gunes)', 'var(--renk-birincil)', 'var(--renk-vurgu)', 'var(--renk-bilgi)']; // yalnız tokens.css belirteçleri
const SURE_MS = 1900; // en uzun parça: gecikme + düşüş

/**
 * Kapsayıcının üstünde kısa konfeti gösterir (stil: css/exercise.css, .kutlama).
 * Çizildiyse true, hareket azaltılmışsa false döner.
 */
export function kutla(kapsayici = document.body, { adet = 40 } = {}) {
  if (!kapsayici || hareketAzaltilmisMi()) return false;
  const rastgele = (en, enCok) => en + Math.random() * (enCok - en);
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
