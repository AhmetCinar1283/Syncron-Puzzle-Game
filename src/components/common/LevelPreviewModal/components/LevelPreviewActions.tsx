/**
 * DOSYA AMACI: LevelPreviewModal'ın altındaki aksiyon butonları çubuğunu, odak durumunu,
 * hover efektlerini ve Gamepad tuş ipuçlarını (A/B rozetleri) render eden bileşen.
 */

import React from 'react';
import type { LevelPreviewAction } from '../types';

interface LevelPreviewActionsProps {
  actions: LevelPreviewAction[];
  focusedActionIndex: number;
  setFocusedActionIndex: (index: number) => void;
  executeAction: (index: number) => void;
  actionButtonRefs: React.MutableRefObject<(HTMLButtonElement | null)[]>;
  isGamepadConnected: boolean;
  radius: number;
  accent: string;
  glow: string;
}

export function LevelPreviewActions({
  actions,
  focusedActionIndex,
  setFocusedActionIndex,
  executeAction,
  actionButtonRefs,
  isGamepadConnected,
  radius,
  accent,
  glow,
}: LevelPreviewActionsProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        gap: 10,
        marginTop: 4,
        width: '100%',
      }}
    >
      {actions.map((action, idx) => {
        const isFocused = focusedActionIndex === idx;
        const isPrimary = action.primary;

        return (
          <button
            key={action.id}
            ref={(el) => {
              actionButtonRefs.current[idx] = el;
            }}
            type="button"
            data-active={isFocused}
            disabled={action.disabled}
            onClick={() => executeAction(idx)}
            onPointerEnter={() => setFocusedActionIndex(idx)}
            style={{
              flex: isPrimary ? 2 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '13px 16px',
              borderRadius: radius,
              cursor: action.disabled ? 'not-allowed' : 'pointer',
              opacity: action.disabled ? 0.45 : 1,
              outline: 'none',
              fontSize: 12,
              fontWeight: 900,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              touchAction: 'manipulation',
              transition: 'all 160ms cubic-bezier(0.22, 1, 0.36, 1)',
              transform: isFocused ? 'scale(1.02)' : 'scale(1)',
              background: isPrimary
                ? isFocused
                  ? accent
                  : `linear-gradient(135deg, ${accent}33 0%, ${accent}18 100%)`
                : isFocused
                ? 'rgba(255, 255, 255, 0.14)'
                : 'rgba(255, 255, 255, 0.04)',
              color: isPrimary
                ? isFocused
                  ? '#050505'
                  : '#ffffff'
                : isFocused
                ? '#ffffff'
                : '#94a3b8',
              border: isFocused
                ? `2px solid ${isPrimary ? '#ffffff' : accent}`
                : isPrimary
                ? `1.5px solid ${accent}80`
                : '1.5px solid rgba(255, 255, 255, 0.12)',
              boxShadow: isFocused
                ? `0 0 20px ${glow}, 0 4px 14px rgba(0, 0, 0, 0.4)`
                : isPrimary
                ? `0 0 10px ${accent}25`
                : 'none',
            }}
          >
            {action.icon}
            <span>{action.label}</span>
            {isGamepadConnected && (
              <span
                style={{
                  marginLeft: 4,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  fontSize: 10,
                  fontWeight: 900,
                  background: isPrimary
                    ? (isFocused ? '#050505' : accent)
                    : 'rgba(255, 255, 255, 0.2)',
                  color: isPrimary
                    ? (isFocused ? accent : '#050505')
                    : '#ffffff',
                }}
              >
                {isPrimary ? 'A' : 'B'}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
