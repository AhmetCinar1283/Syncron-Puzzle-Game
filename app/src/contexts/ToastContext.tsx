'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';

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
        return (
          <svg style={{ width: 18, height: 18, color: '#00ff88', filter: 'drop-shadow(0 0 3px rgba(0,255,136,0.3))' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'error':
        return (
          <svg style={{ width: 18, height: 18, color: '#ef4444', filter: 'drop-shadow(0 0 3px rgba(239,68,68,0.3))' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        );
      case 'warning':
        return (
          <svg style={{ width: 18, height: 18, color: '#fbbf24', filter: 'drop-shadow(0 0 3px rgba(251,191,36,0.3))' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        );
      case 'info':
        return (
          <svg style={{ width: 18, height: 18, color: '#00c4ff', filter: 'drop-shadow(0 0 3px rgba(0,196,255,0.3))' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'message':
      default:
        return (
          <svg style={{ width: 18, height: 18, color: '#a78bfa', filter: 'drop-shadow(0 0 3px rgba(167,139,250,0.3))' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        );
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
          fontSize: 12,
          lineHeight: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'color 0.15s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.color = '#94a3b8'; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = '#475569'; }}
      >
        ✕
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: Toast['type'] = 'message', duration = 4000) => {
    const id = Math.random().toString(36).substring(2, 9);
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
