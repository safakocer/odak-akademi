// Dokun ya da Bekle (Go/No-Go, S11a; S34e: deneme sayısı ve basamaklar sınıf bandından, görsel örnek): yalnız hedef şekle (yıldız) dokun, ötekilerde bekle; hedef oranı, hız ve benzer çeldirici sayısı basamakla artar. Kural şekle dayanır, renk yalnız ek benzerliktir (renk körlüğüne uygun)
import { el } from '../../core/ui.js';
import { karistir } from '../../core/utils.js';
import { simgeSvg, SEKILLER, RENKLER } from '../../engine/algi.js';
import { dikkatOyunu, dikkatTuru, dikkatSahnesi, dokunusBagla, denemePlani, oranliAdet, denemeSayisi } from '../../engine/attention-core.js';
import { ornekListesi } from '../../engine/exercise-frame.js';

const DENEME = 40;
function renk(ad) {
  const r = RENKLER.find((x) => x.ad === ad);
  if (!r) console.warn('[git-dur] algi.js RENKLER içinde yok:', ad);
  return (r ?? RENKLER[0]).deger;
}
const HEDEF = Object.freeze({ sekil: 'yildiz', renk: renk('sarı') });
const basHarf = (m) => m.charAt(0).toLocaleUpperCase('tr-TR') + m.slice(1);

