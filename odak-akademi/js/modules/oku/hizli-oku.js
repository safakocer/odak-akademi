// Hızlı Oku (deneme): kütüphaneden ya da kendi metinlerinden metin seçimi (ortak metin seçici), okuma modu (Rehberli işaretçi, Kelime grubu, Serbest okuma, RSVP denemesi), ayar paneli, okuma ve hız ölçümü
import { el } from '../../core/ui.js';
import { sayiBicimle, sureMetni } from '../../core/utils.js';
import { metniGrupla, okumaAyarlariniGetir, okumaAyarlariniKaydet, okumaAyarDenetle, tahminiSureSn } from '../../engine/reader-engine.js';
import { modlariYukle, etkinGruplama, okumaSahnesiKur, modSeciciOlustur } from '../../engine/reader-modes.js';
import { okumaAyarPaneliOlustur } from '../../engine/reader-panel.js';
import { sonAnlamaYuzde } from '../../core/metrics.js';
import { metinBankasiYukle, okunduIsaretle } from '../../engine/text-bank.js';
import { metinSeciciOlustur, metinSecimHatasi } from '../../engine/text-picker.js';

const COK_HIZLI_SERBEST = 350; // serbest okumada bunun üstü göz gezdirme olabilir; nazik not gösterilir

// Bu ekranda sunulan modlar (js/engine/modes/<ad>.js). Yeni mod: dosyasını yaz, adını buraya ekle
const MODLAR = await modlariYukle(['rehber', 'kelime-grubu', 'serbest', 'rsvp']);

await metinBankasiYukle(); // S07: metinler kütüphaneden (data/texts) ve öğrencinin kendi metinlerinden

// Tur ve oturum boyunca korunan seçimler (hız ve görünüm ayarları ayrıca okuma:<profilId> anahtarına kaydedilir)
const secim = { mod: 'rehber' };
let ayar = okumaAyarDenetle();
let metin = null;    // seçili metin paketi (text-bank.js)
let turMetni = null; // turu başlayan metin
let secici = null;

const seciliMetin = () => metin?.metin ?? '';
const seciliMod = () => MODLAR.find((t) => t.ad === secim.mod) ?? MODLAR[0];
const toplamKelime = (gruplar) => gruplar.reduce((t, g) => t + g.kelime, 0);
const dakikaKisa = (sn) => `${Math.round(sn / 60)} dk`;

// Açıklama ekranına eklenen ayarlar (çerçevenin formunun içinde)
function hazirlik() {
  ayar = okumaAyarlariniGetir();
  secim.mod = seciliMod()?.ad ?? secim.mod;
  secici = metinSeciciOlustur({
    egzersiz: 'hizli-oku', kimlik: 'ok-ms',
    degisince(m) { metin = m; ozetYaz(); },
  });
  metin = secici.secili();

  // Okuma modu: ortak seçici (uyarısı olan mod seçilince uyarı görünür)
  const modSecici = modSeciciOlustur(MODLAR, {
    kimlik: 'ok', secili: secim.mod,
    degisince(t) { secim.mod = t.ad; panel.modAyarla(t); ozetYaz(); },
  });

  // Ayar paneli: hız, gruplar, kademeli hız, yazı, renk, göz molası + canlı önizleme; değişince profile kaydedilir
  const panel = okumaAyarPaneliOlustur({
    ayar, tanim: seciliMod(), kimlik: 'ok',
    degisince(yeni, { kaydet }) {
      ayar = yeni;
      ozetYaz();
      if (kaydet) okumaAyarlariniKaydet(yeni);
    },
  });

  const ozet = el('p', { sinif: 'okuma-ayar__ozet' });
  const kap = el('div', { sinif: 'okuma-ayar' }, secici.kok, modSecici.kok, panel.kok, ozet);

  function ozetYaz() {
    const tanim = seciliMod();
    const gruplar = metniGrupla(seciliMetin(), tanim ? etkinGruplama(tanim, ayar) : ayar);
    const kelime = toplamKelime(gruplar);
    const grupBilgisi = tanim?.kontroller.includes('grup') ? `, ${sayiBicimle(gruplar.length)} grup` : '';
    if (!kelime) { ozet.textContent = 'Okumak için bir metin seç.'; return; }
    if (tanim?.motor === 'serbest') { ozet.textContent = `“${metin.ad}” · ${sayiBicimle(kelime)} kelime. Süre, “Bitirdim” düğmesine basınca durur.`; return; }
    const sn = tahminiSureSn(kelime, ayar.wpm);
    const sinir = tanim?.sureSiniriSn;
    let bilgi = `${sayiBicimle(kelime)} kelime${grupBilgisi}. Bu hızda yaklaşık ${sureMetni(sn)} sürer`;
    if (sinir && sn > sinir) bilgi = `${sayiBicimle(kelime)} kelime. Deneme en çok ${dakikaKisa(sinir)} sürer; metnin bir kısmını okursun`;
    else if (ayar.kademeli) bilgi += ' (kademeli artışla biraz daha kısa)';
    ozet.textContent = `“${metin.ad}” · ${bilgi}.`;
  }
  ozetYaz();
  return kap;
}

