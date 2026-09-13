# 04 — Ödüllü İpucu — Rapor

## Kararlar (ürün sahibi — Ahmet, 2026-09-13)

- **Skor kuralı:** (a) — ipucu kullanılan çözüm en fazla **2★**, global en iyi çözüm listesine / New Best·Best·Good rozetlerine ve kişisel en iyi hamle sayısına **sayılmaz**. XP normal verilir.
- **Hesaplama yeri (revize):** ipucu **yalnızca Cloudflare Worker'da** hesaplanır. İstemcide çözücü çağrısı, Web Worker ya da ipucu hesaplaması yoktur. İlk sürümdeki "istemci hesaplar + sunucu grant verir" tasarımı ürün sahibinin isteğiyle tamamen kaldırıldı.
- **İpucu içeriği:** çözüme kalan adım sayısı + mevcut durumdan sonraki **en fazla 5 adım**. Mevcut durum çözümsüzse: "N kez geri al" (en yakın çözülebilir nokta) ya da "baştan başla" + o noktadan kalan adım ve 5 adım.
- **Erişim:** sunucudaki kontrol katmanından geçmeden içerik verilmez: reklam izlendi / reklamsız hak / level başına 1 ücretsiz hak (sunucuda sayılır).
- **Log:** her adım kalıcı kayıt + audit log (itiraz durumunda kanıt).
- **Reklamsız platform (web/Electron):** level başına **1** ücretsiz ipucu (yapılandırılabilir).
- **"Adım İleri" (F / HUD):** `/play`'den kaldırıldı; editör test modunda istemci çözücüsüyle kalıyor (yalnızca level tasarımcısı).

## Akış

```
İstemci (/play)                          Worker
───────────────                          ──────
İpucu butonu → onay kartı (girdi kilitli)
POST /rewards/prepare ─────────────────▶ auth + ban + Zod
  { action:'hint', levelId,               level'ı Firestore'dan yükle
    input:{ moves:['u','r','s',…] } }     hamleleri başlangıçtan OYNAT (sahte durum gönderilemez)
                                          aynı durum için kayıt var mı? → yeniden kullan
                                          tavan (10/dk, 200/gün) → çözücü → reward_grants 'prepared'
                     ◀────────────────── { requestId, freeRemaining }      ← İÇERİK YOK
ödüllü reklam (gerekiyorsa)
  başarısız → POST /rewards/cancel ────▶ 'cancelled' + neden (kayıt tekrar denenebilir)
POST /rewards/claim { requestId, via } ▶ kayıt bu kullanıcının mı?
                                          via='free'   → level kotası (atomik UPDATE)
                                          via='ad-free'→ sunucu hakkı (07'ye kadar: yok → ret)
                                          'delivered' + audit log (içerik dahil)
                     ◀────────────────── { result: { stepsRemaining, moves[≤5], undoSteps, restart } }
panel: "Çözüme N adım kaldı" + ↑→⇄…
oyuncu takip ettikçe ilerler, saparsa kapanır
```

## Ne yapıldı

### Worker (`syncron-worker/`)

