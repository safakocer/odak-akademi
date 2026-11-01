// Okuma modları: mod yükleme/kayıt yapısı, her mod için aynı arayüzü veren oturum (kademeli hız, süre sınırı) ve egzersiz çerçevesinde okuma sahnesi
import { okumaMotoruOlustur, metniGrupla, okumaAyarDenetle, kademeliIzinli, kademeliTavan, KADEMELI } from './reader-engine.js';
import { gozMolasiKur } from './eye-rest.js';
import { el } from '../core/ui.js';
import { duyur } from '../core/a11y.js';

/* ================= MOD SÖZLEŞMESİ =================
 * Yeni mod = js/engine/modes/<ad>.js dosyası; varsayılan dışa aktarım bir tanım nesnesidir.
 * Motor tarafında başka dosya değişmez; mod, egzersizin mod listesine adı yazılınca görünür.
 *
 * Tanım:
 *   ad          'rsvp'                      dosya adıyla aynı (küçük harf, rakam, tire)
 *   etiket      'Tek nokta'                 seçicide görünen ad
 *   aciklama    tek cümle                   seçicide adın altında görünür
 *   sira        sayı                        seçicideki sıra (küçük önce)
 *   motor       'tempolu' | 'serbest'       tempolu: gruplar WPM'ye göre ilerler; serbest: öğrenci "Bitirdim" der
 *   kontroller  ['wpm', 'grup']             ayar panelinde gösterilecek en az kontroller (boş olabilir)
 *   grupSiniri? { en, enCok }               kelime gruplamasında izinli aralık (ör. 2-4)
 *   gruplama?(ayar) → { grupTuru, grupBoyutu }   mod gruplamayı kendisi belirlerse (ör. tek kelime)
 *   uyari?      metin                       S05b: seçilince hazırlık ekranında gösterilen dürüst uyarı
 *   sureSiniriSn? sayı                      S05b: okuma süresi bu kadar olunca tur kendiliğinden biter (deneme modları)
 *   Ayar panelindeki önizleme de gorunumOlustur ile çizilir (motor çalışmaz, durumDegisti çağrılmaz, bir grup vurgulanır);
 *   bu yüzden görünüm, zamanlayıcıları yalnızca durumDegisti('okuyor') ile başlatmalıdır.
 *   gorunumOlustur(gruplar, ayar, yardim) → {
 *     kok                       ekrana konacak öğe (zorunlu)
 *     grupDegisti?(grup, sira)  tempolu modda etkin grup değişince
 *     durumDegisti?(durum)      hazir | okuyor | duraklatildi | bitti
 *     ayarUygula?(ayar)         görünüm ayarı (yazı boyutu, satır aralığı, yazı tipi, tema) değişince
 *     kapat?()                  dinleyicileri bırak
 *   }
 *   yardim.ilerlemeBildir(yuzde | null)   motorun ölçemediği ilerlemeyi bildirir (serbest mod; null = ölçülemiyor)
 *   yardim.gecenMs()                      S05b: bu turdaki okuma süresi (duraklamalar sayılmaz)
 *   yardim.sureSiniriMs                   S05b: süre sınırı (yoksa 0)
 *
 * Oturum (modOturumuOlustur) her mod için AYNI arayüzü verir; süre ve WPM tek yerde (reader-engine) hesaplanır:
 *   baslat() duraklat() devamEt() bitir() iptal() ayarlariUygula(degisen) → geçerli ayar
 *   yavaslat() → yeni hız (tempolu)   kademeli() → { acik, baslangic, tavan, enYuksek, artis, yavaslatma }
 *   durum() hiz() ilerlemeYuzde() gecenMs() olcum() toplamKelime() ayar()   + kok, tanim
 * Sonuç (bitince): reader-engine sonucu + modAd, baslangicWpm, enYuksekWpm, kademeli, yavaslatma, sureSiniri
 * Kademeli hız (yalnızca ayar.kademeli açıksa, tempolu modda ve anlama %70 kuralı izin veriyorsa):
 *   her KADEMELI.adimKelime kelimede hız KADEMELI.oran kadar artar, kademeliTavan'ı geçmez.
 *   yavaslat() hızı bir adım düşürür ve o turun tavanını bu hıza indirir (öğrencinin seçtiği hız korunur).
 * ======================================================================== */

