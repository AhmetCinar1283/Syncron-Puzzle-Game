# Faz 11 Raporu — Otomatik Geçiş ve Kullanıcı Ayarı

> Plan: `.plans/canvas-render/11-otomatik-gecis.md` · Bağlayıcı: `00-ilkeler.md` · Devir: `raporlar/09-rapor.md`

## 0. Proje sahibiyle netleşen kararlar

1. **§2.4 kapısı.** Faz 09 §2.4 yapılmamıştı ve Faz 11 §3.3'ün 3. adımı ona dayanıyor. Proje sahibi: **"Ölçüm atlandı, §2.4'ü de yap."** Cihaz kuralı bu fazda uygulandı (`boardRenderer.ts`). Sonuç: varsayılan artık `'dom'` değil, cihaz kuralı (belirsizlikte canvas).
2. **Ayarlar ekranı.** İki aday çıktı (`SettingsPage` ve global `SettingsModal`). Proje sahibi: **ikisine de.**

## 1. Ne yapıldı

| Dosya | Değişiklik |
|---|---|
| `render/boardRenderer.ts` (yeniden yazıldı) | İki anahtar: `boardRenderer` (kullanıcı), `boardRendererAuto` (dedektör). Saf `isDeviceStrong` + `resolveBoardRenderer` (sıra: kullanıcı → dedektör → cihaz kuralı). Ham `navigator` okunur (`motionTier`'ın `?? 8`'i kullanılmaz), `matchMedia` okunamazsa "parmak" varsayılır. `setBoardRendererSetting('auto')` **iki anahtarı da siler**. `markBoardRendererAutoCanvas()` yalnızca `boardRendererAuto` yazar. Değişimler `window` olayı (`syncron:board-renderer`) ile yayılır. `useBoardRenderer(isSafe)` (ilk değer `null`, karar `useLayoutEffect` içinde, sonraki değişim yalnızca güvenli anda). `useBoardRendererSetting()` ayarlar ekranı için. Eski `useBoardRendererChoice` ve `setBoardRendererOverride` kaldırıldı (tek kullanıcısı `BoardArea` idi) |
| `render/jankMonitor.ts` (yeni) | Saf `sampleOf`/`isBadWindow`/`createBadStreak` + RAF'lı `createJankMonitor`. Pencereler: hareket (kısa segmentler birikir), zafer, açılıştan 1 sn sonra 3 sn boşta. Sekme görünmezken pencere atılır, ilk 1 sn örneklenmez, tek 100 ms+ kare yok sayılır, ≥1000 ms aralık "askıya alma" sayılır. RAF yalnızca pencere açıkken |
| `render/useJankGuard.ts` (yeni) | Dedektörü yalnızca `enabled` iken kurar, kararı `markBoardRendererAutoCanvas`'a yazar; kapalıyken `undefined` (RAF yok, evre bildirilmez) |
| `components/GameBoard.tsx` | İsteğe bağlı `onPlaybackPhase` prop'u + tek efekt (`victory`/`move`/`idle`). Başka davranış değişmedi |
| `components/play-screen/BoardArea.tsx` | `useBoardRenderer`/`useJankGuard`; `null` iken tahta yok; güvenli an = `!isAnimating && son karede ölüm/zafer yok`; geçişte tek kareli diziden `vfxEvents` temizlenir (aşağıda §2) |
| `features/settings/components/RendererSection.tsx` (yeni) | Üç seçenek (Otomatik · Kalite (DOM) · Performans (Canvas)); `SettingsModal`'a eklendi, `index.ts`'ten dışa açıldı |
| `features/settings/components/SettingsPage.tsx` | Yeni odak öğesi 5 (sol/sağ ile döner, Enter ile ilerler); Sıfırla 5→6, `TOTAL_FOCUS_ITEMS` 6→7 |
| `lib/i18n/tr.ts`, `en.ts` | `settings.renderer_{title,desc,auto,dom,canvas}` |
| `components/play-screen/BoardRendererToggle.tsx` | Yalnızca yorum güncellendi; hâlâ yalnızca geliştirme build'inde |
| `render/jankMonitor.test.ts`, `render/boardRenderer.test.ts` (yeni) | Aşağıda §3 |

### Karar kuralı ve sabitler (plan §3.1 başlangıç değerleri, `jankMonitor.ts` başında ayarlanabilir)

