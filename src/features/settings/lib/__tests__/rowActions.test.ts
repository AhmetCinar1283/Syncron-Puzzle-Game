/**
 * DOSYA AMACI: `rowActions` saf mantığının testleri: toggle, slider ve segment
 * satırlarının klavye/gamepad adımları ve onay davranışı.
 */

import { describe, expect, it, vi } from 'vitest';
import { activateRow, stepRow } from '../rowActions';
import type { SegmentRow, SliderRow, ToggleRow } from '../settingsModel';

const toggle = (value: boolean): ToggleRow => ({
  kind: 'toggle', id: 't', label: 'T', value, onLabel: 'on', offLabel: 'off', onChange: vi.fn(),
});

const slider = (value: number, disabled = false): SliderRow => ({
  kind: 'slider', id: 's', label: 'S', value, min: 0, max: 100, step: 1, keyStep: 5, disabled, onChange: vi.fn(),
});

const segment = (value: string): SegmentRow => ({
  kind: 'segment', id: 'g', label: 'G', layout: 'inline', value, onChange: vi.fn(),
  options: [{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }, { value: 'c', label: 'C' }],
});

describe('rowActions', () => {
  it('toggle: sağ açar, sol kapatır, zaten o durumdaysa değişmez', () => {
    const off = toggle(false);
    stepRow(off, 1);
    expect(off.onChange).toHaveBeenCalledWith(true);

    const on = toggle(true);
    stepRow(on, 1);
    expect(on.onChange).not.toHaveBeenCalled();
    stepRow(on, -1);
    expect(on.onChange).toHaveBeenCalledWith(false);
  });

  it('toggle: onay durumu çevirir', () => {
    const row = toggle(true);
    activateRow(row);
    expect(row.onChange).toHaveBeenCalledWith(false);
  });

  it('slider: keyStep kadar değişir ve sınırlara kelepçelenir', () => {
    const mid = slider(50);
    stepRow(mid, 1);
    expect(mid.onChange).toHaveBeenCalledWith(55);

    const top = slider(98);
    stepRow(top, 1);
    expect(top.onChange).toHaveBeenCalledWith(100);

    const max = slider(100);
    stepRow(max, 1);
    expect(max.onChange).not.toHaveBeenCalled();
  });

  it('slider: devre dışıyken adım atmaz, onay bir şey yapmaz', () => {
    const row = slider(50, true);
    stepRow(row, 1);
    activateRow(row);
    expect(row.onChange).not.toHaveBeenCalled();
  });

  it('segment: seçenekler arasında döngüsel gezer', () => {
    const last = segment('c');
    stepRow(last, 1);
    expect(last.onChange).toHaveBeenCalledWith('a');

    const first = segment('a');
    stepRow(first, -1);
    expect(first.onChange).toHaveBeenCalledWith('c');
  });

  it('segment: onay sonraki seçeneğe geçer', () => {
    const row = segment('a');
    activateRow(row);
    expect(row.onChange).toHaveBeenCalledWith('b');
  });
});
