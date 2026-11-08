// Kütüphane sayfası (#/kutuphane; S25: seçicide kimlik kaçışlı; S28: boş durumda çocuk görünümünde Fener balonu; S34b: sınıf filtresinde yalnız metni olan sınıflar, seviye noktaları kademeye göre; S34b-d: ilkokulda sınıf filtresi önce öğrencinin sınıfı, “süzgeç” yerine “filtre”; S34-son: uzunluk seçenekleri kademeye göre): sınıf metinleri ve kendi metinlerin; arama, sınıf/tür/uzunluk/durum filtreleri, favoriler, seviye göstergesi; kendi metnini ekle, düzenle, sil
import { el, spriteIkon, toastGoster } from '../../core/ui.js';
import { duyur, odakla } from '../../core/a11y.js';
import { git } from '../../core/router.js';
import { etkinProfil } from '../../core/store.js';
import { kademe } from '../../core/siniflar.js';
import { sayiBicimle, dakikaMetni, boslukTemizle } from '../../core/utils.js';
import { okumaAyarlariniGetir, tahminiSureSn } from '../../engine/reader-engine.js';
import {
  metinBankasiYukle, metinBankasiDurumu, tumMetinler, metinleriSuz, METIN_TURLERI, uzunluklar, METIN_DOSYASI_OLAN_SINIFLAR, ZORLUK_DERECESI,
  favoriMi, favoriDegistir, okumaBilgisi, seviyeBilgisi, profilSinifi, secimAyarla, kendiMetniSil,
} from '../../engine/text-bank.js';
import { metinFormuAc } from './metin-formu.js';
import { bosDurum } from '../../engine/fener.js';

// Filtreler sayfa değişse de (uygulama açıkken) hatırlanır; profil ya da sınıf değişince varsayılana döner
const BOS_FILTRE = Object.freeze({ arama: '', sinif: '', tur: '', uzunluk: '', durum: '', favori: false });
const filtre = { ...BOS_FILTRE };
let filtreProfili; // filtrenin ayarlandığı “profilId:sınıf” (ilk açılışta tanımsız)

// S34b-d: ilkokulda sınıf filtresi önce öğrencinin sınıfıdır (metni varsa); ortaokulda tüm sınıflar. Öğrenci değiştirebilir ya da temizleyebilir.
function profilFiltresiniAyarla() {
  const p = etkinProfil();
  const anahtar = `${p?.id ?? ''}:${p?.sinif ?? ''}`;
  if (anahtar === filtreProfili) return;
  filtreProfili = anahtar;
  const kendiSinifi = kademe(p?.sinif) === 'ilkokul' && METIN_DOSYASI_OLAN_SINIFLAR.includes(p.sinif);
  Object.assign(filtre, BOS_FILTRE, { sinif: kendiSinifi ? String(p.sinif) : '' });
}
let sayfa = null; // { kap, liste, sayi, ekleDugme }

const OZET_KARAKTER = 140;
function kisaOzet(metin) {
  const m = boslukTemizle(metin);
  if (m.length <= OZET_KARAKTER) return m;
  const kes = m.slice(0, OZET_KARAKTER);
  return `${kes.slice(0, kes.lastIndexOf(' ') > 80 ? kes.lastIndexOf(' ') : OZET_KARAKTER)}…`;
}

// Egzersizi bu metinle açar (adres elle yazılmaz; kart düğmesi yönlendirir)
function metniAc(egzersiz, m) {
  secimAyarla(egzersiz, m.kimlik);
  git(`/egzersiz/${egzersiz}`);
}

// Seviye göstergesi: kademe içinde nokta (S34b: ilkokul 3, ortaokul 4) + öğrencinin sınıfına göre etiket
function seviyeGostergesi(m) {
  const s = seviyeBilgisi(m);
  if (!s.derece) return el('span', { sinif: 'rozet rozet--vurgu', metin: s.etiket });
  return el('span', { sinif: 'seviye-gosterge' },
    el('span', { sinif: 'seviye-gosterge__noktalar', role: 'img', 'aria-label': `Seviye ${s.derece} / ${s.toplam} (${m.sinif}. sınıf)` },
      Array.from({ length: s.toplam }, (_, i) => el('span', { sinif: 'seviye-gosterge__nokta', 'data-dolu': i < s.derece ? '' : null }))),
    el('span', { sinif: 'seviye-gosterge__etiket', metin: s.etiket }));
}

