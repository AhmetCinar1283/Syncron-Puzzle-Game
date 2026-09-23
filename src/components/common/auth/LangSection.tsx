'use client';

import { useT, useLanguage } from '@/contexts/LanguageContext';
import { LANGS } from '@/lib/i18n';

/** Modal içi dil seçici (segment). */
export function LangSection() {
  const t = useT();
  const { lang, setLang } = useLanguage();
  return (
    <div className="home-sheet__section">
      <p className="home-sheet__label">{t('auth.language')}</p>
      <div className="home-sheet__seg">
        {LANGS.map(({ code, label }) => (
          <button
            key={code}
            type="button"
            className="home-sheet__btn"
            aria-pressed={lang === code}
            onClick={() => setLang(code)}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
