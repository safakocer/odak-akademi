// Profil yönetimi: ilk açılış karşılaması, takma ad/sınıf/avatar seçimi, birden çok profil ve hızlı geçiş (S24: sınıf modunda yalnız geçiş)
import { oku, yaz, sil, anahtarlar } from './storage.js';
import { yay, dinle, OLAYLAR, uygulamaDurumu } from './store.js';
import { toastGoster, el, spriteIkon } from './ui.js';
import { trKucuk, boslukTemizle, karakterSayisi, kimlikUret } from './utils.js';

const ANAHTAR_PROFILLER = 'profiller';
const ANAHTAR_AKTIF = 'aktifProfil';
export const EN_FAZLA_PROFIL = 6;
export const SINIFLAR = Object.freeze([5, 6, 7, 8]);
export const AVATARLAR = Object.freeze([
  { id: 'yunus', emoji: '🐬', ad: 'Yunus' },
  { id: 'tilki', emoji: '🦊', ad: 'Tilki' },
  { id: 'kaplumbaga', emoji: '🐢', ad: 'Kaplumbağa' },
  { id: 'panda', emoji: '🐼', ad: 'Panda' },
  { id: 'aslan', emoji: '🦁', ad: 'Aslan' },
  { id: 'ahtapot', emoji: '🐙', ad: 'Ahtapot' },
  { id: 'roket', emoji: '🚀', ad: 'Roket' },
  { id: 'aycicegi', emoji: '🌻', ad: 'Ayçiçeği' },
  { id: 'top', emoji: '⚽', ad: 'Futbol topu' },
  { id: 'palet', emoji: '🎨', ad: 'Boya paleti' },
  { id: 'gitar', emoji: '🎸', ad: 'Gitar' },
  { id: 'yildiz', emoji: '⭐', ad: 'Yıldız' },
]);
// S29: sesDuzeyi (kisik|orta|yuksek), sesYalnizGeriBildirim (egzersiz açıkken yalnız geri bildirim sesleri)
export const VARSAYILAN_AYARLAR = Object.freeze({
  tema: 'sistem', yaziBoyutu: 'normal', font: 'standart', ses: true, hareketAzalt: false, molaRehberi: true,
  sesDuzeyi: 'orta', sesYalnizGeriBildirim: false,
});

export function avatarBul(id) {
  return AVATARLAR.find((a) => a.id === id) ?? AVATARLAR[0];
}

// Takma ad biçim denetimi (uzunluk, iletişim bilgisi, izinli karakterler). Hata mesajı ya da null döner
function takmaAdBicimHatasi(ad) {
  const n = karakterSayisi(ad);
  if (n < 2) return 'Takma ad en az 2 karakter olmalı.';
  if (n > 20) return 'Takma ad en fazla 20 karakter olabilir.';
  // Telefon numarası boşluk/tireyle bölünse de yakalanır: toplamda 7+ rakam ya da art arda 5+ rakam
  const rakamSayisi = (ad.match(/\p{Nd}/gu) ?? []).length;
  if (/@|https?:|www\./i.test(ad) || rakamSayisi >= 7 || /\p{Nd}{5,}/u.test(ad)) {
    return 'Takma adda e-posta, telefon ya da internet adresi olmasın (en fazla 6 rakam).';
  }
  if (!/^[\p{L}\p{N} ._-]+$/u.test(ad)) return 'Yalnızca harf, rakam, boşluk, nokta ve tire kullanabilirsin.';
  return null;
}

// Depodan gelen (veya yedekten yüklenen) profili şemaya uydurur; kurala uymayan takma ad "Öğrenci" olur
function profilDuzelt(p) {
  if (!p || typeof p !== 'object' || typeof p.id !== 'string') return null;
  const ad = [...boslukTemizle(p.takmaAd)].slice(0, 20).join('').trim();
  return {
    id: p.id,
    takmaAd: takmaAdBicimHatasi(ad) ? 'Öğrenci' : ad,
    sinif: SINIFLAR.includes(Number(p.sinif)) ? Number(p.sinif) : SINIFLAR[0],
    avatar: avatarBul(p.avatar).id,
    olusturma: typeof p.olusturma === 'string' ? p.olusturma : new Date().toISOString(),
    ayarlar: { ...VARSAYILAN_AYARLAR, ...(p.ayarlar && typeof p.ayarlar === 'object' ? p.ayarlar : {}) },
  };
}

