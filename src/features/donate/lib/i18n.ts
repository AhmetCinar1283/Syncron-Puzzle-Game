export const LOCAL_T = {
  tr: {
    title: 'Bağış Yap',
    subtitle: 'Know & Conquer gelişimini destekleyin. Oyunu hep birlikte daha da büyütebiliriz!',
    quickSelect: 'Hızlı Seçim',
    customAmount: 'Özel Miktar (USD)',
    customAmountPlaceholder: 'Örn. 15',
    donorName: 'Bağışçı Adı',
    donorNamePlaceholder: 'Görünmesini istediğiniz ad (boş bırakılırsa Anonim)',
    anonymousCheckbox: 'Beni bağışçılar duvarında gizle (Anonim olarak göster)',
    submitBtn: 'Lemon Squeezy ile Bağış Yap',
    loading: 'Yükleniyor...',
    loginToBadge: 'Rozet kazanmak ve bağışlarınızı profilinizde biriktirmek için lütfen giriş yapın.',
    currentStatus: 'Mevcut Durumunuz',
    totalDonated: 'Toplam Katkınız:',
    badgeTier: 'Rozet Seviyeniz:',
    tiersTitle: 'Destekçi Rozet Seviyeleri',
    tierBronze: 'Bronze Destekçi',
    tierBronzeDesc: '5 USD veya üzeri kümülatif bağışlar için.',
    tierSilver: 'Silver Koruyucu',
    tierSilverDesc: '20 USD veya üzeri kümülatif bağışlar için.',
    tierGold: 'Gold Kahraman',
    tierGoldDesc: '50 USD veya üzeri kümülatif bağışlar için.',
    anonLabel: 'Anonim',
    noBadge: 'Rozet yok',
    recentDonors: 'En Çok Destek Olanlar',
    errorMin: 'Minimum bağış miktarı 1 USD olmalıdır.',
    errorSubmit: 'Bir hata oluştu, lütfen tekrar deneyin.',
    currencyText: 'Para birimi USD ($) bazlıdır. Lemon Squeezy ödeme ekranında yerel para biriminize otomatik çevrilecektir.',
  },
  en: {
    title: 'Donate',
    subtitle: 'Support the development of Know & Conquer. Together we can make the game even better!',
    quickSelect: 'Quick Select',
    customAmount: 'Custom Amount (USD)',
    customAmountPlaceholder: 'e.g. 15',
    donorName: 'Donor Name',
    donorNamePlaceholder: 'Name you want to display (Anonymous if empty)',
    anonymousCheckbox: 'Hide me on the supporters wall (Show as Anonymous)',
    submitBtn: 'Donate with Lemon Squeezy',
    loading: 'Loading...',
    loginToBadge: 'Please sign in to earn badges and keep track of your contributions.',
    currentStatus: 'Your Current Status',
    totalDonated: 'Total Contribution:',
    badgeTier: 'Badge Tier:',
    tiersTitle: 'Supporter Badge Tiers',
    tierBronze: 'Bronze Supporter',
    tierBronzeDesc: 'For cumulative donations of 5 USD or more.',
    tierSilver: 'Silver Guardian',
    tierSilverDesc: 'For cumulative donations of 20 USD or more.',
    tierGold: 'Gold Hero',
    tierGoldDesc: 'For cumulative donations of 50 USD or more.',
    anonLabel: 'Anonymous',
    noBadge: 'No badge',
    recentDonors: 'Top Supporters',
    errorMin: 'Minimum donation amount is 1 USD.',
    errorSubmit: 'An error occurred, please try again.',
    currencyText: 'Donation amount is based on USD ($). Lemon Squeezy will automatically convert to your local currency during checkout.',
  }
};

export const QUICK_AMOUNTS = [1, 2, 5, 10];

export interface DonorProfile {
  uid: string | null;
  displayName: string;
  totalDonatedCents: number;
  currency: string;
  badgeTier: 'bronze' | 'silver' | 'gold' | null;
  isAnonymous: boolean;
  coinsBalance: number;
}