const AD_DESENI = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const GORUNUM_ALANLARI = ['yaziBoyutu', 'satirAraligi', 'font', 'tema'];
const SINIR_DENETIM_MS = 200;
const kayit = new Map();
const yuklemeler = new Map();

function tanimDenetle(t) {
  if (!t || typeof t !== 'object' || !AD_DESENI.test(t.ad ?? '')) throw new TypeError('Mod tanımında geçerli bir "ad" yok.');
  if (typeof t.etiket !== 'string' || !t.etiket) throw new TypeError(`"${t.ad}" modunun etiketi yok.`);
  if (t.motor !== 'tempolu' && t.motor !== 'serbest') throw new TypeError(`"${t.ad}" modunda motor "tempolu" ya da "serbest" olmalı.`);
  if (typeof t.gorunumOlustur !== 'function') throw new TypeError(`"${t.ad}" modunda gorunumOlustur yok.`);
  if (t.sureSiniriSn !== undefined && !(Number.isFinite(t.sureSiniriSn) && t.sureSiniriSn > 0)) {
    throw new TypeError(`"${t.ad}" modunda sureSiniriSn pozitif bir sayı olmalı.`);
  }
}

/** Tanımı denetleyip kaydeder. Döner: dondurulmuş tanım */
export function modKaydet(tanim) {
  tanimDenetle(tanim);
  const t = Object.freeze({ sira: 99, aciklama: '', ...tanim, kontroller: Object.freeze([...(tanim.kontroller ?? [])]) });
  kayit.set(t.ad, t);
  return t;
}

export const modBul = (ad) => kayit.get(ad) ?? null;

/** js/engine/modes/<ad>.js dosyasını yükler (bir kez). Döner (Promise): tanım ya da null */
export function modYukle(ad) {
  if (kayit.has(ad)) return Promise.resolve(kayit.get(ad));
  if (typeof ad !== 'string' || !AD_DESENI.test(ad)) return Promise.resolve(null);
  if (!yuklemeler.has(ad)) {
    yuklemeler.set(ad, import(`./modes/${ad}.js`)
      .then((m) => {
        if (m.default?.ad !== ad) throw new TypeError(`Mod dosyasındaki ad "${m.default?.ad}", dosya adıyla ("${ad}") aynı olmalı.`);
        return modKaydet(m.default);
      })
      .catch((h) => { console.error('[okuma-modlari] Mod yüklenemedi:', ad, h); yuklemeler.delete(ad); return null; }));
  }
  return yuklemeler.get(ad);
}

/** Birden çok modu yükler; yüklenemeyenleri atlar, sira'ya göre dizer */
export async function modlariYukle(adlar = []) {
  const liste = (await Promise.all(adlar.map(modYukle))).filter(Boolean);
  return liste.sort((a, b) => a.sira - b.sira);
}

/** Modun o ayarla kullandığı gerçek gruplama (gruplama() ve grupSiniri uygulanmış) */
export function etkinGruplama(tanim, ayar) {
  const a = okumaAyarDenetle(ayar);
  if (typeof tanim.gruplama === 'function') {
    const g = okumaAyarDenetle({ ...a, ...tanim.gruplama(a) });
    return { grupTuru: g.grupTuru, grupBoyutu: g.grupBoyutu };
  }
  let { grupTuru, grupBoyutu } = a;
  const s = tanim.grupSiniri;
  if (s && grupTuru === 'kelime') grupBoyutu = Math.min(Math.max(grupBoyutu, s.en), s.enCok);
  return { grupTuru, grupBoyutu };
}

