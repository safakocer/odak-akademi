// Odak Araçları sayfası (S12, #/odak; K2: tikte depo okunmaz, bitişte odak korunur): dikkat dağıtıcı kontrol listesi, odak zamanlayıcı (çalışma + mola), blok sonrası 1-5 öz değerlendirme, mola araçları ve haftalık odak günlüğü
import { el, spriteIkon, toastGoster } from '../../core/ui.js';
import { duyur, odakla } from '../../core/a11y.js';
import { etkinProfil } from '../../core/store.js';
import { sureBicimle, sureMetni, sayiBicimle, dakikaMetni } from '../../core/utils.js';
import {
  CALISMA_SECENEKLERI, ONERILEN_CALISMA, MOLA_SECENEKLERI, KONTROL_LISTESI, PUANLAR,
  odakVerisi, odakVerisiniGuncelle, bekleyeniKaydet, haftalikOzet, ortamKarsilastirmasi,
} from './odak-veri.js';
import {
  TUR_ADI, zamanlayiciKur, zamanlayiciDurumu, zamanlayiciDinle,
  zamanlayiciBaslat, zamanlayiciDuraklat, zamanlayiciDevam, zamanlayiciBitir,
} from './odak-zamanlayici.js';
import { aracBilgisi, egzersizBilgisi } from '../katalog.js';
import { egzersizKarti } from '../egzersiz-listesi.js';

const GUN_KISA = new Intl.DateTimeFormat('tr-TR', { weekday: 'short' });
const GUN_UZUN = new Intl.DateTimeFormat('tr-TR', { weekday: 'long' });
const puanMetni = (p) => (p == null ? '—' : sayiBicimle(p, 1));

let birak = null; // sayfa yeniden çizilince ya da kapanınca zamanlayıcı dinleyicisi bırakılır

export function odakSayfasiniKapat() {
  birak?.();
  birak = null;
}

/** #/odak sayfasını kap içine çizer */
export function odakSayfasiCiz(kap) {
  odakSayfasiniKapat();
  if (!kap) return;
  zamanlayiciKur();
  const bilgi = aracBilgisi('odak');
  const ust = [
    el('a', { sinif: 'btn btn--hayalet btn--kucuk geri-baglanti', href: '#/' }, spriteIkon('ok-sag', 'ikon ikon--kucuk ikon--ters'), 'Ana sayfa'),
    el('div', { sinif: 'sayfa-ust', 'data-modul': bilgi.modul },
      el('span', { sinif: 'kart__ikon', 'aria-hidden': 'true' }, spriteIkon(bilgi.ikon, 'ikon')),
      el('div', {}, el('h1', { metin: bilgi.baslik }),
        el('p', { sinif: 'soluk', metin: 'Ders çalışırken kullan: ortamını hazırla, kısa bloklarla çalış, molada dinlen, nasıl geçtiğini not et.' }))),
  ];
  if (!etkinProfil()) {
    kap.replaceChildren(...ust, el('p', { sinif: 'bos-durum', metin: 'Odak araçlarını kullanmak için önce bir profil oluştur.' }));
    return;
  }

  const gunluk = gunlukBolumu();
  const zaman = zamanlayiciBolumu({ kaydedince: () => gunluk.guncelle() });
  const hazirlik = hazirlikBolumu({ onaylaninca: () => zaman.odakla() });
  kap.replaceChildren(...ust,
    el('div', { sinif: 'odak-duzen' },
      el('div', { sinif: 'odak-sutun' }, hazirlik, zaman.kok),
      el('div', { sinif: 'odak-sutun' }, molaBolumu(), gunluk.kok)));

  birak = zamanlayiciDinle((d, olay) => {
    zaman.guncelle(d, olay !== 'tik'); // tikte depo okunmaz (saniyede 4 kez)
    if (olay === 'bitti' || olay === 'bitirildi') {
      gunluk.guncelle();
      // K2: odaktaki düğme (Duraklat/Bitir) gizlendiyse klavye odağı kaybolmasın
      const o = document.activeElement;
      if (!document.hidden && (!o || o === document.body || (zaman.kok.contains(o) && !o.offsetParent))) zaman.odakla();
    }
  });
  zaman.guncelle(zamanlayiciDurumu());
}

