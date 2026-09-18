# Yayın Kontrol Listesi

Her yayın öncesi **sırayla** işaretlenir. Atlanan adım, yayın gününde fark edilen ve
geri alınması pahalı olan hataya dönüşür.

İlgili belgeler:
- `docs/release/anahtar-yonetimi.md` — imzalama anahtarı, sırların nerede durduğu (01)
- `docs/release/veri-kurtarma.md` — veri kaybı senaryoları (02)
- `scripts/release/README.md` — kimlik doğrulama kapısının nasıl çalıştığı (04)

---

## 0. Ortak (her platform)

- [ ] `npx tsc --noEmit` — hatasız.
- [ ] `npm test` — hepsi yeşil.
- [ ] `cd syncron-worker && npx tsc --noEmit` — hatasız.
- [ ] `cd syncron-worker && npx vitest run` — hepsi yeşil.
- [ ] Bekleyen D1 migration'ları uygulandı:
      `cd syncron-worker && npx wrangler d1 migrations apply syncron-audit-logs --remote`
- [ ] Worker dağıtıldı: `cd syncron-worker && npx wrangler deploy`
- [ ] Worker sırları tanımlı (`npx wrangler secret list`) — liste
      `docs/release/anahtar-yonetimi.md` §1'de.
- [ ] **`SECURITY_IP_SALT` sırrı tanımlı** (`npx wrangler secret put SECURITY_IP_SALT`).
      Tanımlı değilse güvenlik olayları IP alanı **boş** yazılır — kod çalışır ama adli iz
      körleşir. Tuz DEĞİŞTİRİLİRSE eski karmalarla yeni karmalar eşleşmez (ilişkilendirme
      kopar); yalnızca sızıntı şüphesinde döndürülür. (05)
- [ ] `/privacy`, `/kvkk`, `/terms` sayfaları erişilebilir ve topladığın veriyle tutarlı.
      **05 sonrası:** üçünde de güvenlik kayıtları (karmalanmış IP + User-Agent, 30 gün,
      meşru menfaat) bölümü yer alır. Metnin son hâli **proje sahibinin onayındadır.**
- [ ] Keystore yedeği güncel ve doğrulanmış (`anahtar-yonetimi.md` §2.2).

> Kimlik kapısı bu kontrollerin bir kısmını zaten otomatik yapar:
> `npm run verify:release -- <platform>`. Kapı geçmeden `release:*` build almaz.

---

## 1. CrazyGames

- [ ] `npm run release:crazygames` — kapı geçti, zip üretildi.
- [ ] Paket sınırları (kaynak: `scripts/portal/portalLimits.mjs`):
  - [ ] Dosya sayısı ≤ **1500**
  - [ ] Toplam boyut ≤ **250 MB**
  - [ ] İlk yükleme uyarı eşiği **50 MB** altında (mobil vitrin hedefi 20 MB)
- [ ] `npm run serve:portal` ile zip yerelde açıldı ve **oynandı**:
  - [ ] Oyun iframe içinde açılıyor, `_next/...` 404'ü yok
  - [ ] Bölüm arası reklam çağrısı akışı kilitlemiyor (reklam gelmese bile)
  - [ ] Ödüllü reklam reddedilirse oyun devam ediyor, ödül verilmiyor
  - [ ] Giriş UI'ı görünmüyor (portal kuralı), Günlük Bulmaca çalışıyor
- [ ] CrazyGames SDK ayrı bir kimlik istemiyor — oyunu yüklendiği domain üzerinden tanır.
      Bu değişirse `scripts/release/lib/releaseConfigRules.mjs` → `crazygames` dizisine
      yeni kural eklenir.

## 2. GameDistribution

- [ ] `.env.local` içinde **gerçek** `NEXT_PUBLIC_GD_GAME_ID` var (GD panelinden alınan GUID).
- [ ] `npm run release:gd` — kapı geçti, zip üretildi.
      (Kapı, SDK'nın test GUID'i `00000000-...-000000000000` ile **durur**.)
- [ ] Yerelde/GD önizlemesinde reklam akışı denendi: bölüm arası **ve** ödüllü.
- [ ] Ödüllü reklam tamamlanınca ödül veriliyor; yarıda kapatılınca verilmiyor.
- [ ] Paket sınırları CrazyGames'teki tabloyla aynı şekilde kontrol edildi.

## 3. Android (Google Play)

### 3.1 Kimlikler

- [ ] `.env.local` → üç AdMob birim kimliği **gerçek** (AdMob Console → Reklam birimleri).
- [ ] `android/local.properties` → `admobAppId` **gerçek** (AdMob Console → Uygulama ayarları).
- [ ] `.env.local` içinde `NEXT_PUBLIC_ADMOB_USE_TEST_ADS` **yok** (ya da `false`).
- [ ] `NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID` tanımlı.
- [ ] `npm run release:android` — kapı geçti.

### 3.2 Sürüm numarası

`android/app/build.gradle` → `defaultConfig`:

| Alan | Kim görür | Kural |
|---|---|---|
| `versionCode` | Yalnızca Play Console | **Her yüklemede +1.** Asla azalmaz, asla tekrarlanmaz. Play aynı `versionCode`'u ikinci kez kabul etmez. |
| `versionName` | Oyuncu | Anlamlı sürüm: `MAJOR.MINOR.PATCH` (örn. `1.0`, `1.1`, `1.1.1`). |

