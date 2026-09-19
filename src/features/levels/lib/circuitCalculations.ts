/**
 * DOSYA AMACI: Kozmik Rota (Constellation Circuit) için dinamik yükseklik,
 * kıvrımlı düğüm koordinatları ve pürüzsüz SVG Bezier eğri yollarını hesaplayan saf matematik modülü.
 */

export interface CircuitPoint {
  xPercent: number; // 0-100 arası yatay yüzde
  yPx: number;      // Piksel cinsinden dikey konum
}

export interface CircuitLayout {
  canvasHeight: number;
  rowSpacing: number;
  startPortal: CircuitPoint;
  endPortal: CircuitPoint;
  nodePoints: CircuitPoint[];
}

/**
 * Seviye sayısı ve cihaz moduna göre dinamik rotanın geometrik haritasını çıkarır.
 */
export function calculateCircuitLayout(
  levelCount: number,
  isMobile: boolean,
): CircuitLayout {
  const rowSpacing = isMobile ? 120 : 140;
  const topPadding = isMobile ? 90 : 110;
  const bottomPadding = isMobile ? 120 : 140;

  const nodePoints: CircuitPoint[] = [];

  for (let i = 0; i < levelCount; i++) {
    // 24% ile 76% arasında yumuşak sinüs dalgası
    const x = Math.round(50 + 26 * Math.sin(i * 0.68));
    const y = topPadding + i * rowSpacing;
    nodePoints.push({ xPercent: x, yPx: y });
  }

  const startPortal: CircuitPoint = {
    xPercent: 50,
    yPx: Math.max(30, topPadding - Math.round(rowSpacing * 0.6)),
  };

  const lastNodeY = levelCount > 0 ? topPadding + (levelCount - 1) * rowSpacing : topPadding;
  const endPortal: CircuitPoint = {
    xPercent: 50,
    yPx: lastNodeY + Math.round(rowSpacing * 0.8),
  };

  const canvasHeight = endPortal.yPx + bottomPadding;

  return {
    canvasHeight,
    rowSpacing,
    startPortal,
    endPortal,
    nodePoints,
  };
}

/**
 * Verilen piksel noktaları arasında organik, pürüzsüz bir SVG Bezier yolu (`d` attribute) üretir.
 */
export function generateSmoothSvgPath(
  points: Array<{ x: number; y: number }>,
): string {
  if (points.length < 2) return '';

  let d = `M ${points[0].x} ${points[0].y}`;

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];

    // Orta kontrol noktası ile yumuşak kuadratik / kübik eğri
    const midX = (p0.x + p1.x) / 2;
    const midY = (p0.y + p1.y) / 2;

    d += ` Q ${p0.x} ${midY}, ${midX} ${midY} T ${p1.x} ${p1.y}`;
  }

  return d;
}