`JANK_FRAME_MS = 25`, `MIN_FRAMES = 30`, `JANK_RATIO = 0.2`, `OUTLIER_MS = 100`, `SUSPEND_GAP_MS = 1000`, `BAD_WINDOWS_TO_SWITCH = 2`, `SETTLE_MS = 1000`, `IDLE_WINDOW_MS = 3000`.

Gerekçe: 25 ms = 60 Hz'de ~1,5 kare; 40 fps altı. %20 + ≥30 kare: tek GC/bildirim sıçraması (30 karede %3) tek başına eşiği geçemez, sürekli 30 fps (%100) rahatça geçer. Art arda iki pencere: tek kötü pencere (ör. o sırada arka planda bir uygulama) güçlü cihazı canvas'a atmasın. Rakamlar **telefonda/6x throttling'de doğrulanmadı**; bkz. §6.

## 2. Tasarım kararları (planda yazmayan, benim verdiğim)

- **Hareket segmentleri birikir.** Tek hareket ~6 kare eder; "≥30 kare" kuralı segment başına uygulansaydı hareket penceresi hiç değerlendirilemezdi. Yetersiz örnek seriyi ne artırır ne sıfırlar. Zafer ve boşta pencereleri birikmez.
- **Güvenli an** = `!isAnimating` **ve** son karede ölüm/zafer yok. Sebep: animasyon bitince engine `snapshots`'ı tek kareye indiriyor; yeni çizici o kareyi "ilk kare" olarak kurar. Ölüm/zafer karesinde bu, koreografiyi/ölüm efektini **baştan oynatırdı**. Bu yüzden zaferden sonra geçiş, bir sonraki seviye/yeniden başlatma anında olur (`PlayContent` `key={levelId-restartKey}` ile her seviyede `BoardArea`'yı yeniden kurduğu için zaten doğal bir güvenli an).
- **Sessiz geçiş.** Yeni çizici tek karelik diziyi baştan kurarken `useFilmPlayback` o karenin `vfxEvents` seslerini yeniden çalardı. Geçiş anında dizi kopyalanıp `vfxEvents` boşaltılıyor (`vfxEvents` başka yerde kullanılmıyor; yalnızca ses). **Kalan:** karedeki `bumpDirection` varsa dokunsal `hapticImpact` bir kez tekrar edebilir; ve canvas'ta çarpma efekti tekrar başlayabilir — cihazda görülmedi.
- **Durum kaybı yok:** iki yol da aynı `snapshots`'tan okuyor, oyun durumu (`useGameEngine`) `BoardArea`'nın üstünde; çizici değişimi motoru sıfırlamaz. Bu, kod okunarak doğrulandı, cihazda değil.
- **Dedektör kararı hemen yazılır** (`boardRendererAuto = 'canvas'`), geçiş güvenli anda olur. Ara sürede oyun kapanırsa sonraki açılış zaten canvas.
- **İlk kare.** `BoardArea` istemci bileşeni ve tahta sunucuda hiç çizilmiyor: `renderer === null` iken ne DOM ne canvas render ediliyor; sarmalayıcı boyutlu `div` olduğu için yerleşim kaymıyor. Karar `useLayoutEffect` içinde, boyamadan önce.
- **Dev anahtarı** (DOM/CANVAS) artık `setBoardRendererSetting` yazıyor: yani kullanıcı seçimi gibi davranır ve dedektörü o cihazda kapatır. Yalnızca geliştirme build'inde.

## 3. Ne yapılmadı ve neden

| İş | Neden |
|---|---|
| Canvas → DOM otomatik geçiş, `motionTier` eşikleri, görünür bildirim | Plan §4 kapsam dışı |
| Toast önerisi | Plan "öner, ekleme": **öneri:** geçiş sessiz olduğundan, canvas'a geçildiğini ve Ayarlar → Tahta Çizimi'nden geri alınabileceğini söyleyen tek satırlık bir toast düşünülebilir |
| `SettingsContext`/"Varsayılanlara sıfırla" | Tahta çizimi ayarı `syncron_settings_v1` dışında, `userStorage`'ta duruyor (Faz 01'den beri). Sıfırla düğmesi bunu **sıfırlamıyor**; istenirse ayrı karar |
| `createJankMonitor` gövdesi için test | RAF/`document` gerektirir (00-ilkeler §6.1: jsdom çizim/tarayıcı testi yok); saf parçalar test edildi |
| Elle kontrol (plan §6) | Cihaz/DevTools gerektirir, proje sahibinin işi |

