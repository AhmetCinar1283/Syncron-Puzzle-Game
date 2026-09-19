import { describe, it, expect } from 'vitest';
import {
  calculateCircuitLayout,
  generateSmoothSvgPath,
} from './circuitCalculations';

describe('circuitCalculations', () => {
  describe('calculateCircuitLayout', () => {
    it('calculates dynamic heights proportional to level counts', () => {
      const layout13 = calculateCircuitLayout(13, true);
      const layout50 = calculateCircuitLayout(50, true);

      expect(layout13.nodePoints.length).toBe(13);
      expect(layout50.nodePoints.length).toBe(50);

      // 50 seviyenin tuval yüksekliği 13 seviyeden belirgin şekilde daha büyük olmalı
      expect(layout50.canvasHeight).toBeGreaterThan(layout13.canvasHeight);

      // Her seviye arasındaki dikey mesafe sabit olmalı (üst üste binmeyi önler)
      const diff13 = layout13.nodePoints[1].yPx - layout13.nodePoints[0].yPx;
      const diff50 = layout50.nodePoints[1].yPx - layout50.nodePoints[0].yPx;
      expect(diff13).toBe(120);
      expect(diff50).toBe(120);
    });

    it('keeps x percentages within thumb-reachable bounds (20% - 80%)', () => {
      const layout = calculateCircuitLayout(20, false);
      for (const point of layout.nodePoints) {
        expect(point.xPercent).toBeGreaterThanOrEqual(20);
        expect(point.xPercent).toBeLessThanOrEqual(80);
      }
    });

    it('positions start and end portals properly relative to nodes', () => {
      const layout = calculateCircuitLayout(10, true);
      expect(layout.startPortal.yPx).toBeLessThan(layout.nodePoints[0].yPx);
      expect(layout.endPortal.yPx).toBeGreaterThan(layout.nodePoints[9].yPx);
    });
  });

  describe('generateSmoothSvgPath', () => {
    it('returns empty string for less than 2 points', () => {
      expect(generateSmoothSvgPath([])).toBe('');
      expect(generateSmoothSvgPath([{ x: 10, y: 10 }])).toBe('');
    });

    it('generates a valid SVG path for multiple points', () => {
      const points = [
        { x: 50, y: 20 },
        { x: 70, y: 140 },
        { x: 30, y: 260 },
      ];
      const path = generateSmoothSvgPath(points);
      expect(path).toContain('M 50 20');
      expect(path).toContain('Q');
      expect(path).toContain('T 30 260');
    });
  });
});
