'use client';

import React, { memo, useState } from 'react';
import { AppLink } from '@/lib/navigation';
import { GameIcon, IconName } from '@/components/icons';
import { useGameTheme } from '@/game-engine/contexts/GameThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCapabilities } from '@/contexts/MonetizationContext';

const TIPS: { icon: IconName; key: string }[] = [
  { icon: 'gamepad', key: 'home.tip_move' },
  { icon: 'target', key: 'home.tip_win' },
  { icon: 'ice', key: 'home.tip_ice' },
  { icon: 'switch', key: 'home.tip_toggle' },
  { icon: 'portal', key: 'home.tip_teleporter' },
  { icon: 'arrow-right', key: 'home.tip_conveyor' },
  { icon: 'lightning', key: 'home.tip_power' },
  { icon: 'sparkles', key: 'home.tip_editor' },
];

/**
 * Rehber + SEO metni + hukuk linkleri. Fold'un ALTINDA durur: birincil eylemle
 * görsel ağırlık yarışına girmesin diye. Mobilde varsayılan olarak kapalıdır
 * ama HTML kaynağında kalır (display:none), böylece tarayıcı build'inde SEO
 * içeriği kaybolmaz. 768px üstünde her zaman açıktır (bkz. src/app/home.css).
 */
function HomeInfoSectionBase() {
  const { t, lang } = useLanguage();
  const isTr = lang === 'tr';
  const { themeConfig } = useGameTheme();
  const { externalLinks } = useCapabilities();
  const [open, setOpen] = useState(false);

  return (
    <section className="home-info" aria-label="How to play Syncron">
      <button
        type="button"
        className="home-info__toggle"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <GameIcon name="gamepad" size={13} color={themeConfig.accentColor} />
        <span>{t('home.show_guide')}</span>
        <span aria-hidden="true">{open ? '▴' : '▾'}</span>
      </button>

      <div className="home-info__body" data-open={open}>
        <h2
          style={{
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: `${themeConfig.accentColor}99`,
            margin: '16px 0 12px',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <GameIcon name="gamepad" size={13} color={themeConfig.accentColor} />
          {t('home.how_to_play')}
        </h2>

        <div className="home-info__tips">
          {TIPS.map(({ icon, key }) => (
            <div key={key} className="home-info__tip">
              <span
                style={{
                  color: themeConfig.accentColor,
                  flexShrink: 0,
                  width: 16,
                  display: 'inline-flex',
                  alignItems: 'center',
                  marginTop: 2,
                }}
              >
                <GameIcon name={icon} size={13} />
              </span>
              <span>{t(key)}</span>
            </div>
          ))}
        </div>

        {externalLinks && (
          <p style={{ marginTop: 14, marginBottom: 0, color: '#475569', fontSize: 11 }}>
            {t('home.seo')}{' '}
            <a
              href="https://syncron.polimelo.com"
              style={{ color: `${themeConfig.accentColor}80`, textDecoration: 'none' }}
            >
              syncron.polimelo.com
            </a>
            .
          </p>
        )}

        <footer className="home-links">
          {externalLinks && (
            <>
              <AppLink href="/support">{isTr ? 'DESTEK' : 'SUPPORT'}</AppLink>
              <span style={{ color: '#334155', fontSize: 10 }}>•</span>
            </>
          )}
          <AppLink href="/privacy">{isTr ? 'GİZLİLİK' : 'PRIVACY'}</AppLink>
          <span style={{ color: '#334155', fontSize: 10 }}>•</span>
          <AppLink href="/terms">{isTr ? 'KOŞULLAR' : 'TERMS'}</AppLink>
          <span style={{ color: '#334155', fontSize: 10 }}>•</span>
          <AppLink href="/kvkk">{isTr ? 'KVKK BEYANI' : 'KVKK'}</AppLink>
        </footer>
      </div>
    </section>
  );
}

export const HomeInfoSection = memo(HomeInfoSectionBase);
