import { describe, it, expect } from 'vitest';
import { resolveIconName, EMOJI_TO_ICON } from '../emojiMap';
import { classicIcons } from '../themes/classic';
import { IconName } from '../types';

describe('GameIcon Module', () => {
  it('resolves standard emojis to IconNames', () => {
    expect(resolveIconName('🏆')).toBe('trophy');
    expect(resolveIconName('🎮')).toBe('gamepad');
    expect(resolveIconName('⚡')).toBe('lightning');
    expect(resolveIconName('🔒')).toBe('lock');
    expect(resolveIconName('✓')).toBe('check');
    expect(resolveIconName('✕')).toBe('close');
    expect(resolveIconName('⚠')).toBe('warning');
    expect(resolveIconName('⚠️')).toBe('warning');
  });

  it('all mapped emojis have valid IconName components in classicIcons', () => {
    for (const [emoji, iconName] of Object.entries(EMOJI_TO_ICON)) {
      const comp = classicIcons[iconName];
      expect(comp, `Icon component for emoji ${emoji} (${iconName}) should exist in classicIcons`).toBeDefined();
    }
  });

  it('key icon names exist in classicIcons', () => {
    const essentialIcons: IconName[] = [
      'trophy', 'gamepad', 'joystick', 'star', 'skull', 'portal', 'ice',
      'lightning', 'switch', 'box', 'target', 'clock', 'hourglass', 'footsteps',
      'flag', 'party', 'explosion', 'plug', 'key', 'mountain', 'medal',
      'architect', 'crown', 'retro-block', 'galaxy', 'ruler', 'menu', 'close',
      'arrow-right', 'arrow-left', 'search', 'pin', 'fullscreen', 'minimize',
      'refresh', 'repeat', 'backspace', 'pencil', 'palette', 'save', 'plus',
      'trash', 'copy', 'clipboard', 'erase', 'import', 'folder', 'wood',
      'grid', 'sparkles', 'dot', 'robot', 'book', 'template', 'tools',
      'user', 'friends', 'chat', 'mail', 'heart', 'shield', 'award',
      'coffee', 'thumbs-up', 'thumbs-down', 'credit-card', 'tag', 'globe',
      'coins', 'warning', 'check', 'error', 'settings', 'lock', 'unlock',
      'volume-on', 'volume-off', 'eye', 'eye-off', 'bar-chart', 'trend-up',
      'lightbulb', 'ban', 'loader'
    ];

    for (const name of essentialIcons) {
      expect(classicIcons[name], `classicIcons['${name}'] should be defined`).toBeDefined();
    }
  });
});
