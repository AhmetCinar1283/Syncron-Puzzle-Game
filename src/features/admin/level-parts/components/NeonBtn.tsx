export function NeonBtn({
  color = '#00c4ff',
  onClick,
  disabled,
  children,
  small,
}: {
  color?: string;
  onClick?: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  small?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: small ? '4px 10px' : '6px 14px',
        fontSize: small ? 10 : 11,
        fontWeight: 700,
        letterSpacing: '0.08em',
        background: `${color}10`,
        border: `1px solid ${color}50`,
        color,
        borderRadius: 6,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'background 0.15s',
        whiteSpace: 'nowrap',
      }}
      onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.background = `${color}20`; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = `${color}10`; }}
    >
      {children}
    </button>
  );
}
