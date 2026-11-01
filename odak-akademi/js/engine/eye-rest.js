// Göz dinlendirme hatırlatıcısı (20-20-20): uzun okumada okumayı durdurup kısa mola ve uzağa bakma önerir; okuma ayarlarından ya da Ayarlar'daki mola hatırlatıcısından (S10) kapatılır
import { el } from '../core/ui.js';
import { odakla, duyur, molaRehberiAcikMi } from '../core/a11y.js';
import { sureBicimle } from '../core/utils.js';
import { dinle, OLAYLAR } from '../core/store.js';

const MOLA_SN = 20;                       // önerilen uzağa bakma süresi
const SIFIRLAMA_MS = 10 * 60 * 1000;      // okumaya bu kadar ara verildiyse biriken süre sıfırlanır
let esikMs = 20 * 60 * 1000;              // bu kadar okuyunca öneri gelir
let birikmisMs = 0;                       // önceki turlardan biriken okuma süresi (sayfa açıkken)
let sonOkuma = 0;
// Biriken süre öğrenciye aittir: profil değişince sıfırlanır
dinle(OLAYLAR.PROFIL_DEGISTI, () => { birikmisMs = 0; sonOkuma = 0; });

/** Öneri eşiğini saniye olarak değiştirir (deneme için). Döner: güncel eşik (sn) */
export function gozMolasiEsiginiAyarla(sn) {
  const s = Number(sn);
  if (Number.isFinite(s) && s > 0) esikMs = s * 1000;
  return esikMs / 1000;
}

/** S10: Öğrenci başka yerde mola verdi (ör. 20-20-20 rehberi): biriken okuma süresi sıfırlanır */
export function gozMolasiVerildi() {
  birikmisMs = 0;
  sonOkuma = 0;
}

/**
 * Okuma turuna göz molası hatırlatıcısı ekler. Okuma süresi kısa aralarla yapılan turlar boyunca birikir.
 * secenekler: { acik (ayar.gozMolasi), kap (kartın ekleneceği öğe), gecenMs() (bu turdaki okuma süresi), okuyorMu() }
 * Döner: { acikMi() }  → kart açıkken okuma süresi işlemesin diye motorun etkinMi'sinde kullanılır
 */
export function gozMolasiKur(ctx, { acik, kap, gecenMs, okuyorMu }) {
  if (sonOkuma && Date.now() - sonOkuma > SIFIRLAMA_MS) birikmisMs = 0;
  let taban = birikmisMs;
  let kart = null;
  let geriSayimDurdur = null;
  const toplam = () => taban + gecenMs();

  function kapat() {
    geriSayimDurdur?.();
    geriSayimDurdur = null;
    kart?.remove();
    kart = null;
    kap.classList.remove('okuma-oyun--mola');
    duyur('Okuma devam ediyor.');
    odakla(ctx.alan);
  }

  function goster() {
    taban = -gecenMs(); // sayaç sıfırlanır: sonraki öneri yeniden eşik kadar okuyunca gelir
    const dakika = Math.max(1, Math.round(esikMs / 60000));
    const baslik = el('h3', { id: 'goz-molasi-baslik', metin: 'Göz molası önerisi' });
    const bilgi = el('p', { metin: `Yaklaşık ${dakika} dakikadır okuyorsun, okuma şimdilik durdu. İstersen kısa bir mola ver: yaklaşık ${MOLA_SN} saniye boyunca uzaktaki bir noktaya bak (pencereden dışarı ya da odanın en uzak köşesine). Gözlerini birkaç kez kırpabilirsin.` });
    const sure = el('p', { sinif: 'goz-molasi__sure', role: 'timer', 'aria-live': 'off', hidden: true });
    const molaDugme = el('button', { type: 'button', sinif: 'btn btn--gunes', metin: `${MOLA_SN} saniye mola ver` });
    const devamDugme = el('button', { type: 'button', sinif: 'btn btn--ikincil', metin: 'Okumaya devam et', onclick: kapat });
    molaDugme.addEventListener('click', () => {
      let kalan = MOLA_SN;
      molaDugme.hidden = true;
      sure.hidden = false;
      sure.textContent = sureBicimle(kalan);
      bilgi.textContent = 'Ekrandan başını kaldır ve uzağa bak. Süre bitince haber vereceğim.';
      devamDugme.focus();
      // ctx.her çerçeveyle birlikte duraklar; çerçeve duraklatılırsa geri sayım da bekler
      geriSayimDurdur = ctx.her(() => {
        kalan -= 1;
        sure.textContent = sureBicimle(Math.max(0, kalan));
        if (kalan > 0) return;
        geriSayimDurdur?.();
        geriSayimDurdur = null;
        bilgi.textContent = 'Mola bitti. Hazır olduğunda okumaya devam et.';
        duyur('Mola bitti. Hazır olduğunda okumaya devam et.');
      }, 1000);
    });
    kart = el('section', { sinif: 'bildirim goz-molasi', 'aria-labelledby': 'goz-molasi-baslik' },
      baslik, bilgi, sure,
      el('div', { sinif: 'goz-molasi__eylemler' }, molaDugme, devamDugme),
      el('p', { sinif: 'goz-molasi__not', metin: 'Bu hatırlatıcıyı okuma ayarlarından ya da Ayarlar’daki “Mola hatırlatıcısı” ile kapatabilirsin.' }));
    kap.classList.add('okuma-oyun--mola');
    kap.prepend(kart);
    duyur('Okuma durdu. Kısa bir göz molası önerisi var.');
    odakla(baslik);
  }

  const izleDurdur = ctx.her(() => {
    if (!acik || !molaRehberiAcikMi() || kart || !okuyorMu() || !ctx.aktifMi()) return; // S10: genel ayar kapalıysa öneri yok
    if (toplam() >= esikMs) goster();
  }, 1000);

  ctx.temizlenince(() => {
    izleDurdur?.();
    geriSayimDurdur?.();
    birikmisMs = Math.max(0, toplam());
    sonOkuma = Date.now();
  });

  return { acikMi: () => !!kart };
}
