// Zihin haritası (S22, #/rehber/zihin-haritasi): harita listesi ve SVG editör (düğüm ekle, sürükle, yazısını değiştir, sil; yakınlaştırma; klavye; liste görünümü), PNG indirme ve yazdırma; otomatik kayıt; S25: sürüklemeden taşıma düğmeleri
import { el, spriteIkon, toastGoster } from '../../core/ui.js';
import { duyur, odakla } from '../../core/a11y.js';
import { etkinProfil } from '../../core/store.js';
import { git } from '../../core/router.js';
import { tarihMetni, kimlikUret, trKucuk } from '../../core/utils.js';
import { svg, noktaSvgde } from '../../engine/algi.js';
import { calismaVerisi, haritaBul, haritaOlustur, haritaKaydet, haritaSil, SINIR, DUNYA, KOK_ID } from './rehber-veri.js';
import { geriBaglanti, sayfaUst, yazdir } from './rehber-sayfasi.js';

const LISTE_ADRESI = '/rehber/zihin-haritasi';
const KAYIT_GECIKME_MS = 600;
const DAL_RENGI_SAYISI = 5;
const KENAR = 70;                 // düğüm merkezi çizim alanının kenarına bu kadar yaklaşabilir
const ADIM = 10;                  // ok tuşuyla taşıma (Shift ile ×4)
const OLCEK = { en: 0.3, enCok: 1.5, adim: 0.25 };
const SURUKLE_ESIGI = 4;          // bundan az kayma dokunma sayılır
const KOK_ACILARI = [-30, 30, 150, 210, -90, 90, -60, 60, 120, 240, 0, 180];

const sinirla = (v, en, enCok) => Math.min(enCok, Math.max(en, v));
const dereceRadyan = (d) => (d * Math.PI) / 180;

/** #/rehber/zihin-haritasi (?harita=<id> ile editör). Döner: { kapat() } */
export function aracCiz(kap, { kart, sorgu }) {
  if (!etkinProfil()) {
    kap.replaceChildren(geriBaglanti('#/rehber', 'Çalışma Rehberi'), sayfaUst(kart.ikon, kart.baslik),
      el('p', { sinif: 'bos-durum', metin: 'Zihin haritası yapmak için önce bir profil oluştur.' }));
    return { kapat() {} };
  }
  if (sorgu.harita) return editorCiz(kap, sorgu.harita);
  listeCiz(kap, kart);
  return { kapat() {} };
}

