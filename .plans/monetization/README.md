# Para Kazanma (Monetization) Yol Haritası

Bu klasör, Syncron'un gelir kanallarını devreye alma işini **sırayla agent'lara verilecek görevler** hâlinde tanımlar.
Her dosya yalnızca **yapılacak işi** ve **ulaşılması istenen hedefi** anlatır. Uygulama planını görevi alan agent kendisi çıkarır.

> Her agent işe başlamadan önce **[00-mimari-ilkeler.md](00-mimari-ilkeler.md)** dosyasını okumak zorundadır. Oradaki kurallar tüm görevler için bağlayıcıdır.

## Görev Sırası

| # | Görev | Dosya | Bağımlılık |
|---|---|---|---|
| 1 | Reklam adaptör katmanı | [01-reklam-adaptor-katmani.md](01-reklam-adaptor-katmani.md) | — |
| 2 | CrazyGames & GameDistribution build'leri | [02-portal-buildleri.md](02-portal-buildleri.md) | 1 |
| 3 | Android AdMob | [03-android-admob.md](03-android-admob.md) | 1 |
| 4 | Ödüllü ipucu | [04-odullu-ipucu.md](04-odullu-ipucu.md) | 1 |
| 5 | Ödüllü level atlama | [05-odullu-level-atlama.md](05-odullu-level-atlama.md) | 1 (4 ile aynı "ödüllü aksiyon" altyapısını paylaşır) |
| 6 | Günlük bulmaca | [06-gunluk-bulmaca.md](06-gunluk-bulmaca.md) | — (ödüllü aksiyonlar varsa onlara bağlanır) |
| 7 | "Reklamları Kaldır" satın alımı | [07-reklamlari-kaldir.md](07-reklamlari-kaldir.md) | 1, 3 |

2 ve 3 birbirinden bağımsızdır, paralel yürüyebilir. 4 ile 5 de öyle, ancak 5 başlarken 4'ün kurduğu ortak altyapı yeniden kullanılmalıdır; ikinci bir kopya yazılmamalıdır.

## Kapsam Dışı (şimdilik)

- **AdSense / H5 Games Ads:** Hesap onaylanmadığı için ertelendi. Adaptör katmanı, ileride bir sağlayıcı dosyası eklenerek bağlanabilecek şekilde tasarlanmalı. Kendi web sitemiz (syncron.polimelo.com) şimdilik **reklamsız** çalışır.
- **Electron / Steam:** Olduğu gibi kalır; bu görevler Electron build'ini bozmamalıdır.
- **Topluluk levelleri:** Şikâyet/moderasyon sistemi gerektirdiği için ertelendi.
- **Poki, YouTube Playables, Telegram:** Adaptör katmanı hazır olduğunda ayrı görev olarak eklenecek.

## Her Görevin Teslim Şartları (Ortak)

1. `npm run build` ve `npm run lint` hatasız geçer. Worker'a dokunulduysa `syncron-worker` testleri de geçer.
2. Mevcut web, Android ve Electron akışları bozulmaz. Reklamsız oyun deneyimi, reklam sağlayıcısı yüklenemese bile tam çalışır.
3. İlgili `docs/*.md` dosyası güncellenir ya da yenisi eklenir. Yeni modülün bir `README.md`'si olur.
4. Yeni tüm kullanıcı metinleri `tr` ve `en` i18n dosyalarına eklenir.
5. Agent, işi bitirince `.plans/monetization/raporlar/<görev-no>-rapor.md` dosyasına kısa bir rapor yazar: ne yapıldı, plandan hangi noktalarda sapıldı ve neden, açık kalan konular, sonraki görevin bilmesi gerekenler.
