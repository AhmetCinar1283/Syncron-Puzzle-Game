# 13 — Google ile Giriş Eklentisi Sürüm Uyumsuzluğu

**Tarih:** 2026-09-23
**Kapsam:** Yalnızca Google giriş eklentisinin Capacitor 8 uyumu. Giriş akışının mantığı,
Firebase tarafı ve oyuncunun gördüğü ekranlar değiştirilmedi.

---

## 1. Tespit

| Bulgu | Kanıt |
|---|---|
| Kullanılan eklenti `@codetrix-studio/capacitor-google-auth@3.4.0-rc.4` | `package.json` |
| npm'deki **en son** sürüm de `3.4.0-rc.4`; `latest` etiketi bir release candidate'e bakıyor | `npm view @codetrix-studio/capacitor-google-auth dist-tags` |
| Paket **2024-05-01**'den beri güncellenmemiş (~2.4 yıl) | `npm view ... time.modified` → `2024-05-01T06:53:46Z` |
| Peer bağımlılık `@capacitor/core@^6`, projede `8.3.0` | `npm ls @capacitor/core` → `invalid: "^6.0.0"`, **çıkış kodu ELSPROBLEMS (≠0)** |
| Capacitor 7 ve 8 için hiç sürüm çıkmamış | sürüm listesi `3.4.0-rc.4`'te bitiyor |

Bunlar sürüm etiketi meselesi; asıl riskler eklentinin **kodunda**:

1. **Kullanımdan kaldırılmış API.** Eklenti `com.google.android.gms.auth.api.signin.GoogleSignIn`
   üzerine kurulu (`android/.../GoogleAuth.java`). Google bu API'yi kullanımdan kaldırdı;
   yerine Credential Manager'ı işaret ediyor.
2. **Dinamik bağımlılık sürümü.** `implementation 'com.google.android.gms:play-services-auth:18.+'`
   — build'i tekrarlanabilir olmaktan çıkarır; aynı kaynaktan iki farklı AAB çıkabilir.
3. **Ölü repository.** Eklentinin `android/build.gradle` dosyası hâlâ `jcenter()` kullanıyor.
4. **Release'te sessiz kırılmanın en olası mekanizması** — `GoogleAuth.java`:
   giriş **başarılı olduktan sonra** `AccountManager.getAuthToken(account, "oauth2:profile email", …)`
   ile bir access token çekmeye çalışıyor. Bu çağrı kullanıcı onayı gerektirdiğinde
   `KEY_AUTHTOKEN` yerine bir intent döner → `authToken == null` →
   `…/tokeninfo?access_token=null` isteği HTTP 400 → `IOException` → bir kez retry → hata →
   `call.reject("Something went wrong while retrieving access token")`.
   Yani **Google girişi başarılı olsa bile** `signIn()` reddedilebiliyor ve
   `AuthModal` bunu `auth.err_generic` olarak gösteriyordu. Firebase'in bu access
   token'a hiçbir ihtiyacı yok — sadece `idToken` gerekiyor.

---

## 2. Seçilen yol

**(b) Bakımı yapılan başka bir eklentiye geçiş: `@capgo/capacitor-social-login@^8.5.11`.**

Gerekçe:

- Peer bağımlılık `@capacitor/core >=8.0.0` → ağaç geçerli (`npm ls` artık 0 ile çıkıyor).
- Aktif bakımda (son yayın bu görevin yapıldığı gün); sürüm majörleri Capacitor majörlerini izliyor.
- Android tarafı Google'ın **güncel** Credential Manager + `GetSignInWithGoogleOption`
  API'sini kullanıyor, `idToken` döndürüyor.
- **Firebase akışı hiç değişmedi:** `GoogleAuthProvider.credential(idToken)` →
  anonimse `linkWithCredential`, değilse `signInWithCredential`. `auth/credential-already-in-use`
  onarımı, UID koruma davranışı, Firestore senkronizasyonu aynen duruyor.
- `google-services.json` **gerekmiyor**, native Firebase SDK'sı devreye girmiyor.

### Elenen seçenekler

