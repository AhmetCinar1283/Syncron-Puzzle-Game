# Faz 09 Raporu — Kapanış

> Plan: `.plans/canvas-render/09-kapanis.md` · Bağlayıcı: `00-ilkeler.md` · Devir: `raporlar/08-rapor.md`

> **§2.4 (çizicinin cihaza göre seçilmesi) YAPILMADI — kasıtlı.** Plan §0: görev
> verilirken proje sahibi (a) ölçüm sayılarını ya da (b) "ölçüm atlandı, seçimi
> etkinleştir" bilgisini yazar; ikisi de yoksa §2.4 yapılmaz, geri kalanı yapılır
> ve sorulur. Görev mesajında ikisi de yoktu. Varsayılan `'dom'` kaldı.

## 1. Ne yapıldı

| Plan | Değişiklik |
|---|---|
| §2.1 | `surface.ts`: `BOARD_BLEED_BASE = 32`, `layerBleed(name, actorsBleed)`, saf `layerGeometry(...)`. `Surface.bleed` katman alanı; `resize` her tuvale kendi payını yazar, `clearLayer` katmanın payını kullanır. `resize`'ın imzası aynı (5. parametre artık `actors` payı). `ProfilerOverlay` tuval ölçüsünü `actors`'tan okur (en büyük tuval). Toplam bellek zaten gerçek tuvallerden toplandığı için yeni payları kendiliğinden yansıtır |
| §2.1 test | `surface.test.ts`: pay tablosu (static/ambient 32, actors kademe payı), **üç katmanda `left + tx/dpr === 0` ve `top + ty/dpr === 0`** (DPR 1/1,5/2 × lite/full), static tuvalinin actors'tan küçük olması |
| §2.2 | `role="img"` + `aria-label` `BoardCanvas` sarmalayıcı `<div>`'ine taşındı; `labelSurfaces` → `hideSurfacesFromReaders`, üç tuval `aria-hidden="true"` |
| §2.3 | `victoryPlayerBox()` ve `VICTORY_HALF` silindi (silmeden önce `grep`: yalnızca tanımları vardı). Yetim kalan `NATIVE_CELL_SIZE` içe aktarımı da gitti |
| §2.5 | `BoardArea`: DOM/CANVAS anahtarı yalnızca `process.env.NODE_ENV !== 'production'` iken render ediliyor; anahtar bileşeni silinmedi, dosya başı yorumu güncellendi |
| §2.6 | `eslint.config.mjs` `globalIgnores`: `out-crazygames/**`, `out-gamedistribution/**` |
| §2.7 | `render/README.md`: pay katman özelliğidir; varsayılan/kaçış yolu/iki yolda deneme kuralı |
| §3 | `08-rapor.md` §7.1, §7.2, §7.3, §7.4, §7.5 işaretlerle dolduruldu; §6.3 eklendi |

## 2. Tuval belleği (yeniden hesap; sprite hariç)

Formül: Σ katman ((kenar + 2·pay)·dpr)² · 4 bayt. `full`: 2 × pay 32 + 1 × pay 160.

| Tahta | Kademe | DPR 1,5 | DPR 2 | Eski (Faz 08, DPR 2) |
|---|---|---|---|---|
| 384×384 | `full` | 7,70 MB | 13,69 MB | 22,69 MB |
| 512×512 | `full` | 11,64 MB | **20,69 MB** | 31,69 MB |
| 640×640 | `full` | 16,42 MB | **29,19 MB** | 42,19 MB |
| 512×512 | `lite` (static 32 + actors 64, DPR 1,5 tavanı) | 6,36 MB | — | 7,03 MB |

Beklenen (~20,7 / ~29,2 MB) ile örtüşüyor. 20 MB eşiği plan gereği artık uygulanmaz.

## 3. Ne yapılmadı ve neden

| İş | Neden |
|---|---|
| **§2.4 çizici seçimi, `useBoardRenderer` → `null`, ilk kare, `detectBoardRenderer` testi** | §0 kapısı: ölçüm sayısı ya da "ölçüm atlandı" kararı verilmedi. Aşağıda §5'teki soru |
| Elle kontrol (§6) | Cihaz gerektirir, proje sahibinin işi |
| Hiçbir "DOM ile ayırt edilemez" iddiası | Tarayıcı/cihazda görülmedi |

## 4. Doğrulama (00-ilkeler §6)

| Kontrol | Komut | Sonuç |
|---|---|---|
| Tip denetimi | `npx tsc --noEmit` | ✅ hatasız |
| Testler | `npm test` | ✅ **422 test** geçiyor (Faz 08: 419; +3 katman payı/hizalama) |
| Lint (yeni kod) | `npx eslint src/game-engine/render` | ✅ 0 sorun (`play-screen/`'deki 3 hata + 1 uyarı `LevelNotesModal`, `ThemeSelectorModal`, `ResultOverlays`'te; benim dosyalarım değil) |
| Lint (yalnız `src`) | `npx eslint src` | ⚠️ **160 hata / 53 uyarı** — Faz 08 ile aynı; 154/52 tabanından fark bu izin dışındaki çalışma ağacı değişiklikleri |
| Lint (tüm repo) | `npm run lint` | **275 hata / 79 uyarı** — `out-*` yoksayması sonrası yeni taban, 00-ilkeler §6 güncellendi |
| Android build | `npm run build:mobile` | ✅ `cap sync` bitti |
| 00-ilkeler §2.1 | `grep -rn "shadowBlur\|ctx\.filter" src/game-engine/render/` | ✅ kod satırı yalnızca `paintTokens.setShadow` ve `cells/dim.ts` (rasterleyiciler) |

## 5. Proje sahibinden gereken tek şey (§2.4'ü açar)

Şunlardan **birini** yazın:

- **(a)** Telefonda ölçüm: "aynı bölümde DOM janky %X, canvas janky %Y" ve "boşta 30 sn: DOM N kare, canvas M kare". Canvas DOM'dan kötüyse §2.4 yapılmaz.
- **(b)** "Ölçüm atlandı, seçimi etkinleştir."

Gelince yapılacak iş: `detectBoardRenderer()` planın sırasıyla (override → hepsi doğruysa `'dom'` → aksi `'canvas'`; ham `navigator` değerleri, eksik değer `'canvas'`), bunu kilitleyen birim test, `useBoardRenderer` `null` dönene kadar yer tutucu.

## 6. Görsel farklar

Yok. Payın katmana bölünmesi çizim koordinatlarını ve yerleşimi değiştirmez; `actors` payı aynı, dolayısıyla zafer parçacıklarının yayılımı aynı olmalı (cihazda §6'daki elle kontrolle doğrulanmalı — ben görmedim).

## 7. Sonraki faza not

- `10-davranis-farklari.md`: #3, #7, #9, #12, #19, #21.
- Faz 11: kullanıcıya dönük Otomatik/DOM/Canvas ayarı; bu dev anahtarı orada da kalır.
- `static`/`ambient` payı iki kademede de 32; `lite`'ın static payını düşürmek ayrı karar.