## 4. Doğrulama (00-ilkeler §6)

| Kontrol | Komut | Sonuç |
|---|---|---|
| Tip denetimi | `npx tsc --noEmit` | ✅ hatasız |
| Testler | `npm test` | ✅ **48 dosya / 496 test** (yeni: `jankMonitor.test.ts` 9, `boardRenderer.test.ts` 8) |
| Lint (yeni kod) | `npx eslint src/game-engine/render` | ✅ 0 sorun |
| Lint (yalnız `src`) | `npx eslint src` | ✅ **160 hata / 53 uyarı** (taban ile aynı) |
| Lint (tüm repo) | `npm run lint` | ✅ **275 hata / 79 uyarı** (taban ile aynı) |
| Android build | `npm run build:mobile` | ✅ `cap sync` bitti |
| 00-ilkeler §2.1 | `grep -rn "shadowBlur\|ctx\.filter" src/game-engine/render/` | ✅ yeni çıktı yok (yalnızca mevcut rasterleyici/yorum satırları) |

Not: lint sırasında `render` dışında `SettingsModal.tsx:32`, `SettingsPage.tsx:485`/`46`, `ThemeSection.tsx:107`'deki eski sorunlar görüldü; bu izin değil, dokunulmadı.

### Kabul kriterleri

- [x] Dedektör yalnızca DOM + Otomatik + oyun ekranında kuruluyor (`jankGuard = renderer==='dom' && ayar==='auto'`; canvas'ta `undefined` → hiç kurulmaz).
- [x] Karar fonksiyonu testli: 60 fps ✔ kötü değil, sürekli 30 fps ✔ kötü, tek GC sıçraması ✔ kötü değil, askıya alma ✔ sayılmıyor.
- [~] Art arda iki kötü pencere kuralı testli (`createBadStreak`); güvenli anda geçiş kodla sağlandı — **cihazda görülmedi**.
- [x] Kullanıcı DOM seçtiyse `ayar !== 'auto'` → `jankGuard=false`, dedektör kurulmuyor.
- [x] Otomatik'e dönmek `boardRendererAuto`'yu siliyor (`setBoardRendererSetting('auto')`).
- [x] Ayarlar ekranında (Page + Modal) üç seçenek; seçim olayla anında iletiliyor, güvenli anda uygulanıyor.
- [x] 00-ilkeler §6 yeşil; bu rapor yazıldı.

## 5. Görsel farklar

Yok (yeni bir çizim yok). Davranış farkı: **varsayılan çizici değişti** — masaüstü olmayan, çekirdek/RAM'i tanımsız veya ≤4 olan, dokunmatik cihazlar ve Firefox/Safari artık canvas ile açılır (Faz 09 §2.4'ün bilinçli sonucu).

## 6. Proje sahibi için — elle kontrol ve bilinen riskler

Plan §6'daki üç deneme aynen geçerli (6x CPU throttling + DOM + Otomatik → birkaç hamlede canvas; throttling kapalı → geçmemeli; ayardan DOM + throttling → geçmemeli). Ek olarak:

- Dedektörü masaüstünde denemek için cihaz kuralının DOM verdiği bir Chromium gerekir (≥5 çekirdek, ≥5 GB RAM bildirimi, fare). `deviceMemory` en fazla 8 raporlar; 4 GB'lık Chromebook gibi cihazlar canvas alır.
- **Risk:** 30 Hz veya pil tasarrufunda düşük yenileme hızlı ekranlar, kare aralığı ~33 ms olduğu için "sürekli kasıyor" gibi görünüp DOM'dan canvas'a atılabilir. Bu yönde yanlış alarm zararsız (canvas güvenli taraf), ama görülürse `JANK_FRAME_MS` yenileme hızına göre uyarlanabilir.
- Geçişte dokunsal bir titreşim tekrarı olabilir (§2, "Kalan").

## 7. Sonraki faza not

- `10-davranis-farklari.md` maddeleri ayrı iz; bu faz onlara dokunmadı.
- `render/README.md` "Bayraklar" bölümü yeni seçim sırasına göre güncellendi.
