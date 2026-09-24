import { describe, expect, it } from 'vitest';
import { EMOTES } from '@/game-engine/mascot/emotes';
import { companionAnchor, pickLevelMood, type LevelMoodState } from './levelMascot';

const base: LevelMoodState = { isLocked: false, isCompleted: false, isSkipped: false, isCurrent: false, stars: 0 };

describe('levelMascot', () => {
  it('her durumda katalogda olan bir ifade döndürür', () => {
    const states: LevelMoodState[] = [
      base,
      { ...base, isLocked: true },
      { ...base, isSkipped: true },
      { ...base, isCurrent: true },
      { ...base, isCompleted: true, stars: 3 },
      { ...base, isCompleted: true, stars: 1 },
    ];
    for (const s of states) {
      for (const r of [0, 0.5, 0.999]) expect(EMOTES[pickLevelMood(s, () => r)]).toBeDefined();
    }
  });

  it('kilitli seviyede sevinç değil çekingen ifade seçer', () => {
    for (const r of [0, 0.4, 0.99]) {
      expect(['nervous', 'sad', 'confused']).toContain(pickLevelMood({ ...base, isLocked: true }, () => r));
    }
  });

  it('düğümün merkeze bakan tarafına konur', () => {
    expect(companionAnchor(30, 100, 50, 40).x).toBe('calc(30% + 53px)');
    expect(companionAnchor(70, 100, 50, 40).x).toBe('calc(70% + -53px)');
  });
});
