/**
 * DOSYA AMACI: `services/settings` modülünün dışa açılan tek ve resmi public API'sidir.
 * Diğer modüller servis seviyesindeki ayarlara bu dosya üzerinden erişir.
 */

export { settingsService, SettingsService } from './settingsService';
export { DEFAULT_SETTINGS, clampVolume, isValidLang, isValidTheme } from './defaults';
export { SETTINGS_STORAGE_KEY, loadSettingsFromStorage, saveSettingsToStorage } from './storageAdapter';
export type {
  UserSettings,
  SoundSettings,
  SettingsListener,
  SettingsUpdatePayload,
  DeepPartial,
} from './types';
