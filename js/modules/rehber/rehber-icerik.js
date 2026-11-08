// Çalışma Rehberi içerikleri (S22): sınav hazırlığı, sağlıklı alışkanlık kartları, aile rehberi ve ders adı önerileri; yalnız veri (DOM yok)
// S34f: kademeye göre değişen metinler kademe adıyla (ortaokul | ilkokul) anahtarlanır: ders önerileri, haftalık plan metinleri, örnek planlar, aile rehberinin ilkokul bölümü

/** Plan ve not formlarındaki ders adı önerileri (datalist; öğrenci başka ad da yazabilir) */
export const DERS_ONERILERI = Object.freeze([
  'Türkçe', 'Matematik', 'Fen Bilimleri', 'Sosyal Bilgiler', 'T.C. İnkılap Tarihi', 'İngilizce',
  'Din Kültürü', 'Kitap okuma', 'Haftanın tekrarı', 'Ödev', 'Deneme analizi',
]);

/** S34f: kademeye göre ders adı önerileri (kademe yoksa ortaokul) */
export const KADEME_DERS_ONERILERI = Object.freeze({
  ortaokul: DERS_ONERILERI,
  ilkokul: Object.freeze(['Türkçe', 'Matematik', 'Hayat Bilgisi', 'Fen Bilimleri', 'Sosyal Bilgiler', 'İngilizce', 'Kitap okuma', 'Ödev', 'Haftanın tekrarı']),
});

/**
 * S34f: Haftalık plan sayfasının kademeye göre metinleri ve değerleri.
 * { aciklama, veliNotu? {baslik, metin}, blokDk (yeni bloğun süresi; BLOK_SURELERI’nden), yogunDk (günlük çalışma bunu aşınca not), yogunNot, ipuclari[] }
 */
export const PLAN_METINLERI = Object.freeze({
  ortaokul: Object.freeze({
    aciklama: 'Her güne kısa ders blokları koy. Bloklar arasında mola, hafta sonunda esneklik var.',
    blokDk: 25,
    yogunDk: 120,
    yogunNot: 'Bu gün yoğun görünüyor; bir bloğu başka güne taşımayı düşünebilirsin.',
    ipuclari: Object.freeze([
      'Blokları kısa tut (20-30 dk); zor dersi enerjinin yüksek olduğu saate koy.',
      'Aynı dersi haftaya yay: bir gün uzun yerine iki üç gün kısa çalışmak tekrar fırsatı verir.',
      'Her hafta bir tekrar bloğu koy; yeni konuyla birlikte eskiyi de hatırla.',
      'Plan sana hizmet eder: tutmayan günde suçluluk yerine planı küçült.',
    ]),
  }),
  ilkokul: Object.freeze({
    aciklama: 'Haftanı ailenden biriyle birlikte planla. Her güne kısa bir çalışma koy; oyun ve dinlenme de plana dahil.',
    veliNotu: Object.freeze({
      baslik: 'Aileler için',
      metin: 'Planı çocuğunuzla birlikte hazırlayın. Bu yaşta 10-15 dakikalık kısa bloklar genellikle yeterlidir; oyun, hareket ve dinlenme de planın parçasıdır.',
    }),
    blokDk: 15,
    yogunDk: 60,
    yogunNot: 'Bu gün yoğun görünüyor. Bir bloğu başka güne taşımayı birlikte düşünün.',
    ipuclari: Object.freeze([
      'Blokları kısa tut: 10-15 dakika yeter.',
      'Planı ailenden biriyle birlikte yap.',
      'Her gün biraz kitap oku. İstersen bir büyüğünle sırayla, sesli oku.',
      'Plan tutmazsa üzülme. Planı birlikte küçültün.',
    ]),
  }),
});

