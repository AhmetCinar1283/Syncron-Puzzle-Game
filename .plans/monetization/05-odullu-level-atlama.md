# 05 — Ödüllü Level Atlama

## Yapılacak İş

Bir levelde takılıp kalan oyuncu, ödüllü reklam izleyerek o leveli atlayıp bir sonrakine geçebilsin. Amaç, oyuncunun oyunu bırakmasını önlemek.

- **Mevcut altyapıyı kullan.** 04 numaralı görevin kurduğu "ödüllü aksiyon" altyapısı kullanılır. Yeni bir reklam akışı yazılmaz.
- **Görünürlük.** Atlama seçeneği her zaman değil, oyuncu gerçekten takıldığında öne çıkar. Örnek eşikler: belirli sayıda yeniden başlatma ya da levelde belirli bir süre geçirmek. Eşikler yapılandırılabilir olmalı.
- **Atlanan levelin durumu.** Atlanan level tamamlanmış **sayılmaz**. Yıldız, skor, XP, liderlik puanı ya da rozet vermez. Yalnızca ilerleme kilidini açar. Harita ve listede "atlandı" olarak ayrıca gösterilir; oyuncu istediği zaman geri dönüp gerçekten çözebilir.
- **Kilit mantığının tespiti.** Level kilit açma mantığının istemcide mi sunucuda mı olduğu tespit edilmeli ve "atlandı" durumu o mantığa tutarlı biçimde eklenmelidir. Durum, `playedLevels` senkronizasyonu (Dexie ↔ D1) üzerinden cihazlar arasında taşınır. Gerekiyorsa yeni bir migration yazılır.
- **Kötüye kullanım sınırı.** Bu durum skor vermediği için hafif bir sınır yeterlidir. Örnek: art arda atlanabilecek level sayısı. Gerekçesini rapora yaz.
- **Dünya/bölüm sonu levelleri.** Atlanabilir olup olmayacakları yapılandırmayla belirlenebilir olmalı.
- **Telemetri.** Hangi levelin kaç kez atlandığı level telemetrisine eklenir. Çok atlanan level, zorluk ayarı gerektiğini gösterir.

## Hedef

- Takılan oyuncu reklam izleyerek ilerleyebilir. Atlanan level görsel olarak ayırt edilir ve sonradan çözülebilir.
- Atlama hiçbir skor, yıldız veya liderlik değerini değiştirmez ve bu, sunucu tarafında garanti edilir.
- "Atlandı" durumu cihazlar arasında senkronize olur. Portal build'lerinde (sunucu yokken) yerel olarak çalışır.
