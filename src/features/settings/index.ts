/**
 * DOSYA AMACI: `features/settings` modülünün dışa açılan tek ve resmi public API'sidir.
 * Uygulamadaki tüm sayfalar ve bileşenler ayarlar özelliklerine yalnızca bu dosya üzerinden erişir.
 */

export { SettingsProvider, useSettingsContext } from './context/SettingsContext';
export { useSettings, type SettingsContextValue } from './hooks/useSettings';
export { SettingsModal } from './components/SettingsModal';
export { SettingsButton } from './components/SettingsButton';
export { SettingsPage } from './components/SettingsPage';
export { SettingsView } from './components/SettingsView';

// Servis katmanından kullanışlı tiplerin re-export'u
export type {
  UserSettings,
  SoundSettings,
  ControlSettings,
  GraphicsSettings,
  GeneralSettings,
  SettingsUpdatePayload,
} from '@/services/settings';
