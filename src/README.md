# Next.js Kaynak Kökü (`src/`)

Bu dizin, Next.js uygulamasının tüm kaynak kodunu barındırır: rotalar (`app/`), oyun motoru, servisler (API/Firebase/DB/sync), durum yönetimi, dil desteği ve ortak bileşenler.

## Klasör Yapısı ve Dosyaların Mantığı

```
src/
├── app/                 # Next.js route'ları (page.tsx/layout.tsx dosyaları, sadece kompozisyon).
│   └── _portal/         #   Portal build'lerinin (CrazyGames/GameDistribution) tek kompozisyon kökü — PortalShell + portalRoutes (bkz. src/lib/navigation).
├── components/
│   ├── ui/              # Tasarım sistemi primitifleri (Button, Modal, Card, ...).
│   └── common/          # Uygulama genelinde kullanılan ortak bileşenler ve korumalar (AuthModal, AdminGuard, BackButtonManager, ...).
├── contexts/            # React Context API ile yönetilen global durumlar (Oturum, Dil).
├── hooks/               # API, gamepad, arkadaşlık vb. işlevleri sarmalayan React kancaları.
├── features/            # Sayfa bazlı özellik modülleri (admin/*, editor, friends, leaderboard, profile, levels, play, home, support, donate, great-supporter, controls, rewarded-actions, daily, settings).
│   └── <isim>/          #   components/ (sunum), hooks/ (state+efekt), lib/ (saf yardımcılar), index.ts (public API).
├── game-engine/         # Oyun motoru (eski app/src/game2) + level-format/ (persisted veri tipleri, CellType/EdgeBehavior string literalleri sabit) + solver/ (çözücü, prosedürel üretici, par.ts — günlük bulmaca par'ı) + components/LevelMiniPreview (küçük level önizlemesi) + hint/ (sunucudan gelen ipucunun gösterimi; hesaplama worker'da).
├── services/            # api/ (worker istemcileri), firebase/, db/ (Dexie), sync/, monetization/ (reklam adaptör katmanı), levels/ (kampanya bölüm listesi önbelleği), share/ (yerel paylaşım → navigator.share → pano), settings/ (tercih ve ayarlar kalıcılık motoru) — eski app/src/lib/{api,firebase,db,sync}.
├── lib/                 # i18n/, userStorage.ts, navigation/ (next/navigation adaptörü — portal'da bellek içi router), assetUrl.ts, dailyDraftHandoff.ts (takvim → editör aktarımı), saf yardımcı fonksiyonlar.
└── store/               # Redux durum yönetimi (User state, Store yapılandırması).
```

## Temel Modüller ve Mimari Açıklaması

### 1. Durum Yönetimi (Redux & Context)
* **AuthContext / useAuth:** Kullanıcının Firebase kimlik doğrulama durumunu (anonim veya kayıtlı oyuncu) dinler, JWT (ID Token) yenileme süreçlerini ve Google entegrasyonunu yönetir.
* **Redux Store (`store/`):** Kullanıcı rolü, toplam puan, tamamlanan bölüm sayısı gibi profil verilerini tüm React ağacında performansı yüksek şekilde paylaşır.
* **LanguageContext:** Kullanıcının tercih ettiği dili tarayıcı hafızasında saklar ve dil paketlerini dinamik olarak yükler.
* **SettingsContext / useSettings (`features/settings` & `services/settings`):** Kullanıcının dil, tema, ses açma/kapama ve ses seviyesi tercihlerini birleşik `syncron_settings_v1` altında saklar. Her sayfadan tek satırda erişilir, global `SettingsModal` ile yönetilir ve eski anahtarlara geriye dönük migration/dual-write desteği sunar.

### 2. Yerel Veritabanı ve Senkronizasyon (`services/db` & `services/sync`)
* **Dexie.js Yerel Veritabanı (`schema.ts`):** Kullanıcının tasarladığı bölümleri, hazır kampanya bölümlerini ve tamamladığı bölümlerin skorlarını tarayıcıda IndexedDB kullanarak saklar. Çevrimdışı çalışmayı destekler.
* **Hafif Senkronizasyon (`services/firebase/sync.ts`):** Hazır bölümlerin güncel listesini ve harita konumlarını Firestore'dan çekip Dexie'ye işler (taslak/placeholder olarak). Bölüm açıldığında tüm veriler tembel yüklenir (lazy load).
* **D1 Senkronizasyonu (`services/sync/playedLevels.ts`):** Oynanan bölümlerin kayıtlarını Cloudflare D1 veritabanı ile Dexie veritabanı arasında delta (yalnızca değişenler) yöntemiyle eşitler.

### 3. API İstemcileri (`services/api`)
* **workerClient:** Cloudflare Worker üzerinde koşan Hono API uç noktalarına, Firebase ID Token'ı otomatik ekleyerek yetkilendirilmiş (Authenticated) istekler gönderir.
* **friendsClient / leaderboardClient / badgesClient:** Arkadaşlık istekleri, liderlik sıralamaları ve kazanılan rozetlerin sergilenmesi işlemlerini yöneten servis uç noktalarıdır.
* **adminClient:** Yalnızca yönetici ve moderatör yetkisine sahip kullanıcıların erişebileceği yasaklama (ban) yönetimi API isteklerini gerçekleştirir.

