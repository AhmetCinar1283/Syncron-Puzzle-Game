# providers/admob

Android (Capacitor) build'inin reklam sağlayıcısı. `@capacitor-community/admob`
eklentisini `AdProvider` arayüzüne uyarlar. Yalnızca `NEXT_PUBLIC_PLATFORM=android`
ile build alındığında dinamik import ile yüklenir; web/electron/portal
bundle'larına hiç girmez.

## Dosyalar

| Dosya | Sorumluluk |
|---|---|
| `admobConfig.ts` | Reklam birimi kimliklerini env'den çözer; yoksa Google test kimliklerine düşer ve uyarır |
| `admobConsent.ts` | UMP (GDPR/KVKK) rıza akışı; `npa` bayrağının kaynağı; gizlilik seçenekleri formu |
| `admobInit.ts` | Idempotent başlatma: önce rıza, sonra `AdMob.initialize()` |
| `admobEvents.ts` | Eklentinin olay API'sini iptal edilebilir tek seferlik `Promise`'e çevirir |
| `admobTimeouts.ts` | Sağlayıcının kendi YÜKLEME zaman aşımı (izleme süresi sınırlanmaz) |
| `admobInterstitial.ts` | Bölüm arası reklam: hazırla → göster → `Dismissed` bekle |
| `admobRewarded.ts` | Ödüllü reklam: önden yükleme + ödül SADECE `Rewarded` olayıyla |
| `admobBanner.ts` | Kalıcı alt banner + gerçek yükseklik bildirimi |
| `admobLifecycle.ts` | Arka plandan dönüşte banner'ı geri getirir |
| `admobProvider.ts` | Yukarıdakileri `AdProvider` arayüzünde birleştirir |

## Kimlik yönetimi

Hiçbir gerçek kimlik koda gömülmez. JS tarafındaki reklam birimleri
`NEXT_PUBLIC_ADMOB_*` env değerlerinden, native App ID ise gradle üzerinden
gelir. Herhangi biri eksikse Google'ın **test** kimlikleri kullanılır ve konsola
yüksek sesli bir uyarı düşer — böylece gerçek reklama yanlışlıkla tıklanıp hesap
askıya alınamaz. Ayrıntı ve yayın öncesi kontrol listesi: `docs/platforms.md`.

## Zaman aşımı tasarımı (önemli)

İki ayrı katman vardır:

1. **Yükleme** (`admobTimeouts.ts`, 8 sn) — reklam doldurulamazsa oyuncu beklemez.
2. **Asılma koruması** (`policy/policyConfig.ts` → `AD_TIMEOUTS_MS`) — `adService`'in
   dış sarmalayıcısı. Reklam ekrandayken kullanıcının izleme süresi
   **sınırlanmaz**; bu yüzden bu değerler bilerek uzundur.

## Rıza (UMP)

`init()` içinde, ilk reklam isteğinden önce çalışır. Rıza alınmadıysa reklamlar
`npa: true` ile (kişiselleştirilmemiş) istenir; oyunun hiçbir özelliği
kısıtlanmaz. Kullanıcı tercihini sonradan değiştirebilsin diye gizlilik ve KVKK
sayfalarında `components/common/AdPrivacyOptionsButton.tsx` render edilir — bu
buton yalnızca UMP "gerekli" derse görünür.
