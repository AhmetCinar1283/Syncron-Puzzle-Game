import { describe, it, expect, beforeEach, vi } from 'vitest';
import { userStorageGet, userStorageSet } from '@/lib/userStorage';

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

describe('Sound mute preferences', () => {
  beforeEach(() => {
    mockLocalStorage.clear();
  });

  it('defaults to not muted when no key exists', () => {
    expect(userStorageGet('soundMuted')).toBeNull();
  });

  it('correctly persists soundMuted flag in user-scoped storage', () => {
    userStorageSet('soundMuted', 'true');
    expect(userStorageGet('soundMuted')).toBe('true');

    userStorageSet('soundMuted', 'false');
    expect(userStorageGet('soundMuted')).toBe('false');
  });
});