// ---------- Liste ----------
function listeCiz(kap, kart) {
  const { haritalar } = calismaVerisi();
  const yeni = el('button', { type: 'button', sinif: 'btn btn--birincil', onclick: () => {
    const s = haritaOlustur();
    if (!s.tamam) { toastGoster(s.hata, { tur: 'uyari' }); return; }
    git(`${LISTE_ADRESI}?harita=${encodeURIComponent(s.harita.id)}`);
  } }, spriteIkon('arti', 'ikon'), 'Yeni harita');

  const liste = haritalar.length
    ? el('ul', { sinif: 'rehber-liste', 'aria-labelledby': 'zh-liste-baslik' }, haritalar.map((h) => el('li', { sinif: 'kart rehber-liste__oge' },
      el('a', { sinif: 'rehber-liste__baglanti', href: `#${LISTE_ADRESI}?harita=${encodeURIComponent(h.id)}` },
        el('span', { sinif: 'rehber-liste__ad', metin: h.ad }),
        el('span', { sinif: 'rehber-liste__bilgi', metin: `${h.dugumler.length} düğüm, ${tarihMetni(h.guncelleme)}` })),
      el('button', { type: 'button', sinif: 'btn btn--hayalet btn--ikon', 'aria-label': `${h.ad} haritasını sil`, title: 'Haritayı sil', onclick: () => {
        if (!confirm(`“${h.ad}” haritası silinsin mi? Bu işlem geri alınamaz.`)) return;
        const s = haritaSil(h.id);
        if (!s.tamam) { toastGoster(s.hata, { tur: 'hata' }); return; }
        duyur('Harita silindi.');
        listeCiz(kap, kart);
        odakla(kap.querySelector('h1'));
      } }, spriteIkon('cop', 'ikon')))))
    : el('p', { sinif: 'bos-durum', metin: 'Henüz haritan yok. “Yeni harita” ile ortaya bir konu yaz, çevresine dallar ekle.' });

  kap.replaceChildren(
    geriBaglanti('#/rehber', 'Çalışma Rehberi'),
    sayfaUst(kart.ikon, kart.baslik, 'Bir konuyu ortaya yaz, alt başlıkları dallar hâlinde çevresine diz.'),
    el('details', { sinif: 'kart rehber-nasil' },
      el('summary', { metin: 'Zihin haritası nasıl yapılır?' }),
      el('ol', {},
        el('li', { metin: 'Ortaya ana konuyu kısa yaz (ör. “Su döngüsü”).' }),
        el('li', { metin: 'Ana dalları ekle: konunun 3-6 büyük başlığı.' }),
        el('li', { metin: 'Her dala tek kelime ya da kısa ifadelerle ayrıntı ekle; uzun cümle yazma.' }),
        el('li', { metin: 'Bitirince haritaya bakmadan konuyu anlatmayı dene, sonra haritayla karşılaştır.' }))),
    el('div', { sinif: 'rehber-eylemler' }, yeni),
    el('section', { sinif: 'yigin', 'aria-labelledby': 'zh-liste-baslik', style: '--yigin-bosluk: var(--b-3)' },
      el('h2', { id: 'zh-liste-baslik', metin: `Haritalarım (${haritalar.length} / ${SINIR.harita})` }), liste));
}

// ---------- Yardımcılar ----------
// Kısa satırlara böler (en çok 3 satır); kelime sınırında
function satirlaraBol(metin, enCok = 16) {
  const satirlar = [];
  let satir = '';
  for (const k of metin.split(' ')) {
    if (!satir) satir = k;
    else if ((satir + ' ' + k).length <= enCok) satir += ' ' + k;
    else { satirlar.push(satir); satir = k; }
  }
  if (satir) satirlar.push(satir);
  return satirlar.length > 3 ? [...satirlar.slice(0, 2), satirlar.slice(2).join(' ')] : satirlar;
}

