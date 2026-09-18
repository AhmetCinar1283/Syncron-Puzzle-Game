# 04 — Yayın Kimlikleri ve Build Sertleştirme

> Bu görev `.plans/yayin-hazirlik/00-ilkeler.md` ve `.plans/monetization/00-mimari-ilkeler.md`
> ilkelerine uyar. Belirsizlik anında proje sahibine sor.

---

## 1. Sorun

### 1.1 Gelir kimlikleri sessizce test kimliğine düşüyor

Üç ayrı yerde aynı desen var: gerçek kimlik yoksa test kimliğine düş, `console.warn` yaz,
**devam et**.

| Yer | Eksikse ne olur |
|---|---|
| `src/services/monetization/providers/gamedistribution/loadGdSdk.ts` | `NEXT_PUBLIC_GD_GAME_ID` yoksa GD test game ID'si |
| `src/services/monetization/providers/admob/admobConfig.ts` | Banner/geçiş/ödüllü birim kimlikleri yoksa Google test kimlikleri |
| `android/app/build.gradle` | `admobAppId` yoksa Google test App ID'si |

Şu anki durum, denetimde fiilen doğrulandı:

- **`NEXT_PUBLIC_GD_GAME_ID` tanımlı değil**; AdMob birim kimliklerinin tamamı `.env.local`
  içinde yorum satırında.
- **`android/local.properties` içinde `admobAppId` yok** — yalnızca `sdk.dir` var.
- Denetimde alınan imzalı release APK (14.7MB) bu yüzden **Google TEST AdMob App ID'siyle**
  üretildi. `build.gradle` bunu uyarıyor ama uyarı `gradlew -q` ile çalışıldığında hiç
  görünmüyor; Gradle'da WARNING seviyesi QUIET'in altındadır.

Yani bugün alınan GameDistribution ve Android build'leri tamamen test reklamlarıyla çıkar —
**gelir üretmez** ve bunu fark etmenin hiçbir yolu yok.

Geliştirme sırasında bu davranış doğrudur (yanlışlıkla gerçek reklama tıklama riskini önler).
Yayın build'inde felakettir ve `console.warn` bunu yakalamaz — kimse tarayıcı konsoluna bakmaz.

Ayrıca `NEXT_PUBLIC_ADMOB_USE_TEST_ADS=true` bırakılırsa gerçek kimlikler tanımlı olsa **bile**
test reklamı gösterilir. Bu da yayın build'inde yakalanmalı.

### 1.2 Build tip hatalarını yutuyor

`next.config.ts`:

```ts
typescript: {
  ignoreBuildErrors: true,
}
```

Şu an `npx tsc --noEmit` temiz, yani bu ayar bir şeyi gizlemiyor. Ama yayın build'inin tip
hatasını yakalama garantisi yok — ileride bir regresyon sessizce yayına çıkabilir.

### 1.3 Diğer build ayarları

- `android/app/build.gradle` → `minifyEnabled false`. Paket boyutu büyür, kod açıkta kalır.
  ProGuard + Capacitor + AdMob + Google Auth birlikte dikkat ister; körlemesine açma.
- `versionCode 1` / `versionName "1.0"` — ilk sürüm için doğru, ama sürüm artırma yöntemi
  yazılı değil.

---

## 2. Hedef

1. Eksik veya test kimliğiyle yayın build'i alınması **imkânsız** olsun — uyarı değil, hata.
2. Geliştirme akışı bozulmasın; test kimlikleriyle çalışmak kolay kalsın.
3. Yayın öncesi yapılacaklar yazılı bir listede toplansın.

---

## 3. Yapılacaklar

### 3.1 Yayın kimliği doğrulama kapısı

`scripts/release/verify-release-config.mjs` — build'den **önce** çalışır, eksikse
`process.exit(1)` ile durdurur.

Platform bazlı gereklilikler:

| Platform | Zorunlu |
|---|---|
| `gamedistribution` | `NEXT_PUBLIC_GD_GAME_ID` tanımlı ve GD test ID'si değil |
| `android` | Üç AdMob birim kimliği tanımlı ve test kimliği değil; `android/local.properties` içinde `admobAppId` var ve test App ID'si değil; `NEXT_PUBLIC_ADMOB_USE_TEST_ADS` set değil |
| hepsi | `NEXT_PUBLIC_WORKER_URL` tanımlı; `NEXT_PUBLIC_FIREBASE_*` eksiksiz |
| `crazygames` | CrazyGames SDK'sı ayrı kimlik istemiyorsa yalnızca ortak kontroller |

**Önemli:** bu kapı yalnızca *yayın* build'inde çalışır. Mevcut `build:crazygames`, `build:gd`,
`build:mobile` script'leri geliştirme için olduğu gibi kalır. `package.json` dosyasına ayrı
hedefler eklenir:

```
release:gd, release:crazygames, release:android
```

