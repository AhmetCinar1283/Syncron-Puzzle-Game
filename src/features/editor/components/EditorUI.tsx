// Shared small UI primitives used across editor panels and dialogs.

export const iStyle: React.CSSProperties = {
  background: '#060d1a',
  border: '1px solid rgba(30,58,95,0.6)',
  color: '#94a3b8',
  borderRadius: 6,
  padding: '5px 8px',
  fontSize: 12,
  outline: 'none',
  boxSizing: 'border-box',
};

export function Sec({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#1e3a5f', borderBottom: '1px solid rgba(30,58,95,0.4)', paddingBottom: 5, marginBottom: 10 }}>{title}</div>
      {children}
    </div>
  );
}

export function Lbl({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#334155', display: 'block', marginBottom: 5, ...style }}>
      {children}
    </span>
  );
}

export function NBtn({ children, onClick, active, color = '#94a3b8', style, disabled }: {
  children: React.ReactNode;
  onClick?: () => void;
  active?: boolean;
  color?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '5px 9px', fontSize: 11, fontWeight: 600, letterSpacing: '0.03em',
        border: `1px solid ${active ? color : 'rgba(255,255,255,0.08)'}`,
        background: active ? `${color}1a` : 'rgba(255,255,255,0.02)',
        color: active ? color : '#475569',
        borderRadius: 6, cursor: disabled ? 'not-allowed' : 'pointer',
        boxShadow: active ? `0 0 8px ${color}28` : 'none',
        transition: 'all 0.12s', opacity: disabled ? 0.45 : 1, ...style,
      }}
    >
      {children}
    </button>
  );
}

import { Modal as UiModal } from '@/components/ui';

export function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <UiModal
      open={true}
      onClose={onClose}
      accentColor="#00c4ff"
      maxWidth={500}
      showCloseButton={false}
      hideHeader={true}
      zIndex={120}
    >
      <div style={{ padding: '4px 2px', width: '100%', boxSizing: 'border-box' }}>
        {children}
      </div>
    </UiModal>
  );
}
