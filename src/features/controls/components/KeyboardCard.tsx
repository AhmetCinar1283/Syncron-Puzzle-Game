'use client';

export function KeyboardCard({ t }: { t: (key: string) => string }) {
  return (
    <div
      style={{
        background: 'rgba(15, 23, 42, 0.45)',
        border: '1px solid rgba(0, 196, 255, 0.15)',
        borderRadius: 16,
        padding: 24,
        boxShadow: '0 4px 30px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
        backdropFilter: 'blur(12px)',
      }}
    >
      <h2
        style={{
          fontSize: 18,
          fontWeight: 800,
          color: '#00c4ff',
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          borderBottom: '1px solid rgba(0, 196, 255, 0.15)',
          paddingBottom: 12,
          marginTop: 0,
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <span>⌨</span> {t('controls.keyboard')}
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontWeight: 700, fontSize: 13, color: '#f8fafc' }}>{t('controls.move')}</span>
            <div style={{ display: 'flex', gap: 4 }}>
              <span style={{ padding: '3px 8px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 4, fontSize: 10, fontFamily: 'monospace' }}>WASD</span>
              <span style={{ padding: '3px 8px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 4, fontSize: 10, fontFamily: 'monospace' }}>ARROWS</span>
            </div>
          </div>
          <p style={{ margin: 0, fontSize: 11, color: '#94a3b8', lineHeight: 1.5 }}>{t('controls.move_desc')}</p>
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontWeight: 700, fontSize: 13, color: '#f8fafc' }}>{t('controls.restart')}</span>
            <span style={{ padding: '3px 8px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 4, fontSize: 10, fontFamily: 'monospace' }}>R</span>
          </div>
          <p style={{ margin: 0, fontSize: 11, color: '#94a3b8', lineHeight: 1.5 }}>{t('controls.restart_desc')}</p>
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontWeight: 700, fontSize: 13, color: '#f8fafc' }}>{t('controls.menu')}</span>
            <span style={{ padding: '3px 8px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 4, fontSize: 10, fontFamily: 'monospace' }}>ESC</span>
          </div>
          <p style={{ margin: 0, fontSize: 11, color: '#94a3b8', lineHeight: 1.5 }}>{t('controls.menu_desc')}</p>
        </div>
      </div>
    </div>
  );
}
