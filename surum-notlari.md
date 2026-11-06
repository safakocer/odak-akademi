# surum-notlari.md — Odak Akademi sürüm notları (S26; yalnız geliştirme, yayına konmaz)

## v1.0.0 (1.0.0-s26) — İlk yayın · Tarih: [yayın günü yazılacak]

Odak Akademi, 5-8. sınıf öğrencileri için okuma, anlama, dikkat, hafıza ve görsel algı çalışmaları sunan bir web uygulamasıdır. Telefona ve bilgisayara uygulama gibi eklenebilir, internet olmadan da çalışır. Veriler yalnız cihazda tutulur.

### Neler var?

**Okuma ve anlama**
- Hızlı Oku: dört okuma modu (rehberli işaretçi, kelime grubu, serbest okuma, RSVP denemesi), dakikada 60-500 kelime, kademeli hız ve “Yavaşlat”, göz dinlendirme hatırlatıcısı.
- Oku ve Anla: beş soru tipi (çoktan seçmeli, doğru/yanlış, boşluk, sıralama, kısa cevap) ve üç katman (bilgi, çıkarım, yorum).
- Etkin Okuma Hızı (EOH): dakikadaki kelime × anlama oranı. Anlama %70'in altındaysa hız artırılmaz.
- Kütüphane: 5-8. sınıf için 48 özgün metin (9 tür, zorluk ve konu etiketleri) ve öğrencinin kendi metinleri ile soruları.
- Okuma Stratejileri: 8 mini ders (tahmin etme, tara-sor-oku, ana fikir, çıkarım, 5N1K, soru üretme, özetleme, tablo-grafik okuma).

**Göz ve görsel algı (12 çalışma)**
Schulte tablosu, Nesne Takibi, Satır Ritmi, Periferik Flaş, Grup Flaşı, Kelime Piramidi, Şekilli Metin, Farkı Bul, Görsel Arama, Simge Anahtarı, Ayna-Döndürme ve 20-20-20 göz molası.

**Dikkat (5 oyun + nefes)**
Hızlı Dokun, Renk mi Kelime mi, Dokun ya da Bekle, Hedef Avı, Gece Nöbeti ve Kutu Nefes. Her oyunda 5 otomatik basamak vardır; öğrencinin kendi rekoruyla karşılaştırma yapılır.

**Hafıza ve öğrenme**
- 5 oyun: Rakam Dizisi, Işıklı Bloklar, n-geri, Kelime Listesi, Eşleştirme.
- Hafıza Teknikleri: 6 ders (hikâye zinciri, mekân yöntemi, akrostiş, görselleştirme, anahtar kelime, gruplama).
- Tekrar Kartları: 5 kutulu aralıklı tekrar, 8 hazır deste, CSV ile dışa ve içe aktarma.

**Plan ve ilerleme**
- Seviye testi: başlangıç ve final, 5 eksenli radar grafiği.
- Akıllı Kurs: 21 günlük kişisel plan, günlük 15/20/30 dk. Anlamaya, yorgunluğa ve kaçırılan günlere göre ayarlanır.
- İlerleme: seri (dinlenme günü hakkıyla), XP ve seviye, rozetler, günlük hedef, grafikler ve rapor.
- Odak Araçları: ortam kontrol listesi, çalışma/mola zamanlayıcısı, öz değerlendirme, haftalık odak günlüğü.
- Çalışma Rehberi: Cornell notu, zihin haritası (PNG), haftalık plan (yazdırılabilir), sınav hazırlığı, sağlıklı alışkanlıklar, aile rehberi.

**Veli ve öğretmen**
PIN korumalı alan: profil raporları, günlük süre önerisi, haftalık hedef, sınıf modu (en çok 6 profil), CSV/JSON dışa aktarım.

**Gizlilik, güvenlik, erişilebilirlik**
- Ad-soyad, e-posta ya da konum alınmaz; yalnız takma ad, sınıf ve avatar. Dışarıya hiçbir istek gitmez.
- Güvenlik politikası (CSP), sunucu güvenlik başlıkları (`_headers`), hata ekranı ve yedek indirme.
- WCAG 2.2 AA hedefi: klavye ile kullanım, ekran okuyucu etiketleri, açık/koyu tema, 4 yazı boyutu, disleksi dostu yazı tipi, “hareketi azalt”, en az 44 px dokunma hedefi.

