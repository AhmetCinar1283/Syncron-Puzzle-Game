'use client';

export function BarChart({ easy, normal, hard }: { easy: number; normal: number; hard: number }) {
  const total = easy + normal + hard;
  const maxVal = Math.max(easy, normal, hard, 1);
  const getPercent = (val: number) => (val / maxVal) * 100;

  const items = [
    { label: 'KOLAY', value: easy, color: '#10b981', glow: 'rgba(16, 185, 129, 0.3)' },
    { label: 'NORMAL', value: normal, color: '#00c4ff', glow: 'rgba(0, 196, 255, 0.3)' },
    { label: 'ZOR', value: hard, color: '#ef4444', glow: 'rgba(239, 68, 68, 0.3)' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
      <p style={{ fontSize: 10, color: '#94a3b8', fontWeight: 800, margin: 0, textAlign: 'center', letterSpacing: '0.06em' }}>
        ZORLUK ANKETİ ({total} OY)
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, background: 'rgba(30, 41, 59, 0.15)', padding: 10, borderRadius: 12, border: '1px solid rgba(148, 163, 184, 0.05)' }}>
        {items.map((item) => {
          const pct = getPercent(item.value);
          return (
            <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 10 }}>
              <span style={{ width: 45, color: '#94a3b8', fontWeight: 700 }}>{item.label}</span>
              <div style={{ flex: 1, height: 8, background: 'rgba(15, 23, 42, 0.6)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{
                  width: `${pct}%`,
                  height: '100%',
                  background: item.color,
                  borderRadius: 4,
                  boxShadow: `0 0 8px ${item.glow}`,
                  transition: 'width 0.6s cubic-bezier(0.22, 1, 0.36, 1)'
                }} />
              </div>
              <span style={{ width: 20, textAlign: 'right', fontWeight: 800, color: item.value > 0 ? '#fff' : '#4b5563' }}>{item.value}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