// ---------- 1) Ortamını hazırla ----------
function hazirlikBolumu({ onaylaninca }) {
  const { hazirlik } = odakVerisi();
  const kutular = KONTROL_LISTESI.map((k) => el('input', { type: 'checkbox', name: 'hazirlik', value: k.ad, checked: hazirlik.isaretli.includes(k.ad) }));
  const ilerleme = el('p', { sinif: 'alan__ipucu', 'aria-live': 'polite' });
  const onay = el('button', { type: 'button', sinif: 'btn btn--ikincil', metin: 'Çalışma ortamımı hazırladım' });
  const hazir = el('div', { sinif: 'bildirim bildirim--basari', tabindex: '-1' },
    el('p', {}, el('strong', { metin: 'Ortamın hazır. ' }), 'Bugün için işaretlendi; bu arada başlattığın bloklar günlükte “ortam hazır” olarak görünür.'));

  function goster(h) {
    const n = h.isaretli.length;
    const tamam = n === KONTROL_LISTESI.length;
    hazir.hidden = !h.onay;
    onay.hidden = h.onay;
    onay.className = `btn ${tamam ? 'btn--birincil' : 'btn--ikincil'}`;
    ilerleme.textContent = h.onay ? '' : tamam
      ? 'Hepsi tamam. Onaylayıp zamanlayıcıya geçebilirsin.'
      : `${n} / ${KONTROL_LISTESI.length} hazır. Hepsini yapamasan da olur; yapabildiklerini işaretle.`;
  }

  const form = el('fieldset', { sinif: 'grup odak-liste' }, el('legend', { metin: 'Başlamadan önce' }),
    KONTROL_LISTESI.map((k, i) => el('label', { sinif: 'secim' }, kutular[i], el('span', { metin: k.metin }))));
  // Liste değişirse onay yeniden istenir (kutu kaldırıldıysa ortam artık "hazır" sayılmaz)
  form.addEventListener('change', () => {
    const v = odakVerisiniGuncelle((d) => {
      d.hazirlik.isaretli = kutular.filter((k) => k.checked).map((k) => k.value);
      d.hazirlik.onay = false;
    });
    if (v) goster(v.hazirlik);
  });
  onay.addEventListener('click', () => {
    const v = odakVerisiniGuncelle((d) => { d.hazirlik.onay = true; });
    if (!v) return;
    goster(v.hazirlik);
    duyur('Çalışma ortamın hazır olarak işaretlendi. Zamanlayıcıya geçebilirsin.');
    onaylaninca?.();
  });
  goster(hazirlik);

  return el('section', { sinif: 'kart odak-kart', 'aria-labelledby': 'odak-hazirlik-baslik' },
    el('h2', { id: 'odak-hazirlik-baslik', metin: 'Ortamını hazırla' }),
    el('p', { sinif: 'soluk', metin: 'Dikkatini dağıtan şeyleri çalışmadan önce uzaklaştırmak işini kolaylaştırır.' }),
    form, ilerleme, el('div', {}, onay), hazir);
}

// ---------- 2) Odak zamanlayıcı + öz değerlendirme ----------
function secimGrubu({ ad, baslik, secenekler, secili, etiket }) {
  return el('fieldset', { sinif: 'grup' }, el('legend', { metin: baslik }),
    el('div', { sinif: 'segment' }, secenekler.map((s) => el('label', {},
      el('input', { type: 'radio', name: ad, value: String(s), checked: s === secili }),
      el('span', { metin: etiket(s) })))));
}