/**
 * Hazırlık ekranındaki okuma modu seçimi (her mod bir kart: ad + kısa açıklama; uyarısı olan mod seçilince uyarı görünür).
 * secenekler: { kimlik (alan öneki; radyo adı <kimlik>-mod), secili (mod adı), degisince?(tanim) }  → Döner: { kok, secili() }
 */
export function modSeciciOlustur(modlar, { kimlik = 'ok', secili, degisince } = {}) {
  const ad = `${kimlik}-mod`;
  const bul = (a) => modlar.find((t) => t.ad === a) ?? modlar[0] ?? null;
  let tanim = bul(secili);
  const uyari = el('p', { id: `${ad}-uyari`, sinif: 'okuma-ayar__uyari', 'aria-live': 'polite', hidden: true });
  const kok = el('fieldset', { sinif: 'grup' }, el('legend', { metin: 'Okuma modu' }),
    el('div', { sinif: 'okuma-ayar__liste' }, modlar.map((t) => el('label', { sinif: 'okuma-ayar__secenek okuma-ayar__secenek--mod' },
      el('input', { type: 'radio', name: ad, value: t.ad, checked: t.ad === tanim?.ad, 'aria-describedby': `${ad}-${t.ad}` }),
      el('span', {}, el('strong', { metin: t.etiket }), el('small', { id: `${ad}-${t.ad}`, metin: t.aciklama }))))),
    uyari);
  const uyariYaz = () => { uyari.hidden = !tanim?.uyari; uyari.textContent = tanim?.uyari ?? ''; };
  kok.addEventListener('change', (e) => {
    if (e.target?.name !== ad) return;
    tanim = bul(e.target.value);
    uyariYaz();
    try { degisince?.(tanim); } catch (h) { console.error('[okuma-modlari]', h); }
  });
  uyariYaz();
  return { kok, secili: () => tanim };
}

/**
 * Bir mod için okuma oturumu kurar.
 * secenekler: { metin, ayar, anlamaYuzde? (son anlama %; yoksa null), etkinMi?(), ilerleyince?(yuzde | null),
 *               durumDegisince?(durum), hizDegisince?(wpm, 'artti' | 'yavasladi'), bitince?(sonuc) }
 */
