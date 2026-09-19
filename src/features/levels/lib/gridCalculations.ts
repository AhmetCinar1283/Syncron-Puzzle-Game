/**
 * DOSYA AMACI: 2D Grid Matrisi navigasyon hesaplamaları, sütun belirleme
 * ve yıldız toplama fonksiyonlarını barındıran saf mantık kütüphanesi.
 */

export type GridNavDirection = 'up' | 'down' | 'left' | 'right';

/**
 * Ekran genişliğine göre grid için ideal sütun sayısını belirler.
 * Mobilde parmak dokunma hedeflerini geniş tutmak için 4, tablette 6, geniş ekranda 8 sütun.
 */
export function getResponsiveColumnCount(width: number): number {
  if (width < 380) return 3;
  if (width < 640) return 4;
  if (width < 1024) return 6;
  return 8;
}

/**
 * 2D ızgara üzerinde yön tuşları veya gamepad ile hareket ederken yeni indeksi hesaplar.
 * Satır ve sütun sınırlarını aşmayı engeller veya mantıklı bir şekilde sınırlandırır.
 */
export function calculateNextGridIndex(
  currentIndex: number,
  totalItems: number,
  direction: GridNavDirection,
  columns: number,
): number {
  if (totalItems <= 0) return 0;
  const safeCurrent = Math.max(0, Math.min(currentIndex, totalItems - 1));
  const safeCols = Math.max(1, columns);

  switch (direction) {
    case 'left':
      return Math.max(0, safeCurrent - 1);

    case 'right':
      return Math.min(totalItems - 1, safeCurrent + 1);

    case 'up': {
      const next = safeCurrent - safeCols;
      return next >= 0 ? next : safeCurrent;
    }

    case 'down': {
      const next = safeCurrent + safeCols;
      if (next < totalItems) return next;
      // Son satırda kolon tam dolmamışsa son elemana odaklan
      const currentRow = Math.floor(safeCurrent / safeCols);
      const lastRow = Math.floor((totalItems - 1) / safeCols);
      if (currentRow < lastRow) return totalItems - 1;
      return safeCurrent;
    }
  }
}

/**
 * Belirli seviyelerin ve oynama kayıtlarının yıldız toplamını hesaplar.
 */
export function calculateChapterStars(
  levels: Array<{ firestoreId?: string }>,
  playedMap: Map<string, { stars?: 1 | 2 | 3 }>,
): { earned: number; max: number } {
  let earned = 0;
  let max = 0;

  for (const lv of levels) {
    if (!lv.firestoreId) continue;
    max += 3;
    const played = playedMap.get(lv.firestoreId);
    if (played?.stars) {
      earned += played.stars;
    }
  }

  return { earned, max };
}
