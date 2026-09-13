/**
 * DOSYA AMACI: Sunucu ipucu motorunun hesaplama bütçesi ve gösterim sabitleri.
 * Bütçe taranan durum sayısıyla ölçülür (Worker'da hesaplama sırasında süre
 * ilerlemez, ölçülemez).
 *
 * Ölçüm (2026-09-13, Node/V8, 2 oyunculu açık grid): durum başına ~100 µs (8x8)
 * ile ~450 µs (12x12). Çözülebilir tipik durum 0,1–2,5 sn; çözümsüz ve geniş
 * durum uzayında bir arama bütçenin tamamını harcar. En kötü istek
 * `totalStates + maxStatesPerSearch` durum tarar (≈ 12x12'de 8 sn CPU) —
 * Workers Paid varsayılan 30 sn CPU sınırının güvenli altında. Workers Free
 * planında (10 ms CPU) ipucu çalışmaz.
 */

export interface HintBudget {
  /** Tek aramanın en fazla adım derinliği. */
  maxDepth: number;
  /** Tek aramanın en fazla taradığı durum. */
  maxStatesPerSearch: number;
  /** Mevcut durum + geri alma denemelerinin toplam durum bütçesi (baştan başlama araması hariç). */
  totalStates: number;
  /** Çözümsüz durumda en fazla kaç geri alma noktası denenir. */
  maxUndoProbes: number;
}

export const DEFAULT_HINT_BUDGET: HintBudget = {
  maxDepth: 60,
  maxStatesPerSearch: 6_000,
  totalStates: 12_000,
  maxUndoProbes: 10,
};

/** İpucunda gösterilen en fazla adım sayısı. */
export const HINT_PREVIEW_LENGTH = 5;