// ---------- Veri ----------
// Aynı takma ad birden çok profilde varsa (ör. yedekten) sonrakilere numara eklenir: "Öğrenci 2"
function adlariAyir(liste) {
  const gorulen = new Set();
  return liste.map((p) => {
    let ad = p.takmaAd;
    for (let n = 2; gorulen.has(trKucuk(ad)); n++) ad = `${[...p.takmaAd].slice(0, 17).join('').trim()} ${n}`;
    gorulen.add(trKucuk(ad));
    return ad === p.takmaAd ? p : { ...p, takmaAd: ad };
  });
}

export function profilleriGetir() {
  const liste = oku(ANAHTAR_PROFILLER, []);
  return Array.isArray(liste) ? adlariAyir(liste.map(profilDuzelt).filter(Boolean)) : [];
}

function profilleriYaz(liste) {
  const tamam = yaz(ANAHTAR_PROFILLER, liste);
  if (tamam) yay(OLAYLAR.PROFILLER_DEGISTI, liste);
  return tamam;
}

export function profilBul(id) {
  return profilleriGetir().find((p) => p.id === id) ?? null;
}

export function aktifProfil() {
  const id = oku(ANAHTAR_AKTIF);
  const liste = profilleriGetir();
  return liste.find((p) => p.id === id) ?? liste[0] ?? null;
}

// Hata varsa { alan: 'takmaAd'|'sinif'|'avatar'|'genel', mesaj } döner, yoksa null
export function profilBilgisiDenetle({ takmaAd, sinif, avatar }, haricId = null) {
  const ad = boslukTemizle(takmaAd);
  const bicimHatasi = takmaAdBicimHatasi(ad);
  if (bicimHatasi) return { alan: 'takmaAd', mesaj: bicimHatasi };
  if (profilleriGetir().some((p) => p.id !== haricId && trKucuk(p.takmaAd) === trKucuk(ad))) {
    return { alan: 'takmaAd', mesaj: 'Bu takma ad başka bir profilde var. Farklı bir ad dene.' };
  }
  if (!SINIFLAR.includes(Number(sinif))) return { alan: 'sinif', mesaj: 'Sınıfını seç.' };
  if (!AVATARLAR.some((a) => a.id === avatar)) return { alan: 'avatar', mesaj: 'Bir avatar seç.' };
  return null;
}

export function profilOlustur(bilgi) {
  const liste = profilleriGetir();
  if (liste.length >= EN_FAZLA_PROFIL) return { hata: { alan: 'genel', mesaj: `En fazla ${EN_FAZLA_PROFIL} profil oluşturabilirsin.` } };
  const hata = profilBilgisiDenetle(bilgi);
  if (hata) return { hata };
  const profil = {
    id: kimlikUret(),
    takmaAd: boslukTemizle(bilgi.takmaAd),
    sinif: Number(bilgi.sinif),
    avatar: bilgi.avatar,
    olusturma: new Date().toISOString(),
    ayarlar: { ...VARSAYILAN_AYARLAR },
  };
  if (!profilleriYaz([...liste, profil])) return { hata: { alan: 'genel', mesaj: 'Profil kaydedilemedi. Cihazda yer açıp yeniden dene.' } };
  return { profil };
}

