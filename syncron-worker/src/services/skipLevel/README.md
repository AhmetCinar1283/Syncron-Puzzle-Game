# services/skipLevel — Ödüllü level atlama (05)

Takılan oyuncu ödüllü reklam izleyerek kampanya level'ını atlar. Atlama **yalnızca
ilerleme kilidini açar**: yıldız, skor, hamle, XP, liderlik puanı ya da rozet üretmez.

| Dosya | Sorumluluk |
|---|---|
| `skipLevelPolicy.ts` | Yapılandırma (`maxOpenSkips: 3`, `allowChapterEnd: false`) + saf karar `evaluateSkip` + bölüm sırası yardımcıları |
| `skipLevelAction.ts` | `RewardActionHandler`: `levelParts/{partId}` + `levels/{id}` yükler, kuralları uygular, teslimde (`onDelivered`) kaydı yazar |
| `skippedLevels.ts` | `skipped_levels` D1 işlemleri (idempotent ekleme, açık atlama sayısı, delta sync, silme kaskadı) |

## Akış

```
POST /rewards/prepare { action:'skip-level', levelId, input:{ partId } }
  → level bu bölümde mi? (değilse 404 level-not-in-part)
  → zaten çözülmüş mü? (409 already-completed)
  → bölüm sonu mu? (403 chapter-end)
  → açık atlama ≥ 3 ve bu level atlanmamış mı? (409 skip-limit)
  → reward_grants 'prepared'                     ← reklam ancak bundan sonra gösterilir
POST /rewards/claim { requestId, via:'ad' }
  → reward_grants 'delivered' → onDelivered → INSERT OR IGNORE skipped_levels
```

`via:'free'` her zaman reddedilir (`freePerLevel: 0`); `via:'ad-free'` sunucudaki
reklamsız hakla doğrulanır (07'ye kadar herkes için yok).

## Neden `played_levels` değil de ayrı tablo

`played_levels.stars` NOT NULL (1-3), `/complete-level` ilk tamamlamayı "satır yok"
ile tespit ediyor ve level silme kaskadı her satır için `levels_done - 1` yapıyor.
Atlama satırı oraya yazılsaydı üçü de bozulurdu. Ayrı tablo, skor yolunu hiç
değiştirmeden "atlama skor vermez" garantisini yapısal olarak sağlar.
