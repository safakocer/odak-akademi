# PROJE_DEFTERI.md  (en fazla ~1750 kelime. 1, 4, 5, 6. bölümler KALICIDIR: silinmez, yalnızca güncellenir. 2, 3, 7 kısaltılabilir.)

1. PROJE
Ad: Odak Akademi (çalışma adı) | Kitle: 5-8. sınıf
Marka: maskot "Fener" (güler yüzlü deniz feneri) | Renkler: deniz camı yeşili #0e6b63, mercan #ff6f4f, güneş #ffc94d, sis zemin #edf4f3
PROJE: Sürüm: v0.1 (sw.js SURUM: 0.1.26-s14b) · v0.1 yayına hazır
ÇALIŞMA KURALI (kalıcı): Oturum promptu gelince Claude önce o oturum için gereken dosyaları listeler (yeni yazılacaklar değil; okunacak/değiştirilecek mevcut dosyalar). Eksik dosya varsa yalnızca listeyi verir ve bekler; hepsi yüklüyse doğrudan işe başlar. Kullanıcı her oturumda PROJE_DEFTERI.md ile listedeki dosyaları yükler.
DOSYA YERİ KURALI (kalıcı): Her cevapta verilen her dosya için proje ana klasörüne göre tam yol (ör. js/engine/modes/rehber.js), yeni mi / üzerine mi yazılacak bilgisi ve silinmesi gereken eski dosyalar bir tabloda yazılır.
ARŞİV KURALI (kalıcı): 3. bölümde yalnızca son 2 oturumun kararları ve “Süregelen ilkeler” durur. Daha eski kararlar KARAR_ARSIVI.md’ye taşınır (silinmez, sınırı yok). Arşiv her oturumda yüklenmez; Claude o oturum eski bir konuya dokunuyorsa dosya listesinde KARAR_ARSIVI.md’yi de ister. Arşive ekleme yapılan oturumda Claude arşivin tam hâlini de verir.
GEZİNME KURALI (kalıcı): Her sayfa uygulama içinden (kart, sekme, düğme) açılır; kullanıcıdan adres çubuğuna yazması istenmez.

2. DURUM
[x] S01-S12, D01-D06, K1-K2 (test bekliyor) · [x] S14a-S14b

3. KARARLAR:
Süregelen ilkeler (ayrıntı arşivde):
- SURUM 0.1.<sıra>-<oturum>, her yayında +1; yeni dosya sw.js DOSYALAR’a (kabuksa ZORUNLU’ya).
- Okuma: WPM 60-500 (vars. 150); anlama <%70 → hız artmaz; Hızlı Oku kaydedilmez.
- Rekor: aynı egzersiz ve seviye, kendi kayıtları (eoh > puan > dogru).
- Mola önerilir, zorlanmaz (çerçeve 12, okuma 20 dk). Tıbbi iddia yok.
- Metinler text-bank.js + text-picker.js; kart bilgileri yalnız katalog.js; renkler yalnız tokens.css; şekil/SVG algi.js.
- Profil store.etkinProfil()’den; anahtar <ad>:<profilId>. Flaş flasGoster(), puan dakikaPuani(); dokunma ≥44 px; yazı ≥ --fs-xs. Dikkat: dikkatOyunu(), 5 otomatik basamak.
K2: Bitişi depodaki zamanlayıcıyla eşleşen sekme işler; toast varken duyur yok; tikte depo okunmaz; ana sayfa kısayolları katalog.js’ten.
S14a: Hafıza seviyesi = tempo; uzunluk merdivenle (doğru +1, 2 ardışık yanlış −1). Puan en iyi dizi; rekor egzersiz + seviye + yön.
S14b: Deneme = blok/liste/tahta. n-geri: n 1-2, blok 12 yanıt, ≥%80 → +1, tur 1-geriyle başlar. Kelime: tam = tüm kelimeler, sıra ayrı. Eşleştirme: seviye = benzerlik + çift aralığı; hedef ≤ 2×çift hamle.

