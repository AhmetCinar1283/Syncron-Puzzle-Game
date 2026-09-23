/**
 * DOSYA AMACI: Tüm kullanıcı tercihlerinin taktiksel bir Oyun HUD çatısı altında sunulduğu
 * ortak görünüm. Hem bağımsız sayfada (`SettingsPage`) hem açılır pencerede (`SettingsModal`)
 * kullanılır. Ayarları kategorilere (sekmeler) ayırır; uzun bir liste yerine seçili sekmedeki
 * ayarları gösterir ve aktif oyun temasına (`useGameTheme`) dinamik olarak uyarlanır.
 */

'use client';

import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { useT } from '@/contexts/LanguageContext';
import { useModal } from '@/components/ui';
import { useGameTheme } from '@/game-engine/contexts/GameThemeContext';
import { soundEngine } from '@/services/audio';
import { useGamepad } from '@/hooks/useGamepad';
import { useSettings } from '../hooks/useSettings';
import { useSettingsGroups } from '../hooks/useSettingsGroups';
import { useSettingsNavigation, type FocusItem } from '../hooks/useSettingsNavigation';
import { activateRow, stepRow } from '../lib/rowActions';
import { getSettingsThemeVars, hexToRgba } from '../lib/styles';
import { BACK_FOCUS_ID, SettingsHeader } from './SettingsHeader';
import { RESET_FOCUS_ID, SettingsFooter } from './SettingsFooter';
import { SettingsNavTabs } from './SettingsNavTabs';
import { SettingsGroupCard } from './SettingsGroupCard';

export interface SettingsViewProps {
  /** Görünüm türü: 'page' (tam sayfa, üst bar dahil) veya 'modal' (açılır pencere). */
  variant?: 'page' | 'modal';
  /** 'page' modunda geri dönüldüğünde çağrılacak işlev. */
  onBack?: () => void;
  /** 'modal' modunda kapatıldığında çağrılacak işlev. */
  onClose?: () => void;
  /** Gamepad ve klavye geziniminin aktif olup olmadığı (varsayılan: true). */
  enableNavigation?: boolean;
}

export const CLOSE_FOCUS_ID = '__settings_close__';
export const TAB_FOCUS_PREFIX = 'tab:';

