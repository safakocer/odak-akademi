# yayin-rehberi.md — Odak Akademi'yi internete koyma (S26; yalnız geliştirme, yayına konmaz)

Üç yol anlatılıyor. **Önerilen: Netlify** (en kolayı) ya da **Cloudflare Pages**. İkisi de `_headers` dosyasındaki güvenlik ayarlarını okur. GitHub Pages bu ayarları okumaz, bu yüzden yedek yoldur. Üçünde de https kendiliğinden gelir; “Ana ekrana ekle” ve çevrimdışı çalışma için https şarttır.

## 1. Yayından önce (bir kez)

1. **Gizlilik metni.** `gizlilik.html`'i bir metin düzenleyicide açın. Köşeli parantezli yerleri (sunan, iletişim, barındırma, tarih) doldurun. Barındırma hizmeti olarak seçtiğiniz yolu (Netlify / Cloudflare / GitHub) yazın. Metni bir hukukçuya ya da KVKK uzmanına inceletin.
2. **Test.** `test-plani.md`'deki 30 maddeyi bilgisayarınızda ya da deneme sitesinde uygulayın.
3. **Yayın klasörü.** Proje klasörünü kopyalayın ve kopyanın adını `odak-akademi-yayin` yapın. Kopyadan şu geliştirme dosyalarını silin:
   - `components.html`, `tests.html`
   - `PROJE_DEFTERI.md`, `KARAR_ARSIVI.md`, `guvenlik-erisilebilirlik.md`, `test-plani.md`, `yayin-rehberi.md`, `surum-notlari.md`

   Kalanlar şunlardır: `index.html`, `gizlilik.html`, `sw.js`, `manifest.webmanifest`, `_headers`, `.nojekyll` ve `css`, `js`, `data`, `icons`, `fonts` klasörleri. `fonts` klasöründeki lisans dosyasını (`ofl-…txt`) silmeyin; yazı tipiyle birlikte dağıtılması zorunludur.

   > `.nojekyll` gizli dosyadır, Windows'ta görünmeyebilir. Silmeyin; yalnız GitHub Pages kullanır, diğerlerine zararı yoktur.

## 2. Yol A — Netlify (klasörü sürükle-bırak)

**İlk yayın**
1. netlify.com adresine gidin ve **Sign up** ile ücretsiz hesap açın. Önce hesap açın: hesapsız yüklenen site bir saat içinde silinir.
2. Giriş yapınca **Projects** (Projeler) sayfasında **Add new project** > **Deploy manually** seçin. Bu, sürükle-bırak alanını açar; doğrudan `app.netlify.com/drop` adresi de olur.
3. `odak-akademi-yayin` klasörünü (klasörün kendisini, içindekileri tek tek değil) bu alana sürükleyin.
4. Birkaç saniye sonra `…netlify.app` ile biten bir adres verilir. Adrese tıklayıp uygulamanın açıldığını görün.
5. Ad değiştirmek için: **Project configuration** > **Change project name** yolunu izleyin, örneğin `odak-akademi`. Adres `odak-akademi.netlify.app` olur.

**Güncelleme**
1. Sitenizin **Deploys** sayfasını açın.
2. En alttaki “sürükle-bırak” alanına yeni `odak-akademi-yayin` klasörünü sürükleyin. Tek dosya yüklenemez, her seferinde klasörün tamamı yüklenir.

## 3. Yol B — Cloudflare Pages (klasörü sürükle-bırak)

**İlk yayın**
1. dash.cloudflare.com adresinde ücretsiz hesap açın.
2. Sol menüden **Workers & Pages** sayfasına gidin.
3. **Create application** > **Get started** > **Drag and drop your files** seçin. Seçenek adları değişmişse “Pages” ve “Upload/Direct Upload” sözcüklerini arayın.
4. Proje adını yazın (örneğin `odak-akademi`) ve **Create project**'e basın.
5. `odak-akademi-yayin` klasörünü yükleme alanına sürükleyin, ardından **Deploy site**'a basın. Sınır 1000 dosyadır; projede yaklaşık 140 dosya var.
6. Adres `odak-akademi.pages.dev` olur.

**Güncelleme**
1. Workers & Pages'te projeyi açın.
2. **Create deployment** (Production) seçip klasörü yeniden sürükleyin.

## 4. Yol C — GitHub Pages (yedek yol)

1. github.com'da hesap açın. **+** > **New repository** seçin, ad olarak `odak-akademi` yazın, **Public** seçip **Create repository**'ye basın.
2. **uploading an existing file** bağlantısına (ya da **Add file > Upload files**) tıklayın. Web yüklemesi tek seferde en çok 100 dosya alır, bu yüzden iki parti gerekir:
   - **1. parti:** yalnız `js` klasörünü (85 dosya) sürükleyin, **Commit changes**'e basın.
   - **2. parti:** yeniden **Add file > Upload files** deyip kalan her şeyi (57 dosya) sürükleyin, **Commit changes**'e basın. Gizli `.nojekyll` dosyasının da yüklendiğini listede kontrol edin.
3. **Settings** > **Pages** yolunu izleyin. **Source**: “Deploy from a branch”, **Branch**: `main`, klasör `/ (root)` seçip **Save**'e basın.
4. 1-2 dakika sonra adres `<kullanıcı-adınız>.github.io/odak-akademi/` olur.

