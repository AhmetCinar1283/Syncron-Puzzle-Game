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
import { settingsService, type SoundSettings } from '@/services/settings';
import { SOUNDS, SOUND_IDS, type SoundId } from './registry';
import { renderSynth } from './synth/render';
import type { SoundChannel } from './types';

export type { SoundChannel } from './types';
export type { SoundId } from './registry';

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

export class SoundEngine {
  private ctx: AudioContext | null = null;
  private gameGain: GainNode | null = null;
  private menuGain: GainNode | null = null;
  private buffers = new Map<SoundId, AudioBuffer>();
  /** Web Audio kullanılamadığında devreye giren yedek. */
  private fallbackAudio = new Map<SoundId, HTMLAudioElement>();
  private useFallback = false;
  private loadStarted = false;
  private lastPlayedAt = new Map<string, number>();
  private isAdMuted = false;

  constructor() {
    if (typeof window !== 'undefined') {
      settingsService.subscribe((settings) => {
        this.applySettings(settings.sound);
      });
      // Modül-agnostik: hook mount etmeyen sayfalar (toast, modal...) da ses çalabilsin diye
      // ilk kullanıcı etkileşiminde context açılır ve sesler yüklenir.
      const unlock = () => { this.preload(); this.unlock(); };
      (['pointerdown', 'touchstart', 'keydown'] as const).forEach((ev) =>
        window.addEventListener(ev, unlock, { once: true, passive: true }),
      );
    }
  }

  /**
   * Reklam gösterimi sırasında Web Audio'yu geçici susturur veya geri açar.
   */
  setAdMuted(muted: boolean): void {
    this.isAdMuted = muted;
    const s = settingsService.getSettings().sound;
    this.applySettings(s);
  }

  /**
   * Ses ayarlarını ilgili kanalın gain node'una uygular.
   */
  private applySettings(sound: SoundSettings): void {
    const gameEffective = (this.isAdMuted || sound.muted) ? 0 : Math.max(0, Math.min(1, sound.volume / 100));
    const menuEffective = (this.isAdMuted || sound.menuMuted) ? 0 : Math.max(0, Math.min(1, sound.menuVolume / 100));

    if (this.ctx) {
      if (this.gameGain) {
        try {
          this.gameGain.gain.setValueAtTime(gameEffective, this.ctx.currentTime);
        } catch {}
      }
      if (this.menuGain) {
        try {
          this.menuGain.gain.setValueAtTime(menuEffective, this.ctx.currentTime);
        } catch {}
      }
    }

    if (this.isAdMuted || sound.muted) {
      this.stopChannel('game');
    }
    if (this.isAdMuted || sound.menuMuted) {
      this.stopChannel('menu');
    }
  }

  /** AudioContext'i oluşturur (yoksa) ve kanalları (game/menu gain) destination'a bağlar. */
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
      this.gameGain = this.ctx.createGain();
      this.menuGain = this.ctx.createGain();

      const s = settingsService.getSettings().sound;
      const initialGameVol = (this.isAdMuted || s.muted) ? 0 : Math.max(0, Math.min(1, s.volume / 100));
      const initialMenuVol = (this.isAdMuted || s.menuMuted) ? 0 : Math.max(0, Math.min(1, s.menuVolume / 100));

      this.gameGain.gain.value = initialGameVol;
      this.menuGain.gain.value = initialMenuVol;

      this.gameGain.connect(this.ctx.destination);
      this.menuGain.connect(this.ctx.destination);

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

