// Kelime grubu modu: 2-4 kelimelik (ya da harf uzunluğuna göre) gruplar ritimle sırayla vurgulanır
import { okumaAlaniOlustur } from '../reader-engine.js';

export default {
  ad: 'kelime-grubu',
  etiket: 'Kelime grubu',
  sira: 2,
  aciklama: 'Kelimeler küçük gruplar hâlinde parlar. Grubu tek bakışta görmeye çalış.',
  motor: 'tempolu',
  kontroller: ['wpm', 'grup'],
  grupSiniri: { en: 2, enCok: 4 },

  gorunumOlustur(gruplar, ayar) {
    const alan = okumaAlaniOlustur(gruplar, { ayar, etiket: 'Okuma metni, kelime grupları' });
    alan.kok.classList.add('okuma--grup');
    return {
      kok: alan.kok,
      grupDegisti: (grup, sira) => alan.vurgula(sira),
      ayarUygula: (a) => alan.ayarUygula(a),
    };
  },
};
