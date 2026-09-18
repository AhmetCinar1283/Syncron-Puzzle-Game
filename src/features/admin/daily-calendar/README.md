# features/admin/daily-calendar

`/admin/daily-calendar` — **Günlük Bulmaca Takvimi**. Kullanım kılavuzu: `docs/daily-puzzle.md` → Admin kullanımı.

`AdminGuard` ile korunur. Moderatör takvimi ve kütüphane listesini salt okunur görür;
yazma butonları yalnızca `role === 'admin'` için çizilir. Worker aynı kuralı ayrıca uygular
(yazma ve bulmaca içeriği yalnızca admin).

## Yapı

```
features/admin/daily-calendar/
├── components/
│   ├── DailyCalendarPage.tsx  # sayfa kompozisyonu (AdminGuard)
│   ├── CalendarPanel.tsx      # boşluk uyarısı, boş gün politikası, gün gün atama (kilitli günler salt okunur)
│   ├── PuzzleLibrary.tsx      # onay / havuz / sil / editörde aç
│   └── CandidateGenerator.tsx # aday üret → önizle → onayla-kaydet ya da editörde düzenle
├── hooks/
│   ├── useDailyCalendar.ts    # GET calendar, atama, politika, kaydırma
│   ├── usePuzzleLibrary.ts    # liste + flags + silme
│   └── useCandidateGenerator.ts # generateProceduralLevel (tarayıcıda) → savePuzzle
├── lib/candidateFilters.ts (+test) # form → üretici filtreleri, tarih kaydırma, sunucu hata kodu → i18n anahtarı
└── index.ts
```

## Sözleşmeler

- Worker istemcisi: `services/api/adminDailyClient.ts`.
- Editöre aktarım: `lib/dailyDraftHandoff.ts` (sessionStorage + URL). Editör tarafı
  `features/editor/hooks/useDailyPuzzleEditor.ts` + `components/dialogs/DailyPuzzleDialog.tsx`.
  İki feature birbirinin iç dosyasını import etmez.
- Önizleme: `game-engine/components/LevelMiniPreview.tsx`; par: `game-engine/solver/par.ts`.
