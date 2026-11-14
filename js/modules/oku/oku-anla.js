// Oku ve Anla (S19: kurs dersinde mod ve hedef hız kurstan gelir; S34a: modlar ve kademeli hız sınıf bandına göre; S34b: soru sayısı metne göre 3-6; S35b: sonuçta soru yolculuğu, zor basamaktaki doğrular kazanım): kütüphaneden (ya da kendi sorulu metinlerinden) metin seç, seçilen modla oku, ardından anlama soruları; sonuçta hız, anlama %, EOH, katman yolculuğu ve gözden geçirme
import { el } from '../../core/ui.js';
import { sayiBicimle, sureMetni, yuzdeBicimle } from '../../core/utils.js';
import { eohHesapla, sonAnlamaYuzde } from '../../core/metrics.js';
import { okumaAyarlariniGetir, okumaAyarlariniKaydet, okumaAyarDenetle, tahminiSureSn } from '../../engine/reader-engine.js';
import { modlariYukle, okumaSahnesiKur, modSeciciOlustur, sinifaUygunModlar, kademeliSatiriniGizle } from '../../engine/reader-modes.js';
import { bantlariYukle } from '../../core/siniflar.js';
import { okumaAyarPaneliOlustur } from '../../engine/reader-panel.js';
import { soruOturumuKur, katmanOzetiOlustur, gozdenGecirmeOlustur, zorKatmanKazanimlari, KATMANLAR, ANLAMA_ESIGI } from '../../engine/quiz-engine.js';
import { metinBankasiYukle, okunduIsaretle } from '../../engine/text-bank.js';
import { metinSeciciOlustur, metinSecimHatasi } from '../../engine/text-picker.js';

// RSVP (tek nokta) burada yok: anlamayı düşürebildiği için anlama ölçümüne uygun değil
const TUM_MODLAR = await modlariYukle(['rehber', 'kelime-grubu', 'serbest']);
await bantlariYukle(); // S34a: sınıf bantları (varsayılan hız, izinli modlar, kademeli hız)
let MODLAR = TUM_MODLAR; // S34a: her hazırlıkta etkin profilin sınıfına göre süzülür
await metinBankasiYukle(); // S07: metinler data/texts/sinif<N>.json'dan (S34c’den beri 2-8. sınıfın hepsi); yüklenemezse yalnız kendi sorulu metinleri seçilebilir
const soruluMu = (m) => m.sorular.length > 0;

const secim = { mod: 'serbest', metneBak: false }; // metne bakma varsayılan kapalı
let ayar = okumaAyarDenetle();
let sonDetay = null; // ayrıntılı cevaplar yalnızca bellekte; kayda özet yazılır
let metin = null;     // seçili metin paketi (text-bank.js)
let turMetni = null;  // turu başlayan metin (sonuç ekranı için)
let secici = null;

let kursDersi = false; // S19: kurs dersinde metne bakma kapalı
let kursMod = null; // S19: kurs dersinde mod kurstan gelir (öğrencinin kendi mod seçimi korunur)
const seciliMod = () => MODLAR.find((t) => t.ad === (kursMod ?? secim.mod)) ?? MODLAR[0];

// S19: kurs dersi: mod ve hedef hız kurstan gelir, ekranda değiştirilemez (metni kurs sayfası önceden seçer)
function kursAyariniUygula(kurs) {
  kursMod = null;
  kursDersi = !!kurs?.ayar;
  if (!kurs?.ayar) return false;
  kursMod = MODLAR.some((t) => t.ad === kurs.ayar.okumaModu) ? kurs.ayar.okumaModu : null;
  ayar = okumaAyarDenetle({ ...ayar, ...(typeof kurs.ayar.wpm === 'number' ? { wpm: kurs.ayar.wpm } : {}), kademeli: false });
  return true;
}