/** S34f: Örnek planlar (gün → [[ders, dk]]; boş gün yazılmaz). Ders adı sınıfa göre SINIF_DERS_DEGISIMI ile değişir */
export const ORNEK_PLANLAR = Object.freeze({
  ortaokul: Object.freeze({
    pzt: [['Türkçe', 25], ['Matematik', 25]],
    sal: [['Fen Bilimleri', 25], ['İngilizce', 20]],
    car: [['Matematik', 25], ['Kitap okuma', 20]],
    per: [['Sosyal Bilgiler', 25], ['Türkçe', 25]],
    cum: [['Haftanın tekrarı', 25]],
    cmt: [['Kitap okuma', 20]],
  }),
  ilkokul: Object.freeze({
    pzt: [['Türkçe', 15], ['Kitap okuma', 10]],
    sal: [['Matematik', 15]],
    car: [['Hayat Bilgisi', 15], ['Kitap okuma', 10]],
    per: [['Türkçe', 15]],
    cum: [['Matematik', 10]],
    cmt: [['Kitap okuma', 10]],
  }),
});

/** S34f: Sınıfa özel ders adı değişimi (örnek planda): 4. sınıfta Hayat Bilgisi yerine Fen Bilimleri, 8. sınıfta Sosyal Bilgiler yerine İnkılap Tarihi */
export const SINIF_DERS_DEGISIMI = Object.freeze({
  4: Object.freeze({ 'Hayat Bilgisi': 'Fen Bilimleri' }),
  8: Object.freeze({ 'Sosyal Bilgiler': 'T.C. İnkılap Tarihi' }),
});

/**
 * Bilgi sayfası: { giris, uyari?: {baslik, metin}, bolumler: [{ baslik, ikon?, metin?, maddeler?[], baglantilar?[{adres, metin}] }],
 *   numarali? (bölümler sıralı öneri listesi olarak), listeBasligi?, kapanis?,
 *   kademeBolumleri? (S34f): { <kademe>: bölüm } (bölümlerin ardından; etkin profil o kademedeyse ya da profil yoksa görünür) }
 */
