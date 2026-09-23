import { describe, it, expect, vi } from 'vitest';

vi.mock('react', () => ({
  useCallback: (fn: (...args: unknown[]) => unknown) => fn,
}));

vi.mock('@/services/audio', () => ({
  soundEngine: {
    playMenu: vi.fn(),
    playGame: vi.fn(),
  },
}));

import { useLevelAudio } from '../useLevelAudio';
import { soundEngine } from '@/services/audio';

describe('useLevelAudio', () => {
  it('plays ui.navigate sound when playSector is invoked', () => {
    const audio = useLevelAudio();
    audio.playSector();

    expect(soundEngine.playMenu).toHaveBeenCalledWith('ui.navigate');
  });

  it('plays ui.tick when playTick is invoked', () => {
    const audio = useLevelAudio();
    audio.playTick();

    expect(soundEngine.playMenu).toHaveBeenCalledWith('ui.tick');
  });
});
