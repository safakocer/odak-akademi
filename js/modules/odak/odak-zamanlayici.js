// Odak zamanlayıcı (S12; K2: çok sekmede tek kayıt): çalışma/mola geri sayımı. Bitiş anı (saat) depoya yazılır; sekme arka plandayken ya da sayfa yenilense de süre doğru kalır. Bitişte nazik zil, duyuru, sekme başlığı; başka sayfadayken yüzen gösterge
import { dinle, OLAYLAR, etkinProfil } from '../../core/store.js';
import { etkinRota } from '../../core/router.js';
import { sesCal } from '../../core/sound.js';
import { toastGoster, el, spriteIkon } from '../../core/ui.js';
import { duyur } from '../../core/a11y.js';
import { sureBicimle, sureMetni } from '../../core/utils.js';
import { odakVerisi, odakVerisiniGuncelle, blokOlustur, bekleyenAyarla } from './odak-veri.js';

const TIK_MS = 250;
const EN_KISA_KAYIT_SN = 60;           // erken bitirilen blok en az bu kadar sürdüyse günlüğe girer
const GEC_ZIL_MS = 2 * 60 * 1000;      // bitiş bundan geç fark edildiyse (ör. sayfa sonradan açıldı) zil çalmaz
const UYGULAMA_ADI = 'Odak Akademi';
export const TUR_ADI = Object.freeze({ calisma: 'Çalışma', mola: 'Mola' });

let kuruldu = false;
let profilId = null;
let z = null;                  // { tur, dk, bitis | null, kalanMs | null, ortamHazir }
let aralik = null;
let bitisZamani = null;
let sonDakikaDuyuruldu = false;
let saklananBaslik = null;     // sekme gizliyken başlıkta kalan süre gösterilir; dönünce eski başlık geri gelir
let doldu = false;             // sekme gizliyken süre doldu mu (başlıkta gösterilir)
let cip = null;
const dinleyiciler = new Set();

/** Kalan süre (ms); duraklatıldıysa saklanan değer */
export function kalanMs(d = z) {
  if (!d) return 0;
  return d.bitis != null ? Math.max(0, d.bitis - Date.now()) : Math.max(0, d.kalanMs ?? 0);
}

/** null ya da { tur, dk, kalanMs, calisiyor, ortamHazir } */
export function zamanlayiciDurumu() {
  return z ? { tur: z.tur, dk: z.dk, kalanMs: kalanMs(), calisiyor: z.bitis != null, ortamHazir: z.ortamHazir } : null;
}

/** fn(durum, olay) — olay: 'tik' | 'durum' | 'bitti' | 'bitirildi'. Dinlemeyi bırakan fonksiyon döner */
export function zamanlayiciDinle(fn) {
  dinleyiciler.add(fn);
  return () => dinleyiciler.delete(fn);
}

function bildir(olay = 'durum', bilgi = {}) {
  const d = zamanlayiciDurumu();
  dinleyiciler.forEach((fn) => { try { fn(d, olay, bilgi); } catch (h) { console.error('[odak-zamanlayici]', h); } });
  cipGuncelle(d);
  baslikGuncelle(d);
}

function kaydet() {
  odakVerisiniGuncelle((v) => { v.zamanlayici = z ? { ...z } : null; }, profilId);
}

// Görünür sekmede 250 ms'de bir yenilenir; asıl süre her zaman bitiş anından hesaplanır (tarayıcı arka planda zamanlayıcıları yavaşlatsa da)
function zamanla() {
  clearInterval(aralik);
  clearTimeout(bitisZamani);
  aralik = bitisZamani = null;
  if (!z || z.bitis == null) return;
  aralik = setInterval(tik, TIK_MS);
  bitisZamani = setTimeout(tik, Math.max(0, z.bitis - Date.now()) + 20);
}

