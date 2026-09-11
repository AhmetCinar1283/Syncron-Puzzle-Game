'use client';

import { useT } from '@/contexts/LanguageContext';

export function DesignerSidebar({
  mapTheme,
  setMapTheme,
  activeThemeColor,
  saving,
  onSave,
  onClose,
  onGeneratePreset,
}: {
  mapTheme: string;
  setMapTheme: (theme: string) => void;
  activeThemeColor: string;
  saving: boolean;
  onSave: () => void;
  onClose: () => void;
  onGeneratePreset: (type: 'snake' | 'spiral' | 'circle') => void;
}) {
  const t = useT();

  const presetBtnStyle: React.CSSProperties = { width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: '#e2e8f0', borderRadius: 8, padding: '8px 12px', fontSize: 11, cursor: 'pointer', textAlign: 'left', fontWeight: 600, transition: 'all 0.2s' };

  return (
    <div style={{ width: '100%', maxWidth: 300, padding: 24, borderRight: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', gap: 20, boxSizing: 'border-box', overflowY: 'auto' }}>

      <div>
        <label style={{ display: 'block', fontSize: 10, fontWeight: 900, color: '#64748b', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
          {t('admin.designer_theme') || 'Harita Teması'}
        </label>
        <select
          value={mapTheme}
          onChange={(e) => setMapTheme(e.target.value)}
          style={{
            width: '100%', background: '#0a0f1d', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: 8, padding: '8px 12px', fontSize: 12, outline: 'none'
          }}
        >
          <option value="cyber-grid">{t('admin.designer_theme_cyber') || 'Siber Izgara (Cyber Grid)'}</option>
          <option value="star-nebula">{t('admin.designer_theme_star') || 'Yıldız Bulutu (Star Nebula)'}</option>
          <option value="cosmic-vortex">{t('admin.designer_theme_cosmic') || 'Kozmik Girdap (Cosmic Vortex)'}</option>
          <option value="retro-matrix">{t('admin.designer_theme_retro') || 'Retro Matrix'}</option>
          <option value="neon-abyss">{t('admin.designer_theme_abyss') || 'Neon Uçurum (Neon Abyss)'}</option>
        </select>
      </div>

      <div>
        <label style={{ display: 'block', fontSize: 10, fontWeight: 900, color: '#64748b', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
          {t('admin.designer_preset') || 'Hazır Şablon Üret'}
        </label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button
            onClick={() => onGeneratePreset('snake')}
            style={presetBtnStyle}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
          >
            📈 {t('admin.designer_preset_snake') || 'Kıvrımlı Yol (Snake)'}
          </button>
          <button
            onClick={() => onGeneratePreset('spiral')}
            style={presetBtnStyle}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
          >
            🌀 {t('admin.designer_preset_spiral') || 'Spiral (Dışa Doğru)'}
          </button>
          <button
            onClick={() => onGeneratePreset('circle')}
            style={presetBtnStyle}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
          >
            ◯ {t('admin.designer_preset_circle') || 'Çember Düzeni'}
          </button>
        </div>
      </div>

      <div style={{ marginTop: 'auto', background: `${activeThemeColor}06`, border: `1px solid ${activeThemeColor}15`, borderRadius: 8, padding: 12 }}>
        <p style={{ margin: 0, fontSize: 11, color: '#94a3b8', lineHeight: 1.5 }}>
          💡 <strong>Nasıl tasarlanır:</strong> Seviye düğmelerini ve portalları sürükleyip yerleştirin. 🌀 (turuncu kenarlı) Çıkış, 🟢 (yeşil kenarlı) Giriş Portalidir.
        </p>
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button
          onClick={onSave} disabled={saving}
          style={{ flex: 1, padding: '10px 16px', background: saving ? 'rgba(0,255,136,0.3)' : '#00ff88', border: 'none', color: '#030712', fontWeight: 800, borderRadius: 8, fontSize: 12, cursor: saving ? 'not-allowed' : 'pointer', letterSpacing: '0.04em', textTransform: 'uppercase', boxShadow: saving ? 'none' : '0 0 16px rgba(0,255,136,0.3)' }}
        >
          {saving ? '...' : (t('admin.designer_save') || 'Düzeni ve Temayı Kaydet')}
        </button>
        <button
          onClick={onClose} disabled={saving}
          style={{ padding: '10px 14px', background: 'none', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', borderRadius: 8, fontSize: 12, cursor: 'pointer' }}
        >
          {t('admin.designer_cancel') || 'İptal'}
        </button>
      </div>

    </div>
  );
}
