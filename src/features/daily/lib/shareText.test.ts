import { describe, expect, it } from 'vitest';
import { buildShareText } from './shareText';

const labels = { moves: '{n} hamle', hinted: '💡' };

describe('buildShareText', () => {
  it('matches the planned format with streak and link', () => {
    expect(buildShareText({ number: 142, stars: 3, moveCount: 14, streak: 5, hinted: false, url: 'https://x.test/daily/' }, labels))
      .toBe('Syncron #142 ⭐⭐⭐ 14 hamle 🔥5\nhttps://x.test/daily/');
  });

  it('marks hinted results and omits empty streak and missing link', () => {
    expect(buildShareText({ number: 3, stars: 2, moveCount: 9, streak: 0, hinted: true }, labels))
      .toBe('Syncron #3 ⭐⭐ 9 hamle 💡');
  });

  it('clamps stars', () => {
    expect(buildShareText({ number: 1, stars: 7, moveCount: 1, streak: 1, hinted: false }, labels)).toContain('⭐⭐⭐ ');
  });
});
