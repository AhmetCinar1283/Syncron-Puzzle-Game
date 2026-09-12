/**
 * DOSYA AMACI: `getCampaignParts`'ın birim testleri — Firestore başarılıysa
 * önbelleğe yazar; başarısız olursa (çevrimdışı) önbellekteki son listeyi döner.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { LevelPart } from '../firebase/adminTypes';

const getAllParts = vi.fn();
vi.mock('../firebase/adminParts', () => ({ getAllParts: () => getAllParts() }));

function makeLocalStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
  };
}

const PART: LevelPart = { partId: '1', name: 'Bölüm 1', unlockRequirement: 0, order: {}, updatedAt: 1 };

describe('getCampaignParts', () => {
  beforeEach(() => {
    vi.resetModules();
    getAllParts.mockReset();
    (globalThis as any).window = { localStorage: makeLocalStorage() };
  });

  it('Firestore başarılıysa sonucu döner ve önbelleğe yazar', async () => {
    getAllParts.mockResolvedValue([PART]);
    const { getCampaignParts } = await import('./campaignParts');
    const result = await getCampaignParts();
    expect(result).toEqual([PART]);
    expect(window.localStorage.getItem('campaignParts:cache:v1')).toContain('Bölüm 1');
  });

  it('Firestore hata verirse önbellekteki listeyi döner', async () => {
    getAllParts.mockResolvedValueOnce([PART]);
    const { getCampaignParts } = await import('./campaignParts');
    await getCampaignParts(); // önbelleğe yazar

    getAllParts.mockRejectedValueOnce(new Error('offline'));
    const result = await getCampaignParts();
    expect(result).toEqual([PART]);
  });

  it('Firestore hata verir ve önbellek boşsa boş dizi döner', async () => {
    getAllParts.mockRejectedValueOnce(new Error('offline'));
    const { getCampaignParts } = await import('./campaignParts');
    const result = await getCampaignParts();
    expect(result).toEqual([]);
  });
});
