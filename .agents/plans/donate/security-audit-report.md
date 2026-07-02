# Lemon Squeezy Bağış & Satış Sistemi - Güvenlik ve Kod Denetim Raporu

**Tarih:** 18 Haziran 2026  
**Hazırlayan:** Güvenlik ve Kod Kontrolcüsü (Antigravity AI)  
**Durum:** Çözüldü & Test Edildi (73/73 Test Başarılı)

---

## 1. Giriş

Bu rapor, **Know & Conquer** platformuna yeni entegre edilen Lemon Squeezy bağış, dijital koin (SYNC) ve kümülatif rozet sisteminin güvenlik ve kod kalitesi denetimini içermektedir. Projenin `.agents/plans/donate/` dizinindeki mimari belgeler temel alınarak kaynak kod seviyesinde güvenlik, veri gizliliği (KVKK/GDPR) ve veri tutarlılığı denetimleri gerçekleştirilmiş, tespit edilen açıklar giderilmiş ve tüm senaryolar unit testleriyle doğrulanmıştır.

---

## 2. Tespit Edilen Güvenlik Açıkları ve Düzeltmeler

Denetim esnasında kaynak kodda tespit edilen 4 adet kritik bulgu ve uygulanan çözüm yöntemleri aşağıda detaylandırılmıştır.

### Bulgular Tablosu

| ID | Bulgu Tanımı | Etki Derecesi | Durum |
| :--- | :--- | :--- | :--- |
| **SEC-01** | HMAC İmza Kontrolü Sıralaması & DoS / Log Zehirlenmesi | Yüksek | **Çözüldü** |
| **SEC-02** | GDPR / KVKK Uyumsuzluğu - Anonim Üye UID Sızıntısı | Orta | **Çözüldü** |
| **SEC-03** | Eşzamanlı İsteklerde Yarış Durumu (Race Condition) / Bakiye Kaybı | Orta | **Çözüldü** |
| **SEC-04** | Sıfır Miktarlı (0-Cents) Siparişlerde Webhook Çökmesi | Düşük | **Çözüldü** |

---

### Mimaride Tespit Edilen Detaylar & Uygulanan Çözümler

### SEC-01: HMAC İmza Kontrolü Sıralaması & DoS / Log Zehirlenmesi
* **Zafiyet Detayı:** Orijinal akışta, istek Lemon Squeezy'den gelmemiş (imzasız veya sahte imzalı) olsa dahi ham request body veritabanındaki `store_events` tablosuna `sig_valid = 0` şeklinde kaydediliyordu. Bu durum:
  1. Bir saldırganın sahte webhook istekleriyle veritabanını şişirmesine (DoS).
  2. Saldırganın gerçek bir sipariş numarasını taklit ederek `sig_valid = 0` ile kaydetmesine, ardından Lemon Squeezy'den gelen orijinal webhook'un `UNIQUE(ls_event_id)` kısıtı nedeniyle yoksayılmasına ve logların zehirlenmesine (Audit Log Poisoning) sebep oluyordu.
* **Uygulanan Çözüm:** İmza doğrulama kontrolü (`verifyLsSignature`) fonksiyonun en başına taşınmıştır. İmza doğrulaması başarısız olan tüm istekler veritabanına hiçbir veri yazılmadan anında `401 Unauthorized` olarak kesilmektedir.

### SEC-02: GDPR / KVKK Uyumsuzluğu - Anonim Üye UID Sızıntısı
* **Zafiyet Detayı:** Kullanıcı bağış yaparken "Anonim" seçeneğini işaretlese dahi, `/donors/top` ve `/donors/:uid` endpoint'leri üzerinden kullanıcının Firebase `uid` bilgisi dış dünyaya sızdırılıyordu. Bu durum, üçüncü şahısların anonim bağışçıların gerçek kimliklerini (diğer API'lerden UID ile sorgulayarak) eşleştirebilmesine olanak tanıyordu.
* **Uygulanan Çözüm:** 
  1. `/donors/top` endpoint'inin SQL sorgusuna `CASE WHEN is_anonymous = 1 THEN NULL ELSE uid END` mantığı eklenerek anonim kişilerin UID'leri veritabanı seviyesinde gizlendi.
  2. `/donors/:uid` endpoint'ine `optionalFirebaseAuth` middleware'i entegre edildi. Sorgulanan profil anonim ise, hassas bilgiler sadece profilin gerçek sahibine gösterilmekte; dışarıdan gelen isteklerde ise maskeli boş veri dönülmektedir.

