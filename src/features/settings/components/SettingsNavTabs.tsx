/**
 * DOSYA AMACI: Ayarlar ekranının kategorilerini (Genel, Ses, Kontroller, Görsellik)
 * taktiksel bir Oyun HUD sekme çubuğu olarak sunar. Hem tam sayfada hem modalda
 * hem de dar mobil ekranlarda duyarlı (responsive) çalışır.
 */

'use client';

import React from 'react';
import { useT } from '@/contexts/LanguageContext';
import { soundEngine } from '@/services/audio';
import type { SettingsGroup } from '../lib/settingsModel';

interface Props {
  groups: SettingsGroup[];
  activeTabId: string;
  onSelectTab: (tabId: string) => void;
  focusedTabId?: string | null;
  onFocusTab?: (tabId: string) => void;
}

export function SettingsNavTabs({
  groups,
  activeTabId,
  onSelectTab,
  focusedTabId,
  onFocusTab,
}: Props) {
  const t = useT();

  const handleTabClick = (groupId: string) => {
    if (groupId !== activeTabId) {
      soundEngine.play('ui.navigate');
      onSelectTab(groupId);
    }
  };

  return (
    <nav
      role="tablist"
      aria-label={t('settings.title')}
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
        gap: 8,
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      {groups.map((group) => {
        const isActive = group.id === activeTabId;
        const isFocused = focusedTabId === `tab:${group.id}`;
        const Icon = group.icon;
        const tabLabel = t(`settings.tab_${group.id}`) || group.title;

        return (
          <button
            key={group.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-controls={`settings-group-${group.id}`}
            data-focus-id={`tab:${group.id}`}
            onClick={() => handleTabClick(group.id)}
            onMouseEnter={() => onFocusTab?.(`tab:${group.id}`)}
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '10px 12px',
              minHeight: 44,
              borderRadius: 'var(--st-btn-radius, 10px)',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              outline: 'none',
              transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
              boxSizing: 'border-box',
              border: isActive
                ? '1.5px solid var(--st-accent, #00ff88)'
                : isFocused
                  ? '1.5px solid rgba(255, 255, 255, 0.3)'
                  : '1px solid rgba(255, 255, 255, 0.09)',
              background: isActive
                ? 'linear-gradient(180deg, var(--st-accent-soft, rgba(0, 255, 136, 0.15)) 0%, rgba(15, 23, 42, 0.85) 100%)'
                : isFocused
                  ? 'rgba(255, 255, 255, 0.06)'
                  : 'rgba(15, 23, 42, 0.55)',
              color: isActive ? '#ffffff' : isFocused ? '#e2e8f0' : '#94a3b8',
              boxShadow: isActive
                ? '0 0 16px var(--st-accent-glow, rgba(0, 255, 136, 0.25)), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
                : 'none',
              transform: isFocused || isActive ? 'translateY(-1px)' : 'none',
            }}
          >
            <Icon
              size={15}
              color={isActive ? 'var(--st-accent, #00ff88)' : '#94a3b8'}
              style={{
                flexShrink: 0,
                filter: isActive ? 'drop-shadow(0 0 6px var(--st-accent-glow, rgba(0, 255, 136, 0.5)))' : 'none',
                transition: 'all 0.18s ease',
              }}
            />
            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {tabLabel}
            </span>

            {/* Aktif sekme parlak alt indikatör çizgisi */}
            {isActive && (
              <span
                style={{
                  position: 'absolute',
                  bottom: -1,
                  left: '20%',
                  right: '20%',
                  height: 2,
                  background: 'var(--st-accent, #00ff88)',
                  boxShadow: '0 0 8px var(--st-accent, #00ff88)',
                  borderRadius: 2,
                }}
              />
            )}
          </button>
        );
      })}
    </nav>
  );
}
