# Ölçüm Rehberi — Proje Sahibi İçin

Bu iz boyunca ajanlar "ölçülmeyi bekliyor" diye not düşüyor. Ölçümü yapabilecek
tek kişi sensin; bu dosya nasıl yapacağını anlatır. Bir kez kurarsın, sonra her
fazda 10 dakikada tekrarlarsın.

Ölçüm **Faz 07 bitmeden anlamlı değil** — sis o zaman geliyor, canvas yolu ondan
önce eksik. Tek istisna: sissiz bir bölümle şimdiden bakabilirsin.

---

## 0. Bir kerelik kurulum

Telefonda: Ayarlar → Telefon hakkında → Derleme numarasına 7 kez dokun →
Geliştirici seçenekleri → **USB hata ayıklama** açık.

Bilgisayarda `adb`'nin çalıştığını doğrula (Android Studio ile birlikte gelir):

    adb devices

Telefon listede `device` olarak görünmeli. `unauthorized` diyorsa telefondaki
izin penceresini onayla.

---

## 1. En kolay ve en doğru yöntem: Chrome DevTools uzaktan hata ayıklama

Capacitor'ın WebView'ı, hata ayıklama derlemesinde masaüstü Chrome'dan
incelenebilir. **Gerçek cihazda, gerçek oyunda, gerçek kare süresi** verir.

1. `npm run build:mobile`
2. `npx cap run android` (veya Android Studio'dan çalıştır)
3. Masaüstü Chrome'da adres çubuğuna: `chrome://inspect/#devices`
4. Listede oyunun WebView'ı çıkar → **inspect**
5. Açılan DevTools'ta **Performance** sekmesi → kayıt düğmesi → telefonda 10-15
   saniye oyna → durdur.

Bakacakların:

| Nerede | Ne arıyorsun |
|---|---|
| **Frames** şeridi | Kırmızı/sarı çubuklar = 16.7ms'yi aşan kareler. Sayısı ve nerede olduğu. |
| **Main** şeridi | Uzun bloklar. DOM modunda "Recalculate Style" / "Paint" / "Composite Layers" bekleniyor; canvas modunda bunların yerine tek bir RAF geri çağrısı olmalı. |
| **Summary** halkası | Rendering + Painting yüzdesi. Canvas'ın işi bu ikisini küçültmek. |
| Boştayken kayıt | **Hiç kare olmamalı** (canvas, `lite` kademe). DOM'da sürekli kare göreceksin — asıl fark burası. |

> Boşta kayıt en çarpıcı testtir ve ısınma/şarj sorusunun doğrudan cevabıdır:
> bölümü aç, telefona **hiç dokunma**, 30 saniye kaydet. Canvas modunda zaman
> çizelgesi boş olmalı.

---

## 2. Sayısal ve hızlı: `dumpsys gfxinfo`

DevTools açmadan, tek komutla kare dağılımı. Oynamadan hemen önce sıfırla,
oynadıktan sonra oku:

    adb shell dumpsys gfxinfo <paket.adi> reset
    # ... telefonda 1-2 dakika oyna ...
    adb shell dumpsys gfxinfo <paket.adi>

Paket adını `capacitor.config.*` dosyasındaki `appId` verir.

Çıktıda arayacakların:

- `Total frames rendered` ve `Janky frames` → **janky yüzdesi**. Asıl karşılaştırma
  ölçütü bu. DOM modunda ölç, canvas modunda ölç, yan yana koy.
- `50th / 90th / 95th / 99th percentile` → p95 doğrudan burada yazıyor.
- `Number of Slow Bitmap Uploads` ve `Number of Slow Issue Draw Commands` →
  sprite'lar çok büyükse burada patlar. Vignette kararının sağlamasını bu verir.

---

## 3. Oyunun kendi ölçeri (Faz 07'den sonra)

Faz 07 `render/profiler.ts`'i yazıyor. Açıldığında tahtanın köşesinde katman
başına ortalama/p95 kare süresi, saniyedeki çizim sayısı, sprite sayısı ve
yaklaşık sprite belleği görünür. Açma komutunu 07-rapor tek satır olarak verecek.

Bunun avantajı: **katman ayrımını görürsün.** `dumpsys` sana "kare yavaş" der,
profiler "yavaş olan `actors` katmanı" der.

---

## 4. Isınma ve şarj

Sayıya gerek yok ama karşılaştırma gerek. Her iki modda **aynı koşulda**:

- Telefonu %100'e yakın şarjla başlat, fişi çıkar, parlaklığı sabitle,
  uçak modunu aç (arka plan trafiği ölçümü kirletir).
- 10 dakika oyna. Başta ve sonda şarj yüzdesini not et.
- Telefonun arkasına elini koy. Öznel ama en dürüst gösterge bu.

İstersen sayısal: pil sıcaklığı onda bir derece cinsinden gelir —

    adb shell dumpsys battery | findstr temperature

---

## 5. İki modu değiştirme

**Varsayılan `'dom'`.** Faz 08'e kadar bayrağı elle açmadan canvas yolunu
görmezsin — `npx cap run android` deyip oynamak sana hep DOM'u oynatır.

Anahtar kullanıcı UID'si ile ön ekli (`src/lib/userStorage.ts`), o yüzden düz
`boardRenderer` yazmak **işe yaramaz**. DevTools konsoluna (bkz. §1):

```js
localStorage.setItem(
  `${localStorage.getItem('activeUserId') ?? 'anon'}:boardRenderer`,
  'canvas'
);
location.reload();
```

Geri dönmek için `'canvas'` yerine `'dom'`. Silmek (varsayılana dönmek) için
`localStorage.removeItem(...)` aynı anahtarla.

Telefona gitmeden önce **masaüstünde** `npm run dev` ile aynı komutu dene;
canvas hiç açılmıyorsa veya bozuksa cihazda uğraşmadan orada görürsün.

> Faz 07 bitene kadar **sisli bölüm seçme** — sis o fazda geliyor, canvas modunda
> şimdilik her şey görünür çiziliyor. Bozuk değil, henüz yazılmadı.

Önemli olan: **aynı bölümü, aynı hamlelerle, aynı sırayla** iki modda da oyna.
Farklı bölüm karşılaştırması bir şey söylemez.

---

## 6. Faz 08'e ne götüreceksin

Ajanın karar verebilmesi için elinde şu tablo olmalı:

| | DOM | Canvas |
|---|---|---|
| Janky kare yüzdesi (kalabalık bölüm) | | |
| p95 kare süresi | | |
| Zafer koreografisinin en kötü karesi | | |
| Boşta 30sn'de çizilen kare sayısı | | |
| 10 dakikada şarj düşüşü | | |
| Bitişte pil sıcaklığı | | |

Bir de gözle bakıp "şurası DOM'dan farklı" dediğin her şeyin listesi. Raporlardaki
"Görsel farklar" listesinde olmayan bir fark varsa, o bir hatadır.
