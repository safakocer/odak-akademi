// RSVP (tek nokta) modu: kelimeler ekranın ortasında tek tek belirir; en çok 3 dakikalık deneme, süre dolunca kendiliğinden durur
import { okumaAlaniOlustur } from '../reader-engine.js';
import { el } from '../../core/ui.js';
import { sureBicimle } from '../../core/utils.js';

const SURE_SINIRI_SN = 180;

export default {
  ad: 'rsvp',
  etiket: 'Tek nokta (RSVP denemesi)',
  sira: 4,
  aciklama: 'Kelimeler ekranın ortasında tek tek belirir. En çok 3 dakikalık kısa bir denemedir.',
  uyari: 'Bu mod anlamayı düşürebilir; ana çalışma değildir. Merak ettiğin için kısa bir deneme olarak kullan; asıl çalışmanı diğer modlarla yap.',
  motor: 'tempolu',
  kontroller: ['wpm'],
  sureSiniriSn: SURE_SINIRI_SN,
  gruplama: () => ({ grupTuru: 'kelime', grupBoyutu: 1 }),

  gorunumOlustur(gruplar, ayar, yardim) {
    const alan = okumaAlaniOlustur(gruplar, { ayar, gorunum: 'tek', etiket: 'Okuma metni, kelimeler tek tek' });
    alan.kok.classList.add('okuma--rsvp');
    const kalan = el('p', { sinif: 'okuma-rsvp__kalan' });
    const kok = el('div', { sinif: 'okuma-rsvp' },
      el('p', { sinif: 'okuma-rsvp__uyari', metin: 'Deneme modu: anlamayı düşürebilir, ana çalışma değildir.' }),
      alan.kok, kalan);

    // Kalan deneme süresi (yalnızca okurken geçen süre sayılır)
    const kalanYaz = () => {
      const sn = Math.max(0, Math.ceil((yardim.sureSiniriMs - yardim.gecenMs()) / 1000));
      kalan.textContent = `Deneme süresinden kalan: ${sureBicimle(sn)}`;
    };
    kalanYaz();
    let sayac = 0; // yalnızca okurken çalışır (ayar önizlemesinde çalışmaz)

    return {
      kok,
      grupDegisti: (grup, sira) => alan.vurgula(sira),
      durumDegisti(d) {
        clearInterval(sayac);
        if (d === 'okuyor') sayac = setInterval(kalanYaz, 500);
        kalanYaz();
      },
      ayarUygula: (a) => alan.ayarUygula(a),
      kapat() { clearInterval(sayac); },
    };
  },
};
