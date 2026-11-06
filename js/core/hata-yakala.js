// Küresel hata yakalayıcı (S25): açılışta hata olursa beyaz ekran yerine "Uygulama açılamadı" ekranı, açılıştan sonra kapatılabilir uyarı bandı; ikisinde de "Yedeği indir".
// Kasıtlı olarak modül değil, klasik betik ve hiçbir dosyaya bağlı değil: app.js ya da bağımlılıklarından biri yüklenemese de çalışmalı.
// Bu yüzden yedek burada da üretilir; biçim storage.js yedekOlustur() ile AYNI tutulmalı (uygulama, surum, olusturma, veri). Açılış bitince app.js <html data-uygulama="hazir"> yazar.
(() => {
  'use strict';

  const ONEK = 'odak:';                          // storage.js ONEK ile aynı
  const ANAHTAR_DESENI = /^[a-zA-Z0-9:_-]{1,120}$/; // storage.js ANAHTAR_DESENI ile aynı (yedek geri yüklenebilsin)
  const ACILIS_BEKLEME_MS = 2000;                 // sayfa yüklendikten sonra uygulama hâlâ hazır değilse açılamamış sayılır
  const EN_COK_KAYIT = 10;

  const kok = document.documentElement;
  const hazirMi = () => kok.dataset.uygulama === 'hazir';
  const kayitlar = [];
  let ekranAcik = false;
  let bant = null;
  let bantSayisi = 0;

  // ---------- Yardımcılar ----------
  // Küçük öğe oluşturucu (ui.js el() yüklenemeyebilir); metin her zaman textContent
  function oge(etiket, nitelik = {}, ...cocuklar) {
    const o = document.createElement(etiket);
    for (const [k, v] of Object.entries(nitelik)) {
      if (v == null || v === false) continue;
      if (k === 'metin') o.textContent = v;
      else if (k === 'tikla') o.addEventListener('click', v);
      else o.setAttribute(k, v === true ? '' : v);
    }
    o.append(...cocuklar.filter((c) => c != null && c !== false));
    return o;
  }

  function kaydet(tur, ayrinti) {
    const saat = new Date().toLocaleTimeString('tr-TR');
    kayitlar.push(`[${saat}] ${tur}: ${ayrinti}`);
    if (kayitlar.length > EN_COK_KAYIT) kayitlar.shift();
  }

  const yolKisalt = (adres) => String(adres || '').replace(location.origin, '');

  // Uygulamaya ait olmayan ya da zararsız hatalar (tarayıcı eklentileri, yeniden boyutlama uyarısı)
  function yokSay(mesaj, dosya) {
    if (/ResizeObserver loop/i.test(mesaj)) return true;
    if (!dosya) return mesaj === 'Script error.';
    return !dosya.startsWith(location.origin);
  }

  // ---------- Yedek ----------
  function gunEtiketi() {
    const t = new Date();
    const i = (n) => String(n).padStart(2, '0');
    return `${t.getFullYear()}-${i(t.getMonth() + 1)}-${i(t.getDate())}`;
  }

  function yedekMetni() {
    const depo = window.localStorage; // erişim yoksa hata fırlatır; çağıran yakalar
    const veri = {};
    let surum = 1;
    let adet = 0;
    for (let i = 0; i < depo.length; i++) {
      const anahtar = depo.key(i);
      if (!anahtar || !anahtar.startsWith(ONEK)) continue;
      const ad = anahtar.slice(ONEK.length);
      let deger;
      try { deger = JSON.parse(depo.getItem(anahtar)); } catch { continue; } // bozuk kayıt atlanır
      if (ad === 'surum') { if (Number.isInteger(deger) && deger >= 1) surum = deger; continue; }
      if (ad.startsWith('__') || !ANAHTAR_DESENI.test(ad)) continue;
      veri[ad] = deger;
      adet++;
    }
    return { adet, metin: JSON.stringify({ uygulama: 'odak-akademi', surum, olusturma: new Date().toISOString(), veri }, null, 2) };
  }

  /** Yedeği indirir; sonucu durum öğesine yazar (ekran okuyucu okur) */
  function yedekIndir(durum) {
    try {
      const { adet, metin } = yedekMetni();
      if (!adet) { durum.textContent = 'Bu cihazda kayıtlı çalışma bulunamadı; indirilecek bir şey yok.'; return; }
      const ad = `odak-akademi-yedek-${gunEtiketi()}.json`;
      const url = URL.createObjectURL(new Blob([metin], { type: 'application/json' }));
      const a = oge('a', { href: url, download: ad, hidden: true });
      (document.querySelector('dialog[open]') ?? document.body).append(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      durum.textContent = `Yedek indirildi: ${ad}. Dosyayı sakla; sorun düzelince Ayarlar > Verilerim > Yedeği yükle ile geri alabilirsin.`;
    } catch (h) {
      kaydet('Yedek', h && h.message ? h.message : String(h));
      durum.textContent = 'Yedek hazırlanamadı. Bu tarayıcı kayıtlara erişime izin vermiyor olabilir.';
    }
  }

  // Uygulama dosyalarını (önbellek ve service worker) siler; çalışmalar (localStorage) silinmez
  async function dosyalariYenile(durum) {
    if (navigator.onLine === false) { durum.textContent = 'Bunun için internet gerekiyor. Bağlanınca yeniden dene.'; return; }
    durum.textContent = 'Uygulama dosyaları yeniden indiriliyor…';
    try {
      if ('caches' in window) {
        const adlar = await caches.keys();
        await Promise.all(adlar.filter((a) => a.startsWith('odak-akademi-')).map((a) => caches.delete(a)));
      }
      const kayitlilar = (await navigator.serviceWorker?.getRegistrations?.()) ?? [];
      await Promise.all(kayitlilar.map((k) => k.unregister()));
    } catch (h) {
      kaydet('Dosya yenileme', h && h.message ? h.message : String(h));
    }
    location.reload();
  }

  async function ayrintiKopyala(durum) {
    try {
      await navigator.clipboard.writeText(ayrintiMetni());
      durum.textContent = 'Ayrıntı kopyalandı.';
    } catch {
      durum.textContent = 'Kopyalanamadı. Ayrıntıyı seçip elle kopyalayabilirsin.';
    }
  }

  function ayrintiMetni() {
    return [
      `Adres: ${yolKisalt(location.href)}`,
      `Tarayıcı: ${navigator.userAgent}`,
      ...(kayitlar.length ? kayitlar : ['Ayrıntı kaydedilmedi.']),
    ].join('\n');
  }

  // ---------- Açılış hatası ekranı ----------
  function ekraniGoster() {
    if (ekranAcik) return;
    ekranAcik = true;
    if (!document.body) { document.addEventListener('DOMContentLoaded', ekraniCiz, { once: true }); return; }
    ekraniCiz();
  }

  function ekraniCiz() {
    bant?.remove();
    const durum = oge('p', { class: 'hata-ekrani__durum', role: 'status' });
    const eskiTarayici = !('noModule' in HTMLScriptElement.prototype);
    const cevrimdisi = navigator.onLine === false;
    const neden = eskiTarayici
      ? 'Bu tarayıcı Odak Akademi’yi çalıştıracak kadar güncel değil. Tarayıcıyı güncelleyip ya da başka bir tarayıcıyla yeniden açmayı dene.'
      : 'Bir sorun yüzünden Odak Akademi başlatılamadı. Bu senin yüzünden olmadı. Kaydedilmiş çalışmaların bu cihazda duruyor.';
    const adimlar = oge('ol', {},
      oge('li', { metin: 'Önce sayfayı yenile. Çoğu zaman bu yeterli olur.' }),
      cevrimdisi && oge('li', { metin: 'Şu an internet yok gibi görünüyor. Bağlantı gelince yeniden dene.' }),
      oge('li', { metin: 'Düzelmezse yedeğini indir ve bir yetişkine haber ver.' }));
    const baslik = oge('h1', { id: 'hata-ekrani-baslik', tabindex: '-1', metin: 'Uygulama açılamadı' });
    const ayrinti = oge('pre', { class: 'hata-ekrani__ayrinti', tabindex: '0', 'aria-label': 'Sorun ayrıntısı', metin: ayrintiMetni() });

    const ic = oge('div', { class: 'hata-ekrani__ic' },
      oge('div', { class: 'hata-ekrani__ust' }, oge('img', { src: 'icons/fener.svg', alt: '', width: '56', height: '56' }), baslik),
      oge('p', { id: 'hata-ekrani-aciklama', metin: neden }),
      adimlar,
      oge('div', { class: 'hata-ekrani__eylemler' },
        oge('button', { type: 'button', class: 'btn btn--birincil', metin: 'Sayfayı yenile', tikla: () => location.reload() }),
        oge('button', { type: 'button', class: 'btn btn--ikincil', metin: 'Yedeği indir', tikla: () => yedekIndir(durum) })),
      durum,
      oge('details', {},
        oge('summary', { metin: 'Yetişkinler için: ayrıntı ve onarım' }),
        oge('p', { class: 'alan__ipucu', metin: 'Bu bilgi yalnız bu ekranda görünür, hiçbir yere gönderilmez. Sorunu bildirirken kopyalayıp paylaşabilirsiniz.' }),
        ayrinti,
        oge('div', { class: 'hata-ekrani__eylemler' },
          oge('button', { type: 'button', class: 'btn btn--hayalet btn--kucuk', metin: 'Ayrıntıyı kopyala', tikla: () => ayrintiKopyala(durum) }),
          oge('button', { type: 'button', class: 'btn btn--hayalet btn--kucuk', metin: 'Uygulama dosyalarını yeniden indir', tikla: () => dosyalariYenile(durum) })),
        oge('p', { class: 'alan__ipucu', metin: 'Yeniden indirme internet ister; profiller ve çalışmalar silinmez. Yine de önce yedeği indirmeniz önerilir.' })));

    // <dialog> en üst katmanda açılır: açık başka pencerelerin ve egzersiz katmanının üstünde kalır
    const kullanDialog = typeof HTMLDialogElement === 'function' && 'showModal' in HTMLDialogElement.prototype;
    const ekran = oge(kullanDialog ? 'dialog' : 'div', {
      class: 'hata-ekrani', role: kullanDialog ? null : 'alertdialog', 'aria-modal': kullanDialog ? null : 'true',
      'aria-labelledby': 'hata-ekrani-baslik', 'aria-describedby': 'hata-ekrani-aciklama' }, ic);
    if (kullanDialog) {
      ekran.addEventListener('cancel', (e) => e.preventDefault()); // Esc ile kapanıp boş sayfa bırakmasın
      document.body.append(ekran);
      try { ekran.showModal(); } catch { ekran.setAttribute('open', ''); }
    } else {
      [...document.body.children].forEach((c) => { c.inert = true; });
      document.body.append(ekran);
    }
    baslik.focus();
  }

  // ---------- Açılıştan sonraki hata bandı ----------
  // Açık pencere ya da egzersiz katmanı varsa onun içine konur (dışarıda kalırsa tıklanamaz ve Tab ile ulaşılamaz)
  function bantYeri() {
    return document.querySelector('dialog[open]:not(.hata-ekrani)') ?? document.querySelector('.egz[aria-modal="true"]') ?? document.body;
  }

  function bandiGoster() {
    if (ekranAcik || !document.body) return;
    bantSayisi++;
    if (bant?.isConnected) {
      bant.querySelector('.hata-bandi__baslik').textContent = `Birkaç şey beklendiği gibi çalışmadı (${bantSayisi}).`;
      return;
    }
    const durum = oge('p', { role: 'status' });
    bant = oge('div', { class: 'hata-bandi', role: 'alert' },
      oge('p', { class: 'hata-bandi__baslik', metin: 'Bir şey beklendiği gibi çalışmadı.' }),
      oge('p', { metin: 'Kaydedilmiş çalışmaların bu cihazda duruyor. Sayfayı yenilemek çoğu zaman düzeltir.' }),
      oge('div', { class: 'hata-bandi__eylemler' },
        oge('button', { type: 'button', class: 'btn btn--birincil btn--kucuk', metin: 'Sayfayı yenile', tikla: () => location.reload() }),
        oge('button', { type: 'button', class: 'btn btn--ikincil btn--kucuk', metin: 'Yedeği indir', tikla: () => yedekIndir(durum) }),
        oge('button', { type: 'button', class: 'btn btn--hayalet btn--kucuk', metin: 'Kapat', tikla: () => { bant.remove(); bant = null; bantSayisi = 0; } })),
      durum);
    const yer = bantYeri();
    yer.append(bant);
    // Pencere kapanınca bant sayfaya döner
    if (yer.tagName === 'DIALOG') yer.addEventListener('close', () => { if (bant?.isConnected) document.body.append(bant); }, { once: true });
  }

  function isle() {
    if (hazirMi()) bandiGoster();
    else ekraniGoster();
  }

  // ---------- Dinleyiciler ----------
  // Yakalama aşamasında dinlenir: <script> ve stil dosyası yüklenemediğinde gelen olay (kabarcıklanmaz) de yakalanır
  window.addEventListener('error', (e) => {
    const hedef = e.target;
    if (hedef && hedef !== window && hedef.tagName) {
      const betikMi = hedef.tagName === 'SCRIPT';
      if (!betikMi && !(hedef.tagName === 'LINK' && hedef.rel === 'stylesheet')) return; // resim vb. sorun sayılmaz
      kaydet('Dosya yüklenemedi', yolKisalt(hedef.src || hedef.href));
      if (betikMi) isle();
      return;
    }
    const mesaj = e.message || String(e.error);
    const dosya = e.filename || '';
    if (yokSay(mesaj, dosya)) return;
    kaydet('Hata', `${mesaj}${dosya ? ` (${yolKisalt(dosya)}:${e.lineno}:${e.colno})` : ''}`);
    isle();
  }, true);

  // Yakalanmamış söz (Promise) hatası: açılışı durdurmaz; yalnız açılıştan sonra bant gösterilir
  window.addEventListener('unhandledrejection', (e) => {
    const r = e.reason;
    if (r && r.name === 'AbortError') return;
    kaydet('İşlem tamamlanamadı', r && r.message ? r.message : String(r));
    if (hazirMi()) bandiGoster();
  });

  // Hiç hata olayı gelmeden açılış kalmışsa (ör. bağımlı dosya bulunamadı) yine yardım ekranı çıkar
  window.addEventListener('load', () => {
    setTimeout(() => {
      if (hazirMi() || ekranAcik) return;
      kaydet('Açılış', 'Uygulama belirlenen sürede başlamadı.');
      ekraniGoster();
    }, ACILIS_BEKLEME_MS);
  });
})();
