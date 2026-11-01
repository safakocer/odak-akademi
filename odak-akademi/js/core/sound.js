// Kısa ve yumuşak ses efektleri: dosya gerektirmez (Web Audio ile üretilir), ses ayarı kapalıysa çalmaz
import { sesAcikMi } from './a11y.js';

// Her efekt: [frekans Hz, başlangıç sn, süre sn] notaları
const EFEKTLER = Object.freeze({
  dogru: [[660, 0, 0.12], [880, 0.1, 0.18]],   // yükselen iki nota
  yanlis: [[392, 0, 0.18], [349, 0.12, 0.22]], // alçak ve yumuşak (cezalandırıcı değil)
  bitti: [[523, 0, 0.14], [659, 0.12, 0.14], [784, 0.24, 0.28]],
  tik: [[1000, 0, 0.04]],
  bip: [[740, 0, 0.09]],                       // geri sayım (3-2-1)
  basla: [[988, 0, 0.16]],                     // geri sayım bitti, başla
  rekor: [[523, 0, 0.12], [659, 0.1, 0.12], [784, 0.2, 0.12], [1047, 0.3, 0.3]], // kişisel rekor
});
const SES_SEVIYESI = 0.12; // kulağı yormayan düşük seviye

let baglam = null;

function baglamAl() {
  const Sinif = window.AudioContext || window.webkitAudioContext;
  if (!Sinif) return null;
  if (!baglam) baglam = new Sinif();
  if (baglam.state === 'suspended') baglam.resume().catch(() => {});
  return baglam;
}

/**
 * Efekti çalar; tür adları SES_TURLERI içinde (dogru, yanlis, bitti, tik, bip, basla, rekor).
 * Ses kapalıysa ya da tarayıcı desteklemiyorsa sessizce false döner.
 * { zorla: true } ayar kapalı olsa da çalar (yalnızca "Sesi dene" için).
 */
export function sesCal(tur = 'tik', { zorla = false } = {}) {
  if (!zorla && !sesAcikMi()) return false;
  const notalar = EFEKTLER[tur];
  if (!notalar) return false;
  try {
    const b = baglamAl();
    if (!b) return false;
    const simdi = b.currentTime + 0.01;
    for (const [frekans, bas, sure] of notalar) {
      const osilator = b.createOscillator();
      const kazanc = b.createGain();
      osilator.type = 'sine';
      osilator.frequency.value = frekans;
      // Tıkırtı olmasın diye yumuşak giriş ve çıkış
      kazanc.gain.setValueAtTime(0.0001, simdi + bas);
      kazanc.gain.exponentialRampToValueAtTime(SES_SEVIYESI, simdi + bas + 0.02);
      kazanc.gain.exponentialRampToValueAtTime(0.0001, simdi + bas + sure);
      osilator.connect(kazanc).connect(b.destination);
      osilator.start(simdi + bas);
      osilator.stop(simdi + bas + sure + 0.02);
    }
    return true;
  } catch (h) {
    console.warn('[ses] Çalınamadı:', h);
    return false;
  }
}

export const SES_TURLERI = Object.freeze(Object.keys(EFEKTLER));
