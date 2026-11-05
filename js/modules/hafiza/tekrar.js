// Tekrar Kartları (S16): #/tekrar (bugünün tekrarı, Leitner kutuları, desteler, hazır desteler, CSV, ayarlar) ve #/tekrar/<deste> (kartlar); geri çağırma oturumu sayfa içinde açılır. Motor: js/engine/srs.js
import { el, spriteIkon, toastGoster, modalAc, modalKapat } from '../../core/ui.js';
import { duyur, odakla } from '../../core/a11y.js';
import { etkinProfil } from '../../core/store.js';
import { git } from '../../core/router.js';
import { boslukTemizle, trKucuk, sayiBicimle, gunAnahtari } from '../../core/utils.js';
import { aracBilgisi } from '../katalog.js';
import {
  GUNLUK_SINIR, ARALIK_SINIRI, SINIRLAR, VARSAYILAN_ARALIKLAR, ICE_AKTARILAN_DESTE,
  srsAyarlari, srsAyarKaydet, desteOzetleri, desteBul, desteKartlari, desteOlustur, desteYenidenAdlandir, desteSil,
  kartEkle, kartGuncelle, kartSil, bugununTekrari, sonrakiDurum, cevapla, kutuDagilimi, sonrakiTekrar,
  hazirDesteleriYukle, hazirDesteEkle, csvOlustur, csvIceAktar, csvDosyasiOku, cevapBenzer, dosyaAdiYap, gunMetni, aralikMetni,
} from '../../engine/srs.js';

const MODUL = 'hafiza';
let cizimNo = 0;          // eski bir yükleme/oturum yeni sayfanın üstüne çizmesin
let acikPencere = null;   // açık form penceresi (sayfadan çıkınca kapanır)

/** Sayfadan çıkınca: açık pencereyi sessizce kapatır, bekleyen işleri geçersiz kılar */
export function tekrarSayfasiniKapat() {
  cizimNo++;
  const p = acikPencere;
  acikPencere = null;
  if (p?.open) { p.dataset.sessiz = ''; modalKapat(p); }
}

// ---------- Küçük yardımcılar ----------
const geriBaglanti = (href, metin) => el('a', { sinif: 'btn btn--hayalet btn--kucuk geri-baglanti', href },
  spriteIkon('ok-sag', 'ikon ikon--kucuk ikon--ters'), metin);
const bosDurum = (metin) => el('p', { sinif: 'bos-durum', metin });
const kisalt = (s, n = 40) => { const h = [...String(s).replace(/\s+/g, ' ')]; return h.length > n ? `${h.slice(0, n - 1).join('').trim()}…` : h.join(''); };

function sayfaUst(baslik, aciklama, id) {
  return el('div', { sinif: 'sayfa-ust', 'data-modul': MODUL },
    el('span', { sinif: 'kart__ikon', 'aria-hidden': 'true' }, spriteIkon('tekrar-kart', 'ikon')),
    el('div', {}, el('h1', { id, metin: baslik }), aciklama && el('p', { sinif: 'soluk', metin: aciklama })));
}

function bolum(id, baslik, ek, ...icerik) {
  return el('section', { sinif: 'yigin', 'aria-labelledby': id, style: '--yigin-bosluk: var(--b-3)' },
    el('div', { sinif: 'bolum-baslik' }, el('h2', { id, metin: baslik }), ek), ...icerik);
}

function ikonDugme(ikon, etiket, tikla) {
  return el('button', { type: 'button', sinif: 'btn btn--hayalet btn--ikon', 'aria-label': etiket, title: etiket, onclick: tikla }, spriteIkon(ikon, 'ikon'));
}

/** Beş kutu: her kutudaki kart sayısı ve sorulma aralığı */
function kutuGorunumu(dagilim, araliklar) {
  return el('ol', { sinif: 'kutu-sirasi', 'aria-label': 'Kutulardaki kartlar' }, dagilim.map((n, i) => el('li', {},
    el('span', { metin: `Kutu ${i + 1}` }),
    el('strong', {}, sayiBicimle(n), el('span', { sinif: 'ekran-okuyucu', metin: ' kart,' })),
    el('span', { metin: araliklar[i] === 1 ? 'her gün' : `${araliklar[i]} günde bir` }))));
}

function ilerlemeCubugu(id) {
  const etiket = el('span', { id, metin: 'İlerleme' });
  const sayi = el('span');
  const dolgu = el('span', { sinif: 'ilerleme__dolgu' });
  const cubuk = el('div', { sinif: 'ilerleme', role: 'progressbar', 'aria-labelledby': id, 'aria-valuemin': '0' }, dolgu);
  const kok = el('div', {}, el('div', { sinif: 'ilerleme-etiket' }, etiket, sayi), cubuk);
  const ayarla = (deger, toplam, metin) => {
    sayi.textContent = `${deger} / ${toplam}`;
    cubuk.setAttribute('aria-valuemax', String(toplam));
    cubuk.setAttribute('aria-valuenow', String(deger));
    cubuk.setAttribute('aria-valuetext', metin);
    dolgu.style.setProperty('--deger', `${toplam ? Math.round((deger * 100) / toplam) : 0}%`);
  };
  return { kok, etiket, ayarla };
}

// ---------- Dosya ----------
function dosyaSec(isle) {
  const girdi = el('input', { type: 'file', accept: '.csv,.txt,text/csv,text/plain', hidden: true });
  girdi.addEventListener('change', () => {
    const dosya = girdi.files?.[0];
    girdi.remove();
    if (dosya) isle(dosya);
  });
  document.body.append(girdi);
  girdi.click();
}

