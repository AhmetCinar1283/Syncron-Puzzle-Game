import { describe, expect, it } from 'vitest';
import { buildMenuRows, moveMenuSelection, PROFILE_INDEX } from './menuGrid';

// play(hero) levels editor friends controls admin(hero) — önceki elle yazılmış haritanın düzeni.
const WEB_ADMIN = [true, false, false, false, false, true];

describe('menuGrid', () => {
  it('builds rows with full-width hero cards', () => {
    expect(buildMenuRows(WEB_ADMIN)).toEqual([[0], [1, 2], [3, 4], [5]]);
    expect(buildMenuRows([true, true, false, false, false])).toEqual([[0], [1], [2, 3], [4]]);
  });

  it('reproduces the previous hand-written navigation for the 6-card layout', () => {
    expect(moveMenuSelection(0, 'up', WEB_ADMIN)).toBe(PROFILE_INDEX);
    expect(moveMenuSelection(PROFILE_INDEX, 'up', WEB_ADMIN)).toBe(5);
    expect(moveMenuSelection(PROFILE_INDEX, 'down', WEB_ADMIN)).toBe(0);
    expect(moveMenuSelection(0, 'down', WEB_ADMIN)).toBe(1);
    expect(moveMenuSelection(2, 'up', WEB_ADMIN)).toBe(0);
    expect(moveMenuSelection(1, 'down', WEB_ADMIN)).toBe(3);
    expect(moveMenuSelection(2, 'down', WEB_ADMIN)).toBe(4);
    expect(moveMenuSelection(4, 'down', WEB_ADMIN)).toBe(5);
    expect(moveMenuSelection(5, 'down', WEB_ADMIN)).toBe(0);
    expect(moveMenuSelection(4, 'up', WEB_ADMIN)).toBe(2);
    expect(moveMenuSelection(2, 'left', WEB_ADMIN)).toBe(1);
    expect(moveMenuSelection(3, 'right', WEB_ADMIN)).toBe(4);
    expect(moveMenuSelection(4, 'right', WEB_ADMIN)).toBe(4);
  });
});
