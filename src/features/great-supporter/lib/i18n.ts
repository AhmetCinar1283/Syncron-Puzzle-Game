export const LOCAL_T = {
  tr: {
    loadingTitle: 'İşleminiz Doğrulanıyor',
    verifying: 'Ödemeniz doğrulanıyor...',
    preparing: 'SYNC hazırlanıyor...',
    checking: 'Rozetler kontrol ediliyor...',
    almost: 'Neredeyse hazır...',
    successTitle: 'Harika Destekçi!',
    successSubtitle: 'Know & Conquer\'a desteğiniz için çok teşekkür ederiz!',
    starterBadgeAwarded: 'donor_starter rozeti kazandınız!',
    newTierAwarded: (tier: string) => `Tebrikler! ${tier.toUpperCase()} seviyesine yükseldiniz!`,
    syncEarned: 'Kazanılan SYNC',
    totalBalance: 'Toplam Bakiye',
    btnBack: 'Oyuna Dön',
    btnDonate: 'Tekrar Destek Ol',
    timeoutTitle: 'Ödemeniz Alındı!',
    timeoutDesc: 'Ödemeniz başarıyla ulaştı fakat Lemon Squeezy doğrulaması biraz gecikti. SYNC ve rozetleriniz birkaç dakika içinde profilinize eklenecektir.',
    btnProfile: 'Profilimi Gör',
    badgeStarter: 'Kahve Sever Başlangıç Rozeti',
    badgeDesc: 'Her bağışçıya özel kalıcı rozet.',
    bronze: 'Bronze Destekçi',
    silver: 'Silver Koruyucu',
    gold: 'Gold Kahraman',
  },
  en: {
    loadingTitle: 'Verifying Transaction',
    verifying: 'Verifying your payment...',
    preparing: 'Preparing your SYNC...',
    checking: 'Checking your badges...',
    almost: 'Almost ready...',
    successTitle: 'Great Supporter!',
    successSubtitle: 'Thank you so much for supporting Know & Conquer!',
    starterBadgeAwarded: 'You earned the donor_starter badge!',
    newTierAwarded: (tier: string) => `Congratulations! Promoted to ${tier.toUpperCase()} tier!`,
    syncEarned: 'SYNC Earned',
    totalBalance: 'Total Balance',
    btnBack: 'Back to Game',
    btnDonate: 'Support Again',
    timeoutTitle: 'Payment Received!',
    timeoutDesc: 'Your payment went through successfully, but the verification is taking longer than usual. Your SYNC and badges will be updated in a few minutes.',
    btnProfile: 'View My Profile',
    badgeStarter: 'Coffee Lover Starter Badge',
    badgeDesc: 'A permanent badge gifted to all supporters.',
    bronze: 'Bronze Supporter',
    silver: 'Silver Guardian',
    gold: 'Gold Hero',
  }
};

export interface DonorProfile {
  uid: string | null;
  displayName: string;
  totalDonatedCents: number;
  currency: string;
  badgeTier: 'bronze' | 'silver' | 'gold' | null;
  isAnonymous: boolean;
  coinsBalance: number;
}
