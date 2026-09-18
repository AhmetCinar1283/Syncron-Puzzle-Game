import { describe, expect, it } from 'vitest';
import { canOfferSkip, isPlayerStuck, msUntilTimeThreshold, SKIP_LEVEL_UI_CONFIG } from './skipLevelConfig';

const config = { minFailedAttempts: 3, minSecondsInLevel: 120, allowChapterEnd: false };

describe('isPlayerStuck', () => {
  it('is not stuck before either threshold', () => {
    expect(isPlayerStuck({ failedAttempts: 2, elapsedMs: 119_000 }, config)).toBe(false);
  });

  it('is stuck after enough failed attempts', () => {
    expect(isPlayerStuck({ failedAttempts: 3, elapsedMs: 0 }, config)).toBe(true);
  });

  it('is stuck after enough time in the level', () => {
    expect(isPlayerStuck({ failedAttempts: 0, elapsedMs: 120_000 }, config)).toBe(true);
  });

  it('reports the time left to the time threshold', () => {
    expect(msUntilTimeThreshold(100_000, config)).toBe(20_000);
    expect(msUntilTimeThreshold(500_000, config)).toBe(0);
  });
});

describe('canOfferSkip', () => {
  const base = { isCampaignLevel: true, serverConfigured: true, alreadyProgressed: false, isChapterEnd: false };

  it('offers an ordinary campaign level', () => {
    expect(canOfferSkip(base, config)).toBe(true);
  });

  it('never offers user levels, levels without a server, or progressed levels', () => {
    expect(canOfferSkip({ ...base, isCampaignLevel: false }, config)).toBe(false);
    expect(canOfferSkip({ ...base, serverConfigured: false }, config)).toBe(false);
    expect(canOfferSkip({ ...base, alreadyProgressed: true }, config)).toBe(false);
  });

  it('respects the chapter-end setting', () => {
    expect(canOfferSkip({ ...base, isChapterEnd: true }, config)).toBe(false);
    expect(canOfferSkip({ ...base, isChapterEnd: true }, { ...config, allowChapterEnd: true })).toBe(true);
  });

  it('defaults match the server policy (chapter end not skippable)', () => {
    expect(SKIP_LEVEL_UI_CONFIG.allowChapterEnd).toBe(false);
  });
});
