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
├── features/            # Sayfa bazlı özellik modülleri (admin/*, editor, friends, leaderboard, profile, levels, play, home, support, donate, great-supporter, controls).
│   └── <isim>/          #   components/ (sunum), hooks/ (state+efekt), lib/ (saf yardımcılar), index.ts (public API).
├── game-engine/         # Oyun motoru (eski app/src/game2) + level-format/ (persisted veri tipleri, CellType/EdgeBehavior string literalleri sabit) + solver/ (çözücü ve prosedürel üretici).
├── services/            # api/ (worker istemcileri), firebase/, db/ (Dexie), sync/, monetization/ (reklam adaptör katmanı), levels/ (kampanya bölüm listesi önbelleği) — eski app/src/lib/{api,firebase,db,sync}.
├── lib/                 # i18n/, userStorage.ts, navigation/ (next/navigation adaptörü — portal'da bellek içi router), assetUrl.ts, saf yardımcı fonksiyonlar.
└── store/               # Redux durum yönetimi (User state, Store yapılandırması).
```

## Temel Modüller ve Mimari Açıklaması

### 1. Durum Yönetimi (Redux & Context)
* **AuthContext / useAuth:** Kullanıcının Firebase kimlik doğrulama durumunu (anonim veya kayıtlı oyuncu) dinler, JWT (ID Token) yenileme süreçlerini ve Google entegrasyonunu yönetir.
* **Redux Store (`store/`):** Kullanıcı rolü, toplam puan, tamamlanan bölüm sayısı gibi profil verilerini tüm React ağacında performansı yüksek şekilde paylaşır.
* **LanguageContext:** Kullanıcının tercih ettiği dili tarayıcı hafızasında saklar ve dil paketlerini dinamik olarak yükler.

### 2. Yerel Veritabanı ve Senkronizasyon (`services/db` & `services/sync`)
* **Dexie.js Yerel Veritabanı (`schema.ts`):** Kullanıcının tasarladığı bölümleri, hazır kampanya bölümlerini ve tamamladığı bölümlerin skorlarını tarayıcıda IndexedDB kullanarak saklar. Çevrimdışı çalışmayı destekler.
* **Hafif Senkronizasyon (`services/firebase/sync.ts`):** Hazır bölümlerin güncel listesini ve harita konumlarını Firestore'dan çekip Dexie'ye işler (taslak/placeholder olarak). Bölüm açıldığında tüm veriler tembel yüklenir (lazy load).
* **D1 Senkronizasyonu (`services/sync/playedLevels.ts`):** Oynanan bölümlerin kayıtlarını Cloudflare D1 veritabanı ile Dexie veritabanı arasında delta (yalnızca değişenler) yöntemiyle eşitler.

### 3. API İstemcileri (`services/api`)
* **workerClient:** Cloudflare Worker üzerinde koşan Hono API uç noktalarına, Firebase ID Token'ı otomatik ekleyerek yetkilendirilmiş (Authenticated) istekler gönderir.
* **friendsClient / leaderboardClient / badgesClient:** Arkadaşlık istekleri, liderlik sıralamaları ve kazanılan rozetlerin sergilenmesi işlemlerini yöneten servis uç noktalarıdır.
* **adminClient:** Yalnızca yönetici ve moderatör yetkisine sahip kullanıcıların erişebileceği yasaklama (ban) yönetimi API isteklerini gerçekleştirir.

### 4. Reklam Adaptör Katmanı (`services/monetization`)
* Reklam ve platform olaylarının (bölüm arası/ödüllü reklam, oynanış başladı/durdu, mutlu an) tek bir arayüzden geçtiği modül. Platform build-time `NEXT_PUBLIC_PLATFORM` env değeriyle seçilir; kodun geri kalanı platform adını değil `getCapabilities()` yeteneklerini sorgular. `src/contexts/MonetizationContext.tsx` (`useAds`/`useCapabilities`) React erişimini sağlar. Detaylar `src/services/monetization/README.md`'de.

### 4b. Portal Build'leri (`app/_portal`, `lib/navigation`, `services/levels`) — bkz. `.plans/monetization/02-portal-buildleri.md`
* CrazyGames/GameDistribution build'leri tek bir statik `index.html` üretir (`next.config.ts` `assetPrefix: './'`, yalnızca bu iki platformda). `app/_portal/PortalShell.tsx`, `capabilities.inMemoryRouting` true olduğunda `app/page.tsx`'ten render edilir ve `lib/navigation`'ın bellek içi router'ına göre `app/_portal/portalRoutes.tsx` tablosundaki ekranı seçer — URL hiç değişmez.
* `lib/navigation`: `useAppRouter`/`useAppSearchParams`/`useAppPathname`/`AppLink` — `next/navigation`/`next/link` yerine bunlardan import edilir (portal-reachable ekranlarda). `inMemoryRouting` yeteneğine göre gerçek Next router'ına ya da bellek içi router'a delege eder.
* `services/levels/campaignParts.ts`: kampanya bölüm listesini Firestore'dan getirir, localStorage'a yedekler; Firestore'a ulaşılamazsa son bilinen listeyi döner (leveller gömülmez — bkz. plan).

### 5. Altyapı Bileşenleri (`components/common`)
* **AdminGuard:** `/admin/*` yollarını koruyarak yalnızca yönetici veya moderatörlerin sayfaya erişebilmesini sağlar.
* **BackButtonManager:** Web tarayıcısı ve Capacitor mobil platformlar için cihazın fiziksel geri tuşuna basıldığında tutarlı bir geri gitme hiyerarşisi (örn: oyundan çıkıp bölümlere dönme) sunar.
