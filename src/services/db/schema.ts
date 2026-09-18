/**
 * DOSYA AMACI: Bu dosya, Dexie.js (IndexedDB) kullanarak tarayıcı tarafında
 * yerel veritabanı şemasını, tablo yapılarını ve versiyon geçmişini tanımlar.
 */

import Dexie, { type Table } from 'dexie';
import type { LevelEdges, CellType, LevelObjectDef, LevelTargetDef, BoxDef, Position, ConveyorCellConfig, TrampolineCellConfig, DeflectorCellConfig } from '../../game-engine/level-format';
export type LauncherCellConfig = any;

// ─── Stored Types (Veri Modelleri) ─────────────────────────────────────────────

/**
 * Yerel olarak saklanan bir bölümün (level) şeması.
 */
export interface StoredLevel {
  id?: number;           // Dexie otomatik artan birincil anahtar ID'si
  firestoreId?: string;  // Firestore doküman ID'si (yalnızca hazır bölümler için)
  lockedCells?: Record<string, boolean>;
  name: string;
  width: number;
  height: number;
  edges: LevelEdges;
  grid: CellType[][] | string;
  initialObjects: LevelObjectDef[];
  targets: LevelTargetDef[];
  trailCollision?: boolean;
  initialBoxes?: BoxDef[];
  conveyorPowerRequired?: Position[];
  conveyorConfig?: ConveyorCellConfig[];
  launcherConfig?: LauncherCellConfig[];
  trampolineConfig?: TrampolineCellConfig[];
  deflectorConfig?: DeflectorCellConfig[];
  creatorName?: string;  // Topluluk tarafından oluşturulan bölümler için oluşturan kişi
  difficulty?: 1 | 2 | 3 | 4;  // Zorluk derecesi: 1=Kolay, 2=Orta, 3=Zor, 4=Çok Zor
  version?: number;       // Bölüm versiyon numarası (istatistik takibi için)
  part?: string;          // Bölüm paketi ID'si (kampanya bölümleri için)
  requestId?: string;     // Bekleyen onay isteklerini takip etmek için Firestore levelRequests ID'si
  isNeedSync?: boolean;   // true = oynamadan önce Firestore'dan güncel veriyi çek
  rooms?: any[];          // Çoklu oda (multi-room) desteği listesi
  controlMode?: 'all_rooms' | 'selected_room';
  initialControlledRooms?: string[];
  gameNotes?: string;
  creatorNotes?: string;
  createdAt: number;
  position: number;
  updatedAt: number;
}

/**
 * Bölümlerin ekrandaki görüntülenme sırasını tutan tek bir kayıt (id: 1).
 * Sıralama güncellemeleri yalnızca bu kaydı değiştirir.
 */
export interface LevelOrderRecord {
  id: 1;
  order: number[]; // Görüntülenme sırasına göre StoredLevel ID listesi
}

/** 
 * Tamamlanan bölümlerin yerel önbellek kaydı.
 */
export interface StoredPlayedLevel {
  levelId: string;     // Birincil anahtar = Firestore doküman ID'si
  score: number;
  timeSpent: number;   // Saniye cinsinden harcanan süre
  completedAt: number; // ms zaman damgası
  updatedAt: number;   // ms zaman damgası
  moveCount?: number;  // Elde edilen en iyi hamle sayısı
  moves?: string[];    // Hamlelerin yön dizisi (örn: ['up', 'right', ...])
  stars?: 1 | 2 | 3;   // Kazanılan en iyi yıldız derecesi (1-3 arası)
}

/**
 * Ödüllü reklamla atlanan bir bölümün yerel kaydı (05). Skor taşımaz: yalnızca
 * ilerleme kilidini açar. Bölüm sonradan çözülürse `playedLevels` kaydı önceliklidir.
 */
export interface StoredSkippedLevel {
  levelId: string;     // Birincil anahtar = Firestore doküman ID'si
  skippedAt: number;   // ms zaman damgası
  updatedAt: number;   // ms zaman damgası
}

