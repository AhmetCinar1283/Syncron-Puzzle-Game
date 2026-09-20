# services/settings/

Kullanıcı tercihleri ve ayarlarının (dil, tema, ses açma/kapama ve ses seviyesi) kalıcılığını, doğrulanmasını ve dinlenmesini sağlayan servis katmanıdır.

## Sorumluluklar
- **Kalıcılık (Persistence):** Ayarlar `localStorage` üzerinde `syncron_settings_v1` anahtarı altında JSON olarak saklanır.
- **Migration & Dual-Write:** Eski sistemdeki dağınık anahtarlar (`lang`, `know_and_conquer_game_theme`, `soundMuted`) ilk açılışta taranarak yeni birleşik yapıya taşınır. Eski sayfaların bozulmaması için değişiklik anında eski anahtarlara da yazılır (dual-write).
- **Hata Toleransı (Fault-Tolerance):** Depolama erişim kısıtlamaları (ör. gizli sekme, iframe kotası) veya bozuk verilerde oyun kilitlenmez; `DEFAULT_SETTINGS` değerlerine dönülür. Ses seviyesi daima `0-100` arasına sınırlandırılır (clamp).
- **React Bağımsızlığı:** Saf TypeScript ile yazılmıştır. `soundEngine`, worker istemcileri veya test modülleri React olmadan da doğrudan `settingsService` üzerinden okuma/yazma yapabilir.

## Dışa Açılan API (`index.ts`)
- `settingsService`: Tekil servis nesnesi.
  - `getSettings()`: Güncel ayarları döner.
  - `updateSettings(payload)`: Kısmi güncelleme yapar.
  - `setLanguage(lang)`: Dili günceller (`'tr' | 'en'`).
  - `setTheme(theme)`: Temayı günceller (`'arcade' | 'legacy' | 'neon' | 'blueprint' | 'cosmic'`).
  - `setSoundMuted(muted)`: Sesi açar/kapatır.
  - `toggleSoundMute()`: Sesi tersine çevirir.
  - `setSoundVolume(volume)`: Ses seviyesini ayarlar (0 - 100).
  - `subscribe(listener)`: Değişiklikleri dinler.
  - `resetToDefaults()`: Varsayılan ayarlara döner.
- `DEFAULT_SETTINGS`: Varsayılan yapılandırma sabiti.
- `types.ts`: `UserSettings`, `SoundSettings` tip tanımları.