function csvIndir(metin, ad) {
  try {
    const url = URL.createObjectURL(new Blob([metin], { type: 'text/csv;charset=utf-8' }));
    const a = el('a', { href: url, download: ad, hidden: true });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    toastGoster('CSV dosyası indirildi.', { tur: 'basari' });
  } catch (h) {
    console.error('[tekrar] CSV indirilemedi:', h);
    toastGoster('Dosya hazırlanamadı. Yeniden dene.', { tur: 'hata' });
  }
}

async function csvYukle(dosya, { desteId = null, sonra }) {
  const no = cizimNo;
  let metin;
  try { metin = await csvDosyasiOku(dosya); } catch (h) { toastGoster(h.message, { tur: 'hata' }); return; }
  if (no !== cizimNo) return;
  const s = csvIceAktar(metin, { desteId });
  if (!s.tamam) { toastGoster(s.hata, { tur: 'uyari', sure: 8000 }); return; }
  const parca = [`${s.eklenen} kart eklendi`];
  if (s.atlanan) parca.push(`${s.atlanan} kart zaten vardı`);
  if (s.hatali) parca.push(`${s.hatali} satır okunamadı${s.hataliSatirlar.length ? ` (satır ${s.hataliSatirlar.join(', ')})` : ''}`);
  if (s.yeniDesteler.length) parca.push(`yeni deste: ${s.yeniDesteler.join(', ')}`);
  toastGoster(`${parca.join('; ')}.`, { tur: 'basari', sure: 8000 });
  sonra?.();
}

// ---------- Pencereler ----------
let pencereNo = 0;
// kapaninca: kapanınca çağrılır (yoksa odak açıcı düğmeye döner). Sayfadan çıkarken kapanırsa çağrılmaz
function pencereAc({ baslik, govde, acici, kapaninca }) {
  if (acikPencere?.open) modalKapat(acikPencere);
  const id = `tekrar-pencere-${++pencereNo}`;
  const dialog = el('dialog', { sinif: 'modal', 'aria-labelledby': id },
    el('div', { sinif: 'modal__ic' },
      el('div', { sinif: 'modal__ust' }, el('h2', { id, metin: baslik }),
        el('button', { type: 'button', sinif: 'btn btn--hayalet btn--ikon', 'aria-label': 'Kapat', onclick: () => modalKapat(dialog) }, spriteIkon('kapat', 'ikon'))),
      el('div', { sinif: 'modal__govde' }, govde)));
  dialog.addEventListener('close', () => {
    const sessiz = 'sessiz' in dialog.dataset;
    dialog.remove();
    if (acikPencere === dialog) acikPencere = null;
    if (sessiz) return;
    if (kapaninca) kapaninca();
    else if (acici?.isConnected) acici.focus();
  });
  document.body.append(dialog);
  acikPencere = dialog;
  modalAc(dialog);
  return dialog;
}

let alanNo = 0;
function metinAlani({ etiket, deger = '', satir = 2, sinir, ipucu }) {
  const id = `tekrar-alan-${++alanNo}`;
  const girdi = el('textarea', { sinif: 'girdi', id, rows: String(satir), maxlength: String(sinir), 'aria-describedby': ipucu ? `${id}-ipucu` : null });
  girdi.value = deger;
  return {
    girdi,
    kok: el('div', { sinif: 'alan' }, el('label', { sinif: 'alan__etiket', for: id, metin: etiket }), girdi,
      ipucu && el('p', { sinif: 'alan__ipucu', id: `${id}-ipucu`, metin: ipucu })),
  };
}

/** Kart ekleme (pencere açık kalır, art arda eklenir) ya da düzenleme */
function kartFormuAc({ desteId, kart = null, acici, sonra }) {
  const on = metinAlani({ etiket: 'Ön yüz (soru ya da terim)', deger: kart?.on, satir: 2, sinir: SINIRLAR.on });
  const arka = metinAlani({ etiket: 'Arka yüz (cevap)', deger: kart?.arka, satir: 3, sinir: SINIRLAR.arka,
    ipucu: 'Kısa ve net yaz. Örnek ya da ipucu için yeni satıra geçebilirsin.' });
  const hata = el('p', { sinif: 'alan__hata', role: 'alert', hidden: true });
  const durum = el('p', { sinif: 'alan__ipucu', role: 'status' });
  let dialog = null;
  let degisti = false;
  let eklenen = 0;
  const form = el('form', { sinif: 'yigin', style: '--yigin-bosluk: var(--b-4)', novalidate: true },
    on.kok, arka.kok,
    kart && el('p', { sinif: 'alan__ipucu', metin: `Bu kart ${kart.kutu}. kutuda; sonraki tekrarı ${gunMetni(kart.sonraki)}. Metni değiştirmek kutusunu değiştirmez.` }),
    hata, durum,
    el('div', { sinif: 'profil-formu__eylemler' },
      el('button', { type: 'button', sinif: 'btn btn--hayalet', metin: kart ? 'Vazgeç' : 'Bitti', onclick: () => modalKapat(dialog) }),
      el('button', { type: 'submit', sinif: 'btn btn--birincil', metin: kart ? 'Kaydet' : 'Kartı ekle' })));

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    [on.girdi, arka.girdi].forEach((g) => g.removeAttribute('aria-invalid'));
    const bilgi = { on: on.girdi.value, arka: arka.girdi.value };
    const s = kart ? kartGuncelle(kart.id, bilgi) : kartEkle(desteId, bilgi);
    if (!s.tamam) {
      hata.textContent = s.hata;
      hata.hidden = false;
      const g = s.alan === 'arka' ? arka.girdi : on.girdi;
      g.setAttribute('aria-invalid', 'true');
      g.focus();
      return;
    }
    hata.hidden = true;
    degisti = true;
    if (kart) { modalKapat(dialog); toastGoster('Kart kaydedildi.', { tur: 'basari' }); return; }
    eklenen++;
    on.girdi.value = '';
    arka.girdi.value = '';
    durum.textContent = `Kart eklendi. Bu pencerede ${eklenen} kart ekledin; yenisini yazabilir ya da “Bitti”ye basabilirsin.`;
    on.girdi.focus();
  });

  dialog = pencereAc({ baslik: kart ? 'Kartı düzenle' : 'Yeni kart', govde: form, acici,
    kapaninca: () => (degisti ? sonra() : acici?.focus()) });
  on.girdi.focus();
}

