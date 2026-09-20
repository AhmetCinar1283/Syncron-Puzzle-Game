# 03 — Kalan Sekiz Hücre Tipi

> Bağlayıcı: `.plans/canvas-render/00-ilkeler.md`. Önce `raporlar/01-rapor.md` ve
> `raporlar/02-rapor.md` oku.
> **Model: sonnet.** Desen Faz 02'de kuruldu; bu faz onun sekiz kez uygulanması.
> Yeni mimari karar verme — desenden sapman gerekiyorsa dur ve sor.

---

## 1. Okuyacağın dosyalar

| Dosya | Neden |
|---|---|
| `.plans/canvas-render/00-ilkeler.md`, `raporlar/02-rapor.md` | Sözleşme ve desen |
| `src/game-engine/render/paintTokens.ts` | Kullanacağın yardımcılar |
| `src/game-engine/render/cells/ice.ts` | **Referans desen** — durağan gövde + ambient süs ayrımı burada |
| `src/game-engine/render/cells/obstacle.ts` | **Referans desen** — çok `styleType`'lı hücre |
| `src/game-engine/render/cells/index.ts` | Kayıt tablosu |
| `src/game-engine/render/icons.ts` | İkon çizimi |
| `src/game-engine/components/cells/` altındaki 8 dosya (§3 tablosu) | Port kaynağı |
| `src/game-engine/components/effects/animationStyles.ts` | Süs keyframe gövdeleri |
| `src/game-engine/components/board/boardKeyframes.ts` | Hangi sınıfın süs sayıldığı (`AMBIENT_CLASSES`) |

Bu listeyi genişletme. Bir hücre çizicisinin bağımlılığı listede yoksa, o hücreyi
atla ve rapora yaz.

---

## 2. Yapılacaklar

Her biri `src/game-engine/render/cells/<ad>.ts`, Faz 02'deki `SpritePainter`
sözleşmesine uyar ve `cells/index.ts`'e kaydedilir.

| # | Yeni dosya | Kaynak | Animasyonlu süsü | Dikkat |
|---|---|---|---|---|
| 1 | `power.ts` | `powerCellRenderer.tsx` | `power-ring-active`, `power-bolt-active` | `cell.isElectrified` görünümü değiştiriyor → `key()`'e girmeli |
| 2 | `toggle.ts` | `toggleCellRenderer.tsx` | `toggle-symbol-active` | — |
| 3 | `conveyor.ts` | `conveyorCellRenderer.tsx` | `conveyor-arrow-1/2/3-active` | `customData.direction` görünümü belirliyor → `key()`'e girmeli (4 değer) |
| 4 | `trampoline.ts` | `trampolineCellRenderer.tsx` | yok | `customData.direction` → `key()` |
| 5 | `teleport.ts` | `teleportCellRenderer.tsx` | `portal-pulse-ring-active`, `portal-vortex-active`, `portal-vortex-inner-active` | En büyük kaynak (216 satır); `customData.group` **renk** belirliyorsa `key()`'e girer, yalnızca eşleştirme içinse girmez — koda bak, tahmin etme |
| 6 | `target.ts` | `targetCellRenderer.tsx` | `target-pulse-anim`, `target-rotate-anim`, `target-pulse-green`, `target-pulse-blue` | `customData.playerIndex` rengi belirliyor → `key()`'e girmeli |
| 7 | `controlSwitch.ts` | `controlSwitchCellRenderer.tsx` | yok | — |
| 8 | `directionDeflector.ts` | `directionDeflectorCellRenderer.tsx` | yok | Yön/yansıtma ekseni `key()`'e girmeli |

### 2.1 Anahtarlama kuralı — bu fazın tek gerçek riski

`key()`'e giren her alan, önbelleği o alanın olası değer sayısı kadar çoğaltır.
Kural: **görüntüyü değiştiren her şey girer, başka hiçbir şey girmez.**

Girmesi doğru olanlar: `cell.type`, `theme`, `isOccupied`, `phase`, ve yukarıdaki
tabloda adı geçen `customData` alanları.

**Asla girmeyecekler:** `cell.id`, `cell.position`, `customData.explored`,
`customData.trailPlayerIndex`, `customData.cableConnections` (bunlar Faz 04'ün işi,
hücre sprite'ının değil).

Faz bitiminde §4'teki `cache.size()` kontrolü bu kuralın kanıtıdır.

### 2.2 Süsü olan hücreler

`ice.ts`'teki ayrımı aynen uygula: durağan gövde `CELL_SPRITES`'a, animasyonlu parça
`CELL_AMBIENT_SPRITES`'a. Süsün periyodu, kaynak CSS animasyonunun süresidir
(`animationStyles.ts` / satır içi `animation` dizgisi) — tahmin etme, oku.

`teleport` hücresinin üç ayrı süsü var ve farklı periyotlarda dönüyorlar. Üçünü **tek
bir ambient sprite'ta birleştir** ve periyodu üçünün en küçük ortak katı yerine
`portal-vortex`'in periyoduna sabitle; 12 faz örneklemesinde fark görünmez. Bu kararın
sonucu rapora yazılır.

### 2.3 `normal` düşüşünü kaldır

Faz 02'de kayıtta olmayan tipler `normal` hücreye düşüyor ve uyarı basıyordu.
Sekiz tip de eklendiğine göre artık `CELL_SPRITES` **tam** olmalı: `Partial<Record<...>>`
yerine `Record<CellTypes, SpritePainter<CellPaintInput>>` kullan, düşüş yolunu ve
`console.warn`'u kaldır. Tip sistemi eksik bir tipi derlemede yakalasın.

---

## 3. Kapsam dışı

- İz, kablo, kenar, portal bağlantı yolları, oda çerçevesi (Faz 04).
- Varlıklar, efektler, zafer (Faz 05–06).
- Sis (Faz 07).
- `paintTokens.ts`'e yeni yardımcı eklemek — gerekiyorsa **dur ve sor**; Faz 02'nin
  deseni yetmiyorsa bu bir mimari karardır, bu fazın işi değil.
- DOM çizicilerinde herhangi bir değişiklik.

---

## 4. Kabul kriterleri

- [ ] `CELL_SPRITES` tipi `Record<CellTypes, ...>` ve 12 tipin hepsi kayıtlı;
      `normal`'e düşüş yolu kaldırıldı.
- [ ] Her hücre tipini içeren bir test bölümü, `boardRenderer='canvas'` ve
      `'dom'` modlarında yan yana ayırt edilemiyor (varlıklar ve overlay'ler hariç).
- [ ] Beş temanın hepsinde §4'teki karşılaştırma yapıldı.
- [ ] 12 tipin hepsini içeren bir tahtada `cache.size()` **60'ın altında**.
      Değeri rapora yaz. 60'ı aşıyorsa §2.1 kuralı çiğnenmiştir — düzelt.
- [ ] Süslü hücreler `ambientMode='on'` iken hareket ediyor, `'off'` iken duruyor.
- [ ] `grep -rn "shadowBlur\|ctx\.filter" src/game-engine/render/cells/` çıktısı boş.
- [ ] 00-ilkeler §6 tablosundaki dört kontrol yeşil.
- [ ] `raporlar/03-rapor.md` yazıldı; `teleport` periyot kararı (§2.2) ve son
      `cache.size()` değeri içinde.

---

## 5. Elle kontrol (proje sahibi)

- Portal, konveyör ve hedef hücrelerinin süslerinin hızı DOM moduyla aynı mı?
- Elektriklenmiş `power` hücresi ile sönük olanı ayırt edilebiliyor mu?
