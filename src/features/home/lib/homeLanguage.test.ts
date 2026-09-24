import { describe, expect, it } from 'vitest';
import { LANGS, nextLang, translate } from '@/lib/i18n';
import { settingsService } from '@/services/settings';

describe('Home Language Toggle & Translations', () => {
  it('translates home.change_language for both Turkish and English', () => {
    expect(translate('tr', 'home.change_language')).toBe('Dili Değiştir');
    expect(translate('en', 'home.change_language')).toBe('Change Language');
  });

  it('cycles through every supported language and wraps around', () => {
    let current = LANGS[0].code;
    for (let i = 1; i < LANGS.length; i++) {
      current = nextLang(current);
      expect(current).toBe(LANGS[i].code);
    }
    expect(nextLang(current)).toBe(LANGS[0].code);
  });

  it('updates settingsService language when toggling', () => {
    settingsService.setLanguage('tr');
    expect(settingsService.getLanguage()).toBe('tr');

    settingsService.setLanguage(nextLang(settingsService.getLanguage()));
    expect(settingsService.getLanguage()).toBe('pt-BR');
  });
});
