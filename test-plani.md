# test-plani.md — Odak Akademi v1.0 test planı (S26; yalnız geliştirme, yayına konmaz)

Her yayından önce bu plan uygulanır. Sonuçlar 5. bölümdeki tabloya yazılır. Güvenlik ve erişilebilirlik kontrol listesi ayrıca `guvenlik-erisilebilirlik.md`'dedir.

## 1. Cihaz ve tarayıcı matrisi

| # | Cihaz | Tarayıcı | Öncelik | Ana ekrana ekleme yolu | Not |
|---|---|---|---|---|---|
| C1 | Android telefon (360-412 px) | Chrome (güncel) | Zorunlu | Ayarlar > Uygulama > “Ana ekrana ekle” düğmesi ya da Chrome menüsü ⋮ > “Ana ekrana ekle / Uygulamayı yükle” | Öğrencilerin çoğu |
| C2 | Eski/ucuz Android (2-3 GB RAM) | Chrome | Zorunlu | C1 ile aynı | Performans ve bellek |
| C3 | iPhone | Safari (güncel iOS) | Zorunlu | Paylaş □↑ > “Ana Ekrana Ekle” | Kurulum düğmesi çıkmaz, ipucu çıkar |
| C4 | iPad | Safari | Önerilen | C3 ile aynı | Yatay/dikey |
| C5 | Windows dizüstü | Chrome | Zorunlu | Adres çubuğundaki “Yükle” simgesi ya da Ayarlar'daki düğme | Klavye testi burada |
| C6 | Windows dizüstü | Edge | Zorunlu | Adres çubuğu “Uygulama kullanılabilir” simgesi | Okul bilgisayarları |
| C7 | Windows/macOS | Firefox | Zorunlu | Masaüstü Firefox'ta “Ana ekrana ekle” beklenmez | Uygulama tarayıcıda ve çevrimdışı çalışmalı |
| C8 | macOS | Safari | Önerilen | Dosya > “Dock'a Ekle” | |
| C9 | Okul tahtası / büyük ekran | Chrome | İsteğe bağlı | — | Dokunmatik, 1920 px |

Ekran okuyucu turu (TalkBack, VoiceOver, NVDA) için `guvenlik-erisilebilirlik.md` 3. bölüm 9. maddeye bakın.

## 2. Elle test senaryoları (30 madde)

Her madde yayındaki adreste (https) denenir. **Beklenen** sonuç olmazsa madde “kaldı” sayılır.

### A. Kurulum, çevrimdışı, güncelleme (kabul ölçütleri)

1. **İlk açılış.** Yeni tarayıcı profiliyle siteyi açın.
   **Beklenen:** Karşılama penceresi çıkar. Takma ad ve sınıf seçilip “Başla”ya basılınca ana sayfa “Merhaba, <ad>!” ile açılır.
2. **Çevrimdışı hazırlığı.** Ayarlar > Uygulama bölümüne gidin.
   **Beklenen:** “İnternet olmadan da açılmaya hazır.” ve “Sürüm: 1.0.0-s26” yazar. Gerekirse sayfayı bir kez yenileyin.
3. **Ana ekrana ekle (Android/masaüstü).** C1, C5 ve C6'da Ayarlar'daki düğmeyle ya da tarayıcı menüsüyle ekleyin.
   **Beklenen:** Simge ana ekranda/başlat menüsünde görünür. Uygulama adres çubuksuz, kendi penceresinde açılır. Ayarlar'da “bu cihazda uygulama olarak açık” yazar.
4. **Ana ekrana ekle (iOS).** C3'te Paylaş > “Ana Ekrana Ekle” yolunu izleyin.
   **Beklenen:** Fener simgesi ve “Odak Akademi” adı görünür, uygulama tam ekran açılır.
5. **Çevrimdışı açılış.** Uçak modunu açın, uygulamayı ana ekrandan kapatıp yeniden açın.
   **Beklenen:** Ana sayfa açılır ve veriler yerindedir. “İnternet yok” bildirimi çıkabilir.
