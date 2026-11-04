# PROJE_DEFTERI.md  (en fazla ~1200 kelime. 1, 4, 5, 6. bölümler KALICIDIR: silinmez, yalnızca güncellenir. 2, 3, 7 kısaltılabilir.)

1. PROJE
Ad: Odak Akademi (çalışma adı) | Kitle: 5-8. sınıf
Marka: maskot "Fener" (güler yüzlü deniz feneri) | Renkler: deniz camı yeşili #0e6b63, mercan #ff6f4f, güneş #ffc94d, sis zemin #edf4f3
PROJE: Sürüm: v0.1 (sw.js SURUM: 0.1.03-s04)
ÇALIŞMA KURALI (kalıcı): Oturum promptu gelince Claude önce o oturum için gereken dosyaları listeler (yeni yazılacaklar değil; okunacak/değiştirilecek mevcut dosyalar). Eksik dosya varsa yalnızca listeyi verir ve bekler; hepsi yüklüyse doğrudan işe başlar. Kullanıcı her oturumda PROJE_DEFTERI.md ile listedeki dosyaları yükler.
DOSYA YERİ KURALI (kalıcı): Her cevapta verilen her dosya için proje ana klasörüne göre tam yol (ör. js/engine/modes/rehber.js), yeni mi / üzerine mi yazılacak bilgisi ve silinmesi gereken eski dosyalar bir tabloda yazılır.

2. DURUM
S01 [x] Tasarım sistemi ve uygulama kabuğu
S02a [x] Profiller, karşılama, yedek | S02b [x] Ayarlar sayfası, PWA / çevrimdışı
S03 [x] Ortak Egzersiz Çerçevesi + örnek Hızlı Dokun
D01 [x] Kod denetimi düzeltmeleri (CSS/HTML/sw.js)
D02 [x] JS kod denetimi ve düzeltmeleri (12 bulgu)
S04 [x] Okuma motoru çekirdeği + Hızlı Oku deneme ekranı
S05a [x] Okuma modları 1: mod yapısı + Rehberli işaretçi, Kelime grubu, Serbest okuma (Hızlı Oku’ya bağlı)

3. KARARLAR:
S04: Metin NFC’ye çevrilir; görünmez karakterler silinir; boş satır paragraf sayılır. Grup cümle ve paragraf sınırını aşmaz.
S04: Yalnızca noktalamadan oluşan parça (“–”) kelime sayılmaz.
S04: Gruplama kelime (1-4) ya da karakter (12-20, adım 2, en çok 5 kelime). Varsayılanlar: 2 kelime, 16 karakter.
S04: Grup süresi = ½ kelime + ½ (harf ÷ ortalama harf), cümle sonunda +0,4, paragraf sonunda +0,8 birim. Toplam süre = kelime × 60 ÷ WPM.
S04: Süre yalnızca okurken işler; tek karede en çok 100 ms sayılır; sekme gizliyken saymaz. WPM sınırı 60-500, varsayılan 150.
S04: Okuma ayarları profil ayarlarına değil, okuma:<profilId> anahtarına yazılır.
S04: Çerçeveye hazirlik, hazirlikDenetle, sayacYok, kayitYok, kayitYokMetni seçenekleri eklendi. Tek seviyeli egzersizde seviye adı gösterilmez.
S04: Hızlı Oku (deneme) kaydedilmez; hız, anlama ölçülmeden rekor sayılmaz.
S04: Okuma stilleri exercise.css sonunda (.okuma, .okuma-ayar, .okuma-oyun). Okuma temaları: uygulama, açık, koyu, sepya. Vurgu rengi güneş zemin + koyu yazı.
D01/S04 - SURUM biçimi: 0.1.<sıra>-<oturum> (ör. 0.1.03-s04). Her yayın değişikliğinde sıra 1 artar.
S05a: Modlar js/engine/modes/<ad>.js dosyalarıdır ve adla dinamik yüklenir. Hızlı Oku, modları açılışta yükler (top-level await).
S05a: Duraklat/devam çerçevenin üst çubuğundan yapılır. ctx.aktifMi false iken motor süre saymaz.
S05a: Serbest modda çerçeve duraklatılınca metin gizlenir (CSS :has). Serbest moddaki ilerleme, metin kutusunda ulaşılan en alt noktadır; metin kutuya sığıyorsa “–” gösterilir.
S05a: Rehber modu tek kelimelik gruplar kullanır. İşaretçi yazı rengindedir, şerit güneş %32'dir.
S05a: Kelime grubu modunda kelime gruplaması 2-4 arasıdır.
S05a: Okuma turunda ctx.alan role="region" olur ve içerik kadar uzar (.egz-alan--okuma).
S05a: Hızlı Oku’daki “Ortada tek grup” görünümü kaldırıldı; S05b’de RSVP modu olarak gelecek.
S05a: Serbest okumada 350 kelime/dk üstünde nazik bir “anlamak önce gelir” notu çıkar.
S05a: Hazırlık ayarı olan egzersizlerde sonuç ekranında ve duraklatma panelinde “Ayarları değiştir” düğmesi bulunur.

