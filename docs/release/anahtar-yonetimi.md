# Anahtar ve Sır Yönetimi Runbook'u

> **Bu dosyada hiçbir parola, anahtar veya token yazılı DEĞİLDİR.** Yalnızca neyin nerede
> durduğu, nasıl yedeklendiği ve kaybolursa ne yapılacağı yazar. Bu dosya git'te takip edilir —
> buraya bir sır yazarsan geri alınamaz şekilde sızdırmış olursun.

Son güncelleme: 2026-09-17

---

## 1. Neyin nerede durduğu

Aşağıdaki hiçbir dosya git'te **değildir** ve olmamalıdır. `.gitignore` bunları
`.env*`, `*.jks`, `*.keystore`, `android/keystore.properties`, `android/local.properties`
kurallarıyla dışarıda tutar.

| Sır / anahtar | Nerede duruyor | Nasıl kullanılıyor |
|---|---|---|
| Android release keystore | `D:\PROJECTS\keys\syncron-cap-keystore.jks` (2746 bayt) | `android/keystore.properties` → `storeFile` |
| Keystore parolaları (`storePassword`, `keyPassword`) | `android/keystore.properties` (gitignore'lu, yerel) | `android/app/build.gradle` release `signingConfig` |
| Firebase web kimlikleri (`NEXT_PUBLIC_FIREBASE_*`) | `.env.local` (gitignore'lu) | İstemci bundle'ı — bunlar tasarımı gereği **public** tanımlayıcılardır, gizli değildir |
| Google Sign-In web client id (`NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID`) | `.env.local` | İstemci |
| Lemon Squeezy mağaza/varyant kimlikleri (`NEXT_PUBLIC_LEMON_SQUEEZY_*`) | `.env.local` | İstemci |
| AdMob App ID | `android/local.properties` → `admobAppId` (gitignore'lu) | `android/app/build.gradle` → `manifestPlaceholders.admobAppId` |
| AdMob reklam birimi kimlikleri | `.env.local` → `NEXT_PUBLIC_ADMOB_*` | Bkz. `docs/platforms.md` → "AdMob kimlik yönetimi" |
| Android SDK yolu (`sdk.dir`) | `android/local.properties` | Gradle (sır değil, makineye özel) |
| Worker sırları | Cloudflare — yalnızca `wrangler secret put` ile | `syncron-worker/src/types.ts` → `Env` |

### Worker sırları (Cloudflare)

Bunlar **asla** `syncron-worker/wrangler.jsonc` içine yazılmaz; yalnızca CLI ile verilir:

```bash
wrangler secret put GOOGLE_SERVICE_ACCOUNT   # Firebase Admin service account JSON
wrangler secret put LOG_SECRET               # denetim logu imzalama
wrangler secret put LS_WEBHOOK_SECRET        # Lemon Squeezy webhook doğrulama
wrangler secret put LS_API_KEY               # Lemon Squeezy API
wrangler secret put FIREBASE_API_KEY         # Firebase Identity Toolkit REST
wrangler secret put SECURITY_IP_SALT         # security_events IP karma tuzu (05)
```

**`SECURITY_IP_SALT` hakkında (05).** Güvenlik olaylarında IP adresi ham saklanmaz;
bu tuzla SHA-256 özeti alınır. Tuz **tanımlı değilse** `ip` alanı `NULL` yazılır —
Worker çalışmaya devam eder, yalnızca adli iz körleşir (ham IP'ye asla düşülmez).
Tuzu **değiştirmek yıkıcıdır**: eski kayıtların karmaları yenileriyle eşleşmez ve
ilişkilendirme kopar. Yalnızca tuzun sızdığından şüphelenilirse döndürülür; kayıtlar
zaten 30 günde silindiği için 30 gün sonra etki kendiliğinden kaybolur.
Uygun bir değer: `openssl rand -hex 32`.

`wrangler.jsonc` içindeki `vars` bloğunda yalnızca **gizli olmayan** değerler durur
(`FIREBASE_PROJECT_ID`, `ALLOWED_ORIGIN`). Yeni bir sır eklerken kuralı bozma.

Neyin tanımlı olduğunu görmek için: `cd syncron-worker && wrangler secret list`
(değerleri göstermez, yalnızca adlarını).

---

## 2. Release imzalama anahtarı

### 2.1 Sertifika parmak izleri

Bunlar gizli değildir, aksine **kayıt altında olması gerekir** — bir build'in doğru anahtarla
imzalanıp imzalanmadığını bunlarla doğrularsın.

```
Alias:     syncron
DN:        CN=Ahmet Cinar, OU=Syncron, O=Polimelo, L=Ankara, ST=Turkiye, C=TR
Algoritma: SHA384withRSA
Geçerlilik: 2026-09-12 → 2054-01-28
SHA-1:     2F:07:DB:3D:D6:CA:45:B3:A8:9A:EE:FD:1A:CC:5C:78:DC:5B:CA:74
SHA-256:   8D:98:C8:24:2B:5E:A5:88:8C:CF:8A:61:F4:38:92:C3:21:38:05:94:65:2B:20:37:15:CB:3E:FE:A9:BF:C9:F3
```

**SHA-1'in ayrı bir işlevi var:** Google Sign-In'in release build'de çalışması için bu parmak
izinin Firebase Console → Proje ayarları → Android uygulaması → "SHA sertifika parmak izleri"
altında kayıtlı olması gerekir. Kayıtlı değilse giriş yalnızca debug build'de çalışır.

Parmak izlerini istediğin zaman kendin doğrulayabilirsin:

```bash
cd android && ./gradlew :app:signingReport
```

### 2.2 Yedekleme kuralı — bağlayıcı

Keystore şu an **tek bir kopya** hâlinde `D:` diskinde duruyor. Kural:

1. **En az iki ayrı fiziksel yerde** kopya bulunacak.
2. **En az biri çevrimdışı** olacak (USB bellek, harici disk veya kasa).
3. Çevrimdışı olmayan kopya **şifrelenmiş** olacak (parola korumalı arşiv veya şifreli
   parola yöneticisi eki). Düz bulut senkronizasyonu tek başına yedek sayılmaz.
4. Yedeklenen şey **iki parçadır** ve ikisi de gerekir:
   - `syncron-cap-keystore.jks` dosyası,
   - `storePassword` / `keyPassword` / `keyAlias` üçlüsü (parola yöneticisinde).
   Parolasız keystore işe yaramaz.
5. Parolaları keystore ile **aynı arşivin içine** koyma; ayrı yerde dursunlar.

Yedeğin sağlamlığını doğrulamak için (parolayı sorar, ekrana yazmaz):

```bash
keytool -list -v -keystore <yedek-yolu>.jks
```

Çıkan SHA-256 §2.1'dekiyle aynı değilse o yedek yanlış dosyadır.

### 2.3 Anahtar dosyası bulunamazsa ne olur

`android/app/build.gradle`, `keystore.properties` var ama işaret ettiği `.jks` yoksa
(örneğin `D:` takılı değilken) release imzalamayı **atlar** ve nedenini söyleyen bir uyarı basar:

```
[signing] DIKKAT: release build IMZASIZ kalacak. Neden: anahtar dosyasi BULUNAMADI.
keystore.properties -> storeFile=... ; aranan tam yol: ... -- Harici disk takili mi?
```

Bu durumda build **başarısız olmaz**, imzasız bir çıktı üretir — Play Console bunu kabul etmez.
Uyarıyı gördüysen diski tak, yedekten geri yükle ve tekrar build al.

> `keystore.properties` içinde Windows yolu yazarken ters bölü **çift** yazılır
> (`D:\PROJECTS\keys\...`). Tek ters bölü Java `.properties` kaçış kuralı yüzünden sessizce
> yutulur ve yol bozulur.

---

## 3. Anahtar kaybı senaryosu

**Mevcut durum (2026-09-17): `com.polimelo.syncroncap` paket adıyla Play Console'a henüz hiçbir
sürüm yüklenmedi.** Bu, kaybın şu an **ucuz** olduğu anlamına gelir — yeni bir keystore üretip
devam edilebilir. Bu pencere ilk yükleme yapıldığı anda kapanır.

| Durum | Yapılacak |
|---|---|
| Henüz Play'e yükleme yok (bugünkü durum) | Yeni keystore üret, `keystore.properties`'i güncelle, §2.2 yedeklemesini **ilk yüklemeden önce** yap |
| Yüklendi + Play App Signing **açık** | Google uygulama imza anahtarını tutuyor. Play Console → Uygulama bütünlüğü → "Upload key sıfırlama" talebi aç, yeni upload key üret. Uygulama güncellenebilir kalır |
| Yüklendi + Play App Signing **kapalı** | Kurtarma yok. Uygulama bir daha güncellenemez; yeni paket adıyla sıfırdan yayın ve kullanıcıların elle geçişi gerekir |

İlk yüklemeyi yapmadan önce **Play App Signing'i açık tut** — bu, yukarıdaki en kötü satırı
kalıcı olarak devre dışı bırakır.

### Yeni keystore üretimi (yalnızca gerekirse)

```bash
keytool -genkeypair -v -keystore syncron-cap-keystore.jks -alias syncron \
  -keyalg RSA -keysize 4096 -validity 10000
```

Üretir üretmez: §2.2 yedeklemesini yap, §2.1 parmak izlerini bu dosyaya güncelle, yeni SHA-1'i
Firebase Console'a ekle.

---

## 4. Yeni bir sır eklerken kontrol listesi

- [ ] Değer `.env.local`, `android/local.properties`, `android/keystore.properties` veya
      `wrangler secret put` üzerinden mi geliyor? (Koda gömülü olmayacak.)
- [ ] `git check-ignore -v <dosya>` IGNORED diyor mu?
- [ ] Commit öncesi `git add -n -A` çıktısında o dosya yok, değil mi?
- [ ] Değeri olmadığında kod anlaşılır bir uyarı verip güvenli varsayılana mı düşüyor?
- [ ] Bu tablonun (§1) satırı eklendi mi?

---

## İlgili

- `docs/platforms.md` → "AdMob kimlik yönetimi"
- `android/keystore.properties.example` → imzalama kurulumu
- `.plans/yayin-hazirlik/raporlar/01-rapor.md` → bu runbook'u üreten denetim
