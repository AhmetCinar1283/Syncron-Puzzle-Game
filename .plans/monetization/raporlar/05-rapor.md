# 05 — Ödüllü Level Atlama — Rapor

## Kararlar (ürün sahibi — Ahmet, 2026-09-13)

- **Sunucuya ulaşılamazsa atlama yok.** 02'deki "skor ve ilerleme sunucudan" kararıyla tutarlı: `prepare`/`claim` başarısızsa nazik mesaj gösterilir, atlama verilmez. Portal build'leri de worker'ı kullandığı için orada da sunucu gerekir. Bir kez alınan "atlandı" durumu Dexie'de kalır ve çevrimdışıyken de haritada/kilitte geçerlidir.
- **Web/Electron'da kapalı.** Yalnızca ödüllü reklamı olan platformlarda (Android, CrazyGames, GameDistribution) sunulur.
- **Kötüye kullanım sınırı: en fazla 3 açık atlama** (atlanmış ama henüz çözülmemiş level). Gerekçe aşağıda.
- **Bölüm sonu level'ı atlanamaz** (yapılandırılabilir). Bölümdeki diğer atlanmış level'lar sonraki bölüm portalını açmaya sayılır. Bölüm sayacında (ChapterDock) yalnızca gerçekten çözülenler "tamamlandı" sayılır.

## Kilit mantığının tespiti

- Kilit **yalnızca istemcide**: `features/levels/hooks/useLevelsPage.ts → lockedSet` (bölüm sırasına göre "önceki level çözüldü mü"). Worker `/complete-level` kilit kontrolü yapmaz. Firestore kuralı `canReadLevel()` şu an `true` döner.
- Bu yüzden "atlandı" durumu aynı yere eklendi: kural saf `features/levels/lib/progression.ts`'e taşındı, **çözüldü veya atlandı → sonraki açılır**.
- "Atlama skor vermez" garantisi sunucuda **yapısal**: atlama `played_levels`'a hiç yazılmaz, ayrı `skipped_levels` tablosuna yazılır. `/complete-level`'a dokunulmadı.
  - `played_levels` neden kullanılmadı: `stars NOT NULL CHECK 1-3`, ilk tamamlama "satır yok" ile tespit ediliyor ve silme kaskadı satır başına `levels_done - 1` yapıyor. Üçü de bozulurdu.

## Akış

```
/play                                           Worker
─────                                           ──────
takılma eşiği (≥3 başarısız deneme VEYA ≥180 sn)
+ kampanya level'ı, çözülmemiş/atlanmamış, bölüm sonu değil
+ platformda ödüllü reklam var
→ "Level'ı Atla" butonu → onay kartı (girdi kilitli)
POST /rewards/prepare ────────────────────────▶ levelParts/{partId} üyeliği, zaten çözüldü mü,
  { action:'skip-level', levelId,                bölüm sonu mu, açık atlama < 3 mü
    input:{ partId } }                           → reward_grants 'prepared'
                    ◀────────────────────────── { requestId }   (kurala takılırsa 403/409, reklam YOK)
ödüllü reklam (başarısız → /rewards/cancel)
POST /rewards/claim { via:'ad' } ─────────────▶ 'delivered' → onDelivered → skipped_levels (idempotent)
                    ◀────────────────────────── { result:{ levelId } }
Dexie skippedLevels ← kayıt; telemetri outcome='skip'; sonraki level'a (bölüm sonuysa /levels)
```

## Ne yapıldı

### Worker (`syncron-worker/`)

