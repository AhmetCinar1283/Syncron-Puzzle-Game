'use client';

import { LANGS, type Lang } from '@/lib/i18n';

interface Props {
  t: (key: string) => string;
  lang: Lang;
  setLang: (lang: Lang) => void;
  isCurrentAnonymous: boolean;
  handleSignOut: () => void;
}

export default function SettingsPanel({ t, lang, setLang, isCurrentAnonymous, handleSignOut }: Props) {
  return (
    <div
      style={{
        background: '#0a0f1a50',
        border: '1px solid #111827',
        borderRadius: '16px',
        padding: '20px 24px',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
      }}
    >
      {/* Language Settings */}
      <div>
        <h3
          style={{
            fontSize: '11px',
            fontWeight: 800,
            letterSpacing: '0.15em',
            color: '#4b5563',
            textTransform: 'uppercase',
            margin: '0 0 8px 0',
          }}
        >
          {t('auth.language')}
        </h3>
        <div style={{ display: 'flex', gap: '8px' }}>
          {LANGS.map(({ code, label: lbl }) => (
            <button
              key={code}
              onClick={() => setLang(code)}
              style={{
                padding: '6px 14px',
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.1em',
                background: lang === code ? 'rgba(0,255,136,0.1)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${lang === code ? 'rgba(0,255,136,0.4)' : '#1f2937'}`,
                color: lang === code ? '#00ff88' : '#6b7280',
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {lbl}
            </button>
          ))}
        </div>
      </div>

      {/* Logout button */}
      {!isCurrentAnonymous && (
        <button
          onClick={handleSignOut}
          style={{
            width: '100%',
            padding: '10px 0',
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            borderRadius: '8px',
            color: '#ef4444',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#ef4444';
            e.currentTarget.style.color = '#030712';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)';
            e.currentTarget.style.color = '#ef4444';
          }}
        >
          {t('auth.sign_out')}
        </button>
      )}
    </div>
  );
}
