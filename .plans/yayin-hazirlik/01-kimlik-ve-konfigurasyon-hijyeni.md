# 01 — Kimlik, İmzalama Anahtarı ve Konfigürasyon Hijyeni

> Bu görev `.plans/yayin-hazirlik/00-ilkeler.md` ve `.plans/monetization/00-mimari-ilkeler.md`
> ilkelerine uyar. Belirsizlik anında proje sahibine sor.

**Öncelik: EN YÜKSEK.** Bu izdeki tek *geri dönüşü olmayan* risk burada.

---

## 1. Sorun

### 1.1 Release imzalama anahtarı tek bir harici diskte

`android/keystore.properties` şunu işaret ediyor:

```
storeFile=D:\PROJECTS\keys\syncron-cap-keystore.jks
keyAlias=syncron
```

Denetimde doğrulandı: dosya **yerinde ve sağlam** (2746 byte, 2026-09-12). Kayıp yok.

Ama tek kopya. Durum:

- `D:` harici/ikincil bir disk; denetimin bir bölümünde sisteme bağlı bile değildi.
- `C:` üzerinde hiçbir kopyası yok. Yapılan geniş aramada yalnızca iki debug keystore ve
  **başka bir projeye ait** `C:\Users\ahmet\keys\polyvo-upload-keystore.jks` çıktı.
- Git'te yok ve **olmamalı** da.

Sonuçları:

- O disk bozulur veya kaybolursa ve Play Console'a bu anahtarla sürüm yüklenmişse, Play App
  Signing kapalı olduğu durumda uygulama **bir daha güncellenemez**. Yeni paket adıyla
  sıfırdan yayın gerekir.
- `D:` takılı değilken `assembleRelease` / `bundleRelease` imzalama adımında patlar
  (`hasKeystoreProps` true görülür, var olmayan dosya açılmaya çalışılır).

Yani bu bir "kayıp" değil, bir **tek nokta arıza** sorunu. Çözümü §3.4'teki yedekleme kuralı
ve §3.5'teki hata mesajı iyileştirmesi.

### 1.2 Güvenlik ve platform konfigürasyonu versiyon kontrolünde değil

Kök `.gitignore` şunları dışlıyor:

```
/android          ← tüm Android projesi
/firestore.rules  ← veritabanı güvenlik kuralları
/firebase.json
/firestore.indexes.json
/.firebaserc
/docs/
/electron
```

`firestore.rules` bu projedeki **en kritik güvenlik dosyası** — `totalScore`, `role`, `xp`
alanlarını istemciden koruyan şey o. Git geçmişinde olmaması demek: kim ne zaman hangi kuralı
gevşetti izlenemez, kazara gelen bir gevşetme fark edilmez, geri alınamaz.

`/android` dışlandığı için `build.gradle` içindeki AdMob/imzalama mantığı, `AndroidManifest.xml`
izinleri ve Capacitor yapılandırması da geçmişsiz. Makine kaybında Android projesi baştan kurulur.

### 1.3 Doğru olan kısım — bozma

`.gitignore`'daki `.env*` kuralı **doğru ve kalmalı**. `.env.local` içinde Firebase ve Lemon
Squeezy kimlikleri var. Bu görevde hiçbir sır git'e alınmaz.

---

## 2. Hedef

1. İmzalama anahtarının akıbeti netleşsin; kayıpsa kurtarma/yeniden kurulum yolu belirlensin,
   varsa **git dışında, şifreli, en az iki yerde** yedeklensin.
2. Güvenlik ve platform konfigürasyonu versiyon kontrolüne girsin — sırlar girmeden.
3. Anahtar/sır yönetimi yazılı bir runbook'a bağlansın, kafada kalmasın.

---

## 3. Yapılacaklar

### 3.1 Önce sor (kod yazmadan)

Anahtarın varlığı denetimde **doğrulandı** (§1.1) — o soru kapandı. Kalan iki soru, proje
sahibine sorulur ve cevap rapora yazılır:

- Google Play Console'da bu paket adıyla (`com.polimelo.syncroncap`) daha önce sürüm yüklendi mi?
- **Play App Signing** etkin mi? (Etkinse anahtarın kaybı telafi edilebilir; değilse anahtar
  tek ve nihai kopyadır.)

Cevaba göre yedekleme aciliyeti belirlenir:

| Durum | Anlamı |
|---|---|
| Henüz yükleme yapılmadı | Kayıp ucuz olurdu; yine de §3.4 uygulanır |
| Yüklendi + Play App Signing var | Google upload key'i sıfırlayabilir; risk orta |
| Yüklendi + Play App Signing yok | **Tek nokta arıza.** §3.4 yedeklemesi gecikmeden yapılır |

### 3.1b İmza parmak izlerini kayda geçir

Denetimde üretilen imzalı APK'dan alınan sertifika:

```
DN:      CN=Ahmet Cinar, OU=Syncron, O=Polimelo, L=Ankara, ST=Turkiye, C=TR
SHA-256: 8d98c8242b5ea5888ccf8a61f43892c321380594652b203715cb3efea9bfc9f3
SHA-1:   2f07db3dd6ca45b3a89aeefd1acc5c78dc5bca74
```

