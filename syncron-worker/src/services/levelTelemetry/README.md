# services/levelTelemetry — telemetri yazımının görünürlüğü

## Neden var

`level_telemetry` tablosu üretimde **tamamen boştu**. Yol şöyleydi:

```
istemci sendTelemetry() ──► POST /game/telemetry ──► insertTelemetry() ──► D1
        catch → console.warn          catch → console.error
```

Her iki uçta da hata **yalnızca konsola** yazılıyordu. Worker konsolu kalıcı
değildir; kimse bakmadığı sürece yazma yolu aylarca kopuk kalabilir ve
kimse fark etmez. "Ölçemediğimiz sistemi ayarlayamayız" hatası tam olarak budur.

Bu klasör o sessizliği kapatır.

## Sözleşme

- `lib/writeOutcome.ts` — **saf**. D1 hata metnini `schema_missing` / `duplicate` /
  `unknown` olarak sınıflar ve alarm üretilip üretilmeyeceğine karar verir.
- `recordTelemetry.ts` — yazar, sonucu **doğrular** (`changes === 1`), başarısızlığı
  `audit_logs`'a `telemetry.write_failed` olarak yazar.

## Kurallar

1. **"Hata fırlatmadı" yeterli değildir.** Satır sayısı doğrulanır.
2. **`duplicate` başarısızlık sayılmaz.** Oturum kimliği istemcide üretilir; aynı
   oturumun yeniden gönderilmesi idempotenttir, HTTP 200 döner, alarm üretmez.
3. **Alarm telemetri tablosuna yazılmaz.** Asıl senaryoda (tablo/kolon yok) o
   tablo zaten yazılamaz durumdadır; bu yüzden iz `audit_logs`'a gider.
4. **Oyuncu davranışı değişmez.** Yazma başarısızlığı yalnızca sunucu tarafında
   görünür olur; oyun akışı, skor ve ekranlar etkilenmez.

## Kopukluğu nasıl sorgularsın

```sql
SELECT created_at, uid, metadata
FROM audit_logs
WHERE action = 'telemetry.write_failed'
ORDER BY created_at DESC
LIMIT 50;
```

Boş dönüyorsa yol sağlamdır. Dolu dönüyorsa `metadata.failure` nedeni söyler
(`schema_missing` → migration uygulanmamış).
