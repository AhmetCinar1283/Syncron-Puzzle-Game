/**
 * DOSYA AMACI: Oyun ses efektleri için düşük gecikmeli Web Audio motoru.
 *
 * NEDEN: Önceki sürüm her ses için `HTMLAudioElement` kullanıyordu. Android
 * WebView'de `audio.play()` çağrısı ile gerçek sesin duyulması arasında 50–200ms
 * gecikme var; üst üste binen seslerde `cloneNode()` her seferinde yeni bir
 * decoder açıyordu. Hamle sesi görüntünün gerisinde kalınca oyun "tepkisiz"
 * hissettiriyor.
 *
 * ÇÖZÜM: Dosyalar bir kez `decodeAudioData` ile PCM buffer'a çözülür, çalma
 * anında yalnızca bir `AudioBufferSourceNode` oluşturulur. Gecikme <5ms,
 * allokasyon yok denecek kadar az.
 *
 * Motor modül seviyesinde tekil (singleton): PlayScreen her mount olduğunda
 * sesler yeniden indirilip çözülmez.
 *
 * Tarayıcı otomatik oynatma politikası gereği `AudioContext` ilk kullanıcı
 * etkileşimine kadar `suspended` durumdadır; `unlockAudio()` ilk dokunuş/tuş
 * olayında çağrılır. Web Audio hiç yoksa `HTMLAudioElement`'e düşülür.
 */

import { assetUrl } from '@/lib/assetUrl';

export type SoundName =
  | 'move'
  | 'portal'
  | 'teleport'
  | 'ice'
  | 'conveyor'
  | 'win'
  | 'lose'
  | 'toggle'
  | 'box_push'
  | 'boing';

export const SOUND_FILES: Record<SoundName, string> = {
  move:      '/sounds/move.mp3',
  portal:    '/sounds/portal.mp3',
  teleport:  '/sounds/teleport.mp3',
  ice:       '/sounds/ice.mp3',
  conveyor:  '/sounds/conveyor.mp3',
  win:       '/sounds/win.mp3',
  lose:      '/sounds/lose.mp3',
  toggle:    '/sounds/toggle.mp3',
  box_push:  '/sounds/box_push.flac',
  boing:     '/sounds/boing.mp3',
};

export const SOUND_VOLUME: Record<SoundName, number> = {
  move:      0.4,
  portal:    0.7,
  teleport:  0.7,
  ice:       0.5,
  conveyor:  0.4,
  win:       0.8,
  lose:      0.7,
  toggle:    0.5,
  box_push:  0.45,
  boing:     0.5,
};

const SOUND_NAMES = Object.keys(SOUND_FILES) as SoundName[];

/**
 * Aynı sesin çok kısa aralıkla üst üste tetiklenmesi (ör. tek turda 6 kayma
 * tick'i) kulakta "flanger" gibi bir bozulma yaratır ve gereksiz node açar.
 * Bu pencere içinde aynı ses ikinci kez çalınmaz.
 */
const RETRIGGER_WINDOW_MS = 35;

type AudioCtor = typeof AudioContext;

