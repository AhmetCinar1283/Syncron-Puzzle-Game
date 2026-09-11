# 03 — Android AdMob

## Yapılacak İş

Android (Capacitor) uygulamasında AdMob'u, adaptör katmanının bir sağlayıcısı olarak devreye al. `@capacitor-community/admob` paketi zaten kurulu ama kullanılmıyor.

- **AdMob sağlayıcısı.** Bölüm arası ve ödüllü reklamı destekler. Banner, oyun deneyimini bozmayacaksa isteğe bağlıdır; bu kararı ve gerekçesini rapora yaz.
- **Kimlikler ortam değişkenlerinden okunur.** App ID ve reklam birimi ID'leri koda gömülmez. Geliştirme ve debug build'lerinde **her zaman Google'ın test ID'leri** kullanılır. Gerçek ID'lere yanlışlıkla tıklanıp hesabın askıya alınma riski olmamalıdır.
- **AndroidManifest.** Şu an test App ID'si içeriyor. Bu ID build yapılandırmasından gelecek şekilde düzenlenir.
- **Kullanıcı rızası.** GDPR/KVKK için AdMob UMP (User Messaging Platform) akışı eklenir. Rıza verilmediyse kişiselleştirilmemiş reklam gösterilir. Mevcut `kvkk` ve `privacy` sayfaları gerekirse güncellenir.
- **`app-ads.txt`.** Google Play'deki geliştirici web sitesinin kök alanında (polimelo.com) yayınlanması gerekir. Nasıl yapılacağını dokümante et. Bu adımı kullanıcı kendisi yapacak.
- **Ödüllü reklamda Sunucu Tarafı Doğrulama (SSV).** Değerlendir. İlk aşamada ödüllü reklamlar skor vermediği (bkz. 04 ve 05 numaralı görevler) için zorunlu değil. Değerlendirmeyi rapora yaz.
- **Android yaşam döngüsü.** Uygulama arka plana alınıp geri geldiğinde reklam durumu tutarlı kalır. Fiziksel geri tuşu (`BackButtonManager`) reklam açıkken beklenmeyen bir şey yapmaz.

## Hedef

- Android build'inde bölüm arası ve ödüllü reklamlar, test ID'leriyle uçtan uca çalışır ve 01'deki sıklık politikasına uyar.
- Gerçek ID'ye geçiş yalnızca ortam değişkeni değiştirmekle yapılır.
- Rıza akışı ilk açılışta çalışır.
- `docs/platforms.md` AdMob kurulumunu, ID yönetimini ve `app-ads.txt` adımını içerir.
