/**
 * DOSYA AMACI: Kullanıcının tüm tercihlerini (dil, tema, ses açma/kapama ve ses seviyesi)
 * tek bir şık pencerede değiştirmesini sağlayan global ayarlar modal bileşenidir.
 */

'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Settings as SettingsIcon, X, RotateCcw } from 'lucide-react';
import { useT } from '@/contexts/LanguageContext';
import { useSettings } from '../hooks/useSettings';
import { SoundSection } from './SoundSection';
import { LanguageSection } from './LanguageSection';
import { ThemeSection } from './ThemeSection';
import { RendererSection } from './RendererSection';

interface SettingsModalProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function SettingsModal({ isOpen: propIsOpen, onClose: propOnClose }: SettingsModalProps = {}) {
  const t = useT();
  const { isSettingsOpen: contextIsOpen, closeSettings: contextCloseSettings, resetToDefaults } = useSettings();
  const [mounted, setMounted] = useState(false);

  const isOpen = propIsOpen !== undefined ? propIsOpen : contextIsOpen;
  const handleClose = propOnClose !== undefined ? propOnClose : contextCloseSettings;

  useEffect(() => {
    setMounted(true);
  }, []);

  // ESC tuşu ile modalı kapatma
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleClose]);

  if (!mounted || !isOpen || typeof document === 'undefined') {
    return null;
  }

  const handleReset = () => {
    if (window.confirm(t('settings.reset_confirm'))) {
      resetToDefaults();
    }
  };

  return createPortal(
    <div
      onClick={handleClose}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(2, 6, 18, 0.85)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        boxSizing: 'border-box',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'rgba(8, 14, 26, 0.98)',
          border: '1.5px solid rgba(0, 255, 136, 0.3)',
          borderRadius: 16,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.9), 0 0 30px rgba(0, 255, 136, 0.15)',
          width: '100%',
          maxWidth: 520,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <SettingsIcon size={20} color="#00ff88" />
            <h2
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
            </h2>
          </div>

          <button
            type="button"
            onClick={handleClose}
            title={t('common.close') || 'Kapat'}
            aria-label={t('common.close') || 'Kapat'}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: 6,
              borderRadius: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div
          style={{
            padding: '18px 20px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          {/* 1. Ses Ayarları */}
          <SoundSection />

          {/* 2. Dil Ayarları */}
          <LanguageSection />

          {/* 3. Tema Ayarları */}
          <ThemeSection />

          {/* 4. Tahta Çizimi */}
          <RendererSection />
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '12px 20px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(0, 0, 0, 0.2)',
          }}
        >
          <button
            type="button"
            onClick={handleReset}
            style={{
              background: 'none',
              border: 'none',
              color: '#ef4444',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 8px',
              borderRadius: 6,
              transition: 'opacity 0.15s ease',
            }}
          >
            <RotateCcw size={13} />
            <span>{t('settings.reset_defaults')}</span>
          </button>

          <span style={{ fontSize: 11, color: '#475569' }}>
            Syncron v0.3
          </span>
        </div>
      </div>
    </div>,
    document.body
  );
}
