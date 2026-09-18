# features/daily

Oyuncu tarafı **Günlük Bulmaca**: hub (`/daily`), oyun (`/daily/play?date=`), sonuç,
paylaşım, günlük liderlik ve arşiv. Kurallar ve admin kullanımı: `docs/daily-puzzle.md`.

Tüm skor/seri/sıra kararları **worker'dadır** (`syncron-worker/src/services/daily`);
bu modül yalnızca gösterir ve hamleleri gönderir.

## Yapı

```
features/daily/
├── components/
│   ├── DailyHubPage.tsx         # /daily: bugünün kartı, seri, Sıralama/Arşiv sekmeleri (erişilemezse / 'e döner)
│   ├── TodayCard.tsx            # bugünün bulmacası + resmî sonucum
│   ├── DailyLeaderboardList.tsx # günlük liderlik (ipuçlu satırlar işaretli)
│   ├── ArchiveList.tsx          # geçmiş bulmacalar (seri/liderlik etkilemez notu)
│   ├── DailyPlayContent.tsx     # /daily/play görünümü (PlayScreen + ipucu + sonuç kartı)
│   ├── DailyResultOverlay.tsx   # hamle/par, yıldız, seri, sıra, Paylaş
│   └── StarRow.tsx
├── hooks/
│   ├── useDailyHub.ts           # today + streak + archive yükleme
│   ├── useDailyLeaderboard.ts
│   ├── useDailyPuzzleLoader.ts  # anonim giriş → GET /daily/:date → oyun durumu
│   ├── useDailyPlayPage.ts      # oyun oturumu, ipucu (`daily:<id>`), reklam, çıkış
│   ├── useDailyCompletion.ts    # POST /daily/complete (idle|pending|done|failed, yeniden dene)
│   └── useDailyShare.ts         # metin + (externalLinks ise) link → services/share
├── lib/
│   ├── dailyConfig.ts           # paylaşım URL'si, limitler, isDailyAvailable(capabilities)
│   └── shareText.ts (+test)     # "Syncron #142 ⭐⭐⭐ 14 hamle 🔥5"
└── index.ts                     # DailyHubPage, DailyPlayContent, isDailyAvailable
```

## Bağımlılıklar

- `@/features/play` (yalnızca `index.ts`): PlayScreen oturumu, ipucu, reklam hook'ları.
- `@/services/api/dailyClient`, `@/services/share`, `useCapabilities()`.
- Giriş noktası: `features/home` ana sayfa kartı `isDailyAvailable(capabilities)` ile gösterilir
  (`capabilities.dailyPuzzle` && worker URL tanımlı).

## Notlar

- Level atlama bu ekranda yoktur (kural).
- Telemetri gönderilmez (günlük bulmaca kampanya level analitiğine karışmasın).
- Tamamlama gönderilemezse sonuç kartı "kaydedilmedi" gösterir ve yeniden denemeye izin verir;
  sunucu tarafı idempotenttir.