export default dikkatOyunu({
  egzersiz: 'git-dur',
  ad: 'Dokun ya da Bekle',
  ikon: 'git-dur',
  kisaAciklama: 'Hedefi görünce dokun, ötekilerde dur. Beklemek de bir beceri.',
  nasil: [
    'Ortadaki kutuda şekiller tek tek belirir. Yalnız yıldızı görünce kutuya dokun ya da Boşluk tuşuna bas.',
    'Başka bir şekil çıkarsa bekle; hiçbir yere dokunma. Şekil gidince sıradaki gelir.',
    'Üst basamaklarda şekiller daha kısa görünür, yıldız daha sık gelir ve ona benzeyen şekiller çoğalır.',
  ],
  // hedefOrani: yıldız olasılığı (arttıkça dokunma alışkanlığı güçlenir, beklemek zorlaşır); celdirici: [şekil, renk adı]
  basamaklar: [
    { hedefOrani: 0.6, uyaranMs: 1100, pencereMs: 1400, araMs: [700, 1300], celdirici: [['kare', 'mavi']] },
    { hedefOrani: 0.65, uyaranMs: 950, pencereMs: 1250, araMs: [600, 1200], celdirici: [['kare', 'mavi'], ['daire', 'mercan']] },
    { hedefOrani: 0.7, uyaranMs: 800, pencereMs: 1100, araMs: [550, 1100], celdirici: [['kare', 'mavi'], ['daire', 'sarı'], ['elmas', 'mercan']] },
    { hedefOrani: 0.75, uyaranMs: 650, pencereMs: 950, araMs: [500, 1000], celdirici: [['altigen', 'sarı'], ['daire', 'sarı'], ['elmas', 'yeşil'], ['kare', 'mercan']] },
    { hedefOrani: 0.8, uyaranMs: 500, pencereMs: 800, araMs: [450, 900], celdirici: [['altigen', 'sarı'], ['arti', 'sarı'], ['elmas', 'sarı'], ['kalp', 'sarı']] },
  ],
  alanEtiketi: 'Dokun ya da Bekle. Yıldız görünce Boşluk tuşuna bas, başka şekilde bekle.',
  // S34e: kısa yönergede görsel örnek
  ornek: ({ seviye: s }) => {
    const [sekil, r] = s.celdirici[0];
    return ornekListesi([
      { cizim: simgeSvg(HEDEF.sekil, { renk: HEDEF.renk }), metin: 'Yıldız: dokun' },
      { cizim: simgeSvg(sekil, { renk: renk(r) }), metin: `${basHarf(SEKILLER[sekil].ad)}: bekle` },
    ]);
  },

  baslat(ctx) {
    const s = ctx.seviye;
    const deneme = denemeSayisi(ctx, DENEME); // S17: seviye testi (ctx.olcum); S34e: alıştırma ve sınıf bandı
    const hedefSayisi = oranliAdet(deneme, s.hedefOrani);
    const durSayisi = deneme - hedefSayisi;
    Object.assign(ctx.ekstra, { hedefSayisi, durSayisi, celdirici: s.celdirici.length });

    const gorev = el('p', { sinif: 'gng-gorev' }, 'Yalnız buna dokun: ',
      el('span', { sinif: 'gng-hedef', 'aria-hidden': 'true' }, simgeSvg(HEDEF.sekil, { renk: HEDEF.renk })),
      el('strong', { metin: SEKILLER[HEDEF.sekil].ad }));
    const sahneDuzen = dikkatSahnesi(ctx, { ust: gorev, sahneSinif: 'gng-sahne' });
    const { sahne } = sahneDuzen;
    const odak = el('span', { sinif: 'dikkat-odak', 'aria-hidden': 'true', metin: '+' });
    const uyaran = el('div', { sinif: 'gng-uyaran', hidden: true });
    sahne.append(odak, uyaran);

    // Çeldiriciler eşit dağılır; bekle denemesi art arda en çok 2, hedef en çok 6
    const celdiriciler = karistir(Array.from({ length: durSayisi }, (_, i) => s.celdirici[i % s.celdirici.length]));
    const plan = denemePlani({ git: hedefSayisi, dur: durSayisi }, { enCokArdisik: { git: 6, dur: 2 } }).map((tur) => (tur === 'git'
      ? { tur, beklenen: 'tepki', sekil: HEDEF.sekil, renk: HEDEF.renk }
      : (([sekil, r]) => ({ tur, beklenen: 'bekle', sekil, renk: renk(r) }))(celdiriciler.pop())));

    const tur = dikkatTuru(ctx, {
      plan, uyaranMs: s.uyaranMs, pencereMs: s.pencereMs, araMs: s.araMs, geriMs: 250,
      ilerleme: sahneDuzen.ilerle,
      goster(d) {
        sahneDuzen.temizle();
        delete sahne.dataset.sonuc;
        uyaran.replaceChildren(simgeSvg(d.sekil, { renk: d.renk }));
        odak.hidden = true;
        uyaran.hidden = false;
      },
      gizle() { uyaran.hidden = true; odak.hidden = false; },
      sonucta(k, d) {
        if (k.sonuc === 'dogru' && k.beklenen === 'tepki') {
          ctx.ses('tik');
          sahne.dataset.sonuc = 'dogru';
          sahneDuzen.geriYaz('dogru', 'Yakaladın');
        } else if (k.sonuc === 'dogru') {
          sahneDuzen.geriYaz('dogru', 'İyi bekledin');
        } else if (k.sonuc === 'yanlis') {
          ctx.ses('yanlis');
          sahne.dataset.sonuc = 'yanlis';
          sahneDuzen.geriYaz('yanlis', `Bu bir ${SEKILLER[d.sekil].ad} idi. Beklemek de bir beceri.`);
        } else if (k.sonuc === 'atlandi') {
          sahneDuzen.geriYaz('yanlis', 'Yıldız kaçtı. Bir sonrakine hazır ol.');
        } else {
          sahneDuzen.geriYaz('yanlis', d ? 'Çok erken oldu. Önce bak, sonra dokun.' : 'Şekil çıkmadan dokundun. Önce bak, sonra dokun.');
        }
      },
      bitince(oz, kayitlar) {
        ctx.ekstra.hataliDokunma = kayitlar.filter((k) => k.beklenen === 'bekle' && k.sonuc !== 'dogru').length;
        ctx.ekstra.atlananHedef = kayitlar.filter((k) => k.beklenen === 'tepki' && k.sonuc === 'atlandi').length;
      },
    });

    dokunusBagla(ctx, sahne, tur); // sahneye dokunuş ya da Boşluk/Enter
  },

  ekSatirlar: (e) => [
    ['Hatalı dokunma', `${e.hataliDokunma ?? 0}/${e.durSayisi ?? 0}`],
    ['Atlanan hedef', `${e.atlananHedef ?? 0}/${e.hedefSayisi ?? 0}`],
  ],

  stil: `
    .gng-gorev { display: flex; flex-wrap: wrap; align-items: center; gap: var(--b-2); margin: 0; font-size: var(--fs-l); font-weight: 700; }
    .gng-hedef { display: inline-block; inline-size: 2.5rem; block-size: 2.5rem; }
    .gng-sahne { cursor: pointer; transition: box-shadow var(--sure-hizli) ease-out; }
    .gng-uyaran { inline-size: min(46vw, 10rem); block-size: min(46vw, 10rem); }
    /* Geri bildirim sade: yalnız ince kenar (doğru düz, yanlış kesik çizgi; renge dayanmaz), zemin değişmez */
    .gng-sahne[data-sonuc="dogru"] { box-shadow: inset 0 0 0 3px var(--renk-basari); }
    .gng-sahne[data-sonuc="yanlis"] { outline: 3px dashed var(--renk-vurgu-metin); outline-offset: -6px; }
    @media (forced-colors: active) { .gng-sahne[data-sonuc] { outline: 3px solid Highlight; } }
  `,
});