const DOSYA_HARFLERI = { ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u', â: 'a', î: 'i', û: 'u' };
const dosyaAdi = (ad) => trKucuk(ad).replace(/[çğıöşüâîû]/g, (h) => DOSYA_HARFLERI[h])
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'harita';

// ---------- Editör ----------
function editorCiz(kap, haritaId) {
  const kayitli = haritaBul(haritaId);
  if (!kayitli) {
    toastGoster('Bu harita bulunamadı. Listeden seç.', { tur: 'bilgi' });
    git(LISTE_ADRESI, { degistir: true });
    return { kapat() {} };
  }
  const profilId = etkinProfil().id;
  const harita = structuredClone(kayitli);
  let secili = KOK_ID;
  let olcek = 1;
  let surukle = null;
  let zamanlayici = null;
  let bekleyen = false;
  const gOgeleri = new Map();   // id → <g>
  const kenarlar = new Map();   // çocuk id → <path>
  const boyutlar = new Map();   // id → { g, y } (genişlik, yükseklik)

  const bul = (id) => harita.dugumler.find((d) => d.id === id) ?? null;
  const cocuklar = (id) => harita.dugumler.filter((d) => d.ust === id);
  const torunlar = (id) => cocuklar(id).flatMap((c) => [c, ...torunlar(c.id)]);
  const duzey = (d) => { let n = 0; for (let x = d; x?.ust; x = bul(x.ust)) n++; return n; };
  // Ana dalın sırası (renk için); kök için null
  function dalSirasi(d) {
    if (d.id === KOK_ID) return null;
    let x = d;
    while (x.ust && x.ust !== KOK_ID) x = bul(x.ust);
    return cocuklar(KOK_ID).indexOf(x) % DAL_RENGI_SAYISI;
  }
  const ad = (d) => d.metin || (d.id === KOK_ID ? 'Ana konu' : 'Boş düğüm');

  // ----- Kayıt -----
  const durum = el('span', { sinif: 'rehber-kayit-durumu', metin: 'Kaydedildi' });
  function kaydet() {
    clearTimeout(zamanlayici);
    if (!bekleyen) return;
    bekleyen = false;
    const s = haritaKaydet(harita, profilId);
    durum.textContent = s.tamam ? 'Kaydedildi' : 'Kaydedilemedi';
    durum.dataset.durum = s.tamam ? 'tamam' : 'hata';
    if (!s.tamam && etkinProfil()?.id === profilId) toastGoster(s.hata, { tur: 'hata' });
  }
  function kaydetPlanla() {
    bekleyen = true;
    durum.textContent = 'Kaydediliyor…';
    delete durum.dataset.durum;
    clearTimeout(zamanlayici);
    zamanlayici = setTimeout(kaydet, KAYIT_GECIKME_MS);
  }

  // ----- Çizim -----
  const kok = svg('svg', { viewBox: `0 0 ${DUNYA.g} ${DUNYA.y}`, class: 'zh-svg', role: 'group',
    'aria-label': 'Zihin haritası çizimi. Düğümlere Tab ile gel; oklarla taşı, Delete ile sil, Enter ile yazısını düzenle.' });
  const zemin = svg('rect', { x: 0, y: 0, width: DUNYA.g, height: DUNYA.y, class: 'zh-zemin' });
  const kenarKatmani = svg('g', { class: 'zh-kenarlar', 'aria-hidden': 'true' });
  const dugumKatmani = svg('g', { class: 'zh-dugumler' });
  kok.append(zemin, kenarKatmani, dugumKatmani);

  function kenarYolu(a, b) {
    const ortaX = (a.x + b.x) / 2;
    return `M${a.x} ${a.y}C${ortaX} ${a.y} ${ortaX} ${b.y} ${b.x} ${b.y}`;
  }

  function dugumIcerik(g, d) {
    const kokMu = d.id === KOK_ID;
    const fs = kokMu ? 19 : 15;
    const satirlar = satirlaraBol(ad(d));
    const g2 = Math.max(70, Math.max(...satirlar.map((s) => [...s].length)) * fs * 0.58 + 28);
    const y = satirlar.length * fs * 1.25 + 18;
    boyutlar.set(d.id, { g: g2, y });
    const ilkDy = -((satirlar.length - 1) / 2) * fs * 1.25 + fs * 0.35;
    g.replaceChildren(
      svg('rect', { class: 'zh-dugum__secim', x: -g2 / 2 - 6, y: -y / 2 - 6, width: g2 + 12, height: y + 12, rx: 16 }),
      svg('rect', { class: 'zh-dugum__kutu', x: -g2 / 2, y: -y / 2, width: g2, height: y, rx: kokMu ? 22 : 12 }),
      svg('text', { class: 'zh-dugum__yazi', 'text-anchor': 'middle', 'font-size': fs },
        satirlar.map((s, i) => { const t = svg('tspan', { x: 0, dy: i ? fs * 1.25 : ilkDy }); t.textContent = s; return t; })));
    const ust = d.ust ? bul(d.ust) : null;
    g.setAttribute('aria-label', kokMu ? `${ad(d)}, ana konu` : `${ad(d)}, ${duzey(d)}. düzey, ${ad(ust)} dalında`);
  }

  function konumGuncelle(id) {
    const d = bul(id);
    gOgeleri.get(id)?.setAttribute('transform', `translate(${d.x} ${d.y})`);
    if (d.ust) kenarlar.get(id)?.setAttribute('d', kenarYolu(bul(d.ust), d));
    cocuklar(id).forEach((c) => kenarlar.get(c.id)?.setAttribute('d', kenarYolu(d, c)));
  }

  function ciz() {
    gOgeleri.clear();
    kenarlar.clear();
    boyutlar.clear();
    const kenarListesi = [];
    const dugumListesi = [];
    for (const d of harita.dugumler) {
      const dal = dalSirasi(d);
      if (d.ust) {
        const p = svg('path', { class: 'zh-kenar', d: kenarYolu(bul(d.ust), d), 'data-dal': dal, 'data-ilk': d.ust === KOK_ID ? 'evet' : null });
        kenarlar.set(d.id, p);
        kenarListesi.push(p);
      }
      const g = svg('g', { class: 'zh-dugum', 'data-id': d.id, 'data-dal': dal, 'data-duzey': Math.min(duzey(d), 2),
        transform: `translate(${d.x} ${d.y})`, tabindex: 0, role: 'button', 'aria-pressed': String(d.id === secili) });
      dugumIcerik(g, d);
      gOgeleri.set(d.id, g);
      dugumListesi.push(g);
    }
    kenarKatmani.replaceChildren(...kenarListesi);
    dugumKatmani.replaceChildren(...dugumListesi);
    listeGorunumuGuncelle();
    araclariGuncelle();
  }

  // ----- Seçim ve araçlar -----
  const yaziGirdisi = el('input', { sinif: 'girdi', id: 'zh-yazi', maxlength: SINIR.dugumMetni, autocomplete: 'off', 'aria-describedby': 'zh-yazi-ipucu' });
  const altEkle = el('button', { type: 'button', sinif: 'btn btn--birincil btn--kucuk', onclick: () => altDalEkle() },
    spriteIkon('arti', 'ikon ikon--kucuk'), 'Alt dal ekle');
  const silDugmesi = el('button', { type: 'button', sinif: 'btn btn--hayalet btn--kucuk tehlike-metin', onclick: () => dugumSil() },
    spriteIkon('cop', 'ikon ikon--kucuk'), 'Seçili dalı sil');

  function sec(id, { odak = false } = {}) {
    if (!bul(id)) id = KOK_ID;
    if (secili !== id) gOgeleri.get(secili)?.setAttribute('aria-pressed', 'false');
    secili = id;
    const g = gOgeleri.get(id);
    g?.setAttribute('aria-pressed', 'true');
    if (odak) g?.focus();
    araclariGuncelle();
  }

  function araclariGuncelle() {
    const d = bul(secili);
    if (document.activeElement !== yaziGirdisi) yaziGirdisi.value = d?.metin ?? '';
    silDugmesi.disabled = secili === KOK_ID;
    const dolu = harita.dugumler.length >= SINIR.dugum;
    altEkle.disabled = dolu;
    altEkle.title = dolu ? `Bir haritada en çok ${SINIR.dugum} düğüm olabilir.` : '';
  }

  yaziGirdisi.addEventListener('input', () => {
    const d = bul(secili);
    if (!d) return;
    d.metin = yaziGirdisi.value.replace(/\s+/g, ' ');
    dugumIcerik(gOgeleri.get(d.id), d);
    // Alt düğümlerin ekran okuyucu etiketinde üst adı geçer
    cocuklar(d.id).forEach((c) => dugumIcerik(gOgeleri.get(c.id), c));
    listeGorunumuGuncelle();
    kaydetPlanla();
  });
  yaziGirdisi.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); gOgeleri.get(secili)?.focus(); }
  });

  function yeniKonum(ust) {
    const kardes = cocuklar(ust.id).length;
    let aci;
    let uzaklik;
    if (ust.id === KOK_ID) {
      aci = KOK_ACILARI[kardes % KOK_ACILARI.length] + Math.floor(kardes / KOK_ACILARI.length) * 15;
      uzaklik = 250;
    } else {
      const k = bul(KOK_ID);
      const taban = (Math.atan2(ust.y - k.y, ust.x - k.x) * 180) / Math.PI;
      const yon = kardes % 2 ? 1 : -1;
      aci = taban + yon * Math.ceil(kardes / 2) * 28;
      uzaklik = 160;
    }
    return {
      x: Math.round(sinirla(ust.x + uzaklik * Math.cos(dereceRadyan(aci)), KENAR, DUNYA.g - KENAR)),
      y: Math.round(sinirla(ust.y + uzaklik * Math.sin(dereceRadyan(aci)), KENAR / 2, DUNYA.y - KENAR / 2)),
    };
  }

  function altDalEkle() {
    if (harita.dugumler.length >= SINIR.dugum) {
      toastGoster(`Bir haritada en çok ${SINIR.dugum} düğüm olabilir. Yeni bir harita açabilirsin.`, { tur: 'uyari' });
      return;
    }
    const ust = bul(secili) ?? bul(KOK_ID);
    const yeni = { id: kimlikUret(), metin: 'Yeni dal', ust: ust.id, ...yeniKonum(ust) };
    harita.dugumler.push(yeni);
    secili = yeni.id;
    ciz();
    kaydetPlanla();
    duyur(`${ad(ust)} dalına yeni düğüm eklendi. Yazısını şimdi değiştirebilirsin.`);
    gOgeleri.get(yeni.id)?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
    yaziGirdisi.focus();
    yaziGirdisi.select();
  }

  function dugumSil() {
    const d = bul(secili);
    if (!d || d.id === KOK_ID) { toastGoster('Ana konu silinmez; yazısını değiştirebilirsin.', { tur: 'bilgi' }); return; }
    const alt = torunlar(d.id);
    if (alt.length && !confirm(`“${ad(d)}” ve altındaki ${alt.length} düğüm silinsin mi?`)) return;
    const silinecek = new Set([d.id, ...alt.map((x) => x.id)]);
    harita.dugumler = harita.dugumler.filter((x) => !silinecek.has(x.id));
    secili = d.ust;
    ciz();
    kaydetPlanla();
    duyur(alt.length ? `${alt.length + 1} düğüm silindi.` : 'Düğüm silindi.');
    gOgeleri.get(secili)?.focus();
  }

  function tasi(id, dx, dy) {
    const d = bul(id);
    d.x = Math.round(sinirla(d.x + dx, KENAR, DUNYA.g - KENAR));
    d.y = Math.round(sinirla(d.y + dy, KENAR / 2, DUNYA.y - KENAR / 2));
    konumGuncelle(id);
    kaydetPlanla();
  }

  // ----- Fare ve dokunma: dokun = seç, sürükle = taşı -----
  kok.addEventListener('pointerdown', (e) => {
    const g = e.target.closest?.('.zh-dugum');
    if (!g || e.button > 0) return;
    const id = g.dataset.id;
    sec(id);
    const p = noktaSvgde(kok, e);
    const d = bul(id);
    if (!p || !d) return;
    surukle = { id, pid: e.pointerId, dx: p.x - d.x, dy: p.y - d.y, bx: p.x, by: p.y, oynadi: false };
    try { kok.setPointerCapture(e.pointerId); } catch { /* yok say */ }
  });
  kok.addEventListener('pointermove', (e) => {
    if (!surukle || e.pointerId !== surukle.pid) return;
    const p = noktaSvgde(kok, e);
    if (!p) return;
    if (!surukle.oynadi && Math.hypot(p.x - surukle.bx, p.y - surukle.by) < SURUKLE_ESIGI) return;
    surukle.oynadi = true;
    gOgeleri.get(surukle.id)?.classList.add('zh-dugum--tasiniyor');
    const d = bul(surukle.id);
    tasi(surukle.id, p.x - surukle.dx - d.x, p.y - surukle.dy - d.y);
  });
  const birak = (e) => {
    if (!surukle || e.pointerId !== surukle.pid) return;
    const g = gOgeleri.get(surukle.id);
    g?.classList.remove('zh-dugum--tasiniyor');
    if (!surukle.oynadi) g?.focus({ preventScroll: true });
    surukle = null;
  };
  kok.addEventListener('pointerup', birak);
  kok.addEventListener('pointercancel', birak);
  // Düğümün üstünde başlayan dokunuş sayfayı kaydırmasın (boş alanda kaydırma serbest)
  kok.addEventListener('touchstart', (e) => { if (e.target.closest?.('.zh-dugum')) e.preventDefault(); }, { passive: false });

  // ----- Klavye -----
  kok.addEventListener('focusin', (e) => {
    const g = e.target.closest?.('.zh-dugum');
    if (g) sec(g.dataset.id);
  });
  kok.addEventListener('keydown', (e) => {
    const g = e.target.closest?.('.zh-dugum');
    if (!g) return;
    const adim = e.shiftKey ? ADIM * 4 : ADIM;
    const yon = { ArrowLeft: [-adim, 0], ArrowRight: [adim, 0], ArrowUp: [0, -adim], ArrowDown: [0, adim] }[e.key];
    if (yon) { e.preventDefault(); tasi(g.dataset.id, ...yon); return; }
    if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); dugumSil(); return; }
    if (e.key === 'Enter' || e.key === 'F2' || e.key === ' ') { e.preventDefault(); yaziGirdisi.focus(); yaziGirdisi.select(); return; }
    if (e.key === '+' || e.key === 'Insert') { e.preventDefault(); altDalEkle(); }
  });

  // ----- Yakınlaştırma -----
  const tuval = el('div', { sinif: 'zh-tuval' }, kok);
  const olcekMetni = el('span', { sinif: 'zh-olcek', 'aria-live': 'polite' });
  function olcekAyarla(yeni, { ortala = false } = {}) {
    const eskiMerkez = { x: (tuval.scrollLeft + tuval.clientWidth / 2) / olcek, y: (tuval.scrollTop + tuval.clientHeight / 2) / olcek };
    olcek = Math.round(sinirla(yeni, OLCEK.en, OLCEK.enCok) * 100) / 100;
    kok.style.width = `${Math.round(DUNYA.g * olcek)}px`;
    kok.style.height = `${Math.round(DUNYA.y * olcek)}px`;
    olcekMetni.textContent = `%${Math.round(olcek * 100)}`;
    const merkez = ortala ? { x: DUNYA.g / 2, y: DUNYA.y / 2 } : eskiMerkez;
    tuval.scrollLeft = merkez.x * olcek - tuval.clientWidth / 2;
    tuval.scrollTop = merkez.y * olcek - tuval.clientHeight / 2;
  }
  const sigdir = () => olcekAyarla(tuval.clientWidth / DUNYA.g, { ortala: true });
  const olcekDugmesi = (ikon, etiket, fn) => el('button', { type: 'button', sinif: 'btn btn--hayalet btn--ikon', 'aria-label': etiket, title: etiket, onclick: fn },
    typeof ikon === 'string' && ikon.length === 1 ? el('span', { sinif: 'zh-olcek-isaret', 'aria-hidden': 'true', metin: ikon }) : spriteIkon(ikon, 'ikon'));

  // ----- Liste görünümü (ekran okuyucu ve hızlı göz atma için) -----
  const listeKap = el('div', { sinif: 'zh-liste' });
  function dal(d) {
    const alt = cocuklar(d.id);
    return el('li', {}, ad(d), alt.length ? el('ul', {}, alt.map(dal)) : null);
  }
  function listeGorunumuGuncelle() {
    listeKap.replaceChildren(el('ul', {}, dal(bul(KOK_ID))));
  }

  // ----- Dışa aktarma -----
  function sinirKutusu(bosluk = 30) {
    let x1 = Infinity; let y1 = Infinity; let x2 = -Infinity; let y2 = -Infinity;
    for (const d of harita.dugumler) {
      const b = boyutlar.get(d.id) ?? { g: 80, y: 40 };
      x1 = Math.min(x1, d.x - b.g / 2); y1 = Math.min(y1, d.y - b.y / 2);
      x2 = Math.max(x2, d.x + b.g / 2); y2 = Math.max(y2, d.y + b.y / 2);
    }
    return { x: Math.floor(x1 - bosluk), y: Math.floor(y1 - bosluk), g: Math.ceil(x2 - x1 + bosluk * 2), y2: Math.ceil(y2 - y1 + bosluk * 2) };
  }

  async function pngIndir() {
    const g = gOgeleri.get(secili);
    g?.setAttribute('aria-pressed', 'false'); // seçim çerçevesi resme girmesin
    try {
      const s = sinirKutusu();
      const klon = kok.cloneNode(true);
      // CSS değişkenleri resimde çözülmez: hesaplanmış renk ve yazı biçimleri öğelere yazılır
      const asil = [kok, ...kok.querySelectorAll('*')];
      const kopya = [klon, ...klon.querySelectorAll('*')];
      asil.forEach((o, i) => {
        const cs = getComputedStyle(o);
        for (const ozellik of ['fill', 'stroke', 'stroke-width', 'stroke-dasharray', 'opacity', 'visibility', 'font-family', 'font-weight', 'display']) {
          kopya[i].style.setProperty(ozellik, cs.getPropertyValue(ozellik));
        }
      });
      const zeminRengi = getComputedStyle(zemin).fill || '#ffffff';
      const olcekPng = 2;
      klon.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      klon.setAttribute('viewBox', `${s.x} ${s.y} ${s.g} ${s.y2}`);
      klon.setAttribute('width', s.g * olcekPng);
      klon.setAttribute('height', s.y2 * olcekPng);
      klon.removeAttribute('style');
      const xml = new XMLSerializer().serializeToString(klon);
      const resim = new Image();
      resim.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(xml)}`;
      await resim.decode();
      const tuvalOge = document.createElement('canvas');
      tuvalOge.width = s.g * olcekPng;
      tuvalOge.height = s.y2 * olcekPng;
      const ctx = tuvalOge.getContext('2d');
      ctx.fillStyle = zeminRengi;
      ctx.fillRect(0, 0, tuvalOge.width, tuvalOge.height);
      ctx.drawImage(resim, 0, 0);
      const blob = await new Promise((coz) => tuvalOge.toBlob(coz, 'image/png'));
      if (!blob) throw new Error('PNG oluşturulamadı');
      const url = URL.createObjectURL(blob);
      const a = el('a', { href: url, download: `zihin-haritasi-${dosyaAdi(harita.ad)}.png`, hidden: true });
      document.body.append(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      toastGoster('Harita resim olarak indirildi.', { tur: 'basari' });
    } catch (h) {
      console.error('[zihin-haritasi] PNG', h);
      toastGoster('Resim hazırlanamadı. “Yazdır” ile PDF olarak kaydetmeyi deneyebilirsin.', { tur: 'hata' });
    } finally {
      g?.setAttribute('aria-pressed', String(gOgeleri.get(secili) === g));
    }
  }

  function haritayiYazdir() {
    const s = sinirKutusu();
    kok.setAttribute('viewBox', `${s.x} ${s.y} ${s.g} ${s.y2}`);
    window.addEventListener('afterprint', () => kok.setAttribute('viewBox', `0 0 ${DUNYA.g} ${DUNYA.y}`), { once: true });
    yazdir();
  }

  // ----- Sayfa -----
  const adGirdisi = el('input', { sinif: 'girdi', id: 'zh-ad', value: harita.ad, maxlength: SINIR.haritaAdi, autocomplete: 'off' });
  adGirdisi.addEventListener('input', () => { harita.ad = adGirdisi.value; baskiBaslik.textContent = adGirdisi.value; kaydetPlanla(); });
  const baskiBaslik = el('h2', { sinif: 'zh-baski-baslik yalniz-yazdir', metin: harita.ad });

  kap.replaceChildren(
    geriBaglanti(`#${LISTE_ADRESI}`, 'Haritalarım'),
    el('div', { sinif: 'rehber-ust yazdirma-yok' },
      el('div', {}, el('h1', { metin: 'Zihin haritası' }), durum),
      el('div', { sinif: 'rehber-eylemler' },
        el('button', { type: 'button', sinif: 'btn btn--ikincil btn--kucuk', onclick: pngIndir }, spriteIkon('indir', 'ikon ikon--kucuk'), 'PNG indir'),
        el('button', { type: 'button', sinif: 'btn btn--ikincil btn--kucuk', onclick: haritayiYazdir }, spriteIkon('indir', 'ikon ikon--kucuk'), 'Yazdır'))),
    el('div', { sinif: 'alan zh-ad yazdirma-yok' }, el('label', { sinif: 'alan__etiket', for: 'zh-ad', metin: 'Haritanın adı' }), adGirdisi),
    baskiBaslik,
    el('div', { sinif: 'kart zh-araclar yazdirma-yok' },
      el('div', { sinif: 'alan zh-araclar__yazi' },
        el('label', { sinif: 'alan__etiket', for: 'zh-yazi', metin: 'Seçili düğümün yazısı' }), yaziGirdisi,
        el('p', { sinif: 'alan__ipucu', id: 'zh-yazi-ipucu', metin: `Kısa yaz: tek kelime ya da kısa ifade (en çok ${SINIR.dugumMetni} karakter).` })),
      el('div', { sinif: 'zh-araclar__dugmeler' }, altEkle, silDugmesi),
      // S25: sürüklemeden taşıma (dokunarak ya da fareyle, sürüklemek zor gelirse)
      el('div', { sinif: 'zh-araclar__dugmeler', role: 'group', 'aria-label': 'Seçili düğümü taşı' },
        [['←', 'sola', -ADIM * 4, 0], ['↑', 'yukarı', 0, -ADIM * 4], ['↓', 'aşağı', 0, ADIM * 4], ['→', 'sağa', ADIM * 4, 0]]
          .map(([ok, yon, dx, dy]) => el('button', { type: 'button', sinif: 'btn btn--hayalet btn--ikon', 'aria-label': `Seçili düğümü ${yon} taşı`,
            title: `${yon[0].toLocaleUpperCase('tr-TR')}${yon.slice(1)} taşı`, onclick: () => tasi(secili, dx, dy) },
          el('span', { 'aria-hidden': 'true', metin: ok })))),
      el('div', { sinif: 'zh-araclar__olcek', role: 'group', 'aria-label': 'Yakınlaştırma' },
        olcekDugmesi('−', 'Uzaklaştır', () => olcekAyarla(olcek - OLCEK.adim)),
        olcekMetni,
        olcekDugmesi('+', 'Yakınlaştır', () => olcekAyarla(olcek + OLCEK.adim)),
        el('button', { type: 'button', sinif: 'btn btn--hayalet btn--kucuk', onclick: sigdir }, spriteIkon('tam-ekran', 'ikon ikon--kucuk'), 'Sığdır'))),
    tuval,
    el('p', { sinif: 'alan__ipucu yazdirma-yok', metin: 'Bir düğüme dokun: seçilir. Sürükle ya da taşıma oklarını kullan: taşınır. Boş alanda kaydırarak haritada gezinebilirsin. Klavyede düğüme Tab ile gel; oklarla taşı (Shift ile daha hızlı), + ile alt dal ekle, Enter ile yazısını düzenle, Delete ile sil.' }),
    el('details', { sinif: 'kart rehber-nasil yazdirma-yok' }, el('summary', { metin: 'Liste görünümü' }), listeKap));

  ciz();
  // Genişlik ölçülebilsin diye çizimden sonra: geniş ekranda sığdır, dar ekranda okunur ölçekte ortadan başla
  requestAnimationFrame(() => {
    const sigan = tuval.clientWidth / DUNYA.g;
    olcekAyarla(Math.max(sigan, 0.9), { ortala: true });
  });
  if (harita.dugumler.length === 1 && bul(KOK_ID).metin === 'Ana konu') { yaziGirdisi.focus(); yaziGirdisi.select(); }

  const gorunurluk = () => { if (document.hidden) kaydet(); };
  document.addEventListener('visibilitychange', gorunurluk);
  window.addEventListener('pagehide', kaydet);
  return {
    kapat() {
      kaydet();
      document.removeEventListener('visibilitychange', gorunurluk);
      window.removeEventListener('pagehide', kaydet);
    },
  };
}