export function modOturumuOlustur(tanimVeyaAd, secenekler = {}) {
  const tanim = typeof tanimVeyaAd === 'string' ? modBul(tanimVeyaAd) : tanimVeyaAd;
  if (!tanim) throw new TypeError('Okuma modu bulunamadı; önce modYukle ile yükle.');
  tanimDenetle(tanim);
  const { metin, etkinMi, ilerleyince, durumDegisince, hizDegisince, bitince, anlamaYuzde = null } = secenekler;
  const tempolu = tanim.motor === 'tempolu';
  const sinirMs = tanim.sureSiniriSn ? tanim.sureSiniriSn * 1000 : 0;
  const kok = el('div', { sinif: `okuma-modu okuma-modu--${tanim.ad}` });
  let a = okumaAyarDenetle(secenekler.ayar);
  let motor = null;
  let gorunum = null;
  let sonYuzde;
  let sinirSayac = 0;
  let sinirDoldu = false;
  const kd = { acik: false, baslangic: 0, tavan: 0, enYuksek: 0, birikim: 0, artis: 0, yavaslatma: 0 };

  const cagir = (fn, ...x) => { try { return fn?.(...x); } catch (h) { console.error(`[okuma-modu:${tanim.ad}]`, h); return undefined; } };
  function yuzdeYay(y) {
    const v = y === null || y === undefined ? null : Math.max(0, Math.min(100, Math.round(y)));
    if (v === sonYuzde) return;
    sonYuzde = v;
    cagir(ilerleyince, v);
  }
  const yardim = Object.freeze({
    ilerlemeBildir: (y) => { if (motor?.durum() === 'okuyor') yuzdeYay(y); },
    gecenMs: () => motor?.gecenMs() ?? 0,
    sureSiniriMs: sinirMs,
  });

  // ---------- Kademeli hız ----------
  function kademeliSifirla() {
    kd.acik = tempolu && a.kademeli && kademeliIzinli(anlamaYuzde);
    kd.baslangic = a.wpm;
    kd.enYuksek = a.wpm;
    kd.tavan = kd.acik ? kademeliTavan(a.wpm) : a.wpm;
    kd.birikim = 0;
    kd.artis = 0;
    kd.yavaslatma = 0;
  }

  // Görünen her grubun kelimeleri sayılır; adım dolunca hız bir kademe artar (tavanı geçmez)
  function kademeliIlerle(grup) {
    if (!kd.acik || motor?.durum() !== 'okuyor') return;
    kd.birikim += grup.kelime;
    if (kd.birikim < KADEMELI.adimKelime) return;
    kd.birikim = 0;
    const h = motor.hiz();
    if (h >= kd.tavan) return;
    const yeni = motor.hizAyarla(Math.min(kd.tavan, Math.round(h * (1 + KADEMELI.oran))));
    kd.artis += 1;
    kd.enYuksek = Math.max(kd.enYuksek, yeni);
    cagir(hizDegisince, yeni, 'artti');
  }

  /** Hızı bir kademe düşürür; bu turda hız artık bunun üstüne çıkmaz. Döner: yeni hız */
  function yavaslat() {
    if (!tempolu || !['okuyor', 'duraklatildi'].includes(motor.durum())) return motor.hiz();
    const yeni = motor.hizAyarla(Math.round(motor.hiz() / (1 + KADEMELI.oran)));
    kd.tavan = Math.min(kd.tavan, yeni);
    kd.birikim = 0;
    kd.yavaslatma += 1;
    cagir(hizDegisince, yeni, 'yavasladi');
    return yeni;
  }

  // ---------- Süre sınırı (deneme modları) ----------
  function sinirIzle() {
    clearInterval(sinirSayac);
    if (!sinirMs) return;
    sinirSayac = setInterval(() => {
      if (motor.durum() !== 'okuyor' || motor.gecenMs() < sinirMs) return;
      sinirDoldu = true;
      motor.bitir();
    }, SINIR_DENETIM_MS);
  }

  // Görünümü ve motoru (yeniden) kurar; yalnızca okuma başlamadan çağrılır
  function kur() {
    motor?.iptal();
    clearInterval(sinirSayac);
    cagir(gorunum?.kapat);
    kademeliSifirla();
    sinirDoldu = false;
    const gruplar = metniGrupla(metin, etkinGruplama(tanim, a));
    const yeni = tanim.gorunumOlustur(gruplar, a, yardim);
    if (!yeni?.kok) throw new TypeError(`"${tanim.ad}" modu görünüm döndürmedi.`);
    gorunum = yeni;
    motor = okumaMotoruOlustur({
      gruplar, wpm: a.wpm, mod: tanim.motor, etkinMi,
      grupDegisince: (g, s) => { cagir(gorunum.grupDegisti, g, s); kademeliIlerle(g); },
      ilerleyince: yuzdeYay,
      durumDegisince: (d) => { kok.dataset.durum = d; cagir(gorunum.durumDegisti, d); cagir(durumDegisince, d); },
      bitince: (s) => {
        clearInterval(sinirSayac);
        if (s.tamamlandi) yuzdeYay(100);
        cagir(bitince, Object.freeze({
          ...s, modAd: tanim.ad,
          baslangicWpm: tempolu ? kd.baslangic : undefined,
          enYuksekWpm: tempolu ? Math.max(kd.enYuksek, s.hedefWpm ?? 0) : undefined,
          kademeli: kd.acik, yavaslatma: kd.yavaslatma, sureSiniri: sinirDoldu,
        }));
      },
    });
    kok.dataset.durum = 'hazir';
    kok.replaceChildren(gorunum.kok);
    sonYuzde = undefined;
    yuzdeYay(0);
  }

  /** Hız anında uygulanır (geçen süre korunur). Gruplama yalnızca okuma başlamadan değişir. Döner: geçerli ayar */
  function ayarlariUygula(degisen = {}) {
    const eski = a;
    let yeni = okumaAyarDenetle({ ...a, ...degisen });
    const g1 = etkinGruplama(tanim, eski);
    const g2 = etkinGruplama(tanim, yeni);
    const grupFarkli = g1.grupTuru !== g2.grupTuru || g1.grupBoyutu !== g2.grupBoyutu;
    const hazir = motor.durum() === 'hazir';
    if (grupFarkli && !hazir) yeni = { ...yeni, grupTuru: eski.grupTuru, grupBoyutu: eski.grupBoyutu };
    a = yeni;
    if (grupFarkli && hazir) kur();
    else {
      if (a.wpm !== eski.wpm) motor.hizAyarla(a.wpm);
      if (hazir && (a.wpm !== eski.wpm || a.kademeli !== eski.kademeli)) kademeliSifirla();
      if (GORUNUM_ALANLARI.some((x) => a[x] !== eski[x])) cagir(gorunum.ayarUygula, a);
    }
    return { ...a };
  }

  kur();
  return Object.freeze({
    tanim,
    kok,
    baslat() { const oldu = motor.baslat(); if (oldu) sinirIzle(); return oldu; },
    duraklat: () => motor.duraklat(),
    devamEt: () => motor.devam(),
    bitir: () => motor.bitir(),
    iptal() { clearInterval(sinirSayac); motor.iptal(); cagir(gorunum.kapat); },
    ayarlariUygula,
    yavaslat,
    kademeli: () => ({ acik: kd.acik, baslangic: kd.baslangic, tavan: kd.tavan, enYuksek: kd.enYuksek, artis: kd.artis, yavaslatma: kd.yavaslatma }),
    durum: () => motor.durum(),
    hiz: () => motor.hiz(),
    ilerlemeYuzde: () => (tempolu ? motor.ilerlemeYuzde() : sonYuzde ?? null),
    gecenMs: () => motor.gecenMs(),
    olcum: () => motor.olcum(),
    toplamKelime: () => motor.toplamKelime,
    ayar: () => ({ ...a }),
  });
}