Yordam:

1. `versionCode`'u bir artır (bugün `1` → ilk yüklemede `1`, ikinci yüklemede `2`).
2. `versionName`'i içeriğe göre belirle: oynanış değişikliği → MINOR, yalnızca hata
   düzeltmesi → PATCH.
3. `package.json` içindeki `version` alanını `versionName` ile hizalı tut (electron
   dağıtımları onu kullanır).
4. Değişikliği **build almadan önce** commit et; hangi `versionCode`'un hangi commit
   olduğunu bilmek, bir kullanıcı hatası bildirdiğinde tek ipucun olur.

- [ ] `versionCode` artırıldı ve daha önce Play'e yüklenmemiş bir değer.
- [ ] `versionName` güncellendi.

### 3.3 Build ve imzalama

- [ ] `android/keystore.properties` dolu ve `.jks` dosyası erişilebilir
      (`anahtar-yonetimi.md` §2.3 — anahtar yoksa build **imzasız** çıkar ve uyarı basar).
- [ ] `cd android && ./gradlew bundleRelease` — **uyarıları oku**, `-q` ile çalıştırma.
      `[admob]` veya `[signing]` uyarısı görüyorsan dur.
- [ ] `:app:signingReport` release varyantı `Config: release` ve doğru alias'ı gösteriyor.
- [ ] `minifyEnabled` **şu an `false`** — bilinçli. Açılacaksa Capacitor, AdMob ve Google
      Auth için ProGuard kuralları yazılır ve imzalı build **gerçek cihazda** denenir.
      Denenmeden açık bırakılmaz (bkz. 04 raporu).

### 3.4 Gerçek cihaz denemesi (atlanamaz)

- [ ] İmzalı AAB/APK gerçek cihaza kuruldu (`bundletool` veya internal testing track).
- [ ] **Gerçek** reklam geldi (test reklamı değil): banner, geçiş, ödüllü.
- [ ] UMP (rıza) akışı açıldı ve seçim kaydedildi.
- [ ] **Release SHA-1 Firebase'e kayıtlı** ve Google ile giriş **imzalı build'de** denendi:

      2F:07:DB:3D:D6:CA:45:B3:A8:9A:EE:FD:1A:CC:5C:78:DC:5B:CA:74

      Firebase Console → Proje ayarları → Android uygulaması → SHA sertifika parmak izleri.
      Bu adım atlanırsa Google ile giriş debug build'de çalışır, **release build'de
      sessizce başarısız olur** — klasik ve pahalı bir yayın hatası.

      > Play App Signing açıksa Play **kendi** imzalama anahtarını kullanır. O durumda
      > Play Console → Uygulama bütünlüğü sayfasındaki **"Uygulama imzalama sertifikası"**
      > SHA-1'i de Firebase'e eklemelisin. Yükleme anahtarının SHA-1'i tek başına yetmez.

### 3.5 Play Console

- [ ] Veri güvenliği formu dolduruldu ve topladığın veriyle tutarlı
      (reklam kimliği, hesap bilgisi, oyun ilerlemesi).
- [ ] **Veri Güvenliği formu 05 ile GÜNCELLENDİ** — ajan bu formu dolduramaz, panelden
      elle yapılır. Beyan edilecekler:
  - [ ] **Uygulama Etkinliği / Cihaz veya diğer kimlikler → toplanıyor.**
        Toplanan: IP adresinin **karmalanmış** hâli + User-Agent.
  - [ ] Amaç: **Dolandırıcılık önleme, güvenlik ve uyumluluk** (Fraud prevention, security
        and compliance). Reklam veya analitik amacı **işaretlenmez**.
  - [ ] "Veriler aktarım sırasında şifrelenir": **Evet** (HTTPS).
  - [ ] "Kullanıcı verilerinin silinmesini isteyebilir": **Evet** — Destek → Veri Silme.
  - [ ] Bu toplama **isteğe bağlı değildir** (meşru menfaat) — "Zorunlu" işaretlenir.
  - [ ] Saklama süresi açıklaması gizlilik politikasıyla aynı: **30 gün**.
- [ ] Hedef kitle/yaş ve reklam içeriği beyanı yapıldı.
- [ ] Play App Signing **açık** (ilk yüklemede karar verilir, sonradan geri alınamaz).
- [ ] Gizlilik politikası URL'i girildi ve erişilebilir.

---

## 4. Yayın sonrası (ilk 48 saat)

- [ ] AdMob panelinde **gerçek gösterim** sayacı artıyor mu? Artmıyorsa kimlikler
      yanlış olabilir.
- [ ] Cloudflare Worker hata oranı ve D1 yazma grafiği normal mi?
- [ ] `audit_logs` içinde `category = 'security'` kayıtlarında anormal bir yığılma var mı?
- [ ] `security_events` tablosu yazıyor mu ve `ip` alanı **dolu** mu (tuz sırrı çalışıyor mu)?
      `SELECT event_type, COUNT(*), SUM(ip IS NULL) AS ipsiz FROM security_events GROUP BY 1;`
- [ ] İlk 30 günden sonra: günlük temizlik cron'u (`45 3 * * *`) gerçekten siliyor mu?
      `SELECT MIN(created_at) FROM security_events;` — 30 günden eski olmamalı.
- [ ] Play Console → çökme raporları temiz mi?
