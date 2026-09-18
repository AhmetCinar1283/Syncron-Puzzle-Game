# 03 — Hız Limiti ve Kötüye Kullanım Direnci

> Bu görev `.plans/yayin-hazirlik/00-ilkeler.md` ve `.plans/monetization/00-mimari-ilkeler.md`
> ilkelerine uyar. Belirsizlik anında proje sahibine sor.

---

## 1. Sorun

### 1.1 Hız limiti neredeyse hiç yok

Worker'da 14 route dosyası var. Hız limiti yalnızca iki yerde:

| Yer | Durum |
|---|---|
| `src/middleware/rateLimiter.ts` | Yalnızca `/internal/log` için kullanılıyor (100/dk global, 20/dk uid) |
| `src/routes/tickets.ts` | Kendi içinde **ayrı ve bağımsız** bir implementasyon (`ticketRateLimits` Map) |

Geri kalan her şey korumasız. Aynı işin iki farklı yerde iki farklı şekilde yazılmış olması
ayrıca 00-ilkeler §2 (tek sorumluluk, tekrar etmeme) ihlali.

### 1.2 En pahalı uç nokta tamamen açık

`POST /complete-level` (`src/routes/game.ts`) kimlik doğrulaması dışında hiçbir limite tabi
değil ve **istek başına** şunları yapıyor:

- Google servis hesabı token'ı alma
- Firestore'dan seviye dokümanı okuma
- `verifyMoves` ile 500 hamleye kadar, hamle başına 50 tick'e kadar oyun motoru simülasyonu
- 4 paralel okuma (D1 + Firestore)
- D1 upsert + Firestore commit
- Ardından audit log + liderlik güncellemesi

Kimliği doğrulanmış tek bir hesap bunu döngüde çağırarak Firestore okuma kotanı, D1 yazma
bütçeni ve Worker CPU süreni tüketebilir. Anonim giriş açık olduğu için "hesap açmak" bir
engel değil.

Aynı şekilde korumasız: `/rewards/prepare|claim|cancel`, `/daily/*`, `/friends/request`,
`/game/telemetry`, `/game/feedback`, `/badges/showcase`.

### 1.3 Mevcut limitleyicinin yapısal sınırı

`rateLimiter.ts` bellek içidir — sayaç Worker isolate'ine bağlıdır. Cloudflare aynı anda çok
sayıda isolate çalıştırdığından ve isolate'ler geri dönüştürüldüğünden bu limit **kesin
değildir**. Kaba kötüye kullanımı keser, kararlı bir saldırıyı kesmez.

Bu görev bunu bilerek ele almalı: dosyanın kendi yorumu da "abuse prevention için yeterli"
diyor, ki `/internal/log` için doğrudur. Para ve ilerleme etkileyen uç noktalar için değildir.

---

## 2. Hedef

1. Tek bir paylaşılan hız limiti katmanı; iki ayrı implementasyon birleşsin.
2. Maliyetli ve kötüye kullanıma açık her uç nokta bir kademeye bağlansın.
3. Limit aşımı görünür olsun — sessizce yutulmasın, iz bıraksın.
4. Meşru oyuncu asla limite takılmasın.

---

## 3. Yapılacaklar

### 3.1 Önce karar: hangi mekanizma

Üç seçenek var, **ajan tek başına seçmez, proje sahibine sorar**:

| Seçenek | Artı | Eksi |
|---|---|---|
| Bellek içi (mevcut) | Sıfır maliyet, kod hazır | Isolate başına; kesin değil |
| Cloudflare Rate Limiting binding | Platform seviyesinde, kesin, ucuz | `wrangler.jsonc` binding'i + panel ayarı gerekir |
| D1 tabanlı sayaç | Kesin, mevcut altyapı | Her istekte D1 yazması — korumaya çalıştığın bütçeyi yiyor |

