'use client';
/**
 * DOSYA AMACI: Bu görünmez (render edilmeyen) bileşen, uygulamanın kök (root)
 * düzeninde konumlanarak arka planda Firestore verilerini yerel Dexie (IndexedDB)
 * veritabanına senkronize etme sürecini tetikler.
 */

import { useFirestoreSync } from '../hooks/useFirestoreSync';

export default function FirestoreSync() {
  // Arka plan Firestore-Dexie senkronizasyon hook'unu tetikler
  useFirestoreSync();
  return null;
}

