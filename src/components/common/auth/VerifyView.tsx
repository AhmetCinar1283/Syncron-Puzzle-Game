'use client';

import { useT } from '@/contexts/LanguageContext';
import { useGameTheme } from '@/game-engine/contexts/GameThemeContext';
import { Mail } from 'lucide-react';
import type { useVerificationFlow } from './useVerificationFlow';

interface Props {
  flow: ReturnType<typeof useVerificationFlow>;
  error: string;
  signOutBusy: boolean;
  onSignOut: () => void;
}

/** "E-postanı doğrula" görünümü (oturumlu ve oturumsuz bekleyiş). */
export function VerifyView({ flow, error, signOutBusy, onSignOut }: Props) {
  const t = useT();
  const { theme, themeConfig } = useGameTheme();
  const accent = themeConfig?.accentColor || '#00ff88';
  const glow = themeConfig?.accentGlow || 'rgba(0, 255, 136, 0.4)';
  const isArcade = theme === 'arcade';

  const dailyLimit = flow.cooldownMs === Infinity;
  const waiting = flow.cooldownMs > 0 && !dailyLimit;
  const seconds = waiting ? Math.ceil(flow.cooldownMs / 1000) : 0;

  return (
    <>
      <div className="home-sheet__game-hero" style={{ padding: '14px', alignItems: 'center', textAlign: 'center' }}>
        <div
          style={{
            width: 46,
            height: 46,
            borderRadius: isArcade ? 0 : '50%',
            background: `${accent}1f`,
            border: `2px solid ${accent}`,
            boxShadow: isArcade ? `2px 2px 0 #000, 0 0 12px ${glow}` : `0 0 16px ${glow}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: accent,
            marginBottom: 6,
          }}
        >
          <Mail size={22} />
        </div>
        <div className="home-sheet__theme-pill">
          <span className="home-sheet__theme-pill-dot" />
          <span>{themeConfig?.defaultName}</span>
        </div>
        <p className="home-sheet__text" style={{ fontWeight: 700, color: '#f8fafc', marginTop: 6, fontSize: 13 }}>
          {t('auth.verify_sent_to', { email: flow.targetEmail })}
        </p>
      </div>

      <div className="home-sheet__stack" style={{ marginTop: 10 }}>
        <p className="home-sheet__text home-sheet__text--dim">{t('auth.verify_instructions')}</p>
        <p className="home-sheet__text home-sheet__text--dim">{t('auth.verify_spam_hint')}</p>

        <button
          type="button"
          className="home-sheet__btn"
          data-variant="primary"
          data-autofocus
          onClick={flow.check}
          disabled={flow.busy}
        >
          {flow.busy ? t('auth.verify_checking') : t('auth.verify_check_now')}
        </button>

        <button
          type="button"
          className="home-sheet__btn"
          onClick={flow.resend}
          disabled={flow.busy || waiting || dailyLimit}
        >
          {dailyLimit
            ? t('auth.verify_daily_limit')
            : waiting
              ? t('auth.verify_cooldown', { n: seconds })
              : t('auth.verify_resend')}
        </button>

        <p className="home-sheet__text home-sheet__text--dim">
          {flow.signedOutPending ? t('auth.verify_signed_out_note') : t('auth.verify_limited_note')}
        </p>

        {flow.notice && <p className="home-sheet__text home-sheet__text--ok">{flow.notice}</p>}
        {error && <p className="home-sheet__text home-sheet__text--error">{error}</p>}
      </div>

      <div className="home-sheet__section">
        {flow.signedOutPending ? (
          <button type="button" className="home-sheet__btn" onClick={flow.cancelPending}>
            {t('auth.tab_signin')}
          </button>
        ) : (
          <button
            type="button"
            className="home-sheet__btn"
            data-variant="danger"
            onClick={onSignOut}
            disabled={signOutBusy}
          >
            {signOutBusy ? '...' : t('auth.sign_out')}
          </button>
        )}
      </div>
    </>
  );
}
