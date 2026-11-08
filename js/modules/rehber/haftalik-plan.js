// Haftalık ders planı (S22, #/rehber/haftalik-plan): gün başına ders blokları (ders + süre), bloklar arası mola, esnek hafta sonu, yoğun gün notu, örnek plan ve yazdırma; otomatik kayıt
// S34f: 2-8. sınıf; metinler, yeni blok süresi ve yoğun gün sınırı kademeye göre (rehber-icerik.js PLAN_METINLERI; ilkokulda ailece kullanım dili ve veli notu)
import { el, spriteIkon, toastGoster } from '../../core/ui.js';
import { duyur } from '../../core/a11y.js';
import { etkinProfil } from '../../core/store.js';
import { kademe } from '../../core/siniflar.js';
import { PLAN_METINLERI } from './rehber-icerik.js';
import {
  calismaVerisi, planKaydet, planBosMu, ornekPlan, yeniBlok, gunToplami,
  GUNLER, BLOK_SURELERI, MOLA_SURELERI, SINIR,
} from './rehber-veri.js';
import { geriBaglanti, sayfaUst, dersListesi, yazdirDugmesi } from './rehber-sayfasi.js';

const KAYIT_GECIKME_MS = 500;

const sureYaz = (dk) => {
  const sa = Math.floor(dk / 60);
  const kalan = dk % 60;
  if (!sa) return `${dk} dk`;
  return kalan ? `${sa} sa ${kalan} dk` : `${sa} sa`;
};

