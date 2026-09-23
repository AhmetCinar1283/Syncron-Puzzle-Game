'use client';

import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
  useImperativeHandle,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/cn';
import { useT } from '@/contexts/LanguageContext';
import { useGameTheme } from '@/game-engine/contexts/GameThemeContext';
import { soundEngine } from '@/services/audio';
import { useGamepad } from '@/hooks/useGamepad';
import { useHydrated } from '@/hooks/useHydrated';
import { GameIcon } from '@/components/icons';

export interface ModalRef {
  close: () => void;
  isClosing: boolean;
}

export interface ModalContextValue {
  close: () => void;
  isClosing: boolean;
}

export const ModalContext = React.createContext<ModalContextValue | null>(null);

export function useModal() {
  return React.useContext(ModalContext);
}

const ACCENT_ALPHA: [name: string, suffix: string][] = [
  ['09', '17'],
  ['12', '1f'],
  ['18', '2e'],
  ['26', '42'],
  ['35', '59'],
  ['45', '73'],
  ['50', '80'],
  ['66', 'a8'],
  ['70', 'b3'],
];

export interface ModalProps {
  /** Modalın görünürlük durumu. Tanımsız bırakılırsa varsayılan true kabul edilir. */
  open?: boolean;
  /** Modal kapatıldığında çağrılan işlev. */
  onClose: () => void;
  /** Başlık metni veya bileşeni. */
  title?: ReactNode;
  /** Başlığın solunda gösterilen ikon. */
  icon?: ReactNode;
  /** Başlığın altında gösterilen açıklama / alt başlık. */
  subtitle?: ReactNode;
  /** Modalın gövde içeriği. */
  children: ReactNode;
  /** Alt kapat butonunun üstünde veya yerine gösterilebilecek ek alt alan. */
  footer?: ReactNode;
  /** Altta tam genişlikte 'KAPAT' butonunun gösterilip gösterilmeyeceği (varsayılan: true). */
  showCloseButton?: boolean;
  /** Alt kapat butonunun metni (varsayılan: t('common.close')). */
  closeButtonText?: string;
  /** Mobilde üst tutamaç çubuğunun gösterilip gösterilmeyeceği (varsayılan: true). */
  showHandle?: boolean;
  /** Başlık alanının tamamen gizlenmesi (varsayılan: false). */
  hideHeader?: boolean;
  /** Sağ üstteki '✕' kapatma ikonunun gizlenmesi (varsayılan: false). */
  hideCloseIcon?: boolean;
  /** Maksimum panel genişliği (varsayılan: 520). */
  maxWidth?: number | string;
  /** Maksimum panel yüksekliği (varsayılan: 85dvh). */
  maxHeight?: number | string;
  /** Kök taşıyıcı için ek sınıf. */
  className?: string;
  /** Panel için ek sınıf. */
  panelClassName?: string;
  /** Panel için ek inline stiller. */
  panelStyle?: React.CSSProperties;
  /** Gövde içeriği için ek sınıf. */
  bodyClassName?: string;
  /** Kök taşıyıcı için ek inline stiller. */
  style?: React.CSSProperties;
  /** Açılış ve kapanışta ui.confirm sesinin çalınıp çalınmayacağı (varsayılan: true). */
  playSounds?: boolean;
  /** Özel z-index değeri (varsayılan: 9999). */
  zIndex?: number;
  /** Özel vurgu rengi (tanımlanmazsa aktif oyun temasının rengini kullanır). */
  accentColor?: string;
}

/**
 * Uygulama genelinde kullanılan birleşik Modal & Alt-Çekmece (Bottom Sheet) bileşeni.
 *
 * - Mobilde ve masaüstünde aşağıdan gelip aşağıya doğru kayarak kapanır.
 * - Çekmece modunda scroll en üstte ise aşağı çekilerek kapatılabilir.
 * - Aktif oyun temasının vurgu rengini (--home-accent, --home-accent-50, parlama) miras alır veya verilen accentColor'ı kullanır.
 * - Açılış ve kapanışta 'ui.confirm' ses efekti çalar.
 * - Escape tuşu, Gamepad B tuşu ve Scrim tıklamasıyla kapanma desteği sunar.
 */