/** Deste adı penceresi. kaydet(ad) → hata metni | null */
function desteAdiPenceresi({ baslik, deger = '', dugme, acici, kaydet, sonra }) {
  const id = `tekrar-deste-adi-${++alanNo}`;
  const girdi = el('input', { sinif: 'girdi', id, type: 'text', maxlength: String(SINIRLAR.desteAdi), autocomplete: 'off', 'aria-describedby': `${id}-hata` });
  girdi.value = deger;
  const hata = el('p', { sinif: 'alan__hata', id: `${id}-hata`, role: 'alert', hidden: true });
  let dialog = null;
  let kaydedildi = false;
  const form = el('form', { sinif: 'yigin', style: '--yigin-bosluk: var(--b-4)', novalidate: true },
    el('div', { sinif: 'alan' }, el('label', { sinif: 'alan__etiket', for: id, metin: 'Deste adı' }), girdi,
      el('p', { sinif: 'alan__ipucu', metin: 'Örnek: Fen 6. ünite, İngilizce hayvanlar' }), hata),
    el('div', { sinif: 'profil-formu__eylemler' },
      el('button', { type: 'button', sinif: 'btn btn--hayalet', metin: 'Vazgeç', onclick: () => modalKapat(dialog) }),
      el('button', { type: 'submit', sinif: 'btn btn--birincil', metin: dugme })));
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const h = kaydet(girdi.value);
    if (h) {
      hata.textContent = h;
      hata.hidden = false;
      girdi.setAttribute('aria-invalid', 'true');
      girdi.focus();
      return;
    }
    kaydedildi = true;
    modalKapat(dialog);
  });
  girdi.addEventListener('input', () => { hata.hidden = true; girdi.removeAttribute('aria-invalid'); });
  dialog = pencereAc({ baslik, govde: form, acici, kapaninca: () => (kaydedildi ? sonra() : acici?.focus()) });
  girdi.focus();
}

// ---------- #/tekrar ----------
function bugunBolumu(kap, ciz) {
  const t = bugununTekrari();
  const ayar = srsAyarlari();
  let durum;
  if (!desteOzetleri().length) {
    durum = 'Başlamak için aşağıdan bir hazır deste ekle ya da kendi desteni oluştur.';
  } else if (!t.bekleyen) {
    const s = sonrakiTekrar();
    durum = `Bugün tekrar zamanı gelen kart yok.${s ? ` Sıradaki tekrar ${gunMetni(s.gun)}: ${s.sayi} kart.` : ''}`;
  } else if (!t.kalanHak) {
    durum = `Bugünkü ${t.sinir} kartlık sınırını tamamladın. Kalan ${t.bekleyen} kart sonraki günlerde gelecek.`;
  } else {
    durum = `${t.kartlar.length} kart seni bekliyor.`;
    if (t.bekleyen > t.kartlar.length) durum += ` Zamanı gelen ${t.bekleyen} kart var; günlük sınırın ${t.sinir} olduğu için kalanlar sonraki günlere kalır.`;
  }
  const ilerleme = ilerlemeCubugu('tekrar-gunluk-etiket');
  ilerleme.etiket.textContent = 'Bugün tekrar ettiğin';
  ilerleme.ayarla(Math.min(t.yapilan, t.sinir), t.sinir, `Günlük ${t.sinir} kartlık sınırdan ${t.yapilan} kart tekrar edildi`);
  return el('section', { sinif: 'kart tekrar-bugun', 'aria-labelledby': 'tekrar-bugun-baslik' },
    el('h2', { id: 'tekrar-bugun-baslik', metin: 'Bugünün tekrarı' }),
    el('p', { metin: durum }),
    ilerleme.kok,
    el('div', {}, el('button', { type: 'button', sinif: 'btn btn--birincil btn--buyuk', disabled: !t.kartlar.length,
      onclick: () => oturumBaslat(kap, { donus: () => ciz('#tekrar-bugun-baslik') }) },
    'Tekrara başla', spriteIkon('ok-sag', 'ikon'))),
    kutuGorunumu(kutuDagilimi(), ayar.araliklar),
    el('p', { sinif: 'alan__ipucu', metin: 'Bildiğin kart bir sonraki kutuya geçer ve daha seyrek sorulur; bilemediğin kart 1. kutuya döner ve ertesi gün yeniden gelir.' }));
}

