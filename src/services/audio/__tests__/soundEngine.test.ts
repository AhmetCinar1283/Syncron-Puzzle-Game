/**
 * DOSYA AMACI: SoundEngine'in çift kanallı (game vs menu) ses çalma,
 * bağımsız ses seviyesi ve susturma mantığını doğrulayan birim testleri.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { settingsService } from '@/services/settings';
import { SoundEngine } from '../soundEngine';

describe('SoundEngine Dual-Channel Audio', () => {
  beforeEach(() => {
    settingsService.resetToDefaults();
    vi.clearAllMocks();
  });

  it('oyun sesi kapalıyken oyun sesi çalmaz ancak menü sesi çalmaya devam eder', () => {
    const engine = new SoundEngine();
    const playFallbackSpy = vi.spyOn(engine as any, 'playFallback').mockImplementation(() => {});

    // Oyun sesini sustur, menü sesini açık tut
    settingsService.setSoundMuted(true);
    settingsService.setMenuSoundMuted(false);

    engine.play('game.move', 'game');
    expect(playFallbackSpy).not.toHaveBeenCalled();

    engine.play('game.move', 'menu');
    expect(playFallbackSpy).toHaveBeenCalledWith('game.move', 'menu');
  });

  it('menü sesi kapalıyken menü sesi çalmaz ancak oyun sesi çalmaya devam eder', () => {
    const engine = new SoundEngine();
    const playFallbackSpy = vi.spyOn(engine as any, 'playFallback').mockImplementation(() => {});

    // Oyun sesini açık tut, menü sesini sustur
    settingsService.setSoundMuted(false);
    settingsService.setMenuSoundMuted(true);

    engine.play('game.ice', 'menu');
    expect(playFallbackSpy).not.toHaveBeenCalled();

    engine.play('game.ice', 'game');
    expect(playFallbackSpy).toHaveBeenCalledWith('game.ice', 'game');
  });

  it('playGame ve playMenu kısayolları doğru kanallara yönlendirir', () => {
    const engine = new SoundEngine();
    const playSpy = vi.spyOn(engine, 'play').mockImplementation(() => {});

    engine.playGame('game.ice');
    expect(playSpy).toHaveBeenCalledWith('game.ice', 'game');

    engine.playMenu('ui.tick');
    expect(playSpy).toHaveBeenCalledWith('ui.tick', 'menu');
  });

  it('reklam susturması (setAdMuted) aktifken hiçbir kanaldan ses çıkmaz', () => {
    const engine = new SoundEngine();
    const playFallbackSpy = vi.spyOn(engine as any, 'playFallback').mockImplementation(() => {});

    settingsService.setSoundMuted(false);
    settingsService.setMenuSoundMuted(false);

    engine.setAdMuted(true);
    engine.play('game.win', 'game');
    engine.play('game.win', 'menu');
    expect(playFallbackSpy).not.toHaveBeenCalled();

    engine.setAdMuted(false);
    engine.play('game.win', 'game');
    expect(playFallbackSpy).toHaveBeenCalledWith('game.win', 'game');
  });
});
