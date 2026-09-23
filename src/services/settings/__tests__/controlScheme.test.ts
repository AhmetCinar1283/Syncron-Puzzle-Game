import { describe, expect, it } from 'vitest';
import { sanitizeSettings } from '../sanitize';
import { DEFAULT_SETTINGS } from '../defaults';

describe('kontrol şeması ayarları', () => {
  it('varsayılanlar: kaydırma + tuşlar, tuşlar sağda', () => {
    const { controls } = sanitizeSettings({});
    expect(controls.scheme).toBe('both');
    expect(controls.padSide).toBe('right');
  });

  it('geçerli değerleri korur, geçersizleri varsayılana düşürür', () => {
    const ok = sanitizeSettings({ controls: { scheme: 'buttons', padSide: 'left' } }).controls;
    expect(ok.scheme).toBe('buttons');
    expect(ok.padSide).toBe('left');

    const bad = sanitizeSettings({ controls: { scheme: 'x', padSide: 5 } }).controls;
    expect(bad.scheme).toBe(DEFAULT_SETTINGS.controls.scheme);
    expect(bad.padSide).toBe(DEFAULT_SETTINGS.controls.padSide);
  });

  it('eski `dpad: false` kaydını yalnızca kaydırmaya çevirir; yeni `scheme` önceliklidir', () => {
    expect(sanitizeSettings({ controls: { dpad: false } }).controls.scheme).toBe('swipe');
    expect(sanitizeSettings({ controls: { dpad: true } }).controls.scheme).toBe('both');
    expect(sanitizeSettings({ controls: { dpad: false, scheme: 'buttons' } }).controls.scheme).toBe('buttons');
  });
});
