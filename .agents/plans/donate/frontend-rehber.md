# 📚 Frontend Developer Kılavuzu: Lemon Squeezy Bağış & SYNC Entegrasyonu

Bu kılavuz, **Know & Conquer** projesinde bağış yapıldıktan sonra koin (SYNC) ve rozetlerin frontend tarafında nasıl doğrulanacağını ve animasyonlu teşekkür sayfasının (`/great-supporter`) veri akışını açıklar.

---

## 1. Genel Akış Şeması

```
[Bağış Sayfası /donate]
       │
       ▼ (sessionStorage'a UID, preDonationCoins ve preDonationTier kaydedilir)
[Lemon Squeezy Checkout]
       │
       ▼ (Ödeme Tamamlanır)
[Teşekkür Sayfası /great-supporter]
       │
       ├───► [Faz 1: Yükleme Ekranı (Min. 2sn)]
       │      • Arka planda Worker API (/donors/:uid) sorgulanır.
       │      • coinsBalance değeri ile preDonationCoins karşılaştırılır (Fark > 0 olana kadar).
       │
       └───► [Faz 2: Animasyonlu Reveal]
              • Dönen ☕ rozeti açılır.
              • Kazanılan SYNC (+X SYNC) sayacı 0'dan yukarı doğru akar.
              • Varsa yeni kazanılan Bronze/Silver/Gold rozetleri gösterilir.
```

---

## 2. Adım Adım Entegrasyon Kuralları

### A. Ödeme Yönlendirmesi ve Session Kaydı (`/donate` sayfası)
Kullanıcı ödeme yap butonuna bastığında, Lemon Squeezy'ye yönlendirilmeden önce **kritik veriler** `sessionStorage` alanına yazılmalıdır. Bu veriler, ödeme sonrası doğrulamayı (polling) yapmak için zorunludur.

* **Dosya**: `app/donate/DonateClient.tsx`
* **Yapılması Gerekenler**:
  1. `pendingDonorUid` (Kullanıcının Firebase UID'si)
  2. `preDonationCoins` (Kullanıcının ödeme yapmadan önceki toplam SYNC bakiye miktarı - `coinsBalance`)
  3. `preDonationTier` (Kullanıcının ödeme yapmadan önceki rozet kademesi - `badgeTier` veya yoksa `'none'`)

**Örnek Kod Yapısı (Submit İşlemi):**
```typescript
try {
  // 1. Polling ve doğrulama için gerekli bilgileri kaydet
  if (user && !isGuest) {
    sessionStorage.setItem('pendingDonorUid', user.uid);
    sessionStorage.setItem('preDonationCoins', String(userProfile?.coinsBalance ?? 0));
    sessionStorage.setItem('preDonationTier', userProfile?.badgeTier ?? 'none');
  } else {
    sessionStorage.removeItem('pendingDonorUid');
    sessionStorage.removeItem('preDonationCoins');
    sessionStorage.removeItem('preDonationTier');
  }

  // Önemli: /checkout/buy/ formatı kullanılmalıdır. Aksi halde 404 hatası alınır.
  const checkoutUrl = new URL(`https://${storeSubdomain}.lemonsqueezy.com/checkout/buy/${variantId}`);
  checkoutUrl.searchParams.append('checkout[custom_price]', String(cents));
  
  // Custom alanlar (Worker tarafında UID eşleştirmesi için kritik)
  if (user && !isGuest) {
    checkoutUrl.searchParams.append('custom[uid]', user.uid);
  }
  checkoutUrl.searchParams.append('custom[donor_alias]', donorName.trim() || 'Anonim');
  checkoutUrl.searchParams.append('custom[is_anonymous]', String(isAnonCheck));

  // Ödeme başarılı olduğunda kullanıcının döneceği URL (Success URL)
  const successUrl = `${window.location.origin}/great-supporter`;
  checkoutUrl.searchParams.append('checkout[success_url]', successUrl);

  // Yönlendir
  window.location.href = checkoutUrl.toString();
} catch (err) {
  console.error("Yönlendirme hatası:", err);
}
```

---

### B. Teşekkür Sayfası ve Polling Yapısı (`/great-supporter` sayfası)
Kullanıcı Lemon Squeezy'den başarıyla yönlendirildiğinde bu sayfaya gelir. Sayfada **kesinlikle "iyimser" (optimistic) veri gösterilmemelidir.** Tamamen gerçek API verisi beklenmelidir.

* **Doğrulama Koşulu**: 
  Worker'dan sorgulanan profilin `coinsBalance` değeri, `sessionStorage`'daki `preDonationCoins` değerinden **büyük** olduğunda (veya ilk defa bağış yapıyorsa `coinsBalance > 0` olduğunda) webhook veritabanına başarıyla yazılmış demektir.

* **Polling Kuralları**:
  * Sorgulama Sıklığı: **3 saniyede bir**
  * Maksimum Polling Süresi: **15 saniye** (5 deneme)
  * Zaman Aşımı (Timeout): Webhook 15 saniyede işlenmezse, ekrana "Ödemeniz başarıyla ulaştı fakat doğrulama gecikiyor. Koinleriniz birkaç dakika içinde profilinize yansıyacaktır." şeklinde güvenli bir hata uyarısı verilir.

* **Zorunlu Yükleme Süresi**: 
  Webhook 500ms içinde dahi tamamlansa, kullanıcının yükleme ekranındaki o premium havayı yaşaması için **en az 2 saniye (2000ms)** loading ekranı gösterilmelidir:
  `Promise.all([fetchData(), new Promise(r => setTimeout(r, 2000))])`

---

## 3. Dinamik Para Birimi Biçimlendirme (UI)

Kullanıcılar Lemon Squeezy üzerinde kendi yerel para birimleriyle (TRY, EUR, USD vb.) ödeme yapabilir. Sistem bu verileri veritabanında para birimi bazında tutar. Ön yüzde sabit `$` veya `USD` ibareleri yerine `Intl.NumberFormat` kullanılarak dinamik gösterim yapılmalıdır:

```typescript
const formatCurrency = (cents: number, curr: string, showDecimals = true) => {
  const amount = cents / 100;
  try {
    return new Intl.NumberFormat(lang === 'tr' ? 'tr-TR' : 'en-US', {
      style: 'currency',
      currency: curr ? curr.toUpperCase() : 'USD',
      minimumFractionDigits: showDecimals ? 2 : 0,
      maximumFractionDigits: showDecimals ? 2 : 0
    }).format(amount);
  } catch (e) {
    return `${amount.toFixed(showDecimals ? 2 : 0)} ${curr ? curr.toUpperCase() : 'USD'}`;
  }
};
```

---

## 4. Reveal Animasyon Zamanlamaları (Timeline)

Yükleme bittikten ve veri doğrulandıktan sonra, ekrandaki kartların ve koinlerin açılış akışı şu timeline'a göre kodlanmıştır (Framer Motion önerilir):

1. **0.0s** $\rightarrow$ Yükleme ekranı yumuşak bir şekilde kaybolur (fade-out).
2. **0.3s** $\rightarrow$ `"Harika Destekçi! 🎉"` ana başlığı ekrana büyüyerek gelir (scale-in).
3. **0.8s** $\rightarrow$ `donor_starter` rozet kartı (Kahve fincanlı rozet ☕) parlayarak ekrana gelir.
4. **1.5s** $\rightarrow$ Altındaki açıklama metni belirir.
5. **2.2s** $\rightarrow$ **SYNC Coin Sayacı** sıfırdan başlar ve kazanılan coin miktarına doğru akıcı bir şekilde yükselir (Count-up animasyonu, süresi `1.5s` olmalıdır).
   * *Not*: Ekranda saydırılacak koin miktarı: `profile.coinsBalance - preDonationCoins`.
   * *Tasarım Kuralı*: SYNC yazısı ve sayıları **neon sarı (`#ffd700`)**, monospace yazı tipi ve büyük puntolarla yazılmalıdır.
