# services/settings/

Kullanıcı tercihleri ve ayarlarının (ses, kontroller, performans/görsellik, genel, dil ve tema) kalıcılığını, doğrulanmasını ve dinlenmesini sağlayan servis katmanıdır.

## Sorumluluklar
- **Kalıcılık (Persistence):** Ayarlar `localStorage` üzerinde `syncron_settings_v1` anahtarı altında JSON olarak saklanır.
- **Şema v2 & Migration:** `UserSettings` şu gruplardan oluşur: `sound`, `controls`, `graphics`, `general` (+ `language`, `theme`). İlk açılışta veya v1 kayıtta dağınık eski anahtarlar (`lang`, `know_and_conquer_game_theme`, `soundMuted`, `boardRenderer`, `hapticsEnabled`, `motionTier`) `legacyKeys.ts` ile taranıp yeni yapıya taşınır; kayıttaki değerler her zaman önceliklidir. Dil, tema ve ses kapalı bilgisi eski okuyucular için eski anahtarlara da yazılır (dual-write).
- **Tek doğrulama noktası:** `sanitize.ts` hem depolamadan okunan veriyi hem `updateSettings` kısmi güncellemelerini derin birleştirip doğrular; her alan sınırlandırılır/varsayılana düşer.
- **İnce adaptörler:** `boardRenderer.ts`, `haptics.ts`, `motionTier.ts` değerlerini bu servisten okur (dış API'leri ve otomatik karar mantıkları değişmedi).
- **Hata Toleransı (Fault-Tolerance):** Depolama erişim kısıtlamaları (ör. gizli sekme, iframe kotası) veya bozuk verilerde oyun kilitlenmez; `DEFAULT_SETTINGS` değerlerine dönülür. Yüzdelik değerler (ses, hassasiyet) daima `0-100` arasına sınırlandırılır.
- **React Bağımsızlığı:** Saf TypeScript ile yazılmıştır. `soundEngine`, worker istemcileri veya test modülleri React olmadan da doğrudan `settingsService` üzerinden okuma/yazma yapabilir.

## Dışa Açılan API (`index.ts`)
- `settingsService`: Tekil servis nesnesi.
  - `getSettings()`: Güncel ayarları döner.
  - `updateSettings(payload)`: Kısmi güncelleme yapar.
  - `setLanguage(lang)`: Dili günceller (`Lang`: en, tr, pt-BR, ru, es, de, fr, pl).
  - `setTheme(theme)`: Temayı günceller (`'arcade' | 'legacy' | 'neon' | 'blueprint' | 'cosmic'`).
  - `setSoundMuted(muted)`: Sesi açar/kapatır.
  - `toggleSoundMute()`: Sesi tersine çevirir.
  - `setSoundVolume(volume)`: Oyun ses seviyesini ayarlar (0 - 100). Menü sesi ve diğer gruplar için `updateSettings({ sound: { menuVolume } })` vb.
  - `subscribe(listener)`: Değişiklikleri dinler.
  - `resetToDefaults()`: Varsayılan ayarlara döner.
- `DEFAULT_SETTINGS`: Varsayılan yapılandırma sabiti.
- `types.ts`: `UserSettings`, `SoundSettings`, `ControlSettings`, `GraphicsSettings`, `GeneralSettings` tip tanımları.