function tik() {
  if (!z || z.bitis == null) return;
  const kalan = z.bitis - Date.now();
  if (kalan <= 0) { sureDoldu(); return; }
  if (!sonDakikaDuyuruldu && kalan <= 60000) {
    sonDakikaDuyuruldu = true;
    duyur(`${TUR_ADI[z.tur]}: son 1 dakika.`);
  }
  bildir('tik');
}

function sureDoldu() {
  const biten = z;
  const gec = Date.now() - biten.bitis > GEC_ZIL_MS;
  z = null;
  zamanla();
  // K2: başka sekme bu bitişi zaten işlediyse (depoda aynı zamanlayıcı yok) blok yeniden yazılmaz, zil çalmaz
  let sahibi = false;
  const veri = odakVerisiniGuncelle((v) => {
    sahibi = v.zamanlayici?.tur === biten.tur && v.zamanlayici?.bitis === biten.bitis;
    if (!sahibi) return;
    v.zamanlayici = null;
    if (biten.tur === 'calisma') {
      bekleyenAyarla(v, blokOlustur({ dk: biten.dk, sureSn: biten.dk * 60, tamamlandi: true, ortamHazir: biten.ortamHazir }));
    }
  }, profilId);
  const mesaj = biten.tur === 'calisma'
    ? 'Çalışma bloğu bitti. Nasıl geçtiğini işaretle, sonra kısa bir mola ver.'
    : 'Mola bitti. Hazır olduğunda yeni bir bloğa başlayabilirsin.';
  if (sahibi && !gec && veri?.ayar.zil !== false) {
    sesCal('zil', { zorla: true }); // zamanlayıcının kendi seçimi: ses efektleri kapalı olsa da çalar
    if (navigator.userActivation?.hasBeenActive) navigator.vibrate?.(200); // titreşim yalnız dokunulmuş sayfada izinli
  }
  if (document.hidden) doldu = true;
  // Bildirim alanı canlı bölge (role=status): ayrıca duyur() çağrılırsa ekran okuyucu iki kez okur
  toastGoster(gec ? `Zamanlayıcı sen yokken bitmişti. ${mesaj}` : mesaj, { tur: 'basari', sure: 8000 });
  bildir('bitti', { tur: biten.tur });
}

// ---------- Komutlar (Odak Araçları sayfası çağırır) ----------
/** tur: 'calisma' | 'mola'. Süre, kayıtlı seçimden alınır */
export function zamanlayiciBaslat(tur) {
  if (!profilId || !TUR_ADI[tur]) return false;
  const { ayar, hazirlik } = odakVerisi(profilId);
  const dk = tur === 'mola' ? ayar.molaDk : ayar.calismaDk;
  z = { tur, dk, bitis: Date.now() + dk * 60000, kalanMs: null, ortamHazir: tur === 'calisma' && hazirlik.onay };
  sonDakikaDuyuruldu = false;
  odakVerisiniGuncelle((v) => {
    // Değerlendirilmemiş blok varken yeni blok başlarsa önceki puansız günlüğe geçer
    if (tur === 'calisma' && v.bekleyen) { v.bloklar.push(v.bekleyen); v.bekleyen = null; }
    v.zamanlayici = { ...z };
  }, profilId);
  // Dokunuş anında kısa ses: tarayıcı sesi açar, bitiş zili arka planda da çalabilir
  if (ayar.zil) sesCal('tik', { zorla: true });
  zamanla();
  duyur(`${TUR_ADI[tur]} başladı: ${dk} dakika.`);
  bildir();
  return true;
}

export function zamanlayiciDuraklat() {
  if (!z || z.bitis == null) return;
  z = { ...z, kalanMs: kalanMs(), bitis: null };
  kaydet();
  zamanla();
  duyur('Zamanlayıcı duraklatıldı.');
  bildir();
}

export function zamanlayiciDevam() {
  if (!z || z.bitis != null) return;
  z = { ...z, bitis: Date.now() + (z.kalanMs ?? 0), kalanMs: null };
  kaydet();
  zamanla();
  duyur('Zamanlayıcı devam ediyor.');
  bildir();
}