export function profilGuncelle(id, degisiklik = {}) {
  const liste = profilleriGetir();
  const i = liste.findIndex((p) => p.id === id);
  if (i < 0) return { hata: { alan: 'genel', mesaj: 'Profil bulunamadı.' } };
  const eski = liste[i];
  const yeni = {
    takmaAd: degisiklik.takmaAd ?? eski.takmaAd,
    sinif: degisiklik.sinif ?? eski.sinif,
    avatar: degisiklik.avatar ?? eski.avatar,
  };
  // Yalnızca ayar kaydediliyorsa ad/sınıf/avatar yeniden denetlenmez (eski profiller ayar kaydedebilsin)
  const kimlikDegisiyor = ['takmaAd', 'sinif', 'avatar'].some((k) => degisiklik[k] !== undefined);
  if (kimlikDegisiyor) {
    const hata = profilBilgisiDenetle(yeni, id);
    if (hata) return { hata };
  }
  const profil = {
    ...eski,
    takmaAd: boslukTemizle(yeni.takmaAd),
    sinif: Number(yeni.sinif),
    avatar: yeni.avatar,
    ayarlar: { ...eski.ayarlar, ...(degisiklik.ayarlar ?? {}) },
  };
  liste[i] = profil;
  if (!profilleriYaz(liste)) return { hata: { alan: 'genel', mesaj: 'Değişiklik kaydedilemedi.' } };
  // Etkin profil güncellendiyse ayrı olay: PROFIL_DEGISTI yalnız profil değişince yayılır (metin seçimi silinmesin, sayfalar baştan çizilmesin)
  if (uygulamaDurumu.al().profil?.id === id) {
    uygulamaDurumu.ayarla({ profil });
    yay(OLAYLAR.PROFIL_GUNCELLENDI, { profil, ayarMi: !kimlikDegisiyor });
  }
  return { profil };
}

export function profilSec(id) {
  const profil = profilBul(id);
  if (!profil) return null;
  yaz(ANAHTAR_AKTIF, id);
  uygulamaDurumu.ayarla({ profil });
  yay(OLAYLAR.PROFIL_DEGISTI, profil);
  return profil;
}

// Profili ve ona ait tüm anahtarları (<ad>:<profilId>: kayitlar, seviyeler, okuma, metinler, kutuphane …) siler.
// Silme burada yapılır; böylece o an yüklenmemiş modüllerin verisi de kalmaz. PROFIL_SILINDI bellekteki kopyalar için yayılır.
export function profilSil(id) {
  const liste = profilleriGetir();
  const kalan = liste.filter((p) => p.id !== id);
  if (!id || kalan.length === liste.length || !profilleriYaz(kalan)) return false;
  anahtarlar().filter((k) => k.endsWith(`:${id}`)).forEach((k) => sil(k));
  yay(OLAYLAR.PROFIL_SILINDI, { id });
  if (uygulamaDurumu.al().profil?.id === id || oku(ANAHTAR_AKTIF) === id) {
    if (kalan[0]) profilSec(kalan[0].id);
    else {
      sil(ANAHTAR_AKTIF);
      uygulamaDurumu.ayarla({ profil: null });
      yay(OLAYLAR.PROFIL_DEGISTI, null);
    }
  }
  return true;
}

// Açılışta (ve yedek yüklenince) etkin profili belirler, PROFIL_DEGISTI yayar
export function profilBaslat() {
  const profil = aktifProfil();
  if (profil && oku(ANAHTAR_AKTIF) !== profil.id) yaz(ANAHTAR_AKTIF, profil.id);
  if (!profil) sil(ANAHTAR_AKTIF);
  uygulamaDurumu.ayarla({ profil });
  yay(OLAYLAR.PROFIL_DEGISTI, profil);
  return profil;
}

// ---------- Arayüz yardımcıları ----------
let sayac = 0;
const UST_CUBUK_AD_SINIRI = 12; // üst çubukta daha uzun takma ad kısaltılır (tam ad aria-label'da)

function ikonDugmesi(ikonAdi, etiket, tikla) {
  return el('button', { type: 'button', sinif: 'btn btn--hayalet btn--ikon', 'aria-label': etiket, title: etiket, onclick: tikla },
    spriteIkon(ikonAdi, 'ikon'));
}

export function avatarOge(avatarId, boyut = '') {
  return el('span', {
    sinif: `avatar avatar--emoji${boyut ? ` avatar--${boyut}` : ''}`,
    'aria-hidden': 'true',
    metin: avatarBul(avatarId).emoji,
  });
}

