/**
 * DOSYA AMACI: Ana menü kartları arasında klavye/gamepad gezinmesi. Kart ızgarası
 * 2 sütunludur; "hero" kartlar tam satır kaplar. Satırlar kart listesinden türetilir,
 * böylece kart eklemek/kaldırmak (platform yeteneklerine göre) haritayı bozmaz.
 * `-1` = profil rozeti (ızgaranın üstü).
 */

export type MenuDirection = 'up' | 'down' | 'left' | 'right';

export const PROFILE_INDEX = -1;

/** Kart indekslerini ekrandaki satırlara böler. */
export function buildMenuRows(heroFlags: readonly boolean[]): number[][] {
  const rows: number[][] = [];
  let pending: number[] = [];
  heroFlags.forEach((isHero, index) => {
    if (isHero) {
      if (pending.length) rows.push(pending);
      pending = [];
      rows.push([index]);
    } else {
      pending.push(index);
      if (pending.length === 2) {
        rows.push(pending);
        pending = [];
      }
    }
  });
  if (pending.length) rows.push(pending);
  return rows;
}

export function moveMenuSelection(current: number, direction: MenuDirection, heroFlags: readonly boolean[]): number {
  const rows = buildMenuRows(heroFlags);
  if (rows.length === 0) return current;
  const lastRow = rows.length - 1;

  if (current === PROFILE_INDEX) {
    if (direction === 'down') return rows[0][0];
    if (direction === 'up') return rows[lastRow][0];
    return current;
  }

  const rowIndex = rows.findIndex((row) => row.includes(current));
  if (rowIndex === -1) return current;
  const row = rows[rowIndex];
  const col = row.indexOf(current);

  switch (direction) {
    case 'left':
      return col > 0 ? row[col - 1] : current;
    case 'right':
      return col < row.length - 1 ? row[col + 1] : current;
    case 'up': {
      if (rowIndex === 0) return PROFILE_INDEX;
      const above = rows[rowIndex - 1];
      return above[Math.min(col, above.length - 1)];
    }
    case 'down': {
      if (rowIndex === lastRow) return rows[0][0];
      const below = rows[rowIndex + 1];
      return below[Math.min(col, below.length - 1)];
    }
  }
}
