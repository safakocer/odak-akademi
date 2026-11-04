# KARAR_ARSIVI.md  (sınırsız; yalnızca ekleme yapılır. PROJE_DEFTERI.md’den taşınan eski oturum kararları. Her oturumda yüklenmez; Claude gerektiğinde ister.)

Kullanım: Bir karar değiştirilirse eski satır silinmez; altına “→ <oturum>: yeni karar” notu eklenir. Yeni taşınan kararlar en alta, oturum başlığıyla eklenir.

## Oturum geçmişi
S01 [x] Tasarım sistemi ve uygulama kabuğu
S02a [x] Profiller, karşılama, yedek | S02b [x] Ayarlar sayfası, PWA / çevrimdışı
S03 [x] Ortak Egzersiz Çerçevesi + örnek Hızlı Dokun
D01 [x] Kod denetimi düzeltmeleri (CSS/HTML/sw.js) | D02 [x] JS kod denetimi (12 bulgu)
S04 [x] Okuma motoru çekirdeği + Hızlı Oku deneme ekranı
S05a [x] Okuma modları 1: mod yapısı + Rehberli işaretçi, Kelime grubu, Serbest okuma
S05b [x] Okuma modları 2: RSVP denemesi, kademeli hız + Yavaşlat, ayar paneli (canlı önizleme), göz dinlendirme hatırlatıcısı
S05b-d [x] Düzeltmeler: önizlemede satır aralığı, önizleme modun kendi görünümüyle, grup vurgusu, egzersiz başlığına modül ikonu
S06 [x] Anlama ve soru motoru | D03 [x] Gezinme | S07 [x] Kütüphane ve metin bankası | S07-d [x] Düzeltmeler
D04 [x] HTML/CSS/JSON/sw denetimi düzeltmeleri (JS gerektiren 4 madde D05’te kapandı)
D05 [x] JS kod denetimi (engine, modules, core, app) ve 23 bulgunun düzeltmesi
S08 [x] Göz egzersizleri 1: Schulte, Nesne Takibi, Satır Ritmi | S09 [x] Görme alanı ve kelime gruplama: Periferik Flaş, Grup Flaşı, Kelime Piramidi, Şekilli Metin
S10 [x] Görsel algı oyunları: Farkı Bul, Görsel Arama, Simge Anahtarı, Ayna-Döndürme; 20-20-20 göz molası rehberi, Ayarlar’da mola hatırlatıcısı
D06 [x] Faz 02 (S08-S10) kod denetimi: 12 bulgu + kontrast; 10’u düzeltildi (renk maddesi yalnız Kolay için), mola birleştirme ve secenekPaneli dosyası açık soruya bırakıldı
S11a [x] Dikkat oyunları 1: ortak dikkat ölçümü (attention-core.js), Renk mi Kelime mi (Stroop), Dokun ya da Bekle (Go/No-Go)
S11b [x] Dikkat oyunları 2: Hedef Avı (iptal testi), Gece Nöbeti (sürekli dikkat); attention-core’a dikkatBitir, ekBolum, denemeye özel ara
S12 [x] Odak Araçları (#/odak): ortam kontrol listesi, odak zamanlayıcı (çalışma + mola), 1-5 öz değerlendirme, haftalık odak günlüğü, Kutu Nefes
K1 [x] Faz 03 kod denetimi 1. tur (dikkat: S11a-S11b): 12 bulgu, 10’u düzeltildi (Hızlı Dokun istisna, defter maddesi defterde)
K2 [x] Faz 03 kod denetimi 2. tur (odak: S12): 6 düzeltme; iki turun testi birlikte yapılacak
S14a [x] Hafıza oyunları 1: ortak altyapı (memory-core.js), Rakam Dizisi, Işıklı Bloklar (Corsi)
S14b [x] Hafıza oyunları 2: n-geri, Kelime Listesi (data/kelimeler.json), Eşleştirme Kartları
S15 [x] Hafıza Teknikleri Akademisi: ders motoru (lesson-engine.js), 6 ders (data/lessons/), #/teknikler
S16 [x] Tekrar Kartları: aralıklı tekrar motoru (srs.js), hazır desteler, CSV, #/tekrar (v0.2)
S17 [x] Seviye testi: 5 adımlı başlangıç/final testi, radar grafiği, #/testler
S18a [x] Akıllı Kurs kural dosyası (data/course-rules.json) ve tasarım
S18b [x] Akıllı Kurs planlayıcı (course-planner.js), kurs verisi (kurs-veri.js), tests.html

## S04 – Okuma motoru
- Metin NFC; görünmez karakterler silinir; boş satır paragraf. Grup cümle/paragraf sınırını aşmaz. Yalnız noktalama parçası kelime sayılmaz.
- Gruplama kelime (1-4) ya da karakter (12-20, adım 2, en çok 5 kelime); varsayılan 2 kelime / 16 karakter.
- Grup süresi = ½ kelime + ½ (harf ÷ ort. harf), cümle sonu +0,4, paragraf sonu +0,8 birim. Toplam süre = kelime × 60 ÷ WPM.
- Süre yalnızca okurken işler (kare başına en çok 100 ms, sekme gizliyken saymaz). WPM 60-500, varsayılan 150.
- Hızlı Oku (deneme) kaydedilmez; hız, anlama ölçülmeden rekor sayılmaz.
- Okuma temaları: uygulama, açık, koyu, sepya. Vurgu: güneş zemin + koyu yazı.
- D01/S04: SURUM biçimi 0.1.<sıra>-<oturum>. Her yayın değişikliğinde sıra 1 artar.

## S05a – Okuma modları 1
- Modlar js/engine/modes/<ad>.js, adla dinamik yüklenir. Duraklat/devam çerçevenin üst çubuğundan; ctx.aktifMi false iken süre işlemez.
- Serbest modda duraklatınca metin gizlenir; ilerleme = kutuda ulaşılan en alt nokta (sığarsa “–”). 350 k/dk üstünde nazik not.
- Rehber tek kelimelik grup; işaretçi yazı renginde, şerit güneş %32. Kelime grubu 2-4 kelime.
- Hazırlık ayarı olan egzersizde sonuç ve duraklatma panelinde “Ayarları değiştir” var.

## S05b – Okuma modları 2
- RSVP: tek kelime, süre sınırı 180 sn (yalnızca okuma süresi), dolunca tur kendiliğinden biter. Uyarı (“Bu mod anlamayı düşürebilir; ana çalışma değildir.”) hazırlıkta ve okuma ekranında görünür.
- Kademeli hız yalnızca öğrenci açarsa, tempolu modlarda: her 40 kelimede %4 artış, tavan başlangıç ×1,25 (≤500). Artış o tura aittir, kayıtlı hız değişmez. Son anlama %70 altındaysa artış yok. → S06: son anlama sonAnlamaYuzde ile okunuyor.
- “Yavaşlat” her tempolu modda görünür; hızı %4 düşürür ve o turun tavanını bu hıza indirir.
- Ayar paneli Hızlı Oku’daki “Yazı ve renk ayarları”nın yerini aldı; değişiklik (change) olunca profile kaydedilir.
- Göz molası: toplam 20 dk okumada okuma durur, öneri kartı (20 sn uzağa bakma) çıkar; zorunlu değil. Kart açıkken süre işlemez, metin gizlenir. 10 dk ara verilirse sayaç sıfırlanır.

## S05b-d – Düzeltmeler
- Panel önizlemesi seçili modun gorunumOlustur’u ile çizilir (motor çalışmaz); en çok kelimeli grup vurgulanır. data-kaydirma="yok" içindeki vurgu sayfayı kaydırmaz.
- Okuma paragrafının satır aralığı “.egz-ekran p” kuralından korunur.
- Egzersiz başlığının solunda ikon: tanim.ikon, yoksa modülün ana sayfa ikonu (oku→kitap, dikkat→hedef …), modül renkleriyle. → D03: Hızlı Dokun’a ikon: 'isik' verildi.

## Kapanan açık sorular
- storage.oku/yazmaDene anahtarı öneksiz alır (storage.js “odak:” ekler) – S06’da doğrulandı.
- Hızlı Oku ana sayfa “Hemen dene”de yok → D03: “Hemen dene” kaldırıldı, egzersizler alan sayfalarında.
- Hızlı Dokun başlık ikonu → D03: ikon 'isik'.

## S06 ve D03 (S07’de 3. bölümden taşındı)
S06: Soru puanı 0-1; sıralamada tek yer değişikliği ve kısa cevapta “kısmen” 0,5. Anlama % = toplam puan ÷ soru sayısı × 100. EOH = WPM × anlama ÷ 100; WPM yalnız okuma süresinden.
S06: Boşluk cevabı tr-TR küçük harfe çevrilip şapka, noktalama ve fazla boşluk yok sayılarak karşılaştırılır. Kısa cevap öz-değerlendirmeyle puanlanır (örnekle karşılaştır, 3 seçenek).
S06: Sorularda metin varsayılan görünmez; öğrenci açarsa sonuçta ve kayıtta belirtilir. Doğru cevap hemen, açıklama gözden geçirmede. Geri bildirim: 6 doğru, 12 yanlış, 4 kısmen cümlesi; art arda aynısı gelmez.
S06: Katman %70+ “güçlü yön”, altı “geliştirilecek yön” (strateji ipucuyla). Anlama %70 altında “Bir sonraki hedef: hızı artırma, anlamayı güçlendir” kutusu. Kademeli hız son oku anlamasına (sonAnlamaYuzde) bakar.
S06: Oku ve Anla’da RSVP yok. Ayrıntılı cevaplar yalnız bellekte; kayda özet yazılır.
D03: Ana sayfadaki “Hızlı Oku” alan kartı “Okuma” oldu. Kurs, Testler, Rehber, İlerleme hâlâ “yakında” (Kütüphane S07’de açıldı).

## D03 ve S07 (D04’te 3. bölümden taşındı)
D03: Gezinme üç basamaklı: ana sayfa alan kartı (#/modul/<ad>) → alan sayfası → egzersiz kartı (#/egzersiz/<ad>). #/egzersizler tüm egzersizleri alanlara göre listeler.
D03: Kart bilgileri ve alan listesi yalnız katalog.js’te; yeni egzersiz = dosya + katalogda bir satır.
D03: Egzersiz kapanınca gelinen sayfaya dönülür (geri adımıyla); adres doğrudan açıldıysa egzersizin alan sayfasına gidilir.
S07: Metinler data/texts/sinif<N>.json; kelime sayısı JSON’da yok, yüklemede okuma motoru kuralıyla sayılır (yalnız noktalama kelime değil). Banka bir kez yüklenir; dosya yüklenemezse uyarı çıkar, kendi metinleri yine çalışır.
S07: Türler: hikaye, masal (masal ve fabl), bilgilendirici, fen; kendi metinlerin türü “kendi”. Uzunluk: kısa <180, orta 180-259, uzun ≥260 kelime.
S07: Seviye göstergesi 4 nokta (5-8. sınıf) + öğrencinin sınıfına göre etiket: Daha kolay / Sınıfına uygun / Biraz zorlayıcı / Zorlayıcı.
S07: “Okundu”: metin sonuna kadar okununca (Hızlı Oku dahil) işaretlenir; Oku ve Anla son ve en iyi anlama yüzdesini de yazar.
S07: Kendi metni: en az 20 kelime, en çok 12.000 karakter, profil başına en çok 30 metin, en çok 5 öz-soru. Sorusuz metin yalnız Hızlı Oku’da, sorulu metin Oku ve Anla’da da okunur.
S07: Metin seçici egzersizin hazırlık formunda; içinde pencere açılmaz (çerçevenin odak tuzağı). Yeni metin Kütüphane’den eklenir. Hızlı Oku’daki sabit metinler ve yapıştırma alanı kaldırıldı.
S07: Kütüphaneden okuma: secimAyarla(egzersiz, kimlik) + yönlendirme; seçim sayfa açıkken hatırlanır, profil değişince silinir.
S07: Motor çoktan seçmeli seçenekleri karıştırmadığı için doğru seçeneğin yeri metinlerde elle dağıtıldı. → D04: dağıtım A/B/C/D 4’er olarak dengelendi; çeldiriciler doğru seçenekle aynı uzunlukta.
S07: Kendi metni penceresi arka plana tıklayınca kapanmaz; kaydedilmemiş yazı varsa Esc/Vazgeç onay ister.

## Kapanan açık sorular (D04)
- “Disleksi dostu okuma yazı tipi yalnızca harf ve kelime aralığını açar.” → D04: okuma alanında data-font="disleksi" artık --font-disleksi yazı tipini de uygular.

## S07-d (D05’te 3. bölümden taşındı)
S07-d: Öz-soru türleri: çoktan seçmeli (2-4 seçenek), doğru/yanlış, boşluk (tek ___; cevaplar / ile ayrılır), sıralama (2-5 öğe), açık uçlu (örnek cevap, öz-değerlendirme). Tip bilgisi olmayan eski öz-sorular açık uçlu sayılır.
S07-d: Metin seçici kendi sınıflarını kullanır (.metin-secenek); kaydırma dış kutudadır. Sayfa çizerken false öğeler replaceChildren’a verilmez.

## Kapanan açık sorular (D05)
- D04 (a) Boşlukta “235” = “23,5” sayılıyordu → D05: rakam arasındaki virgül/nokta korunuyor.
- D04 (b) PWA çevrimdışı durumu → D05: kurulum başarısızsa “hazırlanamadı” gösteriliyor (kurulumHatasi).
- D04 (c) theme-color iki meta → D05: tema seçilince iki meta da güncelleniyor.
- D04 (d) Profil düğmesi etiketi → D05: “Profiller: <takma ad>”.
- profilSil okumaAyarlariniSil çağırmıyordu → D05: profilSil, profile ait tüm <ad>:<profilId> anahtarlarını siliyor.
- D04: “Boşluk cevaplarına Türkçe harfsiz yazım da eklenir.” → D05: karşılaştırma harfleri kendisi harfsize çeviriyor; verideki ek yazımlar zararsız, yenilerine gerek yok.

## D04 ve D05 (S09’da 3. bölümden taşındı)
D04: Soru renkleri: doğru basari, yanlış vurgu-metin (kesik kenar), kısmen uyari; katman: bilgi birincil, çıkarım vurgu-metin, yorum uyarı.
D04: color-mix() kullanan her kuralın önünde düz renk yedeği; :has() içeren seçici ayrı kurala yazılır.
D04: Okuma yazı tipi: uygulama = genel ayar, standart = sistem yığını, disleksi = --font-disleksi; yazı boyutu dar ekranda vw ile sınırlı.
D04: Çoktan seçmeli çeldiriciler doğru seçenekle yaklaşık aynı uzunlukta; doğru seçeneğin yeri A-D’ye eşit dağıtılır (4/4/4/4).
D04: “Yakında” öğeleri: aria-disabled="true" + ekran okuyucuya “(yakında)”.
D04: sw.js: ZORUNLU kabuk addAll ile, diğerleri tek tek. Geliştirme modu: localhost, *.local, özel ağ adresleri.
D05: Boşluk karşılaştırması: tr-TR küçük harf, Türkçe harfler harfsiz (ı→i, ş→s …), noktalamasız; rakam arasındaki virgül/nokta korunur (2.5 = 2,5 ≠ 25).
D05: PROFIL_DEGISTI yalnız etkin profil değişince yayılır; ad, sınıf, avatar ya da ayar değişince PROFIL_GUNCELLENDI {profil, ayarMi}.
D05: Toast ve duyuru alanları açık <dialog> içine taşınır (acikPencereyeTasi); hata toast’ı en az 12 sn. Okurken hız metni canlı değil; yalnız “Yavaşlat” duyurulur.
D05: Kayıt ekstrası sadeleştirilir: boş değer, üst düzey tekrar, dizi ve uzun metin yazılmaz; sayılar 1 basamak, en çok 2 düzey.
D05: “Sonuçları sil”: kayıtlar, seviye seçimleri ve kütüphanedeki okundu/anlama bilgisi silinir; profil, kendi metinler ve favoriler kalır.
D05: Okuma ayarı kaydedilemezse uyarı çıkar (ayar oturumda geçerli). Başka sekmede açıksa uyarı verilir.
D05: theme-color: tema seçildiyse iki meta da o renk, “sistem”de kendi renkleri. PWA kurulamazsa “hazırlanamadı” yazar.
D05: Profil düğmesi etiketi “Profiller: <takma ad>”; profil formu açıkken arka plan tıklaması kapatmaz.

## S08 tam metin (S09’da defterde kısaltıldı; defterdeki özet geçerli, ayrıntı burada)
S08: Göz egzersizlerinde tıbbi iddia yok; “baş sabit, gözler izler” ve “rahatsız hissedersen duraklat” yönergesi.
S08: Schulte: seviye = tablo boyutu (3×3-7×7, zorluk 1-5); çeldirici (sade|renkli|sessiz) hazırlıkta seçilir; puan = sayı/dakika, her hata süreye +2 sn. Bulunmuş sayıya dokunmak hata sayılmaz.
S08: Nesne Takibi: seviye = hız (Yavaş|Orta|Hızlı); yol (yatay|dikey|sekiz|zigzag) ve süre (1-3 dk) hazırlıkta; her 60 sn hareketten sonra 15 sn mola (geçilebilir). Dikkat denetimi: nokta ara sıra sarı kareye döner; puan = yakalanan / (yakalanan + boşa + kaçan) %. Hareketi azalt açıkken nokta 0,5 sn’lik adımlarla ilerler.
S08: Satır Ritmi: 3 sayfa; her satırdan önce satır geçişi adımı; dikkat denetimi yıldız sayımı (0-3); puan = doğru sayım %. Ritim sesi isteğe bağlı (vars. kapalı).
S08: Hazırlık seçimleri exercise-frame.js hazirlikSecimi() ile; egzersize özel seçimler yalnız oturum boyunca hatırlanır. Dizi karıştırma tek yerde: utils.js karistir().

## S08 özeti (S10’da 3. bölümden taşındı; ayrıntı yukarıdaki “S08 tam metin”de)
S08: Göz egzersizlerinde tıbbi iddia yok; “baş sabit, gözler izler”, “rahatsız hissedersen duraklat”. Hazırlık seçimleri hazirlikSecimi() ile, yalnız oturumluk. Karıştırma: utils.js karistir(). → S10: tıbbi iddia ilkesi “Süregelen ilkeler”e taşındı.
S08: Schulte seviye = 3×3-7×7, puan = sayı/dk (hata +2 sn). Nesne Takibi seviye = hız, 60 sn’de 15 sn mola, puan = yakalanan %. Satır Ritmi 3 sayfa, yıldız sayımı %.

## S09 tam metin (S10’da defterde kısaltıldı; defterdeki özet geçerli, ayrıntı burada)
S09: Flaş yalnız flas.js flasGoster() ile (rAF karesinde göster/gizle, gercekMs ölçülür, 150 ms maske); duraklatılan deneme sayılmaz.
S09: Süre merdiveni: ilk hataya dek her doğruda, sonra 2 doğruda kısalır, yanlışta uzar (adım 50/25 ms); eşik = son denemelerin ortalaması; tur son eşik + 50 ms’den başlar. Hız puanı = 1000 − eşik.
S09: Otomatik seviye çerçevede (otomatikSeviye: isabet ≥%80 +1, <%50 −1; sonrakiSeviye ezer). Merdivenlilerde: eşik ≤ alt sınır+50 ve isabet ≥%70 → +1; eşik üstte ve <%50 → −1.
S09: Seviyeler: Periferik Flaş uzaklık/yön/uzunluk (400→100 ms); Grup Flaşı 2/3/4 kelime; Piramit satır sayısı + süre (1500/1100/750 ms); Şekilli Metin genişlik 16/24/32 karakter, ilk 120-180 kelime, kelime yoklaması, puan = WPM × isabet ÷ 100 (anlama sayılmaz).
S09: Kelime/grup havuzu metin bankasından (özel ad yok, gruplar noktalamasız, küçük harf), yoksa yedek metin. Yazı boyu --ch ile kapsayıcıya sığdırılır.
S09: Sayaç etiketleri “Doğru …/Yanlış …”; “Farklı” kullanılmaz (piramitte yanıt seçeneğiyle karışıyordu). Sonuç durumu (seçenek, yazı kutusu, sonuç satırı): doğru yeşil, yanlış mercan + kesik kenar, ✓/✗ işareti, kısa animasyon (hareketi azaltta yok).

## S10 tam metin (defterde özet var)
S10: Şekil, renk ve SVG yalnız algi.js’ten: 12 şekil (daire, kare, üçgen, elmas, yıldız, artı, altıgen, kalp, hilal, ok, damla, L), 6 renk belirteci (birincil, vurgu, güneş, bilgi, modul-goz-ikon, modul-kutuphane-ikon); dolgu style ile var(--…), çizgi .algi-sekil. Oyun içeriği her açılışta rastgele üretilir.
S10: Farkı Bul: 3 resim çifti (6×4 hücreye yerleşim, üst üste binmez); Kolay 9 nesne 3-4 fark, Orta 13 nesne 4-6 fark (+döndürme), Zor 17 nesne 6-8 fark (+kayma); eksik nesne bazen solda bazen sağda. İpucu sınırsız (B resminde kesik halka). Puan = fark/dk (boş dokunuş +2, ipucu +5 sn). Seviye: isabet ≥%80 ve ≤1 ipucu +1; <%50 ya da ipucu > farkların yarısı −1. Klavye: B resminde noktalar (nesne yerleri + 3 boş hücre), oklarla gezinme, Enter.
S10: Görsel Arama: 12 deneme; Kolay 12 öğe tek tip çeldirici, Orta 20 aynı renk başka şekil, Zor 30 karışık (aynı renk ya da aynı şekil), Çok zor 42 + döndürme. Puan = bulunan/dk (+2 sn). Düğme etiketi renk + şekil adı.
S10: Simge Anahtarı: 60 sn (açıkça zamanlı), tek renk simgeler; 4/6/8 simge, Çok zor’da 8 doğruda bir anahtar sayıları değişir. Puan = doğru − yanlış (tahmini kazandırmaz). Sayı tuşları; seçenek paneli flas.js secenekPaneli.
S10: Ayna-Döndürme: 12 deneme, yarısı ayna (karışık); her denemede kiral (aynası hiçbir döndürmeyle kendine benzemeyen) 5-6 karelik şekil; açılar Kolay 0/90/270 (+işaretli kare), Orta 90/180/270, Zor 45° adımlar. Puan = doğru/dk (yanlış +3 sn). Tuşlar 1/← aynısı, 2/→ ayna. Yanlışta açıklayıcı geri bildirim.
S10: Mola hatırlatıcısı: profil ayarı molaRehberi (vars. açık), kök data-mola="kapali"; kapalıyken çerçeve mola önerisi ve okuma göz molası çıkmaz (okumada ayrıca okuma ayarı gozMolasi gerekir). “Görünümü ilk hâline döndür” bu ayarı değiştirmez. Çerçeve mola önerisinde “Ayarlar’dan kapatabilirsin” notu.
S10: 20-20-20 rehberi (egzersiz goz-molasi): 1-3 tur × (6 sn uzakta nokta seç, 20 sn uzağa bak + ses, 8 sn göz kırp ve omuz gevşet); geçilebilir adımlar, duraklatılabilir; kaydedilmez; molaMi ile çerçevenin aralıksız çalışma sayacı ve okuma göz molası sayacı (gozMolasiVerildi) sıfırlanır. Ana sayfada “Kısa bir mola” kartları ve Ayarlar’da bağlantı. Dil: “tedavi değildir; kısa mola ve uzağa bakma önerisi”.

## S09 özeti (D06’da 3. bölümden taşındı; ayrıntı yukarıdaki “S09 tam metin”de)
S09: Flaş yalnız flasGoster() ile (rAF, gercekMs ölçülür, 150 ms maske); duraklatılan deneme sayılmaz.
S09: Süre merdiveni: ilk hataya dek her doğruda, sonra 2 doğruda kısalır, yanlışta uzar (50/25 ms); eşik = son denemelerin ortalaması; tur son eşik + 50 ms’den başlar. Hız puanı = 1000 − eşik.
S09: Otomatik seviye çerçevede (isabet ≥%80 +1, <%50 −1; sonrakiSeviye ezer). Merdivenlilerde: eşik ≤ alt sınır+50 ve isabet ≥%70 → +1; eşik üstte ve <%50 → −1.
S09: Şekilli Metin puanı = WPM × isabet ÷ 100. Kelime havuzu metin bankasından, yoksa yedek metin. → D06: gruplarda ve yoklamada küçük harfe çevrilmiş özel ad yok.
S09: Sayaç etiketleri “Doğru …/Yanlış …”. Sonuç durumu: doğru yeşil, yanlış mercan + kesik kenar, ✓/✗ işareti, kısa animasyon (hareketi azaltta yok).
S10 (defterde kısaltıldı): Görsel Arama 12-42 öğe; Simge Anahtarı 4-8 simge; Ayna-Döndürme yarısı ayna. Mola hatırlatıcısı kapalıyken çerçeve ve okuma mola önerisi çıkmaz; “Görünümü ilk hâline döndür” değiştirmez.

## D06 tam metin (Faz 02 kod denetimi)
D06: Kelime Piramidi: satır yazısı --fs-xs altına inmez; kutu genişliği bu boyla hesaplanır, yan kelimeler en az 3 harf sığmıyorsa satır sayısı azalır (en az 2), kelime uzunluğu satıra göre sınırlanır. Kayıttaki satir gerçek satır sayısıdır.
D06: Kelime/grup havuzu (flas.js): büyük harfle başlayan kelime gruba girmez ve zinciri keser. Şekilli Metin yoklamasında yalnız metinde küçük harfle geçen kelimeler sorulur.
D06: Görsel Arama: sütun = ekran genişliğine sığan 44 px hücre sayısı (en az 3, en çok seviyenin sütunu); geri bildirim satırı aria-live. Grup Flaşı yazarak yanıt sonucu duyur() ile okunur (gizli kutudaki canlı bölge güvenilir değil).
D06: Farkı Bul: Kolay türleri yok/şekil/boyut (yalnız renk farkı yok); dönünce değişmeyen şekilde “don” yerine şekil farkı. Dikey telefonda resim genişliği iki resmin ekrana sığacağı kadar (en az 16rem); yatay ekranda (≥560 px) yan yana. İpucu halkası --renk-uyari.
D06: Ayna-Döndürme kısayolları yalnız 1/2 (oklar seçenekler arasında gezinirken kazara yanıt veriyordu).
D06: Kontrast: sarı dolgulu işaretlerin kenarı (Nesne Takibi işareti, Satır Ritmi yıldızı, göz molası ilerlemesi) --renk-uyari; --renk-gunes-golge açık zeminde 2,7:1 kalıyordu.
D06: Ortak yardımcılar: utils.dakikaPuani (Schulte, Farkı Bul, Görsel Arama, Ayna), algi.yuvarla, flas.kenarTemizle. kayitYok egzersiz sonSeviyeKaydet çağırmaz.
D06: Ana sayfa “Kısa bir mola” yalnız 20-20-20 rehberi (Farkı Bul ekran oyunu, mola değil); açıklama katalogla aynı.

## Kapanan açık sorular (D06)
- “Farkı Bul’da yalnız renk farkı Kolay’da kapatılsın mı?” → D06: kapatıldı. Orta/Zor için renk seçimi yeni açık soru.
- “Göz molası ile çerçeve molası birleşsin mi?” → D06: soru “üç mola ekranı birleşsin mi?” olarak genişletildi (okuma kartı da dahil).

## S10 kararları (S11a’da 3. bölümden taşındı)
S10: Şekil, renk, SVG yalnız algi.js’ten (dolgu style ile var(--…)). Oyun içeriği her açılışta rastgele üretilir.
S10: Farkı Bul: 3 resim çifti, fark sayısı seviye aralığından rastgele (3-4/4-6/6-8); ipucu sınırsız; puan = fark/dk (boş dokunuş +2, ipucu +5 sn); seviye: isabet ≥%80 ve ≤1 ipucu +1, <%50 ya da çok ipucu −1. → D06: Kolay’da yalnız renk farkı yok.
S10: Görsel Arama 12 deneme, puan = bulunan/dk. Simge Anahtarı 60 sn, puan = doğru − yanlış. Ayna 12 deneme, puan = doğru/dk. Üçü otomatikSeviye.
S10: Mola hatırlatıcısı = profil ayarı molaRehberi (vars. açık); kapalıyken mola önerisi çıkmaz; sıfırlama değiştirmez. 20-20-20 rehberi (goz-molasi): 1-3 tur, kaydedilmez, molaMi ile sayaçları sıfırlar. Dil: “tedavi değildir; kısa mola ve uzağa bakma önerisi”.

## D06 özeti (S11b’de 3. bölümden taşındı; ayrıntı yukarıdaki “D06 tam metin”de)
D06: Piramit satırı ve Görsel Arama sütunu ekrana uyar; Farkı Bul dikey telefonda iki resim birlikte sığar. Ayna kısayolu yalnız 1/2. Sarı kenarlar --renk-uyari. “Kısa bir mola”da yalnız 20-20-20. kayitYok seviye yazmaz.

## S11a tam metin (S11b’de defterde kısaltıldı; defterdeki özet geçerli, ayrıntı burada)
S11a: Dikkat oyunu = tek dosya (attention-core) + katalog/sw satırı. 5 basamak (Isınma…Usta), otomatik: doğruluk ≥%85 ve ön tepki ≤%10 → +1, <%60 → −1.
S11a: Tepki süresi: t0 = uyaranın rAF karesi (performance.now), yanıt = event.timeStamp (pointerdown/keydown). <150 ms ya da uyaransız dokunuş = ön tepki (hata). Duraklatılan deneme yinelenir.
S11a: Doğruluk = doğru ÷ tüm kayıtlar; süreler yalnız doğru tepkilerden; tutarlılık = 100 − CV (≥4 tepki). Dikkat puanı = doğruluk × 60000 ÷ ort. ms. Rekor tablosu: doğruluk, ort. tepki, tutarlılık (son ikisi doğruluk ≥%70 ise).
S11a: Stroop 24 deneme, kırmızı-mavi-sarı → +yeşil, uyumsuz %25→%60; düğmede renksiz ad + sabit konum; şekil ipucu oturumluk (vars. kapalı, düğmede renksiz şekil). Go/No-Go 40 deneme, hedef yıldız, oran %60→%80, kural yalnız şekil; hata geri bildirimi ince kesik kenar.

## S11b tam metin (defterde özet var)
S11b: attention-core eklemeleri (eski davranış aynı): KESINTI_MS dışa açık; dikkatBitir(ctx, kayitlar, {kesinti, bitince}) turu kapatır (dikkatTuru da kullanır); plan öğesi araMs verirse ara odur, yoksa araMs aralığından rastgele; dikkatOyunu ekBolum(ekstra) → Node alır, rekor bölümünün önüne eklenir.
S11b: Doğruluk her dikkat oyununda doğru ÷ tüm kayıtlar; kayıtlar = hedefler + hatalı dokunuşlar (çeldiriciye doğru bekleme yalnız Go/No-Go’da deneme sayılır).
S11b: Hedef Avı (iptal-testi): satır 12 sembol (dar ekranda 6+6, ≥720 px’te 12 sütun), hedef satır başına 3-5; basamaklar: yıldız / yıldız + benzer şekiller / yıldız ve kalp / sağa bakan ok / sağa ok ve yukarı üçgen; satır 6-8, süre 20→14 sn, “Satırı bitirdim” ile erken geçilir. İşaret geri alınır; satır sonunda kaçan sarı kesik, fazladan işaret kesik çizgi. Renk hepsinde aynı, kural şekil/yön.
S11b: Hedef Avı ölçümü: her hedef bir deneme (bulundu → doğru, bulunmadı → atlandı), her fazladan işaret ayrı yanlış kaydı. Tepki = iki işaret arası süre (ilki satırın rAF karesinden, event.timeStamp); arada duraklatma olduysa süre ölçüme girmez. Puan açıklaması: doğruluk × dakikada işaretlenen hedef.
S11b: Gece Nöbeti (surekli-dikkat): ortada şekil akışı, hedef hilal; 12/12/14/14/16 hilal, akış 1200→900 ms, görünme 800→500 ms, pencere 1600→1200 ms; çeldiriciler üst basamakta hilale benzer (daire, damla). Süre 2,0-2,85 dk (benzetim).
S11b: Gece Nöbeti zamanlaması: ara = adım × akış süresi; adımlar her yarıda tabakalı rastgele (ör. 3-12) ve ayrı karıştırılır; hilal akışın sıradaki karesinde gelir (ritim ipucu yok). Çeldiriciye dokunuş ön tepki kaydı olur ve o yarıya sayılır.
S11b: Odak sürekliliği: ilk/son yarı ozetle() ile ayrı; fark ≥+10 “iyileşti”, >−10 “korudun”, >−30 “biraz düştü, olağan”, aksi “dağıldı, kısa mola iyi gelebilir”. Tepki farkı ±30 ms altında “benzer”. Sonuçta 20-20-20 önerisi (molaRehberi açıksa).
S11b: Kart ikonları mevcut sprite’tan (satirlar, yorunge); index.html ve exercise.css değişmedi, oyun stilleri tanim.stil’de.

S11a: dikkatOyunu() + 5 basamak (≥%85 ve ön tepki ≤%10 → +1, <%60 → −1); t0 = rAF karesi, yanıt = event.timeStamp, <150 ms ön tepki. Doğruluk = doğru ÷ tüm kayıtlar; süre ve tutarlılık (100 − CV) yalnızca doğrulardan; puan = doğruluk × 60000 ÷ ort. ms.
Süregelen ilkelerden taşınanlar: RSVP yalnızca uyarılı deneme; mola sayaçları profil değişince sıfırlanır; sabit renk istisnaları (okuma temaları, vurgu şeridi, theme-color); gösterilen kelimede küçük harfe çevrilmiş özel ad olmaz; gezinme üç basamaklıdır.
Taşınan açık sorular: Mola ekranları birleşsin mi? Oturumluk seçimler profile mi? Anlama rekoru yalnız ilk okumadan mı? secenekPaneli ayrı dosyaya mı? Hedef Avı’nda “Ön tepki” gizlensin mi? Gece Nöbeti’nde iki hata satırı birleşsin mi? Dikkat ikonları?

## S11b özeti (K2’de 3. bölümden taşındı; ayrıntı yukarıdaki “S11b tam metin”de)
S11b: Kayıt = hedef + hatalı dokunuş; döngüsüz oyun dikkatBitir() ile biter; Gece Nöbeti süreklilik = son − ilk yarı doğruluğu.

## K1 tam metin (Faz 03 denetimi, dikkat; defterde özet var)
K1: Kesinti denetimi (duvar saati − oyun saati > KESINTI_MS) yanıt anında ve pencere dolduğunda yapılır; kesintili deneme yanıtsız da olsa yinelenir (yinele yalnız uyaran aşamasında).
→ K1 (S11a “Duraklatılan deneme yinelenir”): artık yanıt gelmese de yinelenir; önceden yanıtsız deneme “atlandı” ya da “doğru (bekledi)” sayılıyordu.
K1: dikkatSahnesi, alanda basılı tutulan Enter/Boşluk tekrarını yakalama evresinde engeller (odaktaki düğmenin tekrar click’i de durur). Tüm dikkat oyunlarında geçerli.
K1: Tek tuşlu oyunlar (Go/No-Go, Gece Nöbeti) dokunuşu dokunusBagla(ctx, sahne, tur) ile yalnız sahnede alır; sahneye .dikkat-sahne--dokun (touch-action: none) eklenir. Alanın geri kalanı kaydırılabilir, kaydırma yanıt sayılmaz. Yönergelerde “ortadaki kutuya dokun”.
K1: dikkatTuru araSonucu seçeneği (vars. 'on-tepki'): ara sırasındaki dokunuşun sonucu. Gece Nöbeti 'yanlis' kullanır (erken: true kalır, yanlisDokunma bunu sayar).
→ K1 (S11b “Çeldiriciye dokunuş ön tepki kaydı olur”): artık “yanlış” kaydı; ön tepki eşiği ve mesajı yanlış alarmı cezalandırmaz.
K1: Rekor: dikkat rekor tablosuna ilk satır olarak “Dikkat puanı” eklendi (doğruluk eşiğine bağlı değil; puan doğruluğu zaten içerir). dikkatDegerlendir yeniRekor (puan satırı) döndürür; çerçeve rekorBolumuVar olan tanımda başlık/rozet kararını buradan alır, kendi rekor cümlesini yazmaz.
K1: rekorAyrimi (dikkatOyunu tanımı): rekorlar ekstra[alan] aynı olan turlarla karşılaştırılır. Stroop: 'ipucu' (kayıtta ipucu yalnız true iken bulunur; yoksa ipucusuz sayılır). Otomatik basamak ayrılmadı (açık soru).
K1: Çerçeve tanım alanı sureNotu: sureSn yoksa açıklama ekranındaki “Süre sınırı yok” yerine yazılır (Hedef Avı satır süresi, Gece Nöbeti 2-3 dk).
K1: Hedef Avı satır sonunda hücre etiketlerine sonuç eklenir (doğru işaret / kaçan hedef / fazladan işaret).
K1: Go/No-Go renk adı algi.js RENKLER’de yoksa konsola uyarı (sessiz yedek renk yok).
K1: Temizlik: dikkatTuru kayitlar() kaldırıldı; .flas-alan/.algi-alan/.dikkat-alan ortak tek kural; .egz-aciklama fieldset min-inline-size: 0. Metin: “Doğruluk %70 ve üstü olunca rekora sayılır”.
K1: Hızlı Dokun eski biçimde kalır (3 seviye, dikkatOyunu ve otomatik basamak yok, puan = doğru − yanlış, ekstra {kacan}); istisna olarak bilinçli bırakıldı.

## K2 tam metin (Faz 03 denetimi, odak; defterde özet var)
K2: Zamanlayıcı bitişini yalnız depodaki zamanlayıcısı (tur + bitiş) bellektekiyle eşleşen sekme işler: blok tek kez günlüğe girer, zil tek kez çalar; öteki sekme yalnız bildirim gösterir.
K2: Bitişte toast (role=status canlı bölge) yeterli; ayrıca duyur() çağrılmaz (çift okuma olmasın). “Son 1 dakika” ve başlat/duraklat duyuruları kalır.
K2: Odak sayfası tik olayında depoyu okumaz; veri yalnız durum, bitiş, ayar değişikliği ve kayıtta yeniden okunur.
K2: Bitişte ya da erken bitirmede odaktaki düğme gizlenirse odak sırasıyla değerlendirme başlığına, “Çalışmaya başla”ya ya da halkaya taşınır; “Kaydet ve molaya geç” sonrası odak “Duraklat”ta.
K2: odak-veri zamanlayici.bitis/kalanMs için null “yok” sayılır (duraklatılmış zamanlayıcı yenilemede bitmiş görünmesin).
K2: Ana sayfa “Ders çalışırken” kartları (#kisayol-kartlari) app.js’te katalog.js’ten egzersizKarti ile çizilir; index.html’de kart metni yok.
K2: Yüzen gösterge (.odak-cip) değişkenlerine yedek değer: --ust-cubuk-y (4rem), --gorev-zemin/--gorev-metin (birincil/yüzey).
K2: sw.js SURUM 0.1.23-k1 (K1) → 0.1.24-k2.

## Kapanan açık sorular (K1-K2)
“Rekor seçeneğe göre ayrılsın mı?” → K1: evet, rekorAyrimi ile (Stroop ipucu). Otomatik basamak ayrımı açık soru olarak kaldı.
“Gece Nöbeti’nde iki hata satırı birleşsin mi?” → K1: birleşmedi; çeldirici dokunuşu artık ön tepki değil “yanlış”, bu yüzden satırlar ayrı anlam taşıyor.

## S12 ve K1 (S14a’da 3. bölümden taşındı)

S12: Odak Araçları ayrı sayfa (#/odak), kartları ARACLAR’da. Bitiş anı depoda; >2 dk geç bitişte zil yok; zil ayrı seçim. Bloklar kayitlar’a girmez; erken biten ≥1 dk ise günlüğe; puansız kayıt serbest; kontrol listesi günlük.
K1: Kesintili deneme yinelenir; basılı tuş tekrarı engellenir; tek tuşlu oyunda dokunuş yalnız sahnede. Dikkat rekoru sonuç bölümünde, Stroop’ta ipucuna göre ayrı. Gece Nöbeti’nde çeldirici dokunuşu “yanlış”. Hızlı Dokun eski biçim (istisna).

## K2 ve S14a (S15’te 3. bölümden taşındı)
K2: Bitişi depodaki zamanlayıcıyla eşleşen sekme işler; toast varken duyur yok; tikte depo okunmaz; ana sayfa kısayolları katalog.js’ten.
S14a: Hafıza seviyesi = tempo; uzunluk merdivenle (doğru +1, 2 ardışık yanlış −1). Puan en iyi dizi; rekor egzersiz + seviye + yön.

## S14b tam metin (S15’te defterde kısaltıldı; defterdeki özet geçerli)
S14b: Deneme = blok/liste/tahta. n-geri: n 1-2, blok 12 yanıt, ≥%80 → +1, tur 1-geriyle başlar. Kelime: tam = tüm kelimeler, sıra ayrı. Eşleştirme: seviye = benzerlik + çift aralığı; hedef ≤ 2×çift hamle.

## S15 tam metin (Hafıza Teknikleri Akademisi; defterde özet var)
S15: Ders akışı: ön deneme (tekniksiz) → 1 Anlat → 2 Birlikte yap → 3 Kendin dene → 4 Ölç. Ön deneme, istenen 4 adıma karşılaştırma için eklendi; adım göstergesinde 5 öğe görünür.
S15: Ders içeriği data/lessons/<ad>.json; tam şema lesson-engine.js başındaki yorumda. Ders sırası DERS_ADLARI (hikaye-zinciri, mekan-yontemi, akrostis-kisaltma, gorsellestirme, anahtar-kelime, gruplama). Yeni ders = JSON + DERS_ADLARI + sw.js satırı. Geçersiz JSON listede görünmez, konsola hata yazar.
S15: Ölçüm türleri: liste (serbest yazım; boşluk, virgül, satırla bölünür) ve esler (ipucu verilir, cevap yazılır; sıra karıştırılır). Önce ve sonra listeleri eşit uzunlukta, ikisinde de aynı ara (araSn, geriye sayma görevi). Ön denemede çalışma süresi kesin (calismaSn), Kendin dene’de süre yalnız önerilir (onerilenSn); süre kaydın ekstra.kendinSn alanında.
S15: Eşleşme: tr-TR küçük harf, şapka ve noktalama yok sayılır; ekli yazım kabul (hedef ≥3 harf, en çok 4 harf ek; ≥4 harfte ünsüz yumuşaması gibi tek harf farkı). 5+ harfli kelimede tek harflik yazım hatası kabul, ama sondan kesik yazım sayılmaz (“kova” ≠ “kovan”). Önce tam, sonra hoşgörülü eşleşme; her hedef bir kez sayılır. Eşlerde boşluk yok sayılır (“baş parmak” = “başparmak”).
S15: Sıra puanı (siraOnemli) = girilen sıradaki hedef numaralarının en uzun artan alt dizisi; yalnız bilgi olarak gösterilir, karşılaştırmaya girmez.
S15: Karşılaştırma = sonra doğru − önce doğru, yüzdeler ayrı. Mesaj cezalandırmaz; düşüşte “yeni yöntem başta yavaşlatabilir”. Sonuçta dürüstlük notu: listeler farklı, tek deneme kesin değil, tekrar ederken listeler aynı kaldığı için en anlamlı karşılaştırma ilk deneme.
S15: Birlikte yap’ta tek kontrol sorusu; yanlışta doğru cevap ve açıklama gösterilir, her durumda devam edilir. Kendin dene’de yazılanlar kaydedilmez.
S15: Kayıt: modul hafiza, egzersiz teknik-<ad>, zorluk 1, dogru/yanlis = sonraki ölçüm, ekstra {tur, once, sonra, toplam, fark, onceSira?, sonraSira?, kendinSn}. Ayrı depo anahtarı yok; ders kartlarındaki “son deneme” kayıtlardan okunur, “Sonuçları sil” bunu da temizler.
S15: Adresler #/teknikler (liste; geri bağlantı Hafıza alanı) ve #/teknikler/<ad>; araç kartı ARACLAR’da (ikon akademi), ana sayfa “Ders çalışırken” kısayollarında. Profil yoksa ders açılmaz. Ders yarıda çıkılırsa (Tüm dersler bağlantısı) onay istenir; profil değişince ders baştan başlar.
S15: Tahmini süre her derste 6-8 dk (çalışma 35-45 sn, ara 15 sn ×2, önerilen uygulama 100-110 sn).

## Kapanan açık sorular (S15)
- “K2 arşive taşınacak.” → S15: K2 ve S14a kararları arşive taşındı.
- S14b: n-geri n 1-2, blok 12 yanıt, ≥%80 → +1. Kelime: tam = tüm kelimeler, sıra ayrı. Eşleştirme hedefi ≤ 2×çift hamle.
- S15: Ders = ön deneme + 4 adım; önce/sonra eşit uzunluk ve ara. Kayıt teknik-<ad>, dogru = sonra; ilerleme kayıtlardan.

## S16 ve S17 (S18b’de 3. bölümden taşındı)
S16: Leitner 5 kutu, vars. 1-2-4-8-16 gün; bildim → kutu+1 (≤5), bilemedim → 1; sonraki = bugün + yeni kutunun aralığı. Günlük sınır vars. 20: önce geciken eski kartlar, sonra yeniler; bilemedim kartı oturum sonunda 1 kez alıştırma. Hazır deste profile kopyalanır. CSV: UTF-8 BOM, “;”; içe: ; , sekme, UTF-8/windows-1254. Tekrar metrics’e yazmaz; “Sonuçları sil” kartlara dokunmaz.
S17: Test 5 adım (~10 dk): okuma + 4 soru (sınıfa göre sabit metin; okuma 8 sn-4 dk), git-dur, rakam-dizisi, periferik-flas (sabit ayarlar seviye-testi.js ADIMLAR’da), odak öz değerlendirmesi (radara girmez). Egzersizler çerçeve dışında küçük ctx + ctx.olcum ile çalışır; önceki kayıt kullanılmaz; adım atlanabilir (eksen null). metrics’e yazmaz; “Sonuçları sil” dokunmaz. Final = başlangıç + 21 gün, aynı metin; başlangıç ilk 3 gün yenilenebilir. Eksen puanı sabit ölçek 0-100 (test-veri.js OLCEK). Güçlü/gelişim = en yüksek/düşük eksen (fark <10 dengeli); değişim ±5 altı “benzer”.

## Kapanan açık sorular (S18b)
- “Radar eksen adları test-veri.js EKSENLER ile uyumlu mu?” → S18b: değildi (kural dosyasında okuma); course-rules.json’da okumaHizi yapıldı.
- “Uzunluk adları (kisa, orta) text-bank.js UZUNLUKLAR ile uyumlu mu?” → S18b: uyumlu.

# KARAR_ARSIVI.md’ye EKLENECEK (S19’da 3. bölümden taşındı; dosyanın EN SONUNA yapıştır)
S18a: Ekran adı “Kural tabanlı uyarlanabilir plan” (“yapay zekâ” yok). Tüm değerler data/course-rules.json’da, kodda sabit yok. 21 gün × 5 ders: 1 göz, 2 hız (hedef ×1,1; anlama düşükse ×1,0), 3 anlama (oku-anla, rehber, hedef WPM’de; günün tek ölçüsü), 4-5 esnek (kredili dağıtım: her slotta krediye ağırlık eklenir, en yüksek seçilir, seçilenden toplam ağırlık düşülür; temel dikkat 3, hafıza 3, diğerleri 1; en zayıf +4, ikinci +2; tip/gün ≤2). Hedef: kademe %2-3-4, tavan başlangıç ×1,5, taban ×0,85, WPM ≥ hedef×0,95 = tuttu. Anlama ≥85+tuttu → kademe+1 ve artış; 70-84+tuttu → artış; <70 → sabit; 2 gün üst üste <70 → ×0,95 ve kademe sıfır; veri yok → sabit, seri değişmez. Her 5. gün pekiştirme (tekrarlı okuma, 5. ders Tekrar kartları, artış yok); 7/14/21 ölçüm (serbest okuma; ≥hedef×1,1 ve ≥85 ya da <hedef×0,85 → hedef = ölçülen). Çakışmada en temkinli kazanır: yeniden-başlat > kalibrasyon > düşür > sabit > ayarla > artır; sınırlar her zaman en son. Kurs günü tamamlanan güne göre ilerler (≥3 ders, anlama zorunlu; takvim gününde en çok 1). Ara: 0-2 devam, 3-6 ×0,95, 7-13 kalibrasyon, ≥14 yeniden başlatma önerisi. Yorgun: göz + anlama + 1 esnek, 15 dk süreleri, artış yok. ≥350 WPM tavan ×1,15 ve kademe %2; ≥450 artış yok. Testsiz başlangıç: sınıf varsayılanı + 1. gün kalibrasyon. Yaş alınmaz.

## S18b – Planlayıcı uygulama yorumları (S20’de 3. bölümden taşındı)
S18b: Planlayıcı saf (structuredClone, tarih dışarıdan; Date.now yok); kurallar her çağrıda parametre. Uygulama yorumları (çelişki notları): (1) pekiştirme/ölçüm, yorgun, tutmadı, tavan “artış engeli”dir; yalnız günlük artışın yerini alır, ölçüm günü yukarı ayarı engellemez. (2) Ölçümde aşağı ayar “dusur” sırasında; aynı sırada düşük hedef kazanır. (3) Anlama < eşikken kalibrasyon hedefi yükseltmez: min(ölçülen×0,9, hedef). (4) 2 gün düşük → düşüş sonrası seri 0 (sonraki düşüş için yine 2 gün). (5) Ara aynı boşluk için bir kez işlenir (araIslenen); üst aralığa geçince ara öncesi hedeften yeniden hesaplanır. Ara seriSifirla yalnız dusukSeri. (6) Artış = hedef × (1 + kademe); %85+ önce kademe+1. Tavana değen artış/ayar kodu “tavan”. (7) Kalibrasyon günü veri yoksa ertesi güne kalır. (8) Kurs gün tamamı: ≥3 ders (yorgunda 3/3) + anlama dersi. (9) Kural dosyasındaki her değer kodda okunur; yöntem adı alanları (yuvarlama, anlamaIyiyse, veriYoksa, ara.olcu, havuzSecimi, agirlik.yontem, testsizIlkGun, kaldigimYerdenEylem) yalnız desteklenen değerleri alır, başkası yazılırsa kural dosyası geçersiz sayılır. Yalnız ekran metni olanlar: yontemAdi, dersTipleri.*.etiket, olcuKaynagi. Kural dosyası surum 2: eksen okumaHizi; karar ve açıklama metinleri {esik} gibi şablonlu; sabit-yorgun metni eklendi. Ders ayar.metin bir kuraldır (sinif-okunmamis-kisa|orta, onceki-anlama); metni ekran seçer.

## Oturum geçmişi (devam)
S19 [x] Akıllı Kurs ekranları: gün haritası, ders akışı + mola, plan notu, yorgun modu, rapor + sertifika (+ düzeltme)
S20 [x] İlerleme paneli, XP/seviye, 20 rozet, esnek seri, günlük hedef, veli raporu (v0.3)
