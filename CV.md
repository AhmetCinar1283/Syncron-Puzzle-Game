# 6/24/2026

## 🚀 Proje Özeti (Syncron)
**Syncron**, zihin ve refleks gerektiren, iki nesneyi aynı anda hareket ettirerek hedef noktalara ulaştırma mekanizmasına dayalı grid tabanlı bir bulmaca oyunudur. Web, mobil ve masaüstü platformlarda çalışabilen çapraz platform (cross-platform) yapısına, topluluk seviye editörüne ve küresel liderlik tablolarına sahiptir.

---

## 🛠️ Öğrenilen Teknolojiler (Tech Stack)
* **Frontend**: Next.js (React), TypeScript, Tailwind/Vanilla CSS, State Management (Oyun Döngüsü)
* **Cross-Platform**: Capacitor (Mobil - Android/iOS), Electron (Masaüstü - Windows/macOS/Linux)
* **Backend & Edge Computing**: Cloudflare Workers, Hono Web Framework
* **Veritabanı & Depolama**: Cloudflare D1 (Serverless SQL), Cloudflare R2 (Object Storage), Firebase Firestore & Functions
* **Kimlik Doğrulama & Ödeme**: Firebase Auth, Lemon Squeezy (Webhook Entegrasyonu)

---

## ⚡ Polyvo-Worker (Syncron-Worker) & Edge Başarıları
CV'de backend/edge kısmına eklenebilecek en güçlü ve parlatıcı teknik detaylar:

1. **Edge Runtime JWT Doğrulaması**:
   * Firebase Auth token (JWT) doğrulamalarını harici bir API isteği atmadan, Cloudflare Workers üzerinde **RS256 / Web Crypto API** kullanarak doğrudan uçta (at the edge) yerel olarak doğrulama. (Gecikme süresi mikro saniyelere indirildi).

2. **Server-Side Replay Doğrulama (Anti-Cheat)**:
   * Frontend (Next.js) ve Backend (Worker) arasında paylaşılan monorepo yapısı sayesinde, oyun motoru fiziğini ve hamle doğrulama algoritmalarını sunucuda simüle ederek hileli seviye bitirmeleri engelleyen doğrulama motoru (`gameVerify.ts`).

3. **Zamanlanmış Görevler (Cron) & Otomatik Arşivleme**:
   * **Log Retention**: Cloudflare D1 veritabanında 90 günden eski denetim loglarını NDJSON formatında Cloudflare R2 soğuk depolama alanına arşivleyen ve ardından D1'den silen otomatik cron görevi. (Batching mimarisi sayesinde timeout riskleri engellendi).
   * **Badge Distribution**: Liderlik tablosundaki ilk 3 oyuncuya idempotent şekilde otomatik başarı rozeti dağıtan haftalık/aylık cron görevleri.

4. **Yüksek Performanslı Veritabanı Yönetimi**:
   * Cloudflare D1 üzerinde `db.batch()` kullanarak tek transaction ile atomik günlük/haftalık/aylık skor güncellemeleri, dünya rekoru transferleri ve içerik üretici kazanç takipleri.

---

## 📝 CV İçin Parlatıcı Cümleler (Bullet Points)
* **Monorepo & Shared Engine**: *"Next.js frontend ve Cloudflare Workers backend arasında ortak oyun motoru mantığını paylaştırarak, oyuncu hamlelerini sunucu tarafında simüle eden ve hileli çözümleri %100 engelleyen bir replay doğrulama motoru geliştirdim."*
* **Edge Performance**: *"Firebase JWT kimlik doğrulama sürecini Cloudflare Workers üzerinde RS256 algoritmalarıyla yerel olarak optimize ederek, ağ gecikmesini (network latency) minimize ettim ve veritabanı sorgu yükünü azalttım."*
* **Cost & Database Optimization**: *"Cloudflare D1 üzerindeki geçmiş logları NDJSON formatında Cloudflare R2'ye taşıyan ve veritabanını temizleyen zamanlanmış arka plan görevleri (cron) tasarlayarak SQL veritabanı depolama maliyetlerini optimize ettim."*
* **Cross-Platform Deployment**: *"Tek bir Next.js kod tabanını Capacitor ile Android mobil uygulamasına, Electron ile de yerel masaüstü (Windows/macOS/Linux) uygulamalarına derleyen çoklu dağıtım hattı kurdum."*