6. **Çevrimdışı gezinme.** Uçak modu açıkken Kütüphane'den bir metin, bir Oku-Anla, bir göz egzersizi, Kurs, Testler ve Zihin Haritası açın.
   **Beklenen:** Hepsi açılır. “açılamadı” bildirimi ya da hata bandı çıkmaz.
7. **Güncelleme.** sw.js'te SURUM'u artırıp yeniden yayınlayın (yayin-rehberi.md 5. bölüm). Açık uygulamada 1 saat bekleyin ya da uygulamayı kapatıp açın.
   **Beklenen:** “Uygulamanın yeni sürümü hazır” bandı çıkar. “Güncelle” denince sayfa yenilenir, Ayarlar'da yeni sürüm yazar, veriler kaybolmaz.
8. **Eski sürümden geçiş.** S25 (0.4.3) kurulu bir cihazda yeni sürümü açın.
   **Beklenen:** Güncelleme bandı çıkar. Güncellemeden sonra profiller, kayıtlar ve notlar yerindedir.

### B. Profil, veri, ayarlar

9. **Profiller.** İkinci bir profil ekleyin, profiller arasında geçin, birini silin.
   **Beklenen:** Her profilin kayıtları ayrıdır. Silinen profilin verisi kalmaz.
10. **Yedek.** Ayarlar > Verilerim > “Yedeği indir” deyin. Ardından “Tüm verileri sil” ile her şeyi silip yedeği yükleyin.
    **Beklenen:** Profiller, sonuçlar, notlar ve haritalar geri gelir.
11. **Görünüm ayarları.** Tema (açık/koyu/sistem), 4 yazı boyutu, disleksi yazı tipi, hareketi azalt ve ses ayarlarını değiştirin, sonra sayfayı yenileyin.
    **Beklenen:** Ayarlar kalıcıdır ve profile özeldir.
12. **360 px düzen.** Telefonda (ya da F12 > cihaz görünümü, 360 px) ve “Çok büyük” yazıyla tüm alt gezinme sekmelerini dolaşın.
    **Beklenen:** Yatay kaydırma çıkmaz, metin kesilmez.

### C. Okuma ve anlama

13. **Hızlı Oku.** Rehberli, Kelime grubu, Serbest ve RSVP modlarını, WPM 150 ve 300'de deneyin. Duraklat/Devam ve Yavaşlat'ı kullanın.
    **Beklenen:** Hız ayara uyar. Hızlı Oku sonucu kaydedilmez.
14. **Oku ve Anla.** Bir 6. sınıf metni okuyup soruları yanıtlayın.
    **Beklenen:** Sonuçta WPM, anlama % ve EOH görünür. Anlama %70'in altındaysa “hızı artırma, anlamayı güçlendir” mesajı çıkar.
15. **Kütüphane.** Arama, sınıf/tür/uzunluk süzgeçleri ve favori özelliklerini kullanın. Kendi metninizi 2 soruyla ekleyip okuyun.
    **Beklenen:** Süzgeçler doğru çalışır. Kendi metin Oku-Anla'da sorularıyla açılır.
16. **Okuma stratejileri.** #/teknikler/stratejiler'den bir dersi baştan sona tamamlayın.
    **Beklenen:** Mini sınama puanı ders kartında görünür.

### D. Göz, dikkat, hafıza egzersizleri

17. **Göz.** Schulte, Grup Flaşı ve Farkı Bul'u Kolay ve Zor seviyede birer kez oynayın.
    **Beklenen:** Puan ve “kendi rekorun” bölümü çıkar. Flaşta ekranda yanıp sönme rahatsız edici değildir.
18. **Dikkat.** Stroop, Dokun ya da Bekle ve Gece Nöbeti oyunlarını tamamlayın.
    **Beklenen:** Tepki süresi ve isabet görünür. Bir sonraki seviye önerisi gelir.