function durumRozeti(m) {
  const b = okumaBilgisi(m.kimlik);
  if (!b) return el('span', { sinif: 'rozet', metin: 'Okunmadı' });
  const anlama = b.enIyiAnlama !== undefined ? ` · en iyi anlama %${b.enIyiAnlama}` : '';
  return el('span', { sinif: 'rozet rozet--basari', metin: `✓ Okundu${b.sayi > 1 ? ` (${b.sayi} kez)` : ''}${anlama}` });
}

function favoriDugmesi(m) {
  const d = el('button', { type: 'button', sinif: 'btn btn--hayalet btn--ikon metin-karti__favori', 'aria-pressed': String(favoriMi(m.kimlik)),
    'aria-label': `Favori: ${m.ad}`, title: 'Favorilere ekle / çıkar' }, spriteIkon('yildiz', 'ikon'));
  d.addEventListener('click', () => {
    const yeni = favoriDegistir(m.kimlik);
    if (yeni === null) { toastGoster('Favori eklemek için önce bir profil oluştur.', { tur: 'bilgi' }); return; }
    d.setAttribute('aria-pressed', String(yeni));
    duyur(yeni ? `${m.ad} favorilere eklendi.` : `${m.ad} favorilerden çıkarıldı.`);
    if (filtre.favori && !yeni) listeyiCiz({ odak: 'liste' });
  });
  return d;
}

function metinKarti(m, wpm) {
  const id = `metin-${m.kimlik}`;
  const kendi = m.kaynak === 'kendi';
  const sorulu = m.sorular.length > 0;
  const bilgi = [m.sinif ? `${m.sinif}. sınıf` : null, METIN_TURLERI[m.tur], m.zorluk ? `zorluk ${m.zorluk}/${ZORLUK_DERECESI}` : null,
    `${sayiBicimle(m.kelime)} kelime`, `yaklaşık ${dakikaMetni(tahminiSureSn(m.kelime, wpm))}`].filter(Boolean).join(' · ');
  const konular = m.etiketler?.length ? el('p', { sinif: 'metin-karti__bilgi soluk', metin: `Konular: ${m.etiketler.join(', ')}` }) : null;
  const eylemler = [
    sorulu && el('button', { type: 'button', sinif: 'btn btn--birincil btn--kucuk', 'aria-describedby': id, onclick: () => metniAc('oku-anla', m) },
      'Oku ve Anla'),
    el('button', { type: 'button', sinif: `btn ${sorulu ? 'btn--ikincil' : 'btn--birincil'} btn--kucuk`, 'aria-describedby': id, onclick: () => metniAc('hizli-oku', m) },
      'Hızlı Oku ile oku'),
    kendi && el('button', { type: 'button', sinif: 'btn btn--hayalet btn--kucuk', 'aria-label': `Düzenle: ${m.ad}`,
      onclick: (e) => metinFormuAc({ metin: m, acici: e.currentTarget, kaydedince: kaydedildi }) },
    spriteIkon('kalem', 'ikon ikon--kucuk'), 'Düzenle'),
    kendi && el('button', { type: 'button', sinif: 'btn btn--hayalet btn--kucuk tehlike-metin', 'aria-label': `Sil: ${m.ad}`, onclick: () => metniSil(m) },
      spriteIkon('cop', 'ikon ikon--kucuk'), 'Sil'),
  ];
  return el('li', { 'data-kimlik': m.kimlik },
    el('article', { sinif: 'kart metin-karti', 'aria-labelledby': id },
      el('div', { sinif: 'metin-karti__ust' }, el('h3', { id, sinif: 'metin-karti__baslik', metin: m.ad }), favoriDugmesi(m)),
      el('p', { sinif: 'metin-karti__bilgi', metin: bilgi }),
      ...(konular ? [konular] : []),
      seviyeGostergesi(m),
      el('p', { sinif: 'metin-karti__ozet', metin: kisaOzet(m.metin) }),
      el('div', { sinif: 'metin-karti__durum' }, durumRozeti(m),
        el('span', { sinif: 'rozet', metin: sorulu ? `${m.sorular.length} soru` : 'Sorusuz' })),
      el('div', { sinif: 'metin-karti__eylemler' }, eylemler)));
}