export function SettingsView({
  variant = 'page',
  onBack,
  onClose,
  enableNavigation = true,
}: SettingsViewProps) {
  const t = useT();
  const { resetToDefaults } = useSettings();
  const { theme, themeConfig } = useGameTheme();
  const groups = useSettingsGroups();
  const isModal = variant === 'modal';
  const modal = useModal();

  // İlk aktif sekme (varsayılan: 'general')
  const [activeTabId, setActiveTabId] = useState<string>(() => groups[0]?.id || 'general');

  // Gruplar değiştiğinde aktif sekmenin geçerli olduğunu doğrula
  const activeGroup = useMemo(() => {
    return groups.find((g) => g.id === activeTabId) || groups[0];
  }, [groups, activeTabId]);

  // Tema CSS değişkenleri
  const themeVars = useMemo(() => {
    return getSettingsThemeVars(theme, themeConfig);
  }, [theme, themeConfig]);

  const handleBackOrClose = useCallback(() => {
    soundEngine.play('modal.close');
    if (isModal) {
      if (modal) {
        modal.close();
      } else {
        onClose?.();
      }
    } else {
      onBack?.();
    }
  }, [isModal, modal, onClose, onBack]);

  const handleReset = useCallback(() => {
    if (typeof window !== 'undefined' && window.confirm(t('settings.reset_confirm'))) {
      soundEngine.play('ui.denied');
      resetToDefaults();
    }
  }, [t, resetToDefaults]);

  // Sekmeler arasında döngüsel geçiş (Q/E, Gamepad LB/RB veya sol/sağ oklar)
  const cycleTab = useCallback(
    (delta: 1 | -1) => {
      if (groups.length === 0) return;
      const currentIndex = groups.findIndex((g) => g.id === (activeGroup?.id || activeTabId));
      const nextIndex = (currentIndex + delta + groups.length) % groups.length;
      const nextTab = groups[nextIndex];
      soundEngine.play('ui.navigate');
      setActiveTabId(nextTab.id);
    },
    [groups, activeGroup, activeTabId],
  );

  // Odak sırası: [geri (yalnız sayfa)] → aktif sekme başlığı → seçili grubun satırları → sıfırla → [kapat (yalnız modal)]
  const items = useMemo<FocusItem[]>(() => {
    if (!activeGroup) return [];

    const activeTabFocusId = `${TAB_FOCUS_PREFIX}${activeGroup.id}`;

    const rowItems = activeGroup.rows.map((row): FocusItem => ({
      id: row.id,
      step: (direction) => stepRow(row, direction),
      activate: () => activateRow(row),
    }));

    return [
      ...(isModal ? [] : [{ id: BACK_FOCUS_ID, activate: handleBackOrClose }]),
      {
        id: activeTabFocusId,
        step: (direction) => cycleTab(direction > 0 ? 1 : -1),
        activate: () => cycleTab(1),
      },
      ...rowItems,
      { id: RESET_FOCUS_ID, activate: handleReset },
      ...(isModal ? [{ id: CLOSE_FOCUS_ID, activate: handleBackOrClose }] : []),
    ];
  }, [activeGroup, isModal, handleBackOrClose, handleReset, cycleTab]);

  const { focusId, setFocusId } = useSettingsNavigation({
    items,
    enabled: enableNavigation,
    onCancel: handleBackOrClose,
  });

  // Gamepad LB (4) ve RB (5) omuz tuşları ile doğrudan sekme değiştirme
  useGamepad({
    enabled: enableNavigation,
    priority: 'modal',
    onButtonPress: (buttonIndex, pressed) => {
      if (!pressed) return;
      if (buttonIndex === 4) {
        cycleTab(-1); // LB / L1: Önceki sekme
      } else if (buttonIndex === 5) {
        cycleTab(1); // RB / R1: Sonraki sekme
      }
    },
  });

  // Klavye Q ve E tuşlarıyla doğrudan sekme değiştirme kısayolu
  useEffect(() => {
    if (!enableNavigation) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Metin giriş alanındaysa kısayolu engelle
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        return;
      }

      const key = e.key.toLowerCase();
      if (key === 'q') {
        e.preventDefault();
        cycleTab(-1);
      } else if (key === 'e') {
        e.preventDefault();
        cycleTab(1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enableNavigation, cycleTab]);

  const accent = themeConfig.accentColor || '#00c4ff';

  return (
    <div
      style={{
        ...themeVars,
        width: '100%',
        maxWidth: isModal ? '100%' : 700,
        display: 'flex',
        flexDirection: 'column',
        gap: isModal ? 12 : 16,
        boxSizing: 'border-box',
        color: '#ffffff',
        fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
      }}
    >
      {/* Sayfa modunda geri dön butonu ve başlık */}
      {!isModal && (
        <SettingsHeader
          focused={focusId === BACK_FOCUS_ID}
          onFocus={setFocusId}
          onBack={handleBackOrClose}
        />
      )}

      {/* Taktiksel Oyun HUD Kategori Sekmeleri */}
      <SettingsNavTabs
        groups={groups}
        activeTabId={activeGroup?.id || activeTabId}
        onSelectTab={(tabId) => {
          setActiveTabId(tabId);
          setFocusId(`${TAB_FOCUS_PREFIX}${tabId}`);
        }}
        focusedTabId={focusId}
        onFocusTab={setFocusId}
      />

      {/* Yalnızca seçili kategorinin kartını göster */}
      {activeGroup && (
        <div
          key={activeGroup.id}
          style={{
            animation: 'settingsTabFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            width: '100%',
          }}
        >
          <SettingsGroupCard
            group={activeGroup}
            focusId={focusId}
            onFocus={setFocusId}
            compact={isModal}
          />
        </div>
      )}

      {/* Sıfırlama ve Sürüm Alt Şeridi */}
      <SettingsFooter
        focused={focusId === RESET_FOCUS_ID}
        onFocus={setFocusId}
        onReset={handleReset}
      />

      {/* Modal Kapatma Butonu */}
      {isModal && (
        <button
          type="button"
          data-focus-id={CLOSE_FOCUS_ID}
          data-active={focusId === CLOSE_FOCUS_ID}
          onClick={handleBackOrClose}
          onMouseEnter={() => setFocusId(CLOSE_FOCUS_ID)}
          className="home-sheet__close-btn"
          style={{
            marginTop: 6,
            minHeight: 44,
            borderRadius: 'var(--st-btn-radius, 10px)',
            border: focusId === CLOSE_FOCUS_ID
              ? `1.5px solid ${accent}`
              : '1.5px solid rgba(255, 255, 255, 0.12)',
            background: focusId === CLOSE_FOCUS_ID
              ? hexToRgba(accent, 0.16)
              : 'rgba(15, 23, 42, 0.65)',
            boxShadow: focusId === CLOSE_FOCUS_ID
              ? `0 0 16px ${hexToRgba(accent, 0.35)}`
              : 'none',
            color: focusId === CLOSE_FOCUS_ID ? '#ffffff' : '#94a3b8',
            transform: focusId === CLOSE_FOCUS_ID ? 'scale(1.01)' : 'scale(1)',
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 800,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            transition: 'all 0.18s ease',
            outline: 'none',
          }}
        >
          {t('common.close')}
        </button>
      )}

      {/* Yumuşak sekme geçiş animasyonu */}
      <style jsx global>{`
        @keyframes settingsTabFadeIn {
          from {
            opacity: 0;
            transform: translateY(4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
