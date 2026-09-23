import { describe, it, expect } from 'vitest';
import { BUTTONS_MAP, NEON_TYPES } from '../constants';
import tr from '@/lib/i18n/tr';
import en from '@/lib/i18n/en';

describe('Controls constants & translations', () => {
  it('defines standard gamepad buttons map with expected roles', () => {
    expect(BUTTONS_MAP.length).toBeGreaterThan(10);
    const moveButtons = BUTTONS_MAP.filter(b => b.role === 'move');
    expect(moveButtons.length).toBe(4); // 4 dpad directions

    const restartButtons = BUTTONS_MAP.filter(b => b.role === 'restart');
    expect(restartButtons.length).toBeGreaterThan(0);

    const menuButtons = BUTTONS_MAP.filter(b => b.role === 'menu');
    expect(menuButtons.length).toBeGreaterThan(0);
  });

  it('contains valid neon types', () => {
    expect(NEON_TYPES.length).toBeGreaterThanOrEqual(4);
    NEON_TYPES.forEach(nt => {
      expect(nt.color).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(nt.glow).toBeDefined();
    });
  });

  it('contains all required controls translation keys in TR and EN', () => {
    const requiredKeys = [
      'controls.title',
      'controls.subtitle',
      'controls.keyboard',
      'controls.gamepad',
      'controls.move',
      'controls.move_desc',
      'controls.restart',
      'controls.restart_desc',
      'controls.menu',
      'controls.menu_desc',
      'controls.gamepad_status',
      'controls.gamepad_connected',
      'controls.gamepad_disconnected',
      'controls.tester_title',
      'controls.tester_desc',
      'controls.back',
      'controls.tab_all',
      'controls.tab_keyboard',
      'controls.tab_gamepad',
      'controls.tab_touch',
      'controls.touch_title',
      'controls.touch_desc',
      'controls.swipe_label',
      'controls.swipe_desc',
      'controls.dpad_touch_label',
      'controls.dpad_touch_desc',
      'controls.test_swipe_pad',
      'controls.test_swipe_hint',
      'controls.swiped',
      'controls.active_input',
      'controls.live_feedback',
      'controls.keys_pressed',
      'controls.open_settings',
      'controls.analog_stick',
      'controls.button_states',
    ];

    for (const key of requiredKeys) {
      expect(tr[key as keyof typeof tr], `Missing TR translation for ${key}`).toBeDefined();
      expect(en[key as keyof typeof en], `Missing EN translation for ${key}`).toBeDefined();
    }
  });
});
