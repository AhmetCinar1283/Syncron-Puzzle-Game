# Level Tasarım Notları

Kişisel not. Level sayısını 50'den artırırken akılda tutulacaklar.

## Dünya Yapısı

- Her dünya 15–20 levelden oluşur ve **tek bir yeni mekanik** öğretir.
- Bir dünyanın içindeki akış:
  1. **Tanıtım (1–2 level):** Mekaniği tek başına, neredeyse bedava gösterir. Oyuncu metin okumadan "aha" demeli.
  2. **Pekiştirme (3–5 level):** Mekaniği farklı bağlamlarda kullandırır.
  3. **Birleştirme:** Yeni mekaniği önceki mekaniklerle karıştırır.
  4. **Zirve:** Dünyanın en zor 1–2 leveli.
  5. **Nefes:** Kısa, tatmin edici bir kapanış leveli. Oyuncu bir sonraki dünyaya iyi hisle geçer.
- Zorluk düz bir çizgi değil, **testere dişi** gibi ilerlemeli: yükselir, düşer, bir öncekinden biraz daha yükseğe çıkar.

## Her Level İçin Tutulacak Bilgiler

| Alan | Açıklama |
|---|---|
| `world` / `order` | Hangi dünyanın kaçıncı leveli |
| `introducesMechanic` | Bu levelde ilk kez görülen mekanik (varsa) |
| `parMoves` | Çözücünün bulduğu en kısa çözüm. 3 yıldız hedefi için referans |
| `difficulty` | Çözücünün taradığı durum sayısından (`statesExplored`) ve hamle sayısından türetilen skor |

Çözücünün `statesExplored` değeri iyi bir **objektif zorluk göstergesi**. Yeni levelleri bu değere göre sıralayıp dünyadaki yerine koymak, sezgiye göre yerleştirmekten daha tutarlı sonuç verir.

## Veriye Bakarak Ayar Yapmak

Ödüllü ipucu ve level atlama devreye girince telemetri çok değerli bir sinyal verecek:

- **Çok atlanan level:** Ya çok zor ya da mekanik iyi öğretilmemiş. Önceki levellere bir tanıtım leveli ekle veya bu leveli sona taşı.
- **İpucu kullanımında ani sıçrama:** O noktada zorluk eğrisi kırılmış.
- **Terk oranı (level başlandı ama bitirilmedi):** En kritik sinyal. İlk 10 levelde yüksek terk varsa diğer tüm çabalar boşa gider.

## Üretici Kullanımı

- `solver/generator.ts` son level olarak değil, **aday havuzu** olarak kullanılmalı: üret, çözücüyle puanla, en ilginçlerini editörde elle düzelt.
- Üretilen levelleri en iyi yerleştirme yeri **günlük bulmaca havuzu** ve dünyaların "pekiştirme" bölümüdür. Tanıtım ve zirve levelleri elle tasarlanmalı.

## Kontrol Listesi (her yeni level)

- [ ] Çözücüyle çözülebilir ve `parMoves` hesaplandı
- [ ] Tek ve belirgin bir "aha" anı var
- [ ] İlk hamle bariz değil ama ilk bakışta imkânsız da görünmüyor
- [ ] Önceki levelin kopyası gibi hissettirmiyor
- [ ] Mobilde (küçük ekranda) okunaklı