4. DOSYA HARİTASI:
kök: index.html, sw.js, manifest.webmanifest, components.html (bileşen vitrini; yalnız geliştirme, sw’de yok)
js/: app.js
js/core/: a11y.js, ui.js, utils.js, storage.js, store.js, router.js, profile.js, metrics.js, settings.js, sound.js, pwa.js
js/engine/: exercise-frame.js, celebrate.js, reader-engine.js, reader-modes.js, reader-panel.js, eye-rest.js, quiz-engine.js, text-bank.js, text-picker.js, flas.js, algi.js, attention-core.js, memory-core.js
js/engine/modes/: rehber.js, kelime-grubu.js, serbest.js, rsvp.js
js/modules/: katalog.js, egzersiz-listesi.js, dikkat/hizli-dokun.js, dikkat/stroop.js, dikkat/git-dur.js, dikkat/iptal-testi.js, dikkat/surekli-dikkat.js, goz/schulte.js, goz/nesne-takibi.js, goz/satir-ritmi.js, goz/periferik-flas.js, goz/grup-flasi.js, goz/kelime-piramidi.js, goz/sekilli-metin.js, goz/fark-bul.js, goz/gorsel-arama.js, goz/simge-esle.js, goz/ayna-dondur.js, goz/goz-molasi.js, oku/hizli-oku.js, oku/oku-anla.js, kutuphane/kutuphane.js, kutuphane/metin-formu.js, odak/odak-veri.js, odak/odak-zamanlayici.js, odak/odak-araclari.js, odak/nefes.js, hafiza/rakam-dizisi.js, hafiza/corsi-bloklari.js, hafiza/n-geri.js, hafiza/kelime-listesi.js, hafiza/eslestirme.js
data/: kelimeler.json · data/texts/: sinif5.json, sinif6.json, sinif7.json, sinif8.json
css/: tokens.css, base.css, components.css, exercise.css, library.css, odak.css
icons/: fener.svg, uygulama-ikonu.svg, ikon-180.png, ikon-192.png, ikon-512.png, ikon-maskable-512.png
fonts/: atkinson-hyperlegible-next-regular.woff2, atkinson-hyperlegible-next-bold.woff2, ofl-atkinson-hyperlegible-next.txt (lisans; yazı tipleriyle birlikte dağıtılması zorunlu)
Son değişenler (S14b): memory-core, hafiza/n-geri, kelime-listesi, eslestirme (yeni), data/kelimeler.json (yeni), katalog.js, exercise.css, index.html, sw.js.

