# 07 — "Reklamları Kaldır" Satın Alımı (Lemon Squeezy)

## Yapılacak İş

Kullanıcı, Lemon Squeezy üzerinden tek seferlik bir ödeme yaparak hesabına kalıcı bir **reklamsız hak (entitlement)** kazanabilsin.

- **Mevcut altyapıyı genişlet.** Lemon Squeezy entegrasyonu bağış için zaten var (`syncron-worker/src/routes/store.ts`, `services/lemonSqueezy.ts`, migration'lar `0006`–`0008`). İmza doğrulama ve webhook akışı yeniden kullanılır. Bağış ürünü ile "Reklamları Kaldır" ürünü, ürün/varyant ID'si ile ayırt edilir. Mevcut bağış akışı bozulmaz.
- **Hak kaydı.** Hak, sunucuda kullanıcı hesabına (Firebase UID) bağlı olarak saklanır. Aynı sipariş iki kez işlense de tek hak oluşur (idempotency). İade ya da geri ödeme webhook'u gelirse hak geri alınır. Tüm işlemler mevcut audit log'a yazılır.
- **Satın alma giriş gerektirir.** Misafir kullanıcı önce giriş yapmaya ya da hesabını bağlamaya yönlendirilir. Ödeme sonrası akış, mevcut `/great-supporter` sayfasındaki polling mantığına benzer biçimde hakkın aktifleştiğini doğrular.
- **İstemci tarafı.** Hak bilgisi profil verisiyle birlikte gelir ve 01 numaralı görevde bırakılan "reklamsız mı?" bağlantı noktasına bağlanır.
- **Reklamsız kullanıcı için davranış:**
  - bölüm arası reklam hiç gösterilmez
  - ödüllü aksiyonlar (ipucu, atlama) reklam izlemeden verilir; ipucu ve atlamanın kendi sınırları geçerli kalabilir
  - "Reklamları Kaldır" butonları gizlenir
- **Bağışçıyla ilişki.** Bağış yapmış kullanıcılara da reklamsız hak verilip verilmeyeceği yapılandırmayla belirlenebilir olmalı (ör. belirli bir tutarın üstü). Mevcut bağışçıların durumu için bir geçiş (migration) planı rapora yazılır.

### Platform Kuralları (önemli)

- **Portal build'leri:** Satın alma ve dış ödeme linki **gösterilmez**. Portalların reklam gelirini engellemek kurallarına aykırıdır. Yetenek nesnesi bunu yönetir.
- **Android (Google Play):** Uygulama içinde Lemon Squeezy'ye yönlendiren satın alma butonu Play dijital ürün politikasına aykırıdır. Android'de satın alma butonu gösterilmez. Ancak web'de satın alıp aynı hesapla giriş yapan kullanıcının hakkı **tanınır**. Play'in güncel politikası agent tarafından kontrol edilip rapora yazılmalıdır. İleride Google Play Billing ile ayrı bir Android ürünü eklenmesi ayrı bir görevdir.
- **Kendi web sitemiz:** Satın alma burada yapılır. Bu nedenle kullanıcı web'de reklam görmese bile satın alma sayfası ve profil ekranında hak durumu bulunur.

## Hedef

- Web'de giriş yapmış kullanıcı ödemeyi tamamlar ve birkaç saniye içinde hesabı reklamsız olur. Bu hak Android'de de aynı hesapla geçerlidir.
- Webhook tekrarlarında ve iadelerde hak tutarlı kalır; sunucu testleriyle doğrulanır.
- Portal ve Android build'lerinde hiçbir dış satın alma yolu görünmez.
- `docs/` altına satın alma akışı ve Lemon Squeezy ürün yapılandırması dokümante edilir.
