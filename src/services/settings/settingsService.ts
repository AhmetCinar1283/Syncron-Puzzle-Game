/**
 * DOSYA AMACI: Kullanıcı ayarlarının tekil (singleton) servis yöneticisidir.
 * React dışındaki modüller (soundEngine, worker istemcileri vb.) ile React Context katmanı
 * bu servis üzerinden ayarları okur, günceller ve değişiklikleri dinler.
 */

import type { Lang } from '@/lib/i18n';
import type { GameTheme } from '@/game-engine/themes/themeConfig';
import { DEFAULT_SETTINGS, clampVolume, isValidLang, isValidTheme } from './defaults';
import { deepMerge, sanitizeSettings } from './sanitize';
import {
  isLanguageExplicit,
  loadSettingsFromStorage,
  markLanguageExplicit,
  saveSettingsToStorage,
} from './storageAdapter';
import type { UserSettings, SettingsListener, SettingsUpdatePayload } from './types';

export class SettingsService {
  private currentSettings: UserSettings;
  private listeners = new Set<SettingsListener>();

  constructor() {
    this.currentSettings = loadSettingsFromStorage();
  }

  /**
   * Güncel kullanıcı ayarlarını döner (değiştirilemez kopya).
   */
  getSettings(): UserSettings {
    return this.currentSettings;
  }

  /** Sesin kapalı (muted) olup olmadığını döner. */
  isSoundMuted(): boolean {
    return this.currentSettings.sound.muted;
  }

  /** Ana ses yüksekliğini (0 - 100) döner. */
  getSoundVolume(): number {
    return this.currentSettings.sound.volume;
  }

  /** Menü sesinin kapalı (muted) olup olmadığını döner. */
  isMenuSoundMuted(): boolean {
    return this.currentSettings.sound.menuMuted;
  }

  /** Menü sesi yüksekliğini (0 - 100) döner. */
  getMenuSoundVolume(): number {
    return this.currentSettings.sound.menuVolume;
  }

  /** Güncel dil kodunu döner. */
  getLanguage(): Lang {
    return this.currentSettings.language;
  }

  /** Güncel oyun temasını döner. */
  getTheme(): GameTheme {
    return this.currentSettings.theme;
  }

  /**
   * Ayarları kısmi olarak günceller, depolamaya yazar ve tüm dinleyicileri bilgilendirir.
   */
  updateSettings(payload: SettingsUpdatePayload): UserSettings {
    // Birleştirme + doğrulama tek noktadan: geçersiz alanlar mevcut değere değil
    // varsayılana düşmesin diye önce mevcut ayarların üzerine bindirilir.
    const merged = deepMerge(
      this.currentSettings as unknown as Record<string, unknown>,
      payload as Record<string, unknown>,
    );
    const next = sanitizeSettings(merged);
    // Geçersiz dil/tema güncellemesi mevcut değeri korur (sanitize varsayılana düşürür)
    if (payload.language !== undefined && !isValidLang(payload.language)) next.language = this.currentSettings.language;
    if (payload.theme !== undefined && !isValidTheme(payload.theme)) next.theme = this.currentSettings.theme;

    this.currentSettings = next;
    saveSettingsToStorage(next);
    this.notifyListeners();
    return this.getSettings();
  }

  /**
   * Uygulama arayüz dilini ayarlar.
   */
  setLanguage(language: Lang): void {
    if (!isValidLang(language)) return;
    markLanguageExplicit();
    if (language !== this.currentSettings.language) {
      this.updateSettings({ language });
    }
  }

  /**
   * Platformdan algılanan dili uygular. Kullanıcı dili daha önce kendisi seçtiyse
   * dokunmaz. Değişiklik yapıldıysa true döner.
   */
  applyDetectedLanguage(language: Lang): boolean {
    if (!isValidLang(language) || isLanguageExplicit()) return false;
    if (language === this.currentSettings.language) return false;
    this.updateSettings({ language });
    return true;
  }

  /**
   * Görsel temayı ayarlar.
   */
  setTheme(theme: GameTheme): void {
    if (isValidTheme(theme) && theme !== this.currentSettings.theme) {
      this.updateSettings({ theme });
    }
  }

  /**
   * Ses açık/kapalı durumunu ayarlar.
   */
  setSoundMuted(muted: boolean): void {
    if (muted !== this.currentSettings.sound.muted) {
      this.updateSettings({ sound: { muted } });
    }
  }

  /**
   * Ses açık/kapalı durumunu tersine çevirir (toggle).
   */
  toggleSoundMute(): void {
    this.setSoundMuted(!this.currentSettings.sound.muted);
  }

  /**
   * Ana ses seviyesini 0 ile 100 arasında ayarlar.
   */
  setSoundVolume(volume: number): void {
    const clamped = clampVolume(volume);
    if (clamped !== this.currentSettings.sound.volume) {
      this.updateSettings({ sound: { volume: clamped } });
    }
  }

  /**
   * Menü sesi açık/kapalı durumunu ayarlar.
   */
  setMenuSoundMuted(muted: boolean): void {
    if (muted !== this.currentSettings.sound.menuMuted) {
      this.updateSettings({ sound: { menuMuted: muted } });
    }
  }

  /**
   * Menü sesi açık/kapalı durumunu tersine çevirir (toggle).
   */
  toggleMenuSoundMute(): void {
    this.setMenuSoundMuted(!this.currentSettings.sound.menuMuted);
  }

  /**
   * Menü ses seviyesini 0 ile 100 arasında ayarlar.
   */
  setMenuSoundVolume(volume: number): void {
    const clamped = clampVolume(volume);
    if (clamped !== this.currentSettings.sound.menuVolume) {
      this.updateSettings({ sound: { menuVolume: clamped } });
    }
  }

  /**
   * Ayarları fabrika varsayılanlarına sıfırlar.
   */
  resetToDefaults(): UserSettings {
    this.currentSettings = sanitizeSettings(DEFAULT_SETTINGS);
    saveSettingsToStorage(this.currentSettings);
    this.notifyListeners();
    return this.getSettings();
  }

  /**
   * Ayar değişikliklerini dinlemek için abone olur.
   * Abonelikten çıkmak için dönen temizleme fonksiyonu çağrılır.
   */
  subscribe(listener: SettingsListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Depolamadan ayarları yeniden yükler (testlerde veya depolama senkronizasyonunda kullanılır).
   */
  reloadFromStorage(): void {
    this.currentSettings = loadSettingsFromStorage();
    this.notifyListeners();
  }

  private notifyListeners(): void {
    const snapshot = this.getSettings();
    this.listeners.forEach((listener) => {
      try {
        listener(snapshot);
      } catch (err) {
        console.error('[SettingsService] Listener hatası:', err);
      }
    });
  }
}

/** Uygulama genelinde kullanılan tekil ayarlar servisi. */
export const settingsService = new SettingsService();
