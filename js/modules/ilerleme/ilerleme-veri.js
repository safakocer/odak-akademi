// İlerleme paneli verisi (S20): metrics kayıtlarından günlük EOH, anlama, dikkat doğruluğu ve hafıza dizi uzunluğu serileri; dönem özeti
import { sayi, gunAnahtari } from '../../core/utils.js';
import { gunKaydir, bugunAnahtari, dikkatIsabet, hafizaDuzey } from '../../engine/motivasyon.js';

export const DONEMLER = Object.freeze({
  hafta: { gun: 7, etiket: 'Son 7 gün' },
  ay: { gun: 30, etiket: 'Son 30 gün' },
});

// Her ölçü: günlük değer (ort = günün ortalaması, enCok = günün en iyisi); bos: veri yokken öneri ve bağlantı
export const OLCULER = Object.freeze([
  { ad: 'eoh', baslik: 'Etkin okuma hızı', birim: 'k/dk', aciklama: 'Dakikadaki kelime × anlama oranı, günün ortalaması.',
    bos: 'Anlama soruları olan bir okuma yapınca burada görünür.', adres: '#/egzersiz/oku-anla', adresMetni: 'Oku ve Anla’yı aç',
    seriler: [{ ad: 'eoh', etiket: 'EOH', birlestir: 'ort', deger: (k) => sayi(k.eoh) }] },
  { ad: 'anlama', baslik: 'Anlama', birim: '%', yuzde: true, aciklama: 'Okuma sonrası soruların doğru oranı, günün ortalaması.',
    bos: 'Oku ve Anla’da soruları yanıtlayınca burada görünür.', adres: '#/egzersiz/oku-anla', adresMetni: 'Oku ve Anla’yı aç',
    seriler: [{ ad: 'anlama', etiket: 'Anlama', birlestir: 'ort', deger: (k) => sayi(k.anlamaYuzde) }] },
  { ad: 'dikkat', baslik: 'Dikkat doğruluğu', birim: '%', yuzde: true, aciklama: 'Dikkat oyunlarındaki doğruluk, günün ortalaması.',
    bos: 'Bir dikkat oyunu oynayınca burada görünür.', adres: '#/modul/dikkat', adresMetni: 'Dikkat alanını aç',
    seriler: [{ ad: 'dikkat', etiket: 'Doğruluk', birlestir: 'ort', deger: (k) => (k.modul === 'dikkat' ? dikkatIsabet(k) : undefined) }] },
  { ad: 'hafiza', baslik: 'Hafıza dizi uzunluğu', birim: 'öğe', aciklama: 'Günün en uzun hatırlanan dizisi.',
    bos: 'Rakam Dizisi ya da Işıklı Bloklar oynayınca burada görünür.', adres: '#/modul/hafiza', adresMetni: 'Hafıza alanını aç',
    seriler: [
      { ad: 'rakam', egzersiz: 'rakam-dizisi', birlestir: 'enCok', deger: (k) => (k.egzersiz === 'rakam-dizisi' ? hafizaDuzey(k) : undefined) },
      { ad: 'blok', egzersiz: 'corsi-bloklari', birlestir: 'enCok', deger: (k) => (k.egzersiz === 'corsi-bloklari' ? hafizaDuzey(k) : undefined) },
    ] },
]);

/** Bugünle biten gun sayıda gün anahtarı (eskiden yeniye) */
export function gunListesi(gunSayisi, bugun = bugunAnahtari()) {
  return Array.from({ length: gunSayisi }, (_, i) => gunKaydir(bugun, i - gunSayisi + 1));
}

function ilkSon(degerler) {
  const dolu = degerler.filter((v) => v != null);
  return { ilk: dolu[0] ?? null, son: dolu.at(-1) ?? null, olcumGunu: dolu.length };
}

/** Ölçünün günlük serileri: { seriler [{ ad, egzersiz?, degerler, olcumSayisi, ilk, son, olcumGunu }], bos } */
export function olcuSerileri(olcu, kayitlar, gunler) {
  const indeks = new Map(gunler.map((g, i) => [g, i]));
  const kayitGunleri = kayitlar.map((k) => indeks.get(gunAnahtari(k.tarih)));
  const seriler = olcu.seriler.map((s) => {
    const kova = gunler.map(() => []);
    let olcumSayisi = 0;
    kayitlar.forEach((k, j) => {
      const i = kayitGunleri[j];
      if (i === undefined) return;
      const v = s.deger(k);
      if (v === undefined || !Number.isFinite(v)) return;
      kova[i].push(v);
      olcumSayisi += 1;
    });
    const degerler = kova.map((a) => (!a.length ? null
      : s.birlestir === 'enCok' ? Math.max(...a) : Math.round(a.reduce((t, v) => t + v, 0) / a.length)));
    return { ad: s.ad, egzersiz: s.egzersiz, etiket: s.etiket, degerler, olcumSayisi, ...ilkSon(degerler) };
  });
  return { seriler, bos: seriler.every((s) => s.olcumSayisi === 0) };
}

/** Dönem özeti (ilerleme verisi + kayıtlar): çalışılan gün, toplam/ortalama dk, hedef tutulan gün, alanlara göre süre */
export function donemOzeti(veri, kayitlar, gunler) {
  const kume = new Set(gunler);
  let calisilanGun = 0;
  let sn = 0;
  let hedefGun = 0;
  for (const g of gunler) {
    const d = veri.gunler[g];
    if (!d?.kayit) continue;
    calisilanGun += 1;
    sn += d.sn;
    if (d.hedef) hedefGun += 1;
  }
  const alanlar = {};
  for (const k of kayitlar) {
    if (!kume.has(gunAnahtari(k.tarih))) continue;
    const a = (alanlar[k.modul] ??= { sn: 0, oturum: 0 });
    a.sn += sayi(k.sureSn) ?? 0;
    a.oturum += 1;
  }
  return {
    calisilanGun, toplamDk: Math.round(sn / 60), ortDk: calisilanGun ? Math.round(sn / 60 / calisilanGun) : 0, hedefGun, alanlar,
  };
}
