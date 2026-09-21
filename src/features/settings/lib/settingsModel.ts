/**
 * DOSYA AMACI: Ayarlar ekranının bildirimsel (declarative) modelini tanımlar.
 * Her ayar bir "satır" (toggle / slider / segment), satırlar da bir "grup"
 * içinde toplanır. Sayfa ve modal aynı grupları render eder; gezinme (klavye,
 * gamepad) de bu model üzerinden tek yerde çalışır — yeni ayar = gruba yeni satır.
 */

import type { LucideIcon } from 'lucide-react';
import type { IconName } from '@/components/icons/types';

interface RowBase {
  /** Benzersiz kimlik (odak ve React key olarak kullanılır). */
  id: string;
  /** Çevrilmiş satır etiketi. */
  label: string;
  /** Çevrilmiş kısa açıklama (opsiyonel). */
  description?: string;
}

/** Aç/kapa ayarı. */
export interface ToggleRow extends RowBase {
  kind: 'toggle';
  value: boolean;
  onLabel: string;
  offLabel: string;
  onChange: (value: boolean) => void;
}

/** 0-100 gibi bir aralıkta kaydırıcı ayarı. */
export interface SliderRow extends RowBase {
  kind: 'slider';
  value: number;
  min: number;
  max: number;
  /** Fare/dokunma adımı. */
  step: number;
  /** Klavye/gamepad ile her basışta değişen miktar. */
  keyStep: number;
  disabled?: boolean;
  onChange: (value: number) => void;
}

export interface SegmentOption {
  value: string;
  label: string;
  /** Seçili durumda vurgu rengi (örn. tema rengi). */
  accent?: string;
  icon?: IconName;
}

/** Birden fazla seçenekten birini seçme ayarı. */
export interface SegmentRow extends RowBase {
  kind: 'segment';
  /** `inline`: yan yana düğmeler, `grid`: kart ızgarası. */
  layout: 'inline' | 'grid';
  options: SegmentOption[];
  value: string;
  onChange: (value: string) => void;
}

export type SettingRow = ToggleRow | SliderRow | SegmentRow;

export interface SettingsGroup {
  id: string;
  title: string;
  description?: string;
  icon: LucideIcon;
  rows: SettingRow[];
}