### SEC-03: Eşzamanlı İsteklerde Yarış Durumu (Race Condition) / Bakiye Kaybı
* **Zafiyet Detayı:** `upsertDonorProfile` içerisinde, kullanıcının toplam bakiye bilgisi önce `SELECT` ile okunup, kod tarafında toplanıp ardından `UPDATE` yapılıyordu. Aynı kullanıcıya ait iki farklı webhook eşzamanlı geldiğinde (Lost Update) bir bakiye güncellemesinin ezilmesine ve kullanıcının satın aldığı SYNC koinlerin eksik tanımlanmasına yol açabilirdi.
* **Uygulanan Çözüm:** SQL seviyesinde atomik UPSERT yapısına (`INSERT INTO ... ON CONFLICT(uid) DO UPDATE`) ve `RETURNING` ifadesine geçiş yapılmıştır. SQLite güncellemeyi doğrudan sıra kilitleriyle yapacağı için yarış durumu tamamen engellenmiştir.

### SEC-04: Sıfır Miktarlı (0-Cents) Siparişlerde Webhook Çökmesi
* **Zafiyet Detayı:** Veritabanındaki `amount_cents CHECK (amount_cents > 0)` kısıtı nedeniyle, Lemon Squeezy'den gelen $0.00 tutarındaki (ücretsiz kuponlar veya deneme ürünleri) siparişler veritabanı yazımında çökmeye sebebiyet veriyordu. Hata sonucunda webhook `500` döndüğü için Lemon Squeezy bu istekleri sürekli tekrar ediyordu.
* **Uygulanan Çözüm:** Gelen sipariş tutarı sıfır veya negatif ise, istek hata fırlatılmadan doğrudan `200 OK` dönülerek güvenli bir şekilde yoksayılmaktadır.

---

## 3. Doğrulama ve Test Sonuçları

Değişikliklerin doğruluğunu kanıtlamak üzere `syncron-worker/test/donorApi.spec.ts` adında yeni bir test suite oluşturulmuş ve çalıştırılmıştır.

### Test Senaryoları ve Durumları

1. **İmza Doğrulama Başarısızlığı:** İmzasız isteklerin DB'ye yazılmadan 401 döndüğü kanıtlandı. (Geçti)
2. **Sıfır Tutar Koruması:** Tutarın 0 olması durumunda işlemin DB'ye yazılmadan 200 ile yoksayıldığı kanıtlandı. (Geçti)
3. **Başarılı Webhook Akışı:** Doğru imzada rozetlerin (starter + tier) atandığı, coinin eklendiği ve loglandığı kanıtlandı. (Geçti)
4. **Yarış Durumu (Concurrency):** Peş peşe ve eşzamanlı gelen işlemlerde bakiyenin kayıpsız toplandığı kanıtlandı. (Geçti)
5. **Leaderboard Maskeleme:** Anonim üyelerin UID ve isimlerinin leaderboard üzerinde gizlendiği doğrulandı. (Geçti)
6. **Bireysel Profil Yetkilendirmesi:** Anonim profil detaylarının sadece profil sahibine gösterilip yabancı sorgulara maskelendiği doğrulandı. (Geçti)

**Vitest Genel Raporu:**
```bash
 Test Files  8 passed (8)
      Tests  73 passed (73)
   Duration  6.26s
```

---

## 4. Sonuç ve Öneriler

Yapılan kod denetimi ve sonrasındaki düzeltmelerle birlikte Lemon Squeezy entegrasyonu endüstri standartlarında güvenli, yasal uyumlu (GDPR/KVKK) ve yarış durumlarına karşı dayanıklı hale getirilmiştir. 

**Canlıya Geçiş İçin Ek Güvenlik Tavsiyeleri:**
1. Cloudflare Workers paneli üzerinden `LS_WEBHOOK_SECRET` ve `LS_API_KEY` değişkenlerinin wrangler CLI (`wrangler secret put`) aracılığıyla güvenli şekilde atandığından ve kaynak kodda açıkça yazılmadığından emin olunmalıdır.
2. Lemon Squeezy panelinde webhook adresi kaydedilirken sadece HTTPS protokolünün kullanılması zorunlu tutulmalıdır.
