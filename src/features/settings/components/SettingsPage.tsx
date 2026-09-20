/**
 * DOSYA AMACI: Kullanıcı tercihlerinin (ses açma/kapama, ses seviyesi, dil ve tema)
 * yönetildiği müstakil ayarlar sayfasıdır. Fare, dokunmatik, klavye ve gamepad
 * girdi modalitelerinin tümünü eksiksiz destekler.
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAppRouter } from '@/lib/navigation';
import { useT } from '@/contexts/LanguageContext';
import { useGamepad } from '@/hooks/useGamepad';
import { useSettings } from '../hooks/useSettings';
import { ALL_THEMES, type GameTheme } from '@/game-engine/themes/themeConfig';
import { LANGS, type Lang } from '@/lib/i18n';
import { Volume2, VolumeX, RotateCcw, ArrowLeft, Settings as SettingsIcon } from 'lucide-react';
import { GameIcon } from '@/components/icons';

const TOTAL_FOCUS_ITEMS = 6;
// 0: Geri Butonu
// 1: Ses Aç/Kapa
// 2: Ses Seviyesi Slider
// 3: Dil Seçimi
// 4: Tema Seçimi
// 5: Varsayılanlara Sıfırla

export function SettingsPage() {
  const t = useT();
  const router = useAppRouter();
  const {
    settings,
    setLanguage,
    setTheme,
    setSoundMuted,
    toggleSoundMute,
    setSoundVolume,
    resetToDefaults,
  } = useSettings();

  const [focusIndex, setFocusIndex] = useState<number>(1);
  const [isGamepadActive, setIsGamepadActive] = useState<boolean>(false);

  const { muted, volume } = settings.sound;
  const activeLang = settings.language;
  const activeTheme = settings.theme;

  const handleBack = useCallback(() => {
    router.push('/');
  }, [router]);

  const handleReset = useCallback(() => {
    if (typeof window !== 'undefined' && window.confirm(t('settings.reset_confirm'))) {
      resetToDefaults();
    }
  }, [t, resetToDefaults]);

  // Gamepad / Klavye Sol-Sağ eylemleri
  const handleStepLeft = useCallback(() => {
    if (focusIndex === 2) {
      setSoundVolume(Math.max(0, volume - 5));
    } else if (focusIndex === 3) {
      const curIdx = LANGS.findIndex((l) => l.code === activeLang);
      const prevIdx = curIdx > 0 ? curIdx - 1 : LANGS.length - 1;
      setLanguage(LANGS[prevIdx].code as Lang);
    } else if (focusIndex === 4) {
      const curIdx = ALL_THEMES.findIndex((th) => th.id === activeTheme);
      const prevIdx = curIdx > 0 ? curIdx - 1 : ALL_THEMES.length - 1;
      setTheme(ALL_THEMES[prevIdx].id as GameTheme);
    }
  }, [focusIndex, volume, setSoundVolume, activeLang, setLanguage, activeTheme, setTheme]);

  const handleStepRight = useCallback(() => {
    if (focusIndex === 2) {
      setSoundVolume(Math.min(100, volume + 5));
      if (muted) setSoundMuted(false);
    } else if (focusIndex === 3) {
      const curIdx = LANGS.findIndex((l) => l.code === activeLang);
      const nextIdx = (curIdx + 1) % LANGS.length;
      setLanguage(LANGS[nextIdx].code as Lang);
    } else if (focusIndex === 4) {
      const curIdx = ALL_THEMES.findIndex((th) => th.id === activeTheme);
      const nextIdx = (curIdx + 1) % ALL_THEMES.length;
      setTheme(ALL_THEMES[nextIdx].id as GameTheme);
    }
  }, [focusIndex, volume, muted, setSoundVolume, setSoundMuted, activeLang, setLanguage, activeTheme, setTheme]);

  const handleConfirm = useCallback(() => {
    if (focusIndex === 0) {
      handleBack();
    } else if (focusIndex === 1) {
      toggleSoundMute();
    } else if (focusIndex === 2) {
      toggleSoundMute();
    } else if (focusIndex === 3) {
      handleStepRight();
    } else if (focusIndex === 4) {
      handleStepRight();
    } else if (focusIndex === 5) {
      handleReset();
    }
  }, [focusIndex, handleBack, toggleSoundMute, handleStepRight, handleReset]);

  // Gamepad desteği
  useGamepad({
    enabled: true,
    onMove: (dir) => {
      setIsGamepadActive(true);
      if (dir === 'up') {
        setFocusIndex((prev) => (prev > 0 ? prev - 1 : TOTAL_FOCUS_ITEMS - 1));
      } else if (dir === 'down') {
        setFocusIndex((prev) => (prev < TOTAL_FOCUS_ITEMS - 1 ? prev + 1 : 0));
      } else if (dir === 'left') {
        handleStepLeft();
      } else if (dir === 'right') {
        handleStepRight();
      }
    },
    onConfirm: () => {
      setIsGamepadActive(true);
      handleConfirm();
    },
    onCancel: () => {
      handleBack();
    },
  });

  // Klavye desteği
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        setIsGamepadActive(false);
        setFocusIndex((prev) => (prev > 0 ? prev - 1 : TOTAL_FOCUS_ITEMS - 1));
      } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        e.preventDefault();
        setIsGamepadActive(false);
        setFocusIndex((prev) => (prev < TOTAL_FOCUS_ITEMS - 1 ? prev + 1 : 0));
      } else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        handleStepLeft();
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        handleStepRight();
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleConfirm();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleBack();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleStepLeft, handleStepRight, handleConfirm, handleBack]);

  const getFocusStyle = (idx: number): React.CSSProperties => {
    const active = focusIndex === idx;
    if (!active) return {};
    return {
      borderColor: '#00ff88',
      boxShadow: '0 0 18px rgba(0, 255, 136, 0.35)',
    };
  };

  return (
    <>
      <title>{`${t('settings.title')} | Syncron`}</title>
      <meta name="description" content="Syncron game settings and preferences." />

      <main
        style={{
          position: 'relative',
          zIndex: 1,
          minHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          background: 'transparent',
          padding: '32px 16px 64px 16px',
          boxSizing: 'border-box',
          color: '#ffffff',
          fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
          overflowY: 'auto',
        }}
      >
        <div style={{ width: '100%', maxWidth: 720, display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Top Bar: Geri Dön Butonu ve Başlık */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <button
              type="button"
              onClick={handleBack}
              onMouseEnter={() => setFocusIndex(0)}
              style={{
                background: focusIndex === 0 ? 'rgba(0, 255, 136, 0.15)' : 'rgba(0, 255, 136, 0.05)',
                border: focusIndex === 0 ? '1px solid #00ff88' : '1px solid rgba(0, 255, 136, 0.25)',
                color: '#00ff88',
                padding: '8px 16px',
                borderRadius: 8,
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                boxShadow: focusIndex === 0 ? '0 0 16px rgba(0, 255, 136, 0.3)' : '0 0 10px rgba(0, 255, 136, 0.06)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                transition: 'all 0.2s ease',
                outline: 'none',
              }}
            >
              <ArrowLeft size={14} />
              <span>{t('common.back_menu') || 'Geri'}</span>
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <SettingsIcon size={18} color="#00ff88" />
              <h1
                style={{
                  margin: 0,
                  fontSize: 16,
                  fontWeight: 800,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: '#00ff88',
                  textShadow: '0 0 10px rgba(0, 255, 136, 0.4)',
                }}
              >
                {t('settings.title')}
              </h1>
            </div>
          </div>

          <p style={{ margin: '0 0 8px 0', fontSize: 13, color: '#94a3b8', lineHeight: 1.4 }}>
            {t('settings.subtitle')}
          </p>

          {/* 1. SES BÖLÜMÜ */}
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: 14,
              padding: '20px 22px',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              transition: 'all 0.2s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {muted ? <VolumeX size={20} color="#64748b" /> : <Volume2 size={20} color="#00ff88" />}
                <div>
                  <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#f1f5f9', letterSpacing: '0.03em' }}>
                    {t('settings.sound_title')}
                  </h2>
                  <p style={{ margin: 0, fontSize: 11, color: '#64748b' }}>{t('settings.sound_desc')}</p>
                </div>
              </div>

              {/* Ses Aç/Kapa Butonu (Focus 1) */}
              <button
                type="button"
                onClick={toggleSoundMute}
                onMouseEnter={() => setFocusIndex(1)}
                style={{
                  padding: '7px 16px',
                  fontSize: 12,
                  fontWeight: 700,
                  borderRadius: 8,
                  border: muted ? '1px solid #374151' : '1px solid rgba(0, 255, 136, 0.4)',
                  background: muted ? 'rgba(55, 65, 81, 0.25)' : 'rgba(0, 255, 136, 0.12)',
                  color: muted ? '#9ca3af' : '#00ff88',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  outline: 'none',
                  ...getFocusStyle(1),
                }}
              >
                {muted ? t('settings.sound_muted') : t('settings.sound_active')}
              </button>
            </div>

            {/* Ses Seviyesi Slider'ı (Focus 2) */}
            <div
              onMouseEnter={() => setFocusIndex(2)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                padding: '12px 14px',
                borderRadius: 10,
                border: focusIndex === 2 ? '1px solid #00ff88' : '1px solid transparent',
                background: focusIndex === 2 ? 'rgba(0, 255, 136, 0.04)' : 'transparent',
                transition: 'all 0.2s ease',
                opacity: muted ? 0.4 : 1,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label htmlFor="settings-page-volume" style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>
                  {t('settings.sound_volume')} {focusIndex === 2 && ' (← / →)'}
                </label>
                <span style={{ fontSize: 13, fontWeight: 800, color: muted ? '#64748b' : '#00c4ff' }}>
                  %{muted ? 0 : volume}
                </span>
              </div>

              <input
                id="settings-page-volume"
                type="range"
                min={0}
                max={100}
                step={1}
                value={muted ? 0 : volume}
                disabled={muted}
                onChange={(e) => {
                  const newVol = Number(e.target.value);
                  setSoundVolume(newVol);
                  if (muted && newVol > 0) setSoundMuted(false);
                }}
                style={{
                  width: '100%',
                  height: 8,
                  borderRadius: 4,
                  appearance: 'none',
                  outline: 'none',
                  background: `linear-gradient(to right, #00c4ff 0%, #00ff88 ${muted ? 0 : volume}%, #1e293b ${muted ? 0 : volume}%, #1e293b 100%)`,
                  cursor: muted ? 'not-allowed' : 'pointer',
                }}
              />
            </div>
          </div>

          {/* 2. DİL BÖLÜMÜ (Focus 3) */}
          <div
            onMouseEnter={() => setFocusIndex(3)}
            style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: focusIndex === 3 ? '1px solid #00ff88' : '1px solid rgba(255, 255, 255, 0.08)',
              boxShadow: focusIndex === 3 ? '0 0 16px rgba(0, 255, 136, 0.2)' : 'none',
              borderRadius: 14,
              padding: '20px 22px',
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
              transition: 'all 0.2s ease',
            }}
          >
            <div>
              <h2 style={{ margin: '0 0 4px 0', fontSize: 14, fontWeight: 700, color: '#f1f5f9', letterSpacing: '0.03em' }}>
                {t('settings.language_title')}
              </h2>
              <p style={{ margin: 0, fontSize: 11, color: '#64748b' }}>{t('settings.language_desc')}</p>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              {LANGS.map(({ code, label }) => {
                const isSelected = activeLang === code;
                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => {
                      setLanguage(code as Lang);
                      setFocusIndex(3);
                    }}
                    style={{
                      flex: 1,
                      padding: '12px 18px',
                      fontSize: 13,
                      fontWeight: 700,
                      borderRadius: 10,
                      border: isSelected
                        ? '1.5px solid #00ff88'
                        : '1px solid rgba(255, 255, 255, 0.1)',
                      background: isSelected
                        ? 'rgba(0, 255, 136, 0.14)'
                        : 'rgba(15, 23, 42, 0.5)',
                      color: isSelected ? '#00ff88' : '#94a3b8',
                      boxShadow: isSelected ? '0 0 14px rgba(0, 255, 136, 0.25)' : 'none',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      outline: 'none',
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. TEMA BÖLÜMÜ (Focus 4) */}
          <div
            onMouseEnter={() => setFocusIndex(4)}
            style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: focusIndex === 4 ? '1px solid #00ff88' : '1px solid rgba(255, 255, 255, 0.08)',
              boxShadow: focusIndex === 4 ? '0 0 16px rgba(0, 255, 136, 0.2)' : 'none',
              borderRadius: 14,
              padding: '20px 22px',
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
              transition: 'all 0.2s ease',
            }}
          >
            <div>
              <h2 style={{ margin: '0 0 4px 0', fontSize: 14, fontWeight: 700, color: '#f1f5f9', letterSpacing: '0.03em' }}>
                {t('settings.theme_title')}
              </h2>
              <p style={{ margin: 0, fontSize: 11, color: '#64748b' }}>{t('settings.theme_desc')}</p>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                gap: 12,
              }}
            >
              {ALL_THEMES.map((themeDef) => {
                const isSelected = activeTheme === themeDef.id;
                const localizedName = t(themeDef.nameKey) || themeDef.defaultName;

                return (
                  <button
                    key={themeDef.id}
                    type="button"
                    onClick={() => {
                      setTheme(themeDef.id as GameTheme);
                      setFocusIndex(4);
                    }}
                    style={{
                      padding: '12px 14px',
                      borderRadius: 10,
                      border: isSelected
                        ? `2px solid ${themeDef.accentColor}`
                        : '1px solid rgba(255, 255, 255, 0.08)',
                      background: isSelected
                        ? `linear-gradient(135deg, ${themeDef.bgDark} 0%, rgba(20, 30, 50, 0.9) 100%)`
                        : 'rgba(15, 23, 42, 0.55)',
                      boxShadow: isSelected ? `0 0 14px ${themeDef.accentGlow}` : 'none',
                      cursor: 'pointer',
                      textAlign: 'left',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                      transition: 'all 0.15s ease',
                      outline: 'none',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color: isSelected ? themeDef.accentColor : '#e2e8f0',
                        }}
                      >
                        {localizedName}
                      </span>
                      <div
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: '50%',
                          background: themeDef.accentColor,
                          boxShadow: `0 0 6px ${themeDef.accentColor}`,
                        }}
                      />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: 0.85 }}>
                      <GameIcon name={themeDef.icon as any} size={14} color={isSelected ? themeDef.accentColor : '#94a3b8'} />
                      <span style={{ fontSize: 10, color: '#64748b' }}>{themeDef.id}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. SIFIRLAMA BÖLÜMÜ (Focus 5) */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10 }}>
            <button
              type="button"
              onClick={handleReset}
              onMouseEnter={() => setFocusIndex(5)}
              style={{
                background: focusIndex === 5 ? 'rgba(239, 68, 68, 0.18)' : 'rgba(239, 68, 68, 0.08)',
                border: focusIndex === 5 ? '1px solid #ef4444' : '1px solid rgba(239, 68, 68, 0.3)',
                color: '#ef4444',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '9px 16px',
                borderRadius: 8,
                transition: 'all 0.15s ease',
                outline: 'none',
                boxShadow: focusIndex === 5 ? '0 0 14px rgba(239, 68, 68, 0.3)' : 'none',
              }}
            >
              <RotateCcw size={14} />
              <span>{t('settings.reset_defaults')}</span>
            </button>

            <span style={{ fontSize: 12, color: '#475569' }}>Syncron v0.3</span>
          </div>
        </div>
      </main>
    </>
  );
}
