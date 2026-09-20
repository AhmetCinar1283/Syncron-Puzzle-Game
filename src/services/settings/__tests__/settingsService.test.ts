/**
 * DOSYA AMACI: `settingsService` ve depolama adaptörünün birim testleridir.
 * Varsayılan değerlerin yüklenmesi, sınır kontrolleri, legacy migration,
 * dual-write ve dinleyici (subscriber) mekanizmalarını doğrular.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SettingsService } from '../settingsService';
import { DEFAULT_SETTINGS } from '../defaults';
import { SETTINGS_STORAGE_KEY } from '../storageAdapter';

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

describe('SettingsService', () => {
  beforeEach(() => {
    mockLocalStorage.clear();
    vi.clearAllMocks();
  });

  it('depolama boşken DEFAULT_SETTINGS ile başlar', () => {
    const service = new SettingsService();
    const settings = service.getSettings();

    expect(settings.version).toBe(1);
    expect(settings.language).toBe('en');
    expect(settings.theme).toBe('arcade');
    expect(settings.sound.muted).toBe(false);
    expect(settings.sound.volume).toBe(80);
  });

  it('eski anahtarlardan (legacy keys) başarıyla migrate eder', () => {
    mockLocalStorage.setItem('lang', 'tr');
    mockLocalStorage.setItem('know_and_conquer_game_theme', 'neon');
    mockLocalStorage.setItem('anon:soundMuted', 'true');

    const service = new SettingsService();
    const settings = service.getSettings();

    expect(settings.language).toBe('tr');
    expect(settings.theme).toBe('neon');
    expect(settings.sound.muted).toBe(true);
    // Yeni birleşik anahtarın da oluştuğunu doğrula
    expect(mockLocalStorage.getItem(SETTINGS_STORAGE_KEY)).not.toBeNull();
  });

  it('setLanguage dili günceller ve legacy anahtara da yazar (dual-write)', () => {
    const service = new SettingsService();
    service.setLanguage('tr');

    expect(service.getSettings().language).toBe('tr');
    expect(mockLocalStorage.getItem('lang')).toBe('tr');
  });

  it('setTheme temayı günceller ve legacy anahtara da yazar', () => {
    const service = new SettingsService();
    service.setTheme('cosmic');

    expect(service.getSettings().theme).toBe('cosmic');
    expect(mockLocalStorage.getItem('know_and_conquer_game_theme')).toBe('cosmic');
  });

  it('setSoundMuted ve toggleSoundMute ses durumunu doğru yönetir', () => {
    const service = new SettingsService();
    expect(service.getSettings().sound.muted).toBe(false);

    service.toggleSoundMute();
    expect(service.getSettings().sound.muted).toBe(true);

    service.setSoundMuted(false);
    expect(service.getSettings().sound.muted).toBe(false);
  });

  it('setSoundVolume ses seviyesini 0 ile 100 arasına güvenle clamp eder', () => {
    const service = new SettingsService();

    service.setSoundVolume(50);
    expect(service.getSettings().sound.volume).toBe(50);

    service.setSoundVolume(-25);
    expect(service.getSettings().sound.volume).toBe(0);

    service.setSoundVolume(150);
    expect(service.getSettings().sound.volume).toBe(100);

    service.setSoundVolume(42.6);
    expect(service.getSettings().sound.volume).toBe(43);
  });

  it('subscribe dinleyicileri ayar değiştiğinde tetiklenir ve unsubscribe çalışır', () => {
    const service = new SettingsService();
    const listener = vi.fn();

    const unsubscribe = service.subscribe(listener);
    service.setSoundVolume(60);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(expect.objectContaining({
      sound: expect.objectContaining({ volume: 60 }),
    }));

    unsubscribe();
    service.setSoundVolume(70);
    expect(listener).toHaveBeenCalledTimes(1); // tekrar çağrılmamalı
  });

  it('resetToDefaults ayarları fabrika değerlerine döndürür', () => {
    const service = new SettingsService();
    service.setLanguage('tr');
    service.setSoundVolume(20);
    service.setSoundMuted(true);

    service.resetToDefaults();
    const settings = service.getSettings();

    expect(settings.language).toBe(DEFAULT_SETTINGS.language);
    expect(settings.sound.volume).toBe(DEFAULT_SETTINGS.sound.volume);
    expect(settings.sound.muted).toBe(DEFAULT_SETTINGS.sound.muted);
  });
});