export const BILGI_SAYFALARI = Object.freeze({
  'sinav-hazirlik': {
    giris: 'LGS dahil her sınava hazırlıkta işe yarayan genel çalışma yolları.',
    uyari: {
      baslik: 'Önce bilmen gereken',
      metin: 'Bu öneriler belli bir puan ya da sıralama vaat etmez. Amaçları, çalışmanı daha planlı ve daha az yorucu hâle getirmek.',
    },
    bolumler: [
      {
        baslik: 'Sınava geriye doğru plan yap',
        ikon: 'takvim',
        maddeler: [
          'Sınav tarihinden geriye doğru say; kalan haftaları konulara böl.',
          'Büyük konuları küçük parçalara ayır: “Kesirlerde işlemler” yerine “kesirlerde toplama, 10 soru”.',
          'Her haftaya bir tekrar günü koy; yeni konu kadar eski konuyu hatırlamak da önemli.',
          'Planı haftada bir gözden geçir; geride kaldıysan planı küçült, kendini suçlama.',
        ],
        baglantilar: [{ adres: '#/rehber/haftalik-plan', metin: 'Haftalık planımı aç' }],
      },
      {
        baslik: 'Okuyup geçme, kendini yokla',
        ikon: 'ampul',
        maddeler: [
          'Konuyu okuduktan sonra kitabı kapat; hatırladıklarını yaz ya da yüksek sesle anlat. Hatırlamaya çalışmak, tekrar okumaktan genellikle daha kalıcıdır.',
          'Tekrarları günlere yay: aynı gün üç kez yerine bugün, üç gün sonra ve bir hafta sonra.',
          'Soru türlerini karıştır: yalnız tek tür değil, farklı konulardan soruları bir arada çöz.',
          'Notlarını Cornell yöntemiyle tut; sol sütundaki sorularla kendini sına.',
        ],
        baglantilar: [
          { adres: '#/tekrar', metin: 'Tekrar Kartları' },
          { adres: '#/rehber/cornell', metin: 'Cornell notu' },
        ],
      },
      {
        baslik: 'Soru çözümünü öğrenmeye çevir',
        ikon: 'kalem',
        maddeler: [
          'Önce konuyu anla, sonra soruya geç; anlamadan çok soru çözmek hataları tekrarlatır.',
          'Bir yanlış defteri tut: soruyu, doğru çözümü ve yanlışın nedenini yaz (bilgi eksiği, dikkat, süre, soruyu yanlış okuma).',
          'Yanlış defterine birkaç gün sonra dön; aynı soruyu yardım almadan yeniden çöz.',
          'Deneme sınavlarını süre tutarak ama seyrek çöz; asıl kazanç, sonrasındaki yanlış incelemesidir.',
        ],
      },
      {
        baslik: 'LGS için genel notlar',
        ikon: 'kitap',
        maddeler: [
          'LGS soruları çoğunlukla uzun metin, tablo ve grafik içerir; dikkatli okumak ve okuduğunu yorumlamak sınavın her dersinde işe yarar.',
          'Sınavın kapsamını, soru sayılarını, süresini ve tarihini her yıl MEB’in resmî duyurularından ve okulundan öğren; başka kaynaklardaki bilgiler eskimiş olabilir.',
          'MEB’in yayımladığı örnek soruları ve önceki yılların sorularını çöz; soruların nasıl sorulduğunu tanımak kaygıyı azaltır.',
          'Her gün kısa bir okuma alışkanlığı (kitap, gazete, bilim yazısı) bütün derslerde soru okumayı kolaylaştırır.',
        ],
        baglantilar: [{ adres: '#/teknikler/stratejiler', metin: 'Okuma Stratejileri' }],
      },
      {
        baslik: 'Sınav günü ve öncesi',
        ikon: 'saat',
        maddeler: [
          'Son gece yeni konu öğrenmeye çalışma; kısa bir tekrar yap ve her zamanki saatinde uyu.',
          'Sabah tanıdık bir kahvaltı yap, gerekenleri bir gün önceden hazırla, yola erken çık.',
          'Sınavda önce emin olduğun soruları çöz; takıldığın soruyu işaretleyip geç, sonra dön.',
          'Heyecanlandığında birkaç yavaş nefes al; kısa bir nefes çalışması dikkatini toplamana yardım edebilir.',
        ],
        baglantilar: [{ adres: '#/egzersiz/nefes', metin: 'Kutu Nefes' }],
      },
      {
        baslik: 'Kaygı ve motivasyon',
        ikon: 'yildiz',
        maddeler: [
          'Biraz heyecan olağandır ve dikkatli olmana yardım edebilir.',
          'Kendini arkadaşlarınla değil, geçen ayki kendinle karşılaştır.',
          'Bir hafta kötü geçtiyse planı bırakma, küçült. Düzenli küçük adımlar birikir.',
          'Kaygı uzun süre uykunu, iştahını ya da keyfini etkiliyorsa ailene ve okulundaki rehber öğretmene anlat.',
        ],
        baglantilar: [{ adres: '#/odak', metin: 'Odak Araçları' }],
      },
    ],
    kapanis: 'Hangi yöntemin sana uyduğunu denedikçe görürsün. Herkesin çalışma düzeni biraz farklıdır.',
  },

  'saglikli-aliskanliklar': {
    giris: 'Uyku, beslenme ve ekran alışkanlıkları için genel bilgi kartları.',
    uyari: {
      baslik: 'Bu kartlar genel bilgi içindir, tıbbi tavsiye değildir',
      metin: 'Herkesin ihtiyacı farklıdır. Sağlığınla ilgili bir sorun ya da merak ettiğin bir şey varsa ailene söyle ve bir doktora ya da uzmana danış.',
    },
    bolumler: [
      {
        baslik: 'Uyku',
        ikon: 'ay',
        metin: 'Uzman kuruluşların genel önerisi, 6-12 yaş için gecede yaklaşık 9-12 saat, 13-18 yaş için yaklaşık 8-10 saat uykudur. İhtiyaç kişiden kişiye değişebilir.',
        maddeler: [
          'Her gün, hafta sonu da, benzer saatlerde yatıp kalkmaya çalış.',
          'Yatmadan bir süre önce ekranları bırak; kitap okumak ya da sakin bir uğraş geçişi kolaylaştırır.',
          'Odanın karanlık, sessiz ve serin olması uykuya dalmayı kolaylaştırabilir.',
          'Akşam saatlerinde kola, çay, kahve ve enerji içeceği gibi kafeinli içecekler uykuyu zorlaştırabilir.',
          'Uyku, gün içinde öğrendiklerinin hatırlanmasında rol oynar; sınavdan önceki gece uykudan kısma.',
        ],
        not: 'Sık sık uyuyamıyorsan, gündüz çok uykulu oluyorsan ya da horlama gibi bir durum fark edilirse bir doktora danışın.',
      },
      {
        baslik: 'Beslenme ve su',
        ikon: 'elma',
        maddeler: [
          'Öğünlerini düzenli yemeye çalış; güne bir kahvaltıyla başlamak ders saatlerini kolaylaştırabilir.',
          'Çalışırken masanda su bulundur; susadığını fark etmek dikkatini dağıtabilir.',
          'Atıştırmalıkta meyve, yoğurt ya da peynir gibi seçenekleri dene; çok şekerli yiyecekleri sınırlı tut.',
          'Tabağında farklı renklerde sebze ve meyveye yer açmaya çalış.',
          'Takviye, vitamin ya da özel bir beslenme düzenine aileni ve doktorunu dinlemeden başlama.',
        ],
        not: 'Alerjin, özel bir beslenme ihtiyacın ya da bir sağlık sorunun varsa beslenmeni doktorunla ya da bir diyetisyenle birlikte planlayın.',
      },
      {
        baslik: 'Ekran alışkanlıkları',
        ikon: 'ekran',
        maddeler: [
          'Ders dışı ekran süresi ve kuralları (ne zaman, nerede, ne kadar) ailenle birlikte belirleyin.',
          'Ders çalışırken bildirimleri kapat ya da telefonu başka bir odaya koy.',
          'Yakına uzun süre baktığında ara ver: yaklaşık 20 dakikada bir, 20 saniye kadar uzağa bak.',
          'Ekranı iyi ışıkta, dik oturarak ve gözlerine çok yaklaştırmadan kullan.',
          'Yatmadan önceki saatlerde ekranı bırakmak uykuya geçişi kolaylaştırabilir.',
        ],
        baglantilar: [{ adres: '#/egzersiz/goz-molasi', metin: '20-20-20 göz molası' }],
        not: 'Gözlerinde sık ağrı, bulanık görme ya da sık baş ağrısı olursa bir göz doktoruna görünün.',
      },
      {
        baslik: 'Hareket ve mola',
        ikon: 'kalp',
        maddeler: [
          'Uzun oturduğunda kalk, biraz yürü, gerin; kısa molalar ders çalışmanın bir parçasıdır.',
          'Gün içinde hoşuna giden bir hareket bul: yürüyüş, bisiklet, dans, top oyunu.',
          'Mümkünse bir kısmını açık havada geçir.',
        ],
        baglantilar: [{ adres: '#/odak', metin: 'Odak Araçları' }],
      },
    ],
    kapanis: 'Bu sayfadaki bilgiler herkes için genel önerilerdir; kendi durumun için doktorunun önerisi önceliklidir.',
  },

  'aile-rehberi': {
    giris: 'Ders çalışmayı baskı kurmadan desteklemek için somut öneriler.',
    uyari: {
      baslik: 'Aileler için',
      metin: 'Bu sayfa veliler için yazıldı. Çocuğunuzla birlikte okuyup hangi önerileri deneyeceğinize birlikte karar verebilirsiniz.',
    },
    numarali: true,
    listeBasligi: 'Evde nasıl destek olurum? 10 öneri',
    bolumler: [
      { baslik: 'Sabit bir çalışma köşesi ve saati belirleyin', metin: 'Masa, ışık ve gerekli malzemeler hazır olsun. Saati çocuğunuzla birlikte seçin; birlikte konan kurala uymak daha kolaydır.' },
      { baslik: 'Kısa ve düzenli çalışmayı destekleyin', metin: '15-25 dakikalık bloklar ve araya kısa molalar, seyrek ve uzun çalışmalardan genellikle daha verimlidir. Molayı ödül değil, planın bir parçası sayın.' },
      { baslik: 'Sonuca değil çabaya ve yönteme değer verin', metin: '“Aferin, çok zekisin” yerine “Bu soruyu nasıl çözdün, anlatır mısın?” deyin. Yöntemi konuşmak çocuğun ne yaptığını fark etmesini sağlar.' },
      { baslik: 'Başkalarıyla kıyaslamayın', metin: 'Kardeş, kuzen ya da sınıf arkadaşıyla kıyas yerine çocuğunuzun kendi önceki hâline bakın: “Geçen aya göre daha düzenli çalışıyorsun.”' },
      { baslik: 'Cevap vermek yerine soru sorun', metin: '“Bugün ne öğrendin? Bana öğretir misin?” Öğrendiğini anlatmak, hatırlamaya yardım eden kolay bir ev alıştırmasıdır.' },
      { baslik: 'Birlikte okuyun', metin: 'Akşamları 10-15 dakika sırayla sesli okuyun ya da aynı kitabı okuyup konuşun. Okuma konusunda siz de örnek olun.' },
      { baslik: 'Ekran ve uyku kurallarını birlikte koyun', metin: 'Ders sırasında telefonun yeri, yatmadan önce ekranların bırakılacağı saat gibi kuralları birlikte konuşun ve aile olarak siz de uyun.' },
      { baslik: 'Haftalık planı birlikte yapın, hafta sonunu esnek bırakın', metin: 'Planı çocuğunuz hazırlasın, siz yalnız gerçekçi olup olmadığını sorun. Dinlenme, oyun ve aile zamanı da planın parçasıdır.' },
      { baslik: 'Hatayı öğrenme fırsatı sayın', metin: 'Düşük bir not ya da yanlış bir cevapta “Henüz öğrenmedin, nerede zorlandın?” diye sorun. Yanlış defteri tutmayı birlikte deneyebilirsiniz.' },
      { baslik: 'Zorlanma sürerse destek isteyin', metin: 'Okuma, dikkat ya da duygusal güçlükler uzun süredir devam ediyorsa öğretmeni ve rehber öğretmenle konuşun; gerekirse bir uzmana danışın.' },
    ],
    // S34f: ilkokul (2-4. sınıf) bölümü
    kademeBolumleri: {
      ilkokul: {
        baslik: 'İlkokul çağındaki çocuklar için',
        ikon: 'aile',
        metin: '2, 3 ve 4. sınıftaki çocuklar için uygulamayı birlikte kullanmaya yönelik öneriler.',
        maddeler: [
          'Kısa tutun: Bu yaşta 10-15 dakikalık çalışmalar ve sık molalar genellikle yeterlidir. Akıllı Kurs da ilkokulda günlük 10 ya da 15 dakikalık plan sunar.',
          'Birlikte başlayın: Özellikle 2. ve 3. sınıfta yönergeleri birlikte okuyun; çocuğunuz yapsın, siz yanında olun.',
          'Sesli okumayı paylaşın: Bir sayfayı siz, bir sayfayı çocuğunuz okusun. Okuduktan sonra “Neler oldu?” diye sorun.',
          'Hızı zorlamayın: Uygulama ilkokulda okuma hızını küçük adımlarla artırır ve anlama düşükse hızı artırmaz. Evde de süre tutup yarıştırmayın.',
          'Ekran süresini birlikte belirleyin: Uygulamayı da ekran süresinin içinde sayın; çalışmadan sonra hareket ve açık hava zamanı ayırın.',
          'Haftalık planı birlikte yapın: Çalışma Rehberi’ndeki haftalık planı çocuğunuzla doldurun; oyunu ve dinlenmeyi de plana koyun.',
          'Çabayı fark edin: “Bugün dikkatle okudun” gibi somut sözler, puan ve rozetlerden daha anlamlıdır.',
        ],
        not: 'Cornell notu ve sınav hazırlığı sayfaları ortaokul için hazırlandığından ilkokul profilinde görünmez.',
        baglantilar: [{ adres: '#/rehber/haftalik-plan', metin: 'Haftalık plan' }],
      },
    },
    kapanis: 'Uygulamadaki İlerleme sayfasından yazdırılabilir bir veli raporu da alabilirsiniz; rapor yalnızca bu cihazdaki çalışmalardan hazırlanır.',
  },
});
