# 06 — Günlük Bulmaca

## Yapılacak İş

Her gün tüm oyunculara aynı bulmacayı sunan, sonucu paylaşılabilen bir "Günlük Bulmaca" özelliği kur. Özelliğin iki amacı var: oyuncunun her gün geri gelmesi ve paylaşılan sonuçlarla ücretsiz tanıtım.

### İçerik Akışı: Günlük bulmacaları ürün sahibi belirler

- **Admin panelinde bir "Günlük Bulmaca Takvimi" ekranı.** Admin iki yoldan bulmaca ekler:
  1. **Kendisi tasarlar.** Mevcut editörde bir level hazırlar ve bir tarihe atar.
  2. **Üreticiden seçer.** `solver/generator.ts` ile aday bulmacalar üretilir. Admin adayları önizler, isterse editörde düzenler, **onaylar** ve bir tarihe atar.
- **Onaysız bulmaca yayınlanmaz.** Takvimde boş gün kalırsa ne olacağı yapılandırılabilir olmalı: önceden onaylanmış bir yedek havuzdan seçmek ya da o gün bulmaca göstermemek. Admin, önümüzdeki günlerde boşluk varsa panelde uyarı görür.
- **Çözülebilirlik doğrulaması.** Her günlük bulmaca kaydedilirken çözücüyle doğrulanır ve hedef hamle sayısı (par) hesaplanır.
- **Yetki.** Takvim yönetimi mevcut `AdminGuard` ve rol sistemiyle korunur.

### Oyuncu Tarafı

- **"Bugünün bulmacası".** Tek bir sabit tarih referansına (ör. UTC) göre belirlenir. Ana sayfada belirgin bir girişi olur.
- **Tek tamamlama.** Bulmaca günde bir kez "resmî" olarak tamamlanır; tekrar oynanabilir ama resmî sonuç ilk tamamlamadır. Çözüm, mevcut sunucu doğrulama akışından geçer.
- **Seri (streak).** Art arda gün sayısı tutulur ve gösterilir.
- **Günlük liderlik.** Az hamle ve süre sıralaması. Mevcut liderlik altyapısı yeniden kullanılabiliyorsa kullanılır.
- **Paylaşım.** Sonuç, spoiler vermeyen ve Wordle tarzı bir metin olarak kopyalanır ya da paylaşılır. Örnek:
  ```
  Syncron #142 ⭐⭐⭐ 14 hamle 🔥5
  ```
  Metne oyunun linki eklenir. Mobilde yerel paylaşım menüsü, web'de pano kullanılır. Paylaşılan link açıldığında sosyal önizleme (Open Graph) düzgün görünür. Portal build'lerinde dış link kısıtı yetenek nesnesine göre uygulanır.
- **Ödüllü aksiyonlar.** Günlük bulmacada ödüllü ipucu kullanılabilir. Level atlama **kullanılamaz**. İpucu kullanılan sonuç, paylaşım metninde ve liderlikte işaretlenir.
- **Geçmiş arşiv.** Geçmiş günlerin bulmacaları oynanabilir; bu, reklamlı ek içerik fırsatıdır. Arşivde seri ve günlük liderlik etkilenmez.

### Portal Build'leri

Günlük bulmaca sunucuya ihtiyaç duyar. Portal build'lerinde sunucu erişilebilir ve portal izin veriyorsa çalışır; aksi hâlde giriş noktası gizlenir. Bu karar yetenek nesnesi üzerinden verilir.

## Hedef

- Admin önümüzdeki haftaların günlük bulmacalarını panelden planlayabilir; kendi tasarımını ekleyebilir ya da üretilen adayları onaylayabilir.
- Tüm oyuncular aynı gün aynı bulmacayı görür. Sonuç sunucuda doğrulanır. Seri ve günlük liderlik doğru çalışır.
- Tek dokunuşla paylaşılabilen sonuç metni ve düzgün link önizlemesi vardır.
- `docs/` altına günlük bulmaca akışını ve admin kullanımını anlatan bir doküman eklenir.