/** 
 * Koleksiyon bazlı senkronizasyon zaman damgalarını tutan tablo şeması.
 */
export interface SyncMetaRecord {
  collection: string; // Birincil anahtar (örn: "part_1", "playedLevels")
  lastSync: number;   // En son başarılı senkronizasyonun ms zaman damgası
}

// ─── Database (Veritabanı Sınıfı) ───────────────────────────────────────────────

/**
 * Uygulamanın IndexedDB veritabanı yönetim sınıfı.
 */
export class KnowAndConquerDB extends Dexie {
  levels!: Table<StoredLevel>;
  levelOrder!: Table<LevelOrderRecord>;
  presetLevels!: Table<StoredLevel>;
  playedLevels!: Table<StoredPlayedLevel>;
  skippedLevels!: Table<StoredSkippedLevel>;
  syncMeta!: Table<SyncMetaRecord>;

  constructor() {
    super('KnowAndConquerDB');
    // Versiyon 1-9: Veritabanı şema versiyon geçmişi
    this.version(1).stores({ levels: '++id', levelOrder: 'id' });
    this.version(2).stores({ levels: '++id', levelOrder: 'id' });
    this.version(3).stores({ levels: '++id', levelOrder: 'id', presetLevels: '++id' });
    this.version(4).stores({ levels: '++id', levelOrder: 'id', presetLevels: '++id, firestoreId' });
    this.version(5).stores({
      levels: '++id',
      levelOrder: 'id',
      presetLevels: '++id, firestoreId',
      syncMeta: 'collection',
      playedLevels: 'levelId, updatedAt',
    });
    this.version(6).stores({
      levels: '++id',
      levelOrder: 'id',
      presetLevels: '++id, firestoreId',
      syncMeta: 'collection',
      playedLevels: 'levelId, updatedAt',
    });
    this.version(7).stores({
      levels: '++id',
      levelOrder: 'id',
      presetLevels: '++id, firestoreId',
      syncMeta: 'collection',
      playedLevels: 'levelId, updatedAt',
    });
    this.version(8).stores({
      levels: '++id',
      levelOrder: 'id',
      presetLevels: '++id, firestoreId',
      syncMeta: 'collection',
      playedLevels: 'levelId, updatedAt',
    });
    this.version(9).stores({
      levels: '++id',
      levelOrder: 'id',
      presetLevels: '++id, firestoreId',
      syncMeta: 'collection',
      playedLevels: 'levelId, updatedAt',
    });
    // Versiyon 10: Oynanan bölümler kaynağının Firestore'dan Cloudflare D1'e taşınması.
    // Eski Firestore imlecini siler, böylece yeni D1 senkronizasyonu tam çekim tetikler.
    this.version(10).stores({
      levels: '++id',
      levelOrder: 'id',
      presetLevels: '++id, firestoreId',
      syncMeta: 'collection',
      playedLevels: 'levelId, updatedAt',
    }).upgrade((tx) => {
      // Temiz bir D1 tam senkronizasyonu tetiklemek için eski imleci temizler
      return tx.table('syncMeta').delete('playedLevels');
    });
    // Versiyon 11: Ödüllü level atlama (05) — atlanan bölümler ayrı tabloda (skor taşımaz).
    // Mevcut D1 imleci atlama kayıtlarını hiç çekmediği için silinir → bir sonraki sync tam çekim yapar.
    this.version(11).stores({
      levels: '++id',
      levelOrder: 'id',
      presetLevels: '++id, firestoreId',
      syncMeta: 'collection',
      playedLevels: 'levelId, updatedAt',
      skippedLevels: 'levelId, updatedAt',
    }).upgrade((tx) => {
      return tx.table('syncMeta').delete('playedLevels_d1');
    });
  }
}

// Lazy singleton - Yalnızca tarayıcı ortamında başlatılır
let _db: KnowAndConquerDB | undefined;
export function getDB(): KnowAndConquerDB {
  if (!_db) _db = new KnowAndConquerDB();
  return _db;
}

