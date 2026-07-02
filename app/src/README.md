# Next.js Frontend Altyapısı (`app/src`)

Bu dizin, Next.js istemci uygulamasının oyun dışındaki temel altyapısını barındırır. Durum yönetimi, yerel veritabanı (IndexedDB), Firebase entegrasyonu, dil desteği, yönlendirmeler ve ortak bileşenler bu klasör altındadır.

## Klasör Yapısı ve Dosyaların Mantığı

```
app/src/
├── components/          # Uygulama genelinde kullanılan ortak bileşenler ve korumalar.
├── contexts/            # React Context API ile yönetilen global durumlar (Oturum, Dil).
├── hooks/               # API, gamepad, arkadaşlık vb. işlevleri sarmalayan React kancaları.
├── lib/                 # Temel kütüphaneler, API istemcileri ve veritabanı işlemleri.
│   ├── api/             # Cloudflare Worker API'larına erişen istemci fonksiyonları.
│   ├── db/              # Dexie.js (IndexedDB) tarayıcı içi veritabanı şeması ve yerel işlemler.
│   ├── firebase/        # Firebase Client SDK başlatımı, Firestore ve senkronizasyon mantığı.
│   ├── i18n/            # Dil paketleri (TR/EN) ve çeviri yardımcısı.
│   ├── sync/            # Yerel veritabanı ile Cloudflare D1 arasındaki veri senkronizasyonu.
│   ├── analytics.ts     # Google Analytics GA4 olay izleme sarmalayıcısı.
│   └── userStorage.ts   # Kullanıcı bazlı localStorage yönetimi.
└── store/               # Redux durum yönetimi (User state, Store yapılandırması).
```

## Temel Modüller ve Mimari Açıklaması

### 1. Durum Yönetimi (Redux & Context)
* **AuthContext / useAuth:** Kullanıcının Firebase kimlik doğrulama durumunu (anonim veya kayıtlı oyuncu) dinler, JWT (ID Token) yenileme süreçlerini ve Google entegrasyonunu yönetir.
* **Redux Store (`store/`):** Kullanıcı rolü, toplam puan, tamamlanan bölüm sayısı gibi profil verilerini tüm React ağacında performansı yüksek şekilde paylaşır.
* **LanguageContext:** Kullanıcının tercih ettiği dili tarayıcı hafızasında saklar ve dil paketlerini dinamik olarak yükler.

### 2. Yerel Veritabanı ve Senkronizasyon (`lib/db` & `lib/sync`)
* **Dexie.js Yerel Veritabanı (`schema.ts`):** Kullanıcının tasarladığı bölümleri, hazır kampanya bölümlerini ve tamamladığı bölümlerin skorlarını tarayıcıda IndexedDB kullanarak saklar. Çevrimdışı çalışmayı destekler.
* **Hafif Senkronizasyon (`lib/firebase/sync.ts`):** Hazır bölümlerin güncel listesini ve harita konumlarını Firestore'dan çekip Dexie'ye işler (taslak/placeholder olarak). Bölüm açıldığında tüm veriler tembel yüklenir (lazy load).
* **D1 Senkronizasyonu (`lib/sync/playedLevels.ts`):** Oynanan bölümlerin kayıtlarını Cloudflare D1 veritabanı ile Dexie veritabanı arasında delta (yalnızca değişenler) yöntemiyle eşitler.

### 3. API İstemcileri (`lib/api`)
* **workerClient:** Cloudflare Worker üzerinde koşan Hono API uç noktalarına, Firebase ID Token'ı otomatik ekleyerek yetkilendirilmiş (Authenticated) istekler gönderir.
* **friendsClient / leaderboardClient / badgesClient:** Arkadaşlık istekleri, liderlik sıralamaları ve kazanılan rozetlerin sergilenmesi işlemlerini yöneten servis uç noktalarıdır.
* **adminClient:** Yalnızca yönetici ve moderatör yetkisine sahip kullanıcıların erişebileceği yasaklama (ban) yönetimi API isteklerini gerçekleştirir.

### 4. Altyapı Bileşenleri (`components/`)
* **AdminGuard:** `/admin/*` yollarını koruyarak yalnızca yönetici veya moderatörlerin sayfaya erişebilmesini sağlar.
* **BackButtonManager:** Web tarayıcısı ve Capacitor mobil platformlar için cihazın fiziksel geri tuşuna basıldığında tutarlı bir geri gitme hiyerarşisi (örn: oyundan çıkıp bölümlere dönme) sunar.
* **LanguageSwitcher:** Ekranın sağ alt köşesinde sabitlenmiş dil değiştirme arayüzüdür.
