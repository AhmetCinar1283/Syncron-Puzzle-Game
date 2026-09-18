# `services/recovery` — Veri Onarımı

Türetilmiş tabloları kaynağından yeniden kuran, yıkıcı işlemleri onaya bağlayan ve
soğuk dışa aktarımın kurallarını tanımlayan modül.

Görev: `.plans/yayin-hazirlik/02-veri-dayanikliligi.md` · Runbook: `docs/release/veri-kurtarma.md`

## Dosyalar

| Dosya | İş |
|---|---|
| `confirmDestructive.ts` | İki adımlı onay kapısı (saf). "Önce say, sonra onayla." |
| `recomputeUserScores.ts` | `user_period_scores` ← `played_levels` (all_time) + `audit_logs` (periyodik) |
| `recomputeCreatorScores.ts` | `creator_scores` ← `played_levels` + enjekte edilen bölüm sahipliği |
| `recomputeBadges.ts` | Bir periyodun rozetlerini yeniden dağıtır (`scheduled/badgeDistribution` yeniden kullanılır) |
| `levelCreatorLookup.ts` | `LevelCreatorLookup` sözleşmesinin Firestore uyarlaması |
| `exportTables.ts` | Soğuk dışa aktarımın tablo kaydı ve saf yardımcıları |
| `lib/periods.ts` | Periyot başlangıç anları ve kanıt penceresi kuralı (saf) |
| `index.ts` | Modülün tek public API'si |

Dışarıdan **yalnızca** `services/recovery` (yani `index.ts`) üzerinden import edilir.

## Üç değişmez kural

1. **Varsayılan kuru çalışmadır.** Her yeniden hesaplama `dryRun: true` ile başlar;
   yazmak açık bir niyet ve `confirm` sayısı ister.
2. **Mutlak değer yazılır, delta değil.** Aynı çağrı iki kez çalışsa da sonuç aynıdır
   (idempotent). Yarım kalmış bir onarım sayacı şişirmez.
3. **Kanıtı olmayan periyoda dokunulmaz.** `audit_logs` 90 günde bir arşivlenir.
   Kanıt ufkundan eski periyotlar `untouched` olarak raporlanır — yeniden hesaplama
   bir imha aracına dönüşemez.

## Kimin kaynağı ne?

| Türetilmiş | Kaynak | Kesinlik |
|---|---|---|
| `user_period_scores.all_time` | `played_levels` | Birebir |
| `user_period_scores` (daily/weekly/monthly) | `audit_logs` (`level.complete`) | Kanıt ufkuyla sınırlı |
| `creator_scores` | `played_levels` + bölüm sahipliği | "Farklı oyuncu" semantiği (bkz. dosya doc-comment'i) |
| `badges` | Dönemsel skorlar | Yalnızca EKLER, hiçbir rozeti silmez |

## Bağımlılık yönü

`recomputeCreatorScores` Firestore'u bilmez; `LevelCreatorLookup` arayüzünü bilir.
Firestore uyarlaması route katmanında (kompozisyon kökü) enjekte edilir. Testler
arayüze düz bir nesne verir.
