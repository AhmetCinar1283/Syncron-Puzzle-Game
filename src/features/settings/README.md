# features/settings/

Kullanıcı tercihlerinin (ses, kontroller, performans ve görsellik, dil, tema) **tek bir ayar sistemi** olarak sunulduğu özellik (feature) katmanıdır. Sayfa (`/settings`) ve modal aynı görünümü (`SettingsView`) kullanır; ikisi de aynı grup kaydından beslenir. Değerler `services/settings` servisinde tutulur.

> Bu modül yalnızca **ayar mekanizmasından** sorumludur. Ayarların oyuna / diğer sayfalara uygulanması (ses motoru, girdi, ekran tuşları, swipe vb.) ilgili modüllerin işidir; onlar değeri `useSettings()` veya `settingsService.getSettings()` ile okur.

## Mimari (tek sorumluluk)
- **Model (`lib/settingsModel.ts`):** Bildirimsel satır tipleri (`toggle`, `slider`, `segment`) ve `SettingsGroup`.
- **Gruplar (`hooks/groups/`):** Her grup kendi hook'unda satırlarını üretir: `useSoundGroup`, `useControlsGroup`, `useGraphicsGroup`, `useGeneralGroup`.
- **Kayıt (`hooks/useSettingsGroups.ts`):** Grupların tek kayıt noktası. **Yeni ayar = ilgili gruba bir satır; yeni grup = kayda bir satır.**
- **Gezinme (`hooks/useSettingsNavigation.ts`):** Odak, klavye ve gamepad; satır türünü bilmez. Satır eylemleri `lib/rowActions.ts` (saf, testli).
- **Görünüm (`components/`):** `SettingsView` (kabuk) → `SettingsHeader`, `SettingsGroupCard`, `SettingsFooter`; satırlar `components/rows/` altında (`ToggleRowView`, `SliderRowView`, `SegmentRowView`, ortak `SettingRowShell`).
- **Kabuklar:** `SettingsPage` (tam sayfa) ve `SettingsModal` (her sayfadan erişim; RootLayout'ta) yalnızca `SettingsView`'ı sarar.
- **Erişim:** `context/SettingsContext.tsx` + `hooks/useSettings.ts`; dokunmatik cihaz tespiti `hooks/useTouchCapable.ts`.

## Ayar grupları
| Grup | Ayarlar |
|------|---------|
| Ses | Oyun sesi aç/kapa + seviye, menü sesi aç/kapa + seviye |
| Kontroller | Klavye, dokunmatik kontrol şeması*, tuş yeri*, swipe hassasiyeti*, titreşim* (*yalnızca dokunmatik cihaz) |
| Performans ve Görsellik | Tahta çizicisi (Otomatik/DOM/Canvas — mevcut otomatik karar sistemi), animasyon kademesi, performans göstergesi |
| Genel | Dil, tema, ekran açık kalsın |

## Kullanım
```tsx
import { useSettings } from '@/features/settings';

const { settings, openSettings } = useSettings();
settings.controls.scheme;      // 'swipe' | 'buttons' | 'both'
settings.sound.menuVolume;   // 0-100
```

## Dışa Açılan API (`index.ts`)
`SettingsProvider`, `useSettings()`, `SettingsModal`, `SettingsButton`, `SettingsPage`, `SettingsView` ve ayar tipleri.
