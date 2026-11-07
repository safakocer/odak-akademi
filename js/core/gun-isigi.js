// Gün ışığı hesabı (S33; saf, internetsiz): Türkiye ortası için gün doğumu/batımı (NOAA yaklaşımı), gündüz/gece, doğuş/batış sıcaklığı, gece ay döngüsü ve ay evresi. Konum istenmez, dış istek yok.
// Saat her cihazda Türkiye saatine (UTC+3) çevrilir; cihazın saat dilimi farklı olsa da sonuç aynıdır.

export const GUN_ISIGI = Object.freeze({
  enlem: 39, boylam: 35, utcFarkDk: 180, // Türkiye ortalaması, TSİ
  sicakDk: 60, // doğuştan sonraki ve batıştan önceki 60 dk’da sıcak (turuncu) gök
  ayDongusuDk: 60, // gece ay her 60 dk’da soldan doğup sağdan batar (gerçek konumu izlemez)
  aySinodikGun: 29.530588853, // iki yeni ay arası
  yeniAyRef: Date.UTC(2000, 0, 6, 18, 14), // bilinen bir yeni ay anı
});

const RAD = Math.PI / 180;
const GUN_MS = 86400000;
let denemeFarkMs = 0;

/** Şu an (geliştirici denemesinde kaydırılmış olabilir) */
export function simdi() {
  return new Date(Date.now() + denemeFarkMs);
}

/** Türkiye saatinde: {yil, gunNo (1-366), yilGun (365|366), dakika (0-1440, kesirli)} */
export function trZamani(t = simdi()) {
  const d = new Date(t.getTime() + GUN_ISIGI.utcFarkDk * 60000);
  const yil = d.getUTCFullYear();
  const gunNo = Math.floor((Date.UTC(yil, d.getUTCMonth(), d.getUTCDate()) - Date.UTC(yil, 0, 1)) / GUN_MS) + 1;
  const yilGun = (yil % 4 === 0 && yil % 100 !== 0) || yil % 400 === 0 ? 366 : 365;
  const dakika = d.getUTCHours() * 60 + d.getUTCMinutes() + d.getUTCSeconds() / 60;
  return { yil, gunNo, yilGun, dakika };
}

/** Gün doğumu ve batımı (Türkiye saatinde, gece yarısından dakika) */
export function gunesSaatleri(gunNo, yilGun = 365) {
  const g = ((2 * Math.PI) / yilGun) * (gunNo - 1);
  const zamanDenk = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g)
    - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
  const sapma = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g)
    + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
  const enlem = GUN_ISIGI.enlem * RAD;
  const cosH = Math.cos(90.833 * RAD) / (Math.cos(enlem) * Math.cos(sapma)) - Math.tan(enlem) * Math.tan(sapma);
  const yariGunDk = (4 * Math.acos(Math.min(1, Math.max(-1, cosH)))) / RAD;
  const ogle = 720 - 4 * GUN_ISIGI.boylam - zamanDenk + GUN_ISIGI.utcFarkDk;
  return { dogus: ogle - yariGunDk, batis: ogle + yariGunDk };
}

/** Ay evresi 0-1: 0 yeni ay, 0,25 ilk dördün, 0,5 dolunay, 0,75 son dördün */
export function ayEvresi(t = simdi()) {
  const gun = (t.getTime() - GUN_ISIGI.yeniAyRef) / GUN_MS;
  return (((gun / GUN_ISIGI.aySinodikGun) % 1) + 1) % 1;
}

/** Evrenin adı (geliştirici denemesi için) */
export function evreAdi(e) {
  const adlar = ['yeni ay', 'büyüyen hilal', 'ilk dördün', 'büyüyen şişkin ay', 'dolunay', 'küçülen şişkin ay', 'son dördün', 'küçülen hilal'];
  return adlar[Math.round(e * 8) % 8];
}

/**
 * Gökyüzünün şu anki durumu.
 * Döner: {gunduz, dakika, dogus, batis, oran (gündüz: güneşin yolu 0→1; gece: ayın 1 saatlik yolu 0→1), sicak (0-1; doğuş/batışta 1), evre}
 */
export function gunDurumu(t = simdi()) {
  const { gunNo, yilGun, dakika } = trZamani(t);
  const { dogus, batis } = gunesSaatleri(gunNo, yilGun);
  const gunduz = dakika >= dogus && dakika < batis;
  let oran;
  let sicak = 0;
  if (gunduz) {
    oran = (dakika - dogus) / (batis - dogus);
    const kenar = Math.min(dakika - dogus, batis - dakika); // doğuşa ya da batışa kalan/geçen dakika
    if (kenar < GUN_ISIGI.sicakDk) sicak = 0.5 * (1 + Math.cos((Math.PI * kenar) / GUN_ISIGI.sicakDk));
  } else {
    const geceDk = dakika >= batis ? dakika - batis : dakika + 1440 - batis; // son batıştan beri
    oran = (geceDk % GUN_ISIGI.ayDongusuDk) / GUN_ISIGI.ayDongusuDk;
  }
  return { gunduz, dakika, dogus, batis, oran, sicak, evre: ayEvresi(t) };
}

/** Geliştirici denemesi: saati 'SS:DD' (ya da 'SS.DD') yapar; null gerçek saate döner. Döner: hedef dakika | null */
export function denemeSaati(saat) {
  denemeFarkMs = 0;
  const m = /^(\d{1,2})[.:](\d{2})$/.exec(String(saat ?? '').trim());
  if (!m) return null;
  const hedef = Number(m[1]) * 60 + Number(m[2]);
  denemeFarkMs = (hedef - trZamani(new Date()).dakika) * 60000;
  return hedef;
}

/** Dakikayı “06.12” biçiminde yazar */
export function saatMetni(dk) {
  const d = ((Math.round(dk) % 1440) + 1440) % 1440;
  return `${String(Math.floor(d / 60)).padStart(2, '0')}.${String(d % 60).padStart(2, '0')}`;
}
