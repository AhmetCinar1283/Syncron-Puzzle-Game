# `scripts/recovery` — Soğuk Dışa Aktarımdan Geri Yükleme

Haftalık dışa aktarımın (`exports/YYYY-MM-DD/<tablo>.ndjson`, bkz.
`syncron-worker/src/scheduled/dataExport.ts`) karşılığı olan **elle çalıştırılan**
geri yükleme aracı.

Bu araç bilinçli olarak bir worker uç noktası DEĞİLDİR: otomatik tetiklenebilen bir
geri yükleme, bir kazanın ikinci kazaya dönüşme yoludur.

Tam karar tablosu ve senaryolar: `docs/release/veri-kurtarma.md`.

## Kullanım

```bash
# 1) R2'den ilgili dışa aktarımı indir
cd syncron-worker
npx wrangler r2 object get syncron-audit-archive/exports/2026-09-19/played_levels.ndjson \
  --file ../tmp/played_levels.ndjson

# 2) KURU ÇALIŞMA (varsayılan) — sadece SQL üretir, hiçbir şey yazmaz
cd ..
node scripts/recovery/restore-export.mjs --file tmp/played_levels.ndjson --table played_levels

# 3) Üretilen restore-played_levels.sql dosyasını GÖZLE OKU

# 4) Uygula
node scripts/recovery/restore-export.mjs --file tmp/played_levels.ndjson --table played_levels --apply

# 5) Türetilmiş tabloları onar
#    POST /admin/recovery/recompute  { "scope": "user", "uid": "...", "dryRun": false, "confirm": <n> }
```

Çok parçalı dışa aktarım (`<tablo>.part-0000.ndjson`, ...) için `--dir` kullanılır:

```bash
node scripts/recovery/restore-export.mjs --dir tmp/2026-09-19 --table audit_logs
```

## Bayraklar

| Bayrak | Anlam |
|---|---|
| *(yok)* | **Kuru çalışma.** Varsayılan budur. |
| `--apply` | Üretilen SQL'i `wrangler d1 execute` ile çalıştırır. |
| `--local` | Uzak D1 yerine yerel D1'e yazar (tatbikat için). |
| `--file` / `--dir` | Tek dosya ya da parçaların bulunduğu klasör. |
| `--table` | Hedef tablo (allowlist dışındaki reddedilir). |
| `--out` | Üretilecek SQL dosyasının yolu. |

## Neden yalnızca `INSERT OR IGNORE`?

Araç **yalnızca eksik satırı geri getirir**; var olan bir satırın üstüne asla yazmaz.

Alternatif `INSERT OR REPLACE` idi ve reddedildi: eski bir yedekten geri yükleme,
o yedekten sonra oynayan herkesin ilerlemesini sessizce geri sarardı. Tek bir
sorunu binlerce sorun üreterek çözmüş olurduk.

Bunun sonucu: bozulmuş (yanlış değerli) bir satır bu araçla DÜZELMEZ — önce o satır
elle silinmeli ya da düzeltilmelidir. Bu bilinçli bir sürtünmedir.

## Tatbikat

`--local` ile en az bir kez denenmelidir. Denenmemiş kurtarma yolu, kurtarma yolu değildir.
