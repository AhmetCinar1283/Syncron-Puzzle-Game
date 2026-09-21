/**
 * DOSYA AMACI: Bu dosya, uygulama genelinde çoklu dil (i18n) desteği sağlayan ve 
 * seçilen dili/çeviri fonksiyonunu (t) alt bileşenlere sunan LanguageContext yapısını içerir.
 */

'use client';

import {
  createContext,
  useContext,
  useCallback,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { translate, type Lang } from '@/lib/i18n';
import { settingsService } from '@/services/settings';
import { DEFAULT_SETTINGS } from '@/services/settings/defaults';

export type T = (key: string, vars?: Record<string, string | number>) => string;

interface LanguageContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: T;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

const subscribeToLanguage = (callback: () => void) => {
  return settingsService.subscribe(callback);
};

const getLanguageSnapshot = (): Lang => settingsService.getLanguage();
const getServerLanguageSnapshot = (): Lang => DEFAULT_SETTINGS.language;

// Dil durumunu (state) yöneten ve çeviri fonksiyonunu (t) sağlayarak alt bileşenleri sarmalayan sağlayıcı bileşendir.
export function LanguageProvider({ children }: { children: ReactNode }) {
  const lang = useSyncExternalStore(
    subscribeToLanguage,
    getLanguageSnapshot,
    getServerLanguageSnapshot,
  );

  const setLang = useCallback((newLang: Lang) => {
    settingsService.setLanguage(newLang);
  }, []);

  const t: T = useCallback(
    (key, vars) => translate(lang, key, vars),
    [lang],
  );

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

// Dil ve çeviri durumuna erişmek için kullanılan özel React hook'u.
export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}

/** Shorthand hook — returns just the translate function */
// Sadece çeviri (translate) fonksiyonunu (t) doğrudan çağırmak için kolaylık sağlayan kısayol hook'u.
export function useT(): T {
  return useLanguage().t;
}