| Dosya | Değişiklik |
|---|---|
| `migrations/0012_skipped_levels.sql` | `skipped_levels(uid, level_id, level_version, grant_id, skipped_at, updated_at)`; skor alanı yok |
| `services/skipLevel/skipLevelPolicy.ts` | `SKIP_LEVEL_POLICY` (`maxOpenSkips: 3`, `allowChapterEnd: false`) + saf `evaluateSkip`, bölüm sırası yardımcıları |
| `services/skipLevel/skipLevelAction.ts` | `RewardActionHandler`: `freePerLevel: 0`, 5/dk, 50/gün; `resolve` kuralları uygular; `onDelivered` kaydı yazar |
| `services/skipLevel/skippedLevels.ts` | D1 işlemleri (idempotent ekleme, açık atlama sayısı, delta sync, silme ifadesi) |
| `services/rewards/types.ts`, `rewardService.ts` | **Altyapıya genel eklemeler:** `onDelivered` kancası (teslim, yeniden teslim ve teslim edilmiş kaydın yeniden kullanımında çağrılır → ilk yazma başarısızsa onarılır); `resolve` 403/409 ile reddedebilir (`reward.not_allowed` loglanır); `resolve` artık `uid` alır |
| `services/rewards/actions.ts` | `'skip-level'` kaydı (şema aksiyon listesini buradan alır) |
| `routes/playedLevels.ts` | `GET /played-levels` yanıtına `skippedLevels[]` (aynı `since` imleci) |
| `services/playedLevels.ts` | Admin level silme kaskadı `skipped_levels`'ı da siler |
| `scheduled/anonymousCleanup.ts` | Silinen anonim kullanıcının `skipped_levels` satırları da silinir |
| `schemas/game.ts`, `services/telemetry.ts` | Telemetri `outcome: 'skip'`; analitikte `total_skips` (level sürümü başına, `skipped_levels`'tan) |
| `test/skipLevel.spec.ts` | 14 test: kural, bölüm sırası, açık atlama sayımı, idempotentlik, silme kaskadı, teslimde yazma, `played_levels`'a dokunmama, ücretsiz yolun reddi, yeniden teslimde onarım, kural reddinin loglanması |

### İstemci (`src/`)

- **Yapılandırma:** `services/monetization/rewarded/rewardedActionsConfig.ts` içinde `'skip-level'` tanımlı: reklam varsa `ad`, yoksa `disabled`, reklamsız kullanıcı için `free`. Yeni ret nedenleri `limit-reached` ve `not-allowed`; `rewardsClient` sunucu kodlarını bunlara eşler.
- **Veri:** Dexie v11'de `skippedLevels` tablosu eklendi. Upgrade D1 imlecini siler, böylece ilk sync atlama kayıtlarını da tam çeker. `services/db/skippedLevelsOps.ts` ve `services/sync/applySkippedLevels.ts` eklendi. Kullanıcı değişince tablo temizlenir.
- **Levels:**
  - `lib/progression.ts` (5 test): kilit, "ilerletildi" ve durum (`completed` > `skipped` > `none`).
  - Portal geçişi "tümü çözüldü veya atlandı" koşuluna bağlandı.
  - **Görsel:** haritada kesik çizgili mor çerçeve, ⏭ rozeti ve kesik yol çizgisi. Liste satırında ve detay panelinde `SkippedBadge`; ipucu metni "reklamla atlandı, skor vermez, dönüp çözebilirsin". Çözülen level her zaman "tamamlandı" gösterilir.
- **Play:**
  - `lib/skipLevelConfig.ts` (9 test): eşikler (`minFailedAttempts: 3`, `minSecondsInLevel: 180`, `allowChapterEnd: false`), `isPlayerStuck`, `canOfferSkip`.
  - `hooks/usePlaySkip.ts`: ortak `useRewardedAction` ve `RewardedActionDialog` üzerinden çalışır. Süre ve deneme sayısı yeniden başlatmada korunur, level değişince sıfırlanır. Çözülmüş ya da atlanmış level'da buton gösterilmez.
  - `SkipLevelButton` board alanının altında belirir. `SkipLevelDialog` "skor/yıldız/XP vermez" notunu gösterir.
  - `usePlayPage` başarısız denemeyi bildirir. Atlamadan sonra telemetri `skip` gönderilir ve sonraki level'a geçilir. Reklam zaten izlendiği için bölüm arası reklam kontrolü atlanır.
- **`game-engine/PlayScreen`:** atlamayı bilmeyen iki genel prop eklendi: `inputLocked` ve `areaAccessory`.
- **Admin analitik:** level detayına "Atlayan Oyuncu" kartı eklendi (`total_skips`).
- **i18n:** `skip.*`, `levels.skipped*`, `rewarded.decline_limit|not_allowed` (tr + en).

## Kötüye kullanım sınırı — gerekçe

Atlama skor, yıldız ya da liderlik değeri vermez; tek kazanım daha fazla level'a erişmek. Bu yüzden ağır bir sınır gerekmez. Sınırın amacı hile önlemekten çok, oyunun "reklam izle, hepsini geç" şeklinde oynanmasını önlemek:

- **"Açık atlama ≤ 3"** seçildi, "sıralamada art arda ≤ N" seçilmedi:
  - Tek bir COUNT sorgusuyla uygulanır. Bölüm sırasına ya da bölümler arası ilişkiye bağlı değil, level yeniden sıralandığında bozulmaz.
  - Oyuncuyu atladıklarından birini çözmeye yönlendirir. "Atlanan level'a geri dönüp çöz" hedefiyle doğrudan örtüşür.
  - Aynı level'ı tekrar atlamak sınıra sayılmaz. Ağ hatasında ödül kaybolmaz (yeniden teslim).
- **Ek tavanlar:** 5/dk ve 50/gün yeni kayıt. Her adım `audit_logs`'a yazılır.

## Plandan sapmalar

- **"Portal build'lerinde (sunucu yokken) yerel olarak çalışır"** maddesi, ürün sahibinin kararıyla "sunucu yoksa atlama yok" olarak uygulandı. Portallar zaten worker kullanıyor. "Yerel" kısmı şu anlama geliyor: alınmış atlama durumu Dexie'de tutulur ve çevrimdışıyken de haritada ve kilitte geçerlidir.
- **Telemetri iki kaynaktan beslenir.** Oturum `outcome='skip'` ile kapanır (süre, restart ve ölüm sayıları korunur). "Kaç kez atlandı" sayısının asıl kaynağı ise sunucudaki `skipped_levels`'tır, çünkü istemci beyanı değildir.

## Doğrulama

- Worker `vitest`: **112/112** (14'ü yeni). Worker `tsc` temiz.
- İstemci `vitest`: **78/78** (15'i yeni). İstemci `tsc` temiz. `npm run build` başarılı.
- Değişen modüllerde `eslint`: yeni bulgu yok. Kalan bulgular öncesinden var (`PlayScreen.tsx:129` refs, `useWinFeedback`/`useWinAuthPrompt` set-state-in-effect, `gameClient.ts` ve `schema.ts` `any`, `MainComparisonChart` unused).
- **Tarayıcıda, cihazda ve gerçek worker'a karşı elle doğrulanmadı.** Önerilen kontrol (`wrangler dev` + `npm run dev:mock`):
  1. Bir level'da 3 kez restart → buton görünür.
  2. Debug panelinden `success` → sonraki level açılır. Haritada "atlandı" görünür, yıldız/skor değişmez.
  3. `no-fill` / `user-closed` → nazik mesaj, atlama yok.
  4. 3 açık atlamadan sonra 4.'sü → sınır mesajı (reklam gösterilmeden).
  5. Bölüm sonu level'ında buton yok.
  6. Atlanan level'ı çöz → normal ilk tamamlama (yıldız + skor + XP), "tamamlandı" görünür.
  7. Başka cihazda / veri temizleyip giriş → sync ile "atlandı" gelir.
  8. `npm run dev` (web) → buton hiç yok.
  9. D1'de `skipped_levels`, `reward_grants` ve `audit_logs` kayıtları oluşmuş olmalı.

## Dağıtım sırası (önemli)

1. `cd syncron-worker && npx wrangler d1 execute syncron-audit-logs --remote --file=migrations/0012_skipped_levels.sql`
2. Worker deploy. Migration yoksa `GET /played-levels` çalışmaya devam eder (atlama listesi boş döner, hata loglanır), ancak `/rewards/*` atlama isteği 500 döner ve atlama verilmez. **Önce migration uygulanmalı.**
3. İstemci build'leri. Eski istemci `skippedLevels` alanını yok sayar. Yeni istemci eski worker'da alan yoksa boş kabul eder.

## Açık konular / kapsam dışı notlar (düzeltilmedi)

- **Reklamın izlendiği sunucudan doğrulanamaz** (04 ile aynı açık). Değiştirilmiş istemci `via:'ad'` ile reklamsız atlayabilir. Etkisi sınırlı: skor yok, en fazla 3 açık atlama, her claim loglanıyor. Android'de AdMob SSV ile kapatılabilir.
- **Sınır yarışı:** açık atlama sınırı `prepare` anında sayılır. Aynı anda farklı level'lar için hazırlanan kayıtlar sınırı birkaç adet aşabilir. Hafif sınır için kabul edildi.
- **Sunucu "bu level açık mı" kontrolü yapmaz.** Kilit istemci tarafında olduğu için atlama da önceki level'ın açık olup olmadığını denetlemez. Mevcut durumda `/play?id=` ile kilitli level zaten oynanabiliyor (bu işten önce de böyleydi).
- **Reklamsız kullanıcı ve web (07 için):** yapılandırmada `adFreeUser: free` duruyor. 07'de reklamsız hak bağlandığında web'deki reklamsız kullanıcıya da atlama açılır. 07'de "web'de kapalı" kararına göre `adFreeUser` gözden geçirilmeli.
- **Bölüm sonu tespiti:** istemci Dexie'deki `nextLevelId === null` değerini kullanır, sunucu `levelParts` sırasını. Dexie sırası eskiyse buton görünüp sunucu `chapter-end` ile reddedebilir. Sunucu bağlayıcıdır, reklam gösterilmez.
- **Analitik:** `total_skips` yalnızca telemetri kaydı olan level sürümleri için listelenir (analitik sorgusu `level_telemetry`'den başlar).
- `docs/scoring.md → Firestore Rule` bölümü eskimiş: `canReadLevel()` şu an `true` döner, `playedLevels` alt koleksiyonu artık kullanılmıyor.
- `anonymousCleanup` inaktif anonim kullanıcının `played_levels` satırlarını silmiyor. Öncesinden var, dokunulmadı.
- `useLevelsPage.ts` ~420 satır (god-file eşiği üstünde, öncesinden). Bu işte kilit hesabı dışarı taşınarak kısaldı; kalanı ayrı iş.

## Sonraki görevler için notlar

- Ödül altyapısına eklenen `onDelivered` kancası ve 403/409 `resolve` reddi geneldir. 06 (günlük bulmaca) bir ödülü kalıcı yan etkiyle teslim edecekse aynı yolu kullanabilir.
- Oyun ekranına yeni bir ödüllü buton/kart eklemek için `PlayScreen`'in `areaAccessory` ve `inputLocked` prop'ları kullanılabilir. `game-engine` ödülden haberdar olmaz.
