# 00 — Mimari İlkeler (Tüm Görevler İçin Bağlayıcı)

Proje yakın zamanda feature bazlı, katmanlı bir yapıya refactor edildi (bkz. `src/README.md`). Para kazanma işleri bu düzeni **bozmamalı, güçlendirmelidir**.

## 1. Katmanlar ve Bağımlılık Yönü

```
app/ (route'lar — sadece kompozisyon)
  └─> features/<isim>/ (sayfa/özellik mantığı ve sunumu)
        └─> services/ (dış dünya: api, firebase, db, monetization, payments)
        └─> game-engine/ (saf oyun mantığı)
              └─> level-format/ (kalıcı veri tipleri)
```

- Bağımlılık **yalnızca aşağı doğru** akar. `game-engine` reklamdan, platformdan ve ödemeden hiçbir şey bilmez. Örneğin ipucunun hesaplanması `game-engine`'de, "reklam izleyince ipucu ver" kararı ise `features` katmanında yer alır.
- `services/monetization` hiçbir `features` modülünü import etmez.
- Bir feature, başka bir feature'ın iç dosyasını import etmez. Yalnızca `index.ts` üzerinden dışa açılan public API'yi kullanır.

## 2. Tek Sorumluluk

- Her dosya **tek bir işi** yapar. Bir dosyanın ne yaptığını tek cümleyle anlatamıyorsan dosya bölünmelidir.
- Her dosyanın başında, projedeki mevcut kurala uygun bir **`DOSYA AMACI`** açıklaması bulunur.
- Kabaca 250 satırı geçen dosya, bölünmesi gerektiğinin işaretidir. God-file oluşturulmaz.
- Sunum (component), durum/efekt (hook) ve saf yardımcı (lib) ayrı dosyalarda durur. Bu, mevcut `features/<isim>/{components,hooks,lib}` düzeniyle aynıdır.

## 3. Platform Farkları Tek Yerde Çözülür

- Kodun içine `if (platform === 'crazygames')` gibi dallanmalar **dağıtılmaz**.
- Platform seçimi tek bir **kompozisyon kökünde** yapılır (build-time env değişkeni ile). Uygulamanın geri kalanı yalnızca bir arayüz ve bir **yetenek (capability) nesnesi** görür. Örneğin: "ödüllü reklam destekleniyor mu?", "dış link açılabilir mi?", "satın alma gösterilebilir mi?", "giriş yapma zorunlu tutulabilir mi?".
- Kullanılmayan platform SDK'ları o platformun bundle'ına **girmez** (dinamik import veya build-time eleme ile).

## 4. Hata Toleransı

- Reklam SDK'sı yüklenemez, reklam engelleyici devreye girer ya da reklam doldurulamaz (no-fill) olursa oyun **asla kilitlenmez**. Her reklam çağrısı zaman aşımına sahiptir ve sonucu `Promise` ile döner.
- Ödüllü reklam başarısız olursa kullanıcıya nazik bir mesaj gösterilir. Ödül verilmez ama oyun akışı da bozulmaz.

## 5. Sunucu (Worker) Tarafı

- `syncron-worker` içinde route dosyaları ince tutulur. İş mantığı `services/` altında, şema değişiklikleri numaralı `migrations/` dosyalarında yer alır.
- Skor, yıldız ve liderlik tablosu bütünlüğü **sunucuda** korunur (bkz. `docs/scoring.md`). İstemcinin beyan ettiği hiçbir şey skoru artıramaz.
- Yeni uç noktalar mevcut kimlik doğrulama middleware'ini kullanır. Webhook'lar imza doğrulaması yapar.

## 6. Genel

- Tüm kullanıcı metinleri i18n üzerinden gelir (`tr` ve `en`).
- Tipler açık olmalı. `any` kullanımı gerekçesiz yapılmaz.
- Yeni bir modül eklendiğinde kendi `README.md`'si yazılır ve `src/README.md` klasör haritası güncellenir.
- Mevcut kodda bir sorun görülür ama görevin kapsamı dışındaysa düzeltilmez, rapora not edilir.
