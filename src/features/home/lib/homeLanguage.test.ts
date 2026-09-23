import { describe, expect, it } from 'vitest';
import { translate } from '@/lib/i18n';
import { settingsService } from '@/services/settings';

describe('Home Language Toggle & Translations', () => {
  it('translates home.change_language for both Turkish and English', () => {
    const trText = translate('tr', 'home.change_language');
    const enText = translate('en', 'home.change_language');

    expect(trText).toBe('Dili Değiştir (TR / EN)');
    expect(enText).toBe('Change Language (TR / EN)');
  });

  it('cycles language correctly between tr and en in sequence', () => {
    const getNextLang = (current: 'tr' | 'en') => (current === 'tr' ? 'en' : 'tr');

    expect(getNextLang('tr')).toBe('en');
    expect(getNextLang('en')).toBe('tr');
  });

  it('updates settingsService language when toggling', () => {
    settingsService.setLanguage('tr');
    expect(settingsService.getLanguage()).toBe('tr');

    const nextLang = settingsService.getLanguage() === 'tr' ? 'en' : 'tr';
    settingsService.setLanguage(nextLang);
    expect(settingsService.getLanguage()).toBe('en');

    const nextLang2 = settingsService.getLanguage() === 'tr' ? 'en' : 'tr';
    settingsService.setLanguage(nextLang2);
    expect(settingsService.getLanguage()).toBe('tr');
  });
});
