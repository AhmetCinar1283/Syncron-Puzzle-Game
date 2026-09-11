export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(3,7,18,0.85)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#060d1a',
          border: '1px solid rgba(0,196,255,0.25)',
          borderRadius: 12,
          padding: 24,
          width: '100%',
          maxWidth: 400,
          boxShadow: '0 0 40px rgba(0,196,255,0.1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ margin: '0 0 20px', fontSize: 14, fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#00c4ff' }}>
          {title}
        </h2>
        {children}
      </div>
    </div>
  );
}
