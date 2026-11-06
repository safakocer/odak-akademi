// Çalışma Rehberi içerikleri (S22): sınav hazırlığı, sağlıklı alışkanlık kartları, aile rehberi ve ders adı önerileri; yalnız veri (DOM yok)

/** Plan ve not formlarındaki ders adı önerileri (datalist; öğrenci başka ad da yazabilir) */
export const DERS_ONERILERI = Object.freeze([
  'Türkçe', 'Matematik', 'Fen Bilimleri', 'Sosyal Bilgiler', 'T.C. İnkılap Tarihi', 'İngilizce',
  'Din Kültürü', 'Kitap okuma', 'Haftanın tekrarı', 'Ödev', 'Deneme analizi',
]);

/**
 * Bilgi sayfası: { giris, uyari?: {baslik, metin}, bolumler: [{ baslik, ikon?, metin?, maddeler?[], baglantilar?[{adres, metin}] }],
 *   numarali? (bölümler sıralı öneri listesi olarak), listeBasligi?, kapanis? }
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
    kapanis: 'Uygulamadaki İlerleme sayfasından yazdırılabilir bir veli raporu da alabilirsiniz; rapor yalnızca bu cihazdaki çalışmalardan hazırlanır.',
  },
});
