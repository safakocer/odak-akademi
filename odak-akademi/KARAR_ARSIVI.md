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

<!-- KARAR_ARSIVI.md dosyasının SONUNA ekle (S10 kararları, S11a'da arşive taşındı) -->
S10: Şekil, renk, SVG yalnız algi.js’ten (dolgu style ile var(--…)). Oyun içeriği her açılışta rastgele üretilir.
S10: Farkı Bul: 3 resim çifti, fark sayısı seviye aralığından rastgele (3-4/4-6/6-8); ipucu sınırsız; puan = fark/dk (boş dokunuş +2, ipucu +5 sn); seviye: isabet ≥%80 ve ≤1 ipucu +1, <%50 ya da çok ipucu −1. → D06: Kolay’da yalnız renk farkı yok.
S10: Görsel Arama 12 deneme, puan = bulunan/dk. Simge Anahtarı 60 sn, puan = doğru − yanlış. Ayna 12 deneme, puan = doğru/dk. Üçü otomatikSeviye.
S10: Mola hatırlatıcısı = profil ayarı molaRehberi (vars. açık); kapalıyken mola önerisi çıkmaz; sıfırlama değiştirmez. 20-20-20 rehberi (goz-molasi): 1-3 tur, kaydedilmez, molaMi ile sayaçları sıfırlar. Dil: “tedavi değildir; kısa mola ve uzağa bakma önerisi”.
