# 04 — Ödüllü İpucu

## Yapılacak İş

Oyuncu takıldığında ödüllü reklam izleyerek, **mevcut durumundan** gidilebilecek bir sonraki doğru hamleyi görebilsin.

- **İpucu hesaplama (`game-engine` katmanında, saf).** Oyuncunun o anki durumundan çözüm aranır; `solver/solver.ts` içindeki `solveFromState` fonksiyonu incelenmelidir. Oyuncu çözümsüz bir duruma düştüyse, ipucu "geri al" ya da "yeniden başlat" önerir. Hesaplama ana thread'i dondurmamalıdır: gerekirse Web Worker'a alınır, zaman sınırı konur ve sonuç önbelleğe alınır.
- **İpucunun gösterimi (sunum katmanında).** Hamle, oyunun görsel diliyle uyumlu biçimde işaretlenir: vurgulanan varlık ve yön oku gibi. Oyuncu hamleyi yapınca işaret kaybolur.
- **"Ödüllü aksiyon" altyapısı.** Ödüllü reklam, bekleme ve ödülün verilmesi akışı, **05 numaralı görevde (level atlama) de kullanılacak şekilde** tek ve genel bir yapı olarak kurulur. İpucu bu yapının ilk kullanıcısıdır.
- **Platform davranışı.** Ödüllü reklam desteklenmeyen platformlarda (web, Electron) ya da reklamsız hakkı olan kullanıcıda davranış net olmalı. Önerilen başlangıç: reklamsız kullanıcı ipucunu reklamsız alır; reklam altyapısı olmayan platformda ipucu ücretsiz ama sınırlıdır (ör. level başına 1). Seçilen davranışı yapılandırılabilir tut.
- **Skor bütünlüğü (sunucu).** İpucu kullanılan çözümler, "en iyi hamle" rekorlarını ve 3 yıldız dağılımını anlamsızlaştırmamalıdır. Çözüm gönderiminde ipucu kullanıldığı bilgisi worker'a iletilir ve kaydedilir. Worker'ın bu bilgiyle ne yapacağı aşağıdaki karara göre uygulanır.

> **KARAR (ürün sahibi — Ahmet):** İpucu kullanılan çözüm için:
> (a) yıldız 2 ile sınırlanır ve `bestMoveCount` rekoruna sayılmaz — *önerilen*,
> (b) normal sayılır, sadece işaretlenir,
> (c) başka bir kural.
> Agent başlamadan önce burası doldurulmalıdır. Karar: **\_\_\_\_\_\_\_\_**

- **Telemetri.** Hangi levelde ne kadar ipucu kullanıldığı mevcut level telemetrisine eklenir (bkz. migration `0010_level_telemetry.sql`). Bu veri level zorluk ayarı için değerlidir.

## Hedef

- Oyun ekranında ipucu butonu var. Reklam izlenince doğru bir sonraki hamle gösterilir.
- Gösterilen ipucu, durumdan bağımsız olarak **her zaman çözüme götürür** ya da çözümsüzlüğü doğru bildirir.
- İpucu kullanımı skor ve liderlik bütünlüğünü seçilen karara göre korur ve sunucu tarafında doğrulanır.
- "Ödüllü aksiyon" altyapısı 05 numaralı görevin doğrudan kullanabileceği hâldedir.
