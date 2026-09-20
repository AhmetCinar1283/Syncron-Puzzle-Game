/**
 * DOSYA AMACI: Kullanıcı tercihleri ve ayarları modülünün (Settings) veri tiplerini,
 * dinleyici (listener) arayüzlerini ve güncelleme yardımcı tiplerini tanımlar.
 */

import type { Lang } from '@/lib/i18n';
import type { GameTheme } from '@/game-engine/themes/themeConfig';

export interface SoundSettings {
  /** Ses efektlerinin ve genel sesin açık/kapalı olma durumu. */
  muted: boolean;
  /** Ana ses yüksekliği (0 - 100 tam sayı aralığında). */
  volume: number;
  /** İleride ayrıştırılmış efekt sesleri için opsiyonel alan (0 - 100). */
  sfxVolume?: number;
  /** İleride efekt seslerini bağımsız susturmak için opsiyonel alan. */
  sfxMuted?: boolean;
  /** İleride arka plan müziği için opsiyonel ses yüksekliği (0 - 100). */
  musicVolume?: number;
  /** İleride arka plan müziğini bağımsız susturmak için opsiyonel alan. */
  musicMuted?: boolean;
}

export interface UserSettings {
  /** Şema versiyonu (ileride veri yapısı değiştiğinde migration için). */
  version: number;
  /** Uygulama arayüz dili. */
  language: Lang;
  /** Seçili görsel oyun teması. */
  theme: GameTheme;
  /** Ses tercihleri. */
  sound: SoundSettings;
}

/** Ayarlar değiştiğinde tetiklenen dinleyici fonksiyon tipi. */
export type SettingsListener = (settings: UserSettings) => void;

/** Ayarları kısmi olarak güncellemek için kullanılan tip. */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type SettingsUpdatePayload = DeepPartial<UserSettings>;