| Seçenek | Neden elendi |
|---|---|
| (a) Aynı eklentinin uyumlu sürümüne geç | **Yok.** Capacitor 7/8 için hiç sürüm çıkmamış, paket terk edilmiş. |
| `@capacitor-firebase/authentication` (Capawesome) | Capacitor 8 uyumlu ve Firebase'in önerdiği yol, ama native Firebase SDK'sını devreye sokuyor: `android/app/google-services.json` **zorunlu** hâle geliyor (projede yok, Firebase Console'dan elle indirilmesi gerekir → ajan doğrulayamaz) ve `skipNativeAuth` yanlış ayarlanırsa native oturum ile Web SDK oturumu ayrışır. Oyunun tüm Firestore kuralları Web SDK oturumuna dayandığı için bu, **cihazda test edilemeyen bir anda sessizce bozulma** riski — tam kaçınmak istediğimiz hata sınıfı. |
| Web SDK'nın `signInWithRedirect`/popup'ını Android WebView'de kullanmak | Google, OAuth'u WebView içinde engelliyor (`disallowed_useragent`). Native eklenti zaten bu yüzden var. |
| `@capacitor/browser` ile elle Custom Tab OAuth akışı yazmak | En çok yeni kod, en çok yeni hata yüzeyi; yayın öncesi kabul edilemez. |
| (c) Mevcut hâli bırakıp uyumsuzluğun zararsız olduğunu kanıtlamak | **Kanıtlanamadı, aksine karşı kanıt bulundu:** `npm ls` hata veriyordu ve §1.4'teki access-token kod yolu, girişi başarıyken reddedebiliyor. Kalması ayrıca terk edilmiş + kullanımdan kaldırılmış API'ye bağımlılığı sürdürürdü. |

---

## 3. Değişen dosyalar

| Dosya | Değişiklik |
|---|---|
| `package.json` | `@codetrix-studio/capacitor-google-auth` **çıktı**, `@capgo/capacitor-social-login@^8.5.11` **girdi**. Başka hiçbir bağımlılık dokunulmadı. |
| `package-lock.json` | Yalnızca bu iki paketin girdisi değişti (17 satır). Toplu `npm update` yapılmadı. `tslib` zaten ağaçta olduğu için yeni transitif paket eklenmedi. |
| `src/services/auth/nativeGoogleSignIn.ts` | **YENİ.** Native Google giriş penceresini açıp `idToken` döndüren tek işli servis. Karar gerekçesi ve elenen alternatifler dosya başındaki blokta. |
| `src/services/auth/README.md` | **YENİ.** Modül README'si (mimari ilkeler §6). |
| `src/contexts/AuthContext.tsx` | Native dal 15 satırdan 4 satıra indi; eklenti detayı servise taşındı. Firebase mantığı, hata onarımı, state güncellemesi **aynen** duruyor. |
| `capacitor.config.ts` | `plugins.GoogleAuth` → `plugins.SocialLogin`. `providers: { google: true, facebook: false, apple: false, twitter: false }` — eklenti varsayılanı dört sağlayıcıyı da paketlediği için üçü kapatıldı. |
| `src/README.md` | Klasör haritasına `auth/` eklendi (tek satır). |
| `docs/auth.md` | `linkWithGoogle()` bölümündeki Capacitor satırı zaten **yanlıştı** (`linkWithRedirect` yazıyordu, kod yıllardır native eklenti kullanıyor); gerçekle eşitlendi. |

### Android native tarafında ne değişti — dosya dosya

Elle **hiçbir** Android dosyası düzenlenmedi. Aşağıdaki iki dosya `npx cap sync` tarafından
**otomatik üretildi** (ikisinin de başında "DO NOT EDIT THIS FILE" uyarısı var):

1. `android/app/capacitor.build.gradle` — `implementation project(':codetrix-studio-capacitor-google-auth')`
   satırı `implementation project(':capgo-capacitor-social-login')` oldu. (1 satır)
2. `android/capacitor.settings.gradle` — aynı modülün `include` + `projectDir` satırları değişti. (2 satır)

**Dokunulmayanlar (bilerek):**

- `android/app/build.gradle` — değişiklik gerekmedi.
- `android/app/src/main/java/com/polimelo/syncron/app/MainActivity.java` — değişiklik gerekmedi.
  Yeni eklenti, **ek scope istenmediği sürece** MainActivity değişikliği istemiyor
  (eklentinin Java kodu ek scope durumunda açıkça `"You CANNOT use scopes without modifying
  the main activity"` diye reddediyor). Bu yüzden `login()` çağrısına bilerek scope verilmedi;
  Firebase'in yalnızca `idToken`'a ihtiyacı var, e-posta/ad zaten token içinde geliyor.
- `android/app/src/main/res/values/strings.xml` — **dokunulmadı.** İçindeki
  `server_client_id` dizesi artık kullanılmıyor (yalnızca eski eklenti okuyordu). Silmenin
  faydası sıfır, riski sıfır değil; ölü ama zararsız. Kapsam dışı not olarak bırakıldı.
- `.env.local`, `android/local.properties`, `android/keystore.properties` — **açılmadı bile.**

---

## 4. Doğrulama (00-ilkeler.md §2.1 + AAB)

| Kontrol | Komut | Sonuç |
|---|---|---|
| App tip denetimi | `npx tsc --noEmit` | **hatasız** (exit 0) |
| App testleri | `npm test` | **517/517 passed** (51 dosya) — taban korundu |
| Worker tip denetimi | `cd syncron-worker && npx tsc --noEmit` | **hatasız** (exit 0) |
| Worker testleri | `cd syncron-worker && npx vitest run` | **263/263 passed** (19 dosya) — taban korundu |
| CrazyGames build | `npm run build:crazygames` | `crazygames.zip` — 112 dosya, 4.16 MB |
| GameDistribution build | `npm run build:gd` | `gamedistribution.zip` — 112 dosya, 4.16 MB |
| Android build | `npm run release:android` | `cap sync` bitti, **5 eklenti** bulundu, `@capgo/capacitor-social-login@8.5.11` kayıtlı |
| **AAB üretimi** | `cd android && gradlew bundleRelease` | **BUILD SUCCESSFUL in 54s** — `app-release.aab`, 15.9 MB, `signReleaseBundle` çalıştı (yani **imzalı**) |
| Bağımlılık ağacı | `npm ls @capacitor/core` | **exit 0** (önce `ELSPROBLEMS` veriyordu) |

Ek doğrulamalar:

- `cap sync` çıktısı sağlayıcı seçimini onayladı: `Google: enabled / Facebook: disabled /
  Apple: disabled / Twitter: disabled`.
- AAB içeriği tarandı: **Facebook sınıfı sayısı = 0**, Credential Manager / `googleid`
  bileşenleri mevcut. Yani gereksiz SDK paketlenmiyor (Play veri güvenliği formu açısından da önemli).
- `npm run lint`: proje genelinde **273 hata zaten vardı** (taban yeşil değil, §2.1'de de lint yok).
  Dokunduğum dosyalar tek tek lint'lendi: yeni `nativeGoogleSignIn.ts` **tertemiz**;
  `AuthContext.tsx`'teki 1 hata + 2 uyarı **benden önce de vardı** (kullanılmayan
  `linkWithRedirect`/`signInAnonymously` import'ları ve `isNativePlatform` içindeki
  `(window as any).Capacitor`). Yeni `any` eklenmedi.
- `git status`: beklenen dosyalar dışında `tsconfig.json` (proje sahibinin commit edilmemiş
  kendi değişikliği — **dokunulmadı**) ve `src/app/cursors.css` (içerik farkı **yok**,
  yalnızca satır sonu/stat tazelemesi) görünüyor. Commit yapılmadı.

---

## 5. GERÇEK CİHAZDA DENENMESİ GEREKENLER (ajan bunu yapamaz)

Ajan derleyebilir, tip denetleyebilir, AAB üretebilir — **ama Google giriş penceresini
açamaz.** Aşağıdakiler kapalı teste çıkmadan önce gerçek bir Android cihazda,
**release/internal-test build'i ile** (debug ile değil) denenmelidir:

1. **Misafir → Google ile giriş.** Oyunu hiç giriş yapmadan aç, birkaç bölüm oyna, sonra
   Google ile giriş yap. → Hesap seçme ekranı açılmalı, giriş sonrası **oynadığın bölümler
   ve skorun kaybolmamalı** (anonim UID korunuyor mu?).
2. **Zaten kayıtlı Google hesabıyla giriş.** Aynı Google hesabıyla ikinci kez giriş yap. →
   `auth/credential-already-in-use` onarım yolu devreye girmeli, hata görünmeden o hesaba geçmeli.
3. **Vazgeçme davranışı.** Hesap seçme ekranını geri tuşuyla kapat. → Şu an kullanıcıya
   genel hata mesajı (`auth.err_generic`) görünüyor; bu **eski eklentide de böyleydi**,
   bilerek değiştirilmedi (kapsam: yalnızca uyumluluk). Rahatsız ediciyse ayrı bir görev.
4. **Google hesabı olmayan / Play Services'ı eski cihaz.** Credential Manager burada
   farklı davranabilir; en azından oyunun **kilitlenmediği** doğrulanmalı.
5. **Çıkış → tekrar giriş.** Çıkış yaptıktan sonra tekrar Google ile giriş. (Not: çıkışta
   native Google oturumu temizlenmiyor — eski eklentide de temizlenmiyordu, davranış aynı.)
6. **Uçak modunda giriş denemesi.** Nazik hata, donma yok.

---

## 6. SENİN YAPMAN GEREKEN (konsol işleri — ajan erişemez)

> **Bu maddeyi atlarsan Google girişi release'de kırılır ve sebebi kod olmaz.**

1. **Google Cloud Console → Credentials → OAuth 2.0 Client IDs → Android istemcisi.**
   Bu istemcinin SHA-1 parmak izi listesinde, Play'in **App Signing** anahtarının SHA-1'i
   bulunmalı — yalnızca senin upload anahtarının SHA-1'i **yetmez**. Play Console →
   *Setup → App signing* sayfasındaki "App signing key certificate" SHA-1'ini kopyalayıp
   Android OAuth istemcisine ekle. Bu, "debug'da çalışıyor, Play'den indirince çalışmıyor"
   şikâyetinin bir numaralı sebebidir ve eklenti değişikliğinden bağımsızdır.
2. Aynı sayfada paket adının `com.polimelo.syncroncap` olduğunu doğrula.
3. Firebase Console → Authentication → Sign-in method → **Google** sağlayıcısının açık
   olduğunu doğrula.
4. Web client ID hâlâ `1041986277726-9otkut2eqcl61rs3rokmgcqn184g42pu...` mı? Değiştiyse
   `NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID` ortam değişkenini ayarla (kod içindeki sabit yalnızca
   yedek).

---

## 7. Kapsam dışı notlar (düzeltilmedi, bilgi amaçlı)

- **Lisans değişti:** eski eklenti MIT, yeni eklenti **MPL-2.0**. Değiştirilmeden kullanılan
  bir bağımlılık olarak kapalı kaynak bir uygulamada sorun değildir (MPL dosya bazlı
  copyleft'tir), ama üçüncü taraf lisans listende görünmeli.
- `AuthContext.tsx` 352 satır — mimari ilkelerdeki ~250 satır sınırının üzerinde ve
  kullanılmayan iki import içeriyor (`linkWithRedirect`, `signInAnonymously`). Bu görevde
  bölünmedi.
- Çıkışta (`signOut`) native Google oturumu temizlenmiyor; her iki eklentide de aynı.
- Eklentinin sağlayıcı seçimi `node_modules/@capgo/.../android/gradle.properties` dosyasına
  yazılıyor (git'te değil). `npm ci` sonrası **mutlaka `npx cap sync`** çalışmalı — zaten
  `npm run build:mobile` bunu yapıyor, ayrı bir işlem gerekmiyor.

## 8. LİDERE SORU

Yok. Karar noktalarının tamamı kod ve npm verisiyle doğrulanabildi.
