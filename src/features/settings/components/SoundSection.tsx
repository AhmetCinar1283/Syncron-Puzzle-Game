/**
 * DOSYA AMACI: Ayarlar modalında ses tercihlerini (ses açık/kapalı switch ve ses seviyesi slider'ı)
 * görsel olarak sunan ve yöneten alt bileşendir.
 */

'use client';

import React from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { useT } from '@/contexts/LanguageContext';
import { useSettings } from '../hooks/useSettings';

export function SoundSection() {
  const t = useT();
  const { settings, setSoundMuted, toggleSoundMute, setSoundVolume } = useSettings();
  const { muted, volume } = settings.sound;

  return (
    <div
      style={{
        background: 'rgba(255, 255, 255, 0.02)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: 12,
        padding: '16px 18px',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}
    >
      {/* Bölüm Başlığı */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {muted ? (
            <VolumeX size={18} color="#64748b" />
          ) : (
            <Volume2 size={18} color="#00ff88" />
          )}
          <span style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9', letterSpacing: '0.04em' }}>
            {t('settings.sound_title')}
          </span>
        </div>

        {/* Ses Açma / Kapama Butonu */}
        <button
          type="button"
          onClick={toggleSoundMute}
          style={{
            padding: '5px 12px',
            fontSize: 11,
            fontWeight: 700,
            borderRadius: 6,
            border: muted ? '1px solid #374151' : '1px solid rgba(0, 255, 136, 0.4)',
            background: muted ? 'rgba(55, 65, 81, 0.2)' : 'rgba(0, 255, 136, 0.1)',
            color: muted ? '#9ca3af' : '#00ff88',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          {muted ? t('settings.sound_muted') : t('settings.sound_active')}
        </button>
      </div>

      {/* Ses Seviyesi Kaydırıcısı (Slider) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, opacity: muted ? 0.4 : 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <label
            htmlFor="settings-volume-slider"
            style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}
          >
            {t('settings.sound_volume')}
          </label>
          <span style={{ fontSize: 11, fontWeight: 700, color: muted ? '#64748b' : '#00c4ff' }}>
            %{muted ? 0 : volume}
          </span>
        </div>

        <input
          id="settings-volume-slider"
          type="range"
          min={0}
          max={100}
          step={1}
          value={muted ? 0 : volume}
          disabled={muted}
          onChange={(e) => {
            const newVol = Number(e.target.value);
            setSoundVolume(newVol);
            if (muted && newVol > 0) {
              setSoundMuted(false);
            }
          }}
          style={{
            width: '100%',
            height: 6,
            borderRadius: 3,
            appearance: 'none',
            outline: 'none',
            background: `linear-gradient(to right, #00c4ff 0%, #00ff88 ${muted ? 0 : volume}%, #1e293b ${muted ? 0 : volume}%, #1e293b 100%)`,
            cursor: muted ? 'not-allowed' : 'pointer',
          }}
        />
      </div>
    </div>
  );
}
