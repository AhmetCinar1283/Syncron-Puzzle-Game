/**
 * DOSYA AMACI: `features/settings` modülünün dışa açılan tek ve resmi public API'sidir.
 * Uygulamadaki tüm sayfalar ve bileşenler ayarlar özelliklerine yalnızca bu dosya üzerinden erişir.
 */

export { SettingsProvider, useSettingsContext } from './context/SettingsContext';
export { useSettings, type SettingsContextValue } from './hooks/useSettings';
export { SettingsModal } from './components/SettingsModal';
export { SettingsButton } from './components/SettingsButton';
export { SoundSection } from './components/SoundSection';
export { LanguageSection } from './components/LanguageSection';
export { ThemeSection } from './components/ThemeSection';
export { RendererSection } from './components/RendererSection';
export { SettingsPage } from './components/SettingsPage';

// Servis katmanından kullanışlı tiplerin re-export'u
export type {
  UserSettings,
  SoundSettings,
  SettingsUpdatePayload,
} from '@/services/settings';