5. VERİ ŞEMALARI VE ADRESLER:
Uygulama ayarları (Ayarlar sayfası, profil başına): {tema: sistem|acik|koyu, yaziBoyutu: kucuk|normal|buyuk|cok-buyuk, font: standart|disleksi, ses: true|false, hareketAzalt: true|false, molaRehberi: true|false (vars. true)}. Kök öznitelikler: data-tema, data-yazi, data-font, data-hareket="azalt", data-mola="kapali". Ayrı anahtarda değil, profil.ayarlar içinde saklanır.
Okuma ayarları: {wpm (60-500), grupBoyutu, grupTuru: kelime|karakter, yaziBoyutu: kucuk|normal|buyuk|cok-buyuk, satirAraligi: 1.4|1.6|1.8|2, font: uygulama|standart|disleksi, tema: uygulama|acik|koyu|sepya, kademeli: true|false (vars. false), gozMolasi: true|false (vars. true)}.
Depolama (anahtarlar öneksiz verilir; storage.js “odak:” ekler): profiller ([Profil], en çok 6), aktifProfil (id), surum (VERI_SURUMU 1); profil başına: okuma:<profilId>, kayitlar:<profilId> (en çok 1000), seviyeler:<profilId>, metinler:<profilId> (kendi metinleri), kutuphane:<profilId> ({favori: [kimlik], okunan: {kimlik: {sayi, son, sonAnlama?, enIyiAnlama?}}}), odakAraclari:<profilId> ({ayar {calismaDk, molaDk, zil}, hazirlik {gun, isaretli, onay}, zamanlayici {tur, dk, bitis|kalanMs, ortamHazir}|null, bekleyen, bloklar ≤500}; Blok {id, tarih, dk, sureSn, tamamlandi, puan|null, ortamHazir}). Profil silinince <ad>:<profilId> anahtarlarının hepsi silinir.
Profil: {id, takmaAd (2-20 karakter; e-posta, telefon, adres yok), sinif (5-8), avatar, olusturma, ayarlar: Uygulama ayarları}.
Kayıt: {id, tarih, modul, egzersiz, sureSn, zorluk, wpm?, anlamaYuzde?, eoh?, dogru?, yanlis?, puan?, ekstra? (sadeleştirilmiş; çerçeve ekstra.isabet ekler)}; rekor alanı eoh > puan > dogru, aynı egzersiz ve seviyede.
Adresler: #/ (ana sayfa), #/ayarlar, #/egzersizler, #/kutuphane, #/odak, #/modul/<ad> (oku, goz, dikkat, hafiza), #/egzersiz/<ad> (hizli-dokun, stroop, git-dur, iptal-testi, surekli-dikkat, nefes, hizli-oku, oku-anla, schulte, nesne-takibi, satir-ritmi, periferik-flas, grup-flasi, kelime-piramidi, sekilli-metin, fark-bul, gorsel-arama, simge-esle, ayna-dondur, goz-molasi, rakam-dizisi, corsi-bloklari, n-geri, kelime-listesi, eslestirme). Yakında (data-yakinda, aria-disabled): #/kurs, #/ilerleme, #/testler, #/rehber.
Katalog: alan {ad, baslik, aciklama, ikon}; egzersiz kartı {ad, modul, baslik, aciklama, ikon, etiket?} + yukle() (dosya yolu); araç kartı aynı alanlar + adres (yukle yok).
Mod tanımı: {ad, etiket, aciklama, sira, motor: tempolu|serbest, kontroller[], grupSiniri?, gruplama?(), uyari?, sureSiniriSn?, gorunumOlustur(gruplar, ayar, yardim)}. Görünüm zamanlayıcıları yalnızca durumDegisti('okuyor') ile başlar.
Egzersiz tanımı: isteğe bağlı ikon (sprite adı), molaMi; degerlendir dönüşünde isteğe bağlı ek (Node, sonuç ekranına eklenir).
Hızlı Oku ctx.ekstra: {mod, motor, kelime, toplamKelime, wpm, hedefWpm, sureMs, grupSayisi, duraklatma, baslangicWpm, enYuksekWpm, kademeli, yavaslatma, sureSiniri, metin (metin kimliği)}.
Soru (ortak): {kimlik, tip, katman: bilgi|cikarim|yorum, soru, aciklama}. Tipe göre: coktan-secmeli: secenekler[2-5], dogru (sıra); dogru-yanlis: dogru (true|false); bosluk: soruda tek “___”, cevaplar[]; siralama: ogeler[2-6] doğru sırayla; kisa-cevap: ornekCevap, kontrolListesi?[].
Metin dosyası (data/texts/sinif<N>.json): {sinif, metinler: [Metin paketi]}.
Metin paketi: {kimlik (a-z0-9-), ad, sinif (5-8), tur: hikaye|masal|bilgilendirici|fen, metin (paragraflar boş satırla), sorular[5-6]}. Yüklenince eklenir: kelime, kaynak: banka.
Kendi metni (depoda): {kimlik: kendi-<uuid>, ad, metin, sorular: [öz-soru], olusturma, guncelleme}. Öz-soru: {tip (5 soru tipi), katman, soru, cevap? (kisa-cevap), secenekler?+dogru, dogru? (true|false), cevaplar? (bosluk), ogeler?}. Okunurken pakete çevrilir: sinif null, tur kendi, kaynak kendi, sorular (soru şeması, kimlik oz-1…), ozSorular.
Göz ctx.ekstra: schulte {boyut, celdirici, sureMs}; nesne-takibi {yol, dakika, isaret, kacan, mola}; satir-ritmi {sayfa, satir, vurusMs}; periferik-flas {oge: rakam|kelime, yon, baslangicMs, esikMs, enKisaMs, sapmaMs, kareMs}; grup-flasi {kelime, yanit: sec|yaz, baslangicMs, esikMs, enKisaMs, sapmaMs, kareMs, kelimeIsabet?}; kelime-piramidi {satir, sureMs, piramit, sapmaMs}; sekilli-metin {sekil, genislik, kelime, sureMs, metin, kaynak} (+ kayıtta wpm); fark-bul {nesne, resim, fark, ipucu, sureMs}; gorsel-arama {oge, deneme, ortMs, sureMs}; simge-esle {simge, karisma?}; ayna-dondur {hucre, aciAdim, sureMs}; goz-molasi kaydedilmez ({tur, hedefTur}); nefes kaydedilmez ({tur, hedefTur, tempo}).
Dikkat ctx.ekstra: {deneme, atlanan, onTepki, kesinti, isabet, ortMs, medyanMs, sapmaMs, cv, tutarlilik, turMs}; stroop + {renk, ipucu, farkMs}; hizli-dokun {kacan}; git-dur + {hedefSayisi, durSayisi, celdirici, hataliDokunma, atlananHedef}; iptal-testi + {satir, hucre, hedef, hedefTuru, celdirici, satirMs, yanlisIsaret, erkenBiten} (ortMs = işaretler arası); surekli-dikkat + {hedefSayisi, akisMs, celdirici, atlananHedef, yanlisDokunma, yari: {ilk, son: {deneme, dogru, isabet, ortMs}}, sureklilik}. Deneme (bellekte): {tur, beklenen, sonuc, rtMs?, yanit?}; plan öğesi araMs? alabilir.
Hafıza ctx.ekstra: {mod?, baslangic, gosterMs?, deneme, dogru, yanlis, isabet, enIyi, ortDuzey, ogeIsabet, sonDuzey, donus, kesinti}; puan = enIyi. n-geri (mod konum|sekil|harf) + {hedefSayisi, yakalanan, kacan, yanlisAlarm, dogruRed, yanitsiz, blokOge, gecmeEsigi, ortMs?}; kelime-listesi (mod sec|yaz) + {kelimeDogru, siraDogru, kelimeToplam, fazlaKelime, siraIsabet}; eslestirme + {celdirici, hamle, cift, enCokCift, ortTahtaSn}.
data/kelimeler.json: {surum, kategoriler: [{ad, kelimeler[]}]}.
Oku ve Anla ctx.ekstra: Hızlı Oku alanları + kaynak (banka|kendi), sinif + anlama: {yuzde, puan, soru, dogru, katman: {bilgi, cikarim, yorum}, metinGorunur, metneBakis}.

