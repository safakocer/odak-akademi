// Hesap bilgisi (S27; S28: görünümle birlikte renkli ikon seti): yöneticinin belirlediği görünüm (profesyonel | cocuk). Kullanıcı arayüzünde seçilemez; sunucu gelince değer oradan yazılır.
// Kök öznitelik: <html data-gorunum="cocuk"> (profesyonelde öznitelik yok). Anahtar '__hesap' cihaz düzeyidir: yedeğe girmez, "Tüm verileri sil" silmez.
import { oku, yaz } from './storage.js';
import { ayarlariUygula } from './a11y.js';
import { ikonSetiniUygula } from './ikon-seti.js';

export const GORUNUMLER = Object.freeze(['profesyonel', 'cocuk']);
export const VARSAYILAN_GORUNUM = 'profesyonel';
export const HESAP_SURUMU = 1;
const ANAHTAR = '__hesap';
const kok = document.documentElement;

/** Kayıtlı hesap bilgisi: {surum, gorunum, kaynak: varsayilan|yerel|sunucu, guncelleme|null} */
export function hesapBilgisi() {
  const h = oku(ANAHTAR);
  if (h && typeof h === 'object' && GORUNUMLER.includes(h.gorunum)) {
    return { surum: HESAP_SURUMU, gorunum: h.gorunum, kaynak: h.kaynak ?? 'yerel', guncelleme: h.guncelleme ?? null };
  }
  return { surum: HESAP_SURUMU, gorunum: VARSAYILAN_GORUNUM, kaynak: 'varsayilan', guncelleme: null };
}

/** Şu an ekrandaki görünüm */
export function etkinGorunum() {
  return kok.dataset.gorunum === 'cocuk' ? 'cocuk' : 'profesyonel';
}

export const cocukGorunumuMu = () => etkinGorunum() === 'cocuk';

// Ekrana uygular; a11y tarayıcı çubuğu rengini yeniler ve ayar dinleyicilerine haber verir (ayar değişmediği için kayıt yapılmaz)
function uygula(gorunum) {
  if (gorunum === 'cocuk') kok.dataset.gorunum = 'cocuk';
  else delete kok.dataset.gorunum;
  ikonSetiniUygula(gorunum); // S28: çocukta renkli ikonlar (dosya gelince yazılır), profesyonelde asıl çizgiler
  ayarlariUygula({});
}

/** Açılışta, ayarlarBaslat()'tan önce bir kez çağrılır: kayıtlı görünümü uygular. */
export function hesapBaslat() {
  uygula(hesapBilgisi().gorunum);
}

/**
 * Görünümü kaydeder ve uygular. Yalnız yönetici akışı (ileride sunucu) ve geliştirici denemesi çağırır; arayüzde düğmesi yoktur.
 * Döner: {tamam: true, gorunum} | {tamam: false, hata}
 */
export function gorunumAyarla(gorunum, { kaynak = 'yerel' } = {}) {
  if (!GORUNUMLER.includes(gorunum)) return { tamam: false, hata: `Görünüm “${gorunum}” tanınmıyor. Seçenekler: ${GORUNUMLER.join(', ')}` };
  const kayit = { surum: HESAP_SURUMU, gorunum, kaynak, guncelleme: new Date().toISOString() };
  if (!yaz(ANAHTAR, kayit)) return { tamam: false, hata: 'Görünüm kaydedilemedi.' };
  uygula(gorunum);
  return { tamam: true, gorunum };
}
