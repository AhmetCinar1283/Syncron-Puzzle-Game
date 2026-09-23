import type { Timestamp } from 'firebase/firestore';
import type { StoredLevel } from '../db';

// ─── Types (Yönetici Veri Tipleri) ─────────────────────────────────────────────

/**
 * Firestore'a yeni bir hazır (campaign) bölüm eklerken kullanılan girdi tipi.
 */
export type AdminLevelInput = Omit<StoredLevel, 'id' | 'createdAt' | 'updatedAt' | 'firestoreId' | 'isNeedSync'> & {
  part: string;
};

/**
 * Firestore'da saklanan hazır bölümün veri yapısı.
 */
export interface FirestoreLevel extends AdminLevelInput {
  firestoreId: string;
  createdAt: number;
  updatedAt: number;
  publishedBy: string;
}

/**
 * Bölüm paketinin (part) içerdiği bölümlerin sıralama ve konum bilgilerini tutan yapı.
 * Tüm bölüm verilerini okumadan liste oluşturabilmek için özet bilgiler içerir.
 */
export interface LevelOrderEntry {
  id: string;
  name: string;
  width: number;
  height: number;
  difficulty?: 1 | 2 | 3 | 4;
  creatorName?: string;
  updatedAt: Timestamp | number;
  /** Paket içindeki görüntülenme sırası (0-tabanlı) */
  position: number;
  mapX?: number;
  mapY?: number;
}

/**
 * Bir bölüm paketinin (kampanya dünyasının) veritabanı şeması.
 */
export interface LevelPart {
  partId: string;
  name: string;
  unlockRequirement: number; // Açılması için gereken yıldız sayısı
  order: Record<string, LevelOrderEntry>; // Bölüm ID'leri ve konum/sıra eşleşmeleri
  updatedAt: number;
  portalX?: number;
  portalY?: number;
  portalStartX?: number;
  portalStartY?: number;
  mapTheme?: string;
}

// ─── Helpers (Yardımcı Fonksiyonlar) ──────────────────────────────────────────

/**
 * Kampanya bölüm paketi (chapter) sıralaması: açılma yıldızı artan; eşitlikte adı
 * (doğal sıra: "2" < "10"), o da eşitse id. partId artık rastgele Firestore id'si
 * olduğundan id sırası anlamsızdır — sıra `unlockRequirement`'tan türer.
 */
export function compareParts(
  a: Pick<LevelPart, 'partId' | 'name' | 'unlockRequirement'>,
  b: Pick<LevelPart, 'partId' | 'name' | 'unlockRequirement'>,
): number {
  return (
    (a.unlockRequirement ?? 0) - (b.unlockRequirement ?? 0) ||
    (a.name ?? '').localeCompare(b.name ?? '', undefined, { numeric: true }) ||
    a.partId.localeCompare(b.partId)
  );
}

/**
 * Sıralama girdisinden bölüm kimliğini (id) normalize eder (eski string formatı veya yeni nesne formatı desteği).
 */
export function entryId(e: string | LevelOrderEntry): string {
  return typeof e === 'string' ? e : e.id;
}

