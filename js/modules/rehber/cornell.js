// Cornell not alma (S22, #/rehber/cornell): not listesi, ekranda doldurulan not (anahtar sorular, notlar, özet; otomatik kayıt, "kendini yokla"), dolu notu ya da boş şablonu yazdırma
import { el, spriteIkon, toastGoster } from '../../core/ui.js';
import { duyur, odakla } from '../../core/a11y.js';
import { etkinProfil } from '../../core/store.js';
import { git } from '../../core/router.js';
import { tarihMetni } from '../../core/utils.js';
import { calismaVerisi, notBul, notOlustur, notGuncelle, notSil, SINIR } from './rehber-veri.js';
import { geriBaglanti, sayfaUst, dersListesi, yazdirDugmesi, yazdir } from './rehber-sayfasi.js';

const LISTE_ADRESI = '/rehber/cornell';
const BOS_SABLON_SINIFI = 'yazdir-bos-sablon';
const KAYIT_GECIKME_MS = 600;

const ADIMLAR = [
  'Derste ya da okurken “Notlar” alanına kısa cümleler, maddeler ve örnekler yaz.',
  'Aynı gün “Anahtar sorular” alanına, notlarındaki önemli noktalar için soru ya da anahtar kelime ekle.',
  'En alta konuyu 2-3 cümleyle kendi sözlerinle özetle.',
  'Tekrar ederken notları gizle; yalnız anahtar sorulara bakarak cevaplamaya çalış, sonra notlarla karşılaştır.',
];

const tarihYaz = (g) => (g ? tarihMetni(`${g}T12:00:00`) : '');

/** #/rehber/cornell (?not=<id> ile tek not). Döner: { kapat() } */
export function aracCiz(kap, { kart, sorgu }) {
  if (!etkinProfil()) {
    kap.replaceChildren(geriBaglanti('#/rehber', 'Çalışma Rehberi'), sayfaUst(kart.ikon, kart.baslik),
      el('p', { sinif: 'bos-durum', metin: 'Not tutmak için önce bir profil oluştur.' }));
    return { kapat() {} };
  }
  if (sorgu.not) return duzenleyiciCiz(kap, kart, sorgu.not);
  listeCiz(kap, kart);
  return { kapat() { document.documentElement.classList.remove(BOS_SABLON_SINIFI); } };
}

// ---------- Boş şablon (yalnız yazdırmada görünür) ----------
function bosSablon() {
  const satir = (etiket) => el('div', { sinif: 'cornell-bos__satir' }, el('span', { metin: etiket }), el('span', { sinif: 'cornell-bos__cizgi' }));
  return el('div', { sinif: 'cornell-bos yalniz-yazdir', 'aria-hidden': 'true' },
    el('div', { sinif: 'cornell-bos__ust' }, satir('Konu'), satir('Ders'), satir('Tarih')),
    el('div', { sinif: 'cornell-bos__govde' },
      el('div', { sinif: 'cornell-bos__kutu cornell-bos__kutu--ipucu' },
        el('strong', { metin: 'Anahtar sorular ve kelimeler' }), el('small', { metin: 'Dersten sonra doldur.' })),
      el('div', { sinif: 'cornell-bos__kutu cornell-bos__kutu--not' },
        el('strong', { metin: 'Notlar' }), el('small', { metin: 'Derste ya da okurken: kısa cümleler, maddeler, örnekler.' }))),
    el('div', { sinif: 'cornell-bos__kutu cornell-bos__kutu--ozet' },
      el('strong', { metin: 'Özet' }), el('small', { metin: 'Konuyu 2-3 cümleyle kendi sözlerinle yaz.' })));
}

const yontemKutusu = () => el('details', { sinif: 'kart rehber-nasil yazdirma-yok' },
  el('summary', { metin: 'Cornell yöntemi nasıl kullanılır?' }),
  el('ol', {}, ADIMLAR.map((a) => el('li', { metin: a }))));