function hazirlikDenetle() {
  if (!MODLAR.length) return 'Okuma modları yüklenemedi. Sayfayı yenileyip yeniden dene.';
  return metinSecimHatasi(secici);
}

// Son ölçülen anlama (Oku ve Anla) %70'in altındaysa kademeli artış kendiliğinden kapanır
function baslat(ctx) {
  turMetni = metin;
  okumaSahnesiKur(ctx, { tanim: seciliMod(), metin: turMetni.metin, ayar: okumaAyarDenetle(ayar), anlamaYuzde: sonAnlamaYuzde({ modul: 'oku' }), ekstra: { metin: turMetni.kimlik } });
}

function degerlendir(ham) {
  const s = ham.ekstra ?? {};
  if (typeof s.wpm !== 'number') return { puan: 0, ilerle: false, mesaj: 'Okuma tamamlanmadı.' };
  const tanim = MODLAR.find((t) => t.ad === s.mod);
  const serbest = s.motor === 'serbest';
  const yarim = s.kelime < s.toplamKelime;
  if (!yarim) okunduIsaretle(s.metin); // sonuna kadar okunduysa kütüphanede “okundu”
  const satirlar = [
    ['Metin', turMetni?.ad ?? '—'],
    ['Okuma modu', tanim?.etiket ?? s.mod],
    ['Okunan kelime', yarim ? `${sayiBicimle(s.kelime)} / ${sayiBicimle(s.toplamKelime)}` : sayiBicimle(s.kelime)],
    ['Ölçülen okuma süresi', `${sayiBicimle(s.sureMs / 1000, 1)} saniye`],
  ];
  if (!serbest) {
    if (s.baslangicWpm !== undefined && s.hedefWpm !== s.baslangicWpm) {
      satirlar.push(['Başlangıç hızı', `${s.baslangicWpm} kelime/dk`], ['Son hız', `${s.hedefWpm} kelime/dk`]);
    } else satirlar.push(['Ayarlanan hız', `${s.hedefWpm} kelime/dk`]);
    if (s.kademeli) satirlar.push(['Kademeli artış', 'Açık']);
    if (s.yavaslatma) satirlar.push(['Yavaşlatma', sayiBicimle(s.yavaslatma)]);
  }
  if (tanim?.kontroller.includes('grup')) satirlar.push(['Grup sayısı', sayiBicimle(s.grupSayisi)]);
  if (s.duraklatma) satirlar.push(['Duraklatma', sayiBicimle(s.duraklatma)]);

  let mesaj;
  if (s.mod === 'rsvp') {
    mesaj = `${s.sureSiniri ? `Deneme süresi (${dakikaKisa(tanim?.sureSiniriSn ?? 180)}) doldu, okuma burada durdu. ` : ''}Tek nokta modu yalnızca bir denemedir: anlamayı düşürebilir. Asıl çalışmanı diğer modlarla yap.`;
  } else if (serbest && s.wpm > COK_HIZLI_SERBEST) mesaj = 'Bu hız çok yüksek görünüyor. Metni atlamadan okuduğundan emin ol; anlamak hızdan önce gelir.';
  else if (serbest) mesaj = 'Bu, bu metindeki kendi okuma hızın. Asıl hedef anlayarak okumak: okuduğunu iki cümleyle birine anlatmayı dene.';
  else mesaj = 'Vurgu ayarladığın hızda ilerledi. Hız tek başına hedef değil; anladığın kadar hızlanmak önemli. Anlamanı ölçmek için “Oku ve Anla” çalışmasını dene.';
  if (!serbest && s.yavaslatma) mesaj += ' Gerektiğinde yavaşlatman çok iyi: rahat okuduğun hızı sen belirledin.';
  return { puan: s.wpm, wpm: s.wpm, satirlar, mesaj, ilerle: false };
}

export default {
  modul: 'oku',
  egzersiz: 'hizli-oku',
  ad: 'Hızlı Oku (deneme)',
  kisaAciklama: 'Okuma modlarını dene. Acele etme; anlayarak okumak hızdan önemlidir.',
  nasil: [
    'Kütüphaneden ya da kendi metinlerinden birini ve bir okuma modu seç. Hız, grup boyu, yazı ve renk ayarlarını önizlemeye bakarak değiştir.',
    'Vurgulu modlarda gözünle işaretçiyi ya da parlayan grubu izle; hızlı gelirse “Yavaşlat”a bas. Serbest okumada kendi hızında oku, bitince “Bitirdim”e bas.',
    'Metin bitince süren ve dakikadaki kelime sayın gösterilir. Üstteki düğmeyle istediğin an duraklatabilirsin.',
  ],
  seviyeler: [{ ad: 'Deneme' }],
  alanEtiketi: 'Okuma alanı',
  puanEtiketi: 'Kelime/dakika',
  puanAciklama: 'Ölçülen okuma hızı',
  sayacYok: true,
  kayitYok: true,
  kayitYokMetni: 'Bu deneme turu kaydedilmez.',
  hazirlik,
  hazirlikDenetle,
  baslat,
  degerlendir,
};
