# 02 — CrazyGames & GameDistribution Build'leri

## Yapılacak İş

Oyunu, CrazyGames ve GameDistribution portallarına yüklenebilecek ayrı statik build'ler hâlinde paketle.

- **İki sağlayıcı dosyası.** Adaptör katmanına CrazyGames SDK ve GameDistribution SDK sağlayıcılarını ekle. Her birinin yetenek tanımını portal kurallarına göre yap. Portalların **güncel geliştirici gereksinimlerini** oku; teknik kontrol listesi, yasaklar ve dosya boyutu sınırları dahil.
- **Build komutları.** Örneğin `build:crazygames` ve `build:gd`. Her biri `out/` benzeri ayrı bir klasöre çıktı verir ve portala yüklenecek zip dosyasını üretir.
- **Portal build'lerinde yetenek nesnesine göre kapananlar:**
  - AdSense ve her türlü üçüncü parti reklam
  - bağış sayfası, "Reklamları Kaldır" ve tüm dış linkler (portfolyo, sosyal medya vb.)
  - zorunlu giriş. Oyun misafir olarak tam oynanabilir. Giriş isteğe bağlı kalabilir, ancak portalın izin verdiği ölçüde; CrazyGames'in kendi kullanıcı sistemi varsa değerlendir.
  - admin, editör gibi portal oyuncusunu ilgilendirmeyen rotalar
- **Levellerin build'e gömülmesi.** Kampanya levelleri build zamanında JSON olarak paketlenir. Oyun Firestore'a erişemese bile tüm kampanyayı oynatabilmelidir. Kalıcılık yerel (IndexedDB/localStorage) olur. Sunucu bağlantısı varsa ve portal izin veriyorsa ek özellikler (skor senkronu, liderlik tablosu) çalışabilir; yoksa sessizce devre dışı kalır.
- **Göreli yollar.** Portallar oyunu bir iframe içinde ve alt dizinden sunar. Tüm asset ve route yolları buna uygun çalışmalıdır (`basePath`/`assetPrefix` ve Next statik export davranışı dikkate alınarak).
- **Yükleme ve oynanış olayları.** Adaptör üzerinden SDK'ya doğru anlarda bildirilir: yükleme ilerlemesi, oynanış başladı/durdu, mutlu an.
- **Portal paketi.** Kapak görselleri, açıklama metni ve kontroller metni gibi portal başvurusu için gereken meta materyallerin listesi ve taslağı `docs/` altına eklenir.

## Hedef

- Tek komutla, doğrudan portala yüklenmeye hazır iki zip üretilir.
- Oyun her iki portalın yerel test ortamında hatasız açılır, reklamlar SDK'nın test modunda gösterilir ve portalın teknik kontrol listesinden geçer.
- Web, Android ve Electron build'leri bu değişiklikten etkilenmez.
- `docs/platforms.md` yeni build'leri ve portal yükleme adımlarını içerir.
