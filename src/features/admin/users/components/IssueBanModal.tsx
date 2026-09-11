'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { getMinDateTime } from '../lib/format';

type BanType = 'platform' | 'tag' | 'social' | 'coop';
type DurationOption = 'permanent' | 'temporary';

export function IssueBanModal({
  isTr,
  show,
  onClose,
  onSubmit,
  banError,
  banType,
  setBanType,
  durationOption,
  setDurationOption,
  expiresAt,
  setExpiresAt,
  banReason,
  setBanReason,
  submittingBan,
}: {
  isTr: boolean;
  show: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  banError: string | null;
  banType: BanType;
  setBanType: (t: BanType) => void;
  durationOption: DurationOption;
  setDurationOption: (d: DurationOption) => void;
  expiresAt: string;
  setExpiresAt: (v: string) => void;
  banReason: string;
  setBanReason: (v: string) => void;
  submittingBan: boolean;
}) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(3, 7, 18, 0.85)',
            backdropFilter: 'blur(8px)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <motion.div
            initial={{ scale: 0.95, y: 10 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 10 }}
            style={{
              width: '100%',
              maxWidth: '500px',
              background: 'linear-gradient(to bottom, #0a0f1a, #070a12)',
              border: '1px solid rgba(147, 51, 234, 0.3)',
              boxShadow: '0 0 40px rgba(147, 51, 234, 0.15)',
              borderRadius: '16px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#f1f5f9', letterSpacing: '0.05em' }}>
                🚫 {isTr ? 'YENİ BAN / KISITLAMA TANIMLA' : 'ISSUE NEW RESTRICTION'}
              </h3>
              <button
                onClick={onClose}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#475569',
                  fontSize: '18px',
                  cursor: 'pointer',
                }}
              >
                ✕
              </button>
            </div>

            {banError && (
              <div style={{ padding: '8px 12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '6px', color: '#f87171', fontSize: '12px' }}>
                ⚠️ {banError}
              </div>
            )}

            <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Ban Type selector */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
                  {isTr ? 'Ban Tipi:' : 'Ban Type:'}
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {(['platform', 'tag', 'social', 'coop'] as const).map((type) => {
                    let label = '';
                    switch (type) {
                      case 'platform':
                        label = isTr ? 'Platform' : 'Platform';
                        break;
                      case 'tag':
                        label = isTr ? 'Tag' : 'Tag';
                        break;
                      case 'social':
                        label = isTr ? 'Sosyal' : 'Social';
                        break;
                      case 'coop':
                        label = isTr ? 'Co-op' : 'Co-op';
                        break;
                    }
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setBanType(type)}
                        style={{
                          background: banType === type ? 'rgba(147, 51, 234, 0.15)' : '#060d1a',
                          border: '1px solid ' + (banType === type ? '#9333ea' : 'rgba(255,255,255,0.06)'),
                          color: banType === type ? '#ffffff' : '#94a3b8',
                          padding: '8px 12px',
                          borderRadius: '8px',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                          textTransform: 'uppercase',
                        }}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
                {/* Ban type description */}
                <span style={{ fontSize: '11px', color: '#475569', fontStyle: 'italic', marginTop: '4px' }}>
                  {banType === 'platform' &&
                    (isTr
                      ? "Worker'a her isteği engeller (oyun oynama, sosyal işlemler vb.)"
                      : 'Blocks all backend endpoints (playing levels, social features, etc.)')}
                  {banType === 'tag' &&
                    (isTr
                      ? "Tag değişikliğini engeller ve mevcut tag'i boşa çıkarır"
                      : 'Blocks changing tag and clears current tag registration')}
                  {banType === 'social' && (isTr ? 'Arkadaşlık isteği göndermeyi engeller' : 'Prevents sending outgoing friend requests')}
                  {banType === 'coop' && (isTr ? 'Gelecekte co-op özellikleri için kısıtlama' : 'Co-op feature restriction (reserved for future use)')}
                </span>
              </div>

              {/* Duration option selector */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
                  {isTr ? 'Süre:' : 'Duration:'}
                </label>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="durationOption"
                      checked={durationOption === 'permanent'}
                      onChange={() => setDurationOption('permanent')}
                      style={{ accentColor: '#9333ea' }}
                    />
                    {isTr ? 'Kalıcı (Kaldırılana dek)' : 'Permanent (Until lifted)'}
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="durationOption"
                      checked={durationOption === 'temporary'}
                      onChange={() => setDurationOption('temporary')}
                      style={{ accentColor: '#9333ea' }}
                    />
                    {isTr ? 'Süreli' : 'Temporary'}
                  </label>
                </div>

                {durationOption === 'temporary' && (
                  <input
                    type="datetime-local"
                    value={expiresAt}
                    min={getMinDateTime()}
                    required
                    onChange={(e) => setExpiresAt(e.target.value)}
                    style={{
                      background: '#060d1a',
                      border: '1px solid rgba(147, 51, 234, 0.15)',
                      color: '#e2e8f0',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      fontSize: '12.5px',
                      outline: 'none',
                      marginTop: '6px',
                    }}
                  />
                )}
              </div>

              {/* Ban Reason input */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
                    {isTr ? 'Neden / Gerekçe:' : 'Reason / Justification:'}
                  </label>
                  <span style={{ fontSize: '10px', color: banReason.length > 500 ? '#ef4444' : '#475569' }}>{banReason.length}/500</span>
                </div>
                <textarea
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value.slice(0, 550))}
                  placeholder={isTr ? 'Lütfen banlanma sebebini açıklayın...' : 'Provide details on the rule violation...'}
                  rows={3}
                  required
                  style={{
                    background: '#060d1a',
                    border: '1px solid rgba(147, 51, 234, 0.15)',
                    color: '#e2e8f0',
                    borderRadius: '8px',
                    padding: '10px 12px',
                    fontSize: '13px',
                    outline: 'none',
                    resize: 'none',
                  }}
                />
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    background: 'transparent',
                    border: '1px solid rgba(255,255,255,0.06)',
                    color: '#94a3b8',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {isTr ? 'İptal' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={submittingBan}
                  style={{
                    background: '#9333ea',
                    border: 'none',
                    color: '#ffffff',
                    padding: '8px 20px',
                    borderRadius: '8px',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 0 12px rgba(147, 51, 234, 0.3)',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    if (!submittingBan) {
                      e.currentTarget.style.boxShadow = '0 0 18px rgba(147, 51, 234, 0.5)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = '0 0 12px rgba(147, 51, 234, 0.3)';
                  }}
                >
                  {submittingBan ? '...' : isTr ? 'BAN UYGULA' : 'ISSUE BAN'}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
