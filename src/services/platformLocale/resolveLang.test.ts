/**
 * DOSYA AMACI: `resolveSupportedLang` saf fonksiyonunun testleri. Gelecekte
 * eklenecek diller (pt-BR, zh-CN…) dahil farklı destek listeleriyle çalışır.
 */
import { describe, expect, it } from 'vitest';
import { resolveSupportedLang } from './resolveLang';

const NOW = ['tr', 'en'] as const;
const LATER = ['tr', 'en', 'pt-BR', 'es', 'zh-CN', 'de'] as const;

describe('resolveSupportedLang', () => {
  it('tam eşleşmeyi döner', () => {
    expect(resolveSupportedLang('tr', NOW, 'en')).toBe('tr');
    expect(resolveSupportedLang('pt-BR', LATER, 'en')).toBe('pt-BR');
  });

  it('bölgesel kodu ana dile indirger (en-US → en, tr-TR → tr)', () => {
    expect(resolveSupportedLang('en-US', NOW, 'en')).toBe('en');
    expect(resolveSupportedLang('tr-TR', NOW, 'en')).toBe('tr');
    expect(resolveSupportedLang('es-MX', LATER, 'en')).toBe('es');
  });

  it('büyük/küçük harf ve alt çizgiyi tolere eder', () => {
    expect(resolveSupportedLang('PT_br', LATER, 'en')).toBe('pt-BR');
    expect(resolveSupportedLang('  TR ', NOW, 'en')).toBe('tr');
  });

  it('ana dil verilip yalnızca bölgesel kod destekleniyorsa onu seçer (pt → pt-BR)', () => {
    expect(resolveSupportedLang('pt', LATER, 'en')).toBe('pt-BR');
    expect(resolveSupportedLang('pt-PT', LATER, 'en')).toBe('pt-BR');
  });

  it('desteklenmeyen dilde fallback döner', () => {
    expect(resolveSupportedLang('ja-JP', NOW, 'en')).toBe('en');
    expect(resolveSupportedLang('pt-BR', NOW, 'en')).toBe('en');
  });

  it('geçersiz girdilerde fallback döner', () => {
    expect(resolveSupportedLang(undefined, NOW, 'en')).toBe('en');
    expect(resolveSupportedLang(null, NOW, 'en')).toBe('en');
    expect(resolveSupportedLang('', NOW, 'en')).toBe('en');
    expect(resolveSupportedLang(42, NOW, 'en')).toBe('en');
  });
});
