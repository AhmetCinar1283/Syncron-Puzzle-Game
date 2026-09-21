/**
 * DOSYA AMACI: Bir ayar satırını türüne (toggle / slider / segment) göre uygun
 * görünüme yönlendiren tek dağıtıcı.
 */

'use client';

import React from 'react';
import type { SettingRow } from '../../lib/settingsModel';
import { SegmentRowView } from './SegmentRowView';
import { SliderRowView } from './SliderRowView';
import { ToggleRowView } from './ToggleRowView';

interface Props {
  row: SettingRow;
  focused: boolean;
  onFocus: (id: string) => void;
}

export function SettingRowView({ row, focused, onFocus }: Props) {
  switch (row.kind) {
    case 'toggle':
      return <ToggleRowView row={row} focused={focused} onFocus={onFocus} />;
    case 'slider':
      return <SliderRowView row={row} focused={focused} onFocus={onFocus} />;
    case 'segment':
      return <SegmentRowView row={row} focused={focused} onFocus={onFocus} />;
  }
}