Bunlar §3.4'teki runbook'a yazılır. **SHA-1 ayrıca kritik bir işe yarar:** Google Sign-In'in
release build'de çalışması için bu parmak izinin Firebase Console'da kayıtlı olması gerekir
(bkz. 04 numaralı görev, §3.4 kontrol listesi).

### 3.2 `.gitignore` revizyonu

`/android` satırı kaldırılır, yerine yalnızca gerçek türetilmiş/gizli dosyalar dışlanır:

```gitignore
# capacitor / android — yalnızca türetilmiş ve gizli dosyalar
android/.gradle/
android/build/
android/app/build/
android/local.properties
android/keystore.properties
android/capacitor-cordova-android-plugins/
*.jks
*.keystore
```

`android/keystore.properties.example` **takip edilir** (zaten var, içinde sır yok — doğrula).

Aşağıdakiler versiyon kontrolüne alınır:

```
firestore.rules
firestore.indexes.json
firebase.json
.firebaserc
docs/
```

`/electron` ve `/.archive` için proje sahibine sor — kullanımda mı, ölü mü?

### 3.3 Sır sızıntısı taraması

`.gitignore` gevşetilmeden **önce** `git add -n` (dry run) ile hangi dosyaların ekleneceğini
listele ve gözden geçir. `android/` altında beklenmedik bir `.jks`, `.properties`, servis
hesabı JSON'u veya `google-services.json` varsa **ekleme, sor**.

Ayrıca mevcut git geçmişinde sır var mı tara (`git log -p` üzerinde anahtar kelime araması:
`apiKey`, `PRIVATE KEY`, `storePassword`, `secret`). Bulursan rapora yaz, temizleme ayrı iş.

### 3.4 Runbook: `docs/release/anahtar-yonetimi.md`

Yeni dosya. İçeriği:

- Hangi anahtar/sır nerede duruyor (git DIŞI konumlar, isimleriyle).
- Keystore yedekleme kuralı: en az iki ayrı yer, en az biri çevrimdışı/şifreli.
- `wrangler secret put` ile verilen worker sırlarının listesi:
  `GOOGLE_SERVICE_ACCOUNT`, `LOG_SECRET`, `LS_WEBHOOK_SECRET`, `LS_API_KEY`, `FIREBASE_API_KEY`.
- AdMob App ID'nin `android/local.properties` → `admobAppId` üzerinden geldiği.
- Anahtar kaybı senaryosunda ne yapılacağı.
- **Parolalar bu dosyaya yazılmaz** — yalnızca nerede olduğu.

### 3.5 `keystore.properties` davranışı

`build.gradle` şu an `keystore.properties` **var** ama işaret ettiği `.jks` **yok** durumunda
anlaşılmaz bir Gradle hatası veriyor. Bunu netleştir: dosya yoksa açık ve Türkçe bir uyarıyla
release imzalamayı atla (mevcut `hasKeystoreProps` yolundaki gibi), böylece hata mesajı
"anahtar dosyası şu yolda bulunamadı" olsun.

---

## 4. Kapsam Dışı

- Git geçmişinden sır temizleme (`filter-repo` / `BFG`) — bulgu varsa rapora yazılır, ayrı iş.
- Play Console üzerinde yapılacak elle işlemler — ajan yapamaz, rapora "senin yapman gereken" olarak yazılır.
- `minifyEnabled`, `versionCode` ve reklam kimliği doğrulaması — **04 numaralı görevin işi**.
- Yeni keystore üretimi, §3.1'deki cevap gelmeden yapılmaz.

---

## 5. Kabul Kriterleri

- [ ] §3.1'deki üç soru soruldu, cevaplar rapora yazıldı, izlenecek yol netleşti.
- [ ] `git ls-files` çıktısında `firestore.rules`, `firestore.indexes.json`, `firebase.json`,
      `.firebaserc`, `android/build.gradle`, `android/app/build.gradle`,
      `android/app/src/main/AndroidManifest.xml`, `android/keystore.properties.example` görünüyor.
- [ ] `git ls-files` çıktısında **hiçbir** `.jks`, `.keystore`, `keystore.properties`,
      `local.properties`, `.env*` veya servis hesabı JSON'u yok.
- [ ] `git check-ignore .env.local` hâlâ IGNORED diyor.
- [ ] `docs/release/anahtar-yonetimi.md` yazıldı ve içinde parola yok.
- [ ] Keystore dosyası yoksa `assembleRelease` anlaşılır bir hata/uyarı veriyor.
- [ ] `00-ilkeler.md` §2.1 tablosundaki yedi kontrol yeşil.
- [ ] `.plans/yayin-hazirlik/raporlar/01-rapor.md` yazıldı.

---

## 6. Elle Kontrol (Proje Sahibi)

- `git status` ile eklenen dosyaları gözden geçir — beklemediğin bir şey var mı?
- Keystore'un yedeğini fiilen iki ayrı yere koy ve `docs/release/anahtar-yonetimi.md`'yi doğrula.
- Play Console → Uygulama bütünlüğü → imzalama durumunu kendi gözünle gör.