/** Erken bitirir. Çalışma bloğu en az 1 dk sürdüyse değerlendirmeye bekletilir. Döner: { kayit } */
export function zamanlayiciBitir() {
  if (!z) return { kayit: false };
  const biten = z;
  const gecenSn = Math.round((biten.dk * 60000 - kalanMs(biten)) / 1000);
  const kayit = biten.tur === 'calisma' && gecenSn >= EN_KISA_KAYIT_SN;
  z = null;
  zamanla();
  odakVerisiniGuncelle((v) => {
    v.zamanlayici = null;
    if (kayit) bekleyenAyarla(v, blokOlustur({ dk: biten.dk, sureSn: gecenSn, tamamlandi: false, ortamHazir: biten.ortamHazir }));
  }, profilId);
  duyur(biten.tur === 'mola' ? 'Mola bitti.' : kayit ? 'Blok bitti.' : 'Blok 1 dakikadan kısa sürdüğü için günlüğe yazılmadı.');
  bildir('bitirildi', { tur: biten.tur, kayit });
  return { kayit };
}

// ---------- Sekme başlığı ve yüzen gösterge ----------
function baslikGuncelle(d) {
  if (!document.hidden) {
    if (saklananBaslik != null) { document.title = saklananBaslik; saklananBaslik = null; }
    return;
  }
  if (!d && !doldu) return;
  saklananBaslik ??= document.title;
  if (!d) document.title = `Süre doldu | ${UYGULAMA_ADI}`;
  else document.title = `${sureBicimle(Math.ceil(d.kalanMs / 1000))} ${TUR_ADI[d.tur]}${d.calisiyor ? '' : ' (duraklatıldı)'} | ${UYGULAMA_ADI}`;
}

function cipGuncelle(d) {
  const goster = !!d && etkinRota()?.yol !== '/odak';
  if (!goster) { if (cip) cip.hidden = true; return; }
  if (!cip) {
    cip = el('a', { sinif: 'odak-cip', href: '#/odak' }, spriteIkon('saat', 'ikon ikon--kucuk'), el('span', { sinif: 'odak-cip__metin' }));
    document.body.append(cip);
  }
  const sn = Math.ceil(d.kalanMs / 1000);
  cip.hidden = false;
  cip.lastElementChild.textContent = `${TUR_ADI[d.tur]} ${sureBicimle(sn)}${d.calisiyor ? '' : ' ‖'}`;
  cip.setAttribute('aria-label', `${TUR_ADI[d.tur]} zamanlayıcısı${d.calisiyor ? '' : ' duraklatıldı'}, kalan ${sureMetni(sn)}. Odak Araçlarını aç.`);
}

function gorunurlukDegisti() {
  if (!document.hidden) doldu = false;
  if (z?.bitis != null && z.bitis <= Date.now()) { sureDoldu(); return; } // arka planda geciken bitiş hemen işlenir
  bildir('tik');
}

// Profil değişince o profilin zamanlayıcısı yüklenir (her profilin kendi zamanlayıcısı)
function profilEsitle() {
  clearInterval(aralik);
  clearTimeout(bitisZamani);
  profilId = etkinProfil()?.id ?? null;
  z = profilId ? odakVerisi(profilId)?.zamanlayici ?? null : null;
  sonDakikaDuyuruldu = !!z && kalanMs(z) <= 60000;
  if (z?.bitis != null && z.bitis <= Date.now()) { sureDoldu(); return; }
  zamanla();
  bildir();
}

/** Uygulama açılışında bir kez (app.js); tekrar çağrılırsa yalnız eşitler */
export function zamanlayiciKur() {
  if (kuruldu) return;
  kuruldu = true;
  dinle(OLAYLAR.PROFIL_DEGISTI, profilEsitle);
  dinle(OLAYLAR.ROTA_DEGISTI, () => cipGuncelle(zamanlayiciDurumu()));
  document.addEventListener('visibilitychange', gorunurlukDegisti);
  profilEsitle();
}
