# 12 — Ödüllü Reklam Yolu: Durum Raporu

Yöntem: yalnızca okuma + test/doğrulama komutları. Üretime dokunan komut çalıştırılmadı.

## Özet tablo

| Soru | Cevap |
|---|---|
| 1. Kimlik eksikken ne oluyor? | Sessizce **Google test kimliğine** düşüyor (`admobConfig.ts:87`), akış çalışır. Ödüllü yolun görünmemesinin sebebi kimlik DEĞİL. |
| 2. Kod yolu bütün mü? | **Skip-level uçtan uca bütün.** Hint uçtan uca **kasıtlı kapalı** (istemci + worker). Yarım/TODO halka yok. |
| 3. Platform | Android + CrazyGames + GD + mock: açık. Web/Electron: `rewardedAds:false` → skip-level `disabled` (kasıtlı ürün kararı). |
| 4. Sunucu | `/rewards/prepare\|claim\|cancel` var, rate-limit bağlı, kurallar sunucuda. **Ama `via:'ad'` istemci beyanı; SSV yok** (bilinen ve yazılı açık). |
| 5. Test | 14 dosya / 79 test geçiyor; ödül olayı mantığı testli, `adService` + `rewardedActionService` testsiz. |
| 6. Kimlik eklenirse çalışır mı? | Skip-level için **kod tarafında engel yok**; kesinlik yalnızca gerçek cihazda imzalı build ile doğrulanır. Hint kimlikle de gelmez. |

## 1. Kimlik eksikken davranış

`src/services/monetization/providers/admob/admobConfig.ts:67-92`:
- `NEXT_PUBLIC_ADMOB_REWARDED_ID` yoksa `rewardedId = ADMOB_TEST_IDS.rewarded` (satır 87) + `console.warn` (satır 59-63). Hata yok, mock'a geçiş yok, sessiz düşüş de değil — logcat'te `[admob]` uyarısı var.
- **Yan etki:** `usingTestIds = missing.length > 0` (satır 89). Tek birim eksik olduğu için `isTesting:true` BANNER ve INTERSTITIAL'a da uygulanıyor (`admobBanner.ts:63`, `admobInterstitial.ts:24`). Yani bugün gerçek banner/interstitial kimlikleri tanımlı olmasına rağmen o birimler de **test reklamı** gösteriyor ve gelir üretmiyor. Kimliğin eklenmemesinin ölçülebilir ikinci maliyeti bu.
- Yayın kapısı bunu yakalıyor — ölçüldü:
  `node scripts/release/verify-release-config.mjs android`
  → `✗ Yayın build'i DURDURULDU — 1 sorun: NEXT_PUBLIC_ADMOB_REWARDED_ID tanımlı değil` (kural: `scripts/release/lib/releaseConfigRules.mjs:99-104`, `presence:'required'`).

### "Çalışmıyor" belirtisinin gerçek açıklaması
Kimlik değil; **iki kasıtlı kapatma + platform seçimi**:

1. **İpucu her yerde kapalı.** `src/services/monetization/rewarded/rewardedActionsConfig.ts:17-21` → `hint` üç modda da `{kind:'disabled'}`. `usePlayHint.ts:106` bu durumda `screenHint = undefined` döndürür → ipucu butonu, H kısayolu ve kart **hiç çizilmez**. Worker da aynı: `syncron-worker/src/services/hint/hintAction.ts:29` `enabled:false`; `rewardService.ts:178-181` claim'i `action-disabled` ile reddeder. Gerekçe kodda yazılı: sunucu ipucu motoru Workers Free'nin 10 ms CPU sınırına sığmıyor (commit `4e3c13d` "ipucu worker'a taşındı").
2. **Web'de atlama kapalı.** `capabilities.ts:40-53` web/electron `rewardedAds:false` → `accessPolicy.ts:17` `rewardedAdsUnavailable` modunu seçer, skip-level'da o mod `disabled` (`rewardedActionsConfig.ts:33`) → `usePlaySkip.ts:96` `offered=false` → buton yok. `npm run dev` = `NEXT_PUBLIC_PLATFORM=web` (package.json:7). Yani tarayıcıda geliştirirken **ödüllü yolun hiçbir parçası görünmez** — büyük olasılıkla görülen belirti budur.
3. Android'de bile atlama butonu gecikmeli çıkar: `skipLevelConfig.ts:22-26` → 3 başarısız deneme **veya** 180 sn; ayrıca kampanya level'ı + `partId` + worker URL + bölüm sonu olmaması + level'ın daha önce çözülmemiş/atlanmamış olması şartları (`usePlaySkip.ts:88-97`). Hızlı bir denemede buton görünmez.

