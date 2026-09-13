# features/rewarded-actions

"Ödüllü aksiyon"un React tarafı — **aksiyondan bağımsız**. İpucu (04) ilk
kullanıcısıdır; level atlama (05) ve sonraki ödüllü aksiyonlar aynı parçaları
kullanır, yeni bir reklam akışı yazılmaz.

## Akış — ödülün içeriği sunucudadır

```
istemci                              worker (syncron-worker)
───────                              ───────────────────────
erişim kararı (buton/kart)
prepare ───────────────────────────▶ POST /rewards/prepare
                                       ödülü hesapla + reward_grants'a yaz
                     ◀─────────────── { requestId }            (içerik YOK)
(gerekiyorsa) ödüllü reklam
  başarısız → cancel ──────────────▶ POST /rewards/cancel      (neden loglanır)
claim ─────────────────────────────▶ POST /rewards/claim
                                       hak kontrolü: ücretsiz kota, reklamsız hak
                     ◀─────────────── { result }                (içerik)
```

Her sunucu adımı `audit_logs`'a (`category='reward'`) yazılır. Aynı durum için
tekrar `prepare` gelirse hesaplama yeniden yapılmaz; ödül teslim edildiyse
reklam gerekmeden aynı içerik döner.

## Katmanlar

```
services/monetization/rewarded/        (saf karar + akış, React yok)
  rewardedActionsConfig.ts   aksiyon başına erişim yapılandırması (TEK yer)
  accessPolicy.ts            reklamsız / ödüllü reklam var / yok → yol kararı (testli)
  freeQuota.ts               ücretsiz hakkın cihazdaki KOPYASI (buton için; asıl kota sunucuda)
  rewardedActionService.ts   karar → prepare → reklam → claim (1 tekrar); asla throw etmez
services/api/rewardsClient.ts  /rewards/prepare | claim | cancel
contexts/MonetizationContext   runRewardedAction / getRewardedAvailability
features/rewarded-actions/     (bu klasör)
  hooks/useRewardedAction.ts        erişim durumu, busy, hata mesajı anahtarı
  components/RewardedActionDialog   onay kartı (reklam izle / ücretsiz kullan / engelli)
  lib/declineMessages.ts            ret nedeni → i18n anahtarı
syncron-worker/src/services/rewards/
  actions.ts                 sunucudaki aksiyon kaydı (TEK yer)
  rewardService.ts           prepare / claim / cancel + audit log
  rewardGrants.ts            reward_grants D1 işlemleri
  entitlement.ts             sunucu tarafı reklamsız hak (07'de bağlanacak)
```

## Yeni bir ödüllü aksiyon eklemek (ör. 05 level atlama)

1. İstemci: `rewardedActionsConfig.ts` → `REWARDED_ACTIONS`'a satır ekle; `rewardsClient.ts`'teki
   `RewardActionId` birliğini genişlet.
2. Worker: bir `RewardActionHandler` yaz (`rule`, `parseInput`, `inputKey`, `resolve` → `compute`)
   ve `services/rewards/actions.ts`'e ekle. Şema (`schemas/rewards.ts`) aksiyon listesini buradan alır.
3. Feature'da:
   ```ts
   const rewarded = useRewardedAction('skip-level', levelId);
   const outcome = await rewarded.run<SkipResult>({
     prepare: () => prepareReward('skip-level', levelId, {}),
     claim: (requestId, via) => claimReward(requestId, via),
     cancel: (requestId, reason) => cancelReward(requestId, reason),
   });
   if (outcome.status === 'granted') { /* ödülü uygula */ }
   ```
4. Kartı `RewardedActionDialog` ile göster; metinleri çağıran verir.

## Davranış kuralları

- Reklamsız kullanıcıya **asla** reklam gösterilmez (`accessPolicy`); sunucu da reklamsız beyanını kendi kaydıyla doğrular.
- Sunucu ödülü hazırlayamazsa reklam **gösterilmez**.
- Reklam doldurulamaz / kapatılır / hata verirse ödül verilmez, neden sunucuya bildirilir; kayıt tekrar denenebilir kalır.
- Ücretsiz kota sunucuda, teslim anında ve atomik olarak uygulanır.
- Aynı anda tek ödüllü akış çalışır (`busy`).
