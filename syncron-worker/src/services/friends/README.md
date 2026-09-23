# `services/friends` — Arkadaşlık iş mantığı

`routes/friends.ts` eskiden 890 satırlık tek dosyaydı: SQL, Firestore yedeği, sınır
kuralları, satır dönüştürme ve HTTP aynı yerdeydi. Bu modül o mantığı taşır; route
dosyası yalnızca doğrulama + yanıt üretme işini yapar.

**Refactor kuralı: davranış birebir korunmuştur.** Uç nokta yolları, istek/yanıt
şekilleri, hata metinleri, HTTP durum kodları, hız limiti ve ban kontrolü aynıdır.

## Dosyalar

| Dosya | Ne |
|---|---|
| `lib/canonicalPair.ts` | **SAF.** `friendships` satırının anahtarı (`user_a < user_b`) ve uid parametresi kabul kuralı. |
| `lib/friendPolicy.ts` | **SAF KARAR.** Eşikler (100 arkadaş, 20 bekleyen giden istek) ve "bu istek neden reddedildi" kararları; mesaj + HTTP durumu burada. |
| `lib/friendRows.ts` | **SAF DÖNÜŞÜM.** D1 satırı → API nesnesi, rozet JSON'u çözme, sıralama ölçütleri. |
| `friendshipStore.ts` | **IO.** Tek D1 erişim katmanı; tüm sorgular `.bind()` ile parametreli. |
| `profileCacheSync.ts` | **IO.** `user_profiles` önbelleği ↔ Firestore köprüsü. Hata YUTMAZ, fırlatır. |
| `friendRequestActions.ts` | İstek gönder/kabul/ret + arkadaşlığı sonlandır (orkestrasyon). |
| `friendBlockActions.ts` | Engelle / engeli kaldır / engellenenleri listele. |
| `friendQueries.ts` | Arkadaş listesi ve bekleyen istekler (+ eksik profilleri tamamlama). |
| `userSearch.ts` | Tag ile oyuncu arama (D1 → Firestore yedeği). |
| `types.ts` | Servis ↔ route ortak sonuç tipi (`ActionOutcome`, `QueryOutcome`). |
| `index.ts` | Tek public API. Modül dışından `lib/*` import **edilmez**. |

## Kararlar

* **Neden servis HTTP durum kodu taşıyor?** Aynı hata metni ve kodu birden çok uç
  noktada geçiyor (ör. `Database error` → 500). Kararı route'a bırakmak, mesaj
  tablosunun ikinci bir kopyasını doğururdu. Servis HTTP *bilmez*, yalnızca
  "hangi yanıt" bilgisini veri olarak taşır.
* **Neden Firestore yedeği hata yutmuyor?** Her uç noktanın kendi log metni vardı
  (`Friends list cache sync failed`, `Firestore search fallback failed`, …) ve bu
  metinler operasyonda hangi akışın koptuğunu söylüyor. Yutma kararı çağırandadır.
* **Profil tamamlama neden 10 ile sınırlı?** Cloudflare'ın alt istek (subrequest)
  sınırı. Sabit `friendQueries.ts` içindedir.

## Testler

* `test/friendsPolicy.spec.ts` — `lib/` altındaki saf fonksiyonlar (birim).
* `test/friendsApi.spec.ts` — uç nokta davranışı (entegrasyon, refactor öncesinden beri değişmedi).