function destelerBolumu(ciz) {
  const liste = desteOzetleri();
  let yeniId = null;
  const yeni = el('button', { type: 'button', sinif: 'btn btn--ikincil btn--kucuk', metin: 'Yeni deste',
    onclick: (e) => desteAdiPenceresi({ baslik: 'Yeni deste', dugme: 'Desteyi oluştur', acici: e.currentTarget,
      kaydet: (ad) => { const s = desteOlustur(ad); if (!s.tamam) return s.hata; yeniId = s.deste.id; return null; },
      sonra: () => git(`/tekrar/${yeniId}`) }) });
  return bolum('tekrar-desteler-baslik', 'Destelerim', yeni,
    liste.length
      ? el('ul', { sinif: 'izgara modul-izgara', 'aria-labelledby': 'tekrar-desteler-baslik' }, liste.map((d) => el('li', {},
        el('a', { sinif: 'kart kart--modul tekrar-deste-karti', href: `#/tekrar/${encodeURIComponent(d.id)}`, 'data-modul': MODUL },
          el('span', { sinif: 'kart__baslik', metin: d.ad }),
          el('span', { sinif: 'kart__aciklama', metin: `${d.kartSayisi} kart · ${d.ogrenilen} tanesi 5. kutuda` }),
          el('span', { sinif: 'kart__alt' }, el('span', { sinif: `rozet ${d.bekleyen ? 'rozet--gunes' : 'rozet--basari'}`,
            metin: d.bekleyen ? `Bugün ${d.bekleyen} kart` : 'Bugün tekrar yok' }))))))
      : bosDurum('Henüz desten yok. Hazır destelerden birini ekle ya da “Yeni deste” ile kendi kartlarını yaz.'));
}

function hazirBolumu(ciz) {
  const no = cizimNo;
  const liste = el('ul', { sinif: 'tekrar-hazir-listesi', 'aria-labelledby': 'tekrar-hazir-baslik' },
    el('li', {}, el('p', { sinif: 'soluk', role: 'status', metin: 'Yükleniyor…' })));
  hazirDesteleriYukle().then((hazirlar) => {
    if (no !== cizimNo) return;
    if (!hazirlar.length) { liste.replaceChildren(el('li', {}, bosDurum('Hazır desteler şu an açılamadı. Sayfayı yenileyip yeniden dene.'))); return; }
    const eklenenler = new Set(desteOzetleri().map((d) => d.hazirAd).filter(Boolean));
    liste.replaceChildren(...hazirlar.map((h) => el('li', { sinif: 'kart tekrar-hazir' },
      el('div', { sinif: 'tekrar-hazir__metin' },
        el('h3', { metin: h.baslik }),
        el('p', { sinif: 'soluk', metin: h.aciklama }),
        el('span', { sinif: 'rozet rozet--vurgu', metin: `${h.kartlar.length} kart · ${h.sinif}. sınıf` })),
      eklenenler.has(h.ad)
        ? el('span', { sinif: 'rozet rozet--basari', metin: 'Destelerinde' })
        : el('button', { type: 'button', sinif: 'btn btn--ikincil', onclick: async (e) => {
          const d = e.currentTarget;
          d.disabled = true;
          let s;
          try { s = await hazirDesteEkle(h.ad); } catch (hata) { console.error('[tekrar]', hata); s = { tamam: false, hata: 'Deste açılamadı. Yeniden dene.' }; }
          if (no !== cizimNo) return;
          if (!s.tamam) { d.disabled = false; toastGoster(s.hata, { tur: 'uyari' }); return; }
          toastGoster(`${s.deste.ad} eklendi: ${s.eklenen} kart. Yeni kartlar günlük sınırına göre sırayla gelir.`, { tur: 'basari', sure: 6000 });
          ciz('#tekrar-desteler-baslik');
        } }, 'Desteme ekle', el('span', { sinif: 'ekran-okuyucu', metin: `: ${h.baslik}` })))));
  }).catch((h) => { console.error('[tekrar]', h); });
  return bolum('tekrar-hazir-baslik', 'Hazır desteler', null,
    el('p', { sinif: 'soluk', metin: 'Eklediğin deste senin olur: kartlarını düzenleyebilir, silebilir, yenilerini ekleyebilirsin.' }), liste);
}

function aktarBolumu(ciz) {
  const kartVar = desteOzetleri().some((d) => d.kartSayisi);
  return bolum('tekrar-aktar-baslik', 'CSV ile içe ve dışa aktar', null,
    el('p', { metin: `Kartlarını bir tablo programında (Excel, LibreOffice, Google E-Tablolar) hazırlayıp yükleyebilir ya da yedek olarak indirebilirsin. Sütunlar: deste; ön; arka; kutu; sonraki. Yalnızca ön ve arka zorunlu; deste yazmazsan kartlar “${ICE_AKTARILAN_DESTE}” destesine girer.` }),
    el('p', { sinif: 'alan__ipucu', metin: 'Ayırıcı noktalı virgül, virgül ya da sekme olabilir. İndirilen dosya UTF-8 kaydedilir; Türkçe harfler bozulmaz. Aynı kart ikinci kez eklenmez.' }),
    el('div', { sinif: 'tekrar-eylemler' },
      el('button', { type: 'button', sinif: 'btn btn--ikincil', onclick: () => dosyaSec((f) => csvYukle(f, { sonra: () => ciz('#tekrar-desteler-baslik') })) },
        'CSV içe aktar'),
      el('button', { type: 'button', sinif: 'btn btn--hayalet', disabled: !kartVar, onclick: () => csvIndir(csvOlustur(), `tekrar-kartlari-${gunAnahtari()}.csv`) },
        spriteIkon('indir', 'ikon ikon--kucuk'), 'Tüm kartları indir')));
}

