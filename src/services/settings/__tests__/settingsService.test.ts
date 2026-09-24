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

    expect(settings.version).toBe(2);
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

  it('setMenuSoundMuted ve toggleMenuSoundMute menü ses durumunu doğru yönetir', () => {
    const service = new SettingsService();
    expect(service.getSettings().sound.menuMuted).toBe(false);
    expect(service.isMenuSoundMuted()).toBe(false);

    service.toggleMenuSoundMute();
    expect(service.getSettings().sound.menuMuted).toBe(true);
    expect(service.isMenuSoundMuted()).toBe(true);

    service.setMenuSoundMuted(false);
    expect(service.getSettings().sound.menuMuted).toBe(false);
    expect(service.isMenuSoundMuted()).toBe(false);
  });

  it('setMenuSoundVolume menü ses seviyesini 0 ile 100 arasına güvenle clamp eder', () => {
    const service = new SettingsService();

    service.setMenuSoundVolume(60);
    expect(service.getSettings().sound.menuVolume).toBe(60);
    expect(service.getMenuSoundVolume()).toBe(60);

    service.setMenuSoundVolume(-10);
    expect(service.getSettings().sound.menuVolume).toBe(0);

    service.setMenuSoundVolume(120);
    expect(service.getSettings().sound.menuVolume).toBe(100);
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

  it('v1 şemalı kaydı v2 şemasına yükseltir ve eski haptik, hareket anahtarlarını taşır', () => {
    mockLocalStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({ version: 1, language: 'tr', theme: 'neon', sound: { muted: true, volume: 30 } }),
    );
    mockLocalStorage.setItem('anon:hapticsEnabled', 'false');
    mockLocalStorage.setItem('anon:motionTier', 'lite');

    const settings = new SettingsService().getSettings();

    expect(settings.version).toBe(2);
    expect(settings.language).toBe('tr');
    expect(settings.sound.muted).toBe(true);
    expect(settings.sound.volume).toBe(30);
    expect(settings.graphics.motion).toBe('lite');
    expect(settings.controls.haptics).toBe(false);
    expect(JSON.parse(mockStorage[SETTINGS_STORAGE_KEY]).version).toBe(2);
  });

  it('v2 kayıttaki değerler eski anahtarlardan üstündür', () => {
    mockLocalStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({ version: 2, graphics: { motion: 'full' } }),
    );
    mockLocalStorage.setItem('anon:motionTier', 'lite');

    expect(new SettingsService().getSettings().graphics.motion).toBe('full');
  });

  it('updateSettings iç içe grupları birleştirir ve geçersiz değerleri düzeltir', () => {
    const service = new SettingsService();

    service.updateSettings({ controls: { padSide: 'left', swipeSensitivity: 999 } });
    const { controls } = service.getSettings();
    expect(controls.padSide).toBe('left');
    expect(controls.swipeSensitivity).toBe(100);
    expect(controls.scheme).toBe(DEFAULT_SETTINGS.controls.scheme); // dokunulmayan alan korunur

    service.updateSettings({ graphics: { motion: 'bozuk' as never } });
    expect(service.getSettings().graphics.motion).toBe('auto');

    service.updateSettings({ sound: { menuVolume: -5 } });
    expect(service.getSettings().sound.menuVolume).toBe(0);
    expect(service.getSettings().sound.volume).toBe(DEFAULT_SETTINGS.sound.volume);
  });

  it('geçersiz dil güncellemesi mevcut dili korur', () => {
    const service = new SettingsService();
    service.setLanguage('tr');
    service.updateSettings({ language: 'xx' as never });
    expect(service.getSettings().language).toBe('tr');
  });

  describe('applyDetectedLanguage', () => {
    it('kullanıcı dili seçmediyse platform dilini uygular', () => {
      const service = new SettingsService();
      const listener = vi.fn();
      service.subscribe(listener);

      expect(service.applyDetectedLanguage('tr')).toBe(true);
      expect(service.getSettings().language).toBe('tr');
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('platform dili kullanıcı seçimi sayılmaz (sonradan tekrar değişebilir)', () => {
      const service = new SettingsService();
      service.applyDetectedLanguage('tr');
      expect(service.applyDetectedLanguage('en')).toBe(true);
      expect(service.getSettings().language).toBe('en');
    });

    it('kullanıcı dili elle seçtiyse platform dili onu ezmez', () => {
      const service = new SettingsService();
      service.setLanguage('tr');

      expect(service.applyDetectedLanguage('en')).toBe(false);
      expect(service.getSettings().language).toBe('tr');
    });

    it('kullanıcı mevcut dili tekrar seçse bile bilinçli seçim sayılır', () => {
      const service = new SettingsService();
      service.setLanguage('en'); // varsayılanla aynı, ama bilinçli

      expect(service.applyDetectedLanguage('tr')).toBe(false);
      expect(service.getSettings().language).toBe('en');
    });

    it('bilinçli seçim yeniden başlatmadan sonra da korunur', () => {
      new SettingsService().setLanguage('tr');
      const reopened = new SettingsService();

      expect(reopened.applyDetectedLanguage('en')).toBe(false);
      expect(reopened.getSettings().language).toBe('tr');
    });

    it('geçersiz dil ve aynı dil değişiklik sayılmaz', () => {
      const service = new SettingsService();
      expect(service.applyDetectedLanguage('xx' as never)).toBe(false);
      expect(service.applyDetectedLanguage('en')).toBe(false);
    });
  });
});
