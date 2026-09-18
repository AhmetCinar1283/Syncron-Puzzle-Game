'use client';

import { useEffect, useRef, useState } from 'react';
import { NBtn } from './EditorUI';
import { useEditorContext } from '../EditorContext';
import { useT } from '@/contexts/LanguageContext';
import type { EditorMobileTab } from '../hooks/useEditorLayout';
import { useGameTheme } from '@/game-engine/contexts/GameThemeContext';
import { ThemeSelectorModal } from '@/game-engine/components/play-screen/ThemeSelectorModal';
import { GameIcon } from '@/components/icons';
import type { IconName } from '@/components/icons/types';
import { useEditorBackTarget } from '../hooks/useEditorBackTarget';

interface MenuItem {
  key: string;
  label: string;
  icon: IconName;
  color: string;
  onClick: () => void;
}

/** Üst çubuğa sığmayan ikincil işlemleri barındıran açılır menü. */
function OverflowMenu({ items }: { items: MenuItem[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (items.length === 0) return null;

  return (
    <div ref={ref} style={{ position: 'relative', flexShrink: 0 }}>
      <NBtn
        onClick={() => setOpen((v) => !v)}
        active={open}
        color="#94a3b8"
        style={{ padding: '7px 10px', display: 'inline-flex', alignItems: 'center', minHeight: 34 }}
      >
        <GameIcon name="menu" size={15} />
      </NBtn>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 70,
          minWidth: 210, padding: 6,
          background: 'rgba(6,13,26,0.99)',
          border: '1px solid rgba(30,58,95,0.7)',
          borderRadius: 10,
          boxShadow: '0 12px 30px rgba(0,0,0,0.75)',
          display: 'flex', flexDirection: 'column', gap: 2,
        }}>
          {items.map((item) => (
            <button
              key={item.key}
              onClick={() => { setOpen(false); item.onClick(); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 9,
                padding: '9px 10px', minHeight: 38,
                background: 'transparent', border: 'none', borderRadius: 7,
                color: item.color, fontSize: 12, fontWeight: 600,
                textAlign: 'left', cursor: 'pointer', width: '100%',
              }}
            >
              <GameIcon name={item.icon} size={14} color={item.color} />
              <span style={{ color: '#cbd5e1' }}>{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface EditorTopBarProps {
  editId: number | null;
  isCompact: boolean;
  showTitle: boolean;
  onDailyPuzzle?: () => void;
}

/**
 * Üst çubuk. Birincil işlemler (geri, Test Et, Kaydet) her ekran boyutunda
 * görünür kalır; kalan işlemler dar ekranlarda taşma menüsüne iner. Böylece
 * mobilde sekme değiştirmeden test etmek ve kaydetmek mümkün olur.
 */
export function EditorTopBar({ editId, isCompact, showTitle, onDailyPuzzle }: EditorTopBarProps) {
  const t = useT();
  const s = useEditorContext();
  const { themeConfig } = useGameTheme();
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
  const back = useEditorBackTarget();

  const canSubmit = !s.isAnonymous && !s.isModerator;

  // Dar ekranda taşma menüsüne inen ikincil işlemler.
  const overflowItems: MenuItem[] = [];
  const pushIf = (cond: boolean, item: MenuItem) => { if (cond) overflowItems.push(item); };

  pushIf(isCompact, {
    key: 'levels', label: t('editor.saved_levels'), icon: 'folder', color: '#00c4ff',
    onClick: () => s.setLevelsDialogOpen(true),
  });
  pushIf(isCompact, {
    key: 'theme', label: t(themeConfig.nameKey) || themeConfig.defaultName, icon: 'palette', color: themeConfig.accentColor,
    onClick: () => setIsThemeModalOpen(true),
  });
  pushIf(!!onDailyPuzzle, {
    key: 'daily', label: t('daily_admin.editor_button'), icon: 'star', color: '#ffd700',
    onClick: () => onDailyPuzzle?.(),
  });
  pushIf(isCompact && canSubmit, {
    key: 'submit', label: editId !== null ? t('editor.update_submit') : t('editor.save_submit'), icon: 'check', color: '#00ff88',
    onClick: s.handleSaveAndSubmit,
  });
  pushIf(true, {
    key: 'generate', label: 'Generate Level', icon: 'lightning', color: '#00c4ff',
    onClick: () => s.setGeneratorDialogOpen(true),
  });
  pushIf(true, {
    key: 'ai', label: 'AI Assistant', icon: 'robot', color: '#a78bfa',
    onClick: () => s.setAiAssistantDialogOpen(true),
  });

  return (
    <div style={{
      flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8,
      padding: isCompact ? '7px 10px' : '8px 18px',
      background: 'rgba(3,7,18,0.97)', borderBottom: '1px solid rgba(0,196,255,0.15)',
      minHeight: 48,
    }}>
      {/* Geri: gelinen sayfanın adıyla */}
      <button
        onClick={back.goBack}
        title={back.label}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: 'none', border: 'none', color: '#64748b',
          fontSize: 12, cursor: 'pointer', letterSpacing: '0.04em',
          padding: '8px 6px', minHeight: 36, flexShrink: 0, maxWidth: 160,
        }}
      >
        <GameIcon name="arrow-left" size={14} color="#64748b" />
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{back.label}</span>
      </button>

      {showTitle ? (
        <h1 style={{
          margin: 0, flex: 1, textAlign: 'center', minWidth: 0,
          fontSize: 13, fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase',
          color: '#00c4ff', textShadow: '0 0 10px rgba(0,196,255,0.5)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {t('editor.title')} {editId !== null ? <span style={{ color: '#1e3a5f', fontWeight: 400 }}>{t('editor.editing', { id: editId })}</span> : t('editor.new')}
        </h1>
      ) : (
        <div style={{ flex: 1, minWidth: 0 }} />
      )}

      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
        {!isCompact && (
          <>
            <NBtn
              onClick={() => setIsThemeModalOpen(true)}
              color={themeConfig.accentColor}
              style={{ padding: '7px 12px', minHeight: 34, display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <GameIcon name="palette" size={13} />
              <GameIcon name={themeConfig.icon as IconName} size={13} />
              {t(themeConfig.nameKey) || themeConfig.defaultName}
            </NBtn>
            <NBtn onClick={() => s.setLevelsDialogOpen(true)} color="#00c4ff" active style={{ padding: '7px 14px', minHeight: 34, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <GameIcon name="folder" size={13} /> {t('editor.saved_levels')}
            </NBtn>
          </>
        )}

        {/* Test Et: her ekran boyutunda erişilebilir birincil işlem */}
        <NBtn
          onClick={s.handleTest}
          color="#00ff88"
          active
          style={{ padding: isCompact ? '7px 11px' : '7px 16px', minHeight: 34, display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          <GameIcon name="gamepad" size={14} />
          {!isCompact && t('editor.test_level')}
        </NBtn>

        <NBtn
          onClick={s.handleSaveClick}
          color={canSubmit ? '#a78bfa' : '#00ff88'}
          active
          style={{ padding: isCompact ? '7px 11px' : '7px 16px', minHeight: 34, display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          <GameIcon name="save" size={14} />
          {!isCompact && (s.saveSuccess || (editId !== null ? t('editor.update') : t('editor.save')))}
        </NBtn>

        {!isCompact && canSubmit && (
          <NBtn onClick={s.handleSaveAndSubmit} color="#00ff88" style={{ padding: '7px 13px', minHeight: 34 }}>
            {editId !== null ? t('editor.update_submit') : t('editor.save_submit')}
          </NBtn>
        )}

        <OverflowMenu items={overflowItems} />
      </div>

      {isThemeModalOpen && <ThemeSelectorModal onClose={() => setIsThemeModalOpen(false)} />}
    </div>
  );
}

const TAB_META: Record<EditorMobileTab, { icon: IconName; key: string }> = {
  grid: { icon: 'grid', key: 'editor.tab_grid' },
  settings: { icon: 'settings', key: 'editor.tab_settings' },
};

export function EditorMobileTabs({ tabs, activeTab, setActiveTab }: {
  tabs: readonly EditorMobileTab[];
  activeTab: EditorMobileTab;
  setActiveTab: (tab: EditorMobileTab) => void;
}) {
  const t = useT();
  return (
    <div style={{ flexShrink: 0, display: 'flex', borderBottom: '1px solid rgba(30,58,95,0.4)', background: 'rgba(3,7,18,0.97)' }}>
      {tabs.map((tab) => {
        const active = activeTab === tab;
        const meta = TAB_META[tab];
        return (
          <button
            key={tab} onClick={() => setActiveTab(tab)}
            style={{
              flex: 1, padding: '11px 4px', minHeight: 44,
              fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
              background: active ? 'rgba(0,196,255,0.06)' : 'none', border: 'none',
              borderBottom: `2px solid ${active ? '#00c4ff' : 'transparent'}`,
              color: active ? '#00c4ff' : '#475569', cursor: 'pointer', transition: 'all 0.15s',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            <GameIcon name={meta.icon} size={13} color={active ? '#00c4ff' : '#475569'} />
            {t(meta.key)}
          </button>
        );
      })}
    </div>
  );
}
