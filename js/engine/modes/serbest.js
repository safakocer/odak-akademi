// Serbest okuma modu: öğrenci kendi hızında okur, süre işler; "Bitirdim" deyince süre ve WPM hesaplanır
import { okumaAlaniOlustur } from '../reader-engine.js';
import { el } from '../../core/ui.js';

// Metin okuma başlamadan ve duraklatılınca gizlenir; böylece ölçülen süre gerçek okuma süresi olur
const PERDE = Object.freeze({
  hazir: 'Metin, okuma başlayınca açılır.',
  duraklatildi: 'Duraklatıldı. Devam edince metin yeniden açılır.',
});

export default {
  ad: 'serbest',
  etiket: 'Serbest okuma',
  sira: 3,
  aciklama: 'Kendi hızında, anlayarak oku. Bitirince “Bitirdim” de; süren ve hızın hesaplansın.',
  motor: 'serbest',
  kontroller: [],
  gruplama: () => ({ grupTuru: 'kelime', grupBoyutu: 4 }),

  gorunumOlustur(gruplar, ayar, yardim) {
    const alan = okumaAlaniOlustur(gruplar, { ayar, etiket: 'Okuma metni' });
    const kutu = el('div', { sinif: 'okuma-serbest', tabindex: '0', role: 'region', 'aria-label': 'Okuma metni, kaydırılabilir' }, alan.kok);
    const perde = el('p', { sinif: 'okuma-serbest__perde', metin: PERDE.hazir });
    const kok = el('div', { sinif: 'okuma-serbest-kap' }, kutu, perde);
    let enCok = 0;

    // İlerleme = metin kutusunda ulaşılan en alt nokta. Metin kutuya sığıyorsa ölçülemez (null)
    function olc() {
      const tasma = kutu.scrollHeight - kutu.clientHeight;
      if (tasma < 8) return null;
      enCok = Math.max(enCok, (kutu.scrollTop / tasma) * 100);
      return enCok;
    }
    const kaydirinca = () => yardim.ilerlemeBildir(olc());
    kutu.addEventListener('scroll', kaydirinca, { passive: true });

    return {
      kok,
      durumDegisti(d) {
        if (PERDE[d]) perde.textContent = PERDE[d];
        if (d === 'okuyor') requestAnimationFrame(kaydirinca); // metin görünür olduktan sonra ölç
      },
      ayarUygula: (a) => alan.ayarUygula(a),
      kapat() { kutu.removeEventListener('scroll', kaydirinca); },
    };
  },
};