### 4. Reklam Adaptör Katmanı (`services/monetization`)
* Reklam ve platform olaylarının (bölüm arası/ödüllü/banner reklam, oynanış başladı/durdu, mutlu an) tek bir arayüzden geçtiği modül. Platform build-time `NEXT_PUBLIC_PLATFORM` env değeriyle seçilir; kodun geri kalanı platform adını değil `getCapabilities()` yeteneklerini sorgular. `src/contexts/MonetizationContext.tsx` (`useAds`/`useCapabilities`) React erişimini sağlar. Android build'i AdMob kullanır (`providers/admob/`, UMP rıza akışı dâhil — bkz. `docs/platforms.md`). Detaylar `src/services/monetization/README.md`'de.

### 4a. Ödüllü Aksiyonlar ve İpucu — bkz. `.plans/monetization/04-odullu-ipucu.md`
* **`/play` ipucu şu an KAPALI**: `rewardedActionsConfig.ts`'te `hint` her durumda `disabled` → buton, H kısayolu ve kart çizilmez; worker da aksiyonu reddeder. Kod açılabilmek için yerinde duruyor. Editör test modundaki "Adım İleri" etkilenmez.
* **İpucu istemcide hesaplanmaz.** Worker hamle geçmişini oynatıp çözer; içerik yalnızca sunucu erişim hakkını doğruladıktan sonra gelir (`syncron-worker/src/services/hint`, `.../services/rewards`).
* **`services/monetization/rewarded/`**: aksiyondan bağımsız akış — sunucu hazırlar → (gerekiyorsa) ödüllü reklam → sunucu teslim eder; yapılandırma `rewardedActionsConfig.ts`'te. `services/api/rewardsClient.ts`: `/rewards/prepare|claim|cancel`.
* **`features/rewarded-actions/`**: `useRewardedAction` hook'u + `RewardedActionDialog` — 05 (level atlama) aynı parçaları kullanır.
* **Ödüllü level atlama (05, AÇIK — Android/portallar; web/Electron'da kapalı):** `features/play/hooks/usePlaySkip.ts` (eşikler `features/play/lib/skipLevelConfig.ts`) + `SkipLevelButton`/`SkipLevelDialog`; kilit kuralı `features/levels/lib/progression.ts` (çözüldü **veya** atlandı → sonraki açılır); yerel kayıt Dexie `skippedLevels` (v11), sync `services/sync/applySkippedLevels.ts`. Skor/yıldız vermez — sunucu kuralı `syncron-worker/src/services/skipLevel`. Rapor: `.plans/monetization/raporlar/05-rapor.md`.
* **`game-engine/hint/`**: yalnızca gösterim — `ServerHint` ("çözüme N adım" + sıradaki 5 adım), oyuncu takip ettikçe ilerletme.
* **`features/play/hooks/usePlayHint.ts`**: `/play` ipucu akışı. Skor kuralı: `syncron-worker/src/services/hintScoring.ts`.

### 4a-2. Günlük Bulmaca (06) — bkz. `docs/daily-puzzle.md`
* **`features/daily/`**: `/daily` hub (bugünün bulmacası, seri, günlük liderlik, arşiv) ve `/daily/play?date=`; sonuç kartı + Wordle tarzı paylaşım. Giriş noktası ana sayfa kartı, `capabilities.dailyPuzzle` && worker URL ile gösterilir.
* **`features/admin/daily-calendar/`**: `/admin/daily-calendar` — takvim (boşluk uyarısı, boş gün politikası), kütüphane, aday üretici. Editör tarafı: `features/editor/hooks/useDailyPuzzleEditor.ts` + `DailyPuzzleDialog` (admin'e "Günlük Bulmaca" butonu; çözücü ya da test modu çözümü).
* İstemciler: `services/api/dailyClient.ts`, `services/api/adminDailyClient.ts`; paylaşım `services/share/`.
* Skor/seri/sıra/XP kuralı worker'da: `syncron-worker/src/services/daily`. Rapor: `.plans/monetization/raporlar/06-rapor.md`.

### 4b. Portal Build'leri (`app/_portal`, `lib/navigation`, `services/levels`) — bkz. `.plans/monetization/02-portal-buildleri.md`
* CrazyGames/GameDistribution build'leri tek bir statik `index.html` üretir (`next.config.ts` `assetPrefix: './'`, yalnızca bu iki platformda). `app/_portal/PortalShell.tsx`, `capabilities.inMemoryRouting` true olduğunda `app/page.tsx`'ten render edilir ve `lib/navigation`'ın bellek içi router'ına göre `app/_portal/portalRoutes.tsx` tablosundaki ekranı seçer — URL hiç değişmez.
* `lib/navigation`: `useAppRouter`/`useAppSearchParams`/`useAppPathname`/`AppLink` — `next/navigation`/`next/link` yerine bunlardan import edilir (portal-reachable ekranlarda). `inMemoryRouting` yeteneğine göre gerçek Next router'ına ya da bellek içi router'a delege eder.
* `services/levels/campaignParts.ts`: kampanya bölüm listesini Firestore'dan getirir, localStorage'a yedekler; Firestore'a ulaşılamazsa son bilinen listeyi döner (leveller gömülmez — bkz. plan).

### 5. Altyapı Bileşenleri (`components/common`)
* **AdminGuard:** `/admin/*` yollarını koruyarak yalnızca yönetici veya moderatörlerin sayfaya erişebilmesini sağlar.
* **BackButtonManager:** Web tarayıcısı ve Capacitor mobil platformlar için cihazın fiziksel geri tuşuna basıldığında tutarlı bir geri gitme hiyerarşisi (örn: oyundan çıkıp bölümlere dönme) sunar.