    for (const id of SOUND_IDS) {
      const source = SOUNDS[id].source;
      if (source.kind === 'synth') {
        // Dosya yok: tarif açılışta bir kez buffer'a render edilir.
        renderSynth(source.recipe, ctx.sampleRate)
          .then((buffer) => { this.buffers.set(id, buffer); })
          .catch(() => { /* synth için fallback yok; ses sessizce atlanır */ });
        continue;
      }
      fetch(assetUrl(source.url))
        .then((res) => res.arrayBuffer())
        .then((data) => ctx.decodeAudioData(data))
        .then((buffer) => { this.buffers.set(id, buffer); })
        .catch(() => {
          // Tek bir dosya çözülemezse (ör. WebView'de FLAC desteği yok) o ses
          // için HTMLAudioElement'e düş; diğerleri Web Audio'da kalır.
          this.ensureFallbackElement(id);
        });
    }
  }

  private preloadFallback(): void {
    for (const id of SOUND_IDS) this.ensureFallbackElement(id);
  }

  private ensureFallbackElement(id: SoundId): HTMLAudioElement | null {
    if (typeof window === 'undefined') return null;
    const source = SOUNDS[id].source;
    if (source.kind !== 'file') return null;
    const existing = this.fallbackAudio.get(id);
    if (existing) return existing;
    try {
      const audio = new Audio(assetUrl(source.url));
      audio.preload = 'auto';
      this.fallbackAudio.set(id, audio);
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

  /**
   * Kayıtlı bir sesi çalar. Kanal, sesin tanımından gelir; `channel` ile ezilebilir.
   */
  play(name: SoundId, channelOverride?: SoundChannel): void {
    if (this.isAdMuted) return;
    const def = SOUNDS[name];
    if (!def) return;
    const channel = channelOverride ?? def.channel;

    const s = settingsService.getSettings().sound;
    const isMuted = channel === 'menu' ? s.menuMuted : s.muted;
    if (isMuted) return;

    this.preload();

    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const key = `${channel}:${name}`;
    const last = this.lastPlayedAt.get(key);
    if (last !== undefined && now - last < RETRIGGER_WINDOW_MS) return;
    this.lastPlayedAt.set(key, now);

    const ctx = this.ensureContext();
    const buffer = this.buffers.get(name);
    const targetGain = channel === 'menu' ? this.menuGain : this.gameGain;

    if (ctx && buffer && targetGain) {
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      try {
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        const gain = ctx.createGain();
        gain.gain.value = def.volume;
        if (def.pitchJitter) {
          source.playbackRate.value = 1 + (Math.random() * 2 - 1) * def.pitchJitter;
        }
        source.connect(gain);
        gain.connect(targetGain);
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

    this.playFallback(name, channel);
  }

  /** Kolaylık metodu: Oyun kanalı (`game`) üzerinden ses çalar. */
  playGame(name: SoundId): void {
    this.play(name, 'game');
  }

  /** Kolaylık metodu: Menü kanalı (`menu`) üzerinden ses çalar. */
  playMenu(name: SoundId): void {
    this.play(name, 'menu');
  }

  private playFallback(name: SoundId, channel: SoundChannel): void {
    const audio = this.ensureFallbackElement(name);
    if (!audio) return;
    try {
      const s = settingsService.getSettings().sound;
      const channelVol = channel === 'menu'
        ? (s.menuMuted ? 0 : Math.max(0, Math.min(1, s.menuVolume / 100)))
        : (s.muted ? 0 : Math.max(0, Math.min(1, s.volume / 100)));
      const effectiveVolume = SOUNDS[name].volume * channelVol;
      if (effectiveVolume <= 0) return;

      if (audio.paused || audio.ended) {
        audio.currentTime = 0;
        audio.volume = effectiveVolume;
        audio.play().catch(() => {});
      } else {
        const clone = audio.cloneNode() as HTMLAudioElement;
        clone.volume = effectiveVolume;
        clone.play().catch(() => {});
      }
    } catch { /* ses kritik değil, sessizce yut */ }
  }

  /** Belirtilen kanaldaki çalan sesi anında keser. */
  stopChannel(channel: SoundChannel): void {
    if (this.ctx) {
      const s = settingsService.getSettings().sound;
      const isGame = channel === 'game';
      const gainNode = isGame ? this.gameGain : this.menuGain;
      const vol = isGame
        ? ((this.isAdMuted || s.muted) ? 0 : Math.max(0, Math.min(1, s.volume / 100)))
        : ((this.isAdMuted || s.menuMuted) ? 0 : Math.max(0, Math.min(1, s.menuVolume / 100)));
      if (gainNode) {
        try {
          gainNode.gain.setValueAtTime(0, this.ctx.currentTime);
          if (vol > 0) {
            gainNode.gain.setValueAtTime(vol, this.ctx.currentTime + 0.01);
          }
        } catch { /* yoksay */ }
      }
    }
  }

  /** Sessize alındığında veya kanal durdurulduğunda çalan her şeyi anında keser. */
  stopAll(channel?: SoundChannel): void {
    if (!channel || channel === 'game') this.stopChannel('game');
    if (!channel || channel === 'menu') this.stopChannel('menu');
    if (!channel) {
      for (const audio of this.fallbackAudio.values()) {
        try { audio.pause(); audio.currentTime = 0; } catch { /* yoksay */ }
      }
    }
  }
}

export const soundEngine = new SoundEngine();