19. **Hafıza.** Rakam Dizisi, Işıklı Bloklar ve n-geri oyunlarını oynayın.
    **Beklenen:** Merdiven yükselip alçalır, en iyi düzey kaydedilir.
20. **Egzersizden çıkış.** Oyun sırasında Esc'ye ve kapat düğmesine basın.
    **Beklenen:** Gelinen sayfaya dönülür. Yarım tur kaydedilmez ya da bunun söylenir.
21. **Mola.** Okumayı 20 dk aralıksız sürdürün (ya da ayarlardan kısaltın).
    **Beklenen:** Mola önerilir ama zorlanmaz.

### E. Kurs, test, ilerleme, rehber

22. **Seviye testi.** Başlangıç testini 5 adımıyla bitirin.
    **Beklenen:** Radar grafiği ve tablo görünür. Kurs başlangıç hızı bu testten alınır.
23. **Akıllı Kurs.** Kursu 15 dk profiliyle başlatın, 1. günü bitirin. Geliştirici konsolundan `odakDeneme.kursIlerle(1)` ile ertesi güne geçin.
    **Beklenen:** Gün kararı ve açıklaması çıkar. #/kurs/rapor açılır.
24. **İlerleme.** Birkaç çalışma yaptıktan sonra #/ilerleme ve #/ilerleme/rapor sayfalarını açın.
    **Beklenen:** Seri, XP, günlük hedef ve grafikler görünür. Grafiğin tablo görünümü de açılır.
25. **Tekrar Kartları.** Hazır bir deste ekleyin, 5 kartı “bildim/bilemedim” ile tekrar edin. CSV dışa ve içe aktarın.
    **Beklenen:** Kutular ve sonraki tarih doğru güncellenir.
26. **Çalışma Rehberi.** Cornell notu yazın, zihin haritasında düğümü klavyeyle taşıyın, haftalık plan oluşturup yazdırın.
    **Beklenen:** Kendiliğinden kaydedilir. Yazdırma önizlemesi düzgün çıkar.

### F. Veli alanı, güvenlik, hata

27. **Veli alanı.** PIN belirleyin, yanlış PIN'i 4 kez girin, sonra doğru PIN'le girin. Haftalık hedef koyup CSV indirin.
    **Beklenen:** Bekleme süresi uygulanır. CSV Excel'de Türkçe karakterlerle açılır. 5 dk işlem yapılmazsa alan kilitlenir.
28. **Sınıf modu.** Sınıf modunu açın.
    **Beklenen:** Açılışta profil seçimi çıkar. Profil silme, yedek yükleme ve verileri silme gizlenir.
29. **Dış istek yok.** F12 > Network > “Disable cache” işaretliyken sayfayı yenileyin.
    **Beklenen:** Yalnız uygulamanın adresinden dosya gelir, Console'da CSP uyarısı yoktur.
30. **Gizlilik ve hata ekranı.** Karşılama penceresinden ve Ayarlar > Verilerim'den gizlilik sayfasını açın.
    **Beklenen:** Sayfa açılır ve “Uygulamaya dön” çalışır. Köşeli parantezli yer tutucu kalmamıştır (yayin-rehberi.md 1. bölüm).

## 3. Lighthouse hedefleri ve ölçüm yöntemi

| Kategori | Hedef (mobil) | S26 ölçümü (mobil / masaüstü) |
|---|---|---|
| Performance | ≥ 90 | 91-95 (ölçümler arası oynar) / 100 |
| Accessibility | ≥ 95 (kabul ≥ 90) | 100 / 100 (14 sayfa) |
| Best Practices | ≥ 95 | 100 / 100 |
| SEO | ≥ 90 | 100 / 100 |

S26 ölçümü Lighthouse 12.8 ile sıkıştırmalı yerel sunucuda yapıldı. Yayındaki adreste yeniden ölçülmelidir.

