/**
 * DOSYA AMACI: Kullanıcı tercihlerini ekran üstünde bir pencere (modal) olarak
 * açıp kapatmayı sağlayan kabuk bileşendir. Ortak `Modal` bileşeni üzerinden
 * mobilde alttan gelen çekmece, masaüstünde ortalanmış panel ve ses döngüsüyle
 * `SettingsView`'ı modal varyantında (`variant="modal"`) render eder.
 */

'use client';

import React from 'react';
import { Settings as SettingsIcon } from 'lucide-react';
import { useT } from '@/contexts/LanguageContext';
import { Modal } from '@/components/ui';
import { useGameTheme } from '@/game-engine/contexts/GameThemeContext';
import { useSettings } from '../hooks/useSettings';
import { SettingsView } from './SettingsView';

interface SettingsModalProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function SettingsModal({ isOpen: propIsOpen, onClose: propOnClose }: SettingsModalProps = {}) {
  const t = useT();
  const { themeConfig } = useGameTheme();
  const { isSettingsOpen: contextIsOpen, closeSettings: contextCloseSettings } = useSettings();

  const isOpen = propIsOpen !== undefined ? propIsOpen : contextIsOpen;
  const handleClose = propOnClose !== undefined ? propOnClose : contextCloseSettings;

  const accent = themeConfig?.accentColor || '#00c4ff';

  return (
    <Modal
      open={isOpen}
      onClose={handleClose}
      title={t('settings.title')}
      icon={<SettingsIcon size={20} color={accent} />}
      accentColor={accent}
      hideCloseIcon={true}
      showCloseButton={false}
      maxWidth={580}
      maxHeight="90dvh"
    >
      <div style={{ padding: '2px 0' }}>
        <SettingsView
          variant="modal"
          onClose={handleClose}
          enableNavigation={isOpen}
        />
      </div>
    </Modal>
  );
}
