// Görsel Arama (S10; D06: geri bildirim duyurulur, sütun sayısı 44 px hedefe göre ekrana uyar): kalabalık içinde hedef şekli bulma; seviyeye göre öğe sayısı ve çeldirici benzerliği artar, her denemede yeni dizilim
import { el } from '../../core/ui.js';
import { sayiBicimle, karistir, dakikaPuani } from '../../core/utils.js';
import { simgeSvg, SEKILLER, SEKIL_ADLARI, RENKLER, renkAdi, rastgeleSec, rastgeleTam, izgaraGezinme, geriYaz } from '../../engine/algi.js';

const DENEME = 12;
const HATA_CEZA_SN = 2;
const HEDEF_PX = 44;  // dokunma hedefi en az 44 px
const ARALIK_PX = 4;  // ızgara boşluğu (stildeki gap ile aynı)
/** tur: belirgin (tek tip çeldirici), renk (aynı renk, başka şekiller), karisik (aynı renk ya da aynı şekil), karisik-don (+ döndürülmüş) */
const SEVIYELER = Object.freeze([
  { ad: 'Kolay', oge: 12, sutun: 4, tur: 'belirgin' },
  { ad: 'Orta', oge: 20, sutun: 5, tur: 'renk' },
  { ad: 'Zor', oge: 30, sutun: 6, tur: 'karisik' },
  { ad: 'Çok zor', oge: 42, sutun: 7, tur: 'karisik-don' },
]);
const etiket = (o) => `${renkAdi(o.renk)} ${SEKILLER[o.sekil].ad}`;

function dizilimUret(sv) {
  const hedef = { sekil: rastgeleSec(SEKIL_ADLARI), renk: rastgeleSec(RENKLER).deger };
  const digerSekil = karistir(SEKIL_ADLARI.filter((a) => a !== hedef.sekil));
  const digerRenk = karistir(RENKLER.map((r) => r.deger).filter((r) => r !== hedef.renk));
  const k = sv.tur === 'karisik-don' ? 3 : 2;
  const celdirici = {
    belirgin: () => ({ sekil: digerSekil[0], renk: digerRenk[0] }),
    renk: () => ({ sekil: rastgeleSec(digerSekil.slice(0, 3)), renk: hedef.renk }),
  }[sv.tur] ?? ((i) => (i % 2
    ? { sekil: hedef.sekil, renk: rastgeleSec(digerRenk.slice(0, k)) }
    : { sekil: rastgeleSec(digerSekil.slice(0, k)), renk: hedef.renk }));
  const don = sv.tur === 'karisik-don';
  const ogeler = [{ ...hedef, hedef: true }, ...Array.from({ length: sv.oge - 1 }, (_, i) => ({ ...celdirici(i), hedef: false }))]
    .map((o) => ({ ...o, aci: don ? rastgeleTam(0, 7) * 45 : 0, boyut: rastgeleTam(78, 100) }));
  return { hedef, ogeler: karistir(ogeler) };
}

