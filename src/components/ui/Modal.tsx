'use client';

import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/cn';
import { useModalSound } from '@/services/audio';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
}

/**
 * Fixed-overlay modal reproducing `src/components/common/AuthModal.tsx`'s
 * backdrop (`position: fixed, inset: 0, zIndex: 1000, rgba(3,7,18,0.88)
 * + blur(6px)`, backdrop-click-to-close, ESC-to-close).
 */
export function Modal({ open, onClose, title, footer, children, className }: ModalProps) {
  useModalSound(open);
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4"
      style={{ background: 'rgba(3,7,18,0.88)', backdropFilter: 'blur(6px)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className={cn('w-full max-w-md rounded-2xl p-6', className)}
        style={{
          background: 'linear-gradient(to bottom, #0a0f1a, #070a12)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 0 40px rgba(0,0,0,0.6)',
        }}
      >
        {title && <div className="text-base font-bold text-slate-100 mb-4">{title}</div>}
        <div>{children}</div>
        {footer && <div className="mt-6 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}
