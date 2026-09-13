/**
 * DOSYA AMACI: "Reklamları kaldır" teklifinin görünen bilgileri. Gerçek satın
 * alma akışı 07 numaralı görevde kurulacak; o güne kadar burası yalnızca
 * teşvik kartında gösterilecek YER TUTUCU fiyatı ve teklifin satın
 * alınabilir olup olmadığını taşır (bkz. components/AfterAdPrompt.tsx).
 */

export interface RemoveAdsOffer {
  /** Kullanıcıya gösterilen fiyat metni. 07'de gerçek mağaza fiyatıyla değişecek. */
  price: string;
  /** Satın alma akışı hazır mı. `false` iken "çok yakında" mesajı gösterilir. */
  purchasable: boolean;
}

export const REMOVE_ADS_OFFER: RemoveAdsOffer = {
  price: '₺49,99',
  purchasable: false,
};