6. DIŞA AÇILAN FONKSİYONLAR:
utils.js (ek): karistir(dizi) / dakikaPuani(adet, sn, ekSn?) → adet×60 ÷ (sn+ekSn)
store.js: OLAYLAR / dinle / yay / durumOlustur / uygulamaDurumu / etkinProfil()
a11y.js: ayarlariUygula / hareketAzaltilmisMi / molaRehberiAcikMi / duyur / odakla / odakTuzagi / acikPencereyeTasi(oge)
pwa.js: pwaBaslat / pwaDurumu (+ kurulumHatasi) / pwaDurumunuDinle / kurulumDugmesiniBagla
reader-engine.js: metniHazirla / metniGrupla / kelimeMi / okumaMotoruOlustur / wpmHesapla / wpmDenetle / tahminiSureSn / okumaAyarDenetle / okumaAyarlariniGetir / okumaAyarlariniKaydet / okumaAyarlariniSil / okumaGorunumuUygula / okumaAlaniOlustur / kademeliIzinli / kademeliTavan; sabitler WPM_SINIR, GRUP_SINIR, OKUMA_SECENEKLERI, VARSAYILAN_OKUMA_AYARLARI, KADEMELI.
exercise-frame.js: egzersizAc / egzersiziKapat / egzersizAcikMi / molaEsiginiAyarla / hazirlikSecimi({ad, baslik, secenekler:[{deger, etiket, aciklama?}], secili, degisince(deger)}) → fieldset; tanım alanları hazirlik, hazirlikDenetle, sayacYok, kayitYok, kayitYokMetni, ikon, otomatikSeviye, molaMi, sureNotu, rekorBolumuVar; degerlendir → {puan, satirlar, mesaj, ek, wpm, anlamaYuzde, eoh, isabet, sonrakiSeviye, yeniRekor?, ...}.
flas.js: flasGoster(oge, ms, {aktifMi, maske?, maskeMs}) → Promise<{iptal} | {iptal:false, gercekMs}> (sınıf flas--gorunur) / kareSuresi / merdivenOlustur({baslangic, en, enCok}) → {ms, deneme, sonuc(dogruMu, gercekMs), esik(), sapma(), enKisaDogru()} / merdivenSeviyesi(zorluk, {esikMs, isabet, en, enCok}) / baslangicSuresi({modul, egzersiz, zorluk}, sinir) / hizPuani(esikMs) / havuzHazirla() (async) / kenarTemizle(s) / rastgeleKelime([en, enCok], {haric?}) / kelimeCeldiricileri / sayiUret / sayiCeldiricileri / rastgeleGrup(n) / grupCeldiricileri / yazimSadelestir / yazimKarsilastir → {tam, dogruKelime, toplamKelime} / secenekPaneli({baslik, secenekler, secince(i), tuslar?}) → {kok, odakla, isaretle, tus(e)}. Ortak stil: exercise.css .flas-*.
algi.js: svg(ad, oz, ...cocuk) / yuvarla(n) / rastgeleTam / rastgeleSec / digeriniSec / SEKILLER {ad, don, d} / SEKIL_ADLARI / RENKLER [{ad, deger}] / renkAdi / sekilCiz(ad, {x, y, boyut, aci, ayna, renk, sinif}) / simgeSvg(ad, {...}) / noktaSvgde(svg, olay) / izgaraGezinme(kap, {ogeler(), sutun()}) → {sifirla(odak?)} / geriYaz(oge, sonuc, metin). Ortak stil: exercise.css .algi-*.
attention-core.js: ON_TEPKI_MS, KESINTI_MS, DOGRULUK_ESIGI, BASAMAK_ADLARI / dikkatOyunu({egzersiz, ad, nasil, basamaklar[5], baslat, ekSatirlar?, ekBolum?(ekstra) → Node, rekorAyrimi?}) / dikkatTuru(ctx, {plan, pencereMs, uyaranMs?, araMs?, geriMs?, araSonucu?, goster, gizle?, dogruMu?, sonucta?, ilerleme?, bitince?}) → {yanitla(yanit, olay)} / dikkatBitir(ctx, kayitlar, {kesinti, bitince?}) / dikkatSahnesi(ctx, {ust?, sahneSinif?}) → {sahne, durum, geri, ilerle, geriYaz, temizle} / dokunusBagla(ctx, sahne, tur) / rekorlariGetir({..., ayrim?}) / basamaklar / oranliAdet / denemePlani / olayZamani / istatistik / tutarlilikPuani / etkinlikPuani / msMetni / ozetle / basamakOner / rekorKarsilastir / rekorBolumu / dikkatMesaji / dikkatDegerlendir. Stil: exercise.css .dikkat-*.
memory-core.js (kullanım: dosya başı yorumu; S14b: seviyeler[i].sinir, yonBaslik, yonKapsam, metinler, mesaj): VARSAYILAN_METINLER / merdivenOlustur({baslangic, en, enCok, yukselt, dusur}) → {deger, enIyi, donus, sonuc(dogru)} / baslangicDuzeyi / sonEkstra / bekle / hafizaSahnesi / diziTuru(ctx, {sahne, merdiven, uret, sun, gir, ...}) / hafizaOzeti / hafizaBitir / hafizaRekorlari / hafizaKarsilastir / hafizaRekorBolumu / merdivenYolu / hafizaMesaji / hafizaDegerlendir / hafizaOyunu / ogeDuyur.
reader-modes.js: modKaydet / modBul / modYukle / modlariYukle / etkinGruplama / modSeciciOlustur(modlar, {kimlik, secili, degisince?(tanim)}) → {kok, secili()} / modOturumuOlustur / okumaSahnesiKur(ctx, {tanim, metin, ayar, anlamaYuzde?, ekstra, bitince?(sonuc)})
Oturum yöntemleri: baslat, duraklat, devamEt, bitir, iptal, ayarlariUygula, yavaslat, kademeli, durum, hiz, ilerlemeYuzde, gecenMs, olcum, toplamKelime, ayar; alanlar: kok, tanim
Mod görünüm kancaları: grupDegisti, durumDegisti, ayarUygula, kapat; yardim.ilerlemeBildir, yardim.gecenMs, yardim.sureSiniriMs
reader-panel.js: okumaAyarPaneliOlustur({ayar, tanim, onizlemeMetni, kimlik, degisince(ayar, {kaydet})}) → {kok, ayar(), modAyarla(tanim)}
eye-rest.js: gozMolasiKur(ctx, {acik, kap, gecenMs, okuyorMu}) → {acikMi()} / gozMolasiEsiginiAyarla(sn) / gozMolasiVerildi()
quiz-engine.js: SORU_TIPLERI, KATMANLAR, ANLAMA_ESIGI, GERI_BILDIRIMLER, BOSLUK / geriBildirimSec / soruDenetle / sorulariDenetle / cevapBicimle / cevapPuanla / anlamaHesapla / cevapMetni / dogruCevapMetni / soruOturumuKur(kap, {...}) → {kok, iptal} / katmanOzetiOlustur / gozdenGecirmeOlustur
metrics.js: kayitEkle / ozet / eohHesapla / sonAnlamaYuzde({modul, egzersiz, profilId}) / modulKayitlari(modul, {egzersiz?, profilId?}) / sonSeviye / sonSeviyeKaydet / profilKayitlariniSil (kayıt + seviye); İlerleme için hazır: kisiselRekor, sonGunler, calismaSerisi.
katalog.js: MODULLER / egzersizVarMi / egzersizYukle / egzersizBilgisi / modulBilgisi / modulEgzersizleri / aracBilgisi / modulAraclari
egzersiz-listesi.js: egzersizKarti(kart) → li / modulKartlariniGuncelle / modulSayfasiCiz(kap, ad) → alan | null / egzersizlerSayfasiCiz(kap)
text-bank.js: SINIF_DUZEYLERI, METIN_TURLERI, UZUNLUKLAR, KENDI_SINIR, OZ_SORU_TIPLERI / ozSoruDuzelt / ozSoruHatasi(soru, sira) / metinBankasiYukle() → Promise<paketler> / metinBankasiDurumu() → {yuklendi, hataliDosya, hataliMetin} / metinKelimeSayisi / uzunlukBul / tumMetinler / metinBul / kendiMetinleri / kendiMetinDenetle / kendiMetniKaydet → {tamam, metin | hata} / kendiMetniSil / favoriMi / favoriDegistir / okumaBilgisi / okunduIsaretle(kimlik, {anlamaYuzde?}) / okunanlariSil(profilId?) / seviyeBilgisi(metin) → {derece, etiket} / metinleriSuz(liste, {arama, sinif, tur, uzunluk, durum, favori}) / secimAyarla(egzersiz, kimlik) / secimAl(egzersiz) / profilSinifi()
text-picker.js: metinSeciciOlustur({egzersiz, kimlik, suzgec?(metin), degisince?(metin)}) → {kok, secili(), odak()} / metinBilgiSatiri(metin) / metinSecimHatasi(secici, {sorulu?}) → undefined | {mesaj, odak}
kutuphane/kutuphane.js: kutuphaneSayfasiCiz(kap) (async)
kutuphane/metin-formu.js: metinFormuAc({metin?, acici?, kaydedince?(metin, yeniMi)}) → dialog
sound.js: sesCal(tur, {zorla?}); S12: zil
odak/odak-veri.js: sabitler / odakVerisi / odakVerisiniGuncelle(fn) / bekleyeniKaydet(puan|null) / odakGunluguSil / haftalikOzet / ortamKarsilastirmasi
odak/odak-zamanlayici.js: zamanlayiciKur / Durumu / Dinle(fn) / Baslat(tur) / Duraklat / Devam / Bitir
odak/odak-araclari.js: odakSayfasiCiz(kap) / odakSayfasiniKapat()

7. AÇIK SORULAR:
Kendi metin sınırı? Stroop basamağı? Quiz seçenekleri karışsın mı? Uzun mola? Hafıza rekoru tempodan bağımsız mı? 3-geri? K2 arşive taşınacak.
“Bugünün Görevi” Akıllı Kurs’ta bağlanacak.