export const Modal = React.forwardRef<ModalRef, ModalProps>(function Modal({
  open = true,
  onClose,
  title,
  icon,
  subtitle,
  children,
  footer,
  showCloseButton = true,
  closeButtonText,
  showHandle = true,
  hideHeader = false,
  hideCloseIcon = false,
  maxWidth = 520,
  maxHeight = '85dvh',
  className,
  panelClassName,
  panelStyle,
  bodyClassName,
  style,
  playSounds = true,
  zIndex = 9999,
  accentColor,
}: ModalProps, ref) {
  const t = useT();
  const { theme, themeConfig } = useGameTheme();
  // Portal yalnızca hidrasyondan sonra açılabilir (sunucuda `document` yok).
  // Bu bilgi artık efektte set edilen bir state değil, `useHydrated` türevi.
  const mounted = useHydrated();
  const [isClosing, setIsClosing] = useState(false);

  // Modal kapandığında kapanma animasyonu bayrağı sıfırlanır. Bu, `open`
  // prop'unun DEĞİŞİMİNE verilen bir yanıt olduğu için efektte değil, değişimi
  // fark ettiğimiz render'da yapılır (React'in "prop değişince state'i ayarla"
  // örüntüsü); efektte kalsaydı bir kare fazladan "kapanıyor" hâli görünebilirdi.
  const [openAtLastRender, setOpenAtLastRender] = useState(open);
  if (open !== openAtLastRender) {
    setOpenAtLastRender(open);
    if (!open) setIsClosing(false);
  }

  const panelRef = useRef<HTMLDivElement | null>(null);
  const bodyRef = useRef<HTMLDivElement | null>(null);

  // Dokunmatik aşağı kaydırma (swipe-down to close) durumları
  const touchStartYRef = useRef(0);
  const isPullingRef = useRef(false);

  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Modal açıkken arka planı koruma (body üzerinde data-modal-open işareti)
  useEffect(() => {
    if (!open) return;
    previousFocusRef.current = (typeof document !== 'undefined' ? document.activeElement : null) as HTMLElement | null;
    document.body.setAttribute('data-modal-open', 'true');
    return () => {
      document.body.removeAttribute('data-modal-open');
    };
  }, [open]);

  const effectiveMaxWidth = typeof maxWidth === 'number' ? `${maxWidth}px` : maxWidth;
  const effectiveMaxHeight = typeof maxHeight === 'number' ? `${maxHeight}px` : maxHeight;

  const themeVars = useMemo(() => {
    const accent = accentColor || themeConfig?.accentColor || '#00ff88';
    const glow = accentColor ? `${accentColor}40` : (themeConfig?.accentGlow || 'rgba(0, 255, 136, 0.4)');
    const isArcade = theme === 'arcade';

    const vars: Record<string, string> = {
      '--home-accent': accent,
      '--home-accent-glow': glow,
      '--home-radius': isArcade ? '0px' : '14px',
      '--home-max': effectiveMaxWidth,
    };

    ACCENT_ALPHA.forEach(([name, suffix]) => {
      vars[`--home-accent-${name}`] = `${accent}${suffix}`;
    });

    return vars as React.CSSProperties;
  }, [theme, themeConfig, effectiveMaxWidth, accentColor]);

  const handleClose = useCallback(() => {
    if (isClosing) return;
    setIsClosing(true);
    if (typeof document !== 'undefined') {
      document.body.removeAttribute('data-modal-open');
    }
    if (playSounds) {
      soundEngine.play('ui.confirm');
    }
    // Aşağıya kayma animasyonunun (homeSheetOut: 220ms) bitmesini bekle
    setTimeout(() => {
      onClose();
      setIsClosing(false);
      if (previousFocusRef.current && document.contains(previousFocusRef.current)) {
        previousFocusRef.current.focus();
      }
    }, 210);
  }, [isClosing, onClose, playSounds]);

  useImperativeHandle(
    ref,
    () => ({
      close: handleClose,
      isClosing,
    }),
    [handleClose, isClosing]
  );

  const contextValue = useMemo<ModalContextValue>(
    () => ({
      close: handleClose,
      isClosing,
    }),
    [handleClose, isClosing]
  );

  // Açılış sesi döngüsü
  const hasPlayedOpenRef = useRef(false);
  const prevOpenRef = useRef(open);

  useEffect(() => {
    if (open) {
      if (!hasPlayedOpenRef.current || !prevOpenRef.current) {
        hasPlayedOpenRef.current = true;
        if (playSounds) {
          soundEngine.play('ui.confirm');
        }
      }
    } else {
      hasPlayedOpenRef.current = false;
    }
    prevOpenRef.current = open;
  }, [open, playSounds]);

  // Klavye (Escape) desteği
  useEffect(() => {
    if (!open || isClosing) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, isClosing, handleClose]);

  // Gamepad (B/Cancel) desteği - priority: 'modal' ile arka planı engeller
  useGamepad({
    enabled: open && !isClosing,
    priority: 'modal',
    onCancel: handleClose,
  });

  // Açıldığında odağı panele çek
  useEffect(() => {
    if (open) {
      panelRef.current?.focus();
    }
  }, [open]);

  // ── Dokunmatik Aşağı Kaydırma (Swipe-Down to Close) ──
  const handleTouchStart = (e: React.TouchEvent) => {
    if (isClosing) return;
    const touch = e.touches[0];
    touchStartYRef.current = touch.clientY;

    // İçerik scroll edilebilir ise ve scroll en tepede değilse kaydırmayı başlatma
    const bodyEl = bodyRef.current;
    const isAtTop = !bodyEl || bodyEl.scrollTop <= 0;
    isPullingRef.current = isAtTop;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPullingRef.current || isClosing) return;
    const touch = e.touches[0];
    const deltaY = touch.clientY - touchStartYRef.current;

    const bodyEl = bodyRef.current;
    if (bodyEl && bodyEl.scrollTop > 0) {
      isPullingRef.current = false;
      if (panelRef.current) {
        panelRef.current.style.transform = '';
      }
      return;
    }

    if (deltaY > 0 && panelRef.current) {
      panelRef.current.style.transform = `translateY(${deltaY}px)`;
      panelRef.current.style.transition = 'none';
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!isPullingRef.current || isClosing) return;
    isPullingRef.current = false;
    const touch = e.changedTouches[0];
    const deltaY = touch.clientY - touchStartYRef.current;

    if (deltaY > 70) {
      handleClose();
    } else if (panelRef.current) {
      panelRef.current.style.transition = 'transform 200ms cubic-bezier(0.22, 1, 0.36, 1)';
      panelRef.current.style.transform = '';
    }
  };

  if (!mounted || !open || typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <div
      className={cn('home-sheet', className)}
      role="dialog"
      aria-modal="true"
      data-closing={isClosing ? 'true' : undefined}
      style={{
        zIndex,
        ...themeVars,
        ...style,
      }}
    >
      {/* Arka plan scrim */}
      <div className="home-sheet__scrim" onClick={handleClose} />

      {/* Ana panel (aşağıdan gelen ve aşağıya kapanan sheet) */}
      <div
        ref={panelRef}
        tabIndex={-1}
        className={cn('home-sheet__panel', panelClassName)}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          background: themeConfig?.board?.background || '#070e1c',
          maxWidth: effectiveMaxWidth,
          width: '100%',
          maxHeight: effectiveMaxHeight,
          outline: 'none',
          ...panelStyle,
        }}
      >
        {/* Mobilde görünen tutamaç */}
        {showHandle && <div className="home-sheet__handle" />}

        {/* Başlık alanı */}
        {!hideHeader && (title || icon || !hideCloseIcon) && (
          <div className="home-sheet__header">
            <div className="home-sheet__title-group">
              {icon}
              {title && (
                typeof title === 'string' ? (
                  <h2 className="home-sheet__title">{title}</h2>
                ) : (
                  title
                )
              )}
            </div>
            {!hideCloseIcon && (
              <button
                type="button"
                onClick={handleClose}
                title={closeButtonText || t('common.close')}
                aria-label={closeButtonText || t('common.close')}
                className="home-sheet__close-icon-btn"
              >
                <GameIcon name="close" size={16} />
              </button>
            )}
          </div>
        )}

        {/* Alt başlık */}
        {subtitle && (
          typeof subtitle === 'string' ? (
            <p className="home-sheet__subtitle">{subtitle}</p>
          ) : (
            subtitle
          )
        )}

        {/* Context ve Gövde içeriği */}
        <ModalContext.Provider value={contextValue}>
          <div ref={bodyRef} className={cn('home-sheet__body', bodyClassName)}>
            {children}
          </div>

          {/* İsteğe bağlı ek footer */}
          {footer}

          {/* Alt Kapat Butonu */}
          {showCloseButton && (
            <button
              type="button"
              onClick={handleClose}
              className="home-sheet__close-btn"
            >
              {closeButtonText || t('common.close')}
            </button>
          )}
        </ModalContext.Provider>
      </div>
    </div>,
    document.body
  );
});