function zamanlayiciBolumu({ kaydedince }) {
  const { ayar } = odakVerisi();
  const zil = el('input', { type: 'checkbox', role: 'switch', name: 'zil', checked: ayar.zil });
  const ayarlar = el('fieldset', { sinif: 'odak-ayar' },
    el('legend', { sinif: 'ekran-okuyucu', metin: 'Zamanlayıcı seçimleri' }),
    secimGrubu({ ad: 'calismaDk', baslik: 'Çalışma bloğu', secenekler: CALISMA_SECENEKLERI, secili: ayar.calismaDk, etiket: (s) => `${s} dk` }),
    el('p', { sinif: 'alan__ipucu odak-oneri', metin: `Ortaokul için önerimiz ${ONERILEN_CALISMA.join(' ya da ')} dakikalık kısa bloklar. Odaklanmak zor geliyorsa 10 dakikayla başla.` }),
    secimGrubu({ ad: 'molaDk', baslik: 'Mola', secenekler: MOLA_SECENEKLERI, secili: ayar.molaDk, etiket: (s) => `${s} dk` }),
    el('label', { sinif: 'anahtar' },
      el('span', {}, 'Bitişte zil çal', el('small', { sinif: 'soluk', metin: 'Ses efektleri kapalı olsa da çalar.' })),
      zil, el('span', { sinif: 'anahtar__ray', 'aria-hidden': 'true' })));
  ayarlar.addEventListener('change', (e) => {
    const { name, value, checked } = e.target;
    odakVerisiniGuncelle((v) => {
      if (name === 'zil') v.ayar.zil = checked;
      else if (name === 'calismaDk' || name === 'molaDk') v.ayar[name] = Number(value);
    });
    guncelle(zamanlayiciDurumu(), true);
  });

  const sure = el('span', { sinif: 'odak-halka__sure' });
  const turEl = el('span', { sinif: 'odak-halka__tur' });
  const halka = el('div', { sinif: 'odak-halka', role: 'timer', 'aria-live': 'off', 'aria-atomic': 'true' },
    el('div', { sinif: 'odak-halka__ic' }, sure, turEl));
  const durum = el('p', { sinif: 'odak-durum' });

  const baslat = el('button', { type: 'button', sinif: 'btn btn--birincil btn--buyuk', onclick: () => zamanlayiciBaslat('calisma') });
  const mola = el('button', { type: 'button', sinif: 'btn btn--ikincil', onclick: () => zamanlayiciBaslat('mola') });
  const duraklat = el('button', { type: 'button', sinif: 'btn btn--ikincil', metin: 'Duraklat', onclick: () => zamanlayiciDuraklat() });
  const devam = el('button', { type: 'button', sinif: 'btn btn--birincil', metin: 'Devam et', onclick: () => zamanlayiciDevam() });
  const bitir = el('button', { type: 'button', sinif: 'btn btn--hayalet', onclick: () => {
    const d = zamanlayiciDurumu();
    if (d?.tur === 'calisma' && !confirm('Bloğu şimdi bitirmek istiyor musun? 1 dakikadan uzun sürdüyse günlüğe yazılır.')) return;
    zamanlayiciBitir();
  } });
  const eylemler = el('div', { sinif: 'odak-eylemler' }, baslat, devam, duraklat, mola, bitir);
  const degerlendirAlani = el('div', { hidden: true });
  let sonBekleyenId = null;
  let veri = odakVerisi(); // önbellek: yalnız durum değişince yeniden okunur

  function guncelle(d, yenile = false) {
    if (yenile || !veri) veri = odakVerisi();
    const { ayar: a, bekleyen } = veri ?? {};
    if (!a) return;
    const toplamMs = (d?.dk ?? a.calismaDk) * 60000;
    const kalan = d ? d.kalanMs : toplamMs;
    sure.textContent = sureBicimle(Math.ceil(kalan / 1000));
    turEl.textContent = d ? `${TUR_ADI[d.tur]}${d.calisiyor ? '' : ' · duraklatıldı'}` : 'Hazır';
    halka.dataset.tur = d?.tur ?? 'hazir';
    halka.style.setProperty('--deger', `${d ? Math.round(((toplamMs - kalan) / toplamMs) * 1000) / 10 : 0}%`);
    halka.setAttribute('aria-label', d ? `${TUR_ADI[d.tur]}, kalan ${sureMetni(Math.ceil(kalan / 1000))}` : `Hazır, ${a.calismaDk} dakikalık blok`);

    ayarlar.disabled = !!d;
    baslat.hidden = !!d || !!bekleyen; // önce değerlendirme (ya da "Puansız kaydet")
    baslat.textContent = `Çalışmaya başla (${a.calismaDk} dk)`;
    mola.hidden = !!d || !!bekleyen;
    mola.textContent = `Mola ver (${a.molaDk} dk)`;
    duraklat.hidden = !d?.calisiyor;
    devam.hidden = !d || d.calisiyor;
    bitir.hidden = !d;
    bitir.textContent = d?.tur === 'mola' ? 'Molayı bitir' : 'Bloğu bitir';
    durum.textContent = !d
      ? (bekleyen ? 'Önce bu bloğu değerlendir, sonra molaya geç.' : 'Hazır olduğunda başlat. Bitince nazik bir zil çalar.')
      : !d.calisiyor ? 'Duraklatıldı. Hazır olduğunda devam et.'
        : d.tur === 'calisma' ? 'Tek bir işe odaklan. Aklına başka bir şey gelirse bir kâğıda not edip devam et.'
          : 'Mola: ekrandan uzaklaş, su iç, biraz hareket et ya da nefes egzersizi yap.';

    // Bekleyen blok: değerlendirme kartı (yalnız değişince yeniden çizilir; seçim kaybolmasın)
    if ((bekleyen?.id ?? null) !== sonBekleyenId) {
      sonBekleyenId = bekleyen?.id ?? null;
      degerlendirAlani.replaceChildren(bekleyen ? degerlendirmeKarti(bekleyen, kaydet) : '');
      degerlendirAlani.hidden = !bekleyen;
    }
  }

  function kaydet(puan, molayaGec) {
    bekleyeniKaydet(puan);
    kaydedince?.();
    if (puan != null && puan <= 2) {
      toastGoster('Olur böyle. Bir sonraki blokta dikkat dağıtıcıları azaltmayı ya da daha kısa bir blok denemeyi düşünebilirsin.', { sure: 7000 });
    } else if (puan != null) duyur('Günlüğe yazıldı.');
    if (molayaGec) { zamanlayiciBaslat('mola'); duraklat.focus(); } // kart kalkınca odak boşa düşmesin
    else { guncelle(zamanlayiciDurumu(), true); baslat.focus(); }
  }

  const kok = el('section', { sinif: 'kart odak-kart', 'aria-labelledby': 'odak-zaman-baslik' },
    el('h2', { id: 'odak-zaman-baslik', metin: 'Odak zamanlayıcı' }),
    ayarlar,
    el('div', { sinif: 'odak-saat' }, halka, durum),
    degerlendirAlani,
    eylemler,
    el('p', { sinif: 'alan__ipucu', metin: 'Başka bir sekmeye geçsen ya da sayfayı yenilesen de süre doğru işler. Tarayıcıyı tamamen kapatırsan zil çalmaz; döndüğünde bloğun yine günlüğe yazılır.' }));

  // Odak sırası: değerlendirme kartı → Başla → halka
  const odakHedefi = () => (!degerlendirAlani.hidden && degerlendirAlani.querySelector('h3')) || (!baslat.hidden && baslat) || halka;
  return { kok, guncelle, odakla: () => odakla(odakHedefi()) };
}