function hazirlik({ kurs } = {}) {
  MODLAR = sinifaUygunModlar(TUM_MODLAR);
  ayar = okumaAyarlariniGetir();
  const kursta = kursAyariniUygula(kurs);
  if (!kursta) secim.mod = seciliMod()?.ad ?? secim.mod;
  secici = metinSeciciOlustur({
    egzersiz: 'oku-anla', kimlik: 'oa-ms', suzgec: soruluMu,
    degisince(m) { metin = m; ozetYaz(); },
  });
  metin = secici.secili();

  // Okuma modu: ortak seçici
  const modSecici = modSeciciOlustur(MODLAR, {
    kimlik: 'oa', secili: secim.mod,
    degisince(t) { secim.mod = t.ad; panel.modAyarla(t); kademeliSatiriniGizle(panel.kok); ozetYaz(); },
  });

  const panel = okumaAyarPaneliOlustur({
    ayar, tanim: seciliMod(), kimlik: 'oa',
    degisince(yeni, { kaydet }) {
      ayar = yeni;
      ozetYaz();
      if (kaydet) okumaAyarlariniKaydet(yeni);
    },
  });

  kademeliSatiriniGizle(panel.kok); // S34a: sınıf bandı izin vermezse kademeli hız satırı gizlenir (S34a-d’den beri her sınıfta öğrenci isterse açar)
  const metneBak = el('input', { type: 'checkbox', name: 'oa-metne-bak', 'aria-describedby': 'oa-metne-bak-not' });
  metneBak.checked = secim.metneBak;
  const metneBakKutu = el('div', { sinif: 'okuma-ayar__satir' },
    el('label', { sinif: 'okuma-ayar__secenek okuma-ayar__anahtar' }, metneBak, el('span', { metin: 'Sorular sırasında metne yeniden bakabileyim' })),
    el('p', { id: 'oa-metne-bak-not', sinif: 'okuma-ayar__not', metin: 'Kapalıyken anlaman daha gerçekçi ölçülür. Açarsan bu, sonuçta belirtilir.' }));

  const ozet = el('p', { sinif: 'okuma-ayar__ozet' });
  function ozetYaz() {
    const tanim = seciliMod();
    if (!metin) { ozet.textContent = 'Okumak için bir metin seç.'; return; }
    const hiz = kursta ? `${tanim?.etiket ?? ''} modunda ${ayar.wpm} kelime/dk (kurs hedefi). ` : '';
    const sure = tanim?.motor === 'serbest' ? `${kursta ? `${tanim.etiket} modunda k` : 'K'}endi hızında okursun` : `${hiz}Bu hızda okuma yaklaşık ${sureMetni(tahminiSureSn(metin.kelime, ayar.wpm))} sürer`;
    const kendi = metin.kaynak === 'kendi' ? ' (soruları sen yazdın)' : '';
    ozet.textContent = `“${metin.ad}” · ${sayiBicimle(metin.kelime)} kelime. ${sure}; ardından ${metin.sorular.length} soru gelir${kendi}.`;
  }

  // S19: kurs dersinde mod, hız ve metne bakma kilitli (ölçüm adil kalsın); yalnız metin seçilebilir
  const kap = kursta
    ? el('div', { sinif: 'okuma-ayar' }, secici.kok, ozet)
    : el('div', { sinif: 'okuma-ayar' }, secici.kok, modSecici.kok, panel.kok, metneBakKutu, ozet);
  metneBak.addEventListener('change', () => { secim.metneBak = metneBak.checked; });
  ozetYaz();
  return kap;
}

function hazirlikDenetle() {
  if (!MODLAR.length) return 'Okuma modları yüklenemedi. Sayfayı yenileyip yeniden dene.';
  return metinSecimHatasi(secici, { sorulu: true });
}

// Okuma bitince (ctx.bitir yerine) sorular gelir; son anlama %70 altındaysa kademeli hız kendiliğinden kapalıdır
function baslat(ctx) {
  sonDetay = null;
  turMetni = metin;
  const a = okumaAyarDenetle(ayar);
  okumaSahnesiKur(ctx, {
    tanim: seciliMod(), metin: turMetni.metin, ayar: a, anlamaYuzde: sonAnlamaYuzde({ modul: 'oku' }),
    ekstra: { metin: turMetni.kimlik, kaynak: turMetni.kaynak, sinif: turMetni.sinif },
    bitince: () => sorulariBaslat(ctx, a),
  });
}

function sorulariBaslat(ctx, a) {
  ctx.alan.replaceChildren();
  ctx.alan.setAttribute('aria-label', 'Anlama soruları');
  const oturum = soruOturumuKur(ctx.alan, {
    sorular: turMetni.sorular, metin: turMetni.metin, ayar: a, metinGorunur: !kursDersi && secim.metneBak, aktifMi: ctx.aktifMi,
    bitince(sonuc) {
      sonDetay = sonuc;
      const { anlama } = sonuc;
      ctx.ekstra.anlama = {
        yuzde: anlama.yuzde, puan: anlama.puan, soru: anlama.soruSayisi, dogru: anlama.dogruSayisi,
        katman: Object.fromEntries(Object.entries(anlama.katmanlar).map(([k, d]) => [k, d.yuzde])),
        metinGorunur: sonuc.metinGorunur, metneBakis: sonuc.metneBakis,
      };
      ctx.bitir();
    },
  });
  ctx.temizlenince(() => oturum.iptal());
}

