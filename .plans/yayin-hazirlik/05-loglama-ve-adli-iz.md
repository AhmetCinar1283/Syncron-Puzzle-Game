# 05 — Loglama, Adli İz ve Yasal Koruma

> Bu görev `.plans/yayin-hazirlik/00-ilkeler.md` ve `.plans/monetization/00-mimari-ilkeler.md`
> ilkelerine uyar. Belirsizlik anında proje sahibine sor.
>
> **En son yapılacak görev.** 03 numaralı görevin ürettiği güvenlik olaylarını genişletir.

---

## 1. Sorun

### 1.1 Saldırı anında kullanıcıyı kimliklendirecek iz yok

`src/services/auditLog.ts` başında şu not var:

```
KVKK/GDPR note: IP addresses and user-agents are intentionally not stored.
```

Veri minimizasyonu açısından bu doğru bir tercihti. Ama yayına çıkıldığında bir maliyeti var:
saldırı, dolandırıcılık, ödeme itirazı (chargeback) veya yasal bir talep durumunda elinde
yalnızca `uid` var. Anonim giriş açık olduğu için saldırgan sınırsız `uid` üretebilir; `uid`
tek başına ne ilişkilendirme ne de savunma sağlar.

**Proje sahibinin kararı: IP ve User-Agent, sınırlı saklama süresiyle toplanacak.**

Bu karar beraberinde **yasal yükümlülük** getirir; §3.3 bu görevin ayrılmaz parçasıdır.

### 1.2 Güvenlik olayları hiç loglanmıyor

`AuditAction` listesinde oyun, destek, hesap, ödeme ve admin eylemleri var. Güvenlik
kategorisi yok. Şu anda hiçbiri iz bırakmıyor:

- Kimlik doğrulama başarısızlıkları (`console.warn` ile geçiyor, kalıcı değil)
- Geçersiz çözüm gönderimi (`verifyMoves` false)
- Yasaklı hesabın istek denemesi
- Hız limiti aşımı (03 ile gelecek)
- Admin'in yıkıcı işlemleri (kısmen var, eksik)

### 1.3 Log gürültüsü ve maliyeti

`src/routes/game.ts` her başarılı `/complete-level` isteğinde tüm gövdeyi logluyor
(500 hamleye kadar). 03 numaralı görev bunu temizliyor; burada tekrar doğrula.

---

## 2. Hedef

1. Bir olay yaşandığında "kim, ne zaman, nereden, ne yaptı" sorusu cevaplanabilsin.
2. Bu, KVKK/GDPR uyumlu biçimde yapılsın: sınırlı süre, açık amaç, beyan edilmiş.
3. Güvenlik olayları aranabilir tek bir yerde toplansın.

---

## 3. Yapılacaklar

### 3.1 IP ve User-Agent — sınırlı süreli

**Tasarım kısıtları:**

- IP ve UA **`audit_logs` tablosuna eklenmez.** O tablonun saklama süresi 90 gün ve
  `logRetention.ts` ile R2'ye arşivleniyor — kişisel veriyi R2'ye taşımak istemezsin.
  Bunun yerine **ayrı tablo**: `security_events`, kendi saklama süresiyle.
- Saklama: **30 gün**. Ayrı bir temizlik cron'u ile silinir. Arşivlenmez, R2'ye gitmez.
- IP ham mı, hash'li mi? **Proje sahibine sor.** Ham IP soruşturmada daha kullanışlıdır;
  tuzlanmış hash ilişkilendirmeye yeter ve kişiyi doğrudan tanımlamaz. Karar rapora yazılır.
  Hash seçilirse tuz worker sırrı olarak tutulur (`wrangler secret put`).
- Cloudflare'de istemci IP'si `CF-Connecting-IP` başlığından alınır. `X-Forwarded-For`
  güvenilmez, kullanma.
- UA kısaltılarak saklanır (örn. ilk 256 karakter).

**Kritik:** IP/UA **yalnızca güvenlik olaylarına** eklenir. Normal `level.complete` gibi
sıradan oyun eylemlerine eklenmez — bu, veri minimizasyonunun korunduğu yerdir ve KVKK
savunmanın temeli olur.

### 3.2 `security_events` tablosu ve olay kümesi

Yeni migration. Alanlar en az: `id`, `uid` (nullable — kimliksiz olaylar için), `event_type`,
`endpoint`, `ip` (ham veya hash), `user_agent`, `metadata` (JSON), `created_at`.

`uid` ve `created_at` üzerinde indeks.

Yazılacak olaylar:

| Olay | Kaynak |
|---|---|
| `auth.failed` | `middleware/auth.ts`, `middleware/adminAuth.ts` |
| `auth.forbidden` | `adminAuth` rol reddi |
| `solution.invalid` | `routes/game.ts` — `verifyMoves` false |
| `ban.blocked` | `checkActiveBan` isteği reddettiğinde |
| `ratelimit.exceeded` | 03'ten gelen middleware |
| `reconcile.rejected` | 02 Katman C — doğrulanamayan iddia |
| `webhook.invalid_signature` | `routes/donorApi.ts` |
| `admin.destructive` | Çok satır etkileyen admin işlemleri |

