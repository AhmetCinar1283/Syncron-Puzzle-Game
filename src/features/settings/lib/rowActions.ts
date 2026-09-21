/**
 * DOSYA AMACI: Bir ayar satırına uygulanan klavye/gamepad eylemlerinin (adım
 * atma, onaylama) saf mantığı. Gezinme hook'u satır türünü bilmek zorunda kalmaz.
 */

import type { SettingRow } from './settingsModel';

export type StepDirection = -1 | 1;

/** Sol/sağ girdisini satıra uygular: toggle aç/kapa, slider ±keyStep, segment döngüsü. */
export function stepRow(row: SettingRow, direction: StepDirection): void {
  switch (row.kind) {
    case 'toggle':
      if (row.value !== (direction > 0)) row.onChange(direction > 0);
      return;
    case 'slider': {
      if (row.disabled) return;
      const next = Math.max(row.min, Math.min(row.max, row.value + direction * row.keyStep));
      if (next !== row.value) row.onChange(next);
      return;
    }
    case 'segment': {
      const count = row.options.length;
      if (count === 0) return;
      const current = row.options.findIndex((o) => o.value === row.value);
      const next = (current + direction + count) % count;
      row.onChange(row.options[next].value);
      return;
    }
  }
}

/** Onay (Enter / A tuşu): toggle'ı çevirir, segment'te sonraki seçeneğe geçer. */
export function activateRow(row: SettingRow): void {
  if (row.kind === 'toggle') row.onChange(!row.value);
  else if (row.kind === 'segment') stepRow(row, 1);
}
