# Firebase Cloud Functions (Arka Plan Görevleri)

Bu dizin, projenin Firebase Cloud Functions (v2) altyapısını içerir. Burada, veri tabanı tetikleyicileri (Firestore Triggers), zamanlanmış görevler (Scheduler/Cron) ve istemci tarafından doğrudan çağrılabilen güvenli işlevler (Callables) yer alır.

## Klasör Yapısı ve Dosyaların Mantığı

```
functions/
├── src/
│   ├── index.ts        # Tüm bulut fonksiyonlarının ve tetikleyicilerinin ana giriş noktası.
│   ├── email.ts        # E-posta gönderimi (Resend API entegrasyonu) ve şablon yönetimi.
│   └── logClient.ts    # İşlemlerin denetim loglarını Cloudflare Worker'a güvenli gönderen istemci.
├── package.json        # Bağımlılıklar ve derleme betikleri.
└── tsconfig.json       # TypeScript derleme yapılandırması.
```

## Ana Bileşenler ve Mimari Açıklaması

1. **index.ts (Bulut Fonksiyonları Ana Girişi):**
   * **Kullanıcı Tetikleyicileri (`onUserCreated`, `onUserUpgraded`):** Firestore'da yeni bir kullanıcı kaydı açıldığında veya anonim bir hesap Google/Email ile birleştirildiğinde otomatik tetiklenir. Kullanıcıya benzersiz bir oyuncu etiketi (tag) atar ve sisteme log üretir.
   * **Özel Etiket Talebi (`requestNewTag`):** İstemci uygulamasından doğrudan çağrılan (onCall) bu fonksiyon, kullanıcının kendi belirlediği bir etiketi almasını sağlar. İsim kuralı, çakışma ve bekleme süresi (cooldown) kontrollerini atomik bir Firestore işlemiyle gerçekleştirir.
   * **Destek Mesajı Tetikleyicisi (`onTicketMessageCreated`):** Destek taleplerine yeni mesaj yazıldığında çalışır. Admin yanıtı ise kullanıcıya e-posta bildirimi gönderir; kullanıcı yanıtı ise admin panelinde okunmamış işaretler.
   * **Zamanlanmış Temizlik Görevi (`cleanupOldAnonymousUsers`):** Her gün UTC 04:05'te çalışarak 30 günden eski ve inaktif olan anonim kullanıcıların hem Firestore dökümanlarını hem de Firebase Auth hesaplarını temizler.

2. **email.ts (E-posta Yönetimi):**
   * **Resend API Entegrasyonu:** Destek talebi yanıtları için Resend servisini kullanır. E-postalar Türkçe ve İngilizce olarak iki dilde gönderilir.
   * **Güvenlik:** E-posta gövdesine yazılacak kullanıcı mesajları XSS saldırılarına karşı `escapeHtml` fonksiyonu ile temizlenir.

3. **logClient.ts (Güvenli Log Gönderimi):**
   * Bulut fonksiyonlarında gerçekleşen kritik işlemleri (hesap açılışı, rol değişimi vb.) Cloudflare Worker log sistemine iletir.
   * **Güvenlik (HMAC-SHA256):** İsteklerin Firebase'den geldiğini doğrulamak amacıyla istek gövdesi ve zaman damgası paylaşılan bir gizli anahtarla imzalanarak gönderilir.