function ayarBolumu(ciz) {
  const ayar = srsAyarlari();
  const sinir = el('input', { sinif: 'girdi tekrar-sayi', id: 'tekrar-gunluk-sinir', type: 'number', inputmode: 'numeric',
    min: String(GUNLUK_SINIR.en), max: String(GUNLUK_SINIR.enCok), step: String(GUNLUK_SINIR.adim), 'aria-describedby': 'tekrar-gunluk-ipucu' });
  sinir.value = String(ayar.gunlukSinir);
  const araliklar = ayar.araliklar.map((g, i) => {
    const girdi = el('input', { sinif: 'girdi tekrar-sayi', id: `tekrar-aralik-${i + 1}`, type: 'number', inputmode: 'numeric',
      min: String(ARALIK_SINIRI.en), max: String(ARALIK_SINIRI.enCok), step: '1' });
    girdi.value = String(g);
    return girdi;
  });
  const hata = el('p', { sinif: 'alan__hata', role: 'alert', hidden: true });
  const form = el('form', { sinif: 'kart ayar-bolumu', 'aria-labelledby': 'tekrar-ayar-baslik', novalidate: true },
    el('h2', { id: 'tekrar-ayar-baslik', metin: 'Tekrar ayarları' }),
    el('div', { sinif: 'alan' },
      el('label', { sinif: 'alan__etiket', for: 'tekrar-gunluk-sinir', metin: 'Günlük kart sınırı' }), sinir,
      el('p', { sinif: 'alan__ipucu', id: 'tekrar-gunluk-ipucu', metin: `Bir günde en çok bu kadar kart sorulur (${GUNLUK_SINIR.en}-${GUNLUK_SINIR.enCok}). Her gün birkaç dakika, bir günde uzun bir çalışmadan daha kalıcıdır.` })),
    el('fieldset', { sinif: 'grup', 'aria-describedby': 'tekrar-aralik-ipucu' },
      el('legend', { metin: 'Kutu aralıkları (gün)' }),
      el('div', { sinif: 'tekrar-araliklar' }, araliklar.map((g, i) => el('div', { sinif: 'alan' },
        el('label', { sinif: 'alan__etiket', for: g.id, metin: `Kutu ${i + 1}` }), g))),
      el('p', { sinif: 'alan__ipucu', id: 'tekrar-aralik-ipucu', metin: 'Bildiğin kart bir sonraki kutuya geçer ve o kutunun aralığı kadar gün sonra sorulur. Sonraki kutunun aralığı öncekinden kısa olamaz. Yeni aralıklar, kartın bir sonraki cevabından itibaren geçerli olur.' })),
    hata,
    el('div', { sinif: 'tekrar-eylemler' },
      el('button', { type: 'submit', sinif: 'btn btn--birincil', metin: 'Ayarları kaydet' }),
      el('button', { type: 'button', sinif: 'btn btn--hayalet', metin: 'Önerilen değerler',
        onclick: () => { sinir.value = String(GUNLUK_SINIR.varsayilan); araliklar.forEach((g, i) => { g.value = String(VARSAYILAN_ARALIKLAR[i]); }); duyur('Önerilen değerler yazıldı; kaydetmeyi unutma.'); } })));
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    [sinir, ...araliklar].forEach((g) => g.removeAttribute('aria-invalid'));
    const s = srsAyarKaydet({ gunlukSinir: Number(sinir.value), araliklar: araliklar.map((g) => Number(g.value)) });
    if (!s.tamam) {
      hata.textContent = s.hata;
      hata.hidden = false;
      const g = s.alan === 'gunlukSinir' ? sinir : araliklar[(s.sira ?? 1) - 1] ?? araliklar[0];
      g.setAttribute('aria-invalid', 'true');
      g.focus();
      return;
    }
    toastGoster('Tekrar ayarları kaydedildi.', { tur: 'basari' });
    ciz('#tekrar-ayar-baslik');
  });
  return form;
}

/** #/tekrar */
export function tekrarSayfasiCiz(kap, { odak } = {}) {
  tekrarSayfasiniKapat();
  if (!kap) return;
  const bilgi = aracBilgisi('tekrar');
  const ust = [geriBaglanti('#/modul/hafiza', 'Hafıza'),
    sayfaUst(bilgi?.baslik ?? 'Tekrar Kartları', 'Kartları kutularla tekrar et: bildiğin kart seyrekleşir, zorlandığın sık gelir. Her gün birkaç dakika yeter.')];
  if (!etkinProfil()) {
    kap.replaceChildren(...ust, bosDurum('Tekrar kartlarını kullanmak için önce bir profil oluştur.'));
    return;
  }
  const ciz = (o) => tekrarSayfasiCiz(kap, { odak: o });
  kap.replaceChildren(...ust, bugunBolumu(kap, ciz), destelerBolumu(ciz), hazirBolumu(ciz), aktarBolumu(ciz), ayarBolumu(ciz));
  if (odak) odakla(kap.querySelector(odak));
}

