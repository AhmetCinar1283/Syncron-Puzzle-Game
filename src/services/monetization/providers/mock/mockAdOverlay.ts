/**
 * DOSYA AMACI: Gerçek SDK'ların tam ekran reklam davranışını taklit eden vanilla
 * DOM overlay'i çizer (geri sayım + kapat düğmesi). Sadece `mockProvider`
 * tarafından kullanılır; React'e bağımlı değildir.
 */
export type MockAdOutcome = 'completed' | 'closed-early';

interface ShowMockAdOptions {
  kind: 'interstitial' | 'rewarded';
  /** Kapat düğmesinin görünmesi için geçmesi gereken süre (ms). */
  durationMs: number;
}

export function showMockAd({ kind, durationMs }: ShowMockAdOptions): Promise<MockAdOutcome> {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.setAttribute('data-testid', 'mock-ad-overlay');
    Object.assign(overlay.style, {
      position: 'fixed',
      inset: '0',
      zIndex: '2147483647',
      background: '#111827',
      color: '#f9fafb',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '16px',
      fontFamily: 'system-ui, sans-serif',
    } satisfies Partial<CSSStyleDeclaration>);

    const label = document.createElement('div');
    label.textContent = kind === 'rewarded' ? 'Sahte ödüllü reklam' : 'Sahte bölüm arası reklam';
    label.style.fontSize = '20px';

    const countdown = document.createElement('div');
    countdown.style.fontSize = '48px';
    countdown.style.fontWeight = 'bold';

    const closeButton = document.createElement('button');
    closeButton.textContent = 'Kapat';
    closeButton.disabled = true;
    Object.assign(closeButton.style, {
      padding: '10px 24px',
      borderRadius: '8px',
      border: 'none',
      cursor: 'pointer',
      opacity: '0.5',
    } satisfies Partial<CSSStyleDeclaration>);

    const closeEarlyButton = document.createElement('button');
    closeEarlyButton.textContent = 'Erken Kapat (test)';
    Object.assign(closeEarlyButton.style, {
      padding: '6px 16px',
      borderRadius: '8px',
      border: '1px solid #6b7280',
      background: 'transparent',
      color: '#9ca3af',
      cursor: 'pointer',
      fontSize: '12px',
    } satisfies Partial<CSSStyleDeclaration>);

    overlay.append(label, countdown, closeButton, closeEarlyButton);
    document.body.appendChild(overlay);

    let remainingMs = durationMs;
    let finished = false;

    const finish = (outcome: MockAdOutcome) => {
      if (finished) return;
      finished = true;
      clearInterval(tickHandle);
      overlay.remove();
      resolve(outcome);
    };

    const tickHandle = setInterval(() => {
      remainingMs -= 200;
      countdown.textContent = String(Math.max(0, Math.ceil(remainingMs / 1000)));
      if (remainingMs <= 0) {
        closeButton.disabled = false;
        closeButton.style.opacity = '1';
      }
    }, 200);

    countdown.textContent = String(Math.ceil(remainingMs / 1000));

    closeButton.addEventListener('click', () => finish('completed'));
    closeEarlyButton.addEventListener('click', () => finish('closed-early'));
  });
}
