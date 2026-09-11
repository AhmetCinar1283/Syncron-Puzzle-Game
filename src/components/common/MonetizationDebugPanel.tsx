/**
 * DOSYA AMACI: `NEXT_PUBLIC_PLATFORM=mock` sırasında sağ altta görünen geliştirici
 * paneli. Sahte reklam senaryosunu değiştirmeyi, interstitial/rewarded'ı elle
 * tetiklemeyi ve sıklık politikasının anlık durumunu görmeyi sağlar. Başka
 * platformlarda render edilmez ve hiçbir build'e bundle'ının girmesi
 * gerekmez — layout tarafında lazy import ile yüklenir.
 */
'use client';

import { useCallback, useState, type CSSProperties } from 'react';
import { CURRENT_PLATFORM, adService } from '@/services/monetization';
import { getMockScenario, setMockScenario, type MockScenario } from '@/services/monetization/providers/mock/scenario';
import { useAds } from '@/contexts/MonetizationContext';

const SCENARIOS: MockScenario[] = ['success', 'no-fill', 'error', 'timeout', 'user-closed'];

export function MonetizationDebugPanel() {
  const { requestInterstitial, showRewarded } = useAds();
  const [scenario, setScenario] = useState<MockScenario>(() => getMockScenario());
  const [lastResult, setLastResult] = useState<string>('—');
  const [busy, setBusy] = useState(false);

  const refreshLastResult = useCallback((label: string, result: unknown) => {
    setLastResult(`${label}: ${JSON.stringify(result)}`);
  }, []);

  const handleScenarioChange = (next: MockScenario) => {
    setScenario(next);
    setMockScenario(next);
  };

  const handleInterstitial = async () => {
    setBusy(true);
    const result = await requestInterstitial();
    refreshLastResult('interstitial', result);
    setBusy(false);
  };

  const handleRewarded = async () => {
    setBusy(true);
    const result = await showRewarded();
    refreshLastResult('rewarded', result);
    setBusy(false);
  };

  if (CURRENT_PLATFORM !== 'mock') return null;

  const policy = adService.getPolicyStateSnapshot();

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 12,
        right: 12,
        zIndex: 999999,
        background: 'rgba(15, 23, 42, 0.95)',
        color: '#e2e8f0',
        border: '1px solid #334155',
        borderRadius: 10,
        padding: 12,
        fontSize: 11,
        fontFamily: 'monospace',
        width: 220,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      <strong>Monetization (mock)</strong>

      <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        Senaryo
        <select
          value={scenario}
          onChange={(e) => handleScenarioChange(e.target.value as MockScenario)}
          style={{ background: '#1e293b', color: '#e2e8f0', border: '1px solid #334155', borderRadius: 6, padding: 4 }}
        >
          {SCENARIOS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </label>

      <div style={{ display: 'flex', gap: 6 }}>
        <button onClick={handleInterstitial} disabled={busy} style={buttonStyle}>Interstitial</button>
        <button onClick={handleRewarded} disabled={busy} style={buttonStyle}>Rewarded</button>
      </div>

      <div style={{ opacity: 0.8 }}>
        tamamlanan: {policy.totalCompleted} · son reklamdan: {policy.levelsSinceLastAd} level
      </div>
      <div style={{ opacity: 0.8, wordBreak: 'break-all' }}>{lastResult}</div>
    </div>
  );
}

const buttonStyle: CSSProperties = {
  flex: 1,
  background: '#1e293b',
  color: '#e2e8f0',
  border: '1px solid #334155',
  borderRadius: 6,
  padding: '4px 6px',
  cursor: 'pointer',
};
