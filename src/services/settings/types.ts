/**
 * DOSYA AMACI: Kullanıcı tercihleri ve ayarları modülünün (Settings) veri tiplerini,
 * dinleyici (listener) arayüzlerini ve güncelleme yardımcı tiplerini tanımlar.
 */

import type { Lang } from '@/lib/i18n';
import type { GameTheme } from '@/game-engine/themes/themeConfig';

/** Tahta çizicisi tercihi: `auto` = mevcut otomatik karar sistemi (boardRenderer.ts). */
export type RendererPreference = 'auto' | 'dom' | 'hybrid' | 'canvas';

/** Hareket/animasyon kademesi tercihi: `auto` = cihaza göre tespit (motionTier.ts). */
export type MotionPreference = 'auto' | 'full' | 'lite';

/** Dokunmatik kontrol şeması. */
export type ControlScheme = 'swipe' | 'buttons' | 'both';

/** Ekran tuşlarının yerleşim tarafı. */
export type PadSide = 'right' | 'left';

export interface SoundSettings {
  /** Oyun sesinin (efektler) kapalı olma durumu. */
  muted: boolean;
  /** Oyun sesi yüksekliği (0 - 100 tam sayı). */
  volume: number;
  /** Menü / harita sesinin kapalı olma durumu. */
  menuMuted: boolean;
  /** Menü / harita sesi yüksekliği (0 - 100 tam sayı). */
  menuVolume: number;
}

export interface ControlSettings {
  /** Klavye girdisi açık mı. */
  keyboard: boolean;
  /** Dokunmatik kontrol şeması: yalnızca kaydırma, yalnızca ekran tuşları ya da ikisi birden. */
  scheme: ControlScheme;
  /** Ekran tuşlarının (yön tuşları + geri al) hangi elde durduğu. */
  padSide: PadSide;
  /** Kaydırma (swipe) hassasiyeti (0 - 100; yüksek = daha kısa kaydırma yeter). */
  swipeSensitivity: number;
  /** Titreşim (haptik) geri bildirimi açık mı. */
  haptics: boolean;
}

export interface GraphicsSettings {
  /** Tahta çizici tercihi (DOM / Canvas / Otomatik). */
  renderer: RendererPreference;
  /** Hareket/animasyon kademesi tercihi. */
  motion: MotionPreference;
  /** Performans profiler katmanı gösterilsin mi. */
  profiler: boolean;
}

export interface GeneralSettings {
  /** Oyun sırasında ekran açık kalsın mı (wake lock). */
  wakeLock: boolean;
}

export interface UserSettings {
  /** Şema versiyonu (veri yapısı değiştiğinde migration için). */
  version: number;
  /** Uygulama arayüz dili. */
  language: Lang;
  /** Seçili görsel oyun teması. */
  theme: GameTheme;
  /** Ses tercihleri. */
  sound: SoundSettings;
  /** Kontrol tercihleri. */
  controls: ControlSettings;
  /** Performans ve görsellik tercihleri. */
  graphics: GraphicsSettings;
  /** Genel tercihler. */
  general: GeneralSettings;
}

/** Ayarlar değiştiğinde tetiklenen dinleyici fonksiyon tipi. */
export type SettingsListener = (settings: UserSettings) => void;

/** Ayarları kısmi olarak güncellemek için kullanılan tip. */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type SettingsUpdatePayload = DeepPartial<UserSettings>;
