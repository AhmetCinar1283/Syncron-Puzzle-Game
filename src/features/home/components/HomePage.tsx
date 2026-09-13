'use client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCapabilities } from '@/contexts/MonetizationContext';
import { AppLink } from '@/lib/navigation';
import { CanvasParticles } from './CanvasParticles';
import { MenuCard } from './MenuCard';
import { useHomePage } from '../hooks/useHomePage';
import { GameIcon } from '@/components/icons';

export function HomePage() {
  const { lang } = useLanguage();
  const isTr = lang === 'tr';
  const { externalLinks } = useCapabilities();
  const { t, isMobile, options, activeMenuIndex, setActiveMenuIndex, isConnected } = useHomePage();

  return (
    <>
      {/* Floating background particles */}
      <CanvasParticles isMobile={isMobile} />

      <main
        style={{
          position: 'relative',
          zIndex: 1,
          minHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'transparent',
          gap: 48,
          padding: '32px 16px',
          boxSizing: 'border-box',
        }}
      >
        {/* Title */}
        <div style={{ textAlign: 'center' }}>
          <h1
            style={{
              fontSize: 40,
              fontWeight: 900,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: '#00ff88',
              textShadow: '0 0 20px rgba(0,255,136,0.6), 0 0 40px rgba(0,255,136,0.25)',
              margin: 0,
            }}
          >
            Syncron
          </h1>
          <p
            style={{
              marginTop: 10,
              fontSize: 11,
              color: '#1e3a5f',
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
            }}
          >
            Grid Puzzle
          </p>
        </div>

        {/* Nav cards grid */}
        <div style={{
          width: '100%',
          maxWidth: 480,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 12,
          padding: '0 8px',
          boxSizing: 'border-box',
        }}>
          {options.map((opt, idx) => (
            <MenuCard
              key={opt.id}
              id={opt.id}
              label={opt.label}
              sub={opt.sub}
              color={opt.color}
              onClick={opt.onClick}
              isSelected={activeMenuIndex === idx}
              onMouseEnter={() => setActiveMenuIndex(idx)}
              isHero={opt.id === 'play' || opt.id === 'admin'}
              isGamepadConnected={isConnected}
              isMobile={isMobile}
            />
          ))}
        </div>

        {/* How To Play — semantic content for SEO */}
        <section
          aria-label="How to play Syncron"
          style={{
            width: '100%',
            maxWidth: 480,
            borderTop: '1px solid #00ff8820',
            paddingTop: 28,
            color: '#4b5563',
            fontSize: 12,
            lineHeight: 1.7,
          }}
        >
          <h2
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: '#00ff8844',
              marginBottom: 14,
              marginTop: 0,
            }}
          >
            {t('home.how_to_play')}
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 20px' }}>
            {[
              { icon: <GameIcon name="gamepad" size={14} />, key: 'home.tip_move' },
              { icon: <GameIcon name="target" size={14} />, key: 'home.tip_win' },
              { icon: <GameIcon name="ice" size={14} />, key: 'home.tip_ice' },
              { icon: <GameIcon name="switch" size={14} />, key: 'home.tip_toggle' },
              { icon: <GameIcon name="portal" size={14} />, key: 'home.tip_teleporter' },
              { icon: <GameIcon name="arrow-right" size={14} />, key: 'home.tip_conveyor' },
              { icon: <GameIcon name="lightning" size={14} />, key: 'home.tip_power' },
              { icon: <GameIcon name="sparkles" size={14} />, key: 'home.tip_editor' },
            ].map(({ icon, key }) => (
              <div key={key} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <span style={{ color: '#00ff8888', flexShrink: 0, width: 18, display: 'inline-flex', alignItems: 'center' }}>{icon}</span>
                <span>{t(key)}</span>
              </div>
            ))}
          </div>
          {externalLinks && (
            <p style={{ marginTop: 16, marginBottom: 0, color: '#374151', fontSize: 11 }}>
              {t('home.seo')}{' '}
              <a
                href="https://syncron.polyvoclub.com"
                style={{ color: '#00ff8844', textDecoration: 'none' }}
              >
                syncron.polyvoclub.com
              </a>
              .
            </p>
          )}

          {/* Footer links — iç sayfalar AppLink ile: portal build'inde URL değişmeden çalışır. */}
          <footer
            style={{
              marginTop: 24,
              display: 'flex',
              gap: 16,
              justifyContent: 'center',
              alignItems: 'center',
              flexWrap: 'wrap',
              borderTop: '1px solid rgba(0, 255, 136, 0.1)',
              paddingTop: 16,
            }}
          >
            {externalLinks && (
              <>
                <AppLink
                  href="/support"
                  style={{
                    color: '#00ff8888',
                    textDecoration: 'none',
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    transition: 'color 0.2s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#00ff88')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#00ff8888')}
                >
                  {isTr ? 'DESTEK' : 'SUPPORT'}
                </AppLink>
                <span style={{ color: '#1e3a5f', fontSize: 10 }}>•</span>
              </>
            )}
            <AppLink
              href="/privacy"
              style={{
                color: '#00ff8888',
                textDecoration: 'none',
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.08em',
                transition: 'color 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#00ff88')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#00ff8888')}
            >
              {isTr ? 'GİZLİLİK' : 'PRIVACY'}
            </AppLink>
            <span style={{ color: '#1e3a5f', fontSize: 10 }}>•</span>
            <AppLink
              href="/terms"
              style={{
                color: '#00ff8888',
                textDecoration: 'none',
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.08em',
                transition: 'color 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#00ff88')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#00ff8888')}
            >
              {isTr ? 'KOŞULLAR' : 'TERMS'}
            </AppLink>
            <span style={{ color: '#1e3a5f', fontSize: 10 }}>•</span>
            <AppLink
              href="/kvkk"
              style={{
                color: '#00ff8888',
                textDecoration: 'none',
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.08em',
                transition: 'color 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#00ff88')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#00ff8888')}
            >
              {isTr ? 'KVKK BEYANI' : 'KVKK'}
            </AppLink>
          </footer>
        </section>
        {isConnected && (
          <div style={{
            position: 'fixed',
            bottom: 'calc(12px + var(--ad-banner-height))',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(3, 7, 18, 0.85)',
            backdropFilter: isMobile ? 'blur(6px)' : 'blur(12px)',
            WebkitBackdropFilter: isMobile ? 'blur(6px)' : 'blur(12px)',
            border: '1px solid rgba(0, 255, 136, 0.2)',
            borderRadius: 20,
            padding: '6px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 11,
            color: '#00ff88',
            boxShadow: '0 4px 20px rgba(0, 255, 136, 0.15)',
            zIndex: 100,
            pointerEvents: 'none',
          }}>
            <GameIcon name="gamepad" size={14} />
            <span>
              {isTr ? 'D-pad / Sol Analog: Yönlendir | (A): Seç' : 'D-pad / Left Stick: Navigate | (A): Select'}
            </span>
          </div>
        )}
      </main>
    </>
  );
}
