// Hesap bilgisi (S27; S28: görünümle birlikte renkli ikon seti; S34a: ilkokul profilinde her zaman çocuk görünümü, veli alanında her zaman hesap görünümü): yöneticinin belirlediği görünüm (profesyonel | cocuk). Kullanıcı arayüzünde seçilemez; sunucu gelince değer oradan yazılır.
// Kök öznitelik: <html data-gorunum="cocuk"> (profesyonelde öznitelik yok). Anahtar '__hesap' cihaz düzeyidir: yedeğe girmez, "Tüm verileri sil" silmez; S34a kuralı __hesap kaydını değiştirmez.
// Ekrandaki görünüm = hedefGorunum(): veli alanı (#/veli…) → hesaptaki görünüm; etkin profil 2-4. sınıf → cocuk; değilse (5-8. sınıf, profil yok) → hesaptaki görünüm.
// Profil değişince settings.js profilGorunumu() çağırır (ayarlar kaydedilmeden, profilin ayarlarıyla birlikte uygulanır); adres değişince bu dosya kendisi yeniler.
import { oku, yaz } from './storage.js';
import { ayarlariUygula } from './a11y.js';
import { ikonSetiniUygula } from './ikon-seti.js';
import { dinle, OLAYLAR } from './store.js';
import { ilkokulMu } from './siniflar.js';

export const GORUNUMLER = Object.freeze(['profesyonel', 'cocuk']);
export const VARSAYILAN_GORUNUM = 'profesyonel';
export const HESAP_SURUMU = 1;
const ANAHTAR = '__hesap';
const kok = document.documentElement;

let profilSinifi = null; // etkin profilin sınıfı (yoksa null)
let veliAlani = false;   // adres #/veli ile mi başlıyor
let baslatildi = false;

const veliYoluMu = (yol) => typeof yol === 'string' && /^\/veli(\/|$)/.test(yol);
const adrestekiYol = () => '/' + location.hash.slice(1).split('?')[0].replace(/^\/+/, '');

/** Kayıtlı hesap bilgisi: {surum, gorunum, kaynak: varsayilan|yerel|sunucu, guncelleme|null} */
export function hesapBilgisi() {
  const h = oku(ANAHTAR);
  if (h && typeof h === 'object' && GORUNUMLER.includes(h.gorunum)) {
    return { surum: HESAP_SURUMU, gorunum: h.gorunum, kaynak: h.kaynak ?? 'yerel', guncelleme: h.guncelleme ?? null };
  }
  return { surum: HESAP_SURUMU, gorunum: VARSAYILAN_GORUNUM, kaynak: 'varsayilan', guncelleme: null };
}

/** S34a: Ekranda olması gereken görünüm (varsayılan olarak etkin profil ve adrese göre) */
export function hedefGorunum({ sinif = profilSinifi, veli = veliAlani } = {}) {
  if (!veli && ilkokulMu(sinif)) return 'cocuk';
  return hesapBilgisi().gorunum;
}

/** Şu an ekrandaki görünüm */
export function etkinGorunum() {
  return kok.dataset.gorunum === 'cocuk' ? 'cocuk' : 'profesyonel';
}

export const cocukGorunumuMu = () => etkinGorunum() === 'cocuk';

// Ekrana uygular. yenile: a11y tarayıcı çubuğu rengini yeniler ve ayar dinleyicilerine haber verir (gökyüzü, güneş/ay, Fener, Ayarlar formu);
// ayarlar hemen ardından ayrıca uygulanacaksa (settings.js) false verilir. Döner: görünüm değişti mi
function uygula(gorunum, { yenile = true } = {}) {
  if (baslatildi && etkinGorunum() === gorunum) return false;
  baslatildi = true;
  if (gorunum === 'cocuk') kok.dataset.gorunum = 'cocuk';
  else delete kok.dataset.gorunum;
  ikonSetiniUygula(gorunum); // S28: çocukta renkli ikonlar (dosya gelince yazılır), profesyonelde asıl çizgiler
  if (yenile) ayarlariUygula({});
  return true;
}

/** S34a: Görünümü etkin profile ve adrese göre yeniden uygular. Döner: değişti mi */
export function gorunumuYenile(secenek) {
  return uygula(hedefGorunum(), secenek);
}

/** S34a: Etkin profil değişti ya da sınıfı güncellendi (settings.js çağırır). Döner: görünüm değişti mi */
export function profilGorunumu(profil, secenek) {
  profilSinifi = profil?.sinif ?? null;
  return gorunumuYenile(secenek);
}

// Veli alanına girip çıkınca: hashchange dinleyicisi yönlendiriciden önce kaydedildiği için sayfa çizilmeden önce çalışır (yanıp sönme olmaz)
function adresDegisti(yol = adrestekiYol()) {
  const veli = veliYoluMu(yol);
  if (veli === veliAlani) return;
  veliAlani = veli;
  gorunumuYenile();
}

/** Açılışta, ayarlarBaslat()'tan ve yönlendiriciden önce bir kez çağrılır: kayıtlı görünümü etkin profilin sınıfına ve adrese göre uygular.
 *  secenek.sinif: kayıtlı etkin profilin sınıfı (app.js aktifProfil()'den verir; açılış perdesi kalkmadan doğru görünüm gelsin) */
export function hesapBaslat({ sinif = null } = {}) {
  profilSinifi = sinif ?? null;
  veliAlani = veliYoluMu(adrestekiYol());
  uygula(hedefGorunum());
  addEventListener('hashchange', () => adresDegisti());
  dinle(OLAYLAR.ROTA_DEGISTI, ({ yol }) => adresDegisti(yol)); // git(…, {degistir: true}) hashchange üretmez
}

/**
 * Görünümü kaydeder ve uygular. Yalnız yönetici akışı (ileride sunucu) ve geliştirici denemesi çağırır; arayüzde düğmesi yoktur.
 * S34a: ilkokul profilinde ekran yine çocuk görünümünde kalır (kayıt yine değişir).
 * Döner: {tamam: true, gorunum, ekrandaki} | {tamam: false, hata}
 */
export function gorunumAyarla(gorunum, { kaynak = 'yerel' } = {}) {
  if (!GORUNUMLER.includes(gorunum)) return { tamam: false, hata: `Görünüm “${gorunum}” tanınmıyor. Seçenekler: ${GORUNUMLER.join(', ')}` };
  const kayit = { surum: HESAP_SURUMU, gorunum, kaynak, guncelleme: new Date().toISOString() };
  if (!yaz(ANAHTAR, kayit)) return { tamam: false, hata: 'Görünüm kaydedilemedi.' };
  gorunumuYenile();
  return { tamam: true, gorunum, ekrandaki: etkinGorunum() };
}