6. **3.8s** $\rightarrow$ **Eğer kullanıcı bu bağışıyla yeni bir kadro rozeti kazandıysa** (Bronze/Silver/Gold), ikinci rozet kartı ekrana gelir.
   * *Yeni Rozet Kontrolü*: `profile.badgeTier !== preDonationTier` (ve preDonationTier `'none'` değerinden farklıysa).
7. **4.8s** $\rightarrow$ Yönlendirme butonları (Oyuna Dön / Tekrar Destek Ol) belirir.

---

## 5. Kullanılan API Endpoint'leri

Frontend tarafında kullanacağın API rotaları şunlardır:

### 1. Kullanıcı Profili Sorgulama (Canlı Bilgi)
* **URL**: `GET /donors/:uid`
* **Güvenlik**: Bu endpoint üzerinde gizlilik koruması vardır. Eğer kullanıcının profili anonim ise, verileri sadece o profilin sahibi (Firebase giriş token'ı eşleşen kişi) görebilir. Dışarıdan sorgulayan biri için isim "Anonim" ve bakiye 0 döner.
* **Başarılı Yanıt Örneği**:
  ```json
  {
    "success": true,
    "profile": {
      "uid": "user_firebase_uid",
      "displayName": "Ahmet",
      "totalDonatedCents": 15000,
      "currency": "TRY",
      "badgeTier": "bronze",
      "isAnonymous": false,
      "coinsBalance": 500
    }
  }
  ```

### 2. En Çok Katkı Sağlayanlar (Liderlik Tablosu)
* **URL**: `GET /donors/top`
* **Yanıt Örneği**: İlk 50 kullanıcıyı döner. Üyelerin toplam USD karşılığı bağış miktarına (`total_donated_usd_cents`) göre adil şekilde sıralanmıştır. Anonim olarak bağış yapanların UID bilgileri gizlenir ve isimleri D1 tarafında otomatik maskelenerek "Anonim" olarak gelir.

