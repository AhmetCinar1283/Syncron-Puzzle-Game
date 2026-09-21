/**
 * DOSYA AMACI: Tüm kullanıcı tercihlerinin tek çatı altında sunulduğu ortak
 * görünüm. Hem bağımsız sayfada (`SettingsPage`) hem açılır pencerede
 * (`SettingsModal`) kullanılır; ikisi de aynı grup kaydından (`useSettingsGroups`)
 * beslenir. Bu dosya yalnızca gruplar, gezinme ve kabuk parçalarını birleştirir.
 */

'use client';

import React, { useCallback, useMemo } from 'react';
import { useT } from '@/contexts/LanguageContext';
import { useSettings } from '../hooks/useSettings';
import { useSettingsGroups } from '../hooks/useSettingsGroups';
import { useSettingsNavigation, type FocusItem } from '../hooks/useSettingsNavigation';
import { activateRow, stepRow } from '../lib/rowActions';
import { BACK_FOCUS_ID, SettingsHeader } from './SettingsHeader';
import { RESET_FOCUS_ID, SettingsFooter } from './SettingsFooter';
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

export function SettingsView({
  variant = 'page',
  onBack,
  onClose,
  enableNavigation = true,
}: SettingsViewProps) {
  const t = useT();
  const { resetToDefaults } = useSettings();
  const groups = useSettingsGroups();
  const isModal = variant === 'modal';

  const handleBackOrClose = useCallback(() => {
    (isModal ? onClose : onBack)?.();
  }, [isModal, onClose, onBack]);

  const handleReset = useCallback(() => {
    if (typeof window !== 'undefined' && window.confirm(t('settings.reset_confirm'))) {
      resetToDefaults();
    }
  }, [t, resetToDefaults]);

  // Odak sırası: [geri (yalnız sayfa)] → tüm grupların satırları → sıfırla
  const items = useMemo<FocusItem[]>(() => {
    const rowItems = groups.flatMap((g) =>
      g.rows.map((row): FocusItem => ({
        id: row.id,
        step: (direction) => stepRow(row, direction),
        activate: () => activateRow(row),
      })),
    );
    return [
      ...(isModal ? [] : [{ id: BACK_FOCUS_ID, activate: handleBackOrClose }]),
      ...rowItems,
      { id: RESET_FOCUS_ID, activate: handleReset },
    ];
  }, [groups, isModal, handleBackOrClose, handleReset]);

  const { focusId, setFocusId } = useSettingsNavigation({
    items,
    enabled: enableNavigation,
    onCancel: handleBackOrClose,
  });

  return (
    <div
      style={{
        width: '100%',
        maxWidth: isModal ? '100%' : 720,
        display: 'flex',
        flexDirection: 'column',
        gap: isModal ? 14 : 16,
        boxSizing: 'border-box',
      }}
    >
      {!isModal && (
        <SettingsHeader focused={focusId === BACK_FOCUS_ID} onFocus={setFocusId} onBack={handleBackOrClose} />
      )}

      {groups.map((group) => (
        <SettingsGroupCard key={group.id} group={group} focusId={focusId} onFocus={setFocusId} compact={isModal} />
      ))}

      <SettingsFooter focused={focusId === RESET_FOCUS_ID} onFocus={setFocusId} onReset={handleReset} />
    </div>
  );
}
