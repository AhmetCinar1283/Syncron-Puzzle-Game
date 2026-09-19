import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { THEME_CURSORS, getThemeCursors, encodeSvgForCursor, generateThemeCursorsCss, getFullCursorsStylesheet } from '../themeCursors';
import { ALL_THEMES, GameTheme } from '../themeConfig';

describe('themeCursors', () => {
  it('should define cursor sets for all game themes', () => {
    for (const themeDef of ALL_THEMES) {
      const cursorSet = THEME_CURSORS[themeDef.id];
      expect(cursorSet).toBeDefined();
      expect(cursorSet.theme).toBe(themeDef.id);

      // Check all 7 cursor states
      const types = ['default', 'pointer', 'crosshair', 'text', 'grab', 'grabbing', 'notAllowed'] as const;
      for (const t of types) {
        const cursor = cursorSet[t];
        expect(cursor).toBeDefined();
        expect(cursor.type).toBe(t);
        expect(cursor.hotspot).toHaveLength(2);
        expect(typeof cursor.hotspot[0]).toBe('number');
        expect(typeof cursor.hotspot[1]).toBe('number');
        expect(cursor.svg).toContain('<svg');
        expect(cursor.svg).toContain('xmlns="http://www.w3.org/2000/svg"');
        expect(cursor.svg).toContain('width="24"');
        expect(cursor.svg).toContain('height="24"');
        expect(cursor.cssValue).toMatch(/^url\("data:image\/svg\+xml,[^"]+"\)\s+\d+\s+\d+,\s+[\w-]+$/);
      }
    }
  });

  it('getThemeCursors should return fallback arcade cursors for unknown theme', () => {
    const unknown = getThemeCursors('unknown' as GameTheme);
    expect(unknown).toBeDefined();
    expect(unknown.theme).toBe('arcade');
  });

  it('encodeSvgForCursor properly encodes SVG data URL', () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"><circle cx="12" cy="12" r="6" fill="#facc15"/></svg>';
    const encoded = encodeSvgForCursor(svg);
    expect(encoded).toContain('data:image/svg+xml,');
    expect(encoded).toContain('%23facc15');
  });

  it('generateThemeCursorsCss produces valid CSS declarations', () => {
    const css = generateThemeCursorsCss();
    expect(css).toContain(':root {');
    expect(css).toContain('[data-game-theme="arcade"] {');
    expect(css).toContain('[data-game-theme="legacy"] {');
    expect(css).toContain('[data-game-theme="neon"] {');
    expect(css).toContain('[data-game-theme="blueprint"] {');
    expect(css).toContain('[data-game-theme="cosmic"] {');
    expect(css).toContain('--cursor-default:');
    expect(css).toContain('--cursor-pointer:');
    expect(css).toContain('--cursor-crosshair:');
    expect(css).toContain('--cursor-text:');
  });

  it('cursors.css matches getFullCursorsStylesheet', () => {
    const cssPath = path.resolve(__dirname, '../../../../src/app/cursors.css');
    const expected = getFullCursorsStylesheet();
    if (!fs.existsSync(cssPath) || fs.readFileSync(cssPath, 'utf8') !== expected) {
      fs.writeFileSync(cssPath, expected, 'utf8');
    }
    expect(fs.readFileSync(cssPath, 'utf8')).toBe(expected);
  });
});
