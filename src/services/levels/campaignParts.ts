/**
 * DOSYA AMACI: Kampanya bölüm paketlerini (levelParts) Firestore'dan getirir ve
 * her başarılı sonucu localStorage'a yedekler. Firestore'a ulaşılamazsa (portal
 * build'i çevrimdışı, ya da herhangi bir platformda ağ hatası) en son bilinen
 * listeyi döner — harita tamamen boş kalmaz. Leveller GÖMÜLMEZ (bkz.
 * 02-portal-buildleri.md §4); bu yalnızca "bölüm listesi" için bir önbellektir,
 * level grid'leri Dexie'de zaten önbelleklenir (bkz. `services/firebase/sync`).
 */
import { getAllParts, type LevelPart } from '../firebase/adminParts';
import { compareParts } from '../firebase/adminTypes';

const CACHE_KEY = 'campaignParts:cache:v1';

function readCache(): LevelPart[] | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Eski sürümlerin yazdığı (sırasız) önbellek de doğru sırada dönsün.
    return Array.isArray(parsed) ? (parsed as LevelPart[]).sort(compareParts) : null;
  } catch {
    return null;
  }
}

function writeCache(parts: LevelPart[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(parts));
  } catch {
    // Depolama dolu/erişilemez olabilir — sadece önbellek etkilenir, akış devam eder.
  }
}

/**
 * Bölüm listesini getirir. Firestore başarılı olursa sonuç önbelleğe yazılır;
 * başarısız olursa (çevrimdışı) en son önbelleklenen liste döner (yoksa boş dizi).
 */
export async function getCampaignParts(): Promise<LevelPart[]> {
  try {
    const parts = await getAllParts();
    writeCache(parts);
    return parts;
  } catch (err) {
    console.warn('[campaignParts] Firestore erişilemedi, önbellekten dönülüyor:', err);
    return readCache() ?? [];
  }
}