/** #/rehber/haftalik-plan. Döner: { kapat() } */
export function aracCiz(kap, { kart }) {
  if (!etkinProfil()) {
    kap.replaceChildren(geriBaglanti('#/rehber', 'Çalışma Rehberi'), sayfaUst(kart.ikon, kart.baslik),
      el('p', { sinif: 'bos-durum', metin: 'Plan yapmak için önce bir profil oluştur.' }));
    return { kapat() {} };
  }
  const profilId = etkinProfil().id;
  const sinif = etkinProfil().sinif;
  // S34f: kademeye göre metinler (yoğun gün sınırı, yeni blok süresi, ipuçları); kademe yoksa ortaokul
  const M = PLAN_METINLERI[kademe(sinif) ?? 'ortaokul'] ?? PLAN_METINLERI.ortaokul;
  let plan = structuredClone(calismaVerisi(profilId).plan);
  let zamanlayici = null;
  let bekleyen = false;
  const ozetler = new Map(); // gün → özet öğesi (yazarken yeniden çizmeden güncellenir)
  const haftaOzeti = el('p', { sinif: 'plan-hafta-ozet', role: 'status' });

  function kaydet() {
    clearTimeout(zamanlayici);
    if (!bekleyen) return;
    bekleyen = false;
    const s = planKaydet(plan, profilId);
    if (!s.tamam && etkinProfil()?.id === profilId) toastGoster(s.hata, { tur: 'hata' });
  }
  const kaydetPlanla = (hemen = false) => {
    bekleyen = true;
    clearTimeout(zamanlayici);
    if (hemen) kaydet();
    else zamanlayici = setTimeout(kaydet, KAYIT_GECIKME_MS);
  };

  function ozetleriGuncelle() {
    let toplam = 0;
    for (const g of GUNLER) {
      const t = gunToplami(plan, g.ad);
      toplam += t.dk;
      const oge = ozetler.get(g.ad);
      if (!oge) continue;
      const esnek = g.haftaSonu && plan.haftaSonuEsnek;
      let metin;
      if (!t.blok) metin = esnek ? 'Boş: dinlenme, oyun ve aile zamanı.' : 'Bu gün boş. Dinlenme de plana dahil.';
      else metin = `${t.blok} blok: ${sureYaz(t.dk)} çalışma${t.molaDk ? `, ${t.molaDk} dk mola` : ''}.`;
      const yogun = t.dk > M.yogunDk;
      oge.className = yogun ? 'plan-gun__ozet bildirim bildirim--uyari' : 'plan-gun__ozet';
      oge.replaceChildren(el('p', { metin: yogun ? `${metin} ${M.yogunNot}` : metin }));
    }
    haftaOzeti.textContent = toplam
      ? `Bu hafta planlanan çalışma: ${sureYaz(toplam)} (molalar hariç).`
      : 'Plan boş. Bir güne blok ekleyerek ya da örnek planla başlayabilirsin.';
  }

  function blokSatiri(g, b, i, sayi) {
    const dersId = `plan-${g.ad}-${b.id}-ders`;
    const sureId = `plan-${g.ad}-${b.id}-sure`;
    const ders = el('input', { sinif: 'girdi', id: dersId, value: b.ders, maxlength: SINIR.ders, list: 'rehber-dersler',
      placeholder: 'Ders ya da konu', autocomplete: 'off' });
    ders.addEventListener('input', () => { b.ders = ders.value; kaydetPlanla(); });
    const sure = el('select', { sinif: 'girdi', id: sureId },
      BLOK_SURELERI.map((dk) => el('option', { value: dk, metin: `${dk} dk`, selected: dk === b.dk })));
    sure.addEventListener('change', () => { b.dk = Number(sure.value); ozetleriGuncelle(); kaydetPlanla(true); });
    const sil = el('button', { type: 'button', sinif: 'btn btn--hayalet btn--ikon yazdirma-yok',
      'aria-label': `${g.etiket}, ${i + 1}. bloğu sil`, title: 'Bloğu sil', onclick: () => {
        plan.gunler[g.ad] = plan.gunler[g.ad].filter((x) => x.id !== b.id);
        kaydetPlanla(true);
        ciz({ odak: `#plan-${g.ad}-ekle` });
        duyur('Blok silindi.');
      } }, spriteIkon('cop', 'ikon'));
    return el('li', { sinif: 'plan-blok' },
      el('div', { sinif: 'plan-blok__satir' },
        el('label', { sinif: 'ekran-okuyucu', for: dersId, metin: `${g.etiket}, ${i + 1}. blok dersi` }), ders,
        el('label', { sinif: 'ekran-okuyucu', for: sureId, metin: `${g.etiket}, ${i + 1}. blok süresi` }), sure, sil),
      i < sayi - 1 && el('p', { sinif: 'plan-blok__mola', metin: `ardından ${plan.molaDk} dk mola` }));
  }

  function gunKarti(g) {
    const bloklar = plan.gunler[g.ad];
    const esnek = g.haftaSonu && plan.haftaSonuEsnek;
    const baslikId = `plan-${g.ad}-baslik`;
    const ozet = el('div', { sinif: 'plan-gun__ozet' });
    ozetler.set(g.ad, ozet);
    const doluMu = bloklar.length >= SINIR.blok;
    return el('section', { sinif: 'kart plan-gun', 'data-esnek': esnek ? 'evet' : null, 'aria-labelledby': baslikId },
      el('div', { sinif: 'plan-gun__ust' },
        el('h2', { id: baslikId, metin: g.etiket }),
        esnek && el('span', { sinif: 'rozet rozet--gunes', metin: 'Esnek gün' })),
      esnek && el('p', { sinif: 'plan-gun__esnek', metin: 'Bu bloklar istersen. Dinlenmeye, oyuna ve ailene de zaman ayır.' }),
      bloklar.length ? el('ol', { sinif: 'plan-bloklari', 'aria-label': `${g.etiket} blokları` }, bloklar.map((b, i) => blokSatiri(g, b, i, bloklar.length))) : null,
      ozet,
      el('button', { type: 'button', sinif: 'btn btn--hayalet btn--kucuk plan-gun__ekle yazdirma-yok', id: `plan-${g.ad}-ekle`,
        disabled: doluMu, onclick: () => {
          const yeni = yeniBlok('', M.blokDk);
          plan.gunler[g.ad].push(yeni);
          kaydetPlanla(true);
          ciz({ odak: `#plan-${g.ad}-${yeni.id}-ders` });
        } }, spriteIkon('arti', 'ikon ikon--kucuk'), doluMu ? `En çok ${SINIR.blok} blok` : 'Blok ekle'));
  }

  function ayarlar() {
    const mola = el('fieldset', { sinif: 'grup' },
      el('legend', { metin: 'Bloklar arası mola' }),
      el('div', { sinif: 'segment' }, MOLA_SURELERI.map((dk) => {
        const r = el('input', { type: 'radio', name: 'plan-mola', value: dk, checked: dk === plan.molaDk });
        r.addEventListener('change', () => { plan.molaDk = dk; kaydetPlanla(true); ciz({ odak: `input[name="plan-mola"][value="${dk}"]` }); });
        return el('label', {}, r, el('span', { metin: `${dk} dk` }));
      })));
    const esnek = el('input', { type: 'checkbox', role: 'switch', checked: plan.haftaSonuEsnek, 'aria-describedby': 'plan-esnek-ipucu' });
    esnek.addEventListener('change', () => { plan.haftaSonuEsnek = esnek.checked; kaydetPlanla(true); ciz({ odak: '#plan-esnek input' }); });
    return el('section', { sinif: 'kart plan-ayarlar yazdirma-yok', 'aria-label': 'Plan ayarları' },
      mola,
      el('div', { id: 'plan-esnek' },
        el('label', { sinif: 'anahtar' }, el('span', { metin: 'Hafta sonu esnek' }), esnek, el('span', { sinif: 'anahtar__ray', 'aria-hidden': 'true' })),
        el('p', { sinif: 'alan__ipucu', id: 'plan-esnek-ipucu', metin: 'Açıkken cumartesi ve pazar blokları “istersen” diye görünür; o günler çalışmasan da plan aksamış sayılmaz.' })));
  }

  function ciz({ odak } = {}) {
    ozetler.clear();
    const bos = planBosMu(plan);
    const eylemler = el('div', { sinif: 'rehber-eylemler yazdirma-yok' },
      el('button', { type: 'button', sinif: `btn ${bos ? 'btn--birincil' : 'btn--hayalet'} btn--kucuk`, onclick: () => {
        if (!bos && !confirm('Örnek plan, şu anki planının yerine geçecek. Devam edilsin mi?')) return;
        const ornek = ornekPlan(sinif);
        plan = { ...ornek, molaDk: plan.molaDk, haftaSonuEsnek: plan.haftaSonuEsnek };
        kaydetPlanla(true);
        ciz();
        duyur('Örnek plan yüklendi. Derslerini ve sürelerini kendine göre değiştirebilirsin.');
      } }, spriteIkon('takvim', 'ikon ikon--kucuk'), 'Örnek planla başla'),
      !bos && el('button', { type: 'button', sinif: 'btn btn--hayalet btn--kucuk tehlike-metin', onclick: () => {
        if (!confirm('Plandaki tüm bloklar silinsin mi?')) return;
        GUNLER.forEach((g) => { plan.gunler[g.ad] = []; });
        kaydetPlanla(true);
        ciz();
        duyur('Plan temizlendi.');
      } }, spriteIkon('cop', 'ikon ikon--kucuk'), 'Planı temizle'));

    kap.replaceChildren(
      geriBaglanti('#/rehber', 'Çalışma Rehberi'),
      el('div', { sinif: 'rehber-ust' },
        sayfaUst(kart.ikon, kart.baslik, M.aciklama),
        yazdirDugmesi('Planı yazdır')),
      ...(M.veliNotu ? [el('div', { sinif: 'bildirim rehber-uyari', role: 'note' },
        spriteIkon('bilgi', 'ikon'), el('p', {}, el('strong', { metin: `${M.veliNotu.baslik}. ` }), M.veliNotu.metin))] : []),
      dersListesi(sinif),
      ayarlar(),
      haftaOzeti,
      eylemler,
      el('div', { sinif: 'plan-izgara' }, GUNLER.map(gunKarti)),
      el('details', { sinif: 'kart rehber-nasil yazdirma-yok' },
        el('summary', { metin: 'İyi bir plan için ipuçları' }),
        el('ul', {}, M.ipuclari.map((m) => el('li', { metin: m })))));
    ozetleriGuncelle();
    if (odak) kap.querySelector(odak)?.focus();
  }

  ciz();
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