Yazma, yanıtı geciktirmez: mevcut `c.executionCtx.waitUntil` deseni kullanılır. Yazma hatası
isteği düşürmez.

`services/auditLog.ts` içindeki parametreli sorgu disiplini (asla string interpolasyonu)
burada da **aynen** geçerlidir.

### 3.3 Yasal metinler — bu görev bunsuz bitmez

IP/UA toplamaya başlamak, aydınlatma metinlerini güncellemeyi **zorunlu** kılar.
`src/app/kvkk/`, `src/app/privacy/` ve gerekiyorsa `src/app/terms/` güncellenir:

- Hangi veri toplanıyor (IP, User-Agent).
- Hangi amaçla (güvenlik, dolandırıcılık önleme, yasal yükümlülük).
- Ne kadar süre saklanıyor (30 gün).
- Hukuki dayanak (meşru menfaat).
- Kullanıcının hakları ve başvuru yolu.

Metinler `tr` ve `en` olarak, i18n üzerinden gelir.

**Ayrıca:** Google Play Console **Veri Güvenliği formu** bu değişiklikle uyumsuz hâle gelir.
Ajan bunu yapamaz — `raporlar/05-rapor.md` içine "senin yapman gereken" başlığıyla yazar ve
`docs/release/yayin-kontrol-listesi.md` dosyasına madde ekler.

Hukuki metnin son hâli proje sahibinin onayına sunulur; ajan kendi başına nihai metin yazıp
yayınlamaz.

### 3.4 Admin görünürlüğü

Mevcut `/admin/users/:uid/logs` deseninin yanına güvenlik olayları için okuma yolu eklenir
(`adminAuth` arkasında, `role === 'admin'` — moderatör IP göremez).

Admin panelinde basit bir görünüm: kullanıcı bazlı son güvenlik olayları. Mevcut admin
feature yapısına (`src/features/admin/`) uyar, yeni desen icat etmez.

### 3.5 Temizlik cron'u

`syncron-worker/src/scheduled/securityEventRetention.ts` — günlük çalışır, 30 günden eski
`security_events` satırlarını siler. Arşivlemez.

`wrangler.jsonc` içine cron eklenir, `index.ts` dallanmasına eklenir. Mevcut cron'larla
çakışmayan bir saat seç (mevcutlar: 03:00 Paz, 00:05 Pzt, 00:05 ayın 1'i, 04:00 her gün).

### 3.6 Gürültü doğrulaması

03 numaralı görevde temizlenmesi gereken `[CompleteLevel] Request body` log'unun gerçekten
kalktığını doğrula. Kalkmadıysa burada kaldır.

---

## 4. Kapsam Dışı

- Otomatik yasaklama veya kademeli ceza — olaylar toplanır, karar insanda.
- Harici SIEM / log toplama servisi entegrasyonu.
- Coğrafi konum çıkarımı (IP'den ülke/şehir) — ek kişisel veri işleme demektir, istenirse ayrı karar.
- Firebase Functions tarafındaki loglama.
- `audit_logs` saklama süresinin değiştirilmesi — 90 gün + R2 arşivi olduğu gibi kalır.

---

## 5. Kabul Kriterleri

- [ ] §3.1'deki "ham IP mi, hash mi" sorusu soruldu ve karar rapora yazıldı.
- [ ] `security_events` tablosu migration ile eklendi, indeksleri var.
- [ ] §3.2'deki sekiz olayın tamamı yazılıyor ve her biri için test var.
- [ ] IP/UA **yalnızca** `security_events` tablosunda; `audit_logs` tablosuna sızmıyor
      (bunu doğrulayan bir test var).
- [ ] IP `CF-Connecting-IP` başlığından alınıyor, `X-Forwarded-For` kullanılmıyor.
- [ ] Günlük temizlik cron'u 30 günden eskiyi siliyor; testli.
- [ ] Güvenlik olayları R2'ye arşivlenmiyor.
- [ ] `/kvkk`, `/privacy` (ve gerekiyorsa `/terms`) `tr` + `en` güncellendi; proje sahibinin
      onayına sunuldu.
- [ ] Play Console Veri Güvenliği formu güncellemesi rapora ve yayın kontrol listesine yazıldı.
- [ ] Admin okuma yolu yalnızca `role === 'admin'` ile erişilebilir.
- [ ] `[CompleteLevel] Request body` log'u yok.
- [ ] `00-ilkeler.md` §2.1 tablosundaki yedi kontrol yeşil.
- [ ] `.plans/yayin-hazirlik/raporlar/05-rapor.md` yazıldı.

---

## 6. Elle Kontrol (Proje Sahibi)

- Kasten yanlış token ile istek at — `security_events` tablosunda `auth.failed` oluşmalı.
- Kasten geçersiz çözüm gönder — `solution.invalid` oluşmalı.
- Normal bir bölüm bitir — `audit_logs` tablosuna yazılmalı, IP **yazılmamalı**.
- `/kvkk` ve `/privacy` sayfalarını iki dilde oku, gerçekten topladığın veriyle uyuştuğunu doğrula.
- Play Console Veri Güvenliği formunu güncelle.
