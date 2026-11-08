// Ortak metin seçici: kütüphane metinleri ve öğrencinin kendi metinlerinden birini seçtirir (arama + filtre; S34-son: arayüzde “süzgeç” yerine “filtre”); Hızlı Oku, Oku ve Anla, ileride Test ve Akıllı Kurs kullanır
import { el } from '../core/ui.js';
import { sayiBicimle } from '../core/utils.js';
import {
  tumMetinler, metinleriSuz, metinBankasiDurumu, secimAl, secimAyarla, okumaBilgisi, favoriMi, profilSinifi, METIN_TURLERI, ZORLUK_DERECESI,
} from './text-bank.js';

// Seçici bir formun içinde durur: Enter ile egzersiz başlamasın diye arama kutusunda Enter yutulur
const GOSTER = Object.freeze([
  ['sinif', (s) => (s ? `Sınıfıma uygun (${s}. sınıf)` : 'Sınıfıma uygun')],
  ['tum', () => 'Tüm sınıflar'],
  ['okunmadi', () => 'Okumadıklarım'],
  ['favori', () => 'Favorilerim'],
  ['kendi', () => 'Kendi metinlerim'],
]);

/** Metnin kısa bilgi satırı: “6. sınıf · Fen ve doğa · zorluk 3/5 · 175 kelime · ✓ Okundu” */
export function metinBilgiSatiri(m, profilId) {
  const parca = [m.sinif ? `${m.sinif}. sınıf` : null, METIN_TURLERI[m.tur], m.zorluk ? `zorluk ${m.zorluk}/${ZORLUK_DERECESI}` : null,
    `${sayiBicimle(m.kelime)} kelime`];
  if (m.sorular.length) parca.push(`${m.sorular.length} soru`);
  if (okumaBilgisi(m.kimlik, profilId)) parca.push('✓ Okundu');
  return parca.filter(Boolean).join(' · ');
}

/**
 * Hazırlık denetimi (egzersizin hazirlikDenetle'si): metin seçilmediyse mesaj ve odak döner, seçildiyse undefined.
 * sorulu: yalnız sorulu metinler seçilebiliyorsa mesaj buna göre yazılır
 */
export function metinSecimHatasi(secici, { sorulu = false } = {}) {
  if (secici?.secili()) return undefined;
  const mesaj = metinBankasiDurumu().yuklendi
    ? 'Okumak için bir metin seç.'
    : `Sınıf metinleri yüklenemedi. Sayfayı yenileyip yeniden dene ya da Kütüphane’de ${sorulu ? 'sorulu bir ' : ''}kendi metnini ekle.`;
  return { mesaj, odak: secici?.odak() };
}

/**
 * Metin seçici. Önce metinBankasiYukle() beklenmiş olmalı.
 * secenekler: { egzersiz (seçim hatırlama anahtarı), kimlik (alan id öneki), suzgec?(metin) → bool (ör. yalnız sorulu metinler), degisince?(metin) }
 * Döner: { kok, secili() → metin | null, odak() }
 */
