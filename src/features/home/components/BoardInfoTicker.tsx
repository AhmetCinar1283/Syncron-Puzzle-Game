'use client';

import React from 'react';
import { ThemeDefinition } from '@/game-engine/themes/themeConfig';
import { useLanguage } from '@/contexts/LanguageContext';

interface BoardInfoTickerProps {
  activeOptionId: string;
  themeConfig: ThemeDefinition;
  lastPlayedLevelId?: string | null;
  isMobile: boolean;
}

export function BoardInfoTicker({
  activeOptionId,
  themeConfig,
  lastPlayedLevelId,
  isMobile,
}: BoardInfoTickerProps) {
  const { lang } = useLanguage();
  const isTr = lang === 'tr';

  const getTickerText = (): string => {
    switch (activeOptionId) {
      case 'play':
        return lastPlayedLevelId
          ? (isTr ? `DEVAM ET: BÖLÜM #${lastPlayedLevelId} • SENKRON HAZIR` : `RESUME: LEVEL #${lastPlayedLevelId} • READY`)
          : (isTr ? 'BAŞLA: İLK BÖLÜM • SENKRON HAREKET' : 'START: FIRST LEVEL • SYNC MOTION');
      case 'daily':
        return isTr
          ? 'GÜNLÜK MEYDAN OKUMA • 24 SAATLİK ÖZEL BULMACA'
          : 'DAILY CHALLENGE • 24H EXCLUSIVE PUZZLE';
      case 'levels':
        return isTr
          ? 'BÖLÜMLER • TÜM MACERA VE TOPLULUK SEVİYELERİ'
          : 'LEVELS • CAMPAIGN & CUSTOM STAGES';
      case 'editor':
        return isTr
          ? 'LEVEL EDİTÖRÜ • KENDİ BULMACANI OLUŞTUR VE PAYLAŞ'
          : 'LEVEL EDITOR • BUILD & SHARE PUZZLES';
      case 'friends':
        return isTr
          ? 'ARKADAŞLAR • ÇEVRİMİÇİ LİSTE VE MEYDAN OKUMA'
          : 'FRIENDS • MULTIPLAYER & CHALLENGES';
      case 'controls':
        return isTr
          ? 'KONTROLLER • GAMEPAD, KLAVYE VE DOKUNMATİK'
          : 'CONTROLS • GAMEPAD, KEYBOARD & TOUCH';
      case 'admin':
        return isTr ? 'YÖNETİM • SİSTEM VE GELİŞTİRİCİ PANELİ' : 'ADMIN • SYSTEM & TOOLS';
      default:
        return isTr ? 'SYNCRON • İKİ NESNE, TEK KONTROL' : 'SYNCRON • TWO OBJECTS, ONE CONTROL';
    }
  };

  return (
    <div
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: isMobile ? '7px 12px' : '9px 16px',
        background: 'rgba(4, 9, 20, 0.92)',
        borderBottom: `1px solid ${themeConfig.accentColor}30`,
        fontSize: isMobile ? 10 : 11,
        color: themeConfig.accentColor,
        fontWeight: 800,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        boxSizing: 'border-box',
        overflow: 'hidden',
        whiteSpace: 'nowrap',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, overflow: 'hidden' }}>
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: '#00ff88',
            boxShadow: '0 0 8px #00ff88',
            flexShrink: 0,
          }}
        />
        <span
          style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            textShadow: `0 0 8px ${themeConfig.accentColor}40`,
          }}
        >
          {getTickerText()}
        </span>
      </div>

      <span
        style={{
          fontSize: 9,
          color: '#64748b',
          letterSpacing: '0.14em',
          marginLeft: 8,
          flexShrink: 0,
        }}
      >
        SYNC • 2P
      </span>
    </div>
  );
}