// ---------- Liste ----------
function listeCiz(kap, kart) {
  const { notlar } = calismaVerisi();
  const yeni = el('button', { type: 'button', sinif: 'btn btn--birincil', onclick: () => {
    const s = notOlustur();
    if (!s.tamam) { toastGoster(s.hata, { tur: 'uyari' }); return; }
    git(`${LISTE_ADRESI}?not=${encodeURIComponent(s.not.id)}`);
  } }, spriteIkon('arti', 'ikon'), 'Yeni not');

  const liste = notlar.length
    ? el('ul', { sinif: 'rehber-liste', 'aria-labelledby': 'cornell-liste-baslik' }, notlar.map((n) => {
      const ad = n.baslik || 'Adsız not';
      const bilgi = [n.ders, tarihYaz(n.tarih)].filter(Boolean).join(', ');
      return el('li', { sinif: 'kart rehber-liste__oge' },
        el('a', { sinif: 'rehber-liste__baglanti', href: `#${LISTE_ADRESI}?not=${encodeURIComponent(n.id)}` },
          el('span', { sinif: 'rehber-liste__ad', metin: ad }),
          bilgi && el('span', { sinif: 'rehber-liste__bilgi', metin: bilgi })),
        el('button', { type: 'button', sinif: 'btn btn--hayalet btn--ikon', 'aria-label': `${ad} notunu sil`, title: 'Notu sil', onclick: () => {
          if (!confirm(`“${ad}” notu silinsin mi? Bu işlem geri alınamaz.`)) return;
          const s = notSil(n.id);
          if (!s.tamam) { toastGoster(s.hata, { tur: 'hata' }); return; }
          duyur('Not silindi.');
          listeCiz(kap, kart);
          odakla(kap.querySelector('h1'));
        } }, spriteIkon('cop', 'ikon')));
    }))
    : el('p', { sinif: 'bos-durum', metin: 'Henüz notun yok. “Yeni not” ile başla; derste ya da kitaptan çalışırken doldurabilirsin.' });

  kap.replaceChildren(
    geriBaglanti('#/rehber', 'Çalışma Rehberi'),
    el('div', { sinif: 'yazdirma-yok' }, sayfaUst(kart.ikon, kart.baslik, 'Notlarını iki sütunda tut: solda sorular, sağda notlar, altta özet.')),
    yontemKutusu(),
    el('div', { sinif: 'rehber-eylemler yazdirma-yok' }, yeni,
      yazdirDugmesi('Boş şablonu yazdır', () => yazdir(BOS_SABLON_SINIFI))),
    el('section', { sinif: 'yigin yazdirma-yok', 'aria-labelledby': 'cornell-liste-baslik', style: '--yigin-bosluk: var(--b-3)' },
      el('h2', { id: 'cornell-liste-baslik', metin: `Notlarım (${notlar.length} / ${SINIR.not})` }), liste),
    bosSablon());
}