// ---------- #/tekrar/<deste> ----------
function kartSatiri(k, { duzenle, sil }) {
  return el('li', { sinif: 'tekrar-kart-satiri', 'data-ara': trKucuk(`${k.on} ${k.arka}`) },
    el('div', { sinif: 'tekrar-kart-satiri__metin' },
      el('p', { sinif: 'tekrar-kart-satiri__on', metin: k.on }),
      el('p', { sinif: 'tekrar-kart-satiri__arka', metin: k.arka }),
      el('div', { sinif: 'tekrar-kart-satiri__alt' },
        el('span', { sinif: `rozet ${k.kutu === 5 ? 'rozet--basari' : 'rozet--birincil'}`, metin: `Kutu ${k.kutu}` }),
        el('span', { sinif: 'rozet', metin: k.tekrar ? `Sonraki: ${gunMetni(k.sonraki)}` : 'Yeni kart' }))),
    el('div', { sinif: 'tekrar-kart-satiri__eylem' },
      ikonDugme('kalem', `“${kisalt(k.on)}” kartını düzenle`, duzenle),
      ikonDugme('cop', `“${kisalt(k.on)}” kartını sil`, sil)));
}

/** #/tekrar/<deste> */
export function desteSayfasiCiz(kap, id, { odak } = {}) {
  tekrarSayfasiniKapat();
  if (!kap) return;
  const geri = geriBaglanti('#/tekrar', 'Tekrar Kartları');
  if (!etkinProfil()) {
    kap.replaceChildren(geri, bosDurum('Tekrar kartlarını kullanmak için önce bir profil oluştur.'));
    return;
  }
  const deste = desteBul(id);
  if (!deste) {
    toastGoster('Bu deste bulunamadı.', { tur: 'uyari' });
    git('/tekrar', { degistir: true });
    return;
  }
  document.title = `${deste.ad} | Odak Akademi`;
  const ciz = (o) => desteSayfasiCiz(kap, id, { odak: o });
  const kartlar = desteKartlari(id);
  const t = bugununTekrari({ deste: id });

  let durum = '';
  if (!kartlar.length) durum = 'Bu deste boş. İlk kartını ekle.';
  else if (t.bekleyen && !t.kalanHak) durum = 'Bugünkü kart sınırını tamamladın; bu destenin kalan kartları sonraki günlerde gelecek.';
  else if (t.kartlar.length) durum = `Bugün bu destede ${t.kartlar.length} kart seni bekliyor.`;
  else { const s = sonrakiTekrar(id); durum = `Bugün bu destede tekrar yok.${s ? ` Sıradaki tekrar ${gunMetni(s.gun)}: ${s.sayi} kart.` : ''}`; }

  const kartDuzenle = (k) => (e) => kartFormuAc({ desteId: id, kart: k, acici: e.currentTarget, sonra: () => ciz('#tekrar-kartlar-baslik') });
  const kartiSil = (k) => () => {
    if (!confirm(`“${kisalt(k.on, 60)}” kartı silinsin mi?`)) return;
    const s = kartSil(k.id);
    if (!s.tamam) { toastGoster(s.hata, { tur: 'hata' }); return; }
    toastGoster('Kart silindi.');
    ciz('#tekrar-kartlar-baslik');
  };

  const liste = el('ul', { sinif: 'tekrar-kart-listesi', 'aria-labelledby': 'tekrar-kartlar-baslik' },
    kartlar.map((k) => kartSatiri(k, { duzenle: kartDuzenle(k), sil: kartiSil(k) })));
  let arama = null;
  if (kartlar.length > 8) {
    const bilgi = el('p', { sinif: 'alan__ipucu', role: 'status' });
    const girdi = el('input', { sinif: 'girdi', id: 'tekrar-kart-ara', type: 'search', autocomplete: 'off', 'aria-describedby': 'tekrar-kart-ara-bilgi' });
    bilgi.id = 'tekrar-kart-ara-bilgi';
    girdi.addEventListener('input', () => {
      const q = trKucuk(boslukTemizle(girdi.value));
      let gorunen = 0;
      liste.querySelectorAll('li').forEach((li) => { li.hidden = !!q && !li.dataset.ara.includes(q); if (!li.hidden) gorunen++; });
      bilgi.textContent = q ? `${gorunen} kart gösteriliyor.` : '';
    });
    arama = el('div', { sinif: 'alan' }, el('label', { sinif: 'alan__etiket', for: 'tekrar-kart-ara', metin: 'Kartlarda ara' }), girdi, bilgi);
  }

  kap.replaceChildren(
    geri,
    sayfaUst(deste.ad, deste.aciklama || `${kartlar.length} kart`, 'tekrar-deste-baslik'),
    el('section', { sinif: 'kart tekrar-bugun', 'aria-label': 'Bu destenin tekrarı' },
      el('p', { metin: durum }),
      el('div', { sinif: 'tekrar-eylemler' },
        el('button', { type: 'button', sinif: 'btn btn--birincil', disabled: !t.kartlar.length,
          onclick: () => oturumBaslat(kap, { deste, donus: () => ciz('#tekrar-deste-baslik') }) },
        t.kartlar.length ? `Bu desteyi çalış (${t.kartlar.length})` : 'Bu desteyi çalış'),
        el('button', { type: 'button', sinif: 'btn btn--ikincil', onclick: (e) => kartFormuAc({ desteId: id, acici: e.currentTarget, sonra: () => ciz('#tekrar-kartlar-baslik') }) },
          'Kart ekle')),
      kutuGorunumu(kutuDagilimi(id), srsAyarlari().araliklar)),
    bolum('tekrar-kartlar-baslik', `Kartlar (${kartlar.length})`, null,
      arama,
      kartlar.length ? liste : bosDurum('Henüz kart yok. “Kart ekle” ile başla ya da CSV dosyasından aktar.')),
    bolum('tekrar-deste-islem-baslik', 'Deste işlemleri', null,
      el('div', { sinif: 'tekrar-eylemler' },
        el('button', { type: 'button', sinif: 'btn btn--hayalet', metin: 'Adını değiştir',
          onclick: (e) => desteAdiPenceresi({ baslik: 'Desteyi yeniden adlandır', deger: deste.ad, dugme: 'Kaydet', acici: e.currentTarget,
            kaydet: (ad) => { const s = desteYenidenAdlandir(id, ad); return s.tamam ? null : s.hata; },
            sonra: () => ciz('#tekrar-deste-baslik') }) }),
        el('button', { type: 'button', sinif: 'btn btn--hayalet', metin: 'CSV içe aktar',
          onclick: () => dosyaSec((f) => csvYukle(f, { desteId: id, sonra: () => ciz('#tekrar-kartlar-baslik') })) }),
        el('button', { type: 'button', sinif: 'btn btn--hayalet', metin: 'CSV indir', disabled: !kartlar.length,
          onclick: () => csvIndir(csvOlustur(id), `${dosyaAdiYap(deste.ad)}-${gunAnahtari()}.csv`) }),
        el('button', { type: 'button', sinif: 'btn btn--hayalet tehlike-metin', metin: 'Desteyi sil',
          onclick: () => {
            if (!confirm(`“${deste.ad}” destesi ve içindeki ${kartlar.length} kart silinsin mi? Bu işlem geri alınamaz; istersen önce CSV olarak indir.`)) return;
            const s = desteSil(id);
            if (!s.tamam) { toastGoster(s.hata, { tur: 'hata' }); return; }
            toastGoster('Deste silindi.');
            git('/tekrar');
          } })),
      el('p', { sinif: 'alan__ipucu', metin: 'Bu desteye CSV aktarırken dosyadaki deste sütunu dikkate alınmaz; tüm kartlar bu desteye eklenir.' })));
  if (odak) odakla(kap.querySelector(odak));
}

