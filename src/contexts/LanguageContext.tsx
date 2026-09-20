/**
 * DOSYA AMACI: Bu dosya, uygulama genelinde çoklu dil (i18n) desteği sağlayan ve 
 * seçilen dili/çeviri fonksiyonunu (t) alt bileşenlere sunan LanguageContext yapısını içerir.
 */

'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { translate, LANGS, type Lang } from '@/lib/i18n';
import { settingsService } from '@/services/settings';

export type T = (key: string, vars?: Record<string, string | number>) => string;

interface LanguageContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: T;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

// Dil durumunu (state) yöneten ve çeviri fonksiyonunu (t) sağlayarak alt bileşenleri sarmalayan sağlayıcı bileşendir.
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => settingsService.getLanguage());

  // settingsService değişikliklerini dinle
  useEffect(() => {
    const unsubscribe = settingsService.subscribe((s) => {
      setLangState(s.language);
    });
    return unsubscribe;
  }, []);

  const setLang = useCallback((newLang: Lang) => {
    setLangState(newLang);
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
