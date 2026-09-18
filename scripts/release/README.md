# `scripts/release` — Yayın Kimliği Doğrulama Kapısı

Bu klasör tek bir soruya cevap verir: **"Bu yapılandırmayla yayın build'i alınabilir mi?"**

Amaç, `00-ilkeler.md` §2.3'ün pratikteki karşılığıdır: gerçek reklam/ödeme kimlikleri depoya
girmez, ama **eksik ya da test kimliğiyle yayın build'i alınması da imkânsız** olmalıdır.
Uyarı değil, **hata**.

## Dosyalar

| Dosya | Ne yapar | Saf mı? |
|---|---|---|
| `verify-release-config.mjs` | Giriş noktası. Dosyaları okur, sonucu basar, `exit 1` üretir. | Hayır (tek IO katmanı) |
| `lib/releaseConfigRules.mjs` | **VERİ.** Platform → hangi kimlikler zorunlu. | Evet |
| `lib/evaluateReleaseConfig.mjs` | **KARAR.** Kuralları değerlerle karşılaştırır. Platform adı bilmez. | Evet |
| `lib/placeholderIdentities.mjs` | "Bu değer test/örnek kimliği mi?" tespiti. | Evet |
| `lib/parseConfigFiles.mjs` | `.env*` ve Java `.properties` ayrıştırıcıları. | Evet |
| `lib/*.test.ts` | 41 birim testi (`npm test` içinde koşar). | — |

## Kullanım

```bash
npm run release:crazygames    # doğrula → build:crazygames
npm run release:gd            # doğrula → build:gd
npm run release:android       # doğrula → build:mobile
npm run verify:release -- android   # yalnızca doğrula, build alma
```

Mevcut `npm run build:*` script'leri **değişmedi**: geliştirme sırasında test kimlikleriyle
çalışmaya devam edersin. Kapı yalnızca `release:*` yolunda devrededir.

## Yeni bir kimlik ya da platform eklemek

Kod yazmazsın, **konfigürasyon yazarsın**:

1. `lib/releaseConfigRules.mjs` → `COMMON_RULES` veya `PLATFORM_RULES.<platform>` dizisine
   bir satır ekle (`key`, `source`, `presence`, `hint`).
2. Yeni bir platform ise `PLATFORM_RULES`'a yeni bir anahtar ekle; `KNOWN_RELEASE_PLATFORMS`
   kendiliğinden güncellenir.
3. `package.json`'a `release:<platform>` satırını ekle.

`evaluateReleaseConfig.mjs` ve `verify-release-config.mjs` dosyalarında hiçbir platform adı
ve hiçbir değişken adı geçmez — onlara dokunmak gerekmez.

Kodun bir kimliği **birden fazla kaynaktan** çözdüğü durumda (örn. `build.gradle` önce
`ADMOB_APP_ID` env'ine, sonra `local.properties`'e bakar) kurala `alternatives` ekle.
Kapının çözüm sırası, kodun çözüm sırasıyla aynı olmak zorundadır; yoksa CI'da yanlış
yerden hata verir.

## Sınırlar (bilinçli)

- **Gradle özelliği yolu okunamaz.** `build.gradle`'ın üçüncü seçeneği olan
  `~/.gradle/gradle.properties` → `admobAppId` kullanıcı ev dizinindedir; kapı onu okumaz.
  O yolu kullanan `ADMOB_APP_ID` ortam değişkenini de vererek geçer.
- **Kimliğin *doğru* olduğunu doğrulamaz.** Kapı "tanımlı mı ve test kimliği değil mi?"
  sorusuna bakar; kimliğin gerçekten senin AdMob hesabına ait olduğunu panelden
  doğrulaman gerekir (bkz. `docs/release/yayin-kontrol-listesi.md`).
- **Sır okumaz, sır yazmaz.** Değerler yalnızca hata mesajında görünür ve bu değerler
  zaten istemci bundle'ına giren public tanımlayıcılardır.