// ---------- Geri çağırma oturumu ----------
// Önce ön yüz: öğrenci cevabı düşünür ya da yazar, sonra kartı çevirir ve "Bildim / Bilemedim" der.
// Bilemediği kart oturum sonunda bir kez daha (alıştırma, kutu değişmez) gösterilir.
function oturumBaslat(kap, { deste = null, donus }) {
  const t = bugununTekrari({ deste: deste?.id ?? null });
  if (!t.kartlar.length) { toastGoster('Şu an tekrar edilecek kart yok.'); return; }
  tekrarSayfasiniKapat();
  const no = cizimNo;
  const adlar = new Map(desteOzetleri().map((d) => [d.id, d.ad]));
  const araliklar = srsAyarlari().araliklar;
  const sira = t.kartlar.map((kart) => ({ kart, tekrarMi: false }));
  const sonuc = { bildi: 0, bilemedi: 0 };
  let i = 0;

  const ilerleme = ilerlemeCubugu('tekrar-oturum-ilerleme');
  const ilerlemeAyarla = (n) => ilerleme.ayarla(n, sira.length, `${sira.length} karttan ${n} tamamlandı`);
  const bitir = el('button', { type: 'button', sinif: 'btn btn--hayalet btn--kucuk', metin: 'Bitir', onclick: () => ozet() });
  const sahne = el('div', { sinif: 'yigin', style: '--yigin-bosluk: var(--b-4)' });
  kap.replaceChildren(el('section', { sinif: 'tekrar-oturum yigin', 'aria-labelledby': 'tekrar-oturum-baslik', style: '--yigin-bosluk: var(--b-4)' },
    el('div', { sinif: 'tekrar-oturum__ust' },
      el('h1', { id: 'tekrar-oturum-baslik', sinif: 'tekrar-oturum__baslik', metin: deste ? deste.ad : 'Bugünün tekrarı' }), bitir),
    ilerleme.kok, sahne));

  function goster() {
    if (no !== cizimNo) return;
    ilerlemeAyarla(i);
    const { kart, tekrarMi } = sira[i];
    const on = el('p', { sinif: 'tkart__on', id: 'tkart-on', metin: kart.on });
    const kartOge = el('article', { sinif: 'tkart', 'aria-labelledby': 'tkart-on' },
      el('div', { sinif: 'tkart__ust' },
        el('span', { sinif: 'rozet rozet--birincil', metin: adlar.get(kart.deste) ?? 'Deste' }),
        tekrarMi ? el('span', { sinif: 'rozet rozet--gunes', metin: 'Bir kez daha (alıştırma)' }) : el('span', { sinif: 'rozet', metin: `Kutu ${kart.kutu}` })),
      el('p', { sinif: 'tkart__etiket', metin: 'Ön yüz' }), on);
    const yanit = el('textarea', { sinif: 'girdi', id: 'tekrar-yanit', rows: '2', maxlength: String(SINIRLAR.arka), autocomplete: 'off', 'aria-describedby': 'tekrar-yanit-ipucu' });
    const cevir = el('button', { type: 'button', sinif: 'btn btn--birincil btn--buyuk btn--blok', metin: 'Kartı çevir', onclick: () => arkaGoster() });
    yanit.addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); cevir.click(); } });
    const yanitAlani = el('div', { sinif: 'alan' },
      el('label', { sinif: 'alan__etiket', for: 'tekrar-yanit', metin: 'Cevabın (isteğe bağlı)' }), yanit,
      el('p', { sinif: 'alan__ipucu', id: 'tekrar-yanit-ipucu', metin: 'Önce cevabı aklından söyle ya da buraya yaz, sonra kartı çevir. Kısayol: Ctrl + Enter.' }));
    sahne.replaceChildren(kartOge, yanitAlani, cevir);
    odakla(on);

    function arkaGoster() {
      const yazilan = yanit.value.trim();
      yanitAlani.remove();
      cevir.remove();
      const cevap = el('p', { sinif: 'tkart__cevap', id: 'tkart-cevap', metin: kart.arka });
      kartOge.append(el('div', { sinif: 'tkart__arka' }, el('p', { sinif: 'tkart__etiket', metin: 'Arka yüz' }), cevap));
      if (yazilan) {
        sahne.append(el('div', { sinif: 'tkart__senin' },
          el('p', { sinif: 'tkart__etiket', metin: 'Senin cevabın' }), el('p', { metin: yazilan }),
          cevapBenzer(yazilan, kart.arka) && el('p', { sinif: 'tkart__eslesme', metin: 'Yazdığın cevap kartla aynı görünüyor.' })));
      }
      if (tekrarMi) {
        sahne.append(el('p', { sinif: 'soluk', metin: 'Bu alıştırma kutuları değiştirmez; kart yarın yeniden sorulacak.' }),
          el('button', { type: 'button', sinif: 'btn btn--birincil btn--buyuk btn--blok', metin: i + 1 < sira.length ? 'Sıradaki kart' : 'Bitir', onclick: ilerle }));
      } else {
        const b = sonrakiDurum(kart, true, araliklar);
        const y = sonrakiDurum(kart, false, araliklar);
        sahne.append(
          el('p', { sinif: 'tekrar-karar__soru', id: 'tekrar-karar-soru', metin: 'Kendine dürüstçe sor: cevabı biliyor muydun?' }),
          el('div', { sinif: 'tekrar-karar', role: 'group', 'aria-labelledby': 'tekrar-karar-soru' },
            el('button', { type: 'button', sinif: 'btn btn--ikincil', onclick: () => karar(false) },
              el('span', { metin: 'Bilemedim' }), el('small', { metin: `1. kutu · ${aralikMetni(y.aralik)}` })),
            el('button', { type: 'button', sinif: 'btn btn--birincil', onclick: () => karar(true) },
              el('span', { metin: 'Bildim' }), el('small', { metin: `${b.kutu}. kutu · ${aralikMetni(b.aralik)}` }))));
      }
      odakla(cevap);
    }

    function karar(bildi) {
      const s = cevapla(kart.id, bildi);
      if (!s.tamam) { toastGoster(s.hata, { tur: 'hata' }); return; }
      if (bildi) sonuc.bildi++;
      else { sonuc.bilemedi++; sira.push({ kart: s.kart, tekrarMi: true }); }
      ilerle();
    }
  }

  function ilerle() {
    i++;
    if (i < sira.length) goster();
    else ozet();
  }

  function ozet() {
    if (no !== cizimNo) return;
    ilerlemeAyarla(Math.min(i, sira.length));
    bitir.hidden = true;
    const desteId = deste?.id ?? null;
    const yapilan = sonuc.bildi + sonuc.bilemedi;
    const kalan = bugununTekrari({ deste: desteId });
    const s = sonrakiTekrar(desteId);
    const satirlar = [];
    satirlar.push(yapilan
      ? `${yapilan} kartı tekrar ettin: ${sonuc.bildi} kartı bildin, ${sonuc.bilemedi} kart 1. kutuya döndü.`
      : 'Bu sefer kart değerlendirmedin. İstediğin zaman kaldığın yerden devam edebilirsin.');
    if (sonuc.bilemedi) satirlar.push('Bilemediğin kartlar yarın yeniden gelecek; henüz öğrenme yolundalar, tekrarladıkça kutuları ilerler.');
    if (kalan.kartlar.length) satirlar.push(`Bugün için ${kalan.kartlar.length} kart daha var; istersen sonra devam edebilirsin.`);
    else if (kalan.bekleyen && !kalan.kalanHak) satirlar.push('Bugünkü kart sınırını tamamladın. Kısa bir mola iyi gelir.');
    else if (s) satirlar.push(`Sıradaki tekrar ${gunMetni(s.gun)}: ${s.sayi} kart.`);
    const baslik = el('h2', { metin: yapilan ? 'Tekrar tamam!' : 'Tekrar bitti' });
    sahne.replaceChildren(el('div', { sinif: 'kart yigin tekrar-ozet', style: '--yigin-bosluk: var(--b-3)' },
      baslik, ...satirlar.map((m) => el('p', { metin: m })),
      kutuGorunumu(kutuDagilimi(desteId), araliklar),
      el('div', { sinif: 'tekrar-eylemler' },
        el('button', { type: 'button', sinif: 'btn btn--birincil', metin: deste ? 'Desteye dön' : 'Tekrar Kartları’na dön', onclick: donus }))));
    odakla(baslik);
  }

  goster();
}
