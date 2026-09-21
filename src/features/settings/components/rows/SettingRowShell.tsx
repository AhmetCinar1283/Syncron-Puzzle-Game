/**
 * DOSYA AMACI: Tüm ayar satırlarının ortak çerçevesi: etiket, açıklama, sağ
 * taraf kontrolü, odak çerçevesi ve fare ile odaklama. Satır türlerine özel
 * içerik `children` / `control` olarak verilir.
 */

'use client';

import React from 'react';
import { COLORS, focusStyle } from '../../lib/styles';

interface Props {
  id: string;
  label: string;
  description?: string;
  focused: boolean;
  onFocus: (id: string) => void;
  /** Etiketin sağında duran kontrol (ör. aç/kapa düğmesi). */
  control?: React.ReactNode;
  /** Etiketin altında tam genişlikte duran içerik (ör. kaydırıcı, seçenekler). */
  children?: React.ReactNode;
  dimmed?: boolean;
}

export function SettingRowShell({ id, label, description, focused, onFocus, control, children, dimmed }: Props) {
  return (
    <div
      data-focus-id={id}
      onMouseEnter={() => onFocus(id)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        padding: '10px 12px',
        borderRadius: 10,
        transition: 'all 0.2s ease',
        opacity: dimmed ? 0.5 : 1,
        ...focusStyle(focused),
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.text }}>{label}</div>
          {description && (
            <p style={{ margin: '2px 0 0', fontSize: 11, color: COLORS.textDim, lineHeight: 1.4 }}>{description}</p>
          )}
        </div>
        {control}
      </div>
      {children}
    </div>
  );
}
