/**
 * DOSYA AMACI: Çizici seçim sırasını kilitlemek (Faz 09 §2.4 + Faz 11 §3.3):
 * kullanıcı ayarı > otomatik karar > cihaz kuralı; belirsizlikte canvas.
 */

import { describe, expect, it } from 'vitest';
import { isDeviceStrong, resolveBoardRenderer, type DeviceSignals } from './boardRenderer';

const strong: DeviceSignals = { isNative: false, coarsePointer: false, cores: 8, memoryGb: 8, isLiteTier: false };

describe('isDeviceStrong', () => {
    it('hepsi olumluysa güçlü', () => {
        expect(isDeviceStrong(strong)).toBe(true);
    });

    it('her eksik veya olumsuz koşul canvas\'a düşürür', () => {
        expect(isDeviceStrong({ ...strong, isNative: true })).toBe(false);
        expect(isDeviceStrong({ ...strong, coarsePointer: true })).toBe(false);
        expect(isDeviceStrong({ ...strong, cores: 4 })).toBe(false);
        expect(isDeviceStrong({ ...strong, memoryGb: 4 })).toBe(false);
        expect(isDeviceStrong({ ...strong, isLiteTier: true })).toBe(false);
    });

    it('tanımsız çekirdek/RAM (Firefox, Safari) güçlü sayılmaz', () => {
        expect(isDeviceStrong({ ...strong, cores: undefined })).toBe(false);
        expect(isDeviceStrong({ ...strong, memoryGb: undefined })).toBe(false);
    });
});

describe('resolveBoardRenderer', () => {
    const base = { setting: 'auto' as const, autoCanvas: false, device: strong };

    it('Otomatik + güçlü cihaz → dom', () => {
        expect(resolveBoardRenderer(base)).toBe('dom');
    });

    it('Otomatik + zayıf/belirsiz cihaz → canvas', () => {
        expect(resolveBoardRenderer({ ...base, device: { ...strong, memoryGb: undefined } })).toBe('canvas');
    });

    it('dedektör kararı güçlü cihazı da canvas\'a alır', () => {
        expect(resolveBoardRenderer({ ...base, autoCanvas: true })).toBe('canvas');
    });

    it('kullanıcı DOM seçtiyse dedektör kararı ve cihaz yok sayılır', () => {
        const weak = { ...strong, isNative: true };
        expect(resolveBoardRenderer({ setting: 'dom', autoCanvas: true, device: weak })).toBe('dom');
    });

    it('kullanıcı Canvas seçtiyse güçlü cihazda da canvas', () => {
        expect(resolveBoardRenderer({ ...base, setting: 'canvas' })).toBe('canvas');
    });
});
