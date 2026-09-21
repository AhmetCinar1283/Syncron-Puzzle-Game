/**
 * DOSYA AMACI: Kullanıcı tercihlerini ekran üstünde bir pencere (modal) olarak
 * açıp kapatmayı sağlayan kabuk bileşendir. İçeriğinde ortak `SettingsView` bileşenini
 * modal varyantında (`variant="modal"`) render eder.
 */

'use client';

import React, { useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { Settings as SettingsIcon, X } from 'lucide-react';
import { useT } from '@/contexts/LanguageContext';
import { useModalSound } from '@/services/audio';
import { useSettings } from '../hooks/useSettings';
import { SettingsView } from './SettingsView';

interface SettingsModalProps {
  isOpen?: boolean;
  onClose?: () => void;
}

const emptySubscribe = () => () => {};

export function SettingsModal({ isOpen: propIsOpen, onClose: propOnClose }: SettingsModalProps = {}) {
  const t = useT();
  const { isSettingsOpen: contextIsOpen, closeSettings: contextCloseSettings } = useSettings();
  const isClient = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const isOpen = propIsOpen !== undefined ? propIsOpen : contextIsOpen;
  const handleClose = propOnClose !== undefined ? propOnClose : contextCloseSettings;
  useModalSound(isOpen);

  if (!isClient || !isOpen || typeof document === 'undefined') {
    return null;
  }

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
            flexShrink: 0,
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

        {/* Content Body: Ortak Responsive SettingsView */}
        <div
          style={{
            padding: '18px 20px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <SettingsView
            variant="modal"
            onClose={handleClose}
            enableNavigation={isOpen}
          />
        </div>
      </div>
    </div>,
    document.body
  );
}
