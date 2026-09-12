# services/levels

Kampanya bölüm **listesi** (levelParts) için ince bir önbellek katmanı.

- `campaignParts.ts` — `getCampaignParts()`: `services/firebase/adminParts.getAllParts()`'ı
  sarar. Başarılı sonucu localStorage'a yazar; Firestore'a ulaşılamazsa (çevrimdışı)
  en son bilinen listeyi döner. Böylece kampanya haritası tamamen boş kalmaz.

Leveller (grid verisi) bu klasörün kapsamında **değildir** — onlar Dexie
`presetLevels` tablosunda önbelleklenir (bkz. `services/firebase/sync.ts`,
`services/db/presetLevelsOps.ts`). Leveller build'e gömülmez; bir kez online
açılan bir level Dexie'de kalır ve sonra çevrimdışı da oynanabilir (bkz.
`.plans/monetization/02-portal-buildleri.md`).