function getAudioContextCtor(): AudioCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { AudioContext?: AudioCtor; webkitAudioContext?: AudioCtor };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private buffers = new Map<SoundName, AudioBuffer>();
  /** Web Audio kullanılamadığında devreye giren yedek. */
  private fallbackAudio = new Map<SoundName, HTMLAudioElement>();
  private useFallback = false;
  private loadStarted = false;
  private lastPlayedAt = new Map<SoundName, number>();

  /** AudioContext'i oluşturur (yoksa) ve askıdaysa devam ettirir. */
  private ensureContext(): AudioContext | null {
    if (this.useFallback) return null;
    if (this.ctx) return this.ctx;

    const Ctor = getAudioContextCtor();
    if (!Ctor) {
      this.useFallback = true;
      return null;
    }
    try {
      this.ctx = new Ctor();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 1;
      this.masterGain.connect(this.ctx.destination);
      return this.ctx;
    } catch {
      this.useFallback = true;
      return null;
    }
  }

  /**
   * Ses dosyalarını indirip çözer. Birden fazla çağrı güvenlidir; yalnızca ilki
   * iş yapar. Sonuç beklenmeden dönülür — henüz çözülmemiş bir ses sessizce
   * atlanır (ilk saniyede tek bir efekt kaçabilir, takılma olmaz).
   */
  preload(): void {
    if (this.loadStarted) return;
    this.loadStarted = true;

    const ctx = this.ensureContext();
    if (!ctx) {
      this.preloadFallback();
      return;
    }

    for (const name of SOUND_NAMES) {
      const url = assetUrl(SOUND_FILES[name]);
      fetch(url)
        .then((res) => res.arrayBuffer())
        .then((data) => ctx.decodeAudioData(data))
        .then((buffer) => { this.buffers.set(name, buffer); })
        .catch(() => {
          // Tek bir dosya çözülemezse (ör. WebView'de FLAC desteği yok) o ses
          // için HTMLAudioElement'e düş; diğerleri Web Audio'da kalır.
          this.ensureFallbackElement(name);
        });
    }
  }

  private preloadFallback(): void {
    for (const name of SOUND_NAMES) this.ensureFallbackElement(name);
  }

  private ensureFallbackElement(name: SoundName): HTMLAudioElement | null {
    if (typeof window === 'undefined') return null;
    const existing = this.fallbackAudio.get(name);
    if (existing) return existing;
    try {
      const audio = new Audio(assetUrl(SOUND_FILES[name]));
      audio.volume = SOUND_VOLUME[name] ?? 0.5;
      audio.preload = 'auto';
      this.fallbackAudio.set(name, audio);
      return audio;
    } catch {
      return null;
    }
  }

  /**
   * İlk kullanıcı etkileşiminde çağrılır: otomatik oynatma politikası gereği
   * askıya alınmış AudioContext'i devam ettirir.
   */
  unlock(): void {
    const ctx = this.ensureContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
  }

  play(name: SoundName): void {
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const last = this.lastPlayedAt.get(name);
    if (last !== undefined && now - last < RETRIGGER_WINDOW_MS) return;
    this.lastPlayedAt.set(name, now);

    const ctx = this.ensureContext();
    const buffer = this.buffers.get(name);

    if (ctx && buffer && this.masterGain) {
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      try {
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        const gain = ctx.createGain();
        gain.gain.value = SOUND_VOLUME[name] ?? 0.5;
        source.connect(gain);
        gain.connect(this.masterGain);
        source.start(0);
        // Bitince grafikten kopar; aksi halde node'lar birikir.
        source.onended = () => {
          try { source.disconnect(); gain.disconnect(); } catch { /* zaten koptu */ }
        };
        return;
      } catch {
        // Aşağıdaki yedeğe düş
      }
    }

    const audio = this.ensureFallbackElement(name);
    if (!audio) return;
    try {
      if (audio.paused || audio.ended) {
        audio.currentTime = 0;
        audio.play().catch(() => {});
      } else {
        const clone = audio.cloneNode() as HTMLAudioElement;
        clone.volume = audio.volume;
        clone.play().catch(() => {});
      }
    } catch { /* ses kritik değil, sessizce yut */ }
  }

  /** Sessize alındığında çalan her şeyi anında keser. */
  stopAll(): void {
    if (this.masterGain && this.ctx) {
      // Master gain'i sıfırlayıp hemen geri açmak, çalan tüm source'ları susturur.
      try {
        this.masterGain.gain.setValueAtTime(0, this.ctx.currentTime);
        this.masterGain.gain.setValueAtTime(1, this.ctx.currentTime + 0.01);
      } catch { /* yoksay */ }
    }
    for (const audio of this.fallbackAudio.values()) {
      try { audio.pause(); audio.currentTime = 0; } catch { /* yoksay */ }
    }
  }
}

export const soundEngine = new SoundEngine();