Bunlar önce doğrulayıcıyı, sonra mevcut build script'ini çağırır. Böylece geliştirirken test
kimlikleriyle çalışmaya devam edersin, yayına çıkarken kapıdan geçmek zorunda kalırsın.

Doğrulayıcının karar mantığı saf bir fonksiyona ayrılır ve test edilir (eksik kimlik → hata,
test kimliği → hata, gerçek kimlik → geçer).

### 3.2 `ignoreBuildErrors` kapatılması

`next.config.ts` içinde `ignoreBuildErrors: false` yapılır. `npx tsc --noEmit` zaten temiz
olduğu için bunun bir şeyi kırmaması beklenir — **ama doğrula**: `next build` kendi tip
kontrolünü biraz farklı çalıştırır, yeni hata çıkarsa düzelt.

Yeni hatalar kapsamı beklenmedik şekilde büyütüyorsa proje sahibine sor; ayarı sessizce geri
açma.

### 3.3 Android sürüm yönetimi

- `versionCode` / `versionName` artırma yöntemi `docs/release/yayin-kontrol-listesi.md`
  dosyasına yazılır.
- `minifyEnabled` için: proje sahibine sor. Açılacaksa Capacitor, AdMob ve Google Auth için
  ProGuard kuralları eklenir ve **imzalı release APK/AAB gerçek cihazda denenir**. Denenmeden
  açık bırakılmaz. Bu görevin kapsamında zorunlu değil; riskli görülüyorsa `false` kalır ve
  gerekçe rapora yazılır.

### 3.4 Yayın kontrol listesi

`docs/release/yayin-kontrol-listesi.md` — her platform için, sırayla işaretlenecek liste:

- Ortak: testler yeşil, tip denetimi temiz, worker dağıtıldı, sırlar tanımlı.
- CrazyGames: zip boyutu ve dosya sayısı limitleri (`scripts/portal/portalLimits.mjs`
  değerlerini kaynak al), yerel `serve:portal` denemesi.
- GameDistribution: gerçek game ID, reklam akışı denendi.
- Android: imzalı AAB üretildi, gerçek cihazda kuruldu, AdMob gerçek reklam gösterdi, UMP
  rıza akışı çalıştı, Play Console veri güvenliği formu dolduruldu.
- Android — **release SHA-1 Firebase'e kayıtlı**: `2f07db3dd6ca45b3a89aeefd1acc5c78dc5bca74`.
  Bu adım atlanırsa Google ile giriş debug build'de çalışır, **release build'de sessizce
  başarısız olur**. Klasik ve pahalı bir yayın hatası; gerçek cihazda imzalı build ile
  Google girişi mutlaka denenir.
- Her platformda: gizlilik/KVKK/şartlar sayfaları erişilebilir ve güncel.

Bu liste `01` ve `05` numaralı görevlerin çıktılarına (anahtar yönetimi, veri toplama
beyanı) atıf verir.

---

## 4. Kapsam Dışı

- Keystore ve imzalama — **01 numaralı görevin işi**.
- Reklam yerleşimi, sıklığı veya "reklamları kaldır" satın alması — bu sürümde yok
  (bkz. `.plans/monetization/07-reklamlari-kaldir.md`).
- Store görselleri, açıklama metinleri, tanıtım videosu.
- CI/CD kurulumu.

---

## 5. Kabul Kriterleri

- [ ] `scripts/release/verify-release-config.mjs` yazıldı; karar mantığı saf fonksiyonda ve testli.
- [ ] `release:gd`, `release:crazygames`, `release:android` script'leri var ve doğrulayıcıyı çağırıyor.
- [ ] Eksik `NEXT_PUBLIC_GD_GAME_ID` ile `release:gd` **hata verip duruyor** (elle denendi).
- [ ] Test AdMob birim kimliğiyle `release:android` hata verip duruyor.
- [ ] `NEXT_PUBLIC_ADMOB_USE_TEST_ADS=true` ile yayın build'i durduruluyor.
- [ ] Mevcut `build:*` script'leri değişmedi; geliştirme akışı bozulmadı.
- [ ] `ignoreBuildErrors: false` ve üç build de hâlâ başarılı.
- [ ] `docs/release/yayin-kontrol-listesi.md` yazıldı.
- [ ] `00-ilkeler.md` §2.1 tablosundaki yedi kontrol yeşil.
- [ ] `.plans/yayin-hazirlik/raporlar/04-rapor.md` yazıldı.

---

## 6. Elle Kontrol (Proje Sahibi)

- Gerçek GD game ID'sini ve AdMob birim kimliklerini panellerden alıp `.env.local` ve
  `android/local.properties` dosyalarına gir.
- `npm run release:gd` ve `npm run release:android` çalıştır — geçmeli.
- Bir kimliği kasten boş bırak, tekrar çalıştır — durmalı.
- Gerçek cihazda imzalı build ile gerçek reklamın geldiğini gör.