function listeyiCiz({ odak } = {}) {
  if (!sayfa) return;
  const wpm = okumaAyarlariniGetir().wpm;
  const bulunan = metinleriSuz(tumMetinler(), filtre);
  sayfa.liste.replaceChildren(...bulunan.map((m) => metinKarti(m, wpm)));
  sayfa.sayi.textContent = bulunan.length ? `${bulunan.length} metin bulundu.` : 'Bu filtrelere uyan metin yok.';
  sayfa.bos.hidden = bulunan.length > 0;
  if (odak === 'liste') odakla(sayfa.sayi);
}

function kaydedildi(m, yeni) {
  toastGoster(yeni ? 'Metnin kütüphaneye eklendi.' : 'Değişiklikler kaydedildi.', { tur: 'basari' });
  // Yeni metin görünsün diye filtre ona engel olmasın
  if (yeni) Object.assign(filtre, BOS_FILTRE, { tur: 'kendi' });
  filtreFormunuDoldur();
  listeyiCiz();
  const kart = sayfa?.liste.querySelector(`li[data-kimlik="${CSS.escape(m.kimlik)}"] .metin-karti__eylemler .btn`);
  if (kart) odakla(kart);
}

function metniSil(m) {
  if (!confirm(`“${m.ad}” metni silinsin mi? Bu işlem geri alınamaz.`)) return;
  if (!kendiMetniSil(m.kimlik)) { toastGoster('Metin silinemedi. Yeniden dene.', { tur: 'hata' }); return; }
  toastGoster('Metin silindi.', { tur: 'basari' });
  listeyiCiz();
  odakla(sayfa.ekleDugme);
}

// ---------- Filtre formu ----------
let alanlar = null;
function secimKutusu(ad, etiket, secenekler) {
  const kutu = el('select', { sinif: 'girdi', id: `kt-${ad}`, name: ad },
    secenekler.map(([v, m]) => el('option', { value: String(v), metin: m })));
  return [kutu, el('div', { sinif: 'alan' }, el('label', { sinif: 'alan__etiket', for: `kt-${ad}`, metin: etiket }), kutu)];
}

function filtreFormunuDoldur() {
  if (!alanlar) return;
  alanlar.arama.value = filtre.arama;
  alanlar.sinif.value = String(filtre.sinif);
  alanlar.tur.value = filtre.tur;
  alanlar.uzunluk.value = filtre.uzunluk;
  alanlar.durum.value = filtre.durum;
  alanlar.favori.checked = filtre.favori;
}

function filtreFormu() {
  const ps = profilSinifi();
  const arama = el('input', { type: 'search', sinif: 'girdi', id: 'kt-arama', name: 'arama', autocomplete: 'off', placeholder: 'Başlık, metin ya da konu ara' });
  const [sinif, sinifAlan] = secimKutusu('sinif', 'Sınıf', [['', 'Tüm sınıflar'],
    ...METIN_DOSYASI_OLAN_SINIFLAR.map((s) => [s, s === ps ? `${s}. sınıf (senin sınıfın)` : `${s}. sınıf`])]); // S34b: metni olmayan sınıf seçilip boş liste görünmesin
  const [tur, turAlan] = secimKutusu('tur', 'Tür', [['', 'Tüm türler'], ...Object.entries(METIN_TURLERI).map(([k, v]) => [k, k === 'kendi' ? 'Kendi metinlerim' : v])]);
  const [uzunluk, uzunlukAlan] = secimKutusu('uzunluk', 'Uzunluk', [['', 'Tüm uzunluklar'], ...uzunluklar().map((u) => [u.ad, u.etiket])]); // S34-son: kademeye göre
  const [durum, durumAlan] = secimKutusu('durum', 'Durum', [['', 'Hepsi'], ['okunmadi', 'Okunmadı'], ['okundu', 'Okundu']]);
  const favori = el('input', { type: 'checkbox', name: 'favori', id: 'kt-favori' });
  const temizle = el('button', { type: 'button', sinif: 'btn btn--hayalet btn--kucuk', metin: 'Filtreleri temizle' });
  alanlar = { arama, sinif, tur, uzunluk, durum, favori };

  const form = el('form', { sinif: 'kart kutuphane-suzgec', role: 'search', 'aria-label': 'Metinleri filtrele' },
    el('div', { sinif: 'alan kutuphane-suzgec__arama' }, el('label', { sinif: 'alan__etiket', for: 'kt-arama', metin: 'Ara' }), arama),
    sinifAlan, turAlan, uzunlukAlan, durumAlan,
    el('div', { sinif: 'kutuphane-suzgec__alt' },
      el('label', { sinif: 'secim', for: 'kt-favori' }, favori, el('span', {}, spriteIkon('yildiz', 'ikon ikon--kucuk'), ' Yalnız favorilerim')),
      temizle));
  form.addEventListener('submit', (e) => e.preventDefault());
  const guncelle = () => {
    Object.assign(filtre, { arama: arama.value, sinif: sinif.value, tur: tur.value, uzunluk: uzunluk.value, durum: durum.value, favori: favori.checked });
    listeyiCiz();
  };
  // Aramada her tuşta liste baştan çizilmesin ve sayı her harfte duyurulmasın: yazma bitince (300 ms) güncellenir
  let aramaSayac = 0;
  form.addEventListener('input', (e) => {
    clearTimeout(aramaSayac);
    if (e.target === arama) aramaSayac = setTimeout(guncelle, 300);
    else guncelle();
  });
  form.addEventListener('change', (e) => { if (e.target !== arama) guncelle(); });
  temizle.addEventListener('click', () => {
    clearTimeout(aramaSayac);
    Object.assign(filtre, BOS_FILTRE);
    filtreFormunuDoldur();
    listeyiCiz();
    arama.focus();
  });
  return form;
}