| Dosya | Sorumluluk |
|---|---|
| `services/hint/replay.ts` | Hamle geçmişini çözücünün `transition`'ı ile oynatır; oyun bitmiş / kazanılmış / imkânsız oda değiştirme içeren geçmişi reddeder |
| `services/hint/computeHint.ts` | Mevcut durumu çözer → kalan adım + ilk 5 adım. Kesin çözümsüzse yön hamlelerinden geriye doğru en yakın çözülebilir noktayı arar (`undoSteps`), bulamazsa baştan başlama. Bütçe yetmezse `null` — yanlış ipucu verilmez, reklam gösterilmez |
| `services/hint/hintBudget.ts` | Durum sayısı bütçesi (Worker'da süre ölçülemez); ölçüm notu dosyada |
| `services/hint/hintAction.ts` | İpucu aksiyon handler'ı: girdi şeması, level yükleme, kural (1 ücretsiz/level, 10/dk, 200/gün) |
| `services/rewards/rewardService.ts` | Aksiyondan bağımsız `prepare` / `claim` / `cancel` + `audit_logs` (`category='reward'`) |
| `services/rewards/rewardGrants.ts` | D1 işlemleri; tüm sorgular `uid` ile sınırlı; teslim ve ücretsiz kota tek koşullu UPDATE (atomik) |
| `services/rewards/actions.ts`, `types.ts` | Aksiyon kaydı + `RewardActionHandler` sözleşmesi (05 buraya bağlanır) |
| `services/rewards/entitlement.ts` | Sunucu tarafı reklamsız hak — 07'ye kadar herkes için `false` |
| `routes/rewards.ts`, `schemas/rewards.ts` | İnce route katmanı; `requestId` sunucuda üretilen UUID |
| `migrations/0011_reward_grants.sql` | `reward_grants` (durum, girdi, sonuç, via, platform, zaman damgaları) + `level_telemetry.hints_used` |
| `services/hintScoring.ts`, `routes/game.ts` | `/complete-level`: teslim edilmiş + tüketilmemiş ipucu **veya** istemci `hintsUsed>0` → ≤2★, rekor/rozet/kişisel en iyi yok |
| `scheduled/anonymousCleanup.ts` | Silinen anonim kullanıcının `reward_grants` satırları da silinir (audit_logs ile tutarlı) |
| `test/hintEngine.spec.ts` (8), `test/rewards.spec.ts` (14) | Motor + akış + güvenlik kuralları |

`src/game-engine/solver/solver.ts`: worker'da derlenebilsin diye göreli import; `transition` export; `solveFromState` `exhausted` alanı (arama tükendi mi) ve O(1) kuyruk.

### İstemci (`src/`)

- **Silindi:** `game-engine/hint/` altındaki hesaplama, önbellek, bütçe, Web Worker ve yerel motor dosyaları.
- `game-engine/hint/`: yalnızca `ServerHint` / `ActiveHint` tipleri, `hintProgress.ts` (takip → ilerle / sapma → kapan; 4 test), `hintTargets.ts` (board oku).
- `services/monetization/rewarded/rewardedActionService.ts`: prepare → reklam (başarısızsa cancel) → claim (geçici hatada 1 tekrar); sunucunun bildirdiği kotayla yerel kopyayı eşitler.
- `services/api/rewardsClient.ts`: `/rewards/prepare|claim|cancel`, sunucu hata kodu → kullanıcı mesajı.
- `features/play/hooks/usePlayHint.ts`: yalnızca Firestore id'li level'larda; kart açıkken oyun girdisi kilitli (`PlayScreen` → `usePlayInput.inputLockedRef`).
- `play-screen/hint/HintBanner.tsx`: "Çözüme N adım kaldı" / "N kez geri al, sonra M adım" / "baştan başla…" + 5 adım çipi (basılacak tuş; `⇄` oda değiştir). `HintBoardMarker`: sıradaki adımda oyuncuların fiili yönü. Geri al / baştan başla aşamasında ilgili HUD butonu nabız atar.
- **Düzeltilen mevcut hata:** `usePlaySession.handleUndoExecuted` oda değiştirmeden sonra geri alındığında hamle geçmişinden yanlış kaydı düşüyordu (motor oda değiştirmeyi ayrı geçmiş kaydı olarak tutmaz). Artık son yön hamlesinden sonraki oda değiştirmeler de düşülüyor. Bu hem ipucunu hem de `/complete-level` doğrulamasını etkiliyordu.

## Güvenlik modeli

- **İpucu içeriği istemciye yalnızca `claim` ile gider**; `prepare` yanıtında içerik yoktur (testle doğrulanır). İstemci kodu değiştirilse bile claim'siz içerik alınamaz.
- **İstemci durum gönderemez**, yalnızca hamle geçmişi; worker durumu level verisinden kendisi üretir.
- **Başkasının kaydı** okunamaz, teslim alınamaz, iptal edilemez, tüketilemez (`uid` koşulu; testli). `requestId` sunucuda üretilen UUID.
- **Ücretsiz kota sunucuda**, teslim anında tek atomik UPDATE ile uygulanır (eşzamanlı iki istek kotayı aşamaz).
- **Reklamsız beyanı** sunucudaki hakla doğrulanır; hak sistemi 07'de bağlanana kadar reddedilir.
- **Tekrar teslim:** aynı kayıt tekrar claim edilirse aynı içerik döner; aynı durum için yeni `prepare` teslim edilmiş içeriği doğrudan döner. Reklamı izleyip ağ hatası yaşayan oyuncu ödülünü kaybetmez, aynı ipucu için iki kez reklam izlemez.
- **Log / itiraz kanıtı:** `reward_grants` satırları silinmez (girdi, sonuç, via, platform, prepared/delivered/cancelled zamanları). Her olay (`reward.prepared`, `reward.cancelled` + neden, `reward.delivered` + içerik, `reward.redelivered`, `reward.claim_rejected`, `reward.unavailable`, `reward.rate_limited`) `audit_logs`'a yazılır ve 90 gün sonra R2'ye arşivlenir.
- **Kalan açık — reklamın izlendiği sunucudan doğrulanamaz:** CrazyGames/GameDistribution SDK'larında sunucu doğrulaması yoktur; istemci kodunu değiştiren biri `via:'ad'` ile reklamsız claim yapabilir. Sınırları: dakikada 10, günde 200 ipucu; her ipucu skoru ≤2★'a düşürür; her claim loglanır. Android'de AdMob **Server-Side Verification (SSV)** ile kapatılabilir (AdMob, ödül verildiğinde imzalı bir callback'i worker'a gönderir) — bu iş kapsam dışı bırakıldı.
- **Kalan açık — editör çözücüsü:** editör "Adım İleri" için çözücü hâlâ istemci paketinde. Kararlı biri bunu kullanarak kendi çözümünü "ipucusuz" gönderebilir. Bu, ipucu sisteminin değil çözücünün istemcide olmasının sınırıdır; çözücünün editörden de worker'a taşınması ayrı iş.
- Anonim kullanıcı temizliği (`anonymousCleanup`) inaktif anonim hesabın `audit_logs` ve `reward_grants` kayıtlarını siler (KVKK ile tutarlı); R2'ye arşivlenmiş olanlar kalır.

## Maliyet (CPU)

Ölçüm (Node/V8, 2 oyunculu açık grid, durum başına ~100 µs @8x8 → ~450 µs @12x12):

| Level | Çözülebilir durumdan ipucu | En kötü (çözümsüz, geniş uzay) |
|---|---|---|
| 6x6, 1 oyuncu | ~20 ms | ~20 ms (arama tükendi) |
| 8x8, 2 oyuncu | ~0,1 sn | ~1,2 sn |
| 12x12, 2 oyuncu | ~2,4 sn | bütçe başına ~2,7 sn |

Bütçe: arama başına 6.000, toplam 12.000 durum (+ baştan başlama için 6.000). En kötü istek ≈ 18.000 durum ≈ 12x12'de ~8 sn CPU; **Workers Paid** planı gerekir (Free planda 10 ms CPU sınırı var, ipucu çalışmaz). Çok büyük/karmaşık level'larda bütçe yetmezse sonuç `unavailable` olur: oyuncuya reklam gösterilmez, "birkaç hamle sonra tekrar dene" mesajı çıkar ve olay loglanır.

## Doğrulama

- Worker `vitest`: **95/95** (yeni 22). Worker `tsc` temiz — çözücü workerd çalışma zamanında testlerle çalıştırıldı.
- İstemci `vitest`: **63/63**. İstemci `tsc` temiz. `npm run build` başarılı.
- Değişen dosyalarda `eslint` temiz; `PlayScreen.tsx:122` ve `solver.ts` `as any` hataları öncesinden var.
- **Tarayıcıda ve gerçek worker'a karşı elle doğrulanmadı.** Önerilen kontrol: `wrangler dev` + `npm run dev:mock` → debug panelinden `success` / `no-fill` / `user-closed`; ipucu paneli ve adım takibi; çözümsüz duruma düşüp geri al / baştan başla; web build'de ikinci ücretsiz ipucunun sunucuda reddi; oda değiştirilen bir level'da geri alma sonrası ipucu; D1'de `reward_grants` ve `audit_logs` kayıtları.

## Dağıtım sırası (önemli)

1. `0011_reward_grants.sql` **yeniden yazıldı**. Önceki sürüm uzak D1'e hiç uygulanmadıysa (dosya commit edilmemişti):
   `cd syncron-worker && npx wrangler d1 execute syncron-audit-logs --remote --file=migrations/0011_reward_grants.sql`
   Önceki sürüm **uygulandıysa**: önce `DROP TABLE reward_grants;` çalıştırın (o sürümün kayıtları yalnızca test amaçlıydı), `ALTER TABLE level_telemetry` satırını çıkararak dosyayı uygulayın.
2. Worker deploy (Workers Paid planı).
3. İstemci build'leri.

`/complete-level` migration yokken de kırılmaz (ipucu okuması hata verirse istemci beyanına düşer); `/rewards/*` 500 döner ve ipucu sunulmaz.

## Kapsam dışı notlar (düzeltilmedi)

- AdMob SSV (Android'de reklamın sunucuda doğrulanması) — bkz. Güvenlik modeli.
- Editör çözücüsünün worker'a taşınması.
- `solveFromState`/`solvePuzzle` `visited` anahtarı toggle/power gibi hücre durum değişikliklerini içermiyor; bu hücrelere bağlı level'larda çözücü çözümü kaçırabilir → ipucu yanlışlıkla "geri al"/"baştan başla" önerebilir ya da `unavailable` döner.
- Aksiyon butonları (`ActionPanel`: kablo, kilit, ışık) hamle geçmişine yazılmıyor ve çözücünün hamle kümesinde yok; bu butonları kullanan level'larda sunucu oynatması istemciyle uyuşmaz (hem ipucu hem `/complete-level` doğrulaması etkilenir).
- `usePlaySession`: restart sonrası `reload()` → `beginSession` yeni oturum açtığı için `restarts/deaths` sayaçları telemetride sıfırlanıyor olabilir.
- Admin level silme kaskadı (`deleteLevelRecords`) `reward_grants` satırlarını silmiyor (kanıt olarak kalmaları bilinçli de olabilir).

## 05 (level atlama) için notlar

- İstemci: `REWARDED_ACTIONS`'a `'skip-level'`, `rewardsClient.RewardActionId`'yi genişlet; `useRewardedAction(...).run({ prepare, claim, cancel })` + `RewardedActionDialog`.
- Worker: `RewardActionHandler` yaz (`resolve` level'ı yükler, `compute` atlama kaydını hazırlar), `services/rewards/actions.ts`'e ekle. Şema aksiyon listesini buradan alır. Teslimde yan etki gerekiyorsa (ör. `played_levels`'a atlandı işareti) `rewardService.claimReward`'a handler başına `onDelivered` kancası eklenebilir.
- İpucunun "teslim edildi → bir sonraki tamamlamaya uygulanır" semantiği `hintScoring.ts`'e özgüdür; atlama kendi kuralını tanımlar.
