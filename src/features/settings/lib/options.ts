/**
 * DOSYA AMACI: Performans ve görsellik ayarlarının seçenek sırası ile çeviri
 * anahtarları. Değerler `services/settings` tiplerinden gelir.
 */

import type { MotionPreference, RendererPreference } from '@/services/settings';

export const RENDERER_OPTIONS: { value: RendererPreference; labelKey: string }[] = [
  { value: 'auto', labelKey: 'settings.renderer_auto' },
  { value: 'dom', labelKey: 'settings.renderer_dom' },
  { value: 'canvas', labelKey: 'settings.renderer_canvas' },
];

export const MOTION_OPTIONS: { value: MotionPreference; labelKey: string }[] = [
  { value: 'auto', labelKey: 'settings.motion_auto' },
  { value: 'full', labelKey: 'settings.motion_full' },
  { value: 'lite', labelKey: 'settings.motion_lite' },
];
