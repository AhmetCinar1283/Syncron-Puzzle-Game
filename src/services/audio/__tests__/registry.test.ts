/**
 * DOSYA AMACI: Ses kayıt defterinin bütünlüğünü ve sentez tariflerinin geçerli
 * düğüm grafiği kurduğunu doğrular.
 */

import { describe, expect, it, vi } from 'vitest';
import { SOUNDS, SOUND_IDS } from '../registry';

function fakeCtx() {
  const param = () => ({
    setValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
  });
  const node = () => ({ connect: vi.fn(), start: vi.fn(), stop: vi.fn(), frequency: param(), gain: param(), type: '' });
  return {
    destination: {},
    createOscillator: vi.fn(node),
    createGain: vi.fn(node),
  };
}

describe('SOUNDS registry', () => {
  it('her id namespace\'li, geçerli kanal ve 0–1 arası hacme sahip', () => {
    for (const id of SOUND_IDS) {
      const def = SOUNDS[id];
      expect(id).toMatch(/^(ui|modal|notify|game|reward)\.\w+$/);
      expect(['game', 'menu']).toContain(def.channel);
      expect(def.volume).toBeGreaterThan(0);
      expect(def.volume).toBeLessThanOrEqual(1);
      if (def.pitchJitter !== undefined) expect(def.pitchJitter).toBeLessThan(0.1);
    }
  });

  it('her synth tarifi pozitif sürede ve en az bir osilatör kurar', () => {
    for (const id of SOUND_IDS) {
      const { source } = SOUNDS[id];
      if (source.kind !== 'synth') continue;
      const ctx = fakeCtx();
      expect(source.recipe.duration).toBeGreaterThan(0);
      source.recipe.build(ctx as unknown as OfflineAudioContext);
      expect(ctx.createOscillator).toHaveBeenCalled();
    }
  });

  it('file kaynaklar mutlak /sounds yolu kullanır', () => {
    for (const id of SOUND_IDS) {
      const { source } = SOUNDS[id];
      if (source.kind === 'file') expect(source.url).toMatch(/^\/sounds\//);
    }
  });
});