export default {
  modul: 'goz',
  egzersiz: 'gorsel-arama',
  ad: 'Görsel Arama',
  ikon: 'arama',
  kisaAciklama: 'Kalabalığın içinde istenen şekli bul. Gözünü düzenli gezdir: satır satır ya da bölüm bölüm.',
  nasil: [
    `Üstte aranacak şekil görünür. Aşağıdaki kalabalıkta onu bul ve dokun. Toplam ${DENEME} deneme var.`,
    'Hem rengi hem şekli aynı olan tek öğe hedeftir. Üst seviyelerde benzer renkler ve şekiller karışır.',
    'Klavyede oklarla gezin, Enter ile seç. Yanlış seçim sorun değil; aramaya devam et.',
  ],
  seviyeler: SEVIYELER,
  otomatikSeviye: true,
  etiketler: { dogru: 'Bulunan', yanlis: 'Yanlış seçim' },
  puanEtiketi: 'Bulunan/dakika',
  puanAciklama: `Dakikada bulunan hedef. Her yanlış seçim süreye ${HATA_CEZA_SN} saniye ekler.`,
  alanEtiketi: 'Görsel arama. Tab ile şekillere geç, oklarla gezin, Enter ile seç.',

  baslat(ctx) {
    const { alan } = ctx;
    const sv = ctx.seviye;
    alan.classList.add('algi-alan', 'arama-alan');
    Object.assign(ctx.ekstra, { oge: sv.oge });

    let deneme = 0;
    let dizilim = null;
    let dugmeler = [];
    let kilit = false;
    let denemeBas = 0;
    const sureler = [];

    const hedefKutu = el('span', { sinif: 'arama-hedef' });
    const hedefAd = el('strong');
    const gorev = el('p', { sinif: 'arama-gorev', 'aria-live': 'polite' }, 'Bunu bul: ', hedefKutu, hedefAd);
    const durum = el('p', { sinif: 'algi-durum' });
    const izgara = el('div', { sinif: 'arama-izgara', role: 'group', 'aria-label': 'Şekiller', style: `--sutun:${sv.sutun}` });
    const geri = el('p', { sinif: 'algi-geri', 'aria-live': 'polite' });
    alan.append(el('div', { sinif: 'algi-ust' }, gorev, durum), izgara, geri);
    // D06: dar ekranda sütun azalır (öğe sayısı aynı, satır artar); her hücre en az 44 px kalır
    let sutun = sv.sutun;
    function sutunAyarla() {
      const st = getComputedStyle(alan);
      const genislik = alan.clientWidth - parseFloat(st.paddingLeft) - parseFloat(st.paddingRight);
      sutun = Math.max(3, Math.min(sv.sutun, Math.floor((genislik + ARALIK_PX) / (HEDEF_PX + ARALIK_PX))));
      izgara.style.setProperty('--sutun', String(sutun));
    }
    const gezinme = izgaraGezinme(izgara, { ogeler: () => dugmeler, sutun: () => sutun });

    const durumYaz = () => { durum.textContent = `Deneme ${deneme}/${DENEME} · Yanlış ${ctx.sayac().yanlis}`; };

    function yeniDeneme() {
      deneme += 1;
      kilit = false;
      dizilim = dizilimUret(sv);
      sutunAyarla();
      hedefKutu.replaceChildren(simgeSvg(dizilim.hedef.sekil, { renk: dizilim.hedef.renk }));
      hedefAd.textContent = etiket(dizilim.hedef);
      const odakIcerde = izgara.contains(document.activeElement);
      dugmeler = dizilim.ogeler.map((o) => el('button', { type: 'button', sinif: 'algi-oge arama-oge', 'aria-label': etiket(o) },
        simgeSvg(o.sekil, { renk: o.renk, aci: o.aci, boyut: o.boyut })));
      izgara.replaceChildren(...dugmeler);
      gezinme.sifirla(odakIcerde);
      denemeBas = ctx.gecenSn();
      durumYaz();
    }

    izgara.addEventListener('click', (e) => {
      const d = e.target.closest('.arama-oge');
      if (!d || kilit || !ctx.aktifMi()) return;
      const o = dizilim.ogeler[dugmeler.indexOf(d)];
      if (o?.hedef) {
        kilit = true;
        sureler.push(ctx.gecenSn() - denemeBas);
        d.dataset.sonuc = 'dogru';
        ctx.dogru(1, 'tik');
        geriYaz(geri, 'dogru', 'Buldun!');
        durumYaz();
        ctx.sonra(() => {
          if (deneme < DENEME) { yeniDeneme(); return; }
          const ort = sureler.reduce((t, s) => t + s, 0) / sureler.length;
          Object.assign(ctx.ekstra, { deneme, ortMs: Math.round(ort * 1000), sureMs: Math.round(ctx.gecenSn() * 1000) });
          ctx.bitir();
        }, 380);
        return;
      }
      ctx.yanlis(1, 'yanlis');
      d.dataset.sonuc = 'yanlis';
      ctx.sonra(() => { delete d.dataset.sonuc; }, 450);
      geriYaz(geri, 'yanlis', `Bu ${o ? etiket(o) : 'şekil'}. Aramaya devam et.`);
      durumYaz();
    });

    yeniDeneme();
  },

  degerlendir({ dogru, yanlis, sureSn, ekstra }) {
    const sn = Math.max(1, (ekstra.sureMs ?? sureSn * 1000) / 1000);
    return {
      puan: dakikaPuani(dogru, sn, yanlis * HATA_CEZA_SN),
      satirlar: [
        ['Öğe sayısı', ekstra.oge ?? '-'],
        ['Ortalama bulma', ekstra.ortMs ? `${sayiBicimle(ekstra.ortMs / 1000, 1)} saniye` : '-'],
      ],
    };
  },

  stil: `
    .arama-gorev { display: flex; align-items: center; gap: var(--b-2); margin: 0; font-size: var(--fs-l); font-weight: 700; }
    .arama-hedef { display: inline-block; inline-size: 2.75rem; block-size: 2.75rem; padding: 0.25rem; border: 2px solid var(--renk-kenar-guclu); border-radius: var(--kose-s); background: var(--renk-yuzey); }
    .arama-izgara {
      display: grid; grid-template-columns: repeat(var(--sutun), minmax(0, 1fr)); gap: 4px;
      inline-size: min(100%, calc(var(--sutun) * 4.5rem)); margin-inline: auto;
    }
    .arama-oge {
      display: grid; place-items: center; aspect-ratio: 1; min-block-size: 44px; min-inline-size: 0; padding: 14%;
      border: 2px solid var(--renk-kenar); border-radius: var(--kose-s); background: var(--renk-yuzey-2);
      cursor: pointer; touch-action: manipulation;
    }
    .arama-oge:focus-visible { outline: 3px solid var(--renk-odak); outline-offset: 1px; position: relative; z-index: 1; }
  `,
};
