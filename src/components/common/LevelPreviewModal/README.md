# LevelPreviewModal Modülü (`src/components/common/LevelPreviewModal`)

Bu modül, bir seviyenin (kampanya veya özel seviye) detaylarını, harita önizlemesini ve başarı kayıtlarını gösteren, aynı zamanda klavye ve gamepad ile tam erişilebilir olan önizleme modalını barındırır.

`.plans/monetization/00-mimari-ilkeler.md` dosyasındaki kurallara göre tek sorumluluk prensibiyle parçalanmış ve katmanlara ayrılmıştır.

## Klasör Yapısı

```
LevelPreviewModal/
├── index.ts                      # Modülün public API'si
├── LevelPreviewModal.tsx          # Ana orkestrasyon bileşeni (<Modal> veya <PlayTestOverlay>)
├── types.ts                      # Arayüz ve veri tipi tanımları
├── README.md                     # Modül dokümantasyonu
├── hooks/
│   ├── useLevelPreviewData.ts    # Dexie ve Firestore'dan asenkron veri çekme ve senkronizasyon
│   └── useLevelPreviewNav.ts     # Gamepad & klavye gezintisi, capture-phase olay yalıtımı
├── components/
│   ├── LevelPreviewHeader.tsx    # Başlık, rozetler, ikon ve alt bilgi sunumu
│   ├── LevelPreviewBoard.tsx     # CRT tarama efektli mini tahta önizlemesi
│   ├── LevelPreviewStats.tsx     # Hedefler, oyuncular, kutular, çarpışma kartları
│   ├── LevelPreviewRecord.tsx    # Skor, süre, hamle ve yıldız başarı kartı
│   ├── LevelPreviewNotes.tsx     # Seviye ve yapımcı notları kartı
│   └── LevelPreviewActions.tsx   # Klavye/Gamepad odaklanabilir aksiyon butonları
└── lib/
    ├── normalizeLevelData.ts     # Ham veri ve string formatlarını LevelData'ya dönüştüren saf fonksiyon
    ├── normalizeLevelData.test.ts# Normalizasyon testleri
    ├── formatDuration.ts         # Saniyeyi m:ss formatına dönüştüren saf yardımcı
    └── formatDuration.test.ts    # formatDuration testleri
```

## Kullanım Örneği

```tsx
import LevelPreviewModal from '@/components/common/LevelPreviewModal';

<LevelPreviewModal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  levelId={selectedLevelId}
  mode="play"
  onPlay={(levelData) => navigateToPlay(levelData)}
/>
```