function hataAlani(id) {
  return el('p', { sinif: 'alan__hata', id, hidden: true });
}

// Takma ad + sınıf + avatar formu. kaydet(bilgi) hata nesnesi ya da null döndürür
export function profilFormuOlustur({ profil = null, dugmeMetni = 'Kaydet', kaydet, iptal } = {}) {
  const k = `pf${++sayac}`;
  const form = el('form', { sinif: 'profil-formu yigin' });
  form.noValidate = true;
  form.style.setProperty('--yigin-bosluk', 'var(--b-5)');

  // Takma ad
  const ad = el('input', {
    sinif: 'girdi', id: `${k}-ad`, name: 'takmaAd', type: 'text', maxlength: '20', autocomplete: 'off',
    spellcheck: 'false', autocapitalize: 'words', 'aria-describedby': `${k}-ad-ipucu ${k}-ad-hata`,
  });
  ad.value = profil?.takmaAd ?? '';
  const adHata = hataAlani(`${k}-ad-hata`);
  const adAlani = el('div', { sinif: 'alan' },
    el('label', { sinif: 'alan__etiket', for: `${k}-ad`, metin: 'Takma ad' }),
    ad,
    el('p', { sinif: 'alan__ipucu', id: `${k}-ad-ipucu`, metin: 'Gerçek adını ve soyadını yazma; kendine bir takma ad seç. Örnek: Yıldız Avcısı' }),
    adHata);

  // Sınıf
  const sinifHata = hataAlani(`${k}-sinif-hata`);
  const segment = el('div', { sinif: 'segment' }, SINIFLAR.map((s) => el('label', {},
    el('input', { type: 'radio', name: 'sinif', value: String(s), checked: profil?.sinif === s }),
    el('span', { metin: `${s}. sınıf` }))));
  const sinifGrup = el('fieldset', { sinif: 'grup', 'aria-describedby': sinifHata.id },
    el('legend', { metin: 'Sınıfın' }), segment, sinifHata);

  // Avatar
  const seciliAvatar = profil?.avatar ?? AVATARLAR[0].id;
  const avatarGrup = el('fieldset', { sinif: 'grup' },
    el('legend', { metin: 'Avatarın' }),
    el('div', { sinif: 'avatar-secici' }, AVATARLAR.map((a) => el('label', { title: a.ad },
      el('input', { type: 'radio', name: 'avatar', value: a.id, checked: a.id === seciliAvatar, 'aria-label': a.ad }),
      avatarOge(a.id)))));

  const genelHata = hataAlani(`${k}-genel-hata`);
  genelHata.setAttribute('role', 'alert');

  // Düğmeler
  const eylemler = el('div', { sinif: 'profil-formu__eylemler' },
    iptal && el('button', { type: 'button', sinif: 'btn btn--hayalet', metin: 'Vazgeç', onclick: iptal }),
    el('button', { type: 'submit', sinif: iptal ? 'btn btn--birincil' : 'btn btn--birincil btn--buyuk btn--blok', metin: dugmeMetni }));

  form.append(adAlani, sinifGrup, avatarGrup, genelHata, eylemler);

  function hatalariTemizle() {
    [adHata, sinifHata, genelHata].forEach((h) => { h.hidden = true; h.textContent = ''; });
    ad.removeAttribute('aria-invalid');
  }
  ad.addEventListener('input', () => { if (ad.hasAttribute('aria-invalid')) hatalariTemizle(); });
  segment.addEventListener('change', () => { sinifHata.hidden = true; });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    hatalariTemizle();
    const fd = new FormData(form);
    const hata = kaydet?.({ takmaAd: fd.get('takmaAd') ?? '', sinif: Number(fd.get('sinif')), avatar: fd.get('avatar') });
    if (!hata) return;
    if (hata.alan === 'takmaAd') {
      adHata.textContent = hata.mesaj; adHata.hidden = false;
      ad.setAttribute('aria-invalid', 'true');
      ad.focus();
    } else if (hata.alan === 'sinif') {
      sinifHata.textContent = hata.mesaj; sinifHata.hidden = false;
      segment.querySelector('input')?.focus();
    } else {
      genelHata.textContent = hata.mesaj; genelHata.hidden = false;
    }
  });
  return form;
}

