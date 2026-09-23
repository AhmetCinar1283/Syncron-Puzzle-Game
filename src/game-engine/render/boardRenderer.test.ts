/**
 * DOSYA AMACI: Çizici seçim sırasını kilitlemek: kullanıcı ayarı > cihaz kuralı
 * (dom / hybrid / canvas), dedektörün yazdığı üst sınırla düşürülmüş hâli.
 * Kasmama garantisi görüntü sadakatinden önce gelir; her seviye olumlu kanıt ister.
 */

import { describe, expect, it } from 'vitest';
import { classifyDevice, isDeviceCapable, isDeviceStrong, resolveBoardRenderer, type DeviceSignals } from './boardRenderer';
import { capForVerdict } from './useJankGuard';

const strong: DeviceSignals = { isNative: false, coarsePointer: false, cores: 8, memoryGb: 8, isLiteTier: false };

describe('isDeviceStrong', () => {
    it('hepsi olumluysa güçlü', () => {
        expect(isDeviceStrong(strong)).toBe(true);
    });

    it('her eksik veya olumsuz koşul güçlü saymaz', () => {
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

describe('isDeviceCapable (dengeli seviye)', () => {
    it('masaüstü: RAM bilinmiyorsa (Firefox/Safari) engel değil', () => {
        expect(isDeviceCapable({ ...strong, memoryGb: undefined })).toBe(true);
    });

    it('masaüstü: çekirdek bilinmiyor, ≤ 4 veya RAM ≤ 4 ise değil', () => {
        expect(isDeviceCapable({ ...strong, cores: undefined })).toBe(false);
        expect(isDeviceCapable({ ...strong, cores: 4 })).toBe(false);
        expect(isDeviceCapable({ ...strong, memoryGb: 4 })).toBe(false);
    });

    it('telefon/yerel uygulama: RAM AÇIKÇA > 4 bildirilmeli', () => {
        const phone = { ...strong, coarsePointer: true };
        expect(isDeviceCapable(phone)).toBe(true);
        expect(isDeviceCapable({ ...phone, memoryGb: undefined })).toBe(false);
        expect(isDeviceCapable({ ...phone, memoryGb: 4 })).toBe(false);
        expect(isDeviceCapable({ ...strong, isNative: true })).toBe(true);
        expect(isDeviceCapable({ ...strong, isNative: true, memoryGb: undefined })).toBe(false);
    });

    it('lite kademe her durumda değil', () => {
        expect(isDeviceCapable({ ...strong, isLiteTier: true })).toBe(false);
    });
});

describe('classifyDevice', () => {
    it('güçlü masaüstü → dom', () => {
        expect(classifyDevice(strong)).toBe('dom');
    });

    it('orta sınıf (telefon, RAM > 4, çekirdek > 4) → hybrid', () => {
        expect(classifyDevice({ ...strong, coarsePointer: true })).toBe('hybrid');
        expect(classifyDevice({ ...strong, memoryGb: undefined })).toBe('hybrid');
    });

    it('zayıf veya belirsiz → canvas', () => {
        expect(classifyDevice({ ...strong, cores: 4 })).toBe('canvas');
        expect(classifyDevice({ ...strong, isLiteTier: true })).toBe('canvas');
        expect(classifyDevice({ ...strong, coarsePointer: true, memoryGb: undefined })).toBe('canvas');
    });
});

describe('resolveBoardRenderer', () => {
    const base = { setting: 'auto' as const, autoCap: null, device: strong };

    it('Otomatik + güçlü cihaz → dom', () => {
        expect(resolveBoardRenderer(base)).toBe('dom');
    });

    it('Otomatik + orta cihaz → hybrid, zayıf/belirsiz → canvas', () => {
        expect(resolveBoardRenderer({ ...base, device: { ...strong, memoryGb: undefined } })).toBe('hybrid');
        expect(resolveBoardRenderer({ ...base, device: { ...strong, cores: 2 } })).toBe('canvas');
    });

    it('dedektör sınırı seviyeyi düşürür, asla yükseltmez', () => {
        expect(resolveBoardRenderer({ ...base, autoCap: 'hybrid' })).toBe('hybrid');
        expect(resolveBoardRenderer({ ...base, autoCap: 'canvas' })).toBe('canvas');
        const mid = { ...strong, memoryGb: undefined };
        expect(resolveBoardRenderer({ ...base, device: mid, autoCap: 'hybrid' })).toBe('hybrid');
        const weak = { ...strong, cores: 2 };
        expect(resolveBoardRenderer({ ...base, device: weak, autoCap: 'hybrid' })).toBe('canvas');
    });

    it('kullanıcı seçimi dedektör kararını ve cihazı yok sayar', () => {
        const weak = { ...strong, isNative: true };
        expect(resolveBoardRenderer({ setting: 'dom', autoCap: 'canvas', device: weak })).toBe('dom');
        expect(resolveBoardRenderer({ setting: 'hybrid', autoCap: 'canvas', device: weak })).toBe('hybrid');
        expect(resolveBoardRenderer({ ...base, setting: 'canvas' })).toBe('canvas');
    });
});

describe('capForVerdict (dedektör merdiveni)', () => {
    it('tam DOM\'da yalnızca zafer kasıyorsa hybrid', () => {
        expect(capForVerdict('dom', 'victory')).toBe('hybrid');
    });

    it('oyun akışı kasıyorsa canvas', () => {
        expect(capForVerdict('dom', 'move')).toBe('canvas');
        expect(capForVerdict('hybrid', 'move')).toBe('canvas');
    });
});
