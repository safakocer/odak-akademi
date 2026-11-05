// Rehberli işaretçi modu: kelimenin altında ilerleyen işaretçi ve okunan satırı gösteren şerit; satır sonunda yeni satıra geçer
import { okumaAlaniOlustur } from '../reader-engine.js';
import { el } from '../../core/ui.js';

export default {
  ad: 'rehber',
  etiket: 'Rehberli işaretçi',
  sira: 1,
  aciklama: 'Bir işaretçi kelimelerin altından geçer, açık sarı şerit okuduğun satırı gösterir.',
  motor: 'tempolu',
  kontroller: ['wpm'],
  gruplama: () => ({ grupTuru: 'kelime', grupBoyutu: 1 }),

  gorunumOlustur(gruplar, ayar) {
    const alan = okumaAlaniOlustur(gruplar, { ayar, etiket: 'Okuma metni, rehberli işaretçi' });
    const { kok } = alan;
    kok.classList.add('okuma--rehber');
    const serit = el('span', { sinif: 'okuma__serit', 'aria-hidden': 'true' });
    const isaretci = el('span', { sinif: 'okuma__isaretci', 'aria-hidden': 'true' });
    kok.prepend(serit);
    kok.append(isaretci);
    const parcalar = [...kok.querySelectorAll('.okuma__grup')];
    let etkin = -1;
    let satirUst = null;

    // İşaretçiyi ve şeridi etkin kelimeye taşır. Satır değişince işaretçi kaymadan yeni satırın başına atlar
    function konumla(anlik = false) {
      const s = parcalar[etkin];
      if (!s || !kok.isConnected) return;
      const k = kok.getBoundingClientRect();
      const r = s.getBoundingClientRect();
      const sol = r.left - k.left - kok.clientLeft + kok.scrollLeft;
      const ust = r.top - k.top - kok.clientTop + kok.scrollTop;
      const pay = r.height * 0.15;
      const yeniSatir = satirUst === null || Math.abs(ust - satirUst) > r.height / 2;
      isaretci.classList.toggle('okuma__isaretci--atla', anlik || yeniSatir);
      serit.classList.toggle('okuma__serit--atla', anlik || satirUst === null);
      isaretci.style.width = `${r.width}px`;
      isaretci.style.transform = `translate(${sol}px, ${ust + r.height}px)`;
      serit.style.height = `${r.height + pay * 2}px`;
      serit.style.transform = `translateY(${ust - pay}px)`;
      satirUst = ust;
    }

    // Ekran döner ya da yazı boyutu değişirse satırlar yeniden hesaplanır
    const izleyici = typeof ResizeObserver === 'function' ? new ResizeObserver(() => konumla(true)) : null;
    izleyici?.observe(kok);

    return {
      kok,
      grupDegisti(grup, sira) {
        etkin = sira;
        alan.vurgula(sira);
        konumla();
      },
      ayarUygula(a) {
        alan.ayarUygula(a);
        requestAnimationFrame(() => konumla(true));
      },
      kapat() { izleyici?.disconnect(); },
    };
  },
};
