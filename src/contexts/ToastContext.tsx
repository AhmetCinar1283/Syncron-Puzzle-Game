'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { GameIcon } from '@/components/icons';
import { soundEngine, type SoundId } from '@/services/audio';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info' | 'message';
  duration?: number; // in milliseconds. 0 or <= 0 means manual close only.
}

interface ToastContextType {
  showToast: (message: string, type?: Toast['type'], duration?: number) => string;
  hideToast: (id: string) => void;
}

const TOAST_SOUND: Record<Toast['type'], SoundId> = {
  success: 'notify.success',
  error: 'notify.error',
  warning: 'notify.warning',
  info: 'notify.info',
  message: 'notify.message',
};

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const [isExiting, setIsExiting] = useState(false);

  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const handleClose = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => {
      onCloseRef.current();
    }, 200); // 200ms is the exit animation duration
  }, []);

  useEffect(() => {
    if (toast.duration && toast.duration > 0) {
      const timer = setTimeout(() => {
        handleClose();
      }, toast.duration);
      return () => clearTimeout(timer);
    }
  }, [toast.duration, handleClose]);

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <GameIcon name="check" size={18} color="#00ff88" style={{ filter: 'drop-shadow(0 0 3px rgba(0,255,136,0.3))' }} />;
      case 'error':
        return <GameIcon name="error" size={18} color="#ef4444" style={{ filter: 'drop-shadow(0 0 3px rgba(239,68,68,0.3))' }} />;
      case 'warning':
        return <GameIcon name="warning" size={18} color="#fbbf24" style={{ filter: 'drop-shadow(0 0 3px rgba(251,191,36,0.3))' }} />;
      case 'info':
        return <GameIcon name="lightbulb" size={18} color="#00c4ff" style={{ filter: 'drop-shadow(0 0 3px rgba(0,196,255,0.3))' }} />;
      case 'message':
      default:
        return <GameIcon name="chat" size={18} color="#a78bfa" style={{ filter: 'drop-shadow(0 0 3px rgba(167,139,250,0.3))' }} />;
    }
  };

  const getBorderColor = () => {
    switch (toast.type) {
      case 'success': return 'rgba(0, 255, 136, 0.2)';
      case 'error': return 'rgba(239, 68, 68, 0.2)';
      case 'warning': return 'rgba(251, 191, 36, 0.2)';
      case 'info': return 'rgba(0, 196, 255, 0.2)';
      case 'message': default: return 'rgba(167, 139, 250, 0.2)';
    }
  };

  const getLeftAccent = () => {
    switch (toast.type) {
      case 'success': return '#00ff88';
      case 'error': return '#ef4444';
      case 'warning': return '#fbbf24';
      case 'info': return '#00c4ff';
      case 'message': default: return '#a78bfa';
    }
  };

  const getGlowShadow = () => {
    switch (toast.type) {
      case 'success': return 'rgba(0, 255, 136, 0.15)';
      case 'error': return 'rgba(239, 68, 68, 0.15)';
      case 'warning': return 'rgba(251, 191, 36, 0.15)';
      case 'info': return 'rgba(0, 196, 255, 0.15)';
      case 'message': default: return 'rgba(167, 139, 250, 0.15)';
    }
  };

  return (
    <div
      className={isExiting ? 'toast-animate-out' : 'toast-animate-in'}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 16px',
        borderRadius: 10,
        background: 'rgba(6, 13, 26, 0.95)',
        color: '#e2e8f0',
        fontSize: 13,
        fontWeight: 600,
        pointerEvents: 'auto',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        width: '100%',
        boxSizing: 'border-box',
        border: `1px solid ${getBorderColor()}`,
        borderLeft: `4px solid ${getLeftAccent()}`,
        boxShadow: `0 8px 32px 0 rgba(0, 0, 0, 0.5), 0 0 15px ${getGlowShadow()}`,
        transition: 'all 0.2s ease-in-out',
      }}
    >
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
        {getIcon()}
      </div>
      <div style={{ flex: 1, minWidth: 0, paddingRight: 4, lineHeight: 1.4, fontSize: 12 }}>
        {toast.message}
      </div>
      <button
        onClick={handleClose}
        style={{
          flexShrink: 0,
          background: 'none',
          border: 'none',
          color: '#475569',
          cursor: 'pointer',
          padding: '4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'color 0.15s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.color = '#94a3b8'; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = '#475569'; }}
      >
        <GameIcon name="close" size={12} />
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: Toast['type'] = 'message', duration = 4000) => {
    const id = Math.random().toString(36).substring(2, 9);
    soundEngine.play(TOAST_SOUND[type]);
    setToasts((prev) => [...prev, { id, message, type, duration }]);
    return id;
  }, []);

  const hideToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      {/* Toast Portal/Container */}
      <div
        style={{
          position: 'fixed',
          bottom: 16,
          left: 16,
          right: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          zIndex: 9999,
          pointerEvents: 'none',
          alignItems: 'center',
        }}
        className="toast-container"
      >
        {/* Style tag inside container or inject responsively */}
        <style dangerouslySetInnerHTML={{ __html: `
          @media (min-width: 640px) {
            .toast-container {
              left: auto !important;
              right: 24px !important;
              bottom: 24px !important;
              width: 380px !important;
              align-items: flex-end !important;
            }
          }
        `}} />
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onClose={() => hideToast(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}