function degerlendir(ham) {
  const s = ham.ekstra ?? {};
  const d = sonDetay;
  if (typeof s.wpm !== 'number' || !d) return { puan: 0, ilerle: false, mesaj: 'Tur tamamlanmadı. Hazır olduğunda yeniden dene.' };
  const anlama = d.anlama.yuzde;
  const eoh = eohHesapla(s.wpm, anlama);
  const n = d.anlama.soruSayisi;
  const tanim = TUM_MODLAR.find((t) => t.ad === s.mod);
  const dusuk = anlama < ANLAMA_ESIGI;

  okunduIsaretle(s.metin, { anlamaYuzde: anlama }); // kütüphanede “okundu” ve en iyi anlama
  const satirlar = [
    ['Metin', turMetni?.ad ?? '—'],
    ['Okuma hızı', `${s.wpm} kelime/dk`],
    ['Anlama', yuzdeBicimle(anlama)],
    ['EOH hesabı', `${s.wpm} × ${yuzdeBicimle(anlama)} = ${eoh}`],
    ['Soru puanı', `${sayiBicimle(d.anlama.puan, 1)} / ${n}`],
    ['Okuma süresi', sureMetni(s.sureMs / 1000)],
    ['Toplam süre', sureMetni(ham.sureSn)],
    ['Okuma modu', tanim?.etiket ?? s.mod],
  ];
  if (d.metinGorunur) satirlar.push(['Metne bakma', d.metneBakis ? `Açık (${d.metneBakis} kez)` : 'Açık']);

  // S35b: zor basamaktaki (çıkarım, yorum) doğrular, anlama düşük olsa da kazanım olarak söylenir; soruların zorluğu değişmez
  const kazanimlar = zorKatmanKazanimlari(d.anlama);
  const kazanimMetni = kazanimlar.length
    ? ` Zor basamakta kazanımın var: ${kazanimlar.map((x) => `${KATMANLAR[x.katman].etiket.toLocaleLowerCase('tr-TR')} sorularında ${x.dogru} doğru`).join(', ')}.`
    : '';
  const mesaj = (dusuk
    ? `Anlaman henüz %${ANLAMA_ESIGI}’in altında. Bu çok normal; aşağıdaki ipuçlarıyla bir sonraki okumada daha iyi anlayabilirsin.`
    : 'Anlaman %70 ve üstünde. Bir sonraki hedef: aynı anlamayı koruyarak biraz daha akıcı okumak.') + kazanimMetni;
  const oneri = dusuk && el('div', { sinif: 'anlama-oneri', role: 'note' },
    el('p', {}, el('strong', { metin: 'Bir sonraki hedef: hızı artırma, anlamayı güçlendir. ' })),
    el('ul', {},
      el('li', { metin: 'Bir sonraki okumada hızını biraz düşür ya da Serbest okumayı seç.' }),
      el('li', { metin: 'Her paragraftan sonra kısa dur ve “Burada ne anlatıldı?” diye kendine sor.' }),
      el('li', { metin: `Kademeli hız artışı, anlaman yeniden %${ANLAMA_ESIGI}’e ulaşana kadar kendiliğinden kapalı kalır.` })));
  const ek = el('div', { sinif: 'anlama-sonuc' }, oneri, katmanOzetiOlustur(d.anlama), gozdenGecirmeOlustur(d));

  return {
    puan: eoh, wpm: s.wpm, anlamaYuzde: anlama, eoh,
    dogru: d.anlama.dogruSayisi, yanlis: n - d.anlama.dogruSayisi, isabet: anlama,
    satirlar, mesaj, ek, ilerle: false,
  };
}

export default {
  modul: 'oku',
  egzersiz: 'oku-anla',
  ad: 'Oku ve Anla',
  kisaAciklama: 'Metni anlayarak oku, sonra soruları yanıtla. Hız ve anlama birlikte ölçülür.',
  nasil: [
    'Bir metin, okuma modu ve hız seç. Sorularda metne yeniden bakmak istersen ayarı aç; kapalıyken ölçüm daha gerçekçidir.',
    'Metni oku. Bitince sınıfına göre 3-6 soru gelir: çoktan seçmeli, doğru/yanlış, boşluk doldurma, sıralama ve kısa cevap. Kendi metninde senin yazdığın sorular gelir.',
    'Sonuçta okuma hızın, anlama yüzden ve Etkin Okuma Hızın (EOH) görünür. Yanlışlarını açıklamalarıyla gözden geçirebilirsin.',
  ],
  seviyeler: [{ ad: 'Oku ve Anla' }],
  alanEtiketi: 'Okuma alanı',
  puanEtiketi: 'Etkin Okuma Hızı (EOH)',
  puanAciklama: 'EOH = okuma hızı × anlama oranı',
  sayacYok: true,
  hazirlik,
  hazirlikDenetle,
  baslat,
  degerlendir,
};