function degerlendirmeKarti(blok, kaydet) {
  const id = `odak-degerlendir-${blok.id}`;
  const baslik = el('h3', { id, metin: 'Bu blok nasıl geçti?' });
  const dkMetni = blok.tamamlandi ? `${blok.dk} dakikalık bloğu tamamladın.` : `Bloğu erken bitirdin (${dakikaMetni(blok.sureSn)}).`;
  const kaydetDugmeleri = [
    el('button', { type: 'button', sinif: 'btn btn--birincil', metin: 'Kaydet ve molaya geç', disabled: true, onclick: () => kaydet(secili(), true) }),
    el('button', { type: 'button', sinif: 'btn btn--ikincil', metin: 'Kaydet', disabled: true, onclick: () => kaydet(secili(), false) }),
  ];
  const puanlar = el('fieldset', { sinif: 'odak-puanlar' },
    el('legend', { metin: 'Ne kadar odaklandın? (1-5)' }),
    PUANLAR.map((p) => el('label', { sinif: 'odak-puan' },
      el('input', { type: 'radio', name: `puan-${blok.id}`, value: String(p.deger) }),
      el('span', {}, el('b', { metin: String(p.deger) }), el('small', { 'aria-hidden': 'true', metin: p.kisa }),
        el('span', { sinif: 'ekran-okuyucu', metin: p.uzun })))));
  const secili = () => Number(puanlar.querySelector('input:checked')?.value) || null;
  puanlar.addEventListener('change', () => kaydetDugmeleri.forEach((d) => { d.disabled = !secili(); }));
  return el('div', { sinif: 'odak-degerlendir', role: 'group', 'aria-labelledby': id },
    baslik,
    el('p', { metin: `${dkMetni} Kendine dürüstçe puan ver; bu not yalnızca senin için.` }),
    puanlar,
    el('div', { sinif: 'odak-eylemler odak-eylemler--sola' }, kaydetDugmeleri,
      el('button', { type: 'button', sinif: 'btn btn--hayalet', metin: 'Puansız kaydet', onclick: () => kaydet(null, false) })));
}

// ---------- 3) Mola araçları (kart bilgileri katalog.js'ten) ----------
function molaBolumu() {
  const kartlar = ['nefes', 'goz-molasi'].map(egzersizBilgisi).filter(Boolean);
  return el('section', { sinif: 'kart odak-kart', 'aria-labelledby': 'odak-mola-baslik' },
    el('h2', { id: 'odak-mola-baslik', metin: 'Molada' }),
    el('p', { sinif: 'soluk', metin: 'Molada ekrana değil, kendine iyi gelen bir şeye zaman ayır. İstersen bunlardan birini dene:' }),
    el('ul', { sinif: 'izgara modul-izgara', 'aria-labelledby': 'odak-mola-baslik' }, kartlar.map(egzersizKarti)));
}

