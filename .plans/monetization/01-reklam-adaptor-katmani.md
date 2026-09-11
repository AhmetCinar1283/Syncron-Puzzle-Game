# 01 — Reklam Adaptör Katmanı

## Yapılacak İş

Oyunun, hangi platformda çalıştığından bağımsız olarak reklam ve platform olaylarını tek bir arayüz üzerinden kullanabilmesini sağlayan `src/services/monetization/` modülünü kur.

Modülün kapsayacakları:

- **Ortak sağlayıcı (provider) arayüzü.** Asgari yetenekler:
  - başlatma
  - yükleme bitti bildirimi
  - oynanış başladı/durdu bildirimi
  - bölüm arası (interstitial) reklam gösterme
  - ödüllü (rewarded) reklam gösterme; sonuç "ödül kazanıldı mı" bilgisiyle döner
  - "mutlu an" bildirimi (level tamamlandı gibi)

  Bunlar CrazyGames, GameDistribution ve AdMob SDK'larının ortak paydasıdır. Arayüzü tasarlarken bu üç SDK'nın ve ileride eklenecek Poki ile Google H5 Games (adBreak) SDK'larının dokümantasyonunu incele.
- **Platform yetenek nesnesi.** Örneğin: ödüllü reklam var mı, bölüm arası reklam var mı, dış link açılabilir mi, satın alma gösterilebilir mi, bağış sayfası gösterilebilir mi, giriş zorunlu tutulabilir mi, leveller build'e gömülü mü. Uygulamanın geri kalanı platform adını değil bu yetenekleri sorgular.
- **Sağlayıcı seçimi.** Build-time bir env değişkeniyle yapılır (ör. `NEXT_PUBLIC_PLATFORM = web | android | electron | crazygames | gamedistribution`). Bu görevde yalnızca **noop** sağlayıcısı (web ve Electron için) ile geliştirme sırasında kullanılacak **sahte (mock/debug)** sağlayıcı yazılır. Gerçek sağlayıcılar 02 ve 03 numaralı görevlerde eklenir.
- **Reklam sıklığı politikası.** Ayrı, saf ve test edilebilir bir modül olmalı. Başlangıç kuralları:
  - ilk 5 levelde bölüm arası reklam yok
  - 3 level tamamlamada bir reklam
  - iki reklam arasında en az 90 saniye
  - hata veya yeniden başlatma sonrasında reklam yok

  Değerler tek bir yapılandırmadan okunur.
- **Reklamsız hak (entitlement) sorgusu için bağlantı noktası.** Politika reklam göstermeden önce "bu kullanıcı reklamsız mı?" diye sorabilmelidir. Hakkın gerçek kaynağı 07 numaralı görevde bağlanır; bu görevde varsayılan değer "hayır"dır.
- **React tarafı erişim.** Feature'ların servise erişeceği ince bir context/hook katmanı.
- **Mevcut oyun akışına bağlama.** Level yükleme bitti, oynanış başladı/durdu ve level tamamlandı olayları, **mevcut play akışını değiştirmeden** adaptöre iletilir. Bölüm arası reklam, level tamamlandıktan sonra, sonuç ekranından sonraki levele geçişte politikaya göre tetiklenir.
- **AdSense.** Mevcut `AdSenseLoader` ele alınır: ya noop'a çevrilir ya da ileride kullanılmak üzere ayrı bir sağlayıcı taslağına taşınır. Hiçbir portal build'inde yüklenmemelidir.

## Hedef

- Uygulamada reklamla ilgili tüm çağrılar tek bir modülden geçer. Yeni bir platform eklemek = **bir sağlayıcı dosyası + yetenek tanımı + bir env değeri** eklemek.
- Web ve Electron build'leri davranış olarak aynı kalır (reklamsız).
- Sahte sağlayıcıyla geliştirici, reklam akışını (bölüm arası ve ödüllü, başarılı ve başarısız senaryolar) tarayıcıda uçtan uca görebilir.
- Sıklık politikası birim testleriyle doğrulanmıştır.
- Modülün `README.md`'si yeni bir sağlayıcının nasıl ekleneceğini anlatır.
