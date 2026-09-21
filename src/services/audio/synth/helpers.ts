/**
 * DOSYA AMACI: Sentez tarifleri için küçük yapı taşı. Tek bir zarflı
 * (attack/decay) osilatör notası ekler.
 */

export interface ToneOptions {
  type?: OscillatorType;
  freq: number;
  /** Verilirse frekans `start`'tan `start + dur`'a üstel olarak buraya kayar. */
  freqEnd?: number;
  /** Nota başlangıcı (saniye). */
  start?: number;
  dur: number;
  gain?: number;
  /** Yükselme süresi (saniye); tık sesini önlemek için kısa tutulur. */
  attack?: number;
}

export function tone(ctx: BaseAudioContext, opts: ToneOptions): void {
  const { type = 'sine', freq, freqEnd, start = 0, dur, gain = 0.5, attack = 0.004 } = opts;
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (freqEnd !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), start + dur);
  }
  amp.gain.setValueAtTime(0.0001, start);
  amp.gain.linearRampToValueAtTime(gain, start + attack);
  amp.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  osc.connect(amp);
  amp.connect(ctx.destination);
  osc.start(start);
  osc.stop(start + dur + 0.01);
}