**Ölçüm adımları (Chrome, masaüstü):**
1. Gizli pencere açın (eklentiler sonucu bozmasın) ve yayındaki adresi açın.
2. F12 > Lighthouse sekmesine gidin.
3. “Mobile” seçin, Performance, Accessibility, Best Practices ve SEO'yu işaretleyin, “Analyze page load”a basın.
4. Kütüphane, Kurs ve Ayarlar sayfalarında da tekrarlayın. Adresin sonuna `#/kutuphane` gibi eklemek Lighthouse için uygundur.

**Kurulabilirlik:** Lighthouse 12'den beri ayrı bir “PWA” kategorisi yoktur. Kurulabilirliği şöyle denetleyin: F12 > Application > Manifest. “Installability” bölümünde hata olmamalı, simgeler görünmeli. Ardından Application > Service workers'ta durum “activated and is running” olmalıdır. S26'da Chrome'un kurulabilirlik denetimi ve manifest denetimi hatasız geçti.

**Otomatik tarama sonucu (S26):** axe-core 4 (WCAG 2.0/2.1/2.2 A-AA + en iyi uygulamalar) ile 27 adreste, açık ve koyu temada, profil oluşturulmuş hâlde ihlal bulunmadı. Taranan adresler: ana sayfa, egzersizler, alan sayfaları, kütüphane, ayarlar, kurs ve raporu, ilerleme ve raporu, rehber ve 4 aracı, testler, odak, tekrar, teknikler ve stratejiler, veli alanı ve 4 egzersiz. Otomatik tarama elle denemenin yerini tutmaz (madde 12, 20, 27 ve ekran okuyucu turu).

## 4. Performans

### Ölçülen boyutlar (S26)

| Parça | Ham | Sıkıştırılmış (gzip) | Ne zaman iner |
|---|---|---|---|
| index.html | 38 KB | 9 KB | Açılışta |
| Açılış JS (app.js + 18 modül) | 187 KB | 67 KB | Açılışta |
| CSS (12 dosya) | 119 KB | 31 KB | Açılışta |
| Yazı tipleri (2 × woff2) | 50 KB | (zaten sıkıştırılmış) | Yalnız “disleksi dostu” seçilince |
| Metin bankası (4 JSON) | 294 KB | 77 KB | Kütüphane/okuma ilk açılınca |
| Diğer JS (egzersiz ve sayfalar) | 876 KB | — | Sayfa ilk açılınca (dinamik import) |
| Tüm uygulama, 140 dosya (service worker ilk kurulum) | 1,8 MB | 0,64 MB | İlk ziyaretten sonra arka planda, bir kez |

Sayfalar ve egzersizler zaten gecikmeli yükleniyor (app.js ve katalog.js'teki `import()`).

### Gecikmeli yükleme önerileri (v1.1 adayları)

1. **Sayfa CSS'leri.** library, odak, lessons, srs, testler, kurs, ilerleme, rehber ve veli (~72 KB) yalnız kendi sayfasında gerekli. exercise.css'teki gibi sayfa açılırken eklenebilir. Lighthouse kullanılmayan CSS'i ~42 KB ölçtü. Ana sayfanın kullandığı kurallar (görev kartı, günlük hedef) önce components.css'e taşınmalıdır.
2. **exercise-frame.js** (34 KB) app.js'ten doğrudan içe aktarılıyor. Egzersiz ilk açılınca yüklenebilir. Ana sayfa için gereken küçük parça ayrı dosyaya alınmalıdır.
3. **Küçültme (minify)** derleme adımı gerektirdiği için kuralla çelişir. Barındırıcının sıkıştırması (gzip/brotli) yeterlidir ve Netlify ile Cloudflare bunu kendiliğinden yapar.

## 5. Sonuç tablosu (her yayında doldurulur)

| Sürüm | Tarih | Cihazlar | Kalan maddeler | Lighthouse (P/A/BP/SEO) | Deneyen |
|---|---|---|---|---|---|
| 1.0.0-s26 | | | | | |