**Öneri:** Cloudflare Rate Limiting binding'i ana mekanizma, bellek içi limitleyici ucuz bir
ön filtre olarak önde kalır. D1 tabanlı sayaç önerilmez (§1.2'deki sorunu büyütür).

Proje sahibi karar verene kadar §3.2'yi mekanizmadan bağımsız yazılacak şekilde tasarla.

### 3.2 Paylaşılan middleware

`src/middleware/rateLimiter.ts` yeniden düzenlenir: bir uç noktaya takılabilen, kademe alan
tek bir Hono middleware'i dışa açar. `tickets.ts` içindeki bağımsız implementasyon **silinir**
ve bu middleware'e geçer (davranışı korunarak — mevcut testler yeşil kalmalı).

Mekanizma bir arayüzün arkasında durur; §3.1'in kararı değişirse çağrı yerleri değişmez.

### 3.3 Kademeler

Uç noktalar maliyet ve kötüye kullanım etkisine göre kademelere bağlanır. Aşağıdaki sayılar
**başlangıç önerisidir**; ajan telemetriye bakarak gerekçeli değiştirebilir, ama rapora yazar.

| Kademe | Uç noktalar | Öneri |
|---|---|---|
| Sıkı | `/complete-level`, `/daily/complete`, Katman C uzlaştırma (02) | 30/dk, 300/saat |
| Orta | `/rewards/prepare\|claim\|cancel`, `/friends/request`, `/badges/showcase` | 60/dk |
| Gevşek | `/game/telemetry`, `/game/feedback`, `/played-levels` | 120/dk |
| Mevcut | `/internal/log`, `/tickets` | değiştirme |

Meşru oyuncu bir bölümü en hızlı hâlinde bile dakikada 30 kez bitiremez; sıkı kademe insan
davranışının çok üstünde kalır. Ama **doğrula**: `level_telemetry` tablosundaki gerçek
`time_spent` dağılımına bak, en hızlı oyuncuların altında kalmadığından emin ol.

### 3.4 Aşım davranışı

- HTTP 429 + `Retry-After` başlığı.
- Gövde mevcut hata biçimiyle tutarlı: `{ success: false, error: ... }`.
- Hata mesajı iç eşik değerlerini sızdırmaz.
- İstemci tarafı 429'u nazikçe karşılar: oyun kilitlenmez, kullanıcıya i18n üzerinden
  ("biraz yavaşla") mesaj gösterilir. `tr` ve `en` metinleri eklenir.

### 3.5 Kötüye kullanım sinyalleri

Aşağıdakiler `audit_logs` tablosuna `category: 'security'` ile yazılır (05 numaralı görev bunu
genişletecek, burada temeli at):

- Hız limiti aşımı (uid + uç nokta).
- `verifyMoves` başarısızlığı — tek tük normaldir (istemci/sunucu sürüm farkı), **tekrarlayanı
  şüphelidir**. Eşik aşımında kayıt yaz.
- 02 Katman C'deki doğrulanamayan uzlaştırma iddiaları.
- Arka arkaya kimlik doğrulama başarısızlıkları.

Bu kayıtlar yalnızca yazılır; otomatik ban **bu görevin kapsamında değildir**. Mevcut
`banService` elle kullanılmaya devam eder.

### 3.6 Gürültü temizliği (küçük ama şimdi yapılsın)

`src/routes/game.ts` içinde:

```js
console.log('[CompleteLevel] Request body:', JSON.stringify(body));
```

Her başarılı istekte tüm gövdeyi (500 hamleye kadar) logluyor. Hem Workers log maliyeti hem
gürültü. Kaldır veya yalnızca doğrulama başarısızlığında, kısaltılmış hâlde bırak.

---

## 4. Kapsam Dışı

- Otomatik yasaklama / kademeli ceza — sinyaller toplanır, karar insanda kalır.
- Bot/CAPTCHA doğrulaması.
- Cloudflare WAF kuralları — panelden yapılır, rapora "senin yapman gereken" olarak yazılır.
- IP tabanlı limitleme — IP toplama **05 numaralı görevin** kararına bağlı; o görev bitmeden
  IP'ye dayanan bir limit yazma.

---

## 5. Kabul Kriterleri

- [ ] §3.1'deki mekanizma sorusu soruldu ve karar rapora yazıldı.
- [ ] Tek bir paylaşılan hız limiti middleware'i var; `tickets.ts` içindeki ayrı
      implementasyon kaldırıldı ve mevcut ticket testleri hâlâ yeşil.
- [ ] §3.3'teki her uç nokta bir kademeye bağlı.
- [ ] Eşiklerin gerçek oyuncu davranışının üstünde kaldığı `level_telemetry` verisiyle
      doğrulandı ve rapora yazıldı.
- [ ] Limit aşımı 429 + `Retry-After` döndürüyor; eşik değerleri sızmıyor.
- [ ] İstemci 429'da kilitlenmiyor; `tr` ve `en` metinleri eklendi.
- [ ] Kötüye kullanım sinyalleri `audit_logs` tablosuna `category: 'security'` ile yazılıyor.
- [ ] `[CompleteLevel] Request body` log'u temizlendi.
- [ ] Limitin devreye girdiğini **ve** normal oyun akışının takılmadığını gösteren testler var.
- [ ] `00-ilkeler.md` §2.1 tablosundaki yedi kontrol yeşil.
- [ ] `.plans/yayin-hazirlik/raporlar/03-rapor.md` yazıldı.

---

## 6. Elle Kontrol (Proje Sahibi)

- Normal hızda 10 bölüm arka arkaya bitir — hiçbir yerde 429 görmemelisin.
- Aynı isteği script'le hızlıca tekrarla — 429 gelmeli, oyun çökmemeli.
- `audit_logs` tablosunda `category = 'security'` kayıtlarının oluştuğunu gör.
- Cloudflare panelinden Worker CPU ve D1 yazma grafiklerine bak; taban çizgisini not et.
