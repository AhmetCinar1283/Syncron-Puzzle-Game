/**
 * DOSYA AMACI: AdMob'un native alt banner'ını tarayıcıda taklit eden sabit
 * yükseklikte bir DOM şeridi çizer. Yalnızca `mockProvider` kullanır; amacı
 * banner'ın sayfa düzeninde açtığı boşluğu (`--ad-banner-height`) geliştirme
 * sırasında gerçek cihaza gerek kalmadan görebilmektir.
 */

/** Gerçek ADAPTIVE_BANNER yüksekliğine yakın bir değer (dp). */
const MOCK_BANNER_HEIGHT_PX = 50;
/** İçerikle banner arasındaki güvenlik boşluğu — admobBanner ile aynı gerekçe. */
const MOCK_BANNER_GAP_PX = 8;

let element: HTMLDivElement | null = null;
let sizeListener: ((heightPx: number) => void) | null = null;

export function onMockBannerHeight(listener: ((heightPx: number) => void) | null): void {
  sizeListener = listener;
  listener?.(element ? MOCK_BANNER_HEIGHT_PX + MOCK_BANNER_GAP_PX : 0);
}

export function showMockBanner(): void {
  if (element) return;
  element = document.createElement('div');
  element.setAttribute('data-testid', 'mock-ad-banner');
  Object.assign(element.style, {
    position: 'fixed',
    left: '0',
    right: '0',
    bottom: '0',
    height: `${MOCK_BANNER_HEIGHT_PX}px`,
    zIndex: '2147483646',
    background: '#1f2937',
    color: '#9ca3af',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'monospace',
    fontSize: '12px',
    letterSpacing: '0.08em',
    borderTop: '1px solid rgba(255,255,255,0.08)',
  } satisfies Partial<CSSStyleDeclaration>);
  element.textContent = 'SAHTE BANNER (mock)';
  document.body.appendChild(element);
  sizeListener?.(MOCK_BANNER_HEIGHT_PX + MOCK_BANNER_GAP_PX);
}

export function hideMockBanner(): void {
  if (!element) return;
  element.remove();
  element = null;
  sizeListener?.(0);
}
