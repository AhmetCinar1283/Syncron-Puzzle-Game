/**
 * DOSYA AMACI: Ses servisinin ortak tipleri. Bir ses ya bir dosyadan gelir
 * (`file`) ya da açılışta yazılımla üretilir (`synth`); ikisi de aynı
 * `AudioBuffer` yolundan çalar.
 */

export type SoundChannel = 'game' | 'menu';

/**
 * Sentez tarifi: `duration` saniye uzunluğunda bir buffer için `build`,
 * verilen offline context'in `destination`'ına düğümleri kurar.
 */
export interface SynthRecipe {
  duration: number;
  build: (ctx: OfflineAudioContext) => void;
}

export type SoundSource =
  | { kind: 'file'; url: string }
  | { kind: 'synth'; recipe: SynthRecipe };

export interface SoundDef {
  /** Varsayılan kanal; `play(id, channel)` ile ezilebilir. */
  channel: SoundChannel;
  /** Kanal gain'inden önce uygulanan ses seviyesi (0–1). */
  volume: number;
  /** Her çalışta playbackRate'e uygulanan rastgele ± sapma oranı (ör. 0.03). */
  pitchJitter?: number;
  source: SoundSource;
}