/** Kütüphane sayfasını kaba çizer (yönlendirici her açılışta çağırır; okundu bilgisi tazelenir) */
export async function kutuphaneSayfasiCiz(kap) {
  if (!kap) return;
  if (!kap.firstChild) kap.replaceChildren(el('p', { sinif: 'soluk', metin: 'Metinler yükleniyor…' }));
  await metinBankasiYukle();

  const ekleDugme = el('button', { type: 'button', sinif: 'btn btn--gunes' }, spriteIkon('kalem', 'ikon'), 'Kendi metnini ekle');
  ekleDugme.addEventListener('click', () => metinFormuAc({ acici: ekleDugme, kaydedince: kaydedildi }));
  const durum = metinBankasiDurumu();
  const uyari = !durum.yuklendi && el('div', { sinif: 'bildirim bildirim--uyari', role: 'note' },
    el('p', { metin: 'Sınıf metinleri yüklenemedi. Uygulamayı yerel sunucuyla ya da internet adresinden açtığından emin ol ve sayfayı yenile. Kendi metinlerin yine de burada.' }));
  const sayi = el('p', { sinif: 'kutuphane__sayi soluk', 'aria-live': 'polite', tabindex: '-1' });
  const liste = el('ul', { sinif: 'metin-listesi', 'aria-label': 'Metinler' });
  const bos = bosDurum('Bu filtrelere uyan metin yok. Filtreleri temizlemeyi ya da başka bir sınıf seçmeyi dene.');
  bos.hidden = true;

  // Uyarı yoksa (false) ekrana yazılmasın diye boş öğeler süzülür
  kap.replaceChildren(...[
    el('div', { sinif: 'sayfa-ust', 'data-modul': 'kutuphane' },
      el('span', { sinif: 'kart__ikon', 'aria-hidden': 'true' }, spriteIkon('kitaplar', 'ikon')),
      el('div', {}, el('h1', { metin: 'Kütüphane' }),
        el('p', { sinif: 'soluk', metin: 'Sınıfına uygun metinler ve kendi eklediğin metinler. Bir metin seç, oku, soruları yanıtla.' }))),
    el('div', { sinif: 'kutuphane__eylem' }, ekleDugme,
      el('p', { sinif: 'alan__ipucu', metin: 'Bir metni yapıştır, başlık ver; istersen kendi sorularını da yaz. Metinlerin yalnızca bu cihazda tutulur.' })),
    uyari,
    filtreFormu(),
    el('section', { 'aria-labelledby': 'kutuphane-liste-baslik', sinif: 'yigin', style: '--yigin-bosluk: var(--b-3)' },
      el('h2', { id: 'kutuphane-liste-baslik', metin: 'Metinler' }), sayi, liste, bos),
  ].filter(Boolean));
  sayfa = { kap, liste, sayi, bos, ekleDugme };
  profilFiltresiniAyarla();
  filtreFormunuDoldur();
  listeyiCiz();
}