/**
 * Egzersiz çerçevesinde (ctx) bir modu çalıştırır: ilerleme çubuğu, hız satırı ve "Yavaşlat" (tempolu modlar),
 * okuma alanı, serbest modda "Bitirdim", göz molası hatırlatıcısı (ayar.gozMolasi açıksa).
 * Duraklat/devam çerçevenin üst çubuğundan (ve Esc ile) yapılır; ctx.aktifMi false iken süre işlemez.
 * Bitince ölçümü ctx.ekstra'ya yazar ve ctx.bitir() çağırır.
 * secenekler: { tanim, metin, ayar, anlamaYuzde?, ekstra? (ctx.ekstra'ya eklenecek alanlar),
 *               bitince?(sonuc) (S06: verilirse ctx.bitir yerine çağrılır; ör. okumadan sonra sorular) }  → Döner: oturum
 */
export function okumaSahnesiKur(ctx, { tanim, metin, ayar, anlamaYuzde = null, ekstra = {}, bitince = null }) {
  ctx.alan.setAttribute('role', 'region'); // okuma alanı oyun değil: ekran okuyucu metni normal okuyabilsin
  ctx.alan.classList.add('egz-alan--okuma');
  const serbest = tanim.motor === 'serbest';
  const a0 = okumaAyarDenetle(ayar);
  const yuzdeMetni = el('span', { metin: '%0' });
  const dolgu = el('span', { sinif: 'ilerleme__dolgu' });
  const cubuk = el('div', {
    sinif: 'ilerleme ilerleme--ince', role: 'progressbar', 'aria-label': 'Okuma ilerlemesi',
    'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': '0',
  }, dolgu);
  let oturum = null;
  let gozMolasi = null;
  const okumaSurerMi = () => ctx.aktifMi() && !gozMolasi?.acikMi();

  const bitirDugme = serbest && el('button', {
    type: 'button', sinif: 'btn btn--birincil btn--buyuk btn--blok okuma-oyun__bitir', metin: 'Bitirdim',
    onclick: () => { if (okumaSurerMi()) oturum?.bitir(); },
  });

  // Tempolu modlarda: anlık hız ve "Yavaşlat" (kademeli artışı geri alır; artış kapalıyken de hızı biraz düşürür)
  // Hız metni okurken sürekli değişir; ekran okuyucu okumayı kesmesin diye canlı değil, yalnız “Yavaşlat” duyurulur
  const hizMetni = el('span', { sinif: 'okuma-oyun__hiz', 'aria-live': 'off' });
  const hizSatiri = !serbest && el('div', { sinif: 'okuma-oyun__hiz-satiri' }, hizMetni,
    el('button', {
      type: 'button', sinif: 'btn btn--ikincil okuma-oyun__yavaslat', metin: 'Yavaşlat',
      onclick: () => {
        if (!okumaSurerMi() || !oturum) return;
        duyur(`Hız dakikada ${oturum.yavaslat()} kelimeye indi.`);
      },
    }));
  function hizGoster(h, neden) {
    const ek = neden === 'artti' ? ' · biraz hızlandı' : neden === 'yavasladi' ? ' · yavaşladı' : '';
    const kd = oturum?.kademeli();
    const not = !neden && kd?.acik ? ' · kademeli artış açık' : '';
    hizMetni.textContent = `Hız: dakikada ${h} kelime${ek}${not}`;
  }

  function ilerlemeGoster(y) {
    if (y === null) {
      dolgu.style.setProperty('--deger', '0%');
      cubuk.removeAttribute('aria-valuenow');
      cubuk.setAttribute('aria-valuetext', 'Metin tek ekrana sığıyor, ilerleme ölçülmüyor');
      yuzdeMetni.textContent = '–';
      return;
    }
    dolgu.style.setProperty('--deger', `${y}%`);
    cubuk.setAttribute('aria-valuenow', String(y));
    cubuk.removeAttribute('aria-valuetext');
    yuzdeMetni.textContent = `%${y}`;
  }

  oturum = modOturumuOlustur(tanim, {
    metin, ayar: a0, anlamaYuzde, etkinMi: okumaSurerMi, ilerleyince: ilerlemeGoster, hizDegisince: hizGoster,
    bitince: (s) => {
      Object.assign(ctx.ekstra, {
        mod: s.modAd, motor: s.mod, kelime: s.okunanKelime, toplamKelime: s.toplamKelime, wpm: s.wpm, hedefWpm: s.hedefWpm,
        sureMs: s.sureMs, grupSayisi: s.grupSayisi, duraklatma: s.duraklatmaSayisi,
        baslangicWpm: s.baslangicWpm, enYuksekWpm: s.enYuksekWpm, kademeli: s.kademeli, yavaslatma: s.yavaslatma,
        sureSiniri: s.sureSiniri, ...ekstra,
      });
      if (typeof bitince === 'function') bitince(s); else ctx.bitir();
    },
  });

  const oyun = el('div', { sinif: 'okuma-oyun' },
    serbest && el('p', { sinif: 'okuma-oyun__not', metin: 'Metni kendi hızında, anlayarak oku. Bitirince en alttaki “Bitirdim” düğmesine bas.' }),
    el('div', { sinif: 'okuma-oyun__ilerleme' },
      el('div', { sinif: 'ilerleme-etiket' }, el('span', { metin: 'İlerleme' }), yuzdeMetni), cubuk),
    hizSatiri,
    oturum.kok,
    bitirDugme);
  ctx.alan.append(oyun);
  ctx.temizlenince(() => oturum.iptal());
  gozMolasi = gozMolasiKur(ctx, {
    acik: a0.gozMolasi, kap: oyun, gecenMs: () => oturum.gecenMs(), okuyorMu: () => oturum.durum() === 'okuyor',
  });
  oturum.baslat();
  hizGoster(oturum.hiz());
  return oturum;
}