### Bu sürümde (S26) değişenler
- Service worker: açılış için gereken tüm dosyalar zorunlu listeye alındı (önceden 16 dosya eksikti). Önbellek adına site yolu eklendi; eski sürümler güncellemede silinir.
- Ayarlar > Uygulama'da çalışan sürüm görünür (“Sürüm: 1.0.0-s26”).
- 360 px düzeltmeleri: Egzersizler kart etiketi ve Kurs sayfasındaki “Seviye testini henüz yapmadın” bildirimi artık taşmıyor.
- Netlify ve Cloudflare Pages için `_headers` (güvenlik başlıkları, service worker'ın önbelleklenmemesi) ve GitHub Pages için `.nojekyll` eklendi.
- Tüm JS dosyalarında `innerHTML`/`eval` taraması yapıldı: bulgu yok.
- Ölçüm: Lighthouse mobilde Performance 91-95, Accessibility 100, Best Practices 100, SEO 100. axe ile 27 adreste ihlal yok.

### Bilinen kısıtlar
- Ana sayfadaki “Bugünün Görevi” düğmesi henüz “yakında” uyarısı veriyor (v1.1).
- iPhone/iPad'de Safari, ana ekrana eklenmemiş sitelerin verisini uzun süre kullanılmayınca silebilir. Öğrencilere ana ekrana eklemelerini ve ara sıra Ayarlar > “Yedeği indir”i kullanmalarını önerin.
- Gizlilik metni taslaktır; hukuki inceleme yayından önce yapılmalıdır.
- 5-8. sınıf metinlerinin pedagojik incelemesi (Y5) bekliyor.
- 320 px genişlikte “Çok büyük” yazıyla Kütüphane başlığı birkaç piksel taşıyor (hedef ekran 360 px).
- Veli PIN'i tam güvenlik sağlamaz; ekranda da belirtilir.
- Masaüstü Firefox'ta “Ana ekrana ekle” yoktur. Uygulama tarayıcıda ve çevrimdışı yine çalışır.

## v1.1 geliştirme listesi (10 madde)

1. **Bugünün Görevi:** Ana sayfa kartı kursun bugünkü dersleri, bekleyen tekrar kartları ve seviye testindeki gelişim alanıyla bağlanacak.
2. **Veri koruma:** Kalıcı depolama isteği (navigator.storage.persist) ve haftalık “yedeğini al” hatırlatması. Firefox'ta izin penceresi çıktığı için önce açıklama ekranı gösterilecek. iOS için ana ekrana ekleme önerisi.
3. **Yükleme hızı:** Sayfa CSS'leri (yaklaşık 72 KB) yalnız kendi sayfası açılınca yüklenecek; exercise-frame.js ilk egzersizde yüklenecek.
4. **İçerik:** Y5 pedagojik incelemesinin düzeltmeleri, Kütüphane'ye zorluk süzgeci, sınıfa göre uzunluk süzgeci.
5. **Erişilebilirlik:** Ekran okuyucu turu (TalkBack, VoiceOver, NVDA) bulgularının düzeltilmesi; 320 px ve %200 yakınlaştırmada yeniden akış.
6. **Güvenlik:** `style=` özniteliklerinin sınıflara taşınması ve CSP'den `'unsafe-inline'` kaldırılması.
7. **Rehber bağlantıları:** Cornell notundaki anahtar sorulardan tekrar kartı üretme; haftalık plan bloğunu Odak zamanlayıcısıyla başlatma.
8. **Sınıf modu:** 6'dan fazla profil için IndexedDB'ye geçiş (bir sınıf için 30-35 profil) ve kayıt sınırının gözden geçirilmesi.
9. **Kurulum deneyimi:** Manifest'e ekran görüntüleri ve kısayollar (Kurs, Kütüphane, Tekrar). Güncelleme bandında kısa “Neler yeni?” notu.
10. **Gizlilik sayfası:** Uygulamada seçilen tema ve yazı boyutunu izleme; hukuki incelemeden sonra kesin metin.