// ---------- Karşılama (ilk açılış) ----------
// Profil yokken kapatılamayan pencere; { ac, kapat } döndürür
export function karsilamayiBagla({ dialog, formAlani }) {
  dialog.addEventListener('cancel', (e) => { if (!aktifProfil()) e.preventDefault(); });
  dialog.addEventListener('close', () => { if (!aktifProfil()) requestAnimationFrame(ac); });

  function ac() {
    if (dialog.open) return;
    const form = profilFormuOlustur({
      dugmeMetni: 'Başla',
      kaydet: (bilgi) => {
        const { profil, hata } = profilOlustur(bilgi);
        if (hata) return hata;
        profilSec(profil.id);
        toastGoster(`Hoş geldin, ${profil.takmaAd}!`, { tur: 'basari' });
        return null;
      },
    });
    formAlani.replaceChildren(form);
    dialog.showModal();
    form.querySelector('input[name="takmaAd"]')?.focus();
  }
  function kapat() { if (dialog.open) dialog.close(); }
  return { ac, kapat };
}

// ---------- Profiller penceresi: liste, hızlı geçiş, ekle/düzenle/sil ----------
// S24: kisitliMi() true iken (sınıf modu) yalnız geçiş yapılır: ekle/düzenle/sil gizlenir, liste büyük kutucuklar olur (data-sinif-modu).
// Döner: { yenile() } (kısıt değişince çağrılır)
export function profilPenceresiniBagla({ dialog, liste, ekleDugmesi, formAlani, kisitliMi = () => false }) {
  formAlani.hidden = true;
  const kisitNotu = el('p', { sinif: 'alan__ipucu', hidden: true,
    metin: 'Sınıf modu açık: profil eklemek, düzenlemek ya da silmek için Veli / Öğretmen alanından sınıf modunu kapatın.' });
  ekleDugmesi.after(kisitNotu);

  function formuKapat() {
    delete dialog.dataset.duzenleniyor;
    formAlani.replaceChildren();
    formAlani.hidden = true;
    liste.hidden = false;
    ekleDugmesi.hidden = false;
    ciz();
  }

  function formuAc(profil = null) {
    dialog.dataset.duzenleniyor = ''; // form açıkken arka plana tıklamak pencereyi kapatmaz (ui.js modalBagla)
    liste.hidden = true;
    ekleDugmesi.hidden = true;
    formAlani.hidden = false;
    const form = profilFormuOlustur({
      profil,
      dugmeMetni: profil ? 'Değişiklikleri kaydet' : 'Profili oluştur',
      iptal: () => { formuKapat(); ekleDugmesi.focus(); },
      kaydet: (bilgi) => {
        if (profil) {
          const { hata } = profilGuncelle(profil.id, bilgi);
          if (hata) return hata;
          toastGoster('Profil güncellendi.', { tur: 'basari' });
          formuKapat();
          ekleDugmesi.focus();
          return null;
        }
        const { profil: yeni, hata } = profilOlustur(bilgi);
        if (hata) return hata;
        profilSec(yeni.id);
        toastGoster(`${yeni.takmaAd} profili hazır.`, { tur: 'basari' });
        formuKapat();
        dialog.close();
        return null;
      },
    });
    formAlani.replaceChildren(el('h3', { metin: profil ? 'Profili düzenle' : 'Yeni profil' }), form);
    form.querySelector('input[name="takmaAd"]')?.focus();
  }

  function satirOlustur(p, aktifMi) {
    const li = el('li', { sinif: `profil-satiri${aktifMi ? ' profil-satiri--aktif' : ''}` });
    const sec = el('button', {
      type: 'button',
      sinif: 'profil-satiri__sec',
      'aria-current': aktifMi && 'true',
      'aria-label': aktifMi ? `${p.takmaAd}, ${p.sinif}. sınıf, şu an seçili` : `${p.takmaAd} profiline geç, ${p.sinif}. sınıf`,
      onclick: () => {
        if (!aktifMi) {
          profilSec(p.id);
          toastGoster(`${p.takmaAd} olarak devam ediyorsun.`, { tur: 'basari' });
        }
        dialog.close();
      },
    },
    avatarOge(p.avatar),
    el('span', { sinif: 'profil-satiri__metin' },
      el('span', { sinif: 'profil-satiri__ad', metin: p.takmaAd }),
      el('span', { sinif: 'profil-satiri__sinif', metin: `${p.sinif}. sınıf` })),
    aktifMi && el('span', { sinif: 'rozet rozet--birincil', metin: 'Seçili' }));

    const duzenle = ikonDugmesi('kalem', `${p.takmaAd} profilini düzenle`, () => formuAc(p));
    const silDugmesi = ikonDugmesi('cop', `${p.takmaAd} profilini sil`, () => {
      if (!confirm(`“${p.takmaAd}” profili ve bu profile ait tüm sonuçlar silinsin mi? Bu işlem geri alınamaz.`)) return;
      const sonProfil = profilleriGetir().length === 1;
      if (sonProfil) dialog.close();
      if (profilSil(p.id)) {
        toastGoster('Profil silindi.');
        if (!sonProfil) (liste.querySelector('button') ?? ekleDugmesi).focus();
      }
    });
    li.append(...(kisitliMi() ? [sec] : [sec, duzenle, silDugmesi]));
    return li;
  }

  function ciz() {
    const aktif = uygulamaDurumu.al().profil;
    const profiller = profilleriGetir();
    liste.replaceChildren(...profiller.map((p) => satirOlustur(p, p.id === aktif?.id)));
    const dolu = profiller.length >= EN_FAZLA_PROFIL;
    ekleDugmesi.disabled = dolu;
    ekleDugmesi.title = dolu ? `En fazla ${EN_FAZLA_PROFIL} profil olabilir.` : '';
    const kisitli = kisitliMi();
    ekleDugmesi.hidden = kisitli;
    kisitNotu.hidden = !kisitli;
    dialog.toggleAttribute('data-sinif-modu', kisitli);
  }

  ekleDugmesi.addEventListener('click', () => formuAc());
  dialog.addEventListener('close', () => { if (!formAlani.hidden) formuKapat(); });
  dinle(OLAYLAR.PROFILLER_DEGISTI, () => { if (formAlani.hidden) ciz(); });
  dinle(OLAYLAR.PROFIL_DEGISTI, () => { if (formAlani.hidden) ciz(); });
  ciz();
  return {
    // Kısıt açıldıysa açık form kapanır
    yenile() { if (formAlani.hidden) ciz(); else if (kisitliMi()) formuKapat(); },
  };
}

// Üst çubuktaki profil düğmesini etkin profille günceller
export function profilDugmesiniBagla(dugme) {
  const avatar = dugme.querySelector('.avatar');
  const ad = dugme.querySelector('.profil-dugmesi__ad');
  const guncelle = (p) => {
    if (avatar) avatar.textContent = p ? avatarBul(p.avatar).emoji : '🙂';
    // Dar ekranda taşmasın: uzun ad kısaltılır; tam ad aria-label ve title'da
    const tam = p?.takmaAd ?? '';
    const harfler = [...tam];
    if (ad) ad.textContent = harfler.length > UST_CUBUK_AD_SINIRI ? `${harfler.slice(0, UST_CUBUK_AD_SINIRI - 1).join('').trim()}…` : tam;
    const etiket = p ? `Profiller: ${p.takmaAd}` : 'Profiller';
    dugme.setAttribute('aria-label', etiket);
    dugme.title = etiket;
  };
  dinle(OLAYLAR.PROFIL_DEGISTI, guncelle);
  dinle(OLAYLAR.PROFIL_GUNCELLENDI, ({ profil }) => guncelle(profil)); // takma ad ya da avatar değişti
  guncelle(uygulamaDurumu.al().profil);
}