// ---------- Tek not ----------
function duzenleyiciCiz(kap, kart, id) {
  const not = notBul(id);
  if (!not) {
    toastGoster('Bu not bulunamadı. Listeden seç.', { tur: 'bilgi' });
    git(LISTE_ADRESI, { degistir: true });
    return { kapat() {} };
  }
  const profilId = etkinProfil().id;
  let zamanlayici = null;
  let bekleyen = false;
  const durum = el('span', { sinif: 'rehber-kayit-durumu yazdirma-yok', metin: 'Kaydedildi' });

  const girdi = (ad, etiket, oz = {}) => {
    const kimlik = `cornell-${ad}`;
    const g = el('input', { sinif: 'girdi', id: kimlik, name: ad, value: not[ad] ?? '', autocomplete: 'off', ...oz });
    return el('div', { sinif: `alan cornell__alan cornell__alan--${ad}` }, el('label', { sinif: 'alan__etiket', for: kimlik, metin: etiket }), g);
  };
  const metinAlani = (ad, etiket, ipucu, sinir, satir) => {
    const kimlik = `cornell-${ad}`;
    const ta = el('textarea', { sinif: 'girdi', id: kimlik, name: ad, rows: satir, maxlength: sinir, 'aria-describedby': `${kimlik}-ipucu` });
    ta.value = not[ad] ?? '';
    const baski = el('div', { sinif: 'cornell__baski yalniz-yazdir', metin: ta.value });
    ta.addEventListener('input', () => { baski.textContent = ta.value; });
    return el('div', { sinif: `alan cornell__bolum cornell__bolum--${ad}` },
      el('label', { sinif: 'alan__etiket', for: kimlik, metin: etiket }),
      el('p', { sinif: 'alan__ipucu', id: `${kimlik}-ipucu`, metin: ipucu }), ta, baski);
  };

  const form = el('form', { sinif: 'cornell', 'aria-label': 'Cornell notu', onsubmit: (e) => e.preventDefault() },
    el('div', { sinif: 'cornell__ust' },
      girdi('baslik', 'Konu', { maxlength: SINIR.notBaslik, placeholder: 'Örnek: Su döngüsü' }),
      girdi('ders', 'Ders', { maxlength: SINIR.notDers, list: 'rehber-dersler' }),
      girdi('tarih', 'Tarih', { type: 'date' })),
    el('div', { sinif: 'cornell__izgara' },
      metinAlani('ipuclari', 'Anahtar sorular ve kelimeler', 'Dersten sonra: önemli noktalar için soru ya da anahtar kelime yaz.', SINIR.ipucu, 12),
      el('div', { sinif: 'cornell__not-sutunu' },
        metinAlani('notlar', 'Notlar', 'Derste ya da okurken: kısa cümleler, maddeler, örnekler.', SINIR.notMetni, 16),
        el('p', { sinif: 'cornell__gizli-not', metin: 'Notların gizli. Anahtar sorulara yüksek sesle ya da kâğıda cevap ver; sonra notları açıp karşılaştır.' })),
      metinAlani('ozet', 'Özet', 'En sonda: konuyu 2-3 cümleyle kendi sözlerinle özetle.', SINIR.ozet, 4)));

  const formDegeri = () => Object.fromEntries(['baslik', 'ders', 'tarih', 'ipuclari', 'notlar', 'ozet'].map((a) => [a, form.elements[a].value]));
  function kaydet() {
    clearTimeout(zamanlayici);
    if (!bekleyen) return;
    bekleyen = false;
    const s = notGuncelle(id, formDegeri(), profilId);
    durum.textContent = s.tamam ? 'Kaydedildi' : 'Kaydedilemedi';
    durum.dataset.durum = s.tamam ? 'tamam' : 'hata';
    if (!s.tamam && etkinProfil()?.id === profilId) toastGoster(s.hata, { tur: 'hata' });
  }
  const kaydetPlanla = () => {
    bekleyen = true;
    durum.textContent = 'Kaydediliyor…';
    delete durum.dataset.durum;
    clearTimeout(zamanlayici);
    zamanlayici = setTimeout(kaydet, KAYIT_GECIKME_MS);
  };
  form.addEventListener('input', kaydetPlanla);
  form.addEventListener('change', kaydetPlanla);
  const gorunurluk = () => { if (document.hidden) kaydet(); };
  document.addEventListener('visibilitychange', gorunurluk);
  window.addEventListener('pagehide', kaydet);

  // Kendini yokla: not sütunu gizlenir (geri çağırma pratiği)
  const yokla = el('button', { type: 'button', sinif: 'btn btn--hayalet btn--kucuk yazdirma-yok', 'aria-pressed': 'false', onclick: () => {
    const acik = yokla.getAttribute('aria-pressed') !== 'true';
    yokla.setAttribute('aria-pressed', String(acik));
    form.toggleAttribute('data-yokla', acik);
    yokla.lastChild.textContent = acik ? 'Notları göster' : 'Notları gizle, kendini yokla';
    duyur(acik ? 'Notlar gizlendi.' : 'Notlar gösteriliyor.');
  } }, spriteIkon('goz', 'ikon ikon--kucuk'), el('span', { metin: 'Notları gizle, kendini yokla' }));

  const sil = el('button', { type: 'button', sinif: 'btn btn--hayalet btn--kucuk tehlike-metin yazdirma-yok', onclick: () => {
    if (!confirm('Bu not silinsin mi? Bu işlem geri alınamaz.')) return;
    clearTimeout(zamanlayici);
    bekleyen = false;
    const s = notSil(id);
    if (!s.tamam) { toastGoster(s.hata, { tur: 'hata' }); return; }
    toastGoster('Not silindi.');
    git(LISTE_ADRESI, { degistir: true });
  } }, spriteIkon('cop', 'ikon ikon--kucuk'), 'Notu sil');

  kap.replaceChildren(
    geriBaglanti(`#${LISTE_ADRESI}`, 'Notlarım'),
    el('div', { sinif: 'rehber-ust yazdirma-yok' },
      el('div', {}, el('h1', { metin: 'Cornell notu' }), durum),
      el('div', { sinif: 'rehber-eylemler' }, yokla, yazdirDugmesi())),
    dersListesi(),
    form,
    el('div', { sinif: 'rehber-eylemler yazdirma-yok' }, sil));
  if (!not.baslik) form.elements.baslik.focus();
  return {
    kapat() {
      kaydet();
      document.removeEventListener('visibilitychange', gorunurluk);
      window.removeEventListener('pagehide', kaydet);
    },
  };
}