// ---------- 4) Odak günlüğü: son 7 gün ----------
function gunlukBolumu() {
  const icerik = el('div', { sinif: 'odak-gunluk' });
  function guncelle() {
    const veri = odakVerisi();
    if (!veri) return;
    const o = haftalikOzet(veri.bloklar);
    const enCok = Math.max(30, ...o.gunler.map((g) => g.dk));
    const grafik = el('ol', { sinif: 'odak-grafik', 'aria-label': 'Son 7 günün odak dakikaları' },
      o.gunler.map((g) => el('li', { 'data-bugun': g.bugun || null },
        el('span', { sinif: 'ekran-okuyucu', metin: `${g.bugun ? 'Bugün, ' : ''}${GUN_UZUN.format(g.tarih)}: ${g.blok
          ? `${g.blok} blok, ${g.dk} dakika${g.ortPuan != null ? `, ortalama odak ${puanMetni(g.ortPuan)}` : ''}` : 'kayıt yok'}.` }),
        el('span', { sinif: 'odak-grafik__sutun', 'aria-hidden': 'true' },
          el('span', { sinif: 'odak-grafik__deger', metin: g.dk ? String(g.dk) : '' }),
          el('span', { sinif: 'odak-grafik__alan' },
            el('span', { sinif: 'odak-grafik__cubuk', style: `--yukseklik: ${g.dk ? Math.max(4, (g.dk / enCok) * 100) : 0}%` })),
          el('span', { sinif: 'odak-grafik__gun', metin: GUN_KISA.format(g.tarih) }),
          el('span', { sinif: 'odak-grafik__puan', metin: puanMetni(g.ortPuan) })))));

    const notlar = [];
    if (!o.toplam.blok) notlar.push('Son 7 günde kayıt yok. İlk bloğunu bitirince burada görünecek.');
    else if (o.onceki.blok) {
      const fark = o.toplam.dk - o.onceki.dk;
      notlar.push(fark > 0 ? `Önceki 7 güne göre ${fark} dakika daha fazla odaklı çalıştın.`
        : fark < 0 ? `Önceki 7 günde ${o.onceki.dk} dakikaydı. Önemli olan her gün kısa da olsa düzenli çalışmak.`
          : 'Önceki 7 günle aynı sürede çalıştın; düzenini koruyorsun.');
    }
    const son = veri.bloklar.filter((b) => b.puan != null).slice(-5);
    if (son.length >= 3 && son.reduce((t, b) => t + b.puan, 0) / son.length < 3 && veri.ayar.calismaDk >= 20) {
      notlar.push('Son bloklarda odaklanmak zor gelmiş. Bir süre daha kısa bloklar (10-15 dk) denemek iyi gelebilir.');
    }
    const ortam = ortamKarsilastirmasi(veri.bloklar);
    if (ortam) {
      notlar.push(`Ortamını hazırladığın bloklarda ortalama odağın ${puanMetni(ortam.hazir)}, hazırlamadıklarında ${puanMetni(ortam.degil)}.`);
    }

    icerik.replaceChildren(
      el('ul', { sinif: 'mini-istatistik', 'aria-label': 'Son 7 gün özeti' },
        el('li', {}, el('strong', { metin: String(o.toplam.blok) }), el('span', { metin: 'Blok' })),
        el('li', {}, el('strong', { metin: `${o.toplam.dk} dk` }), el('span', { metin: 'Odaklı çalışma' })),
        el('li', {}, el('strong', { metin: o.toplam.ortPuan != null ? `${puanMetni(o.toplam.ortPuan)}/5` : '—' }), el('span', { metin: 'Ortalama odak' }))),
      grafik,
      el('p', { sinif: 'alan__ipucu', metin: 'Sütun: o günkü odaklı çalışma dakikası. Altı çizili gün bugün. En alttaki sayı: o günün ortalama öz değerlendirmesi (1-5).' }),
      ...notlar.map((n) => el('p', { sinif: 'odak-not', metin: n })));
  }
  guncelle();
  const kok = el('section', { sinif: 'kart odak-kart', 'aria-labelledby': 'odak-gunluk-baslik' },
    el('h2', { id: 'odak-gunluk-baslik', metin: 'Odak günlüğü' }),
    el('p', { sinif: 'soluk', metin: 'Son 7 gün. Karşılaştırma yalnızca kendi geçmişinle.' }),
    icerik);
  return { kok, guncelle };
}
