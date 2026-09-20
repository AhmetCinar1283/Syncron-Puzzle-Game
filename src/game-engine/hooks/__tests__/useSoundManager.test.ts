import { describe, it, expect, beforeEach, vi } from 'vitest';
import { settingsService } from '@/services/settings';

const mockStorage: Record<string, string> = {};

const mockLocalStorage = {
  getItem: vi.fn((key: string) => mockStorage[key] ?? null),
  setItem: vi.fn((key: string, value: string) => {
    mockStorage[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete mockStorage[key];
  }),
  clear: vi.fn(() => {
    for (const key of Object.keys(mockStorage)) {
      delete mockStorage[key];
    }
  }),
};

vi.stubGlobal('localStorage', mockLocalStorage);
vi.stubGlobal('window', { localStorage: mockLocalStorage });

describe('Sound preferences via settingsService', () => {
  beforeEach(() => {
    mockLocalStorage.clear();
    settingsService.resetToDefaults();
  });

  it('defaults to not muted and 80 volume', () => {
    expect(settingsService.isSoundMuted()).toBe(false);
    expect(settingsService.getSoundVolume()).toBe(80);
  });

  it('correctly toggles and persists soundMuted flag in settingsService', () => {
    settingsService.setSoundMuted(true);
    expect(settingsService.isSoundMuted()).toBe(true);

    settingsService.toggleSoundMute();
    expect(settingsService.isSoundMuted()).toBe(false);

    settingsService.setSoundVolume(45);
    expect(settingsService.getSoundVolume()).toBe(45);
  });
});
