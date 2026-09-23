# 14 — Kod Temizliği (sürüm otomasyonu, ses dosyası, efekt kuralı, friends refactor)

Dört faz sırayla yürütüldü. Hiçbir şey commit edilmedi. Üretime dokunan komut
çalıştırılmadı (`wrangler --remote`, deploy, migration apply yok). `.env.local` ve
`android/local.properties` açılmadı.

---

## FAZ 1 — `versionCode` / `versionName` otomatikleştirildi

### Ne yapıldı

`android/app/build.gradle` (tek dosya): literal `versionCode 1` / `versionName "1.0"`
kaldırıldı; ikisi de repo kökündeki **`package.json` → `version`** alanından türetiliyor.

```
versionName = package.json sürümü, olduğu gibi     ("0.3.0")
versionCode = major * 1000000 + minor * 1000 + patch   (0.3.0 -> 3000)
```

**Neden bu formül (monotonluk kanıtı):** minor ve patch build sırasında `> 999`
ise build **hata verir**. Bu sınır altında bileşenler çakışamaz: bir üst bileşenin
+1 artması, alt bileşenlerin alabileceği en büyük toplamdan (999*1000 + 999) daha
büyük bir sıçrama üretir. Dolayısıyla semver artışı ⇒ versionCode artışı, istisnasız.
Üst sınır `major = 2099` ile kapatıldı (Play'in 2.100.000.000 sınırı).
Ön-sürüm eki (`1.2.0-rc.1`) versionName'e yansır, versionCode'u **etkilemez**.

**Sessiz düşüş yok:** `package.json` okunamaz, `version` alanı semver değilse ya da
0 üretiyorsa `GradleException` atılır. Yanlış versionCode ile imzalı AAB üretmek
geri alınamaz bir hata olduğu için burada "varsayılana dön" davranışı bilinçli olarak
yoktur.

### Doğrulama (gerçek çıktı)

```
$ npm run release:android
... verify-release-config (android) geçti ... Sync finished in 0.719s

$ cd android && gradlew bundleRelease
[version] package.json -> versionName=0.3.0, versionCode=3000
BUILD SUCCESSFUL in 17s
-> android/app/build/outputs/bundle/release/app-release.aab (15,9 MB, imzalı)
```

AAB'nin içindeki `base/manifest/AndroidManifest.xml` (protobuf) doğrudan okundu:

```
versionCode  b'\x1a\x043000"\x02\x08\x02(...2\x05:\x030\xb8\x17'   # ham "3000", derlenmiş int varint 0xb8 0x17 = 3000
versionName  b'\x1a\x050.3.0(...'                                    # "0.3.0"
```

### Proje sahibinin yeni sürüm çıkarma yordamı (TEK YER)

1. `package.json` içindeki `"version"` alanını artır (ör. `0.3.0` → `0.3.1`).
2. `npm run release:android` → `cd android && gradlew bundleRelease`.
3. Gradle çıktısındaki `[version] package.json -> versionName=..., versionCode=...`
   satırını gözle doğrula. Play'e yüklenen her AAB'nin versionCode'u bir öncekinden
   büyük olmalı — sürümü artırmayı unutursan Play yüklemeyi reddeder ve bu, tek
   uyarı noktandır.
4. Başka hiçbir dosya elle değiştirilmez.

Bugünkü değer: `0.3.0 → 3000`. Sonraki örnekler: `0.3.1 → 3001`, `0.4.0 → 4000`,
`1.0.0 → 1000000`.

---

## FAZ 2 — `box_push.mp3` (yapılacak iş kalmamış)

`.plans/.../09-yayin-hazirlik-denetimi.md` §D'deki tespit **artık geçerli değil**;
proje sahibi bunu kendisi kapatmış:

```
$ git log --oneline -1 -- public/sounds/box_push.mp3
ad2ae0a son durum
$ git cat-file -s HEAD:public/sounds/box_push.mp3
6720          # çalışma ağacındaki dosyayla aynı boyut, git status temiz
$ git log --oneline --diff-filter=D -- "public/sounds/*.flac"
ad2ae0a son durum          # .flac silinmesi de aynı commit'te
```

Dolayısıyla `git add` gerekmedi. **Takipsiz başka medya dosyası yok:**
`git status --porcelain -uall` çıktısındaki tek takipsiz öğeler `.ts`/`.md`
dosyaları (Google Auth işi + bu iz). `public/sounds/` altındaki 14 dosyanın
tamamı (`_backup_original/` dâhil) takipte. Kodda `.flac` referansı kalmadı
(tek eşleşme `scripts/portal/serve-portal.mjs` MIME tablosu — zararsız).

---

## FAZ 3 — `react-hooks/set-state-in-effect`: 22 → 2

Hiçbir yerde kural kapatılmadı, `eslint-disable` yazılmadı, bağımlılık dizisi
kırpılmadı. Kullanılan üç meşru desen:

1. **Türev değer** — state hiç tutulmaz, mevcut değerlerden hesaplanır.
2. **Render sırasında state ayarlama** — React'in "prop değişince state'i ayarla"
   örüntüsü (koşul kendi kendini kapatır, döngü olmaz).
3. **`useSyncExternalStore`** — dış kaynak (hidrasyon durumu, Capacitor, localStorage)
   okuması. Projede zaten kullanılan desen (`features/settings/hooks/useTouchCapable.ts`).

### Düzeltilen 20 örnek

| Dosya | Ne yapıldı |
|---|---|
| `components/common/AdminGuard.tsx` | `isValidated` state değil türev (`!loading && user && rol yeterli`). Yönlendirme efektte kaldı. |
| `components/common/BadgePicker.tsx` | Açılışta seçimi tazeleme → render-içi ayarlama (efekt deps'i birebir taklit edildi). |
| `components/ui/Modal.tsx` (2) | `mounted` → yeni `useHydrated()`; `isClosing` sıfırlaması → `open` değişimini fark eden render-içi ayarlama. |
| `features/admin/support/hooks/useSupportListPage.ts` | `dataLoading` türev: "hangi abonelik anahtarı için veri geldi". |
| `features/support/components/MyTicketsPage.tsx` | Aynı desen, uid anahtarıyla. |
| `features/admin/users/hooks/useSecurityEvents.ts` | Üç state → tek `loaded {key, events}`; `loading`/`forbidden`/`events` türev. |
| `features/donate/hooks/useDonatePage.ts` (3) | `isCapacitor` → yeni `useNativePlatform()`; bağışçı adı varsayılanı → render-içi ayarlama; iki `useCallback` fetch'i efektin içine alındı (state artık yalnızca `await` sonrası yazılıyor, `active` bayrağı eklendi). |
| `features/great-supporter/hooks/useGreatSupporterPage.ts` (1/2) | `isCapacitor` → `useNativePlatform()`. |
| `features/home/components/HeroPlayCell.tsx` | `animMode` geçişi render-içi; efektte yalnızca `exiting → idle` zamanlayıcısı. |
| `features/leaderboard/hooks/useLeaderboardPage.ts` | Periyot indeksi taşması render sırasında düzeltiliyor (0'a sıfırlama davranışı korundu; `Math.min` ile **değiştirilmedi** — o farklı bir sonuç verirdi). |
| `features/play/hooks/useWinAuthPrompt.ts` | `loginFailed` türev; efekt tamamen kalktı. |
| `features/play/hooks/useWinFeedback.ts` (2) | localStorage okuması `useSyncExternalStore`; gönderim efektten çıkıp seçimi tamamlayan tıklamaya taşındı (çift gönderim yarışı da kapandı). Dışa verilen API adları aynı. |
| `game-engine/components/cells/{conveyor,teleport,trampoline}CellRenderer.tsx` | Parıltı artık "mandal": tetikleyici prop değişimi render'da yakalanıyor, efektte yalnızca söndürme zamanlayıcısı. Yeni tetikleme zamanlayıcıyı baştan kuruyor (eski `timerRef` davranışıyla aynı), ayrı unmount temizleme efekti gereksizleşti. |
| `game-engine/components/physicsWrapper.tsx` | İniş ezilmesi (`isLanded`) aynı mandal desenine geçti; `prevZRef` kalktı. |

Yeni dosyalar: `src/hooks/useHydrated.ts`, `src/hooks/useNativePlatform.ts`
(ikisi de `useSyncExternalStore` tabanlı, SSR'da `false`).

### DOKUNULMAYAN 2 örnek (gerekçeli)

* **`src/app/403/page.tsx:48`** — 15 parçacık `window.innerWidth/Height` + `Math.random()`
  ile mount sonrası üretiliyor. Denendi: `useHydrated()` + `useMemo`. Sonuç
  **1 hata yerine 7 hata**: `react-hooks/purity` (render sırasında `window` ve
  `Math.random`). Hidrasyon uyuşmazlığı riski olmadan render'a taşınamıyor,
  bu yüzden **geri alındı**; dosya HEAD'deki hâlinde. Dekoratif arka plan,
  oyuncu davranışını etkilemiyor.
* **`src/features/great-supporter/hooks/useGreatSupporterPage.ts:70`** — polling
  efektinin "uid yok → `setState('timeout')`" senkron dalı. Uid `sessionStorage`'dan
  okunuyor; bu okuma render'a taşınamaz (SSR + saflık). Mikrotask'a ertelemek
  kuralı dolaylı yoldan susturmak olurdu. Bu uç noktanın doğru çözümü polling
  durum makinesinin yeniden tasarlanmasıdır; bu bir refactor'dür, kapsam dışı
  bırakıldı.

### Lint tablosu (tam repo, `npx eslint`)

| | Önce | Sonra |
|---|---|---|
| Toplam **hata** | 273 | **242** |
| `react-hooks/set-state-in-effect` | 22 | **2** |
| `@typescript-eslint/no-explicit-any` | 193 | 182 (Faz 3+4'te kaldırılanlar) |
| Diğer kurallar | değişmedi | değişmedi |

Yeni hiçbir kural ihlali eklenmedi. Her düzeltme kümesinden sonra `npm test`
çalıştırıldı, 517/517 korundu.

---

## FAZ 4 — `syncron-worker/src/routes/friends.ts` refactor (895 → 178 satır)

Davranış **birebir korundu**: uç nokta yolları, istek/yanıt şekilleri, hata
metinleri, HTTP durum kodları, `rateLimit('friends-request')` bağlantısı,
`checkActiveBan` + `trackSecurityEvent('ban.blocked')` ve tüm `console.error`
log metinleri aynı.

### Yeni yapı — `syncron-worker/src/services/friends/`

| Dosya | Satır | Ne |
|---|---|---|
| `lib/canonicalPair.ts` | 21 | SAF: `user_a < user_b` anahtarı, uid parametresi kabulü |
| `lib/friendPolicy.ts` | 105 | SAF KARAR: 100 arkadaş / 20 bekleyen istek eşikleri, red gerekçeleri (mesaj + durum) |
| `lib/friendRows.ts` | 111 | SAF DÖNÜŞÜM: satır → API nesnesi, rozet JSON'u, sıralama ölçütleri |
| `friendshipStore.ts` | 238 | IO: tek D1 erişim katmanı, tüm sorgular `.bind()` ile |
| `profileCacheSync.ts` | 101 | IO: `user_profiles` ↔ Firestore köprüsü (hata yutmaz, fırlatır) |
| `friendRequestActions.ts` | 209 | İstek gönder/kabul/ret + arkadaşlığı bitir |
| `friendBlockActions.ts` | 87 | Engelle / kaldır / listele |
| `friendQueries.ts` | 108 | Arkadaş ve istek listeleri + eksik profil tamamlama (10 sınırı) |
| `userSearch.ts` | 72 | Tag ile arama (D1 → Firestore yedeği) |
| `types.ts` | 28 | `ActionOutcome` / `QueryOutcome` |
| `index.ts` | 25 | Tek public API |
| `README.md` | — | Modül haritası ve kararlar |

`routes/friends.ts` artık yalnızca: middleware → gövde/parametre doğrulama →
servis çağrısı → `c.json`. Hiçbir dosya ~250 satır sınırını aşmıyor.
`syncron-worker/README.md` klasör haritasına iki satır eklendi.

**Bilinçli olarak korunan tuhaflık:** `showcaseBadges` alanı JSON metni dizi
değilse (ör. `"null"`) çözülen değer olduğu gibi geçiyordu; bu davranış
`parseShowcaseBadges` içinde yorumla birlikte aynen bırakıldı (değiştirmek
istemci sözleşmesini değiştirirdi).

### Testler

Yeni: `syncron-worker/test/friendsPolicy.spec.ts` — 24 test (kanonik anahtar, uid
sınırı, mevcut ilişkiye karşı istek kararları, üç sınır kuralı, kabul/ret kararı,
rozet çözme, satır dönüşümleri, iki sıralama ölçütü).
Mevcut `test/friendsApi.spec.ts` (29 entegrasyon testi) **değiştirilmedi** ve geçiyor.

Worker testleri: **263 → 287** (24 yeni), hiçbiri kırılmadı.

---

## Bitiş doğrulaması — `00-ilkeler.md` §2.1'in yedi komutu (gerçek çıktılar)

| # | Komut | Sonuç |
|---|---|---|
| 1 | `npx tsc --noEmit` | çıktı yok — **hatasız** |
| 2 | `npm test` | **517 passed (517)**, 51 dosya |
| 3 | `cd syncron-worker && npx tsc --noEmit` | çıktı yok — **hatasız** |
| 4 | `cd syncron-worker && npx vitest run` | **287 passed (287)**, 20 dosya (taban 263) |
| 5 | `npm run build:crazygames` | `✓ crazygames: 112 dosya, 4.16MB → dist-portals\crazygames.zip` |
| 6 | `npm run build:gd` | `✓ gamedistribution: 112 dosya, 4.16MB → dist-portals\gamedistribution.zip` |
| 7 | `npm run build:mobile` | `Sync finished in 0.857s` |
| + | `cd android && gradlew bundleRelease` | `BUILD SUCCESSFUL`, `app-release.aab`, versionCode **3000** (AAB manifestinden okundu) |

Taban çizgisi korundu: app 517/517 (azalmadı), worker 263 → 287 (arttı),
lint hataları 273 → 242 (azaldı).

`git status`: yalnızca bu görevin dosyaları + proje sahibinin önceden var olan
değişiklikleri. Hiçbir commit edilmemiş iş geri alınmadı, stash'lenmedi,
üzerine yazılmadı.

---

## Proje sahibinin bilmesi gerekenler

1. **Sürüm çıkarma artık tek yerden:** `package.json` → `"version"`. Android
   build'i başka hiçbir dosyada sürüm numarası aramıyor. Gradle her çalıştığında
   `[version] package.json -> versionName=..., versionCode=...` satırını basar.
2. **Bugünkü versionCode 3000.** Play Console'a daha önce yüklenmiş en yüksek
   versionCode bundan küçük olmalı (bilinen tek değer 1'di). Aşağıdaki soruya bak.
3. **Oyuncunun gördüğü davranış değişmedi.** Faz 3'teki düzeltmeler görsel
   zamanlamayı korur; birkaçında (arkadaş listesi yükleniyor göstergesi, rozet
   seçici, kazanma ekranı "giriş başarısız" uyarısı) eski kodun bir kare geç
   güncellenen hâli artık **anında** doğru değeri gösteriyor — yani yanıp sönme
   azaldı, yeni bir durum eklenmedi.
4. **Arkadaşlık uçları refactor edildi** ama sözleşme aynı; istemci tarafında
   hiçbir değişiklik gerekmiyor.

## LİDERE SORU

1. **versionCode başlangıç değeri:** Play Console'a bugüne kadar `versionCode 1`
   dışında bir değerle AAB yüklendi mi? Yüklendiyse ve o değer ≥ 3000 ise
   `package.json` sürümünün ona göre yükseltilmesi gerekir (formül değil, sürüm
   numarası değişir). Panelden kontrol gerektiği için ajan doğrulayamadı.
2. **Faz 2 kapsam dışı kaldı** (iş zaten commit'li). Denetim raporu 09'daki
   ilgili madde "kapandı" olarak işaretlensin mi?
3. **Kalan 2 `set-state-in-effect` hatası** (403 sayfası, great-supporter polling)
   ayrı bir görev olarak açılsın mı, yoksa kabul edilen borç mu?
