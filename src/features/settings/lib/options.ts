/**
 * DOSYA AMACI: Performans ve görsellik ayarlarının seçenek sırası ile çeviri
 * anahtarları. Değerler `services/settings` tiplerinden gelir.
 */

import type { ControlScheme, MotionPreference, PadSide, RendererPreference } from '@/services/settings';

export const RENDERER_OPTIONS: { value: RendererPreference; labelKey: string }[] = [
  { value: 'auto', labelKey: 'settings.renderer_auto' },
  { value: 'dom', labelKey: 'settings.renderer_dom' },
  { value: 'hybrid', labelKey: 'settings.renderer_hybrid' },
  { value: 'canvas', labelKey: 'settings.renderer_canvas' },
];

export const MOTION_OPTIONS: { value: MotionPreference; labelKey: string }[] = [
  { value: 'auto', labelKey: 'settings.motion_auto' },
  { value: 'full', labelKey: 'settings.motion_full' },
  { value: 'lite', labelKey: 'settings.motion_lite' },
];

export const SCHEME_OPTIONS: { value: ControlScheme; labelKey: string }[] = [
  { value: 'both', labelKey: 'settings.scheme_both' },
  { value: 'buttons', labelKey: 'settings.scheme_buttons' },
  { value: 'swipe', labelKey: 'settings.scheme_swipe' },
];

export const PAD_SIDE_OPTIONS: { value: PadSide; labelKey: string }[] = [
  { value: 'left', labelKey: 'settings.pad_side_left' },
  { value: 'right', labelKey: 'settings.pad_side_right' },
];
