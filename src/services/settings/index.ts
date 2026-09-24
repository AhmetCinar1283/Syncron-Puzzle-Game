/**
 * DOSYA AMACI: `services/settings` modülünün dışa açılan tek ve resmi public API'sidir.
 * Diğer modüller servis seviyesindeki ayarlara bu dosya üzerinden erişir.
 */

export { settingsService, SettingsService } from './settingsService';
export { DEFAULT_SETTINGS, SETTINGS_VERSION, clampVolume, clampPercent, isValidLang, isValidTheme, isValidScheme, isValidPadSide } from './defaults';
export { sanitizeSettings } from './sanitize';
export { SETTINGS_STORAGE_KEY, loadSettingsFromStorage, saveSettingsToStorage } from './storageAdapter';
export type {
  UserSettings,
  SoundSettings,
  ControlSettings,
  GraphicsSettings,
  GeneralSettings,
  MotionPreference,
  ControlScheme,
  PadSide,
  SettingsListener,
  SettingsUpdatePayload,
  DeepPartial,
} from './types';