export function metinSeciciOlustur({ egzersiz, kimlik = 'ms', suzgec = () => true, degisince } = {}) {
  const uygun = () => tumMetinler().filter(suzgec);
  const ps = profilSinifi();
  const ad = `${kimlik}-metin`;

  // Başlangıç seçimi: kütüphaneden gelen ya da son seçilen; yoksa sınıfına uygun ilk okunmamış metin
  const ilk = () => {
    const liste = uygun();
    const kayitli = liste.find((m) => m.kimlik === secimAl(egzersiz));
    if (kayitli) return kayitli;
    const sirali = metinleriSuz(liste, {});
    return sirali.find((m) => m.sinif === ps && !okumaBilgisi(m.kimlik)) ?? sirali.find((m) => m.sinif === ps) ?? sirali[0] ?? null;
  };
  let secili = ilk();
  if (secili) secimAyarla(egzersiz, secili.kimlik);

  const arama = el('input', { type: 'search', id: `${kimlik}-ara`, name: `${kimlik}-ara`, sinif: 'girdi', autocomplete: 'off',
    placeholder: 'Başlıkta ya da metinde ara', 'aria-label': 'Metin ara' });
  const goster = el('select', { id: `${kimlik}-goster`, name: `${kimlik}-goster`, sinif: 'girdi', 'aria-label': 'Hangi metinler gösterilsin' },
    // Profilde sınıf yoksa “Sınıfıma uygun” seçeneği hiçbir şeyi süzmeyeceği için gösterilmez
    GOSTER.filter(([v]) => ps || v !== 'sinif').map(([v, etiket]) => el('option', { value: v, metin: etiket(ps) })));
  goster.value = ps && (!secili || secili.sinif === ps) ? 'sinif' : (secili?.kaynak === 'kendi' ? 'kendi' : 'tum');
  const sayi = el('p', { sinif: 'metin-secici__sayi', 'aria-live': 'polite' });
  // Kaydırma dış kutuda; liste kendi yüksekliğinde kalır, satırlar sıkışıp üst üste binmez
  const liste = el('div', { sinif: 'metin-secici__liste', role: 'radiogroup', 'aria-label': 'Metinler' });
  const kaydir = el('div', { sinif: 'metin-secici__kaydir' }, liste);
  const bos = el('p', { sinif: 'bos-durum metin-secici__bos', hidden: true });
  const durum = metinBankasiDurumu();
  const uyari = !durum.yuklendi && el('p', { sinif: 'okuma-ayar__uyari', metin: 'Sınıf metinleri yüklenemedi. Uygulamayı yerel sunucuyla ya da internet adresinden açıp sayfayı yenile. Kendi metinlerin aşağıda.' });

  const kok = el('fieldset', { sinif: 'grup metin-secici' }, el('legend', { metin: 'Metin' }),
    el('div', { sinif: 'metin-secici__suz' }, arama, goster),
    uyari, sayi, kaydir, bos,
    el('p', { sinif: 'okuma-ayar__not' }, 'Kendi metnini eklemek ya da metinlere göz atmak için ',
      el('a', { href: '#/kutuphane', metin: 'Kütüphane’ye git' }), ' (bu çalışma kapanır).'));

  function ciz() {
    const v = goster.value;
    const suz = { arama: arama.value, sinif: v === 'sinif' ? ps ?? '' : '', durum: v === 'okunmadi' ? 'okunmadi' : '', favori: v === 'favori', tur: v === 'kendi' ? 'kendi' : '' };
    const bulunan = metinleriSuz(uygun(), suz);
    // Seçili metin süzgece uymasa da listenin başında görünür kalır
    const gosterilen = secili && !bulunan.some((m) => m.kimlik === secili.kimlik) ? [secili, ...bulunan] : bulunan;
    liste.replaceChildren(...gosterilen.map((m) => el('label', { sinif: 'metin-secenek' },
      el('input', { type: 'radio', name: ad, value: m.kimlik, checked: m.kimlik === secili?.kimlik, 'aria-describedby': `${ad}-${m.kimlik}` }),
      el('span', { sinif: 'metin-secenek__ad', metin: m.ad }),
      el('span', { sinif: 'metin-secenek__bilgi', id: `${ad}-${m.kimlik}`,
        metin: `${favoriMi(m.kimlik) ? '★ Favori · ' : ''}${metinBilgiSatiri(m)}` }))));
    sayi.textContent = bulunan.length ? `${bulunan.length} metin` : 'Bu filtreye uyan metin yok.';
    bos.hidden = gosterilen.length > 0;
    bos.textContent = v === 'kendi'
      ? 'Henüz uygun bir kendi metnin yok. Kütüphane’de “Kendi metnini ekle” ile ekleyebilirsin.'
      : 'Bu filtreye uyan metin yok. “Tüm sınıflar”ı seçmeyi dene.';
  }

  arama.addEventListener('keydown', (e) => { if (e.key === 'Enter') e.preventDefault(); });
  arama.addEventListener('input', ciz);
  goster.addEventListener('change', ciz);
  liste.addEventListener('change', (e) => {
    if (e.target?.name !== ad) return;
    secili = uygun().find((m) => m.kimlik === e.target.value) ?? secili;
    if (secili) secimAyarla(egzersiz, secili.kimlik);
    try { degisince?.(secili); } catch (h) { console.error('[metin-secici]', h); }
  });
  ciz();

  return {
    kok,
    secili: () => secili,
    odak: () => (liste.querySelector('input:checked') ?? liste.querySelector('input') ?? arama),
  };
}
