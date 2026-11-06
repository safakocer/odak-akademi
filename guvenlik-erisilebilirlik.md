# guvenlik-erisilebilirlik.md: S25 (S26 güncellemesi: tam tarama, sunucu başlıkları, yeniden akış) gizlilik, güvenlik ve WCAG 2.2 AA kontrol listesi, kalan riskler (yalnız geliştirme; sw.js'te yok)

Durum işaretleri: ✅ karşılanıyor · 🔧 S25'te düzeltildi · ⚠️ elle denenmeli / kısmen · ❌ açık risk

## 1. Güvenlik

| Konu | Durum | Not |
|---|---|---|
| Harici ağ isteği | ✅ | Yazı tipi, ikon, veri hepsi yerel. CSP `default-src 'self'` ile tarayıcı da engeller. |
| Content-Security-Policy | 🔧 | index.html ve gizlilik.html'de meta etiketi. `script-src 'self'` (satır içi betik yok). `style-src 'unsafe-inline'` yalnız index.html'de: `style="--yigin-bosluk…"` öznitelikleri ve JS'teki `style:` kullanımları için. `img-src data: blob:`: zihin haritası PNG çıktısı. |
| innerHTML / insertAdjacentHTML / document.write / eval / new Function | ✅ | Taranan 30 dosyada hiç yok. Ekrana basılan her metin `el()` ile `textContent`. Zihin haritası SVG çıktısı XMLSerializer ile kaçışlı ve `<img>` içinde (betik çalışmaz). |
| Kullanıcı verisiyle CSS seçicisi | 🔧 | kutuphane.js `CSS.escape`. haftalik-plan.js seçicileri yedekten gelen blok kimliği içerir: bozuk kimlik yalnız odak taşımayı bozar (hata bandı çıkar), güvenlik açığı değil. |
| Yedek yükleme | ✅ | 5 MB sınırı, uygulama adı, sürüm, anahtar deseni denetimi; sorun olursa eski veri geri konur. |
| CSV formül enjeksiyonu | ✅ | utils.csvMetni `= + - @` başına `'` ekler (S24). |
| Küresel hata yakalayıcı | 🔧 | js/core/hata-yakala.js: açılışta “Uygulama açılamadı” ekranı, sonra kapatılabilir bant; ikisinde “Yedeği indir”. Hata ayrıntısı hiçbir yere gönderilmez. |
| Referrer | 🔧 | `no-referrer` (dış bağlantı yok; önlem). |

## 2. WCAG 2.2 AA kontrol listesi

