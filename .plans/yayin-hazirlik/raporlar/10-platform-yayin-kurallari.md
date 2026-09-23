# Platform Yayın Kuralları Araştırması (2026-09-23 itibarıyla)

Bağlam: bireysel geliştirici (TR), Google Play hesabı henüz yok, ücretsiz oyun + AdMob reklam + Lemon Squeezy bağış, bulmaca oyunu (çocuklara uygun olabilir ama özel olarak çocuk hedefli değil).

---

## TAKVİM GERÇEĞİ

**"Bölümleri bitirince hemen yayınlarım" beklentisi Google Play için GERÇEKÇİ DEĞİL.** Web/CrazyGames/GameDistribution için ise büyük ölçüde gerçekçi (birkaç gün).

Google Play — bugünden (2026-09-23) itibaren en erken yayın tarihi hesaplaması:

| Adım | Süre | Kaynak |
|---|---|---|
| Hesap kaydı + $25 ücret ödeme | ~dakikalar | [Play Console Help](https://support.google.com/googleplay/android-developer/answer/6112435?hl=en) |
| **Kimlik doğrulama (yeni zorunluluk)**: gov. ID + adres kanıtı + telefon, Eylül 2026'dan itibaren tüm yeni bireysel hesaplar için zorunlu | Birkaç saat – 2 iş günü (tam/eksiksiz belgeyle) | [Android Developer Verification](https://developer.android.com/developer-verification), [Biometric Update](https://www.biometricupdate.com/202508/google-unveils-identity-verification-rules-for-android-app-developers) |
| **Kapalı test (zorunlu)**: min. 12 test kullanıcısı, kesintisiz **14 gün** opt-in | 14 gün (bekleme, iş günü değil) | [Play Console Help - App testing requirements](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en) |
| Production'a başvuru sonrası Google incelemesi | 1–3 gün (bazı kaynaklara göre ilk uygulamada 7–14 gün) | [Play Console Help](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en), [tms-outsource.com](https://tms-outsource.com/blog/posts/how-long-does-google-play-app-review-take/) |
| Son yayın (store'da görünme) incelemesi | 1–2 gün | tms-outsource.com |

**Toplam gerçekçi minimum: ~16–20 gün**, çoğu bu sürenin **14 günü zorunlu kapalı test bekleme süresi**. Bu süre erken başlatılmazsa proje bitişiyle çakışır ve gecikme yaratır. 2026'dan itibaren Google testçilerin gerçekten uygulamayı kullandığını da kontrol ediyor (sadece sayı yetmiyor) — bkz. [testerscommunity.com](https://www.testerscommunity.com/blog/google-play-closed-testing-requirements-2026).

Not: "12 testçi" kuralı Kasım 2023 sonrası açılan bireysel hesaplar için geçerli; Aralık 2024'te eski "20 testçi" kuralından düşürüldü. Kurumsal (organization) hesaplar bu zorunluluktan muaf, ama bu proje bireysel geliştirici olduğu için muafiyet yok.

CrazyGames ve GameDistribution için bekleme süresi çok daha kısa (aşağıya bakın) — bu ikisi "bitirince hemen yayınla" senaryosuna uygun, Google Play uygun değil.

---

## 1. Google Play — Yeni Geliştirici Hesabı

- **Ücret:** Tek seferlik $25, iade edilmez. [Play Console Help](https://support.google.com/googleplay/android-developer/answer/6112435?hl=en)
- **Kimlik doğrulama:** Eylül 2026'dan itibaren tüm yeni bireysel hesaplar için zorunlu — devlet kimliği (pasaport/ehliyet/nüfus cüzdanı), adres kanıtı, telefon doğrulama; isim Play Console profilindekiyle birebir eşleşmeli. Süre birkaç saat–2 iş günü. [developer.android.com/developer-verification](https://developer.android.com/developer-verification), [Biometric Update, Ağustos 2026](https://www.biometricupdate.com/202508/google-unveils-identity-verification-rules-for-android-app-developers)
- **Kapalı test zorunluluğu:** Kasım 2023 sonrası açılan bireysel hesaplarda min. 12 testçi, kesintisiz 14 gün. Kurumsal hesaplar muaf. [Play Console Help](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en)
- **Türkiye'de bireysel geliştirici için farklı mı:** Doğrulanamadı — kimlik doğrulama rollout'u ilk aşamada Brezilya, Singapur, Endonezya, Tayland için Eylül 2026'da başlıyor; Türkiye'nin bu ilk dalgada olup olmadığı kaynaklarda belirtilmemiş, "diğer bölgeler için zamanlama açıklanmadı" deniyor. [Biometric Update](https://www.biometricupdate.com/202508/google-unveils-identity-verification-rules-for-android-app-developers)

## 2. Google Play — Zorunlu Beyan ve Formlar

| Form | Ne zaman doldurulur | Yayını bloke eder mi |
|---|---|---|
| Veri güvenliği (Data safety) | İlk sürüm oluşturulurken | Evet — eksikse production'a gönderilemez ([Play Console Help](https://support.google.com/googleplay/android-developer/answer/10787469?hl=en)) |
| İçerik derecelendirme (IARC anketi) | İlk sürüm öncesi | Evet |
| Hedef kitle ve içerik (Target audience) | İlk sürüm öncesi | Evet |
| Reklam beyanı ("İçerir reklam" checkbox'ı) | Store listing | Evet |
| Gizlilik politikası URL'i | Store listing | Evet — AdMob kullanan her uygulamada zorunlu |
| Families/COPPA politikası | Sadece "hedef kitle = çocuklar" seçilirse devreye girer | Seçime bağlı |

**Kritik öneri:** Oyun "çocuklara uygun olabilir" ama özel olarak çocuklara yönelik pazarlanmıyorsa, Target Audience'da **"çocuklar" seçmemek** daha az kısıtlayıcıdır. Çocuklar hedef kitel olarak seçilirse: sadece Families self-certified reklam SDK sürümleri kullanılmalı, reklam kimlikleri (advertising ID) çocuklara/yaşı bilinmeyenlere iletilemez, karma kitlede nötr yaş ekranı zorunlu. [support.google.com/admob/answer/6223431](https://support.google.com/admob/answer/6223431?hl=en), [Play Console Families Policy](https://support.google.com/googleplay/android-developer/answer/9893335?hl=en)

## 3. Google Play — Teknik Zorunluluklar

- **Hedef API seviyesi:** Yeni uygulamalar **31 Ağustos 2026**'dan itibaren Android 16 (API 36) hedeflemeli — bu tarih **geçmiş durumda** (bugün 23 Eylül 2026), yani proje şu an başvursa API 36 zorunlu. Uzatma talebiyle 1 Kasım 2026'ya kadar erteleme mümkün. [Play Console Help - Target API level](https://support.google.com/googleplay/android-developer/answer/11926878?hl=en), [median.co](https://median.co/blog/google-plays-target-api-level-requirement-for-android-apps)
- **AAB zorunluluğu, Play App Signing, 64-bit:** Genel bilgi olarak halen geçerli (AAB format zorunlu, 64-bit native kod desteği şart) — bu proje HTML5/Capacitor kullandığından native kod tarafında Capacitor/Cordova wrapper'ının güncel Android Gradle Plugin ile derlenmesi bu şartları otomatik karşılar; ayrıca doğrulama yapılmadı, capacitor sürümü kontrol edilmeli.
- **Uygulama boyutu sınırları:** Spesifik güncel MB sınırı bu araştırmada doğrulanamadı; Play Console genel olarak AAB için dinamik teslimat üzerinden boyut yönetimi yapıyor, sabit bir üst sınır aranmadı.

## 4. CrazyGames

- **Başvuru süreci:** Developer portal üzerinden HTML5/WebGL build yükleme. [docs.crazygames.com](https://docs.crazygames.com/)
- **İnceleme süresi:** QA geri bildirimi genelde **1–2 gün**. ([Cinevva guide](https://app.cinevva.com/guides/publish-game-crazygames))
- **Teknik şartlar:**
  - SDK entegre edilmemişse toplam dosya boyutu ≤ 50MB; mobil ana sayfada öne çıkmak için ≤ 20MB. SDK entegreyse "initial download size" ilk oynanabilir ana menüye kadar ölçülür. [docs.crazygames.com/requirements/technical](https://docs.crazygames.com/requirements/technical/)
  - Basic Launch için dosya sayısı ≤ 1500.
  - Responsive/çözünürlük: devicePixelRatio:1 cihazlarda ve 16:9 iframe oranında metin/görsel okunabilir olmalı; düşük çözünürlüklü cihazlar (Chromebook) için font boyutları yeterince büyük olmalı. [docs.crazygames.com/requirements/gameplay](https://docs.crazygames.com/requirements/gameplay/)
  - Reklamlar: yalnızca CrazyGames SDK üzerinden istenen reklamlar kabul edilir; video reklamlar oyun akışını kesmemeli, sürpriz gibi görünmemeli. [docs.crazygames.com/requirements/ads](https://docs.crazygames.com/requirements/ads/)
- **Gelir paylaşımı:** Standart: reklam gelirinin %60'ı, satın alma gelirinin %70'i geliştiriciye. SDK entegrasyonu + 2 ay browser-exclusivity kabul edilirse pay %50 artırılabilir (bu proje için opsiyonel, çoklu platform hedefi varsa exclusivity seçilmemeli). Ödeme aylık, min. €100 eşik. [Cinevva guide, 2026](https://app.cinevva.com/guides/publish-game-crazygames)
- **Exclusivity detayı:** CrazyGames varsayılan olarak exclusivity istemiyor; Steam/mobil mağazalar zaten "browser gaming website" sayılmadığından bunlarla eş zamanlı yayın her koşulda serbest. Sadece **Full Launch sonrası 2 ay** boyunca diğer *tarayıcı* oyun portallarında (örn. Poki, GameDistribution'ın kendi portalı gibi tarayıcı siteleri) yayınlamama şartı var — bu şart SDK+exclusivity bonus paketini seçenler için geçerli, temel katılımda yok. [CrazyGames Developer Terms PDF, 18.08.2025](https://files.crazygames.com/documents/developer_terms_20250818.pdf)
- **Red sebepleri:** Doğrulanamadı (spesifik liste bulunamadı), ama teknik şartlara uyulmaması (boyut, responsive, reklam entegrasyonu) ana neden olarak görünüyor.

## 5. GameDistribution

- **Başvuru süreci:** Açık başvuru, developer portal üzerinden build + SDK entegrasyonu + gameId ile yükleme. [static.gamedistribution.com/developer/developers-guidelines.html](https://static.gamedistribution.com/developer/developers-guidelines.html)
- **SDK zorunluluğu:** GameDistribution SDK'sının entegre edilmesi zorunlu (reklam gösterimi + istatistik takibi için). SDK, oyun başlamadan/yüklenirken çağrılmalı; oyun içi butonla sonradan yüklenmesi kabul edilmiyor.
- **Reklam kuralları:** Pre-roll (oyunun başında) ve mid-roll reklamlar bekleniyor; SDK'nın kendi frekans limitleri var, bazen reklam isteği SDK tarafından reddedilebiliyor.
- **İnceleme süresi:** "Request Activation" sonrası **en fazla 3 hafta** (QA + SDK doğrulaması); onay/red e-posta ile bildiriliyor. [Cinevva / arama sonucu özeti]
- **Gelir paylaşımı:** Net gelirin **%33'ü** geliştiriciye. Ödeme aylık rapor sonrası 60 gün içinde, min. €100 eşik.
- **Exclusivity:** Yok — GameDistribution varsayılan olarak non-exclusive syndication yapıyor, aynı oyun başka portallarda aynı anda yayınlanabilir.
- **Teknik detaylar (dosya boyutu, çözünürlük):** Spesifik MB/piksel sınırı bu araştırmada doğrulanamadı — sayfa fetch edilemedi (bağlantı hatası), yalnızca arama motoru özetine dayanan genel bilgi var. **Bu kısım için resmi guidelines sayfasının tekrar kontrolü önerilir.**

## 6. Çakışmalar

- **AdMob + CrazyGames/GameDistribution birlikte kullanımı:** Çakışma yok ama karışıklık riski var. AdMob yalnızca **Google Play/Android build**'de (Capacitor native reklam SDK'sı olarak) kullanılabilir; CrazyGames ve GameDistribution kendi reklam SDK'larını zorunlu kılıyor ve "yalnızca kendi SDK'ları üzerinden istenen reklamlar kabul edilir" diyor. Yani **web build'inde AdMob değil, her platformun kendi SDK'sı** kullanılmalı — tek bir "reklam katmanı" tüm platformlarda çalışmaz, platform bazlı ayrı entegrasyon gerekir.
- **Çocuk kullanıcı / veri toplama kuralları:** Google Play Families politikası yalnızca "hedef kitle = çocuklar" seçilirse devreye giriyor; CrazyGames/GameDistribution'da bu araştırmada COPPA benzeri ayrı bir form bulunamadı (doğrulanamadı). Eğer proje Google Play'de "çocuklar" hedef kitlesi seçmezse (önerilen), dört platform arasında çocuk veri politikası çakışması riski düşük.
- **Aynı oyunun 4 yerde birden yayınlanması:** Bilinen bir engel yok. CrazyGames'in "browser exclusivity bonus" paketi seçilmezse tüm platformlarda serbestçe eş zamanlı yayın mümkün. GameDistribution zaten non-exclusive. Google Play ve web(Capacitor) farklı build hedefleri olduğu için de çakışma yok.
- **Gelir paylaşımı farkı:** GameDistribution (%33) < CrazyGames standart (%60 reklam/%70 satın alma) — ticari öncelik CrazyGames'te, ama bu bir "engel" değil, strateji notu.

---

## ŞİMDİ BAŞLATILMASI GEREKEN İŞLER (bekleme süresi olduğu için)

1. **Google Play Console hesabı hemen açılmalı** — $25 ödeme + kimlik doğrulama süreci (birkaç saat–2 gün) en erken başlatılmalı, çünkü kapalı test süresi ancak hesap onaylandıktan sonra başlar.
2. **Kapalı test (12 testçi, 14 gün) en geç oyunun "yayına hazır" (feature-complete olmasa da çalışan bir build) haline gelir gelmez başlatılmalı** — bu 14 gün proje bitiş takviminin kritik yol (critical path) parçası, geciktirilirse tüm Google Play lansmanı gecikir. Test build'i eksiksiz olmasa da (temel oynanabilirlik yeterli) süreci başlatmak faydalı.
3. **Gizlilik politikası metni ve barındırılacağı URL** şimdiden hazırlanmalı (Play Console store listing bunu ilk günden istiyor).
4. **Hedef API seviyesi (API 36) uyumluluğu** Capacitor/Android build tarafında şimdiden doğrulanmalı — geçmiş deadline (31 Ağustos 2026) nedeniyle bugün başvurulsa dahi API 36 zorunlu, sonradan fark edilirse ek gecikme yaratır.
5. **Target Audience / Data Safety / Content Rating formlarının taslağı** önceden hazırlanmalı (hangi veriler toplanıyor, AdMob + Lemon Squeezy'nin veri paylaşım detayları) — form doldurma hızlı olursa production review süresi kısalır.
6. **CrazyGames ve GameDistribution developer hesapları** paralel olarak açılabilir; bu ikisinin bekleme süresi kısa (1-2 gün / 3 hafta) olduğu için proje bitişine yakın başlatılabilir ama GameDistribution'ın "3 haftaya kadar" sürebilecek incelemesi nedeniyle o da erken başlatılırsa risk azalır.

---

### Doğrulanamayan / eksik kalan noktalar
- Türkiye'nin Google Play kimlik doğrulama rollout takvimindeki yeri.
- Google Play güncel AAB boyut sınırı (MB).
- GameDistribution'ın tam dosya boyutu/çözünürlük şartları (sayfa fetch hatası nedeniyle doğrudan doğrulanamadı, yalnızca arama özeti kullanıldı).
- CrazyGames ve GameDistribution'ın spesifik red (rejection) sebep listesi.
- CrazyGames/GameDistribution'da COPPA benzeri ayrı bir çocuk verisi formu olup olmadığı.
