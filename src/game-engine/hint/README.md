# game-engine/hint

İpucunun **istemci tarafı: yalnızca gösterim**. İpucu burada hesaplanmaz;
çözücüye erişmez. Hesaplama Cloudflare Worker'dadır
(`syncron-worker/src/services/hint/`) ve ipucunun içeriği istemciye ancak
sunucu erişim hakkını doğruladıktan sonra gelir (bkz.
`features/rewarded-actions/README.md`).

## Sunucudan gelen ipucu (`ServerHint`)

| Alan | Anlamı |
|---|---|
| `stepsRemaining` | Çözüme kalan en az adım (oda değiştirme de bir adım) |
| `moves` | Sonraki en fazla 5 adım (`u/d/l/r` = basılacak yön tuşu, `s` = oda değiştir) |
| `undoSteps` | Mevcut durum çözümsüzse: önce kaç kez geri alınmalı |
| `restart` | Geri almak yetmiyorsa: önce baştan başlanmalı |

## Dosyalar

| Dosya | Sorumluluk |
|---|---|
| `types.ts` | `ServerHint`, ekrandaki `ActiveHint` |
| `hintProgress.ts` | Oyuncu ipucunu takip ettikçe ilerletme (saf, testli); sapma → ipucu kapanır |
| `hintTargets.ts` | Sıradaki adımda hangi oyuncunun fiilen hangi yöne gideceği (board işareti için) |

Not: editör test modundaki "Adım İleri" hâlâ istemcideki çözücüyü kullanır
(yalnızca level tasarımcısına açık araç); `/play`'de çözücü çağrısı yoktur.
