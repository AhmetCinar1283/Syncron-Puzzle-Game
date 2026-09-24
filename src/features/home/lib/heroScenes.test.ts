import { describe, expect, it } from 'vitest';
import { EMOTES } from '@/game-engine/mascot/emotes';
import { HERO_SCENES, HERO_SINGLES, pickHeroShow } from './heroScenes';

describe('heroScenes', () => {
  it('adımlar sıralı, ifadeler mevcut ve birbirine binmiyor', () => {
    for (const s of HERO_SCENES) {
      let prevEnd = 0;
      for (const step of s.steps) {
        expect(step.at).toBeGreaterThanOrEqual(prevEnd);
        if (step.emote) {
          expect(EMOTES[step.emote]).toBeDefined();
          const looping = EMOTES[step.emote].loop;
          prevEnd = looping ? step.at : step.at + EMOTES[step.emote].duration;
        }
      }
      expect(s.duration).toBeGreaterThanOrEqual(prevEnd);
    }
    for (const e of HERO_SINGLES) expect(EMOTES[e]).toBeDefined();
  });

  it('aynı sahneyi art arda seçmez', () => {
    for (let i = 0; i < 200; i++) {
      const pick = pickHeroShow(Math.random, 'hello');
      if (pick.kind === 'scene') expect(pick.scene.id).not.toBe('hello');
    }
  });
});