4. DOSYA HARİTASI:
js/engine/’e reader-engine.js eklendi; js/modules/’e oku/hizli-oku.js eklendi.
Son değişenler (S04): reader-engine.js, exercise-frame.js, oku/hizli-oku.js, katalog.js, css/exercise.css, sw.js.
js/engine/: reader-modes.js
js/engine/modes/: rehber.js, kelime-grubu.js, serbest.js
Son değişenler (S05a): reader-modes.js, modes/*.js, oku/hizli-oku.js, exercise-frame.js, css/exercise.css, sw.js

5. VERİ ŞEMALARI VE ADRESLER:
Okuma ayarları: {wpm (60-500), grupBoyutu, grupTuru: kelime|karakter, yaziBoyutu: kucuk|normal|buyuk|cok-buyuk, satirAraligi: 1.4|1.6|1.8|2, font: uygulama|standart|disleksi, tema: uygulama|acik|koyu|sepya}.
Depolama: yeni anahtar okuma:<profilId>.
Adres: #/egzersiz/hizli-oku.
Mod tanımı: {ad, etiket, aciklama, sira, motor: tempolu|serbest, kontroller[], grupSiniri?, gruplama?(), gorunumOlustur()}. Hızlı Oku ctx.ekstra: {mod, motor, kelime, toplamKelime, wpm, hedefWpm, sureMs, grupSayisi, duraklatma, metin}. Yeni depolama anahtarı yok.

6. DIŞA AÇILAN FONKSİYONLAR:
reader-engine.js: metniHazirla / metniGrupla / kelimeMi / okumaMotoruOlustur / wpmHesapla / wpmDenetle / tahminiSureSn / okumaAyarDenetle / okumaAyarlariniGetir / okumaAyarlariniKaydet / okumaAyarlariniSil / okumaGorunumuUygula / okumaAlaniOlustur; sabitler WPM_SINIR, GRUP_SINIR, OKUMA_SECENEKLERI, VARSAYILAN_OKUMA_AYARLARI.
exercise-frame.js tanımına yeni alanlar eklendi: hazirlik, hazirlikDenetle, sayacYok, kayitYok, kayitYokMetni.
reader-modes.js: modKaydet / modBul / modYukle / modlariYukle / etkinGruplama / modOturumuOlustur / okumaSahnesiKur(ctx, {tanim, metin, ayar, ekstra})
Oturum yöntemleri: baslat, duraklat, devamEt, bitir, iptal, ayarlariUygula, durum, hiz, ilerlemeYuzde, gecenMs, olcum, toplamKelime, ayar; alanlar: kok, tanim
Mod görünüm kancaları: grupDegisti, durumDegisti, ayarUygula, kapat; yardim.ilerlemeBildir

7. AÇIK SORULAR:
profilSil henüz okumaAyarlariniSil çağırmıyor.
Hızlı Oku ana sayfa “Hemen dene”de yok.
storage.oku/yazmaDene anahtarı öneksiz aldığı varsayıldı.
“Disleksi dostu” okuma yazı tipi yalnızca harf ve kelime aralığını açar.
Seçilen okuma modu yalnızca oturum boyunca hatırlanıyor; profile kaydedilsin mi?
S05b’deki ayar paneli, Hızlı Oku’daki “Yazı ve renk ayarları” bölümünü devralacak.