Butonlar "pasif" ya da "tıklayınca hata" değil; **hiç render edilmiyor**. Belirtinin neden belirsiz olduğu da bu.

## 2. Zincir bütünlüğü (skip-level)

`SkipLevelButton` (PlayContent.tsx:76) → `usePlaySkip.confirm` → `useRewardedAction.run` → `MonetizationContext.runRewardedAction` → `rewardedActionService.runRewardedAction`
→ `prepareReward` (POST /rewards/prepare) → `adService.showRewarded()` → `admobProvider.showRewarded` → `showAdMobRewarded` (`admobRewarded.ts:37-69`) → `claimReward` (POST /rewards/claim) → worker `markDelivered` + `insertSkippedLevel` → Dexie `putSkippedLevel` → `onSkipped()`.

Kontrol edilenler:
- Ödül **yalnızca** `RewardAdPluginEvents.Rewarded` geldiyse veriliyor; yarıda kapatma → `{rewarded:false, reason:'closed'}` (`admobRewarded.ts:48-68`).
- Reklam başarısızsa `cancel` ile neden sunucuya loglanıyor (`rewardedActionService.ts:117`).
- Preload bağlı: `admobProvider.ts:24-26` `loadingFinished` → `preloadAdMobRewarded`.
- Native taraf: `@capacitor-community/admob ^8.0.0` (package.json:35); App ID manifest'e gradle ile enjekte ediliyor (`android/app/build.gradle:11-26,81`, `AndroidManifest.xml:17-18`), `android/local.properties` içinde `admobAppId` **var**.
- **Boş fonksiyon / sabit `false` / TODO bulunamadı.** `admobProvider`'daki boş gövdeler (`loadingStart`, `gameplayStart`, `happyTime`) portal kavramlarının AdMob karşılığı olmadığı için kasıtlı ve yorumla açıklanmış.
- `adService.showRewarded` hata/timeout'ta `{rewarded:false}` döner, asla throw etmez (`adService.ts:175-197`).

Tek "planlı eksik": reklamsız (ad-free) yol. `rewardedActionsConfig.ts:31` yorumuna göre 07'ye kadar kimsede hak yok; `via:'ad-free'` claim'i sunucuda `not-entitled` ile reddedilir (`rewardService.ts:193-196`). Ödüllü reklam yolunu etkilemez.

Doğrulanamadı (cihaz gerekir): `AD_TIMEOUTS_MS.rewarded` süresinin uzun ödüllü videoyu kesip kesmediği.

## 3. Platform farkı

| Platform | rewardedAds | Sağlayıcı | Atlama butonu | İpucu |
|---|---|---|---|---|
| web / electron | false | `noopProvider` (`showRewarded` → `unsupported`) | yok (disabled) | yok |
| android | true | `admobProvider` | var | yok (hint disabled) |
| crazygames | true | `crazyGamesProvider:59-62` | var | yok |
| gamedistribution | true | `gameDistributionProvider:37-54` | var | yok |
| mock | true | `mockProvider` | var | yok |

Web'deki kaybın kasıtlı olduğu kodda yazılı: "web/Electron'da kapalı (ürün sahibi kararı)" (`rewardedActionsConfig.ts:26`). **Boşluk değil, karar.** Ama sonucu şu: web build'inde takılan oyuncunun hiçbir çıkışı yok.

## 4. Sunucu tarafı

- Uçlar: `syncron-worker/src/routes/rewards.ts:49,66,88`; `src/index.ts:82` ile mount.
- Her uçta `firebaseAuth` + ban kontrolü + Zod şeması + `rateLimit(...)`. Kademe **bağlı**: `services/rateLimit/lib/policy.ts:121-123` → üçü de `{tier:'moderate', cost:1}`.
- Aksiyon başına sınır: `skipLevelAction.ts:36-38` → `freePerLevel:0`, `maxPerUidPerDay:50`, `maxPerUidPerMinute:5`.
- İş kuralları sunucuda, istemciye güvenmiyor: partId üyeliği Firestore'dan doğrulanıyor (`skipLevelAction.ts:58-73`), bölüm sonu / zaten çözülmüş / açık atlama sınırı `skipLevelPolicy.ts:37-44` (`maxOpenSkips:3`, `allowChapterEnd:false`).
- İdempotans: `reward_grants` durum makinesi (`prepared → delivered`), tekrar claim `redelivered` döner (`rewardService.ts:184-187`).
- **Açık:** reklamın gerçekten izlendiği doğrulanmıyor. `rewardService.ts:191-196` yalnızca `via:'ad-free'` için hak sorgular; `via:'ad'` **istemci beyanı** olarak kabul edilir. AdMob SSV bağlı değil ve kapsam dışı bırakıldığı yazılı: `.plans/monetization/raporlar/04-rapor.md:86`, `05-rapor.md:110`, `docs/platforms.md:188-195`. Etki sınırlı: atlama skor/yıldız/XP vermez, 3 açık atlama tavanı var, her claim loglanıyor.