| Ölçüt | Durum | Not |
|---|---|---|
| 1.1.1 Metin dışı içerik | ✅ | İkonlar `aria-hidden`, ikon düğmelerinde `aria-label`; seviye noktaları `role="img"` + etiket. |
| 1.3.1 Bilgi ve ilişkiler | ✅ | Başlık sırası, `label for`, `fieldset/legend`, `aria-labelledby` bölümler. |
| 1.4.1 Renk tek başına kullanılmaz | 🔧 | Yanlış seçenekte ✗ + kesik kenar, boşluk sorusunda kesik alt çizgi, sıralamada kesik kenar; ekran okuyucuya “doğru cevap / henüz doğru değil” notu; gözden geçirmede “Soru 3: kısmen doğru”; segmentte seçili öğeye kenar çizgisi. |
| 1.4.3 Metin kontrastı (4.5:1) | ✅ | Açık temada en düşük çift: başarı/başarı zemini 4.57. Koyu temada hepsi ≥ 5.5. |
| 1.4.11 Metin dışı kontrast (3:1) | 🔧 | Girdi kenarı `--renk-kenar-guclu` #7b918f → #687e7c (zeminde 2.99 → 3.87). Odak halkası açık temada ≥ 4.25, görev kartı ve güncelleme bandında beyaz. |
| 1.4.4 / 1.4.10 / 1.4.12 Yazı boyutu, yeniden akış, aralık | 🔧 | Ayarlarda 4 yazı boyutu, disleksi yazı tipi. S26: 20 sayfa 320/360 px × normal/“Çok büyük” yazıyla otomatik denendi; Egzersizler etiketi ve Kurs bildirimi düzeltildi. Kalan: 320 px + “Çok büyük”te Kütüphane başlığı 3 px taşar. |
| 1.4.13 Üzerine gelince çıkan içerik | ✅ | Yalnız `title` ipuçları (tarayıcı varsayılanı). |
| 2.1.1 Klavye | ✅ | Tüm denetimler düğme/bağlantı/form öğesi. Zihin haritası: Tab, oklar, +, Enter, Delete. Sıralama soruları ↑/↓ düğmeleri. Kaydırılabilir tablo `tabindex="0"`. |
| 2.1.2 Klavye tuzağı yok | ✅ | Egzersiz katmanında odak tuzağı + Esc; `<dialog>` Esc ile kapanır (karşılama hariç: profil gerekli, bilinçli). |
| 2.2.1 Zamanlama | ⚠️ | Toast 3,5 sn (hata 12 sn), içerik ayrıca ekran okuyucuya okunur. Zamanlı egzersizler kendi açıklamasında süreyi söyler, duraklatılabilir. |
| 2.3.1 Üç parlama | ⚠️ | Flaş egzersizleri küçük alanda kısa gösterim yapar; saniyede 3'ten fazla tam ekran parlama olmadığı elle doğrulanmalı. |
| 2.4.1 Bloğu atla | ✅ | “İçeriğe atla” bağlantısı (gizlilik.html'de de). |
| 2.4.2 Sayfa başlığı | ✅ | Yönlendirici her sayfada `document.title` yazar. |
| 2.4.3 Odak sırası | ✅ | Sayfa değişince odak ana içeriğe, pencere kapanınca açan düğmeye. |
| 2.4.7 Odak görünür | ✅ | `:focus-visible` 3 px turuncu halka; `outline: none` yalnız programla odaklanan kapsayıcılarda. |
| 2.4.11 Odak örtülmez (YENİ 2.2) | 🔧 | Üst çubuk için `scroll-padding-top` vardı; alt gezinme için `scroll-padding-bottom` eklendi. |
| 2.5.7 Sürükleme hareketleri (YENİ 2.2) | 🔧 | Zihin haritasına “Seçili düğümü taşı” ← ↑ ↓ → düğmeleri. Sıralama zaten düğmeli. |
| 2.5.8 Hedef boyutu (YENİ 2.2) | ✅ | `--dokunma-min: 44px` (ölçüt 24 px). |
| 3.1.1 Sayfa dili | ✅ | `lang="tr"`. |
| 3.2.6 Tutarlı yardım (YENİ 2.2) | 🔧 | Gizlilik metni Ayarlar > Verilerim ve karşılamada, hep aynı yerde. |
| 3.3.1 / 3.3.3 Hata tanımlama ve öneri | ✅ | Form hataları metinle, `aria-invalid`, odak hatalı alana. |
| 3.3.7 Yinelenen giriş (YENİ 2.2) | ✅ | Bilgi iki kez istenmez; ayarlar ve seçimler hatırlanır. |
| 3.3.8 Erişilebilir kimlik doğrulama (YENİ 2.2) | ⚠️ | PIN alanında yapıştırma serbest (ölçüt bunu yeterli sayar). Parola yöneticisi bilinçli olarak kapalı (`autocomplete="off"`): çocuk aynı cihazda veli PIN'ini otomatik dolduramasın. |
| 4.1.2 Ad, rol, değer | ✅ | Sekme deseni, `aria-pressed`, `role="switch"`, `aria-expanded`. |
| 4.1.3 Durum mesajları | ✅ | Toast `role="status"`, `duyur()` canlı bölgeleri, hata bandı `role="alert"`. |

## 3. Kalan riskler

1. ✅ **Taranmayan dosyalar.** S26: tüm `js/` klasöründe `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write`, `eval(`, `new Function(` ve metinli `setTimeout` arandı; bulgu yok.
2. 🔧 **Sunucu başlıkları.** S26: `_headers` dosyası eklendi (nosniff, `X-Frame-Options: DENY` + `frame-ancestors 'none'`, Referrer-Policy, Permissions-Policy, COOP, HSTS; `sw.js`, `index.html` ve manifest için `no-cache`). Netlify ve Cloudflare Pages okur; GitHub Pages okumaz (orada çerçeve engeli yok). Yayından sonra securityheaders.com ile kontrol edilir.
3. ⚠️ **`style-src 'unsafe-inline'`.** Betik çalıştırmaz, ama sayfaya HTML enjekte edilebilseydi stil değiştirilebilirdi. HTML enjeksiyonu olmadığı için düşük risk. Kaldırmak için `style=` öznitelikleri sınıflara taşınmalı.
4. ⚠️ **PIN gücü.** 4 rakam (10.000 olasılık); cihazdaki özeti alan biri kısa sürede çözebilir. Ekranda “tam güvenlik değildir” yazıyor; gizlilik metninde de belirtildi.
5. ⚠️ **Ortak cihaz.** Profiller birbirinden korunmaz; yedek ve dışa aktarım dosyaları çocuk verisi içerir.
6. ⚠️ **Hukuki inceleme.** gizlilik.html taslaktır; köşeli parantezli yerler (sunan, iletişim, barındırma, tarih) doldurulmalı, hukukçu/KVKK uzmanı incelemeli.
7. ⚠️ **Geliştirmede canlı yenileme.** VS Code “Live Server” gibi araçlar sayfaya satır içi betik ekler; CSP bunu engeller (konsolda uyarı, otomatik yenileme çalışmaz). Uygulama etkilenmez; sayfa elle yenilenir.
8. ⚠️ **Gizlilik sayfasında tema.** gizlilik.html betiksizdir; uygulamada seçilen tema/yazı boyutunu değil cihazın açık/koyu tercihini izler.
9. ⚠️ **Elle denenecekler.** Ekran okuyucu (Android TalkBack, iOS VoiceOver, NVDA) ile bir egzersiz, bir soru oturumu ve Veli alanı baştan sona; 200 % yakınlaştırma; Windows yüksek karşıtlık modu.

## 4. Kabul denemesi

- Network: Geliştirici araçları (F12) > Network > “Disable cache” > sayfayı yenile; “Domain” sütununda yalnız uygulamanın adresi olmalı. Ayrıca Console'da “Content Security Policy” uyarısı olmamalı.
- Klavye: fare kullanmadan Tab / Shift+Tab / Enter / Boşluk / Esc / oklarla: ana sayfa → her alt gezinme sekmesi → bir egzersiz (başla, duraklat, Esc ile çık) → Kütüphane süzgeçleri → Rehber araçları (zihin haritasında düğüm taşı) → Ayarlar → Veli alanı (PIN) → gizlilik.html ve geri.
- Hata ekranı: app.js'in adını geçici olarak değiştirip sayfayı aç → “Uygulama açılamadı” → “Yedeği indir” çalışmalı. Adı geri al.