**Kısıtlar:** GitHub Pages `_headers` dosyasını okumaz. Bu yüzden sayfanın başka sitelerde çerçeve içine alınmasını engelleyen başlık eklenemez. Uygulama yine güvenli çalışır (CSP sayfanın içinde); ancak bu nedenle ilk tercih Netlify ya da Cloudflare'dir. Ayrıca aynı hesaptaki başka bir GitHub Pages sitesi aynı tarayıcı depolama alanını paylaşır. Uygulama tüm anahtarlarına “odak:” öneki koyduğu için çakışma olmaz, ama bu hesapta başka bir Odak Akademi kopyası yayınlamayın.

## 5. Yeni sürüm yayınlama (her güncellemede)

Bu adımlar atlanırsa kullanıcılar eski sürümde kalır.

1. Değişen dosyaları proje klasörüne koyun.
2. `sw.js`'yi açın ve `const SURUM = '…'` satırındaki sayıyı artırın. Hata düzeltmesinde son sayı artar (`1.0.0-s26` → `1.0.1-s27`); yeni özellikte ortadaki sayı artar, son sayı 0 olur (`1.1.0-s28`).
3. Yeni bir dosya eklendiyse adını `sw.js`'deki listeye yazın: açılışta gerekiyorsa `ZORUNLU`'ya, değilse `DOSYALAR`'a.
4. Yayın klasörünü 1. bölüm 3. adımdaki gibi yeniden hazırlayıp seçtiğiniz yolla yükleyin.
5. Uygulamayı açın. Uygulama açıksa yaklaşık 1 saat içinde, kapatılıp açılınca hemen “Uygulamanın yeni sürümü hazır” bandı çıkar. “Güncelle”ye basın; Ayarlar > Uygulama'da yeni sürüm adını görün.

**Nasıl çalışır?** Service worker, uygulamanın tüm dosyalarını sürüm adlı bir önbelleğe koyar (örneğin `odak-akademi-1.0.0-s26@/`). `sw.js`'deki tek bir harf bile değişince tarayıcı yeni sürümü arka planda indirir. Bu sırada eski sürüm çalışmaya devam eder. Öğrenci “Güncelle” deyince yeni sürüm devreye girer ve eski önbellek silinir. Öğrenci verileri (profiller, sonuçlar, notlar) önbellekte değil tarayıcı deposunda durur; güncellemede silinmez. `_headers` dosyası `sw.js`'nin her açılışta sunucuya sorulmasını sağlar.

**Sorun olursa:** Ayarlar'da sürüm eski görünüyorsa sayfayı kapatıp açın. Uygulama açılmıyorsa hata ekranındaki “Uygulama dosyalarını yeniden indir” düğmesi önbelleği temizler; veriler silinmez.

## 6. Alan adı bağlama (örnek: odakakademi.com.tr)

Alan adını bir alan adı firmasından satın alın. Firmanın panelinde “DNS yönetimi” ya da “DNS kayıtları” bölümünü bulun.

**Netlify**
1. Sitenizde **Domain management** > **Add a domain** seçip alan adını yazın.
2. Netlify, eklemeniz gereken DNS kayıtlarını gösterir: `www` için bir CNAME, alan adının kendisi için bir A kaydı. Bu değerleri aynen alan adı firmasının paneline girin. Değerleri buraya değil ekrana bakarak yazın, çünkü değişebilirler.
3. Doğrulama 1-24 saat sürebilir. Sonra Netlify https sertifikasını kendiliğinden kurar (**HTTPS** bölümünde “Certificate” görünür).

**Cloudflare Pages**
1. Projede **Custom domains** > **Set up a custom domain** seçip alan adını yazın.
2. Alan adının DNS'i Cloudflare'deyse kayıt kendiliğinden eklenir. Değilse `www` için projenizin `….pages.dev` adresine CNAME eklemeniz istenir. Kök alan adını (`www`'siz) kullanmak için alan adını Cloudflare'e taşımanız gerekir; ekran bunu adım adım gösterir.

**GitHub Pages**
1. **Settings** > **Pages** > **Custom domain** alanına alan adını yazıp **Save**'e basın.
2. DNS'e `www` için `<kullanıcı-adınız>.github.io` CNAME kaydı ekleyin. Kök alan adı için GitHub'ın belgelerindeki dört A kaydını (185.199.108.153, 185.199.109.153, 185.199.110.153, 185.199.111.153) ekleyin.
3. Doğrulandıktan sonra **Enforce HTTPS** kutusunu işaretleyin.

**Önemli:** Alan adı değişirse tarayıcı bunu yeni bir site sayar. Eski adresteki veriler yeni adrese kendiliğinden geçmez. Önce alan adını bağlayın, sonra öğrencilere duyurun. Adres değişikliği gerekirse öğrencilere eski adreste Ayarlar > “Yedeği indir”, yeni adreste “Yedeği yükle” yaptırın.

## 7. Yayından sonra 5 dakikalık kontrol (kabul ölçütleri)

1. Telefonda yayındaki adresi açın, profil oluşturun, Ayarlar'da “İnternet olmadan da açılmaya hazır” yazısını görün.
2. **Ana ekrana ekle** (Android: Ayarlar'daki düğme; iPhone: Paylaş > Ana Ekrana Ekle). Simgeye dokunun; uygulama kendi penceresinde açılmalı.
3. Uçak modunu açın, uygulamayı kapatıp açın; ana sayfa ve bir egzersiz çalışmalı.
4. Bilgisayarda Chrome gizli pencerede Lighthouse çalıştırın (test-plani.md 3. bölüm); Accessibility 90 ya da üstü olmalı.
5. Tarayıcıda securityheaders.com'a yayındaki adresi yazın; Netlify/Cloudflare'de `_headers` başlıklarının göründüğünü kontrol edin.