## 5. Test kapsamı

Ölçüm: `npx vitest run src/services/monetization src/features` → **14 dosya / 79 test, hepsi geçti** (1.35 sn).

`admobProvider.test.ts` gerçekte ne doğruluyor (4 test, tamamı plugin mock'u üzerinden):
- env yokken üç kimliğin de Google test kimliğine düştüğü ve `usingTestIds === true` (satır 87-94) — yani bugünkü durumu test **onaylıyor**, hata saymıyor.
- `Rewarded` olayı gelmezse `{rewarded:false, reason:'closed'}` (satır 96-105).
- `Rewarded` gelirse `{rewarded:true}` (satır 107-117).
- Yüklenemezse `no-fill` döner, gösterim denenmez (satır 119+).

Gerçek AdMob SDK'sı, gerçek dolum, UMP rıza akışı ve Android yaşam döngüsü test edilmiyor.

Test **edilmeyen** halkalar: `adService.ts` (timeout, olay yayını, fullscreen bayrağı), `rewardedActionService.ts` (prepare→ad→claim orkestrasyonu, `running` kilidi, claim retry), `rewardsClient.ts`, `usePlaySkip`/`usePlayHint`. Testli olanlar: `accessPolicy`, `frequencyPolicy`, iki portal sağlayıcısı, `evaluateReleaseConfig`.

## 6. Kimlik eklenirse çalışır mı?

**Atlama (skip-level) için: kod tarafında engel yok — kesin cevap yalnızca gerçek cihazda imzalı build ile alınır.**
- Kimlik eklenince `resolveAdMobConfig` gerçek birimi kullanır, `usingTestIds` false olur (banner/interstitial de gerçek reklama döner), `verify-release-config` kapısı açılır.
- Zincirde bağlanmamış halka bulunamadı; native App ID zaten yapılandırılmış.
- Doğrulanamayanlar (cihaz gerektirir): gerçek dolum/no-fill davranışı, UMP rıza akışı sonrası reklam isteği, ödüllü timeout değeri, ödül callback'inin imzalı build'de tetiklenmesi.

**İpucu için: hayır.** Kimlik ipucuyu açmaz; ipucu hem istemcide hem worker'da `enabled:false` ve gerekçe teknik (Workers Free CPU sınırı). İpucunun dönmesi ayrı bir iş.

## TAVSİYE: (A), yanında küçük bir (C)

**(A) Kimliği ekle ve kapalı testte dene.** Gerekçe:
1. Ödüllü kod yolu bütün ve testleri geçiyor; kaldırmak için kanıt yok. "Çalışmıyor" belirtisi web'de denemekten + ipucunun kasıtlı kapalı olmasından geliyor.
2. Kimlik zaten **yayın kapısında zorunlu** (`releaseConfigRules.mjs:99-104`); eklemeden Android yayın build'i alınamıyor. Yani bu iş ödüllü reklamdan bağımsız olarak da yapılmak zorunda.
3. Eklemek ayrıca banner + interstitial'ı test reklamından gerçek reklama çevirir (bugün `usingTestIds` yüzünden ikisi de gelir üretmiyor).
4. Kaldırmak, takılan oyuncunun Android'deki tek çıkışını da yok eder.

**Yanında gereken küçük düzeltmeler:**
- Denemeyi `npm run build:mobile` + gerçek cihazla yap; tarayıcıda test etme. Butonu görmek için 180 sn bekle ya da 3 kez yeniden başlat. Hızlı doğrulama için `npm run dev:mock` (mock platform ödüllü akışı uçtan uca gösterir).
- İpucunun kasıtlı kapalı olduğunu yayın notlarına/kontrol listesine yaz — yoksa "ödüllü çalışmıyor" algısı tekrar eder.
- `usingTestIds`'in tek eksik birim yüzünden TÜM birimleri test moduna almasını bilinçli kabul et; kimlik eklenince kendiliğinden kapanır.
- SSV'siz `via:'ad'` açığı kabul edilmiş risk; atlamanın skor üretmemesi bunu taşınabilir kılıyor. Ödüllü reklam bir para birimine bağlanacaksa SSV önce gelmeli.

**(B) özellikleri kaldırma tavsiye edilmez.**
