// Admin Dashboard için özel buton yapısı (Kare formunda)
export function AdminCard({
  label,
  sub,
  icon,
  color,
  onClick,
  unreadCount,
}: {
  label: string;
  sub: string;
  icon: string;
  color: string;
  onClick: () => void;
  unreadCount?: number;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        aspectRatio: '1 / 1',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        background: `${color}0d`,
        border: `1px solid ${color}50`,
        color,
        borderRadius: 16,
        cursor: 'pointer',
        boxShadow: `0 0 18px ${color}18`,
        transition: 'all 0.2s ease-in-out',
        padding: 16,
        position: 'relative',
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget;
        el.style.background = `${color}18`;
        el.style.boxShadow = `0 0 30px ${color}30`;
        el.style.transform = 'translateY(-4px)'; // Üzerine gelince hafif yukarı kalkma
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget;
        el.style.background = `${color}0d`;
        el.style.boxShadow = `0 0 18px ${color}18`;
        el.style.transform = 'translateY(0)';
      }}
    >
      <span style={{ fontSize: 36, opacity: 0.9, textShadow: `0 0 10px ${color}50` }}>
        {icon}
      </span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
        <span style={{ fontSize: 14, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          {label}
        </span>
        <span style={{ fontSize: 10, fontWeight: 400, letterSpacing: '0.05em', opacity: 0.6, textAlign: 'center' }}>
          {sub}
        </span>
      </div>

      {/* Dynamic unread bubble indicator */}
      {unreadCount !== undefined && unreadCount > 0 && (
        <span
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            background: '#fbbf24',
            color: '#030712',
            fontSize: '11px',
            fontWeight: 900,
            padding: '3px 8px',
            borderRadius: '10px',
            boxShadow: '0 0 10px #fbbf24, 0 0 20px #fbbf24',
            border: '1.5px solid #030712',
            zIndex: 10,
          }}
        >
          {unreadCount}
        </span>
      )}
    </button>
  );
}
